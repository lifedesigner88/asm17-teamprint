import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ShellCard, StatusPill, buttonVariants } from "@/common/components";

export function BusanDashboardPage() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-5">
      <ShellCard className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.96))] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={t("dashboardBusanPage.pill")} tone="warn" />
          <StatusPill label={t("nav.comingSoon")} />
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.2rem]">
          {t("dashboardBusanPage.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          {t("dashboardBusanPage.description")}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          {t("dashboardBusanPage.subtext")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/seoul/dashboard" className={buttonVariants({ variant: "outline" })}>
            {t("dashboardBusanPage.primaryAction")}
          </Link>
          <Link to="/" className={buttonVariants()}>
            {t("dashboardBusanPage.secondaryAction")}
          </Link>
        </div>
      </ShellCard>
    </div>
  );
}
