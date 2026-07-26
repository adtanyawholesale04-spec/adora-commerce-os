-- ADORA Commerce OS (ACOS)
-- 030_append_only_triggers.sql

drop trigger if exists inventory_movements_append_only on public.inventory_movements;
create trigger inventory_movements_append_only
before update or delete on public.inventory_movements
for each row execute function public.prevent_update_delete();

drop trigger if exists customer_credit_transactions_append_only on public.customer_credit_transactions;
create trigger customer_credit_transactions_append_only
before update or delete on public.customer_credit_transactions
for each row execute function public.prevent_update_delete();

drop trigger if exists loyalty_transactions_append_only on public.loyalty_transactions;
create trigger loyalty_transactions_append_only
before update or delete on public.loyalty_transactions
for each row execute function public.prevent_update_delete();

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function public.prevent_update_delete();
