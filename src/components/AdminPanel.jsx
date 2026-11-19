import { useEffect, useMemo, useState } from 'react'
import { PlayerCardView } from './CardBits'
import { TRANSFER_MARKET } from '../data/transferMarket'
import { CLUB_BY_ID, WORLD_CLUBS, LEAGUE_BY_ID } from '../data/world'
import { NATIONS } from '../data/nations'
import {
    EDIT_POSITIONS,
    STAT_KEYS,
    hasOverride,
    originalOf,
    rarityFor,
    sanitizeEdit,
} from '../data/catalogOverrides'
import {
    addDeveloper,
    createGiftCode,
    fetchDevelopers,
    fetchGiftCodes,
    fetchPlayerEdits,
    newCustomId,
    removeDeveloper,
    resetPlayer,
    saveCustom,
    saveOverride,
    setGiftCodeActive,
} from '../services/adminApi'
import { getCloudState } from '../services/cloudSave'
import { giftRewardLabel } from '../services/giftCodes'
import { withPhysique } from '../systems/physique'

// Phase 52: trang ADMIN (chỉ tài khoản developer) — sửa / thêm cầu thủ, gift
// code, danh sách developer. Mọi lệnh ghi đều được server kiểm tra lại.

const STAT_LABELS = { pace: 'PAC', shooting: 'SHO', passing: 'PAS', dribbling: 'DRI', defending: 'DEF', physical: 'PHY' }
const FREE = ''
const NATIONALITIES = [...new Set(NATIONS.map((nation) => nation.nationality).filter(Boolean))].sort()
const CLUB_OPTIONS = [...WORLD_CLUBS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((club) => ({ id: club.id, label: `${club.name} · ${LEAGUE_BY_ID.get(club.homeLeagueId)?.name || club.country}` }))

function Notice({ notice, onReload }) {
    if (!notice) return null

    return (
        <p className={notice.ok ? 'account-panel__ok admin-notice' : 'account-panel__error admin-notice'}>
            {notice.text}
            {notice.ok && notice.reload && (
                <button type="button" className="link-btn" onClick={onReload}>RELOAD TO APPLY</button>
            )}
        </p>
    )
}

const reloadPage = () => window.location.reload()

// ------------------------------------------------------------------ PLAYERS
const editable = (player) => ({
    name: player?.name || '',
    position: player?.position || 'ST',
    age: player?.age ?? 24,
    nationality: player?.nationality || '',
    height: player?.height ?? 181,
    weight: player?.weight ?? 76,
    overall: player?.overall ?? 70,
    ...Object.fromEntries(STAT_KEYS.map((key) => [key, player?.[key] ?? 70])),
    clubId: player?.clubId || FREE,
})

function PlayerEditor({ target, onDone, onCancel }) {
    const { mode, base, row } = target
    const isCustom = mode === 'custom'
    const startValues = isCustom
        ? editable({ ...(row?.data || {}), clubId: row?.data?.clubId || FREE })
        : editable({ ...base, ...(row?.data || {}) })
    const [values, setValues] = useState({ ...startValues, syncOwned: false })
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState(null)
    const [confirm, setConfirm] = useState(false)

    const set = (key) => (event) => {
        setValues((current) => ({ ...current, [key]: event.target.value }))
        setNotice(null)
    }

    const clean = sanitizeEdit(values, { custom: isCustom })
    const preview = {
        ...(isCustom ? {} : base),
        ...clean,
        id: row?.id || base?.id || 'preview',
        upgrade: 1,
        rarity: rarityFor(clean.overall ?? 60),
        club: isCustom ? (CLUB_BY_ID.get(clean.clubId)?.name || 'Free agent') : base?.club,
    }
    const changedKeys = isCustom
        ? []
        : Object.keys(clean).filter((key) => (base?.[key] ?? null) !== clean[key])

    const run = async (action) => {
        setBusy(true)
        setNotice(null)
        const result = await action()
        setBusy(false)
        setNotice({ ok: result.ok, text: result.message, reload: result.ok })
        if (result.ok) onDone?.()
    }

    return (
        <div className="admin-editor">
            <div className="admin-editor__head">
                <b>{isCustom ? (row ? 'EDIT NEW PLAYER' : 'NEW PLAYER') : 'EDIT PLAYER'}</b>
                <small>
                    {isCustom ? (row?.id || 'id given on save') : `${base.id} · ${base.club || 'Free agent'}`}
                </small>
                <button type="button" className="link-btn" onClick={onCancel}>CLOSE</button>
            </div>

            <div className="admin-editor__body">
                <div className="admin-editor__preview">
                    <PlayerCardView player={preview} hideBadge />
                    {!isCustom && (
                        <small className="admin-hint">
                            {changedKeys.length ? `Changed: ${changedKeys.join(', ')}` : 'No changes from the original.'}
                        </small>
                    )}
                </div>

                <form
                    className="admin-form"
                    onSubmit={(event) => {
                        event.preventDefault()
                        run(() => (isCustom ? saveCustom(row?.id || newCustomId(), values) : saveOverride(base, values)))
                    }}
                >
                    <label className="admin-form__wide">
                        <span>Name</span>
                        <input value={values.name} maxLength={40} required onChange={set('name')} />
                    </label>
                    <label>
                        <span>Position</span>
                        <select value={values.position} onChange={set('position')}>
                            {(EDIT_POSITIONS.includes(values.position) ? EDIT_POSITIONS : [values.position, ...EDIT_POSITIONS]).map((position) => <option key={position} value={position}>{position}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>OVR</span>
                        <input type="number" min="30" max="99" value={values.overall} onChange={set('overall')} />
                    </label>
                    <label>
                        <span>Age</span>
                        <input type="number" min="15" max="45" value={values.age} onChange={set('age')} />
                    </label>
                    <label>
                        <span>Nationality</span>
                        <input list="admin-nationalities" value={values.nationality} maxLength={40} onChange={set('nationality')} />
                    </label>
                    <label>
                        <span>Height (cm)</span>
                        <input type="number" min="150" max="210" value={values.height} onChange={set('height')} />
                    </label>
                    <label>
                        <span>Weight (kg)</span>
                        <input type="number" min="50" max="115" value={values.weight} onChange={set('weight')} />
                    </label>
                    {STAT_KEYS.map((key) => (
                        <label key={key}>
                            <span>{STAT_LABELS[key]}</span>
                            <input type="number" min="1" max="99" value={values[key]} onChange={set(key)} />
                        </label>
                    ))}
                    {isCustom && (
                        <label className="admin-form__wide">
                            <span>Club</span>
                            <select value={values.clubId} onChange={set('clubId')}>
                                <option value={FREE}>Free agent (transfer market / packs)</option>
                                {CLUB_OPTIONS.map((club) => <option key={club.id} value={club.id}>{club.label}</option>)}
                            </select>
                        </label>
                    )}
                    <datalist id="admin-nationalities">
                        {NATIONALITIES.map((nationality) => <option key={nationality} value={nationality} />)}
                    </datalist>

                    {/* Phase 52b: làm mới thẻ đang sở hữu (giữ cấp + và điểm đã cộng). */}
                    {(!isCustom || row) && (
                        <label className="admin-form__wide admin-check">
                            <input
                                type="checkbox"
                                checked={values.syncOwned}
                                onChange={(event) => setValues((current) => ({ ...current, syncOwned: event.target.checked }))}
                            />
                            <span>
                                <b>Also update cards players already own</b> — their cards get the new base data; card level (+N),
                                player level, XP and trained points are kept. Off = only new cards (market, packs) and AI squads change.
                            </span>
                        </label>
                    )}

                    <div className="admin-form__actions admin-form__wide">
                        <button type="submit" className="btn btn--small btn--primary" disabled={busy}>
                            {busy ? 'SAVING…' : 'SAVE'}
                        </button>
                        {(row || (!isCustom && hasOverride(base.id))) && !confirm && (
                            <button type="button" className="btn btn--small" disabled={busy} onClick={() => setConfirm(true)}>
                                {isCustom ? 'DELETE PLAYER…' : 'RESET TO ORIGINAL…'}
                            </button>
                        )}
                        {confirm && (
                            <span className="account-panel__confirm">
                                {isCustom ? 'Delete this player for everyone?' : 'Remove all changes to this player?'}
                                <button
                                    type="button"
                                    className="btn btn--small btn--danger"
                                    disabled={busy}
                                    onClick={() => {
                                        setConfirm(false)
                                        run(() => resetPlayer(row?.id || base.id))
                                    }}
                                >
                                    {isCustom ? 'DELETE' : 'RESET'}
                                </button>
                                <button type="button" className="link-btn" onClick={() => setConfirm(false)}>CANCEL</button>
                            </span>
                        )}
                    </div>
                </form>
            </div>

            <Notice notice={notice} onReload={reloadPage} />
        </div>
    )
}

function PlayersTab() {
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState('all') // 'all' | 'edited' | 'custom'
    const [rows, setRows] = useState(null)
    const [error, setError] = useState(null)
    const [target, setTarget] = useState(null)

    const load = async () => {
        const result = await fetchPlayerEdits()

        if (result.ok) {
            setRows(result.rows)
            setError(null)
        } else {
            setError(result.message)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const index = useMemo(() => {
        const map = new Map()

        // Phase 52b: cả đội hình gốc (Huy Le…) — dùng đúng danh sách thị trường.
        TRANSFER_MARKET.forEach((player) => {
            if (!player.custom) map.set(player.id, player)
        })

        return map
    }, [])
    const rowById = useMemo(() => new Map((rows || []).map((row) => [row.id, row])), [rows])

    // Cầu thủ tự do trong danh mục chưa có chiều cao / cân nặng → lấy như thị trường (withPhysique).
    const baseOf = (player) => withPhysique(originalOf(player.id) || player)

    const results = useMemo(() => {
        if (filter === 'custom') {
            return (rows || []).filter((row) => row.kind === 'custom').map((row) => ({
                key: row.id,
                name: row.data?.name || row.id,
                position: row.data?.position || '?',
                overall: row.data?.overall ?? '–',
                club: CLUB_BY_ID.get(row.data?.clubId)?.name || 'Free agent',
                tag: 'NEW',
                open: () => setTarget({ mode: 'custom', row }),
            }))
        }

        const list = filter === 'edited'
            ? (rows || []).filter((row) => row.kind === 'override' && index.has(row.id)).map((row) => index.get(row.id))
            : (() => {
                const text = query.trim().toLowerCase()

                if (text.length < 2) return []

                const found = []

                for (const player of index.values()) {
                    if (player.name.toLowerCase().includes(text) || player.id === text) found.push(player)
                    if (found.length >= 200) break
                }

                return found.sort((a, b) => b.overall - a.overall).slice(0, 80)
            })()

        return list.map((player) => {
            const row = rowById.get(player.id)
            const shown = { ...baseOf(player), ...(row?.data || {}) }

            return {
                key: player.id,
                name: shown.name,
                position: shown.position,
                overall: shown.overall,
                club: player.club || 'Free agent',
                tag: row ? 'EDITED' : null,
                open: () => setTarget({ mode: 'override', base: baseOf(player), row }),
            }
        })
    }, [filter, query, rows, index, rowById])

    if (target) {
        return (
            <PlayerEditor
                key={target.row?.id || target.base?.id || 'new'}
                target={target}
                onDone={load}
                onCancel={() => setTarget(null)}
            />
        )
    }

    const editedCount = (rows || []).filter((row) => row.kind === 'override').length
    const customCount = (rows || []).filter((row) => row.kind === 'custom').length

    return (
        <div className="admin-players">
            <div className="admin-toolbar">
                <div className="segmented">
                    {[
                        ['all', 'SEARCH'],
                        ['edited', `EDITED · ${editedCount}`],
                        ['custom', `NEW · ${customCount}`],
                    ].map(([value, label]) => (
                        <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>
                            {label}
                        </button>
                    ))}
                </div>
                <button type="button" className="btn btn--small btn--primary" onClick={() => setTarget({ mode: 'custom', row: null })}>
                    + NEW PLAYER
                </button>
            </div>

            {filter === 'all' && (
                <input
                    className="admin-search"
                    placeholder="Search a player by name (any club or free agent)…"
                    value={query}
                    autoFocus
                    onChange={(event) => setQuery(event.target.value)}
                />
            )}

            {error && <p className="account-panel__error">{error}</p>}
            {rows === null && !error && <p className="account-panel__note">Loading…</p>}

            <div className="admin-list">
                {results.map((item) => (
                    <button key={item.key} type="button" className="admin-list__row" onClick={item.open}>
                        <b className="admin-list__ovr">{item.overall}</b>
                        <span className="admin-list__pos">{item.position}</span>
                        <span className="admin-list__name">{item.name}</span>
                        <small>{item.club}</small>
                        {item.tag && <em className={`admin-tag admin-tag--${item.tag.toLowerCase()}`}>{item.tag}</em>}
                    </button>
                ))}
                {filter === 'all' && query.trim().length >= 2 && !results.length && <p className="account-panel__note">No player found.</p>}
                {filter === 'all' && query.trim().length < 2 && (
                    <p className="account-panel__note">
                        Type at least 2 letters. Changes go to Supabase for every player and apply when the game is reloaded.
                        Cards players already own keep their stats; new cards (market, packs) and AI squads use the new data.
                    </p>
                )}
                {filter !== 'all' && rows && !results.length && <p className="account-panel__note">Nothing here yet.</p>}
            </div>
        </div>
    )
}

// ------------------------------------------------------------------ GIFT CODES
const REWARD_FIELDS = [
    ['ep', 'EP card (amount)'],
    ['premium', 'Premium packs'],
    ['standard', 'Player packs'],
    ['boost', 'Upgrade Boosts'],
    ['protection', 'Protection cards'],
    ['fitness', 'Fitness cards'],
    ['form', 'Form cards'],
    ['bottle', 'EXP bottles'],
]

function GiftTab() {
    const [rows, setRows] = useState(null)
    const [notice, setNotice] = useState(null)
    const [form, setForm] = useState({ code: '', note: '', expires: '', maxUses: '', rewards: {} })
    const [busy, setBusy] = useState(false)

    const load = async () => {
        const result = await fetchGiftCodes()

        if (result.ok) setRows(result.rows)
        else setNotice({ ok: false, text: result.message })
    }

    useEffect(() => {
        load()
    }, [])

    const submit = async (event) => {
        event.preventDefault()
        const rewards = Object.fromEntries(
            Object.entries(form.rewards).map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))]).filter(([, value]) => value > 0),
        )

        setBusy(true)
        const result = await createGiftCode({
            code: form.code,
            rewards,
            note: form.note,
            expiresAt: form.expires ? new Date(form.expires).toISOString() : null,
            maxUses: form.maxUses,
        })
        setBusy(false)
        setNotice({ ok: result.ok, text: result.message })

        if (result.ok) {
            setForm({ code: '', note: '', expires: '', maxUses: '', rewards: {} })
            load()
        }
    }

    const toggle = async (row) => {
        const result = await setGiftCodeActive(row.code, !row.active)

        if (!result.ok) setNotice({ ok: false, text: result.message })
        load()
    }

    return (
        <div className="admin-gifts">
            <form className="admin-form admin-gift-form" onSubmit={submit}>
                <label>
                    <span>Code</span>
                    <input
                        value={form.code}
                        maxLength={32}
                        required
                        placeholder="TET2027"
                        onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                    />
                </label>
                <label>
                    <span>Message to players</span>
                    <input value={form.note} maxLength={60} placeholder="Happy new year" onChange={(event) => setForm({ ...form, note: event.target.value })} />
                </label>
                <label>
                    <span>Expires (empty = never)</span>
                    <input type="datetime-local" value={form.expires} onChange={(event) => setForm({ ...form, expires: event.target.value })} />
                </label>
                <label>
                    <span>Max accounts (empty = all)</span>
                    <input type="number" min="1" value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} />
                </label>
                {REWARD_FIELDS.map(([key, label]) => (
                    <label key={key}>
                        <span>{label}</span>
                        <input
                            type="number"
                            min="0"
                            value={form.rewards[key] ?? ''}
                            placeholder="0"
                            onChange={(event) => setForm({ ...form, rewards: { ...form.rewards, [key]: event.target.value } })}
                        />
                    </label>
                ))}
                <div className="admin-form__actions admin-form__wide">
                    <button type="submit" className="btn btn--small btn--primary" disabled={busy}>{busy ? 'CREATING…' : 'CREATE CODE'}</button>
                    <small className="admin-hint">Each account can use a code once. Players type it in Settings → ACCOUNT.</small>
                </div>
            </form>

            <Notice notice={notice} />

            <div className="admin-table">
                {rows === null && <p className="account-panel__note">Loading…</p>}
                {rows && !rows.length && <p className="account-panel__note">No codes yet.</p>}
                {(rows || []).map((row) => {
                    const expired = row.expires_at && new Date(row.expires_at) <= new Date()

                    return (
                        <div key={row.code} className={`admin-table__row${row.active && !expired ? '' : ' is-off'}`}>
                            <b>{row.code}</b>
                            <span>{giftRewardLabel(row.rewards)}</span>
                            <small>
                                {row.note ? `“${row.note}” · ` : ''}
                                used {row.uses}{row.max_uses ? ` / ${row.max_uses}` : ''}
                                {row.expires_at ? ` · ${expired ? 'expired' : 'until'} ${new Date(row.expires_at).toLocaleString()}` : ' · no expiry'}
                            </small>
                            <button type="button" className={`btn btn--small${row.active ? '' : ' btn--primary'}`} onClick={() => toggle(row)}>
                                {row.active ? 'TURN OFF' : 'TURN ON'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ------------------------------------------------------------------ DEVELOPERS
function DevelopersTab() {
    const [rows, setRows] = useState(null)
    const [notice, setNotice] = useState(null)
    const [email, setEmail] = useState('')
    const [note, setNote] = useState('')
    const [confirm, setConfirm] = useState(null)
    const me = getCloudState().user?.id

    const load = async () => {
        const result = await fetchDevelopers()

        if (result.ok) setRows(result.rows)
        else setNotice({ ok: false, text: result.message })
    }

    useEffect(() => {
        load()
    }, [])

    return (
        <div className="admin-devs">
            <form
                className="admin-form admin-dev-form"
                onSubmit={async (event) => {
                    event.preventDefault()
                    const result = await addDeveloper(email.trim(), note)

                    setNotice({ ok: result.ok, text: result.message })
                    if (result.ok) {
                        setEmail('')
                        setNote('')
                        load()
                    }
                }}
            >
                <label>
                    <span>Account email</span>
                    <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label>
                    <span>Note</span>
                    <input value={note} maxLength={40} placeholder="tester" onChange={(event) => setNote(event.target.value)} />
                </label>
                <div className="admin-form__actions">
                    <button type="submit" className="btn btn--small btn--primary">ADD DEVELOPER</button>
                </div>
            </form>

            <Notice notice={notice} />

            <div className="admin-table">
                {rows === null && <p className="account-panel__note">Loading…</p>}
                {(rows || []).map((row) => (
                    <div key={row.user_id} className="admin-table__row">
                        <b>{row.email}</b>
                        <span>{row.note || ''}</span>
                        <small>since {new Date(row.created_at).toLocaleDateString()}{row.user_id === me ? ' · you' : ''}</small>
                        {row.user_id !== me && (confirm === row.user_id ? (
                            <span className="account-panel__confirm">
                                <button
                                    type="button"
                                    className="btn btn--small btn--danger"
                                    onClick={async () => {
                                        setConfirm(null)
                                        const result = await removeDeveloper(row.user_id)

                                        setNotice({ ok: result.ok, text: result.message })
                                        load()
                                    }}
                                >
                                    REMOVE
                                </button>
                                <button type="button" className="link-btn" onClick={() => setConfirm(null)}>CANCEL</button>
                            </span>
                        ) : (
                            <button type="button" className="btn btn--small" onClick={() => setConfirm(row.user_id)}>REMOVE…</button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ------------------------------------------------------------------ SHELL
const TABS = [
    ['players', 'PLAYERS'],
    ['gifts', 'GIFT CODES'],
    ['devs', 'DEVELOPERS'],
]

export default function AdminPanel({ onClose }) {
    const [tab, setTab] = useState('players')

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="club-picker-overlay admin-overlay" role="dialog" aria-modal="true" aria-label="Admin">
            <div className="settings-dialog admin-panel">
                <div className="settings-dialog__head">
                    <h2>ADMIN</h2>
                    <button type="button" className="btn btn--small" onClick={onClose}>CLOSE</button>
                </div>
                <div className="account-panel__tabs admin-tabs" role="tablist">
                    {TABS.map(([value, label]) => (
                        <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>
                            {label}
                        </button>
                    ))}
                </div>
                {tab === 'players' && <PlayersTab />}
                {tab === 'gifts' && <GiftTab />}
                {tab === 'devs' && <DevelopersTab />}
            </div>
        </div>
    )
}
