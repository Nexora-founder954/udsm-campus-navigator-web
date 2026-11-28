UDSM CAMPUS NAVIGATOR — TOLEO LA MAJARIBIO
===========================================

YALIYOMO
- navigator.html: ukurasa wa mtumiaji wenye ramani ya 3D/satellite, GPS, alama za picha,
  dirisha la picha kubwa, majengo/njia jirani za OpenStreetMap, na jaribio la pedestrian routing.

KABLA YA KUTUMIA
1. Fungua navigator.html kwa editor ya GitHub.
2. Tafuta:
   const SUPABASE_URL = "WEKA_SUPABASE_PROJECT_URL_HAPA";
   const SUPABASE_PUBLISHABLE_KEY = "WEKA_PUBLISHABLE_KEY_HAPA";
3. Weka Project URL ya Supabase na Publishable key zilezile zinazotumiwa na admin.html.
   Project URL iwe base URL, bila /rest/v1/.
4. Usitumie service_role key wala secret key.
5. Commit mabadiliko, kisha subiri GitHub Pages imalize kusasisha.

VIPENGELE
- GPS huonyeshwa kwa nukta ya bluu.
- Maeneo yaliyowekwa Published na Verified hupakiwa kutoka campus_places.
- Alama ya destination hutumia photo_url; kuigusa hufungua picha kubwa ikiwa URL ya picha ipo.
- Ramani ina zoom, bearing na pitch controls; satellite imagery na 3D buildings hutegemea huduma/data ya nje.
- Njia za watembea kwa miguu huombwa kutoka Valhalla; footways na majengo jirani huombwa kutoka Overpass/OpenStreetMap.
- Maelekezo huonyeshwa kama hatua zenye alama za mwelekeo.

MIPAKA MUHIMU
- Huu ni prototype huru, si huduma rasmi ya UDSM.
- Huduma za Valhalla, Overpass, tiles na satellite ni za nje; zinaweza kuchelewa,
  kukataa maombi au kutokuwa na data ya kutosha.
- Ikiwa pedestrian routing haipatikani, mstari wa njano wa nukta ni umbali wa makadirio
  tu, si njia halisi wala njia salama iliyothibitishwa.
- Picha halisi haitaonekana mpaka msimamizi aweke photo_url ya picha inayofikika moja kwa moja.
- Coordinates za jengo lazima ziwe sahihi na kuthibitishwa. Eneo la Draft/Not Verified
  halitaonekana kwa watumiaji.
- Maelekezo ya hatua ni alama na maandishi ya mabadiliko ya mwelekeo; picha halisi za
  kila hatua/landmark zinahitaji picha za njia zilizokusanywa na kuthibitishwa chuoni.

TAARIFA ZA RAMANI
- Satellite imagery: Esri World Imagery.
- Vector map/3D buildings: OpenFreeMap/OpenStreetMap.
- Footways/building outlines: Overpass API / OpenStreetMap.
- Walking route: Valhalla public routing service.

Kwa matumizi ya kuaminika chuoni, UDSM inapaswa kuthibitisha maeneo, njia, accessibility,
picha na usalama wa kila njia kabla ya kutegemea maelekezo haya.
