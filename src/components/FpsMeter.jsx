import { useEffect, useRef } from 'react'
import { perfState } from '../utils/performance'

// Phase 29B: đồng hồ FPS (Settings → FPS counter). Đếm khung hình của trình
// duyệt mỗi 0.5 giây, ghi thẳng vào DOM (không render lại React).
// Phase 29A5: kèm độ phân giải đang dùng (độ phân giải động) và LOW* khi máy
// đã tự hạ đồ hoạ giữa trận.
export default function FpsMeter() {
    const ref = useRef(null)

    useEffect(() => {
        let frames = 0
        let last = performance.now()
        let id = 0

        const loop = (now) => {
            frames += 1

            if (now - last >= 500) {
                const fps = Math.round((frames * 1000) / (now - last))

                if (ref.current) {
                    const scale = perfState.dpr ? ` ${perfState.dpr.toFixed(2)}×` : ''
                    const low = perfState.downgraded ? ' LOW*' : ''

                    ref.current.innerHTML = `${fps} FPS<small>${scale}${low}</small>`
                    ref.current.dataset.level = fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'low'
                }

                frames = 0
                last = now
            }

            id = requestAnimationFrame(loop)
        }

        id = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(id)
    }, [])

    return <div ref={ref} className="fps-meter" aria-live="off">– FPS</div>
}
