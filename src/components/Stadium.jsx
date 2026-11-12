import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// Phase 29B: sân vận động nhẹ quanh mặt sân — khán đài nghiêng có khán giả
// (texture vẽ bằng canvas, không cần ảnh), bảng quảng cáo, cột đèn.
// Camera nhìn từ phía +X nên chỉ dựng khán đài phía xa (−X) và hai đầu sân.
// quality 'low': vật liệu không chiếu sáng, bỏ cột đèn.
const PITCH_HALF_W = 34
const PITCH_HALF_L = 52.5

function seeded(seed) {
    let value = seed % 2147483647

    if (value <= 0) value += 2147483646

    return () => {
        value = (value * 16807) % 2147483647
        return (value - 1) / 2147483646
    }
}

function crowdTexture(colors) {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const g = canvas.getContext('2d')
    const random = seeded(7)
    const palette = [...colors, ...colors, '#f2f2f2', '#d8d2c4', '#2b2b2b', '#3a4a5c', '#8a6a4a']

    g.fillStyle = '#16211c'
    g.fillRect(0, 0, canvas.width, canvas.height)

    const rows = 18
    const rowHeight = canvas.height / rows

    for (let row = 0; row < rows; row += 1) {
        // Bậc ghế
        g.fillStyle = row % 2 ? '#1d2a24' : '#1a261f'
        g.fillRect(0, row * rowHeight, canvas.width, rowHeight)
        g.fillStyle = 'rgba(0,0,0,.35)'
        g.fillRect(0, (row + 1) * rowHeight - 3, canvas.width, 3)

        for (let x = 4; x < canvas.width; x += 13 + random() * 5) {
            if (random() < 0.15) continue // ghế trống

            const y = row * rowHeight + rowHeight * 0.62 + (random() - 0.5) * 4
            const color = palette[Math.floor(random() * palette.length)]

            // Thân (áo) + đầu, viền mềm để nhìn xa không bị sọc.
            g.fillStyle = color
            g.beginPath()
            g.ellipse(x + 5, y + 4, 5.5, rowHeight * 0.3, 0, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = random() < 0.5 ? '#c9a184' : '#7a4f36'
            g.beginPath()
            g.arc(x + 5, y - 6, 3.6, 0, Math.PI * 2)
            g.fill()
        }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
}

function boardTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 64
    const g = canvas.getContext('2d')
    const panels = [
        ['#0f3d2b', '#b9ed70', 'ULTIMATE FOOTBALL'],
        ['#1d3c8f', '#ffffff', 'CHAMPIONS CUP'],
        ['#f08a24', '#1a1a1a', 'MANAGER 3D'],
        ['#7a1f1f', '#ffd23f', 'CHALLENGE CUP'],
    ]
    const width = canvas.width / panels.length

    panels.forEach(([background, color, text], index) => {
        g.fillStyle = background
        g.fillRect(index * width, 0, width, canvas.height)
        g.fillStyle = color
        g.font = '900 30px Inter, Arial, sans-serif'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(text, index * width + width / 2, canvas.height / 2 + 1)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
}

// Một khán đài nghiêng: chân ở `inner` (cách trục sân), lên cao `height`,
// lùi ra `depth`. side: 'far' (−X), 'north' (+Z), 'south' (−Z).
function Stand({ side, length, inner, depth, height, material, roofMaterial }) {
    const slope = Math.hypot(depth, height)
    const tilt = -Math.atan2(depth, height)
    const center = inner + depth / 2
    const placement = {
        far: { position: [-center, height / 2, 0], rotation: [0, Math.PI / 2, 0] },
        north: { position: [0, height / 2, center], rotation: [0, Math.PI, 0] },
        south: { position: [0, height / 2, -center], rotation: [0, 0, 0] },
    }[side]
    const roofOffset = depth / 2 + 1.5

    return (
        <group position={placement.position} rotation={placement.rotation}>
            <mesh rotation={[tilt, 0, 0]} material={material}>
                <planeGeometry args={[length, slope]} />
            </mesh>
            {/* Mái / tường sau */}
            <mesh position={[0, height / 2 + 1, -roofOffset]} material={roofMaterial}>
                <boxGeometry args={[length + 2, 2.4, 3]} />
            </mesh>
        </group>
    )
}

function Board({ position, rotation, length, material }) {
    return (
        <mesh position={position} rotation={rotation} material={material}>
            <planeGeometry args={[length, 0.9]} />
        </mesh>
    )
}

function Floodlight({ position }) {
    return (
        <group position={position}>
            <mesh position={[0, 16, 0]}>
                <cylinderGeometry args={[0.35, 0.6, 32, 8]} />
                <meshStandardMaterial color="#5b6670" />
            </mesh>
            <mesh position={[0, 32.5, 0]}>
                <boxGeometry args={[5, 2.4, 0.6]} />
                <meshStandardMaterial color="#fffbe8" emissive="#fff6cf" emissiveIntensity={1.4} />
            </mesh>
        </group>
    )
}

export default function Stadium({ colors = ['#c8102e', '#00b2a9'], quality = 'high' }) {
    const low = quality === 'low'
    const colorKey = colors.join(',')

    const { crowdLong, crowdEnd, boardLong, boardEnd, roof } = useMemo(() => {
        const crowd = crowdTexture(colorKey.split(','))
        const crowdEndTexture = crowd.clone()
        const boards = boardTexture()
        const boardsEnd = boards.clone()

        crowd.repeat.set(3, 1)
        crowdEndTexture.repeat.set(2, 1)
        crowdEndTexture.needsUpdate = true
        boards.repeat.set(4, 1)
        boardsEnd.repeat.set(2, 1)
        boardsEnd.needsUpdate = true

        const Material = low ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial
        const extra = low ? {} : { roughness: 0.95 }
        // Khán đài tối hơn mặt sân để không lấn át cầu thủ / bảng điểm.
        const shade = { color: low ? '#6d7a73' : '#8c9a92' }

        return {
            crowdLong: new Material({ map: crowd, ...shade, ...extra }),
            crowdEnd: new Material({ map: crowdEndTexture, ...shade, ...extra }),
            boardLong: new THREE.MeshBasicMaterial({ map: boards }),
            boardEnd: new THREE.MeshBasicMaterial({ map: boardsEnd }),
            roof: new Material({ color: '#22302a', ...extra }),
        }
    }, [colorKey, low])

    useEffect(
        () => () => {
            ;[crowdLong, crowdEnd, boardLong, boardEnd, roof].forEach((material) => {
                material.map?.dispose()
                material.dispose()
            })
        },
        [crowdLong, crowdEnd, boardLong, boardEnd, roof],
    )

    return (
        <group>
            <Stand side="far" length={136} inner={PITCH_HALF_W + 6} depth={22} height={17} material={crowdLong} roofMaterial={roof} />
            <Stand side="north" length={86} inner={PITCH_HALF_L + 7} depth={18} height={14} material={crowdEnd} roofMaterial={roof} />
            <Stand side="south" length={86} inner={PITCH_HALF_L + 7} depth={18} height={14} material={crowdEnd} roofMaterial={roof} />

            {/* Bảng quảng cáo: dọc biên xa + sau hai khung thành */}
            <Board position={[-(PITCH_HALF_W + 3), 0.45, 0]} rotation={[0, Math.PI / 2, 0]} length={104} material={boardLong} />
            <Board position={[0, 0.45, PITCH_HALF_L + 4]} rotation={[0, Math.PI, 0]} length={60} material={boardEnd} />
            <Board position={[0, 0.45, -(PITCH_HALF_L + 4)]} rotation={[0, 0, 0]} length={60} material={boardEnd} />

            {/* Nền quanh sân */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[150, 190]} />
                <meshBasicMaterial color="#1a3a29" />
            </mesh>

            {!low && (
                <>
                    <Floodlight position={[-(PITCH_HALF_W + 26), 0, PITCH_HALF_L + 12]} />
                    <Floodlight position={[-(PITCH_HALF_W + 26), 0, -(PITCH_HALF_L + 12)]} />
                </>
            )}
        </group>
    )
}
