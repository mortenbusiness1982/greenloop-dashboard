import { CrmPlaceholderPage } from "@/components/crm/CrmPlaceholderPage";

type PageProps = {
  params: Promise<{ crm?: string[] }>;
};

export default async function BrandCrmRoute({ params }: PageProps) {
  const { crm = ["overview"] } = await params;
  return <CrmPlaceholderPage workspace="brand" segments={crm} />;
}
