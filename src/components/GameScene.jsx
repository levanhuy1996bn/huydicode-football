import ClubManagementPanel from './ClubManagementPanel'
import LeagueManagementPanel from './LeagueManagementPanel'
import TeamManagementPanel from './TeamManagementPanel'
import SubstitutionBoard from './SubstitutionBoard'
import MatchSidePanel from './MatchSidePanel'
import TopBar from './screens/TopBar'
import HomeScreen from './screens/HomeScreen'
import PreMatchScreen from './screens/PreMatchScreen'
import PostMatchScreen from './screens/PostMatchScreen'
import { formatMoney, getSquadValue } from '../services/clubService'
import { buildMatchSummary } from '../systems/matchStats'
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
    getLeagueStandings,
    getSeasonProgress,
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
    getOpponentColor,
    getPositionGroup,
    getRole,
    loadSavedRoster,
} from '../systems/roster'
import { USER_TEAM } from '../data/leagueData'

// Màn hình trận đấu: giao diện (scoreboard, bảng điều khiển, giải đấu, CLB).
// Engine trận đấu nằm trong src/systems, scene 3D nằm trong MatchWorld.jsx.

const SETTINGS_KEY = 'ultimate-football-settings-v1'
const DEFAULT_SETTINGS = { matchDuration: MATCH_DURATION, labelMode: 'smart' }

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null')

        return { ...DEFAULT_SETTINGS, ...(saved || {}) }
    } catch {
        return { ...DEFAULT_SETTINGS }
    }
}

function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
        // Không lưu được (chế độ riêng tư...) — vẫn dùng trong phiên hiện tại.
    }
}

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

    // 'idle' (chưa đá) | 'playing' | 'paused' | 'goal' | 'halftime' | 'fulltime'
    const [matchStatus, setMatchStatus] = useState('idle')

    // Màn hình: 'home' | 'prematch' | 'match' | 'postmatch'
    const [screen, setScreen] = useState('home')
    const [prematchFixtureId, setPrematchFixtureId] = useState(null)
    const [matchSummary, setMatchSummary] = useState(null)
    const [isClubOpen, setIsClubOpen] = useState(false)
    const [lineupMode, setLineupMode] = useState('match') // 'match' | 'prematch'
    const statsRef = useRef(null)

    // Cài đặt người chơi (lưu trên trình duyệt).
    const [settings, setSettings] = useState(loadSettings)
    const matchDuration = settings.matchDuration
    const labelMode = settings.labelMode
    const matchDurationRef = useRef(matchDuration)
    matchDurationRef.current = matchDuration

    const updateSettings = useCallback((patch) => {
        setSettings((current) => {
            const next = { ...current, ...patch }
            saveSettings(next)
            return next
        })
    }, [])
    const [goalMessage, setGoalMessage] = useState('')
    const [resetKey, setResetKey] = useState(0)
    const [substitutionCount, setSubstitutionCount] = useState(0)

    // Luồng trận: hiệp hiện tại, danh sách bàn thắng, bỏ trận.
    const [half, setHalf] = useState(1)
    const [goalEvents, setGoalEvents] = useState([])
    const [forfeit, setForfeit] = useState(null) // null | 'league' | 'friendly'
    const [isQuitOpen, setIsQuitOpen] = useState(false)

    // HUD: bảng thay người, cầu thủ đã rời sân, chế độ hiện tên, radar.
    const [isSubsOpen, setIsSubsOpen] = useState(false)
    const [subbedOffIds, setSubbedOffIds] = useState([])
    const resumeAfterSubsRef = useRef(false)
    const radarRef = useRef(null)

    const matchTimeRef = useRef(0)
    matchTimeRef.current = matchTime

    const resetMatchFlow = useCallback(() => {
        setHalf(1)
        setGoalEvents([])
        setForfeit(null)
        setIsQuitOpen(false)
        setIsSubsOpen(false)
        setSubbedOffIds([])
        resumeAfterSubsRef.current = false
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

    const opponentNameRef = useRef('OPPONENT')
    opponentNameRef.current = opponentTeam?.name || 'OPPONENT'

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
            Math.floor((matchTimeRef.current / matchDurationRef.current) * 90) + 1,
        )

        const credit = info.scorerName
            ? `${info.scorerName}${info.ownGoal ? ' (OG)' : ''} ${minute}'`
            : `${minute}'`

        if (teamId === 'blue') {
            setBlueScore((score) => score + 1)
            setGoalMessage(`${USER_TEAM.name} · ${credit}`)
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
                Math.min(matchDuration, current + 0.25),
            )
        }, 250)

        return () => clearInterval(interval)
    }, [matchStatus])

    // Kết thúc trận khi đồng hồ đạt 90 phút.
    useEffect(() => {
        if (
            matchStatus === 'playing' &&
            matchTime >= matchDuration
        ) {
            handleMatchEnd()
        }
    }, [matchTime, matchStatus, handleMatchEnd])

    // Hết hiệp 1: dừng trận, mở màn nghỉ giữa hiệp.
    useEffect(() => {
        if (
            matchStatus === 'playing' &&
            half === 1 &&
            matchTime >= matchDuration / 2
        ) {
            setMatchTime(matchDuration / 2)
            setMatchStatus('halftime')
            setActionMessage('HALF TIME')
        }
    }, [matchTime, matchStatus, half])

    // Ghi nhận kết quả trận của đội người chơi vào giải đấu đúng một lần.
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

    // Hết trận: chụp thống kê từ engine để làm màn tổng kết.
    useEffect(() => {
        if (matchStatus !== 'fulltime') return

        const blue = roster.find((team) => team.id === 'blue')
        const allBlue = [...(blue?.players || []), ...(blue?.substitutes || [])]

        setMatchSummary(
            buildMatchSummary({
                stats: statsRef.current?.stats,
                players: blue?.players || [],
                subbedOffPlayers: allBlue.filter((player) => subbedOffIds.includes(player.id)),
                blueScore,
                redScore,
                goalEvents,
                forfeit,
            }),
        )
        // Chỉ chụp một lần khi vừa hết trận.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchStatus, forfeit])

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
        setMatchSummary(null)
        setScreen('match')

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
        setMatchStatus('idle')
        setScreen('home')
        setMatchSummary(null)
        setResetKey((key) => key + 1)
        setSubstitutionCount(0)
        resetMatchFlow()

        setIsLeagueOpen(false)
        setActionMessage('NEW SEASON STARTED')
    }, [league])

    const totalGameMinutes = Math.floor(
        (matchTime / matchDuration) * 90,
    )

    const displayMinutes = Math.min(totalGameMinutes, 90)

    const displaySeconds = Math.floor(
        ((matchTime / matchDuration) * 90 * 60) % 60,
    )

    const timeLabel = `${String(displayMinutes).padStart(2, '0')}:${String(
        displaySeconds,
    ).padStart(2, '0')}`

    const isPlaying = matchStatus === 'playing'

    // Trận tiếp theo của đội người chơi trong lịch (sau khi kết quả đã được ghi).
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

    // Thay người. Trả về { ok, message } để bảng thay người hiển thị kết quả.
    // Luật: tối đa MAX_SUBSTITUTIONS lượt; thủ môn chỉ thay bằng thủ môn;
    // cầu thủ đã rời sân không được vào lại. Cầu thủ vào sân nhận đúng vị trí
    // của người ra (đá trái sở trường vẫn được, như FO4).
    const substitutePlayer = (playerOutId, playerInId, options = {}) => {
        // Trước trận (chỉnh đội hình): không giới hạn, không tính lượt thay.
        const isPrematch = options.prematch === true

        const fail = (message) => {
            setActionMessage(message.toUpperCase())
            return { ok: false, message }
        }

        if (!isPrematch && substitutionCount >= MAX_SUBSTITUTIONS) {
            return fail('No substitutions remaining.')
        }

        if (!isPrematch && subbedOffIds.includes(playerInId)) {
            return fail('A player who has been substituted off cannot come back on.')
        }

        const blueTeam = roster.find((team) => team.id === 'blue')

        if (!blueTeam) return fail('Team not found.')

        const outgoing = blueTeam.players.find(
            (player) => player.id === playerOutId,
        )

        const incoming = blueTeam.substitutes.find(
            (player) => player.id === playerInId,
        )

        if (!outgoing || !incoming) return fail('Pick one starter and one bench player.')

        const outIsKeeper = getPositionGroup(outgoing.position) === 'GK'
        const inIsKeeper = getPositionGroup(incoming.position) === 'GK'

        if (outIsKeeper !== inIsKeeper) {
            return fail('A goalkeeper can only be replaced by a goalkeeper.')
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

        if (!isPrematch) {
            setSubstitutionCount((count) => count + 1)
            setSubbedOffIds((ids) => [...ids, playerOutId])
        }

        const outOfPosition =
            getPositionGroup(incoming.position) !== getPositionGroup(outgoing.position)

        const message = `${incoming.name} ${isPrematch ? 'starts' : 'on'}, ${outgoing.name} ${isPrematch ? 'to the bench' : 'off'}${
            outOfPosition ? ` (playing out of position as ${outgoing.position})` : ''
        }.`

        setActionMessage(`SUBSTITUTION: ${incoming.name.toUpperCase()} ON`)

        return { ok: true, message }
    }

    // Đổi vị trí hai cầu thủ đang trên sân (không tính lượt thay người).
    const swapStarters = (firstId, secondId) => {
        const blueTeam = roster.find((team) => team.id === 'blue')
        const first = blueTeam?.players.find((player) => player.id === firstId)
        const second = blueTeam?.players.find((player) => player.id === secondId)

        if (!first || !second) {
            return { ok: false, message: 'Pick two players on the pitch.' }
        }

        const firstKeeper = getPositionGroup(first.position) === 'GK'
        const secondKeeper = getPositionGroup(second.position) === 'GK'

        if (firstKeeper !== secondKeeper) {
            return { ok: false, message: 'The goalkeeper cannot swap with an outfield player.' }
        }

        setRoster((current) =>
            current.map((team) => {
                if (team.id !== 'blue') return team

                return {
                    ...team,
                    players: team.players.map((player) => {
                        if (player.id === firstId) {
                            return { ...player, position: second.position, x: second.x, z: second.z }
                        }

                        if (player.id === secondId) {
                            return { ...player, position: first.position, x: first.x, z: first.z }
                        }

                        return player
                    }),
                }
            }),
        )

        setActionMessage(`SWAP: ${first.name.toUpperCase()} ⇄ ${second.name.toUpperCase()}`)

        return {
            ok: true,
            message: `${first.name} now plays ${second.position}, ${second.name} now plays ${first.position}.`,
        }
    }

    // Mở bảng thay người: đang đá thì tạm dừng, đóng lại thì đá tiếp.
    const openSubstitutions = () => {
        setLineupMode('match')

        if (matchStatus === 'playing') {
            resumeAfterSubsRef.current = true
            setMatchStatus('paused')
        } else {
            resumeAfterSubsRef.current = false
        }

        setIsSubsOpen(true)
    }

    const closeSubstitutions = () => {
        setIsSubsOpen(false)

        if (resumeAfterSubsRef.current) {
            resumeAfterSubsRef.current = false
            setMatchStatus((status) => (status === 'paused' ? 'playing' : status))
        }
    }

    const cycleLabelMode = () => {
        const next = labelMode === 'smart' ? 'all' : labelMode === 'all' ? 'off' : 'smart'

        updateSettings({ labelMode: next })
        setActionMessage(`PLAYER NAMES: ${next.toUpperCase()}`)
    }

    const openLeague = () => {
        setIsLeagueOpen(true)
    }

    // ---- Điều hướng giữa các màn hình ngoài trận ----
    const prematchFixture = useMemo(
        () =>
            league.fixtures.find((fixture) => fixture.id === prematchFixtureId) ||
            nextFixture ||
            null,
        [league.fixtures, prematchFixtureId, nextFixture],
    )

    const openPrematch = (fixture) => {
        const target = fixture && !fixture.played ? fixture : nextFixture

        setPrematchFixtureId(target?.id || null)
        setIsLeagueOpen(false)
        setIsClubOpen(false)
        setScreen('prematch')
    }

    const kickOff = () => {
        if (prematchFixture) startLeagueFixture(prematchFixture)
    }

    const goHome = () => {
        setIsLeagueOpen(false)
        setIsClubOpen(false)
        setMatchStatus((status) => (status === 'fulltime' ? 'idle' : status))
        setScreen('home')
    }

    const openSummary = () => {
        setScreen('postmatch')
        setMatchStatus('idle')
    }

    const navigate = (tab) => {
        if (tab === 'home') goHome()
        else if (tab === 'prematch') openPrematch(nextFixture)
        else if (tab === 'league') setIsLeagueOpen(true)
        else if (tab === 'club') setIsClubOpen(true)
    }

    const openLineupEditor = () => {
        setLineupMode('prematch')
        resumeAfterSubsRef.current = false
        setIsSubsOpen(true)
    }

    // ---- Dữ liệu cho các màn hình ngoài trận ----
    const standings = useMemo(
        () => getLeagueStandings(league.fixtures),
        [league.fixtures],
    )

    const seasonProgress = useMemo(
        () => getSeasonProgress(league.fixtures),
        [league.fixtures],
    )

    const positionOf = (teamId) =>
        standings.findIndex((team) => team.teamId === teamId) + 1

    const blueRow = standings.find((team) => team.teamId === 'blue')
    const blueTeam = roster.find((team) => team.id === 'blue')

    const opponentIdOf = (fixture) =>
        fixture.homeTeamId === 'blue' ? fixture.awayTeamId : fixture.homeTeamId

    const homeNextMatch = nextFixture && nextOpponent
        ? {
            fixture: nextFixture,
            isHome: nextFixture.homeTeamId === 'blue',
            opponent: nextOpponent,
            opponentColor: getOpponentColor(nextOpponent.id),
            opponentPosition: positionOf(nextOpponent.id),
            blueStrength: getTeamById('blue')?.strength,
        }
        : null

    const lastPlayedFixture = league.fixtures
        .filter(
            (fixture) =>
                fixture.played &&
                (fixture.homeTeamId === 'blue' || fixture.awayTeamId === 'blue'),
        )
        .sort((a, b) => b.round - a.round)[0]

    const lastResult = lastPlayedFixture
        ? (() => {
            const isHome = lastPlayedFixture.homeTeamId === 'blue'
            const blueGoals = isHome ? lastPlayedFixture.homeGoals : lastPlayedFixture.awayGoals
            const opponentGoals = isHome ? lastPlayedFixture.awayGoals : lastPlayedFixture.homeGoals

            return {
                round: lastPlayedFixture.round,
                blueGoals,
                opponentGoals,
                opponentName: getTeamById(opponentIdOf(lastPlayedFixture))?.name,
                outcome:
                    blueGoals > opponentGoals ? 'win' : blueGoals < opponentGoals ? 'loss' : 'draw',
            }
        })()
        : null

    const squadSummary = {
        formation: blueTeam?.formationKey || '4-3-3',
        averageOverall: blueTeam?.players.length
            ? Math.round(
                blueTeam.players.reduce((sum, player) => sum + (player.overall || 0), 0) /
                    blueTeam.players.length,
            )
            : 0,
        size: (blueTeam?.players.length || 0) + (blueTeam?.substitutes.length || 0),
        value: formatMoney(getSquadValue(roster)),
    }

    const homeProgress = {
        userPlayed: seasonProgress.userPlayed,
        userTotal: seasonProgress.userTotal,
        won: blueRow?.won || 0,
        drawn: blueRow?.drawn || 0,
        lost: blueRow?.lost || 0,
    }

    const prematchOpponent = prematchFixture
        ? getTeamById(opponentIdOf(prematchFixture))
        : null

    const prematchRoster = useMemo(
        () => (prematchOpponent ? buildMatchRoster(roster, prematchOpponent) : roster),
        [roster, prematchOpponent],
    )

    const selectedPlayerProfile = matchRoster
        .flatMap((team) => [...team.players, ...(team.substitutes || [])])
        .find((player) => player.id === selectedId)

    const inMatch = screen === 'match' && matchStatus !== 'fulltime' && matchStatus !== 'idle'

    return (
        <main className="app-shell">
            <TopBar
                screen={screen}
                inMatch={inMatch}
                season={league.season || 2026}
                record={blueRow ? { position: positionOf('blue'), points: blueRow.points } : null}
                onNavigate={navigate}
            />

            {screen === 'home' && (
                <HomeScreen
                    nextMatch={homeNextMatch}
                    champion={seasonProgress.completed ? standings[0] : null}
                    standings={standings}
                    lastResult={lastResult}
                    squad={squadSummary}
                    progress={homeProgress}
                    settings={settings}
                    onSettingsChange={updateSettings}
                    onPlay={() => openPrematch(nextFixture)}
                    onEditLineup={() => {
                        openPrematch(nextFixture)
                        openLineupEditor()
                    }}
                    onOpenLeague={() => setIsLeagueOpen(true)}
                    onOpenClub={() => setIsClubOpen(true)}
                    onNewSeason={createNewSeason}
                />
            )}

            {screen === 'prematch' && (
                <PreMatchScreen
                    fixture={prematchFixture}
                    blueTeam={blueTeam}
                    opponentTeam={prematchRoster.find((team) => team.id === 'red')}
                    opponentInfo={prematchOpponent}
                    bluePosition={positionOf('blue')}
                    opponentPosition={prematchOpponent ? positionOf(prematchOpponent.id) : null}
                    tacticKey={tacticKey}
                    onTacticChange={changeTactic}
                    onFormationChange={changeFormation}
                    onEditLineup={openLineupEditor}
                    onKickOff={kickOff}
                    onBack={goHome}
                />
            )}

            {screen === 'postmatch' && (
                <PostMatchScreen
                    summary={matchSummary}
                    opponentName={opponentTeam?.name || 'OPPONENT'}
                    fixture={activeFixture}
                    nextFixture={nextFixture}
                    nextOpponentName={nextOpponent?.name || 'OPPONENT'}
                    onHome={goHome}
                    onNext={() => openPrematch(nextFixture)}
                    onOpenLeague={() => setIsLeagueOpen(true)}
                    onNewSeason={createNewSeason}
                />
            )}

            {screen === 'match' && (
            <section className="content-grid">
            <div className="pitch-panel">
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
                            radarRef={radarRef}
                            statsRef={statsRef}
                            labelMode={labelMode}
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
                        {USER_TEAM.shortName}
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
                        {opponentTeam?.shortName || 'OPP'}
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

            {/* Trong trận không mở quản lý CLB (giống FO4) — dùng ở sảnh. */}

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
                        onClick={openSubstitutions}
                        style={matchButtonStyle}
                    >
                        SUBS {substitutionCount}/{MAX_SUBSTITUTIONS}
                    </button>
                )}

                <button
                    onClick={cycleLabelMode}
                    style={matchButtonStyle}
                    title="Player names above heads"
                >
                    NAMES: {labelMode.toUpperCase()}
                </button>

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
            {/* GOAL / PAUSE / HALF TIME / FULL TIME */}
            {matchStatus === 'goal' && (
                <StatusOverlay title="GOAL!" subtitle={goalMessage} />
            )}

            {matchStatus === 'paused' && (
                <StatusOverlay title="PAUSED" subtitle="Press RESUME to continue">
                    <button type="button" className="btn btn--primary" onClick={togglePause}>
                        RESUME
                    </button>
                    <button type="button" className="btn" onClick={openSubstitutions}>
                        SUBSTITUTIONS
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={restartMatch}>
                        RESTART MATCH
                    </button>
                </StatusOverlay>
            )}

            {matchStatus === 'halftime' && (
                <HalfTimeOverlay
                    opponentName={opponentTeam?.name || 'OPPONENT'}
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
                    onOpenSubs={openSubstitutions}
                    onQuit={() => setIsQuitOpen(true)}
                />
            )}

            {matchStatus === 'fulltime' && !isLeagueOpen && (
                <FullTimeOverlay
                    opponentName={opponentTeam?.name || 'OPPONENT'}
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
                    onNextMatch={() => openPrematch(nextFixture)}
                    onSummary={openSummary}
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

            {/* Bản đồ mini kiểu FO4 — MatchWorld vẽ mỗi frame */}
            <canvas
                ref={radarRef}
                className="radar"
                width={480}
                height={312}
                aria-label="Mini map"
            />

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
                to pass/through/lob/shoot · Hold C shield the ball ·
                Defending: S/Q switch, hold D
                contain, D+E press, A teammate press · Space tackle · Ctrl
                slide · Throw-in: S short, A long
            </div>

            <div className="action-indicator">
                {actionMessage}
            </div>
        </div>
            </div>

            <MatchSidePanel selectedPlayer={selectedPlayerProfile} />
            </section>
            )}

            {/* Các bảng dùng chung cho mọi màn hình */}
            {isLeagueOpen && (
                <LeagueManagementPanel
                    league={league}
                    onClose={() => setIsLeagueOpen(false)}
                    onStartFixture={openPrematch}
                    onNewSeason={createNewSeason}
                />
            )}

            {isClubOpen && screen !== 'match' && (
                <div className="modal-host">
                    <ClubManagementPanel
                        roster={roster}
                        onRosterChange={setRoster}
                        isOpen
                        hideTrigger
                        onOpenChange={(open) => setIsClubOpen(open)}
                    />
                </div>
            )}

            {isSubsOpen && (
                <div className="modal-host">
                    <SubstitutionBoard
                        team={blueTeam}
                        isPrematch={lineupMode === 'prematch'}
                        substitutionCount={lineupMode === 'prematch' ? 0 : substitutionCount}
                        maxSubstitutions={MAX_SUBSTITUTIONS}
                        subbedOffIds={lineupMode === 'prematch' ? [] : subbedOffIds}
                        onSubstitute={(outId, inId) =>
                            substitutePlayer(outId, inId, { prematch: lineupMode === 'prematch' })
                        }
                        onSwap={swapStarters}
                        onClose={closeSubstitutions}
                    />
                </div>
            )}

            <footer>
                ULTIMATE FOOTBALL MANAGER 3D
                <span>EARLY DEVELOPMENT BUILD</span>
            </footer>
        </main>
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
