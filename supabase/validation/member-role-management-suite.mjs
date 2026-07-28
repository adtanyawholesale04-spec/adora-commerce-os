import { runSqlSuite } from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "member_role_assignment_boundary",
    file: "supabase/validation/020_member_role_assignment_boundary_test.sql",
    requiredRows: ["member_role_assignment_boundary|pass"],
  },
  {
    name: "member_role_removal_boundary",
    file: "supabase/validation/021_member_role_removal_boundary_test.sql",
    requiredRows: ["member_role_removal_boundary|pass"],
  },
  {
    name: "member_role_management_e2e",
    file: "supabase/validation/022_member_role_management_e2e_test.sql",
    requiredRows: ["member_role_management_e2e|pass"],
  },
  {
    name: "member_role_replacement_boundary",
    file: "supabase/validation/023_member_role_replacement_boundary_test.sql",
    requiredRows: ["member_role_replacement_boundary|pass"],
  },
  {
    name: "member_deactivation_boundary",
    file: "supabase/validation/024_member_deactivation_boundary_test.sql",
    requiredRows: ["member_deactivation_boundary|pass"],
  },
  {
    name: "fulfillment_assignment_boundary",
    file: "supabase/validation/025_fulfillment_assignment_boundary_test.sql",
    requiredRows: ["fulfillment_assignment_boundary|pass"],
  },
]);

console.log("member_role_management_suite pass");
