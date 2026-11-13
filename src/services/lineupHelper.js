// Phase 29K: trợ giúp xếp đội hình.
//   - previewSwap: đổi hai người thì team color / OVR trung bình đổi ra sao.
//   - autoPickXI: tự chọn 11 người tốt nhất cho sơ đồ đang dùng (OVR theo vị
//     trí + thể lực + phong độ + team color), phần còn lại vào dự bị / ngoài.
//   - lineupWarnings: nhắc trước giờ bóng lăn.
//   - đội hình lưu sẵn (3 ô, theo CLB, lưu trong trình duyệt).
import { getPositionGroup, naturalPositionOf, placeInSlot, positionPenalty, SQUAD_LIMITS } from '../systems/roster'
import { formBonus } from '../systems/form'
import { clubOfPlayer, teamColorOf, TEAM_COLOR_SIZE, UPGRADE_COLORS, NATION_COLORS } from './teamColor'
import { nationalityOf } from '../data/starNationality'

const isKeeper = (player) => getPositionGroup(player?.position) === 'GK'
const isNaturalKeeper = (player) => getPositionGroup(naturalPositionOf(player)) === 'GK'
const playerKey = (player) => player?.playerId || player?.id
// Đặt vào vị trí khác nhưng nhớ vị trí sở trường (naturalPositionOf rơi về
// `position` nếu chưa có naturalPosition).
const atPosition = (player, position) => ({ ...player, naturalPosition: naturalPositionOf(player), position })

// Điểm "thực chiến" của một cầu thủ ở một vị trí: OVR ở vị trí đó, cộng
// phong độ, trừ khi mệt (thể lực 60% → −4.8).
export function effectiveScore(player, position = player?.position) {
    if (!player) return 0

    const penalty = positionPenalty(naturalPositionOf(player), position)
    const condition = player.condition ?? 100

    return (player.overall || 0) - penalty + formBonus(player) - Math.max(0, 100 - condition) * 0.12
}

// OVR trung bình hiển thị (theo vị trí, có phong độ, có team color).
export function lineupAverage(players = []) {
    if (!players.length) return 0

    const bonus = teamColorOf(players).bonus
    const total = players.reduce(
        (sum, player) => sum + (player.overall || 0) - positionPenalty(naturalPositionOf(player), player.position) + formBonus(player) + bonus,
        0,
    )

    return total / players.length
}

function zoneList(team, zone) {
    if (zone === 'pitch') return team?.players || []
    if (zone === 'bench') return team?.substitutes || []

    return team?.reserves || []
}

// XI sau khi đổi a ↔ b (a, b: { id, zone }); null nếu đổi không làm XI thay đổi.
export function xiAfterSwap(team, a, b) {
    if (!team || !a || !b || a.id === b.id) return null

    const first = zoneList(team, a.zone).find((player) => player.id === a.id)
    const second = zoneList(team, b.zone).find((player) => player.id === b.id)

    if (!first || !second) return null

    const xi = team.players

    if (a.zone === 'pitch' && b.zone === 'pitch') {
        return xi.map((player) => {
            if (player.id === first.id) return atPosition(first, second.position)
            if (player.id === second.id) return atPosition(second, first.position)

            return player
        })
    }

    if (a.zone !== 'pitch' && b.zone !== 'pitch') return null

    const starter = a.zone === 'pitch' ? first : second
    const incoming = a.zone === 'pitch' ? second : first

    return xi.map((player) => (player.id === starter.id ? atPosition(incoming, starter.position) : player))
}

// { tc, tcDelta, avgDelta, keeperClash } hoặc null nếu không ảnh hưởng tới XI.
export function previewSwap(team, a, b) {
    const next = xiAfterSwap(team, a, b)

    if (!next) return null

    const before = teamColorOf(team.players)
    const after = teamColorOf(next)
    const keeperClash = next.some((player) => isKeeper(player) !== isNaturalKeeper(player)) &&
        !team.players.some((player) => isKeeper(player) !== isNaturalKeeper(player))

    return {
        tc: after,
        tcDelta: after.bonus - before.bonus,
        avgDelta: lineupAverage(next) - lineupAverage(team.players),
        keeperClash,
    }
}

// ---- Tự chọn đội hình ----

// Gán tham lam: lần lượt ô khó nhất trước (thủ môn, rồi theo số người hợp).
function greedyAssign(slots, pool) {
    const used = new Set()
    const usedKeys = new Set()
    const picks = new Array(slots.length).fill(null)
    const order = slots
        .map((slot, index) => ({ slot, index }))
        .sort((x, y) => (y.slot.position === 'GK') - (x.slot.position === 'GK'))

    order.forEach(({ slot, index }) => {
        let best = null
        let bestScore = -Infinity

        pool.forEach((player) => {
            if (used.has(player.id) || usedKeys.has(playerKey(player))) return
            if ((slot.position === 'GK') !== isNaturalKeeper(player)) return

            const score = effectiveScore(player, slot.position)

            if (score > bestScore) {
                best = player
                bestScore = score
            }
        })

        if (best) {
            picks[index] = best
            used.add(best.id)
            usedKeys.add(playerKey(best))
        }
    })

    return picks
}

function scoreXI(slots, picks) {
    if (picks.some((player) => !player)) return -Infinity

    const placed = picks.map((player, index) => atPosition(player, slots[index].position))
    const base = placed.reduce((sum, player) => sum + effectiveScore(player, player.position), 0)

    return base + teamColorOf(placed).bonus * TEAM_COLOR_SIZE
}

// Cải thiện cục bộ: đổi một người trong XI với một người ngoài, hoặc hoán đổi
// hai người trong XI, nếu tổng điểm tăng.
function improve(slots, picks, pool) {
    let best = [...picks]
    let bestScore = scoreXI(slots, best)

    for (let round = 0; round < 4; round += 1) {
        let changed = false

        for (let index = 0; index < slots.length; index += 1) {
            const inXI = new Set(best.map((player) => player?.id))
            const keys = new Set(best.map((player) => playerKey(player)))

            for (const candidate of pool) {
                if (inXI.has(candidate.id)) continue
                if (keys.has(playerKey(candidate)) && playerKey(best[index]) !== playerKey(candidate)) continue
                if ((slots[index].position === 'GK') !== isNaturalKeeper(candidate)) continue

                const trial = [...best]

                trial[index] = candidate

                const score = scoreXI(slots, trial)

                if (score > bestScore + 0.01) {
                    best = trial
                    bestScore = score
                    changed = true
                }
            }

            for (let other = index + 1; other < slots.length; other += 1) {
                const trial = [...best]

                ;[trial[index], trial[other]] = [trial[other], trial[index]]

                if ((slots[index].position === 'GK') !== isNaturalKeeper(trial[index])) continue
                if ((slots[other].position === 'GK') !== isNaturalKeeper(trial[other])) continue

                const score = scoreXI(slots, trial)

                if (score > bestScore + 0.01) {
                    best = trial
                    bestScore = score
                    changed = true
                }
            }
        }

        if (!changed) break
    }

    return { picks: best, score: bestScore }
}

// Ứng viên ưu tiên team color: chỉ dùng người cùng CLB / cùng quốc tịch /
// thẻ ≥ +N (nếu đủ người), rồi để improve() cân nhắc tiếp.
function candidatePools(pool) {
    const pools = [pool]
    const byClub = new Map()
    const byNation = new Map()

    pool.forEach((player) => {
        const clubId = clubOfPlayer(player)
        const nation = nationalityOf(player)

        if (clubId) byClub.set(clubId, [...(byClub.get(clubId) || []), player])
        if (nation) byNation.set(nation, [...(byNation.get(nation) || []), player])
    })

    byClub.forEach((list) => {
        if (list.length >= TEAM_COLOR_SIZE && list.some(isNaturalKeeper)) pools.push(list)
    })

    byNation.forEach((list) => {
        if (list.length >= NATION_COLORS[NATION_COLORS.length - 1].min) {
            // Ưu tiên người cùng quốc tịch: thêm điểm tạm để họ được chọn trước.
            pools.push({ preferred: new Set(list.map((player) => player.id)) })
        }
    })

    UPGRADE_COLORS.forEach((color) => {
        const list = pool.filter((player) => (player.upgrade || 1) >= color.min)

        if (list.length >= TEAM_COLOR_SIZE && list.some(isNaturalKeeper)) pools.push(list)
    })

    return pools
}

// team: { players, substitutes, reserves }. Trả về đội hình mới cùng dạng
// (giữ nguyên các ô / toạ độ của sơ đồ hiện tại) hoặc null nếu không đủ người.
export function autoPickXI(team, benchLimit = SQUAD_LIMITS.bench) {
    if (!team?.players?.length) return null

    const slots = team.players.map((player) => ({ position: player.position, x: player.x, z: player.z }))
    const pool = [...team.players, ...(team.substitutes || []), ...(team.reserves || [])]
    let best = null

    // Đội hình hiện tại cũng là một điểm xuất phát → kết quả không bao giờ tệ hơn.
    const current = improve(slots, [...team.players], pool)

    if (Number.isFinite(current.score)) best = current

    candidatePools(pool).forEach((candidate) => {
        let picks

        if (Array.isArray(candidate)) {
            picks = greedyAssign(slots, candidate)
        } else {
            // Ưu tiên một quốc tịch: chọn họ trước bằng cách cộng điểm tạm.
            const boosted = pool.map((player) =>
                candidate.preferred.has(player.id) ? { ...player, overall: (player.overall || 0) + 6, __boost: 6 } : player,
            )
            picks = greedyAssign(slots, boosted).map((player) =>
                player?.__boost ? pool.find((item) => item.id === player.id) : player,
            )
        }

        if (picks.some((player) => !player)) return

        const result = improve(slots, picks, pool)

        if (!best || result.score > best.score) best = result
    })

    if (!best) return null

    const chosen = new Set(best.picks.map((player) => player.id))
    const players = best.picks.map((player, index) => placeInSlot(player, slots[index].position, slots[index].x, slots[index].z))

    // Dự bị: giữ những người đang dự bị (nếu không vào XI) + người vừa rời XI,
    // ưu tiên điểm cao, tối đa benchLimit, không trùng thẻ cùng cầu thủ.
    const keys = new Set(players.map(playerKey))
    const benchCandidates = [
        ...(team.substitutes || []),
        ...team.players,
        ...(team.reserves || []),
    ].filter((player) => !chosen.has(player.id))
    const substitutes = []
    const reserves = []
    const keeperOnBench = benchCandidates.filter(isNaturalKeeper).sort((x, y) => effectiveScore(y) - effectiveScore(x))[0]

    if (keeperOnBench) {
        substitutes.push(keeperOnBench)
        keys.add(playerKey(keeperOnBench))
    }

    benchCandidates
        .filter((player) => player !== keeperOnBench)
        .sort((x, y) => effectiveScore(y, naturalPositionOf(y)) - effectiveScore(x, naturalPositionOf(x)))
        .forEach((player) => {
            if (substitutes.length < benchLimit && !keys.has(playerKey(player))) {
                substitutes.push(player)
                keys.add(playerKey(player))
            } else {
                reserves.push(player)
            }
        })

    // Người ra dự bị / ngoài trở về vị trí sở trường của mình.
    const rest = (player) => ({ ...player, position: naturalPositionOf(player) })

    return {
        players,
        substitutes: substitutes.map(rest),
        reserves: reserves.map(rest),
    }
}

// ---- Nhắc trước giờ bóng lăn ----
export function lineupWarnings(team, items = null) {
    const warnings = []
    const xi = team?.players || []
    const tired = xi.filter((player) => (player.condition ?? 100) < 60)
    const offPosition = xi.filter((player) => positionPenalty(naturalPositionOf(player), player.position) > 0)
    const lowForm = xi.filter((player) => formBonus(player) < 0)
    const average = xi.length ? xi.reduce((sum, player) => sum + (player.condition ?? 100), 0) / xi.length : 100

    if (xi.length < TEAM_COLOR_SIZE) warnings.push({ level: 'error', text: `Only ${xi.length} starters — pick 11.` })

    if (tired.length) {
        warnings.push({
            level: 'warn',
            text: `${tired.length} tired starter${tired.length === 1 ? '' : 's'} (< 60%): ${tired.map((player) => player.name.split(' ').slice(-1)[0]).join(', ')}`,
        })
    }

    if (offPosition.length) {
        warnings.push({
            level: 'warn',
            text: `${offPosition.length} out of position: ${offPosition
                .map((player) => `${player.name.split(' ').slice(-1)[0]} (${naturalPositionOf(player)} → ${player.position})`)
                .join(', ')}`,
        })
    }

    if (items?.fitness > 0 && (tired.length || average < 85)) {
        warnings.push({ level: 'tip', text: `You have ${items.fitness} Fitness card${items.fitness === 1 ? '' : 's'} — average condition is ${Math.round(average)}%.` })
    }

    if (items?.form > 0 && lowForm.length >= 3) {
        warnings.push({ level: 'tip', text: `${lowForm.length} starters in poor form — a Form card puts the whole squad on ⬆.` })
    }

    return warnings
}

// Tóm tắt thể lực / phong độ của XI (ô SQUAD CARDS).
export function squadCondition(team) {
    const xi = team?.players || []
    const average = xi.length ? Math.round(xi.reduce((sum, player) => sum + (player.condition ?? 100), 0) / xi.length) : 100
    const below70 = xi.filter((player) => (player.condition ?? 100) < 70).length
    const forms = { 2: 0, 1: 0, 0: 0, [-1]: 0, [-2]: 0 }

    xi.forEach((player) => {
        const value = Math.max(-2, Math.min(2, Math.round(player.form ?? 0)))

        forms[value] += 1
    })

    return { average, below70, forms }
}

// ---- Ghi chú team color cho một cầu thủ (bảng thông tin) ----
export function teamColorNotes(player, xi = []) {
    if (!player) return []

    const info = teamColorOf(xi)
    const inXI = xi.some((item) => item.id === player.id)
    const notes = []
    const clubId = clubOfPlayer(player)
    const nation = nationalityOf(player)
    const level = player.upgrade || 1

    if (info.club) {
        if (clubId === info.club.clubId) {
            notes.push(info.club.active
                ? `Part of the ${info.club.name} club color (+3).`
                : `From ${info.club.name} — ${info.club.count}/11 starters from ${info.club.name}, ${TEAM_COLOR_SIZE - info.club.count} more needed for club color +3.`)
        } else {
            notes.push(inXI
                ? `Not from ${info.club.name} — blocks club color (${info.club.count}/11 from ${info.club.name}).`
                : `Not from ${info.club.name} (the club most of your XI comes from).`)
        }
    }

    if (info.nation && nation) {
        notes.push(nation === info.nation.nationality
            ? `${nation}: counts for nation color (${info.nation.count}/11 ${nation}).`
            : `${nation} — your XI's main nationality is ${info.nation.nationality} (${info.nation.count}/11).`)
    }

    const tier = UPGRADE_COLORS.find((color) => level >= color.min)

    if (inXI && level === info.lowest && info.next) {
        notes.push(`Lowest card in the XI (+${level}) — every starter needs +${info.next.min} for ${info.next.label}.`)
    } else if (!inXI && info.next && level >= info.next.min) {
        notes.push(`Card +${level} is high enough for ${info.next.label} card color.`)
    } else if (tier) {
        notes.push(`Card +${level}: ${tier.label} level.`)
    }

    return notes
}

// ---- Đội hình lưu sẵn (3 ô / CLB, trong trình duyệt) ----
const PRESET_KEY = 'ufm-lineup-presets-v1'
export const PRESET_SLOTS = 3

function readAll() {
    try {
        return JSON.parse(localStorage.getItem(PRESET_KEY) || '{}') || {}
    } catch {
        return {}
    }
}

export function loadPresets(clubId) {
    const list = readAll()[clubId] || []

    return Array.from({ length: PRESET_SLOTS }, (_, index) => list[index] || null)
}

export function savePreset(clubId, index, team, name) {
    const all = readAll()
    const list = loadPresets(clubId)

    list[index] = {
        name: name || `Lineup ${index + 1}`,
        formationKey: team.formationKey || null,
        xi: team.players.map((player) => player.id),
        bench: (team.substitutes || []).map((player) => player.id),
        savedAt: Date.now(),
    }

    all[clubId] = list

    try {
        localStorage.setItem(PRESET_KEY, JSON.stringify(all))
    } catch {
        // Bộ nhớ trình duyệt không dùng được: bỏ qua.
    }

    return list
}

export function deletePreset(clubId, index) {
    const all = readAll()
    const list = loadPresets(clubId)

    list[index] = null
    all[clubId] = list

    try {
        localStorage.setItem(PRESET_KEY, JSON.stringify(all))
    } catch {
        // bỏ qua
    }

    return list
}

// Áp dụng đội hình đã lưu vào các ô của sơ đồ hiện tại (sơ đồ do GameScene
// đổi trước nếu khác). Người đã rời CLB được thay bằng người tốt nhất còn lại.
// Trả về { team, missing } hoặc null.
export function applyPreset(team, preset, benchLimit = SQUAD_LIMITS.bench) {
    if (!team || !preset) return null

    const pool = [...team.players, ...(team.substitutes || []), ...(team.reserves || [])]
    const byId = new Map(pool.map((player) => [player.id, player]))
    const slots = team.players.map((player) => ({ position: player.position, x: player.x, z: player.z }))
    const used = new Set()
    const keys = new Set()
    let missing = 0

    const picks = slots.map((slot, index) => {
        const player = byId.get(preset.xi[index])

        if (player && !used.has(player.id) && !keys.has(playerKey(player)) && (slot.position === 'GK') === isNaturalKeeper(player)) {
            used.add(player.id)
            keys.add(playerKey(player))
            return player
        }

        return null
    })

    // Ô trống (người đã bán / sai vị trí thủ môn): người tốt nhất còn lại.
    picks.forEach((player, index) => {
        if (player) return

        missing += 1

        const replacement = pool
            .filter((item) => !used.has(item.id) && !keys.has(playerKey(item)) && (slots[index].position === 'GK') === isNaturalKeeper(item))
            .sort((x, y) => effectiveScore(y, slots[index].position) - effectiveScore(x, slots[index].position))[0]

        if (replacement) {
            picks[index] = replacement
            used.add(replacement.id)
            keys.add(playerKey(replacement))
        }
    })

    if (picks.some((player) => !player)) return null

    const players = picks.map((player, index) => placeInSlot(player, slots[index].position, slots[index].x, slots[index].z))
    const substitutes = []
    const reserves = []

    ;[
        ...preset.bench.map((id) => byId.get(id)).filter(Boolean),
        ...pool,
    ].forEach((player) => {
        if (used.has(player.id)) return

        used.add(player.id)

        if (substitutes.length < benchLimit && !keys.has(playerKey(player))) {
            substitutes.push({ ...player, position: naturalPositionOf(player) })
            keys.add(playerKey(player))
        } else {
            reserves.push({ ...player, position: naturalPositionOf(player) })
        }
    })

    return { team: { players, substitutes, reserves }, missing }
}
