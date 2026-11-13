// Phase 23: cấp độ CLB, XP, tiền thưởng (EP) sau trận và thưởng lên cấp.
import { boostCard, epCard, fitnessCard, formCard, playerPack, protectionCard, randomBoostPercent } from './cards'

// XP CLB nhận sau mỗi trận giải đấu (trận bỏ cuộc không tính).
export const CLUB_XP = {
    win: 60,
    draw: 35,
    loss: 20,
    cleanSheet: 10,
    bigWin: 15, // thắng cách biệt từ 3 bàn
}

// XP cần để lên cấp tiếp theo: cấp 0 → 1 cần 50, mỗi cấp sau cần thêm 25.
export const clubXpToNext = (level) => 50 + level * 25

// Thưởng khi đạt một cấp: cấp chia hết cho 5 → 10.000.000 EP + gói Premium,
// các cấp khác → 5.000.000 EP + gói thường.
export function levelRewards(level) {
    const milestone = level % 5 === 0

    return {
        ep: milestone ? 10000000 : 5000000,
        pack: milestone ? 'premium' : 'standard',
        // Phase 29C: cấp 5, 10, 15… tặng thêm 1 thẻ bảo vệ.
        protection: milestone ? 1 : 0,
        // Phase 29I: mỗi cấp 1 thẻ Thể lực; cấp 5, 10, 15… thêm thẻ Phong độ +
        // thẻ tăng tỉ lệ đập (+3–5%).
        fitness: 1,
        form: milestone ? 1 : 0,
        boost: milestone ? 1 : 0,
    }
}

// Tiền thưởng sau trận (EP).
export const PRIZE = {
    win: 3000000,
    draw: 1500000,
    loss: 600000,
    perGoalMargin: 300000, // mỗi bàn cách biệt khi thắng (tối đa 4)
    cleanSheet: 250000,
    baseStrength: 79,
    strengthStep: 0.03, // đối thủ mạnh hơn 1 điểm → +3% (0.8×–1.4×)
}

export function matchPrize({ goalsFor, goalsAgainst, opponentStrength = PRIZE.baseStrength }) {
    const result = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
    const margin = Math.max(0, goalsFor - goalsAgainst)
    const factor = Math.min(1.4, Math.max(0.8, 1 + (opponentStrength - PRIZE.baseStrength) * PRIZE.strengthStep))

    let prize = PRIZE[result]

    if (result === 'win') prize += Math.min(margin, 4) * PRIZE.perGoalMargin
    if (goalsAgainst === 0) prize += PRIZE.cleanSheet

    return { result, prize: Math.round((prize * factor) / 10000) * 10000, factor }
}

export function matchXp({ goalsFor, goalsAgainst }) {
    const result = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
    let xp = CLUB_XP[result]

    if (goalsAgainst === 0) xp += CLUB_XP.cleanSheet
    if (goalsFor - goalsAgainst >= 3) xp += CLUB_XP.bigWin

    return xp
}

// Cộng XP, lên cấp (có thể nhiều cấp một lúc), thêm phần thưởng vào kho.
export function addClubXp(club, amount) {
    let level = club.level || 0
    let xp = (club.xp || 0) + amount
    const levelsGained = []
    const inventory = [...(club.inventory || [])]

    while (xp >= clubXpToNext(level)) {
        xp -= clubXpToNext(level)
        level += 1

        const rewards = levelRewards(level)

        inventory.push(epCard(rewards.ep, `Level ${level} reward`))
        inventory.push(playerPack(rewards.pack, `Level ${level} reward`))
        if (rewards.protection) inventory.push(protectionCard(`Level ${level} reward`))
        if (rewards.fitness) inventory.push(fitnessCard(`Level ${level} reward`))
        if (rewards.form) inventory.push(formCard(`Level ${level} reward`))
        if (rewards.boost) inventory.push(boostCard(randomBoostPercent(), `Level ${level} reward`))
        levelsGained.push({ level, ...rewards })
    }

    return { club: { ...club, level, xp, inventory }, levelsGained }
}

// Áp dụng một trận giải đấu: XP + tiền thưởng (cộng thẳng vào ngân sách).
// Phase 26C: rewardFactor = hệ số thưởng của độ khó mùa (0.8 … 2).
export function applyMatchToClub(club, { goalsFor, goalsAgainst, opponentStrength, rewardFactor = 1 }) {
    const xp = Math.round(matchXp({ goalsFor, goalsAgainst }) * rewardFactor)
    const base = matchPrize({ goalsFor, goalsAgainst, opponentStrength })
    const result = base.result
    const prize = Math.round((base.prize * rewardFactor) / 1000) * 1000
    const levelBefore = club.level || 0
    const xpBefore = club.xp || 0
    const { club: leveled, levelsGained } = addClubXp(club, xp)

    return {
        club: { ...leveled, budget: (leveled.budget || 0) + prize },
        report: {
            result,
            xp,
            prize,
            levelBefore,
            xpBefore,
            level: leveled.level,
            xpNow: leveled.xp,
            xpToNext: clubXpToNext(leveled.level),
            levelsGained,
            rewardFactor,
        },
    }
}

// Thưởng cuối mùa theo thứ hạng (một thẻ EP trong kho).
export function seasonBonus(position) {
    if (position === 1) return 30000000
    if (position <= 4) return 15000000
    if (position <= 10) return 8000000
    if (position <= 17) return 4000000
    return 2000000
}

// Giải hạng hai: thưởng cuối mùa bằng 1/2 giải hạng nhất (sau Phase 28B).
export const SECOND_DIVISION_PRIZE_FACTOR = 0.5

export function applySeasonBonus(club, season, position, rewardFactor = 1, tier = 1) {
    if (club.seasonBonusPaid?.[season]) return { club, bonus: null }

    const tierFactor = tier >= 2 ? SECOND_DIVISION_PRIZE_FACTOR : 1
    const amount = Math.round((seasonBonus(position) * rewardFactor * tierFactor) / 100000) * 100000

    return {
        club: {
            ...club,
            inventory: [
                ...(club.inventory || []),
                epCard(amount, `Season ${season} · finished #${position}`),
                // Phase 29C: vô địch giải → thêm 1 thẻ bảo vệ.
                ...(position === 1 ? [protectionCard(`Season ${season} · league champions`)] : []),
            ],
            seasonBonusPaid: { ...(club.seasonBonusPaid || {}), [season]: position },
        },
        bonus: { amount, position, season, tier, protection: position === 1 },
    }
}
