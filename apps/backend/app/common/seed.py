"""Demo seed — inserts parksejong user + Hupository persona on every startup (idempotent)."""
from __future__ import annotations

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.security import hash_password
from app.features.auth.models import User
from app.features.persona.models import Persona

DEMO_USER_EMAIL = os.getenv("DEMO_USER_EMAIL", "lifedesigner88@gmail.com")
DEMO_USER_PIN   = os.getenv("DEMO_USER_PIN",   "1234")                 # login: email + 1234
DEMO_PERSONA_ID = os.getenv("DEMO_PERSONA_ID", "sejong")               # /persona/sejong

_DATA_ENG: dict = {
    "archetype": "Reflective Educator-Builder",
    "headline": "Educator-turned developer with a strong math teaching background",
    "mbti": {
        "type": "INFJ",
        "identity": "T",
        "scores": {
            "introverted": 78,
            "intuitive": 86,
            "feeling": 62,
            "judging": 79,
            "turbulent": 72,
        },
    },
    "one_liner": (
        "A person who connects learning to life design, and transforms what they've "
        "learned into structures and systems for people."
    ),
    "top3_values": ["Life Design", "Growth & Learning", "Education & Sharing"],
    "strengths": [
        "Structures learned content into forms others can use",
        "Organizes people and designs programs with operational skill",
        "Sustains deep learning on a single subject over the long term",
        "Reconstructs career direction into new domains with resilience",
        "Translates teaching experience into product and service problems",
        "Strong writing and documentation habits support learning and collaboration",
    ],
    "watchouts": [
        "Running too many axes at once can lead to overload",
        "Wide interests can blur execution priorities",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "Hold the question of how to design a life — and help more people design "
            "their own lives better through technology and education."
        ),
        "current_decade_mission": (
            "Become someone who directly builds education and technology. Grow Sejong Class "
            "as a solo founder, secure AI builder capabilities, and lay the foundation for "
            "the next decade."
        ),
        "long_term_vision": (
            "As a Life Designer, combine technology and education so that more people can "
            "design their own lives with greater intention."
        ),
        "long_term_directions": [
            "Integrated education + technology service (Sejong Class expansion)",
            "Systems architect — design and automate at scale",
            "Community + platform — gather and connect people",
            "Life design content and service at wider reach",
        ],
    },
    "tech_stack": [
        {"name": "python",     "category": "Language",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"},
        {"name": "typescript", "category": "Language",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg"},
        {"name": "react",      "category": "Frontend",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"},
        {"name": "tailwindcss","category": "Frontend",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg"},
        {"name": "fastapi",    "category": "Backend",   "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"},
        {"name": "postgresql", "category": "Database",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg"},
        {"name": "docker",     "category": "DevOps",    "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"},
        {"name": "github",     "category": "DevOps",    "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg"},
    ],
    "fit_vectors": {
        "learning_drive": 5,
        "teaching_drive": 5,
        "community_drive": 5,
        "builder_drive": 4,
        "scientific_curiosity": 5,
        "entrepreneurship": 4,
        "reflection_depth": 5,
    },
    "sdg_alignment": [
        {"sdg": 4,  "label": "Quality Education",              "resonance": "high"},
        {"sdg": 8,  "label": "Decent Work and Economic Growth", "resonance": "high"},
        {"sdg": 10, "label": "Reduced Inequalities",            "resonance": "medium"},
        {"sdg": 17, "label": "Partnerships for the Goals",      "resonance": "medium"},
    ],
    "identity_shifts": [
        {
            "period": "2008–2010",
            "label": "Reboot after a dark period",
            "note": (
                "After bipolar disorder, dropping ROTC, and a suicide attempt — overcame "
                "social anxiety and re-engaged with people through the Noulga-ji community."
            ),
        },
        {
            "period": "2011",
            "label": "Life Designer declaration",
            "note": (
                "Publicly declared the identity 'Life Designer' at a Carpe Diem vision event. "
                "A consistent north star for the next 15 years."
            ),
        },
        {
            "period": "2021",
            "label": "Religion → science worldview shift",
            "note": (
                "Concluded 10 years of Daesoon Jinrihoe practice and restructured worldview "
                "around neuroscience, physics, and evolutionary theory."
            ),
        },
        {
            "period": "2023–2025",
            "label": "Education operator → tech-based solo founder",
            "note": (
                "After bootcamp and Playdata experience, quit and founded Sejong Class. "
                "Converging toward building education through technology."
            ),
        },
    ],
}

_DATA_KOR: dict = {
    "archetype": "성찰하는 교육자-빌더",
    "headline": "수학 교육 배경을 가진 교육자 출신 개발자",
    "mbti": {
        "type": "INFJ",
        "identity": "T",
        "scores": {
            "introverted": 78,
            "intuitive": 86,
            "feeling": 62,
            "judging": 79,
            "turbulent": 72,
        },
    },
    "one_liner": "배움을 삶의 설계와 연결하고, 배운 것을 사람들을 위한 구조와 시스템으로 전환하는 사람.",
    "top3_values": ["삶의 설계", "성장과 배움", "교육과 나눔"],
    "strengths": [
        "배운 내용을 다른 사람이 활용할 수 있는 형태로 구조화함",
        "사람을 조직하고 운영 역량으로 프로그램을 설계함",
        "한 주제에 대해 장기간 깊은 학습을 지속함",
        "커리어 방향을 새로운 영역으로 탄력 있게 재구성함",
        "교육 경험을 제품 및 서비스 문제로 전환함",
        "강한 글쓰기·문서화 습관이 배움과 협업을 지원함",
    ],
    "watchouts": [
        "동시에 너무 많은 축을 실행하면 과부하가 생길 수 있음",
        "넓은 관심사가 실행 우선순위를 흐릴 수 있음",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "삶을 어떻게 설계할 것인가라는 질문을 붙들고 — "
            "기술과 교육을 통해 더 많은 사람이 자신의 삶을 더 잘 설계하도록 돕는다."
        ),
        "current_decade_mission": (
            "직접 교육과 기술을 만드는 사람이 된다. 세종클래스를 1인 창업자로 성장시키고, "
            "AI 빌더 역량을 확보하며, 다음 10년의 기반을 마련한다."
        ),
        "long_term_vision": (
            "라이프 디자이너로서 기술과 교육을 결합해 더 많은 사람이 "
            "더 큰 의도를 가지고 자신의 삶을 설계할 수 있도록 한다."
        ),
        "long_term_directions": [
            "교육 + 기술 통합 서비스 (세종클래스 확장)",
            "시스템 아키텍트 — 설계하고 대규모로 자동화",
            "커뮤니티 + 플랫폼 — 사람을 모으고 연결",
            "더 넓은 범위의 삶 설계 콘텐츠 및 서비스",
        ],
    },
    "tech_stack": [
        {"name": "python",     "category": "언어",      "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"},
        {"name": "typescript", "category": "언어",      "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg"},
        {"name": "react",      "category": "프론트엔드", "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"},
        {"name": "tailwindcss","category": "프론트엔드", "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg"},
        {"name": "fastapi",    "category": "백엔드",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"},
        {"name": "postgresql", "category": "데이터베이스","icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg"},
        {"name": "docker",     "category": "DevOps",    "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"},
        {"name": "github",     "category": "DevOps",    "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg"},
    ],
    "fit_vectors": {
        "learning_drive": 5,
        "teaching_drive": 5,
        "community_drive": 5,
        "builder_drive": 4,
        "scientific_curiosity": 5,
        "entrepreneurship": 4,
        "reflection_depth": 5,
    },
    "sdg_alignment": [
        {"sdg": 4,  "label": "양질의 교육",              "resonance": "high"},
        {"sdg": 8,  "label": "양질의 일자리와 경제 성장", "resonance": "high"},
        {"sdg": 10, "label": "불평등 감소",               "resonance": "medium"},
        {"sdg": 17, "label": "목표 달성을 위한 파트너십", "resonance": "medium"},
    ],
    "identity_shifts": [
        {
            "period": "2008–2010",
            "label": "어두운 시기 이후의 재부팅",
            "note": (
                "조울증, ROTC 제적, 자살 시도 이후 — 사회적 불안을 극복하고 "
                "놀가지 커뮤니티를 통해 사람들과 다시 연결됨."
            ),
        },
        {
            "period": "2011",
            "label": "라이프 디자이너 선언",
            "note": (
                "카르페 디엠 비전 행사에서 '라이프 디자이너'라는 정체성을 공개 선언. "
                "이후 15년간 일관된 북극성이 됨."
            ),
        },
        {
            "period": "2021",
            "label": "종교 → 과학적 세계관으로의 전환",
            "note": (
                "대순진리회 10년 수행을 마무리하고 세계관을 "
                "신경과학, 물리학, 진화론 중심으로 재구성함."
            ),
        },
        {
            "period": "2023–2025",
            "label": "교육 운영자 → 기술 기반 1인 창업자",
            "note": (
                "부트캠프와 플레이데이터 경험 이후 퇴사하고 세종클래스를 창업. "
                "기술로 교육을 만드는 방향으로 수렴 중."
            ),
        },
    ],
}


def sync_demo_seed(db: Session) -> None:
    """Insert demo user and persona if they don't exist yet (idempotent)."""
    # ── User ──────────────────────────────────────────────────────────────────
    user = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    if user is None:
        user = User(
            email=DEMO_USER_EMAIL,
            password_hash=hash_password(DEMO_USER_PIN),
            is_verified=True,
            is_admin=False,
            github_address="https://github.com/lifedesigner88",
            notion_url="https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1",
        )
        db.add(user)
        db.flush()  # get user into session before persona FK

    # ── Persona ───────────────────────────────────────────────────────────────
    existing = db.scalar(select(Persona).where(Persona.persona_id == DEMO_PERSONA_ID))
    if existing is None:
        db.add(
            Persona(
                persona_id=DEMO_PERSONA_ID,
                user_id=user.user_id,
                title="세종 페르소나 · Sejong Persona",
                data_eng=_DATA_ENG,
                data_kor=_DATA_KOR,
            )
        )

    db.commit()
