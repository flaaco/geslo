/* ============================================================
   CEPEED — Configuration Supabase (VALIDATION DES CLÉS DE LICENCE UNIQUEMENT)
   ============================================================

   Ce fichier NE CONTIENT AUCUNE DONNÉE DE L'ÉCOLE. Supabase n'est utilisé
   QUE pour vérifier/consommer une clé de licence au moment de l'activation.
   Une fois activé, le logiciel fonctionne 100% hors-ligne, comme le reste
   de l'application.

   ÉTAPES POUR ACTIVER LE SYSTÈME DE LICENCE (à faire une seule fois) :
   1. Créez un projet gratuit sur https://supabase.com
   2. Dans l'éditeur SQL du projet, exécutez le script fourni :
      sql/supabase-license-schema.sql
   3. Dans Project Settings → API, copiez :
      - "Project URL"      → collez-le ci-dessous dans SUPABASE_URL
      - "anon public" key  → collez-le ci-dessous dans SUPABASE_ANON_KEY
   4. Pour créer des clés de licence valables, ouvrez la table
      "license_keys" dans Supabase (Table Editor) et insérez une ligne
      par clé que vous vendez/distribuez, ex: license_key = "CEPEED-AB12-CD34-EF56".
      Vous êtes seul(e) à avoir accès à ce tableau — vous seul(e) savez
      donc quelles clés existent et sont valables.

   Tant que les valeurs ci-dessous ne sont pas renseignées, l'écran
   d'activation affichera un message d'erreur de configuration.
   ============================================================ */

const SUPABASE_URL = "https://ddvnyupzotmlleqtjqqv.supabase.co";          // ex: "https://xxxxxxxxxxxx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkdm55dXB6b3RtbGxlcXRqcXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDc0MDksImV4cCI6MjEwMTc4MzQwOX0.4wv67UGEfllljVI98nozGjmEACFi1_fYlCzrXUxwdmg";     // ex: "eyJhbGciOi..." (clé "anon public")


