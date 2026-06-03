import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Script } from '@/pages/client-dashboard/Scripts';
import type { Json } from '@/integrations/supabase/types';

interface FAQ {
  question: string;
  answer: string;
}

interface ScriptDialogProps {
  open: boolean;
  onClose: (saved: boolean) => void;
  script: Script | null;
}

export function ScriptDialog({ open, onClose, script }: ScriptDialogProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    greeting: '',
    faqs: [] as FAQ[],
  });

  useEffect(() => {
    if (script) {
      setFormData({
        name: script.name,
        greeting: script.greeting || '',
        faqs: Array.isArray(script.faqs) ? script.faqs : [],
      });
    } else {
      setFormData({
        name: '',
        greeting: '',
        faqs: [],
      });
    }
  }, [script, open]);

  const handleAddFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }],
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => 
        i === index ? { ...faq, [field]: value } : faq
      ),
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.name.trim()) {
      toast.error('Please enter a script name');
      return;
    }

    setIsSaving(true);
    try {
      const filteredFaqs = formData.faqs.filter(f => f.question.trim() && f.answer.trim());
      
      if (script) {
        // Update existing
        const { error } = await supabase
          .from('client_scripts')
          .update({
            name: formData.name,
            greeting: formData.greeting || null,
            faqs: filteredFaqs as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', script.id);

        if (error) throw error;
        toast.success('Script updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('client_scripts')
          .insert({
            name: formData.name,
            greeting: formData.greeting || null,
            faqs: filteredFaqs as unknown as Json,
            client_id: user.id,
          });

        if (error) throw error;
        toast.success('Script created successfully');
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving script:', error);
      toast.error('Failed to save script');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{script ? 'Edit Script' : 'Create New Script'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Script Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Main Business Hours"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting Message</Label>
            <Textarea
              id="greeting"
              placeholder="e.g., Thank you for calling [Company Name]. How may I assist you today?"
              rows={3}
              value={formData.greeting}
              onChange={(e) => setFormData(prev => ({ ...prev, greeting: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              This is what the receptionist will say when answering calls.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>FAQs</Label>
              <Button variant="outline" size="sm" onClick={handleAddFaq}>
                <Plus className="w-4 h-4 mr-1" />
                Add FAQ
              </Button>
            </div>

            {formData.faqs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No FAQs added yet. Click "Add FAQ" to create common questions and answers.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.faqs.map((faq, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Question"
                          value={faq.question}
                          onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                        />
                        <Textarea
                          placeholder="Answer"
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFaq(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : script ? 'Update Script' : 'Create Script'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
