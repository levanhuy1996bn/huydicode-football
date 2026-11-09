# Ultimate Football Manager 3D

A browser-based 3D football game and club-management prototype built with React, Vite, Three.js, React Three Fiber, Drei and Rapier.

> **Current delivery: Phase 10 — Passing and Receiving System, plus Step 1 bug fixes (2026-11-09).** Phases 11–14 were planned but not yet delivered as distinct features (see Development roadmap). The project has evolved from a basic 3D football prototype into an 11v11 football game with player AI, goalkeeper behaviour, match rules, squad management, club management, league competitions and an improved passing and receiving system.

## Install and run

Requirements: Node.js 20 or 22 and npm 10+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Current features

### Phase 1 — 3D foundation

- 3D football pitch, markings and goals.
- 22 players across two teams in 4-3-3 formations.
- Fixed-side match camera foundation.
- Select and control BLUE FC players.
- Keyboard-based player movement.
- Camera tracking and match viewing controls.

### Phase 2 — Ball physics and core actions

- Rapier dynamic rigid-body football.
- Ball gravity, bounce, friction and ground collision.
- Basic ball possession and loose-ball recovery.
- Short pass, through ball, lofted pass/cross and shot.
- Sprint and player switching.
- Ball movement and interaction based on player actions.

### Phase 3 — Physical duels

- Player collision and movement constraints.
- Player-to-player contact.
- Standing tackle and sliding tackle.
- Ball interception and recovery.
- Defensive pressure and player duels.

### Phase 4 — Player AI and team tactics

- AI movement for teammates and opponents.
- Attacking support runs.
- Defensive positioning and marking.
- Opponent pressure and ball tracking.
- AI player movement based on match situations.
- Ball-following camera with a fixed viewing direction.

### Phase 5 — Goalkeeper AI

- Goalkeeper positioning and movement.
- Goal-area ball detection.
- Goalkeeper ball recovery and possession.
- Basic goalkeeper save and distribution foundations.
- Goalkeeper interaction with shots and loose balls.

### Phase 6 — Match rules and presentation

- Match timer and match states.
- Goal detection and score updates.
- Kick-off and match restart foundations.
- Ball out-of-bounds detection.
- Throw-in, corner and goal-kick situations.
- Match status and action indicators.
- Full-time match state.

### Phase 7 — Player data and squad management

- Player profiles and attributes.
- Squad management interface.
- Player position and role information.
- Formation and squad selection.
- Player substitutions.
- Maximum of five substitutions per match.
- Updated match roster after substitutions.

### Phase 8 — Club management

- Club overview and squad information.
- Transfer market.
- Player values and contracts.
- Player wages and weekly wage calculations.
- Squad value and club financial information.
- Club data persistence using LocalStorage.

### Phase 9 — Competitions and seasons

- 20-team league structure.
- Double round-robin competition.
- 38 rounds and 380 league fixtures.
- League standings and points calculation.
- 3 points for a win, 1 point for a draw and 0 points for a loss.
- BLUE FC matches played directly in the 3D match scene.
- Other league fixtures simulated automatically.
- Automatic league table updates after match results.
- Match results and season progress saved locally.
- Season completion and champion calculation.
- Start a new season.

### Phase 10 — Passing and receiving system

- Improved teammate selection for passing.
- Pass target calculation based on teammate positions.
- Projected teammate movement when selecting a pass target.
- Receiver movement toward the expected ball path.
- Ball interception and receiving behaviour.
- Short pass, through ball and lofted pass handling.
- Improved ball control and first-touch foundations.
- Pass target marker to show the intended receiving position.

## Controls

| **Key** | **Action** |
| --- | --- |
| Arrow keys | Move selected BLUE FC player |
| E / Shift | Sprint (hold) |
| Q | Switch selected BLUE FC player |
| S | Short pass |
| W | Through ball |
| A | Lofted pass / cross |
| D | Shoot |
| Space | Standing tackle |
| Ctrl | Sliding tackle |
| Click a BLUE FC player | Select that player |
| Mouse / trackpad | Camera interaction where enabled |

Some actions depend on ball possession, player selection and the current match situation.

## Club and league management

The game includes management systems alongside the 3D match gameplay.

### Club management

- View club squad and player information.
- Browse the transfer market.
- Manage player contracts and wages.
- Track squad value and weekly wage expenses.
- Save club progress locally.

### League management

- Participate in a 20-team league.
- View fixtures, match results and league standings.
- Play BLUE FC matches directly.
- Simulate other teams' matches.
- Track season progress and league champions.
- Start a new season after completing the current one.

## Current prototype limitations

- Player models still use procedural geometry rather than professional rigged footballer models.
- Player animations are procedural and still need more specialised actions.
- Passing, receiving and first-touch behaviour need further refinement.
- Goalkeeper distribution and decision-making still need improvement.
- AI positioning and tactical decisions are simplified.
- Not every real-world football rule and set-piece situation is fully implemented.
- Advanced player animations, stadium atmosphere and sound effects are not yet complete.
- LocalStorage saves are browser-specific and are not synchronised between devices.
- Multiplayer and online career modes are not currently included.

## Project structure

The project structure may evolve as gameplay systems are refactored.

```text
ultimate-football-manager-3d/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── data/
    │   ├── teams.js
    │   └── ...
    ├── hooks/
    │   └── useKeyboard.js
    ├── services/
    │   ├── clubService.js
    │   ├── leagueService.js
    │   └── ...
    ├── systems/          # planned (Step 2), not created yet
    │   └── ...
    └── components/
        ├── GameScene.jsx
        ├── Player.jsx
        ├── Pitch.jsx
        ├── ClubManagementPanel.jsx
        ├── LeagueManagementPanel.jsx
        └── ...
```

### Main components

- `GameScene.jsx`: Main 3D match scene, player control, ball physics, AI and match logic.
- `Player.jsx`: Player models and procedural movement animations.
- `Pitch.jsx`: Football pitch, markings and goals.
- `ClubManagementPanel.jsx`: Club and squad management interface.
- `LeagueManagementPanel.jsx`: League fixtures, standings and season management.
- `data/`: Team, player and game configuration.
- `hooks/`: Reusable React hooks.
- `services/`: Club, league and persistence logic.
- `systems/`: Separated gameplay systems and supporting logic.

## Data persistence

The project currently uses browser LocalStorage for local game progress.

- Club information and league progress are stored locally.
- Data belongs to the current browser profile.
- Clearing browser website data may remove saved progress.
- Different browsers or devices do not automatically share saves.
- Cloud saves, user accounts and multiplayer are outside the current project scope.

## Development roadmap

### Status check (2026-11-09)

A code review showed that Phases 11–14 were never delivered as separate features:

- Phases 11–13 (passing, receiving, dribbling): no real change since Phase 10. Dribbling glues the ball to the player's feet, pass and shot ignore the arrow direction, and there is no power control.
- Phase 14 (procedural animations): only a basic run cycle exists. There are no action animations (shoot, pass, tackle, slide).
- The whole match engine lives in a single ~1,100-line `useFrame` inside `GameScene.jsx`. The `systems/` folder described above does not exist yet.

### Step 1 — Bug fixes ✅ (2026-11-09)

- Tackles can only win the ball from the player who actually has it (previously any nearby red player let you steal the ball from anywhere on the pitch).
- Tackle strength now uses the tackler's real stats (was always 75). The ball carrier resists with dribbling, and tackling from the front is easier than from behind.
- A successful slide tackle knocks the ball loose and the player lunges forward. The tackled player cannot pick the ball up again for 0.8 s.
- Shots use a real velocity of 22–29 m/s (previously `applyImpulse` produced roughly 60–80 m/s).
- Goalkeepers roll once per shot: catch, parry or get beaten, based on keeper rating, ball speed, reach and height. The "save after the ball crossed the line" magnet was removed.
- Goal posts, crossbar and nets now have colliders. The ground collider was enlarged so the ball rolls out naturally, and out-of-bounds uses the real lines plus the ball radius.
- Fixed double rotation in `Player.jsx` (players faced the wrong way when running sideways).
- League opponents use their own name, kit colour and stats scaled by team strength (previously always the RED UNITED squad).
- Frame delta is clamped to 0.05 s so players do not teleport after a lag spike.

### Step 2 — Phase 14.5: engine refactor (next)

- Split the match engine into `src/systems/` (ball, possession, player control, team AI, goalkeeper, rules, restarts) with a single match-state object.
- Add a fixed timestep for game logic.
- Add a player state machine (idle / run / dribble / pass / shoot / tackle / slide / receive / fallen) that the animations read from.
- Use an attack-direction-per-half abstraction so teams can switch ends at half-time.

### Step 3 — Control feel (the real Phases 11–13, FIFA Online 4 style)

- Directional pass and shot that follow the arrow keys, plus a power bar (hold to charge) for passes, through balls, crosses and shots.
- Without the ball, S switches to the most suitable player, with an arrow above the selected player's head.
- Dribbling with real ball touches (the ball can be pushed too far ahead), and tackles based on angle and timing.

### Step 4 — Match flow and rules

- Proper throw-in (pick up the ball, aim, throw).
- Half-time break: open settings (tactics, formation, substitutions), then press Continue to start the second half. Teams switch ends.
- Allow quitting a match midway (with confirmation).
- Large full-time scoreline screen.

### Step 5 — In-match HUD (FIFA Online style)

- Player name above the head and shirt numbers on the kit.
- Minimap/radar at the bottom centre of the screen.
- Drag-and-drop substitution HUD.

### Step 6 — Out-of-match UI

- Home/main menu: play match, league, squad, tactics, transfers, club, settings.
- Pre-match screen: lineups, formation and opponent information.
- Post-match screen: statistics and player ratings, then return to the league or home menu (instead of only a "New match" button).
- Remove stale header text in `App.jsx` ("PHASE 3", RED UNITED 0–0 not tied to the real match).

### Later phases

- **Phase 15:** Specialised animations for passing, shooting, tackling and sliding (driven by the state machine from Step 2).
- **Phase 16:** Goalkeeper diving, catching and distribution.
- **Phase 17:** Physical duels, shielding and advanced ball recovery.
- **Phase 18:** Team tactics, pressing, defensive organisation and attacking strategies.
- **Phase 19:** Stamina, fatigue and more detailed player attributes.
- **Phase 20:** Fouls, penalties, offside and full set pieces.
- **Phase 21:** Match statistics and presentation.
- **Phase 22:** Visual polish, sound, performance optimisation and release preparation.

### Ideas backlog (từ yêu cầu, tham khảo FIFA Online 4)

| Ý tưởng | Bước |
| --- | --- |
| Hỗ trợ chuyền; chuyền và sút phải có lực | Step 3 |
| Tên trên đầu cầu thủ, áo có số | Step 5 |
| Kéo thả để thay người, HUD như FIFA Online | Step 5 |
| Hết giờ thông báo tỉ số thật to | Step 4 |
| Bản đồ mini ở giữa giao diện | Step 5 |
| Không có bóng thì S đổi cầu thủ, có mũi tên trên đầu | Step 3 |
| Ném biên | Step 4 |
| Nghỉ giữa hiệp: mở cài đặt rồi bấm Tiếp tục sang hiệp 2 | Step 4 |
| Cho phép bỏ trận giữa chừng | Step 4 |
| Giao diện ngoài trận đấu (menu, trước/sau trận) | Step 6 |

---

**Project:** Ultimate Football Manager 3D  
**Current delivery:** Phase 10 + Step 1 bug fixes (see roadmap)  
**Game mode:** 3D Football + Club Management  
**Match format:** 11 vs 11  
**Stack:** React + Vite + Three.js + React Three Fiber + Drei + Rapier  
**Persistence:** Browser LocalStorage
