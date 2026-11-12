// Phase 26A: trạng thái thế giới (36 giải, lên / xuống hạng, lịch sử).
//
// Lưu rất ít (localStorage 'ultimate-football-world-save', ~16 KB):
//   { version, season, divisions: { leagueId: [20 clubId] }, history, qualified }
// - Giải của người chơi lưu đầy đủ ở bản lưu giải đấu (leagueService).
// - 35 giải còn lại là "giải ảo": không lưu lịch / tỉ số. Tỉ số sinh ngẫu nhiên
//   nhưng tất định theo (mùa, giải, trận) — lúc nào tính lại cũng ra đúng như
//   cũ, nên chỉ cần lưu danh sách CLB của mỗi giải.
// - Hết mùa: tính bảng cuối của cả 36 giải, 3 đội cuối hạng nhất xuống hạng,
//   3 đội đầu hạng hai lên hạng; lưu nhà vô địch, top 6 mỗi giải hạng nhất
//   (suất C1 / C2 cho Phase 27) và vị trí của người chơi vào lịch sử.
// - Phase 26B: world.userClubId = CLB người chơi đang quản lý (đổi được).
import {
    COUNTRIES,
    INITIAL_DIVISIONS,
    LEAGUE_BY_ID,
    LEGACY_CLUB_ALIASES,
    WORLD_LEAGUES,
    worldClub,
} from '../data/world'
import { DEFAULT_USER_CLUB, setUserClubId, userClubId } from './career'
import { LEAGUE_STORAGE_KEY } from '../data/leagueData'
import { ROSTER_STORAGE_KEY } from '../systems/roster'
import {
    CURRENT_SEASON,
    createInitialLeague,
    generateSeasonFixtures,
    getLeagueStandings,
    isValidLeagueSave,
    readLeagueSave,
    simulateFixture,
} from './leagueService'

export const WORLD_STORAGE_KEY = 'ultimate-football-world-save'
export const WORLD_VERSION = 1
export const PROMOTION_SPOTS = 3
export const QUALIFIER_SPOTS = 6
const HISTORY_LIMIT = 30

export function createInitialWorld(season = CURRENT_SEASON, clubId = DEFAULT_USER_CLUB) {
    return {
        version: WORLD_VERSION,
        season,
        userClubId: clubId,
        divisions: Object.fromEntries(
            Object.entries(INITIAL_DIVISIONS).map(([leagueId, clubIds]) => [leagueId, [...clubIds]]),
        ),
        history: [],
        qualified: null,
    }
}

function isValidWorld(world) {
    if (!world || world.version !== WORLD_VERSION || !world.divisions) return false

    const all = WORLD_LEAGUES.flatMap((league) => world.divisions[league.id] || [])

    return all.length === 720 && new Set(all).size === 720 && all.includes(world.userClubId)
}

// Phase 26B: bản lưu cũ dùng 'blue' cho Manchester United → đổi sang id thật.
// (Chỉ thay giá trị đúng bằng "blue" hoặc khoá "blue:…" của thống kê cầu
// thủ; id cầu thủ như "blue-9" giữ nguyên.)
function migrateLegacyIds(data) {
    if (!data) return data

    const legacy = 'blue'
    const target = LEGACY_CLUB_ALIASES[legacy]
    const json = JSON.stringify(data)

    if (!json.includes(`"${legacy}"`) && !json.includes(`"${legacy}:`)) return data

    return JSON.parse(
        json.split(`"${legacy}"`).join(`"${target}"`).split(`"${legacy}:`).join(`"${target}:`),
    )
}

function readWorldSave() {
    try {
        const saved = localStorage.getItem(WORLD_STORAGE_KEY)

        return saved ? JSON.parse(saved) : null
    } catch {
        return null
    }
}

export function loadWorld() {
    const parsed = migrateLegacyIds(readWorldSave())

    if (parsed && !parsed.userClubId) parsed.userClubId = DEFAULT_USER_CLUB
    if (parsed && !worldClub(parsed.userClubId)) parsed.userClubId = DEFAULT_USER_CLUB

    return isValidWorld(parsed) ? parsed : null
}

export function saveWorld(world) {
    try {
        localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(world))
    } catch (error) {
        console.error('Could not save world data:', error)
    }
}

export function userLeagueId(world, clubId = world.userClubId || userClubId()) {
    return WORLD_LEAGUES.find((league) => world.divisions[league.id]?.includes(clubId))?.id || 'eng1'
}

// difficulty: mùa mới giữ độ khó của mùa trước (đổi được trước trận đầu tiên).
export function createLeagueForWorld(world, difficulty) {
    const leagueId = userLeagueId(world)

    return createInitialLeague(world.season, leagueId, world.divisions[leagueId], difficulty)
}

const sameClubs = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id))

// Bản lưu giải trước Phase 26 (giải bán hư cấu, đội mình là 'blue').
const userPlayedAny = (league) =>
    (league?.fixtures || []).some(
        (fixture) => fixture.played && (fixture.homeTeamId === 'blue' || fixture.awayTeamId === 'blue'),
    )

const hasSave = (key) => {
    try {
        return localStorage.getItem(key) != null
    } catch {
        return false
    }
}

// Nạp thế giới + giải của người chơi. Bản lưu giải cũ (trước Phase 26, giải
// 20 CLB bán hư cấu) được chuyển sang thế giới mới: bắt đầu mùa mới ở
// Premier League thật (đã đá trận nào thì sang mùa kế tiếp). Đội hình, thẻ,
// EP, cấp CLB, kho đồ không bị đụng tới.
//
// Phase 26B: trả thêm firstRun (chưa có bản lưu nào → cho chọn CLB) và đặt
// CLB người chơi (career.js) theo bản lưu thế giới.
export function loadGameWorld() {
    const firstRun = ![WORLD_STORAGE_KEY, LEAGUE_STORAGE_KEY, ROSTER_STORAGE_KEY].some(hasSave)
    let world = loadWorld()
    const raw = readLeagueSave()
    const saved = raw?.leagueId ? migrateLegacyIds(raw) : raw

    setUserClubId(world?.userClubId || DEFAULT_USER_CLUB)

    if (isValidLeagueSave(saved)) {
        if (!world || world.season !== saved.season) {
            world = { ...(world || createInitialWorld(saved.season)), season: saved.season }
        }

        if (sameClubs(world.divisions[saved.leagueId], saved.clubIds)) {
            return { world, league: saved, migrated: false, firstRun }
        }
    }

    const legacy = Boolean(saved && !saved.leagueId && Array.isArray(saved.fixtures))
    const season = legacy
        ? (saved.season || CURRENT_SEASON) + (userPlayedAny(saved) ? 1 : 0)
        : world?.season || CURRENT_SEASON

    if (!world || world.season !== season) world = createInitialWorld(season, userClubId())

    return { world, league: createLeagueForWorld(world), migrated: legacy, firstRun }
}

// ---- Phase 26B: đổi CLB ----
// - Đầu mùa / cuối mùa (newSeason): tính hết mùa như bình thường với CLB cũ
//   (lên / xuống hạng, lịch sử), rồi mùa mới bắt đầu ở giải của CLB mới.
// - Giữa mùa: mùa hiện tại bắt đầu lại từ vòng 1 ở giải của CLB mới (kết
//   quả mùa đang đá bị bỏ); thế giới (các giải, mùa) giữ nguyên.
// Độ khó giữ như cũ (đổi lại được vì chưa đá trận nào).
export function switchClub(world, league, clubId, { newSeason = false } = {}) {
    const base = newSeason ? advanceWorld(world, league) : world
    const nextWorld = { ...base, userClubId: clubId }

    setUserClubId(clubId)

    return { world: nextWorld, league: createLeagueForWorld(nextWorld, league?.difficulty) }
}

// ---- Giải ảo ----
const virtualCache = new Map()

// Toàn bộ 380 trận (đã có tỉ số) của một giải ảo trong một mùa.
export function virtualFixtures(season, leagueId, clubIds) {
    const key = `${season}:${leagueId}:${clubIds.join(',')}`

    if (virtualCache.has(key)) return virtualCache.get(key)

    const fixtures = generateSeasonFixtures(season, clubIds, leagueId).map(simulateFixture)

    if (virtualCache.size > 80) virtualCache.clear()
    virtualCache.set(key, fixtures)
    return fixtures
}

// Số vòng người chơi đã đá: các giải khác chạy song song tới cùng vòng.
export function roundsPlayed(league) {
    const userId = userClubId()

    return (league?.fixtures || []).filter(
        (fixture) => fixture.played && (fixture.homeTeamId === userId || fixture.awayTeamId === userId),
    ).length
}

// Lịch + bảng xếp hạng của một giải bất kỳ (giải người chơi: dữ liệu thật).
export function leagueView(world, league, leagueId, rounds = roundsPlayed(league)) {
    const clubIds = world.divisions[leagueId] || []

    if (league && leagueId === league.leagueId) {
        return {
            leagueId,
            clubIds,
            fixtures: league.fixtures,
            standings: getLeagueStandings(league.fixtures, clubIds),
            isUserLeague: true,
            rounds,
        }
    }

    const fixtures = virtualFixtures(world.season, leagueId, clubIds).filter((fixture) => fixture.round <= rounds)

    return {
        leagueId,
        clubIds,
        fixtures,
        standings: getLeagueStandings(fixtures, clubIds),
        isUserLeague: false,
        rounds,
    }
}

// Vùng trên bảng: C1 / C2 (hạng nhất), lên hạng (hạng hai), xuống hạng (hạng nhất).
export function zoneOf(leagueId, position) {
    const league = LEAGUE_BY_ID.get(leagueId)

    if (!league) return null
    if (league.tier === 2) return position <= PROMOTION_SPOTS ? 'promotion' : null
    if (position > 20 - PROMOTION_SPOTS) return 'relegation'
    if (position <= 4) return 'c1'
    if (position <= QUALIFIER_SPOTS) return 'c2'

    return null
}

// ---- Hết mùa ----
export function advanceWorld(world, league) {
    const final = (leagueId) => leagueView(world, league, leagueId, 38).standings.map((row) => row.teamId)
    const divisions = { ...world.divisions }
    const champions = {}
    const promoted = {}
    const relegated = {}
    const qualified = {}

    COUNTRIES.forEach((country) => {
        const top = final(country.topLeagueId)
        const second = final(country.secondLeagueId)
        const down = top.slice(-PROMOTION_SPOTS)
        const up = second.slice(0, PROMOTION_SPOTS)

        champions[country.topLeagueId] = top[0]
        champions[country.secondLeagueId] = second[0]
        qualified[country.topLeagueId] = top.slice(0, QUALIFIER_SPOTS)
        promoted[country.id] = up
        relegated[country.id] = down

        divisions[country.topLeagueId] = [...top.slice(0, -PROMOTION_SPOTS), ...up]
        divisions[country.secondLeagueId] = [...second.slice(PROMOTION_SPOTS), ...down]
    })

    const userTable = final(league.leagueId)
    const userPosition = userTable.indexOf(world.userClubId || userClubId()) + 1
    const entry = {
        season: world.season,
        champions,
        promoted,
        relegated,
        user: { clubId: world.userClubId || userClubId(), leagueId: league.leagueId, position: userPosition },
    }

    return {
        ...world,
        season: world.season + 1,
        divisions,
        qualified: { season: world.season, byLeague: qualified },
        history: [...(world.history || []), entry].slice(-HISTORY_LIMIT),
    }
}

// Tóm tắt mùa vừa xong của người chơi (dùng cho thông báo).
export function seasonOutcome(previousWorld, nextWorld) {
    // CLB đã đá mùa vừa xong (nếu người chơi đổi CLB lúc sang mùa thì vẫn
    // báo lên / xuống hạng của CLB cũ).
    const clubId = previousWorld.userClubId || userClubId()
    const before = userLeagueId(previousWorld, clubId)
    const after = userLeagueId(nextWorld, clubId)
    const last = nextWorld.history?.[nextWorld.history.length - 1]
    const beforeTier = LEAGUE_BY_ID.get(before)?.tier
    const afterTier = LEAGUE_BY_ID.get(after)?.tier

    return {
        position: last?.user?.position || null,
        from: LEAGUE_BY_ID.get(before),
        to: LEAGUE_BY_ID.get(after),
        movement: afterTier < beforeTier ? 'promoted' : afterTier > beforeTier ? 'relegated' : 'stayed',
        champion: last?.champions?.[before] || null,
    }
}
