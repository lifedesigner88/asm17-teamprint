import { NavLink } from "react-router-dom";

import { Badge, Button } from "@/common/components";

import { CapturePageShell } from "../components";

export function ImageCapturePage() {
  return (
    <CapturePageShell
      badge="Step 3"
      description="Image capture will be available in a future update."
      footer={null}
      title="Visual references"
    >
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Badge variant="outline">Coming soon</Badge>
        <p className="text-sm text-muted-foreground max-w-sm">
          Reference image upload and visual direction notes will be added after the interview MVP is complete.
        </p>
        <NavLink to="/capture/interview">
          <Button variant="outline">Back to interview</Button>
        </NavLink>
      </div>
    </CapturePageShell>
  );
}
