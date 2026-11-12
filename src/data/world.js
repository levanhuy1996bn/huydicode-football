// Phase 26A: tra cứu thế giới bóng đá (18 nước, 36 giải, 720 CLB).
// Dữ liệu thô ở worldClubs.js; file này chỉ phân tích và tính sức mạnh.
// Không import gì ngoài worldClubs.js (tránh vòng lặp import).
import { WORLD_COUNTRIES } from './worldClubs'
import { NATION_BY_ID } from './nations'

// Phase 26B: mọi CLB (kể cả Manchester United) dùng id thật; CLB người chơi
// quản lý lưu ở bản lưu thế giới (services/career.js). Id cũ trong bản lưu:
// 'blue' = Manchester United (trước 26B), 'red' = Manchester City (trước 26A).
// ('blue' / 'red' trong engine 3D chỉ còn là 2 phía sân: đội mình / đối thủ.)
export const MAN_UTD_ID = 'eng-manchester-united'
export const LEGACY_CLUB_ALIASES = { red: 'eng-manchester-city', blue: MAN_UTD_ID }

export function slugify(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/[øØ]/g, 'o')
        .replace(/[łŁ]/g, 'l')
        .replace(/[ıİ]/g, 'i')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function hashString(value) {
    let hash = 2166136261

    for (const char of String(value)) {
        hash ^= char.charCodeAt(0)
        hash = Math.imul(hash, 16777619) >>> 0
    }

    return hash
}

// Số giả ngẫu nhiên 0..1 tất định theo một chuỗi.
export const hash01 = (value) => (hashString(value) % 100000) / 100000

function parseStars(text) {
    if (!text) return []

    return text
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const [name, position, overall] = item.split(':')

            return { name: name.trim(), position: position.trim(), overall: Number(overall) }
        })
}

function parseClubs(block) {
    return String(block || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const uncertain = line.endsWith('?')
            const [name, shortName, primary, secondary, stars] = line.replace(/\?$/, '').split('|')

            return {
                fullName: name.trim(),
                shortName: shortName.trim(),
                primary: primary.trim(),
                secondary: (secondary || '#ffffff').trim(),
                stars: parseStars(stars),
                uncertain,
            }
        })
}

// ---- Sức mạnh ----
// Giải hạng nhất: CLB mạnh nhất 86 − (hạng nước − 1) × 0.75, yếu nhất
// 72 − (hạng nước − 1) × 0.6. Hạng hai: từ (yếu nhất hạng nhất + 2) xuống 8.
// Trong giải nội suy theo thứ tự trong danh sách (mạnh → yếu) + lệch nhẹ.
function strengthRange(rank, tier) {
    const topMax = 86 - (rank - 1) * 0.75
    const topMin = 72 - (rank - 1) * 0.6

    if (tier === 1) return [topMax, topMin]
    return [topMin + 2, topMin - 8]
}

function strengthAt(range, index, count, seed) {
    const [max, min] = range
    const t = count > 1 ? index / (count - 1) : 0
    const jitter = (hash01(seed) - 0.5) * 1.6

    return Math.round(max - (max - min) * Math.pow(t, 0.85) + jitter)
}

const leagues = []
const clubs = []
const usedIds = new Set()

function clubIdFor(country, fullName) {
    let id = `${country.id}-${slugify(fullName)}`

    while (usedIds.has(id)) id = `${id}-2`

    return id
}

WORLD_COUNTRIES.forEach((country) => {
    ;[
        [country.top, country.topClubs, 1],
        [country.second, country.secondClubs, 2],
    ].forEach(([info, block, tier]) => {
        const parsed = parseClubs(block)
        const range = strengthRange(country.rank, tier)
        const clubIds = []

        parsed.forEach((raw, index) => {
            const id = clubIdFor(country, raw.fullName)

            usedIds.add(id)
            clubIds.push(id)
            clubs.push({
                id,
                name: raw.fullName.toUpperCase(),
                fullName: raw.fullName,
                shortName: raw.shortName,
                color: raw.primary,
                colors: [raw.primary, raw.secondary],
                stars: tier === 1 ? raw.stars : [],
                uncertain: raw.uncertain,
                countryId: country.id,
                country: country.name,
                nationality: country.nationality,
                homeLeagueId: info.id,
                tier,
                strength: strengthAt(range, index, parsed.length, id),
            })
        })

        leagues.push({
            id: info.id,
            name: info.name,
            countryId: country.id,
            country: country.name,
            tier,
            rank: country.rank,
            clubIds,
        })
    })
})

export const WORLD_LEAGUES = leagues
export const WORLD_CLUBS = clubs
export const LEAGUE_BY_ID = new Map(leagues.map((league) => [league.id, league]))
export const CLUB_BY_ID = new Map(clubs.map((club) => [club.id, club]))

export const COUNTRIES = WORLD_COUNTRIES.map((country) => ({
    id: country.id,
    name: country.name,
    nationality: country.nationality,
    rank: country.rank,
    topLeagueId: country.top.id,
    secondLeagueId: country.second.id,
}))
export const COUNTRY_BY_ID = new Map(COUNTRIES.map((country) => [country.id, country]))

export function worldClub(clubId) {
    const id = LEGACY_CLUB_ALIASES[clubId] || clubId

    // Phase 29E: đội tuyển quốc gia ('nat-xxx') dùng chung như một CLB ảo.
    return CLUB_BY_ID.get(id) || NATION_BY_ID.get(id) || null
}

// Giải mặc định (danh sách gốc của dữ liệu) cho mỗi giải.
export const INITIAL_DIVISIONS = Object.fromEntries(leagues.map((league) => [league.id, [...league.clubIds]]))
