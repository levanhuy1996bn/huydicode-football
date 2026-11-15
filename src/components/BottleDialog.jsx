import { useEffect, useMemo, useState } from 'react'
import { progressOf } from '../systems/progression'
import { ovrTierClass } from '../utils/ovrTier'
import { EXP_BOTTLE_SHARE, bottleXpOf, drainCandidates, previewGive, totalXpOf } from '../services/xpBottle'

// Phase 46: chọn cầu thủ cho bình EXP.
//   mode 'drain' : bình rỗng — chọn người bị hút (dự bị / đội hình ngoài)
//   mode 'give'  : bình đầy  — chọn người nhận (cả đội)
// Hai bước: chọn trong danh sách → bảng xác nhận → CONFIRM.
const fmt = (value) => Math.round(value || 0).toLocaleString('en-US')
const GROUP_LABEL = { starter: 'XI', bench: 'BENCH', reserve: 'RESERVES' }

export default function BottleDialog({ mode, item, team, onCancel, onConfirm }) {
    const [selectedId, setSelectedId] = useState(null)
    const drain = mode === 'drain'

    const rows = useMemo(() => {
        if (drain) return drainCandidates(team)

        return [
            ...(team?.players || []).map((player) => ({ player, group: 'starter' })),
            ...(team?.substitutes || []).map((player) => ({ player, group: 'bench' })),
            ...(team?.reserves || []).map((player) => ({ player, group: 'reserve' })),
        ]
    }, [drain, team])

    const selected = rows.find((row) => row.player.id === selectedId)?.player || null

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') {
                if (selectedId) setSelectedId(null)
                else onCancel()
            }
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [selectedId, onCancel])

    const amount = item?.xp || 0

    return (
        <div className="sell-confirm-overlay bottle-dialog-overlay" role="presentation" onClick={onCancel}>
            <div
                className="sell-confirm bottle-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={drain ? 'Choose a player to drain' : 'Choose who receives the XP'}
                onClick={(event) => event.stopPropagation()}
            >
                <h3>
                    <span className={`bottle-icon${drain ? '' : ' is-full'}`} aria-hidden="true">🧪</span>{' '}
                    {drain ? 'EMPTY EXP BOTTLE' : `EXP BOTTLE · ${fmt(amount)} XP`}
                </h3>

                {!selected ? (
                    <>
                        <p className="sell-confirm__note">
                            {drain
                                ? `Choose a bench or reserve player to drain. He goes back to level 1 and the bottle keeps ${Math.round(EXP_BOTTLE_SHARE * 100)}% of his XP. Starting XI players can't be drained.`
                                : `Choose who receives ${fmt(amount)} XP${item?.from ? ` (from ${item.from})` : ''}. He levels up as after matches; spend the points in SQUAD → TRAINING.`}
                        </p>

                        {rows.length === 0 ? (
                            <p className="sell-confirm__warn">
                                No bench or reserve player has any XP to drain yet.
                            </p>
                        ) : (
                            <ul className="bottle-list">
                                {rows.map(({ player, group }) => {
                                    const progress = progressOf(player)
                                    const preview = drain ? null : previewGive(player, amount)
                                    const disabled = !drain && preview.atMax

                                    return (
                                        <li key={player.id}>
                                            <button
                                                type="button"
                                                className={`bottle-row ovr-row ${ovrTierClass(player)}`}
                                                disabled={disabled}
                                                onClick={() => setSelectedId(player.id)}
                                            >
                                                <span className="bottle-row__ovr ovr-num">{player.overall}</span>
                                                <span className="bottle-row__name">
                                                    <b>{player.name}</b>
                                                    <small>
                                                        {player.position} · {GROUP_LABEL[group]}
                                                        {(player.upgrade || 1) > 1 ? ` · +${player.upgrade}` : ''}
                                                    </small>
                                                </span>
                                                <span className="bottle-row__xp">
                                                    <b>Lv {progress.level}</b>
                                                    <small>
                                                        {drain
                                                            ? `${fmt(totalXpOf(player))} XP → bottle ${fmt(bottleXpOf(player))}`
                                                            : disabled
                                                                ? 'MAX LEVEL'
                                                                : `→ Lv ${preview.level}${preview.pointsGained ? ` · +${preview.pointsGained} pts` : ''}`}
                                                    </small>
                                                </span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        <div className="sell-confirm__actions">
                            <button type="button" className="btn" onClick={onCancel}>CANCEL</button>
                        </div>
                    </>
                ) : drain ? (
                    <>
                        <div className="sell-confirm__card">
                            <span>⚠</span>
                            <span>
                                Drain {selected.name}?<br />
                                <small>{selected.position} · OVR {selected.overall} · card +{selected.upgrade || 1}</small>
                            </span>
                        </div>
                        <dl className="sell-confirm__money">
                            <div><dt>His XP</dt><dd>{fmt(totalXpOf(selected))} XP (level {progressOf(selected).level})</dd></div>
                            <div><dt>Bottle gets ({Math.round(EXP_BOTTLE_SHARE * 100)}%)</dt><dd className="is-gain">{fmt(bottleXpOf(selected))} XP</dd></div>
                            <div><dt>After</dt><dd>level 1 · OVR {selected.baseOverall ?? selected.overall}</dd></div>
                        </dl>
                        <p className="sell-confirm__warn">
                            He goes back to level 1: all trained points are removed. His card level +{selected.upgrade || 1}, form and
                            fitness are kept. This can't be undone.
                        </p>
                        <div className="sell-confirm__actions">
                            <button type="button" className="btn" onClick={() => setSelectedId(null)}>BACK</button>
                            <button type="button" className="btn btn--danger" onClick={() => onConfirm(selected.id)}>DRAIN</button>
                        </div>
                    </>
                ) : (
                    (() => {
                        const preview = previewGive(selected, amount)

                        return (
                            <>
                                <div className="sell-confirm__card">
                                    <span>🧪</span>
                                    <span>
                                        Give {fmt(amount)} XP to {selected.name}?<br />
                                        <small>{selected.position} · OVR {selected.overall}</small>
                                    </span>
                                </div>
                                <dl className="sell-confirm__money">
                                    <div><dt>Level</dt><dd className="is-gain">{preview.levelBefore} → {preview.level}</dd></div>
                                    <div><dt>Points to spend</dt><dd>+{preview.pointsGained}</dd></div>
                                </dl>
                                {preview.wasted > 0 && (
                                    <p className="sell-confirm__warn">He reaches level 100: {fmt(preview.wasted)} XP will be lost.</p>
                                )}
                                <div className="sell-confirm__actions">
                                    <button type="button" className="btn" onClick={() => setSelectedId(null)}>BACK</button>
                                    <button type="button" className="btn btn--primary" onClick={() => onConfirm(selected.id)}>GIVE XP</button>
                                </div>
                            </>
                        )
                    })()
                )}
            </div>
        </div>
    )
}
