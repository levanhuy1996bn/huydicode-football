// Phase 29D: luật loạt sút luân lưu (thuần, không phụ thuộc engine) — dùng
// chung cho luân lưu tự đá (systems/shootout.js), nút SIMULATE SHOOT-OUT và
// bản lưu cúp.
//
// kicks: [{ team: 'blue' | 'red', scored: boolean, takerId?, takerName? }]
// first: đội sút trước. Hai đội sút xen kẽ: 5 lượt mỗi đội, rồi từng cặp
// (sudden death) cho tới khi phân thắng bại.
export const REGULAR_KICKS = 5

const other = (team) => (team === 'blue' ? 'red' : 'blue')

export function shootoutStatus(kicks = [], first = 'blue') {
    const second = other(first)
    const count = (team) => kicks.filter((kick) => kick.team === team)
    const firstKicks = count(first)
    const secondKicks = count(second)
    const goals = {
        [first]: firstKicks.filter((kick) => kick.scored).length,
        [second]: secondKicks.filter((kick) => kick.scored).length,
    }
    const taken = { [first]: firstKicks.length, [second]: secondKicks.length }
    const regular = taken[first] <= REGULAR_KICKS && taken[second] <= REGULAR_KICKS
    let winner = null

    if (regular) {
        const leftFirst = REGULAR_KICKS - taken[first]
        const leftSecond = REGULAR_KICKS - taken[second]

        if (goals[first] > goals[second] + leftSecond) winner = first
        else if (goals[second] > goals[first] + leftFirst) winner = second
    }

    // Sau 5 lượt (hoặc hết 5 lượt mà vẫn hoà): mỗi cặp sút xong mới phân định.
    if (!winner && taken[first] === taken[second] && taken[first] >= REGULAR_KICKS && goals[first] !== goals[second]) {
        winner = goals[first] > goals[second] ? first : second
    }

    const next = winner ? null : taken[first] === taken[second] ? first : second

    return {
        goals,
        taken,
        winner,
        done: Boolean(winner),
        next,
        suddenDeath: !winner && taken[first] >= REGULAR_KICKS && taken[second] >= REGULAR_KICKS,
        round: Math.max(taken[first], taken[second]) + (next === first ? 1 : 0),
    }
}

// Tỉ lệ ghi bàn mỗi quả (giống cupService.simulateShootout).
export const kickChance = (shooting, keeper) => Math.max(0.55, Math.min(0.92, 0.75 + (shooting - keeper) / 150))

// SIMULATE SHOOT-OUT: sút nốt các quả còn lại bằng mô phỏng.
// skills: { blue: { shooting, keeper }, red: { shooting, keeper } }
export function finishShootout(kicks, first, skills, random = Math.random) {
    const result = [...kicks]
    let status = shootoutStatus(result, first)
    let guard = 0

    while (!status.done && guard < 60) {
        const team = status.next
        const defending = other(team)

        result.push({ team, scored: random() < kickChance(skills[team].shooting, skills[defending].keeper), simulated: true })
        status = shootoutStatus(result, first)
        guard += 1
    }

    return result
}

// Đổi sang dạng lưu của cúp ({ home, away, kicks: [{ side, scored }] }).
export function toCupShootout(kicks, blueIsHome) {
    const sideOf = (team) => ((team === 'blue') === blueIsHome ? 'home' : 'away')
    const list = kicks.map((kick) => ({ side: sideOf(kick.team), scored: Boolean(kick.scored) }))

    return {
        home: list.filter((kick) => kick.side === 'home' && kick.scored).length,
        away: list.filter((kick) => kick.side === 'away' && kick.scored).length,
        kicks: list,
        played: true,
    }
}
