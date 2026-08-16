// Astrology reference data + bilingual (en/hi) labels for Gochara.
// Hindi names match astro-engine/frontend/src/i18n/dataTranslations.js so
// both tools read identically.

export const PLANETS = [
  { id: "Sun",     en: "Sun",     hi: "सूर्य",     color: "#facc15", width: 2.2 },
  { id: "Moon",    en: "Moon",    hi: "चंद्र",     color: "#e2e8f0", width: 1.4 },
  { id: "Mercury", en: "Mercury", hi: "बुध",      color: "#38bdf8", width: 1.6 },
  { id: "Venus",   en: "Venus",   hi: "शुक्र",     color: "#f472b6", width: 1.6 },
  { id: "Mars",    en: "Mars",    hi: "मंगल",     color: "#f87171", width: 1.6 },
  { id: "Jupiter", en: "Jupiter", hi: "गुरु",      color: "#fb923c", width: 1.8 },
  { id: "Saturn",  en: "Saturn",  hi: "शनि",      color: "#a78bfa", width: 1.8 },
  { id: "Rahu",    en: "Rahu",    hi: "राहु",      color: "#2dd4bf", width: 1.6, dash: [5, 4] },
  { id: "Ketu",    en: "Ketu",    hi: "केतु",      color: "#94a3b8", width: 1.6, dash: [5, 4] },
  { id: "Uranus",  en: "Uranus",  hi: "हर्षल",     color: "#4ade80", width: 1.4, dash: [8, 3] },
  { id: "Neptune", en: "Neptune", hi: "नेप्च्यून",  color: "#60a5fa", width: 1.4, dash: [8, 3] },
  { id: "Pluto",   en: "Pluto",   hi: "प्लूटो",    color: "#e879f9", width: 1.4, dash: [8, 3] },
];

export const RASHIS = [
  { en: "Aries",       hi: "मेष" },
  { en: "Taurus",      hi: "वृषभ" },
  { en: "Gemini",      hi: "मिथुन" },
  { en: "Cancer",      hi: "कर्क" },
  { en: "Leo",         hi: "सिंह" },
  { en: "Virgo",       hi: "कन्या" },
  { en: "Libra",       hi: "तुला" },
  { en: "Scorpio",     hi: "वृश्चिक" },
  { en: "Sagittarius", hi: "धनु" },
  { en: "Capricorn",   hi: "मकर" },
  { en: "Aquarius",    hi: "कुंभ" },
  { en: "Pisces",      hi: "मीन" },
];

export const NAKSHATRAS = [
  { en: "Ashwini",           hi: "अश्विनी" },
  { en: "Bharani",           hi: "भरणी" },
  { en: "Krittika",          hi: "कृत्तिका" },
  { en: "Rohini",            hi: "रोहिणी" },
  { en: "Mrigashira",        hi: "मृगशिरा" },
  { en: "Ardra",             hi: "आर्द्रा" },
  { en: "Punarvasu",         hi: "पुनर्वसु" },
  { en: "Pushya",            hi: "पुष्य" },
  { en: "Ashlesha",          hi: "आश्लेषा" },
  { en: "Magha",             hi: "मघा" },
  { en: "Purva Phalguni",    hi: "पूर्वा फाल्गुनी" },
  { en: "Uttara Phalguni",   hi: "उत्तरा फाल्गुनी" },
  { en: "Hasta",             hi: "हस्त" },
  { en: "Chitra",            hi: "चित्रा" },
  { en: "Swati",             hi: "स्वाति" },
  { en: "Vishakha",          hi: "विशाखा" },
  { en: "Anuradha",          hi: "अनुराधा" },
  { en: "Jyeshtha",          hi: "ज्येष्ठा" },
  { en: "Mula",              hi: "मूल" },
  { en: "Purva Ashadha",     hi: "पूर्वाषाढ़ा" },
  { en: "Uttara Ashadha",    hi: "उत्तराषाढ़ा" },
  { en: "Shravana",          hi: "श्रवण" },
  { en: "Dhanishta",         hi: "धनिष्ठा" },
  { en: "Shatabhisha",       hi: "शतभिषा" },
  { en: "Purva Bhadrapada",  hi: "पूर्वा भाद्रपद" },
  { en: "Uttara Bhadrapada", hi: "उत्तरा भाद्रपद" },
  { en: "Revati",            hi: "रेवती" },
];

export const NAK_SPAN = 360 / 27;          // 13°20'
export const CHARAN_SPAN = NAK_SPAN / 4;   // 3°20'

export function rashiAt(deg) {
  return RASHIS[Math.floor(((deg % 360) + 360) % 360 / 30)];
}
export function nakshatraAt(deg) {
  return NAKSHATRAS[Math.floor(((deg % 360) + 360) % 360 / NAK_SPAN)];
}
export function charanAt(deg) {
  const inNak = (((deg % 360) + 360) % 360) % NAK_SPAN;
  return Math.floor(inNak / CHARAN_SPAN) + 1;
}
export function formatDMS(deg) {
  const inRashi = (((deg % 360) + 360) % 360) % 30;
  const d = Math.floor(inRashi);
  const mFloat = (inRashi - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

// UI strings
export const UI = {
  title:        { en: "Gochara", hi: "गोचर" },
  subtitle:     { en: "Planetary Transit Timeline · Swiss Ephemeris", hi: "ग्रह गोचर समयरेखा · स्विस पंचांग" },
  location:     { en: "Location", hi: "स्थान" },
  searchCity:   { en: "Search city…", hi: "शहर खोजें…" },
  timeRange:    { en: "Time Range", hi: "समय सीमा" },
  start:        { en: "Start", hi: "प्रारंभ" },
  end:          { en: "End", hi: "अंत" },
  apply:        { en: "Apply", hi: "लागू करें" },
  yAxis:        { en: "Y-Axis Granularity", hi: "Y-अक्ष विभाजन" },
  rashi:        { en: "Rashi", hi: "राशि" },
  nakshatra:    { en: "Nakshatra", hi: "नक्षत्र" },
  charan:       { en: "Charan", hi: "चरण" },
  settings:     { en: "Calculation", hi: "गणना" },
  ayanamsa:     { en: "Ayanamsa", hi: "अयनांश" },
  nodeType:     { en: "Node (Rahu/Ketu)", hi: "नोड (राहु/केतु)" },
  bodies:       { en: "Celestial Bodies", hi: "ग्रह" },
  all:          { en: "All", hi: "सभी" },
  none:         { en: "None", hi: "कोई नहीं" },
  loading:      { en: "Computing ephemeris…", hi: "पंचांग गणना जारी…" },
  retro:        { en: "Retrograde", hi: "वक्री" },
  presets:      { en: "Quick spans", hi: "त्वरित सीमा" },
  time:         { en: "Time", hi: "समय" },
  position:     { en: "Position", hi: "स्थिति" },
  hint:         { en: "Scroll to zoom · drag to pan · hover for details", hi: "ज़ूम: स्क्रॉल · पैन: ड्रैग · विवरण: होवर" },
  xGrid:        { en: "X-Axis Grid", hi: "X-अक्ष ग्रिड" },
  gridOff:      { en: "Off", hi: "बंद" },
  gridDay:      { en: "Date", hi: "दिनांक" },
  gridMonth:    { en: "Month", hi: "माह" },
  gridYear:     { en: "Year", hi: "वर्ष" },
};

export const PRESETS = [
  { label: { en: "1 Day",  hi: "1 दिन" },   ms: 864e5 },
  { label: { en: "1 Week", hi: "1 सप्ताह" }, ms: 7 * 864e5 },
  { label: { en: "1 Month", hi: "1 माह" },  ms: 30 * 864e5 },
  { label: { en: "1 Year", hi: "1 वर्ष" },   ms: 365.25 * 864e5 },
  { label: { en: "10 Yr",  hi: "10 वर्ष" },  ms: 3652.5 * 864e5 },
  { label: { en: "40 Yr",  hi: "40 वर्ष" },  ms: 14610 * 864e5 },
];
