import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/common/components";
import { cn } from "@/lib/utils";

import type { TeamFitMapPoint } from "../types";
import { useTranslation } from "react-i18next";

type TeamFitScatterMapProps = {
  points: TeamFitMapPoint[];
};

const BUCKET_STYLES: Record<TeamFitMapPoint["bucket"], string> = {
  similar: "border-sky-300 bg-sky-400 text-sky-50 shadow-[0_0_0_6px_rgba(14,165,233,0.09)]",
  complementary:
    "border-amber-300 bg-amber-400 text-amber-50 shadow-[0_0_0_6px_rgba(245,158,11,0.09)]",
  unexpected: "border-rose-300 bg-rose-400 text-rose-50 shadow-[0_0_0_6px_rgba(244,63,94,0.09)]"
};

function normalizeCoordinate(value: number) {
  if (Number.isNaN(value)) {
    return 50;
  }

  const normalized = value > 1 ? value : value * 100;
  return Math.min(100, Math.max(0, normalized));
}

export function TeamFitScatterMap({ points }: TeamFitScatterMapProps) {
  const { t } = useTranslation("common");

  return (
    <Card className="border-sky-100/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg tracking-[-0.03em]">{t("teamfit.map.title")}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{t("teamfit.map.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_top,rgba(219,234,254,0.7),rgba(255,255,255,0.96))] p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-sky-100 bg-white/80">
            <div className="absolute inset-0">
              <div className="absolute left-0 top-1/2 h-px w-full bg-sky-100" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-sky-100" />
              <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />
            </div>

            {points.map((point) => {
              const left = normalizeCoordinate(point.x);
              const top = 100 - normalizeCoordinate(point.y);

              return (
                <span
                  key={`${point.user_id}-${point.bucket}`}
                  className={cn(
                    "absolute inline-flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] text-[10px] font-semibold",
                    BUCKET_STYLES[point.bucket]
                  )}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={point.name}
                />
              );
            })}

            <div className="absolute bottom-2 left-3 text-[11px] font-medium text-sky-700/80">
              {t("teamfit.map.axes.similarity")}
            </div>
            <div className="absolute left-3 top-2 rotate-0 text-[11px] font-medium text-sky-700/80">
              {t("teamfit.map.axes.structuredFit")}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t("teamfit.bucket.similar")}</Badge>
          <Badge variant="outline">{t("teamfit.bucket.complementary")}</Badge>
          <Badge variant="outline">{t("teamfit.bucket.unexpected")}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
