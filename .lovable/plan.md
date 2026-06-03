## Problem

The floating Feedback button shows as a solid blue circle with no icon visible. Root cause: in `src/components/feedback/FeedbackWidget.tsx` the trigger button uses `flex items-center justify-center` with the "Feedback" label rendered as a span with `opacity-0 group-hover:opacity-100`. `opacity-0` hides the span visually but it still occupies layout width (text "Feedback" + `ml-2`), so the flex layout pushes the `MessageSquare` icon off-center. Combined with `overflow-hidden` on a 40px-wide circle, the icon ends up clipped outside the visible area.

## Fix

Single file: `src/components/feedback/FeedbackWidget.tsx` (trigger Button only).

Replace `opacity-0 group-hover:opacity-100` on the label span with width/visibility classes that take zero layout space until hover:

- Span classes: `hidden group-hover:inline` (or `w-0 group-hover:w-auto overflow-hidden`).
- Keep all other styles: `h-10 w-10 hover:w-32`, primary variant, `rounded-full`, `shadow-lg`, `bottom-6 left-6 z-50`.
- Result: collapsed state shows only the centered `MessageSquare` icon inside the blue circle; hover expands to width 32 and reveals the "Feedback" label.

## Verification

After edit, reload `/admin/clients`, confirm white message-square icon is visible inside the blue circle, and hovering expands the pill with the "Feedback" label.

## Out of scope

No changes to `UtilityTray`, sidebar, or any other component. Position remains `fixed bottom-6 left-6`.