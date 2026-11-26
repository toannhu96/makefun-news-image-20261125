/**
 * make.fun bounty entry.
 *
 * Copies the pre-rendered news poster (`entry.png`, 1024x1024) that ships
 * alongside this script into the output directory, then verifies the copy.
 *
 * - Output directory: $MAKEFUN_OUTPUT_DIR, falling back to `/output`.
 * - The output directory is created recursively if it does not exist.
 * - After writing, the file is read back from disk and checked:
 *     1. size is > 0 and <= 1 MiB,
 *     2. it begins with the PNG signature 89 50 4E 47 0D 0A 1A 0A,
 *     3. its size equals the source size.
 *   If the write or any check fails, the output file is deleted and the
 *   process exits with code 1, so no partial or invalid entry is left behind.
 * - Deterministic: no network access, no randomness, no timestamps — the
 *   output is a byte-for-byte copy of the bundled asset.
 *
 * Run with Node 22.6+:
 *   node --experimental-strip-types main.ts
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_OUTPUT_DIR = "/output";
const ASSET_NAME = "entry.png";

/** Upper bound on the output file size: 1 MiB. */
const MAX_OUTPUT_BYTES = 1024 * 1024;

/** PNG files always begin with this 8-byte signature. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** True if `data` starts with the PNG signature. */
function hasPngSignature(data: Buffer): boolean {
  return data.length >= PNG_SIGNATURE.length && data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

/** Resolve the output directory from the environment, ignoring empty values. */
function resolveOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  return fromEnv ? fromEnv : DEFAULT_OUTPUT_DIR;
}

/** Read the bundled poster located next to this script and sanity-check it. */
function readAsset(): Buffer {
  const assetPath = join(import.meta.dirname, ASSET_NAME);
  const data = readFileSync(assetPath);
  if (!hasPngSignature(data)) {
    throw new Error(`source ${assetPath} is not a valid PNG file`);
  }
  return data;
}

/**
 * Re-read the written file from disk and verify size bounds, PNG signature,
 * and byte count against the source. Throws on the first failed check;
 * returns the verified size on success.
 */
function verifyOutput(outputPath: string, expectedBytes: number): number {
  const written = readFileSync(outputPath);
  const size = written.length;

  if (size <= 0 || size > MAX_OUTPUT_BYTES) {
    throw new Error(`size check failed: ${size} bytes is outside (0, ${MAX_OUTPUT_BYTES}]`);
  }
  if (!hasPngSignature(written)) {
    throw new Error("signature check failed: first 8 bytes are not 89 50 4E 47 0D 0A 1A 0A");
  }
  if (size !== expectedBytes) {
    throw new Error(`byte count check failed: wrote ${size} bytes, source has ${expectedBytes}`);
  }
  return size;
}

/** Print an error and exit with code 1. */
function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function main(): void {
  const outputDir = resolveOutputDir();
  const outputPath = join(outputDir, ASSET_NAME);

  // Setup failures happen before anything is written, so there is nothing to clean up.
  let data: Buffer;
  try {
    mkdirSync(outputDir, { recursive: true });
    data = readAsset();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  // From here on a (possibly partial) output file may exist; remove it on any failure.
  let size: number;
  try {
    writeFileSync(outputPath, data);
    size = verifyOutput(outputPath, data.length);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    try {
      rmSync(outputPath, { force: true });
    } catch (rmErr) {
      const rmReason = rmErr instanceof Error ? rmErr.message : String(rmErr);
      fail(`${outputPath}: ${reason}; additionally failed to remove output: ${rmReason}`);
    }
    fail(`${outputPath}: ${reason}; output file removed`);
  }

  console.log(`OK: ${outputPath} — ${size} bytes, PNG signature valid, matches source`);
}

main();
