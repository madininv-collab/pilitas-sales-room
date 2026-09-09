import defaults from "@/config/contact.json";

export type ContactConfig = { whatsapp: string; email: string; bookingUrl: string };

export function validatedContactUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function contactConfig(value: unknown): ContactConfig {
  const input = value && typeof value === "object" ? value as Partial<ContactConfig> : {};
  const whatsapp = typeof input.whatsapp === "string" && /^[+\d ()-]{7,30}$/.test(input.whatsapp) && /^\d{7,15}$/.test(input.whatsapp.replace(/\D/g, "")) ? input.whatsapp : defaults.whatsapp;
  const email = typeof input.email === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.email) && !/[?&#]/.test(input.email) ? input.email : defaults.email;
  const bookingUrl = typeof input.bookingUrl === "string" ? validatedContactUrl(input.bookingUrl) ?? "" : defaults.bookingUrl;
  return {whatsapp, email, bookingUrl};
}
export const defaultContacts = contactConfig(defaults);
export function whatsappUrl(config: ContactConfig, message: string) {
  return `https://wa.me/${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
