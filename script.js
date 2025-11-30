document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
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
  
  // ========== NEW: Navigation Elements with smooth interactions ==========
  const navVibeBtn = document.getElementById("nav-vibe-trigger");
  const mobileVibeBtn = document.getElementById("mobile-vibe-trigger");
  const vibeSection = document.getElementById("vibe-section-container");
  const mobileSearchElem = document.getElementById("mobile-search");
  const searchToggle = document.getElementById("search-toggle");
// ... and more container references
// ========== FIXED: Skeleton Loader Elements ==========
  const weatherContent = document.getElementById("weather-content");
  const weatherSkeleton = document.getElementById("weather-skeleton");
  const hourlyContent = document.getElementById("hourly-content");
  const hourlySkeletonContainer = document.getElementById("hourly-skeleton-container");
  const forecastContent = document.getElementById("forecast-content");
  const forecastSkeletonContainer = document.getElementById("forecast-skeleton-container");

 // ========== NEW: SKELETON LOADER FUNCTIONS ==========
  function showSkeletonLoaders() {
    // Hide actual content, show skeletons
    if (weatherContent) weatherContent.classList.add("hidden");
    if (weatherSkeleton) weatherSkeleton.classList.remove("hidden");
    
    if (hourlyContent) hourlyContent.classList.add("hidden");
    if (hourlySkeletonContainer) hourlySkeletonContainer.classList.remove("hidden");
    
    if (forecastContent) forecastContent.classList.add("hidden");
    if (forecastSkeletonContainer) forecastSkeletonContainer.classList.remove("hidden");
  }

  function hideSkeletonLoaders() {
    // Show actual content, hide skeletons
    if (weatherContent) weatherContent.classList.remove("hidden");
    if (weatherSkeleton) weatherSkeleton.classList.add("hidden");
    
    if (hourlyContent) hourlyContent.classList.remove("hidden");
    if (hourlySkeletonContainer) hourlySkeletonContainer.classList.add("hidden");
    
    if (forecastContent) forecastContent.classList.remove("hidden");
    if (forecastSkeletonContainer) forecastSkeletonContainer.classList.add("hidden");
  }
  // ========== END NEW ==========

  let activeWeather = null;
  let cityLabel = "";

  // ========== NEW: Enhanced Navigation Logic with smooth animations ==========
  function scrollToVibe() {
    if (vibeSection) {
      vibeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Pulse animation to draw attention
      vibeBtn.classList.add('pulse-animation');
      setTimeout(() => vibeBtn.classList.remove('pulse-animation'), 2000);
    }
  }

  // Close mobile search when AI button clicked
  function closeAndTriggerVibe() {
    if (mobileSearchElem) {
      mobileSearchElem.classList.remove("active");
      searchToggle.classList.remove("active");
    }
    scrollToVibe();
  }

  if (navVibeBtn) navVibeBtn.addEventListener('click', scrollToVibe);
  if (mobileVibeBtn) mobileVibeBtn.addEventListener('click', closeAndTriggerVibe);
  // ========== END NEW ==========

  // --- Weather Logic ---

  function showError(msg) {
    errorElem.textContent = msg;
    errorElem.classList.remove("hidden");
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      if (errorElem.classList.contains("hidden") === false) {
        errorElem.classList.add("hidden");
      }
    }, 5000);
  }

  function hideError() {
    errorElem.classList.add("hidden");
  }

  function fetchMumbaiWeatherFallback() {
    showSkeletonLoaders(); // ========== NEW ==========
    getWeatherData(19.076, 72.8777, "Mumbai, IN", "IN");
  }

  function getUserGeoLocation() {
    showSkeletonLoaders(); // ========== NEW ==========
    
    if (!navigator.geolocation) {
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
          const city = locData.address.city || locData.address.town || locData.address.village || "Current Location";
          const cc = locData.address.country_code?.toUpperCase();
          getWeatherData(latitude, longitude, `${city}, ${cc}`, cc);
        } catch (err) {
          getWeatherData(latitude, longitude, "Current Location", null);
        }
      },
      (err) => {
        showError("Could not get location. Showing Mumbai.");
        fetchMumbaiWeatherFallback();
      }
    );
  }

  async function getWeatherData(lat, lon, label, cc) {
    showSkeletonLoaders(); // ========== NEW ==========
    hideError();
    let currentFields = "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index";
    if (cc === "US") currentFields += ",us_aqi";

    const apiURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${currentFields}&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;

    try {
      const res = await fetch(apiURL);
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();

      activeWeather = data;
      cityLabel = label;
      
      updateNowWeather(data, label);
      updateHourly(data);
      updateForecast(data);
      hideSkeletonLoaders(); // ========== NEW ==========
    } catch (err) {
      console.error(err);
      showError("Could not fetch weather data.");
      hideSkeletonLoaders(); // ========== NEW ==========
    }
  }

  // ========== UPDATED: Enhanced search with better feedback ==========
  searchForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const input = searchInput.value.trim();
    if (!input) return;

    showSkeletonLoaders(); // ========== NEW ==========
    
    // Visual feedback
    searchInput.classList.add("opacity-50");
    const submitBtn = searchForm.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.classList.add("opacity-50");
      submitBtn.disabled = true;
    }
    hideError();

    const geoURL = `https://geocoding-api.open-meteo.com/v1/search?name=${input}&count=1&language=en&format=json`;
    try {
      const res = await fetch(geoURL);
      if (!res.ok) throw new Error("Geocode API down");
      const data = await res.json();

      if (data.results?.length) {
        const match = data.results[0];
        getWeatherData(match.latitude, match.longitude, `${match.name}, ${match.country_code}`, match.country_code.toUpperCase());
      } else {
        showError(`Could not find location: "${input}"`);
        hideSkeletonLoaders(); // ========== NEW ==========
      }
    } catch (err) {
      showError("Search failed. Check spelling.");
      hideSkeletonLoaders(); // ========== NEW ==========
    } finally {
      searchInput.classList.remove("opacity-50");
      if (submitBtn) {
        submitBtn.classList.remove("opacity-50");
        submitBtn.disabled = false;
      }
      searchInput.value = "";
    }
  });
  // ========== END UPDATED ==========

  // ========== UPDATED: Enhanced AI Vibe Logic with better error handling ==========
  vibeBtn.addEventListener("click", async () => {
    if (!activeWeather) {
      showError("Weather data not loaded yet.");
      return;
    }

    vibeBox.classList.remove("hidden");
    loadingSpinner.classList.remove("hidden");
    geminiOutput.innerHTML = "";
    
    // Scroll so user sees the spinner
    vibeBox.scrollIntoView({ behavior: "smooth", block: "center" });

const vibePrompt = `
Generate a concise, trendy lifestyle guide based on the weather in ${cityLabel}.

Weather Details:
• Condition: ${getWeatherDescription(activeWeather.current.weather_code)}
• Temperature: ${Math.round(activeWeather.current.temperature_2m)}°C
• Feels Like: ${feelsLikeElem.textContent}°C

Act like a modern lifestyle assistant and provide the following sections:

### 1. Vibe of the Day (one-line, fun, emoji-rich)
### 2. Weather Alerts / News (2 short bullet points)
### 3. Outfit Guide
   - Men
   - Women
### 4. Food Corner
   - Local, National & International food suggestions
   - Include 1–2 nearby restaurant names for each category
### 5. Playlist Suggestions
   - Marathi
   - Hindi
   - English
### 6. Activities
   - 1 Indoor activity
   - 1 Outdoor activity
### 7. Nearby Places to Visit (3–5 suggestions)

Format strictly in **clean Markdown**, using headings, tables, bullets & emojis. Keep tone engaging, crisp, and relatable.
`;


    const API_KEY = "AIzaSyBg13y6IUrGDbNAnQsKbIcaWes_1T2KqWA"; 
    
    // Using Gemini 2.5 Flash model for optimal performance
    const model = "gemini-2.5-flash"; 

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

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(`API Error: ${errData.error?.message || resp.statusText}`);
      }

      const result = await resp.json();
      const output = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (output) {
        let html = marked.parse(output, { breaks: true });
        
        // ========== NEW: Enhanced custom styling for AI response ==========
        html = html
          .replace(/<h1>/g, '<h1 class="text-2xl font-bold text-purple-300 mt-4 mb-2 border-b border-purple-500/30 pb-2">')
          .replace(/<h2>/g, '<h2 class="text-xl font-semibold text-purple-200 mt-4 mb-2">')
          .replace(/<h3>/g, '<h3 class="text-lg font-semibold text-purple-100 mt-3 mb-1">')
          .replace(/<table>/g, '<div class="overflow-x-auto"><table class="border-collapse border border-white/20 my-4 w-full text-sm">')
          .replace(/<\/table>/g, '</table></div>')
          .replace(/<th>/g, '<th class="border border-white/20 bg-purple-900/40 p-3 text-left font-semibold">')
          .replace(/<td>/g, '<td class="border border-white/20 p-3">')
          .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-1 ml-2 text-white/90">')
          .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-1 ml-2 text-white/90">')
          .replace(/<strong>/g, '<strong class="font-bold text-purple-200">')
          .replace(/<em>/g, '<em class="italic text-white/80">');
        // ========== END NEW ==========

        geminiOutput.innerHTML = html;
        
        // Add fade-in animation
        geminiOutput.classList.add("fade-in");
      } else {
        throw new Error("No response content");
      }
    } catch (err) {
      console.error("Gemini error:", err);
      geminiOutput.innerHTML = `<div class="p-4 bg-red-500/20 rounded border border-red-500/50 text-red-200 fade-in">
        <p class="font-bold mb-2">⚠️ AI Connection Failed</p>
        <p class="text-sm mb-2">${err.message}</p>
        <p class="text-xs opacity-70">
          <strong>Troubleshooting:</strong><br>
          1. Check if API key is valid in script.js<br>
          2. Verify Gemini API is enabled<br>
          3. Check browser console for details
        </p>
      </div>`;
    } finally {
      loadingSpinner.classList.add("hidden");
    }
  });
  // ========== END UPDATED ==========

  // --- Helper Functions ---

  function updateNowWeather(data, city) {
    const current = data.current;
    const daily = data.daily;
    const code = current.weather_code;

    const vid = getWeatherVideo(code);
    // Only reload video if source changes to prevent flickering
    if (backgroundVideo.src !== vid) {
      backgroundVideo.src = vid;
      backgroundVideo.load();
      backgroundVideo.play().catch(e => {}); // Silent catch for autoplay blocks
    }

    // ========== UPDATED: Smooth fade-in animations ==========
    document.querySelectorAll(".glass-container").forEach((container, index) => {
      setTimeout(() => {
        container.classList.add("fade-in");
      }, index * 100);
    });
    // ========== END UPDATED ==========

    locationElem.textContent = city;
    tempElem.textContent = Math.round(current.temperature_2m);
    conditionElem.textContent = getWeatherDescription(code);
    iconElem.src = getWeatherIcon(code);
    
    // Calculate Feels Like
    const feelsLike = calculateFeelsLikeTemp(current.temperature_2m, current.relative_humidity_2m, current.wind_speed_10m);
    feelsLikeElem.textContent = Math.round(feelsLike);

    humidityElem.textContent = `${current.relative_humidity_2m}%`;
    windElem.textContent = `${current.wind_speed_10m} km/h`;
    
    // Formatting Times
    const formatTime = (isoString) => new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    sunriseElem.textContent = formatTime(daily.sunrise[0]);
    sunsetElem.textContent = formatTime(daily.sunset[0]);
    
    uvElem.textContent = `${Math.round(current.uv_index)} (${getUvIndexDescription(current.uv_index)})`;
    aqiElem.textContent = current.us_aqi !== undefined ? `${current.us_aqi} (${getAqiDescription(current.us_aqi)})` : "N/A";
  }

  function calculateFeelsLikeTemp(temp, humidity, windSpeed) {
    if (temp > 27 && humidity > 40) return temp + (humidity - 40) / 10;
    if (temp < 10 && windSpeed > 5) return temp - (windSpeed - 5) / 5;
    return temp;
  }

  function updateHourly(data) {
    const { time, temperature_2m, weather_code } = data.hourly;
    const now = new Date();
    let i = time.findIndex((t) => new Date(t) >= now);

    if (i === -1) {
      hourlyElem.innerHTML = "<p class='text-center text-white/50'>No upcoming data</p>";
      return;
    }

    let html = "";
    // Limit to next 24 hours
    for (let count = 0; count < 24 && i < time.length; count++, i++) {
      const hr = new Date(time[i]).toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
      html += `<div class="glass-item text-center flex-shrink-0 p-3 w-24 mx-1 transition-all duration-300 hover:shadow-lg">
        <h6 class="text-xs text-white/70 mb-2 font-medium">${hr}</h6>
        <img src="${getWeatherIcon(weather_code[i])}" class="w-8 h-8 mx-auto mb-2 transition-transform duration-300" alt="icon">
        <p class="font-bold text-sm">${Math.round(temperature_2m[i])}°</p>
      </div>`;
    }
    hourlyElem.innerHTML = html;
  }

  function updateForecast(data) {
    const { time, temperature_2m_max, temperature_2m_min, weather_code } = data.daily;
    let html = "";
    for (let i = 1; i < Math.min(6, time.length); i++) {
      const day = new Date(time[i]).toLocaleDateString("en-US", { weekday: "short" });
      html += `<div class="glass-item p-3 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105">
        <h5 class="font-medium text-purple-200 mb-1 text-sm">${day}</h5>
        <img src="${getWeatherIcon(weather_code[i])}" class="w-10 h-10 my-1 transition-transform duration-300" alt="icon">
        <div class="flex gap-2 text-sm">
          <span class="font-bold">${Math.round(temperature_2m_max[i])}°</span>
          <span class="text-white/60">${Math.round(temperature_2m_min[i])}°</span>
        </div>
      </div>`;
    }
    forecastElem.innerHTML = html;
  }

  // --- Utility Lookups (Icons, Videos, Descriptions) ---
  
  function getWeatherVideo(code) {
    if ([0, 1].includes(code)) return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754644015/sunny_weather_hmhd8d.mp4";
    if ([2, 3].includes(code)) return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754643965/cloudy_weather_ub0bue.mp4";
    if ([45, 48].includes(code)) return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754644156/fog_qwtjpm.mp4";
    if (code >= 51 && code <= 67) return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754644213/forest_fog_psg0no.mp4";
    if (code >= 71 && code <= 77) return "https://cdn.pixabay.com/video/2022/11/18/139519-772542591_large.mp4";
    if (code >= 80 && code <= 99) return "https://cdn.pixabay.com/video/2023/04/30/161060-822582126_large.mp4";
    return "https://res.cloudinary.com/dnhm4glyx/video/upload/v1754643992/clear_weather_d8c80n.mp4";
  }

  function getWeatherDescription(code) {
    const descMap = { 
      0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 
      45: "Fog", 48: "Rime Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Dense Drizzle", 
      61: "Slight Rain", 63: "Rain", 65: "Heavy Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 
      80: "Showers", 81: "Heavy Showers", 95: "Thunderstorm", 96: "Thunderstorm + Hail" 
    };
    return descMap[code] || "Weather";
  }

  function getWeatherIcon(code) {
    // Optimized icon mapping
    if ([0, 1].includes(code)) return "https://img.icons8.com/color/96/sun--v1.png";
    if ([2, 3].includes(code)) return "https://img.icons8.com/color/96/cloud.png";
    if ([45, 48].includes(code)) return "https://img.icons8.com/color/96/fog-day.png";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "https://img.icons8.com/color/96/rain.png";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "https://img.icons8.com/color/96/snow.png";
    if (code >= 95) return "https://img.icons8.com/color/96/storm.png";
    return "https://img.icons8.com/color/96/cloud.png";
  }

  function getUvIndexDescription(uv) { 
    return uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : uv <= 7 ? "High" : uv <= 10 ? "Very High" : "Extreme"; 
  }

  function getAqiDescription(aqi) { 
    return aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : aqi <= 150 ? "Unhealthy-ish" : "Unhealthy"; 
  }

  // ========== UPDATED: Better initialization with loading state ==========
  // Show loading state
  locationElem.textContent = "Locating...";
  conditionElem.textContent = "Getting weather data";
  showSkeletonLoaders()
  // Initialize
  getUserGeoLocation();
  // ========== END UPDATED ==========
});