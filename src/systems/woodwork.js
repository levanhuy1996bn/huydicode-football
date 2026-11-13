import { FIELD, clamp } from './constants'
import { recordPlayer, recordTeam } from './matchStats'

// Phase 30A: bóng trúng cột dọc / xà ngang.
// Va chạm vật lý do Rapier xử lý (collider tròn trong Goal.jsx); ở đây chỉ
// NHẬN RA cú chạm để có tiếng "ping", chữ trên màn hình, thống kê và dòng
// thời gian. Cách nhận: bóng sát khung thành và thành phần vận tốc hướng vào
// khung bị đảo chiều so với bước trước.

export const POST_RADIUS = 0.06
// Chiều cao tới tâm xà ngang (khớp Goal.jsx).
export const FRAME_HEIGHT = 2.5

const CONTACT = FIELD.ballRadius + POST_RADIUS + 0.12
const MIN_APPROACH = 2.2 // m/s hướng vào khung ở bước trước
const COOLDOWN = 0.4

// Điểm gần nhất trên khung thành ở phía `side` (−1 / +1).
export function nearestFramePoint(position, side) {
    const z = side * FIELD.lineZ
    let best = null

    for (const x of [-FIELD.goalHalfWidth, FIELD.goalHalfWidth]) {
        const y = clamp(position.y, 0, FRAME_HEIGHT)
        const distance = Math.hypot(position.x - x, position.y - y, position.z - z)

        if (!best || distance < best.distance) best = { x, y, z, distance, part: 'post' }
    }

    const x = clamp(position.x, -FIELD.goalHalfWidth, FIELD.goalHalfWidth)
    const distance = Math.hypot(position.x - x, position.y - FRAME_HEIGHT, position.z - z)

    if (distance < best.distance) best = { x, y: FRAME_HEIGHT, z, distance, part: 'crossbar' }

    return best
}

// Có phải một cú chạm khung không (thuần tính toán — dễ kiểm thử).
// Vận tốc đổi chiều ở bước SAU khi bóng chạm, lúc đó bóng đã rời khung một
// đoạn (≈ tốc độ / 60) → khoảng cách và pháp tuyến lấy theo vị trí bước trước
// (lúc còn đang chạm).
export function isFrameHit(previousPosition, previousVelocity, velocity) {
    if (!previousVelocity || !previousPosition) return null
    if (Math.abs(previousPosition.z) < FIELD.lineZ - 2.5 || Math.abs(previousPosition.z) > FIELD.lineZ + 2.5) return null

    const point = nearestFramePoint(previousPosition, Math.sign(previousPosition.z) || 1)

    if (point.distance > CONTACT || point.distance < 1e-4) return null

    const nx = (previousPosition.x - point.x) / point.distance
    const ny = (previousPosition.y - point.y) / point.distance
    const nz = (previousPosition.z - point.z) / point.distance
    const before = previousVelocity.x * nx + previousVelocity.y * ny + previousVelocity.z * nz
    const after = velocity.x * nx + velocity.y * ny + velocity.z * nz

    if (before > -MIN_APPROACH || after <= 0) return null

    return { part: point.part, speed: -before }
}

export function checkWoodwork(ctx, dt) {
    const { state } = ctx
    const ball = ctx.ballRef?.current

    if (!ball) return null

    const memory = state.woodwork || (state.woodwork = { position: null, velocity: null, cooldown: 0 })

    // Vừa có bàn thắng: bóng còn nảy trong lưới (sát cột) → không tính.
    if (state.timers?.goalCooldown > 0) {
        memory.position = null
        memory.velocity = null
        return null
    }
    const rawPosition = ball.translation()
    const raw = ball.linvel()
    const position = { x: rawPosition.x, y: rawPosition.y, z: rawPosition.z }
    const velocity = { x: raw.x, y: raw.y, z: raw.z }

    memory.cooldown = Math.max(0, memory.cooldown - dt)

    const hit = memory.cooldown <= 0 ? isFrameHit(memory.position, memory.velocity, velocity) : null

    memory.position = position
    memory.velocity = velocity

    if (!hit) return null

    memory.cooldown = COOLDOWN

    // Ghi công cho người sút / chạm cuối.
    const toucher = state.lastToucherId ? ctx.byId?.get(state.lastToucherId) : null
    const teamId = toucher?.teamId || state.lastKick?.teamId || null

    if (teamId) recordTeam(state, teamId, 'woodwork')
    if (toucher) recordPlayer(state, toucher.id, 'woodwork')

    ctx.onSound?.('woodwork', { power: Math.min(1, hit.speed / 24), part: hit.part })
    ctx.onActionMessage?.(hit.part === 'post' ? 'OFF THE POST!' : 'OFF THE CROSSBAR!')
    ctx.onWoodwork?.({ teamId, playerId: toucher?.id || null, name: toucher?.name || null, part: hit.part })

    return hit
}
