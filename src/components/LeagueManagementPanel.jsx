
import { useMemo, useState } from 'react'
import './LeagueManagementPanel.css'
import {
    getLeagueStandings,
    getNextUserFixture,
    getSeasonProgress,
    getTeamById,
} from '../services/leagueService'

const TABS = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'table', label: 'LEAGUE TABLE' },
    { id: 'fixtures', label: 'FIXTURES' },
]

function formatFixture(fixture) {
    if (!fixture.played) return 'VS'
    return `${fixture.homeGoals} - ${fixture.awayGoals}`
}

function getFixtureLabel(fixture) {
    const home = getTeamById(fixture.homeTeamId)
    const away = getTeamById(fixture.awayTeamId)

    return {
        home: home?.name || fixture.homeTeamId,
        away: away?.name || fixture.awayTeamId,
    }
}

export default function LeagueManagementPanel({
                                                  league,
                                                  onClose,
                                                  onStartFixture,
                                                  onNewSeason,
                                              }) {
    const [activeTab, setActiveTab] = useState('overview')
    const [selectedRound, setSelectedRound] = useState(1)

    const fixtures = league?.fixtures || []

    const standings = useMemo(
        () => getLeagueStandings(fixtures),
        [fixtures],
    )

    const progress = useMemo(
        () => getSeasonProgress(fixtures),
        [fixtures],
    )

    const nextFixture = useMemo(
        () => getNextUserFixture(fixtures),
        [fixtures],
    )

    const currentRoundFixtures = useMemo(
        () => fixtures.filter(
            (fixture) => fixture.round === selectedRound,
        ),
        [fixtures, selectedRound],
    )

    const bluePosition = standings.findIndex(
        (team) => team.teamId === 'blue',
    ) + 1

    const blueStats = standings.find(
        (team) => team.teamId === 'blue',
    )

    const champion = progress.completed ? standings[0] : null

    const openNextFixture = () => {
        if (nextFixture) onStartFixture(nextFixture)
    }

    return (
        <div className="league-overlay">
            <div className="league-modal">
                <header className="league-header">
                    <div>
                        <div className="league-eyebrow">
                            FOOTBALL LEAGUE
                        </div>
                        <h2>LEAGUE MANAGEMENT</h2>
                        <p>SEASON {league?.season || 2026}</p>
                    </div>

                    <button
                        type="button"
                        className="league-close"
                        onClick={onClose}
                        aria-label="Close league management"
                    >
                        ×
                    </button>
                </header>

                <nav className="league-tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={
                                activeTab === tab.id
                                    ? 'league-tab active'
                                    : 'league-tab'
                            }
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <main className="league-content">
                    {activeTab === 'overview' && (
                        <section className="league-overview">
                            <div className="league-stat-grid">
                                <div className="league-stat">
                                    <span>YOUR POSITION</span>
                                    <strong>
                                        {bluePosition ? `#${bluePosition}` : '-'}
                                    </strong>
                                </div>

                                <div className="league-stat">
                                    <span>POINTS</span>
                                    <strong>{blueStats?.points ?? 0}</strong>
                                </div>

                                <div className="league-stat">
                                    <span>PLAYED</span>
                                    <strong>{blueStats?.played ?? 0}/38</strong>
                                </div>

                                <div className="league-stat">
                                    <span>SEASON PROGRESS</span>
                                    <strong>{progress.percentage}%</strong>
                                </div>
                            </div>

                            <div className="league-progress">
                                <div
                                    className="league-progress-fill"
                                    style={{
                                        width: `${progress.percentage}%`,
                                    }}
                                />
                            </div>

                            <div className="league-next-match">
                                <div className="league-section-title">
                                    {progress.completed
                                        ? 'SEASON COMPLETED'
                                        : 'NEXT BLUE FC FIXTURE'}
                                </div>

                                {nextFixture ? (
                                    <>
                                        <div className="league-match-round">
                                            ROUND {nextFixture.round}
                                        </div>

                                        <div className="league-match-versus">
                                            <strong>
                                                {getFixtureLabel(nextFixture).home}
                                            </strong>
                                            <span>VS</span>
                                            <strong>
                                                {getFixtureLabel(nextFixture).away}
                                            </strong>
                                        </div>

                                        <button
                                            type="button"
                                            className="league-primary-button"
                                            onClick={openNextFixture}
                                        >
                                            START NEXT MATCH
                                        </button>
                                    </>
                                ) : (
                                    <div className="league-champion">
                                        <span>LEAGUE CHAMPION</span>
                                        <strong>
                                            {champion?.name || 'BLUE FC'}
                                        </strong>
                                        <button
                                            type="button"
                                            className="league-primary-button"
                                            onClick={onNewSeason}
                                        >
                                            START NEW SEASON
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="league-overview-footer">
                                <span>
                                    {progress.played} / {progress.total} matches completed
                                </span>
                                <span>
                                    {progress.userPlayed} / {progress.userTotal} BLUE FC matches
                                </span>
                            </div>
                        </section>
                    )}

                    {activeTab === 'table' && (
                        <section>
                            <div className="league-section-title">
                                LEAGUE STANDINGS
                            </div>

                            <div className="league-table-wrap">
                                <table className="league-table">
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>CLUB</th>
                                        <th>P</th>
                                        <th>W</th>
                                        <th>D</th>
                                        <th>L</th>
                                        <th>GD</th>
                                        <th>PTS</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {standings.map((team, index) => (
                                        <tr
                                            key={team.teamId}
                                            className={
                                                team.teamId === 'blue'
                                                    ? 'user-team-row'
                                                    : ''
                                            }
                                        >
                                            <td>{index + 1}</td>
                                            <td className="league-team-name">
                                                {team.name}
                                            </td>
                                            <td>{team.played}</td>
                                            <td>{team.won}</td>
                                            <td>{team.drawn}</td>
                                            <td>{team.lost}</td>
                                            <td>
                                                {team.goalDifference > 0
                                                    ? `+${team.goalDifference}`
                                                    : team.goalDifference}
                                            </td>
                                            <td className="league-points">
                                                {team.points}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="league-table-note">
                                P: Played · W: Won · D: Drawn · L: Lost · GD: Goal Difference · PTS: Points
                            </p>
                        </section>
                    )}

                    {activeTab === 'fixtures' && (
                        <section>
                            <div className="league-fixture-toolbar">
                                <div className="league-section-title">
                                    SEASON FIXTURES
                                </div>

                                <select
                                    value={selectedRound}
                                    onChange={(event) =>
                                        setSelectedRound(
                                            Number(event.target.value),
                                        )
                                    }
                                >
                                    {Array.from(
                                        { length: 38 },
                                        (_, index) => index + 1,
                                    ).map((round) => (
                                        <option key={round} value={round}>
                                            Round {round}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="league-fixture-list">
                                {currentRoundFixtures.map((fixture) => {
                                    const labels = getFixtureLabel(fixture)
                                    const isUserFixture =
                                        fixture.homeTeamId === 'blue' ||
                                        fixture.awayTeamId === 'blue'

                                    return (
                                        <div
                                            key={fixture.id}
                                            className={[
                                                'league-fixture',
                                                isUserFixture ? 'user-fixture' : '',
                                            ].join(' ')}
                                        >
                                            <span className="league-fixture-team home">
                                                {labels.home}
                                            </span>

                                            <strong className="league-fixture-score">
                                                {formatFixture(fixture)}
                                            </strong>

                                            <span className="league-fixture-team away">
                                                {labels.away}
                                            </span>

                                            <span className="league-fixture-status">
                                                {fixture.played ? 'FT' : 'UPCOMING'}
                                            </span>

                                            {isUserFixture && !fixture.played && (
                                                <button
                                                    type="button"
                                                    className="league-fixture-play"
                                                    onClick={() => onStartFixture(fixture)}
                                                >
                                                    PLAY
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}

                                {currentRoundFixtures.length === 0 && (
                                    <p className="league-empty">
                                        No fixtures available for this round.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    )
}
