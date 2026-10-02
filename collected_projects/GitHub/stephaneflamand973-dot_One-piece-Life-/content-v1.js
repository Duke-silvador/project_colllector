(function(){
'use strict';

window.OPV1_CONTENT={
  version:'1.0.0',
  locations:{
    'Foosha Village':['East Blue',4,['Goa','Shimotsuki']],
    'Cocoyasi Village':['East Blue',10,['Baratie','Loguetown']],
    'Arlong Park':['East Blue',22,['Cocoyasi Village','Baratie']],
    'Swallow Island':['North Blue',15,['Minion Island','Lvneel']],
    'Kano Country':['West Blue',18,['Ilusia','Ohara']],
    'Briss Kingdom':['South Blue',14,['Baterilla','Torino']],
    'Skypiea':['Grand Line',46,['Jaya','Long Ring Long Land']],
    'Long Ring Long Land':['Grand Line',28,['Skypiea','Water 7']],
    'Enies Lobby':['Grand Line',62,['Water 7','Sabaody']],
    'Marineford':['Grand Line',82,['Sabaody','Impel Down']],
    'Impel Down':['Grand Line',88,['Marineford','Amazon Lily']],
    'Amazon Lily':['Grand Line',48,['Impel Down','Sabaody']],
    'Hachinosu':['New World',86,['Egghead','Elbaf']],
    'Elbaf':['New World',72,['Egghead','Hachinosu']],
    'Mary Geoise':['Grand Line',96,['Sabaody','Fish-Man Island']]
  },

  actors:[
    {name:'Monkey D. Luffy',faction:'Pirates',region:'East Blue',base:8,peak:99,growth:19,importance:100,goal:'Trouver le One Piece et devenir Roi des Pirates',birthYear:5,activeFrom:22},
    {name:'Roronoa Zoro',faction:'Pirates',region:'East Blue',base:10,peak:96,growth:18,importance:98,goal:'Devenir le plus grand sabreur',birthYear:3,activeFrom:22},
    {name:'Nami',faction:'Pirates',region:'East Blue',base:5,peak:67,growth:18,importance:94,goal:'Cartographier le monde',birthYear:4,activeFrom:22},
    {name:'Usopp',faction:'Pirates',region:'East Blue',base:4,peak:66,growth:18,importance:92,goal:'Devenir un brave guerrier des mers',birthYear:5,activeFrom:22},
    {name:'Sanji',faction:'Pirates',region:'East Blue',base:9,peak:94,growth:18,importance:97,goal:'Trouver All Blue',birthYear:3,activeFrom:22},
    {name:'Portgas D. Ace',faction:'Pirates',region:'Grand Line',base:42,peak:85,growth:8,importance:99,goal:'Trouver sa place dans le monde',birthYear:2,activeFrom:19},
    {name:'Sabo',faction:'Révolutionnaires',region:'Grand Line',base:36,peak:91,growth:10,importance:98,goal:'Faire progresser la révolution',birthYear:3,activeFrom:18},
    {name:'Marshall D. Teach',faction:'Pirates',region:'Grand Line',base:66,peak:99,growth:12,importance:100,goal:'S’emparer du sommet de l’ère',birthYear:-18,activeFrom:18},
    {name:'Buggy',faction:'Pirates',region:'East Blue',base:24,peak:55,growth:18,importance:93,goal:'Accroître sa richesse et son influence',birthYear:-15,activeFrom:0},
    {name:'Smoker',faction:'Marine',region:'East Blue',base:44,peak:74,growth:12,importance:91,goal:'Traquer les pirates selon sa propre justice',birthYear:-12,activeFrom:14},
    {name:'Sengoku',faction:'Marine',region:'Grand Line',base:93,peak:91,growth:22,importance:98,goal:'Préserver l’ordre mondial',birthYear:-55,activeFrom:0},
    {name:'Sakazuki',faction:'Marine',region:'Grand Line',base:82,peak:99,growth:18,importance:100,goal:'Imposer une justice absolue',birthYear:-31,activeFrom:0},
    {name:'Kuzan',faction:'Marine',region:'Grand Line',base:78,peak:96,growth:18,importance:98,goal:'Suivre sa propre conception de la justice',birthYear:-25,activeFrom:0},
    {name:'Borsalino',faction:'Marine',region:'Grand Line',base:80,peak:96,growth:18,importance:97,goal:'Accomplir les missions de la Marine',birthYear:-32,activeFrom:0},
    {name:'Crocodile',faction:'Pirates',region:'Grand Line',base:53,peak:82,growth:18,importance:96,goal:'Reconstruire son influence',birthYear:-22,activeFrom:0},
    {name:'Donquixote Doflamingo',faction:'Pirates',region:'Grand Line',base:61,peak:88,growth:18,importance:98,goal:'Contrôler les réseaux du monde souterrain',birthYear:-17,activeFrom:0},
    {name:'Boa Hancock',faction:'Pirates',region:'Grand Line',base:57,peak:88,growth:16,importance:96,goal:'Protéger Amazon Lily',birthYear:-9,activeFrom:10},
    {name:'Trafalgar Law',faction:'Pirates',region:'North Blue',base:15,peak:91,growth:15,importance:98,goal:'Comprendre la Volonté du D.',birthYear:2,activeFrom:17},
    {name:'Eustass Kid',faction:'Pirates',region:'South Blue',base:18,peak:90,growth:15,importance:96,goal:'S’imposer au sommet de la piraterie',birthYear:1,activeFrom:18},
    {name:'Marco',faction:'Pirates',region:'New World',base:76,peak:90,growth:16,importance:94,goal:'Protéger l’héritage de Barbe Blanche',birthYear:-21,activeFrom:0},
    {name:'Jinbe',faction:'Pirates',region:'Grand Line',base:67,peak:84,growth:16,importance:96,goal:'Améliorer les relations entre humains et hommes-poissons',birthYear:-22,activeFrom:0},
    {name:'Rob Lucci',faction:'Gouvernement',region:'Grand Line',base:41,peak:88,growth:15,importance:94,goal:'Servir le Gouvernement par la force',birthYear:-6,activeFrom:12},
    {name:'Monkey D. Garp',faction:'Marine',region:'East Blue',base:92,peak:97,growth:1,importance:100,goal:'Former la prochaine génération',birthYear:-54,activeFrom:0},
    {name:'Shanks',faction:'Pirates',region:'East Blue',base:28,peak:98,growth:16,importance:100,goal:'Préserver l’équilibre jusqu’au bon moment',birthYear:-15,activeFrom:0},
    {name:'Silvers Rayleigh',faction:'Pirates',region:'Grand Line',base:95,peak:90,growth:22,importance:96,goal:'Observer la nouvelle génération',birthYear:-56,activeFrom:0},
    {name:'Dracule Mihawk',faction:'Indépendant',region:'Grand Line',base:34,peak:96,growth:16,importance:98,goal:'Conserver sa place au sommet des sabreurs',birthYear:-19,activeFrom:0},
    {name:'Monkey D. Dragon',faction:'Révolutionnaires',region:'Grand Line',base:58,peak:99,growth:14,importance:100,goal:'Renverser le système des Dragons Célestes',birthYear:-31,activeFrom:0},
    {name:'Kaido',faction:'Pirates',region:'New World',base:84,peak:100,growth:10,importance:100,goal:'Déclencher une guerre gigantesque',birthYear:-35,activeFrom:0},
    {name:'Charlotte Linlin',faction:'Pirates',region:'New World',base:95,peak:99,growth:8,importance:100,goal:'Étendre Totto Land et sa famille',birthYear:-44,activeFrom:0},
    {name:'Edward Newgate',faction:'Pirates',region:'New World',base:100,peak:96,growth:22,importance:100,goal:'Protéger sa famille',birthYear:-50,activeFrom:0}
  ],

  fruits:[
    ['Gomu Gomu no Mi','Mythique',100],['Mera Mera no Mi','Logia',90],['Ope Ope no Mi','Paramecia',98],
    ['Hie Hie no Mi','Logia',94],['Moku Moku no Mi','Logia',78],['Gura Gura no Mi','Paramecia',100],
    ['Yami Yami no Mi','Logia',100],['Pika Pika no Mi','Logia',96],['Magu Magu no Mi','Logia',98],
    ['Suna Suna no Mi','Logia',88],['Goro Goro no Mi','Logia',97],['Hana Hana no Mi','Paramecia',79],
    ['Ito Ito no Mi','Paramecia',91],['Nikyu Nikyu no Mi','Paramecia',94],['Mero Mero no Mi','Paramecia',87],
    ['Doku Doku no Mi','Paramecia',95],['Hobi Hobi no Mi','Paramecia',92],['Zushi Zushi no Mi','Paramecia',97],
    ['Bari Bari no Mi','Paramecia',82],['Bomu Bomu no Mi','Paramecia',62],['Sube Sube no Mi','Paramecia',54],
    ['Bara Bara no Mi','Paramecia',58],['Baku Baku no Mi','Paramecia',64],['Yomi Yomi no Mi','Paramecia',76],
    ['Kage Kage no Mi','Paramecia',87],['Horo Horo no Mi','Paramecia',79],['Jiki Jiki no Mi','Paramecia',92],
    ['Tori Tori no Mi, modèle Phénix','Mythique',98],['Uo Uo no Mi, modèle Seiryu','Mythique',100],
    ['Hito Hito no Mi, modèle Daibutsu','Mythique',98],['Neko Neko no Mi, modèle Léopard','Zoan',84]
  ],

  fruitAssignments:[
    {fruit:'Gura Gura no Mi',holder:'Edward Newgate',year:0,month:0},
    {fruit:'Hie Hie no Mi',holder:'Kuzan',year:0,month:0},
    {fruit:'Pika Pika no Mi',holder:'Borsalino',year:0,month:0},
    {fruit:'Magu Magu no Mi',holder:'Sakazuki',year:0,month:0},
    {fruit:'Suna Suna no Mi',holder:'Crocodile',year:0,month:0},
    {fruit:'Ito Ito no Mi',holder:'Donquixote Doflamingo',year:0,month:0},
    {fruit:'Tori Tori no Mi, modèle Phénix',holder:'Marco',year:0,month:0},
    {fruit:'Uo Uo no Mi, modèle Seiryu',holder:'Kaido',year:0,month:0},
    {fruit:'Hito Hito no Mi, modèle Daibutsu',holder:'Sengoku',year:0,month:0},
    {fruit:'Ope Ope no Mi',holder:'Trafalgar Law',year:8,month:0},
    {fruit:'Mero Mero no Mi',holder:'Boa Hancock',year:10,month:0},
    {fruit:'Gomu Gomu no Mi',holder:'Monkey D. Luffy',year:12,month:0},
    {fruit:'Moku Moku no Mi',holder:'Smoker',year:14,month:0},
    {fruit:'Neko Neko no Mi, modèle Léopard',holder:'Rob Lucci',year:14,month:0},
    {fruit:'Jiki Jiki no Mi',holder:'Eustass Kid',year:18,month:0},
    {fruit:'Mera Mera no Mi',holder:'Portgas D. Ace',year:19,month:0},
    {fruit:'Yami Yami no Mi',holder:'Marshall D. Teach',year:21,month:0}
  ],

  canonEvents:[
    {id:'roger-execution',year:0,month:0,title:'Exécution de Gol D. Roger',type:'anchor',resistance:100,location:'Loguetown',required:[],factions:['Gouvernement','Marine','Pirates'],description:'L’exécution de Roger ouvre la Grande Ère de la Piraterie.'},
    {id:'ohara',year:2,month:0,title:'Destruction d’Ohara',type:'anchor',resistance:94,location:'Ohara',required:[],factions:['Gouvernement','Marine'],description:'Le Gouvernement détruit Ohara après les recherches sur le Siècle oublié.'},
    {id:'fisher-tiger',year:7,month:0,title:'Raid de Fisher Tiger',type:'flexible',resistance:82,location:'Mary Geoise',required:[],factions:['Gouvernement'],description:'Une attaque spectaculaire libère de nombreux esclaves.'},
    {id:'shanks-east',year:12,month:0,title:'Séjour de Shanks à East Blue',type:'flexible',resistance:78,location:'Foosha Village',required:['Shanks'],factions:['Pirates'],description:'Shanks et son équipage séjournent près du Royaume de Goa.'},
    {id:'ace-departure',year:19,month:0,title:'Départ d’Ace',type:'flexible',resistance:72,location:'Goa',required:['Portgas D. Ace'],factions:['Pirates'],description:'Ace quitte East Blue pour prendre la mer.'},
    {id:'luffy-departure',year:22,month:0,title:'Départ de Luffy',type:'anchor',resistance:88,location:'Foosha Village',required:['Monkey D. Luffy'],factions:['Pirates'],description:'Luffy commence son voyage depuis East Blue.'},
    {id:'alabasta-crisis',dependsOn:['luffy-departure'],year:22,month:3,title:'Crise d’Alabasta',type:'flexible',resistance:72,location:'Alabasta',required:['Monkey D. Luffy','Crocodile'],factions:['Pirates','Gouvernement'],description:'Le conflit d’Alabasta atteint son point critique.'},
    {id:'enies-lobby',dependsOn:['alabasta-crisis'],year:22,month:6,title:'Incident d’Enies Lobby',type:'flexible',resistance:78,location:'Enies Lobby',required:['Monkey D. Luffy','Rob Lucci'],factions:['Pirates','Gouvernement'],description:'Une confrontation majeure frappe une installation du Gouvernement.'},
    {id:'sabaody',dependsOn:['enies-lobby'],year:22,month:9,title:'Incident de Sabaody',type:'flexible',resistance:76,location:'Sabaody',required:['Monkey D. Luffy','Borsalino'],factions:['Pirates','Marine'],description:'La nouvelle génération entre en collision avec les forces de la Marine.'},
    {id:'impel-down',dependsOn:['sabaody'],year:22,month:10,title:'Évasion d’Impel Down',type:'flexible',resistance:78,location:'Impel Down',required:['Monkey D. Luffy'],factions:['Pirates','Gouvernement'],description:'La grande prison connaît une crise majeure.'},
    {id:'marineford',dependsOn:['ace-departure','impel-down'],year:22,month:11,title:'Guerre au sommet',type:'anchor',resistance:96,location:'Marineford',required:['Portgas D. Ace','Edward Newgate','Sengoku','Sakazuki'],factions:['Marine','Pirates','Gouvernement'],description:'Une guerre massive oppose la Marine à la flotte de Barbe Blanche.'},
    {id:'timeskip',dependsOn:['marineford'],year:23,month:0,title:'Recomposition des forces',type:'anchor',resistance:84,location:'Sabaody',required:[],factions:['Marine','Pirates'],description:'Le monde se réorganise après la guerre au sommet.'},
    {id:'return-sabaody',dependsOn:['timeskip'],year:24,month:0,title:'Retour de la nouvelle génération',type:'flexible',resistance:70,location:'Sabaody',required:['Monkey D. Luffy'],factions:['Pirates'],description:'Plusieurs trajectoires majeures convergent de nouveau vers Grand Line.'},
    {id:'punk-hazard',dependsOn:['return-sabaody'],year:24,month:1,title:'Incident de Punk Hazard',type:'flexible',resistance:68,location:'Punk Hazard',required:['Monkey D. Luffy','Trafalgar Law'],factions:['Pirates'],description:'Une alliance pirate perturbe l’équilibre du Nouveau Monde.'},
    {id:'dressrosa',dependsOn:['punk-hazard'],year:24,month:2,title:'Chute du pouvoir de Dressrosa',type:'flexible',resistance:74,location:'Dressrosa',required:['Monkey D. Luffy','Trafalgar Law','Donquixote Doflamingo'],factions:['Pirates','Gouvernement'],description:'Le système de Dressrosa est confronté à une coalition ennemie.'},
    {id:'whole-cake',dependsOn:['dressrosa'],year:24,month:4,title:'Crise de Whole Cake Island',type:'flexible',resistance:76,location:'Whole Cake Island',required:['Monkey D. Luffy','Charlotte Linlin'],factions:['Pirates'],description:'L’équilibre de Totto Land est perturbé par une intrusion majeure.'},
    {id:'wano',dependsOn:['whole-cake'],year:24,month:6,title:'Guerre de Wano',type:'anchor',resistance:90,location:'Wano',required:['Monkey D. Luffy','Kaido'],factions:['Pirates'],description:'Une coalition affronte les forces dominantes de Wano.'},
    {id:'egghead',dependsOn:['wano'],year:24,month:9,title:'Incident d’Egghead',type:'flexible',resistance:82,location:'Egghead',required:['Monkey D. Luffy','Borsalino'],factions:['Pirates','Gouvernement','Marine'],description:'Une crise scientifique et politique éclate sur Egghead.'}
  ],

  specialTechniques:[
    {id:'soru',name:'Soru',group:'Rokushiki',requires:{faction:'Gouvernement',skill:'Combat',skillValue:32,stat:'Vitesse',statValue:38},bonus:7},
    {id:'geppo',name:'Geppo',group:'Rokushiki',requires:{faction:'Gouvernement',skill:'Combat',skillValue:34,stat:'Agilité',statValue:40},bonus:7},
    {id:'tekkai',name:'Tekkai',group:'Rokushiki',requires:{faction:'Gouvernement',skill:'Combat',skillValue:36,stat:'Résistance',statValue:42},bonus:7},
    {id:'shigan',name:'Shigan',group:'Rokushiki',requires:{faction:'Gouvernement',skill:'Combat',skillValue:42,stat:'Force',statValue:38},bonus:8},
    {id:'rankyaku',name:'Rankyaku',group:'Rokushiki',requires:{faction:'Gouvernement',skill:'Combat',skillValue:48,stat:'Agilité',statValue:46},bonus:9},
    {id:'kamie',name:'Kami-e',group:'Rokushiki',requires:{faction:'Gouvernement',skill:'Combat',skillValue:44,stat:'Réflexes',statValue:46},bonus:8},
    {id:'fishman-karate',name:'Karaté des Hommes-Poissons',group:'Race',requires:{race:'Homme-poisson',skill:'Combat',skillValue:24},bonus:8},
    {id:'electro',name:'Electro',group:'Race',requires:{race:'Mink',skill:'Combat',skillValue:24},bonus:8},
    {id:'flying-slash',name:'Lame volante',group:'Sabre',requires:{style:'Sabreur',skill:'Sabre',skillValue:58},bonus:10},
    {id:'advanced-sniping',name:'Tir d’élite longue portée',group:'Tir',requires:{style:'Tireur',skill:'Tir',skillValue:58},bonus:10}
  ],

  localEvents:[
    {id:'merchant',regions:['East Blue','North Blue','West Blue','South Blue','Grand Line','New World'],title:'Marchand itinérant',kind:'economy'},
    {id:'storm',regions:['Grand Line','New World'],title:'Météo imprévisible',kind:'danger'},
    {id:'marine-check',regions:['East Blue','North Blue','West Blue','South Blue','Grand Line'],title:'Contrôle de la Marine',kind:'faction'},
    {id:'bounty-rumor',regions:['Grand Line','New World'],title:'Rumeur de prime',kind:'world'},
    {id:'ruins',regions:['Grand Line','New World'],title:'Ruines oubliées',kind:'discovery'},
    {id:'shipwreck',regions:['East Blue','North Blue','West Blue','South Blue','Grand Line','New World'],title:'Épave à la dérive',kind:'discovery'},
    {id:'revolutionary-contact',regions:['Grand Line','New World'],title:'Contact clandestin',kind:'faction'}
  ]
};
})();