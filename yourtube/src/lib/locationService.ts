export interface UserLocation {
  city: string;
  region: string;
  country: string;
}

export const SOUTH_INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

const CACHE_KEY = "yourtube_location";

// IP-based geolocation with two free providers and a session cache so we
// don't burn through rate limits on every page load.
export const getUserLocation = async (): Promise<UserLocation | null> => {
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }

  let location: UserLocation | null = null;

  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data.city) {
        location = {
          city: data.city,
          region: data.region || "",
          country: data.country_name || "",
        };
      }
    }
  } catch {
    // fall through to backup provider
  }

  if (!location) {
    try {
      const res = await fetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        if (data.success !== false && data.city) {
          location = {
            city: data.city,
            region: data.region || "",
            country: data.country || "",
          };
        }
      }
    } catch {
      // both providers failed
    }
  }

  if (location && typeof window !== "undefined") {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
  }
  return location;
};

export const isSouthIndia = (location: UserLocation | null): boolean => {
  if (!location) return false;
  return (
    location.country.toLowerCase().includes("india") &&
    SOUTH_INDIAN_STATES.some(
      (s) => s.toLowerCase() === location.region.toLowerCase()
    )
  );
};
