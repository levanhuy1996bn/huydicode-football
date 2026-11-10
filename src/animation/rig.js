import { CLIPS, KEEPER_READY_POSE, THROW_HOLD_POSE } from './clips'

// Các khớp của rig cầu thủ (xem quy ước góc trong clips.js).
export const JOINTS = [
    'rootY', 'rootPitch', 'rootRoll',
    'torsoPitch', 'torsoYaw', 'torsoRoll',
    'headPitch', 'headYaw',
    'lShoulderX', 'lShoulderZ', 'rShoulderX', 'rShoulderZ',
    'lElbow', 'rElbow',
    'lHipX', 'lHipZ', 'rHipX', 'rHipZ',
    'lKnee', 'rKnee',
]

export const createPose = () =>
    Object.fromEntries(JOINTS.map((joint) => [joint, 0]))

const smooth = (x) => x * x * (3 - 2 * x)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Nội suy keyframe (smoothstep giữa hai khóa liền kề).
export function sampleClip(clip, u, out = createPose()) {
    const time = clamp(u, 0, 1)
    let index = 0

    while (index < clip.length - 2 && time > clip[index + 1].t) index += 1

    const a = clip[index]
    const b = clip[Math.min(index + 1, clip.length - 1)]
    const span = b.t - a.t || 1
    const k = smooth(clamp((time - a.t) / span, 0, 1))

    JOINTS.forEach((joint) => {
        const from = a.pose[joint] ?? 0
        const to = b.pose[joint] ?? 0

        out[joint] = from + (to - from) * k
    })

    return out
}

// Vòng chạy thủ tục: sải chân, gập gối khi đưa chân, đánh tay ngược nhịp,
// nhún người, xoay thân. amount 0 = đứng, 1 = chạy nhanh.
export function locomotionPose(
    { phase, amount, sprinting, dribbling, keeper, time },
    out = createPose(),
) {
    JOINTS.forEach((joint) => { out[joint] = 0 })

    const s = Math.sin(phase)
    const c = Math.cos(phase)
    const stride = (0.35 + 0.45 * amount) * (dribbling ? 0.8 : 1) * (sprinting ? 1.12 : 1)
    const armSwing = (0.3 + 0.6 * amount) * (dribbling ? 0.8 : 1)

    out.lHipX = -stride * s * amount
    out.rHipX = stride * s * amount

    // Gối gập mạnh ở pha đưa chân về trước.
    out.lKnee = 0.1 + amount * (0.2 + 1.1 * Math.max(0, c) ** 1.5)
    out.rKnee = 0.1 + amount * (0.2 + 1.1 * Math.max(0, -c) ** 1.5)

    out.lShoulderX = armSwing * s * amount
    out.rShoulderX = -armSwing * s * amount
    out.lShoulderZ = -0.08 - 0.06 * amount
    out.rShoulderZ = 0.08 + 0.06 * amount
    out.lElbow = -(0.3 + 0.9 * amount)
    out.rElbow = -(0.3 + 0.9 * amount)

    out.rootY = amount * (0.035 * Math.abs(s) - 0.035)
    out.rootRoll = 0.03 * amount * s
    out.torsoPitch = 0.04 + 0.16 * amount + (sprinting ? 0.08 : 0) + (dribbling ? 0.08 : 0)
    out.torsoYaw = 0.1 * amount * s
    out.headPitch = dribbling ? 0.25 : -0.05 * amount

    // Đứng yên: thở nhẹ.
    const idle = 1 - amount
    out.torsoPitch += idle * 0.012 * Math.sin(time * 1.8)
    out.lKnee += idle * 0.06
    out.rKnee += idle * 0.06

    // Thủ môn đứng chờ: tư thế sẵn sàng.
    if (keeper && amount < 0.6) {
        const weight = 1 - amount / 0.6

        JOINTS.forEach((joint) => {
            out[joint] += ((KEEPER_READY_POSE[joint] ?? 0) - out[joint]) * weight
        })
    }

    return out
}

// Tính tư thế mục tiêu cho một frame.
//   entry   : state machine của cầu thủ (state, time, duration, elapsed)
//   holding : đang giơ bóng chờ ném biên
export function targetPose({
    entry,
    holding,
    locomotion,
    scratch,
    out,
}) {
    const action = entry && entry.time > 0 ? entry.state : null
    const clip = action ? CLIPS[action] : null

    if (holding && !clip) {
        JOINTS.forEach((joint) => {
            out[joint] = THROW_HOLD_POSE[joint] ?? locomotion[joint] * 0.3
        })
        return out
    }

    if (!clip) {
        JOINTS.forEach((joint) => { out[joint] = locomotion[joint] })
        return out
    }

    const u = entry.duration > 0 ? entry.elapsed / entry.duration : 1
    sampleClip(clip, u, scratch)

    // Hòa trộn vào/ra để không giật khi bắt đầu/kết thúc hành động.
    const blendIn = clamp(entry.elapsed / 0.05, 0, 1)
    const blendOut = clamp((entry.duration - entry.elapsed) / 0.08, 0, 1)
    const weight = Math.min(blendIn, blendOut)

    JOINTS.forEach((joint) => {
        out[joint] = locomotion[joint] + (scratch[joint] - locomotion[joint]) * weight
    })

    return out
}

// Áp tư thế lên các nhóm 3D (có làm mượt theo thời gian).
export function applyPose(rig, current, target, dt, rate = 24) {
    const k = Math.min(1, dt * rate)

    JOINTS.forEach((joint) => {
        current[joint] += (target[joint] - current[joint]) * k
    })

    const p = current

    if (rig.hips) {
        rig.hips.position.y = rig.hipHeight + p.rootY
        rig.hips.rotation.set(p.rootPitch, 0, p.rootRoll)
    }

    rig.torso?.rotation.set(p.torsoPitch, p.torsoYaw, p.torsoRoll)
    rig.head?.rotation.set(p.headPitch, p.headYaw, 0)

    rig.lShoulder?.rotation.set(p.lShoulderX, 0, p.lShoulderZ)
    rig.rShoulder?.rotation.set(p.rShoulderX, 0, p.rShoulderZ)
    rig.lElbow?.rotation.set(p.lElbow, 0, 0)
    rig.rElbow?.rotation.set(p.rElbow, 0, 0)

    rig.lHip?.rotation.set(p.lHipX, 0, p.lHipZ)
    rig.rHip?.rotation.set(p.rHipX, 0, p.rHipZ)
    rig.lKnee?.rotation.set(p.lKnee, 0, 0)
    rig.rKnee?.rotation.set(p.rKnee, 0, 0)
}
