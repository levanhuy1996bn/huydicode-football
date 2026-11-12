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
import {
    COUNTRIES,
    INITIAL_DIVISIONS,
    LEAGUE_BY_ID,
    USER_CLUB_ID,
    WORLD_LEAGUES,
} from '../data/world'
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

export function createInitialWorld(season = CURRENT_SEASON) {
    return {
        version: WORLD_VERSION,
        season,
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

    return all.length === 720 && new Set(all).size === 720 && all.includes(USER_CLUB_ID)
}

export function loadWorld() {
    try {
        const saved = localStorage.getItem(WORLD_STORAGE_KEY)
        const parsed = saved ? JSON.parse(saved) : null

        return isValidWorld(parsed) ? parsed : null
    } catch {
        return null
    }
}

export function saveWorld(world) {
    try {
        localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(world))
    } catch (error) {
        console.error('Could not save world data:', error)
    }
}

export function userLeagueId(world) {
    return WORLD_LEAGUES.find((league) => world.divisions[league.id]?.includes(USER_CLUB_ID))?.id || 'eng1'
}

// difficulty: mùa mới giữ độ khó của mùa trước (đổi được trước trận đầu tiên).
export function createLeagueForWorld(world, difficulty) {
    const leagueId = userLeagueId(world)

    return createInitialLeague(world.season, leagueId, world.divisions[leagueId], difficulty)
}

const sameClubs = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id))

const userPlayedAny = (league) =>
    (league?.fixtures || []).some(
        (fixture) => fixture.played && (fixture.homeTeamId === USER_CLUB_ID || fixture.awayTeamId === USER_CLUB_ID),
    )

// Nạp thế giới + giải của người chơi. Bản lưu giải cũ (trước Phase 26, giải
// 20 CLB bán hư cấu) được chuyển sang thế giới mới: bắt đầu mùa mới ở
// Premier League thật (đã đá trận nào thì sang mùa kế tiếp). Đội hình, thẻ,
// EP, cấp CLB, kho đồ không bị đụng tới.
export function loadGameWorld() {
    let world = loadWorld()
    const saved = readLeagueSave()

    if (isValidLeagueSave(saved)) {
        if (!world || world.season !== saved.season) {
            world = { ...(world || createInitialWorld(saved.season)), season: saved.season }
        }

        if (sameClubs(world.divisions[saved.leagueId], saved.clubIds)) {
            return { world, league: saved, migrated: false }
        }
    }

    const legacy = Boolean(saved && !saved.leagueId && Array.isArray(saved.fixtures))
    const season = legacy
        ? (saved.season || CURRENT_SEASON) + (userPlayedAny(saved) ? 1 : 0)
        : world?.season || CURRENT_SEASON

    if (!world || world.season !== season) world = createInitialWorld(season)

    return { world, league: createLeagueForWorld(world), migrated: legacy }
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
    return (league?.fixtures || []).filter(
        (fixture) => fixture.played && (fixture.homeTeamId === USER_CLUB_ID || fixture.awayTeamId === USER_CLUB_ID),
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
    const userPosition = userTable.indexOf(USER_CLUB_ID) + 1
    const entry = {
        season: world.season,
        champions,
        promoted,
        relegated,
        user: { leagueId: league.leagueId, position: userPosition },
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
    const before = userLeagueId(previousWorld)
    const after = userLeagueId(nextWorld)
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
