// Phase 52b: "cập nhật cả thẻ đang sở hữu".
//
// Khi developer lưu bản sửa cầu thủ có tick ô đó (player_edits.data.syncOwned),
// mỗi máy mở game sẽ làm mới các thẻ cùng cầu thủ (playerId) trong đội của
// người chơi: lấy chỉ số gốc mới (bản ở thị trường, đã có bản sửa), rồi cộng
// lại đúng cấp thẻ +N và các điểm đã tự cộng (tập luyện). Giữ nguyên: cấp +,
// level, XP, điểm chưa cộng, phong độ, thể lực, số áo, vị trí đang đá.
// Mỗi thẻ nhớ dấu lần làm mới (catalogStamp) → chỉ làm một lần cho mỗi lần lưu.
import { hasOwnedSync, ownedSyncStamp } from '../data/catalogOverrides'
import { MARKET_BY_PLAYER_ID } from '../data/transferMarket'
import { upgradeBonus } from './upgrade'
import { rarityOf } from './cards'
import { getAttributes } from '../systems/attributes'
import { computeOverall } from '../systems/progression'

const MAIN_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

export function refreshCard(card, base, stamp, { inSlot = false } = {}) {
    const up = upgradeBonus(card.upgrade)
    const naturalPosition = base.position || card.naturalPosition || card.position
    const next = {
        ...card,
        name: base.name ?? card.name,
        age: base.age ?? card.age,
        nationality: base.nationality ?? card.nationality,
        height: base.height ?? card.height,
        weight: base.weight ?? card.weight,
        rarity: rarityOf(base.overall),
        catalogStamp: stamp,
    }

    // Đang đứng ở một ô sơ đồ → giữ vị trí ô, chỉ đổi vị trí sở trường.
    if (inSlot) next.naturalPosition = naturalPosition
    else {
        next.position = naturalPosition
        delete next.naturalPosition
    }

    MAIN_KEYS.forEach((key) => {
        const baseKey = `${key}Base`
        const trainedGain = typeof card[baseKey] === 'number' ? (card[key] ?? card[baseKey]) - card[baseKey] : 0
        const value = (base[key] ?? card[key] - up) + up

        if (typeof card[baseKey] === 'number') next[baseKey] = value
        next[key] = value + trainedGain
    })

    const baseOverall = base.overall + up

    if (card.attributes && card.attributesBase) {
        // Chỉ số chi tiết gốc mới (suy ra từ chỉ số chính mới) + mức đã tự cộng.
        const derived = getAttributes({
            ...next,
            position: naturalPosition,
            overall: baseOverall,
            attributes: null,
            attributesBase: null,
            ...Object.fromEntries(MAIN_KEYS.map((key) => [key, next[`${key}Base`] ?? next[key]])),
        })
        const attributesBase = {}
        const attributes = {}

        Object.keys(card.attributesBase).forEach((key) => {
            const gain = (card.attributes[key] ?? card.attributesBase[key]) - card.attributesBase[key]
            const value = derived[key] ?? card.attributesBase[key]

            attributesBase[key] = value
            attributes[key] = value + gain
        })

        next.attributesBase = attributesBase
        next.attributes = attributes
        next.baseOverall = baseOverall
        next.overall = Math.round(computeOverall({ ...next, position: naturalPosition }))
    } else {
        next.overall = baseOverall
        if (typeof card.baseOverall === 'number') next.baseOverall = baseOverall
    }

    return next
}

// Làm mới các thẻ của đội người chơi (id 'blue') nếu có bản sửa yêu cầu.
export function refreshOwnedRoster(roster) {
    if (!hasOwnedSync() || !Array.isArray(roster)) return roster

    let changed = false

    const refreshList = (list, inSlot) => (list || []).map((card) => {
        const stamp = ownedSyncStamp(card?.playerId)

        if (!stamp || card.catalogStamp === stamp) return card

        const base = MARKET_BY_PLAYER_ID.get(card.playerId)

        if (!base) return card

        changed = true
        return refreshCard(card, base, stamp, { inSlot })
    })

    const next = roster.map((team) => (team.id !== 'blue' ? team : {
        ...team,
        players: refreshList(team.players, true),
        substitutes: refreshList(team.substitutes, false),
        reserves: refreshList(team.reserves, false),
    }))

    return changed ? next : roster
}
