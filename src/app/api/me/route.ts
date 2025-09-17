import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    email: "demo@example.com",
    roles: ["super-admin"],
    allowedTenants: ["tenant-aaa-uuid", "tenant-bbb-uuid"],
  });
}
