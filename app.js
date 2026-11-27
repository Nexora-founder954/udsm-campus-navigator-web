const campusCenter = [-6.7735, 39.2397]; // Approximate campus display centre only.
const map = L.map('map').setView(campusCenter, 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let originMarker = null, destinationMarker = null, previewLine = null, originCoords = null, destinationCoords = null;
const statusEl = document.getElementById('status');
const originInput = document.getElementById('originInput');
const destinationInput = document.getElementById('destinationInput');
const setStatus = (message) => statusEl.textContent = message;

function setOrigin(latlng, label) {
  originCoords = latlng;
  if (originMarker) map.removeLayer(originMarker);
  originMarker = L.marker(latlng).addTo(map).bindPopup('Origin: ' + label);
  document.getElementById('originSummary').textContent = label;
}
function setDestination(latlng, label) {
  destinationCoords = latlng;
  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker(latlng).addTo(map).bindPopup('Destination: ' + label);
  document.getElementById('destinationSummary').textContent = label;
}
function distanceKm(a,b) {
  const R=6371, rad=x=>x*Math.PI/180;
  const dLat=rad(b[0]-a[0]), dLon=rad(b[1]-a[1]);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
async function geocode(query) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query + ', University of Dar es Salaam, Tanzania');
  const response = await fetch(url, {headers:{'Accept-Language':'en'}});
  if (!response.ok) throw new Error('Search service unavailable');
  const results = await response.json();
  if (!results.length) throw new Error('No matching map result. Try a more specific place name.');
  return [Number(results[0].lat), Number(results[0].lon)];
}
document.getElementById('gpsBtn').addEventListener('click', () => {
  if (!navigator.geolocation) return setStatus('GPS is not supported by this browser.');
  setStatus('Requesting your location permission…');
  navigator.geolocation.getCurrentPosition(pos => {
    const point=[pos.coords.latitude,pos.coords.longitude];
    setOrigin(point,'Your current location');
    originInput.value='My current location';
    map.setView(point,18);
    setStatus('Origin set using your device location. GPS may be less accurate indoors.');
  }, () => setStatus('Location permission was not granted. You can enter your origin manually.'), {enableHighAccuracy:true,timeout:12000});
});
document.getElementById('showRouteBtn').addEventListener('click', async () => {
  const originText=originInput.value.trim(), destinationText=destinationInput.value.trim();
  if (!originText || !destinationText) return setStatus('Please enter both an origin and a destination.');
  setStatus('Finding map positions…');
  try {
    if (!originCoords || originText !== 'My current location') {
      const a=await geocode(originText);
      setOrigin(a,originText);
    }
    const b=await geocode(destinationText);
    setDestination(b,destinationText);
    if (previewLine) map.removeLayer(previewLine);
    previewLine=L.polyline([originCoords,destinationCoords],{color:'#2477ad',weight:5,dashArray:'9 9',opacity:.9}).addTo(map);
    map.fitBounds(L.latLngBounds([originCoords,destinationCoords]).pad(.22));
    const km=distanceKm(originCoords,destinationCoords);
    document.getElementById('distance').textContent=km.toFixed(2)+' km';
    document.getElementById('duration').textContent=Math.max(1,Math.round(km/4.5*60))+' min*';
    setStatus('Map positions found. The dotted line and time are illustrative only, not a verified walking route.');
  } catch(err) { setStatus(err.message || 'Could not find one of those places.'); }
});

const translations = {
  en:{title:'Your campus.<br><em>One clear direction.</em>',text:'Search for a building, lecture room, office or campus service and plan how to get there.',lang:'Kiswahili',start:'Start exploring'},
  sw:{title:'Chuo chako.<br><em>Njia iliyo wazi.</em>',text:'Tafuta jengo, darasa, ofisi au huduma ya chuo na upange namna ya kufika.',lang:'English',start:'Anza kutafuta'}
};
let language='en';
document.getElementById('langBtn').addEventListener('click',()=>{
  language=language==='en'?'sw':'en';
  const t=translations[language];
  document.getElementById('heroTitle').innerHTML=t.title;
  document.getElementById('heroText').textContent=t.text;
  document.getElementById('langBtn').textContent=t.lang;
  document.querySelector('.primary-link').innerHTML=t.start+' <span>↗</span>';
});
