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
import { UpgradeBadge } from '../CardBits'

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

function Lineup({ title, color, players, align, showCondition = false, showUpgrade = false }) {
    // Phase 26D: OVR hiển thị đã cộng team color (mũi tên xanh, rê chuột xem gốc).
    const teamColor = teamColorOf(players)
    const shown = players.map((player) => withTeamColor(player, teamColor.bonus))

    return (
        <div className={`lineup lineup--${align}`}>
            <div className="lineup__head" style={{ '--team': color }}>
                <span>{title}</span>
                <b>{average(shown)} <small>AVG</small></b>
            </div>
            <ol className="lineup__list">
                {shown.map((player) => (
                    <li key={player.id}>
                        <span className="lineup__number" style={{ '--team': color }}>
                            {player.number}
                        </span>
                        <span className="lineup__name" title={player.name}>
                            {shortPlayerName(player.name, 20)}
                        </span>
                        <em>{player.position}</em>
                        {showCondition && <ConditionChip value={player.condition} />}
                        {showUpgrade && <UpgradeBadge level={player.upgrade} />}
                        <b
                            className={player.teamColorBonus ? 'is-boosted' : ''}
                            title={player.teamColorBonus ? `Base ${player.overall - player.teamColorBonus} + ${player.teamColorBonus} team color` : undefined}
                        >
                            {player.overall}
                        </b>
                    </li>
                ))}
            </ol>
            <TeamColorPanel info={teamColor} compact />
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
    onKickOff,
    onBack,
}) {
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

    return (
        <section className="screen prematch-screen">
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">
                        PRE-MATCH · ROUND {fixture.round} · {isHome ? 'HOME' : 'AWAY'}
                    </div>
                    <h1 className="prematch-title">
                        <ClubCrest clubId={userClubId()} size={40} />
                        {userTeam().name} <span>vs</span> {opponentInfo?.name}
                        <ClubCrest clubId={opponentInfo?.id} size={40} />
                    </h1>
                    <p>
                        League position: {userTeam().shortName} {bluePosition || '–'} · {opponentInfo?.shortName}{' '}
                        {opponentPosition || '–'} · Opponent strength {opponentInfo?.strength}
                        {difficulty && <> · Difficulty {difficulty.label.toUpperCase()}</>}
                    </p>
                </div>
            </div>

            <div className="prematch-body">
                <Lineup
                    title={userTeam().name}
                    color={blueColor}
                    players={blueTeam.players}
                    align="left"
                    showCondition
                />

                <div className="prematch-setup">
                    <div className="home-card">
                        <div className="home-card__head"><span>TEAM SETUP</span></div>

                        <div className="formation-block">
                            <div className="kit-section__head">
                                <span>Formation</span>
                                <small>
                                    {blueTeam.formationKey}
                                    {FORMATION_INFO[blueTeam.formationKey] ? ` · ${FORMATION_INFO[blueTeam.formationKey].note}` : ''}
                                </small>
                            </div>
                            <FormationPicker value={blueTeam.formationKey} onChange={onFormationChange} />
                        </div>

                        <label className="setting-row">
                            <span>Tactic</span>
                            <select value={tacticKey} onChange={onTacticChange} aria-label="Team tactic">
                                {Object.entries(TACTICS).map(([key, value]) => (
                                    <option key={key} value={key}>{value.label}</option>
                                ))}
                            </select>
                        </label>
                        <p className="tactic-summary">{TACTICS[tacticKey]?.summary}</p>

                        {kits && onKitChange && (
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
                                    name={opponentInfo?.shortName || 'OPP'}
                                    current={kits.slots[opponentId]}
                                    otherKit={kits[userClubId()]?.kit}
                                    onChange={onKitChange}
                                />
                            </div>
                        )}

                        <DifficultyPicker
                            difficulty={difficulty}
                            locked={difficultyLocked}
                            onChange={onDifficultyChange}
                        />

                        <button type="button" className="btn btn--block" onClick={onEditLineup}>
                            EDIT LINEUP (DRAG &amp; DROP)
                        </button>
                        <p className="home-card__empty">
                            Lineup changes before kick-off do not use substitutions.
                            The % next to each player is their condition: players who
                            played recently start tired, so rotate the squad.
                        </p>
                    </div>

                    <button type="button" className="btn btn--primary btn--large btn--block" onClick={onKickOff}>
                        KICK OFF
                    </button>
                </div>

                <Lineup
                    title={opponentInfo?.name || opponentTeam.name}
                    color={opponentTeam.color}
                    players={opponentTeam.players}
                    align="right"
                    showUpgrade
                />
            </div>
        </section>
    )
}
