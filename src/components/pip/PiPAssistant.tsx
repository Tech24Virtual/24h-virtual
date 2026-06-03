import { useState, useRef } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SupportAssistant } from '@/components/admin/SupportAssistant';

interface PiPAssistantProps {
  dashboardContext: string;
  onRequestCreated?: () => void;
  partnerId?: string;
  brandName?: string;
}

const quickHelpByContext: Record<string, { label: string; question: string }[]> = {
  hr: [
    { label: '🧑‍💼 Onboard a new hire', question: 'How do I onboard a new hire?' },
    { label: '💰 Process payroll', question: 'How do I process payroll?' },
    { label: '🚪 Initiate offboarding', question: 'How do I initiate offboarding for an employee?' },
    { label: '📋 Create onboarding template', question: 'How do I create an onboarding template?' },
    { label: '📢 Send announcement', question: 'How do I send an announcement to all staff?' },
    { label: '🏖️ Approve time-off', question: 'How do I approve time-off requests?' },
  ],
  agent: [
    { label: '⏰ Clock in/out', question: 'How do I clock in and out of my shift?' },
    { label: '📄 View my scripts', question: 'How do I view my client scripts?' },
    { label: '🧾 Submit an invoice', question: 'How do I submit a shift invoice for payment?' },
    { label: '📞 Log outbound calls', question: 'How do I log outbound calls?' },
    { label: '📅 View my schedule', question: 'How do I view my schedule?' },
    { label: '✅ Manage tasks', question: 'How do I manage my assigned tasks?' },
  ],
  supervisor: [
    { label: '✅ Approve shifts', question: 'How do I approve agent shifts?' },
    { label: '👥 Manage agents', question: 'How do I manage my agents?' },
    { label: '📝 Review scripts', question: 'How do I review client scripts?' },
    { label: '📅 Manage schedule', question: 'How do I manage the team schedule?' },
    { label: '🎓 Agent onboarding', question: 'How do I onboard a new agent?' },
    { label: '📞 Outbound calls', question: 'How do I manage outbound call queues?' },
  ],
  sales: [
    { label: '🎯 Manage leads', question: 'How do I manage my leads?' },
    { label: '📊 Track pipeline', question: 'How do I track my sales pipeline?' },
    { label: '📅 Schedule meetings', question: 'How do I schedule meetings?' },
    { label: '🎫 View tickets', question: 'How do I view and manage my tickets?' },
    { label: '🚀 LaunchPad templates', question: 'What LaunchPad templates are available?' },
  ],
  billing: [
    { label: '🧾 Process invoices', question: 'How do I process invoices?' },
    { label: '❌ Handle payment failures', question: 'How do I handle payment failures?' },
    { label: '💳 Agent payouts', question: 'How do I process agent payouts?' },
  ],
  admin: [
    { label: '🏢 Manage clients', question: 'How do I manage clients?' },
    { label: '📊 View analytics', question: 'How do I view analytics?' },
    { label: '💳 Manage billing', question: 'How do I manage billing and subscriptions?' },
    { label: '👥 Manage users', question: 'How do I manage user roles and permissions?' },
    { label: '📝 Manage blog', question: 'How do I manage the blog?' },
    { label: '🎯 CRM', question: 'How do I use the CRM?' },
    { label: '🚀 LaunchPad templates', question: 'What Partner LaunchPad templates do we offer?' },
  ],
  client: [
    { label: '📞 View call logs', question: 'How do I view my call logs?' },
    { label: '📝 Change my script', question: 'How do I change my call handling script?' },
    { label: '📅 Manage schedule', question: 'How do I manage my on-call schedule?' },
    { label: '🎫 Submit a ticket', question: 'How do I submit a support ticket?' },
  ],
  tech: [
    { label: '🎫 Manage tickets', question: 'How do I manage tech support tickets?' },
    { label: '🔧 System status', question: 'How do I view system status and health?' },
  ],
  affiliate: [
    { label: '🔗 Get referral link', question: 'How do I get my referral link?' },
    { label: '💰 View earnings', question: 'How do I view my referral earnings?' },
    { label: '📊 Track referrals', question: 'How do I track my referral conversions?' },
  ],
  white_label: [
    { label: '🎨 Branding setup', question: 'How do I set up my white-label branding?' },
    { label: '👥 Manage clients', question: 'How do I manage my white-label clients?' },
    { label: '💳 Billing overview', question: 'How do I view my white-label billing?' },
    { label: '💰 Billing plan options', question: 'What are my billing plan options?' },
    { label: '📣 Manage campaigns', question: 'How do I manage campaigns?' },
  ],
  wl_client: [
    { label: '📞 View call logs', question: 'How do I view my call logs?' },
    { label: '📝 Update scripts', question: 'How do I update my call handling scripts?' },
    { label: '📅 Business hours', question: 'How do I set my business hours and on-call schedule?' },
    { label: '💳 Check billing', question: 'How do I check my billing and usage?' },
    { label: '🎫 Submit a ticket', question: 'How do I submit a support ticket?' },
  ],
};

export function PiPAssistant({ dashboardContext, onRequestCreated, partnerId, brandName }: PiPAssistantProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const supportRef = useRef<{ setDescription: (v: string) => void; setIssueType: (v: string) => void; triggerAnalyze: () => void } | null>(null);

  const cards = quickHelpByContext[dashboardContext] || quickHelpByContext.admin;

  const handleQuickHelp = (question: string) => {
    setSelectedQuestion(question);
  };

  return (
    <div className="space-y-6">
      {/* PiP Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                <Sparkles className="h-7 w-7" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {brandName || 'PiP'}
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">AI Assistant</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your AI-powered guide. Ask me anything about this portal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Help Cards */}
      {!selectedQuestion && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Quick Help
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {cards.map((card) => (
              <Button
                key={card.question}
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left text-sm font-normal hover:bg-primary/5 hover:border-primary/30 transition-all"
                onClick={() => handleQuickHelp(card.question)}
              >
                {card.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Support Assistant */}
      <SupportAssistant
        dashboardContext={dashboardContext}
        onRequestCreated={onRequestCreated}
        defaultDescription={selectedQuestion || undefined}
        defaultIssueType="how_to"
        onReset={() => setSelectedQuestion(null)}
        partnerId={partnerId}
        brandName={brandName}
      />
    </div>
  );
}
