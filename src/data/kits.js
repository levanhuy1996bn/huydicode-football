// Phase 24: bộ áo cố định của từng CLB (không có chức năng tự chỉnh màu áo).
// Mỗi CLB có 3 bộ cho cầu thủ (home / away / third: áo, quần, tất, viền) và
// 2 bộ thủ môn. Bộ thứ 3 dùng khi bị trùng màu và sau này cho các trận cúp
// châu lục / liên lục địa với CLB giải khác.
const kit = (shirt, shorts, socks, trim) => ({ shirt, shorts, socks, trim })

const GK_PALETTE = [
    kit('#f0c928', '#242b32', '#f0c928', '#fff1a6'), // vàng
    kit('#39b54a', '#1e2a22', '#39b54a', '#c9f5cf'), // xanh lá
    kit('#e4007c', '#2a1020', '#e4007c', '#ffc2e2'), // hồng
    kit('#6b7280', '#1f2329', '#6b7280', '#e5e7eb'), // xám
    kit('#ff7a1a', '#2b1a0e', '#ff7a1a', '#ffd7b8'), // cam
    kit('#7c3aed', '#1f1640', '#7c3aed', '#e0d4ff'), // tím
]

const gk = (a, b) => [GK_PALETTE[a], GK_PALETTE[b]]

export const KIT_SLOTS = ['home', 'away', 'third']
export const KIT_LABELS = { home: 'Home', away: 'Away', third: 'Third' }

export const CLUB_KITS = {
    blue: { // Manchester United
        home: kit('#da291c', '#f4f4f0', '#1d1d1d', '#ffffff'),
        away: kit('#f4f4f0', '#1d1d1d', '#f4f4f0', '#da291c'),
        third: kit('#1f1f24', '#1f1f24', '#1f1f24', '#c9a227'),
        gk: gk(1, 0),
    },
    red: { // Manchester City
        home: kit('#6cabdd', '#f4f4f0', '#6cabdd', '#ffffff'),
        away: kit('#1c2c5b', '#1c2c5b', '#1c2c5b', '#6cabdd'),
        third: kit('#f4f4f0', '#1c2c5b', '#f4f4f0', '#6cabdd'),
        gk: gk(0, 3),
    },
    northbridge: {
        home: kit('#1f7a4c', '#f4f4f0', '#1f7a4c', '#ffffff'),
        away: kit('#f4f4f0', '#1f7a4c', '#f4f4f0', '#1f7a4c'),
        third: kit('#f2c230', '#1d1d1d', '#f2c230', '#1d1d1d'),
        gk: gk(2, 3),
    },
    royal: {
        home: kit('#5b2a86', '#f4f4f0', '#5b2a86', '#e0b43b'),
        away: kit('#e0b43b', '#1d1d1d', '#e0b43b', '#5b2a86'),
        third: kit('#c9ced3', '#2b2f36', '#c9ced3', '#5b2a86'),
        gk: gk(1, 4),
    },
    london: {
        home: kit('#0d2c6c', '#0d2c6c', '#0d2c6c', '#ffffff'),
        away: kit('#f28c28', '#1d1d1d', '#f28c28', '#0d2c6c'),
        third: kit('#f4f4f0', '#0d2c6c', '#f4f4f0', '#0d2c6c'),
        gk: gk(0, 2),
    },
    wolves: {
        home: kit('#f1a91e', '#1b1b1b', '#f1a91e', '#1b1b1b'),
        away: kit('#1b1b1b', '#1b1b1b', '#1b1b1b', '#f1a91e'),
        third: kit('#1e8c93', '#f4f4f0', '#1e8c93', '#ffffff'),
        gk: gk(2, 1),
    },
    stars: {
        home: kit('#b5121b', '#b5121b', '#b5121b', '#f4f4f0'),
        away: kit('#00a398', '#f4f4f0', '#00a398', '#ffffff'),
        third: kit('#1d1d1d', '#1d1d1d', '#1d1d1d', '#f2c230'),
        gk: gk(1, 0),
    },
    eastside: {
        home: kit('#ef7d00', '#1d1d1d', '#ef7d00', '#1d1d1d'),
        away: kit('#2a5caa', '#2a5caa', '#2a5caa', '#ffffff'),
        third: kit('#f4f4f0', '#ef7d00', '#f4f4f0', '#ef7d00'),
        gk: gk(1, 5),
    },
    westham: {
        home: kit('#7a263a', '#f4f4f0', '#7a263a', '#8fc6e8'),
        away: kit('#8fc6e8', '#7a263a', '#8fc6e8', '#7a263a'),
        third: kit('#f4f4f0', '#7a263a', '#f4f4f0', '#7a263a'),
        gk: gk(0, 1),
    },
    newcastle: {
        home: kit('#121212', '#f4f4f0', '#121212', '#ffffff'),
        away: kit('#f4f4f0', '#121212', '#f4f4f0', '#121212'),
        third: kit('#4b2c71', '#4b2c71', '#4b2c71', '#e0d4ff'),
        gk: gk(1, 4),
    },
    brighton: {
        home: kit('#0057b8', '#f4f4f0', '#0057b8', '#ffffff'),
        away: kit('#ffd200', '#1d1d1d', '#ffd200', '#0057b8'),
        third: kit('#2c8a4a', '#2c8a4a', '#2c8a4a', '#ffffff'),
        gk: gk(3, 2),
    },
    foxes: {
        home: kit('#003090', '#f4f4f0', '#003090', '#fdbe11'),
        away: kit('#f4f4f0', '#003090', '#f4f4f0', '#003090'),
        third: kit('#f47c20', '#1d1d1d', '#f47c20', '#003090'),
        gk: gk(1, 0),
    },
    villa: {
        home: kit('#670e36', '#f4f4f0', '#95bfe5', '#95bfe5'),
        away: kit('#95bfe5', '#670e36', '#95bfe5', '#670e36'),
        third: kit('#f2c230', '#670e36', '#f2c230', '#670e36'),
        gk: gk(0, 1),
    },
    tottenham: {
        home: kit('#f5f5f5', '#132257', '#f5f5f5', '#132257'),
        away: kit('#132257', '#132257', '#132257', '#f5f5f5'),
        third: kit('#00a650', '#132257', '#00a650', '#f5f5f5'),
        gk: gk(4, 1),
    },
    arsenal: {
        home: kit('#db0007', '#f4f4f0', '#db0007', '#ffffff'),
        away: kit('#f4d03f', '#1b2a49', '#f4d03f', '#1b2a49'),
        third: kit('#1b2a49', '#1b2a49', '#1b2a49', '#db0007'),
        gk: gk(1, 0),
    },
    chelsea: {
        home: kit('#034694', '#034694', '#f4f4f0', '#ffffff'),
        away: kit('#f4f4f0', '#034694', '#f4f4f0', '#034694'),
        third: kit('#f6a800', '#1d1d1d', '#f6a800', '#034694'),
        gk: gk(0, 2),
    },
    everton: {
        home: kit('#003399', '#f4f4f0', '#f4f4f0', '#ffffff'),
        away: kit('#e88aa8', '#1d1d1d', '#e88aa8', '#003399'),
        third: kit('#f4f4f0', '#003399', '#f4f4f0', '#003399'),
        gk: gk(1, 4),
    },
    sunderland: {
        home: kit('#d71920', '#1d1d1d', '#1d1d1d', '#f4f4f0'),
        away: kit('#0b1f3a', '#0b1f3a', '#0b1f3a', '#d71920'),
        third: kit('#f4f4f0', '#d71920', '#f4f4f0', '#d71920'),
        gk: gk(1, 3),
    },
    burnley: {
        home: kit('#6c1d45', '#f4f4f0', '#6c1d45', '#9ac9ec'),
        away: kit('#9ac9ec', '#6c1d45', '#9ac9ec', '#6c1d45'),
        third: kit('#f2c230', '#1d1d1d', '#f2c230', '#6c1d45'),
        gk: gk(0, 1),
    },
    palace: {
        home: kit('#1b458f', '#1b458f', '#1b458f', '#c4122e'),
        away: kit('#f4f4f0', '#c4122e', '#f4f4f0', '#c4122e'),
        third: kit('#1d1d1d', '#1d1d1d', '#1d1d1d', '#c4122e'),
        gk: gk(1, 2),
    },
}

const FALLBACK = {
    home: kit('#3949ab', '#f4f4f0', '#3949ab', '#ffffff'),
    away: kit('#f4f4f0', '#3949ab', '#f4f4f0', '#3949ab'),
    third: kit('#1d1d1d', '#1d1d1d', '#1d1d1d', '#ffffff'),
    gk: gk(0, 1),
}

export const kitsOf = (clubId) => CLUB_KITS[clubId] || FALLBACK

// ---- Trùng màu ----
// Khoảng cách màu "redmean" (xấp xỉ cảm nhận của mắt) giữa hai mã hex.
function rgb(hex) {
    const value = parseInt(String(hex).replace('#', ''), 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function colorDistance(a, b) {
    const [r1, g1, b1] = rgb(a)
    const [r2, g2, b2] = rgb(b)
    const mean = (r1 + r2) / 2
    const dr = r1 - r2
    const dg = g1 - g2
    const db = b1 - b2

    return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db)
}

// Hai áo gần màu hơn mức này coi là trùng (đỏ MU ↔ đỏ Arsenal ≈ 40,
// đỏ ↔ đỏ đô ≈ 160, đỏ ↔ cam ≈ 175).
export const CLASH_DISTANCE = 165

export const kitsClash = (a, b) => colorDistance(a.shirt, b.shirt) < CLASH_DISTANCE

// Bộ áo mặc định cho một trận: đội nhà mặc áo sân nhà; đội khách mặc áo sân
// khách, trùng thì áo thứ 3, rồi tới áo sân nhà.
export function defaultKitChoice(homeId, awayId) {
    const home = kitsOf(homeId)
    const away = kitsOf(awayId)
    const awaySlot = ['away', 'third', 'home'].find((slot) => !kitsClash(home.home, away[slot])) || 'away'

    return { [homeId]: 'home', [awayId]: awaySlot }
}

// Thủ môn: bộ không trùng với áo cầu thủ hai đội và thủ môn đội kia.
export function pickKeeperKits(teamA, kitA, teamB, kitB) {
    const outfield = [kitA, kitB]
    const choose = (clubId, avoid) => {
        const options = [...kitsOf(clubId).gk, ...GK_PALETTE]

        return options.find((option) => [...outfield, ...avoid].every((other) => !kitsClash(option, other))) || options[0]
    }

    const keeperA = choose(teamA, [])
    const keeperB = choose(teamB, [keeperA])

    return { [teamA]: keeperA, [teamB]: keeperB }
}

// Bộ áo thực tế của một trận (đã chọn hoặc mặc định), cho cả thủ môn.
export function resolveMatchKits(homeId, awayId, choice = null) {
    const slots = { ...defaultKitChoice(homeId, awayId), ...(choice || {}) }
    const homeKit = kitsOf(homeId)[slots[homeId]] || kitsOf(homeId).home
    const awayKit = kitsOf(awayId)[slots[awayId]] || kitsOf(awayId).away
    const keepers = pickKeeperKits(homeId, homeKit, awayId, awayKit)

    return {
        slots,
        [homeId]: { kit: homeKit, keeper: keepers[homeId] },
        [awayId]: { kit: awayKit, keeper: keepers[awayId] },
    }
}
