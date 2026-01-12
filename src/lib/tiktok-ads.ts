/**
 * TikTok Ads API Integration
 * 
 * Documentație: https://ads.tiktok.com/marketing_api/docs
 * 
 * Flux OAuth:
 * 1. User click "Conectează TikTok Ads"
 * 2. Redirect la TikTok OAuth
 * 3. User autorizează
 * 4. TikTok redirect cu auth_code
 * 5. Exchange auth_code pentru access_token
 * 6. Salvăm token-ul în DB
 */

import { prisma } from "@/lib/db";
import { AdsPlatform, AdsAccountStatus, AdsCampaignStatus } from "@prisma/client";
import { getTikTokAdsConfig, AdsConfig } from "@/lib/ads-config";

// ==================== CONFIGURARE ====================

const TIKTOK_API_URL = "https://business-api.tiktok.com/open_api/v1.3";
const TIKTOK_AUTH_URL = "https://business-api.tiktok.com/portal/auth";

// ==================== TYPES ====================

interface TikTokOAuthResponse {
  code: number;
  message: string;
  data?: {
    access_token: string;
    advertiser_ids: string[];
    scope: string[];
  };
}

interface TikTokAdvertiser {
  advertiser_id: string;
  advertiser_name: string;
  currency: string;
  timezone: string;
  status: string;
  company: string;
  contry: string;
  balance: number;
}

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  advertiser_id: string;
  campaign_type: string;
  objective_type: string;
  operation_status: string;
  secondary_status: string;
  budget_mode: string;
  budget: number;
  create_time: string;
  modify_time: string;
}

interface TikTokAdGroup {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  advertiser_id: string;
  operation_status: string;
  secondary_status: string;
  budget_mode: string;
  budget: number;
  bid_type: string;
  bid_price: number;
  placement_type: string;
  placements: string[];
  age_groups: string[];
  gender: string;
  location_ids: number[];
}

interface TikTokAd {
  ad_id: string;
  ad_name: string;
  adgroup_id: string;
  advertiser_id: string;
  operation_status: string;
  secondary_status: string;
  ad_format: string;
  ad_text: string;
  call_to_action: string;
  landing_page_url: string;
  image_ids?: string[];
  video_id?: string;
}

interface TikTokReportData {
  dimensions: {
    advertiser_id?: string;
    campaign_id?: string;
    adgroup_id?: string;
    ad_id?: string;
    stat_time_day?: string;
  };
  metrics: {
    spend?: string;
    impressions?: string;
    clicks?: string;
    reach?: string;
    ctr?: string;
    cpc?: string;
    cpm?: string;
    conversion?: string;
    cost_per_conversion?: string;
    total_complete_payment_rate?: string;
    complete_payment?: string;
    total_purchase_value?: string;
  };
}

// ==================== OAUTH ====================

/**
 * Generează URL-ul de autorizare OAuth (folosind AdsSettings)
 */
export async function getTikTokOAuthUrl(state: string): Promise<string> {
  const config = await getTikTokAdsConfig();
  if (!config || !config.isConfigured) {
    throw new Error("TikTok Ads nu este configurat. Completează setările în Ads > Setări.");
  }

  const params = new URLSearchParams({
    app_id: config.appId,
    redirect_uri: config.redirectUri,
    state: state,
  });

  return `${TIKTOK_AUTH_URL}?${params}`;
}

/**
 * Generează URL-ul de autorizare OAuth (cu credențiale furnizate direct)
 */
export function getTikTokOAuthUrlWithApp(state: string, appId: string, appSecret: string, redirectUri: string): string {
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    state: state,
  });

  return `${TIKTOK_AUTH_URL}?${params}`;
}

/**
 * Exchange authorization code pentru access token (folosind AdsSettings)
 */
export async function exchangeTikTokCode(authCode: string): Promise<TikTokOAuthResponse> {
  const config = await getTikTokAdsConfig();
  if (!config || !config.isConfigured) {
    throw new Error("TikTok Ads nu este configurat");
  }

  const response = await fetch(`${TIKTOK_API_URL}/oauth2/access_token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: config.appId,
      secret: config.appSecret,
      auth_code: authCode,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange TikTok auth code");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "TikTok OAuth error");
  }

  return data;
}

/**
 * Exchange authorization code pentru access token (cu credențiale furnizate)
 */
export async function exchangeTikTokCodeWithApp(
  authCode: string,
  appId: string,
  appSecret: string
): Promise<TikTokOAuthResponse> {
  const response = await fetch(`${TIKTOK_API_URL}/oauth2/access_token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      secret: appSecret,
      auth_code: authCode,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange TikTok auth code");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "TikTok OAuth error");
  }

  return data;
}

/**
 * Verifică dacă token-ul este valid
 */
export async function validateTikTokToken(accessToken: string, advertiserId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${TIKTOK_API_URL}/advertiser/info/?advertiser_ids=["${advertiserId}"]`,
      {
        headers: {
          "Access-Token": accessToken,
        },
      }
    );
    const data = await response.json();
    return data.code === 0;
  } catch {
    return false;
  }
}

// ==================== ADVERTISERS ====================

/**
 * Obține informații despre advertisers
 */
export async function getTikTokAdvertisers(
  accessToken: string,
  advertiserIds: string[]
): Promise<TikTokAdvertiser[]> {
  const idsParam = JSON.stringify(advertiserIds);
  
  const response = await fetch(
    `${TIKTOK_API_URL}/advertiser/info/?advertiser_ids=${encodeURIComponent(idsParam)}`,
    {
      headers: {
        "Access-Token": accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok advertisers");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get advertiser info");
  }

  return data.data?.list || [];
}

// ==================== CAMPAIGNS ====================

/**
 * Obține toate campaniile pentru un advertiser
 */
export async function getTikTokCampaigns(
  advertiserId: string,
  accessToken: string,
  page: number = 1,
  pageSize: number = 100
): Promise<{ campaigns: TikTokCampaign[]; totalCount: number }> {
  const response = await fetch(
    `${TIKTOK_API_URL}/campaign/get/`,
    {
      method: "GET",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  // TikTok API necesită POST pentru get campaigns
  const postResponse = await fetch(`${TIKTOK_API_URL}/campaign/get/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      page: page,
      page_size: pageSize,
      filtering: {},
    }),
  });

  if (!postResponse.ok) {
    throw new Error("Failed to fetch TikTok campaigns");
  }

  const data = await postResponse.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get campaigns");
  }

  return {
    campaigns: data.data?.list || [],
    totalCount: data.data?.page_info?.total_number || 0,
  };
}

/**
 * Actualizează status-ul unei campanii
 */
export async function updateTikTokCampaignStatus(
  advertiserId: string,
  campaignId: string,
  status: "ENABLE" | "DISABLE",
  accessToken: string
): Promise<boolean> {
  const response = await fetch(`${TIKTOK_API_URL}/campaign/status/update/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      campaign_ids: [campaignId],
      operation_status: status,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update TikTok campaign status");
  }

  const data = await response.json();
  return data.code === 0;
}

/**
 * Actualizează bugetul unei campanii
 */
export async function updateTikTokCampaignBudget(
  advertiserId: string,
  campaignId: string,
  budget: number,
  accessToken: string
): Promise<boolean> {
  const response = await fetch(`${TIKTOK_API_URL}/campaign/update/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      campaign_id: campaignId,
      budget: budget,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update TikTok campaign budget");
  }

  const data = await response.json();
  return data.code === 0;
}

// ==================== AD GROUPS ====================

/**
 * Obține toate ad groups pentru o campanie
 */
export async function getTikTokAdGroups(
  advertiserId: string,
  campaignIds: string[],
  accessToken: string
): Promise<TikTokAdGroup[]> {
  const response = await fetch(`${TIKTOK_API_URL}/adgroup/get/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      filtering: {
        campaign_ids: campaignIds,
      },
      page: 1,
      page_size: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok ad groups");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get ad groups");
  }

  return data.data?.list || [];
}

/**
 * Actualizează status-ul unui ad group
 */
export async function updateTikTokAdGroupStatus(
  advertiserId: string,
  adGroupId: string,
  status: "ENABLE" | "DISABLE",
  accessToken: string
): Promise<boolean> {
  const response = await fetch(`${TIKTOK_API_URL}/adgroup/status/update/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      adgroup_ids: [adGroupId],
      operation_status: status,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update TikTok ad group status");
  }

  const data = await response.json();
  return data.code === 0;
}

// ==================== ADS ====================

/**
 * Obține toate ads pentru ad groups
 */
export async function getTikTokAds(
  advertiserId: string,
  adGroupIds: string[],
  accessToken: string
): Promise<TikTokAd[]> {
  const response = await fetch(`${TIKTOK_API_URL}/ad/get/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      filtering: {
        adgroup_ids: adGroupIds,
      },
      page: 1,
      page_size: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok ads");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get ads");
  }

  return data.data?.list || [];
}

// ==================== REPORTS / INSIGHTS ====================

/**
 * Obține raport pentru campanii
 */
export async function getTikTokCampaignReport(
  advertiserId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  accessToken: string,
  campaignIds?: string[]
): Promise<TikTokReportData[]> {
  const body: any = {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    dimensions: ["campaign_id"],
    data_level: "AUCTION_CAMPAIGN",
    start_date: startDate,
    end_date: endDate,
    metrics: [
      "spend",
      "impressions",
      "clicks",
      "reach",
      "ctr",
      "cpc",
      "cpm",
      "conversion",
      "cost_per_conversion",
      "complete_payment",
      "total_purchase_value",
    ],
  };

  if (campaignIds && campaignIds.length > 0) {
    body.filtering = { campaign_ids: campaignIds };
  }

  const response = await fetch(`${TIKTOK_API_URL}/report/integrated/get/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok report");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get report");
  }

  return data.data?.list || [];
}

/**
 * Obține raport zilnic pentru campanii
 */
export async function getTikTokDailyReport(
  advertiserId: string,
  startDate: string,
  endDate: string,
  accessToken: string
): Promise<TikTokReportData[]> {
  const response = await fetch(`${TIKTOK_API_URL}/report/integrated/get/`, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      dimensions: ["campaign_id", "stat_time_day"],
      data_level: "AUCTION_CAMPAIGN",
      start_date: startDate,
      end_date: endDate,
      metrics: [
        "spend",
        "impressions",
        "clicks",
        "reach",
        "conversion",
        "complete_payment",
        "total_purchase_value",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok daily report");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get daily report");
  }

  return data.data?.list || [];
}

// ==================== PIXELS ====================

/**
 * Obține pixels pentru un advertiser
 */
export async function getTikTokPixels(
  advertiserId: string,
  accessToken: string
): Promise<any[]> {
  const response = await fetch(
    `${TIKTOK_API_URL}/pixel/list/?advertiser_id=${advertiserId}`,
    {
      headers: {
        "Access-Token": accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok pixels");
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || "Failed to get pixels");
  }

  return data.data?.pixels || [];
}

// ==================== HELPERS ====================

/**
 * Parsează naming convention pentru a extrage SKU-uri
 * Format: [OBIECTIV]_[TIP]_[COD]_[AUDIENTA]_[DATA]
 */
export function parseTikTokCampaignName(name: string): {
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

  const validObjectives = ["CONV", "TRAFFIC", "AWARE", "CATALOG"];
  if (!validObjectives.includes(objective)) {
    return { valid: false };
  }

  const validTypes = ["SKU", "CAT", "ALL"];
  if (!validTypes.includes(type)) {
    return { valid: false };
  }

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
 * Convertește status TikTok în enum-ul nostru
 */
export function mapTikTokStatus(operationStatus: string, secondaryStatus?: string): AdsCampaignStatus {
  // Operation status: ENABLE, DISABLE, DELETE
  // Secondary status: CAMPAIGN_STATUS_ENABLE, CAMPAIGN_STATUS_DISABLE, etc.
  
  if (operationStatus === "DELETE") {
    return AdsCampaignStatus.DELETED;
  }
  
  if (operationStatus === "DISABLE") {
    return AdsCampaignStatus.PAUSED;
  }
  
  // Check secondary status for more detail
  if (secondaryStatus) {
    if (secondaryStatus.includes("DISABLE") || secondaryStatus.includes("FROZEN")) {
      return AdsCampaignStatus.PAUSED;
    }
    if (secondaryStatus.includes("PENDING") || secondaryStatus.includes("REVIEW")) {
      return AdsCampaignStatus.PENDING;
    }
  }
  
  return AdsCampaignStatus.ACTIVE;
}

/**
 * Calculează KPIs din metrici raw
 */
export function calculateTikTokKPIs(metrics: TikTokReportData["metrics"]): {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  roas: number | null;
} {
  const spend = parseFloat(metrics.spend || "0");
  const impressions = parseInt(metrics.impressions || "0", 10);
  const clicks = parseInt(metrics.clicks || "0", 10);
  const conversions = parseInt(metrics.conversion || metrics.complete_payment || "0", 10);
  const revenue = parseFloat(metrics.total_purchase_value || "0");

  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpa: conversions > 0 ? spend / conversions : null,
    roas: spend > 0 ? revenue / spend : null,
  };
}

// ==================== CAMPAIGN CREATION ====================

/**
 * Obiectivele disponibile pentru campanii TikTok
 */
export const TIKTOK_OBJECTIVES = [
  { value: "REACH", label: "Reach", description: "Maximize reach" },
  { value: "TRAFFIC", label: "Traffic", description: "Drive traffic to website" },
  { value: "VIDEO_VIEWS", label: "Video Views", description: "Maximize video views" },
  { value: "LEAD_GENERATION", label: "Lead Generation", description: "Collect leads" },
  { value: "CONVERSIONS", label: "Conversions", description: "Drive website conversions" },
  { value: "PRODUCT_SALES", label: "Product Sales", description: "Catalog sales" },
];

/**
 * Creează o campanie nouă în TikTok Ads
 */
export async function createTikTokCampaign(params: {
  advertiserId: string;
  accessToken: string;
  name: string;
  objective: string;
  budgetMode?: "BUDGET_MODE_DAY" | "BUDGET_MODE_TOTAL";
  budget?: number;
  status?: "ENABLE" | "DISABLE";
}): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  try {
    const {
      advertiserId,
      accessToken,
      name,
      objective,
      budgetMode = "BUDGET_MODE_DAY",
      budget,
      status = "DISABLE",
    } = params;

    const campaignData: Record<string, any> = {
      advertiser_id: advertiserId,
      campaign_name: name,
      objective_type: objective,
      operation_status: status,
    };

    if (budget) {
      campaignData.budget_mode = budgetMode;
      campaignData.budget = budget;
    }

    const response = await fetch(
      `${TIKTOK_API_URL}/campaign/create/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(campaignData),
      }
    );

    const data = await response.json();

    if (data.code !== 0) {
      console.error("TikTok campaign creation error:", data);
      return { success: false, error: data.message };
    }

    return { success: true, campaignId: data.data?.campaign_id };
  } catch (error: any) {
    console.error("Error creating TikTok campaign:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Creează un Ad Group în TikTok Ads
 */
export async function createTikTokAdGroup(params: {
  advertiserId: string;
  accessToken: string;
  campaignId: string;
  name: string;
  budget?: number;
  budgetMode?: "BUDGET_MODE_DAY" | "BUDGET_MODE_TOTAL";
  billingEvent?: string;
  optimizationGoal?: string;
  placement?: string[];
  targeting: {
    locations?: string[];
    ageGroups?: string[];
    genders?: string[];
    interests?: string[];
    operatingSystems?: string[];
  };
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  status?: "ENABLE" | "DISABLE";
}): Promise<{ success: boolean; adGroupId?: string; error?: string }> {
  try {
    const {
      advertiserId,
      accessToken,
      campaignId,
      name,
      budget,
      budgetMode = "BUDGET_MODE_DAY",
      billingEvent = "CPC",
      optimizationGoal = "CLICK",
      placement = ["PLACEMENT_TIKTOK"],
      targeting,
      scheduleStartTime,
      scheduleEndTime,
      status = "DISABLE",
    } = params;

    const adGroupData: Record<string, any> = {
      advertiser_id: advertiserId,
      campaign_id: campaignId,
      adgroup_name: name,
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      placement: placement,
      operation_status: status,
    };

    if (budget) {
      adGroupData.budget_mode = budgetMode;
      adGroupData.budget = budget;
    }

    // Targeting
    if (targeting.locations?.length) {
      adGroupData.location_ids = targeting.locations;
    }
    if (targeting.ageGroups?.length) {
      adGroupData.age_groups = targeting.ageGroups;
    }
    if (targeting.genders?.length) {
      adGroupData.gender = targeting.genders[0]; // TikTok accepts single gender
    }
    if (targeting.interests?.length) {
      adGroupData.interest_category_ids = targeting.interests;
    }
    if (targeting.operatingSystems?.length) {
      adGroupData.operating_systems = targeting.operatingSystems;
    }

    if (scheduleStartTime) {
      adGroupData.schedule_start_time = scheduleStartTime;
    }
    if (scheduleEndTime) {
      adGroupData.schedule_end_time = scheduleEndTime;
    }

    const response = await fetch(
      `${TIKTOK_API_URL}/adgroup/create/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(adGroupData),
      }
    );

    const data = await response.json();

    if (data.code !== 0) {
      console.error("TikTok ad group creation error:", data);
      return { success: false, error: data.message };
    }

    return { success: true, adGroupId: data.data?.adgroup_id };
  } catch (error: any) {
    console.error("Error creating TikTok ad group:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Creează un Ad în TikTok Ads
 */
export async function createTikTokAd(params: {
  advertiserId: string;
  accessToken: string;
  adGroupId: string;
  name: string;
  creativeMaterialMode?: string;
  videoId?: string;
  imageIds?: string[];
  displayName?: string;
  callToAction?: string;
  landingPageUrl?: string;
  status?: "ENABLE" | "DISABLE";
}): Promise<{ success: boolean; adId?: string; error?: string }> {
  try {
    const {
      advertiserId,
      accessToken,
      adGroupId,
      name,
      creativeMaterialMode = "CUSTOM",
      videoId,
      imageIds,
      displayName,
      callToAction = "LEARN_MORE",
      landingPageUrl,
      status = "DISABLE",
    } = params;

    const adData: Record<string, any> = {
      advertiser_id: advertiserId,
      adgroup_id: adGroupId,
      ad_name: name,
      creative_material_mode: creativeMaterialMode,
      operation_status: status,
    };

    if (videoId) {
      adData.video_id = videoId;
    }
    if (imageIds?.length) {
      adData.image_ids = imageIds;
    }
    if (displayName) {
      adData.display_name = displayName;
    }
    if (callToAction) {
      adData.call_to_action = callToAction;
    }
    if (landingPageUrl) {
      adData.landing_page_url = landingPageUrl;
    }

    const response = await fetch(
      `${TIKTOK_API_URL}/ad/create/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(adData),
      }
    );

    const data = await response.json();

    if (data.code !== 0) {
      console.error("TikTok ad creation error:", data);
      return { success: false, error: data.message };
    }

    return { success: true, adId: data.data?.ad_id };
  } catch (error: any) {
    console.error("Error creating TikTok ad:", error);
    return { success: false, error: error.message };
  }
}

// ==================== SYNC FUNCTION ====================

/**
 * Sincronizează toate datele pentru un cont TikTok
 */
export async function syncTikTokAccount(accountId: string): Promise<{
  success: boolean;
  campaignsSynced: number;
  error?: string;
}> {
  try {
    const account = await prisma.adsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.platform !== "TIKTOK") {
      return { success: false, campaignsSynced: 0, error: "Account not found" };
    }

    // Verifică token-ul
    const isValid = await validateTikTokToken(account.accessToken, account.externalId);
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

    // Fetch campaigns
    const { campaigns } = await getTikTokCampaigns(
      account.externalId,
      account.accessToken
    );

    // Fetch report data pentru ultimele 30 zile
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    const reportData = await getTikTokCampaignReport(
      account.externalId,
      startDate,
      endDate,
      account.accessToken
    );

    // Create a map of campaign metrics
    const metricsMap = new Map<string, TikTokReportData["metrics"]>();
    for (const row of reportData) {
      if (row.dimensions.campaign_id) {
        metricsMap.set(row.dimensions.campaign_id, row.metrics);
      }
    }

    let syncedCount = 0;

    for (const campaign of campaigns) {
      try {
        const parsed = parseTikTokCampaignName(campaign.campaign_name);
        const metrics = metricsMap.get(campaign.campaign_id) || {};
        const kpis = calculateTikTokKPIs(metrics);

        await prisma.adsCampaign.upsert({
          where: {
            accountId_externalId: {
              accountId: account.id,
              externalId: campaign.campaign_id,
            },
          },
          create: {
            accountId: account.id,
            externalId: campaign.campaign_id,
            name: campaign.campaign_name,
            status: mapTikTokStatus(campaign.operation_status, campaign.secondary_status),
            effectiveStatus: campaign.secondary_status,
            objective: campaign.objective_type,
            dailyBudget: campaign.budget_mode === "BUDGET_MODE_DAY" ? campaign.budget : null,
            lifetimeBudget: campaign.budget_mode === "BUDGET_MODE_TOTAL" ? campaign.budget : null,
            parsedObjective: parsed.objective,
            parsedType: parsed.type,
            parsedCodes: parsed.codes,
            parsedAudience: parsed.audience,
            namingValid: parsed.valid,
            spend: kpis.spend,
            impressions: BigInt(kpis.impressions),
            clicks: BigInt(kpis.clicks),
            conversions: kpis.conversions,
            revenue: kpis.revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            lastSyncAt: new Date(),
          },
          update: {
            name: campaign.campaign_name,
            status: mapTikTokStatus(campaign.operation_status, campaign.secondary_status),
            effectiveStatus: campaign.secondary_status,
            objective: campaign.objective_type,
            dailyBudget: campaign.budget_mode === "BUDGET_MODE_DAY" ? campaign.budget : null,
            lifetimeBudget: campaign.budget_mode === "BUDGET_MODE_TOTAL" ? campaign.budget : null,
            parsedObjective: parsed.objective,
            parsedType: parsed.type,
            parsedCodes: parsed.codes,
            parsedAudience: parsed.audience,
            namingValid: parsed.valid,
            spend: kpis.spend,
            impressions: BigInt(kpis.impressions),
            clicks: BigInt(kpis.clicks),
            conversions: kpis.conversions,
            revenue: kpis.revenue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpm: kpis.cpm,
            cpa: kpis.cpa,
            roas: kpis.roas,
            lastSyncAt: new Date(),
          },
        });

        // Auto-map products
        if (parsed.valid && parsed.codes && parsed.codes.length > 0) {
          await autoMapTikTokCampaignProducts(account.id, campaign.campaign_id, parsed.codes);
        }

        syncedCount++;
      } catch (err) {
        console.error(`Error syncing TikTok campaign ${campaign.campaign_id}:`, err);
      }
    }

    await prisma.adsAccount.update({
      where: { id: accountId },
      data: {
        status: AdsAccountStatus.ACTIVE,
        lastSyncAt: new Date(),
        lastSyncError: null,
        syncInProgress: false,
      },
    });

    return { success: true, campaignsSynced: syncedCount };
  } catch (error: any) {
    console.error("Error syncing TikTok account:", error);
    
    await prisma.adsAccount.update({
      where: { id: accountId },
      data: {
        status: AdsAccountStatus.ERROR,
        lastSyncError: error.message,
        syncInProgress: false,
      },
    });

    return { success: false, campaignsSynced: 0, error: error.message };
  }
}

/**
 * Auto-mapează campania la produse
 */
async function autoMapTikTokCampaignProducts(
  accountDbId: string,
  campaignExternalId: string,
  codes: string[]
): Promise<void> {
  const campaign = await prisma.adsCampaign.findFirst({
    where: {
      accountId: accountDbId,
      externalId: campaignExternalId,
    },
  });

  if (!campaign) return;

  for (const code of codes) {
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
