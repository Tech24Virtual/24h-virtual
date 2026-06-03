import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, FileText, Trash2, Upload } from 'lucide-react';
import {
  useClientHandoffDocuments,
  useClientHandoffMutations,
  type ClientHandoffDocument,
} from '@/hooks/admin/useClientHandoffs';
import { SignedUrlViewer } from '@/components/shared/SignedUrlViewer';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DOC_TYPES = [
  { value: 'business_overview', label: 'Business overview' },
  { value: 'script', label: 'Script / talking points' },
  { value: 'logo', label: 'Logo / brand asset' },
  { value: 'voicemail_audio', label: 'Voicemail audio' },
  { value: 'policy', label: 'Policy / SOP' },
  { value: 'signed_agreement', label: 'Signed agreement' },
  { value: 'other', label: 'Other' },
];

interface Props {
  handoffId: string;
}

export function ClientHandoffDocumentsTab({ handoffId }: Props) {
  const { data: docs, isLoading } = useClientHandoffDocuments(handoffId);
  const { uploadDocument, removeDocument } = useClientHandoffMutations(handoffId);
  const { isAdmin } = useAuth();
  const [docType, setDocType] = useState('business_overview');
  const [previewing, setPreviewing] = useState<ClientHandoffDocument | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25 MB limit');
      return;
    }
    uploadDocument.mutate({ file, document_type: docType });
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Document type</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs text-muted-foreground">Choose file (max 25 MB)</label>
            <Input type="file" onChange={handleFile} disabled={uploadDocument.isPending} />
          </div>
          <Button disabled className="hidden md:inline-flex">
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          All client uploads on this onboarding are visible to the operations team.
        </p>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !docs?.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => {
            const typeLabel =
              DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type;
            return (
              <Card key={d.id} className="p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {typeLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {d.status}
                        </Badge>
                        {d.file_size != null && (
                          <span className="text-xs text-muted-foreground">
                            {(d.file_size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewing(d)}>
                      <Eye className="w-4 h-4 mr-1" /> Preview
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeDocument.mutate(d)}
                        disabled={removeDocument.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewing?.file_name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <SignedUrlViewer
              path={previewing.file_path}
              fileName={previewing.file_name}
              mimeType={previewing.mime_type}
              authorized
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
