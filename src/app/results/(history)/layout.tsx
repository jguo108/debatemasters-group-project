import { requireSession } from "@/lib/auth/require-session";

export default async function ResultsHistoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/results");
  return children;
}
