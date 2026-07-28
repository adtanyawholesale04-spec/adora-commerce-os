import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const reviewPath = path.join(root, "docs", "api-contracts", "A3_RETURNS_ASSIGNMENT_CONTRACT_REVIEW.md");
const statusPath = path.join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");
const returnsMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "026_returns.sql"), "utf8");

test("Returns assignment review records the approved canonical work unit and lifecycle", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  assert.match(review, /Status:\*\* APPROVED/);
  assert.match(review, /`public\.returns`/);
  for (const status of ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "INSPECTION", "RESOLVED", "REJECTED", "CANCELLED"]) {
    assert.match(review, new RegExp(`\\b${status}\\b`));
    assert.match(returnsMigration, new RegExp(`'${status}'`));
  }
});

test("Returns review separates assignment from inspection and disposition actors", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  assert.match(review, /inspection actor separation/i);
  assert.match(review, /return_status_history\.changed_by/);
  assert.match(review, /return_inventory_dispositions\.inspected_by/);
  assert.match(review, /assigned_profile_id/);
});

test("Returns implementation is ready after Owner approval", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  const status = fs.readFileSync(statusPath, "utf8");
  assert.match(review, /Owner approval.*Recorded/);
  assert.match(status, /A3-RETURNS-ASSIGNMENT-001.*APPROVED/);
  assert.match(status, /NEXT: Final Part 2C status reconciliation, then Track B Business Rule Review/);
});
