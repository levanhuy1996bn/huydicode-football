import { attr } from '../systems/attributes'
import { shortPlayerName } from '../utils/names'

// Phase 42: chọn người đá phạt (kiểu FO4) — phạt đền, đá phạt, phạt góc.
// Lưu trên đội xanh: team.setPieceTakers = { penalty, freeKick, corner } (id
// cầu thủ đá chính). Không chọn (AUTO) → game tự chọn người có chỉ số tốt nhất
// như trước. Người được chọn bị thay ra / không đá chính → cũng về AUTO.
export const TAKER_ROLES = [
    { key: 'penalty', label: 'PENALTIES', stat: (item) => Math.round((attr(item, 'finishing') + attr(item, 'composure')) / 2), statLabel: 'FIN/COM' },
    { key: 'freeKick', label: 'FREE KICKS', stat: (item) => Math.round(attr(item, 'longShots')), statLabel: 'LONG SHOTS' },
    { key: 'corner', label: 'CORNERS', stat: (item) => Math.round(attr(item, 'longPassing')), statLabel: 'LONG PASS' },
]

export default function SetPieceTakers({ team, onChange, compact = false, only = null }) {
    const starters = (team?.players || []).filter((player) => player.position !== 'GK')
    const takers = team?.setPieceTakers || {}
    const roles = only ? TAKER_ROLES.filter((role) => only.includes(role.key)) : TAKER_ROLES

    return (
        <div className={`set-pieces${compact ? ' set-pieces--compact' : ''}`}>
            {roles.map((role) => {
                const ranked = [...starters].sort((a, b) => role.stat(b) - role.stat(a))
                const current = starters.some((player) => player.id === takers[role.key]) ? takers[role.key] : ''

                return (
                    <label key={role.key} className="set-pieces__row">
                        <span>{role.label}</span>
                        <select
                            value={current}
                            onChange={(event) => onChange?.({ ...takers, [role.key]: event.target.value || null })}
                        >
                            <option value="">AUTO · best ({ranked[0] ? shortPlayerName(ranked[0].name, 14) : '—'})</option>
                            {ranked.map((player) => (
                                <option key={player.id} value={player.id}>
                                    {shortPlayerName(player.name, 16)} · {player.position} · {role.stat(player)}
                                </option>
                            ))}
                        </select>
                    </label>
                )
            })}
            {!compact && <small className="set-pieces__hint">Number = Finishing/Composure (penalties), Long shots (free kicks), Long passing (corners).</small>}
        </div>
    )
}
