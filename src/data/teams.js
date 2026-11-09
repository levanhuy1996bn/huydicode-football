const clampStat = (value) => Math.max(1, Math.min(99, value))

const makePlayer = (
    id,
    name,
    position,
    number,
    x,
    z,
    overall,
) => {
  const statVariation = {
    pace: (number * 7) % 7 - 3,
    shooting: (number * 5) % 9 - 4,
    passing: (number * 3) % 7 - 3,
    dribbling: (number * 11) % 9 - 4,
    defending: (number * 13) % 9 - 4,
    physical: (number * 17) % 7 - 3,
  }

  return {
    id,
    name,
    position,
    number,
    x,
    z,
    overall,
    pace: clampStat(overall + statVariation.pace),
    shooting: clampStat(overall + statVariation.shooting),
    passing: clampStat(overall + statVariation.passing),
    dribbling: clampStat(overall + statVariation.dribbling),
    defending: clampStat(overall + statVariation.defending),
    physical: clampStat(overall + statVariation.physical),
  }
}

const homeFormation = [
  ['GK', 1, 0, 46, 78],
  ['LB', 3, -23, 32, 76],
  ['CB', 4, -8, 35, 79],
  ['CB', 5, 8, 35, 78],
  ['RB', 2, 23, 32, 76],
  ['CM', 6, -15, 9, 80],
  ['CM', 8, 0, 5, 82],
  ['CM', 10, 15, 9, 84],
  ['LW', 11, -21, -24, 83],
  ['ST', 9, 0, -29, 86],
  ['RW', 7, 21, -24, 82],
]

const awayFormation = [
  ['GK', 1, 0, -46, 77],
  ['LB', 3, -23, -32, 75],
  ['CB', 4, -8, -35, 78],
  ['CB', 5, 8, -35, 77],
  ['RB', 2, 23, -32, 75],
  ['CM', 6, -15, -9, 79],
  ['CM', 8, 0, -5, 81],
  ['CM', 10, 15, -9, 82],
  ['LW', 11, -21, 24, 81],
  ['ST', 9, 0, 29, 84],
  ['RW', 7, 21, 24, 80],
]

const blueBench = [
  ['GK', 12, 'Daniel Cooper', 74],
  ['CB', 13, 'Jack Robinson', 76],
  ['LB', 14, 'Ryan Walker', 75],
  ['CM', 15, 'Henry Clark', 78],
  ['CAM', 16, 'Charlie Lewis', 80],
  ['LW', 17, 'Oscar Hall', 79],
  ['ST', 18, 'Thomas Young', 81],
]

const redBench = [
  ['GK', 12, 'Andres Romero', 73],
  ['CB', 13, 'Pablo Torres', 76],
  ['RB', 14, 'Javier Diaz', 75],
  ['CM', 15, 'Adrian Vega', 78],
  ['CAM', 16, 'Nicolas Cruz', 79],
  ['RW', 17, 'Felipe Reyes', 80],
  ['ST', 18, 'Luis Moreno', 81],
]

const buildTeam = (
    teamId,
    name,
    shortName,
    color,
    formation,
    bench,
    offset,
) => {
  const prefix = teamId === 'blue' ? 'Blue' : 'Red'

  return {
    id: teamId,
    name,
    shortName,
    color,
    formationKey: '4-3-3',

    players: formation.map(
        ([position, number, x, z, overall]) =>
            makePlayer(
                `${teamId}-${number}`,
                `${prefix} ${position} ${number}`,
                position,
                number,
                x,
                z,
                overall + offset,
            ),
    ),

    substitutes: bench.map(
        ([position, number, playerName, overall], index) =>
            makePlayer(
                `${teamId}-sub-${number}`,
                playerName,
                position,
                number,
                -28 + index * 8,
                teamId === 'blue' ? 48 : -48,
                overall + offset,
            ),
    ),
  }
}

export const FORMATIONS = {
  '4-3-3': [
    ['GK', 0, 46],
    ['LB', -23, 32],
    ['CB', -8, 35],
    ['CB', 8, 35],
    ['RB', 23, 32],
    ['CM', -15, 9],
    ['CM', 0, 5],
    ['CM', 15, 9],
    ['LW', -21, -24],
    ['ST', 0, -29],
    ['RW', 21, -24],
  ],

  '4-4-2': [
    ['GK', 0, 46],
    ['LB', -23, 32],
    ['CB', -8, 35],
    ['CB', 8, 35],
    ['RB', 23, 32],
    ['LM', -22, 8],
    ['CM', -7, 9],
    ['CM', 7, 9],
    ['RM', 22, 8],
    ['ST', -9, -27],
    ['ST', 9, -27],
  ],

  '4-2-3-1': [
    ['GK', 0, 46],
    ['LB', -23, 32],
    ['CB', -8, 35],
    ['CB', 8, 35],
    ['RB', 23, 32],
    ['CDM', -10, 15],
    ['CDM', 10, 15],
    ['LW', -21, -7],
    ['CAM', 0, -10],
    ['RW', 21, -7],
    ['ST', 0, -29],
  ],
}

export const TEAMS = [
  buildTeam(
      'blue',
      'BLUE FC',
      'BLU',
      '#2387ff',
      homeFormation,
      blueBench,
      0,
  ),

  buildTeam(
      'red',
      'RED UNITED',
      'RED',
      '#ed4545',
      awayFormation,
      redBench,
      -1,
  ),
]
