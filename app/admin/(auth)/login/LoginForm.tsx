"use client";

import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { login } from "@/lib/actions/auth";

export default function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={login} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required className={inputCls} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </Field>
      <SubmitButton className="w-full py-2.5">Sign in</SubmitButton>
    </ActionForm>
  );
}
