import { describe, expect, it } from "vitest";
import { rfqWhere, toCsv } from "@/lib/admin-filters";

describe("admin CSV export", () => {
  it("starts with a BOM, quotes commas/quotes/newlines and keeps Arabic", () => {
    const csv = toCsv([
      ["a", "b"],
      ["مصنع، الشروق", 'say "hi"'],
      ["line\nbreak", null],
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain('"line\nbreak",');
    expect(csv).toContain("مصنع، الشروق");
  });

  it("neutralises formulas but keeps phone numbers", () => {
    const csv = toCsv([["=HYPERLINK(\"x\")", "@SUM(A1)", "+966500000000", "-12", "+cmd|x"]]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain("'@SUM(A1)");
    expect(csv).toContain(",+966500000000,");
    expect(csv).toContain(",-12,");
    expect(csv).toContain("'+cmd|x");
  });

  it("builds request filters and ignores unknown statuses", () => {
    expect(rfqWhere({ status: "NEW" }, "u1").where).toEqual({ status: "NEW" });
    expect(rfqWhere({ status: "DROP TABLE" }, "u1").where).toEqual({});
    expect(rfqWhere({ assignee: "none", mine: "1" }, "u1").where).toEqual({ assignedToId: null });
  });
});
