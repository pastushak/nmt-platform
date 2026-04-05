'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

interface Props {
  activityData: { date: string; count: number }[]
  distributionData: { range: string; count: number }[]
  topStudents: { name: string; best: number; attempts: number }[]
  topicMistakes: { topic: string; mistakes: number; total: number; pct: number }[]
}

export default function AdminDashboardCharts({
  activityData,
  distributionData,
  topStudents,
  topicMistakes,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const visibleStudents = showAll ? topStudents : topStudents.slice(0, 5)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* 1. Графік активності */}
      <div className="card">
        <h2 className="font-bold text-[#1a2e1a] mb-4">📅 Активність (останній тиждень)</h2>
        {activityData.length === 0 ? (
          <p className="text-sm text-[#7a9a7a]">Ще немає даних</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f7f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7a9a7a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7a9a7a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-white border border-[#e8ede8] rounded-xl shadow-lg px-3 py-2 text-sm">
                      <p className="text-[#7a9a7a] text-xs">{payload[0].payload.date}</p>
                      <p className="font-bold text-[#0ead69]">{payload[0].value} спроб</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" fill="#0ead69" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2. Розподіл балів НМТ */}
      <div className="card">
        <h2 className="font-bold text-[#1a2e1a] mb-4">📊 Розподіл балів НМТ</h2>
        {distributionData.every(d => d.count === 0) ? (
          <p className="text-sm text-[#7a9a7a]">Ще немає результатів</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distributionData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f7f0" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#7a9a7a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7a9a7a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-white border border-[#e8ede8] rounded-xl shadow-lg px-3 py-2 text-sm">
                      <p className="text-[#7a9a7a] text-xs">{payload[0].payload.range} балів</p>
                      <p className="font-bold text-[#1565c0]">{payload[0].value} учнів</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distributionData.map((entry, i) => {
                  const color =
                    entry.range.startsWith('18') || entry.range.startsWith('19') || entry.range === '200'
                      ? '#2e7d32'
                      : entry.range.startsWith('15') || entry.range.startsWith('16') || entry.range.startsWith('17')
                      ? '#0ead69'
                      : entry.range.startsWith('13') || entry.range.startsWith('14')
                      ? '#f57f17'
                      : '#ef5350'
                  return <Cell key={i} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Рейтинг учнів */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1a2e1a]">🏆 Рейтинг учнів</h2>
          <span className="text-xs text-[#aec5ae]">{topStudents.length} учнів</span>
        </div>
        {topStudents.length === 0 ? (
          <p className="text-sm text-[#7a9a7a]">Ще немає результатів</p>
        ) : (
          <>
            <div className="space-y-2">
              {visibleStudents.map((s, i) => {
                const pct = Math.round(((s.best - 100) / 100) * 100)
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-6 text-center text-sm font-bold text-[#7a9a7a] flex-shrink-0">
                      {medal ?? <span className="text-xs">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-[#1a2e1a] truncate">{s.name}</span>
                        <span className="font-bold text-[#0ead69] ml-2 flex-shrink-0">{s.best}</span>
                      </div>
                      <div className="h-1.5 bg-[#f0f7f0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#0ead69'
                          }}
                        />
                      </div>
                      <p className="text-xs text-[#aec5ae] mt-0.5">{s.attempts} спроб</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {topStudents.length > 5 && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="w-full text-center text-sm text-[#0ead69] font-semibold mt-3 pt-3 border-t border-[#e8ede8] hover:text-[#0c9a5a] transition-colors"
              >
                {showAll
                  ? '↑ Згорнути до топ-5'
                  : `↓ Показати всіх (${topStudents.length - 5} ще)`}
              </button>
            )}
          </>
        )}
      </div>

      {/* 4. Статистика по темах */}
      <div className="card">
        <h2 className="font-bold text-[#1a2e1a] mb-4">❌ Топ тем з помилками</h2>
        {topicMistakes.length === 0 ? (
          <p className="text-sm text-[#7a9a7a]">Ще немає даних</p>
        ) : (
          <div className="space-y-3">
            {topicMistakes.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#1a2e1a] font-medium truncate max-w-[200px]">{t.topic}</span>
                  <span className="text-xs text-[#7a9a7a] ml-2 flex-shrink-0">
                    {t.mistakes}/{t.total} помилок
                  </span>
                </div>
                <div className="h-2 bg-[#f5f7f5] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t.pct}%`,
                      background: t.pct > 66 ? '#ef5350' : t.pct > 33 ? '#f57f17' : '#0ead69'
                    }}
                  />
                </div>
                <p className="text-xs text-[#aec5ae] mt-0.5">{t.pct}% невірних відповідей</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}