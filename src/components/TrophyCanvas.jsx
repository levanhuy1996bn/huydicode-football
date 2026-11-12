import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Phase 29B: phần WebGL của cúp 3D (tải riêng, chỉ khi cần — xem Trophy3D.jsx). Cúp 3D xoay (phòng truyền thống, popup NEW TROPHY). Dựng từ
// khối cơ bản của three.js theo đúng 8 dáng của bản SVG (TrophyIcon.jsx):
// bigears (C1), tall (C2), crown, shield, goblet, plate, obelisk, globe.
// Phản chiếu kim loại nhờ RoomEnvironment (không cần ảnh HDR từ mạng).
// Đồ hoạ LOW hoặc máy không có WebGL → dùng lại cúp SVG.
const METAL_COLORS = {
    gold: '#e7b64a',
    silver: '#d9dee4',
    rose: '#e3a28c',
    bronze: '#c07a45',
    amber: '#f0952e',
}

const v2 = (points) => points.map(([x, y]) => new THREE.Vector2(x, y))

function Lathe({ points, material }) {
    const geometry = useMemo(() => new THREE.LatheGeometry(v2(points), 48), [points])

    return <mesh geometry={geometry} material={material} />
}

function Handle({ x, y, radius, tube = 0.055, arc = 3.4, scaleY = 1, material }) {
    const right = x > 0
    // Cung tròn hướng ra ngoài (phải: quanh góc 0; trái: quanh góc π).
    const rotation = right ? -arc / 2 : Math.PI - arc / 2

    return (
        <mesh position={[x, y, 0]} rotation={[0, 0, rotation]} scale={[1, scaleY, 1]} material={material}>
            <torusGeometry args={[radius, tube, 12, 32, arc]} />
        </mesh>
    )
}

function shieldShape() {
    const shape = new THREE.Shape()

    shape.moveTo(-0.55, 0.65)
    shape.lineTo(0.55, 0.65)
    shape.lineTo(0.55, 0)
    shape.quadraticCurveTo(0.5, -0.45, 0, -0.68)
    shape.quadraticCurveTo(-0.5, -0.45, -0.55, 0)
    shape.closePath()
    return shape
}

function starShape(outer = 0.24, inner = 0.1) {
    const shape = new THREE.Shape()

    for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? outer : inner
        const a = Math.PI / 2 + (i * Math.PI) / 5
        const point = [Math.cos(a) * r, Math.sin(a) * r]

        if (i === 0) shape.moveTo(...point)
        else shape.lineTo(...point)
    }

    shape.closePath()
    return shape
}

function wingShape() {
    const shape = new THREE.Shape()

    shape.moveTo(0, 0)
    shape.quadraticCurveTo(0.35, 0.15, 0.45, 0.7)
    shape.quadraticCurveTo(0.2, 0.4, 0, 0.3)
    shape.closePath()
    return shape
}

function Extruded({ shape, depth = 0.1, material, ...props }) {
    const geometry = useMemo(() => {
        const result = new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.025,
            bevelSize: 0.02,
            bevelSegments: 2,
        })

        result.center()
        return result
    }, [shape, depth])

    return <mesh geometry={geometry} material={material} {...props} />
}

// Hình phẳng dùng chung (tạo một lần).
const SHAPES = { shield: shieldShape(), star: starShape(), wing: wingShape() }

const FOOT = [[0, 0.53], [0.38, 0.53], [0.34, 0.62], [0.13, 0.7], [0.1, 0.75]]

function Body({ shape, metal, accent }) {
    switch (shape) {
        case 'bigears':
            return (
                <>
                    <Lathe material={metal} points={[...FOOT, [0.09, 1.05], [0.17, 1.1], [0.12, 1.16], [0.36, 1.32], [0.52, 1.62], [0.58, 2.0], [0.6, 2.3], [0.55, 2.3], [0.5, 2.0]]} />
                    <Handle x={0.62} y={1.85} radius={0.34} scaleY={1.35} material={metal} />
                    <Handle x={-0.62} y={1.85} radius={0.34} scaleY={1.35} material={metal} />
                    <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={accent}><torusGeometry args={[0.53, 0.025, 8, 48]} /></mesh>
                </>
            )
        case 'tall':
            return (
                <>
                    <Lathe material={metal} points={[...FOOT, [0.15, 1.1], [0.23, 1.5], [0.13, 1.72], [0.2, 2.1], [0.28, 2.45], [0.24, 2.5], [0.05, 2.52]]} />
                    <mesh position={[0, 2.62, 0]} material={metal}><sphereGeometry args={[0.1, 20, 16]} /></mesh>
                    <Handle x={0.32} y={2.15} radius={0.17} tube={0.035} material={metal} />
                    <Handle x={-0.32} y={2.15} radius={0.17} tube={0.035} material={metal} />
                    <mesh position={[0, 1.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={accent}><torusGeometry args={[0.14, 0.025, 8, 32]} /></mesh>
                </>
            )
        case 'crown':
            return (
                <>
                    <Lathe material={metal} points={[...FOOT, [0.1, 1.15], [0.2, 1.2], [0.45, 1.45], [0.52, 1.82], [0.48, 1.84]]} />
                    <mesh position={[0, 1.84, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal}><torusGeometry args={[0.5, 0.04, 10, 48]} /></mesh>
                    {Array.from({ length: 6 }, (_, i) => {
                        const a = (i / 6) * Math.PI * 2

                        return (
                            <group key={i} position={[Math.cos(a) * 0.48, 2.02, Math.sin(a) * 0.48]}>
                                <mesh material={metal}><coneGeometry args={[0.08, 0.34, 12]} /></mesh>
                                <mesh position={[0, 0.2, 0]} material={metal}><sphereGeometry args={[0.05, 12, 10]} /></mesh>
                            </group>
                        )
                    })}
                    <Handle x={0.55} y={1.5} radius={0.2} tube={0.045} material={metal} />
                    <Handle x={-0.55} y={1.5} radius={0.2} tube={0.045} material={metal} />
                    <mesh position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]} material={accent}><torusGeometry args={[0.49, 0.022, 8, 48]} /></mesh>
                </>
            )
        case 'shield':
            return (
                <>
                    <Lathe material={metal} points={[[0, 0.53], [0.3, 0.53], [0.25, 0.62], [0.11, 0.7], [0.09, 1.05], [0, 1.05]]} />
                    <Extruded shape={SHAPES.shield} depth={0.1} material={metal} position={[0, 1.72, 0]} />
                    <mesh position={[0, 1.7, 0.1]} material={accent}><torusGeometry args={[0.22, 0.03, 10, 40]} /></mesh>
                    <mesh position={[0, 2.22, 0.09]} material={accent}><boxGeometry args={[0.9, 0.08, 0.02]} /></mesh>
                </>
            )
        case 'goblet':
            return (
                <>
                    <Lathe material={metal} points={[...FOOT, [0.07, 1.3], [0.13, 1.36], [0.07, 1.42], [0.18, 1.48], [0.65, 1.75], [0.8, 1.98], [0.76, 1.98], [0.6, 1.8]]} />
                    <mesh position={[0.86, 1.75, 0]} material={metal}><torusGeometry args={[0.14, 0.035, 10, 32]} /></mesh>
                    <mesh position={[-0.86, 1.75, 0]} material={metal}><torusGeometry args={[0.14, 0.035, 10, 32]} /></mesh>
                    <mesh position={[0, 1.78, 0]} rotation={[Math.PI / 2, 0, 0]} material={accent}><torusGeometry args={[0.7, 0.022, 8, 48]} /></mesh>
                </>
            )
        case 'plate':
            return (
                <>
                    <Lathe material={metal} points={[[0, 0.53], [0.3, 0.53], [0.25, 0.62], [0.11, 0.7], [0.1, 0.92], [0, 0.92]]} />
                    <mesh position={[0, 1.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
                        <cylinderGeometry args={[0.82, 0.82, 0.07, 64]} />
                    </mesh>
                    <mesh position={[0, 1.72, 0.04]} material={accent}><torusGeometry args={[0.7, 0.025, 8, 64]} /></mesh>
                    <mesh position={[0, 1.72, 0.04]} material={metal}><torusGeometry args={[0.45, 0.03, 8, 64]} /></mesh>
                    <mesh position={[0, 1.72, 0.05]} material={metal}><sphereGeometry args={[0.12, 20, 12]} /></mesh>
                </>
            )
        case 'obelisk':
            return (
                <>
                    <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} material={metal}>
                        <cylinderGeometry args={[0.1, 0.24, 1.9, 4]} />
                    </mesh>
                    <Extruded shape={SHAPES.star} depth={0.06} material={metal} position={[0, 2.68, 0]} />
                    <Extruded shape={SHAPES.wing} depth={0.05} material={metal} position={[0.32, 1.75, 0]} />
                    <Extruded shape={SHAPES.wing} depth={0.05} material={metal} position={[-0.32, 1.75, 0]} rotation={[0, Math.PI, 0]} />
                    <mesh position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]} material={accent}><boxGeometry args={[0.36, 0.06, 0.36]} /></mesh>
                </>
            )
        case 'globe':
        default:
            return (
                <>
                    <Lathe material={metal} points={[...FOOT, [0.1, 1.05], [0.2, 1.1], [0.4, 1.3], [0.42, 1.45], [0.38, 1.46]]} />
                    <mesh position={[0, 1.95, 0]} material={metal}><sphereGeometry args={[0.42, 40, 28]} /></mesh>
                    <mesh position={[0, 1.95, 0]} material={accent}><torusGeometry args={[0.425, 0.018, 8, 48]} /></mesh>
                    <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 2, 0]} material={accent}><torusGeometry args={[0.425, 0.018, 8, 48]} /></mesh>
                    <Handle x={0.4} y={1.55} radius={0.16} tube={0.04} arc={2.6} material={metal} />
                    <Handle x={-0.4} y={1.55} radius={0.16} tube={0.04} arc={2.6} material={metal} />
                </>
            )
    }
}

function Environment() {
    const { gl, scene } = useThree()

    useEffect(() => {
        const pmrem = new THREE.PMREMGenerator(gl)
        const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

        scene.environment = texture
        return () => {
            scene.environment = null
            texture.dispose()
            pmrem.dispose()
        }
    }, [gl, scene])

    return null
}

function Model({ trophy }) {
    const group = useRef(null)
    const [flagA, flagB] = trophy.flag || ['#ffffff', '#888888']
    const materials = useMemo(
        () => ({
            metal: new THREE.MeshStandardMaterial({
                color: METAL_COLORS[trophy.metal] || METAL_COLORS.gold,
                metalness: 1,
                roughness: 0.22,
            }),
            accent: new THREE.MeshStandardMaterial({ color: flagB, metalness: 0.3, roughness: 0.4 }),
            wood: new THREE.MeshStandardMaterial({ color: '#2b2118', roughness: 0.7 }),
            flagA: new THREE.MeshStandardMaterial({ color: flagA, roughness: 0.5 }),
            flagB: new THREE.MeshStandardMaterial({ color: flagB, roughness: 0.5 }),
        }),
        [trophy.metal, flagA, flagB],
    )

    useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])

    useFrame((_, delta) => {
        if (group.current) group.current.rotation.y += delta * 0.9
    })

    const scale = trophy.kind === 'second' ? 0.85 : 1

    return (
        <group ref={group} scale={scale} position={[0, -1.35 * scale, 0]}>
            {/* Bục gỗ + dải màu cờ (2 mặt) */}
            <mesh position={[0, 0.17, 0]} material={materials.wood}><boxGeometry args={[1.25, 0.34, 1.0]} /></mesh>
            {[0.505, -0.505].map((z) => (
                <group key={z} position={[0, 0.17, z]}>
                    <mesh position={[-0.2, 0, 0]} material={materials.flagA}><boxGeometry args={[0.4, 0.1, 0.01]} /></mesh>
                    <mesh position={[0.2, 0, 0]} material={materials.flagB}><boxGeometry args={[0.4, 0.1, 0.01]} /></mesh>
                </group>
            ))}
            <mesh position={[0, 0.43, 0]} material={materials.metal}><cylinderGeometry args={[0.4, 0.44, 0.18, 40]} /></mesh>
            <Body shape={trophy.shape} metal={materials.metal} accent={materials.accent} />
        </group>
    )
}

export default function TrophyCanvas({ trophy }) {
    return (
        <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.35, 4.1], fov: 38 }}
            gl={{ antialias: true, alpha: true }}
        >
            <ambientLight intensity={0.35} />
            <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
            <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#ffe6b0" />
            <Environment />
            <Model key={trophy.id} trophy={trophy} />
        </Canvas>
    )
}
