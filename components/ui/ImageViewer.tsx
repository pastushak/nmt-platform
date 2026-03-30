'use client'

import { useState } from 'react'

interface Props {
  url: string
  alt?: string
}

export default function ImageViewer({ url, alt = 'Зображення до питання' }: Props) {
  const [enlarged, setEnlarged] = useState(false)

  return (
    <>
      {/* Зображення в питанні */}
      <div className="my-4">
        <img
          src={url}
          alt={alt}
          onClick={() => setEnlarged(true)}
          className="max-w-full max-h-64 rounded-xl border border-[#e8ede8] object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
        />
        <p className="text-xs text-[#aec5ae] mt-1">
          🔍 Клікни щоб збільшити
        </p>
      </div>

      {/* Збільшене зображення */}
      {enlarged && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setEnlarged(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={url}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setEnlarged(false)}
              className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>
            <p className="text-white/60 text-xs text-center mt-2">
              Клікни будь-де щоб закрити
            </p>
          </div>
        </div>
      )}
    </>
  )
}