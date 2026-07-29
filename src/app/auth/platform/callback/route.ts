import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import {
  completeLocalPlatformSignupCallback,
  PLATFORM_SIGNUP_STATE_COOKIE,
  platformCallbackCookieOptions,
} from "@/lib/platform-signup/local-flow";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const state = cookieStore.get(PLATFORM_SIGNUP_STATE_COOKIE)?.value ?? null;
  const code = request.nextUrl.searchParams.get("code");
  const result = await completeLocalPlatformSignupCallback({
    code,
    sealedState: state,
  });

  if (result.ok) {
    const response = NextResponse.redirect(
      new URL("/onboarding?status=account_ready", request.url),
    );
    response.cookies.set(PLATFORM_SIGNUP_STATE_COOKIE, "", {
      ...platformCallbackCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  const status =
    result.code === "persistence_error" ? "callback_retry" : result.code;
  const destination = `/signup?status=${encodeURIComponent(status)}`;
  return NextResponse.redirect(new URL(destination, request.url));
}
