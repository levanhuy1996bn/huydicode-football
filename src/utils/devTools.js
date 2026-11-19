// Phase 34: công cụ ẩn (DEV) trong ⚙ Settings.
//
// Phase 51: không còn mã nhập tay (mã cũ nằm thẳng trong code, ai xem mã nguồn
// cũng đọc được). DEV chỉ mở khi đăng nhập bằng tài khoản có trong bảng
// public.developers trên Supabase (services/cloudExtras.js hỏi hàm
// is_developer() rồi gọi setDevAccess). Đăng xuất → khoá lại. Bảng DEV:
// - Set budget: ghi thẳng ngân sách EP vào bản lưu CLB (GameScene đăng ký
//   hàm ghi qua registerDevBudget).
// - Reset daily limits (Phase 41): lượt SIMULATE và lượt World Cup hôm nay.
// - +% đập thẻ: cộng thêm vào tỉ lệ mọi lần đập (services/upgrade.js →
//   rateBreakdown), tối đa 100%. Cũng chỉ trong phiên.

export const devState = { unlocked: false, upgradeBonus: 0, adminOpen: false }

const listeners = new Set()
let budgetWriter = null
let dailyResetter = null

const notify = () => listeners.forEach((listener) => listener())

export function onDevChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

// Phase 51: bật / tắt theo tài khoản (khoá lại thì bỏ luôn +% đập thẻ).
export function setDevAccess(allowed) {
    const unlocked = Boolean(allowed)

    if (devState.unlocked === unlocked) return

    devState.unlocked = unlocked
    if (!unlocked) {
        devState.upgradeBonus = 0
        devState.adminOpen = false
    }
    notify()
}

// Phase 52: trang ADMIN (components/AdminHost.jsx hiện khi adminOpen).
export function openAdmin() {
    if (!devState.unlocked || devState.adminOpen) return

    devState.adminOpen = true
    notify()
}

export function closeAdmin() {
    if (!devState.adminOpen) return

    devState.adminOpen = false
    notify()
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
