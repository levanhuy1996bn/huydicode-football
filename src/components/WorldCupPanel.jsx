import { useMemo } from 'react'
import ClubCrest from './ClubCrest'
import { NATION_BY_ID } from '../data/nations'
import {
    WC_ROUND_LABELS,
    WC_STANDING_LABELS,
    editionOf,
    nextWorldCupSeason,
    worldCupState,
} from '../services/worldCupService'

// Phase 29E: tab WORLD CUP trong màn LEAGUE — bảng đấu, nhánh đấu loại trực
// tiếp, các trận của đội tuyển người chơi.
const short = (id) => NATION_BY_ID.get(id)?.shortName || '???'

function Team({ id, user, bold }) {
    return (
        <span className={`cup-club${id === user ? ' is-user' : ''}${bold ? ' is-winner' : ''}`} title={NATION_BY_ID.get(id)?.name}>
            <ClubCrest clubId={id} size={15} />
            {short(id)}
        </span>
    )
}

function winnerOf(fixture) {
    if (!fixture.played) return null
    if (fixture.homeGoals !== fixture.awayGoals) return fixture.homeGoals > fixture.awayGoals ? fixture.homeTeamId : fixture.awayTeamId
    if (fixture.shootout) return fixture.shootout.home > fixture.shootout.away ? fixture.homeTeamId : fixture.awayTeamId
    return null
}

function Match({ fixture, user }) {
    const winner = winnerOf(fixture)

    return (
        <div className={`cup-tie${fixture.homeTeamId === user || fixture.awayTeamId === user ? ' is-user' : ''}`}>
            <div className="cup-tie__row">
                <Team id={fixture.homeTeamId} user={user} bold={winner === fixture.homeTeamId} />
                <b>{fixture.played ? fixture.homeGoals : ''}</b>
            </div>
            <div className="cup-tie__row">
                <Team id={fixture.awayTeamId} user={user} bold={winner === fixture.awayTeamId} />
                <b>{fixture.played ? fixture.awayGoals : ''}</b>
            </div>
            {fixture.shootout && <small>pens {fixture.shootout.home}–{fixture.shootout.away}</small>}
        </div>
    )
}

export default function WorldCupPanel({ world, onPlay, onChooseNation }) {
    const wc = world?.worldCup || null
    const state = useMemo(() => (wc ? worldCupState(wc) : null), [wc])
    const upcomingSeason = nextWorldCupSeason(world?.season || 2026)

    if (!wc || !state) {
        return (
            <section className="cup-panel">
                <div className="league-section-title">WORLD CUP {editionOf(upcomingSeason)}</div>
                <p className="league-empty">
                    The World Cup is played every 4 years in the summer break. Next: after the {upcomingSeason}/
                    {String((upcomingSeason + 1) % 100).padStart(2, '0')} season — finish the season, then choose the national team you
                    will manage. 32 nations, 8 groups of 4, then knockout rounds.
                </p>
            </section>
        )
    }

    const user = wc.nationId
    const nation = NATION_BY_ID.get(user)
    const knockout = ['r16', 'qf', 'sf', 'final', 'third']
    const roundOf = (key) => state.rounds.find((entry) => entry.round === key)
    const userFixtures = state.rounds.flatMap((entry) => entry.fixtures).filter((fixture) => fixture.homeTeamId === user || fixture.awayTeamId === user)

    return (
        <section className="cup-panel">
            <div className="cup-panel__head">
                <div>
                    <div className="league-section-title">WORLD CUP {wc.edition}</div>
                    <p>
                        You manage <b>{nation?.name}</b>
                        {wc.status === 'done'
                            ? ` · ${WC_STANDING_LABELS[wc.finalStanding] || 'Finished'}${wc.skipped ? ' (simulated)' : ''}`
                            : state.nextUser
                                ? ` · next: ${WC_ROUND_LABELS[state.nextUser.round]}`
                                : ''}
                    </p>
                </div>
                {wc.champion && (
                    <div className="league-champion-banner">
                        WORLD CHAMPIONS · <strong>{NATION_BY_ID.get(wc.champion)?.name}</strong>
                    </div>
                )}
                {!wc.champion && state.nextUser && onPlay && (
                    <button type="button" className="btn btn--primary" onClick={onPlay}>PLAY NEXT MATCH</button>
                )}
            </div>

            {userFixtures.length > 0 && (
                <>
                    <div className="league-section-title league-section-title--spaced">{nation?.shortName} MATCHES</div>
                    <div className="league-fixture-list league-fixture-list--compact">
                        {userFixtures.map((fixture) => (
                            <div key={fixture.id} className={`league-fixture${fixture.played ? '' : ' is-next'}`}>
                                <span className="league-fixture-team league-fixture-team--home">
                                    {NATION_BY_ID.get(fixture.homeTeamId)?.name}
                                    <ClubCrest clubId={fixture.homeTeamId} size={16} />
                                </span>
                                <strong className="league-fixture-score">
                                    {fixture.played
                                        ? `${fixture.homeGoals}–${fixture.awayGoals}${fixture.shootout ? ` p${fixture.shootout.home}–${fixture.shootout.away}` : ''}`
                                        : 'VS'}
                                </strong>
                                <span className="league-fixture-team">
                                    <ClubCrest clubId={fixture.awayTeamId} size={16} />
                                    {NATION_BY_ID.get(fixture.awayTeamId)?.name}
                                    <small className="cup-fixture-label">
                                        {fixture.stage === 'group' ? `GROUP ${fixture.group} · MD${fixture.matchday}` : WC_ROUND_LABELS[fixture.round].toUpperCase()}
                                    </small>
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="league-section-title league-section-title--spaced">GROUP STAGE · TOP 2 GO THROUGH</div>
            <div className="cup-groups">
                {state.groups.map((group) => (
                    <div key={group.name} className="cup-group">
                        <div className="cup-group__name">GROUP {group.name}</div>
                        <table>
                            <tbody>
                                {group.standings.map((row, index) => (
                                    <tr key={row.teamId} className={[index < 2 ? 'is-through' : '', row.teamId === user ? 'user-team-row' : ''].join(' ')}>
                                        <td>{index + 1}</td>
                                        <td><Team id={row.teamId} user={user} /></td>
                                        <td>{row.played}</td>
                                        <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                                        <td className="league-points">{row.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <div className="league-section-title league-section-title--spaced">KNOCKOUT · ONE MATCH · LEVEL → PENALTIES</div>
            <div className="cup-bracket cup-bracket--wc">
                {knockout.map((key) => (
                    <div key={key} className="cup-bracket__col">
                        <div className="cup-group__name">{WC_ROUND_LABELS[key].toUpperCase()}</div>
                        {roundOf(key) ? (
                            roundOf(key).fixtures.map((fixture) => <Match key={fixture.id} fixture={fixture} user={user} />)
                        ) : (
                            <p className="cup-bracket__empty">Draw after the previous round</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}
