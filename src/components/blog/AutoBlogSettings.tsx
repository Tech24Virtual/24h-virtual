import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AutoBlogSettings() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">AutoBlog Settings</CardTitle></CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <Label>Auto-publish generated posts</Label>
          <Switch />
        </div>
        <div>
          <Label className="text-sm">Posts per day</Label>
          <Select defaultValue="2">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['1', '2', '3', '5'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Default content length</Label>
          <Select defaultValue="medium">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short (800 words)</SelectItem>
              <SelectItem value="medium">Medium (1,500 words)</SelectItem>
              <SelectItem value="long">Long (2,500 words)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Default tone</Label>
          <Select defaultValue="professional">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
