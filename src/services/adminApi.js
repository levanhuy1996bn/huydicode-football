// Phase 52: các lệnh cho trang ADMIN (chỉ tài khoản developer; server kiểm tra
// lại bằng RLS / hàm is_developer(), giao diện chỉ là lớp ngoài).
import { getClient } from './cloudSave'
import { refreshCatalog } from './catalogSync'
import { sanitizeEdit } from '../data/catalogOverrides'

function message(error) {
    const text = error?.message || String(error || '')

    if (/row-level security|permission denied/i.test(text)) return 'Not allowed — this account is not a developer.'
    if (/fetch|network/i.test(text)) return 'No connection — try again when you are online.'
    if (/duplicate key/i.test(text)) return 'That code already exists.'
    if (/gift_codes_code_format/i.test(text)) return 'Code: CAPITAL letters, digits, - or _, 4–32 characters.'

    return text || 'Something went wrong.'
}

const fail = (error) => ({ ok: false, message: message(error) })

// ---- Cầu thủ ----
export async function fetchPlayerEdits() {
    try {
        const client = await getClient()
        const { data, error } = await client.from('player_edits').select('id, kind, data, updated_at').order('updated_at', { ascending: false })

        if (error) return fail(error)

        return { ok: true, rows: data || [] }
    } catch (error) {
        return fail(error)
    }
}

async function afterWrite() {
    try {
        await refreshCatalog({ force: true })
    } catch {
        // bản lưu trong máy cập nhật ở lần mở game sau
    }
}

// Lưu bản sửa của cầu thủ có sẵn: chỉ ghi các trường khác bản gốc.
export async function saveOverride(original, values) {
    const clean = sanitizeEdit(values)
    const data = Object.fromEntries(Object.entries(clean).filter(([key, value]) => (original?.[key] ?? null) !== value))

    if (!Object.keys(data).length) return resetPlayer(original.id)

    // Phase 52b: làm mới cả thẻ người chơi đang sở hữu (services/cardRefresh.js).
    if (values.syncOwned) data.syncOwned = true

    try {
        const client = await getClient()
        const { error } = await client.from('player_edits').upsert({ id: original.id, kind: 'override', data })

        if (error) return fail(error)

        await afterWrite()
        return { ok: true, message: `Saved ${clean.name || original.name}.` }
    } catch (error) {
        return fail(error)
    }
}

export const newCustomId = () =>
    `cx-${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36).padStart(3, '0')}`

export async function saveCustom(id, values) {
    const data = sanitizeEdit(values, { custom: true })

    if (values.syncOwned) data.syncOwned = true
    if (!data.name) return { ok: false, message: 'Name is required.' }
    if (!data.position) return { ok: false, message: 'Position is required.' }

    try {
        const client = await getClient()
        const { error } = await client.from('player_edits').upsert({ id, kind: 'custom', data })

        if (error) return fail(error)

        await afterWrite()
        return { ok: true, message: `Saved ${data.name}.` }
    } catch (error) {
        return fail(error)
    }
}

// Xoá bản sửa (cầu thủ có sẵn về như gốc) hoặc xoá cầu thủ mới.
export async function resetPlayer(id) {
    try {
        const client = await getClient()
        const { error } = await client.from('player_edits').delete().eq('id', id)

        if (error) return fail(error)

        await afterWrite()
        return { ok: true, message: id.startsWith('cx-') ? 'Player deleted.' : 'Back to the original data.' }
    } catch (error) {
        return fail(error)
    }
}

// ---- Gift code ----
export async function fetchGiftCodes() {
    try {
        const client = await getClient()
        const [codes, uses] = await Promise.all([
            client.from('gift_codes').select('code, rewards, note, starts_at, expires_at, max_uses, active, created_at').order('created_at', { ascending: false }),
            client.rpc('gift_code_uses'),
        ])

        if (codes.error) return fail(codes.error)

        const useMap = new Map((uses.data || []).map((row) => [row.code, Number(row.uses) || 0]))

        return { ok: true, rows: (codes.data || []).map((row) => ({ ...row, uses: useMap.get(row.code) || 0 })) }
    } catch (error) {
        return fail(error)
    }
}

export async function createGiftCode({ code, rewards, note, expiresAt, maxUses }) {
    const clean = String(code || '').trim().toUpperCase()

    if (!/^[A-Z0-9_-]{4,32}$/.test(clean)) return { ok: false, message: 'Code: CAPITAL letters, digits, - or _, 4–32 characters.' }
    if (!Object.values(rewards || {}).some((value) => Number(value) > 0)) return { ok: false, message: 'Add at least one reward.' }

    try {
        const client = await getClient()
        const { error } = await client.from('gift_codes').insert({
            code: clean,
            rewards,
            note: note?.trim() || null,
            expires_at: expiresAt || null,
            max_uses: Number(maxUses) > 0 ? Math.floor(Number(maxUses)) : null,
        })

        if (error) return fail(error)

        return { ok: true, message: `Code ${clean} created.` }
    } catch (error) {
        return fail(error)
    }
}

export async function setGiftCodeActive(code, active) {
    try {
        const client = await getClient()
        const { error } = await client.from('gift_codes').update({ active }).eq('code', code)

        return error ? fail(error) : { ok: true }
    } catch (error) {
        return fail(error)
    }
}

// ---- Developer ----
const DEV_ERRORS = {
    forbidden: 'Not allowed — this account is not a developer.',
    not_found: 'No account with that email. Create the account first (game or Supabase → Authentication → Users).',
    already: 'That account is already a developer.',
    self: 'You cannot remove your own account.',
}

export async function fetchDevelopers() {
    try {
        const client = await getClient()
        const { data, error } = await client.rpc('list_developers')

        return error ? fail(error) : { ok: true, rows: data || [] }
    } catch (error) {
        return fail(error)
    }
}

export async function addDeveloper(email, note) {
    try {
        const client = await getClient()
        const { data, error } = await client.rpc('add_developer', { p_email: email, p_note: note || null })

        if (error) return fail(error)
        if (!data?.ok) return { ok: false, message: DEV_ERRORS[data?.error] || 'Could not add.' }

        return { ok: true, message: `${email} is now a developer.` }
    } catch (error) {
        return fail(error)
    }
}

export async function removeDeveloper(userId) {
    try {
        const client = await getClient()
        const { data, error } = await client.rpc('remove_developer', { p_user: userId })

        if (error) return fail(error)
        if (!data?.ok) return { ok: false, message: DEV_ERRORS[data?.error] || 'Could not remove.' }

        return { ok: true, message: 'Developer removed.' }
    } catch (error) {
        return fail(error)
    }
}
