import { AdminBrandDetailWorkspace } from "@/components/admin/AdminDetailWorkspaces";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminBrandDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminBrandDetailWorkspace id={id} />;
}
