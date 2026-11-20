# eFutsal 5v5 Pro

Game web futsal 5 vs 5 bergaya eFootball berbasis HTML5 Canvas & ES6 Modules, siap dijalankan langsung di browser maupun di-host di GitHub Pages.

## Struktur Proyek
```
├── index.html
├── style.css
├── README.md
└── js/
    ├── data.js       # Konstanta lapangan, 4 tim resmi, daftar pemain & storage Admin
    ├── utils.js      # Guardrail anti-NaN (safeNum, clamp), format waktu, helper geometri
    ├── input.js      # Kontrol hybrid keyboard (WASD/Arrow + J/L/K/E/Q) & virtual touch joystick
    ├── physics.js    # Fisika bola Magnus curve, out/kick-in, corner, goal kick & handball
    ├── ai.js         # AI rotasi 1-2-1 (Anchor, Pivot, Flank) & penjaga gawang (GK)
    ├── network.js    # Multiplayer P2P via PeerJS + STUN publik + timeout & reconnect
    ├── renderer.js   # Renderer Canvas responsif dengan DPR cap 1.65
    ├── engine.js     # State machine pertandingan, babak, extra time, penalti & golden ball suit
    └── main.js       # Orkestrator UI, squad builder 60s timer & admin panel
```

## Cara Menjalankan
- Buka langsung menggunakan server statis lokal (misalnya `npx serve .` atau VS Code Live Server) atau upload seluruh isi folder ke repository GitHub dan aktifkan **GitHub Pages**.
