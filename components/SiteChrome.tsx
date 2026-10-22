"use client";

import { usePathname } from "next/navigation";

/**
 * The public header/footer wrap every page except the admin dashboard,
 * which has its own chrome (app/admin/layout.tsx).
 */
export default function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      {header}
      <main id="main" className="min-h-[70vh]">
        {children}
      </main>
      {footer}
    </>
  );
}
