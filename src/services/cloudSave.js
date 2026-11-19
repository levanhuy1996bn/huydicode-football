// Phase 50: tài khoản + bản lưu trên mây (Supabase).
//
// - Không có VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY → tắt hẳn, game
//   chạy như cũ (chỉ lưu trong máy).
// - Thư viện supabase-js chỉ tải khi cần (dynamic import) để lần mở game đầu
//   tiên không nặng thêm.
// - Bản lưu trên mây = 1 dòng / người trong bảng public.saves (xem
//   supabase/schema.sql): data = các khoá localStorage của bản lưu.
// - Mỗi lần game ghi một khoá bản lưu vào localStorage → đánh dấu "chưa đồng
//   bộ", vài giây sau tự đẩy lên (tạm hoãn trong trận 3D). Mỗi lần đẩy kèm số
//   revision đã biết; nếu trên mây đã có bản mới hơn (máy khác vừa lưu) → không
//   ghi đè mà hỏi người chơi giữ bản nào.

export const SYNC_KEYS = [
    'ultimate-football-league-save',
    'ultimate-football-world-save',
    'ultimate-football-roster-save-v2',
    'ultimate-football-club-save',
    'ufm-lineup-presets-v1',
    'ultimate-football-training-best-v1',
]
// Khoá chính: có ít nhất một khoá này thì máy đang có bản lưu.
const CORE_KEYS = SYNC_KEYS.slice(0, 3)

const META_KEY = 'ufm-cloud-meta-v1'
const BACKUP_KEY = 'ufm-cloud-backup-v1'
const FORMAT_VERSION = 1
const UPLOAD_DELAY = 6000

const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {}
const SUPABASE_URL = env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''

export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

// ---- Trạng thái (cho giao diện) ----
// status: 'disabled' | 'loading' | 'signed-out' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error' | 'conflict'
let state = {
    status: cloudConfigured ? 'loading' : 'disabled',
    user: null,
    lastSyncedAt: null,
    error: null,
    conflict: null, // { remote: { summary, updatedAt, device, revision }, local: { summary } }
    recovery: false, // vừa bấm link đặt lại mật khẩu trong email
}
const listeners = new Set()

function setState(patch) {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
}

export const getCloudState = () => state

export function subscribeCloud(listener) {
    listeners.add(listener)
    listener(state)
    return () => listeners.delete(listener)
}

// ---- Bản lưu trong máy ----
function readMeta() {
    try {
        return JSON.parse(localStorage.getItem(META_KEY) || 'null') || {}
    } catch {
        return {}
    }
}

function writeMeta(patch) {
    const next = { ...readMeta(), ...patch }

    try {
        rawSetItem(META_KEY, JSON.stringify(next))
    } catch {
        // bộ nhớ đầy / chế độ riêng tư: bỏ qua
    }

    return next
}

export function hasLocalSave() {
    try {
        return CORE_KEYS.some((key) => localStorage.getItem(key))
    } catch {
        return false
    }
}

// { key: giá trị đã parse JSON (hoặc chuỗi nếu không parse được) }
export function collectLocalSave() {
    const data = {}

    SYNC_KEYS.forEach((key) => {
        const raw = localStorage.getItem(key)

        if (raw == null) return

        try {
            data[key] = JSON.parse(raw)
        } catch {
            data[key] = raw
        }
    })

    return data
}

function writeLocalSave(data) {
    SYNC_KEYS.forEach((key) => {
        if (data && key in data && data[key] != null) {
            rawSetItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]))
        } else {
            localStorage.removeItem(key)
        }
    })
}

// Tóm tắt để hiện khi phải chọn bản lưu: CLB, mùa, số trận đã đá, EP, cấp CLB.
export function summarizeSave(data) {
    if (!data) return null

    const world = data['ultimate-football-world-save'] || {}
    const league = data['ultimate-football-league-save'] || {}
    const club = data['ultimate-football-club-save'] || {}
    const clubId = world.userClubId || null
    const fixtures = Array.isArray(league.fixtures) ? league.fixtures : []
    const played = fixtures.filter((fixture) => fixture.played && (fixture.homeTeamId === clubId || fixture.awayTeamId === clubId)).length

    return {
        clubId,
        season: league.season || null,
        played,
        budget: club.budget ?? null,
        level: club.level ?? null,
        trophies: Array.isArray(world.trophies) ? world.trophies.length : 0,
    }
}

function deviceLabel() {
    if (typeof navigator === 'undefined') return 'Unknown device'

    const ua = navigator.userAgent || ''
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computer'
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser'

    return `${os} · ${browser}`
}

// ---- Theo dõi thay đổi bản lưu ----
// Bọc localStorage.setItem: khi game ghi một khoá bản lưu → "chưa đồng bộ".
let rawSetItem = (key, value) => localStorage.setItem(key, value)
let watching = false

function watchLocalWrites() {
    if (watching || typeof Storage === 'undefined') return

    watching = true

    const original = Storage.prototype.setItem

    rawSetItem = (key, value) => original.call(localStorage, key, value)
    Storage.prototype.setItem = function setItem(key, value) {
        const tracked = this === window.localStorage && SYNC_KEYS.includes(key)

        // Đang thay bản lưu bằng bản trên mây (sắp tải lại trang): chặn game ghi đè.
        if (tracked && writesLocked) return

        // Game ghi lại đúng nội dung cũ (vd. lúc khởi động) → không tính là thay đổi.
        const changed = tracked && !applying && this.getItem(key) !== String(value)

        original.call(this, key, value)

        if (changed) markDirty()
    }
}

let applying = false
let writesLocked = false
let uploadTimer = null
let paused = false
let uploading = false

function markDirty() {
    writeMeta({ dirty: true, changedAt: Date.now() })

    if (!state.user) return
    if (state.status !== 'conflict') setState({ status: navigator.onLine === false ? 'offline' : 'pending' })

    scheduleUpload()
}

function scheduleUpload(delay = UPLOAD_DELAY) {
    if (!state.user || state.status === 'conflict') return

    clearTimeout(uploadTimer)
    uploadTimer = setTimeout(() => {
        uploadTimer = null
        uploadNow()
    }, delay)
}

// Trong trận 3D: hoãn đẩy lên mây (không làm giật trận), hết trận đẩy ngay.
export function setCloudPaused(value) {
    const was = paused

    paused = Boolean(value)

    if (was && !paused && readMeta().dirty) scheduleUpload(1500)
}

// ---- Supabase ----
let clientPromise = null

export function getClient() {
    if (!cloudConfigured) return Promise.resolve(null)

    if (!clientPromise) {
        clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
            }),
        )
    }

    return clientPromise
}

function friendlyError(error) {
    const message = error?.message || String(error || 'Unknown error')

    if (/Failed to fetch|NetworkError|network/i.test(message)) return 'No connection — the save will sync when you are back online.'
    if (/Invalid login credentials/i.test(message)) return 'Wrong email or password.'
    if (/Email not confirmed/i.test(message)) return 'Please confirm your email first (check your inbox).'
    if (/User already registered/i.test(message)) return 'This email already has an account — sign in instead.'
    if (/Password should be at least/i.test(message)) return 'The password is too short (at least 6 characters).'
    if (/rate limit/i.test(message)) return 'Too many attempts — wait a minute and try again.'

    return message
}

async function fetchRemote(client, userId, withData = false) {
    const columns = withData ? 'revision, summary, device, updated_at, data' : 'revision, summary, device, updated_at'
    const { data, error } = await client.from('saves').select(columns).eq('user_id', userId).maybeSingle()

    if (error) throw error

    return data
}

async function insertRemote(client, userId, data) {
    const { data: row, error } = await client
        .from('saves')
        .insert({ user_id: userId, data, format_version: FORMAT_VERSION, revision: 1, summary: summarizeSave(data), device: deviceLabel() })
        .select('revision, updated_at')
        .single()

    if (error) throw error

    return row
}

// Ghi đè có điều kiện: chỉ khi trên mây vẫn là `baseRevision`.
async function updateRemote(client, userId, data, baseRevision) {
    const { data: rows, error } = await client
        .from('saves')
        .update({ data, format_version: FORMAT_VERSION, revision: baseRevision + 1, summary: summarizeSave(data), device: deviceLabel() })
        .eq('user_id', userId)
        .eq('revision', baseRevision)
        .select('revision, updated_at')

    if (error) throw error

    return rows?.[0] || null
}

function markSynced(userId, row) {
    writeMeta({ userId, revision: row.revision, dirty: false, syncedAt: Date.now() })
    setState({ status: 'synced', lastSyncedAt: Date.now(), error: null, conflict: null })
}

async function raiseConflict(client, userId) {
    const remote = await fetchRemote(client, userId)

    setState({
        status: 'conflict',
        conflict: {
            remote: remote ? { summary: remote.summary, updatedAt: remote.updated_at, device: remote.device, revision: remote.revision } : null,
            local: { summary: summarizeSave(collectLocalSave()), changedAt: readMeta().changedAt || null },
        },
    })
}

export async function uploadNow() {
    const user = state.user

    if (!user || uploading || state.status === 'conflict') return
    if (paused) {
        scheduleUpload(4000)
        return
    }

    const meta = readMeta()

    if (!meta.dirty && meta.userId === user.id) {
        setState({ status: 'synced' })
        return
    }

    uploading = true
    setState({ status: 'syncing' })

    try {
        const client = await getClient()
        const data = collectLocalSave()

        if (meta.userId !== user.id || meta.revision == null) {
            // Chưa từng đồng bộ với tài khoản này trên máy này → đối chiếu lại.
            uploading = false
            await reconcile()
            return
        }

        const row = await updateRemote(client, user.id, data, meta.revision)

        if (row) markSynced(user.id, row)
        else await raiseConflict(client, user.id)
    } catch (error) {
        const offline = navigator.onLine === false || /fetch|network/i.test(error?.message || '')

        setState({ status: offline ? 'offline' : 'error', error: friendlyError(error) })
        if (offline) scheduleUpload(15000)
    } finally {
        uploading = false
    }
}

// Đăng nhập xong (hoặc mở game khi đã đăng nhập): so bản trong máy với trên mây.
export async function reconcile() {
    const user = state.user

    if (!user) return

    setState({ status: 'syncing', error: null })

    try {
        const client = await getClient()
        const meta = readMeta()
        const remote = await fetchRemote(client, user.id)
        const local = hasLocalSave()

        if (!remote) {
            if (!local) {
                setState({ status: 'synced', lastSyncedAt: Date.now() })
                return
            }

            markSynced(user.id, await insertRemote(client, user.id, collectLocalSave()))
            return
        }

        const sameAccount = meta.userId === user.id

        if (sameAccount && meta.revision === remote.revision) {
            // Máy này đang theo đúng bản trên mây.
            if (meta.dirty) {
                const row = await updateRemote(client, user.id, collectLocalSave(), remote.revision)

                if (row) markSynced(user.id, row)
                else await raiseConflict(client, user.id)
            } else {
                setState({ status: 'synced', lastSyncedAt: meta.syncedAt || Date.now(), conflict: null })
            }

            return
        }

        if (!local) {
            await downloadAndApply(client, user.id)
            return
        }

        // Máy này theo tài khoản này nhưng máy khác đã lưu bản mới hơn, còn ở đây
        // không có gì mới → tải bản trên mây về (không cần hỏi).
        if (sameAccount && !meta.dirty && meta.revision != null && remote.revision > meta.revision) {
            await downloadAndApply(client, user.id)
            return
        }

        // Cả hai đều có và không biết bản nào mới hơn → hỏi người chơi.
        await raiseConflict(client, user.id)
    } catch (error) {
        setState({ status: navigator.onLine === false ? 'offline' : 'error', error: friendlyError(error) })
    }
}

async function downloadAndApply(client, userId) {
    const remote = await fetchRemote(client, userId, true)

    if (!remote) return

    applying = true

    try {
        writeLocalSave(remote.data)
    } finally {
        applying = false
    }

    writeMeta({ userId, revision: remote.revision, dirty: false, syncedAt: Date.now() })
    // Game nạp bản lưu lúc khởi động → tải lại trang (chặn game ghi đè trong lúc chờ).
    writesLocked = true
    window.location.reload()
}

// Hộp "giữ bản nào": 'cloud' | 'device'.
export async function resolveConflict(choice) {
    const user = state.user

    if (!user) return

    setState({ status: 'syncing' })

    try {
        const client = await getClient()

        if (choice === 'cloud') {
            // Giữ một bản sao của bản trong máy (phòng khi chọn nhầm).
            try {
                rawSetItem(BACKUP_KEY, JSON.stringify({ at: Date.now(), data: collectLocalSave() }))
            } catch {
                // không đủ chỗ: bỏ qua bản sao
            }

            await downloadAndApply(client, user.id)
            return
        }

        const remote = await fetchRemote(client, user.id)
        const data = collectLocalSave()
        const row = remote ? await updateRemote(client, user.id, data, remote.revision) : await insertRemote(client, user.id, data)

        if (row) markSynced(user.id, row)
        else await raiseConflict(client, user.id)
    } catch (error) {
        setState({ status: 'error', error: friendlyError(error) })
    }
}

export const hasBackup = () => {
    try {
        return Boolean(localStorage.getItem(BACKUP_KEY))
    } catch {
        return false
    }
}

// ---- Tài khoản ----
export async function signUp(email, password) {
    const client = await getClient()
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })

    if (error) return { ok: false, message: friendlyError(error) }
    if (!data.session) return { ok: true, message: 'Account created — check your email to confirm it, then sign in.' }

    return { ok: true, message: 'Account created and signed in.' }
}

export async function signIn(email, password) {
    const client = await getClient()
    const { error } = await client.auth.signInWithPassword({ email, password })

    return error ? { ok: false, message: friendlyError(error) } : { ok: true }
}

export async function sendPasswordReset(email) {
    const client = await getClient()
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })

    return error ? { ok: false, message: friendlyError(error) } : { ok: true, message: 'Check your email for the link to set a new password.' }
}

export async function updatePassword(password) {
    const client = await getClient()
    const { error } = await client.auth.updateUser({ password })

    if (error) return { ok: false, message: friendlyError(error) }

    setState({ recovery: false })
    return { ok: true, message: 'New password saved.' }
}

// clearDevice: xoá luôn bản lưu khỏi máy này (máy dùng chung) → về màn chọn CLB.
export async function signOut({ clearDevice = false } = {}) {
    const client = await getClient()

    if (state.user && readMeta().dirty) {
        try {
            await uploadNow()
        } catch {
            // vẫn đăng xuất
        }
    }

    clearTimeout(uploadTimer)
    await client?.auth.signOut()
    // Giữ liên kết tài khoản ↔ bản lưu trong máy: đăng nhập lại đúng tài khoản
    // thì không phải chọn bản lưu (tài khoản khác thì sẽ hỏi).

    if (clearDevice) {
        applying = true
        SYNC_KEYS.forEach((key) => localStorage.removeItem(key))
        applying = false
        localStorage.removeItem(META_KEY)
        writesLocked = true
        window.location.reload()
    }
}

export async function deleteCloudSave() {
    const user = state.user

    if (!user) return { ok: false }

    const client = await getClient()
    const { error } = await client.from('saves').delete().eq('user_id', user.id)

    if (error) return { ok: false, message: friendlyError(error) }

    writeMeta({ revision: null, dirty: true })
    setState({ status: 'pending', lastSyncedAt: null, conflict: null })
    return { ok: true, message: 'Cloud save deleted. Your save on this device is kept (it will upload again on the next change).' }
}

// ---- Khởi động ----
let started = false
let reconciledFor = null

export async function startCloudSync() {
    if (started || !cloudConfigured) return

    started = true
    watchLocalWrites()

    try {
        const client = await getClient()

        // INITIAL_SESSION (mở game), SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, PASSWORD_RECOVERY…
        client.auth.onAuthStateChange((event, session) => {
            const user = session?.user || null

            if (event === 'PASSWORD_RECOVERY') setState({ recovery: true })

            if (!user) {
                reconciledFor = null
                setState({ user: null, status: 'signed-out', conflict: null, lastSyncedAt: null })
                return
            }

            setState({ user: { id: user.id, email: user.email } })

            // Đối chiếu một lần cho mỗi tài khoản; không gọi Supabase ngay trong
            // callback (khuyến nghị của supabase-js).
            if (reconciledFor !== user.id) {
                reconciledFor = user.id
                setTimeout(() => reconcile(), 0)
            }
        })
    } catch (error) {
        setState({ status: 'error', error: friendlyError(error) })
    }

    window.addEventListener('online', () => {
        if (state.user && readMeta().dirty) scheduleUpload(1000)
    })
    window.addEventListener('offline', () => {
        if (state.user) setState({ status: 'offline' })
    })
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && state.user && readMeta().dirty && !paused) uploadNow()
    })
}
