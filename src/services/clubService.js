import { USER_TEAM } from '../data/leagueData'
import { upgradeValueFactor } from './upgrade'

const STORAGE_KEY = 'ultimate-football-club-save'

export const INITIAL_CLUB = {
    name: USER_TEAM.name,
    budget: 100000000,
    reputation: 4,
    transferWindowOpen: true,
    contracts: {},
    // Phase 23: cấp độ CLB, XP, kho thẻ (gói cầu thủ, thẻ EP), thưởng cuối mùa đã nhận.
    level: 0,
    xp: 0,
    inventory: [],
    seasonBonusPaid: {},
}

export function loadClub() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)

        if (!saved) {
            return {
                ...INITIAL_CLUB,
                contracts: {},
                inventory: [],
                seasonBonusPaid: {},
            }
        }

        const parsed = JSON.parse(saved)

        return {
            ...INITIAL_CLUB,
            ...parsed,
            name: INITIAL_CLUB.name,
            contracts: parsed.contracts || {},
            level: Number(parsed.level) || 0,
            xp: Number(parsed.xp) || 0,
            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
            seasonBonusPaid: parsed.seasonBonusPaid || {},
        }
    } catch {
        return {
            ...INITIAL_CLUB,
            contracts: {},
            inventory: [],
            seasonBonusPaid: {},
        }
    }
}

export function saveClub(club) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(club),
        )
    } catch (error) {
        console.error('Could not save club data:', error)
    }
}

export function getPlayerValue(player) {
    // Phase 25: thẻ +N đáng giá hơn (+5 ×2.5, +10 ×20).
    if (player.value) return Math.round(player.value * upgradeValueFactor(player.upgrade))

    const overall = player.overall || 60
    const age = player.age || 25

    const ageMultiplier =
        age <= 21 ? 1.25 :
            age <= 25 ? 1.15 :
                age <= 29 ? 1 :
                    age <= 32 ? 0.75 : 0.5

    return Math.round(
        Math.pow(overall / 50, 3) *
        1000000 *
        ageMultiplier,
    )
}

export function getPlayerWage(player) {
    if (player.wage) return player.wage

    return Math.round(
        Math.pow((player.overall || 60) / 50, 3) * 3500,
    )
}

export function getSquadValue(roster) {
    const blueTeam = roster.find((team) => team.id === 'blue')

    if (!blueTeam) return 0

    const allPlayers = [
        ...(blueTeam.players || []),
        ...(blueTeam.substitutes || []),
        ...(blueTeam.reserves || []),
    ]

    return allPlayers.reduce(
        (total, player) => total + getPlayerValue(player),
        0,
    )
}

export function getContract(club, player) {
    const saved = club?.contracts?.[player.id]

    if (saved) {
        return {
            wage: Number.isFinite(Number(saved.wage))
                ? Number(saved.wage)
                : getPlayerWage(player),
            years: Number.isFinite(Number(saved.years))
                ? Number(saved.years)
                : 3,
        }
    }

    return {
        wage: getPlayerWage(player),
        years: 3,
    }
}

export function getWeeklyWages(roster, club = INITIAL_CLUB) {
    const blueTeam = roster.find((team) => team.id === 'blue')

    if (!blueTeam) return 0

    const allPlayers = [
        ...(blueTeam.players || []),
        ...(blueTeam.substitutes || []),
        ...(blueTeam.reserves || []),
    ]

    return allPlayers.reduce(
        (total, player) => {
            const contract = getContract(club, player)

            return total + contract.wage
        },
        0,
    )
}

// Phase 23: tiền của CLB là EP (trước đây hiển thị EUR).
export function formatMoney(amount) {
    return `${Math.round(amount || 0).toLocaleString('en-US')} EP`
}
