import { teamColorOf, withTeamColor } from '../services/teamColor'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, ContactShadows } from '@react-three/drei'
import {
    RigidBody,
    BallCollider,
    CuboidCollider,
    useBeforePhysicsStep,
} from '@react-three/rapier'
import * as THREE from 'three'

import { useKeyboard } from '../hooks/useKeyboard'
import Pitch from './Pitch'
import Stadium from './Stadium'
import { crowdIntensity, matchSoundEvent } from '../utils/matchSound'
import Player from './Player'

import { FIXED_STEP, TACTICS, clamp } from '../systems/constants'
import { getRole } from '../systems/roster'
import { halftimeRecovery, resetStamina } from '../systems/stamina'
import { stepWhistle } from '../systems/whistle'
import {
    createMatchState,
    facingFor,
    homePosition,
    resetMatchProgress,
} from '../systems/matchState'
import { attachBallToPlayer } from '../systems/ball'
import { resetPositions, restartAtSpot } from '../systems/rules'
import { createMatchStats } from '../systems/matchStats'
import { startShootout, stopShootout } from '../systems/shootout'
import { startTraining, stopTraining } from '../systems/training'
import { cancelCharge, handleKeyDown, handleKeyUp } from '../systems/control'
import { noteKeyActivity, noteUserInput, setAutoPilot, stepMatch } from '../systems/matchEngine'
import { withForm } from '../systems/form'
import { userTeam } from '../services/career'

// Phase 29D: phạt đền / luân lưu → camera thấp sau lưng người sút, nhìn về
// khung thành. Trả về đội đang sút hoặc null.
function penaltyViewTeam(state) {
    if (!state) return null
    if (state.shootout?.current) return state.shootout.current.team
    if (state.restart?.type === 'penalty') return state.restart.teamId
    if (state.penaltyCam && (state.elapsed || 0) < state.penaltyCam.until) return state.penaltyCam.teamId

    return null
}

function FixedCamera({ ballRef, matchState }) {
    const { camera, size } = useThree()
    const target = useRef(new THREE.Vector3(0, 0, 0))
    const initialized = useRef(false)
    const penaltyView = useRef(false)

    useEffect(() => {
        camera.fov = 38
        camera.near = 0.1
        camera.far = 250
        camera.updateProjectionMatrix()
        initialized.current = false
    }, [camera, size.width, size.height])

    useFrame((_, delta) => {
        const ballPosition = ballRef.current?.translation()
        const penaltyTeam = penaltyViewTeam(matchState)

        if (penaltyTeam) {
            // Đội sút tấn công về phía nào (giống matchState.attackDir).
            const base = penaltyTeam === 'blue' ? -1 : 1
            const attack = matchState.sidesSwapped ? -base : base
            const spotZ = attack * (52.5 - 11)
            const blend = 1 - Math.exp(-(penaltyView.current ? 3.5 : 2.2) * delta)

            // Hơi lệch sang phải, cao ~3.6m, lùi 13m sau chấm phạt đền: thấy
            // trọn người sút (thấp, bên trái màn hình) và cả khung thành.
            camera.position.lerp(new THREE.Vector3(-attack * 1.6, 3.6, spotZ - attack * 13), blend)
            target.current.lerp(new THREE.Vector3(0, 0.9, attack * 50.5), blend)
            camera.lookAt(target.current)
            penaltyView.current = true
            return
        }

        if (penaltyView.current) {
            // Vừa xong quả phạt đền: trở lại camera cạnh sân mượt mà.
            penaltyView.current = false
        }

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

// Phase 39: vị trí quả bóng trên màn hình (px) cho thẻ tên — thẻ nào đè lên
// bóng thì mờ đi (Player.jsx → NameTag).
function BallScreenTracker({ ballRef, matchState }) {
    const { camera, size } = useThree()
    const center = useMemo(() => new THREE.Vector3(), [])
    const top = useMemo(() => new THREE.Vector3(), [])

    useFrame(() => {
        const ball = ballRef.current?.translation()

        if (!ball) return

        center.set(ball.x, ball.y, ball.z).project(camera)
        top.set(ball.x, ball.y + 0.22, ball.z).project(camera)

        const y = (-center.y * 0.5 + 0.5) * size.height

        matchState.ballScreen = {
            x: (center.x * 0.5 + 0.5) * size.width,
            y,
            r: Math.max(3, Math.abs(y - (-top.y * 0.5 + 0.5) * size.height)),
            visible: center.z < 1,
        }
    })

    return null
}

function PassTargetMarker({ matchState }) {
    const markerRef = useRef(null)

    useFrame(() => {
        if (!markerRef.current) return

        const target = matchState.pendingPass

        markerRef.current.visible = Boolean(target)

        if (!target) return

        markerRef.current.position.set(target.targetX, 0.08, target.targetZ)
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

const CHARGE_COLORS = {
    pass: '#39ff88',
    through: '#4fd1ff',
    lob: '#ffd84f',
    shoot: '#ff7a3d',
}

const CHARGE_LABELS = {
    pass: 'PASS POWER',
    through: 'THROUGH BALL POWER',
    lob: 'LOB / CROSS POWER',
    shoot: 'SHOT POWER',
}

// Sút trên 80% lực bắt đầu mất chính xác → thanh chuyển đỏ.
const chargeColor = (charge) =>
    charge.action === 'shoot' && charge.power > 0.8
        ? '#ff4d4d'
        : CHARGE_COLORS[charge.action] || '#ffffff'

const CHARGE_BAR_WIDTH = 4.6

// Mũi tên trên đầu cầu thủ đang điều khiển + thanh lực khi giữ phím.
function SelectedPlayerIndicator({ matchState, playerRefs, selectedId }) {
    const groupRef = useRef(null)
    const arrowRef = useRef(null)
    const barRef = useRef(null)
    const fillRef = useRef(null)
    const fillMaterialRef = useRef(null)
    const clock = useRef(0)

    useFrame((_, delta) => {
        const group = groupRef.current
        if (!group) return

        const object = playerRefs.current[selectedId]

        group.visible = Boolean(object)
        if (!object) return

        clock.current += delta
        group.position.set(object.position.x, 0, object.position.z)

        if (arrowRef.current) {
            arrowRef.current.position.y = 3.3 + Math.sin(clock.current * 5) * 0.1
        }

        const charge = matchState.charge

        if (barRef.current) {
            barRef.current.visible = Boolean(charge)
        }

        if (charge && fillRef.current) {
            const power = Math.max(0.001, charge.power)

            fillRef.current.scale.x = power
            fillRef.current.position.x =
                -CHARGE_BAR_WIDTH / 2 + (CHARGE_BAR_WIDTH * power) / 2

            fillMaterialRef.current?.color.set(chargeColor(charge))
        }
    })

    return (
        <group ref={groupRef}>
            <mesh ref={arrowRef} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.45, 0.9, 4]} />
                <meshBasicMaterial color="#ffe45c" toneMapped={false} />
            </mesh>

            <Billboard ref={barRef} position={[0, 4.35, 0]} visible={false}>
                <mesh>
                    <planeGeometry args={[CHARGE_BAR_WIDTH + 0.24, 0.85]} />
                    <meshBasicMaterial color="#0b1410" transparent opacity={0.8} />
                </mesh>
                <mesh ref={fillRef} position={[0, 0, 0.01]}>
                    <planeGeometry args={[CHARGE_BAR_WIDTH, 0.6]} />
                    <meshBasicMaterial ref={fillMaterialRef} color="#39ff88" toneMapped={false} />
                </mesh>
            </Billboard>
        </group>
    )
}

// Cập nhật thanh lực (DOM, ở cuối màn hình) trực tiếp mỗi frame, không qua
// React state để không render lại cả màn hình 60 lần/giây. Sau khi nhả phím,
// thanh vẫn hiện thêm 0,5s để người chơi thấy lực vừa đá.
function useChargeHud(chargeHudRef, matchState) {
    const lastRef = useRef({ action: 'pass', power: 0, until: 0 })

    useFrame(() => {
        const element = chargeHudRef?.current
        if (!element) return

        const now = performance.now()
        const charge = matchState.charge

        if (charge) {
            lastRef.current = {
                action: charge.action,
                power: charge.power,
                until: now + 500,
            }
        }

        const shown = charge || (now < lastRef.current.until ? lastRef.current : null)
        const visible = shown ? 'true' : 'false'

        if (element.dataset.visible !== visible) {
            element.dataset.visible = visible
        }

        if (!shown) return

        const percent = Math.round(shown.power * 100)

        element.dataset.action = shown.action
        element.style.setProperty('--gauge-color', chargeColor(shown))

        const fill = element.querySelector('[data-role="fill"]')
        const value = element.querySelector('[data-role="value"]')
        const label = element.querySelector('[data-role="label"]')

        if (fill) fill.style.width = `${percent}%`
        if (value) value.textContent = `${percent}%`
        if (label) label.textContent = CHARGE_LABELS[shown.action] || 'POWER'
    })
}

// ---- Bản đồ mini (radar) kiểu FO4 ----
// Vẽ bằng canvas 2D mỗi frame. Hướng trùng với camera: camera đứng ở cạnh
// sân phía +X nhìn về -X, nên trên radar: trái = +Z, phải = -Z,
// trên = cạnh xa (-X), dưới = cạnh gần camera (+X).
const PITCH_LENGTH = 105
const PITCH_WIDTH = 68

function useRadar(radarRef, ctx) {
    useFrame(() => {
        const canvas = radarRef?.current
        const ball = ctx.ballRef.current

        if (!canvas || !ball) return

        const g = canvas.getContext('2d')
        const W = canvas.width
        const H = canvas.height
        const pad = 6 * (W / 240)
        const w = W - pad * 2
        const h = H - pad * 2

        const toScreen = (x, z) => ({
            sx: pad + ((PITCH_LENGTH / 2 - z) / PITCH_LENGTH) * w,
            sy: pad + ((x + PITCH_WIDTH / 2) / PITCH_WIDTH) * h,
        })

        const unit = w / PITCH_LENGTH

        // Mặt sân + vạch
        g.clearRect(0, 0, W, H)
        g.fillStyle = 'rgba(14, 58, 34, 0.92)'
        g.fillRect(0, 0, W, H)
        g.strokeStyle = 'rgba(220, 245, 225, 0.55)'
        g.lineWidth = Math.max(1, unit * 0.35)
        g.strokeRect(pad, pad, w, h)

        g.beginPath()
        g.moveTo(pad + w / 2, pad)
        g.lineTo(pad + w / 2, pad + h)
        g.stroke()

        g.beginPath()
        g.arc(pad + w / 2, pad + h / 2, 9.15 * unit, 0, Math.PI * 2)
        g.stroke()

        // Vòng cấm + khung thành hai đầu
        const boxDepth = 16.5 * unit
        const boxWidth = 40.3 * unit
        const goalWidth = 7.32 * unit

        g.strokeRect(pad, pad + h / 2 - boxWidth / 2, boxDepth, boxWidth)
        g.strokeRect(pad + w - boxDepth, pad + h / 2 - boxWidth / 2, boxDepth, boxWidth)

        g.fillStyle = 'rgba(255, 255, 255, 0.85)'
        g.fillRect(pad - unit * 1.5, pad + h / 2 - goalWidth / 2, unit * 1.5, goalWidth)
        g.fillRect(pad + w, pad + h / 2 - goalWidth / 2, unit * 1.5, goalWidth)

        // Cầu thủ
        const radius = Math.max(2.5, unit * 1.35)

        ctx.players.forEach((item) => {
            const object = ctx.objects[item.id]
            if (!object) return

            const { sx, sy } = toScreen(object.position.x, object.position.z)

            g.beginPath()
            g.arc(sx, sy, radius, 0, Math.PI * 2)
            g.fillStyle =
                item.role === 'GK'
                    ? ctx.keeperColors?.[item.teamId] || '#f0c928'
                    : ctx.teamColors?.[item.teamId] || '#ffffff'
            g.fill()
            g.lineWidth = Math.max(1, unit * 0.3)
            g.strokeStyle = 'rgba(0, 0, 0, 0.6)'
            g.stroke()

            if (item.id === ctx.selectedId) {
                g.beginPath()
                g.arc(sx, sy, radius + unit * 1.2, 0, Math.PI * 2)
                g.strokeStyle = '#ffe45c'
                g.lineWidth = Math.max(1.5, unit * 0.55)
                g.stroke()
            }
        })

        // Bóng
        const ballPosition = ball.translation()
        const { sx, sy } = toScreen(ballPosition.x, ballPosition.z)

        g.beginPath()
        g.arc(sx, sy, radius * 0.85, 0, Math.PI * 2)
        g.fillStyle = '#ffffff'
        g.fill()
        g.lineWidth = Math.max(1, unit * 0.35)
        g.strokeStyle = '#111111'
        g.stroke()
    })
}

// Cầu nối giữa React và engine trận đấu (src/systems).
// Component này chỉ: giữ refs, dựng `ctx`, xử lý sự kiện React
// (thay người, đổi sơ đồ, reset, sang hiệp 2) và gọi engine mỗi frame.
export default function MatchWorld({
    roster,
    selectedId,
    onSelect,
    onActionMessage,
    tacticKey,
    isPlaying,
    resetKey,
    onGoal,
    half = 1,
    chargeHudRef,
    radarRef,
    statsRef,
    labelMode = 'smart',
    matchDuration,
    whistlePending = null,
    // Phase 39: chạm trần bù giờ → thổi ngay; thay người chờ bóng chết.
    whistleForce = false,
    pendingSub = null,
    onSubStart,
    onSubSwap,
    onSubDone,
    onWhistleDone,
    onAutoPilotChange,
    onCard,
    // Phase 30A: bóng trúng cột dọc / xà ngang.
    onWoodwork,
    // Phase 29B: chất lượng đồ hoạ ('high' | 'low').
    quality = 'high',
    // Phase 29D: luân lưu tự đá — lệnh { type: 'start' | 'stop', nonce, first, kicks }.
    shootoutCommand = null,
    onShootoutUpdate,
    onShootoutEnd,
    // Phase 29F: số giây không bấm phím trước khi máy đá thay; lệnh bật / tắt
    // máy đá thay từ nút AUTO ({ on, nonce }).
    idleLimit = 10,
    autoPilotCommand = null,
    // Phase 42: tập luyện — lệnh { type: 'start' | 'stop', drill, options, nonce }.
    trainingCommand = null,
    onTrainingResult,
}) {
    const keys = useKeyboard()

    // Phase 20: cầu thủ bị thẻ đỏ (id) — không vẽ, không có trong ctx.
    const [sentOff, setSentOff] = useState([])
    // Phase 39: người vừa bị thay vẫn được vẽ thêm vài giây (đi ra ngoài sân).
    const [departing, setDeparting] = useState(null)

    const ballRef = useRef(null)
    const playerRefs = useRef({})
    const stateRef = useRef(null)
    const ctxRef = useRef({})
    const previousRosterRef = useRef(roster)
    const resetKeyRef = useRef(resetKey)

    if (!stateRef.current) {
        stateRef.current = createMatchState()
    }

    const state = stateRef.current
    const tactic = TACTICS[tacticKey] || TACTICS.balanced

    useChargeHud(chargeHudRef, state)
    useRadar(radarRef, ctxRef.current)

    // Phase 26D: team color tính trên 11 người đá chính của mỗi đội (kể cả
    // người bị thẻ đỏ, nên thẻ đỏ không làm mất team color); thay người thì
    // roster đổi → tính lại. Engine dùng chỉ số đã cộng; roster gốc không đổi.
    const players = useMemo(
        () =>
            roster.flatMap((team) => {
                const bonus = teamColorOf(team.players).bonus

                // Phase 29I: phong độ (±) cộng thêm sau team color.
                return team.players
                    .filter((player) => !sentOff.includes(player.id))
                    .map((player) => ({
                        ...withForm(withTeamColor(player, bonus)),
                        teamId: team.id,
                        role: getRole(player),
                    }))
            }),
        [roster, sentOff],
    )

    const bluePlayers = useMemo(
        () => players.filter((player) => player.teamId === 'blue'),
        [players],
    )

    const redPlayers = useMemo(
        () => players.filter((player) => player.teamId === 'red'),
        [players],
    )

    const byId = useMemo(
        () => new Map(players.map((player) => [player.id, player])),
        [players],
    )

    const opponentName =
        roster.find((team) => team.id === 'red')?.name || 'OPPONENT'

    const userTeamName =
        roster.find((team) => team.id === 'blue')?.name || userTeam().name

    // ctx là object ổn định, được cập nhật giá trị mới nhất mỗi lần render.
    const ctx = ctxRef.current

    // Kiểm thử tự động (chỉ bản build VITE_E2E=1): đọc vị trí / trạng thái trận.
    if (import.meta.env.VITE_E2E && typeof window !== 'undefined') {
        window.__ufmCtx = ctx
        window.__ufmRestart = (teamId, type, x, z) => restartAtSpot(ctx, teamId, type, x, z)
    }

    Object.assign(ctx, {
        state,
        ballRef,
        objects: playerRefs.current,
        keys,
        players,
        bluePlayers,
        redPlayers,
        byId,
        tactic,
        // Độ dài trận (giây): AI đối thủ đổi chiến thuật theo thời gian còn lại.
        matchDuration,
        // Hết giờ, đang chờ bóng chết để thổi còi ('half' | 'full' | null).
        whistlePending,
        whistleForce,
        onTrainingResult,
        // Phase 42: người đá phạt đã chọn của đội xanh.
        setPieceTakers: { blue: roster.find((team) => team.id === 'blue')?.setPieceTakers || null },
        pendingSub,
        onSubStart,
        onSubSwap: (sub) => {
            const leaving = byId.get(sub.outId)

            if (leaving) setDeparting(leaving)
            onSubSwap?.(sub)
        },
        onSubDone: (sub) => {
            setDeparting(null)
            onSubDone?.(sub)
        },
        onWhistleDone,
        onAutoPilotChange,
        isPlaying,
        opponentName,
        userTeamName,
        // Phase 26C: tốc độ ra quyết định của AI đối thủ theo độ khó.
        aiSpeed: roster.find((team) => team.id === 'red')?.aiSpeed || 1,
        teamColors: Object.fromEntries(
            roster.map((team) => [team.id, team.color]),
        ),
        // Phase 24: màu áo thủ môn từng đội (bản đồ mini).
        keeperColors: Object.fromEntries(
            roster.map((team) => [team.id, team.keeperKit?.shirt || '#f0c928']),
        ),
        onSelect,
        onActionMessage,
        onGoal,
        onCard,
        onWoodwork,
        onSentOff: (id) => setSentOff((list) => (list.includes(id) ? list : [...list, id])),
        // Phase 29B: âm thanh trận đấu (còi, chạm bóng, cứu thua, sút trượt).
        onSound: matchSoundEvent,
        onShootoutUpdate,
        onShootoutEnd,
        idleLimit,
    })
    // Người đang điều khiển: engine có thể tự đổi (nhận bóng, giao bóng, S/Q)
    // trước khi React kịp render lại. Chỉ đồng bộ từ prop khi prop THAY ĐỔI,
    // để một lần render cũ không ghi đè lựa chọn mới của engine.
    if (ctx.lastSelectedProp !== selectedId) {
        ctx.lastSelectedProp = selectedId
        ctx.selectedId = selectedId
    }


    // GameScene đọc thống kê qua ref này khi hết trận.
    if (statsRef) statsRef.current = state

    // Vừa vào sân (Canvas mới được tạo): xếp đội hình giao bóng.
    // Effect của các Player (con) chạy trước nên mọi cầu thủ đã đăng ký.
    useEffect(() => {
        state.stats = createMatchStats()
        state.timers.goalCooldown = 1
        resetMatchProgress(state)
        resetStamina(ctx)
        resetPositions(ctx, 'blue')
    }, [ctx, state])

    const registerPlayer = useCallback((id, object) => {
        if (object) {
            playerRefs.current[id] = object
        } else {
            delete playerRefs.current[id]
        }
    }, [])

    // Đồng bộ vị trí và quyền kiểm soát sau khi đổi sơ đồ hoặc thay người.
    useEffect(() => {
        const previousBlue = previousRosterRef.current.find(
            (team) => team.id === 'blue',
        )
        const currentBlue = roster.find((team) => team.id === 'blue')

        previousRosterRef.current = roster

        if (!previousBlue || !currentBlue) return

        const previousIds = new Set(previousBlue.players.map((p) => p.id))
        const currentIds = new Set(currentBlue.players.map((p) => p.id))

        const outgoing = previousBlue.players.find((p) => !currentIds.has(p.id))
        const incoming = currentBlue.players.find((p) => !previousIds.has(p.id))

        if (previousBlue.formationKey !== currentBlue.formationKey) {
            currentBlue.players.forEach((item) => {
                const object = playerRefs.current[item.id]
                if (!object) return

                const home = homePosition(state, item)

                object.position.set(home.x, 0, home.z)
                object.rotation.y = facingFor(state, 'blue')
            })
        }

        if (outgoing && incoming) {
            const incomingObject = playerRefs.current[incoming.id]
            const lastPosition =
                state.lastPositions[outgoing.id] ||
                homePosition(state, outgoing)

            if (incomingObject) {
                incomingObject.position.set(lastPosition.x, 0, lastPosition.z)
                incomingObject.rotation.y = facingFor(state, 'blue')
            }

            if (state.possession === outgoing.id) {
                if (incomingObject) {
                    attachBallToPlayer(ctx, incomingObject, incoming.id)
                } else {
                    state.possession = null
                }
            }

            if (selectedId === outgoing.id) {
                onSelect(incoming.id)
            }

            delete state.lastPositions[outgoing.id]
            delete state.velocities[outgoing.id]
            delete state.playerStates[outgoing.id]
        }
    }, [roster, selectedId, onSelect, ctx, state])

    // Sang hiệp 2: hai đội đổi sân, đội RED giao bóng.
    // (Khai báo TRƯỚC effect reset để khi bắt đầu trận mới,
    // sidesSwapped được trả về false trước khi reset vị trí.)
    useEffect(() => {
        const shouldSwap = half === 2

        if (state.sidesSwapped === shouldSwap) return

        state.sidesSwapped = shouldSwap

        if (shouldSwap) {
            // Phase 29F: đếm lại thời gian chờ máy đá thay từ đầu hiệp 2.
            state.idleTime = 0
            halftimeRecovery(state)
            resetPositions(ctx, 'red')
            state.timers.goalCooldown = 1
            onActionMessage('SECOND HALF - TEAMS SWITCH ENDS')
        }
    }, [half, ctx, state, onActionMessage])

    // Bắt đầu lại trận (trận mới, trận tiếp theo trong giải...).
    useEffect(() => {
        if (resetKeyRef.current === resetKey) return

        resetKeyRef.current = resetKey

        setSentOff([])
        state.sentOff = {}
        state.cards = {}
        state.matchEnded = false
        state.sidesSwapped = false
        state.timers.goalCooldown = 1
        state.stats = createMatchStats()
        resetMatchProgress(state)
        resetStamina(ctx)
        // Phase 29F: trận mới — người chơi điều khiển lại từ đầu.
        state.autoPilot = false
        state.idleTime = 0

        resetPositions(ctx, 'blue')
        onActionMessage('MATCH RESTARTED')
    }, [resetKey, ctx, state, onActionMessage])

    // Phím hành động: S/W/A/D giữ để lấy lực, nhả để đá; Q đổi người;
    // Space tắc bóng; A (khi phòng ngự) hoặc Ctrl xoạc.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (!ctx.isPlaying) return
            // Phase 29D: luân lưu chỉ dùng D (sút) và phím mũi tên.
            if (ctx.state.shootout && event.code !== 'KeyD' && !event.code.startsWith('Arrow')) return

            // Bấm phím bất kỳ: lấy lại quyền điều khiển nếu máy đang đá thay.
            noteUserInput(ctx)
            handleKeyDown(ctx, event)
        }

        const onKeyUp = (event) => {
            if (!ctx.isPlaying) {
                ctx.state.charge = null
                return
            }

            noteKeyActivity(ctx)
            handleKeyUp(ctx, event)
        }

        // Mất focus (chuyển cửa sổ, bộ gõ bật popup...): bỏ cú đá đang lấy lực.
        const onBlur = () => cancelCharge(ctx)

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        window.addEventListener('blur', onBlur)
        // Phase 29A3: nút cảm ứng đổi kiểu đá giữa chừng (PASS → vuốt lên = chuyền
        // bổng): bỏ cú đá đang lấy lực mà không đá.
        window.addEventListener('ufm:cancel-charge', onBlur)

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
            window.removeEventListener('blur', onBlur)
            window.removeEventListener('ufm:cancel-charge', onBlur)
        }
    }, [ctx])

    // Phase 29F: nút AUTO / màn nghỉ giữa hiệp bật / tắt máy đá thay.
    const autoPilotNonce = useRef(null)

    useEffect(() => {
        if (!autoPilotCommand || autoPilotNonce.current === autoPilotCommand.nonce) return

        autoPilotNonce.current = autoPilotCommand.nonce
        setAutoPilot(ctx, autoPilotCommand.on)
    }, [autoPilotCommand, ctx])

    // Phase 29D: bắt đầu / dừng loạt luân lưu theo lệnh từ GameScene.
    const shootoutNonce = useRef(null)

    useEffect(() => {
        if (!shootoutCommand || shootoutNonce.current === shootoutCommand.nonce) return

        shootoutNonce.current = shootoutCommand.nonce

        if (shootoutCommand.type === 'start') {
            startShootout(ctx, { first: shootoutCommand.first, kicks: shootoutCommand.kicks || [] })
        } else {
            stopShootout(ctx)
        }
    }, [shootoutCommand, ctx])

    // Phase 42: bắt đầu / đổi / dừng bài tập. Chờ bóng và cầu thủ sẵn sàng.
    const trainingNonce = useRef(null)

    useEffect(() => {
        if (!trainingCommand || trainingNonce.current === trainingCommand.nonce) return undefined

        let timer = null
        const run = () => {
            const ready = ballRef.current && ctx.players.every((item) => ctx.objects[item.id])

            if (!ready) {
                timer = setTimeout(run, 150)
                return
            }

            trainingNonce.current = trainingCommand.nonce

            if (trainingCommand.type === 'start') startTraining(ctx, trainingCommand.drill, trainingCommand.options || {})
            else stopTraining(ctx)
        }

        run()

        return () => clearTimeout(timer)
    }, [trainingCommand, ctx])

    // Vòng lặp chính: chạy 1 bước logic ngay TRƯỚC mỗi bước vật lý của
    // Rapier (Physics timeStep = FIXED_STEP). Logic và vật lý luôn đi cùng
    // nhịp, nên giữa hai bước logic bóng luôn đã di chuyển — kể cả khi FPS thấp.
    useBeforePhysicsStep(() => {
        const ball = ballRef.current

        if (!ball) return

        // Trọng tài đã thổi còi hết hiệp / hết trận: chạy hoạt cảnh, đứng yên
        // sau khi xong cho tới khi GameScene chuyển màn.
        if (state.whistle) {
            if (!state.whistle.done) stepWhistle(ctx, FIXED_STEP)
            else ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
            return
        }

        if (!ctx.isPlaying || state.matchEnded) {
            ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
            return
        }

        stepMatch(ctx, FIXED_STEP)
    })

    // Phase 29B: tiếng khán giả to dần khi bóng tới gần khung thành (4 lần/giây).
    const crowdTimer = useRef(0)

    useFrame((_, delta) => {
        crowdTimer.current += delta

        if (crowdTimer.current < 0.25) return

        crowdTimer.current = 0

        const position = ballRef.current?.translation()

        if (!position || !ctx.isPlaying) return

        crowdIntensity(clamp((Math.abs(position.z) - 22) / 28, 0, 1))
    })

    return (
        <>
            <color attach="background" args={['#10251d']} />
            <fog attach="fog" args={['#10251d', 110, 190]} />

            <ambientLight intensity={1.15} />

            <directionalLight
                position={[-25, 45, 20]}
                intensity={2.2}
                castShadow={quality !== 'low'}
                shadow-mapSize={[2048, 2048]}
            />

            <FixedCamera ballRef={ballRef} matchState={state} />

            <Stadium
                quality={quality}
                colors={[
                    roster.find((team) => team.id === 'blue')?.color || '#c8102e',
                    roster.find((team) => team.id === 'red')?.color || '#00b2a9',
                ]}
            />
            <Pitch />
            <GroundCollider />
            <Ball bodyRef={ballRef} />
            <PassTargetMarker matchState={state} />
            <BallScreenTracker ballRef={ballRef} matchState={state} />
            <SelectedPlayerIndicator
                matchState={state}
                playerRefs={playerRefs}
                selectedId={selectedId}
            />

            {(departing && !byId.has(departing.id) ? [...players, departing] : players).map((player) => {
                const team = roster.find((item) => item.id === player.teamId)

                return (
                    <Player
                        key={player.id}
                        player={player}
                        teamColor={team.color}
                        kit={team.kit}
                        keeperKit={team.keeperKit}
                        matchState={state}
                        labelMode={labelMode}
                        isSelected={selectedId === player.id}
                        onSelect={player.teamId === 'blue' ? onSelect : undefined}
                        onReady={registerPlayer}
                        quality={quality}
                    />
                )
            })}

            {/* Bóng mờ dưới chân: tốn GPU nhất → tắt khi LOW. */}
            {quality !== 'low' && (
                <ContactShadows
                    position={[0, -0.04, 0]}
                    opacity={0.25}
                    scale={115}
                    blur={2.5}
                    far={12}
                />
            )}
        </>
    )
}
