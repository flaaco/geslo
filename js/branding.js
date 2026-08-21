/* Remplace toute trace de "CEPEED" (nom de marque du logiciel, codé en dur dans les
   fichiers HTML statiques) par le nom RÉEL de l'établissement enregistré dans les
   Paramètres — plusieurs écoles utilisant ce logiciel doivent voir LEUR propre nom
   partout, jamais "CEPEED". S'exécute juste après le chargement de data.js. */
(function(){
  const settings = (typeof DB !== 'undefined') ? DB.get(DB.KEYS.settings, {}) : {};
  const nomEcole = (settings.etablissement || '').trim() || 'Gestion Scolaire';
  document.title = document.title.replace(/CEPEED(\s*School International)?/gi, nomEcole);
  window.NOM_ETABLISSEMENT = nomEcole;
})();
