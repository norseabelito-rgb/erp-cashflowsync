import { NextRequest, NextResponse } from "next/server";
import { createFanCourierClient } from "@/lib/fancourier";

export async function GET(request: NextRequest) {
  try {
    const fancourier = await createFanCourierClient();
    const services = await fancourier.getServices();

    // Logăm serviciile pentru debugging
    console.log("📦 Servicii FanCourier disponibile:", services);

    // Mapăm serviciile într-un format mai ușor de folosit
    const formattedServices = services.map((service: any) => ({
      id: service.id || service.serviceId,
      name: service.name || service.serviceName || service.service,
      code: service.code || service.serviceCode,
      description: service.description || "",
    }));

    return NextResponse.json({
      success: true,
      services: formattedServices,
      raw: services, // Include și datele brute pentru debugging
    });
  } catch (error: any) {
    console.error("Error fetching FanCourier services:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Nu s-au putut obține serviciile FanCourier",
        services: [] 
      },
      { status: 500 }
    );
  }
}
