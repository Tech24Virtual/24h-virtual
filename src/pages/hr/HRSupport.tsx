import { HRLayout } from '@/components/hr/HRLayout';
import { PiPAssistant } from '@/components/pip/PiPAssistant';

export default function HRSupport() {
  return (
    <HRLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">PiP Assistant</h1>
          <p className="text-muted-foreground mt-1">Your AI-powered guide to the HR Portal</p>
        </div>
        <PiPAssistant dashboardContext="hr" />
      </div>
    </HRLayout>
  );
}
