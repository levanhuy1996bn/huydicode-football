import SimulationScreen from './screens/SimulationScreen'
import TrophyRoomScreen from './screens/TrophyRoomScreen'
import NewTrophyPopup from './NewTrophyPopup'
import { awardTrophies } from '../services/trophyService'
import { crowdStart, crowdStop, roar, whistle } from '../utils/matchSound'
import FpsMeter from './FpsMeter'

// Phase 29B: khung 3D + vật lý tải riêng (xem MatchCanvas.jsx).
const loadMatchCanvas = () => import('./MatchCanvas')
const MatchCanvas = lazy(loadMatchCanvas)
import { SIM_REWARD_FACTOR, simulateQuickMatch, simulationsLeft, spendSimulation } from '../services/quickSim'
import {
    CUP_MATCH_FACTOR,
    STAGE_LABELS,
    calendarSlot,
    cupPrizeFor,
    describeUserCupResult,
    findUserFixture,
    fixtureLabel,
    nextUserFixture,
    recordCupResult,
    shootoutSkill,
    userCalendar,
} from '../services/cupService'
import { epCard, playerPack, protectionCard } from '../services/cards'
import ClubCrest from './ClubCrest'
import { LEAGUE_BY_ID } from '../data/world'
import ClubPicker from './ClubPicker'
import { isUserClub, userClubId, userTeam } from '../services/career'
import { teamColorOf, withTeamColor } from '../services/teamColor'
import ClubManagementPanel from './ClubManagementPanel'
import LeagueManagementPanel from './LeagueManagementPanel'
import SubstitutionBoard from './SubstitutionBoard'
import ControlsPanel from './ControlsPanel'
import DevelopmentScreen from './screens/DevelopmentScreen'
import MatchSidePanel from './MatchSidePanel'
import TopBar from './screens/TopBar'
import HomeScreen from './screens/HomeScreen'
import PreMatchScreen from './screens/PreMatchScreen'
import PostMatchScreen from './screens/PostMatchScreen'
import { formatMoney, getSquadValue, loadClub, saveClub } from '../services/clubService'
import { applyMatchToClub, applySeasonBonus } from '../services/clubProgress'
import { DEFAULT_DIFFICULTY, difficultyOf } from '../services/difficulty'
import CardsScreen from './screens/CardsScreen'
import { resolveMatchKits } from '../data/kits'

// Phase 24: gắn bộ áo của trận vào đội hình 3D (blue = đội người chơi,
// red = đối thủ với id CLB `opponentClubId`).
function applyKits(roster, kits, opponentClubId) {
    return roster.map((team) => {
        const isUserSide = team.id === 'blue'
        const entry = kits?.[isUserSide ? userClubId() : opponentClubId]
        // Phase 26B: phía đội mình mang tên CLB người chơi đang quản lý.
        const identity = isUserSide
            ? { name: userTeam()?.name || team.name, shortName: userTeam()?.shortName || team.shortName }
            : {}

        if (!entry) return { ...team, ...identity }

        return { ...team, ...identity, color: entry.kit.shirt, kit: entry.kit, keeperKit: entry.keeper }
    })
}
import { buildMatchSummary } from '../systems/matchStats'
import { applyMatchCondition } from '../systems/stamina'
import { applyMatchProgression, progressOf } from '../systems/progression'
import {
    FullTimeOverlay,
    HalfTimeOverlay,
    QuitConfirm,
    StatusOverlay,
    PausedStats,
} from './MatchOverlays'
import {
    saveLeague,
    getLeagueStandings,
    getSeasonProgress,
    getTeamById,
    recordUserFixtureResult,
} from '../services/leagueService'
import {
    loadGameWorld,
    switchClub,
    roundsPlayed,
    saveWorld,
    seasonOutcome,
} from '../services/worldService'
import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { FORMATIONS } from '../data/teams'
import { LiveStatsPanel, liveStatSource } from './MatchStatsPanel'
import { shortPlayerName } from '../utils/names'
import {
    FIXED_STEP,
    MATCH_DURATION,
    MAX_SUBSTITUTIONS,
    TACTICS,
} from '../systems/constants'
import {
    ROSTER_STORAGE_KEY,
    SQUAD_LIMITS,
    assignFormation,
    placeInSlot,
    buildMatchRoster,
    getOpponentColor,
    getPositionGroup,
    getRole,
    loadSavedRoster,
    matchdayConflict,
    squadOf,
} from '../systems/roster'
import { recordUserMatchStats, userMatchEntries } from '../services/seasonStats'

// Màn hình trận đấu: giao diện (scoreboard, bảng điều khiển, giải đấu, CLB).
// Engine trận đấu nằm trong src/systems, scene 3D nằm trong MatchWorld.jsx.

const SETTINGS_KEY = 'ultimate-football-settings-v1'
// Phase 29B: graphics 'high' | 'low', showFps (đồng hồ FPS trong trận).
const DEFAULT_SETTINGS = { matchDuration: MATCH_DURATION, labelMode: 'smart', graphics: 'high', showFps: false }

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
    // Phase 23: CLB (ngân sách EP, hợp đồng, cấp độ, XP, kho thẻ) do GameScene
    // giữ để thưởng sau trận, tab CARDS và màn TRANSFERS dùng chung một bản.
    const [club, setClub] = useState(loadClub)
    const clubReportRef = useRef(null)
    // Phase 25: mở TRANSFERS với ô tìm kiếm điền sẵn (nút mua bản sao ở màn đập thẻ).
    const [clubSearch, setClubSearch] = useState('')

    useEffect(() => {
        saveClub(club)
    }, [club])
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
    // resetKey của trận đã cập nhật phong độ thể lực (tránh cộng/trừ hai lần).
    const conditionAppliedRef = useRef(null)
    // XP / lên cấp của trận vừa xong (hiện ở màn sau trận).
    const progressionReportRef = useRef([])

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
    // Phase 20: thẻ phạt trong trận ({ teamId, name, minute, card }) và cầu
    // thủ đội người chơi bị đuổi (không được thay ra / vào).
    const [cardEvents, setCardEvents] = useState([])
    const [sentOffIds, setSentOffIds] = useState([])
    // Phase 21: thay người (dòng thời gian) và bảng thống kê trực tiếp.
    const [subEvents, setSubEvents] = useState([])
    const [isLiveStatsOpen, setIsLiveStatsOpen] = useState(false)
    // Phase 22: bảng hướng dẫn phím (thay nút NAMES).
    const [isControlsOpen, setIsControlsOpen] = useState(false)
    const resumeAfterControlsRef = useRef(false)
    const [forfeit, setForfeit] = useState(null) // null | 'league' | 'friendly'
    const [isQuitOpen, setIsQuitOpen] = useState(false)

    // HUD: bảng thay người, cầu thủ đã rời sân, chế độ hiện tên, radar.
    const [isSubsOpen, setIsSubsOpen] = useState(false)
    const [subbedOffIds, setSubbedOffIds] = useState([])
    const resumeAfterSubsRef = useRef(false)
    const radarRef = useRef(null)

    const matchTimeRef = useRef(0)
    matchTimeRef.current = matchTime

    // Hết giờ nhưng chờ bóng chết mới thổi còi: 'half' | 'full' | null,
    // số giây bù giờ đã đá, máy đang đá thay người chơi (không bấm 10 giây).
    const [whistlePending, setWhistlePending] = useState(null)
    const [addedTime, setAddedTime] = useState(0)
    const [autoPilot, setAutoPilot] = useState(false)

    const resetMatchFlow = useCallback(() => {
        setWhistlePending(null)
        setAddedTime(0)
        setAutoPilot(false)
        setHalf(1)
        setGoalEvents([])
        setCardEvents([])
        setSentOffIds([])
        setSubEvents([])
        setForfeit(null)
        setIsQuitOpen(false)
        setIsSubsOpen(false)
        setSubbedOffIds([])
        resumeAfterSubsRef.current = false
    }, [])

    // LEAGUE STATE
    // Phase 26A: thế giới 36 giải + giải của người chơi (bản lưu cũ được chuyển
    // sang Premier League thật ngay lần nạp đầu tiên).
    const [boot] = useState(loadGameWorld)
    const [world, setWorld] = useState(boot.world)
    const [league, setLeague] = useState(boot.league)

    // Phase 27: lịch chung giải + cúp (cupService).
    const [activeFixtureId, setActiveFixtureId] = useState(
        () => nextUserFixture(boot.league)?.id || null,
    )

    const [isLeagueOpen, setIsLeagueOpen] = useState(false)

    // Phase 26C: độ khó của mùa — chọn trước trận đầu tiên, sau đó khoá.
    const difficulty = difficultyOf(league.difficulty || DEFAULT_DIFFICULTY)
    const difficultyLocked = roundsPlayed(league) > 0
    const matchOptions = { difficulty: difficulty.id, season: league.season }
    const changeDifficulty = useCallback((id) => {
        setLeague((current) => (roundsPlayed(current) > 0 ? current : { ...current, difficulty: id }))
    }, [])

    // Chặn ghi nhận trùng kết quả khi React chạy lại effect.
    const recordedFixtureRef = useRef(null)
    // Phase 27: kết quả cúp của trận vừa xong (màn sau trận).
    const cupInfoRef = useRef(null)

    const activeFixture = useMemo(
        () => findUserFixture(league, activeFixtureId),
        [league, activeFixtureId],
    )

    const opponentId = activeFixture
        ? isUserClub(activeFixture.homeTeamId)
            ? activeFixture.awayTeamId
            : activeFixture.homeTeamId
        : isUserClub('eng-manchester-city') ? 'eng-manchester-united' : 'eng-manchester-city'

    const opponentTeam = getTeamById(opponentId)

    // Phase 24: bộ áo đã chọn trước trận (theo trận), mặc định tránh trùng màu.
    const [kitChoice, setKitChoice] = useState({ fixtureId: null, slots: {} })
    const kitsForFixture = (fixture) =>
        fixture
            ? resolveMatchKits(
                fixture.homeTeamId,
                fixture.awayTeamId,
                kitChoice.fixtureId === fixture.id ? kitChoice.slots : null,
            )
            : resolveMatchKits(userClubId(), isUserClub('eng-manchester-city') ? 'eng-manchester-united' : 'eng-manchester-city')

    const matchKits = kitsForFixture(activeFixture)

    // Đội hình 3D của đối thủ theo đúng đội trong vòng đấu.
    const matchRoster = useMemo(
        () => applyKits(buildMatchRoster(roster, opponentTeam, matchOptions), matchKits, opponentTeam?.id || 'red'),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [roster, opponentTeam, activeFixture?.id, kitChoice, league.difficulty, league.season],
    )

    const opponentNameRef = useRef('OPPONENT')
    opponentNameRef.current = opponentTeam?.name || 'OPPONENT'

    const isBlueHome = activeFixture
        ? isUserClub(activeFixture.homeTeamId)
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

    useEffect(() => {
        saveWorld(world)
    }, [world])

    // Phase 29B: tải trước khung 3D trận đấu khi trình duyệt rảnh (sau 1.5 giây),
    // để lúc bấm KICK OFF không phải chờ.
    useEffect(() => {
        const timer = setTimeout(() => {
            loadMatchCanvas().catch(() => {})
        }, 1500)

        return () => clearTimeout(timer)
    }, [])

    // Phase 28B: trao cúp (vô địch giải khi đá xong mùa, C1 / C2 khi thắng
    // chung kết). Lần chạy đầu (mở game) chỉ ghi lặng lẽ — ví dụ danh hiệu
    // giành trước khi có phòng truyền thống — không hiện thông báo.
    const [newTrophies, setNewTrophies] = useState([])
    const trophyBootRef = useRef(true)

    useEffect(() => {
        const { world: awarded, added } = awardTrophies(world, league)

        if (awarded !== world) setWorld(awarded)
        if (added.length && !trophyBootRef.current) setNewTrophies((queue) => [...queue, ...added])

        trophyBootRef.current = false
    }, [world, league])

    // Thông báo một lần khi bản lưu cũ được chuyển sang thế giới mới.
    useEffect(() => {
        if (boot.migrated) {
            setActionMessage(`NEW WORLD · SEASON ${boot.league.season} · PREMIER LEAGUE`)
        }
    }, [boot])

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
            setGoalMessage(`${userTeam().name} · ${credit}`)
        } else {
            setRedScore((score) => score + 1)
            setGoalMessage(`${opponentNameRef.current} · ${credit}`)
        }

        // Phase 29B: khán giả hò reo (to hơn khi đội mình ghi bàn).
        roar(teamId === 'blue')

        setGoalEvents((events) => [
            ...events,
            {
                teamId,
                name: info.scorerName,
                ownGoal: Boolean(info.ownGoal),
                // Phase 29C: bàn từ cú sút bồi / bóng đổi hướng.
                rebound: Boolean(info.rebound),
                deflected: Boolean(info.deflected),
                minute,
            },
        ])

        setMatchStatus('goal')
    }, [])

    const handleCard = useCallback((info) => {
        const minute = Math.min(
            90,
            Math.floor((matchTimeRef.current / matchDurationRef.current) * 90) + 1,
        )

        setCardEvents((events) => [
            ...events,
            { teamId: info.teamId, name: info.name, minute, card: info.card },
        ])

        if (info.card === 'red' && info.teamId === 'blue') {
            setSentOffIds((ids) => (ids.includes(info.id) ? ids : [...ids, info.id]))
        }
    }, [])

    const matchEvents = useMemo(
        () => [...goalEvents, ...cardEvents].sort((a, b) => a.minute - b.minute),
        [goalEvents, cardEvents],
    )

    const handleMatchEnd = useCallback(() => {
        setMatchStatus('fulltime')
        setActionMessage('FULL TIME')
    }, [])

    // Đồng hồ trận đấu.
    useEffect(() => {
        if (matchStatus !== 'playing') return undefined

        const interval = setInterval(() => {
            // Đang bù giờ (chờ bóng chết): đồng hồ chính dừng, đếm giờ bù.
            if (whistlePending) {
                setAddedTime((current) => current + 0.25)
                return
            }

            setMatchTime((current) =>
                Math.min(matchDuration, current + 0.25),
            )
        }, 250)

        return () => clearInterval(interval)
    }, [matchStatus, whistlePending])

    // Hết 90 phút / hết hiệp 1: KHÔNG dừng ngay. Báo cho engine "đã hết giờ",
    // trận đá bù cho tới khi bóng chết (ra ngoài, bàn thắng, thủ môn ôm bóng),
    // trọng tài thổi còi, cầu thủ có hoạt cảnh rồi mới hiện bảng
    // (xem systems/whistle.js → handleWhistleDone).
    useEffect(() => {
        if (matchStatus !== 'playing' || whistlePending) return

        if (half === 1 && matchTime >= matchDuration / 2) {
            setMatchTime(matchDuration / 2)
            setAddedTime(0)
            setWhistlePending('half')
        } else if (half === 2 && matchTime >= matchDuration) {
            setAddedTime(0)
            setWhistlePending('full')
        }
    }, [matchTime, matchStatus, half, whistlePending])

    // Phase 29B: còi giao bóng + tiếng khán giả nền trong trận.
    const previousStatusRef = useRef(matchStatus)

    useEffect(() => {
        const previous = previousStatusRef.current

        previousStatusRef.current = matchStatus

        if (screen !== 'match') {
            crowdStop()
            return
        }

        if (matchStatus === 'playing') {
            crowdStart()
            if (previous !== 'paused' && previous !== 'playing') whistle('kickoff')
        } else if (matchStatus !== 'goal') {
            crowdStop()
        }
    }, [matchStatus, screen])

    useEffect(() => () => crowdStop(), [])

    const handleWhistleDone = useCallback((type) => {
        setWhistlePending(null)

        if (type === 'half') {
            setMatchStatus('halftime')
            setActionMessage('HALF TIME')
        } else {
            handleMatchEnd()
        }
    }, [handleMatchEnd])

    // Ghi nhận kết quả trận của đội người chơi vào giải đấu đúng một lần.
    useEffect(() => {
        if (
            matchStatus !== 'fulltime' ||
            !activeFixtureId ||
            recordedFixtureRef.current === activeFixtureId
        ) {
            return
        }

        const fixture = findUserFixture(league, activeFixtureId)

        if (!fixture || fixture.played) {
            return
        }

        recordedFixtureRef.current = activeFixtureId

        const homeGoals =
            isUserClub(fixture.homeTeamId)
                ? blueScore
                : redScore

        const awayGoals =
            isUserClub(fixture.homeTeamId)
                ? redScore
                : blueScore

        // Phase 27: trận cúp ghi vào league.cups (hoà tổng tỉ số → luân lưu
        // mô phỏng theo chỉ số sút của 11 người đá chính).
        const userSkill = shootoutSkill(roster.find((team) => team.id === 'blue')?.players || [])

        setLeague((currentLeague) =>
            fixture.competition
                ? recordCupResult(currentLeague, activeFixtureId, homeGoals, awayGoals, userSkill)
                : recordUserFixtureResult(
                    currentLeague,
                    activeFixtureId,
                    homeGoals,
                    awayGoals,
                ),
        )

        setActionMessage('FULL TIME - RESULT SAVED')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        matchStatus,
        activeFixtureId,
        league,
        blueScore,
        redScore,
    ])

    // Hết trận: chụp thống kê từ engine để làm màn tổng kết, cập nhật phong độ
    // thể lực (Phase 19) và XP / cấp độ (Phase 19B) cho đội người chơi.
    useEffect(() => {
        if (matchStatus !== 'fulltime') return

        const blue = roster.find((team) => team.id === 'blue')
        const allBlue = squadOf(blue)

        const summary = buildMatchSummary({
            stats: statsRef.current?.stats,
            players: blue?.players || [],
            subbedOffPlayers: allBlue.filter((player) => subbedOffIds.includes(player.id)),
            blueScore,
            redScore,
            goalEvents,
            forfeit,
        })

        // Chỉ cập nhật đội hình một lần cho mỗi trận (effect có thể chạy lại
        // khi `forfeit` đổi sau khi đã hết trận).
        if (conditionAppliedRef.current !== resetKey) {
            conditionAppliedRef.current = resetKey

            const onPitch = statsRef.current?.onPitchTime || {}
            const fractions = Object.fromEntries(
                Object.entries(onPitch).map(([id, seconds]) => [
                    id,
                    Math.min(1, seconds / Math.max(1, matchDuration)),
                ]),
            )

            const rested = applyMatchCondition(allBlue, fractions)
            const { players: progressed, reports } = applyMatchProgression(
                rested,
                summary.ratings,
                fractions,
                {
                    goalsFor: blueScore,
                    goalsAgainst: redScore,
                    motmId: summary.manOfTheMatch?.id || null,
                    forfeit,
                },
            )
            const updatedById = new Map(progressed.map((player) => [player.id, player]))

            progressionReportRef.current = reports
            clubReportRef.current = null

            // Phase 22: thống kê cầu thủ cả mùa (cả hai đội) cho trận giải đấu.
            // Bỏ trận (xử thua 0–3) thì không ghi số liệu cầu thủ.
            const fixture = findUserFixture(league, activeFixtureId)
            const isCup = Boolean(fixture?.competition)

            if (!forfeit && fixture && !fixture.played && !isCup) {
                const entries = userMatchEntries({
                    stats: statsRef.current?.stats,
                    bluePlayers: summary.ratings,
                    redPlayers: matchRoster.find((team) => team.id === 'red')?.players || [],
                    opponentClubId: opponentId,
                    blueScore,
                    redScore,
                })

                setLeague((current) => recordUserMatchStats(current, activeFixtureId, entries))
            }

            // Phase 27: kết quả cúp sau trận (cả khi bỏ trận: xử thua 0–3).
            let cupInfo = null

            if (isCup && fixture && !fixture.played) {
                const isHome = isUserClub(fixture.homeTeamId)
                const after = recordCupResult(
                    league,
                    fixture.id,
                    isHome ? blueScore : redScore,
                    isHome ? redScore : blueScore,
                    shootoutSkill(roster.find((team) => team.id === 'blue')?.players || []),
                )

                cupInfo = describeUserCupResult(after, fixture.id)
            }

            cupInfoRef.current = cupInfo

            // Thưởng (trận giải và trận cúp; bỏ trận thì không có).
            if (!forfeit && fixture && !fixture.played) {

                // Phase 23: XP CLB + tiền thưởng (EP); lên cấp thì thêm thẻ EP
                // và gói cầu thủ vào kho. Trận cuối mùa: thưởng theo thứ hạng.
                const rewarded = applyMatchToClub(club, {
                    goalsFor: blueScore,
                    goalsAgainst: redScore,
                    opponentStrength: opponentTeam?.strength,
                    // Phase 27: trận cúp thưởng nhiều hơn (C1 ×1.5, C2 ×1.25).
                    rewardFactor: difficulty.reward * (isCup ? CUP_MATCH_FACTOR[fixture.competition] : 1),
                })
                let nextClub = rewarded.club
                let seasonReward = null
                let cupReward = null

                if (isCup) {
                    const prize = Math.round(
                        (cupPrizeFor(cupInfo?.cupId, cupInfo?.stage, cupInfo?.outcome) * difficulty.reward) / 100000,
                    ) * 100000

                    if (prize > 0) {
                        const label = cupInfo.outcome === 'champion'
                            ? `${cupInfo.cupName} winners`
                            : `${cupInfo.cupName} · ${STAGE_LABELS[cupInfo.stage]} passed`
                        const items = [epCard(prize, label)]

                        if (cupInfo.outcome === 'champion') items.push(playerPack('premium', label), protectionCard(label))

                        nextClub = { ...nextClub, inventory: [...(nextClub.inventory || []), ...items] }
                        cupReward = { amount: prize, label, pack: cupInfo.outcome === 'champion' }
                    }
                }

                const remainingUserFixtures = league.fixtures.filter(
                    (item) =>
                        !item.played &&
                        item.id !== fixture.id &&
                        (isUserClub(item.homeTeamId) || isUserClub(item.awayTeamId)),
                ).length

                if (!isCup && remainingUserFixtures === 0) {
                    const isHome = isUserClub(fixture.homeTeamId)
                    const finalLeague = recordUserFixtureResult(
                        league,
                        fixture.id,
                        isHome ? blueScore : redScore,
                        isHome ? redScore : blueScore,
                    )
                    const position =
                        getLeagueStandings(finalLeague.fixtures).findIndex((row) => isUserClub(row.teamId)) + 1
                    const bonus = applySeasonBonus(nextClub, league.season || 2026, position, difficulty.reward, LEAGUE_BY_ID.get(league.leagueId)?.tier || 1)

                    nextClub = bonus.club
                    seasonReward = bonus.bonus
                }

                clubReportRef.current = { ...rewarded.report, seasonReward, cupReward, budget: nextClub.budget }
                setClub(nextClub)
            }

            setRoster((current) =>
                current.map((team) =>
                    team.id !== 'blue'
                        ? team
                        : {
                            ...team,
                            players: team.players.map((player) => updatedById.get(player.id) || player),
                            substitutes: (team.substitutes || []).map(
                                (player) => updatedById.get(player.id) || player,
                            ),
                            reserves: (team.reserves || []).map(
                                (player) => updatedById.get(player.id) || player,
                            ),
                        },
                ),
            )
        }

        setMatchSummary({
            ...summary,
            cardEvents,
            subEvents,
            shots: [...(statsRef.current?.stats?.shots || [])],
            progression: progressionReportRef.current || [],
            clubReport: clubReportRef.current,
            cupInfo: cupInfoRef.current,
        })
        // Chỉ chụp một lần khi vừa hết trận.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchStatus, forfeit])

    // Thông báo bàn thắng.
    useEffect(() => {
        if (matchStatus !== 'goal') return undefined

        const timeout = setTimeout(() => {
            // Chỉ quay lại 'playing' nếu chưa chuyển sang trạng thái khác
            // (vd. còi hết hiệp vừa thổi ngay sau bàn thắng ở phút bù giờ).
            setMatchStatus((status) => (status === 'goal' ? 'playing' : status))
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
        setWhistlePending(null)

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
            isUserClub(fixture.homeTeamId)
                ? fixture.awayTeamId
                : fixture.homeTeamId

        const nextOpponent = getTeamById(nextOpponentId)

        setActionMessage(
            `${fixtureLabel(fixture)}: ${nextOpponent?.name || 'OPPONENT'}`,
        )
    }, [])

    // Bắt đầu mùa giải mới.
    // Đưa thế giới + giải mới vào game (mùa mới, hoặc đổi CLB).
    const applyLeagueChange = useCallback((nextWorld, nextLeague, message, { rest = false } = {}) => {
        setWorld(nextWorld)
        setLeague(nextLeague)

        // Mùa mới: cả đội hồi phục hoàn toàn (Phase 19).
        if (rest) {
            const rested = (players) =>
                (players || []).map((player) =>
                    player.condition == null || player.condition === 100
                        ? player
                        : { ...player, condition: 100 },
                )

            setRoster((current) =>
                current.map((team) =>
                    team.id !== 'blue'
                        ? team
                        : {
                            ...team,
                            players: rested(team.players),
                            substitutes: rested(team.substitutes),
                            reserves: rested(team.reserves || []),
                        },
                ),
            )
        }

        const firstFixture = nextUserFixture(nextLeague)

        setActiveFixtureId(firstFixture?.id || null)
        recordedFixtureRef.current = null
        setKitChoice({ fixtureId: null, slots: {} })

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
        setActionMessage(message)
    }, [resetMatchFlow])

    // Phase 26B: chọn / đổi CLB.
    //   start  — lần đầu chơi (chưa có bản lưu)
    //   season — bấm START NEW SEASON: giữ CLB hoặc đổi trước khi sang mùa
    //   change — Settings → CHANGE CLUB (giữa mùa: mùa này bắt đầu lại)
    const [clubPicker, setClubPicker] = useState(() => (boot.firstRun ? { mode: 'start' } : null))
    const seasonComplete = getSeasonProgress(league.fixtures).completed

    const createNewSeason = useCallback(() => {
        setIsLeagueOpen(false)
        setClubPicker({ mode: 'season' })
    }, [])

    const openChangeClub = useCallback(() => {
        setClubPicker({ mode: seasonComplete ? 'season' : 'change' })
    }, [seasonComplete])

    const confirmClub = useCallback((clubId) => {
        const mode = clubPicker?.mode
        const newSeason = mode === 'season'
        const sameClub = isUserClub(clubId)

        setClubPicker(null)

        if (sameClub && !newSeason) return

        const previousWorld = world
        const next = switchClub(world, league, clubId, { newSeason })
        const club = getTeamById(clubId)
        const leagueName = LEAGUE_BY_ID.get(next.league.leagueId)?.name.toUpperCase()

        if (newSeason) {
            // Phase 26A: tính bảng cuối 36 giải, lên / xuống hạng, rồi tạo giải
            // mới cho người chơi (giải của CLB đang quản lý).
            const outcome = seasonOutcome(previousWorld, next.world)
            const movement =
                outcome.movement === 'promoted'
                    ? 'PROMOTED! '
                    : outcome.movement === 'relegated'
                        ? 'RELEGATED · '
                        : ''

            applyLeagueChange(
                next.world,
                next.league,
                sameClub
                    ? `${movement}NEW SEASON IN ${leagueName}`
                    : `${movement}NEW SEASON · ${club?.name} · ${leagueName}`,
                { rest: true },
            )
            return
        }

        applyLeagueChange(next.world, next.league, `NOW MANAGING ${club?.name} · ${leagueName}`)
    }, [clubPicker, world, league, applyLeagueChange])

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

    // Bù giờ: quy đổi giây thực ra phút:giây trận đấu (ví dụ "+1:20").
    const addedGameSeconds = Math.floor((addedTime / matchDuration) * 90 * 60)
    const addedLabel = whistlePending
        ? `+${Math.floor(addedGameSeconds / 60)}:${String(addedGameSeconds % 60).padStart(2, '0')}`
        : null

    const isPlaying = matchStatus === 'playing'

    // Trận tiếp theo của đội người chơi trong lịch (sau khi kết quả đã được ghi).
    const nextFixture = useMemo(
        () => nextUserFixture(league),
        [league],
    )

    const nextOpponent = nextFixture
        ? getTeamById(
            isUserClub(nextFixture.homeTeamId)
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

                // Mỗi ô của sơ đồ mới nhận người cùng nhóm vị trí, gần nhất.
                const updatedPlayers = assignFormation(team.players, formation)

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

        if (!isPrematch && sentOffIds.includes(playerOutId)) {
            return fail('A sent-off player cannot be replaced.')
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

                const newStartingPlayer = placeInSlot(incoming, outgoing.position, outgoing.x, outgoing.z)

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

            const minute = Math.min(
                90,
                Math.floor((matchTimeRef.current / matchDurationRef.current) * 90) + 1,
            )

            setSubEvents((events) => [
                ...events,
                {
                    teamId: 'blue',
                    minute,
                    sub: { on: shortPlayerName(incoming.name, 16), off: shortPlayerName(outgoing.name, 16) },
                },
            ])
        }

        const outOfPosition =
            getPositionGroup(incoming.position) !== getPositionGroup(outgoing.position)

        const message = `${incoming.name} ${isPrematch ? 'starts' : 'on'}, ${outgoing.name} ${isPrematch ? 'to the bench' : 'off'}${
            outOfPosition ? ` (playing out of position as ${outgoing.position})` : ''
        }.`

        setActionMessage(`SUBSTITUTION: ${incoming.name.toUpperCase()} ON`)

        return { ok: true, message }
    }

    // Phase 22: trước trận, chuyển cầu thủ giữa đá chính / dự bị (tối đa 9) /
    // đội hình ngoài. source / target: { id, zone } với zone 'pitch' | 'bench'
    // | 'reserves'; target.id = null khi thả vào tiêu đề khu vực.
    const moveSquadPlayer = (source, target) => {
        const blueTeam = roster.find((team) => team.id === 'blue')
        const fail = (message) => ({ ok: false, message })

        if (!blueTeam) return fail('Team not found.')

        const reserves = blueTeam.reserves || []
        const find = (zone, id) =>
            (zone === 'pitch' ? blueTeam.players : zone === 'bench' ? blueTeam.substitutes : reserves)
                .find((player) => player.id === id)

        const mover = find(source.zone, source.id)

        if (!mover) return fail('Player not found.')

        // Đội hình ngoài ↔ sân: dùng chung luật với thay người trước trận,
        // người rời sân ra đội hình ngoài.
        if ((source.zone === 'reserves' && target.zone === 'pitch') || (source.zone === 'pitch' && target.zone === 'reserves')) {
            const starter = source.zone === 'pitch' ? mover : find('pitch', target.id)
            const reserve = source.zone === 'reserves' ? mover : find('reserves', target.id)

            if (!starter || !reserve) return fail('Drop the reserve player onto a starter.')

            const duplicate = matchdayConflict(blueTeam, reserve, [starter.id])

            if (duplicate) {
                return fail(`${duplicate.name} is already in the matchday squad (another card of the same player).`)
            }

            if ((getPositionGroup(starter.position) === 'GK') !== (getPositionGroup(reserve.position) === 'GK')) {
                return fail('A goalkeeper can only be replaced by a goalkeeper.')
            }

            setRoster((current) =>
                current.map((team) =>
                    team.id !== 'blue'
                        ? team
                        : {
                            ...team,
                            players: team.players.map((player) =>
                                player.id === starter.id
                                    ? { ...reserve, position: starter.position, x: starter.x, z: starter.z }
                                    : player,
                            ),
                            reserves: (team.reserves || []).map((player) =>
                                player.id === reserve.id ? { ...starter, x: 0, z: 60 } : player,
                            ),
                        },
                ),
            )

            if (selectedId === starter.id) setSelectedId(reserve.id)

            return { ok: true, message: `${reserve.name} starts, ${starter.name} moves to the reserves.` }
        }

        // Dự bị ↔ đội hình ngoài.
        if (
            (source.zone === 'bench' && target.zone === 'reserves') ||
            (source.zone === 'reserves' && target.zone === 'bench')
        ) {
            const toBench = source.zone === 'reserves'
            const other = target.id ? find(target.zone, target.id) : null

            // Người đi vào băng ghế: mover (từ đội hình ngoài) hoặc other (đổi chỗ).
            const joining = toBench ? mover : other
            const leaving = toBench ? other : mover

            if (joining) {
                const duplicate = matchdayConflict(blueTeam, joining, leaving ? [leaving.id] : [])

                if (duplicate) {
                    return fail(`${duplicate.name} is already in the matchday squad (another card of the same player).`)
                }
            }

            if (!other && toBench && blueTeam.substitutes.length >= SQUAD_LIMITS.bench) {
                return fail(`The bench is full (${SQUAD_LIMITS.bench} players). Drop onto a bench player to swap.`)
            }

            setRoster((current) =>
                current.map((team) => {
                    if (team.id !== 'blue') return team

                    let substitutes = [...(team.substitutes || [])]
                    let teamReserves = [...(team.reserves || [])]

                    if (toBench) {
                        teamReserves = teamReserves.filter((player) => player.id !== mover.id)
                        substitutes = other
                            ? substitutes.map((player) => (player.id === other.id ? mover : player))
                            : [...substitutes, mover]
                        if (other) teamReserves = [...teamReserves, other]
                    } else {
                        substitutes = substitutes.filter((player) => player.id !== mover.id)
                        teamReserves = other
                            ? teamReserves.map((player) => (player.id === other.id ? mover : player))
                            : [...teamReserves, mover]
                        if (other) substitutes = [...substitutes, other]
                    }

                    return { ...team, substitutes, reserves: teamReserves }
                }),
            )

            if (other) {
                return { ok: true, message: `${toBench ? mover.name : other.name} joins the bench, ${toBench ? other.name : mover.name} moves to the reserves.` }
            }

            return {
                ok: true,
                message: toBench ? `${mover.name} joins the bench.` : `${mover.name} moves to the reserves.`,
            }
        }

        return fail('Drag between the pitch, the bench and the reserves.')
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
                            return placeInSlot(player, second.position, second.x, second.z)
                        }

                        if (player.id === secondId) {
                            return placeInSlot(player, first.position, first.x, first.z)
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

    const changeLabelMode = (next) => {
        updateSettings({ labelMode: next })
        setActionMessage(`PLAYER NAMES: ${next.toUpperCase()}`)
    }

    // CONTROLS: dừng trận trong lúc xem, đóng thì đá tiếp.
    const openControls = () => {
        if (matchStatus === 'playing') {
            resumeAfterControlsRef.current = true
            setMatchStatus('paused')
        } else {
            resumeAfterControlsRef.current = false
        }

        setIsControlsOpen(true)
    }

    const closeControls = useCallback(() => {
        setIsControlsOpen(false)

        if (resumeAfterControlsRef.current) {
            resumeAfterControlsRef.current = false
            setMatchStatus((status) => (status === 'paused' ? 'playing' : status))
        }
    }, [])

    const openLeague = () => {
        setIsLeagueOpen(true)
    }

    // ---- Điều hướng giữa các màn hình ngoài trận ----
    const prematchFixture = useMemo(
        () =>
            findUserFixture(league, prematchFixtureId) ||
            nextFixture ||
            null,
        [league, prematchFixtureId, nextFixture],
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
        else if (tab === 'development') openDevelopment()
        else if (tab === 'league') setIsLeagueOpen(true)
        else if (tab === 'club') setIsClubOpen(true)
        else if (tab === 'cards') openCards()
        else if (tab === 'trophies') openTrophies()
    }

    // Phase 28B: phòng truyền thống.
    const openTrophies = () => {
        setIsLeagueOpen(false)
        setIsClubOpen(false)
        setMatchStatus((status) => (status === 'fulltime' ? 'idle' : status))
        setScreen('trophies')
    }

    // Phase 23: tab CARDS (mở gói cầu thủ, thẻ EP).
    const openCards = () => {
        setIsLeagueOpen(false)
        setIsClubOpen(false)
        setMatchStatus((status) => (status === 'fulltime' ? 'idle' : status))
        setScreen('cards')
    }

    // Phase 19B: màn phát triển cầu thủ.
    const openDevelopment = () => {
        setIsLeagueOpen(false)
        setIsClubOpen(false)
        setMatchStatus((status) => (status === 'fulltime' ? 'idle' : status))
        setScreen('development')
    }

    const updateBluePlayer = (updated) => {
        setRoster((current) =>
            current.map((team) =>
                team.id !== 'blue'
                    ? team
                    : {
                        ...team,
                        players: team.players.map((player) => (player.id === updated.id ? updated : player)),
                        substitutes: (team.substitutes || []).map((player) =>
                            player.id === updated.id ? updated : player,
                        ),
                        reserves: (team.reserves || []).map((player) =>
                            player.id === updated.id ? updated : player,
                        ),
                    },
            ),
        )
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

    const blueRow = standings.find((team) => isUserClub(team.teamId))
    const blueTeam = roster.find((team) => team.id === 'blue')

    const opponentIdOf = (fixture) =>
        isUserClub(fixture.homeTeamId) ? fixture.awayTeamId : fixture.homeTeamId

    const homeNextMatch = nextFixture && nextOpponent
        ? {
            fixture: nextFixture,
            isHome: isUserClub(nextFixture.homeTeamId),
            opponent: nextOpponent,
            opponentColor: getOpponentColor(nextOpponent.id),
            opponentPosition: positionOf(nextOpponent.id),
            blueStrength: userTeam()?.strength,
        }
        : null

    const lastPlayedFixture = userCalendar(league)
        .filter((fixture) => fixture.played)
        .sort((a, b) => calendarSlot(b) - calendarSlot(a))[0]

    const lastResult = lastPlayedFixture
        ? (() => {
            const isHome = isUserClub(lastPlayedFixture.homeTeamId)
            const blueGoals = isHome ? lastPlayedFixture.homeGoals : lastPlayedFixture.awayGoals
            const opponentGoals = isHome ? lastPlayedFixture.awayGoals : lastPlayedFixture.homeGoals

            return {
                round: lastPlayedFixture.round,
                label: fixtureLabel(lastPlayedFixture),
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
        size: squadOf(blueTeam).length,
        value: formatMoney(getSquadValue(roster)),
        // Phase 19B: tổng điểm chỉ số chưa cộng của cả đội.
        unspentPoints: squadOf(blueTeam)
            .reduce((sum, player) => sum + progressOf(player).unspentPoints, 0),
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

    const prematchKits = kitsForFixture(prematchFixture)

    const prematchRoster = useMemo(
        () =>
            prematchOpponent
                ? applyKits(buildMatchRoster(roster, prematchOpponent, matchOptions), prematchKits, prematchOpponent.id)
                : roster,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [roster, prematchOpponent, prematchFixture?.id, kitChoice, league.difficulty, league.season],
    )

    // Đổi bộ áo của một đội (người chơi hoặc máy) cho trận sắp đá.
    // ---- Phase 28: mô phỏng nhanh (5 lượt / ngày, thưởng ×0.7) ----
    const [simulation, setSimulation] = useState(null)
    const simsLeft = simulationsLeft(club)

    const runQuickSimulation = (fixture) => {
        if (!fixture || fixture.played || simulationsLeft(club) <= 0) return

        const opponentClubId = isUserClub(fixture.homeTeamId) ? fixture.awayTeamId : fixture.homeTeamId
        const opponent = getTeamById(opponentClubId)
        const simRoster = applyKits(
            buildMatchRoster(roster, opponent, matchOptions),
            kitsForFixture(fixture),
            opponentClubId,
        )
        const blueSide = simRoster.find((team) => team.id === 'blue')
        const redSide = simRoster.find((team) => team.id === 'red')
        const blueBase = roster.find((team) => team.id === 'blue')
        const isHome = isUserClub(fixture.homeTeamId)
        const isCup = Boolean(fixture.competition)
        const venue = fixture.stage === 'final' ? 'neutral' : isHome ? 'blue' : 'red'

        // 1. Kết quả (tính ngay, lưu ngay — hoạt cảnh chỉ phát lại).
        const sim = simulateQuickMatch({ bluePlayers: blueSide.players, redPlayers: redSide.players, venue })
        const { blueScore: goalsFor, redScore: goalsAgainst } = sim
        const homeGoals = isHome ? goalsFor : goalsAgainst
        const awayGoals = isHome ? goalsAgainst : goalsFor
        const userSkill = shootoutSkill(blueBase?.players || [])
        let nextLeague = isCup
            ? recordCupResult(league, fixture.id, homeGoals, awayGoals, userSkill)
            : recordUserFixtureResult(league, fixture.id, homeGoals, awayGoals)

        // 2. Tổng kết + thống kê cầu thủ cả mùa (trận giải).
        const summary = buildMatchSummary({
            stats: sim.stats,
            players: blueBase?.players || [],
            blueScore: goalsFor,
            redScore: goalsAgainst,
            goalEvents: sim.goalEvents,
            forfeit: null,
        })

        if (!isCup) {
            nextLeague = recordUserMatchStats(
                nextLeague,
                fixture.id,
                userMatchEntries({
                    stats: sim.stats,
                    bluePlayers: summary.ratings,
                    redPlayers: redSide.players,
                    opponentClubId,
                    blueScore: goalsFor,
                    redScore: goalsAgainst,
                }),
            )
        }

        // 3. Thể lực + XP cầu thủ ×0.7 (11 người đá chính đá đủ 90 phút).
        const fractions = Object.fromEntries((blueBase?.players || []).map((player) => [player.id, 1]))
        const rested = applyMatchCondition(squadOf(blueBase), fractions)
        const { players: progressed, reports } = applyMatchProgression(rested, summary.ratings, fractions, {
            goalsFor,
            goalsAgainst,
            motmId: summary.manOfTheMatch?.id || null,
            forfeit: null,
            xpFactor: SIM_REWARD_FACTOR,
        })
        const updatedById = new Map(progressed.map((player) => [player.id, player]))

        // 4. Thưởng ×0.7 (× độ khó, × hệ số cúp); dùng 1 lượt mô phỏng.
        const rewardFactor = difficulty.reward * SIM_REWARD_FACTOR * (isCup ? CUP_MATCH_FACTOR[fixture.competition] : 1)
        const rewarded = applyMatchToClub(club, {
            goalsFor,
            goalsAgainst,
            opponentStrength: opponent?.strength,
            rewardFactor,
        })
        let nextClub = spendSimulation(rewarded.club)
        let seasonReward = null
        let cupReward = null
        let cupInfo = null

        if (isCup) {
            cupInfo = describeUserCupResult(nextLeague, fixture.id)

            const prize = Math.round(
                (cupPrizeFor(cupInfo?.cupId, cupInfo?.stage, cupInfo?.outcome) * difficulty.reward * SIM_REWARD_FACTOR) / 100000,
            ) * 100000

            if (prize > 0) {
                const label = cupInfo.outcome === 'champion'
                    ? `${cupInfo.cupName} winners`
                    : `${cupInfo.cupName} · ${STAGE_LABELS[cupInfo.stage]} passed`
                const items = [epCard(prize, label)]

                if (cupInfo.outcome === 'champion') items.push(playerPack('premium', label), protectionCard(label))

                nextClub = { ...nextClub, inventory: [...(nextClub.inventory || []), ...items] }
                cupReward = { amount: prize, label, pack: cupInfo.outcome === 'champion' }
            }
        } else if (getSeasonProgress(nextLeague.fixtures).completed) {
            const position = getLeagueStandings(nextLeague.fixtures).findIndex((row) => isUserClub(row.teamId)) + 1
            const bonus = applySeasonBonus(nextClub, league.season || 2026, position, difficulty.reward, LEAGUE_BY_ID.get(league.leagueId)?.tier || 1)

            nextClub = bonus.club
            seasonReward = bonus.bonus
        }

        // 5. Ghi lại tất cả rồi phát hoạt cảnh.
        setLeague(nextLeague)
        setClub(nextClub)
        setRoster((current) =>
            current.map((team) =>
                team.id !== 'blue'
                    ? team
                    : {
                        ...team,
                        players: team.players.map((player) => updatedById.get(player.id) || player),
                        substitutes: (team.substitutes || []).map((player) => updatedById.get(player.id) || player),
                        reserves: (team.reserves || []).map((player) => updatedById.get(player.id) || player),
                    },
            ),
        )
        setActiveFixtureId(fixture.id)
        recordedFixtureRef.current = fixture.id
        setMatchStatus('idle')
        setMatchSummary({
            ...summary,
            cardEvents: sim.cardEvents,
            subEvents: [],
            shots: sim.stats.shots,
            progression: reports,
            clubReport: { ...rewarded.report, seasonReward, cupReward, budget: nextClub.budget, simulated: true },
            cupInfo,
            simulated: true,
        })
        setSimulation({
            label: fixtureLabel(fixture),
            result: sim,
            blue: { clubId: userClubId(), name: userTeam().name, color: blueSide.color },
            red: { clubId: opponentClubId, name: opponent?.name || 'OPPONENT', color: redSide.color },
        })
        setIsLeagueOpen(false)
        setIsClubOpen(false)
        setScreen('simulation')
    }

    const changeKit = (clubId, slot) => {
        if (!prematchFixture) return

        setKitChoice((current) => ({
            fixtureId: prematchFixture.id,
            slots: {
                ...(current.fixtureId === prematchFixture.id ? current.slots : prematchKits.slots),
                [clubId]: slot,
            },
        }))
    }

    // Phase 26D: người đá chính hiện chỉ số đã cộng team color.
    const selectedPlayerProfile = (() => {
        for (const team of matchRoster) {
            const starter = team.players.find((player) => player.id === selectedId)

            if (starter) return withTeamColor(starter, teamColorOf(team.players).bonus)

            const sub = (team.substitutes || []).find((player) => player.id === selectedId)

            if (sub) return sub
        }

        return undefined
    })()

    const inMatch = screen === 'match' && matchStatus !== 'fulltime' && matchStatus !== 'idle'

    return (
        <main className="app-shell">
            <TopBar
                screen={screen}
                inMatch={inMatch}
                season={league.season || 2026}
                record={blueRow ? { position: positionOf(userClubId()), points: blueRow.points } : null}
                onNavigate={navigate}
                cardsCount={(club.inventory || []).length}
                clubLevel={club.level || 0}
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
                    onOpenDevelopment={openDevelopment}
                    onNewSeason={createNewSeason}
                    onChangeClub={openChangeClub}
                    simsLeft={simsLeft}
                    onSimulate={() => runQuickSimulation(nextFixture)}
                />
            )}

            {screen === 'prematch' && (
                <PreMatchScreen
                    fixture={prematchFixture}
                    blueTeam={blueTeam}
                    opponentTeam={prematchRoster.find((team) => team.id === 'red')}
                    opponentInfo={prematchOpponent}
                    bluePosition={positionOf(userClubId())}
                    opponentPosition={prematchOpponent ? positionOf(prematchOpponent.id) : null}
                    tacticKey={tacticKey}
                    onTacticChange={changeTactic}
                    onFormationChange={changeFormation}
                    onEditLineup={openLineupEditor}
                    kits={prematchKits}
                    blueKitTeam={prematchRoster.find((team) => team.id === 'blue')}
                    onKitChange={changeKit}
                    difficulty={difficulty}
                    difficultyLocked={difficultyLocked}
                    onDifficultyChange={changeDifficulty}
                    simsLeft={simsLeft}
                    onSimulate={() => runQuickSimulation(prematchFixture)}
                    onKickOff={kickOff}
                    onBack={goHome}
                />
            )}

            {screen === 'simulation' && simulation && (
                <SimulationScreen
                    key={simulation.label + simulation.result.blueScore + simulation.result.redScore + simulation.red.clubId}
                    label={simulation.label}
                    blue={simulation.blue}
                    red={simulation.red}
                    result={simulation.result}
                    onDone={() => setScreen('postmatch')}
                />
            )}

            {screen === 'trophies' && (
                <TrophyRoomScreen world={world} league={league} onBack={goHome} quality={settings.graphics} />
            )}

            {newTrophies.length > 0 && screen !== 'match' && screen !== 'simulation' && (
                <NewTrophyPopup
                    key={newTrophies[0].id}
                    trophy={newTrophies[0]}
                    remaining={newTrophies.length - 1}
                    quality={settings.graphics}
                    onClose={() => setNewTrophies((queue) => queue.slice(1))}
                    onOpenRoom={() => {
                        setNewTrophies([])
                        openTrophies()
                    }}
                />
            )}

            {screen === 'development' && (
                <DevelopmentScreen
                    team={blueTeam}
                    onUpdatePlayer={updateBluePlayer}
                    onBack={goHome}
                />
            )}

            {screen === 'postmatch' && (
                <PostMatchScreen
                    summary={matchSummary}
                    opponentName={opponentTeam?.name || 'OPPONENT'}
                    opponentClubId={opponentTeam?.id}
                    fixture={activeFixture}
                    nextFixture={nextFixture}
                    nextOpponentName={nextOpponent?.name || 'OPPONENT'}
                    onHome={goHome}
                    onNext={() => openPrematch(nextFixture)}
                    onOpenLeague={() => setIsLeagueOpen(true)}
                    onNewSeason={createNewSeason}
                    onOpenDevelopment={openDevelopment}
                    onOpenCards={openCards}
                />
            )}

            {screen === 'cards' && (
                <CardsScreen
                    club={club}
                    onClubChange={setClub}
                    team={blueTeam}
                    onRosterChange={setRoster}
                    onOpenTransfers={(search) => {
                        setClubSearch(typeof search === 'string' ? search : '')
                        setIsClubOpen(true)
                    }}
                />
            )}

            {screen === 'match' && (
            <section className="content-grid">
            <div className="pitch-panel">
        <div className="game-canvas">
            <Suspense fallback={<div className="match-loading">LOADING STADIUM…</div>}>
                        <MatchCanvas
                            graphics={settings.graphics}
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
                            matchDuration={matchDuration}
                            whistlePending={whistlePending}
                            onWhistleDone={handleWhistleDone}
                            onAutoPilotChange={setAutoPilot}
                            isPlaying={isPlaying}
                            resetKey={resetKey}
                            onGoal={handleGoal}
                            onCard={handleCard}
                        />
            </Suspense>

            {settings.showFps && <FpsMeter />}

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
                        <span className="scoreboard-club"><ClubCrest clubId={userClubId()} size={16} />{userTeam().shortName}</span>
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
                        {addedLabel && <span className="added-time">{addedLabel}</span>}
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
                            {fixtureLabel(activeFixture)}
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
                        <span className="scoreboard-club">{opponentTeam?.shortName || 'OPP'}<ClubCrest clubId={opponentTeam?.id} size={16} /></span>
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
                    title={TACTICS[tacticKey]?.summary}
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

            {/* Bảng quản lý đội cũ (TeamManagementPanel) đã bỏ khỏi màn hình
                trận: nó che sân và chặn click. Thay người dùng nút SUBS,
                đổi sơ đồ ở màn nghỉ giữa hiệp / trước trận. */}

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

                {(matchStatus === 'playing' || matchStatus === 'goal') && (
                    <button
                        onClick={() => setIsLiveStatsOpen((open) => !open)}
                        style={{
                            ...matchButtonStyle,
                            ...(isLiveStatsOpen ? { background: '#b9ed70', color: '#0d1f16' } : {}),
                        }}
                        aria-pressed={isLiveStatsOpen}
                    >
                        STATS
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
                    onClick={openControls}
                    style={matchButtonStyle}
                    title="Key guide and player-name display"
                >
                    CONTROLS
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

            {/* Phase 22: hướng dẫn phím + chế độ tên cầu thủ (dừng trận). */}
            {isControlsOpen && (
                <ControlsPanel
                    labelMode={labelMode}
                    onLabelModeChange={changeLabelMode}
                    onClose={closeControls}
                />
            )}

            {/* Phase 21: thống kê trực tiếp (không dừng trận). */}
            {isLiveStatsOpen && (matchStatus === 'playing' || matchStatus === 'goal') && (
                <LiveStatsPanel
                    statsRef={statsRef}
                    opponentName={opponentTeam?.shortName || 'OPP'}
                    onClose={() => setIsLiveStatsOpen(false)}
                />
            )}

            {/* LEAGUE MANAGEMENT */}
            {/* GOAL / PAUSE / HALF TIME / FULL TIME */}
            {matchStatus === 'goal' && (
                <StatusOverlay title="GOAL!" subtitle={goalMessage} />
            )}

            {matchStatus === 'paused' && !isControlsOpen && (
                <StatusOverlay
                    title="PAUSED"
                    subtitle="Press RESUME to continue"
                    extra={
                        <PausedStats statsRef={statsRef} opponentName={opponentTeam?.shortName || 'OPP'} />
                    }
                >
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
                    opponentClubId={opponentTeam?.id}
                    blueScore={blueScore}
                    redScore={redScore}
                    events={matchEvents}
                    statsSource={liveStatSource(statsRef.current?.stats)}
                    opponentShortName={opponentTeam?.shortName || 'OPP'}
                    tacticKey={tacticKey}
                    onTacticChange={changeTactic}
                    opponentTacticKey={statsRef.current?.aiTacticKey}
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
                    opponentClubId={opponentTeam?.id}
                    blueScore={blueScore}
                    redScore={redScore}
                    events={matchEvents}
                    statsSource={forfeit ? null : liveStatSource(statsRef.current?.stats)}
                    opponentShortName={opponentTeam?.shortName || 'OPP'}
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


            <div className="action-indicator">
                {actionMessage}
            </div>

            {autoPilot && matchStatus === 'playing' && (
                <div className="autopilot-badge" role="status">
                    <b>AUTO PLAY</b>
                    <span>The AI is playing for you · press any key to take control</span>
                </div>
            )}
        </div>
            </div>

            <MatchSidePanel selectedPlayer={selectedPlayerProfile} statsRef={statsRef} />
            </section>
            )}

            {/* Các bảng dùng chung cho mọi màn hình */}
            {isLeagueOpen && (
                <LeagueManagementPanel
                    league={league}
                    world={world}
                    difficultyLocked={difficultyLocked}
                    onDifficultyChange={changeDifficulty}
                    onClose={() => setIsLeagueOpen(false)}
                    onStartFixture={openPrematch}
                    onNewSeason={createNewSeason}
                />
            )}

            {isClubOpen && screen !== 'match' && (
                <div className="modal-host">
                    <ClubManagementPanel
                        roster={roster}
                        world={world}
                        onRosterChange={setRoster}
                        club={club}
                        onClubChange={setClub}
                        initialSearch={clubSearch}
                        isOpen
                        hideTrigger
                        onOpenChange={(open) => {
                            setIsClubOpen(open)
                            if (!open) setClubSearch('')
                        }}
                    />
                </div>
            )}

            {/* Phase 26B: chọn / đổi CLB */}
            {clubPicker && (
                <ClubPicker
                    mode={clubPicker.mode}
                    world={world}
                    currentClubId={userClubId()}
                    roundsPlayed={getSeasonProgress(league.fixtures).userPlayed}
                    onConfirm={confirmClub}
                    onCancel={() => setClubPicker(null)}
                />
            )}

            {isSubsOpen && (
                <div className="modal-host">
                    <SubstitutionBoard
                        team={blueTeam}
                        isPrematch={lineupMode === 'prematch'}
                        staminaById={lineupMode === 'prematch' ? null : statsRef.current?.stamina}
                        substitutionCount={lineupMode === 'prematch' ? 0 : substitutionCount}
                        maxSubstitutions={MAX_SUBSTITUTIONS}
                        subbedOffIds={lineupMode === 'prematch' ? [] : subbedOffIds}
                        onSubstitute={(outId, inId) =>
                            substitutePlayer(outId, inId, { prematch: lineupMode === 'prematch' })
                        }
                        onSwap={swapStarters}
                        onMoveSquad={moveSquadPlayer}
                        benchLimit={SQUAD_LIMITS.bench}
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
