import * as THREE from 'three'

// Kích thước sân. minX/maxX/minZ/maxZ là vùng cầu thủ được phép đứng,
// lineX/lineZ là vạch biên thật (sân 105 x 68).
export const FIELD = {
    minX: -33.4,
    maxX: 33.4,
    minZ: -51.9,
    maxZ: 51.9,
    playerRadius: 0.55,
    goalHalfWidth: 3.66,
    goalHeight: 2.44,
    lineX: 34,
    lineZ: 52.5,
    ballRadius: 0.35,
}

export const MATCH_DURATION = 360
export const MAX_SUBSTITUTIONS = 5

// Bước thời gian cố định cho cả logic trận đấu lẫn vật lý (60 lần/giây).
export const FIXED_STEP = 1 / 60

// Thời gian giữ phím để đầy thanh lực (giây).
export const CHARGE_TIME = 1

export const UP_AXIS = new THREE.Vector3(0, 1, 0)

export const TACTICS = {
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

export const clamp = (value, min, max) =>
    THREE.MathUtils.clamp(value, min, max)

export const distance2D = (a, b) =>
    Math.hypot(a.x - b.x, a.z - b.z)

// Vector hướng mặt (trục +Z local) của một object theo rotation.y.
export const facingVector = (rotationY) =>
    new THREE.Vector3(0, 0, 1).applyAxisAngle(UP_AXIS, rotationY)
