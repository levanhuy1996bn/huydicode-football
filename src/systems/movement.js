import { FIELD, clamp } from './constants'
import { isPlayerLocked } from './playerState'
import { duelSpeedFactor, pushShare } from './duels'
import { teamTactic } from './tactics'
import { attr, skill01 } from './attributes'
import { fatigueOf, staminaSpeedFactor } from './stamina'

export function clampPlayer(object) {
    object.position.x = clamp(object.position.x, FIELD.minX, FIELD.maxX)
    object.position.z = clamp(object.position.z, FIELD.minZ, FIELD.maxZ)
}

// ---- Tốc độ & tăng tốc (Phase 19) ----
// Tốc độ tối đa theo Sprint speed: 72 → 8.4 m/s, 90 → 8.9 m/s (thủ môn 8).
// Mệt (thể lực < 70) làm giảm tới 18%.
export function topSpeedOf(ctx, item) {
    const sprint = attr(item, 'sprintSpeed')
    const base = item.role === 'GK' ? 8 : 6.4 + (sprint / 80) * 2.2

    return base * staminaSpeedFactor(ctx.state, item.id)
}

// Gia tốc (m/s²) theo Acceleration: 50 → ~14, 90 → ~19.
export function accelerationOf(ctx, item) {
    // Thủ môn di chuyển ngang (bước đệm) rất nhanh trong khung thành.
    if (item.role === 'GK') return 22

    const value = skill01(attr(item, 'acceleration'))

    return (13 + value * 7) * (1 - 0.25 * fatigueOf(ctx.state, item.id))
}

// Tốc độ được phép ở bước này khi muốn chạy `desired` m/s theo hướng (dirX, dirZ):
// chỉ tăng dần theo gia tốc từ vận tốc thực ở bước trước. Đổi hướng gấp thì
// phần vận tốc theo hướng mới nhỏ → phải tăng tốc lại (Agility giảm mất đà).
// Áp cho cầu thủ người chơi điều khiển và người cầm bóng của AI.
export function rampSpeed(ctx, item, desired, dirX, dirZ, dt, turnPenalty = true) {
    const velocity = ctx.state.velocities[item.id] || { x: 0, z: 0 }
    const magnitude = Math.hypot(velocity.x, velocity.z)
    const along = Math.max(0, velocity.x * dirX + velocity.z * dirZ)
    const keep = turnPenalty ? 0.45 + skill01(attr(item, 'agility')) * 0.35 : 1
    const current = along + (magnitude - along) * keep

    if (desired <= current) return desired

    return Math.min(desired, current + accelerationOf(ctx, item) * dt)
}

// Di chuyển cầu thủ AI tới mục tiêu theo tốc độ, gia tốc và chiến thuật.
export function moveAIPlayer(ctx, item, target, speedScale, dt) {
    const object = ctx.objects[item.id]

    if (!object || isPlayerLocked(ctx.state, item.id)) return

    // Người đang ném biên đứng yên tại vạch.
    if (ctx.state.restart?.playerId === item.id) return

    const dx = target.x - object.position.x
    const dz = target.z - object.position.z
    const distance = Math.hypot(dx, dz)

    if (distance < 0.15) return

    const topSpeed = topSpeedOf(ctx, item)
    // Chạy thường ≈ 86% tốc độ tối đa; speedScale (chiến thuật, pressing...)
    // nâng lên nhưng không vượt tốc độ tối đa. Trước Phase 18, speedScale cho
    // phép AI chạy 10–12 m/s nên luôn đuổi kịp đường chuyền.
    const baseSpeed = item.role === 'GK' ? 4.8 : topSpeed * 0.86
    const desired =
        Math.min(baseSpeed * teamTactic(ctx, item.teamId).speed * speedScale, topSpeed) *
        duelSpeedFactor(ctx.state, item.id)
    const dirX = dx / distance
    const dirZ = dz / distance
    // Gia tốc chỉ áp cho người đang cầm bóng (rê bóng). Cầu thủ AI không bóng
    // chạy ngay ở tốc độ mong muốn: thử nghiệm với gia tốc cho mọi người thì
    // số pha tắc bóng giảm một nửa (mục tiêu chạy đổi liên tục theo bóng nên
    // họ không bao giờ đạt tốc độ để áp sát), bàn thắng tăng ~60%.
    const speed = ctx.state.possession === item.id
        ? rampSpeed(ctx, item, desired, dirX, dirZ, dt)
        : desired
    const step = Math.min(distance, speed * dt)

    object.position.x += dirX * step
    object.position.z += dirZ * step
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
