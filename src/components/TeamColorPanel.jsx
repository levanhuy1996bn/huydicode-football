import { UpgradeBadge } from './CardBits'
import { CLUB_COLOR_BONUS, TEAM_COLOR_SIZE } from '../services/teamColor'

// Phase 26D: ô TEAM COLOR — đang có gì, cộng bao nhiêu, còn thiếu gì.
// info = teamColorOf(11 người đá chính).
export default function TeamColorPanel({ info, title = 'TEAM COLOR', compact = false }) {
    if (!info) return null

    const full = info.size >= TEAM_COLOR_SIZE
    const upgrade = info.upgrade
    const club = info.club

    return (
        <div className={`team-color${compact ? ' team-color--compact' : ''}`}>
            <div className="team-color__head">
                <span>{title}</span>
                <b className={info.bonus ? 'is-on' : ''}>{info.bonus ? `+${info.bonus}` : '+0'}</b>
            </div>

            {!full && <p className="team-color__note">Needs {TEAM_COLOR_SIZE} starters.</p>}

            <div className={`team-color__row${upgrade ? ' is-on' : ''}`}>
                {upgrade ? (
                    <UpgradeBadge level={upgrade.min} />
                ) : (
                    <span className="team-color__icon">+</span>
                )}
                <div>
                    <strong>{upgrade ? `${upgrade.label} card color` : 'Card level color'}</strong>
                    <small>
                        {upgrade
                            ? `All ${TEAM_COLOR_SIZE} at +${upgrade.min} or higher · +${upgrade.bonus} main stats`
                            : `Lowest card +${info.lowest} · all ${TEAM_COLOR_SIZE} need +2 for Bronze`}
                    </small>
                    {info.next && full && (
                        <small className="team-color__hint">
                            {info.belowNext} player{info.belowNext === 1 ? '' : 's'} below +{info.next.min} → {info.next.label} (+{info.next.bonus})
                        </small>
                    )}
                </div>
                <em>{upgrade ? `+${upgrade.bonus}` : '–'}</em>
            </div>

            <div className={`team-color__row${club?.active ? ' is-on' : ''}`}>
                <span className="team-color__icon">C</span>
                <div>
                    <strong>{club ? `Club color · ${club.name}` : 'Club color'}</strong>
                    <small>
                        {club?.active
                            ? `All ${TEAM_COLOR_SIZE} from the same club · +${CLUB_COLOR_BONUS} main stats`
                            : club
                                ? `${club.count}/${TEAM_COLOR_SIZE} from ${club.name} · all ${TEAM_COLOR_SIZE} needed`
                                : `No club players · all ${TEAM_COLOR_SIZE} from one club needed`}
                    </small>
                </div>
                <em>{club?.active ? `+${CLUB_COLOR_BONUS}` : '–'}</em>
            </div>
        </div>
    )
}
