// Seed content: 6 speaking questions per CEFR level (36 total).
// Each question carries complete translations for te / hi / es / zh:
// the prompt word, the question, and 3 example answers (same English sentence
// across languages, `native` is its translation). Consumed by generate-seed.ts.

export interface LangTranslation {
  word: string;
  question: string;
  examples: { en: string; native: string }[];
}

export interface QuestionSeed {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  promptWord: string;
  questionText: string;
  translations: { te: LangTranslation; hi: LangTranslation; es: LangTranslation; zh: LangTranslation };
}

export const questions: QuestionSeed[] = [
  // ---------- A1 ----------
  {
    cefrLevel: 'A1',
    promptWord: 'family',
    questionText: 'Talk about your family. Who is in your family?',
    translations: {
      te: {
        word: 'కుటుంబం',
        question: 'మీ కుటుంబం గురించి మాట్లాడండి. మీ కుటుంబంలో ఎవరెవరు ఉన్నారు?',
        examples: [
          { en: 'There are four people in my family.', native: 'మా కుటుంబంలో నలుగురు ఉన్నారు.' },
          { en: 'My father is a farmer and my mother is a teacher.', native: 'మా నాన్న రైతు, మా అమ్మ ఉపాధ్యాయురాలు.' },
          {
            en: 'I have a younger brother and a younger sister.',
            native: 'నాకు ఒక తమ్ముడు మరియు ఒక చెల్లెలు ఉన్నారు.',
          },
        ],
      },
      hi: {
        word: 'परिवार',
        question: 'अपने परिवार के बारे में बताइए। आपके परिवार में कौन-कौन है?',
        examples: [
          { en: 'There are four people in my family.', native: 'मेरे परिवार में चार लोग हैं।' },
          {
            en: 'My father is a farmer and my mother is a teacher.',
            native: 'मेरे पिता किसान हैं और मेरी माँ शिक्षिका हैं।',
          },
          { en: 'I have a younger brother and a younger sister.', native: 'मेरा एक छोटा भाई और एक छोटी बहन है।' },
        ],
      },
      es: {
        word: 'familia',
        question: 'Habla de tu familia. ¿Quiénes están en tu familia?',
        examples: [
          { en: 'There are four people in my family.', native: 'En mi familia hay cuatro personas.' },
          {
            en: 'My father is a farmer and my mother is a teacher.',
            native: 'Mi padre es agricultor y mi madre es profesora.',
          },
          {
            en: 'I have a younger brother and a younger sister.',
            native: 'Tengo un hermano menor y una hermana menor.',
          },
        ],
      },
      zh: {
        word: '家庭',
        question: '谈谈你的家庭。你家里都有谁？',
        examples: [
          { en: 'There are four people in my family.', native: '我家有四口人。' },
          { en: 'My father is a farmer and my mother is a teacher.', native: '我爸爸是农民，我妈妈是老师。' },
          { en: 'I have a younger brother and a younger sister.', native: '我有一个弟弟和一个妹妹。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'food',
    questionText: 'What food do you like?',
    translations: {
      te: {
        word: 'ఆహారం',
        question: 'మీకు ఏ ఆహారం ఇష్టం?',
        examples: [
          { en: 'I like rice and vegetables.', native: 'నాకు అన్నం మరియు కూరగాయలు ఇష్టం.' },
          { en: 'My favourite food is chicken curry.', native: 'నా ఇష్టమైన ఆహారం చికెన్ కరీ.' },
          { en: 'I do not like very spicy food.', native: 'నాకు చాలా కారమైన ఆహారం ఇష్టం లేదు.' },
        ],
      },
      hi: {
        word: 'भोजन',
        question: 'आपको कौन सा भोजन पसंद है?',
        examples: [
          { en: 'I like rice and vegetables.', native: 'मुझे चावल और सब्ज़ियाँ पसंद हैं।' },
          { en: 'My favourite food is chicken curry.', native: 'मेरा पसंदीदा भोजन चिकन करी है।' },
          { en: 'I do not like very spicy food.', native: 'मुझे बहुत मसालेदार भोजन पसंद नहीं है।' },
        ],
      },
      es: {
        word: 'comida',
        question: '¿Qué comida te gusta?',
        examples: [
          { en: 'I like rice and vegetables.', native: 'Me gustan el arroz y las verduras.' },
          { en: 'My favourite food is chicken curry.', native: 'Mi comida favorita es el pollo al curry.' },
          { en: 'I do not like very spicy food.', native: 'No me gusta la comida muy picante.' },
        ],
      },
      zh: {
        word: '食物',
        question: '你喜欢什么食物？',
        examples: [
          { en: 'I like rice and vegetables.', native: '我喜欢米饭和蔬菜。' },
          { en: 'My favourite food is chicken curry.', native: '我最喜欢的食物是咖喱鸡。' },
          { en: 'I do not like very spicy food.', native: '我不喜欢很辣的食物。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'home',
    questionText: 'Describe your home.',
    translations: {
      te: {
        word: 'ఇల్లు',
        question: 'మీ ఇంటిని వివరించండి.',
        examples: [
          {
            en: 'I live in a small house with my parents.',
            native: 'నేను నా తల్లిదండ్రులతో ఒక చిన్న ఇంట్లో నివసిస్తాను.',
          },
          {
            en: 'My home has two bedrooms and a kitchen.',
            native: 'నా ఇంట్లో రెండు పడకగదులు మరియు ఒక వంటగది ఉన్నాయి.',
          },
          { en: 'There is a small garden in front of my house.', native: 'నా ఇంటి ముందు ఒక చిన్న తోట ఉంది.' },
        ],
      },
      hi: {
        word: 'घर',
        question: 'अपने घर का वर्णन कीजिए।',
        examples: [
          {
            en: 'I live in a small house with my parents.',
            native: 'मैं अपने माता-पिता के साथ एक छोटे घर में रहता हूँ।',
          },
          { en: 'My home has two bedrooms and a kitchen.', native: 'मेरे घर में दो शयनकक्ष और एक रसोई हैं।' },
          { en: 'There is a small garden in front of my house.', native: 'मेरे घर के सामने एक छोटा बगीचा है।' },
        ],
      },
      es: {
        word: 'hogar',
        question: 'Describe tu casa.',
        examples: [
          { en: 'I live in a small house with my parents.', native: 'Vivo en una casa pequeña con mis padres.' },
          { en: 'My home has two bedrooms and a kitchen.', native: 'Mi casa tiene dos dormitorios y una cocina.' },
          { en: 'There is a small garden in front of my house.', native: 'Hay un jardín pequeño frente a mi casa.' },
        ],
      },
      zh: {
        word: '家',
        question: '描述一下你的家。',
        examples: [
          { en: 'I live in a small house with my parents.', native: '我和父母住在一所小房子里。' },
          { en: 'My home has two bedrooms and a kitchen.', native: '我家有两间卧室和一间厨房。' },
          { en: 'There is a small garden in front of my house.', native: '我家门前有一个小花园。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'friend',
    questionText: 'Talk about your best friend.',
    translations: {
      te: {
        word: 'స్నేహితుడు',
        question: 'మీ అత్యంత స్నేహితుడి గురించి మాట్లాడండి.',
        examples: [
          { en: 'My best friend is Ravi.', native: 'నా అత్యంత స్నేహితుడు రవి.' },
          { en: 'He is kind and always helps me.', native: 'అతను దయగలవాడు మరియు ఎల్లప్పుడూ నాకు సహాయం చేస్తాడు.' },
          { en: 'We play cricket together every Sunday.', native: 'మేము ప్రతి ఆదివారం కలిసి క్రికెట్ ఆడుతాము.' },
        ],
      },
      hi: {
        word: 'दोस्त',
        question: 'अपने सबसे अच्छे दोस्त के बारे में बताइए।',
        examples: [
          { en: 'My best friend is Ravi.', native: 'मेरा सबसे अच्छा दोस्त रवि है।' },
          { en: 'He is kind and always helps me.', native: 'वह दयालु है और हमेशा मेरी मदद करता है।' },
          { en: 'We play cricket together every Sunday.', native: 'हम हर रविवार साथ में क्रिकेट खेलते हैं।' },
        ],
      },
      es: {
        word: 'amigo',
        question: 'Habla de tu mejor amigo.',
        examples: [
          { en: 'My best friend is Ravi.', native: 'Mi mejor amigo es Ravi.' },
          { en: 'He is kind and always helps me.', native: 'Él es amable y siempre me ayuda.' },
          { en: 'We play cricket together every Sunday.', native: 'Jugamos al críquet juntos todos los domingos.' },
        ],
      },
      zh: {
        word: '朋友',
        question: '谈谈你最好的朋友。',
        examples: [
          { en: 'My best friend is Ravi.', native: '我最好的朋友是拉维。' },
          { en: 'He is kind and always helps me.', native: '他很友善，总是帮助我。' },
          { en: 'We play cricket together every Sunday.', native: '我们每个星期天一起打板球。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'day',
    questionText: 'What do you do every day?',
    translations: {
      te: {
        word: 'రోజు',
        question: 'మీరు ప్రతిరోజూ ఏమి చేస్తారు?',
        examples: [
          { en: "I wake up at six o'clock every morning.", native: 'నేను ప్రతి రోజు ఉదయం ఆరు గంటలకు నిద్ర లేస్తాను.' },
          { en: 'I go to work by bus.', native: 'నేను బస్సులో పనికి వెళ్తాను.' },
          {
            en: 'In the evening, I watch television with my family.',
            native: 'సాయంత్రం, నేను నా కుటుంబంతో కలిసి టీవీ చూస్తాను.',
          },
        ],
      },
      hi: {
        word: 'दिन',
        question: 'आप रोज़ क्या करते हैं?',
        examples: [
          { en: "I wake up at six o'clock every morning.", native: 'मैं हर सुबह छह बजे उठता हूँ।' },
          { en: 'I go to work by bus.', native: 'मैं बस से काम पर जाता हूँ।' },
          {
            en: 'In the evening, I watch television with my family.',
            native: 'शाम को, मैं अपने परिवार के साथ टीवी देखता हूँ।',
          },
        ],
      },
      es: {
        word: 'día',
        question: '¿Qué haces todos los días?',
        examples: [
          { en: "I wake up at six o'clock every morning.", native: 'Me despierto a las seis todas las mañanas.' },
          { en: 'I go to work by bus.', native: 'Voy al trabajo en autobús.' },
          {
            en: 'In the evening, I watch television with my family.',
            native: 'Por la tarde, veo la televisión con mi familia.',
          },
        ],
      },
      zh: {
        word: '一天',
        question: '你每天做什么？',
        examples: [
          { en: "I wake up at six o'clock every morning.", native: '我每天早上六点起床。' },
          { en: 'I go to work by bus.', native: '我坐公交车去上班。' },
          { en: 'In the evening, I watch television with my family.', native: '晚上，我和家人一起看电视。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'hobby',
    questionText: 'What do you like to do in your free time?',
    translations: {
      te: {
        word: 'అభిరుచి',
        question: 'మీరు ఖాళీ సమయంలో ఏమి చేయడానికి ఇష్టపడతారు?',
        examples: [
          { en: 'I like reading books in my free time.', native: 'నా ఖాళీ సమయంలో పుస్తకాలు చదవడం నాకు ఇష్టం.' },
          { en: 'Sometimes I listen to music.', native: 'కొన్నిసార్లు నేను సంగీతం వింటాను.' },
          { en: 'My hobby is painting pictures of nature.', native: 'నా అభిరుచి ప్రకృతి చిత్రాలు గీయడం.' },
        ],
      },
      hi: {
        word: 'शौक',
        question: 'आप खाली समय में क्या करना पसंद करते हैं?',
        examples: [
          { en: 'I like reading books in my free time.', native: 'मुझे खाली समय में किताबें पढ़ना पसंद है।' },
          { en: 'Sometimes I listen to music.', native: 'कभी-कभी मैं संगीत सुनता हूँ।' },
          { en: 'My hobby is painting pictures of nature.', native: 'मेरा शौक प्रकृति के चित्र बनाना है।' },
        ],
      },
      es: {
        word: 'pasatiempo',
        question: '¿Qué te gusta hacer en tu tiempo libre?',
        examples: [
          { en: 'I like reading books in my free time.', native: 'Me gusta leer libros en mi tiempo libre.' },
          { en: 'Sometimes I listen to music.', native: 'A veces escucho música.' },
          {
            en: 'My hobby is painting pictures of nature.',
            native: 'Mi pasatiempo es pintar cuadros de la naturaleza.',
          },
        ],
      },
      zh: {
        word: '爱好',
        question: '你空闲时喜欢做什么？',
        examples: [
          { en: 'I like reading books in my free time.', native: '我空闲时喜欢读书。' },
          { en: 'Sometimes I listen to music.', native: '有时我听音乐。' },
          { en: 'My hobby is painting pictures of nature.', native: '我的爱好是画自然风景。' },
        ],
      },
    },
  },
  // ---------- A2 ----------
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
          { en: 'I watched a film with my friends on Saturday.', native: 'Vi una película con mis amigos el sábado.' },
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
          { en: 'Last weekend, I visited a village with my family.', native: '上个周末，我和家人一起去了一个村庄。' },
          { en: 'I watched a film with my friends on Saturday.', native: '星期六我和朋友们一起看了一部电影。' },
          { en: 'On Sunday, I cleaned my room and cooked dinner.', native: '星期天，我打扫了房间，还做了晚饭。' },
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
          { en: 'The air was fresh and the views were beautiful.', native: 'वहाँ हवा ताज़ा थी और नज़ारे खूबसूरत थे।' },
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
          { en: 'Last year, I visited the mountains with my family.', native: '去年，我和家人一起去了山区。' },
          { en: 'The air was fresh and the views were beautiful.', native: '那里空气清新，风景优美。' },
          { en: 'We stayed there for three days and took many photos.', native: '我们在那里待了三天，拍了很多照片。' },
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
          { en: 'I work in an office in the city centre.', native: 'నేను నగర మధ్యలో ఒక ఆఫీసులో పని చేస్తాను.' },
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
          { en: 'I work in an office in the city centre.', native: '我在市中心的一间办公室工作。' },
          { en: 'My job starts at nine and finishes at five.', native: '我九点上班，五点下班。' },
          { en: 'I answer emails and talk to customers every day.', native: '我每天回复邮件，和客户交谈。' },
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
          { en: 'Today the weather is hot and sunny.', native: 'ఈరోజు వాతావరణం వేడిగా మరియు ఎండగా ఉంది.' },
          { en: 'On rainy days, I stay at home and read.', native: 'వర్షం పడే రోజుల్లో, నేను ఇంట్లో ఉండి చదువుతాను.' },
          { en: 'I like drinking hot tea when it rains.', native: 'వర్షం పడినప్పుడు వేడి టీ తాగడం నాకు ఇష్టం.' },
        ],
      },
      hi: {
        word: 'मौसम',
        question: 'आज मौसम कैसा है? बारिश के दिनों में आप क्या करते हैं?',
        examples: [
          { en: 'Today the weather is hot and sunny.', native: 'आज मौसम गर्म और धूप वाला है।' },
          { en: 'On rainy days, I stay at home and read.', native: 'बारिश के दिनों में, मैं घर पर रहकर पढ़ता हूँ।' },
          { en: 'I like drinking hot tea when it rains.', native: 'बारिश होने पर मुझे गर्म चाय पीना पसंद है।' },
        ],
      },
      es: {
        word: 'clima',
        question: '¿Cómo está el clima hoy? ¿Qué haces en los días de lluvia?',
        examples: [
          { en: 'Today the weather is hot and sunny.', native: 'Hoy el clima es caluroso y soleado.' },
          { en: 'On rainy days, I stay at home and read.', native: 'En los días de lluvia, me quedo en casa y leo.' },
          { en: 'I like drinking hot tea when it rains.', native: 'Me gusta tomar té caliente cuando llueve.' },
        ],
      },
      zh: {
        word: '天气',
        question: '今天天气怎么样？下雨天你做什么？',
        examples: [
          { en: 'Today the weather is hot and sunny.', native: '今天天气炎热，阳光灿烂。' },
          { en: 'On rainy days, I stay at home and read.', native: '下雨天，我待在家里看书。' },
          { en: 'I like drinking hot tea when it rains.', native: '下雨时我喜欢喝热茶。' },
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
          { en: 'I like buying fresh fruit every week.', native: 'ప్రతి వారం తాజా పండ్లు కొనడం నాకు ఇష్టం.' },
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
          { en: 'I like buying fresh fruit every week.', native: 'मुझे हर हफ़्ते ताज़े फल खरीदना पसंद है।' },
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
          { en: 'I like buying fresh fruit every week.', native: 'Me gusta comprar fruta fresca cada semana.' },
          { en: 'Sometimes I shop online because it is easy.', native: 'A veces compro en línea porque es fácil.' },
        ],
      },
      zh: {
        word: '购物',
        question: '谈谈购物。你喜欢买什么？',
        examples: [
          { en: 'I usually buy clothes and shoes at the market.', native: '我通常在市场买衣服和鞋子。' },
          { en: 'I like buying fresh fruit every week.', native: '我喜欢每周买新鲜水果。' },
          { en: 'Sometimes I shop online because it is easy.', native: '有时我在网上购物，因为很方便。' },
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
          { en: 'I studied in a school near my village.', native: 'నేను మా ఊరి దగ్గర ఉన్న పాఠశాలలో చదివాను.' },
          { en: 'My favourite subject was mathematics.', native: 'నా ఇష్టమైన సబ్జెక్ట్ గణితం.' },
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
          { en: 'I studied in a school near my village.', native: 'मैंने अपने गाँव के पास के एक स्कूल में पढ़ाई की।' },
          { en: 'My favourite subject was mathematics.', native: 'मेरा पसंदीदा विषय गणित था।' },
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
          { en: 'I studied in a school near my village.', native: 'Estudié en una escuela cerca de mi pueblo.' },
          { en: 'My favourite subject was mathematics.', native: 'Mi materia favorita era matemáticas.' },
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
          { en: 'I studied in a school near my village.', native: '我在村子附近的一所学校上学。' },
          { en: 'My favourite subject was mathematics.', native: '我最喜欢的科目是数学。' },
          { en: 'I walked to school with my friends every morning.', native: '我每天早上和朋友们一起步行去上学。' },
        ],
      },
    },
  },
  // ---------- B1 ----------
  {
    cefrLevel: 'B1',
    promptWord: 'habit',
    questionText: 'Talk about a habit you want to change.',
    translations: {
      te: {
        word: 'అలవాటు',
        question: 'మీరు మార్చుకోవాలనుకుంటున్న ఒక అలవాటు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I want to stop using my phone late at night.',
            native: 'నేను రాత్రి ఆలస్యంగా ఫోన్ వాడడం ఆపాలనుకుంటున్నాను.',
          },
          {
            en: 'This habit makes me tired the next morning.',
            native: 'ఈ అలవాటు వల్ల మరుసటి రోజు ఉదయం నేను అలసిపోతాను.',
          },
          {
            en: 'I plan to read a book before sleeping instead.',
            native: 'బదులుగా నేను పడుకునే ముందు పుస్తకం చదవాలని ప్లాన్ చేస్తున్నాను.',
          },
        ],
      },
      hi: {
        word: 'आदत',
        question: 'किसी ऐसी आदत के बारे में बताइए जिसे आप बदलना चाहते हैं।',
        examples: [
          {
            en: 'I want to stop using my phone late at night.',
            native: 'मैं देर रात तक फ़ोन इस्तेमाल करना बंद करना चाहता हूँ।',
          },
          {
            en: 'This habit makes me tired the next morning.',
            native: 'इस आदत से मैं अगली सुबह थका हुआ महसूस करता हूँ।',
          },
          {
            en: 'I plan to read a book before sleeping instead.',
            native: 'मैं इसके बजाय सोने से पहले किताब पढ़ने की योजना बना रहा हूँ।',
          },
        ],
      },
      es: {
        word: 'hábito',
        question: 'Habla de un hábito que quieres cambiar.',
        examples: [
          {
            en: 'I want to stop using my phone late at night.',
            native: 'Quiero dejar de usar el teléfono hasta tarde por la noche.',
          },
          {
            en: 'This habit makes me tired the next morning.',
            native: 'Este hábito me hace sentir cansado a la mañana siguiente.',
          },
          {
            en: 'I plan to read a book before sleeping instead.',
            native: 'Planeo leer un libro antes de dormir en su lugar.',
          },
        ],
      },
      zh: {
        word: '习惯',
        question: '谈谈你想改变的一个习惯。',
        examples: [
          { en: 'I want to stop using my phone late at night.', native: '我想改掉深夜玩手机的习惯。' },
          { en: 'This habit makes me tired the next morning.', native: '这个习惯让我第二天早上感到疲惫。' },
          { en: 'I plan to read a book before sleeping instead.', native: '我打算睡前改为读书。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'movie',
    questionText: 'Describe a movie you enjoyed and explain why.',
    translations: {
      te: {
        word: 'సినిమా',
        question: 'మీరు ఆస్వాదించిన ఒక సినిమాను వివరించండి మరియు ఎందుకు నచ్చిందో వివరించండి.',
        examples: [
          {
            en: 'I recently watched a film about a young musician.',
            native: 'నేను ఇటీవల ఒక యువ సంగీతకారుడి గురించి ఒక సినిమా చూశాను.',
          },
          {
            en: 'The story was touching and the music was wonderful.',
            native: 'కథ హృదయాన్ని తాకేలా ఉంది మరియు సంగీతం అద్భుతంగా ఉంది.',
          },
          {
            en: 'I liked it because it taught me to follow my dreams.',
            native: 'నా కలలను అనుసరించాలని నాకు నేర్పింది కాబట్టి నాకు అది నచ్చింది.',
          },
        ],
      },
      hi: {
        word: 'फ़िल्म',
        question: 'आपको पसंद आई किसी फ़िल्म का वर्णन कीजिए और बताइए कि क्यों।',
        examples: [
          {
            en: 'I recently watched a film about a young musician.',
            native: 'मैंने हाल ही में एक युवा संगीतकार के बारे में एक फ़िल्म देखी।',
          },
          { en: 'The story was touching and the music was wonderful.', native: 'कहानी भावुक थी और संगीत अद्भुत था।' },
          {
            en: 'I liked it because it taught me to follow my dreams.',
            native: 'मुझे यह इसलिए पसंद आई क्योंकि इसने मुझे अपने सपनों का पीछा करना सिखाया।',
          },
        ],
      },
      es: {
        word: 'película',
        question: 'Describe una película que disfrutaste y explica por qué.',
        examples: [
          {
            en: 'I recently watched a film about a young musician.',
            native: 'Hace poco vi una película sobre un músico joven.',
          },
          {
            en: 'The story was touching and the music was wonderful.',
            native: 'La historia fue conmovedora y la música fue maravillosa.',
          },
          {
            en: 'I liked it because it taught me to follow my dreams.',
            native: 'Me gustó porque me enseñó a seguir mis sueños.',
          },
        ],
      },
      zh: {
        word: '电影',
        question: '描述一部你喜欢的电影并解释原因。',
        examples: [
          {
            en: 'I recently watched a film about a young musician.',
            native: '我最近看了一部关于一位年轻音乐家的电影。',
          },
          { en: 'The story was touching and the music was wonderful.', native: '故事感人，音乐也很棒。' },
          { en: 'I liked it because it taught me to follow my dreams.', native: '我喜欢它，因为它教会了我追随梦想。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'health',
    questionText: 'What do you do to stay healthy?',
    translations: {
      te: {
        word: 'ఆరోగ్యం',
        question: 'ఆరోగ్యంగా ఉండటానికి మీరు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I exercise for thirty minutes every morning.',
            native: 'నేను ప్రతి ఉదయం ముప్పై నిమిషాలు వ్యాయామం చేస్తాను.',
          },
          {
            en: 'I try to eat more fruit and less junk food.',
            native: 'నేను ఎక్కువ పండ్లు తినడానికి మరియు తక్కువ జంక్ ఫుడ్ తినడానికి ప్రయత్నిస్తాను.',
          },
          {
            en: 'Sleeping eight hours a night keeps me energetic.',
            native: 'రాత్రికి ఎనిమిది గంటలు నిద్రపోవడం నన్ను శక్తివంతంగా ఉంచుతుంది.',
          },
        ],
      },
      hi: {
        word: 'स्वास्थ्य',
        question: 'स्वस्थ रहने के लिए आप क्या करते हैं?',
        examples: [
          { en: 'I exercise for thirty minutes every morning.', native: 'मैं हर सुबह तीस मिनट व्यायाम करता हूँ।' },
          {
            en: 'I try to eat more fruit and less junk food.',
            native: 'मैं ज़्यादा फल और कम जंक फ़ूड खाने की कोशिश करता हूँ।',
          },
          {
            en: 'Sleeping eight hours a night keeps me energetic.',
            native: 'रात में आठ घंटे सोना मुझे ऊर्जावान रखता है।',
          },
        ],
      },
      es: {
        word: 'salud',
        question: '¿Qué haces para mantenerte saludable?',
        examples: [
          { en: 'I exercise for thirty minutes every morning.', native: 'Hago ejercicio treinta minutos cada mañana.' },
          {
            en: 'I try to eat more fruit and less junk food.',
            native: 'Intento comer más fruta y menos comida chatarra.',
          },
          {
            en: 'Sleeping eight hours a night keeps me energetic.',
            native: 'Dormir ocho horas por noche me mantiene con energía.',
          },
        ],
      },
      zh: {
        word: '健康',
        question: '你做什么来保持健康？',
        examples: [
          { en: 'I exercise for thirty minutes every morning.', native: '我每天早上锻炼三十分钟。' },
          { en: 'I try to eat more fruit and less junk food.', native: '我尽量多吃水果，少吃垃圾食品。' },
          { en: 'Sleeping eight hours a night keeps me energetic.', native: '每晚睡八个小时让我精力充沛。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'festival',
    questionText: 'Describe a festival you celebrate with your family.',
    translations: {
      te: {
        word: 'పండుగ',
        question: 'మీరు మీ కుటుంబంతో జరుపుకునే ఒక పండుగను వివరించండి.',
        examples: [
          {
            en: 'My favourite festival is Diwali, the festival of lights.',
            native: 'నా ఇష్టమైన పండుగ దీపావళి, వెలుగుల పండుగ.',
          },
          {
            en: 'We decorate our house and share sweets with neighbours.',
            native: 'మేము మా ఇంటిని అలంకరిస్తాము మరియు పక్కింటి వారితో స్వీట్లు పంచుకుంటాము.',
          },
          {
            en: 'In the evening, the whole family eats together and laughs a lot.',
            native: 'సాయంత్రం, కుటుంబం మొత్తం కలిసి భోజనం చేసి చాలా నవ్వుకుంటుంది.',
          },
        ],
      },
      hi: {
        word: 'त्योहार',
        question: 'उस त्योहार का वर्णन कीजिए जो आप अपने परिवार के साथ मनाते हैं।',
        examples: [
          {
            en: 'My favourite festival is Diwali, the festival of lights.',
            native: 'मेरा पसंदीदा त्योहार दीवाली है, रोशनी का त्योहार।',
          },
          {
            en: 'We decorate our house and share sweets with neighbours.',
            native: 'हम अपना घर सजाते हैं और पड़ोसियों के साथ मिठाइयाँ बाँटते हैं।',
          },
          {
            en: 'In the evening, the whole family eats together and laughs a lot.',
            native: 'शाम को, पूरा परिवार साथ खाना खाता है और खूब हँसता है।',
          },
        ],
      },
      es: {
        word: 'fiesta',
        question: 'Describe una fiesta que celebras con tu familia.',
        examples: [
          {
            en: 'My favourite festival is Diwali, the festival of lights.',
            native: 'Mi fiesta favorita es Diwali, el festival de las luces.',
          },
          {
            en: 'We decorate our house and share sweets with neighbours.',
            native: 'Decoramos nuestra casa y compartimos dulces con los vecinos.',
          },
          {
            en: 'In the evening, the whole family eats together and laughs a lot.',
            native: 'Por la noche, toda la familia cena junta y se ríe mucho.',
          },
        ],
      },
      zh: {
        word: '节日',
        question: '描述一个你和家人一起庆祝的节日。',
        examples: [
          {
            en: 'My favourite festival is Diwali, the festival of lights.',
            native: '我最喜欢的节日是排灯节，灯之节。',
          },
          { en: 'We decorate our house and share sweets with neighbours.', native: '我们装饰房子，和邻居分享糖果。' },
          {
            en: 'In the evening, the whole family eats together and laughs a lot.',
            native: '晚上，全家人一起吃饭，欢声笑语。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'technology',
    questionText: 'How does technology help you in your daily life?',
    translations: {
      te: {
        word: 'సాంకేతికత',
        question: 'మీ దైనందిన జీవితంలో సాంకేతికత మీకు ఎలా సహాయపడుతుంది?',
        examples: [
          {
            en: 'Technology helps me talk to family members who live far away.',
            native: 'దూరంగా నివసించే నా కుటుంబ సభ్యులతో మాట్లాడటానికి సాంకేతికత నాకు సహాయపడుతుంది.',
          },
          {
            en: 'I use my phone to pay bills and learn new things.',
            native: 'బిల్లులు చెల్లించడానికి మరియు కొత్త విషయాలు నేర్చుకోవడానికి నేను నా ఫోన్ వాడతాను.',
          },
          {
            en: 'Online maps help me find new places easily.',
            native: 'ఆన్‌లైన్ మ్యాప్‌లు కొత్త ప్రదేశాలను సులభంగా కనుగొనడానికి నాకు సహాయపడతాయి.',
          },
        ],
      },
      hi: {
        word: 'तकनीक',
        question: 'तकनीक आपके दैनिक जीवन में आपकी कैसे मदद करती है?',
        examples: [
          {
            en: 'Technology helps me talk to family members who live far away.',
            native: 'दूर रहने वाले मेरे परिवार के सदस्यों से बात करने में तकनीक मेरी मदद करती है।',
          },
          {
            en: 'I use my phone to pay bills and learn new things.',
            native: 'मैं बिल भरने और नई चीज़ें सीखने के लिए अपना फ़ोन इस्तेमाल करता हूँ।',
          },
          {
            en: 'Online maps help me find new places easily.',
            native: 'ऑनलाइन नक्शे मुझे आसानी से नई जगहें खोजने में मदद करते हैं।',
          },
        ],
      },
      es: {
        word: 'tecnología',
        question: '¿Cómo te ayuda la tecnología en tu vida diaria?',
        examples: [
          {
            en: 'Technology helps me talk to family members who live far away.',
            native: 'La tecnología me ayuda a hablar con familiares que viven lejos.',
          },
          {
            en: 'I use my phone to pay bills and learn new things.',
            native: 'Uso mi teléfono para pagar facturas y aprender cosas nuevas.',
          },
          {
            en: 'Online maps help me find new places easily.',
            native: 'Los mapas en línea me ayudan a encontrar lugares nuevos fácilmente.',
          },
        ],
      },
      zh: {
        word: '科技',
        question: '科技如何帮助你的日常生活？',
        examples: [
          {
            en: 'Technology helps me talk to family members who live far away.',
            native: '科技帮助我与住在远方的家人交流。',
          },
          { en: 'I use my phone to pay bills and learn new things.', native: '我用手机支付账单和学习新知识。' },
          { en: 'Online maps help me find new places easily.', native: '在线地图帮助我轻松找到新地方。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'childhood',
    questionText: 'Talk about a happy memory from your childhood.',
    translations: {
      te: {
        word: 'బాల్యం',
        question: 'మీ బాల్యంలోని ఒక సంతోషకరమైన జ్ఞాపకం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I remember flying kites on the roof with my relatives.',
            native: 'నా బంధువులతో కలిసి పైకప్పు మీద పతంగులు ఎగరవేసిన విషయం నాకు గుర్తుంది.',
          },
          {
            en: "During holidays, we visited our relatives' farm.",
            native: 'సెలవుల్లో, మేము మా బంధువుల పొలానికి వెళ్లాము.',
          },
          {
            en: 'Those simple days taught me the value of family.',
            native: 'ఆ సాధారణ రోజులు నాకు కుటుంబం విలువను నేర్పాయి.',
          },
        ],
      },
      hi: {
        word: 'बचपन',
        question: 'अपने बचपन की किसी खुशहाल याद के बारे में बताइए।',
        examples: [
          {
            en: 'I remember flying kites on the roof with my relatives.',
            native: 'मुझे अपने रिश्तेदारों के साथ छत पर पतंग उड़ाना याद है।',
          },
          {
            en: "During holidays, we visited our relatives' farm.",
            native: 'छुट्टियों में, हम अपने रिश्तेदारों के खेत जाते थे।',
          },
          {
            en: 'Those simple days taught me the value of family.',
            native: 'उन साधारण दिनों ने मुझे परिवार का महत्व सिखाया।',
          },
        ],
      },
      es: {
        word: 'infancia',
        question: 'Habla de un recuerdo feliz de tu infancia.',
        examples: [
          {
            en: 'I remember flying kites on the roof with my relatives.',
            native: 'Recuerdo volar cometas en el tejado con mis familiares.',
          },
          {
            en: "During holidays, we visited our relatives' farm.",
            native: 'Durante las vacaciones, visitábamos la granja de nuestros familiares.',
          },
          {
            en: 'Those simple days taught me the value of family.',
            native: 'Esos días sencillos me enseñaron el valor de la familia.',
          },
        ],
      },
      zh: {
        word: '童年',
        question: '谈谈你童年的一段快乐回忆。',
        examples: [
          {
            en: 'I remember flying kites on the roof with my relatives.',
            native: '我记得和亲戚们在屋顶上放风筝。',
          },
          { en: "During holidays, we visited our relatives' farm.", native: '假期里，我们会去亲戚家的农场。' },
          { en: 'Those simple days taught me the value of family.', native: '那些简单的日子教会了我家庭的价值。' },
        ],
      },
    },
  },
  // ---------- B2 ----------
  {
    cefrLevel: 'B2',
    promptWord: 'challenge',
    questionText: 'Describe a challenge you faced and how you overcame it.',
    translations: {
      te: {
        word: 'సవాలు',
        question: 'మీరు ఎదుర్కొన్న ఒక సవాలును మరియు దానిని ఎలా అధిగమించారో వివరించండి.',
        examples: [
          {
            en: 'My biggest challenge was speaking English in public.',
            native: 'నా పెద్ద సవాలు బహిరంగంగా ఇంగ్లీష్ మాట్లాడటం.',
          },
          {
            en: 'I practised every day with friends and recordings.',
            native: 'నేను ప్రతిరోజూ స్నేహితులతో మరియు రికార్డింగ్‌లతో ప్రాక్టీస్ చేశాను.',
          },
          {
            en: 'After six months, I gave a speech without fear.',
            native: 'ఆరు నెలల తర్వాత, నేను భయం లేకుండా ప్రసంగం ఇచ్చాను.',
          },
        ],
      },
      hi: {
        word: 'चुनौती',
        question: 'आपके सामने आई किसी चुनौती का वर्णन कीजिए और बताइए कि आपने उसे कैसे पार किया।',
        examples: [
          {
            en: 'My biggest challenge was speaking English in public.',
            native: 'मेरी सबसे बड़ी चुनौती सार्वजनिक रूप से अंग्रेज़ी बोलना था।',
          },
          {
            en: 'I practised every day with friends and recordings.',
            native: 'मैंने दोस्तों और रिकॉर्डिंग के साथ रोज़ अभ्यास किया।',
          },
          {
            en: 'After six months, I gave a speech without fear.',
            native: 'छह महीने बाद, मैंने बिना डर के भाषण दिया।',
          },
        ],
      },
      es: {
        word: 'desafío',
        question: 'Describe un desafío que enfrentaste y cómo lo superaste.',
        examples: [
          {
            en: 'My biggest challenge was speaking English in public.',
            native: 'Mi mayor desafío fue hablar inglés en público.',
          },
          {
            en: 'I practised every day with friends and recordings.',
            native: 'Practiqué todos los días con amigos y grabaciones.',
          },
          {
            en: 'After six months, I gave a speech without fear.',
            native: 'Después de seis meses, di un discurso sin miedo.',
          },
        ],
      },
      zh: {
        word: '挑战',
        question: '描述你面对过的一个挑战以及你如何克服它。',
        examples: [
          { en: 'My biggest challenge was speaking English in public.', native: '我最大的挑战是在公众面前说英语。' },
          { en: 'I practised every day with friends and recordings.', native: '我每天和朋友一起练习，还听录音。' },
          { en: 'After six months, I gave a speech without fear.', native: '六个月后，我毫无畏惧地做了一次演讲。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'environment',
    questionText: 'What can people do to protect the environment?',
    translations: {
      te: {
        word: 'పర్యావరణం',
        question: 'పర్యావరణాన్ని రక్షించడానికి ప్రజలు ఏమి చేయగలరు?',
        examples: [
          {
            en: 'People should use less plastic and recycle more.',
            native: 'ప్రజలు తక్కువ ప్లాస్టిక్ వాడాలి మరియు ఎక్కువ రీసైకిల్ చేయాలి.',
          },
          {
            en: 'Planting trees helps clean the air in our cities.',
            native: 'చెట్లు నాటడం మన నగరాల్లో గాలిని శుభ్రం చేయడానికి సహాయపడుతుంది.',
          },
          {
            en: 'Using public transport reduces pollution a lot.',
            native: 'ప్రజా రవాణా వాడటం కాలుష్యాన్ని చాలా తగ్గిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'पर्यावरण',
        question: 'पर्यावरण की रक्षा के लिए लोग क्या कर सकते हैं?',
        examples: [
          {
            en: 'People should use less plastic and recycle more.',
            native: 'लोगों को कम प्लास्टिक इस्तेमाल करना चाहिए और ज़्यादा रीसाइकिल करना चाहिए।',
          },
          {
            en: 'Planting trees helps clean the air in our cities.',
            native: 'पेड़ लगाने से हमारे शहरों की हवा साफ़ रहने में मदद मिलती है।',
          },
          {
            en: 'Using public transport reduces pollution a lot.',
            native: 'सार्वजनिक परिवहन के उपयोग से प्रदूषण बहुत कम होता है।',
          },
        ],
      },
      es: {
        word: 'medio ambiente',
        question: '¿Qué puede hacer la gente para proteger el medio ambiente?',
        examples: [
          {
            en: 'People should use less plastic and recycle more.',
            native: 'La gente debería usar menos plástico y reciclar más.',
          },
          {
            en: 'Planting trees helps clean the air in our cities.',
            native: 'Plantar árboles ayuda a limpiar el aire de nuestras ciudades.',
          },
          {
            en: 'Using public transport reduces pollution a lot.',
            native: 'Usar el transporte público reduce mucho la contaminación.',
          },
        ],
      },
      zh: {
        word: '环境',
        question: '人们可以做些什么来保护环境？',
        examples: [
          { en: 'People should use less plastic and recycle more.', native: '人们应该少用塑料，多回收利用。' },
          { en: 'Planting trees helps clean the air in our cities.', native: '植树有助于净化我们城市的空气。' },
          { en: 'Using public transport reduces pollution a lot.', native: '使用公共交通可以大大减少污染。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'culture',
    questionText: 'How is your culture different from others you know?',
    translations: {
      te: {
        word: 'సంస్కృతి',
        question: 'మీకు తెలిసిన ఇతర సంస్కృతులతో పోల్చుకుంటే మీ సంస్కృతి ఎలా భిన్నంగా ఉంది?',
        examples: [
          {
            en: 'Every culture has its own ways of welcoming guests and showing respect.',
            native: 'ప్రతి సంస్కృతిలో అతిథులను స్వాగతించడానికి, గౌరవం చూపడానికి దానికంటూ ప్రత్యేక పద్ధతులు ఉంటాయి.',
          },
          {
            en: 'Food traditions often vary between families, regions, and generations.',
            native: 'ఆహార సంప్రదాయాలు కుటుంబాలు, ప్రాంతాలు మరియు తరాల మధ్య తరచుగా మారుతుంటాయి.',
          },
          {
            en: 'Comparing celebrations can reveal different values without judging either culture.',
            native: 'ఏ సంస్కృతినీ తీర్పు చేయకుండా వేడుకలను పోల్చడం ద్వారా విభిన్న విలువలను తెలుసుకోవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'संस्कृति',
        question: 'आपकी संस्कृति आपकी जानकारी की अन्य संस्कृतियों से कैसे अलग है?',
        examples: [
          {
            en: 'Every culture has its own ways of welcoming guests and showing respect.',
            native: 'हर संस्कृति में मेहमानों का स्वागत करने और सम्मान दिखाने के अपने तरीके होते हैं।',
          },
          {
            en: 'Food traditions often vary between families, regions, and generations.',
            native: 'खान-पान की परंपराएँ अक्सर परिवारों, क्षेत्रों और पीढ़ियों के बीच अलग होती हैं।',
          },
          {
            en: 'Comparing celebrations can reveal different values without judging either culture.',
            native: 'समारोहों की तुलना से किसी भी संस्कृति को आँके बिना अलग-अलग मूल्यों को समझा जा सकता है।',
          },
        ],
      },
      es: {
        word: 'cultura',
        question: '¿En qué se diferencia tu cultura de otras que conoces?',
        examples: [
          {
            en: 'Every culture has its own ways of welcoming guests and showing respect.',
            native: 'Cada cultura tiene sus propias formas de recibir a los invitados y mostrar respeto.',
          },
          {
            en: 'Food traditions often vary between families, regions, and generations.',
            native: 'Las tradiciones culinarias suelen variar entre familias, regiones y generaciones.',
          },
          {
            en: 'Comparing celebrations can reveal different values without judging either culture.',
            native: 'Comparar celebraciones puede revelar valores diferentes sin juzgar ninguna cultura.',
          },
        ],
      },
      zh: {
        word: '文化',
        question: '你的文化与你了解的其他文化有何不同？',
        examples: [
          {
            en: 'Every culture has its own ways of welcoming guests and showing respect.',
            native: '每种文化都有自己欢迎客人和表达尊重的方式。',
          },
          {
            en: 'Food traditions often vary between families, regions, and generations.',
            native: '饮食传统往往因家庭、地区和世代而异。',
          },
          {
            en: 'Comparing celebrations can reveal different values without judging either culture.',
            native: '比较不同的庆祝活动，可以在不评判任何文化的情况下了解不同的价值观。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'education',
    questionText: "Do you think education changes a person's life? Why?",
    translations: {
      te: {
        word: 'విద్య',
        question: 'విద్య ఒక వ్యక్తి జీవితాన్ని మారుస్తుందని మీరు అనుకుంటున్నారా? ఎందుకు?',
        examples: [
          {
            en: 'Yes, education opens doors to better jobs.',
            native: 'అవును, విద్య మంచి ఉద్యోగాల వైపు తలుపులు తెరుస్తుంది.',
          },
          { en: 'It also teaches us how to think clearly.', native: 'ఇది స్పష్టంగా ఆలోచించడం కూడా నేర్పుతుంది.' },
          {
            en: 'My own studies helped me support my family.',
            native: 'నా స్వంత చదువు నా కుటుంబానికి మద్దతు ఇవ్వడంలో నాకు సహాయపడింది.',
          },
        ],
      },
      hi: {
        word: 'शिक्षा',
        question: 'क्या आपको लगता है कि शिक्षा किसी व्यक्ति का जीवन बदल देती है? क्यों?',
        examples: [
          {
            en: 'Yes, education opens doors to better jobs.',
            native: 'हाँ, शिक्षा बेहतर नौकरियों के दरवाज़े खोलती है।',
          },
          { en: 'It also teaches us how to think clearly.', native: 'यह हमें स्पष्ट रूप से सोचना भी सिखाती है।' },
          {
            en: 'My own studies helped me support my family.',
            native: 'मेरी अपनी पढ़ाई ने मुझे अपने परिवार की मदद करने में सहायता की।',
          },
        ],
      },
      es: {
        word: 'educación',
        question: '¿Crees que la educación cambia la vida de una persona? ¿Por qué?',
        examples: [
          {
            en: 'Yes, education opens doors to better jobs.',
            native: 'Sí, la educación abre puertas a mejores trabajos.',
          },
          { en: 'It also teaches us how to think clearly.', native: 'También nos enseña a pensar con claridad.' },
          {
            en: 'My own studies helped me support my family.',
            native: 'Mis propios estudios me ayudaron a mantener a mi familia.',
          },
        ],
      },
      zh: {
        word: '教育',
        question: '你认为教育会改变一个人的人生吗？为什么？',
        examples: [
          { en: 'Yes, education opens doors to better jobs.', native: '是的，教育为更好的工作打开了大门。' },
          { en: 'It also teaches us how to think clearly.', native: '它还教会我们如何清晰地思考。' },
          { en: 'My own studies helped me support my family.', native: '我自己的学习经历帮助我养活了家人。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'success',
    questionText: 'What does success mean to you?',
    translations: {
      te: {
        word: 'విజయం',
        question: 'మీకు విజయం అంటే ఏమిటి?',
        examples: [
          {
            en: 'For me, success means a peaceful and happy family.',
            native: 'నాకు, విజయం అంటే ప్రశాంతమైన మరియు సంతోషకరమైన కుటుంబం.',
          },
          { en: 'Money is useful, but health matters more.', native: 'డబ్బు ఉపయోగకరమే, కానీ ఆరోగ్యమే ముఖ్యం.' },
          { en: 'Success is doing work that helps other people.', native: 'ఇతరులకు సహాయం చేసే పని చేయడమే విజయం.' },
        ],
      },
      hi: {
        word: 'सफलता',
        question: 'आपके लिए सफलता का क्या मतलब है?',
        examples: [
          {
            en: 'For me, success means a peaceful and happy family.',
            native: 'मेरे लिए, सफलता का मतलब है शांतिपूर्ण और खुशहाल परिवार।',
          },
          {
            en: 'Money is useful, but health matters more.',
            native: 'पैसा उपयोगी है, लेकिन स्वास्थ्य ज़्यादा मायने रखता है।',
          },
          {
            en: 'Success is doing work that helps other people.',
            native: 'सफलता वह काम करना है जो दूसरों की मदद करता हो।',
          },
        ],
      },
      es: {
        word: 'éxito',
        question: '¿Qué significa el éxito para ti?',
        examples: [
          {
            en: 'For me, success means a peaceful and happy family.',
            native: 'Para mí, el éxito significa una familia tranquila y feliz.',
          },
          { en: 'Money is useful, but health matters more.', native: 'El dinero es útil, pero la salud importa más.' },
          {
            en: 'Success is doing work that helps other people.',
            native: 'El éxito es hacer un trabajo que ayude a otras personas.',
          },
        ],
      },
      zh: {
        word: '成功',
        question: '成功对你意味着什么？',
        examples: [
          {
            en: 'For me, success means a peaceful and happy family.',
            native: '对我来说，成功意味着一个安宁幸福的家庭。',
          },
          { en: 'Money is useful, but health matters more.', native: '金钱有用，但健康更重要。' },
          { en: 'Success is doing work that helps other people.', native: '成功就是做能帮助他人的工作。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'news',
    questionText: 'How do you usually get your news? Do you trust it?',
    translations: {
      te: {
        word: 'వార్తలు',
        question: 'మీరు సాధారణంగా వార్తలు ఎలా తెలుసుకుంటారు? మీరు వాటిని నమ్ముతారా?',
        examples: [
          {
            en: 'I usually read the news on my phone in the morning.',
            native: 'నేను సాధారణంగా ఉదయం నా ఫోన్‌లో వార్తలు చదువుతాను.',
          },
          {
            en: 'I trust major news organizations more than social media.',
            native: 'సోషల్ మీడియా కంటే ప్రధాన వార్తా సంస్థలను నేను ఎక్కువగా నమ్ముతాను.',
          },
          {
            en: 'Sometimes I check two sources before believing a story.',
            native: 'కొన్నిసార్లు ఒక వార్తను నమ్మే ముందు నేను రెండు సోర్సులను తనిఖీ చేస్తాను.',
          },
        ],
      },
      hi: {
        word: 'समाचार',
        question: 'आप आमतौर पर समाचार कैसे प्राप्त करते हैं? क्या आप उन पर भरोसा करते हैं?',
        examples: [
          {
            en: 'I usually read the news on my phone in the morning.',
            native: 'मैं आमतौर पर सुबह अपने फ़ोन पर समाचार पढ़ता हूँ।',
          },
          {
            en: 'I trust major news organizations more than social media.',
            native: 'मुझे सोशल मीडिया की तुलना में प्रमुख समाचार संस्थानों पर ज़्यादा भरोसा है।',
          },
          {
            en: 'Sometimes I check two sources before believing a story.',
            native: 'कभी-कभी मैं किसी ख़बर पर विश्वास करने से पहले दो स्रोत जाँचता हूँ।',
          },
        ],
      },
      es: {
        word: 'noticias',
        question: '¿Cómo sueles informarte? ¿Confías en las noticias?',
        examples: [
          {
            en: 'I usually read the news on my phone in the morning.',
            native: 'Normalmente leo las noticias en mi teléfono por la mañana.',
          },
          {
            en: 'I trust major news organizations more than social media.',
            native: 'Confío más en los principales medios de comunicación que en las redes sociales.',
          },
          {
            en: 'Sometimes I check two sources before believing a story.',
            native: 'A veces compruebo dos fuentes antes de creer una noticia.',
          },
        ],
      },
      zh: {
        word: '新闻',
        question: '你通常如何获取新闻？你相信这些新闻吗？',
        examples: [
          { en: 'I usually read the news on my phone in the morning.', native: '我通常早上在手机上看新闻。' },
          {
            en: 'I trust major news organizations more than social media.',
            native: '比起社交媒体，我更信任主流新闻机构。',
          },
          {
            en: 'Sometimes I check two sources before believing a story.',
            native: '有时我在相信一条新闻之前会查证两个来源。',
          },
        ],
      },
    },
  },
  // ---------- C1 ----------
  {
    cefrLevel: 'C1',
    promptWord: 'globalization',
    questionText: 'Discuss the effects of globalization on local cultures.',
    translations: {
      te: {
        word: 'ప్రపంచీకరణ',
        question: 'స్థానిక సంస్కృతులపై ప్రపంచీకరణ ప్రభావాలను చర్చించండి.',
        examples: [
          {
            en: 'Globalization connects cultures but can weaken local traditions.',
            native: 'ప్రపంచీకరణ సంస్కృతులను కలుపుతుంది కానీ స్థానిక సంప్రదాయాలను బలహీనపరచవచ్చు.',
          },
          {
            en: 'Young people often prefer global brands over local products.',
            native: 'యువత తరచుగా స్థానిక ఉత్పత్తుల కంటే ప్రపంచ బ్రాండ్లను ఇష్టపడతారు.',
          },
          {
            en: 'However, the internet also helps preserve endangered languages and traditional arts.',
            native: 'అయితే, అంతరించిపోతున్న భాషలను మరియు సంప్రదాయ కళలను కాపాడటానికి ఇంటర్నెట్ కూడా సహాయపడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'वैश्वीकरण',
        question: 'स्थानीय संस्कृतियों पर वैश्वीकरण के प्रभावों पर चर्चा कीजिए।',
        examples: [
          {
            en: 'Globalization connects cultures but can weaken local traditions.',
            native: 'वैश्वीकरण संस्कृतियों को जोड़ता है, लेकिन स्थानीय परंपराओं को कमज़ोर भी कर सकता है।',
          },
          {
            en: 'Young people often prefer global brands over local products.',
            native: 'युवा अक्सर स्थानीय उत्पादों की तुलना में वैश्विक ब्रांड पसंद करते हैं।',
          },
          {
            en: 'However, the internet also helps preserve endangered languages and traditional arts.',
            native: 'हालांकि, इंटरनेट लुप्तप्राय भाषाओं और पारंपरिक कलाओं को संरक्षित करने में भी मदद करता है।',
          },
        ],
      },
      es: {
        word: 'globalización',
        question: 'Analiza los efectos de la globalización en las culturas locales.',
        examples: [
          {
            en: 'Globalization connects cultures but can weaken local traditions.',
            native: 'La globalización conecta culturas, pero puede debilitar las tradiciones locales.',
          },
          {
            en: 'Young people often prefer global brands over local products.',
            native: 'Los jóvenes a menudo prefieren las marcas globales a los productos locales.',
          },
          {
            en: 'However, the internet also helps preserve endangered languages and traditional arts.',
            native: 'Sin embargo, internet también ayuda a preservar lenguas en peligro y artes tradicionales.',
          },
        ],
      },
      zh: {
        word: '全球化',
        question: '讨论全球化对本土文化的影响。',
        examples: [
          {
            en: 'Globalization connects cultures but can weaken local traditions.',
            native: '全球化连接了各种文化，但可能削弱当地传统。',
          },
          {
            en: 'Young people often prefer global brands over local products.',
            native: '年轻人往往更喜欢全球品牌而非本地产品。',
          },
          {
            en: 'However, the internet also helps preserve endangered languages and traditional arts.',
            native: '然而，互联网也有助于保护濒危语言和传统艺术。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'artificial intelligence',
    questionText: 'How do you think artificial intelligence will change our lives?',
    translations: {
      te: {
        word: 'కృత్రిమ మేధస్సు',
        question: 'కృత్రిమ మేధస్సు మన జీవితాలను ఎలా మారుస్తుందని మీరు అనుకుంటున్నారు?',
        examples: [
          {
            en: 'Artificial intelligence will automate many routine jobs.',
            native: 'కృత్రిమ మేధస్సు అనేక రొటీన్ పనులను స్వయంచాలకం చేస్తుంది.',
          },
          {
            en: 'It can help doctors detect diseases at an earlier stage.',
            native: 'ఇది వైద్యులకు వ్యాధులను ప్రారంభ దశలో గుర్తించడంలో సహాయపడగలదు.',
          },
          {
            en: 'We must ensure it is used fairly and safely.',
            native: 'ఇది న్యాయంగా మరియు సురక్షితంగా వాడబడుతుందని మనం నిర్ధారించుకోవాలి.',
          },
        ],
      },
      hi: {
        word: 'कृत्रिम बुद्धिमत्ता',
        question: 'आपको क्या लगता है कि कृत्रिम बुद्धिमत्ता हमारे जीवन को कैसे बदलेगी?',
        examples: [
          {
            en: 'Artificial intelligence will automate many routine jobs.',
            native: 'कृत्रिम बुद्धिमत्ता कई नियमित कामों को स्वचालित कर देगी।',
          },
          {
            en: 'It can help doctors detect diseases at an earlier stage.',
            native: 'यह डॉक्टरों को शुरुआती चरण में बीमारियों का पता लगाने में मदद कर सकती है।',
          },
          {
            en: 'We must ensure it is used fairly and safely.',
            native: 'हमें यह सुनिश्चित करना होगा कि इसका उपयोग निष्पक्ष और सुरक्षित रूप से हो।',
          },
        ],
      },
      es: {
        word: 'inteligencia artificial',
        question: '¿Cómo crees que la inteligencia artificial cambiará nuestras vidas?',
        examples: [
          {
            en: 'Artificial intelligence will automate many routine jobs.',
            native: 'La inteligencia artificial automatizará muchos trabajos rutinarios.',
          },
          {
            en: 'It can help doctors detect diseases at an earlier stage.',
            native: 'Puede ayudar a los médicos a detectar enfermedades en una etapa más temprana.',
          },
          {
            en: 'We must ensure it is used fairly and safely.',
            native: 'Debemos asegurarnos de que se use de manera justa y segura.',
          },
        ],
      },
      zh: {
        word: '人工智能',
        question: '你认为人工智能将如何改变我们的生活？',
        examples: [
          {
            en: 'Artificial intelligence will automate many routine jobs.',
            native: '人工智能将使许多日常工作自动化。',
          },
          {
            en: 'It can help doctors detect diseases at an earlier stage.',
            native: '它可以帮助医生更早发现疾病。',
          },
          { en: 'We must ensure it is used fairly and safely.', native: '我们必须确保它被公平、安全地使用。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'motivation',
    questionText: 'What motivates people to achieve their goals?',
    translations: {
      te: {
        word: 'ప్రేరణ',
        question: 'వారి లక్ష్యాలను చేరుకోవడానికి ప్రజలకు ఏమి ప్రేరణ ఇస్తుంది?',
        examples: [
          {
            en: 'Clear goals and small rewards keep people motivated.',
            native: 'స్పష్టమైన లక్ష్యాలు మరియు చిన్న బహుమతులు ప్రజలకు ప్రేరణ ఇస్తాయి.',
          },
          {
            en: 'Support from family gives people strength to continue.',
            native: 'కుటుంబం నుండి మద్దతు కొనసాగడానికి ప్రజలకు శక్తినిస్తుంది.',
          },
          {
            en: 'Fear of failure can motivate, but passion works better.',
            native: 'వైఫల్య భయం ప్రేరేపించవచ్చు, కానీ అభిరుచి బాగా పనిచేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'प्रेरणा',
        question: 'लोगों को उनके लक्ष्य हासिल करने के लिए क्या प्रेरित करता है?',
        examples: [
          {
            en: 'Clear goals and small rewards keep people motivated.',
            native: 'स्पष्ट लक्ष्य और छोटे पुरस्कार लोगों को प्रेरित रखते हैं।',
          },
          {
            en: 'Support from family gives people strength to continue.',
            native: 'परिवार का सहयोग लोगों को आगे बढ़ने की ताक़त देता है।',
          },
          {
            en: 'Fear of failure can motivate, but passion works better.',
            native: 'असफलता का डर प्रेरित कर सकता है, लेकिन जुनून बेहतर काम करता है।',
          },
        ],
      },
      es: {
        word: 'motivación',
        question: '¿Qué motiva a las personas a alcanzar sus metas?',
        examples: [
          {
            en: 'Clear goals and small rewards keep people motivated.',
            native: 'Las metas claras y las pequeñas recompensas mantienen motivada a la gente.',
          },
          {
            en: 'Support from family gives people strength to continue.',
            native: 'El apoyo de la familia da fuerzas para continuar.',
          },
          {
            en: 'Fear of failure can motivate, but passion works better.',
            native: 'El miedo al fracaso puede motivar, pero la pasión funciona mejor.',
          },
        ],
      },
      zh: {
        word: '动力',
        question: '是什么激励人们实现目标？',
        examples: [
          {
            en: 'Clear goals and small rewards keep people motivated.',
            native: '明确的目标和小小的奖励能让人保持动力。',
          },
          {
            en: 'Support from family gives people strength to continue.',
            native: '家人的支持给予人们继续前进的力量。',
          },
          {
            en: 'Fear of failure can motivate, but passion works better.',
            native: '对失败的恐惧可以激励人，但热情效果更好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'urbanization',
    questionText: 'What are the main benefits and challenges of urbanization?',
    translations: {
      te: {
        word: 'పట్టణీకరణ',
        question: 'పట్టణీకరణ వల్ల కలిగే ప్రధాన ప్రయోజనాలు మరియు సవాళ్లు ఏమిటి?',
        examples: [
          {
            en: 'Urbanization can create jobs and improve access to public services.',
            native: 'పట్టణీకరణ ఉద్యోగాలను సృష్టించి, ప్రజా సేవలకు ప్రాప్యతను మెరుగుపరచగలదు.',
          },
          {
            en: 'Rapid growth can increase housing costs, congestion, and pollution.',
            native: 'వేగవంతమైన వృద్ధి గృహ వ్యయాలు, ట్రాఫిక్ రద్దీ మరియు కాలుష్యాన్ని పెంచగలదు.',
          },
          {
            en: 'Good planning can make expanding cities more inclusive and sustainable.',
            native: 'మంచి ప్రణాళికతో విస్తరిస్తున్న నగరాలను మరింత సమ్మిళితంగా, సుస్థిరంగా మార్చవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'शहरीकरण',
        question: 'शहरीकरण के मुख्य लाभ और चुनौतियाँ क्या हैं?',
        examples: [
          {
            en: 'Urbanization can create jobs and improve access to public services.',
            native: 'शहरीकरण रोज़गार पैदा कर सकता है और सार्वजनिक सेवाओं तक पहुँच बेहतर बना सकता है।',
          },
          {
            en: 'Rapid growth can increase housing costs, congestion, and pollution.',
            native: 'तेज़ विकास आवास की लागत, यातायात की भीड़ और प्रदूषण बढ़ा सकता है।',
          },
          {
            en: 'Good planning can make expanding cities more inclusive and sustainable.',
            native: 'अच्छी योजना बढ़ते शहरों को अधिक समावेशी और सतत बना सकती है।',
          },
        ],
      },
      es: {
        word: 'urbanización',
        question: '¿Cuáles son los principales beneficios y desafíos de la urbanización?',
        examples: [
          {
            en: 'Urbanization can create jobs and improve access to public services.',
            native: 'La urbanización puede crear empleo y mejorar el acceso a los servicios públicos.',
          },
          {
            en: 'Rapid growth can increase housing costs, congestion, and pollution.',
            native: 'El crecimiento rápido puede aumentar el costo de la vivienda, la congestión y la contaminación.',
          },
          {
            en: 'Good planning can make expanding cities more inclusive and sustainable.',
            native:
              'Una buena planificación puede hacer que las ciudades en expansión sean más inclusivas y sostenibles.',
          },
        ],
      },
      zh: {
        word: '城市化',
        question: '城市化的主要益处和挑战是什么？',
        examples: [
          {
            en: 'Urbanization can create jobs and improve access to public services.',
            native: '城市化可以创造就业机会，并改善公共服务的可及性。',
          },
          {
            en: 'Rapid growth can increase housing costs, congestion, and pollution.',
            native: '快速发展可能推高住房成本，并加剧交通拥堵和污染。',
          },
          {
            en: 'Good planning can make expanding cities more inclusive and sustainable.',
            native: '良好的规划可以让不断扩张的城市更具包容性和可持续性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'privacy',
    questionText: 'Is privacy possible in the digital age? Give your views.',
    translations: {
      te: {
        word: 'గోప్యత',
        question: 'డిజిటల్ యుగంలో గోప్యత సాధ్యమేనా? మీ అభిప్రాయాలు తెలపండి.',
        examples: [
          {
            en: 'True privacy is difficult when apps collect our data.',
            native: 'యాప్‌లు మన డేటాను సేకరిస్తున్నప్పుడు నిజమైన గోప్యత కష్టం.',
          },
          {
            en: 'Strong passwords and laws can protect us partly.',
            native: 'బలమైన పాస్‌వర్డ్‌లు మరియు చట్టాలు మనల్ని పాక్షికంగా రక్షించగలవు.',
          },
          {
            en: 'I believe privacy is a right worth fighting for.',
            native: 'గోప్యత కోసం పోరాడదగిన హక్కు అని నేను నమ్ముతాను.',
          },
        ],
      },
      hi: {
        word: 'निजता',
        question: 'क्या डिजिटल युग में निजता संभव है? अपने विचार दीजिए।',
        examples: [
          {
            en: 'True privacy is difficult when apps collect our data.',
            native: 'जब ऐप्स हमारा डेटा इकट्ठा करते हैं, तो सच्ची निजता कठिन है।',
          },
          {
            en: 'Strong passwords and laws can protect us partly.',
            native: 'मज़बूत पासवर्ड और क़ानून हमें आंशिक रूप से बचा सकते हैं।',
          },
          {
            en: 'I believe privacy is a right worth fighting for.',
            native: 'मेरा मानना है कि निजता एक ऐसा अधिकार है जिसके लिए लड़ना सार्थक है।',
          },
        ],
      },
      es: {
        word: 'privacidad',
        question: '¿Es posible la privacidad en la era digital? Da tu opinión.',
        examples: [
          {
            en: 'True privacy is difficult when apps collect our data.',
            native: 'La verdadera privacidad es difícil cuando las aplicaciones recogen nuestros datos.',
          },
          {
            en: 'Strong passwords and laws can protect us partly.',
            native: 'Las contraseñas fuertes y las leyes pueden protegernos en parte.',
          },
          {
            en: 'I believe privacy is a right worth fighting for.',
            native: 'Creo que la privacidad es un derecho por el que vale la pena luchar.',
          },
        ],
      },
      zh: {
        word: '隐私',
        question: '在数字时代，隐私还有可能吗？谈谈你的看法。',
        examples: [
          {
            en: 'True privacy is difficult when apps collect our data.',
            native: '当应用程序收集我们的数据时，真正的隐私很难实现。',
          },
          { en: 'Strong passwords and laws can protect us partly.', native: '强密码和法律可以在一定程度上保护我们。' },
          { en: 'I believe privacy is a right worth fighting for.', native: '我相信隐私是一项值得为之奋斗的权利。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'work-life balance',
    questionText: 'How can people maintain a healthy work-life balance?',
    translations: {
      te: {
        word: 'పని-జీవిత సమతుల్యత',
        question: 'ప్రజలు ఆరోగ్యకరమైన పని-జీవిత సమతుల్యతను ఎలా కొనసాగించగలరు?',
        examples: [
          {
            en: 'People should set clear limits on working hours.',
            native: 'ప్రజలు పని గంటలపై స్పష్టమైన పరిమితులు విధించుకోవాలి.',
          },
          {
            en: 'Regular exercise and hobbies reduce work stress.',
            native: 'క్రమం తప్పకుండా వ్యాయామం మరియు అభిరుచులు పని ఒత్తిడిని తగ్గిస్తాయి.',
          },
          {
            en: "Employers must also respect employees' personal time.",
            native: 'యజమానులు కూడా ఉద్యోగుల వ్యక్తిగత సమయాన్ని గౌరవించాలి.',
          },
        ],
      },
      hi: {
        word: 'कार्य-जीवन संतुलन',
        question: 'लोग स्वस्थ कार्य-जीवन संतुलन कैसे बनाए रख सकते हैं?',
        examples: [
          {
            en: 'People should set clear limits on working hours.',
            native: 'लोगों को काम के घंटों पर स्पष्ट सीमाएँ तय करनी चाहिए।',
          },
          {
            en: 'Regular exercise and hobbies reduce work stress.',
            native: 'नियमित व्यायाम और शौक काम के तनाव को कम करते हैं।',
          },
          {
            en: "Employers must also respect employees' personal time.",
            native: 'नियोक्ताओं को भी कर्मचारियों के निजी समय का सम्मान करना चाहिए।',
          },
        ],
      },
      es: {
        word: 'equilibrio entre trabajo y vida',
        question: '¿Cómo pueden las personas mantener un equilibrio saludable entre trabajo y vida?',
        examples: [
          {
            en: 'People should set clear limits on working hours.',
            native: 'Las personas deberían poner límites claros a las horas de trabajo.',
          },
          {
            en: 'Regular exercise and hobbies reduce work stress.',
            native: 'El ejercicio regular y los pasatiempos reducen el estrés laboral.',
          },
          {
            en: "Employers must also respect employees' personal time.",
            native: 'Los empleadores también deben respetar el tiempo personal de los empleados.',
          },
        ],
      },
      zh: {
        word: '工作与生活的平衡',
        question: '人们如何保持健康的工作与生活平衡？',
        examples: [
          { en: 'People should set clear limits on working hours.', native: '人们应该为工作时间设定明确的界限。' },
          { en: 'Regular exercise and hobbies reduce work stress.', native: '定期锻炼和业余爱好可以减轻工作压力。' },
          { en: "Employers must also respect employees' personal time.", native: '雇主也必须尊重员工的私人时间。' },
        ],
      },
    },
  },
  // ---------- C2 ----------
  {
    cefrLevel: 'C2',
    promptWord: 'ethics',
    questionText: 'Should ethical considerations limit scientific progress? Discuss.',
    translations: {
      te: {
        word: 'నైతికత',
        question: 'శాస్త్రీయ పురోగతిని నైతిక పరిగణనలు పరిమితం చేయాలా? చర్చించండి.',
        examples: [
          {
            en: 'Ethics must guide science, not stop it completely.',
            native: 'నైతికత శాస్త్రానికి మార్గదర్శకత్వం వహించాలి, పూర్తిగా ఆపకూడదు.',
          },
          {
            en: 'History shows harmful experiments damage public trust.',
            native: 'హానికరమైన ప్రయోగాలు ప్రజా విశ్వాసానికి హాని చేస్తాయని చరిత్ర చూపిస్తుంది.',
          },
          {
            en: 'A balance between innovation and responsibility is essential.',
            native: 'ఆవిష్కరణ మరియు బాధ్యత మధ్య సమతుల్యత అవసరం.',
          },
        ],
      },
      hi: {
        word: 'नैतिकता',
        question: 'क्या नैतिक विचारों को वैज्ञानिक प्रगति को सीमित करना चाहिए? चर्चा कीजिए।',
        examples: [
          {
            en: 'Ethics must guide science, not stop it completely.',
            native: 'नैतिकता को विज्ञान का मार्गदर्शन करना चाहिए, उसे पूरी तरह रोकना नहीं।',
          },
          {
            en: 'History shows harmful experiments damage public trust.',
            native: 'इतिहास बताता है कि हानिकारक प्रयोग जनता के विश्वास को नुकसान पहुँचाते हैं।',
          },
          {
            en: 'A balance between innovation and responsibility is essential.',
            native: 'नवाचार और ज़िम्मेदारी के बीच संतुलन आवश्यक है।',
          },
        ],
      },
      es: {
        word: 'ética',
        question: '¿Deberían las consideraciones éticas limitar el progreso científico? Analízalo.',
        examples: [
          {
            en: 'Ethics must guide science, not stop it completely.',
            native: 'La ética debe guiar la ciencia, no detenerla por completo.',
          },
          {
            en: 'History shows harmful experiments damage public trust.',
            native: 'La historia muestra que los experimentos dañinos dañan la confianza pública.',
          },
          {
            en: 'A balance between innovation and responsibility is essential.',
            native: 'Es esencial un equilibrio entre innovación y responsabilidad.',
          },
        ],
      },
      zh: {
        word: '伦理',
        question: '伦理考量是否应该限制科学进步？请讨论。',
        examples: [
          { en: 'Ethics must guide science, not stop it completely.', native: '伦理应该引导科学，而不是完全阻止它。' },
          {
            en: 'History shows harmful experiments damage public trust.',
            native: '历史表明，有害的实验会损害公众信任。',
          },
          {
            en: 'A balance between innovation and responsibility is essential.',
            native: '创新与责任之间的平衡至关重要。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'democracy',
    questionText: 'What are the strengths and weaknesses of democracy?',
    translations: {
      te: {
        word: 'ప్రజాస్వామ్యం',
        question: 'ప్రజాస్వామ్యం యొక్క బలాలు మరియు బలహీనతలు ఏమిటి?',
        examples: [
          {
            en: 'Democracy gives citizens a voice in government.',
            native: 'ప్రజాస్వామ్యం ప్రభుత్వంలో పౌరులకు స్వరం ఇస్తుంది.',
          },
          {
            en: 'However, decisions can be slow and populism can mislead voters.',
            native: 'అయితే, నిర్ణయాలు నెమ్మదిగా ఉండవచ్చు మరియు ప్రజాలోలుకుత్వం ఓటర్లను తప్పుదారి పట్టించవచ్చు.',
          },
          {
            en: 'Despite its flaws, it remains the fairest system we know.',
            native: 'దాని లోపాలున్నా, ఇది మనకు తెలిసిన అత్యంత న్యాయమైన వ్యవస్థగానే ఉంది.',
          },
        ],
      },
      hi: {
        word: 'लोकतंत्र',
        question: 'लोकतंत्र की ताक़तें और कमज़ोरियाँ क्या हैं?',
        examples: [
          {
            en: 'Democracy gives citizens a voice in government.',
            native: 'लोकतंत्र नागरिकों को सरकार में आवाज़ देता है।',
          },
          {
            en: 'However, decisions can be slow and populism can mislead voters.',
            native: 'हालांकि, फ़ैसले धीमे हो सकते हैं और लोकलुभावनवाद मतदाताओं को भटका सकता है।',
          },
          {
            en: 'Despite its flaws, it remains the fairest system we know.',
            native: 'अपनी खामियों के बावजूद, यह हमारे ज्ञान की सबसे निष्पक्ष व्यवस्था बनी हुई है।',
          },
        ],
      },
      es: {
        word: 'democracia',
        question: '¿Cuáles son las fortalezas y debilidades de la democracia?',
        examples: [
          {
            en: 'Democracy gives citizens a voice in government.',
            native: 'La democracia da voz a los ciudadanos en el gobierno.',
          },
          {
            en: 'However, decisions can be slow and populism can mislead voters.',
            native: 'Sin embargo, las decisiones pueden ser lentas y el populismo puede engañar a los votantes.',
          },
          {
            en: 'Despite its flaws, it remains the fairest system we know.',
            native: 'A pesar de sus defectos, sigue siendo el sistema más justo que conocemos.',
          },
        ],
      },
      zh: {
        word: '民主',
        question: '民主的优点和缺点是什么？',
        examples: [
          { en: 'Democracy gives citizens a voice in government.', native: '民主让公民在政府中拥有发言权。' },
          {
            en: 'However, decisions can be slow and populism can mislead voters.',
            native: '然而，决策可能缓慢，民粹主义可能误导选民。',
          },
          {
            en: 'Despite its flaws, it remains the fairest system we know.',
            native: '尽管有缺陷，它仍然是我们所知的最公平的制度。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'identity',
    questionText: 'How does language shape our identity?',
    translations: {
      te: {
        word: 'గుర్తింపు',
        question: 'భాష మన గుర్తింపును ఎలా రూపొందిస్తుంది?',
        examples: [
          {
            en: 'Language carries our history, humour, and values.',
            native: 'భాష మన చరిత్రను, హాస్యాన్ని మరియు విలువలను మోసుకెళ్తుంది.',
          },
          {
            en: 'Speaking two languages lets me live in two worlds.',
            native: 'రెండు భాషలు మాట్లాడటం నన్ను రెండు ప్రపంచాల్లో జీవించనిస్తుంది.',
          },
          {
            en: 'When a language dies, a unique way of thinking dies too.',
            native: 'ఒక భాష చనిపోయినప్పుడు, అనన్యమైన ఆలోచనా విధానం కూడా చనిపోతుంది.',
          },
        ],
      },
      hi: {
        word: 'पहचान',
        question: 'भाषा हमारी पहचान को कैसे आकार देती है?',
        examples: [
          {
            en: 'Language carries our history, humour, and values.',
            native: 'भाषा हमारा इतिहास, हास्य और मूल्य अपने साथ लेकर चलती है।',
          },
          {
            en: 'Speaking two languages lets me live in two worlds.',
            native: 'दो भाषाएँ बोलना मुझे दो दुनियाओं में जीने देता है।',
          },
          {
            en: 'When a language dies, a unique way of thinking dies too.',
            native: 'जब कोई भाषा मरती है, तो सोचने का एक अनोखा तरीका भी मर जाता है।',
          },
        ],
      },
      es: {
        word: 'identidad',
        question: '¿Cómo da forma el idioma a nuestra identidad?',
        examples: [
          {
            en: 'Language carries our history, humour, and values.',
            native: 'El idioma lleva nuestra historia, nuestro humor y nuestros valores.',
          },
          {
            en: 'Speaking two languages lets me live in two worlds.',
            native: 'Hablar dos idiomas me permite vivir en dos mundos.',
          },
          {
            en: 'When a language dies, a unique way of thinking dies too.',
            native: 'Cuando una lengua muere, también muere una forma única de pensar.',
          },
        ],
      },
      zh: {
        word: '身份认同',
        question: '语言如何塑造我们的身份认同？',
        examples: [
          { en: 'Language carries our history, humour, and values.', native: '语言承载着我们的历史、幽默和价值观。' },
          { en: 'Speaking two languages lets me live in two worlds.', native: '会说两种语言让我能生活在两个世界里。' },
          {
            en: 'When a language dies, a unique way of thinking dies too.',
            native: '当一种语言消亡时，一种独特的思维方式也随之消亡。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'inequality',
    questionText: 'What are the root causes of inequality in society?',
    translations: {
      te: {
        word: 'అసమానత',
        question: 'సమాజంలో అసమానతకు మూల కారణాలు ఏమిటి?',
        examples: [
          { en: 'Unequal access to education is a major cause.', native: 'విద్యకు అసమాన అవకాశం ఒక ప్రధాన కారణం.' },
          {
            en: 'Inherited wealth keeps rich families ahead for generations.',
            native: 'వారసత్వ సంపద ధనిక కుటుంబాలను తరతరాలుగా ముందుంచుతుంది.',
          },
          {
            en: 'Discrimination in employment and healthcare can deepen inequality.',
            native: 'ఉద్యోగాలు మరియు ఆరోగ్య సంరక్షణలో వివక్ష అసమానతను మరింత పెంచగలదు.',
          },
        ],
      },
      hi: {
        word: 'असमानता',
        question: 'समाज में असमानता के मूल कारण क्या हैं?',
        examples: [
          { en: 'Unequal access to education is a major cause.', native: 'शिक्षा तक असमान पहुँच एक प्रमुख कारण है।' },
          {
            en: 'Inherited wealth keeps rich families ahead for generations.',
            native: 'विरासत में मिली संपत्ति अमीर परिवारों को पीढ़ियों तक आगे रखती है।',
          },
          {
            en: 'Discrimination in employment and healthcare can deepen inequality.',
            native: 'रोज़गार और स्वास्थ्य सेवा में भेदभाव असमानता को और बढ़ा सकता है।',
          },
        ],
      },
      es: {
        word: 'desigualdad',
        question: '¿Cuáles son las causas fundamentales de la desigualdad en la sociedad?',
        examples: [
          {
            en: 'Unequal access to education is a major cause.',
            native: 'El acceso desigual a la educación es una causa importante.',
          },
          {
            en: 'Inherited wealth keeps rich families ahead for generations.',
            native: 'La riqueza heredada mantiene a las familias ricas por delante durante generaciones.',
          },
          {
            en: 'Discrimination in employment and healthcare can deepen inequality.',
            native: 'La discriminación en el empleo y la atención sanitaria puede agravar la desigualdad.',
          },
        ],
      },
      zh: {
        word: '不平等',
        question: '社会不平等的根源是什么？',
        examples: [
          { en: 'Unequal access to education is a major cause.', native: '教育机会不均等是一个主要原因。' },
          {
            en: 'Inherited wealth keeps rich families ahead for generations.',
            native: '继承的财富让富裕家庭世代领先。',
          },
          {
            en: 'Discrimination in employment and healthcare can deepen inequality.',
            native: '就业和医疗领域的歧视会加剧不平等。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'sustainability',
    questionText: 'Can economic growth and sustainability coexist? Explain.',
    translations: {
      te: {
        word: 'సుస్థిరత',
        question: 'ఆర్థిక వృద్ధి మరియు సుస్థిరత కలిసి కొనసాగగలవా? వివరించండి.',
        examples: [
          {
            en: 'Yes, if growth relies on clean energy and uses resources responsibly.',
            native: 'అవును, వృద్ధి శుభ్రమైన శక్తిపై ఆధారపడి, వనరులను బాధ్యతాయుతంగా ఉపయోగిస్తే సాధ్యమవుతుంది.',
          },
          {
            en: 'Green technology creates jobs while protecting nature.',
            native: 'హరిత సాంకేతికత ప్రకృతిని రక్షిస్తూ ఉద్యోగాలను సృష్టిస్తుంది.',
          },
          {
            en: 'Without limits, growth will destroy the planet we depend on.',
            native: 'పరిమితులు లేకుండా, వృద్ధి మనం ఆధారపడే గ్రహాన్ని నాశనం చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'सततता',
        question: 'क्या आर्थिक विकास और सततता साथ-साथ चल सकते हैं? समझाइए।',
        examples: [
          {
            en: 'Yes, if growth relies on clean energy and uses resources responsibly.',
            native: 'हाँ, अगर विकास स्वच्छ ऊर्जा पर निर्भर हो और संसाधनों का ज़िम्मेदारी से उपयोग करे।',
          },
          {
            en: 'Green technology creates jobs while protecting nature.',
            native: 'हरित तकनीक प्रकृति की रक्षा करते हुए रोज़गार पैदा करती है।',
          },
          {
            en: 'Without limits, growth will destroy the planet we depend on.',
            native: 'बिना सीमाओं के, विकास उस ग्रह को नष्ट कर देगा जिस पर हम निर्भर हैं।',
          },
        ],
      },
      es: {
        word: 'sostenibilidad',
        question: '¿Pueden coexistir el crecimiento económico y la sostenibilidad? Explícalo.',
        examples: [
          {
            en: 'Yes, if growth relies on clean energy and uses resources responsibly.',
            native: 'Sí, si el crecimiento depende de energía limpia y usa los recursos de manera responsable.',
          },
          {
            en: 'Green technology creates jobs while protecting nature.',
            native: 'La tecnología verde crea empleos mientras protege la naturaleza.',
          },
          {
            en: 'Without limits, growth will destroy the planet we depend on.',
            native: 'Sin límites, el crecimiento destruirá el planeta del que dependemos.',
          },
        ],
      },
      zh: {
        word: '可持续发展',
        question: '经济增长与可持续发展能否共存？请解释。',
        examples: [
          {
            en: 'Yes, if growth relies on clean energy and uses resources responsibly.',
            native: '可以，只要增长依靠清洁能源并负责任地利用资源。',
          },
          {
            en: 'Green technology creates jobs while protecting nature.',
            native: '绿色技术在保护自然的同时创造就业。',
          },
          {
            en: 'Without limits, growth will destroy the planet we depend on.',
            native: '如果没有限制，增长将摧毁我们赖以生存的地球。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'philosophy',
    questionText: 'What role does philosophy play in modern life?',
    translations: {
      te: {
        word: 'తత్వశాస్త్రం',
        question: 'ఆధునిక జీవితంలో తత్వశాస్త్రం ఏ పాత్ర పోషిస్తుంది?',
        examples: [
          {
            en: 'Philosophy teaches us to question what we assume.',
            native: 'మనం ఊహించిన దానిని ప్రశ్నించడానికి తత్వశాస్త్రం నేర్పుతుంది.',
          },
          {
            en: 'It helps us make ethical choices in new technology.',
            native: 'కొత్త సాంకేతికతలో నైతిక ఎంపికలు చేయడానికి ఇది సహాయపడుతుంది.',
          },
          {
            en: 'In a busy world, it reminds us to reflect on meaning.',
            native: 'బిజీగా ఉన్న ప్రపంచంలో, అర్థం గురించి ఆలోచించమని ఇది గుర్తు చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'दर्शनशास्त्र',
        question: 'आधुनिक जीवन में दर्शनशास्त्र क्या भूमिका निभाता है?',
        examples: [
          {
            en: 'Philosophy teaches us to question what we assume.',
            native: 'दर्शनशास्त्र हमें अपनी मान्यताओं पर सवाल उठाना सिखाता है।',
          },
          {
            en: 'It helps us make ethical choices in new technology.',
            native: 'यह नई तकनीक में नैतिक चुनाव करने में हमारी मदद करता है।',
          },
          {
            en: 'In a busy world, it reminds us to reflect on meaning.',
            native: 'व्यस्त दुनिया में, यह हमें अर्थ पर विचार करने की याद दिलाता है।',
          },
        ],
      },
      es: {
        word: 'filosofía',
        question: '¿Qué papel juega la filosofía en la vida moderna?',
        examples: [
          {
            en: 'Philosophy teaches us to question what we assume.',
            native: 'La filosofía nos enseña a cuestionar lo que damos por sentado.',
          },
          {
            en: 'It helps us make ethical choices in new technology.',
            native: 'Nos ayuda a tomar decisiones éticas en las nuevas tecnologías.',
          },
          {
            en: 'In a busy world, it reminds us to reflect on meaning.',
            native: 'En un mundo ocupado, nos recuerda reflexionar sobre el sentido.',
          },
        ],
      },
      zh: {
        word: '哲学',
        question: '哲学在现代生活中扮演什么角色？',
        examples: [
          {
            en: 'Philosophy teaches us to question what we assume.',
            native: '哲学教会我们质疑自己认为理所当然的事情。',
          },
          {
            en: 'It helps us make ethical choices in new technology.',
            native: '它帮助我们在新技术中做出合乎伦理的选择。',
          },
          {
            en: 'In a busy world, it reminds us to reflect on meaning.',
            native: '在忙碌的世界里，它提醒我们思考意义。',
          },
        ],
      },
    },
  },
];
