import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { GroupsManager } from "@/components/groups-manager";
import { getMyGroups, getActiveGroup } from "@/lib/groups";

export const metadata = { title: "Groupes · DaronsFC" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [groups, active] = await Promise.all([
    getMyGroups(session.user.id),
    getActiveGroup(session.user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Mes groupes"
        subtitle="Choisis un groupe, crée le tien ou rejoins tes amis"
      />
      <GroupsManager groups={groups} activeId={active?.id ?? null} />
    </>
  );
}
