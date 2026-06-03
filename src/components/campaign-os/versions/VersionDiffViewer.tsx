import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Minus, Pencil } from 'lucide-react';
import { diffSnapshots, diffSummary, type DiffSection } from '@/lib/campaign-os/versionDiff';

interface Props {
  before: any;
  after: any;
}

export function VersionDiffViewer({ before, after }: Props) {
  const sections = useMemo(() => diffSnapshots(before, after), [before, after]);
  const summary = useMemo(() => diffSummary(sections), [sections]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="default" className="gap-1">
          <Plus className="h-3 w-3" /> {summary.added} added
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Pencil className="h-3 w-3" /> {summary.changed} changed
        </Badge>
        <Badge variant="destructive" className="gap-1">
          <Minus className="h-3 w-3" /> {summary.removed} removed
        </Badge>
      </div>

      {sections.map((s) => (
        <SectionCard key={s.section} section={s} />
      ))}
    </div>
  );
}

function SectionCard({ section }: { section: DiffSection }) {
  const [open, setOpen] = useState(true);
  const total = section.added.length + section.removed.length + section.changed.length;
  if (total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CardTitle className="text-sm flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {section.section}
          <span className="text-xs text-muted-foreground font-normal ml-2">
            +{section.added.length} ~{section.changed.length} −{section.removed.length}
          </span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-1.5 text-sm">
          {section.added.map((e) => (
            <Row key={`a-${e.itemKey}`} icon={<Plus className="h-3 w-3 text-status-success" />} label={e.itemLabel} variant="default" />
          ))}
          {section.changed.map((e) => (
            <Row key={`c-${e.itemKey}`} icon={<Pencil className="h-3 w-3" />} label={e.itemLabel} variant="secondary" />
          ))}
          {section.removed.map((e) => (
            <Row key={`r-${e.itemKey}`} icon={<Minus className="h-3 w-3 text-destructive" />} label={e.itemLabel} variant="destructive" />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function Row({
  icon,
  label,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded bg-muted/40">
      {icon}
      <span className="truncate flex-1">{label}</span>
      <Badge variant={variant} className="text-[10px]">
        {variant === 'default' ? 'added' : variant === 'destructive' ? 'removed' : 'changed'}
      </Badge>
    </div>
  );
}
