'use client'

import { useState, useEffect } from 'react'

interface TimerProps {
  startedAt: number
  timeLimitMin: number
  onWarning?: (minutesLeft: number) => void
}

export default function Timer({ startedAt, timeLimitMin, onWarning }: TimerProps) {
  const [remaining, setRemaining] = useState(timeLimitMin * 60)
  const [warned, setWarned] = useState<Set<number>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const left = Math.max(0, timeLimitMin * 60 - elapsed)
      setRemaining(left)

      const minutesLeft = Math.floor(left / 60)
      const secondsLeft = left % 60

      // Сповіщення за 10, 5, 3 хв
      if (secondsLeft === 0 && [10, 5, 3].includes(minutesLeft) && !warned.has(minutesLeft)) {
        setWarned(prev => new Set(prev).add(minutesLeft))
        onWarning?.(minutesLeft)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, timeLimitMin, onWarning, warned])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const pad = (n: number) => n.toString().padStart(2, '0')

  const ratio = remaining / (timeLimitMin * 60)
  const colorClass = ratio > 0.33
    ? 'text-[#1a2e1a] bg-[#f0faf2] border-[#c8e6c9]'
    : ratio > 0.1
    ? 'text-[#f57f17] bg-[#fff8e1] border-[#ffe082]'
    : 'text-[#c62828] bg-[#ffebee] border-[#ffcdd2] animate-pulse'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-base transition-all ${colorClass}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="6"/>
        <path d="M7 4v3l2 2"/>
      </svg>
      {pad(minutes)}:{pad(seconds)}
    </div>
  )
}