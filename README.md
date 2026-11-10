# Ultimate Football Manager 3D

A browser-based 3D football game and club-management prototype built with React, Vite, Three.js, React Three Fiber, Drei and Rapier.

> **Current delivery: Phase 10 — Passing and Receiving System, plus Steps 1–4 (bug fixes, engine refactor, FIFA Online-style controls, match flow) (2026-11-09).** Phases 11–14 were planned but not yet delivered as distinct features (see Development roadmap). The project has evolved from a basic 3D football prototype into an 11v11 football game with player AI, goalkeeper behaviour, match rules, squad management, club management, league competitions and an improved passing and receiving system.

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
| Arrow keys | Move the selected BLUE FC player; also aims passes and shots |
| E / Shift | Sprint (hold) |
| S (with the ball) | Pass: hold to charge, release to pass |
| S (without the ball) | Switch to the player nearest the ball |
| Q | Cycle through the 4 players nearest the ball |
| W | Through ball (hold to charge) |
| A | Lofted pass / cross (hold to charge) |
| D | Shoot (hold to charge, arrows to aim the corner) |
| D (hold, defending) | Contain: stay goal-side of the ball carrier about 1.5 m away, facing the ball |
| D + E (hold, defending) | Aggressive press: sprint straight at the ball |
| A (hold, defending) | Call the nearest teammate to press the ball carrier |
| S / A at a throw-in | Short / long throw (arrows choose the direction) |
| Space | Standing tackle |
| Ctrl | Sliding tackle |
| QUIT button | Leave the match (a league match is recorded as a 0–3 loss) |
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
    ├── systems/              # match engine (no React)
    │   ├── constants.js      # field, tactics, timestep, helpers
    │   ├── roster.js         # roster load/save, roles, league opponent mapping
    │   ├── matchState.js     # single match-state object, sides per half
    │   ├── playerState.js    # player state machine
    │   ├── ball.js           # possession, kicks, pass targeting, dribble, pickup
    │   ├── control.js        # user input: movement, pass/switch, kicks, tackles
    │   ├── teamAI.js         # positioning, receiver runs, carrier AI, AI steals
    │   ├── goalkeeper.js     # keeper positioning and saves
    │   ├── movement.js       # AI movement, collisions, velocity tracking
    │   ├── rules.js          # goals, out of play, kick-off and restarts
    │   └── matchEngine.js    # fixed-step loop calling the systems in order
    └── components/
        ├── GameScene.jsx
        ├── MatchWorld.jsx
        ├── Player.jsx
        ├── Pitch.jsx
        ├── ClubManagementPanel.jsx
        ├── LeagueManagementPanel.jsx
        └── ...
```

### Main components

- `GameScene.jsx`: Match screen UI (scoreboard, panels, league, club) and match flow (timer, score, fixtures).
- `MatchWorld.jsx`: 3D scene and the bridge between React and the engine (refs, roster changes, restarts, half-time switch).
- `Player.jsx`: Player models and procedural movement animations.
- `Pitch.jsx`: Football pitch, markings and goals.
- `ClubManagementPanel.jsx`: Club and squad management interface.
- `LeagueManagementPanel.jsx`: League fixtures, standings and season management.
- `data/`: Team, player and game configuration.
- `hooks/`: Reusable React hooks.
- `services/`: Club, league and persistence logic.
- `systems/`: The match engine as plain JavaScript modules. Each system takes a shared `ctx` (state, ball, player objects, rosters, callbacks).

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
- The whole match engine lived in a single ~1,100-line `useFrame` inside `GameScene.jsx` (fixed in Step 2).

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

### Step 2 — Phase 14.5: engine refactor ✅ (2026-11-09)

- `GameScene.jsx` went from about 3,300 lines to about 790 (UI only). The engine now lives in `src/systems/` and the 3D scene in `MatchWorld.jsx`.
- All live match data is in one state object (`createMatchState`) instead of about 20 separate refs.
- Game logic runs at a fixed 1/60 s step (up to 5 steps per frame), so gameplay no longer depends on FPS. Physics still uses Rapier's variable step.
- Player state machine: `idle / run / sprint / dribble / receive / pass / shoot / tackle / slide / fallen`. `Player.jsx` reads it to show basic poses: kicking leg swing, tackle lunge, slide, and falling and getting up.
- A successful slide tackle knocks the ball carrier down for about 1 s. Players turn to face the direction of a kick or tackle.
- Attack direction is per half: in the second half the teams switch ends (positions mirrored) and the opponent kicks off. A half-time break screen comes in Step 4.

### Step 2.1 — Goalkeeper fix ✅ (2026-11-09)

- Keepers no longer hold the ball forever: a keeper used to catch his own distribution straight away. The kicker now cannot touch the ball for 0.4 s, and keepers only catch or save balls last touched by the opponent.
- Game logic runs inside Rapier's fixed step (`useBeforePhysicsStep`, 1/60 s), so logic and physics stay in lockstep even at low FPS.
- A keeper who has been beaten can no longer brake the ball with the first-touch logic. The save chance uses the keeper's lateral distance to the ball's path. In a test of 14 unopposed shots from 18 m: 6 goals, 7 parried, 1 caught.

### Step 3 — Control feel (FIFA Online 4 style) ✅ (2026-11-09)

- **Hold to charge:** hold S / W / A / D to fill the power bar above your player, then release to pass, play a through ball, lob or shoot.
- **Directional passing:** the pass goes to the teammate closest to the arrow direction, and power chooses the distance. If nobody is in that direction (within about 70°), the ball goes into space and the nearest teammate runs onto it. With no arrow pressed, the pass follows the way the player is facing.
- **Aimed shots:** Up/Down choose the far or near corner. Power sets speed (about 17–30 m/s) and height. Over 80% power the shot loses accuracy, and over 90% it can fly over the bar.
- **Player switching:** S without the ball switches to the player nearest the ball, and Q cycles through the 4 nearest. A yellow arrow marks the controlled player. A blue player who receives the ball is selected automatically (except the keeper).
- **Dribbling with touches:** the ball is no longer glued to the feet. Jogging keeps it about 0.8 m ahead with about 2 touches per second. Sprinting pushes it 1–1.6 m ahead, so a defender near the ball can intercept. Sharp turns can lose the ball (heavy touch).
- **Tackles target the ball:** the chance depends on how far the ball is from the dribbler's feet, the angle (front or side is easier than behind), stats and distance. A missed standing tackle makes the player stumble for 0.45 s, and a missed slide leaves him on the ground. AI tackles use the same idea.
- **Pressing:** the closest AI player now closes down the ball carrier (previously defenders only moved about a third of the way, so the opponent never pressed).

### Step 4 — Match flow and rules ✅ (2026-11-09)

- **FO4-style power gauge:** a large gauge at the bottom of the pitch (PASS / THROUGH BALL / LOB / SHOT POWER, 10 segments, 0–100%) plus a bar above the player's head. Shots show the 80% (accuracy loss) and 90% (can go over the bar) marks and turn red past 80%. The gauge stays visible for 0.5 s after release.
- **Half time:** the match stops at 45'. A half-time card shows the score and scorers, with tactic and formation controls, and substitutions stay available in the team panel. CONTINUE TO 2ND HALF switches ends and the opponent kicks off.
- **Throw-ins:** the player holds the ball above his head on the touchline and cannot walk. S throws short, A throws long, and arrows aim (never out of the pitch). Throws are slower and shorter than kicks, and the thrower cannot touch the ball again straight away. The AI takes its throw after about 1 s.
- **Quit match:** a QUIT button with confirmation. A league match is recorded as a 0–3 loss, and a friendly or replay just ends.
- **Full time:** a large scoreline with scorers and minutes, and a WIN / DRAW / LOSS badge. Buttons: NEXT MATCH (next league opponent), LEAGUE TABLE and REPLAY (friendly). At the end of the season the first button becomes NEW SEASON.
- **Goal credit:** the last player to touch the ball gets the goal, or an own goal (OG) if he plays for the defending team. Goals show on the goal banner, the half-time card and the full-time card.
- **Defending controls:**
  - D: contain (the defender cannot be pushed back by the dribbler).
  - D + E: aggressive press.
  - A: teammate press.
- **Fix:** the AI ball carrier was moved twice per step, so it dribbled about twice as fast as intended.

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
| Hỗ trợ chuyền; chuyền và sút phải có lực | Step 3 ✅ |
| Tên trên đầu cầu thủ, áo có số | Step 5 |
| Kéo thả để thay người, HUD như FIFA Online | Step 5 |
| Hết giờ thông báo tỉ số thật to | Step 4 ✅ |
| Bản đồ mini ở giữa giao diện | Step 5 |
| Không có bóng thì S đổi cầu thủ, có mũi tên trên đầu | Step 3 ✅ |
| Ném biên | Step 4 ✅ |
| Nghỉ giữa hiệp: mở cài đặt rồi bấm Tiếp tục sang hiệp 2 | Step 4 ✅ |
| Cho phép bỏ trận giữa chừng | Step 4 ✅ |
| Giao diện ngoài trận đấu (menu, trước/sau trận) | Step 6 |

---

**Project:** Ultimate Football Manager 3D  
**Current delivery:** Phase 10 + Steps 1–4 (see roadmap)  
**Game mode:** 3D Football + Club Management  
**Match format:** 11 vs 11  
**Stack:** React + Vite + Three.js + React Three Fiber + Drei + Rapier  
**Persistence:** Browser LocalStorage
