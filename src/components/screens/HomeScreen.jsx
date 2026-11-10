import { USER_TEAM } from '../../data/leagueData'
// Màn hình chính (ngoài trận) — kiểu sảnh của FIFA Online:
// trận tiếp theo, bảng xếp hạng thu gọn, kết quả gần nhất, đội hình,
// CLB, tiến độ mùa giải và cài đặt.

const MATCH_LENGTHS = [
    [180, '3 MIN'],
    [360, '6 MIN'],
    [600, '10 MIN'],
]

const LABEL_MODES = [
    ['smart', 'SMART'],
    ['all', 'ALL'],
    ['off', 'OFF'],
]

function TeamBadge({ name, shortName, color, strength, position, side }) {
    return (
        <div className={`home-team home-team--${side}`}>
            <div className="home-team__crest" style={{ '--crest': color }}>
                {shortName}
            </div>
            <div className="home-team__name">{name}</div>
            <div className="home-team__meta">
                {position ? `${position}${ordinal(position)} · ` : ''}STR {strength}
            </div>
        </div>
    )
}

function ordinal(value) {
    if (value % 100 >= 11 && value % 100 <= 13) return 'th'
    if (value % 10 === 1) return 'st'
    if (value % 10 === 2) return 'nd'
    if (value % 10 === 3) return 'rd'

    return 'th'
}

export default function HomeScreen({
    nextMatch,
    champion,
    standings,
    lastResult,
    squad,
    progress,
    settings,
    onSettingsChange,
    onPlay,
    onEditLineup,
    onOpenLeague,
    onOpenClub,
    onNewSeason,
}) {
    const bluePosition = standings.findIndex((team) => team.teamId === 'blue') + 1
    const topRows = standings.slice(0, 6)
    const blueRow = standings[bluePosition - 1]
    const showBlueRow = bluePosition > 6

    return (
        <section className="screen home-screen">
            {/* Trận tiếp theo */}
            <div className="home-hero">
                {nextMatch ? (
                    <>
                        <div className="home-hero__eyebrow">
                            NEXT MATCH · ROUND {nextMatch.fixture.round} ·{' '}
                            {nextMatch.isHome ? 'HOME' : 'AWAY'}
                        </div>

                        <div className="home-hero__teams">
                            <TeamBadge
                                side="home"
                                name={USER_TEAM.name}
                                shortName={USER_TEAM.shortName}
                                color={USER_TEAM.color}
                                strength={nextMatch.blueStrength}
                                position={bluePosition}
                            />
                            <div className="home-hero__vs">VS</div>
                            <TeamBadge
                                side="away"
                                name={nextMatch.opponent.name}
                                shortName={nextMatch.opponent.shortName}
                                color={nextMatch.opponentColor}
                                strength={nextMatch.opponent.strength}
                                position={nextMatch.opponentPosition}
                            />
                        </div>

                        <div className="home-hero__actions">
                            <button type="button" className="btn btn--primary btn--large" onClick={onPlay}>
                                PLAY MATCH
                            </button>
                            <button type="button" className="btn" onClick={onEditLineup}>
                                EDIT LINEUP
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="home-hero__eyebrow">SEASON COMPLETE</div>
                        <div className="home-hero__title">
                            {champion ? `${champion.name} ARE CHAMPIONS` : 'SEASON FINISHED'}
                        </div>
                        <div className="home-hero__actions">
                            <button type="button" className="btn btn--primary btn--large" onClick={onNewSeason}>
                                START NEW SEASON
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="home-grid">
                {/* Bảng xếp hạng thu gọn */}
                <div className="home-card home-card--table">
                    <div className="home-card__head">
                        <span>LEAGUE TABLE</span>
                        <button type="button" className="link-btn" onClick={onOpenLeague}>
                            FULL TABLE →
                        </button>
                    </div>
                    <table className="mini-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>TEAM</th>
                                <th>P</th>
                                <th>GD</th>
                                <th>PTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topRows.map((team, index) => (
                                <tr key={team.teamId} className={team.teamId === 'blue' ? 'is-user' : ''}>
                                    <td>{index + 1}</td>
                                    <td>{team.name}</td>
                                    <td>{team.played}</td>
                                    <td>{team.goalDifference}</td>
                                    <td><b>{team.points}</b></td>
                                </tr>
                            ))}
                            {showBlueRow && blueRow && (
                                <tr className="is-user is-separated">
                                    <td>{bluePosition}</td>
                                    <td>{blueRow.name}</td>
                                    <td>{blueRow.played}</td>
                                    <td>{blueRow.goalDifference}</td>
                                    <td><b>{blueRow.points}</b></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Kết quả gần nhất + mùa giải */}
                <div className="home-card">
                    <div className="home-card__head"><span>LAST RESULT</span></div>
                    {lastResult ? (
                        <div className="last-result">
                            <span className={`result-dot result-dot--${lastResult.outcome}`}>
                                {lastResult.outcome.toUpperCase()}
                            </span>
                            <div className="last-result__score">
                                {USER_TEAM.name} <b>{lastResult.blueGoals} – {lastResult.opponentGoals}</b>{' '}
                                {lastResult.opponentName}
                            </div>
                            <small>ROUND {lastResult.round}</small>
                        </div>
                    ) : (
                        <p className="home-card__empty">No matches played yet this season.</p>
                    )}

                    <div className="home-card__head home-card__head--spaced"><span>SEASON</span></div>
                    <div className="season-progress">
                        <div className="season-progress__bar">
                            <i style={{ width: `${progress.userTotal ? (progress.userPlayed / progress.userTotal) * 100 : 0}%` }} />
                        </div>
                        <div className="season-progress__meta">
                            <span>{progress.userPlayed}/{progress.userTotal} played</span>
                            <span>
                                <b className="w">{progress.won}W</b> <b className="d">{progress.drawn}D</b>{' '}
                                <b className="l">{progress.lost}L</b>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Đội hình */}
                <div className="home-card">
                    <div className="home-card__head">
                        <span>SQUAD</span>
                        <button type="button" className="link-btn" onClick={onEditLineup}>
                            LINEUP →
                        </button>
                    </div>
                    <div className="stat-tiles">
                        <div><b>{squad.formation}</b><small>FORMATION</small></div>
                        <div><b>{squad.averageOverall}</b><small>AVG OVR (XI)</small></div>
                        <div><b>{squad.size}</b><small>PLAYERS</small></div>
                        <div><b>{squad.value}</b><small>SQUAD VALUE</small></div>
                    </div>
                    <div className="home-card__head home-card__head--spaced">
                        <span>CLUB</span>
                        <button type="button" className="link-btn" onClick={onOpenClub}>
                            CLUB MANAGEMENT →
                        </button>
                    </div>
                    <p className="home-card__empty">Transfers, contracts and wages.</p>
                </div>

                {/* Cài đặt */}
                <div className="home-card">
                    <div className="home-card__head"><span>SETTINGS</span></div>
                    <div className="setting-row">
                        <span>Match length</span>
                        <div className="segmented">
                            {MATCH_LENGTHS.map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={settings.matchDuration === value ? 'is-active' : ''}
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
                    <p className="home-card__empty">
                        Match length is real time for 90 minutes of play.
                    </p>
                </div>
            </div>
        </section>
    )
}
