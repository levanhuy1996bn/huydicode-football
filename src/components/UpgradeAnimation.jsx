import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlayerCardView, StatNum, UpgradeBadge } from './CardBits'
import { upgradeTier } from '../services/upgrade'
import { isMuted, playFailure, playHeartbeat, playSuccess, setMuted } from '../utils/sound'
import { userClubId } from '../services/career'
import { ovrTier, ovrTierIndex, ovrTierLabel } from '../utils/ovrTier'

// Phase 25: hoạt cảnh đập thẻ kiểu FIFA Online. Kết quả đã được quyết định
// lúc bấm nút; hoạt cảnh chỉ tạo kịch tính:
//   1. gather  — thẻ nguyên liệu + thẻ phụ bay vào thẻ chính (~0.6s)
//   2. beat    — thẻ đập theo nhịp tim, nhanh dần; vòng năng lượng đầy dần
//   3. reveal  — thành công: chớp trắng, tia sáng màu cấp mới, +N nảy lên,
//                chỉ số đếm lên; thất bại: tắt sáng, rung, chớp đỏ, FAILED
// Bấm vào màn hình hoặc Space để bỏ qua tới kết quả.

const STAT_KEYS = [
    ['pace', 'PAC'],
    ['shooting', 'SHO'],
    ['passing', 'PAS'],
    ['dribbling', 'DRI'],
    ['defending', 'DEF'],
    ['physical', 'PHY'],
]

function beatsFor(target) {
    if (target >= 8) return 6
    if (target >= 6) return 5
    if (target >= 4) return 4
    return 3
}

function prefersReducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
        return false
    }
}

// Đếm số từ `from` tới `to` trong `duration` ms khi `active`.
function useCountUp(from, to, active, duration = 900) {
    const [value, setValue] = useState(from)

    useEffect(() => {
        if (!active) {
            setValue(from)
            return undefined
        }

        if (from === to) {
            setValue(to)
            return undefined
        }

        let frame = 0
        const start = performance.now()

        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3)

            setValue(Math.round(from + (to - from) * eased))
            if (t < 1) frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [from, to, active, duration])

    return value
}

function CountStat({ label, from, to, active }) {
    const value = useCountUp(from, to, active)
    const delta = to - from

    return (
        <div className="upgrade-anim__stat">
            <span>{label}</span>
            <StatNum value={value} />
            {active && delta !== 0 && (
                <em className={delta > 0 ? 'is-up' : 'is-down'}>{delta > 0 ? `+${delta}` : delta}</em>
            )}
        </div>
    )
}

export default function UpgradeAnimation({ before, after, result, materials = [], onDone, canAgain }) {
    const reduced = useMemo(prefersReducedMotion, [])
    const target = result.from + 1
    const beats = reduced ? 1 : beatsFor(target)
    const [phase, setPhase] = useState(reduced ? 'beat' : 'gather')
    const [beat, setBeat] = useState(0)
    const [muted, setMutedState] = useState(isMuted)
    const timers = useRef([])

    const clearTimers = () => {
        timers.current.forEach((id) => clearTimeout(id))
        timers.current = []
    }

    const reveal = useCallback(() => {
        clearTimers()
        setPhase((current) => {
            if (current === 'reveal') return current

            if (result.success) playSuccess(result.to >= 8)
            else playFailure()

            return 'reveal'
        })
    }, [result])

    // Lịch nhịp: khoảng cách giữa hai nhịp giảm dần (nhanh dần).
    useEffect(() => {
        const schedule = (fn, delay) => timers.current.push(setTimeout(fn, delay))
        let time = reduced ? 0 : 650

        if (!reduced) schedule(() => setPhase('beat'), time)

        for (let index = 0; index < beats; index += 1) {
            const at = time

            schedule(() => {
                setBeat(index + 1)
                playHeartbeat(beats > 1 ? index / (beats - 1) : 1)
            }, at)
            time += reduced ? 300 : Math.round(640 * Math.pow(0.84, index))
        }

        schedule(reveal, time + (reduced ? 0 : 250))

        return clearTimers
    }, [beats, reduced, reveal])

    // Space / Enter: bỏ qua tới kết quả; đang ở kết quả → CONTINUE.
    useEffect(() => {
        const onKey = (event) => {
            if (event.code === 'Space' || event.code === 'Enter') {
                event.preventDefault()
                if (event.repeat) return
                if (phase !== 'reveal') reveal()
                else onDone?.()
            }
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [phase, reveal, onDone])

    const toggleMute = (event) => {
        event.stopPropagation()
        setMuted(!muted)
        setMutedState(!muted)
    }

    const revealed = phase === 'reveal'
    const shown = revealed ? after : before
    const tier = upgradeTier(revealed ? result.to : result.from)
    const lastBeat = beat === beats && phase === 'beat'
    const dropped = !result.success && result.to < result.from
    const confetti = revealed && result.success && result.to >= 8 && !reduced

    return (
        <div
            className={[
                'upgrade-anim',
                `upgrade-anim--${phase}`,
                revealed ? (result.success ? 'is-success' : 'is-fail') : '',
                reduced ? 'is-reduced' : '',
            ].join(' ')}
            role="dialog"
            aria-label="Card upgrade"
            onClick={() => !revealed && reveal()}
        >
            <button type="button" className="upgrade-anim__mute" onClick={toggleMute} aria-label={muted ? 'Sound on' : 'Mute'}>
                {muted ? 'SOUND OFF' : 'SOUND ON'}
            </button>

            <div className="upgrade-anim__title">
                {revealed
                    ? result.success
                        ? `SUCCESS · +${result.from} → +${result.to}`
                        : dropped
                            ? `FAILED · +${result.from} → +${result.to}`
                            : result.protectedDrop
                                ? `FAILED · PROTECTED · STAYS +${result.to}`
                                : 'FAILED'
                    : `UPGRADING TO +${target} · ${Math.round(result.rate * 100)}%`}
            </div>

            <div className={`upgrade-anim__stage${lastBeat && target >= 8 && !reduced ? ' is-shaking' : ''}`}>
                {/* Thẻ nguyên liệu / thẻ phụ bay vào */}
                {!reduced && phase === 'gather' && materials.map((card, index) => (
                    <div
                        key={card.id}
                        className="upgrade-anim__fly"
                        style={{
                            '--from-x': `${Math.cos((index / materials.length) * Math.PI * 2) * 260}px`,
                            '--from-y': `${Math.sin((index / materials.length) * Math.PI * 2) * 200}px`,
                            animationDelay: `${index * 70}ms`,
                        }}
                    >
                        <b>{card.overall}</b>
                        <UpgradeBadge level={card.upgrade} />
                    </div>
                ))}

                {revealed && result.success && <div className={`upgrade-anim__rays upgrade-anim__rays--${tier}`} />}

                <svg className="upgrade-anim__ring" viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="54" className="upgrade-anim__ring-track" />
                    <circle
                        cx="60"
                        cy="60"
                        r="54"
                        className={`upgrade-anim__ring-fill upgrade-anim__ring-fill--${upgradeTier(target)}`}
                        style={{ strokeDashoffset: 339.3 * (1 - (revealed ? 1 : beat / beats)) }}
                    />
                </svg>

                <div key={`beat-${beat}`} className={`upgrade-anim__card${phase === 'beat' && beat > 0 ? ' is-beating' : ''}`}>
                    <PlayerCardView player={shown} hideBadge portraitClubId={userClubId()} />
                    <span
                        key={revealed ? 'after' : 'before'}
                        className={`upgrade-anim__badge${revealed ? (result.success ? ' is-pop' : dropped ? ' is-crack' : '') : ''}`}
                    >
                        <UpgradeBadge level={revealed ? result.to : result.from} size="large" />
                    </span>
                </div>

                {revealed && result.success && <div className="upgrade-anim__flash" />}
                {revealed && !result.success && <div className="upgrade-anim__flash upgrade-anim__flash--fail" />}
                {revealed && result.success && result.to >= 10 && !reduced && <div className="upgrade-anim__sparkle" />}
                {confetti && (
                    <div className="upgrade-anim__confetti" aria-hidden="true">
                        {Array.from({ length: 36 }, (_, index) => (
                            <i
                                key={index}
                                style={{
                                    left: `${(index * 37) % 100}%`,
                                    animationDelay: `${(index % 9) * 60}ms`,
                                    background: ['#ffd34d', '#b9ed70', '#7cc4ff', '#ff8a7a', '#e3b6ff'][index % 5],
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="upgrade-anim__ovr">
                <span>OVR</span>
                <StatNum value={before.overall} />
                <b>→</b>
                <CountOverall from={before.overall} to={after.overall} active={revealed} />
            </div>

            {/* Phase 32: thẻ lên mức màu OVR mới (trắng → xanh lá → vàng → …). */}
            {revealed && result.success && ovrTierIndex(after.overall) > ovrTierIndex(before.overall) && (
                <div className={`ovr-tier-banner ovr-tier--${ovrTier(after.overall)}`}>
                    NEW TIER · {ovrTierLabel(after.overall)}
                </div>
            )}

            <div className="upgrade-anim__stats">
                {STAT_KEYS.map(([key, label]) => (
                    <CountStat key={key} label={label} from={before[key]} to={after[key]} active={revealed} />
                ))}
            </div>

            {revealed && !result.success && result.insuranceNext > 0 && (
                <div className="upgrade-anim__insurance">
                    Insurance for +{result.from + 1}: <b>+{Math.round(result.insuranceNext * 100)}%</b> on the next try
                </div>
            )}

            {revealed ? (
                <div className="upgrade-anim__actions" onClick={(event) => event.stopPropagation()}>
                    {/* Phase 40: một nút (DONE và UPGRADE AGAIN trước đây gần như giống nhau):
                        quay lại thẻ, tự chọn sẵn nguyên liệu tốt nhất nếu còn. */}
                    <button type="button" className="btn btn--primary" onClick={onDone}>
                        {canAgain ? 'CONTINUE · UPGRADE AGAIN' : 'CONTINUE'}
                    </button>
                </div>
            ) : (
                <div className="upgrade-anim__hint">Click or press Space to skip</div>
            )}
        </div>
    )
}

function CountOverall({ from, to, active }) {
    const value = useCountUp(from, to, active)

    return <StatNum value={active ? value : '?'} className="upgrade-anim__ovr-new" />
}
