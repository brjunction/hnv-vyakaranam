import { requireUser } from "@/lib/auth/session";
import { FEATURES, getFeatures } from "@/lib/features";
import FeatureSwitches from "@/components/admin/FeatureSwitches";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  await requireUser("developer");
  const on = await getFeatures();
  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="text-2xl font-semibold">Developer</h1>
      <p className="mt-1 text-sm text-[var(--a-fg-muted)]">New features stay hidden on the website until you turn them on here. Only you can see this page.</p>
      <FeatureSwitches features={FEATURES.map((f) => ({ ...f, on: on[f.key] }))} />
    </div>
  );
}
