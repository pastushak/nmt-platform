'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Student {
  id: string
  name: string
  email: string
  is_verified: boolean
  is_active: boolean
}

export default function StudentActions({ student }: { student: Student }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [newName, setNewName] = useState(student.name)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function toggleVerified() {
    setLoading(true)
    await supabase.from('users')
      .update({ is_verified: !student.is_verified })
      .eq('id', student.id)
    setLoading(false)
    router.refresh()
  }

  async function toggleActive() {
    setLoading(true)
    await supabase.from('users')
      .update({ is_active: !student.is_active })
      .eq('id', student.id)
    setLoading(false)
    router.refresh()
  }

  async function handleRename() {
    if (!newName.trim()) return
    setLoading(true)
    await supabase.from('users')
      .update({ name: newName.trim() })
      .eq('id', student.id)
    setLoading(false)
    setShowEdit(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    const { data: attempts } = await supabase
      .from('attempts').select('id').eq('student_id', student.id)

    if (attempts?.length) {
      await supabase.from('answers')
        .delete().in('attempt_id', attempts.map(a => a.id))
    }

    await supabase.from('attempts').delete().eq('student_id', student.id)
    await supabase.from('users').delete().eq('id', student.id)

    setLoading(false)
    setShowDelete(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">

        {/* Підтвердити / зняти підтвердження */}
        <button
          onClick={toggleVerified}
          disabled={loading}
          title={student.is_verified ? 'Зняти підтвердження' : 'Підтвердити'}
          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
            student.is_verified
              ? 'bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#c8e6c9]'
              : 'bg-[#fff8e1] text-[#f57f17] hover:bg-[#ffe082]'
          }`}
        >
          {student.is_verified ? '✔ Підтверджено' : '⏳ Підтвердити'}
        </button>

        {/* Деактивувати / активувати */}
        <button
          onClick={toggleActive}
          disabled={loading}
          title={student.is_active ? 'Заблокувати' : 'Розблокувати'}
          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
            student.is_active
              ? 'bg-[#f5f5f5] text-[#556655] hover:bg-red-50 hover:text-red-600'
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          {student.is_active ? '🔓 Активний' : '🔒 Заблоковано'}
        </button>

        {/* Змінити ім'я */}
        <button
          onClick={() => setShowEdit(true)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-[#f5f7f5] text-[#556655] hover:bg-[#e8ede8] font-medium transition-all"
        >
          ✏️
        </button>

        {/* Видалити */}
        <button
          onClick={() => setShowDelete(true)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-[#f5f7f5] text-red-400 hover:bg-red-50 hover:text-red-600 font-medium transition-all"
        >
          🗑
        </button>
      </div>

      {/* Модалка — змінити ім'я */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-4">Змінити ім'я</h3>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="input mb-4"
              placeholder="Ім'я та прізвище"
              onKeyDown={e => e.key === 'Enter' && handleRename()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowEdit(false)} className="btn-secondary flex-1">
                Скасувати
              </button>
              <button onClick={handleRename} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка — видалити */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-2">Видалити учня?</h3>
            <p className="text-sm text-[#556655] mb-1">
              <span className="font-semibold">{student.name}</span>
            </p>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ Будуть видалені всі спроби та результати цього учня. Незворотньо!
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="btn-secondary flex-1">
                Скасувати
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Видалення...' : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}