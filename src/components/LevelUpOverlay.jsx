import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LevelRing from './LevelRing'
import { clubXpToNext, levelRewards } from '../services/clubProgress'
import { PACK_TYPES } from '../services/cards'
import { formatMoney } from '../services/clubService'
import { playSuccess } from '../utils/sound'

// Phase 40: hoạt cảnh lên cấp CLB.
//   1. vòng XP chạy nốt tới đầy (từ % trước trận)
//   2. lóe sáng, tia sáng, số cấp nảy lên (lên nhiều cấp một lúc: lặp lại)
//   3. vòng chạy tới % XP hiện tại của cấp mới, phần thưởng hiện lần lượt
// Bấm vào màn hình / Space để tua tới cuối; CONTINUE để đóng.

const FILL_MS = 900
const RESET_MS = 90

function prefersReducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
        return false
    }
}

const ratio = (xp, level) => Math.max(0, Math.min(1, (xp || 0) / clubXpToNext(level)))

export default function LevelUpOverlay({ from, to, onClose }) {
    const finalState = useMemo(
        () => ({ level: to.level, p: ratio(to.xp, to.level), instant: false, done: true }),
        [to.level, to.xp],
    )
    const [view, setView] = useState(() => ({ level: from.level, p: ratio(from.xp, from.level), instant: true, done: false }))
    const [burst, setBurst] = useState(0)
    const timers = useRef([])

    const rewards = useMemo(() => {
        const list = []
        const total = { ep: 0, protection: 0, fitness: 0, form: 0, boost: 0 }

        for (let level = from.level + 1; level <= to.level; level += 1) {
            const reward = levelRewards(level)

            total.ep += reward.ep
            total.protection += reward.protection
            total.fitness += reward.fitness
            total.form += reward.form
            total.boost += reward.boost
            list.push(PACK_TYPES[reward.pack]?.label || 'Player Pack')
        }

        const packs = list.reduce((counts, label) => ({ ...counts, [label]: (counts[label] || 0) + 1 }), {})

        return [
            { key: 'ep', icon: 'EP', label: `${formatMoney(total.ep)} card` },
            ...Object.entries(packs).map(([label, count]) => ({ key: label, icon: '★', label: count > 1 ? `${label} ×${count}` : label })),
            total.protection && { key: 'protection', icon: '⛨', label: `Upgrade Protection${total.protection > 1 ? ` ×${total.protection}` : ''}` },
            total.fitness && { key: 'fitness', icon: '♥', label: `Fitness card${total.fitness > 1 ? ` ×${total.fitness}` : ''}` },
            total.form && { key: 'form', icon: '⬆', label: `Form card${total.form > 1 ? ` ×${total.form}` : ''}` },
            total.boost && { key: 'boost', icon: '▲', label: `Upgrade Boost${total.boost > 1 ? ` ×${total.boost}` : ''}` },
        ].filter(Boolean)
    }, [from.level, to.level])

    const clearTimers = () => {
        timers.current.forEach((id) => clearTimeout(id))
        timers.current = []
    }

    const finish = useCallback(() => {
        clearTimers()
        setView(finalState)
    }, [finalState])

    useEffect(() => {
        if (prefersReducedMotion()) {
            setView(finalState)
            setBurst(1)
            playSuccess(true)
            return clearTimers
        }

        let time = 350
        const at = (delay, action) => {
            time += delay
            timers.current.push(setTimeout(action, time))
        }

        at(0, () => setView((view) => ({ ...view, p: 1, instant: false })))

        for (let level = from.level + 1; level <= to.level; level += 1) {
            const last = level === to.level

            at(FILL_MS + 60, () => {
                setView({ level, p: 0, instant: true, done: false })
                setBurst((count) => count + 1)
                playSuccess(last)
            })
            at(RESET_MS, () =>
                setView((view) => ({ ...view, p: last ? ratio(to.xp, to.level) : 1, instant: false })),
            )

            if (last) at(FILL_MS, () => setView(finalState))
            else time += 260
        }

        return clearTimers
    }, [from.level, to.level, to.xp, finalState])

    useEffect(() => {
        const onKey = (event) => {
            if (event.code !== 'Space' && event.code !== 'Enter' && event.code !== 'Escape') return

            event.preventDefault()
            if (event.repeat) return
            if (view.done) onClose()
            else finish()
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [view.done, finish, onClose])

    const levels = to.level - from.level

    return (
        <div
            className={`levelup-overlay${view.done ? ' is-done' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Club level ${to.level}`}
            onClick={() => !view.done && finish()}
        >
            <div className="levelup-overlay__title">{view.level > from.level ? 'LEVEL UP!' : 'CLUB XP'}</div>
            <div className="levelup-overlay__stage">
                {burst > 0 && <div key={`rays-${burst}`} className="levelup-overlay__rays" />}
                {burst > 0 && <div key={`flash-${burst}`} className="levelup-overlay__flash" />}
                <LevelRing
                    key={`ring-${view.level}`}
                    level={view.level}
                    progress={view.p}
                    size="xl"
                    className={`${view.instant ? 'is-instant' : ''}${burst > 0 ? ' is-pop' : ''}`}
                />
            </div>
            <div className="levelup-overlay__sub">
                CLUB LEVEL {from.level} → <b>{to.level}</b>
                {levels > 1 && <span> · {levels} LEVELS</span>}
            </div>

            {view.done && (
                <>
                    <ul className="levelup-overlay__rewards">
                        {rewards.map((reward, index) => (
                            <li key={reward.key} style={{ '--i': index }}>
                                <i>{reward.icon}</i>
                                {reward.label}
                            </li>
                        ))}
                    </ul>
                    <p className="levelup-overlay__note">Added to CARDS · {to.xp} / {clubXpToNext(to.level)} XP to level {to.level + 1}</p>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={(event) => {
                            event.stopPropagation()
                            onClose()
                        }}
                    >
                        CONTINUE
                    </button>
                </>
            )}
            {!view.done && <div className="levelup-overlay__hint">Tap to skip</div>}
        </div>
    )
}
