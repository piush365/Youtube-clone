import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getUserLocation,
  isSouthIndia,
  UserLocation,
} from "./locationService";

interface ThemeContextValue {
  theme: "light" | "dark";
  location: UserLocation | null;
  southIndia: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  location: null,
  southIndia: false,
});

const getISTHour = (): number => {
  const istTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(istTime, 10);
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [southIndia, setSouthIndia] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyTheme = async () => {
      const loc = await getUserLocation();
      if (cancelled) return;
      const south = isSouthIndia(loc);
      const hour = getISTHour();
      // Light theme only between 10:00 and 12:00 IST from South India.
      const light = south && hour >= 10 && hour < 12;
      setLocation(loc);
      setSouthIndia(south);
      setTheme(light ? "light" : "dark");
      document.documentElement.classList.toggle("dark", !light);
    };

    applyTheme();
    // Re-evaluate every minute so the theme flips at the time boundary.
    const interval = setInterval(applyTheme, 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, location, southIndia }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
