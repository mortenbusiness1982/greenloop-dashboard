import { AdminUserDetailWorkspace } from "@/components/admin/AdminDetailWorkspaces";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminUserDetailWorkspace id={id} />;
}
