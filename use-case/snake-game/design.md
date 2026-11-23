# Snake — Pocket Arcade

- **Source issue:** [#2 — Snake game](https://github.com/tvriesde/dark-factory/issues/2)
- **Design status:** Wireframe fallback used; no verified Figma link was provided.
- **Scope:** Static, self-contained Nokia-inspired Snake game. No external services, build step, or dependencies.

## Annotated wireframes

### Desktop (wide viewport)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ POCKET ARCADE                                           CLASSIC SERIES / 01│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  A LITTLE BIT OF NOSTALGIA                  ✳  THE ORIGINAL TIME-KILLER   │
│  Snake.                                      One more                    │
│  ┌──────────────────────────────┐            round?                       │
│  │ SCORE                        │            Collect dots; grow; avoid    │
│  │ 00                           │            walls and your own tail.      │
│  ├─ vintage screen bezel ───────┤                                          │
│  │  20 × 20 dot-matrix board    │            HOW TO PLAY                  │
│  │  · snake and safe food       │            ↑ ↓ ← →  Keyboard steering   │
│  │  · ready / running / paused  │            ✣         Touch direction pad│
│  │  · collision / cleared state │            Ⅱ         Pause or resume     │
│  ├──────────────────────────────┤            NO WIFI. JUST ONE MORE TRY.   │
│  │ [ Start game ] [ Pause ]     │                                          │
│  │   ↑                          │                                          │
│  │ [←][↓][→]   concise status   │                                          │
│  └──────────────────────────────┘                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ MADE FOR THE IN-BETWEEN MOMENTS                          © POCKET ARCADE  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (narrow viewport)

```text
┌──────────────────────────┐
│ POCKET ARCADE       / 01 │
├──────────────────────────┤
│ A LITTLE BIT OF NOSTALGIA│
│ Snake.             SCORE │
│                    00    │
│ ┌──────────────────────┐ │
│ │   responsive square  │ │  Board stays within the viewport;
│ │    20 × 20 display   │ │  no sideways scrolling, including at 280px.
│ └──────────────────────┘ │
│ [      Start game      ] │
│ [ Pause ]                │  Pause/restart and direction controls
│           [↑]            │  direction controls have 44px targets.
│        [←][↓][→]         │
│ Ready / event / final    │  Concise polite live status; score at top.
│                          │
│ ✳ THE ORIGINAL TIME-KILLER│
│ One more round?          │
│ Collect dots; avoid      │
│ walls and your own tail. │
│ HOW TO PLAY              │
│ ↑ ↓ ← → Keyboard         │
│ ✣ Touch direction pad    │
│ Ⅱ Pause or resume        │
└──────────────────────────┘
```

## Interaction and accessibility notes

- States are ready, running, paused, and game over; the score starts at zero and restart resets the board and score.
- The 20 × 20 board safely chooses food from unoccupied cells and ends with a board-cleared message if no cells remain.
- While running, arrow keys steer even when a button has focus; arrow keys remain available for normal input, select, textarea, link, and editable-content navigation. Consumed arrows do not scroll the page and steering does not move focus. The touch direction pad uses labeled buttons with 44 × 44px targets; immediate reverse turns are ignored.
- Status messages use a concise polite live region. Buttons retain focus; reduced-motion preferences are respected.
- Desktop uses a board-and-notes two-column layout. At narrow widths it stacks into a single column and scales the square board to the viewport.
