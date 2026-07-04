// Simple client-side obfuscation/encryption for Firestore Document IDs
const SECRET_SALT = 87; // Symmetric encryption salt key

/**
 * Scrambles a Firestore ID to make it secure and obfuscated in links and QR codes.
 * E.g., "0HgpRr2M3dk7lKglYURt" -> "Zy8fU2B2Wl16eX9e"
 */
export function scrambleId(id) {
  if (!id) return "";
  try {
    // Step 1: XOR each character code with our secret salt to obfuscate it
    const xored = id
      .split("")
      .map((char) => String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT))
      .join("");
    // Step 2: Convert to base64 and make it URL-safe (remove padding and replace +, /)
    return btoa(xored)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch (e) {
    console.error("Failed to encrypt ID:", e);
    return id;
  }
}

/**
 * Decrypts a scrambled ID back to its original Firestore document ID.
 */
export function unscrambleId(scrambled) {
  if (!scrambled) return "";
  try {
    // Step 1: Restore standard base64 characters from URL-safe format
    let base64 = scrambled.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding back if necessary
    while (base64.length % 4) {
      base64 += "=";
    }
    const xored = atob(base64);
    // Step 2: Reverse XOR operation
    return xored
      .split("")
      .map((char) => String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT))
      .join("");
  } catch (e) {
    // Not a scrambled ID or failed to decrypt — return empty or original
    return "";
  }
}

/**
 * Checks if a string is a decrypted Firestore ID or if we should use the raw one.
 */
export function getRealInvoiceId(idFromUrl) {
  if (!idFromUrl) return "";
  const decrypted = unscrambleId(idFromUrl);
  // Firestore auto-IDs are 20 characters alphanumeric (a-z, A-Z, 0-9)
  const isFirestoreId = /^[a-zA-Z0-9]{20}$/.test(decrypted);
  return isFirestoreId ? decrypted : idFromUrl;
}
