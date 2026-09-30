(function () {
  const sources = [
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  window.tradeflowLoadSupabase = function () {
    return new Promise(function (resolve, reject) {
      if (window.supabase && typeof window.supabase.createClient === 'function') return resolve(window.supabase);
      let index = 0;
      function tryNext() {
        if (window.supabase && typeof window.supabase.createClient === 'function') return resolve(window.supabase);
        if (index >= sources.length) return reject(new Error('Supabase browser library could not be loaded from the available CDNs.'));
        const script = document.createElement('script');
        script.src = sources[index++];
        script.async = true;
        script.onload = function () {
          setTimeout(function () {
            if (window.supabase && typeof window.supabase.createClient === 'function') resolve(window.supabase);
            else tryNext();
          }, 0);
        };
        script.onerror = tryNext;
        document.head.appendChild(script);
      }
      tryNext();
    });
  };
})();
