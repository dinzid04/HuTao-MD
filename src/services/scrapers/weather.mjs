const BASE_URL = 'https://weatherapi.market.xiaomi.com';
const APP_KEY = 'weather20151024';
const SIGN = 'zUFJoAR2ZVrDy1vF3D07';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36';

export const WEATHER_CODES = {
  '0': { en: 'Sunny / Clear', id: 'Cerah' },
  '1': { en: 'Cloudy', id: 'Berawan' },
  '2': { en: 'Overcast', id: 'Mendung' },
  '3': { en: 'Shower', id: 'Hujan Gerimis / Singkat' },
  '4': { en: 'Thundershower', id: 'Hujan Petir' },
  '5': { en: 'Hail', id: 'Hujan Es' },
  '6': { en: 'Sleet', id: 'Hujan Es Campur Salju' },
  '7': { en: 'Light Rain', id: 'Hujan Ringan' },
  '8': { en: 'Moderate Rain', id: 'Hujan Sedang' },
  '9': { en: 'Heavy Rain', id: 'Hujan Lebat' },
  '10': { en: 'Storm', id: 'Badai Hujan' },
  '11': { en: 'Heavy Storm', id: 'Badai Lebat' },
  '12': { en: 'Severe Storm', id: 'Badai Sangat Lebat' },
  '13': { en: 'Snow Flurries', id: 'Salju Ringan' },
  '14': { en: 'Light Snow', id: 'Salju Ringan' },
  '15': { en: 'Moderate Snow', id: 'Salju Sedang' },
  '16': { en: 'Heavy Snow', id: 'Salju Lebat' },
  '17': { en: 'Blizzard', id: 'Badai Salju' },
  '18': { en: 'Fog', id: 'Kabut' },
  '19': { en: 'Freezing Rain', id: 'Hujan Beku' },
  '20': { en: 'Sandstorm', id: 'Badai Pasir' },
  '21': { en: 'Dust', id: 'Debu' },
  '22': { en: 'Haze', id: 'Kabut Asap' },
  '23': { en: 'Floating Dust', id: 'Debu Melayang' },
  '24': { en: 'Sand', id: 'Pasir' },
  '25': { en: 'Severe Sandstorm', id: 'Badai Pasir Hebat' }
};

function getWeatherLabel(code, locale = 'id') {
  const c = String(code);
  const info = WEATHER_CODES[c];
  if (!info) return locale.startsWith('id') ? 'Cerah' : 'Clear';
  return locale.startsWith('id') ? info.id : info.en;
}

function getWindDirectionText(degrees, locale = 'id') {
  const deg = Number(degrees) % 360;
  const directionsEn = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const directionsId = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  const index = Math.round(deg / 45) % 8;
  return locale.startsWith('id') ? directionsId[index] : directionsEn[index];
}

export async function searchCity(name, options = {}) {
  if (!name || typeof name !== 'string') {
    throw new Error('City name string is required');
  }

  const locale = options.locale || 'id_ID';
  const url = `${BASE_URL}/wtr-v3/location/city/search?name=${encodeURIComponent(name.trim())}&locale=${encodeURIComponent(locale)}&appKey=${APP_KEY}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to search city (${res.status})`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((c) => ({
      name: c.name,
      affiliation: c.affiliation,
      locationKey: c.locationKey || c.key,
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      timeZoneShift: c.timeZoneShift || 0
    }));
  }

  return [];
}

export async function getCityByGeo(latitude, longitude, options = {}) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Valid latitude and longitude numbers are required');
  }

  const locale = options.locale || 'id_ID';
  const url = `${BASE_URL}/wtr-v3/location/city/geo?latitude=${lat}&longitude=${lon}&locale=${encodeURIComponent(locale)}&appKey=${APP_KEY}&sign=${SIGN}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve coordinates (${res.status})`);
  }

  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    const c = data[0];
    return {
      name: c.name,
      affiliation: c.affiliation,
      locationKey: c.locationKey || c.key,
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      timeZoneShift: c.timeZoneShift || 0
    };
  }

  return null;
}

export async function getHotCities(options = {}) {
  const locale = options.locale || 'id_ID';
  const url = `${BASE_URL}/wtr-v3/location/city/hots?locale=${encodeURIComponent(locale)}&appKey=${APP_KEY}&sign=${SIGN}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch hot cities (${res.status})`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((c) => ({
      name: c.name,
      affiliation: c.affiliation,
      locationKey: c.locationKey || c.key,
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      timeZoneShift: c.timeZoneShift || 0
    }));
  }

  return [];
}

export async function getWeather(target, options = {}) {
  let location = null;
  const locale = options.locale || 'id_ID';

  if (typeof target === 'string') {
    const results = await searchCity(target, { locale });
    if (!results || results.length === 0) {
      throw new Error(`City not found: ${target}`);
    }
    location = results[0];
  } else if (typeof target === 'object' && target !== null) {
    if (target.latitude !== undefined && target.longitude !== undefined && target.locationKey) {
      location = target;
    } else if (target.latitude !== undefined && target.longitude !== undefined) {
      const geo = await getCityByGeo(target.latitude, target.longitude, { locale });
      if (!geo) {
        throw new Error(`Could not resolve location for coordinates ${target.latitude}, ${target.longitude}`);
      }
      location = geo;
    } else if (target.name) {
      const results = await searchCity(target.name, { locale });
      if (!results || results.length === 0) {
        throw new Error(`City not found: ${target.name}`);
      }
      location = results[0];
    }
  }

  if (!location) {
    throw new Error('Valid target city name, coordinates, or location object is required');
  }

  const days = options.days || 15;
  const query = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    locationKey: location.locationKey,
    isLocated: 'true',
    days: String(days),
    locale,
    isGlobal: 'true',
    appKey: APP_KEY,
    sign: SIGN
  });

  const url = `${BASE_URL}/wtr-v3/weather/all?${query.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch weather data (${res.status})`);
  }

  const data = await res.json();
  const current = data.current || {};
  const forecastDaily = data.forecastDaily || {};
  const forecastHourly = data.forecastHourly || {};

  const weatherCode = String(current.weather || '0');
  const windDirDeg = current.wind?.direction?.value || '0';

  const dailyList = [];
  const dailyTemps = forecastDaily.temperature?.value || [];
  const sunTimes = forecastDaily.sunRiseSet?.value || [];
  const rainProbs = forecastDaily.precipitationProbability?.value || [];
  const weatherDayCodes = forecastDaily.weather?.value || [];

  for (let i = 0; i < dailyTemps.length; i++) {
    const tempItem = dailyTemps[i] || {};
    const sunItem = sunTimes[i] || {};
    const dayCode = String(weatherDayCodes[i]?.from || weatherDayCodes[i] || weatherCode);
    const nightCode = String(weatherDayCodes[i]?.to || dayCode);

    dailyList.push({
      dayIndex: i,
      tempMax: tempItem.from ? parseInt(tempItem.from, 10) : null,
      tempMin: tempItem.to ? parseInt(tempItem.to, 10) : null,
      conditionDay: {
        code: dayCode,
        text: getWeatherLabel(dayCode, locale)
      },
      conditionNight: {
        code: nightCode,
        text: getWeatherLabel(nightCode, locale)
      },
      sunrise: sunItem.from || null,
      sunset: sunItem.to || null,
      precipitationProbability: rainProbs[i] ? parseInt(rainProbs[i], 10) : 0
    });
  }

  const hourlyList = [];
  const hourlyTemps = forecastHourly.temperature?.value || [];
  const hourlyTimes = forecastHourly.temperature?.pubTime || [];
  const hourlyWeatherCodes = forecastHourly.weather?.value || [];

  for (let i = 0; i < hourlyTemps.length; i++) {
    const hCode = String(hourlyWeatherCodes[i] || weatherCode);
    hourlyList.push({
      time: hourlyTimes[i] || null,
      temperature: hourlyTemps[i] ? parseInt(hourlyTemps[i], 10) : null,
      condition: {
        code: hCode,
        text: getWeatherLabel(hCode, locale)
      }
    });
  }

  return {
    success: true,
    location: {
      name: location.name,
      affiliation: location.affiliation,
      locationKey: location.locationKey,
      latitude: location.latitude,
      longitude: location.longitude,
      timeZoneShift: location.timeZoneShift || 0
    },
    current: {
      temperature: current.temperature?.value ? parseInt(current.temperature.value, 10) : null,
      feelsLike: current.feelsLike?.value ? parseInt(current.feelsLike.value, 10) : null,
      condition: {
        code: weatherCode,
        text: getWeatherLabel(weatherCode, locale)
      },
      humidity: current.humidity?.value ? parseInt(current.humidity.value, 10) : null,
      pressure: current.pressure?.value ? parseInt(current.pressure.value, 10) : null,
      uvIndex: current.uvIndex ? parseInt(current.uvIndex, 10) : null,
      visibilityKm: current.visibility?.value ? parseFloat(current.visibility.value) : null,
      wind: {
        speedKmh: current.wind?.speed?.value ? parseFloat(current.wind.speed.value) : null,
        directionDegrees: parseInt(windDirDeg, 10),
        directionText: getWindDirectionText(windDirDeg, locale)
      },
      pubTime: current.pubTime || null
    },
    forecastDaily: dailyList,
    forecastHourly: hourlyList,
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
    updateTime: data.updateTime || new Date().toISOString()
  };
}

export default {
  WEATHER_CODES,
  searchCity,
  getCityByGeo,
  getHotCities,
  getWeather
};
