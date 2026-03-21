import { NavLink } from "react-router-dom";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { formatCaptureTimestamp } from "../utils/format";
import type { CaptureJob } from "../utils/types";
import { CaptureJobStatusBadge } from "./capture-job-status-badge";

export function CaptureJobCard({
  job,
  showOwner = false,
  to,
}: {
  job: CaptureJob;
  showOwner?: boolean;
  to: string;
}) {
  return (
    <Card className="bg-white/94">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">Submission</Badge>
          <CaptureJobStatusBadge status={job.status} />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-lg">{`Capture job ${job.id.slice(0, 8)}`}</CardTitle>
          <CardDescription>
            Created {formatCaptureTimestamp(job.created_at)}
            {showOwner ? ` • owner ${job.owner_user_id}` : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Interview</div>
            <div className="mt-2 line-clamp-3 text-foreground/80">
              {job.payload.interview.isComplete ? "Complete" : `${job.payload.interview.messages.length} messages`}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Voice</div>
            <div className="mt-2 text-foreground/80">{job.payload.voice.inputMode} • {job.payload.voice.sampleFileName || "metadata only"}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Image</div>
            <div className="mt-2 text-foreground/80">{job.payload.image.inputMode} • {job.payload.image.referenceFileName || "metadata only"}</div>
          </div>
        </div>
        <NavLink to={to}>
          <Button variant="outline">Open submission</Button>
        </NavLink>
      </CardContent>
    </Card>
  );
}
