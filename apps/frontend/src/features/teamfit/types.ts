import type { SessionUser } from "../auth/types";

export type TeamFitBucket = "similar" | "complementary" | "unexpected";

export type TeamFitCompletionStage = "step1" | "step2";

export type TeamFitMbtiAxisValues = {
  mind: number;
  energy: number;
  nature: number;
  tactics: number;
  identity: number;
};

export type TeamFitProfile = {
  user_id: number;
  status?: string | null;
  completion_stage?: TeamFitCompletionStage | null;
  interests: string[];
  problem_focus: string[];
  domains: string[];
  preferred_role: string;
  tech_stack: string[];
  working_style: string;
  commitment_pace: string;
  mbti?: string | null;
  mbti_axis_values?: TeamFitMbtiAxisValues | null;
  impact_tags: string[];
  one_liner?: string | null;
  updated_at?: string | null;
};

export type TeamFitProfileResponse = TeamFitProfile | { profile?: TeamFitProfile | null };

export type TeamFitUpsertRequest = {
  completion_stage?: TeamFitCompletionStage;
  interests: string[];
  problem_focus: string[];
  domains: string[];
  preferred_role: string;
  tech_stack: string[];
  working_style: string;
  commitment_pace: string;
  mbti?: string | null;
  mbti_axis_values?: TeamFitMbtiAxisValues | null;
  impact_tags: string[];
  one_liner?: string | null;
};

export type TeamFitRecommendation = {
  user_id: number;
  name?: string | null;
  gender?: "M" | "F" | null;
  email?: string | null;
  github_address?: string | null;
  notion_url?: string | null;
  is_verified: boolean;
  preferred_role?: string | null;
  tech_stack: string[];
  working_style: string;
  commitment_pace?: string | null;
  domains: string[];
  impact_tags: string[];
  mbti?: string | null;
  mbti_axis_values?: TeamFitMbtiAxisValues | null;
  one_liner?: string | null;
  reason_codes: string[];
  reason_chips: string[];
  bucket: TeamFitBucket;
  similarity_score: number;
  structured_fit_score: number;
};

export type TeamFitMapPoint = {
  user_id: number;
  bucket: TeamFitBucket;
  name: string;
  x: number;
  y: number;
  is_verified: boolean;
};

export type TeamFitRecommendationsResponse = {
  requires_profile?: boolean;
  requires_approval?: boolean;
  similar?: TeamFitRecommendation[];
  complementary?: TeamFitRecommendation[];
  unexpected?: TeamFitRecommendation[];
  map_points?: TeamFitMapPoint[];
  active_profile_count?: number;
};

export type TeamFitSession = SessionUser | null;

export type TeamFitLoaderData = {
  sessionUser: TeamFitSession;
};
