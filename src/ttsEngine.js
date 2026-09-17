// src/ttsEngine.js — High-Fidelity & Funny Neural TTS Engine for TikTok Live
// Powered by Microsoft Edge Neural AI (msedge-tts) + Google TTS fallback
// Supports Indonesian natural voices, funny/kocak character models, and regional dialects.

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// Voice Catalog: Indonesia Pria + Cewek, lalu semua bahasa dunia (Edge Neural)
const VOICE_CATALOG = [

  // ── 🇮🇩 INDONESIA ──────────────────────────────────────────────────────────
  { id: 'id-pria',  name: '🇮🇩 Indonesia — Pria (Ardi)',   category: 'id-pria',  edgeVoice: 'id-ID-ArdiNeural',   pitch: '-4Hz', rate: '+2%', sample: 'Halo kawan! Siap membacakan semua komentar live kalian.' },
  { id: 'id-cewek', name: '🇮🇩 Indonesia — Wanita Dewasa (Gadis)', category: 'id-cewek', edgeVoice: 'id-ID-GadisNeural',  pitch: '-15Hz', rate: '-5%', sample: 'Halo, selamat datang di live streaming ini. Semoga harimu menyenangkan.' },
  { id: 'jv-ID-D',  name: '🇮🇩 Indonesia — Pria Jawa (Dimas)', category: 'id-pria',  edgeVoice: 'jv-ID-DimasNeural',  pitch: 'default', rate: 'default', sample: 'Matur nuwun sanget mas mbak sampun rawuh ing live streaming niki.' },
  { id: 'jv-ID-S',  name: '🇮🇩 Indonesia — Cewek Jawa (Siti)', category: 'id-cewek', edgeVoice: 'jv-ID-SitiNeural',   pitch: 'default', rate: 'default', sample: 'Mugi-mugi lancar rezekine lan diparingi kesehatan tansah.' },
  { id: 'su-ID-J',  name: '🇮🇩 Indonesia — Pria Sunda (Jajang)', category: 'id-pria',  edgeVoice: 'su-ID-JajangNeural', pitch: 'default', rate: 'default', sample: 'Hatur nuhun pisan kang parantos sumping ka live ieu.' },
  { id: 'su-ID-T',  name: '🇮🇩 Indonesia — Cewek Sunda (Tuti)',  category: 'id-cewek', edgeVoice: 'su-ID-TutiNeural',   pitch: 'default', rate: 'default', sample: 'Hatur nuhun pisan sadayana, wilujeng sumping di live streaming urang sarerea.' },

  // ── 🌍 BAHASA DUNIA ─────────────────────────────────────────────────────────
  // Afrika Selatan (Afrikaans)
  { id: 'af-ZA-W', name: '🇿🇦 Afrikaans — Pria (Willem)',       category: 'dunia', edgeVoice: 'af-ZA-WilhelmNeural',     pitch: 'default', rate: 'default', sample: 'Hallo, welkom by die regstreekse uitsending.' },
  { id: 'af-ZA-A', name: '🇿🇦 Afrikaans — Cewek (Adri)',        category: 'dunia', edgeVoice: 'af-ZA-AdriNeural',        pitch: 'default', rate: 'default', sample: 'Baie dankie vir jou bydrae aan die stroom.' },
  // Albania
  { id: 'sq-AL-I', name: '🇦🇱 Albania — Pria (Ilir)',            category: 'dunia', edgeVoice: 'sq-AL-IlirNeural',        pitch: 'default', rate: 'default', sample: 'Mirë se vini në transmetimin live.' },
  { id: 'sq-AL-A', name: '🇦🇱 Albania — Cewek (Anila)',          category: 'dunia', edgeVoice: 'sq-AL-AnilaNeural',       pitch: 'default', rate: 'default', sample: 'Faleminderit për mbështetjen tuaj.' },
  // Amharic (Ethiopia)
  { id: 'am-ET-A', name: '🇪🇹 Amharic — Pria (Ameha)',           category: 'dunia', edgeVoice: 'am-ET-AmehaNeural',       pitch: 'default', rate: 'default', sample: 'እንኳን ደህና መጡ።' },
  { id: 'am-ET-M', name: '🇪🇹 Amharic — Cewek (Mekdes)',         category: 'dunia', edgeVoice: 'am-ET-MekdesNeural',      pitch: 'default', rate: 'default', sample: 'ስለ ስጦታዎ እናመሰግናለን።' },
  // Arab
  { id: 'ar-SA-H', name: '🇸🇦 Arab — Pria (Hamed)',              category: 'dunia', edgeVoice: 'ar-SA-HamedNeural',       pitch: 'default', rate: 'default', sample: 'مرحباً بكم في البث المباشر.' },
  { id: 'ar-EG-S', name: '🇪🇬 Arab Mesir — Cewek (Salma)',       category: 'dunia', edgeVoice: 'ar-EG-SalmaNeural',       pitch: 'default', rate: 'default', sample: 'شكراً جزيلاً على دعمكم.' },
  // Azerbaijan
  { id: 'az-AZ-B', name: '🇦🇿 Azerbaijan — Pria (Baber)',        category: 'dunia', edgeVoice: 'az-AZ-BabekNeural',       pitch: 'default', rate: 'default', sample: 'Canlı yayına xoş gəlmisiniz.' },
  { id: 'az-AZ-B2',name: '🇦🇿 Azerbaijan — Cewek (Banu)',        category: 'dunia', edgeVoice: 'az-AZ-BanuNeural',        pitch: 'default', rate: 'default', sample: 'Dəstəyiniz üçün təşəkkür edirik.' },
  // Bulgaria
  { id: 'bg-BG-B', name: '🇧🇬 Bulgaria — Pria (Borislav)',       category: 'dunia', edgeVoice: 'bg-BG-BorislavNeural',    pitch: 'default', rate: 'default', sample: 'Добре дошли в живото излъчване.' },
  { id: 'bg-BG-K', name: '🇧🇬 Bulgaria — Cewek (Kalina)',        category: 'dunia', edgeVoice: 'bg-BG-KalinaNeural',      pitch: 'default', rate: 'default', sample: 'Благодарим ви за подаръка.' },
  // Bengali
  { id: 'bn-BD-P', name: '🇧🇩 Bengali — Pria (Pradeep)',         category: 'dunia', edgeVoice: 'bn-BD-PradeepNeural',     pitch: 'default', rate: 'default', sample: 'লাইভ স্ট্রিমে স্বাগতম।' },
  { id: 'bn-IN-B', name: '🇮🇳 Bengali India — Cewek (Bashkar)',  category: 'dunia', edgeVoice: 'bn-IN-BashkarNeural',     pitch: 'default', rate: 'default', sample: 'আপনার সমর্থনের জন্য ধন্যবাদ।' },
  // Bosnia
  { id: 'bs-BA-G', name: '🇧🇦 Bosnia — Pria (Goran)',            category: 'dunia', edgeVoice: 'bs-BA-GoranNeural',       pitch: 'default', rate: 'default', sample: 'Dobrodošli na live stream.' },
  { id: 'bs-BA-V', name: '🇧🇦 Bosnia — Cewek (Vesna)',           category: 'dunia', edgeVoice: 'bs-BA-VesnaNeural',       pitch: 'default', rate: 'default', sample: 'Hvala vam na podršci.' },
  // Catalan
  { id: 'ca-ES-J', name: '🇪🇸 Catalan — Pria (Joana)',           category: 'dunia', edgeVoice: 'ca-ES-JoanaNeural',       pitch: 'default', rate: 'default', sample: 'Benvinguts a l\'emissió en directe.' },
  { id: 'ca-ES-E', name: '🇪🇸 Catalan — Cewek (Enric)',          category: 'dunia', edgeVoice: 'ca-ES-EnricNeural',       pitch: 'default', rate: 'default', sample: 'Gràcies pel vostre suport.' },
  // Ceko
  { id: 'cs-CZ-A', name: '🇨🇿 Ceko — Pria (Antonin)',            category: 'dunia', edgeVoice: 'cs-CZ-AntoninNeural',     pitch: 'default', rate: 'default', sample: 'Vítejte na živém vysílání.' },
  { id: 'cs-CZ-V', name: '🇨🇿 Ceko — Cewek (Vlasta)',            category: 'dunia', edgeVoice: 'cs-CZ-VlastaNeural',      pitch: 'default', rate: 'default', sample: 'Děkujeme za váš dárek.' },
  // Welsh
  { id: 'cy-GB-A', name: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh — Pria (Aled)',                category: 'dunia', edgeVoice: 'cy-GB-AledNeural',        pitch: 'default', rate: 'default', sample: 'Croeso i\'r ffrwd fyw.' },
  { id: 'cy-GB-N', name: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh — Cewek (Nia)',                 category: 'dunia', edgeVoice: 'cy-GB-NiaNeural',         pitch: 'default', rate: 'default', sample: 'Diolch am eich anrheg.' },
  // Denmark
  { id: 'da-DK-J', name: '🇩🇰 Denmark — Pria (Jeppe)',           category: 'dunia', edgeVoice: 'da-DK-JeppeNeural',       pitch: 'default', rate: 'default', sample: 'Velkommen til live streamen.' },
  { id: 'da-DK-C', name: '🇩🇰 Denmark — Cewek (Christel)',       category: 'dunia', edgeVoice: 'da-DK-ChristelNeural',    pitch: 'default', rate: 'default', sample: 'Tak for din gave.' },
  // Jerman
  { id: 'de-DE-C', name: '🇩🇪 Jerman — Pria (Conrad)',           category: 'dunia', edgeVoice: 'de-DE-ConradNeural',      pitch: 'default', rate: 'default', sample: 'Willkommen im Livestream.' },
  { id: 'de-DE-K', name: '🇩🇪 Jerman — Cewek (Katja)',           category: 'dunia', edgeVoice: 'de-DE-KatjaNeural',       pitch: 'default', rate: 'default', sample: 'Danke für dein Geschenk.' },
  // Yunani
  { id: 'el-GR-N', name: '🇬🇷 Yunani — Pria (Nestoras)',         category: 'dunia', edgeVoice: 'el-GR-NestorasNeural',    pitch: 'default', rate: 'default', sample: 'Καλωσορίσατε στη ζωντανή μετάδοση.' },
  { id: 'el-GR-A', name: '🇬🇷 Yunani — Cewek (Athina)',          category: 'dunia', edgeVoice: 'el-GR-AthinaNeural',      pitch: 'default', rate: 'default', sample: 'Ευχαριστούμε για το δώρο σας.' },
  // Inggris US
  { id: 'en-US-G', name: '🇺🇸 Inggris US — Pria (Guy)',          category: 'dunia', edgeVoice: 'en-US-GuyNeural',         pitch: 'default', rate: 'default', sample: 'Welcome to the live stream!' },
  { id: 'en-US-A', name: '🇺🇸 Inggris US — Cewek (Aria)',        category: 'dunia', edgeVoice: 'en-US-AriaNeural',        pitch: 'default', rate: 'default', sample: 'Thank you so much for the gift!' },
  // Inggris UK
  { id: 'en-GB-R', name: '🇬🇧 Inggris UK — Pria (Ryan)',         category: 'dunia', edgeVoice: 'en-GB-RyanNeural',        pitch: 'default', rate: 'default', sample: 'Welcome to the live stream, mate!' },
  { id: 'en-GB-S', name: '🇬🇧 Inggris UK — Cewek (Sonia)',       category: 'dunia', edgeVoice: 'en-GB-SoniaNeural',       pitch: 'default', rate: 'default', sample: 'Thank you for your lovely gift!' },
  // Inggris Australia
  { id: 'en-AU-W', name: '🇦🇺 Inggris AU — Pria (William)',      category: 'dunia', edgeVoice: 'en-AU-WilliamNeural',     pitch: 'default', rate: 'default', sample: 'G\'day, welcome to the live stream!' },
  { id: 'en-AU-N', name: '🇦🇺 Inggris AU — Cewek (Natasha)',     category: 'dunia', edgeVoice: 'en-AU-NatashaNeural',     pitch: 'default', rate: 'default', sample: 'Thanks for the gift, much appreciated!' },
  // Spanyol
  { id: 'es-ES-A', name: '🇪🇸 Spanyol — Pria (Alvaro)',          category: 'dunia', edgeVoice: 'es-ES-AlvaroNeural',      pitch: 'default', rate: 'default', sample: 'Bienvenidos al stream en vivo.' },
  { id: 'es-ES-E', name: '🇪🇸 Spanyol — Cewek (Elvira)',         category: 'dunia', edgeVoice: 'es-ES-ElviraNeural',      pitch: 'default', rate: 'default', sample: 'Gracias por tu regalo.' },
  // Spanyol Meksiko
  { id: 'es-MX-J', name: '🇲🇽 Spanyol MX — Pria (Jorge)',        category: 'dunia', edgeVoice: 'es-MX-JorgeNeural',       pitch: 'default', rate: 'default', sample: 'Bienvenidos al stream.' },
  { id: 'es-MX-D', name: '🇲🇽 Spanyol MX — Cewek (Dalia)',       category: 'dunia', edgeVoice: 'es-MX-DaliaNeural',       pitch: 'default', rate: 'default', sample: 'Gracias por tu apoyo.' },
  // Estonia
  { id: 'et-EE-A', name: '🇪🇪 Estonia — Pria (Anu)',             category: 'dunia', edgeVoice: 'et-EE-AnuNeural',         pitch: 'default', rate: 'default', sample: 'Tere tulemast otseülekandesse.' },
  { id: 'et-EE-K', name: '🇪🇪 Estonia — Cewek (Kert)',           category: 'dunia', edgeVoice: 'et-EE-KertNeural',        pitch: 'default', rate: 'default', sample: 'Täname kingituse eest.' },
  // Basque
  { id: 'eu-ES-A', name: '🇪🇸 Basque — Pria (Aitor)',            category: 'dunia', edgeVoice: 'eu-ES-AitorNeural',       pitch: 'default', rate: 'default', sample: 'Ongi etorri zuzeneko emankizunera.' },
  { id: 'eu-ES-A2',name: '🇪🇸 Basque — Cewek (Amaia)',           category: 'dunia', edgeVoice: 'eu-ES-AmaiaNeural',       pitch: 'default', rate: 'default', sample: 'Eskerrik asko zure opariaren truke.' },
  // Persia
  { id: 'fa-IR-D', name: '🇮🇷 Persia — Pria (Dilnoza)',          category: 'dunia', edgeVoice: 'fa-IR-DilaraNeural',      pitch: 'default', rate: 'default', sample: 'خوش آمدید به پخش زنده.' },
  { id: 'fa-IR-F', name: '🇮🇷 Persia — Cewek (Farid)',           category: 'dunia', edgeVoice: 'fa-IR-FaridNeural',       pitch: 'default', rate: 'default', sample: 'ممنون از هدیه شما.' },
  // Finlandia
  { id: 'fi-FI-H', name: '🇫🇮 Finlandia — Pria (Harri)',         category: 'dunia', edgeVoice: 'fi-FI-HarriNeural',       pitch: 'default', rate: 'default', sample: 'Tervetuloa suoraan lähetykseen.' },
  { id: 'fi-FI-N', name: '🇫🇮 Finlandia — Cewek (Noora)',        category: 'dunia', edgeVoice: 'fi-FI-NooraNeural',       pitch: 'default', rate: 'default', sample: 'Kiitos lahjastasi.' },
  // Filipina (Filipino)
  { id: 'fil-PH-A',name: '🇵🇭 Filipina — Pria (Angelo)',         category: 'dunia', edgeVoice: 'fil-PH-AngeloNeural',     pitch: 'default', rate: 'default', sample: 'Maligayang pagdating sa live stream.' },
  { id: 'fil-PH-B',name: '🇵🇭 Filipina — Cewek (Blessica)',      category: 'dunia', edgeVoice: 'fil-PH-BlessicaNeural',   pitch: 'default', rate: 'default', sample: 'Salamat sa iyong regalo.' },
  // Prancis
  { id: 'fr-FR-H', name: '🇫🇷 Prancis — Pria (Henri)',           category: 'dunia', edgeVoice: 'fr-FR-HenriNeural',       pitch: 'default', rate: 'default', sample: 'Bienvenue sur le live.' },
  { id: 'fr-FR-D', name: '🇫🇷 Prancis — Cewek (Denise)',         category: 'dunia', edgeVoice: 'fr-FR-DeniseNeural',      pitch: 'default', rate: 'default', sample: 'Merci pour votre cadeau.' },
  // Galicia
  { id: 'gl-ES-R', name: '🇪🇸 Galicia — Pria (Roi)',             category: 'dunia', edgeVoice: 'gl-ES-RoiNeural',         pitch: 'default', rate: 'default', sample: 'Benvido á transmisión en directo.' },
  { id: 'gl-ES-S', name: '🇪🇸 Galicia — Cewek (Sabela)',         category: 'dunia', edgeVoice: 'gl-ES-SabelaNeural',      pitch: 'default', rate: 'default', sample: 'Grazas polo teu agasallo.' },
  // Gujarati (India)
  { id: 'gu-IN-N', name: '🇮🇳 Gujarati — Pria (Niranjan)',       category: 'dunia', edgeVoice: 'gu-IN-NiranjanNeural',    pitch: 'default', rate: 'default', sample: 'લાઇવ સ્ટ્રીમ માં આપનું સ્વાગત છે.' },
  { id: 'gu-IN-D', name: '🇮🇳 Gujarati — Cewek (Dhwani)',        category: 'dunia', edgeVoice: 'gu-IN-DhwaniNeural',      pitch: 'default', rate: 'default', sample: 'ભેટ માટે આભાર.' },
  // Ibrani (Israel)
  { id: 'he-IL-A', name: '🇮🇱 Ibrani — Pria (Avri)',             category: 'dunia', edgeVoice: 'he-IL-AvriNeural',        pitch: 'default', rate: 'default', sample: 'ברוכים הבאים לשידור החי.' },
  { id: 'he-IL-H', name: '🇮🇱 Ibrani — Cewek (Hila)',            category: 'dunia', edgeVoice: 'he-IL-HilaNeural',        pitch: 'default', rate: 'default', sample: 'תודה על המתנה.' },
  // Hindi
  { id: 'hi-IN-M', name: '🇮🇳 Hindi — Pria (Madhur)',            category: 'dunia', edgeVoice: 'hi-IN-MadhurNeural',      pitch: 'default', rate: 'default', sample: 'लाइव स्ट्रीम में आपका स्वागत है।' },
  { id: 'hi-IN-S', name: '🇮🇳 Hindi — Cewek (Swara)',            category: 'dunia', edgeVoice: 'hi-IN-SwaraNeural',       pitch: 'default', rate: 'default', sample: 'आपके उपहार के लिए धन्यवाद।' },
  // Kroasia
  { id: 'hr-HR-S', name: '🇭🇷 Kroasia — Pria (Srecko)',          category: 'dunia', edgeVoice: 'hr-HR-SreckoNeural',      pitch: 'default', rate: 'default', sample: 'Dobrodošli na live stream.' },
  { id: 'hr-HR-G', name: '🇭🇷 Kroasia — Cewek (Gabrijela)',      category: 'dunia', edgeVoice: 'hr-HR-GabrijelajNeural',  pitch: 'default', rate: 'default', sample: 'Hvala vam na daru.' },
  // Hungaria
  { id: 'hu-HU-T', name: '🇭🇺 Hungaria — Pria (Tamas)',          category: 'dunia', edgeVoice: 'hu-HU-TamasNeural',       pitch: 'default', rate: 'default', sample: 'Üdvözöljük az élő közvetítésben.' },
  { id: 'hu-HU-N', name: '🇭🇺 Hungaria — Cewek (Noemi)',         category: 'dunia', edgeVoice: 'hu-HU-NoemiNeural',       pitch: 'default', rate: 'default', sample: 'Köszönjük az ajándékot.' },
  // Armenia
  { id: 'hy-AM-H', name: '🇦🇲 Armenia — Pria (Hayk)',            category: 'dunia', edgeVoice: 'hy-AM-HaykNeural',        pitch: 'default', rate: 'default', sample: 'Բարի գալուստ ուղիղ հեռարձակում.' },
  { id: 'hy-AM-A', name: '🇦🇲 Armenia — Cewek (Anahit)',         category: 'dunia', edgeVoice: 'hy-AM-AnahitNeural',      pitch: 'default', rate: 'default', sample: 'Շնորհակալություն նվերի համար.' },
  // Jawa (Indonesia)
  { id: 'jv-ID-D', name: '🌾 Jawa — Pria (Dimas)',               category: 'dunia', edgeVoice: 'jv-ID-DimasNeural',       pitch: 'default', rate: 'default', sample: 'Matur nuwun sanget sampun rawuh ing live niki.' },
  { id: 'jv-ID-S', name: '🌾 Jawa — Cewek (Siti)',               category: 'dunia', edgeVoice: 'jv-ID-SitiNeural',        pitch: 'default', rate: 'default', sample: 'Mugi-mugi lancar rezekine.' },
  // Georgia
  { id: 'ka-GE-G', name: '🇬🇪 Georgia — Pria (Giorgi)',          category: 'dunia', edgeVoice: 'ka-GE-GiorgiNeural',      pitch: 'default', rate: 'default', sample: 'კეთილი იყოს თქვენი მობრძანება.' },
  { id: 'ka-GE-E', name: '🇬🇪 Georgia — Cewek (Eka)',            category: 'dunia', edgeVoice: 'ka-GE-EkaNeural',         pitch: 'default', rate: 'default', sample: 'მადლობა საჩუქრისთვის.' },
  // Kazakstan
  { id: 'kk-KZ-D', name: '🇰🇿 Kazak — Pria (Daulet)',            category: 'dunia', edgeVoice: 'kk-KZ-DauletNeural',      pitch: 'default', rate: 'default', sample: 'Тікелей эфирге қош келдіңіз.' },
  { id: 'kk-KZ-A', name: '🇰🇿 Kazak — Cewek (Aigul)',            category: 'dunia', edgeVoice: 'kk-KZ-AigulNeural',       pitch: 'default', rate: 'default', sample: 'Сыйлығыңыз үшін рахмет.' },
  // Khmer (Kamboja)
  { id: 'km-KH-P', name: '🇰🇭 Khmer — Pria (Piseth)',            category: 'dunia', edgeVoice: 'km-KH-PisethNeural',      pitch: 'default', rate: 'default', sample: 'សូមស្វាគមន៍មកកាន់ការផ្សាយផ្ទាល់។' },
  { id: 'km-KH-S', name: '🇰🇭 Khmer — Cewek (Sreymom)',          category: 'dunia', edgeVoice: 'km-KH-SreymomNeural',     pitch: 'default', rate: 'default', sample: 'អរគុណចំពោះmón quà របស់អ្នក។' },
  // Kannada (India)
  { id: 'kn-IN-G', name: '🇮🇳 Kannada — Pria (Gagan)',           category: 'dunia', edgeVoice: 'kn-IN-GaganNeural',       pitch: 'default', rate: 'default', sample: 'ಲೈವ್ ಸ್ಟ್ರೀಮ್‌ಗೆ ಸ್ವಾಗತ.' },
  { id: 'kn-IN-S', name: '🇮🇳 Kannada — Cewek (Sapna)',          category: 'dunia', edgeVoice: 'kn-IN-SapnaNeural',       pitch: 'default', rate: 'default', sample: 'ನಿಮ್ಮ ಉಡುಗೊರೆಗೆ ಧನ್ಯವಾದ.' },
  // Korea
  { id: 'ko-KR-I', name: '🇰🇷 Korea — Pria (InJoon)',            category: 'dunia', edgeVoice: 'ko-KR-InJoonNeural',      pitch: 'default', rate: 'default', sample: '라이브 스트림에 오신 것을 환영합니다.' },
  { id: 'ko-KR-S', name: '🇰🇷 Korea — Cewek (SunHi)',            category: 'dunia', edgeVoice: 'ko-KR-SunHiNeural',       pitch: 'default', rate: 'default', sample: '선물 감사합니다!' },
  // Lao
  { id: 'lo-LA-C', name: '🇱🇦 Lao — Pria (Chanthavong)',         category: 'dunia', edgeVoice: 'lo-LA-ChanthavongNeural', pitch: 'default', rate: 'default', sample: 'ຍິນດີຕ້ອນຮັບສູ່ການສົດ.' },
  { id: 'lo-LA-K', name: '🇱🇦 Lao — Cewek (Keomany)',            category: 'dunia', edgeVoice: 'lo-LA-KeomanyNeural',     pitch: 'default', rate: 'default', sample: 'ຂອບໃຈສຳລັບຂອງຂວັນ.' },
  // Lithuania
  { id: 'lt-LT-L', name: '🇱🇹 Lithuania — Pria (Leonas)',        category: 'dunia', edgeVoice: 'lt-LT-LeonasNeural',      pitch: 'default', rate: 'default', sample: 'Sveiki atvykę į tiesioginę transliaciją.' },
  { id: 'lt-LT-O', name: '🇱🇹 Lithuania — Cewek (Ona)',          category: 'dunia', edgeVoice: 'lt-LT-OnaNeural',         pitch: 'default', rate: 'default', sample: 'Ačiū už jūsų dovaną.' },
  // Latvia
  { id: 'lv-LV-N', name: '🇱🇻 Latvia — Pria (Nils)',             category: 'dunia', edgeVoice: 'lv-LV-NilsNeural',        pitch: 'default', rate: 'default', sample: 'Laipni lūdzam tiešraidē.' },
  { id: 'lv-LV-E', name: '🇱🇻 Latvia — Cewek (Everita)',         category: 'dunia', edgeVoice: 'lv-LV-EveritaNeural',     pitch: 'default', rate: 'default', sample: 'Paldies par jūsu dāvanu.' },
  // Makedonia
  { id: 'mk-MK-A', name: '🇲🇰 Makedonia — Pria (Aleksandar)',   category: 'dunia', edgeVoice: 'mk-MK-AleksandarNeural',  pitch: 'default', rate: 'default', sample: 'Добредојдовте на директен пренос.' },
  { id: 'mk-MK-M', name: '🇲🇰 Makedonia — Cewek (Marija)',      category: 'dunia', edgeVoice: 'mk-MK-MarijaNeural',      pitch: 'default', rate: 'default', sample: 'Ви благодариме за подарокот.' },
  // Malayalam (India)
  { id: 'ml-IN-S', name: '🇮🇳 Malayalam — Pria (Sobhana)',       category: 'dunia', edgeVoice: 'ml-IN-SobhanaNeural',     pitch: 'default', rate: 'default', sample: 'ലൈവ് സ്ട്രീമിലേക്ക് സ്വാഗതം.' },
  { id: 'ml-IN-M', name: '🇮🇳 Malayalam — Cewek (Midhun)',       category: 'dunia', edgeVoice: 'ml-IN-MidhunNeural',      pitch: 'default', rate: 'default', sample: 'സമ്മാനത്തിന് നന്ദി.' },
  // Mongolia
  { id: 'mn-MN-B', name: '🇲🇳 Mongolia — Pria (Bataa)',          category: 'dunia', edgeVoice: 'mn-MN-BataaNeural',       pitch: 'default', rate: 'default', sample: 'Шууд дамжуулалтад тавтай морилно уу.' },
  { id: 'mn-MN-Y', name: '🇲🇳 Mongolia — Cewek (Yesui)',         category: 'dunia', edgeVoice: 'mn-MN-YesuiNeural',       pitch: 'default', rate: 'default', sample: 'Бэлэгний төлөө баярлалаа.' },
  // Marathi (India)
  { id: 'mr-IN-A', name: '🇮🇳 Marathi — Pria (Aarohi)',          category: 'dunia', edgeVoice: 'mr-IN-AarohiNeural',      pitch: 'default', rate: 'default', sample: 'लाइव्ह स्ट्रीमवर आपले स्वागत आहे.' },
  { id: 'mr-IN-M', name: '🇮🇳 Marathi — Cewek (Manohar)',        category: 'dunia', edgeVoice: 'mr-IN-ManoharNeural',     pitch: 'default', rate: 'default', sample: 'तुमच्या भेटवस्तूसाठी धन्यवाद.' },
  // Melayu Malaysia
  { id: 'ms-MY-O', name: '🇲🇾 Melayu — Pria (Osman)',            category: 'dunia', edgeVoice: 'ms-MY-OsmanNeural',       pitch: 'default', rate: 'default', sample: 'Selamat datang ke siaran langsung.' },
  { id: 'ms-MY-Y', name: '🇲🇾 Melayu — Cewek (Yasmin)',          category: 'dunia', edgeVoice: 'ms-MY-YasminNeural',      pitch: 'default', rate: 'default', sample: 'Terima kasih atas hadiah anda.' },
  // Malta
  { id: 'mt-MT-G', name: '🇲🇹 Malta — Pria (Gabriele)',          category: 'dunia', edgeVoice: 'mt-MT-GabrielNeural',     pitch: 'default', rate: 'default', sample: 'Merħba fil-live stream.' },
  { id: 'mt-MT-G2',name: '🇲🇹 Malta — Cewek (Grace)',            category: 'dunia', edgeVoice: 'mt-MT-GraceNeural',       pitch: 'default', rate: 'default', sample: 'Grazzi għall-rigal tiegħek.' },
  // Myanmar
  { id: 'my-MM-T', name: '🇲🇲 Myanmar — Pria (Thiha)',           category: 'dunia', edgeVoice: 'my-MM-ThihaNeural',       pitch: 'default', rate: 'default', sample: 'တိုက်ရိုက်ထုတ်လွှင့်မှုသို့ ကြိုဆိုပါသည်။' },
  { id: 'my-MM-N', name: '🇲🇲 Myanmar — Cewek (Nilar)',          category: 'dunia', edgeVoice: 'my-MM-NilarNeural',       pitch: 'default', rate: 'default', sample: 'လက်ဆောင်အတွက် ကျေးဇူးတင်ပါသည်။' },
  // Norwegia
  { id: 'nb-NO-F', name: '🇳🇴 Norwegia — Pria (Finn)',           category: 'dunia', edgeVoice: 'nb-NO-FinnNeural',        pitch: 'default', rate: 'default', sample: 'Velkommen til live streamen.' },
  { id: 'nb-NO-I', name: '🇳🇴 Norwegia — Cewek (Iselin)',        category: 'dunia', edgeVoice: 'nb-NO-IselinNeural',      pitch: 'default', rate: 'default', sample: 'Takk for gaven din.' },
  // Nepal
  { id: 'ne-NP-S', name: '🇳🇵 Nepal — Pria (Sagar)',             category: 'dunia', edgeVoice: 'ne-NP-SagarNeural',       pitch: 'default', rate: 'default', sample: 'लाइभ स्ट्रिममा स्वागत छ।' },
  { id: 'ne-NP-H', name: '🇳🇵 Nepal — Cewek (Hemkala)',          category: 'dunia', edgeVoice: 'ne-NP-HemkalaNeural',     pitch: 'default', rate: 'default', sample: 'उपहारको लागि धन्यवाद।' },
  // Belanda
  { id: 'nl-NL-M', name: '🇳🇱 Belanda — Pria (Maarten)',         category: 'dunia', edgeVoice: 'nl-NL-MaartenNeural',     pitch: 'default', rate: 'default', sample: 'Welkom bij de livestream.' },
  { id: 'nl-NL-F', name: '🇳🇱 Belanda — Cewek (Fenna)',          category: 'dunia', edgeVoice: 'nl-NL-FennaNeural',       pitch: 'default', rate: 'default', sample: 'Bedankt voor je cadeau.' },
  // Polandia
  { id: 'pl-PL-M', name: '🇵🇱 Polandia — Pria (Marek)',          category: 'dunia', edgeVoice: 'pl-PL-MarekNeural',       pitch: 'default', rate: 'default', sample: 'Witamy na transmisji na żywo.' },
  { id: 'pl-PL-Z', name: '🇵🇱 Polandia — Cewek (Zofia)',         category: 'dunia', edgeVoice: 'pl-PL-ZofiaNeural',       pitch: 'default', rate: 'default', sample: 'Dziękujemy za prezent.' },
  // Portugis Brasil
  { id: 'pt-BR-A', name: '🇧🇷 Portugis BR — Pria (Antonio)',     category: 'dunia', edgeVoice: 'pt-BR-AntonioNeural',     pitch: 'default', rate: 'default', sample: 'Bem-vindo à transmissão ao vivo.' },
  { id: 'pt-BR-F', name: '🇧🇷 Portugis BR — Cewek (Francisca)',  category: 'dunia', edgeVoice: 'pt-BR-FranciscaNeural',   pitch: 'default', rate: 'default', sample: 'Obrigada pelo presente.' },
  // Portugis Portugal
  { id: 'pt-PT-D', name: '🇵🇹 Portugis PT — Pria (Duarte)',      category: 'dunia', edgeVoice: 'pt-PT-DuarteNeural',      pitch: 'default', rate: 'default', sample: 'Bem-vindo à transmissão em direto.' },
  { id: 'pt-PT-R', name: '🇵🇹 Portugis PT — Cewek (Raquel)',     category: 'dunia', edgeVoice: 'pt-PT-RaquelNeural',      pitch: 'default', rate: 'default', sample: 'Obrigada pelo seu presente.' },
  // Romania
  { id: 'ro-RO-E', name: '🇷🇴 Romania — Pria (Emil)',             category: 'dunia', edgeVoice: 'ro-RO-EmilNeural',        pitch: 'default', rate: 'default', sample: 'Bine ați venit la transmisiunea live.' },
  { id: 'ro-RO-A', name: '🇷🇴 Romania — Cewek (Alina)',           category: 'dunia', edgeVoice: 'ro-RO-AlinaNeural',       pitch: 'default', rate: 'default', sample: 'Mulțumim pentru cadoul dvs.' },
  // Rusia
  { id: 'ru-RU-D', name: '🇷🇺 Rusia — Pria (Dmitry)',            category: 'dunia', edgeVoice: 'ru-RU-DmitryNeural',      pitch: 'default', rate: 'default', sample: 'Добро пожаловать на прямую трансляцию.' },
  { id: 'ru-RU-S', name: '🇷🇺 Rusia — Cewek (Svetlana)',         category: 'dunia', edgeVoice: 'ru-RU-SvetlanaNeural',    pitch: 'default', rate: 'default', sample: 'Спасибо за ваш подарок.' },
  // Sinhala (Sri Lanka)
  { id: 'si-LK-S', name: '🇱🇰 Sinhala — Pria (Sameera)',         category: 'dunia', edgeVoice: 'si-LK-SameeraNeural',     pitch: 'default', rate: 'default', sample: 'සජීවී ධාරාවට සාදරයෙන් පිළිගනිමු.' },
  { id: 'si-LK-T', name: '🇱🇰 Sinhala — Cewek (Thilini)',        category: 'dunia', edgeVoice: 'si-LK-ThiliniNeural',     pitch: 'default', rate: 'default', sample: 'ඔබේ තෑග්ගට ස්තූතියි.' },
  // Slovakia
  { id: 'sk-SK-L', name: '🇸🇰 Slovakia — Pria (Lukas)',           category: 'dunia', edgeVoice: 'sk-SK-LukasNeural',       pitch: 'default', rate: 'default', sample: 'Vitajte na živom vysielaní.' },
  { id: 'sk-SK-V', name: '🇸🇰 Slovakia — Cewek (Viktoria)',       category: 'dunia', edgeVoice: 'sk-SK-ViktoriaNeural',    pitch: 'default', rate: 'default', sample: 'Ďakujeme za váš darček.' },
  // Slovenia
  { id: 'sl-SI-R', name: '🇸🇮 Slovenia — Pria (Rok)',             category: 'dunia', edgeVoice: 'sl-SI-RokNeural',         pitch: 'default', rate: 'default', sample: 'Dobrodošli v živem prenosu.' },
  { id: 'sl-SI-P', name: '🇸🇮 Slovenia — Cewek (Petra)',          category: 'dunia', edgeVoice: 'sl-SI-PetraNeural',       pitch: 'default', rate: 'default', sample: 'Hvala za vaše darilo.' },
  // Somalia
  { id: 'so-SO-M', name: '🇸🇴 Somalia — Pria (Muuse)',            category: 'dunia', edgeVoice: 'so-SO-MuuseNeural',       pitch: 'default', rate: 'default', sample: 'Ku soo dhawow socodka tooska ah.' },
  { id: 'so-SO-U', name: '🇸🇴 Somalia — Cewek (Ubax)',            category: 'dunia', edgeVoice: 'so-SO-UbaxNeural',        pitch: 'default', rate: 'default', sample: 'Waad ku mahadsan tahay hadiyaddaada.' },
  // Serbia
  { id: 'sr-RS-N', name: '🇷🇸 Serbia — Pria (Nicholas)',          category: 'dunia', edgeVoice: 'sr-RS-NicholasNeural',    pitch: 'default', rate: 'default', sample: 'Добродошли на уживо стримовање.' },
  { id: 'sr-RS-S', name: '🇷🇸 Serbia — Cewek (Sopbie)',           category: 'dunia', edgeVoice: 'sr-RS-SophieNeural',      pitch: 'default', rate: 'default', sample: 'Хвала на вашем поклону.' },
  // Sunda (Indonesia)
  { id: 'su-ID-J', name: '🌾 Sunda — Pria (Jajang)',              category: 'dunia', edgeVoice: 'su-ID-JajangNeural',      pitch: 'default', rate: 'default', sample: 'Hatur nuhun pisan kang parantos sumping ka live ieu.' },
  { id: 'su-ID-T', name: '🌾 Sunda — Cewek (Tuti)',               category: 'dunia', edgeVoice: 'su-ID-TutiNeural',        pitch: 'default', rate: 'default', sample: 'Hatur nuhun pisan sadayana.' },
  // Swahili Kenya
  { id: 'sw-KE-R', name: '🇰🇪 Swahili — Pria (Rafiki)',           category: 'dunia', edgeVoice: 'sw-KE-RafikiNeural',      pitch: 'default', rate: 'default', sample: 'Karibu kwenye mtiririko wa moja kwa moja.' },
  { id: 'sw-KE-Z', name: '🇰🇪 Swahili — Cewek (Zuri)',            category: 'dunia', edgeVoice: 'sw-KE-ZuriNeural',        pitch: 'default', rate: 'default', sample: 'Asante kwa zawadi yako.' },
  // Swedia
  { id: 'sv-SE-M', name: '🇸🇪 Swedia — Pria (Mattias)',           category: 'dunia', edgeVoice: 'sv-SE-MattiasNeural',     pitch: 'default', rate: 'default', sample: 'Välkommen till livestreamen.' },
  { id: 'sv-SE-S', name: '🇸🇪 Swedia — Cewek (Sofie)',            category: 'dunia', edgeVoice: 'sv-SE-SofieNeural',       pitch: 'default', rate: 'default', sample: 'Tack för din gåva.' },
  // Tamil
  { id: 'ta-IN-V', name: '🇮🇳 Tamil — Pria (Valluvar)',           category: 'dunia', edgeVoice: 'ta-IN-ValluvarNeural',    pitch: 'default', rate: 'default', sample: 'நேரலையில் வரவேற்கிறோம்.' },
  { id: 'ta-IN-P', name: '🇮🇳 Tamil — Cewek (Pallavi)',           category: 'dunia', edgeVoice: 'ta-IN-PallaviNeural',     pitch: 'default', rate: 'default', sample: 'உங்கள் பரிசுக்கு நன்றி.' },
  // Telugu (India)
  { id: 'te-IN-M', name: '🇮🇳 Telugu — Pria (Mohan)',             category: 'dunia', edgeVoice: 'te-IN-MohanNeural',       pitch: 'default', rate: 'default', sample: 'లైవ్ స్ట్రీమ్‌కి స్వాగతం.' },
  { id: 'te-IN-S', name: '🇮🇳 Telugu — Cewek (Shruti)',           category: 'dunia', edgeVoice: 'te-IN-ShrutiNeural',      pitch: 'default', rate: 'default', sample: 'మీ బహుమతికి ధన్యవాదాలు.' },
  // Thai
  { id: 'th-TH-N', name: '🇹🇭 Thailand — Pria (Niwat)',           category: 'dunia', edgeVoice: 'th-TH-NiwatNeural',       pitch: 'default', rate: 'default', sample: 'ยินดีต้อนรับสู่ไลฟ์สตรีม.' },
  { id: 'th-TH-P', name: '🇹🇭 Thailand — Cewek (Premwadee)',      category: 'dunia', edgeVoice: 'th-TH-PremwadeeNeural',   pitch: 'default', rate: 'default', sample: 'ขอบคุณสำหรับของขวัญของคุณ.' },
  // Turki
  { id: 'tr-TR-A', name: '🇹🇷 Turki — Pria (Ahmet)',              category: 'dunia', edgeVoice: 'tr-TR-AhmetNeural',       pitch: 'default', rate: 'default', sample: 'Canlı yayına hoş geldiniz.' },
  { id: 'tr-TR-E', name: '🇹🇷 Turki — Cewek (Emel)',              category: 'dunia', edgeVoice: 'tr-TR-EmelNeural',        pitch: 'default', rate: 'default', sample: 'Hediyeniz için teşekkür ederiz.' },
  // Ukraina
  { id: 'uk-UA-O', name: '🇺🇦 Ukraina — Pria (Ostap)',            category: 'dunia', edgeVoice: 'uk-UA-OstapNeural',       pitch: 'default', rate: 'default', sample: 'Ласкаво просимо на прямий ефір.' },
  { id: 'uk-UA-P', name: '🇺🇦 Ukraina — Cewek (Polina)',          category: 'dunia', edgeVoice: 'uk-UA-PolinaNeural',      pitch: 'default', rate: 'default', sample: 'Дякуємо за ваш подарунок.' },
  // Urdu Pakistan
  { id: 'ur-PK-A', name: '🇵🇰 Urdu — Pria (Asad)',                category: 'dunia', edgeVoice: 'ur-PK-AsadNeural',        pitch: 'default', rate: 'default', sample: 'لائیو سٹریم میں خوش آمدید۔' },
  { id: 'ur-PK-U', name: '🇵🇰 Urdu — Cewek (Uzma)',               category: 'dunia', edgeVoice: 'ur-PK-UzmaNeural',        pitch: 'default', rate: 'default', sample: 'آپ کے تحفے کا شکریہ۔' },
  // Uzbekistan
  { id: 'uz-UZ-S', name: '🇺🇿 Uzbek — Pria (Sardor)',             category: 'dunia', edgeVoice: 'uz-UZ-SardorNeural',      pitch: 'default', rate: 'default', sample: 'Jonli efirga xush kelibsiz.' },
  { id: 'uz-UZ-M', name: '🇺🇿 Uzbek — Cewek (Madina)',            category: 'dunia', edgeVoice: 'uz-UZ-MadinaNeural',      pitch: 'default', rate: 'default', sample: 'Sovg\'angiz uchun rahmat.' },
  // Vietnam
  { id: 'vi-VN-N', name: '🇻🇳 Vietnam — Pria (NamMinh)',          category: 'dunia', edgeVoice: 'vi-VN-NamMinhNeural',     pitch: 'default', rate: 'default', sample: 'Chào mừng đến với buổi phát trực tiếp.' },
  { id: 'vi-VN-H', name: '🇻🇳 Vietnam — Cewek (HoaiMy)',          category: 'dunia', edgeVoice: 'vi-VN-HoaiMyNeural',      pitch: 'default', rate: 'default', sample: 'Cảm ơn bạn đã tặng quà.' },
  // Tionghoa Mandarin
  { id: 'zh-CN-Y', name: '🇨🇳 Mandarin CN — Pria (Yunxi)',        category: 'dunia', edgeVoice: 'zh-CN-YunxiNeural',       pitch: 'default', rate: 'default', sample: '欢迎来到直播间！' },
  { id: 'zh-CN-X', name: '🇨🇳 Mandarin CN — Cewek (Xiaoxiao)',    category: 'dunia', edgeVoice: 'zh-CN-XiaoxiaoNeural',    pitch: 'default', rate: 'default', sample: '感谢您的礼物！' },
  // Tionghoa Taiwan
  { id: 'zh-TW-Y', name: '🇹🇼 Mandarin TW — Pria (Yunjhe)',       category: 'dunia', edgeVoice: 'zh-TW-YunJheNeural',      pitch: 'default', rate: 'default', sample: '歡迎來到直播！' },
  { id: 'zh-TW-H', name: '🇹🇼 Mandarin TW — Cewek (HsiaoChen)',   category: 'dunia', edgeVoice: 'zh-TW-HsiaoChenNeural',   pitch: 'default', rate: 'default', sample: '謝謝您的禮物！' },
  // Tionghoa HK (Kanton)
  { id: 'yue-CN-Y',name: '🇭🇰 Kanton HK — Pria (YunSong)',        category: 'dunia', edgeVoice: 'yue-CN-YunSongNeural',    pitch: 'default', rate: 'default', sample: '歡迎嚟到直播！' },
  { id: 'yue-CN-X',name: '🇭🇰 Kanton HK — Cewek (XiaoMin)',       category: 'dunia', edgeVoice: 'yue-CN-XiaoMinNeural',    pitch: 'default', rate: 'default', sample: '多謝你嘅禮物！' },
  // Zulu (Afrika Selatan)
  { id: 'zu-ZA-T', name: '🇿🇦 Zulu — Pria (Themba)',              category: 'dunia', edgeVoice: 'zu-ZA-ThembaNeural',      pitch: 'default', rate: 'default', sample: 'Siyakwamukela ekulandeleni okukhona.' },
  { id: 'zu-ZA-T2',name: '🇿🇦 Zulu — Cewek (Thando)',             category: 'dunia', edgeVoice: 'zu-ZA-ThandoNeural',      pitch: 'default', rate: 'default', sample: 'Siyabonga ngesipho sakho.' }

];

const GOOGLE_VOICES = [
  { id: 'g-id', name: '🇮🇩 Google Indonesia (Gratis)', category: 'google', engine: 'google', googleLang: 'id', sample: 'Halo semuanya, ini suara Google Translate gratis untuk membaca komentar live.' },
  { id: 'g-en', name: '🇺🇸 Google English (Gratis)', category: 'google', engine: 'google', googleLang: 'en', sample: 'Hello everyone, this is free Google text to speech for live comments.' }
];

const https = require('https');
const http = require('http');

class TtsEngine {
  constructor(logger = console) {
    this.logger = logger;

    // ── Tugas 3: LRU Cache ──────────────────────────────────────────────────
    // Map mempertahankan insertion order → entry paling awal = paling lama
    this._cache    = new Map(); // key → dataUrl
    this._cacheMax = 200;       // maks item di cache sebelum LRU eviction
    this._startCacheGC();
  }

  // ── LRU get: pindah key ke akhir (paling baru) ───────────────────────────
  _cacheGet(key) {
    if (!this._cache.has(key)) return null;
    const val = this._cache.get(key);
    // Refresh posisi: hapus lalu set ulang agar key pindah ke akhir
    this._cache.delete(key);
    this._cache.set(key, val);
    return val;
  }

  // ── LRU set: hapus entry paling lama kalau melebihi _cacheMax ────────────
  _cacheSet(key, val) {
    if (this._cache.has(key)) {
      // Update: hapus dulu agar bisa pindah ke akhir
      this._cache.delete(key);
    } else if (this._cache.size >= this._cacheMax) {
      // Evict entry paling lama (paling awal di Map)
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }
    this._cache.set(key, val);
  }

  // ── Manual flush cache (bisa dipanggil dari luar) ──────────────────────
  clearCache() {
    const size = this._cache.size;
    this._cache.clear();
    if (size > 0) this.logger.info?.(`[TtsEngine] Cache di-flush: ${size} entry dihapus`);
  }

  // ── GC timer: trim cache tiap 30 menit (TANPA global.gc() — bisa freeze) ──
  _startCacheGC() {
    setInterval(() => {
      // Kalau cache terlalu besar, hapus 50% entry paling lama
      if (this._cache.size > Math.floor(this._cacheMax * 0.75)) {
        const targetSize = Math.floor(this._cacheMax / 2);
        let deleted = 0;
        for (const k of this._cache.keys()) {
          if (this._cache.size <= targetSize) break;
          this._cache.delete(k);
          deleted++;
        }
        if (deleted > 0) {
          this.logger.info?.(`[TtsEngine] GC: hapus ${deleted} entry cache lama, sisa ${this._cache.size}`);
        }
      }
    }, 30 * 60 * 1000); // 30 menit
  }

  getVoiceCatalog() {
    return [...GOOGLE_VOICES, ...VOICE_CATALOG];
  }

  findVoiceConfig(voiceId) {
    const all = this.getVoiceCatalog();
    if (!voiceId) return GOOGLE_VOICES[0] || VOICE_CATALOG[0];
    let found = all.find(v => v.id === voiceId);
    if (found) return found;

    if (voiceId === 'id-cewe' || voiceId === 'id-gadis' || voiceId === 'id-ID-GadisNeural') return all.find(v => v.id === 'id-cewek') || VOICE_CATALOG[1];
    if (voiceId === 'id-cowo' || voiceId === 'id-ardi' || voiceId === 'id-ID-ArdiNeural')   return all.find(v => v.id === 'id-pria')  || VOICE_CATALOG[0];
    if (voiceId === 'google-id' || voiceId === 'google') return GOOGLE_VOICES[0];

    found = all.find(v => v.id.toLowerCase().includes(voiceId.toLowerCase()) || v.name.toLowerCase().includes(voiceId.toLowerCase()));
    return found || GOOGLE_VOICES[0] || VOICE_CATALOG[0];
  }

  _googleLangFromVoice(voiceCfg, voiceId) {
    if (voiceCfg?.googleLang) return voiceCfg.googleLang;
    const id = String(voiceId || voiceCfg?.id || '').toLowerCase();
    if (id.startsWith('en-') || id === 'g-en') return 'en';
    if (id.startsWith('ms-')) return 'ms';
    if (id.startsWith('jv-')) return 'jw';
    if (id.startsWith('su-')) return 'su';
    if (id.startsWith('ja-') || id.startsWith('jp')) return 'ja';
    if (id.startsWith('ko-')) return 'ko';
    if (id.startsWith('zh-') || id.startsWith('yue-')) return 'zh-CN';
    return 'id';
  }

  _splitGoogleChunks(text, maxLen = 180) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
    const parts = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= maxLen) {
        cur = next;
      } else {
        if (cur) parts.push(cur);
        if (w.length > maxLen) {
          for (let i = 0; i < w.length; i += maxLen) parts.push(w.slice(i, i + maxLen));
          cur = '';
        } else {
          cur = w;
        }
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }

  _httpGetBuffer(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': 'https://translate.google.com/'
        }
      }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          this._httpGetBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200 || buf.length < 32) {
            reject(new Error(`Google TTS HTTP ${res.statusCode || 0}`));
            return;
          }
          resolve(buf);
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Google TTS timeout'));
      });
    });
  }

  async _fetchGoogleChunk(text, lang) {
    const q = encodeURIComponent(text);
    const urls = [
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(lang)}&q=${q}`,
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${q}`
    ];
    let lastErr = null;
    for (const url of urls) {
      try {
        return await this._httpGetBuffer(url);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Google TTS gagal');
  }

  async _synthesizeGoogle(text, lang = 'id') {
    const chunks = this._splitGoogleChunks(text);
    const buffers = [];
    for (let i = 0; i < chunks.length; i++) {
      buffers.push(await this._fetchGoogleChunk(chunks[i], lang || 'id'));
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 60));
      }
    }
    const full = Buffer.concat(buffers);
    if (!full.length) throw new Error('Audio Google TTS kosong');
    return full;
  }

  /**
   * Synthesizes speech to an MP3 buffer.
   * engine: 'google' | 'edge' | 'auto'
   */
  async synthesizeBuffer(text, voiceId = 'g-id', customRate = 1.0, customPitch = 1.0, engine = 'auto') {
    const cleanText = String(text || '').slice(0, 500).trim();
    if (!cleanText) throw new Error('Teks TTS kosong');

    const voiceCfg = this.findVoiceConfig(voiceId);
    const mode = String(engine || voiceCfg.engine || 'google').toLowerCase();
    const googleLang = this._googleLangFromVoice(voiceCfg, voiceId);

    if (mode === 'google' || voiceCfg.engine === 'google') {
      return await this._synthesizeGoogle(cleanText, googleLang);
    }

    try {
      return await this._synthesizeEdge(cleanText, voiceCfg, customRate, customPitch);
    } catch (err) {
      if (mode === 'edge') throw err;
      this.logger?.warn?.(`[TtsEngine] Edge gagal, fallback Google gratis: ${err.message}`);
      return await this._synthesizeGoogle(cleanText, googleLang);
    }
  }

  /**
   * Synthesizes speech and returns Base64 Data URL (data:audio/mp3;base64,...).
   * Cache key: "engine|voiceId|rate|pitch|text"
   */
  async synthesizeDataUrl(text, voiceId = 'g-id', customRate = 1.0, customPitch = 1.0, engine = 'auto') {
    const cacheKey = `${engine}|${voiceId}|${customRate}|${customPitch}|${String(text || '').slice(0, 500).trim()}`;

    // Cek cache dulu — _cacheGet() juga refresh posisi LRU
    const cached = this._cacheGet(cacheKey);
    if (cached) return cached;

    const buffer = await this.synthesizeBuffer(text, voiceId, customRate, customPitch, engine);
    const dataUrl = `data:audio/mp3;base64,${buffer.toString('base64')}`;

    // Simpan ke LRU cache
    this._cacheSet(cacheKey, dataUrl);

    return dataUrl;
  }

  _synthesizeEdge(text, voiceCfg, customRate = 1.0, customPitch = 1.0) {
    return new Promise((resolve, reject) => {
      try {
        const tts = new MsEdgeTTS();
        tts.setMetadata(voiceCfg.edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
          .then(() => {
            const options = {};

            // --- Pitch Calculation (always additive: preset + slider offset) ---
            // Edge TTS pitch unit: Hz (e.g. "+10Hz", "-20Hz")
            // User slider: 0.5–2.0 where 1.0 = neutral → map to -50Hz...+50Hz
            let presetPitchHz = 0;
            if (voiceCfg.pitch && voiceCfg.pitch !== 'default') {
              const m = String(voiceCfg.pitch).match(/^([+-]?\d+(\.\d+)?)Hz$/i);
              if (m) presetPitchHz = parseFloat(m[1]);
            }
            // slider 1.0 = 0Hz offset, 0.5 = -25Hz, 2.0 = +50Hz
            const sliderPitchHz = Math.round((customPitch - 1.0) * 50);
            const totalPitchHz = presetPitchHz + sliderPitchHz;
            const clampedPitchHz = Math.max(-200, Math.min(200, totalPitchHz));
            options.pitch = (clampedPitchHz >= 0 ? `+${clampedPitchHz}Hz` : `${clampedPitchHz}Hz`);

            // --- Rate Calculation (always additive: preset + slider offset) ---
            // Edge TTS rate unit: % (e.g. "+10%", "-15%")
            // User slider: 0.5–2.0 where 1.0 = neutral → map to -50%...+100%
            let presetRatePct = 0;
            if (voiceCfg.rate && voiceCfg.rate !== 'default') {
              const m = String(voiceCfg.rate).match(/^([+-]?\d+(\.\d+)?)%$/);
              if (m) presetRatePct = parseFloat(m[1]);
            }
            // slider 1.0 = 0% offset, 0.5 = -25%, 2.0 = +50%
            const sliderRatePct = Math.round((customRate - 1.0) * 50);
            const totalRatePct = presetRatePct + sliderRatePct;
            const clampedRatePct = Math.max(-90, Math.min(200, totalRatePct));
            options.rate = (clampedRatePct >= 0 ? `+${clampedRatePct}%` : `${clampedRatePct}%`);

            const { audioStream } = tts.toStream(text, options);
            const chunks = [];

            audioStream.on('data', chunk => chunks.push(chunk));
            audioStream.on('end', () => {
              tts.close();
              const fullBuffer = Buffer.concat(chunks);
              if (fullBuffer.length === 0) {
                return reject(new Error('Audio stream kosong dari Edge TTS'));
              }
              resolve(fullBuffer);
            });

            audioStream.on('error', err => {
              tts.close();
              reject(err);
            });
          })
          .catch(err => {
            try { tts.close(); } catch (_) {}
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new TtsEngine();
