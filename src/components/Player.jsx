
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const SKIN = '#d9a783'
const HAIR = '#30251f'
const SHOE = '#171c20'

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value))

export default function Player({
                                   player,
                                   teamColor,
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

    useEffect(() => {
        onReady?.(player.id, root.current)

        return () => onReady?.(player.id, null)
    }, [onReady, player.id])

    useFrame((_, delta) => {
        if (!root.current || !visual.current) return

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
