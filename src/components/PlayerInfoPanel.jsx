import { useEffect, useState } from 'react'
import { PlayerCardView, FormArrow, StatNum, UpgradeBadge } from './CardBits'
import ClubCrest from './ClubCrest'
import { worldClub } from '../data/world'
import { NATION_BY_NATIONALITY } from '../data/nations'
import { nationalityOf } from '../data/starNationality'
import { clubOfPlayer } from '../services/teamColor'
import { teamColorNotes } from '../services/lineupHelper'
import { naturalPositionOf, positionPenalty } from '../systems/roster'
import { formBonus, formInfo } from '../systems/form'
import { physiqueOf } from '../systems/physique'
import { progressOf } from '../systems/progression'
import { ATTRIBUTE_GROUPS, GOALKEEPING_GROUP, getAttributes } from '../systems/attributes'
import { formatMoney, getPlayerValue } from '../services/clubService'

// Phase 29K: bảng thông tin cầu thủ khi bấm vào một cầu thủ (đội hình trước
// trận, bảng xếp đội hình, tab SQUAD). Thẻ lớn có chân dung + thông tin cơ
// bản + đóng góp team color; `compareWith` = so sánh từng chỉ số với người
// sẽ bị thay (+ / −).

const MAIN_STATS = [
    ['overallAt', 'OVR'],
    ['pace', 'PAC'],
    ['shooting', 'SHO'],
    ['passing', 'PAS'],
    ['dribbling', 'DRI'],
    ['defending', 'DEF'],
    ['physical', 'PHY'],
    ['condition', 'FIT %'],
]

function valueOf(player, key, position) {
    if (key === 'overallAt') {
        return (player.overall || 0) - positionPenalty(naturalPositionOf(player), position || player.position) + formBonus(player)
    }

    if (key === 'condition') return Math.round(player.condition ?? 100)

    return player[key] ?? 0
}

function nationLabel(player) {
    const nationality = nationalityOf(player)

    if (!nationality) return null

    const nation = NATION_BY_NATIONALITY.get(nationality)

    return nation ? `${nation.name} (${nation.shortName})` : nationality
}

export function PlayerCompare({ player, other, position }) {
    if (!player || !other) return null

    // Người vào sân đá ở vị trí của người ra (position), người ra ở vị trí của mình.
    return (
        <div className="player-compare">
            <div className="player-compare__head">
                <span title={player.name}>{player.name.split(' ').slice(-1)[0]}</span>
                <span>vs</span>
                <span title={other.name}>{other.name.split(' ').slice(-1)[0]}</span>
            </div>
            {MAIN_STATS.map(([key, label]) => {
                const a = valueOf(player, key, position)
                const b = valueOf(other, key, other.position)
                const diff = a - b

                return (
                    <div className="player-compare__row" key={key}>
                        <b>{a}</b>
                        <span>{label}</span>
                        <b>{b}</b>
                        <em className={diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}>
                            {diff > 0 ? `+${diff}` : diff < 0 ? diff : '='}
                        </em>
                    </div>
                )
            })}
            {position && position !== player.position && (
                <p className="player-compare__note">
                    OVR for {player.name.split(' ').slice(-1)[0]} at {position}
                    {positionPenalty(naturalPositionOf(player), position) > 0 ? ` (${naturalPositionOf(player)} → ${position} −${positionPenalty(naturalPositionOf(player), position)})` : ''}.
                </p>
            )}
        </div>
    )
}

export default function PlayerInfoPanel({
    player,
    xi = [],
    zone = null,
    portraitClubId = null,
    compareWith = null,
    compareAt = null,
    readOnly = false,
    children,
}) {
    const [showDetails, setShowDetails] = useState(false)

    useEffect(() => setShowDetails(false), [player?.id])

    if (!player) return null

    const clubId = clubOfPlayer(player)
    const club = clubId ? worldClub(clubId) : null
    const natural = naturalPositionOf(player)
    const penalty = positionPenalty(natural, player.position)
    const body = physiqueOf(player)
    const progress = progressOf(player)
    const form = formInfo(player)
    const notes = readOnly ? [] : teamColorNotes(player, xi)
    const attributes = getAttributes(player)
    const groups = natural === 'GK' ? [GOALKEEPING_GROUP, ...ATTRIBUTE_GROUPS] : ATTRIBUTE_GROUPS
    const zoneLabel = zone === 'pitch' ? 'Starting XI' : zone === 'bench' ? 'Bench' : zone === 'reserves' ? 'Reserves' : null

    return (
        <div className="player-info">
            <div className="player-info__card">
                <PlayerCardView player={player} size="large" portraitClubId={portraitClubId} />
            </div>

            <div className="player-info__body">
                <div className="player-info__title">
                    <b>{player.name}</b>
                    <UpgradeBadge level={player.upgrade} />
                </div>

                {compareWith && <PlayerCompare player={player} other={compareWith} position={compareAt} />}

                <dl className="player-info__facts">
                    <div>
                        <dt>Club</dt>
                        <dd>
                            {club ? <><ClubCrest clubId={club.id} size={16} /> {club.name}</> : 'Free agent'}
                        </dd>
                    </div>
                    <div><dt>Nation</dt><dd>{nationLabel(player) || '—'}</dd></div>
                    {player.age != null && <div><dt>Age</dt><dd>{player.age}</dd></div>}
                    <div><dt>Body</dt><dd>{body.height} cm · {body.weight} kg</dd></div>
                    <div>
                        <dt>Position</dt>
                        <dd>
                            {natural}
                            {player.position && player.position !== natural && (
                                <span className={penalty ? 'is-down' : ''}> · playing {player.position}{penalty ? ` −${penalty}` : ''}</span>
                            )}
                        </dd>
                    </div>
                    {zoneLabel && <div><dt>Squad</dt><dd>{zoneLabel}</dd></div>}
                    <div><dt>Fitness</dt><dd className={(player.condition ?? 100) < 60 ? 'is-down' : ''}>{Math.round(player.condition ?? 100)}%</dd></div>
                    <div>
                        <dt>Form</dt>
                        <dd><FormArrow player={player} /> {form.label} ({form.bonus > 0 ? '+' : ''}{form.bonus})</dd>
                    </div>
                    {!readOnly && <div><dt>Level</dt><dd>LV {progress.level} · potential {progress.potential}</dd></div>}
                    <div><dt>Value</dt><dd>{formatMoney(getPlayerValue(player))}</dd></div>
                </dl>

                {notes.length > 0 && (
                    <div className="player-info__tc">
                        <span>TEAM COLOR</span>
                        <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
                    </div>
                )}

                <button type="button" className="link-btn player-info__more" onClick={() => setShowDetails((value) => !value)}>
                    {showDetails ? 'HIDE DETAILED ATTRIBUTES ▲' : 'DETAILED ATTRIBUTES ▼'}
                </button>

                {showDetails && (
                    <div className="player-info__attrs">
                        {groups.map((group) => (
                            <div key={group.key}>
                                <strong>{group.name}</strong>
                                {group.items.map(([key, label]) => (
                                    <span key={key}>
                                        {label} <StatNum value={attributes[key]} />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {children && <div className="player-info__actions">{children}</div>}
            </div>
        </div>
    )
}

// Hộp thoại bọc bảng thông tin (đội hình trước trận / tab SQUAD).
export function PlayerInfoModal({ player, onClose, ...props }) {
    useEffect(() => {
        if (!player) return undefined

        const onKey = (event) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKey)

        return () => window.removeEventListener('keydown', onKey)
    }, [player, onClose])

    if (!player) return null

    return (
        <div className="modal-host" role="presentation" onClick={onClose}>
            <div className="match-overlay match-overlay--dim match-overlay--top">
                <div
                    className="match-card player-info-modal"
                    role="dialog"
                    aria-label={`${player.name} details`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button type="button" className="player-info-modal__close" onClick={onClose} aria-label="Close">✕</button>
                    <PlayerInfoPanel player={player} {...props} />
                </div>
            </div>
        </div>
    )
}
