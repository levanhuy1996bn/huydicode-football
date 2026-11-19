// Phase 53A: xử lý một yêu cầu economy — dùng chung cho Supabase Edge Function
// (index.ts, Deno) và bài test trên Node. Không phụ thuộc Deno.
//
// Yêu cầu: POST { action, params } kèm Authorization: Bearer <token người chơi>.
// Trả về 200 { ok: true, result, state, revision } hoặc { ok: false, code, message }.
//
// Thao tác đặc biệt: ping (kiểm tra), state (bản trên server), import (gửi bản
// trong máy lên lần đầu), reset (developer: xoá bản server của chính mình).
// Còn lại: core.runAction trên bản của server, trong một transaction có khoá dòng.

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_STATE_BYTES = 2900000
const CATALOG_CHECK_MS = 10000

export function cryptoRandom() {
    const buffer = new Uint32Array(2)

    crypto.getRandomValues(buffer)
    // 53 bit ngẫu nhiên → [0, 1)
    return (buffer[0] * 2 ** 21 + (buffer[1] >>> 11)) / 2 ** 53
}

const json = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const fail = (code, message, status = 200) => json(status, { ok: false, code, message })

const isEconomyError = (error, core) => error instanceof core.EconomyError || error?.name === 'EconomyError'

// Kết quả gọn cho nhật ký (bỏ object thẻ lớn).
function logDetail(params, result) {
    const small = (value) => {
        if (!value || typeof value !== 'object') return value

        return Object.fromEntries(
            Object.entries(value)
                .filter(([, entry]) => entry === null || typeof entry !== 'object' || Array.isArray(entry))
                .map(([key, entry]) => [key, Array.isArray(entry) ? entry.slice(0, 20) : entry]),
        )
    }

    return { params: small(params), result: small(result), cardId: result?.card?.id, playerId: result?.card?.playerId }
}

export function createEconomyHandler({ sql, core, getUser, random = cryptoRandom, logger = console }) {
    const catalog = { version: null, checkedAt: 0 }

    async function ensureCatalog() {
        if (catalog.version !== null && Date.now() - catalog.checkedAt < CATALOG_CHECK_MS) return

        const [row] = await sql`select version from public.catalog_version where id = 1`
        const version = Number(row?.version ?? 0)

        catalog.checkedAt = Date.now()

        if (version === catalog.version) return

        // updated_at theo đúng định dạng JSON của PostgREST (dấu "cập nhật thẻ đang sở hữu").
        const rows = await sql`select id, kind, data, to_json(updated_at) #>> '{}' as updated_at from public.player_edits`

        core.applyCatalogEdits(rows.map((entry) => ({ ...entry })), version)
        catalog.version = version
    }

    return async function handle(req) {
        if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
        if (req.method !== 'POST') return fail('method', 'Use POST.', 405)

        let user = null

        try {
            user = await getUser(req)
        } catch {
            user = null
        }

        if (!user?.id) return fail('unauthorized', 'Sign in again to use the economy server.', 401)

        let body = null

        try {
            body = await req.json()
        } catch {
            return fail('bad_request', 'Invalid request.', 400)
        }

        const action = String(body?.action || '')
        const params = body?.params && typeof body.params === 'object' ? body.params : {}
        const uid = user.id

        try {
            await ensureCatalog()

            const [dev] = await sql`select exists (select 1 from public.developers where user_id = ${uid}) as is_dev`
            const isDeveloper = Boolean(dev?.is_dev)

            if (action === 'ping') {
                const [state] = await sql`select revision, updated_at from public.economy_states where user_id = ${uid}`
                const [mode] = await sql`select value from public.app_settings where key = 'economy_mode'`

                return json(200, {
                    ok: true,
                    result: {
                        userId: uid,
                        isDeveloper,
                        economyVersion: core.ECONOMY_VERSION,
                        actions: core.ACTION_TYPES,
                        catalogVersion: catalog.version,
                        hasState: Boolean(state),
                        revision: state ? Number(state.revision) : null,
                        updatedAt: state?.updated_at || null,
                        mode: mode?.value ?? 'off',
                    },
                })
            }

            if (action === 'state') {
                const [row] = await sql`select club, roster, revision, updated_at from public.economy_states where user_id = ${uid}`

                if (!row) return fail('not_imported', 'There is no server copy of this account yet.')

                return json(200, { ok: true, state: { club: row.club, roster: row.roster }, revision: Number(row.revision), result: { updatedAt: row.updated_at } })
            }

            if (action === 'import') {
                const state = core.validateState(params.state)
                const size = JSON.stringify(state.club).length + JSON.stringify(state.roster).length

                if (size > MAX_STATE_BYTES) return fail('too_large', 'This save is too large.')

                const rows = await sql`
                    insert into public.economy_states (user_id, club, roster)
                    values (${uid}, ${sql.json(state.club)}, ${sql.json(state.roster)})
                    on conflict (user_id) do nothing
                    returning revision`

                if (!rows.length) return fail('already_imported', 'This account already has a server copy.')

                await sql`
                    insert into public.economy_log (user_id, action, ep_before, ep_after, detail)
                    values (${uid}, 'import', null, ${Math.round(Number(state.club.budget) || 0)}, ${sql.json({ size })})`

                return json(200, { ok: true, state, revision: Number(rows[0].revision), result: { size } })
            }

            if (action === 'reset') {
                if (!isDeveloper) return fail('forbidden', 'Developer accounts only.')

                const rows = await sql`delete from public.economy_states where user_id = ${uid} returning user_id`

                await sql`insert into public.economy_log (user_id, action, detail) values (${uid}, 'reset', ${sql.json({ deleted: rows.length })})`

                return json(200, { ok: true, result: { deleted: rows.length } })
            }

            if (!core.ACTION_TYPES.includes(action)) return fail('unknown_action', `Unknown action ${action}.`, 400)

            const out = await sql.begin(async (tx) => {
                const [row] = await tx`select club, roster, revision from public.economy_states where user_id = ${uid} for update`

                if (!row) throw new core.EconomyError('not_imported', 'There is no server copy of this account yet.')

                const { state, result } = core.runAction({ club: row.club, roster: row.roster }, action, params, {
                    random,
                    now: Date.now(),
                    isDeveloper,
                })
                const revision = Number(row.revision) + 1

                await tx`
                    update public.economy_states
                    set club = ${tx.json(state.club)}, roster = ${tx.json(state.roster)}, revision = ${revision}, updated_at = now()
                    where user_id = ${uid}`
                await tx`
                    insert into public.economy_log (user_id, action, ep_before, ep_after, detail)
                    values (${uid}, ${action}, ${Math.round(Number(row.club?.budget) || 0)}, ${Math.round(Number(state.club?.budget) || 0)},
                            ${tx.json(logDetail(params, result))})`

                return { state, result, revision }
            })

            return json(200, { ok: true, ...out })
        } catch (error) {
            if (isEconomyError(error, core)) return fail(error.code, error.message)

            logger.error('economy error', action, error)
            return fail('server_error', 'Economy server error.', 500)
        }
    }
}
