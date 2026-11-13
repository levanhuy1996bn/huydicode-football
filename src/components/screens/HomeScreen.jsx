import SettingsRows from '../SettingsRows'
import { SIM_DAILY_LIMIT } from '../../services/quickSim'
import { fixtureLabel } from '../../services/cupService'
import ClubCrest from '../ClubCrest'
import { worldClub } from '../../data/world'
import { nationStrength } from '../../services/nationalTeams'
import { isUserClub, userClubId, userTeam } from '../../services/career'
// Màn hình chính (ngoài trận) — kiểu sảnh của FIFA Online:
// trận tiếp theo, bảng xếp hạng thu gọn, kết quả gần nhất, đội hình,
// CLB, tiến độ mùa giải và cài đặt.

function TeamBadge({ clubId, name, strength, position, side }) {
    return (
        <div className={`home-team home-team--${side}`}>
            {/* Phase 26B: huy hiệu CLB */}
            <ClubCrest clubId={clubId} size={68} className="home-team__badge" />
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
    onOpenDevelopment,
    onNewSeason,
    onChangeClub,
    simsLeft = 0,
    onSimulate,
    // Phase 29E: World Cup
    worldCup = null,
    onChooseNation,
    onPlayWorldCup,
    onSkipWorldCup,
    onOpenWorldCup,
}) {
    const bluePosition = standings.findIndex((team) => isUserClub(team.teamId)) + 1
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
                            NEXT MATCH · {fixtureLabel(nextMatch.fixture)} ·{' '}
                            {nextMatch.isHome ? 'HOME' : 'AWAY'}
                        </div>

                        <div className="home-hero__teams">
                            <TeamBadge
                                side="home"
                                clubId={userClubId()}
                                name={userTeam().name}
                                strength={nextMatch.blueStrength}
                                position={bluePosition}
                            />
                            <div className="home-hero__vs">VS</div>
                            <TeamBadge
                                side="away"
                                clubId={nextMatch.opponent.id}
                                name={nextMatch.opponent.name}
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
                            {/* Phase 28 */}
                            <button
                                type="button"
                                className="btn btn--sim btn--large"
                                onClick={onSimulate}
                                disabled={!simsLeft}
                                title="Quick simulation: instant result, rewards ×0.7 · 5 per day"
                            >
                                SIMULATE <small>{simsLeft}/{SIM_DAILY_LIMIT}</small>
                            </button>
                        </div>
                    </>
                ) : worldCup?.phase === 'due' ? (
                    <>
                        <div className="home-hero__eyebrow">SEASON COMPLETE · SUMMER BREAK</div>
                        <div className="home-hero__title">WORLD CUP {worldCup.edition}</div>
                        <p className="home-hero__text">
                            32 nations, 8 groups of 4, then knockout rounds. Choose the national team you will manage — the best
                            players of that nation are called up from every club, your own cards included.
                        </p>
                        <div className="home-hero__actions">
                            <button type="button" className="btn btn--primary btn--large" onClick={onChooseNation}>
                                CHOOSE YOUR NATION
                            </button>
                            <button type="button" className="btn" onClick={onSkipWorldCup} title="Simulate the whole tournament (no trophy or prizes)">
                                SKIP WORLD CUP
                            </button>
                        </div>
                    </>
                ) : worldCup?.phase === 'active' && worldCup.fixture ? (
                    <>
                        <div className="home-hero__eyebrow">
                            NEXT MATCH · {fixtureLabel(worldCup.fixture)} · NEUTRAL VENUE
                        </div>
                        <div className="home-hero__teams">
                            <TeamBadge
                                side="home"
                                clubId={worldCup.nationId}
                                name={worldClub(worldCup.nationId)?.name}
                                strength={nationStrength(worldCup.nationId)}
                            />
                            <div className="home-hero__vs">VS</div>
                            <TeamBadge
                                side="away"
                                clubId={worldCup.opponentId}
                                name={worldClub(worldCup.opponentId)?.name}
                                strength={nationStrength(worldCup.opponentId)}
                            />
                        </div>
                        <div className="home-hero__actions">
                            <button type="button" className="btn btn--primary btn--large" onClick={onPlayWorldCup}>
                                PLAY MATCH
                            </button>
                            <button type="button" className="btn" onClick={onOpenWorldCup}>WORLD CUP</button>
                            <button type="button" className="btn" onClick={onSkipWorldCup} title="Simulate the rest of the tournament (no trophy or prizes)">
                                SIMULATE REST
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {worldCup?.phase === 'done' && (
                            <div className="home-hero__wc">
                                World Cup {worldCup.edition}: {worldClub(worldCup.nationId)?.name} · {worldCup.standing || '—'}
                                {worldCup.skipped ? ' (simulated)' : ''} · champions <b>{worldClub(worldCup.champion)?.name}</b>{' '}
                                <button type="button" className="link-btn" onClick={onOpenWorldCup}>DETAILS →</button>
                            </div>
                        )}
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
                                <tr key={team.teamId} className={isUserClub(team.teamId) ? 'is-user' : ''}>
                                    <td>{index + 1}</td>
                                    <td><span className="home-table__club"><ClubCrest clubId={team.teamId} size={15} />{team.name}</span></td>
                                    <td>{team.played}</td>
                                    <td>{team.goalDifference}</td>
                                    <td><b>{team.points}</b></td>
                                </tr>
                            ))}
                            {showBlueRow && blueRow && (
                                <tr className="is-user is-separated">
                                    <td>{bluePosition}</td>
                                    <td><span className="home-table__club"><ClubCrest clubId={blueRow.teamId} size={15} />{blueRow.name}</span></td>
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
                                {userTeam().name} <b>{lastResult.blueGoals} – {lastResult.opponentGoals}</b>{' '}
                                {lastResult.opponentName}
                            </div>
                            <small>{lastResult.label || `ROUND ${lastResult.round}`}</small>
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
                        <div><b>{squad.size}/50</b><small>PLAYERS</small></div>
                        <div><b>{squad.value}</b><small>SQUAD VALUE</small></div>
                    </div>
                    <div className="home-card__head home-card__head--spaced">
                        <span>PLAYER DEVELOPMENT</span>
                        <button type="button" className="link-btn" onClick={onOpenDevelopment}>
                            LEVEL UP →
                        </button>
                    </div>
                    <p className="home-card__empty">
                        {squad.unspentPoints > 0
                            ? <><b className="points-callout">{squad.unspentPoints} attribute points</b> waiting to be spent.</>
                            : 'Players earn XP every match and gain attribute points when they level up.'}
                    </p>
                    <div className="home-card__head home-card__head--spaced">
                        <span>TRANSFERS</span>
                        <button type="button" className="link-btn" onClick={onOpenClub}>
                            TRANSFER MARKET →
                        </button>
                    </div>
                    <p className="home-card__empty">Sign and sell players, contracts and wages.</p>
                </div>

                {/* Cài đặt */}
                <div className="home-card">
                    <div className="home-card__head"><span>SETTINGS</span></div>
                    {/* Phase 29G: dùng chung với nút ⚙ trên header (SettingsRows). */}
                    <SettingsRows settings={settings} onSettingsChange={onSettingsChange} onChangeClub={onChangeClub} />
                </div>
            </div>
        </section>
    )
}
