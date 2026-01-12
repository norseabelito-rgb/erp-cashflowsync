/**
 * Legendă completă statusuri FanCourier
 * Bazat pe documentația oficială FanCourier API v2.0 - Mai 2025
 */

export interface FanCourierStatus {
  code: string;
  name: string;
  description: string;
  category: "pickup" | "transit" | "delivery" | "notice" | "problem" | "return" | "cancel" | "other";
  internalStatus: "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED" | "AWB_ERROR";
  isFinal: boolean;  // True pentru statusuri finale (livrat, returnat, anulat)
}

// Toate statusurile FanCourier cu descrieri detaliate
export const FANCOURIER_STATUSES: Record<string, FanCourierStatus> = {
  // ==================== RIDICARE (C*) ====================
  "C0": {
    code: "C0",
    name: "Expediție ridicată",
    description: "Curierul a preluat coletul de la expeditor",
    category: "pickup",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "C1": {
    code: "C1",
    name: "Expediție preluată spre livrare",
    description: "Coletul a fost preluat de curier pentru livrare către destinatar",
    category: "pickup",
    internalStatus: "SHIPPED",
    isFinal: false,
  },

  // ==================== TRANZIT & DEPOZIT (H*) ====================
  "H0": {
    code: "H0",
    name: "În tranzit spre depozitul de destinație",
    description: "Coletul este în drum spre depozitul din zona destinatarului",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H1": {
    code: "H1",
    name: "Descărcată în depozitul de destinație",
    description: "Coletul a ajuns și a fost descărcat în depozitul de destinație",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H2": {
    code: "H2",
    name: "În tranzit",
    description: "Coletul este în transport între depozite",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H3": {
    code: "H3",
    name: "Sortată pe bandă",
    description: "Coletul este în procesul de sortare în depozit",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H4": {
    code: "H4",
    name: "Sortată pe bandă",
    description: "Coletul este în procesul de sortare în depozit",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H10": {
    code: "H10",
    name: "În tranzit spre depozitul de destinație",
    description: "Coletul este în drum spre depozitul din zona destinatarului",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H11": {
    code: "H11",
    name: "Descărcată în depozitul de destinație",
    description: "Coletul a ajuns și a fost descărcat în depozitul de destinație",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H12": {
    code: "H12",
    name: "În depozit",
    description: "Coletul se află în depozit, în așteptarea livrării",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H13": {
    code: "H13",
    name: "În depozit",
    description: "Coletul se află în depozit, în așteptarea livrării",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H15": {
    code: "H15",
    name: "În depozit",
    description: "Coletul se află în depozit, în așteptarea livrării",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "H17": {
    code: "H17",
    name: "În depozitul de destinație",
    description: "Coletul a ajuns în depozitul final și este gata de livrare",
    category: "transit",
    internalStatus: "SHIPPED",
    isFinal: false,
  },

  // ==================== LIVRARE (S1, S2, S8, S35, S46, S47) ====================
  "S1": {
    code: "S1",
    name: "În livrare",
    description: "Curierul este pe drum către destinatar cu coletul",
    category: "delivery",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S2": {
    code: "S2",
    name: "Livrat",
    description: "Coletul a fost livrat cu succes destinatarului",
    category: "delivery",
    internalStatus: "DELIVERED",
    isFinal: true,
  },
  "S8": {
    code: "S8",
    name: "Livrare din sediul FAN Courier",
    description: "Destinatarul va ridica coletul de la un sediu FAN Courier",
    category: "delivery",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S35": {
    code: "S35",
    name: "Retrimis în livrare",
    description: "După o încercare eșuată, coletul a fost trimis din nou pentru livrare",
    category: "delivery",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S46": {
    code: "S46",
    name: "Predat punct livrare",
    description: "Coletul a fost predat la un FANbox sau punct PayPoint",
    category: "delivery",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S47": {
    code: "S47",
    name: "Predat partener extern",
    description: "Coletul a fost predat către un curier partener pentru livrare",
    category: "delivery",
    internalStatus: "SHIPPED",
    isFinal: false,
  },

  // ==================== AVIZĂRI (S3, S11, S12, S21, S22, S24, S30) ====================
  "S3": {
    code: "S3",
    name: "Avizat",
    description: "Destinatarul a fost contactat, livrarea a fost reprogramată",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S11": {
    code: "S11",
    name: "Avizat și trimis SMS",
    description: "S-a trimis SMS destinatarului cu detalii despre livrare",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S12": {
    code: "S12",
    name: "Contactat; livrare ulterioară",
    description: "Destinatarul a fost contactat și a cerut o reprogramare a livrării",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S21": {
    code: "S21",
    name: "Avizat, lipsă persoană de contact",
    description: "Curierul a încercat livrarea dar nu a răspuns nimeni",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S22": {
    code: "S22",
    name: "Avizat, nu are bani de ramburs",
    description: "Destinatarul nu avea suma necesară pentru plata rambursului",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S24": {
    code: "S24",
    name: "Avizat, nu are împuternicire/CI",
    description: "Destinatarul nu avea documentele de identificare necesare",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S30": {
    code: "S30",
    name: "Nu răspunde la telefon",
    description: "Curierul nu a putut contacta destinatarul telefonic",
    category: "notice",
    internalStatus: "SHIPPED",
    isFinal: false,
  },

  // ==================== PROBLEME ADRESĂ (S4, S5, S9, S10, S14, S19, S20, S25, S27, S28, S42) ====================
  "S4": {
    code: "S4",
    name: "Adresă incompletă",
    description: "Adresa de livrare este incompletă și trebuie verificată/completată",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S5": {
    code: "S5",
    name: "Adresă greșită, destinatar mutat",
    description: "Persoana nu mai locuiește la adresa specificată",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S9": {
    code: "S9",
    name: "Redirecționat",
    description: "Coletul a fost redirecționat către o altă adresă",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S10": {
    code: "S10",
    name: "Adresă greșită, fără telefon",
    description: "Adresa este greșită și nu există un număr de telefon pentru contact",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S14": {
    code: "S14",
    name: "Restricții acces la adresă",
    description: "Curierul nu poate ajunge la adresă (complex închis, restricții, etc.)",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S19": {
    code: "S19",
    name: "Adresă incompletă - trimis SMS",
    description: "S-a trimis SMS destinatarului pentru clarificarea adresei",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S20": {
    code: "S20",
    name: "Adresă incompletă, fără telefon",
    description: "Adresa este incompletă și nu există număr de telefon pentru contact",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S25": {
    code: "S25",
    name: "Adresă greșită - trimis SMS",
    description: "S-a trimis SMS destinatarului pentru obținerea adresei corecte",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S27": {
    code: "S27",
    name: "Adresă greșită, nr telefon greșit",
    description: "Atât adresa cât și numărul de telefon sunt greșite",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S28": {
    code: "S28",
    name: "Adresă incompletă, nr telefon greșit",
    description: "Adresa este incompletă și numărul de telefon este greșit",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S42": {
    code: "S42",
    name: "Adresă greșită",
    description: "Adresa de livrare nu există sau este complet greșită",
    category: "problem",
    internalStatus: "SHIPPED",
    isFinal: false,
  },

  // ==================== REFUZURI & RETURURI (S6, S7, S15, S16, S33, S43, S50) ====================
  "S6": {
    code: "S6",
    name: "Refuz primire",
    description: "Destinatarul a refuzat să primească coletul",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },
  "S7": {
    code: "S7",
    name: "Refuz plată transport",
    description: "Destinatarul a refuzat să plătească taxa de transport",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },
  "S15": {
    code: "S15",
    name: "Refuz predare ramburs",
    description: "Destinatarul a refuzat să plătească suma ramburs",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },
  "S16": {
    code: "S16",
    name: "Retur la termen",
    description: "S-a depășit termenul de păstrare și coletul se întoarce la expeditor",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },
  "S33": {
    code: "S33",
    name: "Retur solicitat",
    description: "Expeditorul a solicitat returnarea coletului",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },
  "S43": {
    code: "S43",
    name: "Retur",
    description: "Coletul se întoarce la expeditor",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },
  "S50": {
    code: "S50",
    name: "Refuz confirmare",
    description: "Destinatarul a refuzat confirmarea la livrare (ePOD)",
    category: "return",
    internalStatus: "RETURNED",
    isFinal: true,
  },

  // ==================== ALTE STATUSURI ====================
  "S37": {
    code: "S37",
    name: "Despăgubit",
    description: "Coletul a fost pierdut/deteriorat și se plătește despăgubire",
    category: "other",
    internalStatus: "SHIPPED",
    isFinal: false,
  },
  "S38": {
    code: "S38",
    name: "AWB neexpediat",
    description: "AWB-ul a fost creat dar coletul nu a fost ridicat de curier",
    category: "other",
    internalStatus: "AWB_ERROR",
    isFinal: false,
  },
  "S49": {
    code: "S49",
    name: "Activitate suspendată",
    description: "Livrările sunt temporar suspendate în zona respectivă",
    category: "other",
    internalStatus: "SHIPPED",
    isFinal: false,
  },

  // ==================== ANULĂRI (A*) ====================
  "A0": {
    code: "A0",
    name: "AWB anulat",
    description: "AWB-ul a fost anulat din sistem",
    category: "cancel",
    internalStatus: "CANCELLED",
    isFinal: true,
  },
  "A1": {
    code: "A1",
    name: "AWB anulat de expeditor",
    description: "Expeditorul a solicitat anularea AWB-ului",
    category: "cancel",
    internalStatus: "CANCELLED",
    isFinal: true,
  },
  "A2": {
    code: "A2",
    name: "AWB anulat de destinatar",
    description: "Destinatarul a solicitat anularea livrării",
    category: "cancel",
    internalStatus: "CANCELLED",
    isFinal: true,
  },
  "A3": {
    code: "A3",
    name: "AWB anulat de FanCourier",
    description: "FanCourier a anulat AWB-ul din motive operaționale",
    category: "cancel",
    internalStatus: "CANCELLED",
    isFinal: true,
  },
  "A4": {
    code: "A4",
    name: "AWB șters",
    description: "AWB-ul a fost șters din borderou",
    category: "cancel",
    internalStatus: "CANCELLED",
    isFinal: true,
  },
};

/**
 * Obține informații despre un status FanCourier
 */
export function getFanCourierStatus(code: string): FanCourierStatus | null {
  return FANCOURIER_STATUSES[code] || null;
}

/**
 * Obține toate statusurile dintr-o categorie
 */
export function getStatusesByCategory(category: FanCourierStatus["category"]): FanCourierStatus[] {
  return Object.values(FANCOURIER_STATUSES).filter(s => s.category === category);
}

/**
 * Verifică dacă un status este de tip C0 (ridicare)
 */
export function isPickupStatus(code: string): boolean {
  return code === "C0" || code === "C1";
}

/**
 * Verifică dacă un status este final (nu mai urmează alte evenimente)
 */
export function isFinalStatus(code: string): boolean {
  const status = FANCOURIER_STATUSES[code];
  return status?.isFinal || false;
}

/**
 * Categorii de statusuri pentru UI (tabs, filtre)
 */
export const STATUS_CATEGORIES = [
  { code: "pickup", name: "Ridicare", color: "#3b82f6" },
  { code: "transit", name: "Tranzit", color: "#8b5cf6" },
  { code: "delivery", name: "Livrare", color: "#22c55e" },
  { code: "notice", name: "Avizare", color: "#f59e0b" },
  { code: "problem", name: "Problemă", color: "#ef4444" },
  { code: "return", name: "Retur", color: "#dc2626" },
  { code: "cancel", name: "Anulat", color: "#6b7280" },
  { code: "other", name: "Altele", color: "#9ca3af" },
];

/**
 * Formatează statusul pentru afișare în UI
 */
export function formatStatusForDisplay(code: string | null): {
  code: string;
  name: string;
  description: string;
  color: string;
} {
  if (!code) {
    return {
      code: "-",
      name: "Fără evenimente",
      description: "AWB-ul nu are încă evenimente de la curier",
      color: "#9ca3af",
    };
  }

  const status = FANCOURIER_STATUSES[code];
  if (!status) {
    return {
      code,
      name: "Status necunoscut",
      description: `Codul ${code} nu este recunoscut`,
      color: "#9ca3af",
    };
  }

  const category = STATUS_CATEGORIES.find(c => c.code === status.category);
  return {
    code: status.code,
    name: status.name,
    description: status.description,
    color: category?.color || "#9ca3af",
  };
}
