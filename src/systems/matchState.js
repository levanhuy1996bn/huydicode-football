import { createMatchStats } from './matchStats'

// Toàn bộ trạng thái "sống" của trận đấu nằm trong một object duy nhất.
// Các system nhận `ctx` (xem MatchWorld) và đọc/ghi vào ctx.state.

export function createMatchState() {
    return {
        // Quyền kiểm soát bóng
        possession: 'blue-9',
        lastTouchTeam: 'blue',
        // Cầu thủ chạm bóng cuối cùng (để ghi công bàn thắng / phản lưới).
        lastToucherId: null,
        pendingPass: null,

        // Tình huống cố định đang chờ thực hiện, vd ném biên:
        // { type: 'throw-in', teamId, playerId }
        restart: null,

        // Hướng tấn công: hiệp 1 BLUE đánh về -Z, RED về +Z.
        // Sang hiệp 2 hai đội đổi sân (sidesSwapped = true).
        sidesSwapped: false,

        // Bộ đếm thời gian
        timers: {
            tackleCooldown: 0,
            aiAttemptCooldown: 0,
            aiDecisionCooldown: 0,
            goalCooldown: 0,
        },

        // Mỗi cú đá tăng kickId để thủ môn chỉ phán quyết 1 lần/cú.
        kickId: 0,
        keeperResolvedKick: { blue: -1, red: -1 },

        // Thời gian (giây) mỗi cầu thủ chưa được chạm/nhặt bóng:
        // người vừa đá bóng, thủ môn vừa đẩy bóng, người vừa bị xoạc...
        pickupLocks: {},

        // Hướng/tốc độ của cầu thủ đang điều khiển + nhịp chạm bóng
        dribble: { x: 0, z: 0, speed: 0, sprinting: false, touchTimer: 0 },

        // Đang giữ phím lấy lực: { action, playerId, power (0..1), loose }
        charge: null,

        // Cầu thủ đang áp sát (giữ D) — va chạm không đẩy lùi được.
        containingId: null,

        // Cú đá đang vung chân (xem ball.js → updateWindup).
        windup: null,

        // Vị trí bóng mỗi bước logic (animation dùng để quay đầu nhìn bóng).
        ballPosition: { x: 0, y: 0.39, z: 0 },

        // Vận tốc / vị trí trước đó của từng cầu thủ
        velocities: {},
        lastPositions: {},

        // State machine của từng cầu thủ: { state, time, duration, elapsed }
        playerStates: {},

        // Thống kê trận (sút, chuyền, tắc, cứu thua, kiểm soát bóng...)
        stats: createMatchStats(),

        matchEnded: false,
    }
}

export function resetTimers(state) {
    state.timers.tackleCooldown = 0
    state.timers.aiAttemptCooldown = 0
}

// -1: tấn công về phía -Z, +1: tấn công về phía +Z.
export function attackDir(state, teamId) {
    const base = teamId === 'blue' ? -1 : 1
    return state.sidesSwapped ? -base : base
}

// Dấu của khung thành nhà (ngược hướng tấn công).
export function ownGoalSign(state, teamId) {
    return -attackDir(state, teamId)
}

// Đội đang phòng ngự khung thành ở phía có dấu `zSign`.
export function teamDefendingSide(state, zSign) {
    return ownGoalSign(state, 'blue') === zSign ? 'blue' : 'red'
}

// Vị trí đội hình được thiết kế cho hiệp 1; hiệp 2 lật đối xứng qua tâm.
export function homePosition(state, item) {
    const sign = state.sidesSwapped ? -1 : 1

    return {
        x: (item.x ?? 0) * sign,
        z: (item.z ?? 0) * sign,
    }
}

// Góc quay để cầu thủ nhìn về hướng tấn công.
export function facingFor(state, teamId) {
    return attackDir(state, teamId) === -1 ? Math.PI : 0
}
