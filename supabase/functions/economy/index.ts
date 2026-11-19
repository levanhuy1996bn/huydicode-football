// Phase 53A: Supabase Edge Function `economy`.
//
// Deploy (Terminal, in the project folder):
//   npm run build:economy
//   npx supabase login
//   npx supabase functions deploy economy --project-ref <PROJECT_REF> --use-api --no-verify-jwt
//
// --no-verify-jwt: the function checks the player's sign-in itself (asks the
// Auth server who the token belongs to), which works with the new API keys.
// Database access: SUPABASE_DB_URL (set automatically for Edge Functions).
import postgres from 'npm:postgres@3.4.5'
import * as core from './core.js'
import { createEconomyHandler } from './handler.js'

const sql = postgres(Deno.env.get('SUPABASE_DB_URL'), { prepare: false, max: 3, idle_timeout: 20 })
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')

async function getUser(req) {
    const auth = req.headers.get('Authorization') || ''
    const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''

    if (!auth.startsWith('Bearer ')) return null

    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey } })

    if (!res.ok) return null

    return await res.json()
}

Deno.serve(createEconomyHandler({ sql, core, getUser }))
