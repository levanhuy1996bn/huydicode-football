// Phase 28: mô phỏng nhanh (kiểu FO4) — ra kết quả ngay, không đá 3D.
//
// - Mỗi ngày (theo ngày trên máy) được 5 lượt; lượt không dùng không cộng
//   dồn. Thưởng tiền + XP CLB của trận mô phỏng = 0.7 trận tự đá.
// - Kết quả tính từ chỉ số cầu thủ và cả đội: Tấn công / Tuyến giữa / Phòng
//   ngự / Thủ môn của 11 người đá chính — đã gồm cấp thẻ +N, chỉ số trên 99,
//   team color, thể lực hiện tại; đối thủ là thẻ +N theo độ khó; đội nhà có
//   lợi thế nhỏ (chung kết: sân trung lập).
// - Ra số bàn (phân phối Poisson theo bàn thắng kỳ vọng của mỗi đội), cú
//   sút, người ghi bàn / kiến tạo (theo vị trí + chỉ số), thẻ, kiểm soát bóng,
//   đường chuyền… rồi đưa vào màn sau trận như một trận thường.
// - Kết quả được tính và lưu NGAY khi bấm, hoạt cảnh chỉ là phát lại.
import { effectiveStat } from '../systems/attributes'
import { getRole } from '../systems/roster'
import { createMatchStats } from '../systems/matchStats'
import { applyTeamColor } from './teamColor'
// Phase 29I: phong độ cộng vào chỉ số khi mô phỏng.
import { withForm } from '../systems/form'

export const SIM_DAILY_LIMIT = 5
export const SIM_REWARD_FACTOR = 0.7

// ---- Lượt mô phỏng mỗi ngày (lưu trong bản lưu CLB: club.simulations) ----
export function todayKey(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function simulationsLeft(club, now = new Date()) {
    const used = club?.simulations?.date === todayKey(now) ? club.simulations.used || 0 : 0

    return Math.max(0, SIM_DAILY_LIMIT - used)
}

export function spendSimulation(club, now = new Date()) {
    const key = todayKey(now)
    const used = club?.simulations?.date === key ? club.simulations.used || 0 : 0

    return { ...club, simulations: { date: key, used: used + 1 } }
}

// ---- Sức mạnh đội ----
const stat = (player, key) => effectiveStat(player[key] ?? player.overall ?? 60)
const fitness = (player) => 0.88 + 0.12 * ((player.condition ?? 100) / 100)
const average = (list) => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 60)

function weighted(entries) {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)

    return total ? entries.reduce((sum, [value, weight]) => sum + value * weight, 0) / total : 60
}

export function teamRatings(players) {
    const byRole = (role) => players.filter((player) => getRole(player) === role)
    const keeper = byRole('GK')[0]

    const attack = weighted([
        ...byRole('FW').map((p) => [(0.45 * stat(p, 'shooting') + 0.3 * stat(p, 'dribbling') + 0.25 * stat(p, 'pace')) * fitness(p), 1]),
        ...byRole('MF').map((p) => [(0.3 * stat(p, 'shooting') + 0.4 * stat(p, 'passing') + 0.3 * stat(p, 'dribbling')) * fitness(p), 0.5]),
    ])
    const midfield = weighted([
        ...byRole('MF').map((p) => [(0.45 * stat(p, 'passing') + 0.25 * stat(p, 'dribbling') + 0.3 * stat(p, 'physical')) * fitness(p), 1]),
        ...[...byRole('DF'), ...byRole('FW')].map((p) => [(0.6 * stat(p, 'passing') + 0.4 * stat(p, 'physical')) * fitness(p), 0.25]),
    ])
    const defence = weighted([
        ...byRole('DF').map((p) => [(0.55 * stat(p, 'defending') + 0.25 * stat(p, 'physical') + 0.2 * stat(p, 'pace')) * fitness(p), 1]),
        ...byRole('MF').map((p) => [(0.6 * stat(p, 'defending') + 0.4 * stat(p, 'physical')) * fitness(p), 0.4]),
    ])
    const goalkeeping = keeper ? effectiveStat(keeper.overall || 60) * fitness(keeper) : 50

    return { attack, midfield, defence, goalkeeping }
}

// ---- Ngẫu nhiên ----
function poisson(random, lambda) {
    const limit = Math.exp(-lambda)
    let product = random()
    let count = 0

    while (product > limit && count < 12) {
        product *= random()
        count += 1
    }

    return count
}

function pick(random, items, weightOf) {
    const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0)

    if (total <= 0) return items[0] || null

    let roll = random() * total

    for (const item of items) {
        roll -= Math.max(0, weightOf(item))
        if (roll <= 0) return item
    }

    return items[items.length - 1] || null
}

const SHOT_WEIGHT = { FW: 3, MF: 1.4, DF: 0.35, GK: 0 }
const ASSIST_WEIGHT = { FW: 1.5, MF: 2.2, DF: 0.7, GK: 0.05 }
const PASS_SHARE = { GK: 0.5, DF: 1, MF: 1.3, FW: 0.7 }
const lastName = (name) => String(name || '').split(' ').slice(-1)[0]

// ---- Một trận ----
// blue / red: 11 người đá chính (red đã là thẻ +N theo độ khó).
// venue: 'blue' | 'red' | 'neutral' — đội đá sân nhà.
export function simulateQuickMatch({ bluePlayers, redPlayers, venue = 'blue', random = Math.random }) {
    const sides = {
        blue: applyTeamColor(bluePlayers).players.map(withForm),
        red: applyTeamColor(redPlayers).players.map(withForm),
    }
    const ratings = { blue: teamRatings(sides.blue), red: teamRatings(sides.red) }
    const homeEdge = (team) => (venue === 'neutral' ? 0 : venue === team ? 0.11 : -0.04)

    const expected = (team, other) => {
        const own = ratings[team]
        const opponent = ratings[other]
        const wall = opponent.defence * 0.65 + opponent.goalkeeping * 0.35
        const value = 1.3 * Math.exp((own.attack - wall) / 26 + (own.midfield - opponent.midfield) / 45 + homeEdge(team))

        return Math.max(0.2, Math.min(4.5, value))
    }

    const lambda = { blue: expected('blue', 'red'), red: expected('red', 'blue') }
    const possessionBlue = Math.round(
        Math.max(32, Math.min(68, 50 + (ratings.blue.midfield - ratings.red.midfield) * 1.1 + (homeEdge('blue') - homeEdge('red')) * 20)),
    )
    const stats = createMatchStats()
    const timeline = []
    const goalEvents = []
    const cardEvents = []
    const woodworkEvents = []
    const score = { blue: 0, red: 0 }

    stats.possession = { blue: possessionBlue, red: 100 - possessionBlue }

    const line = (id) => {
        if (!stats.players[id]) {
            stats.players[id] = {
                goals: 0, assists: 0, shots: 0, passes: 0, tackles: 0, saves: 0,
                interceptions: 0, duels: 0, fouls: 0, passesCompleted: 0, xg: 0, blocks: 0, woodwork: 0,
            }
        }

        return stats.players[id]
    }

    const minuteList = (count) =>
        Array.from({ length: count }, () => 1 + Math.floor(random() * 92)).sort((a, b) => a - b)

    ;['blue', 'red'].forEach((team) => {
        const other = team === 'blue' ? 'red' : 'blue'
        const players = sides[team]
        const keeper = sides[other].find((player) => getRole(player) === 'GK')
        const goals = Math.min(6, poisson(random, lambda[team]))
        const misses = poisson(random, lambda[team] * 7)
        const shotMinutes = minuteList(goals + misses)
        const goalSlots = new Set()

        // Bàn thắng rơi vào các cú sút ngẫu nhiên trong trận.
        while (goalSlots.size < goals) goalSlots.add(Math.floor(random() * shotMinutes.length))

        shotMinutes.forEach((minute, index) => {
            const isGoal = goalSlots.has(index)
            const shooter = pick(random, players, (player) => (SHOT_WEIGHT[getRole(player)] ?? 1) * stat(player, 'shooting'))
            const onTarget = isGoal || random() < 0.3
            const xg = isGoal ? 0.18 + random() * 0.4 : 0.03 + random() * 0.15
            const shooterLine = line(shooter.id)

            shooterLine.shots += 1
            shooterLine.xg += xg
            stats.teams[team].shots += 1
            stats.teams[team].xg += xg
            if (onTarget) stats.teams[team].onTarget += 1

            stats.shots.push({
                teamId: team,
                playerId: shooter.id,
                lateral: (random() - 0.5) * (isGoal ? 22 : 36),
                depth: isGoal ? 5 + random() * 12 : 8 + random() * 22,
                xg,
                goal: isGoal,
            })

            if (isGoal) {
                const provider = random() < 0.75
                    ? pick(random, players.filter((player) => player.id !== shooter.id), (player) => (ASSIST_WEIGHT[getRole(player)] ?? 1) * stat(player, 'passing'))
                    : null

                shooterLine.goals += 1
                if (provider) line(provider.id).assists += 1

                goalEvents.push({ teamId: team, name: shooter.name, minute, ownGoal: false })
                timeline.push({
                    minute,
                    type: 'goal',
                    team,
                    text: `GOAL! ${shooter.name}${provider ? ` (assist ${lastName(provider.name)})` : ''}`,
                })
            } else if (onTarget) {
                if (keeper) {
                    line(keeper.id).saves += 1
                    stats.teams[other].saves += 1
                }

                timeline.push({ minute, type: 'save', team, text: `${shooter.name} shoots — saved by ${lastName(keeper?.name) || 'the keeper'}` })
            } else if (random() < 0.035) {
                // Phase 30A: dội cột dọc / xà ngang.
                const part = random() < 0.65 ? 'post' : 'crossbar'

                shooterLine.woodwork += 1
                stats.teams[team].woodwork += 1
                woodworkEvents.push({ teamId: team, name: shooter.name, minute, woodwork: part })
                timeline.push({ minute, type: 'woodwork', team, text: `${shooter.name} hits the ${part}!` })
            } else {
                timeline.push({ minute, type: 'miss', team, text: `${shooter.name} shoots wide` })
            }
        })

        // Chuyền bóng, tắc bóng, thẻ.
        const passes = Math.round(stats.possession[team] * (4.2 + random() * 0.8))
        const passTotal = players.reduce((sum, player) => sum + (PASS_SHARE[getRole(player)] ?? 1), 0)

        players.forEach((player) => {
            const entry = line(player.id)
            const role = getRole(player)
            const attempts = Math.round((passes * (PASS_SHARE[role] ?? 1)) / passTotal)
            const accuracy = Math.max(0.55, Math.min(0.96, 0.62 + (stat(player, 'passing') - 50) * 0.0065 + (random() - 0.5) * 0.1))

            entry.passes = attempts
            entry.passesCompleted = Math.round(attempts * accuracy)
            stats.teams[team].passes += attempts
            stats.teams[team].passesCompleted += entry.passesCompleted

            if (role === 'DF' || role === 'MF') {
                entry.tackles = poisson(random, role === 'DF' ? 1.6 : 1.1)
                entry.interceptions = role === 'DF' ? poisson(random, 1) : poisson(random, 0.5)
                stats.teams[team].tackles += entry.tackles
                stats.teams[team].interceptions += entry.interceptions
            }
        })

        const yellows = poisson(random, 0.9)

        for (let index = 0; index < yellows; index += 1) {
            const player = pick(random, players, (item) => ({ DF: 3, MF: 2, FW: 1, GK: 0.1 })[getRole(item)] ?? 1)
            const minute = 5 + Math.floor(random() * 86)

            stats.teams[team].yellow += 1
            cardEvents.push({ teamId: team, name: player.name, minute, card: 'yellow' })
            timeline.push({ minute, type: 'card', team, text: `Yellow card: ${player.name}` })
        }

        stats.teams[team].corners = poisson(random, 2 + lambda[team] * 2)
        stats.teams[team].fouls = poisson(random, 11)
        score[team] = goals
    })

    // Vài pha tấn công không thành cú sút cho hoạt cảnh sinh động hơn.
    ;['blue', 'red'].forEach((team) => {
        const count = Math.round(stats.possession[team] / 8)

        minuteList(count).forEach((minute) => timeline.push({ minute, type: 'attack', team, text: null }))
    })

    timeline.sort((a, b) => a.minute - b.minute || (a.type === 'goal') - (b.type === 'goal'))

    return {
        blueScore: score.blue,
        redScore: score.red,
        stats,
        goalEvents: goalEvents.sort((a, b) => a.minute - b.minute),
        cardEvents: cardEvents.sort((a, b) => a.minute - b.minute),
        woodworkEvents,
        timeline,
        ratings,
        expected: lambda,
        possession: stats.possession,
    }
}
