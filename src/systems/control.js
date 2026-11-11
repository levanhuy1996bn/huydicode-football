import * as THREE from 'three'
import { CHARGE_TIME, clamp, distance2D, facingVector } from './constants'
import {
    attachBallToPlayer,
    getBallDistance,
    getPlayer,
    kickFromPlayer,
} from './ball'
import {
    getPlayerState,
    isPlayerLocked,
    setPlayerAction,
} from './playerState'
import { clampPlayer } from './movement'
import { ownGoalSign } from './matchState'
import { recordPlayer, recordTeam } from './matchStats'
import {
    CLEAN_TACKLE_RATE,
    duelSpeedFactor,
    isShielding,
    pokeBallLoose,
} from './duels'

const SLIDE_LUNGE_TIME = 0.32
const SLIDE_LUNGE_SPEED = 10

const RUN_SPEED = 5.2
const SPRINT_SPEED = 8.2
// Rê bóng chậm hơn chạy không bóng một chút.
const DRIBBLE_SPEED_FACTOR = 0.92

// Che bóng (giữ C): đi chậm, lưng quay về phía đối thủ.
const SHIELD_SPEED = 3

const CONTAIN_SPEED = 6
const CONTAIN_GAP = 1.5

const CHARGE_KEYS = {
    KeyS: 'pass',
    KeyW: 'through',
    KeyA: 'lob',
    KeyD: 'shoot',
}

// Hướng phím mũi tên đang bấm (đã chuẩn hóa) hoặc null.
// Camera nhìn từ cạnh sân (+X), nên phím lên = đi về -X.
export function inputDirection(keys) {
    const pressed = keys.current
    const direction = new THREE.Vector3()

    if (pressed.ArrowUp) direction.x -= 1
    if (pressed.ArrowDown) direction.x += 1
    if (pressed.ArrowLeft) direction.z += 1
    if (pressed.ArrowRight) direction.z -= 1

    return direction.lengthSq() > 0 ? direction.normalize() : null
}

// Di chuyển cầu thủ BLUE đang được chọn theo phím mũi tên.
export function updateControlledPlayer(ctx, dt) {
    const { state, objects, keys } = ctx
    const controlled = objects[ctx.selectedId]

    state.dribble.x = 0
    state.dribble.z = 0
    state.dribble.speed = 0
    state.dribble.sprinting = false
    state.containingId = null

    if (!controlled) return

    const entry = getPlayerState(state, ctx.selectedId)

    // Đang xoạc: lao về phía trước trong nhịp đầu, sau đó nằm trên sân.
    if (entry.state === 'slide' && entry.time > 0) {
        if (entry.elapsed < SLIDE_LUNGE_TIME) {
            const direction = facingVector(controlled.rotation.y)

            controlled.position.x += direction.x * SLIDE_LUNGE_SPEED * dt
            controlled.position.z += direction.z * SLIDE_LUNGE_SPEED * dt

            clampPlayer(controlled)
        }

        return
    }

    if (isPlayerLocked(state, ctx.selectedId)) return

    const direction = inputDirection(keys)
    const pressed = keys.current
    const sprinting = Boolean(pressed.KeyE || pressed.ShiftLeft || pressed.ShiftRight)
    const hasBall = state.possession === ctx.selectedId

    // Thủ môn ôm bóng: đứng yên, chỉ xoay người theo hướng định phát bóng.
    if (state.keeperHands === ctx.selectedId) {
        if (direction) {
            controlled.rotation.y = Math.atan2(direction.x, direction.z)
        }

        return
    }

    // Đang ném biên: chỉ xoay người chọn hướng ném (không quay ra ngoài sân).
    if (state.restart?.playerId === ctx.selectedId) {
        if (direction) {
            const inward = -Math.sign(controlled.position.x) || 1
            const aimX = direction.x * inward < 0 ? 0 : direction.x
            const aimZ = direction.z

            if (Math.hypot(aimX, aimZ) > 0.01) {
                controlled.rotation.y = Math.atan2(aimX, aimZ)
            }
        }

        return
    }

    // Đang che bóng: nhích chậm theo phím mũi tên, vẫn quay lưng về phía
    // đối thủ (hướng mặt do duels.js → updateShield đặt).
    if (isShielding(state, ctx.selectedId)) {
        if (direction) {
            controlled.position.x += direction.x * SHIELD_SPEED * dt
            controlled.position.z += direction.z * SHIELD_SPEED * dt

            // Không có ai để che: quay mặt theo hướng đi như bình thường.
            if (!state.shieldThreat) {
                controlled.rotation.y = Math.atan2(direction.x, direction.z)
            }

            clampPlayer(controlled)
        }

        return
    }

    if (!direction) {
        updateContain(ctx, controlled, sprinting, dt)
        return
    }

    // Bị đối thủ tì vai thì chậm lại (duels.js).
    const speed =
        (sprinting ? SPRINT_SPEED : RUN_SPEED) *
        (hasBall ? DRIBBLE_SPEED_FACTOR : 1) *
        duelSpeedFactor(state, ctx.selectedId)

    state.dribble.x = direction.x
    state.dribble.z = direction.z
    state.dribble.speed = speed
    state.dribble.sprinting = sprinting

    controlled.position.x += direction.x * speed * dt
    controlled.position.z += direction.z * speed * dt
    controlled.rotation.y = Math.atan2(direction.x, direction.z)

    clampPlayer(controlled)
}

// ---- Áp sát / kèm người (giữ D khi đối thủ có bóng, không bấm mũi tên) ----
// D     : đứng chắn giữa người cầm bóng và khung thành nhà, cách ~1.5m,
//         lùi theo và luôn quay mặt về phía bóng (chạy chậm, khó bị qua).
// D + E : pressing gắt — lao thẳng vào bóng với tốc độ nước rút.
function updateContain(ctx, controlled, sprinting, dt) {
    const { state, objects, keys } = ctx

    if (!keys.current.KeyD) return

    const ownerId = state.possession
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null
    const carrier = ownerId ? objects[ownerId] : null
    const ball = ctx.ballRef.current

    if (!ownerItem || ownerItem.teamId === 'blue' || !carrier || !ball) return

    // Người đang áp sát "đứng vững": va chạm không đẩy lùi được (xem movement.js).
    state.containingId = ctx.selectedId

    const ballPosition = ball.translation()
    let targetX
    let targetZ
    let speed

    if (sprinting) {
        targetX = ballPosition.x
        targetZ = ballPosition.z
        speed = SPRINT_SPEED
    } else {
        const goalZ = ownGoalSign(state, 'blue') * 52.5
        const toGoalX = 0 - carrier.position.x
        const toGoalZ = goalZ - carrier.position.z
        const length = Math.hypot(toGoalX, toGoalZ) || 1

        targetX = carrier.position.x + (toGoalX / length) * CONTAIN_GAP
        targetZ = carrier.position.z + (toGoalZ / length) * CONTAIN_GAP

        // Còn xa vị trí chắn thì chạy nhanh về, tới nơi thì lùi chậm (jockey).
        const gap = Math.hypot(
            targetX - controlled.position.x,
            targetZ - controlled.position.z,
        )

        speed = gap > 2.5 ? SPRINT_SPEED * 0.9 : CONTAIN_SPEED
    }

    const dx = targetX - controlled.position.x
    const dz = targetZ - controlled.position.z
    const distance = Math.hypot(dx, dz)

    if (distance > 0.05) {
        const step = Math.min(distance, speed * dt)

        controlled.position.x += (dx / distance) * step
        controlled.position.z += (dz / distance) * step
        clampPlayer(controlled)
    }

    // Luôn quay mặt về phía bóng.
    controlled.rotation.y = Math.atan2(
        ballPosition.x - controlled.position.x,
        ballPosition.z - controlled.position.z,
    )
}

// ---- Tắc bóng ----
// Mục tiêu là QUẢ BÓNG, không phải người. Cơ hội phụ thuộc:
// - độ "lộ" của bóng: bóng càng xa chân người rê (vừa chạm mạnh) càng dễ;
// - góc: trực diện/bên cạnh dễ hơn từ sau lưng;
// - chỉ số phòng ngự + thể lực so với rê bóng + thể lực;
// - khoảng cách tới bóng.
// Tắc đứng trượt thì mất đà (stumble ~0.45s). Xoạc trượt thì nằm sân.
export function performTackle(ctx, type) {
    const { state, objects } = ctx

    if (state.timers.tackleCooldown > 0 || state.restart) return

    const selectedId = ctx.selectedId
    const player = objects[selectedId]
    const ball = ctx.ballRef.current

    if (!player || !ball || isPlayerLocked(state, selectedId)) return

    const isSlide = type === 'slide'
    const range = isSlide ? 3.2 : 1.9

    const tacklerItem = getPlayer(ctx, selectedId)
    const ownerId = state.possession
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null
    const ownerObject = ownerId ? objects[ownerId] : null
    const ballPosition = ball.translation()
    const ballDistance = getBallDistance(ctx, player)

    // Không được tranh bóng khi thủ môn đã ôm bóng trong tay.
    if (ownerId && state.keeperHands === ownerId) {
        ctx.onActionMessage("CAN'T CHALLENGE THE GOALKEEPER")
        return
    }

    if (ownerItem?.teamId === 'blue') {
        ctx.onActionMessage('YOUR TEAM HAS THE BALL')
        return
    }

    if (ballDistance > range) {
        ctx.onActionMessage('TOO FAR FROM THE BALL')
        return
    }

    state.timers.tackleCooldown = isSlide ? 1.5 : 0.85

    // Quay người về phía bóng trước khi tắc/xoạc.
    player.rotation.y = Math.atan2(
        ballPosition.x - player.position.x,
        ballPosition.z - player.position.z,
    )

    setPlayerAction(state, selectedId, isSlide ? 'slide' : 'tackle')

    let successChance = 1
    // Người cầm bóng đang che bóng và mình đứng sau lưng họ.
    let shieldedFromBehind = false

    if (ownerItem && ownerObject) {
        const ownStrength =
            (tacklerItem?.defending || 75) * 0.6 +
            (tacklerItem?.physical || 75) * 0.4

        const opponentStrength =
            (ownerItem.dribbling || 75) * 0.6 +
            (ownerItem.physical || 75) * 0.4

        const exposure = clamp(
            (distance2D(ownerObject.position, ballPosition) - 0.7) / 1.0,
            0,
            1,
        )

        // 1 = đứng trước mặt người cầm bóng, -1 = sau lưng.
        const ownerFacing = facingVector(ownerObject.rotation.y)
        const toTacklerX = player.position.x - ownerObject.position.x
        const toTacklerZ = player.position.z - ownerObject.position.z
        const toTacklerLength = Math.hypot(toTacklerX, toTacklerZ) || 1
        const frontDot =
            (ownerFacing.x * toTacklerX + ownerFacing.z * toTacklerZ) /
            toTacklerLength

        successChance = clamp(
            (isSlide ? 0.4 : 0.34) +
            exposure * (isSlide ? 0.3 : 0.38) +
            (ownStrength - opponentStrength) * 0.006 +
            frontDot * (isSlide ? 0.12 : 0.08) -
            (ballDistance / range) * 0.15,
            0.1,
            0.9,
        )

        // Che bóng: từ sau lưng gần như không với tới bóng, phải vòng sang
        // phía có bóng (trước mặt người cầm bóng).
        if (isShielding(state, ownerId) && frontDot < 0.35) {
            shieldedFromBehind = true
            successChance = clamp(successChance - (isSlide ? 0.22 : 0.3), 0.04, 0.9)
        }
    }

    if (Math.random() >= successChance) {
        if (!isSlide) {
            setPlayerAction(state, selectedId, 'stumble')
        }

        ctx.onActionMessage(
            shieldedFromBehind
                ? 'SHIELDED! GO AROUND TO THE BALL SIDE'
                : isSlide
                    ? 'SLIDE TACKLE MISSED'
                    : 'TACKLE MISSED',
        )
        return
    }

    if (isSlide) {
        // Xoạc thành công: phá bóng bật ra theo hướng xoạc,
        // người bị xoạc ngã xuống.
        const direction = facingVector(player.rotation.y)

        ball.setLinvel(
            { x: direction.x * 5, y: 0.4, z: direction.z * 5 },
            true,
        )

        if (ownerId) {
            state.pickupLocks[ownerId] = 0.8
            setPlayerAction(state, ownerId, 'fallen')
        }

        state.possession = null
        state.pendingPass = null
        state.lastTouchTeam = 'blue'
        state.lastToucherId = selectedId

        recordTeam(state, 'blue', 'tackles')
        recordPlayer(state, selectedId, 'tackles')
        ctx.onActionMessage('SLIDING TACKLE SUCCESS!')
        return
    }

    if (ownerId) {
        state.pickupLocks[ownerId] = 0.4
    }

    // Không phải lần nào cũng đoạt được bóng gọn: đôi khi chỉ chọc được bóng
    // văng ra (bóng tự do, ai nhanh hơn thì lấy).
    if (ownerId && Math.random() > CLEAN_TACKLE_RATE) {
        pokeBallLoose(ctx, player, ownerId, selectedId, 'blue')
        recordTeam(state, 'blue', 'tackles')
        recordPlayer(state, selectedId, 'tackles')
        ctx.onActionMessage('BALL POKED LOOSE!')
        return
    }

    attachBallToPlayer(ctx, player, selectedId)

    if (ownerId) {
        recordTeam(state, 'blue', 'tackles')
        recordPlayer(state, selectedId, 'tackles')
    }

    ctx.onActionMessage('TACKLE SUCCESS!')
}

// ---- Giữ phím lấy lực ----
function canKick(ctx, playerId) {
    const { state } = ctx
    const ownerId = state.possession

    if (ownerId) return ownerId === playerId

    const player = ctx.objects[playerId]

    return Boolean(player) && getBallDistance(ctx, player) <= 2.2
}

export function startCharge(ctx, action) {
    const { state } = ctx

    if (state.charge) return

    const ownerId = state.possession
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null

    let playerId = null

    if (ownerItem?.teamId === 'blue') {
        playerId = ownerId

        if (ownerId !== ctx.selectedId) {
            ctx.onSelect(ownerId)
            ctx.selectedId = ownerId
        }
    } else if (ownerItem) {
        ctx.onActionMessage('OPPONENT HAS POSSESSION')
        return
    } else if (canKick(ctx, ctx.selectedId)) {
        playerId = ctx.selectedId
    } else {
        ctx.onActionMessage('GET CLOSER TO THE BALL')
        return
    }

    state.charge = { action, playerId, power: 0 }
}

// Gọi mỗi bước logic: tăng lực, hủy nếu đã mất bóng.
export function updateCharge(ctx, dt) {
    const { state } = ctx
    const charge = state.charge

    if (!charge) return

    if (!canKick(ctx, charge.playerId)) {
        state.charge = null
        return
    }

    charge.power = Math.min(1, charge.power + dt / CHARGE_TIME)
}

export function releaseCharge(ctx, action) {
    const { state } = ctx
    const charge = state.charge

    if (!charge || charge.action !== action) return

    state.charge = null

    if (!canKick(ctx, charge.playerId)) return

    kickFromPlayer(ctx, charge.playerId, action, false, {
        power: Math.max(0.12, charge.power),
        aimInput: inputDirection(ctx.keys),
    })
}

// ---- Đổi cầu thủ (S khi không có bóng, Q) ----
// mode 'nearest': cầu thủ gần bóng nhất (khác người đang chọn)
// mode 'cycle'  : lần lượt trong 4 cầu thủ gần bóng nhất
export function switchPlayer(ctx, mode = 'nearest') {
    const ball = ctx.ballRef.current
    if (!ball) return

    const ballPosition = ball.translation()

    const candidates = ctx.bluePlayers
        .filter((item) => item.role !== 'GK')
        .map((item) => ({ item, object: ctx.objects[item.id] }))
        .filter((entry) => entry.object)
        .map((entry) => ({
            ...entry,
            distance: distance2D(entry.object.position, ballPosition),
        }))
        .sort((a, b) => a.distance - b.distance)

    if (candidates.length === 0) return

    let target

    if (mode === 'cycle') {
        const pool = candidates.slice(0, 4)
        const index = pool.findIndex((entry) => entry.item.id === ctx.selectedId)
        target = pool[(index + 1) % pool.length]
    } else {
        target =
            candidates[0].item.id === ctx.selectedId && candidates[1]
                ? candidates[1]
                : candidates[0]
    }

    if (!target || target.item.id === ctx.selectedId) return

    ctx.onSelect(target.item.id)
    ctx.selectedId = target.item.id
    ctx.onActionMessage(`SWITCH: ${target.item.name.toUpperCase()}`)
}

function blueCanKick(ctx) {
    const ownerItem = ctx.state.possession
        ? getPlayer(ctx, ctx.state.possession)
        : null

    if (ownerItem) return ownerItem.teamId === 'blue'

    return canKick(ctx, ctx.selectedId)
}

export function handleKeyDown(ctx, event) {
    if (event.repeat) return

    const action = CHARGE_KEYS[event.code]

    if (action) {
        event.preventDefault()

        if (!blueCanKick(ctx)) {
            // Không có bóng: S = đổi cầu thủ. D (áp sát) và A (gọi đồng đội
            // pressing) được xử lý theo trạng thái giữ phím mỗi bước logic.
            if (event.code === 'KeyS') {
                switchPlayer(ctx, 'nearest')
            }

            return
        }

        // Ném biên chỉ có S (ném gần) và A (ném xa).
        if (ctx.state.restart?.type === 'throw-in' && action === 'shoot') {
            ctx.onActionMessage('THROW-IN: S SHORT · A LONG')
            return
        }

        startCharge(ctx, action)
        return
    }

    switch (event.code) {
        case 'KeyQ':
            event.preventDefault()
            switchPlayer(ctx, 'cycle')
            break
        case 'Space':
            event.preventDefault()
            performTackle(ctx, 'standing')
            break
        case 'ControlLeft':
        case 'ControlRight':
            event.preventDefault()
            performTackle(ctx, 'slide')
            break
        default:
            break
    }
}

export function handleKeyUp(ctx, event) {
    const action = CHARGE_KEYS[event.code]

    if (action) {
        releaseCharge(ctx, action)
    }
}
