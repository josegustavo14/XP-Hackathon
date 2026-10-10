import { useEffect, useState } from "react";
import GhostFibers from "./GhostFibers.jsx";
import { useStore } from "../../lib/store.js";

const readVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const DESKTOP = "(min-width: 1024px)";

function useDesktop() {
  const [match, setMatch] = useState(() => window.matchMedia?.(DESKTOP).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP);
    if (!mq) return;
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return match;
}

// Ghost Fibers com as cores do tema: dourado intenso no escuro e dourado claro no claro.
// Só no desktop: no celular nem é montado. variant="dark" força a versão escura
// (ex.: painel escuro do login, nos dois temas).
export default function GoldFibers({ variant = "theme", ...props }) {
  const { theme } = useStore();
  const desktop = useDesktop();
  const light = variant === "theme" && theme === "light";
  const [colors, setColors] = useState(null);

  // Lê os tokens depois que a classe .dark do tema já foi aplicada.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setColors(
        variant === "dark"
          ? { glow: readVar("--color-gold"), line: undefined }
          : { glow: readVar("--color-fiber-glow"), line: readVar("--color-fiber-line") }
      )
    );
    return () => cancelAnimationFrame(id);
  }, [theme, variant]);

  if (!desktop || !colors?.glow) return null;
  return <GhostFibers glowColor={colors.glow} lineColor={colors.line} lightMode={light} {...props} />;
}
