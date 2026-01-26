import * as XLSX from "xlsx";

/**
 * Parse an Excel file buffer and return rows as objects
 */
export function parseExcel<T extends Record<string, unknown>>(
  buffer: ArrayBuffer,
  columnMap: Record<string, keyof T>
): T[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return [];
  }

  // Get raw data as array of arrays
  const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (rawData.length < 2) {
    return []; // Need at least header + 1 row
  }

  // Parse headers - normalize by removing spaces, underscores, asterisks, and converting to lowercase
  const headers = (rawData[0] || []).map((h) =>
    String(h || "")
      .toLowerCase()
      .trim()
      .replace(/[_\s*]/g, "") // Remove underscores, spaces, and asterisks
  );

  // Map header indices
  const headerIndices: Partial<Record<keyof T, number>> = {};
  headers.forEach((h, i) => {
    const normalizedHeader = h.replace(/[_\s]/g, "").toLowerCase();
    const field = columnMap[normalizedHeader] || columnMap[h];
    if (field) {
      headerIndices[field] = i;
    }
  });

  // Parse rows
  const rows: T[] = [];
  for (let i = 1; i < rawData.length; i++) {
    const values = rawData[i] || [];

    // Skip empty rows
    if (values.every((v) => v === undefined || v === null || String(v).trim() === "")) {
      continue;
    }

    const row: Partial<T> = {};
    Object.entries(headerIndices).forEach(([field, index]) => {
      if (index !== undefined && index >= 0) {
        const value = values[index];
        row[field as keyof T] = value as T[keyof T];
      }
    });

    rows.push(row as T);
  }

  return rows;
}

/**
 * Create an Excel workbook buffer from data
 */
export function createExcel(
  data: Record<string, unknown>[],
  headers: { key: string; label: string }[]
): Buffer {
  const headerRow = headers.map((h) => h.label);
  const dataRows = data.map((row) => headers.map((h) => row[h.key] ?? ""));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  // Set column widths
  worksheet["!cols"] = headers.map((h) => ({
    wch: Math.max(h.label.length + 2, 15),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Date");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Create an Excel template with headers and example data
 */
export function createExcelTemplate(
  headers: { key: string; label: string; example?: string; required?: boolean }[],
  sheetName: string = "Template"
): Buffer {
  // Header row
  const headerRow = headers.map((h) => (h.required ? `${h.label} *` : h.label));

  // Example row
  const exampleRow = headers.map((h) => h.example || "");

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);

  // Set column widths based on header/example length
  worksheet["!cols"] = headers.map((h) => ({
    wch: Math.max(
      (h.required ? h.label.length + 2 : h.label.length) + 2,
      (h.example || "").length + 2,
      15
    ),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

// ============== INVENTORY ITEMS ==============

export interface InventoryImportRow {
  sku: string;
  name: string;
  description?: string;
  currentStock?: number;
  minStock?: number;
  unit?: string;
  unitsPerBox?: number;
  boxUnit?: string;
  costPrice?: number;
  supplier?: string;
  isComposite?: boolean;
  isActive?: boolean;
  // Stoc per depozit - cheile sunt numele depozitelor (ex: "Sacueni", "Viisoara")
  warehouseStocks?: Record<string, number>;
}

export const INVENTORY_COLUMN_MAP: Record<string, keyof InventoryImportRow> = {
  // SKU
  "sku": "sku",
  "cod": "sku",
  // Name
  "nume": "name",
  "name": "name",
  "denumire": "name",
  "numeerp": "name",
  "denumireprodus": "name",
  // Description
  "descriere": "description",
  "description": "description",
  // Current Stock
  "stoccurent": "currentStock",
  "stoc": "currentStock",
  "currentstock": "currentStock",
  "stock": "currentStock",
  "cantitate": "currentStock",
  // Min Stock
  "stocminim": "minStock",
  "minstock": "minStock",
  // Unit
  "unitate": "unit",
  "unit": "unit",
  "um": "unit",
  // Units per box
  "buc/bax": "unitsPerBox",
  "bucbax": "unitsPerBox",
  "bucperbax": "unitsPerBox",
  "unitsperbox": "unitsPerBox",
  // Box unit
  "unitatebax": "boxUnit",
  "boxunit": "boxUnit",
  // Cost price
  "prețcost": "costPrice",
  "pretcost": "costPrice",
  "pretcostachizitie": "costPrice",
  "costprice": "costPrice",
  "cost": "costPrice",
  "pret": "costPrice",
  // Supplier
  "furnizor": "supplier",
  "supplier": "supplier",
  // Is composite
  "estecompus": "isComposite",
  "iscomposite": "isComposite",
  "activ": "isActive",
  "isactive": "isActive",
};

export const INVENTORY_TEMPLATE_HEADERS = [
  { key: "sku", label: "SKU", example: "ART-001", required: true },
  { key: "name", label: "Nume", example: "Articol exemplu", required: true },
  { key: "description", label: "Descriere", example: "Descriere articol" },
  { key: "currentStock", label: "Stoc Curent", example: "100" },
  { key: "minStock", label: "Stoc Minim", example: "10" },
  { key: "unit", label: "Unitate", example: "buc" },
  { key: "unitsPerBox", label: "Buc/Bax", example: "12" },
  { key: "boxUnit", label: "Unitate Bax", example: "bax" },
  { key: "costPrice", label: "Preț Cost", example: "25.50" },
  { key: "supplier", label: "Furnizor", example: "Furnizor SRL" },
  { key: "isComposite", label: "Este Compus", example: "Nu" },
  { key: "isActive", label: "Activ", example: "Da" },
];

export function parseInventoryExcel(buffer: ArrayBuffer): InventoryImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return [];
  }

  // Get raw data as array of arrays
  const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (rawData.length < 2) {
    return [];
  }

  // Parse headers - keep original for warehouse stock detection
  const originalHeaders = (rawData[0] || []).map((h) => String(h || "").trim());
  const normalizedHeaders = originalHeaders.map((h) =>
    h.toLowerCase().replace(/[_\s*]/g, "")
  );

  // Detect warehouse stock columns (format: "Stoc X" where X is warehouse name)
  const warehouseStockColumns: { index: number; warehouseName: string }[] = [];
  originalHeaders.forEach((header, index) => {
    // Match "Stoc X" pattern (case insensitive)
    const match = header.match(/^stoc\s+(.+)$/i);
    if (match) {
      const warehouseName = match[1].trim();
      // Exclude generic stock columns
      if (
        warehouseName.toLowerCase() !== "curent" &&
        warehouseName.toLowerCase() !== "minim" &&
        warehouseName.toLowerCase() !== "current" &&
        warehouseName.toLowerCase() !== "min"
      ) {
        warehouseStockColumns.push({ index, warehouseName });
      }
    }
  });

  // Map standard header indices
  const headerIndices: Partial<Record<keyof InventoryImportRow, number>> = {};
  normalizedHeaders.forEach((h, i) => {
    const field = INVENTORY_COLUMN_MAP[h];
    if (field && field !== "warehouseStocks") {
      headerIndices[field] = i;
    }
  });

  // Parse rows
  const rows: InventoryImportRow[] = [];
  for (let i = 1; i < rawData.length; i++) {
    const values = rawData[i] || [];

    // Skip empty rows
    if (values.every((v) => v === undefined || v === null || String(v).trim() === "")) {
      continue;
    }

    const parsed: InventoryImportRow = {
      sku: "",
      name: "",
    };

    // Extract standard fields
    if (headerIndices.sku !== undefined) {
      parsed.sku = String(values[headerIndices.sku] || "").trim();
    }
    if (headerIndices.name !== undefined) {
      parsed.name = String(values[headerIndices.name] || "").trim();
    }
    if (headerIndices.description !== undefined) {
      const val = values[headerIndices.description];
      parsed.description = val !== undefined ? String(val || "").trim() || undefined : undefined;
    }
    if (headerIndices.currentStock !== undefined) {
      const val = String(values[headerIndices.currentStock] || "").replace(",", ".").trim();
      parsed.currentStock = val ? parseFloat(val) : undefined;
    }
    if (headerIndices.minStock !== undefined) {
      const val = String(values[headerIndices.minStock] || "").replace(",", ".").trim();
      parsed.minStock = val ? parseFloat(val) : undefined;
    }
    if (headerIndices.unit !== undefined) {
      const val = values[headerIndices.unit];
      parsed.unit = val !== undefined ? String(val || "").trim() || undefined : undefined;
    }
    if (headerIndices.unitsPerBox !== undefined) {
      const val = String(values[headerIndices.unitsPerBox] || "").trim();
      parsed.unitsPerBox = val ? parseInt(val, 10) : undefined;
    }
    if (headerIndices.boxUnit !== undefined) {
      const val = values[headerIndices.boxUnit];
      parsed.boxUnit = val !== undefined ? String(val || "").trim() || undefined : undefined;
    }
    if (headerIndices.costPrice !== undefined) {
      const val = String(values[headerIndices.costPrice] || "").replace(",", ".").trim();
      parsed.costPrice = val ? parseFloat(val) : undefined;
    }
    if (headerIndices.supplier !== undefined) {
      const val = values[headerIndices.supplier];
      parsed.supplier = val !== undefined ? String(val || "").trim() || undefined : undefined;
    }
    if (headerIndices.isComposite !== undefined) {
      const val = String(values[headerIndices.isComposite] || "").toLowerCase().trim();
      parsed.isComposite = val === "da" || val === "true" || val === "1" || val === "yes";
    }
    if (headerIndices.isActive !== undefined) {
      const val = String(values[headerIndices.isActive] || "").toLowerCase().trim();
      // Default to true if empty
      parsed.isActive = val === "" || val === "da" || val === "true" || val === "1" || val === "yes";
    }

    // Extract warehouse stocks
    if (warehouseStockColumns.length > 0) {
      const warehouseStocks: Record<string, number> = {};
      for (const { index, warehouseName } of warehouseStockColumns) {
        const val = String(values[index] || "0").replace(",", ".").trim();
        const stock = val ? parseFloat(val) : 0;
        warehouseStocks[warehouseName] = stock;
      }
      parsed.warehouseStocks = warehouseStocks;
    }

    rows.push(parsed);
  }

  return rows;
}

// ============== PRODUCTS ==============

export interface ProductImportRow {
  sku: string;
  barcode?: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category?: string;
  tags?: string[];
  weight?: number;
  warehouseLocation?: string;
  stock?: number;
  isActive?: boolean;
  isComposite?: boolean;
  trendyolBarcode?: string;
  trendyolBrandName?: string;
}

export const PRODUCT_COLUMN_MAP: Record<string, keyof ProductImportRow> = {
  "sku": "sku",
  "barcode": "barcode",
  "codbara": "barcode",
  "titlu": "title",
  "title": "title",
  "nume": "title",
  "descriere": "description",
  "description": "description",
  "pret": "price",
  "price": "price",
  "pretcomparat": "compareAtPrice",
  "compareatprice": "compareAtPrice",
  "categorie": "category",
  "category": "category",
  "tags": "tags",
  "etichete": "tags",
  "greutatekg": "weight",
  "greutate": "weight",
  "weight": "weight",
  "locatiedepozit": "warehouseLocation",
  "warehouselocation": "warehouseLocation",
  "stoc": "stock",
  "stock": "stock",
  "activ": "isActive",
  "isactive": "isActive",
  "estecompus": "isComposite",
  "iscomposite": "isComposite",
  "trendyolbarcode": "trendyolBarcode",
  "trendyolbrand": "trendyolBrandName",
  "trendyolbrandname": "trendyolBrandName",
};

export const PRODUCT_TEMPLATE_HEADERS = [
  { key: "sku", label: "SKU", example: "PROD-001", required: true },
  { key: "title", label: "Titlu", example: "Produs exemplu", required: true },
  { key: "price", label: "Preț", example: "99.99", required: true },
  { key: "barcode", label: "Cod Bare", example: "5901234123457" },
  { key: "description", label: "Descriere", example: "Descriere produs" },
  { key: "compareAtPrice", label: "Preț Comparat", example: "129.99" },
  { key: "category", label: "Categorie", example: "Electronice" },
  { key: "tags", label: "Etichete", example: "nou, popular" },
  { key: "weight", label: "Greutate (kg)", example: "0.5" },
  { key: "warehouseLocation", label: "Locație Depozit", example: "A-12-3" },
  { key: "stock", label: "Stoc", example: "50" },
  { key: "isActive", label: "Activ", example: "Da" },
  { key: "isComposite", label: "Este Compus", example: "Nu" },
  { key: "trendyolBarcode", label: "Trendyol Barcode", example: "" },
  { key: "trendyolBrandName", label: "Trendyol Brand", example: "" },
];

export function parseProductExcel(buffer: ArrayBuffer): ProductImportRow[] {
  const rows = parseExcel<ProductImportRow>(buffer, PRODUCT_COLUMN_MAP);

  return rows.map((row) => {
    const parsed: ProductImportRow = {
      sku: String(row.sku || "").trim(),
      title: String(row.title || "").trim(),
      price: 0,
    };

    if (row.barcode !== undefined) {
      parsed.barcode = String(row.barcode || "").trim() || undefined;
    }
    if (row.description !== undefined) {
      parsed.description = String(row.description || "").trim() || undefined;
    }
    if (row.price !== undefined) {
      const val = String(row.price).replace(",", ".").trim();
      parsed.price = val ? parseFloat(val) : 0;
    }
    if (row.compareAtPrice !== undefined) {
      const val = String(row.compareAtPrice).replace(",", ".").trim();
      parsed.compareAtPrice = val ? parseFloat(val) : undefined;
    }
    if (row.category !== undefined) {
      parsed.category = String(row.category || "").trim() || undefined;
    }
    if (row.tags !== undefined) {
      const tagsStr = String(row.tags || "").trim();
      parsed.tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
    }
    if (row.weight !== undefined) {
      const val = String(row.weight).replace(",", ".").trim();
      parsed.weight = val ? parseFloat(val) : undefined;
    }
    if (row.warehouseLocation !== undefined) {
      parsed.warehouseLocation = String(row.warehouseLocation || "").trim() || undefined;
    }
    if (row.stock !== undefined) {
      const val = String(row.stock).trim();
      parsed.stock = val ? parseInt(val, 10) : 0;
    }
    if (row.isActive !== undefined) {
      const val = String(row.isActive).toLowerCase().trim();
      parsed.isActive = val === "" || val === "da" || val === "true" || val === "1" || val === "yes";
    }
    if (row.isComposite !== undefined) {
      const val = String(row.isComposite).toLowerCase().trim();
      parsed.isComposite = val === "da" || val === "true" || val === "1" || val === "yes";
    }
    if (row.trendyolBarcode !== undefined) {
      parsed.trendyolBarcode = String(row.trendyolBarcode || "").trim() || undefined;
    }
    if (row.trendyolBrandName !== undefined) {
      parsed.trendyolBrandName = String(row.trendyolBrandName || "").trim() || undefined;
    }

    return parsed;
  });
}
