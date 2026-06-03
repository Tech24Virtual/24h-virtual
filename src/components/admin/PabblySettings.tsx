import { useState, useEffect } from 'react';
import { Copy, Plus, Pencil, Trash2, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClientMappingDialog } from './ClientMappingDialog';
import { format } from 'date-fns';

interface ClientMapping {
  id: string;
  lead_id: string;
  match_type: string;
  match_value: string;
  is_active: boolean;
  created_at: string;
  lead?: {
    name: string;
    company: string | null;
  };
}

interface CallReportImport {
  id: string;
  lead_id: string | null;
  import_source: string;
  original_filename: string | null;
  import_status: string;
  records_imported: number | null;
  records_failed: number | null;
  email_subject: string | null;
  email_from: string | null;
  received_at: string | null;
  processed_at: string | null;
  created_at: string | null;
  lead?: {
    name: string;
    company: string | null;
  };
}

export function PabblySettings() {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<ClientMapping[]>([]);
  const [imports, setImports] = useState<CallReportImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ClientMapping | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-call-report`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch mappings with lead names
    const { data: mappingsData, error: mappingsError } = await supabase
      .from('client_report_mappings')
      .select(`
        *,
        lead:leads(name, company)
      `)
      .order('created_at', { ascending: false });

    if (!mappingsError && mappingsData) {
      setMappings(mappingsData as ClientMapping[]);
    }

    // Fetch recent imports
    const { data: importsData, error: importsError } = await supabase
      .from('call_report_imports')
      .select(`
        *,
        lead:leads(name, company)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!importsError && importsData) {
      setImports(importsData as CallReportImport[]);
    }

    setIsLoading(false);
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copied!',
      description: 'Webhook URL copied to clipboard',
    });
  };

  const handleAddMapping = () => {
    setEditingMapping(null);
    setDialogOpen(true);
  };

  const handleEditMapping = (mapping: ClientMapping) => {
    setEditingMapping(mapping);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    const { error } = await supabase
      .from('client_report_mappings')
      .delete()
      .eq('id', deletingId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete mapping',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Mapping has been removed',
      });
      fetchData();
    }

    setDeleteConfirmOpen(false);
    setDeletingId(null);
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setEditingMapping(null);
    if (refresh) {
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Pabbly Connect Integration
          </CardTitle>
          <CardDescription>
            Configure Pabbly Connect to send call reports to this webhook URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyWebhookUrl}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add this URL to your Pabbly workflow with header: <code className="bg-muted px-1 rounded">X-Pabbly-Secret: your_secret</code>
          </p>
        </CardContent>
      </Card>

      {/* Client Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Client Mappings</CardTitle>
            <CardDescription>
              Map email patterns to clients for automatic report routing
            </CardDescription>
          </div>
          <Button onClick={handleAddMapping}>
            <Plus className="w-4 h-4 mr-2" />
            Add Mapping
          </Button>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No mappings configured yet. Add one to automatically route call reports to clients.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Match Pattern</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">
                      {mapping.lead?.name || 'Unknown'}
                      {mapping.lead?.company && (
                        <span className="text-muted-foreground ml-1">
                          ({mapping.lead.company})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {mapping.match_value}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {mapping.match_type === 'subject_pattern' ? 'Subject' : 
                         mapping.match_type === 'sender_email' ? 'Sender' : 
                         mapping.match_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mapping.is_active ? (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditMapping(mapping)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteClick(mapping.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>
            Call report import history from Pabbly Connect
          </CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No imports yet. Configure Pabbly Connect to start receiving call reports.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((importRecord) => (
                  <TableRow key={importRecord.id}>
                    <TableCell>
                      {importRecord.created_at ? format(new Date(importRecord.created_at), 'MMM d, h:mm a') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {importRecord.lead?.name || (
                        <span className="text-muted-foreground">No client matched</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{importRecord.import_source}</Badge>
                    </TableCell>
                    <TableCell>
                      {importRecord.records_imported || 0} imported
                      {importRecord.records_failed && importRecord.records_failed > 0 && (
                        <span className="text-destructive ml-1">
                          ({importRecord.records_failed} failed)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(importRecord.import_status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ClientMappingDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        mapping={editingMapping}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mapping? Future imports will no longer be automatically routed to this client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
