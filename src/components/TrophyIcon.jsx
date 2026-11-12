import { useId } from 'react'
import { DIFFICULTY_STARS } from '../services/trophyService'

// Phase 28B: cúp vẽ bằng SVG (kiểu dáng tự thiết kế, không sao chép cúp thật).
//   C1  — cúp bạc lớn, quai to hai bên ("bigears")
//   C2  — cúp cao thon, màu hổ phách ("tall")
//   18 giải hạng nhất — 6 dáng (crown, shield, goblet, plate, obelisk, globe)
//        × 3 chất liệu (vàng / bạc / vàng hồng), đế có dải màu cờ
//   18 giải hạng hai  — cùng dáng của nước đó, nhỏ hơn, màu đồng
// won = false → bóng mờ (chưa giành được). star = id độ khó → ngôi sao góc.
const METALS = {
    gold: ['#7a5a12', '#f9dd85', '#c8962a', '#fff3c4', '#8c6a1a'],
    silver: ['#5d6670', '#eef2f6', '#9aa4ae', '#ffffff', '#66707a'],
    rose: ['#7a3e36', '#f6c2b0', '#c47a68', '#ffe3d8', '#80463c'],
    bronze: ['#5a3418', '#e09a5e', '#9c5a28', '#f5c495', '#62391b'],
    amber: ['#7a3c0c', '#ffb760', '#d0741e', '#ffe0b0', '#82420e'],
}

const SHADE = 'rgba(0,0,0,.26)'
const SHINE = 'rgba(255,255,255,.45)'

const FOOT = 'M38 104 L42 94 H58 L62 104 Z'
const STEM = 'M46 94 L47 78 H53 L54 94 Z'

function Body({ shape, metal, line }) {
    const handle = (d, width = 4) => <path d={d} fill="none" stroke={metal} strokeWidth={width} strokeLinecap="round" />

    switch (shape) {
        case 'bigears':
            return (
                <>
                    {handle('M31 28 C6 16 2 58 38 64', 5)}
                    {handle('M69 28 C94 16 98 58 62 64', 5)}
                    <path d={FOOT} fill={metal} />
                    <path d="M46 94 L47 80 H53 L54 94 Z" fill={metal} />
                    <ellipse cx="50" cy="80" rx="7" ry="3" fill={metal} />
                    <path d="M30 22 H70 C70 50 63 72 50 78 C37 72 30 50 30 22 Z" fill={metal} />
                    <ellipse cx="50" cy="22" rx="20" ry="4" fill={metal} />
                    <ellipse cx="50" cy="22" rx="17" ry="2.6" fill={SHADE} />
                    <path d="M37 32 C37 50 41 62 47 70" fill="none" stroke={SHINE} strokeWidth="2" strokeLinecap="round" />
                    <path d="M33 66 H67" stroke={line} strokeWidth="2.5" />
                </>
            )
        case 'tall':
            return (
                <>
                    {handle('M42 26 C32 26 32 42 45 45', 3)}
                    {handle('M58 26 C68 26 68 42 55 45', 3)}
                    <path d={FOOT} fill={metal} />
                    <path d="M41 14 H59 C59 30 57 42 54 50 C58 58 59 74 56 96 H44 C41 74 42 58 46 50 C43 42 41 30 41 14 Z" fill={metal} />
                    <circle cx="50" cy="10" r="4" fill={metal} />
                    <ellipse cx="50" cy="14" rx="9" ry="2" fill={SHADE} />
                    <path d="M45 58 C44 70 44 80 46 90" fill="none" stroke={SHINE} strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M44 50 H56" stroke={line} strokeWidth="2.5" />
                </>
            )
        case 'crown':
            return (
                <>
                    {handle('M31 44 C19 44 19 62 36 65')}
                    {handle('M69 44 C81 44 81 62 64 65')}
                    <path d={FOOT} fill={metal} />
                    <path d={STEM} fill={metal} />
                    <path d="M30 38 H70 C70 60 62 72 50 76 C38 72 30 60 30 38 Z" fill={metal} />
                    <path d="M32 38 L32 20 L40 28 L50 14 L60 28 L68 20 L68 38 Z" fill={metal} />
                    <circle cx="32" cy="19" r="2.6" fill={metal} />
                    <circle cx="50" cy="13" r="2.8" fill={metal} />
                    <circle cx="68" cy="19" r="2.6" fill={metal} />
                    <path d="M30 38 H70" stroke={SHADE} strokeWidth="2" />
                    <path d="M37 44 C37 56 41 64 46 69" fill="none" stroke={SHINE} strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M33 31 H67" stroke={line} strokeWidth="2.5" />
                </>
            )
        case 'shield':
            return (
                <>
                    <path d="M40 104 L44 84 H56 L60 104 Z" fill={metal} />
                    <path d="M28 16 H72 V46 C72 64 62 74 50 82 C38 74 28 64 28 46 Z" fill={metal} />
                    <path d="M34 22 H66 V46 C66 60 58 68 50 74 C42 68 34 60 34 46 Z" fill="none" stroke={SHADE} strokeWidth="1.6" />
                    <circle cx="50" cy="45" r="9" fill="none" stroke={SHADE} strokeWidth="2" />
                    <path d="M50 40 L54.3 43.1 L52.6 48 H47.4 L45.7 43.1 Z" fill={SHADE} />
                    <path d="M34 22 H66 V28 H34 Z" fill={line} />
                    <path d="M37 32 V50" stroke={SHINE} strokeWidth="1.8" strokeLinecap="round" />
                </>
            )
        case 'goblet':
            return (
                <>
                    <circle cx="17" cy="40" r="6" fill="none" stroke={metal} strokeWidth="3" />
                    <circle cx="83" cy="40" r="6" fill="none" stroke={metal} strokeWidth="3" />
                    <path d="M36 104 L42 96 H58 L64 104 Z" fill={metal} />
                    <path d="M47 96 L48 62 H52 L53 96 Z" fill={metal} />
                    <ellipse cx="50" cy="80" rx="5" ry="2.5" fill={metal} />
                    <path d="M20 28 H80 C78 48 66 60 50 62 C34 60 22 48 20 28 Z" fill={metal} />
                    <ellipse cx="50" cy="28" rx="30" ry="4" fill={metal} />
                    <ellipse cx="50" cy="28" rx="27" ry="2.6" fill={SHADE} />
                    <path d="M28 36 C31 46 38 53 46 56" fill="none" stroke={SHINE} strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M24 40 H76" stroke={line} strokeWidth="2.5" />
                </>
            )
        case 'plate':
            return (
                <>
                    <path d="M42 104 L45 84 H55 L58 104 Z" fill={metal} />
                    <circle cx="50" cy="50" r="34" fill={metal} />
                    <circle cx="50" cy="50" r="30" fill="none" stroke={line} strokeWidth="2.5" />
                    <circle cx="50" cy="50" r="24" fill="none" stroke={SHADE} strokeWidth="2" />
                    <circle cx="50" cy="50" r="15" fill="none" stroke={SHINE} strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="6" fill={SHADE} />
                    <path d="M28 36 C32 28 40 22 48 21" fill="none" stroke={SHINE} strokeWidth="2" strokeLinecap="round" />
                </>
            )
        case 'obelisk':
            return (
                <>
                    <path d="M36 104 L40 96 H60 L64 104 Z" fill={metal} />
                    <path d="M45 52 C34 46 28 34 30 24 C36 34 42 40 46 42 Z" fill={metal} />
                    <path d="M55 52 C66 46 72 34 70 24 C64 34 58 40 54 42 Z" fill={metal} />
                    <path d="M42 96 L45 30 H55 L58 96 Z" fill={metal} />
                    <path d="M50 6 L52.9 14 L61.4 14.3 L54.7 19.5 L57.1 27.7 L50 23 L42.9 27.7 L45.3 19.5 L38.6 14.3 L47.1 14 Z" fill={metal} />
                    <path d="M44 60 H56" stroke={line} strokeWidth="2.5" />
                    <path d="M47 36 V90" stroke={SHINE} strokeWidth="1.5" strokeLinecap="round" />
                </>
            )
        case 'orbit':
            // Phase 29E: World Cup — quả cầu trên thân cúp xoắn, hai vòng quỹ đạo.
            return (
                <>
                    <path d={FOOT} fill={metal} />
                    <path d="M44 94 C44 84 41 76 43 68 C45 60 55 60 57 68 C59 76 56 84 56 94 Z" fill={metal} />
                    <path d="M45 92 C49 84 51 76 47 68" fill="none" stroke={SHADE} strokeWidth="1.5" />
                    <circle cx="50" cy="40" r="22" fill={metal} />
                    <ellipse cx="50" cy="40" rx="31" ry="9" fill="none" stroke={metal} strokeWidth="3.2" transform="rotate(-22 50 40)" />
                    <ellipse cx="50" cy="40" rx="31" ry="9" fill="none" stroke={line} strokeWidth="2" transform="rotate(28 50 40)" />
                    <path d="M36 30 C40 22 48 19 55 20" fill="none" stroke={SHINE} strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M42 64 H58" stroke={line} strokeWidth="2.5" />
                </>
            )
        case 'globe':
        default:
            return (
                <>
                    {handle('M36 57 C30 45 33 37 40 34', 3.5)}
                    {handle('M64 57 C70 45 67 37 60 34', 3.5)}
                    <path d={FOOT} fill={metal} />
                    <path d={STEM} fill={metal} />
                    <path d="M34 56 H66 C66 70 60 78 50 80 C40 78 34 70 34 56 Z" fill={metal} />
                    <circle cx="50" cy="30" r="16" fill={metal} />
                    <path d="M50 24 L55.7 28.1 L53.5 34.9 H46.5 L44.3 28.1 Z" fill={SHADE} />
                    <path d="M50 24 V15 M55.7 28.1 L64 25 M53.5 34.9 L58 42 M46.5 34.9 L42 42 M44.3 28.1 L36 25" stroke={SHADE} strokeWidth="1.4" />
                    <path d="M38 62 C39 70 43 75 47 77" fill="none" stroke={SHINE} strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M35 60 H65" stroke={line} strokeWidth="2.5" />
                </>
            )
    }
}

export default function TrophyIcon({ trophy, size = 72, won = true, star = null, title }) {
    const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const gradId = `trophy-metal-${rawId}`
    const stops = METALS[trophy.metal] || METALS.gold
    const metal = won ? `url(#${gradId})` : '#26342d'
    const [flagA, flagB] = trophy.flag || ['#ffffff', '#888888']
    const line = won ? flagB : 'rgba(255,255,255,.04)'
    const small = trophy.kind === 'second'
    const starInfo = won && star ? DIFFICULTY_STARS[star] : null

    return (
        <svg
            className={`trophy-icon${won ? '' : ' is-empty'}`}
            viewBox="0 0 100 130"
            width={size}
            height={size * 1.3}
            role="img"
            aria-label={title || trophy.name}
        >
            <defs>
                <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                    {stops.map((color, index) => (
                        <stop key={color + index} offset={`${(index / (stops.length - 1)) * 100}%`} stopColor={color} />
                    ))}
                </linearGradient>
            </defs>

            <g transform={small ? 'translate(7.5 19.5) scale(0.85)' : undefined}>
                <g stroke={won ? 'none' : 'rgba(255,255,255,.08)'} strokeWidth={won ? 0 : 1}>
                    <Body shape={trophy.shape} metal={metal} line={line} />
                </g>

                {/* Đế: cổ kim loại + bục gỗ có dải màu cờ */}
                <rect x="34" y="103" width="32" height="9" rx="1.5" fill={metal} />
                <path d="M26 112 H74 L78 126 H22 Z" fill={won ? '#2b2118' : '#1d2723'} />
                <path d="M26 112 H74 L74.6 114 H25.4 Z" fill={won ? 'rgba(255,255,255,.12)' : 'transparent'} />
                {won && (
                    <>
                        <rect x="32" y="117" width="18" height="4" fill={flagA} />
                        <rect x="50" y="117" width="18" height="4" fill={flagB} />
                    </>
                )}
            </g>

            {starInfo && (
                <path
                    d="M86 4 L89.2 12.4 L98 12.7 L91 18.2 L93.6 26.8 L86 21.8 L78.4 26.8 L81 18.2 L74 12.7 L82.8 12.4 Z"
                    fill={starInfo.color}
                    stroke="#1a1a1a"
                    strokeWidth="1.2"
                >
                    <title>{`Won on ${starInfo.label}`}</title>
                </path>
            )}
        </svg>
    )
}
