// Phase 31: thành tích đập thẻ (kiểu FO3).
// Mỗi mốc +2 … +10 là một thành tích riêng:
//   - LẦN ĐẦU có thẻ đạt mốc đó (thẻ đang có sẵn ở cấp cao cũng tính),
//   - mỗi khi số lần đập THÀNH CÔNG lên đúng mốc đó đủ 10, 20, 30… lần
//     (không giới hạn; lần 50 và 100 thưởng EP gấp đôi).
// Thất bại (kể cả tụt cấp) không tính. Thưởng nhận bằng nút CLAIM → vào kho
// REWARDS (thẻ EP, boost, thẻ bảo vệ, gói Premium).
//
// Lưu trong CLB: club.upgradeAchievements = {
//   counts: { 2: n, …, 10: n },   // số lần đập thành công lên từng mốc
//   best: 7,                      // cấp cao nhất từng đạt (giữ cả khi đã bán thẻ)
//   claimed: { '5:first': 1, '5:10': 1, … },
// }
import { boostCard, epCard, playerPack, protectionCard, randomBoostPercent } from './cards'
import { formatMoney } from './clubService'

export const ACHIEVEMENT_LEVELS = [2, 3, 4, 5, 6, 7, 8, 9, 10]
export const MILESTONE_STEP = 10
export const DOUBLE_AT = [50, 100]

// { ep, boost, protection, premium } — lần đầu / mỗi 10 lần.
export const ACHIEVEMENT_REWARDS = {
    2: { first: { ep: 500000 }, every: { ep: 500000 } },
    3: { first: { ep: 1000000 }, every: { ep: 1000000 } },
    4: { first: { ep: 2000000 }, every: { ep: 1500000, boost: 1 } },
    5: { first: { ep: 4000000, boost: 1 }, every: { ep: 4000000, boost: 1 } },
    6: { first: { ep: 7000000 }, every: { ep: 7000000, protection: 1 } },
    7: { first: { ep: 12000000, boost: 1 }, every: { ep: 12000000, protection: 1 } },
    8: { first: { ep: 20000000, protection: 1 }, every: { ep: 20000000, premium: 1 } },
    9: { first: { ep: 35000000, premium: 1 }, every: { ep: 35000000, premium: 1, protection: 1 } },
    10: { first: { ep: 60000000, premium: 1, protection: 2 }, every: { ep: 60000000, premium: 1, protection: 2 } },
}

const EMPTY = { counts: {}, best: 1, claimed: {} }

export const achievementsOf = (club) => ({ ...EMPTY, ...(club?.upgradeAchievements || {}) })

// milestone: 'first' | 10 | 20 | …
export const milestoneKey = (level, milestone) => `${level}:${milestone}`

export function rewardFor(level, milestone) {
    const table = ACHIEVEMENT_REWARDS[level]

    if (!table) return null

    const base = milestone === 'first' ? table.first : table.every
    const double = milestone !== 'first' && DOUBLE_AT.includes(milestone)

    return { ...base, ep: base.ep * (double ? 2 : 1), double }
}

export function rewardLabel(reward) {
    if (!reward) return ''

    return [
        reward.ep ? formatMoney(reward.ep) : null,
        reward.boost ? `${reward.boost} Upgrade Boost` : null,
        reward.protection ? `${reward.protection} Protection` : null,
        reward.premium ? `${reward.premium} Premium pack` : null,
    ].filter(Boolean).join(' + ')
}

export const milestoneLabel = (level, milestone) =>
    milestone === 'first' ? `First +${level}` : `+${level} × ${milestone}`

// Cấp cao nhất hiện có trong đội (thẻ có sẵn từ trước khi có tính năng).
const squadBest = (squad = []) => squad.reduce((best, card) => Math.max(best, card?.upgrade || 1), 1)

// Trạng thái từng mốc cho giao diện.
export function achievementRows(club, squad = []) {
    const data = achievementsOf(club)
    const best = Math.max(data.best || 1, squadBest(squad))

    return ACHIEVEMENT_LEVELS.map((level) => {
        const count = data.counts[level] || 0
        const firstReached = best >= level || count > 0
        const firstClaimed = Boolean(data.claimed[milestoneKey(level, 'first')])
        const pending = []

        if (firstReached && !firstClaimed) pending.push('first')

        for (let milestone = MILESTONE_STEP; milestone <= count; milestone += MILESTONE_STEP) {
            if (!data.claimed[milestoneKey(level, milestone)]) pending.push(milestone)
        }

        const nextMilestone = (Math.floor(count / MILESTONE_STEP) + 1) * MILESTONE_STEP

        return {
            level,
            count,
            firstReached,
            firstClaimed,
            pending,
            nextMilestone,
            progress: count % MILESTONE_STEP,
            nextReward: rewardFor(level, nextMilestone),
            firstReward: rewardFor(level, 'first'),
        }
    })
}

export const pendingAchievementCount = (club, squad = []) =>
    achievementRows(club, squad).reduce((sum, row) => sum + row.pending.length, 0)

// Ghi một lần đập thành công lên `level`. Trả về { club, reached: [{ level, milestone }] }.
export function recordUpgradeSuccess(club, level, squad = []) {
    if (!ACHIEVEMENT_LEVELS.includes(level)) return { club, reached: [] }

    const data = achievementsOf(club)
    const before = Math.max(data.best || 1, squadBest(squad))
    const count = (data.counts[level] || 0) + 1
    const reached = []

    if (before < level && count === 1) reached.push({ level, milestone: 'first' })
    if (count % MILESTONE_STEP === 0) reached.push({ level, milestone: count })

    return {
        club: {
            ...club,
            upgradeAchievements: {
                ...data,
                counts: { ...data.counts, [level]: count },
                best: Math.max(data.best || 1, level),
            },
        },
        reached,
    }
}

// Vật phẩm của một phần thưởng (vào kho REWARDS).
export function rewardItems(level, milestone, random = Math.random) {
    const reward = rewardFor(level, milestone)

    if (!reward) return []

    const source = `Achievement · ${milestoneLabel(level, milestone)}`
    const items = []

    if (reward.ep) items.push(epCard(reward.ep, source))
    for (let index = 0; index < (reward.boost || 0); index += 1) items.push(boostCard(randomBoostPercent(random), source))
    for (let index = 0; index < (reward.protection || 0); index += 1) items.push(protectionCard(source))
    for (let index = 0; index < (reward.premium || 0); index += 1) items.push(playerPack('premium', source))

    return items
}

// Nhận một (hoặc mọi) phần thưởng đang chờ. Trả về { club, claimed: [{ level, milestone }], items }.
export function claimAchievements(club, squad = [], only = null) {
    const rows = achievementRows(club, squad)
    const data = achievementsOf(club)
    const claimed = { ...data.claimed }
    const list = []
    const items = []
    const now = Date.now()

    rows.forEach((row) => {
        row.pending.forEach((milestone) => {
            if (only && !(only.level === row.level && only.milestone === milestone)) return

            claimed[milestoneKey(row.level, milestone)] = now
            list.push({ level: row.level, milestone })
            items.push(...rewardItems(row.level, milestone))
        })
    })

    if (!list.length) return { club, claimed: [], items: [] }

    return {
        club: {
            ...club,
            inventory: [...(club.inventory || []), ...items],
            upgradeAchievements: { ...data, claimed },
        },
        claimed: list,
        items,
    }
}
