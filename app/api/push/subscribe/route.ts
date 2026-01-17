import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { PushSubscriptionSchema } from "@/lib/validations";
import { handleApiError, Errors } from "@/lib/api-errors";
import { z } from "zod";

const SubscribeBodySchema = z.object({
  subscription: PushSubscriptionSchema,
});

export async function POST(req: NextRequest) {
  try {
    const { supabase, cookiesToSet } = createSupabaseRouteClient(req);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const res = Errors.unauthorized().toResponse();
      cookiesToSet.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options)
      );
      return res;
    }

    const rawBody = await req.json().catch(() => null);
    
    // Validar con Zod
    const parsed = SubscribeBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const res = Errors.validation(
        parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
      ).toResponse();
      cookiesToSet.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options)
      );
      return res;
    }

    const sub = parsed.data.subscription;

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      const res = Errors.internal(error.message).toResponse();
      cookiesToSet.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options)
      );
      return res;
    }

    const res = NextResponse.json({ ok: true });
    cookiesToSet.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
