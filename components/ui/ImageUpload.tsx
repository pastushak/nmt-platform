'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  currentUrl: string | null
  onUpload: (url: string | null) => void
}

export default function ImageUpload({ currentUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) {
      alert('Помилка завантаження: ' + error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('question-images')
      .getPublicUrl(data.path)

    setPreview(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
  }

  function handleUrlSubmit() {
    if (!urlInput.trim()) return
    setPreview(urlInput.trim())
    onUpload(urlInput.trim())
    setShowUrlInput(false)
    setUrlInput('')
  }

  function handleRemove() {
    setPreview(null)
    onUpload(null)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#445544]">
        Зображення до питання (необов'язково)
      </label>

      {/* Попередній перегляд */}
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Зображення питання"
            className="max-w-full max-h-48 rounded-xl border border-[#e8ede8] object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Кнопки додавання */}
      {!preview && (
        <div className="flex gap-2 flex-wrap">
          {/* Завантажити файл */}
          <label className="btn-secondary text-sm cursor-pointer">
            {uploading ? '⏳ Завантаження...' : '📁 Завантажити файл'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {/* Вставити URL */}
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="btn-secondary text-sm"
          >
            🔗 Вставити URL
          </button>
        </div>
      )}

      {/* Поле для URL */}
      {showUrlInput && !preview && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="input text-sm flex-1"
            placeholder="https://example.com/image.png"
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="btn-primary text-sm px-3"
          >
            Додати
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="btn-secondary text-sm px-3"
          >
            ✕
          </button>
        </div>
      )}

      {preview && (
        <button
          type="button"
          onClick={handleRemove}
          className="text-sm text-red-400 hover:text-red-600 font-medium"
        >
          🗑 Видалити зображення
        </button>
      )}
    </div>
  )
}