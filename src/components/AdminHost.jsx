import { Suspense, lazy, useEffect, useState } from 'react'
import { closeAdmin, devState, onDevChange } from '../utils/devTools'

// Phase 52: trang ADMIN chỉ tải khi developer mở (người chơi thường không tải).
const AdminPanel = lazy(() => import('./AdminPanel'))

export default function AdminHost() {
    const [, refresh] = useState(0)

    useEffect(() => onDevChange(() => refresh((value) => value + 1)), [])

    if (!devState.unlocked || !devState.adminOpen) return null

    return (
        <Suspense fallback={null}>
            <AdminPanel onClose={closeAdmin} />
        </Suspense>
    )
}
