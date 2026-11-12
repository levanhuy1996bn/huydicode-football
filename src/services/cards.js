// Phase 23: thẻ cầu thủ, gói cầu thủ và thẻ EP.
//
// Mỗi cầu thủ CLB sở hữu là một THẺ:
//   id / cardId  — duy nhất cho từng thẻ (engine, hợp đồng, thống kê dùng id)
//   playerId     — "người" cầu thủ (danh mục data/playerCatalog.js). Nhiều
//                  thẻ có thể cùng playerId (thẻ trùng, sau này nhiều mùa thẻ).
//   upgrade      — cấp thẻ +1…+10 (Phase 25). Thẻ mở từ gói hiện luôn là +1.
//   rarity       — gold / silver / bronze theo OVR.
import { PLAYER_CATALOG } from '../data/playerCatalog'

export const RARITY_LABELS = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }

export function rarityOf(overall) {
    return overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze'
}

let cardCounter = 0

export function newCardId(playerId) {
    cardCounter = (cardCounter + 1) % 1000

    return `card-${playerId}-${Date.now().toString(36)}${cardCounter.toString(36)}`
}

// Bổ sung các trường thẻ cho cầu thủ trong bản lưu cũ (id cũ được giữ làm cardId).
export function ensureCardFields(player) {
    if (!player || (player.playerId && player.cardId && player.upgrade && player.rarity)) return player

    return {
        ...player,
        playerId: player.playerId || player.id,
        cardId: player.cardId || player.id,
        upgrade: player.upgrade || 1,
        rarity: player.rarity || rarityOf(player.overall || 60),
    }
}

export const playerIdOf = (player) => player?.playerId || player?.id

// Tạo một thẻ mới (vào đội hình ngoài) từ một cầu thủ trong danh mục.
export function cardFromCatalog(catalogPlayer, { number, upgrade = 1 } = {}) {
    const cardId = newCardId(catalogPlayer.playerId)

    return {
        ...catalogPlayer,
        id: cardId,
        cardId,
        playerId: catalogPlayer.playerId,
        upgrade,
        rarity: catalogPlayer.rarity || rarityOf(catalogPlayer.overall),
        number,
        x: 0,
        z: 60,
        condition: 100,
    }
}

// Số áo trống đầu tiên từ 20 trở lên.
export function freeShirtNumber(squad) {
    const used = new Set(squad.map((player) => player.number))
    let number = 20

    while (used.has(number) && number < 99) number += 1

    return number
}

// ---- Gói cầu thủ ----
export const PACK_TYPES = {
    standard: {
        label: 'Player Pack',
        description: '1 player · 60% Bronze, 35% Silver, 5% Gold',
        odds: { bronze: 0.6, silver: 0.35, gold: 0.05 },
    },
    premium: {
        label: 'Premium Player Pack',
        description: '1 player · 70% Gold, 30% Silver',
        odds: { bronze: 0, silver: 0.3, gold: 0.7 },
    },
}

const BY_RARITY = PLAYER_CATALOG.reduce((groups, player) => {
    const key = player.rarity || rarityOf(player.overall)

    ;(groups[key] = groups[key] || []).push(player)
    return groups
}, {})

export function rollPackRarity(packType, random = Math.random) {
    const odds = PACK_TYPES[packType]?.odds || PACK_TYPES.standard.odds
    let roll = random()

    for (const rarity of ['gold', 'silver', 'bronze']) {
        roll -= odds[rarity] || 0
        if (roll < 0) return rarity
    }

    return 'bronze'
}

// Rút một cầu thủ trong danh mục theo độ hiếm của gói.
export function drawFromPack(packType, random = Math.random) {
    const rarity = rollPackRarity(packType, random)
    const pool = BY_RARITY[rarity] || PLAYER_CATALOG

    return pool[Math.floor(random() * pool.length)]
}

// ---- Kho đồ (tab CARDS) ----
let itemCounter = 0

export function inventoryItem(type, fields) {
    itemCounter = (itemCounter + 1) % 1000

    return {
        id: `item-${Date.now().toString(36)}${itemCounter.toString(36)}`,
        type, // 'ep' | 'pack'
        createdAt: Date.now(),
        ...fields,
    }
}

export const epCard = (amount, source) => inventoryItem('ep', { amount, source })
export const playerPack = (pack, source) => inventoryItem('pack', { pack, source })
