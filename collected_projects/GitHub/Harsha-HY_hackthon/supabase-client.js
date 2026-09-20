// Universal Real-Time Supabase Client & Cross-Device Data Sync
// Smart Civic C&D Waste Management Platform — Mysuru

(function() {
  const SUPABASE_URL = 'https://evnjukozsucobknwvzfp.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2bmp1a296c3Vjb2Jrbnd2emZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTc3MjA1MywiZXhwIjoyMTA1MzQ4MDUzfQ.OzV3s8TKPGefQPdAKfMEUwKFYJwa4cYH6vsl7E9uGKk';

  let suClient = null;

  function initClient() {
    if (suClient) return suClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        suClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        console.log('⚡ Connected to Supabase Cloud Database');
      } catch(err) {
        console.warn('Could not initialize Supabase client:', err);
      }
    }
    return suClient;
  }

  // Row mappings
  function mapAppToDb(app) {
    const userEmail = (app.email || '').trim().toLowerCase();
    let propId = app.propertyId || app.property_id || '';
    if (userEmail && !propId.includes('||usr:')) {
      propId = (propId ? propId + ' ' : '') + '||usr:' + userEmail;
    }

    const photosList = Array.isArray(app.photos) ? app.photos : (app.photo ? [app.photo] : []);

    return {
      id: app.id,
      applicant_name: app.applicantName || app.applicant_name,
      phone: app.phone,
      pincode: app.pincode || app.pin,
      address: app.address,
      property_id: propId,
      certificate_no: app.certificateNo || app.certificate_no,
      certificate_type: app.certificateType || app.certificate_type,
      issue_date: app.issueDate || app.issue_date,
      status: app.status || 'Pending Inspection',
      tonnage: Number(app.tonnage) || 10,
      gps_location: app.gpsLocation || app.gps_location,
      lat: Number(app.lat) || 12.2958,
      lng: Number(app.lng) || 76.6394,
      map_url: app.mapUrl || app.map_url,
      photos: photosList,
      photo: app.photo || (photosList.length > 0 ? photosList[0] : null),
      authority: app.authority,
      authority_key: app.authorityKey || app.authority_key,
      assigned_inspector_name: app.assignedInspectorName || app.assigned_inspector_name,
      assigned_inspector_email: app.assignedInspectorEmail || app.assigned_inspector_email,
      inspector_notes: app.inspectorNotes || app.inspector_notes,
      inspection_time: app.inspectionTime || app.inspection_time || null,
      audited_by: app.auditedBy || app.audited_by,
      audited_at: app.auditedAt || app.audited_at || null,
      created_at: app.submittedAt || app.createdAt || new Date().toISOString()
    };
  }

  function mapDbToApp(row) {
    let rawPropId = row.property_id || '';
    let email = '';
    if (rawPropId.includes('||usr:')) {
      const parts = rawPropId.split('||usr:');
      rawPropId = parts[0].trim();
      email = parts[1].trim();
    }

    const photosList = Array.isArray(row.photos) ? row.photos : (row.photo ? [row.photo] : []);

    return {
      id: row.id,
      applicantName: row.applicant_name,
      phone: row.phone,
      email: email,
      pincode: row.pincode,
      pin: row.pincode,
      address: row.address,
      propertyId: rawPropId,
      certificateNo: row.certificate_no,
      certificateType: row.certificate_type,
      issueDate: row.issue_date,
      status: row.status,
      tonnage: row.tonnage,
      gpsLocation: row.gps_location,
      lat: row.lat,
      lng: row.lng,
      mapUrl: row.map_url,
      photos: photosList,
      photo: row.photo || (photosList.length > 0 ? photosList[0] : null),
      authority: row.authority,
      authorityKey: row.authority_key,
      assignedInspectorName: row.assigned_inspector_name,
      assignedInspectorEmail: row.assigned_inspector_email,
      inspectorNotes: row.inspector_notes,
      inspectionTime: row.inspection_time,
      auditedBy: row.audited_by,
      auditedAt: row.audited_at,
      submittedAt: row.created_at
    };
  }

  function mapUserToDb(u) {
    return {
      id: u.id || ('u_' + Date.now()),
      name: u.name,
      email: (u.email || '').toLowerCase().trim(),
      phone: u.phone || '',
      password: u.password || '',
      role: u.role || 'citizen',
      department: u.department || '',
      department_name: u.departmentName || u.department_name || '',
      assigned_pin: u.assignedPin || u.assigned_pin || u.pin || '',
      assigned_area: u.assignedArea || u.assigned_area || '',
      designation: u.designation || '',
      created_by: u.createdBy || u.created_by || '',
      status: u.status || 'Active',
      created_at: u.createdAt || new Date().toISOString()
    };
  }

  function mapDbToUser(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      password: row.password,
      role: row.role,
      department: row.department,
      departmentName: row.department_name,
      assignedPin: row.assigned_pin,
      pin: row.assigned_pin,
      assignedArea: row.assigned_area,
      designation: row.designation,
      createdBy: row.created_by,
      status: row.status,
      createdAt: row.created_at
    };
  }

  window.civicDb = {
    getClient: initClient,

    // Applications CRUD
    async fetchApplications() {
      const client = initClient();
      let apps = [];
      if (client) {
        try {
          const { data, error } = await client.from('applications').select('*').order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            apps = data.map(mapDbToApp);
            localStorage.setItem('civic_applications', JSON.stringify(apps));
            return apps;
          }
        } catch(e) {
          console.warn('Supabase fetchApplications error:', e);
        }
      }

      // Fallback to local storage or API
      try {
        const res = await fetch('/api/applications');
        if (res.ok) {
          const apiApps = await res.json();
          if (Array.isArray(apiApps)) {
            localStorage.setItem('civic_applications', JSON.stringify(apiApps));
            return apiApps;
          }
        }
      } catch(e) {}

      return JSON.parse(localStorage.getItem('civic_applications') || '[]');
    },

    async saveApplication(app) {
      const dbRow = mapAppToDb(app);
      const client = initClient();

      if (client) {
        try {
          const { error } = await client.from('applications').upsert(dbRow);
          if (error) console.warn('Supabase upsert application warning:', error.message);
        } catch(e) {
          console.warn('Supabase save error:', e);
        }
      }

      // Also call API if online
      try {
        await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app)
        });
      } catch(e) {}

      // Update LocalStorage
      const apps = JSON.parse(localStorage.getItem('civic_applications') || '[]');
      const idx = apps.findIndex(a => a.id === app.id);
      if (idx >= 0) {
        apps[idx] = { ...apps[idx], ...app };
      } else {
        apps.unshift(app);
      }
      localStorage.setItem('civic_applications', JSON.stringify(apps));
      return app;
    },

    // Users Auth & CRUD
    async login(email, password) {
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanPass = (password || '').trim();
      const client = initClient();

      if (client) {
        try {
          const { data, error } = await client.from('users').select('*').eq('email', cleanEmail).maybeSingle();
          if (!error && data) {
            const user = mapDbToUser(data);
            if (user.password === cleanPass) {
              return { success: true, user };
            }
          }
        } catch(e) {
          console.warn('Supabase login error:', e);
        }
      }

      // Fallback to API
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) return data;
        }
      } catch(e) {}

      return { success: false, message: 'Invalid email or password.' };
    },

    async registerUser(userData) {
      const client = initClient();
      const dbUser = mapUserToDb(userData);

      if (client) {
        try {
          const { error } = await client.from('users').upsert(dbUser);
          if (error) console.warn('Supabase register error:', error.message);
        } catch(e) {
          console.warn('Supabase registerUser error:', e);
        }
      }

      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      } catch(e) {}

      return { success: true, user: userData };
    },

    async fetchUsers() {
      const client = initClient();
      if (client) {
        try {
          const { data, error } = await client.from('users').select('*').order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            return data.map(mapDbToUser);
          }
        } catch(e) {}
      }
      return [];
    },

    // Realtime Subscriptions
    subscribeToApplications(onChange) {
      const client = initClient();
      if (!client) return null;
      try {
        const channel = client.channel('realtime_applications_' + Date.now())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
            console.log('🔄 Live Database Change Detected:', payload.eventType);
            if (typeof onChange === 'function') onChange(payload);
          })
          .subscribe();
        return channel;
      } catch(e) {
        console.warn('Realtime subscription error:', e);
        return null;
      }
    }
  };

  // Auto initialize on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClient);
  } else {
    initClient();
  }
})();
