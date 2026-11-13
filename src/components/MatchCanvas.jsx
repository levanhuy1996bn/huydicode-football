import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import MatchWorld from './MatchWorld'
import { FIXED_STEP } from '../systems/constants'
import { perfState, rememberSlowDevice, resolutionLevels } from '../utils/performance'

// Phase 29B: khung 3D của trận đấu (three.js + vật lý Rapier ~2 MB) tách thành
// file riêng, tải sau khi vào game (GameScene tải trước trong lúc ở sảnh), để
// màn hình đầu mở nhanh hơn. graphics 'low': tắt bóng đổ, khử răng cưa, giảm
// độ phân giải.
//
// Phase 29A5:
// - Độ phân giải động: đo FPS mỗi 2 giây; dưới 45 FPS → giảm một bậc độ phân
//   giải; nếu giảm mà không nhanh hơn (máy bị giới hạn 30 FPS, hoặc chậm do
//   CPU chứ không phải đồ hoạ) → trả lại bậc cũ và thôi chỉnh trong trận này.
//   Mượt (≥ 57 FPS) 3 lần liền → tăng lại một bậc (tối đa 2 lần mỗi trận).
// - Đồ hoạ AUTO: đã ở bậc thấp nhất (hoặc giảm độ phân giải không giúp gì) mà
//   vẫn dưới 25 FPS hai lần liền → chuyển sang LOW ngay trong trận (tắt bóng
//   đổ, bóng dưới chân, đèn sân) và nhớ cho trận sau.
// - Tạm dừng: chỉ vẽ lại khi cần (frameloop 'demand') để đỡ tốn pin / nóng máy.
const WINDOW = 2
const WARMUP = 3
const DROP_BELOW = 45
const RAISE_ABOVE = 57
const LOW_BELOW = 25

function AdaptiveResolution({ levels, onLevel, canDowngrade, onDowngrade, paused }) {
    const tracker = useRef(null)

    if (!tracker.current) {
        tracker.current = { index: 0, frames: 0, start: 0, warm: 0, good: 0, raises: 0, slow: 0, locked: false, droppedFrom: null }
    }

    // Đổi danh sách bậc (HIGH → LOW giữa trận): đi tiếp từ bậc không cao hơn
    // độ phân giải đang dùng.
    useEffect(() => {
        const current = perfState.dpr
        let index = current ? levels.findIndex((value) => value <= current + 1e-6) : 0

        if (index < 0) index = levels.length - 1

        Object.assign(tracker.current, { index, frames: 0, start: 0, warm: 0, good: 0, slow: 0, locked: false, droppedFrom: null })
        onLevel(levels[index])
    }, [levels, onLevel])

    // Tạm dừng / tiếp tục: bỏ phép đo đang dở (lúc dừng gần như không vẽ).
    useEffect(() => {
        Object.assign(tracker.current, { frames: 0, start: 0, warm: 0, good: 0, slow: 0, droppedFrom: null })
    }, [paused])

    useFrame(() => {
        if (paused) return

        const t = tracker.current
        const now = performance.now()

        if (!t.start) {
            t.start = now
            t.frames = 0
            return
        }

        t.frames += 1

        const elapsed = (now - t.start) / 1000

        // Khung hình bị gián đoạn (chuyển tab…): bỏ phép đo này.
        if (elapsed > WINDOW * 4) {
            t.start = now
            t.frames = 0
            return
        }

        if (elapsed < WINDOW) return

        const fps = t.frames / elapsed

        t.start = now
        t.frames = 0
        perfState.fps = fps

        // Mấy giây đầu (nạp shader, dựng sân) chưa tính.
        if (t.warm < WARMUP / WINDOW) {
            t.warm += 1
            return
        }

        // AUTO: vẫn rất chậm (dưới 25 FPS hai lần liền) ở bậc thấp nhất, hoặc khi
        // giảm độ phân giải không giúp được gì → chuyển LOW (tắt bóng đổ…).
        const lowest = t.locked || t.index >= levels.length - 1

        if (canDowngrade && lowest && fps < LOW_BELOW) {
            t.slow += 1

            if (t.slow >= 2) {
                t.slow = 0
                onDowngrade()
                return
            }
        } else {
            t.slow = 0
        }

        if (t.locked) return

        const setIndex = (index) => {
            t.index = index
            t.good = 0
            t.warm = 0
            onLevel(levels[index])
        }

        // Vừa giảm một bậc: có nhanh hơn không?
        if (t.droppedFrom) {
            const { fps: before, index: previous } = t.droppedFrom

            t.droppedFrom = null

            if (fps < before + 3) {
                t.locked = true
                setIndex(previous)
                return
            }
        }

        if (fps < DROP_BELOW) {
            t.good = 0

            if (t.index < levels.length - 1) {
                t.droppedFrom = { fps, index: t.index }
                setIndex(t.index + 1)
            }

            return
        }

        if (fps >= RAISE_ABOVE && t.index > 0 && t.raises < 2) {
            t.good += 1

            if (t.good >= 3) {
                t.raises += 1
                setIndex(t.index - 1)
            }
        } else {
            t.good = 0
        }
    })

    return null
}

export default function MatchCanvas({ graphics = 'high', autoGraphics = false, paused = false, ...worldProps }) {
    // Chất lượng thật trong trận: bắt đầu theo cài đặt, có thể tự hạ (AUTO).
    const [quality, setQuality] = useState(graphics)
    const levels = useMemo(() => resolutionLevels(quality), [quality])
    const [dpr, setDpr] = useState(levels[0])

    // Đổi cài đặt đồ hoạ (Canvas dựng lại theo key): theo cài đặt mới.
    useEffect(() => {
        setQuality(graphics)
    }, [graphics])

    useEffect(() => {
        perfState.quality = quality
        perfState.downgraded = quality !== graphics
    }, [quality, graphics])

    useEffect(() => {
        perfState.dpr = dpr
    }, [dpr])

    useEffect(() => () => {
        perfState.dpr = null
        perfState.fps = null
    }, [])

    const handleDowngrade = useCallback(() => {
        rememberSlowDevice()
        setQuality('low')
    }, [])

    // Canvas giữ theo cài đặt ban đầu (key): hạ chất lượng giữa trận không dựng
    // lại cảnh / vật lý, chỉ tắt bớt hiệu ứng.
    const startLow = graphics === 'low'

    return (
        <Canvas
            key={graphics}
            shadows={!startLow}
            dpr={dpr}
            frameloop={paused ? 'demand' : 'always'}
            gl={{ antialias: !startLow, powerPreference: 'high-performance' }}
        >
            <AdaptiveResolution
                levels={levels}
                onLevel={setDpr}
                canDowngrade={autoGraphics && quality === 'high'}
                onDowngrade={handleDowngrade}
                paused={paused}
            />
            <Suspense fallback={null}>
                <Physics gravity={[0, -9.81, 0]} timeStep={FIXED_STEP} interpolate={false}>
                    <MatchWorld {...worldProps} quality={quality} />
                </Physics>
            </Suspense>
        </Canvas>
    )
}
