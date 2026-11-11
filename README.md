# Ultimate Football Manager 3D

A browser-based 3D football game and club-management prototype built with React, Vite, Three.js, React Three Fiber, Drei and Rapier.

> **Current delivery: Steps 1–6 and Phases 15–21 — all done ✅ (2026-11-11).** Specialised animations, goalkeeper saves and distribution, duels and shielding, team tactics and ball-carrier AI, stamina and detailed attributes, player progression, fouls, cards, offside and set pieces, FIFA Online-style skill shots and passes, and match statistics (live stats, xG, shot map, timeline). Phases 11–14 were folded into Steps 1–6. **Next:** Phase 22 (visual polish, sound, performance). See the status table under Development roadmap.

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
- Select and control Manchester United players.
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
- Manchester United matches played directly in the 3D match scene.
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

### Phases 15–20 — FIFA Online-style match (2026-11-10 → 2026-11-11) ✅

- **Phase 15:** specialised animations (pass, shot, tackle, slide, keeper dives, celebrations).
- **Phase 16:** goalkeeper diving, catching, throwing and punting.
- **Phase 17:** physical duels, shielding and ball recovery.
- **Phase 18:** team tactics and ball-carrier AI.
- **Phase 19:** stamina, fatigue, condition between matches and detailed attributes.
- **Phase 19B:** player levels, XP, attribute points by position and potential.
- **Phase 20:** fouls, yellow and red cards, sending off, offside, free kicks with a wall, penalties, and proper goal kicks, corners and throw-ins.
- **Skill shots and passes:** finesse (Z+D), chip (Q+D), trivela (C+D), low driven shot (D, D), driven pass (Z+S), lobbed through ball (Q+W), whipped cross (Z+A). The AI uses them too.
- **Phase 21:** live stats during the match (STATS button), full stats when paused and at half time, expected goals (xG), pass accuracy, match timeline, shot map and top performers after the match.

Details and test results for each phase are in the Development roadmap below.

## Controls

| **Key** | **Action** |
| --- | --- |
| Arrow keys | Move the selected Manchester United player; also aims passes and shots |
| E / Shift | Sprint (hold) |
| S (with the ball) | Pass: hold to charge, release to pass |
| S (without the ball) | Switch to the player nearest the ball |
| Q (without the ball) | Cycle through the 4 players nearest the ball (with the ball Q is a modifier: Q + D, Q + W) |
| W | Through ball (hold to charge) |
| A | Lofted pass / cross (hold to charge) |
| D | Shoot (hold to charge, arrows to aim the corner) |
| D (hold, defending) | Contain: stay goal-side of the ball carrier about 1.5 m away, facing the ball |
| D + E (hold, defending) | Aggressive press: sprint straight at the ball |
| W (hold, defending) | Call the nearest teammate to press the ball carrier (was A) |
| A (defending) | Sliding tackle |
| C (hold, with the ball) | Shield the ball: turn your back to the nearest opponent and keep the ball on the far side; arrows move slowly |
| S / A at a throw-in | Short / long throw (arrows choose the direction) |
| Z + D | Finesse shot (inside of the foot): curls into the far corner, more accurate, slower |
| Q + D | Chip shot over the keeper |
| C + D | Trivela (outside of the foot): bends away from the keeper |
| D, then D again right after the shot | Low driven shot |
| Z + S / Z + W | Driven pass / driven through ball (faster, harder to control) |
| Q + W | Lobbed through ball over the defence |
| Z + A / A then A again | Whipped cross / low cross |
| D at a free kick | Shoot over the wall (about 40–80% power clears it; arrows aim). S / W / A pass or cross |
| Arrows + D at a penalty | Aim and shoot (penalties allow shots only) |
| Arrows (keeper holding the ball) | Walk with the ball inside your penalty area (after 6 s the keeper distributes automatically) |
| S / W (keeper holding the ball) | Goalkeeper throw (hold to charge, arrows aim) |
| A / D (keeper holding the ball) | Goalkeeper punt / long kick (hold to charge, arrows aim) |
| Space | Standing tackle |
| Ctrl | Sliding tackle (same as A when defending) |
| Any key | Take back control when the AI is playing for you (it takes over after 10 s without a key press) |
| SUBS button | Open the drag-and-drop substitution board (pauses the match) |
| STATS button | Show / hide live match stats (the match keeps running) |
| NAMES button | Player names above heads: SMART → ALL → OFF |
| QUIT button | Leave the match (a league match is recorded as a 0–3 loss) |
| Click a Manchester United player | Select that player |
| Mouse / trackpad | Camera interaction where enabled |

Some actions depend on ball possession, player selection and the current match situation.

## Club and league management

The game includes management systems alongside the 3D match gameplay.

### Clubs (2026-11-10)

- **You manage Manchester United** (red kit, `MUN`, strength 79). The former "RED UNITED" squad is now Manchester United.
- **Manchester City** (sky blue kit, `MCI`, strength 81) is the former "BLUE FC" squad and is now an AI team in the league.
- Club identity (name, short name, colour, strength) lives in `src/data/leagueData.js` (`USER_TEAM`, `LEAGUE_TEAMS`). All UI and in-match messages read the name from there instead of hard-coding "BLUE FC".
  - Internally your team still uses the id `blue` (and the opponent slot uses `red`) so the engine and league saves keep working.
  - Club selection is planned for Phase 23.
- Accent colours in the UI follow your kit through the CSS variable `--user-color`. Opponent kit colours avoid red, so they never clash with United.
- The roster save key moved to `ultimate-football-roster-save-v2`, so a saved lineup or transfers from the old Blue FC squad are reset once. League progress and club budget are kept.

### Club management

- View club squad and player information.
- Browse the transfer market.
- Manage player contracts and wages.
- Track squad value and weekly wage expenses.
- Save club progress locally.

### League management

- Participate in a 20-team league.
- View fixtures, match results and league standings.
- Play Manchester United matches directly.
- Simulate other teams' matches.
- Track season progress and league champions.
- Start a new season after completing the current one.

## Current prototype limitations

- Player models still use procedural geometry rather than professional rigged footballer models.
- Player animations are procedural (specialised actions exist since Phase 15, but no motion capture).
- AI positioning and tactical decisions are simplified; AI through balls and lobs are still cut out fairly often.
- Only your club levels up; AI clubs do not progress during the season.
- No advantage rule, no handball, and players have no physical collision with the ball (the free-kick wall uses a simple block check).
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
    │   ├── teamAI.js         # team shape, pressing, marking, support runs, AI tackles
    │   ├── carrierAI.js      # AI ball carrier: shoot / pass / dribble / shield decisions
    │   ├── tactics.js        # per-team tactics, opponent tactic changes, counter-press
    │   ├── goalkeeper.js     # keeper positioning, save plans, catching
    │   ├── duels.js          # shielding, shoulder duels, poked tackles
    │   ├── attributes.js     # detailed attributes derived from the 6 main stats
    │   ├── stamina.js        # in-match stamina, fatigue effects, condition between matches
    │   ├── progression.js    # XP, levels, attribute points by position, potential, OVR
    │   ├── whistle.js        # end of half / match: wait for a dead ball, whistle, animations
    │   ├── referee.js        # fouls, cards, sending off, offside, free-kick wall
    │   ├── movement.js       # top speed / acceleration, AI movement, collisions, velocities
    │   ├── rules.js          # goals, out of play, kick-off, set pieces and spacing
    │   ├── matchStats.js     # match statistics, pass completion, xG, shot log, ratings, summary
    │   └── matchEngine.js    # fixed-step loop calling the systems in order
    ├── animation/
    │   ├── clips.js          # keyframe clips (pass, shot, tackle, slide...)
    │   └── rig.js            # run cycle, clip sampling, blending, applyPose
    ├── utils/
    │   └── names.js          # shortPlayerName()
    └── components/
        ├── screens/          # TopBar, HomeScreen, PreMatchScreen, PostMatchScreen, DevelopmentScreen
        ├── GameScene.jsx
        ├── MatchWorld.jsx
        ├── MatchOverlays.jsx
        ├── MatchStatsPanel.jsx   # stat comparison bars, live stats, timeline, shot map
        ├── SubstitutionBoard.jsx
        ├── MatchSidePanel.jsx
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

### Status at a glance (2026-11-11)

| Phase | Content | Status |
| --- | --- | --- |
| 1–10 | 3D foundation, ball, duels, AI, keeper, rules, squad, club, league, passing | ✅ Done |
| Steps 1–6 | Bug fixes, engine refactor, FO4 controls, match flow, HUD, menus (replaced 11–14) | ✅ Done |
| 15 | Specialised animations | ✅ Done |
| 16 | Goalkeeper diving, catching and distribution | ✅ Done |
| 17 | Physical duels, shielding and ball recovery | ✅ Done |
| 18 | Team tactics and ball-carrier AI | ✅ Done |
| 19 | Stamina, fatigue and detailed attributes | ✅ Done |
| 19B | Player progression: levels and attribute points | ✅ Done |
| 20 | Fouls, cards, offside and set pieces (+ playtest notes 3) | ✅ Done |
| Extra | FO4 skill shots and passes (Z+D, Q+D, C+D…), also used by the AI | ✅ Done |
| 21 | Match statistics and presentation | ✅ Done |
| 22 | Visual polish, sound, performance, release preparation | ⏳ Next |
| 23 | Club selection and club crests | 🔜 Planned |

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

### Step 5 — In-match HUD (FIFA Online style) ✅ (2026-11-10)

- **Shirt numbers:** each kit has a large number on the back and a small one on the chest. They are drawn on a canvas texture, so no fonts or images need to load, and the text is automatically light or dark to contrast with the shirt.
- **Names above heads:** a tag in the team colour with number and name (surname for real players, position for default names). The NAMES button cycles through three modes:
  - SMART: the controlled player, the ball carrier and the intended receiver. This is the default.
  - ALL: all 22 players.
  - OFF: no names.
- **Mini map (radar):** at the bottom centre, in the same orientation as the camera. It shows both teams in their colours (keepers in yellow), the ball, and a yellow ring around the controlled player. The power gauge sits just above it.
- **Drag-and-drop substitution board:** opened with the SUBS button, the SUBSTITUTIONS button on the pause screen, or OPEN SUBSTITUTIONS at half time. Opening it pauses the match and DONE resumes it.
  - Drag a bench player onto a starter (or the reverse) to substitute.
  - Drag a starter onto another starter to swap positions; this does not use a substitution.
  - Click one card, then another, as a fallback for touch screens.
  - Rules: 5 substitutions; a goalkeeper can only be replaced by a goalkeeper; a player who has been substituted off cannot come back on. Outfield players may now play out of position (the board warns about it).
  - The incoming player takes the outgoing player's position on the pitch.

### Step 6 — Out-of-match UI ✅ (2026-11-10)

The app now has four screens, controlled by `GameScene.jsx`:

| Screen | Contents |
| --- | --- |
| **HOME** (`screens/HomeScreen.jsx`) | Next match (round, home/away, team crests, league positions, strength) with PLAY MATCH / EDIT LINEUP; compact league table (top 6 + your team); last result; season progress (W/D/L); squad (formation, average XI rating, squad size and value); club; settings (match length 3/6/10 min, player names SMART/ALL/OFF, saved in the browser). If the season is over: champion + NEW SEASON. |
| **PLAY / pre-match** (`screens/PreMatchScreen.jsx`) | Both starting XIs with numbers, positions and ratings; team averages; formation and tactic; EDIT LINEUP opens the drag-and-drop board in pre-match mode (unlimited changes, no substitutions used); KICK OFF. |
| **Match** | The 3D match as before. The top bar shows LIVE MATCH and navigation is locked until the match is finished or quit. The right panel shows the profile of the player you control and updates when you switch. |
| **Match summary** (`screens/PostMatchScreen.jsx`) | Score with scorers; WIN/DRAW/LOSS; match stats (possession, shots, shots on target, passes, tackles won, saves); player ratings for your team (goals, assists, tackles) and player of the match; NEXT MATCH / LEAGUE TABLE / HOME. |

- The top bar has HOME, PLAY, LEAGUE and CLUB, plus the season and your team's league position and points. The old static header ("PHASE 3", "RED UNITED 0–0", "FRIENDLY MATCH") has been removed. Club management now opens from the HOME screen or the top bar, not during a match.
- The full-time card now has MATCH SUMMARY. NEXT MATCH (and starting a match from the league panel) goes to the pre-match screen first.
- Statistics are recorded by the engine in `state.stats` (`systems/matchStats.js`): shots, passes, tackles, saves, shots on target, possession time, and per-player goals, assists and tackles. Ratings run from 4.0 to 10.0.
- **Player names:** the starters now have real (fictional) names instead of "Blue ST 9". Each league opponent gets its own deterministic set of names, and old saves are migrated automatically. Long names are shortened with `utils/names.js` (`shortPlayerName`): "Alexander Montgomery" → "A. Montgomery" above the head, and anything still too long is cut with "…".

### Phase 15 — Specialised animations ✅ (2026-11-10)

- **New player rig with knees and elbows.** The hips are the root; legs (thigh → knee → shin/boot) hang from the hips, and the torso turns at the waist, with the arms (shoulder → elbow → forearm) and head attached to it. Kicking no longer tilts the whole body, and leaning no longer swings the legs.
- **Keyframe clips** (`src/animation/clips.js`) for pass, cross/lob, shot, throw-in, standing tackle, stumble (missed tackle), slide tackle and falling/getting up. There are static poses for holding a throw-in and for the keeper's ready stance. `src/animation/rig.js` samples the clips (smoothstep between keys), blends in and out (0.05 s / 0.08 s) and smooths joint motion.
- **Procedural run cycle:** stride, knee bend in the swing phase, counter arm swing with bent elbows, bounce, torso twist and sprint lean. Dribbling uses shorter strides with the head down, and players breathe when idle.
- **Head tracking:** players turn their head toward the ball, except when sliding or lying down.
- **Kick wind-up (gameplay change):** the ball no longer leaves the foot when the key is released. The player winds up first (pass 0.12 s, cross 0.16 s, shot 0.18 s, throw-in 0.22 s), and the ball is struck exactly at the contact frame of the animation.
  - During the wind-up the player stands still and can still be tackled; if he is, the kick is cancelled.
  - Logic is in `updateWindup` / `releaseKick` (`systems/ball.js`), and the timings are in `KICK_WINDUP`.
- **Fix:** an older React render could overwrite the player the engine had just selected (on receiving the ball, at kick-off, or with S/Q). `ctx.selectedId` is now only synced from React when the prop actually changes.

### Phase 16 — Goalkeeper diving, catching and distribution ✅ (2026-11-10)

- **Save plan per shot** (`systems/goalkeeper.js`): when an opponent's shot or fast ball heads for goal, the keeper plans once per kick (`state.keeperPlans[team]`). He predicts where and how high the ball crosses his position, checks whether it is on target, and rolls the save once based on reach, reaction time (keeper rating), ball speed and height.
  - Balls going wide are left alone.
  - Balls straight at the keeper are stood up and caught (saves 65–97%). Balls out of standing reach need a dive: low, mid or high, to the left or right.
  - After the reaction time the keeper dives sideways toward the ball. A failed save dives late and falls short (sometimes the wrong way on very fast shots).
- **Result when the ball reaches the keeper:**
  - **Catch** if the ball is slow enough for the save type. The keeper holds the ball at his chest and cannot be tackled.
  - **Parry** to the side and away from goal.
  - **Tip over the bar** for high shots.
  - Saves and shots on target are recorded as before. The keeper still claims the ball from a nearby attacker and picks up slow balls, but no longer stops shots with his feet through the first-touch logic.
- **Distribution from the hands:**
  - **Throw** (`gkThrow`): low and accurate to a teammate, or into space.
  - **Punt** (`punt`): a high, long volley.
  - Both use the wind-up (0.3 s), so the ball leaves the hand or foot on the animation's contact frame.
  - The AI keeper throws to an unmarked teammate 8–30 m away and otherwise punts long.
  - When the Manchester United keeper catches the ball you take control of him: S/W throw, A/D punt, and the arrow keys turn him and aim. If you do nothing for 5 s (1.5 s if you switched to another player), the AI distributes for you. After the release, control passes to the receiver.
- **Animations** (`animation/clips.js`): `diveLow`, `diveMid`, `diveHigh`, `catch`, `catchHigh`, `scoop`, `gkThrow`, `punt`, and a pose for holding the ball. Dive clips are authored to one side and mirrored automatically (`mirrorPose` in `animation/rig.js`, using `entry.side` from `setPlayerAction`). Players don't turn their head while diving.

### Phase 17 — Physical duels, shielding and ball recovery ✅ (2026-11-10)

New system: `systems/duels.js`.

- **Shielding (hold C with the ball).** The carrier turns his back to the nearest opponent within 4.5 m, keeps the ball tight on the far side and moves slowly (3 m/s).
  - A tackle from behind a shielding player almost never works (success −0.3 standing, −0.22 sliding); the defender has to go round to the ball side.
  - A shielding player is very hard to push in a collision.
  - AI carriers shield for 0.6–1.2 s when they are closed down and have no clean pass, then pass.
  - When your player shields, the second AI presser also goes for the ball instead of holding his position.
- **Shoulder duels.** When an opponent is in contact with the carrier (within 1.32 m), the carrier is slowed according to the difference in the PHY attribute (×0.72–0.97). Every 0.55 s of contact there is one strength contest:
  - the carrier can be knocked off the ball (it runs loose and he stumbles) — about 8% for equal players, up to 30% against a much stronger defender, more when sprinting;
  - or the defender bounces off and stumbles — about 6% for equal players, up to 30% for a much stronger carrier.
  - Shielding lowers the first and raises the second.
- **Strength in collisions.** When two opponents overlap, the stronger player is pushed less (25–75% split by PHY) instead of always 50/50.
- **Tackle outcomes.** A successful standing tackle wins the ball cleanly 68% of the time; otherwise the ball is only poked loose and both sides chase it. The same applies to AI tackles.
- **Ball recovery AI.**
  - *Interception runs:* when an opponent's ground pass is on its way, the player who can reach the passing lane before the ball runs to cut it out (after a 0.2 s reaction).
  - *Loose balls:* the nearest player runs to where the ball is going, not to where it is.
- **Statistics:** interceptions and duels won are recorded per team and per player, shown on the post-match screen and counted in player ratings.
- **Animation:** a low, wide-armed shielding stance (`SHIELD_POSE`) and arms-out jostling while a duel is on (`JOSTLE_OFFSET`).

### Phase 18 — Team tactics and ball-carrier AI ✅ (2026-11-11)

**Why:** in Phase 17 testing about 60% of AI passes were cut out. A match simulator (the engine run without a browser, both sides on AI) showed three causes:

- an opponent within 1.5 m of a moving ball "absorbed" it, so any presser standing in front of the passer intercepted almost every pass;
- the AI only passed once an opponent was already 2.5 m away and never checked whether the passing lane was blocked;
- AI players could run at 10–12 m/s, nearly as fast as a pass.

**Passing and receiving** (`systems/ball.js`)

- An opponent must now stand on the line of a moving ball (0.9 m) to block it; the intended receiver and his teammates still control it from 1.5 m, and control passes up to 15 m/s cleanly. A dead ball (under 3.5 m/s) goes to whoever is closest.
- `listPassCandidates` scores every teammate and returns `laneSlack`: how many metres the nearest defender is short of reaching the passing lane before the ball does. Defenders right in front of the passer now count as blocking.
- Ground passes and through balls are a little faster (13–20 m/s and 15–22 m/s).
- Through balls to a forward who is level with the last defender are played 5 m deeper into space.
- The receiver of a pass is moved only by the receiver run (previously the team AI moved him too, so the two orders cancelled out and he stood still).
- Dribbling keeps the ball closer when not sprinting, a new owner can touch the ball immediately, and an opponent only nicks a loose touch when he is clearly closer to the ball than the dribbler.

**Ball-carrier AI** (`systems/carrierAI.js`, new)

Every ~0.2 s the AI carrier compares:

- **Shot** — distance, visible angle of the goal, defenders on the line.
- **Pass** — every teammate × ground pass / through ball / lofted pass, valued by lane safety, how open the receiver is, metres gained and whether the target is in the box. Through balls only go to a runner who reaches the spot before the nearest defender.
- **Dribble** — the clearest of 9 directions, favouring forward progress. The carrier sprints only into open space.
- **Under pressure with no pass** — shoot if possible, clear near his own goal, otherwise shield.
- **Crosses** from wide in the final third to teammates in the box.

The more pressure, the less the dribble is worth, so the AI moves the ball on before it is surrounded. Hold time depends on position and tactic tempo.

**Team shape and pressing** (`systems/teamAI.js`)

- **Out of possession:** the back line stays between the ball and goal (height from `defensiveLine`), midfield stays about 10 m in front, and the whole block narrows and slides towards the ball. Defenders mark attackers near the line goal-side, and midfielders keep zonal shape.
- **Pressing:** 1–3 players by the `press` value. The first goes to the ball, the second covers goal-side, and the third blocks the nearest passing option (in the middle or attacking third only). In the defensive third at least two players always close down.
- **Counter-press:** right after losing the ball the team swarms for `counterPress` seconds (0–4 s by tactic).
- **In possession:** full-backs overlap in attacking tactics. One central midfielder stays behind the ball as an outlet. Forwards play on the last defender, run in behind when the carrier has time, and attack the box in the final third. The two nearest teammates come short to offer an angle that no defender blocks.
- AI teammates of the user now also attempt standing tackles (the player you control still tackles only on Space / Ctrl).

**Tactics** (`systems/constants.js`, `systems/tactics.js`)

- Each tactic now also has `directness`, `tempo`, `risk`, `counterPress` and a one-line `summary`, shown on the pre-match screen and at half-time.
- Each team plays its own tactic. The opponent picks one from relative strength, then reviews it every 8 s from the score and time left: chasing the game → Attacking, then High Press late; protecting a lead → Counter, then Defensive late. Changes are announced in the match ("… TACTIC: COUNTER ATTACK"), and the half-time screen shows what the opponent is playing.

**Goalkeeper:** the dive save chance now depends on how much of his reach the keeper needs, not on absolute metres. Reachable dives were saved only about 15% of the time once the AI started taking better shots. AI shots now aim towards the middle of the goal more often, with only some going for the corners.

**Results** (simulator, 24 matches × 6 min, both sides AI):

| | Before Phase 18 | After |
| --- | --- | --- |
| Passes cut out | 61–67% | 20–24% |
| Passes completed | 33–39% | 72–77% |
| Interceptions per team per match | 61–75 | 17–18 |
| Goals per team per match | 1.5–2.8 | about 1.3–1.8 |

Tactics change the outcome. For example, High Press against Balanced: 46–53% of the time on the ball is spent in the attacking third, against about 35% for Balanced; Defensive against Balanced: fewer passes, more duels.

### Playtest notes (2026-11-11) — fixed in Phase 19 ✅

Reported after playing Phase 18; all four are fixed (see "Fixed" under each item and the Phase 19 section).

1. **Players crowd the keeper after a catch.** When the goalkeeper holds the ball, opponents (and teammates) stay right next to him, so there is no one free to throw to and the throw is easily cut out.
   - Expected: while `state.keeperHands` is set, opponents gradually drop back (out of the penalty area, at least ~10–15 m from the keeper), and teammates spread out to offer throwing options (full-backs wide, a midfielder short).
   - Where: `teamAI.js` (team shape while the keeper holds the ball), `carrierAI.js` → `distributeFromHands` (choose a throw only when the receiver is open).
   - **Fixed:** while a keeper holds the ball, nobody presses him; opponents drop outside the box and at least 14 m away (in testing they went from 3 m to over 15 m within 2 s). His teammates spread out: centre-backs to the corners of the box, full-backs wide, a midfielder short.
2. **The keeper cannot move while holding the ball.** After a catch he only turns on the spot (`control.js` returns early when `state.keeperHands === selectedId`).
   - Expected: the keeper can walk with the ball in his hands (slower than running), staying inside his own penalty area, before throwing or kicking. Optionally limit the time he may hold the ball (about 6 s), then release automatically.
   - Where: `control.js` → `updateControlledPlayer`, `ball.js` → `updateDribble` (ball follows the keeper's hands), AI keeper in `carrierAI.js`.
   - **Fixed:** the arrow keys walk the keeper at 3.2 m/s with the ball, kept inside his own penalty area. After 6 s without a throw or kick, the AI distributes for you.
3. **Winning the ball back is too hard.** Tackles almost never succeed, so the user cannot win the ball.
   - Review standing tackle success in `control.js` → `performTackle`: base 0.34; −0.3 against a shielding player from behind; clean win only 68% (otherwise the ball is poked loose).
   - Also review tackle range (1.9 m standing / 3.2 m sliding) and cooldowns (0.85 s / 1.5 s), contain (D), and AI dribbling that now keeps the ball close (Phase 18).
   - Show clearer feedback when the tackle fails and why (too far, behind the shield, bad timing).
   - Measure the user's tackle success with the match simulator before and after.
   - **Fixed** (measured on an AI striker dribbling, ball won within 1.2 s, before → after):

     | Tackle | Before | After |
     | --- | --- | --- |
     | Standing, from the front | 29% | about 65–68% (after Playtest notes 2; the passive steal is gone) |
     | Standing, from the side | 17% | about 53% |
     | Standing, from behind | 8% | about 22% |
     | Against a shielding player | 2–3% | 7–9% (go round to the ball side) |

     Changes:
     - Standing tackle range 1.9 → 2.2 m, with a lunge of up to 0.8 m towards the ball. Cooldown 0.85 → 0.6 s.
     - Success uses the new attributes (Standing / Sliding tackle + Strength against Ball control + Strength + Balance) and stamina.
     - A clean win is now 75% (was 68%). A poked ball goes sideways, slightly towards the tackler, not on towards the team that lost it.
     - The player who lost the ball can no longer win it straight back: the dribble-steal and AI tackles respect his recovery time, and a new owner gets 0.45 s before AI tackles.
     - Messages explain a miss: too far (shows the distance), from behind, or shielded.
4. **The intended receiver stands still waiting for the user's pass, and the opponent takes it.** After pressing S/W, the teammate who should receive the ball waits at the target spot instead of coming towards the ball, so a defender steps in front.
   - Expected: like FIFA Online 4, the receiver moves to meet the ball, especially when an opponent is closer to the passing lane. Control could also switch to the receiver while the ball is travelling.
   - Where: `teamAI.js` → `updateReceiverRun` (it currently runs to the target spot and only chases the ball's path when within 9 m). Check that nothing else moves or blocks the receiver during `pendingPass`, including the user-controlled player.
   - Check user passes too: they aim with the arrow keys and power, not with `laneSlack`.
   - **Fixed:**
     - The receiver now runs to the earliest point on the ball's path he can reach, so he always comes towards the ball, using the real path after pass inaccuracy. Through balls still go into space unless the ball would get there first.
     - While you hold S, the predicted receiver already starts coming towards you.
     - Control switches to the receiver as soon as the ball leaves the foot (FIFA Online 4 auto-switch). He keeps running to meet the ball until you steer him. The arrow keys you held to aim are ignored until you release them.
     - Test (120 passes each, before = receiver waits → after):

       | Situation | Before | After |
       | --- | --- | --- |
       | Defender marking about 2 m behind/beside the receiver | 9 received | 120 received |
       | Defender about 3.5 m from the passing lane | 16 | 70 |
       | Defender already standing between the receiver and the ball | 0 | 2 (still a bad pass: choose another teammate) |

### Phase 19 — Stamina, fatigue and detailed attributes ✅ (2026-11-11)

**Detailed attributes** (`systems/attributes.js`)

- 18 outfield attributes in six groups:
  - Pace: acceleration, sprint speed.
  - Shooting: finishing, shot power, long shots.
  - Passing: short passing, long passing, vision.
  - Dribbling: ball control, agility, balance.
  - Defending: standing tackle, sliding tackle, interceptions, marking.
  - Physical: strength, stamina, aggression.
- Goalkeepers also have diving, handling, reflexes, positioning and kicking.
- Detailed attributes are **derived** from the six main stats, plus a position bias (strikers +finishing, centre-backs +strength/marking, wingers +acceleration…) and a fixed −4…+4 offset per player. Old saves, transfer-market players and generated opponents all get them without a data migration.
- `player.attributes.<key>`, when present, overrides the derived value. Phase 19B levelling writes upgraded attributes here.
- **Main stats now depend on position** (`POSITION_PROFILES` in `data/teams.js`). Before, every stat was ≈ overall, so strikers tackled like centre-backs and keepers shot like strikers. Default players in old saves are migrated automatically (only when their six stats are still "flat"); bought players keep their own stats.
- **Where they are used:**

  | Attribute | Effect in the engine |
  | --- | --- |
  | Sprint speed | top speed (8.4–8.9 m/s) |
  | Acceleration | how fast the player you control and AI ball carriers reach top speed |
  | Agility | how much speed is kept when turning |
  | Finishing / long shots | shot accuracy, blended by distance |
  | Shot power | shot speed |
  | Short passing / long passing / vision | pass angle and power error. Vision also matters for through balls and affects how often the AI chooses through balls and long passes |
  | Ball control | clean first touch up to 10–18 m/s; dribble touch accuracy (with agility) |
  | Balance + strength | holding off challenges and tackles |
  | Standing tackle / sliding tackle | tackle success (yours and the AI's) |
  | Interceptions | reach for blocking a moving ball, reading interceptions |
  | Marking | how tightly defenders mark |
  | Aggression | how often AI players attempt tackles |
  | Strength | duels and collisions |
  | Stamina | how fast stamina drains |
  | Reflexes | keeper reaction time |
  | Diving | keeper dive reach |
  | Handling | catching instead of parrying |
  | Positioning | how well the keeper covers the angle |
  | Kicking | keeper throws and punts |

**Stamina and fatigue** (`systems/stamina.js`)

- `state.stamina[id]`, 0–100, starts from the player's **condition**.
  - Sprinting (above 92% of the player's top speed) drains it quickly, running drains it slowly, and walking or standing recovers it.
  - Tackles, slides, shots, dives and shoulder duels cost a little extra.
  - The Stamina attribute scales the drain (50 → ×1.0, 90 → ×0.72). Drain is scaled by match length, so players end a 3, 6 or 10-minute match equally tired.
  - Half-time gives +10.
- Simulator, end of a 6-minute match before the half-time bonus: average about 56%, midfielders about 36%, defenders about 78%.
- **Fatigue starts below 70%:** up to −18% top speed and −25% acceleration, and up to −12 points on shooting, passing, ball control, tackling, strength and keeper attributes.
- **Condition between matches:** after each match, players lose condition for the minutes they played (≈ −30 × stamina factor per full match), and the whole squad recovers +15. Condition never drops below 40, and a new season restores 100%.
  - A striker who plays every match goes 100 → 93 → 86 → 79 …; one match on the bench gives +15.
  - Condition is saved with the roster.

**Interface**

- A stamina bar under each player's name tag (green, yellow below 60, red below 35).
- Live stamina in the player profile, plus a "DETAILED ATTRIBUTES" toggle that shows all groups (goalkeeping first for keepers).
- Stamina bars on the substitution board: live stamina during the match, condition before kick-off.
- Condition % next to each starter on the pre-match screen.

**Balance** (simulator, 24 matches × 6 min, both sides AI):

- Passes completed 78–81%, cut out 14–16%.
- About 11 tackles per team, about 1.1–1.8 goals per team.
- Acceleration is applied only to the player you control and to AI ball carriers. Applying it to every AI player halved the number of tackles: their run targets change every frame, so they never reached top speed. Goals went up about 60%.

### Playtest notes 2 (2026-11-11) — fixed with Phase 19B ✅

1. **"You should only win the ball with a (slide) tackle or a bad pass, not just by walking up to it."**
   - Removed the passive steal: an opponent standing next to a loose touch no longer takes the ball automatically.
   - The ball now changes hands only through:
     - a tackle or slide;
     - a heavy touch (the ball becomes loose);
     - a cut-out pass.
   - On your team, only the player you control tackles: **Space** standing, **A** (or Ctrl) slide. AI teammates no longer tackle on their own (except when the AI is playing for you), and they cannot knock the ball off a carrier with a shoulder duel.
   - The AI opponents still decide for themselves: standing tackles, plus **sliding tackles** from 1.6–2.8 m, which happen more often for aggressive players. A successful slide knocks the ball away and floors the carrier. A miss leaves the slider on the ground.
   - "Call a teammate to press" moved from A to **W**.
2. **"If I don't press anything for ~10 s, let the AI play."**
   - After 10 s with no key pressed (holding a key counts as playing), the AI controls your whole team, including the selected player.
   - An "AUTO PLAY" badge shows while it does. Any key gives control back.
3. **"Shooting and passing aren't smooth":** opponents closed down too fast, passes were half-hearted, and a full-power pass sometimes didn't happen at all.
   - **Full power, no pass:** while you held S, opponents rushed in and won the ball, and the charge was silently cancelled. Pressing is now a jockey: the first defender sprints to a goal-side spot, slows down within 6 m and holds about 1.2 m off, waiting for the right moment to tackle. If you do lose the ball while charging, the game now says "BALL LOST WHILE CHARGING".
   - **Weak passes:** pass speed to a teammate only depended on distance. It now also scales with the power bar: ×0.88 for a tap up to ×1.30 at full, max 27 m/s. A quick tap on D shoots with at least 35% power.
   - Tested in the simulator, holding S for 0.1 s / 0.5 s / 1 s / 2 s: the pass is always played (before: lost under pressure after about 0.7 s). Ball speed: 18 / 22 / 25–26 / 27 m/s (before: about 20 m/s whatever the power).
4. **"Sometimes after receiving the ball the player won't move; I can only pass or shoot."**
   - Cause: the Phase 19 auto-switch ignored the arrow keys you held while aiming the pass until you released all of them. If you kept holding them, the receiver stood still even after he had the ball.
   - The lock now lasts only while the ball is still travelling to the receiver, only for the exact arrows held at the pass, and for at most 0.6 s.
   - Test: holding the same arrows through the pass, the receiver moves 16 m in the 3.4 s after receiving the ball.
5. **"At the end of a half the match should wait for the ball to go dead, with an animation, not just a panel."**
   - When time is up the clock stops and shows added time (e.g. `45:00 +1:20`). Play continues until the ball is dead: out of play (throw-in, corner, goal kick), a goal, or the keeper holding the ball. There is no time limit (your choice).
   - After a goal or an out-of-play ball, the whistle waits until the celebration or the set-up for the restart is over.
   - Then the referee whistles ("HALF TIME" / "FULL TIME"), the ball stops and players stop:
     - **Half time:** players walk towards the tunnel at the halfway line.
     - **Full time:** the winners celebrate (crouch, jump, arms up), the losers bend over with hands on knees, and on a draw both teams clap. New clips: `celebrate`, `dejected`, `clap`.
   - The half-time / full-time panel appears after 2.8 s / 4 s.
   - In the simulator, the dead ball came 4–77 s (real time) after the clock ran out.
   - Fixed with it: the "GOAL" overlay could switch the match back to playing just after the whistle.

**Balance after these changes** (simulator, 24 matches × 6 min, both sides AI): passes completed 81–82%, cut out 13–14%, about 4 tackles and 13 interceptions per team (turnovers now come mostly from cut-out passes and AI tackles with an animation, not passive steals), about 1.2–1.6 goals per team.

### Phase 19B — Player progression: levels and attribute points ✅ (2026-11-11)

New: `systems/progression.js`, `screens/DevelopmentScreen.jsx` (**SQUAD** tab).

- **XP after each match** (`matchXp`):
  - 40 × share of the match played.
  - Rating above 6.0 × 30.
  - Goal 15, assist 10, tackle 3, interception 2, save 6.
  - Clean sheet for GK/defenders who played 60%+: 20. Player of the match: 30. Win: 10.
  - Unused players get 10 training XP. A forfeited match gives no XP.
  - Typical full match: about 60 XP (rating 6.4), about 100 (7.2 and a goal), about 150 (8.1, two goals and an assist).
- **Levels:** 1–30. XP for the next level = `60 + 30 × level` (90 at level 1, 360 at level 10, 660 at level 20). Each level gives 3 attribute points.
  - A regular starter reaches about level 12–13 after his first season and needs 4–5 seasons for level 30.
  - The planned `100 × level^1.5` curve was too slow: about level 6 after a whole season.
- **Spending points** (cost by position):
  - 1 point for key attributes, 2 for secondary, 3 for the rest.
  - Example: a striker's keys are finishing, shot power, acceleration, sprint speed, strength and balance. A centre-back's are standing/sliding tackle, marking, interceptions, strength and aggression. Goalkeepers' are diving, handling, reflexes and positioning.
  - **RECOMMENDED FOR POSITION** spends all points automatically, lowest key attributes first.
- **Potential and OVR:**
  - Each player has a potential: current OVR + 3–12, up to +4 more for young bought players, max 95.
  - OVR is recalculated with position weights: about +0.13 per key point, +0.06 per secondary point, almost nothing for unrelated attributes. It can't go above potential, and every attribute is capped at 99.
  - The new OVR feeds transfer value.
- **Data:** new fields on each player: `level`, `xp`, `unspentPoints`, `potential`.
  - Old saves get defaults: level 1, 0 XP.
  - On the first upgrade the player's derived attributes are snapshotted into `attributes` / `attributesBase` (plus `baseOverall`), and the six main stats are kept in sync as group averages for the other panels.
- **Interface:**
  - The post-match screen has a "PLAYER DEVELOPMENT · XP EARNED" card: XP per player, level, XP bar and **LEVEL UP! +3 pts**.
  - The SQUAD screen shows every player's level, OVR / potential and unspent points. The player detail has XP, all attribute groups with their cost and a "+" button.
  - The Home screen shows how many points are waiting. The match profile shows the level.
- **Simulator check:** 38 matches × 90 XP takes a striker (OVR 85, potential 89) to level 13 and OVR 88.
- Left for later (optional in the plan): AI clubs levelling up during the season.

### Playtest notes 3 (2026-11-11) — fixed with Phase 20 ✅

1. **The power bar sometimes got stuck at full.** After pressing pass/shoot and then an arrow key, the bar filled up and stayed; the player could run but not pass or shoot.
   - Likely cause: the key-up event never reached the game (for example the Vietnamese Telex/VNI input method handles S, W, A and D, or the window lost focus).
   - Fixed: the kick is released when the key is no longer held, after 0.7 s at full power, and cancelled when the window loses focus.
2. **Running past the ball when receiving.** The player ran exactly where the arrows pointed, slightly off the ball.
   - Fixed: when you steer roughly toward a loose ball (within ~70°), the run is pulled toward the meeting point (or the landing spot of a high ball), and the player slows down to wait under a high ball.
   - Test (rolling ball, arrow 35–50° off): 14/20 → 19/20 balls controlled.
3. **Throw-in given to the wrong team.** A touch that only slowed the ball down (first-time block) was not recorded as the last touch, so a ball that then went out was awarded to the wrong side. Fixed.
4. **Attribute upgrades applied instantly.** The SQUAD screen now builds a draft: pending points are highlighted, with UNDO LAST, UNDO ALL and CONFIRM. You can't leave the player or screen with unsaved upgrades.
5. **W through balls went nowhere.** Fixed:
   - Aiming at the teammate himself counts (before, only his run-on spot did, so nobody qualified and the ball was played into empty space).
   - Without arrows, W picks the best forward runner within ~110° of where you face, instead of kicking along your facing direction.
   - A through ball into empty space only happens when you aim forward.
6. **Goal kicks were contested.** The keeper had the ball at his feet and opponents could challenge straight away. Goal kicks are now a proper set piece (see Phase 20).

### Phase 20 — Fouls, cards, offside and set pieces ✅ (2026-11-11)

- **One set-piece system** (`state.restart`) for throw-ins, corners, goal kicks, free kicks and penalties:
  - The ball stays on the spot (throw-in: in the hands) and nobody can challenge until it is kicked.
  - Spacing: opponents stay 9.15 m away (2 m at a throw-in). At a goal kick they leave the penalty area. At a penalty everyone except the taker and the keeper stands outside the box and the arc, and the keeper stays on his line.
  - Players are no longer teleported back to their formation on every dead ball; only the taker goes to the spot.
  - The AI takes set pieces after a short pause: throw-ins, corners (mostly crosses), goal kicks (short to a free defender, otherwise long), free kicks and penalties.
- **Fouls** (`referee.js`): every tackle and slide (yours or the AI's) is judged.
  - More likely: slides, challenges from behind, and missed tackles that still hit the carrier.
  - Less likely with good tackling; more likely with high Aggression.
  - A foul inside the defending team's box is a penalty, otherwise a free kick on the spot after a short whistle pause.
  - The AI avoids sliding in from behind.
- **Cards:** yellows mostly for slides from behind. Direct reds are rare (higher for denying a clear goal-scoring chance as the last man). Two yellows make a red.
  - A sent-off player leaves the pitch and the team plays a man down; he can't be replaced.
  - Cards appear next to the scorers in the half-time, full-time and post-match lists.
- **Free kicks:** the best long-shot taker steps up within shooting range.
  - A wall of 2–4 defenders stands 9.15 m from the ball and blocks low shots.
  - Shots from a free kick are dipping shots; too little power hits the wall, too much goes over.
- **Penalties:** the best finisher takes them. The keeper guesses a side as the ball is struck and can only save it if he guesses right; shots into the corners are harder to save.
- **Offside:** when the ball is played, teammates beyond both the ball and the second-last opponent in the opposition half are recorded.
  - If one of them touches the ball before an opponent does, it is offside and the defending team gets an indirect free kick.
  - Not checked for throw-ins, goal kicks and corners.
  - AI forwards now hold the line instead of standing beyond it, and the AI never passes to an offside teammate.
- **Statistics:** corners, fouls, offsides, yellow and red cards in the post-match screen.
- **Simulator** (24 matches × 6 min, AI v AI), per team per match:
  - About 1.8 fouls, 0.5 yellow cards, 0.04 red cards and 0.4–0.6 offsides.
  - Goals 1.1–1.5, pass completion 83–85%.
- **Set-piece tests:**
  - Penalties: 70% scored.
  - Direct free kicks from 22 m: 12% scored, 17% blocked by the wall, about half saved.
  - Goal kicks: 20/20 taken, never contested, no opponent left in the box.

### Skill shots and passes — FIFA Online 4 key combos ✅ (2026-11-11)

Hold a modifier, then press or charge the action key. The modifier also counts if you press it while charging. Set pieces always use the plain kick.

| Combo | Effect | How it is modelled |
| --- | --- | --- |
| Z + D | Finesse shot | Aimed a little outside the target and bends back along a circular arc onto it. 40% less aim error, 15–24 m/s. The keeper allows for the curl but has 15% less chance to save it |
| Q + D | Chip shot | High lob (6.5–9.5 m/s upward, ±7% error). Unreachable for a keeper standing off his line; can drop over the bar or short |
| C + D | Trivela | Aimed inside and bends outward onto the target; slightly less accurate than finesse |
| D, D | Low driven shot | Press D again during the kick wind-up (or up to 0.15 s after) |
| Z + S / Z + W | Driven pass / through ball | 20% faster and flat — harder for the receiver to control cleanly |
| Q + W | Lobbed through ball | Over the defence (about 4 m/s upward, 28% slower) |
| Z + A / A, A | Whipped / low cross | Flatter, faster cross / a cross capped at knee-to-waist height |

- Q with the ball is now a modifier only. Without the ball it still cycles players.
- Shot tests from 18 m (30 shots each, keeper on his line): normal 16 goals, finesse 17, trivela 19, low driven 16. A chip from 22 m beat a keeper standing 8 m off his line every time.
- The combos follow the standard FO4 keyboard layout (web search was not available to double-check).

### Small fixes before Phase 21 ✅ (2026-11-11)

- **Old team panel removed from the match screen.** The left-hand TeamManagementPanel covered the pitch and blocked clicks. Substitutions use the SUBS button; formation changes are at half time or before the match. (`TeamManagementPanel.jsx` is no longer used and can be deleted.)
- **Harder shots.** Charged shots now leave the foot at about 23–35 m/s (was 17–30); finesse 16–24 m/s; AI shots 24–31 m/s.
- **Keeper positioning.** The keeper stands on the line between the ball and the centre of the goal (splitting the angle) instead of hugging the near post, and only rushes out when the striker is within 15 m (was 19 m), never more than ~9.5 m off his line.
  - Unopposed corner shots from 18 m (30 each): normal 16 goals, finesse 20, trivela 19, low driven 17 — about the same as before even with the harder shots.
- **Keeper vs chip shots.** When a ball is going over his head, the keeper backpedals (5 m/s) to where it drops to ~2.3 m, or to his line. The save chance depends on how far he has to run. A chip from 18 m against a keeper in his normal position: 30/30 → 14/30 goals.
- **AI skill shots and passes:**
  - Chips when the keeper is more than 5.5 m off his line.
  - Finesse shots from 13–27 m out wide, occasionally a trivela or a low driven shot (more often with better Finishing / Long shots).
  - Lobbed through balls when the ground lane is blocked, driven passes on long open lanes, and whipped crosses into the box.

### Phase 21 — Match statistics and presentation ✅ (2026-11-11)

- **New stats in the engine** (`matchStats.js`):
  - Completed passes: a pass counts as completed when a teammate of the passer is the next player to control the ball.
  - Expected goals (xG) for every shot, from the angle of the goal mouth seen from the shot position. Penalties count as 0.76; free kicks are capped at 0.07; being closed down (< 2 m) is −30%.
  - xG is calibrated to this game's finishing (24 AI v AI matches: xG 1.0–1.2 v 1.1–1.4 goals per team).
  - A shot log (position, xG, goal or not, shot type) for the shot map.
- **During the match:**
  - The STATS button shows a small live panel (possession, xG, shots, on target, pass accuracy, fouls) that updates every second without pausing.
  - PAUSE shows every stat in two columns.
  - Half time has a FIRST-HALF STATS tab next to the team settings.
  - The full-time card shows the six key stats.
- **After the match:**
  - The full comparison: possession, xG, shots, on target, passes, pass accuracy, tackles, interceptions, duels, saves, corners, fouls, offsides and cards.
  - A **match timeline** (0'–90' with half time) of goals, cards and substitutions.
  - A **shot map** for each team: dot size = xG, filled = goal.
  - **Top performers** (most passes completed, tackles, interceptions, shots, highest xG).
  - The ratings table now shows shots and passes completed/attempted.
- Match overlays now sit below the scoreboard and scroll if they are taller than the pitch.

### Later phases (not started)

Everything up to and including Phase 21 is done (see the status table above). Still to do:

- **Phase 22:** Visual polish, sound, performance optimisation and release preparation.

### Phase 23 — Club selection and club crests (planned)

> Ghi chú cho phase mới, chưa triển khai.

- **Club selection:** choose which club to manage (any of the 20 league clubs, e.g. switch between Manchester United and Manchester City) when starting a career or a new season, and possibly from a "Change club" option in Settings.
  - Make the user team id configurable instead of the fixed `blue` slot.
  - Keep a separate squad per club, and give every league club its own full squad data instead of generated names only.
  - Map league fixtures and standings to the chosen club, and migrate existing saves (roster, club budget, league progress).
  - Ask for confirmation before switching mid-season.
- **Club crests:**
  - Data: a crest field per club in `LEAGUE_TEAMS`.
  - Where they appear: the home screen next-match card, pre-match and post-match screens, scoreboard, league table, team panel and full-time card.
  - Fallback: the current coloured badge with the short name.
  - Assets: original crest designs or image files you supply yourself (real club crests are trademarks and are not included in the project).

### Ideas backlog (từ yêu cầu, tham khảo FIFA Online 4)

| Ý tưởng | Bước |
| --- | --- |
| Hỗ trợ chuyền; chuyền và sút phải có lực | Step 3 ✅ |
| Tên trên đầu cầu thủ, áo có số | Step 5 ✅ |
| Kéo thả để thay người, HUD như FIFA Online | Step 5 ✅ |
| Hết giờ thông báo tỉ số thật to | Step 4 ✅ |
| Bản đồ mini ở giữa giao diện | Step 5 ✅ |
| Không có bóng thì S đổi cầu thủ, có mũi tên trên đầu | Step 3 ✅ |
| Ném biên | Step 4 ✅ |
| Nghỉ giữa hiệp: mở cài đặt rồi bấm Tiếp tục sang hiệp 2 | Step 4 ✅ |
| Cho phép bỏ trận giữa chừng | Step 4 ✅ |
| Giao diện ngoài trận đấu (menu, trước/sau trận) | Step 6 ✅ |

---

**Project:** Ultimate Football Manager 3D  
**Current delivery:** Steps 1–6 + Phases 15–21 (see roadmap)  
**Game mode:** 3D Football + Club Management  
**Match format:** 11 vs 11  
**Stack:** React + Vite + Three.js + React Three Fiber + Drei + Rapier  
**Persistence:** Browser LocalStorage
