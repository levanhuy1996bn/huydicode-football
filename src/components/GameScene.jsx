
import ClubManagementPanel from './ClubManagementPanel'
import LeagueManagementPanel from './LeagueManagementPanel'
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
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import {
    Physics,
    RigidBody,
    BallCollider,
    CuboidCollider,
} from '@react-three/rapier'
import * as THREE from 'three'

import { useKeyboard } from '../hooks/useKeyboard'
import { FORMATIONS, TEAMS } from '../data/teams'
import TeamManagementPanel from './TeamManagementPanel'
import Pitch from './Pitch'
import Player from './Player'

const FIELD = {
    minX: -33.4,
    maxX: 33.4,
    minZ: -51.9,
    maxZ: 51.9,
    playerRadius: 0.55,
    goalHalfWidth: 3.66,
    // Vạch biên thật của sân (105 x 68) và bán kính bóng.
    lineX: 34,
    lineZ: 52.5,
    ballRadius: 0.35,
}

const UP_AXIS = new THREE.Vector3(0, 1, 0)

// Đội RED gốc có strength 79 trong LEAGUE_TEAMS; dùng làm mốc để
// quy đổi chỉ số khi đối thủ trong giải là đội khác.
const RED_BASE_STRENGTH = 79

const OPPONENT_COLORS = [
    // Tránh xanh lá (trùng màu cỏ) và xanh dương (trùng BLUE FC).
    '#ed4545', '#f28c28', '#8e44ad', '#f1c40f', '#e84393',
    '#f5f5f5', '#c0392b', '#d35400', '#7f8c8d', '#b33771',
    '#1e1e1e', '#ff6f61',
]

function getOpponentColor(teamId) {
    if (teamId === 'red') return '#ed4545'
    let hash = 0
    for (const char of String(teamId)) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    }
    return OPPONENT_COLORS[hash % OPPONENT_COLORS.length]
}

// Đội hình RED trong trận 3D được "đóng vai" đối thủ thật của vòng đấu:
// đổi tên, màu áo và quy đổi chỉ số theo strength của đội đó.
function buildMatchRoster(roster, opponent) {
    if (!opponent || opponent.id === 'red') return roster

    const delta = (opponent.strength ?? RED_BASE_STRENGTH) - RED_BASE_STRENGTH
    const statKeys = [
        'overall', 'pace', 'shooting', 'passing',
        'dribbling', 'defending', 'physical',
    ]

    const mapPlayer = (player) => {
        const next = { ...player }

        statKeys.forEach((key) => {
            if (typeof next[key] === 'number') {
                next[key] = Math.round(clamp(next[key] + delta, 1, 99))
            }
        })

        if (/^Red /.test(next.name || '')) {
            next.name = `${opponent.shortName} ${next.position} ${next.number}`
        }

        return next
    }

    return roster.map((team) => {
        if (team.id !== 'red') return team

        return {
            ...team,
            name: opponent.name,
            shortName: opponent.shortName,
            color: getOpponentColor(opponent.id),
            players: team.players.map(mapPlayer),
            substitutes: (team.substitutes || []).map(mapPlayer),
        }
    })
}

const MATCH_DURATION = 360
const MAX_SUBSTITUTIONS = 5
const ROSTER_STORAGE_KEY = 'ultimate-football-roster-save-v1'

const TACTICS = {
    balanced: {
        label: 'Balanced',
        attack: 0.48,
        press: 0.52,
        defensiveLine: 0.5,
        width: 1,
        speed: 1,
    },
    attacking: {
        label: 'Attacking',
        attack: 0.9,
        press: 0.58,
        defensiveLine: 0.72,
        width: 1.08,
        speed: 1.04,
    },
    defensive: {
        label: 'Defensive',
        attack: 0.22,
        press: 0.28,
        defensiveLine: 0.2,
        width: 0.86,
        speed: 0.96,
    },
    highPress: {
        label: 'High Press',
        attack: 0.58,
        press: 1,
        defensiveLine: 0.88,
        width: 1.04,
        speed: 1.08,
    },
    counter: {
        label: 'Counter Attack',
        attack: 0.78,
        press: 0.42,
        defensiveLine: 0.28,
        width: 1.12,
        speed: 1.12,
    },
}

const clamp = (value, min, max) =>
    THREE.MathUtils.clamp(value, min, max)

const distance2D = (a, b) =>
    Math.hypot(a.x - b.x, a.z - b.z)

function createInitialRoster() {
    return TEAMS.map((team) => ({
        ...team,
        players: [...team.players],
        substitutes: [...team.substitutes],
    }))
}

function loadSavedRoster() {
    if (typeof window === 'undefined') {
        return createInitialRoster()
    }

    try {
        const saved = localStorage.getItem(ROSTER_STORAGE_KEY)

        if (!saved) {
            return createInitialRoster()
        }

        const parsed = JSON.parse(saved)

        if (!Array.isArray(parsed)) {
            return createInitialRoster()
        }

        return TEAMS.map((defaultTeam) => {
            const savedTeam = parsed.find(
                (team) => team.id === defaultTeam.id,
            )

            if (!savedTeam) {
                return {
                    ...defaultTeam,
                    players: [...defaultTeam.players],
                    substitutes: [...defaultTeam.substitutes],
                }
            }

            return {
                ...defaultTeam,
                ...savedTeam,
                players: Array.isArray(savedTeam.players)
                    ? savedTeam.players
                    : [...defaultTeam.players],
                substitutes: Array.isArray(savedTeam.substitutes)
                    ? savedTeam.substitutes
                    : [...defaultTeam.substitutes],
            }
        })
    } catch (error) {
        console.error('Unable to load saved roster:', error)
        return createInitialRoster()
    }
}

function getRole(player) {
    const position = String(player.position || '').toUpperCase()

    if (position === 'GK' || position.includes('GOALKEEPER')) {
        return 'GK'
    }

    if (
        ['ST', 'FW', 'LW', 'RW', 'CF'].includes(position) ||
        position.includes('WING') ||
        position.includes('FORWARD')
    ) {
        return 'FW'
    }

    if (
        ['CM', 'CDM', 'CAM', 'AM', 'MF', 'LM', 'RM'].includes(position) ||
        position.includes('MID')
    ) {
        return 'MF'
    }

    if (
        ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(position) ||
        position.includes('BACK')
    ) {
        return 'DF'
    }

    if (player.number === 1) return 'GK'
    if ([2, 3, 4, 5].includes(player.number)) return 'DF'
    if ([6, 8, 10].includes(player.number)) return 'MF'

    return 'FW'
}

function getPositionGroup(position) {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'

    if (
        ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(value)
    ) {
        return 'DF'
    }

    if (
        ['CM', 'CDM', 'CAM', 'AM', 'MF', 'LM', 'RM'].includes(value)
    ) {
        return 'MF'
    }

    return 'FW'
}

function FixedCamera({ ballRef }) {
    const { camera, size } = useThree()
    const target = useRef(new THREE.Vector3(0, 0, 0))
    const initialized = useRef(false)

    useEffect(() => {
        camera.fov = 38
        camera.near = 0.1
        camera.far = 250
        camera.updateProjectionMatrix()
        initialized.current = false
    }, [camera, size.width, size.height])

    useFrame((_, delta) => {
        const ballPosition = ballRef.current?.translation()

        const targetX = clamp(
            (ballPosition?.x || 0) * 0.62,
            -19,
            19,
        )

        const targetZ = clamp(
            (ballPosition?.z || 0) * 0.72,
            -37,
            37,
        )

        const desiredTarget = new THREE.Vector3(
            targetX,
            0,
            targetZ,
        )

        if (!initialized.current) {
            target.current.copy(desiredTarget)
            initialized.current = true
        }

        const smoothing = 1 - Math.exp(-2.4 * delta)

        target.current.lerp(desiredTarget, smoothing)

        const cameraTarget = target.current

        camera.position.lerp(
            new THREE.Vector3(
                cameraTarget.x + 72,
                cameraTarget.y + 34,
                cameraTarget.z,
            ),
            smoothing,
        )

        camera.lookAt(cameraTarget)
    })

    return null
}

function Ball({ bodyRef }) {
    return (
        <RigidBody
            ref={bodyRef}
            colliders={false}
            position={[0, 0.35, 0]}
            friction={0.72}
            restitution={0.38}
            linearDamping={0.25}
            angularDamping={0.5}
            ccd
        >
            <BallCollider args={[0.35]} />

            <mesh castShadow>
                <sphereGeometry args={[0.35, 32, 32]} />
                <meshStandardMaterial
                    color="#f8f8f3"
                    roughness={0.42}
                />
            </mesh>
        </RigidBody>
    )
}

function GroundCollider() {
    return (
        <RigidBody type="fixed" colliders={false}>
            <CuboidCollider
                args={[42, 0.1, 60]}
                position={[0, -0.18, 0]}
            />
        </RigidBody>
    )
}


function PassTargetMarker({ targetRef }) {
    const markerRef = useRef(null)

    useFrame(() => {
        if (!markerRef.current) return

        const target = targetRef.current

        markerRef.current.visible = Boolean(target)

        if (!target) return

        markerRef.current.position.set(
            target.targetX,
            0.08,
            target.targetZ,
        )
    })

    return (
        <mesh
            ref={markerRef}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
        >
            <ringGeometry args={[0.65, 0.9, 32]} />
            <meshBasicMaterial
                color="#39ff88"
                transparent
                opacity={0.85}
                depthWrite={false}
            />
        </mesh>
    )
}


function MatchWorld({
                        roster,
                        selectedId,
                        onSelect,
                        onActionMessage,
                        tacticKey,
                        isPlaying,
                        resetKey,
                        onGoal,
                    }) {
    const keys = useKeyboard()

    const ballRef = useRef(null)
    const playerRefs = useRef({})
    const previousRosterRef = useRef(roster)
    const lastPlayerPositions = useRef({})
    const playerVelocities = useRef({})
    const pendingPassRef = useRef(null)
    const dribbleState = useRef({
        x: 0,
        z: 0,
        sprinting: false,
        phase: 0,
    })

    const possession = useRef('blue-9')
    const lastTouchTeam = useRef('blue')

    const tackleCooldown = useRef(0)
    const slideDuration = useRef(0)
    const aiAttemptCooldown = useRef(0)
    const aiDecisionCooldown = useRef(0)
    const goalCooldown = useRef(0)
    const resetKeyRef = useRef(resetKey)
    const matchEndedRef = useRef(false)

    const tactic = TACTICS[tacticKey] || TACTICS.balanced

    const opponentName =
        roster.find((team) => team.id === 'red')?.name || 'RED UNITED'

    // Mỗi lần sút/chuyền tăng kickId để thủ môn chỉ "phán quyết" 1 lần/cú.
    const kickIdRef = useRef(0)
    const keeperResolvedKick = useRef({ blue: -1, red: -1 })
    // Cầu thủ vừa bị xoạc mất bóng không được nhặt lại ngay.
    const pickupLockRef = useRef({ playerId: null, time: 0 })

    const players = useMemo(
        () =>
            roster.flatMap((team) =>
                team.players.map((player) => ({
                    ...player,
                    teamId: team.id,
                    role: getRole(player),
                })),
            ),
        [roster],
    )

    const bluePlayers = useMemo(
        () => players.filter((player) => player.teamId === 'blue'),
        [players],
    )

    const redPlayers = useMemo(
        () => players.filter((player) => player.teamId === 'red'),
        [players],
    )

    const getPlayerById = (playerId) =>
        players.find((player) => player.id === playerId)

    const registerPlayer = useCallback((id, object) => {
        if (object) {
            playerRefs.current[id] = object
        } else {
            delete playerRefs.current[id]
        }
    }, [])

    const selectedPlayer = () => playerRefs.current[selectedId]

    const clampPlayer = (object) => {
        object.position.x = clamp(
            object.position.x,
            FIELD.minX,
            FIELD.maxX,
        )

        object.position.z = clamp(
            object.position.z,
            FIELD.minZ,
            FIELD.maxZ,
        )
    }

    const getBallDistance = (player) => {
        if (!ballRef.current || !player) return Infinity

        const ballPosition = ballRef.current.translation()

        return Math.hypot(
            ballPosition.x - player.position.x,
            ballPosition.z - player.position.z,
        )
    }

    const attachBallToPlayer = (player, playerId) => {
        if (!ballRef.current || !player) return

        const playerItem = getPlayerById(playerId)

        const direction = new THREE.Vector3(0, 0, 1)
            .applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                player.rotation.y,
            )

        ballRef.current.setTranslation(
            {
                x: player.position.x + direction.x * 0.85,
                y: 0.39,
                z: player.position.z + direction.z * 0.85,
            },
            true,
        )

        ballRef.current.setLinvel(
            { x: 0, y: 0, z: 0 },
            true,
        )

        ballRef.current.setAngvel(
            { x: 0, y: 0, z: 0 },
            true,
        )

        possession.current = playerId
        pendingPassRef.current = null

        if (playerItem) {
            lastTouchTeam.current = playerItem.teamId
        }
    }

    // Đồng bộ vị trí và quyền kiểm soát sau khi đổi sơ đồ hoặc thay người.
    useEffect(() => {
        const previousRoster = previousRosterRef.current

        const previousBlue = previousRoster.find(
            (team) => team.id === 'blue',
        )

        const currentBlue = roster.find(
            (team) => team.id === 'blue',
        )

        if (!previousBlue || !currentBlue) {
            previousRosterRef.current = roster
            return
        }

        const previousIds = new Set(
            previousBlue.players.map((player) => player.id),
        )

        const currentIds = new Set(
            currentBlue.players.map((player) => player.id),
        )

        const outgoing = previousBlue.players.find(
            (player) => !currentIds.has(player.id),
        )

        const incoming = currentBlue.players.find(
            (player) => !previousIds.has(player.id),
        )

        const formationChanged =
            previousBlue.formationKey !== currentBlue.formationKey

        if (formationChanged) {
            currentBlue.players.forEach((item) => {
                const object = playerRefs.current[item.id]

                if (!object) return

                object.position.set(
                    item.x ?? 0,
                    0,
                    item.z ?? 0,
                )

                object.rotation.y = Math.PI
            })
        }

        if (outgoing && incoming) {
            const incomingObject = playerRefs.current[incoming.id]

            const lastPosition =
                lastPlayerPositions.current[outgoing.id] || {
                    x: outgoing.x ?? 0,
                    z: outgoing.z ?? 0,
                }

            if (incomingObject) {
                incomingObject.position.set(
                    lastPosition.x,
                    0,
                    lastPosition.z,
                )

                incomingObject.rotation.y = Math.PI
            }

            if (possession.current === outgoing.id) {
                if (incomingObject) {
                    attachBallToPlayer(
                        incomingObject,
                        incoming.id,
                    )
                } else {
                    possession.current = null
                }
            }

            if (selectedId === outgoing.id) {
                onSelect(incoming.id)
            }

            delete lastPlayerPositions.current[outgoing.id]
        }

        previousRosterRef.current = roster
    }, [roster, selectedId, onSelect])

    const resetPositions = (kickoffTeam = 'blue') => {
        players.forEach((item) => {
            const object = playerRefs.current[item.id]

            if (!object) return

            object.position.set(
                item.x ?? 0,
                0,
                item.z ?? 0,
            )

            object.rotation.y =
                item.teamId === 'blue' ? Math.PI : 0
        })

        // Tự chọn cầu thủ tấn công gần giữa sân, không phụ thuộc ID cố định.
        const kickoffCandidates = players
            .filter(
                (item) =>
                    item.teamId === kickoffTeam &&
                    item.role !== 'GK',
            )
            .sort(
                (a, b) =>
                    Math.abs(a.z ?? 0) - Math.abs(b.z ?? 0),
            )

        const kickoffPlayerItem =
            kickoffCandidates[0] ||
            players.find((item) => item.teamId === kickoffTeam)

        const kickoffId = kickoffPlayerItem?.id
        const kickoffPlayer = kickoffId
            ? playerRefs.current[kickoffId]
            : null

        if (kickoffPlayer) {
            kickoffPlayer.position.set(
                0,
                0,
                kickoffTeam === 'blue' ? 1.2 : -1.2,
            )

            kickoffPlayer.rotation.y =
                kickoffTeam === 'blue' ? Math.PI : 0
        }

        if (ballRef.current) {
            ballRef.current.setTranslation(
                { x: 0, y: 0.39, z: 0 },
                true,
            )

            ballRef.current.setLinvel(
                { x: 0, y: 0, z: 0 },
                true,
            )

            ballRef.current.setAngvel(
                { x: 0, y: 0, z: 0 },
                true,
            )
        }

        possession.current = kickoffPlayer ? kickoffId : null
        lastTouchTeam.current = kickoffTeam

        tackleCooldown.current = 0
        slideDuration.current = 0
        aiAttemptCooldown.current = 0
        aiDecisionCooldown.current = 1
    }

    const restartAtSpot = (teamId, restartType, x, z) => {
        players.forEach((item) => {
            const object = playerRefs.current[item.id]

            if (!object) return

            object.position.set(
                item.x ?? 0,
                0,
                item.z ?? 0,
            )

            object.rotation.y =
                item.teamId === 'blue' ? Math.PI : 0
        })

        const teamList =
            teamId === 'blue' ? bluePlayers : redPlayers

        let kicker = null

        if (restartType === 'goal-kick') {
            kicker = teamList.find((item) => item.role === 'GK')
        }

        if (!kicker) {
            kicker = teamList
                .filter((item) => item.role !== 'GK')
                .map((item) => ({
                    item,
                    object: playerRefs.current[item.id],
                }))
                .filter((entry) => entry.object)
                .sort((a, b) => {
                    const distanceA = Math.hypot(
                        a.object.position.x - x,
                        a.object.position.z - z,
                    )

                    const distanceB = Math.hypot(
                        b.object.position.x - x,
                        b.object.position.z - z,
                    )

                    return distanceA - distanceB
                })[0]?.item
        }

        if (!kicker) return

        const kickerObject = playerRefs.current[kicker.id]

        if (!kickerObject) return

        let playerX = x
        let playerZ = z
        let rotation = 0

        if (restartType === 'throw-in') {
            playerX = x > 0
                ? FIELD.maxX - 1.15
                : FIELD.minX + 1.15

            playerZ = clamp(
                z,
                FIELD.minZ + 2,
                FIELD.maxZ - 2,
            )

            rotation = x > 0 ? -Math.PI / 2 : Math.PI / 2
        } else if (restartType === 'corner') {
            playerX = clamp(
                x,
                FIELD.minX + 1,
                FIELD.maxX - 1,
            )

            playerZ = clamp(
                z,
                FIELD.minZ + 1,
                FIELD.maxZ - 1,
            )

            rotation = z < 0 ? 0 : Math.PI
        } else if (restartType === 'goal-kick') {
            playerX = clamp(x, -5, 5)
            playerZ = teamId === 'blue' ? 47.5 : -47.5
            rotation = teamId === 'blue' ? Math.PI : 0
        }

        kickerObject.position.set(playerX, 0, playerZ)
        kickerObject.rotation.y = rotation

        const ballDirection = new THREE.Vector3(0, 0, 1)
            .applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                rotation,
            )

        if (ballRef.current) {
            ballRef.current.setTranslation(
                {
                    x: playerX + ballDirection.x * 0.85,
                    y: 0.39,
                    z: playerZ + ballDirection.z * 0.85,
                },
                true,
            )

            ballRef.current.setLinvel(
                { x: 0, y: 0, z: 0 },
                true,
            )

            ballRef.current.setAngvel(
                { x: 0, y: 0, z: 0 },
                true,
            )
        }

        possession.current = kicker.id
        lastTouchTeam.current = teamId

        if (teamId === 'blue') {
            onSelect(kicker.id)
        }

        tackleCooldown.current = 0
        slideDuration.current = 0
        aiAttemptCooldown.current = 0
        aiDecisionCooldown.current = 1.5
        goalCooldown.current = 2

        if (restartType === 'throw-in') {
            onActionMessage(
                teamId === 'blue'
                    ? 'BLUE FC THROW-IN'
                    : `${opponentName} THROW-IN`,
            )
        } else if (restartType === 'corner') {
            onActionMessage(
                teamId === 'blue'
                    ? 'BLUE FC CORNER KICK'
                    : `${opponentName} CORNER KICK`,
            )
        } else {
            onActionMessage(
                teamId === 'blue'
                    ? 'BLUE GOAL KICK'
                    : `${opponentName} GOAL KICK`,
            )
        }
    }

    useEffect(() => {
        if (resetKeyRef.current === resetKey) return

        resetKeyRef.current = resetKey
        matchEndedRef.current = false
        goalCooldown.current = 1

        pendingPassRef.current = null

        resetPositions('blue')

        onActionMessage('MATCH RESTARTED')
    }, [resetKey])


    const findPassTarget = (playerId, action) => {
        const player = playerRefs.current[playerId]
        const item = getPlayerById(playerId)

        if (!player || !item) return null

        const teamList = item.teamId === 'blue' ? bluePlayers : redPlayers
        const opponents = item.teamId === 'blue' ? redPlayers : bluePlayers
        const attackDirection = item.teamId === 'blue' ? -1 : 1

        const candidates = teamList
            .filter((teammate) => teammate.id !== playerId)
            .map((teammate) => ({
                item: teammate,
                object: playerRefs.current[teammate.id],
            }))
            .filter((entry) => entry.object)
            .map((entry) => {
                const teammate = entry.object
                const velocity = playerVelocities.current[entry.item.id] || {
                    x: 0,
                    z: 0,
                }

                const dx = teammate.position.x - player.position.x
                const dz = teammate.position.z - player.position.z
                const currentDistance = Math.hypot(dx, dz)

                const leadTime =
                    action === 'through'
                        ? clamp(currentDistance / 10, 0.4, 1.15)
                        : action === 'lob'
                            ? clamp(currentDistance / 10, 0.4, 0.9)
                            : clamp(currentDistance / 12, 0.2, 0.6)

                let targetX = teammate.position.x + velocity.x * leadTime
                let targetZ = teammate.position.z + velocity.z * leadTime

                // Chọc khe phải hướng vào khoảng trống phía trước.
                if (action === 'through') {
                    targetZ += attackDirection * clamp(
                        1.5 + currentDistance * 0.1,
                        2,
                        4,
                    )
                }

                targetX = clamp(targetX, FIELD.minX + 1, FIELD.maxX - 1)
                targetZ = clamp(targetZ, FIELD.minZ + 1, FIELD.maxZ - 1)

                const distance = Math.hypot(
                    targetX - player.position.x,
                    targetZ - player.position.z,
                )

                const forwardGap =
                    (targetZ - player.position.z) * attackDirection

                let score = distance

                // Ưu tiên khoảng cách chuyền hợp lý.
                if (action === 'pass') {
                    if (distance < 4) score += (4 - distance) * 3
                    if (distance > 17) score += (distance - 17) * 2

                    if (forwardGap < -2) {
                        score += Math.abs(forwardGap) * 2.5
                    }

                    if (forwardGap > 0) {
                        score -= Math.min(forwardGap, 8) * 0.45
                    }
                }

                if (action === 'through') {
                    if (forwardGap < 3) {
                        score += (3 - forwardGap) * 5
                    }

                    if (distance < 7) score += (7 - distance) * 2
                    if (distance > 23) score += (distance - 23) * 2

                    score -= clamp(forwardGap, 0, 16) * 0.8
                }

                if (action === 'lob') {
                    if (forwardGap < 1) score += (1 - forwardGap) * 3
                    if (distance < 7) score += (7 - distance) * 1.5
                    if (distance > 25) score += (distance - 25) * 1.5
                }

                let nearestOpponent = Infinity
                let blockedLane = 0

                opponents.forEach((opponent) => {
                    const opponentObject = playerRefs.current[opponent.id]
                    if (!opponentObject) return

                    const opponentDistance = Math.hypot(
                        opponentObject.position.x - targetX,
                        opponentObject.position.z - targetZ,
                    )

                    nearestOpponent = Math.min(
                        nearestOpponent,
                        opponentDistance,
                    )

                    // Khoảng cách từ đối phương đến đường chuyền.
                    const lineX = targetX - player.position.x
                    const lineZ = targetZ - player.position.z
                    const lengthSq = lineX * lineX + lineZ * lineZ

                    if (lengthSq < 0.001) return

                    const projection = clamp(
                        (
                            (opponentObject.position.x - player.position.x) * lineX +
                            (opponentObject.position.z - player.position.z) * lineZ
                        ) / lengthSq,
                        0,
                        1,
                    )

                    const closestX = player.position.x + lineX * projection
                    const closestZ = player.position.z + lineZ * projection

                    const laneDistance = Math.hypot(
                        opponentObject.position.x - closestX,
                        opponentObject.position.z - closestZ,
                    )

                    if (projection > 0.08 && projection < 0.92) {
                        if (laneDistance < 1.8) {
                            blockedLane += 1
                        } else if (laneDistance < 3.2) {
                            blockedLane += 0.5
                        }
                    }
                })

                // Tránh chuyền cho người đang bị áp sát.
                if (nearestOpponent < 2.5) {
                    score += (2.5 - nearestOpponent) * 5
                } else if (nearestOpponent > 6) {
                    score -= 1.5
                }

                // Tránh đường chuyền bị đối phương chắn.
                score += blockedLane * (action === 'lob' ? 3 : 9)

                return {
                    ...entry,
                    distance,
                    targetPosition: {
                        x: targetX,
                        z: targetZ,
                    },
                    score,
                }
            })
            .sort((a, b) => a.score - b.score)

        return candidates[0] || null
    }

    const kickFromPlayer = (playerId, action, isAI = false) => {
        const player = playerRefs.current[playerId]
        const item = getPlayerById(playerId)

        if (!player || !item || !ballRef.current) return

        if (
            possession.current &&
            possession.current !== playerId
        ) {
            return
        }

        const attackDirection =
            item.teamId === 'blue' ? -1 : 1

        let direction = new THREE.Vector3(
            0,
            0,
            attackDirection,
        )

        let power = 8
        let lift = 0.22
        let message = 'SHORT PASS'
        let passTarget = null

        if (
            action === 'pass' ||
            action === 'through' ||
            action === 'lob'
        ) {
            passTarget = findPassTarget(playerId, action)

            if (!passTarget && item.role !== 'GK') {
                if (!isAI) {
                    onActionMessage('NO AVAILABLE PASS TARGET')
                }

                return
            }

            if (passTarget) {
                const targetPosition = passTarget.targetPosition

                const dx = targetPosition.x - player.position.x
                const dz = targetPosition.z - player.position.z

                direction.set(dx, 0, dz).normalize()
            }

            const distance = passTarget?.distance || 10

            if (!passTarget && item.role === 'GK') {
                // Không có đồng đội phù hợp: thủ môn phá bóng lên phía trước.
                direction.set(0, 0, attackDirection)

                power = 18
                lift = 3.8
                message = 'GOALKEEPER CLEARANCE'
            } else if (action === 'pass') {
                power = clamp(11 + distance * 0.28, 12, 17)
                lift = 0.02
                message = item.role === 'GK'
                    ? 'GOALKEEPER PASS'
                    : 'SHORT PASS'
            } else if (action === 'through') {
                power = clamp(14 + distance * 0.25, 15, 20)
                lift = 0.08
                message = 'THROUGH BALL'
            } else if (action === 'lob') {
                power = clamp(11 + distance * 0.20, 12, 16)
                lift = 4.5
                message = 'LOFTED PASS'
            }
        } else if (action === 'shoot') {
            const goalZ = attackDirection === -1 ? -52.5 : 52.5

            const distanceToGoal = Math.abs(
                goalZ - player.position.z,
            )

            // Chỉ số dứt điểm ảnh hưởng độ chính xác.
            const finishing = clamp(
                item.finishing || item.shooting || item.overall || 70,
                40,
                99,
            )

            // Cầu thủ dứt điểm tốt có độ lệch nhỏ hơn.
            const accuracy = (finishing - 40) / 59
            const spread = 5 - accuracy * 3

            const targetX =
                (Math.random() * 2 - 1) * spread

            direction.set(
                targetX - player.position.x,
                0,
                goalZ - player.position.z,
            ).normalize()

            // Vận tốc thật (m/s): cú sút 22–29 m/s, sút xa bổng hơn một chút.
            power = clamp(
                19 + finishing * 0.08 + (distanceToGoal > 20 ? 1.5 : 0),
                22,
                29,
            )

            lift = clamp(1.2 + distanceToGoal * 0.06, 1.2, 3.2)
            message = 'SHOT!'
        }

        const ball = ballRef.current

        ball.setTranslation(
            {
                x: player.position.x + direction.x * 0.95,
                y: 0.48,
                z: player.position.z + direction.z * 0.95,
            },
            true,
        )

        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.setAngvel({ x: 0, y: 0, z: 0 }, true)

        // Trước đây cú sút dùng applyImpulse lên quả bóng ~0.18kg nên vận tốc
        // thực tế lên tới 60–80 m/s. Giờ mọi cú đá đều đặt vận tốc trực tiếp.
        ball.setLinvel({
            x: direction.x * power,
            y: lift,
            z: direction.z * power,
        }, true)

        kickIdRef.current += 1
        possession.current = null
        lastTouchTeam.current = item.teamId

        // Ghi nhớ đồng đội đang được chuyền bóng tới.
        if (passTarget) {
            pendingPassRef.current = {
                receiverId: passTarget.item.id,
                targetX: passTarget.targetPosition.x,
                targetZ: passTarget.targetPosition.z,
                action,
                elapsed: 0,
            }
        } else {
            pendingPassRef.current = null
        }

        if (!isAI) {
            onActionMessage(message)
        }
    }

    const kickBall = useCallback(
        (action) => {
            const currentOwnerId = possession.current

            const currentOwnerItem = currentOwnerId
                ? getPlayerById(currentOwnerId)
                : null

            // BLUE đang giữ bóng: thực hiện hành động bằng người giữ bóng.
            if (currentOwnerItem?.teamId === 'blue') {
                onSelect(currentOwnerId)

                kickFromPlayer(
                    currentOwnerId,
                    action,
                    false,
                )

                return
            }

            // Không cho BLUE chuyền hoặc sút khi RED đang giữ bóng.
            if (currentOwnerItem?.teamId === 'red') {
                onActionMessage('OPPONENT HAS POSSESSION')
                return
            }

            // Trường hợp bóng tự do: cầu thủ được chọn phải ở gần bóng.
            const player = selectedPlayer()

            if (!player) return

            if (getBallDistance(player) > 2.2) {
                onActionMessage('GET CLOSER TO THE BALL')
                return
            }

            kickFromPlayer(selectedId, action, false)
        },
        [selectedId, onSelect, onActionMessage, kickFromPlayer],
    )

    const performTackle = useCallback(
        (type) => {
            if (tackleCooldown.current > 0) return

            const player = selectedPlayer()

            if (!player) return

            const isSlide = type === 'slide'
            const range = isSlide ? 3.2 : 2

            const tacklerItem = getPlayerById(selectedId)
            const ownerId = possession.current
            const ownerItem = ownerId ? getPlayerById(ownerId) : null
            const ownerObject = ownerId ? playerRefs.current[ownerId] : null
            const ballDistance = getBallDistance(player)

            if (ownerItem?.teamId === 'blue') {
                onActionMessage('YOUR TEAM HAS THE BALL')
                return
            }

            // Chỉ tranh được với người ĐANG GIỮ BÓNG, hoặc bóng tự do trong tầm.
            // (Trước đây chỉ cần đứng gần một cầu thủ đỏ bất kỳ là cướp được
            // bóng ở bất cứ đâu trên sân.)
            const opponentHasBall = Boolean(ownerItem && ownerObject)
            const ownerDistance = opponentHasBall
                ? distance2D(player.position, ownerObject.position)
                : Infinity
            const looseBallInRange = !ownerId && ballDistance <= range

            if (
                !(opponentHasBall && ownerDistance <= range) &&
                !looseBallInRange
            ) {
                onActionMessage('NO OPPONENT IN TACKLE RANGE')
                return
            }

            tackleCooldown.current = isSlide ? 1.5 : 0.85

            if (isSlide) {
                slideDuration.current = 0.32
            }

            let successChance = 1

            if (opponentHasBall) {
                const ownStrength =
                    (tacklerItem?.defending || 75) * 0.6 +
                    (tacklerItem?.physical || 75) * 0.4

                const opponentStrength =
                    (ownerItem.dribbling || 75) * 0.6 +
                    (ownerItem.physical || 75) * 0.4

                // Tắc bóng trực diện dễ hơn tắc từ sau lưng.
                const ownerFacing = new THREE.Vector3(0, 0, 1)
                    .applyAxisAngle(UP_AXIS, ownerObject.rotation.y)
                const toTacklerX = player.position.x - ownerObject.position.x
                const toTacklerZ = player.position.z - ownerObject.position.z
                const toTacklerLength = Math.hypot(toTacklerX, toTacklerZ) || 1
                const frontDot =
                    (ownerFacing.x * toTacklerX + ownerFacing.z * toTacklerZ) /
                    toTacklerLength

                successChance = clamp(
                    (isSlide ? 0.6 : 0.66) +
                    (ownStrength - opponentStrength) * 0.006 +
                    frontDot * 0.1 -
                    (ownerDistance / range) * 0.15,
                    0.15,
                    0.85,
                )
            }

            if (Math.random() >= successChance) {
                onActionMessage(
                    isSlide ? 'SLIDE TACKLE MISSED' : 'TACKLE MISSED',
                )
                return
            }

            if (isSlide && ballRef.current) {
                // Xoạc thành công: phá bóng bật ra theo hướng xoạc.
                const slideDirection = new THREE.Vector3(0, 0, 1)
                    .applyAxisAngle(UP_AXIS, player.rotation.y)

                ballRef.current.setLinvel(
                    {
                        x: slideDirection.x * 5,
                        y: 0.4,
                        z: slideDirection.z * 5,
                    },
                    true,
                )

                if (ownerId) {
                    pickupLockRef.current = { playerId: ownerId, time: 0.8 }
                }

                possession.current = null
                pendingPassRef.current = null
                lastTouchTeam.current = 'blue'

                onActionMessage('SLIDING TACKLE SUCCESS!')
                return
            }

            attachBallToPlayer(player, selectedId)
            onActionMessage('TACKLE SUCCESS!')
        },
        [selectedId, onActionMessage, players, redPlayers],
    )

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.repeat) return

            // S: Chuyền bóng hoặc chuyển sang cầu thủ phòng ngự.
            if (event.code === 'KeyS') {
                event.preventDefault()

                const currentOwnerId = possession.current

                const currentOwnerItem = currentOwnerId
                    ? getPlayerById(currentOwnerId)
                    : null

                // BLUE FC đang giữ bóng: chuyền từ người đang có bóng.
                if (currentOwnerItem?.teamId === 'blue') {
                    onSelect(currentOwnerId)

                    kickFromPlayer(
                        currentOwnerId,
                        'pass',
                        false,
                    )

                    return
                }

                // RED giữ bóng hoặc bóng tự do:
                // chọn cầu thủ BLUE gần bóng nhất.
                const ballPosition = ballRef.current?.translation()

                if (!ballPosition) return

                const nearestBlue = bluePlayers
                    .map((player) => ({
                        player,
                        object: playerRefs.current[player.id],
                    }))
                    .filter((entry) => entry.object)
                    .map((entry) => ({
                        ...entry,
                        distance: distance2D(
                            entry.object.position,
                            ballPosition,
                        ),
                    }))
                    .sort((a, b) => a.distance - b.distance)[0]

                if (nearestBlue) {
                    onSelect(nearestBlue.player.id)

                    onActionMessage(
                        `DEFEND: ${nearestBlue.player.name.toUpperCase()}`,
                    )
                }

                return
            }

            if (event.code === 'KeyW') kickBall('through')
            if (event.code === 'KeyA') kickBall('lob')
            if (event.code === 'KeyD') kickBall('shoot')

            if (event.code === 'Space') {
                event.preventDefault()
                performTackle('standing')
            }

            if (
                event.code === 'ControlLeft' ||
                event.code === 'ControlRight'
            ) {
                event.preventDefault()
                performTackle('slide')
            }
        }

        window.addEventListener('keydown', onKeyDown)

        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [
        kickBall,
        kickFromPlayer,
        performTackle,
        onSelect,
        onActionMessage,
        selectedId,
        bluePlayers,
    ])

    useFrame((_, rawDelta) => {
        // Giới hạn delta để khi tab bị ẩn/lag, cầu thủ không "dịch chuyển" xa.
        const delta = Math.min(rawDelta, 0.05)
        const ball = ballRef.current

        if (!ball) return

        pickupLockRef.current.time = Math.max(
            0,
            pickupLockRef.current.time - delta,
        )

        if (!isPlaying || matchEndedRef.current) {
            ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
            return
        }

        tackleCooldown.current = Math.max(
            0,
            tackleCooldown.current - delta,
        )

        slideDuration.current = Math.max(
            0,
            slideDuration.current - delta,
        )

        aiAttemptCooldown.current = Math.max(
            0,
            aiAttemptCooldown.current - delta,
        )

        aiDecisionCooldown.current = Math.max(
            0,
            aiDecisionCooldown.current - delta,
        )

        goalCooldown.current = Math.max(
            0,
            goalCooldown.current - delta,
        )

        const ballPosition = ball.translation()

        const ballPoint = {
            x: ballPosition.x,
            z: ballPosition.z,
        }

        const ownerId = possession.current
        const owner = ownerId
            ? playerRefs.current[ownerId]
            : null

        const ownerItem = ownerId
            ? getPlayerById(ownerId)
            : null

        // Xác định đội sở hữu bóng bằng teamId, hỗ trợ cả cầu thủ mua mới.
        const blueHasBall = ownerItem?.teamId === 'blue'
        const redHasBall = ownerItem?.teamId === 'red'

        // 1. Bàn thắng và bóng ra ngoài sân.
        if (goalCooldown.current <= 0) {
            const crossedBlueGoal =
                ballPosition.z < -52.5 &&
                Math.abs(ballPosition.x) <= FIELD.goalHalfWidth &&
                ballPosition.y < 2.44

            const crossedRedGoal =
                ballPosition.z > 52.5 &&
                Math.abs(ballPosition.x) <= FIELD.goalHalfWidth &&
                ballPosition.y < 2.44

            if (crossedBlueGoal || crossedRedGoal) {
                // Bóng đã qua vạch vôi thì là bàn thắng; việc cứu thua được
                // xử lý trong AI thủ môn trước khi bóng tới khung thành.
                const scoringTeam = crossedBlueGoal ? 'blue' : 'red'
                const kickoffTeam =
                    scoringTeam === 'blue' ? 'red' : 'blue'

                goalCooldown.current = 4
                resetPositions(kickoffTeam)
                onGoal(scoringTeam)

                onActionMessage(
                    scoringTeam === 'blue'
                        ? 'GOAL! BLUE FC'
                        : `GOAL! ${opponentName}`,
                )

                return
            }

            // Bóng chỉ ra ngoài khi đã qua hẳn vạch biên.
            const outsideSide =
                Math.abs(ballPosition.x) > FIELD.lineX + FIELD.ballRadius &&
                Math.abs(ballPosition.z) <= FIELD.lineZ + FIELD.ballRadius

            const outsideEnd =
                Math.abs(ballPosition.z) > FIELD.lineZ + FIELD.ballRadius

            const fallenBall = ballPosition.y < -2

            if (outsideSide || outsideEnd || fallenBall) {
                const lastTouch = lastTouchTeam.current
                const oppositeTeam =
                    lastTouch === 'blue' ? 'red' : 'blue'

                if (outsideSide && !fallenBall) {
                    restartAtSpot(
                        oppositeTeam,
                        'throw-in',
                        ballPosition.x,
                        ballPosition.z,
                    )
                } else if (outsideEnd && !fallenBall) {
                    const defendingTeam =
                        ballPosition.z < 0 ? 'red' : 'blue'

                    if (lastTouch === defendingTeam) {
                        restartAtSpot(
                            oppositeTeam,
                            'corner',
                            clamp(
                                ballPosition.x < 0
                                    ? FIELD.minX
                                    : FIELD.maxX,
                                FIELD.minX + 1,
                                FIELD.maxX - 1,
                            ),
                            ballPosition.z < 0
                                ? FIELD.minZ + 0.8
                                : FIELD.maxZ - 0.8,
                        )
                    } else {
                        restartAtSpot(
                            defendingTeam,
                            'goal-kick',
                            clamp(ballPosition.x, -4, 4),
                            defendingTeam === 'blue' ? 47.5 : -47.5,
                        )
                    }
                } else {
                    restartAtSpot(
                        oppositeTeam,
                        'throw-in',
                        clamp(ballPosition.x, FIELD.minX, FIELD.maxX),
                        clamp(ballPosition.z, FIELD.minZ, FIELD.maxZ),
                    )
                }

                return
            }
        }

        // 2. Điều khiển cầu thủ BLUE.
        const controlled = selectedPlayer()

        dribbleState.current.x = 0
        dribbleState.current.z = 0
        dribbleState.current.sprinting = false

        if (controlled && slideDuration.current > 0) {
            // Đang xoạc: lao về phía trước, tạm khóa điều khiển.
            const slideDirection = new THREE.Vector3(0, 0, 1)
                .applyAxisAngle(UP_AXIS, controlled.rotation.y)

            controlled.position.x += slideDirection.x * 10 * delta
            controlled.position.z += slideDirection.z * 10 * delta

            clampPlayer(controlled)
        } else if (controlled) {
            const sprinting =
                keys.current.KeyE ||
                keys.current.ShiftLeft ||
                keys.current.ShiftRight

            const speed = sprinting ? 8.2 : 5.2
            const direction = new THREE.Vector3()

            if (keys.current.ArrowUp) direction.x -= 1
            if (keys.current.ArrowDown) direction.x += 1
            if (keys.current.ArrowLeft) direction.z += 1
            if (keys.current.ArrowRight) direction.z -= 1

            if (direction.lengthSq() > 0) {
                direction.normalize()

                dribbleState.current.x = direction.x
                dribbleState.current.z = direction.z
                dribbleState.current.sprinting = sprinting

                controlled.position.x += direction.x * speed * delta
                controlled.position.z += direction.z * speed * delta

                controlled.rotation.y = Math.atan2(
                    direction.x,
                    direction.z,
                )

                clampPlayer(controlled)
            }
        }

        // 3. Hàm di chuyển AI.
        const moveAIPlayer = (item, target, speedScale = 1) => {
            const object = playerRefs.current[item.id]

            if (!object) return

            const dx = target.x - object.position.x
            const dz = target.z - object.position.z
            const distance = Math.hypot(dx, dz)

            if (distance < 0.15) return

            const pace = (item.pace || 72) / 80

            const baseSpeed =
                item.role === 'GK' ? 4.8 : 5.2 + pace * 2.2

            const speed = baseSpeed * tactic.speed * speedScale
            const step = Math.min(distance, speed * delta)

            object.position.x += (dx / distance) * step
            object.position.z += (dz / distance) * step

            object.rotation.y = Math.atan2(dx, dz)

            clampPlayer(object)
        }

        // 4. AI di chuyển theo vai trò và chiến thuật.
        const updateTeamAI = (teamList, teamId) => {
            const attackDirection = teamId === 'blue' ? -1 : 1
            const defendDirection = -attackDirection

            const teamHasBall =
                teamId === 'blue' ? blueHasBall : redHasBall

            const enemyHasBall =
                teamId === 'blue' ? redHasBall : blueHasBall

            const candidates = teamList
                .filter(
                    (item) =>
                        !(teamId === 'blue' && item.id === selectedId),
                )
                .map((item) => ({
                    item,
                    object: playerRefs.current[item.id],
                }))
                .filter((entry) => entry.object)
                .map((entry) => ({
                    ...entry,
                    distance: distance2D(
                        entry.object.position,
                        ballPoint,
                    ),
                }))
                .sort((a, b) => a.distance - b.distance)

            const pressingIds = new Set(
                candidates.slice(0, 2).map((entry) => entry.item.id),
            )

            const carrier =
                ownerItem?.teamId === teamId
                    ? playerRefs.current[ownerId]
                    : null

            teamList.forEach((item) => {
                if (teamId === 'blue' && item.id === selectedId) return

                const object = playerRefs.current[item.id]

                if (!object || item.role === 'GK') return

                const homeX = item.x ?? 0
                const homeZ = item.z ?? 0

                let targetX = homeX
                let targetZ = homeZ
                let speedScale = 1

                if (teamHasBall) {
                    const ballX = carrier
                        ? carrier.position.x
                        : ballPoint.x

                    const ballZ = carrier
                        ? carrier.position.z
                        : ballPoint.z

                    if (item.role === 'FW') {
                        targetZ = ballZ + attackDirection * 12

                        targetX =
                            Math.abs(homeX) > 5
                                ? homeX * 1.12
                                : ballX * 0.45

                        speedScale = 1.18
                    } else if (item.role === 'MF') {
                        targetZ = ballZ + attackDirection * 6
                        targetX = homeX * 0.72 + ballX * 0.28
                        speedScale = 1.12
                    } else {
                        targetZ = homeZ + attackDirection * 5
                        targetX = homeX * 0.9 + ballX * 0.1
                        speedScale = 1.04
                    }

                    targetZ += (ballZ - homeZ) * 0.16

                    if (Math.abs(homeX) > 5) {
                        targetX += Math.sign(homeX) * 2.5 * tactic.width
                    }

                    const distanceToBall = distance2D(
                        object.position,
                        ballPoint,
                    )

                    if (distanceToBall < 14 && item.id !== ownerId) {
                        targetX += (ballX - targetX) * 0.18
                        targetZ += (ballZ - targetZ) * 0.12
                    }
                } else if (enemyHasBall) {
                    const retreatDistance =
                        item.role === 'FW'
                            ? 5
                            : item.role === 'MF'
                                ? 9
                                : 12

                    targetZ =
                        homeZ +
                        defendDirection *
                        retreatDistance *
                        (1 - tactic.defensiveLine * 0.3)

                    targetX = homeX * 0.82 + ballPoint.x * 0.18

                    if (pressingIds.has(item.id)) {
                        targetX +=
                            (ballPoint.x - targetX) * tactic.press * 0.72

                        targetZ +=
                            (ballPoint.z - targetZ) * tactic.press * 0.72

                        speedScale = 1.2
                    } else {
                        speedScale = 1.05
                    }
                } else if (pressingIds.has(item.id)) {
                    targetX = ballPoint.x
                    targetZ = ballPoint.z
                    speedScale = 1.25
                } else {
                    targetZ = homeZ + attackDirection * 2
                    targetX = homeX
                }

                targetX = clamp(
                    targetX,
                    FIELD.minX + 2,
                    FIELD.maxX - 2,
                )

                targetZ = clamp(
                    targetZ,
                    FIELD.minZ + 2,
                    FIELD.maxZ - 2,
                )

                moveAIPlayer(
                    item,
                    { x: targetX, z: targetZ },
                    speedScale,
                )
            })
        }

        updateTeamAI(bluePlayers, 'blue')
        updateTeamAI(redPlayers, 'red')

        // Đồng đội chạy đến vị trí dự kiến nhận đường chuyền.
        const pendingPass = pendingPassRef.current

        if (pendingPass) {
            pendingPass.elapsed += delta

            const receiverObject =
                playerRefs.current[pendingPass.receiverId]

            const receiverItem =
                getPlayerById(pendingPass.receiverId)

            const currentBallPosition = ball.translation()
            const ballVelocity = ball.linvel()

            const ballSpeed = Math.hypot(
                ballVelocity.x,
                ballVelocity.y,
                ballVelocity.z,
            )

            const horizontalBallSpeed = Math.hypot(
                ballVelocity.x,
                ballVelocity.z,
            )

            const targetPosition = {
                x: pendingPass.targetX,
                z: pendingPass.targetZ,
            }

            const ballDistanceToTarget = distance2D(
                currentBallPosition,
                targetPosition,
            )

            const passFinished =
                possession.current ||
                !receiverObject ||
                !receiverItem ||
                pendingPass.elapsed > 3.5 ||
                (
                    pendingPass.elapsed > 0.45 &&
                    ballSpeed < 1.1
                ) ||
                (
                    ballDistanceToTarget < 1.4 &&
                    ballSpeed < 3.2
                )

            if (passFinished) {
                pendingPassRef.current = null
            } else {
                // Khoảng cách từ cầu thủ nhận bóng đến bóng.
                const receiverDistance = distance2D(
                    receiverObject.position,
                    currentBallPosition,
                )

                // Dự đoán vị trí bóng sẽ đến dựa trên vận tốc hiện tại.
                const interceptTime = clamp(
                    receiverDistance / Math.max(horizontalBallSpeed, 2),
                    0,
                    1.1,
                )

                const interceptPosition = {
                    x: currentBallPosition.x +
                        ballVelocity.x * interceptTime,

                    z: currentBallPosition.z +
                        ballVelocity.z * interceptTime,
                }

                const runTarget = receiverDistance < 9
                    ? {
                        x: clamp(
                            interceptPosition.x,
                            FIELD.minX + 1,
                            FIELD.maxX - 1,
                        ),
                        z: clamp(
                            interceptPosition.z,
                            FIELD.minZ + 1,
                            FIELD.maxZ - 1,
                        ),
                    }
                    : targetPosition

                moveAIPlayer(
                    receiverItem,
                    runTarget,
                    pendingPass.action === 'through' ? 1.65 : 1.4,
                )
            }
        }

        // 5. AI thủ môn.
        const updateGoalkeeper = (teamId) => {
            const isBlue = teamId === 'blue'
            const teamList = isBlue ? bluePlayers : redPlayers

            const goalkeeperItem = teamList.find(
                (item) => item.role === 'GK',
            )

            if (!goalkeeperItem) return

            const goalkeeper =
                playerRefs.current[goalkeeperItem.id]

            if (!goalkeeper) return

            // Thủ môn đang giữ bóng thì đứng yên chờ phát bóng.
            if (possession.current === goalkeeperItem.id) {
                return
            }

            const enemyTeamId = isBlue ? 'red' : 'blue'
            const goalZ = isBlue ? 50.5 : -50.5
            const velocity = ball.linvel()

            const movingTowardGoal = isBlue
                ? velocity.z > 0.5
                : velocity.z < -0.5

            let predictedX = ballPosition.x

            if (movingTowardGoal && Math.abs(velocity.z) > 0.5) {
                const timeToGoal =
                    (goalZ - ballPosition.z) / velocity.z

                if (timeToGoal > 0 && timeToGoal < 3) {
                    predictedX += velocity.x * timeToGoal
                }
            }

            let targetX = clamp(predictedX, -7.2, 7.2)

            let targetZ = isBlue
                ? goalZ - clamp(
                (goalZ - ballPosition.z) * 0.2,
                0,
                5,
            )
                : goalZ + clamp(
                (ballPosition.z - goalZ) * 0.2,
                0,
                5,
            )

            const enemyCarrier =
                ownerItem?.teamId === enemyTeamId
                    ? playerRefs.current[ownerId]
                    : null

            let rushingOut = false

            if (enemyCarrier) {
                const distanceToGoal = Math.abs(
                    enemyCarrier.position.z - goalZ,
                )

                const distanceToKeeper = distance2D(
                    enemyCarrier.position,
                    goalkeeper.position,
                )

                if (
                    distanceToGoal < 19 &&
                    distanceToKeeper < 23
                ) {
                    rushingOut = true

                    targetX = clamp(
                        enemyCarrier.position.x,
                        -8,
                        8,
                    )

                    targetZ = isBlue
                        ? Math.min(
                            goalZ - 1,
                            enemyCarrier.position.z + 4,
                        )
                        : Math.max(
                            goalZ + 1,
                            enemyCarrier.position.z - 4,
                        )
                }
            }

            targetZ = clamp(
                targetZ,
                isBlue ? 42 : -51,
                isBlue ? 51 : -42,
            )

            goalkeeper.rotation.y = isBlue ? Math.PI : 0

            moveAIPlayer(
                goalkeeperItem,
                { x: targetX, z: targetZ },
                movingTowardGoal || rushingOut ? 2.1 : 1.35,
            )

            const currentBallPosition = ball.translation()

            const distanceToBall = distance2D(
                goalkeeper.position,
                currentBallPosition,
            )

            const ballHeight = currentBallPosition.y

            const insideGoalkeeperArea = isBlue
                ? currentBallPosition.z > 39
                : currentBallPosition.z < -39

            const ballSpeed = Math.hypot(
                velocity.x,
                velocity.y,
                velocity.z,
            )

            const enemyOwnsBall =
                ownerItem?.teamId === enemyTeamId

            const keeperReach = 2.4
            const keeperRating = goalkeeperItem.overall || 75
            const saveLabel = isBlue
                ? 'BLUE GOALKEEPER'
                : `${opponentName} GOALKEEPER`

            if (
                insideGoalkeeperArea &&
                ballHeight < 2.8 &&
                enemyOwnsBall &&
                distanceToBall < 1.6
            ) {
                // Thủ môn lao ra cướp bóng trong chân tiền đạo.
                attachBallToPlayer(goalkeeper, goalkeeperItem.id)
                aiDecisionCooldown.current = 1.5
                onActionMessage(`${saveLabel} CLAIMS IT!`)
            } else if (
                insideGoalkeeperArea &&
                distanceToBall < keeperReach &&
                ballHeight < 2.8 &&
                !possession.current
            ) {
                if (ballSpeed < 12) {
                    // Bóng chậm: bắt gọn.
                    attachBallToPlayer(goalkeeper, goalkeeperItem.id)
                    aiDecisionCooldown.current = 1.5
                } else if (
                    keeperResolvedKick.current[teamId] !== kickIdRef.current
                ) {
                    // Bóng nhanh: tung xúc xắc MỘT lần cho mỗi cú đá.
                    keeperResolvedKick.current[teamId] = kickIdRef.current

                    const saveChance = clamp(
                        0.35 +
                        (keeperRating - 70) * 0.012 +
                        (keeperReach - distanceToBall) * 0.12 -
                        (ballSpeed - 18) * 0.02 -
                        Math.max(0, ballHeight - 1.8) * 0.15,
                        0.1,
                        0.85,
                    )

                    if (Math.random() < saveChance) {
                        if (ballSpeed < 20) {
                            attachBallToPlayer(goalkeeper, goalkeeperItem.id)
                            aiDecisionCooldown.current = 1.5
                            onActionMessage(`${saveLabel} SAVE!`)
                        } else {
                            // Đẩy bóng ra: bật ngược và lệch sang một bên.
                            const side =
                                Math.sign(currentBallPosition.x - goalkeeper.position.x) ||
                                (Math.random() < 0.5 ? -1 : 1)

                            ball.setLinvel(
                                {
                                    x: side * (4 + Math.random() * 4),
                                    y: 2 + Math.random() * 2,
                                    z: -velocity.z * 0.3,
                                },
                                true,
                            )

                            lastTouchTeam.current = teamId
                            pendingPassRef.current = null
                            kickIdRef.current += 1
                            onActionMessage(`${saveLabel} PARRIES IT!`)
                        }
                    }
                }
            }
        }

        updateGoalkeeper('blue')
        updateGoalkeeper('red')


// 6. AI cầu thủ đang giữ bóng.
        if (
            owner &&
            ownerItem &&
            ownerId !== selectedId &&
            aiDecisionCooldown.current <= 0
        ) {
            if (ownerItem.role === 'GK') {
                if (ownerItem.teamId === 'red') {
                    // Thủ môn RED ưu tiên phát bóng dài lên phía trước.
                    kickFromPlayer(ownerId, 'lob', true)

                    // Nếu không tìm được mục tiêu chuyền bóng,
                    // cưỡng chế thủ môn phá bóng lên phía trước.
                    if (
                        possession.current === ownerId &&
                        ballRef.current
                    ) {
                        const goalkeeper = playerRefs.current[ownerId]

                        if (goalkeeper) {
                            ballRef.current.setTranslation(
                                {
                                    x: goalkeeper.position.x,
                                    y: 1.1,
                                    z: goalkeeper.position.z + 1.2,
                                },
                                true,
                            )

                            ballRef.current.setLinvel(
                                {
                                    x: 0,
                                    y: 4.5,
                                    z: 19,
                                },
                                true,
                            )

                            ballRef.current.setAngvel(
                                { x: 0, y: 0, z: 0 },
                                true,
                            )

                            possession.current = null
                            pendingPassRef.current = null
                            lastTouchTeam.current = 'red'
                        }
                    }

                    aiDecisionCooldown.current = 2.5
                } else {
                    // Thủ môn BLUE vẫn phát bóng bằng chuyền ngắn.
                    kickFromPlayer(ownerId, 'pass', true)
                    aiDecisionCooldown.current = 2
                }
            } else {
                const goalDistance =
                    ownerItem.teamId === 'blue'
                        ? Math.abs(owner.position.z + 52.5)
                        : Math.abs(owner.position.z - 52.5)

                const opponentList =
                    ownerItem.teamId === 'blue'
                        ? redPlayers
                        : bluePlayers

                const nearbyOpponent = opponentList.some((opponent) => {
                    const object = playerRefs.current[opponent.id]

                    return (
                        object &&
                        distance2D(object.position, owner.position) < 2.5
                    )
                })

                const goalLaneOpen = Math.abs(owner.position.x) < 17

                if (goalDistance < 23 && goalLaneOpen) {
                    kickFromPlayer(ownerId, 'shoot', true)
                    aiDecisionCooldown.current = 1.7
                } else if (nearbyOpponent) {
                    kickFromPlayer(ownerId, 'pass', true)
                    aiDecisionCooldown.current = 1.2
                } else {
                    moveAIPlayer(
                        ownerItem,
                        {
                            x: clamp(owner.position.x * 0.72, -18, 18),
                            z: owner.position.z +
                                (ownerItem.teamId === 'blue' ? -9 : 9),
                        },
                        0.9,
                    )
                }
            }
        }

        // 7. Va chạm giữa các cầu thủ.
        const activeObjects = players
            .map((item) => playerRefs.current[item.id])
            .filter(Boolean)

        for (let i = 0; i < activeObjects.length; i += 1) {
            for (let j = i + 1; j < activeObjects.length; j += 1) {
                const a = activeObjects[i]
                const b = activeObjects[j]

                const dx = b.position.x - a.position.x
                const dz = b.position.z - a.position.z

                const distance = Math.hypot(dx, dz)
                const minDistance = FIELD.playerRadius * 2

                if (distance > 0 && distance < minDistance) {
                    const overlap = minDistance - distance
                    const pushX = (dx / distance) * overlap * 0.5
                    const pushZ = (dz / distance) * overlap * 0.5

                    a.position.x -= pushX
                    a.position.z -= pushZ

                    b.position.x += pushX
                    b.position.z += pushZ

                    clampPlayer(a)
                    clampPlayer(b)
                }
            }
        }

        // 8. RED có cơ hội cướp bóng từ BLUE.
        if (
            blueHasBall &&
            owner &&
            aiAttemptCooldown.current <= 0
        ) {
            const nearestRed = redPlayers
                .map((item) => ({
                    ...item,
                    object: playerRefs.current[item.id],
                }))
                .filter((item) => item.object)
                .map((item) => ({
                    ...item,
                    distance: item.object.position.distanceTo(
                        owner.position,
                    ),
                }))
                .sort((a, b) => a.distance - b.distance)[0]

            if (nearestRed && nearestRed.distance < 1.15) {
                aiAttemptCooldown.current = 1.1

                const chance = clamp(
                    0.12 +
                    ((nearestRed.defending || 75) -
                        (ownerItem?.dribbling || 75)) *
                    0.003,
                    0.05,
                    0.3,
                )

                if (Math.random() < chance) {
                    attachBallToPlayer(
                        nearestRed.object,
                        nearestRed.id,
                    )

                    onActionMessage(`${opponentName} WON THE BALL`)
                }
            }
        }

        // 9. Cầu thủ có thể đón bóng đang di chuyển.
        if (!possession.current) {
            const velocity = ball.linvel()

            const ballSpeed = Math.hypot(
                velocity.x,
                velocity.y,
                velocity.z,
            )

            // Bóng quá cao thì cầu thủ chưa thể khống chế bằng chân.
            if (ballPosition.y < 1.55) {
                let bestCandidate = null
                let bestScore = Infinity

                players.forEach((item) => {
                    const object = playerRefs.current[item.id]

                    if (!object) return

                    const distance = distance2D(
                        object.position,
                        ballPosition,
                    )

                    if (distance > 1.5) return

                    if (
                        pickupLockRef.current.time > 0 &&
                        pickupLockRef.current.playerId === item.id
                    ) {
                        return
                    }

                    // Ưu tiên người được chuyền tới,
                    // nhưng đối phương vẫn có thể cắt bóng nếu ở gần hơn.
                    const isIntendedReceiver =
                        pendingPassRef.current?.receiverId === item.id

                    const score =
                        distance - (isIntendedReceiver ? 0.25 : 0)

                    if (score < bestScore) {
                        bestScore = score
                        bestCandidate = {
                            item,
                            object,
                            distance,
                        }
                    }
                })

                if (bestCandidate) {
                    const { item, object } = bestCandidate

                    // Chạm bước một: giảm tốc bóng trước khi kiểm soát.
                    if (ballSpeed > 7.5) {
                        ball.setLinvel(
                            {
                                x: velocity.x * 0.48,
                                y: Math.max(0, velocity.y * 0.25),
                                z: velocity.z * 0.48,
                            },
                            true,
                        )

                        const angularVelocity = ball.angvel()

                        ball.setAngvel(
                            {
                                x: angularVelocity.x * 0.5,
                                y: angularVelocity.y * 0.5,
                                z: angularVelocity.z * 0.5,
                            },
                            true,
                        )
                    } else {
                        // Bóng đã đủ chậm: cầu thủ khống chế và nhận quyền sở hữu.
                        attachBallToPlayer(object, item.id)

                        onActionMessage(
                            item.teamId === 'blue'
                                ? 'BLUE FC FIRST TOUCH'
                                : `${opponentName} FIRST TOUCH`,
                        )
                    }
                }
            }
        }

        // 10. Điều khiển bóng khi cầu thủ đang rê bóng.
        const currentOwnerId = possession.current

        const currentOwner = currentOwnerId
            ? playerRefs.current[currentOwnerId]
            : null

        if (currentOwner) {
            const isControlledPlayer = currentOwnerId === selectedId

            let moveX = 0
            let moveZ = 0
            let sprinting = false

            if (isControlledPlayer) {
                moveX = dribbleState.current.x
                moveZ = dribbleState.current.z
                sprinting = dribbleState.current.sprinting
            } else {
                const velocity =
                    playerVelocities.current[currentOwnerId] || {
                        x: 0,
                        z: 0,
                    }

                moveX = velocity.x
                moveZ = velocity.z

                sprinting = Math.hypot(moveX, moveZ) > 6
            }

            const isMoving = Math.hypot(moveX, moveZ) > 0.5

            // Tăng nhịp rê bóng khi cầu thủ di chuyển.
            if (isMoving) {
                dribbleState.current.phase += delta * (
                    sprinting ? 11 : 7
                )
            }

            const direction = new THREE.Vector3(0, 0, 1)
                .applyAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    currentOwner.rotation.y,
                )

            // Khi chạy, bóng được đẩy xa hơn về phía trước.
            let offset = isMoving
                ? sprinting ? 1.25 : 0.95
                : 0.78

            // Tạo nhịp chạm bóng khi chạy.
            if (isMoving) {
                offset += Math.sin(dribbleState.current.phase) *
                    (sprinting ? 0.18 : 0.12)
            }

            const ballX =
                currentOwner.position.x + direction.x * offset

            const ballZ =
                currentOwner.position.z + direction.z * offset

            ball.setTranslation(
                {
                    x: ballX,
                    y: 0.39,
                    z: ballZ,
                },
                true,
            )

            // Không để vận tốc vật lý làm bóng tự trôi khỏi chân.
            ball.setLinvel(
                {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                true,
            )
        }

        // Lưu vị trí thực tế để cầu thủ dự bị vào sân đúng vị trí.
        players.forEach((item) => {
            const object = playerRefs.current[item.id]

            if (!object) return

            const previous = lastPlayerPositions.current[item.id]

            if (previous && delta > 0) {
                playerVelocities.current[item.id] = {
                    x: clamp(
                        (object.position.x - previous.x) / delta,
                        -9,
                        9,
                    ),
                    z: clamp(
                        (object.position.z - previous.z) / delta,
                        -9,
                        9,
                    ),
                }
            }

            lastPlayerPositions.current[item.id] = {
                x: object.position.x,
                z: object.position.z,
            }
        })
    })

    return (
        <>
            <color attach="background" args={['#10251d']} />
            <fog attach="fog" args={['#10251d', 110, 190]} />

            <ambientLight intensity={1.15} />

            <directionalLight
                position={[-25, 45, 20]}
                intensity={2.2}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />

            <FixedCamera ballRef={ballRef} />

            <Pitch />
            <GroundCollider />
            <Ball bodyRef={ballRef} />

            <PassTargetMarker targetRef={pendingPassRef} />

            {players.map((player) => {
                const team = roster.find(
                    (item) => item.id === player.teamId,
                )

                return (
                    <Player
                        key={player.id}
                        player={player}
                        teamColor={team.color}
                        isSelected={selectedId === player.id}
                        onSelect={
                            player.teamId === 'blue'
                                ? onSelect
                                : undefined
                        }
                        onReady={registerPlayer}
                    />
                )
            })}

            <ContactShadows
                position={[0, -0.04, 0]}
                opacity={0.25}
                scale={115}
                blur={2.5}
                far={12}
            />
        </>
    )
}

export default function GameScene() {
    const [roster, setRoster] = useState(loadSavedRoster)

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

    const handleGoal = useCallback((teamId) => {
        if (teamId === 'blue') {
            setBlueScore((score) => score + 1)
            setGoalMessage('GOAL! BLUE FC')
        } else {
            setRedScore((score) => score + 1)
            setGoalMessage('GOAL!')
        }

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
                    <Physics gravity={[0, -9.81, 0]} timeStep="vary">
                        <MatchWorld
                            roster={matchRoster}
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
                            : matchStatus === 'paused'
                                ? 'PAUSED'
                                : totalGameMinutes < 45
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

                {(matchStatus === 'fulltime' ||
                    matchStatus === 'paused') && (
                    <button
                        onClick={restartMatch}
                        style={matchButtonStyle}
                    >
                        NEW MATCH
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

            {/* GOAL / PAUSE / FULL TIME OVERLAY */}
            {(matchStatus === 'goal' ||
                matchStatus === 'paused' ||
                matchStatus === 'fulltime') && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.38)',
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            padding: '24px 42px',
                            borderRadius: 12,
                            background: 'rgba(8, 18, 14, 0.94)',
                            color: '#fff',
                            textAlign: 'center',
                            minWidth: 250,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 30,
                                fontWeight: 900,
                                letterSpacing: 2,
                            }}
                        >
                            {matchStatus === 'goal'
                                ? 'GOAL!'
                                : matchStatus === 'paused'
                                    ? 'PAUSED'
                                    : 'FULL TIME'}
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                marginTop: 8,
                                color: '#c4d5ca',
                            }}
                        >
                            {matchStatus === 'goal'
                                ? goalMessage
                                : matchStatus === 'paused'
                                    ? 'Press RESUME to continue'
                                    : `BLUE FC ${blueScore} - ${redScore} ${opponentTeam?.name || 'RED UNITED'}`}
                        </div>

                        {matchStatus === 'fulltime' && activeFixture && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: '#9fc5ad',
                                    marginTop: 10,
                                }}
                            >
                                {recordedFixtureRef.current === activeFixture.id
                                    ? 'LEAGUE RESULT SAVED'
                                    : 'SAVING RESULT...'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="canvas-hint">
                Ball-follow camera · Camera locked · Arrows move · E sprint ·
                Q switch · S pass · W through · A lob · D shoot ·
                Space tackle · Ctrl slide
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
