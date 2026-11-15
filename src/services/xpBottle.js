// Phase 46: bình kinh nghiệm (kiểu "bình EXP" FO4) — hai vật phẩm, hai bước.
//
//   1. Bình rỗng (mua 20.000.000 EP ở CARDS → SHOP). Bấm USE → chọn một cầu
//      thủ dự bị / đội hình ngoài → xác nhận → cầu thủ đó về level 1 (bỏ hết
//      điểm đã cộng, giữ cấp thẻ +N, phong độ, thể lực) và bình rỗng biến
//      thành bình đầy chứa 80% tổng XP của cầu thủ.
//   2. Bình đầy ("EXP bottle · 3,456 XP"). Bấm GIVE → chọn người nhận (bất kỳ
//      ai trong đội, kể cả người vừa bị hút) → xác nhận → cộng XP, lên cấp như
//      sau trận (điểm cộng ở SQUAD → TRAINING).
// Không giới hạn số bình mỗi cầu thủ. Bình đầy cùng lượng XP gộp một ô ×N.
import { inventoryItem } from './cards'
import { MAX_LEVEL, addXp, progressOf, xpToNext } from '../systems/progression'

export const EXP_BOTTLE_PRICE = 20000000
export const EXP_BOTTLE_SHARE = 0.8

const MAIN_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

export const emptyBottle = (source) => inventoryItem('bottle', { source })
export const filledBottle = (xp, from, source) => inventoryItem('bottle-full', { xp, from, source })

// Tổng XP đã tích được: XP các cấp đã qua + XP trong cấp hiện tại.
export function totalXpOf(player) {
    const { level, xp } = progressOf(player)
    let total = xp

    for (let index = 1; index < level; index += 1) total += xpToNext(index)

    return total
}

export const bottleXpOf = (player) => Math.floor(totalXpOf(player) * EXP_BOTTLE_SHARE)

// Về level 1: bỏ XP, điểm chưa cộng và mọi điểm đã cộng vào chỉ số (chỉ số
// về bản chụp gốc — đã gồm cấp thẻ +N, xem upgrade.js → applyUpgradeLevel).
// Giữ nguyên cấp thẻ, phong độ, thể lực, tiềm năng.
export function resetTraining(player) {
    const next = { ...player, level: 1, xp: 0, unspentPoints: 0 }

    if (player.attributes && player.attributesBase) {
        next.attributes = { ...player.attributesBase }

        MAIN_KEYS.forEach((key) => {
            if (typeof player[`${key}Base`] === 'number') next[key] = player[`${key}Base`]
        })

        if (typeof player.baseOverall === 'number') next.overall = player.baseOverall
    }

    return next
}

// Cầu thủ có thể bị hút: dự bị (băng ghế) + đội hình ngoài, có XP.
export function drainCandidates(team) {
    return [
        ...(team?.substitutes || []).map((player) => ({ player, group: 'bench' })),
        ...(team?.reserves || []).map((player) => ({ player, group: 'reserve' })),
    ].filter(({ player }) => totalXpOf(player) > 0)
}

const mapSquad = (team, playerId, update) => ({
    ...team,
    players: (team.players || []).map((player) => (player.id === playerId ? update(player) : player)),
    substitutes: (team.substitutes || []).map((player) => (player.id === playerId ? update(player) : player)),
    reserves: (team.reserves || []).map((player) => (player.id === playerId ? update(player) : player)),
})

// Hút: trả về { team, xp } (xp = lượng vào bình), null nếu không hút được.
export function drainPlayer(team, playerId) {
    const candidate = drainCandidates(team).find(({ player }) => player.id === playerId)

    if (!candidate) return null

    return { team: mapSquad(team, playerId, resetTraining), xp: bottleXpOf(candidate.player), player: candidate.player }
}

// Xem trước khi truyền: cấp sau khi nhận, điểm được cộng, XP phí (đã cấp 100).
export function previewGive(player, amount) {
    const { report } = addXp(player, amount)
    const capped = report.level >= MAX_LEVEL
    // Ở cấp 100 XP thừa không dùng được.
    const usable = capped ? Math.max(0, totalXpOfLevel(MAX_LEVEL) - totalXpOf(player)) : amount

    return { ...report, wasted: Math.max(0, amount - usable), atMax: progressOf(player).level >= MAX_LEVEL }
}

function totalXpOfLevel(level) {
    let total = 0

    for (let index = 1; index < level; index += 1) total += xpToNext(index)

    return total
}

// Truyền: trả về { team, report }.
export function givePlayerXp(team, playerId, amount) {
    let report = null
    const next = mapSquad(team, playerId, (player) => {
        const result = addXp(player, amount)

        report = result.report
        return result.player
    })

    return report ? { team: next, report } : null
}
