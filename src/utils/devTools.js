// Phase 34: công cụ ẩn (DEV) — mở bằng mã trong ⚙ Settings.
//
// Gõ đúng mã → hiện nút DEV (chỉ trong phiên này: tải lại trang là mất, không
// lưu localStorage). Bảng DEV:
// - Set budget: ghi thẳng ngân sách EP vào bản lưu CLB (GameScene đăng ký
//   hàm ghi qua registerDevBudget).
// - Reset daily limits (Phase 41): lượt SIMULATE và lượt World Cup hôm nay.
// - +% đập thẻ: cộng thêm vào tỉ lệ mọi lần đập (services/upgrade.js →
//   rateBreakdown), tối đa 100%. Cũng chỉ trong phiên.

const DEV_CODE = 'AHUYBIHO2810'

export const devState = { unlocked: false, upgradeBonus: 0 }

const listeners = new Set()
let budgetWriter = null
let dailyResetter = null

const notify = () => listeners.forEach((listener) => listener())

export function onDevChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

// Trả về true nếu đúng mã (không phân biệt hoa thường, bỏ khoảng trắng).
export function unlockDev(code) {
    const ok = String(code || '').trim().toUpperCase() === DEV_CODE

    if (ok && !devState.unlocked) {
        devState.unlocked = true
        notify()
    }

    return ok
}

// 0…100 (%) → 0…1
export function setDevUpgradeBonus(percent) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0))

    devState.upgradeBonus = value / 100
    notify()
    return value
}

export const devUpgradeBonus = () => (devState.unlocked ? devState.upgradeBonus : 0)

export function registerDevBudget(writer) {
    budgetWriter = writer
    return () => {
        if (budgetWriter === writer) budgetWriter = null
    }
}

export function setDevBudget(amount) {
    const value = Math.max(0, Math.round(Number(String(amount).replace(/[^\d.]/g, '')) || 0))

    if (!devState.unlocked || !budgetWriter) return null

    budgetWriter(value)
    return value
}

// Phase 41: đặt lại lượt SIMULATE (5/ngày) và lượt World Cup (2/ngày) của hôm nay.
export function registerDevDailyReset(resetter) {
    dailyResetter = resetter
    return () => {
        if (dailyResetter === resetter) dailyResetter = null
    }
}

export function resetDevDaily() {
    if (!devState.unlocked || !dailyResetter) return false

    dailyResetter()
    return true
}
