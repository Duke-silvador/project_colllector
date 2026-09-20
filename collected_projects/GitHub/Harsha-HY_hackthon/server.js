require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { supabase, mapAppToDb, mapDbToApp, mapUserToDb, mapDbToUser } = require('./lib/supabase');

const PORT = process.env.PORT || 8000;
const DATA_FILE = path.join(__dirname, 'database.json');

const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0b5665eda376f';

function fetchCloudUsers() {
  return new Promise((resolve) => {
    https.get('https://api.restful-api.dev/objects/' + CLOUD_OBJECT_ID, { headers: { 'User-Agent': 'NodeJS' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.data && Array.isArray(parsed.data.users)) {
            resolve(parsed.data.users);
            return;
          }
        } catch(e) {}
        resolve([]);
      });
    }).on('error', () => resolve([]));
  });
}

function persistCloudUsers(users) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ data: { users } });
    const req = https.request('https://api.restful-api.dev/objects/' + CLOUD_OBJECT_ID, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NodeJS'
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

// Clean start: All accounts and data stored dynamically on Supabase
const SYSTEM_ACCOUNTS = [];

function checkUserCredentials(u, email, pass) {
  if ((u.email || '').toLowerCase().trim() !== email.toLowerCase().trim()) return false;
  if (u.passwords && Array.isArray(u.passwords)) {
    if (u.passwords.includes(pass)) return true;
  }
  return (u.password || '').trim() === pass;
}

// Initialize database with realistic Mysuru C&D data
const initialData = {
  stats: {
    totalApplications: 0,
    pendingInspections: 0,
    pendingDebris: 0,
    completedCollections: 0,
    activeOfficers: 3,
    totalTonnageCollected: '0 MT',
    recyclingEfficiency: '100%'
  },
  hotspots: [],
  applications: [],
  pinMappings: [
    { pin: '570001', ward: 'Ward 14 (Devaraja)', area: 'Palace Core / City Center', streets: 'Sayyaji Rao Rd, Ashoka Rd, Irwin Rd', mapLocation: '12.3051° N, 76.6551° E', authority: 'Mysuru Municipal Corporation (MCC)', officer: 'MCC Admin' },
    { pin: '570002', ward: 'Ward 18 (Gokulam)', area: 'Gokulam & Vontikoppal', streets: 'Contour Rd, Temple Rd, 3rd Stage', mapLocation: '12.3271° N, 76.6264° E', authority: 'Mysuru Municipal Corporation (MCC)', officer: 'MCC Admin' },
    { pin: '570026', ward: 'GP Ward 1-4', area: 'Bogadi Peripheral & Ring Road', streets: 'Bogadi Main Rd, Gadhinglaj Cross', mapLocation: '12.3021° N, 76.5912° E', authority: 'Bogadi Gram Panchayat', officer: 'Panchayat Admin' },
    { pin: '570018', ward: 'TP Ward 1-8', area: 'Hootagalli Industrial Belt', streets: 'KIADB Belagola Cross, Ring Rd Exit', mapLocation: '12.3489° N, 76.5744° E', authority: 'Hootagalli Town Panchayat', officer: 'Town Panchayat Admin' }
  ],
  authorities: [
    { name: 'Mysuru Municipal Corporation (MCC)', department: 'C&D Waste Enforcement Cell', areaWard: '65 Urban Wards / 9 Zones', contactDetails: 'mcc@gmail.com · 0821-2440890', address: 'MCC Head Office, Sayyaji Rao Rd, Mysuru' },
    { name: 'Bogadi Gram Panchayat', department: 'Rural Sanitation & Debris Clearance', areaWard: 'Bogadi, Maratikyathanahalli', contactDetails: 'gp@gmail.com · 0821-2598711', address: 'GP Bhavan, Bogadi Village' },
    { name: 'Hootagalli Town Panchayat', department: 'Suburban Civic & Demolition Desk', areaWard: 'Hootagalli CMC & Industrial Zone', contactDetails: 'tp@gmail.com · 0821-2402122', address: 'Town Council Office, Hootagalli' }
  ],
  inspectors: [],
  inspections: [],
  demolitionRequests: [],
  demolitionStatus: [],
  certificates: [],
  utilities: [],
  notifications: [],
  reports: {
    monthlyTrend: [],
    authorityBreakdown: []
  },
  users: [],
  settings: {
    autoRoutingEnabled: true,
    slaHoursThreshold: 4,
    defaultDestinationFacility: 'Kumbarakoppal ZWM C&D Plant',
    smsGateway: 'Active (Govt of Karnataka SMS Portal)',
    effectiveJurisdictionShiftMode: 'Dynamic Timestamp Rule'
  }
};

// Load or save DB
function getDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) {}
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  return initialData;
}

function saveDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTING FOR AUTH & ALL 14 MODULES ---
  if (pathname.startsWith('/api/')) {
    const db = getDB();

    // 0. Auth Endpoints
    if (pathname.includes('/auth/login') && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch(e) {}
        const email = (payload.email || '').trim().toLowerCase();
        const password = (payload.password || '').trim();

        // 1. Check built-in accounts
        let user = SYSTEM_ACCOUNTS.find(u => checkUserCredentials(u, email, password));

        // 2. Check Supabase users table (Real-time from any device)
        if (!user && supabase) {
          try {
            const { data: suUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
            if (suUser) {
              const mappedUser = mapDbToUser(suUser);
              if (checkUserCredentials(mappedUser, email, password)) {
                user = mappedUser;
              }
            }
          } catch(e) {}
        }

        // 3. Check local database
        if (!user) {
          user = (db.registeredUsers || []).find(u => checkUserCredentials(u, email, password));
        }

        // 4. Check cloud store
        if (!user) {
          try {
            const cloudUsers = await fetchCloudUsers();
            user = cloudUsers.find(u => checkUserCredentials(u, email, password));
          } catch(e) {}
        }

        if (user) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, user }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid email or password. Please check your credentials.' }));
        }
      });
      return;
    }

    if (pathname.includes('/auth/register') && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch(e) {}
        const name = (payload.name || '').trim();
        const email = (payload.email || '').trim().toLowerCase();
        const phone = (payload.phone || '').trim();
        const password = (payload.password || '').trim();

        const isInspector = payload.role === 'inspector' || (payload.authority && payload.authority.toLowerCase().includes('inspector'));

        // Check if user already exists in Supabase
        if (supabase) {
          try {
            const { data: existingSu } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
            if (existingSu && !isInspector) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'An account with this email already exists in the database. Please sign in.' }));
              return;
            }
          } catch(e) {}
        }

        let cloudUsers = [];
        try {
          cloudUsers = await fetchCloudUsers();
        } catch(e) {}

        const allRegistered = [...(db.registeredUsers || [])];
        cloudUsers.forEach(cu => {
          if (!allRegistered.find(r => r.email.toLowerCase() === cu.email.toLowerCase())) {
            allRegistered.push(cu);
          }
        });

        const existingRegisteredIdx = allRegistered.findIndex(u => (u.email || '').toLowerCase().trim() === email);

        if (existingRegisteredIdx >= 0 && !isInspector) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Email already exists' }));
          return;
        }

        // Dynamically check if this is the very 1st user in Supabase
        let isFirst = false;
        if (!isInspector && !payload.role) {
          if (supabase) {
            try {
              const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
              isFirst = (count === 0 || count === null);
            } catch(e) {
              isFirst = (allRegistered.length === 0);
            }
          } else {
            isFirst = (allRegistered.length === 0);
          }
        }

        const newUser = {
          id: payload.id || ('u_' + Date.now()),
          name: name || 'User',
          email,
          phone,
          password,
          role: isInspector ? 'inspector' : (isFirst ? 'admin' : (payload.role || 'citizen')),
          department: (payload.department || '').trim(),
          departmentName: (payload.departmentName || payload.department_name || '').trim(),
          authority: isInspector ? (payload.authority || ('Ward Inspector (PIN: ' + (payload.assignedPin || payload.pin || '570001') + ')')) : (isFirst ? 'Super Admin' : (payload.authority || (payload.role === 'officer' ? 'Officer' : 'Customer'))),
          assignedPin: (payload.assignedPin || payload.pin || '').trim(),
          assignedArea: (payload.assignedArea || payload.area || '').trim(),
          designation: isFirst ? 'Super Administrator' : (payload.designation || (isInspector ? 'Ward Health Inspector' : (payload.role === 'officer' ? 'Executive Officer' : 'Citizen'))),
          createdBy: (payload.createdBy || payload.created_by || '').trim(),
          status: 'Active',
          createdAt: new Date().toISOString()
        };

        if (!db.registeredUsers) db.registeredUsers = [];
        const localIdx = db.registeredUsers.findIndex(u => (u.email || '').toLowerCase().trim() === email);
        if (localIdx >= 0) {
          db.registeredUsers[localIdx] = newUser;
        } else {
          db.registeredUsers.push(newUser);
        }
        saveDB(db);

        // Supabase DB & Auth Persistence
        if (supabase) {
          try {
            await supabase.from('users').upsert(mapUserToDb(newUser));
            await supabase.auth.admin.createUser({
              email: newUser.email,
              password: newUser.password || '123456',
              email_confirm: true,
              user_metadata: {
                name: newUser.name,
                role: newUser.role,
                phone: newUser.phone,
                department: newUser.department,
                assigned_pin: newUser.assignedPin
              }
            }).catch(() => {});
          } catch(e) {}
        }

        const cloudIdx = cloudUsers.findIndex(u => (u.email || '').toLowerCase().trim() === email);
        if (cloudIdx >= 0) {
          cloudUsers[cloudIdx] = newUser;
        } else {
          cloudUsers.push(newUser);
        }
        persistCloudUsers(cloudUsers).catch(() => {});

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: newUser }));
      });
      return;
    }

    if (pathname.includes('/auth/users')) {
      let cloudUsers = [];
      try {
        cloudUsers = await fetchCloudUsers();
      } catch(e) {}
      const combined = [...SYSTEM_ACCOUNTS];

      // Fetch from Supabase
      if (supabase) {
        try {
          const { data: suUsers } = await supabase.from('users').select('*');
          if (Array.isArray(suUsers)) {
            suUsers.forEach(row => {
              const u = mapDbToUser(row);
              if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
                combined.push(u);
              }
            });
          }
        } catch(e) {}
      }

      cloudUsers.forEach(u => {
        if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
          combined.push(u);
        }
      });
      (db.registeredUsers || []).forEach(u => {
        if (!combined.find(c => c.email.toLowerCase() === u.email.toLowerCase())) {
          combined.push(u);
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(combined.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        password: u.password || (u.passwords && u.passwords[0]) || '123456',
        role: u.role,
        authority: u.authority,
        department: u.department || '',
        departmentName: u.departmentName || u.department_name || '',
        assignedPin: u.assignedPin || u.assigned_pin || u.pin || '',
        assignedArea: u.assignedArea || u.assigned_area || '',
        designation: u.designation || '',
        createdBy: u.createdBy || u.created_by || '',
        status: u.status || 'Active'
      }))));
      return;
    }

    // 1. Dashboard Stats
    if (pathname === '/api/dashboard/stats' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ stats: db.stats, hotspots: db.hotspots }));
      return;
    }

    // 2. Applications
    if (pathname === '/api/applications') {
      if (method === 'GET') {
        let apps = db.applications || [];
        if (supabase) {
          try {
            const { data: suApps } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
            if (Array.isArray(suApps) && suApps.length > 0) {
              apps = suApps.map(mapDbToApp);
              db.applications = apps;
            }
          } catch(e) {}
        }

        const query = parsedUrl.query || {};
        if (query.inspector) {
          const insEmail = query.inspector.toLowerCase().trim();
          apps = apps.filter(a => (a.assignedInspectorEmail || '').toLowerCase() === insEmail || (a.auditedBy || '').toLowerCase() === insEmail);
        }
        if (query.pin) {
          const p = String(query.pin).trim();
          apps = apps.filter(a => String(a.pincode || a.pin || '').trim() === p || String(a.pincode || a.pin || '').startsWith(p));
        }
        if (query.authority) {
          const authKey = query.authority.toLowerCase().trim();
          apps = apps.filter(a => (a.authorityKey || '').toLowerCase() === authKey);
        }
        if (query.email) {
          const userEmail = query.email.toLowerCase().trim();
          apps = apps.filter(a => (a.email || '').toLowerCase() === userEmail);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(apps));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const item = JSON.parse(body || '{}');
          
          // Check if application is new or updating existing
          const existingAppIdx = item.id ? db.applications.findIndex(a => a.id === item.id) : -1;

          // Helper to check terminal/finalized status
          const isFinalized = (st) => {
            if (!st) return false;
            const s = String(st).trim().toLowerCase();
            return s === 'approved' || s === 'issued' || s === 'certificate issued' || s === 'cancelled' || s === 'rejected';
          };

          // If submitting a new complaint, enforce single active complaint rule
          if (existingAppIdx < 0) {
            const reqPhone = String(item.phone || '').trim();
            const reqEmail = String(item.email || '').toLowerCase().trim();
            const reqName = String(item.applicantName || '').toLowerCase().trim();

            const activeExisting = (db.applications || []).find(a => {
              if (isFinalized(a.status)) return false;
              const aEmail = String(a.email || '').toLowerCase().trim();
              const aPhone = String(a.phone || '').trim();
              const aName = String(a.applicantName || a.applicant_name || '').toLowerCase().trim();

              if (reqEmail && aEmail && aEmail === reqEmail) return true;
              if (reqPhone && aPhone && reqPhone.length >= 10 && aPhone === reqPhone && reqName && aName && reqName === aName) return true;
              return false;
            });

            if (activeExisting) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Active complaint already in progress',
                message: `You already have an active complaint (${activeExisting.id}) with status "${activeExisting.status || 'In Progress'}". You can only apply once until the inspector, panchayat officer, or admin approves or cancels it.`
              }));
              return;
            }
          }

          item.id = item.id || ('#MCC' + new Date().getFullYear() + Math.floor(100000 + Math.random() * 900000));
          const baseApp = existingAppIdx >= 0 ? db.applications[existingAppIdx] : {};
          const mergedItem = { ...baseApp, ...item };

          const pin = String(mergedItem.pincode || mergedItem.pin || '570001').trim();
          mergedItem.pin = pin;
          mergedItem.pincode = pin;
          mergedItem.status = mergedItem.status || 'Pending Inspection';
          mergedItem.lat = mergedItem.lat || 12.2958;
          mergedItem.lng = mergedItem.lng || 76.6394;
          mergedItem.gpsLocation = mergedItem.gpsLocation || `${mergedItem.lat}° N, ${mergedItem.lng}° E`;
          mergedItem.mapUrl = mergedItem.mapUrl || `https://www.google.com/maps?q=${mergedItem.lat},${mergedItem.lng}`;
          mergedItem.photos = mergedItem.photos || (mergedItem.photo ? [mergedItem.photo] : []);
          mergedItem.photo = mergedItem.photo || (mergedItem.photos && mergedItem.photos[0]) || null;
          mergedItem.submittedAt = mergedItem.submittedAt || new Date().toISOString();

          // Fetch all inspectors from Cloud, Supabase & memory
          let allInspectors = [];
          try {
            const cloudUsers = await fetchCloudUsers();
            if (Array.isArray(cloudUsers)) {
              cloudUsers.filter(u => u.role === 'inspector').forEach(ins => allInspectors.push(ins));
            }
          } catch(e) {}

          if (supabase) {
            try {
              const { data: suUsers } = await supabase.from('users').select('*');
              if (Array.isArray(suUsers)) {
                suUsers.map(mapDbToUser).filter(u => u.role === 'inspector').forEach(ins => {
                  if (!allInspectors.some(ai => (ai.email || '').toLowerCase() === (ins.email || '').toLowerCase())) {
                    allInspectors.push(ins);
                  }
                });
              }
            } catch(e) {}
          }
          (db.registeredUsers || []).filter(u => u.role === 'inspector').forEach(ins => {
            if (!allInspectors.some(ai => (ai.email || '').toLowerCase() === (ins.email || '').toLowerCase())) {
              allInspectors.push(ins);
            }
          });

          // Dynamic PIN routing
          const GP_PINS = ['570026', '571130', '570028', '571311', '571201', '571186', '571101', '571120', '571124', '571125'];
          const TP_PINS = ['570018', '570017', '570027', '571607', '571604', '571602', '571610'];

          let resolvedAuthKey = '';
          let resolvedAuthName = '';
          let resolvedInspName = '';
          let resolvedInspEmail = '';
          let resolvedOfficerEmail = '';

          // 1. Check if a custom registered inspector has this PIN assigned
          const customPinMatch = allInspectors.find(ins => {
            const insPin = String(ins.assignedPin || ins.pin || '').trim();
            if (!insPin) return false;
            const pList = insPin.split(/[\s,]+/).map(p => p.trim());
            return pList.some(p => p && (p === pin || pin.startsWith(p) || p.startsWith(pin)));
          });

          if (customPinMatch) {
            const insDept = (customPinMatch.department || '').toLowerCase();
            const insDeptName = (customPinMatch.departmentName || '').toLowerCase();
            if (insDept === 'gp' || insDept.includes('panchayat') || insDeptName.includes('panchayat')) {
              resolvedAuthKey = 'gp';
              resolvedAuthName = 'Gram Panchayat (Bogadi Rural)';
              resolvedOfficerEmail = 'gp@gmail.com';
            } else if (insDept === 'tp' || insDept.includes('town') || insDeptName.includes('town')) {
              resolvedAuthKey = 'tp';
              resolvedAuthName = 'Town Panchayat (Hootagalli Town)';
              resolvedOfficerEmail = 'tp@gmail.com';
            } else {
              resolvedAuthKey = 'mcc';
              resolvedAuthName = 'Mysuru Municipal Corporation (MCC Urban)';
              resolvedOfficerEmail = 'mcc@gmail.com';
            }
            resolvedInspName = customPinMatch.name;
            resolvedInspEmail = customPinMatch.email;
          } else {
            // Check default pin ranges with exact officer and inspector credentials
            const isGp = GP_PINS.some(p => pin.startsWith(p) || p.startsWith(pin) || pin === p);
            const isTp = TP_PINS.some(p => pin.startsWith(p) || p.startsWith(pin) || pin === p);

            if (isGp) {
              resolvedAuthKey = 'gp';
              resolvedAuthName = 'Gram Panchayat (Bogadi Rural)';
              resolvedOfficerEmail = 'gp@gmail.com';
              if (pin === '571130') {
                resolvedInspName = 'Basavarajappa M.';
                resolvedInspEmail = 'basava.gp@gmail.com';
              } else if (pin === '571311') {
                resolvedInspName = 'S. Nanjappa';
                resolvedInspEmail = 'nanjappa.gp@gmail.com';
              } else if (pin === '570028') {
                resolvedInspName = 'Dimple';
                resolvedInspEmail = 'dim@gmail.com';
              } else {
                resolvedInspName = 'Seervi';
                resolvedInspEmail = 'q@gmail.com';
              }
            } else if (isTp) {
              resolvedAuthKey = 'tp';
              resolvedAuthName = 'Town Panchayat (Hootagalli Town)';
              resolvedOfficerEmail = 'tp@gmail.com';
              if (pin === '570017') {
                resolvedInspName = 'Manjunatha Rao';
                resolvedInspEmail = 'manju.tp@gmail.com';
              } else if (pin === '570027') {
                resolvedInspName = 'Prashanth G.';
                resolvedInspEmail = 'prashanth.tp@gmail.com';
              } else if (pin === '571607' || pin === '571604') {
                resolvedInspName = 'K. Suresh';
                resolvedInspEmail = 'suresh.tp@gmail.com';
              } else {
                resolvedInspName = 'M. Anand';
                resolvedInspEmail = 'anand.tp@gmail.com';
              }
            } else {
              resolvedAuthKey = 'mcc';
              resolvedAuthName = 'Mysuru Municipal Corporation (MCC Urban)';
              resolvedOfficerEmail = 'mcc@gmail.com';
              if (pin === '570002') {
                resolvedInspName = 'S. Swamy';
                resolvedInspEmail = 'swamy.mcc@gmail.com';
              } else if (pin === '570004') {
                resolvedInspName = 'Divya Shankar';
                resolvedInspEmail = 'divya.mcc@gmail.com';
              } else if (pin === '570023') {
                resolvedInspName = 'P. Ramesh';
                resolvedInspEmail = 'ramesh.mcc@gmail.com';
              } else {
                resolvedInspName = 'Rajesh Kumar';
                resolvedInspEmail = 'inspector.mcc@gmail.com';
              }
            }

            // Check if any custom inspector is registered in that department
            const deptInspector = allInspectors.find(ins => {
              const d = (ins.department || '').toLowerCase();
              const dn = (ins.departmentName || '').toLowerCase();
              return d === resolvedAuthKey || (resolvedAuthKey === 'gp' && (d.includes('panchayat') || dn.includes('panchayat'))) || (resolvedAuthKey === 'tp' && (d.includes('town') || dn.includes('town')));
            });
            if (deptInspector && !resolvedInspEmail) {
              resolvedInspName = deptInspector.name;
              resolvedInspEmail = deptInspector.email;
            }
          }

          // If explicit assignment was sent from frontend resolver, prioritize it
          if (item.assignedInspectorEmail) {
            resolvedInspEmail = item.assignedInspectorEmail;
            resolvedInspName = item.assignedInspectorName || resolvedInspName;
            resolvedAuthKey = item.authorityKey || resolvedAuthKey;
            resolvedAuthName = item.authority || resolvedAuthName;
            resolvedOfficerEmail = item.assignedOfficerEmail || resolvedOfficerEmail;
          }

          // If this is an existing app update, keep existing assigned metadata if present
          if (existingAppIdx >= 0 && baseApp.assignedInspectorEmail && !item.assignedInspectorEmail) {
            resolvedAuthKey = baseApp.authorityKey || resolvedAuthKey;
            resolvedAuthName = baseApp.authority || resolvedAuthName;
            resolvedInspName = baseApp.assignedInspectorName || resolvedInspName;
            resolvedInspEmail = baseApp.assignedInspectorEmail || resolvedInspEmail;
            resolvedOfficerEmail = baseApp.assignedOfficerEmail || resolvedOfficerEmail;
          }

          mergedItem.authorityKey = resolvedAuthKey;
          mergedItem.authority = resolvedAuthName;
          mergedItem.assignedInspectorName = resolvedInspName;
          mergedItem.assignedInspectorEmail = resolvedInspEmail;
          mergedItem.assignedOfficerEmail = resolvedOfficerEmail;

          // Ensure bulk photos array is strictly preserved
          if (Array.isArray(item.photos) && item.photos.length > 0) {
            mergedItem.photos = item.photos;
          } else if (item.photo) {
            mergedItem.photos = [item.photo];
          } else if (!mergedItem.photos || !Array.isArray(mergedItem.photos)) {
            mergedItem.photos = mergedItem.photo ? [mergedItem.photo] : [];
          }
          mergedItem.photo = (mergedItem.photos && mergedItem.photos[0]) || mergedItem.photo || null;

          // Upsert to Supabase
          if (supabase) {
            try {
              await supabase.from('applications').upsert(mapAppToDb(mergedItem));
            } catch(e) {}
          }

          // Update applications collection
          if (existingAppIdx >= 0) {
            db.applications[existingAppIdx] = mergedItem;
          } else {
            db.applications.unshift(mergedItem);
          }

          // Auto-create/sync inspection record
          if (!db.inspections) db.inspections = [];
          const inspId = 'INSP-' + (mergedItem.id.replace(/[^0-9]/g, '').slice(-4) || Math.floor(100 + Math.random() * 900));
          const inspectionRecord = {
            id: inspId,
            caseId: mergedItem.id,
            applicationId: mergedItem.id,
            applicantName: mergedItem.applicantName || 'Citizen',
            phone: mergedItem.phone || '',
            siteAddress: mergedItem.address || 'Mysuru Site',
            address: mergedItem.address || 'Mysuru Site',
            pin: mergedItem.pin,
            pincode: mergedItem.pincode,
            gpsLocation: mergedItem.gpsLocation,
            lat: mergedItem.lat,
            lng: mergedItem.lng,
            mapUrl: mergedItem.mapUrl,
            inspector: mergedItem.assignedInspectorName,
            assignedInspectorName: mergedItem.assignedInspectorName,
            assignedInspectorEmail: mergedItem.assignedInspectorEmail,
            authorityKey: mergedItem.authorityKey,
            authority: mergedItem.authority,
            date: mergedItem.inspectionTime ? new Date(mergedItem.inspectionTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ('Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            time: mergedItem.inspectionTime ? new Date(mergedItem.inspectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: mergedItem.status,
            photo: mergedItem.photo,
            photos: mergedItem.photos,
            propertyDetails: mergedItem.propertyId || 'Residential Site',
            tonnage: mergedItem.tonnage || '10 MT',
            inspectorNotes: mergedItem.inspectorNotes || '',
            documents: 'Khatta & Site Blueprint Validated'
          };
          
          const existingInspIdx = db.inspections.findIndex(i => i.caseId === mergedItem.id || i.applicationId === mergedItem.id);
          if (existingInspIdx >= 0) {
            db.inspections[existingInspIdx] = { ...db.inspections[existingInspIdx], ...inspectionRecord };
          } else {
            db.inspections.unshift(inspectionRecord);
          }

          // Update stats
          db.stats.totalApplications = db.applications.length;
          db.stats.pendingInspections = db.inspections.filter(i => i.status !== 'Approved' && i.status !== 'Completed').length;
          db.stats.pendingDebris = db.applications.filter(a => a.status !== 'Approved').length;

          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item: mergedItem, inspection: inspectionRecord }));
        });
        return;
      }
    }

    // 3. PIN Code & Area Mapping
    if (pathname === '/api/pin-mappings') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.pinMappings));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.pinMappings.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 4. Authorities
    if (pathname === '/api/authorities') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.authorities));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.authorities.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 5. Inspectors / Field Officers
    if (pathname === '/api/inspectors') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.inspectors));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.empId = item.empId || 'INS-' + Math.floor(100 + Math.random() * 900);
          db.inspectors.push(item);
          db.stats.activeOfficers += 1;
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 6. Inspection Management
    if (pathname === '/api/inspections') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.inspections));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.inspections.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 7. Demolition Requests
    if (pathname === '/api/demolition-requests') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.demolitionRequests));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.requestId = 'DEM-2026-' + Math.floor(100 + Math.random() * 900);
          db.demolitionRequests.unshift(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 8. Demolition Status
    if (pathname === '/api/demolition-status') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.demolitionStatus));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.demolitionStatus.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 9. Certificates
    if (pathname === '/api/certificates') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.certificates));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.certificateId = 'CERT-CD-MYS-' + Math.floor(1000 + Math.random() * 9000);
          item.issueDate = new Date().toISOString().split('T')[0];
          db.certificates.unshift(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 10. Water / Electricity Benefits
    if (pathname === '/api/utilities') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.utilities));
        return;
      }
    }

    // 11. Notifications
    if (pathname === '/api/notifications') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.notifications));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          item.timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
          item.status = 'Delivered';
          db.notifications.unshift(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 12. Reports & Analytics
    if (pathname === '/api/reports') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.reports));
        return;
      }
    }

    // 13. Users (Returns real registered users & customers)
    if (pathname === '/api/users') {
      if (method === 'GET') {
        let cloudUsers = [];
        try {
          cloudUsers = await fetchCloudUsers();
        } catch(e) {}
        const combined = [...(db.registeredUsers || [])];
        cloudUsers.forEach(cu => {
          if (!combined.find(r => (r.email || '').toLowerCase().trim() === (cu.email || '').toLowerCase().trim())) {
            combined.push(cu);
          }
        });
        const users = combined.map(u => ({
          name: u.name,
          role: u.authority || (u.role === 'admin' ? 'Admin' : 'Customer'),
          phone: u.phone || 'N/A',
          email: u.email,
          area: u.department || (u.role === 'admin' ? 'Mysuru Municipal Authority' : 'Mysuru Citizen Portal'),
          permissions: u.role === 'admin' ? 'Full System & Inspection Rights' : 'Lodge & Track Debris Clearances',
          status: 'Active'
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const item = JSON.parse(body || '{}');
          db.users.push(item);
          saveDB(db);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        });
        return;
      }
    }

    // 14. Settings
    if (pathname === '/api/settings') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.settings));
        return;
      }
      if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const updated = JSON.parse(body || '{}');
          db.settings = { ...db.settings, ...updated };
          saveDB(db);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, settings: db.settings }));
        });
        return;
      }
    }
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, pathname === '/' ? 'src/index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'src', pathname);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Smart Civic Waste Routing Backend Server running on http://localhost:${PORT}`);
});
