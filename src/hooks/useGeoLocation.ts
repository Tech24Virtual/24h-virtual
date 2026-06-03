import { useState, useEffect } from "react";
import { cities, type City } from "@/data/cities";

interface GeoLocationResult {
  city: City | null;
  detectedCityName: string | null;
  country: string | null;
  isLoading: boolean;
  error: string | null;
  isDismissed: boolean;
  dismiss: () => void;
}

const STORAGE_KEY = "geo_location_dismissed";
const CACHE_KEY = "geo_location_cache";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Find matching city from our supported cities list
const findMatchingCity = (cityName: string, countryCode: string): City | null => {
  const normalizedName = cityName.toLowerCase().trim();
  
  // Map country codes to our format
  const country = countryCode === "US" ? "US" : countryCode === "CA" ? "CA" : null;
  if (!country) return null;
  
  // Try exact match first
  const exactMatch = cities.find(
    c => c.name.toLowerCase() === normalizedName && c.country === country
  );
  if (exactMatch) return exactMatch;
  
  // Try partial match (for cities like "New York City" -> "New York")
  const partialMatch = cities.find(
    c => normalizedName.includes(c.name.toLowerCase()) && c.country === country
  );
  if (partialMatch) return partialMatch;
  
  // Try matching by common variations
  const variations: Record<string, string> = {
    "nyc": "new-york",
    "la": "los-angeles",
    "dc": "washington-dc",
    "sf": "san-francisco",
    "philly": "philadelphia",
  };
  
  const slug = variations[normalizedName];
  if (slug) {
    return cities.find(c => c.slug === slug && c.country === country) || null;
  }
  
  return null;
};

export function useGeoLocation(): GeoLocationResult {
  const [city, setCity] = useState<City | null>(null);
  const [detectedCityName, setDetectedCityName] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed within 24 hours
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
        setIsDismissed(true);
        setIsLoading(false);
        return;
      } else {
        // Expired - remove old dismissal
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Check for cached result (use localStorage for persistence)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setDetectedCityName(data.cityName);
        setCountry(data.countryCode);
        const matchedCity = findMatchingCity(data.cityName, data.countryCode);
        setCity(matchedCity);
        setIsLoading(false);
        return;
      } catch {
        // Invalid cache, proceed with fetch
      }
    }

    // Fetch location from IP
    const fetchLocation = async () => {
      try {
        // Try multiple geolocation APIs with fallback
        let data;
        
        // First try ipwho.is (CORS-friendly, no API key needed, reliable)
        try {
          const response = await fetch("https://ipwho.is/", {
            headers: { Accept: "application/json" },
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success !== false) {
              data = {
                city: result.city,
                country_code: result.country_code,
              };
            }
          }
        } catch {
          // Primary API failed, continue to fallback
        }
        
        // Fallback: silently fail and skip geolocation feature
        if (!data) {
          // Geolocation is a nice-to-have feature, not critical
          // Skip silently if all APIs fail
          setIsLoading(false);
          return;
        }
        
        if (data.error) {
          throw new Error(data.reason || "Location detection failed");
        }
        
        const cityName = data.city || "";
        const countryCode = data.country_code || "";
        
        // Cache the result in localStorage for persistence
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ cityName, countryCode })
        );
        
        setDetectedCityName(cityName);
        setCountry(countryCode);
        
        // Find matching supported city
        const matchedCity = findMatchingCity(cityName, countryCode);
        setCity(matchedCity);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, []);

  const dismiss = () => {
    // Store timestamp for 24-hour expiry
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  return {
    city,
    detectedCityName,
    country,
    isLoading,
    error,
    isDismissed,
    dismiss,
  };
}
