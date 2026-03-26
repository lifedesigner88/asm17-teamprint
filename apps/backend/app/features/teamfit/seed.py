from __future__ import annotations

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.security import hash_password
from app.features.auth.models import User

from .models import TeamfitProfile
from .schemas import TeamfitProfileUpsertRequest
from .service import _build_embedding_input, embed_text, sync_pgvector_embedding

MBTI_AXIS_IDS = ("mind", "energy", "nature", "tactics", "identity")
SDG_TAG_IDS = frozenset(
    {
        "no_poverty",
        "zero_hunger",
        "good_health_well_being",
        "quality_education",
        "gender_equality",
        "clean_water_sanitation",
        "affordable_clean_energy",
        "decent_work_economic_growth",
        "industry_innovation_infrastructure",
        "reduced_inequalities",
        "sustainable_cities_communities",
        "responsible_consumption_production",
        "climate_action",
        "life_below_water",
        "life_on_land",
        "peace_justice_strong_institutions",
        "partnerships_for_the_goals",
    }
)
LEGACY_DEMO_ONE_LINERS = frozenset(
    {
        "Founder-PM who ships fast and cares about durable team alignment.",
        "Backend owner who likes clear scope, durable infra, and calm execution.",
        "Frontend builder focused on trust, clarity, and fast product feedback loops.",
        "Research-minded teammate who likes turning fuzzy people questions into usable systems.",
        "Full-stack generalist who optimizes for fast demo-to-feedback cycles.",
        "Operator-PM who keeps teams aligned and user promises realistic.",
    }
)

DEMO_TEAMFIT_USERS = [
    {
        "email": "lifedesigner88@gmail.com",
        "password": "123456",
        "name": "박세종 (demo)",
        "github_address": "https://github.com/lifedesigner88",
        "notion_url": "https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "founder_pm",
            "working_style": "documentation",
            "commitment_pace": "steady_daily",
            "interests": ["ai_tools", "product_building", "education"],
            "problem_focus": ["find_teammates", "clarify_scope"],
            "domains": ["team_building", "education", "community"],
            "tech_stack": ["python", "fastapi", "react", "postgresql"],
            "impact_tags": [
                "quality_education",
                "sustainable_cities_communities",
                "reduced_inequalities",
                "industry_innovation_infrastructure",
            ],
            "mbti": "INFJ-T",
            "mbti_axis_values": {
                "mind": 82,
                "energy": 74,
                "nature": 68,
                "tactics": 71,
                "identity": 79,
            },
            "one_liner": "문서로 판을 깔고, 코드로 마감하는 Founder-PM입니다.",
        },
    },
    {
        "email": "minseo.builder@example.com",
        "password": "123456",
        "name": "김민서 (demo)",
        "github_address": "https://github.com/example-minseo",
        "notion_url": "https://example.notion.site/minseo-builder",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "backend_ai_infra",
            "working_style": "async",
            "commitment_pace": "steady_daily",
            "interests": ["ai_tools", "research", "product_building"],
            "problem_focus": ["own_operations", "keep_momentum"],
            "domains": ["team_building", "productivity", "community"],
            "tech_stack": ["python", "fastapi", "postgresql", "docker", "aws"],
            "impact_tags": [
                "decent_work_economic_growth",
                "industry_innovation_infrastructure",
                "climate_action",
                "sustainable_cities_communities",
            ],
            "mbti": "INTJ-A",
            "mbti_axis_values": {
                "mind": 77,
                "energy": 70,
                "nature": 33,
                "tactics": 66,
                "identity": 27,
            },
            "one_liner": "복잡한 백엔드는 조용히 정리하고, 팀 속도는 끝까지 살리는 사람입니다.",
        },
    },
    {
        "email": "haeun.frontend@example.com",
        "password": "123456",
        "name": "박하은 (demo)",
        "github_address": "https://github.com/example-haeun",
        "notion_url": "https://example.notion.site/haeun-ui",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "frontend_ux_product",
            "working_style": "user_interviews",
            "commitment_pace": "sprint_mode",
            "interests": ["design", "product_building", "community"],
            "problem_focus": ["find_teammates", "validate_users"],
            "domains": ["team_building", "creator_tools", "community"],
            "tech_stack": ["typescript", "react", "supabase"],
            "impact_tags": [
                "sustainable_cities_communities",
                "reduced_inequalities",
                "quality_education",
                "gender_equality",
            ],
            "mbti": "ENFJ-A",
            "mbti_axis_values": {
                "mind": 24,
                "energy": 68,
                "nature": 73,
                "tactics": 64,
                "identity": 29,
            },
            "one_liner": "예쁜 화면보다 믿고 누를 수 있는 화면을 더 집요하게 만드는 프론트엔드입니다.",
        },
    },
    {
        "email": "jiyoon.research@example.com",
        "password": "123456",
        "name": "이지윤 (demo)",
        "github_address": "https://github.com/example-jiyoon",
        "notion_url": "https://example.notion.site/jiyoon-research",
        "applicant_status": "pending",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "data_ai_research",
            "working_style": "research_first",
            "commitment_pace": "steady_deep_work",
            "interests": ["research", "ai_tools", "education"],
            "problem_focus": ["find_teammates", "validate_users"],
            "domains": ["team_building", "mental_health", "education"],
            "tech_stack": ["python", "postgresql", "analytics"],
            "impact_tags": [
                "good_health_well_being",
                "quality_education",
                "reduced_inequalities",
                "peace_justice_strong_institutions",
            ],
            "mbti": "INTP-T",
            "mbti_axis_values": {
                "mind": 71,
                "energy": 66,
                "nature": 31,
                "tactics": 28,
                "identity": 77,
            },
            "one_liner": "애매한 사람 문제를 데이터와 구조로 번역하는 연구 메이트입니다.",
        },
    },
    {
        "email": "taeho.fullstack@example.com",
        "password": "123456",
        "name": "정태호 (demo)",
        "github_address": "https://github.com/example-taeho",
        "notion_url": "https://example.notion.site/taeho-fullstack",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step1",
            "preferred_role": "fullstack_builder",
            "working_style": "fast_iteration",
            "commitment_pace": "weeknights_and_weekends",
            "interests": ["product_building", "ai_tools", "community"],
            "problem_focus": ["ship_fast", "validate_users"],
            "domains": ["productivity", "team_building", "climate"],
            "tech_stack": ["typescript", "react", "supabase", "docker"],
            "impact_tags": [
                "climate_action",
                "decent_work_economic_growth",
                "industry_innovation_infrastructure",
                "responsible_consumption_production",
            ],
            "mbti": "ENTP-A",
            "mbti_axis_values": {
                "mind": 26,
                "energy": 63,
                "nature": 35,
                "tactics": 24,
                "identity": 31,
            },
            "one_liner": "오늘 데모 띄우고 내일 피드백 받는 속도를 사랑하는 풀스택입니다.",
        },
    },
    {
        "email": "soyeon.mission@example.com",
        "password": "123456",
        "name": "최소연 (demo)",
        "github_address": "https://github.com/example-soyeon",
        "notion_url": "https://example.notion.site/soyeon-mission",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "pm_operator",
            "working_style": "structured_planning",
            "commitment_pace": "steady_daily",
            "interests": ["community", "education", "design"],
            "problem_focus": ["keep_momentum", "clarify_scope"],
            "domains": ["community", "accessibility", "education"],
            "tech_stack": ["notion", "figma", "sql", "analytics"],
            "impact_tags": [
                "reduced_inequalities",
                "quality_education",
                "sustainable_cities_communities",
                "clean_water_sanitation",
            ],
            "mbti": "ISFJ-T",
            "mbti_axis_values": {
                "mind": 75,
                "energy": 29,
                "nature": 69,
                "tactics": 72,
                "identity": 78,
            },
            "one_liner": "회의는 짧게, 약속은 정확하게, 팀 흐름은 오래 가게 만드는 운영형 PM입니다.",
        },
    },
]


def _profile_payload(profile_seed: dict[str, object]) -> TeamfitProfileUpsertRequest:
    return TeamfitProfileUpsertRequest(**profile_seed)


def _embed_profile_payload(payload: TeamfitProfileUpsertRequest) -> tuple[str, list[float]]:
    embedding_input = _build_embedding_input(payload)
    embedding = embed_text(
        embedding_input,
        allow_fallback_on_error=True,
        prefer_remote=False,
    )
    return embedding_input, embedding


def _payload_from_profile(profile: TeamfitProfile) -> TeamfitProfileUpsertRequest:
    return TeamfitProfileUpsertRequest(
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
        mbti_axis_values=profile.mbti_axis_values,
        one_liner=profile.one_liner,
    )


def _profile_has_complete_mbti_signals(profile: TeamfitProfile) -> bool:
    compact_mbti = (profile.mbti or "").strip().upper().replace("-", "")
    axis_values = profile.mbti_axis_values or {}
    if len(compact_mbti) != len(MBTI_AXIS_IDS):
        return False

    for axis_id in MBTI_AXIS_IDS:
        raw_value = axis_values.get(axis_id)
        if raw_value is None:
            return False
        try:
            axis_value = int(raw_value)
        except (TypeError, ValueError):
            return False
        if axis_value < 0 or axis_value > 100 or axis_value == 50:
            return False

    return True


def _profile_has_complete_sdg_signals(profile: TeamfitProfile) -> bool:
    impact_tags = list(profile.impact_tags or [])
    return len(impact_tags) == 4 and all(tag in SDG_TAG_IDS for tag in impact_tags)


def _should_backfill_demo_one_liner(profile: TeamfitProfile) -> bool:
    one_liner = (profile.one_liner or "").strip()
    return not one_liner or one_liner in LEGACY_DEMO_ONE_LINERS


def _create_demo_teamfit_profile(db: Session, *, user_id: int, profile_seed: dict[str, object]) -> None:
    payload = _profile_payload(profile_seed)
    embedding_input, embedding = _embed_profile_payload(payload)

    profile = TeamfitProfile(user_id=user_id)
    db.add(profile)

    profile.status = "active"
    profile.completion_stage = payload.completion_stage
    profile.preferred_role = payload.preferred_role
    profile.working_style = payload.working_style
    profile.commitment_pace = payload.commitment_pace
    profile.interests = payload.interests
    profile.problem_focus = payload.problem_focus
    profile.domains = payload.domains
    profile.tech_stack = payload.tech_stack
    profile.impact_tags = payload.impact_tags
    profile.mbti = payload.mbti
    profile.mbti_axis_values = payload.mbti_axis_values
    profile.one_liner = payload.one_liner
    profile.embedding_input = embedding_input
    profile.embedding_json = embedding

    db.flush()
    sync_pgvector_embedding(db, user_id, embedding)


def _sync_demo_profile_signals(db: Session, *, profile: TeamfitProfile, profile_seed: dict[str, object]) -> None:
    needs_signal_backfill = not (
        _profile_has_complete_mbti_signals(profile) and _profile_has_complete_sdg_signals(profile)
    )
    needs_one_liner_backfill = _should_backfill_demo_one_liner(profile)

    if not needs_signal_backfill and not needs_one_liner_backfill:
        return

    seed_payload = _profile_payload(profile_seed)
    updates: dict[str, object] = {}
    if needs_signal_backfill:
        updates.update(
            {
                "completion_stage": seed_payload.completion_stage,
                "impact_tags": seed_payload.impact_tags,
                "mbti": seed_payload.mbti,
                "mbti_axis_values": seed_payload.mbti_axis_values,
            }
        )
    if needs_one_liner_backfill:
        updates["one_liner"] = seed_payload.one_liner

    merged_payload = _payload_from_profile(profile).model_copy(update=updates)
    embedding_input, embedding = _embed_profile_payload(merged_payload)

    profile.status = "active"
    if needs_signal_backfill:
        profile.completion_stage = merged_payload.completion_stage
        profile.impact_tags = merged_payload.impact_tags
        profile.mbti = merged_payload.mbti
        profile.mbti_axis_values = merged_payload.mbti_axis_values
    if needs_one_liner_backfill:
        profile.one_liner = merged_payload.one_liner
    profile.embedding_input = embedding_input
    profile.embedding_json = embedding

    db.flush()
    sync_pgvector_embedding(db, profile.user_id, embedding)


def sync_teamfit_demo_seed(db: Session) -> None:
    if os.getenv("TEAMFIT_DEMO_SEED_ENABLED", "true").lower() in {"0", "false", "no"}:
        return

    for entry in DEMO_TEAMFIT_USERS:
        user = db.scalar(select(User).where(User.email == entry["email"]))
        if user is None:
            user = User(
                email=entry["email"],
                password_hash=hash_password(entry["password"]),
                is_verified=True,
                is_admin=False,
                name=entry["name"],
                github_address=entry["github_address"],
                notion_url=entry["notion_url"],
                applicant_status=entry["applicant_status"],
            )
            db.add(user)
            db.flush()

        profile = db.get(TeamfitProfile, user.user_id)
        if profile is not None:
            _sync_demo_profile_signals(db, profile=profile, profile_seed=entry["profile"])
            continue

        _create_demo_teamfit_profile(db, user_id=user.user_id, profile_seed=entry["profile"])

    db.commit()
