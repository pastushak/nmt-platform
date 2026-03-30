'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

interface ChartPoint {
  date: string
  nmt: number
  raw: number
  variant: string
  classAvg: number | null
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartPoint
  return (
    <div className="bg-white border border-[#e8ede8] rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-[#1a2e1a] mb-1">{d.variant}</p>
      <p className="text-[#7a9a7a] text-xs mb-2">{d.date}</p>
      <p className="text-[#0ead69] font-bold">НМТ бал: {d.nmt || '—'}</p>
      <p className="text-[#556655]">Тестовий: {d.raw}/32</p>
      {d.classAvg && <p className="text-[#1565c0]">Серед. класу: {d.classAvg}</p>}
    </div>
  )
}

export default function StatsCharts({ chartData }: { chartData: ChartPoint[] }) {
  const hasClass = chartData.some(d => d.classAvg !== null)

  return (
    <div className="card">
      <h3 className="font-bold text-[#1a2e1a] mb-6">📈 Динаміка балів НМТ</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f7f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#7a9a7a' }} axisLine={false} tickLine={false} />
          <YAxis domain={[100, 200]} tick={{ fontSize: 12, fill: '#7a9a7a' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {hasClass && <Legend />}
          <ReferenceLine y={150} stroke="#c8e6c9" strokeDasharray="4 4"
            label={{ value: '150', position: 'right', fontSize: 11, fill: '#7a9a7a' }} />
          <Line
            type="monotone" dataKey="nmt" name="Мій бал НМТ"
            stroke="#0ead69" strokeWidth={2.5}
            dot={{ fill: '#0ead69', r: 5, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7 }} connectNulls
          />
          {hasClass && (
            <Line
              type="monotone" dataKey="classAvg" name="Середнє класу"
              stroke="#1565c0" strokeWidth={2} strokeDasharray="5 5"
              dot={{ fill: '#1565c0', r: 4, strokeWidth: 2, stroke: '#fff' }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {chartData.length === 1 && (
        <p className="text-center text-xs text-[#7a9a7a] mt-2">
          Пройди більше тестів щоб побачити динаміку
        </p>
      )}
    </div>
  )
}
