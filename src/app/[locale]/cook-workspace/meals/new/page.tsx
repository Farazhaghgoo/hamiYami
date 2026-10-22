import type { Metadata } from "next";
import { MealEditor } from "@/features/cook-workspace/components/MealEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/meals/new">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.mealForm.createTitle };
}

export default async function NewMealPage({ params }: PageProps<"/[locale]/cook-workspace/meals/new">) {
  const i18n = await getI18n(params);
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.mealForm.createTitle} backLink>
      <MealEditor mealId={null} />
    </WorkspaceShell>
  );
}
