
import { useEffect, useMemo, useState } from 'react'
import { FREE_AGENT, TRANSFER_MARKET } from '../data/transferMarket'
import { COUNTRIES, COUNTRY_BY_ID, INITIAL_DIVISIONS, LEAGUE_BY_ID, worldClub } from '../data/world'
import {
    loadClub,
    saveClub,
    getPlayerValue,
    getSquadValue,
    getWeeklyWages,
    getContract,
    formatMoney,
} from '../services/clubService'
import { userTeam } from '../services/career'
import { SQUAD_LIMITS, squadGroupOf, squadOf } from '../systems/roster'
import { RARITY_LABELS, cardFromCatalog, freeShirtNumber, playerIdOf } from '../services/cards'
import { StatNum, UpgradeBadge } from './CardBits'
import PlayerInfoPanel from './PlayerInfoPanel'
import { physiqueOf } from '../systems/physique'

const RARITY_FILTERS = ['ALL', 'gold', 'silver', 'bronze']
const MARKET_PAGE = 48
const RARITY_COLORS = { gold: '#e3bd62', silver: '#c9d2d8', bronze: '#c98b5a' }

const GROUP_LABELS = {
    starter: 'STARTING XI',
    bench: 'BENCH',
    reserve: 'RESERVES',
}

const POSITION_FILTERS = ['ALL', 'GK', 'DF', 'MF', 'FW']

const getPositionGroup = (position) => {
    const value = String(position || '').toUpperCase()

    if (value === 'GK') return 'GK'

    if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(value)) {
        return 'DF'
    }

    if (['CM', 'CDM', 'CAM', 'AM', 'MF', 'LM', 'RM'].includes(value)) {
        return 'MF'
    }

    return 'FW'
}

const buttonStyle = {
    border: '1px solid #3b5d4b',
    borderRadius: 6,
    padding: '7px 10px',
    background: '#203b30',
    color: '#fff',
    fontWeight: 800,
    fontSize: 11,
    cursor: 'pointer',
}

const inputStyle = {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1px solid #385344',
    borderRadius: 7,
    background: '#10251d',
    color: '#fff',
    outline: 'none',
    fontSize: 12,
}

function Stat({ label, value }) {
    return (
        <div
            style={{
                padding: 10,
                minWidth: 0,
                background: '#172f24',
                border: '1px solid #2c4939',
                borderRadius: 8,
            }}
        >
            <div style={{ color: '#9bb5a4', fontSize: 10 }}>
                {label}
            </div>

            <div
                style={{
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 17,
                    marginTop: 4,
                    overflowWrap: 'anywhere',
                }}
            >
                {value}
            </div>
        </div>
    )
}

export default function ClubManagementPanel({
                                                roster,
                                                onRosterChange,
                                                // Tùy chọn: điều khiển mở/đóng từ ngoài (dùng ở sảnh).
                                                isOpen: controlledOpen,
                                                onOpenChange,
                                                hideTrigger = false,
                                                // Phase 23: CLB do GameScene giữ (cấp độ, kho thẻ, tiền thưởng).
                                                club: controlledClub,
                                                onClubChange,
                                                initialSearch = '',
                                                world = null,
                                            }) {
    const [internalClub, setInternalClub] = useState(loadClub)
    const club = controlledClub ?? internalClub
    const setClub = onClubChange ?? setInternalClub
    const [internalOpen, setInternalOpen] = useState(false)
    const isOpen = controlledOpen ?? internalOpen
    const setIsOpen = (value) => {
        if (onOpenChange) onOpenChange(value)
        else setInternalOpen(value)
    }
    // Phase 22: màn TRANSFERS mở thẳng vào thị trường chuyển nhượng.
    const [tab, setTab] = useState('market')
    // Sau Phase 29B: bán cầu thủ phải xác nhận (trước đây bấm là bán luôn).
    const [sellConfirm, setSellConfirm] = useState(null)

    const [search, setSearch] = useState(initialSearch || '')
    const [positionFilter, setPositionFilter] = useState('ALL')
    const [sortBy, setSortBy] = useState('overall')
    const [rarityFilter, setRarityFilter] = useState('ALL')
    const [marketLimit, setMarketLimit] = useState(MARKET_PAGE)
    // Phase 26A: lọc theo nước → giải (theo hạng hiện tại) → CLB.
    const [countryFilter, setCountryFilter] = useState('ALL')
    const [leagueFilter, setLeagueFilter] = useState('ALL')
    const [clubFilter, setClubFilter] = useState('ALL')
    const divisions = world?.divisions || INITIAL_DIVISIONS
    const country = COUNTRY_BY_ID.get(countryFilter) || null
    const leagueOptions = country ? [country.topLeagueId, country.secondLeagueId] : []
    const clubOptions = useMemo(
        () =>
            leagueFilter !== 'ALL'
                ? [...(divisions[leagueFilter] || [])]
                    .map((id) => worldClub(id))
                    .filter(Boolean)
                    .sort((a, b) => a.name.localeCompare(b.name))
                : [],
        [divisions, leagueFilter],
    )
    const leagueClubs = useMemo(
        () => (leagueFilter !== 'ALL' ? new Set(divisions[leagueFilter] || []) : null),
        [divisions, leagueFilter],
    )

    const [selectedPlayer, setSelectedPlayer] = useState(null)
    // Phase 29A4b: trên điện thoại các bộ lọc thu gọn sau nút FILTERS.
    const [filtersOpen, setFiltersOpen] = useState(false)
    const activeFilters = [positionFilter, rarityFilter, countryFilter, leagueFilter, clubFilter].filter((value) => value !== 'ALL').length
    // Phase 22: thông báo dạng toast (trước đây chỉ đổi chữ ở chân panel 3 giây).
    const [toast, setToast] = useState(null)

    const blueTeam = roster.find((team) => team.id === 'blue')

    const squad = useMemo(() => {
        if (!blueTeam) return []

        return squadOf(blueTeam)
    }, [blueTeam])

    // Phase 25: mua cùng một cầu thủ bao nhiêu lần cũng được (có EP và còn
    // chỗ trong đội) — dùng làm thẻ nguyên liệu khi đập thẻ. Hiện "Owned ×N".
    const ownedCounts = useMemo(() => {
        const counts = new Map()

        squad.forEach((player) => {
            const id = playerIdOf(player)

            counts.set(id, (counts.get(id) || 0) + 1)
        })

        return counts
    }, [squad])

    const availablePlayers = useMemo(() => {
        return TRANSFER_MARKET
            .filter((player) => {
                const query = search.toLowerCase()
                const matchesSearch =
                    player.name.toLowerCase().includes(query) ||
                    (query.length >= 3 && String(player.club || '').toLowerCase().includes(query))

                const matchesPosition =
                    positionFilter === 'ALL' ||
                    getPositionGroup(player.position) === positionFilter

                const matchesRarity = rarityFilter === 'ALL' || player.rarity === rarityFilter
                const matchesCountry =
                    countryFilter === 'ALL' ||
                    (countryFilter === 'FREE' ? !player.clubId : player.countryId === countryFilter)
                const matchesLeague = !leagueClubs || leagueClubs.has(player.clubId)
                const matchesClub = clubFilter === 'ALL' || player.clubId === clubFilter

                return matchesSearch && matchesPosition && matchesRarity && matchesCountry && matchesLeague && matchesClub
            })
            .sort((a, b) => {
                if (sortBy === 'value') return a.value - b.value
                if (sortBy === 'height') return physiqueOf(b).height - physiqueOf(a).height

                return b.overall - a.overall
            })
    }, [search, positionFilter, rarityFilter, sortBy, countryFilter, leagueClubs, clubFilter])

    // Đổi bộ lọc thì hiện lại từ trang đầu.
    useEffect(() => {
        setMarketLimit(MARKET_PAGE)
    }, [search, positionFilter, rarityFilter, sortBy, countryFilter, leagueFilter, clubFilter])

    // Chỉ tự lưu khi panel tự giữ CLB (GameScene lưu bản được truyền vào).
    useEffect(() => {
        if (!controlledClub) saveClub(internalClub)
    }, [controlledClub, internalClub])

    const showMessage = (text, tone = 'info', detail = null) => {
        setToast({ text, tone, detail, key: Date.now() })
    }

    useEffect(() => {
        if (!toast) return undefined

        const timer = window.setTimeout(() => setToast(null), toast.tone === 'error' ? 3200 : 3800)

        return () => window.clearTimeout(timer)
    }, [toast])

    const buyPlayer = (player) => {
        if (!club.transferWindowOpen) {
            showMessage('TRANSFER WINDOW IS CLOSED', 'error', 'Open the transfer window in the Overview tab to sign players.')
            return
        }

        if (!blueTeam) return

        if (club.budget < player.value) {
            showMessage(
                'NOT ENOUGH TRANSFER BUDGET',
                'error',
                `${player.name} costs ${formatMoney(player.value)} · budget ${formatMoney(club.budget)}`,
            )
            return
        }

        if (squad.length >= SQUAD_LIMITS.total) {
            showMessage(
                `SQUAD IS FULL (${squad.length}/${SQUAD_LIMITS.total})`,
                'error',
                'Sell a player from the reserves to make room.',
            )
            return
        }

        // Phase 22: cầu thủ mới vào đội hình ngoài (không tự vào băng ghế dự bị).
        // Phase 23: mỗi lần mua tạo một thẻ mới (+1) với cardId riêng.
        const newPlayer = cardFromCatalog(player, { number: freeShirtNumber(squad) })

        onRosterChange((current) =>
            current.map((team) => {
                if (team.id !== 'blue') return team

                return {
                    ...team,
                    reserves: [
                        ...(team.reserves || []),
                        newPlayer,
                    ],
                }
            }),
        )

        setClub((current) => ({
            ...current,
            budget: current.budget - player.value,
            contracts: {
                ...current.contracts,
                [newPlayer.id]: {
                    wage: player.wage,
                    years: 4,
                },
            },
        }))

        setSelectedPlayer(null)
        showMessage(
            `${player.name.toUpperCase()} SIGNED`,
            'success',
            `Fee ${formatMoney(player.value)} · budget left ${formatMoney(club.budget - player.value)} · joined the reserves (${squad.length + 1}/${SQUAD_LIMITS.total})`,
        )
    }

    // Bấm SELL PLAYER: kiểm tra điều kiện rồi mở hộp xác nhận.
    const requestSell = (player) => {
        if (!club.transferWindowOpen) {
            showMessage('TRANSFER WINDOW IS CLOSED')
            return
        }

        if (!blueTeam) return

        if (squadGroupOf(blueTeam, player.id) !== 'reserve') {
            showMessage(
                `${player.name.toUpperCase()} IS IN THE MATCHDAY SQUAD`,
                'error',
                'Starters and bench players cannot be sold. Move him to the reserves in the lineup screen first.',
            )
            return
        }

        setSellConfirm(player)
    }

    // Esc = huỷ.
    useEffect(() => {
        if (!sellConfirm) return undefined

        const onKey = (event) => {
            if (event.key === 'Escape') setSellConfirm(null)
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [sellConfirm])

    const sellPlayer = (player) => {
        setSellConfirm(null)

        if (!club.transferWindowOpen) {
            showMessage('TRANSFER WINDOW IS CLOSED')
            return
        }

        if (!blueTeam) return

        // Phase 22: chỉ bán được cầu thủ ở đội hình ngoài.
        const group = squadGroupOf(blueTeam, player.id)

        if (group !== 'reserve') {
            showMessage(
                `${player.name.toUpperCase()} IS IN THE MATCHDAY SQUAD`,
                'error',
                'Starters and bench players cannot be sold. Move him to the reserves in the lineup screen first.',
            )
            return
        }

        const saleValue = Math.round(getPlayerValue(player) * 0.85)

        onRosterChange((current) =>
            current.map((team) => {
                if (team.id !== 'blue') return team

                return {
                    ...team,
                    reserves: (team.reserves || []).filter(
                        (item) => item.id !== player.id,
                    ),
                }
            }),
        )

        setClub((current) => {
            const contracts = { ...current.contracts }
            delete contracts[player.id]

            return {
                ...current,
                budget: current.budget + saleValue,
                contracts,
            }
        })

        setSelectedPlayer(null)

        showMessage(
            `${player.name.toUpperCase()} SOLD`,
            'success',
            `Received ${formatMoney(saleValue)} · budget ${formatMoney(club.budget + saleValue)}`,
        )
    }

    const updateContract = (player, field, value) => {
        setClub((current) => {
            const currentContract = getContract(current, player)

            return {
                ...current,
                contracts: {
                    ...current.contracts,
                    [player.id]: {
                        ...currentContract,
                        [field]: value,
                    },
                },
            }
        })

        showMessage('CONTRACT UPDATED', 'success', `${player.name} · ${field === 'wage' ? 'weekly wage' : 'contract length'} changed`)
    }

    const toggleTransferWindow = () => {
        setClub((current) => ({
            ...current,
            transferWindowOpen: !current.transferWindowOpen,
        }))
    }

    // Weekly wages now use each player's saved contract wage.
    const weeklyWages = getWeeklyWages(roster, club)
    const squadValue = getSquadValue(roster)

    // [key, nhãn máy tính, nhãn điện thoại]
    const tabs = [
        ['market', 'TRANSFER MARKET', 'MARKET'],
        ['squad', 'SQUAD & SALES', 'SALES'],
        ['contracts', 'CONTRACTS', 'CONTRACTS'],
        ['overview', 'OVERVIEW', 'OVERVIEW'],
    ]

    return (
        <>
            {!hideTrigger && (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    ...buttonStyle,
                    position: 'absolute',
                    top: 78,
                    left: 16,
                    zIndex: 11,
                    background: '#a87928',
                    borderColor: '#d4a64d',
                }}
            >
                TRANSFERS
            </button>
            )}

            {isOpen && (
                <div
                    className="club-panel-overlay"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 30,
                        background: 'rgba(0,0,0,0.78)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        className="club-panel"
                        style={{
                            width: 'min(900px, 94%)',
                            height: 'min(620px, 88%)',
                            maxHeight: '88%',
                            minHeight: 0,
                            background: '#0d1e16',
                            color: '#fff',
                            border: '1px solid #355642',
                            borderRadius: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 20px 70px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* HEADER */}
                        <div
                            className="club-panel__head"
                            style={{
                                flexShrink: 0,
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                borderBottom: '1px solid #294333',
                                background: '#14291e',
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 9,
                                        color: '#a9c4b2',
                                        letterSpacing: 1.5,
                                    }}
                                >
                                    TRANSFERS · {userTeam().name}
                                </div>

                                <div
                                    className="club-panel__title"
                                    style={{
                                        fontSize: 20,
                                        fontWeight: 900,
                                        marginTop: 3,
                                    }}
                                >
                                    {club.name}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    setSelectedPlayer(null)
                                }}
                                style={{
                                    ...buttonStyle,
                                    flexShrink: 0,
                                    background: '#632e2e',
                                    borderColor: '#965252',
                                }}
                            >
                                CLOSE ✕
                            </button>
                        </div>

                        {/* TABS */}
                        <div
                            className="club-panel__tabs"
                            style={{
                                flexShrink: 0,
                                display: 'flex',
                                gap: 5,
                                padding: '9px 14px',
                                borderBottom: '1px solid #294333',
                                overflowX: 'auto',
                            }}
                        >
                            {tabs.map(([key, label, phoneLabel]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={tab === key ? 'is-active' : ''}
                                    onClick={() => {
                                        setTab(key)
                                        setSelectedPlayer(null)
                                    }}
                                    style={{
                                        ...buttonStyle,
                                        whiteSpace: 'nowrap',
                                        background:
                                            tab === key
                                                ? '#a87928'
                                                : '#172f24',
                                        borderColor:
                                            tab === key
                                                ? '#d4a64d'
                                                : '#355642',
                                    }}
                                >
                                    <span className="dt-only">{label}</span>
                                    <span className="ph-only">{phoneLabel}</span>
                                </button>
                            ))}
                        </div>

                        {/* CONTENT */}
                        <div
                            className="club-panel__content"
                            style={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                padding: 14,
                                boxSizing: 'border-box',
                            }}
                        >
                            {tab === 'overview' && (
                                <div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fit, minmax(135px, 1fr))',
                                            gap: 9,
                                        }}
                                    >
                                        <Stat
                                            label="TRANSFER BUDGET"
                                            value={formatMoney(club.budget)}
                                        />

                                        <Stat
                                            label="WEEKLY WAGES"
                                            value={formatMoney(weeklyWages)}
                                        />

                                        <Stat
                                            label="SQUAD VALUE"
                                            value={formatMoney(squadValue)}
                                        />

                                        <Stat
                                            label="SQUAD SIZE"
                                            value={`${squad.length} / ${SQUAD_LIMITS.total}`}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 14,
                                            padding: 14,
                                            borderRadius: 9,
                                            background: '#172f24',
                                            border: '1px solid #355642',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 16,
                                                fontWeight: 900,
                                            }}
                                        >
                                            TRANSFER WINDOW
                                        </div>

                                        <p
                                            style={{
                                                color: '#a9c4b2',
                                                fontSize: 12,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {club.transferWindowOpen
                                                ? 'The transfer market is currently open. You can buy and sell players.'
                                                : 'The transfer market is currently closed. Transfers are unavailable.'}
                                        </p>

                                        <button
                                            onClick={toggleTransferWindow}
                                            style={{
                                                ...buttonStyle,
                                                background:
                                                    club.transferWindowOpen
                                                        ? '#713b32'
                                                        : '#28613e',
                                            }}
                                        >
                                            {club.transferWindowOpen
                                                ? 'CLOSE TRANSFER WINDOW'
                                                : 'OPEN TRANSFER WINDOW'}
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 14,
                                            color: '#9bb5a4',
                                            fontSize: 11,
                                        }}
                                    >
                                        Transfer income and expenses are
                                        reflected immediately in your club
                                        budget.
                                    </div>
                                </div>
                            )}

                            {tab === 'market' && (
                                <div className={`market-filter-box${filtersOpen ? ' is-open' : ''}`}>
                                    {/* Phase 29A4b: thanh lọc gọn trên điện thoại */}
                                    <div className="market-phone-bar">
                                        <span>{availablePlayers.length.toLocaleString()} players</span>
                                        <button
                                            type="button"
                                            className={`btn btn--small${activeFilters ? ' btn--primary' : ''}`}
                                            onClick={() => setFiltersOpen((open) => !open)}
                                            aria-expanded={filtersOpen}
                                        >
                                            FILTERS{activeFilters ? ` · ${activeFilters}` : ''} {filtersOpen ? '▲' : '▼'}
                                        </button>
                                    </div>
                                    <div
                                        className="market-filters"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'minmax(100px, 1fr) 80px 90px 110px',
                                            gap: 8,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Search player..."
                                            style={inputStyle}
                                        />

                                        <select
                                            value={positionFilter}
                                            onChange={(event) =>
                                                setPositionFilter(event.target.value)
                                            }
                                            style={inputStyle}
                                        >
                                            {POSITION_FILTERS.map((item) => (
                                                <option key={item} value={item}>
                                                    {item}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={rarityFilter}
                                            onChange={(event) =>
                                                setRarityFilter(event.target.value)
                                            }
                                            style={inputStyle}
                                            aria-label="Card rarity"
                                        >
                                            {RARITY_FILTERS.map((item) => (
                                                <option key={item} value={item}>
                                                    {item === 'ALL' ? 'ALL CARDS' : RARITY_LABELS[item].toUpperCase()}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={sortBy}
                                            onChange={(event) =>
                                                setSortBy(event.target.value)
                                            }
                                            style={inputStyle}
                                        >
                                            <option value="overall">
                                                Best Overall
                                            </option>
                                            <option value="value">
                                                Lowest Price
                                            </option>
                                            <option value="height">
                                                Tallest
                                            </option>
                                        </select>
                                    </div>

                                    <div className="market-world-filters">
                                        <select
                                            value={countryFilter}
                                            onChange={(event) => {
                                                setCountryFilter(event.target.value)
                                                setLeagueFilter('ALL')
                                                setClubFilter('ALL')
                                            }}
                                            style={inputStyle}
                                            aria-label="Country"
                                        >
                                            <option value="ALL">ALL COUNTRIES</option>
                                            {COUNTRIES.map((item) => (
                                                <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>
                                            ))}
                                            <option value="FREE">{FREE_AGENT}S</option>
                                        </select>

                                        <select
                                            value={leagueFilter}
                                            onChange={(event) => {
                                                setLeagueFilter(event.target.value)
                                                setClubFilter('ALL')
                                            }}
                                            style={inputStyle}
                                            aria-label="League"
                                            disabled={!country}
                                        >
                                            <option value="ALL">ALL LEAGUES</option>
                                            {leagueOptions.map((id) => (
                                                <option key={id} value={id}>{LEAGUE_BY_ID.get(id)?.name.toUpperCase()}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={clubFilter}
                                            onChange={(event) => setClubFilter(event.target.value)}
                                            style={inputStyle}
                                            aria-label="Club"
                                            disabled={leagueFilter === 'ALL'}
                                        >
                                            <option value="ALL">ALL CLUBS</option>
                                            {clubOptions.map((item) => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div
                                        className="market-grid"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: 10,
                                        }}
                                    >
                                        {availablePlayers.slice(0, marketLimit).map((player) => (
                                            <div
                                                key={player.id}
                                                className="market-card"
                                                style={{
                                                    padding: 11,
                                                    borderRadius: 8,
                                                    background: '#172f24',
                                                    border: '1px solid #355642',
                                                    minWidth: 0,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: 7,
                                                    }}
                                                >
                                                    <div style={{ minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                fontWeight: 900,
                                                                fontSize: 13,
                                                                overflowWrap: 'anywhere',
                                                            }}
                                                        >
                                                            {player.name}
                                                        </div>

                                                        <div
                                                            style={{
                                                                color: '#a9c4b2',
                                                                fontSize: 10,
                                                                marginTop: 4,
                                                            }}
                                                        >
                                                            {[player.position, `${physiqueOf(player).height} cm · ${physiqueOf(player).weight} kg`, player.nationality].filter(Boolean).join(' · ')}
                                                        </div>
                                                        <div className="market-club-line" title={player.club}>
                                                            {player.club || FREE_AGENT}
                                                        </div>
                                                        {ownedCounts.get(player.playerId) > 0 && (
                                                            <div className="owned-chip">
                                                                OWNED ×{ownedCounts.get(player.playerId)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div
                                                        title={`${RARITY_LABELS[player.rarity] || ''} card`}
                                                        style={{
                                                            flexShrink: 0,
                                                            textAlign: 'center',
                                                            background: RARITY_COLORS[player.rarity] || '#a87928',
                                                            color: '#14201a',
                                                            borderRadius: 7,
                                                            padding: '5px 8px',
                                                            height: 'fit-content',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: 17,
                                                                fontWeight: 900,
                                                            }}
                                                        >
                                                            {player.overall}
                                                        </div>

                                                        <div style={{ fontSize: 8 }}>
                                                            OVR
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    className="market-card__money"
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: 12,
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    <span>Transfer fee</span>
                                                    <strong>
                                                        {formatMoney(player.value)}
                                                    </strong>
                                                </div>

                                                <div
                                                    className="market-card__money"
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: 5,
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    <span>Weekly wage</span>
                                                    <strong>
                                                        {formatMoney(player.wage)}
                                                    </strong>
                                                </div>

                                                <button
                                                    className="market-card__btn"
                                                    onClick={() => setSelectedPlayer(player)}
                                                    style={{
                                                        ...buttonStyle,
                                                        width: '100%',
                                                        marginTop: 10,
                                                        background: '#28613e',
                                                    }}
                                                >
                                                    VIEW PLAYER
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {availablePlayers.length > marketLimit && (
                                        <button
                                            type="button"
                                            onClick={() => setMarketLimit((limit) => limit + MARKET_PAGE)}
                                            style={{ ...buttonStyle, width: '100%', marginTop: 12 }}
                                        >
                                            SHOW MORE ({availablePlayers.length - marketLimit} more of {availablePlayers.length})
                                        </button>
                                    )}

                                    {availablePlayers.length === 0 && (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                color: '#9bb5a4',
                                                padding: 25,
                                            }}
                                        >
                                            No players found.
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'squad' && (
                                <div
                                    className="market-grid"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                            'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: 10,
                                    }}
                                >
                                    {squad.map((player) => {
                                        const group = squadGroupOf(blueTeam, player.id)
                                        // Phase 22: đá chính và dự bị không bán được.
                                        const isStarter = group !== 'reserve'

                                        return (
                                            <div
                                                key={player.id}
                                                className="market-card"
                                                style={{
                                                    padding: 11,
                                                    borderRadius: 8,
                                                    background: '#172f24',
                                                    border: '1px solid #355642',
                                                    minWidth: 0,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <div style={{ minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                fontWeight: 900,
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            {player.name} <UpgradeBadge level={player.upgrade} />
                                                        </div>

                                                        <div
                                                            style={{
                                                                color: '#a9c4b2',
                                                                fontSize: 10,
                                                                marginTop: 4,
                                                            }}
                                                        >
                                                            {player.position} · #{player.number || '-'}
                                                        </div>
                                                    </div>

                                                    <strong
                                                        style={{
                                                            color: '#e3bd62',
                                                            fontSize: 18,
                                                        }}
                                                    >
                                                        <StatNum value={player.overall} />
                                                    </strong>
                                                </div>

                                                <div
                                                    style={{
                                                        color: isStarter
                                                            ? '#77d49a'
                                                            : '#a9c4b2',
                                                        fontSize: 10,
                                                        marginTop: 10,
                                                    }}
                                                >
                                                    {GROUP_LABELS[group] || 'RESERVES'}
                                                </div>

                                                <div
                                                    className="market-card__money"
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: 11,
                                                        marginTop: 7,
                                                    }}
                                                >
                                                    <span>Value</span>
                                                    <strong>
                                                        {formatMoney(getPlayerValue(player))}
                                                    </strong>
                                                </div>

                                                <button
                                                    className="market-card__btn"
                                                    disabled={isStarter}
                                                    onClick={() => requestSell(player)}
                                                    style={{
                                                        ...buttonStyle,
                                                        width: '100%',
                                                        marginTop: 10,
                                                        background: isStarter
                                                            ? '#39443d'
                                                            : '#713b32',
                                                        opacity: isStarter ? 0.5 : 1,
                                                        cursor: isStarter
                                                            ? 'not-allowed'
                                                            : 'pointer',
                                                    }}
                                                >
                                                    {isStarter ? 'IN MATCHDAY SQUAD' : 'SELL PLAYER'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {sellConfirm && (() => {
                                const value = getPlayerValue(sellConfirm)
                                const saleValue = Math.round(value * 0.85)
                                const level = sellConfirm.upgrade || 1
                                const copies = squad.filter(
                                    (item) => item.id !== sellConfirm.id && playerIdOf(item) === playerIdOf(sellConfirm),
                                ).length

                                return (
                                    <div
                                        className="sell-confirm-overlay"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label={`Sell ${sellConfirm.name}`}
                                        onClick={() => setSellConfirm(null)}
                                    >
                                        <div className="sell-confirm" onClick={(event) => event.stopPropagation()}>
                                            <div className="home-hero__eyebrow">CONFIRM SALE</div>
                                            <h3>SELL {sellConfirm.name.toUpperCase()}?</h3>
                                            <div className="sell-confirm__card">
                                                <StatNum value={sellConfirm.overall} />
                                                <span>{sellConfirm.position}</span>
                                                <UpgradeBadge level={level} />
                                                <small>{RARITY_LABELS[sellConfirm.rarity] || ''}</small>
                                            </div>
                                            <dl className="sell-confirm__money">
                                                <div><dt>Card value</dt><dd>{formatMoney(value)}</dd></div>
                                                <div><dt>You receive (85%)</dt><dd className="is-gain">+{formatMoney(saleValue)}</dd></div>
                                                <div><dt>Budget after sale</dt><dd>{formatMoney(club.budget + saleValue)}</dd></div>
                                            </dl>
                                            {level >= 2 && (
                                                <p className="sell-confirm__warn">
                                                    This is a +{level} card — the upgrade level is lost when you sell it.
                                                </p>
                                            )}
                                            {copies === 0 && level < 2 && (
                                                <p className="sell-confirm__note">You have no other card of this player.</p>
                                            )}
                                            <p className="sell-confirm__note">A sale cannot be undone.</p>
                                            <div className="sell-confirm__actions">
                                                <button type="button" className="btn" onClick={() => setSellConfirm(null)} autoFocus>
                                                    CANCEL
                                                </button>
                                                <button type="button" className="btn btn--danger" onClick={() => sellPlayer(sellConfirm)}>
                                                    SELL
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}

                            {tab === 'contracts' && (
                                <div className="contract-list" style={{ display: 'grid', gap: 8 }}>
                                    {squad.map((player) => {
                                        const contract = getContract(club, player)

                                        return (
                                            <div
                                                key={player.id}
                                                className="contract-row"
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns:
                                                        'minmax(100px, 1fr) minmax(100px, 130px) 75px',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: 10,
                                                    background: '#172f24',
                                                    border: '1px solid #355642',
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <div style={{ minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        {player.name}
                                                    </div>

                                                    <div
                                                        style={{
                                                            color: '#a9c4b2',
                                                            fontSize: 10,
                                                        }}
                                                    >
                                                        {player.position} · OVR {player.overall}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: 9,
                                                            color: '#9bb5a4',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        WEEKLY WAGE
                                                    </div>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={contract.wage}
                                                        onChange={(event) =>
                                                            updateContract(
                                                                player,
                                                                'wage',
                                                                Math.max(
                                                                    0,
                                                                    Number(event.target.value),
                                                                ),
                                                            )
                                                        }
                                                        style={inputStyle}
                                                    />
                                                </div>

                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: 9,
                                                            color: '#9bb5a4',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        YEARS
                                                    </div>

                                                    <select
                                                        value={contract.years}
                                                        onChange={(event) =>
                                                            updateContract(
                                                                player,
                                                                'years',
                                                                Number(event.target.value),
                                                            )
                                                        }
                                                        style={inputStyle}
                                                    >
                                                        {[1, 2, 3, 4, 5].map((year) => (
                                                            <option key={year} value={year}>
                                                                {year}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div
                            className="club-panel__foot"
                            style={{
                                flexShrink: 0,
                                padding: '8px 14px',
                                background: '#14291e',
                                borderTop: '1px solid #294333',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: 10,
                            }}
                        >
                            <span
                                style={{
                                    color: '#a9c4b2',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {`${userTeam().name} · TRANSFERS · SQUAD ${squad.length}/${SQUAD_LIMITS.total}`}
                            </span>

                            <strong style={{ flexShrink: 0 }}>
                                BUDGET: {formatMoney(club.budget)}
                            </strong>
                        </div>
                    </div>

                    {/* Phase 22: thông báo ký / bán / hợp đồng */}
                    {toast && (
                        <div
                            key={toast.key}
                            className={`toast toast--${toast.tone}`}
                            role={toast.tone === 'error' ? 'alert' : 'status'}
                            aria-live="polite"
                        >
                            <span className="toast__icon" aria-hidden="true">
                                {toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'}
                            </span>
                            <div className="toast__body">
                                <strong>{toast.text}</strong>
                                {toast.detail && <small>{toast.detail}</small>}
                            </div>
                            <button type="button" className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
                        </div>
                    )}

                    {/* PLAYER DETAIL MODAL — Phase 29A4b: thẻ lớn + thông tin như bảng 29K */}
                    {selectedPlayer && (
                        <div
                            className="market-detail-overlay"
                            role="presentation"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 35,
                                background: 'rgba(0,0,0,0.65)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: 10,
                                boxSizing: 'border-box',
                            }}
                            onClick={() => setSelectedPlayer(null)}
                        >
                            <div
                                className="market-detail"
                                role="dialog"
                                aria-label={`${selectedPlayer.name} details`}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <button type="button" className="player-info-modal__close" onClick={() => setSelectedPlayer(null)} aria-label="Close">✕</button>
                                <PlayerInfoPanel player={selectedPlayer} readOnly />

                                <dl className="market-detail__money">
                                    <div><dt>Transfer fee</dt><dd>{formatMoney(selectedPlayer.value)}</dd></div>
                                    <div><dt>Weekly wage</dt><dd>{formatMoney(selectedPlayer.wage)}</dd></div>
                                    <div>
                                        <dt>Budget after</dt>
                                        <dd className={(club.budget || 0) < selectedPlayer.value ? 'is-down' : ''}>
                                            {formatMoney((club.budget || 0) - selectedPlayer.value)}
                                        </dd>
                                    </div>
                                    {ownedCounts.get(selectedPlayer.playerId) > 0 && (
                                        <div><dt>Owned</dt><dd>×{ownedCounts.get(selectedPlayer.playerId)} (a copy can upgrade the card)</dd></div>
                                    )}
                                </dl>

                                <div className="market-detail__actions">
                                    <button type="button" className="btn" onClick={() => setSelectedPlayer(null)}>
                                        BACK
                                    </button>
                                    <button type="button" className="btn btn--primary" onClick={() => buyPlayer(selectedPlayer)}>
                                        SIGN PLAYER
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
