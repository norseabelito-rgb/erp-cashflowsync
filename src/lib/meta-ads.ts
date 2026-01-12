/**
 * Meta (Facebook/Instagram) Ads API Integration
 * 
 * Documentație: https://developers.facebook.com/docs/marketing-apis
 * 
 * Flux OAuth:
 * 1. User click "Conectează Meta Ads"
 * 2. Redirect la Meta OAuth cu scopes necesare
 * 3. User autorizează
 * 4. Meta redirect cu code
 * 5. Exchange code pentru access_token
 * 6. Salvăm token-ul în DB
 */

import { prisma } from "@/lib/db";
import { AdsPlatform, AdsAccountStatus, AdsCampaignStatus } from "@prisma/client";
import { getMetaAdsConfig, AdsConfig } from "@/lib/ads-config";

// ==================== CONFIGURARE ====================

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Scopes necesare pentru Ads Management
// Notă: read_insights a fost eliminat - necesită App Review separat
// ads_read include deja majoritatea datelor necesare
const META_SCOPES = [
  "ads_management",      // Gestionare campanii
  "ads_read",            // Citire date ads (include insights de bază)
  "business_management", // Acces Business Manager
].join(",");

// ==================== TYPES ====================

interface MetaOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  business?: {
    id: string;
    name: string;
  };
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  bid_amount?: number;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
    };
    custom_audiences?: Array<{ id: string; name: string }>;
  };
  promoted_object?: any;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  adset_id: string;
  creative?: {
    id: string;
    name?: string;
    thumbnail_url?: string;
    object_story_spec?: {
      link_data?: {
        call_to_action?: { type: string };
        link?: string;
        message?: string;
      };
      video_data?: {
        call_to_action?: { type: string };
      };
    };
  };
}

interface MetaInsights {
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  date_start: string;
  date_stop: string;
}

// ==================== OAUTH ====================

/**
 * Generează URL-ul de autorizare OAuth (folosind AdsSettings)
 */
export async function getMetaOAuthUrl(state: string): Promise<string> {
  const config = await getMetaAdsConfig();
  if (!config || !config.isConfigured) {
    throw new Error("Meta Ads nu este configurat. Completează setările în Ads > Setări.");
  }

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: META_SCOPES,
    response_type: "code",
    state: state,
  });

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`;
}

/**
 * Generează URL-ul de autorizare OAuth (cu credențiale furnizate direct)
 */
export function getMetaOAuthUrlWithApp(state: string, appId: string, appSecret: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: META_SCOPES,
    response_type: "code",
    state: state,
  });

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`;
}

/**
 * Exchange authorization code pentru access token (cu credențiale furnizate)
 */
export async function exchangeMetaCodeWithApp(
  code: string, 
  appId: string, 
  appSecret: string, 
  redirectUri: string
): Promise<MetaOAuthResponse> {
  console.log("[Meta API] Exchanging code with app:", {
    appId: appId.substring(0, 8) + "...",
    redirectUri
  });
  
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code: code,
  });

  const response = await fetch(
    `${META_GRAPH_URL}/oauth/access_token?${params}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("[Meta API] Exchange code error:", {
      status: response.status,
      error: error.error,
      appId: appId.substring(0, 8) + "..."
    });
    throw new Error(error.error?.message || "Failed to exchange code");
  }

  const result = await response.json();
  console.log("[Meta API] Exchange successful:", { hasToken: !!result.access_token });
  return result;
}

/**
 * Exchange authorization code pentru access token
 */
export async function exchangeMetaCode(code: string): Promise<MetaOAuthResponse> {
  const config = await getMetaAdsConfig();
  if (!config || !config.isConfigured) {
    throw new Error("Meta Ads nu este configurat");
  }

  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code: code,
  });

  const response = await fetch(
    `${META_GRAPH_URL}/oauth/access_token?${params}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to exchange code");
  }

  return response.json();
}

/**
 * Extinde token-ul pentru long-lived access (60 zile)
 */
export async function extendMetaToken(shortLivedToken: string): Promise<MetaOAuthResponse> {
  const config = await getMetaAdsConfig();
  if (!config || !config.isConfigured) {
    throw new Error("Meta Ads nu este configurat");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${META_GRAPH_URL}/oauth/access_token?${params}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to extend token");
  }

  return response.json();
}

/**
 * Verifică dacă token-ul este valid
 */
export async function validateMetaToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${META_GRAPH_URL}/me?access_token=${accessToken}`
    );
    return response.ok;
  } catch {
    return false;
  }
}

// ==================== AD ACCOUNTS ====================

/**
 * Obține toate ad accounts accesibile cu acest token
 */
export async function getMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  console.log("[Meta API] Fetching ad accounts...");
  const accounts: MetaAdAccount[] = [];
  let url = `${META_GRAPH_URL}/me/adaccounts?fields=id,account_id,name,currency,timezone_name,account_status,business{id,name}&access_token=${accessToken}`;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      console.error("[Meta API] Error fetching ad accounts:", error.error);
      throw new Error(error.error?.message || "Failed to fetch ad accounts");
    }

    const data = await response.json();
    accounts.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  console.log("[Meta API] Ad accounts fetched:", {
    count: accounts.length,
    accounts: accounts.map(a => ({
      id: a.account_id,
      name: a.name,
      status: a.account_status,
      businessId: a.business?.id,
      businessName: a.business?.name
    }))
  });

  return accounts;
}

/**
 * Obține detalii despre un ad account specific
 */
export async function getMetaAdAccountDetails(
  accountId: string,
  accessToken: string
): Promise<MetaAdAccount> {
  const response = await fetch(
    `${META_GRAPH_URL}/${accountId}?fields=id,account_id,name,currency,timezone_name,account_status,business{id,name}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch account details");
  }

  return response.json();
}

// ==================== CAMPAIGNS ====================

/**
 * Obține toate campaniile pentru un ad account
 */
export async function getMetaCampaigns(
  accountId: string,
  accessToken: string,
  limit: number = 100
): Promise<MetaCampaign[]> {
  const campaigns: MetaCampaign[] = [];
  let url = `${META_GRAPH_URL}/${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time&limit=${limit}&access_token=${accessToken}`;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch campaigns");
    }

    const data = await response.json();
    campaigns.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  return campaigns;
}

/**
 * Obține detalii despre o campanie
 */
export async function getMetaCampaignDetails(
  campaignId: string,
  accessToken: string
): Promise<MetaCampaign> {
  const response = await fetch(
    `${META_GRAPH_URL}/${campaignId}?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch campaign");
  }

  return response.json();
}

/**
 * Actualizează status-ul unei campanii (ACTIVE/PAUSED)
 */
export async function updateMetaCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "PAUSED",
  accessToken: string
): Promise<boolean> {
  const response = await fetch(
    `${META_GRAPH_URL}/${campaignId}?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to update campaign status");
  }

  const result = await response.json();
  return result.success === true;
}

/**
 * Actualizează bugetul unei campanii
 */
export async function updateMetaCampaignBudget(
  campaignId: string,
  dailyBudget: number | null,
  lifetimeBudget: number | null,
  accessToken: string
): Promise<boolean> {
  const body: any = {};
  
  // Meta API așteaptă bugetul în cenți
  if (dailyBudget !== null) {
    body.daily_budget = Math.round(dailyBudget * 100);
  }
  if (lifetimeBudget !== null) {
    body.lifetime_budget = Math.round(lifetimeBudget * 100);
  }

  const response = await fetch(
    `${META_GRAPH_URL}/${campaignId}?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to update campaign budget");
  }

  const result = await response.json();
  return result.success === true;
}

// ==================== AD SETS ====================

/**
 * Obține toate ad sets pentru o campanie
 */
export async function getMetaAdSets(
  campaignId: string,
  accessToken: string
): Promise<MetaAdSet[]> {
  const adSets: MetaAdSet[] = [];
  let url = `${META_GRAPH_URL}/${campaignId}/adsets?fields=id,name,status,effective_status,daily_budget,lifetime_budget,bid_strategy,bid_amount,targeting,promoted_object&limit=100&access_token=${accessToken}`;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch ad sets");
    }

    const data = await response.json();
    adSets.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  return adSets;
}

/**
 * Actualizează status-ul unui ad set
 */
export async function updateMetaAdSetStatus(
  adSetId: string,
  status: "ACTIVE" | "PAUSED",
  accessToken: string
): Promise<boolean> {
  const response = await fetch(
    `${META_GRAPH_URL}/${adSetId}?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to update ad set status");
  }

  const result = await response.json();
  return result.success === true;
}

// ==================== ADS ====================

/**
 * Obține toate ads pentru un ad set
 */
export async function getMetaAds(
  adSetId: string,
  accessToken: string
): Promise<MetaAd[]> {
  const ads: MetaAd[] = [];
  let url = `${META_GRAPH_URL}/${adSetId}/ads?fields=id,name,status,effective_status,creative{id,name,thumbnail_url,object_story_spec}&limit=100&access_token=${accessToken}`;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch ads");
    }

    const data = await response.json();
    ads.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  return ads;
}

// ==================== INSIGHTS ====================

/**
 * Obține insights pentru un obiect (campaign, adset, ad)
 */
export async function getMetaInsights(
  objectId: string,
  accessToken: string,
  datePreset: string = "last_30d",
  breakdown?: string
): Promise<MetaInsights[]> {
  const fields = "impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,actions,action_values";
  let url = `${META_GRAPH_URL}/${objectId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`;
  
  if (breakdown) {
    url += `&breakdowns=${breakdown}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch insights");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Obține insights zilnice pentru o campanie
 */
export async function getMetaDailyInsights(
  campaignId: string,
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<MetaInsights[]> {
  const fields = "impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,actions,action_values";
  const timeRange = JSON.stringify({
    since: startDate,
    until: endDate,
  });

  const url = `${META_GRAPH_URL}/${campaignId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&time_increment=1&access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch daily insights");
  }

  const data = await response.json();
  return data.data || [];
}

// ==================== PIXELS ====================

/**
 * Obține pixels pentru un ad account sau business
 * Meta pixels pot fi la nivel de Business sau shared cu Ad Account
 */
export async function getMetaPixels(
  accountId: string,
  accessToken: string,
  businessId?: string | null
): Promise<any[]> {
  const allPixels: any[] = [];
  console.log(`[Meta Pixels] ===== Starting pixel fetch =====`);
  console.log(`[Meta Pixels] Account: ${accountId}, Business: ${businessId || 'none'}`);
  
  // Try 1: Get pixels from ad account (shared pixels)
  const url1 = `${META_GRAPH_URL}/${accountId}/adspixels?fields=id,name,last_fired_time,is_created_by_business&access_token=${accessToken.substring(0,20)}...`;
  console.log(`[Meta Pixels] Try 1 - Calling: ${META_GRAPH_URL}/${accountId}/adspixels`);
  try {
    const response = await fetch(
      `${META_GRAPH_URL}/${accountId}/adspixels?fields=id,name,last_fired_time,is_created_by_business&access_token=${accessToken}`
    );
    
    const data = await response.json();
    console.log(`[Meta Pixels] Try 1 - Response status: ${response.status}`);
    console.log(`[Meta Pixels] Try 1 - Response:`, JSON.stringify(data).substring(0, 500));
    
    if (response.ok && data.data && data.data.length > 0) {
      console.log(`[Meta Pixels] Try 1 - Found ${data.data.length} pixels from ad account`);
      allPixels.push(...data.data);
    } else if (data.error) {
      console.log(`[Meta Pixels] Try 1 - Error: ${data.error.message} (code: ${data.error.code})`);
    } else {
      console.log(`[Meta Pixels] Try 1 - No pixels found (empty data array)`);
    }
  } catch (e: any) {
    console.log(`[Meta Pixels] Try 1 - Exception: ${e.message}`);
  }

  // Try 2: Get pixels from business (owned pixels)
  if (businessId) {
    console.log(`[Meta Pixels] Try 2 - Calling: ${META_GRAPH_URL}/${businessId}/owned_pixels`);
    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${businessId}/owned_pixels?fields=id,name,last_fired_time&access_token=${accessToken}`
      );
      
      const data = await response.json();
      console.log(`[Meta Pixels] Try 2 - Response status: ${response.status}`);
      console.log(`[Meta Pixels] Try 2 - Response:`, JSON.stringify(data).substring(0, 500));
      
      if (response.ok && data.data && data.data.length > 0) {
        console.log(`[Meta Pixels] Try 2 - Found ${data.data.length} pixels from business`);
        for (const pixel of data.data) {
          if (!allPixels.find(p => p.id === pixel.id)) {
            allPixels.push(pixel);
          }
        }
      } else if (data.error) {
        console.log(`[Meta Pixels] Try 2 - Error: ${data.error.message}`);
      }
    } catch (e: any) {
      console.log(`[Meta Pixels] Try 2 - Exception: ${e.message}`);
    }
  } else {
    console.log(`[Meta Pixels] Try 2 - Skipped (no businessId)`);
  }

  // Try 3: Get pixels via promoted_objects on campaigns (alternative approach)
  console.log(`[Meta Pixels] Try 3 - Calling: ${META_GRAPH_URL}/${accountId}/campaigns (to find pixel_id from promoted_objects)`);
  try {
    const response = await fetch(
      `${META_GRAPH_URL}/${accountId}/campaigns?fields=promoted_object&limit=5&access_token=${accessToken}`
    );
    
    const data = await response.json();
    if (response.ok && data.data) {
      for (const campaign of data.data) {
        if (campaign.promoted_object?.pixel_id) {
          const pixelId = campaign.promoted_object.pixel_id;
          if (!allPixels.find(p => p.id === pixelId)) {
            console.log(`[Meta Pixels] Try 3 - Found pixel from campaign promoted_object: ${pixelId}`);
            // Fetch pixel details
            try {
              const pixelResponse = await fetch(
                `${META_GRAPH_URL}/${pixelId}?fields=id,name,last_fired_time&access_token=${accessToken}`
              );
              if (pixelResponse.ok) {
                const pixelData = await pixelResponse.json();
                if (pixelData.id) {
                  allPixels.push(pixelData);
                  console.log(`[Meta Pixels] Try 3 - Added pixel: ${pixelData.name || pixelId}`);
                }
              }
            } catch (e) {
              console.log(`[Meta Pixels] Try 3 - Could not fetch pixel details for ${pixelId}`);
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.log(`[Meta Pixels] Try 3 - Exception: ${e.message}`);
  }

  console.log(`[Meta Pixels] ===== Total pixels found: ${allPixels.length} =====`);
  return allPixels;
}

/**
 * Verifică evenimentele recente pentru un pixel
 */
export async function getMetaPixelStats(
  pixelId: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `${META_GRAPH_URL}/${pixelId}/stats?access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch pixel stats");
  }

  return response.json();
}

// ==================== HELPERS ====================

/**
 * Parsează naming convention pentru a extrage SKU-uri
 * Format: [OBIECTIV]_[TIP]_[COD]_[AUDIENTA]_[DATA]
 * Exemplu: CONV_SKU_PAT001-PAT002_BROAD_2024Q1
 */
export function parseMetaCampaignName(name: string): {
  valid: boolean;
  objective?: string;
  type?: string;
  codes?: string[];
  audience?: string;
} {
  const parts = name.split("_");
  
  if (parts.length < 4) {
    return { valid: false };
  }

  const [objective, type, codes, audience] = parts;

  // Verifică objective valid
  const validObjectives = ["CONV", "TRAFFIC", "AWARE", "CATALOG"];
  if (!validObjectives.includes(objective)) {
    return { valid: false };
  }

  // Verifică type valid
  const validTypes = ["SKU", "CAT", "ALL"];
  if (!validTypes.includes(type)) {
    return { valid: false };
  }

  // Parsează codurile (separate cu -)
  const codeList = codes.split("-").filter(Boolean);

  return {
    valid: true,
    objective,
    type,
    codes: codeList,
    audience,
  };
}

/**
 * Convertește status Meta în enum-ul nostru
 */
export function mapMetaStatus(status: string): AdsCampaignStatus {
  const statusMap: Record<string, AdsCampaignStatus> = {
    ACTIVE: AdsCampaignStatus.ACTIVE,
    PAUSED: AdsCampaignStatus.PAUSED,
    DELETED: AdsCampaignStatus.DELETED,
    ARCHIVED: AdsCampaignStatus.ARCHIVED,
    PENDING_REVIEW: AdsCampaignStatus.PENDING,
    IN_PROCESS: AdsCampaignStatus.PENDING,
    WITH_ISSUES: AdsCampaignStatus.ACTIVE, // Activ dar cu probleme
  };

  return statusMap[status] || AdsCampaignStatus.PAUSED;
}

/**
 * Extrage conversions și revenue din actions
 */
export function extractConversionsFromInsights(insights: MetaInsights): {
  conversions: number;
  revenue: number;
} {
  let conversions = 0;
  let revenue = 0;

  // Caută purchase actions
  const purchaseTypes = ["purchase", "omni_purchase", "onsite_conversion.purchase"];
  
  if (insights.actions) {
    for (const action of insights.actions) {
      if (purchaseTypes.includes(action.action_type)) {
        conversions += parseInt(action.value, 10) || 0;
      }
    }
  }

  if (insights.action_values) {
    for (const actionValue of insights.action_values) {
      if (purchaseTypes.includes(actionValue.action_type)) {
        revenue += parseFloat(actionValue.value) || 0;
      }
    }
  }

  return { conversions, revenue };
}

/**
 * Calculează KPIs din metrici raw
 */
export function calculateKPIs(data: {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  reach?: number;
}): {
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
} {
  return {
    ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : null,
    cpc: data.clicks > 0 ? data.spend / data.clicks : null,
    cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : null,
    cpa: data.conversions > 0 ? data.spend / data.conversions : null,
    roas: data.spend > 0 ? data.revenue / data.spend : null,
    frequency: data.reach && data.reach > 0 ? data.impressions / data.reach : null,
  };
}

// ==================== CAMPAIGN CREATION ====================

/**
 * Obiectivele disponibile pentru campanii Meta
 */
export const META_OBJECTIVES = [
  { value: "OUTCOME_AWARENESS", label: "Awareness", description: "Reach & brand awareness" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement", description: "Post engagement, page likes" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic", description: "Website visits" },
  { value: "OUTCOME_LEADS", label: "Leads", description: "Lead generation" },
  { value: "OUTCOME_SALES", label: "Sales", description: "Conversions & catalog sales" },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion", description: "App installs" },
];

/**
 * Creează o campanie nouă în Meta Ads
 */
export async function createMetaCampaign(params: {
  accountExternalId: string;
  accessToken: string;
  name: string;
  objective: string;
  status?: "ACTIVE" | "PAUSED";
  dailyBudget?: number;
  lifetimeBudget?: number;
  specialAdCategories?: string[];
}): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  try {
    const {
      accountExternalId,
      accessToken,
      name,
      objective,
      status = "PAUSED",
      dailyBudget,
      lifetimeBudget,
      specialAdCategories = [],
    } = params;

    const campaignData: Record<string, any> = {
      name,
      objective,
      status,
      special_ad_categories: specialAdCategories,
      access_token: accessToken,
    };

    // Budget la nivel de campanie (ABO - Account Budget Optimization)
    if (dailyBudget) {
      campaignData.daily_budget = Math.round(dailyBudget * 100); // Meta expects cents
    }
    if (lifetimeBudget) {
      campaignData.lifetime_budget = Math.round(lifetimeBudget * 100);
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${accountExternalId}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta campaign creation error:", data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, campaignId: data.id };
  } catch (error: any) {
    console.error("Error creating Meta campaign:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Creează un Ad Set în Meta Ads
 */
export async function createMetaAdSet(params: {
  accountExternalId: string;
  accessToken: string;
  campaignId: string;
  name: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  billingEvent?: string;
  optimizationGoal?: string;
  targeting: {
    geoLocations?: { countries?: string[]; cities?: { key: string }[] };
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    interests?: { id: string; name: string }[];
    customAudiences?: { id: string }[];
  };
  startTime?: Date;
  endTime?: Date;
  status?: "ACTIVE" | "PAUSED";
}): Promise<{ success: boolean; adSetId?: string; error?: string }> {
  try {
    const {
      accountExternalId,
      accessToken,
      campaignId,
      name,
      dailyBudget,
      lifetimeBudget,
      billingEvent = "IMPRESSIONS",
      optimizationGoal = "REACH",
      targeting,
      startTime,
      endTime,
      status = "PAUSED",
    } = params;

    const adSetData: Record<string, any> = {
      campaign_id: campaignId,
      name,
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      status,
      access_token: accessToken,
      targeting: {
        geo_locations: targeting.geoLocations || { countries: ["RO"] },
        age_min: targeting.ageMin || 18,
        age_max: targeting.ageMax || 65,
      },
    };

    if (targeting.genders?.length) {
      adSetData.targeting.genders = targeting.genders;
    }
    if (targeting.interests?.length) {
      adSetData.targeting.interests = targeting.interests;
    }
    if (targeting.customAudiences?.length) {
      adSetData.targeting.custom_audiences = targeting.customAudiences;
    }

    if (dailyBudget) {
      adSetData.daily_budget = Math.round(dailyBudget * 100);
    }
    if (lifetimeBudget) {
      adSetData.lifetime_budget = Math.round(lifetimeBudget * 100);
    }
    if (startTime) {
      adSetData.start_time = startTime.toISOString();
    }
    if (endTime) {
      adSetData.end_time = endTime.toISOString();
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${accountExternalId}/adsets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adSetData),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta ad set creation error:", data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, adSetId: data.id };
  } catch (error: any) {
    console.error("Error creating Meta ad set:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Creează un Ad în Meta Ads
 */
export async function createMetaAd(params: {
  accountExternalId: string;
  accessToken: string;
  adSetId: string;
  name: string;
  creativeId?: string;
  creative?: {
    pageId: string;
    message?: string;
    link?: string;
    imageHash?: string;
    videoId?: string;
    callToAction?: string;
  };
  status?: "ACTIVE" | "PAUSED";
}): Promise<{ success: boolean; adId?: string; error?: string }> {
  try {
    const {
      accountExternalId,
      accessToken,
      adSetId,
      name,
      creativeId,
      creative,
      status = "PAUSED",
    } = params;

    const adData: Record<string, any> = {
      adset_id: adSetId,
      name,
      status,
      access_token: accessToken,
    };

    if (creativeId) {
      adData.creative = { creative_id: creativeId };
    } else if (creative) {
      adData.creative = {
        object_story_spec: {
          page_id: creative.pageId,
          link_data: {
            message: creative.message || "",
            link: creative.link || "",
            image_hash: creative.imageHash,
            call_to_action: creative.callToAction
              ? { type: creative.callToAction }
              : undefined,
          },
        },
      };
    }

    const response = await fetch(
      `${META_GRAPH_URL}/${accountExternalId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adData),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta ad creation error:", data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, adId: data.id };
  } catch (error: any) {
    console.error("Error creating Meta ad:", error);
    return { success: false, error: error.message };
  }
}

// ==================== SYNC FUNCTION ====================

// Helper: Check if error is rate limit
function isRateLimitError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('rate limit') || 
         message.includes('user request limit') ||
         message.includes('too many calls') ||
         message.includes('limit reached') ||
         error?.code === 17 || // Meta rate limit code
         error?.code === 4;    // Meta app limit code
}

// Helper: Calculate retry time based on error
function calculateRetryTime(retryCount: number): Date {
  // Exponential backoff: 5min, 15min, 30min, 1h, 2h
  const delays = [5, 15, 30, 60, 120];
  const delayMinutes = delays[Math.min(retryCount, delays.length - 1)];
  const retryAt = new Date();
  retryAt.setMinutes(retryAt.getMinutes() + delayMinutes);
  return retryAt;
}

// Helper: Update sync job progress (safe - ignores if table doesn't exist)
async function updateSyncJobProgress(
  jobId: string, 
  updates: {
    status?: string;
    syncedCampaigns?: number;
    syncedAdSets?: number;
    syncedAds?: number;
    totalCampaigns?: number;
    totalAdSets?: number;
    totalAds?: number;
    currentPhase?: string;
    currentCampaignIdx?: number;
    currentAdSetIdx?: number;
    campaignsList?: string[];
    errorMessage?: string | null;
    errorCode?: string | null;
    retryAt?: Date | null;
    retryCount?: number;
    startedAt?: Date;
    completedAt?: Date | null;
  }
): Promise<void> {
  try {
    await prisma.adsSyncJob.update({
      where: { id: jobId },
      data: {
        ...updates,
        campaignsList: updates.campaignsList ? JSON.stringify(updates.campaignsList) : undefined,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    // Ignore errors - table might not exist
  }
}

/**
 * Sincronizează toate datele pentru un cont Meta cu support pentru:
 * - Progress tracking
 * - Rate limit handling
 * - Resume from last position
 */
export async function syncMetaAccount(accountId: string, existingJobId?: string): Promise<{
  success: boolean;
  campaignsSynced: number;
  adSetsSynced: number;
  adsSynced: number;
  error?: string;
  jobId?: string;
  paused?: boolean;
  retryAt?: Date;
}> {
  let syncJob: any = null;
  let syncJobsEnabled = true; // Will be set to false if table doesn't exist
  let campaignsSynced = 0;
  let adSetsSynced = 0;
  let adsSynced = 0;

  try {
    console.log(`[Meta Sync] Starting sync for account ${accountId}`);
    
    // Obține contul din DB
    const account = await prisma.adsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== "META") {
      return { success: false, campaignsSynced: 0, adSetsSynced: 0, adsSynced: 0, error: "Account not found" };
    }

    // Verifică token-ul
    const isValid = await validateMetaToken(account.accessToken);
    if (!isValid) {
      await prisma.adsAccount.update({
        where: { id: accountId },
        data: { status: AdsAccountStatus.ERROR, lastSyncError: "Token invalid" },
      });
      return { success: false, campaignsSynced: 0, adSetsSynced: 0, adsSynced: 0, error: "Token invalid" };
    }

    // Try to get or create sync job (with fallback if table doesn't exist)
    try {
      if (existingJobId) {
        syncJob = await prisma.adsSyncJob.findUnique({ where: { id: existingJobId } });
        if (syncJob && syncJob.status === 'paused') {
          // Resume from where we left off
          campaignsSynced = syncJob.syncedCampaigns;
          adSetsSynced = syncJob.syncedAdSets;
          adsSynced = syncJob.syncedAds;
          console.log(`[Meta Sync] Resuming from campaign ${syncJob.currentCampaignIdx}, synced: ${campaignsSynced} campaigns, ${adSetsSynced} adsets, ${adsSynced} ads`);
        }
      }

      if (!syncJob || syncJob.status === 'completed' || syncJob.status === 'failed') {
        // Create new sync job
        syncJob = await prisma.adsSyncJob.create({
          data: {
            accountId,
            status: 'running',
            startedAt: new Date(),
          },
        });
        console.log(`[Meta Sync] Created new sync job ${syncJob.id}`);
      } else {
        // Update existing job to running
        await updateSyncJobProgress(syncJob.id, { 
          status: 'running',
          errorMessage: null,
          errorCode: null,
          retryAt: null,
        });
      }
    } catch (syncJobError: any) {
      // Table doesn't exist - continue without sync job tracking
      console.log(`[Meta Sync] Sync jobs table not available, continuing without progress tracking`);
      syncJobsEnabled = false;
      syncJob = null;
    }

    // Marchează sync în progress
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: { syncInProgress: true },
    });

    // Fetch campaigns
    const metaAccountId = `act_${account.externalId}`;
    
    // ========== SYNC PIXELS FIRST (before campaigns) ==========
    console.log(`[Meta Sync] ===== STARTING PIXEL SYNC =====`);
    console.log(`[Meta Sync] Account ID: ${metaAccountId}, Business ID: ${account.businessId || 'none'}`);
    try {
      const pixels = await getMetaPixels(metaAccountId, account.accessToken, account.businessId);
      console.log(`[Meta Sync] getMetaPixels returned ${pixels.length} pixels`);
      
      for (const pixel of pixels) {
        console.log(`[Meta Sync] Processing pixel: ${pixel.id} - ${pixel.name}`);
        try {
          // Parse last_fired_time - can be ISO string or Unix timestamp
          let lastEventAt: Date | null = null;
          if (pixel.last_fired_time) {
            console.log(`[Meta Sync] Raw last_fired_time: ${pixel.last_fired_time} (type: ${typeof pixel.last_fired_time})`);
            
            if (typeof pixel.last_fired_time === 'number') {
              // Unix timestamp
              lastEventAt = new Date(pixel.last_fired_time * 1000);
            } else if (typeof pixel.last_fired_time === 'string') {
              // Fix timezone format: +0200 -> +02:00
              let dateStr = pixel.last_fired_time;
              // Match +HHMM or -HHMM at end of string and convert to +HH:MM
              dateStr = dateStr.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');
              
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                lastEventAt = parsed;
              }
            }
            
            console.log(`[Meta Sync] Parsed lastEventAt: ${lastEventAt}`);
          }
          
          await prisma.adsPixel.upsert({
            where: {
              platform_externalId: {
                platform: "META",
                externalId: pixel.id,
              },
            },
            create: {
              accountId: account.id,
              platform: "META",
              externalId: pixel.id,
              name: pixel.name || `Pixel ${pixel.id}`,
              isInstalled: !!pixel.last_fired_time,
              lastEventAt,
            },
            update: {
              name: pixel.name || `Pixel ${pixel.id}`,
              isInstalled: !!pixel.last_fired_time,
              lastEventAt,
              lastCheckedAt: new Date(),
            },
          });
          console.log(`[Meta Sync] ✓ Saved pixel ${pixel.id}`);
        } catch (pixelDbErr: any) {
          console.error(`[Meta Sync] ✗ Error saving pixel ${pixel.id} to DB:`, pixelDbErr.message);
        }
      }
      console.log(`[Meta Sync] ===== PIXEL SYNC COMPLETE =====`);
    } catch (pixelsErr: any) {
      console.error(`[Meta Sync] ===== PIXEL SYNC FAILED =====`);
      console.error(`[Meta Sync] Error:`, pixelsErr.message);
    }

    console.log(`[Meta Sync] Fetching campaigns for ${metaAccountId}`);
    
    let campaigns: any[];
    try {
      campaigns = await getMetaCampaigns(metaAccountId, account.accessToken);
    } catch (error: any) {
      if (isRateLimitError(error) && syncJobsEnabled && syncJob) {
        const retryAt = calculateRetryTime(syncJob.retryCount || 0);
        try {
          await updateSyncJobProgress(syncJob.id, {
            status: 'paused',
            errorMessage: 'Rate limit atins la încărcarea campaniilor',
            errorCode: 'RATE_LIMIT',
            retryAt,
          });
        } catch (e) { /* ignore */ }
        await prisma.adsAccount.update({
          where: { id: accountId },
          data: { syncInProgress: false },
        });
        console.log(`[Meta Sync] Rate limited, will retry at ${retryAt}`);
        return { 
          success: false, 
          campaignsSynced, 
          adSetsSynced, 
          adsSynced, 
          jobId: syncJob.id,
          paused: true,
          retryAt,
          error: 'Rate limit - sincronizare pusă în pauză'
        };
      }
      throw error;
    }

    console.log(`[Meta Sync] Found ${campaigns.length} campaigns`);

    // Get campaign IDs list for resume
    const campaignIds = campaigns.map(c => c.id);
    
    // Update job with totals (if sync jobs enabled)
    if (syncJobsEnabled && syncJob) {
      try {
        await updateSyncJobProgress(syncJob.id, {
          totalCampaigns: campaigns.length,
          campaignsList: campaignIds,
          currentPhase: 'campaigns',
        });
      } catch (e) { /* ignore */ }
    }

    // Determine start index for resume
    const startCampaignIdx = syncJob.currentCampaignIdx || 0;

    for (let campIdx = startCampaignIdx; campIdx < campaigns.length; campIdx++) {
      const campaign = campaigns[campIdx];
      
      try {
        // Update current position
        await updateSyncJobProgress(syncJob.id, {
          currentCampaignIdx: campIdx,
          currentPhase: 'campaigns',
        });

        // Parse naming convention
        const parsed = parseMetaCampaignName(campaign.name);

        // Fetch insights pentru ultimele 30 zile
        let insights: any[];
        try {
          insights = await getMetaInsights(campaign.id, account.accessToken);
        } catch (error: any) {
          if (isRateLimitError(error)) {
            const retryAt = calculateRetryTime(syncJob.retryCount + 1);
            await updateSyncJobProgress(syncJob.id, {
              status: 'paused',
              errorMessage: `Rate limit la campania ${campaign.name}`,
              errorCode: 'RATE_LIMIT',
              retryAt,
              retryCount: syncJob.retryCount + 1,
              syncedCampaigns: campaignsSynced,
              syncedAdSets: adSetsSynced,
              syncedAds: adsSynced,
            });
            await prisma.adsAccount.update({
              where: { id: accountId },
              data: { syncInProgress: false },
            });
            console.log(`[Meta Sync] Rate limited at campaign ${campIdx}, will retry at ${retryAt}`);
            return { 
              success: false, 
              campaignsSynced, 
              adSetsSynced, 
              adsSynced, 
              jobId: syncJob.id,
              paused: true,
              retryAt,
              error: `Rate limit la campania ${campaign.name}`
            };
          }
          throw error;
        }

        const insightData = insights[0] || {};
        
        const { conversions, revenue } = extractConversionsFromInsights(insightData);
        
        const spend = parseFloat(insightData.spend || "0");
        const impressions = parseInt(insightData.impressions || "0", 10);
        const reach = parseInt(insightData.reach || "0", 10);
        const clicks = parseInt(insightData.clicks || "0", 10);

        const kpis = calculateKPIs({
          spend,
          impressions,
          clicks,
          conversions,
          revenue,
          reach,
        });

        // Upsert campaign
        const dbCampaign = await prisma.adsCampaign.upsert({
          where: {
            accountId_externalId: {
              accountId: account.id,
              externalId: campaign.id,
            },
          },
          create: {
            accountId: account.id,
            externalId: campaign.id,
            name: campaign.name,
            status: mapMetaStatus(campaign.status),
            effectiveStatus: campaign.effective_status,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            budgetRemaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
            parsedObjective: parsed.objective,
            parsedType: parsed.type,
            parsedCodes: parsed.codes,
            parsedAudience: parsed.audience,
            namingValid: parsed.valid,
            spend,
            impressions: BigInt(impressions),
            reach: BigInt(reach),
            clicks: BigInt(clicks),
            conversions,
            revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            frequency: kpis.frequency,
            startDate: campaign.start_time ? new Date(campaign.start_time) : null,
            endDate: campaign.stop_time ? new Date(campaign.stop_time) : null,
            lastSyncAt: new Date(),
          },
          update: {
            name: campaign.name,
            status: mapMetaStatus(campaign.status),
            effectiveStatus: campaign.effective_status,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            budgetRemaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
            parsedObjective: parsed.objective,
            parsedType: parsed.type,
            parsedCodes: parsed.codes,
            parsedAudience: parsed.audience,
            namingValid: parsed.valid,
            spend,
            impressions: BigInt(impressions),
            reach: BigInt(reach),
            clicks: BigInt(clicks),
            conversions,
            revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            frequency: kpis.frequency,
            startDate: campaign.start_time ? new Date(campaign.start_time) : null,
            endDate: campaign.stop_time ? new Date(campaign.stop_time) : null,
            lastSyncAt: new Date(),
          },
        });

        // ========== SYNC AD SETS ==========
        try {
          let adSets: any[];
          try {
            adSets = await getMetaAdSets(campaign.id, account.accessToken);
          } catch (error: any) {
            if (isRateLimitError(error)) {
              const retryAt = calculateRetryTime(syncJob.retryCount + 1);
              await updateSyncJobProgress(syncJob.id, {
                status: 'paused',
                errorMessage: `Rate limit la ad sets pentru ${campaign.name}`,
                errorCode: 'RATE_LIMIT',
                retryAt,
                retryCount: syncJob.retryCount + 1,
                syncedCampaigns: campaignsSynced,
                syncedAdSets: adSetsSynced,
                syncedAds: adsSynced,
                currentPhase: 'adsets',
              });
              await prisma.adsAccount.update({
                where: { id: accountId },
                data: { syncInProgress: false },
              });
              console.log(`[Meta Sync] Rate limited at ad sets, will retry at ${retryAt}`);
              return { 
                success: false, 
                campaignsSynced, 
                adSetsSynced, 
                adsSynced, 
                jobId: syncJob.id,
                paused: true,
                retryAt,
                error: `Rate limit la ad sets pentru ${campaign.name}`
              };
            }
            throw error;
          }

          console.log(`[Meta Sync] Campaign ${campaign.name}: ${adSets.length} ad sets`);
          
          // Update totals
          await updateSyncJobProgress(syncJob.id, {
            totalAdSets: (syncJob.totalAdSets || 0) + adSets.length,
          });
          
          for (const adSet of adSets) {
            try {
              // Fetch insights pentru ad set
              let adSetInsights: any[];
              try {
                adSetInsights = await getMetaInsights(adSet.id, account.accessToken);
              } catch (error: any) {
                if (isRateLimitError(error)) {
                  const retryAt = calculateRetryTime(syncJob.retryCount + 1);
                  await updateSyncJobProgress(syncJob.id, {
                    status: 'paused',
                    errorMessage: `Rate limit la insights pentru ad set ${adSet.name}`,
                    errorCode: 'RATE_LIMIT',
                    retryAt,
                    retryCount: syncJob.retryCount + 1,
                    syncedCampaigns: campaignsSynced,
                    syncedAdSets: adSetsSynced,
                    syncedAds: adsSynced,
                  });
                  await prisma.adsAccount.update({
                    where: { id: accountId },
                    data: { syncInProgress: false },
                  });
                  return { 
                    success: false, 
                    campaignsSynced, 
                    adSetsSynced, 
                    adsSynced, 
                    jobId: syncJob.id,
                    paused: true,
                    retryAt,
                    error: `Rate limit la ad set ${adSet.name}`
                  };
                }
                throw error;
              }

              const adSetInsightData = adSetInsights[0] || {};
              
              const adSetConversions = extractConversionsFromInsights(adSetInsightData);
              const adSetSpend = parseFloat(adSetInsightData.spend || "0");
              const adSetImpressions = parseInt(adSetInsightData.impressions || "0", 10);
              const adSetReach = parseInt(adSetInsightData.reach || "0", 10);
              const adSetClicks = parseInt(adSetInsightData.clicks || "0", 10);
              
              const adSetKpis = calculateKPIs({
                spend: adSetSpend,
                impressions: adSetImpressions,
                clicks: adSetClicks,
                conversions: adSetConversions.conversions,
                revenue: adSetConversions.revenue,
                reach: adSetReach,
              });

              const dbAdSet = await prisma.adsAdSet.upsert({
                where: {
                  campaignId_externalId: {
                    campaignId: dbCampaign.id,
                    externalId: adSet.id,
                  },
                },
                create: {
                  campaignId: dbCampaign.id,
                  externalId: adSet.id,
                  name: adSet.name,
                  status: mapMetaStatus(adSet.status),
                  effectiveStatus: adSet.effective_status,
                  dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
                  bidStrategy: adSet.bid_strategy,
                  targetingGeo: adSet.targeting?.geo_locations?.countries || [],
                  targetingCustom: adSet.targeting?.custom_audiences || [],
                  targetingAge: adSet.targeting?.age_min && adSet.targeting?.age_max 
                    ? `${adSet.targeting.age_min}-${adSet.targeting.age_max}` 
                    : null,
                  spend: adSetSpend,
                  impressions: BigInt(adSetImpressions),
                  clicks: BigInt(adSetClicks),
                  conversions: adSetConversions.conversions,
                  revenue: adSetConversions.revenue,
                  ctr: adSetKpis.ctr,
                  cpc: adSetKpis.cpc,
                  cpa: adSetKpis.cpa,
                  roas: adSetKpis.roas,
                },
                update: {
                  name: adSet.name,
                  status: mapMetaStatus(adSet.status),
                  effectiveStatus: adSet.effective_status,
                  dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
                  bidStrategy: adSet.bid_strategy,
                  targetingGeo: adSet.targeting?.geo_locations?.countries || [],
                  targetingCustom: adSet.targeting?.custom_audiences || [],
                  targetingAge: adSet.targeting?.age_min && adSet.targeting?.age_max 
                    ? `${adSet.targeting.age_min}-${adSet.targeting.age_max}` 
                    : null,
                  spend: adSetSpend,
                  impressions: BigInt(adSetImpressions),
                  clicks: BigInt(adSetClicks),
                  conversions: adSetConversions.conversions,
                  revenue: adSetConversions.revenue,
                  ctr: adSetKpis.ctr,
                  cpc: adSetKpis.cpc,
                  cpa: adSetKpis.cpa,
                  roas: adSetKpis.roas,
                },
              });

              adSetsSynced++;
              
              // Update progress
              await updateSyncJobProgress(syncJob.id, {
                syncedAdSets: adSetsSynced,
              });

              // ========== SYNC ADS (skip for now to reduce API calls) ==========
              // Ads sync is optional and can be done separately to avoid rate limits
              
            } catch (adSetErr) {
              console.error(`[Meta Sync] Error syncing ad set ${adSet.id}:`, adSetErr);
            }
          }
        } catch (adSetsErr) {
          console.error(`[Meta Sync] Error fetching ad sets for campaign ${campaign.id}:`, adSetsErr);
        }

        // Auto-map products dacă naming e valid
        if (parsed.valid && parsed.codes && parsed.codes.length > 0) {
          await autoMapCampaignProducts(account.id, campaign.id, parsed.codes, parsed.type || "SKU");
        }

        campaignsSynced++;
        
        // Update progress
        await updateSyncJobProgress(syncJob.id, {
          syncedCampaigns: campaignsSynced,
        });
        
      } catch (err: any) {
        console.error(`[Meta Sync] Error syncing campaign ${campaign.id}:`, err);
        
        // Check if it's a rate limit error
        if (isRateLimitError(err)) {
          const retryAt = calculateRetryTime(syncJob.retryCount + 1);
          await updateSyncJobProgress(syncJob.id, {
            status: 'paused',
            errorMessage: `Rate limit la campania ${campaign.name}`,
            errorCode: 'RATE_LIMIT',
            retryAt,
            retryCount: syncJob.retryCount + 1,
            syncedCampaigns: campaignsSynced,
            syncedAdSets: adSetsSynced,
            syncedAds: adsSynced,
          });
          await prisma.adsAccount.update({
            where: { id: accountId },
            data: { syncInProgress: false },
          });
          return { 
            success: false, 
            campaignsSynced, 
            adSetsSynced, 
            adsSynced, 
            jobId: syncJob.id,
            paused: true,
            retryAt,
            error: `Rate limit - sincronizare pusă în pauză`
          };
        }
      }
    }

    // Mark job as completed
    await updateSyncJobProgress(syncJob.id, {
      status: 'completed',
      completedAt: new Date(),
      syncedCampaigns: campaignsSynced,
      syncedAdSets: adSetsSynced,
      syncedAds: adsSynced,
      errorMessage: null,
      errorCode: null,
    });

    // Update account status
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: {
        status: AdsAccountStatus.ACTIVE,
        lastSyncAt: new Date(),
        lastSyncError: null,
        syncInProgress: false,
      },
    });

    console.log(`[Meta Sync] Complete: ${campaignsSynced} campaigns, ${adSetsSynced} ad sets, ${adsSynced} ads`);

    return { success: true, campaignsSynced, adSetsSynced, adsSynced, jobId: syncJob.id };
  } catch (error: any) {
    console.error("[Meta Sync] Error:", error);
    
    // Update job if exists
    if (syncJob) {
      await updateSyncJobProgress(syncJob.id, {
        status: 'failed',
        errorMessage: error.message,
        errorCode: 'UNKNOWN',
        completedAt: new Date(),
      });
    }
    
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: {
        status: AdsAccountStatus.ERROR,
        lastSyncError: error.message,
        syncInProgress: false,
      },
    });

    return { 
      success: false, 
      campaignsSynced, 
      adSetsSynced, 
      adsSynced, 
      error: error.message,
      jobId: syncJob?.id 
    };
  }
}

/**
 * Auto-mapează campania la produse pe baza codurilor din nume
 */
async function autoMapCampaignProducts(
  accountDbId: string,
  campaignExternalId: string,
  codes: string[],
  type: string
): Promise<void> {
  const campaign = await prisma.adsCampaign.findFirst({
    where: {
      accountId: accountDbId,
      externalId: campaignExternalId,
    },
  });

  if (!campaign) return;

  for (const code of codes) {
    // Caută produsul în MasterProducts
    const product = await prisma.masterProduct.findFirst({
      where: {
        OR: [
          { sku: code },
          { sku: { contains: code, mode: "insensitive" } },
        ],
      },
    });

    await prisma.adsCampaignProduct.upsert({
      where: {
        campaignId_sku: {
          campaignId: campaign.id,
          sku: code,
        },
      },
      create: {
        campaignId: campaign.id,
        sku: code,
        masterProductId: product?.id || null,
        mappingSource: "AUTO_NAME",
        confidence: product ? 1.0 : 0.5,
      },
      update: {
        masterProductId: product?.id || null,
        confidence: product ? 1.0 : 0.5,
      },
    });
  }
}

// ==================== SYNC OPTIMIZAT ====================

/**
 * LIGHT SYNC - Sincronizare rapidă (doar campanii + insights agregate)
 * Folosit de CRON la 30 minute
 * NU sincronizează ad sets și ads (lazy loading)
 */
export async function syncMetaAccountLight(accountId: string): Promise<{
  success: boolean;
  campaignsSynced: number;
  error?: string;
}> {
  let campaignsSynced = 0;

  try {
    console.log(`[Meta Light Sync] Starting for account ${accountId}`);
    
    const account = await prisma.adsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== "META") {
      return { success: false, campaignsSynced: 0, error: "Account not found" };
    }

    // Verifică token-ul
    const isValid = await validateMetaToken(account.accessToken);
    if (!isValid) {
      await prisma.adsAccount.update({
        where: { id: accountId },
        data: { status: AdsAccountStatus.ERROR, lastSyncError: "Token invalid" },
      });
      return { success: false, campaignsSynced: 0, error: "Token invalid" };
    }

    // Marchează sync în progress
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: { syncInProgress: true },
    });

    const metaAccountId = `act_${account.externalId}`;

    // Sync Pixels (rapid)
    try {
      const pixels = await getMetaPixels(metaAccountId, account.accessToken, account.businessId);
      for (const pixel of pixels) {
        let lastEventAt: Date | null = null;
        if (pixel.last_fired_time) {
          if (typeof pixel.last_fired_time === 'number') {
            lastEventAt = new Date(pixel.last_fired_time * 1000);
          } else if (typeof pixel.last_fired_time === 'string') {
            let dateStr = pixel.last_fired_time.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) lastEventAt = parsed;
          }
        }
        
        await prisma.adsPixel.upsert({
          where: { platform_externalId: { platform: "META", externalId: pixel.id } },
          create: {
            accountId: account.id,
            platform: "META",
            externalId: pixel.id,
            name: pixel.name || `Pixel ${pixel.id}`,
            isInstalled: !!pixel.last_fired_time,
            lastEventAt,
          },
          update: {
            name: pixel.name || `Pixel ${pixel.id}`,
            isInstalled: !!pixel.last_fired_time,
            lastEventAt,
            lastCheckedAt: new Date(),
          },
        });
      }
    } catch (e) {
      console.warn("[Meta Light Sync] Pixel sync failed:", e);
    }

    // Fetch campanii
    const campaigns = await getMetaCampaigns(metaAccountId, account.accessToken);
    console.log(`[Meta Light Sync] Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      try {
        // Parse naming convention
        const parsed = parseMetaCampaignName(campaign.name);

        // Fetch insights (30 zile agregate)
        let insights: any[] = [];
        try {
          insights = await getMetaInsights(campaign.id, account.accessToken);
        } catch (e) {
          console.warn(`[Meta Light Sync] Insights failed for ${campaign.id}`);
        }

        const insightData = insights[0] || {};
        const { conversions, revenue } = extractConversionsFromInsights(insightData);
        
        const spend = parseFloat(insightData.spend || "0");
        const impressions = parseInt(insightData.impressions || "0", 10);
        const reach = parseInt(insightData.reach || "0", 10);
        const clicks = parseInt(insightData.clicks || "0", 10);

        const kpis = calculateKPIs({ spend, impressions, clicks, conversions, revenue, reach });

        // Upsert campaign (fără ad sets/ads)
        await prisma.adsCampaign.upsert({
          where: {
            accountId_externalId: { accountId: account.id, externalId: campaign.id },
          },
          create: {
            accountId: account.id,
            externalId: campaign.id,
            name: campaign.name,
            status: mapMetaStatus(campaign.status),
            effectiveStatus: campaign.effective_status,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            budgetRemaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
            parsedObjective: parsed.objective,
            parsedType: parsed.type,
            parsedCodes: parsed.codes,
            parsedAudience: parsed.audience,
            namingValid: parsed.valid,
            spend,
            impressions: BigInt(impressions),
            reach: BigInt(reach),
            clicks: BigInt(clicks),
            conversions,
            revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            frequency: kpis.frequency,
            startDate: campaign.start_time ? new Date(campaign.start_time) : null,
            endDate: campaign.stop_time ? new Date(campaign.stop_time) : null,
            lastSyncAt: new Date(),
          },
          update: {
            name: campaign.name,
            status: mapMetaStatus(campaign.status),
            effectiveStatus: campaign.effective_status,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            budgetRemaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
            parsedObjective: parsed.objective,
            parsedType: parsed.type,
            parsedCodes: parsed.codes,
            parsedAudience: parsed.audience,
            namingValid: parsed.valid,
            spend,
            impressions: BigInt(impressions),
            reach: BigInt(reach),
            clicks: BigInt(clicks),
            conversions,
            revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            frequency: kpis.frequency,
            startDate: campaign.start_time ? new Date(campaign.start_time) : null,
            endDate: campaign.stop_time ? new Date(campaign.stop_time) : null,
            lastSyncAt: new Date(),
          },
        });

        campaignsSynced++;

        // Sync daily stats pentru ultimele 7 zile (pentru grafice)
        try {
          await syncCampaignDailyStats(account.id, campaign.id, account.accessToken, 7);
        } catch (e) {
          console.warn(`[Meta Light Sync] Daily stats failed for ${campaign.id}`);
        }

      } catch (err: any) {
        console.error(`[Meta Light Sync] Error syncing campaign ${campaign.id}:`, err.message);
      }
    }

    // Update account status
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: {
        syncInProgress: false,
        lastSyncAt: new Date(),
        lastSyncError: null,
        status: AdsAccountStatus.ACTIVE,
      },
    });

    console.log(`[Meta Light Sync] Completed: ${campaignsSynced} campaigns synced`);
    return { success: true, campaignsSynced };

  } catch (error: any) {
    console.error("[Meta Light Sync] Fatal error:", error);
    
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: {
        syncInProgress: false,
        lastSyncError: error.message,
      },
    });

    return { success: false, campaignsSynced, error: error.message };
  }
}

/**
 * DETAIL SYNC - Sincronizare detaliată pentru O SINGURĂ campanie
 * Folosit când user-ul intră pe pagina campaniei
 * Sincronizează ad sets și ads
 */
export async function syncCampaignDetails(campaignDbId: string): Promise<{
  success: boolean;
  adSetsSynced: number;
  adsSynced: number;
  error?: string;
}> {
  let adSetsSynced = 0;
  let adsSynced = 0;

  try {
    console.log(`[Meta Detail Sync] Starting for campaign ${campaignDbId}`);

    const campaign = await prisma.adsCampaign.findUnique({
      where: { id: campaignDbId },
      include: { account: true },
    });

    if (!campaign) {
      return { success: false, adSetsSynced: 0, adsSynced: 0, error: "Campaign not found" };
    }

    // Marchează sync în progress
    await prisma.adsCampaign.update({
      where: { id: campaignDbId },
      data: { detailSyncInProgress: true },
    });

    const accessToken = campaign.account.accessToken;

    // Fetch Ad Sets
    const adSets = await getMetaAdSets(campaign.externalId, accessToken);
    console.log(`[Meta Detail Sync] Found ${adSets.length} ad sets`);

    for (const adSet of adSets) {
      try {
        // Fetch insights pentru ad set
        let insights: any[] = [];
        try {
          insights = await getMetaInsights(adSet.id, accessToken);
        } catch {}

        const insightData = insights[0] || {};
        const { conversions, revenue } = extractConversionsFromInsights(insightData);
        
        const spend = parseFloat(insightData.spend || "0");
        const impressions = parseInt(insightData.impressions || "0", 10);
        const clicks = parseInt(insightData.clicks || "0", 10);

        const kpis = calculateKPIs({ spend, impressions, clicks, conversions, revenue });

        // Parse targeting
        const targeting = adSet.targeting || {};
        const targetingAge = targeting.age_min && targeting.age_max 
          ? `${targeting.age_min}-${targeting.age_max}` : null;
        const targetingGender = targeting.genders 
          ? (targeting.genders.includes(1) && targeting.genders.includes(2) ? "ALL" 
            : targeting.genders.includes(1) ? "MALE" : "FEMALE") 
          : "ALL";

        // Upsert Ad Set
        const dbAdSet = await prisma.adsAdSet.upsert({
          where: {
            campaignId_externalId: { campaignId: campaign.id, externalId: adSet.id },
          },
          create: {
            campaignId: campaign.id,
            externalId: adSet.id,
            name: adSet.name,
            status: mapMetaStatus(adSet.status),
            effectiveStatus: adSet.effective_status,
            dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
            lifetimeBudget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
            bidStrategy: adSet.bid_strategy,
            bidAmount: adSet.bid_amount ? adSet.bid_amount / 100 : null,
            targetingAge,
            targetingGender,
            targetingGeo: targeting.geo_locations?.countries,
            targetingCustom: targeting.custom_audiences,
            spend,
            impressions: BigInt(impressions),
            clicks: BigInt(clicks),
            conversions,
            revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            lastSyncAt: new Date(),
          },
          update: {
            name: adSet.name,
            status: mapMetaStatus(adSet.status),
            effectiveStatus: adSet.effective_status,
            dailyBudget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
            lifetimeBudget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
            bidStrategy: adSet.bid_strategy,
            bidAmount: adSet.bid_amount ? adSet.bid_amount / 100 : null,
            targetingAge,
            targetingGender,
            targetingGeo: targeting.geo_locations?.countries,
            targetingCustom: targeting.custom_audiences,
            spend,
            impressions: BigInt(impressions),
            clicks: BigInt(clicks),
            conversions,
            revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            lastSyncAt: new Date(),
          },
        });

        adSetsSynced++;

        // Fetch Ads pentru acest Ad Set
        const ads = await getMetaAds(adSet.id, accessToken);
        
        for (const ad of ads) {
          try {
            await prisma.adsAd.upsert({
              where: {
                adSetId_externalId: { adSetId: dbAdSet.id, externalId: ad.id },
              },
              create: {
                adSetId: dbAdSet.id,
                externalId: ad.id,
                name: ad.name,
                status: mapMetaStatus(ad.status),
                effectiveStatus: ad.effective_status,
                thumbnailUrl: ad.creative?.thumbnail_url,
                lastSyncAt: new Date(),
              },
              update: {
                name: ad.name,
                status: mapMetaStatus(ad.status),
                effectiveStatus: ad.effective_status,
                thumbnailUrl: ad.creative?.thumbnail_url,
                lastSyncAt: new Date(),
              },
            });
            adsSynced++;
          } catch (adErr: any) {
            console.warn(`[Meta Detail Sync] Error syncing ad ${ad.id}:`, adErr.message);
          }
        }

      } catch (adSetErr: any) {
        console.warn(`[Meta Detail Sync] Error syncing ad set ${adSet.id}:`, adSetErr.message);
      }
    }

    // Update campaign detail sync timestamp
    await prisma.adsCampaign.update({
      where: { id: campaignDbId },
      data: {
        lastDetailSyncAt: new Date(),
        detailSyncInProgress: false,
      },
    });

    console.log(`[Meta Detail Sync] Completed: ${adSetsSynced} ad sets, ${adsSynced} ads`);
    return { success: true, adSetsSynced, adsSynced };

  } catch (error: any) {
    console.error("[Meta Detail Sync] Fatal error:", error);

    await prisma.adsCampaign.update({
      where: { id: campaignDbId },
      data: { detailSyncInProgress: false },
    });

    return { success: false, adSetsSynced, adsSynced, error: error.message };
  }
}

/**
 * REFRESH INSIGHTS - Actualizare rapidă metrici pentru o campanie
 * Folosit pentru butonul "Refresh" din UI
 */
export async function refreshCampaignInsights(campaignDbId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id: campaignDbId },
      include: { account: true },
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    const accessToken = campaign.account.accessToken;

    // Fetch insights fresh
    const insights = await getMetaInsights(campaign.externalId, accessToken);
    const insightData = insights[0] || {};
    
    const { conversions, revenue } = extractConversionsFromInsights(insightData);
    const spend = parseFloat(insightData.spend || "0");
    const impressions = parseInt(insightData.impressions || "0", 10);
    const reach = parseInt(insightData.reach || "0", 10);
    const clicks = parseInt(insightData.clicks || "0", 10);

    const kpis = calculateKPIs({ spend, impressions, clicks, conversions, revenue, reach });

    // Update campaign
    await prisma.adsCampaign.update({
      where: { id: campaignDbId },
      data: {
        spend,
        impressions: BigInt(impressions),
        reach: BigInt(reach),
        clicks: BigInt(clicks),
        conversions,
        revenue,
        ctr: kpis.ctr,
        cpc: kpis.cpc,
        cpm: kpis.cpm,
        cpa: kpis.cpa,
        roas: kpis.roas,
        frequency: kpis.frequency,
        lastSyncAt: new Date(),
      },
    });

    // Sync daily stats pentru ultimele 7 zile
    await syncCampaignDailyStats(campaign.accountId, campaign.externalId, accessToken, 7);

    return { success: true };
  } catch (error: any) {
    console.error("[Meta Refresh] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * SYNC DAILY STATS - Sincronizează statistici pe zile pentru grafice
 */
export async function syncCampaignDailyStats(
  accountDbId: string,
  campaignExternalId: string,
  accessToken: string,
  days: number = 30
): Promise<void> {
  try {
    // Calculează date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timeRange = {
      since: startDate.toISOString().split("T")[0],
      until: endDate.toISOString().split("T")[0],
    };

    // Fetch insights pe zile
    const fields = "impressions,reach,clicks,spend,actions,action_values";
    const url = `${META_GRAPH_URL}/${campaignExternalId}/insights?fields=${fields}&time_range=${JSON.stringify(timeRange)}&time_increment=1&access_token=${accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch daily insights");
    }

    const data = await response.json();
    const dailyData = data.data || [];

    // Găsește campania în DB
    const campaign = await prisma.adsCampaign.findFirst({
      where: {
        accountId: accountDbId,
        externalId: campaignExternalId,
      },
    });

    if (!campaign) return;

    // Upsert daily stats
    for (const day of dailyData) {
      const dateStr = day.date_start;
      const date = new Date(dateStr);

      const { conversions, revenue } = extractConversionsFromInsights(day);
      const spend = parseFloat(day.spend || "0");
      const impressions = parseInt(day.impressions || "0", 10);
      const reach = parseInt(day.reach || "0", 10);
      const clicks = parseInt(day.clicks || "0", 10);

      const kpis = calculateKPIs({ spend, impressions, clicks, conversions, revenue, reach });

      await prisma.adsDailyStats.upsert({
        where: {
          campaignId_date: { campaignId: campaign.id, date },
        },
        create: {
          campaignId: campaign.id,
          date,
          spend,
          impressions: BigInt(impressions),
          reach: BigInt(reach),
          clicks: BigInt(clicks),
          conversions,
          revenue,
          ctr: kpis.ctr,
          cpc: kpis.cpc,
          cpm: kpis.cpm,
          cpa: kpis.cpa,
          roas: kpis.roas,
        },
        update: {
          spend,
          impressions: BigInt(impressions),
          reach: BigInt(reach),
          clicks: BigInt(clicks),
          conversions,
          revenue,
          ctr: kpis.ctr,
          cpc: kpis.cpc,
          cpm: kpis.cpm,
          cpa: kpis.cpa,
          roas: kpis.roas,
        },
      });
    }
  } catch (error) {
    console.error("[Meta Daily Stats] Error:", error);
    // Nu aruncăm eroarea - e ok să eșueze daily stats
  }
}

/**
 * GET HISTORICAL INSIGHTS - Pentru grafice și comparații între perioade
 */
export async function getHistoricalInsights(
  campaignDbId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  data: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number | null;
    cpc: number | null;
    roas: number | null;
  }>;
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number | null;
    cpc: number | null;
    roas: number | null;
  };
}> {
  const stats = await prisma.adsDailyStats.findMany({
    where: {
      campaignId: campaignDbId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  const data = stats.map(s => ({
    date: s.date.toISOString().split("T")[0],
    spend: Number(s.spend),
    impressions: Number(s.impressions),
    clicks: Number(s.clicks),
    conversions: s.conversions,
    revenue: Number(s.revenue),
    ctr: s.ctr ? Number(s.ctr) : null,
    cpc: s.cpc ? Number(s.cpc) : null,
    roas: s.roas ? Number(s.roas) : null,
  }));

  // Calculează totaluri
  const totals = {
    spend: data.reduce((sum, d) => sum + d.spend, 0),
    impressions: data.reduce((sum, d) => sum + d.impressions, 0),
    clicks: data.reduce((sum, d) => sum + d.clicks, 0),
    conversions: data.reduce((sum, d) => sum + d.conversions, 0),
    revenue: data.reduce((sum, d) => sum + d.revenue, 0),
    ctr: null as number | null,
    cpc: null as number | null,
    roas: null as number | null,
  };

  // Calculează KPIs pentru totaluri
  if (totals.impressions > 0) {
    totals.ctr = (totals.clicks / totals.impressions) * 100;
  }
  if (totals.clicks > 0) {
    totals.cpc = totals.spend / totals.clicks;
  }
  if (totals.spend > 0) {
    totals.roas = totals.revenue / totals.spend;
  }

  return { data, totals };
}

/**
 * COMPARE PERIODS - Compară două perioade
 */
export async function comparePeriods(
  campaignDbId: string,
  period1Start: Date,
  period1End: Date,
  period2Start: Date,
  period2End: Date
): Promise<{
  period1: {
    start: string;
    end: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number | null;
  };
  period2: {
    start: string;
    end: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number | null;
  };
  changes: {
    spend: number; // percentage change
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number | null;
  };
}> {
  const [result1, result2] = await Promise.all([
    getHistoricalInsights(campaignDbId, period1Start, period1End),
    getHistoricalInsights(campaignDbId, period2Start, period2End),
  ]);

  const calcChange = (v1: number, v2: number): number => {
    if (v2 === 0) return v1 > 0 ? 100 : 0;
    return ((v1 - v2) / v2) * 100;
  };

  return {
    period1: {
      start: period1Start.toISOString().split("T")[0],
      end: period1End.toISOString().split("T")[0],
      ...result1.totals,
    },
    period2: {
      start: period2Start.toISOString().split("T")[0],
      end: period2End.toISOString().split("T")[0],
      ...result2.totals,
    },
    changes: {
      spend: calcChange(result1.totals.spend, result2.totals.spend),
      impressions: calcChange(result1.totals.impressions, result2.totals.impressions),
      clicks: calcChange(result1.totals.clicks, result2.totals.clicks),
      conversions: calcChange(result1.totals.conversions, result2.totals.conversions),
      revenue: calcChange(result1.totals.revenue, result2.totals.revenue),
      roas: result1.totals.roas !== null && result2.totals.roas !== null
        ? calcChange(result1.totals.roas, result2.totals.roas)
        : null,
    },
  };
}
