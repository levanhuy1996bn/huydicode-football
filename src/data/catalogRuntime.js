// Phase 53A: nạp bản sửa cầu thủ (player_edits) lúc đang chạy rồi dựng lại danh
// mục, đội hình CLB, thị trường, kho rút gói — dùng ở server economy (Edge
// Function), nơi không có localStorage và một tiến trình phục vụ nhiều lượt.
import { setCatalogEditRows } from './catalogOverrides'
import { rebuildPlayerCatalog } from './playerCatalog'
import { resetWorldSquads } from './worldSquads'
import { TRANSFER_MARKET, rebuildTransferMarket } from './transferMarket'
import { resetPackPools } from '../services/cards'

export function applyCatalogEdits(rows, version = null) {
    setCatalogEditRows(rows, version)
    resetWorldSquads()
    rebuildPlayerCatalog()
    rebuildTransferMarket()
    resetPackPools()

    return { version, edits: (rows || []).length, market: TRANSFER_MARKET.length }
}
