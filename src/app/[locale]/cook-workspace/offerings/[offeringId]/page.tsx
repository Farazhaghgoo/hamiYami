import type { Metadata } from "next";
import { OfferingEditor } from "@/features/cook-workspace/components/OfferingEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/offerings/[offeringId]">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { offeringId } = await params;
  const { t } = i18n;
  return pageMetadata(i18n, `/cook-workspace/offerings/${offeringId}`, { title: t.offeringForm.editTitle, description: t.workspace.lead, index: false });
}

export default async function EditOfferingPage({ params }: PageProps<"/[locale]/cook-workspace/offerings/[offeringId]">) {
  const i18n = await getI18n(params);
  const { offeringId } = await params;
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.offeringForm.editTitle} backLink>
      <OfferingEditor offeringId={offeringId} presetMealId={null} />
    </WorkspaceShell>
  );
}
