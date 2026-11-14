// Phase 40: vòng tròn cấp độ (kiểu ảnh mẫu): nút tròn đen viền bạc, "LV" +
// số cấp ở giữa, vòng xanh phát sáng bên ngoài chạy theo % XP (không ghi %).
// Chỉ CSS (conic-gradient + biến --p 0…1), không ảnh.
export default function LevelRing({ level, progress = 0, size = 'sm', title, onClick, className = '' }) {
    const value = Math.max(0, Math.min(1, Number(progress) || 0))
    const Tag = onClick ? 'button' : 'span'

    return (
        <Tag
            {...(onClick ? { type: 'button', onClick } : {})}
            className={`level-ring level-ring--${size}${className ? ` ${className}` : ''}`}
            style={{ '--p': value }}
            title={title}
            aria-label={title || `Level ${level}`}
        >
            <span className="level-ring__core">
                <small>LV</small>
                <b>{level}</b>
            </span>
        </Tag>
    )
}
