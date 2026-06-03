import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface NotificationPermissionToggleProps {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
  onToggle: () => void;
}

export function NotificationPermissionToggle({
  isSupported,
  isEnabled,
  permission,
  onToggle,
}: NotificationPermissionToggleProps) {
  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
        <span>Desktop alerts</span>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={onToggle}
        disabled={permission === 'denied'}
        className="scale-75"
      />
    </div>
  );
}
