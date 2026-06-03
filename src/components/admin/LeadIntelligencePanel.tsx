import { useState } from 'react';
import { Brain, Loader2, Copy, ChevronDown, ChevronUp, Target, MessageSquare, Shield, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LeadInsights {
  priority_score: number;
  priority_reason: string;
  recommended_actions: string[];
  talking_points: string[];
  objection_handling: { objection: string; response: string }[];
  ideal_contact_time: string;
  close_probability: number;
  next_best_action: string;
}

interface Props {
  lead: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    service_type?: string | null;
    plan_minutes?: number | null;
    source?: string | null;
    notes?: string | null;
    score?: number | null;
    phone?: string | null;
  };
}

export function LeadIntelligencePanel({ lead }: Props) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<LeadInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [objectionsOpen, setObjectionsOpen] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-lead-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ lead }),
        }
      );

      if (resp.status === 429) {
        toast({ title: 'Rate limited', description: 'Please wait a moment before generating again.', variant: 'destructive' });
        return;
      }

      if (!resp.ok) throw new Error('Failed to generate insights');

      const data = await resp.json();
      setInsights(data);
    } catch (err: any) {
      toast({ title: 'Error generating insights', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Text copied to clipboard.' });
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Lead Intelligence
            </CardTitle>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {!insights ? (
              <Button onClick={generateInsights} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Lead...</>
                ) : (
                  <><Brain className="w-4 h-4 mr-2" /> Generate AI Insights</>
                )}
              </Button>
            ) : (
              <div className="space-y-5">
                {/* Priority & Close Probability */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border text-center">
                    <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{insights.priority_score}/10</div>
                    <div className="text-xs text-muted-foreground">Priority Score</div>
                  </div>
                  <div className="p-3 rounded-lg border text-center">
                    <div className="text-2xl font-bold">{Math.round(insights.close_probability * 100)}%</div>
                    <Progress value={insights.close_probability * 100} className="mt-1" />
                    <div className="text-xs text-muted-foreground mt-1">Close Probability</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">{insights.priority_reason}</p>

                {/* Next Best Action */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{insights.next_best_action}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => copyToClipboard(insights.next_best_action)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Contact Time */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Best time:</span>
                  <span className="font-medium">{insights.ideal_contact_time}</span>
                </div>

                {/* Recommended Actions */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> Recommended Actions
                  </h4>
                  <ul className="space-y-1.5">
                    {insights.recommended_actions.map((action, i) => (
                      <li key={i} className="text-sm flex items-start justify-between gap-2 p-2 rounded border">
                        <span>• {action}</span>
                        <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6" onClick={() => copyToClipboard(action)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Talking Points */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Talking Points
                  </h4>
                  <ul className="space-y-1">
                    {insights.talking_points.map((point, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded border">
                        <span className="text-primary font-bold">›</span> {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Objection Handling */}
                <Collapsible open={objectionsOpen} onOpenChange={setObjectionsOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full">
                    <Shield className="h-3.5 w-3.5" /> Objection Handling
                    {objectionsOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {insights.objection_handling.map((obj, i) => (
                      <div key={i} className="p-3 rounded-lg border space-y-1">
                        <p className="text-sm font-medium text-destructive">"{obj.objection}"</p>
                        <p className="text-sm text-muted-foreground">{obj.response}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Regenerate */}
                <Button variant="outline" size="sm" onClick={generateInsights} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Regenerate Insights
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
