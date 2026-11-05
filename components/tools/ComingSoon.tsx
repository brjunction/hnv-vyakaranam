import Link from "next/link";

export default function ComingSoon({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center">
      <h1 className="text-xl font-semibold sm:text-2xl">{name}</h1>
      <p className="mt-3 inline-block rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--fg-muted)]">Coming soon</p>
      <p className="mt-6">
        <Link href="/tools" className="rounded-full border border-[var(--border)] px-5 py-2.5 hover:border-[var(--accent)]">All tools</Link>
      </p>
    </div>
  );
}
