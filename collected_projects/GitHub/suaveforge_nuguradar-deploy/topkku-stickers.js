(()=>{
  const items=[
    {id:'heart-outline',label:'하트 라인',pack:'기본',access:'free',minBand:1,kind:'emoji',value:'♡'},
    {id:'heart-solid',label:'하트',pack:'기본',access:'free',minBand:1,kind:'emoji',value:'♥'},
    {id:'star',label:'별',pack:'기본',access:'free',minBand:1,kind:'emoji',value:'★'},
    {id:'sparkle',label:'반짝',pack:'기본',access:'free',minBand:1,kind:'emoji',value:'✦'},
    {id:'ribbon',label:'리본',pack:'기본',access:'free',minBand:1,kind:'emoji',value:'🎀'},
    {id:'flower',label:'꽃',pack:'기본',access:'free',minBand:1,kind:'emoji',value:'🌷'},
    {id:'tape-pink',label:'핑크 테이프',pack:'다꾸',access:'free',minBand:1,kind:'tape',variant:'pink'},
    {id:'note-paper',label:'메모 조각',pack:'다꾸',access:'free',minBand:1,kind:'paper',variant:'note',asset:'assets/topkku/memo.svg'},

    {id:'bubble',label:'버블',pack:'기본',access:'free',minBand:2,kind:'emoji',value:'🫧'},
    {id:'clover',label:'클로버',pack:'기본',access:'free',minBand:2,kind:'emoji',value:'🍀'},
    {id:'bunny',label:'토끼',pack:'기본',access:'free',minBand:2,kind:'emoji',value:'🐰'},
    {id:'bear',label:'곰',pack:'기본',access:'free',minBand:2,kind:'emoji',value:'🐻'},
    {id:'tape-lilac',label:'라일락 테이프',pack:'다꾸',access:'free',minBand:2,kind:'tape',variant:'lilac'},
    {id:'ticket-mini',label:'티켓 조각',pack:'다꾸',access:'free',minBand:2,kind:'paper',variant:'ticket',asset:'assets/topkku/ticket.svg'},
    {id:'pearl-dot',label:'미니 진주',pack:'포카',access:'free',minBand:2,kind:'pearl',variant:'single',asset:'assets/topkku/pearl-chain.svg'},
    {id:'mini-gem',label:'미니 큐빅',pack:'포카',access:'free',minBand:2,kind:'gem',variant:'mini',asset:'assets/topkku/gem.svg'},
    {id:'chrome-heart',label:'크롬 하트',pack:'찐 탑꾸',access:'activity',minBand:2,kind:'chrome',variant:'heart',asset:'assets/topkku/sparkling-heart.svg',assetTone:'chrome'},
    {id:'pearl-chain',label:'진주 체인',pack:'찐 탑꾸',access:'activity',minBand:2,kind:'pearl',variant:'chain',asset:'assets/topkku/pearl-chain.svg',assetScale:1.22,maxPerCanvas:4},
    {id:'jelly-heart',label:'젤리 하트',pack:'찐 탑꾸',access:'activity',minBand:2,kind:'jelly',variant:'heart',asset:'assets/topkku/heart-decoration.svg'},

    {id:'cloud',label:'구름',pack:'기본',access:'free',minBand:3,kind:'emoji',value:'☁️'},
    {id:'radar',label:'레이더',pack:'기본',access:'free',minBand:3,kind:'emoji',value:'📡'},
    {id:'lace-corner',label:'레이스 실 장식',pack:'찐 탑꾸',access:'activity',minBand:3,kind:'lace',variant:'corner',asset:'assets/topkku/thread.svg',assetScale:1.18,maxPerCanvas:4},
    {id:'acrylic-charm',label:'아크릴 참',pack:'찐 탑꾸',access:'activity',minBand:3,kind:'acrylic',variant:'charm',asset:'assets/topkku/acrylic-charm.svg'},
    {id:'silver-star',label:'실버 스타',pack:'찐 탑꾸',access:'activity',minBand:3,kind:'chrome',variant:'star',asset:'assets/topkku/star.svg',assetTone:'chrome'},

    {id:'gem-shimmer',label:'샤이닝 젬',pack:'희귀',access:'points',minBand:4,unlockCost:60,kind:'gem',variant:'shimmer',asset:'assets/topkku/gem.svg',motion:'shimmer',maxPerCanvas:2},

    {id:'holo-tape',label:'홀로 리본 피스',pack:'찐 탑꾸',access:'activity',minBand:5,kind:'tape',variant:'holo',asset:'assets/topkku/reminder-ribbon.svg',assetScale:1.18,motion:'shimmer',maxPerCanvas:3},
    {id:'holo-frame',label:'홀로그램 포토 참',pack:'희귀',access:'points',minBand:5,unlockCost:90,kind:'frame',variant:'holo',asset:'assets/topkku/photo-frame.svg',assetScale:1.35,motion:'specular',maxPerCanvas:1},
    {id:'aurora-sparkle',label:'오로라 스파클',pack:'희귀',access:'points',minBand:5,unlockCost:120,kind:'sparkle',variant:'aurora',asset:'assets/topkku/sparkles.svg',motion:'sparkle',maxPerCanvas:3}
  ];
  window.NUGU_TOPKKU_STICKERS={items,byId:new Map(items.map(x=>[x.id,x])),limits:{totalObjects:90,motionObjects:6,privateSavesPerDay:30,publicPostsPerDay:10,giftsPerDay:3}};
})();