
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { shortPlayerName } from '../utils/names'
import { bodyScale } from '../systems/physique'
import {
    applyPose,
    createPose,
    locomotionPose,
    targetPose,
} from '../animation/rig'

const SKIN = '#d9a783'
const HAIR = '#30251f'
const SHOE = '#171c20'
const SOCK = '#f4f4f0'

// Chiều cao khớp hông (gốc của rig). Chân treo dưới hông, thân trên
// xoay quanh eo — để động tác đá không làm nghiêng cả người và ngược lại.
const HIP_HEIGHT = 0.6

// Đang nằm/bay người: không xoay đầu nhìn bóng.
const BUSY_STATES = new Set(['slide', 'fallen', 'diveLow', 'diveMid', 'diveHigh'])

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

// Sau Phase 29E: thẻ tên trên đầu cầu thủ là một <div> thường gắn vào khung
// canvas, vị trí cập nhật mỗi frame. Trước đây dùng <Html> của drei (mỗi thẻ
// một React root riêng): khi cầu thủ rời sân / đổi đối thủ trong lúc canvas
// đang chạy, React 19 báo "synchronously unmount a root while rendering" rồi
// lỗi removeChild khi rời trận. Không còn React root phụ thì không còn lỗi.
function NameTag({ height, number, name, color, selected, labelRef, staminaRef }) {
    const anchor = useRef(null)
    const { gl, camera, size } = useThree()
    const point = useMemo(() => new THREE.Vector3(), [])
    const element = useMemo(() => {
        const wrapper = document.createElement('div')

        wrapper.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:6;will-change:transform'
        wrapper.innerHTML =
            '<div class="player-tag" style="display:none"><b></b><span></span><i class="player-tag__stamina"><s></s></i></div>'
        return wrapper
    }, [])

    useLayoutEffect(() => {
        const target = gl.domElement.parentNode

        target?.appendChild(element)
        labelRef.current = element.firstChild
        staminaRef.current = element.querySelector('s')

        return () => {
            element.parentNode?.removeChild(element)
            labelRef.current = null
            staminaRef.current = null
        }
    }, [gl, element, labelRef, staminaRef])

    useLayoutEffect(() => {
        const tag = element.firstChild

        tag.className = `player-tag${selected ? ' player-tag--selected' : ''}`
        tag.style.setProperty('--tag-color', color)
        tag.querySelector('b').textContent = number ?? ''
        tag.querySelector('span').textContent = name
    }, [element, selected, color, number, name])

    useFrame(() => {
        if (!anchor.current) return

        anchor.current.getWorldPosition(point)
        point.project(camera)

        const x = (point.x * 0.5 + 0.5) * size.width
        const y = (-point.y * 0.5 + 0.5) * size.height

        element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
        element.style.visibility = point.z < 1 ? '' : 'hidden'
    })

    return <group ref={anchor} position={[0, height, 0]} />
}

// Chữ trắng trên áo tối, chữ tối trên áo sáng.
function contrastColor(hex) {
    const color = new THREE.Color(hex)
    const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b

    return luminance > 0.55 ? '#14181c' : '#ffffff'
}

// Texture số áo vẽ bằng canvas (không cần tải font/ảnh).
function useNumberTexture(number, shirtColor) {
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null

        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128

        const context = canvas.getContext('2d')
        const ink = contrastColor(shirtColor)

        context.clearRect(0, 0, 128, 128)
        context.font = '900 92px Inter, Arial, sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.lineWidth = 8
        context.strokeStyle = ink === '#ffffff' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)'
        context.strokeText(String(number ?? ''), 64, 70)
        context.fillStyle = ink
        context.fillText(String(number ?? ''), 64, 70)

        const result = new THREE.CanvasTexture(canvas)
        result.colorSpace = THREE.SRGBColorSpace
        result.anisotropy = 4

        return result
    }, [number, shirtColor])

    useEffect(() => () => texture?.dispose(), [texture])

    return texture
}

export default function Player({
    player,
    teamColor,
    // Phase 24: bộ áo của trận (áo / quần / tất / viền) và bộ thủ môn.
    kit = null,
    keeperKit = null,
    matchState,
    labelMode = 'smart',
    isSelected,
    onSelect,
    onReady,
}) {
    const root = useRef()

    // Các khớp của rig (Phase 15).
    const hips = useRef()
    const torso = useRef()
    const head = useRef()
    const lShoulder = useRef()
    const rShoulder = useRef()
    const lElbow = useRef()
    const rElbow = useRef()
    const lHip = useRef()
    const rHip = useRef()
    const lKnee = useRef()
    const rKnee = useRef()

    const previous = useRef(null)
    const motion = useRef({ phase: 0, amount: 0, time: 0 })
    const poses = useRef(null)

    if (!poses.current) {
        poses.current = {
            current: createPose(),
            target: createPose(),
            locomotion: createPose(),
            scratch: createPose(),
        }
    }

    const goalkeeper =
        player.role === 'GK' ||
        String(player.position || '').toUpperCase() === 'GK' ||
        player.number === 1

    const wear = goalkeeper
        ? keeperKit || { shirt: '#f0c928', shorts: '#242b32', socks: '#f0c928', trim: '#fff1a6' }
        : kit || { shirt: teamColor, shorts: teamColor, socks: SOCK, trim: '#eaf4ff' }
    const shirt = wear.shirt
    const shorts = wear.shorts
    const socks = wear.socks || SOCK
    const trim = wear.trim || '#eaf4ff'
    const hand = goalkeeper ? shirt : SKIN

    const numberTexture = useNumberTexture(player.number, shirt)
    const labelRef = useRef(null)
    const labelVisible = useRef(null)
    const staminaRef = useRef(null)
    const staminaShown = useRef(-1)

    useEffect(() => {
        onReady?.(player.id, root.current)

        return () => onReady?.(player.id, null)
    }, [onReady, player.id])

    useFrame((_, delta) => {
        if (!root.current) return

        // Tên trên đầu: 'all' = mọi cầu thủ, 'smart' = người đang điều khiển,
        // người cầm bóng và người sắp nhận bóng, 'off' = ẩn.
        if (labelRef.current) {
            const show =
                labelMode === 'all' ||
                (labelMode === 'smart' &&
                    (isSelected ||
                        matchState?.possession === player.id ||
                        matchState?.pendingPass?.receiverId === player.id))

            if (labelVisible.current !== show) {
                labelVisible.current = show
                labelRef.current.style.display = show ? 'flex' : 'none'
            }

            // Thanh thể lực dưới tên (Phase 19): xanh > 60, vàng > 35, đỏ.
            const stamina = Math.round(matchState?.stamina?.[player.id] ?? 100)

            if (show && staminaRef.current && staminaShown.current !== stamina) {
                staminaShown.current = stamina
                staminaRef.current.style.width = `${stamina}%`
                staminaRef.current.style.background =
                    stamina > 60 ? '#7ee081' : stamina > 35 ? '#ffd166' : '#ff6b5b'
            }
        }

        const dt = Math.min(delta, 0.05)
        const p = root.current.position

        if (!previous.current) {
            previous.current = { x: p.x, z: p.z }
        }

        // Tốc độ thực (m/s) từ chuyển động của root, làm mượt.
        const rawSpeed =
            Math.hypot(p.x - previous.current.x, p.z - previous.current.z) /
            Math.max(dt, 0.001)

        previous.current.x = p.x
        previous.current.z = p.z

        const m = motion.current
        const targetAmount = clamp(rawSpeed / 7.2, 0, 1)

        m.amount += (targetAmount - m.amount) * Math.min(1, dt * 8)
        m.time += dt
        m.phase += dt * (6.5 + m.amount * 7.5) * (rawSpeed > 6.5 ? 1.1 : 1)

        const entry = matchState?.playerStates?.[player.id]
        const holding =
            matchState?.restart?.type === 'throw-in' &&
            matchState.restart.playerId === player.id
        const keeperHolding = matchState?.keeperHands === player.id
        const shielding = matchState?.shieldingId === player.id
        const jostling = Boolean(
            matchState?.duel?.key && matchState.duel.key.split('|').includes(player.id),
        )

        const pose = poses.current

        locomotionPose(
            {
                phase: m.phase,
                amount: m.amount,
                sprinting: rawSpeed > 6.5,
                dribbling: matchState?.possession === player.id,
                keeper: goalkeeper,
                time: m.time,
            },
            pose.locomotion,
        )

        targetPose({
            entry,
            holding,
            keeperHolding,
            shielding,
            jostling,
            locomotion: pose.locomotion,
            scratch: pose.scratch,
            out: pose.target,
        })

        // Quay đầu nhìn bóng (trừ khi đang nằm/xoạc).
        const ball = matchState?.ballPosition
        const busy = entry && entry.time > 0 && BUSY_STATES.has(entry.state)

        if (ball && !busy) {
            const worldAngle = Math.atan2(ball.x - p.x, ball.z - p.z)
            const relative = Math.atan2(
                Math.sin(worldAngle - root.current.rotation.y),
                Math.cos(worldAngle - root.current.rotation.y),
            )
            const distance = Math.hypot(ball.x - p.x, ball.z - p.z)

            pose.target.headYaw += clamp(relative, -1.1, 1.1) * 0.7 - pose.target.torsoYaw
            pose.target.headPitch += clamp(0.45 - distance * 0.04, 0, 0.4) * 0.6
        }

        applyPose(
            {
                hips: hips.current,
                hipHeight: HIP_HEIGHT,
                torso: torso.current,
                head: head.current,
                lShoulder: lShoulder.current,
                rShoulder: rShoulder.current,
                lElbow: lElbow.current,
                rElbow: rElbow.current,
                lHip: lHip.current,
                rHip: rHip.current,
                lKnee: lKnee.current,
                rKnee: rKnee.current,
            },
            pose.current,
            pose.target,
            dt,
            entry && entry.time > 0 ? 30 : 18,
        )
    })

    const arm = (side, shoulderRef, elbowRef) => (
        <group ref={shoulderRef} position={[side * 0.34, 0.2, 0]}>
            <mesh position={[0, -0.1, 0]} castShadow>
                <capsuleGeometry args={[0.1, 0.18, 5, 8]} />
                <meshStandardMaterial color={shirt} />
            </mesh>

            <group ref={elbowRef} position={[0, -0.25, 0]}>
                <mesh position={[0, -0.11, 0]} castShadow>
                    <capsuleGeometry args={[0.074, 0.17, 5, 8]} />
                    <meshStandardMaterial color={SKIN} />
                </mesh>

                <mesh position={[0, -0.29, 0]} castShadow>
                    <sphereGeometry args={[0.075, 10, 10]} />
                    <meshStandardMaterial color={hand} />
                </mesh>
            </group>
        </group>
    )

    const leg = (side, hipRef, kneeRef) => (
        <group ref={hipRef} position={[side * 0.145, -0.09, 0]}>
            <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.1, 0.14, 5, 9]} />
                <meshStandardMaterial color={SKIN} />
            </mesh>

            <group ref={kneeRef} position={[0, -0.27, 0]}>
                <mesh position={[0, -0.08, 0]} castShadow>
                    <capsuleGeometry args={[0.088, 0.12, 5, 9]} />
                    <meshStandardMaterial color={socks} />
                </mesh>

                <mesh position={[0, -0.16, 0]} castShadow>
                    <cylinderGeometry args={[0.075, 0.09, 0.13, 12]} />
                    <meshStandardMaterial color={trim} />
                </mesh>

                <mesh position={[0, -0.27, 0.09]} castShadow>
                    <capsuleGeometry args={[0.09, 0.2, 4, 8]} />
                    <meshStandardMaterial color={SHOE} />
                </mesh>

                <mesh position={[0, -0.32, 0.13]}>
                    <boxGeometry args={[0.13, 0.025, 0.2]} />
                    <meshStandardMaterial color="#c8d0d5" />
                </mesh>
            </group>
        </group>
    )

    const body = bodyScale(player)

    return (
        <group
            ref={root}
            position={[player.x, 0, player.z]}
            rotation={[0, player.teamId === 'blue' ? Math.PI : 0, 0]}
            onClick={(event) => {
                event.stopPropagation()
                onSelect?.(player.id)
            }}
        >
            <NameTag
                height={2.25 * body.height}
                number={player.number}
                name={shortPlayerName(player.name, 12)}
                color={teamColor}
                selected={isSelected}
                labelRef={labelRef}
                staminaRef={staminaRef}
            />

            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
                    <ringGeometry args={[0.62, 0.78, 40]} />
                    <meshBasicMaterial color="#ffe45c" toneMapped={false} />
                </mesh>
            )}

            {/* Rig: hông → chân (đùi, gối, cẳng chân) + eo → thân → tay, đầu */}
            {/* Phase 26C: dáng người theo chiều cao / cân nặng */}
            <group scale={[body.width, body.height, body.width]}>
            <group ref={hips} position={[0, HIP_HEIGHT, 0]}>
                {/* Quần */}
                <mesh position={[0, 0.05, 0]} castShadow>
                    <boxGeometry args={[0.48, 0.28, 0.34]} />
                    <meshStandardMaterial color={shorts} />
                </mesh>

                <mesh position={[0, -0.08, 0.01]}>
                    <boxGeometry args={[0.49, 0.035, 0.35]} />
                    <meshStandardMaterial color={trim} />
                </mesh>

                {leg(-1, lHip, lKnee)}
                {leg(1, rHip, rKnee)}

                {/* Eo (khớp xoay thân trên) */}
                <group ref={torso} position={[0, 0.15, 0]}>
                    <group position={[0, 0.33, 0]}>
                        <mesh castShadow>
                            <capsuleGeometry args={[0.32, 0.55, 6, 12]} />
                            <meshStandardMaterial color={shirt} roughness={0.72} />
                        </mesh>

                        <mesh position={[0, 0.34, 0]}>
                            <torusGeometry args={[0.105, 0.025, 8, 20]} />
                            <meshStandardMaterial color={trim} />
                        </mesh>

                        <mesh position={[0, 0, 0.307]}>
                            <planeGeometry args={[0.055, 0.48]} />
                            <meshBasicMaterial color={trim} />
                        </mesh>

                        <mesh position={[-0.17, 0.17, 0.31]}>
                            <circleGeometry args={[0.055, 16]} />
                            <meshBasicMaterial color={trim} />
                        </mesh>

                        {/* Số áo: lớn sau lưng, nhỏ trước ngực */}
                        {numberTexture && (
                            <>
                                <mesh position={[0, 0.06, -0.33]} rotation={[0, Math.PI, 0]}>
                                    <planeGeometry args={[0.42, 0.42]} />
                                    <meshBasicMaterial
                                        map={numberTexture}
                                        transparent
                                        depthWrite={false}
                                        toneMapped={false}
                                    />
                                </mesh>
                                <mesh position={[0.15, 0.13, 0.325]}>
                                    <planeGeometry args={[0.17, 0.17]} />
                                    <meshBasicMaterial
                                        map={numberTexture}
                                        transparent
                                        depthWrite={false}
                                        toneMapped={false}
                                    />
                                </mesh>
                            </>
                        )}

                        {arm(-1, lShoulder, lElbow)}
                        {arm(1, rShoulder, rElbow)}

                        {/* Cổ */}
                        <mesh position={[0, 0.4, 0]} castShadow>
                            <cylinderGeometry args={[0.09, 0.1, 0.13, 12]} />
                            <meshStandardMaterial color={SKIN} />
                        </mesh>

                        {/* Đầu và tóc */}
                        <group ref={head} position={[0, 0.7, 0]}>
                            <mesh castShadow>
                                <sphereGeometry args={[0.245, 20, 20]} />
                                <meshStandardMaterial color={SKIN} roughness={0.82} />
                            </mesh>

                            <mesh position={[0, 0.105, -0.015]} castShadow>
                                <sphereGeometry
                                    args={[0.247, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]}
                                />
                                <meshStandardMaterial color={HAIR} />
                            </mesh>

                            {[-1, 1].map((side) => (
                                <mesh key={`ear-${side}`} position={[side * 0.235, -0.015, 0]}>
                                    <sphereGeometry args={[0.055, 10, 10]} />
                                    <meshStandardMaterial color={SKIN} />
                                </mesh>
                            ))}

                            {[-1, 1].map((side) => (
                                <mesh key={`eye-${side}`} position={[side * 0.085, 0.015, 0.218]}>
                                    <sphereGeometry args={[0.022, 8, 8]} />
                                    <meshBasicMaterial color="#202020" />
                                </mesh>
                            ))}
                        </group>
                    </group>
                </group>
            </group>
            </group>
        </group>
    )
}
