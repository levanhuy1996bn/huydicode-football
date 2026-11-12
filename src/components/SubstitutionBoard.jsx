import { naturalPositionOf, positionOverall, positionPenalty } from '../systems/roster'
import TeamColorPanel from './TeamColorPanel'
import { teamColorOf } from '../services/teamColor'
import { useState } from 'react'
import { shortPlayerName } from '../utils/names'

// Bảng thay người kiểu FIFA Online:
// - Kéo cầu thủ dự bị thả lên cầu thủ trên sân  → thay người.
// - Kéo cầu thủ trên sân thả lên cầu thủ dự bị → thay người.
// - Kéo cầu thủ trên sân thả lên cầu thủ trên sân → đổi vị trí (không tính lượt).
// - Không kéo được (màn hình cảm ứng): bấm chọn một thẻ rồi bấm thẻ thứ hai.
// - Phase 22 (chỉ trước trận): khu ĐỘI HÌNH NGOÀI. Kéo qua lại giữa sân / dự bị
//   (tối đa 9) / đội hình ngoài; thả lên tiêu đề BENCH / RESERVES để chuyển
//   sang khu đó mà không cần đổi với ai.

const PITCH_HALF_LENGTH = 52.5
const PITCH_HALF_WIDTH = 34

function shortName(player) {
    return shortPlayerName(player.name, 16)
}

// Màu theo thể lực / phong độ thể lực (Phase 19).
const staminaColor = (value) => (value > 60 ? '#7ee081' : value > 35 ? '#ffd166' : '#ff6b5b')

function PlayerCard({
    player,
    zone,
    stamina,
    isPicked,
    isDisabled,
    isDropTarget,
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
                isPicked ? 'is-picked' : '',
                isDisabled ? 'is-disabled' : '',
                isDropTarget ? 'is-drop-target' : '',
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
                {/* Sau Phase 27: trên sân, OVR theo vị trí đang đá (đá trái vị trí → giảm). */}
                {zone === 'pitch' && positionPenalty(naturalPositionOf(player), player.position) > 0 ? (
                    <b
                        className="is-off-position"
                        title={`${naturalPositionOf(player)} playing ${player.position}: ${player.overall} → ${positionOverall(player)}`}
                    >
                        {positionOverall(player)}
                    </b>
                ) : (
                    <b>{player.overall}</b>
                )}
            </span>
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
}) {
    const [picked, setPicked] = useState(null)
    const [dropTarget, setDropTarget] = useState(null)
    const [feedback, setFeedback] = useState(null)

    if (!team) return null

    const remaining = maxSubstitutions - substitutionCount

    // Trong trận: thể lực hiện tại; trước trận / dự bị chưa ra sân: phong độ thể lực.
    const staminaOf = (player) =>
        Math.round(staminaById?.[player.id] ?? player.condition ?? 100)

    // Xử lý một cặp (nguồn → đích), dùng chung cho kéo-thả và bấm-chọn.
    const resolve = (source, target) => {
        setPicked(null)
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

    const handlePick = (id, zone) => {
        if (!picked) {
            setPicked({ id, zone })
            setFeedback(null)
            return
        }

        if (picked.id === id) {
            setPicked(null)
            return
        }

        resolve(picked, { id, zone })
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
            setFeedback(null)
        },
        onDragOver: (id) => setDropTarget(id),
        onDragLeave: () => setDropTarget(null),
        onDrop: resolve,
    }

    return (
        <div className="match-overlay match-overlay--dim match-overlay--top">
            <div className="match-card sub-board" role="dialog" aria-label="Substitutions">
                <div className="sub-board__header">
                    <div>
                        <div className="match-card__eyebrow">TEAM MANAGEMENT</div>
                        <div className="sub-board__title">
                            {isPrematch ? 'Starting lineup' : 'Substitutions'}
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
                <TeamColorPanel info={teamColorOf(team.players)} compact />

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
                                        isDropTarget={dropTarget === player.id}
                                        {...cardHandlers}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                <div className="sub-board__footer">
                    <div
                        className={`sub-board__feedback${feedback ? (feedback.ok ? ' is-ok' : ' is-error') : ''}`}
                        aria-live="polite"
                    >
                        {feedback?.message ||
                            (picked
                                ? 'Now drop on (or click) the player to swap with.'
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
