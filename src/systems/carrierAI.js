import { FIELD, clamp, distance2D } from './constants'
import { attackDir } from './matchState'
import {
    getPlayer,
    kickFromPlayer,
    listPassCandidates,
    cornerTarget,
} from './ball'
import { moveAIPlayer } from './movement'
import { isPlayerLocked } from './playerState'
import { startAiShield } from './duels'
import { teamTactic } from './tactics'
import { attr, skill01 } from './attributes'

// ---- Phase 18: AI cầm bóng ----
//
// Mỗi ~0.2 giây người cầm bóng (không do người chơi điều khiển) đánh giá:
//   1. Sút     — theo khoảng cách, góc sút và có người chắn hay không.
//   2. Chuyền  — mọi đồng đội × 3 kiểu (sệt, chọc khe, bổng), chấm điểm theo
//                độ an toàn của đường chuyền (laneSlack), độ thoáng của người
//                nhận và số mét tiến lên được.
//   3. Rê bóng — chọn hướng thoáng nhất trong 9 hướng, ưu tiên tiến lên.
//   4. Che bóng / phá bóng khi bị áp sát mà không còn lựa chọn nào.
// Trước đây AI chỉ chuyền khi đối thủ đã ở sát người (≤ 2.5m) và không xét
// đường chuyền có bị chắn không → khoảng 60% đường chuyền bị cắt.

// Thủ môn người chơi được ôm bóng tối đa 6 giây rồi tự phát bóng.
export const KEEPER_HOLD_LIMIT = 6

const CLOSE_PRESSURE = 2.3
const NEAR_PRESSURE = 5.5
const DECIDE_MIN = 0.16
const DECIDE_JITTER = 0.12

// Tốc độ rê bóng của AI: giữ bóng sát chân (~5.3 m/s) khi có người ở gần,
// chỉ tăng tốc (~7.4 m/s, bóng xa chân hơn và dễ bị cắt) khi phía trước trống.
const CONTROL_SCALE = 0.72
const SPRINT_SCALE = 1

const DRIBBLE_ANGLES = [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2.2, -2.2]

function opponentsNear(ctx, ownerItem, owner, range) {
    const { state, objects } = ctx
    const list = []

    ctx.players.forEach((other) => {
        if (other.teamId === ownerItem.teamId) return

        const object = objects[other.id]
        if (!object) return

        const distance = distance2D(object.position, owner.position)

        if (distance > range) return

        list.push({
            item: other,
            x: object.position.x,
            z: object.position.z,
            distance,
            // Người đang nằm sân / mất đà không gây áp lực.
            active: !isPlayerLocked(state, other.id),
        })
    })

    return list.sort((a, b) => a.distance - b.distance)
}

// Càng bị áp sát, rê bóng càng kém giá trị → chuyền sớm trước khi bị vây.
function pressureFactor(nearest) {
    if (nearest < CLOSE_PRESSURE) return 0.3
    if (nearest < 4) return 0.5
    if (nearest < 6.5) return 0.7
    if (nearest < 9) return 0.9

    return 1
}

// Giá trị cú sút 0..1 (≈ khả năng đáng để sút).
// Phase 29F: tầm sút theo Long shots (50 → ~25m, 75 → ~29m, 99 → 32m; trước
// đây ai cũng chỉ ≤ 27m và từ 22m trở ra gần như không sút), Composure làm
// cú sút bị chắn ít mất giá trị hơn (dám sút qua người).
export function evaluateShot(owner, direction, opponents, skills = {}) {
    const { longSkill = 0.5, composure = 0.5 } = skills
    const maxRange = 24 + Math.min(1, longSkill) * 8
    const goalZ = direction * FIELD.lineZ
    const depth = (goalZ - owner.position.z) * direction

    if (depth < 1 || depth > maxRange) return 0

    const distance = Math.hypot(owner.position.x, depth)

    if (distance > maxRange) return 0

    // Góc nhìn thấy khung thành.
    const angle =
        Math.atan2(FIELD.goalHalfWidth - owner.position.x, depth) -
        Math.atan2(-FIELD.goalHalfWidth - owner.position.x, depth)

    const angleFactor = clamp(angle / 0.42, 0.12, 1)
    // Gần (≤ 16m) như cũ; xa hơn thì người sút xa giỏi giảm chậm hơn.
    const distanceFactor = clamp(1.45 - distance / (distance > 16 ? 22 + Math.min(1, longSkill) * 12 : 24), 0, 1)

    // Có hậu vệ đứng chắn ngay trên đường sút.
    const lineX = 0 - owner.position.x
    const lineZ = goalZ - owner.position.z
    const lengthSq = lineX * lineX + lineZ * lineZ

    const blocked = opponents.some((opponent) => {
        if (opponent.item.role === 'GK' || !opponent.active) return false

        const projection =
            ((opponent.x - owner.position.x) * lineX +
                (opponent.z - owner.position.z) * lineZ) /
            lengthSq

        if (projection < 0.04 || projection > 0.6) return false

        const closestX = owner.position.x + lineX * projection
        const closestZ = owner.position.z + lineZ * projection

        return Math.hypot(opponent.x - closestX, opponent.z - closestZ) < 1
    })

    // Bị chắn: 0.4 (Composure 50) → 0.62 (Composure 99).
    const blockedFactor = 0.3 + Math.min(1.2, composure) * 0.27

    return distanceFactor * angleFactor * (blocked ? blockedFactor : 1)
}

// ---- Phase 30B: dẫn thêm một nhịp vào vị trí sút đẹp ----
// Trước đây gần vòng cấm AI so "chuyền" với "rê" bằng giá trị rê chung chung
// (tối đa 0.58, không xét góc sút sẽ có) → hay chuyền ra biên dù chỉ cần dẫn
// thêm một nhịp là có góc sút đẹp. Giờ AI nhìn trước ~0.8 giây:
//   1. Thử vài hướng dẫn (thẳng vào khung, ngoặt vào trung lộ / chấm phạt đền,
//      hướng rê thoáng nhất) → vị trí sẽ tới.
//   2. Đường dẫn phải trống (không ai đứng chắn trong ~3–5m) và ở vị trí mới
//      không bị áp sát quá (hậu vệ càng gần, cú sút ở đó càng mất giá trị).
//   3. Chất lượng cú sút ở vị trí mới tốt hơn rõ rệt so với bây giờ → dẫn tiếp
//      (giữ kế hoạch ~0.8 giây), chỉ chuyền nếu có đồng đội trống trong vòng
//      cấm với cơ hội tốt hơn hẳn.
// Ngưỡng theo chỉ số: Ball control / Agility / Composure cao dám dẫn hơn.
export const LOOKAHEAD_TIME = 0.8
const CARRY_SPEED = 5.3 // m/s khi dẫn bóng sát chân
const LANE_WIDTH = 1.5
const PLAN_HOLD = 0.8

// Hậu vệ (đang hoạt động, không tính thủ môn) chắn đường dẫn từ A theo hướng d dài `length`.
function laneBlocked(position, dx, dz, length, opponents) {
    return opponents.some((opponent) => {
        if (!opponent.active || opponent.item.role === 'GK') return false

        const relX = opponent.x - position.x
        const relZ = opponent.z - position.z
        const along = relX * dx + relZ * dz
        const lateral = Math.abs(relX * dz - relZ * dx)

        return along > -0.3 && along < length + 1.2 && lateral < LANE_WIDTH
    })
}

// Các hướng dẫn thử: vào khung thành, ngoặt vào chấm phạt đền (cầu thủ chạy
// cánh ngoặt vào trong), hướng rê thoáng nhất hiện tại.
function lookaheadDirections(position, direction, choice) {
    const goalZ = direction * FIELD.lineZ
    const list = []
    const add = (x, z, kind) => {
        const length = Math.hypot(x, z)

        if (length > 0.01) list.push({ x: x / length, z: z / length, kind })
    }

    add(-position.x * 0.6, goalZ - position.z, 'goal')
    if (Math.abs(position.x) > 7) add(-position.x, direction * (FIELD.lineZ - 11) - position.z, 'cutInside')
    if (choice) add(choice.x, choice.z, 'open')

    return list
}

// Kế hoạch dẫn bóng tốt nhất (hoặc null). opponents = danh sách opponentsNear.
// skills = { longSkill, composure, control } (0..1+).
export function planCarry(position, direction, opponents, skills = {}, choice = null) {
    const advance = position.z * direction

    // Chỉ trong 1/3 cuối sân, chưa sát đường biên ngang.
    if (advance < 20 || advance > FIELD.lineZ - 3) return null

    const owner = { position }
    const now = evaluateShot(owner, direction, opponents, skills)
    const nearest = opponents.find((opponent) => opponent.active && opponent.item.role !== 'GK')

    // Đang bị áp sát ngay trước mặt thì không dẫn tiếp được.
    if (nearest && nearest.distance < 1.6) return null

    const freeAhead = !nearest || nearest.distance > 7
    const step = CARRY_SPEED * LOOKAHEAD_TIME * (freeAhead ? 1.2 : 1)
    let best = null

    lookaheadDirections(position, direction, choice).forEach((dir) => {
        if (laneBlocked(position, dir.x, dir.z, step, opponents)) return

        const target = {
            x: clamp(position.x + dir.x * step, FIELD.minX + 1, FIELD.maxX - 1),
            y: 0,
            z: position.z + dir.z * step,
        }

        if (target.z * direction > FIELD.lineZ - 1.5) return

        // Áp lực ở vị trí mới: hậu vệ gần nhất tới đó (họ cũng di chuyển ~0.8s).
        const pressure = opponents.reduce((min, opponent) => {
            if (!opponent.active || opponent.item.role === 'GK') return min

            return Math.min(min, Math.hypot(opponent.x - target.x, opponent.z - target.z))
        }, Infinity)
        const pressureFactor = clamp((pressure - 1.2) / 3.3, 0.35, 1)
        const shot = evaluateShot({ position: target }, direction, opponents, skills) * pressureFactor

        if (!best || shot > best.shot) best = { dirX: dir.x, dirZ: dir.z, kind: dir.kind, shot, target, pressure }
    })

    if (!best) return null

    const control = clamp(skills.control ?? 0.5, 0, 1.2)
    const composure = clamp(skills.composure ?? 0.5, 0, 1.2)
    const gain = best.shot - now
    const needGain = 0.1 - control * 0.04 - composure * 0.02

    if (best.shot < 0.3 || gain < needGain) return null

    return { ...best, now, gain }
}

// Chuyền ra biên / về sau từ trung lộ trước vòng cấm bị trừ điểm, trừ khi
// người nhận ở trong vòng cấm (cơ hội tốt hơn).
export function penaliseRetreatPasses(options, position, direction) {
    const advance = position.z * direction

    if (advance < 24 || Math.abs(position.x) > 13) return options

    return options
        .map((option) => {
            if (option.inBox) return option

            const wider = option.targetX != null && Math.abs(option.targetX) > Math.abs(position.x) + 6
            const backwards = option.progress < -1

            return wider || backwards ? { ...option, value: option.value * (backwards ? 0.7 : 0.78), retreat: true } : option
        })
        .sort((a, b) => b.value - a.value)
}

// Chấm điểm mọi lựa chọn chuyền bóng. Trả về danh sách đã sắp xếp (tốt nhất trước).
function evaluatePasses(ctx, ownerId, ownerItem, owner, direction, tactic, { allowKeeper }) {
    const options = []
    const ownerAdvance = owner.position.z * direction
    // Phase 29F: Long passing (0..1) — chuyền dài, đổi cánh, phát động phản công.
    const longSkill = Math.min(1.2, skill01(attr(ownerItem, 'longPassing')))
    const visionSkill = Math.min(1.2, skill01(attr(ownerItem, 'vision')))

    const consider = (kind) => {
        listPassCandidates(ctx, ownerId, kind).forEach((candidate) => {
            if (candidate.item.role === 'GK' && !(allowKeeper && kind === 'pass')) return

            // Phase 20: không chuyền cho đồng đội đang việt vị.
            if (candidate.offside) return

            const distance = candidate.distance
            const progress = candidate.forwardGap
            const open = candidate.nearestOpponent

            if (kind === 'pass' && (distance < 4 || distance > 26)) return
            // Phase 29F: người có Vision / Long passing tốt chọc khe xa hơn (tới 38m).
            if (kind === 'through' && (distance < 8 || distance > 30 + visionSkill * 8 || progress < 5)) return
            if (kind === 'lob' && (distance < 15 || distance > 40 + longSkill * 8)) return

            // Bóng bổng kém chính xác hơn: rơi xuống còn nảy, dễ bị tranh.
            // Phase 29F: bóng bổng bay qua đầu người nên đường chuyền ít quan
            // trọng hơn; độ an toàn theo Long passing (trước đây tối đa 0.62,
            // gần như không bao giờ đạt ngưỡng an toàn → AI chỉ chuyền ngắn).
            const lane =
                kind === 'lob'
                    ? (0.56 + longSkill * 0.18) * clamp(0.6 + candidate.laneSlack * 0.2, 0.5, 1)
                    : clamp(0.5 + candidate.laneSlack * 0.45, 0, 1)

            // Chọc khe: người nhận phải tới điểm rơi trước hậu vệ gần nhất.
            if (kind === 'through') {
                const run = distance2D(candidate.object.position, candidate.targetPosition)
                const velocity = ctx.state.velocities[candidate.item.id] || { x: 0, z: 0 }
                // Người nhận đang chạy lên có đà sẵn; hậu vệ phải quay người đuổi.
                const moving = velocity.z * direction > 3

                if (open < run + (moving ? 0.3 : 1.5)) return
            }

            const targetAdvance = candidate.targetPosition.z * direction
            const inBox = targetAdvance > 36 && Math.abs(candidate.targetPosition.x) < 14

            // Người nhận bị kèm sát (< 2m) là lựa chọn tồi: nhận bóng xong mất ngay.
            // Phase 29F: bóng bổng ngoài vòng cấm rơi xuống còn nảy → người nhận
            // phải trống hơn (≥ 6.5m mới an toàn tối đa).
            const safety = kind === 'lob' && !inBox
                ? lane * clamp((open - 2) / 4.5, 0.15, 1)
                : lane * clamp((open - 1) / 3.5, 0.15, 1)

            // Đổi cánh: chuyền dài sang người trống ở cánh bên kia.
            const switchPlay =
                kind === 'lob' &&
                !inBox &&
                Math.abs(candidate.targetPosition.x - owner.position.x) > 20 &&
                progress > 0 &&
                open > 8

            // Bóng bổng về phía sau không có ý nghĩa; chuyền dài ngoài vòng cấm
            // chỉ khi người nhận thật sự trống (bóng rơi xuống còn nảy).
            if (kind === 'lob' && !inBox && !switchPlay && (progress < 8 || open < 5.5 - longSkill)) return

            const progressTerm =
                progress >= 0
                    ? (clamp(progress, 0, 28) / 28) * (0.5 + tactic.directness * 0.5)
                    : (clamp(progress, -15, 0) / 15) * 0.3

            // Không chuyền ngang/về trong 1/3 sân nhà nếu không cần.
            const ownThirdPenalty =
                targetAdvance < -30 && ownerAdvance > targetAdvance ? 0.12 : 0

            // Phase 29F: chuyền dài có giá trị hơn với người chuyền dài giỏi và
            // lối đá trực diện (Counter Attack, Attacking); đổi cánh có thưởng;
            // chọc khe dài (≥ 22m) cho tiền đạo đang chạy = phản công.
            const longBonus =
                kind === 'lob' && !inBox
                    ? longSkill * 0.03 + (switchPlay ? 0.02 + longSkill * 0.04 : 0)
                    : kind === 'through' && distance >= 22
                        ? visionSkill * 0.06 + tactic.directness * 0.05
                        : 0

            const value =
                safety *
                (0.3 +
                    progressTerm +
                    (inBox ? 0.25 : 0) +
                    (kind === 'through' ? 0.08 : 0) -
                    (kind === 'lob' && !inBox ? 0.14 - tactic.directness * 0.08 : 0) +
                    longBonus -
                    ownThirdPenalty)

            // Vision (Phase 19): cầu thủ nhìn bao quát tốt mới thấy và dám
            // thực hiện đường chọc khe / chuyền dài.
            // Phase 29F: chuyền dài ngoài vòng cấm vẫn là lựa chọn "mạo hiểm":
            // ×0.75 (Long passing 40) → ×0.9 (99), để khoảng 1/6 số đường chuyền.
            const visionFactor =
                (kind === 'pass' ? 1 : 0.65 + skill01(attr(ownerItem, 'vision')) * 0.35) *
                (kind === 'lob' && !inBox ? 0.75 + Math.min(1, longSkill) * 0.15 : 1)

            options.push({
                kind,
                receiverId: candidate.item.id,
                distance,
                blockedLane: candidate.blockedLane,
                laneSlack: candidate.laneSlack,
                safety,
                progress,
                inBox,
                switchPlay,
                targetX: candidate.targetPosition.x,
                open,
                value: value * visionFactor,
            })
        })
    }

    consider('pass')
    consider('through')
    consider('lob')

    return options.sort((a, b) => b.value - a.value)
}

// Hướng rê bóng thoáng nhất (vector đơn vị) + điểm số của hướng đó.
function chooseDribbleDirection(owner, direction, opponents, carry) {
    const advance = owner.position.z * direction

    // Hướng cơ sở: tiến lên, hơi bó vào trung lộ; vào 1/3 cuối sân thì hướng
    // thẳng tới khung thành.
    let baseX
    let baseZ

    if (advance > 22) {
        baseX = clamp(-owner.position.x * 0.5, -6, 6)
        baseZ = (direction * FIELD.lineZ - owner.position.z) || direction
    } else {
        baseX = (clamp(owner.position.x * 0.72, -18, 18) - owner.position.x) * 0.6
        baseZ = direction * 9
    }

    const baseLength = Math.hypot(baseX, baseZ) || 1

    baseX /= baseLength
    baseZ /= baseLength

    let best = null

    DRIBBLE_ANGLES.forEach((angle) => {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const dx = baseX * cos - baseZ * sin
        const dz = baseX * sin + baseZ * cos

        let score = cos

        opponents.forEach((opponent) => {
            if (!opponent.active) return

            const relX = opponent.x - owner.position.x
            const relZ = opponent.z - owner.position.z
            const along = relX * dx + relZ * dz
            const lateral = Math.abs(relX * dz - relZ * dx)

            if (along > -0.6 && along < 7) {
                score -= Math.max(0, 1 - lateral / 2.4) * (1.5 - along / 7)
            }
        })

        // Không rê ra ngoài sân.
        const aheadX = owner.position.x + dx * 5
        const aheadZ = owner.position.z + dz * 5

        if (Math.abs(aheadX) > FIELD.maxX - 2) score -= 1.2
        if (Math.abs(aheadZ) > FIELD.maxZ - 1.5) score -= 1.2

        // Giữ hướng cũ một chút để không lắc qua lắc lại.
        score += 0.22 * (dx * carry.dirX + dz * carry.dirZ)

        if (!best || score > best.score) {
            best = { x: dx, z: dz, score }
        }
    })

    return best
}

function dribble(ctx, ownerItem, owner, carry, speedScale, dt) {
    if (!carry.dirX && !carry.dirZ) return

    moveAIPlayer(
        ctx,
        ownerItem,
        {
            x: owner.position.x + carry.dirX * 6,
            z: owner.position.z + carry.dirZ * 6,
        },
        speedScale,
        dt,
    )
}

function passTo(ctx, ownerId, option) {
    return kickFromPlayer(ctx, ownerId, option.kind, true, {
        receiverId: option.receiverId,
        variant: passVariant(ctx, ownerId, option),
    })
}

// ---- Máy dùng tổ hợp phím kiểu FO4 ----
// Chuyền: chọc khe bổng (QW) khi đường bóng sệt bị chắn, chuyền căng (ZS / ZW)
// khi đường chuyền dài và thoáng, tạt căng (ZA) từ biên.
function passVariant(ctx, ownerId, option) {
    const item = getPlayer(ctx, ownerId)
    const skill = skill01(attr(item, option.kind === 'lob' ? 'longPassing' : 'shortPassing'))
    const roll = Math.random()

    if (option.kind === 'through') {
        if (option.blockedLane >= 1 && roll < 0.55) return 'lobbed'
        // Phase 29F: chọc khe dài qua đầu hàng thủ (bóng bổng ra sau lưng).
        if (option.distance > 22 && roll < 0.15 + skill01(attr(item, 'longPassing')) * 0.3) return 'lobbed'
        if (option.distance > 16 && option.laneSlack > 1.5 && roll < 0.3 + skill * 0.2) return 'driven'
        return null
    }

    if (option.kind === 'pass') {
        return option.distance > 17 && option.laneSlack > 1.5 && roll < 0.25 + skill * 0.15 ? 'driven' : null
    }

    if (option.kind === 'lob' && option.inBox) return roll < 0.35 ? 'whipped' : null
    // Phase 29F: đổi cánh căng (ZA) khi người chuyền dài giỏi.
    if (option.kind === 'lob' && option.switchPlay) return roll < skill * 0.4 ? 'whipped' : null

    return null
}

// Sút: lốp khi thủ môn đã rời vạch vôi xa, sút xoáy vào góc xa từ rìa vòng
// cấm, đôi khi sút má ngoài / sút chìm. Chỉ số Finishing / Long shots càng cao
// càng hay dùng kỹ thuật.
function shootWithVariant(ctx, ownerId, ownerItem, owner) {
    const { state, objects } = ctx
    const direction = attackDir(state, ownerItem.teamId)
    const goalZ = direction * FIELD.lineZ
    const distance = Math.hypot(owner.position.x, goalZ - owner.position.z)
    const enemy = ownerItem.teamId === 'blue' ? 'red' : 'blue'
    const keeper = ctx.players.find((item) => item.teamId === enemy && item.role === 'GK')
    const keeperObject = keeper ? objects[keeper.id] : null
    const keeperOffLine = keeperObject ? FIELD.lineZ - Math.abs(keeperObject.position.z) : 0
    const technique = skill01(attr(ownerItem, distance > 18 ? 'longShots' : 'finishing'))
    const roll = Math.random()

    let variant = null

    if (keeperOffLine > 5.5 && distance > 12 && distance < 28 && roll < 0.35 + technique * 0.25) {
        variant = 'chip'
    } else if (distance > 13 && distance < 27 && Math.abs(owner.position.x) > 3 && roll < 0.25 + technique * 0.2) {
        variant = 'finesse'
    } else if (distance > 14 && roll > 0.93) {
        variant = 'trivela'
    } else if (distance < 16 && roll > 0.8) {
        variant = 'low'
    }

    return kickFromPlayer(ctx, ownerId, 'shoot', true, { variant })
}

// Thủ môn AI phát bóng sau khi bắt được: ném tay cho đồng đội trống ở
// khoảng 8–30m, không có thì phát bóng dài bằng chân.
function distributeFromHands(ctx, keeperId) {
    const { state } = ctx
    const target = listPassCandidates(ctx, keeperId, 'pass')[0]
    const open =
        target &&
        target.item.role !== 'GK' &&
        target.distance >= 8 &&
        target.distance <= 30 &&
        target.nearestOpponent > 4 &&
        target.laneSlack > 0.3

    const kicked = kickFromPlayer(ctx, keeperId, open ? 'pass' : 'lob', true, {
        receiverId: open ? target.item.id : null,
    })

    state.timers.aiDecisionCooldown = kicked ? 1.5 : 0.5
}

export function updateCarrierAI(ctx, dt) {
    const { state, objects } = ctx
    const ownerId = state.possession
    const owner = ownerId ? objects[ownerId] : null
    const ownerItem = ownerId ? getPlayer(ctx, ownerId) : null

    if (!owner || !ownerItem) return

    const keeperHolding = state.keeperHands === ownerId

    // Người chơi điều khiển: AI không quyết định thay, trừ khi thủ môn BLUE
    // ôm bóng quá lâu (người chơi không bấm phát bóng) → tự phát bóng.
    if (ownerId === ctx.selectedId && !keeperHolding) return

    // Đang vung chân / đang che bóng / mất đà: chờ.
    if (state.windup || state.shieldingId === ownerId || isPlayerLocked(state, ownerId)) return

    const carry = state.carry?.id === ownerId
        ? state.carry
        : (state.carry = { id: ownerId, time: 0, decideIn: 0, dirX: 0, dirZ: 0 })

    if (keeperHolding) {
        if (state.timers.aiDecisionCooldown > 0) return

        // Thủ môn BLUE: chờ người chơi phát bóng (5s), hoặc 1.5s nếu người chơi
        // đã chuyển sang điều khiển cầu thủ khác.
        if (ownerItem.teamId === 'blue' && !ctx.autoPlay) {
            const wait = ownerId === ctx.selectedId ? KEEPER_HOLD_LIMIT : 1.5

            if ((state.keeperHoldTime || 0) < wait) return
        }

        distributeFromHands(ctx, ownerId)
        return
    }

    // AI thực hiện tình huống cố định (Phase 20): ném biên, phạt góc, phát
    // bóng lên, đá phạt, phạt đền.
    if (state.restart && state.restart.playerId === ownerId) {
        if (state.timers.aiDecisionCooldown > 0) return

        takeRestart(ctx, ownerId, ownerItem, owner, state.restart)
        state.timers.aiDecisionCooldown = 1.2
        return
    }

    // Vừa giao bóng / đá phạt: chờ một nhịp cho đồng đội vào vị trí.
    if (state.timers.aiDecisionCooldown > 0 && carry.time < 0.05) return

    const direction = attackDir(state, ownerItem.teamId)
    const tactic = teamTactic(ctx, ownerItem.teamId)
    const speedScale = carry.sprint ? SPRINT_SCALE : CONTROL_SCALE

    carry.decideIn -= dt

    if (carry.decideIn > 0 || state.timers.aiDecisionCooldown > 0) {
        // Giữa hai lần quyết định: tiếp tục rê theo hướng đã chọn.
        dribble(ctx, ownerItem, owner, carry, speedScale, dt)
        return
    }

    // Phase 26C: độ khó — AI đối thủ (red) quyết định nhanh / chậm hơn.
    carry.decideIn =
        (DECIDE_MIN + Math.random() * DECIDE_JITTER) *
        (ownerItem.teamId === 'red' ? ctx.aiSpeed || 1 : 1)

    const opponents = opponentsNear(ctx, ownerItem, owner, 28)
    const pressers = opponents.filter((opponent) => opponent.active)
    const nearest = pressers[0]?.distance ?? Infinity
    const close = nearest < CLOSE_PRESSURE
    const near = nearest < NEAR_PRESSURE
    const advance = owner.position.z * direction
    const role = ownerItem.role

    // ---- 1. Sút ----
    // Phase 29F: Long shots → tầm sút; Composure (quyết đoán) → dám sút khi
    // có góc thay vì chuyền thêm một nhịp, bị áp sát vẫn sút.
    const composure = Math.min(1.2, skill01(attr(ownerItem, 'composure')))
    const shot = evaluateShot(owner, direction, opponents, {
        longSkill: skill01(attr(ownerItem, 'longShots')),
        composure,
    })
    const goalDistance = Math.hypot(owner.position.x, direction * FIELD.lineZ - owner.position.z)
    const inShootingZone = goalDistance < 17
    // Áp sát làm người kém bản lĩnh ngại sút (0.8 ở Composure 0, 1 ở 99).
    const nerve = close ? 0.8 + Math.min(1, composure) * 0.2 : 1
    const shootThreshold =
        0.5 - tactic.risk * 0.08 - (inShootingZone ? composure * 0.07 : 0) - (role === 'FW' ? composure * 0.03 : 0)

    if (shot * nerve > shootThreshold) {
        if (shootWithVariant(ctx, ownerId, ownerItem, owner)) return
    }

    // ---- 2. Chuyền ----
    // Phase 30B: chuyền ra biên / về sau từ trung lộ trước vòng cấm bị trừ điểm.
    const options = penaliseRetreatPasses(
        evaluatePasses(ctx, ownerId, ownerItem, owner, direction, tactic, {
            allowKeeper: (close || role === 'DF') && advance < -5,
        }),
        owner.position,
        direction,
    )

    const minSafety = 0.62 - tactic.risk * 0.14
    const best = options.find((option) => option.safety >= minSafety) || null

    // Phase 29F: trong vòng cấm có góc sút tạm được: so cú sút (nhân theo
    // Composure) với đường chuyền tốt nhất — tiền đạo quyết đoán tự dứt điểm
    // thay vì chuyền vòng vo tới tận khung thành.
    if (inShootingZone && shot * nerve > 0.28 && role !== 'GK' && role !== 'DF') {
        const decisive = shot * nerve * (1 + composure * 0.7 + (role === 'FW' ? 0.15 : 0))

        if (!best || decisive > best.value) {
            if (shootWithVariant(ctx, ownerId, ownerItem, owner)) return
        }
    }

    // ---- Phase 30B: dẫn thêm một nhịp vào vị trí sút đẹp ----
    if (role !== 'GK' && (role !== 'DF' || advance > 30)) {
        const skills = {
            longSkill: skill01(attr(ownerItem, 'longShots')),
            composure,
            control: (skill01(attr(ownerItem, 'ballControl')) + skill01(attr(ownerItem, 'agility'))) / 2,
        }
        const vision = Math.min(1.2, skill01(attr(ownerItem, 'vision')))
        const planActive = carry.plan && carry.time < carry.plan.until &&
            !laneBlocked(owner.position, carry.plan.dirX, carry.plan.dirZ, 3, pressers)
        const plan = planActive ? carry.plan : planCarry(owner.position, direction, pressers, skills, chooseDribbleDirection(owner, direction, pressers.slice(0, 6), carry))

        if (plan) {
            // Đồng đội trống trong vòng cấm với cơ hội tốt hơn hẳn → vẫn chuyền
            // (Vision cao nhận ra sớm hơn).
            const better = options.find((option) =>
                option.inBox && option.safety >= minSafety && option.open > 3.5 &&
                option.value * (0.9 + vision * 0.25) > plan.shot * 1.1,
            )

            if (better && passTo(ctx, ownerId, better)) {
                carry.plan = null
                return
            }

            if (!planActive) carry.plan = { dirX: plan.dirX, dirZ: plan.dirZ, kind: plan.kind, shot: plan.shot, until: carry.time + PLAN_HOLD }
            carry.dirX = carry.plan.dirX
            carry.dirZ = carry.plan.dirZ
            carry.sprint = (pressers[0]?.distance ?? Infinity) > 6
            dribble(ctx, ownerItem, owner, carry, carry.sprint ? SPRINT_SCALE : CONTROL_SCALE, dt)
            return
        }

        carry.plan = null
    }

    // Tạt bóng: ở biên trong 1/3 cuối sân, có đồng đội trong vòng cấm.
    const wide = Math.abs(owner.position.x) > 13 && advance > 32
    const cross = wide
        ? options.find(
            (option) => option.kind === 'lob' && option.inBox && option.safety > 0.3,
        ) || options.find(
            (option) => option.inBox && option.safety >= minSafety,
        )
        : null

    if (cross && (near || advance > 45 || Math.random() < 0.35)) {
        if (passTo(ctx, ownerId, cross)) return
    }

    // Thời gian giữ bóng thoải mái; quá mức này thì càng lúc càng muốn chuyền.
    const holdTime =
        role === 'GK'
            ? 0.3
            : role === 'DF'
                ? 1.4
                : role === 'MF'
                    ? 2.8 - tactic.tempo * 1.4
                    : 3.4 - tactic.tempo * 1.2

    // So sánh giá trị: chuyền cho lựa chọn tốt nhất hay tự rê bóng tiếp.
    // Rê bóng có giá trị cao khi phía trước thoáng, thấp khi bị áp sát.
    const choice = chooseDribbleDirection(owner, direction, pressers.slice(0, 6), carry)

    let dribbleValue =
        clamp(0.24 + 0.3 * choice.score, 0.05, 0.58) *
        pressureFactor(nearest) *
        (role === 'DF' ? 0.8 : 1) -
        Math.max(0, carry.time - holdTime) * 0.15

    if (role === 'GK') dribbleValue = 0

    if (best && best.value > dribbleValue && passTo(ctx, ownerId, best)) return

    // ---- 3. Bị áp sát mà không có đường chuyền ----
    if (close && !best) {
        if (shot > 0.25 && shootWithVariant(ctx, ownerId, ownerItem, owner)) return

        // Sát khung thành nhà: phá bóng lên.
        if (advance < -30 || role === 'GK') {
            if (kickFromPlayer(ctx, ownerId, 'lob', true, { clearance: true })) return
        }

        if (
            state.timers.shieldCooldown <= 0 &&
            (pressers[1]?.distance ?? Infinity) > 4 &&
            Math.random() < 0.6
        ) {
            startAiShield(state, ownerId, 0.6 + Math.random() * 0.6)
            return
        }
    }

    // Thủ môn có bóng trong chân mà chưa có đường chuyền: phá bóng.
    if (role === 'GK' && carry.time > 0.8) {
        if (kickFromPlayer(ctx, ownerId, 'lob', true, { clearance: true })) return
    }

    // ---- 4. Rê bóng ----
    carry.dirX = choice.x
    carry.dirZ = choice.z
    // Trống trải thì tăng tốc (bóng xa chân hơn, dễ bị cắt hơn nếu có người).
    // (điểm của hướng rê chỉ bị trừ bởi đối thủ ở PHÍA TRƯỚC, nên bị đuổi
    // từ phía sau khi đã thoát xuống thì vẫn bứt tốc.)
    const throughOnGoal = !pressers.some(
        (opponent) =>
            opponent.item.role !== 'GK' &&
            opponent.z * direction > owner.position.z * direction + 1,
    )

    carry.sprint = choice.score > 0.75 && (nearest > 7 || throughOnGoal)

    dribble(ctx, ownerItem, owner, carry, carry.sprint ? SPRINT_SCALE : CONTROL_SCALE, dt)
}

// ---- Phase 20: máy thực hiện tình huống cố định ----
function takeRestart(ctx, ownerId, ownerItem, owner, restart) {
    const { state } = ctx
    const attempt = (action, options) => kickFromPlayer(ctx, ownerId, action, true, options)

    if (restart.type === 'throw-in') {
        if (!attempt('pass')) attempt('lob')
        return
    }

    // Giao bóng (Phase 22): chuyền cho người đứng cạnh, thỉnh thoảng chuyền về.
    if (restart.type === 'kick-off') {
        if (restart.partnerId && Math.random() < 0.8 && attempt('pass', { receiverId: restart.partnerId })) return
        if (!attempt('pass')) attempt('lob')
        return
    }

    if (restart.type === 'penalty') {
        attempt('shoot')
        return
    }

    if (restart.type === 'corner') {
        // Phần lớn tạt vào vòng cấm, thỉnh thoảng đá ngắn.
        if (Math.random() < 0.2 && attempt('pass')) return

        // Phase 37: tạt vào giữa vòng cấm cho người đánh đầu (ball.js → cornerTarget).
        const target = cornerTarget(ctx, ownerId)

        if (target && attempt('lob', { receiverId: target.item.id })) return
        if (!attempt('lob')) attempt('pass')
        return
    }

    if (restart.type === 'goal-kick') {
        // Có hậu vệ trống ở gần thì chuyền ngắn, không thì phát dài.
        const short = listPassCandidates(ctx, ownerId, 'pass')
            .find((entry) => entry.item.role !== 'GK' && entry.distance < 28 && entry.laneSlack > 2 && entry.nearestOpponent > 6)

        if (short && Math.random() < 0.6 && attempt('pass', { receiverId: short.item.id })) return
        if (!attempt('lob')) attempt('lob', { clearance: true })
        return
    }

    // Đá phạt: trong tầm (≤ 27m, không quá góc hẹp) thì sút, gần vòng cấm thì
    // tạt, còn lại chuyền.
    const direction = attackDir(state, ownerItem.teamId)
    const goalZ = direction * FIELD.lineZ
    const goalDistance = Math.hypot(owner.position.x, goalZ - owner.position.z)

    if (!restart.indirect && goalDistance < 27 && Math.abs(owner.position.x) < 18 && Math.random() < 0.7) {
        attempt('shoot')
        return
    }

    if (goalDistance < 40 && Math.random() < 0.6 && attempt('lob')) return
    if (!attempt('pass')) attempt('lob', { clearance: true })
}
