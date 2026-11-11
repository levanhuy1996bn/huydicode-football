import Goal from './Goal'

function Line({ position, size, rotation = [0, 0, 0] }) {
    return (
        <mesh position={position} rotation={rotation}>
            <boxGeometry args={size} />
            <meshBasicMaterial color="#eaf6ed" />
        </mesh>
    )
}

export default function Pitch() {
    const pitchLength = 105
    const pitchWidth = 68
    const halfLength = pitchLength / 2
    const halfWidth = pitchWidth / 2

    return (
        <group>
            {/* Mặt sân: chiều dài theo Z, chiều rộng theo X */}
            <mesh
                receiveShadow
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.08, 0]}
            >
                <planeGeometry args={[pitchWidth, pitchLength]} />
                <meshStandardMaterial color="#287b45" roughness={1} />
            </mesh>

            {/* Các dải cỏ */}
            {Array.from({ length: 10 }, (_, i) => (
                <mesh
                    key={i}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, -0.065, -47.25 + i * 10.5]}
                >
                    <planeGeometry args={[pitchWidth, 10.5]} />
                    <meshStandardMaterial
                        color={i % 2 === 0 ? '#2d854b' : '#267641'}
                    />
                </mesh>
            ))}

            {/* Đường biên dọc */}
            <Line
                position={[-halfWidth, 0.015, 0]}
                size={[0.12, 0.025, pitchLength]}
            />
            <Line
                position={[halfWidth, 0.015, 0]}
                size={[0.12, 0.025, pitchLength]}
            />

            {/* Đường biên ngang */}
            <Line
                position={[0, 0.015, -halfLength]}
                size={[pitchWidth, 0.025, 0.12]}
            />
            <Line
                position={[0, 0.015, halfLength]}
                size={[pitchWidth, 0.025, 0.12]}
            />

            {/* Đường giữa sân */}
            <Line
                position={[0, 0.015, 0]}
                size={[pitchWidth, 0.025, 0.12]}
            />

            {/* Vòng tròn giữa sân */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.02, 0]}
            >
                <ringGeometry args={[9.05, 9.17, 64]} />
                <meshBasicMaterial color="#eaf6ed" />
            </mesh>

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.02, 0]}
            >
                <circleGeometry args={[0.18, 20]} />
                <meshBasicMaterial color="#eaf6ed" />
            </mesh>

            {/* Hai khu vực phạt đền */}
            {[-1, 1].map((side) => (
                <group key={side}>
                    {/* Vòng cấm địa: sâu 16.5m, rộng 40.3m */}
                    <Line
                        position={[0, 0.015, side * 36]}
                        size={[40.3, 0.025, 0.12]}
                    />
                    <Line
                        position={[-20.15, 0.015, side * 44.25]}
                        size={[0.12, 0.025, 16.5]}
                    />
                    <Line
                        position={[20.15, 0.015, side * 44.25]}
                        size={[0.12, 0.025, 16.5]}
                    />

                    {/* Khu vực 5m50 */}
                    <Line
                        position={[0, 0.015, side * 47]}
                        size={[18.32, 0.025, 0.12]}
                    />
                    <Line
                        position={[-9.16, 0.015, side * 49.75]}
                        size={[0.12, 0.025, 5.5]}
                    />
                    <Line
                        position={[9.16, 0.015, side * 49.75]}
                        size={[0.12, 0.025, 5.5]}
                    />

                    {/* Chấm phạt đền */}
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, 0.025, side * 41.5]}
                    >
                        <circleGeometry args={[0.16, 20]} />
                        <meshBasicMaterial color="#eaf6ed" />
                    </mesh>
                </group>
            ))}

            {/* Hai khung thành ở hai đầu sân */}
            <Goal z={-halfLength} />
            <Goal z={halfLength} />
        </group>
    )
}
