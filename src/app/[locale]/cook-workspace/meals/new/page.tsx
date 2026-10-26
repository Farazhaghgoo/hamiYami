import type { Metadata } from "next";
import { MealEditor } from "@/features/cook-workspace/components/MealEditor";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace/meals/new">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/cook-workspace/meals/new", { title: t.mealForm.metaTitle, description: t.mealForm.lead, index: false });
}

export default async function NewMealPage({ params }: PageProps<"/[locale]/cook-workspace/meals/new">) {
  const i18n = await getI18n(params);
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.mealForm.createTitle} lead={i18n.t.mealForm.lead} backLink>
      <MealEditor mealId={null} />
    </WorkspaceShell>
  );
}
