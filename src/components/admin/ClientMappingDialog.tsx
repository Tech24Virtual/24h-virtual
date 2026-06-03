import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClientMapping {
  id: string;
  lead_id: string;
  match_type: string;
  match_value: string;
  is_active: boolean;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  company: string | null;
}

interface ClientMappingDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  mapping: ClientMapping | null;
}

export function ClientMappingDialog({ open, onClose, mapping }: ClientMappingDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    lead_id: '',
    match_type: 'subject_pattern',
    match_value: '',
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      fetchLeads();
      if (mapping) {
        setFormData({
          lead_id: mapping.lead_id,
          match_type: mapping.match_type,
          match_value: mapping.match_value,
          is_active: mapping.is_active,
        });
      } else {
        setFormData({
          lead_id: '',
          match_type: 'subject_pattern',
          match_value: '',
          is_active: true,
        });
      }
    }
  }, [open, mapping]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, company')
      .in('status', ['client', 'active'])
      .order('name');

    if (!error && data) {
      setLeads(data);
    }
  };

  const handleSubmit = async () => {
    if (!formData.lead_id || !formData.match_value) {
      toast({
        title: 'Validation Error',
        description: 'Please select a client and enter a match pattern',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    if (mapping) {
      // Update existing
      const { error } = await supabase
        .from('client_report_mappings')
        .update({
          lead_id: formData.lead_id,
          match_type: formData.match_type,
          match_value: formData.match_value,
          is_active: formData.is_active,
        })
        .eq('id', mapping.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update mapping',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Updated',
          description: 'Mapping has been updated',
        });
        onClose(true);
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('client_report_mappings')
        .insert({
          lead_id: formData.lead_id,
          match_type: formData.match_type,
          match_value: formData.match_value,
          is_active: formData.is_active,
        });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create mapping',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Created',
          description: 'New mapping has been added',
        });
        onClose(true);
      }
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mapping ? 'Edit' : 'Add'} Client Mapping</DialogTitle>
          <DialogDescription>
            Map email patterns to automatically route call reports to clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select
              value={formData.lead_id}
              onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} {lead.company && `(${lead.company})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchType">Match Type</Label>
            <Select
              value={formData.match_type}
              onValueChange={(value) => setFormData({ ...formData, match_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subject_pattern">Email Subject Contains</SelectItem>
                <SelectItem value="sender_email">Sender Email</SelectItem>
                <SelectItem value="campaign">Campaign Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchValue">Match Pattern</Label>
            <Input
              id="matchValue"
              placeholder={
                formData.match_type === 'sender_email' 
                  ? 'reports@callcenter.com' 
                  : formData.match_type === 'campaign'
                  ? 'ABC Corp Main'
                  : 'ABC Corp'
              }
              value={formData.match_value}
              onChange={(e) => setFormData({ ...formData, match_value: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              {formData.match_type === 'subject_pattern' && 
                'Text that must appear in the email subject line'}
              {formData.match_type === 'sender_email' && 
                'The sender email address to match'}
              {formData.match_type === 'campaign' && 
                'The campaign name from the call center'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable this mapping
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mapping ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
