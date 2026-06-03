import { useState, useEffect } from 'react';
import { Bot, Loader2, Send, Copy, CheckCircle, AlertTriangle, Sparkles, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

interface SupportAssistantProps {
  onRequestCreated?: () => void;
  dashboardContext?: string;
  defaultDescription?: string;
  defaultIssueType?: string;
  onReset?: () => void;
  partnerId?: string;
  brandName?: string;
}

export function SupportAssistant({ onRequestCreated, dashboardContext, defaultDescription, defaultIssueType, onReset, partnerId, brandName }: SupportAssistantProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [description, setDescription] = useState(defaultDescription || '');
  const [issueType, setIssueType] = useState(defaultIssueType || 'bug');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || '';

  // Auto-fill and trigger when defaultDescription changes
  useEffect(() => {
    if (defaultDescription && defaultDescription !== description) {
      setDescription(defaultDescription);
      setAutoTriggered(false);
    }
  }, [defaultDescription]);

  // Auto-trigger analysis when description is set from quick help
  useEffect(() => {
    if (defaultDescription && description === defaultDescription && !autoTriggered && !isAnalyzing && !aiResponse) {
      setAutoTriggered(true);
      handleAnalyze();
    }
  }, [description, defaultDescription, autoTriggered]);

  useEffect(() => {
    if (defaultIssueType) {
      setIssueType(defaultIssueType);
    }
  }, [defaultIssueType]);

  const handleAnalyze = async () => {
    if (!description.trim()) {
      toast({
        title: 'Please describe the issue',
        description: 'Enter a description of the problem you are experiencing',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAiResponse(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: requestData, error: requestError } = await supabase
        .from('support_requests')
        .insert({
          user_id: user?.id,
          issue_type: issueType,
          description: description.trim(),
          page_url: window.location.href,
          status: 'analyzing',
          dashboard_context: dashboardContext || 'admin',
        } as any)
        .select()
        .single();

      if (requestError) throw requestError;
      setCurrentRequestId(requestData.id);

      const { data, error } = await supabase.functions.invoke('support-assistant', {
        body: {
          requestId: requestData.id,
          description: description.trim(),
          issueType,
          pageUrl: window.location.href,
          dashboardContext: dashboardContext || 'admin',
          userName: profile?.full_name || '',
          partnerId,
        },
      });

      if (error) throw error;

      setAiResponse(data.response);

      await supabase
        .from('support_requests')
        .update({
          ai_response: data.response,
          ai_analyzed_at: new Date().toISOString(),
          status: 'analyzed',
        })
        .eq('id', requestData.id);

      onRequestCreated?.();
    } catch (error) {
      console.error('Error analyzing issue:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze the issue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    if (aiResponse) {
      await navigator.clipboard.writeText(aiResponse);
      toast({ title: 'Copied!', description: 'Solution copied to clipboard' });
    }
  };

  const handleMarkResolved = async () => {
    if (!currentRequestId) return;
    await supabase
      .from('support_requests')
      .update({ status: 'resolved' })
      .eq('id', currentRequestId);
    toast({ title: 'Marked as Resolved', description: 'This issue has been marked as resolved' });
    setDescription('');
    setAiResponse(null);
    setCurrentRequestId(null);
    setAutoTriggered(false);
    onRequestCreated?.();
    onReset?.();
  };

  const handleEscalate = async () => {
    if (!currentRequestId) return;
    await supabase
      .from('support_requests')
      .update({ status: 'escalated' })
      .eq('id', currentRequestId);
    toast({ title: 'Escalated to Developer', description: 'This issue has been flagged for developer review' });
    onRequestCreated?.();
  };

  const handleNewQuestion = () => {
    setDescription('');
    setAiResponse(null);
    setCurrentRequestId(null);
    setAutoTriggered(false);
    onReset?.();
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {firstName ? `Hi ${firstName}, how can I help?` : `How can ${brandName || 'PiP'} help?`}
              </CardTitle>
              <CardDescription className="mt-0.5">
                Describe your issue or question and I'll guide you step by step
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">What do you need help with?</Label>
            <Textarea
              id="description"
              placeholder="Describe what you need help with. Ask a how-to question, report an issue, or ask about any feature..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={isAnalyzing}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="issueType">Category</Label>
              <Select value={issueType} onValueChange={setIssueType} disabled={isAnalyzing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="how_to">How-To / Usage</SelectItem>
                  <SelectItem value="feature_question">Feature Question</SelectItem>
                  <SelectItem value="bug">Bug / Error</SelectItem>
                  <SelectItem value="calculation_error">Calculation Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              {aiResponse && (
                <Button variant="outline" size="lg" onClick={handleNewQuestion}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Question
                </Button>
              )}
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !description.trim()}
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ask {brandName || 'PiP'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Response */}
      {aiResponse && (
        <Card className="border-primary/20 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{brandName || 'PiP'}'s Response</CardTitle>
              </div>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-4">
            <div className="rounded-lg bg-muted/20 p-5">
              <div className="prose prose-sm max-w-none dark:prose-invert
                prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3 prose-headings:first:mt-0
                prose-h2:text-base prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                prose-h3:text-sm
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-3
                prose-li:text-muted-foreground prose-li:leading-relaxed
                prose-ul:my-2 prose-ol:my-2
                prose-strong:text-foreground prose-strong:font-medium
                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
              ">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 px-6 py-4">
            <div className="flex flex-wrap gap-3 w-full">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Solution
              </Button>
              <Button variant="default" size="sm" onClick={handleMarkResolved}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEscalate}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Escalate to Dev
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
