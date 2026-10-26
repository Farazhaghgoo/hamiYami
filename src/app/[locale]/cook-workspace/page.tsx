import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceShell } from "@/features/cook-workspace/components/WorkspaceShell";
import { WorkspaceView } from "@/features/cook-workspace/components/WorkspaceView";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import styles from "../content.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/cook-workspace">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/cook-workspace", { title: t.workspace.title, description: t.workspace.lead, index: false });
}

export default async function CookWorkspacePage({ params }: PageProps<"/[locale]/cook-workspace">) {
  const i18n = await getI18n(params);
  return (
    <WorkspaceShell i18n={i18n} title={i18n.t.workspace.title} lead={i18n.t.workspace.lead}>
      <Suspense>
        <WorkspaceView />
      </Suspense>
      <section className={styles.block} aria-labelledby="try-title">
        <h2 id="try-title">{i18n.t.workspace.tryTitle}</h2>
        <ul className={styles.bullets}>
          {i18n.t.workspace.tryItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </WorkspaceShell>
  );
}
