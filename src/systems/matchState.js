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
            shieldCooldown: 0,
            aiAttemptCooldownBlue: 0,
        },

        // Mỗi cú đá tăng kickId để thủ môn chỉ phán quyết 1 lần/cú.
        kickId: 0,
        // Phase 16: id thủ môn đang ôm bóng bằng tay, thời gian ôm bóng,
        // kế hoạch cứu thua theo đội (xem goalkeeper.js).
        keeperHands: null,
        keeperHoldTime: 0,
        keeperPlans: {},

        // Thời gian (giây) mỗi cầu thủ chưa được chạm/nhặt bóng:
        // người vừa đá bóng, thủ môn vừa đẩy bóng, người vừa bị xoạc...
        pickupLocks: {},

        // Hướng/tốc độ của cầu thủ đang điều khiển + nhịp chạm bóng
        dribble: { x: 0, z: 0, speed: 0, sprinting: false, touchTimer: 0 },

        // Đang giữ phím lấy lực: { action, playerId, power (0..1), loose }
        charge: null,

        // Cầu thủ đang áp sát (giữ D) — va chạm không đẩy lùi được.
        containingId: null,

        // Phase 17 (xem duels.js): ai đang che bóng, đối thủ đang bị che,
        // AI che bóng theo thời gian, đấu sức đang diễn ra, hệ số chậm do tì vai.
        shieldingId: null,
        shieldThreat: null,
        shieldAi: null,
        duel: { key: null, time: 0, cooldown: 0 },
        duelSlow: {},

        // Phase 18 (xem tactics.js, carrierAI.js): thời gian trận, tỉ số,
        // chiến thuật đối thủ đang dùng, người đang cầm bóng + hướng rê của AI,
        // đội vừa mất bóng (để vây ráp), đội đang kiểm soát bóng.
        elapsed: 0,
        score: { blue: 0, red: 0 },
        aiTacticKey: null,
        aiTacticTimer: 0,
        carry: { id: null, time: 0, decideIn: 0, dirX: 0, dirZ: 0 },
        turnover: null,
        possessionTeam: null,
        supportMemo: {},

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

// Đầu mỗi trận: xóa tiến trình trận đấu (thời gian, tỉ số, chiến thuật AI).
export function resetMatchProgress(state) {
    state.elapsed = 0
    state.score = { blue: 0, red: 0 }
    state.aiTacticKey = null
    state.aiTacticTimer = 0
    state.turnover = null
    state.possessionTeam = null
    state.carry = { id: null, time: 0, decideIn: 0, dirX: 0, dirZ: 0 }
    state.supportMemo = {}
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
