import { hashString, worldClub } from '../data/world'

// Phase 26A: huy hiệu tự vẽ (SVG) cho mọi CLB — hình khiên 2 màu của CLB,
// hoạ tiết chọn cố định theo id, chữ viết tắt ở giữa. Không dùng logo thật.
const SHIELD = 'M16 1.5 L29 6 V16.5 C29 24.5 23.5 29.5 16 32.5 C8.5 29.5 3 24.5 3 16.5 V6 Z'

function luminance(hex) {
    const value = parseInt(String(hex).replace('#', ''), 16)
    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255

    return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function Pattern({ type, color }) {
    switch (type) {
        case 0: // nửa dọc
            return <rect x="16" y="0" width="16" height="34" fill={color} />
        case 1: // dải ngang
            return <rect x="0" y="12" width="32" height="9" fill={color} />
        case 2: // sọc dọc
            return (
                <>
                    <rect x="7" y="0" width="5" height="34" fill={color} />
                    <rect x="20" y="0" width="5" height="34" fill={color} />
                </>
            )
        case 3: // dải chéo
            return <path d="M0 4 L8 0 L32 26 L32 34 Z" fill={color} />
        default: // chữ V
            return <path d="M0 8 L16 20 L32 8 L32 15 L16 27 L0 15 Z" fill={color} />
    }
}

export default function ClubCrest({ clubId, size = 22, className = '' }) {
    const club = worldClub(clubId)

    if (!club) return null

    const [primary, secondary] = club.colors
    const id = `crest-${club.id}`
    const type = hashString(club.id) % 5
    const label = club.shortName.slice(0, 3)
    const textColor = luminance(primary) > 0.6 ? '#151515' : '#ffffff'

    return (
        <svg
            className={`club-crest ${className}`}
            width={size}
            height={size * 1.06}
            viewBox="0 0 32 34"
            role="img"
            aria-label={`${club.fullName} crest`}
        >
            <defs>
                <clipPath id={id}>
                    <path d={SHIELD} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${id})`}>
                <rect x="0" y="0" width="32" height="34" fill={primary} />
                <Pattern type={type} color={secondary} />
            </g>
            <path d={SHIELD} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" />
            <text
                x="16"
                y="20"
                textAnchor="middle"
                fontSize={label.length > 2 ? 8.5 : 10}
                fontWeight="900"
                fill={textColor}
                stroke={textColor === '#ffffff' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)'}
                strokeWidth="0.6"
                paintOrder="stroke"
                fontFamily="inherit"
            >
                {label}
            </text>
        </svg>
    )
}
