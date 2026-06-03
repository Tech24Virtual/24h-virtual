import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'browser-notifications-enabled';

export function useBrowserNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      setIsEnabled(localStorage.getItem(STORAGE_KEY) === 'true' && Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setIsEnabled(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      return true;
    }
    return false;
  }, [isSupported]);

  const toggle = useCallback(async () => {
    if (isEnabled) {
      setIsEnabled(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    } else {
      if (permission === 'granted') {
        setIsEnabled(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        await requestPermission();
      }
    }
  }, [isEnabled, permission, requestPermission]);

  const showNotification = useCallback(
    (title: string, body?: string, actionUrl?: string) => {
      if (!isEnabled || document.visibilityState !== 'hidden') return;
      try {
        const n = new Notification(title, {
          body: body || undefined,
          icon: '/favicon.png',
          tag: `notif-${Date.now()}`,
        });
        n.onclick = () => {
          window.focus();
          n.close();
          if (actionUrl) {
            window.location.href = actionUrl;
          }
        };
      } catch {
        // Silent fail for environments that don't support Notification constructor
      }
    },
    [isEnabled]
  );

  return { isSupported, isEnabled, permission, toggle, showNotification };
}
