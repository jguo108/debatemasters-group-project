"use client";

import { MaterialIcon } from "./MaterialIcon";

export function MobileMenuButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="md:hidden fixed right-4 top-4 z-[60] flex h-12 w-12 items-center justify-center border-4 border-stone-800 bg-black text-white shadow-[-4px_4px_0px_0px_rgba(0,0,0,0.6)]"
      aria-label={open ? "Close menu" : "Open menu"}
    >
      <MaterialIcon name="menu" />
    </button>
  );
}

export function MobileBackdrop({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <button
      type="button"
      className="fixed inset-0 z-[45] bg-black/70 md:hidden"
      aria-label="Close menu"
      onClick={onClose}
    />
  );
}
