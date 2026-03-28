import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Badge,
  Button,
  Field,
  Input,
  ShellCard,
  StatusPill,
  Textarea
} from "@/common/components";
import { cn } from "@/lib/utils";

import {
  fetchTeamFitMe,
  requestTeamFitFollowupQuestion,
  requestTeamFitInterviewQuestion,
  saveTeamFitFollowupAnswer,
  saveTeamFitProfile
} from "../api";
import { TeamFitHowItWorksButton } from "../components/how-it-works-button";
import { SdgCardGroup } from "../components/sdg-card-group";
import type {
  TeamFitExplorerMeResponse,
  TeamFitExplorerPhase,
  TeamFitExplorerProfile,
  TeamFitInterviewQuestionResponse,
  TeamFitInterviewTurnDraft,
  TeamFitLoaderData,
  TeamFitMbtiAxisValues
} from "../types";

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
type DialogMode = TeamFitExplorerPhase | null;

type TeamFitDraft = {
  problemStatement: string;
  sdgTags: string[];
  narrativeMarkdown: string;
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
const MBTI_TEST_URL = "https://www.16personalities.com/free-personality-test";
const PROBLEM_STATEMENT_MAX_LENGTH = 80;
const EMPTY_ME_RESPONSE: TeamFitExplorerMeResponse = {
  profile: null,
  active_profile_count: 0
};

function getMbtiAxisLetter(axis: (typeof MBTI_AXES)[number], leftPercent: number) {
  if (leftPercent > 50) {
    return axis.left;
  }

  if (leftPercent < 50) {
    return axis.right;
  }

  return "";
}

function countSelectedMbtiAxes(axisValues: MbtiAxisValues) {
  return MBTI_AXES.filter((axis) => Boolean(getMbtiAxisLetter(axis, axisValues[axis.id]))).length;
}

function isMbtiSelectionComplete(axisValues: MbtiAxisValues) {
  return countSelectedMbtiAxes(axisValues) === MBTI_AXES.length;
}

function formatMbtiValue(axisValues: MbtiAxisValues) {
  const letters = MBTI_AXES.map((axis) => getMbtiAxisLetter(axis, axisValues[axis.id]));
  if (letters.some((letter) => !letter)) {
    return "";
  }
  return `${letters.slice(0, 4).join("")}-${letters[4]}`;
}

function formatMbtiPreview(axisValues: MbtiAxisValues) {
  const letters = MBTI_AXES.map((axis) => getMbtiAxisLetter(axis, axisValues[axis.id])).filter(
    Boolean
  );
  if (letters.length === 0) {
    return "";
  }
  if (letters.length <= 4) {
    return letters.join("");
  }
  return `${letters.slice(0, 4).join("")}-${letters[4]}`;
}

function normalizeStoredMbtiAxisValues(values: TeamFitMbtiAxisValues | null | undefined): MbtiAxisValues {
  if (!values) {
    return { ...EMPTY_MBTI_AXIS_VALUES };
  }

  const normalized = { ...EMPTY_MBTI_AXIS_VALUES };
  for (const axis of MBTI_AXES) {
    const rawValue = values[axis.id];
    if (rawValue === undefined || rawValue === null || Number.isNaN(Number(rawValue))) {
      continue;
    }
    normalized[axis.id] = Math.max(0, Math.min(100, Math.round(Number(rawValue))));
  }

  return normalized;
}

function buildDraftFromProfile(profile: TeamFitExplorerProfile): TeamFitDraft {
  return {
    problemStatement: profile.problem_statement,
    sdgTags: [...profile.sdg_tags],
    narrativeMarkdown: profile.narrative_markdown
  };
}

function createEmptyDraft(narrativeMarkdown: string): TeamFitDraft {
  return {
    problemStatement: "",
    sdgTags: [],
    narrativeMarkdown
  };
}

function TeamFitInterviewDialog({
  answer,
  busy,
  mode,
  onAnswerChange,
  onClose,
  onSubmit,
  open,
  question,
  turnCount,
  t
}: {
  answer: string;
  busy: boolean;
  mode: DialogMode;
  onAnswerChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
  question: TeamFitInterviewQuestionResponse | null;
  turnCount: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const isInitial = mode === "initial";
  const progress = isInitial && question ? `${question.sequence_no}/3` : t("teamfit.interview.followupBadge");
  const submitLabel = isInitial
    ? turnCount >= 2
      ? t("teamfit.interview.finalCta")
      : t("teamfit.interview.nextCta")
    : t("teamfit.interview.followupCta");

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={t("teamfit.interview.close")}
        onClick={busy ? undefined : onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teamfit-interview-title"
        className="relative z-10 w-full max-w-2xl"
      >
        <ShellCard className="space-y-5 rounded-[30px] border-white/80 bg-white/97 p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                {progress}
              </Badge>
              <h3 id="teamfit-interview-title" className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {isInitial ? t("teamfit.interview.title") : t("teamfit.interview.followupTitle")}
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                {isInitial
                  ? t("teamfit.interview.description")
                  : t("teamfit.interview.followupDescription")}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
              {t("teamfit.interview.close")}
            </Button>
          </div>

          <div className="space-y-4 rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
                {t("teamfit.interview.aiLabel")}
              </Badge>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-7 text-slate-700 shadow-sm">
              {question?.question || t("teamfit.interview.loadingQuestion")}
            </div>
          </div>

          <Field label={t("teamfit.interview.answerLabel")} hint={t("teamfit.interview.answerHint")}>
            <Textarea
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder={t("teamfit.interview.answerPlaceholder")}
              autoGrow
              minRows={5}
              disabled={busy || !question}
              className="min-h-[140px] rounded-[24px]"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500">
              {isInitial ? t("teamfit.interview.initialRule") : t("teamfit.interview.followupRule")}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                {t("teamfit.interview.close")}
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={busy || !question || !answer.trim()}
                className="bg-slate-950 text-white hover:bg-slate-800"
              >
                {busy ? t("teamfit.interview.submitting") : submitLabel}
              </Button>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>,
    document.body
  );
}

function TeamFitStepLockDialog({
  onClose,
  open,
  t
}: {
  onClose: () => void;
  open: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={t("teamfit.stepLock.close")}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teamfit-step-lock-title"
        className="relative z-10 w-full max-w-md"
      >
        <ShellCard className="space-y-5 rounded-[30px] border-white/80 bg-white/97 p-5 shadow-2xl sm:p-6">
          <div className="space-y-3">
            <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">
              {t("teamfit.form.stepOneLabel")}
            </Badge>
            <h3 id="teamfit-step-lock-title" className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
              {t("teamfit.stepLock.title")}
            </h3>
            <p className="text-sm leading-6 text-slate-600">{t("teamfit.stepLock.body")}</p>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={onClose} className="bg-slate-950 text-white hover:bg-slate-800">
              {t("teamfit.stepLock.confirm")}
            </Button>
          </div>
        </ShellCard>
      </div>
    </div>,
    document.body
  );
}

export function TeamFitPage() {
  const { sessionUser } = useLoaderData() as TeamFitLoaderData;
  const { t } = useTranslation("common");
  const defaultNarrativeMarkdown = t("teamfit.fields.narrativeMarkdownPlaceholder");

  const [me, setMe] = useState<TeamFitExplorerMeResponse>(EMPTY_ME_RESPONSE);
  const [draft, setDraft] = useState<TeamFitDraft>(() => createEmptyDraft(defaultNarrativeMarkdown));
  const [mbtiAxisValues, setMbtiAxisValues] = useState<MbtiAxisValues>(EMPTY_MBTI_AXIS_VALUES);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogQuestion, setDialogQuestion] = useState<TeamFitInterviewQuestionResponse | null>(null);
  const [dialogTurns, setDialogTurns] = useState<TeamFitInterviewTurnDraft[]>([]);
  const [dialogAnswer, setDialogAnswer] = useState("");
  const [stepLockDialogOpen, setStepLockDialogOpen] = useState(false);

  const profile = me.profile;
  const isGuest = !sessionUser;
  const mbtiPreview = useMemo(() => formatMbtiPreview(mbtiAxisValues), [mbtiAxisValues]);
  const mbtiValue = useMemo(() => formatMbtiValue(mbtiAxisValues), [mbtiAxisValues]);
  const selectedMbtiCount = countSelectedMbtiAxes(mbtiAxisValues);
  const step1ProgressCount =
    (draft.problemStatement.trim() ? 1 : 0) +
    (selectedMbtiCount === MBTI_AXES.length ? 1 : 0) +
    (draft.sdgTags.length === 4 ? 1 : 0);
  const step1Complete =
    draft.problemStatement.trim().length > 0 &&
    isMbtiSelectionComplete(mbtiAxisValues) &&
    draft.sdgTags.length === 4;
  const step2Complete =
    draft.narrativeMarkdown.trim().length > 0 && draft.narrativeMarkdown.trim().length <= 800;

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!sessionUser) {
        setMe(EMPTY_ME_RESPONSE);
        setDraft(createEmptyDraft(defaultNarrativeMarkdown));
        setMbtiAxisValues(EMPTY_MBTI_AXIS_VALUES);
        setCurrentStep(1);
        return;
      }

      try {
        const response = await fetchTeamFitMe();
        if (!isMounted) {
          return;
        }

        setMe(response);
        if (response.profile) {
          setDraft(buildDraftFromProfile(response.profile));
          setMbtiAxisValues(normalizeStoredMbtiAxisValues(response.profile.mbti_axis_values));
          setCurrentStep(2);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : t("teamfit.errors.profileLoadFailed"));
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [defaultNarrativeMarkdown, sessionUser, t]);

  function updateMbtiAxis(axisId: MbtiAxisId, nextLeftPercent: number) {
    setMbtiAxisValues((current) => ({
      ...current,
      [axisId]: Math.max(0, Math.min(100, Math.round(nextLeftPercent)))
    }));
  }

  function resetDialogState() {
    setDialogOpen(false);
    setDialogMode(null);
    setDialogQuestion(null);
    setDialogTurns([]);
    setDialogAnswer("");
  }

  function handleStepTwoCardClick() {
    if (busy || currentStep === 2) {
      return;
    }

    if (!step1Complete) {
      setStepLockDialogOpen(true);
      return;
    }

    setError(null);
    setCurrentStep(2);
  }

  function syncSavedProfile(nextProfile: TeamFitExplorerProfile) {
    setMe((current) => ({
      profile: nextProfile,
      active_profile_count: current.profile ? current.active_profile_count : current.active_profile_count + 1
    }));
    setDraft(buildDraftFromProfile(nextProfile));
    setMbtiAxisValues(normalizeStoredMbtiAxisValues(nextProfile.mbti_axis_values));
    setCurrentStep(2);
  }

  async function beginInitialInterview() {
    if (isGuest) {
      setError(t("teamfit.errors.loginRequired"));
      return;
    }
    if (!step1Complete) {
      setError(t("teamfit.errors.step1Incomplete"));
      return;
    }
    if (!step2Complete) {
      setError(t("teamfit.errors.step2Incomplete"));
      return;
    }

    setError(null);
    setBusy(true);
    setDialogMode("initial");
    setDialogOpen(true);
    setDialogTurns([]);
    setDialogAnswer("");

    try {
      const question = await requestTeamFitInterviewQuestion({
        problem_statement: draft.problemStatement.trim(),
        mbti: mbtiValue,
        mbti_axis_values: mbtiAxisValues,
        sdg_tags: draft.sdgTags,
        narrative_markdown: draft.narrativeMarkdown.trim(),
        history: []
      });
      setDialogQuestion(question);
    } catch (requestError) {
      resetDialogState();
      setError(requestError instanceof Error ? requestError.message : t("teamfit.errors.interviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function beginFollowupInterview() {
    setError(null);
    setBusy(true);
    setDialogMode("followup");
    setDialogOpen(true);
    setDialogTurns([]);
    setDialogAnswer("");

    try {
      const question = await requestTeamFitFollowupQuestion();
      setDialogQuestion(question);
    } catch (requestError) {
      resetDialogState();
      setError(requestError instanceof Error ? requestError.message : t("teamfit.errors.interviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitDialogAnswer() {
    if (!dialogQuestion || !dialogMode) {
      return;
    }

    const trimmedAnswer = dialogAnswer.trim();
    if (!trimmedAnswer) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (dialogMode === "initial") {
        const nextTurns = [...dialogTurns, { question: dialogQuestion.question, answer: trimmedAnswer }];

        if (nextTurns.length < 3) {
          const nextQuestion = await requestTeamFitInterviewQuestion({
            problem_statement: draft.problemStatement.trim(),
            mbti: mbtiValue,
            mbti_axis_values: mbtiAxisValues,
            sdg_tags: draft.sdgTags,
            narrative_markdown: draft.narrativeMarkdown.trim(),
            history: nextTurns
          });
          setDialogTurns(nextTurns);
          setDialogQuestion(nextQuestion);
          setDialogAnswer("");
        } else {
          const savedProfile = await saveTeamFitProfile({
            problem_statement: draft.problemStatement.trim(),
            mbti: mbtiValue,
            mbti_axis_values: mbtiAxisValues,
            sdg_tags: draft.sdgTags,
            narrative_markdown: draft.narrativeMarkdown.trim(),
            history: nextTurns
          });
          syncSavedProfile(savedProfile);
          resetDialogState();
        }
        return;
      }

      const savedProfile = await saveTeamFitFollowupAnswer({
        question: dialogQuestion.question,
        answer: trimmedAnswer
      });
      syncSavedProfile(savedProfile);
      resetDialogState();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("teamfit.errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <ShellCard className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94),rgba(252,231,243,0.9))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
              {t("teamfit.landing.badge")}
            </Badge>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.7rem]">
              {t("teamfit.landing.title")}
            </h1>
          </div>
          <TeamFitHowItWorksButton className="shrink-0" />
        </div>
      </ShellCard>

      <ShellCard>
        <div className="space-y-4">
          <div>
            <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
              {t("teamfit.form.pill")}
            </Badge>
          </div>
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-600">
            <div className="font-semibold text-slate-900">
              {isGuest ? t("teamfit.access.guestTitle") : t("teamfit.access.memberTitle")}
            </div>
            <div className="mt-1">{isGuest ? t("teamfit.access.guestBody") : t("teamfit.access.memberBody")}</div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {profile ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">{t("teamfit.results.title")}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {t("teamfit.results.description")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void beginFollowupInterview()}
                    className="bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {t("teamfit.results.followupCta")}
                  </Button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("teamfit.results.problemLabel")}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{profile.problem_statement}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("teamfit.results.profileSignalsLabel")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="border-violet-200 bg-violet-50 text-violet-700" variant="outline">
                        {profile.mbti}
                      </Badge>
                      {profile.sdg_tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          variant="outline"
                        >
                          {t(`teamfit.options.impact.${tag}`, { defaultValue: tag })}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("teamfit.results.narrativeLabel")}
                  </div>
                  <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50/90 p-4 text-sm leading-7 text-slate-700">
                    {profile.narrative_markdown}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{t("teamfit.results.transcriptTitle")}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {t("teamfit.results.transcriptDescription")}
                    </p>
                  </div>
                  <Badge className="border-slate-200 bg-slate-50 text-slate-700" variant="outline">
                    {t("teamfit.results.turnCount", { count: profile.history.length })}
                  </Badge>
                </div>

                <div className="mt-5 space-y-4">
                  {profile.history.map((turn) => (
                    <div key={turn.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs",
                            turn.phase === "initial"
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                          variant="outline"
                        >
                          {turn.phase === "initial"
                            ? t("teamfit.results.initialTurn")
                            : t("teamfit.results.followupTurn")}
                        </Badge>
                        <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
                          {t("teamfit.results.turnIndex", { count: turn.sequence_no })}
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            {t("teamfit.interview.aiLabel")}
                          </div>
                          <p className="mt-1 text-sm leading-7 text-slate-700">{turn.question}</p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {t("teamfit.interview.youLabel")}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                            {turn.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-amber-200 bg-amber-50/85 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  {t("teamfit.comingSoon.label")}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{t("teamfit.comingSoon.title")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("teamfit.comingSoon.body")}</p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <h3 className="text-lg font-semibold text-slate-950">{t("teamfit.results.followupPanelTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("teamfit.results.followupPanelBody")}</p>
                <Button
                  type="button"
                  onClick={() => void beginFollowupInterview()}
                  className="mt-4 w-full bg-slate-950 text-white hover:bg-slate-800"
                >
                  {t("teamfit.results.followupCta")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                      {t("teamfit.form.stepOneLabel")}
                    </Badge>
                  </div>
                  <StatusPill
                    label={
                      step1Complete
                        ? t("teamfit.status.stepReady")
                        : t("teamfit.form.stepProgress", {
                            filled: step1ProgressCount,
                            total: 3
                          })
                    }
                    tone={step1Complete ? "success" : "default"}
                  />
                </div>

                <div className="mt-5 space-y-5">
                  <Field
                    label={<span className="font-semibold text-slate-950">{t("teamfit.fields.problemStatement")}</span>}
                  >
                    <Input
                      value={draft.problemStatement}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          problemStatement: event.target.value
                        }))
                      }
                      placeholder={t("teamfit.fields.problemStatementPlaceholder")}
                      maxLength={PROBLEM_STATEMENT_MAX_LENGTH}
                      disabled={busy}
                      className="rounded-[22px]"
                    />
                  </Field>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">{t("teamfit.fields.mbti")}</p>
                      <a
                        href={MBTI_TEST_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-violet-700 underline-offset-4 transition hover:text-violet-800 hover:underline"
                      >
                        {t("teamfit.mbti.testLink")}
                      </a>
                    </div>

                    <div className="rounded-[24px] border border-violet-200 bg-violet-50/70 p-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-violet-200 bg-white/90 text-violet-700">
                            {mbtiPreview || t("teamfit.mbti.placeholder")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-violet-200 bg-violet-50/80 text-violet-700"
                          >
                            {t("teamfit.mbti.selectionCount", {
                              count: selectedMbtiCount,
                              total: MBTI_AXES.length
                            })}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 space-y-4">
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
                                disabled={busy}
                                className={cn(
                                  "flex items-center justify-end gap-2 rounded-2xl border px-3 py-2 text-right transition",
                                  isLeftSelected
                                    ? "border-rose-200/80 bg-rose-50/80 shadow-[0_8px_18px_rgba(244,114,182,0.16)]"
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
                                  disabled={busy}
                                  aria-label={`${t(`teamfit.mbtiDimensions.${axis.leftLabelKey}`)} / ${t(
                                    `teamfit.mbtiDimensions.${axis.rightLabelKey}`
                                  )}`}
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
                                disabled={busy}
                                className={cn(
                                  "flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition",
                                  isRightSelected
                                    ? "border-rose-200/80 bg-rose-50/80 shadow-[0_8px_18px_rgba(244,114,182,0.16)]"
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
                  </div>

                  <SdgCardGroup
                    label={
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{t("teamfit.fields.sdgTags")}</span>
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          {t("teamfit.fields.sdgTagsCount", {
                            count: draft.sdgTags.length,
                            max: 4
                          })}
                        </Badge>
                      </span>
                    }
                    hint={t("teamfit.fields.sdgTagsHint")}
                    items={SDG_CARD_OPTIONS.map((item) => ({
                      value: item.value,
                      goal: item.goal,
                      color: item.color,
                      logoSrc: `/assets/sdgs/sdg-${item.goal}.jpg`,
                      label: t(`teamfit.options.impact.${item.value}`, { defaultValue: item.value })
                    }))}
                    value={draft.sdgTags}
                    onChange={(next) => setDraft((current) => ({ ...current, sdgTags: next }))}
                    selectionCount={4}
                    disabled={busy}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div
                className={cn(
                  "relative rounded-[28px] border border-slate-200 bg-white p-5",
                  currentStep !== 2 && !busy ? "cursor-pointer" : ""
                )}
              >
                {currentStep !== 2 ? (
                  <button
                    type="button"
                    onClick={handleStepTwoCardClick}
                    aria-label={step1Complete ? t("teamfit.form.stepTwoLabel") : t("teamfit.stepLock.body")}
                    className="absolute inset-0 z-10 rounded-[28px]"
                  />
                ) : null}
                <Badge
                  className="absolute right-5 top-5 border-slate-200 bg-slate-50 text-slate-700"
                  variant="outline"
                >
                  {t("teamfit.fields.narrativeCount", {
                    count: draft.narrativeMarkdown.trim().length,
                    max: 800
                  })}
                </Badge>

                <div className="flex flex-wrap items-center gap-3 pr-24">
                  <div>
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">
                      {t("teamfit.form.stepTwoLabel")}
                    </Badge>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">
                      {t("teamfit.form.stepTwoTitle")}
                    </h3>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <Textarea
                    value={draft.narrativeMarkdown}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        narrativeMarkdown: event.target.value.slice(0, 800)
                      }))
                    }
                    autoGrow
                    minRows={10}
                    disabled={busy || currentStep !== 2}
                    placeholder={t("teamfit.fields.narrativeMarkdownPlaceholder")}
                    aria-label={t("teamfit.form.stepTwoTitle")}
                    className="min-h-[220px] rounded-[24px]"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        narrativeMarkdown: defaultNarrativeMarkdown
                      }))
                    }
                    disabled={busy}
                  >
                    {t("teamfit.form.resetPrompt")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void beginInitialInterview()}
                    disabled={busy || currentStep !== 2}
                    className="bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {t("teamfit.form.startInterview")}
                  </Button>
                </div>
              </div>

              <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  {t("teamfit.comingSoon.label")}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{t("teamfit.comingSoon.title")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("teamfit.comingSoon.body")}</p>
              </div>
            </div>
          </div>
        )}
      </ShellCard>

      <TeamFitInterviewDialog
        answer={dialogAnswer}
        busy={busy}
        mode={dialogMode}
        onAnswerChange={setDialogAnswer}
        onClose={resetDialogState}
        onSubmit={() => void submitDialogAnswer()}
        open={dialogOpen}
        question={dialogQuestion}
        turnCount={dialogTurns.length}
        t={t}
      />
      <TeamFitStepLockDialog open={stepLockDialogOpen} onClose={() => setStepLockDialogOpen(false)} t={t} />
    </div>
  );
}
