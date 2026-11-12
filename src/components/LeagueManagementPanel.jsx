
import { useMemo, useState } from 'react'
import './LeagueManagementPanel.css'
import {
    getLeagueStandings,
    getNextUserFixture,
    getSeasonProgress,
    getTeamById,
} from '../services/leagueService'
import { isUserClub, userTeam } from '../services/career'
import { COUNTRIES, COUNTRY_BY_ID, LEAGUE_BY_ID } from '../data/world'
import { buildSeasonPlayerStats } from '../services/seasonStats'
import { leagueView, zoneOf } from '../services/worldService'
import ClubCrest from './ClubCrest'
import { DifficultyPicker } from './screens/PreMatchScreen'
import { DEFAULT_DIFFICULTY, difficultyOf } from '../services/difficulty'

const ZONE_LABELS = {
    c1: 'Continental Cup (C1)',
    c2: 'Second continental cup (C2)',
    promotion: 'Promotion',
    relegation: 'Relegation',
}

// Phase 22: bỏ OVERVIEW, bảng xếp hạng là tab đầu; thêm thống kê cầu thủ toàn
// giải; FIXTURES chỉ còn các trận của đội mình, hiện hết một lượt.
const TABS = [
    { id: 'table', label: 'LEAGUE TABLE' },
    { id: 'players', label: 'PLAYER STATS' },
    { id: 'fixtures', label: 'FIXTURES' }, // + tên CLB người chơi (Phase 26B)
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
        (fixture) => fixture.played && (isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId)),
    ).length
}

export default function LeagueManagementPanel({
                                                  league,
                                                  world = null,
                                                  difficultyLocked = false,
                                                  onDifficultyChange,
                                                  onClose,
                                                  onStartFixture,
                                                  onNewSeason,
                                              }) {
    const [activeTab, setActiveTab] = useState('table')
    const [sortKey, setSortKey] = useState('goals')
    const [clubFilter, setClubFilter] = useState('all') // 'all' | 'mine'

    const fixtures = league?.fixtures || []
    const userLeagueId = league?.leagueId || 'eng1'
    const [viewLeagueId, setViewLeagueId] = useState(userLeagueId)
    const viewLeague = LEAGUE_BY_ID.get(viewLeagueId) || LEAGUE_BY_ID.get(userLeagueId)
    const viewCountry = COUNTRY_BY_ID.get(viewLeague?.countryId)
    const userLeague = LEAGUE_BY_ID.get(userLeagueId)

    const standings = useMemo(
        () => getLeagueStandings(fixtures, league?.clubIds || null),
        [fixtures, league?.clubIds],
    )

    // Phase 26A: bảng của giải đang xem (giải người chơi hoặc giải ảo, chạy
    // tới cùng vòng với giải người chơi).
    const view = useMemo(
        () => (world ? leagueView(world, league, viewLeague.id) : null),
        [world, league, viewLeague.id],
    )
    const viewStandings = view?.standings || standings
    const viewRounds = view?.isUserLeague === false ? view.rounds : null

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
            .filter((fixture) => isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId))
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
            .filter((row) => clubFilter === 'all' || isUserClub(row.clubId))
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
        (team) => isUserClub(team.teamId),
    ) + 1

    const blueStats = standings.find(
        (team) => isUserClub(team.teamId),
    )

    const champion = progress.completed ? standings[0] : null

    const fixtureResult = (fixture) => {
        if (!fixture.played) return null

        const isHome = isUserClub(fixture.homeTeamId)
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
                            {userLeague ? `${userLeague.country.toUpperCase()} · ${userLeague.name.toUpperCase()}` : 'FOOTBALL LEAGUE'}
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
                            {tab.id === 'fixtures' ? `${userTeam().shortName} FIXTURES` : tab.label}
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

                            <div className="league-difficulty">
                                <DifficultyPicker
                                    difficulty={difficultyOf(league?.difficulty || DEFAULT_DIFFICULTY)}
                                    locked={difficultyLocked}
                                    onChange={onDifficultyChange}
                                />
                            </div>

                            {champion && (
                                <div className="league-champion-banner">
                                    LEAGUE CHAMPION · <strong>{champion.name}</strong>
                                    {zoneOf(userLeagueId, bluePosition) === 'promotion' && <> · {userTeam().shortName} PROMOTED</>}
                                    {zoneOf(userLeagueId, bluePosition) === 'relegation' && <> · {userTeam().shortName} RELEGATED</>}
                                </div>
                            )}

                            {world && (
                                <div className="league-picker">
                                    <select
                                        value={viewLeague.countryId}
                                        onChange={(event) => {
                                            const next = COUNTRY_BY_ID.get(event.target.value)
                                            if (next) setViewLeagueId(next.topLeagueId)
                                        }}
                                        aria-label="Country"
                                    >
                                        {COUNTRIES.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <div className="segmented" role="radiogroup" aria-label="Division">
                                        {[viewCountry?.topLeagueId, viewCountry?.secondLeagueId].filter(Boolean).map((id) => (
                                            <button
                                                key={id}
                                                type="button"
                                                role="radio"
                                                aria-checked={viewLeague.id === id}
                                                className={viewLeague.id === id ? 'segmented__btn active' : 'segmented__btn'}
                                                onClick={() => setViewLeagueId(id)}
                                            >
                                                {LEAGUE_BY_ID.get(id)?.name.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    {viewLeague.id !== userLeagueId && (
                                        <button
                                            type="button"
                                            className="league-chip"
                                            onClick={() => setViewLeagueId(userLeagueId)}
                                        >
                                            MY LEAGUE
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="league-section-title">
                                {viewLeague ? viewLeague.name.toUpperCase() : 'LEAGUE'} STANDINGS
                                {viewRounds != null && <small> · AFTER ROUND {viewRounds}/38</small>}
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
                                    {viewStandings.map((team, index) => {
                                        const zone = zoneOf(viewLeague.id, index + 1)

                                        return (
                                        <tr
                                            key={team.teamId}
                                            className={[
                                                isUserClub(team.teamId) ? 'user-team-row' : '',
                                                zone ? `zone-${zone}` : '',
                                            ].join(' ')}
                                            title={zone ? ZONE_LABELS[zone] : undefined}
                                        >
                                            <td className="league-pos">{index + 1}</td>
                                            <td className="league-team-name">
                                                <span className="league-team-cell">
                                                    <ClubCrest clubId={team.teamId} size={18} />
                                                    {team.name}
                                                </span>
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
                                        )
                                    })}
                                    </tbody>
                                </table>
                            </div>

                            {view?.rounds > 0 && (
                                <>
                                    <div className="league-section-title league-section-title--spaced">
                                        ROUND {view.rounds} RESULTS
                                    </div>
                                    <div className="league-fixture-list league-fixture-list--compact">
                                        {view.fixtures
                                            .filter((fixture) => fixture.round === view.rounds)
                                            .map((fixture) => (
                                                <div key={fixture.id} className="league-fixture">
                                                    <span className="league-fixture-team league-fixture-team--home">
                                                        {getTeamById(fixture.homeTeamId)?.name}
                                                        <ClubCrest clubId={fixture.homeTeamId} size={16} />
                                                    </span>
                                                    <strong className="league-fixture-score">{formatFixture(fixture)}</strong>
                                                    <span className="league-fixture-team">
                                                        <ClubCrest clubId={fixture.awayTeamId} size={16} />
                                                        {getTeamById(fixture.awayTeamId)?.name}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}

                            <div className="league-zone-legend">
                                {(viewLeague?.tier === 2 ? ['promotion'] : ['c1', 'c2', 'relegation']).map((zone) => (
                                    <span key={zone} className={`zone-key zone-key--${zone}`}>{ZONE_LABELS[zone]}</span>
                                ))}
                            </div>

                            <p className="league-table-note">
                                P: Played · W: Won · D: Drawn · L: Lost · GD: Goal Difference · PTS: Points
                                {viewRounds != null && ' · Other leagues are simulated and move forward with your matches.'}
                            </p>
                        </section>
                    )}

                    {activeTab === 'players' && (
                        <section>
                            <div className="league-fixture-toolbar">
                                <div className="league-section-title">
                                    SEASON PLAYER STATS · {userLeague?.name.toUpperCase() || 'ALL 20 CLUBS'}
                                </div>

                                <div className="segmented" role="radiogroup" aria-label="Club filter">
                                    {[['all', 'ALL CLUBS'], ['mine', userTeam().shortName]].map(([id, label]) => (
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
                                            <tr key={row.key} className={isUserClub(row.clubId) ? 'user-team-row' : ''}>
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
                                Clean sheets count goalkeepers only. {userTeam().name} matches use the real match stats;
                                other matches are simulated from their score.
                            </p>
                        </section>
                    )}

                    {activeTab === 'fixtures' && (
                        <section>
                            <div className="league-section-title">
                                {userTeam().name} · SEASON FIXTURES
                            </div>

                            <div className="league-fixture-list">
                                {userFixtures.map((fixture) => {
                                    const isHome = isUserClub(fixture.homeTeamId)
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
                                                <ClubCrest clubId={opponent?.id} size={16} />
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
