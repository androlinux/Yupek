import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const { searchParams } = new URL(req.url);

  try {
    const url = new URL(`${backendUrl}/api/printify/products`);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const res = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to fetch products" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        detail:
          "Unable to connect to backend server. Ensure yupek-backend is running on http://127.0.0.1:8000.",
      },
      { status: 502 }
    );
  }
}
