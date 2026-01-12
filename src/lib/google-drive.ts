import { google } from "googleapis";

// Tipuri
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webContentLink?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface DriveFolder {
  id: string;
  name: string; // SKU-ul produsului
  files: DriveFile[];
}

// Inițializează clientul Google Drive cu Service Account
export function getDriveClient(credentials: any) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

// Extrage Folder ID din URL Google Drive
export function extractFolderId(url: string): string | null {
  if (!url) return null;
  
  // Format: https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  
  // Format: https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const folderMatch2 = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch2) return folderMatch2[1];
  
  // Poate fi direct ID-ul
  if (/^[a-zA-Z0-9_-]+$/.test(url)) return url;
  
  return null;
}

// Listează subfolderele din folderul părinte (fiecare subfolder = SKU)
export async function listProductFolders(
  drive: any,
  parentFolderId: string
): Promise<DriveFolder[]> {
  const folders: DriveFolder[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "nextPageToken, files(id, name, modifiedTime)",
      pageSize: 100,
      pageToken,
    });

    const items = response.data.files || [];
    
    for (const folder of items) {
      folders.push({
        id: folder.id!,
        name: folder.name!, // Acesta este SKU-ul
        files: [],
      });
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return folders;
}

// Listează imaginile dintr-un folder
export async function listFolderImages(
  drive: any,
  folderId: string
): Promise<DriveFile[]> {
  const images: DriveFile[] = [];
  let pageToken: string | undefined;

  // Doar imagini
  const imageMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
  ];

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (${imageMimeTypes
        .map((m) => `mimeType = '${m}'`)
        .join(" or ")}) and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webContentLink, webViewLink, thumbnailLink, modifiedTime, size)",
      pageSize: 100,
      pageToken,
      orderBy: "name", // Sortare alfabetică
    });

    const items = response.data.files || [];
    
    for (const file of items) {
      images.push({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        webContentLink: file.webContentLink,
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
        modifiedTime: file.modifiedTime,
        size: file.size,
      });
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  // Sortare alfabetică (prima = principală)
  return images.sort((a, b) => a.name.localeCompare(b.name));
}

// Obține URL-ul imaginii prin API-ul proxy local
// Aceasta evită problemele cu permisiunile Google Drive
export function getPublicImageUrl(fileId: string): string {
  // Folosim API-ul nostru proxy care descarcă imaginea cu Service Account
  return `/api/drive-image/${fileId}`;
}

// URL direct Google Drive (necesită fișier partajat public)
export function getDirectDriveUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Obține thumbnail URL (mai mic, mai rapid)
export function getThumbnailUrl(fileId: string, size: number = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

// Descarcă conținutul unei imagini (pentru upload în Shopify)
export async function downloadImage(
  drive: any,
  fileId: string
): Promise<Buffer> {
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  
  return Buffer.from(response.data as ArrayBuffer);
}

// Obține metadatele unui fișier
export async function getFileMetadata(
  drive: any,
  fileId: string
): Promise<DriveFile | null> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webContentLink, webViewLink, thumbnailLink, modifiedTime, size",
    });
    
    return response.data as DriveFile;
  } catch (error) {
    console.error("Error getting file metadata:", error);
    return null;
  }
}

// Scanează toate folderele și returnează maparea SKU -> imagini
export async function scanAllProductImages(
  drive: any,
  parentFolderId: string
): Promise<Map<string, DriveFile[]>> {
  const result = new Map<string, DriveFile[]>();
  
  // Listează toate folderele (SKU-uri)
  const folders = await listProductFolders(drive, parentFolderId);
  
  console.log(`Found ${folders.length} product folders`);
  
  // Pentru fiecare folder, listează imaginile
  for (const folder of folders) {
    const sku = folder.name.toUpperCase(); // Normalizăm SKU-ul
    const images = await listFolderImages(drive, folder.id);
    
    if (images.length > 0) {
      result.set(sku, images);
      console.log(`  SKU ${sku}: ${images.length} images`);
    }
  }
  
  return result;
}
