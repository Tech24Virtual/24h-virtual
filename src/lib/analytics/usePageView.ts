import { useEffect, useRef } from "react";
import { track, type Persona } from "./track";

/**
 * Fire a single `page_view` event when this component mounts. Pass a stable
 * `surface` per dashboard page (e.g. `client_dashboard`, `admin_overview`).
 *
 * Re-fires when surface changes; otherwise idempotent for the lifetime of the mount.
 */
export function usePageView(surface: string, persona?: Persona, properties?: Record<string, unknown>) {
  const lastFired = useRef<string | null>(null);
  useEffect(() => {
    if (lastFired.current === surface) return;
    lastFired.current = surface;
    track.page(surface, persona, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, persona]);
}
