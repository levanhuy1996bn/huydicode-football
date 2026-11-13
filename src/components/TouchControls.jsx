import { useCallback, useEffect, useRef, useState } from 'react'
import { clearTouchVector, setTouchVector } from '../systems/touchInput'

// Phase 29A2: điều khiển cảm ứng kiểu FC Mobile.
//
// - Nửa trái màn hình: cần điều khiển "nổi" — hiện ra đúng chỗ ngón cái chạm,
//   kéo để chạy (analog 360°, xem systems/touchInput.js) và đồng thời gửi phím
//   mũi tên giả lập (8 hướng) cho những chỗ engine đọc mũi tên.
// - Bên phải: 4 nút tròn. Mỗi nút gửi phím bàn phím giả lập (keydown khi chạm,
//   keyup khi nhấc tay) nên engine không phải đổi gì: giữ để lấy lực như phím.
//     có bóng:   CHUYỀN (S) · CHỌC KHE (W) · SÚT (D, nút to) · CHẠY (E, giữ)
//     phòng ngự: ĐỔI NGƯỜI (S) · ÉP (W, gọi đồng đội áp sát) · TẮC (Space) · CHẠY (E)
// - Phím giả lập đi qua window → useKeyboard + MatchWorld nhận như bàn phím
//   thật (bấm bất kỳ: lấy lại quyền điều khiển khi máy đang đá thay).

const JOY_RADIUS = 52
const DEAD_ZONE = 0.22
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

const KEY_NAMES = {
    KeyS: 's', KeyW: 'w', KeyD: 'd', KeyE: 'e', Space: ' ',
    ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
}

function sendKey(type, code, repeat = false) {
    window.dispatchEvent(new KeyboardEvent(type, { code, key: KEY_NAMES[code] || code, bubbles: true, cancelable: true, repeat }))
}

// Vector màn hình (sx phải, sy lên) → các mũi tên đang giữ (8 hướng).
function arrowsFor(sx, sy) {
    const length = Math.hypot(sx, sy)

    if (length < DEAD_ZONE) return new Set()

    const angle = Math.atan2(sy, sx) // 0 = phải, π/2 = lên
    const octant = Math.round(angle / (Math.PI / 4))
    const map = {
        0: ['ArrowRight'],
        1: ['ArrowRight', 'ArrowUp'],
        2: ['ArrowUp'],
        3: ['ArrowLeft', 'ArrowUp'],
        4: ['ArrowLeft'],
        [-4]: ['ArrowLeft'],
        [-3]: ['ArrowLeft', 'ArrowDown'],
        [-2]: ['ArrowDown'],
        [-1]: ['ArrowRight', 'ArrowDown'],
    }

    return new Set(map[octant] || [])
}

const BUTTONS = {
    attack: [
        { id: 'sprint', code: 'KeyE', label: 'SPRINT', className: 'touch-btn--sprint' },
        { id: 'pass', code: 'KeyS', label: 'PASS', className: 'touch-btn--pass' },
        { id: 'through', code: 'KeyW', label: 'THROUGH', className: 'touch-btn--through' },
        { id: 'big', code: 'KeyD', label: 'SHOOT', className: 'touch-btn--big' },
    ],
    defend: [
        { id: 'sprint', code: 'KeyE', label: 'SPRINT', className: 'touch-btn--sprint' },
        { id: 'pass', code: 'KeyS', label: 'SWITCH', className: 'touch-btn--pass' },
        { id: 'through', code: 'KeyW', label: 'PRESS', className: 'touch-btn--through' },
        { id: 'big', code: 'Space', label: 'TACKLE', className: 'touch-btn--big is-defend' },
    ],
}

export default function TouchControls({ statsRef, blueIds }) {
    const [joy, setJoy] = useState(null) // { x, y } gốc cần điều khiển (px trong vùng)
    const [knob, setKnob] = useState({ x: 0, y: 0 })
    const [attacking, setAttacking] = useState(true)
    const [pressed, setPressed] = useState({})
    const joyPointer = useRef(null)
    const heldArrows = useRef(new Set())
    const buttonCodes = useRef(new Map()) // pointerId → code đang giữ

    // Có bóng hay đang phòng ngự → nhãn / phím của các nút.
    useEffect(() => {
        const timer = setInterval(() => {
            const state = statsRef?.current

            if (!state) return

            const owner = state.possession
            const team = owner ? (blueIds.has(owner) ? 'blue' : 'red') : state.lastTouchTeam

            setAttacking(team !== 'red' || Boolean(state.restart && blueIds.has(state.restart.playerId)))
        }, 150)

        return () => clearInterval(timer)
    }, [statsRef, blueIds])

    const setArrows = useCallback((next) => {
        const current = heldArrows.current

        ARROWS.forEach((code) => {
            if (current.has(code) && !next.has(code)) sendKey('keyup', code)
            if (!current.has(code) && next.has(code)) sendKey('keydown', code)
        })

        heldArrows.current = next
    }, [])

    // Giữ cần điều khiển lâu một hướng: gửi keydown lặp lại mỗi giây để máy
    // không tưởng là người chơi đã rời tay (Auto Play).
    useEffect(() => {
        if (!joy) return undefined

        const timer = setInterval(() => {
            heldArrows.current.forEach((code) => sendKey('keydown', code, true))
        }, 1000)

        return () => clearInterval(timer)
    }, [joy])

    const releaseAll = useCallback(() => {
        setArrows(new Set())
        clearTouchVector()
        buttonCodes.current.forEach((code) => sendKey('keyup', code))
        buttonCodes.current.clear()
        joyPointer.current = null
        setJoy(null)
        setPressed({})
    }, [setArrows])

    useEffect(() => releaseAll, [releaseAll])

    // ---- Cần điều khiển ----
    const onJoyDown = (event) => {
        if (joyPointer.current !== null) return

        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)

        const rect = event.currentTarget.getBoundingClientRect()

        joyPointer.current = event.pointerId
        setJoy({ x: event.clientX - rect.left, y: event.clientY - rect.top, left: rect.left, top: rect.top })
        setKnob({ x: 0, y: 0 })
    }

    const onJoyMove = (event) => {
        if (event.pointerId !== joyPointer.current || !joy) return

        event.preventDefault()

        let dx = event.clientX - joy.left - joy.x
        let dy = event.clientY - joy.top - joy.y
        const distance = Math.hypot(dx, dy)

        if (distance > JOY_RADIUS) {
            dx = (dx / distance) * JOY_RADIUS
            dy = (dy / distance) * JOY_RADIUS
        }

        setKnob({ x: dx, y: dy })

        const sx = dx / JOY_RADIUS
        const sy = -dy / JOY_RADIUS

        setTouchVector(sx, sy)
        setArrows(arrowsFor(sx, sy))
    }

    const onJoyUp = (event) => {
        if (event.pointerId !== joyPointer.current) return

        joyPointer.current = null
        setJoy(null)
        setKnob({ x: 0, y: 0 })
        clearTouchVector()
        setArrows(new Set())
    }

    // ---- Nút ----
    const onButtonDown = (button) => (event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        buttonCodes.current.set(event.pointerId, button.code)
        setPressed((value) => ({ ...value, [button.id]: true }))
        sendKey('keydown', button.code)
        navigator.vibrate?.(8)
    }

    const onButtonUp = (button) => (event) => {
        const code = buttonCodes.current.get(event.pointerId)

        if (!code) return

        buttonCodes.current.delete(event.pointerId)
        setPressed((value) => ({ ...value, [button.id]: false }))
        sendKey('keyup', code)
    }

    const buttons = BUTTONS[attacking ? 'attack' : 'defend']

    return (
        <div className="touch-controls" onContextMenu={(event) => event.preventDefault()}>
            <div
                className="touch-joy-zone"
                onPointerDown={onJoyDown}
                onPointerMove={onJoyMove}
                onPointerUp={onJoyUp}
                onPointerCancel={onJoyUp}
            >
                {joy ? (
                    <div className="touch-joy" style={{ left: joy.x, top: joy.y }}>
                        <i style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
                    </div>
                ) : (
                    <div className="touch-joy touch-joy--hint" aria-hidden="true">
                        <i />
                    </div>
                )}
            </div>

            <div className="touch-buttons">
                {buttons.map((button) => (
                    <button
                        key={button.id}
                        type="button"
                        className={`touch-btn ${button.className}${pressed[button.id] ? ' is-pressed' : ''}`}
                        onPointerDown={onButtonDown(button)}
                        onPointerUp={onButtonUp(button)}
                        onPointerCancel={onButtonUp(button)}
                        aria-label={button.label}
                    >
                        {button.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
