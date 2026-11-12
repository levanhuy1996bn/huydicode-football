import { useEffect, useMemo, useRef, useState } from 'react'
import ClubCrest from '../ClubCrest'

// Phase 28: hoạt cảnh mô phỏng nhanh. Kết quả đã tính và lưu sẵn; màn này
// chỉ phát lại: đồng hồ 0' → 90' (~24 giây, ×2 hoặc bỏ qua), sân 2D nhìn từ
// trên với chấm bóng chạy theo diễn biến, bình luận theo phút, thanh kiểm
// soát bóng / đà trận đấu, tỉ số nhảy khi có bàn thắng.
const DURATION = 24000 // ms cho 90 phút ở tốc độ ×1
const HALFTIME_PAUSE = 1200

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default function SimulationScreen({ label, blue, red, result, onDone }) {
    const [minute, setMinute] = useState(0)
    const [speed, setSpeed] = useState(1)
    const [finished, setFinished] = useState(false)
    const [flash, setFlash] = useState(null)
    const [halftime, setHalftime] = useState(false)
    const clockRef = useRef({ minute: 0, last: null, pauseUntil: 0, halftimeDone: false })
    const speedRef = useRef(1)
    const seenGoals = useRef(0)

    speedRef.current = speed

    const events = result.timeline
    const lastMinute = Math.max(90, ...events.map((event) => event.minute))

    // Đồng hồ.
    useEffect(() => {
        if (finished) return undefined

        let frame = 0
        const tick = (now) => {
            const clock = clockRef.current

            if (clock.last == null) clock.last = now

            const delta = now - clock.last
            clock.last = now

            if (now < clock.pauseUntil) {
                frame = requestAnimationFrame(tick)
                return
            }

            if (clock.inHalftime) {
                clock.inHalftime = false
                setHalftime(false)
            }

            clock.minute += (delta / DURATION) * 90 * speedRef.current

            if (!clock.halftimeDone && clock.minute >= 45) {
                clock.minute = 45
                clock.halftimeDone = true
                clock.inHalftime = true
                clock.pauseUntil = now + HALFTIME_PAUSE / speedRef.current
                setHalftime(true)
            }

            if (clock.minute >= lastMinute) {
                clock.minute = lastMinute
                setMinute(lastMinute)
                setFinished(true)
                return
            }

            setMinute(clock.minute)
            frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [finished, lastMinute])

    const shown = useMemo(() => events.filter((event) => event.minute <= minute), [events, minute])
    const score = useMemo(
        () => ({
            blue: shown.filter((event) => event.type === 'goal' && event.team === 'blue').length,
            red: shown.filter((event) => event.type === 'goal' && event.team === 'red').length,
        }),
        [shown],
    )

    // Hiệu ứng bàn thắng.
    useEffect(() => {
        const goals = score.blue + score.red

        if (goals > seenGoals.current) {
            seenGoals.current = goals
            const last = [...shown].reverse().find((event) => event.type === 'goal')

            setFlash(last?.team || null)
            const timer = setTimeout(() => setFlash(null), 1100)
            return () => clearTimeout(timer)
        }

        return undefined
    }, [score, shown])

    // Bóng: hướng về khung thành của đội có pha bóng gần nhất (đội mình tấn
    // công sang phải), dao động nhẹ cho sinh động.
    const upcoming = events.find((event) => event.minute > minute) || events[events.length - 1]
    const recent = [...shown].reverse()[0]
    const focus = recent && minute - recent.minute < 2 ? recent : upcoming
    const attackX = focus ? (focus.team === 'blue' ? 1 : -1) : 0
    const progress = focus ? clamp(1 - Math.abs(focus.minute - minute) / 4, 0, 1) : 0
    const wobble = Math.sin(minute * 3.1) * 6
    const ballX = 50 + attackX * (12 + progress * 30) + wobble
    const ballY = 50 + Math.cos(minute * 2.3) * 18 + (focus?.type === 'goal' ? 0 : Math.sin(minute * 5) * 6)

    // Đà trận đấu: các pha trong 10 phút gần nhất.
    const window10 = shown.filter((event) => minute - event.minute <= 10)
    const weight = (event) => (event.type === 'goal' ? 3 : event.type === 'attack' ? 1 : 2)
    const momentum = window10.reduce((sum, event) => sum + (event.team === 'blue' ? 1 : -1) * weight(event), 0)

    const finish = () => {
        clockRef.current.minute = lastMinute
        setMinute(lastMinute)
        setFinished(true)
    }

    const commentary = shown.filter((event) => event.text).slice(-8).reverse()
    const clockLabel = finished ? 'FT' : halftime ? 'HT' : `${Math.floor(minute)}'`

    return (
        <section className="screen sim-screen">
            <div className={`home-card sim-card${flash ? ` is-goal-${flash}` : ''}`}>
                <div className="home-hero__eyebrow">QUICK SIMULATION · {label}</div>

                <div className="sim-score">
                    <span className="sim-team">
                        <ClubCrest clubId={blue.clubId} size={34} />
                        {blue.name}
                    </span>
                    <b>{score.blue} – {score.red}</b>
                    <span className="sim-team sim-team--away">
                        {red.name}
                        <ClubCrest clubId={red.clubId} size={34} />
                    </span>
                </div>
                <div className="sim-clock">{clockLabel}</div>

                <div className="sim-pitch" style={{ '--blue': blue.color, '--red': red.color }}>
                    <svg viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true">
                        <rect x="0.5" y="0.5" width="99" height="63" className="sim-pitch__line" />
                        <line x1="50" y1="0.5" x2="50" y2="63.5" className="sim-pitch__line" />
                        <circle cx="50" cy="32" r="8" className="sim-pitch__line" />
                        <rect x="0.5" y="17" width="14" height="30" className="sim-pitch__line" />
                        <rect x="85.5" y="17" width="14" height="30" className="sim-pitch__line" />
                    </svg>
                    <i
                        className="sim-ball"
                        style={{ left: `${clamp(ballX, 3, 97)}%`, top: `${clamp(ballY, 8, 92)}%` }}
                    />
                    {flash && <div className={`sim-goal sim-goal--${flash}`}>GOAL!</div>}
                </div>

                <div className="sim-bars">
                    <div>
                        <span>POSSESSION</span>
                        <div className="sim-bar">
                            <i style={{ width: `${result.possession.blue}%`, background: blue.color }} />
                            <i style={{ width: `${result.possession.red}%`, background: red.color }} />
                        </div>
                        <small>{result.possession.blue}% · {result.possession.red}%</small>
                    </div>
                    <div>
                        <span>MOMENTUM</span>
                        <div className="sim-bar sim-bar--momentum">
                            <i style={{ left: `${clamp(50 + momentum * 6, 4, 96)}%` }} />
                        </div>
                    </div>
                </div>

                <ol className="sim-feed">
                    {commentary.map((event, index) => (
                        <li key={`${event.minute}-${index}-${event.text}`} className={`sim-feed__item sim-feed__item--${event.type} is-${event.team}`}>
                            <b>{event.minute}'</b> {event.text}
                        </li>
                    ))}
                    {commentary.length === 0 && <li className="sim-feed__item">Kick-off…</li>}
                </ol>

                <div className="sim-actions">
                    {finished ? (
                        <button type="button" className="btn btn--primary btn--large" onClick={onDone}>
                            MATCH SUMMARY
                        </button>
                    ) : (
                        <>
                            <button type="button" className="btn" onClick={() => setSpeed((value) => (value === 1 ? 2 : 1))}>
                                {speed === 1 ? 'SPEED ×2' : 'SPEED ×1'}
                            </button>
                            <button type="button" className="btn" onClick={finish}>SKIP</button>
                        </>
                    )}
                </div>
            </div>
        </section>
    )
}
