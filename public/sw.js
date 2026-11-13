// Phase 29A5: service worker — mở game nhanh và chơi được khi không có mạng.
//
// - Trang (index.html): lấy từ mạng trước (để luôn có bản mới nhất), mạng
//   chậm quá 3 giây hoặc mất mạng thì dùng bản đã lưu.
// - File trong assets/ (tên có mã băm, không bao giờ đổi nội dung): lấy bản đã
//   lưu, chưa có thì tải rồi lưu. Giữ tối đa 30 file (bản cũ tự xoá dần).
// - File khác cùng trang (biểu tượng, manifest): dùng bản đã lưu, cập nhật ngầm.
// Chỉ xử lý yêu cầu GET cùng tên miền; mọi thứ khác đi thẳng ra mạng.
const SHELL = 'ufm-shell-v1'
const ASSETS = 'ufm-assets-v1'
const MAX_ASSETS = 30
const SHELL_FILES = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png']

self.addEventListener('install', (event) => {
    self.skipWaiting()
    event.waitUntil(
        caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)).catch(() => undefined),
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== ASSETS).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    )
})

async function trimAssets() {
    const cache = await caches.open(ASSETS)
    const keys = await cache.keys()

    // cache.keys() theo thứ tự lưu → xoá các file cũ nhất.
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((request) => cache.delete(request)))
}

async function pageFirst(request) {
    const cache = await caches.open(SHELL)
    const network = fetch(request).then((response) => {
        if (response.ok) cache.put('./', response.clone())
        return response
    })
    const timeout = new Promise((resolve) => setTimeout(resolve, 3000, null))

    network.catch(() => undefined)

    try {
        const response = await Promise.race([network, timeout])

        if (response) return response
    } catch {
        // mất mạng → dùng bản đã lưu
    }

    const cached = await cache.match('./')

    return cached || network
}

async function assetFirst(request) {
    const cache = await caches.open(ASSETS)
    const cached = await cache.match(request)

    if (cached) return cached

    const response = await fetch(request)

    if (response.ok) {
        await cache.put(request, response.clone())
        trimAssets()
    }

    return response
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(SHELL)
    const cached = await cache.match(request)
    const network = fetch(request)
        .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
        })
        .catch(() => cached)

    return cached || network
}

self.addEventListener('fetch', (event) => {
    const { request } = event

    if (request.method !== 'GET') return

    const url = new URL(request.url)

    if (url.origin !== self.location.origin) return

    if (request.mode === 'navigate') {
        event.respondWith(pageFirst(request))
    } else if (url.pathname.includes('/assets/')) {
        event.respondWith(assetFirst(request))
    } else {
        event.respondWith(staleWhileRevalidate(request))
    }
})
