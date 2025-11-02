/* Placeholder JS. Replace with your functional script from earlier build. */
/* Configuration */
const ENDPOINT = window.ENDPOINT_URL || ''; // Set in index.html (must end with /exec)
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
const pinCancel = document.getElementById('pinCancel'); // added
const addMandap = document.getElementById('addMandap');
const addSangeet = document.getElementById('addSangeet');

/* Utils */
const qs = (sel) => document.querySelector(sel);
const toast = (el, text, good=true) => { if(!el) return; el.textContent = text; el.style.color = good ? '#0f766e' : '#b91c1c'; };
function csvEncode(rows){ return rows.map(r => r.map(x => `"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n'); }
function arrivalStr(g){ return `${g.arrivalDate || ''} ${g.arrivalTime || ''}`.trim(); }

/* ICS */
function makeICS({title, start, end, location, description}){
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
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=(title.replace(/\s+/g,'_').toLowerCase())+'.ics'; a.click(); URL.revokeObjectURL(url);
}
addWedding?.addEventListener('click', () => makeICS({ title:'Manish & Arti • Wedding', start:'2025-12-05T19:00:00', end:'2025-12-05T23:59:00', location:'J24V+87 Ankleshwar, Gujarat, India', description:'Wedding & Varmala — Ankleshwar (Plus Code: J24V+87).' }));
addReception?.addEventListener('click', () => makeICS({ title:'Manish & Arti • Reception', start:'2025-12-12T19:00:00', end:'2025-12-12T22:30:00', location:'Patna New Club, Patna, Bihar, India', description:'Reception — Patna New Club.' }));

// Mandap and Haldi Kalash - Sun, 30 Nov, 5 PM
addMandap?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Mandap and Haldi Kalash', 
  start:'2025-11-30T17:00:00', 
  end:'2025-11-30T21:00:00', 
  location:'286, Chankyapuri, Garikhana, Danapur-Khagaul Road, Patna, Bihar', 
  description:'Mandap and Haldi Kalash ceremony at the residence in Patna.' 
}));

// Sangeet - Thu, 4 Dec, 7 PM
addSangeet?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Sangeet', 
  start:'2025-12-04T19:00:00', 
  end:'2025-12-04T23:00:00', 
  location:'Gokul Party Plot, Nr. Yogi Estate GIDC, Ankleshwar, Gujarat', 
  description:'Sangeet ceremony in Ankleshwar.' 
}));

// Wedding - Fri, 5 Dec, 5 PM
addWedding?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Wedding', 
  start:'2025-12-05T17:00:00', 
  end:'2025-12-05T23:59:00', 
  location:'Gokul Party Plot, Nr. Yogi Estate GIDC, Ankleshwar, Gujarat', 
  description:'Wedding ceremony in Ankleshwar.' 
}));

// Reception - Wed, 10 Dec, 6 PM
addReception?.addEventListener('click', () => makeICS({ 
  title:'Manish & Arti • Reception', 
  start:'2025-12-10T18:00:00', 
  end:'2025-12-10T22:00:00', 
  location:'Shangri-La Palace, Bailey Rd, Patna, Bihar', 
  description:'Reception ceremony at Shangri-La Palace, Patna.' 
}));

/* Fetch helper (no preflight) */
async function post(payload){
  if (!ENDPOINT) {
    console.error('Missing ENDPOINT_URL');
    return { ok:false, error:'Missing ENDPOINT_URL' };
  }
  
  try {
    console.log('Posting to:', ENDPOINT);
    console.log('Payload:', payload);
    
    const r = await fetch(ENDPOINT, { 
      method:'POST', 
      headers:{'Content-Type':'text/plain;charset=utf-8'}, 
      body: JSON.stringify(payload),
      mode: 'cors'
    });
    
    if (!r.ok) {
      console.error('HTTP error:', r.status, r.statusText);
      return { ok:false, error:`Server error: ${r.status}` };
    }
    
    const data = await r.json();
    console.log('Server response:', data);
    return data;
  } catch(e) { 
    console.error('Fetch error:', e);
    return { ok:false, error:'Network error. Please check your connection and try again.' }; 
  }
}

/* Admin gating */
function setAdminVisible(on){
  adminSections.forEach(s => s.style.display = on ? '' : 'none');
  if (adminNav) adminNav.style.display = on ? '' : 'none';
  if (on) sessionStorage.setItem('admintoken', STATE.token||''); else sessionStorage.removeItem('admintoken');
}
setAdminVisible(!!STATE.token);
adminBtn?.addEventListener('click', () => { pinModal.showModal(); pinInput.focus(); });
logoutBtn?.addEventListener('click', () => { STATE.token=''; setAdminVisible(false); toast(qs('#adminMsg'), 'Locked', true); });

/* Auth */
pinForm?.addEventListener('submit', async (e) => {
    // Only intercept unlock submissions
    if (e.submitter && e.submitter.value === 'unlock') {
      e.preventDefault();
      pinMsg.textContent = '';
      const pinVal = pinInput.value.trim();
      if (!pinVal) return toast(pinMsg, 'PIN required', false);
      const data = await post({ action:'auth', pin: pinVal });
      if (!data.ok) return toast(pinMsg, data.error || 'Auth failed', false);
      STATE.token = data.token; setAdminVisible(true); pinModal.close(); pinInput.value=''; await loadGuests();
    }
  });
  pinCancel?.addEventListener('click', () => {
    pinModal.close();
    pinInput.value='';
    pinMsg.textContent='';
  });
  /* Click outside to close */
  pinModal?.addEventListener('click', (e)=> {
    if (e.target === pinModal) { pinModal.close(); pinInput.value=''; pinMsg.textContent=''; }
  });/* Auth */
  pinForm?.addEventListener('submit', async (e) => {
    // Only intercept unlock submissions
    if (e.submitter && e.submitter.value === 'unlock') {
      e.preventDefault();
      pinMsg.textContent = '';
      const pinVal = pinInput.value.trim();
      if (!pinVal) return toast(pinMsg, 'PIN required', false);
      const data = await post({ action:'auth', pin: pinVal });
      if (!data.ok) return toast(pinMsg, data.error || 'Auth failed', false);
      STATE.token = data.token; setAdminVisible(true); pinModal.close(); pinInput.value=''; await loadGuests();
    }
  });
  pinCancel?.addEventListener('click', () => {
    pinModal.close();
    pinInput.value='';
    pinMsg.textContent='';
  });
  /* Click outside to close */
  pinModal?.addEventListener('click', (e)=> {
    if (e.target === pinModal) { pinModal.close(); pinInput.value=''; pinMsg.textContent=''; }
  });

/* RSVP */
let isSubmitting = false; // Prevent double submissions

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Prevent duplicate submissions
  if (isSubmitting) return;
  isSubmitting = true;
  
  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">⏳</span> Sending...';
  
  const payload = { 
    name: document.getElementById('name').value.trim(), 
    phone: document.getElementById('phone').value.trim(), 
    guests: parseInt(document.getElementById('guests').value || '1', 10),
    arrivalDate: document.getElementById('arrivalDate').value, 
    arrivalTime: document.getElementById('arrivalTime').value, 
    mode: document.getElementById('mode').value, 
    number: document.getElementById('number').value.trim(),
    city: document.getElementById('city').value.trim(), 
    notes: document.getElementById('notes').value.trim(), 
    status: 'Pending'
  };
  
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
  submitBtn.disabled = false;
  submitBtn.innerHTML = '✓ Sent!';
  toast(msg, '✓ Details sent! See you soon.'); 
  
  // Reset button after 3 seconds
  setTimeout(() => {
    submitBtn.textContent = originalText;
  }, 3000);
  
  if (STATE.token) await loadGuests();
  
  // Re-enable after 2 seconds
  setTimeout(() => { isSubmitting = false; }, 2000);
});

/* Admin table */
function toRow(g){
  const tr = document.createElement('tr'); tr.dataset.id = g.id;
  tr.innerHTML = `
    <td>${g.name}</td><td>${g.phone}</td><td>${g.guests||1}</td><td>${arrivalStr(g)}</td><td>${g.mode||''}</td>
    <td>${g.number||''}</td><td>${g.city||''}</td>
    <td><input value="${g.hotel||''}" class="cell-input" data-k="hotel"/></td>
    <td><input value="${g.room||''}" class="cell-input" data-k="room"/></td>
    <td><select class="cell-input" data-k="status">${['Pending','Arrived','Checked-in'].map(s=>`<option ${g.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
    <td><input value="${g.notes||''}" class="cell-input" data-k="notes"/></td>
    <td><button class="link danger" data-act="del">✕</button></td>`;
  return tr;
}

async function loadGuests(){
  if (!STATE.token) return;
  const data = await post({ action:'list', token: STATE.token });
  if (!data.ok) return toast(qs('#adminMsg'), data.error || 'Load failed', false);
  const q = (search?.value || '').toLowerCase(), sf = statusFilter?.value || '';
  const rows = (data.rows || []).filter(g => {
    const t = [g.name,g.phone,g.city,g.hotel,g.notes].join(' ').toLowerCase();
    return (!q || t.includes(q)) && (!sf || g.status === sf);
  }).map(toRow);
  tableBody.innerHTML = ''; rows.forEach(r => tableBody.appendChild(r));
}
tableBody?.addEventListener('input', async (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  await post({ action:'update', token: STATE.token, payload:{ id: tr.dataset.id, [e.target.dataset.k]: e.target.value } });
});
tableBody?.addEventListener('click', async (e) => {
  if (!e.target.matches('[data-act="del"]')) return;
  const tr = e.target.closest('tr'); await post({ action:'delete', token: STATE.token, id: tr.dataset.id }); tr.remove();
});
search?.addEventListener('input', loadGuests); statusFilter?.addEventListener('change', loadGuests);

/* Auto-open admin if ?admin=1 present */
if (new URLSearchParams(location.search).get('admin') === '1') { adminBtn?.click(); }


/* === Language Toggle === */
const langToggle = document.getElementById('langToggle');
function applyLang(lang){
  if(!window.I18N) return;
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  localStorage.setItem('lang', lang);
  
  // Translate text content
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k = el.getAttribute('data-i18n');
    const val = dict[k] || I18N.en[k] || '';
    if(!val) return;
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = val; else el.textContent = val;
  });
  
  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const k = el.getAttribute('data-i18n-placeholder');
    const val = dict[k] || I18N.en[k] || '';
    if(val) el.placeholder = val;
  });
  
  // Translate select options
  document.querySelectorAll('select option[data-i18n]').forEach(opt=>{
    const k = opt.getAttribute('data-i18n');
    const val = dict[k] || I18N.en[k] || '';
    if(val) opt.textContent = val;
  });
  
  // Button label (show other language prompt first)
  if (langToggle){
    langToggle.textContent = lang === 'en' ? 'हिं/EN' : 'EN/हिं';
    langToggle.setAttribute('aria-label', lang === 'en' ? 'Switch to Hindi' : 'Switch to English');
  }
}
const storedLang = localStorage.getItem('lang') || 'en';
applyLang(storedLang);
langToggle?.addEventListener('click', ()=> {
  const next = (document.documentElement.dataset.lang === 'en') ? 'hi' : 'en';
  applyLang(next);
});

/* === Background Audio + Play/Pause Button (SIMPLIFIED - NO OVERLAY) === */
document.addEventListener('DOMContentLoaded', () => {
    const bgAudio = document.getElementById('bgAudio');
    const audioToggle = document.getElementById('audioToggle');
  
    if (!bgAudio || !audioToggle) return;
  
    const TARGET_VOL = 0.6;
    bgAudio.loop = true;
    bgAudio.preload = 'auto';
    bgAudio.volume = TARGET_VOL;
    // Start paused - user must click play
    bgAudio.pause();
  
    function updateAudioBtn(){
      const playing = !bgAudio.paused;
      audioToggle.textContent = playing ? '⏸' : '▶';
      audioToggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      audioToggle.title = playing ? 'Pause music' : 'Play music';
    }

    function fadeIn(){
      let vol = 0;
      bgAudio.volume = 0;
      const step = () => {
        vol += 0.05;
        bgAudio.volume = Math.min(vol, TARGET_VOL);
        if(vol < TARGET_VOL) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  
    // Initial button state
    updateAudioBtn();
  
    // Audio toggle button
    audioToggle.addEventListener('click', async () => {
      if (bgAudio.paused) {
        try { 
          fadeIn();
          await bgAudio.play();
        } catch(e) {
          console.log('Audio play failed:', e);
        }
      } else {
        bgAudio.pause();
      }
      updateAudioBtn();
    });
});

/* Increase background video speed to 90% and keep paused initially */
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('videoBackground');
  if (video) {
    video.playbackRate = 0.9;
    // Keep video paused initially
    video.pause();
    
    // Optional: Play video when audio plays
    const audioToggle = document.getElementById('audioToggle');
    const bgAudio = document.getElementById('bgAudio');
    
    if (audioToggle && bgAudio) {
      audioToggle.addEventListener('click', () => {
        // Sync video with audio
        if (!bgAudio.paused && video.paused) {
          video.play().catch(e => console.log('Video play failed:', e));
        } else if (bgAudio.paused && !video.paused) {
          video.pause();
        }
      });
    }
  }
});

/* Multi-step RSVP Form */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  const steps = form.querySelectorAll('.form-step');
  const dots = form.querySelectorAll('.step-dot');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const msg = document.getElementById('formMsg');
  
  let currentStep = 1;
  const totalSteps = 3;

  function updateStep(direction = 'next') {
    // Hide all steps
    steps.forEach((step, idx) => {
      step.classList.remove('active', 'exit-left');
      if (idx + 1 < currentStep) {
        step.classList.add('exit-left');
      }
    });

    // Show current step
    const activeStep = form.querySelector(`[data-step="${currentStep}"]`);
    if (activeStep) activeStep.classList.add('active');

    // Update dots
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx + 1 === currentStep);
    });

    // Update buttons
    prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    
    if (currentStep === totalSteps) {
      nextBtn.textContent = 'Submit';
      nextBtn.classList.add('btn-primary');
    } else {
      nextBtn.textContent = 'Next';
    }
  }

  function validateStep() {
    const activeStep = form.querySelector(`[data-step="${currentStep}"]`);
    const inputs = activeStep.querySelectorAll('input[required], select[required], textarea[required]');
    
    for (const input of inputs) {
      if (!input.value.trim()) {
        input.focus();
        toast(msg, 'Please fill in all required fields', false);
        return false;
      }
    }
    
    // Phone validation for step 1
    if (currentStep === 1) {
      const phone = document.getElementById('phone');
      if (!/^[+]?\d[\d\s-]{7,15}$/.test(phone.value.trim())) {
        phone.focus();
        toast(msg, 'Please enter a valid phone number', false);
        return false;
      }
    }
    
    return true;
  }

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStep('prev');
      msg.textContent = '';
    }
  });

  nextBtn.addEventListener('click', async () => {
    if (currentStep < totalSteps) {
      if (validateStep()) {
        currentStep++;
        updateStep('next');
        msg.textContent = '';
      }
    } else {
      // Final submission
      if (!validateStep()) return;
      
      nextBtn.disabled = true;
      nextBtn.textContent = 'Submitting...';
      
      const payload = { 
        name: document.getElementById('name').value.trim(), 
        phone: document.getElementById('phone').value.trim(), 
        guests: parseInt(document.getElementById('guests').value || '1', 10),
        arrivalDate: document.getElementById('arrivalDate').value, 
        arrivalTime: document.getElementById('arrivalTime').value, 
        mode: document.getElementById('mode').value, 
        number: document.getElementById('number').value.trim(),
        city: document.getElementById('city').value.trim(), 
        notes: document.getElementById('notes').value.trim(), 
        status: 'Pending'
      };
      
      const data = await post({ action: 'rsvp', payload });
      
      if (!data.ok) {
        toast(msg, data.error || 'Could not save', false);
        nextBtn.disabled = false;
        nextBtn.textContent = 'Submit';
        return;
      }
      
      // Show success state
      steps.forEach(s => s.style.display = 'none');
      const successStep = form.querySelector('[data-step="success"]');
      successStep.style.display = 'block';
      successStep.classList.add('active');
      
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      dots.forEach(d => d.style.display = 'none');
      
      if (STATE.token) await loadGuests();
    }
  });

  // Initial state
  updateStep();
});

/* Optimize video loading - load only after page is ready */
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('videoBackground');
  if (!video) {
    console.log('Video element not found');
    return;
  }
  
  // Log current video source
  const currentSrc = video.querySelector('source')?.src || 'No source found';
  console.log('Current video src:', currentSrc);
  
  // Set playback rate
  video.playbackRate = 0.9;
  
  // Check connection
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  const isMobile = window.innerWidth <= 768;
  
  if (isSlowConnection || (isMobile && connection?.saveData)) {
    console.log('Video skipped: slow connection detected');
    video.remove();
    return;
  }
  
  // Load video progressively
  video.addEventListener('loadeddata', () => {
    video.classList.add('loaded');
    console.log('Video loaded successfully');
  });
  
  video.addEventListener('error', (e) => {
    console.error('Video error:', e);
    console.error('Video error code:', video.error?.code);
    console.error('Video error message:', video.error?.message);
  });
  
  // Force load
  video.load();
  
  // Fallback: show after 3 seconds even if not fully loaded
  setTimeout(() => {
    if (!video.classList.contains('loaded')) {
      console.log('Video timeout - showing anyway');
      video.classList.add('loaded');
    }
  }, 3000);
});

/* Add corner ornaments to itinerary and memories cards ONLY */
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach(card => {
    // Skip if ornaments already added
    if (card.querySelector('.corner-ornament')) return;
    
    // Add ornaments ONLY to itinerary and memories cards
    // EXCLUDE: invitation, travel, RSVP, and venue
    if (card.closest('#itinerary') || card.closest('#memories')) {
      
      // Create bottom corners (top corners are CSS ::before/::after)
      const bottomCorners = ['bottom-left', 'bottom-right'];
      
      bottomCorners.forEach(position => {
        const ornament = document.createElement('div');
        ornament.className = `corner-ornament ${position}`;
        ornament.setAttribute('aria-hidden', 'true');
        card.appendChild(ornament);
      });
    }
  });
});

/* === Back to Top Button === */
document.addEventListener('DOMContentLoaded', () => {
  const backToTop = document.getElementById('backToTop');
  
  if (!backToTop) return;
  
  // Show/hide button based on scroll position
  function toggleBackToTop() {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (scrollY > 300) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }
  
  // Smooth scroll to top
  backToTop.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  // Listen to scroll events
  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  
  // Check initial position
  toggleBackToTop();
});
