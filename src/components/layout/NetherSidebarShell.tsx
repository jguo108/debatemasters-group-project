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
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r-4 border-stone-800 bg-black shadow-[4px_0px_0px_0px_rgba(0,0,0,0.5)] transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>
      <MobileBackdrop open={open} onClose={() => setOpen(false)} />
      <MobileMenuButton onOpen={() => setOpen(true)} />
      <div className="relative z-10 min-h-screen w-full md:ml-64">{children}</div>
    </>
  );
}
