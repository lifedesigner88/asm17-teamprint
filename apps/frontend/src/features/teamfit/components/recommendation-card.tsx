import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, StatusPill } from "@/common/components";
import { cn } from "@/lib/utils";

import type { TeamFitRecommendation } from "../types";

type RecommendationCardProps = {
  recommendation: TeamFitRecommendation;
  rank: number;
};

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

const SDG_VISUALS: Record<string, { goal: string; color: string }> = {
  no_poverty: { goal: "01", color: "#E5243B" },
  zero_hunger: { goal: "02", color: "#DDA63A" },
  good_health_well_being: { goal: "03", color: "#4C9F38" },
  quality_education: { goal: "04", color: "#C5192D" },
  gender_equality: { goal: "05", color: "#FF3A21" },
  clean_water_sanitation: { goal: "06", color: "#26BDE2" },
  affordable_clean_energy: { goal: "07", color: "#FCC30B" },
  decent_work_economic_growth: { goal: "08", color: "#A21942" },
  industry_innovation_infrastructure: { goal: "09", color: "#FD6925" },
  reduced_inequalities: { goal: "10", color: "#DD1367" },
  sustainable_cities_communities: { goal: "11", color: "#FD9D24" },
  responsible_consumption_production: { goal: "12", color: "#BF8B2E" },
  climate_action: { goal: "13", color: "#3F7E44" },
  life_below_water: { goal: "14", color: "#0A97D9" },
  life_on_land: { goal: "15", color: "#56C02B" },
  peace_justice_strong_institutions: { goal: "16", color: "#00689D" },
  partnerships_for_the_goals: { goal: "17", color: "#19486A" }
};

function translateOption(
  t: (key: string, options?: { defaultValue?: string }) => string,
  section: string,
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }
  return t(`teamfit.options.${section}.${value}`, { defaultValue: value });
}

function LinkChip({
  href,
  label,
  title,
  tone = "default"
}: {
  href?: string | null;
  label: string;
  title: string;
  tone?: "default" | "success" | "warn";
}) {
  const baseClass = cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition",
    tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
    tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
    tone === "default" && "border-border/70 bg-white/80 text-foreground/75"
  );

  if (!href) {
    return (
      <span aria-label={title} title={title} className={baseClass}>
        {label}
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={title} title={title} className={baseClass}>
      {label}
    </a>
  );
}

function DetailSection({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-[24px] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      {children}
    </section>
  );
}

function MbtiAxisBalance({
  axis,
  leftPercent,
  t
}: {
  axis: (typeof MBTI_AXES)[number];
  leftPercent: number;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) {
  const rightPercent = 100 - leftPercent;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-[11px] font-semibold" style={{ color: axis.leftColor }}>
          {`${axis.left} ${t(`teamfit.mbtiDimensions.${axis.leftLabelKey}`)}`}
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
          {`${leftPercent}% / ${rightPercent}%`}
        </span>
        <span className="min-w-0 text-right text-[11px] font-semibold" style={{ color: axis.rightColor }}>
          {`${axis.right} ${t(`teamfit.mbtiDimensions.${axis.rightLabelKey}`)}`}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full shadow-inner" style={{ background: axis.gradient }}>
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white shadow-sm"
          style={{
            left: `${leftPercent}%`,
            boxShadow: `0 0 0 2px ${leftPercent > 50 ? axis.leftColor : axis.rightColor}, 0 4px 14px rgba(15,23,42,0.12)`
          }}
        />
      </div>
    </div>
  );
}

function ImpactTagTile({
  value,
  label
}: {
  value: string;
  label: string;
}) {
  const visual = SDG_VISUALS[value];

  if (!visual) {
    return <Badge variant="outline">{label}</Badge>;
  }

  return (
    <div
      title={label}
      aria-label={label}
      className="aspect-square overflow-hidden rounded-[20px] border border-white/85 bg-white/88 p-1.5 shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
      style={{ backgroundColor: `${visual.color}14` }}
    >
      <img
        src={`/assets/sdgs/sdg-${visual.goal}.jpg`}
        alt={label}
        loading="lazy"
        className="h-full w-full rounded-[14px] object-cover"
      />
    </div>
  );
}

function recommendationToneClass(gender: TeamFitRecommendation["gender"]) {
  if (gender === "M") {
    return "border-sky-200/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(247,250,252,0.94))]";
  }

  if (gender === "F") {
    return "border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,247,247,0.94))]";
  }

  return "border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,250,248,0.92))]";
}

function formatReasonList(language: string, reasons: string[]) {
  const locale = language.startsWith("ko") ? "ko" : "en";

  try {
    return new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction"
    }).format(reasons);
  } catch {
    return reasons.join(locale === "ko" ? " 그리고 " : " and ");
  }
}

export function TeamFitRecommendationCard({ recommendation, rank }: RecommendationCardProps) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const status = recommendation.is_verified ? "approved" : "none";
  const reasons =
    recommendation.reason_codes?.map((code) =>
      t(`teamfit.reasonCodes.${code}`, {
        defaultValue:
          recommendation.reason_chips?.[recommendation.reason_codes.indexOf(code)] ?? code
      })
    ) ?? recommendation.reason_chips ?? [];
  const displayName = recommendation.name ?? t("teamfit.card.unnamed");
  const reasonSummary =
    reasons.length > 0
      ? t(`teamfit.card.reasonSentence.${recommendation.bucket}`, {
          name: displayName,
          reasons: formatReasonList(i18n.language, reasons.slice(0, 2))
        })
      : t(`teamfit.card.reasonSentenceFallback.${recommendation.bucket}`, {
          name: displayName
        });
  const statusTone = status === "approved" ? "success" : "default";
  const statusLabel =
    t(`teamfit.status.${status}`, { defaultValue: status }) || status || t("teamfit.status.none");
  const toneClass = recommendationToneClass(recommendation.gender);
  const translatedImpactTags = recommendation.impact_tags.map((tag) => ({
    value: tag,
    label: translateOption(t, "impact", tag)
  }));
  const hasSupplementaryProfileSignals =
    Boolean(recommendation.mbti && recommendation.mbti_axis_values) || translatedImpactTags.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative w-full rounded-[22px] border px-3.5 py-3.5 text-left shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
          "hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.12)]",
          toneClass
        )}
      >
        <span className="absolute right-3.5 top-3 text-lg font-medium tracking-[-0.03em] text-slate-400">
          {rank}
        </span>
        <div className="space-y-2 pr-7">
          <p className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">
            {displayName}
          </p>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("teamfit.card.reasonLabel")}
            </p>
            <p className="text-[13px] leading-5 text-foreground/85">{reasonSummary}</p>
          </div>
        </div>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <button
                type="button"
                aria-label={t("teamfit.card.close")}
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`teamfit-recommendation-${recommendation.user_id}`}
                className={cn(
                  "relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border shadow-[0_30px_80px_rgba(15,23,42,0.22)]",
                  toneClass
                )}
              >
                <div className="flex items-start justify-between gap-4 border-b border-white/40 px-5 py-5 sm:px-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("teamfit.card.detailsTitle")}
                    </p>
                    <h3
                      id={`teamfit-recommendation-${recommendation.user_id}`}
                      className="text-2xl font-semibold tracking-[-0.04em] text-foreground"
                    >
                      {displayName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={statusLabel} tone={statusTone} />
                      <Badge variant="outline">{t(`teamfit.bucket.${recommendation.bucket}`)}</Badge>
                      <Badge variant="outline">{t("teamfit.card.rankValue", { rank })}</Badge>
                    </div>
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    {t("teamfit.card.close")}
                  </Button>
                </div>

                <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                  <DetailSection label={t("teamfit.card.reasonLabel")} className="border-white/80 bg-white/86">
                    <p className="text-sm leading-6 text-foreground/85">{reasonSummary}</p>
                    {reasons.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {reasons.map((reason) => (
                          <Badge key={reason} variant="success">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </DetailSection>

                  <DetailSection label={t("teamfit.fields.oneLiner")} className="border-white/80 bg-white/84">
                    <p className="text-sm leading-6 text-foreground/85">
                      {recommendation.one_liner ?? t("teamfit.card.noIntro")}
                    </p>
                  </DetailSection>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <DetailSection label={t("teamfit.fields.preferredRole")}>
                      <Badge variant="default">
                        {recommendation.preferred_role
                          ? translateOption(t, "roles", recommendation.preferred_role)
                          : t("teamfit.card.roleFallback")}
                      </Badge>
                    </DetailSection>

                    <DetailSection label={t("teamfit.fields.workingStyle")}>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {recommendation.working_style
                            ? translateOption(t, "style", recommendation.working_style)
                            : t("teamfit.card.roleFallback")}
                        </Badge>
                      </div>
                    </DetailSection>

                    <DetailSection label={t("teamfit.fields.commitmentPace")}>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {recommendation.commitment_pace
                            ? translateOption(t, "pace", recommendation.commitment_pace)
                            : t("teamfit.card.roleFallback")}
                        </Badge>
                      </div>
                    </DetailSection>

                    <DetailSection label={t("teamfit.fields.techStack")}>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.tech_stack.length > 0 ? (
                          recommendation.tech_stack.map((item) => (
                            <Badge key={item} variant="outline">
                              {translateOption(t, "stack", item)}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm leading-6 text-foreground/80">{t("teamfit.card.noReason")}</p>
                        )}
                      </div>
                    </DetailSection>
                  </div>

                  {hasSupplementaryProfileSignals ? (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      {recommendation.mbti && recommendation.mbti_axis_values ? (
                        <DetailSection
                          label={t("teamfit.fields.mbti")}
                          className="border-violet-200/80 bg-[linear-gradient(180deg,rgba(250,247,255,0.96),rgba(245,242,255,0.92))]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-violet-200 bg-white/92 text-violet-700" variant="outline">
                              {recommendation.mbti}
                            </Badge>
                          </div>
                          <div className="space-y-3">
                            {MBTI_AXES.map((axis) => (
                              <MbtiAxisBalance
                                key={axis.id}
                                axis={axis}
                                leftPercent={recommendation.mbti_axis_values?.[axis.id] ?? 50}
                                t={t}
                              />
                            ))}
                          </div>
                        </DetailSection>
                      ) : null}

                      {translatedImpactTags.length > 0 ? (
                        <DetailSection
                          label={t("teamfit.fields.impactTags")}
                          className="border-pink-200/80 bg-[linear-gradient(180deg,rgba(255,247,250,0.96),rgba(255,242,248,0.92))]"
                        >
                          <div className="grid grid-cols-2 gap-3.5">
                            {translatedImpactTags.map((tag) => (
                              <ImpactTagTile
                                key={tag.value}
                                value={tag.value}
                                label={tag.label}
                              />
                            ))}
                          </div>
                        </DetailSection>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                    <DetailSection label={t("teamfit.fields.domains")}>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.domains.map((domain) => (
                          <Badge key={domain} variant="outline">
                            {translateOption(t, "domains", domain)}
                          </Badge>
                        ))}
                      </div>
                    </DetailSection>

                    <DetailSection label={t("teamfit.card.linksLabel")}>
                      <div className="flex flex-wrap gap-2">
                        <LinkChip
                          href={recommendation.github_address}
                          label={t("teamfit.card.github")}
                          title={recommendation.github_address ?? t("teamfit.card.noGithub")}
                          tone="success"
                        />
                        <LinkChip
                          href={recommendation.notion_url}
                          label={t("teamfit.card.notion")}
                          title={recommendation.notion_url ?? t("teamfit.card.noNotion")}
                        />
                        <LinkChip
                          href={recommendation.email ? `mailto:${recommendation.email}` : undefined}
                          label={t("teamfit.card.contact")}
                          title={recommendation.email ?? t("teamfit.card.noContact")}
                          tone="warn"
                        />
                      </div>
                    </DetailSection>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
