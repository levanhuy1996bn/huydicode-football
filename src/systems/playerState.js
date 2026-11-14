// State machine của cầu thủ.
//
// - Trạng thái di chuyển (tự suy ra mỗi bước): idle, run, sprint, dribble, receive
// - Trạng thái hành động (có thời lượng, do system khác kích hoạt):
//   pass, shoot, tackle, slide, fallen, stumble (tắc trượt, mất đà), throw (ném biên)
//
// Animation trong Player.jsx chỉ đọc state, không tự đoán từ vận tốc nữa.

export const PLAYER_STATES = {
    IDLE: 'idle',
    RUN: 'run',
    SPRINT: 'sprint',
    DRIBBLE: 'dribble',
    RECEIVE: 'receive',
    PASS: 'pass',
    SHOOT: 'shoot',
    TACKLE: 'tackle',
    SLIDE: 'slide',
    FALLEN: 'fallen',
    STUMBLE: 'stumble',
    THROW: 'throw',
}

// Thời lượng khớp với các clip trong src/animation/clips.js.
const ACTION_DURATIONS = {
    pass: 0.4,
    cross: 0.48,
    shoot: 0.55,
    tackle: 0.38,
    slide: 0.7,
    fallen: 1.1,
    stumble: 0.45,
    throw: 0.5,
    // Phase 37: nhảy lên đánh đầu
    header: 0.6,
    // Phase 16: thủ môn
    diveLow: 1.15,
    diveMid: 1.15,
    diveHigh: 1.15,
    catch: 0.6,
    catchHigh: 0.6,
    scoop: 0.6,
    gkThrow: 0.55,
    punt: 0.6,
    // Hết trận (whistle.js)
    celebrate: 0.9,
    dejected: 3.5,
    clap: 0.7,
}

// Các trạng thái khóa di chuyển (cầu thủ không tự chạy được).
const LOCKED_STATES = new Set([
    'slide', 'fallen', 'stumble', 'diveLow', 'diveMid', 'diveHigh',
])

const ACTION_STATES = new Set(Object.keys(ACTION_DURATIONS))

function ensureEntry(state, playerId) {
    if (!state.playerStates[playerId]) {
        state.playerStates[playerId] = {
            state: 'idle',
            time: 0,
            duration: 0,
            elapsed: 0,
        }
    }

    return state.playerStates[playerId]
}

export function getPlayerState(state, playerId) {
    return ensureEntry(state, playerId)
}

// options.side: hướng (±1, theo trục local +X của cầu thủ) cho clip có thể lật
// trái/phải (bay người của thủ môn).
export function setPlayerAction(state, playerId, action, duration, options = {}) {
    const entry = ensureEntry(state, playerId)
    const length = duration ?? ACTION_DURATIONS[action] ?? 0.3

    entry.state = action
    entry.side = options.side ?? 1
    entry.time = length
    entry.duration = length
    entry.elapsed = 0
}

export function isPlayerLocked(state, playerId) {
    // Đang vung chân sút/chuyền: đứng yên cho tới khi chạm bóng.
    if (state.windup?.playerId === playerId) return true

    const entry = state.playerStates[playerId]

    return Boolean(entry && LOCKED_STATES.has(entry.state) && entry.time > 0)
}

export function isInAction(state, playerId) {
    const entry = state.playerStates[playerId]

    return Boolean(entry && ACTION_STATES.has(entry.state) && entry.time > 0)
}

export function clearPlayerStates(state) {
    Object.values(state.playerStates).forEach((entry) => {
        entry.state = 'idle'
        entry.time = 0
        entry.duration = 0
        entry.elapsed = 0
    })
}

// Gọi cuối mỗi bước logic: đếm lùi hành động, suy ra trạng thái di chuyển.
export function updatePlayerStates(ctx, dt) {
    const { state } = ctx

    ctx.players.forEach((item) => {
        const entry = ensureEntry(state, item.id)

        if (ACTION_STATES.has(entry.state) && entry.time > 0) {
            entry.time = Math.max(0, entry.time - dt)
            entry.elapsed += dt

            if (entry.time > 0) return
        }

        const velocity = state.velocities[item.id] || { x: 0, z: 0 }
        const speed = Math.hypot(velocity.x, velocity.z)

        let next = 'idle'

        if (state.possession === item.id) {
            next = 'dribble'
            if (state.keeperHands === item.id) next = 'hold'
            if (state.shieldingId === item.id) next = 'shield'
        } else if (state.pendingPass?.receiverId === item.id) {
            next = 'receive'
        } else if (speed > 6.5) {
            next = 'sprint'
        } else if (speed > 0.5) {
            next = 'run'
        }

        if (entry.state !== next) {
            entry.state = next
            entry.elapsed = 0
        } else {
            entry.elapsed += dt
        }

        entry.time = 0
        entry.duration = 0
    })
}
