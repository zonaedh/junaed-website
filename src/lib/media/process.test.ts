import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  detectMime,
  processUpload,
  sanitiseSvg,
} from "./process";

/**
 * These tests exist because the upload path is the one place in the app where
 * untrusted bytes become files on a server. Every assertion here is a failure
 * mode that has been used against real sites:
 *
 *  - a "png" that is really HTML
 *  - an SVG carrying a script
 *  - a JPEG with GPS coordinates in it
 *
 * They run without a database and without a storage driver, which is the
 * point: the validation logic is testable on its own (D-019).
 */

async function jpegWithExif(): Promise<Buffer> {
  // A real 8x8 JPEG with an EXIF block written into it.
  return sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  })
    .jpeg()
    .withExif({
      IFD0: { Copyright: "Saffron Test", Software: "vitest" },
    })
    .toBuffer();
}

describe("detectMime", () => {
  it("identifies a real JPEG", async () => {
    const buffer = await jpegWithExif();
    expect(detectMime(buffer)).toBe("image/jpeg");
  });

  it("identifies a real PNG", async () => {
    const buffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .png()
      .toBuffer();
    expect(detectMime(buffer)).toBe("image/png");
  });

  it("identifies a real WebP", async () => {
    const buffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .webp()
      .toBuffer();
    expect(detectMime(buffer)).toBe("image/webp");
  });

  it("identifies a PDF", () => {
    const buffer = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj\n", "binary");
    expect(detectMime(buffer)).toBe("application/pdf");
  });

  it("identifies an SVG", () => {
    const buffer = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
    );
    expect(detectMime(buffer)).toBe("image/svg+xml");
  });

  it("rejects HTML disguised as an image", () => {
    const buffer = Buffer.from(
      "<!DOCTYPE html><html><body><script>alert(1)</script></body></html>",
    );
    expect(detectMime(buffer)).toBeNull();
  });

  it("rejects an executable", () => {
    // MZ header — a Windows PE file.
    const buffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00", "binary");
    expect(detectMime(buffer)).toBeNull();
  });

  it("rejects a file too short to have a signature", () => {
    expect(detectMime(Buffer.from("ab"))).toBeNull();
  });
});

describe("sanitiseSvg", () => {
  it("removes a script element", () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect/></svg>';
    const clean = sanitiseSvg(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert");
    expect(clean).toContain("<rect/>");
  });

  it("removes a self-closing script", () => {
    const clean = sanitiseSvg('<svg><script src="evil.js"/><rect/></svg>');
    expect(clean).not.toContain("<script");
  });

  it("removes onload and other event handlers", () => {
    const clean = sanitiseSvg('<svg><rect onload="alert(1)" onclick=\'x()\'/></svg>');
    expect(clean).not.toContain("onload");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("<rect");
  });

  it("removes a javascript: href", () => {
    const clean = sanitiseSvg('<svg><a href="javascript:alert(1)"><rect/></a></svg>');
    expect(clean).not.toContain("javascript:");
  });

  it("removes foreignObject, which can embed HTML", () => {
    const clean = sanitiseSvg(
      "<svg><foreignObject><body><script>x</script></body></foreignObject><rect/></svg>",
    );
    expect(clean).not.toContain("foreignObject");
    expect(clean).toContain("<rect/>");
  });

  it("leaves a clean SVG untouched", () => {
    const clean = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';
    expect(sanitiseSvg(clean)).toBe(clean);
  });
});

describe("processUpload", () => {
  it("converts a JPEG to WebP and strips EXIF", async () => {
    const input = await jpegWithExif();

    // Prove the fixture really carries metadata before testing that it is gone.
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();

    const result = await processUpload(input);

    expect(result.mime).toBe("image/webp");
    expect(result.extension).toBe("webp");
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.thumb).not.toBeNull();

    const after = await sharp(result.body).metadata();
    expect(after.format).toBe("webp");
    expect(after.exif).toBeUndefined();
  });

  it("caps the width of an oversized image", async () => {
    const wide = await sharp({
      create: {
        width: 4000,
        height: 1000,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await processUpload(wide);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(500);
  });

  it("does not enlarge a small image", async () => {
    const small = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const result = await processUpload(small);
    expect(result.width).toBe(100);
  });

  it("stores a PDF untouched", async () => {
    const pdf = Buffer.from("%PDF-1.7\nfake body\n", "binary");
    const result = await processUpload(pdf);
    expect(result.mime).toBe("application/pdf");
    expect(result.body.equals(pdf)).toBe(true);
    expect(result.thumb).toBeNull();
  });

  it("sanitises an SVG and keeps it vector", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script><rect width="20" height="20"/></svg>',
    );
    const result = await processUpload(svg);
    expect(result.mime).toBe("image/svg+xml");
    expect(result.extension).toBe("svg");
    expect(result.body.toString("utf8")).not.toContain("<script");
  });

  it("throws on a file that is not an allowed type", async () => {
    const html = Buffer.from("<!DOCTYPE html><html><body>hi</body></html>");
    await expect(processUpload(html)).rejects.toThrow("Unsupported file type");
  });
});
