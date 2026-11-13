import { useState } from 'react'
import { fixtureLabel } from '../../services/cupService'
import { userClubId, userTeam } from '../../services/career'
import { Scoreline } from '../MatchOverlays'
import { shortPlayerName } from '../../utils/names'
import { MatchTimeline, ShotMap, StatComparison, TopPerformers } from '../MatchStatsPanel'
import { formatMoney } from '../../services/clubService'
import { PACK_TYPES } from '../../services/cards'
import { FormArrow } from '../CardBits'

// Phase 23: XP CLB, tiền thưởng, lên cấp và phần thưởng của trận vừa đá.
function ClubRewardCard({ report, onOpenCards }) {
    if (!report) return null

    const gained = report.levelsGained || []

    return (
        <div className={`home-card club-reward${gained.length ? ' is-levelup' : ''}`}>
            <div className="home-card__head">
                <span>CLUB REWARDS</span>
                {(gained.length > 0 || report.seasonReward || report.cupReward) && (
                    <button type="button" className="link-btn" onClick={onOpenCards}>
                        OPEN IN CARDS →
                    </button>
                )}
            </div>
            <div className="club-reward__row">
                <div><span>CLUB XP</span><b>+{report.xp}</b></div>
                <div><span>PRIZE MONEY</span><b>+{formatMoney(report.prize)}</b></div>
                <div><span>BUDGET</span><b>{formatMoney(report.budget)}</b></div>
                {report.rewardFactor && report.rewardFactor !== 1 && (
                    <div><span>{report.simulated ? 'SIMULATED · REWARD' : 'REWARD'}</span><b>×{Math.round(report.rewardFactor * 100) / 100}</b></div>
                )}
                <div className="club-reward__level">
                    <span>CLUB LEVEL {report.level}</span>
                    <div className="xp-bar xp-bar--large">
                        <i style={{ width: `${Math.min(100, (report.xpNow / report.xpToNext) * 100)}%` }} />
                    </div>
                    <small>{report.xpNow} / {report.xpToNext} XP</small>
                </div>
            </div>
            {gained.map((entry) => (
                <div className="club-reward__levelup" key={entry.level}>
                    <b>LEVEL UP! · LEVEL {entry.level}</b>
                    <span>{formatMoney(entry.ep)} card + {PACK_TYPES[entry.pack]?.label}{entry.protection ? ' + Upgrade Protection' : ''} added to CARDS</span>
                </div>
            ))}
            {report.cupReward && (
                <div className="club-reward__levelup">
                    <b>{report.cupReward.label.toUpperCase()}</b>
                    <span>
                        {formatMoney(report.cupReward.amount)} card{report.cupReward.pack ? ' + Premium Player Pack + Upgrade Protection' : ''} added to CARDS
                    </span>
                </div>
            )}
            {report.seasonReward && (
                <div className="club-reward__levelup">
                    <b>SEASON {report.seasonReward.season} FINISHED · #{report.seasonReward.position}{report.seasonReward.tier >= 2 ? ' · DIVISION 2 (½ PRIZE)' : ''}</b>
                    <span>{formatMoney(report.seasonReward.amount)} card{report.seasonReward.protection ? ' + Upgrade Protection' : ''} added to CARDS</span>
                </div>
            )}
        </div>
    )
}

// Màn sau trận: tỉ số, thống kê hai đội, điểm cầu thủ đội người chơi + cầu thủ
// xuất sắc nhất trận, rồi về sảnh / trận tiếp theo / bảng xếp hạng.


// Phase 27: kết quả cúp (tổng tỉ số, luân lưu, đi tiếp / bị loại).
const NEXT_STAGE = { group: 'the round of 16', r16: 'the quarter-finals', qf: 'the semi-finals', sf: 'the final' }

function ordinalOf(value) {
    return value === 1 ? '1st' : value === 2 ? '2nd' : value === 3 ? '3rd' : `${value}th`
}

function CupResultBox({ info }) {
    if (!info) return null

    const outcome =
        info.outcome === 'champion'
            ? `${info.cupName.toUpperCase()} WINNERS!`
            : info.outcome === 'thirdPlace'
                ? 'Third place!'
                : info.outcome === 'fourthPlace'
                    ? 'Fourth place'
                    : info.outcome === 'toThirdPlace'
                        ? 'Into the third-place match'
            : info.outcome === 'advanced'
                ? `Through to ${NEXT_STAGE[info.stage]}`
                : info.outcome === 'eliminated'
                    ? info.stage === 'group' ? 'Out in the group stage' : info.stage === 'final' ? 'Runners-up' : 'Knocked out'
                    : null

    return (
        <div className={`cup-result${info.outcome ? ` cup-result--${info.outcome}` : ''}`}>
            <span className="cup-result__label">{info.label}</span>
            {info.groupPosition && <span>Group position: <b>{ordinalOf(info.groupPosition)}</b></span>}
            {info.aggregate && (
                <span>Aggregate <b>{info.aggregate.for}–{info.aggregate.against}</b></span>
            )}
            {info.awayGoals && (
                <span>Away goals <b>{info.awayGoals.for}–{info.awayGoals.against}</b></span>
            )}
            {info.shootout && (
                <span className="cup-result__pens">
                    Penalties <b>{info.shootout.for}–{info.shootout.against}</b>
                    <span className="pen-kicks">
                        {info.shootout.kicks.map((kick, index) => (
                            <i
                                key={index}
                                className={`pen-kick${kick.user ? ' is-user' : ''}${kick.scored ? ' is-scored' : ' is-missed'}`}
                                title={`${kick.user ? 'You' : 'Opponent'}: ${kick.scored ? 'scored' : 'missed'}`}
                            />
                        ))}
                    </span>
                </span>
            )}
            {outcome && <strong>{outcome}</strong>}
        </div>
    )
}

function ratingClass(rating) {
    if (rating == null) return ''
    if (rating >= 8) return 'is-great'
    if (rating >= 7) return 'is-good'
    if (rating < 6) return 'is-poor'

    return ''
}

export default function PostMatchScreen({
    summary,
    opponentName,
    opponentClubId = null,
    fixture,
    nextFixture,
    nextOpponentName,
    onHome,
    onNext,
    onOpenLeague,
    onNewSeason,
    onOpenDevelopment,
    onOpenCards,
    // Phase 29G: mô phỏng ngay trận tiếp theo (null = không được).
    onSimulateNext = null,
    simsLeft = 0,
}) {
    // Phase 29A4c: trên điện thoại chia tab STATS / PLAYERS / EVENTS / REWARDS.
    const [phoneTab, setPhoneTab] = useState('stats')

    if (!summary) {
        return (
            <section className="screen">
                <div className="home-card">
                    <p className="home-card__empty">No match summary yet.</p>
                    <button type="button" className="btn" onClick={onHome}>BACK TO HOME</button>
                </div>
            </section>
        )
    }

    const result =
        summary.blueScore > summary.redScore
            ? 'win'
            : summary.blueScore < summary.redScore
                ? 'loss'
                : 'draw'

    const motm = summary.manOfTheMatch

    return (
        <section className="screen postmatch-screen" data-phone-tab={phoneTab}>
            <div className="home-hero">
                <div className="home-hero__eyebrow">
                    MATCH SUMMARY{fixture ? ` · ${fixtureLabel(fixture)}` : ''}
                </div>

                <Scoreline
                    homeName={userTeam().name}
                    awayName={opponentName}
                    homeClubId={userClubId()}
                    awayClubId={opponentClubId}
                    homeScore={summary.blueScore}
                    awayScore={summary.redScore}
                    events={[...(summary.goalEvents || []), ...(summary.cardEvents || [])].sort((a, b) => a.minute - b.minute)}
                    size="large"
                />

                <div className={`result-badge result-badge--${result}`}>
                    {summary.forfeit === 'league'
                        ? 'MATCH FORFEITED · 0–3 LOSS'
                        : summary.forfeit === 'friendly'
                            ? 'MATCH ABANDONED'
                            : result.toUpperCase()}
                </div>

                <CupResultBox info={summary.cupInfo} />

                <div className="home-hero__actions">
                    {nextFixture ? (
                        <button type="button" className="btn btn--primary btn--large" onClick={onNext}>
                            NEXT MATCH · {nextOpponentName}
                        </button>
                    ) : (
                        <button type="button" className="btn btn--primary btn--large" onClick={onNewSeason}>
                            START NEW SEASON
                        </button>
                    )}
                    {onSimulateNext && (
                        <button type="button" className="btn btn--large" onClick={onSimulateNext} disabled={simsLeft <= 0}>
                            SIMULATE NEXT {simsLeft}/5
                        </button>
                    )}
                    <button type="button" className="btn" onClick={onOpenLeague}>LEAGUE TABLE</button>
                    <button type="button" className="btn btn--ghost" onClick={onHome}>HOME</button>
                </div>
            </div>

            <div className="phone-tabs" role="tablist" aria-label="Match summary">
                {[
                    ['stats', 'STATS'],
                    ['players', 'PLAYERS'],
                    ...(summary.forfeit ? [] : [['events', 'EVENTS']]),
                    ...(summary.clubReport ? [['rewards', 'REWARDS']] : []),
                ].map(([key, label]) => (
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

            <div className="postmatch-grid">
                <div className="home-card phone-tab--stats">
                    <div className="home-card__head">
                        <span>MATCH STATS</span>
                        <span className="stat-legend">{userTeam().shortName} · {opponentName}</span>
                    </div>

                    {summary.forfeit ? (
                        <p className="home-card__empty">No statistics for an abandoned match.</p>
                    ) : (
                        <StatComparison source={summary} />
                    )}
                </div>

                <div className="home-card phone-tab--players">
                    <div className="home-card__head"><span>PLAYER RATINGS · {userTeam().name}</span></div>

                    {motm && (
                        <div className="motm">
                            <span>PLAYER OF THE MATCH</span>
                            <b>{motm.name}</b>
                            <em>{motm.rating?.toFixed(1)}</em>
                        </div>
                    )}

                    <table className="mini-table ratings-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>PLAYER</th>
                                <th>POS</th>
                                <th title="Goals">G</th>
                                <th title="Assists">A</th>
                                <th title="Tackles won" className="rt-opt">T</th>
                                <th title="Shots (expected goals)">SH</th>
                                <th title="Passes completed / attempted" className="rt-opt">PASS</th>
                                <th>RATING</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.ratings.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.number}</td>
                                    <td title={row.name}>{shortPlayerName(row.name, 18)}</td>
                                    <td>{row.position}</td>
                                    <td>{row.goals || ''}</td>
                                    <td>{row.assists || ''}</td>
                                    <td className="rt-opt">{row.tackles || ''}</td>
                                    <td title={row.xg ? `xG ${row.xg.toFixed(2)}` : undefined}>{row.shots || ''}</td>
                                    <td className="rt-opt">{row.passes ? `${row.passesCompleted || 0}/${row.passes}` : ''}</td>
                                    <td>
                                        <span className={`rating-chip ${ratingClass(row.rating)}`}>
                                            {row.rating == null ? '–' : row.rating.toFixed(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {!summary.forfeit && (
                <div className="postmatch-grid">
                    <div className="home-card phone-tab--events">
                        <div className="home-card__head"><span>MATCH TIMELINE</span></div>
                        <MatchTimeline
                            events={[
                                ...(summary.goalEvents || []),
                                ...(summary.cardEvents || []),
                                ...(summary.subEvents || []),
                            ]}
                        />
                        <TopPerformers ratings={summary.ratings} />
                    </div>

                    <div className="home-card phone-tab--events">
                        <div className="home-card__head"><span>SHOT MAP</span></div>
                        <ShotMap shots={summary.shots || []} opponentName={opponentName} />
                    </div>
                </div>
            )}

            <div className="phone-tab--rewards">
                <ClubRewardCard report={summary.clubReport} onOpenCards={onOpenCards} />
            </div>

            {/* Phase 29I: phong độ thay đổi sau trận */}
            {summary.formChanges?.length > 0 && (
                <div className="home-card form-changes phone-tab--players">
                    <div className="home-card__head"><span>FORM CHANGES</span><small>by match rating</small></div>
                    <div className="form-changes__list">
                        {summary.formChanges.map((row) => (
                            <span key={row.id} className={`form-change${row.to > row.from ? ' is-up' : ' is-down'}`}>
                                <b>{shortPlayerName(row.name, 14)}</b>
                                <FormArrow value={row.from} />→<FormArrow value={row.to} />
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {summary.progression?.length > 0 && (
                <div className="home-card progression-card phone-tab--players">
                    <div className="home-card__head">
                        <span>PLAYER DEVELOPMENT · XP EARNED</span>
                        <button type="button" className="link-btn" onClick={onOpenDevelopment}>
                            SPEND POINTS →
                        </button>
                    </div>
                    <div className="progression-list">
                        {[...summary.progression]
                            .sort((a, b) => b.levelsGained - a.levelsGained || b.gained - a.gained)
                            .map((row) => (
                                <div
                                    className={`progression-row${row.levelsGained ? ' is-levelup' : ''}`}
                                    key={row.id}
                                >
                                    <span className="lineup__number">{row.number}</span>
                                    <span className="progression-row__name" title={row.name}>
                                        {shortPlayerName(row.name, 16)}
                                        <em>{row.position}</em>
                                    </span>
                                    <span className="progression-row__xp">+{row.gained} XP</span>
                                    <span className="progression-row__level">
                                        LV {row.level}
                                        {row.levelsGained > 0 && (
                                            <b>LEVEL UP! +{row.pointsGained} pts</b>
                                        )}
                                    </span>
                                    <div className="xp-bar">
                                        <i
                                            style={{
                                                width: `${row.xpNeeded ? Math.min(100, (row.xp / row.xpNeeded) * 100) : 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </section>
    )
}
