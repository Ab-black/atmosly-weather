// Atmosly — Phase 12: weather-responsive visual atmosphere.

const searchForm = document.querySelector('#search-form');
const cityInput = document.querySelector('#city-input');
const formMessage = document.querySelector('#form-message');
const suggestionsBox = document.querySelector('#location-suggestions');

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
  visibility: document.querySelector('#visibility'),
  forecast: document.querySelector('#forecast-list')
};

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const LOCATION_CACHE_KEY = 'atmosly-location-cache';
const WEATHER_CACHE_TTL = 5 * 60 * 1000;
const SUGGESTION_DELAY = 300;
const MAX_SUGGESTIONS = 5;
const FORECAST_DAYS = 5;

let selectedLocation = null;
let suggestionRequestId = 0;
let suggestionTimer = null;
let activeSuggestionIndex = -1;

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    closeSuggestions();
    formMessage.textContent = 'Please enter a city name.';
    cityInput.focus();
    return;
  }

  closeSuggestions();
  setLoadingState(true);
  const requestStartedAt = performance.now();

  try {
    const location = selectedLocation && normalizeLocationName(selectedLocation).toLowerCase() === city.toLowerCase()
      ? selectedLocation
      : await getLocation(city);
    const weather = await getWeather(location.latitude, location.longitude, true);

    selectedLocation = location;
    displayWeather(location, weather);
    formMessage.textContent = `Weather updated for ${location.name}.`;
  } catch (error) {
    console.error('Atmosly weather request failed:', error);
    formMessage.textContent = getUserFacingError(error);
  } finally {
    setLoadingState(false);
    console.debug(`Atmosly search completed in ${Math.round(performance.now() - requestStartedAt)}ms.`);
  }
});

cityInput.addEventListener('input', () => {
  selectedLocation = null;
  activeSuggestionIndex = -1;

  clearTimeout(suggestionTimer);

  const query = cityInput.value.trim();

  if (query.length < 2) {
    closeSuggestions();
    return;
  }

  suggestionTimer = setTimeout(() => fetchLocationSuggestions(query), SUGGESTION_DELAY);
});

cityInput.addEventListener('keydown', (event) => {
  const options = getSuggestionOptions();

  if (!options.length || !suggestionsBox.classList.contains('is-visible')) {
    if (event.key === 'Escape') closeSuggestions();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % options.length;
    updateActiveSuggestion(options);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestionIndex = activeSuggestionIndex <= 0 ? options.length - 1 : activeSuggestionIndex - 1;
    updateActiveSuggestion(options);
  } else if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
    event.preventDefault();
    selectLocation(options[activeSuggestionIndex].location);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeSuggestions();
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.search-wrap')) {
    closeSuggestions();
  }
});

async function fetchLocationSuggestions(query) {
  const requestId = ++suggestionRequestId;

  try {
    const locations = await searchLocations(query, MAX_SUGGESTIONS);

    if (requestId !== suggestionRequestId || cityInput.value.trim() !== query) {
      return;
    }

    renderLocationSuggestions(locations);
  } catch (error) {
    if (requestId === suggestionRequestId) {
      closeSuggestions();
      console.debug('Atmosly location suggestions unavailable:', error.message);
    }
  }
}

async function searchLocations(query, count = 1) {
  const params = new URLSearchParams({
    name: query,
    count: String(count),
    language: 'en',
    format: 'json'
  });

  let response;

  try {
    response = await fetch(`${GEOCODING_API}?${params}`, {
      headers: { Accept: 'application/json' }
    });
  } catch (error) {
    const networkError = new Error('Geocoding request failed.');
    networkError.code = 'network_failure';
    throw networkError;
  }

  if (!response.ok) {
    const apiError = new Error('Geocoding API request failed.');
    apiError.code = 'api_failure';
    throw apiError;
  }

  try {
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    const responseError = new Error('Invalid geocoding response.');
    responseError.code = 'api_failure';
    throw responseError;
  }
}

function renderLocationSuggestions(locations) {
  if (!locations.length) {
    closeSuggestions();
    return;
  }

  suggestionsBox.innerHTML = locations.map((location, index) => {
    const meta = [location.admin1, location.country].filter(Boolean).join(', ');

    return `
      <button class="location-suggestion" type="button" role="option" aria-selected="false" data-suggestion-index="${index}">
        <span class="suggestion-icon" aria-hidden="true">⌖</span>
        <span class="suggestion-copy">
          <span class="suggestion-name">${escapeHtml(location.name)}</span>
          <span class="suggestion-meta">${escapeHtml(meta)}</span>
        </span>
      </button>
    `;
  }).join('');

  suggestionsBox.querySelectorAll('.location-suggestion').forEach((button, index) => {
    button.location = locations[index];
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      selectLocation(locations[index]);
    });
  });

  suggestionsBox.classList.add('is-visible');
  cityInput.setAttribute('aria-expanded', 'true');
}

function selectLocation(location) {
  selectedLocation = location;
  cityInput.value = normalizeLocationName(location);
  closeSuggestions();
  loadWeatherForLocation(location);
}

async function loadWeatherForLocation(location) {
  setLoadingState(true);
  const requestStartedAt = performance.now();

  try {
    const weather = await getWeather(location.latitude, location.longitude, true);
    displayWeather(location, weather);
    formMessage.textContent = `Weather updated for ${location.name}.`;
  } catch (error) {
    console.error('Atmosly weather request failed:', error);
    formMessage.textContent = getUserFacingError(error);
  } finally {
    setLoadingState(false);
    console.debug(`Atmosly search completed in ${Math.round(performance.now() - requestStartedAt)}ms.`);
  }
}

async function getLocation(city) {
  const normalizedCity = city.toLowerCase();
  const cachedLocation = getCachedLocation(normalizedCity);

  if (cachedLocation) {
    return cachedLocation;
  }

  const locations = await searchLocations(city, 1);

  if (!locations.length) {
    const notFoundError = new Error('City not found.');
    notFoundError.code = 'city_not_found';
    throw notFoundError;
  }

  const location = locations[0];
  saveLocation(normalizedCity, location);
  return location;
}

async function getWeather(latitude, longitude, forceRefresh = false) {
  const cacheKey = `weather:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cachedWeather = forceRefresh ? null : getCachedWeather(cacheKey);

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
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min'
    ].join(','),
    forecast_days: String(FORECAST_DAYS),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto'
  });

  let response;

  try {
    response = await fetch(`${WEATHER_API}?${params}`, {
      headers: { Accept: 'application/json' }
    });
  } catch (error) {
    const networkError = new Error('Weather request failed.');
    networkError.code = 'network_failure';
    throw networkError;
  }

  if (!response.ok) {
    const apiError = new Error('Weather API request failed.');
    apiError.code = 'api_failure';
    throw apiError;
  }

  let weather;

  try {
    weather = await response.json();
  } catch (error) {
    const responseError = new Error('Invalid weather response.');
    responseError.code = 'api_failure';
    throw responseError;
  }

  if (!weather.current || !weather.current_units || !weather.daily) {
    const dataError = new Error('Incomplete weather response.');
    dataError.code = 'api_failure';
    throw dataError;
  }

  saveWeather(cacheKey, weather);
  return weather;
}

function getUserFacingError(error) {
  switch (error?.code) {
    case 'city_not_found':
      return 'City not found. Please check the spelling and try again.';
    case 'network_failure':
    case 'api_failure':
      return 'Unable to fetch weather data. Please check your connection and try again.';
    default:
      return 'Unable to fetch weather data. Please check your connection and try again.';
  }
}

function displayWeather(location, weather) {
  displayCurrentWeather(location, weather);
  displayForecast(weather);
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
  applyWeatherAtmosphere(current.weather_code);
}

function displayForecast(weather) {
  const daily = weather.daily;

  if (!daily || !daily.time || !daily.time.length) {
    weatherElements.forecast.innerHTML = '';
    return;
  }

  const cards = daily.time.slice(0, FORECAST_DAYS).map((date, index) => {
    const weatherCode = daily.weather_code[index];
    const max = Math.round(daily.temperature_2m_max[index]);
    const min = Math.round(daily.temperature_2m_min[index]);
    const dayLabel = index === 0 ? 'Today' : formatForecastDate(date, weather.timezone);

    return `
      <article class="forecast-card${index === 0 ? ' featured' : ''}">
        <span class="forecast-day">${escapeHtml(dayLabel)}</span>
        <span class="forecast-icon" aria-hidden="true">${getWeatherIcon(weatherCode)}</span>
        <strong>${max}° / ${min}°</strong>
        <span class="forecast-condition">${escapeHtml(getWeatherCondition(weatherCode))}</span>
      </article>
    `;
  }).join('');

  weatherElements.forecast.innerHTML = cards;
}

function applyWeatherAtmosphere(code) {
  const atmosphere = getWeatherAtmosphere(code);
  document.body.dataset.weather = atmosphere;
}

function getWeatherAtmosphere(code) {
  if (code === 0) return 'clear';
  if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloudy';
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

function closeSuggestions() {
  suggestionRequestId += 1;
  suggestionsBox.classList.remove('is-visible');
  suggestionsBox.innerHTML = '';
  cityInput.setAttribute('aria-expanded', 'false');
  activeSuggestionIndex = -1;
}

function getSuggestionOptions() {
  return [...suggestionsBox.querySelectorAll('.location-suggestion')].map((button) => ({
    button,
    location: button.location
  }));
}

function updateActiveSuggestion(options) {
  options.forEach((option, index) => {
    const isActive = index === activeSuggestionIndex;
    option.button.classList.toggle('is-active', isActive);
    option.button.setAttribute('aria-selected', String(isActive));
  });
}

function normalizeLocationName(location) {
  return location.name || '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function formatForecastDate(dateTime, timezone) {
  const date = new Date(`${dateTime}T12:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone
  }).format(date);
}

function formatVisibility(meters) {
  return (meters / 1000).toFixed(1);
}

function getWeatherCondition(code) {
  const conditions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 66: 'Light freezing rain',
    67: 'Heavy freezing rain', 71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers',
    82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
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

weatherElements.date.textContent = formatWeatherDate(
  new Date().toISOString(),
  Intl.DateTimeFormat().resolvedOptions().timeZone
);
