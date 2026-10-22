"use client";

import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { changePassword } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";

export default function PasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess className="space-y-4 max-w-sm">
      <Field label="Current password">
        <input name="current" type="password" autoComplete="current-password" required className={inputCls} />
      </Field>
      <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <input name="next" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputCls} />
      </Field>
      <Field label="New password again">
        <input name="confirm" type="password" autoComplete="new-password" required className={inputCls} />
      </Field>
      <SubmitButton>Change password</SubmitButton>
    </ActionForm>
  );
}
