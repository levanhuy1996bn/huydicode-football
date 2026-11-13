# Ultimate Football Manager 3D

A browser-based 3D football game and club-management prototype built with React, Vite, Three.js, React Three Fiber, Drei and Rapier.

> **Current delivery: Steps 1–6, Phases 15–25, 26A–26D, 27, 28, 28B, 29B, 29C, 29D, 29E and 29F — all done ✅ (2026-11-12).** Specialised animations, goalkeeper saves and distribution, duels and shielding, team tactics and ball-carrier AI, stamina and detailed attributes, player progression, fouls, cards, offside and set pieces, FIFA Online-style skill shots and passes, match statistics (live stats, xG, shot map, timeline), and Phase 22 (two-player kick-off, stronger passes and shots, CONTROLS panel, TRANSFERS screen with signing toasts, squad rules 11 / 9 / reserves / 50, League screen with season player stats for all 20 clubs), and Phase 23 (club level and XP, prize money in EP, 500-player catalog, CARDS tab with player packs and EP cards, shots now rebound off defenders), and Phase 24 (three fixed kits per club, chosen before each match without clashes; shooting and passing accuracy clearly depend on stats), and Phase 25 (card upgrades +1 → +10 with an FC Online-style animation, player level 100, stats above 99), and Phase 26A (world of football: 18 countries, 36 leagues, 720 real clubs, promotion / relegation, every player in the transfer market), and Phase 26B (choose / change the club you manage, crests on every screen), and Phase 26C (player height and weight that change the 3D body and a few attributes, season difficulty that raises opponent card levels and rewards), and Phase 26D (FC Online-style team color: card level color and club color for the starting XI, AI included), and Phase 27 (two world club cups, C1 Champions Cup and C2 Challenge Cup: 32 clubs each from all 18 countries, 8 groups of 4, two-legged knockouts, one-match final, simulated penalty shoot-outs; away goals rule added afterwards), and Phase 28 (quick simulation: 5 instant matches per day with a 2D replay, rewards ×0.7), and Phase 28B (TROPHIES room: every title you win as a manager, a different trophy for each competition, career table), and Phase 29C (upgrade insurance +5% per failure, Upgrade Protection cards, xG for rebounds and deflections), and Phase 29B (graphics HIGH / LOW, stadium with crowd, 3D turning trophies, match sounds, FPS counter, faster first load, ready to publish as a static site / installable app), and Phase 29D (penalty shoot-outs you take yourself: kick with ← / → + D, dive with your keeper, camera behind the taker), and Phase 29E (World Cup every 4 years with 32 national teams called up from all clubs, nationality team color), and Phase 29F (AI long shots and long passes, new Composure attribute, receivers meet the ball, faster passes and shots, new crowd sound, reliable auto play with an AUTO PLAY button and automatic second half). Phases 11–14 were folded into Steps 1–6. Phases 29G, 29H, 29I and 29J done 2026-11-13. 29A1 and 29A2 done 2026-11-13 — matches can be played on a phone. **Next:** the mobile phases 29A3 → 29A5 → 29A4 (29A split on 2026-11-13) — the last planned phases; card seasons and real data moved to the backlog. See the status table under Development roadmap.

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

### Publish online (Phase 29B)

`npm run build` creates a static site in `dist/`. The build uses relative paths (`base: './'` in `vite.config.js`), so the `dist/` folder works from any domain or sub-folder; no server code is needed and saves stay in each player's browser (LocalStorage).

- **Netlify:** drag the `dist/` folder onto app.netlify.com/drop, or connect the repo with build command `npm run build` and publish directory `dist`.
- **Vercel:** import the repo; framework preset *Vite* (build `npm run build`, output `dist`).
- **GitHub Pages:** build, then publish the contents of `dist/` to the `gh-pages` branch (e.g. `npx gh-pages -d dist`); the game then runs at `https://<user>.github.io/<repo>/`.
- **Install as an app:** the site has a web app manifest and icons (`public/manifest.webmanifest`, `public/icon*.png`), so Chrome / Edge offer *Install* and phones offer *Add to Home Screen*. There is no offline mode (no service worker).
- **Loading:** the first screen loads ~1.3 MB of JavaScript (~380 KB gzipped); the 3D match engine with Rapier physics (~2.4 MB) is a separate file fetched in the background 1.5 s after start, and the 3D trophy viewer is loaded only when needed.

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
- **Phase 25 (2026-11-12):** upgrade cards +1 → +10 in CARDS → UPGRADE CARDS (Phase 25B: stronger effect above 99, original MU players buyable as copies) (same-player material + up to 5 extra cards, total % shown, heartbeat animation with sound), every + level adds to all stats, coloured + badges and stat numbers, buy the same player many times, card value grows with the + level, player level max 100, stats above 99 still count (diminishing returns).
- **Phase 24 (2026-11-12):** every club has fixed home / away / third kits (+ two goalkeeper kits); before each match you pick the kit of both teams, clashing kits are locked and keepers get a colour that differs from both teams. Shot and pass accuracy now clearly follow the stats: weak finishers / passers miss a lot more, good ones stay precise.
- **Phase 23 (2026-11-12):** club level and XP after every league match, prize money (EP), level-up rewards (EP cards + player packs) in a new CARDS tab, a catalog of 500 fictional players (transfer market + packs), every owned player is a card (`playerId` / `cardId`, +1), no duplicate player in the matchday squad, and shots that hit an outfield opponent now rebound instead of sticking to him.
- **Phase 22 (2026-11-12):** kick-off with two players (the taker must pass), stronger passes and shots, CONTROLS panel (key guide + name display) instead of NAMES, TRANSFERS screen (was CLUB) with clear signing / selling toasts, squad rules (11 starters, max 9 on the bench, reserves, max 50; only reserves can be sold), League screen with LEAGUE TABLE first, PLAYER STATS for every player in the league and the full list of your 38 fixtures.

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
| S / W / A at a kick-off | The taker must pass (no dribbling or shooting); with no arrow the pass goes to the player next to him |
| D at a free kick | Shoot over the wall (about 40–80% power clears it; arrows aim). S / W / A pass or cross |
| Arrows + D at a penalty | Aim and shoot (penalties allow shots only) |
| Arrows (keeper holding the ball) | Walk with the ball inside your penalty area (after 6 s the keeper distributes automatically) |
| S / W (keeper holding the ball) | Goalkeeper throw (hold to charge, arrows aim) |
| A / D (keeper holding the ball) | Goalkeeper punt / long kick (hold to charge, arrows aim) |
| Space | Standing tackle |
| Ctrl | Sliding tackle (same as A when defending) |
| Any key | Take back control when the AI is playing for you (it takes over after 5 / 10 / 20 s without a key press — Settings — or with the AUTO PLAY button) |
| SUBS button | Open the drag-and-drop substitution board (pauses the match) |
| STATS button | Show / hide live match stats (the match keeps running) |
| CONTROLS button | Key guide and player-name display (SMART / ALL / OFF); pauses the match, Esc closes |
| QUIT button | Leave the match (a league match is recorded as a 0–3 loss) |
| Click a Manchester United player | Select that player |
| Mouse / trackpad | Camera interaction where enabled |

Some actions depend on ball possession, player selection and the current match situation.

## Club and league management

The game includes management systems alongside the 3D match gameplay.

### Clubs (2026-11-10)

- **You choose the club you manage** (Phase 26B): any of the 720 clubs; Manchester United by default. Your squad (Huy Le, Salvatierra…) and cards are your own and stay with you when you change club; the real players of every club exist as cards in the transfer market.
- Every club comes from the world data (`src/data/worldClubs.js` → `src/data/world.js`, 720 real clubs in 36 leagues). The club you manage is `userClubId()` / `userTeam()` in `src/services/career.js`, stored in the world save.
  - In the 3D engine `blue` is your side of the pitch and `red` the opponent's side; each match fills them with your club's / the opponent's name, kits and squad. Old saves using `blue` as the Manchester United club id (before 26B) and `red` for Manchester City are converted on load.
- Accent colours in the UI follow your kit through the CSS variable `--user-color`. Opponent kit colours avoid red, so they never clash with United.
- The roster save key moved to `ultimate-football-roster-save-v2`, so a saved lineup or transfers from the old Blue FC squad are reset once. League progress and club budget are kept.

### Club management

- View club squad and player information.
- Browse the transfer market.
- Manage player contracts and wages.
- Track squad value and weekly wage expenses.
- Save club progress locally.

### League management

- 18 countries × 2 divisions = 36 leagues of 20 clubs (Phase 26A). You play in one of them (Premier League at the start).
- View your fixtures, results, standings and season player stats; play Manchester United matches directly, the other matches of your league are simulated round by round.
- Look at the table and latest round of any other league (country picker + division switch on the LEAGUE TABLE tab); those leagues move forward with your rounds.
- Coloured bars on the table: C1 (top 4) and C2 (5–6) in top leagues, relegation (bottom 3), promotion (top 3 of second divisions).
- At the end of the season the bottom 3 of every top league go down and the top 3 of every second division go up — including your club.

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
    │   ├── playerCatalog.js  # 500 fictional players (Phase 23): transfer market + packs
    │   ├── kits.js           # fixed home / away / third + keeper kits per club, clash rules (Phase 24); kits from club colours (26A)
    │   ├── worldClubs.js     # 18 countries × 2 divisions × 20 real clubs: colours + real-name stars (Phase 26A)
    │   ├── world.js          # parses the world data: leagues, clubs, ids, strengths (Phase 26A)
    │   ├── worldSquads.js    # deterministic 22-player squad per club (Phase 26A)
    │   ├── nations.js        # 32 national teams as virtual clubs (Phase 29E)
    │   ├── starNationality.js # nationality of the 351 real-name stars (Phase 29E)
    │   ├── namePools.js      # fictional first / last names per nationality (Phase 26A)
    │   ├── starPhysique.js   # approximate height / weight of the real-name stars (Phase 26C)
    │   └── ...
    ├── hooks/
    │   └── useKeyboard.js
    ├── services/
    │   ├── clubService.js
    │   ├── leagueService.js  # your league: fixtures, results, standings, simulation
    │   ├── worldService.js   # world save, virtual leagues, promotion / relegation, history (Phase 26A)
    │   ├── career.js         # the club you manage: userClubId(), userTeam(), isUserClub() (Phase 26B)
    │   ├── difficulty.js     # season difficulty: opponent card level, reward factor, AI speed (Phase 26C)
    │   ├── teamColor.js      # team color: card level color + club color of the XI (Phase 26D)
    │   ├── cupService.js     # C1 / C2: qualification, draw, groups, knockouts, shoot-outs, calendar (Phase 27)
    │   ├── quickSim.js       # quick simulation: team ratings, instant result, 5 per day (Phase 28)
    │   ├── trophyService.js  # trophies + career: catalog of 39 trophies, awarding, backfill from history (Phase 28B)
    │   ├── nationalTeams.js  # national squads: nationality pools, call-ups, strength (Phase 29E)
    │   ├── worldCupService.js # World Cup: draw, groups, knockouts, simulation, results, prizes (Phase 29E)
    │   ├── seasonStats.js    # season player stats for all 20 clubs (Phase 22)
    │   ├── cards.js          # cards (playerId / cardId), packs, EP cards (Phase 23)
    │   ├── clubProgress.js   # club level, XP, prize money, level / season rewards (Phase 23)
    │   ├── upgrade.js        # card upgrades: bonus table, success rates, + badge / stat colours (Phase 25)
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
    │   ├── attributes.js     # detailed attributes derived from the 6 main stats (+ height / weight, 26C)
    │   ├── physique.js       # height / weight: generation, attribute effects, aerial / keeper reach, body scale (Phase 26C)
    │   ├── touchInput.js     # analog joystick direction shared with control.js (Phase 29A2)
    │   ├── form.js           # player form −2…+2, after-match changes, Fitness / Form cards (Phase 29I)
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
    │   ├── names.js          # shortPlayerName()
    │   ├── sound.js          # Web Audio: upgrade sounds, SOUND ON / OFF (Phase 25)
    │   ├── matchSound.js     # Web Audio: whistle, kicks, crowd, ooh, roar (Phase 29B, crowd reworked 29F)
    │   ├── crowdSynth.js     # crowd voices synthesised in code: murmur, "ooh", goal roar + applause (Phase 29F)
    │   └── device.js         # touch / iOS detection, full screen, zoom blocking in a match (Phase 29A1)
    └── components/
        ├── screens/          # TopBar, HomeScreen, PreMatchScreen, PostMatchScreen, DevelopmentScreen, WorldCupScreen (29H)
        ├── GameScene.jsx
        ├── MatchWorld.jsx
        ├── MatchOverlays.jsx
        ├── MatchStatsPanel.jsx   # stat comparison bars, live stats, timeline, shot map
        ├── ControlsPanel.jsx     # CONTROLS key guide + name display (Phase 22)
        ├── screens/CardsScreen.jsx # CARDS tab: club level, open packs / EP cards (Phase 23), UPGRADE CARDS (Phase 25)
        ├── UpgradePanel.jsx      # pick main card, material, extra cards, success % (Phase 25)
        ├── UpgradeAnimation.jsx  # FC Online-style upgrade animation (Phase 25)
        ├── CardBits.jsx          # PlayerCardView, + badge, coloured stat numbers (Phase 25)
        ├── SubstitutionBoard.jsx
        ├── MatchSidePanel.jsx
        ├── Player.jsx
        ├── Pitch.jsx
        ├── ClubManagementPanel.jsx
        ├── LeagueManagementPanel.jsx
        ├── ClubCrest.jsx         # generated SVG crest for every club (Phase 26A)
        ├── ClubPicker.jsx        # choose / change club (Phase 26B)
        ├── FormationPicker.jsx   # formation tiles with mini pitch diagrams (after 26B)
        ├── CupPanel.jsx          # C1 / C2 tab: groups, bracket, your cup matches (Phase 27)
        ├── screens/SimulationScreen.jsx # quick simulation replay (Phase 28)
        ├── screens/TrophyRoomScreen.jsx # TROPHIES: shelves, trophy details, career table (Phase 28B)
        ├── TrophyIcon.jsx        # SVG trophy for each competition, difficulty star (Phase 28B)
        ├── NewTrophyPopup.jsx    # "NEW TROPHY" pop-up (Phase 28B)
        ├── NationPicker.jsx      # choose your national team for the World Cup (Phase 29E)
        ├── WorldCupPanel.jsx     # World Cup groups, bracket, your matches (Phase 29E, on the WORLD CUP screen since 29H)
        ├── MatchCanvas.jsx       # 3D match canvas + physics, loaded on demand (Phase 29B)
        ├── Stadium.jsx           # stands with crowd, boards, floodlights (Phase 29B)
        ├── Trophy3D.jsx          # 3D turning trophy with SVG fallback; TrophyCanvas.jsx = WebGL part (Phase 29B)
        ├── FpsMeter.jsx          # FPS counter (Phase 29B)
        ├── PlayerPortrait.jsx    # SVG player portrait drawn in code, on large cards (Phase 29J)
        ├── TouchControls.jsx     # touch joystick + PASS / THROUGH / SHOOT / SPRINT buttons (Phase 29A2)
        ├── SettingsRows.jsx      # settings rows shared by HOME and the ⚙ dialog (Phase 29G)
        ├── SettingsDialog.jsx    # ⚙ SETTINGS dialog opened from the header (Phase 29G)
        ├── TeamColorPanel.jsx    # TEAM COLOR box: active colors, bonus, what is missing (Phase 26D)
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
- Keys: `ultimate-football-roster-save-v2` (squad and cards), `ultimate-football-club-save` (EP, level, inventory), `ultimate-football-league-save` (your league: clubs, fixtures, results, match stats), `ultimate-football-world-save` (Phase 26A: the 20 clubs of each of the 36 leagues + season history, ≈ 15–20 KB; Phase 26B: + `userClubId`, the club you manage), `ufm-sound-muted`.
- The ~15,800 world players and the 35 other leagues are not stored: they are generated from fixed seeds and always come out the same.
- Data belongs to the current browser profile.
- Clearing browser website data may remove saved progress.
- Different browsers or devices do not automatically share saves.
- Cloud saves, user accounts and multiplayer are outside the current project scope.

## Development roadmap

### Status at a glance (2026-11-12)

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
| 22 | Kick-off pass, stronger passes and shots, CONTROLS button, signing feedback, CLUB → TRANSFERS, squad rules (11 / 9 / reserves / 50), League screen rework, season player stats (whole league) | ✅ Done (2026-11-12) |
| 23 | Club level and XP, match prize money, 500-player catalog (`playerId` / `cardId`), Cards tab with player packs and EP cards (+ shot rebound fix) | ✅ Done (2026-11-12) |
| 24 | Club kits (home / away / third, fixed per club, picked before each match to avoid clashes) + shooting / passing accuracy by stats | ✅ Done (2026-11-12) |
| 25 | Player card upgrades (+1 → +10, coloured + badge), player level max 100, stats above 99 with coloured numbers | ✅ Done (2026-11-12) |
| 26A | World of football: 18 countries × 2 divisions (36 leagues, 720 real clubs), virtual leagues, promotion / relegation, market with every player, crests | ✅ Done (2026-11-12) |
| 26B | Choose / change club (first start, new season, Settings), former club becomes AI, real club ids in saves, crests on every screen | ✅ Done (2026-11-12) |
| 26C | Player height / weight (body + small attribute effects) and season difficulty (opponent card level +N, rewards ×) | ✅ Done (2026-11-12) |
| 26D | Team color: card level color (lowest card of the XI: bronze / silver / gold / diamond) + club color (11 from one club), also for AI teams | ✅ Done (2026-11-12) |
| 27 | C1 Champions Cup / C2 Challenge Cup: qualification from the league tables of all 18 countries, 8 groups × 4, two-legged knockouts, final, simulated shoot-outs, cup prizes | ✅ Done (2026-11-12) |
| After 27 | Away goals rule in two-legged cup ties; out-of-position OVR shown lower (display only) | ✅ Done (2026-11-12) |
| 28 | Quick simulation: 5 instant matches per day (league and cups), 2D replay with commentary, rewards ×0.7 | ✅ Done (2026-11-12) |
| 28B | Trophy room: titles won as a manager (kept when changing club), a different trophy per competition, difficulty star, career table | ✅ Done (2026-11-12) |
| 29G | Receiver always runs toward the ball, SIMULATE NEXT after a match, EP in the header, ⚙ Settings in the header, match length 3 / 6 / 9 min | ✅ Done (2026-11-13) |
| 29H | World Cup as its own tab: start one any time (2 per day), progress saved, prize for the best stage reached | ✅ Done (2026-11-13) |
| 29I | Player form (5 levels, affects play), Fitness / Form cards for the whole squad, Upgrade Boost cards (+3–5 %, up to 5 per attempt) | ✅ Done (2026-11-13) |
| 29J | Player portraits drawn in code on the cards | ✅ Done (2026-11-13) |
| 29A1 | Mobile foundation: touch detection, no zoom / scroll in a match, full-screen match layout, rotate prompt, full-screen button, iPhone Safari fixes, smaller HUD | ✅ Done (2026-11-13) |
| 29A2 | Basic touch controls: joystick + PASS / THROUGH / SHOOT / SPRINT buttons, ☰ menu | ✅ Done (2026-11-13) |
| 29A3 | Advanced touch controls: swipe variants, vibration, button size / opacity | 🔜 Next |
| 29A5 | Phone performance: automatic LOW graphics, lower resolution when FPS drops, install as an app | 🔜 Planned |
| 29A4 | Mobile UI for the management screens (bottom tab bar, step-by-step screens) | 🔜 Planned |
| 29B | Graphics quality HIGH / LOW, stadium with crowd, 3D trophy, match sounds, FPS counter, lazy-loaded 3D engine, release preparation | ✅ Done (2026-11-12) |
| 29C | Card upgrade insurance (bonus after each failure) + protection cards (no level drop), xG counts rebounds and deflections | ✅ Done (2026-11-12) |
| 29D | Play penalty shoot-outs yourself (take the kicks, dive with your keeper), camera behind the taker | ✅ Done (2026-11-12) |
| 29E | World Cup: 32 national teams, squads called up from all clubs, nationality team color | ✅ Done (2026-11-12) |
| 29F | AI and ball feel: long shots / long passes by stats, Composure attribute, receivers meet the ball, passes +12 % / shots +10 % faster, new crowd sound + crowd volume, reliable auto play (delay setting, AUTO PLAY button, second half starts by itself) | ✅ Done (2026-11-12) |
| Backlog | Individual player skills / traits | 💤 Later |
| Backlog | Card seasons and real player data (was Phase 30, moved to the backlog on 2026-11-12) | 💤 Later |

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
- **Full time:** a large scoreline with scorers and minutes, and a WIN / DRAW / LOSS badge. Buttons: NEXT MATCH (next league opponent) and LEAGUE TABLE (REPLAY (friendly) was removed on 2026-11-12: friendly replays still gave XP, so they could be used to farm XP). At the end of the season the first button becomes NEW SEASON.
- **Goal credit:** the last player to touch the ball gets the goal, or an own goal (OG) if he plays for the defending team. Goals show on the goal banner, the half-time card and the full-time card.
- **Defending controls:**
  - D: contain (the defender cannot be pushed back by the dribbler).
  - D + E: aggressive press.
  - A: teammate press.
- **Fix:** the AI ball carrier was moved twice per step, so it dribbled about twice as fast as intended.

### Step 5 — In-match HUD (FIFA Online style) ✅ (2026-11-10)

- **Shirt numbers:** each kit has a large number on the back and a small one on the chest. They are drawn on a canvas texture, so no fonts or images need to load, and the text is automatically light or dark to contrast with the shirt.
- **Names above heads:** a tag in the team colour with number and name (surname for real players, position for default names). Three modes (Phase 22: chosen in the CONTROLS panel; before that the NAMES button cycled through them):
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
   - After 10 s with no key pressed (holding a key counts as playing), the AI controls your whole team, including the selected player. (Phase 29F: 5 / 10 / 20 s in Settings, counted from the last key event, AUTO PLAY button.)
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

Everything up to and including Phase 25 is done. Roadmap agreed on 2026-11-12:

### Phase 22 — Match feel, screens and squad rules, season player stats ✅ (2026-11-12)

Plan (as agreed):


- **Kick-off pass (real football rule):**
  - Two players of the kicking team stand together in the centre circle; everyone else stays in their own half.
  - The taker must pass the ball (S / W / A only; dribbling and shooting are blocked until the ball has been passed). Opponents stay out of the centre circle until the pass.
  - The AI follows the same rule at its own kick-offs.
- **Stronger passes and shots:** passes and shots currently feel too weak. Raise the ball speed for every pass and shot type (including skill shots, set pieces and the AI's kicks), then re-check pass completion, interceptions, keeper saves and xG calibration in the simulator.
- **CONTROLS button:** replaces the NAMES button in the match HUD. It opens a panel with the full key guide (the "Arrows move/aim · E sprint · Hold S/W/A/D for power…" line is removed from the screen). Player names stay on SMART mode by default; the SMART / ALL / OFF option moves into that panel.
- **Signing feedback:** "Sign Player" shows a clear toast / popup with the player name, the fee paid and the remaining budget. Errors (window closed, not enough budget, squad full) use the same popup. Sell and contract messages use it too.
- **CLUB → TRANSFERS:** the top-bar "CLUB" screen (transfer market, squad value, contracts) is renamed **TRANSFERS**, with the transfer market as its first tab.
- **Squad rules:**

  | Group | Size | Can be sold? |
  | --- | --- | --- |
  | Starting XI | 11 | No |
  | Substitutes (match bench) | up to 9 (max 5 substitutions per match, as now) | No |
  | Reserves (new group) | the rest | Yes |
  | **Squad total** | **max 50** | |

  - New signings join the reserves.
  - Players can be moved between starters, bench and reserves in the team panel.
  - Old saves: any substitutes beyond 9 are moved to reserves automatically.
- **League screen rework:**
  - Remove the OVERVIEW tab. **LEAGUE TABLE** becomes the first tab.
  - **PLAYER STATS** tab: season stats for **every player in the league** (all 20 clubs): top scorers, assists, clean sheets (keepers), pass accuracy, average rating and appearances. Sortable by each column. Your matches use the real match stats; simulated AI fixtures also generate scorers, assists and ratings so the AI clubs' players appear too. Saved with the league and reset each new season.
  - **FIXTURES** tab: only Manchester United's 38 matches, all in one list (no round selector): round, date / order, home / away, opponent, score, result (W / D / L) and next match highlighted.
- **Tests:** kick-off is always a pass (user and AI, both halves and after goals); a starter or bench player cannot be sold; the squad blocks the 51st player; your players' season stats match the sum of their post-match stats; AI fixture stats add up to the simulated scores.

What was built:

- **Kick-off** (`rules.js → resetPositions`, `state.restart.type = 'kick-off'`): uses the Phase 20 set-piece system.
  - The taker stands behind the ball; the partner (the next most central outfield player) stands 2.6 m beside it inside the centre circle. Everybody else is pushed back into their own half; opponents also stay 9.15 m from the ball until it is played.
  - `ball.js → kickFromPlayer`: shooting is blocked at a kick-off ("KICK-OFF: PASS THE BALL · S / W / A"), the taker cannot move, and S / W / A without an arrow pass to the partner.
  - The AI (`carrierAI.js → takeRestart`) passes to the partner (80%) or another teammate.
- **Kick power** (`constants.js → KICK_POWER`, applied once in `ball.js`): short pass ×1.15 (also driven), your through balls ×1.12, your lofted passes ×1.06, shots ×1.12 (finesse ×1.1, chip unchanged), free-kick shots ×1.04, penalties ×1.08, keeper distribution / clearances ×1.04. Ground passes are capped at 31 m/s. `CONTROL_SPEED` 15 → 17 so teammates still control the faster passes.
  - The AI's through balls and crosses into space are kept almost unchanged (×1.0 / ×1.02): in the simulator a +15% AI through ball ran past the receiver and out of play (+60% throw-ins, pass completion 84% → 80%).
- **CONTROLS** (`components/ControlsPanel.jsx`): replaces the NAMES button and the hint line on the pitch. Pauses the match while open (resumes on close / Esc). Player names SMART / ALL / OFF are chosen inside.
- **TRANSFERS** (was CLUB): top bar, home card and panel renamed; tabs TRANSFER MARKET → SQUAD & SALES → CONTRACTS → OVERVIEW. Every sign / sell / contract change / error shows a toast at the top (name, fee, budget left, squad count).
- **Squad rules** (`roster.js → SQUAD_LIMITS`, `squadOf`, `squadGroupOf`, `normalizeSquad`): team objects now have `players` (11), `substitutes` (max 9) and `reserves`. Squad value, wages, condition recovery, XP and the SQUAD screen include the reserves. Only reserves can be sold ("IN MATCHDAY SQUAD" otherwise). New signings and the 51st-player check use the whole squad.
  - Pre-match lineup board (EDIT LINEUP): a RESERVES area. Drag (or click, then click) between pitch, bench and reserves; drop on the BENCH / RESERVES title to move without swapping. Goalkeepers can only swap with goalkeepers.
- **League screen** (`LeagueManagementPanel.jsx`, `services/seasonStats.js`):
  - OVERVIEW removed. LEAGUE TABLE first, with a summary bar (position, points, played, season %) and PLAY ROUND n / START NEW SEASON.
  - PLAYER STATS: all 20 clubs (or MUN only), sorted by goals, assists, clean sheets (goalkeepers), pass %, average rating or appearances; top 50. Pass % and rating need at least 30% of your rounds played as appearances.
  - Your matches store the real engine stats of both teams in `league.userMatchStats[fixtureId]` at full time. Simulated AI fixtures generate scorers, assists, passes and ratings deterministically from the fixture id and score, so they always add up to the result and need no storage. A new season starts with empty stats.
  - MUN FIXTURES: all 38 of your matches in one list (round, H / A, opponent, score, W / D / L, PLAY on the next match).
- **Test results (2026-11-12):**
  - Headless simulator, AI v AI, 48 matches × 6 min, per team per match (before → after): goals 1.55 → 1.65, shots 6.5 → 5.9, on target 3.2 → 3.1, xG 1.43 → 1.37, passes 98 → 99, pass completion 84% → 84%.
  - Kick-offs: 254 / 254 were passes (0 shots, 0 stuck), 51% to the partner, taken about 1.2 s after the whistle.
  - Season stats test (10 rounds): goals in player stats = goals in fixtures (237 = 237), clean sheets = fixtures with 0 conceded (49 = 49), players from all 20 clubs, same result when rebuilt; old saves with 14 substitutes → 9 on the bench + 5 in the reserves.
  - Browser smoke test (Chromium): sign → success toast "Fee … · budget left … · joined the reserves (19/50)"; not enough budget → error toast; 2 sellable reserves, 18 locked players; CONTROLS panel opens / closes with Esc; D at the kick-off is refused, S passes; forfeit fills PLAYER STATS from the simulated round; no console errors.
- **Known limits:** your league matches played before Phase 22 and forfeited matches have no player stats (the AI fixtures of those rounds still count). AI clubs never substitute, so only their starters appear in your matches.

### Phase 23 — Club level, rewards, player catalog, packs and EP cards ✅ (2026-11-12)

Plan (as agreed):


- **Club level and XP:** the club earns XP after every match (win > draw > loss, bonus for a clean sheet and a big win). The XP needed per level grows level by level. The post-match screen shows XP gained, the level bar and a LEVEL UP message.
- **Match prize money:** paid after every match into the club budget (EP), based on result, goal difference and opponent strength. End-of-season bonus by league position.
- **Player catalog** (`src/data/playerCatalog.js`): **500 default players created by the project itself** (fictional names, no real-world data). Each has a `playerId`, name, nationality, age, position, the six main stats, rarity (Bronze / Silver / Gold) and value. The current transfer market players move into this catalog, and the transfer market draws from it. Real data (backlog, formerly Phase 30) would use the same structure.
- **Two ids per player:** `playerId` = the person; `cardId` = one card the club owns. Several cards can share a `playerId` (duplicates now, card seasons later — backlog).
- **No duplicates in the matchday squad:** the 20 starters and substitutes can never contain two cards with the same `playerId`. Duplicate cards stay in the reserves.
- **Cards tab (new):** an inventory of unopened rewards. Everything is opened whenever the player wants:
  - **Player packs:** opening one gives a random player from the catalog (by pack rarity). Cards from packs are **+1** for now. The new card goes to the reserves.
  - **EP cards:** opening one adds EP to the budget.
  - If the squad already has 50 players, opening a player pack is blocked with a message: "Squad is full (50/50). Sell players to open more packs." Nothing is converted to money automatically.
- **Level-up rewards:**

  | Level reached | Reward |
  | --- | --- |
  | Every level up (1, 2, 3, 4, 6, 7…) | EP card 5,000,000 EP + player pack |
  | Multiples of 5 (5, 10, 15, 20…) | EP card 10,000,000 EP + better player pack |

  - EP is the club's money (the current transfer budget is shown as EP).
- **Saves:** club level, XP, card inventory and owned cards are stored in LocalStorage with the club save.

What was built:

- **Club state** moved up to `GameScene` (one copy for TRANSFERS, CARDS and the post-match rewards), saved as before in `ultimate-football-club-save` with new fields `level`, `xp`, `inventory`, `seasonBonusPaid`. Money is shown as **EP** everywhere (`formatMoney`).
- **Club XP** (`services/clubProgress.js`): win 60, draw 35, loss 20, clean sheet +10, win by 3+ goals +15. Level 0 → 1 needs 50 XP, then +25 per level (75, 100, 125…). Only league matches count (forfeits and the pause-menu RESTART give nothing).
- **Prize money** after each league match, straight into the budget: win 3,000,000 EP (+300,000 per goal of margin, max 4), draw 1,500,000, loss 600,000, clean sheet +250,000; × 0.8–1.4 by opponent strength (+3% per point above 79).
- **Level rewards** go into the CARDS inventory: every level a 5,000,000 EP card + Player Pack; levels 5, 10, 15… a 10,000,000 EP card + Premium Player Pack. Several levels at once give all rewards.
- **Season bonus** (EP card, once per season, after your last league match): champion 30,000,000 · 2nd–4th 15,000,000 · 5th–10th 8,000,000 · 11th–17th 4,000,000 · 18th–20th 2,000,000. Second divisions pay half (since 2026-11-12, after Phase 28B), then × difficulty.
- **Player catalog** (`data/playerCatalog.js`, generated with a fixed seed): the 20 old market players (ids `market-001…020` kept) + 480 new fictional players `p0001…p0480`, 20 nationalities. Gold 125 (OVR 75–90), Silver 175 (65–74), Bronze 200 (50–64). Value in EP ≈ 1,000,000 × 1.152^(OVR−60) × age factor; weekly wage = 0.3% of value. `transferMarket.js` now just re-exports the catalog.
- **Cards** (`services/cards.js`): every owned player has `id` = `cardId` (unique), `playerId`, `upgrade` (+1) and `rarity`. Old saves get these fields automatically (old id kept as both). Buying on the market or opening a pack creates a new card with its own `cardId`.
  - The market hides players you already own (by `playerId`) and shows 48 at a time (SHOW MORE), with a rarity filter; OVR badges use the rarity colour.
  - **No duplicate player in the matchday squad:** the lineup board refuses to move a card into the XI / bench when another card of the same `playerId` is already there.
- **CARDS tab** (`components/screens/CardsScreen.jsx`, top bar with a badge for unopened items, club level next to the season): club level ring, XP bar, next reward, budget and squad size; unopened items with OPEN (and OPEN ALL EP CARDS); a reveal card (rarity colours, OVR, position, six stats, +1). Packs: Player Pack 60% Bronze / 35% Silver / 5% Gold, Premium 70% Gold / 30% Silver. The new card joins the reserves with a 3-year contract; a duplicate is flagged and kept. With 50/50 players a pack cannot be opened ("Squad is full… sell players") and nothing is converted to EP.
- **Post-match CLUB REWARDS card:** XP gained, prize money, budget, level bar, LEVEL UP lines and the season bonus, with a link to CARDS.
- **Fix: shots rebound off defenders** (`ball.js → updateShotBlock`). Before, a shot that reached an opponent was slowed by 52% per physics step, so after 2–3 steps (≈0.05 s) the defender controlled it — the ball "stuck" to him. Now a shot (or any ball faster than 24 m/s) that reaches an outfield opponent (within 0.85 m, below 1.95 m) bounces off: reflected from the body, keeps 25–50% of its speed, ±25° random, a small pop up. The blocker cannot touch it again for 0.45 s, so it becomes a loose ball for both teams. Counts as a new touch (keeper plans and curl are cancelled; corners / throw-ins go to the right team). Goalkeepers keep their own save logic. New stat: `blocks`.
- **Test results (2026-11-12):**
  - Unit tests: catalog has 500 unique `playerId`s; 3–0 win from level 0 = 85 XP → level 1 (35/75) with a 5,000,000 EP card + Player Pack and 4,150,000 EP prize; level 5 gives 10,000,000 EP + Premium; three levels at once give six items; season bonus is paid once; 20,000 packs: Player Pack 60.5 / 34.8 / 4.7%, Premium 0 / 29.9 / 70.1%; old players get card fields; duplicates are blocked from the matchday squad unless they replace the same player.
  - Simulator, 48 AI v AI matches × 6 min, per team: 1.7 shots blocked per match (≈28% of shots), pass completion 84%, kick-offs still 100% passes. Goals rose from ≈1.65 to ≈1.9–2.0 per team (rebounds create second chances) while xG stayed ≈1.4, so xG now under-counts rebound goals.
  - Browser test (Chromium, short test match): 1–0 win → CLUB REWARDS "+70 XP · +3,230,000 EP · LEVEL UP! LEVEL 1"; CARDS badge 2; Player Pack → Bronze CM "Jack Dawson" +1 to the reserves (19/50); EP card → budget +5,000,000 EP; with 50/50 players the pack shows SQUAD FULL and the warning; market shows 48 of 499 with SHOW MORE; no console errors.
- **Known limits:** AI clubs do not have levels or cards. Duplicates cannot be used yet (upgrades come in Phase 25). If goals feel too frequent after the rebound fix, tune `SHOT_BLOCK.keep` / `jitter` in `ball.js` (and re-calibrate xG).

### Phase 24 — Club kits and accuracy by stats ✅ (2026-11-12)

Plan (as agreed):


- **Three fixed kits per club:** home, away and third (shirt, shorts, socks), defined once per club in the data (no kit editor). Each club also has two goalkeeper kits.
  - The third kit is for clashes and, later, cup / continental matches against clubs from other leagues.
- **Kit choice before every match:** the pre-match screen shows both teams' kits. The game picks a default that does not clash (home team in its home kit, away team in its away kit, otherwise third or home), and you can change the kit of **both** your team and the AI team. Kits whose shirt colour is too close to the other team's shirt are marked as a clash and cannot be picked. Goalkeepers automatically wear a kit that differs from both teams.
  - The chosen colours are used for the 3D players, name tags, mini map and team colours during the match.
- **Accuracy by stats (good players stay precise, weak players are clearly worse):**
  - Shots: low Finishing / Long shots → much wider spread (target: stat 50 ≈ 1.5 m from the aim point, often wide; stat 90 ≈ 0.15 m). Long shots beyond 22 m lose more accuracy for weak shooters. Weak finishers also sky more shots; high Finishing / Shot power reduce the over-the-bar risk at full power.
  - Passes, through balls, crosses: low Short / Long passing (and Vision for through balls) → bigger direction and power errors (target at 20 m: stat 50 ≈ 1 m off and ±12% power; stat 90 ≈ 0.15–0.2 m and ±3%).
  - Same formulas for the AI. All factors in one config table (`constants.js → ACCURACY`).
- **Tests:** accuracy test (400 shots / passes per stat level 50 / 70 / 90) before and after; AI v AI simulator keeps pass completion and goals in a sensible range; no kit clash in any of the 380 fixtures with the default choice.

What was built:

- **Kits** (`data/kits.js`): `CLUB_KITS` for all 20 clubs — home, away and third (shirt, shorts, socks, trim) + two goalkeeper kits each, from a shared keeper palette. No editor; colours are fixed in the file.
  - **Clash rule:** two shirts clash when their colour distance (redmean, ≈ how different they look) is below 165 (e.g. MUN red vs Arsenal red = 88 → clash; red vs claret = 163 → clash; red vs orange ≈ 175 → OK). A club's own three kits never clash with each other.
  - **Default choice** (`resolveMatchKits`): home team in its home kit; away team in its away kit, otherwise third, otherwise home. Goalkeepers get the first keeper kit that differs from both outfield kits and the other keeper.
  - **Pre-match KITS picker** for both teams (shirt + shorts icons). Kits that clash with the other team's current kit show CLASH and cannot be chosen. The choice is kept for that fixture and used for the 3D players (shirt, shorts, socks, trim, keeper gloves), mini map dots (keepers in their own colour) and team colours in the match.
- **Accuracy by stats** (`constants.js → ACCURACY`, used in `ball.js`): `miss` = 1 − accuracy (≈0.83 at stat 50, 0.15 at 90); errors grow with a power curve so good players barely change and weak ones get much worse.
  - Your shots: spread ±(0.15 + 3.6 × miss^1.6) m; beyond 22 m +(0.02 + 0.12 × miss) m per metre; over 80% power the extra spread is scaled by (0.4 + 0.9 × miss); over 90% power the over-the-bar risk is scaled by (0.3 + 1 − (Finishing + Shot power skill)); weak finishers also get up to 2.2 × miss^1.5 m/s extra lift.
  - AI shots: triangular spread ±(2.2 + 5.5 × miss^1.3) m around the goal centre; AI finesse / trivela corner error ±(0.3 + 2.2 × miss^1.3) m; same extra lift.
  - Passes / through balls / crosses (and keeper distribution): direction error ±(0.012 + 0.19 × sloppiness^1.5) rad, power error ±(0.015 + 0.13 × sloppiness^1.3).
- **Test results (2026-11-12):**
  - Accuracy test, 400 kicks each, no defenders. Your shot from 16 m (70% power, aiming 2.2 m from the centre), average distance from the aim point and on target: stat 50 **1.41 m, 77%** (before 0.68 m, 100%) · 70 0.66 m, 100% · 90 **0.16 m, 100%** (before 0.12 m). From 25 m: 50 → 1.58 m, 75%; 90 → 0.22 m, 100%. Full power (97%) from 20 m: 50 → 63% on target, 10% over the bar (before 85%, 0%); 90 → 100%.
  - AI shots from 16 m: stat 50 2.18 m from the centre, 80% on target (before 1.41 m, 98%); 90 0.85 m, 100%.
  - Passes at 20 m, average sideways miss: stat 50 **1.05 m** (before 0.64 m), 70 0.56 m, 90 **0.16 m** (before 0.20 m); crosses at 30 m: 50 → 1.70 m, 90 → 0.23 m.
  - AI v AI simulator (48 matches, both teams ≈ 80 rated): pass completion 84%, goals 1.97, shots 5.9 per team — unchanged, because good players keep their accuracy. Weaker league clubs (strength 72–76) now miss more.
  - Kits: 380 fixtures with the default choice → 0 outfield clashes, 0 keeper clashes (away team wears away 325×, third 55×). Browser: MUN home vs Crystal Palace → MUN away (white) locked as CLASH with Palace's white away kit; MUN third (black) + Palace home (blue) → Palace third (black) locked; the match shows the chosen colours and the keepers in green / pink on the mini map; no console errors.

### Phase 25 — Player card upgrades, level 100, stats above 99 ✅ (2026-11-12)

Plan (agreed on 2026-11-12):

- **Card upgrade level +1 → +10.** The card keeps its look; only the **+N badge** changes colour (like FC Online):

  | Badge | +1 | +2 → +4 | +5 → +7 | +8, +9 | +10 |
  | --- | --- | --- | --- | --- | --- |
  | Colour | Grey | Bronze | Silver | Gold | Diamond |

- **Upgrade bonus — added to every stat of the player** (main and detailed stats; OVR follows):

  | Level | +1 | +2 | +3 | +4 | +5 | +6 | +7 | +8 | +9 | +10 |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Every stat | +0 | +2 | +3 | +5 | +7 | +8 | +11 | +14 | +18 | +24 |

- **How to upgrade:**
  - Main card (any group: XI, bench or reserves) + **one material card of the same player** (`playerId`) from the reserves.
  - Success = base rate of the target level × material factor (the material's own + level matters):

    | Material vs main | 1+ higher | same | 1 lower | 2 lower | 3+ lower |
    | --- | --- | --- | --- | --- | --- |
    | Factor | ×1.25 | ×1 | ×0.7 | ×0.5 | ×0.35 |

    Base rates (tunable): +2 100% · +3 80% · +4 65% · +5 50% · +6 35% · +7 25% · +8 15% · +9 8% · +10 5%.
  - **Up to 5 extra cards** (any player from the reserves) add success: each up to +2% depending on its OVR (including its + bonus) compared with the main card; **all extras together +10% at most**. Total success never above 100%.
  - The material and the extra cards are used up whether the upgrade succeeds or fails.
  - **No EP cost.**
  - **Failure:** below +5 the card keeps its level; from +5 up it drops **exactly one level**.
  - The upgrade screen shows **only the total success %** (not the breakdown), the main card, OVR before → after, and the material / extra slots.
- **Upgrade animation (FC Online style)** — the result is decided when the button is pressed; the animation only builds tension:
  1. Gather (~0.6 s): screen dims, the material and extra cards fly into the main card, each with a small spark.
  2. Heartbeat (~2–3 s): the card pulses with a light ring, beats getting faster ("thump… thump… thump-thump-thump"), an energy ring fills around it. Higher targets = more beats (+2/+3 ≈ 3 beats, +8 → +10 ≈ 5–6 beats with a small screen shake on the last beat).
  3. Success: white flash, light rays in the colour of the new + badge, the badge pops to +N+1, stats count up to the new values (numbers change colour at 99 / 100 / 120), OVR "82 → 87"; confetti from +8, diamond sparkle at +10.
     Failure: the glow dies, the card shakes, a red flash and "FAILED"; from +5 the badge cracks and drops to +N−1 while the stats count down.
  4. Buttons UPGRADE AGAIN (keeps the main card) and DONE. Click / Space skips to the result. Reduced-motion: short fade only, no shake or flashing.
  - Sound: generated in the browser (no audio files): heartbeat thumps, a success burst, a failure tone, with a mute toggle.
- **Transfer market: buy the same player as many times as you like** (as long as you have EP and squad space); cards you already own show "Owned ×N". The matchday rule (no two cards of the same player in the 20) still applies.
- **Card value grows with the + level** (sale value ×): +1 ×1 · +2 ×1.2 · +3 ×1.4 · +4 ×1.8 · +5 ×2.5 · +6 ×3.2 · +7 ×4.5 · +8 ×7 · +9 ×11 · +10 ×20.
- **Player level max 100** (was 30). XP needed per level = 170 + level (a regular starter ≈ level 19 after one season, level 100 after ≈ 6 seasons). Attribute points: 3 per level up to level 30, then 1 per level.
- **Training is still limited by potential** (the OVR from training points cannot pass the potential); the + bonus is on top and not limited.
- **No 99 cap on stats any more.** Above 99 a stat keeps improving with diminishing returns (each point is worth less and less, effective value up to ≈ 128), in every formula: shot / pass accuracy, shot power, speed, acceleration, ball control, tackles, keeper reflexes and reach. Physical limits stay sensible (top speed ≈ 10.5 m/s, shots ≈ 40 m/s, keeper reaction ≥ 0.08 s). Checked with the accuracy test at 99 / 110 / 120 / 130.
- **Stat number colours** (card, player profile, SQUAD screen, market, upgrade screen):

  | Value | 1–98 | 99 | 100–120 | > 120 |
  | --- | --- | --- | --- | --- |
  | Colour | as now | Orange | Purple | Gold |

What was built:

- **`services/upgrade.js`:** `UPGRADE_BONUS`, `BASE_RATES`, `materialFactor`, `extraBonus` (each extra = 2% × (extra OVR / main OVR)^3.2, total ≤ 10%), `successRate`, `rollUpgrade`, `levelAfterFailure`, `applyUpgradeLevel` (adds / removes the bonus difference on the six main stats, their training bases, OVR and any trained detailed attributes — no 99 cap, fully reversible), `upgradeValueFactor`, `upgradeTier` (badge colour) and `statTier` (number colour).
- **CARDS → UPGRADE CARDS** (`UpgradePanel.jsx`): list of all cards (filter "Has a duplicate", shows XI / BENCH / RES and how many duplicates), main card with + badges "+N → +N+1", OVR before → after and the **total success %** only; material slot (same player, reserves; the default pick is the lowest-level duplicate that still gives the full rate) and up to 5 extra cards. Material and extras are removed from the squad and their contracts.
- **Animation** (`UpgradeAnimation.jsx` + CSS): gather (cards fly in) → heartbeat beats (3 / 4 / 5 / 6 beats by target level, each 16% faster, energy ring in the target tier colour, shake on the last beat from +8) → success (white flash, rotating light rays in the new tier colour, badge pop, stats count up with +N, confetti from +8, sparkle at +10) or failure (red flash, card shake, badge crack and drop from +5, stats count down). UPGRADE AGAIN (when another duplicate is left) and DONE. Click / Space skips. Reduced motion: almost no movement.
- **Sound** (`utils/sound.js`): Web Audio only — "lub-dub" heartbeat getting louder, a rising chord + thump on success, a falling tone on failure; SOUND ON / OFF button (remembered in the browser).
- **Badges and numbers** (`CardBits.jsx`): `UpgradeBadge` (grey / bronze / silver / gold / diamond), `StatNum` / `statClass` (99 orange, 100–120 purple, > 120 gold) on cards, the in-match player profile, the SQUAD screen and the TRANSFERS squad list.
- **Market:** the same player can be bought again and again (EP and squad space permitting) with an "OWNED ×N" chip; `getPlayerValue` multiplies by the + level factor.
- **Progression:** `MAX_LEVEL` 100, `xpToNext = 170 + level`, `pointsForLevel` (3 up to level 30, then 1); no 99 cap on training; the potential check ignores the + bonus.
- **Stats above 99:** `attributes.js → effectiveStat` (99 + 29.5 × (1 − e^(−(v − 99)/25)): 110 → 109.5, 120 → 115.8, 130 → 120, max ≈ 128.5) is used by `attr()` everywhere in the engine; `skill01` now goes up to 1.5; accuracy curves shrink below their minimum for skills above 99; keeper reaction can reach 0.08 s; top speed capped at 10.5 m/s and shots at 40 m/s.
- **Test results (2026-11-12):**
  - Unit tests: bonus table 2 / 3 / 5 / 7 / 8 / 11 / 14 / 18 / 24; +2 & +2 → +3 = 80%, +2 & +1 = 56%, +5 & +6 = 43.75%; five strong extras turn +9 → +10 from 5% into 15%; an extra of 70 OVR for an 80 OVR main card = +1.30%; 20,000 rolls at 56% → 55.9%; +10 adds 24 to every stat (86 → 110) and +10 → +1 restores the card exactly; value +5 ×2.5, +10 ×20; one season of a regular starter → level 20, level 100 after ≈ 6.4 seasons with 157 points; training still works on a +10 card above its potential; finishing can be trained 99 → 100.
  - Above 99 (400–600 kicks each): your shot from 16 m misses the aim by 0.07 m at 99 → 0.05 m at 120–130; full-power shot from 25 m 0.27 m → 0.15 m and 39.9 → 40 m/s; AI shot 0.75 m → 0.47 m; pass 0.08 m → 0.05 m; top speed 9.12 → 9.70 m/s, acceleration 20.0 → 22.5 m/s² (sprint / acceleration 99 → 130).
  - AI v AI simulator (48 matches): goals 1.83, pass completion 84% — unchanged.
  - Browser: bought the same player 4× ("OWNED ×4"); +1 → +2 at 100% (OVR 54 → 56, every stat +2, bronze badge); two +2 attempts with a +1 material (56%) failed and kept +2; UPGRADE AGAIN / Space skip / DONE work; no console errors.


### Phase 25B — Stronger effect above 99, original squad in the market ✅ (2026-11-12)

Agreed after Phase 25 (the first version made stats above 99 change too little: 99 → 130 gave only 0.07 → 0.05 m shot error and 9.1 → 9.7 m/s).

- **Softer diminishing returns:** `effectiveStat` = 99 + 45 × (1 − e^(−(v − 99)/40)) → 110 ≈ 109.8, 120 ≈ 117.4, 130 ≈ 123.3 (was 120). `skill01` up to 1.6.
- **Extra rewards above 99** (`constants.js → OVER_99`, `attributes.js → over99`: 110 → 0.44, 120 → 0.75, 130 → 1.0) and stronger error shrinking (`aboveNinetyNine`: errors × 0.74 / 0.55 / 0.40 at 110 / 120 / 130).
- **Measured (99 → 110 → 120 → 130):**

  | | 99 | 110 | 120 | 130 |
  | --- | --- | --- | --- | --- |
  | Top speed (Sprint speed) | 9.12 | 9.69 | 10.08 | 10.39 m/s |
  | Acceleration | 20.0 | 22.7 | 24.5 | 26.0 m/s² |
  | Your full-power shot from 25 m: speed | 39.9 | 42.9 | 45.0 | 46.0 m/s (cap) |
  | Your full-power shot from 25 m: miss from aim | 0.28 | 0.12 | 0.08 | 0.05 m |
  | AI shot from 16 m: miss | 0.72 | 0.53 | 0.40 | 0.30 m |
  | Pass at 20 m: miss / pass speed | 0.09 m / +0% | 0.06 / +7% | 0.04 / +11% | 0.03 m / +15% |
  | Clean first touch up to (Ball control) | 21.0 | 25.0 | 27.8 | 30.0 m/s |
  | Keeper reaction (Reflexes) | 0.100 | 0.078 | 0.062 | 0.050 s |
  | Keeper extra reach (Diving) vs 70 | +0.73 | +1.13 | +1.41 | +1.63 m |

  Keeper save caps also rise up to +7% at 130. Tackles already scale with the stat difference (≈ +6 / +11 / +15% vs a 99 tackler). Chips, free-kick and penalty shots do not get the extra shot speed. AI v AI simulator unchanged (no AI player above 99).
- **Original Manchester United players in the transfer market** (`data/transferMarket.js`): every starter and substitute from `data/teams.js` with the same id as `playerId` (e.g. `blue-9`), priced by OVR like the catalog, so copies can be bought and the original squad can be upgraded. Packs still draw only from the 500-player catalog.
- **Upgrade screen:** the "Has a duplicate" filter stays on by default. When no card has a duplicate there is a **GO TO TRANSFER MARKET →** button; when the chosen card has no duplicate there is a **BUY A COPY ON THE MARKET →** button that opens TRANSFERS with the player's name already in the search box.
- **Fix (2026-11-12):** after buying a copy from the upgrade screen, the material was not picked automatically, so UPGRADE did nothing. The screen now re-picks the material whenever a duplicate appears (or the picked one is used up). Disabled buttons (e.g. UPGRADE without a material) are grey with a not-allowed cursor everywhere (`.btn:disabled`).
  - Browser test: Huy Le without a duplicate → UPGRADE grey and disabled, success "–"; buy a copy → back on the screen the copy is selected automatically, success 100%, UPGRADE enabled → animation → SUCCESS +1 → +2.
- **Browser test:** Huy Le (ST, no duplicate) → BUY A COPY ON THE MARKET → TRANSFERS searched "Huy Le" (1 result, OWNED ×1) → signed for 34,400,000 EP → back in UPGRADE CARDS Huy Le shows "1 dup"; no console errors.

### Phase 26 — World of football and club selection (26A, 26B ✅ 2026-11-12)

Agreed on 2026-11-12.

#### Phase 26A — 18 countries, 36 leagues, 720 clubs ✅ (2026-11-12)

- **Countries and divisions:** the 18 countries of the top-league list below, each with its **top league + one second division**, **20 clubs per league** (38 rounds, one table — no conferences, no play-offs). England's second division is the EFL Championship and Italy's is Serie B.

  | # | Top league | Country |
  | --- | --- | --- |
  | 1 | Premier League | England |
  | 2 | Serie A | Italy |
  | 3 | La Liga | Spain |
  | 4 | Bundesliga | Germany |
  | 5 | Ligue 1 | France |
  | 6 | Belgian Pro League | Belgium |
  | 7 | Primeira Liga | Portugal |
  | 8 | Campeonato Brasileiro Série A | Brazil |
  | 9 | Eredivisie | Netherlands |
  | 10 | Liga Profesional de Fútbol | Argentina |
  | 11 | Major League Soccer | USA / Canada |
  | 12 | Liga MX | Mexico |
  | 13 | J1 League | Japan |
  | 14 | HNL | Croatia |
  | 15 | Ekstraklasa | Poland |
  | 16 | Superligaen | Denmark |
  | 17 | Allsvenskan | Sweden |
  | 18 | Süper Lig | Turkey |

  Where a real league has more or fewer than 20 clubs (or groups), 20 representative clubs are used.
- **Real club names** (looked up), each club with a strength (stronger leagues follow the order above; second divisions weaker; big clubs stronger), **three fixed kits** in the club's real colours + two keeper kits, and an **original crest** drawn automatically (shield in the kit colours + short name; no real logos).
- **Players (~15,800):** about 22 per club, generated from a fixed seed (not stored). **3–5 well-known players per club in the 18 top leagues use their real names** (ratings are estimates, not EA ratings; squads as looked up, may be outdated); everybody else has a fictional name from the club's country.
- **Transfer market = every player of every club** (FC Online-style card market): buying a card of an AI club's player gives you a copy, the player stays at his club, so copies can be bought for upgrades. Filters by **country, league and club** (+ position, rarity, price, search). Player packs draw from all players.
- **Your league is stored in full** (fixtures, results, table, player stats). **The other 35 leagues are "virtual":** a random seed is drawn at the start of each season and every result of those leagues is computed from it when needed (random, different every season, always the same within a season, max 5 goals per team, home and strength advantage). Nothing of them is stored; the LEAGUE screen can show the table / fixtures of any country and division at the current round.
- **End of season:** final tables of all 36 leagues are computed; **bottom 3 of each top league are relegated, top 3 of each second division are promoted**; the clubs qualified for next season's C1 / C2 (e.g. top 4 of each top league) are stored for Phase 27. Stored: division membership + a short season history.
- **Storage:** ≈ 150–250 KB in total (club membership ≈ 10 KB, your league ≈ 25 KB, your match stats ≈ 60–160 KB, squad ≈ 50 KB, club ≈ 10 KB, history ≈ 1 KB per season; players and virtual leagues 0 KB) — about 3–5% of the 5 MB LocalStorage limit.
- **Switching to the new world (option A):** a new season starts with the real Premier League as soon as the update is loaded. **Everything of yours is kept** — the Manchester United squad and all cards (Huy Le, Salvatierra, bought and upgraded cards), EP, club level and card inventory; only the results of the season in progress are dropped. AI opponents in 3D matches use the real club's name, kits and squad.

**Done (2026-11-12) — how it was built:**

- **Club data source:** web search was not available while building, so the 720 clubs, colours and stars come from the assistant's own knowledge up to the 2025-26 season (`src/data/worldClubs.js`, one line per club: `Name|SHORT|#primary|#secondary|Star:POS:OVR;…`, strongest first). Promotions / relegations and transfers of summer 2026 may be missing; leagues that really have fewer than 20 clubs (e.g. HNL) are filled with clubs from the division below. Lines ending in `?` are clubs I am not sure about (currently: Royal Francs Borains B, SC Cambuur Reserves, Achilles '29, NK Trnje). Edit the file to fix any club: ids are derived from the name (`eng-arsenal`), Manchester United is always `blue`.
- **Strength:** top league 86 − (rank − 1) × 0.75 for the strongest club down to 72 − (rank − 1) × 0.6, second division from that minimum + 2 down 8 more, interpolated by the club's place in the list (+ a small fixed jitter). Example: Premier League 86–72, Championship 74–64, Süper Lig 2nd division 63–54.
- **Squads:** 22 players per club (11 starters in the engine's 4-3-3 slots, 9 bench, 2 reserves), ids `clubId-p01…p22`, shirt numbers unique. 351 real-name stars (3–5 per club in the 18 top leagues, ratings are my estimates, not EA ratings); other players get fictional names from the club country's name pool (70% local, 30% foreign) — any match with a real person is accidental.
- **Kits:** Premier League clubs that had hand-made kits keep them; every other club gets home (primary), away (secondary or white / black), third (a fallback colour that clashes with neither) and two keeper kits from its colours. If every away kit clashes, the home team switches kits. Checked: 0 clashes over all 13,680 league pairings.
- **Crests:** `ClubCrest.jsx` draws a shield in the two club colours with one of five patterns (fixed per club) and the short name — no real logos. Shown on the league table, results and fixtures.
- **Virtual leagues:** there is no stored seed — every result is seeded by season + league + fixture id, so each season is different and a season always replays the same. Goals use the existing score model (home advantage + strength difference, max 4 per team). Other leagues are shown "after round N" where N = your rounds played.
- **End of season (START NEW SEASON):** final tables of all 36 leagues → bottom 3 / top 3 swap per country, champions, top 6 of every top league (for C1 / C2 in Phase 27) and your final position go into the world save history (last 30 seasons). If United go down you play the next season in the Championship; the message after starting the season says promoted / relegated.
- **Transfer market:** 16,341 players (18 original United cards, ~15,800 world players, 500 catalog players as FREE AGENTS). New filters: country → league (current divisions) → club; search also matches the club name; cards show the player's club. Packs draw from the world players + free agents.
- **3D matches:** the opponent is the real club with its squad (e.g. Liverpool: Alisson, Van Dijk, Wirtz, Isak, Salah…), name and kits.
- **Old saves:** a league save from before Phase 26 is converted on first load: a new season in the real Premier League (next season number if a match had been played, so the season prize is not blocked). Squad, cards, EP, club level and inventory are untouched; a message "NEW WORLD · SEASON … · PREMIER LEAGUE" is shown once.
- **Not done in 26A (by design):** season player stats only for your own league; second-division season prize money was the same as top league (changed to half on 2026-11-12, after Phase 28B).

#### Phase 26B — Choose and change club ✅ (2026-11-12)

- **Where:** a CHOOSE YOUR CLUB screen on the very first start (no saves yet), at **START NEW SEASON** (keep the club or pick another before the season starts), and **Settings → CHANGE CLUB** on the home screen. The picker (`src/components/ClubPicker.jsx`) browses country → division (current divisions after promotion / relegation) or searches by name, and shows the crest, league, strength and the three kits.
- **Changing club only changes the team:** name, kits, crest and league. Cards, squad, EP, club level, inventory, difficulty choice stay exactly the same. Team color still follows the cards' clubs (11 original United players keep United club color even at another club).
- **When:**
  - First start / before your first match of the season: switch straight away, the season starts in the new club's league.
  - At the end of the season: the season is closed with the old club first (promotion / relegation, prizes, history with the club that played it), then the new season starts in the new club's league.
  - In the middle of a season: the picker warns (red box) and the button says **CHANGE CLUB & RESTART SEASON** — the results of the current season are dropped and the same season starts again from round 1 in the new club's league (the other leagues are not affected).
- **The former club becomes an AI club** with its own generated squad (for United: Bruno Fernandes, Mbeumo, Lisandro Martínez, Cunha, Šeško + fictional players) and plays on in its league.
- **Saves:** clubs use their real ids everywhere (Manchester United = `eng-manchester-united`); the world save stores `userClubId`. Old saves that used `blue` as United's id (league fixtures, tables, season player stats, world divisions, history, bought United cards `blue-p01…`) are converted on first load — season progress is kept, nothing is reset. The engine still names the two sides of the pitch `blue` (you) and `red` (opponent): renaming those internal side ids would touch every engine file without changing anything for the player, so only the club identity was separated from them.
- **Crests** (generated, `ClubCrest.jsx`) on the home screen (next match, mini table, settings), pre-match title, in-match scoreboard, half-time / full-time / post-match scorelines, league tables, results and fixtures.

#### Quick updates after 26B ✅ (2026-11-12)

- **Season difficulty picker** shows only the level names (Easy / Normal / Hard / Very hard / Legendary); the card levels and reward multipliers are no longer printed on the buttons or in the pre-match header (they still apply, see Phase 26C; the post-match reward card still shows the multiplier).
- **11 formations** (was 3): 4-3-3, 4-4-2, 4-2-3-1 + **4-1-4-1, 4-1-2-1-2 (diamond), 4-3-2-1 (Christmas tree), 4-4-1-1, 4-2-2-2, 3-5-2, 3-4-3, 5-3-2** (`FORMATIONS` / `FORMATION_INFO` in `src/data/teams.js`). The engine works from roles and coordinates, so the new shapes need no engine change.
- **New formation picker** (`src/components/FormationPicker.jsx`): a grid of tiles, each with a mini pitch showing the 11 positions (keeper yellow, defenders blue, midfielders green, forwards red) and the formation's name; used on the pre-match screen (4 per row, the pre-match middle column is a bit wider) and, smaller, at half-time.
- **Smarter switching between formations** (`assignFormation` in `src/systems/roster.js`): players used to take the new slots by list order, so going from four to three at the back could push a full-back into midfield. Now every player keeps a **natural position** (`naturalPosition`, the card's own position, kept when he is moved elsewhere by a formation, substitution or swap) and the whole XI is assigned at once with the lowest total "out of position" cost (Hungarian algorithm): same line first, then the closest side / height. Example from the default United XI: 4-3-3 → 3-5-2 puts Herrera (LB) at LWB, Montenegro (RW) at RWB, the CBs + Mendoza in a back three; going back to 4-3-3 restores the original XI exactly.

### Phase 26C — Height / weight and season difficulty ✅ (2026-11-12)

Agreed on 2026-11-12 (done before 26B). No birth year / age changes: age stays as it is and is not used.

**Height and weight**

- Every player has `height` (cm) and `weight` (kg). The 351 real-name stars use approximate real values (`src/data/starPhysique.js`, my estimates, may be a few cm / kg off); everybody else is generated once from `playerId` + position (bell curve; averages GK 191, CB 187, CDM 182, ST 183, CM 179, full-backs 178, CAM 176, wingers 175 cm; weight from a footballer BMI 21.3–24.1, a bit heavier for GK / CB). Every copy of the same player has the same numbers; old saved cards (Huy Le…) get theirs on load, nothing to migrate by hand.
- **Small effects** (`src/systems/physique.js`), main stats still decide most:
  - Detailed attributes (per 10 cm above / below 181 cm, keepers 189 cm, and per 6 kg above / below the normal weight for the height): strength +2 / +3, balance −1.5 / +1, agility −2.5 / −1.5, acceleration −1.5 / −1.5, sprint speed +0.5 / −1, stamina 0 / −1; keepers: diving +2.5, reflexes −2, handling +1 per 10 cm. Example: Haaland strength +3, agility −4; Messi balance +3; Courtois diving +3, reflexes −2.
  - High balls: the highest ball a player can control goes from 1.55 m to ≈1.45–1.67 m by height, and in a contested high ball (above hip height) taller / heavier players get up to ≈0.2 m of advantage.
  - Keepers: dive reach ±0.12 m per 10 cm from 189 cm (max ±0.18 m).
- **3D body:** the model is taller / shorter (×0.88–1.14) and wider / slimmer (×0.90–1.12) from height and weight; the name tag follows the height.
- Shown on cards and in the transfer market (`ST · 195 cm · 88 kg`); the market's "Youngest" sort became "Tallest".

**Season difficulty**

- Chosen on the pre-match screen or the LEAGUE TABLE tab **before your first match of the season**, then locked until the next season (a new season keeps the previous choice, which can be changed again before round 1). Stored in the league save (`difficulty`, default Normal).

  | Level | Opponent cards | Rewards (XP, prize money, season prize) | AI decision speed |
  | --- | --- | --- | --- |
  | Easy | +1 (±1) | ×0.8 | 15% slower |
  | Normal | +3 (±1) | ×1 | normal |
  | Hard | +5 (±1) | ×1.3 | 12% faster |
  | Very hard | +7 (±1) | ×1.6 | 22% faster |
  | Legendary | +9 (±1) | ×2 | 32% faster |

- Each opponent player in your 3D match becomes a +N card (same bonus table as Phase 25: +3 → +3 stats, +5 → +7, +7 → +11, +9 → +18, stats above 99 work as for your cards); the ±1 is fixed per player and season. Example Arsenal (starters' average 85.6): Easy 86.5, Normal 89.2, Hard 92.4, Very hard 96.9, Legendary 104.9.
- The pre-match screen shows the opponents' +N badges and the difficulty; the post-match reward card shows the multiplier.
- Only your matches are affected: AI-vs-AI results and the virtual leagues stay the same, so promotion / relegation stays fair.
- Note: Normal (+3) makes opponents a little stronger than before 26C (they used to be +1 = Easy).

### Phase 26D — Team color ✅ (2026-11-12)

Agreed on 2026-11-12 (FC Online-style team color, done before 26B). Logic in `src/services/teamColor.js`.

- **Only the 11 starters count, and always all 11.** The bonus goes to all 11 on the 6 main stats (+ OVR; detailed attributes follow), only during the match — cards are never changed. Bench and reserves get nothing.
- **Card level color** — the tier of the **whole team** comes from the **lowest card** of the 11 (same colours as the + badges):

  | Tier | All 11 at least | Bonus |
  | --- | --- | --- |
  | Bronze | +2 | +1 |
  | Silver | +5 | +2 |
  | Gold | +8 | +4 |
  | Diamond | +10 | +6 |

  One +1 card in the XI → no card level color.
- **Club color** — all 11 starters from the same real club → **+3**. The club of a card is the player's club (a Saka card = Arsenal even at Manchester United; the original squad, Huy Le…, = Manchester United; FREE AGENT players have no club). The original United XI therefore already has club color +3.
- **Both stack:** maximum +9 (diamond + club).
- **Substitutions recompute at once** (11 at +5 = silver; bring on a +3 → bronze; bring on a +1 → no card color; bring on a player from another club → no club color). A red card does not remove team color (the sent-off player still counts).
- **AI teams have team color too, same rules.** An AI XI is always 11 from one club (+3); its card color comes from the difficulty: Easy none (+3 total), Normal / Hard bronze (+4), Very hard silver (+5), Legendary gold (+7).
- **Shown:** TEAM COLOR box on the SQUAD screen (starting XI), in the lineup board (updates while dragging players), under both lineups on the pre-match screen (OVR there includes the bonus, green ▲, tooltip "Base 85 + 3 team color"), and "TEAM COLOR +N" in the in-match player profile. The box also says what is missing, e.g. "2 players below +5 → Silver (+2)". Card lists, the market and the upgrade screen keep showing base stats.
- Idea for later: nationality team color (needs nationalities for the real-name stars) → done in Phase 29E.

### Phase 27 — C1 / C2 club cups ✅ (2026-11-12)

Agreed on 2026-11-12. Logic in `src/services/cupService.js`, UI in `src/components/CupPanel.jsx`.

- **Two cups, 32 clubs each:** **C1 Champions Cup** and **C2 Challenge Cup** (names chosen for a world-wide competition — clubs come from all 18 countries).
- **Qualification ("way B": every country has clubs in the cups)** from the final top-league tables of the previous season (stored at season end since 26A); the very first season uses the data order (strongest first):

  | Countries (rank in the list of 18) | C1 | C2 |
  | --- | --- | --- |
  | 1–4 (England, Italy, Spain, Germany) | top 4 (16 clubs) | 5th–6th (8) |
  | 5–6 (France, Belgium) | top 2 (4) | 3rd–4th (4) |
  | 7–14 (Portugal … Croatia) | champion (8) | 2nd–3rd (16) |
  | 15–18 (Poland, Denmark, Sweden, Turkey) | champion (4) | 2nd (4) |

  **The C2 winner plays in C1 next season:** if it has no C1 place from its league it takes the C1 place of the champion of the lowest-ranked country (who moves to C2); if it already has one, nothing changes. In the first season Manchester United (5th in the data) play in C2.
- **Format (classic):** group stage of **8 groups × 4** (drawn from 4 pots by strength, no two clubs of the same country in a group where possible), everyone plays 6 matches home and away, **top 2 go through**. Round of 16 (group winners vs runners-up of another group), quarter-finals and semi-finals over **two legs** (aggregate score, then **away goals** (added after Phase 27, see below), still level → **penalty shoot-out right after the second leg**). **Final: one match on neutral ground** (draw → shoot-out). Up to **13 cup matches** per season for your club.
- **Penalty shoot-outs were simulated** (since Phase 29D you take them yourself in a played match; quick simulation still simulates them) (5 kicks each, then sudden death) from the shooting of each side's five best shooters vs the opposing keeper; the post-match screen shows the score and every kick. Taking the penalties yourself → Phase 29D.
- **Calendar:** cup matchdays sit between league rounds — group matchdays after rounds 3, 6, 9, 12, 15, 18; round of 16 after 21 / 23; quarter-finals after 26 / 28; semi-finals after 31 / 33; final after 36. "Next match" (home, pre-match, league fixtures list) follows this combined calendar, so you play the cup match before the next league round. The fixtures tab lists league and cup matches together (cup ones marked `C1 MD3`, `C2 R16 L2`, …).
- **Your cup matches are 3D matches** against real clubs from other countries (their squads, kits — third kit on clashes — team color and the season difficulty). All other cup matches are simulated like the virtual leagues.
- **Rewards:** a cup match pays ×1.5 (C1) / ×1.25 (C2) the league prize money and club XP (× difficulty). Going through a round adds an EP card (× difficulty): C1 8M group / 10M round of 16 / 15M quarter-final / 20M semi-final / **40M + Premium Player Pack for the title**; C2 4M / 5M / 8M / 10M / **20M + Premium pack**.
- **Screens:** LEAGUE has two new tabs, CHAMPIONS CUP and CHALLENGE CUP — your status in the cup, your cup matches (PLAY on the next one), the 8 group tables (top 2 marked) and the knockout bracket (both legs, aggregate, penalties, winners), plus the champion. Labels like "C2 · GROUP G · MD 1" / "C1 · QUARTER-FINAL · LEG 2" / "C1 · FINAL" on the home screen, pre-match (neutral venue for the final), scoreboard and full-time / post-match screens; the post-match screen also shows the group position or aggregate, penalties and "Through to …" / "Knocked out" / "Champions!".
- **Storage:** only your cup results are stored (`league.cups = { season, entrants, results }`, ≈ 2–3 KB per season); draws and every other match are recomputed from fixed seeds. Cup winners go into the world history.
- **Older saves:** a season that was already under way when this update arrives has no cups (the cup tabs say so); cups start with the next season. A season not yet started gets them immediately. Changing club mid-season restarts the season including the cups.
- **Fix included:** league fixture lists used to give some clubs half a season of away matches followed by half a season of home matches; home and away now alternate (never more than 2 in a row). Already stored fixtures of your current league are unchanged; the other (virtual) leagues of the current season use the new order.

#### Quick updates after 27 ✅ (2026-11-12)

- **Away goals rule** (two-legged rounds of 16, quarter-finals and semi-finals): aggregate first; if level, the club with more goals scored away goes through (e.g. win 2–1 at home, lose 2–3 away = 4–4, 2 away goals against 1 → through); still level → penalty shoot-out after the second leg. The one-match final has no away goals. The post-match screen shows "Away goals 2–1", the bracket marks ties decided this way. (The real competitions dropped the rule in 2021; the game uses it on purpose.)
- **Out-of-position OVR (display only):** a player in a slot other than his natural position (`naturalPosition`, kept since the formation update) shows a lower OVR in red with ▼ on the lineup board, in the pre-match lineups (team average included; tooltip e.g. "Base 75 · RB playing CB −5 · team color +3") and as "OUT OF POSITION −5" in the in-match profile. **The real stats do not change**: a striker at centre-back still tackles with his own (low) defending, a centre-back up front still shoots with his own (low) shooting, so he plays worse naturally. Penalties (`positionPenalty` in `src/systems/roster.js`):

  | Gap | Examples | OVR shown |
  | --- | --- | --- |
  | Very close | CM ↔ CDM / CAM, LB ↔ LWB, RB ↔ RWB, LW ↔ LM, RW ↔ RM, ST ↔ CF, CAM ↔ CF | −2 |
  | Close | CDM ↔ CB, LB ↔ RB, LW ↔ RW, LM ↔ RM, CAM ↔ ST, CM → LM / RM, CB ↔ LB / RB, LW / RW ↔ ST, wing-back ↔ wide midfielder | −5 |
  | Far | CM ↔ CB, ST ↔ CDM, LW ↔ LB, RW ↔ RB, everything else up to three lines apart | −10 |
  | Very far | defender ↔ forward (e.g. ST ↔ CB) | −15 |

  The automatic formation switch now uses the same table to put players where they lose the least.

### Phase 28 — Quick simulation ✅ (2026-11-12)

Agreed on 2026-11-12. Engine in `src/services/quickSim.js`, replay in `src/components/screens/SimulationScreen.jsx`.

- **SIMULATE** button next to PLAY MATCH (home) and KICK OFF (pre-match), with the remaining count (e.g. `SIMULATE 3/5`). Works for league and cup matches. **5 per day** (local date on the device, stored in the club save as `simulations`); unused ones do not carry over; at 0 the button is greyed out.
- **The result is decided and saved the moment you press the button** — the replay only plays it back, so reloading the page cannot change a result.
- **How the result is decided (players and whole team):** each side's 11 get four ratings — Attack (shooting / dribbling / pace of forwards, part of midfielders), Midfield (passing / dribbling / physical), Defence (defending / physical / pace of defenders, part of midfielders) and Goalkeeping — using effective stats (card +N, stats above 99), team color, current condition, the opponent's +N cards from the difficulty, and a small home advantage (none in the final). They give each side's expected goals; goals, shots (on / off target, xG), scorers and assisters (by position and stats), saves, passes, tackles, cards, corners and possession follow from them. Typical results for the default United XI on Normal: vs Burnley ~56% wins, vs Aston Villa ~20%, vs Manchester City ~9%.
- **Replay (~24 s, SPEED ×2, SKIP):** score and crests, match clock with half-time, a 2D top-down pitch where the ball moves towards the goal of the side attacking, GOAL! pop-up, possession and momentum bars, minute-by-minute commentary (goals with assists, saves, misses, cards). Then MATCH SUMMARY → the normal post-match screen (stats, ratings, man of the match, shot map, timeline, cup result).
- **Everything counts like a real match:** league table / cup result (aggregate, away goals, shoot-outs), season player stats, player condition and XP (the starting XI play 90 minutes), season prize at the end of the league.
- **Rewards ×0.7:** prize money and club XP of the match, and cup round prizes, are ×0.7 of a played match (× difficulty, × cup factor); the reward card says "SIMULATED · REWARD ×…". **Player XP is ×0.7 too** (`xpFactor` in `applyMatchProgression`).

#### Quick update after Phase 28 — tidier pre-match screen (2026-11-12)

- **SIMULATE n/5 and ▶ KICK OFF sit in the header**, right of the "MANCHESTER UNITED vs …" title, so you no longer scroll to find them (on narrow screens they wrap below the title, full width). The home screen keeps SIMULATE next to PLAY MATCH.
- **TEAM SETUP has 4 tabs — FORMATION / TACTIC / KITS / DIFFICULTY** — showing one part at a time (FORMATION by default), with an always-visible summary line, e.g. `4-3-3 · Attacking · Home kit · Normal 🔒`. Tactics are picked from cards with a one-line description. Once the season's first match is played, the DIFFICULTY tab shows "Normal · locked until next season".
- **EDIT ✎** (lineup editor) moved into the header of your lineup card, next to the AVG; the old help paragraph became that button's tooltip.
- Result: the middle column is about half as tall and the three columns line up (579 / 521 / 579 px at 1400 px wide).

### Phase 28B — Trophy room ✅ (2026-11-12)

Agreed on 2026-11-12. Data in `src/services/trophyService.js`, screen in `src/components/screens/TrophyRoomScreen.jsx`, trophies drawn in `src/components/TrophyIcon.jsx`.

- **TROPHIES tab** in the top menu. **Titles belong to you as a manager, not to the club**: win the Premier League with Manchester United, move to Juventus, win Serie A — both trophies are on the shelf. Stored in the world save (`world.trophies`, `world.career`), never trimmed.
- **Only titles count:** champions of any of the 36 leagues (18 first divisions, 18 second divisions), C1 Champions Cup, C2 Challenge Cup. Runner-up finishes, cup runs and promotions are shown in the career table instead.
- **When a trophy is won:** the league title as soon as your last league match is played and you are first; C1 / C2 as soon as you win the final. Works for played and simulated matches. A **NEW TROPHY** pop-up (turning trophy, light rays, club, season, difficulty) appears after the match (not over the 3D match), with TROPHY ROOM / CONTINUE.
- **A different trophy for every competition** (original SVG designs, not copies of real trophies):

  | Competition | Trophy |
  | --- | --- |
  | C1 Champions Cup | Large silver cup with big handles |
  | C2 Challenge Cup | Tall slim amber cup |
  | 18 first divisions | 6 shapes (crown, shield, goblet, plate, obelisk, ball-topped) × 3 metals (gold for countries ranked 1–6, silver 7–12, rose gold 13–18), every base with the country's flag colours — 18 different trophies |
  | 18 second divisions | Same shape as the country's first division, smaller, bronze |

- **Difficulty star:** a trophy won on Hard gets a bronze star, Very hard a silver star, Legendary a gold star (the best one won is shown on the shelf; each win lists its own difficulty).
- **Screen:** career numbers (trophies, league titles, cup titles, seasons, clubs, best C1 / C2 run); three wooden shelves (Continental, Top divisions, Second divisions) with ×N for repeat wins and dark silhouettes for trophies not won yet; click a trophy for its details (every season won, club crest, difficulty); career table season by season (club, league, position, cup run e.g. "C1 · Semi-final", difficulty), the current season marked IN PROGRESS.
- **Old saves:** titles and seasons from before this phase are rebuilt once from the season history (the last 30 seasons); difficulty and cup runs older than this phase are not known, so they show "—" (cup wins are still found).

Also: **SIMULATE n/5 is the same size as KICK OFF** (pre-match) and PLAY MATCH (home).

### Phase 29 — Mobile, graphics, performance, sound and release

Split on 2026-11-12 into **29A** (mobile), **29B** (graphics, sound, performance, release — done) and **29C** (upgrade insurance, protection cards, xG for rebounds — done). On 2026-11-13 the mobile part was split again into five smaller phases, each usable on its own. Order approved: **29A1 → 29A2 → 29A3 → 29A5 → 29A4** (after 29A2 a match can be played on a phone; 29A4 is the biggest but does not block playing).

| Phase | Content | Size |
| --- | --- | --- |
| **29A1 — Mobile foundation** | Detect touch devices; during a match block page zoom and scrolling; full-screen match layout on phones (header and side panel hidden); "rotate to landscape" prompt; full-screen button; iPhone Safari fixes (screen height, notch / safe areas, sound only starts after the first touch); smaller scoreboard, mini map and power bar on small screens | Small |
| **29A2 — Basic touch controls** | Floating joystick where the left thumb touches; four round buttons on the right **PASS / THROUGH / SHOOT / SPRINT**, hold to charge like the keyboard; when defending PASS = switch player, SHOOT = press; ☰ menu (pause, subs, stats) | Medium — the core |
| **29A3 — Advanced touch controls** | Swipe on a button for the variant: lofted pass / cross, lobbed through ball, chip, finesse / trivela, shield, slide tackle; light vibration on kicks; button size and opacity settings | Medium |
| **29A4 — Mobile UI for the management screens** | Tab bar at the bottom of the screen; HOME, TRANSFERS, CARDS, SQUAD, LEAGUE, WORLD CUP, TROPHIES as step-by-step screens with tabs and back buttons instead of one long page; pickers and dialogs full screen | Large — can be split again by screen group |
| **29A5 — Phone performance** | LOW graphics chosen automatically on weaker phones; lower resolution when FPS drops; install to the home screen like an app (prepared in 29B) | Small |

- **Touch button layout planned for 29A2 / 29A3** (reference: FC Mobile), landscape and full screen:
  - Top left: compact score and clock. Top right: formation / tactics selector and a ☰ menu (Pause, Subs, Stats, Controls).
  - Left: floating joystick that appears where the thumb touches (replaces the arrow keys).
  - Right: four round buttons, each with arrows on its rim — swipe on a button for a variant. Hold to charge power, like the keyboard.

    | Button | With the ball | Swipe on the button | Defending |
    | --- | --- | --- | --- |
    | PASS | Short pass (S) | Up: lofted pass / cross (A) | Switch player (S) |
    | THROUGH | Through ball (W) | Up: lobbed through ball (Q+W) | Call teammate press (W) |
    | SHOOT (largest) | Shot (D) | Up: chip (Q+D); sideways: finesse (Z+D) / trivela (C+D) | Contain / press (D) |
    | SPRINT & SKILL | Sprint (E) | Long hold: shield (C) | Tackle / slide |

  - Touch buttons write into the same `keys.current` input the engine already reads, so the engine needs almost no change.
- **Testing:** emulated iPhone / Android in the browser (screen sizes, touch, swipes); the real feel has to be checked on a phone — open the game with `npm run dev -- --host` on the Mac and the Mac's IP address on a phone in the same Wi-Fi, or publish it (see *Publish online*).

### Phase 29A2 — Basic touch controls ✅ (2026-11-13)

Code: `src/components/TouchControls.jsx`, `src/systems/touchInput.js` (both new), `inputDirection` in `control.js`, ☰ menu in `GameScene.jsx`, CSS at the end of `styles.css`. Shown on touch devices while the match is being played (also in a penalty shoot-out); hidden when paused, at half time and full time.

- **Floating joystick** on the left ~40 % of the screen (below the top HUD): it appears where the thumb touches (a faint hint shows its usual place), drag to run. Movement is **analog 360°** (`touchInput` → `inputDirection`), and the joystick also sends the arrow keys (8 directions) for everything that reads arrows (aiming penalties, keeper dive, the receiver nudge…). Holding a direction re-sends the key every second so auto play does not think you left.
- **Four round buttons** bottom right, hold to charge exactly like the keys (the power bar appears):

  | Button | With the ball | Defending |
  | --- | --- | --- |
  | Big (yellow / red) | **SHOOT** (D) | **TACKLE** (Space) |
  | PASS | Short pass (S) | **SWITCH** player (S) |
  | THROUGH | Through ball (W) | **PRESS** — call a teammate to press (W, hold) |
  | SPRINT | Sprint (E, hold) | Sprint (E, hold) |

  Labels change automatically with possession (checked 6–7 times a second). Lofted passes / crosses, chips, finesse shots and slide tackles come with the swipe gestures of 29A3; until then throw-ins and corners use PASS (short).
- The buttons send the same keyboard events as a real keyboard (`KeyboardEvent` on `window`), so the engine is unchanged and touching any button takes control back from auto play. Joystick and buttons work at the same time (multi-touch, pointer capture); a short vibration on Android when a button is pressed.
- **☰ menu** (top right on phones): LEAGUE, PAUSE, STATS, SUBS, CONTROLS, QUIT (and ⛶ full screen where supported) in one list instead of a row of small buttons; it closes after a choice.
- Desktop / laptop without touch: nothing changes.
- **Tested** in emulated iPhone 13 and Pixel 7 (landscape): the PASS button makes a real pass (receiver's first touch), the joystick shows under the finger and sends the right arrows, the ☰ menu opens and PAUSE works; desktop regression tests unchanged.

### Phase 29A1 — Mobile foundation ✅ (2026-11-13)

Code: `src/utils/device.js` (new), `installAudioUnlock` in `src/utils/sound.js`, `main.jsx`, compact match layout in `GameScene.jsx` + `styles.css`.

- **Touch detection:** `html.is-touch` / `html.is-ios` classes at start (`setupDevice`); `html.in-match` while the match screen is open.
- **Phone match layout** (touch device with a screen up to ~820 px on its short side — phones and small tablets — or any window narrower than 900 px / lower than 600 px): the match fills the whole screen (`position: fixed`, real browser height via `100dvh` / `--app-height`), header, side panel and footer hidden; scoreboard, tactic box, AUTO PLAY, match buttons, messages, mini map, power bar and auto-play badge are smaller and kept clear of the notch (`env(safe-area-inset-*)`); extra-small sizes below 440 px height (phones in landscape). Laptops and big tablets keep the normal layout.
- **No zoom / scroll in a match:** pinch zoom blocked (`gesturestart`, two-finger `touchmove`), double-tap zoom off everywhere (`touch-action: manipulation`), no page bounce, the 3D canvas takes all touches (`touch-action: none`) — ready for the touch controls of 29A2.
- **Rotate prompt:** a phone held upright on the match screen shows **TURN YOUR PHONE SIDEWAYS** (animated phone) and pauses the match; turning it sideways resumes it.
- **Full-screen button ⛶ / ⤡** in the match buttons on phones and tablets (Android Chrome also locks landscape). Not shown on iPhone, where Safari has no full screen for web pages — use *Add to Home Screen* for a full-screen app (manifest from 29B).
- **Sound on phones:** iOS / Android only allow audio after a user action, so the first touch / key press creates and wakes the audio context with a silent sample; the whistle and crowd then work.
- **Tested** with emulated iPhone 13 (landscape and portrait), Pixel 7 (landscape) and iPad Pro 11 (normal layout) plus the desktop regression tests; on a real phone: `npm run dev -- --host`, then open the Mac's IP address (port 5173) on the phone in the same Wi-Fi.

### Phase 29B — Graphics, sound, performance, release ✅ (2026-11-12)

Scope chosen on 2026-11-12 (the user asked to go ahead without more questions). Done in the same session as 29C (29C first).

- **Settings** (home screen, remembered on the device): **Graphics HIGH / LOW**, **Sound ON / OFF** (same switch as the upgrade screen), **FPS counter ON / OFF** (bottom-left of the pitch, green ≥ 50, yellow ≥ 30, red below).
  - **LOW:** no shadows, no contact shadows under the players (the most expensive effect), no antialiasing, pixel ratio 0.75–1, unlit stadium materials, no floodlights. In a software-rendered test LOW ran about twice as fast as HIGH.
- **Stadium** (`src/components/Stadium.jsx`): sloped stands with a crowd behind the far touchline and both goals, drawn into a canvas texture in code (no images; shirts in the two teams' colours), advertising boards, floodlight towers, darker apron around the pitch. Only the stands the camera can see are built.
- **3D turning trophy** (`Trophy3D.jsx` + `TrophyCanvas.jsx`) in the TROPHIES detail panel and the NEW TROPHY pop-up: the 8 shapes rebuilt from three.js lathes, tori, extrusions and spheres, real metal reflections from a generated room environment (no HDR download), wooden base with the flag band, difficulty star. Falls back to the SVG trophy for trophies not won yet, on LOW graphics, without WebGL, and while the 3D part loads.
- **Match sounds** (`src/utils/matchSound.js`, Web Audio, no audio files):
  - referee whistle with a pea trill: kick-off / restart after a goal, fouls and offside (short), half-time (2 blasts), full-time (3, the last one long);
  - ball kicks, louder for harder shots and passes;
  - crowd ambience that grows when the ball gets near either goal;
  - "ooh" on a goalkeeper save and on a shot wide (louder when close to the post);
  - roar on a goal (bigger for your goals).
- **Performance / first load:** the 3D match scene with Rapier physics is a separate file (`MatchCanvas.jsx`) loaded in the background 1.5 s after start (a short "LOADING STADIUM…" shows only if you kick off before it arrives); the 3D trophy viewer is loaded on demand. First screen JavaScript went from ~3.9 MB to ~1.3 MB.
- **Release preparation:** relative build paths (works on Netlify, Vercel, GitHub Pages sub-folders), web app manifest and icons (installable / add to home screen), page meta tags, version 0.9.0, deployment notes under *Publish online* at the top of this README.

### Phase 29C — Upgrade insurance, protection cards, xG for rebounds ✅ (2026-11-12)

Agreed on 2026-11-12 (both A and B). Today (Phase 25): rates drop to 8% for +8 → +9 and 5% for +9 → +10; from +5 a failure drops the card one level and the material cards are always lost, so an unlucky player can fail 15–20 times in a row.

- **A. Insurance (bonus after each failure):**
  - Every failed attempt at the same target level adds **+5 percentage points** to the next attempt at that level, up to **+30**. Example: +8 → +9 base 8%, three failures → the fourth attempt is 23%.
  - Stored per card and per target level (e.g. `card.insurance = { 9: 0.15 }`), so it is not lost when a failure drops the card one level and you climb back. A success at that level resets it to 0.
  - The upgrade screen shows it next to the rate, e.g. `Success 23% (base 8% + insurance 15%)`; the rate is still capped at 100%.
- **B. Protection card (no level drop):**
  - A new item in CARDS, **Upgrade Protection**. Tick it before an upgrade: if the upgrade fails, the card **keeps its level** (only matters from +5, where failures drop a level). The material cards are still used up; the protection card is used up whether the attempt succeeds or fails.
  - Ways to get one: **buy for 5,000,000 EP** with the BUY button next to the tick box in UPGRADE CARDS, **club levels 5, 10, 15…**, **league titles** (with the season prize) and **C1 / C2 titles** (with the cup prize). Unused ones wait in CARDS → REWARDS (USE → opens UPGRADE CARDS).
  - A protected failure still adds insurance (A and B work together). The result screen says `FAILED · PROTECTED · STAYS +8` and shows the insurance for the next try.
- **xG counts rebounds and deflections:**
  - Today a goal from a rebound (ball off the keeper or a defender, then in) or a close-range touch can be missed as a shot, so it adds no xG and the match total is lower than it should be (e.g. a 3–1 win showing xG 1.4–0.9). Only the statistics are affected, not results or play.
  - Done (`src/systems/matchStats.js`, `rules.js`):
    - A shot within **4 seconds** of a missed / saved / blocked shot by the same team is a **rebound**: xG ×1.2 (keeper and defenders out of position), dashed ring on the shot map, "(rebound)" in the timeline.
    - A goal with no shot behind it (tap-in, a touch or control that goes in) is now recorded as a shot from where the scorer touched the ball, with its xG.
    - A shot that goes in off the keeper or a defender within 2.5 seconds is credited to the **shooter** ("deflected"), not counted as an own goal.

#### Quick update after Phase 29B — sale confirmation (2026-11-12)

- **SELL PLAYER** (TRANSFERS → SQUAD & SALES) no longer sells at once: a **CONFIRM SALE** box shows the card (OVR, position, +level, rarity), its value, what you receive (85%) and the budget after the sale, warns when a +2 or higher card would lose its upgrade level, and notes that a sale cannot be undone. **SELL FOR …** confirms; **CANCEL**, Esc or a click outside closes it.

### Phase 29D — Play penalty shoot-outs yourself ✅ (2026-11-12)

Requested and built on 2026-11-12. Code: `src/systems/shootout.js` (engine), `src/systems/shootoutRules.js` (rules, simulate, save format), `src/components/ShootoutPanel.jsx` (scoreboard), camera in `MatchWorld.jsx`.

- **When:** a second leg ends level on aggregate and away goals, or a final ends level → the full-time whistle leads straight into a **PENALTY SHOOT-OUT** in the 3D match (the home team of that match kicks first). Quick simulation (SIMULATE) still simulates shoot-outs.
- **Scene:** both teams shoot at the same goal; players wait in the centre circle, the other keeper at the edge of the box. 5 kicks each, then sudden death. Takers in order of finishing + shot power, the goalkeeper last.
- **Camera behind the taker** (slightly high, a bit to the side, the whole goal in view) for every kick; the same camera is used for **penalties during a match**, then it glides back to the side view.
- **Your kick:** ← / → choose the side (as seen from behind the taker; no arrow = down the middle), hold **D** for power (too much power can go over). Same controls for match penalties (they used ↑ / ↓ before).
- **Their kick:** hold **←** or **→** to dive that way, **↓** to stay in the middle; the last choice before the kick counts, nothing pressed = stay. Saves still depend on the keeper's reflexes / diving and on the shot (corner, height). Also for match penalties against you (on auto play the keeper guesses by himself).
- **Shoot-out panel:** both teams' rows of ● scored / ✕ missed / ○ to come with the score, the taker and the controls, GOAL / MISSED after each kick, SUDDEN DEATH badge, "MUN WIN 5–4 ON PENALTIES" at the end. **SIMULATE SHOOT-OUT** finishes the remaining kicks by simulation.
- **Saved like before:** the real kicks are stored as the tie's shoot-out (`results[fixtureId].shootout`, `played: true`), so the post-match box ("Penalties 5–6" + every kick), the cup bracket and the history show them; the shoot-out does not count in match statistics (shots, xG, saves). Quitting during the shoot-out = 0–3 forfeit (tie lost).
- **Testing:** an end-to-end browser test plays a whole shoot-out (through sudden death) and the simulate path; it uses a test-only hook that exists only in builds made with `VITE_E2E=1`.

### Phase 29E — World Cup and national teams ✅ (2026-11-12)

Proposal approved and built on 2026-11-12. Code: `src/data/nations.js`, `src/data/starNationality.js`, `src/services/nationalTeams.js`, `src/services/worldCupService.js`, `src/components/NationPicker.jsx`, `src/components/WorldCupPanel.jsx`; World Cup mode in `GameScene.jsx`.

- **When:** every 4 years in the summer break — after the 2026/27, 2030/31… seasons (World Cup 2027, 2031…). When the club season is over the home screen shows **WORLD CUP 2027 · CHOOSE YOUR NATION** (or **SKIP WORLD CUP**); START NEW SEASON is available again once the World Cup is finished or skipped.
- **32 nations:** the 18 league countries + Ghana + Uruguay, Morocco, Colombia, Switzerland, Senegal, Serbia, Nigeria, Korea Republic, Ecuador, Cameroon, Canada, Australia, Vietnam. Each nation is a "virtual club" (`nat-xxx`) so crests, kits, names and the 3D match work like club matches; kit colours are the national colours.
- **Players:** every one of the 15,840 club players already had a nationality; the 351 real-name stars now have one too (`starNationality.js`, e.g. Kane → England, Salah → Egypt — stars from countries outside the 32 can still count for nationality team color). The 13 nations without a league in the game get 22 generated players each (new name pools for Morocco, Korea, Serbia, Vietnam), plus catalog players of that nationality.
- **Call-ups:** for each nation the best player for each of the 22 squad slots (same 4-3-3 + bench layout as AI clubs: right position first, then same position group) from all clubs; **your own cards (with their +level) replace the base player when better**. The nation picker shows all 32 nations by strength (starting XI average), how many of your cards each has, the suggested nation (most players in your XI) and the starting XI.
- **Format:** 8 groups of 4 drawn from 4 strength pots, 3 group matches, top 2 → round of 16 (A1–B2, C1–D2…), quarter-finals, semi-finals, third-place match, final — single matches at a neutral venue; a level knockout match goes to the **penalty shoot-out you take yourself (Phase 29D)**. Other matches are simulated deterministically from team strength.
- **Playing:** PLAY MATCH on the home screen (or LEAGUE → **WORLD CUP** tab) opens the usual pre-match screen with your national team (formation, tactic, kits, EDIT lineup) against the opponent's national squad (with the season difficulty). During the World Cup your club squad is set aside untouched and comes back when you leave (national matches do not change your cards' condition or XP). Quick simulation is not offered for World Cup matches. **SIMULATE REST** / **SKIP WORLD CUP** simulate the remaining matches (no trophy or prizes then). When you are knocked out, the rest of the tournament is simulated at once.
- **WORLD CUP tab** (LEAGUE screen): your matches, the 8 groups, the knockout bracket (round of 16 → final, third place) with penalties, the champion.
- **Rewards:** every match gives club XP and prize money like a C1 match (×1.5); reaching the round of 16 5,000,000 EP, quarter-final 8,000,000, semi-final 12,000,000, final 18,000,000, third place 3,000,000, **champions 35,000,000 + Premium pack + Upgrade Protection** (× difficulty). Winning gives the **World Cup trophy** — a new, 39th design (golden globe with two orbit rings, also in 3D) on the **International & Continental** shelf of the TROPHIES room, listed with the year and the nation; the career numbers show WORLD CUPS.
- **Nationality team color (also in club matches, AI included):** 7 / 9 / all 11 starters of one nationality → **+1 / +2 / +3** main stats, stacking with card level color and club color (TEAM COLOR box: "Nation color"). A national team always has +3.
- **Fixes found while testing:** `npm run dev` crashed at start since Phase 29B ("Cannot access 'lazy' before initialization" — the lazy 3D import sat between import lines); playing a second match in a row could throw a `removeChild` error when leaving the match (player name tags used drei `<Html>`, one React root per tag) — name tags are now plain DOM elements positioned every frame.

### Phase 29F — AI and ball feel, crowd sound, auto play ✅ (2026-11-12)

Playtest feedback on 2026-11-12, proposal approved the same day (crowd sound option A, Composure yes, ball speed as proposed, automatic second half only during auto play).

- **Long shots and long passes (AI)** — the stats existed (Long shots, Long passing, Vision) but the AI almost never used them: it only considered shots up to 27 m and from ~22 m the shot value was already too low; a lofted pass outside the box could never reach the AI's "safe enough" threshold, so it nearly always played short.
  - **Shooting range by Long shots:** 50 → ~25 m, 75 → ~29 m, 99 → 32 m; beyond 16 m the shot value falls more slowly for good long shooters (a 85+ long shooter with a clear sight of goal shoots from the edge of the box and a bit further).
  - **Long passes by Long passing / Vision / tactic:** lofted passes are judged on how open the receiver is (≥ 6.5 m free for full safety) more than on the passing lane (the ball flies over players); new **switch of play** (long ball to an open player on the other flank, > 20 m across); long through balls up to 38 m for players with high Vision (counter-attacks, a bonus with direct tactics such as Counter Attack / Attacking); long through balls are often lofted over the back line. Long balls are still the risky option: in a 4-minute AI-vs-AI test about 1 pass in 6 was long (before: about 1 in 15), and many more shots came from 18–25 m.
  - Match statistics now count `longPasses` (not shown on screen yet).
- **New attribute: Composure** (Shooting group, shown in DETAILED ATTRIBUTES and trainable — a secondary stat, 2 points, for ST / CAM / wingers, 3 points for others):
  - High Composure: shoots when there is a reasonable angle instead of passing again, also in the box with a defender on the line (blocked-shot value 0.4 → up to 0.62), shoots under pressure; inside 17 m the AI compares the shot (×1 to ×1.85 by Composure, extra for forwards) with the best pass and takes the shot if it is better — strikers no longer "walk the ball into the net" with one pass too many.
  - Shooting with an opponent within 2.2 m costs accuracy: −5 points at Composure 50, −2.5 at 75, nothing at 99 (also for your own shots).
  - Every player has it, derived like the other detailed attributes from the Shooting stat plus position (ST +4, CAM +2, wingers +1, CDM −1, full-backs −3, CB −4). Old saves: nothing to convert; players who were already trained get it the first time it is needed, without changing their OVR or Shooting stat.
- **Receiving:**
  - After your pass the receiver keeps running to meet the ball while you still hold the arrow keys you aimed with, for up to 2.5 s (was 0.6 s — after that the receiver ran in the direction of the held arrows, i.e. *away* from the ball, and the passer had to go back for it). Press a different direction to steer him yourself.
  - A pass that stops short or is touched aside: the intended receiver goes to the loose ball for up to 1.6 s; the passer and other teammates do not chase it at the same time.
  - The receiver's control reach grows with Ball control (up to +0.3 m), and teammates control cleanly up to 19 m/s (was 17) because passes are faster.
- **Faster ball:** ground passes ×1.15 → ×1.29 (+12 %), through balls ×1.12 → ×1.25, AI through balls ×1.06, shots ×1.12 → ×1.23 (+10 %), finesse ×1.21, penalties ×1.15, ground-pass ceiling 31 → 35 m/s. Lofted passes, crosses, chips and free kicks over the wall are unchanged (their flight is aimed at a landing spot).
- **Crowd sound** (`src/utils/crowdSynth.js`): the Phase 29B crowd was filtered noise in a 2-second loop whose volume and tone changed 4 times a second — it "bubbled". Now it is built from synthetic human voices (a pitched voice source through vowel formant filters):
  - background murmur of 36 talking voices + a soft low noise bed, 7- and 6-second loops blended at the seams so the loop cannot be heard; volume rises and falls slowly (~1.5 s) as the ball nears a goal;
  - "ooooh" for saves and near misses: 40 voices rising and falling; goal roar: 44 voices + applause (louder for your goals);
  - built in small pieces in the background a few seconds after start (no stutter), no audio files;
  - **Crowd volume** in Settings: OFF / LOW / MEDIUM (Sound OFF still mutes everything).
- **Auto play:**
  - **Delay setting:** Settings → *Auto play after* 5 / 10 / 20 s (was fixed 10 s).
  - **More reliable:** idle time now counts from the last key press or release. Before, any key the browser still believed was held blocked auto play forever — e.g. on a Mac, a key released while ⌘ is held never sends its key-up. Held keys now count as play for at most 30 s without a new key event; releasing ⌘, switching tab or hiding the window clears all held keys.
  - **AUTO PLAY ON / OFF button** under the team tactic box during the match: hand over to the AI at once (any key takes control back).
  - **Second half starts by itself during auto play:** the half-time panel shows "AUTO PLAY · 2nd half starts in 5 s" and the CONTINUE button counts down; any key stops the countdown and gives you control, a click on the panel (tactics, substitutions…) just stops the countdown.
- **Testing:** browser tests for auto play after 5 s idle, the AUTO PLAY button, the automatic second half and the key / click cancel paths, two consecutive matches, a 4-minute AI-vs-AI match with pass and shot breakdowns (compared with the old AI); Node tests for Composure, trained-player migration and kick power. To watch in playtests: goalkeepers face faster shots (their reach was not changed).

### Phases 29G–29J — done (approved and built 2026-11-13)

Playtest requests on 2026-11-13; ideas and details agreed the same day. Order: 29G → 29H → 29I → 29J, then 29A.

#### Phase 29G — Receiving, quick flow, header ✅ (2026-11-13)

- **Receiver always runs toward the ball:** while a pass is travelling to the player you now control (or he is going for a pass that stopped short), he runs to the meeting point by himself even if you press arrows; the arrows only move that point by up to 2 m (`state.receiveNudge`, `control.js` → `teamAI.js`). Full control again once he has the ball, or when the ball is cut out / stops. (Phase 29F only kept the auto run while you held the *same* arrows as when you passed.)
- **SIMULATE NEXT n/5** on the full-time panel (once the result is saved), the post-match summary and the simulation replay screen — the next club fixture is simulated straight away (not offered for World Cup matches).
- **EP in the header** next to the season: `EP 123.4M` (full amount in the tooltip), click → TRANSFERS (not during a match), a green "+3.5M" / red "−2M" floats up whenever the budget changes. The CARDS tab already shows a badge with the number of unopened items.
- **⚙ SETTINGS in the header** on every screen (`SettingsDialog.jsx`, rows shared with the HOME settings box in `SettingsRows.jsx`); opening it during a match pauses the match and closing resumes it; match length and club cannot be changed during a match. Esc or a click outside closes it.
- **Match length 3 / 6 / 9 minutes** (10 → 9; saved 10-minute settings become 9), also as a quick **LENGTH** choice under KICK OFF on the pre-match screen.

#### Phase 29H — World Cup any time ✅ (2026-11-13)

- New **WORLD CUP** tab in the header (`screens/WorldCupScreen.jsx`; the WORLD CUP tab inside LEAGUE and the home-screen World Cup block were removed). Choose a nation and start a tournament whenever you like; a tournament in progress is saved in the world save — play club matches in between and continue later (home screen strip **WORLD CUP · #3 · England · next: Quarter-final · CONTINUE →**). One tournament at a time; editions numbered **World Cup #1, #2…** (`world.worldCupCount`; ids `wcn3-…`, a new random draw each time). The every-4-years schedule and the START NEW SEASON lock are gone.
- **2 tournaments per day** (`world.worldCupDaily`, counted when a tournament starts, resets at midnight on the device like quick simulation); the START button shows `n/2 left today` and is disabled at 0.
- **Prize = best stage reached only** (not added up; confirmed 2026-11-13), paid as an EP card when the tournament ends — knocked out or after the final — × difficulty: round of 16 5,000,000 EP · quarter-final 8,000,000 · 4th 12,000,000 · **3rd 15,000,000** · runner-up 18,000,000 · **champions 35,000,000 + Premium pack + Upgrade Protection**. Group-stage exit, SIMULATE REST and a forfeited last match: no prize. The prize table is shown on the World Cup screen.
- Match money / club XP per World Cup match now really uses ×1.5 like C1 (Phase 29E forgot to apply it).
- Trophy: one per title, also several in the same season (`wc-<key>-<nation>`), listed as "WC #3" in the TROPHIES room; trophy subtitle "International · national teams".
- **Past tournaments** table on the World Cup screen (`world.worldCupHistory`, last 30): edition, your nation, result, champions.
- Saves from Phase 29E keep working: an unfinished World Cup 2027 can be continued (same results as before), finished ones show in the history.

#### Phase 29I — Form, fitness and form cards, upgrade boost cards ✅ (2026-11-13)

Prices confirmed 2026-11-13 (Fitness 2,000,000 EP, Form 3,000,000 EP). Code: `src/systems/form.js`, items in `src/services/cards.js`.

- **Player form** (`player.form` −2…+2, separate from fitness / condition), 5 levels with coloured arrows: ⬇ −3 · ↘ −1 · ➡ 0 · ↗ +1 · ⬆ +3 on all six main stats.
  - **It affects play:** added in the 3D match (after team color, `MatchWorld.jsx`) and in quick simulation (`quickSim.js`), so speed, accuracy, tackling… change with it. The pre-match lineup OVR includes it (tooltip: "form +3"), and the match profile panel shows OVR with form.
  - **After each match** (`applyFormAfterMatch`, real and simulated): match rating ≥ 7.5 → 65 % one step up (5 % down); ≤ 5.5 → 65 % one step down (5 % up); in between 15 % up / 15 % down; players who did not play → 50 % one step back toward ➡. A forfeited match changes nothing. The post-match screen lists **FORM CHANGES** (e.g. `Herrera ⬆ → ↗`).
  - **AI teams:** random form per match, fixed for that fixture (10 % ⬇, 20 % ↘, 40 % ➡, 20 % ↗, 10 % ⬆; `roster.js` `formSeed`).
  - Arrows on the player card, the pre-match lineups (both teams), the SQUAD list and the match profile panel. Old saves: every player starts on ➡.
- **Fitness card** — one card brings the **whole squad** (starting XI, bench and reserves) to condition 100. **Form card** — one card puts the whole squad on ⬆. No separate team cards (dropped 2026-11-13).
  - **Buy** in CARDS → **SHOP**: Fitness 2,000,000 EP, Form 3,000,000 EP (the card goes to UNOPENED).
  - **Use** with USE in CARDS → REWARDS, or the quick **♥ FITNESS ×n · USE / ⬆ FORM ×n · USE** buttons under KICK OFF on the pre-match screen (not for World Cup matches).
  - **Earned:** a Fitness card at every club level; a Form card at levels 5, 10, 15… and with every C1 / C2 / World Cup title.
- **Upgrade Boost card** (`type: 'boost'`): +3 %, +4 % or +5 % (random when received) on the upgrade success rate. In UPGRADE CARDS choose how many with **− / +** (up to **5 per attempt**, strongest first, max +25 %); stacks with insurance, the rate is still capped at 100 %; used up whether the upgrade succeeds or fails. The rate line shows `Base 8% + insurance 15% + boost 21%`. Earned at club levels 5, 10, 15… (with the Upgrade Protection card).
- Tests: Node tests for form maths, the after-match rules (≈65 % / 50 % rates checked over 2,000 runs), squad items, boost rate and level rewards; browser test for buying / using cards, the boost stepper, lineup arrows, quick-use buttons and the form-change list after a simulated match.

#### Phase 29J — Player portraits ✅ (2026-11-13)

Scope chosen 2026-11-13: **large cards only** (pack opening, upgrade screen, upgrade animation) — not in lists.

- `src/components/PlayerPortrait.jsx`: an SVG portrait drawn in code for every player — no image files, no real photos (copyright, real people). Face shape and jaw, skin tone, 7 hair styles (short, buzz, quiff, curly, long, afro, shaved), hair colour (grey sometimes from 33), stubble / full beard / goatee, eyebrows, eyes, nose, mouth, rare headband — all generated from the `playerId`, so a player always looks the same; skin and hair colours follow a loose regional mix by nationality (every tone appears everywhere). Shirt in the home colour of your club with the shirt number and trim.
- Shown on `PlayerCardView` (size large) between the OVR and the +N badge; memoised per player / club / number.
- **Size:** about 6.7 KB of code (2.6 KB gzipped); nothing is added to saves (the portrait is recomputed from the id).

#### Quick update after Phase 29J — players on the pitch look like their cards (2026-11-13)

- The 3D players used one skin colour, one dark-brown hair colour and one hair shape for all 22. Now `Player.jsx` takes skin, hair colour, hair style, beard and headband from the card portrait (`portraitTraits`, by `playerId`), so a blond player with a quiff on his card is blond with a quiff on the pitch.
- Simplified 3D hair (seen from the high camera): short / quiff (cap + raised front), buzz (thin cap), curly (small balls), long (down to the neck), afro (big round volume), shaved (none); full beard and goatee as a patch on the chin; headband in the kit trim colour.
- **LOW graphics:** colours change too, but every player keeps the basic hair cap and no beard (fewest shapes). HIGH adds at most 2–8 small shapes per player; no FPS change seen in the test; a few KB of code, saves unchanged.

### Backlog

- **Individual player skills / traits** (FO4-style traits such as finesse shot, long passer, speed dribbler).
- **Card seasons and real player data** (was Phase 30; moved to the backlog on 2026-11-12 because it is hard — mostly the data side):
  - **Card seasons:** several card seasons per player (`cardId` per season, same `playerId`), with season-specific stats and pack types.
  - **Real player and club data:** research sources such as Transfermarkt, EA Sports FC, SoFIFA and PES Master. Their terms of use forbid scraping, and crests, player photos and EA ratings are protected, so prefer a licensed API (e.g. football-data.org, API-Football) or an open dataset, or keep the fictional catalog. The data must fit the Phase 23 player catalog structure.

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
| Giao bóng bắt buộc chuyền cho đồng đội đứng cạnh | Phase 22 ✅ |
| Tăng lực chuyền và lực sút (đang quá yếu) | Phase 22 ✅ |
| Nút CONTROLS hiện hướng dẫn phím, thay nút NAMES | Phase 22 ✅ |
| Có thông báo khi bấm Sign Player | Phase 22 ✅ |
| Đổi tên màn CLUB (thị trường chuyển nhượng) thành TRANSFERS | Phase 22 ✅ |
| Đội hình 11 chính + 9 dự bị + đội hình ngoài, tối đa 50, không bán được người đá chính/dự bị | Phase 22 ✅ |
| LEAGUE: bỏ Overview, League table là tab đầu, tab thống kê cầu thủ toàn giải, Fixtures chỉ đội mình và hiện hết không chọn round | Phase 22 ✅ |
| Cấp độ CLB, XP và tiền thưởng sau trận | Phase 23 ✅ |
| 500 cầu thủ mặc định tự tạo làm nguồn dữ liệu | Phase 23 ✅ |
| Tab thẻ cầu thủ: mở gói và thẻ EP lúc nào tùy thích, thẻ +1, chặn mở khi đủ 50 người | Phase 23 ✅ |
| Lên cấp nhận thẻ EP 5.000.000 (cấp thường) / 10.000.000 (cấp chia hết cho 5) | Phase 23 ✅ |
| ID riêng cho cầu thủ, không trùng cầu thủ trong 20 người đá chính/dự bị | Phase 23 ✅ |
| Sút trúng cầu thủ đối phương (không phải thủ môn) thì bóng bật ra, không dính vào người | Phase 23 ✅ |
| Mỗi đội 3 bộ áo cố định (sân nhà, sân khách, thứ 3), chọn màu áo cho cả hai đội trước trận để tránh trùng | Phase 24 ✅ |
| Chỉ số sút / chuyền cao thì chuẩn xác hơn rõ rệt, chỉ số thấp thì kém rõ | Phase 24 ✅ |
| Nâng cấp thẻ bằng 2 thẻ cùng cầu thủ (+1 → +10), thất bại từ +5 chỉ tụt 1 cấp | Phase 25 ✅ |
| Thêm giải đấu khác (18 nước × 2 hạng, 720 CLB thật, lên / xuống hạng) | Phase 26A ✅ |
| Cho chọn / đổi CLB (lần đầu, đầu mùa, Settings; CLB cũ thành AI) | Phase 26B ✅ |
| Cúp C1 / C2 (cả 18 nước có suất, 8 bảng × 4, đấu loại 2 lượt, luân lưu mô phỏng, vô địch C2 dự C1) | Phase 27 ✅ |
| Tự đá luân lưu (điều khiển người sút và thủ môn), góc nhìn sau lưng người sút | Phase 29D ✅ |
| Độ khó chỉ hiện tên mức; thêm sơ đồ (4-1-4-1, kim cương, 4-3-2-1, 4-4-1-1, 4-2-2-2, 3-5-2, 3-4-3, 5-3-2), màn chọn sơ đồ có sân nhỏ | Sau 26B ✅ |
| Chiều cao, cân nặng của cầu thủ (ảnh hưởng thể hình 3D, sức mạnh, khéo léo, bóng bổng, tầm với thủ môn) | Phase 26C ✅ |
| Độ khó mỗi mùa: tăng cấp thẻ + của cầu thủ đối thủ, thưởng nhiều hơn khi khó hơn | Phase 26C ✅ |
| Team color kiểu FO4: cả 11 người đá chính cùng bậc thẻ (theo người thấp nhất) và cùng CLB thì được cộng chỉ số, đội AI cũng có | Phase 26D ✅ |
| World Cup 32 đội tuyển quốc gia (gọi cầu thủ từ các CLB), team color theo quốc tịch | Phase 29E ✅ |
| Luật bàn thắng sân khách ở vòng đấu loại 2 lượt; đá trái vị trí thì OVR hiển thị giảm | Sau 27 ✅ |
| Mô phỏng nhanh 5 trận mỗi ngày, có hoạt cảnh, thưởng ×0.7 | Phase 28 ✅ |
| Phòng truyền thống: danh hiệu của HLV (đổi CLB vẫn giữ), mỗi giải một kiểu cúp, sao độ khó, bảng sự nghiệp | Phase 28B ✅ |
| Người nhận bóng luôn chạy về phía bóng; SIMULATE NEXT sau trận; EP trên header; nút ⚙ Settings; trận 3 / 6 / 9 phút | Phase 29G ✅ |
| World Cup thành tab riêng, 2 lần / ngày, lưu tiến độ, thưởng theo vòng cao nhất | Phase 29H ✅ |
| Phong độ cầu thủ; thẻ thể lực / thẻ phong độ cho cả đội; thẻ tăng tỉ lệ đập +3–5% (tối đa 5 thẻ) | Phase 29I ✅ |
| Hình ảnh cầu thủ trong thẻ (vẽ bằng code, chỉ thẻ lớn) | Phase 29J ✅ |
| Cầu thủ trong trận 3D có màu da, màu tóc, kiểu tóc, râu giống thẻ | Sau 29J ✅ |
| Nền tảng mobile: chặn phóng to / cuộn trong trận, trận toàn màn hình, nhắc xoay ngang, sửa lỗi iPhone | Phase 29A1 ✅ |
| Điều khiển cảm ứng cơ bản: cần điều khiển + 4 nút | Phase 29A2 ✅ |
| Điều khiển cảm ứng nâng cao: vuốt trên nút, rung, tuỳ chỉnh nút | Phase 29A3 |
| Hiệu năng điện thoại: tự chọn đồ hoạ LOW, cài như ứng dụng | Phase 29A5 |
| Giao diện quản lý trên mobile (thanh tab dưới, màn hình theo từng bước) | Phase 29A4 |
| Đồ họa HIGH / LOW, khán đài có khán giả, cúp 3D, âm thanh trận đấu, hiệu năng, chuẩn bị phát hành | Phase 29B ✅ |
| Bảo hiểm khi đập thẻ thất bại (+5% mỗi lần hỏng, tối đa +30%) + thẻ bảo vệ không tụt cấp; xG tính cả cú sút bồi | Phase 29C ✅ |
| AI sút xa, chuyền dài theo chỉ số; thêm chỉ số Composure (quyết đoán) để tiền đạo dứt điểm thay vì chuyền vòng vo | Phase 29F ✅ |
| Người nhận bóng chủ động đón bóng, không né bóng; tăng tốc độ chuyền (+12%) và sút (+10%) | Phase 29F ✅ |
| Đổi tiếng khán giả (không còn "sôi sùng sục"), thêm âm lượng khán giả | Phase 29F ✅ |
| Auto Play ổn định hơn (chỉnh 5 / 10 / 20 giây, nút AUTO PLAY), máy đá thay thì tự đá hiệp 2 | Phase 29F ✅ |
| Nhiều mùa thẻ, crawl dữ liệu cầu thủ/logo thật | Backlog (trước là Phase 30) |
| Skill riêng cho từng cầu thủ | Backlog |

---

**Project:** Ultimate Football Manager 3D  
**Current delivery:** Steps 1–6 + Phases 15–29F (see roadmap)  
**Game mode:** 3D Football + Club Management  
**Match format:** 11 vs 11  
**Stack:** React + Vite + Three.js + React Three Fiber + Drei + Rapier  
**Persistence:** Browser LocalStorage
