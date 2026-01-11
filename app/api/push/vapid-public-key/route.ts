import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      {
        error: "server_misconfigured",
        details: "Falta VAPID_PUBLIC_KEY en el servidor.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}
