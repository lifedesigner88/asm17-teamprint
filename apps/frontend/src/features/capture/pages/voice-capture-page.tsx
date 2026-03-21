import { NavLink } from "react-router-dom";

import { Badge, Button } from "@/common/components";

import { CapturePageShell } from "../components";

export function VoiceCapturePage() {
  return (
    <CapturePageShell
      badge="Step 2"
      description="Voice capture will be available in a future update."
      footer={null}
      title="Voice intent"
    >
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Badge variant="outline">Coming soon</Badge>
        <p className="text-sm text-muted-foreground max-w-sm">
          Voice sample upload and tone configuration will be added after the interview MVP is complete.
        </p>
        <NavLink to="/capture/interview">
          <Button variant="outline">Back to interview</Button>
        </NavLink>
      </div>
    </CapturePageShell>
  );
}
