"""Gestion des étudiants — interface graphique Tkinter.

Les fiches restent des dictionnaires Python et sont enregistrées dans des
fichiers JSON, comme dans la version console d'origine.
"""

from __future__ import annotations

import json
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import messagebox, ttk


APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"


class Donnees:
    """Accès aux listes de dictionnaires et aux codes d'accès."""

    def __init__(self) -> None:
        DATA_DIR.mkdir(exist_ok=True)
        self.fichier_etudiants = DATA_DIR / "GESTION.json"
        self.fichier_corbeille = DATA_DIR / "CORBEILLE.json"
        self.fichier_numero = DATA_DIR / "numeromatricul.json"

    @staticmethod
    def _lire_liste(fichier: Path) -> list[dict]:
        try:
            contenu = json.loads(fichier.read_text(encoding="utf-8"))
            return contenu if isinstance(contenu, list) else []
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    @staticmethod
    def _ecrire(fichier: Path, contenu: object) -> None:
        fichier.write_text(
            json.dumps(contenu, indent=4, ensure_ascii=False), encoding="utf-8"
        )

    def etudiants(self) -> list[dict]:
        return self._lire_liste(self.fichier_etudiants)

    def corbeille(self) -> list[dict]:
        return self._lire_liste(self.fichier_corbeille)

    def enregistrer_etudiants(self, etudiants: list[dict]) -> None:
        self._ecrire(self.fichier_etudiants, etudiants)

    def enregistrer_corbeille(self, etudiants: list[dict]) -> None:
        self._ecrire(self.fichier_corbeille, etudiants)

    def prochain_matricule(self) -> str:
        try:
            dernier = int(json.loads(self.fichier_numero.read_text(encoding="utf-8")).get("dernier num", 0))
        except (FileNotFoundError, json.JSONDecodeError, ValueError):
            dernier = 0
        dernier += 1
        self._ecrire(self.fichier_numero, {"dernier num": dernier})
        return f"UNIV~{dernier:03d}"

    def pin(self, role: str) -> str:
        fichier = DATA_DIR / f"Codesecret_{role}.json"
        try:
            return str(json.loads(fichier.read_text(encoding="utf-8")).get("Mot de passe", "1234"))
        except (FileNotFoundError, json.JSONDecodeError):
            return "1234"

    def changer_pin(self, role: str, pin: str) -> None:
        self._ecrire(DATA_DIR / f"Codesecret_{role}.json", {"Mot de passe": pin})


class GestionEtudiants(tk.Tk):
    COULEUR_FOND = "#F4F7FB"
    COULEUR_NUIT = "#14213D"
    COULEUR_PRIMAIRE = "#2563EB"
    COULEUR_TEXTE = "#182230"
    COULEUR_MUTEE = "#64748B"

    colonnes = (
        ("Numero Matricul", "Matricule", 125),
        ("Nom", "Nom", 135),
        ("Post-nom", "Post-nom", 125),
        ("Prenom", "Prénom", 125),
        ("Promotion", "Promotion", 115),
        ("Faculté", "Faculté", 150),
        ("Age", "Âge", 55),
        ("Sexe", "Sexe", 65),
    )

    def __init__(self) -> None:
        super().__init__()
        self.donnees = Donnees()
        self.role: str | None = None
        self.mode_corbeille = False
        self.recherche = tk.StringVar()
        self.title("Campus — Gestion des étudiants")
        self.geometry("1120x720")
        self.minsize(390, 600)
        self.configure(bg=self.COULEUR_FOND)
        self._style()
        self._construire()
        self.afficher_tableau()
        self.bind("<Configure>", self._adapter_ecran)

    def _style(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Treeview", background="white", foreground=self.COULEUR_TEXTE,
                        rowheight=34, fieldbackground="white", font=("Arial", 10))
        style.configure("Treeview.Heading", background="#E8EEF9", foreground=self.COULEUR_NUIT,
                        font=("Arial", 10, "bold"), relief="flat")
        style.map("Treeview", background=[("selected", "#DBEAFE")], foreground=[("selected", self.COULEUR_NUIT)])
        style.configure("TCombobox", padding=7)

    def _construire(self) -> None:
        # En-tête
        entete = tk.Frame(self, bg=self.COULEUR_NUIT, height=84)
        entete.pack(fill="x")
        entete.pack_propagate(False)
        marque = tk.Frame(entete, bg=self.COULEUR_NUIT)
        marque.pack(side="left", padx=(24, 8), pady=12)
        tk.Label(marque, text="CAMPUS", bg=self.COULEUR_NUIT, fg="white",
                 font=("Arial", 20, "bold")).pack(anchor="w")
        tk.Label(marque, text="UNE CRÉATION RODRI DUEL", bg=self.COULEUR_NUIT, fg="#7DD3FC",
                 font=("Arial", 8, "bold")).pack(anchor="w")
        self.sous_titre = tk.Label(entete, text="Gestion des étudiants", bg=self.COULEUR_NUIT,
                                   fg="#B9C7E3", font=("Arial", 11))
        self.sous_titre.pack(side="left", pady=18)
        self.bouton_role = tk.Button(entete, text="Se connecter", command=self.choisir_role,
                                     bg="#3B82F6", fg="white", activebackground="#60A5FA",
                                     activeforeground="white", bd=0, padx=16, pady=9,
                                     font=("Arial", 10, "bold"), cursor="hand2")
        self.bouton_role.pack(side="right", padx=22, pady=19)

        # Navigation adaptable : elle passe en haut sur un écran étroit.
        self.zone = tk.Frame(self, bg=self.COULEUR_FOND)
        self.zone.pack(fill="both", expand=True)
        self.navigation = tk.Frame(self.zone, bg="white", width=194)
        self.navigation.pack(side="left", fill="y")
        self.navigation.pack_propagate(False)
        self.contenu = tk.Frame(self.zone, bg=self.COULEUR_FOND)
        self.contenu.pack(side="left", fill="both", expand=True, padx=22, pady=20)

        self.boutons_nav: list[tk.Button] = []
        self._nav("⌂  Tableau de bord", self.afficher_tableau)
        self._nav("☷  Étudiants", self.afficher_etudiants)
        self._nav("⌕  Rechercher", self.focus_recherche)
        self._nav("♲  Corbeille", self.afficher_corbeille)
        self._nav("⚙  Mot de passe", self.modifier_pin)
        tk.Label(self.navigation, text="Une création RODRI DUEL\nDonnées sécurisées · JSON", bg="white",
                 fg=self.COULEUR_MUTEE, justify="left", font=("Arial", 9)).pack(side="bottom", anchor="w", padx=18, pady=22)

        self.titre = tk.Label(self.contenu, text="", bg=self.COULEUR_FOND, fg=self.COULEUR_TEXTE,
                              font=("Arial", 21, "bold"))
        self.titre.pack(anchor="w")
        self.description = tk.Label(self.contenu, text="", bg=self.COULEUR_FOND, fg=self.COULEUR_MUTEE,
                                    font=("Arial", 10))
        self.description.pack(anchor="w", pady=(3, 18))
        self.corps = tk.Frame(self.contenu, bg=self.COULEUR_FOND)
        self.corps.pack(fill="both", expand=True)

    def _nav(self, texte: str, commande) -> None:
        bouton = tk.Button(self.navigation, text=texte, command=commande, anchor="w", justify="left",
                           bg="white", fg="#334155", activebackground="#E8EEF9", activeforeground=self.COULEUR_PRIMAIRE,
                           bd=0, padx=18, pady=12, font=("Arial", 10), cursor="hand2")
        bouton.pack(fill="x", padx=6, pady=2)
        self.boutons_nav.append(bouton)

    def _vider_corps(self) -> None:
        for enfant in self.corps.winfo_children():
            enfant.destroy()

    def _titre(self, titre: str, description: str) -> None:
        self.titre.config(text=titre)
        self.description.config(text=description)

    def _carte(self, parent: tk.Widget) -> tk.Frame:
        return tk.Frame(parent, bg="white", highlightbackground="#E2E8F0", highlightthickness=1)

    def _bouton(self, parent: tk.Widget, texte: str, commande, secondaire: bool = False) -> tk.Button:
        return tk.Button(parent, text=texte, command=commande,
                         bg="white" if secondaire else self.COULEUR_PRIMAIRE,
                         fg=self.COULEUR_PRIMAIRE if secondaire else "white",
                         activebackground="#DBEAFE" if secondaire else "#1D4ED8",
                         activeforeground=self.COULEUR_PRIMAIRE if secondaire else "white",
                         highlightbackground="#93C5FD" if secondaire else self.COULEUR_PRIMAIRE,
                         highlightthickness=1 if secondaire else 0, bd=0, padx=14, pady=9,
                         font=("Arial", 10, "bold"), cursor="hand2")

    def afficher_tableau(self) -> None:
        self.mode_corbeille = False
        self._vider_corps()
        etudiants, corbeille = self.donnees.etudiants(), self.donnees.corbeille()
        self._titre("Bonjour", "Vue d’ensemble de votre établissement")
        cartes = tk.Frame(self.corps, bg=self.COULEUR_FOND)
        cartes.pack(fill="x")
        for nombre, libelle, couleur in ((len(etudiants), "Étudiants inscrits", "#2563EB"),
                                         (len(corbeille), "Dans la corbeille", "#F59E0B"),
                                         ("ADMIN" if self.role == "admin" else "VISITEUR", "Accès actuel", "#10B981")):
            carte = self._carte(cartes)
            carte.pack(side="left", fill="x", expand=True, padx=(0, 12), pady=(0, 18))
            tk.Label(carte, text=str(nombre), bg="white", fg=couleur, font=("Arial", 25, "bold")).pack(anchor="w", padx=18, pady=(17, 2))
            tk.Label(carte, text=libelle, bg="white", fg=self.COULEUR_MUTEE, font=("Arial", 10)).pack(anchor="w", padx=18, pady=(0, 17))
        bloc = self._carte(self.corps)
        bloc.pack(fill="both", expand=True)
        tk.Label(bloc, text="Gestion claire, en quelques gestes", bg="white", fg=self.COULEUR_NUIT,
                 font=("Arial", 15, "bold")).pack(anchor="w", padx=22, pady=(25, 8))
        tk.Label(bloc, text="Ajoutez une fiche, retrouvez-la instantanément ou gérez les suppressions depuis la corbeille.\n"
                             "Chaque étudiant est conservé sous forme de dictionnaire dans les fichiers JSON.",
                 bg="white", fg=self.COULEUR_MUTEE, justify="left", font=("Arial", 10)).pack(anchor="w", padx=22)
        self._bouton(bloc, "+ Ajouter un étudiant", self.ajouter_etudiant).pack(anchor="w", padx=22, pady=24)

    def afficher_etudiants(self) -> None:
        self.mode_corbeille = False
        self._liste("Étudiants", "Consultez, recherchez et ajoutez les fiches étudiantes.", self.donnees.etudiants())

    def afficher_corbeille(self) -> None:
        self.mode_corbeille = True
        self._liste("Corbeille", "Les fiches supprimées peuvent être restaurées.", self.donnees.corbeille())

    def _liste(self, titre: str, description: str, donnees: list[dict]) -> None:
        self._vider_corps()
        self._titre(titre, description)
        outils = tk.Frame(self.corps, bg=self.COULEUR_FOND)
        outils.pack(fill="x", pady=(0, 12))
        recherche = tk.Entry(outils, textvariable=self.recherche, bg="white", fg=self.COULEUR_TEXTE,
                             relief="solid", bd=1, font=("Arial", 10))
        recherche.insert(0, "")
        recherche.pack(side="left", fill="x", expand=True, ipady=8)
        recherche.bind("<KeyRelease>", lambda _: self._remplir_table())
        self._bouton(outils, "＋ Ajouter", self.ajouter_etudiant).pack(side="right", padx=(10, 0))
        if self.mode_corbeille:
            self._bouton(outils, "Vider", self.vider_corbeille, True).pack(side="right", padx=(10, 0))
        else:
            self._bouton(outils, "Supprimer", self.supprimer_selection, True).pack(side="right", padx=(10, 0))

        cadre = self._carte(self.corps)
        cadre.pack(fill="both", expand=True)
        colonnes = [cle for cle, _, _ in self.colonnes]
        self.table = ttk.Treeview(cadre, columns=colonnes, show="headings", selectmode="browse")
        for cle, etiquette, largeur in self.colonnes:
            self.table.heading(cle, text=etiquette)
            self.table.column(cle, width=largeur, minwidth=50, stretch=True)
        defiler_y = ttk.Scrollbar(cadre, orient="vertical", command=self.table.yview)
        defiler_x = ttk.Scrollbar(cadre, orient="horizontal", command=self.table.xview)
        self.table.configure(yscrollcommand=defiler_y.set, xscrollcommand=defiler_x.set)
        self.table.grid(row=0, column=0, sticky="nsew")
        defiler_y.grid(row=0, column=1, sticky="ns")
        defiler_x.grid(row=1, column=0, sticky="ew")
        cadre.grid_rowconfigure(0, weight=1)
        cadre.grid_columnconfigure(0, weight=1)
        self.table.bind("<Double-1>", lambda _: self.voir_selection())
        self._source_table = donnees
        self._remplir_table()

    def _remplir_table(self) -> None:
        if not hasattr(self, "table") or not self.table.winfo_exists():
            return
        filtre = self.recherche.get().strip().upper()
        self.table.delete(*self.table.get_children())
        for fiche in self._source_table:
            texte = " ".join(str(valeur) for valeur in fiche.values()).upper()
            if not filtre or filtre in texte:
                valeurs = [fiche.get(cle, "") for cle, _, _ in self.colonnes]
                self.table.insert("", "end", iid=fiche["Numero Matricul"], values=valeurs)

    def focus_recherche(self) -> None:
        self.afficher_etudiants()
        for enfant in self.corps.winfo_children():
            for petit in enfant.winfo_children():
                if isinstance(petit, tk.Entry):
                    petit.focus_set()
                    return

    def _selection(self) -> str | None:
        if not hasattr(self, "table") or not self.table.selection():
            messagebox.showinfo("Sélection requise", "Sélectionnez d’abord un étudiant dans la liste.", parent=self)
            return None
        return self.table.selection()[0]

    def voir_selection(self) -> None:
        matricule = self._selection()
        if not matricule:
            return
        fiches = self.donnees.corbeille() if self.mode_corbeille else self.donnees.etudiants()
        fiche = next((e for e in fiches if e["Numero Matricul"] == matricule), None)
        if not fiche:
            return
        fenetre = tk.Toplevel(self)
        fenetre.title("Fiche étudiant")
        fenetre.configure(bg="white")
        fenetre.resizable(False, False)
        tk.Label(fenetre, text="Fiche étudiant", bg="white", fg=self.COULEUR_NUIT, font=("Arial", 16, "bold")).pack(anchor="w", padx=24, pady=(22, 12))
        for cle, valeur in fiche.items():
            ligne = tk.Frame(fenetre, bg="white")
            ligne.pack(fill="x", padx=24, pady=3)
            tk.Label(ligne, text=f"{cle} :", bg="white", fg=self.COULEUR_MUTEE, width=18, anchor="w", font=("Arial", 10, "bold")).pack(side="left")
            tk.Label(ligne, text=str(valeur), bg="white", fg=self.COULEUR_TEXTE, anchor="w", font=("Arial", 10)).pack(side="left")
        if self.mode_corbeille:
            self._bouton(fenetre, "Restaurer", lambda: (self.restaurer_selection(), fenetre.destroy())).pack(pady=20)
        else:
            self._bouton(fenetre, "Fermer", fenetre.destroy, True).pack(pady=20)

    def ajouter_etudiant(self) -> None:
        if self.role != "admin":
            messagebox.showinfo("Accès administration", "Connectez-vous comme ADMIN pour ajouter un étudiant.", parent=self)
            self.choisir_role()
            return
        fenetre = tk.Toplevel(self)
        fenetre.title("Nouvel étudiant")
        fenetre.configure(bg="white")
        fenetre.transient(self)
        fenetre.grab_set()
        fenetre.minsize(360, 520)
        tk.Label(fenetre, text="Nouvel étudiant", bg="white", fg=self.COULEUR_NUIT,
                 font=("Arial", 18, "bold")).pack(anchor="w", padx=26, pady=(24, 4))
        tk.Label(fenetre, text="Les champs seront normalisés en majuscules.", bg="white", fg=self.COULEUR_MUTEE,
                 font=("Arial", 9)).pack(anchor="w", padx=26, pady=(0, 14))
        formulaire = tk.Frame(fenetre, bg="white")
        formulaire.pack(fill="both", expand=True, padx=26)
        champs: dict[str, tk.Widget] = {}
        definitions = (("Nom", "entry"), ("Post-nom", "entry"), ("Prenom", "entry"), ("Promotion", "entry"),
                       ("Faculté", "entry"), ("Age", "entry"), ("Sexe", "combo"), ("Nationalité", "entry"))
        for ligne, (nom, type_champ) in enumerate(definitions):
            tk.Label(formulaire, text=nom, bg="white", fg=self.COULEUR_TEXTE, font=("Arial", 10, "bold")).grid(row=ligne, column=0, sticky="w", pady=5)
            if type_champ == "combo":
                champ: tk.Widget = ttk.Combobox(formulaire, values=("M", "F"), state="readonly", width=24)
            else:
                champ = tk.Entry(formulaire, bg="white", relief="solid", bd=1, width=27, font=("Arial", 10))
            champ.grid(row=ligne, column=1, sticky="ew", pady=5, padx=(14, 0), ipady=5)
            champs[nom] = champ
        formulaire.grid_columnconfigure(1, weight=1)

        def enregistrer() -> None:
            valeurs = {nom: widget.get().strip().upper() for nom, widget in champs.items()}  # type: ignore[attr-defined]
            if any(not valeur for valeur in valeurs.values()):
                messagebox.showwarning("Champ manquant", "Complétez tous les champs.", parent=fenetre)
                return
            try:
                age = int(valeurs["Age"])
            except ValueError:
                messagebox.showwarning("Âge invalide", "L’âge doit être composé de chiffres.", parent=fenetre)
                return
            if not 18 <= age <= 30:
                messagebox.showwarning("Âge non autorisé", "L’âge doit être compris entre 18 et 30 ans.", parent=fenetre)
                return
            fiches = self.donnees.etudiants()
            fiche = {"Numero Matricul": self.donnees.prochain_matricule(), "Nom": valeurs["Nom"],
                     "Post-nom": valeurs["Post-nom"], "Prenom": valeurs["Prenom"],
                     "Promotion": valeurs["Promotion"], "Faculté": valeurs["Faculté"], "Age": age,
                     "Sexe": valeurs["Sexe"], "Nationalité": valeurs["Nationalité"],
                     "Heure & Date": datetime.now().strftime("%d/%m/%Y %H:%M:%S")}
            # Un dictionnaire est unique selon l'identité, indépendamment de son matricule.
            identite = (fiche["Nom"], fiche["Post-nom"], fiche["Prenom"], fiche["Promotion"])
            if any((e.get("Nom"), e.get("Post-nom"), e.get("Prenom"), e.get("Promotion")) == identite for e in fiches):
                messagebox.showwarning("Étudiant existant", "Cette fiche existe déjà.", parent=fenetre)
                return
            fiches.append(fiche)
            self.donnees.enregistrer_etudiants(fiches)
            messagebox.showinfo("Enregistrement réussi", f"{fiche['Nom']} est enregistré sous {fiche['Numero Matricul']}.", parent=fenetre)
            fenetre.destroy()
            self.actualiser()
            self.afficher_etudiants()

        actions = tk.Frame(fenetre, bg="white")
        actions.pack(fill="x", padx=26, pady=22)
        self._bouton(actions, "Annuler", fenetre.destroy, True).pack(side="right")
        self._bouton(actions, "Enregistrer", enregistrer).pack(side="right", padx=(0, 10))

    def supprimer_selection(self) -> None:
        if self.role != "serveur":
            messagebox.showinfo("Accès serveur", "Connectez-vous comme SERVEUR pour supprimer une fiche.", parent=self)
            self.choisir_role()
            return
        matricule = self._selection()
        if not matricule or not messagebox.askyesno("Confirmer", f"Envoyer {matricule} dans la corbeille ?", parent=self):
            return
        etudiants = self.donnees.etudiants()
        fiche = next(e for e in etudiants if e["Numero Matricul"] == matricule)
        etudiants.remove(fiche)
        corbeille = self.donnees.corbeille()
        corbeille.append(fiche)
        self.donnees.enregistrer_etudiants(etudiants)
        self.donnees.enregistrer_corbeille(corbeille)
        self.actualiser()
        self.afficher_etudiants()

    def restaurer_selection(self) -> None:
        if self.role != "serveur":
            messagebox.showinfo("Accès serveur", "Connectez-vous comme SERVEUR pour restaurer une fiche.", parent=self)
            self.choisir_role()
            return
        matricule = self._selection()
        if not matricule:
            return
        corbeille, etudiants = self.donnees.corbeille(), self.donnees.etudiants()
        fiche = next(e for e in corbeille if e["Numero Matricul"] == matricule)
        corbeille.remove(fiche)
        etudiants.append(fiche)
        self.donnees.enregistrer_corbeille(corbeille)
        self.donnees.enregistrer_etudiants(etudiants)
        self.actualiser()
        self.afficher_corbeille()

    def vider_corbeille(self) -> None:
        if self.role != "serveur":
            messagebox.showinfo("Accès serveur", "Connectez-vous comme SERVEUR pour vider la corbeille.", parent=self)
            self.choisir_role()
            return
        if messagebox.askyesno("Vider la corbeille", "Cette action est définitive. Continuer ?", parent=self):
            self.donnees.enregistrer_corbeille([])
            self.actualiser()
            self.afficher_corbeille()

    def choisir_role(self) -> None:
        fenetre = tk.Toplevel(self)
        fenetre.title("Connexion")
        fenetre.configure(bg="white")
        fenetre.transient(self)
        fenetre.grab_set()
        tk.Label(fenetre, text="Connexion", bg="white", fg=self.COULEUR_NUIT, font=("Arial", 17, "bold")).pack(padx=30, pady=(24, 8))
        tk.Label(fenetre, text="Choisissez votre rôle puis saisissez votre code.", bg="white", fg=self.COULEUR_MUTEE).pack(padx=30)
        role = tk.StringVar(value="admin")
        choix = tk.Frame(fenetre, bg="white")
        choix.pack(pady=(16, 8))
        ttk.Radiobutton(choix, text="Administration", variable=role, value="admin").pack(side="left", padx=8)
        ttk.Radiobutton(choix, text="Serveur", variable=role, value="serveur").pack(side="left", padx=8)
        code = tk.Entry(fenetre, show="●", justify="center", font=("Arial", 14), width=16)
        code.pack(pady=8, ipady=6)
        code.focus_set()
        def valider(*_) -> None:
            if code.get() != self.donnees.pin(role.get()):
                messagebox.showerror("Code incorrect", "Le code saisi est incorrect.", parent=fenetre)
                code.delete(0, "end")
                return
            self.role = role.get()
            self.bouton_role.config(text=f"{self.role.upper()} ▾")
            fenetre.destroy()
            self.actualiser()
        self._bouton(fenetre, "Continuer", valider).pack(pady=(7, 24))
        code.bind("<Return>", valider)

    def modifier_pin(self) -> None:
        if not self.role:
            self.choisir_role()
            return
        fenetre = tk.Toplevel(self)
        fenetre.title("Modifier le code")
        fenetre.configure(bg="white")
        fenetre.transient(self)
        fenetre.grab_set()
        tk.Label(fenetre, text=f"Code {self.role.upper()}", bg="white", fg=self.COULEUR_NUIT, font=("Arial", 16, "bold")).pack(padx=26, pady=(22, 12))
        champs = []
        for texte in ("Code actuel", "Nouveau code", "Confirmer le code"):
            tk.Label(fenetre, text=texte, bg="white", anchor="w").pack(fill="x", padx=26)
            champ = tk.Entry(fenetre, show="●", width=27)
            champ.pack(padx=26, pady=(2, 10), ipady=6)
            champs.append(champ)
        def sauver() -> None:
            ancien, nouveau, confirmation = (champ.get().strip() for champ in champs)
            if ancien != self.donnees.pin(self.role):
                messagebox.showerror("Erreur", "Le code actuel est incorrect.", parent=fenetre)
            elif not nouveau or nouveau != confirmation:
                messagebox.showerror("Erreur", "Les nouveaux codes ne correspondent pas.", parent=fenetre)
            else:
                self.donnees.changer_pin(self.role, nouveau)
                messagebox.showinfo("Code modifié", "Votre code a été mis à jour.", parent=fenetre)
                fenetre.destroy()
        self._bouton(fenetre, "Enregistrer", sauver).pack(pady=(4, 24))

    def actualiser(self) -> None:
        # Actualise seulement l'écran visible, sans perdre la navigation.
        if self.mode_corbeille:
            self.afficher_corbeille()

    def _adapter_ecran(self, event) -> None:
        if event.widget is not self:
            return
        etroit = self.winfo_width() < 680
        if etroit and self.navigation.winfo_manager() == "pack" and self.navigation.pack_info().get("side") == "left":
            self.navigation.pack_forget()
            self.navigation.pack(side="top", fill="x", before=self.contenu)
            for bouton in self.boutons_nav:
                bouton.pack_configure(side="left", fill="x", expand=True, padx=1, pady=4)
                bouton.config(text=button_short(bouton.cget("text")))
            self.sous_titre.pack_forget()
        elif not etroit and self.navigation.winfo_manager() == "pack" and self.navigation.pack_info().get("side") == "top":
            self.navigation.pack_forget()
            self.navigation.pack(side="left", fill="y", before=self.contenu)
            for bouton, texte in zip(self.boutons_nav, ("⌂  Tableau de bord", "☷  Étudiants", "⌕  Rechercher", "♲  Corbeille", "⚙  Mot de passe")):
                bouton.pack_configure(side="top", fill="x", expand=False, padx=6, pady=2)
                bouton.config(text=texte)
            self.sous_titre.pack(side="left", pady=18)


def button_short(texte: str) -> str:
    """Libellés lisibles quand la barre devient horizontale sur téléphone."""
    return texte.split()[0]


if __name__ == "__main__":
    GestionEtudiants().mainloop()
