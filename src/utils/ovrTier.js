// Phase 32: màu theo OVR của thẻ (viền / nền dòng / vòng sáng thẻ lớn).
//
// ≤ 79 trắng · 80–89 xanh lá · 90–99 vàng · 100–109 đỏ hồng · 110–119 tím ·
// ≥ 120 cầu vồng. Chỉ là lớp CSS (styles.css, khối Phase 32) — không ảnh.
// Màu theo OVR của chính thẻ (gốc + cấp cầu thủ + cấp đập): phong độ, team
// color, điểm cộng AUTO PICK, trừ điểm đá trái vị trí không làm đổi màu (số
// hiển thị vẫn có cộng / trừ).

export const OVR_TIERS = [
    { id: 'white', min: -Infinity, label: 'WHITE' },
    { id: 'green', min: 80, label: 'GREEN' },
    { id: 'gold', min: 90, label: 'GOLD' },
    { id: 'pink', min: 100, label: 'PINK-RED' },
    { id: 'purple', min: 110, label: 'PURPLE' },
    { id: 'prism', min: 120, label: 'PRISM' },
]

export function ovrTierIndex(overall) {
    const value = Number(overall) || 0
    let index = 0

    OVR_TIERS.forEach((tier, position) => {
        if (value >= tier.min) index = position
    })

    return index
}

export const ovrTier = (overall) => OVR_TIERS[ovrTierIndex(overall)].id
export const ovrTierLabel = (overall) => OVR_TIERS[ovrTierIndex(overall)].label

// OVR của thẻ, bỏ các điểm cộng tạm thời đã gộp vào player.overall.
export function cardOverall(player) {
    if (!player) return 0

    return (player.overall || 0) - (player.formBonus || 0) - (player.teamColorBonus || 0) - (player.__boost || 0) + (player.positionPenalty || 0)
}

// Lớp CSS: 'ovr-tier--gold' … dùng cùng 'ovr-row' (dòng) hoặc 'ovr-ring' (thẻ).
export const ovrTierClass = (player) => `ovr-tier--${ovrTier(cardOverall(player))}`
