export type UnitId =
  | "201" | "202" | "203" | "204"
  | "301" | "302" | "303" | "304"
  | "401" | "402" | "403" | "404"
  | "501" | "502" | "PH1" | "PH2";
export type ViewId = "front" | "rear";
export type AmenityId = "lobby" | "rooftop";
export type UnitStatus = "Disponible" | "Apartada" | "Vendida";
export type ExperienceView = "interior" | "plan" | "tour";
export type PlanView = "color" | "clean" | "dimensions";
export type RenderSourceId = "401" | "402" | "403" | "404" | "PH1" | "PH2";
export type Language = "es" | "en";
export type Currency = "MXN" | "USD";
export type TouchIntroStep = "presentation" | "guides";

export const planViews: PlanView[] = ["color", "clean", "dimensions"];
export const MOBILE_GESTURE_MEDIA = "(max-width: 767px), (max-width: 1199px) and (orientation: landscape) and (max-height: 600px)";

export type Residence = {
  id: UnitId;
  code: string;
  name: string;
  eyebrow: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  level: number;
  status: UnitStatus;
  description: string;
  images: string[];
};

export type Amenity = {
  id: AmenityId;
  label: Record<Language, string>;
  eyebrow: Record<Language, string>;
  description: Record<Language, string>;
  images: string[];
};

export type GeneralPlan = {
  id: string;
  label: Record<Language, string>;
  src: string;
};

export type VirtualTour = {
  src: string;
  viewSource: RenderSourceId;
};


