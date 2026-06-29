import { Component, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OutboundCallQueue } from '@/components/staff/OutboundCallQueue';
import { CreateOutboundRequestDialog } from '@/components/admin/CreateOutboundRequestDialog';

// ── Error boundary — catches uncaught render errors in OutboundCallQueue ──

interface EBState { error: Error | null }

class OutboundErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3" />
            <p className="font-semibold">Failed to load call queue</p>
            <p className="text-sm text-muted-foreground mt-1">{this.state.error.message}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminOutboundCalls() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Outbound Call Requests</h1>
            <p className="text-muted-foreground mt-1">Full oversight of all outbound call requests across all agents</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Outbound Request
          </Button>
        </div>
      </div>

      {/* Queue — wrapped in error boundary so render errors don't blank the page */}
      <OutboundErrorBoundary>
        <OutboundCallQueue role="admin" />
      </OutboundErrorBoundary>

      <CreateOutboundRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
