/**
 * Live Weather Dashboard - Core Application Logic
 * Powered by Open-Meteo APIs (Geocoding & Forecast)
 */

// ==========================================================================
// API Constants (Base URLs)
// ==========================================================================
const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";

// LocalStorage key for caching the last searched city
const STORAGE_KEY = "live_weather_dashboard_last_city";

// ==========================================================================
// DOM Elements
// ==========================================================================
const form = document.getElementById("form");
const cityInput = document.getElementById("city");
const searchButton = document.getElementById("search-btn");
const statusElement = document.getElementById("status");
const currentSection = document.getElementById("current");
const forecastSection = document.getElementById("forecast");

// ==========================================================================
// Weather Code Mapping
// Plain text labels mapping Open-Meteo WMO weather codes (no emojis)
// ==========================================================================
const weatherCodes = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Drizzle",
  57: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Rain",
  66: "Rain",
  67: "Rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  77: "Snow",
  80: "Showers",
  81: "Showers",
  82: "Showers",
  85: "Snow",
  86: "Snow",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm"
};

/**
 * Returns a human-readable weather label for an Open-Meteo weather code.
 * Falls back to "Unknown" if the code is not in the dictionary.
 */
function getWeatherLabel(code) {
  return weatherCodes[code] || "Unknown";
}

// ==========================================================================
// API Functions: findCity & getWeather
// ==========================================================================

/**
 * findCity(name)
 * Converts a city name into geographical coordinates using Open-Meteo Geocoding.
 * Validates HTTP response status and verifies that matching results were found.
 */
async function findCity(name) {
  const url = `${GEOCODING_BASE_URL}?count=1&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Could not search for the city.");
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found.");
  }

  const city = data.results[0];
  return {
    name: city.name,
    country: city.country || "",
    lat: city.latitude,
    lon: city.longitude
  };
}

/**
 * getWeather(lat, lon)
 * Fetches current weather and a 5-day daily forecast for the given latitude/longitude.
 * Verifies that the network response is valid before parsing JSON.
 */
async function getWeather(lat, lon) {
  const url = `${FORECAST_BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Could not load the forecast.");
  }

  return await res.json();
}

// ==========================================================================
// Status & UI State Management
// ==========================================================================

/**
 * Updates the message and visual style (loading, error) of the status element.
 */
function setStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.className = "status-message";
  if (type) {
    statusElement.classList.add(`status-${type}`);
  }
}

/**
 * Clears any active status messages.
 */
function clearStatus() {
  statusElement.textContent = "";
  statusElement.className = "status-message";
}

/**
 * Clears current and forecast weather sections from the display.
 */
function clearWeatherDisplay() {
  currentSection.replaceChildren();
  forecastSection.replaceChildren();
}

// ==========================================================================
// Render Functions
// Uses createElement and textContent exclusively (NEVER innerHTML) for security.
// ==========================================================================

/**
 * renderCurrentWeather(location, weather)
 * Constructs and displays the current weather card showing city, country, temperature, and condition.
 */
function renderCurrentWeather(location, weather) {
  currentSection.replaceChildren();

  const card = document.createElement("article");
  card.className = "current-card";

  const header = document.createElement("div");
  header.className = "current-header";

  const badge = document.createElement("span");
  badge.className = "current-badge";
  badge.textContent = "Current Weather";

  const locationHeading = document.createElement("h2");
  locationHeading.className = "current-location";
  locationHeading.textContent = location.country
    ? `${location.name}, ${location.country}`
    : location.name;

  header.append(badge, locationHeading);

  const tempContainer = document.createElement("div");
  tempContainer.className = "current-temp-container";

  const tempText = document.createElement("p");
  tempText.className = "current-temp";
  tempText.textContent = `${Math.round(weather.current.temperature_2m)}°C`;

  tempContainer.append(tempText);

  const conditionBadge = document.createElement("p");
  conditionBadge.className = "current-label-badge";
  conditionBadge.textContent = getWeatherLabel(weather.current.weather_code);

  card.append(header, tempContainer, conditionBadge);
  currentSection.append(card);
}

/**
 * renderForecast(weather)
 * Constructs and displays the 5-day forecast grid with formatted dates, condition labels, and max/min temperatures.
 */
function renderForecast(weather) {
  forecastSection.replaceChildren();

  const heading = document.createElement("h2");
  heading.className = "forecast-title";
  heading.textContent = "5-Day Forecast";

  const grid = document.createElement("div");
  grid.className = "forecast-grid";

  const daily = weather.daily;
  const daysCount = Math.min(daily.time.length, 5);

  for (let i = 0; i < daysCount; i++) {
    const card = document.createElement("article");
    card.className = "forecast-card";

    // Parse YYYY-MM-DD components safely to format via toLocaleDateString without timezone offset bugs
    const [year, month, day] = daily.time[i].split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    const dateEl = document.createElement("p");
    dateEl.className = "forecast-date";
    dateEl.textContent = formattedDate;

    const labelEl = document.createElement("p");
    labelEl.className = "forecast-label";
    labelEl.textContent = getWeatherLabel(daily.weather_code[i]);

    const tempsContainer = document.createElement("div");
    tempsContainer.className = "forecast-temps";

    // High temperature row
    const maxRow = document.createElement("div");
    maxRow.className = "temp-row temp-row-max";
    const maxLabel = document.createElement("span");
    maxLabel.textContent = "High";
    const maxVal = document.createElement("span");
    maxVal.textContent = `${Math.round(daily.temperature_2m_max[i])}°C`;
    maxRow.append(maxLabel, maxVal);

    // Low temperature row
    const minRow = document.createElement("div");
    minRow.className = "temp-row temp-row-min";
    const minLabel = document.createElement("span");
    minLabel.textContent = "Low";
    const minVal = document.createElement("span");
    minVal.textContent = `${Math.round(daily.temperature_2m_min[i])}°C`;
    minRow.append(minLabel, minVal);

    tempsContainer.append(maxRow, minRow);
    card.append(dateEl, labelEl, tempsContainer);
    grid.append(card);
  }

  forecastSection.append(heading, grid);
}

// ==========================================================================
// LocalStorage Persistence (with try/catch error handling)
// ==========================================================================

/**
 * Safely saves the last searched city name to localStorage.
 */
function saveLastCity(city) {
  try {
    if (city && typeof city === "string") {
      localStorage.setItem(STORAGE_KEY, city);
    }
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

/**
 * Safely retrieves the last searched city from localStorage.
 */
function loadLastCity() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && typeof saved === "string" && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (err) {
    console.warn("Could not load from localStorage:", err);
  }
  return null;
}

// ==========================================================================
// Search Controller & Error Handling
// ==========================================================================

/**
 * searchCity(cityName)
 * Orchestrates input validation, loading states, API calls, error reporting, and UI updates.
 */
async function searchCity(cityName) {
  const trimmed = cityName ? cityName.trim() : "";

  // Validation: Reject empty queries
  if (!trimmed) {
    setStatus("Type a city name.", "error");
    return;
  }

  // State 1: Loading
  setStatus("Loading...", "loading");
  searchButton.disabled = true;

  try {
    // Fetch coordinates then fetch forecast
    const location = await findCity(trimmed);
    const weather = await getWeather(location.lat, location.lon);

    // State 5: Success
    clearStatus();
    renderCurrentWeather(location, weather);
    renderForecast(weather);
    saveLastCity(location.name);
  } catch (error) {
    clearWeatherDisplay();

    // Differentiate network errors from API/validation errors
    const isNetworkError =
      !navigator.onLine ||
      error instanceof TypeError ||
      (error.message && error.message.toLowerCase().includes("failed to fetch")) ||
      (error.message && error.message.toLowerCase().includes("network"));

    if (isNetworkError) {
      // State 4: Network problem
      setStatus("Network problem. Please check your connection and try again.", "error");
    } else if (error.message === "City not found.") {
      // State 3: City not found
      setStatus("City not found.", "error");
    } else if (error.message === "Could not load the forecast.") {
      setStatus("Could not load the forecast.", "error");
    } else {
      setStatus(error.message || "Network problem. Please check your connection and try again.", "error");
    }
  } finally {
    // Re-enable search button regardless of success or failure
    searchButton.disabled = false;
  }
}

// ==========================================================================
// Event Listeners & Initialization
// Only calls the API on form submission, never on every keypress.
// ==========================================================================
form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity(cityInput.value);
});

/**
 * Initializes the dashboard on load by checking for a previously searched city.
 */
function init() {
  const savedCity = loadLastCity();
  if (savedCity) {
    cityInput.value = savedCity;
    searchCity(savedCity);
  }
}

init();
