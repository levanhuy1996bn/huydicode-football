// Phase 26A: các CLB giờ nằm trong thế giới bóng đá (data/world.js, 720 CLB
// thật). Đội 'blue' luôn là đội người chơi (Manchester United; id nội bộ giữ
// nguyên để không phá dữ liệu lưu và engine). 'red' chỉ còn là "ô đối thủ"
// trong engine 3D; dữ liệu cũ trỏ tới 'red' được hiểu là Manchester City.
import { USER_CLUB_ID, worldClub } from './world'

export const LEAGUE_STORAGE_KEY = 'ultimate-football-league-save'

export const LEAGUE_POINTS = {
    win: 3,
    draw: 1,
    loss: 0,
}

// Đội người chơi đang quản lý.
export const USER_TEAM_ID = USER_CLUB_ID
export const USER_TEAM = worldClub(USER_CLUB_ID)
