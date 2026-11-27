# Santa's Gift Ideas

- **Source issue:** [#19 — Santa page: clicking Santa makes him laugh and drop Christmas gift ideas for kids](https://github.com/tvriesde/dark-factory/issues/19)
- **Design status:** Wireframe fallback used; no verified Figma link was provided (Figma not required for this issue).
- **Scope:** Static, self-contained festive page. Pressing an inline-SVG Santa makes him shake and laugh (optional synthesized Web Audio "ho ho ho") and drops a made-up kids' gift idea card. No external URLs, fonts, images, libraries, network, storage, build step, or dependencies.

## Annotated wireframes

### Desktop (> 720px, two columns, max-width 1040px, 24px gutters)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Santa's Gift Ideas                                      (h1, red)         │
│ Click Santa to hear him laugh and get a gift idea for kids.  (muted)      │
├────────────────────────────────────┬─────────────────────────────────────┤
│ STAGE (#E8F3EC)                    │ Gift ideas                  (h2)    │
│        ( Ho ho ho! )  ← bubble,    │                                     │
│          aria-hidden, 1.6s         │ 🎁 Click Santa to get gift ideas!   │
│        ┌──────────────┐            │    ← empty state, hidden w/ cards   │
│        │   Santa      │ ← <button> │ ┌─────────────────────────────────┐ │
│        │   inline SVG │   SVG      │ │ 🧸 Teddy bear             [NEW] │ │ ← newest first,
│        │   240px      │   shakes   │ └─────────────────────────────────┘ │   red 3px border
│        └──────────────┘   700ms    │ ┌─────────────────────────────────┐ │
│    Ask Santa for a gift idea       │ │ 🪁 Kite                         │ │ ← green 2px border
│      (caption = accessible name)   │ └─────────────────────────────────┘ │
│                                    │   … up to 6 cards, oldest trimmed   │
│  [🔊 Sound On]  [ Clear ideas ]    │                                     │
│   aria-pressed   disabled if empty │                                     │
├────────────────────────────────────┴─────────────────────────────────────┤
│ Ideas are made-up examples. No brands, prices or links.   (small, muted)  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (≤ 720px, single column, 16px padding, 320px safe)

```text
┌──────────────────────────┐
│ Santa's Gift Ideas       │
│ Click Santa to hear him  │
│ laugh and get a gift     │
│ idea for kids.           │
│ ┌──────────────────────┐ │
│ │     ( Ho ho ho! )    │ │  Bubble max-width 90% of stage.
│ │    ┌────────────┐    │ │
│ │    │ Santa SVG  │    │ │  Art width min(60vw, 200px);
│ │    │            │    │ │  button target ≥ 160 × 160.
│ │    └────────────┘    │ │
│ │ Ask Santa for a gift │ │  Caption wraps; no sideways scroll.
│ │        idea          │ │
│ │ [🔊 Sound On]        │ │  All buttons ≥ 44 × 44px;
│ │ [ Clear ideas ]      │ │  controls wrap when narrow.
│ └──────────────────────┘ │
│ Gift ideas               │
│ ┌──────────────────────┐ │
│ │ 🎲 Board game  [NEW] │ │  Long labels wrap (overflow-wrap).
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 🧩 Jigsaw puzzle     │ │
│ └──────────────────────┘ │
│ Ideas are made-up …      │
└──────────────────────────┘
```

### Key states

```text
IDLE / EMPTY    Santa still, no bubble; "🎁 Click Santa to get gift ideas!" shown;
                Clear ideas disabled (#4A4F4B on #E6E2DA, dashed border).
LAUGHING (≤2s)  SVG shakes 700ms (two bounce/rotate cycles); "Ho ho ho!" bubble
                pops in (scale .8→1, 150ms) and hides after 1.6s; short 3-note
                synthesized laugh plays if Sound is on.
IDEA DROPPED    New card drops in from above (600ms) at top of list with red
                border + NEW tag; previous newest card returns to green border;
                list trimmed to 6; empty text hidden; Clear enabled; status
                region announces "Santa suggests: {label}."
SOUND OFF       Button shows 🔇 Sound Off, green text + green border on paper,
                aria-pressed="false"; Santa still shakes and drops ideas silently.
REDUCED MOTION  prefers-reduced-motion: reduce removes shake, bubble pop and card
                drop; bubble and cards still appear/disappear instantly.
```

## Interaction and accessibility notes

- Activating Santa via click, tap, Enter or Space (native `<button>`) produces exactly one laugh, one gift idea and one polite announcement: "Santa suggests: {label}."
- Ideas come from a shuffled deck of 15, so no idea repeats until all 15 have been shown; when the deck reshuffles, the first idea of the new cycle is never the same as the last idea of the previous one.
- Clear ideas empties the list, re-shows the empty state, disables itself, moves focus back to Santa and announces "Gift ideas cleared." The deck is untouched, so the cycle continues without early repeats.
- Rapid presses restart the shake animation cleanly and reset the single bubble timer; only one laugh sound plays at a time (presses during a laugh stay silent but still add ideas).
- The Sound toggle has the accessible name "Sound" with `aria-pressed` conveying on/off (emoji and On/Off text are `aria-hidden`). The AudioContext is created lazily on the first Santa press while sound is on — never on page load or on the toggle — and any audio failure falls back silently.
- The Santa SVG and speech bubble are decorative (`aria-hidden`); the button's name comes from its visible caption "Ask Santa for a gift idea". Card emoji and NEW tags are `aria-hidden`; labels are inserted with `textContent` only.
- Reduced-motion preference removes the shake, bubble pop and card drop animations.
- Colours meet WCAG AA: ink #1F2A24 on paper #FFF8EE ≈ 14:1; white on red #B3202A ≈ 6.6:1; white on green #1E6B3A ≈ 6.5:1; muted #4A4F4B on paper ≈ 7.9:1; red text on the white bubble ≈ 6.6:1. Focus is a 3px ink outline with 3px offset.
- Desktop uses a stage-and-ideas two-column grid; at ≤ 720px it stacks into one column with no horizontal scroll down to 320px.
- Gift list (15, synthetic, no brands/prices/links): 🪁 Kite, 📚 Picture book, 🧱 Building blocks, 🖍️ Crayons and sketchbook, 🧩 Jigsaw puzzle, 🧸 Teddy bear, ⚽ Football, 🎲 Board game, 🚂 Toy train, 🎨 Paint set, 🔬 Junior science kit, 🎹 Toy keyboard, 🛼 Roller skates, 🪀 Yo-yo, 🔭 Star-gazing telescope.
