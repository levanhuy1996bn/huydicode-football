// Phase 26C: chiều cao / cân nặng của cầu thủ và ảnh hưởng trong trận.
//
// - Mỗi cầu thủ có height (cm) / weight (kg). Ngôi sao tên thật dùng số liệu
//   gần đúng (data/starPhysique.js); còn lại sinh cố định theo playerId + vị
//   trí (cùng một người → mọi thẻ cùng số đo; không cần lưu).
// - Ảnh hưởng nhỏ (vài điểm / vài cm), chỉ số chính vẫn quyết định là chính:
//     cao   → mạnh hơn, tranh bóng bổng / tầm với tốt hơn, nhưng xoay người,
//             thăng bằng, tăng tốc kém hơn; thủ môn cao: bay người xa hơn,
//             phản xạ chậm hơn một chút.
//     thấp  → ngược lại (khéo, xoay nhanh, khó bị đẩy ngã... nhưng thua bóng bổng).
//     nặng  → tì đè mạnh hơn, tăng tốc / bền bỉ kém hơn; nhẹ thì ngược lại.
// File không import gì để data/ và systems/ cùng dùng được.

function hash(text) {
    let value = 2166136261

    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }

    return value
}

const roll = (seed) => (hash(seed) % 100000) / 100000
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Chiều cao trung bình / độ lệch theo nhóm vị trí.
const HEIGHT_BY_GROUP = {
    GK: [191, 4.5],
    CB: [187, 4.5],
    FB: [178, 4.5],
    DM: [182, 4.5],
    CM: [179, 4.5],
    AM: [176, 4.5],
    WG: [175, 5],
    ST: [183, 6],
}

function group(position) {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'
    if (value === 'CB') return 'CB'
    if (['LB', 'RB', 'LWB', 'RWB'].includes(value)) return 'FB'
    if (value === 'CDM') return 'DM'
    if (['CAM', 'AM'].includes(value)) return 'AM'
    if (['LW', 'RW', 'LM', 'RM'].includes(value)) return 'WG'
    if (['ST', 'CF', 'FW'].includes(value)) return 'ST'

    return 'CM'
}

// Cân nặng "chuẩn" theo chiều cao (BMI ≈ 22.8 của cầu thủ).
export const expectedWeight = (height) => 22.8 * (height / 100) ** 2

// Sinh số đo cố định từ một seed (playerId) + vị trí.
export function generatePhysique(seed, position) {
    const key = String(seed || 'player')
    const [mean, spread] = HEIGHT_BY_GROUP[group(position)]
    // Tổng 3 số ngẫu nhiên ≈ phân phối chuẩn (đa số gần trung bình).
    const bell = roll(`${key}:h1`) + roll(`${key}:h2`) + roll(`${key}:h3`) - 1.5
    const height = Math.round(clamp(mean + bell * spread * 2, 160, 203))
    const sturdy = group(position) === 'GK' || group(position) === 'CB' ? 0.5 : 0
    const bmi = 21.3 + roll(`${key}:w`) * 2.8 + sturdy
    const weight = Math.round(bmi * (height / 100) ** 2)

    return { height, weight }
}

const cache = new Map()

// Số đo của một cầu thủ (dùng số đã lưu nếu có, không thì sinh).
export function physiqueOf(player) {
    if (!player) return { height: 181, weight: 75 }
    if (player.height && player.weight) return { height: player.height, weight: player.weight }

    const seed = player.playerId || player.id || player.name
    const key = `${seed}|${player.position}`

    if (!cache.has(key)) {
        if (cache.size > 2000) cache.clear()
        cache.set(key, generatePhysique(seed, player.position))
    }

    const generated = cache.get(key)

    return { height: player.height || generated.height, weight: player.weight || generated.weight }
}

// Bổ sung height / weight cho một cầu thủ (thẻ cũ, danh mục, đội hình gốc).
export function withPhysique(player) {
    if (!player || (player.height && player.weight)) return player

    return { ...player, ...physiqueOf(player) }
}

// Độ cao / độ nặng chuẩn hoá (−1.5 … +1.5): 10 cm so với chiều cao tham
// chiếu (thủ môn 189, cầu thủ khác 181), 6 kg so với cân nặng chuẩn.
export function bodyFactors(player) {
    const { height, weight } = physiqueOf(player)
    const keeper = group(player?.position) === 'GK'

    return {
        tall: clamp((height - (keeper ? 189 : 181)) / 10, -1.5, 1.5),
        heavy: clamp((weight - expectedWeight(height)) / 6, -1.5, 1.5),
        height,
        weight,
    }
}

// Điểm cộng / trừ vào chỉ số con (attributes.js gọi khi tính chỉ số chi tiết).
export const PHYSIQUE_EFFECT = {
    strength: { tall: 2, heavy: 3 },
    balance: { tall: -1.5, heavy: 1 },
    agility: { tall: -2.5, heavy: -1.5 },
    acceleration: { tall: -1.5, heavy: -1.5 },
    sprintSpeed: { tall: 0.5, heavy: -1 },
    stamina: { tall: 0, heavy: -1 },
    // Thủ môn
    diving: { tall: 2.5, heavy: 0 },
    reflexes: { tall: -2, heavy: 0 },
    handling: { tall: 1, heavy: 0 },
}

export function physiqueBonus(player) {
    const { tall, heavy } = bodyFactors(player)

    return Object.fromEntries(
        Object.entries(PHYSIQUE_EFFECT).map(([key, effect]) => [
            key,
            Math.round(effect.tall * tall + effect.heavy * heavy),
        ]),
    )
}

// Bóng bổng: độ cao tối đa khống chế được (mặc định 1.55m, ±10cm theo chiều cao).
export const aerialReach = (player) => 1.55 + clamp((physiqueOf(player).height - 181) * 0.006, -0.1, 0.12)

// Tranh bóng bổng: lợi thế (mét, trừ vào khoảng cách khi chọn người chạm bóng).
export function aerialEdge(player) {
    const { tall, heavy } = bodyFactors(player)

    return tall * 0.12 + heavy * 0.03
}

// Thủ môn: tầm với thêm (m) theo chiều cao (189cm = 0; 199cm ≈ +0.12m).
export const keeperReachBonus = (player) => clamp((physiqueOf(player).height - 189) * 0.012, -0.18, 0.18)

// Kích thước model 3D (cao / ngang) theo số đo, có phóng đại nhẹ cho dễ thấy.
export function bodyScale(player) {
    const { height, weight } = physiqueOf(player)
    const tall = 1 + ((height - 181) / 181) * 1.4
    const wide = 1 + (weight / expectedWeight(height) - 1) * 0.9

    return { height: clamp(tall, 0.88, 1.14), width: clamp(wide, 0.9, 1.12) }
}
