# Atmosly — Weather Forecast Website

Atmosly is a responsive weather forecast website that lets users search for locations and view current weather conditions and a five-day forecast in a clean, modern interface.

## Live Demo

**[Open Atmosly](https://ab-black.github.io/atmosly-weather/)**

## Features

- Search for cities and locations around the world.
- Location suggestions while typing.
- Current temperature and weather condition.
- Weather icon based on the returned weather condition.
- Feels-like temperature.
- Humidity, wind speed, atmospheric pressure, and visibility.
- Dynamic five-day weather forecast.
- Live weather updates without reloading the page.
- Loading state while weather data is being requested.
- Clear messages for empty searches, invalid locations, and request failures.
- Weather-responsive visual atmosphere for clear, cloudy, rainy, stormy, and snowy conditions.
- Keyboard-friendly location suggestions and accessible form controls.
- Responsive layout for desktop, tablet, and mobile screens.

## Technologies Used

- **HTML5** — semantic page structure and accessible form markup.
- **CSS3** — responsive layout, visual design, animations, transitions, and weather-responsive styling.
- **JavaScript (ES6+)** — application logic, API requests, JSON processing, DOM updates, caching, autocomplete, loading states, and error handling.
- **Fetch API** — communicates with the weather and geocoding services.
- **JSON** — processes location, current weather, and forecast responses.
- **Git & GitHub** — source control and project hosting.
- **GitHub Pages** — deployment of the live website.

## Weather API

Atmosly uses **Open-Meteo** for weather and location data.

Two Open-Meteo services are used:

1. **Geocoding API** — converts the user's location search into matching locations and geographic coordinates.
2. **Weather Forecast API** — uses those coordinates to retrieve current weather conditions and a five-day forecast.

Open-Meteo does not require an API key for the non-commercial use case used by this project.

- Geocoding: https://geocoding-api.open-meteo.com/v1/search
- Weather Forecast: https://api.open-meteo.com/v1/forecast
- Documentation: https://open-meteo.com/en/docs

## How Atmosly Works

The application follows this flow:

```text
User enters a location
        ↓
Location suggestions appear
        ↓
JavaScript sends the search to Open-Meteo Geocoding API
        ↓
Matching location + latitude/longitude are returned
        ↓
JavaScript sends the coordinates to the Weather Forecast API
        ↓
Weather data is returned as JSON
        ↓
JavaScript processes the JSON response
        ↓
Current weather + five-day forecast are rendered
        ↓
The interface updates without a page reload
```

For repeated searches, Atmosly also uses client-side caching to reduce unnecessary location and weather requests. Explicit user searches request fresh weather data.

## Project Structure

```text
atmosly-weather/
├── index.html
├── style.css
├── script.js
├── assets/
│   ├── icons/
│   └── images/
└── README.md
```

The `assets/icons/` and `assets/images/` directories are reserved for project assets as the website continues to evolve.

## How to Run Locally

No build tool or package installation is required.

1. Clone the repository:

```bash
git clone https://github.com/Ab-black/atmosly-weather.git
```

2. Open the project folder:

```bash
cd atmosly-weather
```

3. Open `index.html` in a modern web browser.

For the best local-development experience, you can also serve the folder with a simple local web server such as VS Code Live Server.

## Screenshots

Screenshots can be added here as the project presentation is finalized.

Suggested documentation images:

- Desktop weather interface
- Location autocomplete suggestions
- Dynamic weather results
- Five-day forecast
- Mobile responsive layout

Example Markdown for a future screenshot:

```md
![Atmosly weather interface](assets/images/atmosly-desktop.png)
```

## Accessibility & Usability

Atmosly includes:

- Semantic HTML structure.
- A skip-to-content link.
- Accessible labels and ARIA attributes for the search interface.
- Keyboard navigation for location suggestions.
- Visible focus states.
- Readable text and responsive layouts.
- Clear loading and error messages.
- Touch-friendly controls on smaller screens.
- Reduced-motion support for users who prefer less animation.

## Project Status

The core weather application is implemented, including dynamic city search, live weather data, forecasts, loading states, error handling, responsive design, accessibility refinements, and professional UI enhancements.

## License

This project was created as an internship web development assignment and portfolio project.
