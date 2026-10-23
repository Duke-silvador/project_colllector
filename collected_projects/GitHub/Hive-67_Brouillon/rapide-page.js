/* Page de test du build rapide : génère la page vide, avec les VRAIS chiffres et les VRAIS noms de classes de site/personnage/personnage.js (lots 274 à 281).
   Rien ne se clique ici : on travaille le visuel. Ce qui se règle : rapide.css (couleurs, bordures, tailles), les tables ci-dessous (positions). */
(function () {
  "use strict";
  const ICONES = window.ICONES_RP;   // icones.js : les six icônes des statistiques (celles du jeu)
  const LOGO = window.LOGO_RP;   // logo.js : le logo du Bunker, réduit
  const RP_L = 816, RP_H = 1927;
  const RP_CASES = {
    EXO_1: [657, 294, 72, 73], W_CIN: [109, 428, 91, 91], W_ENE: [363, 428, 91, 91], W_LOU: [618, 428, 91, 91], W_CIN_P1: [87, 523, 64, 64], W_CIN_P2: [159, 523, 64, 64],
    W_ENE_P1: [340, 523, 64, 64], W_ENE_P2: [413, 523, 64, 64], W_LOU_P1: [594, 523, 64, 64], W_LOU_P2: [668, 523, 64, 64], STAT_SAN: [44, 647, 233, 60],
    STAT_MEL: [293, 647, 233, 60], STAT_GRE: [541, 647, 233, 60], STAT_SUP: [44, 720, 233, 60], STAT_CLA: [293, 720, 233, 60], STAT_ARM: [541, 720, 233, 60],
    ARM_CAS_1: [174, 845, 64, 63], ARM_CAS_2: [245, 845, 64, 63], ARM_CAS_3: [316, 845, 64, 63], ARM_CAS_4: [387, 845, 64, 63], ARM_CAS_5: [459, 845, 64, 63],
    ARM_GAN_1: [174, 916, 64, 63], ARM_GAN_2: [245, 916, 64, 63], ARM_GAN_3: [316, 916, 64, 63], ARM_GAN_4: [387, 916, 64, 63], ARM_GAN_5: [459, 916, 64, 63],
    ARM_TOR_1: [174, 987, 64, 63], ARM_TOR_2: [245, 987, 64, 63], ARM_TOR_3: [316, 987, 64, 63], ARM_TOR_4: [387, 987, 64, 63], ARM_TOR_5: [459, 987, 64, 63],
    ARM_JAM_1: [174, 1058, 64, 63], ARM_JAM_2: [245, 1058, 64, 63], ARM_JAM_3: [316, 1058, 64, 63], ARM_JAM_4: [387, 1058, 64, 63], ARM_JAM_5: [459, 1058, 64, 63],
    ARM_OBJ_1: [174, 1130, 64, 63], ARM_OBJ_2: [245, 1130, 64, 63], ARM_OBJ_3: [316, 1130, 64, 63], ARM_OBJ_4: [387, 1130, 64, 63], ARM_OBJ_5: [459, 1130, 64, 63],
    BONUS_1: [607, 936, 83, 87], BONUS_2: [607, 1032, 83, 87], ART_MAIN: [52, 1270, 75, 76], ART_P1: [146, 1272, 72, 73], ART_P2: [230, 1272, 72, 73], ART_P3: [314, 1272, 72, 73],
    ART_P4: [398, 1272, 72, 73], ART_P5: [482, 1272, 72, 73], ART_P6: [566, 1272, 72, 73], DOC_1: [169, 1433, 69, 68], DOC_2: [247, 1433, 68, 69], COMP_1: [169, 1510, 69, 70],
    COMP_2: [246, 1510, 69, 70], COMP_3: [322, 1510, 69, 70], COMP_4: [398, 1510, 69, 70], ASP_1: [169, 1588, 69, 70], ASP_2: [246, 1587, 69, 71], FRAG_1: [169, 1665, 69, 71],
    FRAG_2: [245, 1665, 69, 71], FRAG_3: [322, 1665, 69, 71], FRAG_4: [398, 1665, 69, 71], FRAG_5: [474, 1665, 69, 71], FRAG_6: [551, 1665, 69, 71], ART_P7: [650, 1272, 72, 73]
  };
  const RP_PANNEAUX = { EXO: [24, 278, 768, 100], ARMES: [24, 388, 768, 218], STATS: [24, 617, 768, 184], ARMURE: [24, 811, 768, 412], ARTEFACT: [24, 1233, 768, 142], DOCTRINE: [24, 1386, 768, 376] };
  const RP_SEPARATEURS = [[278, 415, 1, 175], [538, 415, 1, 175], [563, 845, 1, 350]];
  const RP_RAILS = [[11, 278, 1, 1484], [804, 278, 1, 1484]];
  const echap = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pc = (v, t) => +(v / t * 100).toFixed(3) + "%";
  const rpPos = (x, y, w, hh) => "left:" + pc(x, RP_L) + ";top:" + pc(y, RP_H) + ";width:" + pc(w, RP_L) + ";height:" + pc(hh, RP_H);
  const carreRP = (contenu, classe, attrs, nom) => '<button type="button" class="rp-carre' + (classe ? " " + classe : "") + '"' + (attrs || "") + ' aria-label="' + echap(nom) + '" title="' + echap(nom) + '">' + (contenu || "") + "</button>";
  const ici = (code, g) => { const c = RP_CASES[code]; return ' style="' + rpPos(c[0], c[1], c[2], c[3]) + ";--g:" + (g || 4) + '"'; };
  const poser = (html, code, g) => html.replace(/^<(\w+)/, "<$1" + ici(code, g));
  const texteRP = (texte, classe, x, y, w, hh, attrs) => '<span class="rp-txt ' + classe + '" style="' + rpPos(x, y, w, hh) + '"' + (attrs || "") + ">" + echap(texte) + "</span>";
  const titreRP = (texte, x, y) => '<h5 class="rp-titre-p" style="left:' + pc(x, RP_L) + ";top:" + pc(y, RP_H) + '">' + echap(texte) + "</h5>";
  const NOMS_COURTS_ARMES = ["Cinétique", "Énergétique", "Lourde"];
  const NOMS_COURTS = ["Casque", "Gantelets", "Torse", "Jambes", "Objet de classe"];
  const STATS = [["sante", "Santé"], ["melee", "Mêlée"], ["grenade", "Grenade"], ["super", "Super"], ["classe", "Classe"], ["arme", "Armes"]];
  const RAISON = "Cette case demande l'armure : choisis d'abord la pièce.";
  const RIEN = "Rien à enregistrer pour l'instant : commence par choisir une pièce.";
  const caseMod = (cle, nom, classe, raison) => '<button type="button" class="ct-b mod ct-case' + (classe ? " " + classe : "") + (raison ? " grise" : "") + '" data-c-case="x:' + cle + '" title="' + echap(nom + (raison ? " : " + raison : "")) + '" aria-label="' + echap(nom + (raison ? " : " + raison : "")) + '"' + (raison ? ' aria-disabled="true"' : "") + "></button>";

  const decor = '<div class="rp-decor" aria-hidden="true">' + Object.entries(RP_PANNEAUX).map(([k, b]) => '<div class="rp-panneau" data-panneau="' + k + '" style="' + rpPos(...b) + '"></div>').join("") +
    RP_SEPARATEURS.map(b => '<div class="rp-sep" style="' + rpPos(...b) + '"></div>').join("") + RP_RAILS.map(b => '<div class="rp-rail" style="' + rpPos(...b) + '"></div>').join("") + "</div>";
  const exo = '<section class="rp-partie rp-ex">' + titreRP("Exotique d'armure", 40, 278) + '<div class="rp-ligne">' + poser(carreRP("", "exo-libre", ' data-rp="exo-ouvrir" aria-expanded="false"', "Choisir l'exotique d'armure"), "EXO_1", 4) + "</div></section>";
  const W = ["W_CIN", "W_ENE", "W_LOU"];
  const armes = '<section class="rp-partie">' + titreRP("Armes", 252, 389) + '<div class="rp-armes">' + NOMS_COURTS_ARMES.map((n, i) => {
    const cx = RP_CASES[W[i]][0] + RP_CASES[W[i]][2] / 2;
    return '<div class="rp-arme">' + texteRP(n, "rp-et", cx - 118, 404, 236, 24, "") +
      poser(carreRP("", "", ' data-rp="arme-ouvrir" data-rp-i="' + i + '" aria-expanded="false"', n + " : choisir une arme dans la liste du jeu"), W[i], 4) +
      '<span class="rp-perks" aria-label="Perks de l\'arme">' + [0, 1].map(k => poser('<button type="button" class="rp-rond" data-rp="perk-ouvrir" data-rp-i="' + i + '" data-rp-k="' + k + '" aria-expanded="false" title="Choisir le perk ' + (k + 1) + '" aria-label="Choisir le perk ' + (k + 1) + " de la " + n.toLowerCase() + '"></button>', W[i] + "_P" + (k + 1), 4)).join("") + "</span></div>";
  }).join("") + "</div></section>";
  const S = ["STAT_SAN", "STAT_MEL", "STAT_GRE", "STAT_SUP", "STAT_CLA", "STAT_ARM"];
  const stats = '<section class="rp-partie">' + titreRP("Statistiques d'armure visées", 40, 617) + '<div class="rp-stats" role="group" aria-label="Statistiques d\'armure visées : un niveau de 1 à 6 chacune">' + STATS.map(([id, nom], i) =>
    poser('<label class="rp-stat-cell" title="' + echap(nom + " : pas visée") + '"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><image href="data:image/png;base64,' + ICONES[id] + '" width="24" height="24"/></svg><span class="rp-stat-nom">' + echap(nom) + '</span><b class="rp-niveau" aria-hidden="true">–</b>' +
      '<select class="ct-niveau" data-c-niveau="' + id + '" aria-label="Niveau de priorité : ' + echap(nom) + '"><option value="0" selected>–</option>' + [1, 2, 3, 4, 5, 6].map(n => '<option value="' + n + '">' + n + "</option>").join("") + "</select></label>", S[i], 4)).join("") + "</div></section>";
  const R = ["CAS", "GAN", "TOR", "JAM", "OBJ"];
  const mods = '<div class="ct-s-mods">' + NOMS_COURTS.map((nom, i) => {
    const l = [caseMod("g", "Mod général", "vide c1", RAISON), caseMod("a", "Ajustement", "vide c2", RAISON)].concat([0, 1, 2].map(k => caseMod("l" + k, "Mod de " + nom.toLowerCase() + " : à choisir", "vide", "")));
    return '<div class="ct-s-ligne">' + texteRP(nom, "ct-s-nom", 26, 845 + 71 * i, 146, 63) + l.map((x, k) => poser(x, "ARM_" + R[i] + "_" + (k + 1), 4)).join("") + "</div>";
  }).join("") + "</div>";
  const bonus = '<div class="rp-bonus">' + [0, 1].map(i => poser(carreRP("", "", ' data-c="bonus-choisir"', "Choisir un bonus d'ensemble"), "BONUS_" + (i + 1), 4)).join("") + "</div>";
  const armure = '<section class="rp-partie">' + titreRP("Armure", 40, 812) + mods + texteRP("Bonus d'ensemble", "rp-sous", 566, 852, 166, 78) + bonus + "</section>";
  const artefact = '<section class="rp-partie">' + titreRP("Artefact", 40, 1233) + '<div class="rp-ligne">' + poser(carreRP("", "art", ' disabled aria-disabled="true"', "Artefact : ton compte n'est pas encore lu"), "ART_MAIN", 4) +
    [0, 1, 2, 3, 4, 5, 6].map(i => poser('<span class="rp-rond' + (i === 6 ? " ajoute" : "") + '" role="img" aria-label="Atout ' + (i + 1) + '"></span>', "ART_P" + (i + 1), 4)).join("") + "</div></section>";
  const place = (nom, code) => poser(carreRP("", "inactif", ' disabled aria-disabled="true"', nom + " : choisis d'abord la doctrine"), code, 4);
  const doctrine = '<section class="rp-partie">' + titreRP("Doctrine", 40, 1386) + '<div class="rp-ligne">' + texteRP("Doctrine", "rp-et", 26, 1433, 142, 68) +
    poser(carreRP("", "", ' data-rp="doc" aria-expanded="false"', "Choisir la doctrine (classe et élément)"), "DOC_1", 4) + place("Super", "DOC_2") + texteRP("Choisis d'abord la doctrine", "rp-doc-aide", 330, 1433, 440, 68) + "</div>" +
    '<div class="rp-ligne">' + texteRP("Compé\u00adtences", "rp-et", 26, 1510, 142, 70) + ["Compétence de classe", "Saut", "Mêlée", "Grenade"].map((n, i) => place(n, "COMP_" + (i + 1))).join("") + "</div>" +
    '<div class="rp-ligne">' + texteRP("Aspects", "rp-et", 26, 1588, 142, 70) + [0, 1].map(i => place("Aspect " + (i + 1), "ASP_" + (i + 1))).join("") + "</div>" +
    '<div class="rp-ligne rp-frag">' + texteRP("Fragments", "rp-et", 26, 1665, 142, 71) + [1, 2, 3, 4, 5, 6].map(i => poser(carreRP("", "inactif", ' disabled aria-disabled="true"', "Fragment " + i), "FRAG_" + i, 4)).join("") + "</div></section>";
  const enr = '<button type="button" class="bouton rp-ouvrir-carte" data-rp="ouvrir-carte" aria-expanded="false" style="left:' + pc(588, RP_L) + ";top:" + pc(44, RP_H) + ";width:" + pc(206, RP_L) + '">Ouvrir une carte</button>' +
    '<label class="ct-nom rp-nom" style="left:' + pc(130, RP_L) + ";top:" + pc(44, RP_H) + ";width:" + pc(446, RP_L) + '"><span class="rp-cache">Nom du build</span><input type="text" maxlength="40" data-c-nom value="" placeholder="Nom du build" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>' +
    '<p class="ct-enr-msg rp-msg" role="status" style="left:' + pc(24, RP_L) + ";top:" + pc(158, RP_H) + ";width:" + pc(768, RP_L) + '">' + echap(RIEN) + "</p>" +
    '<button type="button" class="bouton plein rp-enregistrer" data-c="enregistrer" disabled style="left:' + pc(28, RP_L) + ";top:calc(" + pc(1849, RP_H) + " - 22px);width:" + pc(272, RP_L) + '">Enregistrer</button>';
  const bas = (x, l) => "left:" + (x / 816 * 100).toFixed(3) + "%;top:calc(" + (1849 / 1927 * 100).toFixed(3) + "% - 22px);width:" + ((l || 236) / 816 * 100).toFixed(3) + "%";
  const ICONE_PLEIN = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const calque = (k, h) => '<div class="rp-calque" data-calque="' + k + '">' + h + "</div>";
  const page = '<header class="rp-tete"><button type="button" class="rp-retour" data-rp="retour" aria-label="Retour">‹ Retour</button>' +
    '<div class="rp-tete-titre"><h2 id="rpTitre">Création de build</h2><span id="rpTemoin" class="rp-temoin" role="status" aria-live="polite" data-etat="vide">Rien à enregistrer</span></div>' +
    '<button type="button" class="rp-plein-ecran" data-rp="plein-ecran" aria-pressed="false" aria-label="Plein écran" title="Plein écran">' + ICONE_PLEIN + "</button></header>" +
    '<div class="rp-boite"><div id="rpCarte" class="ct-suivi rp-carte" aria-label="Ton build"><div class="rp-plateau">' +
    '<img class="rp-logo" src="' + LOGO + '" alt="Le Bunker" width="96" height="96">' +
    calque("decor", decor) + calque("exo", exo) + calque("armes", armes) + calque("stats", stats) + calque("armure", armure) + calque("artefact", artefact) + calque("doctrine", doctrine) +
    '<div id="rpEnr" class="rp-enr">' + enr + '</div><span class="rp-images"><button type="button" class="bouton plein rp-bt-image" data-c="envoyer" style="' + bas(320, 472) + '">Envoyer</button></span></div>' +
    '<div id="rpTiroir" class="rp-tiroir" role="region" aria-label="Choix" hidden></div></div></div>';
  const z = document.getElementById("rapide");
  z.innerHTML = page;
  document.body.classList.add("rapide-ouvert");
})();
