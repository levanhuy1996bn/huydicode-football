import { useMemo, useState } from 'react'
import ClubCrest from '../ClubCrest'
import TrophyIcon from '../TrophyIcon'
import { LEAGUE_BY_ID, worldClub } from '../../data/world'
import { getLeagueStandings, getSeasonProgress } from '../../services/leagueService'
import { userCupRun } from '../../services/cupService'
import { userClubId } from '../../services/career'
import {
    DIFFICULTY_STARS,
    careerSummary,
    cupRunLabel,
    difficultyLabel,
    seasonLabel,
    trophyCabinet,
} from '../../services/trophyService'

// Phase 28B: phòng truyền thống — kệ cúp (C1, C2, 18 giải hạng nhất, 18 giải
// hạng hai), chi tiết từng cúp, số liệu và bảng sự nghiệp theo mùa.
const SHELVES = [
    ['CONTINENTAL', (entry) => entry.kind === 'c1' || entry.kind === 'c2'],
    ['TOP DIVISIONS', (entry) => entry.kind === 'top'],
    ['SECOND DIVISIONS', (entry) => entry.kind === 'second'],
]

function StarChip({ difficulty }) {
    const star = DIFFICULTY_STARS[difficulty]

    return (
        <span className="trophy-diff">
            {star && <i style={{ color: star.color }}>★</i>}
            {difficultyLabel(difficulty)}
        </span>
    )
}

export default function TrophyRoomScreen({ world, league, onBack }) {
    const cabinet = useMemo(() => trophyCabinet(world?.trophies || []), [world])

    // Mùa đang đá (chưa có trong world.career).
    const liveRow = useMemo(() => {
        if (!league?.fixtures?.length) return null

        const table = getLeagueStandings(league.fixtures, league.clubIds)
        const progress = getSeasonProgress(league.fixtures)

        return {
            season: league.season,
            clubId: userClubId(),
            leagueId: league.leagueId,
            position: progress.userPlayed > 0 ? table.findIndex((row) => row.teamId === userClubId()) + 1 : null,
            difficulty: league.difficulty || null,
            cupRun: userCupRun(league),
            live: !progress.completed,
            played: progress.userPlayed,
        }
    }, [league])

    const summary = useMemo(() => careerSummary(world, liveRow), [world, liveRow])
    const latest = [...(world?.trophies || [])].sort((a, b) => b.season - a.season)[0]
    const [selectedId, setSelectedId] = useState(latest?.competitionId || 'c1')
    const selected = cabinet.find((entry) => entry.id === selectedId) || cabinet[0]
    const rows = [...(liveRow ? [liveRow] : []), ...[...(world?.career || [])].reverse()]

    return (
        <section className="screen trophy-screen">
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">CAREER · ALL CLUBS</div>
                    <h1 className="prematch-title">TROPHY ROOM</h1>
                    <p>Titles belong to you as a manager: they stay on the shelf when you change club.</p>
                </div>
            </div>

            <div className="trophy-stats">
                {[
                    ['TROPHIES', summary.trophies],
                    ['LEAGUE TITLES', summary.leagueTitles],
                    ['CUP TITLES', summary.cupTitles],
                    ['SEASONS', summary.seasons],
                    ['CLUBS', summary.clubs],
                    ['BEST C1', summary.bestC1 ? cupRunLabel(summary.bestC1).replace('C1 · ', '') : '—'],
                    ['BEST C2', summary.bestC2 ? cupRunLabel(summary.bestC2).replace('C2 · ', '') : '—'],
                ].map(([label, value]) => (
                    <div key={label} className="trophy-stat">
                        <b>{value}</b>
                        <span>{label}</span>
                    </div>
                ))}
            </div>

            <div className="trophy-layout">
                <div className="trophy-shelves">
                    {SHELVES.map(([title, test]) => (
                        <div key={title} className="home-card trophy-shelf">
                            <div className="home-card__head">
                                <span>{title}</span>
                                <small>{cabinet.filter(test).filter((entry) => entry.count).length}/{cabinet.filter(test).length}</small>
                            </div>
                            <div className={`trophy-grid${title === 'CONTINENTAL' ? ' trophy-grid--big' : ''}`}>
                                {cabinet.filter(test).map((entry) => (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        className={`trophy-tile${entry.count ? ' is-won' : ''}${selected?.id === entry.id ? ' is-selected' : ''}`}
                                        onClick={() => setSelectedId(entry.id)}
                                        title={`${entry.name} · ${entry.subtitle}`}
                                    >
                                        <TrophyIcon
                                            trophy={entry}
                                            won={entry.count > 0}
                                            star={entry.bestStar}
                                            size={title === 'CONTINENTAL' ? 92 : 54}
                                        />
                                        {entry.count > 1 && <span className="trophy-count">×{entry.count}</span>}
                                        <small>{entry.name}</small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {selected && (
                    <aside className="home-card trophy-detail">
                        <div className="trophy-detail__icon">
                            <TrophyIcon trophy={selected} won={selected.count > 0} star={selected.bestStar} size={130} />
                        </div>
                        <h2>{selected.name}</h2>
                        <p className="trophy-detail__sub">{selected.subtitle}</p>
                        {selected.count > 0 ? (
                            <>
                                <div className="trophy-detail__count">
                                    WON <b>{selected.count}</b> {selected.count === 1 ? 'TIME' : 'TIMES'}
                                </div>
                                <ol className="trophy-wins">
                                    {selected.wins.map((win) => (
                                        <li key={win.id}>
                                            <span className="trophy-wins__season">{seasonLabel(win.season)}</span>
                                            <span className="trophy-wins__club">
                                                <ClubCrest clubId={win.clubId} size={18} />
                                                {worldClub(win.clubId)?.name || win.clubId}
                                            </span>
                                            <StarChip difficulty={win.difficulty} />
                                        </li>
                                    ))}
                                </ol>
                            </>
                        ) : (
                            <p className="trophy-detail__empty">
                                Not won yet. Win the {selected.name} with any club to put it on the shelf.
                            </p>
                        )}
                        <p className="trophy-detail__legend">
                            Star on a trophy = won on <i style={{ color: DIFFICULTY_STARS.hard.color }}>★</i> Hard ·{' '}
                            <i style={{ color: DIFFICULTY_STARS.veryhard.color }}>★</i> Very hard ·{' '}
                            <i style={{ color: DIFFICULTY_STARS.legendary.color }}>★</i> Legendary
                        </p>
                    </aside>
                )}
            </div>

            <div className="home-card career-card">
                <div className="home-card__head"><span>CAREER</span><small>Season by season</small></div>
                <div className="career-table-wrap">
                    <table className="career-table">
                        <thead>
                            <tr>
                                <th>SEASON</th>
                                <th>CLUB</th>
                                <th>LEAGUE</th>
                                <th>POS</th>
                                <th>CUP</th>
                                <th>DIFFICULTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={`${row.season}-${row.clubId}-${row.live ? 'live' : 'done'}`} className={row.live ? 'is-live' : ''}>
                                    <td>
                                        {seasonLabel(row.season)}
                                        {row.live && <small className="career-live">IN PROGRESS</small>}
                                    </td>
                                    <td>
                                        <span className="trophy-wins__club">
                                            <ClubCrest clubId={row.clubId} size={16} />
                                            {worldClub(row.clubId)?.name || row.clubId}
                                        </span>
                                    </td>
                                    <td>{LEAGUE_BY_ID.get(row.leagueId)?.name || '—'}</td>
                                    <td className={!row.live && row.position === 1 ? 'career-champion' : ''}>
                                        {row.position ? `${row.position}${!row.live && row.position === 1 ? ' 🏆' : ''}` : '–'}
                                    </td>
                                    <td className={row.cupRun?.result === 'winner' ? 'career-champion' : ''}>
                                        {cupRunLabel(row.cupRun)}
                                        {row.cupRun?.result === 'winner' ? ' 🏆' : ''}
                                    </td>
                                    <td><StarChip difficulty={row.difficulty} /></td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td colSpan={6} className="career-empty">No seasons yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
