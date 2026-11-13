// Phase 29A5: cài game lên màn hình chính như một ứng dụng (PWA).
//
// - Service worker (public/sw.js, chỉ bản build): lưu sẵn các file của game
//   để mở nhanh và chơi được cả khi không có mạng (dữ liệu game vốn nằm trong
//   máy — localStorage).
// - Android / Chrome / Edge: bắt sự kiện beforeinstallprompt → nút INSTALL
//   trong cài đặt. iPhone / iPad (Safari): không có nút cài tự động → hướng
//   dẫn Chia sẻ ⬆ → Thêm vào MH chính.
import { isIOS } from './device'

const hasWindow = typeof window !== 'undefined'
let deferredPrompt = null
let installed = false
const listeners = new Set()

const notify = () => listeners.forEach((listener) => listener())

export function isStandalone() {
    if (!hasWindow) return false

    return Boolean(
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches ||
        window.navigator.standalone,
    )
}

// 'installed' | 'prompt' (có nút cài) | 'ios' (hướng dẫn Safari) | 'manual' (menu trình duyệt)
export function installState() {
    if (installed || isStandalone()) return 'installed'
    if (deferredPrompt) return 'prompt'
    if (isIOS()) return 'ios'
    return 'manual'
}

export function onInstallChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export async function promptInstall() {
    if (!deferredPrompt) return false

    const event = deferredPrompt

    deferredPrompt = null

    try {
        event.prompt()
        const choice = await event.userChoice

        if (choice?.outcome === 'accepted') installed = true
    } catch {
        // bỏ qua
    }

    notify()
    return installed
}

export function setupInstall() {
    if (!hasWindow) return

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault()
        deferredPrompt = event
        notify()
    })

    window.addEventListener('appinstalled', () => {
        installed = true
        deferredPrompt = null
        notify()
    })

    // Service worker: chỉ bản build (npm run dev không cache, tránh file cũ).
    if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {
                // Không đăng ký được (trình duyệt chặn…) — game vẫn chạy bình thường.
            })
        })
    }
}
