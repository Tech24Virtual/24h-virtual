import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { captureLead } from '@/lib/intake/captureLead';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle } from 'lucide-react';

export function BlogLeadForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await captureLead({
        name: 'Blog Subscriber',
        email,
        source: 'blog_lead',
      });
      setSubmitted(true);
      toast.success('Thanks for subscribing!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
        <p className="font-semibold">You're subscribed!</p>
        <p className="text-sm text-muted-foreground">We'll send you the best industry insights.</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-card border">
      <h4 className="font-bold mb-1">Stay Updated</h4>
      <p className="text-sm text-muted-foreground mb-3">Get the latest industry tips delivered weekly.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" variant="cta" size="sm" disabled={loading} className="rounded-full">
          {loading ? '...' : <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">No spam. Unsubscribe anytime.</p>
    </div>
  );
}
