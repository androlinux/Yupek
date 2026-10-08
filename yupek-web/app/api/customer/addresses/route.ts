import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function getAuthUser(req: NextRequest) {
  const cookieStore = cookies();
  const ssrClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://umopnncjoswyilibslep.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_xGCmb036JS-dQiAi0KxWVw_LKUjQyfB",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  let { data: { user } } = await ssrClient.auth.getUser();

  if (!user) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const res = await ssrClient.auth.getUser(token);
      user = res.data.user;
    }
  }

  return user;
}

// GET: Fetch user's saved addresses
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: addresses, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      // Table may be pending migration
      return NextResponse.json({ success: true, addresses: [] });
    }

    return NextResponse.json({
      success: true,
      addresses: addresses || [],
    });
  } catch (err: any) {
    console.error("[Customer Addresses GET Error]", err);
    return NextResponse.json({ error: "Failed to load addresses" }, { status: 500 });
  }
}

// POST: Add or update address
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      first_name,
      last_name,
      address1,
      address2,
      city,
      postal_code,
      country,
      phone,
      is_default,
    } = body;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (id && !UUID_REGEX.test(String(id).trim())) {
      return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
    }

    if (!first_name || !last_name || !address1 || !city || !postal_code) {
      return NextResponse.json(
        { error: "First name, last name, street address, city, and postal code are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    // If setting as default, update previous defaults to false
    if (is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: now })
        .eq("user_id", user.id);
    }

    const addressRecord = {
      user_id: user.id,
      first_name: String(first_name).trim().slice(0, 100),
      last_name: String(last_name).trim().slice(0, 100),
      address1: String(address1).trim().slice(0, 255),
      address2: address2 ? String(address2).trim().slice(0, 255) : "",
      city: String(city).trim().slice(0, 100),
      postal_code: String(postal_code).trim().slice(0, 30),
      country: country ? String(country).trim().slice(0, 100) : "Netherlands",
      phone: phone ? String(phone).trim().slice(0, 50) : "",
      is_default: Boolean(is_default),
      updated_at: now,
    };

    let result;
    if (id) {
      // Update
      const { data, error } = await supabase
        .from("addresses")
        .update(addressRecord)
        .eq("id", String(id).trim())
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          ...addressRecord,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      address: result,
    });
  } catch (err: any) {
    console.error("[Customer Addresses Save Error]", err);
    return NextResponse.json({ error: err.message || "Failed to save address" }, { status: 500 });
  }
}

// DELETE: Delete an address
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !UUID_REGEX.test(String(id).trim())) {
      return NextResponse.json({ error: "Valid address ID required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", String(id).trim())
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Customer Addresses Delete Error]", err);
    return NextResponse.json({ error: err.message || "Failed to delete address" }, { status: 500 });
  }
}
