  //  1. Sélection des éléments
  
  
const modale = document.querySelector("#modale");
const ouvrir = document.querySelector("#ouvrir");
const fermer = document.querySelector("#fermer");
const annuler = document.querySelector("#annuler");

const form = document.querySelector("#formulaire");
const nomInput = document.querySelector("#nom");
const posteContainer = document.querySelector("#check");
const numeroInput = document.querySelector("#numero");

const messageNom = document.querySelector("#valide");
const messagePoste = document.querySelector("#poste-message");
const messageNumero = document.querySelector("#numero-message");
const message = document.querySelector("#message");

const joueursContainer = document.querySelector("#joueurs-container");
const compteur = document.querySelector("#compteur");

let joueurs = [];
let joueurAModifier = null;
let timerMessage;


function CompteurPlayer() {
  compteur.textContent = joueurs.length + " joueurs";
}


 //  messages de succès / d'erreur (3 s)


function messageshow(texte, type = "erreur") {
  message.textContent = texte;

  message.className =
    type === "erreur"
      ? "mt-3 text-sm text-red-500"
      : "mt-3 text-sm text-green-500";

  clearTimeout(timerMessage);

  timerMessage = setTimeout(function () {
    message.textContent = "";
  }, 3000);
}


// 2. Ouvrir et fermer la modale

ouvrir.addEventListener("click", function () {
  form.reset();

  joueurAModifier = null;

  messageNom.textContent = "";
  messagePoste.textContent = "";
  messageNumero.textContent = "";

  modale.classList.remove("hidden");
  modale.classList.add("flex");
});

function fermerModale() {
  modale.classList.add("hidden");
  modale.classList.remove("flex");
}

fermer.addEventListener("click", fermerModale);
annuler.addEventListener("click", fermerModale);


// 3. Validation du nom

const regexNom = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,30}$/;

function validateNom() {
  const nom = nomInput.value.trim();

  if (nom === "") {
    messageNom.textContent = "Le nom est obligatoire.";
    messageNom.className = "mt-2 text-sm text-red-400";
    return false;
  }

  if (!regexNom.test(nom)) {
    messageNom.textContent =
      "Le nom doit contenir 3 à 30 caractères valides.";
    messageNom.className = "mt-2 text-sm text-red-400";
    return false;
  }

  messageNom.textContent = "";
  return true;
}

nomInput.addEventListener("input", validateNom);


// 4. Validation du poste avec Event Delegation


function validatePoste() {
  const posteChoisi = posteContainer.querySelector(
    'input[type="radio"]:checked'
  );

  if (!posteChoisi) {
    messagePoste.textContent = "Veuillez choisir un poste.";
    messagePoste.className = "mt-2 text-sm text-red-400";
    return false;
  }

  messagePoste.textContent = "";
  return true;
}

posteContainer.addEventListener("change", function (event) {
  if (event.target.matches('input[type="radio"]')) {
    validatePoste();
  }
});

// 5.numéro obligatoire de 1 à 99 et unique :


function valideNumber() {
  const valeur = numeroInput.value.trim();
  const numero = Number(valeur);

  if (
    valeur === "" ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 99
  ) {
    messageNumero.textContent =
      "Le numéro doit être un entier entre 1 et 99.";
    messageNumero.className = "mt-2 text-sm text-red-400";
    return false;
  }

  const numeroExiste = joueurs.some(function (joueur) {
    return (
      joueur.numero === numero &&
      joueur !== joueurAModifier
    );
  });

  if (numeroExiste) {
    messageNumero.textContent = "Ce numéro est déjà utilisé.";
    messageNumero.className = "mt-2 text-sm text-red-400";
    return false;
  }

  messageNumero.textContent = "";
  return true;
}

numeroInput.addEventListener("input", valideNumber);

// 6. affichage et ajout des players:

//  COULEURS DES CARTES SELON LE POSTE


function carteColoree(poste) {
  if (poste === "Gardien") {
    return "border-l-4 border-amber-400 bg-amber-400/10";
  }

  if (poste === "Défenseur") {
    return "border-l-4 border-blue-400 bg-blue-400/10";
  }

  if (poste === "Milieu") {
    return "border-l-4 border-green-400 bg-green-400/10";
  }

  return "border-l-4 border-red-400 bg-red-400/10";
}


const optionsPositions = [
  { value: "banc", nom: "Sur le banc" },
  { value: "gb", nom: "GB - Gardien" },
  { value: "dg", nom: "DG - Défenseur gauche" },
  { value: "dc1", nom: "DC - Défenseur central 1" },
  { value: "dc2", nom: "DC - Défenseur central 2" },
  { value: "dd", nom: "DD - Défenseur droit" },
  { value: "mg", nom: "MG - Milieu gauche" },
  { value: "mc1", nom: "MC - Milieu central 1" },
  { value: "mc2", nom: "MC - Milieu central 2" },
  { value: "md", nom: "MD - Milieu droit" },
  { value: "bu1", nom: "BU - Buteur 1" },
  { value: "bu2", nom: "BU - Buteur 2" }
];



function afficherJoueur(joueur) {
  const carte = document.createElement("div");



carte.className =
  "rounded-xl p-3 " +"w-[260px] shrink-0 " +"flex flex-col gap-3 break-words " +
  carteColoree(joueur.poste);


  carte.dataset.numero = joueur.numero;

  const contenu = document.createElement("div");
contenu.className =
  "flex items-center gap-3 min-w-0";

  const numero = document.createElement("span");

  numero.className =
    "rounded-full border border-red-500 h-9 w-9 flex items-center justify-center";

  numero.textContent = joueur.numero;

  const informations = document.createElement("div");
  informations.className = "flex-1";

  const nom = document.createElement("h3");
  nom.textContent = joueur.nom;

  const poste = document.createElement("p");
  poste.className = "text-orange-400 text-sm";
  poste.textContent = joueur.poste;

  informations.append(nom, poste);

  const selectPosition = document.createElement("select");

  selectPosition.className =
    "mt-3 w-full rounded-md border border-slate-500 bg-slate-700 p-2 text-sm text-white";

  optionsPositions.forEach(function (optionJoueur) {
    const option = document.createElement("option");

    option.value = optionJoueur.value;
    option.textContent = optionJoueur.nom;

    selectPosition.append(option);
  });

  selectPosition.value = joueur.position || "banc";

  const btnModifier = document.createElement("button");

  btnModifier.type = "button";
  btnModifier.textContent = "✏️ Modifier";
  btnModifier.className = "modifier";

  const btnSupprimer = document.createElement("button");

  btnSupprimer.type = "button";
  btnSupprimer.textContent = "🗑️";
  btnSupprimer.className = "supprimer";
  btnSupprimer.setAttribute("aria-label", "Supprimer");

  contenu.append(
    numero,
    informations,
    btnModifier,
    btnSupprimer
  );

  carte.append(contenu, selectPosition);

  joueursContainer.append(carte);
}


// Liberer :

function libre(joueur) {
  if (!joueur.position || joueur.position === "banc") {
    return;
  }

  const ancienneCase = document.querySelector(
    ".containir ." + joueur.position
  );

  if (
    ancienneCase &&
    ancienneCase.dataset.numero === String(joueur.numero)
  ) {
    delete ancienneCase.dataset.numero;

    const statut = ancienneCase.querySelector("p");

    if (statut) {
      statut.textContent = "Libre";
    }
  }
}


// --- Ajout ou modifier un joururs :

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const nomValide = validateNom();
  const posteValide = validatePoste();
  const numeroValide = valideNumber();

  if (!nomValide || !posteValide || !numeroValide) {
    return;
  }

  const posteSelectionne = posteContainer.querySelector(
    'input[type="radio"]:checked'
  );

  const nouveauJoueur = {
    nom: nomInput.value.trim(),
    numero: Number(numeroInput.value),
    poste: posteSelectionne.value,
    position: "banc"
  };

  if (joueurAModifier) {
    const ancienNumero = joueurAModifier.numero;
    const anciennePosition = joueurAModifier.position;
    const ancienPoste = joueurAModifier.poste;

    // Si le poste change, le joueur retourne au banc
    if (ancienPoste !== nouveauJoueur.poste) {
      libre(joueurAModifier);
      joueurAModifier.position = "banc";
    } else if (anciennePosition !== "banc") {
      // Le poste ne change pas : conserver la position
      const caseTerrain = document.querySelector(
        ".containir ." + anciennePosition
      );

      if (
        caseTerrain &&
        caseTerrain.dataset.numero === String(ancienNumero)
      ) {
        // Mettre à jour le numéro sur le terrain
        caseTerrain.dataset.numero = String(nouveauJoueur.numero);

        const statut = caseTerrain.querySelector("p");

        if (statut) {
          statut.textContent = nouveauJoueur.nom;
        }
      }
    }

    joueurAModifier.nom = nouveauJoueur.nom;
    joueurAModifier.numero = nouveauJoueur.numero;
    joueurAModifier.poste = nouveauJoueur.poste;

    // Reconstruire les cartes
    joueursContainer.innerHTML = "";

    joueurs.forEach(function (joueur) {
      afficherJoueur(joueur);
    });

    joueurAModifier = null;

    CompteurPlayer();

    messageshow("Joueur modifié avec succès !", "succes");

  } else {
    joueurs.push(nouveauJoueur);

    afficherJoueur(nouveauJoueur);

    CompteurPlayer();

    messageshow("Joueur ajouté avec succès !", "succes");
  }
  refreshLocalStorage();
  form.reset();

  messageNom.textContent = "";
  messagePoste.textContent = "";
  messageNumero.textContent = "";

  fermerModale();
});


//7. Suppression :

joueursContainer.addEventListener("click", function (event) {
  const btn = event.target.closest(".supprimer");

  if (!btn || !joueursContainer.contains(btn)) {
    return;
  }

  const carte = btn.closest("[data-numero]");

  if (!carte) {
    return;
  }

  const numero = Number(carte.dataset.numero);

  const index = joueurs.findIndex(function (joueur) {
    return joueur.numero === numero;
  });

  if (index === -1) {
    return;
  }

  const confirmation = confirm(
    "Voulez-vous supprimer ce joueur ?"
  );

  if (!confirmation) {
    return;
  }

  const joueur = joueurs[index];

  libre(joueur);

  joueurs.splice(index, 1);
  carte.remove();

  CompteurPlayer();
   refreshLocalStorage();

  messageshow("Joueur supprimé avec succès !", "succes");
});


// Modification :

joueursContainer.addEventListener("click", function (event) {
  const btn = event.target.closest(".modifier");

  if (!btn || !joueursContainer.contains(btn)) {
    return;
  }

  const carte = btn.closest("[data-numero]");

  if (!carte) {
    return;
  }

  const numero = Number(carte.dataset.numero);

  const joueur = joueurs.find(function (j) {
    return j.numero === numero;
  });

  if (!joueur) {
    return;
  }

  joueurAModifier = joueur;

  nomInput.value = joueur.nom;
  numeroInput.value = joueur.numero;

  const posteInput = posteContainer.querySelector(
    `input[name="poste"][value="${joueur.poste}"]`
  );

  if (posteInput) {
    posteInput.checked = true;
  }

  messageNom.textContent = "";
  messagePoste.textContent = "";
  messageNumero.textContent = "";

  modale.classList.remove("hidden");
  modale.classList.add("flex");
});


// 9.assigner un joueur à une position avec un select sur sa carte :

const position_player = {
  gb: "Gardien",
  dg: "Défenseur",
  dc1: "Défenseur",
  dc2: "Défenseur",
  dd: "Défenseur",
  mg: "Milieu",
  mc1: "Milieu",
  mc2: "Milieu",
  md: "Milieu",
  bu1: "Attaquant",
  bu2: "Attaquant"
};


joueursContainer.addEventListener("change", function (event) {
  if (!event.target.matches("select")) {
    return;
  }

  const select = event.target;
  const carte = select.closest("[data-numero]");

  if (!carte) {
    return;
  }

  const numero = Number(carte.dataset.numero);

  const joueur = joueurs.find(function (j) {
    return j.numero === numero;
  });

  if (!joueur) {
    return;
  }

  const nouvellePosition = select.value;

  if (nouvellePosition === "banc") {
    libre(joueur);

    joueur.position = "banc";
    refreshLocalStorage();

    messageshow(
      joueur.nom + " est retourné sur le banc.",
      "succes"
    );

    return;
  }

  if (position_player[nouvellePosition] !== joueur.poste) {
    messageshow(
      "Ce joueur ne correspond pas à cette position !"
    );

    select.value = joueur.position || "banc";
    return;
  }

  const caseTerrain = document.querySelector(
    ".containir ." + nouvellePosition
  );

  if (!caseTerrain) {
    messageshow("Position introuvable !");

    select.value = joueur.position || "banc";
    return;
  }

  if (
    caseTerrain.dataset.numero &&
    caseTerrain.dataset.numero !== String(joueur.numero)
  ) {
    messageshow("Cette position est déjà occupée !");

    select.value = joueur.position || "banc";
    return;
  }

  libre(joueur);

  caseTerrain.dataset.numero = String(joueur.numero);

  const statut = caseTerrain.querySelector("p");

  if (statut) {
    statut.textContent = joueur.nom;
  }

  joueur.position = nouvellePosition;
  refreshLocalStorage();

  messageshow(
    joueur.nom + " a été assigné à cette position.",
    "succes"
  );
});

CompteurPlayer();


// 10. localStorage

const key = "tachkila";
function refresh() {
  const rs = localStorage.getItem(key);
  joueurs = rs ? JSON.parse(rs) : [];
}

refresh();
function refreshLocalStorage() {
  localStorage.setItem(key, JSON.stringify(joueurs));
}

joueursContainer.innerHTML = "";

joueurs.forEach(function (joueur) {
  afficherJoueur(joueur);

  if (joueur.position && joueur.position !== "banc") {
    const caseTerrain = document.querySelector(".containir ." + joueur.position);

    if (caseTerrain && !caseTerrain.dataset.numero) {
      caseTerrain.dataset.numero = String(joueur.numero);

      const statut = caseTerrain.querySelector("p");

      if (statut) {
        statut.textContent = joueur.nom;
      }
    } else {
      joueur.position = "banc";
    }
  }
});

CompteurPlayer();
refreshLocalStorage();
