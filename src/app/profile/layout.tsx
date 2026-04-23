import { requireSession } from "@/lib/auth/require-session";

export default async function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/profile");
  return children;
}
