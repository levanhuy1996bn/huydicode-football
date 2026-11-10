import { shortPlayerName } from '../utils/names'

// Cột phải trong trận: hồ sơ cầu thủ đang điều khiển (cập nhật theo người
// được chọn) + bảng phím điều khiển.
export default function MatchSidePanel({ selectedPlayer }) {
  if (!selectedPlayer) return <aside className="side-panel" />

  return (
      <aside className="side-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PLAYER PROFILE</span>
            <h2 title={selectedPlayer.name}>{shortPlayerName(selectedPlayer.name, 18)}</h2>
          </div>

          <div className="overall">
            {selectedPlayer.overall}
            <small>OVR</small>
          </div>
        </div>

        <div className="player-position">
          #{selectedPlayer.number} · {selectedPlayer.position}
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
                  <i style={{ width: `${value}%` }} />
                </div>

                <b>{value}</b>
              </div>
          ))}
        </div>

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
          <span>Cycle player (nearest to the ball)</span>
        </div>

        <div className="control-row">
          <kbd>D</kbd>
          <span>Hold when defending: contain (D + E: aggressive press)</span>
        </div>

        <div className="control-row">
          <kbd>A</kbd>
          <span>Hold when defending: call a teammate to press</span>
        </div>

        <div className="control-row">
          <kbd>SPACE</kbd>
          <span>Standing tackle</span>
        </div>

        <div className="control-row">
          <kbd>CTRL</kbd>
          <span>Sliding tackle</span>
        </div>

        <p className="note">
          Passes and shots follow the arrow keys; the bar above your
          player shows the power. Tackle when the ball is away from the
          dribbler's feet — a missed standing tackle costs you balance,
          a missed slide leaves you on the ground. Sprinting pushes the
          ball further ahead and makes it easier to lose.
        </p>
      </aside>
  )
}
