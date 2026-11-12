// ---- Phase 19: chỉ số chi tiết ----
//
// Mỗi cầu thủ vẫn lưu 6 chỉ số chính (pace, shooting, passing, dribbling,
// defending, physical) + overall. Các chỉ số con được SUY RA từ chỉ số chính,
// cộng thiên hướng theo vị trí và một độ lệch nhỏ cố định theo id cầu thủ
// (tất định: cùng cầu thủ luôn ra cùng con số). Nhờ vậy:
//   - bản lưu cũ, cầu thủ trên thị trường chuyển nhượng, đội hình đối thủ
//     sinh tự động đều có chỉ số chi tiết mà không cần chuyển đổi dữ liệu;
//   - nếu sau này (Phase 19B: lên cấp, cộng điểm) cầu thủ có
//     `player.attributes.<key>` thì giá trị đó được ưu tiên.

export const ATTRIBUTE_GROUPS = [
    {
        key: 'pace',
        label: 'PAC',
        name: 'Pace',
        items: [
            ['acceleration', 'Acceleration'],
            ['sprintSpeed', 'Sprint speed'],
        ],
    },
    {
        key: 'shooting',
        label: 'SHO',
        name: 'Shooting',
        items: [
            ['finishing', 'Finishing'],
            ['shotPower', 'Shot power'],
            ['longShots', 'Long shots'],
        ],
    },
    {
        key: 'passing',
        label: 'PAS',
        name: 'Passing',
        items: [
            ['shortPassing', 'Short passing'],
            ['longPassing', 'Long passing'],
            ['vision', 'Vision'],
        ],
    },
    {
        key: 'dribbling',
        label: 'DRI',
        name: 'Dribbling',
        items: [
            ['ballControl', 'Ball control'],
            ['agility', 'Agility'],
            ['balance', 'Balance'],
        ],
    },
    {
        key: 'defending',
        label: 'DEF',
        name: 'Defending',
        items: [
            ['standingTackle', 'Standing tackle'],
            ['slidingTackle', 'Sliding tackle'],
            ['interceptions', 'Interceptions'],
            ['marking', 'Marking'],
        ],
    },
    {
        key: 'physical',
        label: 'PHY',
        name: 'Physical',
        items: [
            ['strength', 'Strength'],
            ['stamina', 'Stamina'],
            ['aggression', 'Aggression'],
        ],
    },
]

export const GOALKEEPING_GROUP = {
    key: 'goalkeeping',
    label: 'GK',
    name: 'Goalkeeping',
    items: [
        ['diving', 'Diving'],
        ['handling', 'Handling'],
        ['reflexes', 'Reflexes'],
        ['positioning', 'Positioning'],
        ['kicking', 'Kicking'],
    ],
}

// Chỉ số con → chỉ số chính mà nó dựa vào.
const PARENT = {}

ATTRIBUTE_GROUPS.forEach((group) => {
    group.items.forEach(([key]) => {
        PARENT[key] = group.key
    })
})

// Thiên hướng theo vị trí (điểm cộng/trừ vào chỉ số con).
const POSITION_BIAS = {
    GK: {},
    CB: {
        strength: 4, marking: 3, standingTackle: 2, slidingTackle: 2,
        acceleration: -3, agility: -3, longShots: -3,
    },
    FB: {
        stamina: 4, acceleration: 3, sprintSpeed: 2, slidingTackle: 2,
        strength: -2, finishing: -3,
    },
    DM: {
        interceptions: 3, stamina: 2, shortPassing: 2, strength: 2,
        finishing: -3, agility: -1,
    },
    CM: {
        stamina: 3, vision: 2, shortPassing: 2, longPassing: 1, interceptions: 1,
    },
    AM: {
        vision: 4, agility: 3, ballControl: 2, longShots: 2,
        strength: -3, slidingTackle: -3,
    },
    WG: {
        acceleration: 4, agility: 3, sprintSpeed: 2, balance: 2,
        strength: -3, marking: -3, longPassing: -1,
    },
    ST: {
        finishing: 4, shotPower: 2, strength: 2, balance: 1,
        vision: -2, marking: -4, slidingTackle: -3,
    },
}

function biasGroup(position) {
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

function hash(text) {
    let value = 2166136261

    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }

    return value
}

// Độ lệch cố định −4..+4 theo cầu thủ + chỉ số.
const variation = (id, key) => (hash(`${id}:${key}`) % 9) - 4

// Phase 25: chỉ số không còn giới hạn 99 (cộng điểm tập luyện + thẻ +N).
const clampStat = (value) => Math.max(15, Math.round(value))

const cache = new Map()

function compute(player) {
    const id = player.id || player.name || 'player'
    const group = biasGroup(player.position)
    const bias = POSITION_BIAS[group] || {}
    const overall = player.overall || 70
    const base = (key) => player[key] ?? overall
    const result = {}

    Object.entries(PARENT).forEach(([key, parent]) => {
        result[key] = clampStat(base(parent) + (bias[key] || 0) + variation(id, key))
    })

    const keeper = group === 'GK'

    GOALKEEPING_GROUP.items.forEach(([key]) => {
        if (keeper) {
            const offset = key === 'kicking' ? -6 : key === 'reflexes' ? 1 : 0

            result[key] = clampStat(overall + offset + variation(id, key))
        } else {
            result[key] = clampStat(18 + variation(id, key))
        }
    })

    // Chỉ số con do người chơi tự cộng (Phase 19B) được ưu tiên.
    if (player.attributes && typeof player.attributes === 'object') {
        Object.entries(player.attributes).forEach(([key, value]) => {
            if (typeof value === 'number') result[key] = clampStat(value)
        })
    }

    return result
}

// Toàn bộ chỉ số chi tiết của một cầu thủ.
export function getAttributes(player) {
    if (!player) return compute({})

    const key = [
        player.id, player.position, player.overall, player.pace, player.shooting,
        player.passing, player.dribbling, player.defending, player.physical,
        player.attributes ? JSON.stringify(player.attributes) : '',
    ].join('|')

    let value = cache.get(key)

    if (!value) {
        value = compute(player)
        cache.set(key, value)

        // Giới hạn bộ nhớ đệm (danh sách cầu thủ thay đổi khi chuyển nhượng).
        if (cache.size > 600) cache.delete(cache.keys().next().value)
    }

    return value
}

// Phase 25: chỉ số trên 99 vẫn có tác dụng nhưng giảm dần (diminishing
// returns). Giá trị hiệu dụng = 99 + 45 × (1 − e^(−(v − 99) / 40)):
// 110 → 109.8, 120 → 117.4, 130 → 123.3, 150 → 132.6, tối đa 144.
// (Bản đầu Phase 25: room 29.5 / scale 25 → 130 chỉ ≈ 120, quá ít.)
// Từ 99 trở xuống giữ nguyên để không đổi cân bằng cũ.
export const STAT_SOFT_CAP = { from: 99, room: 45, scale: 40 }

export function effectiveStat(value) {
    if (!(value > STAT_SOFT_CAP.from)) return value

    return STAT_SOFT_CAP.from +
        STAT_SOFT_CAP.room * (1 - Math.exp(-(value - STAT_SOFT_CAP.from) / STAT_SOFT_CAP.scale))
}

// Một chỉ số chi tiết đã quy về giá trị hiệu dụng (engine dùng hàm này).
// Mặc định 70 nếu thiếu cầu thủ. Hiển thị dùng getAttributes (giá trị thật).
export function attr(player, key) {
    if (!player) return 70

    return effectiveStat(getAttributes(player)[key] ?? player[key] ?? player.overall ?? 70)
}

// Chuẩn hóa chỉ số: 40 → 0, 99 → 1; trên 99 tiếp tục tới tối đa 1.6
// — các công thức coi > 1 là "giỏi hơn hoàn hảo".
export const skill01 = (value) => Math.max(0, Math.min(1.6, (value - 40) / 59))

// Phần vượt 99 của một giá trị hiệu dụng (đã qua attr()), chuẩn hóa:
// chỉ số thật 110 → 0.44, 120 → 0.75, 130 → 1.0. Dùng cho các phần thưởng
// riêng khi vượt 99 (constants.js → OVER_99).
export const over99 = (effective) => Math.max(0, effective - 99) / 24.3
