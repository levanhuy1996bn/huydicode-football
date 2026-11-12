import { useEffect, useRef } from 'react'

const BLOCKED_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']

export function useKeyboard() {
  const keys = useRef({})

  useEffect(() => {
    const onKeyDown = (event) => {
      if (BLOCKED_KEYS.includes(event.code)) {
        event.preventDefault()
      }

      keys.current[event.code] = true
    }

    const onKeyUp = (event) => {
      if (BLOCKED_KEYS.includes(event.code)) {
        event.preventDefault()
      }

      // Phase 29F: trên Mac, phím thả ra trong lúc đang giữ ⌘ không có keyup
      // → thả ⌘ thì coi như thả hết (tránh phím bị "kẹt" ở trạng thái giữ).
      if (event.key === 'Meta' || event.code === 'MetaLeft' || event.code === 'MetaRight') {
        keys.current = {}
        return
      }

      keys.current[event.code] = false
    }

    const clear = () => {
      keys.current = {}
    }

    // Phase 29F: ẩn tab / thu nhỏ cửa sổ cũng bỏ hết phím đang giữ.
    const onVisibility = () => {
      if (document.hidden) clear()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return keys
}
