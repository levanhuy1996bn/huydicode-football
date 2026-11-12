// Phase 22: thống kê cầu thủ cả mùa cho toàn giải (20 đội).
//
// - Trận của Manchester United: lấy số liệu thật từ engine lúc hết trận và lưu
//   vào league.userMatchStats[fixtureId] (lưu cùng giải, mùa mới tự reset).
// - Các trận AI được mô phỏng (chỉ có tỉ số): sinh người ghi bàn, kiến tạo,
//   đường chuyền và điểm số một cách tất định theo từng trận (cùng seed thì
//   luôn ra cùng kết quả), nên không cần lưu và luôn khớp với tỉ số.
import { LEAGUE_TEAMS } from '../data/leagueData'
import { buildMatchRoster, createInitialRoster, getRole } from '../systems/roster'
import { clamp } from '../systems/constants'
import { ratePlayer } from '../systems/matchStats'

const USER_CLUB = 'blue'

function hashString(value) {
    let hash = 2166136261

    for (const char of String(value)) {
        hash ^= char.charCodeAt(0)
        hash = Math.imul(hash, 16777619) >>> 0
    }

    return hash
}

function seededRandom(seed) {
    let value = seed % 2147483647

    if (value <= 0) value += 2147483646

    return () => {
        value = (value * 16807) % 2147483647
        return (value - 1) / 2147483646
    }
}

function pickWeighted(random, items, weightOf) {
    const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0)

    if (total <= 0) return items[0] || null

    let roll = random() * total

    for (const item of items) {
        roll -= Math.max(0, weightOf(item))
        if (roll <= 0) return item
    }

    return items[items.length - 1] || null
}

// Đội hình (tất định) của một CLB AI: cùng nguồn với đối thủ trong trận 3D
// (systems/roster.js → buildMatchRoster), nên tên cầu thủ khớp nhau.
const squadCache = new Map()

export function clubSquad(clubId) {
    if (squadCache.has(clubId)) return squadCache.get(clubId)

    const opponent = LEAGUE_TEAMS.find((team) => team.id === clubId) || null
    const roster = buildMatchRoster(createInitialRoster(), opponent)
    const red = roster.find((team) => team.id === 'red')
    const squad = {
        starters: red?.players || [],
        bench: red?.substitutes || [],
    }

    squadCache.set(clubId, squad)
    return squad
}

export const playerKey = (clubId, player) =>
    clubId === USER_CLUB ? `${USER_CLUB}:${player.id}` : `${clubId}:${player.number}`

function emptyEntry(clubId, player) {
    return {
        key: playerKey(clubId, player),
        clubId,
        name: player.name,
        number: player.number,
        position: player.position,
        apps: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        passes: 0,
        passesCompleted: 0,
        ratingSum: 0,
        ratingCount: 0,
    }
}

const SHOT_WEIGHT = { FW: 3, MF: 1.4, DF: 0.35, GK: 0 }
const ASSIST_WEIGHT = { FW: 1.5, MF: 2.2, DF: 0.7, GK: 0.05 }
const PASS_VOLUME = { GK: 6, DF: 9, MF: 11, FW: 6 }

// Một đội trong một trận mô phỏng.
function simulateSide(random, clubId, goalsFor, goalsAgainst) {
    const { starters, bench } = clubSquad(clubId)

    if (!starters.length) return []

    const subsUsed = [...bench]
        .filter((player) => getRole(player) !== 'GK')
        .sort(() => random() - 0.5)
        .slice(0, 2 + Math.floor(random() * 2))
    const appeared = [...starters, ...subsUsed]
    const lines = new Map(
        appeared.map((player) => [
            player.id,
            { goals: 0, assists: 0, shots: 0, passes: 0, passesCompleted: 0, tackles: 0, saves: 0, interceptions: 0, duels: 0 },
        ]),
    )

    for (let goal = 0; goal < goalsFor; goal += 1) {
        const scorer = pickWeighted(random, appeared, (player) =>
            (SHOT_WEIGHT[getRole(player)] ?? 1) * (player.shooting || 60) * (starters.includes(player) ? 1 : 0.45),
        )

        if (!scorer) continue

        lines.get(scorer.id).goals += 1

        if (random() < 0.75) {
            const provider = pickWeighted(
                random,
                appeared.filter((player) => player.id !== scorer.id),
                (player) => (ASSIST_WEIGHT[getRole(player)] ?? 1) * (player.passing || 60),
            )

            if (provider) lines.get(provider.id).assists += 1
        }
    }

    appeared.forEach((player) => {
        const role = getRole(player)
        const line = lines.get(player.id)
        const minutesShare = starters.includes(player) ? 1 : 0.35
        const attempts = Math.max(
            1,
            Math.round((PASS_VOLUME[role] ?? 8) * minutesShare * (0.6 + random() * 0.8)),
        )
        const accuracy = clamp(0.62 + ((player.passing || 60) - 50) * 0.0065 + (random() - 0.5) * 0.12, 0.5, 0.97)

        line.passes = attempts
        line.passesCompleted = Math.min(attempts, Math.round(attempts * accuracy))
        line.shots = line.goals + (random() < (SHOT_WEIGHT[role] || 0) / 4 ? 1 : 0)
        line.tackles = role === 'DF' || role === 'MF' ? Math.floor(random() * 3) : 0
        line.interceptions = role === 'DF' ? Math.floor(random() * 3) : 0
        line.saves = role === 'GK' ? Math.floor(random() * 4) : 0
    })

    return appeared.map((player) => {
        const line = lines.get(player.id)
        const entry = emptyEntry(clubId, player)
        const rating = ratePlayer(player, line, { goalsFor, goalsAgainst })

        return {
            ...entry,
            apps: 1,
            goals: line.goals,
            assists: line.assists,
            cleanSheets: getRole(player) === 'GK' && goalsAgainst === 0 ? 1 : 0,
            passes: line.passes,
            passesCompleted: line.passesCompleted,
            ratingSum: rating,
            ratingCount: 1,
        }
    })
}

// Số liệu cầu thủ của một trận AI đã mô phỏng (tất định theo id trận).
export function simulatedFixtureEntries(fixture) {
    if (!fixture?.played) return []

    const random = seededRandom(hashString(`${fixture.id}:${fixture.homeGoals}-${fixture.awayGoals}`))

    return [
        ...simulateSide(random, fixture.homeTeamId, fixture.homeGoals, fixture.awayGoals),
        ...simulateSide(random, fixture.awayTeamId, fixture.awayGoals, fixture.homeGoals),
    ]
}

// Số liệu thật của trận người chơi (gọi lúc hết trận).
// bluePlayers: cầu thủ MUN đã ra sân (summary.ratings); redPlayers: đội hình đối thủ.
export function userMatchEntries({ stats, bluePlayers, redPlayers, opponentClubId, blueScore, redScore }) {
    const lineOf = (id) => ({
        goals: 0, assists: 0, shots: 0, passes: 0, tackles: 0, saves: 0,
        interceptions: 0, duels: 0, passesCompleted: 0,
        ...(stats?.players?.[id] || {}),
    })

    const side = (clubId, players, goalsFor, goalsAgainst) =>
        players.map((player) => {
            const line = lineOf(player.id)
            const rating = player.rating ?? ratePlayer(player, line, { goalsFor, goalsAgainst })

            return {
                ...emptyEntry(clubId, player),
                apps: 1,
                goals: line.goals,
                assists: line.assists,
                cleanSheets: getRole(player) === 'GK' && goalsAgainst === 0 ? 1 : 0,
                passes: line.passes,
                passesCompleted: line.passesCompleted || 0,
                ratingSum: rating,
                ratingCount: rating == null ? 0 : 1,
            }
        })

    return [
        ...side(USER_CLUB, bluePlayers, blueScore, redScore),
        ...side(opponentClubId, redPlayers, redScore, blueScore),
    ]
}

export function recordUserMatchStats(league, fixtureId, entries) {
    if (!league || !fixtureId) return league

    return {
        ...league,
        userMatchStats: {
            ...(league.userMatchStats || {}),
            [fixtureId]: entries,
        },
    }
}

// Bảng tổng hợp cả mùa: mỗi cầu thủ một dòng.
export function buildSeasonPlayerStats(league) {
    const totals = new Map()

    const add = (entry) => {
        const current = totals.get(entry.key)

        if (!current) {
            totals.set(entry.key, { ...entry })
            return
        }

        current.name = entry.name
        current.position = entry.position
        current.apps += entry.apps
        current.goals += entry.goals
        current.assists += entry.assists
        current.cleanSheets += entry.cleanSheets
        current.passes += entry.passes
        current.passesCompleted += entry.passesCompleted
        current.ratingSum += entry.ratingSum || 0
        current.ratingCount += entry.ratingCount || 0
    }

    ;(league?.fixtures || []).forEach((fixture) => {
        if (!fixture.played) return

        const stored = league.userMatchStats?.[fixture.id]

        if (stored) {
            stored.forEach(add)
        } else if (fixture.simulated) {
            simulatedFixtureEntries(fixture).forEach(add)
        }
    })

    return [...totals.values()].map((row) => ({
        ...row,
        passAccuracy: row.passes > 0 ? Math.round((row.passesCompleted / row.passes) * 100) : null,
        averageRating: row.ratingCount > 0 ? Math.round((row.ratingSum / row.ratingCount) * 100) / 100 : null,
    }))
}
