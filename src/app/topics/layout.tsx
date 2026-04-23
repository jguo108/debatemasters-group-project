import { requireSession } from "@/lib/auth/require-session";

export default async function TopicsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/topics");
  return children;
}
