# CORE-UI-012 Users / Roles Read-Only Screen

Status: IMPLEMENTED

## Scope

`/admin/users` provides a read-only organization access workspace for members, membership roles, roles, role-permission mappings, the permission catalog, and organization invitations.

## Permission Boundary

- Required read permission: `members.view`
- Optional boundary indicators:
  - `members.manage`
  - `audit.view`

This screen does not invite users, deactivate memberships, assign roles, edit permissions, create support access grants, revoke access, or call Supabase Auth Admin APIs.

## Read Model

Server read model: `src/lib/admin/users.ts`

Tables read through Supabase server client and tenant RLS:

- `organization_memberships`
- `profiles`
- `roles`
- `membership_roles`
- `role_permissions`
- `permissions`
- `organization_invitations`

The screen intentionally does not select `auth.users`, Auth Admin user payloads, service-role data, support access `scope_json`, or provider secrets.

## Snapshot Limits

- Members: latest 150
- Roles: latest 100
- Permissions: latest 300 linked permission rows
- Role-permission mappings: latest 600 linked rows
- Invitations: latest 75

## Guarded Workflows

The following remain blocked from this screen:

- User invitation
- Membership activation/deactivation/removal
- Role assignment/removal
- Permission catalog creation/edit
- Support access grant approval/revocation
- Auth Admin user management

These require a guarded admin access service, owner-approved authority boundaries, and audit logging.

## Supabase Security Notes

Supabase Auth users live in the Auth schema. The public API should use application-owned profile and membership tables protected by grants and RLS. Admin Auth operations require a trusted server environment and secret key boundary, and are not part of this read-only UI.

References:

- https://supabase.com/docs/guides/auth/users
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/api/securing-your-api
