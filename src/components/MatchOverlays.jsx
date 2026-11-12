import { fixtureLabel } from '../services/cupService'
import FormationPicker from './FormationPicker'
import { TACTICS } from '../systems/constants'
import { useState } from 'react'
import { userClubId, userTeam } from '../services/career'
import ClubCrest from './ClubCrest'
import { StatComparison, useLiveStats } from './MatchStatsPanel'

// Danh sách bàn thắng của một đội: "Tên 23'" (OG = phản lưới).
// Phase 20: kèm thẻ vàng / đỏ (event.card) với biểu tượng thẻ.
export function GoalList({ events, teamId, align }) {
    const goals = events.filter((event) => event.teamId === teamId)

    if (goals.length === 0) {
        return <div className={`goal-list goal-list--${align}`} />
    }

    return (
        <ul className={`goal-list goal-list--${align}`}>
            {goals.map((goal, index) => (
                <li key={`${goal.minute}-${index}`} className={goal.card ? 'goal-list__card' : undefined}>
                    {goal.card && <i className={`card-chip card-chip--${goal.card}`} aria-label={`${goal.card} card`} />}
                    {goal.name || 'Unknown'}
                    {goal.ownGoal ? ' (OG)' : ''} <b>{goal.minute}'</b>
                </li>
            ))}
        </ul>
    )
}

export function Scoreline({ homeName, awayName, homeScore, awayScore, events, size = 'large', homeClubId = null, awayClubId = null }) {
    return (
        <div className={`scoreline scoreline--${size}`}>
            <div className="scoreline__team">
                <span className="scoreline__name">
                    {homeClubId && <ClubCrest clubId={homeClubId} size={size === 'large' ? 30 : 22} />}
                    {homeName}
                </span>
                <GoalList events={events} teamId="blue" align="left" />
            </div>

            <div className="scoreline__score">
                {homeScore}
                <i>–</i>
                {awayScore}
            </div>

            <div className="scoreline__team scoreline__team--away">
                <span className="scoreline__name">
                    {awayName}
                    {awayClubId && <ClubCrest clubId={awayClubId} size={size === 'large' ? 30 : 22} />}
                </span>
                <GoalList events={events} teamId="red" align="right" />
            </div>
        </div>
    )
}

// Ghi bàn / tạm dừng: thẻ nhỏ giữa màn hình.
export function StatusOverlay({ title, subtitle, children, extra }) {
    return (
        <div className="match-overlay match-overlay--dim">
            <div className={`match-card ${extra ? 'match-card--stats' : 'match-card--small'}`}>
                <div className="match-card__title">{title}</div>
                {subtitle && <div className="match-card__subtitle">{subtitle}</div>}
                {extra}
                {children && <div className="match-card__actions">{children}</div>}
            </div>
        </div>
    )
}

// Phase 21: thống kê đầy đủ lúc tạm dừng.
export function PausedStats({ statsRef, opponentName }) {
    const source = useLiveStats(statsRef)

    return (
        <div className="match-card__stats">
            <StatComparison source={source} twoColumns opponentName={opponentName} />
        </div>
    )
}

// Nghỉ giữa hiệp: tỉ số, người ghi bàn, đổi chiến thuật/sơ đồ, rồi Tiếp tục.
// Bảng quản lý đội (bên trái) vẫn dùng được để thay người.
export function HalfTimeOverlay({
    opponentName,
    opponentClubId = null,
    blueScore,
    redScore,
    events,
    statsSource,
    opponentShortName,
    tacticKey,
    onTacticChange,
    opponentTacticKey,
    formationKey,
    onFormationChange,
    substitutionCount,
    maxSubstitutions,
    onContinue,
    onOpenSubs,
    onQuit,
}) {
    // Phase 21: hai thẻ — chỉnh đội / thống kê hiệp 1.
    const [tab, setTab] = useState('team')

    return (
        <div className="match-overlay match-overlay--right">
            <div className="match-card">
                <div className="match-card__eyebrow">HALF TIME</div>

                <Scoreline
                    homeName={userTeam().name}
                    awayName={opponentName}
                    homeClubId={userClubId()}
                    awayClubId={opponentClubId}
                    homeScore={blueScore}
                    awayScore={redScore}
                    events={events}
                    size="medium"
                />

                <div className="segmented match-card__tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === 'team'} className={tab === 'team' ? 'is-active' : ''} onClick={() => setTab('team')}>
                        TEAM
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'is-active' : ''} onClick={() => setTab('stats')}>
                        FIRST-HALF STATS
                    </button>
                </div>

                {tab === 'stats' && (
                    <div className="match-card__stats">
                        <StatComparison source={statsSource} twoColumns opponentName={opponentShortName} />
                    </div>
                )}

                <div className="halftime-settings" hidden={tab !== 'team'}>
                    <label className="halftime-settings__row">
                        <span>Team tactic</span>
                        <select
                            value={tacticKey}
                            onChange={onTacticChange}
                            aria-label="Team tactic"
                        >
                            {Object.entries(TACTICS).map(([key, value]) => (
                                <option key={key} value={key}>
                                    {value.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <p className="tactic-summary">
                        {TACTICS[tacticKey]?.summary}
                        {opponentTacticKey && TACTICS[opponentTacticKey] && (
                            <>
                                {' '}
                                <b>
                                    {opponentName} are playing{' '}
                                    {TACTICS[opponentTacticKey].label}.
                                </b>
                            </>
                        )}
                    </p>

                    <div className="halftime-settings__row halftime-settings__row--stack">
                        <span>Formation</span>
                        <FormationPicker value={formationKey} onChange={onFormationChange} compact />
                    </div>

                    <div className="halftime-settings__row">
                        <span>Substitutions</span>
                        <div className="halftime-settings__subs">
                            <em>{substitutionCount}/{maxSubstitutions} used</em>
                            <button type="button" className="btn btn--small" onClick={onOpenSubs}>
                                OPEN SUBSTITUTIONS
                            </button>
                        </div>
                    </div>
                </div>

                <div className="match-card__actions">
                    <button type="button" className="btn btn--primary" onClick={onContinue}>
                        CONTINUE TO 2ND HALF
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={onQuit}>
                        QUIT MATCH
                    </button>
                </div>
            </div>
        </div>
    )
}

// Hết giờ: tỉ số thật to + người ghi bàn + các bước tiếp theo.
export function FullTimeOverlay({
    opponentName,
    opponentClubId = null,
    blueScore,
    redScore,
    events,
    statsSource,
    opponentShortName,
    forfeit,
    fixture,
    resultSaved,
    nextFixture,
    nextOpponentName,
    onNextMatch,
    onOpenLeague,
    onNewSeason,
    onSummary,
}) {
    const result =
        blueScore > redScore ? 'WIN' : blueScore < redScore ? 'LOSS' : 'DRAW'

    return (
        <div className="match-overlay match-overlay--dim match-overlay--front">
            <div className="match-card match-card--wide">
                <div className="match-card__eyebrow">
                    FULL TIME{fixture ? ` · ${fixtureLabel(fixture)}` : ''}
                </div>

                <Scoreline
                    homeName={userTeam().name}
                    awayName={opponentName}
                    homeClubId={userClubId()}
                    awayClubId={opponentClubId}
                    homeScore={blueScore}
                    awayScore={redScore}
                    events={events}
                    size="large"
                />

                <div className={`result-badge result-badge--${result.toLowerCase()}`}>
                    {forfeit === 'league'
                        ? 'MATCH FORFEITED · 0–3 LOSS'
                        : forfeit === 'friendly'
                            ? 'MATCH ABANDONED'
                            : result}
                </div>

                {fixture && (
                    <div className="match-card__subtitle">
                        {resultSaved ? 'League result saved' : 'Saving result…'}
                    </div>
                )}

                {statsSource && (
                    <div className="match-card__stats match-card__stats--compact">
                        <StatComparison source={statsSource} compact opponentName={opponentShortName} />
                    </div>
                )}

                <div className="match-card__actions">
                    <button type="button" className="btn btn--primary" onClick={onSummary}>
                        MATCH SUMMARY
                    </button>
                    {nextFixture ? (
                        <button type="button" className="btn" onClick={onNextMatch}>
                            NEXT MATCH · {nextOpponentName}
                        </button>
                    ) : (
                        <button type="button" className="btn" onClick={onNewSeason}>
                            SEASON COMPLETE · NEW SEASON
                        </button>
                    )}
                    <button type="button" className="btn" onClick={onOpenLeague}>
                        LEAGUE TABLE
                    </button>
                </div>
            </div>
        </div>
    )
}

export function QuitConfirm({ isLeagueMatch, onConfirm, onCancel }) {
    return (
        <div className="match-overlay match-overlay--dim match-overlay--top">
            <div className="match-card match-card--small">
                <div className="match-card__title">QUIT MATCH?</div>
                <div className="match-card__subtitle">
                    {isLeagueMatch
                        ? 'This match will be recorded as a 0–3 loss.'
                        : 'The match will end without a result.'}
                </div>
                <div className="match-card__actions">
                    <button type="button" className="btn btn--danger" onClick={onConfirm}>
                        QUIT
                    </button>
                    <button type="button" className="btn" onClick={onCancel}>
                        KEEP PLAYING
                    </button>
                </div>
            </div>
        </div>
    )
}
