// Phase 52: chỉnh sửa dữ liệu cầu thủ từ Supabase (bảng player_edits).
//
// Dữ liệu gốc vẫn ở trong code (playerCatalog.js, worldSquads.js). Trên
// Supabase chỉ có:
//   - kind 'override': sửa một cầu thủ có sẵn (id = id cầu thủ trong game),
//   - kind 'custom'  : cầu thủ mới (id 'cx-…'), tự do hoặc thuộc một CLB.
// Game tải bảng đó (services/catalogSync.js) và giữ bản sao trong
// localStorage (CATALOG_CACHE_KEY). Module này đọc bản sao NGAY KHI NẠP —
// trước khi thị trường / gói thẻ / đội hình AI được dựng — nên thay đổi mới
// có hiệu lực từ lần mở game sau (hoặc bấm RELOAD).
//
// Thẻ người chơi đã sở hữu là bản sao riêng → không đổi theo (giống thẻ mùa
// của FO4); thẻ mua / mở gói sau đó mới mang chỉ số mới.

export const CATALOG_CACHE_KEY = 'ufm-player-edits-v1'

export const EDIT_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
export const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

// [trường, nhỏ nhất, lớn nhất]
const NUMBER_FIELDS = [
    ['age', 15, 45],
    ['height', 150, 210],
    ['weight', 50, 115],
    ['overall', 30, 99],
    ...STAT_KEYS.map((key) => [key, 1, 99]),
]

export const rarityFor = (overall) => (overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze')
export const valueFor = (overall) =>
    Math.max(100000, Math.round((1000000 * Math.pow(1.152, overall - 60)) / 100000) * 100000)
export const wageFor = (value) => Math.max(2000, Math.round((value * 0.003) / 1000) * 1000)

// Chỉ giữ các trường được phép, kẹp giá trị. Trường không có → bỏ qua.
export function sanitizeEdit(data, { custom = false } = {}) {
    const source = data && typeof data === 'object' ? data : {}
    const out = {}

    if (typeof source.name === 'string' && source.name.trim()) out.name = source.name.trim().slice(0, 40)
    if (EDIT_POSITIONS.includes(source.position)) out.position = source.position
    if (typeof source.nationality === 'string') out.nationality = source.nationality.trim().slice(0, 40) || null

    NUMBER_FIELDS.forEach(([key, min, max]) => {
        const value = Number(source[key])

        if (source[key] !== undefined && source[key] !== null && source[key] !== '' && Number.isFinite(value)) {
            out[key] = Math.max(min, Math.min(max, Math.round(value)))
        }
    })

    if (custom) out.clubId = typeof source.clubId === 'string' && source.clubId ? source.clubId : null

    return out
}

function readCache() {
    try {
        if (typeof localStorage === 'undefined') return null

        const parsed = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null')

        return parsed && Array.isArray(parsed.rows) ? parsed : null
    } catch {
        return null
    }
}

const cache = readCache()

// Phiên bản đang áp dụng trong lần chạy này (null = chưa từng tải).
export let appliedCatalogVersion = cache ? cache.version ?? null : null

const overrides = new Map()
const customs = []
// Phase 52b: bản sửa có "cập nhật cả thẻ đang sở hữu" → id cầu thủ → dấu thời gian lần lưu.
const ownedSync = new Map()
// Bản gốc của cầu thủ đã bị sửa (cho trang ADMIN: so sánh / đặt lại).
const originals = new Map()

function loadRows(rows) {
    overrides.clear()
    customs.length = 0
    ownedSync.clear()
    originals.clear()

    ;(rows || []).forEach((row) => {
        if (!row || typeof row.id !== 'string') return

        if (row.data?.syncOwned === true) ownedSync.set(row.id, String(row.updated_at || row.id))

        if (row.kind === 'override') {
            overrides.set(row.id, sanitizeEdit(row.data))
        } else if (row.kind === 'custom' && row.id.startsWith('cx-')) {
            const data = sanitizeEdit(row.data, { custom: true })

            if (data.name && data.position) customs.push({ id: row.id, ...data })
        }
    })
}

loadRows(cache?.rows)

// Phase 53A: server economy nạp bản sửa lúc chạy (không có localStorage).
// Gọi xong phải dựng lại danh mục / thị trường (data/catalogRuntime.js).
export function setCatalogEditRows(rows, version = null) {
    loadRows(rows)
    appliedCatalogVersion = version
}

export const originalOf = (id) => originals.get(id) || null
export const hasOverride = (id) => overrides.has(id)
export const appliedOverrideCount = () => overrides.size
export const appliedCustomCount = () => customs.length
// Dấu của bản sửa yêu cầu cập nhật thẻ đang sở hữu (null = không).
export const ownedSyncStamp = (id) => ownedSync.get(id) || null
export const hasOwnedSync = () => ownedSync.size > 0

// Áp bản sửa (nếu có) lên một cầu thủ gốc. record = ghi lại bản gốc cho ADMIN
// (thị trường / danh mục / đội hình CLB; đội hình ban đầu thì không).
export function applyOverride(player, { record = true } = {}) {
    const data = player && overrides.get(player.id)

    if (!data) return player

    if (record && !originals.has(player.id)) originals.set(player.id, player)

    const next = { ...player, ...data }

    if (data.overall !== undefined) {
        next.rarity = rarityFor(next.overall)
        next.value = valueFor(next.overall)
        next.wage = wageFor(next.value)
    }

    return next
}

const DEFAULT_STAT = 60

function customPlayer(data, extra) {
    const overall = data.overall ?? DEFAULT_STAT
    const value = valueFor(overall)
    const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, data[key] ?? overall]))

    return {
        id: data.id,
        playerId: data.id,
        name: data.name,
        position: data.position,
        overall,
        ...stats,
        age: data.age ?? 24,
        height: data.height ?? (data.position === 'GK' ? 189 : 181),
        weight: data.weight ?? (data.position === 'GK' ? 84 : 76),
        nationality: data.nationality || null,
        value,
        wage: wageFor(value),
        rarity: rarityFor(overall),
        custom: true,
        ...extra,
    }
}

// Cầu thủ mới thuộc CLB `club` (thêm sau 22 người của đội hình, số áo 25+).
export function customSquadPlayers(club, squad = []) {
    const mine = customs.filter((data) => data.clubId === club.id)

    if (!mine.length) return []

    const usedNumbers = new Set(squad.map((player) => player.number))
    let number = 25

    return mine.map((data, index) => {
        while (usedNumbers.has(number)) number += 1
        usedNumbers.add(number)

        return customPlayer(data, {
            number,
            star: false,
            slot: squad.length + index,
            clubId: club.id,
            club: club.name,
            countryId: club.countryId,
        })
    })
}

// Cầu thủ mới không thuộc CLB nào → nằm cùng nhóm cầu thủ tự do (PLAYER_CATALOG).
export function customFreeAgents() {
    return customs.filter((data) => !data.clubId).map((data) => customPlayer(data, {}))
}
