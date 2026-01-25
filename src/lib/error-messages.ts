/**
 * Error Message Mapping Utility
 * Maps technical errors to user-friendly Romanian messages.
 * Used by ErrorModal for consistent error display across the application.
 */

export interface ErrorMessage {
  title: string;
  description: string;
}

/**
 * Predefined error messages in Romanian for common error scenarios.
 * Keys can be error codes, HTTP status codes, or error type identifiers.
 */
export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Network errors
  NETWORK_ERROR: {
    title: "Eroare de conexiune",
    description: "Nu s-a putut conecta la server. Verifica conexiunea la internet si incearca din nou."
  },
  TIMEOUT: {
    title: "Cererea a expirat",
    description: "Serverul nu a raspuns la timp. Incearca din nou mai tarziu."
  },
  ECONNREFUSED: {
    title: "Conexiune refuzata",
    description: "Serverul nu este disponibil momentan. Incearca din nou mai tarziu."
  },
  ENOTFOUND: {
    title: "Server negasit",
    description: "Adresa serverului nu a putut fi rezolvata. Verifica conexiunea la internet."
  },

  // Authentication errors
  UNAUTHORIZED: {
    title: "Neautorizat",
    description: "Sesiunea ta a expirat. Te rugam sa te autentifici din nou."
  },
  FORBIDDEN: {
    title: "Acces interzis",
    description: "Nu ai permisiunea necesara pentru aceasta actiune."
  },
  SESSION_EXPIRED: {
    title: "Sesiune expirata",
    description: "Sesiunea ta a expirat din motive de securitate. Te rugam sa te autentifici din nou."
  },

  // Invoice errors
  INVOICE_GENERATION_FAILED: {
    title: "Eroare la generarea facturii",
    description: "Factura nu a putut fi generata. Verifica datele comenzii si incearca din nou."
  },
  SERIES_NOT_CONFIGURED: {
    title: "Serie facturare neconfigurata",
    description: "Nu exista o serie de facturare configurata pentru acest magazin. Configureaza seria in Setari."
  },
  OBLIO_CONNECTION_ERROR: {
    title: "Eroare conexiune Oblio",
    description: "Nu s-a putut conecta la serviciul Oblio. Verifica credentialele si incearca din nou."
  },
  OBLIO_API_ERROR: {
    title: "Eroare API Oblio",
    description: "Serviciul Oblio a returnat o eroare. Verifica datele si incearca din nou."
  },
  INVOICE_ALREADY_EXISTS: {
    title: "Factura deja existenta",
    description: "Aceasta comanda are deja o factura emisa."
  },
  INVOICE_CANCELLED: {
    title: "Factura anulata",
    description: "Aceasta factura a fost anulata si nu mai poate fi modificata."
  },

  // AWB errors
  AWB_GENERATION_FAILED: {
    title: "Eroare la generarea AWB",
    description: "AWB-ul nu a putut fi generat. Verifica datele de livrare si incearca din nou."
  },
  COURIER_CONNECTION_ERROR: {
    title: "Eroare conexiune curier",
    description: "Nu s-a putut conecta la serviciul curierului. Incearca din nou mai tarziu."
  },
  INVALID_ADDRESS: {
    title: "Adresa invalida",
    description: "Adresa de livrare nu este valida. Verifica datele de adresa."
  },
  AWB_ALREADY_EXISTS: {
    title: "AWB deja generat",
    description: "Aceasta comanda are deja un AWB generat."
  },

  // Stock errors
  INSUFFICIENT_STOCK: {
    title: "Stoc insuficient",
    description: "Nu exista suficient stoc pentru a finaliza aceasta operatie."
  },
  PRODUCT_NOT_FOUND: {
    title: "Produs negasit",
    description: "Produsul solicitat nu a fost gasit in sistem."
  },
  SKU_NOT_ASSIGNED: {
    title: "SKU neasignat",
    description: "Acest produs nu are un SKU asignat. Asigneaza un SKU inainte de a continua."
  },

  // Order errors
  ORDER_NOT_FOUND: {
    title: "Comanda negasita",
    description: "Comanda solicitata nu a fost gasita in sistem."
  },
  ORDER_ALREADY_PROCESSED: {
    title: "Comanda deja procesata",
    description: "Aceasta comanda a fost deja procesata."
  },
  INVALID_ORDER_STATUS: {
    title: "Status comanda invalid",
    description: "Aceasta actiune nu poate fi efectuata pentru statusul curent al comenzii."
  },

  // Validation errors
  VALIDATION_ERROR: {
    title: "Date invalide",
    description: "Datele introduse nu sunt valide. Verifica campurile si incearca din nou."
  },
  REQUIRED_FIELD_MISSING: {
    title: "Camp obligatoriu lipsa",
    description: "Te rugam sa completezi toate campurile obligatorii."
  },

  // HTTP status code mappings
  "400": {
    title: "Cerere invalida",
    description: "Cererea trimisa nu este valida. Verifica datele si incearca din nou."
  },
  "401": {
    title: "Neautorizat",
    description: "Sesiunea ta a expirat. Te rugam sa te autentifici din nou."
  },
  "403": {
    title: "Acces interzis",
    description: "Nu ai permisiunea necesara pentru aceasta actiune."
  },
  "404": {
    title: "Resursa negasita",
    description: "Resursa solicitata nu a fost gasita."
  },
  "409": {
    title: "Conflict",
    description: "Aceasta actiune intra in conflict cu starea curenta a resursei."
  },
  "429": {
    title: "Prea multe cereri",
    description: "Ai trimis prea multe cereri. Asteapta cateva momente si incearca din nou."
  },
  "500": {
    title: "Eroare de server",
    description: "A aparut o eroare pe server. Echipa tehnica a fost notificata."
  },
  "502": {
    title: "Gateway invalid",
    description: "Serverul nu a putut procesa cererea. Incearca din nou mai tarziu."
  },
  "503": {
    title: "Serviciu indisponibil",
    description: "Serviciul este temporar indisponibil. Incearca din nou mai tarziu."
  },
  "504": {
    title: "Timeout gateway",
    description: "Serverul nu a raspuns la timp. Incearca din nou mai tarziu."
  },

  // Generic fallback
  UNKNOWN_ERROR: {
    title: "Eroare necunoscuta",
    description: "A aparut o eroare neasteptata. Daca problema persista, contacteaza suportul."
  }
};

/**
 * Common network error patterns that indicate specific error types.
 */
const NETWORK_ERROR_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /ECONNREFUSED/i, code: "ECONNREFUSED" },
  { pattern: /ENOTFOUND/i, code: "ENOTFOUND" },
  { pattern: /ETIMEDOUT|timeout/i, code: "TIMEOUT" },
  { pattern: /network|fetch|connection/i, code: "NETWORK_ERROR" },
  { pattern: /unauthorized/i, code: "UNAUTHORIZED" },
  { pattern: /forbidden/i, code: "FORBIDDEN" },
];

/**
 * Extracts an error code from common error patterns.
 * Useful for detecting network errors from error messages.
 */
export function detectErrorCode(errorMessage: string): string | null {
  for (const { pattern, code } of NETWORK_ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return code;
    }
  }
  return null;
}

/**
 * Safely extracts a string representation of error details.
 */
function getErrorDetails(error: unknown): string {
  if (error === null || error === undefined) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    const details: string[] = [];
    details.push(`Error: ${error.message}`);
    if (error.name && error.name !== "Error") {
      details.push(`Type: ${error.name}`);
    }
    if (error.stack) {
      // Only include first few lines of stack for readability
      const stackLines = error.stack.split("\n").slice(0, 5);
      details.push(`Stack:\n${stackLines.join("\n")}`);
    }
    return details.join("\n");
  }

  // For objects, try to stringify
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

/**
 * Extracts error code from various error shapes.
 */
function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorObj = error as Record<string, unknown>;

  // Check for explicit code property
  if (typeof errorObj.code === "string") {
    return errorObj.code;
  }

  // Check for status (HTTP response)
  if (typeof errorObj.status === "number") {
    return String(errorObj.status);
  }

  // Check for statusCode (some APIs)
  if (typeof errorObj.statusCode === "number") {
    return String(errorObj.statusCode);
  }

  return null;
}

/**
 * Extracts error message from various error shapes.
 */
function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;

    // Try common message properties
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    if (typeof errorObj.error === "string") {
      return errorObj.error;
    }
    if (typeof errorObj.errorMessage === "string") {
      return errorObj.errorMessage;
    }
  }

  return null;
}

export interface ParsedErrorMessage {
  title: string;
  description: string;
  details?: string;
}

/**
 * Converts any error into a user-friendly error message.
 *
 * Resolution order:
 * 1. If error has a .code property, look up in ERROR_MESSAGES
 * 2. If error has HTTP status code, use status code mapping
 * 3. If error message matches known patterns, use detected code
 * 4. Fall back to UNKNOWN_ERROR
 *
 * Always includes original error details for debugging.
 *
 * @param error - Any error value (Error, string, object, etc.)
 * @returns User-friendly title, description, and optional technical details
 */
export function getErrorMessage(error: unknown): ParsedErrorMessage {
  // Extract details first (always include for debugging)
  const details = getErrorDetails(error);

  // Try to find a matching error code
  let errorCode: string | null = null;

  // 1. Check for explicit error code
  errorCode = extractErrorCode(error);
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return {
      ...ERROR_MESSAGES[errorCode],
      details: details || undefined
    };
  }

  // 2. If we have a code but no mapping, check if it's an HTTP status
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return {
      ...ERROR_MESSAGES[errorCode],
      details: details || undefined
    };
  }

  // 3. Try to detect error type from message
  const errorMessage = extractErrorMessage(error);
  if (errorMessage) {
    const detectedCode = detectErrorCode(errorMessage);
    if (detectedCode && ERROR_MESSAGES[detectedCode]) {
      return {
        ...ERROR_MESSAGES[detectedCode],
        details: details || undefined
      };
    }
  }

  // 4. Fall back to unknown error
  return {
    ...ERROR_MESSAGES.UNKNOWN_ERROR,
    details: details || undefined
  };
}

/**
 * Creates an error message from a known error code.
 * Use this when you know the exact error type to display.
 *
 * @param code - Error code from ERROR_MESSAGES
 * @param details - Optional technical details
 * @returns User-friendly error message
 */
export function getErrorByCode(
  code: keyof typeof ERROR_MESSAGES,
  details?: string
): ParsedErrorMessage {
  const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
  return {
    ...message,
    details
  };
}
