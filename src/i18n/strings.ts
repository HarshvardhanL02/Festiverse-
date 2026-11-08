import type { Lang, SenderKind, ThemeId } from '../lib/greeting'

export interface Strings {
  langName: string
  tagline: string
  heroTitle: string
  heroSub: string
  ctaCreate: string
  ctaSeeDemo: string
  howTitle: string
  how1: string
  how2: string
  how3: string
  themesTitle: string
  themes: Record<ThemeId, { name: string; blurb: string }>
  openSource: string
  createTitle: string
  createSub: string
  nameLabel: string
  namePlaceholderIndividual: string
  namePlaceholderFamily: string
  kindLabel: string
  kindIndividual: string
  kindFamily: string
  themeLabel: string
  langLabel: string
  messageLabel: string
  messagePlaceholder: string
  optional: string
  generate: string
  nameRequired: string
  linkReady: string
  linkReadySub: string
  copy: string
  copied: string
  shareWhatsApp: string
  shareMore: string
  preview: string
  editAgain: string
  arriving: string
  sentYou: (name: string, kind: SenderKind) => string
  openGreeting: string
  openSilently: string
  festivalTitle: string
  fromLine: (name: string, kind: SenderKind) => string
  fromLabel: string
  displayName: (name: string, kind: SenderKind) => string
  skip: string
  defaultWish: string
  captions: Record<ThemeId, string[]>
  tapHint: string
  replay: string
  share: string
  createOwn: string
  createOwnSub: string
  soundOn: string
  soundOff: string
  liteMode: string
  fullMode: string
  loadingWorld: string
  shareText: (name: string, kind: SenderKind) => string
  introTitle: string
  introFrom: (name: string, kind: SenderKind) => string
  begin: string
  actCaptions: string[]
  blessing: string
  withLove: string
  endingTitle: string
  endingSub: string
  createMy: string
  replayExperience: string
  musicUnavailable: string
  musicOn: string
  musicOff: string
  openPreview: string
  journeyTitle: string
  journeyActs: { title: string; text: string }[]
  invalidTitle: string
  invalidSub: string
  notFoundTitle: string
  goHome: string
  liteNotice: string
}

const famEn = (n: string, k: SenderKind) => (k === 'family' ? `the ${n} Family` : n)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const en: Strings = {
  langName: 'English',
  tagline: 'Turn Your Wishes Into Worlds',
  heroTitle: 'Send a world, not a forward.',
  heroSub:
    'Type your name and send a cinematic Diwali journey: one diya in the dark, a golden gateway, a riverside of a thousand lights, and your name rising from a mandala of gold.',
  ctaCreate: 'Create your greeting',
  ctaSeeDemo: 'Watch a sample',
  howTitle: 'Ready in under a minute',
  how1: 'Write your name or your family name.',
  how2: 'Your family name becomes the centrepiece of a 3D journey through Ayodhya.',
  how3: 'Share the link on WhatsApp. Your name appears for everyone who opens it.',
  themesTitle: 'Three worlds to choose from',
  themes: {
    ayodhya: { name: 'Ayodhya Deepotsav', blurb: 'A riverside of a thousand diyas, temple spires and sky lanterns.' },
    royal: { name: 'Royal Kingdom', blurb: 'Golden domes, rangoli courtyards and a reflecting pool of light.' },
    cosmic: { name: 'Cosmic Multiverse', blurb: 'A spiral galaxy where every star is a lamp, around a glowing portal.' },
  },
  openSource: 'Free and open source. No sign-up, no tracking, no database.',
  createTitle: 'Craft your greeting',
  createSub: 'Everything is stored inside the link itself.',
  nameLabel: 'Your name',
  namePlaceholderIndividual: 'e.g. Aaditya',
  namePlaceholderFamily: 'e.g. Kulkarni',
  kindLabel: 'Send as',
  kindIndividual: 'Myself',
  kindFamily: 'Our family',
  themeLabel: 'World',
  langLabel: 'Greeting language',
  messageLabel: 'Personal wish',
  messagePlaceholder: 'May this Diwali fill your home with light…',
  optional: 'optional',
  generate: 'Create my link',
  nameRequired: 'Please enter a name.',
  linkReady: 'Your world is ready',
  linkReadySub: 'Share it with everyone you love.',
  copy: 'Copy link',
  copied: 'Copied!',
  shareWhatsApp: 'Share on WhatsApp',
  shareMore: 'More apps',
  preview: 'Preview',
  editAgain: 'Edit',
  arriving: 'A wish is arriving',
  sentYou: (n, k) => `${cap(famEn(n, k))} sent you a world of light`,
  openGreeting: 'Open with sound',
  openSilently: 'Open silently',
  festivalTitle: 'Happy Diwali',
  fromLine: (n, k) => (k === 'family' ? `With love from the ${n} Family` : `With love from ${n}`),
  fromLabel: 'With love from',
  displayName: (n, k) => (k === 'family' ? `The ${n} Family` : n),
  skip: 'Skip',
  defaultWish: 'May the lamps of Diwali light up your home with joy, health and prosperity.',
  captions: {
    ayodhya: ['On the banks of the Sarayu…', 'a million diyas wake up…', 'to carry one wish to you.'],
    royal: ['In a kingdom of gold…', 'every courtyard is set alight…', 'to welcome you home.'],
    cosmic: ['Beyond the last star…', 'galaxies light their lamps…', 'and open a portal for you.'],
  },
  tapHint: 'Tap anywhere to light a firework',
  replay: 'Replay',
  share: 'Share',
  createOwn: 'Create your own greeting',
  createOwnSub: 'Free. Takes 30 seconds.',
  soundOn: 'Sound on',
  soundOff: 'Sound off',
  liteMode: 'Lite mode',
  fullMode: '3D mode',
  loadingWorld: 'Lighting the lamps…',
  shareText: (n, k) => `✨ ${cap(famEn(n, k))} has sent you a Diwali world! Open it here:`,
  introTitle: 'Every Light Has a Story.',
  introFrom: (n, k) => `A Diwali wish from ${k === 'family' ? `the ${n} Family` : n}`,
  begin: 'Begin the Journey',
  actCaptions: ['Beyond the Golden Gateway…', 'the City of a Thousand Lights awakens…', 'and every flame carries one wish — for you.'],
  blessing: 'May your home be blessed with happiness, peace and prosperity.',
  withLove: 'With Love,',
  endingTitle: 'The Magic Continues With You',
  endingSub: 'Create a magical Diwali wish for your own family.',
  createMy: 'Create My Greeting',
  replayExperience: 'Replay Experience',
  musicUnavailable: 'Soundtrack not installed yet',
  musicOn: 'Music on',
  musicOff: 'Music off',
  openPreview: 'Open my greeting',
  journeyTitle: 'A journey in six acts',
  journeyActs: [
    { title: 'The First Light', text: 'A single diya wakes in the dark.' },
    { title: 'The Golden Gateway', text: 'Ancient doors open onto Ayodhya.' },
    { title: 'A Thousand Lights', text: 'The ghats ignite in one golden wave.' },
    { title: 'The Divine Reveal', text: 'Your name rises from a mandala of light.' },
  ],
  invalidTitle: 'This greeting link looks broken',
  invalidSub:
    'Part of the link may have been cut off while sharing. Ask the sender to share it again, or create your own.',
  notFoundTitle: 'This page wandered off',
  goHome: 'Go home',
  liteNotice: 'Showing the lite version for a smoother experience.',
}

const hi: Strings = {
  langName: 'हिन्दी',
  tagline: 'अपनी शुभकामनाओं को संसार बनाइए',
  heroTitle: 'फ़ॉरवर्ड नहीं, एक पूरा संसार भेजिए।',
  heroSub:
    'अपना नाम लिखिए और एक सिनेमाई दिवाली यात्रा भेजिए — अंधेरे में एक दीया, स्वर्ण द्वार, हज़ार दीपों से जगमगाते घाट, और सोने के मंडल से उभरता आपका नाम।',
  ctaCreate: 'अपनी शुभकामना बनाएँ',
  ctaSeeDemo: 'नमूना देखें',
  howTitle: 'एक मिनट से कम में तैयार',
  how1: 'अपना नाम या परिवार का नाम लिखें।',
  how2: 'आपका नाम अयोध्या की 3D यात्रा का केंद्र बन जाता है।',
  how3: 'लिंक WhatsApp पर भेजें। खोलने वाले हर व्यक्ति को आपका नाम दिखेगा।',
  themesTitle: 'तीन संसार, आपकी पसंद',
  themes: {
    ayodhya: { name: 'अयोध्या दीपोत्सव', blurb: 'हज़ारों दीयों से जगमगाता घाट, मंदिर के शिखर और आकाशदीप।' },
    royal: { name: 'राजसी साम्राज्य', blurb: 'सुनहरे गुंबद, रंगोली से सजे आँगन और रोशनी का सरोवर।' },
    cosmic: { name: 'ब्रह्मांडीय संसार', blurb: 'एक सर्पिल आकाशगंगा जहाँ हर तारा एक दीया है।' },
  },
  openSource: 'पूरी तरह मुफ़्त और ओपन-सोर्स। न साइन-अप, न ट्रैकिंग, न डेटाबेस।',
  createTitle: 'अपनी शुभकामना सजाएँ',
  createSub: 'सब कुछ लिंक के अंदर ही सुरक्षित रहता है।',
  nameLabel: 'आपका नाम',
  namePlaceholderIndividual: 'जैसे: आदित्य',
  namePlaceholderFamily: 'जैसे: कुलकर्णी',
  kindLabel: 'किसकी ओर से',
  kindIndividual: 'मेरी ओर से',
  kindFamily: 'परिवार की ओर से',
  themeLabel: 'संसार',
  langLabel: 'शुभकामना की भाषा',
  messageLabel: 'व्यक्तिगत संदेश',
  messagePlaceholder: 'यह दिवाली आपके घर को रोशनी से भर दे…',
  optional: 'वैकल्पिक',
  generate: 'मेरा लिंक बनाएँ',
  nameRequired: 'कृपया नाम लिखें।',
  linkReady: 'आपका संसार तैयार है',
  linkReadySub: 'इसे अपने सभी प्रियजनों को भेजें।',
  copy: 'लिंक कॉपी करें',
  copied: 'कॉपी हो गया!',
  shareWhatsApp: 'WhatsApp पर भेजें',
  shareMore: 'अन्य ऐप',
  preview: 'देखें',
  editAgain: 'बदलें',
  arriving: 'एक शुभकामना आ रही है',
  sentYou: (n, k) =>
    k === 'family' ? `${n} परिवार ने आपको रोशनी का संसार भेजा है` : `${n} ने आपको रोशनी का संसार भेजा है`,
  openGreeting: 'आवाज़ के साथ खोलें',
  openSilently: 'बिना आवाज़ खोलें',
  festivalTitle: 'शुभ दीपावली',
  fromLine: (n, k) => (k === 'family' ? `${n} परिवार की ओर से प्यार सहित` : `${n} की ओर से प्यार सहित`),
  fromLabel: 'हार्दिक शुभकामनाओं सहित',
  displayName: (n, k) => (k === 'family' ? `${n} परिवार` : n),
  skip: 'आगे बढ़ें',
  defaultWish: 'दीपावली के दीप आपके घर को सुख, स्वास्थ्य और समृद्धि से रोशन करें।',
  captions: {
    ayodhya: ['सरयू के तट पर…', 'लाखों दीये जाग उठे हैं…', 'आप तक एक शुभकामना पहुँचाने।'],
    royal: ['सोने के एक साम्राज्य में…', 'हर आँगन जगमगा उठा है…', 'आपके स्वागत के लिए।'],
    cosmic: ['आख़िरी तारे के उस पार…', 'आकाशगंगाओं ने दीप जलाए हैं…', 'और आपके लिए द्वार खोला है।'],
  },
  tapHint: 'आतिशबाज़ी के लिए कहीं भी टैप करें',
  replay: 'फिर से देखें',
  share: 'भेजें',
  createOwn: 'अपनी शुभकामना बनाएँ',
  createOwnSub: 'मुफ़्त। सिर्फ़ 30 सेकंड।',
  soundOn: 'आवाज़ चालू',
  soundOff: 'आवाज़ बंद',
  liteMode: 'लाइट मोड',
  fullMode: '3D मोड',
  loadingWorld: 'दीये जलाए जा रहे हैं…',
  shareText: (n, k) => `✨ ${k === 'family' ? `${n} परिवार` : n} ने आपको दिवाली का एक संसार भेजा है! यहाँ खोलें:`,
  introTitle: 'हर दीपक की एक कहानी होती है।',
  introFrom: (n, k) => `${k === 'family' ? `${n} परिवार` : n} की ओर से दिवाली की शुभकामना`,
  begin: 'यात्रा आरंभ करें',
  actCaptions: ['स्वर्ण द्वार के उस पार…', 'हज़ार दीपों की नगरी जाग उठी है…', 'और हर लौ में एक शुभकामना है — आपके लिए।'],
  blessing: 'आपका घर सुख, शांति और समृद्धि से सदा भरा रहे।',
  withLove: 'सप्रेम,',
  endingTitle: 'यह जादू अब आपके साथ आगे बढ़ता है',
  endingSub: 'अपने परिवार के लिए एक जादुई दिवाली शुभकामना बनाइए।',
  createMy: 'मेरी शुभकामना बनाएँ',
  replayExperience: 'फिर से अनुभव करें',
  musicUnavailable: 'संगीत अभी उपलब्ध नहीं है',
  musicOn: 'संगीत चालू',
  musicOff: 'संगीत बंद',
  openPreview: 'मेरी शुभकामना खोलें',
  journeyTitle: 'छह अंकों की एक यात्रा',
  journeyActs: [
    { title: 'पहली लौ', text: 'अंधेरे में एक दीया जाग उठता है।' },
    { title: 'स्वर्ण द्वार', text: 'प्राचीन द्वार अयोध्या की ओर खुलते हैं।' },
    { title: 'हज़ार दीप', text: 'घाट एक सुनहरी लहर में जगमगा उठते हैं।' },
    { title: 'दिव्य दर्शन', text: 'प्रकाश के मंडल से आपका नाम उभरता है।' },
  ],
  invalidTitle: 'यह शुभकामना लिंक टूटा हुआ लगता है',
  invalidSub:
    'भेजते समय लिंक का कुछ हिस्सा कट गया होगा। भेजने वाले से दोबारा भेजने को कहें या अपनी शुभकामना बनाएँ।',
  notFoundTitle: 'यह पेज कहीं खो गया',
  goHome: 'मुख्य पृष्ठ',
  liteNotice: 'सुचारु अनुभव के लिए लाइट संस्करण दिखाया जा रहा है।',
}

const mr: Strings = {
  langName: 'मराठी',
  tagline: 'तुमच्या शुभेच्छांना विश्व बनवा',
  heroTitle: 'फॉरवर्ड नाही, संपूर्ण विश्व पाठवा.',
  heroSub:
    'तुमचे नाव लिहा आणि एक सिनेमॅटिक दिवाळी प्रवास पाठवा — अंधारातील एक पणती, सुवर्ण द्वार, हजार दिव्यांनी उजळलेले घाट आणि सोनेरी मंडलातून उमटणारे तुमचे नाव.',
  ctaCreate: 'तुमची शुभेच्छा तयार करा',
  ctaSeeDemo: 'नमुना पहा',
  howTitle: 'एका मिनिटात तयार',
  how1: 'तुमचे नाव किंवा कुटुंबाचे नाव लिहा.',
  how2: 'तुमचे नाव अयोध्येच्या 3D प्रवासाचे केंद्रबिंदू बनते.',
  how3: 'लिंक WhatsApp वर पाठवा. उघडणाऱ्या प्रत्येकाला तुमचे नाव दिसेल.',
  themesTitle: 'तीन विश्वे, तुमची निवड',
  themes: {
    ayodhya: { name: 'अयोध्या दीपोत्सव', blurb: 'हजारो पणत्यांनी उजळलेला घाट, मंदिरांची शिखरे आणि आकाशकंदील.' },
    royal: { name: 'राजेशाही साम्राज्य', blurb: 'सोनेरी घुमट, रांगोळीने सजलेली अंगणे आणि प्रकाशाचे तळे.' },
    cosmic: { name: 'वैश्विक विश्व', blurb: 'एक सर्पिल आकाशगंगा जिथे प्रत्येक तारा एक दिवा आहे.' },
  },
  openSource: 'पूर्णपणे मोफत आणि ओपन-सोर्स. साइन-अप नाही, ट्रॅकिंग नाही, डेटाबेस नाही.',
  createTitle: 'तुमची शुभेच्छा सजवा',
  createSub: 'सर्व माहिती लिंकमध्येच सुरक्षित राहते.',
  nameLabel: 'तुमचे नाव',
  namePlaceholderIndividual: 'उदा. आदित्य',
  namePlaceholderFamily: 'उदा. कुलकर्णी',
  kindLabel: 'कोणाकडून',
  kindIndividual: 'माझ्याकडून',
  kindFamily: 'कुटुंबाकडून',
  themeLabel: 'विश्व',
  langLabel: 'शुभेच्छेची भाषा',
  messageLabel: 'वैयक्तिक संदेश',
  messagePlaceholder: 'ही दिवाळी तुमचे घर प्रकाशाने उजळून टाको…',
  optional: 'ऐच्छिक',
  generate: 'माझी लिंक तयार करा',
  nameRequired: 'कृपया नाव लिहा.',
  linkReady: 'तुमचे विश्व तयार आहे',
  linkReadySub: 'तुमच्या सर्व प्रियजनांना पाठवा.',
  copy: 'लिंक कॉपी करा',
  copied: 'कॉपी झाली!',
  shareWhatsApp: 'WhatsApp वर पाठवा',
  shareMore: 'इतर ॲप्स',
  preview: 'पहा',
  editAgain: 'बदला',
  arriving: 'एक शुभेच्छा येत आहे',
  sentYou: (n, k) =>
    k === 'family'
      ? `${n} कुटुंबाने तुम्हाला प्रकाशाचे विश्व पाठवले आहे`
      : `${n} यांनी तुम्हाला प्रकाशाचे विश्व पाठवले आहे`,
  openGreeting: 'आवाजासह उघडा',
  openSilently: 'आवाजाशिवाय उघडा',
  festivalTitle: 'दीपावलीच्या हार्दिक शुभेच्छा',
  fromLine: (n, k) => (k === 'family' ? `${n} कुटुंबाकडून प्रेमपूर्वक` : `${n} यांच्याकडून प्रेमपूर्वक`),
  fromLabel: 'शुभेच्छुक',
  displayName: (n, k) => (k === 'family' ? `${n} कुटुंब` : n),
  skip: 'पुढे जा',
  defaultWish: 'दिवाळीच्या पणत्या तुमचे घर आनंद, आरोग्य आणि समृद्धीने उजळून टाकोत.',
  captions: {
    ayodhya: ['शरयूच्या तीरावर…', 'लाखो पणत्या जाग्या झाल्या…', 'तुमच्यापर्यंत एक शुभेच्छा पोहोचवायला.'],
    royal: ['सोन्याच्या एका साम्राज्यात…', 'प्रत्येक अंगण उजळले आहे…', 'तुमच्या स्वागतासाठी.'],
    cosmic: ['शेवटच्या ताऱ्याच्या पलीकडे…', 'आकाशगंगांनी दिवे लावले आहेत…', 'आणि तुमच्यासाठी द्वार उघडले आहे.'],
  },
  tapHint: 'आतषबाजीसाठी कुठेही टॅप करा',
  replay: 'पुन्हा पहा',
  share: 'पाठवा',
  createOwn: 'तुमची स्वतःची शुभेच्छा तयार करा',
  createOwnSub: 'मोफत. फक्त 30 सेकंद.',
  soundOn: 'आवाज चालू',
  soundOff: 'आवाज बंद',
  liteMode: 'लाइट मोड',
  fullMode: '3D मोड',
  loadingWorld: 'पणत्या लावल्या जात आहेत…',
  shareText: (n, k) =>
    `✨ ${k === 'family' ? `${n} कुटुंबाने` : `${n} यांनी`} तुम्हाला दिवाळीचे एक विश्व पाठवले आहे! इथे उघडा:`,
  introTitle: 'प्रत्येक दिव्याची एक कथा असते.',
  introFrom: (n, k) => (k === 'family' ? `${n} कुटुंबाकडून दिवाळीच्या शुभेच्छा` : `${n} यांच्याकडून दिवाळीच्या शुभेच्छा`),
  begin: 'प्रवास सुरू करा',
  actCaptions: ['सुवर्ण द्वाराच्या पलीकडे…', 'हजार दिव्यांची नगरी जागी होत आहे…', 'आणि प्रत्येक ज्योतीत एक शुभेच्छा आहे — तुमच्यासाठी.'],
  blessing: 'तुमचे घर सुख, शांती आणि समृद्धीने सदैव भरलेले राहो.',
  withLove: 'सप्रेम,',
  endingTitle: 'ही जादू आता तुमच्यासोबत पुढे जाते',
  endingSub: 'तुमच्या कुटुंबासाठी एक जादुई दिवाळी शुभेच्छा तयार करा.',
  createMy: 'माझी शुभेच्छा तयार करा',
  replayExperience: 'पुन्हा अनुभवा',
  musicUnavailable: 'संगीत अद्याप उपलब्ध नाही',
  musicOn: 'संगीत चालू',
  musicOff: 'संगीत बंद',
  openPreview: 'माझी शुभेच्छा उघडा',
  journeyTitle: 'सहा अंकांचा एक प्रवास',
  journeyActs: [
    { title: 'पहिली ज्योत', text: 'अंधारात एक दिवा जागा होतो.' },
    { title: 'सुवर्ण द्वार', text: 'प्राचीन दरवाजे अयोध्येकडे उघडतात.' },
    { title: 'हजार दिवे', text: 'घाट एका सोनेरी लाटेत उजळून निघतात.' },
    { title: 'दिव्य दर्शन', text: 'प्रकाशाच्या मंडलातून तुमचे नाव उमटते.' },
  ],
  invalidTitle: 'ही शुभेच्छा लिंक तुटलेली दिसते',
  invalidSub:
    'पाठवताना लिंकचा काही भाग कापला गेला असावा. पाठवणाऱ्याला पुन्हा पाठवायला सांगा किंवा तुमची स्वतःची शुभेच्छा तयार करा.',
  notFoundTitle: 'हे पान हरवले आहे',
  goHome: 'मुख्यपृष्ठ',
  liteNotice: 'सहज अनुभवासाठी लाइट आवृत्ती दाखवत आहोत.',
}

export const STRINGS: Record<Lang, Strings> = { en, hi, mr }
