import type { Metadata } from "next";
import { MealEditor } from "@/features/cook-workspace/components/MealEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/meals/[mealId]">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.mealForm.editTitle };
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
