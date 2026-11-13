import { naturalPositionOf, positionOverall, positionPenalty } from '../systems/roster'
import TeamColorPanel from './TeamColorPanel'
import FormationPicker from './FormationPicker'
import { TACTICS } from '../systems/constants'
import { clubOfPlayer, teamColorOf } from '../services/teamColor'
import { useMemo, useState } from 'react'
import { shortPlayerName } from '../utils/names'
import ClubCrest from './ClubCrest'
import { UpgradeBadge } from './CardBits'
import PlayerInfoPanel from './PlayerInfoPanel'
import { NATION_BY_NATIONALITY } from '../data/nations'
import { nationalityOf } from '../data/starNationality'
import { userClubId } from '../services/career'
import {
    autoPickXI,
    deletePreset,
    lineupAverage,
    loadPresets,
    previewSwap,
    savePreset,
} from '../services/lineupHelper'
import { ovrTierClass } from '../utils/ovrTier'

// Bảng thay người kiểu FIFA Online:
// - Kéo cầu thủ dự bị thả lên cầu thủ trên sân  → thay người.
// - Kéo cầu thủ trên sân thả lên cầu thủ dự bị → thay người.
// - Kéo cầu thủ trên sân thả lên cầu thủ trên sân → đổi vị trí (không tính lượt).
// - Không kéo được (màn hình cảm ứng): bấm chọn một thẻ rồi bấm thẻ thứ hai.
// - Phase 22 (chỉ trước trận): khu ĐỘI HÌNH NGOÀI. Kéo qua lại giữa sân / dự bị
//   (tối đa 9) / đội hình ngoài; thả lên tiêu đề BENCH / RESERVES để chuyển
//   sang khu đó mà không cần đổi với ai.
// - Phase 29K: bấm một thẻ → bảng thông tin cầu thủ (thẻ lớn, chân dung, team
//   color); bấm thẻ thứ hai → so sánh + nút SWAP (bấm lại thẻ đó cũng đổi).
//   Khi đang chọn một người, mỗi thẻ khác hiện team color / OVR trung bình
//   sẽ đổi bao nhiêu nếu đổi với người đó. Nút làm nổi bật cầu thủ cùng CLB /
//   quốc tịch / cấp thẻ; AUTO PICK XI + UNDO; 3 đội hình lưu sẵn.

const PITCH_HALF_LENGTH = 52.5
const PITCH_HALF_WIDTH = 34

function shortName(player) {
    return shortPlayerName(player.name, 16)
}

// Màu theo thể lực / phong độ thể lực (Phase 19).
const staminaColor = (value) => (value > 60 ? '#7ee081' : value > 35 ? '#ffd166' : '#ff6b5b')

function nationCode(player) {
    const nationality = nationalityOf(player)

    return nationality ? NATION_BY_NATIONALITY.get(nationality)?.shortName || nationality.slice(0, 3).toUpperCase() : null
}

function PlayerCard({
    player,
    zone,
    stamina,
    isPicked,
    isCompared = false,
    isDisabled,
    isDropTarget,
    highlight = null,
    preview = null,
    onPick,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    style,
}) {
    return (
        <div
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            draggable={!isDisabled}
            className={[
                'sub-card',
                `sub-card--${zone}`,
                // Phase 32: nền / vạch trái theo màu OVR của thẻ.
                'ovr-row',
                ovrTierClass(player),
                isPicked ? 'is-picked' : '',
                isCompared ? 'is-compared' : '',
                isDisabled ? 'is-disabled' : '',
                isDropTarget ? 'is-drop-target' : '',
                highlight === true ? 'is-match' : highlight === false ? 'is-faded' : '',
            ].join(' ')}
            style={style}
            onClick={() => !isDisabled && onPick(player.id, zone)}
            onKeyDown={(event) => {
                if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onPick(player.id, zone)
                }
            }}
            onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', JSON.stringify({ id: player.id, zone }))
                event.dataTransfer.effectAllowed = 'move'
                onDragStart(player.id, zone)
            }}
            onDragOver={(event) => {
                if (isDisabled) return
                event.preventDefault()
                onDragOver(player.id)
            }}
            onDragLeave={onDragLeave}
            onDrop={(event) => {
                event.preventDefault()
                if (isDisabled) return

                try {
                    const source = JSON.parse(event.dataTransfer.getData('text/plain'))
                    onDrop(source, { id: player.id, zone })
                } catch {
                    // Dữ liệu kéo không hợp lệ: bỏ qua.
                }
            }}
        >
            <span className="sub-card__number">{player.number}</span>
            <span className="sub-card__name">{shortName(player)}</span>
            <span className="sub-card__meta">
                <em>{player.position}</em>
                {/* Phase 29K: trên sân chỉ có CLB + cấp thẻ ngay trong dòng này (thẻ gọn, không che nhau) */}
                {zone === 'pitch' && (
                    <span className="sub-card__mini">
                        {clubOfPlayer(player) && <ClubCrest clubId={clubOfPlayer(player)} size={11} />}
                        <UpgradeBadge level={player.upgrade} />
                    </span>
                )}
                {/* Sau Phase 27: trên sân, OVR theo vị trí đang đá (đá trái vị trí → giảm). */}
                {zone === 'pitch' && positionPenalty(naturalPositionOf(player), player.position) > 0 ? (
                    <b
                        className="ovr-num is-off-position"
                        title={`${naturalPositionOf(player)} playing ${player.position}: ${player.overall} → ${positionOverall(player)}`}
                    >
                        {positionOverall(player)}
                    </b>
                ) : (
                    <b className="ovr-num">{player.overall}</b>
                )}
            </span>
            {/* Phase 29K: CLB · quốc tịch · cấp thẻ (để ghép team color) */}
            {zone !== 'pitch' && <span className="sub-card__tags">
                {clubOfPlayer(player) && <ClubCrest clubId={clubOfPlayer(player)} size={12} />}
                {nationCode(player) && <i>{nationCode(player)}</i>}
                <UpgradeBadge level={player.upgrade} />
            </span>}
            {preview && (preview.tcDelta || Math.abs(preview.avgDelta) >= 0.3) ? (
                <span
                    className={`sub-card__preview${preview.tcDelta > 0 || (!preview.tcDelta && preview.avgDelta > 0) ? ' is-up' : ' is-down'}`}
                    title="If you swap with the selected player: team color / average OVR of the XI"
                >
                    {preview.tcDelta ? `TC ${preview.tcDelta > 0 ? '+' : ''}${preview.tcDelta} · ` : ''}
                    {preview.avgDelta > 0 ? '+' : ''}{preview.avgDelta.toFixed(1)}
                </span>
            ) : null}
            {isDisabled && <span className="sub-card__flag">SUBBED OFF</span>}
            <span
                className="sub-card__stamina"
                title={`Stamina ${Math.round(stamina)}%`}
            >
                <i style={{ width: `${stamina}%`, background: staminaColor(stamina) }} />
            </span>
        </div>
    )
}

export default function SubstitutionBoard({
    team,
    substitutionCount,
    maxSubstitutions,
    subbedOffIds,
    onSubstitute,
    onSwap,
    onMoveSquad,
    benchLimit = 9,
    onClose,
    isPrematch = false,
    staminaById = null,
    // Phase 29K
    onSetLineup = null,
    onApplyPreset = null,
    // Phase 30A: trong trận đổi được sơ đồ + chiến thuật ngay trong bảng này.
    tacticKey = null,
    onTacticChange = null,
    onFormationChange = null,
}) {
    const [picked, setPicked] = useState(null)
    const [compare, setCompare] = useState(null)
    const [dropTarget, setDropTarget] = useState(null)
    const [feedback, setFeedback] = useState(null)
    const [filter, setFilter] = useState(null)
    const [undo, setUndo] = useState(null)
    const [presets, setPresets] = useState(() => loadPresets(userClubId()))
    const [presetName, setPresetName] = useState('')

    const teamColor = useMemo(() => (team ? teamColorOf(team.players) : null), [team])

    if (!team) return null

    const remaining = maxSubstitutions - substitutionCount

    // Trong trận: thể lực hiện tại; trước trận / dự bị chưa ra sân: phong độ thể lực.
    const staminaOf = (player) =>
        Math.round(staminaById?.[player.id] ?? player.condition ?? 100)

    // Xử lý một cặp (nguồn → đích), dùng chung cho kéo-thả và bấm-chọn.
    const resolve = (source, target) => {
        setPicked(null)
        setCompare(null)
        setDropTarget(null)

        if (!source || !target || source.id === target.id) return

        let result

        if (source.zone === 'reserves' || target.zone === 'reserves') {
            result = onMoveSquad
                ? onMoveSquad(source, target)
                : { ok: false, message: 'Reserves can only be changed before the match.' }
        } else if (!target.id) {
            result = { ok: false, message: 'Drop onto a player to swap.' }
        } else if (source.zone === 'pitch' && target.zone === 'pitch') {
            result = onSwap(source.id, target.id)
        } else if (source.zone === 'bench' && target.zone === 'pitch') {
            result = onSubstitute(target.id, source.id)
        } else if (source.zone === 'pitch' && target.zone === 'bench') {
            result = onSubstitute(source.id, target.id)
        } else {
            result = { ok: false, message: 'Drop a bench player onto a player on the pitch.' }
        }

        if (result) setFeedback(result)
    }

    // Phase 29K: bấm 1 = xem thông tin; bấm người thứ 2 = so sánh (SWAP để
    // đổi, hoặc bấm lại người đó); bấm lại người đầu = bỏ chọn.
    const handlePick = (id, zone) => {
        if (!picked) {
            setPicked({ id, zone })
            setCompare(null)
            setFeedback(null)
            return
        }

        if (picked.id === id) {
            setPicked(null)
            setCompare(null)
            return
        }

        if (compare?.id === id) {
            resolve(picked, compare)
            return
        }

        setCompare({ id, zone })
    }

    const findIn = (ref) =>
        ref
            ? [...team.players, ...team.substitutes, ...(team.reserves || [])].find((player) => player.id === ref.id) || null
            : null

    const pickedPlayer = findIn(picked)
    const comparePlayer = findIn(compare)

    // Người vào sân thì đá ở vị trí của người ra.
    const incomingPosition = (() => {
        if (!picked || !compare) return null
        if (picked.zone !== 'pitch' && compare.zone === 'pitch') return comparePlayer?.position
        if (picked.zone === 'pitch' && compare.zone === 'pitch') return comparePlayer?.position

        return null
    })()

    const previewFor = (id, zone) => (picked && picked.id !== id ? previewSwap(team, picked, { id, zone }) : null)

    // Làm nổi bật cầu thủ hợp team color.
    const topClub = teamColor?.club?.clubId || null
    const topNation = teamColor?.nation?.nationality || null
    const highlightOf = (player) => {
        if (!filter) return null
        if (filter === 'club') return clubOfPlayer(player) === topClub
        if (filter === 'nation') return nationalityOf(player) === topNation

        return (player.upgrade || 1) >= Number(filter.replace('card', ''))
    }

    const filters = [
        topClub ? ['club', `SAME CLUB · ${teamColor.club.name}`] : null,
        topNation ? ['nation', `SAME NATION · ${topNation}`] : null,
        ['card5', 'CARD ≥ +5'],
        ['card8', 'CARD ≥ +8'],
        ['card10', 'CARD +10'],
    ].filter(Boolean)

    const snapshot = () => ({
        players: team.players,
        substitutes: team.substitutes,
        reserves: team.reserves || [],
        formationKey: team.formationKey,
    })

    const runAutoPick = () => {
        const next = autoPickXI(team, benchLimit)

        if (!next) {
            setFeedback({ ok: false, message: 'Not enough players for this formation (a goalkeeper is needed).' })
            return
        }

        const before = lineupAverage(team.players)
        const tcBefore = teamColor?.bonus || 0

        setUndo(snapshot())
        onSetLineup(next)
        setPicked(null)
        setCompare(null)
        setFeedback({
            ok: true,
            message: `Auto pick: average OVR ${before.toFixed(1)} → ${lineupAverage(next.players).toFixed(1)}, team color +${tcBefore} → +${teamColorOf(next.players).bonus}${
                team.players.some((player) => (player.condition ?? 100) < 60 && !next.players.some((item) => item.id === player.id))
                    ? ' · tired players rested'
                    : ''
            }.`,
        })
    }

    const runUndo = () => {
        if (!undo) return

        onSetLineup(undo)
        setUndo(null)
        setFeedback({ ok: true, message: 'Lineup restored.' })
    }

    const loadSlot = (index) => {
        const preset = presets[index]

        if (!preset || !onApplyPreset) return

        setUndo(snapshot())

        const result = onApplyPreset(preset)

        setPicked(null)
        setCompare(null)
        setFeedback(result || { ok: true, message: `Loaded "${preset.name}".` })
    }

    const saveSlot = (index) => {
        const name = presetName.trim() || presets[index]?.name || `Lineup ${index + 1}`

        setPresets(savePreset(userClubId(), index, team, name))
        setPresetName('')
        setFeedback({ ok: true, message: `Saved the current lineup as "${name}".` })
    }

    const deleteSlot = (index) => {
        setPresets(deletePreset(userClubId(), index))
        setFeedback({ ok: true, message: 'Saved lineup deleted.' })
    }

    // Thả lên tiêu đề khu vực (BENCH / RESERVES): chuyển sang khu đó.
    const zoneDropProps = (zone) => ({
        onDragOver: (event) => {
            event.preventDefault()
            setDropTarget(`zone:${zone}`)
        },
        onDragLeave: () => setDropTarget(null),
        onDrop: (event) => {
            event.preventDefault()

            try {
                const source = JSON.parse(event.dataTransfer.getData('text/plain'))
                resolve(source, { id: null, zone })
            } catch {
                // bỏ qua
            }
        },
        onClick: () => {
            if (picked && picked.zone !== zone) resolve(picked, { id: null, zone })
        },
    })

    const reserves = team.reserves || []

    const cardHandlers = {
        onPick: handlePick,
        onDragStart: (id, zone) => {
            setPicked({ id, zone })
            setCompare(null)
            setFeedback(null)
        },
        onDragOver: (id) => setDropTarget(id),
        onDragLeave: () => setDropTarget(null),
        onDrop: resolve,
    }

    return (
        <div className="match-overlay match-overlay--dim match-overlay--top">
            <div className={`match-card sub-board${pickedPlayer ? ' has-info' : ''}`} role="dialog" aria-label="Substitutions">
                <div className="sub-board__header">
                    <div>
                        <div className="match-card__eyebrow">TEAM MANAGEMENT</div>
                        <div className="sub-board__title">
                            {isPrematch ? 'Starting lineup' : 'Team & substitutions'}
                        </div>
                    </div>
                    {isPrematch ? (
                        <div className="sub-board__count">
                            PRE-MATCH
                            <small>NO LIMIT</small>
                        </div>
                    ) : (
                        <div className={`sub-board__count${remaining <= 0 ? ' is-empty' : ''}`}>
                            {substitutionCount}/{maxSubstitutions}
                            <small>USED</small>
                        </div>
                    )}
                </div>

                {/* Phase 26D: team color của 11 người đá chính (tính lại khi đổi người) */}
                <TeamColorPanel info={teamColor} compact />

                {/* Phase 29K: công cụ xếp đội hình */}
                <div className="sub-tools">
                    <div className="sub-tools__filters" role="group" aria-label="Highlight players">
                        <span>HIGHLIGHT</span>
                        {filters.map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                className={`chip${filter === id ? ' is-active' : ''}`}
                                aria-pressed={filter === id}
                                onClick={() => setFilter((value) => (value === id ? null : id))}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {isPrematch && onSetLineup && (
                        <div className="sub-tools__actions">
                            <button type="button" className="btn btn--small btn--primary" onClick={runAutoPick} title="Best XI for this formation: OVR at each position, fitness, form and team color">
                                ⚡ AUTO PICK XI
                            </button>
                            {undo && (
                                <button type="button" className="btn btn--small" onClick={runUndo}>↶ UNDO</button>
                            )}
                        </div>
                    )}
                </div>

                {/* Phase 30A: sơ đồ + chiến thuật trong trận (áp dụng khi đá tiếp) */}
                {!isPrematch && (onFormationChange || onTacticChange) && (
                    <div className="sub-tactics">
                        {onTacticChange && (
                            <label className="sub-tactics__tactic">
                                <span>TACTIC</span>
                                <select value={tacticKey || 'balanced'} onChange={(event) => onTacticChange(event.target.value)} aria-label="Team tactic">
                                    {Object.entries(TACTICS).map(([key, value]) => (
                                        <option key={key} value={key}>{value.label}</option>
                                    ))}
                                </select>
                                <small>{TACTICS[tacticKey]?.summary}</small>
                            </label>
                        )}
                        {onFormationChange && (
                            <div className="sub-tactics__formation">
                                <span>FORMATION · {team.formationKey}</span>
                                <FormationPicker value={team.formationKey} onChange={onFormationChange} compact />
                            </div>
                        )}
                        <p className="sub-tactics__note">
                            Changing formation, tactic or swapping two starters does not use a substitution.
                        </p>
                    </div>
                )}

                {isPrematch && onApplyPreset && (
                    <div className="sub-presets" aria-label="Saved lineups">
                        <span>SAVED LINEUPS</span>
                        {presets.map((preset, index) => (
                            <div key={index} className={`sub-presets__slot${preset ? '' : ' is-empty'}`}>
                                <b title={preset ? `${preset.formationKey || ''} · saved ${new Date(preset.savedAt).toLocaleDateString()}` : 'Empty slot'}>
                                    {preset ? preset.name : `Slot ${index + 1} · empty`}
                                </b>
                                {preset && (
                                    <button type="button" className="link-btn" onClick={() => loadSlot(index)}>LOAD</button>
                                )}
                                <button type="button" className="link-btn" onClick={() => saveSlot(index)}>SAVE</button>
                                {preset && (
                                    <button type="button" className="link-btn" onClick={() => deleteSlot(index)} aria-label={`Delete ${preset.name}`}>✕</button>
                                )}
                            </div>
                        ))}
                        <input
                            type="text"
                            value={presetName}
                            maxLength={20}
                            placeholder="Name for SAVE"
                            onChange={(event) => setPresetName(event.target.value)}
                            aria-label="Name for the saved lineup"
                        />
                    </div>
                )}

                <div className="sub-board__body">
                    {/* Sân dọc: khung thành nhà ở dưới, tấn công lên trên */}
                    <div className="sub-pitch">
                        <div className="sub-pitch__lines" />
                        {team.players.map((player) => {
                            const left = ((player.x ?? 0) + PITCH_HALF_WIDTH) / (PITCH_HALF_WIDTH * 2)
                            const top = ((player.z ?? 0) + PITCH_HALF_LENGTH) / (PITCH_HALF_LENGTH * 2)

                            return (
                                <PlayerCard
                                    key={player.id}
                                    player={player}
                                    stamina={staminaOf(player)}
                                    zone="pitch"
                                    isPicked={picked?.id === player.id}
                                    isCompared={compare?.id === player.id}
                                    highlight={highlightOf(player)}
                                    preview={previewFor(player.id, 'pitch')}
                                    isDropTarget={dropTarget === player.id}
                                    style={{
                                        left: `${Math.min(92, Math.max(8, left * 100))}%`,
                                        top: `${Math.min(92, Math.max(7, top * 100))}%`,
                                    }}
                                    {...cardHandlers}
                                />
                            )
                        })}
                    </div>

                    <div className="sub-bench">
                        <div
                            className={`sub-bench__title${dropTarget === 'zone:bench' ? ' is-drop-target' : ''}`}
                            {...(isPrematch ? zoneDropProps('bench') : {})}
                        >
                            BENCH {team.substitutes.length}/{benchLimit}
                        </div>
                        {team.substitutes.map((player) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                stamina={staminaOf(player)}
                                zone="bench"
                                isPicked={picked?.id === player.id}
                                isCompared={compare?.id === player.id}
                                highlight={highlightOf(player)}
                                preview={previewFor(player.id, 'bench')}
                                isDisabled={subbedOffIds.includes(player.id)}
                                isDropTarget={dropTarget === player.id}
                                {...cardHandlers}
                            />
                        ))}

                        {isPrematch && (
                            <>
                                <div
                                    className={`sub-bench__title sub-bench__title--reserves${dropTarget === 'zone:reserves' ? ' is-drop-target' : ''}`}
                                    {...zoneDropProps('reserves')}
                                >
                                    RESERVES {reserves.length}
                                </div>
                                {reserves.length === 0 && (
                                    <div className="sub-bench__empty">Drop a bench player here to leave him out of the matchday squad.</div>
                                )}
                                {reserves.map((player) => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        stamina={staminaOf(player)}
                                        zone="reserves"
                                        isPicked={picked?.id === player.id}
                                        isCompared={compare?.id === player.id}
                                        highlight={highlightOf(player)}
                                        preview={previewFor(player.id, 'reserves')}
                                        isDropTarget={dropTarget === player.id}
                                        {...cardHandlers}
                                    />
                                ))}
                            </>
                        )}
                    </div>

                    {pickedPlayer && (
                        <aside className="sub-info" aria-label="Player info">
                            <PlayerInfoPanel
                                player={pickedPlayer}
                                xi={team.players}
                                zone={picked.zone}
                                compareWith={comparePlayer}
                                compareAt={incomingPosition}
                            >
                                {comparePlayer ? (
                                    <>
                                        <button type="button" className="btn btn--primary btn--small" onClick={() => resolve(picked, compare)}>
                                            ⇄ SWAP
                                        </button>
                                        <button type="button" className="btn btn--small btn--ghost" onClick={() => setCompare(null)}>
                                            CLEAR COMPARE
                                        </button>
                                    </>
                                ) : (
                                    <small className="sub-info__hint">Click another player to compare and swap.</small>
                                )}
                                <button type="button" className="btn btn--small btn--ghost" onClick={() => { setPicked(null); setCompare(null) }}>
                                    CLOSE
                                </button>
                            </PlayerInfoPanel>
                        </aside>
                    )}
                </div>

                <div className="sub-board__footer">
                    <div
                        className={`sub-board__feedback${feedback ? (feedback.ok ? ' is-ok' : ' is-error') : ''}`}
                        aria-live="polite"
                    >
                        {feedback?.message ||
                            (compare
                                ? 'Press SWAP (or click the second player again) to swap.'
                                : picked
                                ? 'Click another player to compare, or drag onto him to swap.'
                                : isPrematch
                                    ? 'Drag between pitch, bench (max ' + benchLimit + ') and reserves. Only reserves can be sold.'
                                    : 'Drag a bench player onto a starter to substitute. Drag starter onto starter to swap positions.')}
                    </div>
                    <button type="button" className="btn btn--primary" onClick={onClose}>
                        DONE
                    </button>
                </div>
            </div>
        </div>
    )
}
