import type {Residence, UnitId, Language, Currency} from "./types";
import {formatPrice, residenceName, statusLabel} from "./format";

type Context = {residences: Residence[]; selectedId: UnitId | null; language: Language; currency: Currency; mxnPerUsd: number; isCurrent: boolean};

export function answerQuestion(raw: string, context: Context): string {
  const {residences, selectedId, language, currency, mxnPerUsd, isCurrent} = context;
  const es = language === "es";
  const text = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ids = [...new Set((text.match(/\b(?:[2-5]0[1-4]|ph\s*[12])\b/g) ?? []).map(id => id.replace(/\s/g, "").toUpperCase()))];
  const named = residences.filter(unit => ids.includes(unit.id));
  const selected = residences.find(unit => unit.id === selectedId);
  const price = (unit: Residence) => formatPrice(unit.price, currency, mxnPerUsd, language);
  const detail = (unit: Residence) => `${residenceName(unit, language)}: ${unit.area.toFixed(2)} m² · ${unit.beds} ${es ? "rec." : "bed"} · ${unit.baths} ${es ? "baños" : "baths"} · ${price(unit)} · ${statusLabel(unit.status, language)}.`;
  const finish = (answer: string) => isCurrent ? answer : `${answer} ${es ? "Datos de respaldo o última consulta: confirma precios y disponibilidad con ventas." : "Backup or last retrieved data: confirm prices and availability with sales."}`;

  if (/\b(dron|drone|cita|asesor|appointment|advisor|contacto|contact)\b|vista real|real photo|actual view/.test(text)) {
    return es
      ? "Para solicitar una fotografía real o una visita, usa WhatsApp o correo debajo e indica la unidad. El asistente no envía mensajes ni confirma citas automáticamente."
      : "To request an actual photograph or a visit, use WhatsApp or email below and specify the residence. This assistant does not send messages or confirm appointments automatically.";
  }
  if (/\b(pago|pagos|enganche|payment|payments|deposit|reserve|reservar)\b/.test(text)) {
    return es ? "No hay un esquema de pago confirmado en los datos de esta aplicación. Solicita al equipo de ventas las condiciones de la residencia que te interesa." : "This application has no confirmed payment schedule. Ask the sales team for the terms of the residence you are interested in.";
  }
  if (ids.some(id => !residences.some(unit => unit.id === id))) {
    return es ? "No encuentro alguna de esas unidades. Indica un identificador del inventario." : "One of those residences is not in the inventory. Please use an inventory identifier.";
  }
  if (/\b(compara\w*|compare\w*|comparison)\b/.test(text)) {
    const compare = named.length === 1 && selected && named[0].id !== selected.id ? [selected, named[0]] : named;
    return compare.length >= 2 ? finish(compare.map(detail).join("\n")) : (es ? "Indica dos unidades para comparar, por ejemplo: 301 y 302 o PH1 y PH2." : "Specify two residences to compare, for example 301 and 302 or PH1 and PH2.");
  }
  if (/\b(vista|vistas|mar|atardecer|view|views|ocean|sunset)\b/.test(text)) {
    return finish(es ? "PH1 y PH2 están en el nivel superior. La altura por sí sola no garantiza la mejor vista; confirma orientación y fotografía real con ventas. " + residences.filter(unit => unit.id.startsWith("PH")).map(detail).join("\n") : "PH1 and PH2 are on the upper level. Height alone does not guarantee the best view; confirm orientation and actual photographs with sales. " + residences.filter(unit => unit.id.startsWith("PH")).map(detail).join("\n"));
  }
  const budgetQuery = /\b(presupuesto|budget|hasta|under|below|maximo)\b/.test(text);
  const bedroom = /\b(una?|1|one|dos|2|two)\s+(recamara\w*|bedroom\w*)\b/.exec(text);
  const level = /\b(nivel|piso|level|floor)\s*(\d+)\b/.exec(text);
  const status = /\b(vendida\w*|sold)\b/.test(text) ? "Vendida" : /\b(apartada\w*|reserved)\b/.test(text) ? "Apartada" : "Disponible";
  const availabilityQuery = /\b(disponible\w*|availability|available|vendida\w*|sold|apartada\w*|reserved)\b/.test(text);
  if (budgetQuery || bedroom || level || availabilityQuery) {
    let budget = Infinity;
    if (budgetQuery) {
      const amount = /(?:presupuesto|budget|hasta|under|below|maximo)(?:\s+(?:de|of|es|is))?\s*(?:usd|mxn|\$)?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(mil(?:lones|lon)?|million|k))?/.exec(text);
      if (!amount) return es ? "Indica el presupuesto y la moneda, por ejemplo: presupuesto de 450000 USD." : "Specify a budget and currency, for example: budget of 450000 USD.";
      const numeric = amount[1];
      if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(numeric)) return es ? "Escribe el importe sin separadores de miles y con punto decimal." : "Use a decimal point and no thousands separators.";
      const multiplier = /millon|million/.test(amount[2] ?? "") ? 1e6 : amount[2] ? 1000 : 1;
      const budgetCurrency = /\b(usd|dolares|dollars)\b/.test(text) ? "USD" : /\b(mxn|pesos)\b/.test(text) ? "MXN" : currency;
      budget = Number(numeric.replaceAll(",", "")) * multiplier / (budgetCurrency === "MXN" ? mxnPerUsd : 1);
      if (!Number.isFinite(budget) || budget <= 0) return es ? "Indica un presupuesto positivo." : "Please enter a positive budget.";
    }
    const beds = bedroom ? (/^(dos|2|two)$/.test(bedroom[1]) ? 2 : 1) : null;
    const matches = residences.filter(unit => unit.status === status && unit.price <= budget && (!beds || unit.beds === beds) && (!level || unit.level === Number(level[2])) && (!named.length || named.some(item => item.id === unit.id))).sort((a,b) => a.price - b.price);
    return finish(matches.length ? matches.map(detail).join("\n") : (es ? "No hay residencias que cumplan esos criterios en los datos consultados." : "No residences match those criteria in the retrieved data."));
  }
  if (named.length) return finish(named.map(detail).join("\n"));
  if (selected) return finish(detail(selected));
  if (/\b(precio\w*|price\w*)\b/.test(text)) {
    const available = residences.filter(unit => unit.status === "Disponible").sort((a,b) => a.price - b.price);
    if (!available.length) return finish(es ? "No hay residencias disponibles en los datos consultados." : "There are no available residences in the retrieved data.");
    return finish(es ? `Entre las disponibles, los precios van de ${price(available[0])} a ${price(available[available.length - 1])}. La más económica es ${residenceName(available[0], language)}.` : `Available residences range from ${price(available[0])} to ${price(available[available.length - 1])}. The lowest price is ${residenceName(available[0], language)}.`);
  }
  return finish(es ? "Puedo consultar unidades, comparar dos residencias y filtrar por presupuesto, nivel, recámaras o disponibilidad. Indica qué buscas." : "I can look up residences, compare two units, or filter by budget, level, bedrooms and availability. Tell me what you need.");
}
