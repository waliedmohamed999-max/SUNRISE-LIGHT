/** REQUIRE_STAFF_MFA=true: factory staff must enable two-step verification before using the dashboard. */
export const staffMfaRequired = () => mfaRequiredBy(process.env);
/** Always on in production unless someone turns it off on purpose with REQUIRE_STAFF_MFA=false. */
export const mfaRequiredBy = (env: Record<string, string | undefined>) => env.REQUIRE_STAFF_MFA === "true" || (env.NODE_ENV === "production" && env.REQUIRE_STAFF_MFA !== "false");
