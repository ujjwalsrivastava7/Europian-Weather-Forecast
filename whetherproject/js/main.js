// ---------------------
// DOM Elements
// ---------------------
const cityDropdown = document.getElementById("cityDropdown");
const getForecastBtn = document.getElementById("getForecastBtn");
const forecastContainer = document.getElementById("forecastContainer");

// ---------------------
// Load city data from CSV
// ---------------------
async function loadCities() {
  try {
    const response = await fetch("city_coordinates.csv");
    if (!response.ok) throw new Error("Failed to load city list");

    const text = await response.text();
    const rows = text.split("\n").slice(1); // Skip header

    rows.forEach(row => {
      if (row.trim() === "") return;
      const [lat, lon, city, country] = row.split(",");
      const option = document.createElement("option");
      option.value = `${lat},${lon}`;
      option.textContent = `${city}, ${country}`;
      cityDropdown.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading cities:", error);
  }
}

// ---------------------
// Fetch Forecast Data
// ---------------------
async function getForecast(lat, lon) {
  try {
    const url = `https://www.7timer.info/bin/civil.php?lon=${lon}&lat=${lat}&ac=0&unit=metric&output=json&tzshift=0`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch weather data");

    const data = await response.json();
    displayForecast(data.init, data.dataseries);
  } catch (error) {
    console.error("Error fetching forecast:", error);
    forecastContainer.innerHTML =
      `<p class="error">⚠️ Could not load weather forecast. Try again later.</p>`;
  }
}

// ---------------------
// Display Forecast
// ---------------------
function displayForecast(init, dataseries) {
  forecastContainer.innerHTML = "";
  const dailyMap = {}; // { "YYYY-MM-DD": [entries] }

  // Group entries by calendar date
  dataseries.forEach(entry => {
    const dateObj = calculateDateObjFromInit(init, entry.timepoint);
    const dateKey = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
    if (!dailyMap[dateKey]) dailyMap[dateKey] = [];
    dailyMap[dateKey].push(entry);
  });

  // Sort dates ascending
  const allDates = Object.keys(dailyMap).sort((a, b) => new Date(a) - new Date(b));
  const sortedDates = allDates.slice(0, 7);

  sortedDates.forEach((dateKey, index) => {
    const entries = dailyMap[dateKey];
    const temps = entries.map(e => e.temp2m);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    // First day uses nearest-hour entry
    const repEntry = index === 0 ? entries[0] : entries[Math.floor(entries.length / 2)];

    // Normalize weather code: remove day/night suffix
    let rawCode = repEntry.weather || repEntry.prec_type || "clear";
    rawCode = rawCode.toLowerCase().replace(/(day|night)$/i, "");

    // Get icon and friendly label
    const weatherInfo = getWeatherInfo(rawCode);

    const card = document.createElement("div");
    card.classList.add("forecast-card");

    const displayDate = new Date(dateKey).toLocaleDateString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    card.innerHTML = `
      <h3>${displayDate}</h3>
      <img src="images/${weatherInfo.icon}" alt="${weatherInfo.label}">
      <p>${weatherInfo.label}</p>
      <p>🌡️ ${minTemp}°C - ${maxTemp}°C</p>
    `;

    forecastContainer.appendChild(card);
  });
}

// ---------------------
// Utilities
// ---------------------
function calculateDateObjFromInit(init, timepoint) {
  const year = parseInt(init.substring(0, 4));
  const month = parseInt(init.substring(4, 6)) - 1;
  const day = parseInt(init.substring(6, 8));
  const hour = parseInt(init.substring(8, 10));

  const baseDate = new Date(Date.UTC(year, month, day, hour));
  baseDate.setUTCHours(baseDate.getUTCHours() + timepoint);
  return baseDate;
}

function getWeatherInfo(code) {
  const map = {
    clear: { icon: "clear.png", label: "Clear Sky" },
    pcloudy: { icon: "pcloudy.png", label: "Partly Cloudy" },
    mcloudy: { icon: "mcloudy.png", label: "Mostly Cloudy" },
    cloudy: { icon: "cloudy.png", label: "Cloudy" },
    humid: { icon: "humid.png", label: "Humid" },
    ishower: { icon: "ishower.png", label: "Isolated Showers" },
    oshower: { icon: "oshower.png", label: "Occasional Showers" },
    lightrain: { icon: "lightrain.png", label: "Light Rain" },
    rain: { icon: "rain.png", label: "Rain" },
    rainsnow: { icon: "rainsnow.png", label: "Rain & Snow" },
    snow: { icon: "snow.png", label: "Snow" },
    lightsnow: { icon: "lightsnow.png", label: "Light Snow" },
    tsrain: { icon: "tsrain.png", label: "Thunderstorm with Rain" },
    tstorm: { icon: "tstorm.png", label: "Thunderstorm" },
    fog: { icon: "fog.png", label: "Fog" },
    windy: { icon: "windy.png", label: "Windy" }
  };

  if (!code || !map[code]) {
    console.warn("Unknown weather code:", code);
    return { icon: "clear.png", label: code ? code.replace(/_/g, " ") : "Clear Sky" };
  }

  return map[code];
}

// ---------------------
// Event Listeners
// ---------------------
getForecastBtn.addEventListener("click", () => {
  const value = cityDropdown.value;
  if (!value) {
    alert("Please select a city first!");
    return;
  }
  const [lat, lon] = value.split(",");
  getForecast(lat, lon);
});

// Load cities on page start
loadCities();
