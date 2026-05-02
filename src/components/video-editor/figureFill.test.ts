import { describe, expect, it } from "vitest";
import {
	alphaToPercent,
	formatHexColor,
	getAlpha,
	isValidHexColor,
	parseHexColor,
	percentToAlpha,
	withAlpha,
} from "./figureFill";

describe("parseHexColor", () => {
	it("parses a 6-digit hex with implicit full alpha", () => {
		expect(parseHexColor("#34B27B")).toEqual({ rgb: "#34b27b", alpha: 255 });
	});

	it("parses an 8-digit hex and preserves alpha", () => {
		expect(parseHexColor("#34B27B80")).toEqual({ rgb: "#34b27b", alpha: 0x80 });
	});

	it("lowercases the rgb component regardless of input case", () => {
		expect(parseHexColor("#ABCDEF").rgb).toBe("#abcdef");
		expect(parseHexColor("#abcdefAB").alpha).toBe(0xab);
	});

	it("treats #RRGGBB00 as fully transparent (alpha 0)", () => {
		expect(parseHexColor("#34b27b00").alpha).toBe(0);
	});

	it("throws on missing leading #", () => {
		expect(() => parseHexColor("34B27B")).toThrow(/invalid hex color/i);
	});

	it("throws on shorthand 3-digit hex (#abc)", () => {
		expect(() => parseHexColor("#abc")).toThrow(/invalid hex color/i);
	});

	it("throws on non-hex characters", () => {
		expect(() => parseHexColor("#zzzzzz")).toThrow(/invalid hex color/i);
	});

	it("throws on truncated 7-digit hex", () => {
		expect(() => parseHexColor("#abcdef0")).toThrow(/invalid hex color/i);
	});

	it("throws on overflow 9-digit hex", () => {
		expect(() => parseHexColor("#abcdef0011")).toThrow(/invalid hex color/i);
	});

	it("throws on the empty string", () => {
		expect(() => parseHexColor("")).toThrow(/invalid hex color/i);
	});
});

describe("formatHexColor", () => {
	it("formats a canonical 8-digit hex from #RRGGBB plus alpha", () => {
		expect(formatHexColor("#34B27B", 0x80)).toBe("#34b27b80");
	});

	it("zero-pads single-digit alpha", () => {
		expect(formatHexColor("#000000", 0x05)).toBe("#00000005");
	});

	it("emits lowercase rgb", () => {
		expect(formatHexColor("#ABCDEF", 255)).toBe("#abcdefff");
	});

	it("rejects 8-digit hex input (must be #RRGGBB only)", () => {
		expect(() => formatHexColor("#34b27b80", 128)).toThrow(/expected #RRGGBB/);
	});

	it("rejects malformed rgb input", () => {
		expect(() => formatHexColor("not-a-hex", 128)).toThrow(/expected #RRGGBB/);
	});

	it("rejects non-integer alpha", () => {
		expect(() => formatHexColor("#abcdef", 12.5)).toThrow(/integer 0-255/);
	});

	it("rejects negative alpha", () => {
		expect(() => formatHexColor("#abcdef", -1)).toThrow(/integer 0-255/);
	});

	it("rejects alpha greater than 255", () => {
		expect(() => formatHexColor("#abcdef", 256)).toThrow(/integer 0-255/);
	});

	it("rejects NaN alpha", () => {
		expect(() => formatHexColor("#abcdef", Number.NaN)).toThrow(/integer 0-255/);
	});
});

describe("withAlpha", () => {
	it("preserves the rgb component when applying a new alpha to a #RRGGBB color", () => {
		expect(withAlpha("#34B27B", 0x80)).toBe("#34b27b80");
	});

	it("replaces the existing alpha on an 8-digit input", () => {
		expect(withAlpha("#34B27Bff", 0x33)).toBe("#34b27b33");
	});

	it("round-trips through getAlpha", () => {
		expect(getAlpha(withAlpha("#abcdef", 200))).toBe(200);
	});

	it("does not silently fall back on malformed input", () => {
		expect(() => withAlpha("not-a-hex", 128)).toThrow();
	});
});

describe("getAlpha", () => {
	it("returns 255 for #RRGGBB", () => {
		expect(getAlpha("#34B27B")).toBe(255);
	});

	it("returns the parsed byte for #RRGGBBAA", () => {
		expect(getAlpha("#34b27b00")).toBe(0);
		expect(getAlpha("#34b27b80")).toBe(0x80);
		expect(getAlpha("#34b27bff")).toBe(255);
	});

	it("throws on malformed input", () => {
		expect(() => getAlpha("garbage")).toThrow();
	});
});

describe("alphaToPercent / percentToAlpha", () => {
	it("maps the alpha boundaries to 0% and 100%", () => {
		expect(alphaToPercent(0)).toBe(0);
		expect(alphaToPercent(255)).toBe(100);
	});

	it("maps the percent boundaries to 0 and 255", () => {
		expect(percentToAlpha(0)).toBe(0);
		expect(percentToAlpha(100)).toBe(255);
	});

	it("rounds intermediate values to the nearest int", () => {
		expect(alphaToPercent(128)).toBe(50);
		expect(percentToAlpha(50)).toBe(128);
	});

	it("rounds 20 percent to alpha 51 (the inspector default)", () => {
		expect(percentToAlpha(20)).toBe(51);
	});

	it("rejects out-of-range alpha", () => {
		expect(() => alphaToPercent(-1)).toThrow();
		expect(() => alphaToPercent(256)).toThrow();
		expect(() => alphaToPercent(Number.NaN)).toThrow();
		expect(() => alphaToPercent(Number.POSITIVE_INFINITY)).toThrow();
	});

	it("rejects out-of-range percent", () => {
		expect(() => percentToAlpha(-1)).toThrow();
		expect(() => percentToAlpha(101)).toThrow();
		expect(() => percentToAlpha(Number.NaN)).toThrow();
	});
});

describe("isValidHexColor", () => {
	it("accepts canonical lowercase #RRGGBB and #RRGGBBAA", () => {
		expect(isValidHexColor("#34b27b")).toBe(true);
		expect(isValidHexColor("#34b27b80")).toBe(true);
	});

	it("accepts uppercase variants", () => {
		expect(isValidHexColor("#ABCDEF")).toBe(true);
		expect(isValidHexColor("#ABCDEF12")).toBe(true);
	});

	it("rejects non-string values without throwing", () => {
		expect(isValidHexColor(undefined)).toBe(false);
		expect(isValidHexColor(null)).toBe(false);
		expect(isValidHexColor(0xabcdef)).toBe(false);
		expect(isValidHexColor({ rgb: "#abcdef" })).toBe(false);
	});

	it("rejects malformed strings without throwing", () => {
		expect(isValidHexColor("")).toBe(false);
		expect(isValidHexColor("abcdef")).toBe(false);
		expect(isValidHexColor("#abc")).toBe(false);
		expect(isValidHexColor("#abcdefg0")).toBe(false);
		expect(isValidHexColor("#abcdef00ff")).toBe(false);
	});
});
