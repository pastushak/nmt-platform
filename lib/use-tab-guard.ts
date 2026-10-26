'use client'

import { useEffect, useRef } from 'react'

// Скільки виходів з вкладки дозволено: 1–2 — попередження, 3-тє — анулювання.
// Справжній ліміт — у функції report_violation в БД; тут лише для тексту.
export const MAX_VIOLATIONS = 3

// Вихід коротший за це (випадковий клік повз вікно) не рахується
const GRACE_MS = 1000

/**
 * Стежить, чи учень не виходить з вкладки тесту: інша вкладка, згорнутий браузер,
 * інша програма. Один вихід = одне порушення (скільки б подій не прийшло, поки учня немає).
 * Перезавантаження / закриття сторінки порушенням не вважається.
 */
export function useTabGuard(enabled: boolean, onViolation: () => void) {
  const cb = useRef(onViolation)
  cb.current = onViolation

  useEffect(() => {
    if (!enabled) return
    let away = false        // учень зараз поза вкладкою
    let counted = false     // цей вихід уже зараховано
    let unloading = false   // сторінка перезавантажується/закривається
    let timer: ReturnType<typeof setTimeout> | undefined

    const isAway = () => document.visibilityState === 'hidden' || !document.hasFocus()

    function leave() {
      if (unloading || away) return
      away = true
      counted = false
      timer = setTimeout(() => {
        if (away && !unloading && isAway() && !counted) {
          counted = true
          cb.current()
        }
      }, GRACE_MS)
    }

    function back() {
      if (document.visibilityState === 'hidden') return
      away = false
      clearTimeout(timer)
    }

    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : back())
    // pagehide приходить раніше за visibilitychange при перезавантаженні/закритті
    const onUnload = () => { unloading = true; clearTimeout(timer) }
    const onShow = () => { unloading = false; away = false }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', leave)
    window.addEventListener('focus', back)
    window.addEventListener('pagehide', onUnload)
    window.addEventListener('pageshow', onShow)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', leave)
      window.removeEventListener('focus', back)
      window.removeEventListener('pagehide', onUnload)
      window.removeEventListener('pageshow', onShow)
    }
  }, [enabled])
}
