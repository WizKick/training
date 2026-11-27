insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('trainer-backups','trainer-backups',false,50000000,array['application/json'])
on conflict (id) do nothing;

drop policy if exists trainer_read_own on storage.objects;
create policy trainer_read_own on storage.objects for select to authenticated
using (bucket_id='trainer-backups' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists trainer_insert_own on storage.objects;
create policy trainer_insert_own on storage.objects for insert to authenticated
with check (bucket_id='trainer-backups' and (storage.foldername(name))[1]=(select auth.uid())::text);