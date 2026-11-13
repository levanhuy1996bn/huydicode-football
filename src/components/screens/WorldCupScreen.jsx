import ClubCrest from '../ClubCrest'
import WorldCupPanel from '../WorldCupPanel'
import { NATION_BY_ID } from '../../data/nations'
import {
    WC_DAILY_LIMIT,
    WC_PRIZES,
    WC_ROUND_LABELS,
    WC_STANDING_LABELS,
    worldCupKey,
} from '../../services/worldCupService'
import { formatMoney } from '../../services/clubService'

// Phase 29H: tab WORLD CUP — bắt đầu giải lúc nào cũng được (2 giải mỗi ngày),
// đá tiếp giải đang dở, xem bảng / nhánh đấu, lịch sử các kỳ.
const PRIZE_ROWS = [
    ['champion', 'Champions', ' + Premium pack + Upgrade Protection'],
    ['runnerUp', 'Runners-up', ''],
    ['third', 'Third place', ''],
    ['fourth', 'Fourth place', ''],
    ['qf', 'Quarter-final', ''],
    ['r16', 'Round of 16', ''],
]

const nationName = (id) => NATION_BY_ID.get(id)?.name || id

export default function WorldCupScreen({
    world,
    nextFixture = null,
    startsLeft = 0,
    rewardFactor = 1,
    onStart,
    onPlay,
    onSimulateRest,
    onBack,
}) {
    const wc = world?.worldCup || null
    const active = wc?.status === 'active' ? wc : null
    const last = wc?.status === 'done' ? wc : null
    const history = [
        ...(last ? [{ key: worldCupKey(last), edition: last.edition, nationId: last.nationId, finalStanding: last.finalStanding, champion: last.champion, skipped: last.skipped }] : []),
        ...(world?.worldCupHistory || []).filter((entry) => !last || entry.key !== worldCupKey(last)),
    ]
    const opponentId = nextFixture
        ? nextFixture.homeTeamId === active?.nationId ? nextFixture.awayTeamId : nextFixture.homeTeamId
        : null
    const prize = (id) => Math.round((WC_PRIZES[id] * rewardFactor) / 100000) * 100000

    return (
        <section className="screen wc-screen">
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">32 NATIONS · 8 GROUPS · KNOCKOUTS</div>
                    <h1 className="prematch-title">WORLD CUP</h1>
                    <p>
                        Play a tournament whenever you like — {WC_DAILY_LIMIT} new tournaments per day; a tournament in progress
                        is saved, so you can play club matches in between and come back.
                    </p>
                </div>
            </div>

            <div className="wc-top">
                <div className="home-hero wc-hero">
                    {active ? (
                        <>
                            <div className="home-hero__eyebrow">
                                WORLD CUP {active.edition} · IN PROGRESS
                                {nextFixture ? ` · ${(WC_ROUND_LABELS[nextFixture.round] || '').toUpperCase()}` : ''}
                            </div>
                            {nextFixture ? (
                                <div className="wc-hero__match">
                                    <span><ClubCrest clubId={active.nationId} size={44} /><b>{nationName(active.nationId)}</b></span>
                                    <em>VS</em>
                                    <span><ClubCrest clubId={opponentId} size={44} /><b>{nationName(opponentId)}</b></span>
                                </div>
                            ) : (
                                <p className="home-hero__text">Waiting for the other matches…</p>
                            )}
                            <div className="home-hero__actions">
                                {nextFixture && (
                                    <button type="button" className="btn btn--primary btn--large" onClick={onPlay}>
                                        PLAY NEXT MATCH
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={onSimulateRest}
                                    title="Simulate the rest of the tournament, your matches included (no trophy or prize)"
                                >
                                    SIMULATE REST
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="home-hero__eyebrow">NEW TOURNAMENT · {startsLeft}/{WC_DAILY_LIMIT} LEFT TODAY</div>
                            <div className="home-hero__title">CHOOSE YOUR NATION</div>
                            <p className="home-hero__text">
                                The best players of the nation are called up from every club — your own cards (with their +level)
                                when they are good enough. Your club squad is not touched.
                            </p>
                            <div className="home-hero__actions">
                                <button type="button" className="btn btn--primary btn--large" onClick={onStart} disabled={startsLeft <= 0}>
                                    START WORLD CUP #{(world?.worldCupCount || 0) + 1}
                                </button>
                                {startsLeft <= 0 && <span className="wc-limit">Daily limit reached · new tournaments tomorrow</span>}
                            </div>
                        </>
                    )}
                </div>

                <div className="home-card wc-prizes">
                    <div className="home-card__head"><span>PRIZE</span><small>best stage reached · not added up</small></div>
                    <ol>
                        {PRIZE_ROWS.map(([id, label, extra]) => (
                            <li key={id}>
                                <span>{label}</span>
                                <b>{formatMoney(prize(id))}</b>
                                {extra && <small>{extra}</small>}
                            </li>
                        ))}
                    </ol>
                    <p className="home-card__empty">
                        Paid when the tournament ends (× difficulty). Match money and club XP as a C1 match ×1.5. SIMULATE REST: no
                        prize or trophy.
                    </p>
                </div>
            </div>

            {wc && <WorldCupPanel world={world} worldCup={wc} />}

            {history.length > 0 && (
                <div className="home-card wc-history">
                    <div className="home-card__head"><span>PAST TOURNAMENTS</span><small>{history.length}</small></div>
                    <table className="career-table">
                        <thead>
                            <tr>
                                <th>EDITION</th>
                                <th>YOUR NATION</th>
                                <th>RESULT</th>
                                <th>CHAMPIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((entry) => (
                                <tr key={entry.key}>
                                    <td>{entry.edition}</td>
                                    <td>
                                        <span className="trophy-wins__club">
                                            <ClubCrest clubId={entry.nationId} size={16} />
                                            {nationName(entry.nationId)}
                                        </span>
                                    </td>
                                    <td className={entry.finalStanding === 'champion' && !entry.skipped ? 'career-champion' : ''}>
                                        {WC_STANDING_LABELS[entry.finalStanding] || '—'}
                                        {entry.skipped ? ' (simulated)' : entry.finalStanding === 'champion' ? ' 🏆' : ''}
                                    </td>
                                    <td>
                                        <span className="trophy-wins__club">
                                            <ClubCrest clubId={entry.champion} size={16} />
                                            {nationName(entry.champion)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
