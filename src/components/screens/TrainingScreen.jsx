import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TouchControls from '../TouchControls'
import FpsMeter from '../FpsMeter'
import SetPieceTakers from '../SetPieceTakers'
import { FREEKICK_SPOTS } from '../../systems/training'
import { formatMoney } from '../../services/clubService'
import { todayKey } from '../../services/quickSim'
import {
    TRAINING_CHALLENGE_REWARD,
    TRAINING_DRILL_INFO,
    TRAINING_LEVELS,
    dailyChallenge,
    isSuccess,
} from '../../services/training'

// Phase 42: màn TẬP LUYỆN — sân 3D (MatchCanvas) + bảng điều khiển bài tập.
const MatchCanvas = lazy(() => import('../MatchCanvas'))

const BEST_KEY = 'ultimate-football-training-best-v1'

function readBest() {
    try {
        return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}
    } catch {
        return {}
    }
}

function writeBest(best) {
    try {
        localStorage.setItem(BEST_KEY, JSON.stringify(best))
    } catch {
        // bỏ qua (chế độ riêng tư…)
    }
}

const EMPTY_STATS = { attempts: 0, success: 0, streak: 0, headers: 0, last: null }

const RESULT_TEXT = {
    goal: 'GOAL',
    miss: 'MISSED',
    missed: 'MISSED',
    saved: 'SAVED',
    conceded: 'SCORED',
    cleared: 'CLEARED',
    lost: 'LOST',
    foul: 'FOUL',
    over: 'TIME UP',
}

export default function TrainingScreen({
    roster,
    blueTeam,
    onTakersChange,
    level,
    onLevelChange,
    opponentName,
    userTeamName,
    graphics,
    autoGraphics,
    settings,
    touchUI,
    portrait = false,
    challengeState,
    onChallengeReward,
    onExit,
}) {
    const [drill, setDrill] = useState('penalty-take')
    const [options, setOptions] = useState({ spot: 'central', side: 'left', defender: false })
    const [stats, setStats] = useState({})
    const [best, setBest] = useState(readBest)
    const [challenge, setChallenge] = useState(null) // { drill, target, attempts, success, done, won }
    const [selectedId, setSelectedId] = useState(null)
    const [paused, setPaused] = useState(false)
    const [message, setMessage] = useState('TRAINING')
    const [panelOpen, setPanelOpen] = useState(!touchUI)
    const [command, setCommand] = useState(null)
    const chargeHudRef = useRef(null)
    const radarRef = useRef(null)
    const statsRef = useRef(null)
    const today = todayKey()
    const daily = useMemo(() => dailyChallenge(today), [today])
    const dailyDone = challengeState?.date === today && challengeState?.done

    const blueIds = useMemo(() => {
        const blue = roster?.find((team) => team.id === 'blue')

        return new Set([...(blue?.players || []), ...(blue?.substitutes || [])].map((player) => player.id))
    }, [roster])

    // Bắt đầu / đổi bài tập → lệnh mới cho engine.
    const restart = useCallback((nextDrill, nextOptions) => {
        setCommand({ type: 'start', drill: nextDrill, options: nextOptions, nonce: `${nextDrill}-${Date.now()}` })
        setMessage(TRAINING_DRILL_INFO[nextDrill].keys)
    }, [])

    useEffect(() => {
        restart(drill, options)
        // Đổi đối thủ (độ khó) → đội hình mới → đặt lại bài tập.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roster])

    const chooseDrill = (next) => {
        if (challenge && !challenge.done) return
        setDrill(next)
        restart(next, options)
    }

    const changeOption = (patch) => {
        if (challenge && !challenge.done) return
        const next = { ...options, ...patch }

        setOptions(next)
        restart(drill, next)
    }

    const startChallenge = () => {
        const next = { ...options, ...daily.options }

        setChallenge({ ...daily, attempts: 0, success: 0, done: false, won: false })
        setDrill(daily.drill)
        setOptions(next)
        restart(daily.drill, next)
        setPanelOpen(true)
    }

    const handleResult = useCallback(({ result, header }) => {
        const ok = isSuccess(drill, result)

        setStats((current) => {
            const entry = current[drill] || EMPTY_STATS
            const streak = ok ? entry.streak + 1 : 0
            const next = {
                attempts: entry.attempts + 1,
                success: entry.success + (ok ? 1 : 0),
                streak,
                headers: entry.headers + (header && ok ? 1 : 0),
                last: result,
            }

            setBest((previous) => {
                if ((previous[drill] || 0) >= streak) return previous

                const updated = { ...previous, [drill]: streak }

                writeBest(updated)
                return updated
            })

            return { ...current, [drill]: next }
        })

        setChallenge((current) => {
            if (!current || current.done || current.drill !== drill) return current

            const attempts = current.attempts + 1
            const success = current.success + (ok ? 1 : 0)
            const won = success >= current.target
            const done = won || attempts >= current.total || current.total - attempts < current.target - success

            return { ...current, attempts, success, won, done }
        })

        setMessage(`${RESULT_TEXT[result] || result.toUpperCase()}${header && ok ? ' · HEADER!' : ''}`)
    }, [drill])

    // Thử thách xong và thắng → thưởng (một lần mỗi ngày).
    const rewarded = useRef(null)

    useEffect(() => {
        if (!challenge?.done || !challenge.won || dailyDone || rewarded.current === today) return

        rewarded.current = today
        onChallengeReward?.(TRAINING_CHALLENGE_REWARD)
    }, [challenge, dailyDone, today, onChallengeReward])

    const current = stats[drill] || EMPTY_STATS
    const info = TRAINING_DRILL_INFO[drill]
    const isPlaying = !paused && !portrait
    const takerRole = drill === 'penalty-take' ? ['penalty'] : drill === 'freekick' ? ['freeKick'] : drill === 'corner' ? ['corner'] : null
    const locked = Boolean(challenge && !challenge.done)

    return (
        <section className="content-grid training-screen">
            <div className="pitch-panel">
                <div className="game-canvas">
                    <Suspense fallback={<div className="match-loading">LOADING TRAINING GROUND…</div>}>
                        <MatchCanvas
                            graphics={graphics}
                            autoGraphics={autoGraphics}
                            paused={paused}
                            chargeHudRef={chargeHudRef}
                            radarRef={radarRef}
                            statsRef={statsRef}
                            labelMode={settings.labelMode || 'smart'}
                            roster={roster}
                            half={1}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onActionMessage={setMessage}
                            tacticKey="balanced"
                            matchDuration={540}
                            onWhistleDone={() => {}}
                            onAutoPilotChange={() => {}}
                            idleLimit={100000}
                            isPlaying={isPlaying}
                            resetKey={0}
                            onGoal={() => {}}
                            onCard={() => {}}
                            onWoodwork={() => {}}
                            trainingCommand={command}
                            onTrainingResult={handleResult}
                        />
                    </Suspense>

                    {settings.showFps && <FpsMeter />}

                    {/* Bảng bài tập */}
                    <div className={`training-hud${panelOpen ? ' is-open' : ''}`}>
                        <div className="training-hud__head">
                            <b>TRAINING</b>
                            <span>{userTeamName} vs {opponentName}</span>
                            <button type="button" className="training-hud__toggle" onClick={() => setPanelOpen((value) => !value)} aria-label="Toggle training panel">
                                {panelOpen ? '▲' : '▼'}
                            </button>
                        </div>

                        {panelOpen && (
                            <>
                                <div className="training-hud__drills" role="tablist" aria-label="Drill">
                                    {Object.entries(TRAINING_DRILL_INFO).map(([key, value]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            role="tab"
                                            aria-selected={drill === key}
                                            className={drill === key ? 'is-active' : ''}
                                            disabled={locked && drill !== key}
                                            onClick={() => chooseDrill(key)}
                                        >
                                            {value.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="training-hud__options">
                                    {drill === 'freekick' && (
                                        <label>
                                            Spot
                                            <select value={options.spot} disabled={locked} onChange={(event) => changeOption({ spot: event.target.value })}>
                                                {Object.entries(FREEKICK_SPOTS).map(([key, spot]) => <option key={key} value={key}>{spot.label}</option>)}
                                            </select>
                                        </label>
                                    )}
                                    {(drill === 'corner' || (drill === 'freekick' && options.spot === 'wide')) && (
                                        <div className="segmented" role="radiogroup" aria-label="Side">
                                            {['left', 'right'].map((side) => (
                                                <button key={side} type="button" disabled={locked} className={options.side === side ? 'is-active' : ''} onClick={() => changeOption({ side })}>
                                                    {side.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {drill === 'finishing' && (
                                        <label className="training-hud__check">
                                            <input type="checkbox" checked={Boolean(options.defender)} disabled={locked} onChange={(event) => changeOption({ defender: event.target.checked })} />
                                            With a defender
                                        </label>
                                    )}
                                    <label>
                                        Opponent
                                        <select value={level} disabled={locked} onChange={(event) => onLevelChange(event.target.value)}>
                                            {TRAINING_LEVELS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                                        </select>
                                    </label>
                                </div>

                                {takerRole && (
                                    <SetPieceTakers team={blueTeam} onChange={onTakersChange} compact only={takerRole} />
                                )}

                                <div className="training-hud__stats">
                                    <div><span>{info.successLabel}</span><b>{current.success}/{current.attempts}</b></div>
                                    <div><span>RATE</span><b>{current.attempts ? Math.round((current.success / current.attempts) * 100) : 0}%</b></div>
                                    <div><span>STREAK</span><b>{current.streak}</b></div>
                                    <div><span>BEST</span><b>{best[drill] || 0}</b></div>
                                    {drill === 'corner' && <div><span>HEADER GOALS</span><b>{current.headers}</b></div>}
                                </div>

                                <div className="training-hud__challenge">
                                    {challenge ? (
                                        <>
                                            <span>
                                                <b>DAILY CHALLENGE</b> · {challenge.text} · {challenge.success}/{challenge.target} ({challenge.attempts}/{challenge.total} tries)
                                            </span>
                                            {challenge.done && (
                                                <em className={challenge.won ? 'is-won' : 'is-lost'}>
                                                    {challenge.won ? (dailyDone && rewarded.current !== today ? 'DONE ✓ (already rewarded today)' : `DONE ✓ +${formatMoney(TRAINING_CHALLENGE_REWARD)}`) : 'FAILED · try again'}
                                                </em>
                                            )}
                                            {challenge.done && (
                                                <button type="button" className="btn btn--small" onClick={() => setChallenge(null)}>CLOSE</button>
                                            )}
                                            {challenge.done && !challenge.won && (
                                                <button type="button" className="btn btn--small btn--primary" onClick={startChallenge}>RETRY</button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <span>
                                                <b>DAILY CHALLENGE</b> · {daily.text} · reward {formatMoney(TRAINING_CHALLENGE_REWARD)}
                                                {dailyDone ? ' · done today ✓' : ''}
                                            </span>
                                            <button type="button" className="btn btn--small btn--primary" onClick={startChallenge}>
                                                {dailyDone ? 'PLAY AGAIN' : 'START'}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="training-hud__actions">
                                    <button type="button" className="btn btn--small" onClick={() => restart(drill, options)}>RESET BALL</button>
                                    <button type="button" className="btn btn--small" disabled={locked} onClick={() => setStats((value) => ({ ...value, [drill]: EMPTY_STATS }))}>CLEAR SCORE</button>
                                    <button type="button" className="btn btn--small" onClick={() => setPaused((value) => !value)}>{paused ? 'RESUME' : 'PAUSE'}</button>
                                    <button type="button" className="btn btn--small btn--danger" onClick={onExit}>EXIT</button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="training-keys">{info.keys}</div>

                    {touchUI && isPlaying && (
                        <TouchControls
                            statsRef={statsRef}
                            blueIds={blueIds}
                            size={settings.touchSize}
                            opacity={settings.touchOpacity}
                            joystickMode={settings.joystickMode}
                            vibration={settings.vibration !== false}
                        />
                    )}

                    <canvas ref={radarRef} className="radar" width={480} height={312} aria-label="Mini map" />

                    <div ref={chargeHudRef} className="power-gauge" data-visible="false" data-action="pass">
                        <div className="power-gauge__label">
                            <span data-role="label">PASS POWER</span>
                            <b data-role="value">0%</b>
                        </div>
                        <div className="power-gauge__track">
                            <i data-role="fill" />
                            <span className="power-gauge__mark" style={{ left: '80%' }} />
                            <span className="power-gauge__mark power-gauge__mark--danger" style={{ left: '90%' }} />
                        </div>
                    </div>

                    <div className="action-indicator">{message}</div>
                </div>
            </div>
        </section>
    )
}
