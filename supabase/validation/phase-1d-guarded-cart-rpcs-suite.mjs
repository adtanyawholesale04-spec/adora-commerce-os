import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  dbContainer,
  dockerBin,
  runPsql,
  runSqlSuite,
  runSupabaseDbLint,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1d_guarded_cart_rpcs",
    file: "supabase/validation/050_phase_1d_guarded_cart_rpcs_test.sql",
    requiredRows: ["phase_1d_guarded_cart_rpcs|pass"],
  },
]);

const fixture = {
  authUserId: randomUUID(),
  organizationId: randomUUID(),
  profileId: randomUUID(),
  membershipId: randomUUID(),
  customerId: randomUUID(),
  linkId: randomUUID(),
  storefrontId: randomUUID(),
  requestId: randomUUID(),
};
const suffix = fixture.organizationId.slice(0, 8);

try {
  runPsql(`
    insert into auth.users (
      id, aud, role, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '${fixture.authUserId}', 'authenticated', 'authenticated',
      'cart-race-${suffix}@example.test', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    );

    insert into public.organizations (id, name, slug, status, currency_code)
    values (
      '${fixture.organizationId}', 'Cart Race ${suffix}',
      'cart-race-${suffix}', 'ACTIVE', 'THB'
    );

    insert into public.profiles (id, auth_user_id, display_name, status)
    values (
      '${fixture.profileId}', '${fixture.authUserId}',
      'Cart Race Customer', 'ACTIVE'
    );

    insert into public.organization_memberships (
      id, organization_id, profile_id, status, is_default, joined_at
    ) values (
      '${fixture.membershipId}', '${fixture.organizationId}',
      '${fixture.profileId}', 'ACTIVE', true, now()
    );

    insert into public.customers (
      id, organization_id, customer_code, display_name, status
    ) values (
      '${fixture.customerId}', '${fixture.organizationId}',
      'CART-RACE-${suffix}', 'Cart Race Customer', 'ACTIVE'
    );

    insert into public.customer_profile_links (
      id, organization_id, customer_id, profile_id, link_status,
      link_source, verification_method, verified_at
    ) values (
      '${fixture.linkId}', '${fixture.organizationId}',
      '${fixture.customerId}', '${fixture.profileId}', 'ACTIVE',
      'VERIFIED_SIGNUP', 'EMAIL_OTP', now()
    );

    insert into public.organization_storefronts (
      id, organization_id, publication_status, tagline,
      published_at, published_by
    ) values (
      '${fixture.storefrontId}', '${fixture.organizationId}',
      'PUBLISHED', 'Cart Race', now(), '${fixture.profileId}'
    );

    insert into public.organization_checkout_settings (
      organization_id, status, currency_code, flat_shipping_charge
    ) values ('${fixture.organizationId}', 'ACTIVE', 'THB', 0);

    insert into public.organization_entitlements (
      organization_id, feature_id, source_type, enabled, valid_from
    )
    select '${fixture.organizationId}', f.id, 'MANUAL_OVERRIDE', true, now()
    from public.features f
    where f.code = 'storefront.checkout';
  `);

  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      runConcurrentPsql(`
        begin;
        set local role authenticated;
        select set_config(
          'request.jwt.claim.sub', '${fixture.authUserId}', true
        );
        select public.api_resolve_storefront_cart(
          '${fixture.organizationId}', '${fixture.requestId}'
        ) ->> 'cart_id';
        commit;
      `),
    ),
  );

  const cartIds = responses.map((output) =>
    output.trim().split(/\r?\n/).filter(Boolean).at(-1),
  );
  const distinctCartIds = new Set(cartIds);
  const counts = runPsql(`
    select concat_ws('|',
      count(*) filter (
        where source = 'STOREFRONT'
          and status in ('OPEN', 'READY', 'RESERVED')
      ),
      (
        select count(*)
        from public.commerce_idempotency_keys k
        where k.organization_id = '${fixture.organizationId}'
          and k.operation = 'CART_CREATE'
          and k.request_id = '${fixture.requestId}'
          and k.state = 'SUCCEEDED'
      )
    )
    from public.carts c
    where c.organization_id = '${fixture.organizationId}'
      and c.customer_id = '${fixture.customerId}';
  `).trim();

  if (distinctCartIds.size !== 1 || !cartIds[0] || counts !== "1|1") {
    throw new Error(
      `cart concurrency gate failed: carts=${[...distinctCartIds]}, counts=${counts}`,
    );
  }

  console.log("phase_1d_guarded_cart_rpcs_concurrency pass");
} finally {
  runPsql(`
    set session_replication_role = replica;
    delete from public.commerce_idempotency_keys
    where organization_id = '${fixture.organizationId}';
    delete from public.carts
    where organization_id = '${fixture.organizationId}';
    delete from public.organization_entitlements
    where organization_id = '${fixture.organizationId}';
    delete from public.organization_checkout_settings
    where organization_id = '${fixture.organizationId}';
    delete from public.organization_storefronts
    where organization_id = '${fixture.organizationId}';
    delete from public.customer_profile_links
    where organization_id = '${fixture.organizationId}';
    delete from public.customers
    where organization_id = '${fixture.organizationId}';
    delete from public.organization_memberships
    where organization_id = '${fixture.organizationId}';
    delete from public.profiles
    where id = '${fixture.profileId}';
    delete from auth.users
    where id = '${fixture.authUserId}';
    delete from public.organizations
    where id = '${fixture.organizationId}';
    set session_replication_role = origin;
  `);
}

runSupabaseDbLint();

console.log("phase_1d_guarded_cart_rpcs_suite pass");

function runConcurrentPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      dockerBin,
      [
        "exec",
        "-i",
        dbContainer,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-t",
        "-A",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`concurrent psql failed (${code}): ${stderr}`));
      }
    });
    child.stdin.end(sql);
  });
}
