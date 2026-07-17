import { ReactNode, useEffect } from 'react';
import { SupervisorWorkspaceIconRail } from './SupervisorWorkspaceIconRail';
import { SupervisorWorkspaceTopbar } from './SupervisorWorkspaceTopbar';

interface Props {
  children: ReactNode;
}

export function SupervisorWorkspaceShell({ children }: Props) {
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
      <SupervisorWorkspaceIconRail />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SupervisorWorkspaceTopbar messagesHref="/staff/supervisor/messages" />
        <main className="flex-1 flex overflow-hidden min-h-0">{children}</main>
      </div>
    </div>
  );
}
