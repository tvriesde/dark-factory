# Super Microsoft

- Source issue: https://github.com/tvriesde/dark-factory/issues/10
- Current PR: https://github.com/tvriesde/dark-factory/pull/11
- Design status: approved fallback. Figma was unavailable and is not required; no verified Figma link is available. The wireframes below are the design source.
- Art direction: original geometric four-color hero, soft landscape layers, warm paper background, compact editorial typography. No external artwork or assets.

## Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│ ▦ SUPER MICROSOFT                         • A LITTLE ADVENTURE    │
├──────────────────────────────────────────────────────────────────┤
│ ✦ THE GREAT OUTDOORS ARE CALLING                                  │
│ Big world. Little hero.                      ✳ TAKE THE SCENIC   │
│ A pocket-sized platform adventure.               ROUTE           │
├──────────────────────────────────────────────────────────────────┤
│ • THE ADVENTURE / STAGE    LEVEL 01/05  ♥♥♥  POWER READY   [Ⅱ] │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │    mountains / clouds       flag                             │ │
│ │       ┌──────────────────────────────┐                       │ │
│ │       │ ✦   Ready, player one?       │   original hero       │ │
│ │       │ Objective and gap reminder   │   with walking legs   │ │
│ │       │       [ LET'S PLAY ↗ ]       │                       │ │
│ │       └──────────────────────────────┘                       │ │
│ │  ground ━━━━━━━━━━━  gap  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ON-SCREEN CONTROLS                 HOLD TO MOVE · TAP TO ACT    │
│ [←][→]                                         [JUMP] [POWER] │
│ ✳ TIP  Jump the gaps.                     SUPER MICROSOFT / 001 │
└──────────────────────────────────────────────────────────────────┘
  Small moves. Big adventure.       YOUR CONTROLS
  Objective / boss instructions    [←][→] or [A][D] Move
                                     [SPACE] or [W][↑] Jump
                                     [X] Power (one shot per second)
```

## Mobile wireframe

```text
┌────────────────────────────┐
│ ▦ SUPER MICROSOFT          │
│ Big world. Little hero.    │
├────────────────────────────┤
│ • THE ADVENTURE / STAGE    │
│ LEVEL  HEARTS  POWER   [Ⅱ] │
│ ┌────────────────────────┐ │
│ │  landscape / hero      │ │
│ │ ┌────────────────────┐ │ │
│ │ │ Ready, player one? │ │ │
│ │ │ objective + action │ │ │
│ │ │   [ LET'S PLAY ]   │ │ │
│ │ └────────────────────┘ │ │
│ └────────────────────────┘ │
│ ON-SCREEN CONTROLS         │
│ [←] [→]     [JUMP] [POWER]│
│ ✳ TIP                      │
├────────────────────────────┤
│ Small moves. Big adventure.│
│ Objective and boss rules   │
│ Controls, stacked rows     │
└────────────────────────────┘
```

## Interaction/state annotations

- Start: modal-like overlay explains the goal and offers a clear play button. HUD is visible; pause is disabled.
- Playing: HUD labels level, hearts and power readiness. The scrolling landscape shows gaps and the flag; the boss has a visible health bar. Desktop keys and real on-screen buttons work together.
- Pause: pause button opens a resume overlay. Simulation, invulnerability and power cooldown freeze. Resume clears held inputs.
- Level complete: reaching the flag on levels 1–4 opens a next-level action; hearts restore on entering the next level. Level 5 replaces the flag objective with a three-hit boss.
- Retry: losing all three hearts presents a retry-current-level action. Gaps and enemy contact cost a heart; safe respawn grants brief invulnerability.
- Win: defeating the boss presents a restart-from-level-one action.
- On-screen controls sit directly below the canvas and above the tip and instructions, so the playfield and controls can be visible together on a common mobile viewport. Hold a direction with a pointer or, when focused, Space or Enter; release to stop. Jump and power remain tap/click actions.
- Buttons have visible keyboard focus and at least 44px touch targets. A polite live region announces state, health, power and boss changes. Pointer input is released on cancellation, button-key input on button blur, and all input on window blur, tab hiding and state changes. Motion is confined to the canvas while playing.
