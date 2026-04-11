'use client'

import { useState } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

interface Props {
  currentPage: 'home' | 'tests' | 'stats' | 'materials' | 'set'
  userName?: string
}

export default function StudentHeader({ currentPage, userName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/tests', label: 'Тести', key: 'tests' },
    { href: '/set', label: 'Сет НМТ', key: 'set' },
    { href: '/stats', label: 'Статистика', key: 'stats' },
    { href: '/materials', label: 'Матеріали', key: 'materials' },
  ]

  return (
    <header className="bg-white border-b border-[#e8ede8]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Логотип */}
        <Link href="/home" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0ead69] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 4.5v5c0 3.8 2.5 6.5 6 7.5 3.5-1 6-3.7 6-7.5v-5L8 1z" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="font-bold text-[#1a2e1a] text-sm leading-tight">НМТ Математика</div>
            <div className="text-[#7a9a7a] text-xs">Підготовка 2026</div>
          </div>
        </Link>

        {/* Десктопна навігація */}
        <nav className="hidden md:flex gap-1 ml-6">
          {links.map(l => (
            <Link key={l.key} href={l.href}
              className={currentPage === l.key ? 'nav-link-active' : 'nav-link'}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Права частина */}
        <div className="flex items-center gap-3 ml-auto">
          {userName && (
            <span className="text-sm text-[#445544] font-medium hidden sm:block">{userName}</span>
          )}
          <LogoutButton />

          {/* Бургер */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-[#f0f7f0] transition-colors"
            aria-label="Меню"
          >
            <span className={`block w-5 h-0.5 bg-[#1a2e1a] transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#1a2e1a] transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#1a2e1a] transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Мобільне меню */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#e8ede8] bg-white px-4 py-3 flex flex-col gap-1">
          {links.map(l => (
            <Link key={l.key} href={l.href}
              onClick={() => setMenuOpen(false)}
              className={currentPage === l.key ? 'nav-link-active block' : 'nav-link block'}>
              {l.label}
            </Link>
          ))}
          {userName && (
            <div className="text-sm text-[#7a9a7a] px-4 pt-2 border-t border-[#e8ede8] mt-1">{userName}</div>
          )}
        </div>
      )}
    </header>
  )
}