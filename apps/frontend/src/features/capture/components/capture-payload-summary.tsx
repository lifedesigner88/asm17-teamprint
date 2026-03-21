import { cn } from "@/lib/utils";

import type { CaptureDraft } from "../utils/types";
import { SummaryBlock } from "./summary-block";

export function CapturePayloadSummary({
  className,
  payload,
}: {
  className?: string;
  payload: CaptureDraft;
}) {
  return (
    <div className={cn("grid gap-4 xl:grid-cols-3", className)}>
      <SummaryBlock title="Interview">
        <div>
          <div className="font-medium">Status</div>
          <div>{payload.interview.isComplete ? "Complete" : "In progress"}</div>
        </div>
        <div>
          <div className="font-medium">Messages</div>
          <div>{payload.interview.messages.length} exchanges</div>
        </div>
      </SummaryBlock>

      <SummaryBlock title="Voice">
        <div>
          <div className="font-medium">Status</div>
          <div className="text-muted-foreground">Coming soon</div>
        </div>
      </SummaryBlock>

      <SummaryBlock title="Image">
        <div>
          <div className="font-medium">Status</div>
          <div className="text-muted-foreground">Coming soon</div>
        </div>
      </SummaryBlock>
    </div>
  );
}
