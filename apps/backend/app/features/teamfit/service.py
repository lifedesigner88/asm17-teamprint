from __future__ import annotations

import hashlib
import math
import os
import re
from collections.abc import Iterable
from functools import lru_cache

import anthropic
from fastapi import HTTPException, status
from openai import OpenAI
from sqlalchemy import Select, func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.features.auth.models import User

from .models import TeamfitExplorerProfile, TeamfitExplorerTurn, TeamfitProfile
from .schemas import (
    TeamfitExplorerMeResponse,
    TeamfitExplorerProfileResponse,
    TeamfitExplorerProfileSaveRequest,
    TeamfitFollowupAnswerRequest,
    TeamfitInterviewQuestionRequest,
    TeamfitInterviewQuestionResponse,
    TeamfitInterviewTurnInput,
    TeamfitInterviewTurnResponse,
    TeamfitMeResponse,
    TeamfitProfileResponse,
    TeamfitProfileUpsertRequest,
    TeamfitRecommendationsResponse,
)

VECTOR_DIMENSIONS = 1536
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
MAX_RECOMMENDATIONS_PER_BUCKET = 4
TOP_K_CANDIDATES = 50
PGVECTOR_EMBEDDING_READY_KEY = "teamfit_pgvector_embedding_ready"
MBTI_AXIS_IDS = ("mind", "energy", "nature", "tactics", "identity")
MBTI_AXIS_LETTERS = {
    "mind": ("I", "E"),
    "energy": ("N", "S"),
    "nature": ("F", "T"),
    "tactics": ("J", "P"),
    "identity": ("T", "A"),
}
DEFAULT_MBTI_LEFT_PERCENT = 74
DEFAULT_MBTI_RIGHT_PERCENT = 26
TEAMFIT_INTERVIEW_MODEL = os.getenv("ANTHROPIC_TEAMFIT_MODEL", "claude-haiku-4-5-20251001")
INITIAL_INTERVIEW_QUESTION_LIMIT = 3


@lru_cache(maxsize=1)
def _openai_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


@lru_cache(maxsize=1)
def _anthropic_client() -> anthropic.Anthropic | None:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return anthropic.Anthropic(api_key=api_key)


def is_postgres_session(db: Session) -> bool:
    bind = db.get_bind()
    return bind is not None and bind.dialect.name == "postgresql"


def has_pgvector_embedding_column(db: Session) -> bool:
    cached = db.info.get(PGVECTOR_EMBEDDING_READY_KEY)
    if cached is not None:
        return bool(cached)

    if not is_postgres_session(db):
        db.info[PGVECTOR_EMBEDDING_READY_KEY] = False
        return False

    ready = bool(
        db.scalar(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'teamfit_profiles'
                      AND column_name = 'embedding'
                      AND table_schema = ANY(current_schemas(false))
                )
                """
            )
        )
    )
    db.info[PGVECTOR_EMBEDDING_READY_KEY] = ready
    return ready


def ensure_teamfit_pgvector_schema(db: Session) -> None:
    if not is_postgres_session(db):
        return
    if has_pgvector_embedding_column(db):
        return

    try:
        # Avoid hanging the whole app if another session still has a read lock open.
        db.execute(text("SET LOCAL lock_timeout = '1000ms'"))
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db.execute(
            text(
                f"""
                ALTER TABLE teamfit_profiles
                ADD COLUMN IF NOT EXISTS embedding vector({VECTOR_DIMENSIONS})
                """
            )
        )
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS teamfit_profiles_embedding_hnsw
                ON teamfit_profiles
                USING hnsw (embedding vector_cosine_ops)
                """
            )
        )
        db.commit()
        db.info[PGVECTOR_EMBEDDING_READY_KEY] = True
    except SQLAlchemyError:
        db.rollback()
        db.info[PGVECTOR_EMBEDDING_READY_KEY] = False


def _normalize_text(value: str, label: str, *, max_length: int = 160) -> str:
    normalized = " ".join(value.split()).strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 비어 있을 수 없습니다.",
        )
    return normalized[:max_length]


def _normalize_optional_text(value: str | None, *, max_length: int = 220) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.split()).strip()
    if not normalized:
        return None
    return normalized[:max_length]


def _normalize_markdown_text(value: str, label: str, *, max_length: int = 800) -> str:
    normalized = value.replace("\r\n", "\n").strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 비어 있을 수 없습니다.",
        )
    if len(normalized) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 최대 {max_length}자까지 입력할 수 있습니다.",
        )
    return normalized


def _normalize_string_list(
    values: Iterable[str],
    label: str,
    *,
    min_items: int = 1,
    max_items: int = 8,
    max_item_length: int = 48,
) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in values:
        item = " ".join(str(raw).split()).strip()
        if not item:
            continue
        item = item[:max_item_length]
        lowered = item.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(item)
    if len(normalized) < min_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 최소 {min_items}개 이상 입력해야 합니다.",
        )
    if len(normalized) > max_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 최대 {max_items}개까지 입력할 수 있습니다.",
        )
    return normalized


def _normalize_mbti(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper()
    if not normalized:
        return None
    if re.fullmatch(r"[IE][NS][FT][JP](?:-[AT])?", normalized) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI는 INFJ 또는 INFJ-T 형식이어야 합니다.",
        )
    return normalized


def _default_mbti_axis_values_from_mbti(value: str | None) -> dict[str, int] | None:
    normalized = _normalize_mbti(value)
    if normalized is None:
        return None

    compact = normalized.replace("-", "")
    axis_values: dict[str, int] = {}

    for index, axis_id in enumerate(MBTI_AXIS_IDS):
        letter = compact[index] if index < len(compact) else ""
        left_letter, right_letter = MBTI_AXIS_LETTERS[axis_id]
        if letter == left_letter:
            axis_values[axis_id] = DEFAULT_MBTI_LEFT_PERCENT
        elif letter == right_letter:
            axis_values[axis_id] = DEFAULT_MBTI_RIGHT_PERCENT
        else:
            axis_values[axis_id] = 50

    return axis_values


def _format_mbti_from_axis_values(values: dict[str, int]) -> str:
    letters: list[str] = []

    for axis_id in MBTI_AXIS_IDS:
        left_letter, right_letter = MBTI_AXIS_LETTERS[axis_id]
        axis_value = values.get(axis_id, 50)
        if axis_value > 50:
            letters.append(left_letter)
        elif axis_value < 50:
            letters.append(right_letter)
        else:
            return ""

    return f"{''.join(letters[:4])}-{letters[4]}"


def _normalize_mbti_axis_values(
    values: dict[str, int] | None,
    normalized_mbti: str | None,
) -> dict[str, int] | None:
    if values is None:
        return _default_mbti_axis_values_from_mbti(normalized_mbti)

    normalized: dict[str, int] = {}
    for axis_id in MBTI_AXIS_IDS:
        raw_value = values.get(axis_id)
        if raw_value is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI를 저장하려면 5개 축 값을 모두 보내야 합니다.",
            )
        try:
            axis_value = int(raw_value)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI 축 비중은 0부터 100 사이 숫자여야 합니다.",
            ) from exc
        if axis_value < 0 or axis_value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI 축 비중은 0부터 100 사이 숫자여야 합니다.",
            )
        normalized[axis_id] = axis_value

    selected_axes_count = sum(1 for axis_value in normalized.values() if axis_value != 50)
    if selected_axes_count == 0:
        return None
    if selected_axes_count != len(MBTI_AXIS_IDS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI를 입력하려면 5개 축을 모두 선택해야 합니다.",
        )

    expected_mbti = _format_mbti_from_axis_values(normalized)
    if not expected_mbti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI를 입력하려면 5개 축을 모두 선택해야 합니다.",
        )
    if normalized_mbti and normalized_mbti != expected_mbti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI 문자열과 MBTI 축 비중이 일치하지 않습니다.",
        )
    return normalized


def _normalize_impact_tags(values: Iterable[str]) -> list[str]:
    normalized = _normalize_string_list(values, "임팩트 태그", min_items=0, max_items=4)
    if normalized and len(normalized) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지속가능개발목표는 선택한다면 4개를 모두 골라야 합니다.",
        )
    return normalized


def _normalize_sdg_tags(values: Iterable[str]) -> list[str]:
    normalized = _normalize_string_list(
        values,
        "지속가능개발목표",
        min_items=4,
        max_items=4,
        max_item_length=64,
    )
    if len(normalized) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지속가능개발목표는 4개를 모두 선택해야 합니다.",
        )
    return normalized


def _normalize_interview_turns(
    turns: list[TeamfitInterviewTurnInput],
    *,
    expected_count: int | None = None,
) -> list[TeamfitInterviewTurnInput]:
    normalized_turns: list[TeamfitInterviewTurnInput] = []
    for turn in turns:
        normalized_turns.append(
            TeamfitInterviewTurnInput(
                question=_normalize_text(turn.question, "질문", max_length=500),
                answer=_normalize_markdown_text(turn.answer, "답변", max_length=2000),
            )
        )

    if expected_count is not None and len(normalized_turns) != expected_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"초기 인터뷰 답변은 정확히 {expected_count}개여야 합니다.",
        )

    return normalized_turns


def _build_embedding_input(payload: TeamfitProfileUpsertRequest) -> str:
    def humanize(values: Iterable[str]) -> list[str]:
        return [value.replace("_", " ") for value in values]

    sections = [
        ("Interests", humanize(payload.interests)),
        ("Problems", humanize(payload.problem_focus)),
        ("Domains", humanize(payload.domains)),
        ("Working style", humanize([payload.working_style])),
        ("Commitment pace", humanize([payload.commitment_pace])),
        ("Impact tags", humanize(payload.impact_tags)),
    ]
    if payload.one_liner:
        sections.append(("Intro", [payload.one_liner]))
    return "\n".join(f"{label}: {', '.join(values)}" for label, values in sections if values)


def _deterministic_embedding(text_value: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSIONS
    tokens = re.findall(r"[0-9A-Za-z가-힣][0-9A-Za-z가-힣_+-]*", text_value.lower())
    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for offset in range(0, 24, 3):
            index = int.from_bytes(digest[offset : offset + 2], "big") % VECTOR_DIMENSIONS
            sign = 1.0 if digest[offset + 2] % 2 == 0 else -1.0
            weight = 1.0 + (digest[offset + 2] / 255.0) * 0.25
            vector[index] += sign * weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def embed_text(
    text_value: str,
    *,
    allow_fallback_on_error: bool = False,
    prefer_remote: bool = True,
) -> list[float]:
    if not prefer_remote:
        return _deterministic_embedding(text_value)

    client = _openai_client()
    if client is None:
        return _deterministic_embedding(text_value)

    try:
        response = client.embeddings.create(
            model=OPENAI_EMBEDDING_MODEL,
            input=text_value,
            dimensions=VECTOR_DIMENSIONS,
        )
    except Exception as exc:  # noqa: BLE001
        if allow_fallback_on_error:
            return _deterministic_embedding(text_value)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="임베딩 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc

    return [float(value) for value in response.data[0].embedding]


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def sync_pgvector_embedding(db: Session, user_id: int, values: list[float]) -> None:
    if not is_postgres_session(db) or not has_pgvector_embedding_column(db):
        return
    db.execute(
        text(
            """
            UPDATE teamfit_profiles
            SET embedding = CAST(:embedding AS vector)
            WHERE user_id = :user_id
            """
        ),
        {"embedding": _vector_literal(values), "user_id": user_id},
    )


def _normalize_required_mbti(
    mbti: str | None,
    mbti_axis_values: dict[str, int] | None,
) -> tuple[str, dict[str, int]]:
    normalized_mbti = _normalize_mbti(mbti)
    normalized_axis_values = _normalize_mbti_axis_values(mbti_axis_values, normalized_mbti)
    if normalized_axis_values is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI 5개 축을 모두 선택해야 합니다.",
        )

    resolved_mbti = normalized_mbti or _format_mbti_from_axis_values(normalized_axis_values)
    if not resolved_mbti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI 문자열을 만들 수 없습니다.",
        )

    return resolved_mbti, normalized_axis_values


def _normalize_explorer_payload(
    problem_statement: str,
    mbti: str | None,
    mbti_axis_values: dict[str, int] | None,
    sdg_tags: Iterable[str],
    narrative_markdown: str,
) -> tuple[str, str, dict[str, int], list[str], str]:
    resolved_mbti, normalized_axis_values = _normalize_required_mbti(mbti, mbti_axis_values)
    return (
        _normalize_text(problem_statement, "풀고 싶은 문제", max_length=80),
        resolved_mbti,
        normalized_axis_values,
        _normalize_sdg_tags(sdg_tags),
        _normalize_markdown_text(narrative_markdown, "2단계 본문", max_length=800),
    )


def _teamfit_interview_prompt(
    *,
    problem_statement: str,
    mbti: str,
    sdg_tags: list[str],
    narrative_markdown: str,
    history: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
    phase: str,
) -> str:
    history_lines: list[str] = []
    for index, turn in enumerate(history, start=1):
        history_lines.append(f"Q{index}: {turn.question}")
        history_lines.append(f"A{index}: {turn.answer}")

    phase_label = "initial 3-question interview" if phase == "initial" else "follow-up extension"
    history_block = "\n".join(history_lines) if history_lines else "No prior interview turns yet."

    return f"""
You are an interviewer helping a user build a team-fit exploration profile.

Your job:
- Ask exactly one next question in Korean.
- The question should help clarify collaboration fit, motivation, decision criteria, or what kind of teammate would make this problem easier to solve.
- Avoid repeating prior questions.
- Keep it warm, specific, and concise.
- Output only the question itself. No bullets, no numbering, no preface.

Current phase: {phase_label}
Problem statement: {problem_statement}
MBTI: {mbti}
SDGs: {", ".join(sdg_tags)}
Narrative:
{narrative_markdown}

Prior interview:
{history_block}
""".strip()


def _fallback_teamfit_question(
    *,
    problem_statement: str,
    history: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
    phase: str,
) -> str:
    asked_questions = {turn.question.casefold().strip() for turn in history if turn.question}
    initial_candidates = [
        "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
        "함께할 팀원을 고를 때 꼭 맞아야 하는 협업 장면이나 역할 조합은 무엇인가요?",
        "6개월 뒤 이 문제를 잘 풀었다고 느끼게 해줄 가장 구체적인 결과는 무엇인가요?",
    ]
    followup_candidates = [
        "이 문제를 같이 풀 사람에게 꼭 기대하는 태도나 습관이 있다면 무엇인가요?",
        "대화를 먼저 시작할 사람을 고를 때, 가장 빨리 확인하고 싶은 신호는 무엇인가요?",
        f"`{problem_statement}`를 붙잡고 갈 때 내가 특히 보완받고 싶은 지점은 무엇인가요?",
    ]

    candidates = initial_candidates if phase == "initial" else followup_candidates
    for question in candidates:
        if question.casefold() not in asked_questions:
            return question

    return "이 문제를 함께 풀 사람과 실제로 대화해보면 가장 먼저 확인하고 싶은 기준은 무엇인가요?"


def _generate_teamfit_question(
    *,
    problem_statement: str,
    mbti: str,
    sdg_tags: list[str],
    narrative_markdown: str,
    history: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
    phase: str,
) -> str:
    client = _anthropic_client()
    if client is None:
        return _fallback_teamfit_question(
            problem_statement=problem_statement,
            history=history,
            phase=phase,
        )

    try:
        response = client.messages.create(
            model=TEAMFIT_INTERVIEW_MODEL,
            max_tokens=120,
            system="Ask exactly one Korean question for a team-fit interview. Output only the question.",
            messages=[
                {
                    "role": "user",
                    "content": _teamfit_interview_prompt(
                        problem_statement=problem_statement,
                        mbti=mbti,
                        sdg_tags=sdg_tags,
                        narrative_markdown=narrative_markdown,
                        history=history,
                        phase=phase,
                    ),
                }
            ],
        )
        question = response.content[0].text.strip()
    except Exception:  # noqa: BLE001
        question = _fallback_teamfit_question(
            problem_statement=problem_statement,
            history=history,
            phase=phase,
        )

    return _normalize_text(question, "추가 질문", max_length=500)


def _active_explorer_profile_count_query() -> Select[tuple[int]]:
    return select(func.count()).select_from(TeamfitExplorerProfile)


def _load_explorer_turns(db: Session, user_id: int) -> list[TeamfitExplorerTurn]:
    return list(
        db.scalars(
            select(TeamfitExplorerTurn)
            .where(TeamfitExplorerTurn.user_id == user_id)
            .order_by(TeamfitExplorerTurn.sequence_no.asc(), TeamfitExplorerTurn.id.asc())
        ).all()
    )


def _explorer_turn_to_response(turn: TeamfitExplorerTurn) -> TeamfitInterviewTurnResponse:
    return TeamfitInterviewTurnResponse(
        id=turn.id,
        sequence_no=turn.sequence_no,
        phase=turn.phase,
        question=turn.question,
        answer=turn.answer,
        created_at=turn.created_at,
    )


def _explorer_profile_to_response(
    profile: TeamfitExplorerProfile,
    turns: list[TeamfitExplorerTurn],
) -> TeamfitExplorerProfileResponse:
    return TeamfitExplorerProfileResponse(
        user_id=profile.user_id,
        problem_statement=profile.problem_statement,
        mbti=profile.mbti,
        mbti_axis_values=profile.mbti_axis_values,
        sdg_tags=list(profile.sdg_tags or []),
        narrative_markdown=profile.narrative_markdown,
        history=[_explorer_turn_to_response(turn) for turn in turns],
        can_request_followup=True,
        updated_at=profile.updated_at,
    )


def get_my_teamfit_explorer_profile(current_user: User, db: Session) -> TeamfitExplorerMeResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    turns = _load_explorer_turns(db, current_user.user_id) if profile else []
    active_profile_count = int(db.scalar(_active_explorer_profile_count_query()) or 0)
    return TeamfitExplorerMeResponse(
        profile=_explorer_profile_to_response(profile, turns) if profile else None,
        active_profile_count=active_profile_count,
    )


def get_next_teamfit_interview_question(
    payload: TeamfitInterviewQuestionRequest,
) -> TeamfitInterviewQuestionResponse:
    problem_statement, resolved_mbti, _, sdg_tags, narrative_markdown = _normalize_explorer_payload(
        payload.problem_statement,
        payload.mbti,
        payload.mbti_axis_values,
        payload.sdg_tags,
        payload.narrative_markdown,
    )
    normalized_history = _normalize_interview_turns(payload.history)

    if len(normalized_history) >= INITIAL_INTERVIEW_QUESTION_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"초기 인터뷰 질문은 최대 {INITIAL_INTERVIEW_QUESTION_LIMIT}개까지입니다.",
        )

    question = _generate_teamfit_question(
        problem_statement=problem_statement,
        mbti=resolved_mbti,
        sdg_tags=sdg_tags,
        narrative_markdown=narrative_markdown,
        history=normalized_history,
        phase="initial",
    )

    return TeamfitInterviewQuestionResponse(
        phase="initial",
        sequence_no=len(normalized_history) + 1,
        question=question,
    )


def save_teamfit_explorer_profile(
    payload: TeamfitExplorerProfileSaveRequest,
    current_user: User,
    db: Session,
) -> TeamfitExplorerProfileResponse:
    problem_statement, resolved_mbti, normalized_axis_values, sdg_tags, narrative_markdown = (
        _normalize_explorer_payload(
            payload.problem_statement,
            payload.mbti,
            payload.mbti_axis_values,
            payload.sdg_tags,
            payload.narrative_markdown,
        )
    )
    normalized_history = _normalize_interview_turns(
        payload.history,
        expected_count=INITIAL_INTERVIEW_QUESTION_LIMIT,
    )

    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None:
        profile = TeamfitExplorerProfile(user_id=current_user.user_id)
        db.add(profile)

    profile.problem_statement = problem_statement
    profile.mbti = resolved_mbti
    profile.mbti_axis_values = normalized_axis_values
    profile.sdg_tags = sdg_tags
    profile.narrative_markdown = narrative_markdown

    for turn in _load_explorer_turns(db, current_user.user_id):
        db.delete(turn)

    db.flush()

    for index, turn in enumerate(normalized_history, start=1):
        db.add(
            TeamfitExplorerTurn(
                user_id=current_user.user_id,
                sequence_no=index,
                phase="initial",
                question=turn.question,
                answer=turn.answer,
            )
        )

    db.commit()
    db.refresh(profile)
    turns = _load_explorer_turns(db, current_user.user_id)
    return _explorer_profile_to_response(profile, turns)


def create_teamfit_followup_question(
    current_user: User,
    db: Session,
) -> TeamfitInterviewQuestionResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="저장된 팀핏 탐색 프로필이 없습니다.",
        )

    turns = _load_explorer_turns(db, current_user.user_id)
    question = _generate_teamfit_question(
        problem_statement=profile.problem_statement,
        mbti=profile.mbti,
        sdg_tags=list(profile.sdg_tags or []),
        narrative_markdown=profile.narrative_markdown,
        history=turns,
        phase="followup",
    )
    return TeamfitInterviewQuestionResponse(
        phase="followup",
        sequence_no=len(turns) + 1,
        question=question,
    )


def save_teamfit_followup_answer(
    payload: TeamfitFollowupAnswerRequest,
    current_user: User,
    db: Session,
) -> TeamfitExplorerProfileResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="저장된 팀핏 탐색 프로필이 없습니다.",
        )

    question = _normalize_text(payload.question, "추가 질문", max_length=500)
    answer = _normalize_markdown_text(payload.answer, "추가 답변", max_length=2000)
    turns = _load_explorer_turns(db, current_user.user_id)

    db.add(
        TeamfitExplorerTurn(
            user_id=current_user.user_id,
            sequence_no=len(turns) + 1,
            phase="followup",
            question=question,
            answer=answer,
        )
    )
    db.commit()
    db.refresh(profile)

    return _explorer_profile_to_response(profile, _load_explorer_turns(db, current_user.user_id))


def _active_profile_count_query() -> Select[tuple[int]]:
    return select(func.count()).select_from(TeamfitProfile).where(TeamfitProfile.status == "active")


def _profile_to_response(profile: TeamfitProfile) -> TeamfitProfileResponse:
    return TeamfitProfileResponse(
        user_id=profile.user_id,
        status=profile.status,
        completion_stage=profile.completion_stage,
        preferred_role=profile.preferred_role,
        working_style=profile.working_style,
        commitment_pace=profile.commitment_pace,
        interests=list(profile.interests or []),
        problem_focus=list(profile.problem_focus or []),
        domains=list(profile.domains or []),
        tech_stack=list(profile.tech_stack or []),
        impact_tags=list(profile.impact_tags or []),
        mbti=profile.mbti,
        mbti_axis_values=profile.mbti_axis_values or _default_mbti_axis_values_from_mbti(profile.mbti),
        one_liner=profile.one_liner,
        updated_at=profile.updated_at,
    )


def get_my_teamfit_profile(current_user: User, db: Session) -> TeamfitMeResponse:
    profile = db.get(TeamfitProfile, current_user.user_id)
    active_profile_count = int(db.scalar(_active_profile_count_query()) or 0)
    return TeamfitMeResponse(
        profile=_profile_to_response(profile) if profile else None,
        active_profile_count=active_profile_count,
    )


def upsert_teamfit_profile(
    payload: TeamfitProfileUpsertRequest,
    current_user: User,
    db: Session,
) -> TeamfitProfileResponse:
    normalized_mbti = _normalize_mbti(payload.mbti)
    normalized_mbti_axis_values = _normalize_mbti_axis_values(payload.mbti_axis_values, normalized_mbti)

    normalized_payload = TeamfitProfileUpsertRequest(
        completion_stage=payload.completion_stage,
        preferred_role=_normalize_text(payload.preferred_role, "선호 역할", max_length=80),
        working_style=_normalize_text(payload.working_style, "작업 스타일", max_length=80),
        commitment_pace=_normalize_text(payload.commitment_pace, "기대 페이스", max_length=80),
        interests=_normalize_string_list(payload.interests, "관심사"),
        problem_focus=_normalize_string_list(payload.problem_focus, "풀고 싶은 문제"),
        domains=_normalize_string_list(payload.domains, "관심 도메인"),
        tech_stack=_normalize_string_list(payload.tech_stack, "기술 스택"),
        impact_tags=_normalize_impact_tags(payload.impact_tags),
        mbti=normalized_mbti,
        mbti_axis_values=normalized_mbti_axis_values,
        one_liner=_normalize_optional_text(payload.one_liner, max_length=180),
    )
    embedding_input = _build_embedding_input(normalized_payload)
    embedding = embed_text(embedding_input)

    profile = db.get(TeamfitProfile, current_user.user_id)
    if profile is None:
        profile = TeamfitProfile(user_id=current_user.user_id)
        db.add(profile)

    profile.status = "active"
    profile.completion_stage = normalized_payload.completion_stage
    profile.preferred_role = normalized_payload.preferred_role
    profile.working_style = normalized_payload.working_style
    profile.commitment_pace = normalized_payload.commitment_pace
    profile.interests = normalized_payload.interests
    profile.problem_focus = normalized_payload.problem_focus
    profile.domains = normalized_payload.domains
    profile.tech_stack = normalized_payload.tech_stack
    profile.impact_tags = normalized_payload.impact_tags
    profile.mbti = normalized_payload.mbti
    profile.mbti_axis_values = normalized_payload.mbti_axis_values
    profile.one_liner = normalized_payload.one_liner
    profile.embedding_input = embedding_input
    profile.embedding_json = embedding

    db.flush()
    sync_pgvector_embedding(db, current_user.user_id, embedding)
    db.commit()
    db.refresh(profile)

    return _profile_to_response(profile)


def _cosine_similarity(left: list[float] | None, right: list[float] | None) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot_product = sum(a * b for a, b in zip(left, right, strict=False))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(0.0, min(1.0, dot_product / (left_norm * right_norm)))


def _jaccard_similarity(left: Iterable[str], right: Iterable[str]) -> float:
    left_set = {item.casefold() for item in left if item}
    right_set = {item.casefold() for item in right if item}
    if not left_set or not right_set:
        return 0.0
    return len(left_set & right_set) / len(left_set | right_set)


def _bool_similarity(left: str | None, right: str | None) -> float:
    if not left or not right:
        return 0.0
    return 1.0 if left.casefold() == right.casefold() else 0.0


def _scale_mid_distance_bonus(cosine_similarity: float) -> float:
    target = 0.56
    spread = 0.34
    return max(0.0, 1.0 - abs(cosine_similarity - target) / spread)


def _safe_average(*values: float) -> float:
    return sum(values) / len(values) if values else 0.0


def _reason_tokens(viewer: TeamfitProfile, candidate: TeamfitProfile, bucket: str) -> tuple[list[str], list[str]]:
    codes: list[str] = []

    if _jaccard_similarity(viewer.problem_focus, candidate.problem_focus) > 0:
        codes.append("shared_problems")
    if _jaccard_similarity(viewer.domains, candidate.domains) > 0:
        codes.append("shared_domains")
    if _jaccard_similarity(viewer.tech_stack, candidate.tech_stack) > 0:
        codes.append("shared_stack")
    if _bool_similarity(viewer.working_style, candidate.working_style) > 0:
        codes.append("same_style")
    if _bool_similarity(viewer.commitment_pace, candidate.commitment_pace) > 0:
        codes.append("same_pace")
    if bucket in {"complementary", "unexpected"} and (
        viewer.preferred_role.casefold() != candidate.preferred_role.casefold()
    ):
        codes.append("different_role")
    if bucket in {"complementary", "unexpected"} and _jaccard_similarity(viewer.tech_stack, candidate.tech_stack) < 0.25:
        codes.append("different_stack")
    if _jaccard_similarity(viewer.impact_tags, candidate.impact_tags) > 0:
        codes.append("shared_impact")

    label_map = {
        "shared_problems": "Shared problems",
        "shared_domains": "Shared domains",
        "shared_stack": "Common stack",
        "same_style": "Same style",
        "same_pace": "Same pace",
        "different_role": "Different role",
        "different_stack": "Different stack",
        "shared_impact": "Shared impact",
    }
    return codes[:3], [label_map[code] for code in codes[:3]]


def _can_share_email(viewer: User, candidate: User) -> bool:
    viewer_approved = viewer.is_admin or viewer.applicant_status == "approved"
    candidate_approved = candidate.applicant_status == "approved"
    return viewer_approved and candidate_approved


def _build_recommendation_payload(
    viewer_profile: TeamfitProfile,
    viewer_user: User,
    candidate_profile: TeamfitProfile,
    candidate_user: User,
    bucket: str,
    *,
    similarity_score: float,
    structured_fit_score: float,
) -> dict:
    reason_codes, reason_chips = _reason_tokens(viewer_profile, candidate_profile, bucket)
    return {
        "user_id": candidate_user.user_id,
        "bucket": bucket,
        "name": candidate_user.name or candidate_user.email.split("@", 1)[0],
        "gender": candidate_user.gender if candidate_user.gender in {"M", "F"} else None,
        "preferred_role": candidate_profile.preferred_role,
        "working_style": candidate_profile.working_style,
        "commitment_pace": candidate_profile.commitment_pace,
        "tech_stack": candidate_profile.tech_stack,
        "domains": candidate_profile.domains,
        "impact_tags": candidate_profile.impact_tags,
        "mbti": candidate_profile.mbti,
        "mbti_axis_values": candidate_profile.mbti_axis_values or _default_mbti_axis_values_from_mbti(candidate_profile.mbti),
        "one_liner": candidate_profile.one_liner,
        "reason_codes": reason_codes,
        "reason_chips": reason_chips,
        "similarity_score": round(similarity_score, 4),
        "structured_fit_score": round(structured_fit_score, 4),
        "is_verified": candidate_user.applicant_status == "approved",
        "email": candidate_user.email if _can_share_email(viewer_user, candidate_user) else None,
        "github_address": candidate_user.github_address,
        "notion_url": candidate_user.notion_url,
    }


def _fetch_pgvector_candidate_ids(db: Session, viewer_user_id: int, embedding: list[float]) -> list[int]:
    rows = db.execute(
        text(
            """
            SELECT user_id
            FROM teamfit_profiles
            WHERE status = 'active'
              AND user_id != :viewer_user_id
              AND embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """
        ),
        {
            "viewer_user_id": viewer_user_id,
            "embedding": _vector_literal(embedding),
            "limit": TOP_K_CANDIDATES,
        },
    ).all()
    return [int(row[0]) for row in rows]


def _fetch_candidate_profiles(db: Session, viewer_profile: TeamfitProfile) -> list[TeamfitProfile]:
    if viewer_profile.embedding_json and is_postgres_session(db):
        try:
            candidate_ids = _fetch_pgvector_candidate_ids(db, viewer_profile.user_id, viewer_profile.embedding_json)
        except Exception:  # noqa: BLE001
            candidate_ids = []
        if candidate_ids:
            profiles = db.scalars(
                select(TeamfitProfile)
                .where(TeamfitProfile.user_id.in_(candidate_ids))
                .order_by(TeamfitProfile.updated_at.desc())
            ).all()
            profile_map = {profile.user_id: profile for profile in profiles}
            return [profile_map[user_id] for user_id in candidate_ids if user_id in profile_map]

    profiles = db.scalars(
        select(TeamfitProfile).where(
            TeamfitProfile.status == "active",
            TeamfitProfile.user_id != viewer_profile.user_id,
        )
    ).all()
    return sorted(
        profiles,
        key=lambda profile: _cosine_similarity(viewer_profile.embedding_json, profile.embedding_json),
        reverse=True,
    )[:TOP_K_CANDIDATES]


def _bucket_scores(viewer: TeamfitProfile, candidate: TeamfitProfile) -> dict[str, float]:
    cosine = _cosine_similarity(viewer.embedding_json, candidate.embedding_json)
    problem_overlap = _jaccard_similarity(viewer.problem_focus, candidate.problem_focus)
    domain_overlap = _jaccard_similarity(viewer.domains, candidate.domains)
    impact_overlap = _jaccard_similarity(viewer.impact_tags, candidate.impact_tags)
    stack_overlap = _jaccard_similarity(viewer.tech_stack, candidate.tech_stack)
    style_match = _bool_similarity(viewer.working_style, candidate.working_style)
    pace_match = _bool_similarity(viewer.commitment_pace, candidate.commitment_pace)
    role_diversity = 1.0 - _bool_similarity(viewer.preferred_role, candidate.preferred_role)
    stack_diversity = 1.0 - stack_overlap
    core_overlap = _safe_average(problem_overlap, domain_overlap)

    similar = (
        cosine * 0.50
        + core_overlap * 0.20
        + stack_overlap * 0.15
        + style_match * 0.10
        + pace_match * 0.05
    )
    complementary = (
        cosine * 0.40
        + core_overlap * 0.20
        + role_diversity * 0.15
        + stack_diversity * 0.15
        + pace_match * 0.10
    )
    unexpected = (
        _scale_mid_distance_bonus(cosine) * 0.35
        + core_overlap * 0.25
        + impact_overlap * 0.20
        + stack_diversity * 0.20
    )
    structured_fit = min(1.0, core_overlap * 0.45 + stack_overlap * 0.15 + style_match * 0.20 + pace_match * 0.20)

    return {
        "cosine": cosine,
        "structured_fit": structured_fit,
        "similar": similar,
        "complementary": complementary,
        "unexpected": unexpected,
    }


def get_recommendations(current_user: User, db: Session) -> TeamfitRecommendationsResponse:
    viewer_profile = db.get(TeamfitProfile, current_user.user_id)
    active_profile_count = int(db.scalar(_active_profile_count_query()) or 0)
    viewer_approved = current_user.is_admin or current_user.applicant_status == "approved"

    if viewer_profile is None or not viewer_profile.embedding_json:
        return TeamfitRecommendationsResponse(
            requires_profile=True,
            requires_approval=not viewer_approved,
            active_profile_count=active_profile_count,
            similar=[],
            complementary=[],
            unexpected=[],
            map_points=[],
        )

    if not viewer_approved:
        return TeamfitRecommendationsResponse(
            requires_profile=False,
            requires_approval=True,
            active_profile_count=active_profile_count,
            similar=[],
            complementary=[],
            unexpected=[],
            map_points=[],
        )

    candidates = _fetch_candidate_profiles(db, viewer_profile)
    if not candidates:
        return TeamfitRecommendationsResponse(
            requires_profile=False,
            requires_approval=False,
            active_profile_count=active_profile_count,
            similar=[],
            complementary=[],
            unexpected=[],
            map_points=[],
        )

    users = db.scalars(
        select(User).where(User.user_id.in_([profile.user_id for profile in candidates]))
    ).all()
    user_map = {user.user_id: user for user in users}

    scored_candidates: list[tuple[TeamfitProfile, User, dict[str, float]]] = []
    for candidate in candidates:
        candidate_user = user_map.get(candidate.user_id)
        if candidate_user is None:
            continue
        scored_candidates.append((candidate, candidate_user, _bucket_scores(viewer_profile, candidate)))

    similar_items = sorted(scored_candidates, key=lambda item: item[2]["similar"], reverse=True)
    selected_ids: set[int] = set()

    def pick_bucket(bucket: str, rows: list[tuple[TeamfitProfile, User, dict[str, float]]]) -> list[dict]:
        picked: list[dict] = []
        seen_in_bucket: set[int] = set()

        for profile, user, scores in rows:
            if user.user_id in selected_ids or user.user_id in seen_in_bucket:
                continue
            seen_in_bucket.add(user.user_id)
            selected_ids.add(user.user_id)
            picked.append(
                _build_recommendation_payload(
                    viewer_profile,
                    current_user,
                    profile,
                    user,
                    bucket,
                    similarity_score=scores["cosine"],
                    structured_fit_score=scores["structured_fit"],
                )
            )
            if len(picked) >= MAX_RECOMMENDATIONS_PER_BUCKET:
                break

        if picked:
            return picked

        for profile, user, scores in rows:
            if user.user_id in seen_in_bucket:
                continue
            seen_in_bucket.add(user.user_id)
            picked.append(
                _build_recommendation_payload(
                    viewer_profile,
                    current_user,
                    profile,
                    user,
                    bucket,
                    similarity_score=scores["cosine"],
                    structured_fit_score=scores["structured_fit"],
                )
            )
            if len(picked) >= MAX_RECOMMENDATIONS_PER_BUCKET:
                break

        return picked

    similar = pick_bucket("similar", similar_items)
    complementary = pick_bucket(
        "complementary",
        sorted(scored_candidates, key=lambda item: item[2]["complementary"], reverse=True),
    )
    unexpected = pick_bucket(
        "unexpected",
        sorted(scored_candidates, key=lambda item: item[2]["unexpected"], reverse=True),
    )

    map_point_index: dict[int, dict] = {}
    for card in [*similar, *complementary, *unexpected]:
        existing = map_point_index.get(card["user_id"])
        if existing and existing["y"] >= card["structured_fit_score"]:
            continue
        map_point_index[card["user_id"]] = {
            "user_id": card["user_id"],
            "bucket": card["bucket"],
            "name": card["name"],
            "x": round(card["similarity_score"], 4),
            "y": round(card["structured_fit_score"], 4),
            "is_verified": card["is_verified"],
        }
    map_points = list(map_point_index.values())

    return TeamfitRecommendationsResponse(
        requires_profile=False,
        requires_approval=False,
        active_profile_count=active_profile_count,
        similar=similar,
        complementary=complementary,
        unexpected=unexpected,
        map_points=map_points if len(map_points) >= 8 else [],
    )
