import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/campaign-os/useCampaigns';
import { useCampaignScenarios } from '@/hooks/campaign-os/useCampaignScenarios';
import { useUpdateCampaign, useUpsertScenario, useApproveScenario, useArchiveScenario } from '@/hooks/campaign-os/useCampaignMutations';
import { useClientContacts } from '@/hooks/campaign-os/useClientContacts';
import { useDepartmentNumbers } from '@/hooks/campaign-os/useDepartmentNumbers';
import { useCampaignFields } from '@/hooks/campaign-os/useCampaignFields';
import { useCampaignFaqs } from '@/hooks/campaign-os/useCampaignFaqs';
import { useCampaignPolicies } from '@/hooks/campaign-os/useCampaignPolicies';
import { useFiveNineMappings } from '@/hooks/campaign-os/useFiveNineMappings';
import { useBuildPacketData } from '@/hooks/campaign-os/useBuildPacketData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Download, Plus, Pencil, Check, Archive, ExternalLink, Inbox, Phone, MessageSquare, FileQuestion, ShieldAlert, ListChecks, Settings2, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { renderBuildPacketPdf, slugify } from '@/lib/campaign-os/buildPacketPdf';
import type { CampaignScenario, Campaign } from '@/lib/campaign-os/types';
import { LegacyCutoverPanel } from '@/components/campaign-os/LegacyCutoverPanel';
import { TrainingModulesPanel } from '@/components/campaign-os/training/TrainingModulesPanel';
import { RetrainingStatusCard } from '@/components/campaign-os/training/RetrainingStatusCard';
import { GoLiveChecksCard } from '@/components/campaign-os/go-live/GoLiveChecksCard';
import { GoLiveChecklist } from '@/components/campaign-os/go-live/GoLiveChecklist';
import { GoLiveActivityLog } from '@/components/campaign-os/go-live/GoLiveActivityLog';
import { GoLiveAuditPanel } from '@/components/campaign-os/go-live/GoLiveAuditPanel';
import { SaveAsTemplateDialog } from '@/components/campaign-os/SaveAsTemplateDialog';
import { GitCompare, Layers } from 'lucide-react';
import { ScenarioEffectivenessTab } from '@/components/campaign-os/effectiveness/ScenarioEffectivenessTab';
import { MarkdownText } from '@/components/campaign-os/MarkdownText';

function buildPacketFilename(campaign: Pick<Campaign, 'id' | 'display_name'>): string {
  const slug = slugify(campaign.display_name);
  const date = new Date().toISOString().slice(0, 10);
  // When display_name was blank/symbols, slugify falls back to "campaign".
  // Append a short id so the file is still unique and obviously not blank.
  const suffix = slug === 'campaign' ? `-${campaign.id.slice(0, 8)}` : '';
  return `build-packet_${slug}${suffix}_${date}.pdf`;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  paused: 'outline',
  archived: 'destructive',
};

interface ScenarioForm {
  id?: string;
  title: string;
  trigger_md: string;
  expected_outcome_md: string;
  disposition: string;
  routing: string;
  tags: string;
  sort_order: number;
  status: 'draft' | 'approved';
}

const EMPTY_SCENARIO: ScenarioForm = {
  title: '',
  trigger_md: '',
  expected_outcome_md: '',
  disposition: '',
  routing: '',
  tags: '',
  sort_order: 100,
  status: 'draft',
};

export default function CampaignOsCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const campaignQ = useCampaign(id);
  const scenariosQ = useCampaignScenarios(id);
  const update = useUpdateCampaign();
  const upsertScenario = useUpsertScenario();
  const approveScenario = useApproveScenario();
  const archiveScenario = useArchiveScenario();

  const campaign = campaignQ.data;
  const dept = campaign?.department ?? null;
  const deptId = dept?.id ?? null;

  const contactsQ = useClientContacts();
  const numbersQ = useDepartmentNumbers(deptId);
  const fieldsQ = useCampaignFields(deptId, 'agent');
  const faqsQ = useCampaignFaqs(deptId);
  const policiesQ = useCampaignPolicies(deptId);
  const mappingsQ = useFiveNineMappings(deptId);
  const packetQ = useBuildPacketData(id);

  // Inline overview edit
  const [editingOverview, setEditingOverview] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftStatus, setDraftStatus] = useState<'draft' | 'active' | 'paused' | 'archived'>('draft');

  // Scenario dialog
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioForm, setScenarioForm] = useState<ScenarioForm>(EMPTY_SCENARIO);

  const [exporting, setExporting] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  // Deep-link controlled tabs (?tab=faqs|policies|training|go-live|...)
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_TABS = ['overview', 'routing', 'contacts', 'numbers', 'scenarios', 'faqs', 'policies', 'fields', 'five9', 'training', 'go-live', 'effectiveness', 'packet'] as const;
  type TabKey = typeof VALID_TABS[number];
  const tabParam = searchParams.get('tab');
  const initialTab: TabKey = (tabParam && (VALID_TABS as readonly string[]).includes(tabParam) ? tabParam : 'overview') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [highlightTab, setHighlightTab] = useState<TabKey | null>(null);

  // Sync tab when URL changes (e.g. user clicks a fix-this link)
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && (VALID_TABS as readonly string[]).includes(t) && t !== activeTab) {
      setActiveTab(t as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Scroll to the tabs region + flash highlight when arriving via deep link
  useEffect(() => {
    if (!tabParam) return;
    if (!(VALID_TABS as readonly string[]).includes(tabParam)) return;
    // Defer so the tab content is mounted
    const timer = window.setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlightTab(tabParam as TabKey);
      window.setTimeout(() => setHighlightTab(null), 1800);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabKey);
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const counts = useMemo(() => ({
    scenarios: scenariosQ.data?.filter((s) => s.status !== 'archived').length ?? 0,
    faqs: faqsQ.data?.length ?? 0,
    policies: policiesQ.data?.length ?? 0,
    fields: fieldsQ.data?.length ?? 0,
    mappings: mappingsQ.data?.length ?? 0,
    contacts: contactsQ.data?.length ?? 0,
    numbers: numbersQ.data?.length ?? 0,
  }), [scenariosQ.data, faqsQ.data, policiesQ.data, fieldsQ.data, mappingsQ.data, contactsQ.data, numbersQ.data]);

  const highlightClass = (key: TabKey) =>
    highlightTab === key ? 'ring-2 ring-primary ring-offset-2 rounded-lg transition-shadow duration-700' : '';

  if (campaignQ.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (!campaign || !dept) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate('/admin/campaign-os/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to campaigns
        </Button>
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Campaign not found.</CardContent></Card>
      </div>
    );
  }

  const startEditOverview = () => {
    setDraftName(campaign.display_name);
    setDraftNotes(campaign.notes ?? '');
    setDraftStatus(campaign.status);
    setEditingOverview(true);
  };

  const saveOverview = async () => {
    try {
      await update.mutateAsync({
        id: campaign.id,
        display_name: draftName.trim() || campaign.display_name,
        notes: draftNotes,
        status: draftStatus,
      });
      toast.success('Campaign updated');
      setEditingOverview(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openCreateScenario = () => {
    setScenarioForm(EMPTY_SCENARIO);
    setScenarioOpen(true);
  };

  const openEditScenario = (s: CampaignScenario) => {
    setScenarioForm({
      id: s.id,
      title: s.title,
      trigger_md: s.trigger_md,
      expected_outcome_md: s.expected_outcome_md,
      disposition: s.disposition ?? '',
      routing: s.routing ?? '',
      tags: (s.tags ?? []).join(', '),
      sort_order: s.sort_order,
      status: s.status === 'archived' ? 'draft' : s.status,
    });
    setScenarioOpen(true);
  };

  const saveScenario = async () => {
    if (!scenarioForm.title.trim() || !scenarioForm.trigger_md.trim() || !scenarioForm.expected_outcome_md.trim()) {
      return toast.error('Title, trigger, and expected outcome are required');
    }
    try {
      await upsertScenario.mutateAsync({
        id: scenarioForm.id,
        campaign_id: campaign.id,
        title: scenarioForm.title.trim(),
        trigger_md: scenarioForm.trigger_md,
        expected_outcome_md: scenarioForm.expected_outcome_md,
        disposition: scenarioForm.disposition.trim() || null,
        routing: scenarioForm.routing.trim() || null,
        tags: scenarioForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        sort_order: Number(scenarioForm.sort_order) || 100,
        status: scenarioForm.status,
      });
      toast.success(scenarioForm.id ? 'Scenario updated' : 'Scenario created');
      setScenarioOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApproveScenario = async (id: string) => {
    try { await approveScenario.mutateAsync(id); toast.success('Scenario approved'); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleArchiveScenario = async (id: string) => {
    if (!confirm('Archive this scenario?')) return;
    try { await archiveScenario.mutateAsync(id); toast.success('Scenario archived'); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleExport = async () => {
    setExporting(true);
    toast.info('Generating Build Packet PDF…');
    try {
      const bundle = packetQ.data ?? (await packetQ.refetch()).data;
      if (!bundle) throw new Error('Build Packet data not loaded');
      const doc = await renderBuildPacketPdf(bundle);
      const filename = buildPacketFilename(campaign);
      doc.save(filename);
      // QA traceability — surfaces the chosen filename for support tickets.
      console.info('[BuildPacket] saved', filename);
      toast.success('Build Packet downloaded');
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const isArchived = campaign.status === 'archived';
  const exportDisabled = exporting || packetQ.isLoading || campaignQ.isLoading;
  const isPacketEmpty =
    counts.scenarios === 0 &&
    counts.faqs === 0 &&
    counts.policies === 0 &&
    counts.fields === 0 &&
    counts.mappings === 0 &&
    counts.contacts === 0 &&
    counts.numbers === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/campaign-os/campaigns')} className="mb-1">
            <ArrowLeft className="h-4 w-4 mr-2" />All campaigns
          </Button>
          <h2 className="text-xl font-bold">{campaign.display_name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[campaign.status] ?? 'outline'}>{campaign.status}</Badge>
            <Badge variant="outline">{campaign.tenant_kind}</Badge>
            <span className="text-sm text-muted-foreground">Source: <strong>{dept.department_name}</strong></span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/campaign-os/campaigns/${campaign.id}/script`)}>
            <FileText className="h-4 w-4 mr-2" />
            Open Script Builder
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/campaign-os/campaigns/${campaign.id}/versions`)}>
            <GitCompare className="h-4 w-4 mr-2" />
            Compare versions
          </Button>
          <Button variant="outline" onClick={() => setSaveTemplateOpen(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Save as template
          </Button>
          <Button onClick={handleExport} disabled={exportDisabled}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting…' : 'Export Build Packet PDF'}
          </Button>
        </div>
      </div>

      <div ref={tabsRef} />
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="routing">Routing context</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="numbers">Numbers</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="five9">Five9 mappings</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="go-live">Go-Live</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="packet">Build Packet</TabsTrigger>
        </TabsList>

        <TabsContent value="effectiveness" className="mt-4">
          <ScenarioEffectivenessTab campaignId={campaign.id} publishedVersionId={(campaign as any).published_version_id ?? null} />
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <GoLiveChecksCard campaignId={campaign.id} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CountCard label="Scenarios" value={counts.scenarios} />
            <CountCard label="FAQs (approved)" value={counts.faqs} />
            <CountCard label="Policies (approved)" value={counts.policies} />
            <CountCard label="Fields" value={counts.fields} />
            <CountCard label="Five9 mappings" value={counts.mappings} />
            <CountCard label="Contacts" value={counts.contacts} />
            <CountCard label="Numbers" value={counts.numbers} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Campaign details</CardTitle>
              {!editingOverview && (
                <Button size="sm" variant="outline" onClick={startEditOverview}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {editingOverview ? (
                <>
                  <div><Label>Display name</Label><Input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></div>
                  <div>
                    <Label>Status</Label>
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as any)}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div><Label>Notes</Label><Textarea rows={4} value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} /></div>
                  <div className="flex gap-2">
                    <Button onClick={saveOverview} disabled={update.isPending}>Save</Button>
                    <Button variant="outline" onClick={() => setEditingOverview(false)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <Field label="Tenant" value={campaign.tenant_kind} />
                  <Field label="Status" value={campaign.status} />
                  <Field label="Created" value={new Date(campaign.created_at).toLocaleString()} />
                  <Field label="Updated" value={new Date(campaign.updated_at).toLocaleString()} />
                  <div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap">{campaign.notes || <span className="text-muted-foreground">—</span>}</dd></div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROUTING CONTEXT */}
        <TabsContent value="routing" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Source department</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/campaign-os/departments">
                  Manage in Departments <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Field label="Name" value={dept.department_name} />
                <Field label="Type" value={dept.department_type} />
                <Field label="Service type" value={dept.service_type ?? '—'} />
                <Field label="Lifecycle" value={dept.lifecycle} />
                <Field label="Onboarding owner" value={dept.onboarding_owner ?? '—'} />
                <Field label="Supervisor owner" value={dept.supervisor_owner ?? '—'} />
                <div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap">{dept.notes || <span className="text-muted-foreground">—</span>}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <LegacyCutoverPanel
            campaignId={campaign.id}
            clientLeadId={campaign.client_lead_id ?? null}
            wlClientId={campaign.wl_client_id ?? null}
            legacyCutoverAt={(campaign as unknown as { legacy_script_cutover_at?: string | null }).legacy_script_cutover_at ?? null}
            onChange={() => campaignQ.refetch?.()}
          />
        </TabsContent>

        {/* CONTACTS */}
        <TabsContent value="contacts" className="space-y-2 mt-4">
          {(contactsQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Inbox}
              headline="No contacts in this tenant"
              guidance="Contacts are managed at the tenant level, outside the campaign."
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled>Add contact (managed elsewhere)</Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/clients">Open Clients <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </div>
              }
            />
          ) : null}
          {contactsQ.data?.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{c.name} {c.is_primary && <Badge variant="default" className="ml-1">Primary</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{c.role} · {c.email ?? '—'} · {c.phone ?? '—'}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* NUMBERS */}
        <TabsContent value="numbers" className="space-y-2 mt-4">
          {(numbersQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Phone}
              headline="No phone numbers configured"
              guidance="Phone numbers attach to the source department."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/campaign-os/departments">Manage in Departments <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              }
            />
          ) : null}
          {numbersQ.data?.map((n) => (
            <Card key={n.id}>
              <CardContent className="py-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Role</div><div>{n.phone_role}</div></div>
                <div><div className="text-xs text-muted-foreground">DNIS</div><div>{n.dnis ?? '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">ANI display</div><div>{n.ani_display ?? '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">Voicemail</div><div>{n.voicemail_enabled ? 'Yes' : 'No'}</div></div>
                <div><div className="text-xs text-muted-foreground">Callback</div><div>{n.callback_enabled ? 'Yes' : 'No'}</div></div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* SCENARIOS */}
        <TabsContent value="scenarios" className="space-y-3 mt-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <CardDescription>Edit scenarios for this campaign. Identity (tenant + department) is inherited automatically.</CardDescription>
            <Button
              onClick={openCreateScenario}
              disabled={isArchived || campaignQ.isLoading}
              title={isArchived ? 'Unarchive the campaign to add scenarios.' : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />New scenario
            </Button>
          </div>
          {(scenariosQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={MessageSquare}
              headline="No scenarios yet"
              guidance="Scenarios replace the legacy services document. Author the first one to start the Build Packet's Scenarios section."
              action={
                <Button
                  onClick={openCreateScenario}
                  disabled={isArchived || campaignQ.isLoading}
                  title={isArchived ? 'Unarchive the campaign to add scenarios.' : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />New scenario
                </Button>
              }
            />
          ) : null}
          {scenariosQ.data?.map((s) => {
            const scenarioArchived = s.status === 'archived';
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">order {s.sort_order}</Badge>
                      <Badge variant={s.status === 'approved' ? 'default' : s.status === 'archived' ? 'destructive' : 'secondary'}>{s.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Trigger</div>
                    <p className="text-sm whitespace-pre-wrap">{s.trigger_md}</p>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Expected outcome</div>
                    <p className="text-sm whitespace-pre-wrap">{s.expected_outcome_md}</p>
                  </div>
                  {(s.disposition || s.routing) && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><div className="text-xs text-muted-foreground">Disposition</div><div>{s.disposition ?? '—'}</div></div>
                      <div><div className="text-xs text-muted-foreground">Routing</div><div>{s.routing ?? '—'}</div></div>
                    </div>
                  )}
                  {s.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">{s.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openEditScenario(s)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />{scenarioArchived ? 'View' : 'Edit'}
                    </Button>
                    {s.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveScenario(s.id)}
                        disabled={isArchived || approveScenario.isPending}
                        title={isArchived ? 'Unarchive the campaign first.' : undefined}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                    )}
                    {s.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchiveScenario(s.id)}
                        disabled={isArchived || archiveScenario.isPending}
                        title={isArchived ? 'Unarchive the campaign first.' : undefined}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1" />Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* FAQS */}
        <TabsContent value="faqs" className={`space-y-2 mt-4 ${highlightClass('faqs')}`}>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/admin/campaign-os/faqs?departmentId=${deptId}`}>Edit in FAQs <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {(faqsQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileQuestion}
              headline="No effective FAQs for this department"
              guidance="FAQs are authored in the FAQs surface and resolved here read-only."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/admin/campaign-os/faqs?departmentId=${deptId}`}>Open FAQs for this department <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              }
            />
          ) : null}
          {faqsQ.data?.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{f.question}</CardTitle></CardHeader>
              <CardContent className="pt-0"><MarkdownText>{f.answer_md}</MarkdownText></CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* POLICIES */}
        <TabsContent value="policies" className={`space-y-2 mt-4 ${highlightClass('policies')}`}>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/admin/campaign-os/policies?departmentId=${deptId}`}>Edit in Policies <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {(policiesQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              headline="No effective policies for this department"
              guidance="Policies are authored in the Policies surface and resolved here read-only."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/admin/campaign-os/policies?departmentId=${deptId}`}>Open Policies for this department <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              }
            />
          ) : null}
          {policiesQ.data?.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <Badge variant="outline">{p.policy_kind}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0"><MarkdownText>{p.body_md}</MarkdownText></CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* FIELDS */}
        <TabsContent value="fields" className="space-y-2 mt-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/campaign-os/fields">Edit in Fields <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {(fieldsQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={ListChecks}
              headline="No fields configured"
              guidance="Fields are authored in the Fields surface."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/campaign-os/fields">Open Fields <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              }
            />
          ) : null}
          {fieldsQ.data?.map((f) => (
            <div key={f.field_id} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm">
              <div>
                <div className="font-medium">{f.display_label} {f.is_required && <Badge variant="destructive" className="ml-1 text-xs">required</Badge>}</div>
                <div className="text-xs text-muted-foreground">{f.field_key} · {f.field_type} · scope: {f.scope}</div>
              </div>
              <Badge variant="outline">order {f.sort_order}</Badge>
            </div>
          ))}
        </TabsContent>

        {/* FIVE9 */}
        <TabsContent value="five9" className="space-y-2 mt-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/campaign-os/five9">Edit in Five9 mappings <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {(mappingsQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Settings2}
              headline="No Five9 mappings configured"
              guidance="Mappings are authored in the Five9 surface."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/campaign-os/five9">Open Five9 mappings <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              }
            />
          ) : null}
          {mappingsQ.data?.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm">
              <div>
                <div className="font-medium">{m.five9_variable_name}</div>
                <div className="text-xs text-muted-foreground">{m.five9_variable_kind} · {m.data_type} · {(m.direction ?? []).join(', ') || '—'}</div>
              </div>
              <Badge variant={m.is_active ? 'default' : 'outline'}>{m.is_active ? 'active' : 'inactive'}</Badge>
            </div>
          ))}
        </TabsContent>

        {/* TRAINING */}
        <TabsContent value="training" className={`space-y-3 mt-4 ${highlightClass('training')}`}>
          <RetrainingStatusCard campaignId={campaign.id} />
          <TrainingModulesPanel campaignId={campaign.id} />
        </TabsContent>

        {/* GO-LIVE */}
        <TabsContent value="go-live" className={`space-y-3 mt-4 ${highlightClass('go-live')}`}>
          <GoLiveChecklist campaignId={campaign.id} campaignStatus={campaign.status} />
          <GoLiveAuditPanel campaignId={campaign.id} />
          <GoLiveActivityLog campaignId={campaign.id} />
        </TabsContent>

        {/* BUILD PACKET */}
        <TabsContent value="packet" className="space-y-3 mt-4">
          {isPacketEmpty && (
            <Card className="border-status-warning bg-status-warning-bg">
              <CardContent className="py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5 shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-foreground">No structured data yet</div>
                  <div className="text-muted-foreground">
                    The PDF will render with "No data" for every section. Export anyway is still allowed for placeholder review.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Build Packet preview</CardTitle>
                  <CardDescription>Read-only summary of every section that will be exported to PDF.</CardDescription>
                </div>
                <Button onClick={handleExport} disabled={exportDisabled}>
                  <Download className="h-4 w-4 mr-2" />{exporting ? 'Exporting…' : 'Export PDF'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>Cover — {campaign.display_name}</li>
                <li>Account & Contacts — {counts.contacts} contact{counts.contacts === 1 ? '' : 's'}</li>
                <li>Department — {dept.department_name} ({dept.department_type})</li>
                <li>Phone Numbers — {counts.numbers}</li>
                <li>Intake Fields — {counts.fields}</li>
                <li>Five9 Mappings — {counts.mappings}</li>
                <li>FAQs — {counts.faqs} approved</li>
                <li>Policies — {counts.policies} approved</li>
                <li>Scenarios — {counts.scenarios} active</li>
                <li>Footer on every page</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scenario dialog */}
      <Dialog open={scenarioOpen} onOpenChange={setScenarioOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{scenarioForm.id ? 'Edit scenario' : 'New scenario'}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>Title</Label><Input value={scenarioForm.title} onChange={(e) => setScenarioForm({ ...scenarioForm, title: e.target.value })} /></div>
            <div><Label>Trigger (markdown)</Label><Textarea rows={4} value={scenarioForm.trigger_md} onChange={(e) => setScenarioForm({ ...scenarioForm, trigger_md: e.target.value })} /></div>
            <div><Label>Expected outcome (markdown)</Label><Textarea rows={4} value={scenarioForm.expected_outcome_md} onChange={(e) => setScenarioForm({ ...scenarioForm, expected_outcome_md: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Disposition</Label><Input value={scenarioForm.disposition} onChange={(e) => setScenarioForm({ ...scenarioForm, disposition: e.target.value })} /></div>
              <div><Label>Routing</Label><Input value={scenarioForm.routing} onChange={(e) => setScenarioForm({ ...scenarioForm, routing: e.target.value })} /></div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={scenarioForm.tags} onChange={(e) => setScenarioForm({ ...scenarioForm, tags: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort order</Label><Input type="number" value={scenarioForm.sort_order} onChange={(e) => setScenarioForm({ ...scenarioForm, sort_order: Number(e.target.value) })} /></div>
              <div>
                <Label>Status</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={scenarioForm.status} onChange={(e) => setScenarioForm({ ...scenarioForm, status: e.target.value as any })}>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScenarioOpen(false)}>{isArchived ? 'Close' : 'Cancel'}</Button>
            {!isArchived && (
              <Button onClick={saveScenario} disabled={upsertScenario.isPending}>Save</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveAsTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        campaignId={campaign.id}
        defaultName={campaign.display_name}
      />
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  headline,
  guidance,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  guidance: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="font-medium">{headline}</div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">{guidance}</div>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
