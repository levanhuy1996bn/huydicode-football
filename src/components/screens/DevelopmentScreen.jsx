import { useMemo, useState } from 'react'
import { USER_TEAM } from '../../data/leagueData'
import { ATTRIBUTE_GROUPS, GOALKEEPING_GROUP, getAttributes } from '../../systems/attributes'
import {
    MAX_LEVEL,
    POINTS_PER_LEVEL,
    attributeTier,
    autoUpgrade,
    progressOf,
    upgradeAttribute,
    upgradeCost,
    xpToNext,
} from '../../systems/progression'
import { shortPlayerName } from '../../utils/names'

// Phase 19B: màn phát triển cầu thủ — cấp độ, XP, điểm chưa dùng, tiềm năng
// và cộng điểm chỉ số (giá theo vị trí), có nút tự cộng theo vị trí.

const TIER_LABEL = { key: 'KEY', secondary: 'SECONDARY', other: 'OTHER' }

function XpBar({ player }) {
    const progress = progressOf(player)
    const needed = progress.level >= MAX_LEVEL ? 0 : xpToNext(progress.level)
    const width = needed ? Math.min(100, (progress.xp / needed) * 100) : 100

    return (
        <div className="xp-bar" title={needed ? `${progress.xp}/${needed} XP` : 'Max level'}>
            <i style={{ width: `${width}%` }} />
        </div>
    )
}

export function LevelBadge({ player, compact = false }) {
    const progress = progressOf(player)

    return (
        <span className={`level-badge${progress.unspentPoints ? ' has-points' : ''}`}>
            {compact ? '' : 'LV '}
            {progress.level}
            {progress.unspentPoints > 0 && <b>+{progress.unspentPoints}</b>}
        </span>
    )
}

export default function DevelopmentScreen({ team, onUpdatePlayer, onBack }) {
    const players = useMemo(
        () => [...(team?.players || []), ...(team?.substitutes || [])],
        [team],
    )
    const [selectedId, setSelectedId] = useState(() => {
        const withPoints = players.find((player) => progressOf(player).unspentPoints > 0)

        return (withPoints || players[0])?.id || null
    })
    const [feedback, setFeedback] = useState(null)

    const selected = players.find((player) => player.id === selectedId) || players[0]

    if (!team || !selected) {
        return (
            <section className="screen">
                <div className="home-card">
                    <p className="home-card__empty">No squad found.</p>
                    <button type="button" className="btn" onClick={onBack}>BACK TO HOME</button>
                </div>
            </section>
        )
    }

    const progress = progressOf(selected)
    const values = getAttributes(selected)
    const groups = selected.position === 'GK'
        ? [GOALKEEPING_GROUP, ...ATTRIBUTE_GROUPS]
        : ATTRIBUTE_GROUPS
    const totalUnspent = players.reduce((sum, player) => sum + progressOf(player).unspentPoints, 0)

    const upgrade = (key) => {
        const result = upgradeAttribute(selected, key)

        if (!result.ok) {
            setFeedback(result.reason)
            return
        }

        setFeedback(null)
        onUpdatePlayer(result.player)
    }

    const recommended = () => {
        const next = autoUpgrade(selected)

        if (next === selected) {
            setFeedback(progress.unspentPoints ? 'Nothing more can be upgraded (potential reached)' : 'No points to spend')
            return
        }

        setFeedback(null)
        onUpdatePlayer(next)
    }

    return (
        <section className="screen development-screen">
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">PLAYER DEVELOPMENT · {USER_TEAM.name}</div>
                    <h1>Level up your squad</h1>
                    <p>
                        Players earn XP from every match (minutes, rating, goals, assists, tackles,
                        saves, clean sheets). Each level gives {POINTS_PER_LEVEL} points. Key attributes for the
                        position cost 1 point, secondary 2, others 3. Overall can't go above the
                        player's potential. {totalUnspent > 0 && <b>{totalUnspent} points waiting.</b>}
                    </p>
                </div>
            </div>

            <div className="dev-body">
                <div className="home-card dev-list">
                    {players.map((player) => {
                        const item = progressOf(player)

                        return (
                            <button
                                key={player.id}
                                type="button"
                                className={`dev-row${player.id === selected.id ? ' is-active' : ''}`}
                                onClick={() => {
                                    setSelectedId(player.id)
                                    setFeedback(null)
                                }}
                            >
                                <span className="lineup__number">{player.number}</span>
                                <span className="dev-row__name" title={player.name}>
                                    {shortPlayerName(player.name, 18)}
                                    <em>{player.position}</em>
                                </span>
                                <LevelBadge player={player} />
                                <b>{player.overall}</b>
                                <small>/{item.potential}</small>
                            </button>
                        )
                    })}
                </div>

                <div className="home-card dev-detail">
                    <div className="dev-detail__head">
                        <div>
                            <div className="home-hero__eyebrow">#{selected.number} · {selected.position}</div>
                            <h2>{selected.name}</h2>
                            <div className="dev-detail__level">
                                Level <b>{progress.level}</b>
                                {progress.level < MAX_LEVEL
                                    ? ` · ${progress.xp}/${xpToNext(progress.level)} XP`
                                    : ' · MAX'}
                            </div>
                            <XpBar player={selected} />
                        </div>
                        <div className="dev-detail__ovr">
                            <b>{selected.overall}</b>
                            <small>OVR · POTENTIAL {progress.potential}</small>
                        </div>
                    </div>

                    <div className="dev-detail__points">
                        <span>
                            <b>{progress.unspentPoints}</b> point{progress.unspentPoints === 1 ? '' : 's'} to spend
                        </span>
                        <button
                            type="button"
                            className="btn btn--small"
                            disabled={!progress.unspentPoints}
                            onClick={recommended}
                        >
                            RECOMMENDED FOR POSITION
                        </button>
                    </div>

                    {feedback && <p className="dev-feedback">{feedback}</p>}

                    <div className="dev-groups">
                        {groups.map((group) => (
                            <div className="attr-group" key={group.key}>
                                <div className="attr-group__title">{group.name}</div>
                                {group.items.map(([key, label]) => {
                                    const tier = attributeTier(selected.position, key)
                                    const cost = upgradeCost(selected.position, key)
                                    const base = selected.attributesBase?.[key]
                                    const gain = base != null ? values[key] - base : 0

                                    return (
                                        <div className={`dev-attr dev-attr--${tier}`} key={key}>
                                            <span title={`${TIER_LABEL[tier]} attribute for ${selected.position}`}>
                                                {label}
                                            </span>
                                            <b>
                                                {values[key]}
                                                {gain > 0 && <em>+{gain}</em>}
                                            </b>
                                            <button
                                                type="button"
                                                className="dev-plus"
                                                disabled={progress.unspentPoints < cost || values[key] >= 99}
                                                onClick={() => upgrade(key)}
                                                title={`Costs ${cost} point${cost > 1 ? 's' : ''}`}
                                            >
                                                +<small>{cost}</small>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
