import { NextRequest } from "next/server";

const UPSTREAM = process.env.PRE_API_UPSTREAM ?? "http://localhost:8080";
const ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "x-request-id",
  "x-tenant-id",
  "x-role",
  "x-idempotency-key",
];

function copyAllowedHeaders(request: NextRequest) {
  const headers = new Headers();
  for (const name of ALLOWED_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`/${path.join("/")}${request.nextUrl.search}`, UPSTREAM);
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 5000);

  try {
    const headers = copyAllowedHeaders(request);
    headers.set("x-request-id", requestId);

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      signal: controller.signal,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    const retryable = error instanceof DOMException && error.name === "AbortError";
    return Response.json(
      {
        externalCode: retryable ? "REKEYSHARE_UPSTREAM_TIMEOUT" : "REKEYSHARE_UPSTREAM_UNAVAILABLE",
        message: retryable ? "ReKeyShare API 请求超时，请检查后端服务。" : "ReKeyShare API 暂不可用。",
        requestId,
        retryable: true,
      },
      { status:  gatewayStatus(retryable), headers: { "x-request-id": requestId } },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

function gatewayStatus(timeout: boolean) {
  return timeout ? 504 : 502;
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
