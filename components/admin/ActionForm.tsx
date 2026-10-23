"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions/types";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * A <form> bound to a server action, showing the action's result message.
 * `resetOnSuccess` clears the inputs after a successful create.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** If set, asks for confirmation before submitting (destructive actions). */
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-[var(--a-success)]/30 bg-[var(--a-success)]/10 text-[var(--a-success)]"
              : "border-[var(--a-danger)]/30 bg-[var(--a-danger)]/10 text-[var(--a-danger)]"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const styles = variant === "primary" ? "a-btn-primary" : variant === "danger" ? "a-btn-danger" : "a-btn-outline";
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`a-btn ${styles} ${className}`}>
      {pending ? "Working…" : children}
    </button>
  );
}

export const inputCls = "a-input placeholder:text-[var(--fg-faint)]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-[var(--a-fg-muted)]">{hint}</span>}
    </label>
  );
}
