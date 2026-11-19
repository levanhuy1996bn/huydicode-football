// Phase 51: phần thưởng gift code.
//
// Mã do chủ game tạo trong Supabase (bảng gift_codes, xem
// supabase/51_dev_and_gift_codes.sql); mỗi tài khoản dùng một mã một lần —
// luật đó nằm ở server (hàm redeem_gift_code). Ở đây chỉ đổi phần thưởng
// (JSON) thành vật phẩm trong kho REWARDS và đánh dấu mã đã nhận trong bản lưu
// CLB: club.giftCodes = { CODE: thời điểm nhận }.
//
// Đánh dấu trong bản lưu để: nhận lại được nếu bản lưu có phần thưởng bị bỏ
// (chọn KEEP CLOUD SAVE khi xung đột, chơi lại từ đầu…) — game đối chiếu với
// danh sách mã tài khoản đã dùng trên server — mà không bao giờ cộng hai lần.
import { boostCard, epCard, fitnessCard, formCard, playerPack, protectionCard, randomBoostPercent } from './cards'
import { emptyBottle } from './xpBottle'
import { formatMoney } from './clubService'

const MAX_COUNT = 50
const MAX_EP = 100000000000

const count = (value) => Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(value) || 0)))

// rewards JSON → { ep, standard, premium, boost, protection, fitness, form, bottle } (đã kẹp giá trị).
export function normalizeRewards(rewards) {
    const source = rewards && typeof rewards === 'object' ? rewards : {}

    return {
        ep: Math.max(0, Math.min(MAX_EP, Math.round(Number(source.ep) || 0))),
        standard: count(source.standard),
        premium: count(source.premium),
        boost: count(source.boost),
        protection: count(source.protection),
        fitness: count(source.fitness),
        form: count(source.form),
        bottle: count(source.bottle),
    }
}

const plural = (amount, word) => `${amount} ${word}${amount === 1 ? '' : 's'}`

export function giftRewardLabel(rewards) {
    const reward = normalizeRewards(rewards)
    const parts = [
        reward.ep ? `${formatMoney(reward.ep)} card` : null,
        reward.premium ? plural(reward.premium, 'Premium pack') : null,
        reward.standard ? plural(reward.standard, 'Player pack') : null,
        reward.boost ? plural(reward.boost, 'Upgrade Boost') : null,
        reward.protection ? plural(reward.protection, 'Protection card') : null,
        reward.fitness ? plural(reward.fitness, 'Fitness card') : null,
        reward.form ? plural(reward.form, 'Form card') : null,
        reward.bottle ? plural(reward.bottle, 'EXP bottle') : null,
    ].filter(Boolean)

    return parts.length ? parts.join(' + ') : 'no items'
}

export function giftRewardItems(rewards, code, random = Math.random) {
    const reward = normalizeRewards(rewards)
    const source = `Gift code · ${code}`
    const items = []
    const repeat = (times, make) => {
        for (let index = 0; index < times; index += 1) items.push(make())
    }

    if (reward.ep) items.push(epCard(reward.ep, source))
    repeat(reward.premium, () => playerPack('premium', source))
    repeat(reward.standard, () => playerPack('standard', source))
    repeat(reward.boost, () => boostCard(randomBoostPercent(random), source))
    repeat(reward.protection, () => protectionCard(source))
    repeat(reward.fitness, () => fitnessCard(source))
    repeat(reward.form, () => formCard(source))
    repeat(reward.bottle, () => emptyBottle(source))

    return items
}

export const hasGift = (club, code) => Boolean(club?.giftCodes?.[code])

// Thêm phần thưởng của một mã vào CLB (bỏ qua nếu bản lưu đã có mã này).
export function applyGift(club, { code, rewards, redeemedAt = Date.now() }, random = Math.random) {
    if (!club || !code || hasGift(club, code)) return club

    return {
        ...club,
        inventory: [...(club.inventory || []), ...giftRewardItems(rewards, code, random)],
        giftCodes: { ...(club.giftCodes || {}), [code]: redeemedAt },
    }
}

export const GIFT_ERRORS = {
    signed_out: 'Sign in to use a gift code.',
    invalid: 'This code does not exist or is no longer active.',
    not_started: 'This code cannot be used yet.',
    expired: 'This code has expired.',
    already_used: 'This account has already used this code.',
    used_up: 'This code has reached its limit.',
}
