// Phase 29A5: hiệu năng trên điện thoại.
//
// - Đồ hoạ AUTO: điện thoại / máy yếu → LOW, còn lại → HIGH. Nếu một trận ở
//   AUTO phải tự hạ xuống LOW (máy không kham nổi), lần sau AUTO chọn LOW luôn
//   (ghi nhớ trong PERF_KEY; bấm lại AUTO trong cài đặt để xoá).
// - Độ phân giải động (resolutionLevels + AdaptiveResolution trong
//   MatchCanvas): FPS tụt thì giảm độ phân giải từng bậc, mượt lại thì tăng.
// - perfState: số liệu hiện tại cho đồng hồ FPS (độ phân giải đang dùng).
import { isTouchDevice } from './device'

const PERF_KEY = 'ultimate-football-perf-v1'
const hasWindow = typeof window !== 'undefined'

export const perfState = { dpr: null, quality: null, downgraded: false }

function readHint() {
    try {
        return JSON.parse(localStorage.getItem(PERF_KEY) || 'null')
    } catch {
        return null
    }
}

// Máy đã phải tự hạ xuống LOW giữa trận → nhớ cho các trận sau.
export function rememberSlowDevice() {
    try {
        localStorage.setItem(PERF_KEY, JSON.stringify({ low: true, at: Date.now() }))
    } catch {
        // bỏ qua
    }
}

export function clearSlowDevice() {
    try {
        localStorage.removeItem(PERF_KEY)
    } catch {
        // bỏ qua
    }
}

export const isPhone = () =>
    hasWindow && isTouchDevice() && Math.min(window.screen?.width || 9999, window.screen?.height || 9999) <= 600

// Máy yếu: điện thoại, RAM ≤ 4 GB (Chrome báo navigator.deviceMemory), hoặc
// máy cảm ứng (tablet) có ≤ 4 nhân.
export function isWeakDevice() {
    if (!hasWindow) return false

    const memory = navigator.deviceMemory
    const cores = navigator.hardwareConcurrency

    return Boolean(
        isPhone() ||
        (memory && memory <= 4) ||
        (isTouchDevice() && cores && cores <= 4),
    )
}

export function autoGraphics() {
    if (readHint()?.low) return 'low'
    return isWeakDevice() ? 'low' : 'high'
}

// Cài đặt 'auto' | 'high' | 'low' → chất lượng thật 'high' | 'low'.
export const resolveGraphics = (setting) => (setting === 'high' || setting === 'low' ? setting : autoGraphics())

// Các bậc độ phân giải (pixel ratio), cao → thấp, không vượt màn hình thật.
export function resolutionLevels(quality) {
    const screenRatio = hasWindow ? Math.max(1, Math.min(window.devicePixelRatio || 1, 2)) : 1
    const steps = quality === 'low' ? [1, 0.85, 0.75, 0.65] : [1.75, 1.5, 1.25, 1, 0.85]
    const levels = [...new Set(steps.map((value) => Math.min(value, screenRatio)))]

    return levels.sort((a, b) => b - a)
}
