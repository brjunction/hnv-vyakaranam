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
          className={`mt-3 text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
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
  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90"
      : variant === "danger"
        ? "border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
        : "border border-[var(--border-strong)] hover:border-[var(--fg)]";
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export const inputCls =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[0.95rem] text-[var(--fg)] placeholder:text-[var(--fg-faint)] focus:outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/25";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--fg-muted)] mt-1">{hint}</span>}
    </label>
  );
}
