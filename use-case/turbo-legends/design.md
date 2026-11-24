# Turbo Legends design

- Source issue: https://github.com/tvriesde/dark-factory/issues/12
- Design status: approved wireframe fallback; no Figma link required or verified.
- Scope: self-contained offline racing game. All names, geometry and audio are original and synthetic.

## Desktop wireframe

```text
┌─ ◆ TURBO LEGENDS ──────────────────────────── $ CASH ─ Settings ─┐
│ YOUR ROAD. YOUR LEGEND.              [ scenic coast illustration ] │
│ Chase the extraordinary.              [       road / car         ] │
│ [ Race now → ] [ Choose a race ]                                  │
│                                                                   │
│ PICK YOUR PATH                                                    │
│ [ Quick Race ] [ Career ] [ Time Trial ] [ Garage ]               │
└───────────────────────────────────────────────────────────────────┘
```
Race now starts Bay Loop immediately. The other cards lead to track selection,
championship setup, solo time trial, or a garage. Locked tracks state why.

```text
┌─ QUICK RACE ──────────────────────────────────────────────────────┐
│ [ Bay Loop ] [ Clifftop ] [ Harbor ]   │ RACE DETAILS             │
│ [ Valley   ] [ Glacier  ] [ Summit ]   │ Track, laps, difficulty  │
│ [ City tracks ... ] [ Desert ... ]     │ [ difficulty select ]    │
│                                        │ [ Start race → ]         │
└───────────────────────────────────────────────────────────────────┘
┌─ GARAGE ──────────────────────────────────────────────────────────┐
│ [ rotatable polygon car ]              │ Performance | Appearance │
│ [ ↶ ] ROTATE VIEW [ ↷ ]               │ Upgrade level / price     │
│ [ car select ] [ Buy ] [ Use ]         │ or draft style / Apply    │
└───────────────────────────────────────────────────────────────────┘
```

```text
┌─ POSITION ─ LAP ─ TIME ─────────────────────────────── [ Pause ] ─┐
│                      chase camera / road                         │
│                            car                                   │
│ SPEED / NITRO                           minimap / standings      │
└───────────────────────────────────────────────────────────────────┘
```

## Mobile wireframe

```text
┌─ ◆ TURBO ───── $ ─ Settings ─┐
│ [ coast illustration ]      │
│ Chase the extraordinary.    │
│ [ Race now ] [ Choose ]     │
│ [ Quick Race ] [ Career ]   │
│ [ Time Trial ] [ Garage ]   │
└─────────────────────────────┘
┌─ POS ─ LAP ─ TIME ─ [Ⅱ] ───┐
│      road / chase car       │
│                             │
│ [◀][▶]   [DRIFT][NITRO]    │
│          [BRAKE][GO]        │
│ speed / nitro       minimap │
└─────────────────────────────┘
```

## Key interaction states

- Setup: unlocked tracks select; locked tracks explain completion or championship prerequisites. Career resumes the saved round.
- Race: countdown, HUD and minimap; simultaneous touch holds or keyboard driving. Tab and Escape pause.
- Pause: freezes simulation; resume restores focus; settings returns to pause; restart and exit require confirmation.
- Garage: preview rotates; purchases and upgrades check ownership, balance and maximum level. Appearance is a draft until Apply.
- Results: finishers have times, other drivers are explicitly marked on track; reward breakdown, best, points and unlocks are shown. A result is paid once.
- Settings: independent synthesized music/effects levels and mute, reduced motion, and confirmed progress reset.
- Storage failure: persistent warning, session-only play; invalid stored data is not overwritten without reset.
