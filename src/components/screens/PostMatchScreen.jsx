import { USER_TEAM } from '../../data/leagueData'
import { Scoreline } from '../MatchOverlays'
import { shortPlayerName } from '../../utils/names'

// Màn sau trận: tỉ số, thống kê hai đội, điểm cầu thủ đội người chơi + cầu thủ
// xuất sắc nhất trận, rồi về sảnh / trận tiếp theo / bảng xếp hạng.

const STAT_ROWS = [
    ['Possession', (s) => s.possession.blue, (s) => s.possession.red, '%'],
    ['Shots', (s) => s.teams.blue.shots || 0, (s) => s.teams.red.shots || 0],
    ['Shots on target', (s) => s.teams.blue.onTarget || 0, (s) => s.teams.red.onTarget || 0],
    ['Passes', (s) => s.teams.blue.passes || 0, (s) => s.teams.red.passes || 0],
    ['Tackles won', (s) => s.teams.blue.tackles || 0, (s) => s.teams.red.tackles || 0],
    ['Interceptions', (s) => s.teams.blue.interceptions || 0, (s) => s.teams.red.interceptions || 0],
    ['Duels won', (s) => s.teams.blue.duels || 0, (s) => s.teams.red.duels || 0],
    ['Saves', (s) => s.teams.blue.saves || 0, (s) => s.teams.red.saves || 0],
]

function ratingClass(rating) {
    if (rating == null) return ''
    if (rating >= 8) return 'is-great'
    if (rating >= 7) return 'is-good'
    if (rating < 6) return 'is-poor'

    return ''
}

export default function PostMatchScreen({
    summary,
    opponentName,
    fixture,
    nextFixture,
    nextOpponentName,
    onHome,
    onNext,
    onOpenLeague,
    onNewSeason,
}) {
    if (!summary) {
        return (
            <section className="screen">
                <div className="home-card">
                    <p className="home-card__empty">No match summary yet.</p>
                    <button type="button" className="btn" onClick={onHome}>BACK TO HOME</button>
                </div>
            </section>
        )
    }

    const result =
        summary.blueScore > summary.redScore
            ? 'win'
            : summary.blueScore < summary.redScore
                ? 'loss'
                : 'draw'

    const motm = summary.manOfTheMatch

    return (
        <section className="screen postmatch-screen">
            <div className="home-hero">
                <div className="home-hero__eyebrow">
                    MATCH SUMMARY{fixture ? ` · ROUND ${fixture.round}` : ''}
                </div>

                <Scoreline
                    homeName={USER_TEAM.name}
                    awayName={opponentName}
                    homeScore={summary.blueScore}
                    awayScore={summary.redScore}
                    events={summary.goalEvents}
                    size="large"
                />

                <div className={`result-badge result-badge--${result}`}>
                    {summary.forfeit === 'league'
                        ? 'MATCH FORFEITED · 0–3 LOSS'
                        : summary.forfeit === 'friendly'
                            ? 'MATCH ABANDONED'
                            : result.toUpperCase()}
                </div>

                <div className="home-hero__actions">
                    {nextFixture ? (
                        <button type="button" className="btn btn--primary btn--large" onClick={onNext}>
                            NEXT MATCH · {nextOpponentName}
                        </button>
                    ) : (
                        <button type="button" className="btn btn--primary btn--large" onClick={onNewSeason}>
                            START NEW SEASON
                        </button>
                    )}
                    <button type="button" className="btn" onClick={onOpenLeague}>LEAGUE TABLE</button>
                    <button type="button" className="btn btn--ghost" onClick={onHome}>HOME</button>
                </div>
            </div>

            <div className="postmatch-grid">
                <div className="home-card">
                    <div className="home-card__head">
                        <span>MATCH STATS</span>
                        <span className="stat-legend">{USER_TEAM.shortName} · {opponentName}</span>
                    </div>

                    {summary.forfeit ? (
                        <p className="home-card__empty">No statistics for an abandoned match.</p>
                    ) : (
                        <div className="stat-compare">
                            {STAT_ROWS.map(([label, blueValue, redValue, unit = '']) => {
                                const blue = blueValue(summary)
                                const red = redValue(summary)
                                const total = blue + red || 1

                                return (
                                    <div className="stat-compare__row" key={label}>
                                        <b>{blue}{unit}</b>
                                        <div className="stat-compare__middle">
                                            <span>{label}</span>
                                            <div className="stat-compare__bar">
                                                <i className="blue" style={{ width: `${(blue / total) * 100}%` }} />
                                                <i className="red" style={{ width: `${(red / total) * 100}%` }} />
                                            </div>
                                        </div>
                                        <b>{red}{unit}</b>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="home-card">
                    <div className="home-card__head"><span>PLAYER RATINGS · {USER_TEAM.name}</span></div>

                    {motm && (
                        <div className="motm">
                            <span>PLAYER OF THE MATCH</span>
                            <b>{motm.name}</b>
                            <em>{motm.rating?.toFixed(1)}</em>
                        </div>
                    )}

                    <table className="mini-table ratings-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>PLAYER</th>
                                <th>POS</th>
                                <th title="Goals">G</th>
                                <th title="Assists">A</th>
                                <th title="Tackles won">T</th>
                                <th>RATING</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.ratings.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.number}</td>
                                    <td title={row.name}>{shortPlayerName(row.name, 18)}</td>
                                    <td>{row.position}</td>
                                    <td>{row.goals || ''}</td>
                                    <td>{row.assists || ''}</td>
                                    <td>{row.tackles || ''}</td>
                                    <td>
                                        <span className={`rating-chip ${ratingClass(row.rating)}`}>
                                            {row.rating == null ? '–' : row.rating.toFixed(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
