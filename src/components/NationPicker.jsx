import { useMemo, useState } from 'react'
import ClubCrest from './ClubCrest'
import { NATIONS } from '../data/nations'
import { nationOfPlayer, nationStrength, nationalSquad } from '../services/nationalTeams'
import { upgradeBonus } from '../services/upgrade'

// Phase 29E: chọn đội tuyển quốc gia dẫn dắt ở World Cup (32 đội). Gợi ý: nước
// có nhiều người nhất trong đội hình chính của người chơi.
// Phase 30C: đội tuyển chỉ gồm cầu thủ quốc gia (không gọi thẻ CLB của người
// chơi), cả đội +upgrade theo cấp World Cup; hiện độ khó của giải.
export default function NationPicker({ edition, suggestedId, userCards = [], upgrade = 1, level = 1, difficulty = null, onConfirm, onCancel }) {
    const bonus = upgradeBonus(upgrade) - upgradeBonus(1)
    const [selectedId, setSelectedId] = useState(suggestedId || 'nat-eng')
    const rows = useMemo(() => {
        const mine = new Map()

        userCards.forEach((card) => {
            const nation = nationOfPlayer(card)

            if (nation) mine.set(nation.id, (mine.get(nation.id) || 0) + 1)
        })

        return NATIONS.map((nation) => ({ nation, strength: nationStrength(nation.id), mine: mine.get(nation.id) || 0 }))
            .sort((a, b) => b.strength - a.strength)
    }, [userCards])
    const selected = rows.find((row) => row.nation.id === selectedId) || rows[0]
    const squad = useMemo(() => nationalSquad(selected.nation.id), [selected.nation.id])

    return (
        <div className="club-picker-overlay" role="dialog" aria-modal="true" aria-label="Choose your nation">
            <div className="club-picker nation-picker">
                <div className="club-picker__head">
                    <div>
                        <div className="home-hero__eyebrow">WORLD CUP {edition}</div>
                        <h2>Choose your national team</h2>
                    </div>
                    {onCancel && <button type="button" className="btn btn--small" onClick={onCancel}>CANCEL</button>}
                </div>

                <div className="nation-picker__body">
                    <div className="nation-picker__list">
                        {rows.map(({ nation, strength, mine }) => (
                            <button
                                key={nation.id}
                                type="button"
                                className={`nation-row${nation.id === selected.nation.id ? ' is-active' : ''}`}
                                onClick={() => setSelectedId(nation.id)}
                            >
                                <ClubCrest clubId={nation.id} size={22} />
                                <span className="nation-row__name">
                                    {nation.name}
                                    {nation.id === suggestedId && <small>SUGGESTED</small>}
                                </span>
                                {mine > 0 && <span className="nation-row__mine" title="Your cards of this nationality">{mine} yours</span>}
                                <b>{strength + bonus}</b>
                            </button>
                        ))}
                    </div>

                    <div className="nation-picker__squad">
                        <div className="nation-picker__title">
                            <ClubCrest clubId={selected.nation.id} size={34} />
                            <div>
                                <b>{selected.nation.name}</b>
                                <small>Starting XI average {selected.strength + bonus} · squad of {squad.length} · all +{upgrade}</small>
                            </div>
                        </div>
                        <ol className="nation-squad">
                            {squad.slice(0, 11).map((player) => (
                                <li key={player.playerId}>
                                    <span>{player.slotPosition}</span>
                                    <b>{player.name}</b>
                                    <small>{player.club || ''}</small>
                                    <em>{(player.overall || 0) + bonus}</em>
                                </li>
                            ))}
                        </ol>
                        <p className="nation-picker__note">
                            The nation&apos;s own best players, called up from every club — every one a <b>+{upgrade}</b> card
                            (World Cup level {level}){difficulty ? <> · difficulty <b>{difficulty.label}</b></> : null}. Your club cards are not
                            used. 8 groups of 4, then round of 16, quarter-finals, semi-finals, final — single matches,
                            a level knockout match goes to penalties.
                        </p>
                        <button type="button" className="btn btn--primary btn--large btn--block" onClick={() => onConfirm(selected.nation.id)}>
                            MANAGE {selected.nation.name.toUpperCase()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
