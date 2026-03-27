'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Props {
  variantId: string
  isPublished: boolean
  disabled?: boolean
}

export default function PublishToggle({ variantId, isPublished, disabled }: Props) {
  const [published, setPublished] = useState(isPublished)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    if (disabled && !published) return
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('variants')
      .update({ is_published: !published })
      .eq('id', variantId)
    setPublished(!published)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || (disabled && !published)}
      title={disabled && !published ? 'Спочатку додайте всі 22 питання' : ''}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        published ? 'bg-[#0ead69]' : 'bg-[#e8ede8]'
      } ${disabled && !published ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        published ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}