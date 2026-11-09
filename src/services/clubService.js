const STORAGE_KEY = 'ultimate-football-club-save'

export const INITIAL_CLUB = {
    name: 'BLUE FC',
    budget: 100000000,
    reputation: 4,
    transferWindowOpen: true,
    contracts: {},
}

export function loadClub() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)

        if (!saved) {
            return {
                ...INITIAL_CLUB,
                contracts: {},
            }
        }

        const parsed = JSON.parse(saved)

        return {
            ...INITIAL_CLUB,
            ...parsed,
            contracts: parsed.contracts || {},
        }
    } catch {
        return {
            ...INITIAL_CLUB,
            contracts: {},
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
    if (player.value) return player.value

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
    ]

    return allPlayers.reduce(
        (total, player) => {
            const contract = getContract(club, player)

            return total + contract.wage
        },
        0,
    )
}

export function formatMoney(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(amount || 0)
}
