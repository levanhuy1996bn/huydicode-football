import { attr } from './attributes'
import { isPeakCard } from './form'

// ---- Phase 19: thể lực trong trận + phong độ thể lực giữa các trận ----
//
// state.stamina[id] (0..100): thể lực hiện tại trong trận.
//   - Bắt đầu trận bằng `player.condition` (phong độ thể lực, lưu trong đội
//     hình, mặc định 100). Cầu thủ dự bị vào sân cũng mang condition của mình.
//   - Chạy nước rút tụt nhanh, chạy thường tụt chậm, đi bộ / đứng thì hồi dần.
//     Tắc bóng, xoạc, sút, tì vai tốn thêm một ít. Chỉ số Stamina càng cao
//     càng ít tụt. Mức tụt được chia theo độ dài trận (3/6/10 phút) để cuối
//     trận các cầu thủ mệt như nhau dù chọn độ dài nào.
//   - Nghỉ giữa hiệp hồi lại một ít.
// Ảnh hưởng (fatigue 0..1, bắt đầu khi thể lực < 70):
//   tốc độ tối đa / tăng tốc giảm, chuyền / sút kém chính xác hơn, tranh chấp
//   và tắc bóng yếu hơn (xem staminaSpeedFactor, fatiguePenalty).
//
// Sau trận (applyMatchCondition): cầu thủ đã ra sân mất condition theo số
// phút thi đấu, mọi cầu thủ hồi lại một phần → buộc phải xoay tua đội hình.

const REFERENCE_DURATION = 360

// Tốc độ được coi là chạy nước rút (không dùng movement.js để tránh vòng import).
const sprintThreshold = (item) =>
    (item.role === 'GK' ? 8 : 6.4 + (attr(item, 'sprintSpeed') / 80) * 2.2) * 0.92

const DRAIN = {
    base: 0.035,    // /giây, chỉ cần có mặt trên sân
    jog: 0.06,      // /giây khi chạy thường
    sprint: 0.62,   // /giây khi chạy nước rút (> 92% tốc độ tối đa)
    recover: 0.45,  // /giây khi đi bộ / đứng (< 2.5 m/s)
}

const ACTION_COST = {
    tackle: 1,
    slide: 3,
    shoot: 0.8,
    cross: 0.4,
    diveLow: 1.5,
    diveMid: 1.5,
    diveHigh: 1.5,
    stumble: 0.5,
    fallen: 1,
}

export const HALFTIME_RECOVERY = 10

// Phong độ thể lực sau trận.
export const CONDITION_RECOVERY = 15   // mỗi trận, cho mọi cầu thủ
export const CONDITION_FLOOR = 40

const clampValue = (value, min, max) => Math.max(min, Math.min(max, value))

// Hệ số tiêu hao theo chỉ số Stamina: 50 → 1.0, 75 → 0.83, 95 → 0.7.
const staminaFactor = (item) => clampValue(1.35 - attr(item, 'stamina') * 0.007, 0.6, 1.1)

export function startingStamina(item) {
    if (isPeakCard(item)) return 100

    return clampValue(item?.condition ?? 100, CONDITION_FLOOR, 100)
}

export function getStamina(state, id) {
    return state.stamina?.[id] ?? 100
}

// 0 khi thể lực ≥ 70, 1 khi ≤ 20.
export function fatigueOf(state, id) {
    return clampValue((70 - getStamina(state, id)) / 50, 0, 1)
}

// Hệ số tốc độ tối đa (1 → 0.82).
export function staminaSpeedFactor(state, id) {
    return 1 - 0.18 * fatigueOf(state, id)
}

// Số điểm trừ vào chỉ số kỹ năng khi mệt (0 → 12).
export function fatiguePenalty(state, id) {
    return 12 * fatigueOf(state, id)
}

// Đặt thể lực ban đầu cho mọi cầu thủ đang trên sân (đầu trận).
export function resetStamina(ctx) {
    const { state } = ctx

    state.stamina = {}
    state.onPitchTime = {}
    state.staminaActions = {}

    ctx.players.forEach((item) => {
        state.stamina[item.id] = startingStamina(item)
    })
}

export function halftimeRecovery(state) {
    Object.keys(state.stamina || {}).forEach((id) => {
        state.stamina[id] = Math.min(100, state.stamina[id] + HALFTIME_RECOVERY)
    })
}

// Gọi mỗi bước logic.
export function updateStamina(ctx, dt) {
    const { state } = ctx

    if (!state.stamina) state.stamina = {}
    if (!state.onPitchTime) state.onPitchTime = {}
    if (!state.staminaActions) state.staminaActions = {}

    const scale = REFERENCE_DURATION / (ctx.matchDuration || REFERENCE_DURATION)

    ctx.players.forEach((item) => {
        const id = item.id

        // Cầu thủ vừa vào sân: mang theo phong độ thể lực của mình.
        if (state.stamina[id] === undefined) state.stamina[id] = startingStamina(item)

        state.onPitchTime[id] = (state.onPitchTime[id] || 0) + dt

        const velocity = state.velocities[id] || { x: 0, z: 0 }
        const speed = Math.hypot(velocity.x, velocity.z)
        const factor = staminaFactor(item)

        let change

        // Nước rút = trên 92% tốc độ tối đa của chính cầu thủ đó.
        const sprintFrom = Math.max(6.5, sprintThreshold(item))

        if (speed > sprintFrom) {
            change = -(DRAIN.base + DRAIN.sprint) * factor
        } else if (speed > 2.5) {
            change = -(DRAIN.base + DRAIN.jog) * factor
        } else {
            change = DRAIN.recover - DRAIN.base * factor
        }

        // Thủ môn ít di chuyển: hồi nhanh hơn, tụt chậm hơn.
        if (item.role === 'GK') change = change > 0 ? change : change * 0.5

        // Hành động tốn sức (tính một lần khi hành động bắt đầu).
        const entry = state.playerStates[id]
        let actionCost = 0

        if (entry && entry.time > 0 && ACTION_COST[entry.state]) {
            if (state.staminaActions[id] !== entry.state) {
                state.staminaActions[id] = entry.state
                actionCost = ACTION_COST[entry.state] * factor * scale
            }
        } else {
            state.staminaActions[id] = null
        }

        // Đang tì vai.
        if (state.duel?.key && state.duel.key.includes(id)) change -= 0.3 * factor

        // Nhịp hồi giữ nguyên theo thời gian thực; nhịp tụt chia theo độ dài trận.
        const delta = change < 0 ? change * scale : change

        state.stamina[id] = clampValue(state.stamina[id] + delta * dt - actionCost, 0, 100)
    })
}

// Phong độ thể lực mới sau trận cho mọi cầu thủ của đội người chơi.
//   minutesFraction: phần trận đã thi đấu (0..1) theo id.
export function applyMatchCondition(players, minutesFraction) {
    return players.map((player) => {
        // Phase 40: thẻ +10 hồi đầy thể lực sau mỗi trận.
        if (isPeakCard(player)) return player.condition === 100 ? player : { ...player, condition: 100 }

        const condition = player.condition ?? 100
        const played = minutesFraction[player.id] || 0
        const drain = played * 30 * staminaFactor(player)
        const next = clampValue(
            Math.round(condition - drain + CONDITION_RECOVERY),
            CONDITION_FLOOR,
            100,
        )

        return next === condition ? player : { ...player, condition: next }
    })
}
