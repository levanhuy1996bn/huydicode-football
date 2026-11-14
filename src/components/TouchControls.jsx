import { useCallback, useEffect, useRef, useState } from 'react'
import { clearTouchVector, setTouchVector } from '../systems/touchInput'

// Phase 29A2 / 29A3: điều khiển cảm ứng kiểu FC Mobile.
//
// - Bên trái: cần điều khiển — "nổi" (hiện đúng chỗ ngón cái chạm) hoặc cố
//   định (Settings). Kéo để chạy (analog 360°, systems/touchInput.js), đồng
//   thời gửi phím mũi tên giả lập (8 hướng) cho những chỗ engine đọc mũi tên.
// - Bên phải: 4 nút tròn (bố cục FC Mobile, xem BUTTONS). Mỗi nút gửi phím bàn
//   phím giả lập (keydown khi chạm, keyup khi nhấc tay) nên engine không phải
//   đổi gì: giữ để lấy lực như phím.
// - Phase 29A3: VUỐT trên nút để ra kiểu khác (mũi tên nhỏ trên viền nút):
//     PASS  ↑  chuyền bổng / tạt (A)
//     THROUGH ↑ chọc khe bổng (Q + W)
//     SHOOT ↑  sút lốp (Q + D) · ← / → sút xoáy (Z + D) · ↓ sút má ngoài (C + D)
//     SPRINT & SKILL ↓ che bóng (C, giữ)
//   Phím bổ trợ Q / Z / C được giữ tới lúc nhả nút (engine đọc lúc lấy lực và
//   lúc sút). Riêng PASS: chờ 0,14 giây xem có vuốt lên không rồi mới bắt đầu
//   lấy lực (S hay A) — chạm nhanh vẫn chuyền ngay khi nhấc tay.
// - Rung nhẹ (Android): chạm nút, mạnh hơn khi sút.

const JOY_RADIUS = 52
const DEAD_ZONE = 0.22
const SWIPE_DISTANCE = 22
const PASS_DECIDE_MS = 140
const TAP_TIME = 220
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

const KEY_NAMES = {
    KeyS: 's', KeyW: 'w', KeyD: 'd', KeyE: 'e', KeyA: 'a', KeyQ: 'q', KeyZ: 'z', KeyC: 'c', KeyX: 'x', ShiftLeft: 'Shift', Space: ' ',
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

// swipes: hướng vuốt → { replace: phím thay phím chính } | { modifier: phím giữ thêm }.
// haptic: ms rung khi nhả (đá bóng / tắc).
const BUTTONS = {
    attack: [
        { id: 'pass', code: 'KeyS', label: 'PASS', className: 'touch-btn--pass', decide: true, swipes: { up: { replace: 'KeyA', label: 'LOB' } }, haptic: 12 },
        { id: 'through', code: 'KeyW', label: 'THROUGH', className: 'touch-btn--through', swipes: { up: { modifier: 'KeyQ', label: 'LOBBED' } }, haptic: 12 },
        {
            id: 'top',
            code: 'KeyD',
            label: 'SHOOT',
            className: 'touch-btn--top',
            // Phase 38: nút sút cần vuốt dài hơn mới đổi kiểu sút — ngón cái
            // trượt nhẹ lúc giữ lấy lực từng biến cú sút thường thành sút lốp
            // (bóng bổng, nhẹ, rơi ngay trước thủ môn).
            swipeDistance: 44,
            swipes: {
                up: { modifier: 'KeyQ', label: 'CHIP' },
                left: { modifier: 'KeyZ', label: 'FINESSE' },
                right: { modifier: 'KeyZ', label: 'FINESSE' },
                down: { modifier: 'KeyC', label: 'TRIVELA' },
            },
            haptic: 30,
        },
        { id: 'big', code: 'KeyE', label: 'SPRINT\n& SKILL', className: 'touch-btn--big', swipes: { down: { replace: 'KeyC', label: 'SHIELD' } } },
    ],
    defend: [
        { id: 'pass', code: 'KeyS', label: 'SWITCH', className: 'touch-btn--pass' },
        // Phase 35: giữ PRESS (X) = lao vào người cầm bóng, tì người (như nút
        // "Pressure" của FC Mobile); vuốt ↑ = gọi đồng đội áp sát (W, SUPPORT cũ).
        { id: 'through', code: 'KeyX', label: 'PRESS', className: 'touch-btn--through', swipes: { up: { replace: 'KeyW', label: 'SUPPORT' } }, haptic: 10 },
        { id: 'top', code: 'KeyA', label: 'SLIDE', className: 'touch-btn--top is-defend', haptic: 20 },
        // Giữ = chạy nhanh; chạm nhanh (< 220 ms) = tắc bóng (Space).
        // Phase 35: chạy nhanh bằng Shift (không phải E) — trên máy tính E +
        // mũi tên khi phòng ngự là lao vào lấy bóng, nút to vẫn chỉ là chạy nhanh.
        { id: 'big', code: 'ShiftLeft', tapCode: 'Space', label: 'SPRINT\n& TACKLE', className: 'touch-btn--big is-defend', haptic: 18 },
    ],
}

const ARROW_GLYPH = { up: '▲', down: '▼', left: '◀', right: '▶' }

function swipeDirection(dx, dy, minDistance = SWIPE_DISTANCE) {
    if (Math.hypot(dx, dy) < minDistance) return null

    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
}

export const TOUCH_SIZES = { small: 0.85, medium: 1, large: 1.15 }

export default function TouchControls({
    statsRef,
    blueIds,
    size = 'medium',
    opacity = 0.85,
    joystickMode = 'floating',
    vibration = true,
}) {
    const [joy, setJoy] = useState(null) // { x, y, left, top } gốc cần điều khiển
    const [knob, setKnob] = useState({ x: 0, y: 0 })
    const [attacking, setAttacking] = useState(true)
    const [pressed, setPressed] = useState({}) // id → hướng vuốt ('' = chưa vuốt)
    const joyPointer = useRef(null)
    const heldArrows = useRef(new Set())
    // pointerId → { button, main, modifiers: [], started, timer, x, y, at, swiped }
    const presses = useRef(new Map())
    const zoneRef = useRef(null)
    const fixed = joystickMode === 'fixed'

    const buzz = useCallback((ms) => {
        if (vibration && ms) navigator.vibrate?.(ms)
    }, [vibration])

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
        presses.current.forEach((press) => {
            clearTimeout(press.timer)
            if (press.started) sendKey('keyup', press.main)
            press.modifiers.forEach((code) => sendKey('keyup', code))
        })
        presses.current.clear()
        joyPointer.current = null
        setJoy(null)
        setPressed({})
    }, [setArrows])

    useEffect(() => releaseAll, [releaseAll])

    // Đổi có bóng ↔ phòng ngự giữa chừng: nhả hết nút đang giữ (tránh phím kẹt).
    useEffect(() => {
        presses.current.forEach((press) => {
            clearTimeout(press.timer)
            if (press.started) sendKey('keyup', press.main)
            press.modifiers.forEach((code) => sendKey('keyup', code))
        })
        presses.current.clear()
        setPressed({})
    }, [attacking])

    // ---- Cần điều khiển ----
    const joyCenter = (rect) =>
        fixed ? { x: 28 + 58, y: rect.height - 22 - 58 } : null

    const moveKnob = (event, origin) => {
        let dx = event.clientX - origin.left - origin.x
        let dy = event.clientY - origin.top - origin.y
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

    const onJoyDown = (event) => {
        if (joyPointer.current !== null) return

        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)

        const rect = event.currentTarget.getBoundingClientRect()
        const center = joyCenter(rect)
        const origin = center
            ? { ...center, left: rect.left, top: rect.top }
            : { x: event.clientX - rect.left, y: event.clientY - rect.top, left: rect.left, top: rect.top }

        joyPointer.current = event.pointerId
        setJoy(origin)
        setKnob({ x: 0, y: 0 })

        // Cần cố định: chạm vào đâu cũng tính hướng từ tâm cần ngay.
        if (center) moveKnob(event, origin)
    }

    const onJoyMove = (event) => {
        if (event.pointerId !== joyPointer.current || !joy) return

        event.preventDefault()
        moveKnob(event, joy)
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
    const startMain = (press, code) => {
        press.main = code
        press.started = true
        sendKey('keydown', code)
    }

    const onButtonDown = (button) => (event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)

        const press = {
            button,
            main: button.code,
            modifiers: [],
            started: false,
            timer: null,
            x: event.clientX,
            y: event.clientY,
            at: performance.now(),
            swiped: null,
        }

        presses.current.set(event.pointerId, press)
        setPressed((value) => ({ ...value, [button.id]: '' }))
        buzz(6)

        // PASS: chờ xem có vuốt lên (chuyền bổng) không.
        if (button.decide) {
            press.timer = setTimeout(() => {
                press.timer = null
                if (!press.started) startMain(press, button.code)
            }, PASS_DECIDE_MS)
        } else {
            startMain(press, button.code)
        }
    }

    const onButtonMove = (button) => (event) => {
        const press = presses.current.get(event.pointerId)

        if (!press || press.swiped || !button.swipes) return

        const direction = swipeDirection(event.clientX - press.x, event.clientY - press.y, button.swipeDistance)
        const swipe = direction && button.swipes[direction]

        if (!swipe) return

        press.swiped = direction
        setPressed((value) => ({ ...value, [button.id]: direction }))
        buzz(8)

        if (swipe.replace) {
            if (press.timer) {
                // PASS còn đang chờ: bắt đầu luôn bằng phím thay thế (A).
                clearTimeout(press.timer)
                press.timer = null
                startMain(press, swipe.replace)
            } else if (press.started && press.main !== swipe.replace) {
                // PASS đã bắt đầu lấy lực (S): bỏ cú chuyền đó (không đá) rồi
                // lấy lực chuyền bổng (A). Nút to: thả bứt tốc (E), giữ che bóng (C).
                if (button.decide) window.dispatchEvent(new Event('ufm:cancel-charge'))
                sendKey('keyup', press.main)
                startMain(press, swipe.replace)
            }
        } else if (swipe.modifier) {
            press.modifiers.push(swipe.modifier)
            sendKey('keydown', swipe.modifier)
        }
    }

    const onButtonUp = (button) => (event) => {
        const press = presses.current.get(event.pointerId)

        if (!press) return

        presses.current.delete(event.pointerId)
        setPressed((value) => ({ ...value, [button.id]: undefined }))

        // PASS chạm nhanh (chưa tới lúc quyết định): chuyền ngay.
        if (press.timer) {
            clearTimeout(press.timer)
            press.timer = null
            startMain(press, button.code)
        }

        if (press.started) sendKey('keyup', press.main)

        // Phím bổ trợ nhả sau một nhịp (engine đọc lúc nhả phím chính).
        if (press.modifiers.length) {
            const modifiers = [...press.modifiers]

            setTimeout(() => modifiers.forEach((code) => sendKey('keyup', code)), 60)
        }

        const cancelled = event.type !== 'pointerup'

        // Chạm nhanh trên nút "BỨT TỐC & TẮC BÓNG" = tắc bóng.
        if (!cancelled && button.tapCode && !press.swiped && performance.now() - press.at < TAP_TIME) {
            sendKey('keydown', button.tapCode)
            sendKey('keyup', button.tapCode)
            buzz(button.haptic)
        } else if (!cancelled && button.haptic && !button.tapCode) {
            buzz(button.haptic)
        }
    }

    const buttons = BUTTONS[attacking ? 'attack' : 'defend']
    // Màn hình rất thấp (điện thoại xoay ngang ≤ 440px): nhỏ thêm một chút.
    const scale = (TOUCH_SIZES[size] || 1) * (typeof window !== 'undefined' && window.innerHeight <= 440 ? 0.86 : 1)

    return (
        <div
            className="touch-controls"
            style={{ '--touch-opacity': opacity }}
            onContextMenu={(event) => event.preventDefault()}
        >
            <div
                ref={zoneRef}
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
                    <div className={`touch-joy touch-joy--hint${fixed ? ' is-fixed' : ''}`} aria-hidden="true">
                        <i />
                    </div>
                )}
            </div>

            <div className="touch-buttons" style={{ transform: `scale(${scale})` }}>
                {buttons.map((button) => {
                    const state = pressed[button.id]
                    const swipe = state && button.swipes?.[state]

                    return (
                        <button
                            key={button.id}
                            type="button"
                            className={`touch-btn ${button.className}${state !== undefined ? ' is-pressed' : ''}${swipe ? ' is-swiped' : ''}`}
                            onPointerDown={onButtonDown(button)}
                            onPointerMove={onButtonMove(button)}
                            onPointerUp={onButtonUp(button)}
                            onPointerCancel={onButtonUp(button)}
                            aria-label={button.label.replace('\n', ' ')}
                        >
                            {(swipe ? swipe.label : button.label).split('\n').map((line) => <span key={line}>{line}</span>)}
                            {/* Mũi tên vuốt trên viền nút */}
                            {Object.keys(button.swipes || {}).map((direction) => (
                                <em
                                    key={direction}
                                    className={`touch-btn__arrow touch-btn__arrow--${direction}${state === direction ? ' is-active' : ''}`}
                                    aria-hidden="true"
                                >
                                    {ARROW_GLYPH[direction]}
                                </em>
                            ))}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
