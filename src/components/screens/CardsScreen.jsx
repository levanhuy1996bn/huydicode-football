import { useEffect, useState } from 'react'
import { formatMoney } from '../../services/clubService'
import {
    FITNESS_PRICE,
    FORM_PRICE,
    PACK_TYPES,
    PROTECTION_PRICE,
    cardFromCatalog,
    fitnessCard,
    formCard,
    drawFromPack,
    freeShirtNumber,
    groupInventory,
    playerIdOf,
} from '../../services/cards'
import { CLUB_XP, clubXpToNext, levelRewards } from '../../services/clubProgress'
import { SQUAD_LIMITS, squadOf } from '../../systems/roster'
import { PlayerCardView } from '../CardBits'
import UpgradePanel from '../UpgradePanel'
import AchievementsPanel from '../AchievementsPanel'
import { pendingAchievementCount } from '../../services/upgradeAchievements'
import { maxSquadForm, restoreSquadFitness } from '../../systems/form'
import { userClubId } from '../../services/career'
import BottleDialog from '../BottleDialog'
import { EXP_BOTTLE_PRICE, EXP_BOTTLE_SHARE, drainPlayer, emptyBottle, filledBottle, givePlayerXp } from '../../services/xpBottle'
import { SIM_DAILY_LIMIT, SIM_TICKET_PACK, SIM_TICKET_PRICE, SIM_TICKET_SLOT, buySimTickets, simTicketsOf, simulationsLeft } from '../../services/quickSim'

// Phase 23: tab CARDS — kho phần thưởng (gói cầu thủ, thẻ EP), mở lúc nào
// cũng được. Cầu thủ mở ra là thẻ +1 và vào đội hình ngoài. Đội đủ 50 người
// thì không mở được gói (phải bán bớt), không tự đổi ra tiền.

export { PlayerCardView }

function itemTitle(item) {
    if (item.type === 'ep') return `${formatMoney(item.amount)} card`
    if (item.type === 'protection') return 'Upgrade Protection'
    if (item.type === 'fitness') return 'Fitness card'
    if (item.type === 'form') return 'Form card'
    if (item.type === 'boost') return `Upgrade Boost +${item.percent || 3}%`
    if (item.type === 'bottle') return 'Empty EXP bottle'
    if (item.type === 'bottle-full') return `EXP bottle · ${(item.xp || 0).toLocaleString('en-US')} XP`
    return PACK_TYPES[item.pack]?.label || 'Player Pack'
}

// Phase 29I: biểu tượng + mô tả vật phẩm.
const ITEM_ICON = { ep: 'EP', protection: '⛨', fitness: '♥', form: '⬆', boost: '▲', bottle: '🧪', 'bottle-full': '🧪' }
const ITEM_TEXT = {
    protection: 'A failed upgrade from +5 keeps its level · used in UPGRADE CARDS',
    fitness: 'Whole squad (starters, bench, reserves) back to fitness 100',
    form: 'Whole squad to the best form ⬆ (+3 on all main stats)',
    boost: 'Raises the upgrade success rate · up to 5 per try · used in UPGRADE CARDS',
    ep: 'Adds EP to the transfer budget',
    bottle: `Drain a bench / reserve player: he goes back to level 1 (card +N kept) and the bottle keeps ${Math.round(EXP_BOTTLE_SHARE * 100)}% of his XP`,
    'bottle-full': 'Give this XP to any player in your squad',
}

export default function CardsScreen({ club, onClubChange, team, onRosterChange, onOpenTransfers, focus = null }) {
    // 'rewards' | 'upgrade' (Phase 25); 'shop' | 'info' chỉ là tab riêng trên
    // điện thoại (Phase 29A4b) — trên máy tính vẫn nằm chung trang REWARDS.
    const [tab, setTab] = useState(focus === 'shop' ? 'shop' : 'rewards')
    const [reveal, setReveal] = useState(null)
    const [notice, setNotice] = useState(null)
    // Phase 46: hộp thoại bình EXP { mode: 'drain' | 'give', item }.
    const [bottle, setBottle] = useState(null)

    // Phase 29K: mở từ nút BUY (thẻ Thể lực / Phong độ) → cuộn tới SHOP.
    useEffect(() => {
        if (focus !== 'shop') return

        setTab('shop')

        const timer = setTimeout(() => {
            document.querySelector('.cards-shop')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 80)

        return () => clearTimeout(timer)
    }, [focus])

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
            contracts: { ...(current.contracts || {}), [card.id]: { years: 3 } },
        }))
        setReveal({ type: 'pack', card, pack: item.pack, duplicateOf, squadSize: squad.length + 1 })
        setNotice(null)
    }

    // Phase 29I: dùng thẻ Thể lực / Phong độ cho cả đội.
    const applySquadItem = (item) => {
        onRosterChange((current) => (item.type === 'fitness' ? restoreSquadFitness(current) : maxSquadForm(current)))
        onClubChange((current) => removeItem(current, item.id))
        setNotice({
            tone: 'ok',
            text: item.type === 'fitness'
                ? `Fitness card used: all ${squad.length} players are back to fitness 100.`
                : `Form card used: all ${squad.length} players are in top form ⬆ (+3).`,
        })
    }

    const buyItem = (type) => {
        const price = type === 'fitness' ? FITNESS_PRICE : FORM_PRICE

        if ((club.budget || 0) < price) return

        onClubChange((current) => ({
            ...current,
            budget: (current.budget || 0) - price,
            inventory: [...(current.inventory || []), type === 'fitness' ? fitnessCard('Bought with EP') : formCard('Bought with EP')],
        }))
        setNotice({ tone: 'ok', text: `${type === 'fitness' ? 'Fitness' : 'Form'} card bought for ${formatMoney(price)} — it is in REWARDS (UNOPENED).` })
    }

    // Phase 46: bình EXP.
    const buyBottle = () => {
        if ((club.budget || 0) < EXP_BOTTLE_PRICE) return

        onClubChange((current) => ({
            ...current,
            budget: (current.budget || 0) - EXP_BOTTLE_PRICE,
            inventory: [...(current.inventory || []), emptyBottle('Bought with EP')],
        }))
        setNotice({ tone: 'ok', text: `Empty EXP bottle bought for ${formatMoney(EXP_BOTTLE_PRICE)} — it is in REWARDS (UNOPENED). Tap USE to drain a bench / reserve player.` })
    }

    const confirmBottle = (playerId) => {
        const { mode, item } = bottle

        if (mode === 'drain') {
            const result = drainPlayer(team, playerId)

            if (!result) return

            const full = filledBottle(result.xp, result.player.name, `Drained from ${result.player.name}`)

            onRosterChange((current) => current.map((entry) => (entry.id === 'blue' ? drainPlayer(entry, playerId)?.team || entry : entry)))
            onClubChange((current) => ({
                ...current,
                inventory: [...(current.inventory || []).filter((entry) => entry.id !== item.id), full],
            }))
            setNotice({
                tone: 'ok',
                text: `${result.player.name} was drained: back to level 1 (card +${result.player.upgrade || 1} kept). The bottle now holds ${result.xp.toLocaleString('en-US')} XP — tap GIVE to pass it on.`,
            })
        } else {
            const result = givePlayerXp(team, playerId, item.xp || 0)

            if (!result) return

            onRosterChange((current) => current.map((entry) => (entry.id === 'blue' ? givePlayerXp(entry, playerId, item.xp || 0)?.team || entry : entry)))
            onClubChange((current) => removeItem(current, item.id))
            setNotice({
                tone: 'ok',
                text: `${result.report.name} received ${(item.xp || 0).toLocaleString('en-US')} XP: level ${result.report.levelBefore} → ${result.report.level}${result.report.pointsGained ? ` · +${result.report.pointsGained} points to spend in SQUAD → TRAINING` : ''}.`,
            })
        }

        setBottle(null)
    }

    // Phase 44: vé mô phỏng — mua theo bộ ×10.
    const buyTickets = () => {
        if ((club.budget || 0) < SIM_TICKET_PRICE) return

        onClubChange((current) => buySimTickets(current) || current)
        setNotice({ tone: 'ok', text: `${SIM_TICKET_PACK} simulation tickets bought for ${formatMoney(SIM_TICKET_PRICE)} — used after your ${SIM_DAILY_LIMIT} free simulations of the day.` })
    }

    const tickets = simTicketsOf(club)
    // Một ô tối đa ×99: 230 vé → ×99, ×99, ×32.
    const ticketSlots = Array.from({ length: Math.ceil(tickets / SIM_TICKET_SLOT) }, (_, index) =>
        Math.min(SIM_TICKET_SLOT, tickets - index * SIM_TICKET_SLOT),
    )

    const openItem = (item) => {
        if (item.type === 'bottle') setBottle({ mode: 'drain', item })
        else if (item.type === 'bottle-full') setBottle({ mode: 'give', item })
        else if (item.type === 'fitness' || item.type === 'form') applySquadItem(item)
        else if (item.type === 'ep') openEp(item)
        else openPack(item)
    }

    const rewardsView = tab !== 'upgrade' && tab !== 'achievements'
    // Phase 31: thành tích đập thẻ đang chờ nhận.
    const achievementsPending = pendingAchievementCount(club, squad)
    const epTotal = inventory.filter((item) => item.type === 'ep').reduce((sum, item) => sum + item.amount, 0)

    // Phase 33: mở hết thẻ EP cùng mệnh giá trong một dòng ×N.
    const openEpGroup = (group) => {
        const ids = new Set(group.items.map((item) => item.id))

        onClubChange((current) => ({
            ...current,
            inventory: (current.inventory || []).filter((entry) => !ids.has(entry.id)),
            budget: (current.budget || 0) + group.total,
        }))
        setReveal({ type: 'ep', amount: group.total, budget: (club.budget || 0) + group.total, source: `${group.count} × ${formatMoney(group.item.amount)} cards` })
        setNotice(null)
    }

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
                                {nextReward.protection ? ' + Upgrade Protection' : ''}
                                {nextReward.fitness ? ' + Fitness card' : ''}
                                {nextReward.form ? ' + Form card' : ''}
                                {nextReward.boost ? ' + Upgrade Boost' : ''}
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

            <nav className="cards-tabs" aria-label="Cards">
                {[
                    ['rewards', `REWARDS · ${inventory.length}`, `REWARDS · ${inventory.length}`],
                    ['shop', null, 'SHOP'],
                    ['upgrade', 'UPGRADE CARDS', 'UPGRADE'],
                    ['achievements', 'ACHIEVEMENTS', '★'],
                    ['info', null, 'EARN'],
                ].map(([id, label, phoneLabel]) => {
                    // Máy tính: REWARDS sáng khi đang ở rewards / shop / info.
                    const desktopActive = id === 'rewards' ? rewardsView : tab === id

                    return (
                        <button
                            key={id}
                            type="button"
                            className={[
                                'cards-tab',
                                desktopActive ? 'active' : '',
                                tab === id ? 'is-phone-active' : '',
                                label ? '' : 'cards-tab--phone',
                            ].join(' ')}
                            onClick={() => setTab(id)}
                        >
                            {label && <span className="dt-only">{label}</span>}
                            <span className="ph-only">{phoneLabel}</span>
                            {id === 'achievements' && achievementsPending > 0 && (
                                <em className="cards-tab__badge">{achievementsPending}</em>
                            )}
                        </button>
                    )
                })}
            </nav>

            {tab === 'upgrade' && (
                <UpgradePanel
                    club={club}
                    team={team}
                    onRosterChange={onRosterChange}
                    onClubChange={onClubChange}
                    onFindCopy={onOpenTransfers}
                    onOpenAchievements={() => setTab('achievements')}
                />
            )}

            {/* Phase 31: thành tích đập thẻ */}
            {tab === 'achievements' && (
                <AchievementsPanel
                    club={club}
                    team={team}
                    onClubChange={onClubChange}
                    onOpenRewards={() => setTab('rewards')}
                />
            )}

            {rewardsView && notice && (
                <div className={`cards-notice cards-notice--${notice.tone}`} role="alert">
                    {notice.text}
                    {squadFull && notice.tone === 'error' && (
                        <button type="button" className="link-btn" onClick={onOpenTransfers}>
                            GO TO TRANSFERS →
                        </button>
                    )}
                </div>
            )}

            {rewardsView && (
            <div className="cards-layout" data-phone-tab={tab}>
                <div className="home-card phone-tab--rewards">
                    <div className="home-card__head">
                        <span>UNOPENED · {inventory.length + ticketSlots.length}</span>
                        {epTotal > 0 && (
                            <button type="button" className="link-btn" onClick={openAllEp}>
                                OPEN ALL EP CARDS ({formatMoney(epTotal)}) →
                            </button>
                        )}
                    </div>

                    {/* Phase 44: vé mô phỏng — một ô ×99 (dùng tự động khi bấm SIMULATE) */}
                    {ticketSlots.length > 0 && (
                        <div className="cards-inventory cards-inventory--tickets">
                            {ticketSlots.map((count, index) => (
                                <div key={`ticket-${index}`} className="inventory-item inventory-item--ticket">
                                    <div className="inventory-item__icon" aria-hidden="true">🎟</div>
                                    <div className="inventory-item__body">
                                        <strong>
                                            Simulation ticket <em className="inventory-item__count">×{count}</em>
                                        </strong>
                                        <small>
                                            One extra quick simulation each, used automatically after the {SIM_DAILY_LIMIT} free ones
                                            ({simulationsLeft(club)}/{SIM_DAILY_LIMIT} free left today) · never expires
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {inventory.length === 0 && ticketSlots.length === 0 ? (
                        <p className="home-card__empty">
                            Nothing to open yet. Your club earns XP after every league match; each new club level
                            gives an EP card and a player pack.
                        </p>
                    ) : (
                        <div className="cards-inventory">
                            {/* Phase 33: vật phẩm giống nhau gộp thành một dòng ×N (EP theo mệnh giá,
                                Boost theo %), không tách theo nguồn; dùng / mở lấy thẻ cũ nhất. */}
                            {groupInventory(inventory).map((group) => {
                                const { item, count } = group
                                const blocked = item.type === 'pack' && squadFull
                                // Thẻ dùng ở UPGRADE CARDS (bảo vệ, tăng tỉ lệ).
                                const protection = item.type === 'protection' || item.type === 'boost'
                                const squadItem = item.type === 'fitness' || item.type === 'form'
                                const bottleItem = item.type === 'bottle' || item.type === 'bottle-full'

                                return (
                                    <div
                                        key={group.key}
                                        className={`inventory-item inventory-item--${item.type === 'pack' ? item.pack : item.type}`}
                                        title={group.sources.length ? `From: ${group.sources.join(' · ')}` : undefined}
                                    >
                                        <div className="inventory-item__icon" aria-hidden="true">
                                            {ITEM_ICON[item.type] || (item.pack === 'premium' ? '★' : '♦')}
                                        </div>
                                        <div className="inventory-item__body">
                                            <strong>
                                                {itemTitle(item)}
                                                {count > 1 && <em className="inventory-item__count">×{count}</em>}
                                            </strong>
                                            <small>
                                                {item.type === 'pack'
                                                    ? PACK_TYPES[item.pack]?.description
                                                    : ITEM_TEXT[item.type]}
                                                {item.type === 'ep' && count > 1 ? ` · ${formatMoney(group.total)} in total` : ''}
                                            </small>
                                        </div>
                                        <div className="inventory-item__actions">
                                            {protection ? (
                                                <button type="button" className="btn btn--small" onClick={() => setTab('upgrade')}>
                                                    USE →
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={`btn btn--small${blocked ? '' : ' btn--primary'}`}
                                                    onClick={() => openItem(item)}
                                                    title={blocked ? 'Squad is full (50/50)' : squadItem ? 'Use one on the whole squad' : bottleItem ? (item.type === 'bottle' ? 'Choose a player to drain' : 'Choose who receives the XP') : 'Open one'}
                                                >
                                                    {blocked ? 'SQUAD FULL' : squadItem ? 'USE' : item.type === 'bottle' ? 'USE' : item.type === 'bottle-full' ? 'GIVE' : 'OPEN'}
                                                </button>
                                            )}
                                            {item.type === 'ep' && count > 1 && (
                                                <button type="button" className="btn btn--small" onClick={() => openEpGroup(group)} title={`Open all ${count} (${formatMoney(group.total)})`}>
                                                    ALL ×{count}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Phase 29I: mua thẻ Thể lực / Phong độ */}
                <div className="home-card cards-shop phone-tab--shop">
                    <div className="home-card__head"><span>SHOP</span><small>budget {formatMoney(club.budget)}</small></div>
                    {[
                        ['fitness', '♥ Fitness card', FITNESS_PRICE, 'Whole squad back to fitness 100'],
                        ['form', '⬆ Form card', FORM_PRICE, 'Whole squad to top form (+3 on all main stats)'],
                    ].map(([type, label, price, text]) => (
                        <div key={type} className="cards-shop__row">
                            <span>
                                <b>{label}</b>
                                <small>{text}</small>
                            </span>
                            <button
                                type="button"
                                className="btn btn--small"
                                onClick={() => buyItem(type)}
                                disabled={(club.budget || 0) < price}
                                title={(club.budget || 0) < price ? 'Not enough EP' : 'Buy one (goes to UNOPENED)'}
                            >
                                BUY · {formatMoney(price)}
                            </button>
                        </div>
                    ))}
                    <div className="cards-shop__row">
                        <span>
                            <b>🧪 Empty EXP bottle</b>
                            <small>Drain a bench / reserve player (back to level 1, card +N kept) → a bottle with {Math.round(EXP_BOTTLE_SHARE * 100)}% of his XP to give to anyone</small>
                        </span>
                        <button
                            type="button"
                            className="btn btn--small"
                            onClick={buyBottle}
                            disabled={(club.budget || 0) < EXP_BOTTLE_PRICE}
                            title={(club.budget || 0) < EXP_BOTTLE_PRICE ? 'Not enough EP' : 'Buy one (goes to UNOPENED)'}
                        >
                            BUY · {formatMoney(EXP_BOTTLE_PRICE)}
                        </button>
                    </div>
                    <div className="cards-shop__row">
                        <span>
                            <b>🎟 Simulation tickets ×{SIM_TICKET_PACK}</b>
                            <small>Extra quick simulations after the {SIM_DAILY_LIMIT} free ones of the day (×0.7 rewards) · you have {tickets}</small>
                        </span>
                        <button
                            type="button"
                            className="btn btn--small"
                            onClick={buyTickets}
                            disabled={(club.budget || 0) < SIM_TICKET_PRICE}
                            title={(club.budget || 0) < SIM_TICKET_PRICE ? 'Not enough EP' : `Buy ${SIM_TICKET_PACK} tickets`}
                        >
                            BUY ×{SIM_TICKET_PACK} · {formatMoney(SIM_TICKET_PRICE)}
                        </button>
                    </div>
                </div>

                <div className="home-card phone-tab--info">
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
                        <li>Packs give one +1 player card (reserves). Duplicates are used in UPGRADE CARDS.</li>
                        <li>
                            <b>Upgrade Protection</b> (a failed upgrade from +5 keeps its level): club levels 5, 10, 15…,
                            league titles, C1 / C2 titles, or buy one for <b>{formatMoney(PROTECTION_PRICE)}</b> in UPGRADE CARDS.
                        </li>
                        <li>
                            <b>Fitness card</b>: every club level. <b>Form card</b>: levels 5, 10, 15… and cup / World Cup titles.
                            <b> Upgrade Boost</b> (+3–5% each, up to 5 per upgrade): levels 5, 10, 15….
                        </li>
                    </ul>
                </div>
            </div>
            )}

            {bottle && (
                <BottleDialog mode={bottle.mode} item={bottle.item} team={team} onCancel={() => setBottle(null)} onConfirm={confirmBottle} />
            )}

            {reveal && (
                <div className="pack-reveal" role="dialog" aria-label="Opened">
                    <div className="pack-reveal__card">
                        {reveal.type === 'pack' ? (
                            <>
                                <div className="pack-reveal__eyebrow">{PACK_TYPES[reveal.pack]?.label}</div>
                                <PlayerCardView player={reveal.card} portraitClubId={userClubId()} />
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
