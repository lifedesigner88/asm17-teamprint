import { useEffect, useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import { Input } from "@/common/components/ui/input";
import type { RootLoaderData } from "@/features/auth/types";
import { formatInterviewRoom, formatInterviewStartTime } from "@/lib/interview";
import { applyVerification } from "../api";

const INTERVIEW_DATES = [
  { value: "2026-03-19", label: "3월 19일 (목)" },
  { value: "2026-03-20", label: "3월 20일 (금)" },
  { value: "2026-03-21", label: "3월 21일 (토)" },
  { value: "2026-03-22", label: "3월 22일 (일)" }
];
const STATUS_LABEL: Record<string, string> = {
  none: "미신청",
  pending: "인증 대기 중",
  approved: "인증 완료",
  rejected: "인증 거부"
};

const STATUS_TONE: Record<string, "default" | "success" | "warn"> = {
  none: "default",
  pending: "warn",
  approved: "success",
  rejected: "warn"
};

type VerificationFormState = {
  name: string;
  gender: "M" | "F" | "";
  birth_date: string;
  residence: string;
  invite_code: string;
  github_address: string;
  notion_url: string;
  interview_date: string;
  interview_start_time: string;
  interview_room: string;
};

function TeamTalkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 4c-4.97 0-9 3.019-9 6.742 0 2.442 1.736 4.58 4.332 5.756L6.25 20l4.012-2.095c.566.084 1.145.126 1.738.126 4.97 0 9-3.02 9-6.743C21 7.02 16.97 4 12 4Z"
      />
      <circle cx="8.45" cy="10.75" r="1.05" fill="#FEE500" />
      <circle cx="12" cy="10.75" r="1.05" fill="#FEE500" />
      <circle cx="15.55" cy="10.75" r="1.05" fill="#FEE500" />
    </svg>
  );
}

function TeamTalkBadge() {
  return (
    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6c76f] bg-[#fff2a8] text-[#3a2f08] shadow-[0_8px_20px_rgba(254,229,0,0.18)]">
      <TeamTalkIcon />
    </div>
  );
}

function normalizeForm(form: VerificationFormState): VerificationFormState {
  return {
    ...form,
    name: form.name.trim(),
    residence: form.residence.trim(),
    invite_code: form.invite_code.trim(),
    github_address: form.github_address.trim(),
    notion_url: form.notion_url.trim()
  };
}

function createInitialForm(sessionUser: RootLoaderData["sessionUser"]): VerificationFormState {
  return {
    name: sessionUser?.name ?? "",
    gender: sessionUser?.gender === "M" || sessionUser?.gender === "F" ? sessionUser.gender : "",
    birth_date: sessionUser?.birth_date ?? "",
    residence: sessionUser?.residence ?? "",
    invite_code: sessionUser?.invite_code ?? "",
    github_address: sessionUser?.github_address ?? "",
    notion_url: sessionUser?.notion_url ?? "",
    interview_date: sessionUser?.interview_date ?? "",
    interview_start_time: formatInterviewStartTime(sessionUser?.interview_start_time),
    interview_room: sessionUser?.interview_room ? String(sessionUser.interview_room) : ""
  };
}

export function VerificationPage() {
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const revalidator = useRevalidator();
  const sessionUser = rootData.sessionUser;
  const [form, setForm] = useState<VerificationFormState>(() => createInitialForm(sessionUser));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedMode, setSubmittedMode] = useState<"apply" | "edit" | null>(null);

  useEffect(() => {
    setForm(createInitialForm(sessionUser));
  }, [sessionUser]);

  if (!sessionUser) {
    return (
      <ShellCard>
        <StatusPill label="로그인 필요" tone="warn" />
        <p className="mt-4 text-sm text-muted-foreground">
          합격자 인증 신청은 로그인 후 이용할 수 있습니다.
        </p>
      </ShellCard>
    );
  }

  const status = sessionUser.applicant_status ?? "none";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  function updateForm<K extends keyof VerificationFormState>(
    key: K,
    value: VerificationFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    if (submittedMode === "edit") {
      setSubmittedMode(null);
      setSuccessMessage(null);
    }
  }

  if (submittedMode === "apply" && successMessage) {
    return (
      <ShellCard>
        <StatusPill label="신청 완료" tone="success" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
          인증 신청이 접수되었습니다
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{successMessage}</p>
      </ShellCard>
    );
  }

  if (status === "pending") {
    return (
      <ShellCard>
        <StatusPill label={STATUS_LABEL["pending"]} tone="warn" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">인증 대기 중</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          24시간 내로 인증코드 확인 후 승인해드리겠습니다.
        </p>
      </ShellCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedForm = normalizeForm(form);
    if (
      !normalizedForm.name ||
      !normalizedForm.gender ||
      !normalizedForm.interview_date ||
      !normalizedForm.interview_start_time ||
      !normalizedForm.interview_room
    ) {
      setError(
        !normalizedForm.name || !normalizedForm.gender
          ? "이름과 성별은 필수 입력 항목입니다."
          : "면접 날짜, 시작시간, 분과는 필수 입력 항목입니다."
      );
      return;
    }
    setForm(normalizedForm);
    setLoading(true);
    setError(null);
    const result = await applyVerification({
      name: normalizedForm.name,
      gender: normalizedForm.gender as "M" | "F",
      birth_date: normalizedForm.birth_date || undefined,
      residence: normalizedForm.residence || undefined,
      invite_code: normalizedForm.invite_code || undefined,
      github_address: normalizedForm.github_address || undefined,
      notion_url: normalizedForm.notion_url || undefined,
      interview_date: normalizedForm.interview_date,
      interview_start_time: normalizedForm.interview_start_time,
      interview_room: Number(normalizedForm.interview_room)
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      const nextMode = isApproved ? "edit" : "apply";
      setSubmittedMode(nextMode);
      setSuccessMessage(
        nextMode === "edit"
          ? "제출한 인증정보가 저장되었습니다."
          : "24시간 내로 인증코드 확인 후 승인해드리겠습니다."
      );
      revalidator.revalidate();
    }
  }

  const headerLabel = isApproved
    ? STATUS_LABEL["approved"]
    : isRejected
      ? STATUS_LABEL["rejected"]
      : "소프트웨어마에스트로 17기";
  const headerTone = STATUS_TONE[status] ?? "default";
  const heading = isApproved
    ? "제출한 인증정보 수정"
    : isRejected
      ? "합격자 인증 재신청"
      : "합격자 인증 신청";
  const description = isApproved
    ? "현재 승인 상태입니다. 제출했던 인증 정보를 수정하면 바로 저장되며, 승인 상태는 그대로 유지됩니다."
    : isRejected
      ? "이전에 제출한 인증 정보가 거부되었습니다. 내용을 보완해서 다시 신청할 수 있습니다."
      : [
          "확인이 되면 17기 팀톡방 가입 링크를 이메일로 보내드립니다.",
          "서울 + 부산 450명의 향후 네트워크를 위해 운영해볼 생각입니다.",
        ].join("\n");
  const submitLabel = isApproved
    ? "인증정보 저장"
    : isRejected
      ? "인증 다시 신청하기"
      : "인증 신청하기";

  return (
    <div className="space-y-6">
      <ShellCard>
        <div className="flex items-start justify-between gap-3">
          <StatusPill label={headerLabel} tone={headerTone} />
          <TeamTalkBadge />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{heading}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-transparent px-4 py-3 text-sm leading-6 text-muted-foreground">
          {!isApproved && <p>제출 전 기타 문의는 카카오톡 오픈채팅으로 연락해 주세요.</p>}
        </div>
      </ShellCard>

      <ShellCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-[26px] border border-slate-200/80 bg-[rgba(248,246,241,0.72)] px-4 py-4 sm:px-5">
            <div className="mb-4 space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">
                이름, 성별, 생년월일, 거주지, 깃허브 주소, 노션 링크
              </h3>
              <p className="text-xs leading-6 text-muted-foreground">
                이름과 성별은 필수이고, 나머지는 선택입니다. 입력한 항목만 가입 시 공개되는 데이터로 반영됩니다.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">이름 *</label>
                <Input
                  required
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">성별 *</label>
                <div className="flex gap-3">
                  {(["M", "F"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateForm("gender", g)}
                      className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        form.gender === g
                          ? g === "M"
                            ? "border-sky-400 bg-sky-100 text-sky-700"
                            : "border-pink-400 bg-pink-100 text-pink-700"
                          : "border-border/80 bg-white/80 text-muted-foreground hover:bg-black/5"
                      }`}
                    >
                      {g === "M" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">생년월일 (선택)</label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => updateForm("birth_date", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">거주지 (선택)</label>
                <Input
                  placeholder="서울시 강남구"
                  value={form.residence}
                  onChange={(e) => updateForm("residence", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">깃허브 주소 (선택)</label>
                <Input
                  type="url"
                  placeholder="https://github.com/username"
                  value={form.github_address}
                  onChange={(e) => updateForm("github_address", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">노션 링크 (선택)</label>
                <Input
                  type="url"
                  placeholder="https://notion.so/..."
                  value={form.notion_url}
                  onChange={(e) => updateForm("notion_url", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-emerald-200/70 bg-emerald-50/60 px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">합격자 초대코드 (선택)</label>
              <Input
                placeholder="합격자 노션에 있는 초대코드"
                value={form.invite_code}
                onChange={(e) => updateForm("invite_code", e.target.value)}
              />
              <p className="text-xs leading-5 text-emerald-700/80">
                합격자들만 보는 노션에 올려둔 초대코드를 입력해 주세요.
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <h3 className="text-sm font-semibold">면접 정보 *</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                입력하신 시간으로 인증 후 대시보드에 배치됩니다.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">면접 날짜 *</label>
                <select
                  required
                  value={form.interview_date}
                  onChange={(e) => updateForm("interview_date", e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-white/80 px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                >
                  <option value="">날짜 선택</option>
                  {INTERVIEW_DATES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">면접 시작시간 *</label>
                <Input
                  required
                  type="time"
                  min="09:00"
                  max="16:59"
                  step="60"
                  value={form.interview_start_time}
                  onChange={(e) => updateForm("interview_start_time", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">분과 *</label>
                <select
                  required
                  value={form.interview_room}
                  onChange={(e) => updateForm("interview_room", e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-white/80 px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                >
                  <option value="">분과 선택</option>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      {formatInterviewRoom(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {submittedMode === "edit" && successMessage && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          )}

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? "저장 중..." : submitLabel}
          </Button>
        </form>
      </ShellCard>
    </div>
  );
}
