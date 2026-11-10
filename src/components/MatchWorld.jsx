import { useCallback, useEffect, useMemo, useRef } from 'react'
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
import Player from './Player'

import { FIXED_STEP, TACTICS, clamp } from '../systems/constants'
import { getRole } from '../systems/roster'
import {
    createMatchState,
    facingFor,
    homePosition,
} from '../systems/matchState'
import { attachBallToPlayer } from '../systems/ball'
import { resetPositions } from '../systems/rules'
import { handleKeyDown, handleKeyUp } from '../systems/control'
import { stepMatch } from '../systems/matchEngine'

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
            arrowRef.current.position.y = 2.75 + Math.sin(clock.current * 5) * 0.1
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

            <Billboard ref={barRef} position={[0, 3.95, 0]} visible={false}>
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
}) {
    const keys = useKeyboard()

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

    const byId = useMemo(
        () => new Map(players.map((player) => [player.id, player])),
        [players],
    )

    const opponentName =
        roster.find((team) => team.id === 'red')?.name || 'RED UNITED'

    // ctx là object ổn định, được cập nhật giá trị mới nhất mỗi lần render.
    const ctx = ctxRef.current

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
        selectedId,
        isPlaying,
        opponentName,
        onSelect,
        onActionMessage,
        onGoal,
    })

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
            resetPositions(ctx, 'red')
            state.timers.goalCooldown = 1
            onActionMessage('SECOND HALF - TEAMS SWITCH ENDS')
        }
    }, [half, ctx, state, onActionMessage])

    // Bắt đầu lại trận (trận mới, trận tiếp theo trong giải...).
    useEffect(() => {
        if (resetKeyRef.current === resetKey) return

        resetKeyRef.current = resetKey

        state.matchEnded = false
        state.sidesSwapped = false
        state.timers.goalCooldown = 1

        resetPositions(ctx, 'blue')
        onActionMessage('MATCH RESTARTED')
    }, [resetKey, ctx, state, onActionMessage])

    // Phím hành động: S/W/A/D giữ để lấy lực, nhả để đá; Q đổi người;
    // Space tắc bóng; Ctrl xoạc.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (!ctx.isPlaying) return

            handleKeyDown(ctx, event)
        }

        const onKeyUp = (event) => {
            if (!ctx.isPlaying) {
                ctx.state.charge = null
                return
            }

            handleKeyUp(ctx, event)
        }

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)

        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
        }
    }, [ctx])

    // Vòng lặp chính: chạy 1 bước logic ngay TRƯỚC mỗi bước vật lý của
    // Rapier (Physics timeStep = FIXED_STEP). Logic và vật lý luôn đi cùng
    // nhịp, nên giữa hai bước logic bóng luôn đã di chuyển — kể cả khi FPS thấp.
    useBeforePhysicsStep(() => {
        const ball = ballRef.current

        if (!ball) return

        if (!ctx.isPlaying || state.matchEnded) {
            ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
            return
        }

        stepMatch(ctx, FIXED_STEP)
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
            <PassTargetMarker matchState={state} />
            <SelectedPlayerIndicator
                matchState={state}
                playerRefs={playerRefs}
                selectedId={selectedId}
            />

            {players.map((player) => {
                const team = roster.find((item) => item.id === player.teamId)

                return (
                    <Player
                        key={player.id}
                        player={player}
                        teamColor={team.color}
                        matchState={state}
                        isSelected={selectedId === player.id}
                        onSelect={player.teamId === 'blue' ? onSelect : undefined}
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
