
const SUPABASE_URL = 'https://xshvxbzbmjfnefvmceof.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-ld2MZvNdc95Od-S_5-iWQ_MaX5ejpe';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyo_H1CIyy-k0HGQmxq_36-sh7MDQo_DwtFws_nvj3tXVXtnEm42WOLH9eM7P8A4RU3ag/exec';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);

let currentUser = null;
let signupMode = false;

function getToday() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

$('date').min = getToday();

// Show authentication panel
function showAuth() {
  $('authPanel').hidden = false;
  $('authPanel').scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

// Refresh signed-in user
async function refreshUser() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error('Session error:', error.message);
    return;
  }

  currentUser = data.session?.user ?? null;
  $('authToggle').textContent = currentUser ? 'Sign Out' : 'Sign In';
}

// Sign in / sign out
$('authToggle').addEventListener('click', async () => {
  if (currentUser) {
    const { error } = await db.auth.signOut();

    if (error) {
      $('authMessage').textContent = error.message;
      return;
    }

    currentUser = null;
    $('authToggle').textContent = 'Sign In';
    $('authPanel').hidden = true;
    $('authMessage').textContent = 'You have signed out.';
  } else {
    showAuth();
  }
});

// Switch between signup and login
$('authMode').addEventListener('click', () => {
  signupMode = !signupMode;

  $('authName').hidden = !signupMode;
  $('authName').required = signupMode;

  $('authSubmit').textContent = signupMode
    ? 'Create Account'
    : 'Sign In';

  $('authMode').textContent = signupMode
    ? 'Already registered? Sign in'
    : 'Need an account? Sign up';

  $('authMessage').textContent = '';
});

// Keep user state updated
db.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  $('authToggle').textContent = currentUser ? 'Sign Out' : 'Sign In';
});

// Signup and login
$('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  $('authSubmit').disabled = true;
  $('authMessage').textContent = 'Please wait...';

  try {
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;

    const result = signupMode
      ? await db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: $('authName').value.trim() }
          }
        })
      : await db.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;

    if (signupMode && !result.data.session) {
      $('authMessage').textContent =
        'Account created. Check your email to confirm it, then sign in.';
    } else {
      currentUser = result.data.user ?? result.data.session?.user ?? null;
      $('authMessage').textContent = 'Authentication successful!';
      $('authPanel').hidden = true;
      await refreshUser();
    }
  } catch (error) {
    $('authMessage').textContent =
      error.message || 'Authentication failed.';
  } finally {
    $('authSubmit').disabled = false;
  }
});

// Send booking to Google Sheets
async function sendToGoogleSheets(booking) {
  if (
    !GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/macros/s/') ||
    !GOOGLE_SCRIPT_URL.endsWith('/exec')
  ) {
    console.warn('Google Sheets URL has not been configured.');
    return false;
  }

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(booking)
    });

    // no-cors means the browser cannot read Google's response.
    // Verify the new row in Google Sheets.
    return true;
  } catch (error) {
    console.error('Google Sheets request failed:', error);
    return false;
  }
}

// Submit restaurant booking
$('bookingForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const button = $('bookingForm').querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;
  $('bookingMessage').textContent = 'Submitting reservation...';

  try {
    await refreshUser();

    if (!currentUser) {
      $('bookingMessage').textContent =
        'Please sign in before making a reservation.';
      showAuth();
      return;
    }

    const bookingDate = $('date').value;

    if (!bookingDate || bookingDate < getToday()) {
      throw new Error('Please select today or a future date.');
    }

    const booking = {
      user_id: currentUser.id,
      customer_name: $('customerName').value.trim(),
      email: currentUser.email,
      phone: $('phone').value.trim(),
      booking_date: bookingDate,
      booking_time: $('time').value,
      guests: Number($('guests').value),
      status: 'pending'
    };

    // Save to Supabase first
    const { data, error } = await db
      .from('bookings')
      .insert(booking)
      .select()
      .single();

    if (error) throw error;

    // Then send the saved record to Google Sheets
    const sheetPayload = {
      booking_id: data.id,
      customer_name: data.customer_name,
      email: data.email,
      phone: data.phone,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      guests: data.guests,
      status: data.status,
      created_at: data.created_at
    };

    $('bookingMessage').textContent =
      `Booking saved! Reference: ${data.id.slice(0, 8)}. Syncing spreadsheet...`;

    await sendToGoogleSheets(sheetPayload);

    $('bookingMessage').textContent =
      `Reservation saved in Supabase! Reference: ${data.id.slice(0, 8)}. Status: Pending. Check Google Sheets to verify the sync.`;

    $('bookingForm').reset();
    $('date').min = getToday();

  } catch (error) {
    console.error('Booking error:', error);
    $('bookingMessage').textContent =
      error.message || 'Could not save your reservation.';
  } finally {
    button.disabled = false;
  }
});

// Initialize
refreshUser();
