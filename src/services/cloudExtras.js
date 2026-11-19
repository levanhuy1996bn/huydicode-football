// Phase 51: phần thêm trên tài khoản Supabase — quyền DEV và gift code.
//
// - Đăng nhập → hỏi is_developer() → mở / khoá bảng DEV (utils/devTools).
// - Gift code: redeemGiftCode('ABC') gọi hàm redeem_gift_code trên server
//   (server giữ luật "mỗi tài khoản một lần"), rồi thêm phần thưởng vào kho
//   REWARDS qua hàm GameScene đăng ký (registerGiftApplier).
// - Sau mỗi lần đồng bộ xong lần đầu của một tài khoản: đọc các mã tài khoản
//   đã dùng (bảng gift_redemptions, chỉ thấy dòng của mình) và thêm lại phần
//   thưởng nào bản lưu hiện tại chưa có (applyGift bỏ qua mã đã có).
import { getClient, getCloudState, subscribeCloud } from './cloudSave'
import { setDevAccess } from '../utils/devTools'
import { GIFT_ERRORS, applyGift } from './giftCodes'

let applier = null
let checkedDevFor = null
let restoredFor = null
let pendingRestore = []

// GameScene: fn(updater) → setClub(updater).
export function registerGiftApplier(fn) {
    applier = fn

    if (pendingRestore.length) {
        const gifts = pendingRestore

        pendingRestore = []
        applyAll(gifts)
    }

    return () => {
        if (applier === fn) applier = null
    }
}

function applyAll(gifts) {
    if (!gifts.length) return

    if (!applier) {
        pendingRestore = [...pendingRestore, ...gifts]
        return
    }

    applier((club) => gifts.reduce((current, gift) => applyGift(current, gift), club))
}

async function checkDeveloper(userId) {
    try {
        const client = await getClient()
        const { data, error } = await client.rpc('is_developer')

        // Người dùng đã đổi tài khoản trong lúc chờ → bỏ kết quả cũ.
        if (getCloudState().user?.id !== userId) return
        setDevAccess(!error && data === true)
    } catch {
        setDevAccess(false)
    }
}

async function restoreGifts(userId) {
    try {
        const client = await getClient()
        const { data, error } = await client
            .from('gift_redemptions')
            .select('code, rewards, redeemed_at')
            .eq('user_id', userId)

        if (error || !Array.isArray(data) || getCloudState().user?.id !== userId) return

        applyAll(data.map((row) => ({
            code: row.code,
            rewards: row.rewards,
            redeemedAt: Date.parse(row.redeemed_at) || Date.now(),
        })))
    } catch {
        // thử lại ở lần mở game sau
        if (restoredFor === userId) restoredFor = null
    }
}

export async function redeemGiftCode(input) {
    const code = String(input || '').trim().toUpperCase()

    if (!getCloudState().user) return { ok: false, message: GIFT_ERRORS.signed_out }
    if (!/^[A-Z0-9_-]{4,32}$/.test(code)) return { ok: false, message: GIFT_ERRORS.invalid }

    try {
        const client = await getClient()
        const { data, error } = await client.rpc('redeem_gift_code', { p_code: code })

        if (error) {
            const offline = navigator.onLine === false || /fetch|network/i.test(error.message || '')

            return { ok: false, message: offline ? 'No connection — try again when you are online.' : 'Could not check the code. Try again later.' }
        }

        if (!data?.ok) return { ok: false, message: GIFT_ERRORS[data?.error] || GIFT_ERRORS.invalid }

        applyAll([{ code: data.code, rewards: data.rewards, redeemedAt: Date.parse(data.redeemed_at) || Date.now() }])

        return { ok: true, code: data.code, rewards: data.rewards, note: data.note || '' }
    } catch {
        return { ok: false, message: 'No connection — try again when you are online.' }
    }
}

let started = false

export function startCloudExtras() {
    if (started) return
    started = true

    subscribeCloud((state) => {
        const userId = state.user?.id || null

        if (!userId) {
            checkedDevFor = null
            restoredFor = null
            setDevAccess(false)
            return
        }

        if (checkedDevFor !== userId) {
            checkedDevFor = userId
            setTimeout(() => checkDeveloper(userId), 0)
        }

        // Chờ đồng bộ xong (bản lưu trong máy đã là bản đúng, không sắp tải lại trang).
        if (state.status === 'synced' && restoredFor !== userId) {
            restoredFor = userId
            setTimeout(() => restoreGifts(userId), 0)
        }
    })
}
