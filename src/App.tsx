import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  buildBeachHeadline,
  buildHeroMood,
  buildRainSummary,
  buildSmartSummary,
  getBestOutdoorWindow,
  getCurrentTidePoint,
  getLabeledTidePoints,
  getTideTrendLabel,
  fetchBeachSnapshot,
  fetchRadarFrame,
  fetchWeather,
  formatDaylightDuration,
  formatHourLabel,
  getDaylightStatus,
  formatPriorityDayLabel,
  formatTimeLabel,
  getDaylightProgress,
  getDaylightWindowState,
  buildWeeklySummary,
  savedLocations,
  searchLocations,
  weatherCodeToIcon,
  weatherCodeToLabel,
  windDirectionLabel,
  type BeachSnapshot,
  type RadarFrame,
  type SavedLocationId,
  type WeatherLocation,
  type WeatherSnapshot,
} from './weather'
import { MapView } from './MapView'

function App() {
  const [activeTab, setActiveTab] = useState<SavedLocationId>('home')
  const [weather, setWeather] = useState<Record<string, WeatherSnapshot>>({})
  const [currentLocation, setCurrentLocation] = useState<WeatherLocation | null>(null)
  const [currentStatus, setCurrentStatus] = useState('Location permission not requested yet.')
  const [searchQuery, setSearchQuery] = useState('32937')
  const [searchResults, setSearchResults] = useState<WeatherLocation[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [radarFrame, setRadarFrame] = useState<RadarFrame | null>(null)
  const [beach, setBeach] = useState<BeachSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [radarOpacity, setRadarOpacity] = useState(72)

  useEffect(() => {
    let cancelled = false

    async function loadSavedWeather() {
      try {
        setLoading(true)
        setError(null)

        const [snapshots, radar, beachSnapshot] = await Promise.all([
          Promise.all(savedLocations.map((location) => fetchWeather(location))),
          fetchRadarFrame(),
          fetchBeachSnapshot(28.1486, -80.5887),
        ])

        if (cancelled) {
          return
        }

        const nextState = Object.fromEntries(
          snapshots.map((snapshot, index) => [savedLocations[index].id, snapshot]),
        )

        setWeather(nextState)
        setRadarFrame(radar)
        setBeach(beachSnapshot)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load weather')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSavedWeather()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'current' || currentLocation || !navigator.geolocation) {
      return
    }

    setCurrentStatus('Requesting device location…')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: WeatherLocation = {
          id: 'current',
          label: 'Current',
          subtitle: 'Your current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: 'auto',
        }

        setCurrentLocation(location)
        setCurrentStatus('Location found. Loading weather…')

        try {
          const snapshot = await fetchWeather(location)
          setWeather((previous) => ({ ...previous, current: snapshot }))
          setCurrentStatus('Using your live location.')
        } catch (locationError) {
          setCurrentStatus(
            locationError instanceof Error
              ? locationError.message
              : 'Unable to load weather for current location.',
          )
        }
      },
      (geoError) => {
        setCurrentStatus(geoError.message || 'Location permission denied.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    )
  }, [activeTab, currentLocation])

  const tabLocations = [
    ...savedLocations,
    { id: 'current', label: 'Current', subtitle: 'Use phone location' },
    { id: 'search', label: 'Search', subtitle: 'ZIP or place name' },
  ]

  const activeLocation = useMemo(() => {
    if (activeTab === 'current') {
      return currentLocation
    }

    if (activeTab === 'home' || activeTab === 'work') {
      return savedLocations.find((location) => location.id === activeTab) ?? savedLocations[0]
    }

    return null
  }, [activeTab, currentLocation])

  const activeWeather = activeTab === 'search' ? null : activeLocation ? weather[activeLocation.id] : null
  const searchSelection = searchResults[0]
  const searchWeather = searchSelection ? weather[searchSelection.id] : null
  const displayedLocation = activeTab === 'search' ? searchSelection : activeLocation
  const displayedWeather = activeTab === 'search' ? searchWeather : activeWeather
  const dailyToday = displayedWeather?.daily[0]

  const radarTileUrl = radarFrame
    ? `${radarFrame.host}${radarFrame.path}/256/{z}/{x}/{y}/6/1_1.png`
    : null

  const smartSummary = displayedWeather ? buildSmartSummary(displayedWeather, beach) : ''
  const heroMood = displayedWeather ? buildHeroMood(displayedWeather, beach) : null
  const beachHeadline = displayedWeather ? buildBeachHeadline(displayedWeather, beach) : null
  const bestOutdoorWindow = displayedWeather ? getBestOutdoorWindow(displayedWeather.hourly) : null
  const tideTrend = beach ? getTideTrendLabel(beach.tidePoints) : ''
  const currentTidePoint = beach ? getCurrentTidePoint(beach.tidePoints) : null
  const labeledTidePoints = beach ? getLabeledTidePoints(beach.tidePoints) : []
  const daylightProgress = displayedWeather?.daily[0]
    ? getDaylightProgress(displayedWeather.current.time, displayedWeather.daily[0].sunrise, displayedWeather.daily[0].sunset)
    : 0
  const daylightDuration = displayedWeather?.daily[0]
    ? formatDaylightDuration(displayedWeather.daily[0].sunrise, displayedWeather.daily[0].sunset)
    : '—'
  const daylightStatus = displayedWeather?.daily[0]
    ? getDaylightStatus(displayedWeather.current.time, displayedWeather.daily[0].sunrise, displayedWeather.daily[0].sunset)
    : 'Daylight status unavailable'
  const weeklySummary = displayedWeather ? buildWeeklySummary(displayedWeather.daily) : ''
  const tomorrow = displayedWeather?.daily[1]
  const daylightWindowState = displayedWeather?.daily[0]
    ? getDaylightWindowState(displayedWeather.current.time, displayedWeather.daily[0].sunrise, displayedWeather.daily[0].sunset)
    : 'unknown'

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSearching(true)
      const results = await searchLocations(searchQuery)
      setSearchResults(results)
    } catch (searchError) {
      setSearchResults([])
      setError(searchError instanceof Error ? searchError.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleSelectSearchResult(location: WeatherLocation) {
    setError(null)
    setActiveTab('search')
    setSearchResults([location])
    setLoading(true)

    try {
      const snapshot = await fetchWeather(location)
      setWeather((previous) => ({ ...previous, [location.id]: snapshot }))
      setCurrentLocation(location)
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Unable to load location weather')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local Weather Dashboard</p>
          <h1>Weather</h1>
        </div>
        <div className="topbar-meta">
          <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          <span className={`freshness-badge ${loading ? 'is-live' : ''}`}>{loading ? 'Refreshing…' : 'Updated just now'}</span>
        </div>
      </header>

      <nav className="tabs" aria-label="Saved locations">
        {tabLocations.map((location) => (
          <button
            key={location.id}
            className={`tab ${activeTab === location.id ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(location.id as SavedLocationId)}
          >
            <span>{location.label}</span>
            <small>{location.subtitle}</small>
          </button>
        ))}
      </nav>

      {displayedLocation && displayedWeather ? (
        <>
          <section className="hero-card card mobile-priority-2">
            <div>
              <div className="hero-kicker-row">
                <p className="eyebrow">{displayedLocation.subtitle}</p>
                <span className="hero-chip">Now</span>
              </div>
              <p className="hero-updated">Last updated {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              <div className="hero-main hero-main-balanced">
                <div>
                  <div className="hero-temp">{Math.round(displayedWeather.current.temperature)}°</div>
                  <p className="hero-summary">
                    {weatherCodeToLabel(displayedWeather.current.weatherCode)} with a{' '}
                    {windDirectionLabel(displayedWeather.current.windDirection)} breeze.
                  </p>
                </div>
                <div className="hero-icon hero-icon-balanced" aria-hidden="true">
                  {weatherCodeToIcon(displayedWeather.current.weatherCode, displayedWeather.current.isDay)}
                </div>
              </div>
            </div>
            {heroMood && heroMood.title !== smartSummary ? (
              <div className="hero-mood-band hero-mood-band-compact">
                <strong>{heroMood.title}</strong>
                <span>{heroMood.detail}</span>
              </div>
            ) : null}
            <div className="hero-stats">
              <div>
                <span>High / Low</span>
                <strong>
                  {Math.round(dailyToday?.temperatureMax ?? displayedWeather.current.temperature)}° /{' '}
                  {Math.round(dailyToday?.temperatureMin ?? displayedWeather.current.temperature)}°
                </strong>
              </div>
              <div>
                <span>Rain chance</span>
                <strong>{Math.round(displayedWeather.current.precipitationProbability)}%</strong>
              </div>
              <div>
                <span>Feels like</span>
                <strong>{Math.round(displayedWeather.current.apparentTemperature)}°</strong>
              </div>
              <div>
                <span>Wind</span>
                <strong>
                  {Math.round(displayedWeather.current.windSpeed)} mph {windDirectionLabel(displayedWeather.current.windDirection)}
                </strong>
              </div>
            </div>
          </section>

          <section className="card spotlight-card mobile-priority-1">
            <div className="spotlight-head">
              <div>
                <p className="eyebrow">Tonight at a glance</p>
                <h2>Smart Summary</h2>
              </div>
            </div>
            <p className="spotlight-summary">{smartSummary}</p>
          </section>

          <section className="summary-grid mobile-priority-3">
            <article className="card comfort-card">
              <div className="comfort-head">
                <div>
                  <p className="eyebrow">Comfort</p>
                  <h2>What it feels like</h2>
                </div>
                <div className="comfort-icon">
                  {displayedWeather.current.temperature >= 82 ? '🕶️' : displayedWeather.current.temperature >= 72 ? '☀️' : '🧥'}
                </div>
              </div>
              <p>
                {displayedWeather.current.temperature >= 82
                  ? 'Hot and bright — light clothes and sunglasses recommended.'
                  : displayedWeather.current.temperature >= 72
                    ? 'Warm and comfortable — great weather for being outside.'
                    : 'Cooler air — a light layer may help.'}
              </p>
            </article>

            <article className="card rain-card">
              <p className="eyebrow">Next few hours</p>
              <h2>Rain Summary</h2>
              <p>{buildRainSummary(displayedWeather.hourly)}</p>
            </article>

            <article className="card radar-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Radar</p>
                  <h2>Live radar preview</h2>
                  <p className="radar-help">Regional storm view for fast incoming-weather awareness.</p>
                </div>
                <div className="radar-actions">
                  <label className="radar-opacity-control">
                    <span>Radar {radarOpacity}%</span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={radarOpacity}
                      onChange={(event) => setRadarOpacity(Number(event.target.value))}
                    />
                  </label>
                </div>
              </div>
              <div className="radar-map-shell">
                <MapView
                  location={displayedLocation}
                  radarTileUrl={radarTileUrl}
                  radarOpacity={radarOpacity / 100}
                />
              </div>
            </article>
          </section>

          <section className="sun-card card mobile-priority-4">
            <div className="sun-card-header">
              <div>
                <p className="eyebrow">Daylight</p>
                <h2>Sunrise & Sunset</h2>
              </div>
              <div className={`sun-pill ${daylightWindowState === 'after-sunset' ? 'sun-pill-night' : ''}`}>{daylightDuration}</div>
            </div>
            <div className="sun-status-band">
              <strong>
                {daylightWindowState === 'after-sunset' && tomorrow
                  ? `Next sunrise ${formatTimeLabel(tomorrow.sunrise)} tomorrow`
                  : daylightStatus}
              </strong>
              <span>
                {daylightWindowState === 'after-sunset'
                  ? `Today had ${daylightDuration}`
                  : `${Math.round(daylightProgress)}% of today’s daylight window has passed`}
              </span>
            </div>
            <div className={`sun-arc sun-arc-premium ${daylightWindowState === 'after-sunset' ? 'sun-arc-night' : ''}`} aria-hidden="true">
              <div className="sun-arc-line"></div>
              <div className="sun-progress-track">
                <div className="sun-progress-fill" style={{ width: `${daylightProgress}%` }}></div>
              </div>
              <div className="sun-rise-marker"></div>
              <div className="sun-set-marker"></div>
              <div className="sun-icon-tracker" style={{ left: `${daylightWindowState === 'after-sunset' ? 92 : daylightProgress}%` }}>
                <span className="sun-icon-emoji">{daylightWindowState === 'after-sunset' ? '🌙' : '☀️'}</span>
              </div>
            </div>
            <div className="sun-times sun-times-premium sun-times-compact">
              <div className="sun-time-block sun-time-block-premium">
                <span>{daylightWindowState === 'after-sunset' ? 'Today sunset' : 'Sunrise'}</span>
                <strong>
                  {daylightWindowState === 'after-sunset'
                    ? dailyToday
                      ? formatTimeLabel(dailyToday.sunset)
                      : '—'
                    : dailyToday
                      ? formatTimeLabel(dailyToday.sunrise)
                      : '—'}
                </strong>
              </div>
              <div className="sun-time-block sun-time-block-premium">
                <span>{daylightWindowState === 'after-sunset' ? 'Tomorrow sunrise' : 'Sunset'}</span>
                <strong>
                  {daylightWindowState === 'after-sunset'
                    ? tomorrow
                      ? formatTimeLabel(tomorrow.sunrise)
                      : '—'
                    : dailyToday
                      ? formatTimeLabel(dailyToday.sunset)
                      : '—'}
                </strong>
              </div>
            </div>
          </section>

          {beach ? (
            <section className="beach-section card mobile-priority-5">
              <div className="beach-header">
                <div>
                  <p className="eyebrow">Ocean & Beach</p>
                  <h2>Beach Conditions</h2>
                </div>
                <div className="beach-badge beach-badge-premium">
                  {(beach.waveHeight ?? 0) < 2.5 && displayedWeather.current.windSpeed < 12
                    ? 'Great'
                    : (beach.waveHeight ?? 0) < 4
                      ? 'Fair'
                      : 'Rough'}
                </div>
              </div>
              {beachHeadline ? (
                <div className="beach-headline-band">
                  <strong>{beachHeadline.title}</strong>
                  <span>{beachHeadline.detail}</span>
                </div>
              ) : null}
              {beach.tidePoints && beach.tidePoints.length > 1 ? (
                <div className="tide-graph-card premium-tide-graph-card">
                  <div className="tide-graph-header">
                    <div>
                      <span className="tide-mini-label">Tide curve</span>
                      <strong>24-hour tide outlook</strong>
                    </div>
                    <div className="tide-mini-badge">{tideTrend}</div>
                  </div>
                  {(() => {
                    const values = beach.tidePoints?.map((point) => point.value) ?? []
                    const min = Math.min(...values)
                    const max = Math.max(...values)
                    const range = Math.max(max - min, 1)
                    const points = beach.tidePoints.map((point, index, arr) => {
                      const x = (index / Math.max(arr.length - 1, 1)) * 100
                      const y = 46 - ((point.value - min) / range) * 30
                      return { ...point, x, y }
                    })
                    const nowPoint = currentTidePoint ? points.find((point) => point.rawTime === currentTidePoint.rawTime) ?? points[0] : points[0]
                    return (
                      <div className="tide-chart-shell">
                        <div className="tide-y-axis" aria-hidden="true">
                          <span>{max.toFixed(1)} ft</span>
                          <span>{((min + max) / 2).toFixed(1)} ft</span>
                          <span>{min.toFixed(1)} ft</span>
                        </div>
                        <div className="tide-chart-main">
                          <svg className="tide-graph tide-graph-premium" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
                            <defs>
                              <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(94, 218, 255, 0.72)" />
                                <stop offset="100%" stopColor="rgba(94, 218, 255, 0.10)" />
                              </linearGradient>
                            </defs>
                            <polyline className="tide-grid-line" fill="none" strokeWidth="1" points="0,10 100,10" />
                            <polyline className="tide-grid-line" fill="none" strokeWidth="1" points="0,28 100,28" />
                            <polyline className="tide-grid-line" fill="none" strokeWidth="1" points="0,46 100,46" />
                            {nowPoint ? <line className="tide-now-line" x1={nowPoint.x} y1="8" x2={nowPoint.x} y2="48" /> : null}
                            <polygon className="tide-area-fill" points={`${points.map((point) => `${point.x},${point.y}`).join(' ')} 100,56 0,56`} />
                            <polyline className="tide-line-premium" fill="none" strokeWidth="3" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
                            {labeledTidePoints.map((point, labelIndex) => {
                              const renderedPoint = points.find((candidate) => candidate.rawTime === point.rawTime)
                              if (!renderedPoint) return null
                              return (
                                <g key={`${point.time}-${point.type}`}>
                                  <circle cx={renderedPoint.x} cy={renderedPoint.y} r="2.3" className={`tide-point-dot ${point.type === 'H' ? 'tide-point-high' : 'tide-point-low'}`} />
                                  <text x={renderedPoint.x} y={point.type === 'H' ? renderedPoint.y - (labelIndex % 2 === 0 ? 4 : 7) : renderedPoint.y + (labelIndex % 2 === 0 ? 6 : 9)} textAnchor="middle" className="tide-point-label">{point.type === 'H' ? `High ${point.time}` : `Low ${point.time}`}</text>
                                </g>
                              )
                            })}
                            {nowPoint ? <circle cx={nowPoint.x} cy={nowPoint.y} r="2.4" className="tide-now-dot" /> : null}
                          </svg>
                          <div className="tide-x-axis" aria-hidden="true">
                            {points.map((point, index) => index % 5 === 0 ? <span key={point.time}>{point.time}</span> : null)}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="tide-callout-row">
                    {labeledTidePoints.slice(0, 4).map((point) => (
                      <div key={`${point.time}-${point.type}`} className="tide-callout-pill tide-callout-pill-premium">
                        <strong>{point.type === 'H' ? 'High' : 'Low'}</strong>
                        <span>{point.time}</span>
                      </div>
                    ))}
                    <div className="tide-callout-pill tide-callout-pill-now">
                      <strong>Now</strong>
                      <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ) : (beach.nextHigh || beach.nextLow) ? (
                <div className="tide-graph-card premium-tide-graph-card tide-fallback-card">
                  <div className="tide-graph-header">
                    <div>
                      <span className="tide-mini-label">Tide outlook</span>
                      <strong>Next tide events</strong>
                    </div>
                    <div className="tide-mini-badge">Port Canaveral</div>
                  </div>
                  <div className="tide-fallback-row">
                    {beach.nextHigh ? (
                      <div className="tide-callout-pill tide-fallback-pill">
                        <strong>High tide</strong>
                        <span>{beach.nextHigh.time}</span>
                      </div>
                    ) : null}
                    {beach.nextLow ? (
                      <div className="tide-callout-pill tide-fallback-pill">
                        <strong>Low tide</strong>
                        <span>{beach.nextLow.time}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="beach-grid beach-grid-compact">
                <article className="beach-metric">
                  <span>Water</span>
                  <strong>{beach.waterTemperature !== null ? `${Math.round(beach.waterTemperature)}°F` : '—'}</strong>
                </article>
                <article className="beach-metric">
                  <span>Waves</span>
                  <strong>{beach.waveHeight !== null ? `${beach.waveHeight.toFixed(1)} ft` : '—'}</strong>
                </article>
                <article className="beach-metric">
                  <span>Wave period</span>
                  <strong>{beach.wavePeriod !== null ? `${Math.round(beach.wavePeriod)} s` : '—'}</strong>
                </article>
                <article className="beach-metric">
                  <span>Wind</span>
                  <strong>{Math.round(displayedWeather.current.windSpeed)} mph</strong>
                </article>
              </div>
              {(beach.nextHigh || beach.nextLow) ? (
                <div className="tide-status-row featured-tide-row">
                  <div className="tide-status-item featured-tide-item">
                    <span>Next High Tide</span>
                    <strong>{beach.nextHigh ? beach.nextHigh.time : '—'}</strong>
                  </div>
                  <div className="tide-status-item featured-tide-item">
                    <span>Next Low Tide</span>
                    <strong>{beach.nextLow ? beach.nextLow.time : '—'}</strong>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="card forecast-card mobile-priority-6">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Hourly</p>
                <h2>Today&apos;s forecast</h2>
              </div>
            </div>
            <div className="sparkline-card forecast-sparkline-card premium-forecast-card">
              <div className="sparkline-header premium-sparkline-header">
                <span>Temperature trend</span>
                <strong>
                  {Math.round(Math.min(...displayedWeather.hourly.map((hour) => hour.temperature)))}° → {Math.round(Math.max(...displayedWeather.hourly.map((hour) => hour.temperature)))}°
                </strong>
              </div>
              {(() => {
                const temps = displayedWeather.hourly.map((hour) => hour.temperature)
                const min = Math.round(Math.min(...temps))
                const max = Math.round(Math.max(...temps))
                const mid = Math.round((min + max) / 2)
                return (
                  <div className="forecast-chart-shell">
                    <div className="forecast-y-axis" aria-hidden="true">
                      <span>{max}°</span>
                      <span>{mid}°</span>
                      <span>{min}°</span>
                    </div>
                    <div className="forecast-chart-main">
                      <div className="forecast-band-label">Overnight into early morning</div>
                      <svg className="temp-sparkline forecast-sparkline-large" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient id="forecastLineGlow" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#7ea6ff" />
                            <stop offset="100%" stopColor="#78f0d3" />
                          </linearGradient>
                          <linearGradient id="forecastRainFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(120, 240, 211, 0.38)" />
                            <stop offset="100%" stopColor="rgba(120, 240, 211, 0.04)" />
                          </linearGradient>
                        </defs>
                        <polyline
                          className="forecast-grid-line"
                          fill="none"
                          strokeWidth="1"
                          points="0,8 100,8"
                        />
                        <polyline
                          className="forecast-grid-line"
                          fill="none"
                          strokeWidth="1"
                          points="0,24 100,24"
                        />
                        <polyline
                          className="forecast-grid-line"
                          fill="none"
                          strokeWidth="1"
                          points="0,40 100,40"
                        />
                        <polygon
                          className="forecast-rain-area"
                          points={`${displayedWeather.hourly.map((hour, index, arr) => {
                            const x = (index / Math.max(arr.length - 1, 1)) * 100
                            const y = 46 - (hour.precipitationProbability / 100) * 12
                            return `${x},${y}`
                          }).join(' ')} 100,48 0,48`}
                        />
                        <polyline
                          className="forecast-rain-line"
                          fill="none"
                          strokeWidth="1.6"
                          points={displayedWeather.hourly.map((hour, index, arr) => {
                            const x = (index / Math.max(arr.length - 1, 1)) * 100
                            const y = 46 - (hour.precipitationProbability / 100) * 12
                            return `${x},${y}`
                          }).join(' ')}
                        />
                        <polyline
                          fill="none"
                          stroke="url(#forecastLineGlow)"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={displayedWeather.hourly.map((hour, index, arr) => {
                            const values = arr.map((entry) => entry.temperature)
                            const localMin = Math.min(...values)
                            const localMax = Math.max(...values)
                            const range = Math.max(localMax - localMin, 1)
                            const x = (index / Math.max(arr.length - 1, 1)) * 100
                            const y = 40 - ((hour.temperature - localMin) / range) * 28
                            return `${x},${y}`
                          }).join(' ')}
                        />
                        {displayedWeather.hourly.map((hour, index, arr) => {
                          const values = arr.map((entry) => entry.temperature)
                          const localMin = Math.min(...values)
                          const localMax = Math.max(...values)
                          const range = Math.max(localMax - localMin, 1)
                          const x = (index / Math.max(arr.length - 1, 1)) * 100
                          const y = 40 - ((hour.temperature - localMin) / range) * 28
                          const isAnchor = index % 2 === 0 || index === arr.length - 1
                          const isNow = index === 0
                          return isAnchor ? <circle key={hour.time} cx={x} cy={y} r={isNow ? '2.5' : '1.8'} className={`forecast-point-dot ${isNow ? 'forecast-point-dot-now' : ''}`} /> : null
                        })}
                      </svg>
                      <div className="forecast-x-axis" aria-hidden="true">
                        {displayedWeather.hourly.filter((_, index) => index % 2 === 0 || index === displayedWeather.hourly.length - 1).map((hour) => (
                          <span key={hour.time}>{formatHourLabel(hour.time)}</span>
                        ))}
                      </div>
                    </div>
                    <div className="forecast-rain-axis" aria-hidden="true">
                      <span>100%</span>
                      <span>50%</span>
                      <span>0%</span>
                    </div>
                  </div>
                )
              })()}
              <div className="forecast-legend-row">
                <span><i className="legend-swatch legend-swatch-temp"></i>Temperature</span>
                <span><i className="legend-swatch legend-swatch-rain"></i>Rain chance</span>
                {bestOutdoorWindow ? (
                  <span><i className="legend-swatch legend-swatch-best"></i>Best window around {bestOutdoorWindow.label}</span>
                ) : null}
              </div>
              {bestOutdoorWindow ? (
                <div className="best-window-banner">
                  <strong>Best outdoor window:</strong> around {bestOutdoorWindow.label} · {bestOutdoorWindow.temperature}° · {bestOutdoorWindow.rain}% rain chance
                </div>
              ) : null}
              <div className="forecast-axis-row compact-forecast-axis-row">
                {displayedWeather.hourly.filter((_, index) => index < 6).map((hour) => (
                  <div key={hour.time} className={`forecast-axis-point ${hour === displayedWeather.hourly[0] ? 'forecast-axis-point-now' : ''}`}>
                    <span>{hour === displayedWeather.hourly[0] ? 'Now' : formatHourLabel(hour.time)}</span>
                    <strong>{Math.round(hour.temperature)}°</strong>
                    <small>{Math.round(hour.precipitationProbability)}% rain</small>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card weekly-card mobile-priority-7">
            <div className="card-heading">
              <div>
                <p className="eyebrow">7-day</p>
                <h2>Week ahead</h2>
              </div>
            </div>
            <div className="weekly-summary-banner">{weeklySummary}</div>
            <div className="weekly-scroll-row">
              {(() => {
                const maxTemp = Math.max(...displayedWeather.daily.map((day) => day.temperatureMax))
                const minTemp = Math.min(...displayedWeather.daily.map((day) => day.temperatureMin))
                const tempRange = Math.max(maxTemp - minTemp, 1)
                const warmestDate = displayedWeather.daily.reduce((best, day) => day.temperatureMax > best.temperatureMax ? day : best, displayedWeather.daily[0]).date
                const wettestDate = displayedWeather.daily.reduce((best, day) => day.precipitationProbabilityMax > best.precipitationProbabilityMax ? day : best, displayedWeather.daily[0]).date
                const easiestDate = displayedWeather.daily.reduce((best, day) => day.precipitationProbabilityMax < best.precipitationProbabilityMax ? day : best, displayedWeather.daily[0]).date

                return displayedWeather.daily.map((day, index) => {
                  const left = ((day.temperatureMin - minTemp) / tempRange) * 100
                  const width = ((day.temperatureMax - day.temperatureMin) / tempRange) * 100
                  const badge = day.date === warmestDate
                    ? { label: 'Warmest', className: 'week-badge-warmest' }
                    : day.date === wettestDate
                      ? { label: 'Wettest', className: 'week-badge-wettest' }
                      : day.date === easiestDate
                        ? { label: 'Best day', className: 'week-badge-best' }
                        : null

                  const tileClass = day.weatherCode === 0
                    ? 'week-tile week-tile-sunny'
                    : day.precipitationProbabilityMax >= 50
                      ? 'week-tile week-tile-rainy'
                      : 'week-tile week-tile-mild'

                  return (
                    <article key={day.date} className={`${tileClass} ${index === 0 ? 'week-tile-today' : ''}`}>
                      <div className="week-tile-top">
                        <strong>{formatPriorityDayLabel(day.date, index)}</strong>
                        {badge ? <div className={`week-badge ${badge.className}`}>{badge.label}</div> : null}
                      </div>
                      <div className="week-tile-icon">{weatherCodeToIcon(day.weatherCode)}</div>
                      <p className="week-tile-condition">{weatherCodeToLabel(day.weatherCode)}</p>
                      <div className="week-tile-cue">
                        {badge?.label ?? (day.precipitationProbabilityMax >= 50 ? 'Rain risk' : day.weatherCode === 0 ? 'Bright day' : 'Steady day')}
                      </div>
                      <div className="week-range-block">
                        <div className="week-range-track">
                          <div className="week-range-fill" style={{ left: `${left}%`, width: `${Math.max(width, 12)}%` }}></div>
                        </div>
                        <div className="week-range-labels">
                          <span>{Math.round(day.temperatureMin)}°</span>
                          <strong>{Math.round(day.temperatureMax)}°</strong>
                        </div>
                      </div>
                      <div className="week-tile-rain">💧 {Math.round(day.precipitationProbabilityMax)}% rain</div>
                    </article>
                  )
                })
              })()}
            </div>
          </section>
        </>
      ) : activeTab === 'current' ? (
        <section className="card empty-state">
          <p className="eyebrow">Current location</p>
          <h2>Current location status</h2>
          <p>{currentStatus}</p>
        </section>
      ) : activeTab === 'search' ? (
        <section className="card empty-state search-state">
          <p className="eyebrow">Search</p>
          <h2>ZIP and place search</h2>
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Enter ZIP or city"
            />
            <button type="submit">{searching ? 'Searching…' : 'Search'}</button>
          </form>
          <div className="search-results">
            {searchResults.length === 0 ? (
              <p>Search for a ZIP code or place name to load weather.</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="search-result"
                  onClick={() => handleSelectSearchResult(result)}
                >
                  <strong>{result.label}</strong>
                  <span>{result.subtitle}</span>
                </button>
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="card empty-state">
          <p className="eyebrow">Weather status</p>
          <h2>{error ? 'Unable to load weather' : 'Loading weather…'}</h2>
          <p>{error ?? 'Fetching live weather data from Open-Meteo.'}</p>
        </section>
      )}
    </main>
  )
}

export default App
