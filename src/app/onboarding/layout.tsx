import { requireSession } from "@/lib/auth/require-session";

/** Server auth gate (middleware can be absent in webpack dev). */
export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession("/onboarding");
  return children;
}
