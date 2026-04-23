import { requireSession } from "@/lib/auth/require-session";

export default async function DebateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/debate");
  return children;
}
