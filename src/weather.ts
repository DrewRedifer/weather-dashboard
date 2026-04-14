export type SavedLocationId = 'home' | 'work' | 'current' | 'search'

export type WeatherLocation = {
  id: SavedLocationId | string
  label: string
  subtitle: string
  latitude: number
  longitude: number
  timezone: string
}

export type RadarFrame = {
  host: string
  path: string
}

export type BeachSnapshot = {
  waterTemperature: number | null
  waveHeight: number | null
  wavePeriod: number | null
  tidePoints?: Array<{ time: string; value: number; type?: string; rawTime?: string }>
  nextHigh?: { time: string; value: number; rawTime?: string } | null
  nextLow?: { time: string; value: number; rawTime?: string } | null
}

export type WeatherSnapshot = {
  current: {
    temperature: number
    apparentTemperature: number
    windSpeed: number
    windDirection: number
    weatherCode: number
    isDay: number
    humidity: number
    precipitationProbability: number
    time: string
  }
  daily: Array<{
    date: string
    weatherCode: number
    temperatureMax: number
    temperatureMin: number
    precipitationProbabilityMax: number
    sunrise: string
    sunset: string
  }>
  hourly: Array<{
    time: string
    temperature: number
    precipitationProbability: number
    weatherCode: number
  }>
}

export const savedLocations: WeatherLocation[] = [
  {
    id: 'home',
    label: 'Home',
    subtitle: 'Indian Harbour Beach, FL',
    latitude: 28.1486,
    longitude: -80.5887,
    timezone: 'America/New_York',
  },
  {
    id: 'work',
    label: 'Work',
    subtitle: 'Palm Bay, FL',
    latitude: 28.0345,
    longitude: -80.5887,
    timezone: 'America/New_York',
  },
]

export async function fetchWeather(location: WeatherLocation): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'relative_humidity_2m',
      'precipitation_probability',
      'is_day',
    ].join(','),
    hourly: ['temperature_2m', 'precipitation_probability', 'weather_code'].join(','),
    daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'sunrise', 'sunset'].join(','),
    forecast_days: '7',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`)
  }

  const data = await response.json()

  const current = {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day,
    humidity: data.current.relative_humidity_2m,
    precipitationProbability: data.current.precipitation_probability ?? 0,
    time: data.current.time,
  }

  const daily = data.daily.time.map((date: string, index: number) => ({
    date,
    weatherCode: data.daily.weather_code[index],
    temperatureMax: data.daily.temperature_2m_max[index],
    temperatureMin: data.daily.temperature_2m_min[index],
    precipitationProbabilityMax: data.daily.precipitation_probability_max[index],
    sunrise: data.daily.sunrise[index],
    sunset: data.daily.sunset[index],
  }))

  const currentHour = new Date().getHours()
  const hourly = data.hourly.time
    .map((time: string, index: number) => ({
      time,
      temperature: data.hourly.temperature_2m[index],
      precipitationProbability: data.hourly.precipitation_probability[index],
      weatherCode: data.hourly.weather_code[index],
    }))
    .slice(currentHour, currentHour + 12)

  return { current, daily, hourly }
}

export function weatherCodeToLabel(code: number) {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    56: 'Freezing drizzle',
    57: 'Heavy freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Rain showers',
    81: 'Moderate showers',
    82: 'Heavy showers',
    85: 'Snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm and hail',
    99: 'Severe thunderstorm',
  }

  return map[code] ?? 'Weather unavailable'
}

export function weatherCodeToIcon(code: number, isDay = 1) {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if ([1, 2].includes(code)) return isDay ? '🌤️' : '🌙'
  if (code === 3) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '⛅'
}

export function formatHourLabel(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: 'numeric' })
}

export function formatDayLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString([], { weekday: 'short' })
}

export function formatPriorityDayLabel(value: string, index: number) {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  return formatDayLabel(value)
}

export function buildWeeklySummary(daily: WeatherSnapshot['daily']) {
  if (!daily.length) {
    return 'Weekly outlook unavailable.'
  }

  const warmest = daily.reduce((best, day) => (day.temperatureMax > best.temperatureMax ? day : best), daily[0])
  const wettest = daily.reduce((best, day) => (day.precipitationProbabilityMax > best.precipitationProbabilityMax ? day : best), daily[0])
  const calmest = daily.reduce((best, day) => (day.precipitationProbabilityMax < best.precipitationProbabilityMax ? day : best), daily[0])

  return `${formatDayLabel(warmest.date)} looks warmest, ${formatDayLabel(wettest.date)} has the highest rain risk, and ${formatDayLabel(calmest.date)} looks like the easiest outdoor day.`
}

export function windDirectionLabel(degrees: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

export async function fetchRadarFrame(): Promise<RadarFrame> {
  const response = await fetch('https://api.rainviewer.com/public/weather-maps.json')

  if (!response.ok) {
    throw new Error(`Radar request failed: ${response.status}`)
  }

  const data = await response.json()
  const latestFrame = data?.radar?.past?.at(-1)

  if (!latestFrame?.path || !data?.host) {
    throw new Error('No radar frame available')
  }

  return {
    host: data.host,
    path: latestFrame.path,
  }
}

export async function searchLocations(query: string) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  })

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
  )

  if (!response.ok) {
    throw new Error(`Location search failed: ${response.status}`)
  }

  const data = await response.json()

  return (data.results ?? []).map((result: any, index: number) => ({
    id: `search-${index}-${result.latitude}-${result.longitude}`,
    label: result.name,
    subtitle: [result.admin1, result.country].filter(Boolean).join(', '),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone ?? 'America/New_York',
  })) as WeatherLocation[]
}

export async function fetchBeachSnapshot(latitude: number, longitude: number) {
  const marineParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: ['wave_height', 'wave_period', 'sea_surface_temperature'].join(','),
    forecast_days: '1',
    timezone: 'America/New_York',
    temperature_unit: 'fahrenheit',
  })

  const marineResponse = await fetch(`https://marine-api.open-meteo.com/v1/marine?${marineParams.toString()}`)

  if (!marineResponse.ok) {
    throw new Error(`Beach request failed: ${marineResponse.status}`)
  }

  const marineData = await marineResponse.json()
  const hour = new Date().getHours()

  let tidePoints: Array<{ time: string; value: number; type?: string }> = []

  let hiloPoints: Array<{ time: string; value: number; type?: string }> = []

  try {
    const hiloResponse = await fetch('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=weather-dashboard&date=today&datum=MLLW&station=8721604&time_zone=lst_ldt&units=english&interval=hilo&format=json')
    if (hiloResponse.ok) {
      const hiloData = await hiloResponse.json()
      hiloPoints = (hiloData?.predictions ?? []).map((point: any) => ({
        time: point.t,
        value: Number(point.v),
        type: point.type,
      }))
    }
  } catch {
    hiloPoints = []
  }

  if (hiloPoints.length >= 2) {
    const expanded: Array<{ time: string; value: number; type?: string; rawTime?: string }> = []
    for (let i = 0; i < hiloPoints.length - 1; i += 1) {
      const start = hiloPoints[i]
      const end = hiloPoints[i + 1]
      const startTime = new Date(start.time.replace(' ', 'T')).getTime()
      const endTime = new Date(end.time.replace(' ', 'T')).getTime()
      const steps = 6

      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps
        const eased = (1 - Math.cos(Math.PI * t)) / 2
        const value = start.value + (end.value - start.value) * eased
        const timeMs = startTime + (endTime - startTime) * t
        const iso = new Date(timeMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        expanded.push({
          time: iso,
          rawTime: new Date(timeMs).toISOString(),
          value,
          type: step === 0 ? start.type : step === steps ? end.type : undefined,
        })
      }
    }
    tidePoints = expanded
  } else {
    tidePoints = hiloPoints.map((point) => ({
      time: new Date(point.time.replace(' ', 'T')).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      rawTime: new Date(point.time.replace(' ', 'T')).toISOString(),
      value: point.value,
      type: point.type,
    }))
  }

  const now = Date.now()
  const upcomingHigh = hiloPoints.find((point) => point.type === 'H' && new Date(point.time.replace(' ', 'T')).getTime() >= now) ?? null
  const upcomingLow = hiloPoints.find((point) => point.type === 'L' && new Date(point.time.replace(' ', 'T')).getTime() >= now) ?? null
  const fallbackHigh = hiloPoints.find((point) => point.type === 'H') ?? null
  const fallbackLow = hiloPoints.find((point) => point.type === 'L') ?? null

  const selectedHigh = upcomingHigh ?? fallbackHigh
  const selectedLow = upcomingLow ?? fallbackLow

  const nextHigh = selectedHigh
    ? {
        ...selectedHigh,
        time: new Date(selectedHigh.time.replace(' ', 'T')).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        rawTime: new Date(selectedHigh.time.replace(' ', 'T')).toISOString(),
      }
    : null
  const nextLow = selectedLow
    ? {
        ...selectedLow,
        time: new Date(selectedLow.time.replace(' ', 'T')).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        rawTime: new Date(selectedLow.time.replace(' ', 'T')).toISOString(),
      }
    : null

  return {
    waterTemperature: marineData?.hourly?.sea_surface_temperature?.[hour] ?? null,
    waveHeight: marineData?.hourly?.wave_height?.[hour] ?? null,
    wavePeriod: marineData?.hourly?.wave_period?.[hour] ?? null,
    tidePoints,
    nextHigh,
    nextLow,
  } as BeachSnapshot
}

export function formatTimeLabel(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function getDaylightProgress(nowValue: string, sunriseValue: string, sunsetValue: string) {
  const now = new Date(nowValue).getTime()
  const sunrise = new Date(sunriseValue).getTime()
  const sunset = new Date(sunsetValue).getTime()

  if (Number.isNaN(now) || Number.isNaN(sunrise) || Number.isNaN(sunset) || sunset <= sunrise) {
    return 0
  }

  if (now <= sunrise) {
    return 0
  }

  if (now >= sunset) {
    return 100
  }

  return ((now - sunrise) / (sunset - sunrise)) * 100
}

export function getDaylightWindowState(nowValue: string, sunriseValue: string, sunsetValue: string) {
  const now = new Date(nowValue).getTime()
  const sunrise = new Date(sunriseValue).getTime()
  const sunset = new Date(sunsetValue).getTime()

  if (Number.isNaN(now) || Number.isNaN(sunrise) || Number.isNaN(sunset)) {
    return 'unknown'
  }

  if (now < sunrise) return 'before-sunrise'
  if (now > sunset) return 'after-sunset'
  return 'daylight'
}

export function getDaylightStatus(nowValue: string, sunriseValue: string, sunsetValue: string) {
  const now = new Date(nowValue).getTime()
  const sunrise = new Date(sunriseValue).getTime()
  const sunset = new Date(sunsetValue).getTime()

  if (Number.isNaN(now) || Number.isNaN(sunrise) || Number.isNaN(sunset)) {
    return 'Daylight status unavailable'
  }

  if (now < sunrise) {
    const minutes = Math.max(0, Math.round((sunrise - now) / 60000))
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return hours > 0 ? `Sunrise in ${hours}h ${remainder}m` : `Sunrise in ${remainder}m`
  }

  if (now > sunset) {
    const minutes = Math.max(0, Math.round((now - sunset) / 60000))
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return hours > 0 ? `Sunset was ${hours}h ${remainder}m ago` : `Sunset was ${remainder}m ago`
  }

  const minutes = Math.max(0, Math.round((sunset - now) / 60000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours > 0 ? `${hours}h ${remainder}m until sunset` : `${remainder}m until sunset`
}

export function formatDaylightDuration(sunriseValue: string, sunsetValue: string) {
  const sunrise = new Date(sunriseValue).getTime()
  const sunset = new Date(sunsetValue).getTime()

  if (Number.isNaN(sunrise) || Number.isNaN(sunset) || sunset <= sunrise) {
    return '—'
  }

  const totalMinutes = Math.round((sunset - sunrise) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m daylight`
}

export function buildSmartSummary(snapshot: WeatherSnapshot, beach?: BeachSnapshot | null) {
  const today = snapshot.daily[0]
  const rainSoon = snapshot.hourly.find((hour) => hour.precipitationProbability >= 50)

  if (rainSoon) {
    return `Heads up: rain is the next meaningful weather move, with the best shower chance around ${formatHourLabel(rainSoon.time)}.`
  }

  if (beach && (beach.waveHeight ?? 0) < 2.5 && snapshot.current.windSpeed < 12) {
    return 'This looks like a genuinely nice beach window: lighter surf, manageable wind, and no obvious rain threat in the next few hours.'
  }

  if (snapshot.current.temperature >= 78 && snapshot.current.precipitationProbability < 30) {
    return 'Pretty friendly weather right now — warm, comfortable, and good for a walk or being outside.'
  }

  return `Today stays ${weatherCodeToLabel(today?.weatherCode ?? snapshot.current.weatherCode).toLowerCase()} with highs near ${Math.round(today?.temperatureMax ?? snapshot.current.temperature)}°.`
}

export function getTideTrendLabel(tidePoints?: BeachSnapshot['tidePoints']) {
  if (!tidePoints || tidePoints.length < 2) {
    return 'Tide status unavailable'
  }

  const first = tidePoints[0]
  const second = tidePoints[1]
  if (second.value > first.value) return 'Rising tide'
  if (second.value < first.value) return 'Falling tide'
  return 'Tide holding steady'
}

export function getCurrentTidePoint(tidePoints?: BeachSnapshot['tidePoints']) {
  if (!tidePoints?.length) return null

  const now = Date.now()
  let closest = tidePoints[0]
  let closestDelta = Number.POSITIVE_INFINITY

  for (const point of tidePoints) {
    const parsed = new Date(point.rawTime ?? point.time).getTime()
    if (Number.isNaN(parsed)) continue
    const delta = Math.abs(parsed - now)
    if (delta < closestDelta) {
      closest = point
      closestDelta = delta
    }
  }

  return closest
}

export function getLabeledTidePoints(tidePoints?: BeachSnapshot['tidePoints']) {
  if (!tidePoints?.length) return []

  const seen = new Set<string>()
  return tidePoints.filter((point) => {
    if (!(point.type === 'H' || point.type === 'L')) return false
    const key = `${point.type}-${point.time}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildBeachHeadline(snapshot: WeatherSnapshot, beach?: BeachSnapshot | null) {
  if (!beach) {
    return {
      title: 'Beach read unavailable',
      detail: 'Marine and tide data are not available right now.',
    }
  }

  const waveHeight = beach.waveHeight ?? 0
  const wind = snapshot.current.windSpeed
  const rainRisk = Math.max(...snapshot.hourly.slice(0, 6).map((hour) => hour.precipitationProbability))

  if (waveHeight < 2.5 && wind < 12 && rainRisk < 35) {
    return {
      title: 'A very inviting beach window',
      detail: 'Lighter surf, easier wind, and low near-term rain risk.'
    }
  }

  if (waveHeight < 4 && wind < 18 && rainRisk < 60) {
    return {
      title: 'Decent beach conditions',
      detail: 'Still workable for a visit, though a bit choppier and less comfortable than an ideal beach window.'
    }
  }

  return {
    title: 'More watch-the-water than jump-in weather',
    detail: 'Rougher surf, stronger wind, or rising rain risk make this a less comfortable beach setup.'
  }
}

export function getBestOutdoorWindow(hourly: WeatherSnapshot['hourly']) {
  const bestHour = hourly.reduce((best, hour) => {
    const score = hour.temperature - hour.precipitationProbability * 0.35
    if (!best || score > best.score) {
      return { hour, score }
    }
    return best
  }, null as { hour: WeatherSnapshot['hourly'][number], score: number } | null)

  if (!bestHour) {
    return null
  }

  return {
    label: formatHourLabel(bestHour.hour.time),
    temperature: Math.round(bestHour.hour.temperature),
    rain: Math.round(bestHour.hour.precipitationProbability),
  }
}

export function buildHeroMood(snapshot: WeatherSnapshot, beach?: BeachSnapshot | null) {
  const rainSoon = snapshot.hourly.find((hour) => hour.precipitationProbability >= 50)
  const waveHeight = beach?.waveHeight ?? null

  if (rainSoon) {
    return {
      title: 'Rain may steal the spotlight later',
      detail: `Best dry window is before ${formatHourLabel(rainSoon.time)}.`
    }
  }

  if (waveHeight !== null && waveHeight < 2.5 && snapshot.current.windSpeed < 12) {
    return {
      title: 'A really solid Florida weather window',
      detail: 'Warm air, manageable wind, and friendly beach conditions.'
    }
  }

  if (snapshot.current.temperature >= 78 && snapshot.current.precipitationProbability < 30) {
    return {
      title: 'Pretty ideal for being outside',
      detail: 'Comfortable warmth without an obvious rain problem right now.'
    }
  }

  return {
    title: weatherCodeToLabel(snapshot.current.weatherCode),
    detail: `Feels like ${Math.round(snapshot.current.apparentTemperature)}° with ${Math.round(snapshot.current.windSpeed)} mph wind.`
  }
}

export function buildBeachRecommendation(snapshot: WeatherSnapshot, beach?: BeachSnapshot | null) {
  if (!beach) {
    return {
      title: 'Beach read unavailable',
      detail: 'Marine conditions are not available yet.',
    }
  }

  const waveHeight = beach.waveHeight ?? 0
  const wind = snapshot.current.windSpeed
  const rainRisk = Math.max(...snapshot.hourly.slice(0, 6).map((hour) => hour.precipitationProbability))

  if (waveHeight < 2.5 && wind < 12 && rainRisk < 40) {
    return {
      title: 'Best beach window: now through the next few hours',
      detail: 'Calmer surf, lighter wind, and no major rain signal make this the easiest yes on the dashboard.',
    }
  }

  if (waveHeight < 4 && wind < 18 && rainRisk < 60) {
    return {
      title: 'Beach is fair, but not perfect',
      detail: 'Expect a usable beach window, but with more chop and a little less comfort than the best days.',
    }
  }

  return {
    title: 'Beach is more of a look-don’t-swim setup',
    detail: 'Rougher surf, stronger wind, or building rain make this better for scenery than an easy beach session.',
  }
}

export function buildRainSummary(hourly: WeatherSnapshot['hourly']) {
  const rainyHour = hourly.find((hour) => hour.precipitationProbability >= 40)

  if (!rainyHour) {
    return 'No meaningful rain expected in the next several hours.'
  }

  const label = formatHourLabel(rainyHour.time)

  if (rainyHour.precipitationProbability >= 70) {
    return `Rain looks likely around ${label}.`
  }

  return `A shower chance starts building around ${label}.`
}
