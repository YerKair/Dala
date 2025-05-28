import AsyncStorage from "@react-native-async-storage/async-storage";

interface GeocodingResult {
  name: string;
  fullAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Cache keys
const GEOCODING_CACHE_KEY = "geocoding_cache";
const GEOCODING_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export class GeocodingService {
  private static NOMINATIM_API = "https://nominatim.openstreetmap.org";
  private static CACHE_VERSION = "1";

  // Fallback coordinates for common locations in Almaty
  private static FALLBACK_LOCATIONS: GeocodingResult[] = [
    {
      name: "Достык 91",
      fullAddress: "Достык 91, Алматы, Казахстан",
      coordinates: { latitude: 43.234525, longitude: 76.956627 },
    },
    {
      name: "Манаса 34/1",
      fullAddress: "Манаса 34/1, Алматы, Казахстан",
      coordinates: { latitude: 43.22551, longitude: 76.906395 },
    },
    {
      name: "Абая 44",
      fullAddress: "Абая 44, Алматы, Казахстан",
      coordinates: { latitude: 43.238949, longitude: 76.889709 },
    },
  ];

  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string> {
    try {
      // Check cache first
      const cachedResult = await this.getCachedAddress(latitude, longitude);
      if (cachedResult) {
        console.log("Using cached geocoding result");
        return cachedResult;
      }

      // Try primary geocoding service
      const result = await this.nominatimReverseGeocode(latitude, longitude);
      if (result) {
        // Cache the result
        await this.cacheAddress(latitude, longitude, result);
        return result;
      }

      // If primary service fails, find nearest fallback location
      const nearestLocation = this.findNearestFallbackLocation(
        latitude,
        longitude
      );
      return nearestLocation.name;
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return this.generateFallbackAddress(latitude, longitude);
    }
  }

  static async searchAddresses(query: string): Promise<GeocodingResult[]> {
    try {
      // Check cache first
      const cachedResults = await this.getCachedSearch(query);
      if (cachedResults) {
        console.log("Using cached search results");
        return cachedResults;
      }

      const searchQuery = `${query}, Almaty, Kazakhstan`;
      const response = await fetch(
        `${this.NOMINATIM_API}/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "DalaTaxiApp/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const results = data.map((item: any) => ({
        name: item.display_name.split(",").slice(0, 2).join(", "),
        fullAddress: item.display_name,
        coordinates: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
      }));

      // Cache the results
      await this.cacheSearchResults(query, results);
      return results;
    } catch (error) {
      console.error("Error searching addresses:", error);
      // Return fallback locations on error
      return this.FALLBACK_LOCATIONS;
    }
  }

  private static async nominatimReverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.NOMINATIM_API}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "DalaTaxiApp/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.display_name) {
        const addressParts = data.display_name.split(",");
        return addressParts.slice(0, 2).join(", ");
      }
      return null;
    } catch (error) {
      console.error("Error in Nominatim reverse geocoding:", error);
      return null;
    }
  }

  private static findNearestFallbackLocation(
    latitude: number,
    longitude: number
  ) {
    let nearestLocation = this.FALLBACK_LOCATIONS[0];
    let minDistance = this.calculateDistance(
      { latitude, longitude },
      this.FALLBACK_LOCATIONS[0].coordinates
    );

    for (const location of this.FALLBACK_LOCATIONS) {
      const distance = this.calculateDistance(
        { latitude, longitude },
        location.coordinates
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    }

    return nearestLocation;
  }

  private static generateFallbackAddress(
    latitude: number,
    longitude: number
  ): string {
    // Round coordinates to 6 decimal places for display
    const lat = latitude.toFixed(6);
    const lon = longitude.toFixed(6);
    return `Location (${lat}, ${lon})`;
  }

  private static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    const lat1 = this.toRad(point1.latitude);
    const lat2 = this.toRad(point2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private static async getCachedAddress(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const cacheKey = `${GEOCODING_CACHE_KEY}_${
        this.CACHE_VERSION
      }_${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { address, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < GEOCODING_CACHE_EXPIRY) {
          return address;
        }
      }
      return null;
    } catch (error) {
      console.error("Error reading from geocoding cache:", error);
      return null;
    }
  }

  private static async cacheAddress(
    latitude: number,
    longitude: number,
    address: string
  ): Promise<void> {
    try {
      const cacheKey = `${GEOCODING_CACHE_KEY}_${
        this.CACHE_VERSION
      }_${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          address,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error caching geocoding result:", error);
    }
  }

  private static async getCachedSearch(
    query: string
  ): Promise<GeocodingResult[] | null> {
    try {
      const cacheKey = `${GEOCODING_CACHE_KEY}_search_${this.CACHE_VERSION}_${query}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { results, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < GEOCODING_CACHE_EXPIRY) {
          return results;
        }
      }
      return null;
    } catch (error) {
      console.error("Error reading from search cache:", error);
      return null;
    }
  }

  private static async cacheSearchResults(
    query: string,
    results: GeocodingResult[]
  ): Promise<void> {
    try {
      const cacheKey = `${GEOCODING_CACHE_KEY}_search_${this.CACHE_VERSION}_${query}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          results,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error caching search results:", error);
    }
  }
}
