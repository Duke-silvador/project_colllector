// claves.js — guardar contraseñas sin guardarlas: sal al azar + scrypt
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);   // la misma scrypt, pero se usa con await
const LARGO = 64;                        // bytes del resultado

// "ana-clave-segura" → "scrypt:<sal>:<hash>" (cada vez sale distinto: la sal cambia)
export async function hashearClave(clave) {
  const sal = randomBytes(16).toString("hex");      // 32 caracteres al azar
  const hash = await scryptAsync(clave, sal, LARGO);
  return `scrypt:${sal}:${hash.toString("hex")}`;
}

// ¿La clave que escribieron da el mismo hash que el guardado, con la misma sal?
export async function verificarClave(clave, guardado) {
  const [, sal, hashGuardado] = guardado.split(":");
  const hash = await scryptAsync(clave, sal, LARGO);
  // timingSafeEqual compara en un tiempo fijo: no da pistas de cuánto se acertó
  return timingSafeEqual(hash, Buffer.from(hashGuardado, "hex"));
}
