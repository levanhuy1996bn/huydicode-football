
import { useMemo, useState } from 'react'
import './LeagueManagementPanel.css'
import {
    getLeagueStandings,
    getNextUserFixture,
    getSeasonProgress,
    getTeamById,
} from '../services/leagueService'
import { USER_TEAM } from '../data/leagueData'
import { buildSeasonPlayerStats } from '../services/seasonStats'

// Phase 22: bỏ OVERVIEW, bảng xếp hạng là tab đầu; thêm thống kê cầu thủ toàn
// giải; FIXTURES chỉ còn các trận của đội mình, hiện hết một lượt.
const TABS = [
    { id: 'table', label: 'LEAGUE TABLE' },
    { id: 'players', label: 'PLAYER STATS' },
    { id: 'fixtures', label: `${USER_TEAM.shortName} FIXTURES` },
]

// Cột thống kê cầu thủ. minApps: số trận tối thiểu để được xếp hạng ở cột tỉ lệ.
const STAT_COLUMNS = [
    { id: 'goals', label: 'GOALS', short: 'G', title: 'Goals' },
    { id: 'assists', label: 'ASSISTS', short: 'A', title: 'Assists' },
    { id: 'cleanSheets', label: 'CLEAN SHEETS', short: 'CS', title: 'Clean sheets (goalkeepers)' },
    { id: 'passAccuracy', label: 'PASS %', short: 'PASS %', title: 'Pass accuracy', ratio: true },
    { id: 'averageRating', label: 'RATING', short: 'RAT', title: 'Average match rating', ratio: true },
    { id: 'apps', label: 'APPS', short: 'APP', title: 'Appearances' },
]

const LIST_LIMIT = 50

function minAppsFor(roundsPlayed) {
    return Math.max(1, Math.ceil(roundsPlayed * 0.3))
}

function clubShort(clubId) {
    return getTeamById(clubId)?.shortName || String(clubId).toUpperCase()
}

function formatFixture(fixture) {
    if (!fixture.played) return 'VS'
    return `${fixture.homeGoals} - ${fixture.awayGoals}`
}

function blueStatsPlayed(fixtures) {
    return fixtures.filter(
        (fixture) => fixture.played && (fixture.homeTeamId === 'blue' || fixture.awayTeamId === 'blue'),
    ).length
}

export default function LeagueManagementPanel({
                                                  league,
                                                  onClose,
                                                  onStartFixture,
                                                  onNewSeason,
                                              }) {
    const [activeTab, setActiveTab] = useState('table')
    const [sortKey, setSortKey] = useState('goals')
    const [clubFilter, setClubFilter] = useState('all') // 'all' | 'blue'

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

    // Toàn bộ 38 trận của đội mình, theo thứ tự vòng đấu.
    const userFixtures = useMemo(
        () => fixtures
            .filter((fixture) => fixture.homeTeamId === 'blue' || fixture.awayTeamId === 'blue')
            .sort((a, b) => a.round - b.round),
        [fixtures],
    )

    const seasonPlayers = useMemo(
        () => (activeTab === 'players' ? buildSeasonPlayerStats(league) : []),
        [league, activeTab],
    )

    const roundsPlayed = blueStatsPlayed(fixtures)
    const minApps = minAppsFor(roundsPlayed)
    const sortColumn = STAT_COLUMNS.find((column) => column.id === sortKey) || STAT_COLUMNS[0]

    const playerRows = useMemo(() => {
        return seasonPlayers
            .filter((row) => clubFilter === 'all' || row.clubId === 'blue')
            .filter((row) => (sortColumn.ratio ? row.apps >= minApps && row[sortKey] != null : true))
            .filter((row) => (sortKey === 'cleanSheets' ? row.position === 'GK' : true))
            .sort((a, b) =>
                (b[sortKey] ?? -1) - (a[sortKey] ?? -1) ||
                b.goals - a.goals ||
                b.assists - a.assists ||
                a.name.localeCompare(b.name),
            )
            .slice(0, LIST_LIMIT)
    }, [seasonPlayers, clubFilter, sortKey, sortColumn, minApps])

    const bluePosition = standings.findIndex(
        (team) => team.teamId === 'blue',
    ) + 1

    const blueStats = standings.find(
        (team) => team.teamId === 'blue',
    )

    const champion = progress.completed ? standings[0] : null

    const fixtureResult = (fixture) => {
        if (!fixture.played) return null

        const isHome = fixture.homeTeamId === 'blue'
        const own = isHome ? fixture.homeGoals : fixture.awayGoals
        const other = isHome ? fixture.awayGoals : fixture.homeGoals

        return own > other ? 'W' : own < other ? 'L' : 'D'
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
                    {activeTab === 'table' && (
                        <section>
                            <div className="league-summary">
                                <div><span>POSITION</span><strong>{bluePosition ? `#${bluePosition}` : '-'}</strong></div>
                                <div><span>POINTS</span><strong>{blueStats?.points ?? 0}</strong></div>
                                <div><span>PLAYED</span><strong>{blueStats?.played ?? 0}/38</strong></div>
                                <div><span>SEASON</span><strong>{progress.percentage}%</strong></div>
                                {nextFixture ? (
                                    <button
                                        type="button"
                                        className="league-primary-button"
                                        onClick={() => onStartFixture(nextFixture)}
                                    >
                                        PLAY ROUND {nextFixture.round}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="league-primary-button"
                                        onClick={onNewSeason}
                                    >
                                        START NEW SEASON
                                    </button>
                                )}
                            </div>

                            {champion && (
                                <div className="league-champion-banner">
                                    LEAGUE CHAMPION · <strong>{champion.name}</strong>
                                </div>
                            )}

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

                    {activeTab === 'players' && (
                        <section>
                            <div className="league-fixture-toolbar">
                                <div className="league-section-title">
                                    SEASON PLAYER STATS · ALL 20 CLUBS
                                </div>

                                <div className="segmented" role="radiogroup" aria-label="Club filter">
                                    {[['all', 'ALL CLUBS'], ['blue', USER_TEAM.shortName]].map(([id, label]) => (
                                        <button
                                            key={id}
                                            type="button"
                                            role="radio"
                                            aria-checked={clubFilter === id}
                                            className={clubFilter === id ? 'segmented__btn active' : 'segmented__btn'}
                                            onClick={() => setClubFilter(id)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="league-stat-chips" role="tablist" aria-label="Sort by">
                                {STAT_COLUMNS.map((column) => (
                                    <button
                                        key={column.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={sortKey === column.id}
                                        className={sortKey === column.id ? 'league-chip active' : 'league-chip'}
                                        onClick={() => setSortKey(column.id)}
                                    >
                                        {column.label}
                                    </button>
                                ))}
                            </div>

                            {playerRows.length === 0 ? (
                                <p className="league-empty">
                                    No player stats yet. Play or simulate a round to fill the table.
                                </p>
                            ) : (
                                <div className="league-table-wrap">
                                    <table className="league-table league-player-table">
                                        <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>PLAYER</th>
                                            <th>CLUB</th>
                                            {STAT_COLUMNS.map((column) => (
                                                <th
                                                    key={column.id}
                                                    title={column.title}
                                                    aria-sort={sortKey === column.id ? 'descending' : 'none'}
                                                    className={sortKey === column.id ? 'is-sorted' : ''}
                                                >
                                                    <button type="button" onClick={() => setSortKey(column.id)}>
                                                        {column.short}
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {playerRows.map((row, index) => (
                                            <tr key={row.key} className={row.clubId === 'blue' ? 'user-team-row' : ''}>
                                                <td>{index + 1}</td>
                                                <td className="league-team-name">
                                                    {row.name}
                                                    <small className="league-player-pos">{row.position}</small>
                                                </td>
                                                <td>{clubShort(row.clubId)}</td>
                                                <td className={sortKey === 'goals' ? 'league-points' : ''}>{row.goals}</td>
                                                <td className={sortKey === 'assists' ? 'league-points' : ''}>{row.assists}</td>
                                                <td className={sortKey === 'cleanSheets' ? 'league-points' : ''}>{row.position === 'GK' ? row.cleanSheets : '–'}</td>
                                                <td className={sortKey === 'passAccuracy' ? 'league-points' : ''}>{row.passAccuracy != null ? `${row.passAccuracy}%` : '–'}</td>
                                                <td className={sortKey === 'averageRating' ? 'league-points' : ''}>{row.averageRating != null ? row.averageRating.toFixed(2) : '–'}</td>
                                                <td className={sortKey === 'apps' ? 'league-points' : ''}>{row.apps}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <p className="league-table-note">
                                Top {LIST_LIMIT} players. Pass % and rating rank players with at least {minApps} appearance{minApps === 1 ? '' : 's'}.
                                Clean sheets count goalkeepers only. {USER_TEAM.name} matches use the real match stats;
                                other matches are simulated from their score.
                            </p>
                        </section>
                    )}

                    {activeTab === 'fixtures' && (
                        <section>
                            <div className="league-section-title">
                                {USER_TEAM.name} · SEASON FIXTURES
                            </div>

                            <div className="league-fixture-list">
                                {userFixtures.map((fixture) => {
                                    const isHome = fixture.homeTeamId === 'blue'
                                    const opponent = getTeamById(isHome ? fixture.awayTeamId : fixture.homeTeamId)
                                    const result = fixtureResult(fixture)
                                    const isNext = nextFixture?.id === fixture.id

                                    return (
                                        <div
                                            key={fixture.id}
                                            className={[
                                                'league-fixture',
                                                'league-fixture--user',
                                                isNext ? 'is-next' : '',
                                            ].join(' ')}
                                        >
                                            <span className="league-fixture-round">R{fixture.round}</span>
                                            <span className={`league-fixture-venue league-fixture-venue--${isHome ? 'home' : 'away'}`}>
                                                {isHome ? 'H' : 'A'}
                                            </span>
                                            <span className="league-fixture-team">
                                                {opponent?.name || 'Unknown'}
                                            </span>
                                            <strong className="league-fixture-score">
                                                {formatFixture(fixture)}
                                            </strong>
                                            {result ? (
                                                <span className={`league-result league-result--${result}`}>{result}</span>
                                            ) : isNext ? (
                                                <button
                                                    type="button"
                                                    className="league-fixture-play"
                                                    onClick={() => onStartFixture(fixture)}
                                                >
                                                    PLAY
                                                </button>
                                            ) : (
                                                <span className="league-fixture-status">UPCOMING</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    )
}
