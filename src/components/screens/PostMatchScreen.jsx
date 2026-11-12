import { USER_TEAM } from '../../data/leagueData'
import { Scoreline } from '../MatchOverlays'
import { shortPlayerName } from '../../utils/names'
import { MatchTimeline, ShotMap, StatComparison, TopPerformers } from '../MatchStatsPanel'
import { formatMoney } from '../../services/clubService'
import { PACK_TYPES } from '../../services/cards'

// Phase 23: XP CLB, tiền thưởng, lên cấp và phần thưởng của trận vừa đá.
function ClubRewardCard({ report, onOpenCards }) {
    if (!report) return null

    const gained = report.levelsGained || []

    return (
        <div className={`home-card club-reward${gained.length ? ' is-levelup' : ''}`}>
            <div className="home-card__head">
                <span>CLUB REWARDS</span>
                {(gained.length > 0 || report.seasonReward) && (
                    <button type="button" className="link-btn" onClick={onOpenCards}>
                        OPEN IN CARDS →
                    </button>
                )}
            </div>
            <div className="club-reward__row">
                <div><span>CLUB XP</span><b>+{report.xp}</b></div>
                <div><span>PRIZE MONEY</span><b>+{formatMoney(report.prize)}</b></div>
                <div><span>BUDGET</span><b>{formatMoney(report.budget)}</b></div>
                <div className="club-reward__level">
                    <span>CLUB LEVEL {report.level}</span>
                    <div className="xp-bar xp-bar--large">
                        <i style={{ width: `${Math.min(100, (report.xpNow / report.xpToNext) * 100)}%` }} />
                    </div>
                    <small>{report.xpNow} / {report.xpToNext} XP</small>
                </div>
            </div>
            {gained.map((entry) => (
                <div className="club-reward__levelup" key={entry.level}>
                    <b>LEVEL UP! · LEVEL {entry.level}</b>
                    <span>{formatMoney(entry.ep)} card + {PACK_TYPES[entry.pack]?.label} added to CARDS</span>
                </div>
            ))}
            {report.seasonReward && (
                <div className="club-reward__levelup">
                    <b>SEASON {report.seasonReward.season} FINISHED · #{report.seasonReward.position}</b>
                    <span>{formatMoney(report.seasonReward.amount)} card added to CARDS</span>
                </div>
            )}
        </div>
    )
}

// Màn sau trận: tỉ số, thống kê hai đội, điểm cầu thủ đội người chơi + cầu thủ
// xuất sắc nhất trận, rồi về sảnh / trận tiếp theo / bảng xếp hạng.


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
    onOpenDevelopment,
    onOpenCards,
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
                    events={[...(summary.goalEvents || []), ...(summary.cardEvents || [])].sort((a, b) => a.minute - b.minute)}
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
                        <StatComparison source={summary} />
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
                                <th title="Shots (expected goals)">SH</th>
                                <th title="Passes completed / attempted">PASS</th>
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
                                    <td title={row.xg ? `xG ${row.xg.toFixed(2)}` : undefined}>{row.shots || ''}</td>
                                    <td>{row.passes ? `${row.passesCompleted || 0}/${row.passes}` : ''}</td>
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

            {!summary.forfeit && (
                <div className="postmatch-grid">
                    <div className="home-card">
                        <div className="home-card__head"><span>MATCH TIMELINE</span></div>
                        <MatchTimeline
                            events={[
                                ...(summary.goalEvents || []),
                                ...(summary.cardEvents || []),
                                ...(summary.subEvents || []),
                            ]}
                        />
                        <TopPerformers ratings={summary.ratings} />
                    </div>

                    <div className="home-card">
                        <div className="home-card__head"><span>SHOT MAP</span></div>
                        <ShotMap shots={summary.shots || []} opponentName={opponentName} />
                    </div>
                </div>
            )}

            <ClubRewardCard report={summary.clubReport} onOpenCards={onOpenCards} />

            {summary.progression?.length > 0 && (
                <div className="home-card progression-card">
                    <div className="home-card__head">
                        <span>PLAYER DEVELOPMENT · XP EARNED</span>
                        <button type="button" className="link-btn" onClick={onOpenDevelopment}>
                            SPEND POINTS →
                        </button>
                    </div>
                    <div className="progression-list">
                        {[...summary.progression]
                            .sort((a, b) => b.levelsGained - a.levelsGained || b.gained - a.gained)
                            .map((row) => (
                                <div
                                    className={`progression-row${row.levelsGained ? ' is-levelup' : ''}`}
                                    key={row.id}
                                >
                                    <span className="lineup__number">{row.number}</span>
                                    <span className="progression-row__name" title={row.name}>
                                        {shortPlayerName(row.name, 16)}
                                        <em>{row.position}</em>
                                    </span>
                                    <span className="progression-row__xp">+{row.gained} XP</span>
                                    <span className="progression-row__level">
                                        LV {row.level}
                                        {row.levelsGained > 0 && (
                                            <b>LEVEL UP! +{row.pointsGained} pts</b>
                                        )}
                                    </span>
                                    <div className="xp-bar">
                                        <i
                                            style={{
                                                width: `${row.xpNeeded ? Math.min(100, (row.xp / row.xpNeeded) * 100) : 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </section>
    )
}
