import { requireSession } from "@/lib/auth/require-session";

export default async function ArenaSetupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/arena/setup");
  return children;
}
