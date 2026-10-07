import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, Copy, ExternalLink, Mail, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';
import { SendBookingLinkDialog } from '@/components/bookii/SendBookingLinkDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  APPLICATION_BUCKET,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_COLORS,
  EQUIPMENT_ITEMS,
  type ShiftAvailability,
} from '@/lib/hiring/applicationOptions';

interface ApplicationDetailDialogProps {
  application: any | null;
  onClose: () => void;
  onChanged: () => void;
}

// No dedicated HR Bookii workspace exists yet: this is the same workspace used elsewhere in the app.
const BOOKII_URL = (import.meta.env.VITE_BOOKII_URL as string | undefined) || '';
const bookingLink = BOOKII_URL.replace('?embed=true', '');

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b last:border-0 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{children}</dd>
    </div>
  );
}

export function ApplicationDetailDialog({ application, onClose, onChanged }: ApplicationDetailDialogProps) {
  const [notes, setNotes] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    setNotes(application?.notes ?? '');
  }, [application?.id, application?.notes]);

  if (!application) return null;
  const app = application;

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', app.id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Moved to ${status}`);
    onChanged();
  };

  const saveNotes = async () => {
    const { error } = await supabase
      .from('job_applications')
      .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', app.id);
    if (error) { toast.error('Failed to save notes'); return; }
    toast.success('Notes saved');
    onChanged();
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    if (/^https?:\/\//.test(path)) { window.open(path, '_blank', 'noopener,noreferrer'); return; }
    const { data, error } = await supabase.storage.from(APPLICATION_BUCKET).createSignedUrl(path, 3600);
    if (error || !data) { toast.error('Could not open file'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    if (!bookingLink) { toast.error('Bookii is not configured (VITE_BOOKII_URL)'); return; }
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast.success('Booking link copied');
    } catch {
      toast.error('Could not copy — select the link manually');
    }
  };

  const markInvited = async () => {
    const patch: Record<string, string> = { interview_invited_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (app.status === 'new' || app.status === 'reviewing') patch.status = 'interview';
    await supabase.from('job_applications').update(patch).eq('id', app.id);
    onChanged();
  };

  const shifts = (app.shift_availability ?? null) as ShiftAvailability | null;
  const equipment = (app.equipment_checklist ?? {}) as Record<string, boolean>;
  const fileLink = (label: string, path: string | null) =>
    path ? (
      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => openFile(path)}>
        {label} <ExternalLink className="w-3 h-3 ml-1" />
      </Button>
    ) : null;

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {app.name}
              <Badge className={`capitalize ${APPLICATION_STATUS_COLORS[app.status] || ''}`}>{app.status}</Badge>
            </DialogTitle>
            <DialogDescription>
              {app.job_posting?.title || 'No posting'} • Applied {app.applied_at ? format(new Date(app.applied_at), 'MMM d, yyyy') : '—'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={app.status || 'new'} onValueChange={updateStatus}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="w-4 h-4 mr-2" /> Schedule Interview
            </Button>
            {app.interview_invited_at && (
              <span className="text-xs text-muted-foreground pb-2">
                Interview link sent {format(new Date(app.interview_invited_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          <dl>
            <Row label="Email"><a className="text-primary hover:underline" href={`mailto:${app.email}`}>{app.email}</a></Row>
            <Row label="Phone">{app.phone}</Row>
            <Row label="Location">{app.location}</Row>
            <Row label="Company">{app.company_applying_for}</Row>
            <Row label="Heard about us">{app.referral_source}</Row>
            <Row label="Languages">{app.languages?.join(', ')}</Row>
            <Row label="Experience">{app.years_experience}</Row>
            <Row label="Hours wanted">{app.hours_wanted}</Row>
            <Row label="Mon–Fri shifts">{shifts?.weekdays?.length ? shifts.weekdays.join(' • ') : null}</Row>
            <Row label="Sat–Sun shifts">{shifts?.weekends?.length ? shifts.weekends.join(' • ') : null}</Row>
            <Row label="Scheduling requests">{app.scheduling_notes}</Row>
            <Row label="Available to start">{app.available_start_date ? format(new Date(app.available_start_date + 'T00:00:00'), 'MMM d, yyyy') : null}</Row>
            <Row label="Expected pay">{app.expected_pay}</Row>
            <Row label="Contractor OK?">{app.contractor_agreement === null || app.contractor_agreement === undefined ? null : app.contractor_agreement ? 'Yes' : 'No'}</Row>
            <Row label="Equipment & skills">
              {Object.keys(equipment).length > 0 && (
                <ul className="space-y-0.5">
                  {EQUIPMENT_ITEMS.map((i) => (
                    <li key={i.key} className={equipment[i.key] ? '' : 'text-muted-foreground line-through'}>
                      {equipment[i.key] ? '✓' : '✗'} {i.label}
                    </li>
                  ))}
                </ul>
              )}
            </Row>
            <Row label="Cover letter"><span className="whitespace-pre-line">{app.cover_letter}</span></Row>
            <Row label="Files">
              {(app.resume_url || app.speed_test_url || app.ram_screenshot_url || app.intro_recording_url) && (
                <div className="flex flex-wrap gap-x-4">
                  {fileLink('Resume', app.resume_url)}
                  {fileLink('Speed test', app.speed_test_url)}
                  {fileLink('RAM', app.ram_screenshot_url)}
                  {fileLink('Intro recording', app.intro_recording_url)}
                </div>
              )}
            </Row>
          </dl>

          <div className="space-y-2">
            <Label>Internal notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interview feedback, follow-ups…" />
            {notes !== (app.notes ?? '') && <Button size="sm" variant="outline" onClick={saveNotes}>Save notes</Button>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule interview: embed, copy link, or email via Resend */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>Interview with {app.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => { setScheduleOpen(false); setEmbedOpen(true); }}>
              <Video className="w-4 h-4 mr-2" /> Book a time now
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-2" /> Copy booking link
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => { setScheduleOpen(false); setEmailOpen(true); }}>
              <Mail className="w-4 h-4 mr-2" /> Email booking link to applicant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Book interview — {app.name}</DialogTitle></DialogHeader>
          <BookiiEmbed title={`Interview with ${app.name}`} height="70vh" />
        </DialogContent>
      </Dialog>

      <SendBookingLinkDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        recipientEmail={app.email}
        recipientName={app.name}
        onSent={markInvited}
      />
    </>
  );
}
