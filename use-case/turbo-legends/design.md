# Turbo Legends design

- Source issue: https://github.com/tvriesde/dark-factory/issues/21 (latest). History: https://github.com/tvriesde/dark-factory/issues/14 (segment road, Championship, objectives; decisions kept below).
- Design status: wireframe fallback (annotated sketches in this file). Figma is not required by #21, no maintainer review was requested, and no Figma file exists for this change.
- Scope: self-contained offline racing game (static HTML/CSS/JS, no build, no network, no external fonts/tiles, works from `file://`). All names, art and geometry are original and synthetic; landmarks are simplified shapes drawn in code, not traced. Save key `turbo-legends-v1` unchanged; worlds stay referenced by index; track ids/names/order/layouts unchanged.
- Change in #21: every track gets its own city theme (12 cities). The setup screen's track card list is replaced by a world map with 12 city markers.

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

## World traits (unchanged)

| World | Tracks | Edge prop | Special |
|---|---|---|---|
| Coast | 0–2 | sign | – |
| Alps | 3–5 | snow poles | steepest hills |
| Night City | 6–8 | lamp posts | tunnels |
| Desert | 9–11 | drums | haze (sandstorm on Dune Ridge only) |

- Environments are referenced by index in saves; display names may change without breaking `turbo-legends-v1`.
- Tunnel: ceiling-light strips, dark wall bands with orange lamps every 4 segments, parallax hidden; portal sprite at entry and exit.
- Sandstorm: fog distance roughly halved, pulsing tan haze overlay, drifting grain streaks. Minimap stays clear.
- Solid scenery (posts, rocks, buildings, tunnel walls) causes a bump; soft scenery (grass, sand) only slows the car.

## City themes (#21)

Data shape (`content.js`, indexed by track id): `CITIES[id] = {city, sky, skyTop, fog, groundLight, groundDark, road, roadDark, rumble:[a,b], lane, parallax:[far,near], props:[{kind,w,cw,min,max}, …]}`.

The renderer reads the colours and layers from `CITIES[id]`. Tunnel, haze, edge props, AI pace and unlock rules still come from `WORLDS[world]`.

Props: each track mixes its 2 city props (45% of random picks, split evenly) with its world's props (55%). All props are solid and cause a bump; grass and sand stay soft and only slow the car. No props are placed in tunnels. The number of random calls per track is unchanged, so layouts stay deterministic.

| # | Track | City | Sky / top / fog | Ground light / dark | Road | Rumble | Far layer (landmark) | Near layer | City props |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Bay Loop | Rio de Janeiro | #87b9d1 / #3f86b4 / #a9cfe0 | #8fbf8a / #759d80 | #5b5f66 | #d94a3d / #f2efe6 | rioBay: sea, rounded granite domes, cable-car wire | rioHillside: colourful box houses on a green hill | lifeguard tower, coconut kiosk |
| 1 | Clifftop Run | Sydney | #8ccbe8 / #2c7fc9 / #b4dcef | #7fb877 / #5f9a62 | #5a6068 | #1f5fa8 / #f2efe6 | sydHarbour: water, steel arch bridge, sail-roof hall | sydCity: low glass towers | jacaranda, ferry wharf sign |
| 2 | Harbor Switchbacks | Cape Town | #9fc0d0 / #56809f / #c6d6de | #a3b783 / #879a68 | #5e5f63 | #f2c230 / #2b6f4a | capeTable: flat-topped mountain, cloud band | capeRows: pastel row houses | striped bathing box, protea bush |
| 3 | Valley Ring | Innsbruck | #90bbd2 / #4d86b3 / #d6e6ee | #a9c4bd / #8aa7a1 | #5d6168 | #d94a3d / #f2efe6 | innPeaks: jagged peaks, curved ski-jump tower | innOldTown: onion-dome tower, pastel gables | gondola pylon, painted gable house |
| 4 | Glacier Pass | Vancouver | #8aaabf / #3d6688 / #c2d2dc | #7fa58c / #628a72 | #555b61 | #e05a2a / #f2efe6 | vanCoastRange: snowy range, slim disc-top tower | vanCedars: tall cedars, glass towers | red maple, glass bus shelter |
| 5 | Summit Hairpins | La Paz | #5f9fdc / #1b55a3 / #b0cdea | #b9a37f / #9d8865 | #66605a | #d9302f / #f2d24a | lpzIllimani: three-summit snow peak, cable line with coloured cabins | lpzSlopes: brick-red houses on slopes | cable-car tower, striped market stall |
| 6 | Neon Circuit | Tokyo | #1b1b3a / #080818 / #26264a | #3e4664 / #2f3650 | #3a3d4a | #e040c8 / #f2efe6 | tkyTower: skyline, red/white lattice tower (world moon only) | tkySigns: vertical neon sign stacks, no text | vending machine, lantern post |
| 7 | Elevated Express | Chicago | #1a2338 / #060a15 / #22304a | #3a4553 / #2c3440 | #3d4047 | #2f9be0 / #f2efe6 | chiLakefront: lake, dark tower with twin antennas | chiElevated: elevated rail girders | steel girder column, street clock |
| 8 | Midnight District | Hong Kong | #26173c / #0c0619 / #33204c | #403c5c / #302c46 | #3b3946 | #ff4a4a / #ffd84a | hkgPeak: dark ridge, dense lit towers, faceted triangle tower | hkgHarbour: water reflections, junk-sail boat | bamboo scaffold, tram-stop sign |
| 9 | Oasis Loop | Cairo | #e6a976 / #c9744f / #e9b98a | #d8a26e / #c89261 | #6a5f58 | #e8772e / #f6efe2 | caiPyramids: three pyramids on dunes | caiDomes: domes and minarets | date palm, obelisk post |
| 10 | Canyon Trail | Las Vegas | #f0a878 / #7c4a8c / #f2c09c | #cf8a5a / #b6744a | #655a57 | #ff3f8a / #f6efe2 | lvsRedRock: striped red-rock ridge | lvsStrip: resort towers, needle tower with pod (no brands) | bulb marquee sign (no letters), joshua tree |
| 11 | Dune Ridge | Dubai | #f2c58e / #d68c4c / #f5d3a6 | #e6c088 / #d2a670 | #6e655c | #1fa39a / #f6efe2 | dxbSpire: very tall stepped spire, towers | dxbDunes: dunes, sail-shaped tower | wind tower, camel-crossing sign |

- Layers are seamless 1024×256 tiles drawn in code; each landmark appears once per tile and stays at least 40px from the tile edges.
- Rio, Innsbruck, Tokyo and Cairo keep their world's previous colours (sky, ground, road, rumble); their layers and props are new.
- No two rows share a colour set or a layer pair. Signs are pictograms only.
- HUD unchanged (DOM overlay on dark plates, readable on every sky).

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

## Setup screen: world map (#21)

Desktop (>480px; map and details panel side by side above 800px, stacked at 481–800px)

```text
┌─ ← Back ── QUICK RACE ─────────────────────────────────────────────────────────┐
│ WORLD MAP                                                ┌ RACE DETAILS ─────┐ │
│ ┌──────────────────────────────────────────────────────┐ │ Clifftop Run      │ │
│ │  [▲🔒] Vancouver   [▲]Innsbruck          Tokyo [■🔒]  │ │ Sydney · Coast ·  │ │
│ │        [■] Chicago                                   │ │ Difficulty 2/3 ·  │ │
│ │  [◆] Las Vegas      Cairo [◆]    Hong Kong [■]       │ │ 3 laps            │ │
│ │            [▲] La Paz        [◆] Dubai               │ │ AI difficulty [▾] │ │
│ │ Rio de Janeiro (●)            Sydney (●✓)  ← 🚗 arc   │ │ Selected car: …   │ │
│ │              [●] Cape Town                           │ │ [ Start race → ]  │ │
│ └──────────────────────────────────────────────────────┘ └───────────────────┘ │
│ Arrow keys move between cities. Enter or Space selects.   (help, aria-describedby)
│ Sydney – Clifftop Run · Coast · ●●○ · Selected             (preview strip, not live)
│ ● Coast  ▲ Alps  ■ Night City  ◆ Desert  ✓ Selected  🔒 Locked  NOW Current round │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Wide positions (x%, y% of the map; L = label left of marker): Vancouver 14,20 · Las Vegas 15,49 · Chicago 30,32 · La Paz 29,66 · Rio de Janeiro 37,78 L · Innsbruck 51,20 · Cairo 54,40 L · Cape Town 54,84 · Dubai 64,56 · Hong Kong 83,42 L · Tokyo 88,28 L · Sydney 90,74 L.

Narrow (≤480px, portrait map 3:4.4, labels under markers, three region bands)

```text
┌ WORLD MAP ──────────────────────────┐
│┌AMERICAS──┬EUROPE·AFRICA┬ASIA·OCEANIA┐
││ ▲         │  ▲          │           │
││Vancouver  │ Innsbruck   │    ■      │
││    ■      │             │  Tokyo    │
││ Chicago   │    ◆        │           │
││ ◆         │  Cairo      │    ■      │
││Las Vegas  │             │ Hong Kong │
││  ▲        │      ◆      │           │
││ La Paz    │    Dubai    │    ●      │
││     ●✓🚗  │    ●        │  Sydney   │
││ Rio de J. │ Cape Town   │           │
│└───────────┴─────────────┴───────────┘
│ help · preview strip · legend        │
│ ┌ RACE DETAILS (stacked below) ─────┐│
└──────────────────────────────────────┘
```

Narrow positions (x%, y%): Vancouver 15,8 · Chicago 30,22 · Las Vegas 13,36 · La Paz 18,62 · Rio de Janeiro 34,72 · Innsbruck 52,8 · Cairo 56,36 · Cape Town 52,86 · Tokyo 86,14 · Hong Kong 86,40 · Dubai 68,58 · Sydney 84,80.

Build notes
- Map art is inline SVG: ocean #13233b, simplified original land shapes #1f3350 with #344157 stroke; the narrow version uses three region band panels. No tiles, fonts or images are loaded.
- Two position sets, switched by `matchMedia("(max-width:480px)")`; on change the token snaps and the career route is redrawn.
- Each marker is a 32×32 hit area (world shape filled with the world colour) plus a text label on a dark plate (#0b1220) so it keeps ≥4.5:1 contrast over the map.
- Label sizes: .82rem (≈13px) above 1000px; .75rem at 481–1000px; .7rem at ≤480px. The details panel is 240–320px wide above 800px (240px at 801–1100px). At 481–1100px the map uses a 3:2 aspect so the labels fit; above 1100px it is 2:1.
- Overlap check: markers and labels do not overlap and stay inside the map at 320, 375, 480, 801 and 1440px (also checked 481–1920px in steps); no horizontal scroll at 320px.

Marker states

| State | Visual (not colour only) | Semantics |
|---|---|---|
| Unlocked | world shape in world colour, label | button, aria-pressed="false" |
| Selected | 3px #f4c85b ring + ✓ chip; token parks above it | aria-pressed="true", name ends "selected" |
| Locked | padlock over a muted marker; label stays full contrast | aria-disabled="true", still focusable, name suffix "locked: <existing reason>" |
| Focus / hover | focus outline with offset; preview strip updates | – |
| Career current | NOW chip + round badge; route line through the world's 3 rounds (finished legs solid) | name suffix "career round N of 3, current round" |
| Career others | normal marker | name suffix "view only" (or "career round N of 3" / "finished") |
| Championship world | dashed ring + round badges 1–3 on the world's cities | name suffix "round N of 3 in <World> championship" |

Accessible name format: `<City> – <Track>, <World>, difficulty N of 3, unlocked|locked: <reason>[, selected][, mode suffix]`, e.g. "Sydney – Clifftop Run, Coast, difficulty 2 of 3, unlocked, selected".

Interaction
- The map is a `role="group"` labelled "WORLD MAP" and described by the help line.
- Roving tabindex: Tab enters the map once on the selected city. Right/Down move to the next track id, Left/Up to the previous one (no wrap); Home goes to Rio (0), End to Dubai (11). Arrows only move focus; Enter/Space/click/tap selects.
- Preview strip (`City – Track · World · ●●○ · state/reason`) shows the hovered or focused city, else the selection. It is not a live region, so arrowing is not noisy.
- Select (Quick Race, Time Trial): selection, details, Start button and note update immediately and "<City> – <Track> selected." is announced; the token travels afterwards.
- Locked city: selection unchanged; the existing lock reason is announced.
- Championship: selecting any city selects its world (the dashed ring and round badges move to its 3 cities); the side panel lists rounds as `Track (City)`. Locked worlds announce their reason; starting while another cup is in progress keeps the abandon dialog.
- Career: the current round is fixed; clicking any city announces "Career tracks follow the championship round order."
- Time Trial: details show PB and reward text; difficulty stays disabled.
- New save: only Rio de Janeiro (Bay Loop) is unlocked and selected; a locked saved selection falls back to Bay Loop.

Token travel
- 20px top-down car in the player's garage paint, `aria-hidden`, decorative only; it parks just above the selected marker.
- Path: quadratic Bézier from its current point to the new marker, control point at the midpoint raised 15% of the map height; the car rotates along the path.
- Duration 400ms + 0.6ms per px of distance, capped at 1200ms, ease-in-out, `requestAnimationFrame`. A new selection mid-flight retargets from the current point.
- Reduced motion (setting or OS), first placement and hidden setup: the token jumps. The career route line is still drawn.

## Pre-race card (Quick Race, Championship, Career; not Time Trial)

```text
┌ CLIFFTOP RUN · Sydney · Coast · 3 laps · Normal ──┐
│ Rewards 1st $1000 · 2nd $700 · 3rd $500 · 4–8 less │
│ ★ Optional: Finish without hitting a wall   +$250 │
│ [ Start race → ]  [ Back ]                        │
└───────────────────────────────────────────────────┘
```
- The city name always follows the track name.
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

## Decisions (issue #21)

- One city per track (12 cities); each track has its own sky/ground/road/rumble colours, two parallax layers with one landmark, and two city props.
- World labels, groups and traits (tunnels, sandstorm, steepest hills, edge props), layouts, objectives, rewards and unlock rules are unchanged.
- Saves are unchanged: no new fields; map selection is in-memory only, as before.
- The world map replaces the card list; every list function (select, lock reason, difficulty, mode states) lives on the markers plus the preview strip and details panel.
- Race now still starts Bay Loop (Rio de Janeiro). HUD, results, garage and settings are unchanged.
- Map and landmark art are original, schematic and drawn in code; no external assets, logos or text on signs.
