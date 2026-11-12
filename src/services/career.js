// Phase 26B: CLB người chơi đang quản lý (id CLB thật trong data/world.js).
// Lưu trong bản lưu thế giới (world.userClubId); GameScene đặt lại giá trị này
// khi nạp game và khi đổi CLB, các màn hình / service đọc qua userClubId().
// Đổi CLB chỉ đổi đội: tên, áo, huy hiệu, giải đấu — thẻ, đội hình, EP, cấp
// CLB, kho đồ giữ nguyên.
import { LEGACY_CLUB_ALIASES, MAN_UTD_ID, worldClub } from '../data/world'

export const DEFAULT_USER_CLUB = MAN_UTD_ID

// Đội hình gốc (Huy Le, Salvatierra…) là cầu thủ Manchester United.
export const ORIGINAL_SQUAD_CLUB = MAN_UTD_ID

let current = DEFAULT_USER_CLUB
// Phase 29E: trong lúc đá World Cup, "đội của người chơi" là đội tuyển quốc
// gia ('nat-xxx'): tên, huy hiệu, áo, isUserClub… dùng đội tuyển. CLB vẫn được
// giữ nguyên (managedClubId) và quay lại khi rời World Cup.
let matchSide = null

export function setMatchSide(teamId) {
    matchSide = teamId || null
}

export const matchSideId = () => matchSide
export const managedClubId = () => current

export const normalizeClubId = (clubId) => LEGACY_CLUB_ALIASES[clubId] || clubId

export function setUserClubId(clubId) {
    const club = worldClub(normalizeClubId(clubId))

    if (club) current = club.id
    return current
}

export const userClubId = () => matchSide || current
export const userTeam = () => worldClub(matchSide || current)
export const isUserClub = (clubId) => normalizeClubId(clubId) === (matchSide || current)
