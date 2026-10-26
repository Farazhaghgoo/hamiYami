import type { Metadata } from "next";
import { MealEditor } from "@/features/cook-workspace/components/MealEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/meals/[mealId]">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { mealId } = await params;
  const { t } = i18n;
  return pageMetadata(i18n, `/cook-workspace/meals/${mealId}`, { title: t.mealForm.editTitle, description: t.workspace.lead, index: false });
}

export default async function EditMealPage({ params }: PageProps<"/[locale]/cook-workspace/meals/[mealId]">) {
  const i18n = await getI18n(params);
  const { mealId } = await params;
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.mealForm.editTitle} backLink>
      <MealEditor mealId={mealId} />
    </WorkspaceShell>
  );
}
