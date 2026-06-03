import { AdminRewardDetailWorkspace } from "@/components/admin/AdminDetailWorkspaces";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminRewardDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminRewardDetailWorkspace id={id} />;
}
