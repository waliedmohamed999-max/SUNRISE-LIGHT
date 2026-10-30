import type { QuotationStatus, Role } from "@prisma/client";

export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "FACTORY_MANAGER", "SALES", "TECH_REVIEWER"];

const PERMISSIONS = {
  "admin.access": STAFF_ROLES,
  "rfq.view": STAFF_ROLES,
  "rfq.update": STAFF_ROLES,
  "rfq.price": ["SUPER_ADMIN", "FACTORY_MANAGER", "SALES"],
  "rfq.send": ["SUPER_ADMIN", "FACTORY_MANAGER", "SALES"],
  "rfq.assign": ["SUPER_ADMIN", "FACTORY_MANAGER"],
  "pricing.manage": ["SUPER_ADMIN", "FACTORY_MANAGER"],
  "template.manage": ["SUPER_ADMIN", "FACTORY_MANAGER"],
  "template.validate": ["SUPER_ADMIN", "FACTORY_MANAGER", "TECH_REVIEWER"],
  "material.manage": ["SUPER_ADMIN", "FACTORY_MANAGER"],
  "customer.view": ["SUPER_ADMIN", "FACTORY_MANAGER", "SALES"],
  "content.manage": ["SUPER_ADMIN", "FACTORY_MANAGER"],
  "user.manage": ["SUPER_ADMIN"],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as Role[]).includes(role);
}

export const isStaff = (role: Role | undefined | null) => !!role && STAFF_ROLES.includes(role);

/** Quotation workflow — which transitions staff may perform. */
export const STAFF_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  NEW: ["TECHNICAL_REVIEW", "PRICING", "REJECTED", "CANCELLED"],
  TECHNICAL_REVIEW: ["PRICING", "REVISION_REQUESTED", "REJECTED", "CANCELLED"],
  PRICING: ["TECHNICAL_REVIEW", "QUOTE_SENT", "REJECTED", "CANCELLED"],
  QUOTE_SENT: ["PRICING", "APPROVED", "REVISION_REQUESTED", "REJECTED", "CANCELLED"],
  REVISION_REQUESTED: ["TECHNICAL_REVIEW", "PRICING", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

/** Transitions a customer may perform on their own request. */
export const CUSTOMER_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  NEW: ["CANCELLED"],
  TECHNICAL_REVIEW: ["CANCELLED"],
  PRICING: ["CANCELLED"],
  QUOTE_SENT: ["APPROVED", "REVISION_REQUESTED", "CANCELLED"],
  REVISION_REQUESTED: ["CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const FINAL_STATUSES: QuotationStatus[] = ["APPROVED", "REJECTED", "CANCELLED"];
