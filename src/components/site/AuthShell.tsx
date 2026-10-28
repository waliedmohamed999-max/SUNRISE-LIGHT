import { Suspense } from "react";
import { LogoMark } from "./Logo";

export function AuthShell({ title, aside, children }: { title: string; aside: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4.5rem)] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-e border-dashed border-cork p-12 lg:flex">
        <LogoMark className="size-14" />
        <p className="max-w-md text-[29px] leading-[1.15] font-medium text-cream">{aside}</p>
      </div>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-[41px] leading-[0.9] font-medium text-cream">{title}</h1>
          <div className="rule my-8" />
          <Suspense>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
