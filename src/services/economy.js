// Phase 53A: cổng duy nhất cho các thao tác economy (EP, kho đồ, thẻ).
//
//   const res = await economy('buy_item', { item: 'fitness' })
//   res.ok ? res.result : res.message
//
// Chế độ:
//   'local'  (Phase 53A–53C, mặc định): chạy reducer dùng chung (economy/core.js)
//            ngay trong game trên club / roster hiện tại của GameScene.
//   'server' (bật ở Phase 53D): gửi { action, params } tới Edge Function
//            `economy`; server chạy cùng reducer trên bản của server rồi trả
//            về club / roster mới. Developer thử được server sớm qua ADMIN →
//            SERVER (callEconomyServer).
import { EconomyError, runAction } from '../economy/core'
import { devState } from '../utils/devTools'
import { cloudConfigured, getClient } from './cloudSave'

let host = null
let latest = null

// GameScene: { getState(), apply(next), busy() }.
export function registerEconomyHost(next) {
    host = next
    return () => {
        if (host === next) host = null
    }
}

// GameScene gọi mỗi lần render: bản club / roster mới nhất.
export function syncEconomyState(club, roster) {
    latest = { club, roster }
}

export const economyMode = () => 'local'

const failure = (code, message) => ({ ok: false, code, message })

export async function economy(type, params = {}) {
    if (!host) return failure('not_ready', 'The game is still loading.')
    if (host.busy?.()) return failure('busy', 'Leave the World Cup screen first.')

    const state = latest || host.getState()

    try {
        const { state: next, result } = runAction(state, type, params, {
            random: Math.random,
            now: Date.now(),
            isDeveloper: devState.unlocked,
        })

        latest = next
        host.apply(next, state)
        return { ok: true, result, state: next }
    } catch (error) {
        if (error instanceof EconomyError) return failure(error.code, error.message)

        console.error('Economy action failed:', type, error)
        return failure('error', 'Something went wrong.')
    }
}

// ---- Server (Edge Function `economy`) — ADMIN → SERVER, và chế độ 'server' sau này ----
export async function callEconomyServer(action, params = {}) {
    if (!cloudConfigured) return failure('not_configured', 'Supabase is not set up.')

    try {
        const client = await getClient()
        const { data, error } = await client.functions.invoke('economy', { body: { action, params } })

        if (error) {
            let detail = null

            try {
                detail = await error.context?.json?.()
            } catch {
                detail = null
            }

            if (detail && detail.ok === false) return detail
            if (/Failed to send|fetch|network/i.test(error.message || '')) {
                return failure('unreachable', 'Could not reach the economy server. Is the Edge Function deployed?')
            }

            return failure('error', error.message || 'Economy server error.')
        }

        return data || failure('error', 'Empty answer from the economy server.')
    } catch (error) {
        return failure('error', error?.message || 'Economy server error.')
    }
}

// Bản economy hiện tại của máy này (để nhập lên server lần đầu).
export const currentEconomyState = () => latest || host?.getState() || null
