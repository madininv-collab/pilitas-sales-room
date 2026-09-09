import type { UnitId, ViewId, AmenityId, Amenity, GeneralPlan, VirtualTour, RenderSourceId, Language, PlanView, Residence } from "./types";

// Familia 01: el orden A/B es intencional y esta galería se comparte
// exclusivamente entre 201, 301 y 401.
export const family01Gallery = [
  "/media/interiors/family-01-a.webp",
  "/media/interiors/family-01-b.webp",
];
export const gallery402 = ["/media/interiors/3-402.webp", "/media/interiors/4-402.webp"];
export const gallery403 = ["/media/interiors/5-403.webp", "/media/interiors/6-403.webp"];
export const gallery404 = ["/media/interiors/7-404.webp", "/media/interiors/8-404.webp"];
export const galleryPH1 = ["/media/interiors/9-PH1.webp", "/media/interiors/10-PH1.webp", "/media/interiors/11-PH1.webp"];
export const galleryPH2 = ["/media/interiors/12-PH2.webp", "/media/interiors/13-PH2.webp", "/media/interiors/14-PH2.webp"];

export const amenities: Record<AmenityId, Amenity> = {
  lobby: {
    id: "lobby",
    label: { es: "Lobby", en: "Lobby" },
    eyebrow: { es: "Acceso principal", en: "Main entrance" },
    description: {
      es: "Un acceso cálido y privado que recibe a residentes y visitantes en Las Verandas de Olas Altas.",
      en: "A warm, private arrival space welcoming residents and guests at Las Verandas de Olas Altas.",
    },
    images: ["/media/amenities/lobby.webp"],
  },
  rooftop: {
    id: "rooftop",
    label: { es: "Rooftop", en: "Rooftop" },
    eyebrow: { es: "Terraza con alberca", en: "Pool terrace" },
    description: {
      es: "Una terraza elevada con alberca, áreas de descanso y vistas abiertas hacia Puerto Vallarta y el Pacífico.",
      en: "An elevated terrace with a pool, lounge areas, and open views toward Puerto Vallarta and the Pacific.",
    },
    images: [
      "/media/amenities/rooftop-01.webp",
      "/media/amenities/rooftop-02.webp",
      "/media/amenities/rooftop-03.webp",
    ],
  },
};

export const generalPlans: GeneralPlan[] = [
  { id: "basement", label: { es: "Sótano", en: "Basement" }, src: "/media/general-plans/00-basement.webp" },
  { id: "ground-floor", label: { es: "Planta baja", en: "Ground floor" }, src: "/media/general-plans/01-ground-floor.webp" },
  { id: "level-2", label: { es: "Nivel 2", en: "Level 2" }, src: "/media/general-plans/02-level-2.webp" },
  { id: "level-3", label: { es: "Nivel 3", en: "Level 3" }, src: "/media/general-plans/03-level-3.webp" },
  { id: "level-4", label: { es: "Nivel 4", en: "Level 4" }, src: "/media/general-plans/04-level-4.webp" },
  { id: "level-5", label: { es: "Nivel 5", en: "Level 5" }, src: "/media/general-plans/05-level-5.webp" },
  { id: "level-6", label: { es: "Nivel 6", en: "Level 6" }, src: "/media/general-plans/06-level-6.webp" },
  { id: "rooftop", label: { es: "Roof", en: "Rooftop" }, src: "/media/general-plans/07-rooftop.webp" },
];

export const renderSourceByUnit: Record<UnitId, RenderSourceId> = {
  "201": "401",
  "202": "402",
  "203": "403",
  "204": "404",
  "301": "401",
  "302": "402",
  "303": "403",
  "304": "404",
  "401": "401",
  "402": "402",
  "403": "403",
  "404": "404",
  "501": "PH1",
  "502": "PH2",
  PH1: "PH1",
  PH2: "PH2",
};

export const virtualTours: Partial<Record<UnitId, VirtualTour>> = {
  PH1: {
    src: "https://madininv-collab.github.io/recorridos-360/PENTHHOUSE/",
    viewSource: "PH1",
  },
  "501": {
    src: "https://madininv-collab.github.io/recorridos-360/PENTHHOUSE/",
    viewSource: "PH1",
  },
  "201": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20301/",
    viewSource: "401",
  },
  "301": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20301/",
    viewSource: "401",
  },
  "401": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20301/",
    viewSource: "401",
  },
  "202": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20302/",
    viewSource: "402",
  },
  "302": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20302/",
    viewSource: "402",
  },
  "402": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20302/",
    viewSource: "402",
  },
  "204": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20304/",
    viewSource: "404",
  },
  "304": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20304/",
    viewSource: "404",
  },
  "404": {
    src: "https://madininv-collab.github.io/recorridos-360/UNIDAD%20304/",
    viewSource: "404",
  },
};

export function renderSourceLabel(id: RenderSourceId, language: Language) {
  return id.startsWith("PH") ? `Penthouse ${id}` : `${language === "es" ? "Residencia" : "Residence"} ${id}`;
}

export function floorPlanFor(id: UnitId, view: PlanView) {
  const suffix = view === "color" ? "" : `-${view}`;
  return `/media/plans/plan-${id.toLowerCase()}${suffix}.webp`;
}

export const initialResidences: Residence[] = [
  { id: "201", code: "U 01", name: "Residencia 201", eyebrow: "Una recámara", price: 423500, area: 76.90, beds: 1, baths: 1, level: 2, status: "Disponible", description: "Residencia de una recámara con una distribución eficiente y 76.90 m² de área total.", images: family01Gallery },
  { id: "202", code: "U 02", name: "Residencia 202", eyebrow: "Una recámara", price: 507300, area: 89.28, beds: 1, baths: 1, level: 2, status: "Vendida", description: "Residencia de una recámara con 89.28 m² de área total en el segundo nivel.", images: gallery402 },
  { id: "203", code: "U 03", name: "Residencia 203", eyebrow: "Una recámara", price: 507300, area: 88.83, beds: 1, baths: 1, level: 2, status: "Apartada", description: "Residencia de una recámara con 88.83 m² de área total en el segundo nivel.", images: gallery403 },
  { id: "204", code: "U 04", name: "Residencia 204", eyebrow: "Una recámara", price: 396000, area: 90.70, beds: 1, baths: 1, level: 2, status: "Disponible", description: "Residencia de una recámara con 90.70 m² de área total en el segundo nivel.", images: gallery404 },
  { id: "301", code: "U 05", name: "Residencia 301", eyebrow: "Una recámara", price: 438900, area: 76.90, beds: 1, baths: 1, level: 3, status: "Vendida", description: "Residencia de una recámara con una distribución eficiente y 76.90 m² de área total.", images: family01Gallery },
  { id: "302", code: "U 06", name: "Residencia 302", eyebrow: "Una recámara", price: 525100, area: 89.28, beds: 1, baths: 1, level: 3, status: "Disponible", description: "Residencia de una recámara con 89.28 m² de área total en el tercer nivel.", images: gallery402 },
  { id: "303", code: "U 07", name: "Residencia 303", eyebrow: "Una recámara", price: 525100, area: 88.83, beds: 1, baths: 1, level: 3, status: "Apartada", description: "Residencia de una recámara con 88.83 m² de área total en el tercer nivel.", images: gallery403 },
  { id: "304", code: "U 08", name: "Residencia 304", eyebrow: "Una recámara", price: 410400, area: 71.86, beds: 1, baths: 1, level: 3, status: "Vendida", description: "Residencia de una recámara con 71.86 m² de área total en el tercer nivel.", images: gallery404 },
  { id: "401", code: "U 09", name: "Residencia 401", eyebrow: "Una recámara", price: 485100, area: 76.90, beds: 1, baths: 1, level: 4, status: "Disponible", description: "Residencia de una recámara con 76.90 m² de área total en el cuarto nivel.", images: family01Gallery },
  { id: "402", code: "U 10", name: "Residencia 402", eyebrow: "Una recámara", price: 579390, area: 89.28, beds: 1, baths: 1, level: 4, status: "Vendida", description: "Residencia de una recámara con 89.28 m² de área total en el cuarto nivel.", images: gallery402 },
  { id: "403", code: "U 11", name: "Residencia 403", eyebrow: "Una recámara", price: 579390, area: 88.83, beds: 1, baths: 1, level: 4, status: "Disponible", description: "Residencia de una recámara con 88.83 m² de área total en el cuarto nivel.", images: gallery403 },
  { id: "404", code: "U 12", name: "Residencia 404", eyebrow: "Una recámara", price: 453600, area: 71.86, beds: 1, baths: 1, level: 4, status: "Apartada", description: "Residencia de una recámara con 71.86 m² de área total en el cuarto nivel.", images: gallery404 },
  { id: "501", code: "U 13", name: "Residencia 501", eyebrow: "Dos recámaras", price: 853050, area: 142.63, beds: 2, baths: 2, level: 5, status: "Disponible", description: "Residencia amplia de dos recámaras y dos baños con 142.63 m² de área total.", images: galleryPH1 },
  { id: "502", code: "U 14", name: "Residencia 502", eyebrow: "Dos recámaras", price: 853050, area: 142.63, beds: 2, baths: 2, level: 5, status: "Vendida", description: "Residencia amplia de dos recámaras y dos baños con 142.63 m² de área total.", images: galleryPH2 },
  { id: "PH1", code: "U 15", name: "Penthouse PH1", eyebrow: "Dos recámaras", price: 916500, area: 142.63, beds: 2, baths: 2, level: 6, status: "Disponible", description: "Penthouse de dos recámaras y dos baños en el nivel superior, debajo del roof con alberca.", images: galleryPH1 },
  { id: "PH2", code: "U 16", name: "Penthouse PH2", eyebrow: "Dos recámaras", price: 916500, area: 142.63, beds: 2, baths: 2, level: 6, status: "Vendida", description: "Penthouse de dos recámaras y dos baños en el nivel superior, debajo del roof con alberca.", images: galleryPH2 },
];

export const facades: Record<ViewId, { src: string; label: string; number: string; width: number; height: number }> = {
  front: {
    src: "/media/pilitas-front-ultrawide.png",
    label: "Fachada principal",
    number: "01",
    width: 2880,
    height: 1152,
  },
  rear: {
    src: "/media/pilitas-rear-master.jpg",
    label: "Fachada posterior",
    number: "02",
    width: 2048,
    height: 1152,
  },
};

type FacadeZone<Id extends string> = {
  id: Id;
  x: number;
  y: number;
  width: number;
  height: number;
  clip: string;
};

type UnitZone = FacadeZone<UnitId>;
type AmenityZone = FacadeZone<AmenityId>;

type PixelPoint = readonly [x: number, y: number];

export const facadeReference = { width: 2048, height: 1152 } as const;

export function facadePolygon<Id extends string>(id: Id, points: readonly PixelPoint[]): FacadeZone<Id> {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  const clip = `polygon(${points
    .map(([x, y]) => {
      const relativeX = ((x - minX) / width) * 100;
      const relativeY = ((y - minY) / height) * 100;
      return `${relativeX.toFixed(2)}% ${relativeY.toFixed(2)}%`;
    })
    .join(", ")})`;

  return {
    id,
    x: (minX / facadeReference.width) * 100,
    y: (minY / facadeReference.height) * 100,
    width: (width / facadeReference.width) * 100,
    height: (height / facadeReference.height) * 100,
    clip,
  };
}

export const hotspots: Record<ViewId, UnitZone[]> = {
  front: [
    // Traced from ARREGLAR BOTONEs.jpg against the untouched 2048 × 1152 facade.
    // PH1 wraps both visible planes; PH2 is only the narrow right-hand volume.
    facadePolygon("PH1", [[755, 289], [840, 268], [840, 278], [1114, 205], [1279, 280], [1278, 418], [1114, 379], [755, 436]]),
    facadePolygon("PH2", [[1279, 280], [1395, 329], [1395, 447], [1278, 418]]),
    facadePolygon("501", [[755, 436], [1114, 379], [1278, 418], [1275, 531], [1114, 509], [735, 525]]),
    facadePolygon("502", [[1279, 418], [1395, 447], [1395, 549], [1279, 532]]),
    facadePolygon("401", [[735, 544], [928, 527], [928, 648], [735, 648]]),
    facadePolygon("402", [[928, 527], [1114, 509], [1275, 531], [1275, 647], [1114, 648], [928, 648]]),
    facadePolygon("403", [[1279, 532], [1395, 549], [1395, 645], [1279, 647]]),
    facadePolygon("301", [[735, 648], [928, 648], [928, 768], [735, 755]]),
    facadePolygon("302", [[928, 648], [1114, 648], [1275, 647], [1275, 767], [1114, 786], [928, 768]]),
    facadePolygon("303", [[1279, 647], [1395, 645], [1395, 752], [1279, 767]]),
    facadePolygon("201", [[735, 755], [928, 768], [928, 876], [735, 848]]),
    facadePolygon("202", [[928, 768], [1114, 786], [1275, 767], [1275, 865], [1114, 907], [928, 876]]),
    facadePolygon("203", [[1279, 767], [1395, 752], [1395, 833], [1279, 865]]),
  ],
  rear: [
    // Traced from BOTONES CORREGIDOS.jpg against the 2048 × 1152 rear facade.
    // The colors in the guide are ignored; only their architectural boundaries are used.
    facadePolygon("PH1", [[743, 462], [816, 345], [816, 454], [743, 550]]),
    facadePolygon("PH2", [[816, 345], [926, 160], [1353, 371], [1353, 479], [931, 312], [816, 454]]),
    facadePolygon("501", [[743, 550], [816, 454], [816, 558], [743, 632]]),
    facadePolygon("502", [[816, 454], [931, 312], [1353, 479], [1353, 570], [927, 433], [816, 558]]),
    facadePolygon("402", [[743, 632], [816, 558], [816, 659], [743, 718]]),
    facadePolygon("403", [[816, 558], [927, 433], [1163, 510], [1163, 623], [926, 568], [816, 659]]),
    facadePolygon("404", [[1163, 510], [1353, 570], [1353, 670], [1163, 623]]),
    facadePolygon("302", [[743, 718], [816, 659], [816, 754], [743, 796]]),
    facadePolygon("303", [[816, 659], [926, 568], [1163, 623], [1163, 730], [925, 693], [816, 754]]),
    facadePolygon("304", [[1163, 623], [1353, 670], [1353, 763], [1163, 730]]),
    facadePolygon("202", [[743, 796], [816, 754], [816, 832], [743, 859]]),
    facadePolygon("203", [[816, 754], [925, 693], [1163, 730], [1163, 811], [925, 790], [816, 832]]),
    facadePolygon("204", [[1163, 730], [1353, 763], [1353, 810], [1163, 811]]),
  ],
};

export const amenityHotspots: Record<ViewId, AmenityZone[]> = {
  front: [
    // Traced from BOTON NUEVO ROOF FACHADA FRONTAL.png. The lower edge stops
    // precisely at the roofline so the target never competes with PH1 or PH2.
    facadePolygon("rooftop", [[756, 0], [1395, 0], [1395, 324], [1114, 201], [840, 273], [840, 263], [756, 286]]),
    facadePolygon("lobby", [[734, 852], [932, 887], [932, 1019], [734, 961]]),
  ],
  rear: [
    // Traced independently from NUEVO BOTON ROOF FACHADA POSTERIOR.png.
    facadePolygon("rooftop", [[740, 0], [1352, 0], [1352, 366], [925, 156], [740, 459]]),
  ],
};

export const levels = [6, 5, 4, 3, 2];


