import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";
import AdminNav from "@/components/admin/AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("viewer");
  return (
    <div className="lg:grid lg:grid-cols-[248px_1fr] min-h-dvh">
      <aside className="hero-night lg:sticky lg:top-0 lg:h-dvh flex lg:flex-col gap-4 px-4 py-3 lg:p-5 items-center lg:items-stretch">
        <Link href="/admin" className="flex items-center gap-2.5 lg:mb-6">
          <Image src="/hnvlogo.png" alt="" width={32} height={32} />
          <span className="font-semibold text-lg leading-tight hidden sm:block">HNV Admin</span>
        </Link>
        <AdminNav role={user.role} />
        <div className="ml-auto lg:ml-0 lg:mt-auto flex lg:flex-col items-center lg:items-stretch gap-2 text-sm">
          <span className="hidden lg:block text-[var(--hero-muted)] truncate" title={user.email}>
            {user.name} · {user.role}
          </span>
          <Link href="/" className="hidden lg:block text-[var(--hero-muted)] hover:text-white">
            View site
          </Link>
          <form action={logout}>
            <button className="rounded-lg border border-white/20 px-3 py-1.5 hover:border-white">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-5xl w-full">{children}</div>
    </div>
  );
}
