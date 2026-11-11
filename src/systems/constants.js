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

// Chiến thuật đội (Phase 18). Mỗi thông số 0..1 trừ khi ghi khác:
//   attack        dâng người khi có bóng (hậu vệ biên chồng biên khi > 0.55)
//   press         cường độ áp sát: bán kính áp sát + số người áp sát (1–3)
//   defensiveLine độ cao hàng thủ (0 = lùi sâu, 1 = dâng cao)
//   width         độ rộng đội hình (≈1)
//   speed         hệ số tốc độ di chuyển không bóng (≈1)
//   directness    0 = chuyền ngắn giữ bóng, 1 = chuyền dài/chọc khe sớm
//   tempo         0 = giữ bóng lâu chờ cơ hội, 1 = nhả bóng nhanh
//   risk          chấp nhận đường chuyền khó (hạ ngưỡng an toàn)
//   counterPress  số giây vây ráp ngay sau khi mất bóng
export const TACTICS = {
    balanced: {
        label: 'Balanced',
        summary: 'Even shape, two players press, mixed passing.',
        attack: 0.48,
        press: 0.52,
        defensiveLine: 0.5,
        width: 1,
        speed: 1,
        directness: 0.45,
        tempo: 0.5,
        risk: 0.5,
        counterPress: 2,
    },
    attacking: {
        label: 'Attacking',
        summary: 'Full-backs overlap, more players ahead of the ball, riskier passes.',
        attack: 0.9,
        press: 0.58,
        defensiveLine: 0.72,
        width: 1.08,
        speed: 1.04,
        directness: 0.55,
        tempo: 0.6,
        risk: 0.7,
        counterPress: 3,
    },
    defensive: {
        label: 'Defensive',
        summary: 'Deep, narrow block, one presser, safe short passes.',
        attack: 0.22,
        press: 0.28,
        defensiveLine: 0.2,
        width: 0.86,
        speed: 0.96,
        directness: 0.35,
        tempo: 0.4,
        risk: 0.25,
        counterPress: 0,
    },
    highPress: {
        label: 'High Press',
        summary: 'High line, three players hunt the ball, swarm after losing it.',
        attack: 0.58,
        press: 1,
        defensiveLine: 0.88,
        width: 1.04,
        speed: 1.04,
        directness: 0.5,
        tempo: 0.6,
        risk: 0.55,
        counterPress: 4,
    },
    counter: {
        label: 'Counter Attack',
        summary: 'Sit deep, then play early through balls and long passes forward.',
        attack: 0.78,
        press: 0.42,
        defensiveLine: 0.28,
        width: 1.12,
        speed: 1.12,
        directness: 0.9,
        tempo: 0.85,
        risk: 0.65,
        counterPress: 1,
    },
}

export const clamp = (value, min, max) =>
    THREE.MathUtils.clamp(value, min, max)

export const distance2D = (a, b) =>
    Math.hypot(a.x - b.x, a.z - b.z)

// Vector hướng mặt (trục +Z local) của một object theo rotation.y.
export const facingVector = (rotationY) =>
    new THREE.Vector3(0, 0, 1).applyAxisAngle(UP_AXIS, rotationY)
