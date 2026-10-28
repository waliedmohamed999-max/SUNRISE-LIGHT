import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "./auth";
import { rateLimit } from "./rate-limit";

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** CSRF defence for cookie-authenticated mutations: the Origin must match the host. */
function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) throw new HttpError(403, "missing_origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "bad_origin");
  }
  if (originHost !== host) throw new HttpError(403, "cross_origin");
}

type Ctx<P> = { params: Promise<P> };

export function api<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
  opts: { rate?: { key: string; limit: number; windowMs: number } } = {},
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      assertSameOrigin(req);
      if (opts.rate && !rateLimit(`${opts.rate.key}:${clientIp(req)}`, opts.rate.limit, opts.rate.windowMs)) {
        throw new HttpError(429, "rate_limited");
      }
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
      if (err instanceof ZodError) return NextResponse.json({ error: "validation", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return NextResponse.json({ error: "not_found" }, { status: 404 });
      console.error("[api]", req.method, req.nextUrl.pathname, err);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
  };
}

export async function parseJson<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  return schema.parse(body);
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
