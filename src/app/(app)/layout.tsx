import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { usersRepo } from "@/server/repo/users.repo";
import { AppShell } from "@/components/domain/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  const profile = usersRepo.profile(userId);
  if (!profile) redirect("/login");

  return (
    <AppShell
      displayName={profile.display_name}
      avatar={profile.avatar}
      xp={profile.xp}
      streak={profile.streak}
    >
      {children}
    </AppShell>
  );
}
