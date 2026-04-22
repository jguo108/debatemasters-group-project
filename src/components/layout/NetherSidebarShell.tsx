"use client";

import { useState, type ReactNode } from "react";
import { MobileBackdrop, MobileMenuButton } from "@/components/MobileMenuButton";

export function NetherSidebarShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside
        className={`fixed top-0 z-[48] flex h-full w-64 flex-col border-stone-800 bg-black transition-transform max-md:right-0 max-md:border-l-4 max-md:shadow-[-4px_0px_0px_0px_rgba(0,0,0,0.5)] md:left-0 md:border-r-4 md:shadow-[4px_0px_0px_0px_rgba(0,0,0,0.5)] ${
          open ? "translate-x-0" : "translate-x-full"
        } md:translate-x-0`}
      >
        {sidebar}
      </aside>
      <MobileBackdrop open={open} onClose={() => setOpen(false)} />
      <MobileMenuButton open={open} onToggle={() => setOpen((v) => !v)} />
      <div className="relative z-10 min-h-screen w-full md:ml-64">{children}</div>
    </>
  );
}
