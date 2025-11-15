/* Configuration */
const ENDPOINT = window.ENDPOINT_URL || '';
const STATE = { token: sessionStorage.getItem('admintoken') || '' };

/* Elements */
const form = document.getElementById('rsvpForm');
const msg = document.getElementById('formMsg');
const tableBody = document.querySelector('#guestTable tbody');
const search = document.getElementById('search');
const statusFilter = document.getElementById('statusFilter');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const adminNav = document.getElementById('adminNav');
const pinModal = document.getElementById('pinModal');
const adminBtn = document.getElementById('adminBtn');
const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pin');
const pinMsg = document.getElementById('pinMsg');
const logoutBtn = document.getElementById('logoutBtn');
const adminSections = document.querySelectorAll('.admin-only');
const addWedding = document.getElementById('addWedding');
const addReception = document.getElementById('addReception');
const addMandap = document.getElementById('addMandap');
const addSangeet = document.getElementById('addSangeet');
const pinCancel = document.getElementById('pinCancel');

/* Utils */
const qs = (sel) => document.querySelector(sel);
const toast = (el, text, good=true) => { 
  if(!el) return; 
  el.textContent = text; 
  el.style.color = good ? '#0f766e' : '#b91c1c'; 
};

function csvEncode(rows) { 
  return rows.map(r => r.map(x => `"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n'); 
}

function arrivalStr(g) { 
  return g.arrivalSummary || `${g.arrivalDate || ''} ${g.arrivalTime || ''}`.trim(); 
}

/* ICS Calendar */
function makeICS({title, start, end, location, description}) {
  const uid = 'wedding-' + Math.random().toString(36).slice(2) + '@site';
  const dtStamp = new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
  const fmt = s => s.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Wedding//ManishArti//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    `UID:${uid}`,`DTSTAMP:${dtStamp}`,'TZID:Asia/Kolkata',
    `DTSTART;TZID=Asia/Kolkata:${fmt(start)}`,
    `DTEND;TZID=Asia/Kolkata:${fmt(end)}`,
    `SUMMARY:${title}`,`LOCATION:${location}`,`DESCRIPTION:${(description||'').replace(/\n/g,'\\n')}`,'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([lines], {type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = (title.replace(/\s+/g,'_').toLowerCase()) + '.ics'; 
  a.click(); 
  URL.revokeObjectURL(url);
}

addMandap?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Mandap and Haldi Kalash', 
  start:'2024-11-30T17:00:00', 
  end:'2024-11-30T21:00:00', 
  location:'286, Chankyapuri, Garikhana, Danapur-Khagaul Road, Patna, Bihar', 
  description:'Mandap and Haldi Kalash ceremony at residence in Patna.' 
}));

addSangeet?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Sangeet', 
  start:'2024-12-04T18:00:00', 
  end:'2024-12-04T23:00:00', 
  location:'Gokul Party Plot, Ankleshwar, Gujarat', 
  description:'Sangeet ceremony at Gokul Party Plot, Ankleshwar.' 
}));

addWedding?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Wedding', 
  start:'2025-12-05T19:00:00', 
  end:'2025-12-05T23:59:00', 
  location:'J24V+87 Ankleshwar, Gujarat, India', 
  description:'Wedding & Varmala — Ankleshwar (Plus Code: J24V+87).' 
}));

addReception?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Reception', 
  start:'2025-12-12T19:00:00', 
  end:'2025-12-12T22:30:00', 
  location:'Patna New Club, Patna, Bihar, India', 
  description:'Reception — Patna New Club.' 
}));

/* Fetch helper */
async function post(payload) {
  if (!ENDPOINT) {
    console.error('Missing ENDPOINT_URL');
    return { ok:false, error:'Missing ENDPOINT_URL' };
  }
  
  try {
    const r = await fetch(ENDPOINT, { 
      method:'POST', 
      headers:{'Content-Type':'text/plain;charset=utf-8'}, 
      body: JSON.stringify(payload),
      mode: 'cors'
    });
    
    if (!r.ok) {
      return { ok:false, error:`Server error: ${r.status}` };
    }
    
    const data = await r.json();
    return data;
  } catch(e) { 
    console.error('Fetch error:', e);
    return { ok:false, error:'Network error. Please check your connection and try again.' }; 
  }
}

/* Admin gating */
function setAdminVisible(on) {
  adminSections.forEach(s => s.style.display = on ? '' : 'none');
  if (adminNav) adminNav.style.display = on ? '' : 'none';
  if (on) sessionStorage.setItem('admintoken', STATE.token||''); 
  else sessionStorage.removeItem('admintoken');
}

setAdminVisible(!!STATE.token);
adminBtn?.addEventListener('click', () => { pinModal.showModal(); pinInput.focus(); });
logoutBtn?.addEventListener('click', () => { 
  STATE.token=''; 
  setAdminVisible(false); 
  toast(qs('#adminMsg'), 'Locked', true); 
});

/* Auth */
pinForm?.addEventListener('submit', async (e) => {
  if (e.submitter && e.submitter.value === 'unlock') {
    e.preventDefault();
    pinMsg.textContent = '';
    const pinVal = pinInput.value.trim();
    if (!pinVal) return toast(pinMsg, 'PIN required', false);
    const data = await post({ action:'auth', pin: pinVal });
    if (!data.ok) return toast(pinMsg, data.error || 'Auth failed', false);
    STATE.token = data.token; 
    setAdminVisible(true); 
    pinModal.close(); 
    pinInput.value=''; 
    
    // Show success message in admin section
    toast(qs('#adminMsg'), '✓ Admin access granted', true);
    
    await loadGuests();
  }
});

pinCancel?.addEventListener('click', () => {
  pinModal.close();
  pinInput.value='';
  pinMsg.textContent='';
});

pinModal?.addEventListener('click', (e)=> {
  if (e.target === pinModal) { 
    pinModal.close(); 
    pinInput.value=''; 
    pinMsg.textContent=''; 
  }
});

/* RSVP */
let isSubmitting = false;

/* Dynamic form section handlers */
document.addEventListener('DOMContentLoaded', () => {
  const arrivalMode = document.getElementById('arrivalMode');
  const departureMode = document.getElementById('departureMode');

  // Handle arrival mode changes
  arrivalMode?.addEventListener('change', (e) => {
    const mode = e.target.value;
    
    // Hide all arrival sections
    document.getElementById('arrivalFlightSection').style.display = 'none';
    document.getElementById('arrivalTrainSection').style.display = 'none';
    document.getElementById('arrivalCarSection').style.display = 'none';
    
    // Show relevant section
    if (mode === 'Flight') {
      document.getElementById('arrivalFlightSection').style.display = 'block';
      document.getElementById('arrivalFlightTime').required = true;
      document.getElementById('arrivalAirport').required = true;
    } else if (mode === 'Train') {
      document.getElementById('arrivalTrainSection').style.display = 'block';
      document.getElementById('arrivalTrainTime').required = true;
      document.getElementById('arrivalStation').required = true;
    } else if (mode === 'Car') {
      document.getElementById('arrivalCarSection').style.display = 'block';
      document.getElementById('arrivalLocation').required = true;
    }
    
    resetRequiredFields('arrival', mode);
  });

  // Handle departure mode changes
  departureMode?.addEventListener('change', (e) => {
    const mode = e.target.value;
    
    // Hide all departure sections
    document.getElementById('departureFlightSection').style.display = 'none';
    document.getElementById('departureTrainSection').style.display = 'none';
    document.getElementById('departureCarSection').style.display = 'none';
    
    // Show relevant section
    if (mode === 'Flight') {
      document.getElementById('departureFlightSection').style.display = 'block';
    } else if (mode === 'Train') {
      document.getElementById('departureTrainSection').style.display = 'block';
    } else if (mode === 'Car') {
      document.getElementById('departureCarSection').style.display = 'block';
    }
  });

  // Handle "Other" options
  document.getElementById('arrivalAirport')?.addEventListener('change', handleOtherOption);
  document.getElementById('departureAirport')?.addEventListener('change', handleOtherOption);
  document.getElementById('arrivalStation')?.addEventListener('change', handleOtherOption);
  document.getElementById('departureStation')?.addEventListener('change', handleOtherOption);
  document.getElementById('arrivalLocation')?.addEventListener('change', handleOtherOption);
  document.getElementById('departureLocation')?.addEventListener('change', handleOtherOption);

  function handleOtherOption(e) {
    const selectId = e.target.id;
    const isOther = e.target.value === 'Other';
    let otherGroupId, otherInputId;
    
    if (selectId.includes('Airport')) {
      otherGroupId = selectId.replace('Airport', 'AirportOtherGroup');
      otherInputId = selectId.replace('Airport', 'AirportOther');
    } else if (selectId.includes('Station')) {
      otherGroupId = selectId.replace('Station', 'StationOtherGroup');
      otherInputId = selectId.replace('Station', 'StationOther');
    } else if (selectId.includes('Location')) {
      otherGroupId = selectId.replace('Location', 'LocationOtherGroup');
      otherInputId = selectId.replace('Location', 'LocationOther');
    }
    
    const otherGroup = document.getElementById(otherGroupId);
    const otherInput = document.getElementById(otherInputId);
    
    if (otherGroup && otherInput) {
      otherGroup.style.display = isOther ? 'block' : 'none';
      otherInput.required = isOther && selectId.startsWith('arrival');
      if (!isOther) otherInput.value = '';
      if (isOther) otherInput.focus();
    }
  }

  function resetRequiredFields(type, selectedMode) {
    const modes = ['Flight', 'Train', 'Car'];
    modes.forEach(mode => {
      if (mode !== selectedMode) {
        const fields = document.querySelectorAll(`#${type}${mode}Section input[required], #${type}${mode}Section select[required]`);
        fields.forEach(field => field.required = false);
      }
    });
  }
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (isSubmitting) return;
  isSubmitting = true;
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">⏳</span> Sending...';
  
  const arrivalMode = document.getElementById('arrivalMode').value;
  const departureMode = document.getElementById('departureMode').value;
  
  const payload = { 
    name: document.getElementById('name').value.trim(), 
    phone: document.getElementById('phone').value.trim(), 
    guests: parseInt(document.getElementById('guests').value || '1', 10),
    arrivalDate: document.getElementById('arrivalDate').value,
    arrivalMode: arrivalMode,
    departureDate: document.getElementById('departureDate').value,
    departureMode: departureMode,
    notes: document.getElementById('notes').value.trim(),
    status: 'Pending'
  };

  // Add arrival details based on mode
  if (arrivalMode === 'Flight') {
    const airport = document.getElementById('arrivalAirport').value;
    payload.arrivalTime = document.getElementById('arrivalFlightTime').value;
    payload.arrivalNumber = document.getElementById('arrivalFlightNumber').value.trim();
    payload.arrivalLocation = airport === 'Other' ? 
      document.getElementById('arrivalAirportOther').value.trim() : airport;
  } else if (arrivalMode === 'Train') {
    const station = document.getElementById('arrivalStation').value;
    payload.arrivalTime = document.getElementById('arrivalTrainTime').value;
    payload.arrivalNumber = document.getElementById('arrivalTrainNumber').value.trim();
    payload.arrivalLocation = station === 'Other' ? 
      document.getElementById('arrivalStationOther').value.trim() : station;
  } else if (arrivalMode === 'Car') {
    const location = document.getElementById('arrivalLocation').value;
    payload.arrivalTime = document.getElementById('arrivalCarTime').value;
    payload.arrivalNumber = '';
    payload.arrivalLocation = location === 'Other' ? 
      document.getElementById('arrivalLocationOther').value.trim() : location;
  }

  // Add departure details based on mode
  if (departureMode === 'Flight') {
    const airport = document.getElementById('departureAirport').value;
    payload.departureTime = document.getElementById('departureFlightTime').value;
    payload.departureNumber = document.getElementById('departureFlightNumber').value.trim();
    payload.departureLocation = airport === 'Other' ? 
      document.getElementById('departureAirportOther').value.trim() : airport;
  } else if (departureMode === 'Train') {
    const station = document.getElementById('departureStation').value;
    payload.departureTime = document.getElementById('departureTrainTime').value;
    payload.departureNumber = document.getElementById('departureTrainNumber').value.trim();
    payload.departureLocation = station === 'Other' ? 
      document.getElementById('departureStationOther').value.trim() : station;
  } else if (departureMode === 'Car') {
    const location = document.getElementById('departureLocation').value;
    payload.departureTime = document.getElementById('departureCarTime').value;
    payload.departureNumber = '';
    payload.departureLocation = location === 'Other' ? 
      document.getElementById('departureLocationOther').value.trim() : location;
  }
  
  if (!payload.name || !/^[+]?\d[\d\s-]{7,15}$/.test(payload.phone)) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    isSubmitting = false;
    return toast(msg, 'Please enter valid name and phone', false);
  }
  
  const data = await post({ action: 'rsvp', payload });
  
  if (!data.ok) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    isSubmitting = false;
    return toast(msg, data.error || 'Could not save', false);
  }
  
  form.reset(); 
  document.querySelectorAll('.conditional-section').forEach(section => {
    section.style.display = 'none';
  });
  document.querySelectorAll('[id$="OtherGroup"]').forEach(group => {
    group.style.display = 'none';
  });
  
  submitBtn.disabled = false;
  submitBtn.innerHTML = '✓ Sent!';
  toast(msg, '✓ Details sent! See you soon.'); 
  
  setTimeout(() => {
    submitBtn.textContent = originalText;
  }, 3000);
  
  if (STATE.token) await loadGuests();
  
  setTimeout(() => { isSubmitting = false; }, 2000);
});

/* Admin table */
function toRow(g) {
  const tr = document.createElement('tr'); 
  tr.dataset.id = g.id;
  
  // Format dates nicely
  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    // Check if valid date
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year: 'numeric'});
  };
  
  // Format time properly - extract just HH:MM from various formats
  const formatTime = (t) => {
    if (!t) return '';
    
    // If it's already in HH:MM format, return as-is
    if (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) {
      return t;
    }
    
    // If it's a date/time string from Google Sheets
    try {
      const date = new Date(t);
      if (isNaN(date.getTime())) return t; // Return original if invalid
      
      // Extract hours and minutes
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (e) {
      return t; // Return original on error
    }
  };
  
  tr.innerHTML = `
    <td>${g.name}</td>
    <td>${g.phone}</td>
    <td>${g.guests||1}</td>
    <td>${formatDate(g.arrivalDate)}</td>
    <td>${g.arrivalMode||''}</td>
    <td>${formatTime(g.arrivalTime)}</td>
    <td>${g.arrivalNumber||''}</td>
    <td>${g.arrivalLocation||''}</td>
    <td>${formatDate(g.departureDate)}</td>
    <td>${g.departureMode||''}</td>
    <td>${formatTime(g.departureTime)}</td>
    <td>${g.departureNumber||''}</td>
    <td>${g.departureLocation||''}</td>
    <td><input value="${g.hotel||''}" class="cell-input" data-k="hotel"/></td>
    <td><input value="${g.room||''}" class="cell-input" data-k="room"/></td>
    <td><select class="cell-input" data-k="status">
      ${['Pending','Arrived','Checked-in'].map(s=>`<option ${g.status===s?'selected':''}>${s}</option>`).join('')}
    </select></td>
    <td><textarea class="cell-input" data-k="notes" rows="1">${g.notes||''}</textarea></td>
    <td><button class="link danger" data-act="del">✕</button></td>`;
  
  return tr;
}

async function loadGuests() {
  if (!STATE.token) return;
  const data = await post({ action:'list', token: STATE.token });
  if (!data.ok) return toast(qs('#adminMsg'), data.error || 'Load failed', false);
  const q = (search?.value || '').toLowerCase(), sf = statusFilter?.value || '';
  const rows = (data.rows || []).filter(g => {
    const t = [g.name,g.phone,g.city,g.hotel,g.notes].join(' ').toLowerCase();
    return (!q || t.includes(q)) && (!sf || g.status === sf);
  }).map(toRow);
  tableBody.innerHTML = ''; 
  rows.forEach(r => tableBody.appendChild(r));
}

tableBody?.addEventListener('input', async (e) => {
  const tr = e.target.closest('tr'); 
  if (!tr) return;
  await post({ action:'update', token: STATE.token, payload:{ id: tr.dataset.id, [e.target.dataset.k]: e.target.value } });
});

tableBody?.addEventListener('click', async (e) => {
  if (!e.target.matches('[data-act="del"]')) return;
  const tr = e.target.closest('tr'); 
  await post({ action:'delete', token: STATE.token, id: tr.dataset.id }); 
  tr.remove();
});

search?.addEventListener('input', loadGuests); 
statusFilter?.addEventListener('change', loadGuests);

/* Auto-open admin if ?admin=1 present */
if (new URLSearchParams(location.search).get('admin') === '1') { 
  adminBtn?.click(); 
}

/* === Language Toggle === */
const langToggle = document.getElementById('langToggle');

function applyLang(lang) {
  console.log('applyLang called with:', lang);
  
  if (!window.I18N) {
    console.error('I18N not loaded! Retrying in 500ms...');
    setTimeout(() => applyLang(lang), 500);
    return;
  }
  
  console.log('I18N available:', Object.keys(window.I18N));
  
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  localStorage.setItem('lang', lang);
  
  // Helper function to get nested value from object
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
  
  // Translate text content
  const elementsToTranslate = document.querySelectorAll('[data-i18n]');
  console.log('Found elements to translate:', elementsToTranslate.length);
  
  let translatedCount = 0;
  elementsToTranslate.forEach(el => {
    const k = el.getAttribute('data-i18n');
    const val = getNestedValue(dict, k) || getNestedValue(I18N.en, k) || '';
    
    if (val) {
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
      translatedCount++;
      console.log(`✓ Translated "${k}" to "${val}"`);
    } else {
      console.warn(`✗ Missing translation for key: ${k}`);
    }
  });
  
  console.log(`Successfully translated ${translatedCount} out of ${elementsToTranslate.length} elements`);
  
  // Translate placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    const val = getNestedValue(dict, k) || getNestedValue(I18N.en, k) || '';
    if (val) {
      el.placeholder = val;
      console.log(`✓ Translated placeholder "${k}" to "${val}"`);
    } else {
      console.warn(`✗ Missing placeholder translation for key: ${k}`);
    }
  });
  
  // Button label - show opposite language (what you'll switch TO)
  if (langToggle) {
    langToggle.textContent = lang === 'en' ? 'हिं' : 'EN';
    langToggle.setAttribute('aria-label', lang === 'en' ? 'Switch to Hindi' : 'Switch to English');
    langToggle.title = lang === 'en' ? 'Switch to Hindi' : 'Switch to English';
  }
  
  console.log('Translation complete for language:', lang);
}

langToggle?.addEventListener('click', () => {
  const current = document.documentElement.dataset.lang || 'en';
  const next = current === 'en' ? 'hi' : 'en';
  console.log('Language toggle clicked, switching from', current, 'to', next);
  applyLang(next);
});

// More aggressive initialization - try multiple times
let initAttempts = 0;
function initializeLanguage() {
  initAttempts++;
  console.log(`Language initialization attempt ${initAttempts}`);
  
  if (window.I18N) {
    console.log('I18N found! Applying language...');
    const storedLang = localStorage.getItem('lang') || 'en';
    applyLang(storedLang);
  } else if (initAttempts < 10) {
    console.log('I18N not ready, retrying in 200ms...');
    setTimeout(initializeLanguage, 200);
  } else {
    console.error('Failed to load I18N after 10 attempts');
  }
}

// Start trying immediately when DOM is ready
document.addEventListener('DOMContentLoaded', initializeLanguage);

// Also try when window loads (backup)
window.addEventListener('load', () => {
  if (!window.I18N) {
    console.log('Window loaded but I18N still missing, trying again...');
    setTimeout(initializeLanguage, 100);
  }
});

/* === Background Audio === */
document.addEventListener('DOMContentLoaded', () => {
  const bgAudio = document.getElementById('bgAudio');
  const audioToggle = document.getElementById('audioToggle');

  if (!bgAudio || !audioToggle) return;

  const TARGET_VOL = 0.6;
  bgAudio.loop = true;
  bgAudio.preload = 'auto';
  bgAudio.volume = 0; // Start at 0 for fade-in
  
  // Track if music was manually paused by user
  let wasMusicPlaying = false;
  
  function updateAudioBtn() {
    const playing = !bgAudio.paused;
    audioToggle.textContent = playing ? '⏸' : '▶';
    audioToggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    audioToggle.title = playing ? 'Pause music' : 'Play music';
    audioToggle.classList.toggle('needs-user', bgAudio.paused);
  }

  function fadeIn() {
    let vol = 0;
    bgAudio.volume = 0;
    const step = () => {
      vol += 0.02;
      bgAudio.volume = Math.min(vol, TARGET_VOL);
      if(vol < TARGET_VOL) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function fadeOut() {
    let vol = bgAudio.volume;
    const step = () => {
      vol -= 0.05;
      bgAudio.volume = Math.max(vol, 0);
      if(vol > 0) requestAnimationFrame(step);
      else bgAudio.pause();
    };
    requestAnimationFrame(step);
  }

  // Listen to audio events to update button state
  bgAudio.addEventListener('play', updateAudioBtn);
  bgAudio.addEventListener('pause', updateAudioBtn);
  bgAudio.addEventListener('ended', updateAudioBtn);

  // Auto-play attempt on page load
  function attemptAutoPlay() {
    console.log('Attempting to auto-play music...');
    bgAudio.play()
      .then(() => {
        console.log('✓ Music auto-play successful');
        fadeIn();
        updateAudioBtn();
      })
      .catch(e => {
        console.log('✗ Music auto-play blocked by browser:', e.name);
        audioToggle.classList.add('needs-user');
        updateAudioBtn();
      });
  }

  attemptAutoPlay();
  setTimeout(attemptAutoPlay, 500);

  // Manual toggle
  audioToggle.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    audioToggle.classList.remove('needs-user');
    
    if (bgAudio.paused) {
      try { 
        await bgAudio.play();
        fadeIn();
        console.log('✓ Music started by user interaction');
      } catch(e) {
        console.log('✗ Music play failed:', e);
      }
    } else {
      fadeOut();
      console.log('✓ Music paused by user');
    }
  });

  // Only try to resume on MOUSE interactions, not keyboard
  ['click', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
      if (bgAudio.paused && !audioToggle.classList.contains('manual-pause')) {
        bgAudio.play()
          .then(() => {
            fadeIn();
            console.log('✓ Music resumed after user interaction');
          })
          .catch(() => {});
      }
    }, { once: true });
  });

  updateAudioBtn();
  
  // === NEW: Handle invitation video interaction ===
  const inviteVideo = document.querySelector('.invite-video video');
  
  if (inviteVideo) {
    // When video starts playing, pause background music
    inviteVideo.addEventListener('play', () => {
      if (!bgAudio.paused) {
        wasMusicPlaying = true; // Remember music was playing
        fadeOut();
        console.log('✓ Background music paused for invitation video');
      }
    });
    
    // When video pauses or ends, resume background music if it was playing
    inviteVideo.addEventListener('pause', () => {
      if (wasMusicPlaying) {
        bgAudio.play()
          .then(() => {
            fadeIn();
            wasMusicPlaying = false;
            console.log('✓ Background music resumed after video paused');
          })
          .catch(() => {});
      }
    });
    
    inviteVideo.addEventListener('ended', () => {
      if (wasMusicPlaying) {
        bgAudio.play()
          .then(() => {
            fadeIn();
            wasMusicPlaying = false;
            console.log('✓ Background music resumed after video ended');
          })
          .catch(() => {});
      }
    });
  }
});

/* Video background optimization */
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('videoBackground');
  if (video) {
    video.playbackRate = 0.9;
    
    // Try to play video immediately (independent of audio)
    video.play().catch(e => {
      console.log('Video autoplay failed (expected on some browsers):', e);
      // Video will remain paused until user interaction
    });
  }
});

/* === Back to Top Button === */
document.addEventListener('DOMContentLoaded', () => {
  const backToTop = document.getElementById('backToTop');
  
  if (!backToTop) {
    console.warn('Back to top button not found');
    return;
  }

  // Show/hide based on scroll position
  function toggleBackToTop() {
    if (window.scrollY > 300) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  // Smooth scroll to top
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // Event listeners
  window.addEventListener('scroll', toggleBackToTop);
  backToTop.addEventListener('click', scrollToTop);

  // Initial check
  toggleBackToTop();
});

/* Image Lightbox Functions */
function openLightbox(imageSrc) {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  
  lightboxImg.src = imageSrc;
  lightbox.classList.add('active');
  
  // Prevent body scroll when lightbox is open
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  lightbox.classList.remove('active');
  
  // Restore body scroll
  document.body.style.overflow = '';
}

// Close lightbox on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});

/* Splash Screen and Audio Initialization */
document.addEventListener('DOMContentLoaded', function() {
  const splashOverlay = document.getElementById('splashOverlay');
  if (!splashOverlay) return;
  
  const splashButton = splashOverlay.querySelector('.splash-button');
  const bgAudio = document.getElementById('bgAudio');
  const audioToggle = document.getElementById('audioToggle');
  
  function dismissSplash() {
    // Hide splash screen with animation
    splashOverlay.classList.add('hidden');
    
    // Try to play audio after user interaction with proper volume
    if (bgAudio) {
      bgAudio.volume = 0;
      bgAudio.play()
        .then(() => {
          console.log('✓ Music started from splash screen');
          // Fade in the volume
          let vol = 0;
          const targetVol = 0.6;
          const fadeInAudio = () => {
            vol += 0.02;
            bgAudio.volume = Math.min(vol, targetVol);
            if (vol < targetVol) requestAnimationFrame(fadeInAudio);
          };
          requestAnimationFrame(fadeInAudio);
          
          // Update audio button state
          if (audioToggle) {
            audioToggle.textContent = '⏸';
            audioToggle.setAttribute('aria-label', 'Pause music');
            audioToggle.title = 'Pause music';
            audioToggle.classList.remove('needs-user');
          }
        })
        .catch(err => {
          console.log('Audio play prevented from splash:', err);
        });
    }
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      splashOverlay.remove();
    }, 600);
  }
  
  // Click anywhere on overlay to dismiss
  splashOverlay.addEventListener('click', dismissSplash);
  
  // Also allow Enter key to dismiss
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !splashOverlay.classList.contains('hidden')) {
      dismissSplash();
    }
  }, { once: true });
});
