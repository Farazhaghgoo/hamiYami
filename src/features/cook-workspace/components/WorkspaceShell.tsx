import Link from "next/link";
import type { ReactNode } from "react";
import type { I18n } from "@/i18n/i18n";
import { PageHeader } from "@/shared/layout/PageHeader";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import styles from "./Workspace.module.css";

/**
 * Frame for every cook workspace page. The workspace is a labelled simulation: there is no sign-in,
 * and nothing here may ever be reused as an authorization mechanism for a real backend.
 */
export function WorkspaceShell({
  i18n,
  title,
  lead,
  backLink = false,
  children,
}: {
  i18n: I18n;
  title: string;
  lead?: string;
  backLink?: boolean;
  children: ReactNode;
}) {
  const { t, href } = i18n;
  return (
    <main id="main" tabIndex={-1} className="container">
      {backLink ? (
        <Link href={href("/cook-workspace")} className={styles.back}>
          <Icon name="arrowLeft" />
          {t.workspace.title}
        </Link>
      ) : null}
      <PageHeader title={title} lead={lead}>
        <Notice tone="demo" title={t.workspace.simulationNoticeTitle}>
          {t.workspace.simulationNotice}
        </Notice>
      </PageHeader>
      {children}
    </main>
  );
}
