import type {Residence, Language, Currency, UnitStatus} from "./types";

export function residenceName(unit: Residence, language: Language) {
  if (unit.id.startsWith("PH")) return `Penthouse ${unit.id}`;
  return `${language === "es" ? "Residencia" : "Residence"} ${unit.id}`;
}

export function residenceEyebrow(unit: Residence, language: Language) {
  if (language === "es") return unit.beds === 1 ? "Una recámara" : "Dos recámaras";
  return unit.beds === 1 ? "One bedroom" : "Two bedrooms";
}

export function residenceDescription(unit: Residence, language: Language) {
  if (unit.id.startsWith("PH")) {
    return language === "es"
      ? "Penthouse de dos recámaras y dos baños en el nivel superior, debajo del roof con alberca."
      : "Two-bedroom, two-bathroom penthouse on the upper level, directly below the rooftop pool.";
  }
  return language === "es"
    ? `Residencia de ${unit.beds === 1 ? "una recámara" : "dos recámaras"} con ${unit.area.toFixed(2)} m² de área total en el nivel ${unit.level}.`
    : `${unit.beds === 1 ? "One-bedroom residence" : "Two-bedroom residence"} with ${unit.area.toFixed(2)} m² of total area on level ${unit.level}.`;
}

export function formatPrice(valueUsd: number, currency: Currency, mxnPerUsd: number, language: Language) {
  const value = currency === "MXN" ? valueUsd * mxnPerUsd : valueUsd;
  return `$${new Intl.NumberFormat(language === "es" ? "es-MX" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value)} ${currency}`;
}

export function statusLabel(status: UnitStatus, language: Language) {
  if (language === "es") return status;
  if (status === "Apartada") return "Reserved";
  if (status === "Vendida") return "Sold";
  return "Available";
}

export function statusClass(status: UnitStatus) {
  if (status === "Apartada") return "is-reserved";
  if (status === "Vendida") return "is-sold";
  return "is-available";
}


