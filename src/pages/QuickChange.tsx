import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import logoBlue from '@/assets/logos/logo-blue.png';

const REQUEST_TYPES = [
  { value: 'greeting_change', label: 'Change Greeting' },
  { value: 'faq_update', label: 'Edit Existing FAQ' },
  { value: 'new_faq', label: 'Add New FAQ' },
  { value: 'remove_faq', label: 'Remove FAQ' },
  { value: 'call_rules', label: 'Call Handling Rules' },
  { value: 'full_script', label: 'Full Script Update' },
  { value: 'other', label: 'Other' },
];

export default function QuickChange() {
  const { token } = useParams<{ token: string }>();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [requestType, setRequestType] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) { setIsInvalid(true); setIsValidating(false); return; }

    try {
      const { data, error } = await supabase
        .from('client_quick_links')
        .select('client_id')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setIsInvalid(true);
        setIsValidating(false);
        return;
      }

      setClientId(data.client_id);

      // Fetch client name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.client_id)
        .single();

      setClientName(profile?.full_name || 'Client');
    } catch {
      setIsInvalid(true);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!clientId || !title.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('script_change_requests').insert({
        client_id: clientId,
        request_type: requestType,
        title: title.trim(),
        description: description.trim() || null,
        proposed_changes: {},
        source: 'quick_link',
      });

      if (error) throw error;
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={logoBlue} alt="24H Virtual" className="h-10 mx-auto mb-4" />
        </div>

        {isValidating ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Validating your link...
            </CardContent>
          </Card>
        ) : isInvalid ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Invalid or Expired Link</h2>
              <p className="text-muted-foreground">
                This quick-change link is no longer valid. Please contact your account manager for a new link.
              </p>
            </CardContent>
          </Card>
        ) : isSubmitted ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-lg font-semibold mb-2">Request Submitted!</h2>
              <p className="text-muted-foreground">
                Your change request has been received. Your supervisor will review it shortly and you'll be notified once it's processed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submit a Script Change Request</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hi {clientName}! Use this form to request changes to your call scripts.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>What do you want to change? *</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="q-title">Title *</Label>
                <Input
                  id="q-title"
                  placeholder="e.g., Update holiday greeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="q-desc">Description</Label>
                <Textarea
                  id="q-desc"
                  placeholder="Describe exactly what you'd like changed..."
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isSaving || !title.trim()}
              >
                {isSaving ? 'Submitting...' : 'Submit Request'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
