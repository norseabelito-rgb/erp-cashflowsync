"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface DisplayPreferences {
  compactMode: boolean;
  showAvatars: boolean;
}

interface DisplayContextType {
  preferences: DisplayPreferences;
  setCompactMode: (value: boolean) => void;
  setShowAvatars: (value: boolean) => void;
  isLoading: boolean;
}

const DEFAULT_PREFERENCES: DisplayPreferences = {
  compactMode: false,
  showAvatars: true,
};

const DisplayContext = createContext<DisplayContextType>({
  preferences: DEFAULT_PREFERENCES,
  setCompactMode: () => {},
  setShowAvatars: () => {},
  isLoading: true,
});

export function DisplayProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Încarcă preferințele din API
  useEffect(() => {
    async function loadPreferences() {
      if (status === "authenticated") {
        try {
          const res = await fetch("/api/user/preferences");
          if (res.ok) {
            const data = await res.json();
            if (data.preferences?.display) {
              setPreferences({
                compactMode: data.preferences.display.compactMode ?? false,
                showAvatars: data.preferences.display.showAvatars ?? true,
              });
            }
          }
        } catch (error) {
          console.error("Error loading preferences:", error);
        }
      }
      setIsLoading(false);
    }

    if (status !== "loading") {
      loadPreferences();
    }
  }, [status]);

  // Aplică clasa compact pe body
  useEffect(() => {
    if (preferences.compactMode) {
      document.body.classList.add("compact-mode");
    } else {
      document.body.classList.remove("compact-mode");
    }
  }, [preferences.compactMode]);

  const updatePreference = async (key: keyof DisplayPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    // Salvează în API
    try {
      const res = await fetch("/api/user/preferences");
      const current = res.ok ? await res.json() : { preferences: {} };
      
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...current.preferences,
            display: newPrefs,
          },
        }),
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  return (
    <DisplayContext.Provider
      value={{
        preferences,
        setCompactMode: (v) => updatePreference("compactMode", v),
        setShowAvatars: (v) => updatePreference("showAvatars", v),
        isLoading,
      }}
    >
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay() {
  return useContext(DisplayContext);
}
