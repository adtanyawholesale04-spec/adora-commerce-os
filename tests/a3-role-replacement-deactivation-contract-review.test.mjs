import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const reviewPath = path.join(
  root,
  "docs",
  "api-contracts",
  "A3_ROLE_REPLACEMENT_DEACTIVATION_CONTRACT_REVIEW.md",
);
const statusPath = path.join(root, "docs", "roadmap", "ACOS_IMPLEMENTATION_STATUS.md");

test("A3 role replacement/deactivation review records the owner approval", () => {
  const review = fs.readFileSync(reviewPath, "utf8");
  for (const required of [
    "A3-ROLE-MANAGEMENT-CONTRACT-REVIEW-001",
    "admin.member.role.replace.request",
    "admin.member.deactivate.request",
    "SUSPENDED",
    "REMOVED",
    "owner",
    "idempotency",
    "Status:** `APPROVED`",
    "Owner approval:",
    "APPROVED: Option A",
    "NEXT: Part 2",
  ]) {
    assert.ok(review.includes(required), `${required} missing`);
  }
});

test("implementation status points to the approved review and Part 1", () => {
  const status = fs.readFileSync(statusPath, "utf8");
  assert.match(status, /A3-ROLE-MANAGEMENT-CONTRACT-REVIEW-001/);
  assert.match(status, /A3 role replacement\/deactivation contract review APPROVED/i);
  assert.match(status, /NEXT: Track B Business Rule Review/);
});

test("Part 1 implementation contract stays write-disabled and hands off to Part 2", () => {
  const contractPath = path.join(
    root,
    "docs",
    "api-contracts",
    "A3_ROLE_REPLACEMENT_DEACTIVATION_IMPLEMENTATION_CONTRACT.md",
  );
  const contract = fs.readFileSync(contractPath, "utf8");
  for (const required of [
    "A3-ROLE-MANAGEMENT-IMPLEMENTATION-CONTRACT-001",
    "admin.member.role.replace.request",
    "admin.member.deactivate.request",
    "members.manage",
    "SUSPENDED",
    "IDEMPOTENCY_CONFLICT",
    "No reactivation action",
    "NEXT: Track B Business Rule Review",
  ]) {
    assert.ok(contract.includes(required), `${required} missing`);
  }
});

test("Part 2B records the open-work coverage gap without enabling deactivation", () => {
  const predicatePath = path.join(
    root,
    "docs",
    "api-contracts",
    "A3_MEMBER_DEACTIVATION_OPEN_WORK_PREDICATE.md",
  );
  const predicate = fs.readFileSync(predicatePath, "utf8");
  for (const required of [
    "A3-MEMBER-DEACTIVATION-OPEN-WORK-PREDICATE-001",
    "conversations",
    "notifications",
    "Fulfillment, QC, shipping, returns",
    "coverage_gaps",
    "database boundary remains `BLOCKED`",
    "NEXT: Track B Business Rule Review",
  ]) {
    assert.ok(predicate.includes(required), `${required} missing`);
  }
});

test("Fulfillment assignment records approval and its implemented boundary", () => {
  const contractPath = path.join(
    root,
    "docs",
    "api-contracts",
    "A3_FULFILLMENT_ASSIGNMENT_CONTRACT_REVIEW.md",
  );
  const contract = fs.readFileSync(contractPath, "utf8");
  for (const required of [
    "A3-FULFILLMENT-ASSIGNMENT-001",
    "Status:** `APPROVED`",
    "fulfillment_events.actor_profile_id",
    "Blocking statuses",
    "Unassigned work",
    "Owner approval",
    "20260728135454_a3_fulfillment_assignment_boundary.sql",
    "api_assign_fulfillment",
    "Proceed with the next approved assignment domain: Shipping.",
  ]) {
    assert.ok(contract.includes(required), `${required} missing`);
  }
});
