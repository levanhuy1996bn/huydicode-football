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
//   gkThrow 0.30s / 0.55s = 0.55
//   punt  0.30s / 0.60s = 0.50
//
// Clip bay người của thủ môn được dựng cho hướng local +X (rootRoll âm =
// nghiêng phần trên sang +X). Hướng ngược lại được lật tự động trong
// rig.targetPose (entry.side === -1).

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

    // ---- Phase 16: thủ môn ----

    // Bay người bóng sệt: đổ người nhanh, nằm sát đất, hai tay vươn theo thân.
    diveLow: [
        { t: 0, pose: {} },
        {
            t: 0.1,
            pose: {
                rootY: -0.2, rootRoll: -0.35, lKnee: 0.9, rKnee: 0.5, lHipX: -0.3,
                lShoulderZ: -1.2, rShoulderZ: 1.4, lElbow: -0.4, rElbow: -0.3,
                torsoPitch: 0.25,
            },
        },
        {
            t: 0.3,
            pose: {
                rootY: -0.4, rootRoll: -1.42, torsoRoll: -0.15, torsoPitch: 0.15,
                lShoulderX: -0.3, rShoulderX: -0.3,
                lShoulderZ: -3.1, rShoulderZ: 2.75, lElbow: -0.1, rElbow: -0.1,
                lHipZ: -0.25, rHipZ: 0.05, lKnee: 0.25, rKnee: 0.55, headPitch: 0.1,
            },
        },
        {
            t: 0.78,
            pose: {
                rootY: -0.42, rootRoll: -1.45, torsoRoll: -0.1, torsoPitch: 0.25,
                lShoulderX: -0.6, rShoulderX: -0.5,
                lShoulderZ: -2.7, rShoulderZ: 2.5, lElbow: -1.2, rElbow: -1.1,
                lHipZ: -0.2, lKnee: 0.5, rKnee: 0.8,
            },
        },
        {
            t: 0.9,
            pose: {
                rootY: -0.3, rootRoll: -0.6, torsoPitch: 0.5,
                lHipX: -1.1, lKnee: 1.5, rHipX: -0.6, rKnee: 1.3,
                lShoulderX: -0.5, rShoulderX: -0.5, lElbow: -0.8, rElbow: -0.8,
            },
        },
        { t: 1, pose: {} },
    ],

    // Bay người tầm trung: bật người, thân gần ngang, rơi xuống nằm nghiêng.
    diveMid: [
        { t: 0, pose: {} },
        {
            t: 0.1,
            pose: {
                rootY: -0.15, rootRoll: -0.3, lKnee: 1, rKnee: 0.4, lHipX: -0.35,
                lShoulderZ: -1.4, rShoulderZ: 1.6, lElbow: -0.4, rElbow: -0.3,
                torsoPitch: 0.2,
            },
        },
        {
            t: 0.3,
            pose: {
                rootY: 0.15, rootRoll: -1.15, torsoRoll: -0.2, torsoPitch: 0.05,
                lShoulderZ: -3.15, rShoulderZ: 2.85, lElbow: -0.1, rElbow: -0.1,
                lHipZ: -0.3, rHipZ: 0.05, lKnee: 0.2, rKnee: 0.6, headPitch: -0.05,
            },
        },
        {
            t: 0.52,
            pose: {
                rootY: -0.42, rootRoll: -1.45, torsoRoll: -0.1, torsoPitch: 0.2,
                lShoulderX: -0.5, rShoulderX: -0.5,
                lShoulderZ: -2.7, rShoulderZ: 2.5, lElbow: -1.1, rElbow: -1.1,
                lHipZ: -0.2, lKnee: 0.4, rKnee: 0.8,
            },
        },
        {
            t: 0.78,
            pose: {
                rootY: -0.42, rootRoll: -1.42, torsoPitch: 0.3,
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: -2.4, rShoulderZ: 2.2, lElbow: -1.5, rElbow: -1.5,
                lKnee: 0.6, rKnee: 0.9,
            },
        },
        {
            t: 0.9,
            pose: {
                rootY: -0.3, rootRoll: -0.6, torsoPitch: 0.5,
                lHipX: -1.1, lKnee: 1.5, rHipX: -0.6, rKnee: 1.3,
                lShoulderX: -0.5, rShoulderX: -0.5, lElbow: -0.8, rElbow: -0.8,
            },
        },
        { t: 1, pose: {} },
    ],

    // Bay người bóng cao: bật cao, hai tay vươn lên góc xa, rơi xuống.
    diveHigh: [
        { t: 0, pose: {} },
        {
            t: 0.1,
            pose: {
                rootY: -0.18, rootRoll: -0.2, lKnee: 1.1, rKnee: 0.5, lHipX: -0.4,
                lShoulderX: -0.8, rShoulderX: -0.8, lElbow: -0.5, rElbow: -0.5,
                torsoPitch: 0.15,
            },
        },
        {
            t: 0.3,
            pose: {
                rootY: 0.5, rootRoll: -0.85, torsoRoll: -0.25, torsoPitch: -0.1,
                lShoulderZ: -3.2, rShoulderZ: 2.95, lElbow: -0.05, rElbow: -0.05,
                lHipZ: -0.35, lKnee: 0.3, rKnee: 0.8, headPitch: -0.3,
            },
        },
        {
            t: 0.55,
            pose: {
                rootY: -0.4, rootRoll: -1.42, torsoRoll: -0.1, torsoPitch: 0.15,
                lShoulderX: -0.4, rShoulderX: -0.4,
                lShoulderZ: -2.8, rShoulderZ: 2.6, lElbow: -0.8, rElbow: -0.8,
                lHipZ: -0.2, lKnee: 0.4, rKnee: 0.8,
            },
        },
        {
            t: 0.78,
            pose: {
                rootY: -0.42, rootRoll: -1.42, torsoPitch: 0.3,
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: -2.4, rShoulderZ: 2.2, lElbow: -1.5, rElbow: -1.5,
                lKnee: 0.6, rKnee: 0.9,
            },
        },
        {
            t: 0.9,
            pose: {
                rootY: -0.3, rootRoll: -0.6, torsoPitch: 0.5,
                lHipX: -1.1, lKnee: 1.5, rHipX: -0.6, rKnee: 1.3,
                lShoulderX: -0.5, rShoulderX: -0.5, lElbow: -0.8, rElbow: -0.8,
            },
        },
        { t: 1, pose: {} },
    ],

    // Đứng bắt bóng ngang ngực: đưa tay ra đón rồi ôm vào ngực.
    catch: [
        { t: 0, pose: {} },
        {
            t: 0.3,
            pose: {
                rootY: -0.08, lKnee: 0.35, rKnee: 0.35, lHipX: -0.2, rHipX: -0.2,
                torsoPitch: 0.15, lShoulderX: -1.45, rShoulderX: -1.45,
                lShoulderZ: 0.15, rShoulderZ: -0.15, lElbow: -0.5, rElbow: -0.5,
            },
        },
        {
            t: 0.65,
            pose: {
                rootY: -0.06, lKnee: 0.3, rKnee: 0.3, torsoPitch: 0.2,
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: 0.2, rShoulderZ: -0.2, lElbow: -1.9, rElbow: -1.9,
            },
        },
        {
            t: 1,
            pose: {
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: 0.15, rShoulderZ: -0.15, lElbow: -1.9, rElbow: -1.9,
            },
        },
    ],

    // Bắt bóng bổng: bật lên, hai tay giơ cao rồi ôm bóng xuống.
    catchHigh: [
        { t: 0, pose: {} },
        {
            t: 0.12,
            pose: { rootY: -0.12, lKnee: 0.7, rKnee: 0.7, lHipX: -0.4, rHipX: -0.4, torsoPitch: 0.15 },
        },
        {
            t: 0.38,
            pose: {
                rootY: 0.3, lKnee: 0.9, rKnee: 0.2, lHipX: -0.7, torsoPitch: -0.1,
                lShoulderX: -2.85, rShoulderX: -2.85, lShoulderZ: 0.1, rShoulderZ: -0.1,
                lElbow: -0.25, rElbow: -0.25, headPitch: -0.4,
            },
        },
        {
            t: 0.75,
            pose: {
                rootY: -0.05, lKnee: 0.3, rKnee: 0.3, torsoPitch: 0.15,
                lShoulderX: -0.8, rShoulderX: -0.8,
                lShoulderZ: 0.2, rShoulderZ: -0.2, lElbow: -1.8, rElbow: -1.8,
            },
        },
        {
            t: 1,
            pose: {
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: 0.15, rShoulderZ: -0.15, lElbow: -1.9, rElbow: -1.9,
            },
        },
    ],

    // Hốt bóng sệt: khuỵu gối, cúi người, hai tay úp xuống cỏ rồi ôm lên.
    scoop: [
        { t: 0, pose: {} },
        {
            t: 0.35,
            pose: {
                rootY: -0.22, lHipX: -0.9, lKnee: 1.3, rHipX: 0.1, rKnee: 1.6,
                torsoPitch: 0.75, headPitch: 0.4,
                lShoulderX: -0.7, rShoulderX: -0.7, lShoulderZ: 0.12, rShoulderZ: -0.12,
                lElbow: -0.2, rElbow: -0.2,
            },
        },
        {
            t: 0.7,
            pose: {
                rootY: -0.1, lHipX: -0.4, lKnee: 0.6, rKnee: 0.6, torsoPitch: 0.3,
                lShoulderX: -0.7, rShoulderX: -0.7, lShoulderZ: 0.2, rShoulderZ: -0.2,
                lElbow: -1.9, rElbow: -1.9,
            },
        },
        {
            t: 1,
            pose: {
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: 0.15, rShoulderZ: -0.15, lElbow: -1.9, rElbow: -1.9,
            },
        },
    ],

    // Ném tay: tay phải vung vòng qua đầu, bước chân trái lên.
    gkThrow: [
        {
            t: 0,
            pose: {
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: 0.15, rShoulderZ: -0.15, lElbow: -1.9, rElbow: -1.9,
            },
        },
        {
            t: 0.3,
            pose: {
                rShoulderX: 0.9, rShoulderZ: 0.35, rElbow: -0.6,
                lShoulderX: -1.4, lElbow: -0.3, torsoYaw: 0.45, torsoPitch: -0.15,
                rHipX: 0.25, lHipX: -0.2, rKnee: 0.3,
            },
        },
        {
            t: 0.55,
            pose: {
                rShoulderX: -2.6, rShoulderZ: 0.2, rElbow: -0.25,
                lShoulderX: -0.4, lShoulderZ: -0.4, lElbow: -0.5,
                torsoYaw: -0.25, torsoPitch: 0.15,
                lHipX: -0.5, lKnee: 0.25, rHipX: 0.35, rKnee: 0.3,
            },
        },
        {
            t: 0.78,
            pose: {
                rShoulderX: -1.2, rElbow: -0.2, lShoulderX: 0.2, lShoulderZ: -0.4,
                torsoYaw: -0.35, torsoPitch: 0.3, lHipX: -0.4, lKnee: 0.3, rHipX: 0.3,
            },
        },
        { t: 1, pose: {} },
    ],

    // Phát bóng bằng chân (vô-lê): thả bóng trước người rồi vung chân phải lên cao.
    punt: [
        {
            t: 0,
            pose: {
                lShoulderX: -0.7, rShoulderX: -0.7,
                lShoulderZ: 0.15, rShoulderZ: -0.15, lElbow: -1.9, rElbow: -1.9,
            },
        },
        {
            t: 0.3,
            pose: {
                lShoulderX: -1.2, rShoulderX: -1.2, lElbow: -0.3, rElbow: -0.3,
                rHipX: 0.65, rKnee: 1.25, lKnee: 0.3, torsoPitch: 0.1, headPitch: 0.3,
            },
        },
        {
            t: 0.5,
            pose: {
                rHipX: -1.35, rKnee: 0.15, lKnee: 0.15, torsoPitch: -0.3, rootPitch: -0.05,
                lShoulderX: -0.6, lShoulderZ: -1, rShoulderX: 0.3, rShoulderZ: 0.9,
                lElbow: -0.3, rElbow: -0.3, headPitch: 0.1,
            },
        },
        {
            t: 0.72,
            pose: {
                rHipX: -1.75, rKnee: 0.1, lKnee: 0.1, torsoPitch: -0.35, rootY: 0.05,
                lShoulderX: -0.8, lShoulderZ: -1.1, rShoulderX: 0.4, rShoulderZ: 1,
            },
        },
        { t: 1, pose: {} },
    ],

    // ---- Hết trận (whistle.js) ----

    // Ăn mừng: khuỵu gối lấy đà rồi bật nhảy, hai tay giơ cao.
    celebrate: [
        { t: 0, pose: { lShoulderX: -2.4, rShoulderX: -2.4, lShoulderZ: -0.3, rShoulderZ: 0.3 } },
        {
            t: 0.3,
            pose: {
                rootY: -0.16, lKnee: 0.9, rKnee: 0.9, lHipX: -0.55, rHipX: -0.55, torsoPitch: 0.25,
                lShoulderX: -1.6, rShoulderX: -1.6, lShoulderZ: -0.4, rShoulderZ: 0.4,
                lElbow: -0.6, rElbow: -0.6,
            },
        },
        {
            t: 0.55,
            pose: {
                rootY: 0.38, lKnee: 0.25, rKnee: 0.5, lHipX: -0.2, torsoPitch: -0.2,
                lShoulderX: -2.95, rShoulderX: -2.95, lShoulderZ: -0.35, rShoulderZ: 0.35,
                lElbow: -0.15, rElbow: -0.15, headPitch: -0.45,
            },
        },
        {
            t: 0.8,
            pose: {
                rootY: -0.06, lKnee: 0.45, rKnee: 0.45, lHipX: -0.25, rHipX: -0.25,
                lShoulderX: -2.6, rShoulderX: -2.6, lShoulderZ: -0.3, rShoulderZ: 0.3,
                lElbow: -0.3, rElbow: -0.3, headPitch: -0.2,
            },
        },
        { t: 1, pose: { lShoulderX: -2.4, rShoulderX: -2.4, lShoulderZ: -0.3, rShoulderZ: 0.3 } },
    ],

    // Thất vọng: cúi gập người, hai tay chống gối, đầu cúi.
    dejected: [
        { t: 0, pose: {} },
        {
            t: 0.15,
            pose: {
                rootY: -0.12, torsoPitch: 0.95, headPitch: 0.45,
                lKnee: 0.55, rKnee: 0.55, lHipX: -0.45, rHipX: -0.45,
                lShoulderX: -0.85, rShoulderX: -0.85, lShoulderZ: 0.12, rShoulderZ: -0.12,
                lElbow: -0.15, rElbow: -0.15,
            },
        },
        {
            t: 0.9,
            pose: {
                rootY: -0.13, torsoPitch: 1, headPitch: 0.5,
                lKnee: 0.58, rKnee: 0.58, lHipX: -0.47, rHipX: -0.47,
                lShoulderX: -0.9, rShoulderX: -0.9, lShoulderZ: 0.12, rShoulderZ: -0.12,
                lElbow: -0.12, rElbow: -0.12,
            },
        },
        { t: 1, pose: { torsoPitch: 0.3, headPitch: 0.35 } },
    ],

    // Vỗ tay (hòa / cảm ơn khán giả).
    clap: [
        {
            t: 0,
            pose: {
                lShoulderX: -1.15, rShoulderX: -1.15, lShoulderZ: 0.35, rShoulderZ: -0.35,
                lElbow: -1.3, rElbow: -1.3, headPitch: -0.1,
            },
        },
        {
            t: 0.25,
            pose: {
                lShoulderX: -1.2, rShoulderX: -1.2, lShoulderZ: 0.72, rShoulderZ: -0.72,
                lElbow: -1.35, rElbow: -1.35, headPitch: -0.1,
            },
        },
        {
            t: 0.5,
            pose: {
                lShoulderX: -1.15, rShoulderX: -1.15, lShoulderZ: 0.35, rShoulderZ: -0.35,
                lElbow: -1.3, rElbow: -1.3, headPitch: -0.1,
            },
        },
        {
            t: 0.75,
            pose: {
                lShoulderX: -1.2, rShoulderX: -1.2, lShoulderZ: 0.72, rShoulderZ: -0.72,
                lElbow: -1.35, rElbow: -1.35, headPitch: -0.1,
            },
        },
        {
            t: 1,
            pose: {
                lShoulderX: -1.15, rShoulderX: -1.15, lShoulderZ: 0.35, rShoulderZ: -0.35,
                lElbow: -1.3, rElbow: -1.3, headPitch: -0.1,
            },
        },
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

// Thủ môn ôm bóng trước ngực chờ phát bóng.
export const GK_HOLD_POSE = {
    lShoulderX: -0.7, rShoulderX: -0.7, lShoulderZ: 0.15, rShoulderZ: -0.15,
    lElbow: -1.9, rElbow: -1.9, torsoPitch: 0.06, headPitch: -0.05,
    lKnee: 0.08, rKnee: 0.08,
}

// Che bóng (Phase 17): hạ thấp trọng tâm, dang tay giữ khoảng cách, cúi nhìn bóng.
export const SHIELD_POSE = {
    rootY: -0.13, lKnee: 0.65, rKnee: 0.65, lHipX: -0.4, rHipX: -0.4,
    lHipZ: -0.16, rHipZ: 0.16, torsoPitch: 0.32, headPitch: 0.2,
    lShoulderX: 0.3, rShoulderX: 0.3, lShoulderZ: -0.95, rShoulderZ: 0.95,
    lElbow: -0.55, rElbow: -0.55,
}

// Tì vai (Phase 17): cộng thêm vào dáng chạy khi đang đấu sức.
export const JOSTLE_OFFSET = {
    lShoulderZ: -0.45, rShoulderZ: 0.45, lElbow: -0.3, rElbow: -0.3,
    torsoPitch: 0.1, rootY: -0.03,
}
