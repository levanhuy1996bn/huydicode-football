import ClubCrest from './ClubCrest'
import TrophyIcon from './TrophyIcon'
import { worldClub } from '../data/world'
import { DIFFICULTY_STARS, TROPHY_BY_ID, difficultyLabel, seasonLabel } from '../services/trophyService'

// Phase 28B: thông báo "NEW TROPHY" khi thắng chung kết C1 / C2 hoặc vô địch giải.
export default function NewTrophyPopup({ trophy, remaining = 0, onClose, onOpenRoom }) {
    const entry = TROPHY_BY_ID.get(trophy.competitionId)

    if (!entry) return null

    const star = DIFFICULTY_STARS[trophy.difficulty]

    return (
        <div className="trophy-popup-overlay" role="dialog" aria-modal="true" aria-label="New trophy">
            <div className="trophy-popup">
                <div className="trophy-popup__rays" aria-hidden="true" />
                <div className="home-hero__eyebrow">NEW TROPHY · {seasonLabel(trophy.season)}</div>
                <div className="trophy-popup__icon">
                    <TrophyIcon trophy={entry} star={trophy.difficulty} size={150} />
                </div>
                <h2>{entry.name.toUpperCase()}</h2>
                <p className="trophy-popup__club">
                    <ClubCrest clubId={trophy.clubId} size={22} />
                    {worldClub(trophy.clubId)?.name} · CHAMPIONS
                </p>
                <p className="trophy-popup__diff">
                    {star && <i style={{ color: star.color }}>★ </i>}
                    Won on {difficultyLabel(trophy.difficulty)}
                </p>
                <div className="trophy-popup__actions">
                    <button type="button" className="btn" onClick={onOpenRoom}>TROPHY ROOM</button>
                    <button type="button" className="btn btn--primary" onClick={onClose}>
                        {remaining > 0 ? `NEXT (${remaining})` : 'CONTINUE'}
                    </button>
                </div>
            </div>
        </div>
    )
}
