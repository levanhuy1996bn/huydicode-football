import { useState } from 'react'
import { nationStrength } from '../../services/nationalTeams'
import { SIM_DAILY_LIMIT } from '../../services/quickSim'
import { naturalPositionOf, positionPenalty } from '../../systems/roster'
import { fixtureLabel } from '../../services/cupService'
import FormationPicker from '../FormationPicker'
import ClubCrest from '../ClubCrest'
import TeamColorPanel from '../TeamColorPanel'
import { teamColorOf, withTeamColor } from '../../services/teamColor'
import { isUserClub, userClubId, userTeam } from '../../services/career'
import { FORMATION_INFO } from '../../data/teams'
import { TACTICS } from '../../systems/constants'
import { shortPlayerName } from '../../utils/names'
import { KIT_LABELS, KIT_SLOTS, kitsClash, kitsOf } from '../../data/kits'
import { DIFFICULTIES } from '../../services/difficulty'
import { FormArrow, UpgradeBadge } from '../CardBits'
import { MATCH_LENGTHS } from '../SettingsRows'
import { withForm } from '../../systems/form'
import SquadCardsBox from '../SquadCardsBox'
import { PlayerInfoModal } from '../PlayerInfoPanel'
import { ovrTierClass } from '../../utils/ovrTier'

// Phase 24: hình áo nhỏ (áo + quần) cho nút chọn bộ áo.
export function KitIcon({ kit }) {
    return (
        <svg viewBox="0 0 40 44" className="kit-icon" aria-hidden="true">
            <path d="M12 3 L4 8 L1 17 L8 19 L9 15 L9 30 L31 30 L31 15 L32 19 L39 17 L36 8 L28 3 Q20 8 12 3 Z"
                fill={kit.shirt} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
            <path d="M15 3.6 Q20 7 25 3.6" fill="none" stroke={kit.trim} strokeWidth="1.6" />
            <path d="M9 31 L31 31 L32 42 L22 42 L20 37 L18 42 L8 42 Z"
                fill={kit.shorts} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
        </svg>
    )
}

// Chọn bộ áo cho một đội: bộ nào trùng màu với áo đội kia thì bị khóa.
function KitPicker({ clubId, name, current, otherKit, onChange }) {
    const kits = kitsOf(clubId)

    return (
        <div className="kit-picker">
            <span className="kit-picker__name">{name}</span>
            <div className="kit-picker__options" role="radiogroup" aria-label={`${name} kit`}>
                {KIT_SLOTS.map((slot) => {
                    const clash = otherKit ? kitsClash(kits[slot], otherKit) : false

                    return (
                        <button
                            key={slot}
                            type="button"
                            role="radio"
                            aria-checked={current === slot}
                            disabled={clash}
                            title={clash ? `${KIT_LABELS[slot]} kit clashes with the other team` : `${KIT_LABELS[slot]} kit`}
                            className={['kit-option', current === slot ? 'is-active' : '', clash ? 'is-clash' : ''].join(' ')}
                            onClick={() => onChange(clubId, slot)}
                        >
                            <KitIcon kit={kits[slot]} />
                            <small>{clash ? 'CLASH' : KIT_LABELS[slot].toUpperCase()}</small>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// Màn trước trận: đội hình hai đội, sức mạnh, chiến thuật, sơ đồ,
// chỉnh đội hình (bảng kéo thả, không tính lượt thay) rồi KICK OFF.

const average = (players) =>
    players.length
        ? Math.round(players.reduce((sum, player) => sum + (player.overall || 0), 0) / players.length)
        : 0

// Phong độ thể lực (Phase 19): cầu thủ đá nhiều trận liên tiếp sẽ mệt.
function ConditionChip({ value }) {
    const condition = Math.round(value ?? 100)
    const tone = condition > 80 ? '' : condition > 60 ? ' is-warn' : ' is-low'

    return (
        <span className={`condition-chip${tone}`} title="Condition (fitness for this match)">
            {condition}%
        </span>
    )
}

// Phase 26C: chọn độ khó của mùa (trước trận đầu tiên), sau đó chỉ hiển thị.
export function DifficultyPicker({ difficulty, locked, onChange }) {
    if (!difficulty) return null

    return (
        <div className="difficulty-picker">
            <div className="kit-section__head">
                <span>Season difficulty</span>
                <small>{locked ? 'Locked until next season' : 'Choose before your first match'}</small>
            </div>
            <div className="difficulty-picker__options" role="radiogroup" aria-label="Season difficulty">
                {DIFFICULTIES.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={difficulty.id === item.id}
                        className={difficulty.id === item.id ? 'is-active' : ''}
                        disabled={locked && difficulty.id !== item.id}
                        onClick={() => !locked && onChange?.(item.id)}
                    >
                        <b>{item.label}</b>
                    </button>
                ))}
            </div>
        </div>
    )
}

function Lineup({ title, color, players, align, showCondition = false, showUpgrade = false, onEdit = null, onOpenPlayer = null, children = null, className = '' }) {
    // Phase 26D: OVR hiển thị đã cộng team color (mũi tên xanh, rê chuột xem gốc).
    const teamColor = teamColorOf(players)
    // Sau Phase 27: đá trái vị trí → OVR hiển thị giảm (chỉ số thật không đổi).
    // Phase 29I: OVR hiển thị cộng cả phong độ (±).
    const shown = players.map((player) => {
        const boosted = withForm(withTeamColor(player, teamColor.bonus))
        const penalty = positionPenalty(naturalPositionOf(player), player.position)

        return { ...boosted, overall: boosted.overall - penalty, positionPenalty: penalty, baseOverall: player.overall }
    })

    return (
        <div className={`lineup lineup--${align} ${className}`.trim()}>
            <div className="lineup__head" style={{ '--team': color }}>
                <span>{title}</span>
                <span className="lineup__head-side">
                    <b>{average(shown)} <small>AVG</small></b>
                </span>
            </div>
            {/* Phase 29K: nút sửa đội hình rõ ràng (trước đây là nút EDIT ✎ nhỏ trên tiêu đề). */}
            {onEdit && (
                <button
                    type="button"
                    className="btn btn--primary lineup__edit-main"
                    onClick={onEdit}
                    title="Drag & drop the lineup. Changes before kick-off do not use substitutions. The % next to each player is his condition: players who played recently start tired, so rotate the squad."
                >
                    ✎ EDIT LINEUP
                </button>
            )}
            <ol className={`lineup__list${onOpenPlayer ? ' is-clickable' : ''}`}>
                {shown.map((player, index) => (
                    <li
                        key={player.id}
                        className={`ovr-row ${ovrTierClass(player)}`}
                        role={onOpenPlayer ? 'button' : undefined}
                        tabIndex={onOpenPlayer ? 0 : undefined}
                        title={onOpenPlayer ? `${player.name} — click for details` : undefined}
                        onClick={onOpenPlayer ? () => onOpenPlayer(players[index]) : undefined}
                        onKeyDown={onOpenPlayer ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                onOpenPlayer(players[index])
                            }
                        } : undefined}
                    >
                        <span className="lineup__number" style={{ '--team': color }}>
                            {player.number}
                        </span>
                        <span className="lineup__name" title={player.name}>
                            {shortPlayerName(player.name, 20)}
                        </span>
                        <em>{player.position}</em>
                        {showCondition && <ConditionChip value={player.condition} />}
                        <FormArrow player={player} />
                        {showUpgrade && <UpgradeBadge level={player.upgrade} />}
                        <b
                            className={`ovr-num ${player.positionPenalty || player.formBonus < 0 ? 'is-off-position' : player.teamColorBonus || player.formBonus > 0 ? 'is-boosted' : ''}`.trim()}
                            title={
                                [
                                    `Base ${player.baseOverall}`,
                                    player.positionPenalty ? `${naturalPositionOf(player)} playing ${player.position} −${player.positionPenalty}` : null,
                                    player.teamColorBonus ? `team color +${player.teamColorBonus}` : null,
                                    player.formBonus ? `form ${player.formBonus > 0 ? '+' : ''}${player.formBonus}` : null,
                                ].filter(Boolean).join(' · ')
                            }
                        >
                            {player.overall}
                        </b>
                    </li>
                ))}
            </ol>
            <TeamColorPanel info={teamColor} compact />
            {children}
        </div>
    )
}

// Sau Phase 28: TEAM SETUP chia 4 tab (mỗi lần một phần) + dòng tóm tắt.
const SETUP_TABS = [
    ['formation', 'FORMATION'],
    ['tactic', 'TACTIC'],
    ['kits', 'KITS'],
    ['difficulty', 'DIFFICULTY'],
]

function SetupCard({
    summary,
    formationKey,
    onFormationChange,
    tacticKey,
    onTacticChange,
    kits,
    onKitChange,
    opponentId,
    opponentShortName,
    difficulty,
    difficultyLocked,
    onDifficultyChange,
}) {
    const [tab, setTab] = useState('formation')

    return (
        <div className="home-card setup-card">
            <div className="home-card__head"><span>TEAM SETUP</span></div>
            <p className="setup-card__summary">{summary}</p>

            <div className="setup-tabs" role="tablist" aria-label="Team setup">
                {SETUP_TABS.map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        className={tab === id ? 'is-active' : ''}
                        onClick={() => setTab(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="setup-card__body">
                {tab === 'formation' && (
                    <>
                        <p className="setup-card__hint">
                            {formationKey}
                            {FORMATION_INFO[formationKey] ? ` · ${FORMATION_INFO[formationKey].note}` : ''}
                        </p>
                        <FormationPicker value={formationKey} onChange={onFormationChange} />
                    </>
                )}

                {tab === 'tactic' && (
                    <div className="setup-tactics" role="radiogroup" aria-label="Team tactic">
                        {Object.entries(TACTICS).map(([key, value]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={tacticKey === key}
                                className={`setup-tactic${tacticKey === key ? ' is-active' : ''}`}
                                onClick={() => onTacticChange({ target: { value: key } })}
                            >
                                <b>{value.label}</b>
                                <small>{value.summary}</small>
                            </button>
                        ))}
                    </div>
                )}

                {tab === 'kits' && kits && onKitChange && (
                    <div className="kit-section">
                        <div className="kit-section__head">
                            <span>Kits</span>
                            <small>Clashing kits are locked</small>
                        </div>
                        <KitPicker
                            clubId={userClubId()}
                            name={userTeam().shortName}
                            current={kits.slots[userClubId()]}
                            otherKit={kits[opponentId]?.kit}
                            onChange={onKitChange}
                        />
                        <KitPicker
                            clubId={opponentId}
                            name={opponentShortName}
                            current={kits.slots[opponentId]}
                            otherKit={kits[userClubId()]?.kit}
                            onChange={onKitChange}
                        />
                    </div>
                )}

                {tab === 'difficulty' && (
                    difficultyLocked ? (
                        <p className="setup-card__hint">
                            {/* Phase 30C: World Cup có độ khó riêng, chọn khi bắt đầu giải */}
                            <b>{difficulty?.label}</b> · {difficultyLocked === 'wc'
                                ? 'World Cup difficulty, chosen when the tournament started.'
                                : 'locked until next season (choose before your first match of a season).'}
                        </p>
                    ) : (
                        <DifficultyPicker
                            difficulty={difficulty}
                            locked={false}
                            onChange={onDifficultyChange}
                        />
                    )
                )}
            </div>
        </div>
    )
}

export default function PreMatchScreen({
    fixture,
    blueTeam,
    opponentTeam,
    opponentInfo,
    bluePosition,
    opponentPosition,
    tacticKey,
    onTacticChange,
    onFormationChange,
    onEditLineup,
    kits = null,
    blueKitTeam = null,
    onKitChange,
    difficulty = null,
    difficultyLocked = false,
    onDifficultyChange,
    simsLeft = 0,
    onSimulate,
    onKickOff,
    onBack,
    // Phase 29G: chọn nhanh độ dài trận.
    matchDuration = null,
    onMatchDurationChange = null,
    // Phase 29I: dùng nhanh thẻ Thể lực / Phong độ (null = ẩn, vd. World Cup).
    squadItems = null,
}) {
    // Phase 29K: bảng thông tin cầu thủ ({ player, side }).
    const [info, setInfo] = useState(null)
    // Phase 29A4a: trên điện thoại hiện từng phần theo tab.
    const [phoneTab, setPhoneTab] = useState('team')

    if (!fixture || !blueTeam || !opponentTeam) {
        return (
            <section className="screen prematch-screen">
                <div className="home-card">
                    <p className="home-card__empty">There is no match left this season.</p>
                    <button type="button" className="btn" onClick={onBack}>BACK TO HOME</button>
                </div>
            </section>
        )
    }

    const isHome = isUserClub(fixture.homeTeamId)
    const opponentId = isHome ? fixture.awayTeamId : fixture.homeTeamId
    const blueColor = blueKitTeam?.color || blueTeam.color
    const userKitSlot = kits?.slots?.[userClubId()]
    const summary = [
        blueTeam.formationKey,
        TACTICS[tacticKey]?.label,
        userKitSlot ? `${KIT_LABELS[userKitSlot]} kit` : null,
        difficulty ? `${difficulty.label}${difficultyLocked ? ' 🔒' : ''}` : null,
    ].filter(Boolean).join(' · ')

    return (
        <section className="screen prematch-screen">
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">
                        PRE-MATCH · {fixtureLabel(fixture)} · {fixture.stage === 'final' || fixture.competition === 'wc' ? 'NEUTRAL VENUE' : isHome ? 'HOME' : 'AWAY'}
                    </div>
                    <h1 className="prematch-title">
                        <ClubCrest clubId={userClubId()} size={40} />
                        {userTeam().name} <span>vs</span> {opponentInfo?.name}
                        <ClubCrest clubId={opponentInfo?.id} size={40} />
                    </h1>
                    <p>
                        {fixture.competition === 'wc' ? (
                            <>
                                World Cup {fixture.edition} · {userTeam().shortName} {nationStrength(userClubId())} · {opponentInfo?.shortName}{' '}
                                {nationStrength(opponentInfo?.id)} (starting XI average)
                            </>
                        ) : (
                            <>
                                League position: {userTeam().shortName} {bluePosition || '–'} · {opponentInfo?.shortName}{' '}
                                {opponentPosition || '–'} · Opponent strength {opponentInfo?.strength}
                            </>
                        )}
                        {difficulty && <> · Difficulty {difficulty.label.toUpperCase()}</>}
                    </p>
                </div>

                {/* Sau Phase 28: nút đá / mô phỏng luôn ở trên cùng */}
                <div className="prematch-actions">
                    <button
                        type="button"
                        className="btn btn--sim btn--large"
                        onClick={onSimulate}
                        disabled={!simsLeft || !onSimulate}
                        title="Quick simulation: instant result, rewards ×0.7 · 5 per day"
                    >
                        SIMULATE <small>{simsLeft}/{SIM_DAILY_LIMIT}</small>
                    </button>
                    <button type="button" className="btn btn--primary btn--large" onClick={onKickOff}>
                        ▶ KICK OFF
                    </button>
                    {onMatchDurationChange && (
                        <div className="prematch-length" title="Match length (real time for 90 minutes)">
                            <span>LENGTH</span>
                            <div className="segmented">
                                {MATCH_LENGTHS.map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={matchDuration === value ? 'is-active' : ''}
                                        onClick={() => onMatchDurationChange(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="phone-tabs" role="tablist" aria-label="Pre-match sections">
                {[['team', 'MY TEAM'], ['setup', 'SETUP'], ['opponent', 'OPPONENT']].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={phoneTab === id}
                        className={phoneTab === id ? 'is-active' : ''}
                        onClick={() => setPhoneTab(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="prematch-body" data-phone-tab={phoneTab}>
                <Lineup
                    title={userTeam().name}
                    color={blueColor}
                    players={blueTeam.players}
                    align="left"
                    showCondition
                    onEdit={onEditLineup}
                    onOpenPlayer={(player) => setInfo({ player, side: 'blue' })}
                    className="phone-tab--team"
                >
                    {/* Phase 29K (điện thoại): dải thẻ Thể lực / Phong độ ngay dưới đội hình */}
                    {squadItems && (
                        <div className="squad-cards-phone">
                            <SquadCardsBox team={blueTeam} items={squadItems} compact showWarnings />
                        </div>
                    )}
                </Lineup>

                <div className="prematch-setup phone-tab--setup">
                    <SetupCard
                        summary={summary}
                        formationKey={blueTeam.formationKey}
                        onFormationChange={onFormationChange}
                        tacticKey={tacticKey}
                        onTacticChange={onTacticChange}
                        kits={kits}
                        onKitChange={onKitChange}
                        opponentId={opponentId}
                        opponentShortName={opponentInfo?.shortName || 'OPP'}
                        difficulty={difficulty}
                        difficultyLocked={difficultyLocked}
                        onDifficultyChange={onDifficultyChange}
                    />

                    {/* Phase 29K: thẻ Thể lực / Phong độ ngay dưới TEAM SETUP (máy tính) */}
                    {squadItems && (
                        <div className="squad-cards-desktop">
                            <SquadCardsBox team={blueTeam} items={squadItems} showWarnings />
                        </div>
                    )}
                </div>

                <Lineup
                    title={opponentInfo?.name || opponentTeam.name}
                    color={opponentTeam.color}
                    players={opponentTeam.players}
                    align="right"
                    showUpgrade
                    onOpenPlayer={(player) => setInfo({ player, side: 'red' })}
                    className="phone-tab--opponent"
                />
            </div>

            <PlayerInfoModal
                player={info?.player || null}
                onClose={() => setInfo(null)}
                xi={info?.side === 'blue' ? blueTeam.players : opponentTeam.players}
                zone={info?.side === 'blue' ? 'pitch' : null}
                readOnly={info?.side === 'red'}
                portraitClubId={info?.side === 'red' ? opponentInfo?.id : null}
            >
                {info?.side === 'blue' && onEditLineup && (
                    <button
                        type="button"
                        className="btn btn--primary btn--small"
                        onClick={() => {
                            setInfo(null)
                            onEditLineup()
                        }}
                    >
                        ✎ EDIT LINEUP
                    </button>
                )}
            </PlayerInfoModal>
        </section>
    )
}
