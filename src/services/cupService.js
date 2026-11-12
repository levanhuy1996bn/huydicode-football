// Phase 27: hai cúp châu lục kiểu cổ điển — C1 (Champions Cup) và C2
// (Challenge Cup), mỗi cúp 32 CLB của 18 nước.
//
// - Suất dự (cách B, theo bảng xếp hạng giải VĐQG mùa trước — world.qualified):
//     C1: nước hạng 1–4: top 4 · hạng 5–6: top 2 · hạng 7–18: vô địch.
//     C2: nước hạng 1–4: hạng 5–6 · hạng 5–6: hạng 3–4 · hạng 7–14: hạng 2–3 ·
//         hạng 15–18: hạng 2.
//   Mùa đầu tiên (chưa có mùa trước): theo thứ tự sức mạnh trong dữ liệu.
//   Vô địch C2 mùa trước được dự C1 (lấy suất của nhà vô địch nước có thứ
//   hạng thấp nhất, đội đó xuống C2); đã có suất C1 thì không đổi gì.
// - Thể thức: 8 bảng × 4 đội (đá vòng tròn 2 lượt, 6 lượt trận), nhất nhì
//   bảng vào vòng 16; vòng 16, tứ kết, bán kết đá 2 lượt (tổng tỉ số → bàn
//   thắng sân khách → luân lưu ngay sau lượt về, mô phỏng tự động); chung kết 1 trận trên
//   sân trung lập (hoà → luân lưu).
// - Lịch: 13 lượt trận cúp chen giữa các vòng giải (sau vòng 3, 6, … 36).
// - Lưu trữ (trong bản lưu giải đấu): league.cups = { season, entrants,
//   results, inactive }. Chỉ lưu kết quả các trận cúp người chơi đã đá;
//   bốc thăm và mọi trận khác tính lại tất định (seed theo mùa + cúp + trận).
import { COUNTRIES, LEAGUE_BY_ID, hashString, worldClub } from '../data/world'
import { worldSquad } from '../data/worldSquads'
import { getTeamById, simulateFixture } from './leagueService'
import { isUserClub } from './career'

export const CUPS = {
    c1: { id: 'c1', name: 'Champions Cup', short: 'C1' },
    c2: { id: 'c2', name: 'Challenge Cup', short: 'C2' },
}
export const CUP_IDS = ['c1', 'c2']
export const CUP_SIZE = 32
export const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// 13 lượt trận cúp; afterRound = đá ngay sau vòng giải này.
export const CUP_SCHEDULE = [
    { key: 'g1', stage: 'group', matchday: 1, afterRound: 3 },
    { key: 'g2', stage: 'group', matchday: 2, afterRound: 6 },
    { key: 'g3', stage: 'group', matchday: 3, afterRound: 9 },
    { key: 'g4', stage: 'group', matchday: 4, afterRound: 12 },
    { key: 'g5', stage: 'group', matchday: 5, afterRound: 15 },
    { key: 'g6', stage: 'group', matchday: 6, afterRound: 18 },
    { key: 'r16-1', stage: 'r16', leg: 1, afterRound: 21 },
    { key: 'r16-2', stage: 'r16', leg: 2, afterRound: 23 },
    { key: 'qf-1', stage: 'qf', leg: 1, afterRound: 26 },
    { key: 'qf-2', stage: 'qf', leg: 2, afterRound: 28 },
    { key: 'sf-1', stage: 'sf', leg: 1, afterRound: 31 },
    { key: 'sf-2', stage: 'sf', leg: 2, afterRound: 33 },
    { key: 'final', stage: 'final', leg: 1, afterRound: 36 },
]

export const STAGE_LABELS = {
    group: 'Group stage',
    r16: 'Round of 16',
    qf: 'Quarter-final',
    sf: 'Semi-final',
    final: 'Final',
}

const KNOCKOUT_STAGES = ['r16', 'qf', 'sf', 'final']

// Thưởng EP khi đi tiếp (× hệ số độ khó). Vô địch thêm gói Premium.
export const CUP_PRIZES = {
    c1: { group: 8000000, r16: 10000000, qf: 15000000, sf: 20000000, final: 40000000 },
    c2: { group: 4000000, r16: 5000000, qf: 8000000, sf: 10000000, final: 20000000 },
}

// Hệ số tiền thưởng / XP của một trận cúp so với trận giải.
export const CUP_MATCH_FACTOR = { c1: 1.5, c2: 1.25 }

// ---- Suất dự ----
// [hạng nước từ, đến, vị trí trong giải] — thứ tự = thứ tự ưu tiên.
const C1_SPOTS = [
    [1, 18, [1]],
    [1, 6, [2]],
    [1, 4, [3, 4]],
]
const C2_SPOTS = [
    [1, 4, [5, 6]],
    [5, 6, [3, 4]],
    [7, 14, [2, 3]],
    [15, 18, [2]],
]

function finalTables(world) {
    const tables = {}

    COUNTRIES.forEach((country) => {
        const stored = world?.qualified?.byLeague?.[country.topLeagueId]
        // Mùa đầu: thứ tự CLB trong giải (dữ liệu xếp mạnh → yếu).
        tables[country.id] = stored?.length ? stored : (world?.divisions?.[country.topLeagueId] || []).slice(0, 6)
    })

    return tables
}

function pickSpots(tables, spots) {
    const list = []

    spots.forEach(([fromRank, toRank, positions]) => {
        positions.forEach((position) => {
            COUNTRIES.filter((country) => country.rank >= fromRank && country.rank <= toRank)
                .sort((a, b) => a.rank - b.rank)
                .forEach((country) => {
                    const clubId = tables[country.id]?.[position - 1]

                    if (clubId) list.push(clubId)
                })
        })
    })

    return list
}

// Danh sách 32 đội mỗi cúp cho mùa mới của một thế giới.
export function computeEntrants(world) {
    const tables = finalTables(world)
    let c1 = pickSpots(tables, C1_SPOTS)
    let c2 = pickSpots(tables, C2_SPOTS)
    const lastCups = world?.history?.[world.history.length - 1]?.cups
    const c2Winner = lastCups?.c2

    if (c2Winner && worldClub(c2Winner) && !c1.includes(c2Winner)) {
        // Suất cuối của C1 = nhà vô địch nước hạng thấp nhất.
        const displaced = c1[17]

        c1 = [...c1.filter((id) => id !== displaced), c2Winner]
        c2 = c2.filter((id) => id !== c2Winner)
        if (displaced) c2 = [...c2, displaced]
        // Thừa thì bỏ suất có thứ tự ưu tiên thấp nhất (hạng 2 nước hạng 18).
        while (c2.length > CUP_SIZE) c2.splice(c2.length - 2, 1)
    }

    return { c1: c1.slice(0, CUP_SIZE), c2: c2.slice(0, CUP_SIZE) }
}

export function createCups(world, { inactive = false } = {}) {
    return { season: world.season, entrants: computeEntrants(world), results: {}, inactive }
}

// Cúp người chơi đá mùa này ('c1' | 'c2' | null).
export function userCupOf(league) {
    const cups = league?.cups

    if (!cups || cups.inactive) return null

    return CUP_IDS.find((cupId) => cups.entrants[cupId]?.some((id) => isUserClub(id))) || null
}

// ---- Tiện ích ----
function seeded(seed) {
    let value = seed % 2147483647

    if (value <= 0) value += 2147483646

    return () => {
        value = (value * 16807) % 2147483647
        return (value - 1) / 2147483646
    }
}

const strengthOf = (clubId) => getTeamById(clubId)?.strength || 60
const countryOf = (clubId) => worldClub(clubId)?.countryId

function shuffle(list, random) {
    const copy = [...list]

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1))
        ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
    }

    return copy
}

// ---- Bốc thăm vòng bảng: 4 nhóm hạt giống theo sức mạnh, tránh 2 đội cùng nước ----
function drawGroups(entrants, season, cupId) {
    const random = seeded(hashString(`${season}:${cupId}:groups`))
    const ordered = [...entrants].sort((a, b) => strengthOf(b) - strengthOf(a) || a.localeCompare(b))
    const groups = GROUP_NAMES.map(() => [])

    for (let pot = 0; pot < 4; pot += 1) {
        const clubs = shuffle(ordered.slice(pot * 8, pot * 8 + 8), random)

        clubs.forEach((clubId) => {
            const open = groups.filter((group) => group.length === pot)
            const clean = open.filter((group) => !group.some((other) => countryOf(other) === countryOf(clubId)))
            const target = (clean.length ? clean : open)[0]

            target?.push(clubId)
        })
    }

    return groups
}

// Thứ tự 6 lượt trận vòng bảng (chỉ số đội 0–3 trong bảng).
const GROUP_ROUNDS = [
    [[0, 1], [2, 3]],
    [[3, 0], [1, 2]],
    [[0, 2], [3, 1]],
    [[2, 0], [1, 3]],
    [[0, 3], [2, 1]],
    [[1, 0], [3, 2]],
]

function fixtureOf(season, cupId, entry, id, homeTeamId, awayTeamId, extra = {}) {
    return {
        id: `s${season}-${cupId}-${id}`,
        season,
        competition: cupId,
        stage: entry.stage,
        leg: entry.leg || null,
        matchday: entry.matchday || null,
        scheduleKey: entry.key,
        afterRound: entry.afterRound,
        round: entry.afterRound,
        homeTeamId,
        awayTeamId,
        played: false,
        homeGoals: null,
        awayGoals: null,
        ...extra,
    }
}

// ---- Luân lưu (mô phỏng) ----
// Kỹ năng sút luân lưu: trung bình chỉ số sút 5 người tốt nhất; thủ môn: OVR.
export function shootoutSkill(players = []) {
    const outfield = players.filter((player) => player.position !== 'GK')
    const shooters = [...outfield].sort((a, b) => (b.shooting || 0) - (a.shooting || 0)).slice(0, 5)
    const keeper = players.find((player) => player.position === 'GK')
    const shooting = shooters.length ? shooters.reduce((sum, player) => sum + (player.shooting || 60), 0) / shooters.length : 65

    return { shooting, keeper: keeper?.overall || 70 }
}

const aiSkill = (clubId) => shootoutSkill(worldSquad(clubId).slice(0, 11))

export function simulateShootout(seedText, homeSkill, awaySkill) {
    const random = seeded(hashString(`shootout:${seedText}`))
    const chance = (shooter, keeper) => Math.max(0.55, Math.min(0.92, 0.75 + (shooter - keeper) / 150))
    const kicks = []
    let home = 0
    let away = 0

    for (let round = 1; round <= 30; round += 1) {
        const homeScored = random() < chance(homeSkill.shooting, awaySkill.keeper)
        home += homeScored ? 1 : 0
        kicks.push({ side: 'home', scored: homeScored })

        if (round <= 5) {
            const left = 5 - round
            if (home > away + left + 1 || away > home + left) break
        }

        const awayScored = random() < chance(awaySkill.shooting, homeSkill.keeper)
        away += awayScored ? 1 : 0
        kicks.push({ side: 'away', scored: awayScored })

        if (round <= 5) {
            const left = 5 - round
            if (home > away + left || away > home + left) break
        } else if (home !== away) {
            break
        }
    }

    return { home, away, kicks }
}

// ---- Xem toàn bộ một cúp tới lượt trận thứ `done` ----
function groupStandings(group, fixtures) {
    const rows = new Map(group.map((teamId) => [teamId, {
        teamId,
        name: getTeamById(teamId)?.name || teamId,
        shortName: getTeamById(teamId)?.shortName || teamId,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    }]))

    fixtures.forEach((fixture) => {
        if (!fixture.played) return

        const home = rows.get(fixture.homeTeamId)
        const away = rows.get(fixture.awayTeamId)

        if (!home || !away) return

        home.played += 1
        away.played += 1
        home.goalsFor += fixture.homeGoals
        home.goalsAgainst += fixture.awayGoals
        away.goalsFor += fixture.awayGoals
        away.goalsAgainst += fixture.homeGoals

        if (fixture.homeGoals > fixture.awayGoals) {
            home.won += 1
            home.points += 3
            away.lost += 1
        } else if (fixture.homeGoals < fixture.awayGoals) {
            away.won += 1
            away.points += 3
            home.lost += 1
        } else {
            home.drawn += 1
            away.drawn += 1
            home.points += 1
            away.points += 1
        }
    })

    return [...rows.values()]
        .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
        .sort((a, b) =>
            b.points - a.points ||
            b.goalDifference - a.goalDifference ||
            b.goalsFor - a.goalsFor ||
            strengthOf(b.teamId) - strengthOf(a.teamId),
        )
}

const cache = new Map()

// cups: league.cups; done: số lượt trận cúp đã xong (0–13).
export function cupView(cups, cupId, done, userSkill = null) {
    if (!cups?.entrants?.[cupId]) return null

    const key = `${cups.season}:${cupId}:${done}:${JSON.stringify(cups.results || {})}:${cups.entrants[cupId].join(',')}`

    if (cache.has(key)) return cache.get(key)

    const season = cups.season
    const results = cups.results || {}
    const entrants = cups.entrants[cupId]
    const groups = drawGroups(entrants, season, cupId)
    const fixtures = []

    // Một trận: kết quả người chơi đã lưu, hoặc mô phỏng nếu lượt đó đã xong.
    const resolve = (fixture, scheduleIndex) => {
        const stored = results[fixture.id]

        if (stored) return { ...fixture, ...stored, played: true, simulated: false }

        const userMatch = isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId)

        if (scheduleIndex < done && !userMatch) return simulateFixture(fixture)

        return fixture
    }

    // Vòng bảng
    const groupFixtures = groups.map(() => [])

    CUP_SCHEDULE.slice(0, 6).forEach((entry, matchdayIndex) => {
        groups.forEach((group, groupIndex) => {
            GROUP_ROUNDS[matchdayIndex].forEach(([homeIndex, awayIndex]) => {
                const fixture = resolve(
                    fixtureOf(
                        season, cupId, entry,
                        `g${GROUP_NAMES[groupIndex]}-md${entry.matchday}-${homeIndex}${awayIndex}`,
                        group[homeIndex], group[awayIndex],
                        { group: GROUP_NAMES[groupIndex] },
                    ),
                    matchdayIndex,
                )

                groupFixtures[groupIndex].push(fixture)
                fixtures.push(fixture)
            })
        })
    })

    const groupTables = groups.map((group, index) => ({
        name: GROUP_NAMES[index],
        clubIds: group,
        standings: groupStandings(group, groupFixtures[index]),
        complete: done >= 6,
    }))

    // Vòng loại trực tiếp
    const ties = { r16: [], qf: [], sf: [], final: [] }
    let winners = null
    let champion = null

    if (done >= 6) {
        const random = seeded(hashString(`${season}:${cupId}:r16`))
        const groupWinners = groupTables.map((table) => table.standings[0].teamId)
        let runners = shuffle(groupTables.map((table) => table.standings[1].teamId), random)

        // Không gặp đội cùng bảng: đổi chỗ nếu trùng.
        for (let index = 0; index < 8; index += 1) {
            const sameGroup = (winnerIndex, runner) => groupTables[winnerIndex].clubIds.includes(runner)

            if (sameGroup(index, runners[index])) {
                const swap = runners.findIndex((runner, other) => other !== index && !sameGroup(index, runner) && !sameGroup(other, runners[index]))

                if (swap >= 0) [runners[index], runners[swap]] = [runners[swap], runners[index]]
            }
        }

        let pairs = groupWinners.map((winner, index) => [runners[index], winner])

        KNOCKOUT_STAGES.forEach((stage) => {
            if (!pairs) return

            const entries = CUP_SCHEDULE.filter((entry) => entry.stage === stage)
            const firstIndex = CUP_SCHEDULE.indexOf(entries[0])

            if (done < firstIndex) {
                pairs = null
                return
            }

            const stageTies = pairs.map(([a, b], tieIndex) => {
                const legs = entries.map((entry, legIndex) => {
                    const [home, away] = legIndex === 0 ? [a, b] : [b, a]

                    return resolve(
                        fixtureOf(season, cupId, entry, `${stage}-t${tieIndex + 1}-l${legIndex + 1}`, home, away, { tie: tieIndex + 1 }),
                        CUP_SCHEDULE.indexOf(entry),
                    )
                })
                const finished = legs.every((leg) => leg.played)
                // Tổng tỉ số theo từng CLB (a là chủ nhà lượt 1).
                const goalsFor = (clubId) =>
                    legs.reduce((sum, leg) => sum + (leg.played ? (leg.homeTeamId === clubId ? leg.homeGoals : leg.awayGoals) : 0), 0)
                const aggregate = { [a]: goalsFor(a), [b]: goalsFor(b) }
                let shootout = null
                let winner = null

                // Bàn thắng sân khách (chỉ vòng 2 lượt): a đá sân khách ở lượt 2,
                // b đá sân khách ở lượt 1.
                const awayGoals = legs.length === 2
                    ? {
                        [a]: legs[1].played ? legs[1].awayGoals : 0,
                        [b]: legs[0].played ? legs[0].awayGoals : 0,
                    }
                    : null
                let decidedBy = null

                if (finished) {
                    if (aggregate[a] !== aggregate[b]) {
                        winner = aggregate[a] > aggregate[b] ? a : b
                        decidedBy = 'aggregate'
                    } else if (awayGoals && awayGoals[a] !== awayGoals[b]) {
                        // Sau quick update Phase 27: luật bàn thắng sân khách.
                        winner = awayGoals[a] > awayGoals[b] ? a : b
                        decidedBy = 'awayGoals'
                    } else {
                        decidedBy = 'penalties'
                        const last = legs[legs.length - 1]
                        const stored = results[last.id]?.shootout

                        // Luân lưu: chủ nhà trận cuối sút trước.
                        if (stored) {
                            shootout = stored
                        } else {
                            const skillOf = (clubId) => (isUserClub(clubId) && userSkill ? userSkill : aiSkill(clubId))

                            shootout = simulateShootout(last.id, skillOf(last.homeTeamId), skillOf(last.awayTeamId))
                        }

                        winner = shootout.home > shootout.away ? last.homeTeamId : last.awayTeamId
                    }
                }

                legs.forEach((leg) => fixtures.push(leg))

                return { stage, index: tieIndex + 1, clubs: [a, b], legs, aggregate, awayGoals, decidedBy, shootout, winner, finished }
            })

            ties[stage] = stageTies

            const stageDone = stageTies.every((tie) => tie.finished)

            if (stage === 'final') {
                champion = stageDone ? stageTies[0]?.winner : null
                pairs = null
                return
            }

            if (!stageDone) {
                pairs = null
                return
            }

            // Bốc thăm vòng sau (tất định).
            const nextRandom = seeded(hashString(`${season}:${cupId}:${stage}:next`))
            const advancing = shuffle(stageTies.map((tie) => tie.winner), nextRandom)

            pairs = []
            for (let index = 0; index < advancing.length; index += 2) pairs.push([advancing[index], advancing[index + 1]])
            winners = advancing
        })
    }

    const view = {
        cupId,
        season,
        done,
        entrants,
        groups: groupTables,
        ties,
        fixtures,
        champion,
        lastAdvancing: winners,
    }

    if (cache.size > 40) cache.clear()
    cache.set(key, view)
    return view
}

// ---- Lịch chung của người chơi (giải + cúp) ----
const leagueRoundsPlayed = (league) =>
    (league?.fixtures || []).filter(
        (fixture) => fixture.played && (isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId)),
    ).length

// Số lượt trận cúp đã xong: đã qua vòng giải tương ứng và trận cúp của người
// chơi ở lượt đó (nếu có) đã đá.
export function cupMatchdaysDone(league) {
    const cups = league?.cups

    if (!cups || cups.inactive) return 0

    const rounds = leagueRoundsPlayed(league)
    const userCup = userCupOf(league)
    let done = 0

    for (let index = 0; index < CUP_SCHEDULE.length; index += 1) {
        if (rounds < CUP_SCHEDULE[index].afterRound) break

        if (userCup) {
            const view = cupView(cups, userCup, index)
            const userFixture = view?.fixtures.find(
                (fixture) =>
                    fixture.scheduleKey === CUP_SCHEDULE[index].key &&
                    (isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId)),
            )

            if (userFixture && !userFixture.played) break
        }

        done = index + 1
    }

    return done
}

// Mọi cúp tới thời điểm hiện tại.
export function currentCupView(league, cupId) {
    if (!league?.cups || league.cups.inactive) return null

    return cupView(league.cups, cupId, cupMatchdaysDone(league))
}

// Trận cúp của người chơi đã biết (vòng bảng + vòng đấu loại đã bốc thăm).
export function userCupFixtures(league) {
    const cupId = userCupOf(league)

    if (!cupId) return []

    // Xem tới lượt hiện tại + 1 để biết trận sắp tới.
    const done = cupMatchdaysDone(league)
    const view = cupView(league.cups, cupId, done)

    return (view?.fixtures || []).filter((fixture) => isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId))
}

// Vị trí trên lịch: vòng giải r → r × 10; lượt cúp sau vòng r → r × 10 + 5.
export const calendarSlot = (fixture) =>
    fixture.competition ? fixture.afterRound * 10 + 5 : (fixture.round || 0) * 10

export function userCalendar(league) {
    const leagueFixtures = (league?.fixtures || []).filter(
        (fixture) => isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId),
    )

    return [...leagueFixtures, ...userCupFixtures(league)].sort((a, b) => calendarSlot(a) - calendarSlot(b))
}

export function nextUserFixture(league) {
    return userCalendar(league).find((fixture) => !fixture.played) || null
}

export function findUserFixture(league, fixtureId) {
    if (!fixtureId) return null

    return (
        league?.fixtures?.find((fixture) => fixture.id === fixtureId) ||
        userCupFixtures(league).find((fixture) => fixture.id === fixtureId) ||
        null
    )
}

export function fixtureLabel(fixture) {
    if (!fixture) return ''
    if (!fixture.competition) return `ROUND ${fixture.round}`

    const cup = CUPS[fixture.competition]?.short || fixture.competition.toUpperCase()

    if (fixture.stage === 'group') return `${cup} · GROUP ${fixture.group} · MD ${fixture.matchday}`
    if (fixture.stage === 'final') return `${cup} · FINAL`

    return `${cup} · ${STAGE_LABELS[fixture.stage].toUpperCase()} · LEG ${fixture.leg}`
}

// Nhãn ngắn cho cột vòng đấu trong danh sách lịch (vd. "C2 MD3", "C1 QF L2").
const STAGE_SHORT = { r16: 'R16', qf: 'QF', sf: 'SF' }

export function fixtureShortLabel(fixture) {
    if (!fixture?.competition) return `R${fixture?.round ?? ''}`

    const cup = CUPS[fixture.competition]?.short || fixture.competition.toUpperCase()

    if (fixture.stage === 'group') return `${cup} MD${fixture.matchday}`
    if (fixture.stage === 'final') return `${cup} FINAL`

    return `${cup} ${STAGE_SHORT[fixture.stage]} L${fixture.leg}`
}

// ---- Ghi kết quả trận cúp của người chơi ----
// userSkill: kỹ năng luân lưu của đội người chơi (nếu phải đá luân lưu).
export function recordCupResult(league, fixtureId, homeGoals, awayGoals, userSkill = null) {
    const cups = league?.cups
    const fixture = findUserFixture(league, fixtureId)

    if (!cups || !fixture?.competition || fixture.played) return league

    const result = { homeGoals: Math.max(0, Number(homeGoals) || 0), awayGoals: Math.max(0, Number(awayGoals) || 0) }
    let next = { ...league, cups: { ...cups, results: { ...cups.results, [fixtureId]: result } } }

    // Lượt về / chung kết hoà tổng tỉ số → luân lưu (lưu lại để cố định).
    const index = CUP_SCHEDULE.findIndex((entry) => entry.key === fixture.scheduleKey)
    const view = cupView(next.cups, fixture.competition, index + 1, userSkill)
    const tie = view?.ties?.[fixture.stage]?.find((item) => item.legs.some((leg) => leg.id === fixtureId))

    if (tie?.finished && tie.shootout) {
        next = {
            ...next,
            cups: {
                ...next.cups,
                results: { ...next.cups.results, [fixtureId]: { ...result, shootout: tie.shootout } },
            },
        }
    }

    return next
}

// Kết quả cúp của người chơi sau một trận (cho màn sau trận + thưởng).
export function describeUserCupResult(league, fixtureId) {
    const fixture = findUserFixture(league, fixtureId)

    if (!fixture?.competition) return null

    const cupId = fixture.competition
    const index = CUP_SCHEDULE.findIndex((entry) => entry.key === fixture.scheduleKey)
    const view = cupView(league.cups, cupId, index + 1)
    const userId = fixture.homeTeamId && isUserClub(fixture.homeTeamId) ? fixture.homeTeamId : fixture.awayTeamId
    const info = { cupId, cupName: CUPS[cupId].name, label: fixtureLabel(fixture), stage: fixture.stage, outcome: null }

    if (fixture.stage === 'group') {
        const group = view.groups.find((item) => item.name === fixture.group)
        const position = group.standings.findIndex((row) => row.teamId === userId) + 1

        info.groupPosition = position

        if (fixture.matchday === 6) info.outcome = position <= 2 ? 'advanced' : 'eliminated'

        return info
    }

    const tie = view.ties[fixture.stage]?.find((item) => item.clubs.includes(userId))

    if (!tie) return info

    const opponent = tie.clubs.find((id) => id !== userId)

    info.aggregate = fixture.stage === 'final' ? null : { for: tie.aggregate[userId], against: tie.aggregate[opponent] }

    if (tie.finished && tie.decidedBy === 'awayGoals') {
        info.awayGoals = { for: tie.awayGoals[userId], against: tie.awayGoals[opponent] }
    }

    if (tie.shootout && tie.finished) {
        const last = tie.legs[tie.legs.length - 1]
        const userHome = last.homeTeamId === userId

        info.shootout = {
            for: userHome ? tie.shootout.home : tie.shootout.away,
            against: userHome ? tie.shootout.away : tie.shootout.home,
            kicks: tie.shootout.kicks.map((kick) => ({ ...kick, user: (kick.side === 'home') === userHome })),
        }
    }

    if (tie.finished) {
        info.outcome = tie.winner === userId ? (fixture.stage === 'final' ? 'champion' : 'advanced') : 'eliminated'
    }

    return info
}

// Thưởng EP khi đi tiếp (một lần cho mỗi vòng).
export function cupPrizeFor(cupId, stage, outcome) {
    if (outcome !== 'advanced' && outcome !== 'champion') return 0

    return CUP_PRIZES[cupId]?.[stage] || 0
}

// Vô địch hai cúp của mùa (cho lịch sử thế giới + suất C1 mùa sau).
export function cupWinners(league) {
    if (!league?.cups || league.cups.inactive) return null

    return Object.fromEntries(
        CUP_IDS.map((cupId) => [cupId, cupView(league.cups, cupId, CUP_SCHEDULE.length)?.champion || null]),
    )
}

export const leagueNameOf = (clubId, divisions) => {
    const entry = Object.entries(divisions || {}).find(([, ids]) => ids.includes(clubId))

    return entry ? LEAGUE_BY_ID.get(entry[0])?.name : ''
}
