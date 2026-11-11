
import { useMemo, useState } from 'react'
import { USER_TEAM } from '../data/leagueData'

const STAT_NAMES = [
    ['pace', 'PAC'],
    ['shooting', 'SHO'],
    ['passing', 'PAS'],
    ['dribbling', 'DRI'],
    ['defending', 'DEF'],
    ['physical', 'PHY'],
]

const FORMATION_OPTIONS = ['4-3-3', '4-4-2', '4-2-3-1']
const MAX_SUBSTITUTIONS = 5

const getPositionGroup = (position) => {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'

    if (
        ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(value)
    ) {
        return 'DF'
    }

    if (
        ['CM', 'CDM', 'CAM', 'AM', 'MF', 'LM', 'RM'].includes(value)
    ) {
        return 'MF'
    }

    return 'FW'
}

export default function TeamManagementPanel({
                                                roster,
                                                selectedId,
                                                onSelectPlayer,
                                                onFormationChange,
                                                onSubstitute,
                                                substitutionCount = 0,
                                            }) {
    const [activeTab, setActiveTab] = useState('players')
    const [playerOut, setPlayerOut] = useState('')
    const [playerIn, setPlayerIn] = useState('')
    const [isCollapsed, setIsCollapsed] = useState(false)

    const blueTeam = roster.find((team) => team.id === 'blue')

    const selectedPlayer = useMemo(
        () =>
            roster
                .flatMap((team) => team.players)
                .find((player) => player.id === selectedId),
        [roster, selectedId],
    )

    if (!blueTeam) return null

    const outgoingPlayer = blueTeam.players.find(
        (player) => player.id === playerOut,
    )

    const compatibleSubstitutes = blueTeam.substitutes.filter(
        (player) =>
            outgoingPlayer &&
            getPositionGroup(player.position) ===
            getPositionGroup(outgoingPlayer.position),
    )

    const substitutionsRemaining = Math.max(
        0,
        MAX_SUBSTITUTIONS - substitutionCount,
    )

    const handleSubstitute = () => {
        if (
            !playerOut ||
            !playerIn ||
            substitutionsRemaining <= 0
        ) {
            return
        }

        onSubstitute(playerOut, playerIn)
        setPlayerOut('')
        setPlayerIn('')
    }

    return (
        <div
            className={`team-management ${
                isCollapsed ? 'team-management-collapsed' : ''
            }`}
        >
            <div className="team-management-header">
                <div className="team-management-title">
                    <div>
                        <strong>{USER_TEAM.name}</strong>
                        <small>TEAM MANAGEMENT</small>
                    </div>

                    <button
                        type="button"
                        className="team-management-collapse"
                        onClick={() => setIsCollapsed((previous) => !previous)}
                        aria-label={
                            isCollapsed
                                ? 'Expand team management'
                                : 'Collapse team management'
                        }
                        aria-expanded={!isCollapsed}
                        title={
                            isCollapsed
                                ? 'Expand'
                                : 'Collapse'
                        }
                    >
                        <span>
                            {isCollapsed ? '⌃' : '⌄'}
                        </span>
                    </button>
                </div>

                <div className="team-management-tabs">
                    <button
                        className={activeTab === 'players' ? 'active' : ''}
                        onClick={() => setActiveTab('players')}
                    >
                        PLAYERS
                    </button>

                    <button
                        className={activeTab === 'formation' ? 'active' : ''}
                        onClick={() => setActiveTab('formation')}
                    >
                        FORMATION
                    </button>

                    <button
                        className={
                            activeTab === 'substitutions' ? 'active' : ''
                        }
                        onClick={() => setActiveTab('substitutions')}
                    >
                        SUBS
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {activeTab === 'players' && (
                        <div className="team-management-content">
                            <div className="player-list">
                                {blueTeam.players.map((player) => (
                                    <button
                                        key={player.id}
                                        className={
                                            selectedId === player.id
                                                ? 'player-list-item selected'
                                                : 'player-list-item'
                                        }
                                        onClick={() => onSelectPlayer(player.id)}
                                    >
                                        <span className="player-number">
                                            {player.number}
                                        </span>

                                        <span className="player-info">
                                            <strong>{player.name}</strong>
                                            <small>{player.position}</small>
                                        </span>

                                        <strong className="player-overall">
                                            {player.overall}
                                        </strong>
                                    </button>
                                ))}
                            </div>

                            {selectedPlayer && (
                                <div className="player-detail">
                                    <div className="player-detail-heading">
                                        <div>
                                            <strong>{selectedPlayer.name}</strong>
                                            <small>
                                                {selectedPlayer.position} · #
                                                {selectedPlayer.number}
                                            </small>
                                        </div>

                                        <strong className="player-detail-overall">
                                            {selectedPlayer.overall}
                                        </strong>
                                    </div>

                                    <div className="player-stat-grid">
                                        {STAT_NAMES.map(([key, label]) => {
                                            const value = selectedPlayer[key] ?? 0

                                            return (
                                                <div className="player-stat" key={key}>
                                                    <span>{label}</span>
                                                    <strong>{value}</strong>

                                                    <div className="stat-track">
                                                        <div
                                                            style={{
                                                                width: `${value}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'formation' && (
                        <div className="team-management-content">
                            <p className="management-description">
                                Select a formation for {USER_TEAM.name}.
                            </p>

                            <div className="formation-options">
                                {FORMATION_OPTIONS.map((formation) => (
                                    <button
                                        key={formation}
                                        className={
                                            blueTeam.formationKey === formation
                                                ? 'formation-option active'
                                                : 'formation-option'
                                        }
                                        onClick={() => onFormationChange(formation)}
                                    >
                                        <strong>{formation}</strong>

                                        <small>
                                            {formation === '4-3-3'
                                                ? '4 DEF · 3 MID · 3 ATT'
                                                : formation === '4-4-2'
                                                    ? '4 DEF · 4 MID · 2 ATT'
                                                    : '4 DEF · 2 CDM · 3 AM · 1 ST'}
                                        </small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'substitutions' && (
                        <div className="team-management-content">
                            <p className="management-description">
                                Select a starting player and a compatible substitute.
                            </p>

                            <div className="substitution-counter">
                                <strong>
                                    SUBSTITUTIONS: {substitutionCount}/
                                    {MAX_SUBSTITUTIONS}
                                </strong>
                            </div>

                            <label className="management-label">
                                PLAYER OUT
                            </label>

                            <select
                                value={playerOut}
                                disabled={substitutionsRemaining <= 0}
                                onChange={(event) => {
                                    setPlayerOut(event.target.value)
                                    setPlayerIn('')
                                }}
                            >
                                <option value="">Select starting player</option>

                                {blueTeam.players.map((player) => (
                                    <option key={player.id} value={player.id}>
                                        #{player.number} - {player.name} (
                                        {player.position}, {player.overall})
                                    </option>
                                ))}
                            </select>

                            <label className="management-label">
                                PLAYER IN
                            </label>

                            <select
                                value={playerIn}
                                disabled={
                                    !playerOut ||
                                    substitutionsRemaining <= 0 ||
                                    compatibleSubstitutes.length === 0
                                }
                                onChange={(event) => setPlayerIn(event.target.value)}
                            >
                                <option value="">Select substitute</option>

                                {compatibleSubstitutes.map((player) => (
                                    <option key={player.id} value={player.id}>
                                        #{player.number} - {player.name} (
                                        {player.position}, {player.overall})
                                    </option>
                                ))}
                            </select>

                            {playerOut && compatibleSubstitutes.length === 0 && (
                                <p className="management-description">
                                    No compatible substitute available for this
                                    position.
                                </p>
                            )}

                            <button
                                className="confirm-substitution"
                                disabled={
                                    !playerOut ||
                                    !playerIn ||
                                    substitutionsRemaining <= 0
                                }
                                onClick={handleSubstitute}
                            >
                                CONFIRM SUBSTITUTION
                            </button>

                            <div className="substitutes-list">
                                <strong>
                                    BENCH ({blueTeam.substitutes.length})
                                </strong>

                                {blueTeam.substitutes.map((player) => (
                                    <div key={player.id}>
                                        <span>
                                            #{player.number} {player.name} ·{' '}
                                            {player.position}
                                        </span>

                                        <strong>{player.overall}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
