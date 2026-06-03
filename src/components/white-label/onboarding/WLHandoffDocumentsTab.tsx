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
import { Upload, Eye, FileText, Trash2 } from 'lucide-react';
import {
  useWLHandoffDocuments,
  useWLHandoffDocumentMutations,
  type WLDocumentType,
  type WLHandoffDocument,
} from '@/hooks/wl/useWLHandoffDocuments';
import { useWLPartnerId } from '@/hooks/wl/useWLPartnerId';
import { SignedUrlViewer } from '@/components/shared/SignedUrlViewer';
import { toast } from 'sonner';

const DOC_TYPE_LABEL: Record<WLDocumentType, string> = {
  script: 'Script',
  logo: 'Logo',
  voicemail_audio: 'Voicemail audio',
  policy: 'Policy',
  id_verification: 'ID verification',
  signed_agreement: 'Signed agreement',
  other: 'Other',
};

interface Props {
  handoffId: string;
  focusKey?: string | null;
}

export function WLHandoffDocumentsTab({ handoffId }: Props) {
  const { data: docs, isLoading } = useWLHandoffDocuments(handoffId);
  const { upload, supersede, remove } = useWLHandoffDocumentMutations(handoffId);
  const { data: partnerId } = useWLPartnerId();
  const [docType, setDocType] = useState<WLDocumentType>('script');
  const [previewing, setPreviewing] = useState<WLHandoffDocument | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25 MB limit');
      return;
    }
    upload.mutate({ file, document_type: docType });
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">Document type</label>
            <Select value={docType} onValueChange={(v) => setDocType(v as WLDocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_TYPE_LABEL) as WLDocumentType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {DOC_TYPE_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs text-muted-foreground">Choose file (max 25 MB)</label>
            <Input type="file" onChange={handleFile} disabled={upload.isPending} />
          </div>
          <Button disabled className="hidden md:inline-flex">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !docs?.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id} className="p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {DOC_TYPE_LABEL[d.document_type]}
                      </Badge>
                      <Badge
                        variant={d.status === 'active' ? 'secondary' : 'outline'}
                        className="text-xs capitalize"
                      >
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewing(d)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                  {d.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => supersede.mutate(d.id)}
                      disabled={supersede.isPending}
                    >
                      Supersede
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(d)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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
              authorized={!!partnerId && partnerId === previewing.partner_id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
