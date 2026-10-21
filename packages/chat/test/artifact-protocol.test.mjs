import assert from "node:assert/strict";
import { test } from "node:test";
import { ARTIFACT_KINDS, ARTIFACTS_CAPABILITY, isArtifactKind, parseArtifactManifest } from "@sarchauhan/protocol";

const manifest = {
  id: "812607a61d0feaa5", kind: "html", title: "site", created_at: "2026-10-21T21:15:05+00:00",
  updated_at: "2026-10-21T21:15:05+00:00", version: 2, tool_call_id: "c0-1", source: "site",
  entry: "v2/index.html", mime: "text/html", sha256: "a".repeat(64), size: 1193,
};

test("artifact kinds are exactly html, csv, json and image", () => {
  assert.deepEqual([...ARTIFACT_KINDS], ["html", "csv", "json", "image"]);
  assert.equal(ARTIFACTS_CAPABILITY, "artifacts");
  assert.ok(isArtifactKind("csv"));
  assert.ok(!isArtifactKind("file"));
});

test("manifests from Symphony frames parse; malformed ones do not", () => {
  const payload = { ...manifest, path: "/home/u/.symphony/sessions/s/artifacts/812607a61d0feaa5/v2/index.html", seq: 9 };
  assert.deepEqual(parseArtifactManifest(payload), manifest);
  assert.equal(parseArtifactManifest({ ...manifest, kind: "file" }), null);
  assert.equal(parseArtifactManifest({ ...manifest, version: 0 }), null);
  assert.equal(parseArtifactManifest({ ...manifest, size: -1 }), null);
  const missing = { ...manifest };
  delete missing.sha256;
  assert.equal(parseArtifactManifest(missing), null);
  assert.equal(parseArtifactManifest(null), null);
});
