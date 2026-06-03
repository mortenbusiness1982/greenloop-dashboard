import { AdminChallengeDetailWorkspace } from "@/components/admin/AdminDetailWorkspaces";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminChallengeDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminChallengeDetailWorkspace id={id} />;
}
