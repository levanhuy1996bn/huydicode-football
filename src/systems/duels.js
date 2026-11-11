import { clamp, distance2D, facingVector } from './constants'
import { getPlayer } from './ball'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { recordPlayer, recordTeam } from './matchStats'

// ---- Phase 17: tranh chấp tay đôi, che bóng ----
//
// Che bóng (shield): người cầm bóng quay lưng về phía đối thủ gần nhất, giữ
// bóng ở phía xa, di chuyển chậm. Đối thủ đứng sau lưng rất khó tắc bóng,
// phải vòng sang phía có bóng hoặc dùng sức tì đè.
//   - Người chơi: giữ C khi có bóng.
//   - AI: tự che bóng một nhịp khi bị áp sát mà chưa có đường chuyền tốt
//     (xem teamAI.js → updateCarrierAI).
//
// Tì đè (duel): khi một đối thủ áp sát vai người cầm bóng, người cầm bóng bị
// chậm lại tùy chênh lệch thể lực (PHY). Cứ mỗi nhịp tiếp xúc, một lần
// "đấu sức": người yếu hơn có thể bị hất khỏi bóng (bóng văng ra, mất đà),
// hoặc người phòng ngự bị đẩy bật ra.

const SHIELD_THREAT_RANGE = 4.5   // đối thủ trong tầm này mới cần che
const CONTACT_RANGE = 1.32        // coi như đang tì vai (bán kính va chạm 1.1)
const DUEL_INTERVAL = 0.55        // thời gian tiếp xúc cho mỗi lần đấu sức
const DUEL_COOLDOWN = 1.2

const physicalOf = (item) => item?.physical || item?.overall || 75

export function isShielding(state, playerId) {
    return Boolean(playerId) && state.shieldingId === playerId
}

// AI bắt đầu che bóng trong `time` giây.
export function startAiShield(state, playerId, time) {
    state.shieldAi = { playerId, time }
    state.timers.shieldCooldown = time + 3
}

// Đối thủ gần người cầm bóng nhất (không tính người đang nằm sân).
function nearestOpponent(ctx, ownerItem, owner, range) {
    const { state, objects } = ctx
    let best = null

    ctx.players.forEach((other) => {
        if (other.teamId === ownerItem.teamId) return
        if (isPlayerLocked(state, other.id)) return

        const object = objects[other.id]
        if (!object) return

        const distance = distance2D(object.position, owner.position)

        if (distance <= range && (!best || distance < best.distance)) {
            best = { item: other, object, distance }
        }
    })

    return best
}

// Gọi đầu mỗi bước logic: xác định ai đang che bóng và hướng che.
export function updateShield(ctx, dt) {
    const { state, objects, keys } = ctx
    const ownerId = state.possession

    state.shieldingId = null
    state.shieldThreat = null

    if (state.shieldAi) {
        state.shieldAi.time -= dt

        if (state.shieldAi.time <= 0 || state.shieldAi.playerId !== ownerId) {
            state.shieldAi = null
        }
    }

    if (!ownerId || state.windup || state.restart || state.keeperHands === ownerId) return

    const item = getPlayer(ctx, ownerId)
    const owner = objects[ownerId]

    if (!item || !owner || item.role === 'GK' || isPlayerLocked(state, ownerId)) return

    const wants = ownerId === ctx.selectedId
        ? Boolean(keys?.current?.KeyC)
        : state.shieldAi?.playerId === ownerId

    if (!wants) return

    state.shieldingId = ownerId

    const threat = nearestOpponent(ctx, item, owner, SHIELD_THREAT_RANGE)

    if (threat) {
        state.shieldThreat = { id: threat.item.id, distance: threat.distance }

        // Quay lưng về phía đối thủ: mặt (và bóng) hướng ra xa.
        owner.rotation.y = Math.atan2(
            owner.position.x - threat.object.position.x,
            owner.position.z - threat.object.position.z,
        )
    }
}

// Tỉ lệ bị đẩy khi hai cầu thủ khác đội va vào nhau (0.5 = ngang nhau).
// Người khỏe hơn bị đẩy ít hơn; người đang che bóng đứng rất vững.
export function pushShare(ctx, itemA, itemB) {
    const { state } = ctx

    if (isShielding(state, itemA.id)) return 0.15
    if (isShielding(state, itemB.id)) return 0.85
    if (itemA.teamId === itemB.teamId) return 0.5

    return clamp(0.5 + (physicalOf(itemB) - physicalOf(itemA)) * 0.012, 0.25, 0.75)
}

// Hệ số tốc độ của một cầu thủ (bị tì vai thì chậm lại).
export function duelSpeedFactor(state, playerId) {
    return state.duelSlow?.[playerId] ?? 1
}

function teamLabel(ctx, teamId) {
    return teamId === 'blue' ? ctx.userTeamName : ctx.opponentName
}

// Gọi sau khi xử lý va chạm: tì đè giữa người cầm bóng và đối thủ sát vai.
export function updateDuels(ctx, dt) {
    const { state, objects } = ctx
    const ball = ctx.ballRef.current
    const ownerId = state.possession
    const duel = state.duel

    state.duelSlow = {}
    duel.cooldown = Math.max(0, duel.cooldown - dt)

    const item = ownerId ? getPlayer(ctx, ownerId) : null
    const owner = ownerId ? objects[ownerId] : null

    if (
        !ball ||
        !item ||
        !owner ||
        item.role === 'GK' ||
        state.restart ||
        state.keeperHands === ownerId ||
        isPlayerLocked(state, ownerId)
    ) {
        duel.key = null
        duel.time = 0
        return
    }

    const rival = nearestOpponent(ctx, item, owner, CONTACT_RANGE)

    if (!rival || rival.item.role === 'GK') {
        duel.key = null
        duel.time = 0
        return
    }

    const shielding = isShielding(state, ownerId)
    const difference = physicalOf(rival.item) - physicalOf(item)

    // Bị tì vai: chậm lại (người che bóng vốn đã đi chậm nên không trừ thêm).
    if (!shielding) {
        state.duelSlow[ownerId] = clamp(0.9 - difference * 0.006, 0.72, 0.97)
    }

    const key = `${ownerId}|${rival.item.id}`

    if (duel.key !== key) {
        duel.key = key
        duel.time = 0
    }

    duel.time += dt

    if (duel.time < DUEL_INTERVAL || duel.cooldown > 0) return

    duel.time = 0

    const velocity = state.velocities[ownerId] || { x: 0, z: 0 }
    const speed = Math.hypot(velocity.x, velocity.z)
    const sprinting = speed > 6.5

    const loseChance = clamp(
        0.07 + difference * 0.008 + (sprinting ? 0.04 : 0) - (shielding ? 0.03 : 0),
        0.01,
        shielding ? 0.16 : 0.3,
    )
    const holdChance = clamp(
        0.05 - difference * 0.008 + (shielding ? 0.06 : 0),
        0.01,
        0.3,
    )
    const roll = Math.random()

    if (roll < loseChance) {
        // Bị hất khỏi bóng: bóng văng ra phía trước, lệch khỏi người tì.
        const awayX = owner.position.x - rival.object.position.x
        const awayZ = owner.position.z - rival.object.position.z
        const awayLength = Math.hypot(awayX, awayZ) || 1
        const forwardX = speed > 0.5 ? velocity.x / speed : 0
        const forwardZ = speed > 0.5 ? velocity.z / speed : 0

        ball.setLinvel(
            {
                x: forwardX * 3 + (awayX / awayLength) * 2.2,
                y: 0.3,
                z: forwardZ * 3 + (awayZ / awayLength) * 2.2,
            },
            true,
        )

        state.possession = null
        state.pendingPass = null
        state.lastTouchTeam = rival.item.teamId
        state.lastToucherId = rival.item.id
        state.pickupLocks[ownerId] = 0.7
        state.shieldAi = null

        setPlayerAction(state, ownerId, 'stumble')
        recordTeam(state, rival.item.teamId, 'duels')
        recordPlayer(state, rival.item.id, 'duels')
        duel.cooldown = DUEL_COOLDOWN

        ctx.onActionMessage(`${teamLabel(ctx, rival.item.teamId)} WON THE DUEL!`)
        return
    }

    if (roll < loseChance + holdChance) {
        // Người phòng ngự bị đẩy bật ra, mất đà.
        setPlayerAction(state, rival.item.id, 'stumble')
        state.pickupLocks[rival.item.id] = 0.6
        recordTeam(state, item.teamId, 'duels')
        recordPlayer(state, ownerId, 'duels')
        duel.cooldown = DUEL_COOLDOWN

        ctx.onActionMessage(
            shielding
                ? `${teamLabel(ctx, item.teamId)} SHIELDS THE BALL!`
                : `${teamLabel(ctx, item.teamId)} HOLDS OFF THE CHALLENGE!`,
        )
    }
}

// Tỉ lệ tắc bóng thành công mà đoạt được bóng gọn (còn lại: chọc bóng văng ra).
export const CLEAN_TACKLE_RATE = 0.68

// Chọc bóng văng khỏi chân người cầm bóng theo hướng người tắc đang nhìn.
export function pokeBallLoose(ctx, tackler, ownerId, tacklerId, teamId) {
    const { state } = ctx
    const ball = ctx.ballRef.current
    const direction = facingVector(tackler.rotation.y)
    const side = Math.random() < 0.5 ? -1 : 1
    const speed = 4.5 + Math.random() * 2

    // Lệch ngang một chút để bóng không lăn thẳng vào chân người vừa mất bóng.
    ball.setLinvel(
        {
            x: (direction.x + -direction.z * side * 0.45) * speed,
            y: 0.5,
            z: (direction.z + direction.x * side * 0.45) * speed,
        },
        true,
    )

    state.possession = null
    state.pendingPass = null
    state.lastTouchTeam = teamId
    state.lastToucherId = tacklerId
    state.pickupLocks[ownerId] = 0.7
    state.pickupLocks[tacklerId] = 0.25
    state.shieldAi = null
}
