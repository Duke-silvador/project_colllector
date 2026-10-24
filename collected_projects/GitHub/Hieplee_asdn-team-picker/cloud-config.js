// Firebase web config is public client metadata, not a secret.
// Populate these values from Firebase Console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: 'AIzaSyAWM7cnbNatxoA71oTk3RsgVLCsKlaDjrA',
  authDomain: 'asdn-team-picker.firebaseapp.com',
  projectId: 'asdn-team-picker',
  appId: '1:975616668410:web:b34db5b094f888f2ae0f43',
};

// Organizers who may edit. Keep in sync with firestore.rules.
// 57BKT... = hiepbrse@gmail.com, kEkdL... = khanhtrandhp@gmail.com, ig2pU... = highlandart89@gmail.com
export const organizerUids = ['57BKTGPZoDaIc2wChRWut3NBf6E3', 'kEkdLPY3kLWPCVBJG8112W1yDlB3', 'ig2pUINnEgZX4HzXbCRyjtvKQ2E3', 'ZCJPrmNKeXQBx6O56iUcwKoLupz2'];

// System admin: the only account allowed to read the audit log (auditLog collection). Keep in sync with firestore.rules.
// 57BKT... = hiepbrse@gmail.com
export const adminUid = '57BKTGPZoDaIc2wChRWut3NBf6E3';
