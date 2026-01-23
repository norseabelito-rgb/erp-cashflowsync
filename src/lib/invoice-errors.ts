// Error codes and Romanian messages for invoice-related errors
export const INVOICE_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: "Comanda nu a fost gasita.",
  ALREADY_ISSUED: "Factura a fost deja emisa pentru aceasta comanda.",
  TRANSFER_PENDING: "Transferul de stoc nu a fost finalizat. Asteapta finalizarea transferului.",
  NO_COMPANY: "Magazinul nu are o firma de facturare asociata. Mergi la Setari > Magazine pentru a configura.",
  NO_CREDENTIALS: "Credentialele Facturis nu sunt configurate pentru firma. Mergi la Setari > Firme pentru a configura.",
  NO_FACTURIS_CIF: "CIF-ul Facturis nu este configurat pentru firma. Mergi la Setari > Firme pentru a configura.",
  NO_LINE_ITEMS: "Comanda nu are produse. Nu se poate emite factura fara articole.",
  NO_SERIES: "Nu exista serie de facturare configurata pentru acest magazin. Mergi la Setari > Magazine pentru a configura.",
  NO_NUMBER: "Nu s-a putut obtine urmatorul numar de factura. Seria poate fi inactiva.",
  INVALID_ITEM_QUANTITY: "Produsul are cantitate invalida. Cantitatea trebuie sa fie mai mare decat 0.",
  INVALID_ITEM_PRICE: "Produsul are pret negativ. Pretul nu poate fi negativ.",
  CLIENT_ERROR: "Nu s-a putut crea clientul Facturis. Verifica credentialele.",
  FACTURIS_ERROR: "Eroare la comunicarea cu Facturis. Incearca din nou.",
  FACTURIS_AUTH_ERROR: "Autentificare esuata la Facturis. Verifica credentialele in Setari > Firme.",
  FACTURIS_1004: "Seria de facturare nu exista in Facturis. Verifica ca seria configurata in ERP corespunde exact cu cea din contul Facturis (case-sensitive).",
  FACTURIS_UNAVAILABLE: "Facturis nu este disponibil momentan. Incearca din nou in cateva minute.",
  SERIES_INACTIVE: "Seria de facturare este inactiva.",
  SERIES_MISMATCH: "Seria selectata nu apartine firmei magazinului.",
};

/**
 * Get Romanian error message for an invoice error code
 * @param errorCode - The error code to look up
 * @param fallbackMessage - Optional fallback message if code not found
 * @returns Romanian error message
 */
export function getInvoiceErrorMessage(errorCode: string, fallbackMessage?: string): string {
  return INVOICE_ERROR_MESSAGES[errorCode] || fallbackMessage || `Eroare necunoscuta: ${errorCode}`;
}
