import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLPartnerLeads } from '@/hooks/wl/useWLPartnerLeads';

interface Props {
  value: string | null;
  onChange: (leadId: string | null) => void;
  disabled?: boolean;
}

export function WLProposalLeadPicker({ value, onChange, disabled }: Props) {
  const { data: leads, isLoading } = useWLPartnerLeads();
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => leads?.find((l) => l.id === value) ?? null,
    [leads, value],
  );

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className="flex-1 justify-between font-normal"
          >
            {selected ? (
              <span className="truncate">
                {selected.name}
                {selected.company ? (
                  <span className="text-muted-foreground"> · {selected.company}</span>
                ) : null}
              </span>
            ) : (
              <span className="text-muted-foreground">Select a lead (optional)</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search leads..." />
            <CommandList>
              <CommandEmpty>No leads found.</CommandEmpty>
              <CommandGroup>
                {(leads ?? []).map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={`${lead.name} ${lead.email} ${lead.company ?? ''}`}
                    onSelect={() => {
                      onChange(lead.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === lead.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{lead.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {lead.email}
                        {lead.company ? ` · ${lead.company}` : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label="Clear linked lead"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
