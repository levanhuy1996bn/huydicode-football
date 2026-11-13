import { useEffect } from 'react'
import SettingsRows from './SettingsRows'

// Phase 29G: bảng ⚙ SETTINGS mở từ header (mọi màn hình). Trong trận không
// đổi được độ dài trận và CLB.
export default function SettingsDialog({ settings, onSettingsChange, onChangeClub, inMatch = false, onClose }) {
    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="club-picker-overlay" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
            <div className="settings-dialog" onClick={(event) => event.stopPropagation()}>
                <div className="settings-dialog__head">
                    <h2>SETTINGS</h2>
                    <button type="button" className="btn btn--small" onClick={onClose}>CLOSE</button>
                </div>
                {inMatch && <p className="settings-dialog__note">Match paused · match length can be changed between matches.</p>}
                <SettingsRows
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                    onChangeClub={onChangeClub}
                    lockMatchLength={inMatch}
                />
            </div>
        </div>
    )
}
