import { useState } from 'react'
import { isMuted, setMuted } from '../utils/sound'
import ClubCrest from './ClubCrest'
import { userClubId, userTeam } from '../services/career'
import { isTouchDevice } from '../utils/device'

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

export default function SettingsRows({ settings, onSettingsChange, onChangeClub = null, lockMatchLength = false }) {
    const [muted, setMutedState] = useState(isMuted)

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
                    {[['high', 'HIGH'], ['low', 'LOW']].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={(settings.graphics || 'high') === value ? 'is-active' : ''}
                            onClick={() => onSettingsChange({ graphics: value })}
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
                smoothing for weaker laptops and phones. Auto play: the AI plays for you when no key is
                pressed for that long (press any key to take control back).
                {isTouchDevice() && ' Touch: swipe on a button for its variant — PASS ↑ lob / cross, THROUGH ↑ lobbed through ball, SHOOT ↑ chip, ← → finesse, ↓ trivela, SPRINT ↓ shield.'}
            </p>
        </>
    )
}
