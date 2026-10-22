import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { WorkspaceView } from "@/features/cook-workspace/components/WorkspaceView";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.workspace.title };
}

export default async function CookWorkspacePage({ params }: PageProps<"/[locale]/cook-workspace">) {
  const i18n = await getI18n(params);
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.workspace.title} lead={i18n.t.workspace.lead}>
      <Suspense>
        <WorkspaceView />
      </Suspense>
    </WorkspaceShell>
  );
}
