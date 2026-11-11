import { FIELD, clamp } from './constants'
import { isPlayerLocked } from './playerState'
import { duelSpeedFactor, pushShare } from './duels'

export function clampPlayer(object) {
    object.position.x = clamp(object.position.x, FIELD.minX, FIELD.maxX)
    object.position.z = clamp(object.position.z, FIELD.minZ, FIELD.maxZ)
}

// Di chuyển cầu thủ AI tới mục tiêu theo tốc độ (pace) và chiến thuật.
export function moveAIPlayer(ctx, item, target, speedScale, dt) {
    const object = ctx.objects[item.id]

    if (!object || isPlayerLocked(ctx.state, item.id)) return

    // Người đang ném biên đứng yên tại vạch.
    if (ctx.state.restart?.playerId === item.id) return

    const dx = target.x - object.position.x
    const dz = target.z - object.position.z
    const distance = Math.hypot(dx, dz)

    if (distance < 0.15) return

    const pace = (item.pace || 72) / 80
    const baseSpeed = item.role === 'GK' ? 4.8 : 5.2 + pace * 2.2
    const speed =
        baseSpeed * ctx.tactic.speed * speedScale * duelSpeedFactor(ctx.state, item.id)
    const step = Math.min(distance, speed * dt)

    object.position.x += (dx / distance) * step
    object.position.z += (dz / distance) * step
    object.rotation.y = Math.atan2(dx, dz)

    clampPlayer(object)
}

// Đẩy các cầu thủ chồng lên nhau ra xa.
export function resolvePlayerCollisions(ctx) {
    const entries = ctx.players
        .map((item) => ({ id: item.id, item, object: ctx.objects[item.id] }))
        .filter((entry) => entry.object)

    // Người đang áp sát (giữ D) không bị đẩy lùi — người rê bóng phải đi vòng.
    const anchoredId = ctx.state.containingId

    const minDistance = FIELD.playerRadius * 2

    for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
            const a = entries[i].object
            const b = entries[j].object
            const aAnchored = entries[i].id === anchoredId
            const bAnchored = entries[j].id === anchoredId

            const dx = b.position.x - a.position.x
            const dz = b.position.z - a.position.z
            const distance = Math.hypot(dx, dz)

            if (distance > 0 && distance < minDistance) {
                const overlap = minDistance - distance
                // Người khỏe hơn (PHY) bị đẩy ít hơn; người che bóng đứng vững.
                const shareA = aAnchored
                    ? 0
                    : bAnchored
                        ? 1
                        : pushShare(ctx, entries[i].item, entries[j].item)
                const shareB = 1 - shareA
                const nx = dx / distance
                const nz = dz / distance

                a.position.x -= nx * overlap * shareA
                a.position.z -= nz * overlap * shareA
                b.position.x += nx * overlap * shareB
                b.position.z += nz * overlap * shareB

                clampPlayer(a)
                clampPlayer(b)
            }
        }
    }
}

// Lưu vận tốc thực tế (dùng cho chuyền đón đầu, rê bóng, state machine)
// và vị trí cuối để cầu thủ dự bị vào sân đúng chỗ.
export function trackVelocities(ctx, dt) {
    const { state } = ctx

    ctx.players.forEach((item) => {
        const object = ctx.objects[item.id]
        if (!object) return

        const previous = state.lastPositions[item.id]

        if (previous && dt > 0) {
            state.velocities[item.id] = {
                x: clamp((object.position.x - previous.x) / dt, -9, 9),
                z: clamp((object.position.z - previous.z) / dt, -9, 9),
            }
        }

        state.lastPositions[item.id] = {
            x: object.position.x,
            z: object.position.z,
        }
    })
}
