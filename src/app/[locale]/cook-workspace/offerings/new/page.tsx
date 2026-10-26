import type { Metadata } from "next";
import { OfferingEditor } from "@/features/cook-workspace/components/OfferingEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/offerings/new">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/cook-workspace/offerings/new", { title: t.offeringForm.metaTitle, description: t.offeringForm.lead, index: false });
}

export default async function NewOfferingPage({ params, searchParams }: PageProps<"/[locale]/cook-workspace/offerings/new">) {
  const i18n = await getI18n(params);
  const { meal } = await searchParams;
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.offeringForm.createTitle} lead={i18n.t.offeringForm.lead} backLink>
      <OfferingEditor offeringId={null} presetMealId={typeof meal === "string" ? meal : null} />
    </WorkspaceShell>
  );
}
