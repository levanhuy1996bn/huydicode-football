// Rút gọn tên cầu thủ để hiển thị ở chỗ hẹp (trên đầu, thẻ cầu thủ...).
//   "Ethan Blackwood"          → "Ethan Blackwood" (đủ ngắn, giữ nguyên)
//   "Alexander Montgomery"     → "A. Montgomery"
//   "Marcus Delacroix-Okafor"  → "Delacroix-Ok…"
export function shortPlayerName(name, max = 12) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ')

    if (!clean) return ''
    if (clean.length <= max) return clean

    const parts = clean.split(' ')

    if (parts.length > 1) {
        const last = parts[parts.length - 1]
        const initialed = `${parts[0][0]}. ${last}`

        if (initialed.length <= max) return initialed
        if (last.length <= max) return last

        return `${last.slice(0, max - 1)}…`
    }

    return `${clean.slice(0, max - 1)}…`
}
