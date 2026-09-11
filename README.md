# Diction Coach

A vocal dictation training webapp featuring speed tests, progressive exercises inspired by the Fonetix method (MVT -- Methode Verbo-Tonale), gamification, and multi-language support (FR/EN/IT/ES/DE). Entirely client-side using Web Speech API and IndexedDB for local storage.

## Stack

- **Next.js 16** + **React 19**
- **Tailwind CSS v4**
- **TypeScript**
- **Web Speech API** (browser speech recognition)
- **IndexedDB** via `idb` (local persistence)
- **wavesurfer.js** (audio visualization)
- **Docker** (production deployment)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

### Docker

```bash
docker compose up -d --build
```

The app runs at `http://localhost:3000` by default.

## License

MIT
