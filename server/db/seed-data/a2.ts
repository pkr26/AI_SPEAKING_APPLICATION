import type { QuestionSeed } from './types';

// A2 speaking questions: prompt word, question, and te/hi/es/zh
// translations with 3 example answers each (same English sentence across
// languages, `native` is its translation).
export const questions: QuestionSeed[] = [
  {
    cefrLevel: 'A2',
    promptWord: 'weekend',
    questionText: 'What did you do last weekend?',
    translations: {
      te: {
        word: 'వారాంతం',
        question: 'గత వారాంతంలో మీరు ఏమి చేశారు?',
        examples: [
          {
            en: 'Last weekend, I visited a village with my family.',
            native: 'గత వారాంతంలో, నేను నా కుటుంబంతో కలిసి ఒక గ్రామాన్ని సందర్శించాను.',
          },
          {
            en: 'I watched a film with my friends on Saturday.',
            native: 'శనివారం నేను నా స్నేహితులతో కలిసి ఒక సినిమా చూశాను.',
          },
          {
            en: 'On Sunday, I cleaned my room and cooked dinner.',
            native: 'ఆదివారం, నేను నా గదిని శుభ్రం చేసి రాత్రి భోజనం వండాను.',
          },
        ],
      },
      hi: {
        word: 'सप्ताहांत',
        question: 'पिछले सप्ताहांत आपने क्या किया?',
        examples: [
          {
            en: 'Last weekend, I visited a village with my family.',
            native: 'पिछले सप्ताहांत, मैंने अपने परिवार के साथ एक गाँव की यात्रा की।',
          },
          {
            en: 'I watched a film with my friends on Saturday.',
            native: 'शनिवार को मैंने अपने दोस्तों के साथ एक फ़िल्म देखी।',
          },
          {
            en: 'On Sunday, I cleaned my room and cooked dinner.',
            native: 'रविवार को, मैंने अपना कमरा साफ़ किया और रात का खाना बनाया।',
          },
        ],
      },
      es: {
        word: 'fin de semana',
        question: '¿Qué hiciste el fin de semana pasado?',
        examples: [
          {
            en: 'Last weekend, I visited a village with my family.',
            native: 'El fin de semana pasado visité un pueblo con mi familia.',
          },
          {
            en: 'I watched a film with my friends on Saturday.',
            native: 'Vi una película con mis amigos el sábado.',
          },
          {
            en: 'On Sunday, I cleaned my room and cooked dinner.',
            native: 'El domingo limpié mi habitación y cociné la cena.',
          },
        ],
      },
      zh: {
        word: '周末',
        question: '上个周末你做了什么？',
        examples: [
          {
            en: 'Last weekend, I visited a village with my family.',
            native: '上个周末，我和家人一起去了一个村庄。',
          },
          {
            en: 'I watched a film with my friends on Saturday.',
            native: '星期六我和朋友们一起看了一部电影。',
          },
          {
            en: 'On Sunday, I cleaned my room and cooked dinner.',
            native: '星期天，我打扫了房间，还做了晚饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'travel',
    questionText: 'Talk about a place you visited.',
    translations: {
      te: {
        word: 'ప్రయాణం',
        question: 'మీరు సందర్శించిన ఒక ప్రదేశం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'Last year, I visited the mountains with my family.',
            native: 'గత సంవత్సరం, నేను నా కుటుంబంతో కలిసి పర్వతాలకు వెళ్లాను.',
          },
          {
            en: 'The air was fresh and the views were beautiful.',
            native: 'అక్కడ గాలి స్వచ్ఛంగా ఉంది మరియు దృశ్యాలు అందంగా ఉన్నాయి.',
          },
          {
            en: 'We stayed there for three days and took many photos.',
            native: 'మేము అక్కడ మూడు రోజులు ఉండి చాలా ఫోటోలు తీశాము.',
          },
        ],
      },
      hi: {
        word: 'यात्रा',
        question: 'आपके द्वारा घुमी गई किसी जगह के बारे में बताइए।',
        examples: [
          {
            en: 'Last year, I visited the mountains with my family.',
            native: 'पिछले साल, मैं अपने परिवार के साथ पहाड़ों पर गया।',
          },
          {
            en: 'The air was fresh and the views were beautiful.',
            native: 'वहाँ हवा ताज़ा थी और नज़ारे खूबसूरत थे।',
          },
          {
            en: 'We stayed there for three days and took many photos.',
            native: 'हम वहाँ तीन दिन रहे और बहुत सी तस्वीरें लीं।',
          },
        ],
      },
      es: {
        word: 'viaje',
        question: 'Habla de un lugar que visitaste.',
        examples: [
          {
            en: 'Last year, I visited the mountains with my family.',
            native: 'El año pasado visité las montañas con mi familia.',
          },
          {
            en: 'The air was fresh and the views were beautiful.',
            native: 'El aire era fresco y las vistas eran hermosas.',
          },
          {
            en: 'We stayed there for three days and took many photos.',
            native: 'Nos quedamos allí tres días y tomamos muchas fotos.',
          },
        ],
      },
      zh: {
        word: '旅行',
        question: '谈谈你去过的一个地方。',
        examples: [
          {
            en: 'Last year, I visited the mountains with my family.',
            native: '去年，我和家人一起去了山区。',
          },
          {
            en: 'The air was fresh and the views were beautiful.',
            native: '那里空气清新，风景优美。',
          },
          {
            en: 'We stayed there for three days and took many photos.',
            native: '我们在那里待了三天，拍了很多照片。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'job',
    questionText: 'Describe your job or daily work.',
    translations: {
      te: {
        word: 'ఉద్యోగం',
        question: 'మీ ఉద్యోగం లేదా రోజువారీ పనిని వివరించండి.',
        examples: [
          {
            en: 'I work in an office in the city centre.',
            native: 'నేను నగర మధ్యలో ఒక ఆఫీసులో పని చేస్తాను.',
          },
          {
            en: 'My job starts at nine and finishes at five.',
            native: 'నా పని తొమ్మిది గంటలకు మొదలై ఐదు గంటలకు ముగుస్తుంది.',
          },
          {
            en: 'I answer emails and talk to customers every day.',
            native: 'నేను ప్రతిరోజూ ఇమెయిల్‌లకు సమాధానం ఇస్తాను మరియు కస్టమర్లతో మాట్లాడతాను.',
          },
        ],
      },
      hi: {
        word: 'नौकरी',
        question: 'अपनी नौकरी या रोज़ के काम का वर्णन कीजिए।',
        examples: [
          {
            en: 'I work in an office in the city centre.',
            native: 'मैं शहर के केंद्र में एक दफ़्तर में काम करता हूँ।',
          },
          {
            en: 'My job starts at nine and finishes at five.',
            native: 'मेरा काम नौ बजे शुरू होता है और पाँच बजे ख़त्म होता है।',
          },
          {
            en: 'I answer emails and talk to customers every day.',
            native: 'मैं रोज़ ईमेल के जवाब देता हूँ और ग्राहकों से बात करता हूँ।',
          },
        ],
      },
      es: {
        word: 'trabajo',
        question: 'Describe tu trabajo o tus tareas diarias.',
        examples: [
          {
            en: 'I work in an office in the city centre.',
            native: 'Trabajo en una oficina en el centro de la ciudad.',
          },
          {
            en: 'My job starts at nine and finishes at five.',
            native: 'Mi trabajo empieza a las nueve y termina a las cinco.',
          },
          {
            en: 'I answer emails and talk to customers every day.',
            native: 'Todos los días respondo correos y hablo con clientes.',
          },
        ],
      },
      zh: {
        word: '工作',
        question: '描述一下你的工作或日常工作。',
        examples: [
          {
            en: 'I work in an office in the city centre.',
            native: '我在市中心的一间办公室工作。',
          },
          {
            en: 'My job starts at nine and finishes at five.',
            native: '我九点上班，五点下班。',
          },
          {
            en: 'I answer emails and talk to customers every day.',
            native: '我每天回复邮件，和客户交谈。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'weather',
    questionText: 'What is the weather like today? What do you do on rainy days?',
    translations: {
      te: {
        word: 'వాతావరణం',
        question: 'ఈరోజు వాతావరణం ఎలా ఉంది? వర్షం పడే రోజుల్లో మీరు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'Today the weather is hot and sunny.',
            native: 'ఈరోజు వాతావరణం వేడిగా మరియు ఎండగా ఉంది.',
          },
          {
            en: 'On rainy days, I stay at home and read.',
            native: 'వర్షం పడే రోజుల్లో, నేను ఇంట్లో ఉండి చదువుతాను.',
          },
          {
            en: 'I like drinking hot tea when it rains.',
            native: 'వర్షం పడినప్పుడు వేడి టీ తాగడం నాకు ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'मौसम',
        question: 'आज मौसम कैसा है? बारिश के दिनों में आप क्या करते हैं?',
        examples: [
          {
            en: 'Today the weather is hot and sunny.',
            native: 'आज मौसम गर्म और धूप वाला है।',
          },
          {
            en: 'On rainy days, I stay at home and read.',
            native: 'बारिश के दिनों में, मैं घर पर रहकर पढ़ता हूँ।',
          },
          {
            en: 'I like drinking hot tea when it rains.',
            native: 'बारिश होने पर मुझे गर्म चाय पीना पसंद है।',
          },
        ],
      },
      es: {
        word: 'clima',
        question: '¿Cómo está el clima hoy? ¿Qué haces en los días de lluvia?',
        examples: [
          {
            en: 'Today the weather is hot and sunny.',
            native: 'Hoy el clima es caluroso y soleado.',
          },
          {
            en: 'On rainy days, I stay at home and read.',
            native: 'En los días de lluvia, me quedo en casa y leo.',
          },
          {
            en: 'I like drinking hot tea when it rains.',
            native: 'Me gusta tomar té caliente cuando llueve.',
          },
        ],
      },
      zh: {
        word: '天气',
        question: '今天天气怎么样？下雨天你做什么？',
        examples: [
          {
            en: 'Today the weather is hot and sunny.',
            native: '今天天气炎热，阳光灿烂。',
          },
          {
            en: 'On rainy days, I stay at home and read.',
            native: '下雨天，我待在家里看书。',
          },
          {
            en: 'I like drinking hot tea when it rains.',
            native: '下雨时我喜欢喝热茶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'shopping',
    questionText: 'Talk about shopping. What do you like to buy?',
    translations: {
      te: {
        word: 'షాపింగ్',
        question: 'షాపింగ్ గురించి మాట్లాడండి. మీరు ఏమి కొనడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'I usually buy clothes and shoes at the market.',
            native: 'నేను సాధారణంగా మార్కెట్లో బట్టలు మరియు బూట్లు కొంటాను.',
          },
          {
            en: 'I like buying fresh fruit every week.',
            native: 'ప్రతి వారం తాజా పండ్లు కొనడం నాకు ఇష్టం.',
          },
          {
            en: 'Sometimes I shop online because it is easy.',
            native: 'కొన్నిసార్లు నేను ఆన్‌లైన్‌లో కొంటాను ఎందుకంటే అది సులభం.',
          },
        ],
      },
      hi: {
        word: 'खरीदारी',
        question: 'खरीदारी के बारे में बताइए। आप क्या खरीदना पसंद करते हैं?',
        examples: [
          {
            en: 'I usually buy clothes and shoes at the market.',
            native: 'मैं आमतौर पर बाज़ार से कपड़े और जूते खरीदता हूँ।',
          },
          {
            en: 'I like buying fresh fruit every week.',
            native: 'मुझे हर हफ़्ते ताज़े फल खरीदना पसंद है।',
          },
          {
            en: 'Sometimes I shop online because it is easy.',
            native: 'कभी-कभी मैं ऑनलाइन खरीदारी करता हूँ क्योंकि यह आसान है।',
          },
        ],
      },
      es: {
        word: 'compras',
        question: 'Habla de las compras. ¿Qué te gusta comprar?',
        examples: [
          {
            en: 'I usually buy clothes and shoes at the market.',
            native: 'Normalmente compro ropa y zapatos en el mercado.',
          },
          {
            en: 'I like buying fresh fruit every week.',
            native: 'Me gusta comprar fruta fresca cada semana.',
          },
          {
            en: 'Sometimes I shop online because it is easy.',
            native: 'A veces compro en línea porque es fácil.',
          },
        ],
      },
      zh: {
        word: '购物',
        question: '谈谈购物。你喜欢买什么？',
        examples: [
          {
            en: 'I usually buy clothes and shoes at the market.',
            native: '我通常在市场买衣服和鞋子。',
          },
          {
            en: 'I like buying fresh fruit every week.',
            native: '我喜欢每周买新鲜水果。',
          },
          {
            en: 'Sometimes I shop online because it is easy.',
            native: '有时我在网上购物，因为很方便。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'school',
    questionText: 'Talk about your school days or your studies.',
    translations: {
      te: {
        word: 'పాఠశాల',
        question: 'మీ పాఠశాల రోజులు లేదా మీ చదువు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I studied in a school near my village.',
            native: 'నేను మా ఊరి దగ్గర ఉన్న పాఠశాలలో చదివాను.',
          },
          {
            en: 'My favourite subject was mathematics.',
            native: 'నా ఇష్టమైన సబ్జెక్ట్ గణితం.',
          },
          {
            en: 'I walked to school with my friends every morning.',
            native: 'ప్రతి ఉదయం నేను నా స్నేహితులతో కలిసి పాఠశాలకు నడిచి వెళ్లేవాణ్ణి.',
          },
        ],
      },
      hi: {
        word: 'विद्यालय',
        question: 'अपने स्कूल के दिनों या अपनी पढ़ाई के बारे में बताइए।',
        examples: [
          {
            en: 'I studied in a school near my village.',
            native: 'मैंने अपने गाँव के पास के एक स्कूल में पढ़ाई की।',
          },
          {
            en: 'My favourite subject was mathematics.',
            native: 'मेरा पसंदीदा विषय गणित था।',
          },
          {
            en: 'I walked to school with my friends every morning.',
            native: 'मैं हर सुबह अपने दोस्तों के साथ स्कूल पैदल जाता था।',
          },
        ],
      },
      es: {
        word: 'escuela',
        question: 'Habla de tus días de escuela o de tus estudios.',
        examples: [
          {
            en: 'I studied in a school near my village.',
            native: 'Estudié en una escuela cerca de mi pueblo.',
          },
          {
            en: 'My favourite subject was mathematics.',
            native: 'Mi materia favorita era matemáticas.',
          },
          {
            en: 'I walked to school with my friends every morning.',
            native: 'Caminaba a la escuela con mis amigos todas las mañanas.',
          },
        ],
      },
      zh: {
        word: '学校',
        question: '谈谈你的学生时代或你的学习。',
        examples: [
          {
            en: 'I studied in a school near my village.',
            native: '我在村子附近的一所学校上学。',
          },
          {
            en: 'My favourite subject was mathematics.',
            native: '我最喜欢的科目是数学。',
          },
          {
            en: 'I walked to school with my friends every morning.',
            native: '我每天早上和朋友们一起步行去上学。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'holiday',
    questionText: 'Talk about your last holiday. Where did you go and what did you do?',
    translations: {
      te: {
        word: 'సెలవు',
        question: 'మీ చివరి సెలవు గురించి మాట్లాడండి. మీరు ఎక్కడికి వెళ్ళారు, ఏమి చేశారు?',
        examples: [
          {
            en: 'Last holiday I went to the beach with my family.',
            native: 'చివరి సెలవులో నేను నా కుటుంబంతో బీచ్‌కి వెళ్ళాను.',
          },
          {
            en: 'We swam in the sea and ate fresh fish.',
            native: 'మేము సముద్రంలో ఈత కొట్టాము, తాజా చేపలు తిన్నాము.',
          },
          {
            en: 'Next year I am going to visit the mountains.',
            native: 'వచ్చే సంవత్సరం నేను పర్వతాలను సందర్శించబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'छुट्टी',
        question: 'अपनी पिछली छुट्टी के बारे में बताइए। आप कहाँ गए और क्या किया?',
        examples: [
          {
            en: 'Last holiday I went to the beach with my family.',
            native: 'पिछली छुट्टी में मैं अपने परिवार के साथ समुद्र तट गया।',
          },
          {
            en: 'We swam in the sea and ate fresh fish.',
            native: 'हमने समुद्र में तैराकी की और ताज़ी मछली खाई।',
          },
          {
            en: 'Next year I am going to visit the mountains.',
            native: 'अगले साल मैं पहाड़ों पर जाने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'vacaciones',
        question: 'Habla de tus últimas vacaciones. ¿Adónde fuiste y qué hiciste?',
        examples: [
          {
            en: 'Last holiday I went to the beach with my family.',
            native: 'En mis últimas vacaciones fui a la playa con mi familia.',
          },
          {
            en: 'We swam in the sea and ate fresh fish.',
            native: 'Nadamos en el mar y comimos pescado fresco.',
          },
          {
            en: 'Next year I am going to visit the mountains.',
            native: 'El próximo año voy a visitar las montañas.',
          },
        ],
      },
      zh: {
        word: '假期',
        question: '谈谈你的上一个假期。你去了哪里，做了什么？',
        examples: [
          {
            en: 'Last holiday I went to the beach with my family.',
            native: '上个假期我和家人一起去了海滩。',
          },
          {
            en: 'We swam in the sea and ate fresh fish.',
            native: '我们在海里游泳，还吃了新鲜的鱼。',
          },
          {
            en: 'Next year I am going to visit the mountains.',
            native: '明年我打算去山区游览。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'birthday',
    questionText: 'Talk about your last birthday. How did you celebrate it?',
    translations: {
      te: {
        word: 'పుట్టినరోజు',
        question: 'మీ చివరి పుట్టినరోజు గురించి మాట్లాడండి. మీరు దానిని ఎలా జరుపుకున్నారు?',
        examples: [
          {
            en: 'My last birthday was on a Saturday in June.',
            native: 'నా చివరి పుట్టినరోజు జూన్‌లో ఒక శనివారం వచ్చింది.',
          },
          {
            en: 'My friends came to my house and we ate cake.',
            native: 'నా స్నేహితులు మా ఇంటికి వచ్చారు, మేము కేకు తిన్నాము.',
          },
          {
            en: 'I got a new watch as a birthday present.',
            native: 'నాకు పుట్టినరోజు బహుమతిగా ఒక కొత్త గడియారం వచ్చింది.',
          },
        ],
      },
      hi: {
        word: 'जन्मदिन',
        question: 'अपने पिछले जन्मदिन के बारे में बताइए। आपने उसे कैसे मनाया?',
        examples: [
          {
            en: 'My last birthday was on a Saturday in June.',
            native: 'मेरा पिछला जन्मदिन जून के एक शनिवार को था।',
          },
          {
            en: 'My friends came to my house and we ate cake.',
            native: 'मेरे दोस्त मेरे घर आए और हमने केक खाया।',
          },
          {
            en: 'I got a new watch as a birthday present.',
            native: 'मुझे जन्मदिन के तोहफ़े में एक नई घड़ी मिली।',
          },
        ],
      },
      es: {
        word: 'cumpleaños',
        question: 'Habla de tu último cumpleaños. ¿Cómo lo celebraste?',
        examples: [
          {
            en: 'My last birthday was on a Saturday in June.',
            native: 'Mi último cumpleaños fue un sábado de junio.',
          },
          {
            en: 'My friends came to my house and we ate cake.',
            native: 'Mis amigos vinieron a mi casa y comimos pastel.',
          },
          {
            en: 'I got a new watch as a birthday present.',
            native: 'Recibí un reloj nuevo como regalo de cumpleaños.',
          },
        ],
      },
      zh: {
        word: '生日',
        question: '谈谈你的上一个生日。你是怎么庆祝的？',
        examples: [
          {
            en: 'My last birthday was on a Saturday in June.',
            native: '我的上一个生日是六月的一个星期六。',
          },
          {
            en: 'My friends came to my house and we ate cake.',
            native: '朋友们来到我家，我们一起吃了蛋糕。',
          },
          {
            en: 'I got a new watch as a birthday present.',
            native: '我收到了一块新手表作为生日礼物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'breakfast',
    questionText: 'What do you usually eat for breakfast?',
    translations: {
      te: {
        word: 'అల్పాహారం',
        question: 'మీరు సాధారణంగా అల్పాహారంలో ఏమి తింటారు?',
        examples: [
          {
            en: 'I usually eat bread and eggs for breakfast.',
            native: 'నేను సాధారణంగా అల్పాహారంలో బ్రెడ్ మరియు గుడ్లు తింటాను.',
          },
          {
            en: 'Sometimes I drink a glass of milk in the morning.',
            native: 'కొన్నిసార్లు నేను ఉదయం ఒక గ్లాసు పాలు తాగుతాను.',
          },
          {
            en: 'On Sundays, my mother cooks a big breakfast.',
            native: 'ఆదివారాల్లో, మా అమ్మ పెద్ద అల్పాహారం వంటుతుంది.',
          },
        ],
      },
      hi: {
        word: 'नाश्ता',
        question: 'आप नाश्ते में आमतौर पर क्या खाते हैं?',
        examples: [
          {
            en: 'I usually eat bread and eggs for breakfast.',
            native: 'मैं नाश्ते में आमतौर पर ब्रेड और अंडे खाता हूँ।',
          },
          {
            en: 'Sometimes I drink a glass of milk in the morning.',
            native: 'कभी-कभी मैं सुबह एक गिलास दूध पीता हूँ।',
          },
          {
            en: 'On Sundays, my mother cooks a big breakfast.',
            native: 'रविवार को, मेरी माँ बड़ा नाश्ता बनाती है।',
          },
        ],
      },
      es: {
        word: 'desayuno',
        question: '¿Qué sueles desayunar?',
        examples: [
          {
            en: 'I usually eat bread and eggs for breakfast.',
            native: 'Normalmente desayuno pan y huevos.',
          },
          {
            en: 'Sometimes I drink a glass of milk in the morning.',
            native: 'A veces bebo un vaso de leche por la mañana.',
          },
          {
            en: 'On Sundays, my mother cooks a big breakfast.',
            native: 'Los domingos, mi madre cocina un desayuno grande.',
          },
        ],
      },
      zh: {
        word: '早餐',
        question: '你早餐通常吃什么？',
        examples: [
          {
            en: 'I usually eat bread and eggs for breakfast.',
            native: '我早餐通常吃面包和鸡蛋。',
          },
          {
            en: 'Sometimes I drink a glass of milk in the morning.',
            native: '有时我早上喝一杯牛奶。',
          },
          {
            en: 'On Sundays, my mother cooks a big breakfast.',
            native: '星期天，我妈妈会做一顿丰盛的早餐。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'dinner',
    questionText: 'What time do you eat dinner? What do you like to eat?',
    translations: {
      te: {
        word: 'రాత్రి భోజనం',
        question: 'మీరు ఏ సమయానికి రాత్రి భోజనం తింటారు? మీరు ఏమి తినడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: "We eat dinner at eight o'clock every evening.",
            native: 'మేము ప్రతి రోజు సాయంత్రం ఎనిమిది గంటలకు భోజనం తింటాము.',
          },
          {
            en: 'For dinner, I like rice with vegetables and chicken.',
            native: 'రాత్రి భోజనానికి, నాకు కూరగాయలు మరియు చికెన్‌తో అన్నం ఇష్టం.',
          },
          {
            en: 'Yesterday we ate dinner in a small restaurant.',
            native: 'నిన్న మేము ఒక చిన్న రెస్టారెంట్‌లో భోజనం తిన్నాము.',
          },
        ],
      },
      hi: {
        word: 'रात का खाना',
        question: 'आप रात का खाना कितने बजे खाते हैं? आप क्या खाना पसंद करते हैं?',
        examples: [
          {
            en: "We eat dinner at eight o'clock every evening.",
            native: 'हम हर शाम आठ बजे खाना खाते हैं।',
          },
          {
            en: 'For dinner, I like rice with vegetables and chicken.',
            native: 'रात के खाने में, मुझे सब्ज़ियों और चिकन के साथ चावल पसंद है।',
          },
          {
            en: 'Yesterday we ate dinner in a small restaurant.',
            native: 'कल हमने एक छोटे रेस्तराँ में खाना खाया।',
          },
        ],
      },
      es: {
        word: 'cena',
        question: '¿A qué hora cenas? ¿Qué te gusta comer?',
        examples: [
          {
            en: "We eat dinner at eight o'clock every evening.",
            native: 'Cenamos a las ocho todas las noches.',
          },
          {
            en: 'For dinner, I like rice with vegetables and chicken.',
            native: 'Para la cena, me gusta el arroz con verduras y pollo.',
          },
          {
            en: 'Yesterday we ate dinner in a small restaurant.',
            native: 'Ayer cenamos en un restaurante pequeño.',
          },
        ],
      },
      zh: {
        word: '晚餐',
        question: '你几点吃晚饭？你喜欢吃什么？',
        examples: [
          {
            en: "We eat dinner at eight o'clock every evening.",
            native: '我们每天晚上八点吃晚饭。',
          },
          {
            en: 'For dinner, I like rice with vegetables and chicken.',
            native: '晚餐我喜欢吃米饭配蔬菜和鸡肉。',
          },
          {
            en: 'Yesterday we ate dinner in a small restaurant.',
            native: '昨天我们在一家小餐馆吃了晚饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'cooking',
    questionText: 'Do you like cooking? What dishes can you cook?',
    translations: {
      te: {
        word: 'వంట',
        question: 'మీకు వంట చేయడం ఇష్టమా? మీరు ఏ వంటకాలు వండగలరు?',
        examples: [
          {
            en: 'I like cooking simple meals at home on weekends.',
            native: 'వారాంతాల్లో ఇంట్లో సరళమైన భోజనం వండడం నాకు ఇష్టం.',
          },
          {
            en: 'I can cook rice, eggs, and vegetable curry.',
            native: 'నేను అన్నం, గుడ్లు, కూరగాయల కూర వండగలను.',
          },
          {
            en: 'Last week I cooked soup for my grandmother.',
            native: 'గత వారం నేను నా అమ్మమ్మ కోసం సూప్ వండాను.',
          },
        ],
      },
      hi: {
        word: 'खाना बनाना',
        question: 'क्या आपको खाना बनाना पसंद है? आप कौन से पकवान बना सकते हैं?',
        examples: [
          {
            en: 'I like cooking simple meals at home on weekends.',
            native: 'मुझे सप्ताहांत में घर पर सादा खाना बनाना पसंद है।',
          },
          {
            en: 'I can cook rice, eggs, and vegetable curry.',
            native: 'मैं चावल, अंडे और सब्ज़ी की करी बना सकता हूँ।',
          },
          {
            en: 'Last week I cooked soup for my grandmother.',
            native: 'पिछले हफ़्ते मैंने अपनी दादी के लिए सूप बनाया।',
          },
        ],
      },
      es: {
        word: 'cocinar',
        question: '¿Te gusta cocinar? ¿Qué platos sabes cocinar?',
        examples: [
          {
            en: 'I like cooking simple meals at home on weekends.',
            native: 'Me gusta cocinar comidas sencillas en casa los fines de semana.',
          },
          {
            en: 'I can cook rice, eggs, and vegetable curry.',
            native: 'Sé cocinar arroz, huevos y curry de verduras.',
          },
          {
            en: 'Last week I cooked soup for my grandmother.',
            native: 'La semana pasada cociné sopa para mi abuela.',
          },
        ],
      },
      zh: {
        word: '做饭',
        question: '你喜欢做饭吗？你会做哪些菜？',
        examples: [
          {
            en: 'I like cooking simple meals at home on weekends.',
            native: '我喜欢周末在家做简单的饭菜。',
          },
          {
            en: 'I can cook rice, eggs, and vegetable curry.',
            native: '我会做米饭、鸡蛋和蔬菜咖喱。',
          },
          {
            en: 'Last week I cooked soup for my grandmother.',
            native: '上周我给奶奶做了汤。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'restaurant',
    questionText: 'Talk about a restaurant you like. What food do you eat there?',
    translations: {
      te: {
        word: 'రెస్టారెంట్',
        question: 'మీకు ఇష్టమైన రెస్టారెంట్ గురించి మాట్లాడండి. మీరు అక్కడ ఏ ఆహారం తింటారు?',
        examples: [
          {
            en: 'My favourite restaurant is near the bus station.',
            native: 'నా ఇష్టమైన రెస్టారెంట్ బస్ స్టేషన్ దగ్గర ఉంది.',
          },
          {
            en: 'I usually eat noodles and drink fresh juice there.',
            native: 'నేను సాధారణంగా అక్కడ నూడుల్స్ తిని తాజా జ్యూస్ తాగుతాను.',
          },
          {
            en: 'Last month I went there with my whole family.',
            native: 'గత నెల నేను నా మొత్తం కుటుంబంతో అక్కడికి వెళ్ళాను.',
          },
        ],
      },
      hi: {
        word: 'रेस्तराँ',
        question: 'अपने पसंदीदा रेस्तराँ के बारे में बताइए। आप वहाँ क्या खाते हैं?',
        examples: [
          {
            en: 'My favourite restaurant is near the bus station.',
            native: 'मेरा पसंदीदा रेस्तराँ बस स्टेशन के पास है।',
          },
          {
            en: 'I usually eat noodles and drink fresh juice there.',
            native: 'मैं वहाँ आमतौर पर नूडल्स खाता हूँ और ताज़ा जूस पीता हूँ।',
          },
          {
            en: 'Last month I went there with my whole family.',
            native: 'पिछले महीने मैं अपने पूरे परिवार के साथ वहाँ गया।',
          },
        ],
      },
      es: {
        word: 'restaurante',
        question: 'Habla de un restaurante que te gusta. ¿Qué comes allí?',
        examples: [
          {
            en: 'My favourite restaurant is near the bus station.',
            native: 'Mi restaurante favorito está cerca de la estación de autobuses.',
          },
          {
            en: 'I usually eat noodles and drink fresh juice there.',
            native: 'Normalmente como fideos y bebo jugo fresco allí.',
          },
          {
            en: 'Last month I went there with my whole family.',
            native: 'El mes pasado fui allí con toda mi familia.',
          },
        ],
      },
      zh: {
        word: '餐馆',
        question: '谈谈你喜欢的一家餐馆。你在那里吃什么？',
        examples: [
          {
            en: 'My favourite restaurant is near the bus station.',
            native: '我最喜欢的餐馆在公交车站附近。',
          },
          {
            en: 'I usually eat noodles and drink fresh juice there.',
            native: '我通常在那里吃面条，喝新鲜的果汁。',
          },
          {
            en: 'Last month I went there with my whole family.',
            native: '上个月我和全家人一起去了那里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'pet',
    questionText: 'Do you have a pet? Talk about it, or a pet you want.',
    translations: {
      te: {
        word: 'పెంపుడు జంతువు',
        question: 'మీకు పెంపుడు జంతువు ఉందా? దాని గురించి లేదా మీకు కావాల్సిన పెంపుడు జంతువు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I have a small white cat at home.',
            native: 'మా ఇంట్లో నాకు ఒక చిన్న తెల్ల పిల్లి ఉంది.',
          },
          {
            en: 'She sleeps on my bed and plays with string.',
            native: 'అది నా మంచంపై నిద్రిస్తుంది మరియు దారంతో ఆడుకుంటుంది.',
          },
          {
            en: 'I am going to buy a fish tank next month.',
            native: 'వచ్చే నెల నేను ఒక చేపల ట్యాంక్ కొనబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'पालतू जानवर',
        question:
          'क्या आपके पास कोई पालतू जानवर है? उसके बारे में बताइए, या किसी ऐसे जानवर के बारे में जो आप चाहते हैं।',
        examples: [
          {
            en: 'I have a small white cat at home.',
            native: 'मेरे घर पर एक छोटी सफ़ेद बिल्ली है।',
          },
          {
            en: 'She sleeps on my bed and plays with string.',
            native: 'वह मेरे बिस्तर पर सोती है और डोरी से खेलती है।',
          },
          {
            en: 'I am going to buy a fish tank next month.',
            native: 'मैं अगले महीने एक मछलीघर खरीदने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'mascota',
        question: '¿Tienes una mascota? Habla de ella, o de una mascota que quieras.',
        examples: [
          {
            en: 'I have a small white cat at home.',
            native: 'Tengo un pequeño gato blanco en casa.',
          },
          {
            en: 'She sleeps on my bed and plays with string.',
            native: 'Ella duerme en mi cama y juega con un cordón.',
          },
          {
            en: 'I am going to buy a fish tank next month.',
            native: 'Voy a comprar una pecera el mes que viene.',
          },
        ],
      },
      zh: {
        word: '宠物',
        question: '你有宠物吗？谈谈它，或者你想要的宠物。',
        examples: [
          {
            en: 'I have a small white cat at home.',
            native: '我家里有一只白色的小猫。',
          },
          {
            en: 'She sleeps on my bed and plays with string.',
            native: '它睡在我的床上，还喜欢玩绳子。',
          },
          {
            en: 'I am going to buy a fish tank next month.',
            native: '下个月我打算买一个鱼缸。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'dog',
    questionText: 'Do you like dogs? Talk about a dog you know.',
    translations: {
      te: {
        word: 'కుక్క',
        question: 'మీకు కుక్కలు ఇష్టమా? మీకు తెలిసిన ఒక కుక్క గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My uncle has a big brown dog called Tommy.',
            native: 'మా మామయ్యకు టామీ అనే ఒక పెద్ద గోధుమ రంగు కుక్క ఉంది.',
          },
          {
            en: 'He runs in the garden and likes to swim.',
            native: 'అది తోటలో పరుగెత్తుతుంది మరియు ఈత కొట్టడం ఇష్టపడుతుంది.',
          },
          {
            en: 'Every evening I take him for a walk.',
            native: 'ప్రతి సాయంత్రం నేను దానిని నడవడానికి తీసుకెళ్తాను.',
          },
        ],
      },
      hi: {
        word: 'कुत्ता',
        question: 'क्या आपको कुत्ते पसंद हैं? किसी जानने वाले कुत्ते के बारे में बताइए।',
        examples: [
          {
            en: 'My uncle has a big brown dog called Tommy.',
            native: 'मेरे चाचा के पास टॉमी नाम का एक बड़ा भूरा कुत्ता है।',
          },
          {
            en: 'He runs in the garden and likes to swim.',
            native: 'वह बगीचे में दौड़ता है और तैरना पसंद करता है।',
          },
          {
            en: 'Every evening I take him for a walk.',
            native: 'हर शाम मैं उसे घूमने ले जाता हूँ।',
          },
        ],
      },
      es: {
        word: 'perro',
        question: '¿Te gustan los perros? Habla de un perro que conoces.',
        examples: [
          {
            en: 'My uncle has a big brown dog called Tommy.',
            native: 'Mi tío tiene un perro marrón grande llamado Tommy.',
          },
          {
            en: 'He runs in the garden and likes to swim.',
            native: 'Él corre en el jardín y le gusta nadar.',
          },
          {
            en: 'Every evening I take him for a walk.',
            native: 'Cada tarde lo saco a pasear.',
          },
        ],
      },
      zh: {
        word: '狗',
        question: '你喜欢狗吗？谈谈你认识的一只狗。',
        examples: [
          {
            en: 'My uncle has a big brown dog called Tommy.',
            native: '我叔叔有一只叫汤米的棕色大狗。',
          },
          {
            en: 'He runs in the garden and likes to swim.',
            native: '它在花园里跑来跑去，还喜欢游泳。',
          },
          {
            en: 'Every evening I take him for a walk.',
            native: '每天傍晚我都带它去散步。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'bus',
    questionText: 'How do you travel to work or school? Do you take the bus?',
    translations: {
      te: {
        word: 'బస్సు',
        question: 'మీరు పనికి లేదా పాఠశాలకు ఎలా వెళ్తారు? మీరు బస్సు తీసుకుంటారా?',
        examples: [
          {
            en: 'I take the bus to work every morning.',
            native: 'నేను ప్రతి ఉదయం పనికి బస్సులో వెళ్తాను.',
          },
          {
            en: 'The bus stop is near my house, so it is easy.',
            native: 'బస్ స్టాప్ మా ఇంటి దగ్గర ఉంది, కాబట్టి అది సులభం.',
          },
          {
            en: 'Yesterday the bus was late, so I walked.',
            native: 'నిన్న బస్సు ఆలస్యమైంది, కాబట్టి నేను నడిచి వెళ్ళాను.',
          },
        ],
      },
      hi: {
        word: 'बस',
        question: 'आप काम या स्कूल कैसे जाते हैं? क्या आप बस लेते हैं?',
        examples: [
          {
            en: 'I take the bus to work every morning.',
            native: 'मैं हर सुबह काम पर बस से जाता हूँ।',
          },
          {
            en: 'The bus stop is near my house, so it is easy.',
            native: 'बस स्टॉप मेरे घर के पास है, इसलिए यह आसान है।',
          },
          {
            en: 'Yesterday the bus was late, so I walked.',
            native: 'कल बस देर से आई, इसलिए मैं पैदल गया।',
          },
        ],
      },
      es: {
        word: 'autobús',
        question: '¿Cómo vas al trabajo o a la escuela? ¿Tomas el autobús?',
        examples: [
          {
            en: 'I take the bus to work every morning.',
            native: 'Tomo el autobús al trabajo todas las mañanas.',
          },
          {
            en: 'The bus stop is near my house, so it is easy.',
            native: 'La parada de autobús está cerca de mi casa, así que es fácil.',
          },
          {
            en: 'Yesterday the bus was late, so I walked.',
            native: 'Ayer el autobús llegó tarde, así que caminé.',
          },
        ],
      },
      zh: {
        word: '公交车',
        question: '你怎么去上班或上学？你坐公交车吗？',
        examples: [
          {
            en: 'I take the bus to work every morning.',
            native: '我每天早上坐公交车去上班。',
          },
          {
            en: 'The bus stop is near my house, so it is easy.',
            native: '公交车站就在我家附近，所以很方便。',
          },
          {
            en: 'Yesterday the bus was late, so I walked.',
            native: '昨天公交车晚点了，所以我走路去的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'train',
    questionText: 'Do you like travelling by train? Talk about a train journey.',
    translations: {
      te: {
        word: 'రైలు',
        question: 'మీకు రైలులో ప్రయాణించడం ఇష్టమా? ఒక రైలు ప్రయాణం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I like travelling by train because it is comfortable.',
            native: 'రైలులో ప్రయాణించడం నాకు ఇష్టం ఎందుకంటే అది సౌకర్యవంతంగా ఉంటుంది.',
          },
          {
            en: 'Last summer I took a train to the mountains.',
            native: 'గత వేసవిలో నేను పర్వతాలకు రైలు తీసుకున్నాను.',
          },
          {
            en: 'The journey was long, but the views were beautiful.',
            native: 'ప్రయాణం పొడవుగా ఉంది, కానీ దృశ్యాలు అందంగా ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'ट्रेन',
        question: 'क्या आपको ट्रेन से यात्रा करना पसंद है? किसी ट्रेन यात्रा के बारे में बताइए।',
        examples: [
          {
            en: 'I like travelling by train because it is comfortable.',
            native: 'मुझे ट्रेन से यात्रा करना पसंद है क्योंकि यह आरामदायक है।',
          },
          {
            en: 'Last summer I took a train to the mountains.',
            native: 'पिछली गर्मी में मैंने पहाड़ों के लिए ट्रेन ली।',
          },
          {
            en: 'The journey was long, but the views were beautiful.',
            native: 'यात्रा लंबी थी, लेकिन नज़ारे खूबसूरत थे।',
          },
        ],
      },
      es: {
        word: 'tren',
        question: '¿Te gusta viajar en tren? Habla de un viaje en tren.',
        examples: [
          {
            en: 'I like travelling by train because it is comfortable.',
            native: 'Me gusta viajar en tren porque es cómodo.',
          },
          {
            en: 'Last summer I took a train to the mountains.',
            native: 'El verano pasado tomé un tren a las montañas.',
          },
          {
            en: 'The journey was long, but the views were beautiful.',
            native: 'El viaje fue largo, pero las vistas eran hermosas.',
          },
        ],
      },
      zh: {
        word: '火车',
        question: '你喜欢坐火车旅行吗？谈谈一次火车旅行。',
        examples: [
          {
            en: 'I like travelling by train because it is comfortable.',
            native: '我喜欢坐火车旅行，因为很舒服。',
          },
          {
            en: 'Last summer I took a train to the mountains.',
            native: '去年夏天我坐火车去了山区。',
          },
          {
            en: 'The journey was long, but the views were beautiful.',
            native: '旅程很长，但风景很美。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'bicycle',
    questionText: 'Do you have a bicycle? Where do you like to ride it?',
    translations: {
      te: {
        word: 'సైకిల్',
        question: 'మీకు సైకిల్ ఉందా? మీరు దానిని ఎక్కడ తొక్కడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'I have a red bicycle and I ride it every day.',
            native: 'నాకు ఒక ఎర్రటి సైకిల్ ఉంది, నేను దానిని ప్రతిరోజూ తొక్కుతాను.',
          },
          {
            en: 'Last Sunday I rode my bicycle to the lake.',
            native: 'గత ఆదివారం నేను నా సైకిల్‌ను సరస్సు దగ్గరికి తొక్కాను.',
          },
          {
            en: 'I am going to buy a new helmet next week.',
            native: 'వచ్చే వారం నేను ఒక కొత్త హెల్మెట్ కొనబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'साइकिल',
        question: 'क्या आपके पास साइकिल है? आप इसे कहाँ चलाना पसंद करते हैं?',
        examples: [
          {
            en: 'I have a red bicycle and I ride it every day.',
            native: 'मेरे पास एक लाल साइकिल है और मैं इसे रोज़ चलाता हूँ।',
          },
          {
            en: 'Last Sunday I rode my bicycle to the lake.',
            native: 'पिछले रविवार मैं अपनी साइकिल से झील तक गया।',
          },
          {
            en: 'I am going to buy a new helmet next week.',
            native: 'मैं अगले हफ़्ते एक नया हेलमेट खरीदने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'bicicleta',
        question: '¿Tienes bicicleta? ¿Dónde te gusta montarla?',
        examples: [
          {
            en: 'I have a red bicycle and I ride it every day.',
            native: 'Tengo una bicicleta roja y la monto todos los días.',
          },
          {
            en: 'Last Sunday I rode my bicycle to the lake.',
            native: 'El domingo pasado fui en bicicleta hasta el lago.',
          },
          {
            en: 'I am going to buy a new helmet next week.',
            native: 'Voy a comprar un casco nuevo la semana que viene.',
          },
        ],
      },
      zh: {
        word: '自行车',
        question: '你有自行车吗？你喜欢骑它去哪里？',
        examples: [
          {
            en: 'I have a red bicycle and I ride it every day.',
            native: '我有一辆红色的自行车，我每天都骑它。',
          },
          {
            en: 'Last Sunday I rode my bicycle to the lake.',
            native: '上个星期天我骑自行车去了湖边。',
          },
          {
            en: 'I am going to buy a new helmet next week.',
            native: '下周我打算买一个新头盔。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'car',
    questionText: 'Does your family have a car? Talk about a trip by car.',
    translations: {
      te: {
        word: 'కారు',
        question: 'మీ కుటుంబానికి కారు ఉందా? కారులో చేసిన ఒక ప్రయాణం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My father drives an old blue car to work.',
            native: 'మా నాన్న పనికి పాత నీలిరంగు కారు నడుపుతారు.',
          },
          {
            en: 'Last month we drove to the beach in our car.',
            native: 'గత నెల మేము మా కారులో బీచ్‌కి వెళ్ళాము.',
          },
          {
            en: 'I am going to learn to drive next year.',
            native: 'వచ్చే సంవత్సరం నేను డ్రైవింగ్ నేర్చుకోబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'कार',
        question: 'क्या आपके परिवार के पास कार है? कार की किसी यात्रा के बारे में बताइए।',
        examples: [
          {
            en: 'My father drives an old blue car to work.',
            native: 'मेरे पिता काम पर पुरानी नीली कार चलाते हैं।',
          },
          {
            en: 'Last month we drove to the beach in our car.',
            native: 'पिछले महीने हम अपनी कार से समुद्र तट गए।',
          },
          {
            en: 'I am going to learn to drive next year.',
            native: 'मैं अगले साल गाड़ी चलाना सीखने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'coche',
        question: '¿Tu familia tiene coche? Habla de un viaje en coche.',
        examples: [
          {
            en: 'My father drives an old blue car to work.',
            native: 'Mi padre conduce un viejo coche azul al trabajo.',
          },
          {
            en: 'Last month we drove to the beach in our car.',
            native: 'El mes pasado fuimos a la playa en nuestro coche.',
          },
          {
            en: 'I am going to learn to drive next year.',
            native: 'Voy a aprender a conducir el año que viene.',
          },
        ],
      },
      zh: {
        word: '汽车',
        question: '你家有汽车吗？谈谈一次坐汽车的旅行。',
        examples: [
          {
            en: 'My father drives an old blue car to work.',
            native: '我爸爸开着一辆旧的蓝色汽车去上班。',
          },
          {
            en: 'Last month we drove to the beach in our car.',
            native: '上个月我们开车去了海滩。',
          },
          {
            en: 'I am going to learn to drive next year.',
            native: '明年我打算学开车。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'music',
    questionText: 'What kind of music do you like? When do you listen to music?',
    translations: {
      te: {
        word: 'సంగీతం',
        question: 'మీకు ఎలాంటి సంగీతం ఇష్టం? మీరు ఎప్పుడు సంగీతం వింటారు?',
        examples: [
          {
            en: 'I like pop music and old film songs.',
            native: 'నాకు పాప్ మ్యూజిక్ మరియు పాత సినిమా పాటలు ఇష్టం.',
          },
          {
            en: 'I listen to music when I cook dinner.',
            native: 'నేను రాత్రి భోజనం వంట చేసేటప్పుడు సంగీతం వింటాను.',
          },
          {
            en: 'Yesterday my brother played the guitar for us.',
            native: 'నిన్న నా సోదరుడు మా కోసం గిటార్ వాయించాడు.',
          },
        ],
      },
      hi: {
        word: 'संगीत',
        question: 'आपको किस तरह का संगीत पसंद है? आप कब संगीत सुनते हैं?',
        examples: [
          {
            en: 'I like pop music and old film songs.',
            native: 'मुझे पॉप संगीत और पुराने फ़िल्मी गाने पसंद हैं।',
          },
          {
            en: 'I listen to music when I cook dinner.',
            native: 'मैं खाना बनाते समय संगीत सुनता हूँ।',
          },
          {
            en: 'Yesterday my brother played the guitar for us.',
            native: 'कल मेरे भाई ने हमारे लिए गिटार बजाया।',
          },
        ],
      },
      es: {
        word: 'música',
        question: '¿Qué tipo de música te gusta? ¿Cuándo escuchas música?',
        examples: [
          {
            en: 'I like pop music and old film songs.',
            native: 'Me gusta la música pop y las canciones viejas de películas.',
          },
          {
            en: 'I listen to music when I cook dinner.',
            native: 'Escucho música cuando cocino la cena.',
          },
          {
            en: 'Yesterday my brother played the guitar for us.',
            native: 'Ayer mi hermano tocó la guitarra para nosotros.',
          },
        ],
      },
      zh: {
        word: '音乐',
        question: '你喜欢什么样的音乐？你什么时候听音乐？',
        examples: [
          {
            en: 'I like pop music and old film songs.',
            native: '我喜欢流行音乐和老的影视歌曲。',
          },
          {
            en: 'I listen to music when I cook dinner.',
            native: '我做晚饭的时候听音乐。',
          },
          {
            en: 'Yesterday my brother played the guitar for us.',
            native: '昨天我哥哥为我们弹了吉他。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'dance',
    questionText: 'Can you dance? Talk about a time you danced.',
    translations: {
      te: {
        word: 'నృత్యం',
        question: 'మీకు డ్యాన్స్ చేయడం వస్తుందా? మీరు డ్యాన్స్ చేసిన ఒక సందర్భం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I can dance a little, but not very well.',
            native: 'నేను కొంచెం డ్యాన్స్ చేయగలను, కానీ బాగా చేయలేను.',
          },
          {
            en: "At my cousin's wedding, everyone danced all night.",
            native: 'నా కజిన్ పెళ్ళిలో, అందరూ రాత్రిఅంతా డ్యాన్స్ చేశారు.',
          },
          {
            en: 'I am going to join a dance class soon.',
            native: 'నేను త్వరలో ఒక డ్యాన్స్ క్లాసులో చేరబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'नृत्य',
        question: 'क्या आप नाच सकते हैं? किसी ऐसे समय के बारे में बताइए जब आप नाचे।',
        examples: [
          {
            en: 'I can dance a little, but not very well.',
            native: 'मैं थोड़ा नाच सकता हूँ, लेकिन बहुत अच्छा नहीं।',
          },
          {
            en: "At my cousin's wedding, everyone danced all night.",
            native: 'मेरे चचेरे भाई की शादी में, सभी लोग रात भर नाचे।',
          },
          {
            en: 'I am going to join a dance class soon.',
            native: 'मैं जल्द ही एक डांस क्लास में शामिल होने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'baile',
        question: '¿Sabes bailar? Habla de una vez que bailaste.',
        examples: [
          {
            en: 'I can dance a little, but not very well.',
            native: 'Sé bailar un poco, pero no muy bien.',
          },
          {
            en: "At my cousin's wedding, everyone danced all night.",
            native: 'En la boda de mi primo, todos bailaron toda la noche.',
          },
          {
            en: 'I am going to join a dance class soon.',
            native: 'Voy a apuntarme a una clase de baile pronto.',
          },
        ],
      },
      zh: {
        word: '舞蹈',
        question: '你会跳舞吗？谈谈你跳舞的一次经历。',
        examples: [
          {
            en: 'I can dance a little, but not very well.',
            native: '我会跳一点舞，但跳得不太好。',
          },
          {
            en: "At my cousin's wedding, everyone danced all night.",
            native: '在我表哥的婚礼上，大家跳了一整夜。',
          },
          {
            en: 'I am going to join a dance class soon.',
            native: '我很快要参加一个舞蹈班。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'sport',
    questionText: 'What sports do you like? Do you play or watch them?',
    translations: {
      te: {
        word: 'క్రీడ',
        question: 'మీకు ఏ క్రీడలు ఇష్టం? మీరు వాటిని ఆడతారా లేదా చూస్తారా?',
        examples: [
          {
            en: 'My favourite sport is cricket because it is exciting.',
            native: 'నా ఇష్టమైన క్రీడ క్రికెట్ ఎందుకంటే అది ఉత్తేజకరంగా ఉంటుంది.',
          },
          {
            en: 'I play badminton with my friends on Sundays.',
            native: 'నేను ఆదివారాల్లో నా స్నేహితులతో బ్యాడ్మింటన్ ఆడతాను.',
          },
          {
            en: 'Last night we watched a football match on television.',
            native: 'నిన్న రాత్రి మేము టెలివిజన్‌లో ఫుట్‌బాల్ మ్యాచ్ చూశాము.',
          },
        ],
      },
      hi: {
        word: 'खेल',
        question: 'आपको कौन से खेल पसंद हैं? आप उन्हें खेलते हैं या देखते हैं?',
        examples: [
          {
            en: 'My favourite sport is cricket because it is exciting.',
            native: 'मेरा पसंदीदा खेल क्रिकेट है क्योंकि यह रोमांचक है।',
          },
          {
            en: 'I play badminton with my friends on Sundays.',
            native: 'मैं रविवार को अपने दोस्तों के साथ बैडमिंटन खेलता हूँ।',
          },
          {
            en: 'Last night we watched a football match on television.',
            native: 'कल रात हमने टेलीविज़न पर फ़ुटबॉल मैच देखा।',
          },
        ],
      },
      es: {
        word: 'deporte',
        question: '¿Qué deportes te gustan? ¿Los practicas o los ves?',
        examples: [
          {
            en: 'My favourite sport is cricket because it is exciting.',
            native: 'Mi deporte favorito es el críquet porque es emocionante.',
          },
          {
            en: 'I play badminton with my friends on Sundays.',
            native: 'Juego al bádminton con mis amigos los domingos.',
          },
          {
            en: 'Last night we watched a football match on television.',
            native: 'Anoche vimos un partido de fútbol en la televisión.',
          },
        ],
      },
      zh: {
        word: '运动',
        question: '你喜欢什么运动？你是亲自参与还是观看？',
        examples: [
          {
            en: 'My favourite sport is cricket because it is exciting.',
            native: '我最喜欢的运动是板球，因为它很刺激。',
          },
          {
            en: 'I play badminton with my friends on Sundays.',
            native: '我星期天和朋友们一起打羽毛球。',
          },
          {
            en: 'Last night we watched a football match on television.',
            native: '昨晚我们在电视上看了一场足球比赛。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'football',
    questionText: 'Do you like football? Talk about a match you saw or played.',
    translations: {
      te: {
        word: 'ఫుట్‌బాల్',
        question: 'మీకు ఫుట్‌బాల్ ఇష్టమా? మీరు చూసిన లేదా ఆడిన ఒక మ్యాచ్ గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I play football with my classmates after school.',
            native: 'నేను పాఠశాల తర్వాత నా క్లాస్‌మేట్స్‌తో ఫుట్‌బాల్ ఆడతాను.',
          },
          {
            en: 'Last week our team won the school match.',
            native: 'గత వారం మా జట్టు పాఠశాల మ్యాచ్‌లో గెలిచింది.',
          },
          {
            en: 'I am going to watch the final with my father.',
            native: 'నేను నా నాన్నతో కలిసి ఫైనల్ చూడబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'फ़ुटबॉल',
        question: 'क्या आपको फ़ुटबॉल पसंद है? किसी मैच के बारे में बताइए जो आपने देखा या खेला।',
        examples: [
          {
            en: 'I play football with my classmates after school.',
            native: 'मैं स्कूल के बाद अपने सहपाठियों के साथ फ़ुटबॉल खेलता हूँ।',
          },
          {
            en: 'Last week our team won the school match.',
            native: 'पिछले हफ़्ते हमारी टीम ने स्कूल का मैच जीता।',
          },
          {
            en: 'I am going to watch the final with my father.',
            native: 'मैं अपने पिता के साथ फ़ाइनल देखने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'fútbol',
        question: '¿Te gusta el fútbol? Habla de un partido que viste o jugaste.',
        examples: [
          {
            en: 'I play football with my classmates after school.',
            native: 'Juego al fútbol con mis compañeros después de clase.',
          },
          {
            en: 'Last week our team won the school match.',
            native: 'La semana pasada nuestro equipo ganó el partido del colegio.',
          },
          {
            en: 'I am going to watch the final with my father.',
            native: 'Voy a ver la final con mi padre.',
          },
        ],
      },
      zh: {
        word: '足球',
        question: '你喜欢足球吗？谈谈你看过或踢过的一场比赛。',
        examples: [
          {
            en: 'I play football with my classmates after school.',
            native: '放学后我和同学们一起踢足球。',
          },
          {
            en: 'Last week our team won the school match.',
            native: '上周我们队赢了学校的比赛。',
          },
          {
            en: 'I am going to watch the final with my father.',
            native: '我打算和爸爸一起看决赛。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'swimming',
    questionText: 'Can you swim? Where do you like to swim?',
    translations: {
      te: {
        word: 'ఈత',
        question: 'మీకు ఈత వస్తుందా? మీరు ఎక్కడ ఈత కొట్టడం ఇష్టపడతారు?',
        examples: [
          {
            en: 'I learned to swim when I was ten.',
            native: 'నాకు పది సంవత్సరాల వయసులో ఈత నేర్చుకున్నాను.',
          },
          {
            en: 'In summer I swim in the river near my village.',
            native: 'వేసవిలో నేను మా ఊరి దగ్గర నదిలో ఈత కొడతాను.',
          },
          {
            en: 'Next month I am going to join a swimming pool.',
            native: 'వచ్చే నెల నేను ఒక స్విమ్మింగ్ పూల్‌లో చేరబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'तैराकी',
        question: 'क्या आप तैर सकते हैं? आप कहाँ तैरना पसंद करते हैं?',
        examples: [
          {
            en: 'I learned to swim when I was ten.',
            native: 'मैंने दस साल की उम्र में तैरना सीखा।',
          },
          {
            en: 'In summer I swim in the river near my village.',
            native: 'गर्मियों में मैं अपने गाँव के पास की नदी में तैरता हूँ।',
          },
          {
            en: 'Next month I am going to join a swimming pool.',
            native: 'मैं अगले महीने एक स्विमिंग पूल में शामिल होने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'natación',
        question: '¿Sabes nadar? ¿Dónde te gusta nadar?',
        examples: [
          {
            en: 'I learned to swim when I was ten.',
            native: 'Aprendí a nadar cuando tenía diez años.',
          },
          {
            en: 'In summer I swim in the river near my village.',
            native: 'En verano nado en el río cerca de mi pueblo.',
          },
          {
            en: 'Next month I am going to join a swimming pool.',
            native: 'El mes que viene voy a apuntarme a una piscina.',
          },
        ],
      },
      zh: {
        word: '游泳',
        question: '你会游泳吗？你喜欢在哪里游泳？',
        examples: [
          {
            en: 'I learned to swim when I was ten.',
            native: '我十岁的时候学会了游泳。',
          },
          {
            en: 'In summer I swim in the river near my village.',
            native: '夏天我在村子附近的河里游泳。',
          },
          {
            en: 'Next month I am going to join a swimming pool.',
            native: '下个月我打算去游泳馆报名。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'game',
    questionText: 'What games do you play? Who do you play with?',
    translations: {
      te: {
        word: 'ఆట',
        question: 'మీరు ఏ ఆటలు ఆడతారు? మీరు ఎవరితో ఆడతారు?',
        examples: [
          {
            en: 'I play chess with my grandfather every evening.',
            native: 'నేను ప్రతి సాయంత్రం నా తాతయ్యతో చదరంగం ఆడతాను.',
          },
          {
            en: 'My little sister likes to play card games.',
            native: 'నా చిన్న చెల్లెలు పేకాట ఆడడం ఇష్టపడుతుంది.',
          },
          {
            en: 'Yesterday we played a new game on the phone.',
            native: 'నిన్న మేము ఫోన్‌లో ఒక కొత్త గేమ్ ఆడాము.',
          },
        ],
      },
      hi: {
        word: 'खेल',
        question: 'आप कौन से खेल खेलते हैं? आप किसके साथ खेलते हैं?',
        examples: [
          {
            en: 'I play chess with my grandfather every evening.',
            native: 'मैं हर शाम अपने दादा के साथ शतरंज खेलता हूँ।',
          },
          {
            en: 'My little sister likes to play card games.',
            native: 'मेरी छोटी बहन को ताश के खेल खेलना पसंद है।',
          },
          {
            en: 'Yesterday we played a new game on the phone.',
            native: 'कल हमने फ़ोन पर एक नया गेम खेला।',
          },
        ],
      },
      es: {
        word: 'juego',
        question: '¿A qué juegos juegas? ¿Con quién juegas?',
        examples: [
          {
            en: 'I play chess with my grandfather every evening.',
            native: 'Juego al ajedrez con mi abuelo todas las tardes.',
          },
          {
            en: 'My little sister likes to play card games.',
            native: 'A mi hermana pequeña le gusta jugar a juegos de cartas.',
          },
          {
            en: 'Yesterday we played a new game on the phone.',
            native: 'Ayer jugamos a un juego nuevo en el teléfono.',
          },
        ],
      },
      zh: {
        word: '游戏',
        question: '你玩什么游戏？你和谁一起玩？',
        examples: [
          {
            en: 'I play chess with my grandfather every evening.',
            native: '我每天傍晚和爷爷一起下国际象棋。',
          },
          {
            en: 'My little sister likes to play card games.',
            native: '我妹妹喜欢玩纸牌游戏。',
          },
          {
            en: 'Yesterday we played a new game on the phone.',
            native: '昨天我们在手机上玩了一个新游戏。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'book',
    questionText: 'Do you like reading books? Talk about a book you enjoyed.',
    translations: {
      te: {
        word: 'పుస్తకం',
        question: 'మీకు పుస్తకాలు చదవడం ఇష్టమా? మీరు ఆస్వాదించిన ఒక పుస్తకం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I read storybooks before I go to sleep.',
            native: 'నేను నిద్రపోయే ముందు కథా పుస్తకాలు చదువుతాను.',
          },
          {
            en: 'Last month I read a long book about the sea.',
            native: 'గత నెల నేను సముద్రం గురించి ఒక పొడవైన పుస్తకం చదివాను.',
          },
          {
            en: 'I am going to buy a new book this weekend.',
            native: 'ఈ వారాంతంలో నేను ఒక కొత్త పుస్తకం కొనబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'किताब',
        question: 'क्या आपको किताबें पढ़ना पसंद है? किसी पसंद आई किताब के बारे में बताइए।',
        examples: [
          {
            en: 'I read storybooks before I go to sleep.',
            native: 'मैं सोने से पहले कहानियों की किताबें पढ़ता हूँ।',
          },
          {
            en: 'Last month I read a long book about the sea.',
            native: 'पिछले महीने मैंने समुद्र के बारे में एक लंबी किताब पढ़ी।',
          },
          {
            en: 'I am going to buy a new book this weekend.',
            native: 'मैं इस सप्ताहांत एक नई किताब खरीदने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'libro',
        question: '¿Te gusta leer libros? Habla de un libro que disfrutaste.',
        examples: [
          {
            en: 'I read storybooks before I go to sleep.',
            native: 'Leo cuentos antes de dormirme.',
          },
          {
            en: 'Last month I read a long book about the sea.',
            native: 'El mes pasado leí un libro largo sobre el mar.',
          },
          {
            en: 'I am going to buy a new book this weekend.',
            native: 'Voy a comprar un libro nuevo este fin de semana.',
          },
        ],
      },
      zh: {
        word: '书',
        question: '你喜欢读书吗？谈谈你喜欢的一本书。',
        examples: [
          {
            en: 'I read storybooks before I go to sleep.',
            native: '我睡觉前读故事书。',
          },
          {
            en: 'Last month I read a long book about the sea.',
            native: '上个月我读了一本关于大海的书。',
          },
          {
            en: 'I am going to buy a new book this weekend.',
            native: '这个周末我打算买一本新书。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'reading',
    questionText: 'Do you like reading? What do you usually read?',
    translations: {
      te: {
        word: 'చదవడం',
        question: 'మీకు చదవడం ఇష్టమా? మీరు సాధారణంగా ఏమి చదువుతారు?',
        examples: [
          {
            en: 'I like reading the newspaper in the morning.',
            native: 'ఉదయం వార్తాపత్రిక చదవడం నాకు ఇష్టం.',
          },
          {
            en: 'My little sister reads comics on her phone.',
            native: 'నా చిన్న చెల్లెలు తన ఫోన్‌లో కామిక్స్ చదువుతుంది.',
          },
          {
            en: 'Last week I read an interesting story about animals.',
            native: 'గత వారం నేను జంతువుల గురించి ఒక ఆసక్తికరమైన కథ చదివాను.',
          },
        ],
      },
      hi: {
        word: 'पढ़ना',
        question: 'क्या आपको पढ़ना पसंद है? आप आमतौर पर क्या पढ़ते हैं?',
        examples: [
          {
            en: 'I like reading the newspaper in the morning.',
            native: 'मुझे सुबह अख़बार पढ़ना पसंद है।',
          },
          {
            en: 'My little sister reads comics on her phone.',
            native: 'मेरी छोटी बहन अपने फ़ोन पर कॉमिक्स पढ़ती है।',
          },
          {
            en: 'Last week I read an interesting story about animals.',
            native: 'पिछले हफ़्ते मैंने जानवरों के बारे में एक रोचक कहानी पढ़ी।',
          },
        ],
      },
      es: {
        word: 'lectura',
        question: '¿Te gusta leer? ¿Qué sueles leer?',
        examples: [
          {
            en: 'I like reading the newspaper in the morning.',
            native: 'Me gusta leer el periódico por la mañana.',
          },
          {
            en: 'My little sister reads comics on her phone.',
            native: 'Mi hermana pequeña lee cómics en su teléfono.',
          },
          {
            en: 'Last week I read an interesting story about animals.',
            native: 'La semana pasada leí una historia interesante sobre animales.',
          },
        ],
      },
      zh: {
        word: '阅读',
        question: '你喜欢阅读吗？你通常读什么？',
        examples: [
          {
            en: 'I like reading the newspaper in the morning.',
            native: '我喜欢早上读报纸。',
          },
          {
            en: 'My little sister reads comics on her phone.',
            native: '我妹妹在手机上看漫画。',
          },
          {
            en: 'Last week I read an interesting story about animals.',
            native: '上周我读了一个关于动物的有趣故事。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'television',
    questionText: 'How often do you watch television? What programmes do you like?',
    translations: {
      te: {
        word: 'టెలివిజన్',
        question: 'మీరు ఎంత తరచుగా టెలివిజన్ చూస్తారు? మీకు ఏ కార్యక్రమాలు ఇష్టం?',
        examples: [
          {
            en: 'I watch television for an hour after dinner.',
            native: 'నేను రాత్రి భోజనం తర్వాత ఒక గంట టెలివిజన్ చూస్తాను.',
          },
          {
            en: 'My favourite programme is a comedy show on Saturdays.',
            native: 'నా ఇష్టమైన కార్యక్రమం శనివారాల్లో వచ్చే ఒక హాస్య షో.',
          },
          {
            en: 'Yesterday we watched a film together at home.',
            native: 'నిన్న మేము ఇంట్లో కలిసి ఒక సినిమా చూశాము.',
          },
        ],
      },
      hi: {
        word: 'टेलीविज़न',
        question: 'आप कितनी बार टेलीविज़न देखते हैं? आपको कौन से कार्यक्रम पसंद हैं?',
        examples: [
          {
            en: 'I watch television for an hour after dinner.',
            native: 'मैं रात के खाने के बाद एक घंटा टेलीविज़न देखता हूँ।',
          },
          {
            en: 'My favourite programme is a comedy show on Saturdays.',
            native: 'मेरा पसंदीदा कार्यक्रम शनिवार को आने वाला एक कॉमेडी शो है।',
          },
          {
            en: 'Yesterday we watched a film together at home.',
            native: 'कल हमने घर पर साथ मिलकर एक फ़िल्म देखी।',
          },
        ],
      },
      es: {
        word: 'televisión',
        question: '¿Con qué frecuencia ves la televisión? ¿Qué programas te gustan?',
        examples: [
          {
            en: 'I watch television for an hour after dinner.',
            native: 'Veo la televisión una hora después de cenar.',
          },
          {
            en: 'My favourite programme is a comedy show on Saturdays.',
            native: 'Mi programa favorito es un programa de comedia de los sábados.',
          },
          {
            en: 'Yesterday we watched a film together at home.',
            native: 'Ayer vimos una película juntos en casa.',
          },
        ],
      },
      zh: {
        word: '电视',
        question: '你多久看一次电视？你喜欢什么节目？',
        examples: [
          {
            en: 'I watch television for an hour after dinner.',
            native: '我晚饭后看一个小时的电视。',
          },
          {
            en: 'My favourite programme is a comedy show on Saturdays.',
            native: '我最喜欢的节目是星期六播出的一个喜剧节目。',
          },
          {
            en: 'Yesterday we watched a film together at home.',
            native: '昨天我们一起在家看了一部电影。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'phone',
    questionText: 'How do you use your phone every day?',
    translations: {
      te: {
        word: 'ఫోన్',
        question: 'మీరు ప్రతిరోజూ మీ ఫోన్‌ను ఎలా ఉపయోగిస్తారు?',
        examples: [
          {
            en: 'I use my phone to call my mother every day.',
            native: 'నేను ప్రతిరోజూ నా అమ్మకు కాల్ చేయడానికి నా ఫోన్ వాడతాను.',
          },
          {
            en: 'I also take photos and listen to songs.',
            native: 'నేను ఫోటోలు కూడా తీస్తాను, పాటలు కూడా వింటాను.',
          },
          {
            en: 'Yesterday I spoke to my friend for an hour.',
            native: 'నిన్న నేను నా స్నేహితుడితో ఒక గంట మాట్లాడాను.',
          },
        ],
      },
      hi: {
        word: 'फ़ोन',
        question: 'आप रोज़ अपना फ़ोन कैसे इस्तेमाल करते हैं?',
        examples: [
          {
            en: 'I use my phone to call my mother every day.',
            native: 'मैं रोज़ अपनी माँ को फ़ोन करने के लिए अपना फ़ोन इस्तेमाल करता हूँ।',
          },
          {
            en: 'I also take photos and listen to songs.',
            native: 'मैं तस्वीरें भी लेता हूँ और गाने भी सुनता हूँ।',
          },
          {
            en: 'Yesterday I spoke to my friend for an hour.',
            native: 'कल मैंने अपने दोस्त से एक घंटा बात की।',
          },
        ],
      },
      es: {
        word: 'teléfono',
        question: '¿Cómo usas tu teléfono todos los días?',
        examples: [
          {
            en: 'I use my phone to call my mother every day.',
            native: 'Uso mi teléfono para llamar a mi madre todos los días.',
          },
          {
            en: 'I also take photos and listen to songs.',
            native: 'También hago fotos y escucho canciones.',
          },
          {
            en: 'Yesterday I spoke to my friend for an hour.',
            native: 'Ayer hablé con mi amigo durante una hora.',
          },
        ],
      },
      zh: {
        word: '手机',
        question: '你每天怎么使用手机？',
        examples: [
          {
            en: 'I use my phone to call my mother every day.',
            native: '我每天用手机给妈妈打电话。',
          },
          {
            en: 'I also take photos and listen to songs.',
            native: '我还用它拍照、听歌。',
          },
          {
            en: 'Yesterday I spoke to my friend for an hour.',
            native: '昨天我和朋友聊了一个小时。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'computer',
    questionText: 'Do you use a computer? What do you do with it?',
    translations: {
      te: {
        word: 'కంప్యూటర్',
        question: 'మీరు కంప్యూటర్ వాడతారా? మీరు దానితో ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I use a computer at work every day.',
            native: 'నేను పనిలో ప్రతిరోజూ కంప్యూటర్ వాడతాను.',
          },
          {
            en: 'At home, I watch videos and write emails.',
            native: 'ఇంట్లో, నేను వీడియోలు చూస్తాను, ఇమెయిల్స్ రాస్తాను.',
          },
          {
            en: 'I am going to buy a new laptop next month.',
            native: 'వచ్చే నెల నేను ఒక కొత్త ల్యాప్‌టాప్ కొనబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'कंप्यूटर',
        question: 'क्या आप कंप्यूटर इस्तेमाल करते हैं? आप उससे क्या करते हैं?',
        examples: [
          {
            en: 'I use a computer at work every day.',
            native: 'मैं काम पर रोज़ कंप्यूटर इस्तेमाल करता हूँ।',
          },
          {
            en: 'At home, I watch videos and write emails.',
            native: 'घर पर, मैं वीडियो देखता हूँ और ईमेल लिखता हूँ।',
          },
          {
            en: 'I am going to buy a new laptop next month.',
            native: 'मैं अगले महीने एक नया लैपटॉप खरीदने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'computadora',
        question: '¿Usas una computadora? ¿Qué haces con ella?',
        examples: [
          {
            en: 'I use a computer at work every day.',
            native: 'Uso una computadora en el trabajo todos los días.',
          },
          {
            en: 'At home, I watch videos and write emails.',
            native: 'En casa, veo vídeos y escribo correos.',
          },
          {
            en: 'I am going to buy a new laptop next month.',
            native: 'Voy a comprar un portátil nuevo el mes que viene.',
          },
        ],
      },
      zh: {
        word: '电脑',
        question: '你使用电脑吗？你用它做什么？',
        examples: [
          {
            en: 'I use a computer at work every day.',
            native: '我上班每天都用电脑。',
          },
          {
            en: 'At home, I watch videos and write emails.',
            native: '在家里，我看视频、写邮件。',
          },
          {
            en: 'I am going to buy a new laptop next month.',
            native: '下个月我打算买一台新笔记本电脑。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'internet',
    questionText: 'How often do you use the internet? What do you do online?',
    translations: {
      te: {
        word: 'ఇంటర్నెట్',
        question: 'మీరు ఎంత తరచుగా ఇంటర్నెట్ వాడతారు? మీరు ఆన్‌లైన్‌లో ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I use the internet every evening at home.',
            native: 'నేను ప్రతి సాయంత్రం ఇంట్లో ఇంటర్నెట్ వాడతాను.',
          },
          {
            en: 'I watch videos and talk to my friends online.',
            native: 'నేను ఆన్‌లైన్‌లో వీడియోలు చూస్తాను, నా స్నేహితులతో మాట్లాడతాను.',
          },
          {
            en: 'Yesterday I bought a shirt on the internet.',
            native: 'నిన్న నేను ఇంటర్నెట్‌లో ఒక చొక్కా కొన్నాను.',
          },
        ],
      },
      hi: {
        word: 'इंटरनेट',
        question: 'आप कितनी बार इंटरनेट इस्तेमाल करते हैं? आप ऑनलाइन क्या करते हैं?',
        examples: [
          {
            en: 'I use the internet every evening at home.',
            native: 'मैं हर शाम घर पर इंटरनेट इस्तेमाल करता हूँ।',
          },
          {
            en: 'I watch videos and talk to my friends online.',
            native: 'मैं ऑनलाइन वीडियो देखता हूँ और अपने दोस्तों से बात करता हूँ।',
          },
          {
            en: 'Yesterday I bought a shirt on the internet.',
            native: 'कल मैंने इंटरनेट पर एक कमीज़ खरीदी।',
          },
        ],
      },
      es: {
        word: 'internet',
        question: '¿Con qué frecuencia usas internet? ¿Qué haces en línea?',
        examples: [
          {
            en: 'I use the internet every evening at home.',
            native: 'Uso internet todas las tardes en casa.',
          },
          {
            en: 'I watch videos and talk to my friends online.',
            native: 'Veo vídeos y hablo con mis amigos en línea.',
          },
          {
            en: 'Yesterday I bought a shirt on the internet.',
            native: 'Ayer compré una camisa por internet.',
          },
        ],
      },
      zh: {
        word: '互联网',
        question: '你多久上一次网？你在网上做什么？',
        examples: [
          {
            en: 'I use the internet every evening at home.',
            native: '我每天傍晚在家上网。',
          },
          {
            en: 'I watch videos and talk to my friends online.',
            native: '我在网上看视频、和朋友聊天。',
          },
          {
            en: 'Yesterday I bought a shirt on the internet.',
            native: '昨天我在网上买了一件衬衫。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'photo',
    questionText: 'Do you like taking photos? Talk about a photo you like.',
    translations: {
      te: {
        word: 'ఫోటో',
        question: 'మీకు ఫోటోలు తీయడం ఇష్టమా? మీకు నచ్చిన ఒక ఫోటో గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I like taking photos of flowers and birds.',
            native: 'నాకు పువ్వులు, పక్షుల ఫోటోలు తీయడం ఇష్టం.',
          },
          {
            en: "My favourite photo is from my sister's wedding.",
            native: 'నా ఇష్టమైన ఫోటో నా అక్కయ్య పెళ్ళిలో తీసినది.',
          },
          {
            en: 'Last week I took photos at the beach.',
            native: 'గత వారం నేను బీచ్‌లో ఫోటోలు తీశాను.',
          },
        ],
      },
      hi: {
        word: 'तस्वीर',
        question: 'क्या आपको तस्वीरें लेना पसंद है? किसी पसंदीदा तस्वीर के बारे में बताइए।',
        examples: [
          {
            en: 'I like taking photos of flowers and birds.',
            native: 'मुझे फूलों और पक्षियों की तस्वीरें लेना पसंद है।',
          },
          {
            en: "My favourite photo is from my sister's wedding.",
            native: 'मेरी पसंदीदा तस्वीर मेरी बहन की शादी की है।',
          },
          {
            en: 'Last week I took photos at the beach.',
            native: 'पिछले हफ़्ते मैंने समुद्र तट पर तस्वीरें लीं।',
          },
        ],
      },
      es: {
        word: 'foto',
        question: '¿Te gusta hacer fotos? Habla de una foto que te gusta.',
        examples: [
          {
            en: 'I like taking photos of flowers and birds.',
            native: 'Me gusta hacer fotos de flores y pájaros.',
          },
          {
            en: "My favourite photo is from my sister's wedding.",
            native: 'Mi foto favorita es de la boda de mi hermana.',
          },
          {
            en: 'Last week I took photos at the beach.',
            native: 'La semana pasada hice fotos en la playa.',
          },
        ],
      },
      zh: {
        word: '照片',
        question: '你喜欢拍照吗？谈谈你喜欢的一张照片。',
        examples: [
          {
            en: 'I like taking photos of flowers and birds.',
            native: '我喜欢拍花和鸟的照片。',
          },
          {
            en: "My favourite photo is from my sister's wedding.",
            native: '我最喜欢的照片是在我姐姐的婚礼上拍的。',
          },
          {
            en: 'Last week I took photos at the beach.',
            native: '上周我在海滩拍了照片。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'garden',
    questionText: 'Do you have a garden? What grows there?',
    translations: {
      te: {
        word: 'తోట',
        question: 'మీకు తోట ఉందా? అక్కడ ఏమి పెరుగుతాయి?',
        examples: [
          {
            en: 'We have a small garden behind our house.',
            native: 'మా ఇంటి వెనుక ఒక చిన్న తోట ఉంది.',
          },
          {
            en: 'My grandmother grows tomatoes and green beans there.',
            native: 'నా అమ్మమ్మ అక్కడ టమాటాలు, గ్రీన్ బీన్స్ పెంచుతుంది.',
          },
          {
            en: 'In spring, many colourful flowers open in our garden.',
            native: 'వసంతకాలంలో, మా తోటలో చాలా రంగురంగుల పువ్వులు వికసిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'बगीचा',
        question: 'क्या आपके पास बगीचा है? वहाँ क्या उगता है?',
        examples: [
          {
            en: 'We have a small garden behind our house.',
            native: 'हमारे घर के पीछे एक छोटा बगीचा है।',
          },
          {
            en: 'My grandmother grows tomatoes and green beans there.',
            native: 'मेरी दादी वहाँ टमाटर और हरी बीन्स उगाती हैं।',
          },
          {
            en: 'In spring, many colourful flowers open in our garden.',
            native: 'वसंत में, हमारे बगीचे में कई रंगीन फूल खिलते हैं।',
          },
        ],
      },
      es: {
        word: 'jardín',
        question: '¿Tienes jardín? ¿Qué crece allí?',
        examples: [
          {
            en: 'We have a small garden behind our house.',
            native: 'Tenemos un pequeño jardín detrás de nuestra casa.',
          },
          {
            en: 'My grandmother grows tomatoes and green beans there.',
            native: 'Mi abuela cultiva tomates y judías verdes allí.',
          },
          {
            en: 'In spring, many colourful flowers open in our garden.',
            native: 'En primavera, muchas flores de colores se abren en nuestro jardín.',
          },
        ],
      },
      zh: {
        word: '花园',
        question: '你有花园吗？那里种了什么？',
        examples: [
          {
            en: 'We have a small garden behind our house.',
            native: '我们房子后面有一个小花园。',
          },
          {
            en: 'My grandmother grows tomatoes and green beans there.',
            native: '我奶奶在那里种西红柿和青豆。',
          },
          {
            en: 'In spring, many colourful flowers open in our garden.',
            native: '春天，我们花园里开出许多五颜六色的花。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'flower',
    questionText: 'What is your favourite flower? Do you grow flowers?',
    translations: {
      te: {
        word: 'పువ్వు',
        question: 'మీ ఇష్టమైన పువ్వు ఏది? మీరు పువ్వులు పెంచుతారా?',
        examples: [
          {
            en: 'My favourite flower is the bright yellow sunflower.',
            native: 'నా ఇష్టమైన పువ్వు ప్రకాశవంతమైన పసుపు పొద్దుతిరుగుడు పువ్వు.',
          },
          {
            en: 'My mother grows roses in front of our house.',
            native: 'మా అమ్మ మా ఇంటి ముందు గులాబీలు పెంచుతుంది.',
          },
          {
            en: 'I gave my teacher some flowers on her birthday.',
            native: 'నేను నా టీచర్ పుట్టినరోజున ఆమెకు కొన్ని పువ్వులు ఇచ్చాను.',
          },
        ],
      },
      hi: {
        word: 'फूल',
        question: 'आपका पसंदीदा फूल कौन सा है? क्या आप फूल उगाते हैं?',
        examples: [
          {
            en: 'My favourite flower is the bright yellow sunflower.',
            native: 'मेरा पसंदीदा फूल चमकीला पीला सूरजमुखी है।',
          },
          {
            en: 'My mother grows roses in front of our house.',
            native: 'मेरी माँ हमारे घर के सामने गुलाब उगाती है।',
          },
          {
            en: 'I gave my teacher some flowers on her birthday.',
            native: 'मैंने अपनी टीचर के जन्मदिन पर उन्हें कुछ फूल दिए।',
          },
        ],
      },
      es: {
        word: 'flor',
        question: '¿Cuál es tu flor favorita? ¿Cultivas flores?',
        examples: [
          {
            en: 'My favourite flower is the bright yellow sunflower.',
            native: 'Mi flor favorita es el brillante girasol amarillo.',
          },
          {
            en: 'My mother grows roses in front of our house.',
            native: 'Mi madre cultiva rosas delante de nuestra casa.',
          },
          {
            en: 'I gave my teacher some flowers on her birthday.',
            native: 'Le regalé unas flores a mi maestra en su cumpleaños.',
          },
        ],
      },
      zh: {
        word: '花',
        question: '你最喜欢的花是什么？你种花吗？',
        examples: [
          {
            en: 'My favourite flower is the bright yellow sunflower.',
            native: '我最喜欢的花是鲜艳的黄色向日葵。',
          },
          {
            en: 'My mother grows roses in front of our house.',
            native: '我妈妈在我们家门前种玫瑰。',
          },
          {
            en: 'I gave my teacher some flowers on her birthday.',
            native: '老师生日那天我送了她一些花。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'park',
    questionText: 'Is there a park near your home? What do you do there?',
    translations: {
      te: {
        word: 'పార్క్',
        question: 'మీ ఇంటి దగ్గర పార్క్ ఉందా? మీరు అక్కడ ఏమి చేస్తారు?',
        examples: [
          {
            en: 'There is a big park near my house.',
            native: 'మా ఇంటి దగ్గర ఒక పెద్ద పార్క్ ఉంది.',
          },
          {
            en: 'I walk there with my dog every morning.',
            native: 'నేను ప్రతి ఉదయం నా కుక్కతో అక్కడ నడుస్తాను.',
          },
          {
            en: 'Children play football in the park on Sundays.',
            native: 'ఆదివారాల్లో పిల్లలు పార్కులో ఫుట్‌బాల్ ఆడతారు.',
          },
        ],
      },
      hi: {
        word: 'पार्क',
        question: 'क्या आपके घर के पास कोई पार्क है? आप वहाँ क्या करते हैं?',
        examples: [
          {
            en: 'There is a big park near my house.',
            native: 'मेरे घर के पास एक बड़ा पार्क है।',
          },
          {
            en: 'I walk there with my dog every morning.',
            native: 'मैं हर सुबह अपने कुत्ते के साथ वहाँ घूमता हूँ।',
          },
          {
            en: 'Children play football in the park on Sundays.',
            native: 'रविवार को बच्चे पार्क में फ़ुटबॉल खेलते हैं।',
          },
        ],
      },
      es: {
        word: 'parque',
        question: '¿Hay un parque cerca de tu casa? ¿Qué haces allí?',
        examples: [
          {
            en: 'There is a big park near my house.',
            native: 'Hay un parque grande cerca de mi casa.',
          },
          {
            en: 'I walk there with my dog every morning.',
            native: 'Paseo allí con mi perro todas las mañanas.',
          },
          {
            en: 'Children play football in the park on Sundays.',
            native: 'Los niños juegan al fútbol en el parque los domingos.',
          },
        ],
      },
      zh: {
        word: '公园',
        question: '你家附近有公园吗？你在那里做什么？',
        examples: [
          {
            en: 'There is a big park near my house.',
            native: '我家附近有一个大公园。',
          },
          {
            en: 'I walk there with my dog every morning.',
            native: '我每天早上带着我的狗在那里散步。',
          },
          {
            en: 'Children play football in the park on Sundays.',
            native: '星期天孩子们在公园里踢足球。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'beach',
    questionText: 'Do you like the beach? Talk about a day at the beach.',
    translations: {
      te: {
        word: 'బీచ్',
        question: 'మీకు బీచ్ ఇష్టమా? బీచ్‌లో గడిపిన ఒక రోజు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I love walking on the sand in the evening.',
            native: 'సాయంత్రం ఇసుకపై నడవడం నాకు చాలా ఇష్టం.',
          },
          {
            en: 'Last year we spent a whole day at the beach.',
            native: 'గత సంవత్సరం మేము బీచ్‌లో మొత్తం రోజు గడిపాము.',
          },
          {
            en: 'I am going to visit the beach again this summer.',
            native: 'ఈ వేసవిలో నేను మళ్ళీ బీచ్‌ను సందర్శించబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'समुद्र तट',
        question: 'क्या आपको समुद्र तट पसंद है? समुद्र तट पर बिताए एक दिन के बारे में बताइए।',
        examples: [
          {
            en: 'I love walking on the sand in the evening.',
            native: 'मुझे शाम को रेत पर घूमना बहुत पसंद है।',
          },
          {
            en: 'Last year we spent a whole day at the beach.',
            native: 'पिछले साल हमने समुद्र तट पर पूरा दिन बिताया।',
          },
          {
            en: 'I am going to visit the beach again this summer.',
            native: 'मैं इस गर्मी में फिर से समुद्र तट जाने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'playa',
        question: '¿Te gusta la playa? Habla de un día en la playa.',
        examples: [
          {
            en: 'I love walking on the sand in the evening.',
            native: 'Me encanta caminar por la arena por la tarde.',
          },
          {
            en: 'Last year we spent a whole day at the beach.',
            native: 'El año pasado pasamos un día entero en la playa.',
          },
          {
            en: 'I am going to visit the beach again this summer.',
            native: 'Voy a visitar la playa otra vez este verano.',
          },
        ],
      },
      zh: {
        word: '海滩',
        question: '你喜欢海滩吗？谈谈在海滩度过的一天。',
        examples: [
          {
            en: 'I love walking on the sand in the evening.',
            native: '我喜欢傍晚在沙滩上散步。',
          },
          {
            en: 'Last year we spent a whole day at the beach.',
            native: '去年我们在海滩上玩了一整天。',
          },
          {
            en: 'I am going to visit the beach again this summer.',
            native: '今年夏天我打算再去一次海滩。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'rain',
    questionText: 'Do you like rain? What do you do on rainy days?',
    translations: {
      te: {
        word: 'వర్షం',
        question: 'మీకు వర్షం ఇష్టమా? వర్షం పడే రోజుల్లో మీరు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I like sitting near the window when it rains.',
            native: 'వర్షం పడినప్పుడు కిటికీ దగ్గర కూర్చోవడం నాకు ఇష్టం.',
          },
          {
            en: 'On rainy days I drink hot tea at home.',
            native: 'వర్షం పడే రోజుల్లో నేను ఇంట్లో వేడి టీ తాగుతాను.',
          },
          {
            en: 'Yesterday it rained, so I stayed at home.',
            native: 'నిన్న వర్షం పడింది, కాబట్టి నేను ఇంట్లోనే ఉండిపోయాను.',
          },
        ],
      },
      hi: {
        word: 'बारिश',
        question: 'क्या आपको बारिश पसंद है? बारिश के दिनों में आप क्या करते हैं?',
        examples: [
          {
            en: 'I like sitting near the window when it rains.',
            native: 'बारिश होने पर मुझे खिड़की के पास बैठना पसंद है।',
          },
          {
            en: 'On rainy days I drink hot tea at home.',
            native: 'बारिश के दिनों में मैं घर पर गर्म चाय पीता हूँ।',
          },
          {
            en: 'Yesterday it rained, so I stayed at home.',
            native: 'कल बारिश हुई, इसलिए मैं घर पर ही रहा।',
          },
        ],
      },
      es: {
        word: 'lluvia',
        question: '¿Te gusta la lluvia? ¿Qué haces en los días de lluvia?',
        examples: [
          {
            en: 'I like sitting near the window when it rains.',
            native: 'Me gusta sentarme junto a la ventana cuando llueve.',
          },
          {
            en: 'On rainy days I drink hot tea at home.',
            native: 'En los días de lluvia tomo té caliente en casa.',
          },
          {
            en: 'Yesterday it rained, so I stayed at home.',
            native: 'Ayer llovió, así que me quedé en casa.',
          },
        ],
      },
      zh: {
        word: '雨',
        question: '你喜欢下雨吗？下雨天你做什么？',
        examples: [
          {
            en: 'I like sitting near the window when it rains.',
            native: '下雨时我喜欢坐在窗边。',
          },
          {
            en: 'On rainy days I drink hot tea at home.',
            native: '下雨天我在家喝热茶。',
          },
          {
            en: 'Yesterday it rained, so I stayed at home.',
            native: '昨天下了雨，所以我待在家里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'snow',
    questionText: 'Have you ever seen snow? Talk about it.',
    translations: {
      te: {
        word: 'మంచు',
        question: 'మీరు ఎప్పుడైనా మంచు చూశారా? దాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I saw snow for the first time last winter.',
            native: 'గత శీతాకాలంలో నేను మొదటిసారి మంచు చూశాను.',
          },
          {
            en: 'The children made a small snowman in the garden.',
            native: 'పిల్లలు తోటలో ఒక చిన్న మంచు మనిషిని చేశారు.',
          },
          {
            en: 'It was very cold, but we were happy.',
            native: 'చాలా చల్లగా ఉంది, కానీ మేము సంతోషంగా ఉన్నాము.',
          },
        ],
      },
      hi: {
        word: 'बर्फ़',
        question: 'क्या आपने कभी बर्फ़ देखी है? इसके बारे में बताइए।',
        examples: [
          {
            en: 'I saw snow for the first time last winter.',
            native: 'पिछली सर्दी में मैंने पहली बार बर्फ़ देखी।',
          },
          {
            en: 'The children made a small snowman in the garden.',
            native: 'बच्चों ने बगीचे में एक छोटा स्नोमैन बनाया।',
          },
          {
            en: 'It was very cold, but we were happy.',
            native: 'बहुत ठंड थी, लेकिन हम खुश थे।',
          },
        ],
      },
      es: {
        word: 'nieve',
        question: '¿Has visto la nieve alguna vez? Háblame de ello.',
        examples: [
          {
            en: 'I saw snow for the first time last winter.',
            native: 'Vi nieve por primera vez el invierno pasado.',
          },
          {
            en: 'The children made a small snowman in the garden.',
            native: 'Los niños hicieron un pequeño muñeco de nieve en el jardín.',
          },
          {
            en: 'It was very cold, but we were happy.',
            native: 'Hacía mucho frío, pero estábamos felices.',
          },
        ],
      },
      zh: {
        word: '雪',
        question: '你见过雪吗？谈谈你的经历。',
        examples: [
          {
            en: 'I saw snow for the first time last winter.',
            native: '去年冬天我第一次见到了雪。',
          },
          {
            en: 'The children made a small snowman in the garden.',
            native: '孩子们在花园里堆了一个小雪人。',
          },
          {
            en: 'It was very cold, but we were happy.',
            native: '天气很冷，但我们很开心。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'summer',
    questionText: 'What do you do in summer? Do you like hot weather?',
    translations: {
      te: {
        word: 'వేసవి',
        question: 'వేసవిలో మీరు ఏమి చేస్తారు? మీకు వేడి వాతావరణం ఇష్టమా?',
        examples: [
          {
            en: 'In summer I eat mangoes and drink cold juice.',
            native: 'వేసవిలో నేను మామిడి పండ్లు తింటాను, చల్లటి జ్యూస్ తాగుతాను.',
          },
          {
            en: 'We often visit our grandparents in the village.',
            native: 'మేము తరచుగా ఊరిలో మా తాతయ్య, అమ్మమ్మను కలుస్తాము.',
          },
          {
            en: 'Last summer I learned to swim in the river.',
            native: 'గత వేసవిలో నేను నదిలో ఈత నేర్చుకున్నాను.',
          },
        ],
      },
      hi: {
        word: 'गर्मी',
        question: 'गर्मियों में आप क्या करते हैं? क्या आपको गर्म मौसम पसंद है?',
        examples: [
          {
            en: 'In summer I eat mangoes and drink cold juice.',
            native: 'गर्मियों में मैं आम खाता हूँ और ठंडा जूस पीता हूँ।',
          },
          {
            en: 'We often visit our grandparents in the village.',
            native: 'हम अक्सर गाँव में अपने दादा-दादी से मिलने जाते हैं।',
          },
          {
            en: 'Last summer I learned to swim in the river.',
            native: 'पिछली गर्मी में मैंने नदी में तैरना सीखा।',
          },
        ],
      },
      es: {
        word: 'verano',
        question: '¿Qué haces en verano? ¿Te gusta el calor?',
        examples: [
          {
            en: 'In summer I eat mangoes and drink cold juice.',
            native: 'En verano como mangos y bebo jugo frío.',
          },
          {
            en: 'We often visit our grandparents in the village.',
            native: 'A menudo visitamos a nuestros abuelos en el pueblo.',
          },
          {
            en: 'Last summer I learned to swim in the river.',
            native: 'El verano pasado aprendí a nadar en el río.',
          },
        ],
      },
      zh: {
        word: '夏天',
        question: '夏天你做什么？你喜欢炎热的天气吗？',
        examples: [
          {
            en: 'In summer I eat mangoes and drink cold juice.',
            native: '夏天我吃芒果，喝冰镇果汁。',
          },
          {
            en: 'We often visit our grandparents in the village.',
            native: '我们经常去村里看望爷爷奶奶。',
          },
          {
            en: 'Last summer I learned to swim in the river.',
            native: '去年夏天我在河里学会了游泳。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'winter',
    questionText: 'What is winter like in your town? What do you wear?',
    translations: {
      te: {
        word: 'శీతాకాలం',
        question: 'మీ పట్టణంలో శీతాకాలం ఎలా ఉంటుంది? మీరు ఏమి ధరిస్తారు?',
        examples: [
          {
            en: 'Winter in my town is cold and foggy.',
            native: 'మా పట్టణంలో శీతాకాలం చల్లగా, పొగమంచుతో ఉంటుంది.',
          },
          {
            en: 'I wear a warm coat and a woollen hat.',
            native: 'నేను వెచ్చని కోటు, ఉన్ని టోపీ ధరిస్తాను.',
          },
          {
            en: 'Last winter we sat near the fire every evening.',
            native: 'గత శీతాకాలంలో మేము ప్రతి సాయంత్రం మంట దగ్గర కూర్చునేవాళ్ళం.',
          },
        ],
      },
      hi: {
        word: 'सर्दी',
        question: 'आपके शहर में सर्दी कैसी होती है? आप क्या पहनते हैं?',
        examples: [
          {
            en: 'Winter in my town is cold and foggy.',
            native: 'मेरे शहर में सर्दी ठंडी और कोहरे वाली होती है।',
          },
          {
            en: 'I wear a warm coat and a woollen hat.',
            native: 'मैं गर्म कोट और ऊनी टोपी पहनता हूँ।',
          },
          {
            en: 'Last winter we sat near the fire every evening.',
            native: 'पिछली सर्दी में हम हर शाम आग के पास बैठते थे।',
          },
        ],
      },
      es: {
        word: 'invierno',
        question: '¿Cómo es el invierno en tu ciudad? ¿Qué ropa llevas?',
        examples: [
          {
            en: 'Winter in my town is cold and foggy.',
            native: 'El invierno en mi ciudad es frío y con niebla.',
          },
          {
            en: 'I wear a warm coat and a woollen hat.',
            native: 'Llevo un abrigo caliente y un gorro de lana.',
          },
          {
            en: 'Last winter we sat near the fire every evening.',
            native: 'El invierno pasado nos sentábamos junto al fuego todas las tardes.',
          },
        ],
      },
      zh: {
        word: '冬天',
        question: '你所在城市的冬天是什么样的？你穿什么？',
        examples: [
          {
            en: 'Winter in my town is cold and foggy.',
            native: '我城市的冬天又冷又多雾。',
          },
          {
            en: 'I wear a warm coat and a woollen hat.',
            native: '我穿暖和的大衣，戴毛线帽。',
          },
          {
            en: 'Last winter we sat near the fire every evening.',
            native: '去年冬天我们每天傍晚都围坐在火炉旁。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'morning',
    questionText: 'What do you usually do in the morning?',
    translations: {
      te: {
        word: 'ఉదయం',
        question: 'మీరు సాధారణంగా ఉదయం ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I wake up at six and drink warm water.',
            native: 'నేను ఆరు గంటలకు మేల్కొని గోరువెచ్చని నీరు తాగుతాను.',
          },
          {
            en: 'Then I take a walk near my house.',
            native: 'తర్వాత నేను మా ఇంటి దగ్గర నడుస్తాను.',
          },
          {
            en: 'This morning I ate bread and drank tea.',
            native: 'ఈ ఉదయం నేను బ్రెడ్ తిన్నాను, టీ తాగాను.',
          },
        ],
      },
      hi: {
        word: 'सुबह',
        question: 'आप सुबह आमतौर पर क्या करते हैं?',
        examples: [
          {
            en: 'I wake up at six and drink warm water.',
            native: 'मैं छह बजे उठता हूँ और गुनगुना पानी पीता हूँ।',
          },
          {
            en: 'Then I take a walk near my house.',
            native: 'फिर मैं अपने घर के पास घूमने जाता हूँ।',
          },
          {
            en: 'This morning I ate bread and drank tea.',
            native: 'आज सुबह मैंने ब्रेड खाई और चाय पी।',
          },
        ],
      },
      es: {
        word: 'mañana',
        question: '¿Qué sueles hacer por la mañana?',
        examples: [
          {
            en: 'I wake up at six and drink warm water.',
            native: 'Me despierto a las seis y bebo agua tibia.',
          },
          {
            en: 'Then I take a walk near my house.',
            native: 'Luego paseo cerca de mi casa.',
          },
          {
            en: 'This morning I ate bread and drank tea.',
            native: 'Esta mañana comí pan y bebí té.',
          },
        ],
      },
      zh: {
        word: '早晨',
        question: '你早上通常做什么？',
        examples: [
          {
            en: 'I wake up at six and drink warm water.',
            native: '我六点起床，喝一杯温水。',
          },
          {
            en: 'Then I take a walk near my house.',
            native: '然后我在家附近散步。',
          },
          {
            en: 'This morning I ate bread and drank tea.',
            native: '今天早上我吃了面包，喝了茶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'evening',
    questionText: 'What do you usually do in the evening?',
    translations: {
      te: {
        word: 'సాయంత్రం',
        question: 'మీరు సాధారణంగా సాయంత్రం ఏమి చేస్తారు?',
        examples: [
          {
            en: 'In the evening I finish my work and rest.',
            native: 'సాయంత్రం నేను నా పనిని ముగించి విశ్రాంతి తీసుకుంటాను.',
          },
          {
            en: 'I watch television with my family after dinner.',
            native: 'రాత్రి భోజనం తర్వాత నా కుటుంబంతో టెలివిజన్ చూస్తాను.',
          },
          {
            en: 'Yesterday evening I met my old friend in town.',
            native: 'నిన్న సాయంత్రం నేను పట్టణంలో నా పాత స్నేహితుడిని కలిశాను.',
          },
        ],
      },
      hi: {
        word: 'शाम',
        question: 'आप शाम को आमतौर पर क्या करते हैं?',
        examples: [
          {
            en: 'In the evening I finish my work and rest.',
            native: 'शाम को मैं अपना काम ख़त्म करके आराम करता हूँ।',
          },
          {
            en: 'I watch television with my family after dinner.',
            native: 'रात के खाने के बाद मैं अपने परिवार के साथ टेलीविज़न देखता हूँ।',
          },
          {
            en: 'Yesterday evening I met my old friend in town.',
            native: 'कल शाम मैं शहर में अपने पुराने दोस्त से मिला।',
          },
        ],
      },
      es: {
        word: 'tarde',
        question: '¿Qué sueles hacer por la tarde?',
        examples: [
          {
            en: 'In the evening I finish my work and rest.',
            native: 'Por la tarde termino mi trabajo y descanso.',
          },
          {
            en: 'I watch television with my family after dinner.',
            native: 'Veo la televisión con mi familia después de cenar.',
          },
          {
            en: 'Yesterday evening I met my old friend in town.',
            native: 'Ayer por la tarde me encontré con mi viejo amigo en la ciudad.',
          },
        ],
      },
      zh: {
        word: '傍晚',
        question: '你傍晚通常做什么？',
        examples: [
          {
            en: 'In the evening I finish my work and rest.',
            native: '傍晚我完成工作，然后休息。',
          },
          {
            en: 'I watch television with my family after dinner.',
            native: '晚饭后我和家人一起看电视。',
          },
          {
            en: 'Yesterday evening I met my old friend in town.',
            native: '昨天傍晚我在城里见到了一位老朋友。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'sleep',
    questionText: 'How many hours do you sleep? Do you sleep well?',
    translations: {
      te: {
        word: 'నిద్ర',
        question: 'మీరు ఎన్ని గంటలు నిద్రపోతారు? మీకు నిద్ర బాగా పడుతుందా?',
        examples: [
          {
            en: 'I usually sleep for eight hours every night.',
            native: 'నేను సాధారణంగా ప్రతి రాత్రి ఎనిమిది గంటలు నిద్రపోతాను.',
          },
          {
            en: 'I go to bed at ten and wake at six.',
            native: 'నేను పది గంటలకు పడుకుంటాను, ఆరు గంటలకు మేల్కొంటాను.',
          },
          {
            en: 'Last night I slept badly because it was hot.',
            native: 'నిన్న రాత్రి వేడిగా ఉండడంతో నాకు నిద్ర బాగా పట్టలేదు.',
          },
        ],
      },
      hi: {
        word: 'नींद',
        question: 'आप कितने घंटे सोते हैं? क्या आपकी नींद अच्छी आती है?',
        examples: [
          {
            en: 'I usually sleep for eight hours every night.',
            native: 'मैं आमतौर पर हर रात आठ घंटे सोता हूँ।',
          },
          {
            en: 'I go to bed at ten and wake at six.',
            native: 'मैं दस बजे सोता हूँ और छह बजे उठता हूँ।',
          },
          {
            en: 'Last night I slept badly because it was hot.',
            native: 'कल रात गर्मी के कारण मेरी नींद ख़राब रही।',
          },
        ],
      },
      es: {
        word: 'sueño',
        question: '¿Cuántas horas duermes? ¿Duermes bien?',
        examples: [
          {
            en: 'I usually sleep for eight hours every night.',
            native: 'Normalmente duermo ocho horas cada noche.',
          },
          {
            en: 'I go to bed at ten and wake at six.',
            native: 'Me acuesto a las diez y me despierto a las seis.',
          },
          {
            en: 'Last night I slept badly because it was hot.',
            native: 'Anoche dormí mal porque hacía calor.',
          },
        ],
      },
      zh: {
        word: '睡眠',
        question: '你睡几个小时？你睡得好吗？',
        examples: [
          {
            en: 'I usually sleep for eight hours every night.',
            native: '我通常每晚睡八个小时。',
          },
          {
            en: 'I go to bed at ten and wake at six.',
            native: '我十点睡觉，六点起床。',
          },
          {
            en: 'Last night I slept badly because it was hot.',
            native: '昨晚因为天热，我没睡好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'clothes',
    questionText: 'What clothes do you like to wear? Talk about your favourite clothes.',
    translations: {
      te: {
        word: 'బట్టలు',
        question: 'మీరు ఏ బట్టలు ధరించడం ఇష్టపడతారు? మీ ఇష్టమైన బట్టల గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I like wearing simple cotton clothes in summer.',
            native: 'వేసవిలో సరళమైన పత్తి బట్టలు ధరించడం నాకు ఇష్టం.',
          },
          {
            en: 'My favourite shirt is light blue and white.',
            native: 'నా ఇష్టమైన చొక్కా లేత నీలం మరియు తెలుపు రంగులో ఉంటుంది.',
          },
          {
            en: 'Last week I bought a new jacket for winter.',
            native: 'గత వారం నేను శీతాకాలం కోసం ఒక కొత్త జాకెట్ కొన్నాను.',
          },
        ],
      },
      hi: {
        word: 'कपड़े',
        question: 'आप कैसे कपड़े पहनना पसंद करते हैं? अपने पसंदीदा कपड़ों के बारे में बताइए।',
        examples: [
          {
            en: 'I like wearing simple cotton clothes in summer.',
            native: 'मुझे गर्मियों में सादे सूती कपड़े पहनना पसंद है।',
          },
          {
            en: 'My favourite shirt is light blue and white.',
            native: 'मेरी पसंदीदा कमीज़ हल्के नीले और सफ़ेद रंग की है।',
          },
          {
            en: 'Last week I bought a new jacket for winter.',
            native: 'पिछले हफ़्ते मैंने सर्दियों के लिए एक नई जैकेट खरीदी।',
          },
        ],
      },
      es: {
        word: 'ropa',
        question: '¿Qué ropa te gusta llevar? Habla de tu ropa favorita.',
        examples: [
          {
            en: 'I like wearing simple cotton clothes in summer.',
            native: 'Me gusta llevar ropa sencilla de algodón en verano.',
          },
          {
            en: 'My favourite shirt is light blue and white.',
            native: 'Mi camisa favorita es azul claro y blanca.',
          },
          {
            en: 'Last week I bought a new jacket for winter.',
            native: 'La semana pasada compré una chaqueta nueva para el invierno.',
          },
        ],
      },
      zh: {
        word: '衣服',
        question: '你喜欢穿什么样的衣服？谈谈你最喜欢的衣服。',
        examples: [
          {
            en: 'I like wearing simple cotton clothes in summer.',
            native: '夏天我喜欢穿简单的棉质衣服。',
          },
          {
            en: 'My favourite shirt is light blue and white.',
            native: '我最喜欢的衬衫是浅蓝色和白色的。',
          },
          {
            en: 'Last week I bought a new jacket for winter.',
            native: '上周我为冬天买了一件新夹克。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'shoes',
    questionText: 'How many pairs of shoes do you have? Talk about them.',
    translations: {
      te: {
        word: 'బూట్లు',
        question: 'మీకు ఎన్ని జతల బూట్లు ఉన్నాయి? వాటి గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I have three pairs of shoes at home.',
            native: 'మా ఇంట్లో నాకు మూడు జతల బూట్లు ఉన్నాయి.',
          },
          {
            en: 'My black shoes are for work, and my sandals for home.',
            native: 'నా నల్ల బూట్లు పనికి, నా చెప్పులు ఇంటికి.',
          },
          {
            en: 'Yesterday I bought new sports shoes in the market.',
            native: 'నిన్న నేను మార్కెట్లో కొత్త స్పోర్ట్స్ షూస్ కొన్నాను.',
          },
        ],
      },
      hi: {
        word: 'जूते',
        question: 'आपके पास कितनी जोड़ी जूते हैं? उनके बारे में बताइए।',
        examples: [
          {
            en: 'I have three pairs of shoes at home.',
            native: 'मेरे घर पर तीन जोड़ी जूते हैं।',
          },
          {
            en: 'My black shoes are for work, and my sandals for home.',
            native: 'मेरे काले जूते काम के लिए हैं, और मेरी चप्पलें घर के लिए।',
          },
          {
            en: 'Yesterday I bought new sports shoes in the market.',
            native: 'कल मैंने बाज़ार से नए स्पोर्ट्स जूते खरीदे।',
          },
        ],
      },
      es: {
        word: 'zapatos',
        question: '¿Cuántos pares de zapatos tienes? Habla de ellos.',
        examples: [
          {
            en: 'I have three pairs of shoes at home.',
            native: 'Tengo tres pares de zapatos en casa.',
          },
          {
            en: 'My black shoes are for work, and my sandals for home.',
            native: 'Mis zapatos negros son para el trabajo, y mis sandalias para casa.',
          },
          {
            en: 'Yesterday I bought new sports shoes in the market.',
            native: 'Ayer compré zapatillas de deporte nuevas en el mercado.',
          },
        ],
      },
      zh: {
        word: '鞋子',
        question: '你有几双鞋？谈谈你的鞋子。',
        examples: [
          {
            en: 'I have three pairs of shoes at home.',
            native: '我家里有三双鞋。',
          },
          {
            en: 'My black shoes are for work, and my sandals for home.',
            native: '我的黑皮鞋是上班穿的，凉鞋是在家穿的。',
          },
          {
            en: 'Yesterday I bought new sports shoes in the market.',
            native: '昨天我在市场买了新的运动鞋。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'money',
    questionText: 'How do you save money? What do you like to buy?',
    translations: {
      te: {
        word: 'డబ్బు',
        question: 'మీరు డబ్బును ఎలా ఆదా చేస్తారు? మీరు ఏమి కొనడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'I save some money every month in the bank.',
            native: 'నేను ప్రతి నెల కొంత డబ్బు బ్యాంకులో ఆదా చేస్తాను.',
          },
          {
            en: 'I like buying books more than new clothes.',
            native: 'కొత్త బట్టల కంటే పుస్తకాలు కొనడం నాకు ఎక్కువ ఇష్టం.',
          },
          {
            en: 'Last week I saved money by cooking at home.',
            native: 'గత వారం నేను ఇంట్లో వంట చేసుకొని డబ్బు ఆదా చేశాను.',
          },
        ],
      },
      hi: {
        word: 'पैसा',
        question: 'आप पैसे कैसे बचाते हैं? आप क्या खरीदना पसंद करते हैं?',
        examples: [
          {
            en: 'I save some money every month in the bank.',
            native: 'मैं हर महीने कुछ पैसे बैंक में बचाता हूँ।',
          },
          {
            en: 'I like buying books more than new clothes.',
            native: 'मुझे नए कपड़ों से ज़्यादा किताबें खरीदना पसंद है।',
          },
          {
            en: 'Last week I saved money by cooking at home.',
            native: 'पिछले हफ़्ते मैंने घर पर खाना बनाकर पैसे बचाए।',
          },
        ],
      },
      es: {
        word: 'dinero',
        question: '¿Cómo ahorras dinero? ¿Qué te gusta comprar?',
        examples: [
          {
            en: 'I save some money every month in the bank.',
            native: 'Ahorro algo de dinero cada mes en el banco.',
          },
          {
            en: 'I like buying books more than new clothes.',
            native: 'Me gusta comprar libros más que ropa nueva.',
          },
          {
            en: 'Last week I saved money by cooking at home.',
            native: 'La semana pasada ahorré dinero cocinando en casa.',
          },
        ],
      },
      zh: {
        word: '钱',
        question: '你怎么存钱？你喜欢买什么？',
        examples: [
          {
            en: 'I save some money every month in the bank.',
            native: '我每个月在银行存一些钱。',
          },
          {
            en: 'I like buying books more than new clothes.',
            native: '比起买新衣服，我更喜欢买书。',
          },
          {
            en: 'Last week I saved money by cooking at home.',
            native: '上周我在家做饭省下了钱。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'bank',
    questionText: 'Do you go to the bank often? What do you do there?',
    translations: {
      te: {
        word: 'బ్యాంకు',
        question: 'మీరు తరచుగా బ్యాంకుకు వెళ్తారా? మీరు అక్కడ ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I go to the bank once every month.',
            native: 'నేను నెలకు ఒకసారి బ్యాంకుకు వెళ్తాను.',
          },
          {
            en: 'The bank near my house opens at nine.',
            native: 'మా ఇంటి దగ్గర ఉన్న బ్యాంకు తొమ్మిది గంటలకు తెరుస్తుంది.',
          },
          {
            en: 'Yesterday I put money into my new account.',
            native: 'నిన్న నేను నా కొత్త ఖాతాలో డబ్బు జమ చేశాను.',
          },
        ],
      },
      hi: {
        word: 'बैंक',
        question: 'क्या आप अक्सर बैंक जाते हैं? आप वहाँ क्या करते हैं?',
        examples: [
          {
            en: 'I go to the bank once every month.',
            native: 'मैं महीने में एक बार बैंक जाता हूँ।',
          },
          {
            en: 'The bank near my house opens at nine.',
            native: 'मेरे घर के पास का बैंक नौ बजे खुलता है।',
          },
          {
            en: 'Yesterday I put money into my new account.',
            native: 'कल मैंने अपने नए खाते में पैसे डाले।',
          },
        ],
      },
      es: {
        word: 'banco',
        question: '¿Vas al banco a menudo? ¿Qué haces allí?',
        examples: [
          {
            en: 'I go to the bank once every month.',
            native: 'Voy al banco una vez al mes.',
          },
          {
            en: 'The bank near my house opens at nine.',
            native: 'El banco cerca de mi casa abre a las nueve.',
          },
          {
            en: 'Yesterday I put money into my new account.',
            native: 'Ayer puse dinero en mi nueva cuenta.',
          },
        ],
      },
      zh: {
        word: '银行',
        question: '你经常去银行吗？你在那里做什么？',
        examples: [
          {
            en: 'I go to the bank once every month.',
            native: '我每个月去一次银行。',
          },
          {
            en: 'The bank near my house opens at nine.',
            native: '我家附近的银行九点开门。',
          },
          {
            en: 'Yesterday I put money into my new account.',
            native: '昨天我把钱存进了我的新账户。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'market',
    questionText: 'Do you shop at the market? What do you buy there?',
    translations: {
      te: {
        word: 'మార్కెట్',
        question: 'మీరు మార్కెట్లో కొనుగోలు చేస్తారా? మీరు అక్కడ ఏమి కొంటారు?',
        examples: [
          {
            en: 'I buy fresh vegetables at the market every Sunday.',
            native: 'నేను ప్రతి ఆదివారం మార్కెట్లో తాజా కూరగాయలు కొంటాను.',
          },
          {
            en: 'The market is busy, but the prices are good.',
            native: 'మార్కెట్ రద్దీగా ఉంటుంది, కానీ ధరలు బాగుంటాయి.',
          },
          {
            en: 'Yesterday I bought sweet mangoes at the market.',
            native: 'నిన్న నేను మార్కెట్లో తీపి మామిడి పండ్లు కొన్నాను.',
          },
        ],
      },
      hi: {
        word: 'बाज़ार',
        question: 'क्या आप बाज़ार से खरीदारी करते हैं? आप वहाँ क्या खरीदते हैं?',
        examples: [
          {
            en: 'I buy fresh vegetables at the market every Sunday.',
            native: 'मैं हर रविवार बाज़ार से ताज़ी सब्ज़ियाँ खरीदता हूँ।',
          },
          {
            en: 'The market is busy, but the prices are good.',
            native: 'बाज़ार भीड़भाड़ वाला होता है, लेकिन दाम अच्छे होते हैं।',
          },
          {
            en: 'Yesterday I bought sweet mangoes at the market.',
            native: 'कल मैंने बाज़ार से मीठे आम खरीदे।',
          },
        ],
      },
      es: {
        word: 'mercado',
        question: '¿Compras en el mercado? ¿Qué compras allí?',
        examples: [
          {
            en: 'I buy fresh vegetables at the market every Sunday.',
            native: 'Compro verduras frescas en el mercado cada domingo.',
          },
          {
            en: 'The market is busy, but the prices are good.',
            native: 'El mercado está lleno, pero los precios son buenos.',
          },
          {
            en: 'Yesterday I bought sweet mangoes at the market.',
            native: 'Ayer compré mangos dulces en el mercado.',
          },
        ],
      },
      zh: {
        word: '市场',
        question: '你在市场买东西吗？你在那里买什么？',
        examples: [
          {
            en: 'I buy fresh vegetables at the market every Sunday.',
            native: '我每个星期天在市场买新鲜蔬菜。',
          },
          {
            en: 'The market is busy, but the prices are good.',
            native: '市场很拥挤，但价格很好。',
          },
          {
            en: 'Yesterday I bought sweet mangoes at the market.',
            native: '昨天我在市场买了甜芒果。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'supermarket',
    questionText: 'Do you like supermarkets? What do you usually buy there?',
    translations: {
      te: {
        word: 'సూపర్ మార్కెట్',
        question: 'మీకు సూపర్ మార్కెట్లు ఇష్టమా? మీరు సాధారణంగా అక్కడ ఏమి కొంటారు?',
        examples: [
          {
            en: 'I go to the supermarket twice a week.',
            native: 'నేను వారానికి రెండుసార్లు సూపర్ మార్కెట్‌కు వెళ్తాను.',
          },
          {
            en: 'I usually buy milk, bread, and eggs there.',
            native: 'నేను సాధారణంగా అక్కడ పాలు, బ్రెడ్, గుడ్లు కొంటాను.',
          },
          {
            en: 'The supermarket was very crowded last Saturday evening.',
            native: 'గత శనివారం సాయంత్రం సూపర్ మార్కెట్ చాలా రద్దీగా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'सुपरमार्केट',
        question: 'क्या आपको सुपरमार्केट पसंद हैं? आप वहाँ आमतौर पर क्या खरीदते हैं?',
        examples: [
          {
            en: 'I go to the supermarket twice a week.',
            native: 'मैं हफ़्ते में दो बार सुपरमार्केट जाता हूँ।',
          },
          {
            en: 'I usually buy milk, bread, and eggs there.',
            native: 'मैं वहाँ आमतौर पर दूध, ब्रेड और अंडे खरीदता हूँ।',
          },
          {
            en: 'The supermarket was very crowded last Saturday evening.',
            native: 'पिछले शनिवार शाम को सुपरमार्केट बहुत भीड़भाड़ वाला था।',
          },
        ],
      },
      es: {
        word: 'supermercado',
        question: '¿Te gustan los supermercados? ¿Qué sueles comprar allí?',
        examples: [
          {
            en: 'I go to the supermarket twice a week.',
            native: 'Voy al supermercado dos veces por semana.',
          },
          {
            en: 'I usually buy milk, bread, and eggs there.',
            native: 'Normalmente compro leche, pan y huevos allí.',
          },
          {
            en: 'The supermarket was very crowded last Saturday evening.',
            native: 'El supermercado estaba muy lleno el sábado pasado por la tarde.',
          },
        ],
      },
      zh: {
        word: '超市',
        question: '你喜欢超市吗？你通常在那里买什么？',
        examples: [
          {
            en: 'I go to the supermarket twice a week.',
            native: '我每周去两次超市。',
          },
          {
            en: 'I usually buy milk, bread, and eggs there.',
            native: '我通常在那里买牛奶、面包和鸡蛋。',
          },
          {
            en: 'The supermarket was very crowded last Saturday evening.',
            native: '上周六傍晚超市里人很多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'gift',
    questionText: 'Talk about a gift you gave or received.',
    translations: {
      te: {
        word: 'బహుమతి',
        question: 'మీరు ఇచ్చిన లేదా అందుకున్న ఒక బహుమతి గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My best gift was a bicycle from my father.',
            native: 'నా అత్యుత్తమ బహుమతి నా నాన్న ఇచ్చిన సైకిల్.',
          },
          {
            en: 'I gave my mother a scarf on her birthday.',
            native: 'నేను నా అమ్మ పుట్టినరోజున ఆమెకు ఒక స్కార్ఫ్ ఇచ్చాను.',
          },
          {
            en: 'Next week I am going to buy a gift for my friend.',
            native: 'వచ్చే వారం నేను నా స్నేహితుడి కోసం ఒక బహుమతి కొనబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'तोहफ़ा',
        question: 'किसी ऐसे तोहफ़े के बारे में बताइए जो आपने दिया या पाया।',
        examples: [
          {
            en: 'My best gift was a bicycle from my father.',
            native: 'मेरा सबसे अच्छा तोहफ़ा मेरे पिता की ओर से एक साइकिल थी।',
          },
          {
            en: 'I gave my mother a scarf on her birthday.',
            native: 'मैंने अपनी माँ के जन्मदिन पर उन्हें एक स्कार्फ़ दिया।',
          },
          {
            en: 'Next week I am going to buy a gift for my friend.',
            native: 'मैं अगले हफ़्ते अपने दोस्त के लिए एक तोहफ़ा खरीदने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'regalo',
        question: 'Habla de un regalo que diste o recibiste.',
        examples: [
          {
            en: 'My best gift was a bicycle from my father.',
            native: 'Mi mejor regalo fue una bicicleta de mi padre.',
          },
          {
            en: 'I gave my mother a scarf on her birthday.',
            native: 'Le regalé una bufanda a mi madre en su cumpleaños.',
          },
          {
            en: 'Next week I am going to buy a gift for my friend.',
            native: 'La semana que viene voy a comprar un regalo para mi amigo.',
          },
        ],
      },
      zh: {
        word: '礼物',
        question: '谈谈你送出或收到的一份礼物。',
        examples: [
          {
            en: 'My best gift was a bicycle from my father.',
            native: '我最好的礼物是爸爸送我的一辆自行车。',
          },
          {
            en: 'I gave my mother a scarf on her birthday.',
            native: '妈妈生日那天我送了她一条围巾。',
          },
          {
            en: 'Next week I am going to buy a gift for my friend.',
            native: '下周我打算给朋友买一份礼物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'party',
    questionText: 'Do you like parties? Talk about a party you enjoyed.',
    translations: {
      te: {
        word: 'పార్టీ',
        question: 'మీకు పార్టీలు ఇష్టమా? మీరు ఆస్వాదించిన ఒక పార్టీ గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I like small parties with my close friends.',
            native: 'నా సన్నిహిత స్నేహితులతో చిన్న పార్టీలు నాకు ఇష్టం.',
          },
          {
            en: "Last month we had a party for my brother's birthday.",
            native: 'గత నెల నా సోదరుడి పుట్టినరోజు కోసం మేము ఒక పార్టీ చేశాము.',
          },
          {
            en: 'We danced, ate cake, and sang many old songs.',
            native: 'మేము డ్యాన్స్ చేశాము, కేకు తిన్నాము, చాలా పాత పాటలు పాడాము.',
          },
        ],
      },
      hi: {
        word: 'पार्टी',
        question: 'क्या आपको पार्टियाँ पसंद हैं? किसी मज़ेदार पार्टी के बारे में बताइए।',
        examples: [
          {
            en: 'I like small parties with my close friends.',
            native: 'मुझे अपने अच्छे दोस्तों के साथ छोटी पार्टियाँ पसंद हैं।',
          },
          {
            en: "Last month we had a party for my brother's birthday.",
            native: 'पिछले महीने हमने मेरे भाई के जन्मदिन की पार्टी की।',
          },
          {
            en: 'We danced, ate cake, and sang many old songs.',
            native: 'हम नाचे, केक खाया और कई पुराने गाने गाए।',
          },
        ],
      },
      es: {
        word: 'fiesta',
        question: '¿Te gustan las fiestas? Habla de una fiesta que disfrutaste.',
        examples: [
          {
            en: 'I like small parties with my close friends.',
            native: 'Me gustan las fiestas pequeñas con mis amigos cercanos.',
          },
          {
            en: "Last month we had a party for my brother's birthday.",
            native: 'El mes pasado hicimos una fiesta para el cumpleaños de mi hermano.',
          },
          {
            en: 'We danced, ate cake, and sang many old songs.',
            native: 'Bailamos, comimos pastel y cantamos muchas canciones viejas.',
          },
        ],
      },
      zh: {
        word: '聚会',
        question: '你喜欢聚会吗？谈谈你玩得很开心的一次聚会。',
        examples: [
          {
            en: 'I like small parties with my close friends.',
            native: '我喜欢和亲近的朋友一起的小型聚会。',
          },
          {
            en: "Last month we had a party for my brother's birthday.",
            native: '上个月我们为哥哥的生日办了一次聚会。',
          },
          {
            en: 'We danced, ate cake, and sang many old songs.',
            native: '我们跳了舞，吃了蛋糕，还唱了很多老歌。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'wedding',
    questionText: 'Talk about a wedding you attended.',
    translations: {
      te: {
        word: 'పెళ్ళి',
        question: 'మీరు హాజరైన ఒక వివాహం గురించి మాట్లాడండి.',
        examples: [
          {
            en: "Last year I attended my cousin's wedding in the city.",
            native: 'గత సంవత్సరం నేను నగరంలో నా కజిన్ వివాహానికి హాజరయ్యాను.',
          },
          {
            en: 'The bride wore a very beautiful red dress.',
            native: 'వధువు చాలా అందమైన ఎరుపు రంగు దుస్తులు ధరించింది.',
          },
          {
            en: 'We ate nice food and took many photos.',
            native: 'మేము రుచికరమైన భోజనం తిన్నాము, చాలా ఫోటోలు తీశాము.',
          },
        ],
      },
      hi: {
        word: 'शादी',
        question: 'किसी ऐसी शादी के बारे में बताइए जिसमें आप शामिल हुए।',
        examples: [
          {
            en: "Last year I attended my cousin's wedding in the city.",
            native: 'पिछले साल मैं शहर में अपने चचेरे भाई की शादी में शामिल हुआ।',
          },
          {
            en: 'The bride wore a very beautiful red dress.',
            native: 'दुल्हन ने बहुत सुंदर लाल पोशाक पहनी थी।',
          },
          {
            en: 'We ate nice food and took many photos.',
            native: 'हमने अच्छा खाना खाया और बहुत सी तस्वीरें लीं।',
          },
        ],
      },
      es: {
        word: 'boda',
        question: 'Habla de una boda a la que asististe.',
        examples: [
          {
            en: "Last year I attended my cousin's wedding in the city.",
            native: 'El año pasado asistí a la boda de mi primo en la ciudad.',
          },
          {
            en: 'The bride wore a very beautiful red dress.',
            native: 'La novia llevaba un vestido rojo muy bonito.',
          },
          {
            en: 'We ate nice food and took many photos.',
            native: 'Comimos comida rica e hicimos muchas fotos.',
          },
        ],
      },
      zh: {
        word: '婚礼',
        question: '谈谈你参加过的一场婚礼。',
        examples: [
          {
            en: "Last year I attended my cousin's wedding in the city.",
            native: '去年我在城里参加了表哥的婚礼。',
          },
          {
            en: 'The bride wore a very beautiful red dress.',
            native: '新娘穿着一条非常漂亮的红色裙子。',
          },
          {
            en: 'We ate nice food and took many photos.',
            native: '我们吃了美味的食物，拍了很多照片。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'neighbor',
    questionText: 'Do you know your neighbors? Talk about them.',
    translations: {
      te: {
        word: 'పొరుగువారు',
        question: 'మీకు మీ పొరుగువారు తెలుసా? వారి గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My neighbors are very kind and helpful people.',
            native: 'నా పొరుగువారు చాలా మంచి, సహాయకరమైన వ్యక్తులు.',
          },
          {
            en: 'They often give us fruits from their garden.',
            native: 'వారు తరచుగా తమ తోటలోని పండ్లు మాకు ఇస్తారు.',
          },
          {
            en: 'Last Sunday we drank tea together at their house.',
            native: 'గత ఆదివారం మేము వారి ఇంట్లో కలిసి టీ తాగాము.',
          },
        ],
      },
      hi: {
        word: 'पड़ोसी',
        question: 'क्या आप अपने पड़ोसियों को जानते हैं? उनके बारे में बताइए।',
        examples: [
          {
            en: 'My neighbors are very kind and helpful people.',
            native: 'मेरे पड़ोसी बहुत दयालु और मददगार लोग हैं।',
          },
          {
            en: 'They often give us fruits from their garden.',
            native: 'वे अक्सर हमें अपने बगीचे के फल देते हैं।',
          },
          {
            en: 'Last Sunday we drank tea together at their house.',
            native: 'पिछले रविवार हमने उनके घर पर साथ चाय पी।',
          },
        ],
      },
      es: {
        word: 'vecino',
        question: '¿Conoces a tus vecinos? Habla de ellos.',
        examples: [
          {
            en: 'My neighbors are very kind and helpful people.',
            native: 'Mis vecinos son personas muy amables y serviciales.',
          },
          {
            en: 'They often give us fruits from their garden.',
            native: 'A menudo nos dan fruta de su jardín.',
          },
          {
            en: 'Last Sunday we drank tea together at their house.',
            native: 'El domingo pasado tomamos té juntos en su casa.',
          },
        ],
      },
      zh: {
        word: '邻居',
        question: '你认识你的邻居吗？谈谈他们。',
        examples: [
          {
            en: 'My neighbors are very kind and helpful people.',
            native: '我的邻居们都是非常友善、乐于助人的人。',
          },
          {
            en: 'They often give us fruits from their garden.',
            native: '他们经常把花园里的水果送给我们。',
          },
          {
            en: 'Last Sunday we drank tea together at their house.',
            native: '上个星期天我们在他们家一起喝了茶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'city',
    questionText: 'Do you live in a city? What do you like about it?',
    translations: {
      te: {
        word: 'నగరం',
        question: 'మీరు నగరంలో నివసిస్తున్నారా? దాని గురించి మీకు ఏమి ఇష్టం?',
        examples: [
          {
            en: 'I live in a big city with many people.',
            native: 'నేను చాలా మంది ఉండే ఒక పెద్ద నగరంలో నివసిస్తాను.',
          },
          {
            en: 'I like the parks, cinemas, and big markets.',
            native: 'నాకు పార్కులు, సినిమాలు, పెద్ద మార్కెట్లు ఇష్టం.',
          },
          {
            en: 'But the traffic is heavy in the morning.',
            native: 'కానీ ఉదయం ట్రాఫిక్ ఎక్కువగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'शहर',
        question: 'क्या आप किसी शहर में रहते हैं? आपको उसकी क्या बात पसंद है?',
        examples: [
          {
            en: 'I live in a big city with many people.',
            native: 'मैं बहुत से लोगों वाले एक बड़े शहर में रहता हूँ।',
          },
          {
            en: 'I like the parks, cinemas, and big markets.',
            native: 'मुझे पार्क, सिनेमा और बड़े बाज़ार पसंद हैं।',
          },
          {
            en: 'But the traffic is heavy in the morning.',
            native: 'लेकिन सुबह ट्रैफ़िक बहुत होता है।',
          },
        ],
      },
      es: {
        word: 'ciudad',
        question: '¿Vives en una ciudad? ¿Qué te gusta de ella?',
        examples: [
          {
            en: 'I live in a big city with many people.',
            native: 'Vivo en una ciudad grande con mucha gente.',
          },
          {
            en: 'I like the parks, cinemas, and big markets.',
            native: 'Me gustan los parques, los cines y los mercados grandes.',
          },
          {
            en: 'But the traffic is heavy in the morning.',
            native: 'Pero el tráfico es pesado por la mañana.',
          },
        ],
      },
      zh: {
        word: '城市',
        question: '你住在城市里吗？你喜欢它什么？',
        examples: [
          {
            en: 'I live in a big city with many people.',
            native: '我住在一个有很多人的大城市。',
          },
          {
            en: 'I like the parks, cinemas, and big markets.',
            native: '我喜欢公园、电影院和大市场。',
          },
          {
            en: 'But the traffic is heavy in the morning.',
            native: '但是早上交通很拥堵。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'village',
    questionText: 'Talk about a village you know or visited.',
    translations: {
      te: {
        word: 'గ్రామం',
        question: 'మీకు తెలిసిన లేదా మీరు సందర్శించిన ఒక గ్రామం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My grandparents live in a small, quiet village.',
            native: 'నా తాతయ్య, అమ్మమ్మ ఒక చిన్న, ప్రశాంతమైన గ్రామంలో నివసిస్తారు.',
          },
          {
            en: 'The air is fresh and people are friendly there.',
            native: 'అక్కడ గాలి స్వచ్ఛంగా ఉంటుంది, ప్రజలు స్నేహపూర్వకంగా ఉంటారు.',
          },
          {
            en: 'Last summer I spent two weeks in that village.',
            native: 'గత వేసవిలో నేను ఆ గ్రామంలో రెండు వారాలు గడిపాను.',
          },
        ],
      },
      hi: {
        word: 'गाँव',
        question: 'किसी ऐसे गाँव के बारे में बताइए जिसे आप जानते हैं या घूमे हैं।',
        examples: [
          {
            en: 'My grandparents live in a small, quiet village.',
            native: 'मेरे दादा-दादी एक छोटे, शांत गाँव में रहते हैं।',
          },
          {
            en: 'The air is fresh and people are friendly there.',
            native: 'वहाँ हवा ताज़ा है और लोग दोस्ताना हैं।',
          },
          {
            en: 'Last summer I spent two weeks in that village.',
            native: 'पिछली गर्मी में मैंने उस गाँव में दो हफ़्ते बिताए।',
          },
        ],
      },
      es: {
        word: 'pueblo',
        question: 'Habla de un pueblo que conoces o visitaste.',
        examples: [
          {
            en: 'My grandparents live in a small, quiet village.',
            native: 'Mis abuelos viven en un pueblo pequeño y tranquilo.',
          },
          {
            en: 'The air is fresh and people are friendly there.',
            native: 'El aire es fresco y la gente es amable allí.',
          },
          {
            en: 'Last summer I spent two weeks in that village.',
            native: 'El verano pasado pasé dos semanas en ese pueblo.',
          },
        ],
      },
      zh: {
        word: '村庄',
        question: '谈谈你了解或去过的一个村庄。',
        examples: [
          {
            en: 'My grandparents live in a small, quiet village.',
            native: '我的爷爷奶奶住在一个安静的小村庄里。',
          },
          {
            en: 'The air is fresh and people are friendly there.',
            native: '那里空气清新，人们很友好。',
          },
          {
            en: 'Last summer I spent two weeks in that village.',
            native: '去年夏天我在那个村庄住了两个星期。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'house',
    questionText: 'Describe your house. How many rooms does it have?',
    translations: {
      te: {
        word: 'ఇల్లు',
        question: 'మీ ఇంటిని వివరించండి. దానిలో ఎన్ని గదులు ఉన్నాయి?',
        examples: [
          {
            en: 'My house has four rooms and a small garden.',
            native: 'నా ఇంట్లో నాలుగు గదులు, ఒక చిన్న తోట ఉన్నాయి.',
          },
          {
            en: 'The kitchen is big and full of light.',
            native: 'వంటగది పెద్దగా, వెలుతురుతో నిండి ఉంటుంది.',
          },
          {
            en: 'We painted the whole house white last year.',
            native: 'గత సంవత్సరం మేము మొత్తం ఇంటికి తెలుపు రంగు వేశాము.',
          },
        ],
      },
      hi: {
        word: 'घर',
        question: 'अपने घर का वर्णन कीजिए। उसमें कितने कमरे हैं?',
        examples: [
          {
            en: 'My house has four rooms and a small garden.',
            native: 'मेरे घर में चार कमरे और एक छोटा बगीचा है।',
          },
          {
            en: 'The kitchen is big and full of light.',
            native: 'रसोई बड़ी और रोशनी से भरी है।',
          },
          {
            en: 'We painted the whole house white last year.',
            native: 'पिछले साल हमने पूरे घर में सफ़ेद रंग करवाया।',
          },
        ],
      },
      es: {
        word: 'casa',
        question: 'Describe tu casa. ¿Cuántas habitaciones tiene?',
        examples: [
          {
            en: 'My house has four rooms and a small garden.',
            native: 'Mi casa tiene cuatro habitaciones y un jardín pequeño.',
          },
          {
            en: 'The kitchen is big and full of light.',
            native: 'La cocina es grande y está llena de luz.',
          },
          {
            en: 'We painted the whole house white last year.',
            native: 'Pintamos toda la casa de blanco el año pasado.',
          },
        ],
      },
      zh: {
        word: '房子',
        question: '描述一下你的房子。它有几个房间？',
        examples: [
          {
            en: 'My house has four rooms and a small garden.',
            native: '我的房子有四个房间和一个小花园。',
          },
          {
            en: 'The kitchen is big and full of light.',
            native: '厨房很大，光线充足。',
          },
          {
            en: 'We painted the whole house white last year.',
            native: '去年我们把整座房子刷成了白色。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'room',
    questionText: 'Describe your room. What things are in it?',
    translations: {
      te: {
        word: 'గది',
        question: 'మీ గదిని వివరించండి. దానిలో ఏ వస్తువులు ఉన్నాయి?',
        examples: [
          {
            en: 'My room is small but always very clean.',
            native: 'నా గది చిన్నది కానీ ఎల్లప్పుడూ చాలా శుభ్రంగా ఉంటుంది.',
          },
          {
            en: 'There is a bed, a table, and a chair.',
            native: 'అందులో ఒక మంచం, ఒక టేబుల్, ఒక కుర్చీ ఉన్నాయి.',
          },
          {
            en: 'I keep my books on a shelf near the window.',
            native: 'నేను నా పుస్తకాలను కిటికీ దగ్గర ఉన్న అరలో ఉంచుతాను.',
          },
        ],
      },
      hi: {
        word: 'कमरा',
        question: 'अपने कमरे का वर्णन कीजिए। उसमें क्या-क्या चीज़ें हैं?',
        examples: [
          {
            en: 'My room is small but always very clean.',
            native: 'मेरा कमरा छोटा है लेकिन हमेशा बहुत साफ़ रहता है।',
          },
          {
            en: 'There is a bed, a table, and a chair.',
            native: 'उसमें एक बिस्तर, एक मेज़ और एक कुर्सी है।',
          },
          {
            en: 'I keep my books on a shelf near the window.',
            native: 'मैं अपनी किताबें खिड़की के पास की अलमारी में रखता हूँ।',
          },
        ],
      },
      es: {
        word: 'habitación',
        question: 'Describe tu habitación. ¿Qué cosas hay en ella?',
        examples: [
          {
            en: 'My room is small but always very clean.',
            native: 'Mi habitación es pequeña pero siempre está muy limpia.',
          },
          {
            en: 'There is a bed, a table, and a chair.',
            native: 'Hay una cama, una mesa y una silla.',
          },
          {
            en: 'I keep my books on a shelf near the window.',
            native: 'Guardo mis libros en un estante cerca de la ventana.',
          },
        ],
      },
      zh: {
        word: '房间',
        question: '描述一下你的房间。里面有什么东西？',
        examples: [
          {
            en: 'My room is small but always very clean.',
            native: '我的房间很小，但总是非常干净。',
          },
          {
            en: 'There is a bed, a table, and a chair.',
            native: '里面有一张床、一张桌子和一把椅子。',
          },
          {
            en: 'I keep my books on a shelf near the window.',
            native: '我把书放在窗边的一个架子上。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'kitchen',
    questionText: 'Do you like your kitchen? What do you cook there?',
    translations: {
      te: {
        word: 'వంటగది',
        question: 'మీకు మీ వంటగది ఇష్టమా? మీరు అక్కడ ఏమి వంట చేస్తారు?',
        examples: [
          {
            en: 'Our kitchen is small but very clean and useful.',
            native: 'మా వంటగది చిన్నది కానీ చాలా శుభ్రంగా, ఉపయోగకరంగా ఉంటుంది.',
          },
          {
            en: 'I cook rice and vegetables there every day.',
            native: 'నేను ప్రతిరోజూ అక్కడ అన్నం, కూరగాయలు వంట చేస్తాను.',
          },
          {
            en: 'My mother always keeps the kitchen very tidy.',
            native: 'మా అమ్మ వంటగదిని ఎల్లప్పుడూ చాలా క్రమంగా ఉంచుతుంది.',
          },
        ],
      },
      hi: {
        word: 'रसोई',
        question: 'क्या आपको अपनी रसोई पसंद है? आप वहाँ क्या बनाते हैं?',
        examples: [
          {
            en: 'Our kitchen is small but very clean and useful.',
            native: 'हमारी रसोई छोटी है लेकिन बहुत साफ़ और उपयोगी है।',
          },
          {
            en: 'I cook rice and vegetables there every day.',
            native: 'मैं वहाँ रोज़ चावल और सब्ज़ियाँ बनाता हूँ।',
          },
          {
            en: 'My mother always keeps the kitchen very tidy.',
            native: 'मेरी माँ रसोई को हमेशा बहुत साफ़-सुथरा रखती है।',
          },
        ],
      },
      es: {
        word: 'cocina',
        question: '¿Te gusta tu cocina? ¿Qué cocinas allí?',
        examples: [
          {
            en: 'Our kitchen is small but very clean and useful.',
            native: 'Nuestra cocina es pequeña pero muy limpia y útil.',
          },
          {
            en: 'I cook rice and vegetables there every day.',
            native: 'Cocino arroz y verduras allí todos los días.',
          },
          {
            en: 'My mother always keeps the kitchen very tidy.',
            native: 'Mi madre siempre mantiene la cocina muy ordenada.',
          },
        ],
      },
      zh: {
        word: '厨房',
        question: '你喜欢你的厨房吗？你在那里做什么菜？',
        examples: [
          {
            en: 'Our kitchen is small but very clean and useful.',
            native: '我们的厨房很小，但非常干净实用。',
          },
          {
            en: 'I cook rice and vegetables there every day.',
            native: '我每天在那里做米饭和蔬菜。',
          },
          {
            en: 'My mother always keeps the kitchen very tidy.',
            native: '我妈妈总是把厨房收拾得很整洁。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'doctor',
    questionText: 'When did you last visit a doctor? Talk about it.',
    translations: {
      te: {
        word: 'డాక్టర్',
        question: 'మీరు చివరిగా ఎప్పుడు డాక్టర్‌ను సంప్రదించారు? దాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I visited the doctor last month for a fever.',
            native: 'గత నెల నేను జ్వరం కోసం డాక్టర్‌ను సంప్రదించాను.',
          },
          {
            en: 'The doctor was kind and gave me some medicine.',
            native: 'డాక్టర్ మంచివారు, నాకు కొంత మందు ఇచ్చారు.',
          },
          {
            en: 'I felt better after two days of rest.',
            native: 'రెండు రోజుల విశ్రాంతి తర్వాత నేను కోలుకున్నాను.',
          },
        ],
      },
      hi: {
        word: 'डॉक्टर',
        question: 'आप आख़िरी बार डॉक्टर के पास कब गए? इसके बारे में बताइए।',
        examples: [
          {
            en: 'I visited the doctor last month for a fever.',
            native: 'पिछले महीने मैं बुख़ार के कारण डॉक्टर के पास गया।',
          },
          {
            en: 'The doctor was kind and gave me some medicine.',
            native: 'डॉक्टर दयालु थे और उन्होंने मुझे कुछ दवा दी।',
          },
          {
            en: 'I felt better after two days of rest.',
            native: 'दो दिन के आराम के बाद मैं ठीक महसूस करने लगा।',
          },
        ],
      },
      es: {
        word: 'médico',
        question: '¿Cuándo fue la última vez que fuiste al médico? Háblame de ello.',
        examples: [
          {
            en: 'I visited the doctor last month for a fever.',
            native: 'Fui al médico el mes pasado por una fiebre.',
          },
          {
            en: 'The doctor was kind and gave me some medicine.',
            native: 'El médico fue amable y me dio algunas medicinas.',
          },
          {
            en: 'I felt better after two days of rest.',
            native: 'Me sentí mejor después de dos días de descanso.',
          },
        ],
      },
      zh: {
        word: '医生',
        question: '你上一次看医生是什么时候？谈谈那次经历。',
        examples: [
          {
            en: 'I visited the doctor last month for a fever.',
            native: '上个月我因为发烧去看了医生。',
          },
          {
            en: 'The doctor was kind and gave me some medicine.',
            native: '医生很和蔼，给我开了一些药。',
          },
          {
            en: 'I felt better after two days of rest.',
            native: '休息了两天之后我感觉好多了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'hospital',
    questionText: 'Is there a hospital near your home? Talk about a visit there.',
    translations: {
      te: {
        word: 'ఆసుపత్రి',
        question: 'మీ ఇంటి దగ్గర ఆసుపత్రి ఉందా? అక్కడి ఒక సందర్శన గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'There is a big hospital near the bus station.',
            native: 'బస్ స్టేషన్ దగ్గర ఒక పెద్ద ఆసుపత్రి ఉంది.',
          },
          {
            en: 'My uncle works in that hospital as a nurse.',
            native: 'నా మామయ్య ఆ ఆసుపత్రిలో నర్సుగా పని చేస్తారు.',
          },
          {
            en: 'Last year my grandmother stayed there for a week.',
            native: 'గత సంవత్సరం నా అమ్మమ్మ అక్కడ ఒక వారం ఉంది.',
          },
        ],
      },
      hi: {
        word: 'अस्पताल',
        question: 'क्या आपके घर के पास कोई अस्पताल है? वहाँ की किसी विज़िट के बारे में बताइए।',
        examples: [
          {
            en: 'There is a big hospital near the bus station.',
            native: 'बस स्टेशन के पास एक बड़ा अस्पताल है।',
          },
          {
            en: 'My uncle works in that hospital as a nurse.',
            native: 'मेरे चाचा उस अस्पताल में नर्स के रूप में काम करते हैं।',
          },
          {
            en: 'Last year my grandmother stayed there for a week.',
            native: 'पिछले साल मेरी दादी एक हफ़्ते वहाँ रहीं।',
          },
        ],
      },
      es: {
        word: 'hospital',
        question: '¿Hay un hospital cerca de tu casa? Habla de una visita allí.',
        examples: [
          {
            en: 'There is a big hospital near the bus station.',
            native: 'Hay un hospital grande cerca de la estación de autobuses.',
          },
          {
            en: 'My uncle works in that hospital as a nurse.',
            native: 'Mi tío trabaja en ese hospital como enfermero.',
          },
          {
            en: 'Last year my grandmother stayed there for a week.',
            native: 'El año pasado mi abuela estuvo allí una semana.',
          },
        ],
      },
      zh: {
        word: '医院',
        question: '你家附近有医院吗？谈谈去那里的一次经历。',
        examples: [
          {
            en: 'There is a big hospital near the bus station.',
            native: '公交车站附近有一家大医院。',
          },
          {
            en: 'My uncle works in that hospital as a nurse.',
            native: '我叔叔在那家医院当护士。',
          },
          {
            en: 'Last year my grandmother stayed there for a week.',
            native: '去年我奶奶在那里住了一个星期。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'teacher',
    questionText: 'Talk about a teacher you liked at school.',
    translations: {
      te: {
        word: 'ఉపాధ్యాయుడు',
        question: 'పాఠశాలలో మీకు ఇష్టమైన ఒక ఉపాధ్యాయుడు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My favourite teacher taught us English in school.',
            native: 'నా ఇష్టమైన ఉపాధ్యాయిని పాఠశాలలో మాకు ఇంగ్లీష్ నేర్పించారు.',
          },
          {
            en: 'She was very patient and explained everything clearly.',
            native: 'ఆమె చాలా సహనంతో ఉండేవారు, ప్రతిదీ స్పష్టంగా వివరించేవారు.',
          },
          {
            en: 'She told us many interesting stories every Friday.',
            native: 'ఆమె ప్రతి శుక్రవారం మాకు చాలా ఆసక్తికరమైన కథలు చెప్పేవారు.',
          },
        ],
      },
      hi: {
        word: 'शिक्षक',
        question: 'स्कूल में अपने किसी पसंदीदा शिक्षक के बारे में बताइए।',
        examples: [
          {
            en: 'My favourite teacher taught us English in school.',
            native: 'मेरी पसंदीदा शिक्षिका ने स्कूल में हमें अंग्रेज़ी पढ़ाया।',
          },
          {
            en: 'She was very patient and explained everything clearly.',
            native: 'वे बहुत धैर्यवान थीं और हर बात स्पष्ट समझाती थीं।',
          },
          {
            en: 'She told us many interesting stories every Friday.',
            native: 'वे हर शुक्रवार हमें कई रोचक कहानियाँ सुनाती थीं।',
          },
        ],
      },
      es: {
        word: 'maestro',
        question: 'Habla de un maestro que te gustaba en la escuela.',
        examples: [
          {
            en: 'My favourite teacher taught us English in school.',
            native: 'Mi maestra favorita nos enseñaba inglés en la escuela.',
          },
          {
            en: 'She was very patient and explained everything clearly.',
            native: 'Era muy paciente y explicaba todo con claridad.',
          },
          {
            en: 'She told us many interesting stories every Friday.',
            native: 'Nos contaba muchas historias interesantes cada viernes.',
          },
        ],
      },
      zh: {
        word: '老师',
        question: '谈谈你在学校喜欢的一位老师。',
        examples: [
          {
            en: 'My favourite teacher taught us English in school.',
            native: '我最喜欢的老师在学校教我们英语。',
          },
          {
            en: 'She was very patient and explained everything clearly.',
            native: '她非常有耐心，把每件事都讲得很清楚。',
          },
          {
            en: 'She told us many interesting stories every Friday.',
            native: '她每个星期五都给我们讲很多有趣的故事。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'exam',
    questionText: 'How do you prepare for exams? Talk about your last exam.',
    translations: {
      te: {
        word: 'పరీక్ష',
        question: 'మీరు పరీక్షలకు ఎలా సిద్ధమవుతారు? మీ చివరి పరీక్ష గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I study for two hours every evening before exams.',
            native: 'పరీక్షల ముందు నేను ప్రతి సాయంత్రం రెండు గంటలు చదువుతాను.',
          },
          {
            en: 'My last exam was difficult, but I passed it.',
            native: 'నా చివరి పరీక్ష కష్టంగా ఉంది, కానీ నేను ఉత్తీర్ణుడనయ్యాను.',
          },
          {
            en: 'Next week I am going to take my English exam.',
            native: 'వచ్చే వారం నేను నా ఇంగ్లీష్ పరీక్ష రాయబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'परीक्षा',
        question: 'आप परीक्षाओं की तैयारी कैसे करते हैं? अपनी पिछली परीक्षा के बारे में बताइए।',
        examples: [
          {
            en: 'I study for two hours every evening before exams.',
            native: 'परीक्षाओं से पहले मैं हर शाम दो घंटे पढ़ता हूँ।',
          },
          {
            en: 'My last exam was difficult, but I passed it.',
            native: 'मेरी पिछली परीक्षा कठिन थी, लेकिन मैं उत्तीर्ण हो गया।',
          },
          {
            en: 'Next week I am going to take my English exam.',
            native: 'मैं अगले हफ़्ते अपनी अंग्रेज़ी की परीक्षा देने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'examen',
        question: '¿Cómo te preparas para los exámenes? Habla de tu último examen.',
        examples: [
          {
            en: 'I study for two hours every evening before exams.',
            native: 'Estudio dos horas cada tarde antes de los exámenes.',
          },
          {
            en: 'My last exam was difficult, but I passed it.',
            native: 'Mi último examen fue difícil, pero lo aprobé.',
          },
          {
            en: 'Next week I am going to take my English exam.',
            native: 'La semana que viene voy a hacer mi examen de inglés.',
          },
        ],
      },
      zh: {
        word: '考试',
        question: '你怎么准备考试？谈谈你上一次考试。',
        examples: [
          {
            en: 'I study for two hours every evening before exams.',
            native: '考试前我每天傍晚学习两个小时。',
          },
          {
            en: 'My last exam was difficult, but I passed it.',
            native: '我上一次考试很难，但我通过了。',
          },
          {
            en: 'Next week I am going to take my English exam.',
            native: '下周我要参加英语考试。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'homework',
    questionText: 'How much homework do you get? When do you do it?',
    translations: {
      te: {
        word: 'ఇంటిపని',
        question: 'మీకు ఎంత ఇంటిపని ఇస్తారు? మీరు దానిని ఎప్పుడు చేస్తారు?',
        examples: [
          {
            en: 'I get some homework from school every day.',
            native: 'నాకు పాఠశాల నుండి ప్రతిరోజూ కొంత ఇంటిపని వస్తుంది.',
          },
          {
            en: 'I do my homework after dinner at my table.',
            native: 'నేను రాత్రి భోజనం తర్వాత నా టేబుల్ వద్ద ఇంటిపని చేస్తాను.',
          },
          {
            en: 'Yesterday I finished all my homework before eight.',
            native: 'నిన్న నేను ఎనిమిది గంటల లోపు నా ఇంటిపని అంతా పూర్తి చేశాను.',
          },
        ],
      },
      hi: {
        word: 'होमवर्क',
        question: 'आपको कितना होमवर्क मिलता है? आप उसे कब करते हैं?',
        examples: [
          {
            en: 'I get some homework from school every day.',
            native: 'मुझे स्कूल से रोज़ कुछ होमवर्क मिलता है।',
          },
          {
            en: 'I do my homework after dinner at my table.',
            native: 'मैं रात के खाने के बाद अपनी मेज़ पर होमवर्क करता हूँ।',
          },
          {
            en: 'Yesterday I finished all my homework before eight.',
            native: 'कल मैंने आठ बजे से पहले अपना सारा होमवर्क ख़त्म किया।',
          },
        ],
      },
      es: {
        word: 'tarea',
        question: '¿Cuánta tarea te dan? ¿Cuándo la haces?',
        examples: [
          {
            en: 'I get some homework from school every day.',
            native: 'Me dan algo de tarea del colegio todos los días.',
          },
          {
            en: 'I do my homework after dinner at my table.',
            native: 'Hago mi tarea después de cenar en mi mesa.',
          },
          {
            en: 'Yesterday I finished all my homework before eight.',
            native: 'Ayer terminé toda mi tarea antes de las ocho.',
          },
        ],
      },
      zh: {
        word: '家庭作业',
        question: '你有多少家庭作业？你什么时候做？',
        examples: [
          {
            en: 'I get some homework from school every day.',
            native: '学校每天都给我布置一些家庭作业。',
          },
          {
            en: 'I do my homework after dinner at my table.',
            native: '我晚饭后在自己的书桌上做作业。',
          },
          {
            en: 'Yesterday I finished all my homework before eight.',
            native: '昨天我在八点之前做完了所有作业。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'language',
    questionText: 'What languages do you speak? Which language do you want to learn?',
    translations: {
      te: {
        word: 'భాష',
        question: 'మీరు ఏ భాషలు మాట్లాడతారు? మీరు ఏ భాష నేర్చుకోవాలనుకుంటున్నారు?',
        examples: [
          {
            en: 'I speak two languages at home and outside.',
            native: 'నేను ఇంట్లోను, బయటను రెండు భాషలు మాట్లాడతాను.',
          },
          {
            en: 'I want to learn English for my job.',
            native: 'నా ఉద్యోగం కోసం నేను ఇంగ్లీష్ నేర్చుకోవాలనుకుంటున్నాను.',
          },
          {
            en: 'My friend is going to teach me French words.',
            native: 'నా స్నేహితుడు నాకు ఫ్రెంచ్ పదాలు నేర్పబోతున్నాడు.',
          },
        ],
      },
      hi: {
        word: 'भाषा',
        question: 'आप कौन-कौन सी भाषाएँ बोलते हैं? आप कौन सी भाषा सीखना चाहते हैं?',
        examples: [
          {
            en: 'I speak two languages at home and outside.',
            native: 'मैं घर और बाहर दो भाषाएँ बोलता हूँ।',
          },
          {
            en: 'I want to learn English for my job.',
            native: 'मैं अपनी नौकरी के लिए अंग्रेज़ी सीखना चाहता हूँ।',
          },
          {
            en: 'My friend is going to teach me French words.',
            native: 'मेरा दोस्त मुझे फ़्रांसीसी शब्द सिखाने वाला है।',
          },
        ],
      },
      es: {
        word: 'idioma',
        question: '¿Qué idiomas hablas? ¿Qué idioma quieres aprender?',
        examples: [
          {
            en: 'I speak two languages at home and outside.',
            native: 'Hablo dos idiomas en casa y fuera.',
          },
          {
            en: 'I want to learn English for my job.',
            native: 'Quiero aprender inglés para mi trabajo.',
          },
          {
            en: 'My friend is going to teach me French words.',
            native: 'Mi amigo me va a enseñar palabras en francés.',
          },
        ],
      },
      zh: {
        word: '语言',
        question: '你会说哪些语言？你想学哪种语言？',
        examples: [
          {
            en: 'I speak two languages at home and outside.',
            native: '我在家里和外面说两种语言。',
          },
          {
            en: 'I want to learn English for my job.',
            native: '为了工作我想学英语。',
          },
          {
            en: 'My friend is going to teach me French words.',
            native: '我的朋友要教我法语单词。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'coffee',
    questionText: 'Do you drink coffee? When do you drink it?',
    translations: {
      te: {
        word: 'కాఫీ',
        question: 'మీరు కాఫీ తాగుతారా? మీరు దానిని ఎప్పుడు తాగుతారు?',
        examples: [
          {
            en: 'I drink one cup of coffee every morning.',
            native: 'నేను ప్రతి ఉదయం ఒక కప్పు కాఫీ తాగుతాను.',
          },
          {
            en: 'I like hot coffee with milk and sugar.',
            native: 'నాకు పాలు, చక్కెర కలిపిన వేడి కాఫీ ఇష్టం.',
          },
          {
            en: 'Yesterday I drank coffee with my friend in town.',
            native: 'నిన్న నేను పట్టణంలో నా స్నేహితుడితో కాఫీ తాగాను.',
          },
        ],
      },
      hi: {
        word: 'कॉफ़ी',
        question: 'क्या आप कॉफ़ी पीते हैं? आप इसे कब पीते हैं?',
        examples: [
          {
            en: 'I drink one cup of coffee every morning.',
            native: 'मैं हर सुबह एक कप कॉफ़ी पीता हूँ।',
          },
          {
            en: 'I like hot coffee with milk and sugar.',
            native: 'मुझे दूध और चीनी वाली गर्म कॉफ़ी पसंद है।',
          },
          {
            en: 'Yesterday I drank coffee with my friend in town.',
            native: 'कल मैंने शहर में अपने दोस्त के साथ कॉफ़ी पी।',
          },
        ],
      },
      es: {
        word: 'café',
        question: '¿Tomas café? ¿Cuándo lo tomas?',
        examples: [
          {
            en: 'I drink one cup of coffee every morning.',
            native: 'Tomo una taza de café cada mañana.',
          },
          {
            en: 'I like hot coffee with milk and sugar.',
            native: 'Me gusta el café caliente con leche y azúcar.',
          },
          {
            en: 'Yesterday I drank coffee with my friend in town.',
            native: 'Ayer tomé un café con mi amigo en la ciudad.',
          },
        ],
      },
      zh: {
        word: '咖啡',
        question: '你喝咖啡吗？你什么时候喝？',
        examples: [
          {
            en: 'I drink one cup of coffee every morning.',
            native: '我每天早上喝一杯咖啡。',
          },
          {
            en: 'I like hot coffee with milk and sugar.',
            native: '我喜欢加牛奶和糖的热咖啡。',
          },
          {
            en: 'Yesterday I drank coffee with my friend in town.',
            native: '昨天我和朋友在城里喝了咖啡。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'tea',
    questionText: 'Do you like tea? How do you make it?',
    translations: {
      te: {
        word: 'టీ',
        question: 'మీకు టీ ఇష్టమా? మీరు దానిని ఎలా తయారు చేస్తారు?',
        examples: [
          {
            en: 'I drink two cups of tea every day.',
            native: 'నేను ప్రతిరోజూ రెండు కప్పుల టీ తాగుతాను.',
          },
          {
            en: 'I make tea with milk, sugar, and ginger.',
            native: 'నేను పాలు, చక్కెర, అల్లం కలిపి టీ తయారు చేస్తాను.',
          },
          {
            en: 'My grandfather always drinks tea without any sugar.',
            native: 'నా తాతయ్య ఎల్లప్పుడూ చక్కెర లేకుండా టీ తాగుతారు.',
          },
        ],
      },
      hi: {
        word: 'चाय',
        question: 'क्या आपको चाय पसंद है? आप इसे कैसे बनाते हैं?',
        examples: [
          {
            en: 'I drink two cups of tea every day.',
            native: 'मैं रोज़ दो कप चाय पीता हूँ।',
          },
          {
            en: 'I make tea with milk, sugar, and ginger.',
            native: 'मैं दूध, चीनी और अदरक डालकर चाय बनाता हूँ।',
          },
          {
            en: 'My grandfather always drinks tea without any sugar.',
            native: 'मेरे दादा हमेशा बिना चीनी की चाय पीते हैं।',
          },
        ],
      },
      es: {
        word: 'té',
        question: '¿Te gusta el té? ¿Cómo lo preparas?',
        examples: [
          {
            en: 'I drink two cups of tea every day.',
            native: 'Tomo dos tazas de té todos los días.',
          },
          {
            en: 'I make tea with milk, sugar, and ginger.',
            native: 'Preparo el té con leche, azúcar y jengibre.',
          },
          {
            en: 'My grandfather always drinks tea without any sugar.',
            native: 'Mi abuelo siempre toma el té sin azúcar.',
          },
        ],
      },
      zh: {
        word: '茶',
        question: '你喜欢喝茶吗？你怎么泡茶？',
        examples: [
          {
            en: 'I drink two cups of tea every day.',
            native: '我每天喝两杯茶。',
          },
          {
            en: 'I make tea with milk, sugar, and ginger.',
            native: '我用牛奶、糖和姜来煮茶。',
          },
          {
            en: 'My grandfather always drinks tea without any sugar.',
            native: '我爷爷总是喝不加糖的茶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'fruit',
    questionText: 'What fruits do you like? How often do you eat fruit?',
    translations: {
      te: {
        word: 'పండు',
        question: 'మీకు ఏ పండ్లు ఇష్టం? మీరు ఎంత తరచుగా పండ్లు తింటారు?',
        examples: [
          {
            en: 'My favourite fruit is the sweet summer mango.',
            native: 'నా ఇష్టమైన పండు తీయటి వేసవి మామిడి పండు.',
          },
          {
            en: 'I eat one apple or banana every day.',
            native: 'నేను ప్రతిరోజూ ఒక ఆపిల్ లేదా అరటి పండు తింటాను.',
          },
          {
            en: 'Yesterday I bought fresh oranges from the market.',
            native: 'నిన్న నేను మార్కెట్ నుండి తాజా ఆరెంజులు కొన్నాను.',
          },
        ],
      },
      hi: {
        word: 'फल',
        question: 'आपको कौन से फल पसंद हैं? आप कितनी बार फल खाते हैं?',
        examples: [
          {
            en: 'My favourite fruit is the sweet summer mango.',
            native: 'मेरा पसंदीदा फल मीठा गर्मियों वाला आम है।',
          },
          {
            en: 'I eat one apple or banana every day.',
            native: 'मैं रोज़ एक सेब या केला खाता हूँ।',
          },
          {
            en: 'Yesterday I bought fresh oranges from the market.',
            native: 'कल मैंने बाज़ार से ताज़े संतरे खरीदे।',
          },
        ],
      },
      es: {
        word: 'fruta',
        question: '¿Qué frutas te gustan? ¿Con qué frecuencia comes fruta?',
        examples: [
          {
            en: 'My favourite fruit is the sweet summer mango.',
            native: 'Mi fruta favorita es el dulce mango de verano.',
          },
          {
            en: 'I eat one apple or banana every day.',
            native: 'Como una manzana o un plátano todos los días.',
          },
          {
            en: 'Yesterday I bought fresh oranges from the market.',
            native: 'Ayer compré naranjas frescas en el mercado.',
          },
        ],
      },
      zh: {
        word: '水果',
        question: '你喜欢什么水果？你多久吃一次水果？',
        examples: [
          {
            en: 'My favourite fruit is the sweet summer mango.',
            native: '我最喜欢的水果是夏天香甜的芒果。',
          },
          {
            en: 'I eat one apple or banana every day.',
            native: '我每天吃一个苹果或一根香蕉。',
          },
          {
            en: 'Yesterday I bought fresh oranges from the market.',
            native: '昨天我在市场买了新鲜的橙子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'vegetable',
    questionText: 'What vegetables do you eat? Do you like green vegetables?',
    translations: {
      te: {
        word: 'కూరగాయ',
        question: 'మీరు ఏ కూరగాయలు తింటారు? మీకు ఆకుకూరలు ఇష్టమా?',
        examples: [
          {
            en: 'I eat fresh vegetables with rice every day.',
            native: 'నేను ప్రతిరోజూ అన్నంతో తాజా కూరగాయలు తింటాను.',
          },
          {
            en: 'My favourite vegetables are carrots and green beans.',
            native: 'నా ఇష్టమైన కూరగాయలు క్యారెట్లు, గ్రీన్ బీన్స్.',
          },
          {
            en: 'My mother cooks potatoes in many different ways.',
            native: 'మా అమ్మ బంగాళాదుంపలను పలు విధాలుగా వంటుతుంది.',
          },
        ],
      },
      hi: {
        word: 'सब्ज़ी',
        question: 'आप कौन सी सब्ज़ियाँ खाते हैं? क्या आपको हरी सब्ज़ियाँ पसंद हैं?',
        examples: [
          {
            en: 'I eat fresh vegetables with rice every day.',
            native: 'मैं रोज़ चावल के साथ ताज़ी सब्ज़ियाँ खाता हूँ।',
          },
          {
            en: 'My favourite vegetables are carrots and green beans.',
            native: 'मेरी पसंदीदा सब्ज़ियाँ गाजर और हरी बीन्स हैं।',
          },
          {
            en: 'My mother cooks potatoes in many different ways.',
            native: 'मेरी माँ आलू को कई तरीकों से बनाती है।',
          },
        ],
      },
      es: {
        word: 'verdura',
        question: '¿Qué verduras comes? ¿Te gustan las verduras verdes?',
        examples: [
          {
            en: 'I eat fresh vegetables with rice every day.',
            native: 'Como verduras frescas con arroz todos los días.',
          },
          {
            en: 'My favourite vegetables are carrots and green beans.',
            native: 'Mis verduras favoritas son las zanahorias y las judías verdes.',
          },
          {
            en: 'My mother cooks potatoes in many different ways.',
            native: 'Mi madre cocina las patatas de muchas formas diferentes.',
          },
        ],
      },
      zh: {
        word: '蔬菜',
        question: '你吃哪些蔬菜？你喜欢绿色蔬菜吗？',
        examples: [
          {
            en: 'I eat fresh vegetables with rice every day.',
            native: '我每天吃米饭配新鲜蔬菜。',
          },
          {
            en: 'My favourite vegetables are carrots and green beans.',
            native: '我最喜欢的蔬菜是胡萝卜和青豆。',
          },
          {
            en: 'My mother cooks potatoes in many different ways.',
            native: '我妈妈会用很多不同的方法做土豆。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'rice',
    questionText: 'Do you eat rice often? What do you eat with it?',
    translations: {
      te: {
        word: 'అన్నం',
        question: 'మీరు తరచుగా అన్నం తింటారా? మీరు దానితో ఏమి తింటారు?',
        examples: [
          {
            en: 'I eat rice for lunch and for dinner.',
            native: 'నేను మధ్యాహ్నం, రాత్రి భోజనానికి అన్నం తింటాను.',
          },
          {
            en: 'I like rice with dal and vegetable curry.',
            native: 'నాకు పప్పు, కూరగాయల కూరతో అన్నం ఇష్టం.',
          },
          {
            en: 'Yesterday my mother made fried rice for us.',
            native: 'నిన్న మా అమ్మ మా కోసం ఫ్రైడ్ రైస్ చేసింది.',
          },
        ],
      },
      hi: {
        word: 'चावल',
        question: 'क्या आप अक्सर चावल खाते हैं? आप उनके साथ क्या खाते हैं?',
        examples: [
          {
            en: 'I eat rice for lunch and for dinner.',
            native: 'मैं दोपहर और रात के खाने में चावल खाता हूँ।',
          },
          {
            en: 'I like rice with dal and vegetable curry.',
            native: 'मुझे दाल और सब्ज़ी की करी के साथ चावल पसंद हैं।',
          },
          {
            en: 'Yesterday my mother made fried rice for us.',
            native: 'कल मेरी माँ ने हमारे लिए फ्राइड राइस बनाए।',
          },
        ],
      },
      es: {
        word: 'arroz',
        question: '¿Comes arroz a menudo? ¿Con qué lo comes?',
        examples: [
          {
            en: 'I eat rice for lunch and for dinner.',
            native: 'Como arroz en la comida y en la cena.',
          },
          {
            en: 'I like rice with dal and vegetable curry.',
            native: 'Me gusta el arroz con dal y curry de verduras.',
          },
          {
            en: 'Yesterday my mother made fried rice for us.',
            native: 'Ayer mi madre nos hizo arroz frito.',
          },
        ],
      },
      zh: {
        word: '米饭',
        question: '你经常吃米饭吗？你配什么吃？',
        examples: [
          {
            en: 'I eat rice for lunch and for dinner.',
            native: '我午餐和晚餐都吃米饭。',
          },
          {
            en: 'I like rice with dal and vegetable curry.',
            native: '我喜欢米饭配豆汤和蔬菜咖喱。',
          },
          {
            en: 'Yesterday my mother made fried rice for us.',
            native: '昨天我妈妈给我们做了炒饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'bread',
    questionText: 'Do you eat bread? What do you put on it?',
    translations: {
      te: {
        word: 'బ్రెడ్',
        question: 'మీరు బ్రెడ్ తింటారా? మీరు దానిపై ఏమి వేసుకుంటారు?',
        examples: [
          {
            en: 'I eat bread with butter every morning for breakfast.',
            native: 'నేను ప్రతి ఉదయం అల్పాహారానికి వెన్నతో బ్రెడ్ తింటాను.',
          },
          {
            en: 'My father likes bread with jam and honey.',
            native: 'నా నాన్నకు జామ్, తేనెతో బ్రెడ్ ఇష్టం.',
          },
          {
            en: 'Yesterday I bought fresh bread from the bakery.',
            native: 'నిన్న నేను బేకరీ నుండి తాజా బ్రెడ్ కొన్నాను.',
          },
        ],
      },
      hi: {
        word: 'ब्रेड',
        question: 'क्या आप ब्रेड खाते हैं? आप उस पर क्या लगाते हैं?',
        examples: [
          {
            en: 'I eat bread with butter every morning for breakfast.',
            native: 'मैं हर सुबह नाश्ते में मक्खन के साथ ब्रेड खाता हूँ।',
          },
          {
            en: 'My father likes bread with jam and honey.',
            native: 'मेरे पिता को जाम और शहद के साथ ब्रेड पसंद है।',
          },
          {
            en: 'Yesterday I bought fresh bread from the bakery.',
            native: 'कल मैंने बेकरी से ताज़ी ब्रेड खरीदी।',
          },
        ],
      },
      es: {
        word: 'pan',
        question: '¿Comes pan? ¿Qué le pones?',
        examples: [
          {
            en: 'I eat bread with butter every morning for breakfast.',
            native: 'Como pan con mantequilla cada mañana en el desayuno.',
          },
          {
            en: 'My father likes bread with jam and honey.',
            native: 'A mi padre le gusta el pan con mermelada y miel.',
          },
          {
            en: 'Yesterday I bought fresh bread from the bakery.',
            native: 'Ayer compré pan fresco en la panadería.',
          },
        ],
      },
      zh: {
        word: '面包',
        question: '你吃面包吗？你在上面涂什么？',
        examples: [
          {
            en: 'I eat bread with butter every morning for breakfast.',
            native: '我每天早餐吃涂黄油的面包。',
          },
          {
            en: 'My father likes bread with jam and honey.',
            native: '我爸爸喜欢涂果酱和蜂蜜的面包。',
          },
          {
            en: 'Yesterday I bought fresh bread from the bakery.',
            native: '昨天我在面包店买了新鲜面包。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'milk',
    questionText: 'Do you drink milk? Do you like milk products?',
    translations: {
      te: {
        word: 'పాలు',
        question: 'మీరు పాలు తాగుతారా? మీకు పాల ఉత్పత్తులు ఇష్టమా?',
        examples: [
          {
            en: 'I drink a glass of warm milk before bed.',
            native: 'నేను పడుకునే ముందు ఒక గ్లాసు గోరువెచ్చని పాలు తాగుతాను.',
          },
          {
            en: 'My little brother drinks milk with chocolate every morning.',
            native: 'నా తమ్ముడు ప్రతి ఉదయం చాక్లెట్ కలిపిన పాలు తాగుతాడు.',
          },
          {
            en: 'We also eat curd and butter at home.',
            native: 'మేము ఇంట్లో పెరుగు, వెన్న కూడా తింటాము.',
          },
        ],
      },
      hi: {
        word: 'दूध',
        question: 'क्या आप दूध पीते हैं? क्या आपको दूध से बनी चीज़ें पसंद हैं?',
        examples: [
          {
            en: 'I drink a glass of warm milk before bed.',
            native: 'मैं सोने से पहले एक गिलास गुनगुना दूध पीता हूँ।',
          },
          {
            en: 'My little brother drinks milk with chocolate every morning.',
            native: 'मेरा छोटा भाई हर सुबह चॉकलेट वाला दूध पीता है।',
          },
          {
            en: 'We also eat curd and butter at home.',
            native: 'हम घर पर दही और मक्खन भी खाते हैं।',
          },
        ],
      },
      es: {
        word: 'leche',
        question: '¿Bebes leche? ¿Te gustan los productos lácteos?',
        examples: [
          {
            en: 'I drink a glass of warm milk before bed.',
            native: 'Bebo un vaso de leche tibia antes de acostarme.',
          },
          {
            en: 'My little brother drinks milk with chocolate every morning.',
            native: 'Mi hermano pequeño bebe leche con chocolate cada mañana.',
          },
          {
            en: 'We also eat curd and butter at home.',
            native: 'También comemos yogur y mantequilla en casa.',
          },
        ],
      },
      zh: {
        word: '牛奶',
        question: '你喝牛奶吗？你喜欢奶制品吗？',
        examples: [
          {
            en: 'I drink a glass of warm milk before bed.',
            native: '我睡前喝一杯温牛奶。',
          },
          {
            en: 'My little brother drinks milk with chocolate every morning.',
            native: '我弟弟每天早上喝巧克力牛奶。',
          },
          {
            en: 'We also eat curd and butter at home.',
            native: '我们在家也吃酸奶和黄油。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'picnic',
    questionText: 'Talk about a picnic you had with your family or friends.',
    translations: {
      te: {
        word: 'పిక్నిక్',
        question: 'మీరు కుటుంబంతో లేదా స్నేహితులతో చేసిన ఒక పిక్నిక్ గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'Last month we had a picnic near the lake.',
            native: 'గత నెల మేము సరస్సు దగ్గర పిక్నిక్ చేశాము.',
          },
          {
            en: 'We took sandwiches, fruits, and cold drinks with us.',
            native: 'మేము శాండ్‌విచ్‌లు, పండ్లు, చల్లటి పానీయాలు తీసుకెళ్ళాము.',
          },
          {
            en: 'We played games and sang songs all afternoon.',
            native: 'మేము మధ్యాహ్నాంతం ఆటలు ఆడాము, పాటలు పాడాము.',
          },
        ],
      },
      hi: {
        word: 'पिकनिक',
        question: 'अपने परिवार या दोस्तों के साथ की गई किसी पिकनिक के बारे में बताइए।',
        examples: [
          {
            en: 'Last month we had a picnic near the lake.',
            native: 'पिछले महीने हमने झील के पास पिकनिक की।',
          },
          {
            en: 'We took sandwiches, fruits, and cold drinks with us.',
            native: 'हम अपने साथ सैंडविच, फल और ठंडे पेय ले गए।',
          },
          {
            en: 'We played games and sang songs all afternoon.',
            native: 'हमने पूरा दोपहर बाद खेल खेले और गाने गाए।',
          },
        ],
      },
      es: {
        word: 'picnic',
        question: 'Habla de un picnic que hiciste con tu familia o amigos.',
        examples: [
          {
            en: 'Last month we had a picnic near the lake.',
            native: 'El mes pasado hicimos un picnic cerca del lago.',
          },
          {
            en: 'We took sandwiches, fruits, and cold drinks with us.',
            native: 'Llevamos sándwiches, fruta y bebidas frías con nosotros.',
          },
          {
            en: 'We played games and sang songs all afternoon.',
            native: 'Jugamos a juegos y cantamos canciones toda la tarde.',
          },
        ],
      },
      zh: {
        word: '野餐',
        question: '谈谈你和家人或朋友的一次野餐。',
        examples: [
          {
            en: 'Last month we had a picnic near the lake.',
            native: '上个月我们在湖边野餐了。',
          },
          {
            en: 'We took sandwiches, fruits, and cold drinks with us.',
            native: '我们带了三明治、水果和冷饮。',
          },
          {
            en: 'We played games and sang songs all afternoon.',
            native: '我们整个下午做游戏、唱歌。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'cinema',
    questionText: 'Do you like going to the cinema? Talk about the last film you saw.',
    translations: {
      te: {
        word: 'సినిమా',
        question: 'మీకు సినిమాకు వెళ్లడం ఇష్టమా? మీరు చివరిగా చూసిన సినిమా గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I go to the cinema once every month.',
            native: 'నేను నెలకు ఒకసారి సినిమాకు వెళ్తాను.',
          },
          {
            en: 'Last week I saw a funny film with my friends.',
            native: 'గత వారం నేను నా స్నేహితులతో ఒక హాస్య సినిమా చూశాను.',
          },
          {
            en: 'The tickets were cheap and the seats were comfortable.',
            native: 'టికెట్లు చౌకగా ఉన్నాయి, సీట్లు సౌకర్యవంతంగా ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'सिनेमा',
        question: 'क्या आपको सिनेमा जाना पसंद है? अपनी पिछली देखी फ़िल्म के बारे में बताइए।',
        examples: [
          {
            en: 'I go to the cinema once every month.',
            native: 'मैं महीने में एक बार सिनेमा जाता हूँ।',
          },
          {
            en: 'Last week I saw a funny film with my friends.',
            native: 'पिछले हफ़्ते मैंने अपने दोस्तों के साथ एक मज़ेदार फ़िल्म देखी।',
          },
          {
            en: 'The tickets were cheap and the seats were comfortable.',
            native: 'टिकटें सस्ती थीं और सीटें आरामदायक थीं।',
          },
        ],
      },
      es: {
        word: 'cine',
        question: '¿Te gusta ir al cine? Habla de la última película que viste.',
        examples: [
          {
            en: 'I go to the cinema once every month.',
            native: 'Voy al cine una vez al mes.',
          },
          {
            en: 'Last week I saw a funny film with my friends.',
            native: 'La semana pasada vi una película divertida con mis amigos.',
          },
          {
            en: 'The tickets were cheap and the seats were comfortable.',
            native: 'Las entradas eran baratas y los asientos eran cómodos.',
          },
        ],
      },
      zh: {
        word: '电影院',
        question: '你喜欢去电影院吗？谈谈你最近看的一部电影。',
        examples: [
          {
            en: 'I go to the cinema once every month.',
            native: '我每个月去一次电影院。',
          },
          {
            en: 'Last week I saw a funny film with my friends.',
            native: '上周我和朋友们看了一部有趣的电影。',
          },
          {
            en: 'The tickets were cheap and the seats were comfortable.',
            native: '票很便宜，座位也很舒服。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'museum',
    questionText: 'Have you visited a museum? What did you see there?',
    translations: {
      te: {
        word: 'మ్యూజియం',
        question: 'మీరు మ్యూజియం సందర్శించారా? మీరు అక్కడ ఏమి చూశారు?',
        examples: [
          {
            en: 'I visited the city museum with my class.',
            native: 'నేను నా క్లాస్‌తో నగర మ్యూజియం సందర్శించాను.',
          },
          {
            en: 'I saw old coins, paintings, and wooden boats there.',
            native: 'నేను అక్కడ పాత నాణేలు, పెయింటింగులు, చెక్క పడవలు చూశాను.',
          },
          {
            en: 'I am going to visit the science museum next month.',
            native: 'వచ్చే నెల నేను సైన్స్ మ్యూజియం సందర్శించబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'संग्रहालय',
        question: 'क्या आप किसी संग्रहालय में गए हैं? आपने वहाँ क्या देखा?',
        examples: [
          {
            en: 'I visited the city museum with my class.',
            native: 'मैं अपनी कक्षा के साथ शहर का संग्रहालय देखने गया।',
          },
          {
            en: 'I saw old coins, paintings, and wooden boats there.',
            native: 'मैंने वहाँ पुराने सिक्के, चित्र और लकड़ी की नावें देखीं।',
          },
          {
            en: 'I am going to visit the science museum next month.',
            native: 'मैं अगले महीने विज्ञान संग्रहालय जाने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'museo',
        question: '¿Has visitado un museo? ¿Qué viste allí?',
        examples: [
          {
            en: 'I visited the city museum with my class.',
            native: 'Visité el museo de la ciudad con mi clase.',
          },
          {
            en: 'I saw old coins, paintings, and wooden boats there.',
            native: 'Vi monedas antiguas, cuadros y barcos de madera allí.',
          },
          {
            en: 'I am going to visit the science museum next month.',
            native: 'Voy a visitar el museo de ciencias el mes que viene.',
          },
        ],
      },
      zh: {
        word: '博物馆',
        question: '你参观过博物馆吗？你在那里看到了什么？',
        examples: [
          {
            en: 'I visited the city museum with my class.',
            native: '我和同学们一起参观了城市博物馆。',
          },
          {
            en: 'I saw old coins, paintings, and wooden boats there.',
            native: '我在那里看到了古钱币、绘画和木船。',
          },
          {
            en: 'I am going to visit the science museum next month.',
            native: '下个月我打算去参观科学博物馆。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'zoo',
    questionText: 'Do you like the zoo? What animals did you see there?',
    translations: {
      te: {
        word: 'జూ',
        question: 'మీకు జూ ఇష్టమా? మీరు అక్కడ ఏ జంతువులు చూశారు?',
        examples: [
          {
            en: 'I went to the zoo with my family last winter.',
            native: 'గత శీతాకాలంలో నేను నా కుటుంబంతో జూకి వెళ్ళాను.',
          },
          {
            en: 'We saw lions, elephants, and colourful birds there.',
            native: 'మేము అక్కడ సింహాలు, ఏనుగులు, రంగురంగుల పక్షులు చూశాము.',
          },
          {
            en: 'My little sister liked the monkeys the most.',
            native: 'నా చిన్న చెల్లెలికి కోతులు అంటే అత్యంత ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'चिड़ियाघर',
        question: 'क्या आपको चिड़ियाघर पसंद है? आपने वहाँ कौन से जानवर देखे?',
        examples: [
          {
            en: 'I went to the zoo with my family last winter.',
            native: 'पिछली सर्दी में मैं अपने परिवार के साथ चिड़ियाघर गया।',
          },
          {
            en: 'We saw lions, elephants, and colourful birds there.',
            native: 'हमने वहाँ शेर, हाथी और रंगीन पक्षी देखे।',
          },
          {
            en: 'My little sister liked the monkeys the most.',
            native: 'मेरी छोटी बहन को बंदर सबसे ज़्यादा पसंद आए।',
          },
        ],
      },
      es: {
        word: 'zoológico',
        question: '¿Te gusta el zoológico? ¿Qué animales viste allí?',
        examples: [
          {
            en: 'I went to the zoo with my family last winter.',
            native: 'Fui al zoológico con mi familia el invierno pasado.',
          },
          {
            en: 'We saw lions, elephants, and colourful birds there.',
            native: 'Vimos leones, elefantes y pájaros de colores allí.',
          },
          {
            en: 'My little sister liked the monkeys the most.',
            native: 'A mi hermana pequeña le gustaron más los monos.',
          },
        ],
      },
      zh: {
        word: '动物园',
        question: '你喜欢动物园吗？你在那里看到了什么动物？',
        examples: [
          {
            en: 'I went to the zoo with my family last winter.',
            native: '去年冬天我和家人一起去了动物园。',
          },
          {
            en: 'We saw lions, elephants, and colourful birds there.',
            native: '我们在那里看到了狮子、大象和五颜六色的鸟。',
          },
          {
            en: 'My little sister liked the monkeys the most.',
            native: '我妹妹最喜欢猴子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'animal',
    questionText: 'What is your favourite animal? Talk about it.',
    translations: {
      te: {
        word: 'జంతువు',
        question: 'మీ ఇష్టమైన జంతువు ఏది? దాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My favourite animal is the big grey elephant.',
            native: 'నా ఇష్టమైన జంతువు పెద్ద బూడిద రంగు ఏనుగు.',
          },
          {
            en: 'It is strong, intelligent, and also very friendly.',
            native: 'అది బలంగా, తెలివిగా, అలాగే చాలా స్నేహపూర్వకంగా ఉంటుంది.',
          },
          {
            en: 'I saw elephants at the zoo last year.',
            native: 'గత సంవత్సరం నేను జూలో ఏనుగులు చూశాను.',
          },
        ],
      },
      hi: {
        word: 'जानवर',
        question: 'आपका पसंदीदा जानवर कौन सा है? उसके बारे में बताइए।',
        examples: [
          {
            en: 'My favourite animal is the big grey elephant.',
            native: 'मेरा पसंदीदा जानवर बड़ा स्लेटी हाथी है।',
          },
          {
            en: 'It is strong, intelligent, and also very friendly.',
            native: 'यह मज़बूत, समझदार और बहुत दोस्ताना भी है।',
          },
          {
            en: 'I saw elephants at the zoo last year.',
            native: 'पिछले साल मैंने चिड़ियाघर में हाथी देखे।',
          },
        ],
      },
      es: {
        word: 'animal',
        question: '¿Cuál es tu animal favorito? Habla de él.',
        examples: [
          {
            en: 'My favourite animal is the big grey elephant.',
            native: 'Mi animal favorito es el gran elefante gris.',
          },
          {
            en: 'It is strong, intelligent, and also very friendly.',
            native: 'Es fuerte, inteligente y también muy amigable.',
          },
          {
            en: 'I saw elephants at the zoo last year.',
            native: 'Vi elefantes en el zoológico el año pasado.',
          },
        ],
      },
      zh: {
        word: '动物',
        question: '你最喜欢的动物是什么？谈谈它。',
        examples: [
          {
            en: 'My favourite animal is the big grey elephant.',
            native: '我最喜欢的动物是灰色的大象。',
          },
          {
            en: 'It is strong, intelligent, and also very friendly.',
            native: '它强壮、聪明，而且非常友好。',
          },
          {
            en: 'I saw elephants at the zoo last year.',
            native: '去年我在动物园看到了大象。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'exercise',
    questionText: 'Do you exercise every day? What exercise do you like?',
    translations: {
      te: {
        word: 'వ్యాయామం',
        question: 'మీరు ప్రతిరోజూ వ్యాయామం చేస్తారా? మీకు ఏ వ్యాయామం ఇష్టం?',
        examples: [
          {
            en: 'I walk for thirty minutes in the park every morning.',
            native: 'నేను ప్రతి ఉదయం పార్కులో మూప్పై నిమిషాలు నడుస్తాను.',
          },
          {
            en: 'I like doing simple stretching exercises at home.',
            native: 'ఇంట్లో సరళమైన స్ట్రెచింగ్ వ్యాయామాలు చేయడం నాకు ఇష్టం.',
          },
          {
            en: 'My father does yoga in the park on Sundays.',
            native: 'నా నాన్న ఆదివారాల్లో పార్కులో యోగా చేస్తారు.',
          },
        ],
      },
      hi: {
        word: 'व्यायाम',
        question: 'क्या आप रोज़ व्यायाम करते हैं? आपको कौन सा व्यायाम पसंद है?',
        examples: [
          {
            en: 'I walk for thirty minutes in the park every morning.',
            native: 'मैं हर सुबह पार्क में तीस मिनट घूमता हूँ।',
          },
          {
            en: 'I like doing simple stretching exercises at home.',
            native: 'मुझे घर पर साधारण स्ट्रेचिंग व्यायाम करना पसंद है।',
          },
          {
            en: 'My father does yoga in the park on Sundays.',
            native: 'मेरे पिता रविवार को पार्क में योग करते हैं।',
          },
        ],
      },
      es: {
        word: 'ejercicio',
        question: '¿Haces ejercicio todos los días? ¿Qué ejercicio te gusta?',
        examples: [
          {
            en: 'I walk for thirty minutes in the park every morning.',
            native: 'Camino treinta minutos en el parque cada mañana.',
          },
          {
            en: 'I like doing simple stretching exercises at home.',
            native: 'Me gusta hacer ejercicios sencillos de estiramiento en casa.',
          },
          {
            en: 'My father does yoga in the park on Sundays.',
            native: 'Mi padre hace yoga en el parque los domingos.',
          },
        ],
      },
      zh: {
        word: '锻炼',
        question: '你每天都锻炼吗？你喜欢什么运动？',
        examples: [
          {
            en: 'I walk for thirty minutes in the park every morning.',
            native: '我每天早上去公园走三十分钟。',
          },
          {
            en: 'I like doing simple stretching exercises at home.',
            native: '我喜欢在家做简单的拉伸运动。',
          },
          {
            en: 'My father does yoga in the park on Sundays.',
            native: '我爸爸星期天在公园里练瑜伽。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'haircut',
    questionText: 'How often do you get a haircut? Talk about your last one.',
    translations: {
      te: {
        word: 'హెయిర్ కట్',
        question: 'మీరు ఎంత తరచుగా జుట్టు కత్తిరించుకుంటారు? మీ చివరిదాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I get a haircut once every two months.',
            native: 'నేను ప్రతి రెండు నెలలకు ఒకసారి జుట్టు కత్తిరించుకుంటాను.',
          },
          {
            en: 'The barber near my house cuts hair very well.',
            native: 'మా ఇంటి దగ్గర ఉన్న నాపితుడు జుట్టును చాలా బాగా కత్తిరిస్తాడు.',
          },
          {
            en: 'Last week I got a short haircut for summer.',
            native: 'గత వారం నేను వేసవి కోసం పొట్టిగా జుట్టు కత్తిరించుకున్నాను.',
          },
        ],
      },
      hi: {
        word: 'हेयरकट',
        question: 'आप कितनी बार बाल कटवाते हैं? अपने पिछले हेयरकट के बारे में बताइए।',
        examples: [
          {
            en: 'I get a haircut once every two months.',
            native: 'मैं हर दो महीने में एक बार बाल कटवाता हूँ।',
          },
          {
            en: 'The barber near my house cuts hair very well.',
            native: 'मेरे घर के पास का नाई बाल बहुत अच्छे काटता है।',
          },
          {
            en: 'Last week I got a short haircut for summer.',
            native: 'पिछले हफ़्ते मैंने गर्मियों के लिए छोटे बाल कटवाए।',
          },
        ],
      },
      es: {
        word: 'corte de pelo',
        question: '¿Con qué frecuencia te cortas el pelo? Habla del último.',
        examples: [
          {
            en: 'I get a haircut once every two months.',
            native: 'Me corto el pelo una vez cada dos meses.',
          },
          {
            en: 'The barber near my house cuts hair very well.',
            native: 'El peluquero cerca de mi casa corta el pelo muy bien.',
          },
          {
            en: 'Last week I got a short haircut for summer.',
            native: 'La semana pasada me corté el pelo corto para el verano.',
          },
        ],
      },
      zh: {
        word: '理发',
        question: '你多久理一次发？谈谈你上一次理发。',
        examples: [
          {
            en: 'I get a haircut once every two months.',
            native: '我每两个月理一次发。',
          },
          {
            en: 'The barber near my house cuts hair very well.',
            native: '我家附近的理发师剪得非常好。',
          },
          {
            en: 'Last week I got a short haircut for summer.',
            native: '上周我为了夏天剪了短发。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'radio',
    questionText: 'Do you listen to the radio? What programmes do you like?',
    translations: {
      te: {
        word: 'రేడియో',
        question: 'మీరు రేడియో వింటారా? మీకు ఏ కార్యక్రమాలు ఇష్టం?',
        examples: [
          {
            en: 'My grandfather listens to the radio every morning.',
            native: 'నా తాతయ్య ప్రతి ఉదయం రేడియో వింటారు.',
          },
          {
            en: 'I like music programmes and the sports news.',
            native: 'నాకు సంగీత కార్యక్రమాలు, క్రీడా వార్తలు ఇష్టం.',
          },
          {
            en: 'We heard the news on the radio yesterday.',
            native: 'నిన్న మేము రేడియోలో వార్తలు విన్నాము.',
          },
        ],
      },
      hi: {
        word: 'रेडियो',
        question: 'क्या आप रेडियो सुनते हैं? आपको कौन से कार्यक्रम पसंद हैं?',
        examples: [
          {
            en: 'My grandfather listens to the radio every morning.',
            native: 'मेरे दादा हर सुबह रेडियो सुनते हैं।',
          },
          {
            en: 'I like music programmes and the sports news.',
            native: 'मुझे संगीत कार्यक्रम और खेल समाचार पसंद हैं।',
          },
          {
            en: 'We heard the news on the radio yesterday.',
            native: 'कल हमने रेडियो पर ख़बरें सुनीं।',
          },
        ],
      },
      es: {
        word: 'radio',
        question: '¿Escuchas la radio? ¿Qué programas te gustan?',
        examples: [
          {
            en: 'My grandfather listens to the radio every morning.',
            native: 'Mi abuelo escucha la radio cada mañana.',
          },
          {
            en: 'I like music programmes and the sports news.',
            native: 'Me gustan los programas de música y las noticias deportivas.',
          },
          {
            en: 'We heard the news on the radio yesterday.',
            native: 'Ayer escuchamos las noticias en la radio.',
          },
        ],
      },
      zh: {
        word: '广播',
        question: '你听广播吗？你喜欢什么节目？',
        examples: [
          {
            en: 'My grandfather listens to the radio every morning.',
            native: '我爷爷每天早上听广播。',
          },
          {
            en: 'I like music programmes and the sports news.',
            native: '我喜欢音乐节目和体育新闻。',
          },
          {
            en: 'We heard the news on the radio yesterday.',
            native: '昨天我们在广播里听了新闻。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'newspaper',
    questionText: 'Do you read the newspaper? What do you read first?',
    translations: {
      te: {
        word: 'వార్తాపత్రిక',
        question: 'మీరు వార్తాపత్రిక చదువుతారా? మీరు ముందు ఏమి చదువుతారు?',
        examples: [
          {
            en: 'My father reads the newspaper every morning with tea.',
            native: 'నా నాన్న ప్రతి ఉదయం టీతో వార్తాపత్రిక చదువుతారు.',
          },
          {
            en: 'I read the sports page and the local news.',
            native: 'నేను క్రీడా పేజీ, స్థానిక వార్తలు చదువుతాను.',
          },
          {
            en: 'Yesterday I read an interesting story about our town.',
            native: 'నిన్న నేను మా పట్టణం గురించి ఒక ఆసక్తికరమైన కథనం చదివాను.',
          },
        ],
      },
      hi: {
        word: 'अख़बार',
        question: 'क्या आप अख़बार पढ़ते हैं? आप सबसे पहले क्या पढ़ते हैं?',
        examples: [
          {
            en: 'My father reads the newspaper every morning with tea.',
            native: 'मेरे पिता हर सुबह चाय के साथ अख़बार पढ़ते हैं।',
          },
          {
            en: 'I read the sports page and the local news.',
            native: 'मैं खेल पृष्ठ और स्थानीय ख़बरें पढ़ता हूँ।',
          },
          {
            en: 'Yesterday I read an interesting story about our town.',
            native: 'कल मैंने हमारे शहर के बारे में एक रोचक ख़बर पढ़ी।',
          },
        ],
      },
      es: {
        word: 'periódico',
        question: '¿Lees el periódico? ¿Qué lees primero?',
        examples: [
          {
            en: 'My father reads the newspaper every morning with tea.',
            native: 'Mi padre lee el periódico cada mañana con el té.',
          },
          {
            en: 'I read the sports page and the local news.',
            native: 'Leo la página de deportes y las noticias locales.',
          },
          {
            en: 'Yesterday I read an interesting story about our town.',
            native: 'Ayer leí una noticia interesante sobre nuestra ciudad.',
          },
        ],
      },
      zh: {
        word: '报纸',
        question: '你读报纸吗？你最先读什么？',
        examples: [
          {
            en: 'My father reads the newspaper every morning with tea.',
            native: '我爸爸每天早上边喝茶边看报纸。',
          },
          {
            en: 'I read the sports page and the local news.',
            native: '我读体育版和本地新闻。',
          },
          {
            en: 'Yesterday I read an interesting story about our town.',
            native: '昨天我读了一条关于我们城市的有趣新闻。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'umbrella',
    questionText: 'Do you carry an umbrella? Talk about a rainy day.',
    translations: {
      te: {
        word: 'గొడుగు',
        question: 'మీరు గొడుగు తీసుకెళ్తారా? ఒక వర్షం పడిన రోజు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I always carry an umbrella in the rainy season.',
            native: 'వర్షాకాలంలో నేను ఎల్లప్పుడూ గొడుగు తీసుకెళ్తాను.',
          },
          {
            en: 'My umbrella is big, black, and very old.',
            native: 'నా గొడుగు పెద్దది, నల్లది, చాలా పాతది.',
          },
          {
            en: 'Last week it saved me from heavy rain.',
            native: 'గత వారం అది నన్ను భారీ వర్షం నుండి కాపాడింది.',
          },
        ],
      },
      hi: {
        word: 'छाता',
        question: 'क्या आप छाता लेकर चलते हैं? किसी बारिश वाले दिन के बारे में बताइए।',
        examples: [
          {
            en: 'I always carry an umbrella in the rainy season.',
            native: 'बारिश के मौसम में मैं हमेशा छाता लेकर चलता हूँ।',
          },
          {
            en: 'My umbrella is big, black, and very old.',
            native: 'मेरा छाता बड़ा, काला और बहुत पुराना है।',
          },
          {
            en: 'Last week it saved me from heavy rain.',
            native: 'पिछले हफ़्ते उसने मुझे मूसलाधार बारिश से बचाया।',
          },
        ],
      },
      es: {
        word: 'paraguas',
        question: '¿Llevas paraguas? Habla de un día de lluvia.',
        examples: [
          {
            en: 'I always carry an umbrella in the rainy season.',
            native: 'Siempre llevo un paraguas en la temporada de lluvias.',
          },
          {
            en: 'My umbrella is big, black, and very old.',
            native: 'Mi paraguas es grande, negro y muy viejo.',
          },
          {
            en: 'Last week it saved me from heavy rain.',
            native: 'La semana pasada me salvó de una lluvia fuerte.',
          },
        ],
      },
      zh: {
        word: '雨伞',
        question: '你带雨伞吗？谈谈一个下雨天。',
        examples: [
          {
            en: 'I always carry an umbrella in the rainy season.',
            native: '雨季我总是随身带伞。',
          },
          {
            en: 'My umbrella is big, black, and very old.',
            native: '我的伞又大又黑，而且非常旧。',
          },
          {
            en: 'Last week it saved me from heavy rain.',
            native: '上周它帮我躲过了大雨。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'taxi',
    questionText: 'Do you ever take a taxi? Talk about a taxi ride.',
    translations: {
      te: {
        word: 'టాక్సీ',
        question: 'మీరు ఎప్పుడైనా టాక్సీ తీసుకుంటారా? ఒక టాక్సీ ప్రయాణం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I take a taxi when it rains heavily.',
            native: 'భారీ వర్షం పడినప్పుడు నేను టాక్సీ తీసుకుంటాను.',
          },
          {
            en: 'Last night I took a taxi home from the station.',
            native: 'నిన్న రాత్రి నేను స్టేషన్ నుండి టాక్సీలో ఇంటికి వచ్చాను.',
          },
          {
            en: 'The driver was friendly and drove very safely.',
            native: 'డ్రైవర్ స్నేహపూర్వకంగా, చాలా జాగ్రత్తగా డ్రైవ్ చేశాడు.',
          },
        ],
      },
      hi: {
        word: 'टैक्सी',
        question: 'क्या आप कभी टैक्सी लेते हैं? किसी टैक्सी सफ़र के बारे में बताइए।',
        examples: [
          {
            en: 'I take a taxi when it rains heavily.',
            native: 'जब तेज़ बारिश होती है तो मैं टैक्सी लेता हूँ।',
          },
          {
            en: 'Last night I took a taxi home from the station.',
            native: 'कल रात मैं स्टेशन से टैक्सी से घर आया।',
          },
          {
            en: 'The driver was friendly and drove very safely.',
            native: 'ड्राइवर दोस्ताना था और बहुत सावधानी से गाड़ी चला रहा था।',
          },
        ],
      },
      es: {
        word: 'taxi',
        question: '¿Tomas algún taxi alguna vez? Habla de un viaje en taxi.',
        examples: [
          {
            en: 'I take a taxi when it rains heavily.',
            native: 'Tomo un taxi cuando llueve mucho.',
          },
          {
            en: 'Last night I took a taxi home from the station.',
            native: 'Anoche tomé un taxi a casa desde la estación.',
          },
          {
            en: 'The driver was friendly and drove very safely.',
            native: 'El conductor era amable y conducía con mucho cuidado.',
          },
        ],
      },
      zh: {
        word: '出租车',
        question: '你坐过出租车吗？谈谈一次坐出租车的经历。',
        examples: [
          {
            en: 'I take a taxi when it rains heavily.',
            native: '下大雨的时候我会坐出租车。',
          },
          {
            en: 'Last night I took a taxi home from the station.',
            native: '昨晚我从车站坐出租车回家。',
          },
          {
            en: 'The driver was friendly and drove very safely.',
            native: '司机很友好，开车非常稳。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'airport',
    questionText: 'Have you been to an airport? Talk about it.',
    translations: {
      te: {
        word: 'విమానాశ్రయం',
        question: 'మీరు విమానాశ్రయానికి వెళ్లారా? దాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I went to the airport to receive my uncle.',
            native: 'నేను నా మామయ్యను రిసీవ్ చేసుకోవడానికి విమానాశ్రయానికి వెళ్ళాను.',
          },
          {
            en: 'The airport was big, clean, and very busy.',
            native: 'విమానాశ్రయం పెద్దగా, శుభ్రంగా, చాలా రద్దీగా ఉంది.',
          },
          {
            en: 'We watched the planes take off and land.',
            native: 'మేము విమానాలు టేకాఫ్ అవ్వడం, ల్యాండ్ అవ్వడం చూశాము.',
          },
        ],
      },
      hi: {
        word: 'हवाई अड्डा',
        question: 'क्या आप किसी हवाई अड्डे पर गए हैं? इसके बारे में बताइए।',
        examples: [
          {
            en: 'I went to the airport to receive my uncle.',
            native: 'मैं अपने चाचा को लेने हवाई अड्डे पर गया।',
          },
          {
            en: 'The airport was big, clean, and very busy.',
            native: 'हवाई अड्डा बड़ा, साफ़ और बहुत भीड़भाड़ वाला था।',
          },
          {
            en: 'We watched the planes take off and land.',
            native: 'हमने हवाई जहाज़ उड़ान भरते और उतरते देखे।',
          },
        ],
      },
      es: {
        word: 'aeropuerto',
        question: '¿Has estado en un aeropuerto? Háblame de ello.',
        examples: [
          {
            en: 'I went to the airport to receive my uncle.',
            native: 'Fui al aeropuerto a recibir a mi tío.',
          },
          {
            en: 'The airport was big, clean, and very busy.',
            native: 'El aeropuerto era grande, limpio y muy concurrido.',
          },
          {
            en: 'We watched the planes take off and land.',
            native: 'Vimos los aviones despegar y aterrizar.',
          },
        ],
      },
      zh: {
        word: '机场',
        question: '你去过机场吗？谈谈那次经历。',
        examples: [
          {
            en: 'I went to the airport to receive my uncle.',
            native: '我去机场接我叔叔。',
          },
          {
            en: 'The airport was big, clean, and very busy.',
            native: '机场又大又干净，人很多。',
          },
          {
            en: 'We watched the planes take off and land.',
            native: '我们看了飞机起飞和降落。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'ticket',
    questionText: 'Talk about a time you bought a ticket for travel or a show.',
    translations: {
      te: {
        word: 'టికెట్',
        question: 'ప్రయాణం లేదా షో కోసం మీరు టికెట్ కొన్న ఒక సందర్భం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I bought a train ticket online last week.',
            native: 'గత వారం నేను ఆన్‌లైన్‌లో రైలు టికెట్ కొన్నాను.',
          },
          {
            en: 'The ticket was cheap because I booked early.',
            native: 'నేను ముందుగానే బుక్ చేశాను కాబట్టి టికెట్ చౌకగా వచ్చింది.',
          },
          {
            en: 'I kept the ticket safely in my bag.',
            native: 'నేను టికెట్‌ను నా బ్యాగులో జాగ్రత్తగా ఉంచాను.',
          },
        ],
      },
      hi: {
        word: 'टिकट',
        question: 'किसी यात्रा या शो के लिए टिकट खरीदने के किसी मौके के बारे में बताइए।',
        examples: [
          {
            en: 'I bought a train ticket online last week.',
            native: 'पिछले हफ़्ते मैंने ऑनलाइन ट्रेन की टिकट खरीदी।',
          },
          {
            en: 'The ticket was cheap because I booked early.',
            native: 'टिकट सस्ती थी क्योंकि मैंने जल्दी बुक कराई थी।',
          },
          {
            en: 'I kept the ticket safely in my bag.',
            native: 'मैंने टिकट अपने बैग में सुरक्षित रखी।',
          },
        ],
      },
      es: {
        word: 'billete',
        question: 'Habla de una vez que compraste un billete para un viaje o un espectáculo.',
        examples: [
          {
            en: 'I bought a train ticket online last week.',
            native: 'Compré un billete de tren por internet la semana pasada.',
          },
          {
            en: 'The ticket was cheap because I booked early.',
            native: 'El billete era barato porque reservé temprano.',
          },
          {
            en: 'I kept the ticket safely in my bag.',
            native: 'Guardé el billete con cuidado en mi bolsa.',
          },
        ],
      },
      zh: {
        word: '票',
        question: '谈谈你买旅行票或演出票的一次经历。',
        examples: [
          {
            en: 'I bought a train ticket online last week.',
            native: '上周我在网上买了一张火车票。',
          },
          {
            en: 'The ticket was cheap because I booked early.',
            native: '票很便宜，因为我订得早。',
          },
          {
            en: 'I kept the ticket safely in my bag.',
            native: '我把票小心地放在包里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'hotel',
    questionText: 'Talk about a hotel where you stayed.',
    translations: {
      te: {
        word: 'హోటల్',
        question: 'మీరు బస చేసిన ఒక హోటల్ గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'Last year we stayed in a small hotel near the sea.',
            native: 'గత సంవత్సరం మేము సముద్రం దగ్గర ఒక చిన్న హోటల్లో బస చేశాము.',
          },
          {
            en: 'My room was clean and had a nice view.',
            native: 'నా గది శుభ్రంగా ఉంది, మంచి దృశ్యం కనిపించింది.',
          },
          {
            en: 'The hotel served a good breakfast every morning.',
            native: 'హోటల్ ప్రతి ఉదయం మంచి అల్పాహారం అందించింది.',
          },
        ],
      },
      hi: {
        word: 'होटल',
        question: 'किसी ऐसे होटल के बारे में बताइए जहाँ आप ठहरे।',
        examples: [
          {
            en: 'Last year we stayed in a small hotel near the sea.',
            native: 'पिछले साल हम समुद्र के पास एक छोटे होटल में ठहरे।',
          },
          {
            en: 'My room was clean and had a nice view.',
            native: 'मेरा कमरा साफ़ था और वहाँ से अच्छा नज़ारा दिखता था।',
          },
          {
            en: 'The hotel served a good breakfast every morning.',
            native: 'होटल हर सुबह अच्छा नाश्ता परोसता था।',
          },
        ],
      },
      es: {
        word: 'hotel',
        question: 'Habla de un hotel donde te alojaste.',
        examples: [
          {
            en: 'Last year we stayed in a small hotel near the sea.',
            native: 'El año pasado nos alojamos en un hotel pequeño cerca del mar.',
          },
          {
            en: 'My room was clean and had a nice view.',
            native: 'Mi habitación estaba limpia y tenía una vista bonita.',
          },
          {
            en: 'The hotel served a good breakfast every morning.',
            native: 'El hotel servía un buen desayuno cada mañana.',
          },
        ],
      },
      zh: {
        word: '酒店',
        question: '谈谈你住过的一家酒店。',
        examples: [
          {
            en: 'Last year we stayed in a small hotel near the sea.',
            native: '去年我们住在海边的一家小酒店。',
          },
          {
            en: 'My room was clean and had a nice view.',
            native: '我的房间很干净，景色也不错。',
          },
          {
            en: 'The hotel served a good breakfast every morning.',
            native: '酒店每天早上提供美味的早餐。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'camping',
    questionText: 'Have you ever been camping? Would you like to try it?',
    translations: {
      te: {
        word: 'క్యాంపింగ్',
        question: 'మీరు ఎప్పుడైనా క్యాంపింగ్ చేశారా? మీరు దానిని ప్రయత్నించాలనుకుంటున్నారా?',
        examples: [
          {
            en: 'I went camping in the forest with my friends.',
            native: 'నేను నా స్నేహితులతో అడవిలో క్యాంపింగ్ చేశాను.',
          },
          {
            en: 'We slept in a tent and cooked on a fire.',
            native: 'మేము టెంటులో పడుకున్నాము, మంటపై వంట చేశాము.',
          },
          {
            en: 'Next summer I am going to camp near the river.',
            native: 'వచ్చే వేసవిలో నేను నది దగ్గర క్యాంపింగ్ చేయబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'कैंपिंग',
        question: 'क्या आप कभी कैंपिंग पर गए हैं? क्या आप इसे आज़माना चाहेंगे?',
        examples: [
          {
            en: 'I went camping in the forest with my friends.',
            native: 'मैं अपने दोस्तों के साथ जंगल में कैंपिंग पर गया।',
          },
          {
            en: 'We slept in a tent and cooked on a fire.',
            native: 'हम तंबू में सोए और आग पर खाना बनाया।',
          },
          {
            en: 'Next summer I am going to camp near the river.',
            native: 'अगली गर्मी में मैं नदी के पास कैंपिंग करने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'acampada',
        question: '¿Has ido de acampada alguna vez? ¿Te gustaría probarlo?',
        examples: [
          {
            en: 'I went camping in the forest with my friends.',
            native: 'Fui de acampada al bosque con mis amigos.',
          },
          {
            en: 'We slept in a tent and cooked on a fire.',
            native: 'Dormimos en una tienda y cocinamos en una hoguera.',
          },
          {
            en: 'Next summer I am going to camp near the river.',
            native: 'El próximo verano voy a acampar cerca del río.',
          },
        ],
      },
      zh: {
        word: '露营',
        question: '你露营过吗？你想试试吗？',
        examples: [
          {
            en: 'I went camping in the forest with my friends.',
            native: '我和朋友们去森林里露营过。',
          },
          {
            en: 'We slept in a tent and cooked on a fire.',
            native: '我们睡在帐篷里，在篝火上做饭。',
          },
          {
            en: 'Next summer I am going to camp near the river.',
            native: '明年夏天我打算去河边露营。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'cake',
    questionText: 'Do you like cake? When do you eat cake?',
    translations: {
      te: {
        word: 'కేకు',
        question: 'మీకు కేకు ఇష్టమా? మీరు ఎప్పుడు కేకు తింటారు?',
        examples: [
          {
            en: 'I love chocolate cake with cold vanilla ice cream.',
            native: 'చల్లటి వెనిలా ఐస్ క్రీంతో చాక్లెట్ కేకు నాకు చాలా ఇష్టం.',
          },
          {
            en: 'We eat cake at birthdays and family parties.',
            native: 'పుట్టినరోజులు, కుటుంబ వేడుకల్లో మేము కేకు తింటాము.',
          },
          {
            en: 'My sister baked a cake for me last Sunday.',
            native: 'గత ఆదివారం నా అక్కయ్య నా కోసం కేకు బేక్ చేసింది.',
          },
        ],
      },
      hi: {
        word: 'केक',
        question: 'क्या आपको केक पसंद है? आप कब केक खाते हैं?',
        examples: [
          {
            en: 'I love chocolate cake with cold vanilla ice cream.',
            native: 'मुझे ठंडी वनीला आइसक्रीम के साथ चॉकलेट केक बहुत पसंद है।',
          },
          {
            en: 'We eat cake at birthdays and family parties.',
            native: 'हम जन्मदिनों और पारिवारिक पार्टियों में केक खाते हैं।',
          },
          {
            en: 'My sister baked a cake for me last Sunday.',
            native: 'पिछले रविवार मेरी बहन ने मेरे लिए केक बेक किया।',
          },
        ],
      },
      es: {
        word: 'pastel',
        question: '¿Te gusta el pastel? ¿Cuándo comes pastel?',
        examples: [
          {
            en: 'I love chocolate cake with cold vanilla ice cream.',
            native: 'Me encanta el pastel de chocolate con helado de vainilla frío.',
          },
          {
            en: 'We eat cake at birthdays and family parties.',
            native: 'Comemos pastel en cumpleaños y fiestas familiares.',
          },
          {
            en: 'My sister baked a cake for me last Sunday.',
            native: 'Mi hermana me horneó un pastel el domingo pasado.',
          },
        ],
      },
      zh: {
        word: '蛋糕',
        question: '你喜欢蛋糕吗？你什么时候吃蛋糕？',
        examples: [
          {
            en: 'I love chocolate cake with cold vanilla ice cream.',
            native: '我非常喜欢巧克力蛋糕配冰的香草冰淇淋。',
          },
          {
            en: 'We eat cake at birthdays and family parties.',
            native: '我们在生日和家庭聚会上吃蛋糕。',
          },
          {
            en: 'My sister baked a cake for me last Sunday.',
            native: '上个星期天我姐姐为我烤了一个蛋糕。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'juice',
    questionText: 'What is your favourite juice? How often do you drink it?',
    translations: {
      te: {
        word: 'జ్యూస్',
        question: 'మీ ఇష్టమైన జ్యూస్ ఏది? మీరు దానిని ఎంత తరచుగా తాగుతారు?',
        examples: [
          {
            en: 'My favourite juice is fresh sweet orange juice.',
            native: 'నా ఇష్టమైన జ్యూస్ తాజా, తీయటి ఆరెంజ్ జ్యూస్.',
          },
          {
            en: 'I drink fruit juice after my evening walk.',
            native: 'సాయంత్రం నడక తర్వాత నేను పండ్ల జ్యూస్ తాగుతాను.',
          },
          {
            en: 'In summer I make cold mango juice at home.',
            native: 'వేసవిలో నేను ఇంట్లో చల్లటి మామిడి జ్యూస్ తయారు చేస్తాను.',
          },
        ],
      },
      hi: {
        word: 'जूस',
        question: 'आपका पसंदीदा जूस कौन सा है? आप इसे कितनी बार पीते हैं?',
        examples: [
          {
            en: 'My favourite juice is fresh sweet orange juice.',
            native: 'मेरा पसंदीदा जूस ताज़ा, मीठा संतरे का जूस है।',
          },
          {
            en: 'I drink fruit juice after my evening walk.',
            native: 'शाम की सैर के बाद मैं फलों का जूस पीता हूँ।',
          },
          {
            en: 'In summer I make cold mango juice at home.',
            native: 'गर्मियों में मैं घर पर ठंडा आम का जूस बनाता हूँ।',
          },
        ],
      },
      es: {
        word: 'jugo',
        question: '¿Cuál es tu jugo favorito? ¿Con qué frecuencia lo bebes?',
        examples: [
          {
            en: 'My favourite juice is fresh sweet orange juice.',
            native: 'Mi jugo favorito es el jugo de naranja fresco y dulce.',
          },
          {
            en: 'I drink fruit juice after my evening walk.',
            native: 'Bebo jugo de fruta después de mi paseo de la tarde.',
          },
          {
            en: 'In summer I make cold mango juice at home.',
            native: 'En verano hago jugo de mango frío en casa.',
          },
        ],
      },
      zh: {
        word: '果汁',
        question: '你最喜欢的果汁是什么？你多久喝一次？',
        examples: [
          {
            en: 'My favourite juice is fresh sweet orange juice.',
            native: '我最喜欢的果汁是新鲜香甜的橙汁。',
          },
          {
            en: 'I drink fruit juice after my evening walk.',
            native: '傍晚散步后我喝果汁。',
          },
          {
            en: 'In summer I make cold mango juice at home.',
            native: '夏天我在家做冰镇芒果汁。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'chocolate',
    questionText: 'Do you like chocolate? How often do you eat it?',
    translations: {
      te: {
        word: 'చాక్లెట్',
        question: 'మీకు చాక్లెట్ ఇష్టమా? మీరు దానిని ఎంత తరచుగా తింటారు?',
        examples: [
          {
            en: 'I like dark chocolate more than milk chocolate.',
            native: 'మిల్క్ చాక్లెట్ కంటే డార్క్ చాక్లెట్ నాకు ఎక్కువ ఇష్టం.',
          },
          {
            en: 'I eat a little chocolate on special days.',
            native: 'ప్రత్యేక రోజుల్లో నేను కొద్దిగా చాక్లెట్ తింటాను.',
          },
          {
            en: 'My friend gave me a box of chocolates yesterday.',
            native: 'నిన్న నా స్నేహితుడు నాకు ఒక పెట్టె చాక్లెట్లు ఇచ్చాడు.',
          },
        ],
      },
      hi: {
        word: 'चॉकलेट',
        question: 'क्या आपको चॉकलेट पसंद है? आप इसे कितनी बार खाते हैं?',
        examples: [
          {
            en: 'I like dark chocolate more than milk chocolate.',
            native: 'मुझे मिल्क चॉकलेट से ज़्यादा डार्क चॉकलेट पसंद है।',
          },
          {
            en: 'I eat a little chocolate on special days.',
            native: 'ख़ास दिनों में मैं थोड़ी चॉकलेट खाता हूँ।',
          },
          {
            en: 'My friend gave me a box of chocolates yesterday.',
            native: 'कल मेरे दोस्त ने मुझे चॉकलेट का एक डिब्बा दिया।',
          },
        ],
      },
      es: {
        word: 'chocolate',
        question: '¿Te gusta el chocolate? ¿Con qué frecuencia lo comes?',
        examples: [
          {
            en: 'I like dark chocolate more than milk chocolate.',
            native: 'Me gusta más el chocolate negro que el chocolate con leche.',
          },
          {
            en: 'I eat a little chocolate on special days.',
            native: 'Como un poco de chocolate en días especiales.',
          },
          {
            en: 'My friend gave me a box of chocolates yesterday.',
            native: 'Mi amigo me regaló una caja de bombones ayer.',
          },
        ],
      },
      zh: {
        word: '巧克力',
        question: '你喜欢巧克力吗？你多久吃一次？',
        examples: [
          {
            en: 'I like dark chocolate more than milk chocolate.',
            native: '比起牛奶巧克力，我更喜欢黑巧克力。',
          },
          {
            en: 'I eat a little chocolate on special days.',
            native: '我在特殊的日子里吃一点巧克力。',
          },
          {
            en: 'My friend gave me a box of chocolates yesterday.',
            native: '昨天我的朋友送了我一盒巧克力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'driver',
    questionText: 'Do you know a driver? Talk about driving in your town.',
    translations: {
      te: {
        word: 'డ్రైవర్',
        question: 'మీకు డ్రైవర్ తెలుసా? మీ పట్టణంలో డ్రైవింగ్ గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My neighbour is a bus driver in the city.',
            native: 'నా పొరుగువాడు నగరంలో బస్ డ్రైవర్.',
          },
          {
            en: 'He drives carefully and knows all the routes.',
            native: 'అతను జాగ్రత్తగా డ్రైవ్ చేస్తాడు, అన్ని మార్గాలు తెలుసు.',
          },
          {
            en: 'Drivers must be careful in the heavy rain.',
            native: 'భారీ వర్షంలో డ్రైవర్లు జాగ్రత్తగా ఉండాలి.',
          },
        ],
      },
      hi: {
        word: 'ड्राइवर',
        question: 'क्या आप किसी ड्राइवर को जानते हैं? अपने शहर में गाड़ी चलाने के बारे में बताइए।',
        examples: [
          {
            en: 'My neighbour is a bus driver in the city.',
            native: 'मेरा पड़ोसी शहर में बस ड्राइवर है।',
          },
          {
            en: 'He drives carefully and knows all the routes.',
            native: 'वह सावधानी से गाड़ी चलाता है और सारे रास्ते जानता है।',
          },
          {
            en: 'Drivers must be careful in the heavy rain.',
            native: 'तेज़ बारिश में ड्राइवरों को सावधान रहना चाहिए।',
          },
        ],
      },
      es: {
        word: 'conductor',
        question: '¿Conoces a un conductor? Habla de conducir en tu ciudad.',
        examples: [
          {
            en: 'My neighbour is a bus driver in the city.',
            native: 'Mi vecino es conductor de autobús en la ciudad.',
          },
          {
            en: 'He drives carefully and knows all the routes.',
            native: 'Conduce con cuidado y conoce todas las rutas.',
          },
          {
            en: 'Drivers must be careful in the heavy rain.',
            native: 'Los conductores deben tener cuidado con la lluvia fuerte.',
          },
        ],
      },
      zh: {
        word: '司机',
        question: '你认识司机吗？谈谈你所在城市的开车情况。',
        examples: [
          {
            en: 'My neighbour is a bus driver in the city.',
            native: '我的邻居是城里的公交车司机。',
          },
          {
            en: 'He drives carefully and knows all the routes.',
            native: '他开车很小心，认识所有的路线。',
          },
          {
            en: 'Drivers must be careful in the heavy rain.',
            native: '下大雨时司机们必须小心。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'farmer',
    questionText: "Do you know a farmer? Talk about a farmer's work.",
    translations: {
      te: {
        word: 'రైతు',
        question: 'మీకు రైతు తెలుసా? రైతు పని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My grandfather is a farmer in our village.',
            native: 'నా తాతయ్య మా గ్రామంలో రైతు.',
          },
          {
            en: 'He grows rice, vegetables, and sugarcane in his fields.',
            native: 'ఆయన తన పొలాల్లో వరి, కూరగాయలు, చెరకు పండిస్తారు.',
          },
          {
            en: 'Farmers work hard from early morning every day.',
            native: 'రైతులు ప్రతిరోజూ తెల్లవారుఝామున నుండి కష్టపడి పని చేస్తారు.',
          },
        ],
      },
      hi: {
        word: 'किसान',
        question: 'क्या आप किसी किसान को जानते हैं? किसान के काम के बारे में बताइए।',
        examples: [
          {
            en: 'My grandfather is a farmer in our village.',
            native: 'मेरे दादा हमारे गाँव में किसान हैं।',
          },
          {
            en: 'He grows rice, vegetables, and sugarcane in his fields.',
            native: 'वे अपने खेतों में धान, सब्ज़ियाँ और गन्ना उगाते हैं।',
          },
          {
            en: 'Farmers work hard from early morning every day.',
            native: 'किसान रोज़ सुबह-सुबह से कड़ी मेहनत करते हैं।',
          },
        ],
      },
      es: {
        word: 'agricultor',
        question: '¿Conoces a un agricultor? Habla del trabajo de un agricultor.',
        examples: [
          {
            en: 'My grandfather is a farmer in our village.',
            native: 'Mi abuelo es agricultor en nuestro pueblo.',
          },
          {
            en: 'He grows rice, vegetables, and sugarcane in his fields.',
            native: 'Cultiva arroz, verduras y caña de azúcar en sus campos.',
          },
          {
            en: 'Farmers work hard from early morning every day.',
            native: 'Los agricultores trabajan duro desde temprano cada día.',
          },
        ],
      },
      zh: {
        word: '农民',
        question: '你认识农民吗？谈谈农民的工作。',
        examples: [
          {
            en: 'My grandfather is a farmer in our village.',
            native: '我爷爷是我们村里的农民。',
          },
          {
            en: 'He grows rice, vegetables, and sugarcane in his fields.',
            native: '他在田里种水稻、蔬菜和甘蔗。',
          },
          {
            en: 'Farmers work hard from early morning every day.',
            native: '农民每天一大早就辛勤劳动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'uncle',
    questionText: 'Talk about your uncle. What does he do?',
    translations: {
      te: {
        word: 'మేనమామ',
        question: 'మీ మేనమామ గురించి మాట్లాడండి. ఆయన ఏమి చేస్తారు?',
        examples: [
          {
            en: 'My uncle lives in a flat near the market.',
            native: 'నా మేనమామ మార్కెట్ దగ్గర ఒక ఫ్లాట్‌లో నివసిస్తారు.',
          },
          {
            en: 'He works in a bank and likes gardening.',
            native: 'ఆయన బ్యాంకులో పని చేస్తారు, తోట పని ఇష్టపడతారు.',
          },
          {
            en: 'He visited us last week and brought sweets.',
            native: 'ఆయన గత వారం మమ్మల్ని కలిసి తీపిపదార్థాలు తెచ్చారు.',
          },
        ],
      },
      hi: {
        word: 'चाचा',
        question: 'अपने चाचा के बारे में बताइए। वे क्या करते हैं?',
        examples: [
          {
            en: 'My uncle lives in a flat near the market.',
            native: 'मेरे चाचा बाज़ार के पास एक फ़्लैट में रहते हैं।',
          },
          {
            en: 'He works in a bank and likes gardening.',
            native: 'वे बैंक में काम करते हैं और बाग़बानी पसंद करते हैं।',
          },
          {
            en: 'He visited us last week and brought sweets.',
            native: 'वे पिछले हफ़्ते हमसे मिले और मिठाइयाँ लाए।',
          },
        ],
      },
      es: {
        word: 'tío',
        question: 'Habla de tu tío. ¿A qué se dedica?',
        examples: [
          {
            en: 'My uncle lives in a flat near the market.',
            native: 'Mi tío vive en un piso cerca del mercado.',
          },
          {
            en: 'He works in a bank and likes gardening.',
            native: 'Trabaja en un banco y le gusta la jardinería.',
          },
          {
            en: 'He visited us last week and brought sweets.',
            native: 'Nos visitó la semana pasada y trajo dulces.',
          },
        ],
      },
      zh: {
        word: '叔叔',
        question: '谈谈你的叔叔。他是做什么的？',
        examples: [
          {
            en: 'My uncle lives in a flat near the market.',
            native: '我叔叔住在市场附近的一套公寓里。',
          },
          {
            en: 'He works in a bank and likes gardening.',
            native: '他在银行工作，喜欢园艺。',
          },
          {
            en: 'He visited us last week and brought sweets.',
            native: '他上周来看我们，还带了糖果。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'aunt',
    questionText: 'Talk about your aunt. What is she like?',
    translations: {
      te: {
        word: 'పిన్ని',
        question: 'మీ పిన్ని గురించి మాట్లాడండి. ఆమె ఎలా ఉంటారు?',
        examples: [
          {
            en: 'My aunt is a teacher in a primary school.',
            native: 'నా పిన్ని ఒక ప్రాథమిక పాఠశాలలో ఉపాధ్యాయిని.',
          },
          {
            en: 'She is kind and tells us funny stories.',
            native: 'ఆమె మంచిది, మాకు ఫన్నీ కథలు చెబుతుంది.',
          },
          {
            en: 'She cooked a special dinner for us yesterday.',
            native: 'ఆమె నిన్న మా కోసం ప్రత్యేకమైన భోజనం వండింది.',
          },
        ],
      },
      hi: {
        word: 'चाची',
        question: 'अपनी चाची के बारे में बताइए। वे कैसी हैं?',
        examples: [
          {
            en: 'My aunt is a teacher in a primary school.',
            native: 'मेरी चाची एक प्राथमिक विद्यालय में शिक्षिका हैं।',
          },
          {
            en: 'She is kind and tells us funny stories.',
            native: 'वे दयालु हैं और हमें मज़ेदार कहानियाँ सुनाती हैं।',
          },
          {
            en: 'She cooked a special dinner for us yesterday.',
            native: 'उन्होंने कल हमारे लिए ख़ास खाना बनाया।',
          },
        ],
      },
      es: {
        word: 'tía',
        question: 'Habla de tu tía. ¿Cómo es?',
        examples: [
          {
            en: 'My aunt is a teacher in a primary school.',
            native: 'Mi tía es maestra en una escuela primaria.',
          },
          {
            en: 'She is kind and tells us funny stories.',
            native: 'Es amable y nos cuenta historias divertidas.',
          },
          {
            en: 'She cooked a special dinner for us yesterday.',
            native: 'Nos cocinó una cena especial ayer.',
          },
        ],
      },
      zh: {
        word: '姑姑',
        question: '谈谈你的姑姑。她是什么样的人？',
        examples: [
          {
            en: 'My aunt is a teacher in a primary school.',
            native: '我姑姑是一所小学的老师。',
          },
          {
            en: 'She is kind and tells us funny stories.',
            native: '她很和蔼，给我们讲有趣的故事。',
          },
          {
            en: 'She cooked a special dinner for us yesterday.',
            native: '她昨天为我们做了一顿特别的晚餐。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'cousin',
    questionText: 'Talk about one of your cousins. What do you do together?',
    translations: {
      te: {
        word: 'కజిన్',
        question: 'మీ కజిన్ గురించి మాట్లాడండి. మీరు కలిసి ఏమి చేస్తారు?',
        examples: [
          {
            en: 'My cousin Ravi is the same age as me.',
            native: 'నా కజిన్ రవి నాతో ఒకే వయసు ఉన్నాడు.',
          },
          {
            en: 'We play cricket and watch films together on Sundays.',
            native: 'మేము ఆదివారాల్లో కలిసి క్రికెట్ ఆడతాము, సినిమాలు చూస్తాము.',
          },
          {
            en: 'He is going to visit me during the holidays.',
            native: 'అతను సెలవుల్లో నన్ను కలవడానికి రాబోతున్నాడు.',
          },
        ],
      },
      hi: {
        word: 'कज़िन',
        question: 'अपने किसी कज़िन के बारे में बताइए। आप साथ में क्या करते हैं?',
        examples: [
          {
            en: 'My cousin Ravi is the same age as me.',
            native: 'मेरा कज़िन रवि मुझ जितनी ही उम्र का है।',
          },
          {
            en: 'We play cricket and watch films together on Sundays.',
            native: 'हम रविवार को साथ क्रिकेट खेलते हैं और फ़िल्में देखते हैं।',
          },
          {
            en: 'He is going to visit me during the holidays.',
            native: 'वह छुट्टियों में मुझसे मिलने आने वाला है।',
          },
        ],
      },
      es: {
        word: 'primo',
        question: 'Habla de uno de tus primos. ¿Qué hacéis juntos?',
        examples: [
          {
            en: 'My cousin Ravi is the same age as me.',
            native: 'Mi primo Ravi tiene la misma edad que yo.',
          },
          {
            en: 'We play cricket and watch films together on Sundays.',
            native: 'Jugamos al críquet y vemos películas juntos los domingos.',
          },
          {
            en: 'He is going to visit me during the holidays.',
            native: 'Va a visitarme durante las vacaciones.',
          },
        ],
      },
      zh: {
        word: '表兄弟',
        question: '谈谈你的一个表兄弟。你们一起做什么？',
        examples: [
          {
            en: 'My cousin Ravi is the same age as me.',
            native: '我的表哥拉维和我同岁。',
          },
          {
            en: 'We play cricket and watch films together on Sundays.',
            native: '我们星期天一起打板球、看电影。',
          },
          {
            en: 'He is going to visit me during the holidays.',
            native: '假期里他要来看我。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'grandfather',
    questionText: 'Talk about your grandfather. What do you like about him?',
    translations: {
      te: {
        word: 'తాతయ్య',
        question: 'మీ తాతయ్య గురించి మాట్లాడండి. ఆయన గురించి మీకు ఏమి ఇష్టం?',
        examples: [
          {
            en: 'My grandfather is seventy years old and healthy.',
            native: 'నా తాతయ్యకు డెబ్బై సంవత్సరాలు, ఆయన ఆరోగ్యంగా ఉన్నారు.',
          },
          {
            en: 'He tells me stories about his childhood days.',
            native: 'ఆయన నాకు తన బాల్యం గురించి కథలు చెబుతారు.',
          },
          {
            en: 'Every morning he walks to the temple near home.',
            native: 'ప్రతి ఉదయం ఆయన ఇంటి దగ్గర ఉన్న దేవాలయానికి నడిచి వెళ్తారు.',
          },
        ],
      },
      hi: {
        word: 'दादा',
        question: 'अपने दादा के बारे में बताइए। आपको उनकी क्या बात पसंद है?',
        examples: [
          {
            en: 'My grandfather is seventy years old and healthy.',
            native: 'मेरे दादा सत्तर साल के हैं और स्वस्थ हैं।',
          },
          {
            en: 'He tells me stories about his childhood days.',
            native: 'वे मुझे अपने बचपन की कहानियाँ सुनाते हैं।',
          },
          {
            en: 'Every morning he walks to the temple near home.',
            native: 'हर सुबह वे घर के पास के मंदिर पैदल जाते हैं।',
          },
        ],
      },
      es: {
        word: 'abuelo',
        question: 'Habla de tu abuelo. ¿Qué te gusta de él?',
        examples: [
          {
            en: 'My grandfather is seventy years old and healthy.',
            native: 'Mi abuelo tiene setenta años y está sano.',
          },
          {
            en: 'He tells me stories about his childhood days.',
            native: 'Me cuenta historias sobre su infancia.',
          },
          {
            en: 'Every morning he walks to the temple near home.',
            native: 'Cada mañana camina hasta el templo cerca de casa.',
          },
        ],
      },
      zh: {
        word: '爷爷',
        question: '谈谈你的爷爷。你喜欢他什么？',
        examples: [
          {
            en: 'My grandfather is seventy years old and healthy.',
            native: '我爷爷七十岁了，身体很健康。',
          },
          {
            en: 'He tells me stories about his childhood days.',
            native: '他给我讲他童年的故事。',
          },
          {
            en: 'Every morning he walks to the temple near home.',
            native: '每天早上他步行去家附近的寺庙。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'grandmother',
    questionText: 'Talk about your grandmother. What does she do?',
    translations: {
      te: {
        word: 'అమ్మమ్మ',
        question: 'మీ అమ్మమ్మ గురించి మాట్లాడండి. ఆమె ఏమి చేస్తుంది?',
        examples: [
          {
            en: 'My grandmother lives with us in our house.',
            native: 'నా అమ్మమ్మ మా ఇంట్లో మాతో నివసిస్తుంది.',
          },
          {
            en: 'She cooks very tasty food for the family.',
            native: 'ఆమె కుటుంబం కోసం చాలా రుచికరమైన భోజనం వంటుతుంది.',
          },
          {
            en: 'She tells us many old stories at night.',
            native: 'ఆమె రాత్రి మాకు చాలా పాత కథలు చెబుతుంది.',
          },
        ],
      },
      hi: {
        word: 'दादी',
        question: 'अपनी दादी के बारे में बताइए। वे क्या करती हैं?',
        examples: [
          {
            en: 'My grandmother lives with us in our house.',
            native: 'मेरी दादी हमारे घर में हमारे साथ रहती हैं।',
          },
          {
            en: 'She cooks very tasty food for the family.',
            native: 'वे परिवार के लिए बहुत स्वादिष्ट खाना बनाती हैं।',
          },
          {
            en: 'She tells us many old stories at night.',
            native: 'वे रात में हमें कई पुरानी कहानियाँ सुनाती हैं।',
          },
        ],
      },
      es: {
        word: 'abuela',
        question: 'Habla de tu abuela. ¿Qué hace ella?',
        examples: [
          {
            en: 'My grandmother lives with us in our house.',
            native: 'Mi abuela vive con nosotros en nuestra casa.',
          },
          {
            en: 'She cooks very tasty food for the family.',
            native: 'Cocina comida muy rica para la familia.',
          },
          {
            en: 'She tells us many old stories at night.',
            native: 'Nos cuenta muchos cuentos antiguos por la noche.',
          },
        ],
      },
      zh: {
        word: '奶奶',
        question: '谈谈你的奶奶。她做些什么？',
        examples: [
          {
            en: 'My grandmother lives with us in our house.',
            native: '我奶奶和我们一起住在家里。',
          },
          {
            en: 'She cooks very tasty food for the family.',
            native: '她为家人做非常可口的饭菜。',
          },
          {
            en: 'She tells us many old stories at night.',
            native: '晚上她给我们讲很多古老的故事。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'baby',
    questionText: 'Is there a baby in your family? Talk about the baby.',
    translations: {
      te: {
        word: 'పాప',
        question: 'మీ కుటుంబంలో పాప ఉందా? ఆ పాప గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My sister has a cute little baby boy.',
            native: 'నా అక్కయ్యకు ఒక అందమైన చిన్న మగపిల్లాడు ఉన్నాడు.',
          },
          {
            en: 'The baby smiles at everyone and sleeps a lot.',
            native: 'ఆ పాప అందరిని చూసి నవ్వుతుంది, చాలా నిద్రపోతుంది.',
          },
          {
            en: 'I played with the baby all day yesterday.',
            native: 'నిన్న నేను పాపతో రోజంతా ఆడుకున్నాను.',
          },
        ],
      },
      hi: {
        word: 'शिशु',
        question: 'क्या आपके परिवार में कोई बच्चा है? उस बच्चे के बारे में बताइए।',
        examples: [
          {
            en: 'My sister has a cute little baby boy.',
            native: 'मेरी बहन का एक प्यारा छोटा बेटा है।',
          },
          {
            en: 'The baby smiles at everyone and sleeps a lot.',
            native: 'बच्चा सबको देखकर मुस्कुराता है और बहुत सोता है।',
          },
          {
            en: 'I played with the baby all day yesterday.',
            native: 'कल मैं बच्चे के साथ पूरा दिन खेला।',
          },
        ],
      },
      es: {
        word: 'bebé',
        question: '¿Hay un bebé en tu familia? Habla del bebé.',
        examples: [
          {
            en: 'My sister has a cute little baby boy.',
            native: 'Mi hermana tiene un bebé pequeño y bonito.',
          },
          {
            en: 'The baby smiles at everyone and sleeps a lot.',
            native: 'El bebé sonríe a todos y duerme mucho.',
          },
          {
            en: 'I played with the baby all day yesterday.',
            native: 'Ayer jugué con el bebé todo el día.',
          },
        ],
      },
      zh: {
        word: '宝宝',
        question: '你家里有宝宝吗？谈谈这个宝宝。',
        examples: [
          {
            en: 'My sister has a cute little baby boy.',
            native: '我姐姐有一个可爱的小男孩宝宝。',
          },
          {
            en: 'The baby smiles at everyone and sleeps a lot.',
            native: '宝宝见谁都笑，而且睡得很多。',
          },
          {
            en: 'I played with the baby all day yesterday.',
            native: '昨天我和宝宝玩了一整天。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'brother',
    questionText: 'Talk about your brother. What does he do?',
    translations: {
      te: {
        word: 'సోదరుడు',
        question: 'మీ సోదరుడు గురించి మాట్లాడండి. అతను ఏమి చేస్తాడు?',
        examples: [
          {
            en: 'My elder brother works in a big office.',
            native: 'నా అన్నయ్య ఒక పెద్ద ఆఫీసులో పని చేస్తాడు.',
          },
          {
            en: 'He likes playing cricket and watching old films.',
            native: 'అతను క్రికెట్ ఆడడం, పాత సినిమాలు చూడడం ఇష్టపడతాడు.',
          },
          {
            en: 'He helped me with my maths homework yesterday.',
            native: 'నిన్న అతను నా గణిత ఇంటిపనిలో నాకు సహాయం చేశాడు.',
          },
        ],
      },
      hi: {
        word: 'भाई',
        question: 'अपने भाई के बारे में बताइए। वह क्या करता है?',
        examples: [
          {
            en: 'My elder brother works in a big office.',
            native: 'मेरा बड़ा भाई एक बड़े दफ़्तर में काम करता है।',
          },
          {
            en: 'He likes playing cricket and watching old films.',
            native: 'उसे क्रिकेट खेलना और पुरानी फ़िल्में देखना पसंद है।',
          },
          {
            en: 'He helped me with my maths homework yesterday.',
            native: 'कल उसने मेरे गणित के होमवर्क में मेरी मदद की।',
          },
        ],
      },
      es: {
        word: 'hermano',
        question: 'Habla de tu hermano. ¿Qué hace?',
        examples: [
          {
            en: 'My elder brother works in a big office.',
            native: 'Mi hermano mayor trabaja en una oficina grande.',
          },
          {
            en: 'He likes playing cricket and watching old films.',
            native: 'Le gusta jugar al críquet y ver películas viejas.',
          },
          {
            en: 'He helped me with my maths homework yesterday.',
            native: 'Me ayudó con mi tarea de matemáticas ayer.',
          },
        ],
      },
      zh: {
        word: '哥哥',
        question: '谈谈你的哥哥。他是做什么的？',
        examples: [
          {
            en: 'My elder brother works in a big office.',
            native: '我哥哥在一间大办公室工作。',
          },
          {
            en: 'He likes playing cricket and watching old films.',
            native: '他喜欢打板球和看老电影。',
          },
          {
            en: 'He helped me with my maths homework yesterday.',
            native: '昨天他帮我辅导了数学作业。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'sister',
    questionText: 'Talk about your sister. What do you do together?',
    translations: {
      te: {
        word: 'చెల్లెలు',
        question: 'మీ చెల్లెలు గురించి మాట్లాడండి. మీరు కలిసి ఏమి చేస్తారు?',
        examples: [
          {
            en: 'My younger sister studies in class eight now.',
            native: 'నా చెల్లెలు ఇప్పుడు ఎనిమిదో తరగతి చదువుతుంది.',
          },
          {
            en: 'We cook together and share our small secrets.',
            native: 'మేము కలిసి వంట చేస్తాము, మా చిన్న రహస్యాలు పంచుకుంటాము.',
          },
          {
            en: 'She is going to learn swimming this summer.',
            native: 'ఆమె ఈ వేసవిలో ఈత నేర్చుకోబోతుంది.',
          },
        ],
      },
      hi: {
        word: 'बहन',
        question: 'अपनी बहन के बारे में बताइए। आप साथ में क्या करते हैं?',
        examples: [
          {
            en: 'My younger sister studies in class eight now.',
            native: 'मेरी छोटी बहन अब आठवीं कक्षा में पढ़ती है।',
          },
          {
            en: 'We cook together and share our small secrets.',
            native: 'हम साथ खाना बनाते हैं और अपने छोटे राज़ बाँटते हैं।',
          },
          {
            en: 'She is going to learn swimming this summer.',
            native: 'वह इस गर्मी में तैरना सीखने वाली है।',
          },
        ],
      },
      es: {
        word: 'hermana',
        question: 'Habla de tu hermana. ¿Qué hacéis juntas?',
        examples: [
          {
            en: 'My younger sister studies in class eight now.',
            native: 'Mi hermana pequeña estudia ahora en octavo curso.',
          },
          {
            en: 'We cook together and share our small secrets.',
            native: 'Cocinamos juntas y compartimos nuestros pequeños secretos.',
          },
          {
            en: 'She is going to learn swimming this summer.',
            native: 'Va a aprender a nadar este verano.',
          },
        ],
      },
      zh: {
        word: '妹妹',
        question: '谈谈你的妹妹。你们一起做什么？',
        examples: [
          {
            en: 'My younger sister studies in class eight now.',
            native: '我妹妹现在上八年级。',
          },
          {
            en: 'We cook together and share our small secrets.',
            native: '我们一起做饭，分享彼此的小秘密。',
          },
          {
            en: 'She is going to learn swimming this summer.',
            native: '今年夏天她打算学游泳。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'mother',
    questionText: 'Talk about your mother. What do you like about her?',
    translations: {
      te: {
        word: 'అమ్మ',
        question: 'మీ అమ్మ గురించి మాట్లాడండి. ఆమె గురించి మీకు ఏమి ఇష్టం?',
        examples: [
          {
            en: 'My mother gets up early and cooks for us.',
            native: 'నా అమ్మ త్వరగా లేచి మా కోసం వంట చేస్తుంది.',
          },
          {
            en: 'She sings very beautifully while she works at home.',
            native: 'ఆమె ఇంట్లో పని చేసేటప్పుడు చాలా అందంగా పాటలు పాడుతుంది.',
          },
          {
            en: 'I am going to buy her a gift next week.',
            native: 'వచ్చే వారం నేను ఆమెకు ఒక బహుమతి కొనబోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'माँ',
        question: 'अपनी माँ के बारे में बताइए। आपको उनकी क्या बात पसंद है?',
        examples: [
          {
            en: 'My mother gets up early and cooks for us.',
            native: 'मेरी माँ जल्दी उठती है और हमारे लिए खाना बनाती है।',
          },
          {
            en: 'She sings very beautifully while she works at home.',
            native: 'वे घर में काम करते समय बहुत सुंदर गाती है।',
          },
          {
            en: 'I am going to buy her a gift next week.',
            native: 'मैं अगले हफ़्ते उनके लिए एक तोहफ़ा खरीदने वाला हूँ।',
          },
        ],
      },
      es: {
        word: 'madre',
        question: 'Habla de tu madre. ¿Qué te gusta de ella?',
        examples: [
          {
            en: 'My mother gets up early and cooks for us.',
            native: 'Mi madre se levanta temprano y cocina para nosotros.',
          },
          {
            en: 'She sings very beautifully while she works at home.',
            native: 'Canta muy bonito mientras trabaja en casa.',
          },
          {
            en: 'I am going to buy her a gift next week.',
            native: 'Voy a comprarle un regalo la semana que viene.',
          },
        ],
      },
      zh: {
        word: '妈妈',
        question: '谈谈你的妈妈。你喜欢她什么？',
        examples: [
          {
            en: 'My mother gets up early and cooks for us.',
            native: '我妈妈起得很早，为我们做饭。',
          },
          {
            en: 'She sings very beautifully while she works at home.',
            native: '她在家干活时唱歌非常好听。',
          },
          {
            en: 'I am going to buy her a gift next week.',
            native: '下周我打算给她买一份礼物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A2',
    promptWord: 'father',
    questionText: 'Talk about your father. What does he do every day?',
    translations: {
      te: {
        word: 'నాన్న',
        question: 'మీ నాన్న గురించి మాట్లాడండి. ఆయన ప్రతిరోజూ ఏమి చేస్తారు?',
        examples: [
          {
            en: 'My father is a shopkeeper in our town.',
            native: 'నా నాన్న మా పట్టణంలో దుకాణదారు.',
          },
          {
            en: 'He works hard and comes home at night.',
            native: 'ఆయన కష్టపడి పని చేసి రాత్రి ఇంటికి వస్తారు.',
          },
          {
            en: 'On Sundays he takes us to the park.',
            native: 'ఆదివారాల్లో ఆయన మమ్మల్ని పార్కుకు తీసుకెళ్తారు.',
          },
        ],
      },
      hi: {
        word: 'पिता',
        question: 'अपने पिता के बारे में बताइए। वे रोज़ क्या करते हैं?',
        examples: [
          {
            en: 'My father is a shopkeeper in our town.',
            native: 'मेरे पिता हमारे शहर में दुकानदार हैं।',
          },
          {
            en: 'He works hard and comes home at night.',
            native: 'वे कड़ी मेहनत करते हैं और रात में घर आते हैं।',
          },
          {
            en: 'On Sundays he takes us to the park.',
            native: 'रविवार को वे हमें पार्क ले जाते हैं।',
          },
        ],
      },
      es: {
        word: 'padre',
        question: 'Habla de tu padre. ¿Qué hace todos los días?',
        examples: [
          {
            en: 'My father is a shopkeeper in our town.',
            native: 'Mi padre es tendero en nuestro pueblo.',
          },
          {
            en: 'He works hard and comes home at night.',
            native: 'Trabaja duro y vuelve a casa por la noche.',
          },
          {
            en: 'On Sundays he takes us to the park.',
            native: 'Los domingos nos lleva al parque.',
          },
        ],
      },
      zh: {
        word: '爸爸',
        question: '谈谈你的爸爸。他每天做什么？',
        examples: [
          {
            en: 'My father is a shopkeeper in our town.',
            native: '我爸爸是我们镇上的一位店主。',
          },
          {
            en: 'He works hard and comes home at night.',
            native: '他辛勤工作，晚上才回家。',
          },
          {
            en: 'On Sundays he takes us to the park.',
            native: '星期天他带我们去公园。',
          },
        ],
      },
    },
  },
];
