# Balloon Pop Panic design

- Source issue: https://github.com/tvriesde/dark-factory/issues/24
- Design status: wireframe fallback (annotated wireframes in this file). No Figma file exists for this case. Reference images from the maintainer are being ignored for now (maintainer request) and are pending a later restyle.
- Design source: the approved UX handoff for #24. Colour tokens, geometry, timings and core copy follow it. Some live-region and keyboard-hint wording was finalised during implementation and is marked *(implementation wording)*.
- Scope: self-contained offline one-button arcade game. Static HTML/CSS/vanilla JS with no build, network, fonts or images. All data is synthetic, and the only persisted values are best score and mute.

## Concept

A balloon rises automatically through rows of obstacles. Every row has a single centred gap: wide (96–140) or narrow (44–60). Press and hold (pointer, touch or Space) to shrink the balloon so it fits through narrow gaps. Shrinking costs energy, and coins restore it. If the balloon touches an obstacle it gets stuck, wobbles, and pops.

## Wireframe: desktop (≥ 600 px wide)

```text
┌─────────────────────────── page background (page) ───────────────────────────┐
│                     ┌──────── #frame 9:16, radius 24, shadow ────────┐        │
│                     │ ( 842 m )                   ( ◯ ▮▮▮▮▮▯▯▯  ! )  │ ← HUD pills (aria-hidden)
│                     │        ☁                 ☁                    │   score left, energy right
│                     │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← narrow row (44–60 gap)
│                     │                 ●                              │ ← coin r10 (centre or ±40–70)
│                     │ ▓▓▓▓▓▓▓▓▓▓▓              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← wide row (96–140 gap)
│                     │                ⌒⌒⌒                             │
│                     │              ╎ ( ◕‿◕ ) ╎ ← balloon x=180 y=448   │
│                     │                ⌣⌣⌣  dashed pickup ring 64/20  │
│                     │                  §  string                    │
│                     │                                               │
│                     └──── height min(100dvh − 48px, 860px) ─────────┘        │
└───────────────────────────────────────────────────────────────────────────────┘
```

- Logical field 360 × 640 units, scaled uniformly (`scale = min(w/360, h/640)`) and centred. The whole canvas is filled with sky first, so any letterbox is sky-coloured. Obstacles and clouds continue into the letterbox horizontally.
- Canvas backing store = CSS size × devicePixelRatio, recomputed on resize.

## Wireframe: mobile (< 600 px wide)

```text
┌ safe-area ───────────────────┐
│ ( 842 m )      ( ◯ ▮▮▮▯ ! )  │ ← HUD respects env(safe-area-inset-*)
│                              │
│ ▓▓▓▓▓▓▓▓▓▓     ▓▓▓▓▓▓▓▓▓▓▓▓  │
│         ●                    │
│ ▓▓▓▓▓▓▓            ▓▓▓▓▓▓▓▓  │
│          ( ◕‿◕ )             │
│              §               │
│  full 100dvw × 100dvh,       │
│  no radius, sky letterbox    │
└──────────────────────────────┘
```

- No in-play pause button (see Decisions). Auto-pause runs on visibility change or blur.
- The keyboard hint is hidden on `pointer: coarse`.

## Overlays (sections above #game; `hidden` attribute)

```text
Start                         Paused                        Game over
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│  Balloon Pop Panic   │ h1   │        Paused        │ h2   │         Pop!         │ h2
│ Hold to shrink,      │      │       842 m          │      │       842 m          │
│ collect coins for    │      │ [      Resume      ] │ ←focus│   ★ New best!        │ badge (only if new)
│ energy               │      │ [      Restart     ] │      │    Best 1,234 m      │
│ [      Start       ] │←focus│ [ ♪  Sound: On     ] │      │ [      Restart     ] │ ←focus
│ [ ♪  Sound: On     ] │      │  P or Esc to resume  │      │ [ ♪  Sound: On     ] │
│    Best —            │      └──────────────────────┘      └──────────────────────┘
│ Space: hold · P: pause · M: mute   (hidden on coarse pointers)
└──────────────────────┘
```

- Cards: `min(320px, 100% − 32px)`, buttons ≥ 48 px tall, focus ring 3 px ink with 2 px white offset.
- While an overlay is open, `#game` has `aria-hidden="true"` and `tabindex="-1"`. During play it has `tabindex="0"` and receives focus.
- Overlays sit above `#game`, so a button tap never becomes a hold.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--ink` | `#3D2B4F` | HUD text, face features, primary button fill, focus ring |
| `--ink-soft` | `#5B4A6E` | obstacle 3px outline, secondary text |
| `--paper` | `#FFFFFF` | overlay cards, HUD pills, button text on ink |
| `--page` | `#F6F1FA` | desktop page background around the play column |
| `--balloon` / `--balloon-dark` | `#FF8FA3` / `#E8657F` | balloon gradient (white highlight) |
| `--blush` | `#FF6F8A` | cheeks |
| `--coin` / `--coin-rim` | `#FFC83D` / `#C98A00` | coins |
| `--energy` / `--energy-low` | `#2BB39A` / `#E8505B` | energy bar fill, low stripes + "!" |
| Obstacle pastels | `#F7A8C4`, `#9ED8DB`, `#B8B3E9` | obstacle fills with `ink-soft` outline |
| Sky 0–4 | `#FDE2E4` dawn pink, `#FFE8CC` peach, `#DFF5E8` mint, `#DCEBFA` sky blue, `#E8E0F7` lavender | `floor(score/500) % 5`, crossfade |

Contrast: `ink` on `paper` ≈ 12.7:1 (HUD pills and buttons); `ink-soft` outlines ≈ 6:1 on every sky stop; energy level is shown by fill length plus stripes/"!" when low, not colour alone.

## Geometry

- Balloon centre fixed at x=180, y=448 (logical). Base radius 36 (large) or 16 (small). Collision hitbox = 0.9 × base radius. Visual squash or elastic overshoot never enlarges the hitbox (radius clamped to 16..36 before × 0.9).
- Pickup radius interpolates 64 ↔ 20 with the same progress as the size tween, drawn as a dashed ring. A coin is collected when its distance is ≤ pickup + 10.
- Coins: r10, gold with rim and sparkle. They appear only between rows, at least 20 units clear of a row. About half of the optional coins are off-centre at x = 180 ± (40–70), clamped to 10..350, so off-centre coins can only be reached while large. Coins added to keep the 2.5 s / 3.5 s spacing are always centred, so overall roughly 35–40% of coins are off-centre.
- Rows: `{y, h 24–40, gap, kind: block | pill | triangle}`. The left part spans x 0..180−gap/2 and the right part 180+gap/2..360. Gap-facing edges are vertical (block, triangle) or rounded outward (pill capsule, whose rounded tip ends exactly at the gap edge). Collision is exact per shape: circle–rect clamp, capsule segment distance, and triangle point-in-polygon or edge distance.
- Gaps: wide 96–140, narrow 44–60, always centred.

## Difficulty

- Rise speed v(t) = 120 + 140·min(t,60)/60 units/s. Altitude A(t) = 120t + (7/6)t² for t ≤ 60, then linear at 260/s.
- Narrow-row share rises from 0.2 to 0.6 over 60 s. Row spacing goes from 280 to 170, and is always ≥ previous row height + 90.
- Rows are generated ≥ 640 units ahead of the screen top and dropped 100 units below the screen.
- Coin guarantee: at least one coin every 2.5 s while t < 20, then every 3.5 s. Altitude is converted to arrival time with A(t).

## Energy and score

- Energy starts at 50 (max 100). It drains 25/s only while small. A coin adds 15 energy and does **not** change the score.
- At 0 energy the balloon is forced to re-inflate. Holding at 0 gives empty feedback (puff sound and bar flash), throttled to 600 ms, and the balloon stays large. If a coin arrives while still holding, shrinking resumes.
- Low energy (≤ 20): the HUD pill gets the `.low` class (red striped fill and "!"), the face turns nervous, and a chime plus "Low energy." announcement play once. This re-arms when energy goes above 30.
- Score = floor(altitude / 10) m, and the HUD updates only when it changes.

## Expressions (priority order)

| State | Face |
|---|---|
| popped | × × eyes, flat mouth |
| trapped | wide eyes, wobble (no wobble under reduced motion) |
| strained (holding at 0 energy) | ≧ ≦ eyes, gritted mouth |
| squeezed (small / shrinking) | > < eyes, tight mouth |
| bounce (re-inflating) | ^ ^ eyes, open smile |
| nervous (energy ≤ 20) | ⊙ ⊙ eyes, sweat drop, tremble (no tremble under reduced motion) |
| happy (default) | dot eyes, smile |

## Timings

| Event | Default | Reduced motion |
|---|---|---|
| Shrink | 150 ms ease-out | same |
| Inflate | 280 ms elastic | 200 ms ease-out |
| Trapped → pop | 500 ms wobble + 6u shake | 500 ms, no wobble or shake |
| Pop | 250 ms burst + 400 ms shards | 250 ms fade + 400 ms hold |
| Coin collect | sparkle flies to energy pill, pill flash | 120 ms fade, pill flash |
| Sky crossfade | 2.5 s | 6 s |
| Clouds | slow parallax | static |

## State machine

`start → playing ⇄ paused`. Then `playing → trapped (500 ms, on overlap) → popping (650 ms) → gameover → (Restart) playing`. Pause is allowed from playing and trapped; the source state is remembered and the trap timer is frozen. Restart from paused resets the run. Time advances only in playing, trapped and popping. Altitude and difficulty time advance only in playing.

Focus: Start on load, `#game` on play, Resume on pause, Restart on game over.

## Input

- Pointer: `pointerdown` on `#game` while playing, with `setPointerCapture`. Release on pointerup, pointercancel, lostpointercapture or pointerleave. Multi-pointer ids are tracked.
- Keyboard: hold Space to shrink (repeats ignored). Space/Enter starts or restarts on the start and game-over overlays without double-activating buttons. P or Esc pauses and resumes. M toggles mute anywhere. Space and arrow keys never scroll.
- Hiding the page or losing window focus while playing or trapped clears input, re-inflates and pauses (no auto-resume).
- Context menu suppressed. `touch-action: none`, no selection, no callout, no overscroll. Overlay cards may scroll vertically on very short (landscape) screens.
- Short screens (height ≤ 520 px, e.g. phones in landscape) use the full-viewport layout and a compact card.

## Copy

| Where | Text |
|---|---|
| Title | Balloon Pop Panic |
| Start hint | Hold to shrink, collect coins for energy |
| Start button | Start |
| Sound toggle | `♪` (aria-hidden) + visible "Sound: On" / "Sound: Off". The accessible name is the visible text; no aria-label or aria-pressed. |
| Best (start) | "Best —" when none, else "Best 1,234 m" |
| Keyboard hint | Hold Space to shrink · P pause · M mute *(implementation wording)* |
| Pause | "Paused", score "842 m", Resume, Restart, "P or Esc to resume" |
| Game over | "Pop!", score "842 m", "★ New best!" badge, "Best 1,234 m", Restart |
| Game label | "Balloon Pop Panic game. Press and hold, or hold Space, to shrink." with description "Score in metres climbed" |

## Live-region announcements (`#live`, role=status, polite; cleared, then set on the next frame)

| Event | Text *(implementation wording)* |
|---|---|
| Start/restart | Climbing. Hold to shrink. |
| Pause | Paused at 842 metres. |
| Resume | Resumed. |
| Low energy | Low energy. |
| Game over | Pop! 842 metres. New best! / Pop! 842 metres. Best 1,234 metres. |
| Mute toggle | Sound on. / Sound off. |

## Decisions

- Sound toggle label (WCAG 2.5.3 Label in Name): the accessible name is the visible text "Sound: On"/"Sound: Off", and the ♪ glyph is aria-hidden. There is no aria-label or aria-pressed, so the spoken name can't disagree with the visible label.
- No in-play pause button on touch. The PM accepted this, because auto-pause on visibility change or blur covers it. Keyboard users have P/Esc.
- Score is in metres climbed. Coins give energy only and never add score.
- "New best" shows when the score is above the previous best (or above 0 on the first run).
- Reference images from the maintainer are pending a later restyle and are ignored in this version.
