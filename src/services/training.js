// Phase 42: dữ liệu chế độ TẬP LUYỆN — bài tập, độ khó đội tập, thử thách hằng ngày.
import { WORLD_CLUBS, hashString } from '../data/world'
import { isUserClub } from './career'

export const TRAINING_DRILL_INFO = {
    'penalty-take': {
        label: 'PENALTIES',
        successLabel: 'GOALS',
        keys: 'PENALTY · ← / → AIM (↑ HIGHER) · HOLD D FOR POWER, RELEASE TO SHOOT',
    },
    'penalty-save': {
        label: 'PENALTY SAVES',
        successLabel: 'SAVES',
        keys: 'BE THE KEEPER · HOLD ← / → TO DIVE THAT WAY, ↓ TO STAY IN THE MIDDLE',
    },
    freekick: {
        label: 'FREE KICKS',
        successLabel: 'GOALS',
        keys: 'FREE KICK · ARROWS AIM · D SHOOT · Z+D CURL · Q+D CHIP · C+D OUTSIDE FOOT · S / A PASS OR CROSS',
    },
    corner: {
        label: 'CORNERS',
        successLabel: 'GOALS',
        keys: 'CORNER · A CROSS (NO ARROW = BEST HEADER) · Z+A WHIPPED · A,A LOW · THEN D HEADER AT GOAL / S HEADER PASS',
    },
    finishing: {
        label: 'FINISHING',
        successLabel: 'GOALS',
        keys: 'FINISHING · ARROWS MOVE · E SPRINT · D SHOOT · D,D LOW · Z+D CURL · Q+D CHIP',
    },
}

// Thành công của mỗi bài: bàn thắng (bắt phạt đền: cản được).
export const isSuccess = (drill, result) => (drill === 'penalty-save' ? result === 'saved' : result === 'goal')

// Đội tập theo độ khó: CLB yếu / trung bình / mạnh nhất thế giới (+ cấp thẻ AI).
export const TRAINING_LEVELS = [
    { id: 'easy', label: 'Easy', percentile: 0.25, difficulty: 'easy' },
    { id: 'normal', label: 'Normal', percentile: 0.65, difficulty: 'normal' },
    { id: 'hard', label: 'Hard', percentile: 1, difficulty: 'veryhard' },
]

export function trainingOpponent(levelId) {
    const level = TRAINING_LEVELS.find((entry) => entry.id === levelId) || TRAINING_LEVELS[1]
    const clubs = WORLD_CLUBS.filter((club) => !isUserClub(club.id)).sort((a, b) => (a.strength || 0) - (b.strength || 0))
    const index = Math.min(clubs.length - 1, Math.round((clubs.length - 1) * level.percentile))

    return { club: clubs[index], level }
}

// Thử thách hằng ngày: mỗi ngày một bài (theo ngày), 10 lần thử, đạt mốc → thưởng
// một lần trong ngày (club.trainingDaily = { date, done }).
export const TRAINING_CHALLENGE_REWARD = 2000000

const CHALLENGES = [
    { drill: 'penalty-take', target: 8, total: 10, text: 'Score 8 of 10 penalties', options: {} },
    { drill: 'freekick', target: 3, total: 10, text: 'Score 3 of 10 free kicks (random spots)', options: { spot: 'random' } },
    { drill: 'corner', target: 1, total: 10, text: 'Score from 1 of 10 corners', options: { side: 'left' } },
    { drill: 'finishing', target: 6, total: 10, text: 'Score 6 of 10 chances with a defender', options: { defender: true } },
    { drill: 'penalty-save', target: 3, total: 10, text: 'Save 3 of 10 penalties', options: {} },
]

export function dailyChallenge(dateKey) {
    return CHALLENGES[hashString(`training:${dateKey}`) % CHALLENGES.length]
}

export function completeTrainingChallenge(club, dateKey, reward = TRAINING_CHALLENGE_REWARD) {
    if (club?.trainingDaily?.date === dateKey && club.trainingDaily.done) return club

    return {
        ...club,
        budget: (club?.budget || 0) + reward,
        trainingDaily: { date: dateKey, done: true },
    }
}
