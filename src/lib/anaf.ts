/**
 * ANAF API Integration
 *
 * Folosește API-ul public ANAF pentru a obține informații despre firme pe baza CUI.
 * Documentație: https://static.anaf.ro/static/10/Anaf/Informatii_R/documentatie_SWUAIF.pdf
 */

// API v9 - URL-ul nou de la ANAF (v8 nu mai funcționează din 2025)
const ANAF_API_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

export interface AnafCompanyInfo {
  cui: string;
  denumire: string;         // Numele firmei
  adresa: string;           // Adresa completă
  nrRegCom: string;         // Nr. Registrul Comerțului
  telefon: string;          // Telefon
  fax: string;              // Fax
  codPostal: string;        // Cod poștal
  act: string;              // Actul de înființare
  stare_inregistrare: string; // Stare înregistrare
  scpTVA: boolean;          // Înregistrat în scopuri TVA
  data_inceput_ScpTVA: string | null;
  data_sfarsit_ScpTVA: string | null;
  data_anul_imp_ScpTVA: string | null;
  mesaj_ScpTVA: string | null;
  dataInceputTvaInc: string | null;
  dataSfarsitTvaInc: string | null;
  dataActualizareTvaInc: string | null;
  dataPublicareTvaInc: string | null;
  tipActTvaInc: string | null;
  statusTvaIncasare: boolean;
  dataInactivare: string | null;
  dataReactivare: string | null;
  dataPublicare: string | null;
  dataRadiere: string | null;
  statusInactivi: boolean;
  dataInceputSplitTVA: string | null;
  dataAnulareSplitTVA: string | null;
  statusSplitTVA: boolean;
  iban: string | null;
  statusRO_e_Factura: boolean;
  dataInceputRO_e_Factura: string | null;
  dataAnulareRO_e_Factura: string | null;
}

export interface AnafLookupResult {
  success: boolean;
  data?: AnafCompanyInfo;
  error?: string;
}

/**
 * Normalizează CUI-ul (elimină RO prefix, spații, etc.)
 */
function normalizeCui(cui: string): string {
  return cui
    .replace(/\s/g, '')
    .replace(/^RO/i, '')
    .replace(/[^0-9]/g, '');
}

/**
 * Caută informații despre o firmă în baza de date ANAF
 * @param cui CUI/CIF-ul firmei (poate fi cu sau fără RO prefix)
 * @returns Informații despre firmă sau eroare
 */
export async function lookupCompanyByCui(cui: string): Promise<AnafLookupResult> {
  try {
    const normalizedCui = normalizeCui(cui);

    if (!normalizedCui || normalizedCui.length < 2 || normalizedCui.length > 13) {
      return {
        success: false,
        error: "CUI invalid. Trebuie să fie între 2 și 13 cifre.",
      };
    }

    // ANAF API acceptă o listă de CUI-uri
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const requestBody = [
      {
        cui: parseInt(normalizedCui, 10),
        data: today,
      }
    ];

    const response = await fetch(ANAF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Eroare ANAF: HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Verifică dacă avem rezultate
    if (!data.found || data.found.length === 0) {
      // Verifică dacă e în lista notFound
      if (data.notFound && data.notFound.length > 0) {
        return {
          success: false,
          error: `CUI-ul ${normalizedCui} nu a fost găsit în baza de date ANAF.`,
        };
      }
      return {
        success: false,
        error: "Nu s-au găsit informații pentru acest CUI.",
      };
    }

    const companyData = data.found[0];
    const generalData = companyData.date_generale || {};
    const inregistrareScopTva = companyData.inregistrare_scop_Tva || {};
    const tvaIncasare = companyData.inregistrare_RTVAI || {};
    const stareInactiv = companyData.stare_inactiv || {};
    const splitTva = companyData.inregistrare_SplitTVA || {};
    const adresa = companyData.adresa_sediu_social || {};

    // În v9, perioade_TVA e un array - luăm prima perioadă activă
    const periodeTva = inregistrareScopTva.perioade_TVA || [];
    const primaPerioadaTva = periodeTva.length > 0 ? periodeTva[0] : {};

    // În v9, statusRO_e_Factura e în date_generale, nu în obiect separat
    const eFacturaStatus = generalData.statusRO_e_Factura || false;
    const eFacturaStartDate = generalData.data_inreg_Reg_RO_e_Factura || null;

    // Construim adresa completă - folosim și județul auto (DB, BV, etc.)
    const adresaCompleta = [
      adresa.sdenumire_Strada,
      adresa.snumar_Strada,
      adresa.sdenumire_Localitate,
      adresa.scod_JudetAuto || adresa.sdenumire_Judet,
      adresa.scod_Postal,
    ].filter(Boolean).join(', ');

    const companyInfo: AnafCompanyInfo = {
      cui: normalizedCui,
      denumire: generalData.denumire || '',
      adresa: adresaCompleta || generalData.adresa || '',
      nrRegCom: generalData.nrRegCom || '',
      telefon: generalData.telefon || '',
      fax: generalData.fax || '',
      codPostal: adresa.scod_Postal || generalData.codPostal || '',
      act: generalData.act || '',
      stare_inregistrare: generalData.stare_inregistrare || '',
      scpTVA: inregistrareScopTva.scpTVA || false,
      data_inceput_ScpTVA: primaPerioadaTva.data_inceput_ScpTVA || null,
      data_sfarsit_ScpTVA: primaPerioadaTva.data_sfarsit_ScpTVA || null,
      data_anul_imp_ScpTVA: primaPerioadaTva.data_anul_imp_ScpTVA || null,
      mesaj_ScpTVA: primaPerioadaTva.mesaj_ScpTVA || null,
      dataInceputTvaInc: tvaIncasare.dataInceputTvaInc || null,
      dataSfarsitTvaInc: tvaIncasare.dataSfarsitTvaInc || null,
      dataActualizareTvaInc: tvaIncasare.dataActualizareTvaInc || null,
      dataPublicareTvaInc: tvaIncasare.dataPublicareTvaInc || null,
      tipActTvaInc: tvaIncasare.tipActTvaInc || null,
      statusTvaIncasare: tvaIncasare.statusTvaIncasare || false,
      dataInactivare: stareInactiv.dataInactivare || null,
      dataReactivare: stareInactiv.dataReactivare || null,
      dataPublicare: stareInactiv.dataPublicare || null,
      dataRadiere: stareInactiv.dataRadiere || null,
      statusInactivi: stareInactiv.statusInactivi || false,
      dataInceputSplitTVA: splitTva.dataInceputSplitTVA || null,
      dataAnulareSplitTVA: splitTva.dataAnulareSplitTVA || null,
      statusSplitTVA: splitTva.statusSplitTVA || false,
      iban: generalData.iban || null,
      statusRO_e_Factura: eFacturaStatus,
      dataInceputRO_e_Factura: eFacturaStartDate,
      dataAnulareRO_e_Factura: null, // Nu mai există în v9
    };

    return {
      success: true,
      data: companyInfo,
    };

  } catch (error: any) {
    console.error("Eroare la căutarea în ANAF:", error);
    return {
      success: false,
      error: error.message || "Eroare la comunicarea cu ANAF",
    };
  }
}

/**
 * Extrage orașul și județul din adresa ANAF
 */
export function parseAnafAddress(adresa: string): {
  city: string;
  county: string;
  street: string;
  postalCode: string;
} {
  // Adresa ANAF e de obicei în format: "Strada, Nr, Localitate, Județ, Cod Poștal"
  const parts = adresa.split(',').map(p => p.trim());

  // Încercăm să identificăm părțile
  const postalCodeMatch = adresa.match(/\b(\d{6})\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[1] : '';

  // Județele din România (pentru identificare)
  const judete = [
    'AB', 'AR', 'AG', 'BC', 'BH', 'BN', 'BT', 'BR', 'BV', 'BZ',
    'CL', 'CS', 'CJ', 'CT', 'CV', 'DB', 'DJ', 'GL', 'GR', 'GJ',
    'HR', 'HD', 'IL', 'IS', 'IF', 'MM', 'MH', 'MS', 'NT', 'OT',
    'PH', 'SJ', 'SM', 'SB', 'SV', 'TR', 'TM', 'TL', 'VL', 'VS', 'VN', 'B'
  ];

  let county = '';
  let city = '';
  let street = '';

  for (const part of parts) {
    // Verifică dacă e cod județ
    const upperPart = part.toUpperCase();
    if (judete.includes(upperPart)) {
      county = upperPart;
    } else if (!street && (part.includes('Str') || part.includes('Bd') || part.includes('Calea') || part.includes('Aleea'))) {
      street = part;
    } else if (!city && !part.match(/^\d+$/) && part !== postalCode) {
      // Dacă nu e număr și nu e cod poștal, probabil e localitate
      if (!street) {
        street = part;
      } else if (!city) {
        city = part;
      }
    }
  }

  // Dacă nu am găsit strada separat, luăm primele 2 părți
  if (!street && parts.length >= 2) {
    street = parts.slice(0, 2).join(', ');
  }

  // Dacă nu am găsit orașul, încercăm partea 3
  if (!city && parts.length >= 3) {
    city = parts[2];
  }

  return {
    city,
    county,
    street,
    postalCode,
  };
}

/**
 * Verifică dacă o firmă este plătitoare de TVA
 */
export async function checkVatPayer(cui: string): Promise<{
  isVatPayer: boolean;
  error?: string;
}> {
  const result = await lookupCompanyByCui(cui);

  if (!result.success || !result.data) {
    return {
      isVatPayer: false,
      error: result.error,
    };
  }

  return {
    isVatPayer: result.data.scpTVA,
  };
}

/**
 * Verifică dacă o firmă folosește e-Factura (obligatoriu pentru relații B2B)
 */
export async function checkEFactura(cui: string): Promise<{
  usesEFactura: boolean;
  startDate?: string;
  error?: string;
}> {
  const result = await lookupCompanyByCui(cui);

  if (!result.success || !result.data) {
    return {
      usesEFactura: false,
      error: result.error,
    };
  }

  return {
    usesEFactura: result.data.statusRO_e_Factura,
    startDate: result.data.dataInceputRO_e_Factura || undefined,
  };
}
