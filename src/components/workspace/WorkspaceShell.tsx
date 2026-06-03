import { ReactNode, useEffect, useState } from 'react';
import { WorkspaceIconRail } from './WorkspaceIconRail';
import { WorkspaceTopbar } from './WorkspaceTopbar';
import { SlackDrawer } from './SlackDrawer';

interface Props {
  children: ReactNode;
}

export function WorkspaceShell({ children }: Props) {
  const [slackOpen, setSlackOpen] = useState(false);

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
        <WorkspaceTopbar onOpenSlack={() => setSlackOpen(true)} />
        <main className="flex-1 flex overflow-hidden min-h-0">
          {children}
        </main>
      </div>
      <SlackDrawer open={slackOpen} onOpenChange={setSlackOpen} />
    </div>
  );
}
