import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton, inputCls } from "@/components/admin/ActionForm";
import { createAdmin, resetAdminPassword, updateAdmin } from "@/lib/actions/users";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";

export const metadata = { title: "Admins" };

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner — everything, including admins" },
  { value: "editor", label: "Editor — read & write, can publish" },
  { value: "contributor", label: "Contributor — can write drafts only" },
  { value: "viewer", label: "Viewer — read-only" },
] as const;

function RoleSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="role" defaultValue={defaultValue ?? "editor"} className={inputCls}>
      {ROLE_OPTIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

export default async function Users() {
  const me = await requireUser("owner");
  const users = await getDb().select().from(adminUsers).orderBy(asc(adminUsers.id));

  return (
    <>
      <PageHeader title="Admins" intro="Who can sign in to this dashboard, and what they can do. Turning someone off signs them out immediately." />

      <Panel title="Add an admin">
        <ActionForm action={createAdmin} resetOnSuccess className="grid sm:grid-cols-2 gap-4">
          <Field label="Name">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required className={inputCls} />
          </Field>
          <Field label="Access">
            <RoleSelect />
          </Field>
          <Field label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters. They can change it later.`}>
            <input name="password" type="text" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Add admin</SubmitButton>
          </div>
        </ActionForm>
      </Panel>

      <Panel title="All admins" aside={<span className="text-sm text-[var(--fg-muted)]">{users.length}</span>}>
        <ul className="divide-y divide-[var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p>
                  <span className="font-semibold">{u.name}</span>{" "}
                  <span className="text-[var(--fg-muted)]">{u.email}</span>
                  {u.id === me.id && <span className="ml-2 text-xs rounded-full border px-2 py-0.5">you</span>}
                </p>
                <p className="text-xs text-[var(--fg-faint)]">
                  {u.isActive ? "On" : "Off"} · last sign-in {u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "never"}
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <ActionForm action={updateAdmin} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={u.id} />
                  <div className="flex-1 min-w-48">
                    <Field label="Access">
                      <RoleSelect defaultValue={u.role} />
                    </Field>
                  </div>
                  <Field label="Status">
                    <select name="isActive" defaultValue={String(u.isActive)} className={inputCls}>
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                  </Field>
                  <SubmitButton variant="ghost">Save</SubmitButton>
                </ActionForm>
                <ActionForm action={resetAdminPassword} resetOnSuccess className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={u.id} />
                  <div className="flex-1 min-w-48">
                    <Field label="Set a new password">
                      <input name="password" type="text" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className={inputCls} />
                    </Field>
                  </div>
                  <SubmitButton variant="ghost">Set password</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
