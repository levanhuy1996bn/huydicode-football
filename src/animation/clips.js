// Clip hoạt ảnh dạng keyframe cho cầu thủ (Phase 15).
//
// Mỗi clip là danh sách khóa { t, pose } với t chuẩn hóa 0..1 theo thời lượng
// hành động (xem ACTION_DURATIONS trong systems/playerState.js). Khớp nào
// không ghi trong pose thì coi như 0 (tư thế trung tính).
//
// Quy ước góc (radian, hệ trục local, cầu thủ nhìn về +Z):
//   rootY            hạ/nâng hông (m)
//   rootPitch        ngả cả người: + về trước, − ra sau
//   rootRoll         nghiêng sang bên
//   torsoPitch/Yaw/Roll  thân trên quanh eo
//   headPitch/Yaw    đầu
//   lShoulderX/rShoulderX  − đưa tay ra trước/lên, + ra sau
//   lShoulderZ/rShoulderZ  dang tay: trái −, phải +
//   lElbow/rElbow    gập khuỷu (− = cẳng tay ra trước)
//   lHipX/rHipX      − đá chân ra trước, + đưa ra sau
//   lHipZ/rHipZ      dang chân: trái −, phải +
//   lKnee/rKnee      gập gối (+)
//
// Điểm chạm bóng của các clip đá phải khớp KICK_WINDUP trong systems/ball.js:
//   pass  0.12s / 0.40s = 0.30
//   cross 0.16s / 0.48s = 0.33
//   shoot 0.18s / 0.55s = 0.33
//   throw 0.22s / 0.50s = 0.44

export const CLIPS = {
    pass: [
        { t: 0, pose: {} },
        {
            t: 0.18,
            pose: {
                rHipX: 0.55, rKnee: 1.05, lKnee: 0.28, rootY: -0.03,
                torsoPitch: 0.06, torsoYaw: 0.15,
                lShoulderX: -0.3, lShoulderZ: -0.5, rShoulderX: 0.3, rShoulderZ: 0.25,
                lElbow: -0.4, rElbow: -0.4, headPitch: 0.25,
            },
        },
        {
            t: 0.3,
            pose: {
                rHipX: -0.55, rKnee: 0.25, lKnee: 0.32, rootY: -0.04,
                torsoPitch: 0.04, torsoYaw: -0.1,
                lShoulderX: 0.1, lShoulderZ: -0.6, rShoulderZ: 0.3,
                lElbow: -0.4, rElbow: -0.4, headPitch: 0.3,
            },
        },
        {
            t: 0.55,
            pose: {
                rHipX: -0.85, rKnee: 0.15, lKnee: 0.25, torsoPitch: -0.04,
                lShoulderZ: -0.45, rShoulderZ: 0.2, headPitch: 0.1,
            },
        },
        { t: 1, pose: {} },
    ],

    // Chuyền bổng / tạt bóng: ngả người ra sau, vung chân cao hơn.
    cross: [
        { t: 0, pose: {} },
        {
            t: 0.2,
            pose: {
                rHipX: 0.75, rKnee: 1.3, lKnee: 0.35, rootY: -0.05,
                torsoPitch: 0.05, torsoYaw: 0.25,
                lShoulderX: -0.35, lShoulderZ: -0.8, rShoulderX: 0.45, rShoulderZ: 0.35,
                lElbow: -0.3, rElbow: -0.3, headPitch: 0.2,
            },
        },
        {
            t: 0.33,
            pose: {
                rHipX: -0.75, rKnee: 0.3, rHipZ: 0.15, lKnee: 0.4, rootY: -0.05,
                torsoPitch: -0.22, torsoYaw: -0.1, rootPitch: -0.05,
                lShoulderZ: -0.95, rShoulderZ: 0.5, headPitch: 0.15,
            },
        },
        {
            t: 0.58,
            pose: {
                rHipX: -1.45, rKnee: 0.15, rHipZ: 0.25, lKnee: 0.2,
                torsoPitch: -0.28, rootPitch: -0.06, lShoulderZ: -0.8, rShoulderZ: 0.4,
            },
        },
        { t: 1, pose: {} },
    ],

    // Sút: vung chân sâu, chạm bóng, theo đà nhảy nhẹ về trước.
    shoot: [
        { t: 0, pose: {} },
        { t: 0.12, pose: { torsoYaw: 0.25, rootY: -0.02, lKnee: 0.2, rKnee: 0.3 } },
        {
            t: 0.24,
            pose: {
                rHipX: 0.95, rKnee: 1.6, lKnee: 0.38, rootY: -0.07,
                torsoPitch: 0.14, torsoYaw: 0.32,
                lShoulderX: -0.4, lShoulderZ: -0.95, rShoulderX: 0.55, rShoulderZ: 0.35,
                lElbow: -0.35, rElbow: -0.35, headPitch: 0.3,
            },
        },
        {
            t: 0.33,
            pose: {
                rHipX: -0.6, rKnee: 0.45, lKnee: 0.42, rootY: -0.06,
                torsoPitch: 0.06, torsoYaw: -0.15,
                lShoulderZ: -1, rShoulderZ: 0.4, headPitch: 0.35,
            },
        },
        {
            t: 0.5,
            pose: {
                rHipX: -1.35, rKnee: 0.1, lKnee: 0.2, rootY: 0.07,
                torsoPitch: -0.12, torsoYaw: -0.3,
                lShoulderZ: -0.85, rShoulderX: -0.4, rShoulderZ: 0.3, headPitch: 0.1,
            },
        },
        { t: 0.75, pose: { rHipX: -0.5, rKnee: 0.45, lKnee: 0.25, torsoPitch: 0.05 } },
        { t: 1, pose: {} },
    ],

    // Ném biên: bóng sau đầu → ưỡn người → vung hai tay ra trước.
    throw: [
        {
            t: 0,
            pose: {
                lShoulderX: -2.85, rShoulderX: -2.85, lElbow: -1.3, rElbow: -1.3,
                lShoulderZ: -0.15, rShoulderZ: 0.15, torsoPitch: -0.2, lKnee: 0.2, rKnee: 0.2,
            },
        },
        {
            t: 0.36,
            pose: {
                lShoulderX: -3, rShoulderX: -3, lElbow: -1.65, rElbow: -1.65,
                lShoulderZ: -0.15, rShoulderZ: 0.15, torsoPitch: -0.38,
                lKnee: 0.35, rKnee: 0.25, rHipX: 0.25, rootY: -0.03,
            },
        },
        {
            t: 0.44,
            pose: {
                lShoulderX: -1.7, rShoulderX: -1.7, lElbow: -0.25, rElbow: -0.25,
                torsoPitch: 0.22, lKnee: 0.3, rKnee: 0.15, rHipX: 0.2,
            },
        },
        {
            t: 0.7,
            pose: { lShoulderX: -0.9, rShoulderX: -0.9, lElbow: -0.1, rElbow: -0.1, torsoPitch: 0.3 },
        },
        { t: 1, pose: {} },
    ],

    // Tắc bóng đứng: khụy gối trụ, phóng chân phải chọc bóng.
    tackle: [
        { t: 0, pose: {} },
        {
            t: 0.35,
            pose: {
                rootY: -0.16, lKnee: 0.95, lHipX: -0.35, rHipX: -1.1, rHipZ: 0.35, rKnee: 0.15,
                torsoPitch: 0.32, torsoRoll: -0.15,
                lShoulderZ: -0.85, rShoulderZ: 0.7, lElbow: -0.4, rElbow: -0.4, headPitch: 0.35,
            },
        },
        {
            t: 0.7,
            pose: {
                rootY: -0.12, lKnee: 0.8, lHipX: -0.3, rHipX: -0.85, rHipZ: 0.25, rKnee: 0.25,
                torsoPitch: 0.28, lShoulderZ: -0.7, rShoulderZ: 0.55, headPitch: 0.3,
            },
        },
        { t: 1, pose: {} },
    ],

    // Tắc trượt: chúi về trước, bước vội lấy lại thăng bằng.
    stumble: [
        { t: 0, pose: {} },
        {
            t: 0.3,
            pose: {
                rootY: -0.08, rootPitch: 0.15, torsoPitch: 0.5,
                lHipX: -0.85, lKnee: 0.65, rHipX: 0.5, rKnee: 0.45,
                lShoulderX: -1, rShoulderX: -1.1, lElbow: -0.3, rElbow: -0.3,
                lShoulderZ: -0.3, rShoulderZ: 0.3,
            },
        },
        {
            t: 0.65,
            pose: {
                rootY: -0.04, torsoPitch: 0.25, lHipX: 0.4, lKnee: 0.3, rHipX: -0.55, rKnee: 0.5,
                lShoulderZ: -0.5, rShoulderZ: 0.5,
            },
        },
        { t: 1, pose: {} },
    ],

    // Xoạc bóng: hạ người nằm nghiêng, chân trái duỗi thẳng phía trước,
    // chân phải co, tay trái chống đất. (Engine cho lao tới trong 0.32s đầu.)
    slide: [
        { t: 0, pose: {} },
        {
            t: 0.12,
            pose: {
                rootY: -0.25, rootPitch: -0.4, rootRoll: 0.2,
                lHipX: -0.75, lKnee: 0.2, rKnee: 0.9, rHipX: 0.1,
                lShoulderX: 0.4, lShoulderZ: -0.5,
            },
        },
        {
            t: 0.26,
            pose: {
                rootY: -0.48, rootPitch: -0.95, rootRoll: 0.4,
                lHipX: -0.6, lKnee: 0.05, rHipX: 0.25, rKnee: 1.5,
                lShoulderX: 0.9, lShoulderZ: -0.75, lElbow: -0.2,
                rShoulderX: -0.5, rShoulderZ: 0.6, rElbow: -0.6,
                torsoPitch: 0.3, headPitch: 0.35,
            },
        },
        {
            t: 0.72,
            pose: {
                rootY: -0.48, rootPitch: -0.9, rootRoll: 0.35,
                lHipX: -0.65, lKnee: 0.1, rHipX: 0.2, rKnee: 1.45,
                lShoulderX: 0.85, lShoulderZ: -0.75, lElbow: -0.2,
                rShoulderX: -0.4, rShoulderZ: 0.5, rElbow: -0.6,
                torsoPitch: 0.3, headPitch: 0.3,
            },
        },
        { t: 1, pose: {} },
    ],

    // Bị xoạc ngã: mất thăng bằng → nằm ngửa → chống dậy.
    fallen: [
        { t: 0, pose: {} },
        {
            t: 0.15,
            pose: {
                rootY: -0.22, rootPitch: -0.6,
                lShoulderX: -1.2, rShoulderX: -1.3, lShoulderZ: -0.5, rShoulderZ: 0.5,
                lHipX: -0.5, rHipX: -0.8, rKnee: 0.4,
            },
        },
        {
            t: 0.35,
            pose: {
                rootY: -0.52, rootPitch: -1.4, rootRoll: 0.15,
                lShoulderX: -0.4, rShoulderX: -0.4, lShoulderZ: -1, rShoulderZ: 1,
                lHipX: 0.15, rHipX: -0.15, rKnee: 0.6,
            },
        },
        {
            t: 0.72,
            pose: {
                rootY: -0.52, rootPitch: -1.38, rootRoll: 0.1,
                lShoulderX: -0.3, rShoulderX: -0.3, lShoulderZ: -1, rShoulderZ: 1,
                lHipX: 0.1, rHipX: -0.25, rKnee: 0.75,
            },
        },
        {
            t: 0.88,
            pose: {
                rootY: -0.35, rootPitch: -0.4,
                lHipX: -1.2, lKnee: 1.4, rHipX: -1, rKnee: 1.2, torsoPitch: 0.6,
                lShoulderX: -0.6, rShoulderX: -0.6, lShoulderZ: -0.4, rShoulderZ: 0.4,
            },
        },
        { t: 1, pose: {} },
    ],
}

// Tư thế tĩnh: giữ bóng trên đầu chờ ném biên.
export const THROW_HOLD_POSE = {
    lShoulderX: -2.85, rShoulderX: -2.85, lElbow: -1.25, rElbow: -1.25,
    lShoulderZ: -0.15, rShoulderZ: 0.15, torsoPitch: -0.15, headPitch: -0.05,
}

// Tư thế thủ môn chờ bóng (khụy gối, dang tay).
export const KEEPER_READY_POSE = {
    rootY: -0.12, lKnee: 0.55, rKnee: 0.55, lHipX: -0.35, rHipX: -0.35,
    lHipZ: -0.12, rHipZ: 0.12, torsoPitch: 0.25, headPitch: -0.15,
    lShoulderX: -0.6, rShoulderX: -0.6, lShoulderZ: -0.45, rShoulderZ: 0.45,
    lElbow: -0.7, rElbow: -0.7,
}
