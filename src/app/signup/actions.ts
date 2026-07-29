"use server";

import { cookies } from "next/headers";

import {
  PLATFORM_SIGNUP_STATE_COOKIE,
  platformCallbackCookieOptions,
  requestLocalPlatformSignup,
} from "@/lib/platform-signup/local-flow";

export type SignupFormState = {
  status: "idle" | "accepted" | "error";
  code?: string;
};

export async function submitPlatformSignup(
  _previousState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const result = await requestLocalPlatformSignup({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    captchaToken: String(formData.get("cf-turnstile-response") ?? ""),
  });

  if (!result.ok) {
    return { status: "error", code: result.code };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    PLATFORM_SIGNUP_STATE_COOKIE,
    result.sealedState,
    platformCallbackCookieOptions(),
  );
  return { status: "accepted", code: result.code };
}
