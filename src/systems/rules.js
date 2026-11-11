import { FIELD, clamp } from './constants'
import {
    facingFor,
    homePosition,
    ownGoalSign,
    teamDefendingSide,
} from './matchState'
import { clearPlayerStates } from './playerState'
import { placeBall, teamPlayers } from './ball'
import { recordPlayer, recordTeam } from './matchStats'

const otherTeam = (teamId) => (teamId === 'blue' ? 'red' : 'blue')

function placeAllAtHome(ctx) {
    const { state, objects } = ctx

    ctx.players.forEach((item) => {
        const object = objects[item.id]
        if (!object) return

        const home = homePosition(state, item)

        object.position.set(home.x, 0, home.z)
        object.rotation.y = facingFor(state, item.teamId)
    })
}

export function resetPositions(ctx, kickoffTeam = 'blue') {
    const { state, objects } = ctx

    placeAllAtHome(ctx)

    // Tự chọn cầu thủ tấn công gần giữa sân, không phụ thuộc ID cố định.
    const kickoffItem =
        ctx.players
            .filter((item) => item.teamId === kickoffTeam && item.role !== 'GK')
            .sort((a, b) => Math.abs(a.z ?? 0) - Math.abs(b.z ?? 0))[0] ||
        ctx.players.find((item) => item.teamId === kickoffTeam)

    const kickoffObject = kickoffItem ? objects[kickoffItem.id] : null

    if (kickoffObject) {
        kickoffObject.position.set(0, 0, ownGoalSign(state, kickoffTeam) * 1.2)
        kickoffObject.rotation.y = facingFor(state, kickoffTeam)
    }

    placeBall(ctx, 0, 0)

    state.possession = kickoffObject ? kickoffItem.id : null
    state.lastTouchTeam = kickoffTeam
    state.pendingPass = null
    state.charge = null
    state.windup = null
    state.keeperHands = null
    state.keeperPlans = {}
    state.shieldingId = null
    state.shieldAi = null
    state.duel = { key: null, time: 0, cooldown: 0 }
    state.duelSlow = {}
    state.restart = null

    // BLUE giao bóng: người chơi điều khiển luôn cầu thủ giao bóng.
    if (kickoffTeam === 'blue' && kickoffObject) {
        ctx.onSelect(kickoffItem.id)
        ctx.selectedId = kickoffItem.id
    }

    state.timers.tackleCooldown = 0
    state.timers.aiAttemptCooldown = 0
    state.timers.aiDecisionCooldown = 1

    clearPlayerStates(state)
}

export function restartAtSpot(ctx, teamId, restartType, x, z) {
    const { state, objects } = ctx

    placeAllAtHome(ctx)

    const teamList = teamPlayers(ctx, teamId)

    let kicker = null

    if (restartType === 'goal-kick') {
        kicker = teamList.find((item) => item.role === 'GK')
    }

    if (!kicker) {
        kicker = teamList
            .filter((item) => item.role !== 'GK')
            .map((item) => ({ item, object: objects[item.id] }))
            .filter((entry) => entry.object)
            .sort(
                (a, b) =>
                    Math.hypot(a.object.position.x - x, a.object.position.z - z) -
                    Math.hypot(b.object.position.x - x, b.object.position.z - z),
            )[0]?.item
    }

    if (!kicker) return

    const kickerObject = objects[kicker.id]
    if (!kickerObject) return

    let playerX = x
    let playerZ = z
    let rotation = 0

    if (restartType === 'throw-in') {
        playerX = x > 0 ? FIELD.maxX - 1.15 : FIELD.minX + 1.15
        playerZ = clamp(z, FIELD.minZ + 2, FIELD.maxZ - 2)
        rotation = x > 0 ? -Math.PI / 2 : Math.PI / 2
    } else if (restartType === 'corner') {
        playerX = clamp(x, FIELD.minX + 1, FIELD.maxX - 1)
        playerZ = clamp(z, FIELD.minZ + 1, FIELD.maxZ - 1)
        rotation = z < 0 ? 0 : Math.PI
    } else if (restartType === 'goal-kick') {
        playerX = clamp(x, -5, 5)
        playerZ = ownGoalSign(state, teamId) * 47.5
        rotation = facingFor(state, teamId)
    }

    kickerObject.position.set(playerX, 0, playerZ)
    kickerObject.rotation.y = rotation

    placeBall(
        ctx,
        playerX + Math.sin(rotation) * 0.85,
        playerZ + Math.cos(rotation) * 0.85,
    )

    state.possession = kicker.id
    state.lastTouchTeam = teamId
    state.lastToucherId = kicker.id
    state.pendingPass = null
    state.charge = null
    state.windup = null
    state.keeperHands = null
    state.keeperPlans = {}
    state.shieldingId = null
    state.shieldAi = null
    state.duel = { key: null, time: 0, cooldown: 0 }
    state.duelSlow = {}
    state.restart =
        restartType === 'throw-in'
            ? { type: 'throw-in', teamId, playerId: kicker.id }
            : null

    if (teamId === 'blue') {
        ctx.onSelect(kicker.id)
        ctx.selectedId = kicker.id
    }

    state.timers.tackleCooldown = 0
    state.timers.aiAttemptCooldown = 0
    state.timers.aiDecisionCooldown = 1.5
    state.timers.goalCooldown = 2

    clearPlayerStates(state)

    const teamName = teamId === 'blue' ? ctx.userTeamName : ctx.opponentName

    if (restartType === 'throw-in') {
        ctx.onActionMessage(`${teamName} THROW-IN`)
    } else if (restartType === 'corner') {
        ctx.onActionMessage(`${teamName} CORNER KICK`)
    } else {
        ctx.onActionMessage(`${teamName} GOAL KICK`)
    }
}

// Kiểm tra bàn thắng và bóng ra ngoài. Trả về true nếu đã xử lý tình huống
// (bước logic hiện tại nên dừng lại).
export function checkGoalAndOut(ctx) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    if (!ball || state.timers.goalCooldown > 0) return false

    const position = ball.translation()

    const insideGoalMouth =
        Math.abs(position.x) <= FIELD.goalHalfWidth &&
        position.y < FIELD.goalHeight

    if (Math.abs(position.z) > FIELD.lineZ && insideGoalMouth) {
        // Bóng đã qua vạch vôi thì là bàn thắng; việc cứu thua được
        // xử lý trong AI thủ môn trước khi bóng tới khung thành.
        const goalSide = Math.sign(position.z)
        const defendingTeam = teamDefendingSide(state, goalSide)
        const scoringTeam = otherTeam(defendingTeam)

        // Ghi công: người chạm bóng cuối. Nếu là cầu thủ đội phòng ngự → phản lưới.
        const scorer = state.lastToucherId
            ? ctx.byId.get(state.lastToucherId)
            : null
        const goalInfo = {
            scorerId: scorer?.id || null,
            scorerName: scorer?.name || null,
            ownGoal: Boolean(scorer && scorer.teamId !== scoringTeam),
            assistName: null,
        }

        // Thống kê: bàn thắng (không tính phản lưới) + kiến tạo.
        if (!goalInfo.ownGoal) {
            recordTeam(state, scoringTeam, 'onTarget')
            recordPlayer(state, goalInfo.scorerId, 'goals')

            const passerId = state.stats?.lastPasserId

            if (
                passerId &&
                passerId !== goalInfo.scorerId &&
                state.stats.lastPassTeam === scoringTeam
            ) {
                recordPlayer(state, passerId, 'assists')
                goalInfo.assistName = ctx.byId.get(passerId)?.name || null
            }
        }

        if (state.stats) {
            state.stats.lastPasserId = null
            state.stats.lastPassTeam = null
        }

        state.timers.goalCooldown = 4
        resetPositions(ctx, defendingTeam)
        ctx.onGoal(scoringTeam, goalInfo)

        const teamName = scoringTeam === 'blue' ? ctx.userTeamName : ctx.opponentName
        const credit = goalInfo.scorerName
            ? ` - ${goalInfo.scorerName.toUpperCase()}${goalInfo.ownGoal ? ' (OG)' : ''}`
            : ''

        ctx.onActionMessage(`GOAL! ${teamName}${credit}`)

        return true
    }

    // Bóng chỉ ra ngoài khi đã qua hẳn vạch biên.
    const outsideSide =
        Math.abs(position.x) > FIELD.lineX + FIELD.ballRadius &&
        Math.abs(position.z) <= FIELD.lineZ + FIELD.ballRadius

    const outsideEnd =
        Math.abs(position.z) > FIELD.lineZ + FIELD.ballRadius

    const fallenBall = position.y < -2

    if (!outsideSide && !outsideEnd && !fallenBall) return false

    const lastTouch = state.lastTouchTeam
    const oppositeTeam = otherTeam(lastTouch)

    if (fallenBall) {
        restartAtSpot(
            ctx,
            oppositeTeam,
            'throw-in',
            clamp(position.x, FIELD.minX, FIELD.maxX),
            clamp(position.z, FIELD.minZ, FIELD.maxZ),
        )
    } else if (outsideSide) {
        restartAtSpot(ctx, oppositeTeam, 'throw-in', position.x, position.z)
    } else {
        const endSide = Math.sign(position.z)
        const defendingTeam = teamDefendingSide(state, endSide)

        if (lastTouch === defendingTeam) {
            restartAtSpot(
                ctx,
                oppositeTeam,
                'corner',
                clamp(
                    position.x < 0 ? FIELD.minX : FIELD.maxX,
                    FIELD.minX + 1,
                    FIELD.maxX - 1,
                ),
                endSide < 0 ? FIELD.minZ + 0.8 : FIELD.maxZ - 0.8,
            )
        } else {
            restartAtSpot(
                ctx,
                defendingTeam,
                'goal-kick',
                clamp(position.x, -4, 4),
                endSide * 47.5,
            )
        }
    }

    return true
}
