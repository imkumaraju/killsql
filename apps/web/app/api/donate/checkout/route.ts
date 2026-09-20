import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isValidDonateAmount, sanitizeReturnPath } from "@/lib/donate";

type Body = {
  amountCents?: unknown;
  returnPath?: unknown;
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
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
  const successUrl = `${siteUrl}/donate/success?next=${encodeURIComponent(returnPath)}`;
  const cancelUrl = `${siteUrl}${returnPath}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: body.amountCents,
            product_data: {
              name: "KillSQL donation",
              description: "Support free SQL practice",
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
