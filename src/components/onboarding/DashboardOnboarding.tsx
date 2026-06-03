import { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X, Loader2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

interface DashboardOnboardingProps {
  dashboardContext: string;
  partnerId?: string;
  brandName?: string;
  onComplete: () => void;
}

export function DashboardOnboarding({ dashboardContext, partnerId, brandName, onComplete }: DashboardOnboardingProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [stepTitle, setStepTitle] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const assistantName = brandName ? `${brandName} Assistant` : 'PiP';

  const fetchStep = async (step: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onboarding-assistant', {
        body: {
          dashboardContext,
          currentStep: step,
          userName: profile?.full_name || '',
          partnerId,
        },
      });

      if (error) throw error;
      setResponse(data.response);
      setTotalSteps(data.totalSteps);
      setStepTitle(data.stepTitle || '');
      setCurrentStep(data.currentStep);
    } catch (e) {
      console.error('Onboarding fetch error:', e);
      setResponse('Unable to load onboarding guidance. You can skip this and explore on your own!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStep(0);
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      fetchStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      fetchStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);
      await refreshProfile();
    }
    setOpen(false);
    onComplete();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isLastStep = currentStep >= totalSteps - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {assistantName}: Getting Started
            </DialogTitle>
          </div>
          {totalSteps > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{stepTitle}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </DialogHeader>

        <div className="min-h-[200px] max-h-[400px] overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading guidance...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert
              prose-headings:text-foreground prose-headings:font-semibold
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground
            ">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            <X className="h-4 w-4 mr-1" />
            Skip Tour
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={handleComplete} disabled={isLoading}>
                Complete Tour
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext} disabled={isLoading}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
