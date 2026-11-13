import { FORM_LEVELS } from '../systems/form'
import { lineupWarnings, squadCondition } from '../services/lineupHelper'

// Phase 29K: ô SQUAD CARDS (thẻ Thể lực / Phong độ) — đặt dưới TEAM SETUP ở
// màn PLAY, đầu tab SQUAD; trên điện thoại là một dải gọn dưới đội hình.
//   items = { fitness, form, onUseFitness, onUseForm, onBuy }
export default function SquadCardsBox({ team, items, compact = false, showWarnings = false }) {
    if (!team || !items) return null

    const state = squadCondition(team)
    const warnings = showWarnings ? lineupWarnings(team, items) : []

    if (compact) {
        return (
            <div className="squad-cards squad-cards--strip" aria-label="Squad cards">
                <span className="squad-cards__avg" title="Average condition of the starting XI">
                    XI fitness <b className={state.average < 75 ? 'is-low' : ''}>{state.average}%</b>
                </span>
                <button type="button" className="btn btn--small" disabled={!items.fitness} onClick={items.onUseFitness}>
                    ♥ {items.fitness} · USE
                </button>
                <button type="button" className="btn btn--small" disabled={!items.form} onClick={items.onUseForm}>
                    ⬆ {items.form} · USE
                </button>
                {!items.fitness && !items.form && items.onBuy && (
                    <button type="button" className="link-btn" onClick={items.onBuy}>BUY →</button>
                )}
                {warnings.length > 0 && (
                    <ul className="squad-cards__warnings squad-cards__warnings--strip">
                        {warnings.map((warning) => (
                            <li key={warning.text} className={`is-${warning.level}`}>{warning.text}</li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }

    const row = (type, icon, title, effect, count, onUse, price) => (
        <div className="squad-cards__row" key={type}>
            <span className={`squad-cards__icon squad-cards__icon--${type}`}>{icon}</span>
            <div>
                <strong>{title} <em>×{count}</em></strong>
                <small>{effect}</small>
            </div>
            {count > 0 ? (
                <button type="button" className="btn btn--small" onClick={onUse}>USE</button>
            ) : items.onBuy ? (
                <button type="button" className="btn btn--small btn--ghost" onClick={items.onBuy} title={`Buy in CARDS → SHOP (${price})`}>
                    BUY
                </button>
            ) : null}
        </div>
    )

    return (
        <div className="home-card squad-cards">
            <div className="home-card__head"><span>SQUAD CARDS</span></div>

            <div className="squad-cards__state">
                <span>
                    XI fitness <b className={state.average < 75 ? 'is-low' : ''}>{state.average}%</b>
                    {state.below70 > 0 && <small> · {state.below70} below 70%</small>}
                </span>
                <span className="squad-cards__forms" title="Form of the starting XI">
                    {[2, 1, 0, -1, -2].map((level) =>
                        state.forms[level] ? (
                            <i key={level} style={{ color: FORM_LEVELS[level].color }}>
                                {FORM_LEVELS[level].arrow}{state.forms[level]}
                            </i>
                        ) : null,
                    )}
                </span>
            </div>

            {row('fitness', '♥', 'Fitness card', 'Whole squad back to fitness 100%', items.fitness, items.onUseFitness, '2,000,000 EP')}
            {row('form', '⬆', 'Form card', 'Whole squad to top form ⬆ (+3 on main stats)', items.form, items.onUseForm, '3,000,000 EP')}

            {warnings.length > 0 && (
                <div className="squad-cards__warnings">
                    <span>BEFORE KICK-OFF</span>
                    <ul>
                        {warnings.map((warning) => (
                            <li key={warning.text} className={`is-${warning.level}`}>{warning.text}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
