import { requireSession } from "@/lib/auth/require-session";

export default async function MatchmakingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/matchmaking");
  return children;
}
