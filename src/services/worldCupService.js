// Phase 29E: World Cup — 32 đội tuyển.
// Phase 29H: không còn lịch 4 năm một lần — tab WORLD CUP riêng, bắt đầu giải
// lúc nào cũng được (2 giải mỗi ngày, tính lúc bắt đầu), giải đang đá được lưu
// và đá tiếp lúc khác; mỗi lần chỉ một giải. Các kỳ đánh số World Cup #1, #2…
// (bản lưu Phase 29E có edition = năm, ví dụ 2027, vẫn đọc được).
//
// Lưu trong bản lưu thế giới (world.worldCup) rất ít: đội tuyển của người chơi,
// 32 đội + độ mạnh, 8 bảng đã bốc thăm, kết quả các trận của người chơi. Trận
// của các đội khác mô phỏng tất định (cùng hạt giống → cùng tỉ số).
// Thể thức: 8 bảng × 4 (đá vòng tròn 1 lượt, 2 đội đầu đi tiếp) → vòng 16 đội →
// tứ kết → bán kết → tranh hạng ba → chung kết; vòng loại trực tiếp đá 1 trận,
// hoà thì luân lưu (người chơi tự đá — Phase 29D).
import { NATIONS, NATION_BY_ID } from '../data/nations'
import { hashString } from '../data/world'
import { nationStrength, nationalSquad } from './nationalTeams'
import { shootoutSkill } from './cupService'
import { finishShootout, toCupShootout } from '../systems/shootoutRules'
import { todayKey } from './quickSim'

// ---- Phase 29H: 2 giải mỗi ngày (world.worldCupDaily = { date, used }) ----
export const WC_DAILY_LIMIT = 2

export function worldCupStartsLeft(world, now = new Date()) {
    const daily = world?.worldCupDaily
    const used = daily?.date === todayKey(now) ? daily.used || 0 : 0

    return Math.max(0, WC_DAILY_LIMIT - used)
}

export function spendWorldCupStart(world, now = new Date()) {
    const key = todayKey(now)
    const used = world?.worldCupDaily?.date === key ? world.worldCupDaily.used || 0 : 0

    return { ...world, worldCupDaily: { date: key, used: used + 1 } }
}

// Khoá của giải (dùng trong id trận và hạt giống): giải mới 'n3', bản lưu cũ = năm.
export const worldCupKey = (wc) => wc?.key || wc?.edition

// Hạt giống mô phỏng: bản lưu Phase 29E (không có seed) giữ công thức cũ để
// giải đang đá dở không đổi kết quả.
const seedBase = (wc) => (wc.seed == null ? `${wc.edition}` : `${wc.key}:${wc.seed}`)

// Kỳ tiếp theo: số thứ tự (World Cup #N).
export const nextWorldCupNumber = (world) => (world?.worldCupCount || 0) + 1

// Lịch sử các kỳ (world.worldCupHistory, mới nhất trước, tối đa 30).
export function archiveWorldCup(world, wc) {
    if (!wc || wc.status !== 'done') return world

    const entry = {
        key: worldCupKey(wc),
        edition: wc.edition,
        nationId: wc.nationId,
        finalStanding: wc.finalStanding || null,
        champion: wc.champion || null,
        skipped: Boolean(wc.skipped),
        season: wc.season,
        prize: wc.prize || 0,
        difficulty: wc.difficulty || null,
    }
    const history = (world.worldCupHistory || []).filter((item) => item.key !== entry.key)

    return { ...world, worldCupHistory: [entry, ...history].slice(0, 30) }
}

export const WC_ROUNDS = ['md1', 'md2', 'md3', 'r16', 'qf', 'sf', 'third', 'final']
export const WC_ROUND_LABELS = {
    md1: 'Group stage · matchday 1',
    md2: 'Group stage · matchday 2',
    md3: 'Group stage · matchday 3',
    r16: 'Round of 16',
    qf: 'Quarter-final',
    sf: 'Semi-final',
    third: 'Third-place match',
    final: 'Final',
}
const SHORT = { md1: 'MD1', md2: 'MD2', md3: 'MD3', r16: 'R16', qf: 'QF', sf: 'SF', third: '3RD', final: 'FINAL' }
export const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// Phase 29H: thưởng theo thành tích CAO NHẤT của cả giải (không cộng dồn),
// trao khi giải kết thúc (× độ khó). Vô địch thêm gói Premium + thẻ bảo vệ.
// Giải bị bỏ qua / mô phỏng phần còn lại thì không có thưởng.
export const WC_PRIZES = {
    r16: 5000000,
    qf: 8000000,
    fourth: 12000000,
    third: 15000000,
    runnerUp: 18000000,
    champion: 35000000,
}

export const worldCupPrize = (finalStanding) => WC_PRIZES[finalStanding] || 0

function seeded(seed) {
    let value = seed % 2147483647

    if (value <= 0) value += 2147483646

    return () => {
        value = (value * 16807) % 2147483647
        return (value - 1) / 2147483646
    }
}

// ---- Tạo giải ----
// number: số thứ tự kỳ (World Cup #number); seed: hạt giống bốc thăm / mô phỏng.
// Phase 30C: difficulty = độ khó của giải (đối thủ + thưởng), chọn khi bắt đầu.
export function createWorldCup(season, nationId, { number = 1, seed = null, difficulty = null } = {}) {
    const edition = `#${number}`
    const key = `n${number}`
    const drawSeed = seed ?? hashString(`wc:${key}:${nationId}`)
    const strength = Object.fromEntries(NATIONS.map((nation) => [nation.id, nationStrength(nation.id)]))
    const ordered = [...NATIONS].sort((a, b) => strength[b.id] - strength[a.id] || a.seed - b.seed)
    const random = seeded(hashString(`wc:${key}:${drawSeed}:draw`))
    const pots = [0, 1, 2, 3].map((pot) => {
        const list = ordered.slice(pot * 8, pot * 8 + 8).map((nation) => nation.id)

        // Xáo trộn tất định trong mỗi nhóm hạt giống.
        for (let i = list.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1))
            ;[list[i], list[j]] = [list[j], list[i]]
        }

        return list
    })
    const groups = GROUP_NAMES.map((name, index) => ({ name, teams: pots.map((pot) => pot[index]) }))

    return {
        edition,
        key,
        number,
        seed: drawSeed,
        season,
        nationId,
        teams: ordered.map((nation) => nation.id),
        strength,
        groups,
        results: {},
        simulatedTo: 0,
        status: 'active',
        champion: null,
        difficulty,
    }
}

// ---- Mô phỏng một trận (tất định) ----
function poisson(lambda, random) {
    const limit = Math.exp(-lambda)
    let k = 0
    let p = 1

    do {
        k += 1
        p *= random()
    } while (p > limit && k < 9)

    return Math.min(6, k - 1)
}

function simulateMatch(wc, fixture) {
    const random = seeded(hashString(`wc:${seedBase(wc)}:${fixture.id}`))
    const a = wc.strength[fixture.homeTeamId] || 75
    const b = wc.strength[fixture.awayTeamId] || 75
    const homeGoals = poisson(1.25 * Math.exp((a - b) / 11), random)
    const awayGoals = poisson(1.25 * Math.exp((b - a) / 11), random)

    return { homeGoals, awayGoals }
}

const skillOf = (nationId) => shootoutSkill(nationalSquad(nationId).slice(0, 11))

function simulatedShootout(wc, fixture) {
    const random = seeded(hashString(`wc:${seedBase(wc)}:${fixture.id}:pens`))
    const kicks = finishShootout([], 'blue', { blue: skillOf(fixture.homeTeamId), red: skillOf(fixture.awayTeamId) }, random)

    return toCupShootout(kicks, true)
}

// ---- Bảng xếp hạng một bảng ----
function standingsOf(group, fixtures, wc) {
    const rows = new Map(group.teams.map((teamId) => [teamId, { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }]))

    fixtures.filter((fixture) => fixture.played).forEach((fixture) => {
        const home = rows.get(fixture.homeTeamId)
        const away = rows.get(fixture.awayTeamId)

        home.played += 1
        away.played += 1
        home.goalsFor += fixture.homeGoals
        home.goalsAgainst += fixture.awayGoals
        away.goalsFor += fixture.awayGoals
        away.goalsAgainst += fixture.homeGoals

        if (fixture.homeGoals > fixture.awayGoals) {
            home.won += 1
            away.lost += 1
            home.points += 3
        } else if (fixture.homeGoals < fixture.awayGoals) {
            away.won += 1
            home.lost += 1
            away.points += 3
        } else {
            home.drawn += 1
            away.drawn += 1
            home.points += 1
            away.points += 1
        }
    })

    return [...rows.values()]
        .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
        .sort(
            (a, b) =>
                b.points - a.points ||
                b.goalDifference - a.goalDifference ||
                b.goalsFor - a.goalsFor ||
                (wc.strength[b.teamId] || 0) - (wc.strength[a.teamId] || 0),
        )
}

// Cặp đấu vòng 16 đội: nhất A – nhì B, nhất C – nhì D… rồi nhất B – nhì A…
const R16_PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7], [1, 0], [3, 2], [5, 4], [7, 6]]

function groupFixtures(wc, round) {
    const md = Number(round.slice(2))
    const pairs = { 1: [[0, 1], [2, 3]], 2: [[0, 2], [3, 1]], 3: [[3, 0], [1, 2]] }[md]

    return wc.groups.flatMap((group) =>
        pairs.map(([a, b], index) => ({
            id: `wc${worldCupKey(wc)}-g${group.name}-md${md}-${index + 1}`,
            round,
            stage: 'group',
            group: group.name,
            matchday: md,
            homeTeamId: group.teams[a],
            awayTeamId: group.teams[b],
        })),
    )
}

function knockoutFixtures(wc, round, pairs) {
    return pairs.map(([home, away], index) => ({
        id: round === 'third' || round === 'final' ? `wc${worldCupKey(wc)}-${round}` : `wc${worldCupKey(wc)}-${round}-${index + 1}`,
        round,
        stage: round,
        tie: index + 1,
        homeTeamId: home,
        awayTeamId: away,
    }))
}

const winnerOf = (fixture) => {
    if (!fixture.played) return null
    if (fixture.homeGoals !== fixture.awayGoals) return fixture.homeGoals > fixture.awayGoals ? fixture.homeTeamId : fixture.awayTeamId
    if (fixture.shootout) return fixture.shootout.home > fixture.shootout.away ? fixture.homeTeamId : fixture.awayTeamId

    return null
}
const loserOf = (fixture) => {
    const winner = winnerOf(fixture)

    return winner ? (winner === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId) : null
}

// ---- Trạng thái đầy đủ của giải (tính lại từ kết quả đã lưu) ----
const cache = new Map()

export function worldCupState(wc) {
    if (!wc) return null

    const key = `${worldCupKey(wc)}:${wc.seed ?? ''}:${wc.nationId}:${wc.simulatedTo}:${JSON.stringify(wc.results)}`

    if (cache.has(key)) return cache.get(key)

    const user = wc.nationId
    const rounds = []
    let done = 0
    let blocked = false
    let groups = wc.groups.map((group) => ({ ...group, standings: standingsOf(group, [], wc) }))

    const resolve = (fixture, roundIndex) => {
        const stored = wc.results[fixture.id]
        const isUser = fixture.homeTeamId === user || fixture.awayTeamId === user

        if (stored) return { ...fixture, ...stored, played: true, user: isUser, simulated: false }
        if (isUser && roundIndex >= wc.simulatedTo) return { ...fixture, played: false, user: true }

        const result = simulateMatch(wc, fixture)
        const shootout = fixture.stage !== 'group' && result.homeGoals === result.awayGoals ? simulatedShootout(wc, fixture) : null

        return { ...fixture, ...result, ...(shootout ? { shootout } : {}), played: true, user: isUser, simulated: true }
    }

    for (let index = 0; index < WC_ROUNDS.length && !blocked; index += 1) {
        const round = WC_ROUNDS[index]
        let fixtures

        if (round.startsWith('md')) {
            fixtures = groupFixtures(wc, round)
        } else if (round === 'r16') {
            fixtures = knockoutFixtures(wc, round, R16_PAIRS.map(([a, b]) => [groups[a].standings[0].teamId, groups[b].standings[1].teamId]))
        } else if (round === 'qf' || round === 'sf') {
            const previous = rounds[index - 1].fixtures
            const pairs = []

            for (let i = 0; i < previous.length; i += 2) pairs.push([winnerOf(previous[i]), winnerOf(previous[i + 1])])
            fixtures = knockoutFixtures(wc, round, pairs)
        } else {
            const semis = rounds.find((entry) => entry.round === 'sf').fixtures

            fixtures = knockoutFixtures(
                wc,
                round,
                [round === 'third' ? [loserOf(semis[0]), loserOf(semis[1])] : [winnerOf(semis[0]), winnerOf(semis[1])]],
            )
        }

        // Người chơi chưa đá trận của vòng này (và chưa được mô phỏng) → các
        // trận khác của vòng cũng chờ. Vòng không có người chơi (vd. tranh hạng
        // ba khi người chơi vào chung kết) thì mô phỏng luôn.
        const userFixture = fixtures.find((fixture) => fixture.homeTeamId === user || fixture.awayTeamId === user)
        const userPending = userFixture && !wc.results[userFixture.id] && index >= wc.simulatedTo

        if (userPending) {
            rounds.push({ round, fixtures: fixtures.map((fixture) => ({ ...fixture, played: false, user: fixture === userFixture })) })
            blocked = true
            break
        }

        const resolved = fixtures.map((fixture) => resolve(fixture, index))

        rounds.push({ round, fixtures: resolved })
        done = index + 1

        if (round === 'md3' || round.startsWith('md')) {
            const groupFixturesSoFar = rounds.filter((entry) => entry.round.startsWith('md')).flatMap((entry) => entry.fixtures)

            groups = wc.groups.map((group) => ({
                ...group,
                standings: standingsOf(group, groupFixturesSoFar.filter((fixture) => fixture.group === group.name), wc),
            }))
        }
    }

    const final = rounds.find((entry) => entry.round === 'final')?.fixtures[0]
    const champion = final?.played ? winnerOf(final) : null

    // Người chơi: còn trong giải không, đi tới đâu.
    const userRounds = rounds.flatMap((entry) => entry.fixtures).filter((fixture) => fixture.homeTeamId === user || fixture.awayTeamId === user)
    const lastUser = [...userRounds].reverse().find((fixture) => fixture.played)
    const nextUser = userRounds.find((fixture) => !fixture.played) || null
    const userGroup = groups.find((group) => group.teams.includes(user))
    const groupDone = done >= 3
    const groupPosition = userGroup ? userGroup.standings.findIndex((row) => row.teamId === user) + 1 : null
    let userOut = false

    if (groupDone && groupPosition > 2) userOut = true
    if (lastUser && lastUser.stage !== 'group' && lastUser.stage !== 'sf' && lastUser.stage !== 'third' && loserOf(lastUser) === user) userOut = true
    if (lastUser && (lastUser.stage === 'third' || lastUser.stage === 'final')) userOut = true

    const state = {
        rounds,
        groups,
        done,
        champion,
        finished: Boolean(champion) && rounds.find((entry) => entry.round === 'third')?.fixtures[0]?.played,
        nextUser,
        userOut: userOut && !nextUser,
        groupPosition,
        finalStanding: finalStandingOf(rounds, user, groupPosition, groupDone),
    }

    if (cache.size > 40) cache.clear()
    cache.set(key, state)
    return state
}

// Thành tích của người chơi: 'champion' | 'runnerUp' | 'third' | 'fourth' |
// 'qf' | 'r16' | 'group' | null (đang đá).
function finalStandingOf(rounds, user, groupPosition, groupDone) {
    const byRound = (round) => rounds.find((entry) => entry.round === round)?.fixtures.find((fixture) => fixture.homeTeamId === user || fixture.awayTeamId === user)
    const final = byRound('final')
    const third = byRound('third')

    if (final?.played) return winnerOf(final) === user ? 'champion' : 'runnerUp'
    if (third?.played) return winnerOf(third) === user ? 'third' : 'fourth'

    for (const round of ['qf', 'r16']) {
        const fixture = byRound(round)

        if (fixture?.played && loserOf(fixture) === user) return round
    }

    if (groupDone && groupPosition > 2) return 'group'
    return null
}

export const WC_STANDING_LABELS = {
    champion: 'World champions',
    runnerUp: 'Runners-up',
    third: 'Third place',
    fourth: 'Fourth place',
    qf: 'Quarter-final',
    r16: 'Round of 16',
    group: 'Group stage',
}

// ---- Người chơi đá một trận ----
export function findWorldCupFixture(wc, fixtureId) {
    if (!wc || !fixtureId || !String(fixtureId).startsWith(`wc${worldCupKey(wc)}-`)) return null

    const state = worldCupState(wc)
    const fixture = state.rounds.flatMap((entry) => entry.fixtures).find((item) => item.id === fixtureId)

    return fixture ? decorate(wc, fixture) : null
}

// Thêm trường để màn trước / sau trận dùng chung với trận CLB.
function decorate(wc, fixture) {
    return {
        ...fixture,
        competition: 'wc',
        edition: wc.edition,
        scheduleKey: fixture.round,
    }
}

export function nextWorldCupFixture(wc) {
    if (!wc || wc.status === 'done') return null

    const state = worldCupState(wc)

    return state.nextUser ? decorate(wc, state.nextUser) : null
}

export const wcShootoutNeeded = (fixture, homeGoals, awayGoals) =>
    Boolean(fixture?.competition === 'wc' && fixture.stage !== 'group' && homeGoals === awayGoals)

// Lưu kết quả trận của người chơi. Hoà ở vòng loại trực tiếp mà không có loạt
// luân lưu đá thật (vd. bỏ trận) → luân lưu mô phỏng.
export function recordWorldCupResult(wc, fixtureId, homeGoals, awayGoals, shootout = null) {
    const fixture = findWorldCupFixture(wc, fixtureId)

    if (!fixture || fixture.played) return wc

    const result = { homeGoals: Math.max(0, Number(homeGoals) || 0), awayGoals: Math.max(0, Number(awayGoals) || 0) }

    if (fixture.stage !== 'group' && result.homeGoals === result.awayGoals) {
        result.shootout = shootout || simulatedShootout(wc, fixture)
    }

    return finishIfDone({ ...wc, results: { ...wc.results, [fixtureId]: result } })
}

// Người chơi bị loại hoặc đã đá trận cuối → mô phỏng nốt, giải kết thúc.
function finishIfDone(wc) {
    const state = worldCupState(wc)

    if (state.nextUser || !(state.userOut || state.finalStanding)) return wc

    const complete = { ...wc, simulatedTo: WC_ROUNDS.length }
    const final = worldCupState(complete)

    return { ...complete, status: 'done', champion: final.champion, finalStanding: final.finalStanding }
}

// Bỏ qua (mô phỏng toàn bộ, kể cả các trận của người chơi).
export function simulateWholeWorldCup(wc) {
    const complete = { ...wc, simulatedTo: WC_ROUNDS.length }
    const state = worldCupState(complete)

    return { ...complete, status: 'done', champion: state.champion, finalStanding: state.finalStanding, skipped: true }
}

// Kết quả sau một trận của người chơi (màn sau trận, thưởng).
export function describeWorldCupResult(wc, fixtureId) {
    const state = worldCupState(wc)
    const fixture = state.rounds.flatMap((entry) => entry.fixtures).find((item) => item.id === fixtureId)

    if (!fixture) return null

    const user = wc.nationId
    const isHome = fixture.homeTeamId === user
    const info = {
        cupId: 'wc',
        cupName: 'World Cup',
        label: fixtureLabelWC(wc, fixture),
        stage: fixture.stage === 'group' ? 'group' : fixture.round,
        outcome: null,
        prizeStage: null,
    }

    if (fixture.stage === 'group') {
        info.groupPosition = state.groups.find((group) => group.teams.includes(user)).standings.findIndex((row) => row.teamId === user) + 1

        if (fixture.matchday === 3) {
            info.outcome = info.groupPosition <= 2 ? 'advanced' : 'eliminated'
            if (info.outcome === 'advanced') info.prizeStage = 'r16'
        }

        return info
    }

    if (fixture.shootout) {
        const kicks = fixture.shootout.kicks || []

        info.shootout = {
            for: isHome ? fixture.shootout.home : fixture.shootout.away,
            against: isHome ? fixture.shootout.away : fixture.shootout.home,
            kicks: kicks.map((kick) => ({ ...kick, user: (kick.side === 'home') === isHome })),
        }
    }

    const won = winnerOf(fixture) === user
    const nextStage = { r16: 'qf', qf: 'sf', sf: 'final' }

    if (fixture.round === 'final') {
        info.outcome = won ? 'champion' : 'eliminated'
        info.prizeStage = won ? 'champion' : null
    } else if (fixture.round === 'third') {
        info.outcome = won ? 'thirdPlace' : 'fourthPlace'
        info.prizeStage = won ? 'third' : null
    } else if (fixture.round === 'sf' && !won) {
        info.outcome = 'toThirdPlace'
    } else {
        info.outcome = won ? 'advanced' : 'eliminated'
        info.prizeStage = won ? nextStage[fixture.round] : null
    }

    return info
}

export function fixtureLabelWC(wc, fixture) {
    if (!fixture) return ''

    return fixture.stage === 'group'
        ? `WORLD CUP ${wc.edition} · GROUP ${fixture.group} · MD ${fixture.matchday}`
        : `WORLD CUP ${wc.edition} · ${WC_ROUND_LABELS[fixture.round].toUpperCase()}`
}

export const fixtureShortLabelWC = (fixture) => `WC ${SHORT[fixture.round] || ''}`.trim()

// Đội tuyển (tên, viết tắt) — dùng chung worldClub nhưng tiện import.
export const nationName = (id) => NATION_BY_ID.get(id)?.name || id
