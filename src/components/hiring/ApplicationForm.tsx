import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  APPLICATION_BUCKET,
  APPLICATION_COMPANIES,
  APPLICATION_LANGUAGES,
  EQUIPMENT_ITEMS,
  HOURS_OPTIONS,
  SHIFT_OPTIONS,
} from '@/lib/hiring/applicationOptions';

interface ApplicationFormProps {
  jobPostingId: string;
  /** 'public' = anonymous applicant (all screening fields required); 'hr' = HR adding an applicant manually. */
  mode: 'public' | 'hr';
  onSubmitted: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

function FileField({
  label, required, hint, file, onChange,
}: { label: string; required?: boolean; hint?: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > MAX_FILE_BYTES) { toast.error('File must be 10 MB or smaller'); e.target.value = ''; return; }
          if (f && !ALLOWED_TYPES.includes(f.type)) { toast.error('Use a PDF, Word document or image'); e.target.value = ''; return; }
          onChange(f);
        }}
      />
      {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
    </div>
  );
}

export function ApplicationForm({ jobPostingId, mode, onSubmitted }: ApplicationFormProps) {
  const isPublic = mode === 'public';
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    first_name: '', last_name: '', email: '', phone: '', location: '',
    company_applying_for: '', referral_source: '', years_experience: '',
    cover_letter: '', contractor_agreement: '', hours_wanted: [] as string[],
    scheduling_notes: '', available_start_date: '', expected_pay: '', intro_recording_url: '',
    honeypot: '',
  });
  const [languages, setLanguages] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [weekends, setWeekends] = useState<string[]>([]);
  const [resume, setResume] = useState<File | null>(null);
  const [speedTest, setSpeedTest] = useState<File | null>(null);
  const [ram, setRam] = useState<File | null>(null);

  const set = (key: keyof typeof f, value: string) => setF((p) => ({ ...p, [key]: value }));

  const upload = async (appId: string, kind: string, file: File) => {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `applications/${appId}/${kind}-${safe}`;
    const { error } = await supabase.storage.from(APPLICATION_BUCKET).upload(path, file, { contentType: file.type });
    if (error) throw new Error(`Upload failed (${kind}): ${error.message}`);
    return path;
  };

  const validate = (): string | null => {
    if (!f.first_name.trim() || !f.last_name.trim()) return 'First and last name are required';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'Enter a valid email address';
    if (!isPublic) return null;
    if (!resume) return 'Please attach your resume';
    if (!f.location.trim()) return 'Where do you reside is required';
    if (languages.length === 0) return 'Select at least one language';
    if (f.hours_wanted.length === 0) return 'Select the hours you are looking for';
    if (weekdays.length + weekends.length === 0) return 'Select at least one shift you are open to';
    if (!f.contractor_agreement) return 'Please answer the contractor question';
    if (!f.available_start_date) return 'Please enter when you can start';
    if (!f.expected_pay.trim()) return 'Please enter your expected pay';
    if (!speedTest) return 'Please upload your speed test screenshot';
    if (!ram) return 'Please upload your RAM screenshot';
    return null;
  };

  const submit = async () => {
    // Honeypot: bots fill hidden fields. Pretend success without storing anything.
    if (f.honeypot) { onSubmitted(); return; }
    const problem = validate();
    if (problem) { toast.error(problem); return; }

    setSubmitting(true);
    try {
      const appId = crypto.randomUUID();
      const [resumePath, speedPath, ramPath] = await Promise.all([
        resume ? upload(appId, 'resume', resume) : Promise.resolve(null),
        speedTest ? upload(appId, 'speedtest', speedTest) : Promise.resolve(null),
        ram ? upload(appId, 'ram', ram) : Promise.resolve(null),
      ]);

      const { error } = await supabase.from('job_applications').insert({
        id: appId,
        job_posting_id: jobPostingId,
        name: `${f.first_name.trim()} ${f.last_name.trim()}`,
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim() || null,
        location: f.location.trim() || null,
        company_applying_for: f.company_applying_for || null,
        referral_source: f.referral_source.trim() || null,
        languages: languages.length ? languages : null,
        years_experience: f.years_experience.trim() || null,
        hours_wanted: f.hours_wanted.length ? f.hours_wanted.join(', ') : null,
        shift_availability: { weekdays, weekends },
        scheduling_notes: f.scheduling_notes.trim() || null,
        available_start_date: f.available_start_date || null,
        expected_pay: f.expected_pay.trim() || null,
        cover_letter: f.cover_letter.trim() || null,
        equipment_checklist: Object.fromEntries(EQUIPMENT_ITEMS.map((i) => [i.key, equipment.includes(i.key)])),
        contractor_agreement: f.contractor_agreement === 'yes',
        intro_recording_url: f.intro_recording_url.trim() || null,
        resume_url: resumePath,
        speed_test_url: speedPath,
        ram_screenshot_url: ramPath,
        status: 'new',
      });
      if (error) throw error;
      onSubmitted();
    } catch (err) {
      console.error('Application submit failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not submit the application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const req = isPublic ? <span className="text-destructive"> *</span> : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First name<span className="text-destructive"> *</span></Label>
          <Input value={f.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last name<span className="text-destructive"> *</span></Label>
          <Input value={f.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email address<span className="text-destructive"> *</span></Label>
          <Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>

      <FileField label="Resume or CV" required={isPublic} file={resume} onChange={setResume}
        hint="PDF, Word or image — max 10 MB" />

      <div className="space-y-2">
        <Label>Cover letter or introduction <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea rows={4} value={f.cover_letter} onChange={(e) => set('cover_letter', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Where do you reside?{req}</Label>
          <Input placeholder="City/State/Country" value={f.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Which company are you applying for?</Label>
          <Select value={f.company_applying_for} onValueChange={(v) => set('company_applying_for', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {APPLICATION_COMPANIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Where did you hear about us?</Label>
        <Input placeholder="Referral/Google/Social Media" value={f.referral_source} onChange={(e) => set('referral_source', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Which of the following languages do you speak fluently?{req}</Label>
        <div className="flex flex-wrap gap-4">
          {APPLICATION_LANGUAGES.map((l) => (
            <label key={l} className="flex items-center gap-2 text-sm">
              <Checkbox checked={languages.includes(l)} onCheckedChange={() => setLanguages((p) => toggle(p, l))} />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Years of relevant experience</Label>
        <Input placeholder="Eg. 2 Years" value={f.years_experience} onChange={(e) => set('years_experience', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Do you?</Label>
        <div className="space-y-2">
          {EQUIPMENT_ITEMS.map((i) => (
            <label key={i.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={equipment.includes(i.key)} onCheckedChange={() => setEquipment((p) => toggle(p, i.key))} />
              {i.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>This is a contractor position. If given a contract, do you agree to being a contractor?{req}</Label>
        <Select value={f.contractor_agreement} onValueChange={(v) => set('contractor_agreement', v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>How many hours are you looking for? (check all that apply){req}</Label>
        <div className="flex flex-wrap gap-4">
          {HOURS_OPTIONS.map((h) => (
            <label key={h} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={f.hours_wanted.includes(h)}
                onCheckedChange={() => setF((p) => ({ ...p, hours_wanted: toggle(p.hours_wanted, h) }))}
              />
              {h}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm"><strong>We operate in EST.</strong> Select the shifts you are open to working (the more options the better).{req}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Monday - Friday</Label>
            {SHIFT_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <Checkbox checked={weekdays.includes(s)} onCheckedChange={() => setWeekdays((p) => toggle(p, s))} />
                {s}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Saturday - Sunday</Label>
            {SHIFT_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <Checkbox checked={weekends.includes(s)} onCheckedChange={() => setWeekends((p) => toggle(p, s))} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>As we are a 24/7 operation, do you have any special scheduling requests?</Label>
        <Input placeholder="Eg. I am a student and can only work on certain days or hours." value={f.scheduling_notes}
          onChange={(e) => set('scheduling_notes', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>When are you available to start?{req}</Label>
          <Input type="date" value={f.available_start_date} onChange={(e) => set('available_start_date', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Expected hourly rate and/or monthly salary{req}</Label>
          <Input placeholder="In your local currency" value={f.expected_pay} onChange={(e) => set('expected_pay', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Short intro recording link <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <p className="text-xs text-muted-foreground">Record yourself at vocaroo.com and paste the share link.</p>
        <Input type="url" placeholder="https://vocaroo.com/…" value={f.intro_recording_url}
          onChange={(e) => set('intro_recording_url', e.target.value)} />
      </div>

      <FileField label="Speed test screenshot" required={isPublic} file={speedTest} onChange={setSpeedTest}
        hint="From speedtest.net — must show upload and download. Minimum 50 Mbps up and 50 Mbps down." />
      <FileField label="Installed RAM screenshot" required={isPublic} file={ram} onChange={setRam}
        hint="Minimum 8 GB RAM." />

      {/* Honeypot — hidden from people, tempting to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.honeypot} onChange={(e) => set('honeypot', e.target.value)} /></label>
      </div>

      <Button className="w-full sm:w-auto" onClick={submit} disabled={submitting}>
        {submitting ? 'Submitting…' : mode === 'public' ? 'Submit Application' : 'Add Application'}
      </Button>
    </div>
  );
}
