/**
 * Short codes a customer gives the cook at pickup. Consonants and digits only: easy to read aloud,
 * nothing that looks alike (no 0/O, 1/I/L), and no vowels, so codes can never spell words.
 *
 * In the demo the code is derived from the reservation id, so it needs no stored field. A real
 * service must generate it on the server when the reservation is created and keep it unique among
 * the reservations for the same offering.
 */
const ALPHABET = "BCDFGHJKMNPQRSTVWXYZ23456789";
export const PICKUP_CODE_LENGTH = 4;

export function pickupCodeFor(reservationId: string): string {
  // FNV-1a (32-bit): a small, stable hash; this is not a security measure.
  let hash = 0x811c9dc5;
  for (let i = 0; i < reservationId.length; i++) {
    hash ^= reservationId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let code = "";
  for (let i = 0; i < PICKUP_CODE_LENGTH; i++) {
    code += ALPHABET[hash % ALPHABET.length];
    hash = Math.floor(hash / ALPHABET.length);
  }
  return code;
}

export const PICKUP_CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${PICKUP_CODE_LENGTH}}$`);
