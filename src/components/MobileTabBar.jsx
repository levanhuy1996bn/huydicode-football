import { useEffect, useState } from 'react'

// Phase 29A4a: thanh tab dưới đáy màn hình trên điện thoại (thay menu trên
// cùng). 4 tab chính + MORE (LEAGUE, WORLD CUP, TROPHIES, TRANSFERS,
// SETTINGS) mở thành một bảng trượt lên. Ẩn trong trận và trên máy tính
// (CSS: chỉ hiện ở màn hình hẹp / điện thoại xoay ngang).

// Biểu tượng nét đơn (SVG, theo màu chữ).
const ICONS = {
    home: <path d="M3 11 12 4l9 7M6 9.5V20h12V9.5" />,
    prematch: <path d="M8 5v14l11-7z" />,
    development: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.9.3 5 2.6 5 5.8" /></>,
    cards: <><rect x="4" y="5" width="11" height="15" rx="2" /><path d="M9 4.2 18.6 3a2 2 0 0 1 2.2 1.7l1.4 11.6" /></>,
    more: <path d="M4 7h16M4 12h16M4 17h16" />,
}

function TabIcon({ name }) {
    return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[name]}
        </svg>
    )
}

const MAIN_TABS = [
    ['home', 'HOME'],
    ['prematch', 'PLAY'],
    ['development', 'SQUAD'],
    ['cards', 'CARDS'],
]

const MORE_ITEMS = [
    ['league', 'LEAGUE', 'Table, fixtures, cups and player stats'],
    ['worldcup', 'WORLD CUP', 'Play a tournament with a national team'],
    ['trophies', 'TROPHIES', 'Titles you have won as a manager'],
    ['club', 'TRANSFERS', 'Transfer market, contracts and sales'],
]

export default function MobileTabBar({ active, onNavigate, cardsCount = 0, onOpenSettings, hidden = false }) {
    const [moreOpen, setMoreOpen] = useState(false)

    // Đổi màn hình thì đóng bảng MORE.
    useEffect(() => setMoreOpen(false), [active])

    if (hidden) return null

    const moreActive = MORE_ITEMS.some(([key]) => key === active)

    const go = (key) => {
        setMoreOpen(false)
        onNavigate(key)
    }

    return (
        <>
            {moreOpen && (
                <div className="mobile-more" role="presentation" onClick={() => setMoreOpen(false)}>
                    <div className="mobile-more__sheet" role="dialog" aria-label="More" onClick={(event) => event.stopPropagation()}>
                        <div className="mobile-more__handle" aria-hidden="true" />
                        {MORE_ITEMS.map(([key, label, hint]) => (
                            <button
                                key={key}
                                type="button"
                                className={`mobile-more__item${active === key ? ' is-active' : ''}`}
                                onClick={() => go(key)}
                            >
                                <b>{label}</b>
                                <small>{hint}</small>
                            </button>
                        ))}
                        {onOpenSettings && (
                            <button
                                type="button"
                                className="mobile-more__item"
                                onClick={() => {
                                    setMoreOpen(false)
                                    onOpenSettings()
                                }}
                            >
                                <b>⚙ SETTINGS</b>
                                <small>Match length, graphics, sound, controls, club</small>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <nav className="mobile-tabbar" aria-label="Main (mobile)">
                {MAIN_TABS.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={active === key ? 'is-active' : ''}
                        aria-current={active === key ? 'page' : undefined}
                        onClick={() => go(key)}
                    >
                        <TabIcon name={key} />
                        <span>{label}</span>
                        {key === 'cards' && cardsCount > 0 && <em className="mobile-tabbar__badge">{cardsCount}</em>}
                    </button>
                ))}
                <button
                    type="button"
                    className={moreActive || moreOpen ? 'is-active' : ''}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((open) => !open)}
                >
                    <TabIcon name="more" />
                    <span>MORE</span>
                </button>
            </nav>
        </>
    )
}
