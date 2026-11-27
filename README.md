# UDSM Campus Navigator — Frontend Starter

A responsive, mobile-first website concept for an independent campus-wayfinding project proposed for discussion with the University of Dar es Salaam.

## Included
- Homepage and project-proposal disclaimer
- UDSM emblem image reference (Wikimedia Commons, CC BY-SA 4.0)
- Origin field and browser GPS permission
- Destination lookup using OpenStreetMap Nominatim
- Interactive Leaflet map
- Visual preview line and clearly labelled approximate straight-line distance/time
- Indoor-navigation concept panel
- English/Kiswahili hero toggle

## Important limitations
This is a **frontend prototype**, not a production navigation system.
- The dotted line is a straight visual preview, not a pedestrian route.
- Distance is straight-line distance; time is a rough estimate, not route travel time.
- Campus room/building data has not been surveyed or verified.
- Indoor floor-plan illustration is generic and must not be mistaken for a real UDSM floor plan.
- Browser GPS may be inaccurate indoors.
- Nominatim and OpenStreetMap data may not contain every campus feature.

## Run
Open `index.html` in a browser while connected to the internet. Map tiles and CDN libraries require internet access. For local development, use any simple static web server.

## Next development milestones
1. Confirm permission and brand usage with UDSM Directorate of Public Services.
2. Obtain the approved logo asset and official branding guidance.
3. Create a verified campus place directory and walking-path network.
4. Add Supabase database, authentication, storage and row-level security.
5. Build an admin dashboard for verified locations, buildings, rooms, photos, floors and pathways.
6. Add real pedestrian routing over verified path data.
7. Add indoor routing only from approved floor plans and verified corridors.
8. Test accessibility, security, mobile behaviour and deployment.

## Attribution
- University of Dar es Salaam emblem: University of Dar es Salaam, via Wikimedia Commons, licensed CC BY-SA 4.0. Source: https://commons.wikimedia.org/wiki/File:University_of_Dar_es_Salaam.png
- Map data and tiles: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright
