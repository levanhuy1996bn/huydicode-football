import { USER_TEAM } from '../../data/leagueData'
import { FORMATIONS } from '../../data/teams'
import { TACTICS } from '../../systems/constants'
import { shortPlayerName } from '../../utils/names'

// Màn trước trận: đội hình hai đội, sức mạnh, chiến thuật, sơ đồ,
// chỉnh đội hình (bảng kéo thả, không tính lượt thay) rồi KICK OFF.

const average = (players) =>
    players.length
        ? Math.round(players.reduce((sum, player) => sum + (player.overall || 0), 0) / players.length)
        : 0

function Lineup({ title, color, players, align }) {
    return (
        <div className={`lineup lineup--${align}`}>
            <div className="lineup__head" style={{ '--team': color }}>
                <span>{title}</span>
                <b>{average(players)} <small>AVG</small></b>
            </div>
            <ol className="lineup__list">
                {players.map((player) => (
                    <li key={player.id}>
                        <span className="lineup__number" style={{ '--team': color }}>
                            {player.number}
                        </span>
                        <span className="lineup__name" title={player.name}>
                            {shortPlayerName(player.name, 20)}
                        </span>
                        <em>{player.position}</em>
                        <b>{player.overall}</b>
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default function PreMatchScreen({
    fixture,
    blueTeam,
    opponentTeam,
    opponentInfo,
    bluePosition,
    opponentPosition,
    tacticKey,
    onTacticChange,
    onFormationChange,
    onEditLineup,
    onKickOff,
    onBack,
}) {
    if (!fixture || !blueTeam || !opponentTeam) {
        return (
            <section className="screen prematch-screen">
                <div className="home-card">
                    <p className="home-card__empty">There is no match left this season.</p>
                    <button type="button" className="btn" onClick={onBack}>BACK TO HOME</button>
                </div>
            </section>
        )
    }

    const isHome = fixture.homeTeamId === 'blue'

    return (
        <section className="screen prematch-screen">
            <div className="prematch-header">
                <button type="button" className="link-btn" onClick={onBack}>← HOME</button>
                <div>
                    <div className="home-hero__eyebrow">
                        PRE-MATCH · ROUND {fixture.round} · {isHome ? 'HOME' : 'AWAY'}
                    </div>
                    <h1>{USER_TEAM.name} <span>vs</span> {opponentInfo?.name}</h1>
                    <p>
                        League position: {USER_TEAM.shortName} {bluePosition || '–'} · {opponentInfo?.shortName}{' '}
                        {opponentPosition || '–'} · Opponent strength {opponentInfo?.strength}
                    </p>
                </div>
            </div>

            <div className="prematch-body">
                <Lineup
                    title={USER_TEAM.name}
                    color={blueTeam.color}
                    players={blueTeam.players}
                    align="left"
                />

                <div className="prematch-setup">
                    <div className="home-card">
                        <div className="home-card__head"><span>TEAM SETUP</span></div>

                        <div className="setting-row">
                            <span>Formation</span>
                            <div className="segmented">
                                {Object.keys(FORMATIONS).map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={blueTeam.formationKey === key ? 'is-active' : ''}
                                        onClick={() => onFormationChange(key)}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="setting-row">
                            <span>Tactic</span>
                            <select value={tacticKey} onChange={onTacticChange} aria-label="Team tactic">
                                {Object.entries(TACTICS).map(([key, value]) => (
                                    <option key={key} value={key}>{value.label}</option>
                                ))}
                            </select>
                        </label>

                        <button type="button" className="btn btn--block" onClick={onEditLineup}>
                            EDIT LINEUP (DRAG &amp; DROP)
                        </button>
                        <p className="home-card__empty">
                            Lineup changes before kick-off do not use substitutions.
                        </p>
                    </div>

                    <button type="button" className="btn btn--primary btn--large btn--block" onClick={onKickOff}>
                        KICK OFF
                    </button>
                </div>

                <Lineup
                    title={opponentInfo?.name || opponentTeam.name}
                    color={opponentTeam.color}
                    players={opponentTeam.players}
                    align="right"
                />
            </div>
        </section>
    )
}
