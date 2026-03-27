'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Props {
  variantId: string
  title: string
}

export default function DeleteVariantButton({ variantId, title }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()

    // Видаляємо всі відповіді у спробах цього варіанту
    const { data: attempts } = await supabase
      .from('attempts')
      .select('id')
      .eq('variant_id', variantId)

    if (attempts?.length) {
      const attemptIds = attempts.map(a => a.id)
      await supabase
        .from('answers')
        .delete()
        .in('attempt_id', attemptIds)
    }

    // Видаляємо спроби
    await supabase
      .from('attempts')
      .delete()
      .eq('variant_id', variantId)

    // Видаляємо питання
    await supabase
      .from('questions')
      .delete()
      .eq('variant_id', variantId)

    // Видаляємо варіант
    await supabase
      .from('variants')
      .delete()
      .eq('id', variantId)

    setDeleting(false)
    setShowConfirm(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-red-400 hover:text-red-600 font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
      >
        🗑 Видалити
      </button>

      {/* Модальне підтвердження */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-2">
              Видалити варіант?
            </h3>
            <p className="text-sm text-[#556655] mb-1">
              <span className="font-semibold">"{title}"</span>
            </p>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ Будуть видалені всі питання та спроби учнів по цьому варіанту. Це незворотньо!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
              >
                Скасувати
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-xl transition-all disabled:opacity-50"
              >
                {deleting ? 'Видалення...' : 'Так, видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}