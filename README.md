# Ultimate Football Manager 3D

A browser-based 3D football game and club-management prototype built with React, Vite, Three.js, React Three Fiber, Drei and Rapier.

> **Current delivery: Phase 10 — Passing and Receiving System, plus Steps 1–6 (bug fixes, engine refactor, FIFA Online-style controls, match flow, in-match HUD, menus and match screens) (2026-11-10).** Phases 11–14 were planned but not yet delivered as distinct features (see Development roadmap). The project has evolved from a basic 3D football prototype into an 11v11 football game with player AI, goalkeeper behaviour, match rules, squad management, club management, league competitions and an improved passing and receiving system.

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

## Controls

| **Key** | **Action** |
| --- | --- |
| Arrow keys | Move the selected Manchester United player; also aims passes and shots |
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
| C (hold, with the ball) | Shield the ball: turn your back to the nearest opponent and keep the ball on the far side; arrows move slowly |
| S / A at a throw-in | Short / long throw (arrows choose the direction) |
| S / W (keeper holding the ball) | Goalkeeper throw (hold to charge, arrows aim) |
| A / D (keeper holding the ball) | Goalkeeper punt / long kick (hold to charge, arrows aim) |
| Space | Standing tackle |
| Ctrl | Sliding tackle |
| SUBS button | Open the drag-and-drop substitution board (pauses the match) |
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
    │   ├── goalkeeper.js     # keeper positioning, save plans, catching
    │   ├── duels.js          # shielding, shoulder duels, poked tackles
    │   ├── movement.js       # AI movement, collisions, velocity tracking
    │   ├── rules.js          # goals, out of play, kick-off and restarts
    │   ├── matchStats.js     # match statistics, ratings, summary
    │   └── matchEngine.js    # fixed-step loop calling the systems in order
    ├── animation/
    │   ├── clips.js          # keyframe clips (pass, shot, tackle, slide...)
    │   └── rig.js            # run cycle, clip sampling, blending, applyPose
    ├── utils/
    │   └── names.js          # shortPlayerName()
    └── components/
        ├── screens/          # TopBar, HomeScreen, PreMatchScreen, PostMatchScreen
        ├── GameScene.jsx
        ├── MatchWorld.jsx
        ├── MatchOverlays.jsx
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

### Later phases

- **Phase 18:** Team tactics, pressing, defensive organisation and attacking strategies.
- **Phase 19:** Stamina, fatigue and more detailed player attributes.
- **Phase 19B:** Player progression: levels, XP and position-based attribute points (see below).
- **Phase 20:** Fouls, penalties, offside and full set pieces.
- **Phase 21:** Match statistics and presentation.
- **Phase 22:** Visual polish, sound, performance optimisation and release preparation.

### Phase 19B — Player progression: levels and attribute points (planned)

> Ghi chú cho phase mới, chưa triển khai. Xếp sau Phase 19 vì cần bộ chỉ số chi tiết và thể lực của Phase 19. Dùng luôn thống kê và điểm số sau trận đã có từ Step 6.

- **XP after each match:**
  - Base XP for playing, scaled by minutes on the pitch.
  - Bonus from the match rating (`ratePlayer` in `systems/matchStats.js`), goals, assists, tackles won, saves and clean sheets.
  - Extra XP for player of the match.
  - Unused players get a small amount of training XP.
- **Levels:** for example level 1–30, with an increasing XP curve (e.g. `100 × level^1.5`). Each level-up gives attribute points (e.g. 3 points).
- **Position-based upgrades:** points are spent on attributes, and the cost depends on the player's position.
  - Key attributes for the position cost 1 point.
  - Secondary attributes cost 2 points.
  - Attributes unrelated to the position cost 3 points.

  | Position | Key attributes (1 point) | Secondary (2 points) |
  | --- | --- | --- |
  | GK | diving, handling, reflexes, positioning (GK attributes come from Phase 19) | kicking, physical |
  | CB | defending, physical, heading | pace, passing |
  | LB / RB / LWB / RWB | pace, defending, stamina | passing, dribbling |
  | CDM | defending, passing, physical | stamina, dribbling |
  | CM / CAM | passing, dribbling, vision | shooting, stamina |
  | LW / RW / LM / RM | pace, dribbling, crossing | shooting, passing |
  | ST / CF | shooting, pace, positioning | dribbling, physical |

- **Limits:**
  - Each player has a hidden or visible potential (maximum OVR), and every attribute is capped at 99.
  - Overall (OVR) is recalculated with position weights, so a centre-back who adds shooting barely gains OVR.
- **Interface:**
  - Level badge and XP bar in the squad list, player profile and substitution board.
  - The post-match screen shows "LEVEL UP!" for players who level up.
  - An upgrade screen to spend points, with a "Recommended for position" button that spends them automatically.
- **Data and save:**
  - New fields on each player: `level`, `xp`, `unspentPoints`, `potential`.
  - Saved in the roster (bump the storage key or migrate with defaults `level: 1, xp: 0`).
  - The new OVR affects transfer value in `clubService.getPlayerValue`.
- **AI clubs (optional):** opposing players also gain levels during the season so the league stays balanced.

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
**Current delivery:** Phase 10 + Steps 1–6 + Phase 15 (see roadmap)  
**Game mode:** 3D Football + Club Management  
**Match format:** 11 vs 11  
**Stack:** React + Vite + Three.js + React Three Fiber + Drei + Rapier  
**Persistence:** Browser LocalStorage
