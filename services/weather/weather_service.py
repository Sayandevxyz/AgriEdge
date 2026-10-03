"""
AgriEdge Weather Service & Provider Abstraction
Handles live OpenWeatherMap API communication, response caching with TTL,
and isolated local development fallbacks clearly badged as fallback data.
"""

import os
import time
import httpx
from typing import Dict, Any, Optional

# In-memory cache: {cache_key: (timestamp, data)}
_WEATHER_CACHE: Dict[str, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


class WeatherService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("WEATHER_API_KEY", "")

    def _get_cache_key(self, lat: float, lon: float) -> str:
        return f"{round(lat, 2)}_{round(lon, 2)}"

    async def get_current_weather(self, lat: float = 12.97, lon: float = 77.59) -> Dict[str, Any]:
        """
        Fetches current weather for given latitude and longitude.
        Falls back to documented local development data if no key or network fails.
        """
        cache_key = f"curr_{self._get_cache_key(lat, lon)}"
        now = time.time()
        if cache_key in _WEATHER_CACHE:
            ts, data = _WEATHER_CACHE[cache_key]
            if now - ts < CACHE_TTL_SECONDS:
                return data

        # If live API key is present, attempt real HTTP fetch
        if self.api_key and len(self.api_key.strip()) > 8:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.api_key}&units=metric"
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        raw = resp.json()
                        result = {
                            "is_fallback": False,
                            "data_source": "OpenWeatherMap Live API",
                            "temperature_c": raw["main"]["temp"],
                            "temp_min_c": raw["main"]["temp_min"],
                            "temp_max_c": raw["main"]["temp_max"],
                            "humidity_pct": raw["main"]["humidity"],
                            "wind_speed_ms": raw["wind"]["speed"],
                            "wind_direction_deg": raw["wind"].get("deg", 0),
                            "cloudiness_pct": raw["clouds"]["all"],
                            "condition": raw["weather"][0]["main"],
                            "description": raw["weather"][0]["description"],
                            "icon": raw["weather"][0].get("icon", "02d"),
                            "rainfall_last_hour_mm": raw.get("rain", {}).get("1h", 0.0),
                            "pressure_hpa": raw["main"]["pressure"],
                            "timestamp": time.time(),
                        }
                        _WEATHER_CACHE[cache_key] = (now, result)
                        return result
            except Exception as e:
                # Log and gracefully fallback with explicit badge
                print(f"[WeatherService] Live API call failed, using local development fallback: {e}")

        # Local development fallback (explicitly badged)
        fallback_data = {
            "is_fallback": True,
            "data_source": "Local development fallback (AgriEdge Agro-Met Simulator)",
            "temperature_c": 28.4,
            "temp_min_c": 22.0,
            "temp_max_c": 31.5,
            "humidity_pct": 68.0,
            "wind_speed_ms": 2.8,
            "wind_direction_deg": 240,
            "cloudiness_pct": 55,
            "condition": "Clouds",
            "description": "Scattered monsoon clouds",
            "icon": "03d",
            "rainfall_last_hour_mm": 0.0,
            "pressure_hpa": 1010.0,
            "timestamp": time.time(),
        }
        _WEATHER_CACHE[cache_key] = (now, fallback_data)
        return fallback_data

    async def get_forecast(self, lat: float = 12.97, lon: float = 77.59) -> Dict[str, Any]:
        """
        Fetches 5-day / 7-day weather and precipitation forecast.
        """
        cache_key = f"fc_{self._get_cache_key(lat, lon)}"
        now = time.time()
        if cache_key in _WEATHER_CACHE:
            ts, data = _WEATHER_CACHE[cache_key]
            if now - ts < CACHE_TTL_SECONDS:
                return data

        if self.api_key and len(self.api_key.strip()) > 8:
            try:
                url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={self.api_key}&units=metric"
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        raw = resp.json()
                        daily_map = {}
                        for entry in raw.get("list", []):
                            dt_txt = entry["dt_txt"].split(" ")[0]
                            rain_3h = entry.get("rain", {}).get("3h", 0.0)
                            if dt_txt not in daily_map:
                                daily_map[dt_txt] = {
                                    "date": dt_txt,
                                    "temp_min": entry["main"]["temp_min"],
                                    "temp_max": entry["main"]["temp_max"],
                                    "humidity": entry["main"]["humidity"],
                                    "rain_mm": rain_3h,
                                    "pop": entry.get("pop", 0.0) * 100,
                                    "condition": entry["weather"][0]["main"],
                                }
                            else:
                                daily_map[dt_txt]["rain_mm"] += rain_3h
                                daily_map[dt_txt]["temp_min"] = min(daily_map[dt_txt]["temp_min"], entry["main"]["temp_min"])
                                daily_map[dt_txt]["temp_max"] = max(daily_map[dt_txt]["temp_max"], entry["main"]["temp_max"])
                        
                        days_list = list(daily_map.values())[:5]
                        rain_24h = days_list[0]["rain_mm"] if len(days_list) > 0 else 0.0
                        rain_48h = days_list[1]["rain_mm"] if len(days_list) > 1 else 0.0

                        result = {
                            "is_fallback": False,
                            "data_source": "OpenWeatherMap Live API",
                            "rain_24h_mm": round(rain_24h, 1),
                            "rain_48h_mm": round(rain_48h, 1),
                            "forecast_days": days_list,
                        }
                        _WEATHER_CACHE[cache_key] = (now, result)
                        return result
            except Exception as e:
                print(f"[WeatherService] Forecast API error, fallback active: {e}")

        # Local development fallback forecast with realistic agricultural patterns
        days_fallback = [
            {"date": "Day 1 (Today)", "temp_min": 22.1, "temp_max": 31.0, "humidity": 70, "rain_mm": 18.5, "pop": 80, "condition": "Rain"},
            {"date": "Day 2 (Tomorrow)", "temp_min": 21.8, "temp_max": 29.5, "humidity": 75, "rain_mm": 8.0, "pop": 65, "condition": "Showers"},
            {"date": "Day 3", "temp_min": 23.0, "temp_max": 32.0, "humidity": 60, "rain_mm": 1.2, "pop": 25, "condition": "Partly Cloudy"},
            {"date": "Day 4", "temp_min": 23.5, "temp_max": 33.2, "humidity": 52, "rain_mm": 0.0, "pop": 10, "condition": "Clear"},
            {"date": "Day 5", "temp_min": 24.0, "temp_max": 34.0, "humidity": 48, "rain_mm": 0.0, "pop": 5, "condition": "Sunny"}
        ]
        fallback_data = {
            "is_fallback": True,
            "data_source": "Local development fallback (AgriEdge Agro-Met Simulator)",
            "rain_24h_mm": 18.5,
            "rain_48h_mm": 8.0,
            "forecast_days": days_fallback
        }
        _WEATHER_CACHE[cache_key] = (now, fallback_data)
        return fallback_data


weather_service = WeatherService()
