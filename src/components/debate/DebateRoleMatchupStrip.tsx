"use client";

export function DebateRoleMatchupStrip({
  userRole,
  opponentName,
}: {
  userRole: "pro" | "con";
  opponentName: string;
}) {
  const proLabelName = userRole === "pro" ? "You" : opponentName;
  const conLabelName = userRole === "con" ? "You" : opponentName;

  return (
    <div className="flex flex-wrap items-center justify-start gap-4 border-4 border-red-900 bg-black/80 px-3 py-2 text-left pixel-text-xs font-black uppercase tracking-widest text-stone-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] md:px-4">
      <span className="flex items-center gap-2 text-primary-fixed">
        <span
          className={`inline-block h-3 w-3 border-2 border-primary shadow-sm ${
            userRole === "pro" ? "bg-primary" : "bg-stone-700"
          }`}
          aria-hidden
        />
        Pro: <span className="text-white normal-case">{proLabelName}</span>
      </span>
      <span className="flex items-center gap-2 text-tertiary-fixed">
        <span
          className={`inline-block h-3 w-3 border-2 border-tertiary shadow-sm ${
            userRole === "con" ? "bg-tertiary" : "bg-stone-700"
          }`}
          aria-hidden
        />
        Con: <span className="text-white normal-case">{conLabelName}</span>
      </span>
    </div>
  );
}
