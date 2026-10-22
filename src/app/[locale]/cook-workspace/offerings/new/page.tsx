import type { Metadata } from "next";
import { OfferingEditor } from "@/features/cook-workspace/components/OfferingEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/offerings/new">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.offeringForm.createTitle };
}

export default async function NewOfferingPage({ params, searchParams }: PageProps<"/[locale]/cook-workspace/offerings/new">) {
  const i18n = await getI18n(params);
  const { meal } = await searchParams;
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.offeringForm.createTitle} backLink>
      <OfferingEditor offeringId={null} presetMealId={typeof meal === "string" ? meal : null} />
    </WorkspaceShell>
  );
}
