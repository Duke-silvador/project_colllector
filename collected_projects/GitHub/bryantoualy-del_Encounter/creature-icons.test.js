import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

await import('./creature-icons.js');
const api=globalThis.ENCOUNTER_CREATURE_ICONS;
const here=path.dirname(fileURLToPath(import.meta.url));

test('les 14 catégories D&D 5e sont exposées',()=>{
  assert.equal(api.keys.length,14);
  assert.equal(new Set(api.keys).size,14);
});

test('les variantes françaises, suffixées et anglaises sont normalisées',()=>{
  const cases={
    'Aberration':'aberration','Artificiel':'artificiel','Bête':'bete','Céleste':'celeste',
    'Dragon':'dragon','Élémentaire':'elementaire','Fée':'fee','Fiélon':'fielon','Géant':'geant',
    'Humanoïde (gobelin)':'humanoide','Monstruosité':'monstruosite','Mort-vivant':'mort_vivant',
    'Plante':'plante','Vase':'vase','Undead':'mort_vivant','Construct':'artificiel','Humanoid (orc)':'humanoide'
  };
  for(const [input,expected] of Object.entries(cases))assert.equal(api.typeKey(input),expected,input);
  assert.equal(api.typeKey('type personnalisé'),null);
});

test('chaque catégorie possède une icône standard et boss à la racine',()=>{
  for(const key of api.keys){
    for(const variant of ['standard','boss']){
      const file=path.join(here,`creature-${variant}-${key}.png`);
      assert.equal(fs.existsSync(file),true,`${variant}/${key}.png manquant`);
      assert.ok(fs.statSync(file).size>1000,`${variant}/${key}.png semble vide`);
    }
  }
});

test('le chemin d’icône bascule vers la variante boss',()=>{
  const model={type:'Dragon'};
  assert.equal(api.iconPath(model,false),'creature-standard-dragon.png');
  assert.equal(api.iconPath(model,true),'creature-boss-dragon.png');
});
