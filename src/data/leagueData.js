// Đội 'blue' luôn là đội người chơi quản lý (id nội bộ giữ nguyên để không
// phá dữ liệu lưu và engine). Đội 'red' là đối thủ mặc định / cùng thành phố.
export const LEAGUE_TEAMS = [
    { id: 'blue', name: 'MANCHESTER UNITED', shortName: 'MUN', strength: 79, color: '#da291c' },
    { id: 'red', name: 'MANCHESTER CITY', shortName: 'MCI', strength: 81, color: '#6cabdd' },
    { id: 'northbridge', name: 'NORTHBRIDGE CITY', shortName: 'NBC', strength: 82 },
    { id: 'royal', name: 'ROYAL ATHLETIC', shortName: 'RAT', strength: 80 },
    { id: 'london', name: 'LONDON ROVERS', shortName: 'LRO', strength: 78 },
    { id: 'wolves', name: 'MANCHESTER WOLVES', shortName: 'MWO', strength: 83 },
    { id: 'stars', name: 'LIVERPOOL STARS', shortName: 'LST', strength: 84 },
    { id: 'eastside', name: 'EASTSIDE FC', shortName: 'EAS', strength: 76 },
    { id: 'westham', name: 'WESTHAM RANGERS', shortName: 'WHR', strength: 77 },
    { id: 'newcastle', name: 'NEWCASTLE ROYALS', shortName: 'NCR', strength: 79 },
    { id: 'brighton', name: 'BRIGHTON COAST', shortName: 'BRC', strength: 77 },
    { id: 'foxes', name: 'LEICESTER FOXES', shortName: 'LFX', strength: 75 },
    { id: 'villa', name: 'ASTON VILLA FC', shortName: 'AVF', strength: 80 },
    { id: 'tottenham', name: 'TOTTENHAM NORTH', shortName: 'TOT', strength: 82 },
    { id: 'arsenal', name: 'ARSENAL RED', shortName: 'ARS', strength: 85 },
    { id: 'chelsea', name: 'CHELSEA BLUE', shortName: 'CHE', strength: 83 },
    { id: 'everton', name: 'EVERTON ATHLETIC', shortName: 'EVA', strength: 75 },
    { id: 'sunderland', name: 'SUNDERLAND FC', shortName: 'SUN', strength: 73 },
    { id: 'burnley', name: 'BURNLEY TOWN', shortName: 'BUR', strength: 72 },
    { id: 'palace', name: 'CRYSTAL PALACE', shortName: 'CRP', strength: 76 },
]

export const LEAGUE_STORAGE_KEY = 'ultimate-football-league-save'

export const LEAGUE_POINTS = {
    win: 3,
    draw: 1,
    loss: 0,
}

// Đội người chơi đang quản lý.
export const USER_TEAM_ID = 'blue'
export const USER_TEAM = LEAGUE_TEAMS.find((team) => team.id === USER_TEAM_ID)
