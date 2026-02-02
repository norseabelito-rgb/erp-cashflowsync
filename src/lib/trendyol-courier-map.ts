/**
 * Maps local courier names to Trendyol cargo provider names
 *
 * Note: Trendyol International (EU) supports different carriers than Turkey.
 * These mappings are for Romania market.
 */
export const COURIER_TO_TRENDYOL: Record<string, string> = {
  // Romanian carriers
  fancourier: "FAN Courier",
  sameday: "Sameday",
  dpd: "DPD",
  gls: "GLS",
  cargus: "Cargus",

  // Generic fallback
  other: "Other",
};

export function getTrendyolCargoProvider(localCarrier: string): string {
  const normalized = localCarrier.toLowerCase().trim();
  return COURIER_TO_TRENDYOL[normalized] || COURIER_TO_TRENDYOL["other"];
}

/**
 * Generates tracking URL for Romanian carriers
 */
export function getTrackingUrl(carrier: string, awbNumber: string): string {
  const urls: Record<string, (awb: string) => string> = {
    fancourier: (awb) => `https://www.fancourier.ro/awb-tracking/?awb=${awb}`,
    sameday: (awb) => `https://www.sameday.ro/tracking?awb=${awb}`,
    dpd: (awb) => `https://tracking.dpd.ro/?parcelNumber=${awb}`,
    gls: (awb) => `https://gls-group.com/RO/ro/tracking/${awb}`,
    cargus: (awb) => `https://www.cargus.ro/tracking-colet?t=${awb}`,
  };

  const normalized = carrier.toLowerCase().trim();
  return urls[normalized]?.(awbNumber) || "";
}
