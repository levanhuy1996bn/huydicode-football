// Phase 23: thị trường chuyển nhượng lấy cầu thủ từ danh mục 500 cầu thủ
// (data/playerCatalog.js). 20 cầu thủ cũ (market-001…020) nằm trong danh mục
// với id giữ nguyên, nên bản lưu cũ vẫn khớp.
//
// Phase 25: thêm toàn bộ cầu thủ Manchester United ban đầu (đá chính + dự bị,
// data/teams.js) với đúng id cũ (blue-9, blue-sub-12…) làm playerId, để mua
// được bản sao và đập thẻ cho đội hình gốc. Giá theo OVR như danh mục.
import { PLAYER_CATALOG } from './playerCatalog'
import { TEAMS } from './teams'

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
        }
    })
}

export const TRANSFER_MARKET = [...clubPlayers(), ...PLAYER_CATALOG]
