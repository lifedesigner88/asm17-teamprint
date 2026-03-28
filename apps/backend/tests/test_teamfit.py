from sqlalchemy import select

from app.common.db import SessionLocal
from app.features.teamfit.models import TeamfitExplorerProfile, TeamfitExplorerTurn

VALID_AXIS_VALUES = {
    "mind": 74,
    "energy": 26,
    "nature": 74,
    "tactics": 26,
    "identity": 74,
}

VALID_HISTORY = [
    {
        "question": "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
        "answer": "팀빌딩 전에 누구와 먼저 이야기해야 할지 더 잘 좁히고 싶습니다.",
    },
    {
        "question": "함께할 팀원을 고를 때 꼭 맞아야 하는 협업 장면은 무엇인가요?",
        "answer": "문제를 명확하게 정의하고 빠르게 작은 실험을 굴릴 수 있어야 합니다.",
    },
    {
        "question": "6개월 뒤 어떤 결과가 나오면 잘 풀었다고 느낄까요?",
        "answer": "후보를 빠르게 좁히고 실제 대화 전환율이 높아졌다고 느끼면 좋겠습니다.",
    },
]


def build_payload(**overrides):
    payload = {
        "problem_statement": "팀빌딩 전에 누구와 먼저 대화해야 할지 더 잘 좁히고 싶습니다.",
        "mbti": "ISFP-T",
        "mbti_axis_values": VALID_AXIS_VALUES,
        "sdg_tags": [
            "quality_education",
            "reduced_inequalities",
            "climate_action",
            "good_health_well_being",
        ],
        "narrative_markdown": (
            "저는 팀빌딩 문제를 정답 추천보다 **대화 시작을 돕는 구조**로 보고 있습니다.\n\n"
            "지금 필요한 것은 모든 사람을 정확히 점수화하는 것이 아니라, "
            "누구와 먼저 이야기해볼지 더 나은 shortlist를 만드는 흐름입니다."
        ),
        "history": VALID_HISTORY,
    }
    payload.update(overrides)
    return payload


def seed_saved_profile(client, signup_user, login_user):
    signup_user(email="teamfit-owner@example.com")
    login_user("teamfit-owner@example.com")
    response = client.put("/team-fit/me", json=build_payload())
    assert response.status_code == 200
    return response


def test_teamfit_v2_routes_require_login(client):
    me_response = client.get("/team-fit/me")
    next_question_response = client.post(
        "/team-fit/interview/next-question",
        json=build_payload(history=[]),
    )
    save_response = client.put("/team-fit/me", json=build_payload())
    followup_response = client.post("/team-fit/interview/follow-up")
    followup_answer_response = client.post(
        "/team-fit/interview/follow-up-answer",
        json={"question": "추가 질문", "answer": "추가 답변"},
    )
    recommendation_response = client.get("/team-fit/recommendations")

    assert me_response.status_code == 401
    assert next_question_response.status_code == 401
    assert save_response.status_code == 401
    assert followup_response.status_code == 401
    assert followup_answer_response.status_code == 401
    assert recommendation_response.status_code == 401


def test_teamfit_next_question_generates_first_question(client, signup_user, login_user, monkeypatch):
    signup_user(email="teamfit-question@example.com")
    login_user("teamfit-question@example.com")
    monkeypatch.setattr(
        "app.features.teamfit.service._generate_teamfit_question",
        lambda **_: "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
    )

    response = client.post("/team-fit/interview/next-question", json=build_payload(history=[]))

    assert response.status_code == 200
    assert response.json() == {
        "phase": "initial",
        "sequence_no": 1,
        "question": "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
    }


def test_teamfit_next_question_limits_initial_interview_to_three_answers(
    client, signup_user, login_user
):
    signup_user(email="teamfit-limit@example.com")
    login_user("teamfit-limit@example.com")

    response = client.post("/team-fit/interview/next-question", json=build_payload())

    assert response.status_code == 400
    assert "최대 3개" in response.json()["detail"]


def test_teamfit_save_requires_exactly_three_initial_answers(client, signup_user, login_user):
    signup_user(email="teamfit-history-rule@example.com")
    login_user("teamfit-history-rule@example.com")

    response = client.put("/team-fit/me", json=build_payload(history=VALID_HISTORY[:2]))

    assert response.status_code == 400
    assert "정확히 3개" in response.json()["detail"]


def test_teamfit_save_persists_explorer_profile_and_history(client, signup_user, login_user):
    signup_user(email="teamfit-save@example.com")
    login_user("teamfit-save@example.com")

    response = client.put("/team-fit/me", json=build_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["problem_statement"] == build_payload()["problem_statement"]
    assert body["mbti"] == "ISFP-T"
    assert body["sdg_tags"] == [
        "quality_education",
        "reduced_inequalities",
        "climate_action",
        "good_health_well_being",
    ]
    assert len(body["history"]) == 3
    assert body["history"][0]["phase"] == "initial"
    assert body["can_request_followup"] is True

    with SessionLocal() as db:
        profile = db.scalar(select(TeamfitExplorerProfile))
        assert profile is not None
        assert profile.problem_statement == build_payload()["problem_statement"]

        turns = db.scalars(
            select(TeamfitExplorerTurn).order_by(TeamfitExplorerTurn.sequence_no.asc())
        ).all()
        assert len(turns) == 3
        assert [turn.sequence_no for turn in turns] == [1, 2, 3]
        assert all(turn.phase == "initial" for turn in turns)


def test_teamfit_save_validates_step1_and_step2_rules(client, signup_user, login_user):
    signup_user(email="teamfit-validation@example.com")
    login_user("teamfit-validation@example.com")

    too_long_problem_response = client.put(
        "/team-fit/me",
        json=build_payload(problem_statement="가" * 81),
    )
    too_few_sdgs_response = client.put(
        "/team-fit/me",
        json=build_payload(
            sdg_tags=["quality_education", "reduced_inequalities", "climate_action"]
        ),
    )
    too_long_narrative_response = client.put(
        "/team-fit/me",
        json=build_payload(narrative_markdown="a" * 801),
    )

    assert too_long_problem_response.status_code == 422
    assert any(
        "problem_statement" in str(part)
        for error in too_long_problem_response.json()["detail"]
        for part in error.get("loc", [])
    )
    assert too_few_sdgs_response.status_code == 400
    assert "4개" in too_few_sdgs_response.json()["detail"]
    assert too_long_narrative_response.status_code == 422


def test_teamfit_me_returns_saved_profile_and_active_count(client, signup_user, login_user):
    seed_saved_profile(client, signup_user, login_user)

    response = client.get("/team-fit/me")

    assert response.status_code == 200
    body = response.json()
    assert body["active_profile_count"] == 1
    assert body["profile"]["problem_statement"] == build_payload()["problem_statement"]
    assert len(body["profile"]["history"]) == 3


def test_teamfit_followup_question_and_answer_append_history(
    client, signup_user, login_user, monkeypatch
):
    seed_saved_profile(client, signup_user, login_user)
    monkeypatch.setattr(
        "app.features.teamfit.service._generate_teamfit_question",
        lambda **_: "이 문제를 같이 풀 사람에게 꼭 기대하는 태도는 무엇인가요?",
    )

    question_response = client.post("/team-fit/interview/follow-up")
    assert question_response.status_code == 200
    assert question_response.json() == {
        "phase": "followup",
        "sequence_no": 4,
        "question": "이 문제를 같이 풀 사람에게 꼭 기대하는 태도는 무엇인가요?",
    }

    answer_response = client.post(
        "/team-fit/interview/follow-up-answer",
        json={
            "question": question_response.json()["question"],
            "answer": "문제를 정의하고 실행 우선순위를 분명하게 맞출 수 있으면 좋겠습니다.",
        },
    )

    assert answer_response.status_code == 200
    body = answer_response.json()
    assert len(body["history"]) == 4
    assert body["history"][-1]["phase"] == "followup"
    assert body["history"][-1]["sequence_no"] == 4

    with SessionLocal() as db:
        turns = db.scalars(
            select(TeamfitExplorerTurn).order_by(TeamfitExplorerTurn.sequence_no.asc())
        ).all()
        assert len(turns) == 4
        assert turns[-1].phase == "followup"
