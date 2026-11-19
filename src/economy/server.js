// Phase 53A: điểm vào của bản dựng cho server (scripts/build-economy.mjs →
// supabase/functions/economy/core.js). Chỉ gồm phần thuần: reducer, danh mục.
export { ACTION_TYPES, ECONOMY_VERSION, EconomyError, runAction, validateState } from './core'
export { applyCatalogEdits } from '../data/catalogRuntime'
