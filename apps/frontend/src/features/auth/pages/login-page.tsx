import { useState } from "react";
import { Form, Link, useActionData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Field, Input, ShellCard, StatusPill } from "@/common/components";

import type { AuthActionData } from "../types";

export function LoginPage() {
  const { t } = useTranslation("auth");
  const actionData = useActionData() as AuthActionData | undefined;
  const [showPin, setShowPin] = useState(false);

  return (
    <ShellCard className="mx-auto max-w-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,248,0.95))]">
      <div className="space-y-2">
        <StatusPill label={t("login.pill")} />
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("login.title")}</h2>
      </div>
      <Form className="mt-6 space-y-4" method="post">
        <Field label={t("login.emailLabel")}>
          <Input autoComplete="email" name="email" required type="email" />
        </Field>
        <Field label={t("login.pinLabel")}>
          <div className="flex items-center gap-2">
            <Input
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={4}
              name="password"
              pattern="[0-9]{4}"
              placeholder="••••"
              required
              type={showPin ? "text" : "password"}
              onInput={(e) => {
                const t = e.currentTarget;
                t.value = t.value.replace(/\D/g, "").slice(0, 4);
              }}
            />
            <Button size="sm" type="button" variant="outline" onClick={() => setShowPin((v) => !v)}>
              {showPin ? t("login.hide") : t("login.show")}
            </Button>
          </div>
        </Field>
        <div className="flex items-center justify-between gap-4">
          <Link className="text-xs text-muted-foreground underline underline-offset-2" to="/auth/reset-pin">
            {t("login.forgotPin")}
          </Link>
          <Button type="submit">{t("login.submit")}</Button>
        </div>
      </Form>
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4">
        <Link className="block" to="/auth/signup">
          <Button
            type="button"
            variant="outline"
            className="w-full border-sky-200 bg-sky-50/80 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
          >
            {t("login.signupBtn")}
          </Button>
        </Link>
      </div>
      {actionData?.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionData.error}
          {actionData.error.includes("not verified") ? (
            <span className="ml-1">
              — <Link className="underline" to="/auth/signup">{t("login.goBackVerify")}</Link>
            </span>
          ) : null}
        </div>
      ) : null}
    </ShellCard>
  );
}
