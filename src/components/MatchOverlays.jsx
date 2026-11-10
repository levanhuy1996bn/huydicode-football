import { FORMATIONS } from '../data/teams'
import { TACTICS } from '../systems/constants'

// Danh sách bàn thắng của một đội: "Tên 23'" (OG = phản lưới).
function GoalList({ events, teamId, align }) {
    const goals = events.filter((event) => event.teamId === teamId)

    if (goals.length === 0) {
        return <div className={`goal-list goal-list--${align}`} />
    }

    return (
        <ul className={`goal-list goal-list--${align}`}>
            {goals.map((goal, index) => (
                <li key={`${goal.minute}-${index}`}>
                    {goal.name || 'Unknown'}
                    {goal.ownGoal ? ' (OG)' : ''} <b>{goal.minute}'</b>
                </li>
            ))}
        </ul>
    )
}

function Scoreline({ homeName, awayName, homeScore, awayScore, events, size = 'large' }) {
    return (
        <div className={`scoreline scoreline--${size}`}>
            <div className="scoreline__team">
                <span>{homeName}</span>
                <GoalList events={events} teamId="blue" align="left" />
            </div>

            <div className="scoreline__score">
                {homeScore}
                <i>–</i>
                {awayScore}
            </div>

            <div className="scoreline__team scoreline__team--away">
                <span>{awayName}</span>
                <GoalList events={events} teamId="red" align="right" />
            </div>
        </div>
    )
}

// Ghi bàn / tạm dừng: thẻ nhỏ giữa màn hình.
export function StatusOverlay({ title, subtitle, children }) {
    return (
        <div className="match-overlay match-overlay--dim">
            <div className="match-card match-card--small">
                <div className="match-card__title">{title}</div>
                {subtitle && <div className="match-card__subtitle">{subtitle}</div>}
                {children && <div className="match-card__actions">{children}</div>}
            </div>
        </div>
    )
}

// Nghỉ giữa hiệp: tỉ số, người ghi bàn, đổi chiến thuật/sơ đồ, rồi Tiếp tục.
// Bảng quản lý đội (bên trái) vẫn dùng được để thay người.
export function HalfTimeOverlay({
    opponentName,
    blueScore,
    redScore,
    events,
    tacticKey,
    onTacticChange,
    formationKey,
    onFormationChange,
    substitutionCount,
    maxSubstitutions,
    onContinue,
    onOpenSubs,
    onQuit,
}) {
    return (
        <div className="match-overlay match-overlay--right">
            <div className="match-card">
                <div className="match-card__eyebrow">HALF TIME</div>

                <Scoreline
                    homeName="BLUE FC"
                    awayName={opponentName}
                    homeScore={blueScore}
                    awayScore={redScore}
                    events={events}
                    size="medium"
                />

                <div className="halftime-settings">
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

                    <div className="halftime-settings__row">
                        <span>Formation</span>
                        <div className="segmented">
                            {Object.keys(FORMATIONS).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={key === formationKey ? 'is-active' : ''}
                                    onClick={() => onFormationChange(key)}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
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
    blueScore,
    redScore,
    events,
    forfeit,
    fixture,
    resultSaved,
    nextFixture,
    nextOpponentName,
    onNextMatch,
    onOpenLeague,
    onReplay,
    onNewSeason,
}) {
    const result =
        blueScore > redScore ? 'WIN' : blueScore < redScore ? 'LOSS' : 'DRAW'

    return (
        <div className="match-overlay match-overlay--dim match-overlay--front">
            <div className="match-card match-card--wide">
                <div className="match-card__eyebrow">
                    FULL TIME{fixture ? ` · ROUND ${fixture.round}` : ''}
                </div>

                <Scoreline
                    homeName="BLUE FC"
                    awayName={opponentName}
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

                <div className="match-card__actions">
                    {nextFixture ? (
                        <button type="button" className="btn btn--primary" onClick={onNextMatch}>
                            NEXT MATCH · {nextOpponentName}
                        </button>
                    ) : (
                        <button type="button" className="btn btn--primary" onClick={onNewSeason}>
                            SEASON COMPLETE · NEW SEASON
                        </button>
                    )}
                    <button type="button" className="btn" onClick={onOpenLeague}>
                        LEAGUE TABLE
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={onReplay}>
                        REPLAY (FRIENDLY)
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
                        ? 'This league match will be recorded as a 0–3 loss.'
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
