import { memo } from 'react'
import { kitsOf } from '../data/kits'

// Phase 29J: chân dung cầu thủ vẽ bằng code (SVG) — không có file ảnh, không
// dùng ảnh người thật. Mọi chi tiết (khuôn mặt, màu da, tóc, râu, lông mày)
// sinh cố định từ playerId nên cùng một cầu thủ luôn ra cùng một hình; áo màu
// sân nhà của CLB (thẻ của người chơi: CLB đang quản lý), có số áo. Không lưu gì vào bản lưu.
// Chỉ dùng trên thẻ lớn (mở gói, đập thẻ, xem thẻ).

function hash(text) {
    let value = 2166136261

    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }

    return value
}

// Chuỗi số ngẫu nhiên 0..1 cố định theo hạt giống.
function sequence(seed) {
    let value = hash(seed) || 1

    return () => {
        value ^= value << 13
        value ^= value >>> 17
        value ^= value << 5
        return ((value >>> 0) % 100000) / 100000
    }
}

const pick = (random, list) => list[Math.floor(random() * list.length) % list.length]

function weighted(random, weights) {
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let roll = random() * total

    for (let index = 0; index < weights.length; index += 1) {
        roll -= weights[index]
        if (roll < 0) return index
    }

    return weights.length - 1
}

// Màu da (sáng → tối) và màu tóc. Trọng số theo vùng chỉ để phân bố tự nhiên
// hơn; trong vùng nào cũng có đủ các màu.
const SKIN = ['#f6d7c3', '#eac0a2', '#d9a27c', '#b97c55', '#8d5a3b', '#5f3b27']
const HAIR = ['#1b1512', '#3a2618', '#5b3a22', '#8a5a33', '#c9a066', '#a8452a', '#9aa0a6']

const REGIONS = {
    westAfrica: { skin: [0, 0, 1, 2, 5, 6], hair: [8, 2, 0, 0, 0, 0, 0] },
    northAfrica: { skin: [0, 1, 3, 4, 2, 1], hair: [6, 4, 1, 0, 0, 0, 0] },
    eastAsia: { skin: [2, 5, 3, 1, 0, 0], hair: [9, 2, 0, 0, 0, 0, 0] },
    latin: { skin: [1, 3, 4, 3, 2, 1], hair: [5, 4, 2, 1, 0, 0, 0] },
    mixedEurope: { skin: [3, 4, 2, 2, 2, 1], hair: [3, 4, 3, 2, 1, 0, 0] },
    north: { skin: [6, 4, 1, 1, 1, 0], hair: [1, 2, 3, 3, 4, 1, 0] },
    south: { skin: [3, 5, 3, 1, 0, 0], hair: [3, 5, 3, 1, 1, 0, 0] },
}

const REGION_OF = {
    Ghana: 'westAfrica', Senegal: 'westAfrica', Nigeria: 'westAfrica', Cameroon: 'westAfrica',
    "Côte d'Ivoire": 'westAfrica', 'Ivory Coast': 'westAfrica', Mali: 'westAfrica', 'DR Congo': 'westAfrica',
    Morocco: 'northAfrica', Algeria: 'northAfrica', Egypt: 'northAfrica', Tunisia: 'northAfrica',
    Japan: 'eastAsia', 'Korea Republic': 'eastAsia', 'South Korea': 'eastAsia', Vietnam: 'eastAsia', China: 'eastAsia',
    Brazil: 'latin', Colombia: 'latin', Ecuador: 'latin', Uruguay: 'latin', Argentina: 'latin', Mexico: 'latin',
    'United States': 'mixedEurope', USA: 'mixedEurope', Canada: 'mixedEurope', England: 'mixedEurope',
    France: 'mixedEurope', Netherlands: 'mixedEurope', Belgium: 'mixedEurope', Portugal: 'mixedEurope', Australia: 'mixedEurope',
    Sweden: 'north', Denmark: 'north', Germany: 'north', Poland: 'north', Croatia: 'north', Serbia: 'north',
    Switzerland: 'north', Norway: 'north',
    Italy: 'south', Spain: 'south', Turkey: 'south', Greece: 'south',
}

const DEFAULT_SHIRTS = { gold: '#7a5a12', silver: '#4b5560', bronze: '#6b3f1f' }

// Thông số khuôn mặt của một cầu thủ (tất định).
export function portraitTraits(player) {
    const seed = String(player?.playerId || player?.id || player?.name || 'player')
    const random = sequence(seed)
    const region = REGIONS[REGION_OF[player?.nationality] || 'mixedEurope']
    const age = player?.age || 26
    let hairColor = HAIR[weighted(random, region.hair)]

    if (age >= 33 && random() < 0.25) hairColor = HAIR[6]

    const beard = weighted(random, [5, 3, 2, 2]) // 0 không, 1 lún phún, 2 quai nón, 3 dê

    return {
        skin: SKIN[weighted(random, region.skin)],
        hairColor,
        hair: weighted(random, [3, 3, 2, 2, 1, 1, 1]), // xem HAIR_STYLES
        beard: age < 21 ? Math.min(beard, 1) : beard,
        faceWidth: 19 + random() * 4,
        faceLength: 23 + random() * 4,
        jaw: random(),
        brow: random(),
        eyeGap: 7 + random() * 2,
        mouth: random(),
        headband: random() < 0.06,
    }
}

// Kiểu tóc (vẽ trên đỉnh đầu; cx = 50, đỉnh đầu ≈ top).
function Hair({ style, color, top, width }) {
    const left = 50 - width
    const right = 50 + width

    switch (style) {
        case 0: // tóc ngắn
            return <path d={`M${left - 1} ${top + 14} Q${left - 2} ${top - 3} 50 ${top - 4} Q${right + 2} ${top - 3} ${right + 1} ${top + 14} Q50 ${top + 4} ${left - 1} ${top + 14}Z`} fill={color} />
        case 1: // húi cua
            return <path d={`M${left} ${top + 10} Q${left} ${top - 1} 50 ${top - 2} Q${right} ${top - 1} ${right} ${top + 10} Q50 ${top + 3} ${left} ${top + 10}Z`} fill={color} opacity="0.85" />
        case 2: // vuốt dựng (quiff)
            return <path d={`M${left - 1} ${top + 13} Q${left - 1} ${top - 2} ${50 - 4} ${top - 8} Q${50 + 10} ${top - 12} ${right + 2} ${top + 2} L${right + 1} ${top + 13} Q50 ${top + 3} ${left - 1} ${top + 13}Z`} fill={color} />
        case 3: // xoăn
            return (
                <g fill={color}>
                    {[-14, -7, 0, 7, 14, -18, 18].map((dx, index) => (
                        <circle key={dx} cx={50 + dx} cy={top + (index > 4 ? 6 : 0) + Math.abs(dx) * 0.12} r={6.2} />
                    ))}
                </g>
            )
        case 4: // dài ngang vai
            return <path d={`M${left - 3} ${top + 34} Q${left - 6} ${top - 4} 50 ${top - 5} Q${right + 6} ${top - 4} ${right + 3} ${top + 34} L${right - 1} ${top + 34} L${right} ${top + 12} Q50 ${top + 3} ${left} ${top + 12} L${left + 1} ${top + 34}Z`} fill={color} />
        case 5: // afro
            return <ellipse cx="50" cy={top + 4} rx={width + 7} ry={14} fill={color} />
        default: // đầu trọc
            return null
    }
}

function PortraitSvg({ player, size = 96, clubId = null }) {
    const t = portraitTraits(player)
    const kitClub = clubId || player?.clubId
    const shirt = (kitClub && kitsOf(kitClub)?.home) || null
    const shirtColor = shirt?.shirt || DEFAULT_SHIRTS[player?.rarity] || '#30473b'
    const trim = shirt?.trim || '#ffffff'
    const cy = 47
    const top = cy - t.faceLength
    const jawWidth = t.faceWidth * (0.72 + t.jaw * 0.16)
    const face = `M${50 - t.faceWidth} ${cy - 6}
        Q${50 - t.faceWidth} ${top} 50 ${top}
        Q${50 + t.faceWidth} ${top} ${50 + t.faceWidth} ${cy - 6}
        Q${50 + t.faceWidth} ${cy + 12} ${50 + jawWidth * 0.55} ${cy + t.faceLength - 4}
        Q50 ${cy + t.faceLength + 2} ${50 - jawWidth * 0.55} ${cy + t.faceLength - 4}
        Q${50 - t.faceWidth} ${cy + 12} ${50 - t.faceWidth} ${cy - 6}Z`
    const eyeY = cy - 3
    const browY = eyeY - 5 - t.brow * 1.5
    const mouthY = cy + t.faceLength * 0.55
    const shade = 'rgba(0, 0, 0, 0.12)'

    return (
        <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Portrait of ${player?.name || 'player'}`}>
            {/* Vai + áo CLB */}
            <path d="M8 100 Q10 78 34 72 L66 72 Q90 78 92 100Z" fill={shirtColor} />
            <path d="M40 72 L50 82 L60 72" fill="none" stroke={trim} strokeWidth="3" strokeLinejoin="round" />
            {player?.number != null && (
                <text x="72" y="95" textAnchor="middle" fontSize="12" fontWeight="900" fill={trim} fontFamily="Inter, sans-serif">
                    {player.number}
                </text>
            )}
            {/* Cổ */}
            <path d={`M42 ${cy + t.faceLength - 8} L42 74 Q50 79 58 74 L58 ${cy + t.faceLength - 8}Z`} fill={t.skin} />
            <path d={`M42 ${cy + t.faceLength - 6} Q50 ${cy + t.faceLength + 2} 58 ${cy + t.faceLength - 6} L58 ${cy + t.faceLength - 2} Q50 ${cy + t.faceLength + 5} 42 ${cy + t.faceLength - 2}Z`} fill={shade} />
            {/* Tóc dài / afro vẽ sau đầu */}
            {(t.hair === 4 || t.hair === 5) && <Hair style={t.hair} color={t.hairColor} top={top} width={t.faceWidth} />}
            {/* Tai */}
            <ellipse cx={50 - t.faceWidth} cy={eyeY + 3} rx="3.2" ry="5" fill={t.skin} />
            <ellipse cx={50 + t.faceWidth} cy={eyeY + 3} rx="3.2" ry="5" fill={t.skin} />
            {/* Mặt */}
            <path d={face} fill={t.skin} />
            {/* Râu */}
            {(t.beard === 1 || t.beard === 2) && (
                <path
                    d={`M${50 - t.faceWidth + 1} ${cy + 2} Q${50 - t.faceWidth} ${cy + 14} ${50 - jawWidth * 0.55} ${cy + t.faceLength - 4} Q50 ${cy + t.faceLength + 3} ${50 + jawWidth * 0.55} ${cy + t.faceLength - 4} Q${50 + t.faceWidth} ${cy + 14} ${50 + t.faceWidth - 1} ${cy + 2} L${50 + t.faceWidth - 4} ${cy + 4} Q50 ${mouthY + 7} ${50 - t.faceWidth + 4} ${cy + 4}Z`}
                    fill={t.hairColor}
                    opacity={t.beard === 1 ? 0.22 : 0.85}
                />
            )}
            {t.beard === 3 && <ellipse cx="50" cy={mouthY + 6} rx="5" ry="4.5" fill={t.hairColor} opacity="0.85" />}
            {/* Mắt, lông mày */}
            <ellipse cx={50 - t.eyeGap} cy={eyeY} rx="2.6" ry="1.7" fill="#fff" />
            <ellipse cx={50 + t.eyeGap} cy={eyeY} rx="2.6" ry="1.7" fill="#fff" />
            <circle cx={50 - t.eyeGap} cy={eyeY} r="1.3" fill="#2a1d14" />
            <circle cx={50 + t.eyeGap} cy={eyeY} r="1.3" fill="#2a1d14" />
            <path d={`M${50 - t.eyeGap - 4} ${browY + 1} Q${50 - t.eyeGap} ${browY - 1.5} ${50 - t.eyeGap + 3.5} ${browY + 0.5}`} stroke={t.hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d={`M${50 + t.eyeGap - 3.5} ${browY + 0.5} Q${50 + t.eyeGap} ${browY - 1.5} ${50 + t.eyeGap + 4} ${browY + 1}`} stroke={t.hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* Mũi, miệng */}
            <path d={`M50 ${eyeY + 1} L48 ${eyeY + 9} Q50 ${eyeY + 10.5} 52 ${eyeY + 9}`} stroke={shade} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path
                d={`M${46 - t.mouth} ${mouthY} Q50 ${mouthY + 1.5 + t.mouth * 1.5} ${54 + t.mouth} ${mouthY}`}
                stroke="#7a3f33"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
            />
            {/* Tóc trên đầu */}
            {t.hair !== 4 && t.hair !== 5 && <Hair style={t.hair} color={t.hairColor} top={top} width={t.faceWidth} />}
            {t.hair === 4 && <path d={`M${50 - t.faceWidth} ${top + 12} Q50 ${top - 2} ${50 + t.faceWidth} ${top + 12} Q50 ${top + 4} ${50 - t.faceWidth} ${top + 12}Z`} fill={t.hairColor} />}
            {t.headband && <rect x={50 - t.faceWidth - 1} y={top + 7} width={t.faceWidth * 2 + 2} height="3.5" rx="1.5" fill={trim} opacity="0.9" />}
        </svg>
    )
}

// Ghi nhớ theo cầu thủ + CLB + số áo (thẻ hiện lại không phải vẽ lại).
const PlayerPortrait = memo(
    PortraitSvg,
    (a, b) =>
        a.size === b.size &&
        a.clubId === b.clubId &&
        (a.player?.playerId || a.player?.id) === (b.player?.playerId || b.player?.id) &&
        a.player?.clubId === b.player?.clubId &&
        a.player?.number === b.player?.number &&
        a.player?.rarity === b.player?.rarity,
)

export default PlayerPortrait
