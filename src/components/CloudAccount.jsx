import { useEffect, useState } from 'react'
import ClubCrest from './ClubCrest'
import { worldClub } from '../data/world'
import { formatMoney } from '../services/clubService'
import {
    cloudConfigured,
    deleteCloudSave,
    getCloudState,
    resolveConflict,
    sendPasswordReset,
    signIn,
    signOut,
    signUp,
    subscribeCloud,
    updatePassword,
    uploadNow,
} from '../services/cloudSave'
import { redeemGiftCode } from '../services/cloudExtras'
import { dismissCatalogUpdate, getCatalogState, subscribeCatalog } from '../services/catalogSync'
import { giftRewardLabel } from '../services/giftCodes'

// Phase 50: tài khoản + lưu lên mây — các phần giao diện.

export function useCloudState() {
    const [state, setState] = useState(getCloudState)

    useEffect(() => subscribeCloud(setState), [])

    return state
}

function timeAgo(at) {
    if (!at) return ''

    const seconds = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000))

    if (seconds < 45) return 'just now'
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`

    return new Date(at).toLocaleDateString()
}

const STATUS_TEXT = {
    loading: 'Connecting…',
    'signed-out': 'Not signed in · saved on this device only',
    syncing: 'Saving to the cloud…',
    pending: 'Changes waiting to sync…',
    synced: 'Synced',
    offline: 'Offline — will sync when you are back online',
    error: 'Sync problem',
    conflict: 'Choose which save to keep',
}

// Phase 52: chữ ngắn cạnh biểu tượng (ẩn trên điện thoại).
const BADGE_LABEL = {
    'signed-out': 'Sign in',
    syncing: 'Saving…',
    pending: 'Save now',
    synced: 'Saved',
    offline: 'Offline',
    error: 'Sync error',
    conflict: 'Choose save',
}

// Biểu tượng mây trên thanh trên cùng. Phase 52: có chữ trạng thái; đang có
// thay đổi chưa gửi (hoặc mất mạng) → bấm là gửi ngay, còn lại mở Settings.
export function CloudBadge({ onClick }) {
    const state = useCloudState()

    if (!cloudConfigured) return null

    const label = BADGE_LABEL[state.status] || ''
    const syncOnClick = Boolean(state.user) && (state.status === 'pending' || state.status === 'offline')

    const tone = state.status === 'synced'
        ? 'ok'
        : state.status === 'error' || state.status === 'conflict'
            ? 'bad'
            : state.status === 'signed-out'
                ? 'off'
                : 'busy'
    const title = `${STATUS_TEXT[state.status] || ''}${state.status === 'synced' && state.lastSyncedAt ? ` · ${timeAgo(state.lastSyncedAt)}` : ''}${syncOnClick ? ' — click to save now' : ''}`

    return (
        <button
            type="button"
            className={`cloud-badge cloud-badge--${tone}${label ? ' has-label' : ''}`}
            onClick={() => (syncOnClick ? uploadNow() : onClick?.())}
            title={title}
            aria-label={`Cloud save: ${title}`}
        >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z" />
                {tone === 'ok' && <path d="m9.5 13.5 2 2 3.5-3.5" />}
                {tone === 'off' && <path d="M5 5l14 14" />}
                {tone === 'bad' && <path d="M12 10.5v3M12 16h.01" />}
            </svg>
            {label && <span className="cloud-badge__label">{label}</span>}
        </button>
    )
}

// Phase 52: nhắc đăng nhập ở HOME (chưa đăng nhập; NOT NOW → ẩn 7 ngày).
const NUDGE_KEY = 'ufm-cloud-nudge-hidden-until'
const NUDGE_DAYS = 7

export function CloudNudge({ onOpen }) {
    const state = useCloudState()
    const [hidden, setHidden] = useState(() => {
        try {
            return Number(localStorage.getItem(NUDGE_KEY) || 0) > Date.now()
        } catch {
            return false
        }
    })

    if (!cloudConfigured || hidden || state.status !== 'signed-out') return null

    return (
        <div className="cloud-nudge" role="note">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z" />
                <path d="M12 15.5v-5M9.8 12.5 12 10.3l2.2 2.2" />
            </svg>
            <span>
                <b>Your save is only on this device.</b> Sign in to back it up in the cloud and continue on another computer or phone.
            </span>
            <button type="button" className="btn btn--small btn--primary" onClick={onOpen}>SIGN IN</button>
            <button
                type="button"
                className="link-btn"
                onClick={() => {
                    try {
                        localStorage.setItem(NUDGE_KEY, String(Date.now() + NUDGE_DAYS * 86400000))
                    } catch {
                        // vẫn ẩn trong phiên này
                    }
                    setHidden(true)
                }}
            >
                NOT NOW
            </button>
        </div>
    )
}

// Phase 52: dữ liệu cầu thủ trên Supabase vừa đổi → tải lại để áp dụng.
export function CatalogUpdateBanner() {
    const [catalog, setCatalog] = useState(getCatalogState)

    useEffect(() => subscribeCatalog(setCatalog), [])

    if (!catalog.updateReady) return null

    return (
        <div className="catalog-banner" role="status">
            <span>Player database updated.</span>
            <button type="button" className="btn btn--small btn--primary" onClick={() => window.location.reload()}>RELOAD</button>
            <button type="button" className="link-btn" onClick={dismissCatalogUpdate}>LATER</button>
        </div>
    )
}

// Mục ACCOUNT trong Settings.
export function AccountPanel() {
    const state = useCloudState()
    const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState(null) // { ok, text }
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmSignOut, setConfirmSignOut] = useState(false)

    if (!cloudConfigured) {
        return (
            <section className="account-panel">
                <div className="account-panel__head"><span>ACCOUNT</span></div>
                <p className="account-panel__note">
                    Cloud save is not set up in this build (missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Your game is saved on this device.
                </p>
            </section>
        )
    }

    const run = async (action) => {
        setBusy(true)
        setMessage(null)

        try {
            const result = await action()

            if (result?.message) setMessage({ ok: result.ok !== false, text: result.message })
        } catch (error) {
            setMessage({ ok: false, text: error?.message || 'Something went wrong.' })
        } finally {
            setBusy(false)
        }
    }

    const submit = (event) => {
        event.preventDefault()

        if (mode === 'reset') return run(() => sendPasswordReset(email.trim()))
        if (mode === 'signup') return run(() => signUp(email.trim(), password))

        return run(() => signIn(email.trim(), password))
    }

    if (state.user) {
        return (
            <section className="account-panel">
                <div className="account-panel__head">
                    <span>ACCOUNT</span>
                    <small className={`account-status account-status--${state.status}`}>
                        {STATUS_TEXT[state.status]}
                        {state.status === 'synced' && state.lastSyncedAt ? ` · ${timeAgo(state.lastSyncedAt)}` : ''}
                    </small>
                </div>
                <p className="account-panel__user">Signed in as <b>{state.user.email}</b></p>
                {state.error && state.status !== 'synced' && <p className="account-panel__error">{state.error}</p>}
                <p className="account-panel__note">
                    Your save (league, world, squad, club, saved lineups, training records) is kept in the cloud and syncs automatically.
                    Sign in with the same account on another computer or phone to continue there. Graphics and sound settings stay per device.
                </p>

                {state.recovery && <NewPasswordForm />}

                <GiftCodeForm />

                <div className="account-panel__actions">
                    <button type="button" className="btn btn--small" disabled={busy || state.status === 'syncing'} onClick={() => run(uploadNow)}>
                        SYNC NOW
                    </button>
                    {!confirmSignOut ? (
                        <button type="button" className="btn btn--small" onClick={() => setConfirmSignOut(true)}>SIGN OUT</button>
                    ) : (
                        <span className="account-panel__confirm">
                            <button type="button" className="btn btn--small" onClick={() => run(() => signOut())}>SIGN OUT · KEEP SAVE HERE</button>
                            <button type="button" className="btn btn--small btn--danger" onClick={() => run(() => signOut({ clearDevice: true }))}>SIGN OUT · REMOVE FROM THIS DEVICE</button>
                            <button type="button" className="link-btn" onClick={() => setConfirmSignOut(false)}>CANCEL</button>
                        </span>
                    )}
                </div>

                <div className="account-panel__danger">
                    {!confirmDelete ? (
                        <button type="button" className="link-btn" onClick={() => setConfirmDelete(true)}>DELETE CLOUD SAVE…</button>
                    ) : (
                        <span className="account-panel__confirm">
                            Delete the save stored in the cloud? The save on this device is kept.
                            <button type="button" className="btn btn--small btn--danger" onClick={() => run(async () => { setConfirmDelete(false); return deleteCloudSave() })}>DELETE</button>
                            <button type="button" className="link-btn" onClick={() => setConfirmDelete(false)}>CANCEL</button>
                        </span>
                    )}
                </div>

                {message && <p className={message.ok ? 'account-panel__ok' : 'account-panel__error'}>{message.text}</p>}
            </section>
        )
    }

    return (
        <section className="account-panel">
            <div className="account-panel__head">
                <span>ACCOUNT</span>
                <small>{STATUS_TEXT[state.status] || ''}</small>
            </div>
            <p className="account-panel__note">
                Sign in to keep your save in the cloud and play on several devices. Without an account the game is saved on this device only.
            </p>

            <div className="account-panel__tabs" role="tablist">
                {[['signin', 'SIGN IN'], ['signup', 'CREATE ACCOUNT']].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={mode === key}
                        className={mode === key ? 'is-active' : ''}
                        onClick={() => { setMode(key); setMessage(null) }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <form className="account-form" onSubmit={submit}>
                <label>
                    <span>Email</span>
                    <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                {mode !== 'reset' && (
                    <label>
                        <span>Password{mode === 'signup' ? ' (at least 6 characters)' : ''}</span>
                        <input
                            type="password"
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            minLength={6}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </label>
                )}
                <button type="submit" className="btn btn--primary" disabled={busy}>
                    {busy ? 'PLEASE WAIT…' : mode === 'signup' ? 'CREATE ACCOUNT' : mode === 'reset' ? 'SEND RESET LINK' : 'SIGN IN'}
                </button>
                {mode === 'signin' && (
                    <button type="button" className="link-btn" onClick={() => { setMode('reset'); setMessage(null) }}>FORGOT PASSWORD?</button>
                )}
                {mode === 'reset' && (
                    <button type="button" className="link-btn" onClick={() => { setMode('signin'); setMessage(null) }}>← BACK TO SIGN IN</button>
                )}
            </form>

            {state.error && state.status === 'error' && <p className="account-panel__error">{state.error}</p>}
            {message && <p className={message.ok ? 'account-panel__ok' : 'account-panel__error'}>{message.text}</p>}
        </section>
    )
}

// Phase 51: nhập gift code (mỗi tài khoản dùng mỗi mã một lần, server kiểm tra).
function GiftCodeForm() {
    const [code, setCode] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState(null)

    return (
        <form
            className="account-form account-form--inline account-gift"
            onSubmit={async (event) => {
                event.preventDefault()
                if (busy || !code.trim()) return

                setBusy(true)
                setMessage(null)
                const result = await redeemGiftCode(code)
                setBusy(false)

                if (result.ok) {
                    setCode('')
                    setMessage({
                        ok: true,
                        text: `${result.note ? `${result.note}: ` : ''}${giftRewardLabel(result.rewards)} — added to REWARDS.`,
                    })
                } else {
                    setMessage({ ok: false, text: result.message })
                }
            }}
        >
            <label>
                <span>Gift code</span>
                <input
                    value={code}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={32}
                    placeholder="e.g. WELCOME2026"
                    onChange={(event) => {
                        setCode(event.target.value.toUpperCase())
                        setMessage(null)
                    }}
                />
            </label>
            <button type="submit" className="btn btn--small btn--primary" disabled={busy || !code.trim()}>
                {busy ? 'CHECKING…' : 'REDEEM'}
            </button>
            {message && <p className={message.ok ? 'account-panel__ok' : 'account-panel__error'}>{message.text}</p>}
        </form>
    )
}

function NewPasswordForm() {
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState(null)

    return (
        <form
            className="account-form account-form--inline"
            onSubmit={async (event) => {
                event.preventDefault()
                const result = await updatePassword(password)
                setMessage({ ok: result.ok, text: result.message })
            }}
        >
            <label>
                <span>New password</span>
                <input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn btn--small btn--primary">SAVE NEW PASSWORD</button>
            {message && <p className={message.ok ? 'account-panel__ok' : 'account-panel__error'}>{message.text}</p>}
        </form>
    )
}

function SaveCard({ title, summary, when, device, onKeep, label }) {
    const club = summary?.clubId ? worldClub(summary.clubId) : null

    return (
        <div className="cloud-choice__card">
            <span className="cloud-choice__title">{title}</span>
            {summary ? (
                <>
                    <div className="cloud-choice__club">
                        {club && <ClubCrest clubId={club.id} size={28} />}
                        <b>{club?.name || 'Unknown club'}</b>
                    </div>
                    <dl>
                        <div><dt>Season</dt><dd>{summary.season ? `${summary.season}/${String((summary.season + 1) % 100).padStart(2, '0')}` : '—'}</dd></div>
                        <div><dt>Matches played</dt><dd>{summary.played ?? '—'}</dd></div>
                        <div><dt>Budget</dt><dd>{summary.budget != null ? formatMoney(summary.budget) : '—'}</dd></div>
                        <div><dt>Club level</dt><dd>{summary.level ?? '—'}</dd></div>
                        <div><dt>Trophies</dt><dd>{summary.trophies ?? 0}</dd></div>
                    </dl>
                </>
            ) : (
                <p className="account-panel__note">No details.</p>
            )}
            <small className="cloud-choice__when">
                {when ? `Last saved ${timeAgo(when)}` : ''}{device ? ` · ${device}` : ''}
            </small>
            <button type="button" className="btn btn--primary btn--block" onClick={onKeep}>{label}</button>
        </div>
    )
}

// Hộp "giữ bản nào" (đăng nhập trên máy đã có bản lưu khác, hoặc máy khác vừa lưu).
export function CloudConflictDialog() {
    const state = useCloudState()

    if (state.status !== 'conflict' || !state.conflict) return null

    const { remote, local } = state.conflict

    return (
        <div className="club-picker-overlay cloud-choice-overlay" role="dialog" aria-modal="true" aria-label="Choose a save">
            <div className="settings-dialog cloud-choice">
                <div className="settings-dialog__head">
                    <h2>WHICH SAVE DO YOU WANT TO KEEP?</h2>
                </div>
                <p className="account-panel__note">
                    This device and your cloud save are different (you played somewhere else, or this device has another career).
                    The save you don&apos;t keep is replaced — if you keep the cloud save, a copy of this device&apos;s save stays in this browser.
                </p>
                <div className="cloud-choice__cards">
                    <SaveCard
                        title="CLOUD SAVE"
                        summary={remote?.summary}
                        when={remote?.updatedAt}
                        device={remote?.device}
                        label="KEEP CLOUD SAVE"
                        onKeep={() => resolveConflict('cloud')}
                    />
                    <SaveCard
                        title="THIS DEVICE"
                        summary={local?.summary}
                        when={local?.changedAt}
                        label="KEEP THIS DEVICE"
                        onKeep={() => resolveConflict('device')}
                    />
                </div>
            </div>
        </div>
    )
}
