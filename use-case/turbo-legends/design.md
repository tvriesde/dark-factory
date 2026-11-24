# Turbo Legends design

- Source issue: https://github.com/tvriesde/dark-factory/issues/14
- Design status: approved wireframe fallback; no Figma link required or verified.
- Scope: self-contained offline racing game (static HTML/CSS/JS, no build, no network, synthesized audio). All names, art and geometry are original and synthetic. Save key `turbo-legends-v1` unchanged.
- Change in #14: the ground-plane polygon race view is replaced by a classic 16-bit segment road (pseudo-3D strip projection). The menu adds a separate Championship entry. Races gain an optional objective.

## Race view: desktop (16:9 canvas, HUD as DOM overlay)

```text
┌─ 1st/8 ── LAP 2/3 ── 1:24.36 ─── ★ No wall hits ✓ ───────────── [ Ⅱ Pause ] ─┐
│ ░░░ far layer: mountains / skyline / dunes (slow parallax) ░░░  ┌ STANDINGS ┐│
│ ▒▒▒ near layer: hills / buildings / mesas (faster parallax) ▒▒▒ │1 YOU      ││
│════════════════════════ horizon (≈ 45% height) ═══════════════  │2 Vex  +0.4││
│ ▓▓▓▓▓▓▓▓▓▓▓▓ light ground band ▓▓▓▓▓▓▓▓ /\ AI (small, far)      │3 Rook +1.2││
│ ░░░░░░░ dark ground band ░░░  ▞▚▞/  ¦  \▚▞▚  ░░░  ♣ tree (scaled)│…  8 rows  ││
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▚▞▚/    ¦    \▞▚▞ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ └───────────┘│
│ ░░░░░░░░░░░░░░░░░ rumble ▞▚/  [AI]  ¦       \▚▞ red/white ░░░░░░  ┌ MAP ────┐ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▚/          ¦          \▞▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ◯ 8 dots│ │
│ ░░░░░░░░░░░░░░░░░░░░░▞/         ┌──────┐         \▚░░░░░░░░░░░░░ │ you=★   │ │
│ ┌ 187 km/h ─────────┐/          │ YOUR │ ≋ smoke   \             └─────────┘ │
│ │ NITRO ▮▮▮▮▮▯▯▯     │          │ CAR  │ (drift)                              │
│ └────────────────────┘          └──────┘  ← bottom-centre, ~18% width         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Camera: low chase, about 1 car-height above the road. Draw distance about 200 segments; fog blends into the sky colour.
- Road strips: rumble strips alternate every 3 segments, lane dashes on alternate segments, light/dark ground bands follow the same rhythm.
- Curves add to the per-segment x-offset (both directions). Hills set segment y; at a crest the road drops out of sight. Alps tracks have the steepest elevation.
- Parallax: 2 layers (far 0.1×, near 0.3× curve offset) shift opposite to turns and scroll vertically on hills.
- Draw order is back-to-front, so roadside sprites and AI cars are clipped by crests and nearer objects.
- Start/finish: chequered strip across the road with a gantry sprite; chequered band on the minimap.

## Race view: narrow (portrait ≤ 600px; landscape uses the desktop layout with touch pads)

```text
┌ 1st/8 · L2/3 · 1:24.3 · [Ⅱ] ┐
│ ★ No wall hits ✓            │  ← objective chip, 1 line
│ ░ far ░ ▒ near ▒  ┌MAP┐     │
│ ═══════ horizon ═ └───┘     │  ← map 72px; standings = top 3 + YOU
│ ▓▓▓▓▓▞/  ¦  \▚▓▓▓▓ 1 YOU    │
│ ░░░▞/  [AI] ¦  \▚░ 2 Vex    │
│ ▓▞/      ┌────┐   \▚ 3 Rook │
│ /        │CAR │      \      │
│ 187 km/h  NITRO ▮▮▮▯▯       │
├─────────────────────────────┤
│ [ ◀ ][ ▶ ]   [DRIFT][NITRO] │  ← 56px+ pads, multi-touch hold
│              [BRAKE][ GO  ] │
└─────────────────────────────┘
```
The canvas takes the top area; the controls zone is separate so thumbs never cover the road.

## Environment palettes and sprites

| Environment | Sky / fog | Ground light/dark | Rumble | Far / near parallax | Roadside sprites | Special |
|---|---|---|---|---|---|---|
| Coast | #87b9d1 | #8fbf8a / #759d80 | red/white | sea & islands / palm headland | palms, beach huts, lighthouse, signs | – |
| Alps | #90bbd2 | #a9c4bd / #8aa7a1 | red/white | snow peaks / pine ridges | pines, chalets, snow poles, rocks | steepest hills |
| Night City | #1b1b3a | #3e4664 / #2f3650 | magenta/white | skyline + moon / lit towers | neon signs (glow), lamp posts, barriers | tunnels |
| Desert | #e6a976 | #d8a26e / #c89261 | orange/white | dunes / mesas | cacti, rocks, oil drums, warning signs | sandstorm |

- Environments are referenced by index in saves; display names may change without breaking `turbo-legends-v1`.
- Tunnel: ceiling-light strips, dark wall bands with orange lamps every 4 segments, parallax hidden; portal sprite at entry and exit.
- Sandstorm: fog distance roughly halved, pulsing tan haze overlay, drifting grain streaks. Minimap stays clear.
- Solid scenery (posts, rocks, buildings, tunnel walls) causes a bump; soft scenery (grass, sand) only slows the car.

## Car silhouettes (drawn in code, rear view plus steer frames)

1. **Coupe** – low and wide with a ducktail.
2. **Wedge** – flat, angular supercar with a big rear wing.
3. **Roadster** – open top with visible driver head and round lamps.
4. **Van/Rally** – tall boxy body with a roof light bar.

Each AI car has a unique colour plus stripe. The player's car uses garage paint, stripes, wheels, spoiler and body kit, so customisation shows in the race. Sprites scale with distance.

## Effects and reduced motion

| Event | Default | Reduced motion |
|---|---|---|
| Speed | side speed-lines above 70% of top speed; slight car bob | no lines/bob; speed shown by road and sprites |
| Nitro (Shift) | view widens ~15%; exhaust flame; meter drains; whoosh | no view change; static flame; meter and sound unchanged |
| Drift (Space) | car sprite yaws; tyre smoke puffs; squeal; wider slide | small static puff; squeal kept |
| Car or wall collision | short shake; sparks; thud; speed loss; cars pushed apart | no shake; brief red HUD edge flash |
| Off-road | grass/sand particles; rumble buzz | particles off |
| Tunnel/sandstorm | as above | sandstorm haze static, no streaks |

## Main menu

```text
Desktop                                              Narrow
┌─ ◆ TURBO LEGENDS ───────────── $ 1,700 · Settings ┐  ┌ ◆ TURBO · $1,700 · ⚙ ┐
│ YOUR ROAD. YOUR LEGEND.       [ segment-road art ]│  │ [ road art ]          │
│ [ ▶ Race now ]  (Bay Loop, starts at once)        │  │ [ ▶ Race now ]        │
│ PICK YOUR PATH                                    │  │ [ Quick Race ]        │
│ [Quick Race][Championship][Career][Time Trial]    │  │ [ Championship ]      │
│ [Garage]                                          │  │ [ Career ]            │
└───────────────────────────────────────────────────┘  │ [ Time Trial ][Garage]│
                                                       └───────────────────────┘
```
- **Championship:** pick an unlocked environment, then a 3-round points series. Locked environments say which win unlocks them.
- **Career:** Coast → Alps → Night City → Desert. Winning an environment unlocks the next. "Continue: Round 2 of 3, Alps" resumes the saved round.

## Pre-race card (Quick Race, Championship, Career; not Time Trial)

```text
┌ CLIFFTOP RUN · Coast · 3 laps · Normal ───────────┐
│ Rewards 1st $1000 · 2nd $700 · 3rd $500 · 4–8 less │
│ ★ Optional: Finish without hitting a wall   +$250 │
│ [ Start race → ]  [ Back ]                        │
└───────────────────────────────────────────────────┘
```
- One objective per race, chosen by a fixed rule from the track (e.g. "Use nitro 3 times", "No wall hits", "Drift for 5 s total").
- HUD chip states: in progress (`★ Use nitro 1/3`), on track (`★ No wall hits ✓`), failed (greyed, announced).
- Time Trial shows: solo, completion reward plus personal-best bonus, and the current PB.

## Results

```text
┌ RESULTS · Clifftop Run ───────────────────────────┐
│ 1 YOU   4:12.30 │ 5 Kai   on track               │
│ 2 Vex   4:12.71 │ …                              │
│ Finish 1st            $1000                       │
│ Completion bonus      $150                        │
│ Win bonus             $250                        │
│ ★ No wall hits ✓      $250                        │
│ Total +$1650 · Points +10 · Unlocked: Harbor ...  │
│ [ Continue → ] [ Race again ] [ Menu ]            │
└───────────────────────────────────────────────────┘
```
Narrow screens stack standings above the money breakdown. Money is paid once. A failed objective shows `✗ $0`.

## Key interaction states

- **Start:** Race now goes straight to a 3-2-1-GO countdown (large digits, beep each, live announcement); racing within 10 s.
- **Controls:** arrows/WASD, Space drift, Shift nitro, Esc pause. Touch pads support multi-hold and clear on release/cancel. The canvas exposes a live text summary.
- **Nitro empty:** meter flashes; Shift does nothing.
- **Off-road/stuck:** car keeps a minimum crawl speed; a solid hit pushes it back toward the road.
- **Pause:** freezes simulation and audio; focus to Resume. Resume / Settings / Restart / Exit; Restart and Exit confirm; Esc closes the dialog.
- **Finish:** chequered banner and fanfare; remaining cars keep racing; results open with focus on Continue.
- **Garage:** rotatable preview, Buy/Use, 6 upgrades × 5 levels, appearance draft until Apply, inline validation ("Not enough cash", "Max level").
- **Settings:** music/effects volume, mute, reduced motion, reset with confirmation.
- **Storage failure:** persistent session-only warning; invalid stored data is not overwritten without reset.
- **Responsive/a11y:** HUD text on a contrasting plate, visible focus rings, no hover-only actions.

## Decisions (implementation, issue #14)

- **Static-only delivery (deliberate departure).** Issue #14 asks for Three.js / TypeScript / Vite / npm. This repository only allows pure static HTML/CSS/JS on a static file host, with no runtime, build, package manager or network. So the race uses a classic Canvas 2D pseudo-3D segment road (Top Gear/OutRun style), which gives the 3D look with no 3D library. The garage "3D" view is a rotatable Canvas 2D box-model preview of the selected car's silhouette. Scripts are classic `<script defer>` files that share globals, loaded in the order `content → storage → audio → track → sim → render → game`. The page also works from `file://`.
- **Rewards:**

  | Item | Amount |
  |---|---|
  | Finishing places 1–8 | $1000 / 700 / 500 / 350 / 250 / 175 / 125 / 100 |
  | Completion (every mode, including Time Trial) | $150 |
  | Win | $250 |
  | Personal best | $150, only when beating an existing best |
  | Optional objective | $250 |

  Championship points are unchanged: 10/8/6/5/4/3/2/1. Rewards are paid once per race.
- **Economy:** car prices are ×1.5 the previous values. An upgrade costs 300 × the level being bought ($300 … $1500).
- **Objectives** are chosen by track id % 3:
  - no wall hits (solid scenery and tunnel walls only, not car bumps);
  - use nitro 3 times;
  - drift for 5 s in total.

  The HUD chip shows the state: in progress, ✓ or failed.
- **AI:** five personalities (Aggressive, Defensive, Technical, Speedster, Balanced), seated A, D, T, S, B, A, T.
  - Difficulty factor: easy .88, normal .96, hard 1.04, plus .02 per world and .01 per championship round.
  - AI class pace rises 6% per world to match unlockable cars.
  - A mild ±4% catch-up band keeps the pack in sight without deciding positions.
  - The player starts 5th on the grid.
- **Championship vs Career:**
  - Championship (new) lets you pick any unlocked world and race its 3 rounds for points. Progress is saved in `cup`, and it unlocks nothing.
  - Career keeps `championship` and runs Coast → Alps → Night City → Desert. Winning a world's career championship unlocks the next world.
  - Old saves load intact; `cup:null` is added when missing.
- **Naming:** the world label "Neon City" is now "Night City". Track ids, names and order are unchanged.

## Fix cycle (issue #14, Tester follow-up)
- **Narrow HUD (≤ 800px):** row 1 holds Position, Lap, Time and Pause at a fixed 54px height. Row 2 (8px gap) holds the objective chip on the left (one line, ellipsis) and a single-column standings plate on the right (128px wide). The plate shows the top 3 plus YOU, with true positions (e.g. `5. YOU`). Plates no longer touch or overlap. The inline `<style>` block in `index.html` has moved into `styles.css`.
- **Separate controls zone (≤ 800px or `pointer:coarse`):** pads sit in a 76px bar below the canvas. The canvas fills the area above, and its backing size follows its box, so the road, AI cars and player car stay uncovered and in the right place. The speed/map HUD sits just above the bar. Desktop with a mouse is unchanged.
- **Nitro objective:** a press counts as one use only after the burst has boosted for 0.4s (`NITRO_USE_TIME`, ≈10 nitro units). One long hold counts once, and quick taps don't count.
