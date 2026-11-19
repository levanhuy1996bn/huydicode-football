// Phase 53A: economy — các thao tác chạm vào EP / kho đồ / thẻ được viết thành
// hàm thuần (reducer) dùng chung cho game và server.
//
//   runAction({ club, roster }, type, params, ctx) → { state, result }
//
// - Trên máy (chế độ 'local', mặc định tới khi bật server economy): game gọi
//   thẳng các hàm này (services/economy.js).
// - Trên server (Supabase Edge Function supabase/functions/economy): cùng các
//   hàm này chạy trên bản economy lưu ở server (bảng economy_states), server tự
//   tung xúc xắc — người chơi không sửa được kết quả.
// Không dùng React / localStorage / window ở đây.
//
// Lỗi hợp lệ (thiếu EP, đội đủ 50 người…) → ném EconomyError(code); game hiện
// message tương ứng.
import { formatMoney, getPlayerValue } from '../services/clubService'
import {
    FITNESS_PRICE,
    FORM_PRICE,
    PROTECTION_PRICE,
    cardFromCatalog,
    drawFromPack,
    fitnessCard,
    formCard,
    freeShirtNumber,
    playerIdOf,
    protectionCard,
} from '../services/cards'
import { EXP_BOTTLE_PRICE, emptyBottle } from '../services/xpBottle'
import { SIM_TICKET_PACK, SIM_TICKET_PRICE, simTicketsOf } from '../services/quickSim'
import { MARKET_BY_PLAYER_ID } from '../data/transferMarket'
import { SQUAD_LIMITS, squadGroupOf, squadOf } from '../systems/roster'
import { maxSquadForm, restoreSquadFitness } from '../systems/form'

export const ECONOMY_VERSION = 1
export const MAX_BUY_QTY = 10
export const SALE_SHARE = 0.85
export const USER_TEAM_ID = 'blue'

export class EconomyError extends Error {
    constructor(code, message) {
        super(message || code)
        this.name = 'EconomyError'
        this.code = code
    }
}

const fail = (code, message) => {
    throw new EconomyError(code, message)
}

// ---- Tiện ích ----
export const userTeamOf = (roster) => (Array.isArray(roster) ? roster.find((team) => team.id === USER_TEAM_ID) : null) || null

function updateUserTeam(roster, update) {
    return roster.map((team) => (team.id === USER_TEAM_ID ? update(team) : team))
}

const budgetOf = (club) => Math.max(0, Math.round(Number(club?.budget) || 0))

function spend(club, amount, what) {
    const budget = budgetOf(club)

    if (budget < amount) {
        fail('not_enough_ep', `${what} costs ${formatMoney(amount)} · budget ${formatMoney(budget)}`)
    }

    return { ...club, budget: budget - amount }
}

const removeItems = (club, ids) => {
    const set = new Set(ids)

    return { ...club, inventory: (club.inventory || []).filter((item) => !set.has(item.id)) }
}

const findItem = (club, id, type = null) => {
    const item = (club.inventory || []).find((entry) => entry.id === id)

    if (!item || (type && item.type !== type)) fail('item_not_found', 'That item is no longer in REWARDS.')

    return item
}

const clampQty = (value, max = MAX_BUY_QTY) => Math.max(1, Math.min(max, Math.floor(Number(value) || 1)))

// ---- Cửa hàng (giá cố định) ----
// item → { price, make(source) } ; tickets: một bộ ×SIM_TICKET_PACK.
export const SHOP_ITEMS = {
    protection: { price: PROTECTION_PRICE, label: 'Upgrade Protection', make: (source) => protectionCard(source) },
    fitness: { price: FITNESS_PRICE, label: 'Fitness card', make: (source) => fitnessCard(source) },
    form: { price: FORM_PRICE, label: 'Form card', make: (source) => formCard(source) },
    bottle: { price: EXP_BOTTLE_PRICE, label: 'Empty EXP bottle', make: (source) => emptyBottle(source) },
    tickets: { price: SIM_TICKET_PRICE, label: `${SIM_TICKET_PACK} simulation tickets`, make: null },
}

// ---- Các thao tác ----
export const ACTIONS = {
    // Mở thẻ EP (một hoặc nhiều thẻ, theo id).
    open_ep(state, { ids = [] } = {}) {
        const list = (Array.isArray(ids) ? ids : [ids]).map((id) => findItem(state.club, id, 'ep'))
        const amount = list.reduce((sum, item) => sum + Math.max(0, Math.round(Number(item.amount) || 0)), 0)
        const club = { ...removeItems(state.club, list.map((item) => item.id)), budget: budgetOf(state.club) + amount }

        return { state: { ...state, club }, result: { amount, budget: club.budget, count: list.length } }
    },

    // Mua vật phẩm cửa hàng.
    buy_item(state, { item, qty = 1 } = {}) {
        const entry = SHOP_ITEMS[item]

        if (!entry) fail('unknown_item', 'Unknown shop item.')

        const count = clampQty(qty, 20)
        let club = spend(state.club, entry.price * count, count > 1 ? `${count} × ${entry.label}` : entry.label)

        if (item === 'tickets') {
            club = { ...club, simTickets: simTicketsOf(club) + SIM_TICKET_PACK * count }
        } else {
            const items = Array.from({ length: count }, () => entry.make('Bought with EP'))

            club = { ...club, inventory: [...(club.inventory || []), ...items] }
        }

        return { state: { ...state, club }, result: { item, qty: count, price: entry.price * count, budget: club.budget } }
    },

    // Dùng thẻ Thể lực / Phong độ cho cả đội.
    use_squad_item(state, { id } = {}) {
        const item = findItem(state.club, id)

        if (item.type !== 'fitness' && item.type !== 'form') fail('item_not_found', 'That item cannot be used here.')

        const roster = item.type === 'fitness' ? restoreSquadFitness(state.roster) : maxSquadForm(state.roster)

        return {
            state: { club: removeItems(state.club, [id]), roster },
            result: { type: item.type, squadSize: squadOf(userTeamOf(roster)).length },
        }
    },

    // Mở gói cầu thủ → thẻ +1 vào đội hình ngoài.
    open_pack(state, { id } = {}, ctx = {}) {
        const item = findItem(state.club, id, 'pack')
        const team = userTeamOf(state.roster)
        const squad = squadOf(team)

        if (!team) fail('no_team', 'Squad not found.')
        if (squad.length >= SQUAD_LIMITS.total) {
            fail('squad_full', `Squad is full (${squad.length}/${SQUAD_LIMITS.total}). Sell players from the reserves to open more packs.`)
        }

        const drawn = drawFromPack(item.pack, ctx.random || Math.random)
        const card = cardFromCatalog(drawn, { number: freeShirtNumber(squad) })
        const duplicate = squad.find((player) => playerIdOf(player) === card.playerId) || null
        const roster = updateUserTeam(state.roster, (entry) => ({ ...entry, reserves: [...(entry.reserves || []), card] }))
        const club = {
            ...removeItems(state.club, [id]),
            contracts: { ...(state.club.contracts || {}), [card.id]: { years: 3 } },
        }

        return {
            state: { club, roster },
            result: { card, pack: item.pack, duplicateOfId: duplicate?.id || null, squadSize: squad.length + 1 },
        }
    },

    // Mua cầu thủ trên thị trường (qty thẻ, giá theo thị trường của server).
    buy_player(state, { playerId, qty = 1 } = {}) {
        const player = MARKET_BY_PLAYER_ID.get(playerId)

        if (!player) fail('player_not_found', 'That player is not on the market.')
        if (!state.club.transferWindowOpen) fail('window_closed', 'Open the transfer window in the Overview tab to sign players.')

        const team = userTeamOf(state.roster)
        const squad = squadOf(team)
        const count = clampQty(qty)

        if (!team) fail('no_team', 'Squad not found.')
        if (squad.length + count > SQUAD_LIMITS.total) {
            fail('squad_full', squad.length >= SQUAD_LIMITS.total
                ? `Squad is full (${squad.length}/${SQUAD_LIMITS.total}).`
                : `Only ${SQUAD_LIMITS.total - squad.length} free squad place${SQUAD_LIMITS.total - squad.length === 1 ? '' : 's'}.`)
        }

        const total = player.value * count
        const signed = []

        let club = spend(state.club, total, `${count > 1 ? `${count} × ` : ''}${player.name}`)

        for (let index = 0; index < count; index += 1) {
            signed.push(cardFromCatalog(player, { number: freeShirtNumber([...squad, ...signed]) }))
        }

        const roster = updateUserTeam(state.roster, (entry) => ({ ...entry, reserves: [...(entry.reserves || []), ...signed] }))

        club = {
            ...club,
            contracts: { ...(club.contracts || {}), ...Object.fromEntries(signed.map((card) => [card.id, { years: 4 }])) },
        }

        return {
            state: { club, roster },
            result: { name: player.name, qty: count, total, budget: club.budget, cardIds: signed.map((card) => card.id), squadSize: squad.length + count },
        }
    },

    // Bán một thẻ ở đội hình ngoài (85% giá trị thẻ).
    sell_card(state, { cardId } = {}) {
        const team = userTeamOf(state.roster)

        if (!state.club.transferWindowOpen) fail('window_closed', 'The transfer window is closed.')
        if (!team) fail('no_team', 'Squad not found.')

        const group = squadGroupOf(team, cardId)

        if (!group) fail('card_not_found', 'That player is no longer in your squad.')
        if (group !== 'reserve') {
            fail('in_matchday_squad', 'Starters and bench players cannot be sold. Move him to the reserves in the lineup screen first.')
        }

        const card = (team.reserves || []).find((entry) => entry.id === cardId)
        const saleValue = Math.round(getPlayerValue(card) * SALE_SHARE)
        const roster = updateUserTeam(state.roster, (entry) => ({
            ...entry,
            reserves: (entry.reserves || []).filter((item) => item.id !== cardId),
        }))
        const contracts = { ...(state.club.contracts || {}) }

        delete contracts[cardId]

        const club = { ...state.club, budget: budgetOf(state.club) + saleValue, contracts }

        return { state: { club, roster }, result: { name: card.name, saleValue, budget: club.budget } }
    },

    // DEV: đặt ngân sách (chỉ tài khoản developer).
    dev_set_budget(state, { amount } = {}, ctx = {}) {
        if (!ctx.isDeveloper) fail('forbidden', 'Developer accounts only.')

        const value = Math.max(0, Math.round(Number(String(amount).replace(/[^\d.]/g, '')) || 0))

        return { state: { ...state, club: { ...state.club, budget: value } }, result: { budget: value } }
    },
}

export const ACTION_TYPES = Object.keys(ACTIONS)

// Kiểm tra hình dạng bản economy (bản nhập lần đầu / bản trên server).
export function validateState(state) {
    if (!state || typeof state !== 'object') fail('bad_state', 'Missing economy data.')
    if (!state.club || typeof state.club !== 'object' || Array.isArray(state.club)) fail('bad_state', 'Missing club data.')
    if (!Array.isArray(state.roster) || !userTeamOf(state.roster)) fail('bad_state', 'Missing squad data.')

    return state
}

export function runAction(state, type, params = {}, ctx = {}) {
    const action = ACTIONS[type]

    if (!action) fail('unknown_action', `Unknown action ${type}.`)

    validateState(state)

    const out = action(state, params || {}, ctx)

    return { state: out.state, result: out.result ?? null }
}
