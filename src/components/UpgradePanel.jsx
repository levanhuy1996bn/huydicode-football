import { useEffect, useMemo, useState } from 'react'
import { PlayerCardView, StatNum, UpgradeBadge } from './CardBits'
import UpgradeAnimation from './UpgradeAnimation'
import { BOOST_LIMIT, PROTECTION_PRICE, boostCards, playerIdOf, protectionCard, protectionCount, spendItemsById, spendProtection } from '../services/cards'
import { formatMoney } from '../services/clubService'
import {
    EXTRA_LIMIT,
    INSURANCE_MAX,
    INSURANCE_STEP,
    MAX_UPGRADE,
    applyUpgradeLevel,
    protectionUseful,
    rateBreakdown,
    rollUpgrade,
} from '../services/upgrade'
import { squadGroupOf, squadOf } from '../systems/roster'
import { shortPlayerName } from '../utils/names'

// Phase 25: màn đập thẻ (tab UPGRADE trong CARDS).
//  - Thẻ chính: bất kỳ thẻ nào (đá chính / dự bị / đội hình ngoài).
//  - Thẻ nguyên liệu: cùng cầu thủ (playerId), ở đội hình ngoài.
//  - Tối đa 5 thẻ phụ (đội hình ngoài) cộng thêm tối đa 10%.
//  - Chỉ hiện % tổng. Nguyên liệu và thẻ phụ luôn mất. Không tốn EP.

const GROUP_LABELS = { starter: 'XI', bench: 'BENCH', reserve: 'RES' }

function CardRow({ player, group, active, disabled, note, onClick }) {
    return (
        <button
            type="button"
            className={['upgrade-row', active ? 'is-active' : '', disabled ? 'is-disabled' : ''].join(' ')}
            onClick={onClick}
            disabled={disabled}
        >
            <StatNum value={player.overall} className="upgrade-row__ovr" />
            <span className="upgrade-row__name" title={player.name}>
                {shortPlayerName(player.name, 18)}
                <small>{player.position}{group ? ` · ${GROUP_LABELS[group]}` : ''}</small>
            </span>
            <UpgradeBadge level={player.upgrade} />
            {note && <em className="upgrade-row__note">{note}</em>}
        </button>
    )
}

export default function UpgradePanel({ club, team, onRosterChange, onClubChange, onFindCopy }) {
    const [mainId, setMainId] = useState(null)
    const [materialId, setMaterialId] = useState(null)
    const [extraIds, setExtraIds] = useState([])
    const [onlyWithMaterial, setOnlyWithMaterial] = useState(true)
    const [anim, setAnim] = useState(null)
    const [message, setMessage] = useState(null)
    const [protect, setProtect] = useState(false)
    const protections = protectionCount(club)
    // Phase 29I: thẻ tăng tỉ lệ đập (dùng các thẻ mạnh nhất trước, tối đa 5).
    const [boostWanted, setBoostWanted] = useState(0)
    const availableBoosts = boostCards(club)
    const boostUsed = availableBoosts.slice(0, Math.min(boostWanted, BOOST_LIMIT, availableBoosts.length))
    const boostTotal = boostUsed.reduce((sum, item) => sum + (item.percent || 0), 0) / 100
    const budget = club?.budget || 0

    const squad = useMemo(() => squadOf(team), [team])
    const reserves = team?.reserves || []
    const byId = useMemo(() => new Map(squad.map((player) => [player.id, player])), [squad])

    // Số thẻ nguyên liệu (cùng cầu thủ, ở đội hình ngoài) cho mỗi thẻ.
    const materialsOf = (card) =>
        reserves.filter((other) => other.id !== card.id && playerIdOf(other) === playerIdOf(card))

    const mainList = useMemo(
        () =>
            squad
                .map((player) => ({ player, materials: materialsOf(player).length }))
                .filter((entry) => !onlyWithMaterial || entry.materials > 0)
                .sort((a, b) => b.materials - a.materials || b.player.overall - a.player.overall),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [squad, reserves, onlyWithMaterial],
    )

    const main = mainId ? byId.get(mainId) || null : null
    const material = materialId ? byId.get(materialId) || null : null
    const extras = extraIds.map((id) => byId.get(id)).filter(Boolean)
    const materialOptions = main ? materialsOf(main) : []
    const extraOptions = main
        ? reserves
            .filter((card) => card.id !== main.id && card.id !== materialId)
            .sort((a, b) => b.overall - a.overall)
        : []
    const atMax = (main?.upgrade || 1) >= MAX_UPGRADE
    const materialKey = materialOptions.map((card) => card.id).join('|')

    // Vừa mua bản sao (hoặc mở gói ra bản sao) khi đang chọn thẻ này, hoặc thẻ
    // nguyên liệu đang chọn đã bị dùng: tự chọn lại thẻ nguyên liệu phù hợp.
    useEffect(() => {
        if (!main) return

        if (!materialId || !materialOptions.some((card) => card.id === materialId)) {
            const best = bestMaterial(main)

            setMaterialId(best?.id || null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainId, materialKey])
    const breakdown = rateBreakdown(main, material, extras, boostTotal)
    const rate = breakdown.total
    const canProtect = protectionUseful(main)
    const protecting = protect && canProtect && protections > 0
    const pct = (value) => `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`

    // Phase 29C: mua thẻ bảo vệ bằng EP (vào kho, dùng ngay được).
    const buyProtection = () => {
        if (budget < PROTECTION_PRICE) return

        onClubChange((current) => ({
            ...current,
            budget: (current.budget || 0) - PROTECTION_PRICE,
            inventory: [...(current.inventory || []), protectionCard('Bought with EP')],
        }))
        setProtect(true)
        setMessage(`Upgrade Protection bought for ${formatMoney(PROTECTION_PRICE)}.`)
    }
    const preview = main && !atMax ? applyUpgradeLevel(main, (main.upgrade || 1) + 1) : null

    // Gợi ý thẻ nguyên liệu: thẻ cấp thấp nhất mà vẫn ≥ cấp thẻ chính (đủ
    // tỉ lệ tối đa, không phí thẻ cấp cao); không có thì thẻ cao nhất bên dưới.
    const bestMaterial = (card) => {
        if (!card) return null

        const options = materialsOf(card)
        const level = card.upgrade || 1
        const atOrAbove = options
            .filter((option) => (option.upgrade || 1) >= level)
            .sort((a, b) => (a.upgrade || 1) - (b.upgrade || 1))
        const below = options
            .filter((option) => (option.upgrade || 1) < level)
            .sort((a, b) => (b.upgrade || 1) - (a.upgrade || 1))

        return atOrAbove[0] || below[0] || null
    }

    const chooseMain = (id) => {
        setMainId(id)
        setMessage(null)
        setMaterialId(bestMaterial(byId.get(id))?.id || null)
        setExtraIds([])
    }

    const toggleExtra = (id) => {
        setExtraIds((list) => {
            if (list.includes(id)) return list.filter((item) => item !== id)
            if (list.length >= EXTRA_LIMIT) return list
            return [...list, id]
        })
    }

    const upgrade = () => {
        if (!main || !material || atMax) return

        const outcome = rollUpgrade(main, material, extras, Math.random, { protect: protecting, boost: boostTotal })
        const boostIds = boostUsed.map((item) => item.id)
        const consumed = new Set([material.id, ...extras.map((card) => card.id)])

        onRosterChange((current) =>
            current.map((entry) => {
                if (entry.id !== 'blue') return entry

                const swap = (list) =>
                    (list || [])
                        .filter((player) => !consumed.has(player.id))
                        .map((player) => (player.id === main.id ? outcome.player : player))

                return {
                    ...entry,
                    players: swap(entry.players),
                    substitutes: swap(entry.substitutes),
                    reserves: swap(entry.reserves),
                }
            }),
        )

        onClubChange((current) => {
            const contracts = { ...(current.contracts || {}) }

            consumed.forEach((id) => delete contracts[id])

            const next = spendItemsById({ ...current, contracts }, boostIds)

            return protecting ? spendProtection(next) || next : next
        })

        setAnim({
            before: main,
            after: outcome.player,
            result: outcome,
            materials: [material, ...extras],
        })
        setMaterialId(null)
        setExtraIds([])
        setBoostWanted(0)
    }

    const closeAnim = (again) => {
        const next = anim?.after

        setAnim(null)

        if (again && next) {
            chooseMain(next.id)
        }
    }

    const canAgain = Boolean(
        anim && (anim.after.upgrade || 1) < MAX_UPGRADE &&
        reserves.some((card) => card.id !== anim.after.id && playerIdOf(card) === playerIdOf(anim.after)),
    )

    return (
        <div className="upgrade-panel">
            <div className="home-card upgrade-panel__list">
                <div className="home-card__head">
                    <span>CHOOSE A CARD</span>
                    <label className="upgrade-filter">
                        <input
                            type="checkbox"
                            checked={onlyWithMaterial}
                            onChange={(event) => setOnlyWithMaterial(event.target.checked)}
                        />
                        Has a duplicate
                    </label>
                </div>
                {mainList.length === 0 ? (
                    <>
                        <p className="home-card__empty">
                            No card has a duplicate yet. Buy the same player again on the transfer market or open
                            packs, then upgrade with the duplicate.
                        </p>
                        {onFindCopy && (
                            <button type="button" className="btn btn--block upgrade-find" onClick={() => onFindCopy('')}>
                                GO TO TRANSFER MARKET →
                            </button>
                        )}
                    </>
                ) : (
                    <div className="upgrade-list">
                        {mainList.map(({ player, materials }) => (
                            <CardRow
                                key={player.id}
                                player={player}
                                group={squadGroupOf(team, player.id)}
                                active={player.id === mainId}
                                note={materials ? `${materials} dup` : null}
                                onClick={() => chooseMain(player.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="home-card upgrade-panel__center">
                {!main ? (
                    <p className="home-card__empty">Pick a card on the left to upgrade it.</p>
                ) : (
                    <>
                        <div className="upgrade-main">
                            <PlayerCardView player={main} />
                            <div className="upgrade-main__info">
                                <div className="upgrade-main__levels">
                                    <UpgradeBadge level={main.upgrade} size="large" />
                                    <b>→</b>
                                    {atMax ? <span>MAX</span> : <UpgradeBadge level={(main.upgrade || 1) + 1} size="large" />}
                                </div>
                                {preview && (
                                    <div className="upgrade-main__ovr">
                                        OVR <StatNum value={main.overall} /> → <StatNum value={preview.overall} />
                                    </div>
                                )}
                                <div className={`upgrade-rate${material ? '' : ' is-empty'}`}>
                                    <span>SUCCESS</span>
                                    <b>{material && !atMax ? pct(rate) : '–'}</b>
                                </div>
                                {material && !atMax && (breakdown.insurance > 0 || breakdown.boost > 0) && (
                                    <p className="upgrade-insurance">
                                        Base {pct(breakdown.base)}
                                        {breakdown.insurance > 0 && (
                                            <> + <b>insurance {pct(breakdown.insurance)}</b>{breakdown.insurance >= INSURANCE_MAX ? ' (max)' : ''}</>
                                        )}
                                        {breakdown.boost > 0 && <> + <b className="upgrade-boost__pct">boost {pct(breakdown.boost)}</b></>}
                                    </p>
                                )}
                                {/* Phase 29I: thẻ tăng tỉ lệ đập */}
                                {!atMax && (
                                    <div className={`upgrade-boost${boostUsed.length ? ' is-on' : ''}`}>
                                        <span>
                                            <b>▲ UPGRADE BOOST</b>
                                            <small>
                                                {availableBoosts.length
                                                    ? `${availableBoosts.length} in stock · max ${BOOST_LIMIT} per try · used up either way`
                                                    : 'None in stock · club levels 5, 10, 15…'}
                                            </small>
                                        </span>
                                        <div className="upgrade-boost__stepper">
                                            <button
                                                type="button"
                                                className="btn btn--small"
                                                onClick={() => setBoostWanted((value) => Math.max(0, Math.min(value, availableBoosts.length) - 1))}
                                                disabled={boostUsed.length === 0}
                                                aria-label="Use one boost card less"
                                            >
                                                −
                                            </button>
                                            <b>{boostUsed.length}</b>
                                            <button
                                                type="button"
                                                className="btn btn--small"
                                                onClick={() => setBoostWanted((value) => Math.min(BOOST_LIMIT, availableBoosts.length, Math.min(value, availableBoosts.length) + 1))}
                                                disabled={boostUsed.length >= Math.min(BOOST_LIMIT, availableBoosts.length)}
                                                aria-label="Use one more boost card"
                                            >
                                                +
                                            </button>
                                            <em>+{Math.round(boostTotal * 100)}%</em>
                                        </div>
                                    </div>
                                )}
                                {canProtect && (
                                    <div className={`upgrade-protect${protecting ? ' is-on' : ''}`}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={protecting}
                                                disabled={protections === 0}
                                                onChange={(event) => setProtect(event.target.checked)}
                                            />
                                            <span>
                                                <b>⛨ UPGRADE PROTECTION</b>
                                                <small>
                                                    {protections > 0
                                                        ? `${protections} left · a failure keeps +${main.upgrade}`
                                                        : 'None left'}
                                                </small>
                                            </span>
                                        </label>
                                        <button
                                            type="button"
                                            className="btn btn--small"
                                            onClick={buyProtection}
                                            disabled={budget < PROTECTION_PRICE}
                                            title={budget < PROTECTION_PRICE ? 'Not enough EP' : 'Buy one Upgrade Protection'}
                                        >
                                            BUY · {formatMoney(PROTECTION_PRICE)}
                                        </button>
                                    </div>
                                )}
                                {canProtect && (
                                    <p className="upgrade-warning">
                                        {protecting
                                            ? `Protected: a failed upgrade keeps the card at +${main.upgrade}.`
                                            : 'From +5, a failed upgrade drops the card one level.'}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    className="btn btn--primary btn--large btn--block"
                                    disabled={!material || atMax}
                                    onClick={upgrade}
                                >
                                    {atMax ? 'MAX LEVEL' : 'UPGRADE'}
                                </button>
                                <p className="upgrade-note">
                                    Material and extra cards are used up either way. No EP cost. Each failure adds
                                    +{Math.round(INSURANCE_STEP * 100)}% insurance for the next try at this level (max +{Math.round(INSURANCE_MAX * 100)}%).
                                </p>
                            </div>
                        </div>

                        <div className="upgrade-slots">
                            <div className="upgrade-slots__head">MATERIAL · SAME PLAYER</div>
                            {materialOptions.length === 0 ? (
                                <div className="upgrade-nocopy">
                                    <p className="home-card__empty">No duplicate of this player in the reserves.</p>
                                    {onFindCopy && (
                                        <button type="button" className="btn btn--small" onClick={() => onFindCopy(main.name)}>
                                            BUY A COPY ON THE MARKET →
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="upgrade-list upgrade-list--inline">
                                    {materialOptions.map((card) => (
                                        <CardRow
                                            key={card.id}
                                            player={card}
                                            active={card.id === materialId}
                                            onClick={() => {
                                                setMaterialId(card.id)
                                                setExtraIds((list) => list.filter((id) => id !== card.id))
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="upgrade-slots__head">
                                EXTRA CARDS · {extras.length}/{EXTRA_LIMIT} <small>(any reserve player, raises the success a little)</small>
                            </div>
                            {extraOptions.length === 0 ? (
                                <p className="home-card__empty">No other reserve cards.</p>
                            ) : (
                                <div className="upgrade-list upgrade-list--inline">
                                    {extraOptions.map((card) => (
                                        <CardRow
                                            key={card.id}
                                            player={card}
                                            active={extraIds.includes(card.id)}
                                            disabled={!extraIds.includes(card.id) && extraIds.length >= EXTRA_LIMIT}
                                            onClick={() => toggleExtra(card.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
                {message && <p className="upgrade-note">{message}</p>}
            </div>

            {anim && (
                <UpgradeAnimation
                    before={anim.before}
                    after={anim.after}
                    result={anim.result}
                    materials={anim.materials}
                    canAgain={canAgain}
                    onAgain={() => closeAnim(true)}
                    onDone={() => closeAnim(false)}
                />
            )}
        </div>
    )
}
