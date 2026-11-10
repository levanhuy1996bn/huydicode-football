import ClubManagementPanel from './ClubManagementPanel'
import LeagueManagementPanel from './LeagueManagementPanel'
import TeamManagementPanel from './TeamManagementPanel'
import MatchWorld from './MatchWorld'
import {
    FullTimeOverlay,
    HalfTimeOverlay,
    QuitConfirm,
    StatusOverlay,
} from './MatchOverlays'
import {
    loadLeague,
    saveLeague,
    getNextUserFixture,
    getTeamById,
    recordUserFixtureResult,
    startNewSeason,
} from '../services/leagueService'
import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'

import { FORMATIONS } from '../data/teams'
import {
    FIXED_STEP,
    MATCH_DURATION,
    MAX_SUBSTITUTIONS,
    TACTICS,
} from '../systems/constants'
import {
    ROSTER_STORAGE_KEY,
    buildMatchRoster,
    getPositionGroup,
    getRole,
    loadSavedRoster,
} from '../systems/roster'

// Màn hình trận đấu: giao diện (scoreboard, bảng điều khiển, giải đấu, CLB).
// Engine trận đấu nằm trong src/systems, scene 3D nằm trong MatchWorld.jsx.

export default function GameScene() {
    const [roster, setRoster] = useState(loadSavedRoster)
    const chargeHudRef = useRef(null)

    const [selectedId, setSelectedId] = useState(() => {
        const savedRoster = loadSavedRoster()
        const blueTeam = savedRoster.find((team) => team.id === 'blue')

        return (
            blueTeam?.players.find((player) => player.id === 'blue-9')?.id ||
            blueTeam?.players.find((player) => getRole(player) !== 'GK')?.id ||
            blueTeam?.players[0]?.id ||
            'blue-9'
        )
    })

    const [actionMessage, setActionMessage] = useState('BALL CONTROL')
    const [tacticKey, setTacticKey] = useState('balanced')

    const [blueScore, setBlueScore] = useState(0)
    const [redScore, setRedScore] = useState(0)
    const [matchTime, setMatchTime] = useState(0)

    const [matchStatus, setMatchStatus] = useState('playing')
    const [goalMessage, setGoalMessage] = useState('')
    const [resetKey, setResetKey] = useState(0)
    const [substitutionCount, setSubstitutionCount] = useState(0)

    // Luồng trận: hiệp hiện tại, danh sách bàn thắng, bỏ trận.
    const [half, setHalf] = useState(1)
    const [goalEvents, setGoalEvents] = useState([])
    const [forfeit, setForfeit] = useState(null) // null | 'league' | 'friendly'
    const [isQuitOpen, setIsQuitOpen] = useState(false)

    const matchTimeRef = useRef(0)
    matchTimeRef.current = matchTime

    const resetMatchFlow = useCallback(() => {
        setHalf(1)
        setGoalEvents([])
        setForfeit(null)
        setIsQuitOpen(false)
    }, [])

    // LEAGUE STATE
    const [league, setLeague] = useState(loadLeague)

    const [activeFixtureId, setActiveFixtureId] = useState(() => {
        const initialLeague = loadLeague()
        const nextFixture = getNextUserFixture(initialLeague.fixtures)

        return nextFixture?.id || null
    })

    const [isLeagueOpen, setIsLeagueOpen] = useState(false)

    // Chặn ghi nhận trùng kết quả khi React chạy lại effect.
    const recordedFixtureRef = useRef(null)

    const activeFixture = useMemo(
        () =>
            league.fixtures.find(
                (fixture) => fixture.id === activeFixtureId,
            ) || null,
        [league.fixtures, activeFixtureId],
    )

    const opponentId = activeFixture
        ? activeFixture.homeTeamId === 'blue'
            ? activeFixture.awayTeamId
            : activeFixture.homeTeamId
        : 'red'

    const opponentTeam =
        getTeamById(opponentId) || getTeamById('red')

    // Đội hình 3D của đối thủ theo đúng đội trong vòng đấu.
    const matchRoster = useMemo(
        () => buildMatchRoster(roster, opponentTeam),
        [roster, opponentTeam],
    )

    const opponentNameRef = useRef('RED UNITED')
    opponentNameRef.current = opponentTeam?.name || 'RED UNITED'

    const isBlueHome = activeFixture
        ? activeFixture.homeTeamId === 'blue'
        : true

    // Lưu đội hình chính, dự bị, sơ đồ và cầu thủ mua/bán.
    useEffect(() => {
        try {
            localStorage.setItem(
                ROSTER_STORAGE_KEY,
                JSON.stringify(roster),
            )
        } catch (error) {
            console.error('Unable to save roster:', error)
            setActionMessage('UNABLE TO SAVE SQUAD')
        }
    }, [roster])

    // Lưu tiến trình giải đấu.
    useEffect(() => {
        saveLeague(league)
    }, [league])

    const showActionMessage = useCallback((message) => {
        setActionMessage(message)
    }, [])

    const handleGoal = useCallback((teamId, info = {}) => {
        const minute = Math.min(
            90,
            Math.floor((matchTimeRef.current / MATCH_DURATION) * 90) + 1,
        )

        const credit = info.scorerName
            ? `${info.scorerName}${info.ownGoal ? ' (OG)' : ''} ${minute}'`
            : `${minute}'`

        if (teamId === 'blue') {
            setBlueScore((score) => score + 1)
            setGoalMessage(`BLUE FC · ${credit}`)
        } else {
            setRedScore((score) => score + 1)
            setGoalMessage(`${opponentNameRef.current} · ${credit}`)
        }

        setGoalEvents((events) => [
            ...events,
            {
                teamId,
                name: info.scorerName,
                ownGoal: Boolean(info.ownGoal),
                minute,
            },
        ])

        setMatchStatus('goal')
    }, [])

    const handleMatchEnd = useCallback(() => {
        setMatchStatus('fulltime')
        setActionMessage('FULL TIME')
    }, [])

    // Đồng hồ trận đấu.
    useEffect(() => {
        if (matchStatus !== 'playing') return undefined

        const interval = setInterval(() => {
            setMatchTime((current) =>
                Math.min(MATCH_DURATION, current + 0.25),
            )
        }, 250)

        return () => clearInterval(interval)
    }, [matchStatus])

    // Kết thúc trận khi đồng hồ đạt 90 phút.
    useEffect(() => {
        if (
            matchStatus === 'playing' &&
            matchTime >= MATCH_DURATION
        ) {
            handleMatchEnd()
        }
    }, [matchTime, matchStatus, handleMatchEnd])

    // Hết hiệp 1: dừng trận, mở màn nghỉ giữa hiệp.
    useEffect(() => {
        if (
            matchStatus === 'playing' &&
            half === 1 &&
            matchTime >= MATCH_DURATION / 2
        ) {
            setMatchTime(MATCH_DURATION / 2)
            setMatchStatus('halftime')
            setActionMessage('HALF TIME')
        }
    }, [matchTime, matchStatus, half])

    // Ghi nhận kết quả trận BLUE FC vào giải đấu đúng một lần.
    useEffect(() => {
        if (
            matchStatus !== 'fulltime' ||
            !activeFixtureId ||
            recordedFixtureRef.current === activeFixtureId
        ) {
            return
        }

        const fixture = league.fixtures.find(
            (item) => item.id === activeFixtureId,
        )

        if (!fixture || fixture.played) {
            return
        }

        recordedFixtureRef.current = activeFixtureId

        const homeGoals =
            fixture.homeTeamId === 'blue'
                ? blueScore
                : redScore

        const awayGoals =
            fixture.homeTeamId === 'blue'
                ? redScore
                : blueScore

        setLeague((currentLeague) =>
            recordUserFixtureResult(
                currentLeague,
                activeFixtureId,
                homeGoals,
                awayGoals,
            ),
        )

        setActionMessage('FULL TIME - RESULT SAVED')
    }, [
        matchStatus,
        activeFixtureId,
        league.fixtures,
        blueScore,
        redScore,
    ])

    // Thông báo bàn thắng.
    useEffect(() => {
        if (matchStatus !== 'goal') return undefined

        const timeout = setTimeout(() => {
            setMatchStatus('playing')
            setGoalMessage('')
        }, 2800)

        return () => clearTimeout(timeout)
    }, [matchStatus])

    const changeTactic = (event) => {
        const key = event.target.value

        setTacticKey(key)

        setActionMessage(
            `TACTIC: ${TACTICS[key].label.toUpperCase()}`,
        )
    }

    // Bấm Tiếp tục ở màn nghỉ: sang hiệp 2 (MatchWorld đổi sân, đối thủ giao bóng).
    const continueSecondHalf = () => {
        setHalf(2)
        setMatchStatus('playing')
    }

    const confirmQuit = () => {
        const isLeagueMatch = Boolean(activeFixture && !activeFixture.played)

        if (isLeagueMatch) {
            // Bỏ trận giải đấu: xử thua 0–3 (ghi vào bảng xếp hạng).
            setBlueScore(0)
            setRedScore(3)
            setGoalEvents([])
        }

        setForfeit(isLeagueMatch ? 'league' : 'friendly')
        setIsQuitOpen(false)
        setMatchStatus('fulltime')
        setActionMessage(isLeagueMatch ? 'MATCH FORFEITED' : 'MATCH ABANDONED')
    }

    const togglePause = () => {
        if (matchStatus === 'playing') {
            setMatchStatus('paused')
            setActionMessage('MATCH PAUSED')
        } else if (matchStatus === 'paused') {
            setMatchStatus('playing')
            setActionMessage('MATCH RESUMED')
        }
    }

    // Reset trận đấu hiện tại, không reset đội hình hoặc dữ liệu CLB.
    const restartMatch = () => {
        setBlueScore(0)
        setRedScore(0)
        setMatchTime(0)
        setGoalMessage('')
        setMatchStatus('playing')
        setResetKey((key) => key + 1)
        setSubstitutionCount(0)
        resetMatchFlow()
        setActionMessage('NEW MATCH')

        // Không xóa kết quả đã được ghi nhận trong giải đấu.
    }

    // Bắt đầu một trận thuộc lịch thi đấu.
    const startLeagueFixture = useCallback((fixture) => {
        if (!fixture || fixture.played) return

        setActiveFixtureId(fixture.id)
        recordedFixtureRef.current = null

        setBlueScore(0)
        setRedScore(0)
        setMatchTime(0)
        setGoalMessage('')
        setMatchStatus('playing')
        setResetKey((key) => key + 1)
        setSubstitutionCount(0)
        resetMatchFlow()

        setIsLeagueOpen(false)

        const nextOpponentId =
            fixture.homeTeamId === 'blue'
                ? fixture.awayTeamId
                : fixture.homeTeamId

        const nextOpponent = getTeamById(nextOpponentId)

        setActionMessage(
            `ROUND ${fixture.round}: ${nextOpponent?.name || 'OPPONENT'}`,
        )
    }, [])

    // Bắt đầu mùa giải mới.
    const createNewSeason = useCallback(() => {
        const nextLeague = startNewSeason(league)

        setLeague(nextLeague)

        const firstFixture = getNextUserFixture(
            nextLeague.fixtures,
        )

        setActiveFixtureId(firstFixture?.id || null)
        recordedFixtureRef.current = null

        setBlueScore(0)
        setRedScore(0)
        setMatchTime(0)
        setGoalMessage('')
        setMatchStatus('playing')
        setResetKey((key) => key + 1)
        setSubstitutionCount(0)
        resetMatchFlow()

        setIsLeagueOpen(false)
        setActionMessage('NEW SEASON STARTED')
    }, [league])

    const totalGameMinutes = Math.floor(
        (matchTime / MATCH_DURATION) * 90,
    )

    const displayMinutes = Math.min(totalGameMinutes, 90)

    const displaySeconds = Math.floor(
        ((matchTime / MATCH_DURATION) * 90 * 60) % 60,
    )

    const timeLabel = `${String(displayMinutes).padStart(2, '0')}:${String(
        displaySeconds,
    ).padStart(2, '0')}`

    const isPlaying = matchStatus === 'playing'

    // Trận tiếp theo của BLUE FC trong lịch (sau khi kết quả đã được ghi).
    const nextFixture = useMemo(
        () => getNextUserFixture(league.fixtures),
        [league.fixtures],
    )

    const nextOpponent = nextFixture
        ? getTeamById(
            nextFixture.homeTeamId === 'blue'
                ? nextFixture.awayTeamId
                : nextFixture.homeTeamId,
        )
        : null

    const changeFormation = (formationKey) => {
        const formation = FORMATIONS[formationKey]

        if (!formation) return

        setRoster((current) =>
            current.map((team) => {
                if (team.id !== 'blue') return team

                const updatedPlayers = team.players.map((player, index) => {
                    const slot = formation[index]

                    if (!slot) return player

                    const [position, x, z] = slot

                    return {
                        ...player,
                        position,
                        x,
                        z,
                    }
                })

                return {
                    ...team,
                    formationKey,
                    players: updatedPlayers,
                }
            }),
        )

        setActionMessage(`FORMATION: ${formationKey}`)
    }

    const substitutePlayer = (playerOutId, playerInId) => {
        if (substitutionCount >= MAX_SUBSTITUTIONS) {
            setActionMessage('NO SUBSTITUTIONS REMAINING')
            return
        }

        const blueTeam = roster.find((team) => team.id === 'blue')

        if (!blueTeam) return

        const outgoing = blueTeam.players.find(
            (player) => player.id === playerOutId,
        )

        const incoming = blueTeam.substitutes.find(
            (player) => player.id === playerInId,
        )

        if (!outgoing || !incoming) return

        if (
            getPositionGroup(outgoing.position) !==
            getPositionGroup(incoming.position)
        ) {
            setActionMessage('INCOMPATIBLE PLAYER POSITION')
            return
        }

        const benchIndex = blueTeam.substitutes.findIndex(
            (player) => player.id === playerInId,
        )

        setRoster((current) =>
            current.map((team) => {
                if (team.id !== 'blue') return team

                const newStartingPlayer = {
                    ...incoming,
                    position: outgoing.position,
                    x: outgoing.x,
                    z: outgoing.z,
                }

                const newSubstitute = {
                    ...outgoing,
                    x: -28 + benchIndex * 8,
                    z: 48,
                }

                return {
                    ...team,

                    players: team.players.map((player) =>
                        player.id === playerOutId
                            ? newStartingPlayer
                            : player,
                    ),

                    substitutes: team.substitutes.map((player) =>
                        player.id === playerInId
                            ? newSubstitute
                            : player,
                    ),
                }
            }),
        )

        if (selectedId === playerOutId) {
            setSelectedId(playerInId)
        }

        setSubstitutionCount((count) => count + 1)
        setActionMessage(
            `SUBSTITUTION: ${incoming.name.toUpperCase()} ON`,
        )
    }

    const openLeague = () => {
        setIsLeagueOpen(true)
    }

    return (
        <div className="game-canvas">
            <Canvas shadows dpr={[1, 1.75]}>
                <Suspense fallback={null}>
                    <Physics
                        gravity={[0, -9.81, 0]}
                        timeStep={FIXED_STEP}
                        interpolate={false}
                    >
                        <MatchWorld
                            chargeHudRef={chargeHudRef}
                            roster={matchRoster}
                            half={half}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onActionMessage={showActionMessage}
                            tacticKey={tacticKey}
                            isPlaying={isPlaying}
                            resetKey={resetKey}
                            onGoal={handleGoal}
                        />
                    </Physics>
                </Suspense>
            </Canvas>

            {/* SCOREBOARD */}
            <div
                style={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    padding: '12px 22px',
                    minWidth: 330,
                    justifyContent: 'center',
                    borderRadius: 10,
                    background: 'rgba(8, 18, 14, 0.92)',
                    color: '#fff',
                    boxShadow: '0 5px 20px rgba(0,0,0,0.25)',
                }}
            >
                <div style={{ textAlign: 'center', minWidth: 82 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: 1,
                        }}
                    >
                        BLUE FC
                    </div>

                    <div
                        style={{
                            fontSize: 30,
                            lineHeight: 1.15,
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {blueScore}
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            fontSize: 21,
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {timeLabel}
                    </div>

                    <div
                        style={{
                            fontSize: 9,
                            color: '#a9c0b2',
                            letterSpacing: 1.2,
                            marginTop: 2,
                        }}
                    >
                        {matchStatus === 'fulltime'
                            ? 'FULL TIME'
                            : matchStatus === 'halftime'
                                ? 'HALF TIME'
                                : matchStatus === 'paused'
                                    ? 'PAUSED'
                                    : half === 1
                                        ? '1ST HALF'
                                        : '2ND HALF'}
                    </div>

                    {activeFixture && (
                        <div
                            style={{
                                fontSize: 9,
                                color: '#a9c0b2',
                                marginTop: 3,
                                letterSpacing: 0.8,
                            }}
                        >
                            ROUND {activeFixture.round}
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center', minWidth: 82 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: 1,
                        }}
                    >
                        {opponentTeam?.shortName || 'RED'}
                    </div>

                    <div
                        style={{
                            fontSize: 30,
                            lineHeight: 1.15,
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {redScore}
                    </div>
                </div>
            </div>

            {/* TACTIC SELECTOR */}
            <div
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: 'rgba(8, 18, 14, 0.88)',
                    color: '#fff',
                    fontSize: 12,
                }}
            >
                <span style={{ fontWeight: 700 }}>TEAM TACTIC</span>

                <select
                    aria-label="Team tactic"
                    value={tacticKey}
                    onChange={changeTactic}
                    style={{
                        background: '#203b30',
                        color: '#fff',
                        border: '1px solid #547565',
                        borderRadius: 5,
                        padding: '6px 8px',
                        outline: 'none',
                    }}
                >
                    {Object.entries(TACTICS).map(([key, value]) => (
                        <option key={key} value={key}>
                            {value.label}
                        </option>
                    ))}
                </select>
            </div>

            <TeamManagementPanel
                roster={roster}
                selectedId={selectedId}
                onSelectPlayer={setSelectedId}
                onFormationChange={changeFormation}
                onSubstitute={substitutePlayer}
                substitutionCount={substitutionCount}
            />

            <ClubManagementPanel
                roster={roster}
                onRosterChange={setRoster}
            />

            {/* MATCH CONTROLS */}
            <div
                style={{
                    position: 'absolute',
                    top: 78,
                    right: 16,
                    zIndex: 10,
                    display: 'flex',
                    gap: 8,
                }}
            >
                <button
                    onClick={openLeague}
                    style={matchButtonStyle}
                >
                    LEAGUE
                </button>

                {matchStatus === 'playing' && (
                    <button
                        onClick={togglePause}
                        style={matchButtonStyle}
                    >
                        PAUSE
                    </button>
                )}

                {matchStatus === 'paused' && (
                    <button
                        onClick={togglePause}
                        style={matchButtonStyle}
                    >
                        RESUME
                    </button>
                )}

                {matchStatus !== 'fulltime' && (
                    <button
                        onClick={() => setIsQuitOpen(true)}
                        style={matchButtonStyle}
                    >
                        QUIT
                    </button>
                )}
            </div>

            {/* LEAGUE MANAGEMENT */}
            {isLeagueOpen && (
                <LeagueManagementPanel
                    league={league}
                    onClose={() => setIsLeagueOpen(false)}
                    onStartFixture={startLeagueFixture}
                    onNewSeason={createNewSeason}
                />
            )}

            {/* GOAL / PAUSE / HALF TIME / FULL TIME */}
            {matchStatus === 'goal' && (
                <StatusOverlay title="GOAL!" subtitle={goalMessage} />
            )}

            {matchStatus === 'paused' && (
                <StatusOverlay title="PAUSED" subtitle="Press RESUME to continue">
                    <button type="button" className="btn btn--primary" onClick={togglePause}>
                        RESUME
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={restartMatch}>
                        RESTART MATCH
                    </button>
                </StatusOverlay>
            )}

            {matchStatus === 'halftime' && (
                <HalfTimeOverlay
                    opponentName={opponentTeam?.name || 'RED UNITED'}
                    blueScore={blueScore}
                    redScore={redScore}
                    events={goalEvents}
                    tacticKey={tacticKey}
                    onTacticChange={changeTactic}
                    formationKey={
                        roster.find((team) => team.id === 'blue')?.formationKey
                    }
                    onFormationChange={changeFormation}
                    substitutionCount={substitutionCount}
                    maxSubstitutions={MAX_SUBSTITUTIONS}
                    onContinue={continueSecondHalf}
                    onQuit={() => setIsQuitOpen(true)}
                />
            )}

            {matchStatus === 'fulltime' && !isLeagueOpen && (
                <FullTimeOverlay
                    opponentName={opponentTeam?.name || 'RED UNITED'}
                    blueScore={blueScore}
                    redScore={redScore}
                    events={goalEvents}
                    forfeit={forfeit}
                    fixture={activeFixture}
                    resultSaved={
                        Boolean(activeFixture) &&
                        recordedFixtureRef.current === activeFixture.id
                    }
                    nextFixture={nextFixture}
                    nextOpponentName={nextOpponent?.name || 'OPPONENT'}
                    onNextMatch={() => startLeagueFixture(nextFixture)}
                    onOpenLeague={openLeague}
                    onReplay={restartMatch}
                    onNewSeason={createNewSeason}
                />
            )}

            {isQuitOpen && (
                <QuitConfirm
                    isLeagueMatch={Boolean(activeFixture && !activeFixture.played)}
                    onConfirm={confirmQuit}
                    onCancel={() => setIsQuitOpen(false)}
                />
            )}

            {/* Thanh lực kiểu FO4 — MatchWorld cập nhật trực tiếp DOM mỗi frame */}
            <div
                ref={chargeHudRef}
                className="power-gauge"
                data-visible="false"
                data-action="pass"
            >
                <div className="power-gauge__label">
                    <span data-role="label">PASS POWER</span>
                    <b data-role="value">0%</b>
                </div>
                <div className="power-gauge__track">
                    <i data-role="fill" />
                    <span className="power-gauge__mark" style={{ left: '80%' }} />
                    <span
                        className="power-gauge__mark power-gauge__mark--danger"
                        style={{ left: '90%' }}
                    />
                </div>
            </div>

            <div className="canvas-hint">
                Arrows move/aim · E sprint · Hold S/W/A/D for power, release
                to pass/through/lob/shoot · Defending: S/Q switch, hold D
                contain, D+E press, A teammate press · Space tackle · Ctrl
                slide · Throw-in: S short, A long
            </div>

            <div className="action-indicator">
                {actionMessage}
            </div>
        </div>
    )
}

const matchButtonStyle = {
    border: '1px solid #547565',
    borderRadius: 6,
    padding: '8px 12px',
    background: '#203b30',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
}
