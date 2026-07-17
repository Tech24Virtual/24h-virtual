import { ReactNode, useEffect } from 'react';
import { WorkspaceIconRail } from './WorkspaceIconRail';
import { WorkspaceTopbar } from './WorkspaceTopbar';

interface Props {
  children: ReactNode;
}

export function WorkspaceShell({ children }: Props) {
  // Lock body scroll while in workspace
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-foreground">
      <WorkspaceIconRail />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkspaceTopbar messagesHref="/staff/agent/messages" />
        <main className="flex-1 flex overflow-hidden min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
