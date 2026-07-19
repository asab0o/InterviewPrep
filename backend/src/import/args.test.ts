import { describe, expect, it } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("defaults to source=github and dryRun=false with no arguments", () => {
    expect(parseArgs([])).toEqual({ dryRun: false, source: "github" });
  });

  it("parses --dry-run", () => {
    expect(parseArgs(["--dry-run"])).toEqual({ dryRun: true, source: "github" });
  });

  it("parses --source=local together with --path", () => {
    expect(parseArgs(["--source=local", "--path=/tmp/legacy-clone"])).toEqual({
      dryRun: false,
      source: "local",
      path: "/tmp/legacy-clone",
    });
  });

  it("parses all flags together, in any order", () => {
    expect(parseArgs(["--path=/tmp/x", "--dry-run", "--source=local"])).toEqual({
      dryRun: true,
      source: "local",
      path: "/tmp/x",
    });
  });

  it("throws for an invalid --source value", () => {
    expect(() => parseArgs(["--source=bogus"])).toThrow(/invalid --source value/);
  });

  it("throws when --source=local is given without --path", () => {
    expect(() => parseArgs(["--source=local"])).toThrow(/--path is required/);
  });

  it("throws for an unrecognized argument", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/unrecognized argument/);
  });
});
