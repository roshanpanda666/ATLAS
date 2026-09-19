import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get the current weather for a city. Use this when the user asks about weather conditions.',
  inputSchema: z.object({
    city: z.string().describe('The city name, e.g. "London", "New York", "Mumbai"'),
  }),
  execute: async ({ city }) => {
    console.log("fetching the weather data")
    try {
      // Geocode the city (Open-Meteo geocoding API — free, no key)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const geoData = await geoRes.json();

      if (!geoData.results?.length) {
        return { error: `Could not find location: "${city}"` };
      }

      const { latitude, longitude, name: placeName, country } = geoData.results[0];

      // Fetch current weather (Open-Meteo — free, no key)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const current = weatherData.current;

      const weatherCodes: Record<number, string> = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
      };

      return {
        location: `${placeName}, ${country}`,
        temperature: `${current.temperature_2m}°C`,
        feels_like: `${current.apparent_temperature}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        wind_speed: `${current.wind_speed_10m} km/h`,
        condition: weatherCodes[current.weather_code] || 'Unknown',
      };
    } catch (error) {
      return { error: `Weather fetch failed: ${String(error)}` };
    }
  },
});
