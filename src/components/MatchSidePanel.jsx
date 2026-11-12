import { useEffect, useState } from 'react'
import { shortPlayerName } from '../utils/names'
import { ATTRIBUTE_GROUPS, GOALKEEPING_GROUP, getAttributes } from '../systems/attributes'
import { progressOf } from '../systems/progression'
import { UpgradeBadge, statClass } from './CardBits'

// Thể lực hiện tại của cầu thủ đang chọn (đọc từ engine 4 lần/giây).
function LiveStamina({ playerId, statsRef, condition }) {
  const [value, setValue] = useState(null)

  useEffect(() => {
    const read = () => {
      const stamina = statsRef?.current?.stamina?.[playerId]

      setValue(typeof stamina === 'number' ? Math.round(stamina) : null)
    }

    read()
    const timer = setInterval(read, 250)

    return () => clearInterval(timer)
  }, [playerId, statsRef])

  const shown = value ?? condition ?? 100
  const tone = shown > 60 ? 'good' : shown > 35 ? 'warn' : 'low'

  return (
    <div className={`stamina-meter stamina-meter--${tone}`}>
      <div className="stamina-meter__head">
        <span>STAMINA</span>
        <b>{shown}%</b>
      </div>
      <div className="stamina-meter__track">
        <i style={{ width: `${shown}%` }} />
      </div>
      {condition != null && condition < 100 && (
        <small>Started the match at {condition}% condition</small>
      )}
    </div>
  )
}

// Chỉ số chi tiết (Phase 19), gom theo nhóm.
function DetailedAttributes({ player }) {
  const values = getAttributes(player)
  const groups = player.position === 'GK'
    ? [GOALKEEPING_GROUP, ...ATTRIBUTE_GROUPS]
    : ATTRIBUTE_GROUPS

  return (
    <div className="attr-groups">
      {groups.map((group) => (
        <div className="attr-group" key={group.key}>
          <div className="attr-group__title">{group.name}</div>
          {group.items.map(([key, label]) => (
            <div className="attr-row" key={key}>
              <span>{label}</span>
              <b className={values[key] >= 80 ? 'is-high' : values[key] < 60 ? 'is-low' : ''}>
                <span className={statClass(values[key])}>{values[key]}</span>
              </b>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Cột phải trong trận: hồ sơ cầu thủ đang điều khiển (cập nhật theo người
// được chọn), thể lực, chỉ số chi tiết + bảng phím điều khiển.
export default function MatchSidePanel({ selectedPlayer, statsRef }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!selectedPlayer) return <aside className="side-panel" />

  return (
      <aside className="side-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PLAYER PROFILE</span>
            <h2 title={selectedPlayer.name}>{shortPlayerName(selectedPlayer.name, 18)}</h2>
          </div>

          <div className="overall">
            <span className={statClass(selectedPlayer.overall)}>{selectedPlayer.overall}</span>
            <small>OVR</small>
            <UpgradeBadge level={selectedPlayer.upgrade} />
          </div>
        </div>

        <div className="player-position">
          #{selectedPlayer.number} · {selectedPlayer.position} · LV {progressOf(selectedPlayer).level}
          {selectedPlayer.teamColorBonus ? (
            <span className="team-color-chip" title="Team color bonus on all main stats (this match)">
              TEAM COLOR +{selectedPlayer.teamColorBonus}
            </span>
          ) : null}
        </div>

        <div className="stats-list">
          {[
            ['PAC', selectedPlayer.pace],
            ['SHO', selectedPlayer.shooting],
            ['PAS', selectedPlayer.passing],
            ['DRI', selectedPlayer.dribbling],
            ['DEF', selectedPlayer.defending],
            ['PHY', selectedPlayer.physical],
          ].map(([label, value]) => (
              <div className="stat-row" key={label}>
                <span>{label}</span>

                <div className="stat-track">
                  <i style={{ width: `${Math.min(100, value)}%` }} />
                </div>

                <b className={statClass(value)}>{value}</b>
              </div>
          ))}
        </div>

        <LiveStamina
          playerId={selectedPlayer.id}
          statsRef={statsRef}
          condition={selectedPlayer.condition}
        />

        <button
          type="button"
          className="link-btn attr-toggle"
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? 'HIDE DETAILED ATTRIBUTES ▲' : 'DETAILED ATTRIBUTES ▼'}
        </button>

        {showDetails && <DetailedAttributes player={selectedPlayer} />}

        <div className="panel-divider" />

        <span className="eyebrow">MATCH CONTROLS</span>

        <div className="control-row">
          <kbd>↑</kbd>
          <kbd>←</kbd>
          <kbd>↓</kbd>
          <kbd>→</kbd>
          <span>Move player</span>
        </div>

        <div className="control-row">
          <kbd>E</kbd>
          <span>Sprint (hold)</span>
        </div>

        <div className="control-row">
          <kbd>S</kbd>
          <span>Pass (hold for power) · switch player without the ball</span>
        </div>

        <div className="control-row">
          <kbd>W</kbd>
          <span>Through ball (hold for power)</span>
        </div>

        <div className="control-row">
          <kbd>A</kbd>
          <span>Lob pass / cross (hold for power)</span>
        </div>

        <div className="control-row">
          <kbd>D</kbd>
          <span>Shoot (hold for power, arrows to aim)</span>
        </div>

        <div className="control-row">
          <kbd>Q</kbd>
          <span>Cycle player (nearest to the ball) when you don't have it</span>
        </div>

        <span className="eyebrow">SKILL SHOTS &amp; PASSES (FO4 STYLE)</span>

        <div className="control-row">
          <kbd>Z</kbd>
          <kbd>D</kbd>
          <span>Finesse shot: curls into the far corner, more accurate, a bit slower</span>
        </div>

        <div className="control-row">
          <kbd>Q</kbd>
          <kbd>D</kbd>
          <span>Chip shot over the keeper (best when he is off his line)</span>
        </div>

        <div className="control-row">
          <kbd>C</kbd>
          <kbd>D</kbd>
          <span>Trivela: outside-of-the-foot shot that bends away</span>
        </div>

        <div className="control-row">
          <kbd>D</kbd>
          <kbd>D</kbd>
          <span>Tap D again right after the shot: low driven shot</span>
        </div>

        <div className="control-row">
          <kbd>Z</kbd>
          <kbd>S</kbd>
          <span>Driven pass (Z + W: driven through ball)</span>
        </div>

        <div className="control-row">
          <kbd>Q</kbd>
          <kbd>W</kbd>
          <span>Lobbed through ball over the defence</span>
        </div>

        <div className="control-row">
          <kbd>Z</kbd>
          <kbd>A</kbd>
          <span>Whipped cross · A then A again: low cross</span>
        </div>

        <div className="control-row">
          <kbd>D</kbd>
          <span>Hold when defending: contain (D + E: aggressive press)</span>
        </div>

        <div className="control-row">
          <kbd>W</kbd>
          <span>Hold when defending: call a teammate to press</span>
        </div>

        <div className="control-row">
          <kbd>SPACE</kbd>
          <span>Standing tackle</span>
        </div>

        <div className="control-row">
          <kbd>A</kbd>
          <kbd>CTRL</kbd>
          <span>Sliding tackle (when defending)</span>
        </div>

        <div className="control-row">
          <kbd>C</kbd>
          <span>Hold with the ball: shield</span>
        </div>

        <div className="control-row">
          <kbd>D</kbd>
          <span>Free kick: shoot over the wall (about half power) · S/W/A pass</span>
        </div>

        <div className="control-row">
          <kbd>←</kbd>
          <kbd>→</kbd>
          <kbd>D</kbd>
          <span>Penalty: aim with the arrows, D to shoot</span>
        </div>

        <p className="note">
          Passes and shots follow the arrow keys; the bar above your
          player shows the power. After a pass you control the receiver,
          who runs to meet the ball until you steer him. You only win the
          ball with a tackle (Space) or a slide (A) — or by cutting out a bad
          pass. Tackle from the front or side: from behind it rarely works,
          and a missed standing tackle costs you balance. If you don't press
          a key for 10 seconds the AI plays for you. Careless tackles —
          especially slides from behind — give away free kicks, penalties and
          cards; two yellows is a red and your team plays a man down. Stay
          level with the last defender or you will be caught offside. Sprinting drains stamina quickly — tired
          players are slower and less accurate, so rest them or substitute.
        </p>
      </aside>
  )
}
