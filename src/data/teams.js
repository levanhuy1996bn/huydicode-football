import { USER_TEAM } from './leagueData'
import { worldClub } from './world'
import { generatePhysique } from '../systems/physique'

const clampStat = (value) => Math.max(1, Math.min(99, value))

// Phase 19: chỉ số chính theo vị trí (độ lệch so với overall). Trước đây
// mọi chỉ số ≈ overall, nên tiền đạo tắc bóng giỏi như trung vệ và thủ môn
// sút giỏi như tiền đạo.
export const POSITION_PROFILES = {
  GK: { pace: -25, shooting: -45, passing: -20, dribbling: -30, defending: -40, physical: -10 },
  CB: { pace: -8, shooting: -30, passing: -12, dribbling: -18, defending: 4, physical: 3 },
  FB: { pace: 2, shooting: -22, passing: -6, dribbling: -6, defending: 0, physical: -3 },
  DM: { pace: -8, shooting: -14, passing: 0, dribbling: -6, defending: 2, physical: 2 },
  CM: { pace: -6, shooting: -6, passing: 3, dribbling: 1, defending: -10, physical: -3 },
  AM: { pace: -2, shooting: 0, passing: 3, dribbling: 3, defending: -30, physical: -10 },
  WG: { pace: 5, shooting: -3, passing: -3, dribbling: 3, defending: -38, physical: -12 },
  ST: { pace: 1, shooting: 3, passing: -10, dribbling: -1, defending: -40, physical: 0 },
}

export function profileFor(position) {
  const value = String(position || '').toUpperCase()

  if (value === 'GK') return POSITION_PROFILES.GK
  if (value === 'CB') return POSITION_PROFILES.CB
  if (['LB', 'RB', 'LWB', 'RWB'].includes(value)) return POSITION_PROFILES.FB
  if (value === 'CDM') return POSITION_PROFILES.DM
  if (['CAM', 'AM'].includes(value)) return POSITION_PROFILES.AM
  if (['LW', 'RW', 'LM', 'RM'].includes(value)) return POSITION_PROFILES.WG
  if (['ST', 'CF'].includes(value)) return POSITION_PROFILES.ST

  return POSITION_PROFILES.CM
}

// Sáu chỉ số chính của một cầu thủ theo vị trí, overall và số áo.
export function baseStats(position, number, overall) {
  const profile = profileFor(position)
  const statVariation = {
    pace: (number * 5 + 2) % 7 - 3,
    shooting: (number * 5) % 9 - 4,
    passing: (number * 3) % 7 - 3,
    dribbling: (number * 11) % 9 - 4,
    defending: (number * 13) % 9 - 4,
    physical: (number * 17) % 7 - 3,
  }

  return Object.fromEntries(
    Object.entries(statVariation).map(([key, variation]) => [
      key,
      clampStat(overall + profile[key] + variation),
    ]),
  )
}

const makePlayer = (
    id,
    name,
    position,
    number,
    x,
    z,
    overall,
) => ({
    id,
    name,
    position,
    number,
    x,
    z,
    overall,
    ...baseStats(position, number, overall),
    // Phase 26C: chiều cao / cân nặng cố định theo id cầu thủ.
    ...generatePhysique(id, position),
})

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

// Tên cầu thủ đá chính (hư cấu). Trước đây là tên mặc định kiểu "Blue ST 9".
// Tên cầu thủ đá chính (hư cấu).
//   blue = đội người chơi (Manchester United), red = Manchester City.
export const STARTER_NAMES = {
  blue: {
    1: 'Diego Navarro',
    2: 'Iker Mendoza',
    3: 'Mateo Herrera',
    4: 'Sergio Castillo',
    5: 'Alvaro Dominguez',
    6: 'Rodrigo Valverde',
    7: 'Joaquin Montenegro',
    8: 'Hugo Salvatierra',
    9: 'Huy Le',
    10: 'Rafael Ibanez',
    11: 'Bruno Esquivel',
  },
  red: {
    1: 'Matthew Harrington',
    2: 'Noah Pembroke',
    3: 'Liam Fitzgerald',
    4: 'Samuel Whitaker',
    5: 'Benjamin Ashcroft',
    6: 'Alexander Montgomery',
    7: 'Marcus Delacroix-Okafor',
    8: 'Lucas Fernandes',
    9: 'Ethan Blackwood',
    10: 'Gabriel Santos',
    11: 'Kai Nakamura',
  },
}

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
                STARTER_NAMES[teamId]?.[number] || `${prefix} ${position} ${number}`,
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

// Ô đối thủ trong engine; mỗi trận được thay bằng đội hình CLB thật
// (systems/roster.js → buildMatchRoster). Mặc định là Manchester City.
const RIVAL_TEAM = worldClub('eng-manchester-city')

export const TEAMS = [
  // Đội người chơi: Manchester United (trước đây là đội hình "RED UNITED").
  buildTeam(
      'blue',
      USER_TEAM.name,
      USER_TEAM.shortName,
      USER_TEAM.color,
      homeFormation,
      redBench,
      -1,
  ),

  // Đối thủ mặc định: Manchester City (trước đây là đội hình "BLUE FC").
  buildTeam(
      'red',
      RIVAL_TEAM.name,
      RIVAL_TEAM.shortName,
      RIVAL_TEAM.color,
      awayFormation,
      blueBench,
      1,
  ),
]
