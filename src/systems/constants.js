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

// Phase 22: chuyền và sút mạnh hơn (playtest: "lực chuyền, lực sút quá yếu").
// Hệ số nhân vào tốc độ bóng lúc rời chân, sau khi đã tính lực theo khoảng
// cách / thanh lực. Chỉnh ở đây để cân lại toàn bộ trận đấu.
export const KICK_POWER = {
    pass: 1.15,        // chuyền ngắn (S), cả chuyền căng ZS
    through: 1.12,     // chọc khe (W) của người chơi (tự canh lực bằng thanh lực)
    lob: 1.06,         // chuyền bổng / tạt (A) của người chơi — độ bổng giữ nguyên
    lobbedThrough: 1.05, // chọc khe bổng (QW)
    shoot: 1.12,       // sút thường / sút mạnh / sút chìm / trivela
    finesse: 1.1,      // sút xoáy ZD
    chip: 1,           // sút lốp QD: giữ nguyên để không vọt xà
    freeKick: 1.04,    // sút phạt qua hàng rào
    penalty: 1.08,
    clearance: 1.04,
    keeper: 1.04,      // thủ môn ném / phát bóng
    // Máy chọc khe / tạt vào khoảng trống theo khoảng cách đã tính sẵn: tăng
    // lực nhiều thì bóng lăn quá người nhận ra biên (mô phỏng: ném biên +60%).
    aiThrough: 1,
    aiLob: 1.02,
    maxPass: 31,       // trần tốc độ bóng sệt khi chuyền (m/s)
}

export function kickPowerScale({ action, variant, restartType, isThrowIn, clearance, isAI = false }) {
    if (isThrowIn) return 1
    if (clearance) return KICK_POWER.clearance

    if (action === 'shoot') {
        if (restartType === 'free-kick') return KICK_POWER.freeKick
        if (restartType === 'penalty') return KICK_POWER.penalty
        if (variant === 'chip') return KICK_POWER.chip
        if (variant === 'finesse') return KICK_POWER.finesse
        return KICK_POWER.shoot
    }

    if (action === 'through') {
        if (variant === 'lobbed') return KICK_POWER.lobbedThrough
        return isAI ? KICK_POWER.aiThrough : KICK_POWER.through
    }

    if (action === 'lob') return isAI ? KICK_POWER.aiLob : KICK_POWER.lob

    return KICK_POWER.pass
}

// ---- Phase 24: độ chính xác theo chỉ số ----
// Cầu thủ giỏi giữ nguyên độ chuẩn, cầu thủ kém thì kém rõ. `miss` = 1 − độ
// chính xác (0 khi chỉ số 99, ≈0.83 khi 50). Mũ `curve` > 1 làm sai số nhỏ ở
// chỉ số cao và tăng nhanh ở chỉ số thấp.
export const ACCURACY = {
    // Người chơi sút: điểm bóng tới lệch ngẫu nhiên đều trong ±spread (m).
    // Chỉ số 50 ≈ ±2.8m (trung bình lệch ~1.4m), 70 ≈ ±1.3m, 90 ≈ ±0.3m.
    shot: { base: 0.15, scale: 3.6, curve: 1.6 },
    // Sút xa (> 22m): lệch thêm mỗi mét = min + max × miss.
    longRange: { from: 22, min: 0.02, max: 0.12 },
    // Giữ lực > 80%: lệch thêm, người sút giỏi bị ảnh hưởng ít hơn.
    overPower: { from: 0.8, perUnit: 5, min: 0.4, max: 0.9 },
    // Máy sút: phân bố tam giác quanh giữa khung thành, ±spread (m).
    aiShot: { base: 2.2, scale: 5.5, curve: 1.3 },
    // Máy sút xoáy / má ngoài vào góc: lệch khỏi góc ±(base + scale × miss^curve).
    aiCorner: { base: 0.3, scale: 2.2, curve: 1.3 },
    // Độ bổng lệch thêm (m/s, 0…max) → người dứt điểm kém hay vọt xà.
    shotLift: { scale: 2.2, curve: 1.5 },
    // Giữ lực > 90%: nguy cơ vọt xà nhân với (min + (1 − kỹ năng) × max),
    // kỹ năng = trung bình Finishing + Shot power.
    sky: { min: 0.3, max: 1 },
    // Chuyền / chọc khe / tạt: góc lệch tối đa (rad) và sai lực (±tỉ lệ).
    // Chỉ số 50 ≈ ±0.156 rad, ±12% lực; 90 ≈ ±0.023 rad, ±2.6% lực.
    passAngle: { base: 0.012, scale: 0.19, curve: 1.5 },
    passPower: { base: 0.015, scale: 0.13, curve: 1.3 },
}

// miss < 0 (chỉ số trên 99, Phase 25): sai số còn nhỏ hơn mức tối thiểu,
// tới 50% base ở chỉ số hiệu dụng cao nhất (miss ≈ −0.5).
const curved = ({ base, scale, curve }, miss) =>
    miss < 0
        ? base * aboveNinetyNine(miss)
        : base + scale * Math.pow(Math.min(1, miss), curve)

// Hệ số thu nhỏ sai số khi chỉ số vượt 99 (miss < 0): 110 ≈ 0.74, 120 ≈ 0.55, 130 ≈ 0.4.
export function aboveNinetyNine(miss) {
    return miss < 0 ? Math.max(0.25, 1 + miss * 1.45) : 1
}

export const shotSpread = (accuracy) => curved(ACCURACY.shot, 1 - accuracy)
export const aiShotSpread = (accuracy) => curved(ACCURACY.aiShot, 1 - accuracy)
export const aiCornerError = (accuracy) => curved(ACCURACY.aiCorner, 1 - accuracy)
export const shotLiftError = (accuracy) =>
    ACCURACY.shotLift.scale * Math.pow(Math.max(0, 1 - accuracy), ACCURACY.shotLift.curve)
export const passAngleError = (sloppiness) => curved(ACCURACY.passAngle, sloppiness)
export const passPowerError = (sloppiness) => curved(ACCURACY.passPower, sloppiness)

// ---- Phase 25 (bổ sung): phần thưởng khi chỉ số vượt 99 ----
// o = over99(chỉ số hiệu dụng): 110 → 0.44, 120 → 0.75, 130 → 1.0.
// Mục tiêu ở 99 → 110 → 120 → 130:
//   tốc độ 9.1 → 9.6 → 10.0 → 10.4 m/s · gia tốc 20 → 22 → 24 → 26 m/s²
//   sút hết lực 40 → 42 → 44 → 46 m/s · chuyền nhanh hơn 5 / 10 / 15%
//   đỡ bóng gọn tới 21 → 24 → 27 → 30 m/s · thủ môn phản xạ 0.10 → 0.08 → 0.065 → 0.05s,
//   tầm bay +0.3 / +0.6 / +0.9m, cứu thua tối đa 85% → 92%.
export const OVER_99 = {
    topSpeed: 0.6,       // m/s cộng thêm × o (trần 10.5)
    maxSpeed: 10.5,
    acceleration: 3.1,   // m/s² × o
    shotSpeed: 5.4,      // m/s × o (sau hệ số lực)
    maxShotSpeed: 46,
    passSpeed: 0.15,     // +15% × o (chuyền sệt / chọc khe)
    control: 5.7,        // m/s × o (tốc độ bóng còn đỡ gọn được)
    keeperReaction: 0.122, // s × (skill − 1), sàn 0.05s
    minReaction: 0.05,
    keeperReach: 0.3,    // m × o
    keeperSave: 0.07,    // +7% trần cứu thua × o
    accuracyDrop: 1.45,  // sai số × max(0.25, 1 + miss × 1.45) khi miss < 0
}
