import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import AIFixToolbar from '@/components/blog/AIFixToolbar';

export default function AdminBlogEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Tips & Guides');
  const [tags, setTags] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selStart, setSelStart] = useState(0);
  const [selEnd, setSelEnd] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSelect = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      setSelectedText(content.substring(start, end));
      setSelStart(start);
      setSelEnd(end);
    } else {
      setSelectedText('');
    }
  }, [content]);

  const handleAIFixed = useCallback((improvedText: string) => {
    const newContent = content.substring(0, selStart) + improvedText + content.substring(selEnd);
    setContent(newContent);
    setSelectedText('');
  }, [content, selStart, selEnd]);

  const { data: post } = useQuery({
    queryKey: ['admin-blog-post', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content || '');
      setExcerpt(post.excerpt || '');
      setCategory(post.category || 'Tips & Guides');
      setTags(post.tags?.join(', ') || '');
      setMetaTitle(post.meta_title || '');
      setMetaDescription(post.meta_description || '');
      setFeaturedImage(post.featured_image_url || '');
      setStatus(post.status);
    }
  }, [post]);

  useEffect(() => {
    if (!isEditing && title) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [title, isEditing]);

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 250));

  const saveMutation = useMutation({
    mutationFn: async (publishNow: boolean) => {
      const payload: Record<string, unknown> = {
        title, slug, content, excerpt, category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        meta_title: metaTitle || title,
        meta_description: metaDescription || excerpt,
        featured_image_url: featuredImage || null,
        status: publishNow ? 'published' : status,
        content_word_count: wordCount,
        reading_time: readingTime,
        ...(publishNow ? { published_at: new Date().toISOString() } : {}),
      };

      if (isEditing) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Post saved!');
      navigate('/admin/blog');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/blog')}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-bold flex-1">{isEditing ? 'Edit Post' : 'New Post'}</h1>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="w-4 h-4 mr-2" />{showPreview ? 'Editor' : 'Preview'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />Save Draft
        </Button>
        <Button variant="cta" size="sm" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
          <Send className="w-4 h-4 mr-2" />Publish
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Input placeholder="Post title" value={title} onChange={e => setTitle(e.target.value)} className="text-2xl font-bold h-14 border-none shadow-none px-0 focus-visible:ring-0" />
          
          <div className="flex gap-2 items-center text-sm text-muted-foreground">
            <span>/blog/</span>
            <Input value={slug} onChange={e => setSlug(e.target.value)} className="max-w-xs h-8 text-sm" />
            <span className="ml-auto">{wordCount} words • {readingTime} min read</span>
          </div>

          {showPreview ? (
            <Card>
              <CardContent className="prose prose-lg max-w-none p-6">
                <ReactMarkdown>{content}</ReactMarkdown>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Write your post in Markdown..."
                value={content}
                onChange={e => setContent(e.target.value)}
                onSelect={handleSelect}
                onBlur={() => {
                  setTimeout(() => {
                    if (!textareaRef.current || textareaRef.current.selectionStart === textareaRef.current.selectionEnd) {
                      setSelectedText('');
                    }
                  }, 200);
                }}
                className="min-h-[500px] font-mono text-sm"
              />
              {selectedText && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                  <AIFixToolbar
                    selectedText={selectedText}
                    fullContext={content}
                    onFixed={handleAIFixed}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Post Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Tips & Guides', 'Industry Insights', 'Case Studies', 'Comparisons', 'News'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="virtual receptionist, HIPAA" />
              </div>
              <div>
                <Label className="text-xs">Excerpt</Label>
                <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="Brief summary..." />
              </div>
              <div>
                <Label className="text-xs">Featured Image URL</Label>
                <Input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Meta Title ({metaTitle.length}/60)</Label>
                <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} maxLength={60} />
              </div>
              <div>
                <Label className="text-xs">Meta Description ({metaDescription.length}/160)</Label>
                <Textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} maxLength={160} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
