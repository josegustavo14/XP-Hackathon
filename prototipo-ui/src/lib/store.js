import { createContext, useContext } from "react";

// Estado global do protótipo (navegação, alertas, anotações, conversa do copiloto).
export const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

// localStorage pode falhar (janela privada, bloqueio); o app funciona sem ele.
export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem persistência */
  }
}
