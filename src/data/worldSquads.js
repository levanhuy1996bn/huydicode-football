// Phase 26A: đội hình tất định (22 cầu thủ) cho mỗi CLB trong thế giới.
// Không lưu gì: cùng id CLB luôn sinh ra cùng đội hình (tên, chỉ số, số áo).
//   - 3–5 ngôi sao (tên thật, OVR ước lượng) ở 18 giải hạng nhất thay vào
//     vị trí phù hợp; còn lại là cầu thủ hư cấu theo kho tên của nước CLB
//     (70% người trong nước, 30% nước ngoài).
//   - 11 đá chính (đúng sơ đồ 4-3-3 của đội đối thủ trong engine), 9 dự bị,
//     2 dự bị xa.
import { CLUB_BY_ID, USER_CLUB_ID, WORLD_CLUBS, hash01, hashString } from './world'
import { COUNTRY_NAMING, FOREIGN_POOLS, NAME_POOLS, POOL_NATIONALITY } from './namePools'
import { baseStats } from './teams'

// [vị trí, số áo, nhóm]: 0–10 đá chính, 11–19 dự bị, 20–21 dự bị xa.
export const SQUAD_TEMPLATE = [
    ['GK', 1], ['LB', 3], ['CB', 4], ['CB', 5], ['RB', 2],
    ['CDM', 6], ['CM', 8], ['CAM', 10], ['LW', 11], ['ST', 9], ['RW', 7],
    ['GK', 13], ['CB', 15], ['LB', 12], ['RB', 22], ['CM', 16],
    ['CDM', 18], ['CAM', 20], ['RW', 17], ['ST', 19],
    ['LW', 23], ['CB', 24],
]
export const STARTER_COUNT = 11
export const BENCH_COUNT = 9

const SLOT_FAMILY = {
    GK: 'GK', CB: 'CB', LB: 'LB', LWB: 'LB', RB: 'RB', RWB: 'RB',
    CDM: 'MID', CM: 'MID', CAM: 'MID', AM: 'MID', LM: 'LW', LW: 'LW',
    RM: 'RW', RW: 'RW', ST: 'ST', CF: 'ST',
}
const familyOf = (position) => SLOT_FAMILY[String(position).toUpperCase()] || 'MID'

const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

const rarityOf = (overall) => (overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze')
export const valueOf = (overall) =>
    Math.max(100000, Math.round((1000000 * Math.pow(1.152, overall - 60)) / 100000) * 100000)
export const wageOf = (value) => Math.max(2000, Math.round((value * 0.003) / 1000) * 1000)

function pickName(club, slot, used) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const seed = `${club.id}:${slot}:${attempt}`
        const local = hash01(`${seed}:nat`) < 0.7
        const poolKey = local
            ? COUNTRY_NAMING[club.countryId] || 'en'
            : FOREIGN_POOLS[hashString(`${seed}:pool`) % FOREIGN_POOLS.length]
        const pool = NAME_POOLS[poolKey]
        const first = pool.first[hashString(`${seed}:f`) % pool.first.length]
        const last = pool.last[hashString(`${seed}:l`) % pool.last.length]
        // Cầu thủ Brazil hay dùng một tên: ~25% chỉ lấy tên gọi.
        const name = poolKey === 'br' && hash01(`${seed}:mono`) < 0.25 ? first : `${first} ${last}`

        if (!used.has(name)) {
            used.add(name)
            return { name, nationality: local ? club.nationality : POOL_NATIONALITY[poolKey] }
        }
    }

    const fallback = `${club.shortName} Player ${slot + 1}`
    used.add(fallback)
    return { name: fallback, nationality: club.nationality }
}

function overallFor(club, slot) {
    const base = club.strength
    const roll = hash01(`${club.id}:${slot}:ovr`)

    if (slot < STARTER_COUNT) return Math.round(base - 2.5 + roll * 4)
    if (slot < STARTER_COUNT + BENCH_COUNT) return Math.round(base - 6 + roll * 4)

    return Math.round(base - 10 + roll * 4)
}

function ageFor(club, slot, isStar) {
    const roll = hash01(`${club.id}:${slot}:age`)

    if (isStar) return 23 + Math.floor(roll * 9)
    if (slot >= STARTER_COUNT + BENCH_COUNT) return 18 + Math.floor(roll * 4)

    return 20 + Math.floor(roll * 14)
}

function statsFor(club, slot, position, number, overall) {
    const stats = baseStats(position, number, overall)

    STAT_KEYS.forEach((key) => {
        const jitter = Math.round((hash01(`${club.id}:${slot}:${key}`) - 0.5) * 4)
        stats[key] = Math.max(1, Math.min(99, stats[key] + jitter))
    })

    return stats
}

// Ô trong đội hình cho từng ngôi sao: cùng vị trí ở đội hình chính trước,
// rồi cùng nhóm ở đội hình chính, rồi dự bị.
function placeStars(stars) {
    const taken = new Map()
    const ordered = [...stars].sort((a, b) => b.overall - a.overall)

    ordered.forEach((star) => {
        const family = familyOf(star.position)
        const candidates = [
            (index) => index < STARTER_COUNT && SQUAD_TEMPLATE[index][0] === star.position,
            (index) => index < STARTER_COUNT && familyOf(SQUAD_TEMPLATE[index][0]) === family,
            (index) => index < STARTER_COUNT && ['LW', 'RW', 'ST'].includes(family) && ['LW', 'RW', 'ST'].includes(familyOf(SQUAD_TEMPLATE[index][0])),
            (index) => familyOf(SQUAD_TEMPLATE[index][0]) === family,
            () => true,
        ]

        for (const test of candidates) {
            const slot = SQUAD_TEMPLATE.findIndex((_, index) => !taken.has(index) && test(index))

            if (slot >= 0) {
                taken.set(slot, star)
                break
            }
        }
    })

    return taken
}

function buildSquad(club) {
    const stars = placeStars(club.stars || [])
    const usedNames = new Set([...stars.values()].map((star) => star.name))

    return SQUAD_TEMPLATE.map(([slotPosition, number], slot) => {
        const star = stars.get(slot)
        const position = star ? star.position : slotPosition
        const overall = star ? star.overall : overallFor(club, slot)
        const identity = star
            ? { name: star.name, nationality: null }
            : pickName(club, slot, usedNames)
        const id = `${club.id}-p${String(slot + 1).padStart(2, '0')}`
        const value = valueOf(overall)

        return {
            id,
            playerId: id,
            name: identity.name,
            position,
            number,
            overall,
            ...statsFor(club, slot, position, number, overall),
            age: ageFor(club, slot, Boolean(star)),
            nationality: identity.nationality || null,
            star: Boolean(star),
            slot,
            clubId: club.id,
            club: club.name,
            countryId: club.countryId,
            value,
            wage: wageOf(value),
            rarity: rarityOf(overall),
        }
    })
}

const cache = new Map()

export function worldSquad(clubId) {
    if (cache.has(clubId)) return cache.get(clubId)

    const club = CLUB_BY_ID.get(clubId)
    const squad = club ? buildSquad(club) : []

    cache.set(clubId, squad)
    return squad
}

// Mọi cầu thủ thế giới cho thị trường / gói thẻ. CLB người chơi (MU) chỉ góp
// các ngôi sao thật; đội hình gốc MU (Huy Le…) có sẵn trong thị trường.
let allPlayers = null

export function allWorldPlayers() {
    if (allPlayers) return allPlayers

    allPlayers = WORLD_CLUBS.flatMap((club) => {
        const squad = worldSquad(club.id)

        return club.id === USER_CLUB_ID ? squad.filter((player) => player.star) : squad
    })

    return allPlayers
}
