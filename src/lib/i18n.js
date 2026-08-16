// English/Hindi translations. Two kinds of content here:
//
// 1. UI_STRINGS — static chrome (headers, labels, buttons). Looked up
//    via t("key") through LanguageContext.
// 2. Astrological term dictionaries (planets, rashis, nakshatras, etc.)
//    — these translate *values* that come back from the API, via the
//    translateX() helpers below. Kept separate from UI_STRINGS since
//    they're keyed by the English term itself, not a translation key.
//
// 3. Chart glyph abbreviations (planetAbbr / rashiAbbr / retroMark) —
//    the compact codes printed inside the SVG chart boxes. Devanagari
//    forms follow the conventional single-syllable abbreviations used in
//    Hindi charts, chosen to stay mutually distinguishable: गु (Guru) for
//    Jupiter rather than बृ, which is easily misread as बु (Budh/Mercury);
//    श (Shani) vs शु (Shukra) keeps Saturn and Venus apart.

export const UI_STRINGS = {
  en: {
    appTitle: "Astro Engine",
    appSubtitle: "Vedic & KP birth chart calculator",
    langToggle: "हिन्दी",

    sectionBirthDetails: "Birth Details",
    sectionSummary: "Summary",
    sectionRulingPlanets: "Ruling Planets",
    sectionPanchang: "Panchang Details",
    sectionPlanetaryPositions: "Planetary Positions",
    sectionCusps: "KP Cusps (Placidus)",
    sectionSignificators: "KP Significators (4-Step)",
    northIndianChart: "North Indian Chart",
    southIndianChart: "South Indian Chart",
    chartNorth: "North",
    chartSouth: "South",
    sectionVargas: "Divisional Chart",

    formName: "Name",
    formFirstName: "First Name",
    formFatherName: "Father’s Name",
    formLastName: "Last Name",
    formBirthDetails: "Birth Details",
    formDob: "Date of Birth",
    formTob: "Time of Birth",
    formLocation: "Location",
    formLocationPlaceholder: "Start typing a city…",
    formCalcSettings: "Calculation Settings",
    formAyanamsa: "Ayanamsa",
    formCustomAyanamsa: "Custom Ayanamsa (°)",
    formChartStyle: "Chart Style",
    formRahuKetuNode: "Rahu / Ketu Node",
    formMean: "Mean",
    formTrue: "True",
    formHouseSystem: "House System",
    formSubmit: "Generate Chart",
    formSubmitting: "Calculating…",
    formErrorLocation: "Choose a location from the list — free text isn't enough, we need lat/long.",
    formErrorAyanamsa: "Enter a custom ayanamsa value.",
    formVargas: "Divisional Charts (Vargas)",
    formVargasHint: "Ctrl/Cmd-click to select any number — none requested by default",

    ayanamsaKP: "KP (Krishnamurti)",
    ayanamsaLahiri: "Lahiri",
    ayanamsaRaman: "Raman",
    ayanamsaFagan: "Fagan-Bradley",
    ayanamsaCustomKP: "Custom KP (23°44'18\")",
    ayanamsaCustomManual: "Custom Manual…",
    houseSystemWholeSign: "Vedic (Whole Sign)",
    houseSystemPlacidus: "KP (Placidus)",

    birthName: "Name",
    birthDob: "Date of Birth",
    birthTob: "Time of Birth",
    birthPlace: "Place of Birth",
    birthLatLon: "Latitude / Longitude",
    birthTz: "Timezone",
    birthAyanamsa: "Ayanamsa",
    birthHouseSystem: "House System",
    birthRahuKetu: "Rahu/Ketu Node",

    summaryLagnaRashi: "Lagna Rashi",
    summaryMoonRashi: "Rashi (Moon Sign)",
    summaryNakshatra: "Nakshatra",
    summaryCharan: "Charan",

    rulingLagnaLord: "Lagna Lord",
    rulingLagnaStarLord: "Lagna Star Lord",
    rulingRasiLord: "Rasi Lord",
    rulingDayLord: "Day Lord",
    rulingMoonStarLord: "Moon Star Lord",

    panchangTithi: "Tithi",
    panchangVar: "Var (Day)",
    panchangNakshatra: "Nakshatra",
    panchangYog: "Yog",
    panchangKarana: "Karana",
    panchangEnds: "Ends",

    colPlanet: "Planet",
    colRashi: "Rashi",
    colDegree: "Degree",
    colHouse: "House",
    colCusp: "Cusp",
    colNakshatra: "Nakshatra",
    colNakLord: "Nak. Lord",
    colCharan: "Charan",
    colSub: "Sub",
    colSubSub: "Sub-Sub",
    colSubSubSub: "Sub-Sub-Sub",

    sigHouse: "House",
    sigStepA: "A. Star lord of occupants",
    sigStepB: "B. Occupants",
    sigStepC: "C. Star lord of owner",
    sigStepD: "D. Owner",

    sectionDasha: "Vimshottari Dasha",
    dashaBalanceAtBirth: "Balance at birth",
    dashaRunningOn: "Running on",
    dashaCurrentChain: "Current period",
    dashaMahadasha: "Mahadasha",
    dashaAntardasha: "Antardasha",
    dashaPratyantardasha: "Pratyantardasha",
    dashaSookshma: "Sookshma",
    dashaPrana: "Prana",
    dashaTimeline: "Mahadasha timeline",
    dashaLord: "Lord",
    dashaStart: "Start",
    dashaEnd: "End",
    dashaYears: "Years",
    dashaWithin: "within",

    sectionSunMoon: "Sun & Moon",
    sunSunrise: "Sunrise",
    sunSolarNoon: "Solar noon",
    sunSunset: "Sunset",
    moonMoonrise: "Moonrise",
    moonMoonset: "Moonset",
    dayLength: "Day length",
    nightLength: "Night length",
    doesNotOccur: "does not occur",
    circumpolarNote: "At this latitude and date the Sun does not rise and set — Muhurta periods based on the day span cannot be derived.",
    panchangAtBirth: "At birth",
    panchangAtSunrise: "At sunrise",

    sectionMuhurta: "Muhurta",
    muhurtaHora: "Current Hora",
    muhurtaChoghadiya: "Current Choghadiya",
    muhurtaAbhijit: "Abhijit Muhurta",
    muhurtaRahuKalam: "Rahu Kalam",
    muhurtaYamaganda: "Yamaganda",
    muhurtaGulikaKalam: "Gulika Kalam",
    muhurtaNishita: "Nishita (midpoint)",
    muhurtaBrahmaMuhurta: "Brahma Muhurta",
    muhurtaAbhijitExcluded: "Some traditions don't observe Abhijit Muhurta on Wednesdays.",
    muhurtaQuality_auspicious: "auspicious",
    muhurtaQuality_neutral: "neutral",
    muhurtaQuality_inauspicious: "inauspicious",
  },

  hi: {
    appTitle: "अस्ट्रो एंजन",
    appSubtitle: "वैदिक और के.पी. जन्म कुंडली गणक",
    langToggle: "English",

    sectionBirthDetails: "जन्म विवरण",
    sectionSummary: "सारांश",
    sectionRulingPlanets: "रूलिंग प्लैनेट्स",
    sectionPanchang: "पंचांग विवरण",
    sectionPlanetaryPositions: "ग्रह स्थिति",
    sectionCusps: "के.पी. भाव मध्य (प्लैसिडस)",
    sectionSignificators: "के.पी. कारकत्व (4-चरण)",
    northIndianChart: "उत्तर भारतीय कुंडली",
    southIndianChart: "दक्षिण भारतीय कुंडली",
    chartNorth: "उत्तर",
    chartSouth: "दक्षिण",
    sectionVargas: "विभाग कुंडली",

    formName: "नाम",
    formFirstName: "प्रथम नाम",
    formFatherName: "पिता का नाम",
    formLastName: "उपनाम",
    formBirthDetails: "जन्म विवरण",
    formDob: "जन्म तिथि",
    formTob: "जन्म समय",
    formLocation: "स्थान",
    formLocationPlaceholder: "शहर का नाम टाइप करें…",
    formCalcSettings: "गणना सेटिंग्स",
    formAyanamsa: "अयनांश",
    formCustomAyanamsa: "कस्टम अयनांश (°)",
    formChartStyle: "कुंडली शैली",
    formRahuKetuNode: "राहु / केतु नोड",
    formMean: "मीन",
    formTrue: "ट्रू",
    formHouseSystem: "भाव पद्धति",
    formSubmit: "कुंडली बनाएं",
    formSubmitting: "गणना हो रही है…",
    formErrorLocation: "सूची में से कोई स्थान चुनें — सरल टेक्स्ट पर्याप्त नहीं है, अक्षांश/देशांश चाहिए।",
    formErrorAyanamsa: "कस्टम अयनांश मान दर्ज करें।",
    formVargas: "विभाग कुंडली (वर्ग)",
    formVargasHint: "Ctrl/Cmd दबाकर एक से अधिक चुनें — डिफ़ॉल्ट रूप से कोई नहीं चुना गया",

    ayanamsaKP: "के.पी. (कृष्णमूर्ति)",
    ayanamsaLahiri: "लाहिरी",
    ayanamsaRaman: "रमन",
    ayanamsaFagan: "फेगन-ब्रैडली",
    ayanamsaCustomKP: "कस्टम के.पी. (23°44'18\")",
    ayanamsaCustomManual: "कस्टम मैन्युअल…",
    houseSystemWholeSign: "वैदिक (पूर्ण राशि)",
    houseSystemPlacidus: "के.पी. (प्लैसिडस)",

    birthName: "नाम",
    birthDob: "जन्म तिथि",
    birthTob: "जन्म समय",
    birthPlace: "जन्म स्थान",
    birthLatLon: "अक्षांश / देशांश",
    birthTz: "समय क्षेत्र",
    birthAyanamsa: "अयनांश",
    birthHouseSystem: "भाव पद्धति",
    birthRahuKetu: "राहु/केतु नोड",

    summaryLagnaRashi: "लग्न राशि",
    summaryMoonRashi: "राशि (चंद्र राशि)",
    summaryNakshatra: "नक्षत्र",
    summaryCharan: "चरण",

    rulingLagnaLord: "लग्न स्वामी",
    rulingLagnaStarLord: "लग्न नक्षत्र स्वामी",
    rulingRasiLord: "राशि स्वामी",
    rulingDayLord: "दिन स्वामी",
    rulingMoonStarLord: "चंद्र नक्षत्र स्वामी",

    panchangTithi: "तिथि",
    panchangVar: "वार",
    panchangNakshatra: "नक्षत्र",
    panchangYog: "योग",
    panchangKarana: "करण",
    panchangEnds: "समाप्ति",

    colPlanet: "ग्रह",
    colRashi: "राशि",
    colDegree: "अंश",
    colHouse: "भाव",
    colCusp: "भाव मध्य",
    colNakshatra: "नक्षत्र",
    colNakLord: "नक्षत्र स्वामी",
    colCharan: "चरण",
    colSub: "सब",
    colSubSub: "सब-सब",
    colSubSubSub: "सब-सब-सब",

    sigHouse: "भाव",
    sigStepA: "A. स्थित ग्रहों के नक्षत्र स्वामी",
    sigStepB: "B. स्थित ग्रह",
    sigStepC: "C. स्वामी का नक्षत्र स्वामी",
    sigStepD: "D. स्वामी",

    sectionDasha: "विंशोत्तरी दशा",
    dashaBalanceAtBirth: "जन्म के समय शेष",
    dashaRunningOn: "दिनांक",
    dashaCurrentChain: "वर्तमान दशा",
    dashaMahadasha: "महादशा",
    dashaAntardasha: "अंतर्दशा",
    dashaPratyantardasha: "प्रत्यंतर्दशा",
    dashaSookshma: "सूक्ष्म दशा",
    dashaPrana: "प्राण दशा",
    dashaTimeline: "महादशा क्रम",
    dashaLord: "स्वामी",
    dashaStart: "प्रारंभ",
    dashaEnd: "समाप्ति",
    dashaYears: "वर्ष",
    dashaWithin: "में",

    sectionSunMoon: "सूर्य और चंद्र",
    sunSunrise: "सूर्योदय",
    sunSolarNoon: "मध्याह्न",
    sunSunset: "सूर्यास्त",
    moonMoonrise: "चंद्रोदय",
    moonMoonset: "चंद्रास्त",
    dayLength: "दिनमान",
    nightLength: "रात्रिमान",
    doesNotOccur: "नहीं होता",
    circumpolarNote: "इस अक्षांश और तिथि पर सूर्य उदय-अस्त नहीं होता — दिनमान आधारित मुहूर्त गणना संभव नहीं है।",
    panchangAtBirth: "जन्म समय पर",
    panchangAtSunrise: "सूर्योदय पर",

    sectionMuhurta: "मुहूर्त",
    muhurtaHora: "वर्तमान होरा",
    muhurtaChoghadiya: "वर्तमान चौघड़िया",
    muhurtaAbhijit: "अभिजित मुहूर्त",
    muhurtaRahuKalam: "राहु काल",
    muhurtaYamaganda: "यमगण्ड",
    muhurtaGulikaKalam: "गुलिक काल",
    muhurtaNishita: "निशीथ (मध्य बिंदु)",
    muhurtaBrahmaMuhurta: "ब्रह्म मुहूर्त",
    muhurtaAbhijitExcluded: "कुछ परंपराओं में बुधवार को अभिजित मुहूर्त नहीं माना जाता।",
    muhurtaQuality_auspicious: "शुभ",
    muhurtaQuality_neutral: "सम",
    muhurtaQuality_inauspicious: "अशुभ",
  },
};

// Outer planets: Uranus uses its Indian-astrology name हर्षल (Harshal),
// while Neptune and Pluto use the transliterated forms नेपच्यून and
// प्लुटो rather than their Vedic equivalents (वरुण / यम).
const PLANET_NAMES_HI = {
  Lagna: "लग्न", Sun: "सूर्य", Moon: "चंद्र",
  Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु",
  Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु",
  Ketu: "केतु", Uranus: "हर्षल", Neptune: "नेपच्यून", Pluto: "प्लुटो",
};

const RASHI_NAMES_HI = {
  Aries: "मेष", Taurus: "वृषभ", Gemini: "मिथुन",
  Cancer: "कर्क", Leo: "सिंह", Virgo: "कन्या",
  Libra: "तुला", Scorpio: "वृश्चिक", Sagittarius: "धनु",
  Capricorn: "मकर", Aquarius: "कुंभ", Pisces: "मीन",
};

const NAKSHATRA_NAMES_HI = {
  Ashwini: "अश्विनी", Bharani: "भरणी", Krittika: "कृत्तिका",
  Rohini: "रोहिणी", Mrigashira: "मृगशिरा", Ardra: "आर्द्रा",
  Punarvasu: "पुनर्वसु", Pushya: "पुष्य", Ashlesha: "आश्लेषा",
  Magha: "मघा", "Purva Phalguni": "पूर्व फाल्गुनी",
  "Uttara Phalguni": "उत्तर फाल्गुनी", Hasta: "हस्त",
  Chitra: "चित्रा", Swati: "स्वाति", Vishakha: "विशाखा",
  Anuradha: "अनुराधा", Jyeshtha: "ज्येष्ठा", Mula: "मूल",
  "Purva Ashadha": "पूर्वाषाढ़ा", "Uttara Ashadha": "उत्तराषाढ़ा",
  Shravana: "श्रवण", Dhanishta: "धनिष्ठा", Shatabhisha: "शतभिषा",
  "Purva Bhadrapada": "पूर्व भाद्रपद", "Uttara Bhadrapada": "उत्तर भाद्रपद",
  Revati: "रेवती",
};

const YOGA_NAMES_HI = {
  Vishkambha: "विष्कंभ", Priti: "प्रीति", Ayushman: "आयुष्मान",
  Saubhagya: "सौभाग्य", Shobhana: "शोभन", Atiganda: "अतिगण्ड",
  Sukarma: "सुकर्मा", Dhriti: "धृति", Shoola: "शूल", Ganda: "गण्ड",
  Vriddhi: "वृद्धि", Dhruva: "ध्रुव", Vyaghata: "व्याघात",
  Harshana: "हर्षण", Vajra: "वज्र", Siddhi: "सिद्धि",
  Vyatipata: "व्यतीपात", Variyana: "वरीयान", Parigha: "परिघ",
  Shiva: "शिव", Siddha: "सिद्ध", Sadhya: "साध्य", Shubha: "शुभ",
  Shukla: "शुक्ल", Brahma: "ब्रह्म", Indra: "इन्द्र",
  Vaidhriti: "वैधृति",
};

const KARANA_NAMES_HI = {
  Bava: "बव", Balava: "बालव", Kaulava: "कौलव", Taitila: "तैतिल",
  Gara: "गर", Vanija: "वणिज", Vishti: "विष्टि", Kimstughna: "किंस्तुघ्न",
  Shakuni: "शकुनि", Chatushpada: "चतुष्पद", Naga: "नाग",
};

const TITHI_NAMES_HI = {
  Pratipada: "प्रतिपदा", Dwitiya: "द्वितीया", Tritiya: "तृतीया",
  Chaturthi: "चतुर्थी", Panchami: "पंचमी", Shashthi: "षष्ठी",
  Saptami: "सप्तमी", Ashtami: "अष्टमी", Navami: "नवमी",
  Dashami: "दशमी", Ekadashi: "एकादशी", Dwadashi: "द्वादशी",
  Trayodashi: "त्रयोदशी", Chaturdashi: "चतुर्दशी",
  Purnima: "पूर्णिमा", Amavasya: "अमावस्या",
};

const PAKSHA_HI = { Shukla: "शुक्ल", Krishna: "कृष्ण" };

const WEEKDAY_HI = {
  Sunday: "रविवार", Monday: "सोमवार", Tuesday: "मंगलवार",
  Wednesday: "बुधवार", Thursday: "गुरुवार", Friday: "शुक्रवार",
  Saturday: "शनिवार",
};

// ---- Chart glyph abbreviations ----

const PLANET_ABBR_EN = {
  Lagna: "As", Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
  Uranus: "Ur", Neptune: "Ne", Pluto: "Pl",
};

const PLANET_ABBR_HI = {
  Lagna: "ल", Sun: "सू", Moon: "चं", Mars: "मं", Mercury: "बु",
  Jupiter: "गु", Venus: "शु", Saturn: "श", Rahu: "रा", Ketu: "के",
  Uranus: "हर", Neptune: "ने", Pluto: "प्लु",
};

const RASHI_ABBR_EN = {
  Aries: "Ar", Taurus: "Ta", Gemini: "Ge", Cancer: "Cn", Leo: "Le", Virgo: "Vi",
  Libra: "Li", Scorpio: "Sc", Sagittarius: "Sg", Capricorn: "Cp", Aquarius: "Aq", Pisces: "Pi",
};

const RASHI_ABBR_HI = {
  Aries: "मे", Taurus: "वृ", Gemini: "मि", Cancer: "कर्", Leo: "सिं", Virgo: "कन्",
  Libra: "तु", Scorpio: "वृश", Sagittarius: "ध", Capricorn: "मक", Aquarius: "कुं", Pisces: "मी",
};

export const planetAbbr = (name, lang) =>
  (lang === "hi" ? PLANET_ABBR_HI : PLANET_ABBR_EN)[name] ?? name.slice(0, 2);

export const rashiAbbr = (name, lang) =>
  (lang === "hi" ? RASHI_ABBR_HI : RASHI_ABBR_EN)[name] ?? name.slice(0, 2);

// Retrograde marker: व for वक्री (vakri) in Hindi charts.
export const retroMark = (lang) => (lang === "hi" ? "(व)" : "(R)");

export const ascLabel = (lang) => (lang === "hi" ? "लग्न" : "Asc");

function pick(dict, name, lang) {
  if (lang !== "hi") return name;
  return dict[name] ?? name;
}

export const translatePlanet = (name, lang) => pick(PLANET_NAMES_HI, name, lang);
export const translateRashi = (name, lang) => pick(RASHI_NAMES_HI, name, lang);
export const translateNakshatra = (name, lang) => pick(NAKSHATRA_NAMES_HI, name, lang);
export const translateYoga = (name, lang) => pick(YOGA_NAMES_HI, name, lang);
export const translateKarana = (name, lang) => pick(KARANA_NAMES_HI, name, lang);
export const translateWeekday = (name, lang) => pick(WEEKDAY_HI, name, lang);

// Tithi labels arrive pre-formatted from the API, e.g. "Shukla 2 (Dwitiya)".
// Translate the paksha + tithi-name words in place rather than trying to
// re-derive the parts.
export function translateTithiLabel(label, lang) {
  if (lang !== "hi" || !label) return label;
  const match = label.match(/^(\w+)\s+(\d+)\s+\((\w+)\)$/);
  if (!match) return label;
  const [, paksha, num, name] = match;
  const pakshaHi = PAKSHA_HI[paksha] ?? paksha;
  const nameHi = TITHI_NAMES_HI[name] ?? name;
  return `${pakshaHi} ${num} (${nameHi})`;
}
