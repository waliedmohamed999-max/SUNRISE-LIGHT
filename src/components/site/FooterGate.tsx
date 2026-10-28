"use client";

import { usePathname } from "next/navigation";

/** The marketing footer is not shown inside work areas (factory dashboard, sign-in). */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (/^\/(ar|en)\/(admin|login|register)(\/|$)/.test(pathname)) return null;
  return <>{children}</>;
}
