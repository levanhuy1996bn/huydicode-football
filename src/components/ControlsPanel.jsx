import { useEffect } from 'react'

// Phase 22: bảng hướng dẫn phím (nút CONTROLS trong trận). Thay cho dòng
// hướng dẫn cố định ở góc sân và nút NAMES (chế độ tên cầu thủ nằm ở đây).
const GROUPS = [
    {
        title: 'Attacking',
        rows: [
            ['Arrows', 'Move the player, aim passes and shots'],
            ['E / Shift (hold)', 'Sprint'],
            ['S', 'Pass (hold for power, release to kick)'],
            ['W', 'Through ball'],
            ['A', 'Lofted pass / cross'],
            ['D', 'Shoot (arrows choose the corner)'],
            ['C (hold)', 'Shield the ball'],
            ['Q / S without the ball', 'Switch player'],
        ],
    },
    {
        title: 'Skill shots and passes',
        rows: [
            ['Z + D', 'Finesse shot'],
            ['Q + D', 'Chip shot'],
            ['C + D', 'Trivela'],
            ['D, then D again', 'Low driven shot'],
            ['Z + S / Z + W', 'Driven pass / driven through ball'],
            ['Q + W', 'Lobbed through ball'],
            ['Z + A / A then A', 'Whipped cross / low cross'],
        ],
    },
    {
        title: 'Defending',
        rows: [
            ['D (hold)', 'Contain the ball carrier'],
            ['D + E (hold)', 'Aggressive press'],
            ['E + arrows / X (hold)', 'Charge the ball carrier and shoulder him (arrows only nudge) · Shift still just sprints'],
            ['W (hold)', 'Call a teammate to press'],
            ['Space', 'Standing tackle'],
            ['A / Ctrl', 'Sliding tackle'],
        ],
    },
    {
        title: 'Set pieces and goalkeeper',
        rows: [
            ['Kick-off', 'Pass only: S / W / A (no arrows = pass to the player next to you)'],
            ['Throw-in', 'S short, A long'],
            ['Free kick', 'D shoots over the wall (40–80% power), S / W / A pass'],
            ['Penalty', 'Arrows aim, D shoots'],
            ['Keeper with the ball', 'S / W throw, A / D punt, arrows walk'],
        ],
    },
]

const NAME_MODES = [
    ['smart', 'Smart'],
    ['all', 'All'],
    ['off', 'Off'],
]

export default function ControlsPanel({ labelMode = 'smart', onLabelModeChange, onClose }) {
    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose?.()
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="controls-panel" role="dialog" aria-label="Controls">
            <div className="controls-panel__card">
                <div className="controls-panel__head">
                    <span>CONTROLS</span>
                    <button type="button" className="link-btn" onClick={onClose} aria-label="Close controls">✕</button>
                </div>

                <div className="controls-panel__grid">
                    {GROUPS.map((group) => (
                        <section key={group.title} className="controls-panel__group">
                            <h4>{group.title}</h4>
                            <dl>
                                {group.rows.map(([key, action]) => (
                                    <div key={key} className="controls-panel__row">
                                        <dt><kbd>{key}</kbd></dt>
                                        <dd>{action}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>

                <div className="controls-panel__foot">
                    <span>Player names above heads</span>
                    <div className="segmented" role="radiogroup" aria-label="Player names">
                        {NAME_MODES.map(([mode, label]) => (
                            <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={labelMode === mode}
                                className={labelMode === mode ? 'segmented__btn active' : 'segmented__btn'}
                                onClick={() => onLabelModeChange?.(mode)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="controls-panel__hint">The match is paused · Esc to close</span>
                </div>
            </div>
        </div>
    )
}
