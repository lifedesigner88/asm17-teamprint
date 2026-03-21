import { Form, NavLink, useActionData, useNavigation } from "react-router-dom";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { CapturePayloadSummary } from "../components";
import { useCaptureRouteData } from "../utils/hooks";
import type { CaptureSubmitActionData } from "../utils/types";

export function CaptureReviewPage() {
  const { draft, completion } = useCaptureRouteData();
  const actionData = useActionData() as CaptureSubmitActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const ready = completion.interview;

  return (
    <div className="space-y-6">
      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <Badge variant={ready ? "success" : "warn"}>Step 2</Badge>
            <CardTitle className="text-2xl">Review draft package</CardTitle>
            <CardDescription className="max-w-2xl">
              This is the payload that will be sent to the backend capture job API. File uploads are still metadata-only,
              but the review step is now the real submission gate.
            </CardDescription>
          </div>
          <Badge variant={ready ? "success" : "warn"}>{ready ? "ready to submit" : "partial draft"}</Badge>
        </CardHeader>
      </Card>

      <CapturePayloadSummary payload={draft} />

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,248,0.95))]">
        <CardContent className="space-y-4 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold tracking-[-0.03em]">Submission gate</h4>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Submitting this draft creates a persisted capture job. The next backend phase can attach real file upload
                handling and async processing on top of the same payload shape.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <NavLink to="/capture/interview">
                <Button type="button" variant="outline">
                  Back to interview
                </Button>
              </NavLink>
              <Form method="post">
                <Button disabled={!ready || loading} type="submit">
                  {loading ? "Submitting..." : "Submit to backend"}
                </Button>
              </Form>
            </div>
          </div>
          {actionData?.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionData.error}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
