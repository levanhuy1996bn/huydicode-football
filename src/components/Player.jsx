
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { shortPlayerName } from '../utils/names'

const SKIN = '#d9a783'
const HAIR = '#30251f'
const SHOE = '#171c20'

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

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
                                   matchState,
                                   labelMode = 'smart',
                                   isSelected,
                                   onSelect,
                                   onReady,
                               }) {
    const root = useRef()
    const visual = useRef()
    const torso = useRef()
    const head = useRef()
    const leftArm = useRef()
    const rightArm = useRef()
    const leftLeg = useRef()
    const rightLeg = useRef()
    const previous = useRef(null)
    const clock = useRef(0)
    const facing = useRef(0)

    const goalkeeper =
        player.role === 'GK' ||
        String(player.position || '').toUpperCase() === 'GK' ||
        player.number === 1

    const shirt = goalkeeper ? '#f0c928' : teamColor
    const shorts = goalkeeper ? '#242b32' : teamColor
    const trim = goalkeeper ? '#fff1a6' : '#eaf4ff'

    const numberTexture = useNumberTexture(player.number, shirt)
    const labelRef = useRef(null)
    const labelVisible = useRef(null)

    useEffect(() => {
        onReady?.(player.id, root.current)

        return () => onReady?.(player.id, null)
    }, [onReady, player.id])

    useFrame((_, delta) => {
        if (!root.current || !visual.current) return

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
        }

        const dt = Math.min(delta, 0.05)
        const p = root.current.position

        if (!previous.current) {
            previous.current = {
                x: p.x,
                z: p.z,
            }
        }

        const dx = p.x - previous.current.x
        const dz = p.z - previous.current.z

        const speed =
            Math.hypot(dx, dz) / Math.max(dt, 0.001)

        previous.current.x = p.x
        previous.current.z = p.z

        const moving = speed > 0.18
        const amount = clamp(speed / 6, 0, 1)
        const sprinting = speed > 6.5

        // Nhịp hoạt ảnh thay đổi theo tốc độ chạy.
        const cadence = moving
            ? 8 + amount * 8
            : 1.8

        clock.current += dt * cadence

        const phase = clock.current
        const swing = Math.sin(phase) * amount
        const oppositeSwing = Math.sin(phase + Math.PI) * amount

        // Chuyển động chân.
        if (leftLeg.current) {
            leftLeg.current.rotation.x = swing * 0.9
            leftLeg.current.rotation.z =
                Math.sin(phase * 0.5) * 0.025 * amount
        }

        if (rightLeg.current) {
            rightLeg.current.rotation.x = oppositeSwing * 0.9
            rightLeg.current.rotation.z =
                -Math.sin(phase * 0.5) * 0.025 * amount
        }

        // Hai tay đánh ngược nhịp chân.
        if (leftArm.current) {
            leftArm.current.rotation.x = -swing * 0.65
            leftArm.current.rotation.z =
                -0.04 - Math.abs(swing) * 0.08
        }

        if (rightArm.current) {
            rightArm.current.rotation.x = -oppositeSwing * 0.65
            rightArm.current.rotation.z =
                0.04 + Math.abs(oppositeSwing) * 0.08
        }

        // Nhún người khi chạy, thở nhẹ khi đứng yên.
        const bob = moving
            ? Math.abs(Math.sin(phase * 2)) * (0.035 + amount * 0.025)
            : Math.sin(phase) * 0.009

        visual.current.position.y = bob

        // Hướng nhìn do GameScene điều khiển qua root.rotation.y.
        // Trước đây visual còn xoay thêm một lần nữa → khi chạy ngang
        // cầu thủ bị quay lưng/nhìn sai hướng.
        visual.current.rotation.y = 0

        // Thân người nghiêng nhẹ khi tăng tốc.
        if (torso.current) {
            const targetLean = moving
                ? 0.08 + amount * 0.09
                : 0

            torso.current.rotation.x +=
                (targetLean - torso.current.rotation.x) *
                Math.min(1, dt * 7)

            const targetSway = moving
                ? Math.sin(phase) * 0.025 * amount
                : Math.sin(phase * 0.7) * 0.008

            torso.current.rotation.z +=
                (targetSway - torso.current.rotation.z) *
                Math.min(1, dt * 6)
        }

        // Đầu chuyển động nhẹ theo thân.
        if (head.current) {
            const targetHeadTilt = moving
                ? -0.025 * amount
                : Math.sin(phase * 0.7) * 0.012

            head.current.rotation.z +=
                (targetHeadTilt - head.current.rotation.z) *
                Math.min(1, dt * 5)
        }

        // Thủ môn có tư thế hơi thấp hơn khi đứng chờ.
        if (goalkeeper && !moving) {
            if (torso.current) {
                const keeperLean = 0.035

                torso.current.rotation.x +=
                    (keeperLean - torso.current.rotation.x) *
                    Math.min(1, dt * 2)
            }
        }

        // Khi chạy nước rút, tay và chân chuyển động mạnh hơn.
        if (sprinting) {
            if (leftArm.current) {
                leftArm.current.rotation.x *= 1.08
            }

            if (rightArm.current) {
                rightArm.current.rotation.x *= 1.08
            }
        }

        // ---- Tư thế hành động, đọc từ state machine của engine ----
        // Quy ước trục X: dương = ngả về trước (thân) / đưa ra sau (chân).
        const entry = matchState?.playerStates?.[player.id]
        const action = entry && entry.time > 0 ? entry.state : null
        const progress =
            entry && entry.duration > 0
                ? clamp(entry.elapsed / entry.duration, 0, 1)
                : 0

        let bodyPitch = 0

        if (action === 'shoot' || action === 'pass') {
            const strength = action === 'shoot' ? 1 : 0.65

            // Kéo chân phải ra sau rồi vung mạnh về trước.
            const kick = progress < 0.35
                ? (progress / 0.35) * 0.7
                : 0.7 - ((progress - 0.35) / 0.65) * 2.3

            if (rightLeg.current) rightLeg.current.rotation.x = kick * strength
            if (leftLeg.current) leftLeg.current.rotation.x = 0.15
            if (leftArm.current) leftArm.current.rotation.x = -0.6 * strength
            if (rightArm.current) rightArm.current.rotation.x = 0.5 * strength

            bodyPitch = 0.08 * strength
        } else if (action === 'tackle') {
            const reach = Math.sin(progress * Math.PI)

            if (rightLeg.current) rightLeg.current.rotation.x = -1.1 * reach

            bodyPitch = 0.25 * reach
        } else if (action === 'slide') {
            // Ngả người ra sau, hai chân duỗi về trước.
            if (leftLeg.current) leftLeg.current.rotation.x = -0.75
            if (rightLeg.current) rightLeg.current.rotation.x = -0.45
            if (leftArm.current) leftArm.current.rotation.x = 0.7
            if (rightArm.current) rightArm.current.rotation.x = 0.7

            bodyPitch = -1.15
        } else if (action === 'throw') {
            // Ném biên: vung hai tay từ sau đầu ra trước.
            const swing = -2.9 + progress * 1.9

            if (leftArm.current) leftArm.current.rotation.x = swing
            if (rightArm.current) rightArm.current.rotation.x = swing

            bodyPitch = -0.15 + progress * 0.4
        } else if (matchState?.restart?.playerId === player.id) {
            // Chờ ném biên: giơ bóng qua đầu bằng hai tay.
            if (leftArm.current) leftArm.current.rotation.x = -2.9
            if (rightArm.current) rightArm.current.rotation.x = -2.9
            if (leftArm.current) leftArm.current.rotation.z = -0.15
            if (rightArm.current) rightArm.current.rotation.z = 0.15

            bodyPitch = -0.1
        } else if (action === 'stumble') {
            // Tắc trượt: chúi người về trước, mất đà.
            if (leftLeg.current) leftLeg.current.rotation.x = -0.5
            if (rightLeg.current) rightLeg.current.rotation.x = 0.4
            if (leftArm.current) leftArm.current.rotation.x = -0.8
            if (rightArm.current) rightArm.current.rotation.x = -0.8

            bodyPitch = 0.42 * Math.sin(progress * Math.PI)
        } else if (action === 'fallen') {
            // Nằm ngửa, 25% cuối thời gian thì đứng dậy.
            const getUp = progress > 0.75 ? (1 - progress) / 0.25 : 1

            if (leftLeg.current) leftLeg.current.rotation.x = 0
            if (rightLeg.current) rightLeg.current.rotation.x = 0.2
            if (leftArm.current) leftArm.current.rotation.x = 0.4
            if (rightArm.current) rightArm.current.rotation.x = 0.4

            bodyPitch = -1.45 * getUp
        }

        visual.current.rotation.x +=
            (bodyPitch - visual.current.rotation.x) * Math.min(1, dt * 14)
    })

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
            <Html
                position={[0, 2.25, 0]}
                center
                zIndexRange={[6, 0]}
                style={{ pointerEvents: 'none' }}
            >
                <div
                    ref={labelRef}
                    className={`player-tag${isSelected ? ' player-tag--selected' : ''}`}
                    style={{ '--tag-color': teamColor, display: 'none' }}
                >
                    <b>{player.number}</b>
                    <span>{shortPlayerName(player.name, 12)}</span>
                </div>
            </Html>

            {isSelected && (
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.035, 0]}
                >
                    <ringGeometry args={[0.62, 0.78, 40]} />
                    <meshBasicMaterial
                        color="#ffe45c"
                        toneMapped={false}
                    />
                </mesh>
            )}

            <group ref={visual}>
                {/* Thân áo */}
                <group ref={torso} position={[0, 1.08, 0]}>
                    <mesh castShadow>
                        <capsuleGeometry args={[0.32, 0.55, 6, 12]} />
                        <meshStandardMaterial
                            color={shirt}
                            roughness={0.72}
                        />
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

                    {/* Tay trái */}
                    <group ref={leftArm} position={[-0.34, 0.2, 0]}>
                        <mesh castShadow>
                            <capsuleGeometry args={[0.105, 0.31, 5, 8]} />
                            <meshStandardMaterial color={shirt} />
                        </mesh>

                        <mesh position={[0, -0.34, 0]} castShadow>
                            <capsuleGeometry args={[0.075, 0.27, 5, 8]} />
                            <meshStandardMaterial color={SKIN} />
                        </mesh>

                        <mesh position={[0, -0.52, 0]} castShadow>
                            <sphereGeometry args={[0.075, 10, 10]} />
                            <meshStandardMaterial
                                color={goalkeeper ? '#f4d33e' : SKIN}
                            />
                        </mesh>
                    </group>

                    {/* Tay phải */}
                    <group ref={rightArm} position={[0.34, 0.2, 0]}>
                        <mesh castShadow>
                            <capsuleGeometry args={[0.105, 0.31, 5, 8]} />
                            <meshStandardMaterial color={shirt} />
                        </mesh>

                        <mesh position={[0, -0.34, 0]} castShadow>
                            <capsuleGeometry args={[0.075, 0.27, 5, 8]} />
                            <meshStandardMaterial color={SKIN} />
                        </mesh>

                        <mesh position={[0, -0.52, 0]} castShadow>
                            <sphereGeometry args={[0.075, 10, 10]} />
                            <meshStandardMaterial
                                color={goalkeeper ? '#f4d33e' : SKIN}
                            />
                        </mesh>
                    </group>

                    {/* Quần */}
                    <mesh position={[0, -0.43, 0]} castShadow>
                        <boxGeometry args={[0.48, 0.28, 0.34]} />
                        <meshStandardMaterial color={shorts} />
                    </mesh>

                    <mesh position={[0, -0.56, 0.01]}>
                        <boxGeometry args={[0.49, 0.035, 0.35]} />
                        <meshStandardMaterial color={trim} />
                    </mesh>

                    {/* Chân trái */}
                    <group ref={leftLeg} position={[-0.145, -0.57, 0]}>
                        <mesh position={[0, -0.19, 0]} castShadow>
                            <capsuleGeometry args={[0.105, 0.31, 5, 9]} />
                            <meshStandardMaterial color="#f4f4f0" />
                        </mesh>

                        <mesh position={[0, -0.43, 0]} castShadow>
                            <cylinderGeometry args={[0.075, 0.09, 0.13, 12]} />
                            <meshStandardMaterial color={trim} />
                        </mesh>

                        <mesh position={[0, -0.54, 0.09]} castShadow>
                            <capsuleGeometry args={[0.09, 0.2, 4, 8]} />
                            <meshStandardMaterial color={SHOE} />
                        </mesh>

                        <mesh position={[0, -0.59, 0.13]}>
                            <boxGeometry args={[0.13, 0.025, 0.2]} />
                            <meshStandardMaterial color="#c8d0d5" />
                        </mesh>
                    </group>

                    {/* Chân phải */}
                    <group ref={rightLeg} position={[0.145, -0.57, 0]}>
                        <mesh position={[0, -0.19, 0]} castShadow>
                            <capsuleGeometry args={[0.105, 0.31, 5, 9]} />
                            <meshStandardMaterial color="#f4f4f0" />
                        </mesh>

                        <mesh position={[0, -0.43, 0]} castShadow>
                            <cylinderGeometry args={[0.075, 0.09, 0.13, 12]} />
                            <meshStandardMaterial color={trim} />
                        </mesh>

                        <mesh position={[0, -0.54, 0.09]} castShadow>
                            <capsuleGeometry args={[0.09, 0.2, 4, 8]} />
                            <meshStandardMaterial color={SHOE} />
                        </mesh>

                        <mesh position={[0, -0.59, 0.13]}>
                            <boxGeometry args={[0.13, 0.025, 0.2]} />
                            <meshStandardMaterial color="#c8d0d5" />
                        </mesh>
                    </group>
                </group>

                {/* Cổ */}
                <mesh position={[0, 1.48, 0]} castShadow>
                    <cylinderGeometry args={[0.09, 0.1, 0.13, 12]} />
                    <meshStandardMaterial color={SKIN} />
                </mesh>

                {/* Đầu và tóc */}
                <group ref={head} position={[0, 1.78, 0]}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.245, 20, 20]} />
                        <meshStandardMaterial
                            color={SKIN}
                            roughness={0.82}
                        />
                    </mesh>

                    <mesh position={[0, 0.105, -0.015]} castShadow>
                        <sphereGeometry
                            args={[
                                0.247,
                                18,
                                12,
                                0,
                                Math.PI * 2,
                                0,
                                Math.PI * 0.48,
                            ]}
                        />
                        <meshStandardMaterial color={HAIR} />
                    </mesh>

                    {[-1, 1].map((side) => (
                        <mesh
                            key={side}
                            position={[side * 0.235, -0.015, 0]}
                        >
                            <sphereGeometry args={[0.055, 10, 10]} />
                            <meshStandardMaterial color={SKIN} />
                        </mesh>
                    ))}

                    {[-1, 1].map((side) => (
                        <mesh
                            key={side}
                            position={[side * 0.085, 0.015, 0.218]}
                        >
                            <sphereGeometry args={[0.022, 8, 8]} />
                            <meshBasicMaterial color="#202020" />
                        </mesh>
                    ))}
                </group>
            </group>
        </group>
    )
}
