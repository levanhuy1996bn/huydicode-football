// Phase 26A: giải đấu của người chơi là một trong 36 giải của thế giới
// (data/world.js). Bản lưu: { season, leagueId, clubIds, fixtures,
// userMatchStats }. Các giải khác là "giải ảo" (services/worldService.js).
import {
    LEAGUE_STORAGE_KEY,
    LEAGUE_POINTS,
} from '../data/leagueData'
import { USER_CLUB_ID, hashString, worldClub } from '../data/world'

export const CURRENT_SEASON = 2026
export const FIXTURES_PER_LEAGUE = 380

function createEmptyTeamStats(teamId) {
    const team = worldClub(teamId) || { name: String(teamId).toUpperCase(), shortName: String(teamId).toUpperCase(), strength: 70 }

    return {
        teamId,
        name: team.name,
        shortName: team.shortName,
        strength: team.strength,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
    }
}

function seededRandom(seed) {
    let value = seed % 2147483647

    if (value <= 0) value += 2147483646

    return function random() {
        value = (value * 16807) % 2147483647
        return (value - 1) / 2147483646
    }
}

function generateRoundRobin(clubIds) {
    const participants = [...clubIds]
    const teamCount = participants.length

    if (teamCount % 2 !== 0) {
        participants.push(null)
    }

    const count = participants.length
    const roundsPerLeg = count - 1
    const matchesPerRound = count / 2
    const firstLeg = []
    let rotation = [...participants]

    for (let round = 0; round < roundsPerLeg; round += 1) {
        const matches = []

        for (let index = 0; index < matchesPerRound; index += 1) {
            const home = rotation[index]
            const away = rotation[count - 1 - index]

            if (!home || !away) continue

            const shouldSwap = (round + index) % 2 === 1

            matches.push({
                homeTeamId: shouldSwap ? away : home,
                awayTeamId: shouldSwap ? home : away,
            })
        }

        firstLeg.push(matches)

        const fixed = rotation[0]
        const rest = rotation.slice(1)

        rest.unshift(rest.pop())
        rotation = [fixed, ...rest]
    }

    const secondLeg = firstLeg.map((round) =>
        round.map((match) => ({
            homeTeamId: match.awayTeamId,
            awayTeamId: match.homeTeamId,
        })),
    )

    return [...firstLeg, ...secondLeg]
}

// Thứ tự CLB trong vòng tròn được xáo theo mùa + giải để lịch mỗi mùa khác nhau.
function shuffledClubs(clubIds, season, leagueId) {
    return [...clubIds].sort(
        (a, b) => hashString(`${season}:${leagueId}:${a}`) - hashString(`${season}:${leagueId}:${b}`),
    )
}

export function generateSeasonFixtures(season = CURRENT_SEASON, clubIds = [], leagueId = 'eng1') {
    const rounds = generateRoundRobin(shuffledClubs(clubIds, season, leagueId))

    return rounds.flatMap((matches, roundIndex) =>
        matches.map((match, matchIndex) => ({
            id: `s${season}-${leagueId}-r${roundIndex + 1}-m${matchIndex + 1}`,
            season,
            round: roundIndex + 1,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            played: false,
            homeGoals: null,
            awayGoals: null,
            simulated: false,
        })),
    )
}

export function createInitialLeague(season, leagueId, clubIds) {
    return {
        season,
        leagueId,
        clubIds: [...clubIds],
        fixtures: generateSeasonFixtures(season, clubIds, leagueId),
        userMatchStats: {},
        createdAt: Date.now(),
    }
}

// Bản lưu thô (có thể là bản cũ trước Phase 26, chưa có leagueId).
export function readLeagueSave() {
    try {
        const saved = localStorage.getItem(LEAGUE_STORAGE_KEY)

        return saved ? JSON.parse(saved) : null
    } catch {
        return null
    }
}

export function isValidLeagueSave(league) {
    return Boolean(
        league &&
        league.leagueId &&
        Array.isArray(league.clubIds) &&
        league.clubIds.length === 20 &&
        league.clubIds.includes(USER_CLUB_ID) &&
        Array.isArray(league.fixtures) &&
        league.fixtures.length === FIXTURES_PER_LEAGUE,
    )
}

export function saveLeague(league) {
    try {
        localStorage.setItem(
            LEAGUE_STORAGE_KEY,
            JSON.stringify(league),
        )
    } catch (error) {
        console.error('Could not save league data:', error)
    }
}

// clubIds: danh sách CLB của giải (mặc định suy ra từ lịch thi đấu).
export function getLeagueStandings(fixtures, clubIds = null) {
    const ids = clubIds || [...new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]))]
    const standings = ids.map(createEmptyTeamStats)
    const statsById = new Map(
        standings.map((team) => [team.teamId, team]),
    )

    fixtures.forEach((fixture) => {
        if (!fixture.played) return

        const home = statsById.get(fixture.homeTeamId)
        const away = statsById.get(fixture.awayTeamId)

        if (!home || !away) return

        const homeGoals = Number(fixture.homeGoals) || 0
        const awayGoals = Number(fixture.awayGoals) || 0

        home.played += 1
        away.played += 1

        home.goalsFor += homeGoals
        home.goalsAgainst += awayGoals

        away.goalsFor += awayGoals
        away.goalsAgainst += homeGoals

        if (homeGoals > awayGoals) {
            home.won += 1
            home.points += LEAGUE_POINTS.win

            away.lost += 1
            away.points += LEAGUE_POINTS.loss
        } else if (homeGoals < awayGoals) {
            away.won += 1
            away.points += LEAGUE_POINTS.win

            home.lost += 1
            home.points += LEAGUE_POINTS.loss
        } else {
            home.drawn += 1
            away.drawn += 1

            home.points += LEAGUE_POINTS.draw
            away.points += LEAGUE_POINTS.draw
        }
    })

    standings.forEach((team) => {
        team.goalDifference = team.goalsFor - team.goalsAgainst
    })

    return standings.sort((a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        b.won - a.won ||
        b.strength - a.strength,
    )
}

// CLB bất kỳ trong thế giới (id cũ 'red' = Manchester City).
export function getTeamById(teamId) {
    return worldClub(teamId)
}

export function getNextUserFixture(fixtures) {
    return fixtures
        .filter((fixture) =>
            !fixture.played &&
            (
                fixture.homeTeamId === 'blue' ||
                fixture.awayTeamId === 'blue'
            ),
        )
        .sort((a, b) =>
            a.round - b.round ||
            a.id.localeCompare(b.id),
        )[0] || null
}

function simulateGoals(home, away, seed) {
    const random = seededRandom(seed)
    const difference = home.strength - away.strength

    const homeAdvantage = 2.5
    const homeExpected = Math.max(
        0.25,
        1.25 + (difference + homeAdvantage) / 22,
    )
    const awayExpected = Math.max(
        0.2,
        1.05 - (difference + homeAdvantage) / 25,
    )

    const calculateGoals = (expected) => {
        const roll = random()
        const adjusted = expected + (random() - 0.5) * 1.8

        if (roll < 0.08) return 0
        if (adjusted < 0.65) return roll < 0.65 ? 0 : 1
        if (adjusted < 1.35) return roll < 0.25 ? 0 : roll < 0.85 ? 1 : 2
        if (adjusted < 2.1) return roll < 0.12 ? 0 : roll < 0.48 ? 1 : roll < 0.84 ? 2 : 3

        return roll < 0.1 ? 0 : roll < 0.3 ? 1 : roll < 0.65 ? 2 : roll < 0.9 ? 3 : 4
    }

    return {
        homeGoals: calculateGoals(homeExpected),
        awayGoals: calculateGoals(awayExpected),
    }
}

export function simulateFixture(fixture) {
    if (!fixture || fixture.played) return fixture

    const home = getTeamById(fixture.homeTeamId)
    const away = getTeamById(fixture.awayTeamId)

    if (!home || !away) return fixture

    const seed = hashString(`${fixture.id}:${fixture.homeTeamId}:${fixture.awayTeamId}`) % 2147483000 + 1
    const result = simulateGoals(home, away, seed)

    return {
        ...fixture,
        ...result,
        played: true,
        simulated: true,
    }
}

export function simulateOtherMatchesInRound(league, round) {
    const fixtures = league.fixtures.map((fixture) => {
        if (fixture.round !== round || fixture.played) {
            return fixture
        }

        if (
            fixture.homeTeamId === 'blue' ||
            fixture.awayTeamId === 'blue'
        ) {
            return fixture
        }

        return simulateFixture(fixture)
    })

    return {
        ...league,
        fixtures,
    }
}

export function recordUserFixtureResult(
    league,
    fixtureId,
    homeGoals,
    awayGoals,
) {
    const target = league.fixtures.find(
        (fixture) => fixture.id === fixtureId,
    )

    if (!target || target.played) {
        return league
    }

    const fixtures = league.fixtures.map((fixture) => {
        if (fixture.id !== fixtureId) return fixture

        return {
            ...fixture,
            played: true,
            simulated: false,
            homeGoals: Math.max(0, Number(homeGoals) || 0),
            awayGoals: Math.max(0, Number(awayGoals) || 0),
        }
    })

    return simulateOtherMatchesInRound(
        { ...league, fixtures },
        target.round,
    )
}


export function getSeasonProgress(fixtures) {
    const total = fixtures.length
    const played = fixtures.filter((fixture) => fixture.played).length
    const userFixtures = fixtures.filter((fixture) =>
        fixture.homeTeamId === 'blue' ||
        fixture.awayTeamId === 'blue',
    )
    const userPlayed = userFixtures.filter(
        (fixture) => fixture.played,
    ).length

    return {
        total,
        played,
        remaining: total - played,
        percentage: total > 0
            ? Math.round((played / total) * 100)
            : 0,
        userTotal: userFixtures.length,
        userPlayed,
        userRemaining: userFixtures.length - userPlayed,
        completed: userPlayed === userFixtures.length,
    }
}
