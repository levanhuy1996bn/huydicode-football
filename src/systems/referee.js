import { FIELD, clamp, distance2D } from './constants'
import { attackDir, ownGoalSign } from './matchState'
import { attr, skill01 } from './attributes'
import { setPlayerAction } from './playerState'
import { recordPlayer, recordTeam } from './matchStats'

// ---- Phase 20: trọng tài — phạm lỗi, thẻ phạt, việt vị ----
//
// Phạm lỗi: mỗi pha tắc / xoạc (người chơi hoặc máy) được "chấm" qua
// judgeChallenge. Khả năng phạm lỗi tăng khi xoạc, khi vào bóng từ sau lưng,
// khi tắc hụt mà vẫn va vào người cầm bóng; giảm theo chỉ số tắc bóng, tăng
// theo Aggression. Lỗi trong vòng cấm đội phòng ngự → phạt đền, ngoài vòng
// cấm → đá phạt trực tiếp tại chỗ phạm lỗi.
// Thẻ: thẻ vàng cho pha vào bóng nguy hiểm (xoạc từ sau lưng hay bị nhất),
// thẻ đỏ trực tiếp hiếm, hai thẻ vàng = thẻ đỏ → cầu thủ rời sân, đội chơi
// thiếu người (xem sendOff).
// Việt vị: lúc bóng rời chân trong một đường chuyền (không tính ném biên,
// phát bóng, phạt góc), ghi lại các đồng đội đang ở vị trí việt vị (phần sân
// đối phương, vượt cả bóng lẫn cầu thủ đứng thứ hai từ dưới lên của đối
// phương). Nếu một trong số họ chạm bóng trước khi đối phương chạm → việt vị,
// đối phương được đá phạt tại chỗ.

const otherTeam = (teamId) => (teamId === 'blue' ? 'red' : 'blue')

// Thời gian bóng chết sau tiếng còi trước khi đặt bóng đá phạt (giây).
export const FOUL_PAUSE = 1.4

// Vòng cấm (16.5m từ vạch vôi, rộng 40.3m).
export const BOX_DEPTH = 16.5
export const BOX_HALF_WIDTH = 20.15
export const PENALTY_SPOT = 11

export function inPenaltyArea(state, teamId, position) {
    const sign = ownGoalSign(state, teamId)

    return (
        Math.abs(position.x) <= BOX_HALF_WIDTH &&
        position.z * sign >= FIELD.lineZ - BOX_DEPTH
    )
}

function teamLabel(ctx, teamId) {
    return teamId === 'blue' ? ctx.userTeamName : ctx.opponentName
}

function surname(item) {
    const parts = String(item?.name || '').trim().split(/\s+/)

    return (parts[parts.length - 1] || 'PLAYER').toUpperCase()
}

// ---- Phạm lỗi ----
// options: { tacklerId, carrierId, type: 'standing'|'slide', won, frontDot }
// Trả về true nếu trọng tài thổi phạt (bóng chết, đá phạt / phạt đền đã được
// lên lịch).
export function judgeChallenge(ctx, options) {
    const { state, objects } = ctx
    const { tacklerId, carrierId, type, won } = options

    if (!tacklerId || !carrierId || state.pendingRestart || state.restart) return false

    const tackler = ctx.byId.get(tacklerId)
    const carrier = ctx.byId.get(carrierId)
    const tacklerObject = objects[tacklerId]
    const carrierObject = objects[carrierId]

    if (!tackler || !carrier || !tacklerObject || !carrierObject) return false
    if (tackler.teamId === carrier.teamId) return false

    const isSlide = type === 'slide'
    const frontDot = options.frontDot ?? 0
    const behind = frontDot < -0.4
    const contact = distance2D(tacklerObject.position, carrierObject.position)

    let chance

    if (won) {
        chance = isSlide ? 0.07 : 0.02
        if (behind) chance *= isSlide ? 4 : 3
    } else {
        // Tắc hụt: chỉ phạm lỗi nếu thật sự chạm tới người cầm bóng.
        if (contact > (isSlide ? 2.6 : 1.25)) return false

        chance = isSlide ? 0.24 : 0.05
        if (behind) chance *= 1.5
    }

    const tackleSkill = attr(tackler, isSlide ? 'slidingTackle' : 'standingTackle')

    chance *= clamp(1.3 - skill01(tackleSkill) * 0.6, 0.7, 1.3)
    chance *= 0.8 + skill01(attr(tackler, 'aggression')) * 0.4
    chance = clamp(chance, 0, 0.85)

    if (Math.random() >= chance) return false

    awardFoul(ctx, { tackler, carrier, carrierObject, isSlide, behind, won })
    return true
}

// Lỗi rõ ràng (ví dụ va người từ sau lưng) — gọi trực tiếp.
function awardFoul(ctx, { tackler, carrier, carrierObject, isSlide, behind }) {
    const { state } = ctx
    const foulTeam = tackler.teamId
    const fouledTeam = carrier.teamId
    const spot = { x: carrierObject.position.x, z: carrierObject.position.z }

    recordTeam(state, foulTeam, 'fouls')
    recordPlayer(state, tackler.id, 'fouls')
    setPlayerAction(state, carrier.id, 'fallen')

    // ---- Thẻ ----
    let yellow = 0.05
    let red = 0

    if (isSlide && behind) {
        yellow = 0.45
        red = 0.03
    } else if (isSlide) {
        yellow = 0.22
        red = 0.005
    } else if (behind) {
        yellow = 0.15
    }

    // Phạm lỗi với người đối mặt khung thành, không còn ai bọc lót (DOGSO).
    if (lastManFoul(ctx, tackler, carrierObject)) {
        red = Math.max(red, 0.35)
        yellow = Math.max(yellow, 0.9)
    }

    let card = null
    const roll = Math.random()

    if (roll < red) card = 'red'
    else if (roll < red + yellow) card = 'yellow'

    const penalty = inPenaltyArea(state, foulTeam, spot)
    const label = teamLabel(ctx, foulTeam)
    let message = `FOUL! ${surname(tackler)} (${label})`

    if (card) {
        const result = giveCard(ctx, tackler, card)

        message += result === 'red'
            ? card === 'red' ? ' · RED CARD!' : ' · SECOND YELLOW - RED CARD!'
            : ' · YELLOW CARD'
    }

    message += penalty ? ' · PENALTY!' : ' · FREE KICK'

    scheduleRestart(ctx, {
        type: penalty ? 'penalty' : 'free-kick',
        teamId: fouledTeam,
        x: spot.x,
        z: spot.z,
        message,
    })
}

function lastManFoul(ctx, tackler, carrierObject) {
    const { state, objects } = ctx
    const sign = ownGoalSign(state, tackler.teamId)
    const carrierDepth = carrierObject.position.z * sign

    // Chỉ khi người bị phạm lỗi ở gần khung thành (≤ 30m) và đang ở trung lộ.
    if (FIELD.lineZ - carrierDepth > 30 || Math.abs(carrierObject.position.x) > 20) return false

    // Không còn cầu thủ (ngoài thủ môn) của đội phạm lỗi đứng giữa người bị
    // phạm lỗi và khung thành.
    return !ctx.players.some((item) => {
        if (item.teamId !== tackler.teamId || item.role === 'GK' || item.id === tackler.id) return false

        const object = objects[item.id]

        return object && object.position.z * sign > carrierDepth + 0.5
    })
}

export function giveCard(ctx, item, card) {
    const { state } = ctx

    state.cards ??= {}

    const entry = state.cards[item.id] ?? (state.cards[item.id] = { yellow: 0, red: false, teamId: item.teamId, name: item.name })

    if (card === 'yellow') {
        entry.yellow += 1
        recordTeam(state, item.teamId, 'yellow')
        ctx.onCard?.({ id: item.id, teamId: item.teamId, name: item.name, card: 'yellow', minute: state.elapsed })

        if (entry.yellow < 2) return 'yellow'
    }

    entry.red = true
    recordTeam(state, item.teamId, 'red')
    ctx.onCard?.({ id: item.id, teamId: item.teamId, name: item.name, card: 'red', minute: state.elapsed })
    sendOff(ctx, item)

    return 'red'
}

// Thẻ đỏ: cầu thủ rời sân, đội chơi thiếu người tới hết trận.
// Gỡ khỏi các danh sách ctx (mọi system đọc các danh sách này mỗi bước),
// đưa ra đường biên và báo cho React (MatchWorld lọc khỏi đội hình).
export function sendOff(ctx, item) {
    const { state, objects } = ctx

    state.sentOff ??= {}
    state.sentOff[item.id] = true

    const remove = (list) => {
        const index = list?.findIndex((entry) => entry.id === item.id) ?? -1

        if (index >= 0) list.splice(index, 1)
    }

    remove(ctx.players)
    remove(ctx.bluePlayers)
    remove(ctx.redPlayers)

    const object = objects[item.id]

    if (object) {
        object.position.set(FIELD.lineX + 4, 0, 0)
        object.visible = false
    }

    if (state.possession === item.id) state.possession = null
    if (state.pendingPass?.receiverId === item.id) state.pendingPass = null

    if (ctx.selectedId === item.id) {
        const next = ctx.bluePlayers.find((entry) => entry.role !== 'GK')

        if (next) {
            ctx.onSelect(next.id)
            ctx.selectedId = next.id
        }
    }

    ctx.onSentOff?.(item.id, item.teamId)
}

// ---- Bóng chết chờ đá phạt ----
// Thổi còi: bóng dừng, mọi người đứng lại một nhịp, rồi mới đặt bóng.
export function scheduleRestart(ctx, restart) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    state.pendingRestart = { ...restart, delay: FOUL_PAUSE }
    state.possession = null
    state.pendingPass = null
    state.charge = null
    state.windup = null
    state.offside = null
    state.shieldingId = null

    if (ball) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    ctx.onActionMessage(restart.message)
}

// ---- Việt vị ----

// Vị trí "vạch việt vị" (theo trục tấn công của teamId): cầu thủ đứng thứ hai
// từ dưới lên của đối phương (thường là hậu vệ cuối, vì thủ môn đứng sâu nhất).
export function offsideLine(ctx, teamId) {
    const { state, objects } = ctx
    const direction = attackDir(state, teamId)
    const depths = ctx.players
        .filter((item) => item.teamId !== teamId && objects[item.id])
        .map((item) => objects[item.id].position.z * direction)
        .sort((a, b) => b - a)

    return depths[1] ?? depths[0] ?? FIELD.lineZ
}

export function isOffsidePosition(ctx, item, object, line, ballDepth) {
    const direction = attackDir(ctx.state, item.teamId)
    const depth = object.position.z * direction

    return depth > 0.3 && depth > line + 0.25 && depth > ballDepth + 0.25
}

// Gọi khi bóng rời chân trong một đường chuyền / cú sút.
export function snapshotOffside(ctx, kickerId, teamId, ballPosition) {
    const { state, objects } = ctx
    const direction = attackDir(state, teamId)
    const line = offsideLine(ctx, teamId)
    const ballDepth = ballPosition.z * direction
    const offsideIds = []

    ctx.players.forEach((item) => {
        if (item.teamId !== teamId || item.id === kickerId) return

        const object = objects[item.id]

        if (object && isOffsidePosition(ctx, item, object, line, ballDepth)) offsideIds.push(item.id)
    })

    state.offside = offsideIds.length ? { teamId, kickId: state.kickId, ids: offsideIds } : null
}

// Gọi trước khi một cầu thủ chạm / khống chế bóng tự do. Trả về true nếu
// thổi việt vị (bóng chết, đối phương đá phạt).
export function checkOffside(ctx, item) {
    const { state, objects } = ctx
    const offside = state.offside

    if (!offside) return false

    // Đối phương đã chạm bóng: hết tình huống việt vị.
    if (item.teamId !== offside.teamId || state.lastTouchTeam !== offside.teamId) {
        state.offside = null
        return false
    }

    if (!offside.ids.includes(item.id)) return false

    const object = objects[item.id]
    const spot = object ? { x: object.position.x, z: object.position.z } : { x: 0, z: 0 }
    const defending = otherTeam(item.teamId)

    recordTeam(state, item.teamId, 'offsides')
    state.offside = null

    scheduleRestart(ctx, {
        type: 'free-kick',
        teamId: defending,
        x: spot.x,
        z: spot.z,
        indirect: true,
        message: `OFFSIDE! ${surname(item)} · ${teamLabel(ctx, defending)} FREE KICK`,
    })

    return true
}

// ---- Hàng rào (đá phạt gần khung thành) ----
// Bóng đá trúng người trong hàng rào thì bật ra (cầu thủ không có va chạm vật lý).
export function updateWallBlock(ctx) {
    const { state, objects } = ctx
    const wall = state.wall
    const ball = ctx.ballRef.current

    if (!wall || !ball) return

    if (state.kickId !== wall.kickId || state.possession) {
        // Bóng chưa rời chân (đang chờ đá) thì giữ; đã có cú đá khác thì bỏ.
        if (state.kickId > wall.kickId) state.wall = null
        return
    }

    wall.time = (wall.time || 0) + 1 / 60

    if (wall.time > 1.2) {
        state.wall = null
        return
    }

    const position = ball.translation()

    if (position.y > 1.95) return

    const hit = wall.ids.find((id) => {
        const object = objects[id]

        return object && Math.hypot(object.position.x - position.x, object.position.z - position.z) < 0.55
    })

    if (!hit) return

    const velocity = ball.linvel()
    const side = Math.random() < 0.5 ? -1 : 1

    ball.setLinvel(
        {
            x: -velocity.x * 0.25 + side * (2 + Math.random() * 3),
            y: 1 + Math.random() * 2,
            z: -velocity.z * 0.3,
        },
        true,
    )

    const item = ctx.byId.get(hit)

    state.lastTouchTeam = item?.teamId || state.lastTouchTeam
    state.lastToucherId = hit
    state.pendingPass = null
    state.wall = null

    ctx.onActionMessage('BLOCKED BY THE WALL!')
}
