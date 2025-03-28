import { useState, useEffect } from "react";
import type { User } from "@/hooks/useMongoDB";

const LOCAL_STORAGE_KEY = "user_data";

export function useLocalStorage() {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on first render
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: User = JSON.parse(stored);
        setUser(parsed);
      } catch (err) {
        console.error("Failed to parse user from localStorage:", err);
      }
    }
  }, []);

  // Save user to localStorage
  const saveUser = (newUser: User) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
    } catch (err) {
      console.error("Failed to save user to localStorage:", err);
    }
  };

  // Clear user from localStorage
  const clearUser = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUser(null);
  };

  return {
    user, // current user from local storage
    saveUser, // function to save user
    clearUser, // function to remove user
  };
}
