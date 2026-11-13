import TeamColorPanel from '../TeamColorPanel'
import { teamColorOf } from '../../services/teamColor'
import { useMemo, useState } from 'react'
import { userTeam } from '../../services/career'
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
import { FormArrow, UpgradeBadge, statClass } from '../CardBits'
import SquadCardsBox from '../SquadCardsBox'
import { PlayerInfoModal } from '../PlayerInfoPanel'

// Phase 19B: màn phát triển cầu thủ — cấp độ, XP, điểm chưa dùng, tiềm năng
// và cộng điểm chỉ số (giá theo vị trí), có nút tự cộng theo vị trí.

// Phase 29A4b: trên điện thoại mở bước chi tiết thì cuộn về đầu trang.
const PHONE_QUERY = '(max-width: 760px), (max-height: 500px) and (pointer: coarse)'
const scrollTopOnPhone = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches) window.scrollTo({ top: 0 })
}

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

export default function DevelopmentScreen({ team, onUpdatePlayer, onBack, onEditLineup = null, squadItems = null }) {
    const players = useMemo(
        () => [...(team?.players || []), ...(team?.substitutes || []), ...(team?.reserves || [])],
        [team],
    )
    const [selectedId, setSelectedId] = useState(() => {
        const withPoints = players.find((player) => progressOf(player).unspentPoints > 0)

        return (withPoints || players[0])?.id || null
    })
    const [feedback, setFeedback] = useState(null)
    // Phase 29K: bảng thông tin cầu thủ (thẻ lớn, team color).
    const [infoOpen, setInfoOpen] = useState(false)
    // Playtest 3: cộng điểm vào bản nháp trước, bấm CONFIRM mới lưu.
    // history = các bản nháp trước đó (để hoàn tác từng bước).
    const [draft, setDraft] = useState(null)
    const [history, setHistory] = useState([])
    // Phase 29A4b: trên điện thoại chia 3 tab (TEAM / PLAYERS / TRAINING).
    const [phoneTab, setPhoneTab] = useState('team')

    const saved = players.find((player) => player.id === selectedId) || players[0]
    const pending = Boolean(draft && saved && draft.id === saved.id)
    const selected = pending ? draft : saved

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
    const savedValues = getAttributes(saved)
    const values = getAttributes(selected)
    const spent = progressOf(saved).unspentPoints - progress.unspentPoints
    const groups = selected.position === 'GK'
        ? [GOALKEEPING_GROUP, ...ATTRIBUTE_GROUPS]
        : ATTRIBUTE_GROUPS
    const totalUnspent = players.reduce((sum, player) => sum + progressOf(player).unspentPoints, 0)
    const selectedIndex = Math.max(0, players.findIndex((player) => player.id === saved.id))

    const pushDraft = (next) => {
        setHistory((list) => [...list, pending ? draft : null])
        setDraft(next)
        setFeedback(null)
    }

    const upgrade = (key) => {
        const result = upgradeAttribute(selected, key)

        if (!result.ok) {
            setFeedback(result.reason)
            return
        }

        pushDraft(result.player)
    }

    const recommended = () => {
        const next = autoUpgrade(selected)

        if (next === selected) {
            setFeedback(progress.unspentPoints ? 'Nothing more can be upgraded (potential reached)' : 'No points to spend')
            return
        }

        pushDraft(next)
    }

    const undoStep = () => {
        const previous = history[history.length - 1] || null

        setHistory((list) => list.slice(0, -1))
        setDraft(previous)
        setFeedback(null)
    }

    const discard = () => {
        setDraft(null)
        setHistory([])
        setFeedback(null)
    }

    const confirm = () => {
        if (!pending) return

        onUpdatePlayer(draft)
        setDraft(null)
        setHistory([])
        setFeedback(`Saved: ${spent} point${spent === 1 ? '' : 's'} spent on ${draft.name}.`)
    }

    // Còn thay đổi chưa lưu thì không cho rời cầu thủ / màn hình.
    const guard = (action) => {
        if (pending) {
            setFeedback('You have unsaved upgrades - CONFIRM or UNDO them first.')
            return
        }

        action()
    }

    const selectPlayer = (player) => {
        if (player.id === saved.id) {
            setPhoneTab('training')
            scrollTopOnPhone()
            return
        }

        guard(() => {
            setSelectedId(player.id)
            setFeedback(null)
            setPhoneTab('training')
            scrollTopOnPhone()
        })
    }

    // Trước / sau trong danh sách (tab TRAINING trên điện thoại).
    const stepPlayer = (delta) => {
        const next = players[(selectedIndex + delta + players.length) % players.length]

        if (next) selectPlayer(next)
    }

    return (
        <section className="screen development-screen" data-phone-tab={phoneTab}>
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={() => guard(onBack)}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">PLAYER DEVELOPMENT · {userTeam().name}</div>
                    <h1>Level up your squad</h1>
                    <p className="dev-intro">
                        Players earn XP from every match (minutes, rating, goals, assists, tackles,
                        saves, clean sheets). Max level {MAX_LEVEL}: {POINTS_PER_LEVEL} points per level up to level 30,
                        then 1 point per level. Key attributes for the position cost 1 point, secondary 2, others 3.
                        Training can't take Overall above the player's potential (card upgrades +N add on top). {totalUnspent > 0 && <b>{totalUnspent} points waiting.</b>}
                    </p>
                </div>
            </div>

            <div className="phone-tabs" role="tablist" aria-label="Squad">
                {[
                    ['team', 'TEAM'],
                    ['players', 'PLAYERS', totalUnspent],
                    ['training', 'TRAINING', pending ? '•' : 0],
                ].map(([key, label, badge]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={phoneTab === key}
                        className={phoneTab === key ? 'is-active' : ''}
                        onClick={() => setPhoneTab(key)}
                    >
                        {label}
                        {badge ? <em className="phone-tabs__badge">{badge}</em> : null}
                    </button>
                ))}
            </div>

            {/* Phase 26D + 29K: team color, thẻ Thể lực / Phong độ, sửa đội hình */}
            <div className="squad-top phone-tab--team">
                <div className="home-card team-color-card">
                    <TeamColorPanel info={teamColorOf(team?.players || [])} title="TEAM COLOR · STARTING XI" />
                    {onEditLineup && (
                        <button type="button" className="btn btn--primary squad-top__edit" onClick={() => guard(onEditLineup)}>
                            ✎ EDIT LINEUP
                        </button>
                    )}
                </div>
                {squadItems && <SquadCardsBox team={team} items={squadItems} />}
            </div>

            <div className="dev-body">
                <div className="home-card dev-list phone-tab--players">
                    {players.map((player) => {
                        const item = progressOf(player)

                        return (
                            <button
                                key={player.id}
                                type="button"
                                className={`dev-row${player.id === selected.id ? ' is-active' : ''}`}
                                onClick={() => selectPlayer(player)}
                            >
                                <span className="lineup__number">{player.number}</span>
                                <span className="dev-row__name" title={player.name}>
                                    {shortPlayerName(player.name, 18)}
                                    <em>{player.position}</em>
                                </span>
                                <LevelBadge player={player} />
                                <FormArrow player={player} />
                                <b>{player.overall}</b>
                                <small>/{item.potential}</small>
                            </button>
                        )
                    })}
                </div>

                <div className="home-card dev-detail phone-tab--training">
                    {/* Phase 29A4b: điều hướng trên điện thoại */}
                    <div className="dev-phone-nav">
                        <button type="button" className="link-btn" onClick={() => guard(() => setPhoneTab('players'))}>← PLAYERS</button>
                        <span>{selectedIndex + 1} / {players.length}</span>
                        <button type="button" className="btn btn--small btn--ghost" onClick={() => stepPlayer(-1)} aria-label="Previous player">‹</button>
                        <button type="button" className="btn btn--small btn--ghost" onClick={() => stepPlayer(1)} aria-label="Next player">›</button>
                    </div>
                    <div className="dev-detail__head">
                        <div>
                            <div className="home-hero__eyebrow">#{selected.number} · {selected.position}</div>
                            <h2>
                                {selected.name}{' '}
                                <button type="button" className="link-btn dev-detail__card" onClick={() => setInfoOpen(true)} title="Player card, club, nation and team color">
                                    ⓘ CARD
                                </button>
                            </h2>
                            <div className="dev-detail__level">
                                Level <b>{progress.level}</b>
                                {progress.level < MAX_LEVEL
                                    ? ` · ${progress.xp}/${xpToNext(progress.level)} XP`
                                    : ' · MAX'}
                            </div>
                            <XpBar player={selected} />
                        </div>
                        <div className="dev-detail__ovr">
                            <b className={statClass(selected.overall)}>{selected.overall}</b>
                            <UpgradeBadge level={selected.upgrade} />
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

                    {pending && (
                        <div className="dev-pending">
                            <span>
                                <b>{spent}</b> point{spent === 1 ? '' : 's'} pending · OVR {saved.overall} → <b>{selected.overall}</b>
                            </span>
                            <div className="dev-pending__actions">
                                <button type="button" className="btn btn--small btn--ghost" onClick={undoStep}>
                                    UNDO LAST
                                </button>
                                <button type="button" className="btn btn--small btn--ghost" onClick={discard}>
                                    UNDO ALL
                                </button>
                                <button type="button" className="btn btn--small" onClick={confirm}>
                                    CONFIRM
                                </button>
                            </div>
                        </div>
                    )}

                    {feedback && <p className={`dev-feedback${feedback.startsWith('Saved') ? ' is-ok' : ''}`}>{feedback}</p>}

                    <div className="dev-groups">
                        {groups.map((group) => (
                            <div className="attr-group" key={group.key}>
                                <div className="attr-group__title">{group.name}</div>
                                {group.items.map(([key, label]) => {
                                    const tier = attributeTier(selected.position, key)
                                    const cost = upgradeCost(selected.position, key)
                                    const base = selected.attributesBase?.[key]
                                    const gain = base != null ? values[key] - base : 0
                                    const added = values[key] - savedValues[key]

                                    return (
                                        <div className={`dev-attr dev-attr--${tier}${added > 0 ? ' is-pending' : ''}`} key={key}>
                                            <span title={`${TIER_LABEL[tier]} attribute for ${selected.position}`}>
                                                {label}
                                            </span>
                                            <b>
                                                <span className={statClass(values[key])}>{values[key]}</span>
                                                {gain - added > 0 && <em>+{gain - added}</em>}
                                                {added > 0 && <i className="dev-attr__new">+{added}</i>}
                                            </b>
                                            <button
                                                type="button"
                                                className="dev-plus"
                                                disabled={progress.unspentPoints < cost}
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
            <PlayerInfoModal
                player={infoOpen ? saved : null}
                onClose={() => setInfoOpen(false)}
                xi={team?.players || []}
                zone={team?.players?.some((player) => player.id === saved?.id) ? 'pitch' : team?.substitutes?.some((player) => player.id === saved?.id) ? 'bench' : 'reserves'}
            />
        </section>
    )
}
