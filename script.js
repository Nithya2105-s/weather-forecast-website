
const $ = id => document.getElementById(id);

let unit = "C";

const unitLabel = () => unit === "C" ? "°C" : "°F";

const temp = n =>
    Math.round(unit === "C" ? n : n * 9 / 5 + 32);

// Weather condition and icons

function iconFor(code) {

    if (code === 0) return ["Clear", "☀️"];

    if ([1, 2].includes(code))
        return ["Partly cloudy", "🌤️"];

    if (code === 3) return ["Cloudy", "☁️"];

    if ([45, 48].includes(code))
        return ["Foggy", "🌫️"];

    if ([51, 53, 55, 56, 57].includes(code))
        return ["Drizzle", "🌦️"];

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
        return ["Rainy", "🌧️"];

    if ([71, 73, 75, 77, 85, 86].includes(code))
        return ["Snow", "❄️"];

    if ([95, 96, 99].includes(code))
        return ["Thunderstorm", "⛈️"];

    return ["Weather", "🌤️"];
}

// Search city and get weather

async function findCity(city) {

    $("statusMessage").textContent = "Finding city...";

    try {

        const geoResponse = await fetch(
            "https://geocoding-api.open-meteo.com/v1/search?name="
            + encodeURIComponent(city)
            + "&count=1&language=en&format=json"
        );

        if (!geoResponse.ok)
            throw new Error("City search failed.");

        const geoData = await geoResponse.json();

        if (!geoData.results || !geoData.results.length)
            throw new Error("City not found. Check the spelling.");

        const place = geoData.results[0];

        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;

        const response = await fetch(url);

        if (!response.ok)
            throw new Error("Weather service is unavailable.");

        const data = await response.json();

        renderWeather(place, data);

        $("statusMessage").textContent =
            "Weather updated successfully.";

    } catch (error) {

        $("statusMessage").textContent =
            error.message || "Could not load weather.";
    }
}

// Display weather information

function renderWeather(place, data) {

    const c = data.current;
    const d = data.daily;

    $("cityName").textContent =
        place.name + ", " + (place.country || "");

    $("currentTemp").textContent =
        temp(c.temperature_2m);

    const [description, icon] =
        iconFor(c.weather_code);

    $("conditionText").textContent = description;
    $("mainIcon").textContent = icon;

    $("feelsLike").textContent =
        temp(c.apparent_temperature) + unitLabel();

    $("humidity").textContent =
        c.relative_humidity_2m + "%";

    $("windSpeed").textContent =
        Math.round(c.wind_speed_10m) + " km/h";

    $("pressure").textContent =
        Math.round(c.surface_pressure) + " hPa";

    $("maxTemp").textContent =
        temp(d.temperature_2m_max[0]) + unitLabel();

    $("minTemp").textContent =
        temp(d.temperature_2m_min[0]) + unitLabel();

    $("uvIndex").textContent =
        Math.round(d.uv_index_max[0]) + " (UV)";

    $("maxWind").textContent =
        Math.round(d.wind_speed_10m_max[0]) + " km/h";

    // Seven-day forecast

    $("forecastList").innerHTML = "";

    d.time.forEach((date, i) => {

        const dayDate = new Date(date + "T12:00:00");

        const weekday = new Intl.DateTimeFormat(
            "en", { weekday: "short" }
        ).format(dayDate);

        const dateText = new Intl.DateTimeFormat(
            "en", { day: "numeric", month: "short" }
        ).format(dayDate);

        const [description, weatherIcon] =
            iconFor(d.weather_code[i]);

        const item = document.createElement("div");

        item.className =
            "day" + (i === 0 ? " today" : "");

        item.title = description;

        item.innerHTML = `
            <b>${weekday}</b>
            <small>${dateText}</small>
            <i>${weatherIcon}</i>
            <strong>
                ${temp(d.temperature_2m_max[i])}° /
                ${temp(d.temperature_2m_min[i])}°
            </strong>
        `;

        $("forecastList").appendChild(item);
    });

    drawChart(d);
}

// Temperature trend chart

function drawChart(daily) {

    const svg = $("trendChart");

    const values =
        daily.temperature_2m_max.slice(0, 5).map(temp);

    const days = daily.time.slice(0, 5).map(date =>
        new Intl.DateTimeFormat(
            "en", { weekday: "short" }
        ).format(new Date(date + "T12:00:00"))
    );

    const low = Math.min(...values) - 2;
    const high = Math.max(...values) + 2;

    const x = i => 35 + i * 130;

    const y = value =>
        125 - ((value - low) / (high - low || 1)) * 85;

    let markup = "";

    [35, 75, 115, 145].forEach(yy => {

        markup += `
            <line class="gridline"
                x1="20" y1="${yy}"
                x2="590" y2="${yy}"/>
        `;
    });

    markup += `
        <polyline class="line"
            points="${values.map(
                (v, i) => `${x(i)},${y(v)}`
            ).join(" ")}"/>
    `;

    values.forEach((value, i) => {

        markup += `
            <circle class="dot"
                cx="${x(i)}"
                cy="${y(value)}"
                r="6"/>

            <text class="value"
                x="${x(i)}"
                y="${y(value) - 13}"
                text-anchor="middle">
                ${value}°
            </text>

            <text class="daylabel"
                x="${x(i)}"
                y="164"
                text-anchor="middle">
                ${days[i]}
            </text>
        `;
    });

    svg.innerHTML = markup;
}

// Search button

$("searchForm").addEventListener("submit", event => {

    event.preventDefault();

    const city = $("cityInput").value.trim();

    if (city) {
        findCity(city);
    }
});

// Dark mode

$("themeToggle").addEventListener("click", () => {

    document.body.classList.toggle("dark");

});

// Date and time

$("dateText").textContent =
    new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date());

// Load default city

findCity("Chennai");
