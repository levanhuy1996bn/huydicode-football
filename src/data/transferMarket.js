// Phase 23: thị trường chuyển nhượng lấy cầu thủ từ danh mục 500 cầu thủ
// (data/playerCatalog.js). 20 cầu thủ cũ (market-001…020) nằm trong danh mục
// với id giữ nguyên, nên bản lưu cũ vẫn khớp.
//
// Phase 25: thêm toàn bộ cầu thủ Manchester United ban đầu (đá chính + dự bị,
// data/teams.js) với đúng id cũ (blue-9, blue-sub-12…) làm playerId, để mua
// được bản sao và đập thẻ cho đội hình gốc. Giá theo OVR như danh mục.
//
// Phase 26A: thêm toàn bộ cầu thủ của 720 CLB thế giới (data/worldSquads.js,
// ~15.800 người; 3–5 ngôi sao tên thật mỗi CLB hạng nhất). Thị trường kiểu
// thẻ FO4: mua thẻ cầu thủ bất kỳ, CLB của cầu thủ không mất người.
// 500 cầu thủ danh mục cũ thành cầu thủ tự do (FREE AGENT).
import { PLAYER_CATALOG } from './playerCatalog'
import { TEAMS } from './teams'
import { USER_CLUB_ID, worldClub } from './world'
import { allWorldPlayers } from './worldSquads'
import { withPhysique } from '../systems/physique'

export const FREE_AGENT = 'FREE AGENT'

const rarityOf = (overall) => (overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze')
const valueOf = (overall) => Math.max(100000, Math.round((1000000 * Math.pow(1.152, overall - 60)) / 100000) * 100000)

function clubPlayers() {
    const blue = TEAMS.find((team) => team.id === 'blue')

    if (!blue) return []

    return [...blue.players, ...(blue.substitutes || [])].map((player) => {
        const value = valueOf(player.overall)

        return {
            id: player.id,
            playerId: player.id,
            name: player.name,
            age: 26,
            position: player.position,
            overall: player.overall,
            pace: player.pace,
            shooting: player.shooting,
            passing: player.passing,
            dribbling: player.dribbling,
            defending: player.defending,
            physical: player.physical,
            value,
            wage: Math.max(2000, Math.round((value * 0.003) / 1000) * 1000),
            nationality: 'Manchester United',
            rarity: rarityOf(player.overall),
            height: player.height,
            weight: player.weight,
            clubId: USER_CLUB_ID,
            club: worldClub(USER_CLUB_ID)?.name || 'MANCHESTER UNITED',
            countryId: 'eng',
        }
    })
}

const freeAgents = () =>
    PLAYER_CATALOG.map((player) => withPhysique({ ...player, clubId: null, club: FREE_AGENT, countryId: null }))

export const TRANSFER_MARKET = [...clubPlayers(), ...allWorldPlayers(), ...freeAgents()]
export const MARKET_BY_PLAYER_ID = new Map(TRANSFER_MARKET.map((player) => [player.playerId, player]))
