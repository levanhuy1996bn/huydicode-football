import { useState } from 'react'
import GameScene from './components/GameScene'
import { TEAMS } from './data/teams'

export default function App() {
  const [activeTab, setActiveTab] = useState('MATCH')

  const [selectedPlayer] = useState(
      TEAMS[0].players.find((player) => player.id === 'blue-9'),
  )

  return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">UF</div>

            <div>
              <strong>ULTIMATE FOOTBALL</strong>
              <span>MANAGER 3D · PHASE 3</span>
            </div>
          </div>

          <nav>
            {['MATCH', 'SQUAD', 'TACTICS', 'CLUB'].map((tab) => (
                <button
                    key={tab}
                    className={activeTab === tab ? 'active' : ''}
                    onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
            ))}
          </nav>

          <div className="season-label">
            PRE-SEASON <b>2026/27</b>
          </div>
        </header>

        <section className="match-heading">
          <div>
            <span className="eyebrow">FRIENDLY MATCH · PHASE 3</span>
            <h1>Match Day</h1>
            <p>Player collision, physical duels and defensive AI</p>
          </div>

          <div className="scoreboard">
            <div>
              <i className="team-dot blue" />
              BLUE FC
            </div>

            <strong>
              0 <small>:</small> 0
            </strong>

            <div>
              RED UNITED
              <i className="team-dot red" />
            </div>
          </div>

          <div className="match-clock">
            <span>●</span> 00:00
            <small>PROTOTYPE</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="pitch-panel">
            <GameScene />
          </div>

          <aside className="side-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">PLAYER PROFILE</span>
                <h2>{selectedPlayer.name}</h2>
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
              <span>Short pass</span>
            </div>

            <div className="control-row">
              <kbd>W</kbd>
              <span>Through ball</span>
            </div>

            <div className="control-row">
              <kbd>A</kbd>
              <span>Lob pass / cross</span>
            </div>

            <div className="control-row">
              <kbd>D</kbd>
              <span>Shoot</span>
            </div>

            <div className="control-row">
              <kbd>Q</kbd>
              <span>Switch player</span>
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
              Move close to an opponent before tackling. Standing tackles
              have a shorter recovery time. Sliding tackles have a longer
              range but take longer to recover. The camera is locked to a
              fixed sideline view.
            </p>

            <div className="phase-status">
              <span className="status-dot" />
              PHASE 3 · PLAYER COLLISION
            </div>
          </aside>
        </section>

        <footer>
          ULTIMATE FOOTBALL MANAGER 3D
          <span>EARLY DEVELOPMENT BUILD</span>
        </footer>
      </main>
  )
}
