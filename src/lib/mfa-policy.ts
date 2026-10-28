/** REQUIRE_STAFF_MFA=true: factory staff must enable two-step verification before using the dashboard. */
export const staffMfaRequired = () => process.env.REQUIRE_STAFF_MFA === "true";
