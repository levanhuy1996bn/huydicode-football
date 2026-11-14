// Phase 42: chế độ TẬP LUYỆN (TRAINING).
//
// Năm bài tập trên sân 3D thật, đội của bạn (xanh) gặp một đội tập (đỏ):
//   penalty-take  sút phạt đền liên tục      (dùng engine luân lưu, chỉ xanh sút)
//   penalty-save  bắt phạt đền (bạn bay người) (luân lưu, chỉ đỏ sút)
//   freekick      đá phạt trực tiếp (vị trí chọn được, có hàng rào)
//   corner        phạt góc trái / phải, có người tranh chấp trong vòng cấm
//   finishing     dứt điểm: bóng ở chân tại điểm ngẫu nhiên, một mình (hoặc
//                 thêm 1 hậu vệ) đối mặt thủ môn
// Không đồng hồ, không mệt, không thống kê / XP / thưởng. Mỗi lần thử xong
// (bàn thắng, thủ môn bắt, bóng ra ngoài, bị phá, hết giờ) báo kết quả
// (ctx.onTrainingResult) rồi đặt lại bóng.
//
// state.training = { drill, options, phase: 'ready' | 'live' | 'result', timer,
//                    kickId, score0, attempt, frozen: Set(id) }
//   ready  — bóng đã đặt, chờ bạn đá (mọi người đứng yên, frozen)
//   live   — bóng đã rời chân: trận chạy bình thường (stepMatch)
//   result — xem kết quả ~1.4s rồi đặt lại
import { FIELD } from './constants'
import { attackDir } from './matchState'
import { placeBall, updateWindup } from './ball'
import { placeAllAtHome, restartAtSpot } from './rules'
import { clearPlayerStates, updatePlayerStates } from './playerState'
import { trackVelocities } from './movement'
import { updateCharge } from './control'
import { startShootout, stopShootout } from './shootout'
import { aerialReach } from './physique'

export const TRAINING_DRILLS = ['penalty-take', 'penalty-save', 'freekick', 'corner', 'finishing']

// Đá phạt: khoảng cách tới khung thành (m) và độ lệch ngang (x).
export const FREEKICK_SPOTS = {
    central: { label: 'CENTRAL 20 M', depth: 20, x: 0 },
    left: { label: 'LEFT 24 M', depth: 22, x: -9 },
    right: { label: 'RIGHT 24 M', depth: 22, x: 9 },
    wide: { label: 'WIDE 30 M', depth: 26, x: -19 },
    random: { label: 'RANDOM', depth: null, x: null },
}

const RESULT_PAUSE = 1.4
const LIVE_LIMIT = { freekick: 5, corner: 6, finishing: 9 }

function resetState(ctx) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    Object.assign(state, {
        restart: null,
        pendingRestart: null,
        deadBall: false,
        keeperHands: null,
        keeperHoldTime: 0,
        windup: null,
        charge: null,
        pendingPass: null,
        possession: null,
        penaltyKick: null,
        curl: null,
        keeperPlans: {},
        pickupLocks: {},
        deflection: null,
        shieldingId: null,
        shieldAi: null,
        carry: null,
        looseReceive: null,
        offside: null,
        wall: null,
        whistle: null,
        whistleWatch: null,
        subSeq: null,
        autoPilot: false,
        idleTime: 0,
    })
    state.timers.goalCooldown = 0
    state.timers.aiDecisionCooldown = 0

    if (ball) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    clearPlayerStates(state)
}

// Mọi người về vị trí đội hình, thể lực đầy.
function homeAll(ctx) {
    const { state } = ctx

    placeAllAtHome(ctx)
    ctx.players.forEach((item) => {
        if (state.stamina) state.stamina[item.id] = 100
        state.lastPositions[item.id] = null
    })
}

const goalZ = (state) => attackDir(state, 'blue') * FIELD.lineZ

// Điểm trong vòng cấm đối phương: depth = cách vạch vôi (m), x ngang.
function boxPoint(state, x, depth) {
    const sign = attackDir(state, 'blue')

    return { x, z: sign * (FIELD.lineZ - depth) }
}

function place(ctx, id, point, faceBall = true) {
    const object = ctx.objects[id]
    const ball = ctx.ballRef.current?.translation()

    if (!object) return

    object.position.set(point.x, 0, point.z)

    if (faceBall && ball) object.rotation.y = Math.atan2(ball.x - point.x, ball.z - point.z)
}

// Phạt góc / đá phạt dạt biên: 5 người xanh vào vòng cấm (lùi ra ~1.5m để
// còn đà băng vào), 4 người có hậu vệ đỏ kèm sau lưng, người ở mép vòng cấm
// để trống; thêm một người đỏ trấn giữ cột gần.
function packTheBox(ctx, side, takerId) {
    const { state } = ctx

    state.training.boxPacked = true
    const sign = attackDir(state, 'blue')
    const attackers = ctx.players
        .filter((item) => item.teamId === 'blue' && item.role !== 'GK' && item.id !== takerId && ctx.objects[item.id])
        .sort((a, b) => aerialReach(b) - aerialReach(a))
        .slice(0, 5)
    const defenders = ctx.players
        .filter((item) => item.teamId === 'red' && item.role !== 'GK' && ctx.objects[item.id])
        .sort((a, b) => aerialReach(b) - aerialReach(a))
    const spots = [
        { x: side * 2.6, depth: 6.5 },
        { x: -side * 3, depth: 7.5 },
        { x: side * 0.5, depth: 11 },
        { x: -side * 1, depth: 9.5 },
        { x: -side * 7, depth: 15.5 },
    ]

    attackers.forEach((item, index) => {
        const spot = spots[index]
        const point = boxPoint(state, spot.x, spot.depth + 1.5)

        place(ctx, item.id, point)

        const marker = index < 4 ? defenders[index] : null

        // Người kèm đứng sau lưng (phía ngoài vòng cấm) ~1.6m: tiền đạo đã chiếm
        // được vị trí, nhưng tạt lệch / quá cao thì hậu vệ vẫn tranh được.
        // Lệch về phía xa quả phạt góc (không đứng chắn đường bóng bay tới).
        if (marker) place(ctx, marker.id, { x: point.x - side * 0.8, z: point.z - sign * 1.6 })
    })

    const nearPost = defenders[4]

    if (nearPost) place(ctx, nearPost.id, boxPoint(state, side * 3.4, 1.4))

    // Thủ môn đỏ trên vạch, lệch về cột xa một chút.
    const keeper = ctx.players.find((item) => item.teamId === 'red' && item.role === 'GK')

    if (keeper) place(ctx, keeper.id, { x: -side * 0.6, z: sign * (FIELD.lineZ - 1) })
}

function setupFreekick(ctx) {
    const { state } = ctx
    const options = state.training.options
    const key = options.spot || 'central'
    let spot = FREEKICK_SPOTS[key] || FREEKICK_SPOTS.central

    if (key === 'random') {
        spot = { depth: 18 + Math.random() * 11, x: (Math.random() * 2 - 1) * 14 }
    }

    const x = key === 'wide' && options.side === 'right' ? -spot.x : spot.x
    const point = boxPoint(state, x, spot.depth)

    restartAtSpot(ctx, 'blue', 'free-kick', point.x, point.z)

    if (key === 'wide') packTheBox(ctx, Math.sign(x) || -1, state.restart?.playerId)
}

function setupCorner(ctx) {
    const { state } = ctx
    const side = state.training.options.side === 'right' ? 1 : -1
    const sign = attackDir(state, 'blue')

    restartAtSpot(ctx, 'blue', 'corner', side * FIELD.maxX, sign * FIELD.maxZ)
    packTheBox(ctx, side, state.restart?.playerId)
}

function setupFinishing(ctx) {
    const { state } = ctx
    const options = state.training.options
    const sign = attackDir(state, 'blue')
    const striker = (ctx.selectedId && ctx.byId.get(ctx.selectedId)?.teamId === 'blue' && ctx.byId.get(ctx.selectedId)?.role !== 'GK'
        ? ctx.byId.get(ctx.selectedId)
        : null) ||
        ctx.players
            .filter((item) => item.teamId === 'blue' && item.role !== 'GK')
            .sort((a, b) => (a.z ?? 0) * sign - (b.z ?? 0) * sign)[0]

    if (!striker) return

    const depth = 14 + Math.random() * 11
    const x = (Math.random() * 2 - 1) * 12
    const point = boxPoint(state, x, depth)
    const object = ctx.objects[striker.id]

    object.position.set(point.x, 0, point.z)
    object.rotation.y = Math.atan2(-point.x, goalZ(state) - point.z)
    placeBall(ctx, point.x + Math.sin(object.rotation.y) * 0.55, point.z + Math.cos(object.rotation.y) * 0.55, 0.11)

    state.possession = striker.id
    state.lastTouchTeam = 'blue'
    state.lastToucherId = striker.id
    ctx.onSelect?.(striker.id)
    ctx.selectedId = striker.id

    // Thủ môn đỏ về khung thành; một hậu vệ (tuỳ chọn) đứng chắn phía trước.
    const keeper = ctx.players.find((item) => item.teamId === 'red' && item.role === 'GK')

    if (keeper) place(ctx, keeper.id, { x: 0, z: sign * (FIELD.lineZ - 2) })

    const active = new Set([striker.id, keeper?.id])

    if (options.defender) {
        const defender = ctx.players
            .filter((item) => item.teamId === 'red' && item.role !== 'GK' && ctx.objects[item.id])
            .sort((a, b) => Math.abs(a.x ?? 0) - Math.abs(b.x ?? 0))[0]

        if (defender) {
            place(ctx, defender.id, { x: point.x * 0.7, z: point.z + sign * 5.5 })
            active.add(defender.id)
        }
    }

    // Những người còn lại đứng yên ở vị trí đội hình (không áp sát).
    state.training.frozen = new Set(ctx.players.map((item) => item.id).filter((id) => !active.has(id)))
}

function setupAttempt(ctx) {
    const { state } = ctx
    const training = state.training

    resetState(ctx)
    homeAll(ctx)

    training.attempt += 1
    training.timer = 0
    training.kickId = null
    training.score0 = state.score?.blue || 0
    training.conceded0 = state.score?.red || 0
    training.headerSeen = false
    training.boxPacked = false
    training.thawAt = 0
    training.frozen = new Set(ctx.players.map((item) => item.id))

    if (training.drill === 'freekick') setupFreekick(ctx)
    else if (training.drill === 'corner') setupCorner(ctx)
    else if (training.drill === 'finishing') setupFinishing(ctx)

    // Đá phạt / phạt góc: chờ bạn đá (người đá được chọn điều khiển).
    state.timers.goalCooldown = 0
    training.phase = training.drill === 'finishing' ? 'live' : 'ready'
    training.kickId = state.kickId
}

export function startTraining(ctx, drill, options = {}) {
    const { state } = ctx

    stopTraining(ctx)

    state.matchEnded = false
    state.training = { drill, options, phase: 'ready', timer: 0, attempt: 0, kickId: null, frozen: new Set() }

    if (drill === 'penalty-take' || drill === 'penalty-save') {
        resetState(ctx)
        startShootout(ctx, { first: drill === 'penalty-take' ? 'blue' : 'red', training: drill === 'penalty-take' ? 'take' : 'save' })
        state.training.phase = 'shootout'
        return
    }

    setupAttempt(ctx)
}

export function stopTraining(ctx) {
    const { state } = ctx

    if (state.shootout) stopShootout(ctx)
    state.training = null
}

function finish(ctx, result) {
    const training = ctx.state.training

    if (training.phase === 'result') return

    training.phase = 'result'
    training.timer = 0
    training.frozen = new Set(ctx.players.map((item) => item.id))
    ctx.onTrainingResult?.({ result, header: training.headerSeen })
}

// Gọi ở đầu stepMatch. Trả về true nếu bước này đã xử lý xong (không chạy
// trận bình thường), false để stepMatch chạy tiếp như thường.
export function stepTraining(ctx, dt) {
    const { state } = ctx
    const training = state.training
    const ball = ctx.ballRef.current

    if (!training || training.phase === 'shootout' || !ball) return false

    training.timer += dt

    if (training.phase === 'ready') {
        // Chỉ người đá được hành động: lấy lực, vung chân. Người khác đứng yên.
        updateCharge(ctx, dt)
        updateWindup(ctx, dt)
        trackVelocities(ctx, dt)
        updatePlayerStates(ctx, dt)

        // Bóng đã rời chân → chạy như trận thật cho tới khi có kết quả.
        // Phạt góc / đá phạt dạt biên: hậu vệ đỏ phản ứng chậm một nhịp (~0.6s)
        // — người tấn công có lợi thế chủ động băng vào như trận thật.
        if (state.kickId !== training.kickId) {
            training.phase = 'live'
            training.timer = 0
            training.frozen = training.boxPacked
                ? new Set(ctx.players.filter((item) => item.teamId === 'red' && item.role !== 'GK').map((item) => item.id))
                : new Set()
            training.thawAt = training.boxPacked ? 0.6 : 0
        }

        return true
    }

    if (training.phase === 'result') {
        ball.setLinvel({ x: 0, y: Math.min(0, ball.linvel().y), z: 0 }, true)
        trackVelocities(ctx, dt)
        updatePlayerStates(ctx, dt)

        if (training.timer >= RESULT_PAUSE) setupAttempt(ctx)

        return true
    }

    return false
}

// Gọi cuối stepMatch (pha live): xem lần thử đã xong chưa.
export function judgeTraining(ctx) {
    const { state } = ctx
    const training = state.training

    if (!training || training.phase !== 'live') return

    if (training.thawAt && training.timer >= training.thawAt) {
        training.thawAt = 0
        training.frozen = new Set()
    }

    const kick = state.lastKick

    if (kick?.variant === 'header' && kick.teamId === 'blue') training.headerSeen = true

    const keeper = ctx.players.find((item) => item.teamId === 'red' && item.role === 'GK')
    const owner = state.possession ? ctx.byId.get(state.possession) : null
    const kicked = state.kickId !== training.kickId || training.drill !== 'finishing'

    if ((state.score?.blue || 0) > training.score0) return finish(ctx, 'goal')
    if ((state.score?.red || 0) > training.conceded0) return finish(ctx, 'lost')
    if (keeper && state.keeperHands === keeper.id) return finish(ctx, 'saved')

    if (state.pendingRestart || state.restart) {
        const restart = state.restart || state.pendingRestart
        const type = restart.type
        const result = type === 'corner' && restart.teamId === 'blue' ? 'saved' : type === 'free-kick' || type === 'penalty' ? 'foul' : 'missed'

        return finish(ctx, result)
    }

    if (owner && owner.teamId === 'red') return finish(ctx, owner.role === 'GK' ? 'saved' : 'cleared')

    // Bóng đã dừng sau cú đá mà không ai có bóng.
    if (kicked && training.timer > 1.2 && !state.possession && ballSpeed(ctx) < 0.6) return finish(ctx, 'missed')

    if (training.timer > (LIVE_LIMIT[training.drill] || 6)) finish(ctx, owner?.teamId === 'blue' ? 'over' : 'missed')
}

function ballSpeed(ctx) {
    const v = ctx.ballRef.current?.linvel()

    return v ? Math.hypot(v.x, v.y, v.z) : 0
}
