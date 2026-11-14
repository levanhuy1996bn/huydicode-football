import { useEffect, useRef, useState } from 'react'
import LevelRing from '../LevelRing'
import { clubXpToNext } from '../../services/clubProgress'

// Thanh điều hướng trên cùng. Trong trận đấu, điều hướng bị khóa
// (giống FO4: phải đá xong hoặc bỏ trận mới rời được sân).
// Phase 29G: ô tiền EP (bấm → TRANSFERS, hiện "+3.5M" khi nhận thưởng) và
// nút ⚙ SETTINGS dùng được ở mọi màn hình.
const TABS = [
    ['home', 'HOME'],
    ['prematch', 'PLAY'],
    ['development', 'SQUAD'],
    ['cards', 'CARDS'],
    ['league', 'LEAGUE'],
    // Phase 29H
    ['worldcup', 'WORLD CUP'],
    ['trophies', 'TROPHIES'],
    ['club', 'TRANSFERS'],
]

// 123456789 → "123.5M", 950000 → "950K".
export function shortEP(amount) {
    const value = Math.round(amount || 0)
    const abs = Math.abs(value)

    if (abs >= 1e9) return `${(value / 1e9).toFixed(abs >= 1e10 ? 1 : 2)}B`
    if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e8 ? 0 : 1)}M`
    if (abs >= 1e3) return `${Math.round(value / 1e3)}K`

    return String(value)
}

function BudgetChip({ budget, disabled, onClick }) {
    const previous = useRef(budget)
    const [delta, setDelta] = useState(null)

    useEffect(() => {
        const change = (budget || 0) - (previous.current || 0)

        previous.current = budget

        if (!change) return undefined

        setDelta({ change, key: Date.now() })

        const timer = setTimeout(() => setDelta(null), 2200)

        return () => clearTimeout(timer)
    }, [budget])

    return (
        <button
            type="button"
            className="ep-chip"
            onClick={onClick}
            disabled={disabled}
            title={`Transfer budget: ${Math.round(budget || 0).toLocaleString('en-US')} EP${disabled ? '' : ' · open TRANSFERS'}`}
        >
            <span className="ep-chip__label">EP</span>
            <b>{shortEP(budget)}</b>
            {delta && (
                <i key={delta.key} className={`ep-chip__delta${delta.change < 0 ? ' is-minus' : ''}`}>
                    {delta.change > 0 ? '+' : '−'}{shortEP(Math.abs(delta.change))}
                </i>
            )}
        </button>
    )
}

export default function TopBar({ screen, inMatch, season, record, onNavigate, cardsCount = 0, clubLevel = 0, clubXp = 0, budget = 0, onOpenSettings }) {
    return (
        <header className="topbar">
            <div className="brand">
                <div className="brand-mark">UF</div>

                <div>
                    <strong>ULTIMATE FOOTBALL</strong>
                    <span>MANAGER 3D</span>
                </div>
            </div>

            <nav aria-label="Main">
                {inMatch ? (
                    <span className="nav-live">
                        <i /> LIVE MATCH
                    </span>
                ) : (
                    TABS.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={screen === key ? 'active' : ''}
                            onClick={() => onNavigate(key)}
                        >
                            {label}
                            {key === 'cards' && cardsCount > 0 && (
                                <span className="nav-badge" aria-label={`${cardsCount} unopened`}>{cardsCount}</span>
                            )}
                        </button>
                    ))
                )}
            </nav>

            <div className="season-label">
                SEASON <b>{season}/{String((season + 1) % 100).padStart(2, '0')}</b>
                {record && (
                    <span className="season-label__record">
                        {record.position}
                        <small>{ordinal(record.position)}</small> · {record.points} PTS
                    </span>
                )}
            </div>

            <div className="topbar-tools">
                {/* Phase 40: cấp CLB = vòng tròn, viền xanh chạy theo % XP tới cấp sau. */}
                <LevelRing
                    level={clubLevel}
                    progress={clubXp / clubXpToNext(clubLevel)}
                    title={`Club level ${clubLevel} · ${clubXp} / ${clubXpToNext(clubLevel)} XP`}
                    onClick={inMatch ? undefined : () => onNavigate('cards')}
                    className="topbar-level"
                />
                <BudgetChip budget={budget} disabled={inMatch} onClick={() => onNavigate('club')} />
                {onOpenSettings && (
                    <button
                        type="button"
                        className="settings-gear"
                        onClick={(event) => {
                            event.currentTarget.blur()
                            onOpenSettings()
                        }}
                        title="Settings"
                        aria-label="Settings"
                    >
                        ⚙
                    </button>
                )}
            </div>
        </header>
    )
}

function ordinal(value) {
    if (value % 100 >= 11 && value % 100 <= 13) return 'th'
    if (value % 10 === 1) return 'st'
    if (value % 10 === 2) return 'nd'
    if (value % 10 === 3) return 'rd'

    return 'th'
}
