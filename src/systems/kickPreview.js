// Phase 45: đường ngắm dự đoán trong TẬP LUYỆN.
//
// Trong lúc giữ phím lấy lực, chạy thử cú đá với lực / hướng / tổ hợp phím
// hiện tại (ball.js → previewKick, mọi độ lệch ngẫu nhiên = 0) rồi mô phỏng
// đường bóng: trọng lực, lực cản không khí (linearDamping 0.25 của bóng), xoáy
// (ZD / CD / đá phạt cong), nảy đất. Chỉ là dự đoán: cầu thủ kém vẫn lệch,
// người khác chạm bóng thì đổi hướng.
//
// Đá phạt trực tiếp: tính thêm khoảng lực "vượt hàng rào mà không vọt xà"
// (hiện thành dải xanh trên thanh lực).
import { FIELD } from './constants'
import { attackDir } from './matchState'
import { KICK_RELEASE, previewKick } from './ball'
import { chargeKickOptions } from './control'

const STEP = 1 / 60
const MAX_TIME = 3.2
const DAMPING = 0.25
const GRAVITY = 9.81
const REST_Y = 0.27 // tâm bóng khi nằm trên mặt sân
const BOUNCE = 0.4
const WALL_TOP = 1.95 // referee.js → updateWallBlock
const WALL_REACH = 0.55
export const PREVIEW_POINTS = 120

// Mô phỏng đường bóng từ thông số cú đá. Trả về { points (x,y,z…), count,
// landing {x,z} | null (lần chạm đất đầu tiên sau khi bay), goalY (độ cao lúc
// qua vạch vôi khung thành đối phương) , goalX, wallBlocked }.
export function simulateKick(ctx, params, options = {}) {
    const { state } = ctx
    const player = ctx.objects[params.playerId]

    if (!player) return null

    const spot = KICK_RELEASE(params.animation)
    const dir = { x: params.direction.x, z: params.direction.z }

    // ball.js → releaseKick: sút không bao giờ đi lùi về khung thành nhà.
    if (params.action === 'shoot' && !params.isThrowIn) {
        const attack = attackDir(state, ctx.byId.get(params.playerId)?.teamId || 'blue')

        if (dir.z * attack < 0) {
            dir.z = 0
            if (Math.abs(dir.x) < 0.01) dir.x = 1
            const length = Math.hypot(dir.x, dir.z) || 1

            dir.x /= length
            dir.z /= length
        }
    }

    let x = player.position.x + dir.x * spot.releaseOffset
    let y = spot.releaseY
    let z = player.position.z + dir.z * spot.releaseOffset
    let vx = dir.x * params.power
    let vy = params.lift
    let vz = dir.z * params.power

    const curl = params.curl ? { ...params.curl, travelled: 0 } : null
    const goalSign = attackDir(state, 'blue')
    const goalLine = goalSign * FIELD.lineZ
    const walls = options.wallIds ? options.wallIds.map((id) => ctx.objects[id]).filter(Boolean) : []
    const points = options.points || null
    const decay = 1 / (1 + STEP * DAMPING)
    let count = 0
    let landing = null
    let airborne = y > REST_Y + 0.05 || vy > 0.5
    let goalY = null
    let goalX = null
    let wallBlocked = false
    const every = 2

    for (let i = 0; i * STEP < MAX_TIME; i += 1) {
        if (points && i % every === 0 && count < PREVIEW_POINTS) {
            points[count * 3] = x
            points[count * 3 + 1] = y
            points[count * 3 + 2] = z
            count += 1
        }

        // Xoáy: xoay vận tốc ngang theo quãng đường (ball.js → updateCurl).
        if (curl && curl.travelled < curl.distance) {
            const step = Math.hypot(vx, vz) * STEP
            const angle = curl.kappa * step
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)

            ;[vx, vz] = [vx * cos - vz * sin, vx * sin + vz * cos]
            curl.travelled += step
        }

        vy -= GRAVITY * STEP
        vx *= decay
        vy *= decay
        vz *= decay

        const px = x
        const pz = z
        const py = y

        x += vx * STEP
        y += vy * STEP
        z += vz * STEP

        if (y < REST_Y) {
            y = REST_Y

            if (vy < -1.2) {
                if (airborne && !landing) landing = { x, z }
                vy = -vy * BOUNCE
            } else {
                vy = 0
                airborne = false
                // lăn: ma sát mặt sân
                vx *= 0.995
                vz *= 0.995
            }
        } else if (y > REST_Y + 0.05) {
            airborne = true
        }

        if (walls.length && !wallBlocked && y <= WALL_TOP) {
            wallBlocked = walls.some((object) => Math.hypot(object.position.x - x, object.position.z - z) < WALL_REACH)
        }

        // Qua vạch vôi khung thành đối phương.
        if (goalY === null && (pz - goalLine) * (z - goalLine) <= 0 && pz !== z) {
            const t = (goalLine - pz) / (z - pz)

            goalY = py + (y - py) * t
            goalX = px + (x - px) * t

            if (points && count < PREVIEW_POINTS) {
                points[count * 3] = goalX
                points[count * 3 + 1] = goalY
                points[count * 3 + 2] = goalLine
                count += 1
            }

            break
        }

        if (Math.abs(x) > FIELD.lineX + 1 || Math.hypot(vx, vy, vz) < 0.8) break
    }

    return { count, landing, goalY, goalX, wallBlocked }
}

// Cú đá đang lấy lực (state.charge) → thông số + đường bóng.
export function predictCharge(ctx, points) {
    const charge = ctx.state.charge

    if (!charge) return null

    const params = previewKick(ctx, charge.playerId, charge.action, chargeKickOptions(ctx, charge))

    if (!params) return null

    return { params, ...simulateKick(ctx, params, { points }) }
}

const onTarget = (result) =>
    result.goalY !== null &&
    Math.abs(result.goalX) < FIELD.goalHalfWidth - 0.1 &&
    result.goalY < FIELD.goalHeight - 0.15

// Đá phạt trực tiếp: dải lực (0..1) vừa qua hàng rào vừa vào khung thành,
// theo hướng ngắm hiện tại. null = không có mức lực nào (ngắm chệch / quá gần).
export function freeKickZone(ctx) {
    const { state } = ctx
    const charge = state.charge
    const restart = state.restart

    if (!charge || charge.action !== 'shoot' || restart?.type !== 'free-kick' || !restart.wall?.length) return null

    let from = null
    let to = null

    for (let power = 0.35; power <= 1.0001; power += 0.05) {
        const params = previewKick(ctx, charge.playerId, 'shoot', chargeKickOptions(ctx, charge, power))

        if (!params) return null

        const result = simulateKick(ctx, params, { wallIds: restart.wall })
        const good = !result.wallBlocked && onTarget(result)

        if (good) {
            if (from === null) from = power
            to = power
        } else if (from !== null) {
            break
        }
    }

    return from === null ? { from: 0, to: 0, none: true } : { from, to: Math.min(1, to + 0.05) }
}
