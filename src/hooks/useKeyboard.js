import { useEffect, useRef } from 'react'

export function useKeyboard() {
  const keys = useRef({})

  useEffect(() => {
    const onKeyDown = (event) => {
      const blockedKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ]

      if (blockedKeys.includes(event.code)) {
        event.preventDefault()
      }

      keys.current[event.code] = true
    }

    const onKeyUp = (event) => {
      const blockedKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ]

      if (blockedKeys.includes(event.code)) {
        event.preventDefault()
      }

      keys.current[event.code] = false
    }

    const onBlur = () => {
      keys.current = {}
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return keys
}
