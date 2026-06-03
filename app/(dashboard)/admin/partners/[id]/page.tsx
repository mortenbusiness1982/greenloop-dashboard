import { AdminPartnerDetailWorkspace } from "@/components/admin/AdminDetailWorkspaces";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPartnerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminPartnerDetailWorkspace id={id} />;
}
