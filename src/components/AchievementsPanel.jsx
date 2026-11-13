import { useState } from 'react'
import { UpgradeBadge } from './CardBits'
import { squadOf } from '../systems/roster'
import { BASE_RATES } from '../services/upgrade'
import {
    MILESTONE_STEP,
    achievementRows,
    claimAchievements,
    milestoneLabel,
    rewardFor,
    rewardLabel,
} from '../services/upgradeAchievements'

// Phase 31: tab ACHIEVEMENTS trong CARDS — mỗi mốc +2 … +10 một dòng: lần đầu,
// số lần đập thành công lên mốc đó, tiến độ tới mốc 10 / 20 / 30… tiếp theo,
// nút CLAIM cho phần thưởng đang chờ (vào kho REWARDS).
export default function AchievementsPanel({ club, team, onClubChange, onOpenRewards = null }) {
    const [notice, setNotice] = useState(null)
    const squad = squadOf(team)
    const rows = achievementRows(club, squad)
    const pendingTotal = rows.reduce((sum, row) => sum + row.pending.length, 0)

    const claim = (only = null) => {
        // Tính trên trạng thái hiện tại rồi ghi bằng hàm cập nhật (không nhận trùng).
        const preview = claimAchievements(club, squad, only)

        if (!preview.claimed.length) return

        onClubChange((current) => claimAchievements(current, squad, only).club)
        setNotice(
            `Claimed ${preview.claimed.map((item) => milestoneLabel(item.level, item.milestone)).join(', ')} · ` +
            `${preview.items.length} item${preview.items.length === 1 ? '' : 's'} added to REWARDS.`,
        )
    }

    return (
        <div className="home-card ach-panel">
            <div className="home-card__head">
                <span>UPGRADE ACHIEVEMENTS</span>
                {pendingTotal > 0 ? (
                    <button type="button" className="btn btn--small btn--primary" onClick={() => claim()}>
                        CLAIM ALL · {pendingTotal}
                    </button>
                ) : (
                    <small>first time + every {MILESTONE_STEP} successful upgrades</small>
                )}
            </div>

            {notice && (
                <div className="cards-notice cards-notice--ok" role="status">
                    {notice}
                    {onOpenRewards && (
                        <button type="button" className="link-btn" onClick={onOpenRewards}>OPEN REWARDS →</button>
                    )}
                </div>
            )}

            <div className="ach-list">
                {rows.map((row) => {
                    const ready = row.pending.length > 0
                    const nextFirst = !row.firstReached

                    return (
                        <div key={row.level} className={`ach-row${ready ? ' is-ready' : ''}`}>
                            <div className="ach-row__level">
                                <UpgradeBadge level={row.level} size="large" />
                                <small>{Math.round((BASE_RATES[row.level] || 0) * 100)}%</small>
                            </div>

                            <div className="ach-row__body">
                                <div className="ach-row__title">
                                    <b>Upgrade to +{row.level}</b>
                                    <span className={`ach-first${row.firstReached ? ' is-done' : ''}`}>
                                        {row.firstReached ? '✓' : '○'} FIRST TIME
                                        {row.firstClaimed ? ' · claimed' : ''}
                                    </span>
                                </div>
                                <div className="ach-row__progress">
                                    <div className="xp-bar">
                                        <i style={{ width: `${(row.progress / MILESTONE_STEP) * 100}%` }} />
                                    </div>
                                    <span>
                                        <b>{row.count}</b> success{row.count === 1 ? '' : 'es'} · next ×{row.nextMilestone}: {row.progress}/{MILESTONE_STEP}
                                    </span>
                                </div>
                                <small className="ach-row__reward">
                                    {nextFirst
                                        ? <>First time: {rewardLabel(row.firstReward)}</>
                                        : <>×{row.nextMilestone}: {rewardLabel(row.nextReward)}{row.nextReward?.double ? ' (double EP)' : ''}</>}
                                </small>
                            </div>

                            <div className="ach-row__claims">
                                {row.pending.map((milestone) => (
                                    <button
                                        key={milestone}
                                        type="button"
                                        className="btn btn--small btn--primary"
                                        onClick={() => claim({ level: row.level, milestone })}
                                        title={rewardLabel(rewardFor(row.level, milestone))}
                                    >
                                        CLAIM {milestone === 'first' ? 'FIRST' : `×${milestone}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            <p className="home-card__empty ach-note">
                Only successful upgrades count (to exactly that level); failures don&apos;t. Every multiple of {MILESTONE_STEP} is a new
                reward with no end; ×50 and ×100 give double EP. Cards you already own at a level count as &quot;first time&quot;.
                Rewards go to REWARDS (EP cards, Upgrade Boost, Upgrade Protection, Premium packs).
            </p>
        </div>
    )
}
