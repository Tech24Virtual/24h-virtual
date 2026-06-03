import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, GitCompare } from 'lucide-react';
import { useCampaign } from '@/hooks/campaign-os/useCampaigns';
import { useCampaignVersions } from '@/hooks/campaign-os/useCampaignVersions';
import { VersionDiffViewer } from '@/components/campaign-os/versions/VersionDiffViewer';

export default function CampaignVersions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const campaignQ = useCampaign(id);
  const versionsQ = useCampaignVersions(id);

  const versions = versionsQ.data ?? [];
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const left = useMemo(() => versions.find((v) => v.id === leftId), [versions, leftId]);
  const right = useMemo(() => versions.find((v) => v.id === rightId), [versions, rightId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/campaign-os/campaigns/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to campaign
          </Button>
          <h1 className="text-2xl font-semibold mt-2">Compare versions</h1>
          {campaignQ.data && (
            <p className="text-sm text-muted-foreground">{campaignQ.data.display_name}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Pick two versions
          </CardTitle>
          <CardDescription>
            {versions.length === 0
              ? 'No published versions yet.'
              : `${versions.length} published version${versions.length === 1 ? '' : 's'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <VersionPicker
            label="Left (older)"
            value={leftId}
            onChange={setLeftId}
            versions={versions}
          />
          <VersionPicker
            label="Right (newer)"
            value={rightId}
            onChange={setRightId}
            versions={versions}
          />
        </CardContent>
      </Card>

      {left && right && left.id !== right.id ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              v{left.version} <span className="text-muted-foreground">→</span> v{right.version}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VersionDiffViewer before={left.snapshot} after={right.snapshot} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Pick two different versions to see the diff.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VersionPicker({
  label,
  value,
  onChange,
  versions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  versions: Array<{ id: string; version: number; published_at: string; note: string | null }>;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        className="w-full h-10 rounded-md border bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select version…</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.version} — {new Date(v.published_at).toLocaleDateString()}{' '}
            {v.note ? `· ${v.note.slice(0, 40)}` : ''}
          </option>
        ))}
      </select>
      {value && (
        <Badge variant="outline" className="mt-2">
          v{versions.find((v) => v.id === value)?.version}
        </Badge>
      )}
    </div>
  );
}
