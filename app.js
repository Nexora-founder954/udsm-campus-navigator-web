/* UDSM Campus Navigator — frontend prototype
 * Search helper, GPS origin, map markers and clearly-labelled route preview.
 * Search results depend on OpenStreetMap coverage; this is not an official UDSM dataset.
 */
(() => {
  'use strict';

  const CAMPUS = {
    name: 'University of Dar es Salaam (Mlimani Campus)',
    // Approximate map focus only; not an official surveyed campus reference point.
    center: [-6.7735, 39.2397],
    viewbox: '39.215,-6.745,39.265,-6.805'
  };

  const byId = (id) => document.getElementById(id);
  const statusEl = byId('status');
  const originInput = byId('originInput');
  const destinationInput = byId('destinationInput');
  const distanceEl = byId('distance');
  const durationEl = byId('duration');
  const originSummary = byId('originSummary');
  const destinationSummary = byId('destinationSummary');

  if (!window.L || !byId('map')) {
    if (statusEl) statusEl.textContent = 'The map library did not load. Check your internet connection and reload the page.';
    return;
  }

  const map = L.map('map', { scrollWheelZoom: true }).setView(CAMPUS.center, 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  let originMarker = null;
  let destinationMarker = null;
  let previewLine = null;
  let originCoords = null;
  let destinationCoords = null;
  let originIsGps = false;
  let language = 'en';
  let searchBusy = false;

  const messages = {
    en: {
      initial: 'Enter a starting point and destination, or use GPS to set your origin.',
      locating: 'Requesting your location permission…',
      gpsOk: 'Your current location has been set as the origin. GPS may be less accurate indoors.',
      gpsDenied: 'Location permission was not granted. You can enter your starting point manually.',
      gpsUnsupported: 'GPS is not supported by this browser.',
      both: 'Please enter both an origin and a destination.',
      searching: 'Searching OpenStreetMap for the selected places…',
      noResult: 'No matching map result was found. Try a nearby landmark or a more specific public place. Rooms and many campus facilities may not yet be mapped.',
      found: 'Both map positions were found. The dotted line is a straight-line preview, not a verified walking route.',
      error: 'The map search service is temporarily unavailable. Please try again shortly.',
      wait: 'A search is already running. Please wait.'
    },
    sw: {
      initial: 'Weka eneo la kuanzia na unakotaka kwenda, au tumia GPS kuweka ulipo.',
      locating: 'Inaomba ruhusa ya kupata eneo lako…',
      gpsOk: 'Eneo lako la sasa limewekwa kama sehemu ya kuanzia. GPS inaweza kuwa na usahihi mdogo ndani ya majengo.',
      gpsDenied: 'Hukutoa ruhusa ya eneo. Unaweza kuandika sehemu ya kuanzia mwenyewe.',
      gpsUnsupported: 'Kivinjari hiki hakiungi mkono GPS.',
      both: 'Tafadhali jaza sehemu ya kuanzia na unakotaka kwenda.',
      searching: 'Inatafuta maeneo kwenye OpenStreetMap…',
      noResult: 'Eneo halijapatikana kwenye ramani. Jaribu landmark ya karibu au jina maalumu la eneo la umma. Vyumba na huduma nyingi za chuo huenda bado hazijawekwa kwenye ramani.',
      found: 'Maeneo yote mawili yamepatikana. Mstari wa nukta ni mfano wa umbali wa moja kwa moja, si njia halisi ya kutembea iliyothibitishwa.',
      error: 'Huduma ya kutafuta ramani haipatikani kwa sasa. Jaribu tena baada ya muda.',
      wait: 'Utafutaji mwingine unaendelea. Tafadhali subiri.'
    }
  };

  function setStatus(keyOrText) {
    if (statusEl) statusEl.textContent = messages[language][keyOrText] || keyOrText;
  }

  function distanceKm(a, b) {
    const rad = (value) => value * Math.PI / 180;
    const dLat = rad(b[0] - a[0]);
    const dLon = rad(b[1] - a[1]);
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function setOrigin(point, label, isGps = false) {
    originCoords = point;
    originIsGps = isGps;
    if (originMarker) map.removeLayer(originMarker);
    originMarker = L.marker(point).addTo(map).bindPopup('Origin: ' + label);
    if (originSummary) originSummary.textContent = label;
  }

  function setDestination(point, label) {
    destinationCoords = point;
    if (destinationMarker) map.removeLayer(destinationMarker);
    destinationMarker = L.marker(point).addTo(map).bindPopup('Destination: ' + label);
    if (destinationSummary) destinationSummary.textContent = label;
  }

  function cleanQuery(value) {
    return value.trim().replace(/\s+/g, ' ').replace(/[;,]+$/g, '');
  }

  function makeSearchTerms(raw) {
    const q = cleanQuery(raw);
    const terms = [];
    const add = (value) => {
      const normalized = value.toLowerCase();
      if (value && !terms.some((item) => item.toLowerCase() === normalized)) terms.push(value);
    };

    add(q);

    const isCampusWide = /\b(udsm|university of dar es salaam|mlimani campus|mlimani)\b/i.test(q);
    if (isCampusWide) {
      add('University of Dar es Salaam, Dar es Salaam, Tanzania');
      add('Mlimani, Dar es Salaam, Tanzania');
    } else {
      add(q + ', University of Dar es Salaam, Dar es Salaam, Tanzania');
      add(q + ', Mlimani, Dar es Salaam, Tanzania');
      add(q + ', Dar es Salaam, Tanzania');
    }
    return terms;
  }

  async function searchOne(term) {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: term,
      limit: '6',
      addressdetails: '1',
      countrycodes: 'tz',
      viewbox: CAMPUS.viewbox,
      bounded: '0'
    });
    const response = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), {
      headers: { 'Accept-Language': language === 'sw' ? 'sw,en' : 'en' }
    });
    if (!response.ok) throw new Error('Search service error');
    return response.json();
  }

  async function geocode(raw) {
    const terms = makeSearchTerms(raw);
    for (const term of terms) {
      const results = await searchOne(term);
      if (Array.isArray(results) && results.length) {
        // Prefer a result explicitly associated with UDSM/Mlimani when available.
        const campusMatch = results.find((item) =>
          /university of dar es salaam|udsm|mlimani/i.test(item.display_name || '')
        );
        const result = campusMatch || results[0];
        return {
          point: [Number(result.lat), Number(result.lon)],
          label: result.name || cleanQuery(raw),
          displayName: result.display_name || result.name || cleanQuery(raw)
        };
      }
    }
    throw new Error('NO_MATCH');
  }

  function renderPreview() {
    if (!originCoords || !destinationCoords) return;
    if (previewLine) map.removeLayer(previewLine);
    previewLine = L.polyline([originCoords, destinationCoords], {
      color: '#2477ad',
      weight: 5,
      dashArray: '9 9',
      opacity: 0.9
    }).addTo(map);

    map.fitBounds(L.latLngBounds([originCoords, destinationCoords]).pad(0.22));
    const km = distanceKm(originCoords, destinationCoords);
    if (distanceEl) distanceEl.textContent = km.toFixed(2) + ' km';
    if (durationEl) durationEl.textContent = Math.max(1, Math.round((km / 4.5) * 60)) + ' min*';
  }

  byId('gpsBtn')?.addEventListener('click', () => {
    if (!navigator.geolocation) return setStatus('gpsUnsupported');
    setStatus('locating');
    navigator.geolocation.getCurrentPosition((position) => {
      const point = [position.coords.latitude, position.coords.longitude];
      setOrigin(point, 'Your current location', true);
      if (originInput) originInput.value = 'My current location';
      map.setView(point, 18);
      setStatus('gpsOk');
    }, () => setStatus('gpsDenied'), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    });
  });

  byId('showRouteBtn')?.addEventListener('click', async () => {
    if (searchBusy) return setStatus('wait');

    const originText = cleanQuery(originInput?.value || '');
    const destinationText = cleanQuery(destinationInput?.value || '');
    if (!originText || !destinationText) return setStatus('both');

    searchBusy = true;
    setStatus('searching');
    const button = byId('showRouteBtn');
    if (button) button.disabled = true;

    try {
      if (!originIsGps || originText.toLowerCase() !== 'my current location') {
        const origin = await geocode(originText);
        setOrigin(origin.point, origin.label, false);
      }
      const destination = await geocode(destinationText);
      setDestination(destination.point, destination.label);
      renderPreview();
      setStatus('found');
    } catch (error) {
      if (error && error.message === 'NO_MATCH') setStatus('noResult');
      else {
        console.error('Campus Navigator search error:', error);
        setStatus('error');
      }
    } finally {
      searchBusy = false;
      if (button) button.disabled = false;
    }
  });

  const translations = {
    en: {
      title: 'Your campus.<br><em>One clear direction.</em>',
      text: 'Search for a building, lecture room, office or campus service and plan how to get there.',
      lang: 'Kiswahili',
      start: 'Start exploring'
    },
    sw: {
      title: 'Chuo chako.<br><em>Njia iliyo wazi.</em>',
      text: 'Tafuta jengo, darasa, ofisi au huduma ya chuo na upange namna ya kufika.',
      lang: 'English',
      start: 'Anza kutafuta'
    }
  };

  byId('langBtn')?.addEventListener('click', () => {
    language = language === 'en' ? 'sw' : 'en';
    const translation = translations[language];
    const title = byId('heroTitle');
    const text = byId('heroText');
    const button = byId('langBtn');
    const startLink = document.querySelector('.primary-link');
    if (title) title.innerHTML = translation.title;
    if (text) text.textContent = translation.text;
    if (button) button.textContent = translation.lang;
    if (startLink) startLink.innerHTML = translation.start + ' <span>↗</span>';
    if (statusEl) setStatus('initial');
  });

  setStatus('initial');
  // Leaflet sometimes calculates a narrow map on first mobile paint; refresh its size.
  window.addEventListener('load', () => setTimeout(() => map.invalidateSize(), 150));
})();
