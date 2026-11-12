// Phase 28B: phòng truyền thống (TROPHIES).
//
// Danh hiệu thuộc về người chơi (HLV), không thuộc về CLB: đổi CLB vẫn giữ.
// Lưu trong bản lưu thế giới ('ultimate-football-world-save'):
//   world.trophies: [{ id, competitionId, season, clubId, difficulty }]
//   world.career:   [{ season, clubId, leagueId, position, difficulty, cupRun }]
// Cả hai lưu vĩnh viễn (không bị cắt như world.history, chỉ giữ 30 mùa).
// Bản lưu cũ: lấy lại danh hiệu / sự nghiệp từ world.history (một lần).
//
// Chỉ tính chức vô địch: vô địch 36 giải (18 hạng nhất, 18 hạng hai), C1, C2.
// Á quân, thăng hạng… hiện trong bảng sự nghiệp.
import { COUNTRIES, COUNTRY_BY_ID, LEAGUE_BY_ID } from '../data/world'
import { CUPS, CUP_IDS, CUP_RUN_LABELS, currentCupView } from './cupService'
import { getLeagueStandings, getSeasonProgress } from './leagueService'
import { userClubId } from './career'
import { difficultyOf } from './difficulty'

// ---- Danh mục cúp (thứ tự trên kệ) ----
// Mỗi giải hạng nhất một kiểu cúp riêng: 6 dáng × 3 chất liệu (vàng / bạc /
// vàng hồng) = 18 tổ hợp, cộng dải màu cờ của nước đó ở đế.
// Giải hạng hai: cùng dáng với hạng nhất của nước đó, nhỏ hơn, màu đồng.
export const TROPHY_SHAPES = ['crown', 'shield', 'goblet', 'plate', 'obelisk', 'globe']
const TOP_METALS = ['gold', 'silver', 'rose']

export const FLAG_COLORS = {
    eng: ['#ffffff', '#ce1124'],
    ita: ['#009246', '#ce2b37'],
    esp: ['#aa151b', '#f1bf00'],
    ger: ['#1a1a1a', '#dd0000'],
    fra: ['#0055a4', '#ef4135'],
    bel: ['#fdda24', '#ef3340'],
    por: ['#006600', '#ff0000'],
    bra: ['#009c3b', '#ffdf00'],
    ned: ['#ae1c28', '#21468b'],
    arg: ['#74acdf', '#ffffff'],
    usa: ['#3c3b6e', '#b22234'],
    mex: ['#006847', '#ce1126'],
    jpn: ['#ffffff', '#bc002d'],
    cro: ['#171796', '#ff0000'],
    pol: ['#ffffff', '#dc143c'],
    den: ['#c8102e', '#ffffff'],
    swe: ['#006aa7', '#fecc00'],
    tur: ['#e30a17', '#ffffff'],
}

const countriesByRank = [...COUNTRIES].sort((a, b) => a.rank - b.rank)

export const TROPHY_CATALOG = [
    // Phase 29E: World Cup — mẫu cúp thứ 39 (quả cầu có hai vòng quỹ đạo).
    { id: 'wc', kind: 'wc', name: 'World Cup', subtitle: 'International · every 4 years', shape: 'orbit', metal: 'gold', flag: ['#0b6e4f', '#d8b04a'] },
    { id: 'c1', kind: 'c1', name: CUPS.c1.name, subtitle: 'Continental · C1', shape: 'bigears', metal: 'silver', flag: ['#1d3c8f', '#d8b04a'] },
    { id: 'c2', kind: 'c2', name: CUPS.c2.name, subtitle: 'Continental · C2', shape: 'tall', metal: 'amber', flag: ['#7a1f1f', '#f08a24'] },
    ...countriesByRank.map((country, index) => ({
        id: country.topLeagueId,
        kind: 'top',
        name: LEAGUE_BY_ID.get(country.topLeagueId)?.name,
        subtitle: `${country.name} · Division 1`,
        countryId: country.id,
        shape: TROPHY_SHAPES[index % TROPHY_SHAPES.length],
        metal: TOP_METALS[Math.floor(index / TROPHY_SHAPES.length) % TOP_METALS.length],
        flag: FLAG_COLORS[country.id] || ['#ffffff', '#888888'],
    })),
    ...countriesByRank.map((country, index) => ({
        id: country.secondLeagueId,
        kind: 'second',
        name: LEAGUE_BY_ID.get(country.secondLeagueId)?.name,
        subtitle: `${country.name} · Division 2`,
        countryId: country.id,
        shape: TROPHY_SHAPES[index % TROPHY_SHAPES.length],
        metal: 'bronze',
        flag: FLAG_COLORS[country.id] || ['#ffffff', '#888888'],
    })),
]

export const TROPHY_BY_ID = new Map(TROPHY_CATALOG.map((entry) => [entry.id, entry]))

// Ngôi sao độ khó trên cúp: Hard đồng, Very hard bạc, Legendary vàng.
export const DIFFICULTY_STARS = {
    hard: { color: '#d08a4a', label: 'Hard' },
    veryhard: { color: '#dfe6ee', label: 'Very hard' },
    legendary: { color: '#ffd23f', label: 'Legendary' },
}
const STAR_ORDER = ['hard', 'veryhard', 'legendary']

export const starOf = (difficulty) => DIFFICULTY_STARS[difficulty] || null

export const seasonLabel = (season) => `${season}/${String((season + 1) % 100).padStart(2, '0')}`

const trophyId = (season, competitionId, clubId) => `${season}-${competitionId}-${clubId}`

// ---- Bản lưu cũ: lấy lại từ lịch sử ----
export function trophiesFromHistory(history = []) {
    const trophies = []

    history.forEach((entry) => {
        const user = entry?.user

        if (!user?.clubId) return

        const difficulty = user.difficulty || null

        if (user.position === 1 && user.leagueId) {
            trophies.push({ id: trophyId(entry.season, user.leagueId, user.clubId), competitionId: user.leagueId, season: entry.season, clubId: user.clubId, difficulty })
        }

        CUP_IDS.forEach((cupId) => {
            if (entry.cups?.[cupId] && entry.cups[cupId] === user.clubId) {
                trophies.push({ id: trophyId(entry.season, cupId, user.clubId), competitionId: cupId, season: entry.season, clubId: user.clubId, difficulty })
            }
        })
    })

    return trophies
}

export function careerFromHistory(history = []) {
    return history
        .filter((entry) => entry?.user?.clubId)
        .map((entry) => ({
            season: entry.season,
            clubId: entry.user.clubId,
            leagueId: entry.user.leagueId,
            position: entry.user.position || null,
            difficulty: entry.user.difficulty || null,
            cupRun: entry.user.cupRun
                || CUP_IDS.map((cupId) => (entry.cups?.[cupId] === entry.user.clubId ? { cupId, result: 'winner', out: false } : null)).find(Boolean)
                || null,
        }))
}

// Bảo đảm world có trophies + career (bản lưu cũ → lấy từ lịch sử).
export function ensureCareer(world) {
    if (!world) return world
    if (Array.isArray(world.trophies) && Array.isArray(world.career)) return world

    return {
        ...world,
        trophies: Array.isArray(world.trophies) ? world.trophies : trophiesFromHistory(world.history),
        career: Array.isArray(world.career) ? world.career : careerFromHistory(world.history),
    }
}

// ---- Trao cúp ----
// Gọi mỗi khi giải đấu thay đổi (đá thật hoặc mô phỏng). Không trùng lặp:
// mỗi (mùa, giải, CLB) chỉ một cúp.
//   - Vô địch giải: khi đội mình đá xong cả mùa và đứng thứ nhất.
//   - C1 / C2: ngay khi thắng chung kết.
export function awardTrophies(world, league) {
    const base = ensureCareer(world)

    if (!league) return { world: base, added: [] }

    const clubId = userClubId()
    const known = new Set(base.trophies.map((trophy) => trophy.id))
    const added = []
    const award = (competitionId) => {
        const id = trophyId(league.season, competitionId, clubId)

        if (known.has(id)) return

        known.add(id)
        added.push({ id, competitionId, season: league.season, clubId, difficulty: league.difficulty || null })
    }

    if (league.fixtures?.length && getSeasonProgress(league.fixtures).completed) {
        const top = getLeagueStandings(league.fixtures, league.clubIds)[0]

        if (top?.teamId === clubId) award(league.leagueId)
    }

    CUP_IDS.forEach((cupId) => {
        if (currentCupView(league, cupId)?.champion === clubId) award(cupId)
    })

    // Phase 29E: vô địch World Cup cùng đội tuyển của người chơi.
    const wc = base.worldCup

    if (wc?.status === 'done' && !wc.skipped && wc.champion && wc.champion === wc.nationId) {
        const id = trophyId(wc.season, 'wc', wc.nationId)

        if (!known.has(id)) {
            known.add(id)
            added.push({ id, competitionId: 'wc', season: wc.season, edition: wc.edition, clubId: wc.nationId, difficulty: league.difficulty || null })
        }
    }

    if (!added.length) return { world: base, added }

    return { world: { ...base, trophies: [...base.trophies, ...added] }, added }
}

// Dòng sự nghiệp của mùa vừa xong (worldService.advanceWorld thêm vào).
export function careerEntry(world, league, position, cupRun) {
    return {
        season: world.season,
        clubId: world.userClubId || userClubId(),
        leagueId: league?.leagueId,
        position: position || null,
        difficulty: league?.difficulty || null,
        cupRun: cupRun || null,
    }
}

// ---- Dữ liệu cho màn TROPHIES ----
export function trophyCabinet(trophies = []) {
    return TROPHY_CATALOG.map((entry) => {
        const wins = trophies
            .filter((trophy) => trophy.competitionId === entry.id)
            .sort((a, b) => b.season - a.season)
        const bestStar = STAR_ORDER.filter((id) => wins.some((win) => win.difficulty === id)).pop() || null

        return { ...entry, wins, count: wins.length, bestStar }
    })
}

export const cupRunLabel = (run) =>
    run ? `${CUPS[run.cupId]?.short || run.cupId.toUpperCase()} · ${CUP_RUN_LABELS[run.result] || run.result}` : '—'

const CUP_RUN_RANK = ['group', 'r16', 'qf', 'sf', 'final', 'runnerUp', 'winner']

export function careerSummary(world, liveRow = null) {
    const trophies = world?.trophies || []
    const rows = [...(world?.career || []), ...(liveRow ? [liveRow] : [])]
    const best = (cupId) => {
        const runs = rows.map((row) => row.cupRun).filter((run) => run?.cupId === cupId)

        if (!runs.length) return null

        return runs.reduce((top, run) => (CUP_RUN_RANK.indexOf(run.result) > CUP_RUN_RANK.indexOf(top.result) ? run : top))
    }

    return {
        trophies: trophies.length,
        leagueTitles: trophies.filter((trophy) => !CUPS[trophy.competitionId] && trophy.competitionId !== 'wc').length,
        worldCups: trophies.filter((trophy) => trophy.competitionId === 'wc').length,
        cupTitles: trophies.filter((trophy) => CUPS[trophy.competitionId]).length,
        seasons: rows.length,
        clubs: new Set(rows.map((row) => row.clubId)).size,
        bestC1: best('c1'),
        bestC2: best('c2'),
    }
}

export const countryNameOf = (countryId) => COUNTRY_BY_ID.get(countryId)?.name || ''
export const difficultyLabel = (id) => (id ? difficultyOf(id).label : '—')
