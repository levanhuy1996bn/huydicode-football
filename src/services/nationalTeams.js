// Phase 29E: đội tuyển quốc gia.
// - Kho cầu thủ của mỗi quốc tịch: cầu thủ mọi CLB thế giới (data/worldSquads),
//   danh mục 500 người (data/playerCatalog), ngôi sao tên thật (quốc tịch trong
//   data/starNationality), cầu thủ tự sinh cho 13 nước không có giải.
// - Gọi lên tuyển: 22 người theo đúng khung 22 ô của đội AI (SQUAD_TEMPLATE:
//   11 đá chính 4-3-3, 9 dự bị, 2 dự bị xa) — mỗi ô lấy người OVR cao nhất
//   cùng vị trí, rồi cùng nhóm vị trí. Thẻ của người chơi (kể cả cấp +N) thay
//   cho bản gốc của cùng cầu thủ nếu tốt hơn.
import { PLAYER_CATALOG } from '../data/playerCatalog'
import { NATIONS, NATION_BY_ID, NATION_BY_NATIONALITY } from '../data/nations'
import { nationalityOf } from '../data/starNationality'
import { SQUAD_TEMPLATE, allWorldPlayers, generatedNationSquad } from '../data/worldSquads'
import { applyUpgradeLevel } from './upgrade'
import { FORMATIONS } from '../data/teams'
import { withPhysique } from '../systems/physique'

const FAMILY = {
    GK: 'GK', CB: 'CB', LB: 'FB', LWB: 'FB', RB: 'FB', RWB: 'FB',
    CDM: 'MID', CM: 'MID', CAM: 'MID', AM: 'MID', LM: 'WING', RM: 'WING',
    LW: 'WING', RW: 'WING', ST: 'ST', CF: 'ST',
}
// Nhóm gần nhau (dự phòng khi thiếu người đúng nhóm).
const NEAR = { CB: ['FB', 'MID'], FB: ['CB', 'WING'], MID: ['CB', 'WING'], WING: ['ST', 'MID', 'FB'], ST: ['WING', 'MID'], GK: [] }
const familyOf = (position) => FAMILY[String(position || '').toUpperCase()] || 'MID'

export { nationalityOf }

export const nationOfPlayer = (player) => NATION_BY_NATIONALITY.get(nationalityOf(player)) || null

// ---- Kho cầu thủ theo quốc tịch (tạo một lần) ----
let pools = null

function buildPools() {
    const map = new Map(NATIONS.map((nation) => [nation.nationality, []]))
    const add = (player) => {
        const nationality = nationalityOf(player)

        if (map.has(nationality)) map.get(nationality).push({ ...player, nationality })
    }

    allWorldPlayers().forEach(add)
    PLAYER_CATALOG.forEach((player) => add(withPhysique({ ...player, clubId: null, upgrade: 1 })))
    NATIONS.filter((nation) => nation.generated).forEach((nation) => generatedNationSquad(nation).forEach(add))

    return map
}

export function nationPool(nationId) {
    if (!pools) pools = buildPools()

    const nation = NATION_BY_ID.get(nationId)

    return nation ? pools.get(nation.nationality) || [] : []
}

// ---- Gọi lên tuyển ----
const squadCache = new Map()

function pickSquad(candidates) {
    const used = new Set()
    const take = (test) => {
        const best = candidates.find((player) => !used.has(player.playerId) && test(player))

        if (best) used.add(best.playerId)
        return best || null
    }

    return SQUAD_TEMPLATE.map(([position, number]) => {
        const family = familyOf(position)
        const isGK = family === 'GK'
        const player =
            take((item) => item.position === position) ||
            take((item) => familyOf(item.position) === family) ||
            (isGK ? null : NEAR[family].reduce((found, near) => found || take((item) => familyOf(item.position) === near), null)) ||
            take((item) => (familyOf(item.position) === 'GK') === isGK) ||
            take(() => true)

        return player ? { ...player, slotPosition: position, shirt: number } : null
    }).filter(Boolean)
}

// userCards: thẻ của người chơi (cùng quốc tịch thì được gọi nếu đủ giỏi).
export function nationalSquad(nationId, { userCards = [] } = {}) {
    const key = `${nationId}:${userCards.map((card) => `${card.id}:${card.overall}`).join(',')}`

    if (squadCache.has(key)) return squadCache.get(key)

    const nation = NATION_BY_ID.get(nationId)

    if (!nation) return []

    const best = new Map()
    const consider = (player, own = false) => {
        const id = player.playerId || player.id
        const current = best.get(id)

        if (!current || (player.overall || 0) > (current.overall || 0) || (own && (player.overall || 0) >= (current.overall || 0))) {
            best.set(id, { ...player, playerId: id, ownCard: own })
        }
    }

    nationPool(nationId).forEach((player) => consider(player))
    userCards
        .filter((card) => nationalityOf(card) === nation.nationality)
        .forEach((card) => consider({ ...card, nationality: nation.nationality }, true))

    const candidates = [...best.values()].sort((a, b) => (b.overall || 0) - (a.overall || 0))
    const squad = pickSquad(candidates).map((player, slot) => ({
        ...player,
        slot,
        position: player.position,
        number: player.shirt,
        condition: 100,
    }))

    if (squadCache.size > 80) squadCache.clear()
    squadCache.set(key, squad)
    return squad
}

// OVR trung bình 11 người đá chính (độ mạnh đội tuyển).
export function nationStrength(nationId) {
    const squad = nationalSquad(nationId)
    const starters = squad.slice(0, 11)

    if (!starters.length) return 60

    return Math.round(starters.reduce((sum, player) => sum + (player.overall || 0), 0) / starters.length)
}

// Đội tuyển của người chơi cho trận 3D (đội 'blue'): 11 người xếp vào sơ đồ,
// 9 dự bị, còn lại dự bị xa. baseTeam = đội blue của CLB (giữ chiến thuật…).
// Phase 30C: đội tuyển chỉ gồm cầu thủ của quốc gia đó (không gọi thẻ CLB của
// người chơi nữa) và cả đội là thẻ +upgrade theo cấp World Cup.
export function nationalTeamForMatch(baseTeam, nationId, { userCards = [], formationKey = '4-3-3', upgrade = 1 } = {}) {
    const nation = NATION_BY_ID.get(nationId)
    const squad = nationalSquad(nationId, { userCards })
    const formation = FORMATIONS[formationKey] || FORMATIONS['4-3-3']
    const toPlayer = (player) => applyUpgradeLevel({
        ...player,
        upgrade: player.upgrade || 1,
        naturalPosition: player.position,
        condition: 100,
    }, Math.max(player.upgrade || 1, upgrade))
    const [startersRaw, benchRaw, reservesRaw] = [squad.slice(0, 11), squad.slice(11, 20), squad.slice(20)]
    const starters = formation.map(([position, x, z], index) => ({
        ...toPlayer(startersRaw[index] || startersRaw[startersRaw.length - 1]),
        x,
        z,
    }))

    return {
        ...baseTeam,
        id: 'blue',
        name: nation?.name || 'NATIONAL TEAM',
        shortName: nation?.shortName || 'NAT',
        color: nation?.color || baseTeam?.color,
        formationKey: FORMATIONS[formationKey] ? formationKey : '4-3-3',
        nationId,
        wcUpgrade: upgrade,
        players: starters,
        substitutes: benchRaw.map((player, index) => ({ ...toPlayer(player), x: -28 + index * 7, z: 48 })),
        reserves: reservesRaw.map(toPlayer),
    }
}

// Nước gợi ý cho người chơi: quốc tịch đông nhất trong 11 người đá chính
// (trong 32 đội), không có thì đội tuyển mạnh nhất có thẻ của người chơi,
// không có nữa thì nước của CLB đang dẫn dắt (nếu có), cuối cùng là Anh.
export function suggestedNation(players = [], clubCountryId = null) {
    const counts = new Map()

    players.forEach((player) => {
        const nation = nationOfPlayer(player)

        if (nation) counts.set(nation.id, (counts.get(nation.id) || 0) + 1)
    })

    const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])

    if (top) return top[0]

    const byClub = NATIONS.find((nation) => nation.code === clubCountryId)

    return byClub?.id || 'nat-eng'
}
