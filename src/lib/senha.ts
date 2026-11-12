// Senhas dos sócios: scrypt com sal aleatório (módulo nativo do Node, sem dependência extra).
// Formato guardado no banco: "scrypt$<sal hex>$<hash hex>".
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;
const TAMANHO = 64;
export const SENHA_MINIMA = 10;

export function validarForcaSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  return null;
}

export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha.normalize("NFKC"), sal, TAMANHO);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

export async function conferirSenha(senha: string, guardado: string | null | undefined): Promise<boolean> {
  if (!guardado) return false;
  const [tipo, salHex, hashHex] = guardado.split("$");
  if (tipo !== "scrypt" || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = await scrypt(senha.normalize("NFKC"), Buffer.from(salHex, "hex"), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/** Senha aleatória legível para o primeiro acesso. */
export function gerarSenhaTemporaria(): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const todos = letras + numeros;
  const bytes = randomBytes(16);
  let s = letras[bytes[0]! % letras.length]! + numeros[bytes[1]! % numeros.length]!;
  for (let i = 2; i < 14; i++) s += todos[bytes[i]! % todos.length];
  return s;
}
