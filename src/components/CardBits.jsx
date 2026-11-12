import { statTier, upgradeTier } from '../services/upgrade'
import { RARITY_LABELS } from '../services/cards'

// Phase 25: những mảnh giao diện dùng chung cho thẻ cầu thủ.

// Lớp CSS cho số chỉ số: 99 cam, 100–120 tím, > 120 vàng (1–98 giữ nguyên).
export function statClass(value) {
    const tier = statTier(Number(value) || 0)

    return tier ? `stat-num stat-num--${tier}` : 'stat-num'
}

export function StatNum({ value, className = '' }) {
    return <span className={`${statClass(value)} ${className}`.trim()}>{value}</span>
}

// Ô số +N trên thẻ: xám (+1), đồng (+2…+4), bạc (+5…+7), vàng (+8, +9), kim cương (+10).
export function UpgradeBadge({ level = 1, size = 'small', className = '' }) {
    const value = level || 1

    return (
        <span
            className={`upgrade-badge upgrade-badge--${upgradeTier(value)} upgrade-badge--${size} ${className}`.trim()}
            title={`Card level +${value}`}
        >
            +{value}
        </span>
    )
}

// Thẻ cầu thủ (màu thẻ theo độ hiếm OVR; ô +N theo cấp thẻ; số chỉ số theo mốc).
export function PlayerCardView({ player, size = 'large', hideBadge = false }) {
    if (!player) return null

    const rarity = player.rarity || 'bronze'

    return (
        <div className={`player-card player-card--${rarity} player-card--${size}`}>
            <div className="player-card__top">
                <div className="player-card__ovr">
                    <b className={statClass(player.overall)}>{player.overall}</b>
                    <span>{player.position}</span>
                </div>
                {!hideBadge && <UpgradeBadge level={player.upgrade} size="large" />}
            </div>
            <div className="player-card__name">{player.name}</div>
            <div className="player-card__meta">
                {player.nationality || player.club || '—'}{player.age ? ` · ${player.age} yrs` : ''}
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
                        <b className={statClass(value)}>{value ?? '–'}</b> {label}
                    </span>
                ))}
            </div>
            <div className="player-card__rarity">{RARITY_LABELS[rarity] || rarity}</div>
        </div>
    )
}
