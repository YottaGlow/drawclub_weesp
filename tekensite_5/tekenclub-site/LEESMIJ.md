# Tekenclub — website

Een statische website voor de tekenclub. Werkt zonder database: de tekeningen
staan gewoon als bestanden in deze map en worden in de pagina geladen.

## Mapinhoud

```
tekenclub-site/
├── index.html               ← de structuur van de pagina (de inhoud)
├── style.css                ← alle opmaak: kleuren, lettertypes, plaatsing
├── script.js                ← het gedrag: prikbord laden + het tekenvel
├── afbeeldingen/
│   ├── weesp-atlas-van-loon.jpg  ← kaart van Weesp (ook in de "Waar?"-sectie)
│   ├── doodle-1.svg t/m doodle-6.svg  ← de 6 tekeningetjes rond de titel; vervang door je eigen
│   └── foto-meenemen.svg         ← invulplaatje bij "Meenemen"; vervang door je eigen foto
├── tekeningen/
│   ├── manifest.json        ← het lijstje met welke tekeningen op het prikbord komen
│   ├── voorbeeld-kat.svg    ← voorbeeldtekeningen (mag je weggooien)
│   ├── voorbeeld-koffie.svg
│   ├── voorbeeld-ster.svg
│   └── voorbeeld-bloem.svg
└── LEESMIJ.md               ← dit bestand
```

De drie bestanden horen bij elkaar: `index.html` koppelt `style.css` (via een
`<link>` in de `<head>`) en `script.js` (via een `<script>` net voor `</body>`).
Ze moeten naast elkaar in dezelfde map blijven staan, anders vindt de pagina de
opmaak en het script niet. Open je `index.html` los terwijl die twee er niet
naast staan, dan zie je een kale pagina — dat is normaal.

## Eigen tekeningen toevoegen

1. Zet je tekening als bestand in de map `tekeningen/`.
   - Foto of scan van een echte tekening: `.jpg` of `.png` werkt prima.
   - Houd ze klein, het liefst onder ~500 KB per stuk (een breedte van ±1000 px is genoeg).
2. Open `tekeningen/manifest.json` en zet je bestand in het lijstje. Voorbeeld:

   ```json
   [
     { "bestand": "tekening-van-anna.jpg", "naam": "Anna" },
     { "bestand": "stilleven.png",         "naam": "Wim"  }
   ]
   ```

   - `bestand` = de exacte bestandsnaam (let op hoofdletters en de extensie).
   - `naam` = de naam die onder de tekening komt te staan (mag leeg: `""`).
   - Let op de komma's tussen de regels; achter de laatste regel géén komma.
3. De volgorde in het lijstje = de volgorde op het prikbord.

Staat het lijstje leeg of klopt een bestandsnaam niet, dan toont de pagina
vanzelf een paar voorbeeldkrabbels, zodat het prikbord nooit kaal is.

## Online zetten met GitHub Pages (gratis)

1. Maak op GitHub een nieuwe **publieke** repository (op een gratis account moet
   die publiek zijn voor GitHub Pages).
2. Upload de hele inhoud van deze map naar de repo (de map `tekeningen/`
   meenemen). Kan via de "Add file → Upload files"-knop op github.com, of met
   GitHub Desktop.
3. Ga in de repo naar **Settings → Pages**.
4. Kies bij "Source" de branch (meestal `main`) en map `/ (root)`. Opslaan.
5. Na een minuutje staat de site op `https://<jouw-gebruikersnaam>.github.io/<repo-naam>/`.

Nieuwe tekeningen toevoegen = bestand uploaden + `manifest.json` bijwerken +
opslaan (commit). De site ververst zichzelf.

## De tekenavond instellen (datum + kalender)

In het blok "De avond" staat bij **Wanneer** een tekstregel én een kalender die
de tekenavonden oplicht.

- De **tekst** (bijv. "elke donderdag · 19:30") pas je aan in `index.html`, in
  het blok met `class="fact-when"` — zoek de regel met `class="val"`.
- De **kalender** regel je bovenin `script.js`, in het blok INSTELLINGEN:
  - `CLUB_WEEKDAY` = de vaste dag van de week. 0=zo, 1=ma, 2=di, 3=wo, 4=do,
    5=vr, 6=za. Staat nu op `4` (donderdag). Zet op `null` als er geen vaste
    wekelijkse dag is.
  - `CLUB_DATES` = losse extra data die ook oplichten, bijvoorbeeld een speciale
    avond: `["2026-07-18"]` (formaat JJJJ-MM-DD).

De kalender toont automatisch de huidige maand, met pijltjes om te bladeren.
"Vandaag" krijgt een randje; de tekenavonden krijgen een gekleurde bol.

## Over het tekenvel onderaan

Bezoekers kunnen zelf iets tekenen en op **Bewaar je tekening** klikken. De
tekening wordt dan als afbeelding op hun eigen apparaat opgeslagen (gedownload).
Er gaat niets naar de website toe — zo kan niemand ongevraagd iets op het
prikbord zetten. Het prikbord vul jij zelf via `manifest.json` (zie hierboven).
Wil je een tekening van een bezoeker op het bord? Laat ze die naar je toesturen,
zet het bestand in `tekeningen/` en voeg het toe aan het lijstje.

Wil je later tóch dat bezoekers rechtstreeks kunnen insturen en dat dit blijvend
zichtbaar wordt, dan is een gratis opslaglaag nodig (bijv. Supabase of
Cloudflare) — het liefst met een goedkeuringsstap, zodat jij bepaalt wat online
komt. Voor de start is dat niet nodig.
