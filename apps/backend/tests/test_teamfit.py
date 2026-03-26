import os

import pytest
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from app.common.db import Base, SessionLocal
from app.features.auth.models import User
from app.features.teamfit.models import TeamfitProfile
from app.features.teamfit.seed import DEMO_TEAMFIT_USERS, sync_teamfit_demo_seed
from app.features.teamfit.service import ensure_teamfit_pgvector_schema, sync_pgvector_embedding


def default_mbti_axis_values(mbti: str | None) -> dict[str, int] | None:
    if not mbti:
        return None

    compact = mbti.replace("-", "")
    mapping = {
        "I": 74,
        "E": 26,
        "N": 74,
        "S": 26,
        "F": 74,
        "T": 26,
        "J": 74,
        "P": 26,
        "A": 26,
    }
    return {
        "mind": mapping[compact[0]],
        "energy": mapping[compact[1]],
        "nature": mapping[compact[2]],
        "tactics": mapping[compact[3]],
        "identity": 50 if len(compact) < 5 else 74 if compact[4] == "T" else 26,
    }


def create_teamfit_profile(
    email: str,
    *,
    name: str,
    gender: str | None = None,
    mbti: str | None = None,
    mbti_axis_values: dict[str, int] | None = None,
    embedding: list[float],
    preferred_role: str,
    working_style: str,
    commitment_pace: str,
    interests: list[str],
    problem_focus: list[str],
    domains: list[str],
    tech_stack: list[str],
    impact_tags: list[str] | None = None,
    one_liner: str | None = None,
    applicant_status: str = "approved",
) -> int:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.name = name
        user.applicant_status = applicant_status
        if gender is not None:
            user.gender = gender

        profile = db.get(TeamfitProfile, user.user_id)
        if profile is None:
            profile = TeamfitProfile(user_id=user.user_id)
            db.add(profile)

        profile.status = "active"
        profile.completion_stage = "step2"
        profile.preferred_role = preferred_role
        profile.working_style = working_style
        profile.commitment_pace = commitment_pace
        profile.interests = interests
        profile.problem_focus = problem_focus
        profile.domains = domains
        profile.tech_stack = tech_stack
        profile.impact_tags = impact_tags or []
        profile.mbti = mbti
        profile.mbti_axis_values = mbti_axis_values or default_mbti_axis_values(mbti)
        profile.one_liner = one_liner
        profile.embedding_input = f"{preferred_role} {' '.join(interests)}"
        profile.embedding_json = embedding
        db.commit()
        return user.user_id


def test_teamfit_requires_login(client):
    me_response = client.get("/team-fit/me")
    save_response = client.put(
        "/team-fit/me",
        json={
            "completion_stage": "step1",
            "preferred_role": "Founder-PM",
            "working_style": "Document first",
            "commitment_pace": "Steady daily push",
            "interests": ["AI products"],
            "problem_focus": ["Help people choose teammates"],
            "domains": ["Team building"],
            "tech_stack": ["Python"],
        },
    )
    recommendation_response = client.get("/team-fit/recommendations")

    assert me_response.status_code == 401
    assert save_response.status_code == 401
    assert recommendation_response.status_code == 401


def test_teamfit_profile_can_be_saved_and_read_back(client, signup_user, login_user, monkeypatch):
    signup_user(email="teamfit-owner@example.com")
    login_user("teamfit-owner@example.com")
    monkeypatch.setattr(
        "app.features.teamfit.service.embed_text",
        lambda text_value, allow_fallback_on_error=False: [0.8, 0.2, 0.0],
    )

    payload = {
        "completion_stage": "step2",
        "preferred_role": "Founder-PM",
        "working_style": "Document first",
        "commitment_pace": "Steady daily push",
        "interests": ["AI products", "Team design"],
        "problem_focus": ["Help people choose better teammates"],
        "domains": ["Team building", "Education"],
        "tech_stack": ["Python", "FastAPI"],
        "impact_tags": [
            "quality_education",
            "sustainable_cities_communities",
            "climate_action",
            "decent_work_economic_growth",
        ],
        "mbti": "INFJ-T",
        "mbti_axis_values": {
            "mind": 78,
            "energy": 72,
            "nature": 64,
            "tactics": 69,
            "identity": 73,
        },
        "one_liner": "I move quickly when the scope is crisp.",
    }

    save_response = client.put("/team-fit/me", json=payload)
    assert save_response.status_code == 200

    me_response = client.get("/team-fit/me")
    assert me_response.status_code == 200
    profile = me_response.json()["profile"]
    assert profile["preferred_role"] == payload["preferred_role"]
    assert profile["working_style"] == payload["working_style"]
    assert profile["mbti"] == payload["mbti"]
    assert profile["mbti_axis_values"] == payload["mbti_axis_values"]
    assert profile["one_liner"] == payload["one_liner"]

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "teamfit-owner@example.com"))
        saved_profile = db.get(TeamfitProfile, user.user_id)
        assert saved_profile is not None
        assert saved_profile.embedding_json == [0.8, 0.2, 0.0]


def test_teamfit_profile_limits_impact_tags_to_four(client, signup_user, login_user):
    signup_user(email="teamfit-limit@example.com")
    login_user("teamfit-limit@example.com")

    response = client.put(
        "/team-fit/me",
        json={
            "completion_stage": "step2",
            "preferred_role": "Founder-PM",
            "working_style": "Document first",
            "commitment_pace": "Steady daily push",
            "interests": ["AI products"],
            "problem_focus": ["Help people choose better teammates"],
            "domains": ["Team building"],
            "tech_stack": ["Python"],
            "impact_tags": [
                "no_poverty",
                "zero_hunger",
                "good_health_well_being",
                "quality_education",
                "gender_equality",
            ],
        },
    )

    assert response.status_code == 400


def test_teamfit_profile_requires_exactly_four_impact_tags_if_any_are_selected(client, signup_user, login_user):
    signup_user(email="teamfit-impact-rule@example.com")
    login_user("teamfit-impact-rule@example.com")

    response = client.put(
        "/team-fit/me",
        json={
            "completion_stage": "step2",
            "preferred_role": "Founder-PM",
            "working_style": "Document first",
            "commitment_pace": "Steady daily push",
            "interests": ["AI products"],
            "problem_focus": ["Help people choose better teammates"],
            "domains": ["Team building"],
            "tech_stack": ["Python"],
            "impact_tags": ["quality_education"],
        },
    )

    assert response.status_code == 400


def test_teamfit_profile_requires_all_mbti_axes_if_mbti_is_used(client, signup_user, login_user):
    signup_user(email="teamfit-mbti-rule@example.com")
    login_user("teamfit-mbti-rule@example.com")

    response = client.put(
        "/team-fit/me",
        json={
            "completion_stage": "step2",
            "preferred_role": "Founder-PM",
            "working_style": "Document first",
            "commitment_pace": "Steady daily push",
            "interests": ["AI products"],
            "problem_focus": ["Help people choose better teammates"],
            "domains": ["Team building"],
            "tech_stack": ["Python"],
            "mbti": "INFJ-T",
            "mbti_axis_values": {
                "mind": 78,
                "energy": 72,
                "nature": 50,
                "tactics": 69,
                "identity": 73,
            },
        },
    )

    assert response.status_code == 400


def test_teamfit_recommendations_require_profile_before_matching(client, signup_user, login_user):
    signup_user(email="noprofile@example.com")
    login_user("noprofile@example.com")

    response = client.get("/team-fit/recommendations")

    assert response.status_code == 200
    assert response.json()["requires_profile"] is True
    assert response.json()["requires_approval"] is True
    assert response.json()["similar"] == []


def test_teamfit_recommendations_stay_locked_until_applicant_is_approved(client, signup_user, login_user):
    signup_user(email="pending-viewer@example.com")
    signup_user(email="approved-candidate@example.com")

    create_teamfit_profile(
        "pending-viewer@example.com",
        name="대기 중 뷰어",
        embedding=[1.0, 0.0, 0.0],
        preferred_role="Founder-PM",
        working_style="Document first",
        commitment_pace="Steady daily push",
        interests=["AI products", "Team fit"],
        problem_focus=["Help people choose better teammates"],
        domains=["Team building", "Education"],
        tech_stack=["Python", "FastAPI"],
        applicant_status="pending",
    )
    create_teamfit_profile(
        "approved-candidate@example.com",
        name="승인된 후보",
        embedding=[0.98, 0.08, 0.0],
        preferred_role="Founder-PM",
        working_style="Document first",
        commitment_pace="Steady daily push",
        interests=["AI products", "Team fit"],
        problem_focus=["Help people choose better teammates"],
        domains=["Team building", "Education"],
        tech_stack=["Python", "FastAPI"],
        applicant_status="approved",
    )

    login_user("pending-viewer@example.com")

    response = client.get("/team-fit/recommendations")
    assert response.status_code == 200

    data = response.json()
    assert data["requires_profile"] is False
    assert data["requires_approval"] is True
    assert data["similar"] == []
    assert data["complementary"] == []
    assert data["unexpected"] == []
    assert data["map_points"] == []


def test_teamfit_recommendations_use_sqlite_fallback_and_bucket_logic(client, signup_user, login_user):
    signup_user(email="viewer@example.com")
    signup_user(email="similar@example.com")
    signup_user(email="complementary@example.com")
    signup_user(email="unexpected@example.com")
    signup_user(email="far@example.com")

    viewer_user_id = create_teamfit_profile(
        "viewer@example.com",
        name="뷰어",
        gender="M",
        embedding=[1.0, 0.0, 0.0],
        preferred_role="Founder-PM",
        working_style="Document first",
        commitment_pace="Steady daily push",
        interests=["AI products", "Team fit"],
        problem_focus=["Help people choose better teammates"],
        domains=["Team building", "Education"],
        tech_stack=["Python", "FastAPI"],
        impact_tags=["education", "community"],
        mbti="INFJ-T",
        one_liner="Viewer profile",
    )
    create_teamfit_profile(
        "similar@example.com",
        name="유사도 높은 사람",
        gender="M",
        embedding=[0.98, 0.08, 0.0],
        preferred_role="Founder-PM",
        working_style="Document first",
        commitment_pace="Steady daily push",
        interests=["AI products", "Team fit"],
        problem_focus=["Help people choose better teammates"],
        domains=["Team building", "Education"],
        tech_stack=["Python", "FastAPI"],
        impact_tags=["community"],
        mbti="INFJ",
        one_liner="Strongly aligned on the same problem.",
    )
    create_teamfit_profile(
        "complementary@example.com",
        name="상호보완 후보",
        gender="F",
        embedding=[0.86, 0.2, 0.0],
        preferred_role="Backend-AI-Infra",
        working_style="Execution-heavy and async-friendly",
        commitment_pace="Steady daily push",
        interests=["Backend systems", "LLM products"],
        problem_focus=["Help people choose better teammates"],
        domains=["Team building", "Education"],
        tech_stack=["Postgres", "Docker", "AWS"],
        impact_tags=["community"],
        mbti="ENTJ-A",
        one_liner="Different role, same long-term problem.",
    )
    create_teamfit_profile(
        "unexpected@example.com",
        name="의외로 흥미로운 후보",
        gender="F",
        embedding=[0.45, 0.89, 0.0],
        preferred_role="PM-Operator",
        working_style="Structured planner",
        commitment_pace="Steady daily push",
        interests=["Community ops", "Trust systems"],
        problem_focus=["Help people choose better teammates"],
        domains=["Team building", "Community"],
        tech_stack=["Figma", "SQL"],
        impact_tags=["community", "accessibility"],
        mbti="ENFP",
        one_liner="More distant, but still mission-aligned.",
    )
    create_teamfit_profile(
        "far@example.com",
        name="멀리 있는 후보",
        gender="M",
        embedding=[0.0, 1.0, 0.0],
        preferred_role="Mobile",
        working_style="Solo sprinting",
        commitment_pace="Occasional weekends",
        interests=["Games"],
        problem_focus=["Build entertainment apps"],
        domains=["Gaming"],
        tech_stack=["Kotlin"],
        impact_tags=["climate"],
        one_liner="Not a close fit for this viewer.",
    )

    login_user("viewer@example.com")

    response = client.get("/team-fit/recommendations")
    assert response.status_code == 200
    data = response.json()

    assert data["requires_profile"] is False
    assert data["requires_approval"] is False
    assert all(card["user_id"] != viewer_user_id for card in data["similar"])
    assert data["similar"][0]["name"] == "유사도 높은 사람"
    assert data["similar"][0]["gender"] == "M"
    assert data["similar"][0]["mbti"] == "INFJ"
    assert data["similar"][0]["impact_tags"] == ["community"]
    assert data["similar"][0]["mbti_axis_values"]["mind"] == 74
    assert data["complementary"][0]["name"] == "상호보완 후보"
    assert data["complementary"][0]["gender"] == "F"
    assert data["complementary"][0]["mbti"] == "ENTJ-A"
    assert data["complementary"][0]["impact_tags"] == ["community"]
    assert data["complementary"][0]["mbti_axis_values"]["mind"] == 26
    assert data["unexpected"][0]["name"] == "의외로 흥미로운 후보"
    assert data["unexpected"][0]["gender"] == "F"
    assert data["unexpected"][0]["mbti"] == "ENFP"
    assert data["unexpected"][0]["impact_tags"] == ["community", "accessibility"]
    assert data["unexpected"][0]["mbti_axis_values"]["energy"] == 74
    assert data["map_points"] == []


def test_ensure_teamfit_pgvector_schema_fails_soft_on_lock_timeout(monkeypatch):
    class FakeDialect:
        name = "postgresql"

    class FakeBind:
        dialect = FakeDialect()

    class FakeSession:
        def __init__(self):
            self.info = {}
            self.rollback_called = False

        def get_bind(self):
            return FakeBind()

        def execute(self, statement, params=None):
            sql = str(statement)
            if "ALTER TABLE teamfit_profiles" in sql:
                raise OperationalError("ALTER TABLE", params or {}, Exception("lock timeout"))
            return None

        def commit(self):
            raise AssertionError("commit should not be reached after a lock timeout")

        def rollback(self):
            self.rollback_called = True

    fake_db = FakeSession()
    monkeypatch.setattr("app.features.teamfit.service.has_pgvector_embedding_column", lambda db: False)

    ensure_teamfit_pgvector_schema(fake_db)

    assert fake_db.rollback_called is True
    assert fake_db.info["teamfit_pgvector_embedding_ready"] is False


def test_sync_pgvector_embedding_skips_when_pgvector_column_is_unavailable(monkeypatch):
    class FakeDialect:
        name = "postgresql"

    class FakeBind:
        dialect = FakeDialect()

    class FakeSession:
        def __init__(self):
            self.info = {}

        def get_bind(self):
            return FakeBind()

        def execute(self, *_args, **_kwargs):
            raise AssertionError("pgvector update should be skipped when the embedding column is unavailable")

    fake_db = FakeSession()
    monkeypatch.setattr("app.features.teamfit.service.has_pgvector_embedding_column", lambda db: False)

    sync_pgvector_embedding(fake_db, 1, [1.0, 0.0, 0.0])


def test_teamfit_demo_seed_uses_local_embeddings_during_startup(monkeypatch):
    monkeypatch.setenv("TEAMFIT_DEMO_SEED_ENABLED", "true")
    calls: list[dict[str, bool]] = []

    def fake_embed_text(
        _text_value: str,
        *,
        allow_fallback_on_error: bool = False,
        prefer_remote: bool = True,
    ) -> list[float]:
        calls.append(
            {
                "allow_fallback_on_error": allow_fallback_on_error,
                "prefer_remote": prefer_remote,
            }
        )
        return [0.1, 0.2, 0.3]

    monkeypatch.setattr("app.features.teamfit.seed.embed_text", fake_embed_text)

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)
        profiles = db.scalars(select(TeamfitProfile)).all()
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))

    assert profiles
    assert calls
    assert all(call["allow_fallback_on_error"] is True for call in calls)
    assert all(call["prefer_remote"] is False for call in calls)
    assert seeded_user is not None
    assert seeded_user.name.endswith(" (demo)")


def test_teamfit_demo_seed_populates_full_mbti_axes_and_four_sdgs(monkeypatch):
    monkeypatch.setenv("TEAMFIT_DEMO_SEED_ENABLED", "true")
    monkeypatch.setattr(
        "app.features.teamfit.seed.embed_text",
        lambda _text_value, *, allow_fallback_on_error=False, prefer_remote=True: [0.1, 0.2, 0.3],
    )

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)

        for entry in DEMO_TEAMFIT_USERS:
            seeded_user = db.scalar(select(User).where(User.email == entry["email"]))
            assert seeded_user is not None

            profile = db.get(TeamfitProfile, seeded_user.user_id)
            assert profile is not None

            seed_profile = entry["profile"]
            assert profile.impact_tags == seed_profile["impact_tags"]
            assert len(profile.impact_tags) == 4
            assert profile.mbti == seed_profile["mbti"]
            assert profile.mbti_axis_values == seed_profile["mbti_axis_values"]
            assert set(profile.mbti_axis_values) == {"mind", "energy", "nature", "tactics", "identity"}
            assert profile.one_liner == seed_profile["one_liner"]


def test_teamfit_demo_seed_does_not_overwrite_existing_profiles(monkeypatch):
    monkeypatch.setenv("TEAMFIT_DEMO_SEED_ENABLED", "true")
    calls: list[dict[str, bool]] = []

    def fake_embed_text(
        _text_value: str,
        *,
        allow_fallback_on_error: bool = False,
        prefer_remote: bool = True,
    ) -> list[float]:
        calls.append(
            {
                "allow_fallback_on_error": allow_fallback_on_error,
                "prefer_remote": prefer_remote,
            }
        )
        return [0.1, 0.2, 0.3]

    monkeypatch.setattr("app.features.teamfit.seed.embed_text", fake_embed_text)

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)

    initial_calls = len(calls)
    assert initial_calls == len(DEMO_TEAMFIT_USERS)

    with SessionLocal() as db:
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))
        assert seeded_user is not None

        seeded_user.name = "커스텀 이름"
        profile = db.get(TeamfitProfile, seeded_user.user_id)
        assert profile is not None
        profile.one_liner = "커스텀 자기소개"
        db.commit()

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)

    assert len(calls) == initial_calls

    with SessionLocal() as db:
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))
        assert seeded_user is not None
        profile = db.get(TeamfitProfile, seeded_user.user_id)
        assert profile is not None

        assert seeded_user.name == "커스텀 이름"
        assert profile.one_liner == "커스텀 자기소개"


def test_teamfit_demo_seed_backfills_legacy_mbti_and_sdg_shapes(monkeypatch):
    monkeypatch.setenv("TEAMFIT_DEMO_SEED_ENABLED", "true")
    monkeypatch.setattr(
        "app.features.teamfit.seed.embed_text",
        lambda _text_value, *, allow_fallback_on_error=False, prefer_remote=True: [0.1, 0.2, 0.3],
    )

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))
        assert seeded_user is not None

        profile = db.get(TeamfitProfile, seeded_user.user_id)
        assert profile is not None

        profile.one_liner = "커스텀 자기소개"
        profile.impact_tags = ["community"]
        profile.mbti = "INFJ"
        profile.mbti_axis_values = default_mbti_axis_values("INFJ")
        db.commit()

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))
        assert seeded_user is not None

        profile = db.get(TeamfitProfile, seeded_user.user_id)
        assert profile is not None

        seed_profile = DEMO_TEAMFIT_USERS[0]["profile"]
        assert profile.one_liner == "커스텀 자기소개"
        assert profile.impact_tags == seed_profile["impact_tags"]
        assert profile.mbti == seed_profile["mbti"]
        assert profile.mbti_axis_values == seed_profile["mbti_axis_values"]


def test_teamfit_demo_seed_backfills_old_english_one_liners_to_new_korean_copy(monkeypatch):
    monkeypatch.setenv("TEAMFIT_DEMO_SEED_ENABLED", "true")
    monkeypatch.setattr(
        "app.features.teamfit.seed.embed_text",
        lambda _text_value, *, allow_fallback_on_error=False, prefer_remote=True: [0.1, 0.2, 0.3],
    )

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))
        assert seeded_user is not None

        profile = db.get(TeamfitProfile, seeded_user.user_id)
        assert profile is not None

        profile.one_liner = "Founder-PM who ships fast and cares about durable team alignment."
        db.commit()

    with SessionLocal() as db:
        sync_teamfit_demo_seed(db)
        seeded_user = db.scalar(select(User).where(User.email == DEMO_TEAMFIT_USERS[0]["email"]))
        assert seeded_user is not None

        profile = db.get(TeamfitProfile, seeded_user.user_id)
        assert profile is not None
        assert profile.one_liner == DEMO_TEAMFIT_USERS[0]["profile"]["one_liner"]


@pytest.mark.skipif(
    not os.getenv("TEAMFIT_PGVECTOR_SMOKE_DATABASE_URL"),
    reason="TEAMFIT_PGVECTOR_SMOKE_DATABASE_URL is not configured",
)
def test_pgvector_smoke_round_trip():
    database_url = os.environ["TEAMFIT_PGVECTOR_SMOKE_DATABASE_URL"]
    engine = create_engine(database_url, future=True)
    TestSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestSession() as db:
        ensure_teamfit_pgvector_schema(db)

        user = User(
            email="pgvector-smoke@example.com",
            password_hash="hashed",
            is_verified=True,
            is_admin=False,
            applicant_status="approved",
            name="Smoke",
        )
        db.add(user)
        db.flush()

        profile = TeamfitProfile(
            user_id=user.user_id,
            status="active",
            completion_stage="step1",
            preferred_role="Backend",
            working_style="Async",
            commitment_pace="Steady",
            interests=["pgvector"],
            problem_focus=["vector search"],
            domains=["team building"],
            tech_stack=["Postgres"],
            impact_tags=["community"],
            embedding_input="pgvector smoke",
            embedding_json=[1.0, 0.0, 0.0],
        )
        db.add(profile)
        db.flush()
        sync_pgvector_embedding(db, user.user_id, [1.0, 0.0, 0.0])
        db.commit()

        columns = {column["name"] for column in inspect(engine).get_columns("teamfit_profiles")}
        assert "embedding" in columns

        row = db.execute(
            text(
                """
                SELECT user_id
                FROM teamfit_profiles
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT 1
                """
            ),
            {"embedding": "[1,0,0]"},
        ).first()
        assert row is not None
        assert row[0] == user.user_id
