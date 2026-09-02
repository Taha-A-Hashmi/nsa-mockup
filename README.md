# NSA Professional Services — one-page concept mockup

A pitch mockup for [nsacom.com](https://nsacom.com/) (NSA Computer Exchange Corp. —
"The Human Side of ERP"). Not a live site; prepared to show a proposed redesign.

## Run it

- `node serve.mjs` → http://localhost:5300 (recommended), **or**
- double-click `index.html` (works offline; everything is vendored locally).

## What's in it

One page, six beats:

1. **Hero** — night container-port time-lapse (Mixkit, free licence) motion-interpolated
   to 3× length, ping-pong looped, graded to NSA navy; decorative "data layer" HUD chips
   (CSD / EDI / TWL) with drawn connector ticks. Headline is NSA's own brand line.
2. **Clients** — marquee of 12 real client logos from nsacom.com on uniform chips.
3. **Stats** — count-ups: 40 years · 200+ distributors · 3× TUG Partner of the Year · US & Canada.
4. **Solutions** — six cards (BOR, WOR, CSD, SX.e→CSD, data conversion, NSA+ integration)
   with cursor spotlight; NSA+ ecosystem marquee strip.
5. **Migration path** — scroll-scrubbed 5-step line (Assess→Plan→Convert→Go live→Grow)
   over dimmed port footage.
6. **Story** — pinned horizontal 40-year timeline (1984→2024, real milestones) with an
   outlined year watermark that tracks the scroll; then the contact close.

Motion layer: Lenis smooth scroll, GSAP + ScrollTrigger + SplitText line-mask reveals,
session-scoped loader, custom cursor, magnetic buttons, header hide, scroll progress bar.
All libraries, fonts (Space Grotesk/Inter via Fontsource), and media are local — no CDN
at runtime. Reduced-motion and coarse-pointer fallbacks included.

## Facts used (all from nsacom.com)

Founded 1984 · Infor's first Implementation Alliance Partner (2016) · Canada 2017 ·
MCI 2020 · NSA+ 2020 · TUG Channel Partner of the Year 2020/21/22 · NoviPro 2024 ·
Infor Growth Partner & CSD Partner awards 2024 · 200+ partners · (516) 240-6020 ·
solutions@nsacom.com. Brand blue `#0099d8` sampled from their logo SVG.
