import { runPsql } from "./supabase-validation-runner.mjs";

const email = String(process.env.ACOS_E2E_SIGNUP_EMAIL ?? "").trim().toLowerCase();
if (!/^part8e-[0-9]+@example\.com$/.test(email)) {
  throw new Error("ACOS_E2E_SIGNUP_EMAIL must identify the isolated Part 8E user");
}

const messagesResponse = await fetch("http://127.0.0.1:54324/api/v1/messages");
if (!messagesResponse.ok) throw new Error("Mailpit is unavailable");
const mailbox = await messagesResponse.json();
const messages = Array.isArray(mailbox?.messages) ? mailbox.messages : [];
const confirmation = messages.find(
  (message) =>
    Array.isArray(message?.To) &&
    message.To.some((recipient) => recipient?.Address === email) &&
    message?.Subject === "Confirm your email address",
);
if (!confirmation) throw new Error("signup confirmation was not captured by Mailpit");

const output = runPsql(`
do $$
declare
  v_auth_user_id uuid;
  v_profile_id uuid;
begin
  select id into strict v_auth_user_id
  from auth.users
  where lower(email) = '${email}'
    and email_confirmed_at is not null;

  select id into strict v_profile_id
  from public.profiles
  where auth_user_id = v_auth_user_id
    and status = 'ACTIVE';

  if (select count(*) from public.platform_account_onboarding
      where profile_id = v_profile_id and status = 'NOT_STARTED') <> 1
  then raise exception 'private onboarding projection mismatch'; end if;

  if (select count(*) from public.platform_account_acquisitions
      where profile_id = v_profile_id and source = 'PLATFORM_DIRECT') <> 1
  then raise exception 'first-touch acquisition mismatch'; end if;

  if (select count(*) from public.platform_account_events
      where profile_id = v_profile_id
        and event_type = 'CUSTOMER_ACCOUNT_CREATED') <> 1
  then raise exception 'account-created event is not exactly once'; end if;

  if exists (select 1 from public.organization_memberships
      where profile_id = v_profile_id)
    or exists (select 1 from public.customer_profile_links
      where profile_id = v_profile_id)
    or exists (select 1 from public.customers
      where email_normalized = '${email}')
  then raise exception 'platform signup created a tenant/customer side effect'; end if;

  if (select count(distinct scope)
      from public.platform_signup_rate_limit_buckets
      where scope in ('IP', 'DESTINATION', 'GLOBAL')) <> 3
  then raise exception 'three-scope durable limiter evidence is missing'; end if;
end
$$;

select 'phase_1b_platform_signup_local_e2e_privacy|pass';
`).trim();

if (!output.includes("phase_1b_platform_signup_local_e2e_privacy|pass")) {
  throw new Error(`privacy validation did not report pass: ${output}`);
}

console.log("phase_1b_platform_signup_mailpit_confirmation pass");
console.log("phase_1b_platform_signup_local_e2e_privacy pass");
