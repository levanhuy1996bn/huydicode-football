// Phase 26A: các CLB nằm trong thế giới bóng đá (data/world.js, 720 CLB thật).
// Phase 26B: CLB người chơi không còn cố định — xem services/career.js
// (userClubId(), userTeam()). Trong engine 3D 'blue' = phía đội mình,
// 'red' = phía đối thủ.
export { userClubId, userTeam } from '../services/career'

export const LEAGUE_STORAGE_KEY = 'ultimate-football-league-save'

export const LEAGUE_POINTS = {
    win: 3,
    draw: 1,
    loss: 0,
}
