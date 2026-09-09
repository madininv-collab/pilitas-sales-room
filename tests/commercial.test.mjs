import assert from "node:assert/strict";
import test, {after} from "node:test";
import {fileURLToPath} from "node:url";
import {createServer} from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({appType: "custom", configFile: false, root, resolve: {alias: {"@": root}}, server: {middlewareMode: true, hmr: false, ws: false}});
after(() => vite.close());
const {UNIT_IDS, parseCsv, parsePrice, validateInventory, inventoryFromCsv} = await vite.ssrLoadModule("/lib/pilitas/inventory.ts");
const {createInventoryLoader} = await vite.ssrLoadModule("/lib/pilitas/inventory-source.ts");
const {answerQuestion} = await vite.ssrLoadModule("/lib/pilitas/assistant.ts");
const {initialResidences} = await vite.ssrLoadModule("/lib/pilitas/catalog.ts");
const {contactConfig, whatsappUrl} = await vite.ssrLoadModule("/lib/pilitas/contact.ts");
const {formatPrice} = await vite.ssrLoadModule("/lib/pilitas/format.ts");
const {askRemoteAssistant} = await vite.ssrLoadModule("/lib/pilitas/remote-assistant.ts");
const csv = "unidad,precio base en USD,estado\n" + UNIT_IDS.map(id => `${id},423500,Disponible`).join("\n");
const settings = "clave,valor\nmxn_por_usd,17.0427\nactualizar_cada_minutos,5";
const valid = () => inventoryFromCsv(csv, settings, "2026-09-09T12:00:00Z");
const ctx = {residences: initialResidences, selectedId: null, language: "es", currency: "USD", mxnPerUsd: 17.0427, isCurrent: true};

test("CSV handles quotes, escaped quotes, CRLF and rejects malformed quotes", () => {
  assert.deepEqual(parseCsv('a,b\r\n"a,b","x""y"\r\n'), [["a","b"],["a,b",'x"y']]);
  assert.throws(() => parseCsv('a,"b'));
  assert.throws(() => parseCsv('"a"oops,b'));
});
test("prices reject ambiguous or corrupt inputs", () => {
  assert.equal(parsePrice("$423,500.00"),423500);
  for (const p of ["423.500,00","USD 4oops23500","-1","0","Infinity","1e6",""]) assert.throws(() => parsePrice(p));
});
test("inventory requires exact coverage, valid prices, statuses, exchange rate and interval", () => {
  assert.equal(valid().units.length,16);
  const duplicate=valid(); duplicate.units[15]=duplicate.units[0]; assert.throws(() => validateInventory(duplicate));
  const missing=valid(); missing.units.pop(); assert.throws(() => validateInventory(missing));
  for (const refreshMinutes of [0,61,100000,NaN]) assert.throws(() => validateInventory({...valid(),refreshMinutes}));
  for (const mxnPerUsd of [0,NaN,Infinity]) assert.throws(() => validateInventory({...valid(),mxnPerUsd}));
  const bad=valid(); bad.units[0].status="BAD"; assert.throws(() => validateInventory(bad));
  assert.throws(() => inventoryFromCsv(csv.replace("precio base en USD","wrong"),settings,new Date().toISOString()));
});
test("contact data can be edited via configuration sheet and invalid URLs never reach links", () => {
  const data=inventoryFromCsv(csv,settings+"\nventas_whatsapp,+52 5551234567\nventas_email,ventas@example.com\nventas_citas_url,https://example.com/citas",new Date().toISOString());
  assert.equal(data.contacts.email,"ventas@example.com");
  assert.match(whatsappUrl(data.contacts,"Residencia 201"),/^https:\/\/wa.me\/525551234567\?text=Residencia%20201$/);
  assert.equal(contactConfig({bookingUrl:"javascript:alert(1)"}).bookingUrl,"");
  assert.equal(contactConfig({email:"x@y.com?bcc=other@example.com"}).email,"algoritmoarquitectonico@gmail.com");
});
test("inventory loader coalesces requests, caches for 60s and retries after failure", async () => {
  let calls=0, now=Date.parse("2026-09-09T12:00:00Z"), fail=false;
  const load=createInventoryLoader({now:()=>now,fetcher:async url=>{calls++;return new Response(new URL(url).searchParams.get("sheet")==="Inventario"?csv:settings,{status:fail?401:200});}});
  await Promise.all([load(),load()]); assert.equal(calls,2);
  await load(); assert.equal(calls,2);
  now+=61000; fail=true; await assert.rejects(load());
  fail=false; await load(); assert.equal(calls,6);
});
test("inventory loader cancels slow sources", async () => {
  const load=createInventoryLoader({timeoutMs:15,fetcher:async (_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true}))});
  await assert.rejects(load(),/aborted/);
});
test("assistant never recommends sold inventory as available", () => {
  const answer=answerQuestion("precio",{...ctx,residences:initialResidences.map(u=>({...u,status:"Vendida"}))});
  assert.match(answer,/No hay residencias disponibles/);
  assert.doesNotMatch(answer,/Entre las disponibles/);
});
test("assistant respects requested units and bedroom words", () => {
  const comparison=answerQuestion("Compara PH1 y PH2",ctx);
  assert.match(comparison,/PH1/); assert.match(comparison,/PH2/); assert.doesNotMatch(comparison,/Residencia 301/);
  const bedroom=answerQuestion("Quiero una recámara",ctx);
  assert.match(bedroom,/1 rec/); assert.doesNotMatch(bedroom,/Penthouse/);
  assert.match(answerQuestion("Precio de PH2",ctx),/Penthouse PH2/);
});
test("budget and currency filtering work and stale data is labelled", () => {
  const answer=answerQuestion("presupuesto de 450000 USD",ctx);
  assert.match(answer,/Residencia 201/); assert.match(answer,/Residencia 204/); assert.doesNotMatch(answer,/Residencia 302/);
  assert.match(answerQuestion("budget of 450000 USD",{...ctx,language:"en"}),/Residence 201/);
  assert.match(answerQuestion("precio",{...ctx,isCurrent:false}),/confirma precios y disponibilidad/);
  assert.equal(formatPrice(100,"MXN",17,"es"),"$1,700 MXN");
});
test("optional AI endpoint accepts safe answers and fails back without exposing a key", async () => {
  let request;
  const answer = await askRemoteAssistant("Compara 401 y PH1", ctx, {
    url: "https://api.example.com/sales",
    fetcher: async (_url, options) => {
      request = JSON.parse(options.body);
      return Response.json({answer: "Respuesta remota"});
    },
  });
  assert.equal(answer, "Respuesta remota");
  assert.equal(request.selectedUnit, null);
  assert.equal(request.residences.length, 16);
  assert.equal(await askRemoteAssistant("hola", ctx, {url: "http://insecure.example.com"}), null);
  assert.equal(await askRemoteAssistant("hola", ctx, {url: ""}), null);
});
