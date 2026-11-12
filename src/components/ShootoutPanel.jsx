import ClubCrest from './ClubCrest'
import { REGULAR_KICKS, shootoutStatus } from '../systems/shootoutRules'

// Phase 29D: bảng luân lưu — hai hàng chấm (● vào, ✕ hỏng, ○ chưa sút),
// người sút hiện tại, gợi ý phím, SUDDEN DEATH, nút SIMULATE SHOOT-OUT.
function Row({ team, label, clubId, kicks, active }) {
    const own = kicks.filter((kick) => kick.team === team)
    const slots = Math.max(REGULAR_KICKS, own.length + (active ? 1 : 0))

    return (
        <div className={`shootout-row${active ? ' is-active' : ''}`}>
            <span className="shootout-row__team">
                <ClubCrest clubId={clubId} size={18} />
                {label}
            </span>
            <span className="shootout-row__dots">
                {Array.from({ length: slots }, (_, index) => {
                    const kick = own[index]
                    const className = kick ? (kick.scored ? 'is-goal' : 'is-miss') : index === own.length && active ? 'is-next' : ''

                    return (
                        <i key={index} className={`shootout-dot ${className}`} title={kick?.takerName || ''}>
                            {kick ? (kick.scored ? '●' : '✕') : '○'}
                        </i>
                    )
                })}
            </span>
            <b className="shootout-row__score">{own.filter((kick) => kick.scored).length}</b>
        </div>
    )
}

export default function ShootoutPanel({ shootout, blue, red, onSimulate }) {
    if (!shootout) return null

    const kicks = shootout.kicks || []
    const status = shootoutStatus(kicks, shootout.first)
    const current = shootout.done ? null : shootout.current
    const order = shootout.first === 'blue' ? ['blue', 'red'] : ['red', 'blue']
    const info = { blue, red }

    return (
        <div className="shootout-panel" role="status" aria-live="polite">
            <div className="shootout-panel__title">
                PENALTY SHOOT-OUT
                {status.suddenDeath && !shootout.done && <span className="shootout-panel__sd">SUDDEN DEATH</span>}
            </div>

            {order.map((team) => (
                <Row
                    key={team}
                    team={team}
                    label={info[team].shortName}
                    clubId={info[team].clubId}
                    kicks={kicks}
                    active={!shootout.done && status.next === team}
                />
            ))}

            {shootout.done ? (
                <div className={`shootout-panel__result${shootout.winner === 'blue' ? ' is-win' : ' is-loss'}`}>
                    {info[shootout.winner]?.shortName} WIN {status.goals[shootout.winner]}–{status.goals[shootout.winner === 'blue' ? 'red' : 'blue']} ON PENALTIES
                </div>
            ) : shootout.phase === 'result' && kicks.length ? (
                <div className={`shootout-panel__hint shootout-panel__last${kicks[kicks.length - 1].scored ? ' is-goal' : ' is-miss'}`}>
                    {kicks[kicks.length - 1].scored ? 'GOAL' : 'MISSED'} · {kicks[kicks.length - 1].takerName}
                </div>
            ) : current ? (
                <div className="shootout-panel__hint">
                    {current.team === 'blue' ? (
                        <>
                            <b>{current.takerName}</b> · ← / → aim · hold <kbd>D</kbd> to shoot
                        </>
                    ) : (
                        <>
                            <b>{current.takerName}</b> shoots · hold <kbd>←</kbd> / <kbd>→</kbd> to dive, <kbd>↓</kbd> stay
                        </>
                    )}
                </div>
            ) : null}

            {!shootout.done && (
                <button type="button" className="btn btn--small shootout-panel__sim" onClick={onSimulate}>
                    SIMULATE SHOOT-OUT
                </button>
            )}
        </div>
    )
}
