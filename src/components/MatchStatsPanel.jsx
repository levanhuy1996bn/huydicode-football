import { useEffect, useState } from 'react'
import { userTeam } from '../services/career'
import { passAccuracy } from '../systems/matchStats'
import { shortPlayerName } from '../utils/names'

// ---- Phase 21: thống kê & trình bày trận đấu ----
// Dùng chung cho: bảng thống kê trực tiếp (nút STATS trong trận), màn tạm
// dừng, nghỉ giữa hiệp, hết trận và màn sau trận.
//   source = { possession: { blue, red } (%), teams: { blue, red } }

const team = (source, id) => source?.teams?.[id] || {}

export const STAT_ROWS = [
    { key: 'possession', label: 'Possession', unit: '%', value: (s, id) => s.possession?.[id] ?? 50, compact: true },
    { key: 'xg', label: 'Expected goals (xG)', value: (s, id) => team(s, id).xg || 0, decimals: 1, compact: true },
    { key: 'shots', label: 'Shots', value: (s, id) => team(s, id).shots || 0, compact: true },
    { key: 'onTarget', label: 'Shots on target', value: (s, id) => team(s, id).onTarget || 0, compact: true },
    { key: 'passes', label: 'Passes', value: (s, id) => team(s, id).passes || 0 },
    { key: 'passAccuracy', label: 'Pass accuracy', unit: '%', value: (s, id) => passAccuracy(team(s, id)), share: false, compact: true },
    { key: 'tackles', label: 'Tackles won', value: (s, id) => team(s, id).tackles || 0 },
    { key: 'interceptions', label: 'Interceptions', value: (s, id) => team(s, id).interceptions || 0 },
    { key: 'duels', label: 'Duels won', value: (s, id) => team(s, id).duels || 0 },
    { key: 'saves', label: 'Saves', value: (s, id) => team(s, id).saves || 0 },
    { key: 'corners', label: 'Corners', value: (s, id) => team(s, id).corners || 0 },
    { key: 'fouls', label: 'Fouls', value: (s, id) => team(s, id).fouls || 0, compact: true },
    { key: 'offsides', label: 'Offsides', value: (s, id) => team(s, id).offsides || 0 },
    { key: 'yellow', label: 'Yellow cards', value: (s, id) => team(s, id).yellow || 0 },
    { key: 'red', label: 'Red cards', value: (s, id) => team(s, id).red || 0 },
]

// Thống kê engine (state.stats) → dạng `source` ở trên.
export function liveStatSource(stats) {
    if (!stats) return null

    const total = (stats.possession?.blue || 0) + (stats.possession?.red || 0)
    const blue = total > 0 ? Math.round(((stats.possession.blue || 0) / total) * 100) : 50

    return {
        possession: { blue, red: 100 - blue },
        teams: { blue: { ...stats.teams.blue }, red: { ...stats.teams.red } },
    }
}

function format(row, value) {
    return row.decimals ? value.toFixed(row.decimals) : Math.round(value)
}

// Hai cột số + thanh so sánh ở giữa.
// compact: chỉ 6 chỉ số chính. twoColumns: mọi chỉ số, chia hai cột nhỏ
// (dùng trong các thẻ đè lên sân để không che hết màn hình).
export function StatComparison({ source, compact = false, twoColumns = false, opponentName }) {
    if (!source) return null

    const rows = compact ? STAT_ROWS.filter((row) => row.compact) : STAT_ROWS
    const className = [
        'stat-compare',
        compact || twoColumns ? 'stat-compare--compact' : '',
        twoColumns ? 'stat-compare--two' : '',
    ].filter(Boolean).join(' ')

    return (
        <div className={className}>
            {opponentName && (
                <div className="stat-compare__teams">
                    <span>{userTeam().shortName}</span>
                    <span>{opponentName}</span>
                </div>
            )}
            {rows.map((row) => {
                const blue = row.value(source, 'blue')
                const red = row.value(source, 'red')
                // Tỉ lệ % (vd. chuyền chính xác) so sánh theo thang 100.
                const blueWidth = row.share === false ? blue : (blue / (blue + red || 1)) * 100
                const redWidth = row.share === false ? red : (red / (blue + red || 1)) * 100
                const leader = blue === red ? '' : blue > red ? 'is-blue' : 'is-red'

                return (
                    <div className={`stat-compare__row ${leader}`} key={row.key}>
                        <b>{format(row, blue)}{row.unit || ''}</b>
                        <div className="stat-compare__middle">
                            <span>{row.label}</span>
                            <div className={`stat-compare__bar${row.share === false ? ' is-split' : ''}`}>
                                {row.share === false ? (
                                    <>
                                        <div className="stat-compare__half"><i className="blue" style={{ width: `${blueWidth}%` }} /></div>
                                        <div className="stat-compare__half"><i className="red" style={{ width: `${redWidth}%` }} /></div>
                                    </>
                                ) : (
                                    <>
                                        <i className="blue" style={{ width: `${blueWidth}%` }} />
                                        <i className="red" style={{ width: `${redWidth}%` }} />
                                    </>
                                )}
                            </div>
                        </div>
                        <b>{format(row, red)}{row.unit || ''}</b>
                    </div>
                )
            })}
        </div>
    )
}

// Thống kê trực tiếp trong trận: đọc state engine mỗi giây.
export function useLiveStats(statsRef, active = true) {
    const [source, setSource] = useState(() => liveStatSource(statsRef?.current?.stats))

    useEffect(() => {
        if (!active) return undefined

        const read = () => setSource(liveStatSource(statsRef?.current?.stats))

        read()

        const timer = setInterval(read, 1000)

        return () => clearInterval(timer)
    }, [statsRef, active])

    return source
}

export function LiveStatsPanel({ statsRef, opponentName, onClose }) {
    const source = useLiveStats(statsRef)

    return (
        <div className="live-stats">
            <div className="live-stats__head">
                <span>LIVE STATS</span>
                <button type="button" className="link-btn" onClick={onClose} aria-label="Close live stats">✕</button>
            </div>
            <StatComparison source={source} compact opponentName={opponentName} />
        </div>
    )
}

// ---- Dòng thời gian trận đấu (0'–90') ----
// events: { teamId, minute, name, ownGoal?, card?: 'yellow'|'red', sub?: { on, off } }
export function MatchTimeline({ events = [] }) {
    const sorted = [...events].sort((a, b) => a.minute - b.minute)

    const icon = (event) => {
        if (event.card) return <i className={`card-chip card-chip--${event.card}`} />
        if (event.sub) return <b className="timeline__sub">⇄</b>
        return <b className="timeline__goal">●</b>
    }

    const label = (event) => {
        if (event.sub) return `${event.minute}' ${event.sub.on} on, ${event.sub.off} off`
        if (event.card) return `${event.minute}' ${event.card} card · ${event.name || ''}`
        return `${event.minute}' GOAL · ${event.name || 'Unknown'}${event.ownGoal ? ' (OG)' : ''}`
    }

    return (
        <div className="timeline">
            <div className="timeline__track">
                <span className="timeline__mark" style={{ left: '0%' }}>0'</span>
                <span className="timeline__mark timeline__mark--half" style={{ left: '50%' }}>HT</span>
                <span className="timeline__mark" style={{ left: '100%' }}>90'</span>

                {sorted.map((event, index) => (
                    <span
                        key={`${event.minute}-${index}`}
                        className={`timeline__event timeline__event--${event.teamId}`}
                        style={{ left: `${Math.min(100, Math.max(0, (event.minute / 90) * 100))}%` }}
                        title={label(event)}
                    >
                        {icon(event)}
                    </span>
                ))}
            </div>

            {sorted.length > 0 ? (
                <ul className="timeline__list">
                    {sorted.map((event, index) => (
                        <li key={`${event.minute}-${index}`} className={`timeline__item timeline__item--${event.teamId}`}>
                            {icon(event)} {label(event)}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="home-card__empty">No goals, cards or substitutions.</p>
            )}
        </div>
    )
}

// ---- Bản đồ cú sút ----
// Nửa sân tấn công (khung thành ở trên), mỗi cú sút một chấm: to theo xG,
// tô đặc nếu thành bàn.
const MAP_WIDTH = 68
const MAP_DEPTH = 36

function ShotDots({ shots, teamId }) {
    return shots
        .filter((shot) => shot.teamId === teamId)
        .map((shot, index) => {
            const x = MAP_WIDTH / 2 + Math.max(-33, Math.min(33, shot.lateral))
            const y = Math.min(MAP_DEPTH - 1, shot.depth)
            const r = 0.9 + Math.sqrt(shot.xg) * 2.6

            return (
                <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={r}
                    className={`shotmap__shot shotmap__shot--${teamId}${shot.goal ? ' is-goal' : ''}`}
                >
                    <title>{`xG ${shot.xg.toFixed(2)}${shot.goal ? ' · GOAL' : ''}${shot.variant ? ` · ${shot.variant}` : ''}`}</title>
                </circle>
            )
        })
}

function HalfPitch({ children, title }) {
    return (
        <figure className="shotmap__pitch">
            <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_DEPTH}`} role="img" aria-label={title}>
                <rect x="0" y="0" width={MAP_WIDTH} height={MAP_DEPTH} className="shotmap__grass" />
                <rect x={MAP_WIDTH / 2 - 20.15} y="0" width="40.3" height="16.5" className="shotmap__line" />
                <rect x={MAP_WIDTH / 2 - 9.16} y="0" width="18.32" height="5.5" className="shotmap__line" />
                <rect x={MAP_WIDTH / 2 - 3.66} y="-1" width="7.32" height="1.6" className="shotmap__goal" />
                <circle cx={MAP_WIDTH / 2} cy="11" r="0.35" className="shotmap__spot" />
                <path d={`M ${MAP_WIDTH / 2 - 7.3} 16.5 A 9.15 9.15 0 0 0 ${MAP_WIDTH / 2 + 7.3} 16.5`} className="shotmap__line" />
                {children}
            </svg>
            <figcaption>{title}</figcaption>
        </figure>
    )
}

export function ShotMap({ shots = [], opponentName }) {
    const summary = (teamId) => {
        const list = shots.filter((shot) => shot.teamId === teamId)
        const xg = list.reduce((sum, shot) => sum + shot.xg, 0)
        const goals = list.filter((shot) => shot.goal).length

        return `${list.length} shot${list.length === 1 ? '' : 's'} · ${goals} goal${goals === 1 ? '' : 's'} · xG ${xg.toFixed(1)}`
    }

    return (
        <div className="shotmap">
            <HalfPitch title={`${userTeam().shortName} · ${summary('blue')}`}>
                <ShotDots shots={shots} teamId="blue" />
            </HalfPitch>
            <HalfPitch title={`${opponentName} · ${summary('red')}`}>
                <ShotDots shots={shots} teamId="red" />
            </HalfPitch>
            <p className="shotmap__legend">Bigger dot = better chance (higher xG). Filled = goal.</p>
        </div>
    )
}

// Cầu thủ nổi bật theo từng chỉ số (đội người chơi).
export function TopPerformers({ ratings = [] }) {
    const best = (key, label, format = (v) => v) => {
        const top = [...ratings].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0]

        if (!top || !(top[key] > 0)) return null

        return (
            <div className="top-performer" key={key}>
                <span>{label}</span>
                <b title={top.name}>{shortPlayerName(top.name, 16)}</b>
                <em>{format(top[key])}</em>
            </div>
        )
    }

    const items = [
        best('passesCompleted', 'Most passes completed'),
        best('tackles', 'Most tackles won'),
        best('interceptions', 'Most interceptions'),
        best('shots', 'Most shots'),
        best('xg', 'Highest xG', (v) => v.toFixed(2)),
    ].filter(Boolean)

    if (!items.length) return null

    return <div className="top-performers">{items}</div>
}
