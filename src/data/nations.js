// Phase 29E: 32 đội tuyển quốc gia cho World Cup.
// - 18 nước có giải trong game + Ghana: cầu thủ lấy từ cầu thủ sẵn có (mọi
//   CLB, danh mục 500 người, ngôi sao tên thật) có cùng quốc tịch.
// - 13 nước còn lại: thêm 22 cầu thủ tự sinh mỗi nước (data/worldSquads.js →
//   generatedNationSquad), cộng ngôi sao / cầu thủ danh mục của nước đó.
// Mỗi đội tuyển là một "CLB ảo" (id 'nat-xxx') để huy hiệu, bộ áo, tên… dùng
// chung code với CLB (worldClub(id) trả về cả đội tuyển).
//   [id, tên, viết tắt, quốc tịch (khớp player.nationality), màu 1, màu 2,
//    kho tên (chỉ nước tự sinh), độ mạnh cầu thủ tự sinh]
const RAW = [
    ['eng', 'England', 'ENG', 'England', '#ffffff', '#1d2a5a'],
    ['fra', 'France', 'FRA', 'France', '#1d2c6b', '#ffffff'],
    ['esp', 'Spain', 'ESP', 'Spain', '#c8102e', '#ffd200'],
    ['bra', 'Brazil', 'BRA', 'Brazil', '#ffdf00', '#1f4fa3'],
    ['arg', 'Argentina', 'ARG', 'Argentina', '#75aadb', '#ffffff'],
    ['ger', 'Germany', 'GER', 'Germany', '#f4f4f4', '#111111'],
    ['por', 'Portugal', 'POR', 'Portugal', '#a6192e', '#006a44'],
    ['ned', 'Netherlands', 'NED', 'Netherlands', '#ff6a13', '#1d2c6b'],
    ['ita', 'Italy', 'ITA', 'Italy', '#1f4fa3', '#ffffff'],
    ['bel', 'Belgium', 'BEL', 'Belgium', '#c8102e', '#111111'],
    ['cro', 'Croatia', 'CRO', 'Croatia', '#e2231a', '#ffffff'],
    ['uru', 'Uruguay', 'URU', 'Uruguay', '#5cbfeb', '#111111', 'es', 80],
    ['mar', 'Morocco', 'MAR', 'Morocco', '#c1272d', '#006233', 'ma', 80],
    ['col', 'Colombia', 'COL', 'Colombia', '#fcd116', '#003893', 'es', 79],
    ['den', 'Denmark', 'DEN', 'Denmark', '#c8102e', '#ffffff'],
    ['sui', 'Switzerland', 'SUI', 'Switzerland', '#d52b1e', '#ffffff', 'de', 78],
    ['sen', 'Senegal', 'SEN', 'Senegal', '#f2f2f2', '#00853f', 'af', 78],
    ['mex', 'Mexico', 'MEX', 'Mexico', '#006847', '#ffffff'],
    ['usa', 'USA', 'USA', 'USA', '#1d2a5a', '#c8102e'],
    ['jpn', 'Japan', 'JPN', 'Japan', '#1b2f78', '#ffffff'],
    ['srb', 'Serbia', 'SRB', 'Serbia', '#c6363c', '#0c4076', 'rs', 77],
    ['nga', 'Nigeria', 'NGA', 'Nigeria', '#008751', '#ffffff', 'af', 77],
    ['swe', 'Sweden', 'SWE', 'Sweden', '#fecc02', '#006aa7'],
    ['pol', 'Poland', 'POL', 'Poland', '#ffffff', '#dc143c'],
    ['tur', 'Turkey', 'TUR', 'Turkey', '#e30a17', '#ffffff'],
    ['kor', 'Korea Republic', 'KOR', 'Korea Republic', '#cd2e3a', '#0047a0', 'kr', 76],
    ['ecu', 'Ecuador', 'ECU', 'Ecuador', '#ffdd00', '#034ea2', 'es', 76],
    ['gha', 'Ghana', 'GHA', 'Ghana', '#f6f6f6', '#ce1126'],
    ['cmr', 'Cameroon', 'CMR', 'Cameroon', '#007a5e', '#ce1126', 'af', 74],
    ['can', 'Canada', 'CAN', 'Canada', '#d80621', '#ffffff', 'en', 74],
    ['aus', 'Australia', 'AUS', 'Australia', '#ffcd00', '#00843d', 'en', 73],
    ['vie', 'Vietnam', 'VIE', 'Vietnam', '#da251d', '#ffff00', 'vn', 68],
]

export const NATIONS = RAW.map(([code, name, shortName, nationality, primary, secondary, naming, strength], index) => ({
    id: `nat-${code}`,
    code,
    name,
    shortName,
    nationality,
    colors: [primary, secondary],
    color: primary,
    isNation: true,
    // Cầu thủ tự sinh: chỉ các nước không có giải trong game.
    generated: Boolean(naming),
    naming: naming || null,
    strength: strength || 80,
    countryId: code,
    // Thứ tự hạt giống bốc thăm (mạnh → yếu, sẽ tính lại theo OVR đội hình).
    seed: index,
}))

export const NATION_BY_ID = new Map(NATIONS.map((nation) => [nation.id, nation]))
export const NATION_BY_NATIONALITY = new Map(NATIONS.map((nation) => [nation.nationality, nation]))
export const isNationId = (id) => typeof id === 'string' && id.startsWith('nat-')
