import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface PaletteEntry {
  id: string;
  label: string;
  href: string;
  group?: string;
  keywords?: string;
}

interface CommandPaletteProps {
  entries: PaletteEntry[];
}

/**
 * Skeleton global command palette. Cmd/Ctrl-K toggles. Items navigate via
 * react-router. Wave 0: no fuzzy lookups, no remote search — just a deep-link
 * jumper for hidden admin tools and any registered route.
 */
export function CommandPalette({ entries }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteEntry[]>();
    for (const e of entries) {
      const g = e.group ?? 'Navigate';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {grouped.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.keywords ?? ''}`}
                onSelect={() => {
                  setOpen(false);
                  navigate(item.href);
                }}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
