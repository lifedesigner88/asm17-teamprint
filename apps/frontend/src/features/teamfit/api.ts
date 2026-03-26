import i18n from "@/lib/i18n";

import type {
  TeamFitLoaderData,
  TeamFitProfile,
  TeamFitProfileResponse,
  TeamFitRecommendationsResponse,
  TeamFitUpsertRequest
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function teamFitError(fallbackKey: string, response?: Response) {
  const detail = response ? `${response.status}` : "";
  return new Error(`${i18n.t(fallbackKey)}${detail ? ` (${detail})` : ""}`);
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function normalizeProfileResponse(payload: TeamFitProfileResponse | null): TeamFitProfile | null {
  if (!payload) {
    return null;
  }

  if ("profile" in payload) {
    return payload.profile ?? null;
  }

  return payload as TeamFitProfile;
}

function normalizeRecommendationsResponse(payload: TeamFitRecommendationsResponse | null) {
  return {
    requires_profile: payload?.requires_profile ?? false,
    requires_approval: payload?.requires_approval ?? false,
    similar: payload?.similar ?? [],
    complementary: payload?.complementary ?? [],
    unexpected: payload?.unexpected ?? [],
    map_points: payload?.map_points ?? [],
    active_profile_count: payload?.active_profile_count ?? 0
  };
}

export async function teamFitLoader(): Promise<TeamFitLoaderData> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include"
  });

  if (response.status === 401) {
    return {
      sessionUser: null
    };
  }
  if (!response.ok) {
    throw teamFitError("teamfit.errors.sessionLoadFailed", response);
  }

  return {
    sessionUser: (await response.json()) as TeamFitLoaderData["sessionUser"]
  };
}

export async function fetchTeamFitProfile(): Promise<TeamFitProfile | null> {
  const response = await fetch(`${API_BASE_URL}/team-fit/me`, {
    credentials: "include"
  });

  if (response.status === 401) {
    return null;
  }
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw teamFitError("teamfit.errors.profileLoadFailed", response);
  }

  return normalizeProfileResponse((await readJson<TeamFitProfileResponse | null>(response)) ?? null);
}

export async function saveTeamFitProfile(
  payload: TeamFitUpsertRequest
): Promise<TeamFitProfile> {
  const response = await fetch(`${API_BASE_URL}/team-fit/me`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw teamFitError("teamfit.errors.profileSaveFailed", response);
  }

  const data = await readJson<TeamFitProfileResponse>(response);
  const profile = normalizeProfileResponse(data);

  if (!profile) {
    throw new Error(i18n.t("teamfit.errors.profileSaveFailed"));
  }

  return profile;
}

export async function fetchTeamFitRecommendations() {
  const response = await fetch(`${API_BASE_URL}/team-fit/recommendations`, {
    credentials: "include"
  });

  if (response.status === 401) {
    return normalizeRecommendationsResponse(null);
  }
  if (response.status === 404) {
    return normalizeRecommendationsResponse(null);
  }
  if (!response.ok) {
    throw teamFitError("teamfit.errors.recommendationsLoadFailed", response);
  }

  return normalizeRecommendationsResponse(
    (await readJson<TeamFitRecommendationsResponse | null>(response)) ?? null
  );
}
