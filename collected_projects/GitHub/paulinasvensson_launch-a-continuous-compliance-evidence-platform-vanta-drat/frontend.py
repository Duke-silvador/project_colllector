PAGE_HTML = """<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compliance Evidence — Try it</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans text-sm">
<div class="max-w-5xl mx-auto p-4">

  <div class="mb-3 flex items-center justify-between gap-3 flex-wrap">
    <div>
      <h1 class="text-lg font-semibold text-slate-900">Continuous Compliance Evidence</h1>
      <p class="text-xs text-slate-500">EU AI Act technical files + US state privacy obligations, generated from your real stack.</p>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-slate-500 whitespace-nowrap">License key</label>
      <input id="licenseKey" type="text" placeholder="sk_live_..." class="border border-slate-300 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <span id="licenseSaved" class="text-xs text-emerald-600 hidden">saved</span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <!-- Step 1: Create Org (free) -->
    <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="font-medium text-slate-900">1. Create your organization</h2>
        <span class="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Free</span>
      </div>
      <div class="space-y-2">
        <input id="orgName" type="text" placeholder="Company name" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
        <input id="orgIndustry" type="text" placeholder="Industry (e.g. Fintech SaaS)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
        <button onclick="createOrg()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition">Create organization</button>
        <div id="orgResult" class="text-xs mt-1 min-h-[1.5rem]"></div>
      </div>
    </div>

    <!-- Step 2: Generate Documentation (paid) -->
    <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="font-medium text-slate-900">2. Generate AI Act technical file</h2>
        <span class="text-[10px] uppercase tracking-wide bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Paid</span>
      </div>
      <div class="space-y-2">
        <input id="orgIdInput" type="text" placeholder="Organization ID (from step 1)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
        <button onclick="generateDoc()" class="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-sm font-medium transition">Generate documentation</button>
        <div id="docResult" class="text-xs mt-1 min-h-[1.5rem]"></div>
      </div>
    </div>

  </div>

  <p class="text-[11px] text-slate-400 mt-3">Connecting cloud/dev/HR tools, evidence syncing, and obligation tracking are available once you're on a paid plan — purchase a license to unlock full access.</p>
</div>

<script>
const licenseInput = document.getElementById('licenseKey');
licenseInput.value = localStorage.getItem('licenseKey') || '';
licenseInput.addEventListener('input', () => {
  localStorage.setItem('licenseKey', licenseInput.value);
  const el = document.getElementById('licenseSaved');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1000);
});

async function createOrg() {
  const name = document.getElementById('orgName').value.trim();
  const industry = document.getElementById('orgIndustry').value.trim();
  const resultEl = document.getElementById('orgResult');
  if (!name) { resultEl.innerHTML = '<span class="text-red-500">Please enter a company name.</span>'; return; }
  resultEl.innerHTML = '<span class="text-slate-400">Creating...</span>';
  try {
    const res = await fetch('/orgs', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: name, industry: industry})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      resultEl.innerHTML = '<span class="text-red-500">Error: ' + (data.detail || res.status) + '</span>';
      return;
    }
    const id = data.id || data.org_id || JSON.stringify(data);
    resultEl.innerHTML = '<span class="text-emerald-600">Created — Org ID: <b>' + id + '</b></span>';
    document.getElementById('orgIdInput').value = id;
  } catch (e) {
    resultEl.innerHTML = '<span class="text-red-500">Network error: ' + e.message + '</span>';
  }
}

async function generateDoc() {
  const orgId = document.getElementById('orgIdInput').value.trim();
  const resultEl = document.getElementById('docResult');
  const key = localStorage.getItem('licenseKey') || '';
  if (!orgId) { resultEl.innerHTML = '<span class="text-red-500">Enter an organization ID first (create one in step 1).</span>'; return; }
  resultEl.innerHTML = '<span class="text-slate-400">Generating...</span>';
  try {
    const res = await fetch('/documents/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-License-Key': key},
      body: JSON.stringify({org_id: orgId})
    });
    if (res.status === 402) {
      resultEl.innerHTML = '<span class="text-amber-600">A valid license key is required for document generation. Enter your license key above after purchasing a plan.</span>';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      resultEl.innerHTML = '<span class="text-red-500">Error: ' + (data.detail || res.status) + '</span>';
      return;
    }
    const docId = data.id || data.document_id;
    let viewLink = '';
    if (docId) {
      viewLink = ' — <a class="text-indigo-600 underline" href="/documents/' + docId + '" target="_blank">view document</a>';
    }
    resultEl.innerHTML = '<span class="text-emerald-600">Document generated' + (docId ? ' (ID: ' + docId + ')' : '') + '</span>' + viewLink;
  } catch (e) {
    resultEl.innerHTML = '<span class="text-red-500">Network error: ' + e.message + '</span>';
  }
}
</script>
</body>
</html>"""
