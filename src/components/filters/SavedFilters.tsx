import { useState, useEffect } from 'react';
import { Save, Trash2, Bookmark, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface FilterState {
  searchText?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface SavedFiltersProps {
  storageKey: string;
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
}

const DEFAULT_PRESETS: SavedFilter[] = [
  {
    id: 'preset-open',
    name: 'Open Tickets',
    filters: { status: 'open' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-urgent',
    name: 'High Priority',
    filters: { priority: 'urgent' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-unassigned',
    name: 'Unassigned',
    filters: { assignee: 'unassigned' },
    createdAt: new Date().toISOString(),
  },
];

export function SavedFilters({ storageKey, currentFilters, onApply }: SavedFiltersProps) {
  const { toast } = useToast();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch {
        setSavedFilters([]);
      }
    }
  }, [storageKey]);

  const persistFilters = (filters: SavedFilter[]) => {
    setSavedFilters(filters);
    localStorage.setItem(storageKey, JSON.stringify(filters));
  };

  const handleSave = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: filterName.trim(),
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };

    persistFilters([...savedFilters, newFilter]);
    setFilterName('');
    setSaveDialogOpen(false);
    toast({ title: 'Filter saved', description: `"${newFilter.name}" has been saved.` });
  };

  const handleDelete = (id: string) => {
    persistFilters(savedFilters.filter(f => f.id !== id));
    toast({ title: 'Filter removed' });
  };

  const allFilters = [...DEFAULT_PRESETS, ...savedFilters];

  const hasActiveFilters = Object.values(currentFilters).some(
    v => v && v !== 'all' && v !== ''
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-4 w-4" />
            Saved Filters
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {allFilters.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              className="flex items-center justify-between"
              onClick={() => onApply(filter.filters)}
            >
              <span className="truncate">{filter.name}</span>
              {!filter.id.startsWith('preset-') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-2 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(filter.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}
          {allFilters.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem
            disabled={!hasActiveFilters}
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Current Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Filter name..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!filterName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
