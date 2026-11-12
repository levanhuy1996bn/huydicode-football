import { useState } from 'react'
import { formatMoney } from '../../services/clubService'
import {
    PACK_TYPES,
    RARITY_LABELS,
    cardFromCatalog,
    drawFromPack,
    freeShirtNumber,
    playerIdOf,
} from '../../services/cards'
import { CLUB_XP, clubXpToNext, levelRewards } from '../../services/clubProgress'
import { SQUAD_LIMITS, squadOf } from '../../systems/roster'

// Phase 23: tab CARDS — kho phần thưởng (gói cầu thủ, thẻ EP), mở lúc nào
// cũng được. Cầu thủ mở ra là thẻ +1 và vào đội hình ngoài. Đội đủ 50 người
// thì không mở được gói (phải bán bớt), không tự đổi ra tiền.

export function PlayerCardView({ player, size = 'large' }) {
    if (!player) return null

    const rarity = player.rarity || 'bronze'

    return (
        <div className={`player-card player-card--${rarity} player-card--${size}`}>
            <div className="player-card__top">
                <div className="player-card__ovr">
                    <b>{player.overall}</b>
                    <span>{player.position}</span>
                </div>
                <span className="player-card__upgrade">+{player.upgrade || 1}</span>
            </div>
            <div className="player-card__name">{player.name}</div>
            <div className="player-card__meta">
                {player.nationality || '—'} · {player.age ? `${player.age} yrs` : ''}
            </div>
            <div className="player-card__stats">
                {[
                    ['PAC', player.pace],
                    ['SHO', player.shooting],
                    ['PAS', player.passing],
                    ['DRI', player.dribbling],
                    ['DEF', player.defending],
                    ['PHY', player.physical],
                ].map(([label, value]) => (
                    <span key={label}>
                        <b>{value ?? '–'}</b> {label}
                    </span>
                ))}
            </div>
            <div className="player-card__rarity">{RARITY_LABELS[rarity] || rarity}</div>
        </div>
    )
}

function itemTitle(item) {
    if (item.type === 'ep') return `${formatMoney(item.amount)} card`
    return PACK_TYPES[item.pack]?.label || 'Player Pack'
}

export default function CardsScreen({ club, onClubChange, team, onRosterChange, onOpenTransfers }) {
    const [reveal, setReveal] = useState(null)
    const [notice, setNotice] = useState(null)

    const inventory = club.inventory || []
    const squad = squadOf(team)
    const squadFull = squad.length >= SQUAD_LIMITS.total
    const level = club.level || 0
    const xpNeeded = clubXpToNext(level)
    const nextReward = levelRewards(level + 1)

    const removeItem = (current, itemId) => ({
        ...current,
        inventory: (current.inventory || []).filter((entry) => entry.id !== itemId),
    })

    const openEp = (item) => {
        onClubChange((current) => ({ ...removeItem(current, item.id), budget: (current.budget || 0) + item.amount }))
        setReveal({ type: 'ep', amount: item.amount, budget: (club.budget || 0) + item.amount, source: item.source })
        setNotice(null)
    }

    const openPack = (item) => {
        if (squadFull) {
            setNotice({
                tone: 'error',
                text: `Squad is full (${squad.length}/${SQUAD_LIMITS.total}). Sell players from the reserves to open more packs.`,
            })
            return
        }

        const drawn = drawFromPack(item.pack)
        const card = cardFromCatalog(drawn, { number: freeShirtNumber(squad) })
        const duplicateOf = squad.find((player) => playerIdOf(player) === card.playerId) || null

        onRosterChange((current) =>
            current.map((entry) =>
                entry.id !== 'blue' ? entry : { ...entry, reserves: [...(entry.reserves || []), card] },
            ),
        )
        onClubChange((current) => ({
            ...removeItem(current, item.id),
            contracts: { ...(current.contracts || {}), [card.id]: { wage: card.wage, years: 3 } },
        }))
        setReveal({ type: 'pack', card, pack: item.pack, duplicateOf, squadSize: squad.length + 1 })
        setNotice(null)
    }

    const openItem = (item) => (item.type === 'ep' ? openEp(item) : openPack(item))

    const epTotal = inventory.filter((item) => item.type === 'ep').reduce((sum, item) => sum + item.amount, 0)

    const openAllEp = () => {
        if (!epTotal) return

        onClubChange((current) => ({
            ...current,
            inventory: (current.inventory || []).filter((entry) => entry.type !== 'ep'),
            budget: (current.budget || 0) + epTotal,
        }))
        setReveal({ type: 'ep', amount: epTotal, budget: (club.budget || 0) + epTotal, source: 'All EP cards' })
    }

    return (
        <section className="screen cards-screen">
            <div className="home-hero cards-hero">
                <div className="home-hero__eyebrow">CARDS · CLUB LEVEL</div>
                <div className="cards-hero__row">
                    <div className="cards-level">
                        <span>CLUB LEVEL</span>
                        <b>{level}</b>
                    </div>
                    <div className="cards-xp">
                        <div className="cards-xp__label">
                            <span>{club.xp || 0} / {xpNeeded} XP to level {level + 1}</span>
                            <span>
                                Next: {formatMoney(nextReward.ep)} + {PACK_TYPES[nextReward.pack].label}
                            </span>
                        </div>
                        <div className="xp-bar xp-bar--large">
                            <i style={{ width: `${Math.min(100, ((club.xp || 0) / xpNeeded) * 100)}%` }} />
                        </div>
                    </div>
                    <div className="cards-hero__stats">
                        <div><span>BUDGET</span><b>{formatMoney(club.budget)}</b></div>
                        <div className={squadFull ? 'is-full' : ''}><span>SQUAD</span><b>{squad.length}/{SQUAD_LIMITS.total}</b></div>
                    </div>
                </div>
            </div>

            {notice && (
                <div className={`cards-notice cards-notice--${notice.tone}`} role="alert">
                    {notice.text}
                    {squadFull && (
                        <button type="button" className="link-btn" onClick={onOpenTransfers}>
                            GO TO TRANSFERS →
                        </button>
                    )}
                </div>
            )}

            <div className="cards-layout">
                <div className="home-card">
                    <div className="home-card__head">
                        <span>UNOPENED · {inventory.length}</span>
                        {epTotal > 0 && (
                            <button type="button" className="link-btn" onClick={openAllEp}>
                                OPEN ALL EP CARDS ({formatMoney(epTotal)}) →
                            </button>
                        )}
                    </div>

                    {inventory.length === 0 ? (
                        <p className="home-card__empty">
                            Nothing to open yet. Your club earns XP after every league match; each new club level
                            gives an EP card and a player pack.
                        </p>
                    ) : (
                        <div className="cards-inventory">
                            {[...inventory].reverse().map((item) => {
                                const blocked = item.type === 'pack' && squadFull

                                return (
                                    <div
                                        key={item.id}
                                        className={`inventory-item inventory-item--${item.type === 'ep' ? 'ep' : item.pack}`}
                                    >
                                        <div className="inventory-item__icon" aria-hidden="true">
                                            {item.type === 'ep' ? 'EP' : item.pack === 'premium' ? '★' : '♦'}
                                        </div>
                                        <div className="inventory-item__body">
                                            <strong>{itemTitle(item)}</strong>
                                            <small>
                                                {item.type === 'pack' ? PACK_TYPES[item.pack]?.description : 'Adds EP to the transfer budget'}
                                                {item.source ? ` · ${item.source}` : ''}
                                            </small>
                                        </div>
                                        <button
                                            type="button"
                                            className={`btn btn--small${blocked ? '' : ' btn--primary'}`}
                                            onClick={() => openItem(item)}
                                            title={blocked ? 'Squad is full (50/50)' : 'Open'}
                                        >
                                            {blocked ? 'SQUAD FULL' : 'OPEN'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="home-card">
                    <div className="home-card__head"><span>HOW TO EARN</span></div>
                    <ul className="cards-rules">
                        <li>
                            League match: win <b>{CLUB_XP.win} XP</b>, draw <b>{CLUB_XP.draw}</b>, loss <b>{CLUB_XP.loss}</b>;
                            clean sheet +{CLUB_XP.cleanSheet}, win by 3+ goals +{CLUB_XP.bigWin}. Forfeits give nothing.
                        </li>
                        <li>Prize money after every league match, more for a win, a big margin and a stronger opponent.</li>
                        <li>Every level: <b>{formatMoney(5000000)}</b> card + {PACK_TYPES.standard.label}.</li>
                        <li>Levels 5, 10, 15…: <b>{formatMoney(10000000)}</b> card + {PACK_TYPES.premium.label}.</li>
                        <li>End of season: EP card by final position (champion {formatMoney(30000000)}).</li>
                        <li>Packs give one +1 player card (reserves). Duplicates are kept for upgrades (Phase 25).</li>
                    </ul>
                </div>
            </div>

            {reveal && (
                <div className="pack-reveal" role="dialog" aria-label="Opened">
                    <div className="pack-reveal__card">
                        {reveal.type === 'pack' ? (
                            <>
                                <div className="pack-reveal__eyebrow">{PACK_TYPES[reveal.pack]?.label}</div>
                                <PlayerCardView player={reveal.card} />
                                <p className="pack-reveal__note">
                                    Joined the reserves · squad {reveal.squadSize}/{SQUAD_LIMITS.total}
                                </p>
                                {reveal.duplicateOf && (
                                    <p className="pack-reveal__note pack-reveal__note--dup">
                                        Duplicate: you already own {reveal.duplicateOf.name}. Only one card of the same
                                        player can be in the matchday squad; keep it for card upgrades.
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="pack-reveal__eyebrow">EP CARD{reveal.source ? ` · ${reveal.source}` : ''}</div>
                                <div className="pack-reveal__ep">+{formatMoney(reveal.amount)}</div>
                                <p className="pack-reveal__note">Budget: {formatMoney(reveal.budget)}</p>
                            </>
                        )}
                        <button type="button" className="btn btn--primary" onClick={() => setReveal(null)}>
                            OK
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}
