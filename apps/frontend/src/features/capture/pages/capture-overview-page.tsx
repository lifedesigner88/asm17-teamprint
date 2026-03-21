import { NavLink } from "react-router-dom";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { useCaptureRouteData } from "../utils/hooks";

export function CaptureOverviewPage() {
  const { draft, nextPath, completion } = useCaptureRouteData();

  return (
    <div className="space-y-6">
      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <Badge variant="outline">Workflow entry</Badge>
            <CardTitle className="text-2xl">Prepare and submit the capture draft</CardTitle>
            <CardDescription className="max-w-2xl">
              The first three screens collect the payload in browser memory. The review step now submits that payload to
              the backend capture job API.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <NavLink to="/capture/submissions">
              <Button size="lg" variant="outline">
                View submissions
              </Button>
            </NavLink>
            <NavLink to={nextPath}>
              <Button size="lg">{completion.interview ? "Continue draft" : "Start capture"}</Button>
            </NavLink>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,236,0.96))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">
                {draft.interview.isComplete
                  ? "Interview complete — ready to submit."
                  : draft.interview.messages.length > 0
                    ? `${draft.interview.messages.length} messages so far — continue the conversation.`
                    : "Claude will guide you through 5 questions to understand who you are."}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,246,0.96))] opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Voice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">Coming soon — voice sample and tone capture.</p>
            </CardContent>
          </Card>
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,245,240,0.96))] opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Image</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">Coming soon — reference image and visual direction.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
