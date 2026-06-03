import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Search, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultLeadId?: string;
}

const priorities = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
];

export function QuickAddTaskDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultLeadId,
}: QuickAddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(defaultLeadId || '');
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch leads for the selector
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-for-task'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, company, email')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Filter leads based on search
  const filteredLeads = useMemo(() => {
    if (!leadSearch) return leads;
    const search = leadSearch.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(search) ||
        lead.company?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search)
    );
  }, [leads, leadSearch]);

  // Get selected lead details
  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate(undefined);
      setSelectedLeadId(defaultLeadId || '');
      setLeadSearch('');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this task.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedLeadId) {
      toast({
        title: 'Lead required',
        description: 'Please select a lead to associate with this task.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('crm_tasks').insert({
      lead_id: selectedLeadId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate?.toISOString() || null,
      created_by: user?.id || null,
      status: 'pending',
    });

    if (error) {
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Task created',
        description: `Task assigned to ${selectedLead?.name || 'lead'}.`,
      });
      onSuccess?.();
      onOpenChange(false);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Selector */}
          <div className="space-y-2">
            <Label>Lead / Client</Label>
            <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={leadSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedLead ? (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{selectedLead.name}</span>
                      {selectedLead.company && (
                        <span className="text-muted-foreground text-xs">
                          ({selectedLead.company})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a lead...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search leads..."
                    value={leadSearch}
                    onValueChange={setLeadSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No leads found.</CommandEmpty>
                    <CommandGroup>
                      {filteredLeads.slice(0, 20).map((lead) => (
                        <CommandItem
                          key={lead.id}
                          value={lead.id}
                          onSelect={() => {
                            setSelectedLeadId(lead.id);
                            setLeadSearchOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{lead.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {lead.company || lead.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Follow up on proposal"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(({ value, label, color }) => (
                    <SelectItem key={value} value={value}>
                      <span className={color}>{label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant details..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
