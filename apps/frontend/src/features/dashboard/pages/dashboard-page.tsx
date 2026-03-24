import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import type { RootLoaderData } from "@/features/auth/types";
import { formatInterviewRoom, formatInterviewTimeSlot } from "@/lib/interview";
import { fetchDashboard, fetchSlotMembers } from "../api";
import type { DashboardGrid, MemberCard, SlotCell } from "../types";

const INTERVIEW_DATES = ["2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22"];
const DATE_LABELS: Record<string, string> = {
  "2026-03-19": "3/19 (목)",
  "2026-03-20": "3/20 (금)",
  "2026-03-21": "3/21 (토)",
  "2026-03-22": "3/22 (일)"
};
const MOBILE_DATE_GROUPS = [
  ["2026-03-19", "2026-03-20"],
  ["2026-03-21", "2026-03-22"]
] as const;
const ROOMS = [1, 2, 3, 4, 5];
const DISPLAY_COLUMNS = 5;
const COMMUNITY_TARGET_MEMBERS = 300;
const WORKSHOP_START_AT = new Date("2026-04-03T13:00:00+09:00").getTime();

type SelectedSlot = { date: string; timeSlot: number; room: number };
type SlotSummary = { filled: number; male: number; female: number };
type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

function slotKey(date: string, timeSlot: number, room: number) {
  return `${date}|${timeSlot}|${room}`;
}

function slotSummary(cells: SlotCell[]): SlotSummary {
  return {
    filled: cells.filter((cell) => cell.color !== "gray").length,
    male: cells.filter((cell) => cell.color === "blue").length,
    female: cells.filter((cell) => cell.color === "pink").length
  };
}

function getCountdownParts(now: number): CountdownParts {
  const diffMs = Math.max(0, WORKSHOP_START_AT - now);
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function toneClass(date: string, summary: SlotSummary, isSelected: boolean) {
  if (isSelected) {
    if (date === "2026-03-21") {
      return {
        card: "border-sky-300 bg-sky-300/80 text-sky-950 shadow-md",
        meta: "text-sky-950/75"
      };
    }

    if (date === "2026-03-22") {
      return {
        card: "border-rose-300 bg-rose-300/80 text-rose-950 shadow-md",
        meta: "text-rose-950/75"
      };
    }

    return {
      card: "border-lime-300 bg-lime-200/85 text-lime-950 shadow-md",
      meta: "text-lime-950/75"
    };
  }

  if (summary.filled === 0) {
    return {
      card: "border-border/60 bg-white/78 text-muted-foreground hover:border-foreground/25 hover:bg-white",
      meta: "text-muted-foreground/75"
    };
  }

  if (summary.male > 0 && summary.female > 0) {
    return {
      card: "border-amber-200 bg-amber-50/90 text-amber-700 hover:border-amber-300",
      meta: "text-amber-700/80"
    };
  }

  if (summary.male > 0) {
    return {
      card: "border-sky-200 bg-sky-50/90 text-sky-700 hover:border-sky-300",
      meta: "text-sky-700/80"
    };
  }

  return {
    card: "border-pink-200 bg-pink-50/90 text-pink-700 hover:border-pink-300",
    meta: "text-pink-700/80"
  };
}

function dotClass(color: SlotCell["color"], isSelected: boolean) {
  if (color === "blue") {
    return isSelected
      ? "border-sky-400 bg-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.26)]"
      : "border-sky-200 bg-sky-200";
  }

  if (color === "pink") {
    return isSelected
      ? "border-rose-400 bg-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.24)]"
      : "border-rose-200 bg-rose-200";
  }

  return isSelected ? "border-lime-300 bg-lime-50" : "border-stone-200 bg-stone-100";
}

function timeSlotLabelClass(isActive: boolean, selectedDateForTimeSlot: string | null) {
  if (!isActive) {
    return "border-border/60 bg-white/82 text-muted-foreground hover:border-foreground/20 hover:text-foreground";
  }

  if (selectedDateForTimeSlot === "2026-03-21") {
    return "border-sky-300 bg-sky-200/85 text-sky-950 shadow-sm";
  }

  if (selectedDateForTimeSlot === "2026-03-22") {
    return "border-rose-300 bg-rose-200/85 text-rose-950 shadow-sm";
  }

  return "border-lime-300 bg-lime-200/85 text-lime-950 shadow-sm";
}

function dateHeaderClass(date: string) {
  if (date === "2026-03-21") {
    return "border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(247,250,252,0.94))]";
  }

  if (date === "2026-03-22") {
    return "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.96),rgba(250,247,247,0.94))]";
  }

  return "border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,250,0.92))]";
}

function timeSlotBoardClass(date: string, isActive: boolean) {
  if (date === "2026-03-21") {
    return isActive ? "border-sky-200 bg-sky-100/80 shadow-sm" : "border-sky-100/80 bg-sky-50/55";
  }

  if (date === "2026-03-22") {
    return isActive
      ? "border-rose-200 bg-rose-100/80 shadow-sm"
      : "border-rose-100/80 bg-rose-50/55";
  }

  return isActive
    ? "border-foreground/15 bg-foreground/[0.04] shadow-sm"
    : "border-border/50 bg-white/72";
}

function DepartmentRowButton({
  date,
  timeSlot,
  room,
  cells,
  isSelected,
  onSelect
}: {
  date: string;
  timeSlot: number;
  room: number;
  cells: SlotCell[];
  isSelected: boolean;
  onSelect: (date: string, timeSlot: number, room: number) => void;
}) {
  const summary = slotSummary(cells);
  const tone = toneClass(date, summary, isSelected);
  const visibleCells = [...cells].sort((a, b) => a.seat - b.seat).slice(0, DISPLAY_COLUMNS);

  return (
    <button
      onClick={() => onSelect(date, timeSlot, room)}
      title={`${DATE_LABELS[date]} ${formatInterviewTimeSlot(timeSlot)} ${formatInterviewRoom(room)}`}
      aria-label={`${DATE_LABELS[date]} ${formatInterviewTimeSlot(timeSlot)} ${formatInterviewRoom(room)}`}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-left transition ${tone.card}`}
    >
      <span className="sr-only">{formatInterviewRoom(room)}</span>
      <div className="grid flex-1 grid-cols-5 gap-1.5">
        {visibleCells.map((cell) => (
          <span
            key={cell.seat}
            className={`h-3 w-3 rounded-full border transition sm:h-3.5 sm:w-3.5 ${dotClass(
              cell.color,
              isSelected
            )}`}
          />
        ))}
      </div>
    </button>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 7.5h16v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m5 8 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 .5C5.648.5.5 5.648.5 12c0 5.082 3.292 9.387 7.862 10.91.575.105.787-.25.787-.556 0-.275-.01-1.004-.016-1.97-3.197.694-3.873-1.54-3.873-1.54-.523-1.328-1.277-1.681-1.277-1.681-1.044-.714.079-.699.079-.699 1.155.081 1.763 1.187 1.763 1.187 1.027 1.76 2.695 1.252 3.35.957.103-.744.402-1.252.732-1.54-2.552-.29-5.236-1.276-5.236-5.682 0-1.255.448-2.282 1.183-3.086-.119-.29-.513-1.458.112-3.04 0 0 .965-.309 3.163 1.179A11.02 11.02 0 0 1 12 6.07c.977.004 1.962.132 2.882.387 2.196-1.488 3.16-1.179 3.16-1.179.627 1.582.233 2.75.114 3.04.737.804 1.181 1.831 1.181 3.086 0 4.417-2.689 5.389-5.251 5.673.413.355.781 1.054.781 2.126 0 1.535-.014 2.773-.014 3.15 0 .309.207.667.793.554C20.213 21.383 23.5 17.08 23.5 12 23.5 5.648 18.352.5 12 .5Z" />
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

function MemberIconLink({
  href,
  label,
  title,
  disabled = false,
  onClick,
  children
}: {
  href: string | null;
  label: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const baseClass =
    "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 transition";

  if (disabled || !href) {
    return (
      <span
        aria-label={`${label} 없음`}
        title={`${label} 없음`}
        className={`${baseClass} border-border/50 bg-white/55 text-muted-foreground/40`}
      >
        {children}
        <span className="text-[12px] font-medium">{label}</span>
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        title={title}
        className={`${baseClass} border-border/60 bg-white/72 text-foreground/78 hover:border-foreground/25 hover:bg-white hover:text-foreground`}
      >
        {children}
        <span className="text-[12px] font-medium">{label}</span>
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      title={title}
      className={`${baseClass} border-border/60 bg-white/72 text-foreground/78 hover:border-foreground/25 hover:bg-white hover:text-foreground`}
    >
      {children}
      <span className="text-[12px] font-medium">{label}</span>
    </a>
  );
}

function MemberCardItem({ card }: { card: MemberCard }) {
  const [copied, setCopied] = useState(false);
  const inlineProfile = [card.birth_year ? `${card.birth_year}` : null, card.residence].filter(Boolean);

  function copyEmail() {
    if (!card.email) return;
    navigator.clipboard.writeText(card.email).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!card.user_id) {
    return (
      <div className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-gray-50/90 p-4 text-center">
        <span className="text-sm font-semibold text-muted-foreground">미신청</span>
        <span className="mt-1 text-[11px] text-muted-foreground/60">
          등록된 멤버 정보가 아직 없습니다.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[188px] flex-col justify-between rounded-2xl border p-4 text-sm ${
        card.gender === "M"
          ? "border-sky-200 bg-sky-50/82"
          : card.gender === "F"
            ? "border-pink-200 bg-pink-50/82"
            : "border-border/60 bg-white/90"
      }`}
    >
      <div className="min-h-0">
        <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground/95">
          {card.name ?? "—"}
          {inlineProfile.length > 0 && (
            <span className="text-[13px] font-medium text-muted-foreground">
              {" "}
              ({inlineProfile.join(" · ")})
            </span>
          )}
        </p>
        {inlineProfile.length === 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">출생연도 / 거주지역 미입력</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <MemberIconLink
          href={card.email}
          label={copied ? "Email copied" : "Email"}
          title={card.email ? `이메일 복사: ${card.email}` : "이메일 없음"}
          disabled={!card.email}
          onClick={copyEmail}
        >
          <MailIcon />
        </MemberIconLink>
        <MemberIconLink
          href={card.github_address}
          label="GitHub"
          title={card.github_address ? `GitHub 열기: ${card.github_address}` : "GitHub 링크 없음"}
          disabled={!card.github_address}
        >
          <GithubIcon />
        </MemberIconLink>
        <MemberIconLink
          href={card.notion_url}
          label="Notion"
          title={card.notion_url ? `Notion 열기: ${card.notion_url}` : "Notion 링크 없음"}
          disabled={!card.notion_url}
        >
          <NotionIcon />
        </MemberIconLink>
      </div>
    </div>
  );
}

function SomaLogoCard() {
  return (
    <div className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-sky-200/80 bg-[linear-gradient(160deg,rgba(240,249,255,0.98),rgba(255,255,255,0.94))] p-4 text-center shadow-sm">
      <img src="/asm17_logo.png" alt="SoMa 17" className="h-16 w-auto object-contain sm:h-20" />
      <div className="mt-3 text-sm font-semibold tracking-[-0.02em] text-sky-950">asm 17</div>
      <div className="mt-1 text-[11px] text-sky-900/70">AI Software Maestro 17</div>
    </div>
  );
}

export function DashboardPage() {
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const navigate = useNavigate();
  const sessionUser = rootData.sessionUser;
  const canViewSlotMembers = Boolean(
    sessionUser?.is_admin || sessionUser?.applicant_status === "approved"
  );

  const [grid, setGrid] = useState<DashboardGrid | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberCard[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [countdown, setCountdown] = useState<CountdownParts>(() => getCountdownParts(Date.now()));

  useEffect(() => {
    fetchDashboard()
      .then(setGrid)
      .catch(() => setGrid(null))
      .finally(() => setLoadingGrid(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function closeSlotDialog() {
    setSelected(null);
    setMembers(null);
    setMembersError(null);
  }

  useEffect(() => {
    if (!selected) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSlotDialog();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [selected]);

  async function handleSlotClick(date: string, timeSlot: number, room: number) {
    setActiveTimeSlot(timeSlot);
    setSelected({ date, timeSlot, room });
    setMembers(null);
    setMembersError(null);
    setLoadingMembers(true);

    const result = await fetchSlotMembers(date, timeSlot, room);

    setLoadingMembers(false);
    if (result.error) {
      setMembersError(result.error);
      return;
    }

    setMembers(result.data ?? []);
  }

  const cellMap = new Map<string, SlotCell[]>();
  if (grid) {
    for (const cell of grid.cells) {
      const key = slotKey(cell.date, cell.time_slot, cell.room);
      const list = cellMap.get(key) ?? [];
      list.push(cell);
      cellMap.set(key, list);
    }
  }

  const timeSlots = [1, 2, 3, 4, 5];
  const selectedDateForActiveTimeSlot =
    selected && selected.timeSlot === activeTimeSlot ? selected.date : null;

  function toggleTimeSlotHighlight(timeSlot: number) {
    setActiveTimeSlot((current) => (current === timeSlot ? null : timeSlot));
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <ShellCard className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.10),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.96))] px-4 py-4 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        <div className="grid gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-2.5">
            <StatusPill label="소프트웨어마에스트로 17기" />
            <div className="space-y-2.5">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                서울 면접자 대시보드
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                현재는 4일 x 5T x 5개 분과 x 기본 5명 기준으로 500석을 열어두었습니다.
                <br />
                대시보드 보드는 분과별 5개의 점으로 최대한 빠르게 훑어볼 수 있게 정리했습니다.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                <span className="rounded-full border border-border/60 bg-white/80 px-2.5 py-1">
                  1줄 = 1분과
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                  <span className="h-3 w-3 rounded-full border border-sky-200 bg-sky-200" />
                  남성
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1">
                  <span className="h-3 w-3 rounded-full border border-rose-200 bg-rose-200" />
                  여성
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                  <span className="h-3 w-3 rounded-full border border-stone-200 bg-stone-100" />
                  미신청
                </span>
                {!canViewSlotMembers && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 lg:ml-auto">
                    17기 합격 인증 후 17기 정보 보기가 가능합니다.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full self-start space-y-1.5 lg:w-[272px] lg:justify-self-end">
            <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(160deg,rgba(240,249,255,0.98),rgba(255,255,255,0.95))] px-4 py-2.5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/80">
                    서울 워크숍까지
                  </div>
                  <p className="mt-1 text-[11px] text-sky-900/75">2026.04.03 (금) 13:00 · 양평</p>
                </div>
                <StatusPill label="D-Day" tone="success" />
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {[
                  { label: "Day", value: countdown.days },
                  { label: "Hour", value: countdown.hours },
                  { label: "Min", value: countdown.minutes },
                  { label: "Sec", value: countdown.seconds }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-sky-100/90 bg-white/88 px-2 py-2 text-center"
                  >
                    <div className="text-base font-semibold tracking-[-0.04em] text-sky-950 sm:text-lg">
                      {String(item.value).padStart(2, "0")}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700/70">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {grid && (
              <div className="rounded-2xl border border-border/60 bg-white/84 px-4 py-2.5 text-center shadow-sm backdrop-blur">
                <div className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                  {grid.approved_member_count}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{COMMUNITY_TARGET_MEMBERS}(명)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ShellCard>

      {loadingGrid ? (
        <ShellCard>
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </ShellCard>
      ) : !grid ? (
        <ShellCard>
          <p className="text-sm text-muted-foreground">데이터를 불러오지 못했습니다.</p>
        </ShellCard>
      ) : (
        <ShellCard className="overflow-hidden p-3 sm:p-4 lg:p-5">
          <div className="space-y-3 sm:hidden">
            {MOBILE_DATE_GROUPS.map((dateGroup, groupIndex) => (
              <div
                key={`mobile-group-${groupIndex}`}
                className="grid grid-cols-[34px_repeat(2,minmax(0,1fr))] gap-2"
              >
                <div />
                {dateGroup.map((date) => (
                  <div
                    key={date}
                    className={`rounded-2xl border px-2 py-2 text-center ${dateHeaderClass(date)}`}
                  >
                    <div className="text-[11px] font-semibold text-foreground">
                      {DATE_LABELS[date]}
                    </div>
                  </div>
                ))}

                {timeSlots.map((timeSlot) => {
                  const isActiveTimeSlot = activeTimeSlot === timeSlot;

                  return (
                    <Fragment key={`mobile-row-${groupIndex}-${timeSlot}`}>
                      <button
                        type="button"
                        onClick={() => toggleTimeSlotHighlight(timeSlot)}
                        aria-pressed={isActiveTimeSlot}
                        title={formatInterviewTimeSlot(timeSlot)}
                        className={`flex min-h-[158px] items-center justify-center rounded-2xl border text-center text-[11px] font-semibold transition ${timeSlotLabelClass(
                          isActiveTimeSlot,
                          selectedDateForActiveTimeSlot
                        )}`}
                      >
                        {timeSlot}T
                      </button>

                      {dateGroup.map((date) => (
                        <div
                          key={slotKey(date, timeSlot, 0)}
                          className={`rounded-2xl border p-1.5 ${timeSlotBoardClass(date, isActiveTimeSlot)}`}
                        >
                          <div className="space-y-1">
                            {ROOMS.map((room) => {
                              const cells = cellMap.get(slotKey(date, timeSlot, room)) ?? [];
                              const isSelected =
                                selected?.date === date &&
                                selected.timeSlot === timeSlot &&
                                selected.room === room;

                              return (
                                <DepartmentRowButton
                                  key={slotKey(date, timeSlot, room)}
                                  date={date}
                                  timeSlot={timeSlot}
                                  room={room}
                                  cells={cells}
                                  isSelected={isSelected}
                                  onSelect={handleSlotClick}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="hidden sm:grid sm:grid-cols-[38px_repeat(4,minmax(0,1fr))] sm:gap-2">
            <div />
            {INTERVIEW_DATES.map((date) => (
              <div
                key={date}
                className={`rounded-2xl border px-2 py-2 text-center ${dateHeaderClass(date)}`}
              >
                <div className="hidden text-sm font-semibold text-foreground sm:block">
                  {DATE_LABELS[date]}
                </div>
              </div>
            ))}

            {timeSlots.map((timeSlot) => {
              const isActiveTimeSlot = activeTimeSlot === timeSlot;

              return (
                <div key={`row-${timeSlot}`} className="contents">
                  <button
                    type="button"
                    onClick={() => toggleTimeSlotHighlight(timeSlot)}
                    aria-pressed={isActiveTimeSlot}
                    title={formatInterviewTimeSlot(timeSlot)}
                    className={`flex min-h-[126px] items-center justify-center rounded-2xl border px-1 text-center text-[11px] font-semibold transition ${timeSlotLabelClass(
                      isActiveTimeSlot,
                      selectedDateForActiveTimeSlot
                    )}`}
                  >
                    <span>{timeSlot}T</span>
                  </button>

                  {INTERVIEW_DATES.map((date) => (
                    <div
                      key={slotKey(date, timeSlot, 0)}
                      className={`rounded-2xl border p-1.5 sm:p-2 ${timeSlotBoardClass(date, isActiveTimeSlot)}`}
                    >
                      <div className="space-y-1">
                        {ROOMS.map((room) => {
                          const cells = cellMap.get(slotKey(date, timeSlot, room)) ?? [];
                          const isSelected =
                            selected?.date === date &&
                            selected.timeSlot === timeSlot &&
                            selected.room === room;

                          return (
                            <DepartmentRowButton
                              key={slotKey(date, timeSlot, room)}
                              date={date}
                              timeSlot={timeSlot}
                              room={room}
                              cells={cells}
                              isSelected={isSelected}
                              onSelect={handleSlotClick}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </ShellCard>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="슬롯 상세 닫기"
            onClick={closeSlotDialog}
            className="absolute inset-0 bg-slate-950/36 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-dialog-title"
            className="relative z-10 w-full max-w-5xl"
          >
            <ShellCard className="max-h-[calc(100vh-2rem)] overflow-y-auto border-white/70 bg-white/97 p-4 shadow-2xl sm:p-5 lg:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 id="slot-dialog-title" className="text-sm font-semibold sm:text-base">
                    {DATE_LABELS[selected.date]} · {formatInterviewTimeSlot(selected.timeSlot)} ·{" "}
                    {formatInterviewRoom(selected.room)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeSlotDialog}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  닫기
                </button>
              </div>

              {loadingMembers && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

              {membersError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-700">{membersError}</p>
                  {!sessionUser && (
                    <Button className="mt-3" size="sm" onClick={() => navigate("/auth/login")}>
                      로그인하기
                    </Button>
                  )}
                  {sessionUser &&
                    !sessionUser.is_admin &&
                    sessionUser.applicant_status !== "approved" && (
                      <Button className="mt-3" size="sm" onClick={() => navigate("/verification")}>
                        합격자 인증 신청
                      </Button>
                    )}
                </div>
              )}

              {members && (
                <div className="mx-auto grid max-w-[900px] auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((card) => (
                    <MemberCardItem key={card.seat} card={card} />
                  ))}
                  <SomaLogoCard />
                </div>
              )}
            </ShellCard>
          </div>
        </div>
      )}
    </div>
  );
}
