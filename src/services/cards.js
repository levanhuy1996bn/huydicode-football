// Phase 23: thẻ cầu thủ, gói cầu thủ và thẻ EP.
//
// Mỗi cầu thủ CLB sở hữu là một THẺ:
//   id / cardId  — duy nhất cho từng thẻ (engine, hợp đồng, thống kê dùng id)
//   playerId     — "người" cầu thủ (danh mục data/playerCatalog.js). Nhiều
//                  thẻ có thể cùng playerId (thẻ trùng, sau này nhiều mùa thẻ).
//   upgrade      — cấp thẻ +1…+10 (Phase 25). Thẻ mở từ gói hiện luôn là +1.
//   rarity       — gold / silver / bronze theo OVR.
import { PLAYER_CATALOG } from '../data/playerCatalog'
import { allWorldPlayers } from '../data/worldSquads'
import { withPhysique } from '../systems/physique'
import { MAN_UTD_ID } from '../data/world'

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
// Phase 26B: thẻ cầu thủ Man United mua trước 26B dùng id CLB cũ 'blue'
// (playerId blue-p01…, clubId 'blue') → đổi sang id thật để khớp thị trường.
const LEGACY_MU_PLAYER = /^blue-(p\d{2})$/

function migrateLegacyClub(player) {
    const legacyPlayer = LEGACY_MU_PLAYER.exec(player.playerId || '')

    if (!legacyPlayer && player.clubId !== 'blue') return player

    return {
        ...player,
        ...(legacyPlayer ? { playerId: `${MAN_UTD_ID}-${legacyPlayer[1]}` } : {}),
        ...(player.clubId === 'blue' ? { clubId: MAN_UTD_ID } : {}),
    }
}

export function ensureCardFields(input) {
    if (!input) return input

    const player = migrateLegacyClub(input)

    if (player.playerId && player.cardId && player.upgrade && player.rarity && player.height) return player

    // Phase 26C: thẻ cũ được bổ sung chiều cao / cân nặng (theo playerId).
    return withPhysique({
        ...player,
        playerId: player.playerId || player.id,
        cardId: player.cardId || player.id,
        upgrade: player.upgrade || 1,
        rarity: player.rarity || rarityOf(player.overall || 60),
    })
}

export const playerIdOf = (player) => player?.playerId || player?.id

// Tạo một thẻ mới (vào đội hình ngoài) từ một cầu thủ trong danh mục.
export function cardFromCatalog(catalogPlayer, { number, upgrade = 1 } = {}) {
    const cardId = newCardId(catalogPlayer.playerId)

    return withPhysique({
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
    })
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

// Phase 26A: gói rút từ mọi cầu thủ thế giới + cầu thủ tự do (tạo lần đầu dùng).
let byRarity = null

function poolsByRarity() {
    if (byRarity) return byRarity

    byRarity = [...allWorldPlayers(), ...PLAYER_CATALOG].reduce((groups, player) => {
        const key = player.rarity || rarityOf(player.overall)

        ;(groups[key] = groups[key] || []).push(player)
        return groups
    }, {})

    return byRarity
}

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
    const pool = poolsByRarity()[rarity] || PLAYER_CATALOG

    return pool[Math.floor(random() * pool.length)]
}

// ---- Kho đồ (tab CARDS) ----
let itemCounter = 0

export function inventoryItem(type, fields) {
    itemCounter = (itemCounter + 1) % 1000

    return {
        id: `item-${Date.now().toString(36)}${itemCounter.toString(36)}`,
        type, // 'ep' | 'pack' | 'protection' (Phase 29C) | 'fitness' | 'form' | 'boost' (Phase 29I)
        createdAt: Date.now(),
        ...fields,
    }
}

export const epCard = (amount, source) => inventoryItem('ep', { amount, source })
export const playerPack = (pack, source) => inventoryItem('pack', { pack, source })

// Phase 29C: thẻ bảo vệ khi đập thẻ (thất bại không tụt cấp). Nằm trong kho
// (REWARDS), được dùng ở UPGRADE CARDS. Mua bằng EP hoặc nhận thưởng.
export const PROTECTION_PRICE = 5000000
export const protectionCard = (source) => inventoryItem('protection', { source })
export const protectionCount = (club) => (club?.inventory || []).filter((item) => item.type === 'protection').length

// Bỏ một thẻ bảo vệ khỏi kho (thẻ cũ nhất trước).
export function spendProtection(club) {
    const inventory = [...(club?.inventory || [])]
    const index = inventory.findIndex((item) => item.type === 'protection')

    if (index < 0) return null

    inventory.splice(index, 1)
    return { ...club, inventory }
}

// ---- Phase 29I: thẻ Thể lực, thẻ Phong độ, thẻ tăng tỉ lệ đập ----
// Thể lực: cả đội (đá chính + dự bị + đội hình ngoài) lên thể lực 100.
// Phong độ: cả đội lên phong độ cao nhất (⬆ +3).
// Tăng tỉ lệ (Upgrade Boost): +3% / +4% / +5% tỉ lệ đập thẻ, tối đa 5 thẻ mỗi
// lần đập, dùng là mất (thành công hay thất bại).
export const FITNESS_PRICE = 2000000
export const FORM_PRICE = 3000000
export const BOOST_LIMIT = 5

export const fitnessCard = (source) => inventoryItem('fitness', { source })
export const formCard = (source) => inventoryItem('form', { source })
export const boostCard = (percent, source) => inventoryItem('boost', { percent, source })
export const randomBoostPercent = (random = Math.random) => 3 + Math.min(2, Math.floor(random() * 3))

export const itemCount = (club, type) => (club?.inventory || []).filter((item) => item.type === type).length

// Bỏ một vật phẩm loại `type` khỏi kho (cũ nhất trước). null nếu không còn.
export function spendItem(club, type) {
    const inventory = [...(club?.inventory || [])]
    const index = inventory.findIndex((item) => item.type === type)

    if (index < 0) return null

    inventory.splice(index, 1)
    return { ...club, inventory }
}

// Thẻ tăng tỉ lệ trong kho, mạnh nhất trước.
export const boostCards = (club) =>
    (club?.inventory || []).filter((item) => item.type === 'boost').sort((a, b) => (b.percent || 0) - (a.percent || 0))

export function spendItemsById(club, ids = []) {
    const remove = new Set(ids)

    return { ...club, inventory: (club?.inventory || []).filter((item) => !remove.has(item.id)) }
}
