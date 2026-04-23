import { requireSession } from "@/lib/auth/require-session";

export default async function DebateResultDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ debateId: string }>;
}>) {
  const { debateId } = await params;
  await requireSession(`/results/${encodeURIComponent(debateId)}`);
  return children;
}
