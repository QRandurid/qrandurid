# Game artwork

`urban-portraits.png` is original generated artwork for QRändurid. It is an equal
4 × 4 portrait atlas. The tile-to-skin mapping is `portraitIds` in `cosmetics.js`;
tiles are displayed with CSS background positioning so the original image stays
intact. Sixteen tiles supply eight refreshed existing skins and eight new skins.

`s1.svg`–`s24.svg` are the original vector portraits, retained for compatibility.
`f1.svg`–`f24.svg` are original transparent vector profile frames. Their metadata,
themes and deterministic visit requirements are defined in `cosmetics.js`.

The service worker preloads all required art for offline play. When adding new
assets, update its app-shell list and cache version together with the catalog.
