// Atmosly — application logic will be connected to the weather API in Phase 4.

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
  visibility: document.querySelector('#visibility'),
  forecast: document.querySelector('#forecast-list')
};

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    formMessage.textContent = 'Please enter a city to search.';
    cityInput.focus();
    return;
  }

  formMessage.textContent = `Ready to fetch weather for ${city}.`;
});

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

weatherElements.date.textContent = formatDate(new Date());
