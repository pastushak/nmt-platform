'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DeleteAttemptButton({ attemptId }: { attemptId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('answers').delete().eq('attempt_id', attemptId)
    await supabase.from('attempts').delete().eq('id', attemptId)
    setLoading(false)
    setConfirm(false)
    window.location.href = window.location.href
  }

  if (confirm) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
        >
          {loading ? '...' : 'Так'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs bg-[#f5f5f5] text-[#556655] px-2 py-1 rounded-lg hover:bg-[#e8ede8]"
        >
          Ні
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-red-400 hover:text-red-600 font-medium"
    >
      🗑
    </button>
  )
}