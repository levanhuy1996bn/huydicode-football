// Phase 37: đánh đầu.
//
// Trước đây bóng cao trên ~1.7m bị bỏ qua: chỉ đỡ được bằng chân / ngực, nên
// tạt bổng vào vòng cấm chỉ rơi xuống đất rồi mới có người lấy. Giờ cầu thủ
// nhảy lên đánh đầu khi bóng bay ngang tầm đầu (1.45m … tầm nhảy):
//   - Tầm nhảy theo chiều cao (Phase 26C) + sức bật (Strength / Agility).
//   - Tranh chấp bóng bổng: nhiều người cùng với tới → người gần hơn, cao
//     hơn, khoẻ hơn có lợi (có may rủi).
//   - Ba kiểu: SÚT bằng đầu (gần khung thành đối phương), PHÁ bóng bằng đầu
//     (gần khung thành nhà), CHUYỀN bằng đầu (giữa sân, cho đồng đội gần).
//   - Người chơi: đang có bóng bổng bay tới cầu thủ mình chọn, giữ / bấm D =
//     đánh đầu cận thành, S = chuyền bằng đầu, A = phá bóng. Không bấm: tự chọn
//     theo vị trí.
// Không thêm chỉ số mới: kỹ năng đánh đầu suy ra từ Finishing (dứt điểm),
// Marking (phá bóng), Short passing (chuyền), Strength và chiều cao.

import { FIELD, clamp, distance2D } from './constants'
import { aerialEdge, aerialReach } from './physique'
import { attr, skill01 } from './attributes'
import { attackDir } from './matchState'
import { isPlayerLocked, setPlayerAction } from './playerState'
import { openPass, recordPlayer, recordShot, recordTeam, shotXg } from './matchStats'
import { getPlayer, listPassCandidates, teamPlayers } from './ball'
import { checkOffside } from './referee'

const HEAD_MIN = 1.45        // dưới mức này: đỡ bằng ngực / chân như cũ
const HEAD_REACH = 0.95      // khoảng cách ngang tối đa từ người tới bóng
const HEADER_XG_FACTOR = 0.6 // đánh đầu khó chính xác hơn sút chân
const DUEL_MARGIN = 0.45     // hai người chênh nhau ít hơn thế → tranh chấp

// Đỉnh với tới khi nhảy (m): tầm với đứng (~1.5–1.67) + sức bật 0.45–0.8.
export function jumpReach(item) {
    const spring = skill01((attr(item, 'strength') + attr(item, 'agility')) / 2)

    return aerialReach(item) + 0.45 + spring * 0.35
}

// Sức mạnh không chiến (0…~1.3): chiều cao / cân nặng + Strength.
function aerialPower(item) {
    return aerialEdge(item) * 4 + skill01(attr(item, 'strength')) * 0.6 + 0.4
}

const otherTeam = (teamId) => (teamId === 'blue' ? 'red' : 'blue')

// Ý người chơi lúc bóng tới (giữ / vừa lấy lực): D sút, S chuyền, A phá.
function userIntent(ctx, item) {
    if (item.teamId !== 'blue' || item.id !== ctx.selectedId || ctx.state.autoPilot) return null

    const pressed = ctx.keys?.current || {}
    const charge = ctx.state.charge?.playerId === item.id ? ctx.state.charge.action : null

    if (pressed.KeyD || charge === 'shoot') return 'shot'
    if (pressed.KeyS || pressed.KeyW || charge === 'pass' || charge === 'through') return 'pass'
    if (pressed.KeyA || charge === 'lob') return 'clear'
    return null
}

// Tự chọn kiểu đánh đầu theo vị trí.
function autoIntent(state, item, object) {
    const attack = attackDir(state, item.teamId)
    const toGoal = FIELD.lineZ - object.position.z * attack
    const toOwnGoal = FIELD.lineZ + object.position.z * attack

    if (toGoal < 17 && Math.abs(object.position.x) < 13) return 'shot'
    if (toOwnGoal < 32) return 'clear'
    return 'pass'
}

// Chọn người đánh đầu trong số những người với tới quả bóng này.
function pickHeader(ctx, ballPosition) {
    const { state, objects } = ctx
    const contenders = []

    ctx.players.forEach((item) => {
        const object = objects[item.id]

        if (!object || item.role === 'GK') return
        if (state.pickupLocks[item.id] > 0 || isPlayerLocked(state, item.id)) return

        const entry = state.playerStates[item.id]

        if (entry && (entry.state === 'fallen' || entry.state === 'slide') && entry.time > 0) return

        const distance = distance2D(object.position, ballPosition)

        // Người được tạt tới vươn / lao người đánh đầu xa hơn một chút.
        if (distance > HEAD_REACH + aerialEdge(item) + (state.pendingPass?.receiverId === item.id ? 0.35 : 0)) return
        if (ballPosition.y > jumpReach(item)) return

        // Người được tạt tới đã canh đúng điểm rơi và chạy đà → lợi thế.
        const intended = state.pendingPass?.receiverId === item.id ? 0.3 : 0

        contenders.push({ item, object, distance, intended, score: distance - aerialPower(item) * 0.25 - intended })
    })

    if (!contenders.length) return null

    contenders.sort((a, b) => a.score - b.score)

    const [first, second] = contenders

    // Tranh chấp tay đôi giữa hai đội: tỉ lệ theo sức không chiến và vị trí.
    if (second && second.item.teamId !== first.item.teamId && second.score - first.score < DUEL_MARGIN) {
        const a = aerialPower(first.item) + (second.score - first.score) * 1.5 + first.intended
        const b = aerialPower(second.item) + second.intended
        const winner = Math.random() < a / (a + b) ? first : second
        const loser = winner === first ? second : first

        recordTeam(state, winner.item.teamId, 'duels')
        recordPlayer(state, winner.item.id, 'duels')
        setPlayerAction(state, loser.item.id, 'header', 0.6)

        return { ...winner, duel: true }
    }

    return { ...first, duel: false }
}

// Gọi mỗi bước khi không ai cầm bóng (ball.js → updateLooseBallPickup).
// Trả về true nếu vừa có người đánh đầu (bỏ qua phần đỡ bóng bước này).
export function tryHeader(ctx, ballPosition, velocity) {
    const { state } = ctx

    if (state.restart || state.keeperHands || state.shootout) return false

    // Ném biên ngắn (S): người nhận đỡ bằng ngực / chân, không đánh đầu.
    // Ném xa (A) thì vẫn tranh đánh đầu như thật.
    if (state.lastKick?.kickId === state.kickId && state.lastKick.throwIn && state.lastKick.action !== 'lob') return false
    if (ballPosition.y < HEAD_MIN || ballPosition.y > 2.75) return false

    const horizontal = Math.hypot(velocity.x, velocity.z)

    // Bóng đang bay (không phải bóng nảy tại chỗ) và không còn bay vọt lên.
    if (horizontal < 4 || velocity.y > 4) return false

    // Thủ môn đang xử lý cú sút này bằng tay thì để thủ môn.
    const plans = state.keeperPlans || {}

    if (Object.values(plans).some((plan) => plan && !plan.resolved && plan.kickId === state.kickId && plan.success)) {
        return false
    }

    const header = pickHeader(ctx, ballPosition)

    if (!header) return false

    // Người đứng việt vị chạm bóng (kể cả bằng đầu) → thổi phạt.
    if (checkOffside(ctx, header.item)) return true

    performHeader(ctx, header, ballPosition, velocity)
    return true
}

function performHeader(ctx, header, ballPosition, velocity) {
    const { state } = ctx
    const ball = ctx.ballRef.current
    const { item, object } = header
    const teamId = item.teamId
    const attack = attackDir(state, teamId)
    const intent = userIntent(ctx, item) || autoIntent(state, item, object)
    const incoming = Math.hypot(velocity.x, velocity.z)
    let dirX = 0
    let dirZ = attack
    let power = 12
    let lift = 1.5
    let message = 'HEADER'
    let action = 'header'
    let receiver = null

    // Nghiêng người đúng hướng bóng tới để nhảy lên đánh.
    object.rotation.y = Math.atan2(-velocity.x, -velocity.z)

    if (intent === 'shot') {
        // Đánh đầu cận thành: chúi bóng xuống về phía khung thành, góc theo
        // Finishing (người dứt điểm tốt nhắm sát cột hơn và ít lệch).
        const skill = skill01((attr(item, 'finishing') * 0.6 + attr(item, 'strength') * 0.4))
        const goalZ = attack * FIELD.lineZ
        const aim = (Math.random() < 0.5 ? -1 : 1) * (1.2 + skill * 1.9)
        const spread = (1 - skill) * 3.2
        const targetX = aim + (Math.random() * 2 - 1) * spread
        const length = Math.hypot(targetX - object.position.x, goalZ - object.position.z) || 1

        dirX = (targetX - object.position.x) / length
        dirZ = (goalZ - object.position.z) / length
        // Bóng tới càng căng thì đánh đầu càng mạnh (đặt lại hướng).
        power = clamp(9 + skill * 6 + incoming * 0.25, 10, 21)
        // Nhắm xuống: ở gần khung thành thì chúi mạnh, xa hơn thì bổng nhẹ.
        lift = clamp(-2.2 + length * 0.12, -2.2, 1.6)
        action = 'shoot'
        message = header.duel ? 'HEADER! (WON THE AERIAL DUEL)' : 'HEADER!'
    } else if (intent === 'pass') {
        // Chuyền bằng đầu cho đồng đội gần (≤ 16m), ưu tiên đường thoáng.
        const option = listPassCandidates(ctx, item.id, 'pass', null)
            .find((entry) => entry.item.role !== 'GK' && entry.distance > 3 && entry.distance <= 16 && entry.laneSlack > -0.5)

        if (option) {
            const target = option.targetPosition
            const length = Math.hypot(target.x - object.position.x, target.z - object.position.z) || 1

            dirX = (target.x - object.position.x) / length
            dirZ = (target.z - object.position.z) / length
            power = clamp(5 + length * 0.55, 7, 14)
            lift = 2.4
            receiver = { id: option.item.id, x: target.x, z: target.z }
            message = 'HEADED PASS'
        } else {
            dirX = (Math.random() * 2 - 1) * 0.4
            dirZ = attack
            power = 11
            lift = 3.2
            message = 'FLICK ON'
        }
    } else {
        // Phá bóng bằng đầu: bổng và xa, lên phía trước, lệch ra biên gần.
        const side = Math.sign(object.position.x) || (Math.random() < 0.5 ? -1 : 1)
        const strength = skill01((attr(item, 'marking') + attr(item, 'strength')) / 2)

        dirX = side * (0.25 + Math.random() * 0.35)
        dirZ = attack
        power = clamp(11 + strength * 6, 11, 18)
        lift = 5 + strength * 2
        message = 'HEADED CLEARANCE'
    }

    const norm = Math.hypot(dirX, dirZ) || 1

    dirX /= norm
    dirZ /= norm

    // Bóng rời đầu ngay trước mặt người đánh.
    ball.setTranslation(
        { x: object.position.x + dirX * 0.35, y: Math.max(1.3, ballPosition.y), z: object.position.z + dirZ * 0.35 },
        true,
    )
    ball.setLinvel({ x: dirX * power, y: lift, z: dirZ * power }, true)
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)

    state.kickId += 1
    state.lastKick = { kickId: state.kickId, action, teamId, playerId: item.id, variant: 'header' }
    state.lastTouchTeam = teamId
    state.lastToucherId = item.id
    state.possession = null
    state.curl = null
    state.deflection = null
    state.windup = null
    state.looseReceive = null
    // Người vừa đánh đầu không chạm lại chính quả bóng đó ngay.
    state.pickupLocks[item.id] = 0.45

    if (state.charge?.playerId === item.id) state.charge = null

    state.pendingPass = receiver
        ? { receiverId: receiver.id, passerId: item.id, targetX: receiver.x, targetZ: receiver.z, action: 'pass', elapsed: 0 }
        : null

    setPlayerAction(state, item.id, 'header', 0.6)
    ctx.onSound?.('kick', { power: Math.min(1, power / 22), action: 'header' })

    if (!state.shootout) {
        recordTeam(state, teamId, 'headers')
        recordPlayer(state, item.id, 'headers')

        if (action === 'shoot') {
            recordTeam(state, teamId, 'shots')
            recordPlayer(state, item.id, 'shots')

            const depth = Math.max(0.5, FIELD.lineZ - object.position.z * attack)
            const lateral = object.position.x * attack
            const pressed = teamPlayers(ctx, otherTeam(teamId)).some((other) => {
                const rival = ctx.objects[other.id]

                return rival && distance2D(rival.position, object.position) < 1.5
            })

            recordShot(state, {
                teamId,
                playerId: item.id,
                depth,
                lateral,
                variant: 'header',
                penalty: false,
                xg: shotXg({ lateral, depth, pressed }) * HEADER_XG_FACTOR,
            })
        } else if (receiver) {
            recordTeam(state, teamId, 'passes')
            recordPlayer(state, item.id, 'passes')
            openPass(state, teamId, item.id)
        }
    }

    const label = teamId === 'blue' ? ctx.userTeamName : ctx.opponentName
    const name = getPlayer(ctx, item.id)?.name?.split(' ').slice(-1)[0]?.toUpperCase() || ''

    ctx.onActionMessage(`${label} ${message}${name && action === 'shoot' ? ` · ${name}` : ''}`)
}
