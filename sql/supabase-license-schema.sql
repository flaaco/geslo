-- ============================================================
-- CEPEED — Système de clés de licence (à exécuter une seule fois
-- dans l'éditeur SQL de votre projet Supabase)
-- ============================================================
-- Principe de sécurité :
--   - La table license_keys n'est JAMAIS accessible directement
--     depuis l'application (RLS activé, aucune policy publique).
--   - La seule porte d'entrée est la fonction activate_license_key(),
--     exécutée avec les droits du créateur (SECURITY DEFINER), qui
--     vérifie et "consomme" la clé de façon atomique.
--   - Résultat : même avec la clé publique "anon" de votre projet,
--     personne ne peut lister vos clés de licence ni en fabriquer.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.license_keys (
  id               uuid primary key default gen_random_uuid(),
  license_key      text unique not null,
  is_used          boolean not null default false,
  used_by_machine_id text,
  used_at          timestamptz,
  note             text,           -- usage libre (ex: nom du client, date de vente)
  created_at       timestamptz not null default now()
);

-- Verrouillage total de la table : personne (anon ou authenticated)
-- ne peut lire/écrire directement dessus.
alter table public.license_keys enable row level security;
-- (aucune policy créée = accès refusé par défaut à tout le monde)

-- ------------------------------------------------------------
-- Fonction d'activation atomique : vérifie la clé, et si elle est
-- valide et non utilisée, la lie définitivement à la machine appelante.
-- Si la clé est déjà utilisée PAR LA MÊME machine (réinstallation),
-- elle reste valide pour cette machine (idempotent).
-- ------------------------------------------------------------
create or replace function public.activate_license_key(p_key text, p_machine_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.license_keys%rowtype;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    return jsonb_build_object('success', false, 'message', 'missing_key');
  end if;
  if p_machine_id is null or length(trim(p_machine_id)) = 0 then
    return jsonb_build_object('success', false, 'message', 'missing_machine_id');
  end if;

  select * into v_row from public.license_keys where license_key = trim(p_key) for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'invalid_key');
  end if;

  if v_row.is_used and v_row.used_by_machine_id = p_machine_id then
    -- déjà activée sur CETTE machine : on laisse passer (réinstallation)
    return jsonb_build_object('success', true, 'message', 'already_active_this_machine');
  end if;

  if v_row.is_used and v_row.used_by_machine_id <> p_machine_id then
    return jsonb_build_object('success', false, 'message', 'key_already_used');
  end if;

  update public.license_keys
    set is_used = true, used_by_machine_id = p_machine_id, used_at = now()
    where id = v_row.id;

  return jsonb_build_object('success', true, 'message', 'activated');
end;
$$;

-- Autorise les utilisateurs anonymes (l'app cliente) à APPELER cette
-- fonction uniquement — pas à lire la table directement.
grant execute on function public.activate_license_key(text, text) to anon;
grant execute on function public.activate_license_key(text, text) to authenticated;

-- ============================================================
-- POUR CRÉER DES CLÉS À DISTRIBUER (vous seul(e) faites ceci) :
--
--   insert into public.license_keys (license_key, note)
--   values ('CEPEED-AB12-CD34-EF56', 'École X - vendu le 2026-08-10');
--
-- Générer plusieurs clés aléatoires d'un coup (exemple, 10 clés) :
--
--   insert into public.license_keys (license_key)
--   select 'CEPEED-' || upper(substr(md5(random()::text),1,4)) || '-' ||
--          upper(substr(md5(random()::text),1,4)) || '-' ||
--          upper(substr(md5(random()::text),1,4))
--   from generate_series(1,10);
-- ============================================================
