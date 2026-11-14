// Phase 39: thay người kiểu thật — chỉ khi bóng chết.
//
// GameScene xếp hàng lượt thay (ctx.pendingSub). Lần bóng chết tiếp theo
// (ném biên, phạt góc, phát bóng, đá phạt, bàn thắng, thủ môn ôm bóng):
//   1. walk  — trọng tài bàn giơ bảng số (GameScene), người bị thay đi bộ tới
//              đường biên phía khán đài chính (nhanh hơn nếu ở xa);
//   2. swap  — đổi đội hình (ctx.onSubSwap); người vào xuất hiện ngay cạnh,
//              hai người đập tay (động tác 'clap');
//   3. enter — người vào chạy vào sân về vị trí, người ra đi ra ngoài.
// Trong lúc đó trận tạm dừng (bóng đứng yên, không ai đá lại), đồng hồ vẫn chạy.
import { FIELD, clamp } from './constants'
import { setPlayerAction, updatePlayerStates } from './playerState'
import { trackVelocities } from './movement'

const WALK_SPEED = 3.2
const RUN_SPEED = 5.5
const MAX_WALK = 4.5

export function startSubstitution(ctx, sub) {
    const { state, objects } = ctx
    const leaving = objects[sub.outId]
    const item = ctx.byId?.get(sub.outId)

    // Người ra không còn trên sân (thẻ đỏ…) → bỏ lượt thay.
    if (!leaving || !item) {
        ctx.onSubDone?.(sub)
        return false
    }

    // Bóng đã đặt để đá lại (ném biên, phạt góc…) hoặc thủ môn ôm bóng: thay
    // được ngay. Chỉ chờ khi đang ăn mừng bàn thắng (chưa có quả giao bóng).
    // Người ra đang là người đá lại / cầm bóng → chờ lần bóng chết sau.
    if (!state.restart && !state.keeperHands && state.timers.goalCooldown > 0) return false
    if (state.restart?.playerId === sub.outId || state.possession === sub.outId || state.keeperHands === sub.outId) return false

    const line = { x: FIELD.maxX + 0.8, z: clamp(leaving.position.z * 0.35, -8, 8) }
    const distance = Math.hypot(line.x - leaving.position.x, line.z - leaving.position.z)

    state.subSeq = {
        ...sub,
        phase: 'walk',
        time: 0,
        line,
        speed: Math.max(WALK_SPEED, distance / MAX_WALK),
        outItem: item,
        target: { x: item.x ?? 0, z: item.z ?? 0 },
    }
    state.charge = null
    state.windup = null
    state.pendingPass = null
    ctx.onSubStart?.(sub)
    return true
}

function moveTo(object, x, z, speed, dt) {
    const dx = x - object.position.x
    const dz = z - object.position.z
    const distance = Math.hypot(dx, dz)

    if (distance < 0.05) return distance

    const step = Math.min(distance, speed * dt)

    object.position.x += (dx / distance) * step
    object.position.z += (dz / distance) * step
    object.rotation.y = Math.atan2(dx, dz)
    return distance - step
}

export function stepSubstitution(ctx, dt) {
    const { state, objects } = ctx
    const seq = state.subSeq
    const ball = ctx.ballRef.current

    seq.time += dt
    if (ball) ball.setLinvel({ x: 0, y: Math.min(0, ball.linvel().y), z: 0 }, true)

    const leaving = objects[seq.outId]
    const coming = objects[seq.inId]

    if (seq.phase === 'walk') {
        const left = leaving ? moveTo(leaving, seq.line.x, seq.line.z, seq.speed, dt) : 0

        if (left < 0.3 || seq.time > MAX_WALK + 1.5) {
            seq.phase = 'swap'
            seq.time = 0
            if (leaving) setPlayerAction(state, seq.outId, 'clap', 0.8)
            ctx.onSubSwap?.(seq)
        }
    } else if (seq.phase === 'swap') {
        // Người vào được vẽ sau một nhịp React → đặt cạnh người ra, quay mặt
        // vào nhau, đập tay.
        if (coming && !seq.placed) {
            seq.placed = true
            seq.time = 0
            coming.position.x = seq.line.x + 0.9
            coming.position.z = seq.line.z + 0.5
            coming.rotation.y = Math.atan2(seq.line.x - coming.position.x, seq.line.z - coming.position.z)
            if (leaving) leaving.rotation.y = Math.atan2(coming.position.x - leaving.position.x, coming.position.z - leaving.position.z)
            setPlayerAction(state, seq.inId, 'clap', 0.8)
        }

        if ((seq.placed && seq.time > 0.85) || seq.time > 2.5) {
            seq.phase = 'enter'
            seq.time = 0
        }
    } else {
        if (coming) moveTo(coming, seq.target.x, seq.target.z, RUN_SPEED, dt)
        if (leaving) moveTo(leaving, FIELD.maxX + 6, seq.line.z + 2, WALK_SPEED * 0.8, dt)

        if (seq.time > 1.3) {
            state.subSeq = null
            // Người vào: vị trí cũ (lastPositions) không còn đúng → vận tốc khỏi nhảy vọt.
            if (coming) state.lastPositions[seq.inId] = { x: coming.position.x, z: coming.position.z }
            ctx.onSubDone?.(seq)
            return
        }
    }

    // Người ra không còn trong ctx.players sau khi đổi đội hình → vẫn cập nhật
    // động tác / vận tốc cho anh ta.
    const extra = seq.outItem && !ctx.players.some((item) => item.id === seq.outId) ? [seq.outItem] : []
    const view = extra.length ? { ...ctx, players: [...ctx.players, ...extra] } : ctx

    trackVelocities(view, dt)
    updatePlayerStates(view, dt)
}
