import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json([
    {
      id: "custom_user_94792",
      title: "YUPEK Promio (Breda, NL)",
      sales_channel: "Brick API 1.0",
    },
  ]);
}
