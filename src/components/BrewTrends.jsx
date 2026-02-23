import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ============================================================
// BREW TRENDS -- Visual charts showing brewing patterns over time
// ============================================================
// Displays three stacked line charts (Rating, Grind Setting, Brew
// Time) for the last 20 brews. Uses Recharts for rendering.
// Read-only — no mutations, just visual feedback.

export default function BrewTrends({ brews }) {
  if (brews.length < 3) {
    const remaining = 3 - brews.length
    return (
      <div className="mt-12 text-center text-brew-400 animate-fade-in-up motion-reduce:animate-none">
        <div className="text-4xl mb-3">📈</div>
        <p className="text-lg font-medium text-brew-700">Brew Trends</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          Log {remaining} more brew{remaining !== 1 ? 's' : ''} to unlock trend charts
          for your rating, grind setting, and brew time.
        </p>
      </div>
    )
  }

  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Take last 20 (stored newest-first), reverse for chronological order
  const recent = brews.slice(0, 20).reverse()

  const chartData = recent.map(brew => ({
    date: formatDate(brew.brewedAt),
    beanName: brew.beanName || 'Unknown',
    rating: brew.rating || null,
    grindSetting: typeof brew.grindSetting === 'number' ? brew.grindSetting : null,
    totalTime: brew.totalTime ? Number(brew.totalTime) : null,
  }))

  const charts = [
    { title: 'Rating',        dataKey: 'rating',       stroke: '#7c4f2e', domain: [1, 5] },
    { title: 'Grind Setting', dataKey: 'grindSetting', stroke: '#c08552' },
    { title: 'Brew Time',     dataKey: 'totalTime',    stroke: '#d4a574', tickFormatter: formatTime },
  ]

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-brew-800">Trends</h2>

      {charts.map(chart => (
        <div
          key={chart.dataKey}
          className="bg-white rounded-2xl border border-brew-100 shadow-sm p-4"
        >
          <h3 className="text-sm font-medium text-brew-700 mb-2">{chart.title}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5e6d0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#a0673c' }}
                axisLine={{ stroke: '#e8cba0' }}
                tickLine={{ stroke: '#e8cba0' }}
              />
              <YAxis
                domain={chart.domain}
                tick={{ fontSize: 11, fill: '#a0673c' }}
                tickFormatter={chart.tickFormatter}
                axisLine={{ stroke: '#e8cba0' }}
                tickLine={{ stroke: '#e8cba0' }}
                width={chart.tickFormatter ? 40 : 30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={chart.dataKey}
                stroke={chart.stroke}
                strokeWidth={2}
                dot={{ fill: chart.stroke, r: 3 }}
                activeDot={{ r: 5, fill: chart.stroke }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-brew-50 border border-brew-200 rounded-lg px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-brew-800">{data.beanName || 'Unknown'}</p>
      <p className="text-xs text-brew-500">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-mono text-brew-700 mt-0.5">
          {entry.value}{entry.dataKey === 'totalTime' ? 's' : ''}
        </p>
      ))}
    </div>
  )
}
