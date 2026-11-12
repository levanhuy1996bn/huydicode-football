import { Component, Suspense, lazy } from 'react'
import TrophyIcon from './TrophyIcon'
import { DIFFICULTY_STARS } from '../services/trophyService'

// Phase 29B: cúp 3D xoay (phòng truyền thống, popup NEW TROPHY). Phần WebGL
// (TrophyCanvas.jsx) chỉ tải khi cần; trong lúc tải, khi chưa giành được cúp
// (bóng mờ), khi đồ hoạ LOW hoặc máy không có WebGL → dùng cúp SVG.
const TrophyCanvas = lazy(() => import('./TrophyCanvas'))

class Fallback extends Component {
    constructor(props) {
        super(props)
        this.state = { failed: false }
    }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    componentDidCatch() {
        // WebGL không khởi tạo được → cúp SVG.
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children
    }
}

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas')

        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch {
        return false
    }
}

let webglSupport = null

export default function Trophy3D({ trophy, won = true, star = null, size = 130, quality = 'high' }) {
    if (webglSupport === null && typeof document !== 'undefined') webglSupport = hasWebGL()

    const svg = <TrophyIcon trophy={trophy} won={won} star={star} size={size} />

    if (!won || quality === 'low' || !webglSupport) return svg

    const starInfo = star ? DIFFICULTY_STARS[star] : null

    return (
        <div className="trophy-3d" style={{ width: size * 1.15, height: size * 1.3 }}>
            <Fallback fallback={svg}>
                <Suspense fallback={svg}>
                    <TrophyCanvas trophy={trophy} />
                </Suspense>
            </Fallback>
            {starInfo && (
                <span className="trophy-3d__star" style={{ color: starInfo.color }} title={`Won on ${starInfo.label}`}>
                    ★
                </span>
            )}
        </div>
    )
}
