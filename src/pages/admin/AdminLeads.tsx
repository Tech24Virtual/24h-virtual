import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, MoreHorizontal, Eye, Flame, Thermometer, Snowflake, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { calculateLeadScore, getScoreLabel, getScoreBadgeClasses, type ScoringRules, DEFAULT_SCORING_RULES } from '@/lib/leadScoring';
import { ConvertLeadToAccountDialog, type ConvertLeadInput } from '@/components/admin/ConvertLeadToAccountDialog';
import { AddLeadDialog } from '@/components/admin/AddLeadDialog';

const CONVERTIBLE_STAGES = new Set(['qualified', 'sales', 'new']);

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string | null;
  score: number | null;
  created_at: string;
  pipeline_stage: string | null;
  service_type: string | null;
  plan_minutes: number | null;
}

const pipelineStageColors: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  sales: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  onboarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ready_for_billing: 'bg-cta/10 text-cta',
  active: 'bg-secondary/10 text-secondary',
  churned: 'bg-muted text-muted-foreground',
};

const pipelineStageLabels: Record<string, string> = {
  new: 'New',
  sales: 'Sales',
  onboarding: 'Onboarding',
  ready_for_billing: 'Ready for Billing',
  active: 'Active',
  churned: 'Churned',
};

const serviceLabels: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

export default function AdminLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [convertLead, setConvertLead] = useState<ConvertLeadInput | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const [scoringRules, setScoringRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES);

  useEffect(() => {
    fetchLeads();
    fetchScoringRules();
  }, []);

  const fetchScoringRules = async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'lead_scoring_rules')
      .single();
    if (data?.value) setScoringRules(data.value as unknown as ScoringRules);
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setLeads(data);
    }
    setIsLoading(false);
  };

  const updateLeadStage = async (id: string, pipeline_stage: string) => {
    await supabase.from('leads').update({ pipeline_stage }).eq('id', id);
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, pipeline_stage } : l)));
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || lead.pipeline_stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  // Count leads by stage
  const stageCounts = leads.reduce((acc, lead) => {
    const stage = lead.pipeline_stage || 'new';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Lead Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track your leads through the pipeline</p>
        </div>
        <Button onClick={() => setAddLeadOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Pipeline Stage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(pipelineStageLabels).map(([stage, label]) => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
            className={`p-3 rounded-lg border transition-all ${
              stageFilter === stage 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            }`}
          >
            <div className="text-2xl font-bold">{stageCounts[stage] || 0}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {stageFilter === 'all' 
                ? `All Leads (${leads.length})` 
                : `${pipelineStageLabels[stageFilter]} (${filteredLeads.length})`}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(pipelineStageLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No leads found</p>
              <p className="text-sm">
                {stageFilter !== 'all' 
                  ? `No leads in the "${pipelineStageLabels[stageFilter]}" stage`
                  : 'Add your first lead to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Name</TableHead>
                     <TableHead>Company</TableHead>
                     <TableHead>Score</TableHead>
                     <TableHead>Stage</TableHead>
                     <TableHead>Service</TableHead>
                     <TableHead>Source</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{lead.company || '-'}</TableCell>
                      <TableCell>
                        {(() => {
                          const score = calculateLeadScore(lead, scoringRules);
                          const label = getScoreLabel(score, scoringRules.labels);
                          return (
                            <Badge variant="secondary" className={getScoreBadgeClasses(label)}>
                              {label === 'hot' ? <Flame className="w-3 h-3 mr-1" /> : label === 'warm' ? <Thermometer className="w-3 h-3 mr-1" /> : <Snowflake className="w-3 h-3 mr-1" />}
                              {score} · {label.charAt(0).toUpperCase() + label.slice(1)}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={pipelineStageColors[lead.pipeline_stage || 'new']}
                        >
                          {pipelineStageLabels[lead.pipeline_stage || 'new']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.service_type ? (
                          <div>
                            <p className="text-sm">{serviceLabels[lead.service_type] || lead.service_type}</p>
                            {lead.plan_minutes && (
                              <p className="text-xs text-muted-foreground">{lead.plan_minutes} min</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.source || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {CONVERTIBLE_STAGES.has(lead.pipeline_stage || 'new') && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConvertLead({
                                    id: lead.id,
                                    name: lead.name,
                                    email: lead.email,
                                    company: lead.company,
                                  })
                                }
                              >
                                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                                Convert to Active Account
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'sales')}>
                              Move to Sales
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'onboarding')}>
                              Move to Onboarding
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'ready_for_billing')}>
                              Ready for Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'churned')}>
                              Mark as Churned
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConvertLeadToAccountDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(v) => !v && setConvertLead(null)}
        onConverted={() => fetchLeads()}
      />
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        onSuccess={() => fetchLeads()}
      />
    </div>
  );
}
