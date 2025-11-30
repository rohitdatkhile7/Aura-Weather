document.addEventListener("DOMContentLoaded", () => {
  const backgroundVideo = document.getElementById("background-video");
  const locationElem = document.getElementById("location");
  const tempElem = document.getElementById("current-temp");
  const conditionElem = document.getElementById("current-condition");
  const iconElem = document.getElementById("current-weather-icon");
  const humidityElem = document.getElementById("humidity");
  const windElem = document.getElementById("wind-speed");
  const sunriseElem = document.getElementById("sunrise");
  const sunsetElem = document.getElementById("sunset");
  const uvElem = document.getElementById("uv-index");
  const aqiElem = document.getElementById("aqi");
  const forecastElem = document.getElementById("forecast");
  const hourlyElem = document.getElementById("hourly-forecast");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const errorElem = document.getElementById("error-message");
  const vibeBtn = document.getElementById("vibe-check-btn");
  const vibeBox = document.getElementById("vibe-recommendations");
  const loadingSpinner = document.getElementById("gemini-spinner");
  const geminiOutput = document.getElementById("gemini-response");
  const feelsLikeElem = document.getElementById("feels-like");

  let activeWeather = null;
  let cityLabel = "";

  function showError(msg) {
    errorElem.textContent = msg;
    errorElem.classList.remove("hidden");
  }

  function hideError() {
    errorElem.classList.add("hidden");
  }

  function fetchMumbaiWeatherFallback() {
    getWeatherData(19.076, 72.8777, "Mumbai, IN", "IN");
  }

  function getUserGeoLocation() {
    if (!navigator.geolocation) {
      console.warn("Geolocation not available in browser");
      showError("Geolocation not supported. Showing weather for Mumbai.");
      fetchMumbaiWeatherFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const locRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const locData = await locRes.json();
          const city =
            locData.address.city ||
            locData.address.town ||
            locData.address.village ||
            "Current Location";
          const cc = locData.address.country_code?.toUpperCase();
          getWeatherData(latitude, longitude, `${city}, ${cc}`, cc);
        } catch (err) {
          console.error("Could not reverse geocode:", err);
          getWeatherData(latitude, longitude, "Current Location", null);
        }
      },
      (err) => {
        console.warn(`Geolocation failed (${err.code}): ${err.message}`);
        showError("Could not get your location. Showing weather for Mumbai.");
        fetchMumbaiWeatherFallback();
      }
    );
  }

  async function getWeatherData(lat, lon, label, cc) {
    hideError();

    let currentFields =
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index";
    if (cc === "US") currentFields += ",us_aqi";

    const apiURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${currentFields}&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;

    try {
      const res = await fetch(apiURL);
      console.log("AI res: ", res);
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();

      activeWeather = data;
      cityLabel = label;
      console.log(data);
      updateNowWeather(data, label);
      updateHourly(data);
      updateForecast(data);
    } catch (err) {
      console.error("Weather fetch failed:", err);
      showError("Could not fetch weather data. Please try again.");
    }
  }

  searchForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const input = searchInput.value.trim();
    if (!input) return;

    // Show loading state
    searchInput.classList.add("opacity-50");
    errorElem.classList.add("hidden");

    const geoURL = `https://geocoding-api.open-meteo.com/v1/search?name=${input}&count=1&language=en&format=json`;
    try {
      const res = await fetch(geoURL);
      if (!res.ok) throw new Error("Geocode API down");
      const data = await res.json();

      if (data.results?.length) {
        const match = data.results[0];
        getWeatherData(
          match.latitude,
          match.longitude,
          `${match.name}, ${match.country_code}`,
          match.country_code.toUpperCase()
        );
      } else {
        showError(`Could not find location: \"${input}\"`);
      }
    } catch (err) {
      console.error("Error with search lookup:", err);
      showError("Could not find location. Please check the spelling.");
    } finally {
      searchInput.classList.remove("opacity-50");
      searchInput.value = "";
    }
  });

  // Handle vibe button click - already has a basic event listener in the HTML
  // This extends that functionality with the API call
  vibeBtn.addEventListener("click", async () => {
    if (!activeWeather) {
      showError("Weather data not loaded yet.");
      return;
    }

    vibeBox.classList.remove("hidden");
    loadingSpinner.classList.remove("hidden");
    geminiOutput.innerHTML = "";

    // Scroll to the vibe section
    vibeBox.scrollIntoView({ behavior: "smooth", block: "center" });

    const vibePrompt = `
Based on the current weather in ${cityLabel}, here is the weather data:
Condition: ${getWeatherDescription(activeWeather.current.weather_code)}
Temperature: ${Math.round(activeWeather.current.temperature_2m)}°C
Feels like: ${feelsLikeElem.textContent}°C

Act as a cool and trendy lifestyle + travel + food assistant. Provide the following in detail:

1. **Vibe of the Day ☀️**  
   - A creative, trendy one-line description of the day's vibe (consider weather + current lifestyle trends).
   - Mention if the day feels cozy, adventurous, romantic, energetic, etc.

2. **Weather News & Alerts 🌩**  
   - Give 2–3 short, latest weather updates for this city (warnings, notable weather changes, interesting facts).
   - Highlight any important advisories (heatwave, rainstorm, wind alert, UV index concerns).

3. **Outfit Guide 👕**  
   - Provide 2 separate numbered lists for MEN and WOMEN.
   - Each list should have 3–4 stylish yet practical outfit suggestions for this weather.
   - Include accessories and footwear suggestions.

4. **Food Corner 🍔**  
   - Suggest 3 dishes perfect for this weather.  
   - Include:
       - A **local specialty** famous in ${cityLabel} region.  
       - A **national favorite** matching the weather.  
       - An **international dish** suited for the vibe.  
   - For each dish, recommend **where to eat** (restaurant name + area) in table format:

| Dish | Cuisine Type | Restaurant Name | Location |
|------|--------------|-----------------|----------|

5. **Playlist Mood 🎵**  
   - Suggest music genres matching the weather mood.  
   - Give **separate lists** for:
       - Marathi songs (3 trending songs — Song - Artist)  
       - Hindi songs (3 trending songs — Song - Artist)  
       - English songs (3 trending songs — Song - Artist)

6. **Activity Radar 🎯**  
   - Suggest 1 indoor and 1 outdoor activity for this city in this weather.  
   - Make it creative and engaging.

7. **Places to Visit 📍**  
   - Suggest 2–3 famous places near ${cityLabel} that match the weather vibe.  
   - Present details in a table format:

| Place Name | Type (Historical/Nature/Modern) | Distance from City Center | Why Visit? |

Make the entire response well-structured in markdown with clear headings, tables, and bullet points.
`;
    // Inside vibeBtn event listener...

    const API_KEY = "AIzaSyDrxRthxsgYZKtGOfOpVsaEOWvpASrPZfY"; // ⚠️ See security note below
    const model = "gemini-2.5-flash"; // CHANGED to a valid model

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: vibePrompt }] }],
          }),
        }
      );
      console.log(resp)

      const result = await resp.json();
      let output = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (output) {
        // Convert markdown → HTML
        let html = marked.parse(output, { breaks: true });

        // Optional: Add custom styling classes
        html = html
          .replace(
            /<h1>/g,
            '<h1 class="text-2xl font-bold text-purple-400 mt-4 mb-2">'
          )
          .replace(
            /<h2>/g,
            '<h2 class="text-xl font-semibold text-purple-300 mt-3 mb-1">'
          )
          .replace(
            /<h3>/g,
            '<h3 class="text-lg font-semibold text-purple-200 mt-2 mb-1">'
          )
          .replace(
            /<table>/g,
            '<table class="border border-gray-600 my-4 w-full">'
          )
          .replace(
            /<th>/g,
            '<th class="border border-gray-500 bg-gray-800 p-2">'
          )
          .replace(/<td>/g, '<td class="border border-gray-500 p-2">')
          .replace(/<ul>/g, '<ul class="list-disc ml-5">')
          .replace(/<ol>/g, '<ol class="list-decimal ml-5">');

        geminiOutput.innerHTML = html;
      } else throw new Error("Invalid Gemini response");
    } catch (err) {
      console.error("Gemini error:", err);
      geminiOutput.innerHTML =
        '<p class="text-red-400">Sorry, I couldn\'t generate the vibe right now. Please try again later.</p>';
    } finally {
      loadingSpinner.classList.add("hidden");
    }
  });

  function updateNowWeather(data, city) {
    const current = data.current;
    const daily = data.daily;
    const code = current.weather_code;

    const vid = getWeatherVideo(code);
    if (backgroundVideo.src !== vid) {
      backgroundVideo.src = vid;
      backgroundVideo.load();
      backgroundVideo
        .play()
        .catch((err) => console.log("Autoplay blocked", err));
    }

    // Add fade-in animation to elements
    document.querySelectorAll(".glass-container").forEach((container) => {
      container.classList.add("fade-in");
    });

    locationElem.textContent = city;
    tempElem.textContent = `${Math.round(current.temperature_2m)}`;
    conditionElem.textContent = getWeatherDescription(code);
    iconElem.src = getWeatherIcon(code);
    iconElem.classList.add("weather-icon");

    // Calculate feels like temperature (approximation)
    const feelsLike = calculateFeelsLikeTemp(
      current.temperature_2m,
      current.relative_humidity_2m,
      current.wind_speed_10m
    );
    feelsLikeElem.textContent = Math.round(feelsLike);

    humidityElem.textContent = `${current.relative_humidity_2m}%`;
    windElem.textContent = `${current.wind_speed_10m} km/h`;

    sunriseElem.textContent = new Date(daily.sunrise[0]).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );
    sunsetElem.textContent = new Date(daily.sunset[0]).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );
    uvElem.textContent = `${Math.round(
      current.uv_index
    )} (${getUvIndexDescription(current.uv_index)})`;

    aqiElem.textContent =
      current.us_aqi !== undefined
        ? `${current.us_aqi} (${getAqiDescription(current.us_aqi)})`
        : "N/A";
  }

  // Calculate feels like temperature
  function calculateFeelsLikeTemp(temp, humidity, windSpeed) {
    // Simple approximation of feels like temperature
    // For more accurate calculation, you would use heat index and wind chill formulas
    if (temp > 27 && humidity > 40) {
      // Hot and humid - feels warmer
      return temp + (humidity - 40) / 10;
    } else if (temp < 10 && windSpeed > 5) {
      // Cold and windy - wind chill effect
      return temp - (windSpeed - 5) / 5;
    }
    return temp;
  }

  function updateHourly(data) {
    const { time, temperature_2m, weather_code } = data.hourly;
    const now = new Date();
    let i = time.findIndex((t) => new Date(t) >= now);

    if (i === -1) {
      hourlyElem.innerHTML =
        "<p class='text-center'>No hourly data available for the future.</p>";
      return;
    }

    let html = "";
    for (let count = 0; count < 24 && i < time.length; count++, i++) {
      const hr = new Date(time[i]).toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      });
      const temp = Math.round(temperature_2m[i]);
      const code = weather_code[i];
      html += `<div class="glass-item text-center flex-shrink-0 p-3 w-24">
        <h6 class="text-sm font-medium">${hr}</h6>
        <img src="${getWeatherIcon(
          code
        )}" class="w-10 h-10 mx-auto my-2 weather-icon" alt="Weather Icon">
        <p class="font-bold text-lg">${temp}°</p>
      </div>`;
    }
    hourlyElem.innerHTML = html;
  }

  function updateForecast(data) {
    const { time, temperature_2m_max, temperature_2m_min, weather_code } =
      data.daily;
    let html = "";

    for (let i = 1; i < Math.min(6, time.length); i++) {
      const day = new Date(time[i]).toLocaleDateString("en-US", {
        weekday: "short",
      });
      const hi = Math.round(temperature_2m_max[i]);
      const lo = Math.round(temperature_2m_min[i]);
      const code = weather_code[i];

      html += `<div class="glass-item p-4">
        <h5 class="font-semibold mb-2">${day}</h5>
        <img src="${getWeatherIcon(
          code
        )}" class="w-12 h-12 mx-auto my-2 weather-icon" alt="Weather Icon">
        <div class="flex justify-center gap-2 mt-1">
          <span class="font-bold">${hi}°</span>
          <span class="text-white/70">${lo}°</span>
        </div>
      </div>`;
    }
    forecastElem.innerHTML = html;
  }

  function getWeatherVideo(code) {
    if ([0, 1].includes(code))
      return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754644015/sunny_weather_hmhd8d.mp4";
    if ([2, 3].includes(code))
      return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754643965/cloudy_weather_ub0bue.mp4";
    if ([45, 48].includes(code))
      return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754644156/fog_qwtjpm.mp4";

    if (code >= 51 && code <= 67)
      return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754644213/forest_fog_psg0no.mp4";
    if (code >= 71 && code <= 77)
      return "https://cdn.pixabay.com/video/2022/11/18/139519-772542591_large.mp4";
    if (code >= 80 && code <= 99)
      return "https://cdn.pixabay.com/video/2023/04/30/161060-822582126_large.mp4";
    return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754643992/clear_weather_d8c80n.mp4";
  }

  function getWeatherDescription(code) {
    const descMap = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Light freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow fall",
      73: "Moderate snow fall",
      75: "Heavy snow fall",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm w/ slight hail",
      99: "Thunderstorm w/ heavy hail",
    };
    return descMap[code] || "Unknown";
  }

  function getWeatherIcon(code) {
    if ([0, 1].includes(code))
      return "https://img.icons8.com/color/96/000000/sun--v1.png";
    if ([2, 3].includes(code))
      return "https://img.icons8.com/color/96/000000/cloud.png";
    if ([45, 48].includes(code))
      return "https://img.icons8.com/color/96/000000/fog-day.png";
    if (code >= 51 && code <= 67)
      return "https://img.icons8.com/color/96/000000/rain.png";
    if (code >= 71 && code <= 77)
      return "https://img.icons8.com/color/96/000000/snow.png";
    if (code >= 80 && code <= 99)
      return "https://img.icons8.com/color/96/000000/storm.png";
    return "https://placehold.co/100x100/FFFFFF/000000?text=Icon";
  }

  function getUvIndexDescription(uv) {
    if (uv <= 2) return "Low";
    if (uv <= 5) return "Moderate";
    if (uv <= 7) return "High";
    if (uv <= 10) return "Very High";
    return "Extreme";
  }

  function getAqiDescription(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Some";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }

  getUserGeoLocation();
});
