import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

export interface ValidationResult {
  isValid: boolean;
  message: string;
  formattedValue?: string;
}

// Județele României (pentru validarea adresei)
export const ROMANIAN_COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
  "Brașov", "Brăila", "București", "Buzău", "Caraș-Severin", "Călărași",
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj",
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea",
  "Vrancea"
];

// Variante acceptate pentru București
const BUCHAREST_VARIANTS = [
  "bucurești", "bucharest", "bucuresti", "buc", "b"
];

// Sectoarele Bucureștiului
const BUCHAREST_SECTORS = ["1", "2", "3", "4", "5", "6"];

/**
 * Validează un număr de telefon românesc
 */
export function validateRomanianPhone(phone: string | null | undefined): ValidationResult {
  if (!phone) {
    return {
      isValid: false,
      message: "Numărul de telefon lipsește",
    };
  }

  // Curățăm numărul de spații și caractere speciale
  let cleanPhone = phone.replace(/[\s\-\.\(\)]/g, "");
  
  // Adăugăm prefixul +40 dacă lipsește
  if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
    cleanPhone = "+40" + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith("+")) {
    cleanPhone = "+" + cleanPhone;
  }

  try {
    // Verificăm dacă este valid folosind libphonenumber
    if (!isValidPhoneNumber(cleanPhone, "RO")) {
      return {
        isValid: false,
        message: "Numărul de telefon nu este valid pentru România",
      };
    }

    const phoneNumber = parsePhoneNumber(cleanPhone, "RO");
    
    // Verificăm că este într-adevăr număr românesc
    if (phoneNumber.country !== "RO") {
      return {
        isValid: false,
        message: "Numărul de telefon nu este din România",
      };
    }

    // Verificăm tipul numărului (mobil/fix)
    const nationalNumber = phoneNumber.nationalNumber;
    const isMobile = nationalNumber.startsWith("7");
    const isLandline = nationalNumber.startsWith("2") || nationalNumber.startsWith("3");

    if (!isMobile && !isLandline) {
      return {
        isValid: false,
        message: "Numărul de telefon nu pare a fi valid (nu este mobil sau fix)",
      };
    }

    return {
      isValid: true,
      message: isMobile ? "Număr mobil valid" : "Număr fix valid",
      formattedValue: phoneNumber.formatInternational(),
    };
  } catch (error) {
    return {
      isValid: false,
      message: "Numărul de telefon nu poate fi validat",
    };
  }
}

/**
 * Validează o adresă din România
 */
export function validateRomanianAddress(address: {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  zip?: string | null;
}): ValidationResult {
  const issues: string[] = [];
  
  // Verificăm țara
  const country = address.country?.toLowerCase().trim();
  if (!country) {
    issues.push("Țara lipsește");
  } else if (
    country !== "ro" &&
    country !== "romania" &&
    country !== "românia"
  ) {
    issues.push("Țara nu este România");
  }

  // Verificăm orașul
  if (!address.city?.trim()) {
    issues.push("Orașul lipsește");
  }

  // Verificăm adresa
  if (!address.address1?.trim()) {
    issues.push("Adresa lipsește");
  } else if (address.address1.trim().length < 5) {
    issues.push("Adresa este prea scurtă");
  }

  // Verificăm județul/sectorul
  const province = address.province?.trim().toLowerCase();
  if (!province) {
    issues.push("Județul/Sectorul lipsește");
  } else {
    // Verificăm dacă este București
    const isBucharest = BUCHAREST_VARIANTS.some(v => 
      address.city?.toLowerCase().includes(v) || province.includes(v)
    );
    
    if (isBucharest) {
      // Pentru București, verificăm sectorul
      const sectorMatch = province.match(/sector\s*(\d)/i) || 
                         address.city?.match(/sector\s*(\d)/i) ||
                         province.match(/^s(\d)$/i);
      
      if (!sectorMatch && !BUCHAREST_SECTORS.some(s => province.includes(s))) {
        // Este ok, unele comenzi nu au sector explicit
      }
    } else {
      // Pentru alte județe, verificăm dacă județul există
      const countyExists = ROMANIAN_COUNTIES.some(county => 
        county.toLowerCase() === province.toLowerCase() ||
        province.toLowerCase().includes(county.toLowerCase())
      );
      
      if (!countyExists) {
        issues.push(`Județul "${address.province}" nu este recunoscut`);
      }
    }
  }

  // Verificăm codul poștal
  if (!address.zip?.trim()) {
    issues.push("Codul poștal lipsește");
  } else {
    const zip = address.zip.trim();
    // Codul poștal românesc are 6 cifre
    if (!/^\d{6}$/.test(zip)) {
      issues.push("Codul poștal nu este valid (trebuie să aibă 6 cifre)");
    }
  }

  if (issues.length > 0) {
    return {
      isValid: false,
      message: issues.join("; "),
    };
  }

  return {
    isValid: true,
    message: "Adresă validă",
  };
}

/**
 * Validează o comandă completă
 */
export function validateOrder(order: {
  customerPhone?: string | null;
  shippingAddress1?: string | null;
  shippingAddress2?: string | null;
  shippingCity?: string | null;
  shippingProvince?: string | null;
  shippingCountry?: string | null;
  shippingZip?: string | null;
}): {
  phone: ValidationResult;
  address: ValidationResult;
  isFullyValid: boolean;
} {
  const phoneValidation = validateRomanianPhone(order.customerPhone);
  const addressValidation = validateRomanianAddress({
    address1: order.shippingAddress1,
    address2: order.shippingAddress2,
    city: order.shippingCity,
    province: order.shippingProvince,
    country: order.shippingCountry,
    zip: order.shippingZip,
  });

  return {
    phone: phoneValidation,
    address: addressValidation,
    isFullyValid: phoneValidation.isValid && addressValidation.isValid,
  };
}
