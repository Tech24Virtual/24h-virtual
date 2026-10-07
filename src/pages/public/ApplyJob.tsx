import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ApplicationForm } from '@/components/hiring/ApplicationForm';
import { supabase } from '@/integrations/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ApplyJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const validId = !!jobId && UUID_RE.test(jobId);

  const { data: job, isLoading } = useQuery({
    queryKey: ['public-job-posting', jobId],
    enabled: validId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_postings')
        .select('id, title, department, location, description, requirements, status')
        .eq('id', jobId!)
        .in('status', ['open', 'active'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={job ? `Apply: ${job.title}` : 'Apply'} description="Apply to join the 24H Virtual team." noindex />
      <Navigation />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-28">
        {!validId || (!isLoading && !job) ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            This position is no longer accepting applications.
          </CardContent></Card>
        ) : isLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">Loading…</div>
        ) : submitted ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <h1 className="text-2xl font-bold">Application received</h1>
              <p className="text-muted-foreground">Thanks for applying to {job?.title}. Our team will review it and be in touch by email.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{job?.title}</CardTitle>
              <CardDescription>
                {[job?.department, job?.location].filter(Boolean).join(' • ')}
              </CardDescription>
              {job?.description && <p className="text-sm text-muted-foreground whitespace-pre-line pt-2">{job.description}</p>}
              {job?.requirements && (
                <div className="pt-2">
                  <p className="text-sm font-medium">Requirements</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.requirements}</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ApplicationForm jobPostingId={job!.id} mode="public" onSubmitted={() => setSubmitted(true)} />
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
