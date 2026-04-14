# Weather Dashboard Implementation Plan

## Goal
Turn the current weather dashboard prototype into a polished, premium-feeling personal weather dashboard, with a later signature expansion into ocean & beach conditions for Indian Harbour Beach.

## Guiding Product Decisions
- Keep the strong dark premium visual identity.
- Preserve the prominent Home / Work / Current / Search location switcher.
- Keep inline radar on desktop, but remove developer-facing wording.
- Prioritize user-facing weather usefulness over prototype filler.
- Treat Ocean & Beach as the next major signature module.

## Phase 1 — Immediate UX / Product Fixes
These are the top reviewer-driven improvements that should happen first.

### 1. Remove or replace non-functional pill buttons
- Remove "Best for a quick weather check" and "Commute-friendly glance" if they are not real controls.
- Do not leave marketing-copy-like UI elements that imply interactivity.

### 2. Remove developer-style radar language
- Replace "Regional radar active · local zoom upgrade next" with user-facing wording.
- Suggested text: "Radar: Regional storm view" or similar.

### 3. Add visible last-updated timestamp near current conditions
- Show a clear freshness indicator near the hero card.
- Keep top-right provider attribution as a separate transparency cue.

### 4. Make full-screen radar CTA more obviously button-like
- Stronger fill/border/contrast.
- Make it feel actionable, not like passive text.

### 5. Reduce duplicated stats
- Remove repeated secondary metrics from one of the duplicate locations.
- Keep a clearer hierarchy between hero summary and lower detail cards.

### 6. Add sunrise / sunset info
- Add as a detail card or sub-card.
- Later enhancement: sun arc visualization.

## Phase 2 — Premium Weather Experience Improvements

### 7. Make Rain Summary card dynamic
- If rain matters: show rain summary and later mini precip graph.
- If rain does not matter: swap to another useful contextual card (UV, AQI, pollen, comfort).

### 8. Improve hourly forecast with trend visualization
- Add mini sparkline / temperature curve.
- Keep hourly pills/cards but add trend visibility.

### 9. Add comfort / what-to-wear summary
- One-line actionable summary based on conditions.
- Example: "Warm and muggy — sunglasses recommended."

### 10. Add severe weather alerts banner
- Especially important for Florida.
- Use NWS alerts and clear severity styling.

## Phase 3 — New Data Modules

### 11. Air Quality Index (AQI)
- Add colored AQI card.
- Likely source: AirNow or similar free source.

### 12. Astronomy
- Moon phase, illumination, moonrise/moonset.
- Lower priority than AQI and alerts.

## Phase 4 — Ocean & Beach Conditions Module
This becomes the next major signature feature.

### Ocean / Beach data goals
- Tide chart (12–24h)
- Current tide state
- Water temperature
- Wave height / period
- Wind context
- UV and rip current risk
- Overall beach conditions rating
- One-line recommendation

### Likely sources
- NOAA CO-OPS for tides
- NOAA NDBC / Open-Meteo Marine for water temp and waves
- NWS Surf Zone Forecast for rip current risk

## Immediate Work Order (Start Now)
1. Remove pill buttons
2. Replace radar dev note with user-facing copy
3. Add last updated near hero
4. Improve radar button styling
5. Deduplicate duplicate stats
6. Add sunrise/sunset detail card

## Notes
- Mobile rendering bug remains unresolved and should be revisited with proper visual QA, but it is not the current focus.
- Current goal is premium desktop/product polish plus stronger feature integrity.
