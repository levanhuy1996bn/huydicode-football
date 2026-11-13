import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'

const HALF_WIDTH = 3.66
const HEIGHT = 2.5
const DEPTH = 2.4
const POST = 0.06

export default function Goal({ z = -52.5 }) {
    const netDirection = z < 0 ? -1 : 1

    return (
        <group position={[0, 0, z]}>
            {/* Collider cột dọc + xà ngang: bóng dội ra. Phase 30A: cột tròn
                (trước là hộp vuông → góc bật lạ), nảy hơn; tiếng "ping" và thống kê
                ở systems/woodwork.js. */}
            <RigidBody type="fixed" colliders={false} restitution={0.78} friction={0.25}>
                {[-HALF_WIDTH, HALF_WIDTH].map((x) => (
                    <CylinderCollider
                        key={x}
                        args={[HEIGHT / 2 + POST, POST]}
                        position={[x, HEIGHT / 2, 0]}
                    />
                ))}
                <CylinderCollider
                    args={[HALF_WIDTH, POST]}
                    position={[0, HEIGHT, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                />
            </RigidBody>

            {/* Collider lưới: giữ bóng lại trong khung thành */}
            <RigidBody type="fixed" colliders={false} restitution={0.05} friction={1}>
                <CuboidCollider
                    args={[HALF_WIDTH, HEIGHT / 2, 0.05]}
                    position={[0, HEIGHT / 2, netDirection * DEPTH]}
                />
                {[-HALF_WIDTH, HALF_WIDTH].map((x) => (
                    <CuboidCollider
                        key={`side-${x}`}
                        args={[0.05, HEIGHT / 2, DEPTH / 2]}
                        position={[x, HEIGHT / 2, netDirection * (DEPTH / 2 + POST)]}
                    />
                ))}
                <CuboidCollider
                    args={[HALF_WIDTH, 0.05, DEPTH / 2]}
                    position={[0, HEIGHT, netDirection * (DEPTH / 2 + POST)]}
                />
            </RigidBody>

            {/* Xà ngang */}
            <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[POST, POST, 7.32 + POST * 2, 12]} />
                <meshStandardMaterial
                    color="#f7f7f7"
                    metalness={0.25}
                    roughness={0.4}
                />
            </mesh>

            {/* Hai cột dọc */}
            {[-3.66, 3.66].map((x) => (
                <mesh key={x} position={[x, 1.25, 0]} castShadow>
                    <cylinderGeometry args={[POST, POST, 2.5, 12]} />
                    <meshStandardMaterial
                        color="#f7f7f7"
                        metalness={0.25}
                        roughness={0.4}
                    />
                </mesh>
            ))}

            {/* Lưới phía sau khung thành */}
            <mesh position={[0, 1.25, netDirection * 1.2]}>
                <boxGeometry args={[7.3, 2.5, 2.4]} />
                <meshStandardMaterial
                    color="#dce8e3"
                    wireframe
                    transparent
                    opacity={0.65}
                />
            </mesh>
        </group>
    )
}
