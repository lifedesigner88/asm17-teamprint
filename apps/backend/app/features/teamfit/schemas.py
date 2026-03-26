from datetime import datetime
from typing import Literal

from pydantic import BaseModel


CompletionStage = Literal["step1", "step2"]


class TeamfitProfileUpsertRequest(BaseModel):
    completion_stage: CompletionStage = "step1"
    preferred_role: str
    working_style: str
    commitment_pace: str
    interests: list[str]
    problem_focus: list[str]
    domains: list[str]
    tech_stack: list[str]
    impact_tags: list[str] = []
    mbti: str | None = None
    mbti_axis_values: dict[str, int] | None = None
    one_liner: str | None = None


class TeamfitProfileResponse(BaseModel):
    user_id: int
    status: str
    completion_stage: CompletionStage
    preferred_role: str
    working_style: str
    commitment_pace: str
    interests: list[str]
    problem_focus: list[str]
    domains: list[str]
    tech_stack: list[str]
    impact_tags: list[str]
    mbti: str | None = None
    mbti_axis_values: dict[str, int] | None = None
    one_liner: str | None = None
    updated_at: datetime


class TeamfitMeResponse(BaseModel):
    profile: TeamfitProfileResponse | None
    active_profile_count: int


class TeamfitRecommendationCard(BaseModel):
    user_id: int
    bucket: Literal["similar", "complementary", "unexpected"]
    name: str
    gender: Literal["M", "F"] | None = None
    preferred_role: str
    working_style: str
    commitment_pace: str
    tech_stack: list[str]
    domains: list[str]
    impact_tags: list[str]
    mbti: str | None = None
    mbti_axis_values: dict[str, int] | None = None
    one_liner: str | None = None
    reason_codes: list[str]
    reason_chips: list[str]
    similarity_score: float
    structured_fit_score: float
    is_verified: bool
    email: str | None = None
    github_address: str | None = None
    notion_url: str | None = None


class TeamfitMapPoint(BaseModel):
    user_id: int
    bucket: Literal["similar", "complementary", "unexpected"]
    name: str
    x: float
    y: float
    is_verified: bool


class TeamfitRecommendationsResponse(BaseModel):
    requires_profile: bool = False
    requires_approval: bool = False
    active_profile_count: int
    similar: list[TeamfitRecommendationCard]
    complementary: list[TeamfitRecommendationCard]
    unexpected: list[TeamfitRecommendationCard]
    map_points: list[TeamfitMapPoint]
