// SkillLoop front end
//
// How this file is organised:
//   1. Sample data   (later you will replace this with calls to your Spring Boot API)
//   2. Small helper functions
//   3. Matching logic
//   4. Screens       (each function returns the HTML for one page)
//   5. Button actions (the functions the buttons in the HTML call)
//   6. Login
//
// Nothing is saved: refresh the page and the sample data comes back.


/* ============ 1. SAMPLE DATA ============ */

const skillSuggestions = [
  'Java Basics', 'Frontend Development', 'DSA Basics', 'UI/UX', 'Video Editing',
  'Cloud Computing', 'Photoshop', 'Figma Prototyping', 'Python', 'Public Speaking',
  'Excel', 'Content Writing'
];

const DAY = 24 * 60 * 60 * 1000;

// a date a few days from now, at 5 pm (negative number = in the past)
function daysFromNow(n) {
  const d = new Date(Date.now() + n * DAY);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

// ratingSum / ratingCount = average rating
const users = [
  { id: 1, name: 'Mohit', course: 'B.Tech CSE, MUJ',
    offers: ['Java Basics', 'Frontend Development', 'DSA Basics'],
    wants: ['UI/UX', 'Video Editing', 'Cloud Computing'],
    credits: 4, ratingSum: 29, ratingCount: 6 },

  { id: 2, name: 'Rohan Mehta', course: 'B.Des, 2nd year',
    offers: ['UI/UX', 'Figma Prototyping'],
    wants: ['Java Basics', 'DSA Basics'],
    credits: 2, ratingSum: 14, ratingCount: 3 },

  { id: 3, name: 'Ananya Rao', course: 'BA Mass Communication, 3rd year',
    offers: ['Video Editing', 'Photoshop'],
    wants: ['Frontend Development', 'Figma Prototyping'],
    credits: 5, ratingSum: 38, ratingCount: 8 },

  { id: 4, name: 'Dev Malhotra', course: 'B.Tech ECE, 2nd year',
    offers: ['Photoshop', 'Public Speaking'],
    wants: ['DSA Basics', 'Python'],
    credits: 3, ratingSum: 0, ratingCount: 0 },

  { id: 5, name: 'Meera Iyer', course: 'B.Tech IT, 4th year',
    offers: ['Cloud Computing', 'Python'],
    wants: ['Photoshop', 'Public Speaking'],
    credits: 6, ratingSum: 23, ratingCount: 5 }
];

// A request is sent BY "from" TO "to".
//   teach = the skill "from" teaches "to"
//   learn = the skill "from" learns back from "to"
const requests = [
  { id: 1, fromId: 2, toId: 1, teach: 'UI/UX', learn: 'Java Basics', status: 'pending' }
];

// A session is one lesson. status is 'to schedule', 'scheduled' or 'done'.
const sessions = [
  { id: 1, teacherId: 3, learnerId: 1, skill: 'Video Editing', when: daysFromNow(2), status: 'scheduled', rated: false },
  { id: 2, teacherId: 1, learnerId: 3, skill: 'Frontend Development', when: null, status: 'to schedule', rated: false },
  { id: 3, teacherId: 5, learnerId: 1, skill: 'Cloud Computing', when: daysFromNow(-3), status: 'done', rated: false }
];

// things that change while the app runs
let me = null;              // the logged-in user
let page = 'dashboard';     // which tab is open
let signupMode = false;     // is the login form in "create account" mode?
let nextId = 100;           // ids for new requests / sessions / users
const proposedLoops = [];   // loops the user has already proposed


/* ============ 2. HELPER FUNCTIONS ============ */

// shortcut: $('#view') finds the element with id="view"
function $(selector) {
  return document.querySelector(selector);
}

function getUser(id) {
  return users.find(u => u.id === id);
}

function firstName(user) {
  return user.name.split(' ')[0];
}

// "Java" and "java " count as the same skill
function sameSkill(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// skills that appear in both lists
function commonSkills(list1, list2) {
  return list1.filter(skill => list2.some(other => sameSkill(skill, other)));
}

// Anything a user typed must go through this before it is put into HTML.
// Otherwise someone could type <script> as their name and break the page.
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function initials(name) {
  return name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
  });
}

function ratingText(user) {
  if (user.ratingCount === 0) return '-';
  return (user.ratingSum / user.ratingCount).toFixed(1);
}

// adds "s" unless the number is 1: "1 request", "2 requests"
function s(n) {
  return n === 1 ? '' : 's';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

// small HTML pieces used in several screens
function avatar(user) {
  return `<div class="avatar color${user.id % 5}">${esc(initials(user.name))}</div>`;
}

function skillTags(list, kind) {
  return list.map(skill => `<span class="tag ${kind}">${esc(skill)}</span>`).join('');
}

// white box with rows inside, or a dashed "nothing here" box
function listBox(rows, emptyMessage) {
  if (rows.length === 0) {
    return `<p class="empty">${emptyMessage}</p>`;
  }
  return `<div class="panel list">${rows.join('')}</div>`;
}


/* ============ 3. MATCHING LOGIC ============ */
// This is only here so the demo works.
// The real matching engine belongs in your Java backend.

// Direct match: they want something I offer AND offer something I want.
function findMatches() {
  const matches = [];

  for (const other of users) {
    if (other.id === me.id) continue;

    const iTeach = commonSkills(me.offers, other.wants);
    const theyTeach = commonSkills(other.offers, me.wants);

    if (iTeach.length > 0 && theyTeach.length > 0) {
      matches.push({ user: other, iTeach: iTeach, theyTeach: theyTeach });
    }
  }
  return matches;
}

// Loop: me -> B -> C -> me.  I teach B, B teaches C, C teaches me.
function findLoops() {
  const loops = [];

  for (const b of users) {
    if (b.id === me.id) continue;
    const skill1 = commonSkills(me.offers, b.wants)[0];
    if (!skill1) continue;

    for (const c of users) {
      if (c.id === me.id || c.id === b.id) continue;
      const skill2 = commonSkills(b.offers, c.wants)[0];
      const skill3 = commonSkills(c.offers, me.wants)[0];
      if (!skill2 || !skill3) continue;

      loops.push([
        { to: b, skill: skill1 },
        { to: c, skill: skill2 },
        { to: me, skill: skill3 }
      ]);
    }
  }
  return loops;
}

// a short id for a loop, like "4-5-1", so buttons can refer to it
function loopKey(loop) {
  return loop.map(step => step.to.id).join('-');
}

function hasPendingRequest(userId) {
  return requests.some(r =>
    r.status === 'pending' &&
    ((r.fromId === me.id && r.toId === userId) || (r.fromId === userId && r.toId === me.id))
  );
}

// my sessions, unfinished ones first
function mySessions() {
  const mine = sessions.filter(x => x.teacherId === me.id || x.learnerId === me.id);
  const open = mine.filter(x => x.status !== 'done');
  const done = mine.filter(x => x.status === 'done');
  return open.concat(done);
}


/* ============ 4. SCREENS ============ */

// Redraws the whole page. Called after every change.
function render() {
  // highlight the current tab
  document.querySelectorAll('.nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.page === page);
  });

  $('#credits').textContent = me.credits;
  $('#who').textContent = firstName(me);

  if (page === 'dashboard') $('#view').innerHTML = dashboardScreen();
  if (page === 'matches') $('#view').innerHTML = matchesScreen();
  if (page === 'exchanges') $('#view').innerHTML = exchangesScreen();
  if (page === 'profile') $('#view').innerHTML = profileScreen();
}

function dashboardScreen() {
  const matches = findMatches();
  const waiting = requests.filter(r => r.toId === me.id && r.status === 'pending').length;

  // sessions not finished, or finished but I still have to rate
  const needAttention = mySessions().filter(x =>
    x.status !== 'done' || (x.learnerId === me.id && !x.rated)
  );

  return `
    <div class="hero">
      <h1>Hi ${esc(firstName(me))}</h1>
      <p>You have ${matches.length} direct match${matches.length === 1 ? '' : 'es'} and ${waiting} request${s(waiting)} waiting for your reply.</p>
      <button class="btn yellow" onclick="showPage('matches')">See your matches</button>
    </div>

    <div class="stats">
      <div class="stat blue"><span>Credits</span><strong>${me.credits}</strong></div>
      <div class="stat yellow"><span>Your rating</span><strong>${ratingText(me)}</strong></div>
      <div class="stat green"><span>Direct matches</span><strong>${matches.length}</strong></div>
      <div class="stat pink"><span>Requests waiting</span><strong>${waiting}</strong></div>
    </div>

    <h2>Sessions that need you</h2>
    ${listBox(needAttention.map(sessionRow), 'Nothing to do right now. Check your matches to find someone to swap with.')}
  `;
}

function matchesScreen() {
  const matchRows = findMatches().map(match => {
    const u = match.user;
    const pending = hasPendingRequest(u.id);

    let ratingLine = '';
    if (u.ratingCount > 0) {
      ratingLine = `<div class="grey">Rated ${ratingText(u)} from ${u.ratingCount} session${s(u.ratingCount)}</div>`;
    }

    return `
      <div class="row match">
        <div class="person">
          ${avatar(u)}
          <div>
            <strong>${esc(u.name)}</strong>
            <div class="grey">${esc(u.course || 'Student')}</div>
            ${ratingLine}
          </div>
        </div>

        <div class="swap">
          <div><small>You teach</small>${skillTags(match.iTeach, 'teach')}</div>
          <div><small>${esc(firstName(u))} teaches</small>${skillTags(match.theyTeach, 'learn')}</div>
        </div>

        <button class="btn small" onclick="sendRequest(${u.id})" ${pending ? 'disabled' : ''}>
          ${pending ? 'Request pending' : 'Request swap'}
        </button>
      </div>`;
  });

  const loopRows = findLoops().map(loop => {
    const key = loopKey(loop);
    const alreadyProposed = proposedLoops.includes(key);

    // the picture: You  ->  Dev  ->  Meera  ->  You
    let chain = `<div class="person small">${avatar(me)}<span>You</span></div>`;
    for (const step of loop) {
      const name = step.to.id === me.id ? 'You' : firstName(step.to);
      chain += `
        <div class="arrow">${esc(step.skill)} &rarr;</div>
        <div class="person small">${avatar(step.to)}<span>${esc(name)}</span></div>`;
    }

    return `
      <div class="row">
        <div class="chain">${chain}</div>
        <div class="loop-footer">
          <p>You teach ${esc(loop[0].skill)} to ${esc(firstName(loop[0].to))}.
             ${esc(firstName(loop[0].to))} teaches ${esc(loop[1].skill)} to ${esc(firstName(loop[1].to))}.
             ${esc(firstName(loop[1].to))} teaches you ${esc(loop[2].skill)}.</p>
          <button class="btn small" onclick="proposeLoop('${key}')" ${alreadyProposed ? 'disabled' : ''}>
            ${alreadyProposed ? 'Loop proposed' : 'Propose this loop'}
          </button>
        </div>
      </div>`;
  });

  return `
    <h1>Matches</h1>
    <p class="grey">Found from the skills on your profile.</p>

    <h2>Direct swaps</h2>
    ${listBox(matchRows, 'No direct matches yet. Add more skills to your profile.')}

    <h2>Exchange loops</h2>
    <p class="grey">When nobody matches you directly, three people can pass skills around in a circle.</p>
    ${listBox(loopRows, 'No loops found at the moment.')}
  `;
}

// one line in the requests list
function requestRow(r) {
  const from = getUser(r.fromId);
  const to = getUser(r.toId);

  // a request someone sent to me
  if (r.toId === me.id) {
    let buttons = '';
    if (r.status === 'pending') {
      buttons = `
        <div class="buttons">
          <button class="btn small" onclick="acceptRequest(${r.id})">Accept</button>
          <button class="btn small outline" onclick="declineRequest(${r.id})">Decline</button>
        </div>`;
    }
    return `
      <div class="row request">
        <div><strong>${esc(from.name)}</strong> will teach you <strong>${esc(r.teach)}</strong> if you teach <strong>${esc(r.learn)}</strong>.</div>
        ${buttons}
      </div>`;
  }

  // a request I sent
  let badgeColor = 'yellow';
  if (r.status === 'accepted') badgeColor = 'green';
  if (r.status === 'declined') badgeColor = 'pink';

  return `
    <div class="row request">
      <div>You offered <strong>${esc(r.teach)}</strong> to ${esc(to.name)} in return for <strong>${esc(r.learn)}</strong>.</div>
      <span class="badge ${badgeColor}">${r.status}</span>
    </div>`;
}

// one line in the sessions list
function sessionRow(session) {
  const iAmTeacher = session.teacherId === me.id;
  const other = getUser(iAmTeacher ? session.learnerId : session.teacherId);

  let title;
  if (iAmTeacher) {
    title = `You teach ${esc(session.skill)} to ${esc(firstName(other))}`;
  } else {
    title = `${esc(firstName(other))} teaches you ${esc(session.skill)}`;
  }

  let badge = '';
  let rightSide = '';

  if (session.status === 'to schedule') {
    badge = '<span class="badge yellow">Needs a time</span>';
    rightSide = `
      <input type="datetime-local" id="when-${session.id}">
      <button class="btn small" onclick="scheduleSession(${session.id})">Set time</button>`;

  } else if (session.status === 'scheduled') {
    badge = '<span class="badge">Scheduled</span>';
    rightSide = `
      <span>${formatDate(session.when)}</span>
      <button class="btn small" onclick="completeSession(${session.id})">Mark complete</button>`;

  } else {
    badge = '<span class="badge green">Completed</span>';
    const credit = iAmTeacher ? '+1 credit' : '-1 credit';

    if (iAmTeacher) {
      rightSide = `<span class="grey">${credit}</span>`;
    } else if (session.rated) {
      rightSide = `<span class="grey">You rated ${session.rating}/5 (${credit})</span>`;
    } else {
      let stars = '';
      for (let n = 1; n <= 5; n++) {
        stars += `<button onclick="rateSession(${session.id}, ${n})">${n}</button>`;
      }
      rightSide = `<span class="stars">Rate ${esc(firstName(other))}: ${stars}</span>`;
    }
  }

  return `
    <div class="row session">
      <div>
        <div><strong>${title}</strong></div>
        ${badge}
      </div>
      <div class="session-right">${rightSide}</div>
    </div>`;
}

function exchangesScreen() {
  const forMe = requests.filter(r => r.toId === me.id && r.status === 'pending');
  const sentByMe = requests.filter(r => r.fromId === me.id);

  return `
    <h1>Exchanges</h1>
    <p class="grey">Requests you received or sent, and the sessions that came out of them.</p>

    <h2>Requests for you</h2>
    ${listBox(forMe.map(requestRow), 'No requests waiting.')}

    <h2>Requests you sent</h2>
    ${listBox(sentByMe.map(requestRow), 'You have not sent any requests yet.')}

    <h2>Sessions</h2>
    ${listBox(mySessions().map(sessionRow), 'Accepted requests turn into sessions here.')}
  `;
}

// the "I can teach" and "I want to learn" boxes on the profile page
// listName is either 'offers' or 'wants'
function skillBox(title, listName, items, tagKind) {
  let tags = '';
  items.forEach((skill, index) => {
    tags += `<span class="tag ${tagKind}">${esc(skill)}<button onclick="removeSkill('${listName}', ${index})" aria-label="Remove ${esc(skill)}">&times;</button></span>`;
  });
  if (items.length === 0) tags = '<p class="grey">Nothing here yet.</p>';

  return `
    <div class="panel">
      <h2>${title}</h2>
      <div>${tags}</div>
      <form class="add-skill" onsubmit="addSkill(event, '${listName}')">
        <input type="text" name="skill" list="skill-options" placeholder="Add a skill" required>
        <button class="btn small" type="submit">Add</button>
      </form>
    </div>`;
}

function profileScreen() {
  return `
    <h1>Profile</h1>
    <p class="grey">Rating ${ratingText(me)} from ${me.ratingCount} session${s(me.ratingCount)}. You have ${me.credits} credit${s(me.credits)}.</p>

    <div class="panel">
      <form class="details" onsubmit="saveDetails(event)">
        <label>Name <input type="text" name="fullName" value="${esc(me.name)}" required></label>
        <label>Course and year <input type="text" name="course" value="${esc(me.course)}" placeholder="B.Tech CSE, 2nd year"></label>
        <button class="btn small" type="submit">Save</button>
      </form>
    </div>

    <h2>Skills</h2>
    <div class="profile-grid">
      ${skillBox('I can teach', 'offers', me.offers, 'teach')}
      ${skillBox('I want to learn', 'wants', me.wants, 'learn')}
    </div>
  `;
}


/* ============ 5. BUTTON ACTIONS ============ */
// Each function below is called by a button's onclick in the HTML above.
// They change the data, then call render() to redraw the page.

function showPage(name) {
  page = name;
  render();
  window.scrollTo(0, 0);
}

function sendRequest(userId) {
  const other = getUser(userId);

  requests.push({
    id: nextId++,
    fromId: me.id,
    toId: other.id,
    teach: commonSkills(me.offers, other.wants)[0],
    learn: commonSkills(other.offers, me.wants)[0],
    status: 'pending'
  });

  showToast('Request sent to ' + firstName(other));
  render();
}

function acceptRequest(requestId) {
  const r = requests.find(x => x.id === requestId);
  r.status = 'accepted';

  // an accepted swap becomes two sessions, one in each direction
  sessions.push({ id: nextId++, teacherId: r.fromId, learnerId: r.toId, skill: r.teach, when: null, status: 'to schedule', rated: false });
  sessions.push({ id: nextId++, teacherId: r.toId, learnerId: r.fromId, skill: r.learn, when: null, status: 'to schedule', rated: false });

  showToast('Accepted. Pick a time for each session.');
  render();
}

function declineRequest(requestId) {
  requests.find(x => x.id === requestId).status = 'declined';
  render();
}

function scheduleSession(sessionId) {
  const value = $('#when-' + sessionId).value;

  if (value === '') return showToast('Pick a date and time first');
  if (new Date(value) < new Date()) return showToast('Choose a time in the future');

  const session = sessions.find(x => x.id === sessionId);
  session.when = new Date(value).toISOString();
  session.status = 'scheduled';

  showToast('Session scheduled');
  render();
}

// In the real app both students should confirm. Here one click is enough.
function completeSession(sessionId) {
  const session = sessions.find(x => x.id === sessionId);
  session.status = 'done';

  getUser(session.teacherId).credits += 1;   // teacher earns a credit
  getUser(session.learnerId).credits -= 1;   // learner spends one

  showToast('Session completed');
  render();
}

function rateSession(sessionId, score) {
  const session = sessions.find(x => x.id === sessionId);
  session.rated = true;
  session.rating = score;

  const teacher = getUser(session.teacherId);
  teacher.ratingSum += score;
  teacher.ratingCount += 1;

  showToast('Thanks, your rating is saved');
  render();
}

function proposeLoop(key) {
  proposedLoops.push(key);
  showToast('Loop proposed');
  render();
}

function addSkill(event, listName) {
  event.preventDefault();
  const skill = event.target.skill.value.trim();
  const list = me[listName];

  if (list.some(existing => sameSkill(existing, skill))) {
    return showToast(skill + ' is already in this list');
  }
  list.push(skill);
  render();
}

function removeSkill(listName, index) {
  me[listName].splice(index, 1);
  render();
}

function saveDetails(event) {
  event.preventDefault();
  const form = event.target;

  me.name = form.fullName.value.trim() || me.name;
  me.course = form.course.value.trim();

  showToast('Details saved');
  render();
}


/* ============ 6. LOGIN ============ */

function toggleAuth() {
  signupMode = !signupMode;

  $('#name-field').hidden = !signupMode;
  $('#auth-title').textContent = signupMode ? 'Create your account' : 'Log in';
  $('#auth-submit').textContent = signupMode ? 'Create account' : 'Log in';
  $('#auth-switch-text').textContent = signupMode ? 'Already have an account?' : 'New here?';
  $('#auth-switch').textContent = signupMode ? 'Log in' : 'Create an account';
}

function signIn(event) {
  event.preventDefault();

  if (signupMode) {
    const name = $('#signup-name').value.trim();
    if (name === '') return showToast('Enter your name to create an account');

    me = { id: nextId++, name: name, course: '', offers: [], wants: [], credits: 3, ratingSum: 0, ratingCount: 0 };
    users.push(me);
    page = 'profile';
  } else {
    me = users[0];      // demo login: always Mohit
    page = 'dashboard';
  }

  $('#auth-screen').hidden = true;
  $('#app').hidden = false;
  render();
}

function logout() {
  me = null;
  $('#app').hidden = true;
  $('#auth-screen').hidden = false;
  $('#auth-form').reset();
  if (signupMode) toggleAuth();
}


/* ============ START ============ */

// fill the suggestion list that appears when typing a skill
$('#skill-options').innerHTML = skillSuggestions.map(skill => `<option value="${skill}">`).join('');
