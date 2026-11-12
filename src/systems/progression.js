import { ATTRIBUTE_GROUPS, GOALKEEPING_GROUP, getAttributes } from './attributes'
import { upgradeBonus } from '../services/upgrade'

// ---- Phase 19B: lên cấp cầu thủ, cộng điểm chỉ số theo vị trí ----
//
// Dữ liệu trên mỗi cầu thủ (lưu cùng đội hình, mặc định khi đọc bản lưu cũ):
//   level (1–30), xp (XP trong cấp hiện tại), unspentPoints, potential (OVR tối đa)
//   attributes      : chỉ số chi tiết đang dùng — chỉ có sau lần cộng điểm đầu
//                     tiên (chụp lại toàn bộ chỉ số suy ra lúc đó, rồi cộng thêm)
//   attributesBase  : bản chụp gốc đó, để tính OVR tăng thêm bao nhiêu
//   baseOverall     : OVR lúc chụp
// XP sau mỗi trận: theo số phút, điểm số trận, bàn thắng, kiến tạo, tắc bóng,
// cứu thua, giữ sạch lưới, cầu thủ xuất sắc nhất, kết quả; cầu thủ không ra sân
// nhận XP tập luyện. Mỗi cấp +3 điểm. Giá mỗi điểm theo vị trí:
// chỉ số chính 1 điểm, chỉ số phụ 2 điểm, chỉ số khác 3 điểm.
// OVR tính lại theo trọng số vị trí (chỉ số chính nặng nhất) và không vượt
// quá tiềm năng; mỗi chỉ số tối đa 99.

// Phase 25: cấp tối đa 100 (trước là 30). 3 điểm mỗi cấp tới cấp 30, sau đó
// 1 điểm mỗi cấp (tổng 157 điểm ở cấp 100).
export const MAX_LEVEL = 100
export const POINTS_PER_LEVEL = 3
export const pointsForLevel = (level) => (level <= 30 ? 3 : 1)
export const TRAINING_XP = 10

// XP cần để lên cấp tiếp theo (Phase 25): 170 + level. Cầu thủ đá chính
// thường xuyên (~90 XP/trận, 38 trận ≈ 3.400 XP/mùa) lên khoảng cấp 19 sau
// mùa đầu và chạm cấp 100 sau khoảng 6 mùa (tổng ≈ 21.800 XP).
// (Phase 19B: 60 + 30 × level, tối đa cấp 30.)
export const xpToNext = (level) => 170 + level

const ALL_KEYS = [...ATTRIBUTE_GROUPS, GOALKEEPING_GROUP].flatMap((group) =>
    group.items.map(([key]) => key),
)

// Chỉ số chính / phụ theo nhóm vị trí.
const ROLE_ATTRIBUTES = {
    GK: {
        key: ['diving', 'handling', 'reflexes', 'positioning'],
        secondary: ['kicking', 'strength', 'agility'],
    },
    CB: {
        key: ['standingTackle', 'slidingTackle', 'marking', 'interceptions', 'strength', 'aggression'],
        secondary: ['sprintSpeed', 'acceleration', 'shortPassing', 'longPassing', 'stamina', 'balance'],
    },
    FB: {
        key: ['sprintSpeed', 'acceleration', 'standingTackle', 'slidingTackle', 'marking', 'interceptions', 'stamina'],
        secondary: ['shortPassing', 'longPassing', 'ballControl', 'agility'],
    },
    DM: {
        key: ['standingTackle', 'interceptions', 'marking', 'shortPassing', 'longPassing', 'strength', 'stamina'],
        secondary: ['vision', 'ballControl', 'aggression', 'slidingTackle'],
    },
    CM: {
        key: ['shortPassing', 'longPassing', 'vision', 'ballControl', 'stamina'],
        secondary: ['agility', 'interceptions', 'longShots', 'standingTackle', 'balance'],
    },
    AM: {
        key: ['shortPassing', 'vision', 'ballControl', 'agility', 'longShots', 'balance'],
        secondary: ['finishing', 'shotPower', 'acceleration', 'longPassing'],
    },
    WG: {
        key: ['acceleration', 'sprintSpeed', 'ballControl', 'agility', 'balance', 'longPassing'],
        secondary: ['finishing', 'shotPower', 'shortPassing', 'vision'],
    },
    ST: {
        key: ['finishing', 'shotPower', 'acceleration', 'sprintSpeed', 'strength', 'balance'],
        secondary: ['ballControl', 'agility', 'longShots', 'vision'],
    },
}

export function roleGroup(position) {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'
    if (value === 'CB') return 'CB'
    if (['LB', 'RB', 'LWB', 'RWB'].includes(value)) return 'FB'
    if (value === 'CDM') return 'DM'
    if (['CAM', 'AM'].includes(value)) return 'AM'
    if (['LW', 'RW', 'LM', 'RM'].includes(value)) return 'WG'
    if (['ST', 'CF', 'FW'].includes(value)) return 'ST'

    return 'CM'
}

// 'key' | 'secondary' | 'other' của một chỉ số với vị trí của cầu thủ.
export function attributeTier(position, key) {
    const role = ROLE_ATTRIBUTES[roleGroup(position)]

    if (role.key.includes(key)) return 'key'
    if (role.secondary.includes(key)) return 'secondary'

    return 'other'
}

const TIER_COST = { key: 1, secondary: 2, other: 3 }
const TIER_WEIGHT = { key: 3, secondary: 1.5, other: 0.25 }

export function upgradeCost(position, key) {
    return TIER_COST[attributeTier(position, key)]
}

function hash(text) {
    let value = 2166136261

    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }

    return value
}

// Tiềm năng mặc định: OVR hiện tại + 3…12 (cầu thủ trẻ thêm tới 4), tối đa 95.
export function defaultPotential(player) {
    const base = player.baseOverall ?? player.overall ?? 70
    const youth = typeof player.age === 'number' ? Math.max(0, Math.min(4, 25 - player.age)) : 0

    return Math.min(95, base + 3 + (hash(`${player.id}:potential`) % 10) + youth)
}

// Tiến độ của một cầu thủ, có mặc định cho bản lưu cũ.
export function progressOf(player) {
    return {
        level: player.level ?? 1,
        xp: player.xp ?? 0,
        unspentPoints: player.unspentPoints ?? 0,
        potential: player.potential ?? defaultPotential(player),
    }
}

// OVR tính theo chỉ số đã cộng (trọng số theo vị trí).
export function computeOverall(player) {
    if (!player.attributes || !player.attributesBase) return player.overall

    let weighted = 0

    ALL_KEYS.forEach((key) => {
        const weight = TIER_WEIGHT[attributeTier(player.position, key)]
        const gain = (player.attributes[key] ?? 0) - (player.attributesBase[key] ?? 0)

        weighted += gain * weight
    })

    // Chia cho tổng trọng số chỉ số chính + phụ: mỗi điểm vào chỉ số chính
    // tăng ~0.11–0.14 OVR, chỉ số phụ ~0.06, chỉ số khác ~0.01.
    const role = ROLE_ATTRIBUTES[roleGroup(player.position)]
    const scale = role.key.length * TIER_WEIGHT.key + role.secondary.length * TIER_WEIGHT.secondary

    return (player.baseOverall ?? player.overall) + weighted / scale
}

// Thử cộng 1 điểm vào chỉ số `key`. Trả về { player, ok, reason }.
export function upgradeAttribute(player, key) {
    const progress = progressOf(player)
    const cost = upgradeCost(player.position, key)

    if (progress.unspentPoints < cost) {
        return { player, ok: false, reason: `Needs ${cost} point${cost > 1 ? 's' : ''}` }
    }

    // Lần đầu: chụp lại toàn bộ chỉ số chi tiết đang suy ra.
    let next = { ...player }

    if (!next.attributes || !next.attributesBase) {
        const snapshot = { ...getAttributes(player) }

        next.attributes = { ...snapshot }
        next.attributesBase = { ...snapshot }
        next.baseOverall = player.overall
    } else {
        next.attributes = { ...next.attributes }
    }

    next.attributes[key] = (next.attributes[key] ?? 0) + 1

    const overall = computeOverall(next)

    // Tiềm năng chỉ giới hạn phần OVR từ tập luyện; phần cộng của thẻ +N
    // (Phase 25) nằm ngoài giới hạn này.
    if (overall - upgradeBonus(player.upgrade) > progress.potential + 0.49) {
        return { player, ok: false, reason: `Reached potential (${progress.potential})` }
    }

    next.unspentPoints = progress.unspentPoints - cost
    next.level = progress.level
    next.xp = progress.xp
    next.potential = progress.potential
    next.overall = Math.round(overall)

    // Đồng bộ 6 chỉ số chính (hiển thị ở các bảng khác) = chỉ số gốc + mức
    // tăng trung bình của nhóm.
    ATTRIBUTE_GROUPS.forEach((group) => {
        const gains = group.items.map(([item]) =>
            (next.attributes[item] ?? 0) - (next.attributesBase[item] ?? 0),
        )
        const average = gains.reduce((sum, gain) => sum + gain, 0) / gains.length
        const base = next[`${group.key}Base`] ?? player[group.key]

        next[`${group.key}Base`] = base
        next[group.key] = Math.round(base + average)
    })

    return { player: next, ok: true }
}

// Tự cộng hết điểm theo vị trí: ưu tiên chỉ số chính thấp nhất.
export function autoUpgrade(player) {
    let current = player
    let guard = 0

    while (guard < 200) {
        guard += 1

        const progress = progressOf(current)
        const values = getAttributes(current)
        const role = ROLE_ATTRIBUTES[roleGroup(current.position)]
        const options = [
            ...role.key.map((key) => ({ key, cost: 1 })),
            ...role.secondary.map((key) => ({ key, cost: 2 })),
        ]
            .filter((option) => option.cost <= progress.unspentPoints)
            .sort((a, b) => values[a.key] + a.cost * 4 - (values[b.key] + b.cost * 4))

        let upgraded = false

        for (const option of options) {
            const result = upgradeAttribute(current, option.key)

            if (result.ok) {
                current = result.player
                upgraded = true
                break
            }
        }

        if (!upgraded) break
    }

    return current
}

// ---- XP sau trận ----
//   lines      : dòng điểm số từ buildMatchSummary (id, rating, goals, assists,
//                tackles, saves, interceptions...)
//   fractions  : phần trận đã thi đấu theo id (0..1)
//   context    : { goalsFor, goalsAgainst, motmId, forfeit }
export function matchXp(player, line, fraction, context) {
    if (context.forfeit) return 0

    if (!fraction || fraction < 0.02) return TRAINING_XP

    const role = roleGroup(player.position)
    const rating = line?.rating ?? 6
    let xp = 40 * fraction

    xp += Math.max(0, rating - 6) * 30 * Math.max(0.5, fraction)
    xp += (line?.goals || 0) * 15
    xp += (line?.assists || 0) * 10
    xp += (line?.tackles || 0) * 3
    xp += (line?.interceptions || 0) * 2
    xp += (line?.saves || 0) * 6

    if ((role === 'GK' || role === 'CB' || role === 'FB') && context.goalsAgainst === 0 && fraction >= 0.6) {
        xp += 20
    }

    if (context.motmId === player.id) xp += 30
    if (context.goalsFor > context.goalsAgainst) xp += 10 * fraction

    return Math.round(xp)
}

// Cộng XP, lên cấp (có thể nhiều cấp). Trả về { player, report }.
export function addXp(player, gained) {
    const progress = progressOf(player)
    let { level, xp, unspentPoints } = progress
    let levelsGained = 0
    let pointsGained = 0

    xp += gained

    while (level < MAX_LEVEL && xp >= xpToNext(level)) {
        xp -= xpToNext(level)
        level += 1
        unspentPoints += pointsForLevel(level)
        pointsGained += pointsForLevel(level)
        levelsGained += 1
    }

    if (level >= MAX_LEVEL) xp = 0

    return {
        player: {
            ...player,
            level,
            xp,
            unspentPoints,
            potential: progress.potential,
        },
        report: {
            id: player.id,
            name: player.name,
            number: player.number,
            position: player.position,
            gained,
            levelBefore: progress.level,
            level,
            levelsGained,
            pointsGained,
            xp,
            xpNeeded: level >= MAX_LEVEL ? 0 : xpToNext(level),
        },
    }
}

// Áp XP cho cả đội người chơi sau trận.
export function applyMatchProgression(players, lines, fractions, context) {
    const lineById = new Map((lines || []).map((line) => [line.id, line]))
    const reports = []

    const next = players.map((player) => {
        // Phase 28: xpFactor (trận mô phỏng nhanh = 0.7).
        const gained = Math.round(
            matchXp(player, lineById.get(player.id), fractions[player.id] || 0, context) * (context.xpFactor ?? 1),
        )

        if (!gained) return player

        const result = addXp(player, gained)

        reports.push(result.report)

        return result.player
    })

    return { players: next, reports }
}
