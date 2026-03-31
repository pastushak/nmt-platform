import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

interface Props {
  currentPage: 'dashboard' | 'variants' | 'students' | 'materials'
  userName?: string
}

export default function AdminHeader({ currentPage, userName }: Props) {
  return (
    <header className="bg-white border-b border-[#e8ede8]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0ead69] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L2 4.5v5c0 3.8 2.5 6.5 6 7.5 3.5-1 6-3.7 6-7.5v-5L8 1z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-[#1a2e1a] text-sm">НМТ Математика</div>
              <div className="text-[#7a9a7a] text-xs">Панель викладача</div>
            </div>
          </div>
          <span className="text-[#c8e6c9]">|</span>
          <nav className="hidden md:flex gap-1">
            <Link href="/admin" className={currentPage === 'dashboard' ? 'nav-link-active' : 'nav-link'}>
              Дашборд
            </Link>
            <Link href="/admin/variants" className={currentPage === 'variants' ? 'nav-link-active' : 'nav-link'}>
              Варіанти
            </Link>
            <Link href="/admin/students" className={currentPage === 'students' ? 'nav-link-active' : 'nav-link'}>
              Учні
            </Link>
            <Link href="/materials" className={currentPage === 'materials' ? 'nav-link-active' : 'nav-link'}>
              Матеріали
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-sm text-[#445544] font-medium hidden sm:block">{userName}</span>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}