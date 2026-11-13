import { useMemo, useState } from 'react'
import { getTeamById } from '../services/leagueService'
import { isUserClub } from '../services/career'
import {
    CUPS,
    CUP_SCHEDULE,
    STAGE_LABELS,
    currentCupView,
    cupMatchdaysDone,
    fixtureLabel,
    userCupOf,
} from '../services/cupService'
import ClubCrest from './ClubCrest'

// Phase 27: tab C1 / C2 trong màn LEAGUE — vòng bảng, nhánh đấu loại, lịch
// của đội mình (nếu dự cúp này).
const short = (clubId) => getTeamById(clubId)?.shortName || '???'

function ClubTag({ clubId, bold = false }) {
    return (
        <span className={`cup-club${isUserClub(clubId) ? ' is-user' : ''}${bold ? ' is-winner' : ''}`} title={getTeamById(clubId)?.name}>
            <ClubCrest clubId={clubId} size={15} />
            {short(clubId)}
        </span>
    )
}

function TieCard({ tie }) {
    const [a, b] = tie.clubs
    const scoreOf = (leg) => (leg.played ? `${leg.homeGoals}–${leg.awayGoals}` : '–')

    return (
        <div className={`cup-tie${tie.clubs.some((id) => isUserClub(id)) ? ' is-user' : ''}`}>
            <div className="cup-tie__row">
                <ClubTag clubId={a} bold={tie.winner === a} />
                {tie.stage !== 'final' && <b>{tie.legs.some((leg) => leg.played) ? tie.aggregate[a] : ''}</b>}
            </div>
            <div className="cup-tie__row">
                <ClubTag clubId={b} bold={tie.winner === b} />
                {tie.stage !== 'final' && <b>{tie.legs.some((leg) => leg.played) ? tie.aggregate[b] : ''}</b>}
            </div>
            <small>
                {tie.legs.map((leg) => `${short(leg.homeTeamId)} ${scoreOf(leg)} ${short(leg.awayTeamId)}`).join(' · ')}
                {tie.decidedBy === 'awayGoals' ? ` · away goals ${tie.awayGoals[a]}–${tie.awayGoals[b]}` : ''}
                {tie.shootout ? ` · pens ${tie.shootout.home}–${tie.shootout.away}` : ''}
            </small>
        </div>
    )
}

// Phase 29A4c: trên điện thoại cúp chia 3 phần (trận của bạn / bảng đấu /
// loại trực tiếp); máy tính vẫn hiện cả ba. Dùng chung cho C1, C2, World Cup.
export function CupPartTabs({ part, onChange, hasMatches }) {
    const parts = [
        ...(hasMatches ? [['matches', 'MY MATCHES']] : []),
        ['groups', 'GROUPS'],
        ['ko', 'KNOCKOUT'],
    ]

    return (
        <div className="cup-part-tabs" role="tablist" aria-label="Cup sections">
            {parts.map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={part === key}
                    className={part === key ? 'is-active' : ''}
                    onClick={() => onChange(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}

export default function CupPanel({ league, cupId, onStartFixture, nextFixture }) {
    const view = useMemo(() => currentCupView(league, cupId), [league, cupId])
    const [partChoice, setPartChoice] = useState(null)
    const cup = CUPS[cupId]
    const userCup = userCupOf(league)
    const done = cupMatchdaysDone(league)
    const nextEntry = CUP_SCHEDULE[done]

    if (!league?.cups) return <p className="league-empty">No cup data.</p>

    if (league.cups.inactive) {
        return (
            <p className="league-empty">
                The {cup.name} starts next season (this season was already under way when cups were added).
            </p>
        )
    }

    if (!view) return null

    const userFixtures = view.fixtures.filter((fixture) => isUserClub(fixture.homeTeamId) || isUserClub(fixture.awayTeamId))
    const stageNow = view.champion
        ? 'Finished'
        : nextEntry
            ? `${STAGE_LABELS[nextEntry.stage]}${nextEntry.matchday ? ` · matchday ${nextEntry.matchday}/6` : nextEntry.leg && nextEntry.stage !== 'final' ? ` · leg ${nextEntry.leg}` : ''} · after league round ${nextEntry.afterRound}`
            : ''

    const hasMatches = userCup === cupId && userFixtures.length > 0
    const part = partChoice && (partChoice !== 'matches' || hasMatches) ? partChoice : hasMatches ? 'matches' : 'groups'

    return (
        <section className="cup-panel" data-part={part}>
            <div className="cup-panel__head">
                <div>
                    <div className="league-section-title">{cup.name.toUpperCase()} ({cup.short}) · SEASON {league.cups.season}</div>
                    <p>
                        {userCup === cupId
                            ? 'You are in this cup.'
                            : userCup
                                ? `You play in the ${CUPS[userCup].name} this season.`
                                : 'You did not qualify for a cup this season.'}{' '}
                        {stageNow}
                    </p>
                </div>
                {view.champion && (
                    <div className="league-champion-banner">
                        CHAMPIONS · <strong>{getTeamById(view.champion)?.name}</strong>
                    </div>
                )}
            </div>

            <CupPartTabs part={part} onChange={setPartChoice} hasMatches={hasMatches} />

            {hasMatches && (
                <div className="cup-part cup-part--matches">
                    <div className="league-section-title league-section-title--spaced">YOUR CUP MATCHES</div>
                    <div className="league-fixture-list league-fixture-list--compact">
                        {userFixtures.map((fixture) => {
                            const isNext = nextFixture?.id === fixture.id

                            return (
                                <div key={fixture.id} className={`league-fixture${isNext ? ' is-next' : ''}`}>
                                    <span className="league-fixture-team league-fixture-team--home">
                                        {getTeamById(fixture.homeTeamId)?.name}
                                        <ClubCrest clubId={fixture.homeTeamId} size={16} />
                                    </span>
                                    <strong className="league-fixture-score">
                                        {fixture.played ? `${fixture.homeGoals} – ${fixture.awayGoals}` : isNext ? (
                                            <button type="button" className="league-fixture-play" onClick={() => onStartFixture(fixture)}>PLAY</button>
                                        ) : 'VS'}
                                    </strong>
                                    <span className="league-fixture-team">
                                        <ClubCrest clubId={fixture.awayTeamId} size={16} />
                                        {getTeamById(fixture.awayTeamId)?.name}
                                        <small className="cup-fixture-label">{fixtureLabel(fixture)}</small>
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="cup-part cup-part--groups">
            <div className="league-section-title league-section-title--spaced">GROUP STAGE · TOP 2 GO THROUGH</div>
            <div className="cup-groups">
                {view.groups.map((group) => (
                    <div key={group.name} className="cup-group">
                        <div className="cup-group__name">GROUP {group.name}</div>
                        <table>
                            <tbody>
                                {group.standings.map((row, index) => (
                                    <tr key={row.teamId} className={[index < 2 ? 'is-through' : '', isUserClub(row.teamId) ? 'user-team-row' : ''].join(' ')}>
                                        <td>{index + 1}</td>
                                        <td><ClubTag clubId={row.teamId} /></td>
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

            </div>

            <div className="cup-part cup-part--ko">
            <div className="league-section-title league-section-title--spaced">KNOCKOUT · TWO LEGS (AGGREGATE → AWAY GOALS → PENALTIES) · ONE-MATCH FINAL</div>
            <div className="cup-bracket">
                {['r16', 'qf', 'sf', 'final'].map((stage) => (
                    <div key={stage} className="cup-bracket__col">
                        <div className="cup-group__name">{STAGE_LABELS[stage].toUpperCase()}</div>
                        {view.ties[stage].length ? (
                            view.ties[stage].map((tie) => <TieCard key={`${stage}-${tie.index}`} tie={tie} />)
                        ) : (
                            <p className="cup-bracket__empty">Draw after the previous round</p>
                        )}
                    </div>
                ))}
            </div>
            </div>
        </section>
    )
}
