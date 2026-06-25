import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Clock, CheckCircle, AlertTriangle, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { PiPAssistant } from '@/components/pip/PiPAssistant';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface SupportRequest {
  id: string;
  issue_type: string;
  description: string;
  page_url: string | null;
  ai_response: string | null;
  ai_analyzed_at: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
}

export default function AdminSupport() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery<SupportRequest[]>({
    queryKey: ['admin-support-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case 'escalated':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Escalated</Badge>;
      case 'analyzed':
        return <Badge variant="secondary"><Bot className="w-3 h-3 mr-1" /> Analyzed</Badge>;
      case 'analyzing':
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getIssueTypeBadge = (type: string) => {
    switch (type) {
      case 'bug':
        return <Badge variant="destructive">Bug</Badge>;
      case 'calculation_error':
        return <Badge className="bg-orange-500">Calculation</Badge>;
      case 'feature_question':
        return <Badge variant="secondary">Feature</Badge>;
      case 'how_to':
        return <Badge variant="outline">How-To</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const escalatedCount = requests.filter(r => r.status === 'escalated').length;
  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'analyzing').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">PiP Assistant</h1>
        <p className="text-muted-foreground mt-1">Your AI-powered guide to the Admin Portal</p>
      </div>

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">Ask PiP</TabsTrigger>
          <TabsTrigger value="history">
            History
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalated">
            Escalated
            {escalatedCount > 0 && (
              <Badge variant="destructive" className="ml-2">{escalatedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <PiPAssistant dashboardContext="admin" onRequestCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-support-requests'] })} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Support History</CardTitle>
              <CardDescription>All support requests and AI analyses</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No support requests yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="max-w-md">Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(request.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>{getIssueTypeBadge(request.issue_type)}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {request.description}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalated" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Escalated Issues</CardTitle>
              <CardDescription>Issues that need developer attention</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.filter(r => r.status === 'escalated').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No escalated issues
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="max-w-md">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.filter(r => r.status === 'escalated').map((request) => (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(request.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>{getIssueTypeBadge(request.issue_type)}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {request.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Support Request
              {selectedRequest && getStatusBadge(selectedRequest.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Issue Type</h4>
                {getIssueTypeBadge(selectedRequest.issue_type)}
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              {selectedRequest.page_url && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Page URL</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{selectedRequest.page_url}</code>
                </div>
              )}

              {selectedRequest.ai_response && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">PiP's Analysis</h4>
                  <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/50 p-4 rounded-lg">
                    <ReactMarkdown>{selectedRequest.ai_response}</ReactMarkdown>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created: {format(new Date(selectedRequest.created_at), 'MMMM d, yyyy h:mm a')}
                {selectedRequest.ai_analyzed_at && (
                  <> • Analyzed: {format(new Date(selectedRequest.ai_analyzed_at), 'MMMM d, yyyy h:mm a')}</>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
