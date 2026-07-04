/** True when OTP codes may be shown in API responses (no SMS yet). */
export function isOtpDevMode(): boolean {
  if (process.env.OTP_DEV_MODE === "true") return true;
  if (process.env.OTP_DEV_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function otpSendPayload(flow: "signin" | "signup" | "otp", devCode?: string) {
  const devMode = isOtpDevMode();
  return {
    ok: true,
    message: devMode
      ? "OTP generated — enter the code shown below (SMS not configured yet)"
      : "OTP sent to your phone",
    flow,
    devMode,
    ...(devMode && devCode ? { devCode } : {}),
    ...(devMode
      ? {
          otpDisplayHint:
            "Until SMS is wired, the 6-digit code is returned in this response. Show it on screen for the user.",
        }
      : {}),
  };
}
