// Phase 30C: cấp World Cup (kiểu FO4).
// - Kinh nghiệm World Cup (world.wcXp = tổng XP) sau mỗi trận World Cup tự đá:
//   thắng 30 / hoà 20 / thua 10, vòng loại trực tiếp ×1.5, vô địch +100,
//   tất cả × hệ số thưởng của độ khó giải. SIMULATE REST / bỏ trận: không có XP.
// - Cấp 1–10 → cấp thẻ của CẢ đội tuyển (chỉ trong World Cup): +1 +2 +3 +3 +4
//   +5 +6 +6 +7 +8. Cấp thuộc về HLV: đổi đội tuyển / đổi CLB vẫn giữ.
// - Độ khó chọn khi bắt đầu giải (Easy → Legendary). Ban đầu chỉ có Easy; vô
//   địch World Cup ở một mức thì mở mức tiếp theo (world.wcUnlocked = chỉ số
//   mức cao nhất đã mở).
import { DIFFICULTIES, difficultyOf } from './difficulty'
import { describeWorldCupResult, worldCupState } from './worldCupService'

export const WC_MAX_LEVEL = 10
// Cấp thẻ của đội tuyển ở từng cấp World Cup (chỉ số 0 = cấp 1).
export const WC_LEVEL_UPGRADE = [1, 2, 3, 3, 4, 5, 6, 6, 7, 8]
// XP cần để lên cấp tiếp theo (chỉ số 0 = từ cấp 1 lên 2).
export const WC_LEVEL_XP = [100, 150, 250, 350, 500, 700, 900, 1200, 1500]

export const WC_XP = { win: 30, draw: 20, loss: 10, knockout: 1.5, champion: 100 }

// Tổng XP → cấp, XP trong cấp hiện tại, XP cần cho cấp sau, cấp thẻ đội tuyển.
export function wcLevelOf(totalXp = 0) {
    let level = 1
    let rest = Math.max(0, Math.floor(totalXp || 0))

    while (level < WC_MAX_LEVEL && rest >= WC_LEVEL_XP[level - 1]) {
        rest -= WC_LEVEL_XP[level - 1]
        level += 1
    }

    const upgrade = WC_LEVEL_UPGRADE[level - 1]
    const nextUpgradeLevel = WC_LEVEL_UPGRADE.findIndex((value) => value > upgrade) + 1 || null

    return {
        level,
        upgrade,
        total: Math.max(0, Math.floor(totalXp || 0)),
        xp: level >= WC_MAX_LEVEL ? 0 : rest,
        xpForNext: level >= WC_MAX_LEVEL ? 0 : WC_LEVEL_XP[level - 1],
        max: level >= WC_MAX_LEVEL,
        // Cấp World Cup gần nhất mà cấp thẻ tăng thêm (null khi đã tối đa).
        nextUpgradeLevel: nextUpgradeLevel || null,
        nextUpgrade: nextUpgradeLevel ? WC_LEVEL_UPGRADE[nextUpgradeLevel - 1] : null,
    }
}

export const worldCupProgress = (world) => wcLevelOf(world?.wcXp || 0)

// XP của một trận World Cup vừa đá (wcAfter = giải sau khi ghi kết quả).
export function worldCupMatchXp(wcAfter, fixtureId, difficultyId) {
    if (!wcAfter) return null

    const state = worldCupState(wcAfter)
    const fixture = state.rounds.flatMap((entry) => entry.fixtures).find((item) => item.id === fixtureId)

    if (!fixture || !fixture.played) return null

    const isHome = fixture.homeTeamId === wcAfter.nationId
    const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals
    const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals
    const knockout = fixture.stage !== 'group'
    let result = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
    let won = result === 'win'

    // Vòng loại trực tiếp hoà → luân lưu: thắng luân lưu = thắng, thua = hoà.
    if (knockout && goalsFor === goalsAgainst) {
        const info = describeWorldCupResult(wcAfter, fixtureId)

        won = ['advanced', 'champion', 'thirdPlace'].includes(info?.outcome)
        result = won ? 'win' : 'draw'
    }

    const champion = fixture.round === 'final' && won
    const reward = difficultyOf(difficultyId).reward
    const base = WC_XP[result] * (knockout ? WC_XP.knockout : 1) + (champion ? WC_XP.champion : 0)

    return { xp: Math.round(base * reward), result, knockout, champion, reward }
}

// Cộng XP vào bản lưu thế giới. Trả về { world, before, after, levelsGained }.
export function addWorldCupXp(world, xp) {
    const before = worldCupProgress(world)
    const next = { ...world, wcXp: before.total + Math.max(0, Math.round(xp || 0)) }
    const after = worldCupProgress(next)

    return { world: next, before, after, levelsGained: after.level - before.level }
}

// ---- Độ khó mở khoá ----
export const wcUnlockedIndex = (world) => Math.max(0, Math.min(DIFFICULTIES.length - 1, world?.wcUnlocked || 0))

export function wcDifficultyOptions(world) {
    const unlocked = wcUnlockedIndex(world)

    return DIFFICULTIES.map((item, index) => ({
        ...item,
        locked: index > unlocked,
        // Mức cần vô địch để mở mức này.
        requires: index > 0 ? DIFFICULTIES[index - 1] : null,
    }))
}

// Mức mặc định khi bắt đầu giải: mức cao nhất đã mở.
export const wcDefaultDifficulty = (world) => DIFFICULTIES[wcUnlockedIndex(world)].id

// Vô địch ở mức `difficultyId` → mở mức tiếp theo. Trả về { world, unlocked } (unlocked = mức vừa mở hoặc null).
export function unlockAfterTitle(world, difficultyId) {
    const index = DIFFICULTIES.findIndex((item) => item.id === difficultyId)
    const current = wcUnlockedIndex(world)

    if (index < 0 || index < current || index + 1 >= DIFFICULTIES.length) return { world, unlocked: null }

    return { world: { ...world, wcUnlocked: index + 1 }, unlocked: DIFFICULTIES[index + 1] }
}

// Độ khó của một giải (giải cũ chưa có → độ khó mùa giải như trước).
export const worldCupDifficultyId = (wc, fallback) => wc?.difficulty || fallback

// Ghi kết quả + XP + mở khoá cho một trận World Cup (thuần — dùng chung cho
// lúc lưu và lúc làm màn tổng kết để hai nơi luôn khớp).
export function applyWorldCupMatch(world, wcAfter, fixtureId, { difficultyId, forfeit = false } = {}) {
    let next = { ...world, worldCup: wcAfter }
    const report = { xp: 0, result: null, before: worldCupProgress(world), after: worldCupProgress(world), levelsGained: 0, unlocked: null }

    if (!forfeit) {
        const match = worldCupMatchXp(wcAfter, fixtureId, difficultyId)

        if (match) {
            const added = addWorldCupXp(next, match.xp)

            next = added.world
            Object.assign(report, { xp: match.xp, result: match.result, champion: match.champion, before: added.before, after: added.after, levelsGained: added.levelsGained })
        }

        if (wcAfter?.status === 'done' && wcAfter.finalStanding === 'champion' && !wcAfter.skipped) {
            const unlocked = unlockAfterTitle(next, difficultyId)

            next = unlocked.world
            report.unlocked = unlocked.unlocked
        }
    }

    report.difficulty = difficultyOf(difficultyId)
    return { world: next, report }
}
