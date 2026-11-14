import { useEffect, useState } from 'react'
import { isMuted, setMuted } from '../utils/sound'
import ClubCrest from './ClubCrest'
import { userClubId, userTeam } from '../services/career'
import { isTouchDevice } from '../utils/device'
import { autoGraphics, clearSlowDevice } from '../utils/performance'
import { installState, onInstallChange, promptInstall } from '../utils/install'
import { devState, onDevChange, resetDevDaily, setDevBudget, setDevUpgradeBonus, unlockDev } from '../utils/devTools'

// Phase 29G: các dòng cài đặt dùng chung cho khung SETTINGS ở HOME và bảng
// ⚙ SETTINGS mở từ header (mọi màn hình). Trận 3 / 6 / 9 phút (10 → 9).
export const MATCH_LENGTHS = [
    [180, '3 MIN'],
    [360, '6 MIN'],
    [540, '9 MIN'],
]

// Phase 29A3: tuỳ chỉnh nút cảm ứng (chỉ hiện trên máy cảm ứng).
const TOUCH_ROWS = [
    ['Touch buttons', 'touchSize', 'medium', [['small', 'SMALL'], ['medium', 'MEDIUM'], ['large', 'LARGE']]],
    ['Button opacity', 'touchOpacity', 0.85, [[0.5, '50%'], [0.85, '85%'], [1, '100%']]],
    ['Joystick', 'joystickMode', 'floating', [['floating', 'FLOATING'], ['fixed', 'FIXED']]],
    ['Vibration', 'vibration', true, [[true, 'ON'], [false, 'OFF']]],
]

const LABEL_MODES = [
    ['smart', 'SMART'],
    ['all', 'ALL'],
    ['off', 'OFF'],
]

// Phase 29A5: cài game như ứng dụng (Android / Chrome: nút; iPhone: hướng dẫn).
function InstallRow() {
    const [state, setState] = useState(installState)

    useEffect(() => onInstallChange(() => setState(installState())), [])

    // Máy tính không có nút cài: không hiện dòng này.
    if (state === 'manual' && !isTouchDevice()) return null

    return (
        <div className="setting-row setting-row--install">
            <span>Install app</span>
            {state === 'installed' && <b className="setting-note">INSTALLED ✓</b>}
            {state === 'prompt' && (
                <button type="button" className="btn btn--small" onClick={() => promptInstall()}>
                    📲 INSTALL
                </button>
            )}
            {state === 'ios' && (
                <small className="setting-note">Safari: Share <b>⬆</b> → <b>Add to Home Screen</b></small>
            )}
            {state === 'manual' && (
                <small className="setting-note">Browser menu <b>⋮</b> → <b>Install app</b> / <b>Add to Home screen</b></small>
            )}
        </div>
    )
}

// Phase 34: dòng nhập mã (mọi máy) → nút DEV → bảng đặt ngân sách / +% đập thẻ.
// Mở khoá chỉ trong phiên (tải lại trang là mất).
function DevRows() {
    const [, refresh] = useState(0)
    const [code, setCode] = useState('')
    const [codeError, setCodeError] = useState(false)
    const [open, setOpen] = useState(false)
    const [budget, setBudget] = useState('')
    const [bonus, setBonus] = useState(() => String(Math.round(devState.upgradeBonus * 100)))
    const [message, setMessage] = useState('')

    useEffect(() => onDevChange(() => refresh((value) => value + 1)), [])

    if (!devState.unlocked) {
        return (
            <div className="setting-row setting-row--code">
                <span>Code</span>
                <form
                    className="dev-form"
                    onSubmit={(event) => {
                        event.preventDefault()
                        const ok = unlockDev(code)

                        setCodeError(!ok)
                        if (ok) setCode('')
                    }}
                >
                    <input
                        type="password"
                        value={code}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        aria-label="Code"
                        onChange={(event) => {
                            setCode(event.target.value)
                            setCodeError(false)
                        }}
                    />
                    <button type="submit" className="btn btn--small">OK</button>
                </form>
                {codeError && <small className="setting-note setting-note--error">Wrong code</small>}
            </div>
        )
    }

    return (
        <div className="setting-row setting-row--dev">
            <span>Developer</span>
            <button type="button" className="btn btn--small dev-toggle" onClick={() => setOpen((value) => !value)}>
                DEV {open ? '▲' : '▼'}
            </button>
            {open && (
                <div className="dev-panel">
                    <form
                        className="dev-form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            const value = setDevBudget(budget)

                            setMessage(value === null ? 'Budget not available here' : `Budget set to ${value.toLocaleString('en-US')} EP`)
                        }}
                    >
                        <label htmlFor="dev-budget">Set budget (EP)</label>
                        <input
                            id="dev-budget"
                            inputMode="numeric"
                            placeholder="e.g. 500000000"
                            value={budget}
                            onChange={(event) => setBudget(event.target.value)}
                        />
                        <button type="submit" className="btn btn--small btn--primary">OK</button>
                    </form>
                    <form
                        className="dev-form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            const value = setDevUpgradeBonus(bonus)

                            setBonus(String(value))
                            setMessage(`Upgrade bonus +${value}% on every upgrade (until the page reloads)`)
                        }}
                    >
                        <label htmlFor="dev-bonus">Upgrade bonus (+%)</label>
                        <input
                            id="dev-bonus"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="100"
                            value={bonus}
                            onChange={(event) => setBonus(event.target.value)}
                        />
                        <button type="submit" className="btn btn--small btn--primary">OK</button>
                    </form>
                    <div className="dev-form">
                        <label>Daily limits</label>
                        <button
                            type="button"
                            className="btn btn--small btn--primary"
                            onClick={() => setMessage(resetDevDaily() ? 'Simulations (5) and World Cups (2) reset for today' : 'Not available here')}
                        >
                            RESET SIMULATE + WORLD CUP
                        </button>
                    </div>
                    {message && <small className="setting-note">{message}</small>}
                </div>
            )}
        </div>
    )
}

export default function SettingsRows({ settings, onSettingsChange, onChangeClub = null, lockMatchLength = false }) {
    const [muted, setMutedState] = useState(isMuted)
    const graphics = settings.graphics || 'auto'

    return (
        <>
            {/* Phase 26B */}
            {onChangeClub && (
            <div className="setting-row setting-row--club">
                <span>Club</span>
                <div className="setting-club">
                    <ClubCrest clubId={userClubId()} size={22} />
                    <b>{userTeam().name}</b>
                    <button type="button" className="btn btn--small" onClick={onChangeClub}>
                        CHANGE CLUB
                    </button>
                </div>
            </div>
            )}
            <div className="setting-row">
                <span>Match length</span>
                <div className="segmented">
                    {MATCH_LENGTHS.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={settings.matchDuration === value ? 'is-active' : ''}
                            disabled={lockMatchLength && settings.matchDuration !== value}
                            title={lockMatchLength ? 'Change the match length between matches' : undefined}
                            onClick={() => onSettingsChange({ matchDuration: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="setting-row">
                <span>Player names</span>
                <div className="segmented">
                    {LABEL_MODES.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={settings.labelMode === value ? 'is-active' : ''}
                            onClick={() => onSettingsChange({ labelMode: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {/* Phase 29B */}
            <div className="setting-row">
                <span>Graphics</span>
                <div className="segmented">
                    {/* Phase 29A5: AUTO = HIGH / LOW theo máy (nhãn ghi kết quả). */}
                    {[['auto', `AUTO · ${autoGraphics().toUpperCase()}`], ['high', 'HIGH'], ['low', 'LOW']].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={graphics === value ? 'is-active' : ''}
                            onClick={() => {
                                // Bấm AUTO: quên lần máy phải tự hạ LOW trước đây, đoán lại.
                                if (value === 'auto') clearSlowDevice()
                                onSettingsChange({ graphics: value })
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="setting-row">
                <span>Sound</span>
                <div className="segmented">
                    {[[false, 'ON'], [true, 'OFF']].map(([value, label]) => (
                        <button
                            key={label}
                            type="button"
                            className={muted === value ? 'is-active' : ''}
                            onClick={() => {
                                setMuted(value)
                                setMutedState(value)
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {/* Phase 29F */}
            <div className="setting-row">
                <span>Crowd volume</span>
                <div className="segmented">
                    {[['off', 'OFF'], ['low', 'LOW'], ['medium', 'MEDIUM']].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={(settings.crowdVolume || 'medium') === value ? 'is-active' : ''}
                            onClick={() => onSettingsChange({ crowdVolume: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="setting-row">
                <span>Auto play after</span>
                <div className="segmented">
                    {[5, 10, 20].map((value) => (
                        <button
                            key={value}
                            type="button"
                            className={(settings.autoPlayDelay || 10) === value ? 'is-active' : ''}
                            onClick={() => onSettingsChange({ autoPlayDelay: value })}
                        >
                            {value} S
                        </button>
                    ))}
                </div>
            </div>
            <div className="setting-row">
                <span>FPS counter</span>
                <div className="segmented">
                    {[[true, 'ON'], [false, 'OFF']].map(([value, label]) => (
                        <button
                            key={label}
                            type="button"
                            className={Boolean(settings.showFps) === value ? 'is-active' : ''}
                            onClick={() => onSettingsChange({ showFps: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <InstallRow />
            <DevRows />
            {isTouchDevice() && TOUCH_ROWS.map(([label, key, fallback, options]) => (
                <div key={key} className="setting-row">
                    <span>{label}</span>
                    <div className="segmented">
                        {options.map(([value, text]) => (
                            <button
                                key={String(value)}
                                type="button"
                                className={(settings[key] ?? fallback) === value ? 'is-active' : ''}
                                onClick={() => onSettingsChange({ [key]: value })}
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <p className="home-card__empty">
                Match length is real time for 90 minutes of play. LOW graphics turns off shadows and
                smoothing for weaker laptops and phones; AUTO picks LOW on phones and weaker devices,
                lowers the resolution when the frame rate drops and switches to LOW mid-match if needed. Auto play: the AI plays for you when no key is
                pressed for that long (press any key to take control back).
                {isTouchDevice() && ' Touch: swipe on a button for its variant — PASS ↑ lob / cross, THROUGH ↑ lobbed through ball, SHOOT ↑ chip, ← → finesse, ↓ trivela, SPRINT ↓ shield.'}
            </p>
        </>
    )
}
