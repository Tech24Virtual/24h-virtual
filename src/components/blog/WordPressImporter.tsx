import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function WordPressImporter() {
  const [importing, setImporting] = useState(false);
  const [xmlContent, setXmlContent] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setXmlContent(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!xmlContent) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-wordpress-posts', {
        body: { xml: xmlContent },
      });
      if (error) throw error;
      toast.success(`Imported ${data?.imported || 0} posts!`);
      setXmlContent('');
      setFileName('');
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>WordPress XML Import</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Upload your WordPress export XML file to import posts. Content will be converted from HTML to Markdown automatically.</p>

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm mb-2">{fileName || 'Drop your WordPress XML file here'}</p>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild><span>Choose File</span></Button>
            <input type="file" accept=".xml" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>

        {xmlContent && (
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm flex-1">{fileName}</span>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importing...' : 'Import Posts'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
