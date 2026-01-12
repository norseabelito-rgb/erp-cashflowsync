import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSmartBillClient } from "@/lib/smartbill";

// GET - Testează obținerea rețetei pentru un produs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get("code");

    if (!productCode) {
      return NextResponse.json(
        { error: "Parametrul 'code' este necesar" },
        { status: 400 }
      );
    }

    const smartbill = await createSmartBillClient();
    
    // Testăm mai multe variante de endpoint-uri
    const results: any = {
      productCode,
      tests: [],
    };

    // Test 1: GET /products cu code
    try {
      const response1 = await smartbill["client"].get("/products", {
        params: {
          cif: smartbill["companyVatCode"],
          code: productCode,
        },
      });
      results.tests.push({
        endpoint: "GET /products?code=...",
        success: true,
        data: response1.data,
      });
    } catch (e: any) {
      results.tests.push({
        endpoint: "GET /products?code=...",
        success: false,
        error: e.response?.data || e.message,
      });
    }

    // Test 2: GET /product/stock
    try {
      const response2 = await smartbill["client"].get("/product/stock", {
        params: {
          cif: smartbill["companyVatCode"],
          productCode: productCode,
        },
      });
      results.tests.push({
        endpoint: "GET /product/stock?productCode=...",
        success: true,
        data: response2.data,
      });
    } catch (e: any) {
      results.tests.push({
        endpoint: "GET /product/stock?productCode=...",
        success: false,
        error: e.response?.data || e.message,
      });
    }

    // Test 3: GET /products/list
    try {
      const response3 = await smartbill["client"].get("/products/list", {
        params: {
          cif: smartbill["companyVatCode"],
          filter: productCode,
        },
      });
      results.tests.push({
        endpoint: "GET /products/list?filter=...",
        success: true,
        data: response3.data,
      });
    } catch (e: any) {
      results.tests.push({
        endpoint: "GET /products/list?filter=...",
        success: false,
        error: e.response?.data || e.message,
      });
    }

    // Test funcția getProductRecipe
    const recipeResult = await smartbill.getProductRecipe(productCode);
    results.recipeResult = recipeResult;

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error testing recipe:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
