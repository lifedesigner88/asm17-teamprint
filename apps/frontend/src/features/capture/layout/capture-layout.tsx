import { Form, Outlet, useLoaderData } from "react-router-dom";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { StepLink } from "../components";
import type { CaptureLoaderData } from "../utils/types";

export function CaptureLayout() {
  const { completion, progressCount } = useLoaderData() as CaptureLoaderData;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,244,238,0.96))]">
        <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Badge variant="outline">Capture flow</Badge>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                Answer 5 questions and let Claude build your persona draft.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Complete the AI interview, then review and submit. Voice and image capture will be added in a future update.
              </p>
            </div>
          </div>
          <Card className="bg-white/88">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Progress</CardTitle>
                <Badge variant={progressCount >= 1 ? "success" : "outline"}>{progressCount}/1 steps</Badge>
              </div>
              <CardDescription>
                Complete the interview to unlock the review and submission step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressCount >= 1 ? 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit bg-white/92">
          <CardHeader>
            <CardTitle className="text-lg">Step map</CardTitle>
            <CardDescription>Move step by step or jump back to revise any section.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StepLink done={completion.interview} title="1. Interview" to="/capture/interview" />
            <StepLink disabled done={false} title="2. Voice (coming soon)" to="/capture/voice" />
            <StepLink disabled done={false} title="3. Image (coming soon)" to="/capture/image" />
            <StepLink done={completion.interview} title="4. Review" to="/capture/review" />
          </CardContent>
          <div className="px-6 pb-6">
            <Form action="/capture/reset" method="post">
              <Button className="w-full" type="submit" variant="outline">
                Reset current draft
              </Button>
            </Form>
          </div>
        </Card>

        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
