import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import MatchWorld from './MatchWorld'
import { FIXED_STEP } from '../systems/constants'

// Phase 29B: khung 3D của trận đấu (three.js + vật lý Rapier ~2 MB) tách thành
// file riêng, tải sau khi vào game (GameScene tải trước trong lúc ở sảnh), để
// màn hình đầu mở nhanh hơn. graphics 'low': tắt bóng đổ, khử răng cưa, giảm
// độ phân giải.
export default function MatchCanvas({ graphics = 'high', ...worldProps }) {
    const low = graphics === 'low'

    return (
        <Canvas
            key={graphics}
            shadows={!low}
            dpr={low ? [0.75, 1] : [1, 1.75]}
            gl={{ antialias: !low, powerPreference: 'high-performance' }}
        >
            <Suspense fallback={null}>
                <Physics gravity={[0, -9.81, 0]} timeStep={FIXED_STEP} interpolate={false}>
                    <MatchWorld {...worldProps} quality={graphics} />
                </Physics>
            </Suspense>
        </Canvas>
    )
}
