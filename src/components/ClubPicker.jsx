import { useMemo, useState } from 'react'
import { COUNTRIES, COUNTRY_BY_ID, LEAGUE_BY_ID, worldClub } from '../data/world'
import { KIT_LABELS, KIT_SLOTS, kitsOf } from '../data/kits'
import { KitIcon } from './screens/PreMatchScreen'
import ClubCrest from './ClubCrest'

// Phase 26B: chọn CLB để quản lý (720 CLB của 36 giải).
//   mode 'start'  — lần đầu chơi
//   mode 'season' — sang mùa mới (giữ CLB hoặc đổi)
//   mode 'change' — đổi giữa mùa (mùa đang đá bắt đầu lại)
// Đổi CLB chỉ đổi đội (tên, áo, huy hiệu, giải); thẻ, đội hình, EP, cấp CLB,
// kho đồ giữ nguyên.
const TITLES = {
    start: 'Choose your club',
    season: 'New season · choose your club',
    change: 'Change club',
}

function leagueOfClub(divisions, clubId) {
    const entry = Object.entries(divisions).find(([, clubIds]) => clubIds.includes(clubId))

    return entry ? LEAGUE_BY_ID.get(entry[0]) : null
}

export default function ClubPicker({
    mode = 'change',
    world,
    currentClubId,
    roundsPlayed = 0,
    onConfirm,
    onCancel,
}) {
    const divisions = world.divisions
    const currentLeague = leagueOfClub(divisions, currentClubId)
    const [selectedId, setSelectedId] = useState(currentClubId)
    const [leagueId, setLeagueId] = useState(currentLeague?.id || 'eng1')
    const [search, setSearch] = useState('')
    const league = LEAGUE_BY_ID.get(leagueId)
    const country = COUNTRY_BY_ID.get(league?.countryId)

    const clubs = useMemo(() => {
        const query = search.trim().toLowerCase()

        if (query.length >= 2) {
            return Object.values(divisions)
                .flat()
                .map((id) => worldClub(id))
                .filter((club) => club && club.fullName.toLowerCase().includes(query))
                .slice(0, 40)
        }

        return (divisions[leagueId] || [])
            .map((id) => worldClub(id))
            .filter(Boolean)
            .sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name))
    }, [divisions, leagueId, search])

    const selected = worldClub(selectedId)
    const selectedLeague = leagueOfClub(divisions, selectedId)
    const kits = selected ? kitsOf(selected.id) : null
    const sameClub = selectedId === currentClubId
    const restart = mode === 'change' && !sameClub && roundsPlayed > 0

    const confirmLabel =
        mode === 'start'
            ? 'START CAREER'
            : mode === 'season'
                ? sameClub ? `KEEP ${worldClub(currentClubId)?.shortName} · START SEASON ${world.season + 1}` : `START SEASON ${world.season + 1}`
                : restart ? 'CHANGE CLUB & RESTART SEASON' : 'CHANGE CLUB'

    return (
        <div className="club-picker-overlay">
            <div className="club-picker" role="dialog" aria-label={TITLES[mode]}>
                <header className="club-picker__head">
                    <div>
                        <div className="home-hero__eyebrow">
                            {mode === 'season' ? `SEASON ${world.season} FINISHED` : `SEASON ${world.season}`}
                        </div>
                        <h2>{TITLES[mode]}</h2>
                    </div>
                    {onCancel && mode !== 'start' && (
                        <button type="button" className="league-close" onClick={onCancel} aria-label="Close">×</button>
                    )}
                </header>

                <div className="club-picker__body">
                    <div className="club-picker__browse">
                        <div className="club-picker__filters">
                            <select
                                value={country?.id || 'eng'}
                                onChange={(event) => {
                                    const next = COUNTRY_BY_ID.get(event.target.value)

                                    if (next) setLeagueId(next.topLeagueId)
                                    setSearch('')
                                }}
                                aria-label="Country"
                            >
                                {COUNTRIES.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>
                                ))}
                            </select>
                            <div className="segmented" role="radiogroup" aria-label="Division">
                                {[country?.topLeagueId, country?.secondLeagueId].filter(Boolean).map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className={leagueId === id && !search ? 'is-active' : ''}
                                        onClick={() => {
                                            setLeagueId(id)
                                            setSearch('')
                                        }}
                                    >
                                        {LEAGUE_BY_ID.get(id)?.name}
                                    </button>
                                ))}
                            </div>
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search club…"
                                aria-label="Search club"
                            />
                        </div>

                        <div className="club-picker__list">
                            {clubs.map((club) => (
                                <button
                                    key={club.id}
                                    type="button"
                                    className={[
                                        'club-picker__club',
                                        club.id === selectedId ? 'is-active' : '',
                                        club.id === currentClubId ? 'is-current' : '',
                                    ].join(' ')}
                                    onClick={() => setSelectedId(club.id)}
                                >
                                    <ClubCrest clubId={club.id} size={26} />
                                    <span>
                                        {club.name}
                                        <small>
                                            {search ? `${leagueOfClub(divisions, club.id)?.name} · ` : ''}
                                            STR {club.strength}
                                            {club.id === currentClubId ? ' · CURRENT' : ''}
                                        </small>
                                    </span>
                                </button>
                            ))}
                            {clubs.length === 0 && <p className="home-card__empty">No club found.</p>}
                        </div>
                    </div>

                    {selected && (
                        <div className="club-picker__preview">
                            <ClubCrest clubId={selected.id} size={84} />
                            <h3>{selected.fullName}</h3>
                            <p>
                                {selected.country} · {selectedLeague?.name}
                                <br />
                                Strength {selected.strength}
                            </p>
                            <div className="club-picker__kits">
                                {KIT_SLOTS.map((slot) => (
                                    <div key={slot}>
                                        <KitIcon kit={kits[slot]} />
                                        <small>{KIT_LABELS[slot]}</small>
                                    </div>
                                ))}
                            </div>
                            <p className="club-picker__note">
                                Only the team changes: name, kits, crest and league. Your cards, squad, EP,
                                club level and inventory stay the same.
                            </p>
                            {mode === 'season' && (
                                <p className="club-picker__note">
                                    Promotion and relegation are applied first, so the league next season can differ.
                                </p>
                            )}
                            {restart && (
                                <p className="club-picker__warning">
                                    Season in progress ({roundsPlayed} match{roundsPlayed === 1 ? '' : 'es'} played):
                                    your results this season are dropped and season {world.season} starts again
                                    from round 1 in {selectedLeague?.name}.
                                </p>
                            )}
                            <button
                                type="button"
                                className="btn btn--primary btn--large btn--block"
                                disabled={mode === 'change' && sameClub}
                                onClick={() => onConfirm(selected.id)}
                            >
                                {confirmLabel}
                            </button>
                            {mode === 'season' && !sameClub && (
                                <button
                                    type="button"
                                    className="btn btn--block"
                                    onClick={() => onConfirm(currentClubId)}
                                >
                                    KEEP {worldClub(currentClubId)?.name}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
