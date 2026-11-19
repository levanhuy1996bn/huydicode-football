// Phase 52: tải bản sửa dữ liệu cầu thủ từ Supabase.
//
// Mở game → hỏi số phiên bản (bảng catalog_version, rất nhẹ). Khác với bản
// đang dùng → tải cả bảng player_edits, ghi vào localStorage. Dữ liệu cầu thủ
// được dựng lúc nạp game (data/catalogOverrides.js), nên bản mới có hiệu lực
// khi tải lại trang: hiện thông báo "Player database updated · RELOAD" (và tự
// áp dụng ở lần mở game sau). Mất mạng → dùng bản đã lưu.
import { CATALOG_CACHE_KEY, appliedCatalogVersion } from '../data/catalogOverrides'
import { cloudConfigured, getClient } from './cloudSave'

let state = { updateReady: false, version: appliedCatalogVersion, checkedAt: null }
const listeners = new Set()

function setState(patch) {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
}

export const getCatalogState = () => state

export function subscribeCatalog(listener) {
    listeners.add(listener)
    listener(state)
    return () => listeners.delete(listener)
}

function writeCache(version, rows) {
    try {
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ version, savedAt: Date.now(), rows }))
        return true
    } catch {
        return false
    }
}

async function fetchVersion(client) {
    const { data, error } = await client.from('catalog_version').select('version').eq('id', 1).maybeSingle()

    if (error) throw error

    return Number(data?.version ?? 0)
}

// Tải lại cả bảng nếu phiên bản khác bản đang lưu. Trả về true khi có bản mới.
export async function refreshCatalog({ force = false } = {}) {
    if (!cloudConfigured) return false

    const client = await getClient()
    const version = await fetchVersion(client)
    const stored = (() => {
        try {
            return JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null')?.version ?? null
        } catch {
            return null
        }
    })()

    if (!force && stored === version) {
        setState({ checkedAt: Date.now(), updateReady: version !== appliedCatalogVersion })
        return false
    }

    const { data, error } = await client.from('player_edits').select('id, kind, data, updated_at')

    if (error) throw error

    writeCache(version, Array.isArray(data) ? data : [])
    // Lần đầu (chưa từng tải) và bảng trống → không có gì để áp dụng.
    const changed = !(appliedCatalogVersion === null && !data?.length)

    setState({ checkedAt: Date.now(), version, updateReady: changed && version !== appliedCatalogVersion })
    return changed
}

export function dismissCatalogUpdate() {
    setState({ updateReady: false })
}

let started = false

export function startCatalogSync() {
    if (started || !cloudConfigured) return
    started = true

    // Để game hiện màn hình trước rồi mới hỏi.
    setTimeout(() => {
        refreshCatalog().catch(() => {
            // offline / lỗi mạng → dùng bản đã lưu
        })
    }, 1500)
}
