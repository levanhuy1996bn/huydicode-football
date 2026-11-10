import { useState } from 'react'

// Bảng thay người kiểu FIFA Online:
// - Kéo cầu thủ dự bị thả lên cầu thủ trên sân  → thay người.
// - Kéo cầu thủ trên sân thả lên cầu thủ dự bị → thay người.
// - Kéo cầu thủ trên sân thả lên cầu thủ trên sân → đổi vị trí (không tính lượt).
// - Không kéo được (màn hình cảm ứng): bấm chọn một thẻ rồi bấm thẻ thứ hai.

const PITCH_HALF_LENGTH = 52.5
const PITCH_HALF_WIDTH = 34

function shortName(player) {
    const name = String(player.name || '')

    if (/^(Blue|Red) [A-Z]{2,3} \d+$/.test(name)) return name

    const parts = name.split(' ')

    return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : name
}

function PlayerCard({
    player,
    zone,
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
                <b>{player.overall}</b>
            </span>
            {isDisabled && <span className="sub-card__flag">SUBBED OFF</span>}
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
    onClose,
}) {
    const [picked, setPicked] = useState(null)
    const [dropTarget, setDropTarget] = useState(null)
    const [feedback, setFeedback] = useState(null)

    if (!team) return null

    const remaining = maxSubstitutions - substitutionCount

    // Xử lý một cặp (nguồn → đích), dùng chung cho kéo-thả và bấm-chọn.
    const resolve = (source, target) => {
        setPicked(null)
        setDropTarget(null)

        if (!source || !target || source.id === target.id) return

        let result

        if (source.zone === 'pitch' && target.zone === 'pitch') {
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
                        <div className="sub-board__title">Substitutions</div>
                    </div>
                    <div className={`sub-board__count${remaining <= 0 ? ' is-empty' : ''}`}>
                        {substitutionCount}/{maxSubstitutions}
                        <small>USED</small>
                    </div>
                </div>

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
                        <div className="sub-bench__title">BENCH</div>
                        {team.substitutes.map((player) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                zone="bench"
                                isPicked={picked?.id === player.id}
                                isDisabled={subbedOffIds.includes(player.id)}
                                isDropTarget={dropTarget === player.id}
                                {...cardHandlers}
                            />
                        ))}
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
