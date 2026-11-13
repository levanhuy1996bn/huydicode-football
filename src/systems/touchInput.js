// Phase 29A2: hướng cần điều khiển ảo (điện thoại), dạng analog.
//
// TouchControls.jsx ghi vào đây (toạ độ màn hình: sx sang phải, sy lên trên,
// độ dài 0..1) và đồng thời gửi phím mũi tên giả lập (8 hướng) cho những chỗ
// engine đọc mũi tên (ngắm phạt đền, khoá hướng sau khi chuyền…).
// control.js → inputDirection dùng vector này để chạy mượt 360°.
// Camera nhìn từ cạnh sân: "lên" màn hình = −X, "phải" màn hình = −Z
// (giống ArrowUp / ArrowRight).
export const touchInput = { active: false, sx: 0, sy: 0 }

export function setTouchVector(sx, sy) {
    touchInput.sx = sx
    touchInput.sy = sy
    touchInput.active = Math.hypot(sx, sy) > 0.18
}

export function clearTouchVector() {
    touchInput.active = false
    touchInput.sx = 0
    touchInput.sy = 0
}

// Vector hướng trên sân (x, z) đã chuẩn hoá, hoặc null.
export function touchDirection() {
    if (!touchInput.active) return null

    const x = -touchInput.sy
    const z = -touchInput.sx
    const length = Math.hypot(x, z) || 1

    return { x: x / length, z: z / length }
}
