// Atmosly — Phase 4: Open-Meteo weather API integration.

const searchForm = document.querySelector('#search-form');
const cityInput = document.querySelector('#city-input');
const formMessage = document.querySelector('#form-message');

const weatherElements = {
  location: document.querySelector('#location'),
  date: document.querySelector('#date'),
  icon: document.querySelector('#weather-icon'),
  temperature: document.querySelector('#temperature'),
  condition: document.querySelector('#condition'),
  feelsLike: document.querySelector('#feels-like'),
  humidity: document.querySelector('#humidity'),
  wind: document.querySelector('#wind'),
  pressure: document.querySelector('#pressure'),
  visibility: document.querySelector('#visibility')
};

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const LOCATION_CACHE_KEY = 'atmosly-location-cache';
const WEATHER_CACHE_TTL = 5 * 60 * 1000;

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    formMessage.textContent = 'Please enter a city to search.';
    cityInput.focus();
    return;
  }

  setLoadingState(true);
  const requestStartedAt = performance.now();

  try {
    const location = await getLocation(city);
    const weather = await getWeather(location.latitude, location.longitude);

    displayCurrentWeather(location, weather);
    formMessage.textContent = `Weather updated for ${location.name}.`;
  } catch (error) {
    console.error('Atmosly weather request failed:', error);
    formMessage.textContent = error.message;
  } finally {
    setLoadingState(false);
    console.debug(`Atmosly search completed in ${Math.round(performance.now() - requestStartedAt)}ms.`);
  }
});

async function getLocation(city) {
  const normalizedCity = city.toLowerCase();
  const cachedLocation = getCachedLocation(normalizedCity);

  if (cachedLocation) {
    return cachedLocation;
  }

  const params = new URLSearchParams({
    name: city,
    count: '1',
    language: 'en',
    format: 'json'
  });

  const response = await fetch(`${GEOCODING_API}?${params}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Unable to search for that city right now.');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`We could not find a city named "${city}".`);
  }

  const location = data.results[0];
  saveLocation(normalizedCity, location);
  return location;
}

async function getWeather(latitude, longitude) {
  const cacheKey = `weather:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cachedWeather = getCachedWeather(cacheKey);

  if (cachedWeather) {
    return cachedWeather;
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'surface_pressure',
      'visibility'
    ].join(','),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto'
  });

  const response = await fetch(`${WEATHER_API}?${params}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Unable to retrieve weather data right now.');
  }

  const weather = await response.json();
  saveWeather(cacheKey, weather);
  return weather;
}

function displayCurrentWeather(location, weather) {
  const current = weather.current;
  const units = weather.current_units;

  weatherElements.location.textContent = `${location.name}, ${location.country}`;
  weatherElements.date.textContent = formatWeatherDate(current.time, weather.timezone);
  weatherElements.icon.textContent = getWeatherIcon(current.weather_code);
  weatherElements.temperature.textContent = `${Math.round(current.temperature_2m)}°`;
  weatherElements.condition.textContent = getWeatherCondition(current.weather_code);
  weatherElements.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;
  weatherElements.humidity.textContent = `${current.relative_humidity_2m}${units.relative_humidity_2m}`;
  weatherElements.wind.textContent = `${Math.round(current.wind_speed_10m)} ${units.wind_speed_10m}`;
  weatherElements.pressure.textContent = `${Math.round(current.surface_pressure)} ${units.surface_pressure}`;
  weatherElements.visibility.textContent = `${formatVisibility(current.visibility)} ${units.visibility}`;
}

function setLoadingState(isLoading) {
  const button = searchForm.querySelector('button');

  button.disabled = isLoading;
  button.textContent = isLoading ? 'Searching...' : 'Search';
  cityInput.disabled = isLoading;

  if (isLoading) {
    formMessage.textContent = 'Fetching the latest weather data...';
  }
}

function getCachedLocation(city) {
  try {
    const cache = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || '{}');
    return cache[city] || null;
  } catch {
    return null;
  }
}

function saveLocation(city, location) {
  try {
    const cache = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || '{}');
    cache[city] = location;
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors and continue with the API result.
  }
}

function getCachedWeather(cacheKey) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');

    if (!cached || Date.now() - cached.timestamp > WEATHER_CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function saveWeather(cacheKey, weather) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: weather
    }));
  } catch {
    // Ignore storage errors and continue normally.
  }
}

function formatWeatherDate(dateTime, timezone) {
  const date = new Date(dateTime);

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  }).format(date);
}

function formatVisibility(meters) {
  return (meters / 1000).toFixed(1);
}

function getWeatherCondition(code) {
  const conditions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };

  return conditions[code] || 'Unknown conditions';
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if ([3, 45, 48].includes(code)) return '☁️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
  if ([95, 96, 99].includes(code)) return '⛈️';

  return '🌤️';
}

// Keep the initial page date current until the first API result is displayed.
weatherElements.date.textContent = formatWeatherDate(new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone);
