import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { TabsTrigger } from "@/components/ui/tabs";
import { track, type Persona } from "./track";

interface TrackedButtonProps extends ButtonProps {
  /** Logical surface (page) the button lives on, e.g. client_dashboard. */
  surface: string;
  /** Stable identifier for the action, e.g. request_outbound_call. */
  target: string;
  persona?: Persona;
  trackProperties?: Record<string, unknown>;
  /** Use `quick_action` instead of `cta_click`. */
  trackAs?: "cta" | "quick_action";
}

/**
 * Drop-in replacement for <Button> that records a `cta_click` (or
 * `quick_action`) event before delegating to the original onClick.
 */
export const TrackedButton = forwardRef<HTMLButtonElement, TrackedButtonProps>(
  ({ surface, target, persona, trackProperties, trackAs = "cta", onClick, ...rest }, ref) => {
    return (
      <Button
        ref={ref}
        {...rest}
        onClick={(e) => {
          if (trackAs === "quick_action") {
            track.quickAction(surface, target, persona, trackProperties);
          } else {
            track.cta(surface, target, persona, trackProperties);
          }
          onClick?.(e);
        }}
      />
    );
  }
);
TrackedButton.displayName = "TrackedButton";

interface TrackedTabsTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
  surface: string;
  /** The tab's logical name (defaults to the tab `value`). */
  target?: string;
  persona?: Persona;
  trackProperties?: Record<string, unknown>;
}

/**
 * Drop-in replacement for shadcn <TabsTrigger> that fires a `tab_view` event
 * whenever the tab is activated.
 */
export const TrackedTabsTrigger = forwardRef<
  React.ComponentRef<typeof TabsTrigger>,
  TrackedTabsTriggerProps
>(({ surface, target, persona, trackProperties, onClick, value, ...rest }, ref) => {
  return (
    <TabsTrigger
      ref={ref}
      value={value}
      {...rest}
      onClick={(e) => {
        track.tab(surface, target ?? String(value), persona, trackProperties);
        onClick?.(e);
      }}
    />
  );
});
TrackedTabsTrigger.displayName = "TrackedTabsTrigger";
