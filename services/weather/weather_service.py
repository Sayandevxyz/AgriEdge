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

    async def _fetch_open_meteo_current(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Fetches live current weather from Open-Meteo (open-source, zero API-key needed).
        """
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m"
                f"&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
            )
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    curr = data.get("current", {})
                    daily = data.get("daily", {})
                    wcode = curr.get("weather_code", 0)
                    
                    # WMO code mapping
                    cond_map = {
                        0: ("Clear", "Clear sky"),
                        1: ("Clear", "Mainly clear"),
                        2: ("Clouds", "Partly cloudy"),
                        3: ("Clouds", "Overcast"),
                        45: ("Fog", "Foggy"),
                        48: ("Fog", "Depositing rime fog"),
                        51: ("Drizzle", "Light drizzle"),
                        53: ("Drizzle", "Moderate drizzle"),
                        55: ("Drizzle", "Dense drizzle"),
                        61: ("Rain", "Slight rain"),
                        63: ("Rain", "Moderate rain"),
                        65: ("Rain", "Heavy rain"),
                        80: ("Rain", "Slight rain showers"),
                        81: ("Rain", "Moderate rain showers"),
                        82: ("Rain", "Violent rain showers"),
                        95: ("Thunderstorm", "Thunderstorm with rain")
                    }
                    condition, desc = cond_map.get(wcode, ("Clouds", "Scattered clouds"))
                    t_min = daily.get("temperature_2m_min", [curr.get("temperature_2m", 25.0)])[0]
                    t_max = daily.get("temperature_2m_max", [curr.get("temperature_2m", 28.0)])[0]

                    return {
                        "is_fallback": False,
                        "data_source": "Open-Meteo Live Agro-Met API",
                        "temperature_c": round(curr.get("temperature_2m", 25.0), 1),
                        "temp_min_c": round(t_min, 1),
                        "temp_max_c": round(t_max, 1),
                        "humidity_pct": float(curr.get("relative_humidity_2m", 65)),
                        "wind_speed_ms": round(float(curr.get("wind_speed_10m", 2.5)) / 3.6, 2),  # km/h to m/s
                        "wind_direction_deg": int(curr.get("wind_direction_10m", 180)),
                        "cloudiness_pct": int(curr.get("cloud_cover", 30)),
                        "condition": condition,
                        "description": desc,
                        "icon": "02d" if condition in ["Clear", "Clouds"] else "10d",
                        "rainfall_last_hour_mm": float(curr.get("precipitation", 0.0)),
                        "pressure_hpa": round(float(curr.get("pressure_msl", 1013.0)), 1),
                        "timestamp": time.time(),
                    }
        except Exception as e:
            print(f"[WeatherService] Open-Meteo current error: {e}")
        return None

    async def _fetch_open_meteo_forecast(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Fetches live 7-day agricultural precipitation and temperature forecast from Open-Meteo.
        """
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"
                f"&timezone=auto"
            )
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    daily = data.get("daily", {})
                    times = daily.get("time", [])
                    p_sums = daily.get("precipitation_sum", [])
                    p_probs = daily.get("precipitation_probability_max", [])
                    t_mins = daily.get("temperature_2m_min", [])
                    t_maxs = daily.get("temperature_2m_max", [])
                    w_codes = daily.get("weather_code", [])

                    days_list = []
                    for i in range(min(5, len(times))):
                        wcode = w_codes[i] if i < len(w_codes) else 0
                        cond = "Rain" if wcode >= 51 else ("Clouds" if wcode in [2, 3] else "Clear")
                        days_list.append({
                            "date": times[i],
                            "temp_min": t_mins[i] if i < len(t_mins) else 20.0,
                            "temp_max": t_maxs[i] if i < len(t_maxs) else 30.0,
                            "humidity": 65,
                            "rain_mm": round(float(p_sums[i]), 1) if i < len(p_sums) else 0.0,
                            "pop": int(p_probs[i]) if i < len(p_probs) and p_probs[i] is not None else 20,
                            "condition": cond,
                        })

                    rain_24h = days_list[0]["rain_mm"] if len(days_list) > 0 else 0.0
                    rain_48h = days_list[1]["rain_mm"] if len(days_list) > 1 else 0.0

                    return {
                        "is_fallback": False,
                        "data_source": "Open-Meteo Live Agro-Met API",
                        "rain_24h_mm": round(rain_24h, 1),
                        "rain_48h_mm": round(rain_48h, 1),
                        "forecast_days": days_list,
                    }
        except Exception as e:
            print(f"[WeatherService] Open-Meteo forecast error: {e}")
        return None

    async def get_current_weather(self, lat: float = 12.97, lon: float = 77.59) -> Dict[str, Any]:
        """
        Fetches current weather for given latitude and longitude.
        Tries OpenWeatherMap Live API, falls back to Open-Meteo Live API, then local simulator if all fail.
        """
        cache_key = f"curr_{self._get_cache_key(lat, lon)}"
        now = time.time()
        if cache_key in _WEATHER_CACHE:
            ts, data = _WEATHER_CACHE[cache_key]
            if now - ts < CACHE_TTL_SECONDS:
                return data

        # 1. If live API key is present, attempt real OpenWeatherMap HTTP fetch
        if self.api_key and len(self.api_key.strip()) > 8:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.api_key}&units=metric"
                async with httpx.AsyncClient(timeout=5.0) as client:
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
                print(f"[WeatherService] OpenWeatherMap call failed: {e}")

        # 2. Live Open-Meteo API fallback (No key required, always real-time)
        om_result = await self._fetch_open_meteo_current(lat, lon)
        if om_result:
            _WEATHER_CACHE[cache_key] = (now, om_result)
            return om_result

        # 3. Local development fallback (explicitly badged if offline)
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
        Tries OpenWeatherMap Live API, falls back to Open-Meteo Live API, then local simulator.
        """
        cache_key = f"fc_{self._get_cache_key(lat, lon)}"
        now = time.time()
        if cache_key in _WEATHER_CACHE:
            ts, data = _WEATHER_CACHE[cache_key]
            if now - ts < CACHE_TTL_SECONDS:
                return data

        # 1. Try OpenWeatherMap Live API
        if self.api_key and len(self.api_key.strip()) > 8:
            try:
                url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={self.api_key}&units=metric"
                async with httpx.AsyncClient(timeout=5.0) as client:
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
                print(f"[WeatherService] OpenWeatherMap forecast error: {e}")

        # 2. Live Open-Meteo API fallback (No key required, always real-time)
        om_forecast = await self._fetch_open_meteo_forecast(lat, lon)
        if om_forecast:
            _WEATHER_CACHE[cache_key] = (now, om_forecast)
            return om_forecast

        # 3. Local development fallback forecast with realistic agricultural patterns
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
