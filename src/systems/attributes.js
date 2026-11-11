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

const clampStat = (value) => Math.max(15, Math.min(99, Math.round(value)))

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

// Một chỉ số chi tiết (mặc định 70 nếu thiếu cầu thủ).
export function attr(player, key) {
    if (!player) return 70

    return getAttributes(player)[key] ?? player[key] ?? player.overall ?? 70
}

// Chuẩn hóa chỉ số về 0..1 (40 → 0, 99 → 1).
export const skill01 = (value) => Math.max(0, Math.min(1, (value - 40) / 59))
