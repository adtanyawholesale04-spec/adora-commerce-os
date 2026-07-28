import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const reviewPath = path.join(root, "docs", "api-contracts", "A3_SHIPPING_ASSIGNMENT_CONTRACT_REVIEW.md");
const statusPath = path.join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");
const shippingMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "025_shipping.sql"), "utf8");

test("Shipping assignment review records the verified canonical work unit and lifecycle", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  assert.match(review, /Status:\*\* BLOCKED/);
  assert.match(review, /`public\.shipments`/);
  for (const status of ["DRAFT", "LABEL_CREATED", "READY_FOR_HANDOFF", "IN_TRANSIT", "DELIVERED", "EXCEPTION", "RTO", "CANCELLED"]) {
    assert.match(review, new RegExp(`\\b${status}\\b`));
    assert.match(shippingMigration, new RegExp(`'${status}'`));
  }
});

test("Shipping review separates assignee ownership from carrier tracking actors", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  assert.match(review, /tracking actor separation/i);
  assert.match(review, /Carrier webhook\/service actor/);
  assert.match(review, /tracking operator/);
  assert.match(review, /assigned_profile_id/);
});

test("Shipping implementation remains blocked until Owner approval", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  const status = fs.readFileSync(statusPath, "utf8");
  assert.match(review, /Owner approval of the Shipping assignment decision table/);
  assert.match(status, /A3-SHIPPING-ASSIGNMENT-001.*BLOCKED/);
  assert.match(status, /NEXT: Owner approval of the Shipping assignment decision table/);
});
