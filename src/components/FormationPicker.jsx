import { FORMATIONS, FORMATION_INFO } from '../data/teams'

// Chọn sơ đồ: mỗi sơ đồ là một ô có sân nhỏ vẽ 11 vị trí (tấn công lên trên).
// compact: ô nhỏ hơn, không có mô tả (màn nghỉ giữa hiệp).
const GROUP_COLOR = {
    GK: '#f0c928',
    DF: '#7cc4ff',
    MF: '#b9ed70',
    FW: '#ff8a7a',
}

function groupOf(position) {
    if (position === 'GK') return 'GK'
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return 'DF'
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return 'MF'

    return 'FW'
}

// Toạ độ sân (x −30…30, z −50…50, đội mình tấn công về z âm) → SVG 60 × 80.
const toSvg = (x, z) => [30 + x, (z + 50) * 0.8]

export function FormationDiagram({ formationKey }) {
    const slots = FORMATIONS[formationKey] || []

    return (
        <svg className="formation-diagram" viewBox="0 0 60 80" aria-hidden="true">
            <rect x="1" y="1" width="58" height="78" rx="3" className="formation-diagram__pitch" />
            <line x1="1" y1="40" x2="59" y2="40" className="formation-diagram__line" />
            <circle cx="30" cy="40" r="7" className="formation-diagram__line" />
            <rect x="16" y="1" width="28" height="11" className="formation-diagram__line" />
            <rect x="16" y="68" width="28" height="11" className="formation-diagram__line" />
            {slots.map(([position, x, z], index) => {
                const [cx, cy] = toSvg(x, z)

                return (
                    <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r="3.4"
                        fill={GROUP_COLOR[groupOf(position)]}
                        stroke="rgba(0,0,0,0.55)"
                        strokeWidth="0.8"
                    />
                )
            })}
        </svg>
    )
}

export default function FormationPicker({ value, onChange, compact = false }) {
    return (
        <div className={`formation-picker${compact ? ' formation-picker--compact' : ''}`} role="radiogroup" aria-label="Formation">
            {Object.keys(FORMATIONS).map((key) => (
                <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    className={`formation-tile${value === key ? ' is-active' : ''}`}
                    onClick={() => onChange(key)}
                    title={FORMATION_INFO[key] ? `${FORMATION_INFO[key].name} · ${FORMATION_INFO[key].note}` : key}
                >
                    <FormationDiagram formationKey={key} />
                    <b>{key}</b>
                    {!compact && <small>{FORMATION_INFO[key]?.name}</small>}
                </button>
            ))}
        </div>
    )
}
