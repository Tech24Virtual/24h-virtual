# Hero Messaging Map

## Renderer
`src/components/home/HeroSection.tsx`

## Source of truth
`src/content/heroMessaging.ts`

## Switcher behavior
- Random per page load via `pickHeroVariant()`
- Not persisted across reloads
- Not query-param driven
- No analytics tagging (no GA4 event, no `data-hero-variant` attribute)

## Editable fields (per variant)
- `id` — stable string identifier
- `headline` — first line of the H1
- `highlightedWord` — coral-underlined phrase that visually anchors the headline
- `description` — supporting paragraph below the H1
- `ctaText` — primary button label
- `ctaLink` — primary button destination

## Editable feature checklist
`heroFeatures: string[]` — the 4 checkmarked items rendered to the right of the headline.

## How to add a 7th variant
Append a new object to `heroVariants` in `src/content/heroMessaging.ts`. The randomizer will pick it up automatically.

## How to force one variant temporarily
Comment out the other entries in `heroVariants` rather than deleting them. Restore by un-commenting.

## Out of scope (still inline in HeroSection.tsx)
- Trust badge ("Trusted by 1000+ Businesses")
- "Watch Demo" secondary CTA
- Stats bar ("1M+ Calls Answered" / "<3 Rings Average")
- Floating cards (Incoming call, Appointment booked, Message sent)
- Callback widget trigger and modal
- Hero image and decorative shapes
