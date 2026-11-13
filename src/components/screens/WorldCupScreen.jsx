import { useState } from 'react'
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
import { DIFFICULTIES } from '../../services/difficulty'

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
const difficultyLabel = (id) => DIFFICULTIES.find((item) => item.id === id)?.label || id

export default function WorldCupScreen({
    world,
    nextFixture = null,
    startsLeft = 0,
    rewardFactor = 1,
    onStart,
    onPlay,
    onSimulateRest,
    onBack,
    // Phase 30C: cấp World Cup + độ khó của giải
    progress = null,
    difficulties = [],
    startDifficulty = 'easy',
    onStartDifficultyChange = null,
    activeDifficulty = null,
}) {
    const wc = world?.worldCup || null
    // Phase 29A4c: trên điện thoại chia tab TOURNAMENT / PRIZES.
    const [phoneTab, setPhoneTab] = useState('play')
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
        <section className="screen wc-screen" data-phone-tab={phoneTab}>
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">32 NATIONS · 8 GROUPS · KNOCKOUTS</div>
                    <h1 className="prematch-title">WORLD CUP</h1>
                    <p className="wc-intro">
                        Play a tournament whenever you like — {WC_DAILY_LIMIT} new tournaments per day; a tournament in progress
                        is saved, so you can play club matches in between and come back.
                    </p>
                </div>
            </div>

            <div className="phone-tabs" role="tablist" aria-label="World Cup">
                {[['play', 'TOURNAMENT'], ['info', history.length ? 'PRIZES · HISTORY' : 'PRIZES']].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={phoneTab === key}
                        className={phoneTab === key ? 'is-active' : ''}
                        onClick={() => setPhoneTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Phase 30C: cấp World Cup → cả đội tuyển +N (chỉ trong World Cup) */}
            {progress && (
                <div className="home-card wc-level phone-tab--play">
                    <div className="wc-level__badge">
                        <span>WC LEVEL</span>
                        <b>{progress.level}</b>
                    </div>
                    <div className="wc-level__body">
                        <div className="wc-level__title">
                            Whole squad <em className="wc-level__plus">+{progress.upgrade}</em>
                            <small>World Cup only · kept when you change nation or club</small>
                        </div>
                        <div className="xp-bar xp-bar--large">
                            <i style={{ width: `${progress.max ? 100 : Math.min(100, (progress.xp / progress.xpForNext) * 100)}%` }} />
                        </div>
                        <small className="wc-level__next">
                            {progress.max
                                ? 'Max level reached'
                                : `${progress.xp} / ${progress.xpForNext} XP to level ${progress.level + 1}`}
                            {progress.nextUpgradeLevel ? ` · level ${progress.nextUpgradeLevel} → +${progress.nextUpgrade}` : ''}
                        </small>
                    </div>
                </div>
            )}

            <div className="wc-top">
                <div className="home-hero wc-hero phone-tab--play">
                    {active ? (
                        <>
                            <div className="home-hero__eyebrow">
                                WORLD CUP {active.edition} · IN PROGRESS
                                {activeDifficulty ? ` · ${activeDifficulty.label.toUpperCase()}` : ''}
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
                                The nation's own best 22 players, every one a +{progress?.upgrade || 1} card (your World Cup level).
                                Your club squad is not touched.
                            </p>
                            {difficulties.length > 0 && (
                                <div className="wc-difficulty" role="radiogroup" aria-label="Tournament difficulty">
                                    <span>DIFFICULTY</span>
                                    <div className="wc-difficulty__options">
                                        {difficulties.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={startDifficulty === item.id}
                                                disabled={item.locked}
                                                className={`wc-difficulty__btn${startDifficulty === item.id ? ' is-active' : ''}${item.locked ? ' is-locked' : ''}`}
                                                onClick={() => onStartDifficultyChange?.(item.id)}
                                                title={item.locked
                                                    ? `Win the World Cup on ${item.requires?.label} to unlock`
                                                    : `Opponents about +${item.upgrade} cards · prizes and XP ×${item.reward}`}
                                            >
                                                {item.locked ? '🔒 ' : ''}{item.label}
                                                <small>{item.locked ? `win on ${item.requires?.label}` : `×${item.reward}`}</small>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="home-hero__actions">
                                <button type="button" className="btn btn--primary btn--large" onClick={onStart} disabled={startsLeft <= 0}>
                                    START WORLD CUP #{(world?.worldCupCount || 0) + 1}
                                </button>
                                {startsLeft <= 0 && <span className="wc-limit">Daily limit reached · new tournaments tomorrow</span>}
                            </div>
                        </>
                    )}
                </div>

                <div className="home-card wc-prizes phone-tab--info">
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
                    <p className="home-card__empty wc-xp-rules">
                        <b>World Cup XP</b> per match: win 30 · draw 20 · loss 10 · knockout ×1.5 · title +100, all × difficulty.
                        Squad cards by level: 1 → +1, 2 → +2, 3–4 → +3, 5 → +4, 6 → +5, 7–8 → +6, 9 → +7, 10 → +8.
                    </p>
                </div>
            </div>

            {wc && (
                <div className="phone-tab--play">
                    <WorldCupPanel world={world} worldCup={wc} />
                </div>
            )}

            {history.length > 0 && (
                <div className="home-card wc-history phone-tab--info">
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
                                        {entry.difficulty ? <small className="wc-history__diff"> · {difficultyLabel(entry.difficulty)}</small> : null}
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
