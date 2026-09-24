import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { isValidDonateAmount, sanitizeReturnPath } from "@/lib/donate";

type Body = {
  amountCents?: unknown;
  returnPath?: unknown;
};

function getDodoEnvironment(): "test_mode" | "live_mode" {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
}

function getDodoClient() {
  const key = process.env.DODO_PAYMENTS_API_KEY;
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID;
  if (!key || !productId) return null;
  return {
    client: new DodoPayments({
      bearerToken: key,
      environment: getDodoEnvironment(),
    }),
    productId,
  };
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const dodo = getDodoClient();
  if (!dodo) {
    return NextResponse.json(
      { error: "Donations aren't available yet" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    body = parsed as Body;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!isValidDonateAmount(body.amountCents)) {
    return NextResponse.json({ error: "Enter an amount between $1 and $500." }, { status: 400 });
  }

  const returnPath = sanitizeReturnPath(body.returnPath);
  const siteUrl = getSiteUrl();
  const returnUrl = `${siteUrl}/donate/success?next=${encodeURIComponent(returnPath)}`;
  const cancelUrl = `${siteUrl}${returnPath}`;

  try {
    const session = await dodo.client.checkoutSessions.create({
      product_cart: [
        {
          product_id: dodo.productId,
          quantity: 1,
          amount: body.amountCents,
        },
      ],
      return_url: returnUrl,
      cancel_url: cancelUrl,
      metadata: { source: "killsql" },
    });

    if (!session.checkout_url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    return NextResponse.json({ url: session.checkout_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
