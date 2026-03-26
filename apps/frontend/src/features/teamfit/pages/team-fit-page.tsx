import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Input, ShellCard, StatusPill } from "@/common/components";
import { cn } from "@/lib/utils";

import { ChipGroup } from "../components/chip-group";
import { TeamFitHowItWorksButton } from "../components/how-it-works-button";
import { TeamFitRecommendationCard } from "../components/recommendation-card";
import { TeamFitScatterMap } from "../components/scatter-map";
import { SdgCardGroup } from "../components/sdg-card-group";
import { fetchTeamFitProfile, fetchTeamFitRecommendations, saveTeamFitProfile } from "../api";
import type {
  TeamFitLoaderData,
  TeamFitMapPoint,
  TeamFitMbtiAxisValues,
  TeamFitProfile,
  TeamFitRecommendation,
  TeamFitRecommendationsResponse,
  TeamFitUpsertRequest
} from "../types";

const INTEREST_OPTIONS = [
  "product_building",
  "ai_tools",
  "education",
  "community",
  "design",
  "research"
] as const;

const PROBLEM_OPTIONS = [
  "find_teammates",
  "ship_fast",
  "clarify_scope",
  "validate_users",
  "keep_momentum",
  "own_operations"
] as const;

const DOMAIN_OPTIONS = [
  "team_building",
  "education",
  "accessibility",
  "mental_health",
  "productivity",
  "climate",
  "community",
  "inequality",
  "creator_tools"
] as const;

const ROLE_OPTIONS = [
  "founder_pm",
  "backend_ai_infra",
  "frontend_ux_product",
  "fullstack_builder",
  "data_ai_research",
  "pm_operator",
  "design",
] as const;

const STACK_OPTIONS = [
  "typescript",
  "react",
  "python",
  "fastapi",
  "postgresql",
  "supabase",
  "docker",
  "aws",
  "figma",
  "sql",
  "notion",
  "analytics"
] as const;

const STYLE_OPTIONS = [
  "async",
  "clear_ownership",
  "fast_iteration",
  "documentation",
  "user_interviews",
  "research_first",
  "structured_planning"
] as const;

const PACE_OPTIONS = [
  "steady_daily",
  "weeknights_and_weekends",
  "sprint_mode",
  "steady_deep_work"
] as const;

const SDG_CARD_OPTIONS = [
  { value: "no_poverty", goal: "01", color: "#E5243B" },
  { value: "zero_hunger", goal: "02", color: "#DDA63A" },
  { value: "good_health_well_being", goal: "03", color: "#4C9F38" },
  { value: "quality_education", goal: "04", color: "#C5192D" },
  { value: "gender_equality", goal: "05", color: "#FF3A21" },
  { value: "clean_water_sanitation", goal: "06", color: "#26BDE2" },
  { value: "affordable_clean_energy", goal: "07", color: "#FCC30B" },
  { value: "decent_work_economic_growth", goal: "08", color: "#A21942" },
  { value: "industry_innovation_infrastructure", goal: "09", color: "#FD6925" },
  { value: "reduced_inequalities", goal: "10", color: "#DD1367" },
  { value: "sustainable_cities_communities", goal: "11", color: "#FD9D24" },
  { value: "responsible_consumption_production", goal: "12", color: "#BF8B2E" },
  { value: "climate_action", goal: "13", color: "#3F7E44" },
  { value: "life_below_water", goal: "14", color: "#0A97D9" },
  { value: "life_on_land", goal: "15", color: "#56C02B" },
  { value: "peace_justice_strong_institutions", goal: "16", color: "#00689D" },
  { value: "partnerships_for_the_goals", goal: "17", color: "#19486A" }
] as const;

const MBTI_AXES = [
  {
    id: "mind",
    left: "I",
    right: "E",
    leftLabelKey: "introverted",
    rightLabelKey: "extraverted",
    gradient: "linear-gradient(to right, #3730a3, #7c3aed, #e9d5ff, #fcd34d, #d97706)",
    leftColor: "#3730a3",
    rightColor: "#d97706"
  },
  {
    id: "energy",
    left: "N",
    right: "S",
    leftLabelKey: "intuitive",
    rightLabelKey: "observant",
    gradient: "linear-gradient(to right, #0e7490, #22d3ee, #a5f3fc, #6ee7b7, #059669)",
    leftColor: "#0e7490",
    rightColor: "#059669"
  },
  {
    id: "nature",
    left: "F",
    right: "T",
    leftLabelKey: "feeling",
    rightLabelKey: "thinking",
    gradient: "linear-gradient(to right, #be185d, #f472b6, #fbcfe8, #bae6fd, #0369a1)",
    leftColor: "#be185d",
    rightColor: "#0369a1"
  },
  {
    id: "tactics",
    left: "J",
    right: "P",
    leftLabelKey: "judging",
    rightLabelKey: "prospecting",
    gradient: "linear-gradient(to right, #b45309, #fbbf24, #fef9c3, #bbf7d0, #15803d)",
    leftColor: "#b45309",
    rightColor: "#15803d"
  },
  {
    id: "identity",
    left: "T",
    right: "A",
    leftLabelKey: "turbulent",
    rightLabelKey: "assertive",
    gradient: "linear-gradient(to right, #b91c1c, #f87171, #fecdd3, #ddd6fe, #6d28d9)",
    leftColor: "#b91c1c",
    rightColor: "#6d28d9"
  }
] as const;

type MbtiAxisId = (typeof MBTI_AXES)[number]["id"];

type MbtiAxisValues = TeamFitMbtiAxisValues;

type TeamFitDraft = {
  interests: string[];
  problem_focus: string[];
  domains: string[];
  preferred_role: string;
  tech_stack: string[];
  working_style: string;
  commitment_pace: string;
  mbti: string;
  impact_tags: string[];
  one_liner: string;
};

type RecommendationGroup = {
  key: "similar" | "complementary" | "unexpected";
  items: TeamFitRecommendation[];
};

const EMPTY_DRAFT: TeamFitDraft = {
  interests: [],
  problem_focus: [],
  domains: [],
  preferred_role: "",
  tech_stack: [],
  working_style: "",
  commitment_pace: "",
  mbti: "",
  impact_tags: [],
  one_liner: ""
};

const EMPTY_MBTI_AXIS_VALUES: MbtiAxisValues = {
  mind: 50,
  energy: 50,
  nature: 50,
  tactics: 50,
  identity: 50
};

const DEFAULT_MBTI_LEFT_PERCENT = 74;
const DEFAULT_MBTI_RIGHT_PERCENT = 26;

const LEGACY_IMPACT_TAG_ALIASES: Record<string, string> = {
  education: "quality_education",
  accessibility: "reduced_inequalities",
  mental_health: "good_health_well_being",
  productivity: "decent_work_economic_growth",
  climate: "climate_action",
  community: "sustainable_cities_communities",
  inequality: "reduced_inequalities"
};

function makeChoices(
  t: (key: string, options?: { defaultValue?: string }) => string,
  section: string,
  values: readonly string[]
) {
  return values.map((value) => ({
    value,
    label: t(`teamfit.options.${section}.${value}`, { defaultValue: value })
  }));
}

function hydrateDraft(profile: TeamFitProfile | null): TeamFitDraft {
  if (!profile) {
    return { ...EMPTY_DRAFT };
  }

  const normalizedImpactTags = Array.from(
    new Set(profile.impact_tags.map((tag) => LEGACY_IMPACT_TAG_ALIASES[tag] ?? tag))
  );

  return {
    interests: [...profile.interests],
    problem_focus: [...profile.problem_focus],
    domains: [...profile.domains],
    preferred_role: profile.preferred_role ?? "",
    tech_stack: [...profile.tech_stack],
    working_style: profile.working_style ?? "",
    commitment_pace: profile.commitment_pace ?? "",
    mbti: profile.mbti ?? "",
    impact_tags: normalizedImpactTags,
    one_liner: profile.one_liner ?? ""
  };
}

function normalizeStoredMbtiAxisValues(
  values: TeamFitMbtiAxisValues | null | undefined
): MbtiAxisValues | null {
  if (!values) {
    return null;
  }

  let hasStoredValue = false;
  const normalized = { ...EMPTY_MBTI_AXIS_VALUES };

  for (const axis of MBTI_AXES) {
    const rawValue = values[axis.id];
    if (rawValue === undefined || rawValue === null || Number.isNaN(Number(rawValue))) {
      continue;
    }
    hasStoredValue = true;
    normalized[axis.id] = Math.max(0, Math.min(100, Math.round(Number(rawValue))));
  }

  return hasStoredValue ? normalized : null;
}

function resolveMbtiAxisValues(
  mbti: string | null | undefined,
  values: TeamFitMbtiAxisValues | null | undefined
) {
  return normalizeStoredMbtiAxisValues(values) ?? parseMbtiAxisValues(mbti);
}

function countSelectedMbtiAxes(axisValues: MbtiAxisValues) {
  return MBTI_AXES.filter((axis) => Boolean(getMbtiAxisLetter(axis, axisValues[axis.id]))).length;
}

function hasAnyMbtiSelection(axisValues: MbtiAxisValues) {
  return countSelectedMbtiAxes(axisValues) > 0;
}

function isMbtiSelectionComplete(axisValues: MbtiAxisValues) {
  return countSelectedMbtiAxes(axisValues) === MBTI_AXES.length;
}

function toPayload(draft: TeamFitDraft, mbtiAxisValues: MbtiAxisValues): TeamFitUpsertRequest {
  return {
    completion_stage:
      draft.mbti || draft.impact_tags.length > 0 || draft.one_liner ? "step2" : "step1",
    interests: draft.interests,
    problem_focus: draft.problem_focus,
    domains: draft.domains,
    preferred_role: draft.preferred_role,
    tech_stack: draft.tech_stack,
    working_style: draft.working_style,
    commitment_pace: draft.commitment_pace,
    mbti: draft.mbti || null,
    mbti_axis_values: isMbtiSelectionComplete(mbtiAxisValues) ? mbtiAxisValues : null,
    impact_tags: draft.impact_tags,
    one_liner: draft.one_liner || null
  };
}

function getDraftSyncKey(draft: TeamFitDraft, mbtiAxisValues: MbtiAxisValues) {
  return JSON.stringify(toPayload(draft, mbtiAxisValues));
}

function getMbtiAxisLetter(
  axis: (typeof MBTI_AXES)[number],
  leftPercent: number
) {
  if (leftPercent > 50) {
    return axis.left;
  }

  if (leftPercent < 50) {
    return axis.right;
  }

  return "";
}

function parseMbtiAxisValues(value: string | null | undefined): MbtiAxisValues {
  if (!value) {
    return { ...EMPTY_MBTI_AXIS_VALUES };
  }

  const compact = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!compact) {
    return { ...EMPTY_MBTI_AXIS_VALUES };
  }

  const typeLetters = compact.slice(0, 4);
  const identityLetter = compact.length >= 5 ? compact[4] : "";

  return {
    mind:
      typeLetters[0] === "I"
        ? DEFAULT_MBTI_LEFT_PERCENT
        : typeLetters[0] === "E"
          ? DEFAULT_MBTI_RIGHT_PERCENT
          : 50,
    energy:
      typeLetters[1] === "N"
        ? DEFAULT_MBTI_LEFT_PERCENT
        : typeLetters[1] === "S"
          ? DEFAULT_MBTI_RIGHT_PERCENT
          : 50,
    nature:
      typeLetters[2] === "F"
        ? DEFAULT_MBTI_LEFT_PERCENT
        : typeLetters[2] === "T"
          ? DEFAULT_MBTI_RIGHT_PERCENT
          : 50,
    tactics:
      typeLetters[3] === "J"
        ? DEFAULT_MBTI_LEFT_PERCENT
        : typeLetters[3] === "P"
          ? DEFAULT_MBTI_RIGHT_PERCENT
          : 50,
    identity:
      identityLetter === "T"
        ? DEFAULT_MBTI_LEFT_PERCENT
        : identityLetter === "A"
          ? DEFAULT_MBTI_RIGHT_PERCENT
          : 50
  };
}

function formatMbtiValue(axisValues: MbtiAxisValues) {
  const letters = MBTI_AXES.map((axis) => getMbtiAxisLetter(axis, axisValues[axis.id]));
  if (letters.some((letter) => !letter)) {
    return "";
  }
  return `${letters.slice(0, 4).join("")}-${letters[4]}`;
}

function formatMbtiPreview(axisValues: MbtiAxisValues) {
  const letters = MBTI_AXES.map((axis) => getMbtiAxisLetter(axis, axisValues[axis.id])).filter(Boolean);
  if (letters.length === 0) {
    return "";
  }
  if (letters.length <= 4) {
    return letters.join("");
  }
  return `${letters.slice(0, 4).join("")}-${letters[4]}`;
}

function isStepOneComplete(draft: TeamFitDraft) {
  return (
    draft.interests.length > 0 &&
    draft.problem_focus.length > 0 &&
    draft.domains.length > 0 &&
    Boolean(draft.preferred_role) &&
    draft.tech_stack.length > 0 &&
    Boolean(draft.working_style) &&
    Boolean(draft.commitment_pace)
  );
}

const STEP_ONE_REQUIRED_FIELDS_TOTAL = 7;

function countStepOneFieldsFilled(draft: TeamFitDraft) {
  return [
    draft.interests.length > 0,
    draft.problem_focus.length > 0,
    draft.domains.length > 0,
    Boolean(draft.preferred_role),
    draft.tech_stack.length > 0,
    Boolean(draft.working_style),
    Boolean(draft.commitment_pace)
  ].filter(Boolean).length;
}

function validateOptionalSignals(
  draft: TeamFitDraft,
  mbtiAxisValues: MbtiAxisValues,
  t: (key: string, options?: Record<string, string | number>) => string
) {
  const selectedMbtiAxisCount = countSelectedMbtiAxes(mbtiAxisValues);
  if (selectedMbtiAxisCount > 0 && selectedMbtiAxisCount < MBTI_AXES.length) {
    return t("teamfit.errors.mbtiIncomplete", { count: MBTI_AXES.length });
  }
  if (draft.impact_tags.length > 0 && draft.impact_tags.length !== 4) {
    return t("teamfit.errors.impactTagsRequireFour", { count: 4 });
  }
  return null;
}

type HeroStatusCardTone = "emerald" | "sky" | "slate" | "violet" | "amber" | "rose";

const HERO_STATUS_CARD_STYLES: Record<
  HeroStatusCardTone,
  {
    card: string;
    iconWrap: string;
    icon: string;
    value: string;
  }
> = {
  emerald: {
    card: "border-emerald-200/80 bg-emerald-50/92",
    iconWrap: "border-emerald-200/80 bg-white/85",
    icon: "text-emerald-500",
    value: "text-emerald-950/75"
  },
  sky: {
    card: "border-sky-200/80 bg-sky-50/92",
    iconWrap: "border-sky-200/80 bg-white/85",
    icon: "text-sky-500",
    value: "text-sky-950/75"
  },
  slate: {
    card: "border-slate-200/80 bg-white/92",
    iconWrap: "border-slate-200/80 bg-slate-50/95",
    icon: "text-slate-500",
    value: "text-slate-800"
  },
  violet: {
    card: "border-violet-200/80 bg-violet-50/92",
    iconWrap: "border-violet-200/80 bg-white/85",
    icon: "text-violet-500",
    value: "text-violet-950/72"
  },
  amber: {
    card: "border-amber-200/80 bg-amber-50/92",
    iconWrap: "border-amber-200/80 bg-white/85",
    icon: "text-amber-500",
    value: "text-amber-950/72"
  },
  rose: {
    card: "border-rose-200/80 bg-rose-50/92",
    iconWrap: "border-rose-200/80 bg-white/85",
    icon: "text-rose-500",
    value: "text-rose-950/72"
  }
};

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m5 7 7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <rect
        x="4.25"
        y="4.25"
        width="15.5"
        height="15.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 16V8.4l5.6 7.2V8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VerificationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M12 3.5 18.5 6v5.2c0 4.08-2.58 7.3-6.5 9.3-3.92-2-6.5-5.22-6.5-9.3V6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m9.2 12.1 1.86 1.86 3.74-4.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function getHeroStatusCardTone(status: string, isGuest: boolean): HeroStatusCardTone {
  if (isGuest) {
    return "sky";
  }

  if (status === "approved") {
    return "emerald";
  }
  if (status === "pending") {
    return "amber";
  }
  if (status === "rejected") {
    return "rose";
  }

  return "sky";
}

function HeroStatusCard({
  icon,
  label,
  value,
  tone = "slate",
  href,
  title
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: HeroStatusCardTone;
  href?: string;
  title?: string;
}) {
  const styles = HERO_STATUS_CARD_STYLES[tone];
  const baseClassName = cn(
    "flex min-h-[92px] items-start gap-3 rounded-[24px] border px-4 py-3.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition",
    styles.card,
    href && "hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]"
  );

  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
          styles.iconWrap,
          styles.icon
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <span className={cn("mt-1 block break-words text-[13px] font-medium leading-5", styles.value)}>
          {value}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClassName}
        title={title ?? value}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={baseClassName} title={title ?? value}>
      {content}
    </div>
  );
}

function HeroSummaryPill({
  label,
  value,
  tone = "slate"
}: {
  label: string;
  value: string;
  tone?: HeroStatusCardTone;
}) {
  const styles = HERO_STATUS_CARD_STYLES[tone];

  return (
    <div
      className={cn(
        "inline-flex min-w-[150px] flex-col gap-1 rounded-2xl border px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
        styles.card
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </span>
      <span className="text-sm font-semibold leading-5 text-current">{value}</span>
    </div>
  );
}

function TeamFitSectionCard({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <ShellCard className="space-y-4">
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-xl font-semibold tracking-[-0.03em]">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </ShellCard>
  );
}

export function TeamFitPage() {
  const { t } = useTranslation("common");
  const { sessionUser } = useLoaderData() as TeamFitLoaderData;
  const [draft, setDraft] = useState<TeamFitDraft>(EMPTY_DRAFT);
  const [mbtiAxisValues, setMbtiAxisValues] = useState<MbtiAxisValues>(EMPTY_MBTI_AXIS_VALUES);
  const [recommendations, setRecommendations] = useState<TeamFitRecommendationsResponse>({
    requires_profile: false,
    requires_approval: false,
    similar: [],
    complementary: [],
    unexpected: [],
    map_points: [],
    active_profile_count: 0
  });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const lastSyncedDraftKeyRef = useRef<string | null>(null);
  const isGuest = !sessionUser;

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setError(null);

      if (!sessionUser) {
        setDraft({ ...EMPTY_DRAFT });
        setMbtiAxisValues({ ...EMPTY_MBTI_AXIS_VALUES });
        setRecommendations({
          requires_profile: false,
          requires_approval: false,
          similar: [],
          complementary: [],
          unexpected: [],
          map_points: [],
          active_profile_count: 0
        });
        lastSyncedDraftKeyRef.current = null;
        setStep(1);
        return;
      }

      try {
        const [loadedProfile, loadedRecommendations] = await Promise.all([
          fetchTeamFitProfile(),
          fetchTeamFitRecommendations()
        ]);

        if (!active) {
          return;
        }

        const hydratedDraft = hydrateDraft(loadedProfile);
        const resolvedMbtiAxisValues = resolveMbtiAxisValues(
          hydratedDraft.mbti,
          loadedProfile?.mbti_axis_values
        );

        setDraft(hydratedDraft);
        setMbtiAxisValues(resolvedMbtiAxisValues);
        setRecommendations(loadedRecommendations);
        lastSyncedDraftKeyRef.current = loadedProfile
          ? getDraftSyncKey(hydratedDraft, resolvedMbtiAxisValues)
          : null;
        setStep(
          loadedProfile?.completion_stage === "step2" ||
            loadedProfile?.impact_tags.length
            ? 2
            : 1
        );
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : t("teamfit.errors.loadFailed"));
      }
    }

    void loadPage();

    return () => {
      active = false;
    };
  }, [sessionUser, t]);

  async function refreshRecommendations() {
    const loadedRecommendations = await fetchTeamFitRecommendations();
    setRecommendations(loadedRecommendations);
  }

  function updateDraft<K extends keyof TeamFitDraft>(key: K, value: TeamFitDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function updateMbtiAxis(axisId: MbtiAxisId, nextLeftPercent: number) {
    setMbtiAxisValues((current) => {
      const resolvedPercent = Math.max(0, Math.min(100, Math.round(nextLeftPercent)));
      const nextValues = { ...current, [axisId]: resolvedPercent };
      updateDraft("mbti", formatMbtiValue(nextValues));
      return nextValues;
    });
  }

  function resetMbtiSelection() {
    setMbtiAxisValues({ ...EMPTY_MBTI_AXIS_VALUES });
    updateDraft("mbti", "");
  }

  async function persistProfile(options?: { advanceStep?: boolean }) {
    if (!isStepOneComplete(draft)) {
      setError(t("teamfit.errors.step1Incomplete"));
      return false;
    }

    const optionalSignalsError = validateOptionalSignals(draft, mbtiAxisValues, t);
    if (optionalSignalsError) {
      setError(optionalSignalsError);
      return false;
    }

    if (!sessionUser) {
      if (options?.advanceStep) {
        setStep(2);
        return true;
      }

      setError(t("teamfit.errors.loginRequired"));
      return false;
    }

    const draftSyncKey = getDraftSyncKey(draft, mbtiAxisValues);
    if (lastSyncedDraftKeyRef.current === draftSyncKey) {
      await refreshRecommendations();
      if (options?.advanceStep) {
        setStep(2);
      }
      return true;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await saveTeamFitProfile(toPayload(draft, mbtiAxisValues));
      const hydratedDraft = hydrateDraft(saved);
      const resolvedMbtiAxisValues = resolveMbtiAxisValues(
        hydratedDraft.mbti,
        saved.mbti_axis_values
      );

      setDraft(hydratedDraft);
      if (JSON.stringify(resolvedMbtiAxisValues) !== JSON.stringify(mbtiAxisValues)) {
        setMbtiAxisValues(resolvedMbtiAxisValues);
      }
      lastSyncedDraftKeyRef.current = getDraftSyncKey(hydratedDraft, resolvedMbtiAxisValues);
      if (options?.advanceStep) {
        setStep(2);
      }
      await refreshRecommendations();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("teamfit.errors.saveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(options?: { advanceStep?: boolean }) {
    await persistProfile(options);
  }

  const currentStatus = sessionUser?.applicant_status ?? "none";
  const recommendationAccessLocked = Boolean(recommendations.requires_approval);
  const recommendationGroups: RecommendationGroup[] = [
    { key: "similar", items: recommendations.similar ?? [] },
    { key: "complementary", items: recommendations.complementary ?? [] },
    { key: "unexpected", items: recommendations.unexpected ?? [] }
  ];
  const mapPoints: TeamFitMapPoint[] = recommendations.map_points ?? [];
  const showMap = !recommendationAccessLocked && mapPoints.length >= 8;
  const mbtiPreview = formatMbtiPreview(mbtiAxisValues);
  const isFormLocked = saving;
  const accountCardValue = sessionUser?.email ?? t("teamfit.hero.guestAccount");
  const githubLinked = Boolean(sessionUser?.github_address);
  const notionLinked = Boolean(sessionUser?.notion_url);
  const stepOneFieldsFilled = countStepOneFieldsFilled(draft);
  const allStepOneFieldsFilled = stepOneFieldsFilled === STEP_ONE_REQUIRED_FIELDS_TOTAL;

  return (
    <div className="space-y-6">
      <ShellCard className="overflow-hidden border-sky-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.93))]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-5">
            <div className="space-y-3">
              <StatusPill label={t("teamfit.hero.pill")} tone="success" />
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                {t("teamfit.hero.title")}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {t("teamfit.hero.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <HeroSummaryPill
                label={t("teamfit.hero.step")}
                value={t("teamfit.hero.stepValue", { step })}
                tone="violet"
              />
              <HeroSummaryPill
                label={t("teamfit.hero.requiredProgress")}
                value={t("teamfit.hero.requiredProgressValue", {
                  filled: stepOneFieldsFilled,
                  total: STEP_ONE_REQUIRED_FIELDS_TOTAL
                })}
                tone={allStepOneFieldsFilled ? "emerald" : "sky"}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-sky-100/90 bg-white/84 p-4 shadow-[0_24px_60px_rgba(14,165,233,0.08)] backdrop-blur-sm">
            <div className="mb-4 flex justify-start sm:justify-end">
              <TeamFitHowItWorksButton />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:auto-rows-fr">
              <HeroStatusCard
                icon={<VerificationIcon />}
                label={t("teamfit.hero.statusLabel")}
                value={
                  isGuest
                    ? t("teamfit.status.guest")
                    : t(`teamfit.status.${currentStatus}`, { defaultValue: currentStatus })
                }
                tone={getHeroStatusCardTone(currentStatus, isGuest)}
              />
              <HeroStatusCard
                icon={<MailIcon />}
                label={t("teamfit.hero.accountLabel")}
                value={accountCardValue}
                tone="sky"
                title={accountCardValue}
              />
              <HeroStatusCard
                icon={<GitHubIcon />}
                label={t("teamfit.hero.githubLabel")}
                value={githubLinked ? t("teamfit.hero.githubLinked") : t("teamfit.hero.githubMissing")}
                tone={githubLinked ? "slate" : "sky"}
                href={sessionUser?.github_address ?? undefined}
                title={sessionUser?.github_address ?? t("teamfit.hero.githubMissing")}
              />
              <HeroStatusCard
                icon={<NotionIcon />}
                label={t("teamfit.hero.notionLabel")}
                value={notionLinked ? t("teamfit.hero.notionLinked") : t("teamfit.hero.notionMissing")}
                tone={notionLinked ? "violet" : "sky"}
                href={sessionUser?.notion_url ?? undefined}
                title={sessionUser?.notion_url ?? t("teamfit.hero.notionMissing")}
              />
            </div>
          </div>
        </div>
      </ShellCard>

      {error ? (
        <ShellCard className="border-amber-200 bg-amber-50/80">
          <StatusPill label={t("teamfit.errors.title")} tone="warn" />
          <p className="mt-3 text-sm leading-6 text-amber-950">{error}</p>
        </ShellCard>
      ) : null}

      <ShellCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("teamfit.form.pill")}
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.03em]">
              {t("teamfit.form.title")}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("teamfit.form.description")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={step === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setStep(1)}
              disabled={isFormLocked}
            >
              {t("teamfit.form.stepOneLabel")}
            </Button>
            <Button
              type="button"
              variant={step === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setStep(2)}
              disabled={isFormLocked}
            >
              {t("teamfit.form.stepTwoLabel")}
            </Button>
          </div>
        </div>

        {isGuest ? (
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/85 px-4 py-4">
            <p className="text-sm font-medium text-sky-950">{t("teamfit.form.guestPreviewTitle")}</p>
            <p className="mt-1 text-sm leading-6 text-sky-900/85">
              {t("teamfit.form.guestPreviewBody")}
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <ChipGroup
              label={t("teamfit.fields.interests")}
              hint={t("teamfit.fields.interestsHint")}
              items={makeChoices(t, "interests", INTEREST_OPTIONS)}
              mode="multi"
              value={draft.interests}
              onChange={(next) => updateDraft("interests", next as string[])}
              required
              disabled={isFormLocked}
            />
            <ChipGroup
              label={t("teamfit.fields.problemFocus")}
              hint={t("teamfit.fields.problemFocusHint")}
              items={makeChoices(t, "problems", PROBLEM_OPTIONS)}
              mode="multi"
              value={draft.problem_focus}
              onChange={(next) => updateDraft("problem_focus", next as string[])}
              required
              disabled={isFormLocked}
            />
            <ChipGroup
              label={t("teamfit.fields.domains")}
              hint={t("teamfit.fields.domainsHint")}
              items={makeChoices(t, "domains", DOMAIN_OPTIONS)}
              mode="multi"
              value={draft.domains}
              onChange={(next) => updateDraft("domains", next as string[])}
              required
              disabled={isFormLocked}
            />
            <ChipGroup
              label={t("teamfit.fields.preferredRole")}
              hint={t("teamfit.fields.preferredRoleHint")}
              items={makeChoices(t, "roles", ROLE_OPTIONS)}
              mode="single"
              value={draft.preferred_role}
              onChange={(next) => updateDraft("preferred_role", String(next))}
              required
              disabled={isFormLocked}
            />
            <ChipGroup
              label={t("teamfit.fields.techStack")}
              hint={t("teamfit.fields.techStackHint")}
              items={makeChoices(t, "stack", STACK_OPTIONS)}
              mode="multi"
              value={draft.tech_stack}
              onChange={(next) => updateDraft("tech_stack", next as string[])}
              required
              disabled={isFormLocked}
            />
            <ChipGroup
              label={t("teamfit.fields.workingStyle")}
              hint={t("teamfit.fields.workingStyleHint")}
              items={makeChoices(t, "style", STYLE_OPTIONS)}
              mode="single"
              value={draft.working_style}
              onChange={(next) => updateDraft("working_style", String(next))}
              required
              disabled={isFormLocked}
            />
            <ChipGroup
              label={t("teamfit.fields.commitmentPace")}
              hint={t("teamfit.fields.commitmentPaceHint")}
              items={makeChoices(t, "pace", PACE_OPTIONS)}
              mode="single"
              value={draft.commitment_pace}
              onChange={(next) => updateDraft("commitment_pace", String(next))}
              required
              disabled={isFormLocked}
            />

            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-xs leading-5 text-muted-foreground">
                {t("teamfit.form.stepOneNote")}
              </p>
              <Button
                type="button"
                onClick={() => void saveProfile({ advanceStep: true })}
                disabled={isFormLocked}
              >
                {saving
                  ? t("teamfit.actions.saving")
                  : isGuest
                    ? t("teamfit.actions.previewContinue")
                    : t("teamfit.actions.saveAndContinue")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">
                {t("teamfit.fields.oneLiner")}
              </label>
              <Input
                placeholder={t("teamfit.fields.oneLinerPlaceholder")}
                value={draft.one_liner}
                onChange={(event) => updateDraft("one_liner", event.target.value)}
                disabled={isFormLocked}
              />
            </div>

            <div className="rounded-[28px] border border-violet-200/80 bg-[linear-gradient(180deg,rgba(250,247,255,0.96),rgba(243,240,255,0.9))] px-4 py-5 shadow-sm shadow-violet-100/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-violet-950">{t("teamfit.fields.mbti")}</p>
                    <Badge
                      variant="outline"
                      className="border-violet-200 bg-white/90 text-violet-700"
                    >
                      {mbtiPreview || t("teamfit.mbti.placeholder")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-violet-200 bg-violet-50/80 text-violet-700"
                    >
                      {t("teamfit.mbti.selectionCount", {
                        count: countSelectedMbtiAxes(mbtiAxisValues),
                        total: MBTI_AXES.length
                      })}
                    </Badge>
                  </div>
                  <p className="text-xs leading-5 text-violet-900/75">
                    {t("teamfit.mbti.selectionRule", { count: MBTI_AXES.length })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://www.16personalities.com/free-personality-test"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-violet-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:border-violet-300 hover:text-violet-900"
                  >
                    {t("teamfit.mbti.testLink")}
                  </a>
                  {hasAnyMbtiSelection(mbtiAxisValues) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetMbtiSelection}
                      disabled={isFormLocked}
                    >
                      {t("teamfit.mbti.clear")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {MBTI_AXES.map((axis) => {
                  const leftPercent = mbtiAxisValues[axis.id];
                  const rightPercent = 100 - leftPercent;
                  const selected = getMbtiAxisLetter(axis, leftPercent);
                  const isLeftSelected = selected === axis.left;
                  const isRightSelected = selected === axis.right;
                  const activeColor = isLeftSelected
                    ? axis.leftColor
                    : isRightSelected
                      ? axis.rightColor
                      : "rgba(148,163,184,0.8)";

                  return (
                    <div
                      key={axis.id}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1.5fr)_minmax(0,1fr)] sm:items-center"
                    >
                      <button
                        type="button"
                        onClick={() => updateMbtiAxis(axis.id, DEFAULT_MBTI_LEFT_PERCENT)}
                        disabled={isFormLocked}
                        className={cn(
                          "flex items-center justify-end gap-2 rounded-2xl border px-3 py-2 text-right transition",
                          isLeftSelected
                            ? "border-transparent bg-white/85 shadow-sm"
                            : "border-transparent bg-transparent hover:bg-white/55"
                        )}
                      >
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-semibold" style={{ color: axis.leftColor }}>
                            {t(`teamfit.mbtiDimensions.${axis.leftLabelKey}`)}
                          </span>
                          <span
                            className="text-sm font-semibold tabular-nums"
                            style={{ color: axis.leftColor }}
                          >
                            {leftPercent}%
                          </span>
                        </div>
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            background: axis.leftColor,
                            opacity: isLeftSelected ? 1 : 0.3
                          }}
                        >
                          {axis.left}
                        </span>
                      </button>

                      <div className="relative h-10">
                        <div
                          className="absolute inset-x-0 top-1/2 h-3.5 -translate-y-1/2 rounded-full shadow-inner"
                          style={{ background: axis.gradient }}
                        />
                        <div className="absolute left-1/2 top-1/2 h-6 w-0.5 -translate-x-px -translate-y-1/2 rounded-full bg-white/65" />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={leftPercent}
                          onChange={(event) => updateMbtiAxis(axis.id, Number(event.target.value))}
                          disabled={isFormLocked}
                          aria-label={`${t(`teamfit.mbtiDimensions.${axis.leftLabelKey}`)} / ${t(
                            `teamfit.mbtiDimensions.${axis.rightLabelKey}`
                          )}`}
                          aria-valuetext={`${t(`teamfit.mbtiDimensions.${axis.leftLabelKey}`)} ${leftPercent}%, ${t(
                            `teamfit.mbtiDimensions.${axis.rightLabelKey}`
                          )} ${rightPercent}%`}
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
                        />
                        <div
                          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white shadow-md transition-[left,box-shadow] duration-200"
                          style={{
                            left: `${leftPercent}%`,
                            boxShadow: `0 0 0 2px ${activeColor}, 0 6px 18px rgba(15,23,42,0.16)`
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => updateMbtiAxis(axis.id, DEFAULT_MBTI_RIGHT_PERCENT)}
                        disabled={isFormLocked}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition",
                          isRightSelected
                            ? "border-transparent bg-white/85 shadow-sm"
                            : "border-transparent bg-transparent hover:bg-white/55"
                        )}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            background: axis.rightColor,
                            opacity: isRightSelected ? 1 : 0.3
                          }}
                        >
                          {axis.right}
                        </span>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-semibold" style={{ color: axis.rightColor }}>
                            {t(`teamfit.mbtiDimensions.${axis.rightLabelKey}`)}
                          </span>
                          <span
                            className="text-sm font-semibold tabular-nums"
                            style={{ color: axis.rightColor }}
                          >
                            {rightPercent}%
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <SdgCardGroup
              label={
                <span className="flex flex-wrap items-center gap-2">
                  <span>{t("teamfit.fields.impactTags")}</span>
                  <Badge
                    variant="outline"
                    className="border-pink-200 bg-pink-50 text-pink-700"
                  >
                    {t("teamfit.fields.impactTagsBadge")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700"
                  >
                    {t("teamfit.fields.impactTagsCount", {
                      count: draft.impact_tags.length,
                      max: 4
                    })}
                  </Badge>
                </span>
              }
              hint={`${t("teamfit.fields.impactTagsHint")} ${t("teamfit.fields.impactTagsExactRule", {
                count: 4
              })} ${t("teamfit.fields.impactTagsSource")}`}
              items={SDG_CARD_OPTIONS.map((item) => ({
                value: item.value,
                goal: item.goal,
                color: item.color,
                logoSrc: `/assets/sdgs/sdg-${item.goal}.jpg`,
                label: t(`teamfit.options.impact.${item.value}`, { defaultValue: item.value })
              }))}
              value={draft.impact_tags}
              onChange={(next) => updateDraft("impact_tags", next)}
              maxSelections={4}
              disabled={isFormLocked}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isFormLocked}>
                {t("teamfit.actions.back")}
              </Button>
              <Button
                type="button"
                onClick={() => void saveProfile()}
                disabled={isFormLocked}
              >
                {saving
                  ? t("teamfit.actions.saving")
                  : isGuest
                    ? t("teamfit.actions.loginToSave")
                    : t("teamfit.actions.saveProfile")}
              </Button>
            </div>
          </div>
        )}
      </ShellCard>

      {isGuest ? (
        <ShellCard className="border-sky-200 bg-sky-50/80">
          <p className="text-sm font-semibold text-sky-950">{t("teamfit.access.guestTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-sky-900/85">{t("teamfit.access.guestBody")}</p>
        </ShellCard>
      ) : null}

      {!isGuest && recommendationAccessLocked ? (
        <ShellCard className="border-rose-200 bg-rose-50/80">
          <p className="text-sm font-semibold text-rose-900">{t("teamfit.access.approvalTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-rose-800/90">
            {t("teamfit.access.approvalBody")}
          </p>
        </ShellCard>
      ) : null}

      <div className="space-y-6">
        {showMap ? <TeamFitScatterMap points={mapPoints} /> : null}

        {recommendationGroups.map((group) => {
          const title = t(`teamfit.bucket.${group.key}`);
          const description = t(`teamfit.bucketDescription.${group.key}`);
          const showGuestPreviewNotice = isGuest;
          const showVerificationNotice = !isGuest && recommendationAccessLocked;
          const emptyMessage = showGuestPreviewNotice
            ? t("teamfit.empty.guestPreview")
            : showVerificationNotice
              ? t("teamfit.empty.verificationRequired")
              : t("teamfit.empty.recommendations", { bucket: title });

          return (
            <TeamFitSectionCard
              key={group.key}
              title={title}
              description={description}
            >
              {group.items.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((recommendation, index) => (
                    <TeamFitRecommendationCard
                      key={`${group.key}-${recommendation.user_id}`}
                      recommendation={recommendation}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-3xl px-5 py-6",
                    showGuestPreviewNotice
                      ? "border border-sky-200 bg-sky-50/80 shadow-[0_10px_30px_rgba(14,165,233,0.08)]"
                      : showVerificationNotice
                      ? "border border-rose-200 bg-rose-50/80 shadow-[0_10px_30px_rgba(190,24,93,0.08)]"
                      : "border border-dashed border-border/70 bg-muted/30"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm leading-6",
                      showGuestPreviewNotice
                        ? "font-medium text-sky-800"
                        : showVerificationNotice
                          ? "font-medium text-rose-700"
                          : "text-muted-foreground"
                    )}
                  >
                    {emptyMessage}
                  </p>
                </div>
              )}
            </TeamFitSectionCard>
          );
        })}
      </div>
    </div>
  );
}
