/* AimRoutine Tracker - Interactive Insights Learning (demo-only).
  No Riot API calls, no real players, no external requests or storage. */
(function(){
  'use strict';
  const root=document.querySelector('#insights');
  const dashboard=root?.querySelector('.ti-dashboard');
  if(!root||!dashboard)return;
  const lang=()=>document.documentElement.lang==='fr'?'fr':'en';
  const panels=['overview','precision','consistency'];
  const tr=(fr,en)=>lang()==='fr'?fr:en;
  const L={
    fr:{title:'Comprendre le tableau de bord',intro:'Clique sur une carte, une barre, une courbe, un exercice ou un jour pour comprendre ce qui s’affiche.',tour:'Démarrer la visite guidée',guide:'Guide interactif',profile:'Profil fictif',free:'Découverte',balanced:'Régulier',advanced:'Avancé',reset:'Réinitialiser',close:'Fermer les explications',prev:'Précédent',next:'Suivant',end:'Terminer',step:'Étape',fiction:'Toutes les données sont simulées. Aucun compte ni API Riot n’est utilisé.',glossary:'Guide de lecture complet : que représente chaque élément ?',select:'Choisir un profil fictif',day:'Jour',week:'Semaine',rest:'Repos',light:'Activité légère',moderate:'Activité modérée',high:'Activité soutenue',session:'Séance fictive',index:'indice relatif fictif',click:'Sélectionner pour comprendre',chartDay:'Point de courbe',tip:'Conseil d’entraînement'},
    en:{title:'Understand the dashboard',intro:'Select a metric, bar, chart point, exercise or activity day to learn what it means.',tour:'Start guided tour',guide:'Interactive guide',profile:'Sample profile',free:'Getting started',balanced:'Regular',advanced:'Advanced',reset:'Reset',close:'Close explanations',prev:'Back',next:'Next',end:'Finish',step:'Step',fiction:'All data is simulated. No account or Riot API is used.',glossary:'Complete reading guide: what does everything mean?',select:'Select a fictional profile',day:'Day',week:'Week',rest:'Rest',light:'Light activity',moderate:'Moderate activity',high:'High activity',session:'Fictional session',index:'illustrative relative index',click:'Select to learn more',chartDay:'Chart point',tip:'Training suggestion'}
  };
  const text=(key)=>L[lang()][key];
  const help={
    intro:{fr:['Une maquette, pas un vrai compte','Ce tableau de bord illustre les fonctionnalités envisagées pour AimRoutine Tracker. Les valeurs, tendances, profils et jours d’activité sont inventés. Tu peux tout explorer sans connexion, sans enregistrer de données et sans accéder à Riot.','Les résultats ne prédisent pas tes performances réelles dans VALORANT.'],en:['A prototype, not a live account','This dashboard illustrates planned AimRoutine Tracker features. Values, trends, profiles and activity days are invented. You can explore everything without logging in, storing player data or accessing Riot.','These examples cannot predict your real VALORANT performance.']},
    profile:{fr:['Le profil d’entraînement','Dans le vrai produit, cet espace décrirait la personne qui s’entraîne, ses objectifs, ses logiciels et éventuellement son rang. Ici, ce profil est fictif et ne représente aucun utilisateur réel.','Change « Profil fictif » pour comparer trois scénarios inventés.'],en:['Training profile','In the planned product this area would describe the player’s goals, available trainers and possibly rank. Here it is not a real user profile.','Change the sample profile to compare three invented scenarios.']},
    nav:{fr:['Les rubriques de navigation','Les entrées à gauche illustrent les futures pages : vue générale, routines AIM, performances et historique. Dans cette maquette, les trois onglets du tableau sont les seuls écrans détaillés interactifs.','La barre latérale est masquée sur mobile pour garder les graphiques lisibles.'],en:['Navigation sections','The left sidebar previews future pages: overview, aim routines, performance and history. In this demo, the three analytics tabs are the interactive detailed views.','The sidebar is hidden on mobile to keep charts readable.']},
    tabs:{fr:['Les trois onglets','Vue d’ensemble : volume d’entraînement et tendances. Précision : clics et résultats comparables. Régularité : répétition, pauses et habitudes. Chaque onglet propose ses propres chiffres fictifs.','Tu peux changer d’onglet avec les boutons ou les flèches du clavier.'],en:['The three tabs','Overview: training volume and trends. Precision: clicking and comparable results. Consistency: repetition, breaks and habits. Each tab contains its own fictional figures.','Change tabs with the buttons or keyboard arrow keys.']},
    riot:{fr:['Pourquoi « Riot non connecté » ?','Cette démonstration fonctionne exclusivement avec des données inventées. L’accès à l’historique officiel des parties dépend de l’approbation Riot, de Riot Sign On, d’un backend sécurisé et du consentement du joueur.','Aucune statistique VALORANT réelle n’est récupérée ici.'],en:['Why is Riot not connected?','This demo uses invented data only. Official match history requires Riot approval, Riot Sign On, a secure backend and player consent.','No real VALORANT stats are retrieved here.']},
    'overview-intro':{fr:['Vue d’ensemble','Elle regroupe les statistiques les plus utiles pour voir la quantité d’entraînement et la direction générale des progrès. Les compteurs ne doivent pas être confondus avec un niveau réel de visée.','Tous les chiffres sont fictifs.'],en:['Overview','This view groups useful indicators to assess training volume and broad trends. These counters are not a real skill rating.','All values are fictional.']},
    'precision-intro':{fr:['Précision et clicking','Le clicking concerne le contrôle du viseur au moment où tu tires, sur des cibles statiques ou mobiles. On compare seulement les essais effectués avec le même scénario et les mêmes réglages.','86 % de précision dans un scénario ne veut pas dire 86 % de headshots sur VALORANT.'],en:['Precision and clicking','Clicking concerns mouse accuracy when firing at static or moving targets. Compare only runs using the same scenario and settings.','86% precision in a trainer does not mean 86% headshots in VALORANT.']},
    'consistency-intro':{fr:['Régularité','Les valeurs illustrent la constance des entraînements : séances répétées, pauses et résultats moins variables. Une seule séance exceptionnelle ne suffit pas à prouver un progrès.','Un score de régularité serait un indice défini dans l’application, pas une donnée officielle Riot.'],en:['Consistency','These indicators illustrate repeated practice, breaks and less variable results. A single excellent run does not prove improvement.','A consistency score would be an app-defined index, not an official Riot measurement.']},
    'overview-metric-0':{fr:['Séances réalisées','Nombre total de séances terminées sur la période choisie. Une séance correspond à un entraînement enregistré et non à une partie de VALORANT.','La période réelle devrait être affichée dans le produit final.'],en:['Completed sessions','Total number of finished training sessions in the chosen period. A session means an aim-training block, not a VALORANT match.','The released app should clearly show the period.']},
    'overview-metric-1':{fr:['Temps d’entraînement','Temps cumulé passé à réaliser les exercices. Ce n’est pas le temps passé en partie et les pauses peuvent être distinguées selon les réglages.','Plus de temps ne garantit pas forcément de meilleurs résultats.'],en:['Training time','Accumulated minutes spent running drills. It is not in-game play time and breaks may be accounted for separately.','More practice time does not guarantee better results.']},
    'overview-metric-2':{fr:['Jours d’entraînement','Nombre de jours distincts avec au moins une séance enregistrée. Plusieurs séances le même jour ne comptent que pour un jour.','La régularité doit rester compatible avec des périodes de repos.'],en:['Training days','Number of distinct days with at least one logged session. Several sessions on the same day count as one training day.','Consistency should still include rest days.']},
    'overview-metric-3':{fr:['Routine personnelle','Durée illustrative du modèle de routine sélectionné, ici trente minutes. Ce compteur décrit une séance type, pas une performance.','Chaque joueur pourrait définir une durée différente.'],en:['Personal routine','Illustrative duration of the selected routine template: here, thirty minutes. It describes a planned workout, not a performance score.','Users could configure their own duration.']},
    'precision-metric-0':{fr:['Précision fictive','Pourcentage de tirs réussis selon la définition d’un scénario d’aim trainer. Le calcul exact varie selon le logiciel et le type de cible.','À ne pas confondre avec le taux de headshots VALORANT.'],en:['Sample accuracy','Percentage of successful shots according to an aim trainer scenario. The precise calculation varies by software and target type.','This is not VALORANT headshot percentage.']},
    'precision-metric-1':{fr:['Score médian','La médiane est la valeur centrale d’une série de tentatives triées. Elle est moins influencée qu’une moyenne par un record inhabituel.','Comparer le même exercice et les mêmes paramètres seulement.'],en:['Median score','The median is the middle result after sorting your attempts. It is less distorted by an unusually high record than an average.','Compare only the same scenario and settings.']},
    'precision-metric-2':{fr:['Nombre de tentatives','Combien de passages comparables ont été effectués sur un scénario. Plus d’observations donnent du contexte, mais ne rendent pas automatiquement le résultat meilleur.','Un essai correspond à une répétition du scénario.'],en:['Attempts','How many comparable runs were made for a scenario. More observations provide context but do not make performance inherently better.','An attempt means one run of the scenario.']},
    'precision-metric-3':{fr:['Tirs contrôlés','Nombre fictif de tirs effectués dans des exercices où le placement du viseur et le timing priment sur la vitesse brute.','Le logiciel devra préciser la source de ce décompte.'],en:['Controlled clicks','Invented number of clicks in drills where crosshair placement and timing matter more than raw speed.','The actual app should identify the metric source.']},
    'consistency-metric-0':{fr:['Indice de régularité','Indice fictif sur cent illustrant la stabilité des résultats entre plusieurs essais. Ce n’est ni un MMR ni un score officiel Riot.','Le calcul devrait être expliqué et documenté dans l’application réelle.'],en:['Consistency index','Fictional 0–100 index illustrating result stability across repeated runs. It is neither MMR nor an official Riot score.','The released app should explain its calculation.']},
    'consistency-metric-1':{fr:['Jours pratiqués','Nombre de jours avec de l’entraînement pendant la période fictive, sans compter plusieurs fois une même journée.','À lire avec la récupération et la durée des séances.'],en:['Practice days','Number of days with practice in the fictional period, counting each calendar day once.','Interpret alongside recovery and session duration.']},
    'consistency-metric-2':{fr:['Essais répétés','Nombre de passages réalisés sous des conditions comparables pour évaluer la stabilité d’une compétence.','Les mêmes réglages et versions de scénario sont nécessaires.'],en:['Repeated runs','Number of comparable scenario runs used to assess stability of a skill.','Scenario version and settings must match.']},
    'consistency-metric-3':{fr:['Séances de repos','Nombre de jours ou séances réservés à la récupération dans cet exemple. Un entraînement durable n’exige pas de jouer tous les jours.','Le repos fait partie d’une progression raisonnable.'],en:['Rest sessions','Example count of recovery days or sessions. Sustainable improvement does not require playing every day.','Rest is part of sensible practice.']},
    'overview-chart':{fr:['La courbe de progression','Chaque point S1 à S8 représente une séance fictive dans l’ordre chronologique. L’axe vertical illustre un indice relatif normalisé, et non des FPS, un pourcentage de headshots ou un rang.','Sélectionne un point pour voir sa valeur et sa variation par rapport au précédent.'],en:['Training trend chart','Each point S1 through S8 represents a fictional session in chronological order. The vertical axis illustrates a normalized relative index, not FPS, headshot percentage or rank.','Select a point to see its value and change from the previous session.']},
    'precision-chart':{fr:['La courbe de précision','Chaque point représente un essai fictif comparable. Une tendance peut être intéressante seulement si les mêmes scénarios, cibles et réglages sont utilisés.','La progression dessinée ici est entièrement simulée.'],en:['Precision trend','Each point is a fictional comparable run. Trends are meaningful only when scenario, targets and settings match.','The upward trajectory shown here is entirely simulated.']},
    'consistency-chart':{fr:['La courbe de régularité','La courbe illustre comment un indice fictif de stabilité pourrait évoluer sur plusieurs séances. Des variations sont normales et n’indiquent pas forcément un problème.','Une tendance durable compte davantage qu’un point isolé.'],en:['Consistency trend','This chart shows how a fictional stability index might change across sessions. Variation is normal and does not always indicate a problem.','A sustained trend matters more than one point.']},
    'overview-bars':{fr:['Compétences et barres','Les barres représentent des indices normalisés fictifs entre 0 et 100 pour trois catégories mécaniques. Elles ne sont pas une note universelle de ton aim.','Clique sur chaque barre pour comprendre la compétence concernée.'],en:['Skills and bars','Bars show invented normalized 0–100 indices for three mechanical skill categories. They are not a universal aim grade.','Select a bar to learn what it measures.']},
    'precision-bars':{fr:['Répartition de la précision','Les barres décomposent la précision en plusieurs situations : cibles immobiles, petites corrections et cibles mobiles. Les pourcentages illustrés sont inventés.','Évite de comparer directement des barèmes différents.'],en:['Precision breakdown','Bars divide clicking into static targets, small corrections and moving targets. Displayed percentages are fictional.','Avoid directly comparing different scoring systems.']},
    'consistency-bars':{fr:['Répartition de la régularité','Les barres illustrent la réalisation des routines, la répétabilité des essais et l’équilibre de l’entraînement, selon des indices hypothétiques.','Ce ne sont pas des pourcentages de victoire ou de précision.'],en:['Consistency breakdown','Bars illustrate routine completion, repeatability and practice balance using hypothetical indices.','These are not win rates or accuracy percentages.']},
    'overview-tip':{fr:['Conseil de prochaine séance','Le conseil synthétise les résultats hypothétiques et suggère une priorité. Dans la future application, les recommandations devront expliquer leurs critères et rester modifiables.','Un conseil automatisé n’est pas une garantie de progression.'],en:['Next session tip','This suggestion summarizes hypothetical results and proposes a priority. In the planned app, recommendations should explain their criteria and stay editable.','Automated advice is not a guarantee of improvement.']},
    'precision-tip':{fr:['Conseil de précision','Cette recommandation fictive favorise le contrôle du clic, la lecture de cible et la constance, avant de chercher à tirer plus vite.','Le rythme doit rester adapté aux résultats de l’utilisateur.'],en:['Precision tip','This fictional recommendation emphasizes click control, target reading and consistency before increasing raw speed.','Pace should adapt to actual performance.']},
    'consistency-tip':{fr:['Conseil d’habitude','Il propose de privilégier des séances reproductibles et de vraies pauses plutôt que de courir après un record isolé.','Ce texte illustre une explication que le logiciel pourrait fournir.'],en:['Consistency habit tip','It favors repeatable sessions and actual breaks over chasing one isolated personal record.','This is an example of an explanation the app could provide.']},
    'overview-exercises':{fr:['Détail de séance','Ce panneau liste les exercices d’une routine fictive, leur objectif et leur durée. Ce sont des catégories d’entraînement, pas des exercices garantis disponibles sur tous les logiciels.','Les durées indiquées sont des exemples, pas des prescriptions.'],en:['Session detail','This panel lists fictional routine drills, their focus and duration. These are skill categories, not guaranteed scenario names on every trainer.','Durations are examples, not prescriptions.']},
    'precision-exercises':{fr:['Bloc d’exercices de précision','Une routine de clicking peut alterner cibles fixes, micro-corrections et cibles mobiles. La difficulté peut évoluer en gardant un rythme maîtrisé.','L’évaluation doit rester propre au scénario utilisé.'],en:['Precision routine block','A clicking routine may alternate static targets, micro-corrections and moving targets. Difficulty can change while keeping control.','Assessment must remain specific to the actual scenario.']},
    'consistency-exercises':{fr:['Séance orientée régularité','Ici l’idée est de répéter des blocs, noter les résultats et conserver des conditions de test similaires.','Des pauses et un volume raisonnable sont importants.'],en:['Consistency-oriented session','The goal is to repeat blocks, log results and keep test conditions comparable.','Breaks and reasonable volume matter.']},
    'overview-calendar':{fr:['Calendrier d’activité','Chaque carré représente un jour, regroupé en quatre semaines fictives de sept jours. Les couleurs plus intenses illustrent davantage d’activité, pas une meilleure visée.','Clique sur une case pour voir le jour et le volume simulé.'],en:['Activity calendar','Each square represents a day across four fictional seven-day weeks. More intense colors illustrate more activity, not better aim.','Select a square to see its day and simulated volume.']},
    'precision-calendar':{fr:['Calendrier et entraînement','Le calendrier met en contexte la fréquence des entraînements. Il n’indique pas qu’une fréquence élevée améliore automatiquement la précision.','Chaque case est inventée et ne correspond à aucune date réelle.'],en:['Calendar and training','The calendar puts training frequency into context. More frequent sessions do not automatically improve accuracy.','Each square is invented and is not a real calendar date.']},
    'consistency-calendar':{fr:['Calendrier et habitudes','Les jours pratiqués et jours de repos permettent de visualiser un équilibre potentiel entre répétition et récupération.','Les cases représentent quatre semaines fictives.'],en:['Calendar and habits','Practice and rest days help visualize a possible balance between repetition and recovery.','Squares represent four fictional weeks.']},
    privacy:{fr:['Données et confidentialité','Tout le tableau est calculé localement à partir de valeurs d’exemple codées dans la page. Changer de profil, ouvrir les explications ou consulter des points n’envoie pas de données personnelles.','L’intégration réelle à Riot nécessiterait une autorisation et un consentement distincts.'],en:['Data and privacy','The dashboard is calculated locally from example values built into the page. Changing profiles, opening explanations or exploring points does not send personal information.','Real Riot integration would require separate approval and consent.']}
  };
  const barTerms={
    'overview':[
      {fr:['Micro-ajustements','Petites corrections finales du viseur sur une cible, utiles pour éviter les mouvements excessifs.'],en:['Micro-adjustments','Fine final crosshair corrections on a target, useful for avoiding overshooting.']},
      {fr:['Clicking dynamique','Précision au moment du tir sur des cibles en mouvement.'],en:['Dynamic clicking','Shot accuracy against moving targets.']},
      {fr:['Transitions de cible','Capacité à passer d’une cible à une autre de manière contrôlée.'],en:['Target switching','Ability to shift smoothly and precisely between targets.']}
    ],
    'precision':[
      {fr:['Clicking statique','Exercice de visée et clic sur des cibles immobiles.'],en:['Static clicking','Aiming and clicking at stationary targets.']},
      {fr:['Micro-flicks','Petits déplacements rapides suivis d’un arrêt précis.'],en:['Micro-flicks','Small, fast movements ending with controlled accuracy.']},
      {fr:['Clicking dynamique','Tirs sur cibles en mouvement, exigeant une lecture de la trajectoire.'],en:['Dynamic clicking','Shots at moving targets that require reading their motion.']}
    ],
    'consistency':[
      {fr:['Routine réalisée','Part illustrative du plan d’entraînement réellement complété.'],en:['Routine completion','Illustrative portion of a planned workout that was completed.']},
      {fr:['Répétabilité','Stabilité hypothétique des résultats lorsqu’un même exercice est répété.'],en:['Repeatability','Hypothetical stability across repetitions of the same exercise.']},
      {fr:['Équilibre de l’entraînement','Diversité fictive des exercices et présence de temps de récupération.'],en:['Balanced practice','Fictional diversity of drills and presence of recovery time.']}
    ]
  };
  const profiles={
    discovery:{
      overview:{metrics:['06','2h 10','03','30m'],bars:[52,43,38],points:[32,36,40,39,45,51,50,58]},
      precision:{metrics:['68%','5,200','08','86'],bars:[61,48,41],points:[42,50,48,51,56,59,63,68]},
      consistency:{metrics:['58/100','03','08','02'],bars:[59,51,46],points:[38,41,44,42,47,54,51,58]}
    },
    balanced:{
      overview:{metrics:['12','5h 20','05','30m'],bars:[82,74,63],points:[45,52,48,61,67,65,77,82]},
      precision:{metrics:['86%','7,850','08','132'],bars:[86,70,61],points:[58,62,57,72,69,74,79,86]},
      consistency:{metrics:['81/100','05','14','02'],bars:[85,81,72],points:[48,54,59,57,66,74,71,81]}
    },
    advanced:{
      overview:{metrics:['18','8h 15','06','30m'],bars:[91,88,84],points:[70,73,76,74,81,84,83,91]},
      precision:{metrics:['93%','9,420','08','157'],bars:[94,87,85],points:[78,83,80,88,87,90,91,93]},
      consistency:{metrics:['90/100','06','16','01'],bars:[94,90,86],points:[70,75,74,83,86,85,88,90]}
    }
  };
  let profile='balanced',currentHelp='intro',tourMode=false,tourStep=0;
  const findTab=()=>panels.find(x=>document.querySelector('#ti-tab-'+x)?.getAttribute('aria-selected')==='true')||'overview';
  const box=document.createElement('div');
  box.className='ti-learn-top';
  box.innerHTML='<div class="ti-learn-intro"><span class="ti-learn-symbol" aria-hidden="true">?</span><div><strong data-ti-l="title"></strong><p data-ti-l="intro"></p></div></div><div class="ti-learn-controls"><label class="ti-learn-label" for="ti-example-profile" data-ti-l="profile"></label><select id="ti-example-profile" class="ti-learn-select" aria-label="Fictional training profile"><option value="discovery" data-ti-l="free"></option><option value="balanced" data-ti-l="balanced" selected></option><option value="advanced" data-ti-l="advanced"></option></select><button type="button" class="ti-learn-btn primary" id="ti-start-tour" data-ti-l="tour"></button><button type="button" class="ti-learn-btn" id="ti-reset-demo" data-ti-l="reset"></button></div>';
  root.querySelector('.ti-dashboard').before(box);
  const hint=document.createElement('p');
  hint.className='ti-learning-hint';
  hint.innerHTML='<strong>ⓘ</strong> <span data-ti-l="intro"></span> <span data-ti-l="fiction"></span>';
  box.after(hint);
  const dock=document.createElement('div');
  dock.className='ti-explainer ti-guide-toast';
  dock.hidden=true;
  dock.setAttribute('aria-label','Training dashboard explanation');
  dock.innerHTML='<div class="ti-explainer-heading"><div><span class="ti-explainer-flag" data-ti-l="guide"></span><h3 id="ti-explainer-title"></h3></div><button type="button" class="ti-close" id="ti-help-close" aria-label="Close">×</button></div><p id="ti-explainer-desc"></p><p class="ti-explainer-small" id="ti-explainer-extra"></p><div class="ti-tour-navigation" id="ti-tour-navigation" hidden><span class="ti-tour-counter" id="ti-tour-counter"></span><button type="button" class="ti-learn-btn" id="ti-tour-prev" data-ti-l="prev"></button><button type="button" class="ti-learn-btn primary" id="ti-tour-next" data-ti-l="next"></button></div><div class="ti-tour-progress" id="ti-tour-progress" hidden><i id="ti-tour-progress-fill"></i></div>';
  hint.after(dock);
  const glossary=document.createElement('details');
  glossary.className='ti-learning-guide';
  glossary.innerHTML='<summary data-ti-l="glossary"></summary><div class="ti-learning-guide-grid" id="ti-glossary-grid"></div>';
  root.querySelector('.ti-outro').after(glossary);
  const glossaryKeys=['intro','profile','nav','tabs','overview-chart','overview-bars','overview-exercises','overview-calendar','overview-tip','riot','privacy'];
  function translateControls(){
    root.querySelectorAll('[data-ti-l]').forEach(el=>el.textContent=text(el.dataset.tiL));
    root.querySelector('#ti-help-close').setAttribute('aria-label',text('close'));
    root.querySelector('#ti-example-profile').setAttribute('aria-label',text('select'));
    const gloss=root.querySelector('#ti-glossary-grid');
    gloss.innerHTML='';
    for(const id of glossaryKeys){
      const entry=help[id][lang()];
      const section=document.createElement('article');
      section.className='ti-glossary-item';
      const h=document.createElement('h4');h.textContent=entry[0];
      const p=document.createElement('p');p.textContent=entry[1];
      section.append(h,p);gloss.append(section);
    }
    if(!dock.hidden)renderHelp(currentHelp);
  }
  const visibleLabel=(node)=>{
    if(!node)return'';
    const localized=node.querySelector('.'+lang());
    return localized?localized.textContent.trim():node.textContent.trim();
  };
  const getHelp=(id)=>{
    const staticItem=help[id];
    if(staticItem)return staticItem[lang()];
    const match=/^(overview|precision|consistency)-(point|bar|session|day)-(\d+)$/.exec(id);
    if(!match)return help.intro[lang()];
    const [,type,kind,indexString]=match;
    const index=Number(indexString);
    const d=profiles[profile][type];
    if(kind==='point'){
      const value=d.points[index],delta=index?value-d.points[index-1]:null;
      const change=delta===null?tr('première séance illustrée','first illustrated session'):(delta>0?'+':'')+delta;
      return lang()==='fr'?
        ['Point S'+(index+1)+' : '+value+'/100 fictif','Il s’agit du '+(index+1)+'e résultat simulé sur huit passages comparables. Variation par rapport au point précédent : '+change+'. Une hausse ou une baisse isolée ne prouve rien.','Indice relatif de démonstration, pas un taux de headshots ni un MMR.']:
        ['Point S'+(index+1)+': fictional '+value+'/100','This is simulated run '+(index+1)+' out of eight comparable runs. Change from the preceding point: '+change+'. A single rise or fall does not prove improvement.','Illustrative normalized index, not headshot percentage or MMR.'];
    }
    if(kind==='bar'){
      const term=barTerms[type][index][lang()],value=d.bars[index];
      return lang()==='fr'?
        [term[0]+' · '+value+'/100',term[1]+' La longueur de cette barre représente un indice simulé pour le profil « '+text(profile==='discovery'?'free':profile==='balanced'?'balanced':'advanced')+' ».','Ce pourcentage est un score de maquette, pas une mesure universelle ni une statistique Riot.']:
        [term[0]+' · '+value+'/100',term[1]+' This bar shows an invented normalized score for the selected sample profile.','This percentage is a demo index, not a universal aim measure or Riot statistic.'];
    }
    if(kind==='session'){
      const node=document.querySelector('#ti-panel-'+type+' .ti-item:nth-child('+(index+1)+')');
      const name=node?visibleLabel(node.querySelector('strong')):tr('Exercice','Exercise');
      const duration=node?.querySelector('.ti-item-value')?.textContent.trim()||'';
      return lang()==='fr'?
        [name+' · '+duration,'Cet élément représente le '+(index+1)+'e bloc de la séance fictive. Il donne le thème de l’exercice et une durée de référence. Les scénarios réels dépendraient de tes logiciels.','Ce n’est pas un résultat importé d’Aim Lab, KovaaK’s, Oblivity ou VALORANT.']:
        [name+' · '+duration,'This is example routine block '+(index+1)+'. It shows the training focus and a sample duration. Actual scenarios would depend on available software.','This is not an imported Aim Lab, KovaaK’s, Oblivity or VALORANT result.'];
    }
    if(kind==='day'){
      const week=Math.floor(index/7)+1,day=(index%7)+1,activity=activityLevel(index,profile);
      const label=[text('rest'),text('light'),text('moderate'),text('high')][activity];
      return lang()==='fr'?
        ['Semaine '+week+', jour '+day+' · '+label,'Cette case illustre le niveau d’activité fictif d’une journée. Une couleur plus intense signifie davantage de volume de séance, et non une meilleure précision.','Ces quatre semaines sont fictives et ne correspondent pas à ton calendrier.']:
        ['Week '+week+', day '+day+' · '+label,'This square illustrates fictional training activity for one day. Stronger color means more training activity, not higher accuracy.','All four weeks are invented and do not correspond to your calendar.'];
    }
    return help.intro[lang()];
  };
  const glow=()=>root.querySelectorAll('.ti-learning-active').forEach(el=>el.classList.remove('ti-learning-active'));
  function renderHelp(id){
    currentHelp=id;
    const v=getHelp(id);
    dock.querySelector('#ti-explainer-title').textContent=v[0];
    dock.querySelector('#ti-explainer-desc').textContent=v[1];
    dock.querySelector('#ti-explainer-extra').textContent=v[2]||text('fiction');
    dock.hidden=false;
    dock.querySelector('#ti-tour-navigation').hidden=!tourMode;
    dock.querySelector('#ti-tour-progress').hidden=!tourMode;
    if(tourMode){
      dock.querySelector('#ti-tour-counter').textContent=text('step')+' '+(tourStep+1)+' / '+steps.length;
      dock.querySelector('#ti-tour-prev').disabled=tourStep===0;
      dock.querySelector('#ti-tour-next').textContent=tourStep===steps.length-1?text('end'):text('next');
      dock.querySelector('#ti-tour-progress-fill').style.width=((tourStep+1)/steps.length*100)+'%';
    }
  }
  function show(id,target){
    if(!tourMode)glow();
    if(target)target.classList.add('ti-learning-active');
    renderHelp(id);
  }
  function clickable(el,id){
    if(!el)return;
    el.classList.add('ti-learning-hotspot');
    el.setAttribute('role','button');
    el.setAttribute('tabindex','0');
    el.dataset.tiHelp=id;
    el.addEventListener('click',()=>{tourMode=false;show(id,el)});
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}
    });
  }
  function activateTab(name){
    const tab=document.getElementById('ti-tab-'+name);
    if(tab&&tab.getAttribute('aria-selected')!=='true')tab.click();
  }
  for(const name of panels){
    const pane=document.querySelector('#ti-panel-'+name);
    if(!pane)continue;
    pane.querySelectorAll('.ti-metric').forEach((node,i)=>clickable(node,name+'-metric-'+i));
    const plot=pane.querySelector('.ti-plot');
    if(plot){
      const card=plot.closest('.ti-card');
      const head=card?.querySelector('.ti-card-head');
      if(head){
        const info=document.createElement('button');
        info.type='button';info.className='ti-learn-btn';info.textContent='ⓘ';
        info.setAttribute('aria-label',tr('Comment lire ce graphique ?','How to read this chart?'));
        info.addEventListener('click',()=>{tourMode=false;show(name+'-chart',plot)});
        head.append(info);
      }
      const svg=plot.querySelector('svg');
      if(svg){
        svg.removeAttribute('aria-hidden');svg.setAttribute('role','img');
        svg.setAttribute('aria-label',tr('Courbe de huit résultats fictifs','Chart of eight fictional results'));
        const circles=[...svg.querySelectorAll('circle')];
        circles.forEach((circle,i)=>{
          circle.classList.add('ti-chart-point');
          // Accessible, larger hit target through an overlay button below the chart.
          circle.addEventListener('click',()=>{tourMode=false;show(name+'-point-'+i,plot);highlightPoint(name,i)});
        });
        const control=document.createElement('div');
        control.className='ti-graph-points';
        control.setAttribute('role','group');
        control.setAttribute('aria-label',tr('Choisir un point de courbe','Choose a chart point'));
        for(let i=0;i<8;i++){
          const btn=document.createElement('button');btn.type='button';
          btn.className='ti-graph-point-btn';btn.dataset.graphPoint=String(i);
          btn.textContent='S'+(i+1);
          btn.addEventListener('click',()=>{tourMode=false;show(name+'-point-'+i,plot);highlightPoint(name,i)});
          control.append(btn);
        }
        plot.after(control);
      }
    }
    const barContainer=pane.querySelector('.ti-breakdown');
    if(barContainer){
      const card=barContainer.closest('.ti-card');
      const head=card?.querySelector('.ti-card-head');
      if(head){
        const info=document.createElement('button');info.type='button';info.className='ti-learn-btn';info.textContent='ⓘ';info.setAttribute('aria-label',tr('Comprendre les barres','Understand the skill bars'));info.addEventListener('click',()=>{tourMode=false;show(name+'-bars',barContainer)});head.append(info);
      }
      [...barContainer.children].forEach((node,i)=>clickable(node,name+'-bar-'+i));
    }
    clickable(pane.querySelector('.ti-tip'),name+'-tip');
    pane.querySelectorAll('.ti-item').forEach((node,i)=>clickable(node,name+'-session-'+i));
    const heat=pane.querySelector('.ti-mini-heatmap');
    if(heat){
      heat.removeAttribute('aria-hidden');
      heat.setAttribute('role','group');
      heat.setAttribute('aria-label',tr('Quatre semaines fictives','Four fictional weeks'));
      heat.innerHTML='';
      for(let i=0;i<28;i++){
        const btn=document.createElement('button');
        btn.type='button';btn.className='ti-heatmap-day';btn.dataset.day=String(i);
        btn.addEventListener('click',()=>{tourMode=false;show(name+'-day-'+i,heat)});
        heat.append(btn);
      }
      const card=heat.closest('.ti-card');
      if(card){
        const head=card.querySelector('.ti-card-head');
        const info=document.createElement('button');info.type='button';info.className='ti-learn-btn';info.textContent='ⓘ';
        info.setAttribute('aria-label',tr('Comprendre le calendrier','Understand the calendar'));
        info.addEventListener('click',()=>{tourMode=false;show(name+'-calendar',heat)});
        head?.append(info);
      }
    }
  }
  function highlightPoint(type,index){
    const p=document.getElementById('ti-panel-'+type);
    if(!p)return;
    p.querySelectorAll('.ti-graph-point-btn').forEach((btn,i)=>{
      btn.setAttribute('aria-pressed',String(i===index));
    });
    p.querySelectorAll('.ti-chart-point').forEach((node,i)=>node.classList.toggle('is-picked',i===index));
  }
  const sidebar=root.querySelector('.ti-aside');
  if(sidebar)sidebar.removeAttribute('aria-hidden');
  clickable(root.querySelector('.ti-profile'),'profile');
  root.querySelectorAll('.ti-aside .ti-navitem').forEach(node=>clickable(node,node.dataset.tiNav==='riot'?'riot':'nav'));
  root.querySelectorAll('.ti-top-pill').forEach(node=>clickable(node,node.classList.contains('neutral')?'privacy':'intro'));
  const f=dashboard.querySelector('.ti-footnote');
  if(f){
    const info=document.createElement('button');info.type='button';info.className='ti-learn-btn';
    info.textContent='ⓘ'; info.setAttribute('aria-label',tr('Comprendre la confidentialité','Understand data privacy'));
    info.addEventListener('click',()=>{tourMode=false;show('privacy',f)});
    f.append(info);
  }
  const info=root.querySelector('.ti-tabs');
  if(info){const trigger=document.createElement('button');trigger.type='button';trigger.className='ti-learn-btn ti-tabs-info';trigger.textContent='ⓘ';trigger.setAttribute('aria-label',tr('Que signifient les onglets ?','What do these tabs mean?'));trigger.addEventListener('click',()=>{tourMode=false;show('tabs',info)});info.after(trigger)}
  function activityLevel(i,p){
    const shift={discovery:1,balanced:3,advanced:5}[p];
    const n=(i*5+shift+(i%4)*2)%11;
    return n<3?0:n<6?1:n<9?2:3;
  }
  function updateSample(){
    for(const name of panels){
      const p=document.getElementById('ti-panel-'+name),d=profiles[profile][name];
      if(!p)continue;
      p.querySelectorAll('.ti-metric-value').forEach((node,i)=>{if(d.metrics[i]!==undefined)node.textContent=d.metrics[i]});
      p.querySelectorAll('.ti-breakdown > div').forEach((node,i)=>{
        const span=node.querySelector('.ti-progress-track i'),value=node.querySelector('.ti-progress-name strong');
        if(span)span.style.width=d.bars[i]+'%';
        if(value)value.textContent=d.bars[i]+'%';
      });
      const svg=p.querySelector('.ti-plot svg');
      if(svg){
        const pts=d.points.map((n,i)=>[18+i*(564/7),185-n*1.62]);
        const line=svg.querySelector('polyline.line');
        if(line)line.setAttribute('points',pts.map(x=>x.join(',')).join(' '));
        const area=svg.querySelector('path');
        if(area)area.setAttribute('d','M '+pts.map(x=>x.join(',')).join(' L ')+' L 582,200 L 18,200 Z');
        svg.querySelectorAll('circle').forEach((dot,i)=>{dot.setAttribute('cx',String(pts[i][0]));dot.setAttribute('cy',String(pts[i][1]));});
      }
      p.querySelectorAll('.ti-heatmap-day').forEach((el,i)=>{
        const level=activityLevel(i,profile);
        el.className='ti-heatmap-day '+(['','active-low','active-mid','active-high'][level]);
        el.setAttribute('aria-label',tr('Semaine','Week')+' '+(Math.floor(i/7)+1)+', '+tr('jour','day')+' '+(i%7+1)+': '+[text('rest'),text('light'),text('moderate'),text('high')][level]+'. '+text('click'));
      });
      p.querySelectorAll('.ti-chart-point').forEach((el,i)=>el.setAttribute('aria-label','S'+(i+1)+' · '+d.points[i]+'/100'));
      p.querySelectorAll('.ti-graph-point-btn').forEach((el,i)=>el.setAttribute('aria-label','S'+(i+1)+' · '+d.points[i]+'/100 · '+text('click')));
    }
    if(!dock.hidden)renderHelp(currentHelp);
  }
  const steps=[
    {tab:'overview',selector:'.ti-titlebar',help:'intro'},
    {tab:'overview',selector:'.ti-profile',mobile:'.ti-titlebar',help:'profile'},
    {tab:'overview',selector:'.ti-tabs',help:'tabs'},
    {tab:'overview',selector:'.ti-top-pill.neutral',help:'riot'},
    {tab:'overview',selector:'.ti-metrics .ti-metric:first-child',help:'overview-metric-0'},
    {tab:'overview',selector:'.ti-plot',help:'overview-chart'},
    {tab:'overview',selector:'.ti-breakdown',help:'overview-bars'},
    {tab:'overview',selector:'.ti-tip',help:'overview-tip'},
    {tab:'overview',selector:'.ti-list',help:'overview-exercises'},
    {tab:'overview',selector:'.ti-mini-heatmap',help:'overview-calendar'},
    {tab:'precision',selector:'.ti-metrics',help:'precision-intro'},
    {tab:'consistency',selector:'.ti-metrics',help:'consistency-intro'},
    {tab:'overview',selector:'.ti-footnote',help:'privacy'}
  ];
  function runTour(){
    tourMode=true;
    const s=steps[tourStep];
    activateTab(s.tab);
    glow();
    let target=document.querySelector('#ti-panel-'+s.tab+' '+s.selector)||root.querySelector(s.selector);
    if(target&&target.getClientRects().length===0&&s.mobile)target=root.querySelector(s.mobile);
    if(target)target.classList.add('ti-learning-active');
    renderHelp(s.help);
    const mobile=window.matchMedia('(max-width: 680px)').matches;
    if(!mobile && target)target.scrollIntoView({behavior:'smooth',block:'center'});
    else if(!mobile)dock.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  root.querySelectorAll('.ti-tab').forEach(tab=>tab.addEventListener('click',()=>{
    if(!tourMode)show(tab.id.replace('ti-tab-','')+'-intro',root.querySelector('.ti-tabs'));
  }));
    box.querySelector('#ti-start-tour').addEventListener('click',()=>{tourStep=0;runTour()});
  dock.querySelector('#ti-tour-next').addEventListener('click',()=>{if(tourStep===steps.length-1){tourMode=false;glow();dock.hidden=true}else{tourStep++;runTour()}});
  dock.querySelector('#ti-tour-prev').addEventListener('click',()=>{if(tourStep>0){tourStep--;runTour()}});
  dock.querySelector('#ti-help-close').addEventListener('click',()=>{tourMode=false;glow();dock.hidden=true});
  box.querySelector('#ti-example-profile').addEventListener('change',e=>{
    if(!profiles[e.target.value])return;
    profile=e.target.value;updateSample();
    if(!tourMode)show('profile',box.querySelector('#ti-example-profile'));
  });
  box.querySelector('#ti-reset-demo').addEventListener('click',()=>{
    profile='balanced';box.querySelector('#ti-example-profile').value=profile;
    updateSample();tourMode=false;glow();dock.hidden=true;
    activateTab('overview');
    for(const type of panels)highlightPoint(type,-1);
  });
  document.querySelectorAll('[data-switch-lang]').forEach(btn=>btn.addEventListener('click',()=>{
    translateControls();updateSample();
  }));
  translateControls();
  updateSample();
})();
