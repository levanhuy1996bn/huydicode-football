// Phase 29A1: nhận biết thiết bị cảm ứng / iPhone, toàn màn hình, chiều cao
// màn hình thật (Safari trên iPhone: 100vh tính cả thanh địa chỉ).

const hasWindow = typeof window !== 'undefined'

export function isTouchDevice() {
    if (!hasWindow) return false

    return Boolean(
        window.matchMedia?.('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0,
    )
}

export function isIOS() {
    if (!hasWindow) return false

    const ua = navigator.userAgent || ''

    // iPadOS 13+ báo là "Macintosh" nhưng có cảm ứng.
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

// ---- Toàn màn hình (Safari trên iPhone không hỗ trợ cho trang web) ----
export function fullscreenSupported() {
    if (!hasWindow) return false

    const root = document.documentElement

    // Phase 29A5: ứng dụng đã cài chạy toàn màn hình sẵn → không cần nút ⛶.
    const installedFullscreen = Boolean(window.matchMedia?.('(display-mode: fullscreen)').matches)

    return Boolean(root.requestFullscreen || root.webkitRequestFullscreen) && !/iPhone|iPod/.test(navigator.userAgent || '') && !installedFullscreen
}

export const isFullscreen = () =>
    Boolean(hasWindow && (document.fullscreenElement || document.webkitFullscreenElement))

export async function toggleFullscreen() {
    if (!fullscreenSupported()) return false

    try {
        if (isFullscreen()) {
            await (document.exitFullscreen || document.webkitExitFullscreen).call(document)
            return false
        }

        const root = document.documentElement

        await (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' })

        // Khoá màn hình ngang khi được phép (Android Chrome).
        try {
            await screen.orientation?.lock?.('landscape')
        } catch {
            // Không hỗ trợ / không được phép — bỏ qua.
        }

        return true
    } catch {
        return isFullscreen()
    }
}

// ---- Khởi tạo một lần (main.jsx) ----
// Lớp CSS trên <html>: is-touch / is-ios; biến --app-height = chiều cao thật.
// Chặn phóng to bằng 2 ngón / gõ đúp khi đang trong trận (html.in-match).
export function setupDevice() {
    if (!hasWindow) return

    const root = document.documentElement

    root.classList.toggle('is-touch', isTouchDevice())
    root.classList.toggle('is-ios', isIOS())

    const setHeight = () => root.style.setProperty('--app-height', `${window.innerHeight}px`)

    setHeight()
    window.addEventListener('resize', setHeight)
    window.addEventListener('orientationchange', () => setTimeout(setHeight, 250))

    const inMatch = () => root.classList.contains('in-match')

    // iOS Safari: cử chỉ phóng to (pinch).
    document.addEventListener('gesturestart', (event) => {
        if (inMatch()) event.preventDefault()
    })

    // Hai ngón trở lên khi đang trong trận: không cho trang phóng to / cuộn.
    document.addEventListener(
        'touchmove',
        (event) => {
            if (inMatch() && (event.touches.length > 1 || (event.scale !== undefined && event.scale !== 1))) event.preventDefault()
        },
        { passive: false },
    )

    // Gõ đúp để phóng to: chặn bằng CSS touch-action: manipulation (styles.css),
    // không chặn touchend để các nút vẫn bấm nhanh được.
}

// Đánh dấu đang trong trận (GameScene) → CSS + chặn cử chỉ.
export function setInMatch(value) {
    if (!hasWindow) return

    document.documentElement.classList.toggle('in-match', Boolean(value))
}
