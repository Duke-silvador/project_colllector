/* Le nouveau build rapide (page vide) : même contenu que l'ancien, mis en page en colonne selon les règles d'Apple. Rien ne se clique ici : on travaille le visuel.
   window.NV.doctrine(element) simule le choix d'une doctrine (null = aucune) ; window.NV.remplir() pose des pastilles de démo. Ni l'un ni l'autre n'existe dans l'Arsenal. */
(function () {
  "use strict";
  var ICONES = window.ICONES_RP, LOGO = window.LOGO_RP;
  var echap = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var slot = function (cls, nom, extra) { return '<button type="button" class="nv-slot ' + cls + '" aria-label="' + echap(nom) + '" title="' + echap(nom) + '"' + (extra || "") + "></button>"; };
  var rond = function (nom, extra) { return '<button type="button" class="nv-rond" aria-label="' + echap(nom) + '" title="' + echap(nom) + '"' + (extra || "") + "></button>"; };
  var bloc = function (cls, titre, aide, corps) { return '<section class="nv-bloc ' + cls + '"><header><h2>' + echap(titre) + "</h2>" + (aide ? '<p class="nv-aide">' + echap(aide) + "</p>" : "") + "</header>" + corps + "</section>"; };

  var SVG_RETOUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_PLEIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var exo = bloc("nv-exo", "Exotique d'armure", "", '<div class="nv-ligne"><div class="nv-texte"><span class="nv-aide">Aucune choisie</span></div>' + slot("nv-vide nv-exo-slot", "Choisir l'exotique d'armure", ' data-nv="exo"') + "</div>");

  var armes = bloc("", "Armes", "", '<div class="nv-armes">' + ["Cinétique", "Énergétique", "Lourde"].map(function (n, i) {
    return '<div class="nv-arme"><h3 class="nv-etiq">' + n + "</h3>" + slot("nv-vide", n + " : choisir une arme dans la liste du jeu", ' data-nv="arme"') +
      '<div class="nv-perks">' + [1, 2].map(function (k) { return rond("Choisir le perk " + k + " de la " + n.toLowerCase(), ' data-nv="perk"'); }).join("") + "</div></div>";
  }).join("") + "</div>");

  var STATS = [["sante", "Santé"], ["melee", "Mêlée"], ["grenade", "Grenade"], ["super", "Super"], ["classe", "Classe"], ["arme", "Armes"]];
  var stats = bloc("", "Statistiques visées", "Un niveau de 1 à 6", '<div class="nv-stats" role="group" aria-label="Statistiques d\'armure visées : un niveau de 1 à 6 chacune">' + STATS.map(function (s) {
    return '<label class="nv-stat" title="' + echap(s[1] + " : pas visée") + '"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><image href="data:image/png;base64,' + ICONES[s[0]] + '" width="24" height="24"/></svg><span>' + s[1] + '</span><b class="nv-niveau" aria-hidden="true">–</b>' +
      '<select data-c-niveau="' + s[0] + '" aria-label="Niveau de priorité : ' + s[1] + '"><option value="0" selected>–</option>' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '">' + n + "</option>"; }).join("") + "</select></label>";
  }).join("") + "</div>");

  var PIECES = ["Casque", "Gantelets", "Torse", "Jambes", "Objet de classe"];
  var RAISON = "Cette case demande l'armure : choisis d'abord la pièce.";
  var armure = bloc("", "Armure", "", '<div class="nv-armure"><span></span><span class="nv-tete">Général</span><span class="nv-tete">Ajust.</span><span class="nv-tete nv-mods">Mods de la pièce</span>' + PIECES.map(function (p) {
    return '<span class="nv-piece">' + p + "</span>" +
      slot("nv-c1 nv-grise", "Mod général, " + p.toLowerCase() + " : " + RAISON, ' aria-disabled="true"') + slot("nv-c2 nv-grise", "Ajustement, " + p.toLowerCase() + " : " + RAISON, ' aria-disabled="true"') +
      [1, 2, 3].map(function (k) { return slot("nv-c3 nv-vide", "Mod " + k + " de " + p.toLowerCase() + " : à choisir"); }).join("");
  }).join("") + '</div><div class="nv-bonus"><div class="nv-texte"><span class="nv-etiq" style="margin:0;color:#dbe6ff;font-size:15px">Bonus d\'ensemble</span><p class="nv-aide">Deux ensembles au plus</p></div>' +
    slot("nv-vide", "Choisir le bonus d'ensemble 1") + slot("nv-vide", "Choisir le bonus d'ensemble 2") + "</div>");

  var artefact = bloc("", "Artefact", "", '<div class="nv-ligne"><div class="nv-texte"><span class="nv-aide">Ton compte n\'est pas encore lu</span></div>' + slot("nv-art nv-vide", "Artefact : ton compte n'est pas encore lu", " disabled") + "</div>" +
    '<p class="nv-etiq" style="margin:16px 0 0">Atouts</p><div class="nv-atouts">' + [1, 2, 3, 4, 5, 6, 7].map(function (i) { return rond("Atout " + i); }).join("") + "</div>");

  var cases = function (n, noms, classe) { return '<div class="nv-cases nv-n' + n + '">' + noms.map(function (nom, i) { return '<div class="nv-case">' + slot("nv-doc " + (classe || ""), nom + " : choisis d'abord la doctrine", " disabled") + (n === 6 ? "" : "<small>" + nom + "</small>") + "</div>"; }).join("") + "</div>"; };
  var doctrine = bloc("nv-doctrine", "Doctrine", "", '<div class="nv-rang"><div class="nv-doc-ligne"><div class="nv-case">' + slot("nv-vide", "Choisir la doctrine (classe et élément)", ' data-nv="doc"') + "<small>Doctrine</small></div>" +
    '<div class="nv-case">' + slot("nv-doc", "Super : choisis d'abord la doctrine", " disabled") + "<small>Super</small></div><div class=\"nv-texte nv-doc-texte\"><span class=\"nv-aide\">Choisis d'abord la doctrine</span></div></div></div>" +
    '<div class="nv-rang"><p class="nv-etiq">Compétences</p>' + cases(4, ["Classe", "Saut", "Mêlée", "Grenade"]) + "</div>" +
    '<div class="nv-rang"><p class="nv-etiq">Aspects</p>' + cases(2, ["Aspect 1", "Aspect 2"]) + "</div>" +
    '<div class="nv-rang"><p class="nv-etiq">Fragments</p>' + cases(6, ["Fragment 1", "Fragment 2", "Fragment 3", "Fragment 4", "Fragment 5", "Fragment 6"]) + "</div>");

  var page = '<header class="nv-nav"><button type="button" class="nv-retour" data-nv="retour" aria-label="Retour">' + SVG_RETOUR + "Retour</button>" +
    '<div class="nv-nav-titre"><h1>Création de build</h1><span class="nv-temoin" role="status" aria-live="polite" data-etat="vide">Rien à enregistrer</span></div>' +
    '<button type="button" class="nv-icone nv-pleinecran" aria-pressed="false" aria-label="Plein écran" title="Plein écran">' + SVG_PLEIN + "</button></header>" +
    '<main class="nv-page"><section class="nv-identite"><img class="nv-logo" src="' + LOGO + '" alt="Le Bunker" width="64" height="64">' +
    '<label class="nv-champ"><span class="nv-cache">Nom du build</span><input type="text" maxlength="40" data-c-nom value="" placeholder="Nom du build" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>' +
    '<div class="nv-msg"><p role="status">Rien à enregistrer pour l\'instant : commence par choisir une pièce.</p><button type="button" class="nv-btn nv-btn-2 nv-carte-ouvrir" data-nv="ouvrir-carte">Ouvrir une carte</button></div></section>' +
    exo + armes + stats + armure + artefact + doctrine + "</main>" +
    '<footer class="nv-barre"><div class="nv-barre-in"><button type="button" class="nv-btn nv-btn-1" data-nv="enregistrer" disabled>Enregistrer</button><button type="button" class="nv-btn nv-btn-2" data-nv="envoyer">Envoyer</button></div></footer>';

  var z = document.getElementById("build");
  z.innerHTML = page;

  /* La doctrine simulée : sans doctrine, tout ce qui en dépend est éteint ; avec elle, les emplacements s'ouvrent. */
  var NOMS = { "solaire": "Solaire", "cryo-électrique": "Cryo-électrique", "abyssal": "Abyssal", "stasique": "Stase", "filobscur": "Filobscur", "prismatique": "Prismatique" };
  function doctrine_(el) {
    var oui = !!(el && NOMS[el]);
    z.querySelectorAll(".nv-slot.nv-doc").forEach(function (b) { b.disabled = !oui; b.classList.toggle("nv-vide", oui); b.setAttribute("aria-label", b.getAttribute("aria-label").split(" : ")[0] + (oui ? " : à choisir" : " : choisis d'abord la doctrine")); });
    var t = z.querySelector(".nv-doc-texte"); if (t) t.innerHTML = oui ? '<span class="nv-nom">Doctrine ' + NOMS[el].toLowerCase() + "</span>" : '<span class="nv-aide">Choisis d\'abord la doctrine</span>';
    var d = z.querySelector('[data-nv="doc"]');
    if (d) { d.classList.toggle("nv-plein", oui); d.classList.toggle("nv-vide", !oui); var i = d.querySelector("i"); if (i) i.remove(); if (oui) pastille(d, 150); }
  }
  function pastille(el, deg) { var i = document.createElement("i"); i.style.cssText = "background:linear-gradient(" + deg + "deg,#ffffff55,transparent 45%),linear-gradient(" + deg + "deg,var(--f-a),var(--f-b))"; el.appendChild(i); }
  function remplir() {
    if (z.dataset.rempli) return; z.dataset.rempli = "1";
    z.querySelectorAll(".nv-arme > .nv-slot").forEach(function (b, k) { b.classList.remove("nv-vide"); b.classList.add("nv-plein"); pastille(b, 135 + 40 * k); });
    var rs = z.querySelectorAll(".nv-perks .nv-rond"); rs.forEach(function (r, a) { if (a % 3 !== 2) { r.classList.add("nv-plein"); pastille(r, 160); } else if (a === 5) r.classList.add("nv-ouvert"); });
    var e = z.querySelector(".nv-exo-slot"); e.classList.remove("nv-vide"); e.classList.add("nv-plein"); pastille(e, 140); z.querySelector(".nv-exo .nv-texte").innerHTML = '<span class="nv-nom">Exemple d\'exotique</span><span class="nv-aide">Casque</span>';
    z.querySelectorAll(".nv-armure .nv-c3").forEach(function (c, i) { if (i % 2 === 0) { c.classList.remove("nv-vide"); c.classList.add("nv-plein"); pastille(c, 120 + 20 * i); } });
    z.querySelectorAll(".nv-stat").forEach(function (s, i) { if (i < 4) { s.classList.add("nv-pris"); s.querySelector(".nv-niveau").textContent = String(6 - i); } });
    z.querySelectorAll(".nv-atouts .nv-rond").forEach(function (r, i) { if (i < 5) { r.classList.add("nv-plein"); pastille(r, 100 + 20 * i); } });
    var a = z.querySelector(".nv-art"); a.classList.remove("nv-vide"); a.classList.add("nv-plein"); pastille(a, 120);
    var t = z.querySelector(".nv-temoin"); t.textContent = "Pas enregistré"; t.dataset.etat = "non";
    z.querySelector('[data-nv="enregistrer"]').disabled = false;
  }
  window.NV = { doctrine: doctrine_, remplir: remplir };
})();
