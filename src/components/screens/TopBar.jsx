// Thanh điều hướng trên cùng. Trong trận đấu, điều hướng bị khóa
// (giống FO4: phải đá xong hoặc bỏ trận mới rời được sân).
const TABS = [
    ['home', 'HOME'],
    ['prematch', 'PLAY'],
    ['development', 'SQUAD'],
    ['cards', 'CARDS'],
    ['league', 'LEAGUE'],
    ['trophies', 'TROPHIES'],
    ['club', 'TRANSFERS'],
]

export default function TopBar({ screen, inMatch, season, record, onNavigate, cardsCount = 0, clubLevel = 0 }) {
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
                <span className="season-label__level" title="Club level">CLUB LV <b>{clubLevel}</b></span>
                SEASON <b>{season}/{String((season + 1) % 100).padStart(2, '0')}</b>
                {record && (
                    <span className="season-label__record">
                        {record.position}
                        <small>{ordinal(record.position)}</small> · {record.points} PTS
                    </span>
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
