(() => {
  const api = window.PixelSurvivalModAPI;
  if (!api || api.version !== '1.3.0') {
    throw new Error('This example requires Pixel Survival Mod API 1.3.0.');
  }

  api.registerItem('example:raw_ore', {
    name: 'Example Ore',
    icon: 'copper',
    color: '#b67c62',
    color2: '#704838',
    kind: 'material',
    desc: 'A sample mod material.',
  });
  api.registerItem('example:ingot', {
    name: 'Example Ingot',
    icon: 'copper',
    color: '#e5aa78',
    color2: '#956440',
    kind: 'material',
    desc: 'Smelted in the example furnace.',
  });
  api.registerBlock('example:smelter', {
    name: 'Example Smelter',
    color: '#8b6550',
    color2: '#493b34',
    desc: 'Right-click to open its input, fuel, and output slots.',
  });
  api.registerMachine('example:smelter', {
    name: 'Example Smelter',
    blockItem: 'example:smelter',
    fuelItem: 'wood',
    fuelPerCraft: 1,
    recipes: [{
      id: 'smelt_ore',
      name: 'Smelt Example Ingot',
      input: { 'example:raw_ore': 2 },
      output: { 'example:ingot': 1 },
      duration: 8,
      energy: 2,
    }],
  });
  api.registerMachineRecipe('example:smelter', {
    id: 'charcoal_smelt',
    name: 'Charcoal-assisted Smelting',
    input: { 'example:raw_ore': 1, wood: 1 },
    output: { 'example:ingot': 1 },
    duration: 12,
  });
  api.registerRecipe({
    out: 'example:smelter',
    need: { wood: 8, stone: 10 },
    tier: 0,
  });

  api.registerItem('example:turnip_seed', {
    name: 'Example Turnip Seed',
    icon: 'seed',
    color: '#9bc66b',
    color2: '#527b3a',
    kind: 'seed',
    desc: 'Plant on a tilled plot.',
  });
  api.registerItem('example:turnip', {
    name: 'Example Turnip',
    icon: 'berry',
    color: '#d080a0',
    color2: '#75445a',
    kind: 'food',
    hunger: 22,
    heal: 2,
    desc: 'A sample mod crop.',
  });
  api.registerCrop('example:turnip', {
    name: 'Example Turnip',
    seedItem: 'example:turnip_seed',
    output: 'example:turnip',
    yield: 2,
    growthSeconds: 90,
    color: '#d080a0',
  });
  api.registerRecipe({
    out: 'example:turnip_seed',
    count: 2,
    need: { fiber: 3, wood: 1 },
    tier: 0,
  });

  api.on('machineCrafted', event => {
    if (event.machine === 'example:smelter') {
      console.info('Example mod smelted:', event.output);
    }
  });
  console.info('Example mod registered. Craft the Example Smelter from the craft panel.');
})();
