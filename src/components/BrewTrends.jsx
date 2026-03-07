import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { grindNotationToNumeric } from '../data/defaults'
import { formatTime, normalizeName } from '../data/storage'
import EmptyState from './EmptyState'

function formatChartDate(isoString) {
  const d = new Date(isoString)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ============================================================
// BREW TRENDS -- Visual charts showing brewing patterns over time
// ============================================================
// Displays three stacked line charts (Rating, Grind Setting, Brew
// Time) for recent brews. Optional per-bean filtering with stats
// summary for dial-in workflows. Uses Recharts for rendering.

export default function BrewTrends({ brews, beans }) {
  const [selectedBean, setSelectedBean] = useState('')

  // Build dropdown options: bean library + unique brew beanNames, deduplicated
  const beanOptions = useMemo(() => {
    const nameSet = new Map()
    beans.forEach(b => {
      if (b.name?.trim()) nameSet.set(normalizeName(b.name), b.name.trim())
    })
    brews.forEach(b => {
      if (b.beanName?.trim()) {
        const key = normalizeName(b.beanName)
        if (!nameSet.has(key)) nameSet.set(key, b.beanName.trim())
      }
    })
    return [...nameSet.values()].sort((a, b) => a.localeCompare(b))
  }, [beans, brews])

  // Filter brews by selected bean
  const filteredBrews = selectedBean
    ? brews.filter(b => normalizeName(b.beanName) === normalizeName(selectedBean))
    : brews

  // Compute stats for the filtered bean
  const stats = useMemo(() => {
    if (!selectedBean || filteredBrews.length === 0) return null

    const ratings = filteredBrews.map(b => b.rating).filter(r => r != null)
    const grinds = filteredBrews.map(b => grindNotationToNumeric(b.grindSetting)).filter(g => g != null)

    const flavorCounts = {}
    filteredBrews.forEach(b => {
      if (Array.isArray(b.flavors)) {
        b.flavors.forEach(f => { flavorCounts[f] = (flavorCounts[f] || 0) + 1 })
      }
    })
    const topFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    return {
      brewCount: filteredBrews.length,
      avgRating: ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
        : '—',
      grindRange: grinds.length > 0
        ? grinds.length === 1
          ? String(grinds[0])
          : `${Math.min(...grinds)} – ${Math.max(...grinds)}`
        : '—',
      topFlavors: topFlavors.length > 0 ? topFlavors.join(', ') : '—',
    }
  }, [selectedBean, filteredBrews])

  // Empty state: fewer than 3 brews (filtered or total)
  if (filteredBrews.length < 3) {
    const remaining = 3 - filteredBrews.length
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-brew-800">Trends</h2>
          {beanOptions.length > 0 && (
            <select
              value={selectedBean}
              onChange={e => setSelectedBean(e.target.value)}
              className="border border-brew-200 rounded-lg px-3 py-1.5 bg-white
                         text-brew-700 focus:outline-none focus:ring-2 focus:ring-brew-400
                         text-base"
            >
              <option value="">All Beans</option>
              {beanOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>

        <EmptyState
          emoji="📈"
          title={selectedBean ? `Trends for ${selectedBean}` : 'Brew Trends'}
          description={selectedBean
            ? `Log ${remaining} more brew${remaining !== 1 ? 's' : ''} with ${selectedBean} to see trend charts.`
            : `Log ${remaining} more brew${remaining !== 1 ? 's' : ''} to unlock trend charts for your rating, grind setting, and brew time.`
          }
        />
      </div>
    )
  }

  const chartData = useMemo(() => {
    const recent = filteredBrews.slice(0, 20).reverse()
    return recent.map(brew => ({
      date: formatChartDate(brew.brewedAt),
      beanName: brew.beanName || 'Unknown',
      rating: brew.rating || null,
      grindSetting: grindNotationToNumeric(brew.grindSetting),
      totalTime: brew.totalTime ? Number(brew.totalTime) : null,
    }))
  }, [filteredBrews])

  const charts = [
    { title: 'Rating',        dataKey: 'rating',       stroke: '#7c4f2e', domain: [1, 5] },
    { title: 'Grind Setting', dataKey: 'grindSetting', stroke: '#c08552' },
    { title: 'Brew Time',     dataKey: 'totalTime',    stroke: '#d4a574', tickFormatter: formatTime },
  ]

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-brew-800">Trends</h2>
        {beanOptions.length > 0 && (
          <select
            value={selectedBean}
            onChange={e => setSelectedBean(e.target.value)}
            className="border border-brew-200 rounded-lg px-3 py-1.5 bg-white
                       text-brew-700 focus:outline-none focus:ring-2 focus:ring-brew-400
                       text-base"
          >
            <option value="">All Beans</option>
            {beanOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {stats && (
        <div className="bg-white rounded-2xl border border-brew-100 shadow-sm p-4
                        grid grid-cols-2 gap-3 sm:grid-cols-4
                        animate-fade-in-up motion-reduce:animate-none">
          <StatItem label="Brews" value={stats.brewCount} />
          <StatItem label="Avg Rating" value={stats.avgRating} />
          <StatItem label="Grind Range" value={stats.grindRange} />
          <StatItem label="Top Flavors" value={stats.topFlavors} />
        </div>
      )}

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

function StatItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-brew-500">{label}</p>
      <p className="text-sm font-medium text-brew-800">{value}</p>
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
