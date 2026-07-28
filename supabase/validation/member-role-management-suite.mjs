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
]);

console.log("member_role_management_suite pass");
