import { FIELD, clamp } from './constants'
import { setPlayerAction, updatePlayerStates } from './playerState'
import { trackVelocities } from './movement'

// ---- Hết hiệp / hết trận (yêu cầu playtest) ----
//
// Hết giờ không dừng trận ngay giữa pha bóng. GameScene báo "đã hết giờ"
// (ctx.whistlePending = 'half' | 'full'), trận đá bù giờ tiếp cho tới khi
// bóng chết: bóng ra ngoài sân (ném biên, phạt góc, phát bóng), có bàn thắng,
// hoặc thủ môn ôm bóng trong tay. Khi đó trọng tài thổi còi:
//   - mọi người dừng lại, bóng đứng yên;
//   - hết hiệp: các cầu thủ đi bộ về phía đường hầm (giữa sân, sát biên);
//   - hết trận: đội thắng ăn mừng (nhảy, giơ tay), đội thua cúi đầu chống gối,
//     hòa thì vỗ tay;
// rồi mới gọi ctx.onWhistleDone(type) để hiện bảng nghỉ giữa hiệp / kết quả.

export const WHISTLE_DURATION = { half: 2.8, full: 4 }

// Vị trí "đường hầm": giữa sân, sát đường biên phía camera không nhìn thấy.
const TUNNEL = { x: FIELD.minX + 1, z: 0 }
const WALK_SPEED = 2.4

// Bóng đã chết chưa (gọi ở đầu mỗi bước khi đang chờ còi).
export function isDeadBall(state) {
    return Boolean(state.deadBall || state.restart || state.pendingRestart || state.keeperHands)
}

export function startWhistle(ctx, type) {
    const { state } = ctx
    const ball = ctx.ballRef.current

    state.whistle = { type, time: 0, celebrated: false, done: false }
    state.charge = null
    state.windup = null
    state.pendingPass = null
    state.shieldingId = null

    if (ball) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    ctx.onActionMessage(type === 'half' ? 'HALF TIME' : 'FULL TIME')
    ctx.onWhistle?.(type)
}

function celebrate(ctx) {
    const { state } = ctx
    const score = state.score || { blue: 0, red: 0 }
    const winner = score.blue === score.red ? null : score.blue > score.red ? 'blue' : 'red'

    ctx.players.forEach((item, index) => {
        let action = 'clap'

        if (winner) action = item.teamId === winner ? 'celebrate' : 'dejected'

        // Lệch nhịp một chút để cả đội không nhảy cùng lúc.
        const entry = state.playerStates[item.id]
        const duration = action === 'celebrate' ? 0.9 : action === 'dejected' ? 3.5 : 0.7

        setPlayerAction(state, item.id, action, duration + (index % 4) * 0.08)

        if (entry && action !== 'dejected') entry.elapsed = (index % 5) * 0.12
    })
}

// Một bước trong lúc thổi còi (engine trận đấu tạm dừng).
export function stepWhistle(ctx, dt) {
    const { state, objects } = ctx
    const whistle = state.whistle

    if (!whistle || whistle.done) return

    whistle.time += dt

    const ball = ctx.ballRef.current

    if (ball) ball.setLinvel({ x: 0, y: Math.min(0, ball.linvel().y), z: 0 }, true)

    if (whistle.type === 'half' && whistle.time > 0.6) {
        // Đi bộ về phía đường hầm, giãn cách nhau theo hướng z ban đầu.
        ctx.players.forEach((item) => {
            const object = objects[item.id]

            if (!object) return

            const targetZ = clamp(object.position.z * 0.25, -8, 8)
            const dx = TUNNEL.x - object.position.x
            const dz = targetZ - object.position.z
            const distance = Math.hypot(dx, dz)

            if (distance < 0.5) return

            object.position.x += (dx / distance) * WALK_SPEED * dt
            object.position.z += (dz / distance) * WALK_SPEED * dt
            object.rotation.y = Math.atan2(dx, dz)
        })
    }

    if (whistle.type === 'full' && whistle.time > 0.5) {
        // Lặp lại động tác ăn mừng / vỗ tay khi động tác trước kết thúc.
        const score = state.score || { blue: 0, red: 0 }
        const winner = score.blue === score.red ? null : score.blue > score.red ? 'blue' : 'red'

        if (!whistle.celebrated) {
            whistle.celebrated = true
            celebrate(ctx)
        } else {
            ctx.players.forEach((item) => {
                const entry = state.playerStates[item.id]

                if (entry && entry.time <= 0) {
                    const action = !winner ? 'clap' : item.teamId === winner ? 'celebrate' : 'dejected'

                    setPlayerAction(state, item.id, action, action === 'celebrate' ? 0.9 : action === 'clap' ? 0.7 : 3.5)
                }
            })
        }
    }

    trackVelocities(ctx, dt)
    updatePlayerStates(ctx, dt)

    if (whistle.time >= WHISTLE_DURATION[whistle.type]) {
        whistle.done = true
        ctx.onWhistleDone?.(whistle.type)
    }
}
