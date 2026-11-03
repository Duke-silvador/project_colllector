// app.js — Mis Gastos web · etapa 11: lista para publicar en Render (base en Turso)
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import cookieSession from "cookie-session";
import express from "express";
import { hashearClave, verificarClave } from "./claves.js";
import { CATEGORIAS } from "./static/js/gastos.js";   // las mismas del formulario

const app = express();
const PUERTO = process.env.PORT ?? 4000;   // en Render, el que elija Render
const PRODUCCION = process.env.PRODUCCION === "1";   // "1" solo en Render
const MONTO_MAXIMO = 100_000_000;
const CLAVE_MINIMA = 8;
const CLAVE_CORTA =
  `La contraseña tiene que tener al menos ${CLAVE_MINIMA} caracteres.`;

// Rutas a partir de la carpeta de ESTE archivo: funcionan igual en tu compu y en el
// servidor, sin importar desde qué carpeta se arranque la app
const CARPETA = import.meta.dirname;
const CARPETA_DATOS = join(CARPETA, "datos");
mkdirSync(CARPETA_DATOS, { recursive: true });   // acá van la base y la clave secreta

// Publicada, la clave y la base NO pueden vivir en el disco de Render (se borra cada
// vez que la app se reinicia o se duerme): tienen que llegar en variables de entorno
if (PRODUCCION) {
  for (const nombre of ["SESSION_SECRET", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"]) {
    if (!process.env[nombre]) throw new Error(`Falta la variable de entorno ${nombre}`);
  }
}

// La clave que firma la cookie de sesión: de la variable de entorno SESSION_SECRET
// o, si no está, de datos/clave-secreta.txt (se crea sola la primera vez)
function leerClaveSecreta() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const archivo = join(CARPETA_DATOS, "clave-secreta.txt");
  if (!existsSync(archivo)) {
    writeFileSync(archivo, randomBytes(32).toString("hex"));   // 64 caracteres al azar
  }
  return readFileSync(archivo, "utf8");
}

// En Render, el HTTPS lo atiende un «proxy» que le pasa el pedido a la app: con esto,
// Express le cree cuando avisa que el pedido llegó cifrado (y la cookie secure viaja)
app.set("trust proxy", 1);

app.use(express.static(join(CARPETA, "static")));   // el frontend
// El cuerpo JSON queda en req.body (hasta 1 MB: importar manda la lista entera)
app.use(express.json({ limit: "1mb" }));
// La sesión viaja en una cookie firmada (req.session se usa como un objeto).
// JavaScript no la puede leer (httpOnly), no viaja en pedidos que empiezan en otra
// página (sameSite: "lax") y, publicada, solo viaja por HTTPS (secure)
app.use(cookieSession({
  keys: [leerClaveSecreta()],
  httpOnly: true,
  sameSite: "lax",
  secure: PRODUCCION,
}));
app.set("json spaces", 2);           // JSON con sangría: se lee mejor en la terminal

// ---------------------------------------------------------------- base de datos
// En tu compu, el archivo datos/gastos.db; publicada, la base de Turso (mismo código)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? `file:${join(CARPETA_DATOS, "gastos.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,       // en tu compu no hace falta
});
await db.execute("PRAGMA foreign_keys = ON");    // que SQLite cuide las FOREIGN KEY

async function crearTablas() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      hash_clave  TEXT NOT NULL,
      creado      TEXT NOT NULL
    )`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gastos (
      id          INTEGER PRIMARY KEY,
      usuario_id  INTEGER NOT NULL,
      fecha       TEXT NOT NULL,
      categoria   TEXT NOT NULL,
      monto       REAL NOT NULL,
      descripcion TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )`);
}

// El gasto con ese id, si es de ese usuario; si no, undefined
async function buscar(id, usuarioId) {
  const resultado = await db.execute({
    sql: "SELECT id, fecha, categoria, monto, descripcion FROM gastos " +
         "WHERE id = ? AND usuario_id = ?",
    args: [id, usuarioId],
  });
  return resultado.rows[0];          // la primera fila (undefined si no vino ninguna)
}

await crearTablas();     // al arrancar: si las tablas ya existen, no hace nada

// ---------------------------------------------------------------- validación
// true si el texto es una fecha que existe, escrita AAAA-MM-DD
function esFecha(texto) {
  if (typeof texto !== "string" || texto.length !== 10) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);     // "28/10/2026" da Invalid Date
  if (Number.isNaN(fecha.getTime())) return false;
  // "2026-02-30" se corre al 2 de marzo: si al volver a texto cambió, no existía
  return fecha.toISOString().slice(0, 10) === texto;
}

// Revisa lo que mandó el navegador. Devuelve la lista de errores (vacía = está bien)
function validarGasto(datos) {
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return ["Mandá el gasto como un objeto JSON."];
  }
  const errores = [];
  if (!esFecha(datos.fecha)) {
    errores.push("La fecha tiene que ser una fecha real con la forma AAAA-MM-DD.");
  }
  if (!Object.hasOwn(CATEGORIAS, String(datos.categoria))) {
    const lista = Object.keys(CATEGORIAS).join(", ");
    errores.push(`La categoría tiene que ser una de: ${lista}.`);
  }
  const monto = datos.monto;
  // typeof: "8500" (texto) o true no pasan como números
  if (typeof monto !== "number" || !(monto > 0 && monto <= MONTO_MAXIMO)) {
    errores.push("El monto tiene que ser un número mayor que 0 " +
                 "y de hasta 100.000.000.");
  }
  const descripcion = datos.descripcion;
  const largo = typeof descripcion === "string" ? descripcion.trim().length : 0;
  if (largo < 1 || largo > 100) {
    errores.push("La descripción tiene que tener entre 1 y 100 caracteres.");
  }
  return errores;
}

function respuestaInvalida(res, errores) {
  res.status(400).json({ error: "Revisá los datos del gasto.", detalles: errores });
}

// ---------------------------------------------------------------- CSRF
// Otra página podría tener un <form> que mande un pedido a tu API con tu cookie.
// Dos llaves lo frenan: sameSite (el navegador no manda la cookie) y exigir JSON
// (un <form> no puede mandar JSON, y fetch desde otro sitio no puede sin permiso CORS)
function soloJson(req, res, next) {
  const cambiaAlgo = ["POST", "PUT", "DELETE"].includes(req.method);
  const tipo = req.get("Content-Type") ?? "";      // la cabecera, aunque no haya cuerpo
  if (cambiaAlgo && !tipo.startsWith("application/json")) {
    return res.status(415).json({ error: "La API solo acepta JSON." });
  }
  next();
}

app.use("/api", soloJson);       // antes de todas las rutas de la API

// ---------------------------------------------------------------- usuarios
// Middleware: la ruta solo sigue si hay una sesión iniciada; si no, 401
function requiereLogin(req, res, next) {
  if (req.session.usuarioId === undefined) {
    return res.status(401).json({ error: "Tenés que iniciar sesión." });
  }
  next();                                 // hay sesión: sigue la ruta
}

// Saca email y clave del JSON. El email, sin espacios y en minúsculas
function leerEmailYClave(req) {
  const datos = req.body ?? {};           // sin JSON, req.body es undefined
  const email = String(datos.email ?? "").trim().toLowerCase();
  const clave = String(datos.clave ?? "");
  return { email, clave };
}

function iniciarSesion(req, usuarioId) {
  req.session = { usuarioId };    // reemplaza la sesión anterior; viaja en la cookie
}

app.post("/api/registro", async (req, res) => {
  const { email, clave } = leerEmailYClave(req);
  if (!email.includes("@") || email.length > 120) {
    return res.status(400).json({ error: "Escribí un email válido." });
  }
  if (clave.length < CLAVE_MINIMA) {
    return res.status(400).json({ error: CLAVE_CORTA });
  }
  const existente = await db.execute({
    sql: "SELECT id FROM usuarios WHERE email = ?",
    args: [email],
  });
  if (existente.rows.length > 0) {
    return res.status(409).json({ error: "Ya hay una cuenta con ese email." });
  }
  const hash = await hashearClave(clave);          // la clave nunca se guarda tal cual
  const resultado = await db.execute({
    sql: "INSERT INTO usuarios (email, hash_clave, creado) VALUES (?, ?, ?)",
    args: [email, hash, new Date().toISOString()],
  });
  const id = Number(resultado.lastInsertRowid);
  iniciarSesion(req, id);                 // recién registrado = ya adentro
  res.status(201).json({ id, email });
});

app.post("/api/login", async (req, res) => {
  const { email, clave } = leerEmailYClave(req);
  const resultado = await db.execute({
    sql: "SELECT id, hash_clave FROM usuarios WHERE email = ?",
    args: [email],
  });
  const usuario = resultado.rows[0];      // undefined si no hay cuenta con ese email
  // el mismo mensaje en los dos casos: así nadie averigua qué emails tienen cuenta
  if (usuario === undefined || !(await verificarClave(clave, usuario.hash_clave))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  iniciarSesion(req, usuario.id);
  res.json({ id: usuario.id, email });
});

app.post("/api/logout", (req, res) => {
  req.session = null;                     // null borra la cookie de sesión
  res.status(204).end();
});

app.get("/api/yo", requiereLogin, async (req, res) => {
  const resultado = await db.execute({
    sql: "SELECT id, email FROM usuarios WHERE id = ?",
    args: [req.session.usuarioId],
  });
  if (resultado.rows.length === 0) {      // la cookie es de un usuario que ya no existe
    req.session = null;
    return res.status(401).json({ error: "Tenés que iniciar sesión." });
  }
  res.json(resultado.rows[0]);
});

// ---------------------------------------------------------------- gastos
app.get("/api/gastos", requiereLogin, async (req, res) => {
  const resultado = await db.execute({
    sql: "SELECT id, fecha, categoria, monto, descripcion FROM gastos " +
         "WHERE usuario_id = ? ORDER BY fecha DESC, id DESC",
    args: [req.session.usuarioId],
  });
  res.json(resultado.rows);
});

app.get("/api/gastos/:id", requiereLogin, async (req, res) => {
  const gasto = await buscar(req.params.id, req.session.usuarioId);
  if (gasto === undefined) {
    return res.status(404).json({ error: "No existe ese gasto." });
  }
  res.json(gasto);
});

app.post("/api/gastos", requiereLogin, async (req, res) => {
  const datos = req.body;                 // undefined si no vino JSON
  const errores = validarGasto(datos);
  if (errores.length > 0) {
    return respuestaInvalida(res, errores);
  }
  const usuarioId = req.session.usuarioId;       // de la sesión, nunca del JSON
  const resultado = await db.execute({
    sql: "INSERT INTO gastos (usuario_id, fecha, categoria, monto, descripcion) " +
         "VALUES (?, ?, ?, ?, ?)",
    args: [usuarioId, datos.fecha, datos.categoria, datos.monto,
           datos.descripcion.trim()],
  });
  const id = Number(resultado.lastInsertRowid);   // BigInt (4n) → 4
  res.status(201).json(await buscar(id, usuarioId));
});

app.put("/api/gastos/:id", requiereLogin, async (req, res) => {
  const datos = req.body;
  const errores = validarGasto(datos);
  if (errores.length > 0) {
    return respuestaInvalida(res, errores);
  }
  const usuarioId = req.session.usuarioId;
  const resultado = await db.execute({
    sql: "UPDATE gastos SET fecha = ?, categoria = ?, monto = ?, descripcion = ? " +
         "WHERE id = ? AND usuario_id = ?",
    args: [datos.fecha, datos.categoria, datos.monto, datos.descripcion.trim(),
           req.params.id, usuarioId],
  });
  if (resultado.rowsAffected === 0) {     // no existe o es de otro usuario: lo mismo
    return res.status(404).json({ error: "No existe ese gasto." });
  }
  res.json(await buscar(req.params.id, usuarioId));
});

app.delete("/api/gastos/:id", requiereLogin, async (req, res) => {
  const resultado = await db.execute({
    sql: "DELETE FROM gastos WHERE id = ? AND usuario_id = ?",
    args: [req.params.id, req.session.usuarioId],
  });
  if (resultado.rowsAffected === 0) {
    return res.status(404).json({ error: "No existe ese gasto." });
  }
  res.status(204).end();
});

// Recibe la lista que exportaste desde la versión del navegador (Exportar JSON)
app.post("/api/gastos/importar", requiereLogin, async (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) {
    return res.status(400).json({ error: "Mandá una lista de gastos." });
  }
  const usuarioId = req.session.usuarioId;
  const inserciones = [];
  for (const [i, gasto] of lista.entries()) {   // i: 0, 1, 2…
    const errores = validarGasto(gasto);
    if (errores.length > 0) {                  // uno malo frena todo: no entra ninguno
      return res.status(400).json({
        error: `El gasto ${i + 1} de la lista tiene errores.`,
        detalles: errores,
      });
    }
    inserciones.push({
      sql: "INSERT INTO gastos (usuario_id, fecha, categoria, monto, descripcion) " +
           "VALUES (?, ?, ?, ?, ?)",
      args: [usuarioId, gasto.fecha, gasto.categoria, gasto.monto,
             gasto.descripcion.trim()],
    });
  }
  // batch: todas juntas, en una sola transacción (o entran todas o ninguna)
  await db.batch(inserciones, "write");
  res.status(201).json({ importados: inserciones.length });
});

// ---------------------------------------------------------------- errores
// En /api/... el navegador espera JSON, también cuando algo sale mal.
// Si ninguna ruta respondió: 404 en JSON (fuera de /api, el 404 de Express)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Esa dirección no existe en la API." });
});

// Con 4 parámetros, Express sabe que es para errores: le llegan las excepciones
app.use("/api", (error, req, res, next) => {
  if (error.type === "entity.parse.failed") {      // express.json() no lo entendió
    return res.status(400).json({ error: "Lo que mandaste no es un JSON válido." });
  }
  console.error(error);                            // el detalle, solo en tu terminal
  res.status(500).json({ error: "Algo falló en el servidor. Probá de nuevo." });
});

app.listen(PUERTO, (error) => {
  if (error) throw error;          // por ejemplo, si el puerto ya está ocupado
  console.log(`Mis Gastos en http://localhost:${PUERTO}`);
});
