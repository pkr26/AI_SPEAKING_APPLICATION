import type { QuestionSeed } from './types';

// B1 speaking questions: prompt word, question, and te/hi/es/zh
// translations with 3 example answers each (same English sentence across
// languages, `native` is its translation).
export const questions: QuestionSeed[] = [
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
          {
            en: 'I want to stop using my phone late at night.',
            native: '我想改掉深夜玩手机的习惯。',
          },
          {
            en: 'This habit makes me tired the next morning.',
            native: '这个习惯让我第二天早上感到疲惫。',
          },
          {
            en: 'I plan to read a book before sleeping instead.',
            native: '我打算睡前改为读书。',
          },
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
          {
            en: 'The story was touching and the music was wonderful.',
            native: 'कहानी भावुक थी और संगीत अद्भुत था।',
          },
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
          {
            en: 'The story was touching and the music was wonderful.',
            native: '故事感人，音乐也很棒。',
          },
          {
            en: 'I liked it because it taught me to follow my dreams.',
            native: '我喜欢它，因为它教会了我追随梦想。',
          },
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
          {
            en: 'I exercise for thirty minutes every morning.',
            native: 'मैं हर सुबह तीस मिनट व्यायाम करता हूँ।',
          },
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
          {
            en: 'I exercise for thirty minutes every morning.',
            native: 'Hago ejercicio treinta minutos cada mañana.',
          },
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
          {
            en: 'I exercise for thirty minutes every morning.',
            native: '我每天早上锻炼三十分钟。',
          },
          {
            en: 'I try to eat more fruit and less junk food.',
            native: '我尽量多吃水果，少吃垃圾食品。',
          },
          {
            en: 'Sleeping eight hours a night keeps me energetic.',
            native: '每晚睡八个小时让我精力充沛。',
          },
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
          {
            en: 'We decorate our house and share sweets with neighbours.',
            native: '我们装饰房子，和邻居分享糖果。',
          },
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
          {
            en: 'I use my phone to pay bills and learn new things.',
            native: '我用手机支付账单和学习新知识。',
          },
          {
            en: 'Online maps help me find new places easily.',
            native: '在线地图帮助我轻松找到新地方。',
          },
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
          {
            en: "During holidays, we visited our relatives' farm.",
            native: '假期里，我们会去亲戚家的农场。',
          },
          {
            en: 'Those simple days taught me the value of family.',
            native: '那些简单的日子教会了我家庭的价值。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'teamwork',
    questionText: 'Talk about a time you worked in a team. What went well and what was difficult?',
    translations: {
      te: {
        word: 'జట్టు కృషి',
        question: 'మీరు జట్టులో పనిచేసిన ఒక సందర్భం గురించి మాట్లాడండి. ఏమి బాగా జరిగింది, ఏమి కష్టంగా ఉంది?',
        examples: [
          {
            en: 'I worked in a team of five people on a college project last year.',
            native: 'గత సంవత్సరం నేను కాలేజీ ప్రాజెక్టులో ఐదుగురితో జట్టులో పనిచేశాను.',
          },
          {
            en: 'We finished on time because everyone helped each other.',
            native: 'ప్రతి ఒక్కరు ఒకరికొకరు సహాయం చేసుకున్నందున మేము సమయానికి పూర్తి చేశాము.',
          },
          {
            en: 'It was difficult when two members disagreed, but we talked and solved it.',
            native: 'ఇద్దరు సభ్యులు భిన్నాభిప్రాయం పడినప్పుడు కష్టంగా ఉంది, కానీ మేము మాట్లాడి పరిష్కరించుకున్నాము.',
          },
        ],
      },
      hi: {
        word: 'टीमवर्क',
        question: 'किसी ऐसे समय के बारे में बताइए जब आपने टीम में काम किया। क्या अच्छा हुआ और क्या कठिन था?',
        examples: [
          {
            en: 'I worked in a team of five people on a college project last year.',
            native: 'पिछले साल मैंने एक कॉलेज प्रोजेक्ट में पाँच लोगों की टीम में काम किया।',
          },
          {
            en: 'We finished on time because everyone helped each other.',
            native: 'हम समय पर काम पूरा कर पाए क्योंकि सबने एक-दूसरे की मदद की।',
          },
          {
            en: 'It was difficult when two members disagreed, but we talked and solved it.',
            native: 'जब दो सदस्यों में मतभेद हुआ तो कठिन था, लेकिन हमने बात करके इसे सुलझा लिया।',
          },
        ],
      },
      es: {
        word: 'trabajo en equipo',
        question: 'Habla de una ocasión en la que trabajaste en equipo. ¿Qué salió bien y qué fue difícil?',
        examples: [
          {
            en: 'I worked in a team of five people on a college project last year.',
            native: 'El año pasado trabajé en un equipo de cinco personas en un proyecto de la universidad.',
          },
          {
            en: 'We finished on time because everyone helped each other.',
            native: 'Terminamos a tiempo porque todos nos ayudamos unos a otros.',
          },
          {
            en: 'It was difficult when two members disagreed, but we talked and solved it.',
            native: 'Fue difícil cuando dos miembros no estaban de acuerdo, pero hablamos y lo resolvimos.',
          },
        ],
      },
      zh: {
        word: '团队合作',
        question: '谈谈你曾经在团队中工作的一次经历。什么进展顺利，什么比较困难？',
        examples: [
          {
            en: 'I worked in a team of five people on a college project last year.',
            native: '去年我在一个大学项目中与五个人组成的团队一起工作。',
          },
          {
            en: 'We finished on time because everyone helped each other.',
            native: '我们按时完成了，因为每个人都互相帮助。',
          },
          {
            en: 'It was difficult when two members disagreed, but we talked and solved it.',
            native: '当两名成员意见不合时很困难，但我们通过沟通解决了问题。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'sport',
    questionText: 'What is your favourite sport, and why do you like it?',
    translations: {
      te: {
        word: 'క్రీడ',
        question: 'మీకు ఇష్టమైన క్రీడ ఏది, మరియు మీకు అది ఎందుకు నచ్చుతుంది?',
        examples: [
          {
            en: 'My favourite sport is badminton because it is fast and exciting.',
            native: 'నా ఇష్టమైన క్రీడ బ్యాడ్మింటన్, ఎందుకంటే అది వేగంగా మరియు ఉత్కంఠభరితంగా ఉంటుంది.',
          },
          {
            en: 'I have played it with my friends every weekend since I was ten.',
            native: 'నేను పది సంవత్సరాల వయస్సు నుండి ప్రతి వారాంతం నా స్నేహితులతో అది ఆడుతున్నాను.',
          },
          {
            en: 'Playing sport keeps me fitter than sitting at home.',
            native: 'ఇంట్లో కూర్చోవడం కంటే క్రీడ ఆడటం నన్ను ఎక్కువ ఫిట్‌గా ఉంచుతుంది.',
          },
        ],
      },
      hi: {
        word: 'खेल',
        question: 'आपका पसंदीदा खेल कौन सा है, और आपको यह क्यों पसंद है?',
        examples: [
          {
            en: 'My favourite sport is badminton because it is fast and exciting.',
            native: 'मेरा पसंदीदा खेल बैडमिंटन है क्योंकि यह तेज़ और रोमांचक है।',
          },
          {
            en: 'I have played it with my friends every weekend since I was ten.',
            native: 'जब से मैं दस साल का था, मैं हर सप्ताह के अंत में अपने दोस्तों के साथ इसे खेलता आया हूँ।',
          },
          {
            en: 'Playing sport keeps me fitter than sitting at home.',
            native: 'घर बैठने की तुलना में खेल खेलना मुझे ज़्यादा तंदुरुस्त रखता है।',
          },
        ],
      },
      es: {
        word: 'deporte',
        question: '¿Cuál es tu deporte favorito y por qué te gusta?',
        examples: [
          {
            en: 'My favourite sport is badminton because it is fast and exciting.',
            native: 'Mi deporte favorito es el bádminton porque es rápido y emocionante.',
          },
          {
            en: 'I have played it with my friends every weekend since I was ten.',
            native: 'Juego con mis amigos todos los fines de semana desde que tenía diez años.',
          },
          {
            en: 'Playing sport keeps me fitter than sitting at home.',
            native: 'Hacer deporte me mantiene más en forma que quedarme sentado en casa.',
          },
        ],
      },
      zh: {
        word: '运动',
        question: '你最喜欢的运动是什么？你为什么喜欢它？',
        examples: [
          {
            en: 'My favourite sport is badminton because it is fast and exciting.',
            native: '我最喜欢的运动是羽毛球，因为它又快又刺激。',
          },
          {
            en: 'I have played it with my friends every weekend since I was ten.',
            native: '从我十岁起，我每个周末都和朋友们打羽毛球。',
          },
          { en: 'Playing sport keeps me fitter than sitting at home.', native: '运动比坐在家里让我更健康。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'music',
    questionText: 'What kind of music do you enjoy listening to, and when do you listen to it?',
    translations: {
      te: {
        word: 'సంగీతం',
        question: 'మీరు ఏ రకమైన సంగీతం వినడానికి ఇష్టపడతారు, మరియు ఎప్పుడు వింటారు?',
        examples: [
          {
            en: 'I enjoy soft music because it helps me relax after a long day.',
            native: 'నేను మధురమైన సంగీతం ఇష్టపడతాను, ఎందుకంటే అది సుదీర్ఘ రోజు తర్వాత నాకు విశ్రాంతిని ఇస్తుంది.',
          },
          {
            en: 'I usually listen to songs while I am travelling on the bus.',
            native: 'నేను సాధారణంగా బస్సులో ప్రయాణిస్తున్నప్పుడు పాటలు వింటాను.',
          },
          {
            en: 'Music makes boring work feel shorter and more enjoyable.',
            native: 'సంగీతం విసుగు పనిని తక్కువగా మరియు ఆనందంగా అనిపించేలా చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'संगीत',
        question: 'आप किस तरह का संगीत सुनना पसंद करते हैं, और आप इसे कब सुनते हैं?',
        examples: [
          {
            en: 'I enjoy soft music because it helps me relax after a long day.',
            native: 'मुझे शांत संगीत पसंद है क्योंकि लंबे दिन के बाद इससे मुझे आराम मिलता है।',
          },
          {
            en: 'I usually listen to songs while I am travelling on the bus.',
            native: 'मैं आमतौर पर बस में यात्रा करते समय गाने सुनता हूँ।',
          },
          {
            en: 'Music makes boring work feel shorter and more enjoyable.',
            native: 'संगीत उबाऊ काम को छोटा और ज़्यादा मज़ेदार महसूस कराता है।',
          },
        ],
      },
      es: {
        word: 'música',
        question: '¿Qué tipo de música te gusta escuchar y cuándo la escuchas?',
        examples: [
          {
            en: 'I enjoy soft music because it helps me relax after a long day.',
            native: 'Me gusta la música suave porque me ayuda a relajarme después de un día largo.',
          },
          {
            en: 'I usually listen to songs while I am travelling on the bus.',
            native: 'Normalmente escucho canciones mientras viajo en el autobús.',
          },
          {
            en: 'Music makes boring work feel shorter and more enjoyable.',
            native: 'La música hace que el trabajo aburrido parezca más corto y agradable.',
          },
        ],
      },
      zh: {
        word: '音乐',
        question: '你喜欢听什么类型的音乐？你什么时候听？',
        examples: [
          {
            en: 'I enjoy soft music because it helps me relax after a long day.',
            native: '我喜欢轻音乐，因为它能帮助我在漫长的一天后放松。',
          },
          { en: 'I usually listen to songs while I am travelling on the bus.', native: '我通常在乘公交车时听歌。' },
          {
            en: 'Music makes boring work feel shorter and more enjoyable.',
            native: '音乐让枯燥的工作感觉更短、更有趣。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'reading',
    questionText: 'Do you like reading books? What kind of books do you prefer?',
    translations: {
      te: {
        word: 'చదవడం',
        question: 'మీకు పుస్తకాలు చదవడం ఇష్టమా? మీరు ఏ రకమైన పుస్తకాలను ఇష్టపడతారు?',
        examples: [
          {
            en: 'I prefer story books because they take me to different worlds.',
            native: 'నేను కథా పుస్తకాలను ఇష్టపడతాను, ఎందుకంటే అవి నన్ను వేర్వేరు ప్రపంచాలకు తీసుకువెళ్తాయి.',
          },
          {
            en: 'I have read three novels this month, which is more than usual.',
            native: 'ఈ నెల నేను మూడు నవలలు చదివాను, ఇది సాధారణం కంటే ఎక్కువ.',
          },
          {
            en: 'Reading before bed is better for me than watching videos.',
            native: 'వీడియోలు చూడటం కంటే పడుకునే ముందు చదవడం నాకు మేలు.',
          },
        ],
      },
      hi: {
        word: 'पढ़ना',
        question: 'क्या आपको किताबें पढ़ना पसंद है? आप किस तरह की किताबें पसंद करते हैं?',
        examples: [
          {
            en: 'I prefer story books because they take me to different worlds.',
            native: 'मुझे कहानियों वाली किताबें पसंद हैं क्योंकि वे मुझे अलग-अलग दुनिया में ले जाती हैं।',
          },
          {
            en: 'I have read three novels this month, which is more than usual.',
            native: 'इस महीने मैंने तीन उपन्यास पढ़े हैं, जो सामान्य से ज़्यादा है।',
          },
          {
            en: 'Reading before bed is better for me than watching videos.',
            native: 'वीडियो देखने की तुलना में सोने से पहले पढ़ना मेरे लिए बेहतर है।',
          },
        ],
      },
      es: {
        word: 'lectura',
        question: '¿Te gusta leer libros? ¿Qué tipo de libros prefieres?',
        examples: [
          {
            en: 'I prefer story books because they take me to different worlds.',
            native: 'Prefiero los libros de historias porque me llevan a mundos diferentes.',
          },
          {
            en: 'I have read three novels this month, which is more than usual.',
            native: 'He leído tres novelas este mes, más de lo habitual.',
          },
          {
            en: 'Reading before bed is better for me than watching videos.',
            native: 'Leer antes de dormir es mejor para mí que ver vídeos.',
          },
        ],
      },
      zh: {
        word: '阅读',
        question: '你喜欢读书吗？你更喜欢哪类书？',
        examples: [
          {
            en: 'I prefer story books because they take me to different worlds.',
            native: '我更喜欢故事书，因为它们带我去不同的世界。',
          },
          {
            en: 'I have read three novels this month, which is more than usual.',
            native: '这个月我读了三本小说，比平时多。',
          },
          {
            en: 'Reading before bed is better for me than watching videos.',
            native: '对我来说，睡前读书比看视频更好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'social media',
    questionText: 'How do you use social media, and do you think it is good or bad for young people?',
    translations: {
      te: {
        word: 'సోషల్ మీడియా',
        question: 'మీరు సోషల్ మీడియాను ఎలా వాడతారు, మరియు అది యువతకు మంచిదా కాదా అని మీరు అనుకుంటున్నారు?',
        examples: [
          {
            en: 'I use social media to share photos and talk with my friends.',
            native: 'ఫోటోలు పంచుకోవడానికి మరియు నా స్నేహితులతో మాట్లాడటానికి నేను సోషల్ మీడియా వాడతాను.',
          },
          {
            en: 'It is useful, but spending too much time on it is a problem.',
            native: 'అది ఉపయోగకరమే, కానీ దానిపై ఎక్కువ సమయం గడపడం ఒక సమస్య.',
          },
          {
            en: 'I have stopped checking my phone first thing in the morning.',
            native: 'ఉదయం లేచిన వెంటనే ఫోన్ చూడటం నేను ఆపేశాను.',
          },
        ],
      },
      hi: {
        word: 'सोशल मीडिया',
        question:
          'आप सोशल मीडिया का इस्तेमाल कैसे करते हैं, और क्या आपको लगता है कि यह युवाओं के लिए अच्छा है या बुरा?',
        examples: [
          {
            en: 'I use social media to share photos and talk with my friends.',
            native: 'मैं तस्वीरें साझा करने और दोस्तों से बात करने के लिए सोशल मीडिया का इस्तेमाल करता हूँ।',
          },
          {
            en: 'It is useful, but spending too much time on it is a problem.',
            native: 'यह उपयोगी है, लेकिन इस पर बहुत ज़्यादा समय बिताना एक समस्या है।',
          },
          {
            en: 'I have stopped checking my phone first thing in the morning.',
            native: 'मैंने सुबह उठते ही सबसे पहले फ़ोन देखना बंद कर दिया है।',
          },
        ],
      },
      es: {
        word: 'redes sociales',
        question: '¿Cómo usas las redes sociales y crees que son buenas o malas para los jóvenes?',
        examples: [
          {
            en: 'I use social media to share photos and talk with my friends.',
            native: 'Uso las redes sociales para compartir fotos y hablar con mis amigos.',
          },
          {
            en: 'It is useful, but spending too much time on it is a problem.',
            native: 'Son útiles, pero pasar demasiado tiempo en ellas es un problema.',
          },
          {
            en: 'I have stopped checking my phone first thing in the morning.',
            native: 'He dejado de mirar el teléfono nada más despertarme por la mañana.',
          },
        ],
      },
      zh: {
        word: '社交媒体',
        question: '你如何使用社交媒体？你认为它对年轻人是好还是坏？',
        examples: [
          {
            en: 'I use social media to share photos and talk with my friends.',
            native: '我用社交媒体分享照片并与朋友聊天。',
          },
          {
            en: 'It is useful, but spending too much time on it is a problem.',
            native: '它很有用，但花太多时间在上面是个问题。',
          },
          {
            en: 'I have stopped checking my phone first thing in the morning.',
            native: '我已经不再早上一醒来就看手机了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'money',
    questionText: 'How do you manage your money, and what do you like to spend it on?',
    translations: {
      te: {
        word: 'డబ్బు',
        question: 'మీరు మీ డబ్బును ఎలా నిర్వహిస్తారు, మరియు దానిని దేనిపై ఖర్చు చేయడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'I save some money every month because I want to buy a laptop.',
            native: 'నేను ల్యాప్‌టాప్ కొనాలనుకుంటున్నాను కాబట్టి ప్రతి నెల కొంత డబ్బు ఆదా చేస్తాను.',
          },
          {
            en: 'I spend more on books than on clothes these days.',
            native: 'ఈ రోజుల్లో నేను దుస్తుల కంటే పుస్తకాలపై ఎక్కువ ఖర్చు చేస్తాను.',
          },
          {
            en: 'When I plan my budget, I never worry at the end of the month.',
            native: 'నేను నా బడ్జెట్ ప్లాన్ చేసుకున్నప్పుడు, నెల చివరిలో ఎప్పుడూ టెన్షన్ పడను.',
          },
        ],
      },
      hi: {
        word: 'पैसा',
        question: 'आप अपने पैसे का प्रबंधन कैसे करते हैं, और आप इसे किस पर खर्च करना पसंद करते हैं?',
        examples: [
          {
            en: 'I save some money every month because I want to buy a laptop.',
            native: 'मैं हर महीने कुछ पैसे बचाता हूँ क्योंकि मैं एक लैपटॉप खरीदना चाहता हूँ।',
          },
          {
            en: 'I spend more on books than on clothes these days.',
            native: 'इन दिनों मैं कपड़ों से ज़्यादा किताबों पर खर्च करता हूँ।',
          },
          {
            en: 'When I plan my budget, I never worry at the end of the month.',
            native: 'जब मैं अपना बजट बनाता हूँ, तो महीने के अंत में कभी चिंता नहीं करता।',
          },
        ],
      },
      es: {
        word: 'dinero',
        question: '¿Cómo administras tu dinero y en qué te gusta gastarlo?',
        examples: [
          {
            en: 'I save some money every month because I want to buy a laptop.',
            native: 'Ahorro algo de dinero cada mes porque quiero comprar un portátil.',
          },
          {
            en: 'I spend more on books than on clothes these days.',
            native: 'Últimamente gasto más en libros que en ropa.',
          },
          {
            en: 'When I plan my budget, I never worry at the end of the month.',
            native: 'Cuando planifico mi presupuesto, nunca me preocupo a fin de mes.',
          },
        ],
      },
      zh: {
        word: '金钱',
        question: '你如何管理自己的钱？你喜欢把钱花在什么上？',
        examples: [
          {
            en: 'I save some money every month because I want to buy a laptop.',
            native: '我每个月存一些钱，因为我想买一台笔记本电脑。',
          },
          { en: 'I spend more on books than on clothes these days.', native: '这些天我在书上花的钱比在衣服上多。' },
          {
            en: 'When I plan my budget, I never worry at the end of the month.',
            native: '当我做好预算时，月底就从不发愁。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'friendship',
    questionText: 'What makes a good friend, and how do you keep your friendships strong?',
    translations: {
      te: {
        word: 'స్నేహం',
        question: 'మంచి స్నేహితుడికి ఏ లక్షణాలు ఉండాలి, మరియు మీరు మీ స్నేహాలను ఎలా బలంగా ఉంచుతారు?',
        examples: [
          {
            en: 'A good friend listens when you have a problem and never judges you.',
            native: 'మీకు సమస్య ఉన్నప్పుడు విని, ఎప్పుడూ తీర్పు చెప్పని వ్యక్తే మంచి స్నేహితుడు.',
          },
          {
            en: 'I have known my best friend since we were in school together.',
            native: 'మేము ఇద్దరం స్కూల్లో చదువుతున్నప్పటి నుండి నా పక్కా స్నేహితుడికి నాకు పరిచయం.',
          },
          {
            en: 'We meet every week because friendship needs time and care.',
            native: 'మేము ప్రతి వారం కలుస్తాము, ఎందుకంటే స్నేహానికి సమయం మరియు శ్రద్ధ అవసరం.',
          },
        ],
      },
      hi: {
        word: 'दोस्ती',
        question: 'एक अच्छे दोस्त में क्या खूबियाँ होती हैं, और आप अपनी दोस्ती को कैसे मज़बूत रखते हैं?',
        examples: [
          {
            en: 'A good friend listens when you have a problem and never judges you.',
            native: 'अच्छा दोस्त वही है जो आपकी परेशानी में आपकी बात सुने और कभी आपको आँके नहीं।',
          },
          {
            en: 'I have known my best friend since we were in school together.',
            native: 'मैं अपने सबसे अच्छे दोस्त को तब से जानता हूँ जब से हम साथ स्कूल में थे।',
          },
          {
            en: 'We meet every week because friendship needs time and care.',
            native: 'हम हर हफ़्ते मिलते हैं क्योंकि दोस्ती को समय और देखभाल चाहिए।',
          },
        ],
      },
      es: {
        word: 'amistad',
        question: '¿Qué hace a un buen amigo y cómo mantienes fuertes tus amistades?',
        examples: [
          {
            en: 'A good friend listens when you have a problem and never judges you.',
            native: 'Un buen amigo te escucha cuando tienes un problema y nunca te juzga.',
          },
          {
            en: 'I have known my best friend since we were in school together.',
            native: 'Conozco a mi mejor amigo desde que estábamos juntos en el colegio.',
          },
          {
            en: 'We meet every week because friendship needs time and care.',
            native: 'Nos vemos cada semana porque la amistad necesita tiempo y cuidado.',
          },
        ],
      },
      zh: {
        word: '友谊',
        question: '什么样的朋友才是好朋友？你如何维系友谊？',
        examples: [
          {
            en: 'A good friend listens when you have a problem and never judges you.',
            native: '好朋友会在你遇到困难时倾听，而且从不评判你。',
          },
          {
            en: 'I have known my best friend since we were in school together.',
            native: '我和我最好的朋友从一起上学时就认识了。',
          },
          {
            en: 'We meet every week because friendship needs time and care.',
            native: '我们每周都见面，因为友谊需要时间和用心。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'cooking',
    questionText: 'Do you enjoy cooking? Describe a dish you can make well.',
    translations: {
      te: {
        word: 'వంట',
        question: 'మీకు వంట చేయడం ఇష్టమా? మీరు బాగా చేయగల ఒక వంటకాన్ని వివరించండి.',
        examples: [
          {
            en: 'I enjoy cooking because it relaxes me after work.',
            native: 'నాకు వంట చేయడం ఇష్టం, ఎందుకంటే పని తర్వాత అది నాకు ఉపశమనం ఇస్తుంది.',
          },
          {
            en: 'I can make vegetable rice, and my family says it tastes wonderful.',
            native: 'నేను వెజిటబుల్ రైస్ చేయగలను, నా కుటుంబం దాని రుచి అద్భుతంగా ఉందని అంటుంది.',
          },
          {
            en: 'Cooking at home is cheaper and healthier than eating outside.',
            native: 'బయట తినడం కంటే ఇంట్లో వంట చేసుకోవడం చౌకగా మరియు ఆరోగ్యంగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'खाना बनाना',
        question: 'क्या आपको खाना बनाना पसंद है? किसी ऐसे व्यंजन का वर्णन कीजिए जो आप अच्छा बना लेते हैं।',
        examples: [
          {
            en: 'I enjoy cooking because it relaxes me after work.',
            native: 'मुझे खाना बनाना पसंद है क्योंकि काम के बाद इससे मुझे सुकून मिलता है।',
          },
          {
            en: 'I can make vegetable rice, and my family says it tastes wonderful.',
            native: 'मैं वेजिटेबल राइस बना लेता हूँ, और मेरा परिवार कहता है कि इसका स्वाद बहुत अच्छा है।',
          },
          {
            en: 'Cooking at home is cheaper and healthier than eating outside.',
            native: 'बाहर खाने की तुलना में घर पर खाना बनाना सस्ता और सेहतमंद है।',
          },
        ],
      },
      es: {
        word: 'cocinar',
        question: '¿Te gusta cocinar? Describe un plato que preparas bien.',
        examples: [
          {
            en: 'I enjoy cooking because it relaxes me after work.',
            native: 'Me gusta cocinar porque me relaja después del trabajo.',
          },
          {
            en: 'I can make vegetable rice, and my family says it tastes wonderful.',
            native: 'Sé preparar arroz con verduras, y mi familia dice que está delicioso.',
          },
          {
            en: 'Cooking at home is cheaper and healthier than eating outside.',
            native: 'Cocinar en casa es más barato y más sano que comer fuera.',
          },
        ],
      },
      zh: {
        word: '烹饪',
        question: '你喜欢做饭吗？描述一道你做得好的菜。',
        examples: [
          { en: 'I enjoy cooking because it relaxes me after work.', native: '我喜欢做饭，因为下班后做饭能让我放松。' },
          {
            en: 'I can make vegetable rice, and my family says it tastes wonderful.',
            native: '我会做蔬菜炒饭，我家人说味道很棒。',
          },
          {
            en: 'Cooking at home is cheaper and healthier than eating outside.',
            native: '在家做饭比在外面吃更便宜、更健康。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'exam',
    questionText: 'How do you prepare for exams, and how do you feel before them?',
    translations: {
      te: {
        word: 'పరీక్ష',
        question: 'మీరు పరీక్షలకు ఎలా సిద్ధమవుతారు, మరియు వాటికి ముందు మీకు ఎలా అనిపిస్తుంది?',
        examples: [
          {
            en: 'I make a study plan two weeks before every exam because it keeps me calm.',
            native:
              'ప్రతి పరీక్షకు రెండు వారాల ముందు నేను స్టడీ ప్లాన్ తయారు చేస్తాను, ఎందుకంటే అది నన్ను ప్రశాంతంగా ఉంచుతుంది.',
          },
          {
            en: 'I feel nervous before exams, but breathing slowly helps me relax.',
            native:
              'పరీక్షల ముందు నాకు టెన్షన్‌గా అనిపిస్తుంది, కానీ నెమ్మదిగా ఊపిరి పీల్చుకోవడం నాకు రిలాక్స్ అవ్వడానికి సహాయపడుతుంది.',
          },
          {
            en: 'Studying with friends is more fun than studying alone.',
            native: 'ఒంటరిగా చదవడం కంటే స్నేహితులతో చదవడం ఎక్కువ సరదాగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'परीक्षा',
        question: 'आप परीक्षाओं की तैयारी कैसे करते हैं, और उनसे पहले आप कैसा महसूस करते हैं?',
        examples: [
          {
            en: 'I make a study plan two weeks before every exam because it keeps me calm.',
            native: 'मैं हर परीक्षा से दो हफ़्ते पहले पढ़ने की योजना बनाता हूँ क्योंकि इससे मैं शांत रहता हूँ।',
          },
          {
            en: 'I feel nervous before exams, but breathing slowly helps me relax.',
            native: 'परीक्षा से पहले मैं घबरा जाता हूँ, लेकिन धीरे-धीरे साँस लेने से मुझे आराम मिलता है।',
          },
          {
            en: 'Studying with friends is more fun than studying alone.',
            native: 'अकेले पढ़ने की तुलना में दोस्तों के साथ पढ़ना ज़्यादा मज़ेदार है।',
          },
        ],
      },
      es: {
        word: 'examen',
        question: '¿Cómo te preparas para los exámenes y cómo te sientes antes de ellos?',
        examples: [
          {
            en: 'I make a study plan two weeks before every exam because it keeps me calm.',
            native: 'Hago un plan de estudio dos semanas antes de cada examen porque me mantiene tranquilo.',
          },
          {
            en: 'I feel nervous before exams, but breathing slowly helps me relax.',
            native: 'Me pongo nervioso antes de los exámenes, pero respirar despacio me ayuda a relajarme.',
          },
          {
            en: 'Studying with friends is more fun than studying alone.',
            native: 'Estudiar con amigos es más divertido que estudiar solo.',
          },
        ],
      },
      zh: {
        word: '考试',
        question: '你如何准备考试？考试前你感觉如何？',
        examples: [
          {
            en: 'I make a study plan two weeks before every exam because it keeps me calm.',
            native: '我会在每次考试前两周制定学习计划，因为这能让我保持冷静。',
          },
          {
            en: 'I feel nervous before exams, but breathing slowly helps me relax.',
            native: '考试前我会紧张，但慢慢呼吸能帮助我放松。',
          },
          { en: 'Studying with friends is more fun than studying alone.', native: '和朋友一起学习比独自学习更有趣。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'volunteering',
    questionText: 'Have you ever done volunteer work? Why do you think people volunteer?',
    translations: {
      te: {
        word: 'స్వచ్ఛంద సేవ',
        question: 'మీరు ఎప్పుడైనా స్వచ్ఛంద సేవ చేశారా? ప్రజలు ఎందుకు స్వచ్ఛందంగా సేవ చేస్తారని మీరు అనుకుంటున్నారు?',
        examples: [
          {
            en: 'I volunteered at an animal shelter last summer, and I loved it.',
            native: 'గత వేసవిలో నేను ఒక జంతు ఆశ్రమంలో స్వచ్ఛంద సేవ చేశాను, నాకు అది చాలా నచ్చింది.',
          },
          {
            en: 'People volunteer because they want to help others and learn new skills.',
            native: 'ఇతరులకు సహాయం చేయాలని మరియు కొత్త నైపుణ్యాలు నేర్చుకోవాలని ప్రజలు స్వచ్ఛంద సేవ చేస్తారు.',
          },
          {
            en: 'Helping others has made me happier than buying new things.',
            native: 'కొత్త వస్తువులు కొనడం కంటే ఇతరులకు సహాయం చేయడం నన్ను ఎక్కువ సంతోషపెట్టింది.',
          },
        ],
      },
      hi: {
        word: 'स्वयंसेवा',
        question: 'क्या आपने कभी स्वयंसेवक का काम किया है? आपके अनुसार लोग स्वयंसेवा क्यों करते हैं?',
        examples: [
          {
            en: 'I volunteered at an animal shelter last summer, and I loved it.',
            native: 'पिछली गर्मियों में मैंने एक पशु आश्रय स्थल में स्वयंसेवा की, और मुझे यह बहुत पसंद आया।',
          },
          {
            en: 'People volunteer because they want to help others and learn new skills.',
            native: 'लोग स्वयंसेवा करते हैं क्योंकि वे दूसरों की मदद करना और नए कौशल सीखना चाहते हैं।',
          },
          {
            en: 'Helping others has made me happier than buying new things.',
            native: 'नई चीज़ें खरीदने की तुलना में दूसरों की मदद करना मुझे ज़्यादा खुश करता है।',
          },
        ],
      },
      es: {
        word: 'voluntariado',
        question: '¿Has hecho alguna vez trabajo voluntario? ¿Por qué crees que la gente hace voluntariado?',
        examples: [
          {
            en: 'I volunteered at an animal shelter last summer, and I loved it.',
            native: 'Hice voluntariado en un refugio de animales el verano pasado y me encantó.',
          },
          {
            en: 'People volunteer because they want to help others and learn new skills.',
            native: 'La gente hace voluntariado porque quiere ayudar a los demás y aprender nuevas habilidades.',
          },
          {
            en: 'Helping others has made me happier than buying new things.',
            native: 'Ayudar a los demás me ha hecho más feliz que comprar cosas nuevas.',
          },
        ],
      },
      zh: {
        word: '志愿服务',
        question: '你做过志愿工作吗？你认为人们为什么做志愿者？',
        examples: [
          {
            en: 'I volunteered at an animal shelter last summer, and I loved it.',
            native: '去年夏天我在一个动物收容所做志愿者，我非常喜欢。',
          },
          {
            en: 'People volunteer because they want to help others and learn new skills.',
            native: '人们做志愿者是因为他们想帮助别人并学习新技能。',
          },
          {
            en: 'Helping others has made me happier than buying new things.',
            native: '帮助别人比买新东西让我更快乐。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'fitness',
    questionText: 'What do you do to keep fit, and how often do you exercise?',
    translations: {
      te: {
        word: 'శారీరక దృఢత్వం',
        question: 'ఫిట్‌గా ఉండటానికి మీరు ఏమి చేస్తారు, మరియు ఎంత తరచుగా వ్యాయామం చేస్తారు?',
        examples: [
          {
            en: 'I go jogging three times a week because it gives me energy.',
            native: 'వారానికి మూడుసార్లు జాగింగ్ చేస్తాను, ఎందుకంటే అది నాకు శక్తిని ఇస్తుంది.',
          },
          {
            en: 'Walking to work is easier for me than going to a gym.',
            native: 'జిమ్‌కు వెళ్లడం కంటే పనికి నడచి వెళ్లడం నాకు సులభం.',
          },
          {
            en: 'Since I started exercising, I have slept much better at night.',
            native: 'నేను వ్యాయామం ప్రారంభించినప్పటి నుండి, రాత్రి చాలా బాగా నిద్రపోతున్నాను.',
          },
        ],
      },
      hi: {
        word: 'फ़िटनेस',
        question: 'फ़िट रहने के लिए आप क्या करते हैं, और आप कितनी बार व्यायाम करते हैं?',
        examples: [
          {
            en: 'I go jogging three times a week because it gives me energy.',
            native: 'मैं हफ़्ते में तीन बार जॉगिंग करता हूँ क्योंकि इससे मुझे ऊर्जा मिलती है।',
          },
          {
            en: 'Walking to work is easier for me than going to a gym.',
            native: 'जिम जाने की तुलना में पैदल काम पर जाना मेरे लिए आसान है।',
          },
          {
            en: 'Since I started exercising, I have slept much better at night.',
            native: 'जब से मैंने व्यायाम शुरू किया है, मैं रात में काफ़ी बेहतर नींद ले रहा हूँ।',
          },
        ],
      },
      es: {
        word: 'forma física',
        question: '¿Qué haces para mantenerte en forma y con qué frecuencia haces ejercicio?',
        examples: [
          {
            en: 'I go jogging three times a week because it gives me energy.',
            native: 'Salgo a correr tres veces por semana porque me da energía.',
          },
          {
            en: 'Walking to work is easier for me than going to a gym.',
            native: 'Ir caminando al trabajo me resulta más fácil que ir al gimnasio.',
          },
          {
            en: 'Since I started exercising, I have slept much better at night.',
            native: 'Desde que empecé a hacer ejercicio, duermo mucho mejor por la noche.',
          },
        ],
      },
      zh: {
        word: '健身',
        question: '你做什么来保持健康体态？你多久锻炼一次？',
        examples: [
          {
            en: 'I go jogging three times a week because it gives me energy.',
            native: '我每周慢跑三次，因为这让我精力充沛。',
          },
          {
            en: 'Walking to work is easier for me than going to a gym.',
            native: '对我来说，走路去上班比去健身房更容易坚持。',
          },
          {
            en: 'Since I started exercising, I have slept much better at night.',
            native: '自从开始锻炼以来，我晚上睡得好多了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'dream',
    questionText: 'What is your dream for the future, and what are you doing to achieve it?',
    translations: {
      te: {
        word: 'కల',
        question: 'మీ భవిష్యత్తు కల ఏమిటి, మరియు దానిని సాధించడానికి మీరు ఏమి చేస్తున్నారు?',
        examples: [
          {
            en: 'My dream is to become a nurse because I want to care for people.',
            native: 'నా కల నర్సు అవ్వడం, ఎందుకంటే నేను ప్రజలను చూసుకోవాలనుకుంటున్నాను.',
          },
          {
            en: 'I study hard every day so that I can pass the entrance test.',
            native: 'ప్రవేశ పరీక్ష ఉత్తీర్ణత పొందడానికి నేను ప్రతిరోజూ కష్టపడి చదువుతున్నాను.',
          },
          {
            en: 'Dreams are important, but hard work makes them real.',
            native: 'కలలు ముఖ్యమే, కానీ కష్టపడి పనిచేస్తేనే అవి నిజమవుతాయి.',
          },
        ],
      },
      hi: {
        word: 'सपना',
        question: 'भविष्य के लिए आपका सपना क्या है, और उसे पाने के लिए आप क्या कर रहे हैं?',
        examples: [
          {
            en: 'My dream is to become a nurse because I want to care for people.',
            native: 'मेरा सपना नर्स बनना है क्योंकि मैं लोगों की देखभाल करना चाहता हूँ।',
          },
          {
            en: 'I study hard every day so that I can pass the entrance test.',
            native: 'मैं हर दिन मेहनत से पढ़ता हूँ ताकि प्रवेश परीक्षा पास कर सकूँ।',
          },
          {
            en: 'Dreams are important, but hard work makes them real.',
            native: 'सपने ज़रूरी हैं, लेकिन कड़ी मेहनत ही उन्हें सच बनाती है।',
          },
        ],
      },
      es: {
        word: 'sueño',
        question: '¿Cuál es tu sueño para el futuro y qué estás haciendo para lograrlo?',
        examples: [
          {
            en: 'My dream is to become a nurse because I want to care for people.',
            native: 'Mi sueño es ser enfermera porque quiero cuidar a la gente.',
          },
          {
            en: 'I study hard every day so that I can pass the entrance test.',
            native: 'Estudio mucho todos los días para poder aprobar el examen de acceso.',
          },
          {
            en: 'Dreams are important, but hard work makes them real.',
            native: 'Los sueños son importantes, pero el trabajo duro los hace realidad.',
          },
        ],
      },
      zh: {
        word: '梦想',
        question: '你对未来的梦想是什么？你正在为实现它做什么？',
        examples: [
          {
            en: 'My dream is to become a nurse because I want to care for people.',
            native: '我的梦想是成为一名护士，因为我想照顾别人。',
          },
          {
            en: 'I study hard every day so that I can pass the entrance test.',
            native: '我每天努力学习，以便通过入学考试。',
          },
          {
            en: 'Dreams are important, but hard work makes them real.',
            native: '梦想很重要，但只有努力才能让它们成真。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'gift',
    questionText: 'Describe a special gift you have given or received.',
    translations: {
      te: {
        word: 'బహుమతి',
        question: 'మీరు ఇచ్చిన లేదా అందుకున్న ఒక ప్రత్యేకమైన బహుమతిని వివరించండి.',
        examples: [
          {
            en: 'The best gift I have received is a watch from my grandfather.',
            native: 'నేను అందుకున్న అత్యుత్తమ బహుమతి నా తాతయ్య ఇచ్చిన వాచ్.',
          },
          {
            en: 'I gave my mother a handmade card because she loves personal gifts.',
            native: 'నా అమ్మకు నేను చేతితో తయారుచేసిన కార్డ్ ఇచ్చాను, ఎందుకంటే ఆమెకు వ్యక్తిగత బహుమతులు ఇష్టం.',
          },
          {
            en: 'A thoughtful gift is more valuable than an expensive one.',
            native: 'ఖరీదైన బహుమతి కంటే ఆలోచనతో ఇచ్చే బహుమతి ఎక్కువ విలువైనది.',
          },
        ],
      },
      hi: {
        word: 'उपहार',
        question: 'किसी खास उपहार का वर्णन कीजिए जो आपने दिया हो या पाया हो।',
        examples: [
          {
            en: 'The best gift I have received is a watch from my grandfather.',
            native: 'मुझे मिला सबसे अच्छा उपहार मेरे दादाजी की ओर से एक घड़ी है।',
          },
          {
            en: 'I gave my mother a handmade card because she loves personal gifts.',
            native: 'मैंने अपनी माँ को हाथ से बना कार्ड दिया क्योंकि उन्हें निजी उपहार पसंद हैं।',
          },
          {
            en: 'A thoughtful gift is more valuable than an expensive one.',
            native: 'महँगे उपहार से ज़्यादा कीमती होता है सोच-समझकर दिया गया उपहार।',
          },
        ],
      },
      es: {
        word: 'regalo',
        question: 'Describe un regalo especial que hayas dado o recibido.',
        examples: [
          {
            en: 'The best gift I have received is a watch from my grandfather.',
            native: 'El mejor regalo que he recibido es un reloj de mi abuelo.',
          },
          {
            en: 'I gave my mother a handmade card because she loves personal gifts.',
            native: 'Le regalé a mi madre una tarjeta hecha a mano porque le encantan los regalos personales.',
          },
          {
            en: 'A thoughtful gift is more valuable than an expensive one.',
            native: 'Un regalo pensado es más valioso que uno caro.',
          },
        ],
      },
      zh: {
        word: '礼物',
        question: '描述一份你送出或收到的特别礼物。',
        examples: [
          {
            en: 'The best gift I have received is a watch from my grandfather.',
            native: '我收到过最好的礼物是祖父送我的一块手表。',
          },
          {
            en: 'I gave my mother a handmade card because she loves personal gifts.',
            native: '我送给妈妈一张手工制作的卡片，因为她喜欢有心意的礼物。',
          },
          {
            en: 'A thoughtful gift is more valuable than an expensive one.',
            native: '用心的礼物比昂贵的礼物更有价值。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'transport',
    questionText: 'How do you usually travel around your town or city, and what do you think of public transport?',
    translations: {
      te: {
        word: 'రవాణా',
        question:
          'మీరు మీ పట్టణం లేదా నగరంలో సాధారణంగా ఎలా ప్రయాణిస్తారు, మరియు ప్రజా రవాణా గురించి మీ అభిప్రాయం ఏమిటి?',
        examples: [
          {
            en: 'I usually take the metro because it is faster than the bus.',
            native: 'నేను సాధారణంగా మెట్రో తీసుకుంటాను, ఎందుకంటే అది బస్సు కంటే వేగంగా ఉంటుంది.',
          },
          {
            en: 'Public transport in my city is cheap, but it is often crowded.',
            native: 'నా నగరంలో ప్రజా రవాణా చౌకగా ఉంటుంది, కానీ తరచుగా రద్దీగా ఉంటుంది.',
          },
          {
            en: 'I have recently started cycling to work to save money.',
            native: 'డబ్బు ఆదా చేయడానికి నేను ఇటీవల పనికి సైకిల్ తొక్కడం ప్రారంభించాను.',
          },
        ],
      },
      hi: {
        word: 'परिवहन',
        question: 'आप अपने शहर या कस्बे में आमतौर पर कैसे घूमते हैं, और सार्वजनिक परिवहन के बारे में आपकी क्या राय है?',
        examples: [
          {
            en: 'I usually take the metro because it is faster than the bus.',
            native: 'मैं आमतौर पर मेट्रो लेता हूँ क्योंकि यह बस से तेज़ है।',
          },
          {
            en: 'Public transport in my city is cheap, but it is often crowded.',
            native: 'मेरे शहर में सार्वजनिक परिवहन सस्ता है, लेकिन अक्सर भीड़भाड़ रहती है।',
          },
          {
            en: 'I have recently started cycling to work to save money.',
            native: 'पैसे बचाने के लिए मैंने हाल ही में काम पर साइकिल से जाना शुरू किया है।',
          },
        ],
      },
      es: {
        word: 'transporte',
        question: '¿Cómo sueles desplazarte por tu pueblo o ciudad y qué opinas del transporte público?',
        examples: [
          {
            en: 'I usually take the metro because it is faster than the bus.',
            native: 'Normalmente cojo el metro porque es más rápido que el autobús.',
          },
          {
            en: 'Public transport in my city is cheap, but it is often crowded.',
            native: 'El transporte público de mi ciudad es barato, pero a menudo va lleno.',
          },
          {
            en: 'I have recently started cycling to work to save money.',
            native: 'Hace poco empecé a ir al trabajo en bicicleta para ahorrar dinero.',
          },
        ],
      },
      zh: {
        word: '交通',
        question: '你通常如何在城镇或城市里出行？你对公共交通有什么看法？',
        examples: [
          {
            en: 'I usually take the metro because it is faster than the bus.',
            native: '我通常坐地铁，因为它比公交车快。',
          },
          {
            en: 'Public transport in my city is cheap, but it is often crowded.',
            native: '我所在城市的公共交通很便宜，但经常很拥挤。',
          },
          {
            en: 'I have recently started cycling to work to save money.',
            native: '为了省钱，我最近开始骑自行车上班。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'fashion',
    questionText: 'Do you follow fashion trends? How important are clothes to you?',
    translations: {
      te: {
        word: 'ఫ్యాషన్',
        question: 'మీరు ఫ్యాషన్ ట్రెండ్‌లను అనుసరిస్తారా? మీకు దుస్తులు ఎంత ముఖ్యం?',
        examples: [
          {
            en: 'I do not follow fashion closely because comfort is more important to me.',
            native: 'నేను ఫ్యాషన్‌ను దగ్గరగా అనుసరించను, ఎందుకంటే నాకు సౌకర్యం ఎక్కువ ముఖ్యం.',
          },
          {
            en: 'My sister buys new clothes every month, but I prefer simple styles.',
            native: 'నా సోదరి ప్రతి నెల కొత్త దుస్తులు కొంటుంది, కానీ నాకు సాధారణ శైలులు ఇష్టం.',
          },
          {
            en: 'Fashion changes quickly, so I buy clothes that last longer.',
            native: 'ఫ్యాషన్ త్వరగా మారుతుంది, కాబట్టి నేను ఎక్కువ కాలం ఉండే దుస్తులు కొంటాను.',
          },
        ],
      },
      hi: {
        word: 'फ़ैशन',
        question: 'क्या आप फ़ैशन के रुझानों का पालन करते हैं? कपड़े आपके लिए कितने ज़रूरी हैं?',
        examples: [
          {
            en: 'I do not follow fashion closely because comfort is more important to me.',
            native: 'मैं फ़ैशन का बारीकी से पालन नहीं करता क्योंकि मेरे लिए आराम ज़्यादा ज़रूरी है।',
          },
          {
            en: 'My sister buys new clothes every month, but I prefer simple styles.',
            native: 'मेरी बहन हर महीने नए कपड़े खरीदती है, लेकिन मुझे सादगी भरे कपड़े पसंद हैं।',
          },
          {
            en: 'Fashion changes quickly, so I buy clothes that last longer.',
            native: 'फ़ैशन जल्दी बदलता है, इसलिए मैं ऐसे कपड़े खरीदता हूँ जो लंबे समय तक चलें।',
          },
        ],
      },
      es: {
        word: 'moda',
        question: '¿Sigues las tendencias de la moda? ¿Qué importancia tiene la ropa para ti?',
        examples: [
          {
            en: 'I do not follow fashion closely because comfort is more important to me.',
            native: 'No sigo mucho la moda porque la comodidad es más importante para mí.',
          },
          {
            en: 'My sister buys new clothes every month, but I prefer simple styles.',
            native: 'Mi hermana compra ropa nueva cada mes, pero yo prefiero los estilos sencillos.',
          },
          {
            en: 'Fashion changes quickly, so I buy clothes that last longer.',
            native: 'La moda cambia rápido, así que compro ropa que dura más.',
          },
        ],
      },
      zh: {
        word: '时尚',
        question: '你关注时尚潮流吗？衣服对你有多重要？',
        examples: [
          {
            en: 'I do not follow fashion closely because comfort is more important to me.',
            native: '我不太追随时尚，因为舒适对我更重要。',
          },
          {
            en: 'My sister buys new clothes every month, but I prefer simple styles.',
            native: '我姐姐每个月都买新衣服，但我更喜欢简单的风格。',
          },
          {
            en: 'Fashion changes quickly, so I buy clothes that last longer.',
            native: '时尚变化很快，所以我买耐穿的衣服。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'holiday',
    questionText: 'Describe a memorable holiday you have had. Where did you go and what did you do?',
    translations: {
      te: {
        word: 'సెలవు',
        question: 'మీకు జ్ఞాపకంగా ఉన్న ఒక సెలవును వివరించండి. మీరు ఎక్కడికి వెళ్లారు మరియు ఏమి చేశారు?',
        examples: [
          {
            en: 'Last year, my family and I went to a small village near the sea.',
            native: 'గత సంవత్సరం, నా కుటుంబం మరియు నేను సముద్రం దగ్గర ఉన్న ఒక చిన్న గ్రామానికి వెళ్లాము.',
          },
          {
            en: 'We swam every morning and ate fresh fish in the evening.',
            native: 'మేము ప్రతి ఉదయం ఈత కొట్టాము మరియు సాయంత్రం తాజా చేపలు తిన్నాము.',
          },
          {
            en: 'It was the most relaxing holiday I have ever had.',
            native: 'ఇది నేను ఇప్పటివరకు గడిపిన అత్యంత ప్రశాంతమైన సెలవు.',
          },
        ],
      },
      hi: {
        word: 'छुट्टी',
        question: 'अपनी किसी यादगार छुट्टी का वर्णन कीजिए। आप कहाँ गए थे और आपने क्या किया?',
        examples: [
          {
            en: 'Last year, my family and I went to a small village near the sea.',
            native: 'पिछले साल, मैं और मेरा परिवार समुद्र के पास एक छोटे से गाँव गए।',
          },
          {
            en: 'We swam every morning and ate fresh fish in the evening.',
            native: 'हम हर सुबह तैरते थे और शाम को ताज़ी मछली खाते थे।',
          },
          {
            en: 'It was the most relaxing holiday I have ever had.',
            native: 'यह मेरी अब तक की सबसे आरामदायक छुट्टी थी।',
          },
        ],
      },
      es: {
        word: 'vacaciones',
        question: 'Describe unas vacaciones memorables que hayas tenido. ¿Adónde fuiste y qué hiciste?',
        examples: [
          {
            en: 'Last year, my family and I went to a small village near the sea.',
            native: 'El año pasado, mi familia y yo fuimos a un pueblo pequeño cerca del mar.',
          },
          {
            en: 'We swam every morning and ate fresh fish in the evening.',
            native: 'Nadábamos cada mañana y comíamos pescado fresco por la noche.',
          },
          {
            en: 'It was the most relaxing holiday I have ever had.',
            native: 'Fueron las vacaciones más relajantes que he tenido nunca.',
          },
        ],
      },
      zh: {
        word: '假期',
        question: '描述一次难忘的假期。你去了哪里，做了什么？',
        examples: [
          {
            en: 'Last year, my family and I went to a small village near the sea.',
            native: '去年，我和家人去了海边的一个小村庄。',
          },
          {
            en: 'We swam every morning and ate fresh fish in the evening.',
            native: '我们每天早上去游泳，晚上吃新鲜的鱼。',
          },
          { en: 'It was the most relaxing holiday I have ever had.', native: '那是我度过最放松的一次假期。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'pet',
    questionText: 'Do you have a pet, or would you like to have one? Why or why not?',
    translations: {
      te: {
        word: 'పెంపుడు జంతువు',
        question: 'మీ దగ్గర పెంపుడు జంతువు ఉందా, లేదా పెంచుకోవాలనుకుంటున్నారా? ఎందుకు లేదా ఎందుకు కాదు?',
        examples: [
          {
            en: 'I have a small dog that follows me everywhere in the house.',
            native: 'నా దగ్గర ఒక చిన్న కుక్క ఉంది, అది ఇంట్లో ప్రతిచోటా నా వెంట వస్తుంది.',
          },
          {
            en: 'Pets are wonderful friends, but they need a lot of care.',
            native: 'పెంపుడు జంతువులు అద్భుతమైన స్నేహితులు, కానీ వాటికి చాలా శ్రద్ధ అవసరం.',
          },
          {
            en: 'Playing with my dog makes me forget a stressful day.',
            native: 'నా కుక్కతో ఆడటం వల్ల ఒత్తిడితో కూడిన రోజును మర్చిపోతాను.',
          },
        ],
      },
      hi: {
        word: 'पालतू जानवर',
        question: 'क्या आपके पास कोई पालतू जानवर है, या आप एक रखना चाहेंगे? क्यों या क्यों नहीं?',
        examples: [
          {
            en: 'I have a small dog that follows me everywhere in the house.',
            native: 'मेरे पास एक छोटा कुत्ता है जो घर में हर जगह मेरे पीछे चलता है।',
          },
          {
            en: 'Pets are wonderful friends, but they need a lot of care.',
            native: 'पालतू जानवर अद्भुत दोस्त होते हैं, लेकिन उन्हें बहुत देखभाल चाहिए।',
          },
          {
            en: 'Playing with my dog makes me forget a stressful day.',
            native: 'अपने कुत्ते के साथ खेलने से मैं तनाव भरा दिन भूल जाता हूँ।',
          },
        ],
      },
      es: {
        word: 'mascota',
        question: '¿Tienes una mascota o te gustaría tener una? ¿Por qué sí o por qué no?',
        examples: [
          {
            en: 'I have a small dog that follows me everywhere in the house.',
            native: 'Tengo un perro pequeño que me sigue por toda la casa.',
          },
          {
            en: 'Pets are wonderful friends, but they need a lot of care.',
            native: 'Las mascotas son amigos maravillosos, pero necesitan mucho cuidado.',
          },
          {
            en: 'Playing with my dog makes me forget a stressful day.',
            native: 'Jugar con mi perro me hace olvidar un día estresante.',
          },
        ],
      },
      zh: {
        word: '宠物',
        question: '你有宠物吗，或者你想养一只吗？为什么？',
        examples: [
          {
            en: 'I have a small dog that follows me everywhere in the house.',
            native: '我有一只小狗，它在屋子里到处跟着我。',
          },
          {
            en: 'Pets are wonderful friends, but they need a lot of care.',
            native: '宠物是很好的朋友，但它们需要很多照顾。',
          },
          { en: 'Playing with my dog makes me forget a stressful day.', native: '和我的狗玩耍让我忘记有压力的一天。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'teacher',
    questionText: 'Describe a teacher who has influenced you. What did you learn from them?',
    translations: {
      te: {
        word: 'ఉపాధ్యాయుడు',
        question: 'మిమ్మల్ని ప్రభావితం చేసిన ఒక ఉపాధ్యాయుణ్ణి వివరించండి. వారి నుండి మీరు ఏమి నేర్చుకున్నారు?',
        examples: [
          {
            en: 'My English teacher in school always encouraged me to speak without fear.',
            native: 'స్కూల్లో నా ఇంగ్లీష్ టీచరు భయం లేకుండా మాట్లాడమని ఎల్లప్పుడూ నన్ను ప్రోత్సహించారు.',
          },
          {
            en: 'She explained difficult ideas with simple stories, which I still remember.',
            native: 'ఆమె కష్టమైన భావనలను సాధారణ కథలతో వివరించేది, అవి నాకు ఇప్పటికీ గుర్తున్నాయి.',
          },
          {
            en: 'Because of her, I have become more confident in front of people.',
            native: 'ఆమె వల్ల, నేను ప్రజల ముందు మరింత ఆత్మవిశ్వాసంతో మారాను.',
          },
        ],
      },
      hi: {
        word: 'शिक्षक',
        question: 'किसी ऐसे शिक्षक का वर्णन कीजिए जिन्होंने आपको प्रभावित किया। आपने उनसे क्या सीखा?',
        examples: [
          {
            en: 'My English teacher in school always encouraged me to speak without fear.',
            native: 'स्कूल में मेरी अंग्रेज़ी की शिक्षिका ने हमेशा मुझे बिना डर के बोलने के लिए प्रोत्साहित किया।',
          },
          {
            en: 'She explained difficult ideas with simple stories, which I still remember.',
            native: 'वह कठिन बातों को साधारण कहानियों से समझाती थीं, जिन्हें मैं आज भी याद करता हूँ।',
          },
          {
            en: 'Because of her, I have become more confident in front of people.',
            native: 'उन्हीं की वजह से मैं लोगों के सामने ज़्यादा आत्मविश्वासी हो गया हूँ।',
          },
        ],
      },
      es: {
        word: 'profesor',
        question: 'Describe a un profesor que te haya influido. ¿Qué aprendiste de él o de ella?',
        examples: [
          {
            en: 'My English teacher in school always encouraged me to speak without fear.',
            native: 'Mi profesora de inglés del colegio siempre me animaba a hablar sin miedo.',
          },
          {
            en: 'She explained difficult ideas with simple stories, which I still remember.',
            native: 'Explicaba las ideas difíciles con historias sencillas que todavía recuerdo.',
          },
          {
            en: 'Because of her, I have become more confident in front of people.',
            native: 'Gracias a ella, me he vuelto más seguro al hablar delante de la gente.',
          },
        ],
      },
      zh: {
        word: '老师',
        question: '描述一位影响过你的老师。你从他们身上学到了什么？',
        examples: [
          {
            en: 'My English teacher in school always encouraged me to speak without fear.',
            native: '我的学校英语老师总是鼓励我不要害怕开口说话。',
          },
          {
            en: 'She explained difficult ideas with simple stories, which I still remember.',
            native: '她用简单的故事解释难懂的概念，我至今还记得。',
          },
          {
            en: 'Because of her, I have become more confident in front of people.',
            native: '因为她，我在众人面前变得更自信了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'neighbor',
    questionText: 'Do you know your neighbors well? What makes a good neighbor?',
    translations: {
      te: {
        word: 'పొరుగువాడు',
        question: 'మీకు మీ పొరుగువారిని బాగా తెలుసా? మంచి పొరుగువాడికి ఏ లక్షణాలు ఉండాలి?',
        examples: [
          {
            en: 'I know my neighbors well because we greet each other every morning.',
            native: 'మా పొరుగువారిని నాకు బాగా తెలుసు, ఎందుకంటే మేము ప్రతి ఉదయం ఒకరినొకరు పలకరించుకుంటాము.',
          },
          {
            en: 'A good neighbor helps you when you are in trouble.',
            native: 'మీరు ఇబ్బందిలో ఉన్నప్పుడు సహాయం చేసేవాడే మంచి పొరుగువాడు.',
          },
          {
            en: 'Last winter, our neighbors looked after our plants while we travelled.',
            native: 'గత శీతాకాలంలో, మేము ప్రయాణంలో ఉన్నప్పుడు మా పొరుగువారు మా మొక్కలను చూసుకున్నారు.',
          },
        ],
      },
      hi: {
        word: 'पड़ोसी',
        question: 'क्या आप अपने पड़ोसियों को अच्छी तरह जानते हैं? एक अच्छा पड़ोसी कैसा होता है?',
        examples: [
          {
            en: 'I know my neighbors well because we greet each other every morning.',
            native: 'मैं अपने पड़ोसियों को अच्छी तरह जानता हूँ क्योंकि हम हर सुबह एक-दूसरे को नमस्ते करते हैं।',
          },
          {
            en: 'A good neighbor helps you when you are in trouble.',
            native: 'अच्छा पड़ोसी वही है जो मुसीबत में आपकी मदद करे।',
          },
          {
            en: 'Last winter, our neighbors looked after our plants while we travelled.',
            native: 'पिछली सर्दियों में, जब हम यात्रा पर थे, हमारे पड़ोसियों ने हमारे पौधों की देखभाल की।',
          },
        ],
      },
      es: {
        word: 'vecino',
        question: '¿Conoces bien a tus vecinos? ¿Qué hace a un buen vecino?',
        examples: [
          {
            en: 'I know my neighbors well because we greet each other every morning.',
            native: 'Conozco bien a mis vecinos porque nos saludamos cada mañana.',
          },
          {
            en: 'A good neighbor helps you when you are in trouble.',
            native: 'Un buen vecino te ayuda cuando estás en un apuro.',
          },
          {
            en: 'Last winter, our neighbors looked after our plants while we travelled.',
            native: 'El invierno pasado, nuestros vecinos cuidaron nuestras plantas mientras viajábamos.',
          },
        ],
      },
      zh: {
        word: '邻居',
        question: '你熟悉你的邻居吗？什么样的邻居才是好邻居？',
        examples: [
          {
            en: 'I know my neighbors well because we greet each other every morning.',
            native: '我和邻居很熟，因为我们每天早上互相打招呼。',
          },
          { en: 'A good neighbor helps you when you are in trouble.', native: '好邻居会在你有困难时帮助你。' },
          {
            en: 'Last winter, our neighbors looked after our plants while we travelled.',
            native: '去年冬天，我们外出旅行时，邻居帮我们照看花草。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'smartphone',
    questionText: 'How much time do you spend on your smartphone each day? Do you think it is too much?',
    translations: {
      te: {
        word: 'స్మార్ట్‌ఫోన్',
        question: 'మీరు ప్రతిరోజూ మీ స్మార్ట్‌ఫోన్‌పై ఎంత సమయం గడుపుతారు? అది ఎక్కువేమో అని మీరు అనుకుంటున్నారా?',
        examples: [
          {
            en: 'I spend about three hours a day on my smartphone, mostly on messages.',
            native: 'నేను రోజుకు సుమారు మూడు గంటలు నా స్మార్ట్‌ఫోన్‌పై గడుపుతాను, ఎక్కువగా మెసేజ్‌లపై.',
          },
          {
            en: 'I think it is too much, so I have set a timer for social apps.',
            native: 'అది ఎక్కువేమో అని నేను అనుకుంటున్నాను, కాబట్టి సోషల్ యాప్‌లకు టైమర్ పెట్టాను.',
          },
          {
            en: 'My phone is useful for studying, but it also wastes my time.',
            native: 'నా ఫోన్ చదువుకు ఉపయోగపడుతుంది, కానీ అది నా సమయాన్ని కూడా వృథా చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'स्मार्टफ़ोन',
        question: 'आप हर दिन अपने स्मार्टफ़ोन पर कितना समय बिताते हैं? क्या आपको लगता है कि यह बहुत ज़्यादा है?',
        examples: [
          {
            en: 'I spend about three hours a day on my smartphone, mostly on messages.',
            native: 'मैं दिन में लगभग तीन घंटे अपने स्मार्टफ़ोन पर बिताता हूँ, ज़्यादातर मैसेज पर।',
          },
          {
            en: 'I think it is too much, so I have set a timer for social apps.',
            native: 'मुझे लगता है कि यह बहुत ज़्यादा है, इसलिए मैंने सोशल ऐप्स के लिए टाइमर लगाया है।',
          },
          {
            en: 'My phone is useful for studying, but it also wastes my time.',
            native: 'मेरा फ़ोन पढ़ाई में उपयोगी है, लेकिन यह मेरा समय भी बर्बाद करता है।',
          },
        ],
      },
      es: {
        word: 'teléfono inteligente',
        question: '¿Cuánto tiempo pasas al día con tu teléfono inteligente? ¿Crees que es demasiado?',
        examples: [
          {
            en: 'I spend about three hours a day on my smartphone, mostly on messages.',
            native: 'Paso unas tres horas al día con el teléfono, sobre todo en mensajes.',
          },
          {
            en: 'I think it is too much, so I have set a timer for social apps.',
            native: 'Creo que es demasiado, así que he puesto un temporizador en las redes sociales.',
          },
          {
            en: 'My phone is useful for studying, but it also wastes my time.',
            native: 'Mi teléfono es útil para estudiar, pero también me hace perder el tiempo.',
          },
        ],
      },
      zh: {
        word: '智能手机',
        question: '你每天花多少时间在智能手机上？你觉得太多了吗？',
        examples: [
          {
            en: 'I spend about three hours a day on my smartphone, mostly on messages.',
            native: '我每天大约花三个小时在智能手机上，主要是发消息。',
          },
          {
            en: 'I think it is too much, so I have set a timer for social apps.',
            native: '我觉得太多了，所以我给社交软件设了使用时间限制。',
          },
          {
            en: 'My phone is useful for studying, but it also wastes my time.',
            native: '我的手机对学习有用，但也浪费我的时间。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'internet',
    questionText: 'How has the internet changed the way you learn and communicate?',
    translations: {
      te: {
        word: 'ఇంటర్నెట్',
        question: 'మీరు నేర్చుకునే మరియు కమ్యూనికేట్ చేసే విధానాన్ని ఇంటర్నెట్ ఎలా మార్చింది?',
        examples: [
          {
            en: 'The internet has made learning easier because everything is one search away.',
            native: 'ప్రతిదీ ఒక సెర్చ్ దూరంలో ఉన్నందున ఇంటర్నెట్ నేర్చుకోవడాన్ని సులభం చేసింది.',
          },
          {
            en: 'I video-call my cousins every week, although they live in another country.',
            native: 'నా కజిన్స్ మరో దేశంలో ఉన్నప్పటికీ, వారితో ప్రతి వారం వీడియో కాల్ చేస్తాను.',
          },
          {
            en: 'Before the internet, finding information took much longer than today.',
            native: 'ఇంటర్నెట్ రాకముందు, సమాచారం కనుగొనడం నేటి కంటే చాలా ఎక్కువ సమయం పట్టేది.',
          },
        ],
      },
      hi: {
        word: 'इंटरनेट',
        question: 'इंटरनेट ने आपके सीखने और संवाद करने के तरीके को कैसे बदला है?',
        examples: [
          {
            en: 'The internet has made learning easier because everything is one search away.',
            native: 'इंटरनेट ने सीखना आसान बना दिया है क्योंकि हर चीज़ एक खोज की दूरी पर है।',
          },
          {
            en: 'I video-call my cousins every week, although they live in another country.',
            native: 'मैं हर हफ़्ते अपने चचेरे भाइयों से वीडियो कॉल करता हूँ, भले ही वे दूसरे देश में रहते हैं।',
          },
          {
            en: 'Before the internet, finding information took much longer than today.',
            native: 'इंटरनेट से पहले, जानकारी खोजने में आज की तुलना में बहुत ज़्यादा समय लगता था।',
          },
        ],
      },
      es: {
        word: 'internet',
        question: '¿Cómo ha cambiado internet tu forma de aprender y comunicarte?',
        examples: [
          {
            en: 'The internet has made learning easier because everything is one search away.',
            native: 'Internet ha hecho que aprender sea más fácil porque todo está a una búsqueda de distancia.',
          },
          {
            en: 'I video-call my cousins every week, although they live in another country.',
            native: 'Hago videollamadas con mis primos cada semana, aunque viven en otro país.',
          },
          {
            en: 'Before the internet, finding information took much longer than today.',
            native: 'Antes de internet, encontrar información llevaba mucho más tiempo que hoy.',
          },
        ],
      },
      zh: {
        word: '互联网',
        question: '互联网如何改变了你学习和交流的方式？',
        examples: [
          {
            en: 'The internet has made learning easier because everything is one search away.',
            native: '互联网让学习变得更容易，因为一切都只需一次搜索。',
          },
          {
            en: 'I video-call my cousins every week, although they live in another country.',
            native: '我每周都和住在另一个国家的表亲们视频通话。',
          },
          {
            en: 'Before the internet, finding information took much longer than today.',
            native: '在互联网出现之前，查找信息比今天花的时间长得多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'television',
    questionText: 'Do you watch television often? What programs do you like and why?',
    translations: {
      te: {
        word: 'టెలివిజన్',
        question: 'మీరు తరచుగా టెలివిజన్ చూస్తారా? మీకు ఏ ప్రోగ్రామ్‌లు ఇష్టం మరియు ఎందుకు?',
        examples: [
          {
            en: 'I watch television every evening with my family after dinner.',
            native: 'నేను ప్రతి సాయంత్రం భోజనం తర్వాత నా కుటుంబంతో టెలివిజన్ చూస్తాను.',
          },
          {
            en: 'I like nature programs because they show places I have never seen.',
            native: 'నాకు ప్రకృతి ప్రోగ్రామ్‌లు ఇష్టం, ఎందుకంటే అవి నేను ఎప్పుడూ చూడని ప్రదేశాలను చూపిస్తాయి.',
          },
          {
            en: 'Watching too much television is worse than reading, in my opinion.',
            native: 'నా అభిప్రాయం ప్రకారం, టెలివిజన్ ఎక్కువగా చూడటం చదవడం కంటే చెత్తది.',
          },
        ],
      },
      hi: {
        word: 'टेलीविज़न',
        question: 'क्या आप अक्सर टेलीविज़न देखते हैं? आपको कौन से कार्यक्रम पसंद हैं और क्यों?',
        examples: [
          {
            en: 'I watch television every evening with my family after dinner.',
            native: 'मैं हर शाम रात के खाने के बाद अपने परिवार के साथ टेलीविज़न देखता हूँ।',
          },
          {
            en: 'I like nature programs because they show places I have never seen.',
            native:
              'मुझे प्रकृति पर आधारित कार्यक्रम पसंद हैं क्योंकि वे ऐसी जगहें दिखाते हैं जिन्हें मैंने कभी नहीं देखा।',
          },
          {
            en: 'Watching too much television is worse than reading, in my opinion.',
            native: 'मेरी राय में, बहुत ज़्यादा टेलीविज़न देखना पढ़ने से बुरा है।',
          },
        ],
      },
      es: {
        word: 'televisión',
        question: '¿Ves la televisión a menudo? ¿Qué programas te gustan y por qué?',
        examples: [
          {
            en: 'I watch television every evening with my family after dinner.',
            native: 'Veo la televisión cada noche con mi familia después de cenar.',
          },
          {
            en: 'I like nature programs because they show places I have never seen.',
            native: 'Me gustan los programas de naturaleza porque muestran lugares que nunca he visto.',
          },
          {
            en: 'Watching too much television is worse than reading, in my opinion.',
            native: 'En mi opinión, ver demasiada televisión es peor que leer.',
          },
        ],
      },
      zh: {
        word: '电视',
        question: '你经常看电视吗？你喜欢什么节目，为什么？',
        examples: [
          {
            en: 'I watch television every evening with my family after dinner.',
            native: '我每天晚饭后和家人一起看电视。',
          },
          {
            en: 'I like nature programs because they show places I have never seen.',
            native: '我喜欢自然节目，因为它们展示我从未见过的地方。',
          },
          {
            en: 'Watching too much television is worse than reading, in my opinion.',
            native: '在我看来，看太多电视比读书更糟糕。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'game',
    questionText: 'What games did you play as a child, and what games do you play now?',
    translations: {
      te: {
        word: 'ఆట',
        question: 'మీరు చిన్నప్పుడు ఏ ఆటలు ఆడేవారు, మరియు ఇప్పుడు ఏ ఆటలు ఆడుతున్నారు?',
        examples: [
          {
            en: 'As a child, I played hide and seek with my friends in the street.',
            native: 'చిన్నప్పుడు, నేను వీధిలో నా స్నేహితులతో దాగుడుమూతలు ఆడేవాడిని.',
          },
          {
            en: 'Now I play chess on my phone because it keeps my mind sharp.',
            native: 'ఇప్పుడు నేను ఫోన్‌లో చెస్ ఆడుతాను, ఎందుకంటే అది నా మనస్సును పదునుగా ఉంచుతుంది.',
          },
          {
            en: 'Outdoor games are healthier than video games, but both are fun.',
            native: 'వీడియో గేమ్‌ల కంటే బహిరంగ ఆటలు ఆరోగ్యకరం, కానీ రెండూ సరదాగానే ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'खेल',
        question: 'बचपन में आप कौन से खेल खेलते थे, और अब आप कौन से खेल खेलते हैं?',
        examples: [
          {
            en: 'As a child, I played hide and seek with my friends in the street.',
            native: 'बचपन में, मैं गली में अपने दोस्तों के साथ छुपन-छुपाई खेलता था।',
          },
          {
            en: 'Now I play chess on my phone because it keeps my mind sharp.',
            native: 'अब मैं अपने फ़ोन पर शतरंज खेलता हूँ क्योंकि इससे मेरा दिमाग तेज़ रहता है।',
          },
          {
            en: 'Outdoor games are healthier than video games, but both are fun.',
            native: 'वीडियो गेम की तुलना में बाहर के खेल सेहत के लिए बेहतर हैं, लेकिन दोनों मज़ेदार हैं।',
          },
        ],
      },
      es: {
        word: 'juego',
        question: '¿A qué juegos jugabas de niño y a cuáles juegas ahora?',
        examples: [
          {
            en: 'As a child, I played hide and seek with my friends in the street.',
            native: 'De niño, jugaba al escondite con mis amigos en la calle.',
          },
          {
            en: 'Now I play chess on my phone because it keeps my mind sharp.',
            native: 'Ahora juego al ajedrez en el móvil porque mantiene mi mente ágil.',
          },
          {
            en: 'Outdoor games are healthier than video games, but both are fun.',
            native: 'Los juegos al aire libre son más sanos que los videojuegos, pero ambos son divertidos.',
          },
        ],
      },
      zh: {
        word: '游戏',
        question: '你小时候玩什么游戏？现在玩什么游戏？',
        examples: [
          {
            en: 'As a child, I played hide and seek with my friends in the street.',
            native: '小时候，我和朋友们在街上玩捉迷藏。',
          },
          {
            en: 'Now I play chess on my phone because it keeps my mind sharp.',
            native: '现在我在手机上下国际象棋，因为它能让我保持思维敏捷。',
          },
          {
            en: 'Outdoor games are healthier than video games, but both are fun.',
            native: '户外游戏比电子游戏更健康，但两者都很有趣。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'dance',
    questionText: 'Do you like dancing? When do people dance in your culture?',
    translations: {
      te: {
        word: 'నృత్యం',
        question: 'మీకు డాన్స్ చేయడం ఇష్టమా? మీ సంస్కృతిలో ప్రజలు ఎప్పుడు డాన్స్ చేస్తారు?',
        examples: [
          {
            en: 'I like dancing at weddings because everyone is happy and relaxed.',
            native: 'పెళ్లిళ్లలో డాన్స్ చేయడం నాకు ఇష్టం, ఎందుకంటే అందరూ సంతోషంగా మరియు రిలాక్స్‌గా ఉంటారు.',
          },
          {
            en: 'In my culture, people dance during festivals and family celebrations.',
            native: 'మా సంస్కృతిలో, పండుగలు మరియు కుటుంబ వేడుకల సమయంలో ప్రజలు డాన్స్ చేస్తారు.',
          },
          {
            en: 'I have never taken dance lessons, but I enjoy moving to music.',
            native: 'నేను ఎప్పుడూ డాన్స్ క్లాస్‌లు తీసుకోలేదు, కానీ సంగీతానికి అడుగులు వేయడం నాకు ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'नृत्य',
        question: 'क्या आपको नाचना पसंद है? आपकी संस्कृति में लोग कब नाचते हैं?',
        examples: [
          {
            en: 'I like dancing at weddings because everyone is happy and relaxed.',
            native: 'मुझे शादियों में नाचना पसंद है क्योंकि सब खुश और बेफ़िक्र होते हैं।',
          },
          {
            en: 'In my culture, people dance during festivals and family celebrations.',
            native: 'मेरी संस्कृति में, लोग त्योहारों और पारिवारिक समारोहों में नाचते हैं।',
          },
          {
            en: 'I have never taken dance lessons, but I enjoy moving to music.',
            native: 'मैंने कभी नृत्य की कक्षाएँ नहीं लीं, लेकिन मुझे संगीत पर झूमना अच्छा लगता है।',
          },
        ],
      },
      es: {
        word: 'baile',
        question: '¿Te gusta bailar? ¿Cuándo baila la gente en tu cultura?',
        examples: [
          {
            en: 'I like dancing at weddings because everyone is happy and relaxed.',
            native: 'Me gusta bailar en las bodas porque todos están felices y relajados.',
          },
          {
            en: 'In my culture, people dance during festivals and family celebrations.',
            native: 'En mi cultura, la gente baila durante las fiestas y las celebraciones familiares.',
          },
          {
            en: 'I have never taken dance lessons, but I enjoy moving to music.',
            native: 'Nunca he tomado clases de baile, pero disfruto moviéndome al ritmo de la música.',
          },
        ],
      },
      zh: {
        word: '舞蹈',
        question: '你喜欢跳舞吗？在你们文化中人们什么时候跳舞？',
        examples: [
          {
            en: 'I like dancing at weddings because everyone is happy and relaxed.',
            native: '我喜欢在婚礼上跳舞，因为每个人都很开心、很放松。',
          },
          {
            en: 'In my culture, people dance during festivals and family celebrations.',
            native: '在我们的文化中，人们在节日和家庭庆典上跳舞。',
          },
          {
            en: 'I have never taken dance lessons, but I enjoy moving to music.',
            native: '我从未上过舞蹈课，但我喜欢随着音乐舞动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'swimming',
    questionText: 'Can you swim? Talk about your experiences with swimming.',
    translations: {
      te: {
        word: 'ఈత',
        question: 'మీకు ఈత తెలుసా? ఈతతో మీ అనుభవాల గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I learned to swim when I was eight years old at a local pool.',
            native: 'నాకు ఎనిమిది సంవత్సరాల వయస్సులో స్థానిక స్విమ్మింగ్ పూల్‌లో ఈత నేర్చుకున్నాను.',
          },
          {
            en: 'Swimming is my favourite exercise because it is gentle on the body.',
            native: 'ఈత నా ఇష్టమైన వ్యాయామం, ఎందుకంటే అది శరీరానికి సున్నితమైనది.',
          },
          {
            en: 'Last summer, I swam in the sea for the first time, and I felt free.',
            native: 'గత వేసవిలో, నేను మొదటిసారి సముద్రంలో ఈత కొట్టాను, నాకు స్వేచ్ఛగా అనిపించింది.',
          },
        ],
      },
      hi: {
        word: 'तैरना',
        question: 'क्या आपको तैरना आता है? तैरने से जुड़े अपने अनुभवों के बारे में बताइए।',
        examples: [
          {
            en: 'I learned to swim when I was eight years old at a local pool.',
            native: 'मैंने आठ साल की उम्र में स्थानीय पूल में तैरना सीखा था।',
          },
          {
            en: 'Swimming is my favourite exercise because it is gentle on the body.',
            native: 'तैरना मेरा पसंदीदा व्यायाम है क्योंकि यह शरीर के लिए हल्का होता है।',
          },
          {
            en: 'Last summer, I swam in the sea for the first time, and I felt free.',
            native: 'पिछली गर्मियों में, मैं पहली बार समुद्र में तैरा, और मुझे आज़ादी महसूस हुई।',
          },
        ],
      },
      es: {
        word: 'natación',
        question: '¿Sabes nadar? Habla de tus experiencias con la natación.',
        examples: [
          {
            en: 'I learned to swim when I was eight years old at a local pool.',
            native: 'Aprendí a nadar a los ocho años en una piscina local.',
          },
          {
            en: 'Swimming is my favourite exercise because it is gentle on the body.',
            native: 'La natación es mi ejercicio favorito porque es suave para el cuerpo.',
          },
          {
            en: 'Last summer, I swam in the sea for the first time, and I felt free.',
            native: 'El verano pasado nadé en el mar por primera vez y me sentí libre.',
          },
        ],
      },
      zh: {
        word: '游泳',
        question: '你会游泳吗？谈谈你与游泳有关的经历。',
        examples: [
          {
            en: 'I learned to swim when I was eight years old at a local pool.',
            native: '我八岁时在当地的游泳池学会了游泳。',
          },
          {
            en: 'Swimming is my favourite exercise because it is gentle on the body.',
            native: '游泳是我最喜欢的运动，因为它对身体很温和。',
          },
          {
            en: 'Last summer, I swam in the sea for the first time, and I felt free.',
            native: '去年夏天，我第一次在海里游泳，感觉非常自由。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'bicycle',
    questionText: 'Do you ride a bicycle? What are the advantages of cycling?',
    translations: {
      te: {
        word: 'సైకిల్',
        question: 'మీరు సైకిల్ తొక్కుతారా? సైక్లింగ్ యొక్క ప్రయోజనాలు ఏమిటి?',
        examples: [
          {
            en: 'I ride my bicycle to college because it is cheaper than the bus.',
            native: 'నేను కాలేజీకి సైకిల్ తొక్కుతాను, ఎందుకంటే అది బస్సు కంటే చౌక.',
          },
          {
            en: 'Cycling keeps me healthy and does not pollute the air.',
            native: 'సైక్లింగ్ నన్ను ఆరోగ్యంగా ఉంచుతుంది మరియు గాలిని కలుషితం చేయదు.',
          },
          {
            en: 'When I was younger, I fell off my bicycle but got up and tried again.',
            native: 'నేను చిన్నప్పుడు సైకిల్ నుండి పడిపోయాను, కానీ లేచి మళ్లీ ప్రయత్నించాను.',
          },
        ],
      },
      hi: {
        word: 'साइकिल',
        question: 'क्या आप साइकिल चलाते हैं? साइकिल चलाने के क्या फ़ायदे हैं?',
        examples: [
          {
            en: 'I ride my bicycle to college because it is cheaper than the bus.',
            native: 'मैं कॉलेज साइकिल से जाता हूँ क्योंकि यह बस से सस्ता है।',
          },
          {
            en: 'Cycling keeps me healthy and does not pollute the air.',
            native: 'साइकिल चलाने से मैं स्वस्थ रहता हूँ और हवा प्रदूषित नहीं होती।',
          },
          {
            en: 'When I was younger, I fell off my bicycle but got up and tried again.',
            native: 'जब मैं छोटा था, मैं साइकिल से गिर गया था, लेकिन उठकर फिर कोशिश की।',
          },
        ],
      },
      es: {
        word: 'bicicleta',
        question: '¿Montas en bicicleta? ¿Cuáles son las ventajas de ir en bicicleta?',
        examples: [
          {
            en: 'I ride my bicycle to college because it is cheaper than the bus.',
            native: 'Voy a la universidad en bicicleta porque es más barato que el autobús.',
          },
          {
            en: 'Cycling keeps me healthy and does not pollute the air.',
            native: 'Ir en bicicleta me mantiene sano y no contamina el aire.',
          },
          {
            en: 'When I was younger, I fell off my bicycle but got up and tried again.',
            native: 'Cuando era más joven, me caí de la bicicleta, pero me levanté y lo intenté de nuevo.',
          },
        ],
      },
      zh: {
        word: '自行车',
        question: '你骑自行车吗？骑自行车有什么好处？',
        examples: [
          {
            en: 'I ride my bicycle to college because it is cheaper than the bus.',
            native: '我骑自行车上大学，因为比坐公交车便宜。',
          },
          {
            en: 'Cycling keeps me healthy and does not pollute the air.',
            native: '骑自行车让我保持健康，而且不污染空气。',
          },
          {
            en: 'When I was younger, I fell off my bicycle but got up and tried again.',
            native: '我小时候从自行车上摔下来过，但我爬起来再试了一次。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'park',
    questionText: 'Is there a park near your home? What do people do there?',
    translations: {
      te: {
        word: 'పార్కు',
        question: 'మీ ఇంటి దగ్గర పార్కు ఉందా? అక్కడ ప్రజలు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'There is a small park near my house with many trees and benches.',
            native: 'నా ఇంటి దగ్గర చాలా చెట్లు మరియు బెంచీలతో ఒక చిన్న పార్కు ఉంది.',
          },
          {
            en: 'In the morning, people walk and do yoga there.',
            native: 'ఉదయం, ప్రజలు అక్కడ నడుస్తారు మరియు యోగా చేస్తారు.',
          },
          {
            en: 'I often sit in the park and read because it is quiet and green.',
            native: 'అది ప్రశాంతంగా మరియు పచ్చగా ఉన్నందున నేను తరచుగా పార్కులో కూర్చుని చదువుతాను.',
          },
        ],
      },
      hi: {
        word: 'पार्क',
        question: 'क्या आपके घर के पास कोई पार्क है? लोग वहाँ क्या करते हैं?',
        examples: [
          {
            en: 'There is a small park near my house with many trees and benches.',
            native: 'मेरे घर के पास कई पेड़ों और बेंचों वाला एक छोटा पार्क है।',
          },
          { en: 'In the morning, people walk and do yoga there.', native: 'सुबह, लोग वहाँ घूमते हैं और योग करते हैं।' },
          {
            en: 'I often sit in the park and read because it is quiet and green.',
            native: 'मैं अक्सर पार्क में बैठकर पढ़ता हूँ क्योंकि वहाँ शांत और हरियाली है।',
          },
        ],
      },
      es: {
        word: 'parque',
        question: '¿Hay un parque cerca de tu casa? ¿Qué hace la gente allí?',
        examples: [
          {
            en: 'There is a small park near my house with many trees and benches.',
            native: 'Hay un parque pequeño cerca de mi casa con muchos árboles y bancos.',
          },
          {
            en: 'In the morning, people walk and do yoga there.',
            native: 'Por la mañana, la gente pasea y hace yoga allí.',
          },
          {
            en: 'I often sit in the park and read because it is quiet and green.',
            native: 'A menudo me siento en el parque a leer porque es tranquilo y verde.',
          },
        ],
      },
      zh: {
        word: '公园',
        question: '你家附近有公园吗？人们在那里做什么？',
        examples: [
          {
            en: 'There is a small park near my house with many trees and benches.',
            native: '我家附近有一个小公园，里面有很多树和长椅。',
          },
          { en: 'In the morning, people walk and do yoga there.', native: '早上，人们在那里散步、做瑜伽。' },
          {
            en: 'I often sit in the park and read because it is quiet and green.',
            native: '我经常坐在公园里看书，因为那里安静又充满绿色。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'city',
    questionText: 'Do you prefer living in a city or in the countryside? Why?',
    translations: {
      te: {
        word: 'నగరం',
        question: 'నగరంలో నివసించడానికా లేదా గ్రామీణ ప్రాంతంలో నివసించడానికా మీరు ఇష్టపడతారు? ఎందుకు?',
        examples: [
          {
            en: 'I prefer city life because everything is close and easy to reach.',
            native: 'ప్రతిదీ దగ్గరగా మరియు సులభంగా అందుబాటులో ఉన్నందున నాకు నగర జీవితం ఇష్టం.',
          },
          {
            en: 'However, the countryside is quieter and the air is cleaner.',
            native: 'అయితే, గ్రామీణ ప్రాంతం ప్రశాంతంగా ఉంటుంది మరియు గాలి శుద్ధంగా ఉంటుంది.',
          },
          {
            en: 'Cities are more exciting, but they are also more expensive.',
            native: 'నగరాలు మరింత ఉత్సాహంగా ఉంటాయి, కానీ అవి ఖరీదైనవి కూడా.',
          },
        ],
      },
      hi: {
        word: 'शहर',
        question: 'आप शहर में रहना पसंद करेंगे या गाँव में? क्यों?',
        examples: [
          {
            en: 'I prefer city life because everything is close and easy to reach.',
            native: 'मुझे शहर की ज़िंदगी पसंद है क्योंकि हर चीज़ पास और आसानी से उपलब्ध होती है।',
          },
          {
            en: 'However, the countryside is quieter and the air is cleaner.',
            native: 'हालांकि, गाँव ज़्यादा शांत होता है और हवा वहाँ ज़्यादा साफ़ होती है।',
          },
          {
            en: 'Cities are more exciting, but they are also more expensive.',
            native: 'शहर ज़्यादा रोमांचक होते हैं, लेकिन वे ज़्यादा महँगे भी होते हैं।',
          },
        ],
      },
      es: {
        word: 'ciudad',
        question: '¿Prefieres vivir en la ciudad o en el campo? ¿Por qué?',
        examples: [
          {
            en: 'I prefer city life because everything is close and easy to reach.',
            native: 'Prefiero la vida en la ciudad porque todo está cerca y es fácil de alcanzar.',
          },
          {
            en: 'However, the countryside is quieter and the air is cleaner.',
            native: 'Sin embargo, el campo es más tranquilo y el aire es más limpio.',
          },
          {
            en: 'Cities are more exciting, but they are also more expensive.',
            native: 'Las ciudades son más emocionantes, pero también más caras.',
          },
        ],
      },
      zh: {
        word: '城市',
        question: '你更喜欢住在城市还是乡村？为什么？',
        examples: [
          {
            en: 'I prefer city life because everything is close and easy to reach.',
            native: '我更喜欢城市生活，因为一切都近在咫尺、方便快捷。',
          },
          {
            en: 'However, the countryside is quieter and the air is cleaner.',
            native: '不过，乡村更安静，空气也更清新。',
          },
          {
            en: 'Cities are more exciting, but they are also more expensive.',
            native: '城市更令人兴奋，但生活成本也更高。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'village',
    questionText: 'Talk about a village you have visited. How is life there different from city life?',
    translations: {
      te: {
        word: 'గ్రామం',
        question: 'మీరు సందర్శించిన ఒక గ్రామం గురించి మాట్లాడండి. అక్కడి జీవితం నగర జీవితం నుండి ఎలా భిన్నంగా ఉంటుంది?',
        examples: [
          {
            en: 'My grandparents live in a village surrounded by green fields.',
            native: 'నా తాతయ్య, అమ్మమ్మ పచ్చని పొలాల మధ్య ఉన్న ఒక గ్రామంలో నివసిస్తారు.',
          },
          {
            en: 'Life there is slower and more peaceful than in the city.',
            native: 'అక్కడి జీవితం నగరం కంటే నెమ్మదిగా మరియు ప్రశాంతంగా ఉంటుంది.',
          },
          {
            en: 'People in the village know each other, which makes it feel like one family.',
            native: 'గ్రామంలోని ప్రజలు ఒకరినొకరు తెలుసుకుంటారు, అది ఒకే కుటుంబంలా అనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'गाँव',
        question: 'किसी ऐसे गाँव के बारे में बताइए जहाँ आप गए हों। वहाँ की ज़िंदगी शहर से कैसे अलग है?',
        examples: [
          {
            en: 'My grandparents live in a village surrounded by green fields.',
            native: 'मेरे दादा-दादी हरे-भरे खेतों से घिरे एक गाँव में रहते हैं।',
          },
          {
            en: 'Life there is slower and more peaceful than in the city.',
            native: 'वहाँ की ज़िंदगी शहर की तुलना में धीमी और ज़्यादा शांतिपूर्ण है।',
          },
          {
            en: 'People in the village know each other, which makes it feel like one family.',
            native: 'गाँव के लोग एक-दूसरे को जानते हैं, जिससे वहाँ एक परिवार जैसा माहौल लगता है।',
          },
        ],
      },
      es: {
        word: 'pueblo',
        question: 'Habla de un pueblo que hayas visitado. ¿En qué se diferencia la vida allí de la vida en la ciudad?',
        examples: [
          {
            en: 'My grandparents live in a village surrounded by green fields.',
            native: 'Mis abuelos viven en un pueblo rodeado de campos verdes.',
          },
          {
            en: 'Life there is slower and more peaceful than in the city.',
            native: 'La vida allí es más lenta y tranquila que en la ciudad.',
          },
          {
            en: 'People in the village know each other, which makes it feel like one family.',
            native: 'La gente del pueblo se conoce entre sí, lo que hace que parezca una sola familia.',
          },
        ],
      },
      zh: {
        word: '村庄',
        question: '谈谈你去过的一个村庄。那里的生活和城市生活有什么不同？',
        examples: [
          {
            en: 'My grandparents live in a village surrounded by green fields.',
            native: '我的祖父母住在一个被绿色田野环绕的村庄里。',
          },
          { en: 'Life there is slower and more peaceful than in the city.', native: '那里的生活比城市慢，也更宁静。' },
          {
            en: 'People in the village know each other, which makes it feel like one family.',
            native: '村里的人互相都认识，让人感觉像一个大家庭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'restaurant',
    questionText: 'What is your favourite restaurant? What do you usually order there?',
    translations: {
      te: {
        word: 'రెస్టారెంట్',
        question: 'మీకు ఇష్టమైన రెస్టారెంట్ ఏది? మీరు అక్కడ సాధారణంగా ఏమి ఆర్డర్ చేస్తారు?',
        examples: [
          {
            en: 'My favourite restaurant is a small family place near the station.',
            native: 'నా ఇష్టమైన రెస్టారెంట్ స్టేషన్ దగ్గర ఉన్న ఒక చిన్న కుటుంబ రెస్టారెంట్.',
          },
          {
            en: 'I usually order their special curry because it is spicy and fresh.',
            native: 'నేను సాధారణంగా వారి స్పెషల్ కర్రీ ఆర్డర్ చేస్తాను, ఎందుకంటే అది కారంగా మరియు తాజాగా ఉంటుంది.',
          },
          {
            en: 'Eating there reminds me of celebrations with my family.',
            native: 'అక్కడ భోజనం చేయడం నాకు నా కుటుంబంతో వేడుకల గుర్తు చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'रेस्तराँ',
        question: 'आपका पसंदीदा रेस्तराँ कौन सा है? आप वहाँ आमतौर पर क्या मंगवाते हैं?',
        examples: [
          {
            en: 'My favourite restaurant is a small family place near the station.',
            native: 'मेरा पसंदीदा रेस्तराँ स्टेशन के पास एक छोटा पारिवारिक रेस्तराँ है।',
          },
          {
            en: 'I usually order their special curry because it is spicy and fresh.',
            native: 'मैं आमतौर पर वहाँ की स्पेशल करी मंगवाता हूँ क्योंकि वह मसालेदार और ताज़ी होती है।',
          },
          {
            en: 'Eating there reminds me of celebrations with my family.',
            native: 'वहाँ खाना खाने से मुझे परिवार के साथ मनाए गए जश्न की याद आती है।',
          },
        ],
      },
      es: {
        word: 'restaurante',
        question: '¿Cuál es tu restaurante favorito? ¿Qué sueles pedir allí?',
        examples: [
          {
            en: 'My favourite restaurant is a small family place near the station.',
            native: 'Mi restaurante favorito es un pequeño lugar familiar cerca de la estación.',
          },
          {
            en: 'I usually order their special curry because it is spicy and fresh.',
            native: 'Normalmente pido su curry especial porque es picante y fresco.',
          },
          {
            en: 'Eating there reminds me of celebrations with my family.',
            native: 'Comer allí me recuerda a las celebraciones con mi familia.',
          },
        ],
      },
      zh: {
        word: '餐厅',
        question: '你最喜欢的餐厅是哪家？你通常在那里点什么？',
        examples: [
          {
            en: 'My favourite restaurant is a small family place near the station.',
            native: '我最喜欢的餐厅是车站附近的一家小型家庭餐馆。',
          },
          {
            en: 'I usually order their special curry because it is spicy and fresh.',
            native: '我通常点他们的特色咖喱，因为又辣又新鲜。',
          },
          {
            en: 'Eating there reminds me of celebrations with my family.',
            native: '在那里吃饭让我想起和家人一起庆祝的时光。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'birthday',
    questionText: 'How do you usually celebrate your birthday?',
    translations: {
      te: {
        word: 'పుట్టినరోజు',
        question: 'మీరు మీ పుట్టినరోజును సాధారణంగా ఎలా జరుపుకుంటారు?',
        examples: [
          {
            en: 'I usually celebrate my birthday with a small dinner at home.',
            native: 'నేను సాధారణంగా ఇంట్లో చిన్న విందుతో నా పుట్టినరోజును జరుపుకుంటాను.',
          },
          {
            en: 'My friends call me at midnight, which always makes me smile.',
            native: 'నా స్నేహితులు అర్ధరాత్రి నాకు కాల్ చేస్తారు, అది ఎప్పుడూ నన్ను నవ్విస్తుంది.',
          },
          {
            en: 'Birthdays are special because they bring people together.',
            native: 'పుట్టినరోజులు ప్రత్యేకమైనవి, ఎందుకంటే అవి ప్రజలను ఒకచోట చేరుస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'जन्मदिन',
        question: 'आप आमतौर पर अपना जन्मदिन कैसे मनाते हैं?',
        examples: [
          {
            en: 'I usually celebrate my birthday with a small dinner at home.',
            native: 'मैं आमतौर पर घर पर छोटे डिनर के साथ अपना जन्मदिन मनाता हूँ।',
          },
          {
            en: 'My friends call me at midnight, which always makes me smile.',
            native: 'मेरे दोस्त आधी रात को मुझे फ़ोन करते हैं, जिससे मुझे हमेशा खुशी होती है।',
          },
          {
            en: 'Birthdays are special because they bring people together.',
            native: 'जन्मदिन खास होते हैं क्योंकि वे लोगों को एक साथ लाते हैं।',
          },
        ],
      },
      es: {
        word: 'cumpleaños',
        question: '¿Cómo sueles celebrar tu cumpleaños?',
        examples: [
          {
            en: 'I usually celebrate my birthday with a small dinner at home.',
            native: 'Normalmente celebro mi cumpleaños con una cena pequeña en casa.',
          },
          {
            en: 'My friends call me at midnight, which always makes me smile.',
            native: 'Mis amigos me llaman a medianoche, lo que siempre me hace sonreír.',
          },
          {
            en: 'Birthdays are special because they bring people together.',
            native: 'Los cumpleaños son especiales porque unen a la gente.',
          },
        ],
      },
      zh: {
        word: '生日',
        question: '你通常怎么庆祝生日？',
        examples: [
          {
            en: 'I usually celebrate my birthday with a small dinner at home.',
            native: '我通常在家用一顿简单的晚餐庆祝生日。',
          },
          {
            en: 'My friends call me at midnight, which always makes me smile.',
            native: '我的朋友们会在午夜给我打电话，这总能让我开心。',
          },
          {
            en: 'Birthdays are special because they bring people together.',
            native: '生日很特别，因为它把人们聚在一起。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'wedding',
    questionText: 'Describe a wedding you have attended. What was it like?',
    translations: {
      te: {
        word: 'వివాహం',
        question: 'మీరు హాజరైన ఒక వివాహాన్ని వివరించండి. అది ఎలా ఉంది?',
        examples: [
          {
            en: "Last year, I attended my cousin's wedding in a big hall.",
            native: 'గత సంవత్సరం, నేను ఒక పెద్ద హాలులో నా కజిన్ వివాహానికి హాజరయ్యాను.',
          },
          {
            en: 'The bride wore a beautiful red dress, and everyone took photos.',
            native: 'వధువు అందమైన ఎరుపు రంగు దుస్తులు ధరించింది, అందరూ ఫోటోలు తీశారు.',
          },
          {
            en: 'The food was delicious, and we danced until late at night.',
            native: 'భోజనం రుచిగా ఉంది, మేము రాత్రి ఆలస్యం వరకు డాన్స్ చేశాము.',
          },
        ],
      },
      hi: {
        word: 'शादी',
        question: 'किसी ऐसी शादी का वर्णन कीजिए जिसमें आप शामिल हुए हों। वह कैसी थी?',
        examples: [
          {
            en: "Last year, I attended my cousin's wedding in a big hall.",
            native: 'पिछले साल, मैं एक बड़े हॉल में अपने चचेरे भाई की शादी में शामिल हुआ।',
          },
          {
            en: 'The bride wore a beautiful red dress, and everyone took photos.',
            native: 'दुल्हन ने सुंदर लाल पोशाक पहनी थी, और सबने तस्वीरें लीं।',
          },
          {
            en: 'The food was delicious, and we danced until late at night.',
            native: 'खाना स्वादिष्ट था, और हम देर रात तक नाचते रहे।',
          },
        ],
      },
      es: {
        word: 'boda',
        question: 'Describe una boda a la que hayas asistido. ¿Cómo fue?',
        examples: [
          {
            en: "Last year, I attended my cousin's wedding in a big hall.",
            native: 'El año pasado asistí a la boda de mi primo en un gran salón.',
          },
          {
            en: 'The bride wore a beautiful red dress, and everyone took photos.',
            native: 'La novia llevaba un precioso vestido rojo y todos hicieron fotos.',
          },
          {
            en: 'The food was delicious, and we danced until late at night.',
            native: 'La comida estaba deliciosa y bailamos hasta altas horas de la noche.',
          },
        ],
      },
      zh: {
        word: '婚礼',
        question: '描述一场你参加过的婚礼。它是什么样的？',
        examples: [
          {
            en: "Last year, I attended my cousin's wedding in a big hall.",
            native: '去年，我在一个大厅里参加了表哥的婚礼。',
          },
          {
            en: 'The bride wore a beautiful red dress, and everyone took photos.',
            native: '新娘穿着漂亮的红色礼服，大家都拍了照片。',
          },
          {
            en: 'The food was delicious, and we danced until late at night.',
            native: '食物很美味，我们跳舞跳到深夜。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'library',
    questionText: 'Do you use libraries? What are the benefits of reading in a library?',
    translations: {
      te: {
        word: 'గ్రంథాలయం',
        question: 'మీరు గ్రంథాలయాలను వాడతారా? గ్రంథాలయంలో చదవడం వల్ల ఏమి ప్రయోజనాలు ఉన్నాయి?',
        examples: [
          {
            en: 'I visit the city library twice a month to borrow novels.',
            native: 'నవలలు అప్పుగా తీసుకోవడానికి నేను నెలకు రెండుసార్లు సిటీ లైబ్రరీకి వెళ్తాను.',
          },
          {
            en: 'Libraries are quiet, so I can concentrate better than at home.',
            native: 'గ్రంథాలయాలు ప్రశాంతంగా ఉంటాయి, కాబట్టి ఇంటి కంటే నేను బాగా కాన్సన్ట్రేట్ చేయగలను.',
          },
          {
            en: 'Our library also offers free classes, which helps many students.',
            native: 'మా లైబ్రరీ ఉచిత క్లాస్‌లు కూడా అందిస్తుంది, ఇది చాలా మంది విద్యార్థులకు సహాయపడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'पुस्तकालय',
        question: 'क्या आप पुस्तकालयों का उपयोग करते हैं? पुस्तकालय में पढ़ने के क्या लाभ हैं?',
        examples: [
          {
            en: 'I visit the city library twice a month to borrow novels.',
            native: 'मैं उपन्यास उधार लेने के लिए महीने में दो बार शहर के पुस्तकालय जाता हूँ।',
          },
          {
            en: 'Libraries are quiet, so I can concentrate better than at home.',
            native: 'पुस्तकालय शांत होते हैं, इसलिए मैं घर की तुलना में वहाँ बेहतर ध्यान लगा सकता हूँ।',
          },
          {
            en: 'Our library also offers free classes, which helps many students.',
            native: 'हमारा पुस्तकालय मुफ़्त कक्षाएँ भी देता है, जिससे कई छात्रों को मदद मिलती है।',
          },
        ],
      },
      es: {
        word: 'biblioteca',
        question: '¿Usas las bibliotecas? ¿Cuáles son las ventajas de leer en una biblioteca?',
        examples: [
          {
            en: 'I visit the city library twice a month to borrow novels.',
            native: 'Voy a la biblioteca de la ciudad dos veces al mes para pedir novelas prestadas.',
          },
          {
            en: 'Libraries are quiet, so I can concentrate better than at home.',
            native: 'Las bibliotecas son tranquilas, así que puedo concentrarme mejor que en casa.',
          },
          {
            en: 'Our library also offers free classes, which helps many students.',
            native: 'Nuestra biblioteca también ofrece clases gratuitas, lo que ayuda a muchos estudiantes.',
          },
        ],
      },
      zh: {
        word: '图书馆',
        question: '你使用图书馆吗？在图书馆读书有什么好处？',
        examples: [
          { en: 'I visit the city library twice a month to borrow novels.', native: '我每月去市图书馆两次借小说。' },
          {
            en: 'Libraries are quiet, so I can concentrate better than at home.',
            native: '图书馆很安静，所以我能比在家更专注。',
          },
          {
            en: 'Our library also offers free classes, which helps many students.',
            native: '我们的图书馆还提供免费课程，帮助了许多学生。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'museum',
    questionText: 'Have you visited a museum? What did you see and learn there?',
    translations: {
      te: {
        word: 'మ్యూజియం',
        question: 'మీరు ఎప్పుడైనా మ్యూజియం సందర్శించారా? అక్కడ మీరు ఏమి చూశారు మరియు ఏమి నేర్చుకున్నారు?',
        examples: [
          {
            en: 'I visited the history museum last month with my classmates.',
            native: 'గత నెల నేను నా క్లాస్‌మేట్‌లతో చరిత్ర మ్యూజియాన్ని సందర్శించాను.',
          },
          {
            en: 'We saw old coins and tools that were hundreds of years old.',
            native: 'మేము వందల సంవత్సరాల పురాతనమైన నాణేలు మరియు పనిముట్లు చూశాము.',
          },
          {
            en: 'I learned more from the museum than from my textbook.',
            native: 'నా పుస్తకం కంటే మ్యూజియం నుండి నేను ఎక్కువ నేర్చుకున్నాను.',
          },
        ],
      },
      hi: {
        word: 'संग्रहालय',
        question: 'क्या आपने कभी कोई संग्रहालय देखा है? वहाँ आपने क्या देखा और क्या सीखा?',
        examples: [
          {
            en: 'I visited the history museum last month with my classmates.',
            native: 'पिछले महीने मैं अपने सहपाठियों के साथ इतिहास संग्रहालय गया था।',
          },
          {
            en: 'We saw old coins and tools that were hundreds of years old.',
            native: 'हमने वहाँ सैकड़ों साल पुराने सिक्के और औज़ार देखे।',
          },
          {
            en: 'I learned more from the museum than from my textbook.',
            native: 'मैंने अपनी पाठ्यपुस्तक से ज़्यादा संग्रहालय से सीखा।',
          },
        ],
      },
      es: {
        word: 'museo',
        question: '¿Has visitado un museo? ¿Qué viste y qué aprendiste allí?',
        examples: [
          {
            en: 'I visited the history museum last month with my classmates.',
            native: 'Visité el museo de historia el mes pasado con mis compañeros de clase.',
          },
          {
            en: 'We saw old coins and tools that were hundreds of years old.',
            native: 'Vimos monedas y herramientas antiguas de cientos de años.',
          },
          {
            en: 'I learned more from the museum than from my textbook.',
            native: 'Aprendí más en el museo que en mi libro de texto.',
          },
        ],
      },
      zh: {
        word: '博物馆',
        question: '你参观过博物馆吗？你在那里看到了什么、学到了什么？',
        examples: [
          {
            en: 'I visited the history museum last month with my classmates.',
            native: '上个月我和同学们参观了历史博物馆。',
          },
          {
            en: 'We saw old coins and tools that were hundreds of years old.',
            native: '我们看到了有数百年历史的古钱币和工具。',
          },
          {
            en: 'I learned more from the museum than from my textbook.',
            native: '我从博物馆学到的东西比从课本上学到的还多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'beach',
    questionText: 'Do you like going to the beach? What do you do there?',
    translations: {
      te: {
        word: 'బీచ్',
        question: 'మీకు బీచ్‌కు వెళ్లడం ఇష్టమా? అక్కడ మీరు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I love walking on the beach because the sound of waves relaxes me.',
            native: 'అలల శబ్దం నాకు ఉపశమనం ఇస్తుంది కాబట్టి బీచ్‌లో నడవడం నాకు చాలా ఇష్టం.',
          },
          {
            en: 'My friends and I play volleyball and collect shells there.',
            native: 'నేను మరియు నా స్నేహితులు అక్కడ వాలీబాల్ ఆడుతాము మరియు గుల్లలు సేకరిస్తాము.',
          },
          {
            en: 'The beach is more beautiful in the evening than at noon.',
            native: 'మధ్యాహ్నం కంటే సాయంత్రం బీచ్ మరింత అందంగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'समुद्र तट',
        question: 'क्या आपको समुद्र तट पर जाना पसंद है? आप वहाँ क्या करते हैं?',
        examples: [
          {
            en: 'I love walking on the beach because the sound of waves relaxes me.',
            native: 'मुझे समुद्र तट पर चलना बहुत पसंद है क्योंकि लहरों की आवाज़ मुझे सुकून देती है।',
          },
          {
            en: 'My friends and I play volleyball and collect shells there.',
            native: 'मैं और मेरे दोस्त वहाँ वॉलीबॉल खेलते हैं और शंख इकट्ठा करते हैं।',
          },
          {
            en: 'The beach is more beautiful in the evening than at noon.',
            native: 'दोपहर की तुलना में शाम को समुद्र तट ज़्यादा खूबसूरत लगता है।',
          },
        ],
      },
      es: {
        word: 'playa',
        question: '¿Te gusta ir a la playa? ¿Qué haces allí?',
        examples: [
          {
            en: 'I love walking on the beach because the sound of waves relaxes me.',
            native: 'Me encanta caminar por la playa porque el sonido de las olas me relaja.',
          },
          {
            en: 'My friends and I play volleyball and collect shells there.',
            native: 'Mis amigos y yo jugamos al voleibol y recogemos conchas allí.',
          },
          {
            en: 'The beach is more beautiful in the evening than at noon.',
            native: 'La playa es más bonita por la tarde que al mediodía.',
          },
        ],
      },
      zh: {
        word: '海滩',
        question: '你喜欢去海滩吗？你在那里做什么？',
        examples: [
          {
            en: 'I love walking on the beach because the sound of waves relaxes me.',
            native: '我喜欢在海滩上散步，因为海浪的声音让我放松。',
          },
          {
            en: 'My friends and I play volleyball and collect shells there.',
            native: '我和朋友们在那里打排球、捡贝壳。',
          },
          { en: 'The beach is more beautiful in the evening than at noon.', native: '傍晚的海滩比中午更美丽。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'mountain',
    questionText: 'Have you ever climbed a mountain? Would you like to? Why?',
    translations: {
      te: {
        word: 'పర్వతం',
        question: 'మీరు ఎప్పుడైనా పర్వతం ఎక్కారా? ఎక్కాలనుకుంటున్నారా? ఎందుకు?',
        examples: [
          {
            en: 'I climbed a small mountain with my uncle two years ago.',
            native: 'రెండు సంవత్సరాల క్రితం నేను నా మామయ్యతో ఒక చిన్న పర్వతం ఎక్కాను.',
          },
          {
            en: 'The climb was hard, but the view from the top was worth it.',
            native: 'ఎక్కడం కష్టం, కానీ పైనుండి కనిపించే దృశ్యం దానికి తగినది.',
          },
          {
            en: 'I would like to climb a higher one when I become fitter.',
            native: 'నేను మరింత ఫిట్‌గా మారినప్పుడు ఎత్తైన దాన్ని ఎక్కాలనుకుంటున్నాను.',
          },
        ],
      },
      hi: {
        word: 'पहाड़',
        question: 'क्या आपने कभी कोई पहाड़ चढ़ा है? क्या आप चढ़ना चाहेंगे? क्यों?',
        examples: [
          {
            en: 'I climbed a small mountain with my uncle two years ago.',
            native: 'दो साल पहले मैं अपने चाचा के साथ एक छोटे पहाड़ पर चढ़ा था।',
          },
          {
            en: 'The climb was hard, but the view from the top was worth it.',
            native: 'चढ़ाई कठिन थी, लेकिन चोटी से दिखने वाला नज़ारा उसके लायक था।',
          },
          {
            en: 'I would like to climb a higher one when I become fitter.',
            native: 'जब मैं और फ़िट हो जाऊँगा, तब ऊँचा पहाड़ चढ़ना चाहूँगा।',
          },
        ],
      },
      es: {
        word: 'montaña',
        question: '¿Has escalado alguna vez una montaña? ¿Te gustaría? ¿Por qué?',
        examples: [
          {
            en: 'I climbed a small mountain with my uncle two years ago.',
            native: 'Escalé una montaña pequeña con mi tío hace dos años.',
          },
          {
            en: 'The climb was hard, but the view from the top was worth it.',
            native: 'La subida fue dura, pero la vista desde arriba valió la pena.',
          },
          {
            en: 'I would like to climb a higher one when I become fitter.',
            native: 'Me gustaría escalar una más alta cuando esté más en forma.',
          },
        ],
      },
      zh: {
        word: '山',
        question: '你爬过山吗？你想爬山吗？为什么？',
        examples: [
          { en: 'I climbed a small mountain with my uncle two years ago.', native: '两年前我和叔叔爬过一座小山。' },
          {
            en: 'The climb was hard, but the view from the top was worth it.',
            native: '攀登很辛苦，但山顶的景色值得。',
          },
          {
            en: 'I would like to climb a higher one when I become fitter.',
            native: '等我身体更好时，我想爬一座更高的山。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'rain',
    questionText: 'Do you like rainy days? What do you usually do when it rains?',
    translations: {
      te: {
        word: 'వర్షం',
        question: 'మీకు వర్షం రోజులు ఇష్టమా? వర్షం పడినప్పుడు మీరు సాధారణంగా ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I enjoy rainy days because the weather becomes cool and fresh.',
            native: 'వాతావరణం చల్లగా మరియు తాజాగా మారుతుంది కాబట్టి వర్షం రోజులు నాకు ఇష్టం.',
          },
          {
            en: 'When it rains, I drink hot tea and watch the drops from my window.',
            native: 'వర్షం పడినప్పుడు, నేను వేడి టీ తాగి కిటికీ నుండి జల్లులు చూస్తాను.',
          },
          {
            en: 'Heavy rain is beautiful, but it makes travelling difficult.',
            native: 'భారీ వర్షం అందంగా ఉంటుంది, కానీ ప్రయాణాన్ని కష్టతరం చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'बारिश',
        question: 'क्या आपको बारिश के दिन पसंद हैं? बारिश होने पर आप आमतौर पर क्या करते हैं?',
        examples: [
          {
            en: 'I enjoy rainy days because the weather becomes cool and fresh.',
            native: 'मुझे बारिश के दिन पसंद हैं क्योंकि मौसम ठंडा और ताज़ा हो जाता है।',
          },
          {
            en: 'When it rains, I drink hot tea and watch the drops from my window.',
            native: 'जब बारिश होती है, मैं गर्म चाय पीता हूँ और खिड़की से बूँदें देखता हूँ।',
          },
          {
            en: 'Heavy rain is beautiful, but it makes travelling difficult.',
            native: 'तेज़ बारिश सुंदर होती है, लेकिन इससे यात्रा करना कठिन हो जाता है।',
          },
        ],
      },
      es: {
        word: 'lluvia',
        question: '¿Te gustan los días de lluvia? ¿Qué sueles hacer cuando llueve?',
        examples: [
          {
            en: 'I enjoy rainy days because the weather becomes cool and fresh.',
            native: 'Disfruto los días de lluvia porque el clima se vuelve fresco y agradable.',
          },
          {
            en: 'When it rains, I drink hot tea and watch the drops from my window.',
            native: 'Cuando llueve, bebo té caliente y miro las gotas desde mi ventana.',
          },
          {
            en: 'Heavy rain is beautiful, but it makes travelling difficult.',
            native: 'La lluvia fuerte es hermosa, pero hace difícil viajar.',
          },
        ],
      },
      zh: {
        word: '雨',
        question: '你喜欢下雨天吗？下雨时你通常做什么？',
        examples: [
          {
            en: 'I enjoy rainy days because the weather becomes cool and fresh.',
            native: '我喜欢下雨天，因为天气变得凉爽清新。',
          },
          {
            en: 'When it rains, I drink hot tea and watch the drops from my window.',
            native: '下雨时，我喝热茶，看着窗外的雨滴。',
          },
          {
            en: 'Heavy rain is beautiful, but it makes travelling difficult.',
            native: '大雨很美，但会让出行变得困难。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'garden',
    questionText: 'Do you have a garden or grow plants? Why do people enjoy gardening?',
    translations: {
      te: {
        word: 'తోట',
        question: 'మీకు తోట ఉందా లేదా మొక్కలు పెంచుతారా? ప్రజలు తోటపనిని ఎందుకు ఇష్టపడతారు?',
        examples: [
          {
            en: 'We have a small garden behind our house with roses and herbs.',
            native: 'మా ఇంటి వెనుక గులాబీలు మరియు మూలికలతో ఒక చిన్న తోట ఉంది.',
          },
          {
            en: 'I water the plants every morning before I leave for work.',
            native: 'నేను పనికి బయలుదేరే ముందు ప్రతి ఉదయం మొక్కలకు నీళ్లు పోస్తాను.',
          },
          {
            en: 'Gardening is relaxing because it connects people with nature.',
            native: 'తోటపని ప్రజలను ప్రకృతితో కలుపుతుంది కాబట్టి అది ఉపశమనకరం.',
          },
        ],
      },
      hi: {
        word: 'बगीचा',
        question: 'क्या आपके पास कोई बगीचा है या आप पौधे उगाते हैं? लोगों को बागवानी क्यों पसंद है?',
        examples: [
          {
            en: 'We have a small garden behind our house with roses and herbs.',
            native: 'हमारे घर के पीछे गुलाब और जड़ी-बूटियों वाला एक छोटा बगीचा है।',
          },
          {
            en: 'I water the plants every morning before I leave for work.',
            native: 'मैं काम पर जाने से पहले हर सुबह पौधों को पानी देता हूँ।',
          },
          {
            en: 'Gardening is relaxing because it connects people with nature.',
            native: 'बागवानी आरामदायक है क्योंकि यह लोगों को प्रकृति से जोड़ती है।',
          },
        ],
      },
      es: {
        word: 'jardín',
        question: '¿Tienes un jardín o cultivas plantas? ¿Por qué disfruta la gente de la jardinería?',
        examples: [
          {
            en: 'We have a small garden behind our house with roses and herbs.',
            native: 'Tenemos un pequeño jardín detrás de casa con rosas y hierbas.',
          },
          {
            en: 'I water the plants every morning before I leave for work.',
            native: 'Riego las plantas cada mañana antes de salir al trabajo.',
          },
          {
            en: 'Gardening is relaxing because it connects people with nature.',
            native: 'La jardinería es relajante porque conecta a la gente con la naturaleza.',
          },
        ],
      },
      zh: {
        word: '花园',
        question: '你有花园或种植物吗？人们为什么喜欢园艺？',
        examples: [
          {
            en: 'We have a small garden behind our house with roses and herbs.',
            native: '我们房子后面有一个小花园，种着玫瑰和香草。',
          },
          { en: 'I water the plants every morning before I leave for work.', native: '我每天上班前都给植物浇水。' },
          {
            en: 'Gardening is relaxing because it connects people with nature.',
            native: '园艺让人放松，因为它把人们与自然联系在一起。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'photography',
    questionText: 'Do you like taking photos? What do you usually photograph?',
    translations: {
      te: {
        word: 'ఛాయాచిత్రకళ',
        question: 'మీకు ఫోటోలు తీయడం ఇష్టమా? మీరు సాధారణంగా దేని ఫోటోలు తీస్తారు?',
        examples: [
          {
            en: 'I like taking photos of sunsets because the colours are amazing.',
            native: 'రంగులు అద్భుతంగా ఉంటాయి కాబట్టి సూర్యాస్తమయం ఫోటోలు తీయడం నాకు ఇష్టం.',
          },
          {
            en: 'I have taken hundreds of photos on my phone this year.',
            native: 'ఈ సంవత్సరం నా ఫోన్‌లో వందలాది ఫోటోలు తీశాను.',
          },
          {
            en: 'Photos help me remember good moments better than my memory does.',
            native: 'నా జ్ఞాపకశక్తి కంటే ఫోటోలు మంచి క్షణాలను గుర్తు చేసుకోవడానికి నాకు బాగా సహాయపడతాయి.',
          },
        ],
      },
      hi: {
        word: 'फ़ोटोग्राफ़ी',
        question: 'क्या आपको तस्वीरें खींचना पसंद है? आप आमतौर पर किसकी तस्वीरें लेते हैं?',
        examples: [
          {
            en: 'I like taking photos of sunsets because the colours are amazing.',
            native: 'मुझे सूर्यास्त की तस्वीरें लेना पसंद है क्योंकि रंग अद्भुत होते हैं।',
          },
          {
            en: 'I have taken hundreds of photos on my phone this year.',
            native: 'इस साल मैंने अपने फ़ोन पर सैकड़ों तस्वीरें ली हैं।',
          },
          {
            en: 'Photos help me remember good moments better than my memory does.',
            native: 'तस्वीरें मुझे अपनी याददाश्त से बेहतर अच्छे पल याद रखने में मदद करती हैं।',
          },
        ],
      },
      es: {
        word: 'fotografía',
        question: '¿Te gusta hacer fotos? ¿Qué sueles fotografiar?',
        examples: [
          {
            en: 'I like taking photos of sunsets because the colours are amazing.',
            native: 'Me gusta fotografiar atardeceres porque los colores son increíbles.',
          },
          {
            en: 'I have taken hundreds of photos on my phone this year.',
            native: 'Este año he hecho cientos de fotos con mi teléfono.',
          },
          {
            en: 'Photos help me remember good moments better than my memory does.',
            native: 'Las fotos me ayudan a recordar los buenos momentos mejor que mi memoria.',
          },
        ],
      },
      zh: {
        word: '摄影',
        question: '你喜欢拍照吗？你通常拍什么？',
        examples: [
          {
            en: 'I like taking photos of sunsets because the colours are amazing.',
            native: '我喜欢拍日落，因为颜色非常美。',
          },
          { en: 'I have taken hundreds of photos on my phone this year.', native: '今年我用手机拍了数百张照片。' },
          {
            en: 'Photos help me remember good moments better than my memory does.',
            native: '照片比我的记忆更能帮我记住美好的时刻。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'painting',
    questionText: 'Have you ever tried painting or drawing? Do you think art is important?',
    translations: {
      te: {
        word: 'చిత్రలేఖనం',
        question: 'మీరు ఎప్పుడైనా పెయింటింగ్ లేదా డ్రాయింగ్ ప్రయత్నించారా? కళ ముఖ్యమని మీరు అనుకుంటున్నారా?',
        examples: [
          {
            en: 'I painted a picture of my village when I was in school.',
            native: 'నేను స్కూల్లో ఉన్నప్పుడు నా గ్రామం యొక్క చిత్రాన్ని గీశాను.',
          },
          {
            en: 'I am not very good at drawing, but I find it calming.',
            native: 'నాకు డ్రాయింగ్ అంతగా రాదు, కానీ అది నాకు ప్రశాంతంగా అనిపిస్తుంది.',
          },
          {
            en: 'Art is important because it lets people express their feelings.',
            native: 'కళ ముఖ్యం, ఎందుకంటే అది ప్రజలు తమ భావాలను వ్యక్తం చేసుకోవడానికి వీలు కల్పిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'चित्रकारी',
        question: 'क्या आपने कभी चित्रकारी या ड्रॉइंग की कोशिश की है? क्या आपको लगता है कि कला ज़रूरी है?',
        examples: [
          {
            en: 'I painted a picture of my village when I was in school.',
            native: 'जब मैं स्कूल में था, मैंने अपने गाँव का एक चित्र बनाया था।',
          },
          {
            en: 'I am not very good at drawing, but I find it calming.',
            native: 'मैं ड्रॉइंग में बहुत अच्छा नहीं हूँ, लेकिन मुझे इससे शांति मिलती है।',
          },
          {
            en: 'Art is important because it lets people express their feelings.',
            native: 'कला ज़रूरी है क्योंकि इससे लोग अपनी भावनाओं को व्यक्त कर पाते हैं।',
          },
        ],
      },
      es: {
        word: 'pintura',
        question: '¿Has probado alguna vez a pintar o dibujar? ¿Crees que el arte es importante?',
        examples: [
          {
            en: 'I painted a picture of my village when I was in school.',
            native: 'Pinté un cuadro de mi pueblo cuando estaba en el colegio.',
          },
          {
            en: 'I am not very good at drawing, but I find it calming.',
            native: 'No se me da muy bien dibujar, pero me resulta relajante.',
          },
          {
            en: 'Art is important because it lets people express their feelings.',
            native: 'El arte es importante porque permite a la gente expresar sus sentimientos.',
          },
        ],
      },
      zh: {
        word: '绘画',
        question: '你尝试过绘画或素描吗？你认为艺术重要吗？',
        examples: [
          { en: 'I painted a picture of my village when I was in school.', native: '我在上学时画过一幅我村庄的画。' },
          {
            en: 'I am not very good at drawing, but I find it calming.',
            native: '我不太擅长画画，但我觉得它能让我平静。',
          },
          {
            en: 'Art is important because it lets people express their feelings.',
            native: '艺术很重要，因为它让人们表达自己的情感。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'language',
    questionText: 'Why are you learning English, and how do you practise it?',
    translations: {
      te: {
        word: 'భాష',
        question: 'మీరు ఇంగ్లీష్ ఎందుకు నేర్చుకుంటున్నారు, మరియు దానిని ఎలా అభ్యసిస్తున్నారు?',
        examples: [
          {
            en: 'I am learning English because it helps me find better jobs.',
            native: 'ఇంగ్లీష్ నాకు మెరుగైన ఉద్యోగాలు కనుగొనడంలో సహాయపడుతుంది కాబట్టి నేను నేర్చుకుంటున్నాను.',
          },
          {
            en: 'I practise speaking with a partner every evening for twenty minutes.',
            native: 'నేను ప్రతి సాయంత్రం ఇరవై నిమిషాలు ఒక భాగస్వామితో మాట్లాడటం అభ్యసిస్తాను.',
          },
          {
            en: 'Learning a language is easier when you use it every day.',
            native: 'ప్రతిరోజూ వాడినప్పుడు భాష నేర్చుకోవడం సులభం.',
          },
        ],
      },
      hi: {
        word: 'भाषा',
        question: 'आप अंग्रेज़ी क्यों सीख रहे हैं, और आप इसका अभ्यास कैसे करते हैं?',
        examples: [
          {
            en: 'I am learning English because it helps me find better jobs.',
            native: 'मैं अंग्रेज़ी इसलिए सीख रहा हूँ क्योंकि इससे मुझे बेहतर नौकरियाँ मिलने में मदद मिलती है।',
          },
          {
            en: 'I practise speaking with a partner every evening for twenty minutes.',
            native: 'मैं हर शाम किसी साथी के साथ बीस मिनट बोलने का अभ्यास करता हूँ।',
          },
          {
            en: 'Learning a language is easier when you use it every day.',
            native: 'जब आप किसी भाषा का रोज़ उपयोग करते हैं, तो उसे सीखना आसान हो जाता है।',
          },
        ],
      },
      es: {
        word: 'idioma',
        question: '¿Por qué estás aprendiendo inglés y cómo lo practicas?',
        examples: [
          {
            en: 'I am learning English because it helps me find better jobs.',
            native: 'Estoy aprendiendo inglés porque me ayuda a encontrar mejores trabajos.',
          },
          {
            en: 'I practise speaking with a partner every evening for twenty minutes.',
            native: 'Practico hablando con un compañero cada tarde durante veinte minutos.',
          },
          {
            en: 'Learning a language is easier when you use it every day.',
            native: 'Aprender un idioma es más fácil cuando lo usas todos los días.',
          },
        ],
      },
      zh: {
        word: '语言',
        question: '你为什么学英语？你如何练习它？',
        examples: [
          {
            en: 'I am learning English because it helps me find better jobs.',
            native: '我学英语是因为它能帮我找到更好的工作。',
          },
          {
            en: 'I practise speaking with a partner every evening for twenty minutes.',
            native: '我每天晚上和搭档练习口语二十分钟。',
          },
          {
            en: 'Learning a language is easier when you use it every day.',
            native: '当你每天使用一门语言时，学起来就更容易。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'homework',
    questionText: 'Do you think homework is useful for students? How much is too much?',
    translations: {
      te: {
        word: 'హోంవర్క్',
        question: 'హోంవర్క్ విద్యార్థులకు ఉపయోగకరమని మీరు అనుకుంటున్నారా? ఎంత అయితే ఎక్కువ?',
        examples: [
          {
            en: 'Homework is useful because it helps students remember their lessons.',
            native: 'హోంవర్క్ విద్యార్థులు తమ పాఠాలను గుర్తుంచుకోవడానికి సహాయపడుతుంది కాబట్టి అది ఉపయోగకరం.',
          },
          {
            en: 'However, too much homework leaves no time for play or rest.',
            native: 'అయితే, ఎక్కువ హోంవర్క్ ఆటకు లేదా విశ్రాంతికి సమయం ఇవ్వదు.',
          },
          {
            en: 'When I was a student, I finished my homework before dinner.',
            native: 'నేను విద్యార్థిగా ఉన్నప్పుడు, భోజనానికి ముందే నా హోంవర్క్ పూర్తి చేసేవాడిని.',
          },
        ],
      },
      hi: {
        word: 'होमवर्क',
        question: 'क्या आपको लगता है कि होमवर्क छात्रों के लिए उपयोगी है? कितना होमवर्क बहुत ज़्यादा है?',
        examples: [
          {
            en: 'Homework is useful because it helps students remember their lessons.',
            native: 'होमवर्क उपयोगी है क्योंकि इससे छात्रों को अपने पाठ याद रहते हैं।',
          },
          {
            en: 'However, too much homework leaves no time for play or rest.',
            native: 'हालांकि, बहुत ज़्यादा होमवर्क खेलने या आराम करने का समय नहीं छोड़ता।',
          },
          {
            en: 'When I was a student, I finished my homework before dinner.',
            native: 'जब मैं छात्र था, मैं रात के खाने से पहले अपना होमवर्क खत्म कर लेता था।',
          },
        ],
      },
      es: {
        word: 'deberes',
        question: '¿Crees que los deberes son útiles para los estudiantes? ¿Cuánto es demasiado?',
        examples: [
          {
            en: 'Homework is useful because it helps students remember their lessons.',
            native: 'Los deberes son útiles porque ayudan a los estudiantes a recordar las lecciones.',
          },
          {
            en: 'However, too much homework leaves no time for play or rest.',
            native: 'Sin embargo, demasiados deberes no dejan tiempo para jugar ni descansar.',
          },
          {
            en: 'When I was a student, I finished my homework before dinner.',
            native: 'Cuando era estudiante, terminaba mis deberes antes de cenar.',
          },
        ],
      },
      zh: {
        word: '家庭作业',
        question: '你认为家庭作业对学生有用吗？多少才算太多？',
        examples: [
          {
            en: 'Homework is useful because it helps students remember their lessons.',
            native: '家庭作业很有用，因为它帮助学生记住课程内容。',
          },
          {
            en: 'However, too much homework leaves no time for play or rest.',
            native: '然而，作业太多就没有玩耍和休息的时间了。',
          },
          {
            en: 'When I was a student, I finished my homework before dinner.',
            native: '当我是学生时，我总是在晚饭前完成作业。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'interview',
    questionText: 'Talk about how you prepare for a job interview and how you feel during it.',
    translations: {
      te: {
        word: 'ఇంటర్వ్యూ',
        question: 'ఉద్యోగ ఇంటర్వ్యూకు మీరు ఎలా సిద్ధమవుతారు మరియు అప్పుడు మీకు ఎలా అనిపిస్తుందో మాట్లాడండి.',
        examples: [
          {
            en: 'Before my last interview, I read about the company and practised answers.',
            native: 'నా చివరి ఇంటర్వ్యూకు ముందు, నేను కంపెనీ గురించి చదివి సమాధానాలు అభ్యసించాను.',
          },
          {
            en: 'I felt nervous at first, but the interviewer was friendly and calm.',
            native:
              'మొదట నాకు టెన్షన్‌గా అనిపించింది, కానీ ఇంటర్వ్యూ చేసినవారు స్నేహపూర్వకంగా మరియు ప్రశాంతంగా ఉన్నారు.',
          },
          {
            en: 'Arriving early always makes me more confident than rushing.',
            native: 'త్వరపడటం కంటే ముందుగా చేరుకోవడం వల్ల నాకు ఎల్లప్పుడూ ఎక్కువ ఆత్మవిశ్వాసం వస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'साक्षात्कार',
        question:
          'नौकरी के साक्षात्कार की तैयारी आप कैसे करते हैं और उस दौरान आप कैसा महसूस करते हैं, इस बारे में बताइए।',
        examples: [
          {
            en: 'Before my last interview, I read about the company and practised answers.',
            native: 'अपने पिछले साक्षात्कार से पहले, मैंने कंपनी के बारे में पढ़ा और जवाबों का अभ्यास किया।',
          },
          {
            en: 'I felt nervous at first, but the interviewer was friendly and calm.',
            native: 'शुरू में मैं घबराया हुआ था, लेकिन साक्षात्कारकर्ता दोस्ताना और शांत था।',
          },
          {
            en: 'Arriving early always makes me more confident than rushing.',
            native: 'जल्दबाज़ी करने की तुलना में जल्दी पहुँचने से मुझे हमेशा ज़्यादा आत्मविश्वास होता है।',
          },
        ],
      },
      es: {
        word: 'entrevista',
        question: 'Habla de cómo te preparas para una entrevista de trabajo y cómo te sientes durante ella.',
        examples: [
          {
            en: 'Before my last interview, I read about the company and practised answers.',
            native: 'Antes de mi última entrevista, leí sobre la empresa y practiqué respuestas.',
          },
          {
            en: 'I felt nervous at first, but the interviewer was friendly and calm.',
            native: 'Al principio estaba nervioso, pero el entrevistador fue amable y tranquilo.',
          },
          {
            en: 'Arriving early always makes me more confident than rushing.',
            native: 'Llegar temprano siempre me da más confianza que ir con prisa.',
          },
        ],
      },
      zh: {
        word: '面试',
        question: '谈谈你如何准备求职面试，以及面试时的感受。',
        examples: [
          {
            en: 'Before my last interview, I read about the company and practised answers.',
            native: '在上次面试之前，我了解了公司情况并练习了回答。',
          },
          {
            en: 'I felt nervous at first, but the interviewer was friendly and calm.',
            native: '一开始我很紧张，但面试官很友好、很沉着。',
          },
          {
            en: 'Arriving early always makes me more confident than rushing.',
            native: '提前到达总是比匆忙赶路让我更自信。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'salary',
    questionText: 'What would you do with your first salary? Is saving or spending more important to you?',
    translations: {
      te: {
        word: 'జీతం',
        question: 'మీ మొదటి జీతంతో మీరు ఏమి చేస్తారు? మీకు ఆదా చేయడమా ఖర్చు చేయడమా ఏది ముఖ్యం?',
        examples: [
          {
            en: 'With my first salary, I want to buy a gift for my parents.',
            native: 'నా మొదటి జీతంతో, నా తల్లిదండ్రుల కోసం ఒక బహుమతి కొనాలనుకుంటున్నాను.',
          },
          {
            en: 'Saving is more important to me because it gives me security.',
            native: 'ఆదా చేయడం నాకు భద్రత ఇస్తుంది కాబట్టి అది నాకు ముఖ్యం.',
          },
          {
            en: 'Some people spend everything at once, but I prefer to plan.',
            native: 'కొందరు వెంటనే అంతా ఖర్చు చేస్తారు, కానీ నాకు ప్లాన్ చేసుకోవడం ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'वेतन',
        question: 'अपनी पहली सैलरी से आप क्या करेंगे? आपके लिए बचत ज़्यादा ज़रूरी है या खर्च?',
        examples: [
          {
            en: 'With my first salary, I want to buy a gift for my parents.',
            native: 'अपनी पहली सैलरी से मैं अपने माता-पिता के लिए उपहार खरीदना चाहता हूँ।',
          },
          {
            en: 'Saving is more important to me because it gives me security.',
            native: 'मेरे लिए बचत ज़्यादा ज़रूरी है क्योंकि इससे मुझे सुरक्षा मिलती है।',
          },
          {
            en: 'Some people spend everything at once, but I prefer to plan.',
            native: 'कुछ लोग एक साथ सब कुछ खर्च कर देते हैं, लेकिन मैं योजना बनाना पसंद करता हूँ।',
          },
        ],
      },
      es: {
        word: 'salario',
        question: '¿Qué harías con tu primer sueldo? ¿Qué es más importante para ti, ahorrar o gastar?',
        examples: [
          {
            en: 'With my first salary, I want to buy a gift for my parents.',
            native: 'Con mi primer sueldo, quiero comprar un regalo para mis padres.',
          },
          {
            en: 'Saving is more important to me because it gives me security.',
            native: 'Ahorrar es más importante para mí porque me da seguridad.',
          },
          {
            en: 'Some people spend everything at once, but I prefer to plan.',
            native: 'Algunas personas lo gastan todo de golpe, pero yo prefiero planificar.',
          },
        ],
      },
      zh: {
        word: '工资',
        question: '你会用第一份工资做什么？对你来说存钱和花钱哪个更重要？',
        examples: [
          {
            en: 'With my first salary, I want to buy a gift for my parents.',
            native: '我想用第一份工资给父母买一份礼物。',
          },
          {
            en: 'Saving is more important to me because it gives me security.',
            native: '对我来说存钱更重要，因为它给我安全感。',
          },
          {
            en: 'Some people spend everything at once, but I prefer to plan.',
            native: '有些人会一次花光所有钱，但我更喜欢做好计划。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'savings',
    questionText: 'Do you save money regularly? What are you saving for?',
    translations: {
      te: {
        word: 'పొదుపు',
        question: 'మీరు క్రమం తప్పకుండా డబ్బు ఆదా చేస్తారా? మీరు దేని కోసం ఆదా చేస్తున్నారు?',
        examples: [
          {
            en: 'I save a small amount every month for my future studies.',
            native: 'నా భవిష్యత్తు చదువుల కోసం నేను ప్రతి నెల కొంత మొత్తాన్ని ఆదా చేస్తాను.',
          },
          { en: 'It is hard to save when prices keep rising.', native: 'ధరలు పెరుగుతూనే ఉన్నప్పుడు ఆదా చేయడం కష్టం.' },
          {
            en: 'My grandmother taught me that small savings become big over time.',
            native: 'చిన్న పొదుపులు కాలక్రమే పెద్దవి అవుతాయని నా అమ్మమ్మ నాకు నేర్పింది.',
          },
        ],
      },
      hi: {
        word: 'बचत',
        question: 'क्या आप नियमित रूप से पैसे बचाते हैं? आप किस लिए बचत कर रहे हैं?',
        examples: [
          {
            en: 'I save a small amount every month for my future studies.',
            native: 'मैं अपनी आगे की पढ़ाई के लिए हर महीने थोड़ी रकम बचाता हूँ।',
          },
          {
            en: 'It is hard to save when prices keep rising.',
            native: 'जब कीमतें लगातार बढ़ती रहें, तो बचत करना कठिन होता है।',
          },
          {
            en: 'My grandmother taught me that small savings become big over time.',
            native: 'मेरी दादी ने मुझे सिखाया कि छोटी बचतें समय के साथ बड़ी हो जाती हैं।',
          },
        ],
      },
      es: {
        word: 'ahorros',
        question: '¿Ahorras dinero regularmente? ¿Para qué estás ahorrando?',
        examples: [
          {
            en: 'I save a small amount every month for my future studies.',
            native: 'Ahorro una pequeña cantidad cada mes para mis estudios futuros.',
          },
          {
            en: 'It is hard to save when prices keep rising.',
            native: 'Es difícil ahorrar cuando los precios no dejan de subir.',
          },
          {
            en: 'My grandmother taught me that small savings become big over time.',
            native: 'Mi abuela me enseñó que los pequeños ahorros crecen con el tiempo.',
          },
        ],
      },
      zh: {
        word: '储蓄',
        question: '你定期存钱吗？你在为什么存钱？',
        examples: [
          {
            en: 'I save a small amount every month for my future studies.',
            native: '我每个月存一小笔钱，为将来的学习做准备。',
          },
          { en: 'It is hard to save when prices keep rising.', native: '物价不断上涨时，存钱很难。' },
          {
            en: 'My grandmother taught me that small savings become big over time.',
            native: '我的祖母告诉我，小额储蓄日积月累会变成大钱。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'bank',
    questionText: 'Do you prefer using a bank or cash? How do banks help people?',
    translations: {
      te: {
        word: 'బ్యాంకు',
        question: 'మీకు బ్యాంకు వాడడమా లేదా నగదు వాడడమా ఏది ఇష్టం? బ్యాంకులు ప్రజలకు ఎలా సహాయపడతాయి?',
        examples: [
          {
            en: 'I prefer my bank card because carrying cash is less safe.',
            native: 'నగదు మోసుకువెళ్లడం తక్కువ భద్రమైనది కాబట్టి నాకు నా బ్యాంకు కార్డే ఇష్టం.',
          },
          {
            en: 'Banks help people save money and pay for big things slowly.',
            native:
              'బ్యాంకులు ప్రజలు డబ్బు ఆదా చేయడానికి మరియు పెద్ద వస్తువుల కోసం నెమ్మదిగా చెల్లించడానికి సహాయపడతాయి.',
          },
          {
            en: 'I opened my first bank account when I started college.',
            native: 'నేను కాలేజీలో చేరినప్పుడు నా మొదటి బ్యాంకు ఖాతా తెరిచాను.',
          },
        ],
      },
      hi: {
        word: 'बैंक',
        question: 'आप बैंक का उपयोग करना पसंद करते हैं या नकद? बैंक लोगों की कैसे मदद करते हैं?',
        examples: [
          {
            en: 'I prefer my bank card because carrying cash is less safe.',
            native: 'मैं अपना बैंक कार्ड पसंद करता हूँ क्योंकि नकद रखना कम सुरक्षित है।',
          },
          {
            en: 'Banks help people save money and pay for big things slowly.',
            native: 'बैंक लोगों को पैसे बचाने और बड़ी चीज़ों के लिए धीरे-धीरे भुगतान करने में मदद करते हैं।',
          },
          {
            en: 'I opened my first bank account when I started college.',
            native: 'कॉलेज शुरू करते ही मैंने अपना पहला बैंक खाता खुलवाया था।',
          },
        ],
      },
      es: {
        word: 'banco',
        question: '¿Prefieres usar el banco o el efectivo? ¿Cómo ayudan los bancos a la gente?',
        examples: [
          {
            en: 'I prefer my bank card because carrying cash is less safe.',
            native: 'Prefiero mi tarjeta bancaria porque llevar efectivo es menos seguro.',
          },
          {
            en: 'Banks help people save money and pay for big things slowly.',
            native: 'Los bancos ayudan a la gente a ahorrar dinero y pagar cosas grandes poco a poco.',
          },
          {
            en: 'I opened my first bank account when I started college.',
            native: 'Abrí mi primera cuenta bancaria cuando empecé la universidad.',
          },
        ],
      },
      zh: {
        word: '银行',
        question: '你更喜欢用银行还是现金？银行如何帮助人们？',
        examples: [
          {
            en: 'I prefer my bank card because carrying cash is less safe.',
            native: '我更喜欢用银行卡，因为带现金不太安全。',
          },
          {
            en: 'Banks help people save money and pay for big things slowly.',
            native: '银行帮助人们存钱，并能分期购买大件物品。',
          },
          {
            en: 'I opened my first bank account when I started college.',
            native: '我开始上大学时开了第一个银行账户。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'market',
    questionText: 'Do you like shopping at local markets? How are they different from supermarkets?',
    translations: {
      te: {
        word: 'మార్కెట్',
        question: 'మీకు స్థానిక మార్కెట్లలో షాపింగ్ చేయడం ఇష్టమా? అవి సూపర్ మార్కెట్ల నుండి ఎలా భిన్నంగా ఉంటాయి?',
        examples: [
          {
            en: 'I like the local market because the fruit is fresh and cheap.',
            native: 'పండ్లు తాజాగా మరియు చౌకగా ఉంటాయి కాబట్టి స్థానిక మార్కెట్ నాకు ఇష్టం.',
          },
          {
            en: 'At the market, you can talk to sellers and bargain a little.',
            native: 'మార్కెట్‌లో, మీరు అమ్మకందార్లతో మాట్లాడవచ్చు మరియు కొంచెం రేటు సర్దుబాటు చేయవచ్చు.',
          },
          {
            en: 'Supermarkets are faster, but markets feel more alive.',
            native: 'సూపర్ మార్కెట్లు వేగంగా ఉంటాయి, కానీ మార్కెట్లు మరింత జీవంగా అనిపిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'बाज़ार',
        question: 'क्या आपको स्थानीय बाज़ारों में खरीदारी करना पसंद है? वे सुपरमार्केट से कैसे अलग हैं?',
        examples: [
          {
            en: 'I like the local market because the fruit is fresh and cheap.',
            native: 'मुझे स्थानीय बाज़ार पसंद है क्योंकि वहाँ फल ताज़े और सस्ते मिलते हैं।',
          },
          {
            en: 'At the market, you can talk to sellers and bargain a little.',
            native: 'बाज़ार में, आप विक्रेताओं से बात कर सकते हैं और थोड़ा मोलभाव कर सकते हैं।',
          },
          {
            en: 'Supermarkets are faster, but markets feel more alive.',
            native: 'सुपरमार्केट तेज़ होते हैं, लेकिन बाज़ार ज़्यादा जीवंत लगते हैं।',
          },
        ],
      },
      es: {
        word: 'mercado',
        question: '¿Te gusta comprar en los mercados locales? ¿En qué se diferencian de los supermercados?',
        examples: [
          {
            en: 'I like the local market because the fruit is fresh and cheap.',
            native: 'Me gusta el mercado local porque la fruta es fresca y barata.',
          },
          {
            en: 'At the market, you can talk to sellers and bargain a little.',
            native: 'En el mercado puedes hablar con los vendedores y regatear un poco.',
          },
          {
            en: 'Supermarkets are faster, but markets feel more alive.',
            native: 'Los supermercados son más rápidos, pero los mercados se sienten más vivos.',
          },
        ],
      },
      zh: {
        word: '市场',
        question: '你喜欢在本地市场购物吗？它们和超市有什么不同？',
        examples: [
          {
            en: 'I like the local market because the fruit is fresh and cheap.',
            native: '我喜欢本地市场，因为水果新鲜又便宜。',
          },
          {
            en: 'At the market, you can talk to sellers and bargain a little.',
            native: '在市场上，你可以和摊主聊天，还能稍微讨价还价。',
          },
          { en: 'Supermarkets are faster, but markets feel more alive.', native: '超市更快，但市场感觉更有生气。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'clothes',
    questionText: 'What kind of clothes do you like to wear? Do you choose comfort or style?',
    translations: {
      te: {
        word: 'దుస్తులు',
        question: 'మీరు ఏ రకమైన దుస్తులు ధరించడానికి ఇష్టపడతారు? మీరు సౌకర్యాన్నా లేదా స్టైల్‌నా ఎంచుకుంటారు?',
        examples: [
          {
            en: 'I like simple clothes in dark colours because they match everything.',
            native: 'ముదురు రంగుల్లో సాధారణ దుస్తులు నాకు ఇష్టం, ఎందుకంటే అవి అన్నింటితో సరిపోతాయి.',
          },
          {
            en: 'I choose comfort over style when I travel for long hours.',
            native: 'ఎక్కువ గంటలు ప్రయాణించేటప్పుడు నేను స్టైల్ కంటే సౌకర్యాన్నే ఎంచుకుంటాను.',
          },
          {
            en: 'For special events, I wear traditional clothes that look elegant.',
            native: 'ప్రత్యేక కార్యక్రమాల్లో, నేను శోభాయమానంగా కనిపించే సాంప్రదాయ దుస్తులు ధరిస్తాను.',
          },
        ],
      },
      hi: {
        word: 'कपड़े',
        question: 'आप किस तरह के कपड़े पहनना पसंद करते हैं? आप आराम चुनते हैं या स्टाइल?',
        examples: [
          {
            en: 'I like simple clothes in dark colours because they match everything.',
            native: 'मुझे गहरे रंगों के सादे कपड़े पसंद हैं क्योंकि वे हर चीज़ से मेल खाते हैं।',
          },
          {
            en: 'I choose comfort over style when I travel for long hours.',
            native: 'जब मैं लंबी यात्रा करता हूँ, तो स्टाइल की जगह आराम चुनता हूँ।',
          },
          {
            en: 'For special events, I wear traditional clothes that look elegant.',
            native: 'खास मौकों पर, मैं पारंपरिक कपड़े पहनता हूँ जो सुंदर दिखते हैं।',
          },
        ],
      },
      es: {
        word: 'ropa',
        question: '¿Qué tipo de ropa te gusta llevar? ¿Eliges comodidad o estilo?',
        examples: [
          {
            en: 'I like simple clothes in dark colours because they match everything.',
            native: 'Me gusta la ropa sencilla de colores oscuros porque combina con todo.',
          },
          {
            en: 'I choose comfort over style when I travel for long hours.',
            native: 'Elijo la comodidad antes que el estilo cuando viajo muchas horas.',
          },
          {
            en: 'For special events, I wear traditional clothes that look elegant.',
            native: 'Para eventos especiales, llevo ropa tradicional que se ve elegante.',
          },
        ],
      },
      zh: {
        word: '服装',
        question: '你喜欢穿什么样的衣服？你会选择舒适还是时尚？',
        examples: [
          {
            en: 'I like simple clothes in dark colours because they match everything.',
            native: '我喜欢深色的简单衣服，因为它们百搭。',
          },
          {
            en: 'I choose comfort over style when I travel for long hours.',
            native: '长途旅行时，我选择舒适而不是时尚。',
          },
          {
            en: 'For special events, I wear traditional clothes that look elegant.',
            native: '在特殊场合，我穿看起来很优雅的传统服装。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'shoes',
    questionText: 'How many pairs of shoes do you own? What do you look for when buying shoes?',
    translations: {
      te: {
        word: 'బూట్లు',
        question: 'మీ దగ్గర ఎన్ని జోడీ బూట్లు ఉన్నాయి? బూట్లు కొనేటప్పుడు మీరు దేన్ని చూస్తారు?',
        examples: [
          {
            en: 'I own four pairs of shoes for different occasions and weather.',
            native: 'వేర్వేరు సందర్భాలు మరియు వాతావరణం కోసం నా దగ్గర నాలుగు జోడీ బూట్లు ఉన్నాయి.',
          },
          {
            en: 'When I buy shoes, comfort matters more to me than brand names.',
            native: 'బూట్లు కొనేటప్పుడు, బ్రాండ్ పేర్ల కంటే సౌకర్యం నాకు ఎక్కువ ముఖ్యం.',
          },
          {
            en: 'Good shoes are expensive, but they last much longer.',
            native: 'మంచి బూట్లు ఖరీదైనవి, కానీ అవి చాలా కాలం ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'जूते',
        question: 'आपके पास कितनी जोड़ी जूते हैं? जूते खरीदते समय आप क्या देखते हैं?',
        examples: [
          {
            en: 'I own four pairs of shoes for different occasions and weather.',
            native: 'अलग-अलग मौकों और मौसम के लिए मेरे पास चार जोड़ी जूते हैं।',
          },
          {
            en: 'When I buy shoes, comfort matters more to me than brand names.',
            native: 'जूते खरीदते समय, मेरे लिए ब्रांड के नाम से ज़्यादा आराम मायने रखता है।',
          },
          {
            en: 'Good shoes are expensive, but they last much longer.',
            native: 'अच्छे जूते महँगे होते हैं, लेकिन वे बहुत लंबे समय तक चलते हैं।',
          },
        ],
      },
      es: {
        word: 'zapatos',
        question: '¿Cuántos pares de zapatos tienes? ¿Qué buscas al comprar zapatos?',
        examples: [
          {
            en: 'I own four pairs of shoes for different occasions and weather.',
            native: 'Tengo cuatro pares de zapatos para distintas ocasiones y climas.',
          },
          {
            en: 'When I buy shoes, comfort matters more to me than brand names.',
            native: 'Al comprar zapatos, la comodidad me importa más que las marcas.',
          },
          {
            en: 'Good shoes are expensive, but they last much longer.',
            native: 'Los buenos zapatos son caros, pero duran mucho más.',
          },
        ],
      },
      zh: {
        word: '鞋子',
        question: '你有几双鞋？买鞋时你看重什么？',
        examples: [
          {
            en: 'I own four pairs of shoes for different occasions and weather.',
            native: '我有四双鞋，适合不同场合和天气。',
          },
          {
            en: 'When I buy shoes, comfort matters more to me than brand names.',
            native: '买鞋时，舒适对我来说比品牌更重要。',
          },
          { en: 'Good shoes are expensive, but they last much longer.', native: '好鞋很贵，但耐穿得多。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'haircut',
    questionText: 'How often do you get a haircut? Do you like trying new styles?',
    translations: {
      te: {
        word: 'జుట్టు కత్తిరింపు',
        question: 'మీరు ఎంత తరచుగా జుట్టు కత్తిరించుకుంటారు? కొత్త స్టైల్‌లు ప్రయత్నించడం మీకు ఇష్టమా?',
        examples: [
          {
            en: 'I get a haircut every six weeks at the same small salon.',
            native: 'నేను ప్రతి ఆరు వారాలకు అదే చిన్న సెలూన్‌లో జుట్టు కత్తిరించుకుంటాను.',
          },
          {
            en: 'I once tried a very short style, but I did not like it.',
            native: 'ఒకసారి నేను చాలా పొట్టి స్టైల్ ప్రయత్నించాను, కానీ నాకు నచ్చలేదు.',
          },
          {
            en: 'My barber knows exactly how I want my hair, so I trust him.',
            native: 'నాకు జుట్టు ఎలా కావాలో నా బార్బర్‌కు సరిగ్గా తెలుసు, కాబట్టి నేను అతనిని నమ్ముతాను.',
          },
        ],
      },
      hi: {
        word: 'बाल कटवाना',
        question: 'आप कितनी बार बाल कटवाते हैं? क्या आपको नई स्टाइल आज़माना पसंद है?',
        examples: [
          {
            en: 'I get a haircut every six weeks at the same small salon.',
            native: 'मैं हर छह हफ़्ते में उसी छोटे सैलून में बाल कटवाता हूँ।',
          },
          {
            en: 'I once tried a very short style, but I did not like it.',
            native: 'मैंने एक बार बहुत छोटी स्टाइल आज़माई थी, लेकिन मुझे पसंद नहीं आई।',
          },
          {
            en: 'My barber knows exactly how I want my hair, so I trust him.',
            native: 'मेरे नाई को पता है कि मुझे बाल कैसे चाहिए, इसलिए मैं उस पर भरोसा करता हूँ।',
          },
        ],
      },
      es: {
        word: 'corte de pelo',
        question: '¿Con qué frecuencia te cortas el pelo? ¿Te gusta probar nuevos estilos?',
        examples: [
          {
            en: 'I get a haircut every six weeks at the same small salon.',
            native: 'Me corto el pelo cada seis semanas en la misma peluquería pequeña.',
          },
          {
            en: 'I once tried a very short style, but I did not like it.',
            native: 'Una vez probé un estilo muy corto, pero no me gustó.',
          },
          {
            en: 'My barber knows exactly how I want my hair, so I trust him.',
            native: 'Mi peluquero sabe exactamente cómo quiero el pelo, así que confío en él.',
          },
        ],
      },
      zh: {
        word: '理发',
        question: '你多久理一次发？你喜欢尝试新发型吗？',
        examples: [
          { en: 'I get a haircut every six weeks at the same small salon.', native: '我每六周在同一家小理发店理发。' },
          {
            en: 'I once tried a very short style, but I did not like it.',
            native: '我曾经试过一次很短的发型，但我不喜欢。',
          },
          {
            en: 'My barber knows exactly how I want my hair, so I trust him.',
            native: '我的理发师很清楚我想要什么发型，所以我很信任他。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'doctor',
    questionText: 'When did you last visit a doctor? How can people take better care of their health?',
    translations: {
      te: {
        word: 'డాక్టర్',
        question: 'మీరు చివరిసారిగా ఎప్పుడు డాక్టర్ దగ్గరికి వెళ్లారు? ప్రజలు తమ ఆరోగ్యాన్ని ఎలా బాగు చేసుకోవచ్చు?',
        examples: [
          {
            en: 'I last visited a doctor six months ago for a bad cold.',
            native: 'నేను ఆరు నెలల క్రితం తీవ్రమైన జలుబు కోసం చివరిసారిగా డాక్టర్ దగ్గరికి వెళ్లాను.',
          },
          {
            en: 'People can stay healthier by eating well and sleeping enough.',
            native: 'బాగా తినడం మరియు సరిపోయేంత నిద్రపోవడం ద్వారా ప్రజలు మరింత ఆరోగ్యంగా ఉండవచ్చు.',
          },
          {
            en: 'My doctor advised me to drink more water and walk daily.',
            native: 'నా డాక్టర్ ఎక్కువ నీళ్లు తాగమని మరియు ప్రతిరోజూ నడవమని నాకు సలహా ఇచ్చారు.',
          },
        ],
      },
      hi: {
        word: 'डॉक्टर',
        question: 'आप आख़िरी बार डॉक्टर के पास कब गए थे? लोग अपने स्वास्थ्य की बेहतर देखभाल कैसे कर सकते हैं?',
        examples: [
          {
            en: 'I last visited a doctor six months ago for a bad cold.',
            native: 'मैं आख़िरी बार छह महीने पहले ज़ुकाम के कारण डॉक्टर के पास गया था।',
          },
          {
            en: 'People can stay healthier by eating well and sleeping enough.',
            native: 'लोग अच्छा खाकर और पर्याप्त नींद लेकर ज़्यादा स्वस्थ रह सकते हैं।',
          },
          {
            en: 'My doctor advised me to drink more water and walk daily.',
            native: 'मेरे डॉक्टर ने मुझे ज़्यादा पानी पीने और रोज़ टहलने की सलाह दी।',
          },
        ],
      },
      es: {
        word: 'médico',
        question: '¿Cuándo fue la última vez que fuiste al médico? ¿Cómo puede la gente cuidar mejor su salud?',
        examples: [
          {
            en: 'I last visited a doctor six months ago for a bad cold.',
            native: 'La última vez que fui al médico fue hace seis meses por un resfriado fuerte.',
          },
          {
            en: 'People can stay healthier by eating well and sleeping enough.',
            native: 'La gente puede estar más sana comiendo bien y durmiendo lo suficiente.',
          },
          {
            en: 'My doctor advised me to drink more water and walk daily.',
            native: 'Mi médico me aconsejó beber más agua y caminar a diario.',
          },
        ],
      },
      zh: {
        word: '医生',
        question: '你上次看医生是什么时候？人们如何更好地照顾自己的健康？',
        examples: [
          {
            en: 'I last visited a doctor six months ago for a bad cold.',
            native: '我上次看医生是六个月前，因为重感冒。',
          },
          {
            en: 'People can stay healthier by eating well and sleeping enough.',
            native: '人们可以通过吃得好、睡得足来保持健康。',
          },
          {
            en: 'My doctor advised me to drink more water and walk daily.',
            native: '我的医生建议我多喝水、每天散步。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'hospital',
    questionText: 'Have you ever stayed in a hospital or visited someone there? Describe the experience.',
    translations: {
      te: {
        word: 'ఆసుపత్రి',
        question: 'మీరు ఎప్పుడైనా ఆసుపత్రిలో ఉన్నారా లేదా అక్కడ ఎవరినైనా సందర్శించారా? ఆ అనుభవాన్ని వివరించండి.',
        examples: [
          {
            en: 'I visited my grandmother in hospital when she broke her leg.',
            native: 'నా అమ్మమ్మ కాలు విరిగినప్పుడు ఆసుపత్రిలో ఆమెను సందర్శించాను.',
          },
          {
            en: 'The nurses were kind, and they explained everything to our family.',
            native: 'నర్సులు దయగా ఉండి, ప్రతిదీ మా కుటుంబానికి వివరించారు.',
          },
          {
            en: 'Hospitals can feel scary, but the workers there help people every day.',
            native: 'ఆసుపత్రులు భయంకరంగా అనిపించవచ్చు, కానీ అక్కడి సిబ్బంది ప్రతిరోజూ ప్రజలకు సహాయపడతారు.',
          },
        ],
      },
      hi: {
        word: 'अस्पताल',
        question: 'क्या आप कभी अस्पताल में रहे हैं या वहाँ किसी से मिलने गए हैं? उस अनुभव का वर्णन कीजिए।',
        examples: [
          {
            en: 'I visited my grandmother in hospital when she broke her leg.',
            native: 'जब मेरी दादी के पैर में फ्रैक्चर हुआ, तब मैं उन्हें अस्पताल में देखने गया।',
          },
          {
            en: 'The nurses were kind, and they explained everything to our family.',
            native: 'नर्सें बहुत दयालु थीं, और उन्होंने हमारे परिवार को सब कुछ समझाया।',
          },
          {
            en: 'Hospitals can feel scary, but the workers there help people every day.',
            native: 'अस्पताल डरावने लग सकते हैं, लेकिन वहाँ के कर्मचारी रोज़ लोगों की मदद करते हैं।',
          },
        ],
      },
      es: {
        word: 'hospital',
        question: '¿Has estado alguna vez en un hospital o has visitado a alguien allí? Describe la experiencia.',
        examples: [
          {
            en: 'I visited my grandmother in hospital when she broke her leg.',
            native: 'Visité a mi abuela en el hospital cuando se rompió la pierna.',
          },
          {
            en: 'The nurses were kind, and they explained everything to our family.',
            native: 'Las enfermeras fueron amables y nos explicaron todo a la familia.',
          },
          {
            en: 'Hospitals can feel scary, but the workers there help people every day.',
            native: 'Los hospitales pueden dar miedo, pero quienes trabajan allí ayudan a la gente cada día.',
          },
        ],
      },
      zh: {
        word: '医院',
        question: '你住过医院或去那里探望过病人吗？描述一下那次经历。',
        examples: [
          {
            en: 'I visited my grandmother in hospital when she broke her leg.',
            native: '祖母摔断腿时，我去医院探望过她。',
          },
          {
            en: 'The nurses were kind, and they explained everything to our family.',
            native: '护士们很亲切，向我们全家解释了所有情况。',
          },
          {
            en: 'Hospitals can feel scary, but the workers there help people every day.',
            native: '医院可能让人觉得害怕，但那里的工作人员每天都在帮助人们。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'medicine',
    questionText: 'Do you take medicine when you are ill, or do you prefer home remedies? Why?',
    translations: {
      te: {
        word: 'ఔషధం',
        question: 'మీకు జబ్బు చేసినప్పుడు మందులు తీసుకుంటారా లేదా ఇంటి వైద్యం ఇష్టపడతారా? ఎందుకు?',
        examples: [
          {
            en: 'For a normal cold, I prefer hot soup and rest instead of medicine.',
            native: 'సాధారణ జలుబుకు, మందుల బదులు వేడి సూప్ మరియు విశ్రాంతిని నేను ఇష్టపడతాను.',
          },
          {
            en: 'But when I have a high fever, I always see a doctor.',
            native: 'కానీ నాకు తీవ్రమైన జ్వరం వచ్చినప్పుడు, నేను ఎల్లప్పుడూ డాక్టర్‌ను చూస్తాను.',
          },
          {
            en: 'My mother makes a special ginger drink that works better than tablets.',
            native: 'నా అమ్మ ట్యాబ్లెట్ల కంటే బాగా పనిచేసే ప్రత్యేక అల్లం డ్రింక్ తయారుచేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'दवा',
        question: 'बीमार होने पर आप दवा लेते हैं या घरेलू नुस्खे पसंद करते हैं? क्यों?',
        examples: [
          {
            en: 'For a normal cold, I prefer hot soup and rest instead of medicine.',
            native: 'सामान्य ज़ुकाम के लिए, मैं दवा के बजाय गर्म सूप और आराम पसंद करता हूँ।',
          },
          {
            en: 'But when I have a high fever, I always see a doctor.',
            native: 'लेकिन जब मुझे तेज़ बुखार होता है, मैं हमेशा डॉक्टर को दिखाता हूँ।',
          },
          {
            en: 'My mother makes a special ginger drink that works better than tablets.',
            native: 'मेरी माँ एक खास अदरक का पेय बनाती है जो गोलियों से बेहतर काम करता है।',
          },
        ],
      },
      es: {
        word: 'medicina',
        question: '¿Tomas medicinas cuando estás enfermo o prefieres remedios caseros? ¿Por qué?',
        examples: [
          {
            en: 'For a normal cold, I prefer hot soup and rest instead of medicine.',
            native: 'Para un resfriado normal, prefiero sopa caliente y descanso en lugar de medicinas.',
          },
          {
            en: 'But when I have a high fever, I always see a doctor.',
            native: 'Pero cuando tengo fiebre alta, siempre voy al médico.',
          },
          {
            en: 'My mother makes a special ginger drink that works better than tablets.',
            native: 'Mi madre prepara una bebida especial de jengibre que funciona mejor que las pastillas.',
          },
        ],
      },
      zh: {
        word: '药物',
        question: '生病时你吃药还是更喜欢家庭疗法？为什么？',
        examples: [
          {
            en: 'For a normal cold, I prefer hot soup and rest instead of medicine.',
            native: '普通感冒时，我更喜欢喝热汤和休息，而不是吃药。',
          },
          { en: 'But when I have a high fever, I always see a doctor.', native: '但发高烧时，我总是去看医生。' },
          {
            en: 'My mother makes a special ginger drink that works better than tablets.',
            native: '我妈妈会泡一种特别的姜茶，比药片还管用。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'exercise',
    questionText: 'What is your favourite way to exercise, and how do you stay motivated?',
    translations: {
      te: {
        word: 'వ్యాయామం',
        question: 'వ్యాయామం చేయడానికి మీకు ఇష్టమైన మార్గం ఏది, మరియు మీరు ఎలా ప్రేరణ పొందుతారు?',
        examples: [
          {
            en: 'My favourite exercise is swimming because it uses the whole body.',
            native: 'నా ఇష్టమైన వ్యాయామం ఈత, ఎందుకంటే అది శరీరం మొత్తాన్ని వాడుతుంది.',
          },
          {
            en: 'I stay motivated by exercising with a friend every morning.',
            native: 'ప్రతి ఉదయం ఒక స్నేహితుడితో వ్యాయామం చేయడం ద్వారా నేను ప్రేరణ పొందుతాను.',
          },
          {
            en: 'When I skip exercise for a week, I feel slower and less happy.',
            native: 'ఒక వారం వ్యాయామం మానేసినప్పుడు, నాకు నెమ్మదిగా మరియు తక్కువ సంతోషంగా అనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'व्यायाम',
        question: 'व्यायाम करने का आपका पसंदीदा तरीका क्या है, और आप प्रेरित कैसे रहते हैं?',
        examples: [
          {
            en: 'My favourite exercise is swimming because it uses the whole body.',
            native: 'मेरा पसंदीदा व्यायाम तैरना है क्योंकि इससे पूरे शरीर की कसरत होती है।',
          },
          {
            en: 'I stay motivated by exercising with a friend every morning.',
            native: 'मैं हर सुबह एक दोस्त के साथ व्यायाम करके प्रेरित रहता हूँ।',
          },
          {
            en: 'When I skip exercise for a week, I feel slower and less happy.',
            native: 'जब मैं एक हफ़्ते के लिए व्यायाम छोड़ देता हूँ, तो मैं सुस्त और कम खुश महसूस करता हूँ।',
          },
        ],
      },
      es: {
        word: 'ejercicio',
        question: '¿Cuál es tu forma favorita de hacer ejercicio y cómo te mantienes motivado?',
        examples: [
          {
            en: 'My favourite exercise is swimming because it uses the whole body.',
            native: 'Mi ejercicio favorito es nadar porque usa todo el cuerpo.',
          },
          {
            en: 'I stay motivated by exercising with a friend every morning.',
            native: 'Me mantengo motivado haciendo ejercicio con un amigo cada mañana.',
          },
          {
            en: 'When I skip exercise for a week, I feel slower and less happy.',
            native: 'Cuando dejo de hacer ejercicio una semana, me siento más lento y menos feliz.',
          },
        ],
      },
      zh: {
        word: '锻炼',
        question: '你最喜欢的锻炼方式是什么？你如何保持动力？',
        examples: [
          {
            en: 'My favourite exercise is swimming because it uses the whole body.',
            native: '我最喜欢的锻炼方式是游泳，因为它锻炼全身。',
          },
          {
            en: 'I stay motivated by exercising with a friend every morning.',
            native: '我通过每天早上和朋友一起锻炼来保持动力。',
          },
          {
            en: 'When I skip exercise for a week, I feel slower and less happy.',
            native: '当我一周不锻炼时，我会感觉更迟钝、更不开心。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'running',
    questionText: 'Do you enjoy running? Where and when do you usually run?',
    translations: {
      te: {
        word: 'పరుగు',
        question: 'మీకు పరుగెత్తడం ఇష్టమా? మీరు సాధారణంగా ఎక్కడ మరియు ఎప్పుడు పరుగెత్తుతారు?',
        examples: [
          {
            en: 'I run in the park every morning before the sun gets too hot.',
            native: 'ఎండ ఎక్కువగా ముందు నేను ప్రతి ఉదయం పార్కులో పరుగెత్తుతాను.',
          },
          {
            en: 'Running is cheaper than a gym because you only need good shoes.',
            native: 'మంచి బూట్లు మాత్రమే అవసరం కాబట్టి పరుగెత్తడం జిమ్ కంటే చౌక.',
          },
          {
            en: 'At first I could only run one kilometre, but now I run five.',
            native: 'మొదట నేను ఒక కిలోమీటరు మాత్రమే పరుగెత్తగలిగేవాడిని, కానీ ఇప్పుడు ఐదు పరుగెత్తుతాను.',
          },
        ],
      },
      hi: {
        word: 'दौड़ना',
        question: 'क्या आपको दौड़ना पसंद है? आप आमतौर पर कहाँ और कब दौड़ते हैं?',
        examples: [
          {
            en: 'I run in the park every morning before the sun gets too hot.',
            native: 'धूप तेज़ होने से पहले मैं हर सुबह पार्क में दौड़ता हूँ।',
          },
          {
            en: 'Running is cheaper than a gym because you only need good shoes.',
            native: 'दौड़ना जिम से सस्ता है क्योंकि इसके लिए बस अच्छे जूते चाहिए।',
          },
          {
            en: 'At first I could only run one kilometre, but now I run five.',
            native: 'शुरू में मैं सिर्फ़ एक किलोमीटर दौड़ पाता था, लेकिन अब पाँच दौड़ता हूँ।',
          },
        ],
      },
      es: {
        word: 'correr',
        question: '¿Te gusta correr? ¿Dónde y cuándo sueles correr?',
        examples: [
          {
            en: 'I run in the park every morning before the sun gets too hot.',
            native: 'Corro en el parque cada mañana antes de que el sol caliente demasiado.',
          },
          {
            en: 'Running is cheaper than a gym because you only need good shoes.',
            native: 'Correr es más barato que un gimnasio porque solo necesitas buenos zapatos.',
          },
          {
            en: 'At first I could only run one kilometre, but now I run five.',
            native: 'Al principio solo podía correr un kilómetro, pero ahora corro cinco.',
          },
        ],
      },
      zh: {
        word: '跑步',
        question: '你喜欢跑步吗？你通常在哪里、什么时候跑步？',
        examples: [
          {
            en: 'I run in the park every morning before the sun gets too hot.',
            native: '我每天早晨趁太阳不太热时在公园跑步。',
          },
          {
            en: 'Running is cheaper than a gym because you only need good shoes.',
            native: '跑步比去健身房便宜，因为只需要一双好鞋。',
          },
          {
            en: 'At first I could only run one kilometre, but now I run five.',
            native: '起初我只能跑一公里，但现在我能跑五公里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'football',
    questionText: 'Do you watch or play football? Why is it so popular around the world?',
    translations: {
      te: {
        word: 'ఫుట్‌బాల్',
        question: 'మీరు ఫుట్‌బాల్ చూస్తారా లేదా ఆడతారా? అది ప్రపంచవ్యాప్తంగా ఎందుకు అంత ప్రసిద్ధం?',
        examples: [
          {
            en: 'I play football with my friends every Saturday in the field.',
            native: 'నేను ప్రతి శనివారం మైదానంలో నా స్నేహితులతో ఫుట్‌బాల్ ఆడుతాను.',
          },
          {
            en: 'Football is popular because anyone can play it with just a ball.',
            native: 'కేవలం ఒక బంతితో ఎవరైనా ఆడగలరు కాబట్టి ఫుట్‌బాల్ ప్రసిద్ధం.',
          },
          {
            en: 'When my team scores a goal, the whole crowd shouts with joy.',
            native: 'నా జట్టు గోల్ చేసినప్పుడు, జనం మొత్తం ఆనందంతో అరుస్తారు.',
          },
        ],
      },
      hi: {
        word: 'फ़ुटबॉल',
        question: 'क्या आप फ़ुटबॉल देखते हैं या खेलते हैं? यह दुनिया भर में इतना लोकप्रिय क्यों है?',
        examples: [
          {
            en: 'I play football with my friends every Saturday in the field.',
            native: 'मैं हर शनिवार मैदान में अपने दोस्तों के साथ फ़ुटबॉल खेलता हूँ।',
          },
          {
            en: 'Football is popular because anyone can play it with just a ball.',
            native: 'फ़ुटबॉल लोकप्रिय है क्योंकि सिर्फ़ एक गेंद से कोई भी इसे खेल सकता है।',
          },
          {
            en: 'When my team scores a goal, the whole crowd shouts with joy.',
            native: 'जब मेरी टीम गोल करती है, तो पूरी भीड़ खुशी से चिल्लाती है।',
          },
        ],
      },
      es: {
        word: 'fútbol',
        question: '¿Ves o juegas al fútbol? ¿Por qué es tan popular en todo el mundo?',
        examples: [
          {
            en: 'I play football with my friends every Saturday in the field.',
            native: 'Juego al fútbol con mis amigos todos los sábados en el campo.',
          },
          {
            en: 'Football is popular because anyone can play it with just a ball.',
            native: 'El fútbol es popular porque cualquiera puede jugarlo solo con un balón.',
          },
          {
            en: 'When my team scores a goal, the whole crowd shouts with joy.',
            native: 'Cuando mi equipo marca un gol, toda la multitud grita de alegría.',
          },
        ],
      },
      zh: {
        word: '足球',
        question: '你看足球还是踢足球？为什么它在全世界如此受欢迎？',
        examples: [
          {
            en: 'I play football with my friends every Saturday in the field.',
            native: '我每周六都和朋友们在球场上踢足球。',
          },
          {
            en: 'Football is popular because anyone can play it with just a ball.',
            native: '足球很受欢迎，因为只要有一个球，任何人都能踢。',
          },
          {
            en: 'When my team scores a goal, the whole crowd shouts with joy.',
            native: '当我的球队进球时，全场观众都会欢呼。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'cricket',
    questionText: 'Is cricket popular in your country? Talk about a match you remember.',
    translations: {
      te: {
        word: 'క్రికెట్',
        question: 'మీ దేశంలో క్రికెట్ ప్రసిద్ధమా? మీకు గుర్తున్న ఒక మ్యాచ్ గురించి మాట్లాడండి.',
        examples: [
          { en: 'Cricket is the most loved sport in my country.', native: 'క్రికెట్ నా దేశంలో అత్యంత ప్రియమైన క్రీడ.' },
          {
            en: 'I remember a match where our team won in the last over.',
            native: 'మా జట్టు చివరి ఓవర్‌లో గెలిచిన ఒక మ్యాచ్ నాకు గుర్తుంది.',
          },
          {
            en: 'During big matches, the streets are empty because everyone is watching.',
            native: 'పెద్ద మ్యాచ్‌ల సమయంలో, అందరూ చూస్తున్నారు కాబట్టి వీధులు ఖాళీగా ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'क्रिकेट',
        question: 'क्या आपके देश में क्रिकेट लोकप्रिय है? किसी यादगार मैच के बारे में बताइए।',
        examples: [
          {
            en: 'Cricket is the most loved sport in my country.',
            native: 'क्रिकेट मेरे देश में सबसे पसंद किया जाने वाला खेल है।',
          },
          {
            en: 'I remember a match where our team won in the last over.',
            native: 'मुझे एक ऐसा मैच याद है जिसमें हमारी टीम आख़िरी ओवर में जीती थी।',
          },
          {
            en: 'During big matches, the streets are empty because everyone is watching.',
            native: 'बड़े मैचों के दौरान सड़कें खाली रहती हैं क्योंकि सब मैच देख रहे होते हैं।',
          },
        ],
      },
      es: {
        word: 'críquet',
        question: '¿Es popular el críquet en tu país? Habla de un partido que recuerdes.',
        examples: [
          {
            en: 'Cricket is the most loved sport in my country.',
            native: 'El críquet es el deporte más querido de mi país.',
          },
          {
            en: 'I remember a match where our team won in the last over.',
            native: 'Recuerdo un partido en el que nuestro equipo ganó en el último over.',
          },
          {
            en: 'During big matches, the streets are empty because everyone is watching.',
            native: 'Durante los grandes partidos, las calles están vacías porque todos están mirando.',
          },
        ],
      },
      zh: {
        word: '板球',
        question: '板球在你的国家流行吗？谈谈你记得的一场比赛。',
        examples: [
          { en: 'Cricket is the most loved sport in my country.', native: '板球是我国最受欢迎的运动。' },
          {
            en: 'I remember a match where our team won in the last over.',
            native: '我记得有一场比赛，我们队在最后一局获胜。',
          },
          {
            en: 'During big matches, the streets are empty because everyone is watching.',
            native: '大赛期间，街道上空无一人，因为大家都在看比赛。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'yoga',
    questionText: 'Have you ever tried yoga? Why do so many people practise it?',
    translations: {
      te: {
        word: 'యోగా',
        question: 'మీరు ఎప్పుడైనా యోగా ప్రయత్నించారా? చాలా మంది దానిని ఎందుకు అభ్యసిస్తారు?',
        examples: [
          {
            en: 'I tried yoga last year, and now I practise it twice a week.',
            native: 'నేను గత సంవత్సరం యోగా ప్రయత్నించాను, ఇప్పుడు వారానికి రెండుసార్లు అభ్యసిస్తాను.',
          },
          {
            en: 'People do yoga because it makes the body strong and the mind calm.',
            native: 'యోగా శరీరాన్ని బలంగా మరియు మనస్సును ప్రశాంతంగా చేస్తుంది కాబట్టి ప్రజలు దాన్ని చేస్తారు.',
          },
          {
            en: 'Yoga is slower than other sports, but it is harder than it looks.',
            native: 'యోగా ఇతర క్రీడల కంటే నెమ్మదిగా ఉంటుంది, కానీ అది కనిపించినంత సులభం కాదు.',
          },
        ],
      },
      hi: {
        word: 'योग',
        question: 'क्या आपने कभी योग किया है? इतने सारे लोग इसे क्यों करते हैं?',
        examples: [
          {
            en: 'I tried yoga last year, and now I practise it twice a week.',
            native: 'मैंने पिछले साल योग आज़माया, और अब मैं हफ़्ते में दो बार इसका अभ्यास करता हूँ।',
          },
          {
            en: 'People do yoga because it makes the body strong and the mind calm.',
            native: 'लोग योग करते हैं क्योंकि इससे शरीर मज़बूत और मन शांत होता है।',
          },
          {
            en: 'Yoga is slower than other sports, but it is harder than it looks.',
            native: 'योग अन्य खेलों से धीमा है, लेकिन यह दिखने में जितना आसान लगता है, उतना आसान नहीं है।',
          },
        ],
      },
      es: {
        word: 'yoga',
        question: '¿Has probado el yoga alguna vez? ¿Por qué tanta gente lo practica?',
        examples: [
          {
            en: 'I tried yoga last year, and now I practise it twice a week.',
            native: 'Probé el yoga el año pasado y ahora lo practico dos veces por semana.',
          },
          {
            en: 'People do yoga because it makes the body strong and the mind calm.',
            native: 'La gente hace yoga porque fortalece el cuerpo y calma la mente.',
          },
          {
            en: 'Yoga is slower than other sports, but it is harder than it looks.',
            native: 'El yoga es más lento que otros deportes, pero es más difícil de lo que parece.',
          },
        ],
      },
      zh: {
        word: '瑜伽',
        question: '你试过瑜伽吗？为什么这么多人练习瑜伽？',
        examples: [
          {
            en: 'I tried yoga last year, and now I practise it twice a week.',
            native: '我去年开始尝试瑜伽，现在每周练习两次。',
          },
          {
            en: 'People do yoga because it makes the body strong and the mind calm.',
            native: '人们练瑜伽是因为它能让身体强壮、心灵平静。',
          },
          {
            en: 'Yoga is slower than other sports, but it is harder than it looks.',
            native: '瑜伽比其他运动慢，但比看起来要难。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'meditation',
    questionText: 'Do you meditate or take quiet time for yourself? How does it help?',
    translations: {
      te: {
        word: 'ధ్యానం',
        question: 'మీరు ధ్యానం చేస్తారా లేదా మీ కోసం ప్రశాంతమైన సమయం కేటాయిస్తారా? అది ఎలా సహాయపడుతుంది?',
        examples: [
          {
            en: 'I sit quietly for ten minutes every morning before I start work.',
            native: 'నేను పని ప్రారంభించే ముందు ప్రతి ఉదయం పది నిమిషాలు ప్రశాంతంగా కూర్చుంటాను.',
          },
          {
            en: 'Meditation helps me worry less and sleep better at night.',
            native: 'ధ్యానం నాకు తక్కువ ఆందోళన చెందడానికి మరియు రాత్రి బాగా నిద్రపోవడానికి సహాయపడుతుంది.',
          },
          {
            en: 'It was boring at first, but now I look forward to it.',
            native: 'మొదట అది విసుగ్గా అనిపించింది, కానీ ఇప్పుడు నేను దాని కోసం ఎదురుచూస్తాను.',
          },
        ],
      },
      hi: {
        word: 'ध्यान',
        question: 'क्या आप ध्यान करते हैं या अपने लिए शांत समय निकालते हैं? इससे कैसे मदद मिलती है?',
        examples: [
          {
            en: 'I sit quietly for ten minutes every morning before I start work.',
            native: 'मैं काम शुरू करने से पहले हर सुबह दस मिनट शांति से बैठता हूँ।',
          },
          {
            en: 'Meditation helps me worry less and sleep better at night.',
            native: 'ध्यान से मैं कम चिंता करता हूँ और रात में बेहतर नींद आती है।',
          },
          {
            en: 'It was boring at first, but now I look forward to it.',
            native: 'शुरू में यह उबाऊ लगता था, लेकिन अब मैं इसका इंतज़ार करता हूँ।',
          },
        ],
      },
      es: {
        word: 'meditación',
        question: '¿Meditas o te tomas un tiempo tranquilo para ti? ¿Cómo te ayuda?',
        examples: [
          {
            en: 'I sit quietly for ten minutes every morning before I start work.',
            native: 'Me siento en silencio diez minutos cada mañana antes de empezar a trabajar.',
          },
          {
            en: 'Meditation helps me worry less and sleep better at night.',
            native: 'La meditación me ayuda a preocuparme menos y a dormir mejor por la noche.',
          },
          {
            en: 'It was boring at first, but now I look forward to it.',
            native: 'Al principio era aburrido, pero ahora lo espero con ganas.',
          },
        ],
      },
      zh: {
        word: '冥想',
        question: '你冥想或给自己留安静的时间吗？这有什么帮助？',
        examples: [
          {
            en: 'I sit quietly for ten minutes every morning before I start work.',
            native: '我每天开始工作前安静地坐十分钟。',
          },
          {
            en: 'Meditation helps me worry less and sleep better at night.',
            native: '冥想帮助我减少焦虑，晚上睡得更好。',
          },
          {
            en: 'It was boring at first, but now I look forward to it.',
            native: '一开始很无聊，但现在我很期待这段时间。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'sleep',
    questionText: 'How many hours do you sleep each night? What helps you sleep well?',
    translations: {
      te: {
        word: 'నిద్ర',
        question: 'మీరు ప్రతి రాత్రి ఎన్ని గంటలు నిద్రపోతారు? బాగా నిద్రపోవడానికి ఏమి సహాయపడుతుంది?',
        examples: [
          {
            en: 'I sleep about seven hours a night, which is enough for me.',
            native: 'నేను రాత్రికి సుమారు ఏడు గంటలు నిద్రపోతాను, అది నాకు సరిపోతుంది.',
          },
          {
            en: 'Reading a book helps me fall asleep faster than watching my phone.',
            native: 'ఫోన్ చూడటం కంటే పుస్తకం చదవడం నాకు త్వరగా నిద్రపట్టడానికి సహాయపడుతుంది.',
          },
          {
            en: 'When I sleep badly, I cannot concentrate the next day.',
            native: 'నేను బాగా నిద్రపోనప్పుడు, మరుసటి రోజు కాన్సన్ట్రేట్ చేయలేను.',
          },
        ],
      },
      hi: {
        word: 'नींद',
        question: 'आप हर रात कितने घंटे सोते हैं? अच्छी नींद के लिए क्या मदद करता है?',
        examples: [
          {
            en: 'I sleep about seven hours a night, which is enough for me.',
            native: 'मैं रात में लगभग सात घंटे सोता हूँ, जो मेरे लिए काफ़ी है।',
          },
          {
            en: 'Reading a book helps me fall asleep faster than watching my phone.',
            native: 'फ़ोन देखने की तुलना में किताब पढ़ने से मुझे जल्दी नींद आती है।',
          },
          {
            en: 'When I sleep badly, I cannot concentrate the next day.',
            native: 'जब मैं ठीक से नहीं सोता, तो अगले दिन मैं ध्यान नहीं लगा पाता।',
          },
        ],
      },
      es: {
        word: 'sueño',
        question: '¿Cuántas horas duermes cada noche? ¿Qué te ayuda a dormir bien?',
        examples: [
          {
            en: 'I sleep about seven hours a night, which is enough for me.',
            native: 'Duermo unas siete horas por noche, lo que es suficiente para mí.',
          },
          {
            en: 'Reading a book helps me fall asleep faster than watching my phone.',
            native: 'Leer un libro me ayuda a dormirme más rápido que mirar el teléfono.',
          },
          {
            en: 'When I sleep badly, I cannot concentrate the next day.',
            native: 'Cuando duermo mal, no puedo concentrarme al día siguiente.',
          },
        ],
      },
      zh: {
        word: '睡眠',
        question: '你每晚睡几个小时？什么能帮助你睡得好？',
        examples: [
          {
            en: 'I sleep about seven hours a night, which is enough for me.',
            native: '我每晚大约睡七个小时，这对我来说足够了。',
          },
          {
            en: 'Reading a book helps me fall asleep faster than watching my phone.',
            native: '读书比看手机更能帮我快速入睡。',
          },
          {
            en: 'When I sleep badly, I cannot concentrate the next day.',
            native: '睡不好时，我第二天就无法集中注意力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'breakfast',
    questionText: 'What do you usually eat for breakfast? Do you think it is an important meal?',
    translations: {
      te: {
        word: 'అల్పాహారం',
        question: 'మీరు సాధారణంగా అల్పాహారంగా ఏమి తింటారు? అది ముఖ్యమైన భోజనమని మీరు అనుకుంటున్నారా?',
        examples: [
          {
            en: 'I usually eat eggs and bread with a glass of milk for breakfast.',
            native: 'నేను సాధారణంగా అల్పాహారంగా గుడ్లు మరియు బ్రెడ్ తో పాటు ఒక గ్లాసు పాలు తింటాను.',
          },
          {
            en: 'Breakfast is important because it gives me energy for the morning.',
            native: 'అల్పాహారం నాకు ఉదయం శక్తిని ఇస్తుంది కాబట్టి అది ముఖ్యం.',
          },
          {
            en: 'When I skip breakfast, I feel hungry and tired before lunch.',
            native: 'నేను అల్పాహారం మానేసినప్పుడు, మధ్యాహ్నానికి ముందే ఆకలిగా మరియు అలసటగా అనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'नाश्ता',
        question: 'आप नाश्ते में आमतौर पर क्या खाते हैं? क्या आपको लगता है कि यह एक ज़रूरी भोजन है?',
        examples: [
          {
            en: 'I usually eat eggs and bread with a glass of milk for breakfast.',
            native: 'मैं नाश्ते में आमतौर पर अंडे और ब्रेड के साथ एक गिलास दूध खाता हूँ।',
          },
          {
            en: 'Breakfast is important because it gives me energy for the morning.',
            native: 'नाश्ता ज़रूरी है क्योंकि इससे मुझे सुबह के लिए ऊर्जा मिलती है।',
          },
          {
            en: 'When I skip breakfast, I feel hungry and tired before lunch.',
            native: 'जब मैं नाश्ता छोड़ देता हूँ, तो दोपहर के खाने से पहले ही भूख और थकान महसूस होती है।',
          },
        ],
      },
      es: {
        word: 'desayuno',
        question: '¿Qué desayunas normalmente? ¿Crees que es una comida importante?',
        examples: [
          {
            en: 'I usually eat eggs and bread with a glass of milk for breakfast.',
            native: 'Normalmente desayuno huevos con pan y un vaso de leche.',
          },
          {
            en: 'Breakfast is important because it gives me energy for the morning.',
            native: 'El desayuno es importante porque me da energía para la mañana.',
          },
          {
            en: 'When I skip breakfast, I feel hungry and tired before lunch.',
            native: 'Cuando me salto el desayuno, tengo hambre y me siento cansado antes de comer.',
          },
        ],
      },
      zh: {
        word: '早餐',
        question: '你早餐通常吃什么？你认为这是一顿重要的饭吗？',
        examples: [
          {
            en: 'I usually eat eggs and bread with a glass of milk for breakfast.',
            native: '我早餐通常吃鸡蛋和面包，配一杯牛奶。',
          },
          {
            en: 'Breakfast is important because it gives me energy for the morning.',
            native: '早餐很重要，因为它给我上午的能量。',
          },
          {
            en: 'When I skip breakfast, I feel hungry and tired before lunch.',
            native: '当我不吃早餐时，午饭前就会感到又饿又累。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'tea',
    questionText: 'Do you drink tea? How is tea prepared and enjoyed in your region?',
    translations: {
      te: {
        word: 'టీ',
        question: 'మీరు టీ తాగుతారా? మీ ప్రాంతంలో టీ ఎలా తయారుచేసి ఆస్వాదిస్తారు?',
        examples: [
          {
            en: 'I drink two cups of tea every day, one in the morning and one at five.',
            native: 'నేను రోజుకు రెండు కప్పుల టీ తాగుతాను, ఒకటి ఉదయం మరియు ఒకటి ఐదు గంటలకు.',
          },
          {
            en: 'In my region, tea is made with milk, sugar, and strong spices.',
            native: 'మా ప్రాంతంలో, టీని పాలు, చక్కెర మరియు గట్టి మసాలాలతో తయారుచేస్తారు.',
          },
          {
            en: 'Drinking tea with my colleagues is the best break at work.',
            native: 'నా సహోద్యోగులతో టీ తాగటం పనిలో అత్యుత్తమ విరామం.',
          },
        ],
      },
      hi: {
        word: 'चाय',
        question: 'क्या आप चाय पीते हैं? आपके क्षेत्र में चाय कैसे बनाई और पी जाती है?',
        examples: [
          {
            en: 'I drink two cups of tea every day, one in the morning and one at five.',
            native: 'मैं दिन में दो कप चाय पीता हूँ, एक सुबह और एक शाम पाँच बजे।',
          },
          {
            en: 'In my region, tea is made with milk, sugar, and strong spices.',
            native: 'मेरे क्षेत्र में, चाय दूध, चीनी और तेज़ मसालों के साथ बनाई जाती है।',
          },
          {
            en: 'Drinking tea with my colleagues is the best break at work.',
            native: 'सहकर्मियों के साथ चाय पीना काम पर सबसे अच्छा ब्रेक है।',
          },
        ],
      },
      es: {
        word: 'té',
        question: '¿Bebes té? ¿Cómo se prepara y se disfruta el té en tu región?',
        examples: [
          {
            en: 'I drink two cups of tea every day, one in the morning and one at five.',
            native: 'Bebo dos tazas de té al día, una por la mañana y otra a las cinco.',
          },
          {
            en: 'In my region, tea is made with milk, sugar, and strong spices.',
            native: 'En mi región, el té se prepara con leche, azúcar y especias fuertes.',
          },
          {
            en: 'Drinking tea with my colleagues is the best break at work.',
            native: 'Tomar té con mis compañeros es el mejor descanso del trabajo.',
          },
        ],
      },
      zh: {
        word: '茶',
        question: '你喝茶吗？在你的地区，茶是如何冲泡和享用的？',
        examples: [
          {
            en: 'I drink two cups of tea every day, one in the morning and one at five.',
            native: '我每天喝两杯茶，早上一杯，下午五点一杯。',
          },
          {
            en: 'In my region, tea is made with milk, sugar, and strong spices.',
            native: '在我的地区，茶是用牛奶、糖和浓香料煮的。',
          },
          {
            en: 'Drinking tea with my colleagues is the best break at work.',
            native: '和同事一起喝茶是工作中最好的休息。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'coffee',
    questionText: 'Do you prefer coffee or tea? When do you usually drink it?',
    translations: {
      te: {
        word: 'కాఫీ',
        question: 'మీకు కాఫీనా లేదా టీనా ఇష్టం? మీరు దాన్ని సాధారణంగా ఎప్పుడు తాగుతారు?',
        examples: [
          {
            en: 'I prefer coffee because its smell wakes me up in the morning.',
            native: 'దాని వాసన ఉదయం నన్ను మేల్కొలుపుతుంది కాబట్టి నాకు కాఫీ ఇష్టం.',
          },
          {
            en: 'I drink one cup before work and never drink it at night.',
            native: 'నేను పనికి ముందు ఒక కప్పు తాగుతాను, రాత్రి ఎప్పుడూ తాగను.',
          },
          {
            en: 'Coffee tastes better when I share it with a friend.',
            native: 'ఒక స్నేహితుడితో పంచుకున్నప్పుడు కాఫీ రుచి మరింత బాగుంటుంది.',
          },
        ],
      },
      hi: {
        word: 'कॉफ़ी',
        question: 'आपको कॉफ़ी पसंद है या चाय? आप इसे आमतौर पर कब पीते हैं?',
        examples: [
          {
            en: 'I prefer coffee because its smell wakes me up in the morning.',
            native: 'मुझे कॉफ़ी पसंद है क्योंकि इसकी खुशबू सुबह मुझे जगा देती है।',
          },
          {
            en: 'I drink one cup before work and never drink it at night.',
            native: 'मैं काम से पहले एक कप पीता हूँ और रात में कभी नहीं पीता।',
          },
          {
            en: 'Coffee tastes better when I share it with a friend.',
            native: 'जब मैं किसी दोस्त के साथ कॉफ़ी पीता हूँ, तो इसका स्वाद और अच्छा लगता है।',
          },
        ],
      },
      es: {
        word: 'café',
        question: '¿Prefieres café o té? ¿Cuándo sueles tomarlo?',
        examples: [
          {
            en: 'I prefer coffee because its smell wakes me up in the morning.',
            native: 'Prefiero el café porque su olor me despierta por la mañana.',
          },
          {
            en: 'I drink one cup before work and never drink it at night.',
            native: 'Tomo una taza antes del trabajo y nunca lo bebo por la noche.',
          },
          {
            en: 'Coffee tastes better when I share it with a friend.',
            native: 'El café sabe mejor cuando lo comparto con un amigo.',
          },
        ],
      },
      zh: {
        word: '咖啡',
        question: '你喜欢咖啡还是茶？你通常什么时候喝？',
        examples: [
          {
            en: 'I prefer coffee because its smell wakes me up in the morning.',
            native: '我更喜欢咖啡，因为它的香味能在早上唤醒我。',
          },
          { en: 'I drink one cup before work and never drink it at night.', native: '我上班前喝一杯，晚上从不喝。' },
          { en: 'Coffee tastes better when I share it with a friend.', native: '和朋友分享时，咖啡的味道更好。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'picnic',
    questionText: 'Have you ever been on a picnic? What did you take and where did you go?',
    translations: {
      te: {
        word: 'వనభోజనం',
        question: 'మీరు ఎప్పుడైనా వనభోజనానికి వెళ్లారా? మీరు ఏమి తీసుకువెళ్లారు మరియు ఎక్కడికి వెళ్లారు?',
        examples: [
          {
            en: 'Last spring, my class went on a picnic to a lake near the town.',
            native: 'గత వసంతకాలంలో, నా క్లాస్ పట్టణం దగ్గర ఉన్న ఒక సరస్సుకు వనభోజనానికి వెళ్లింది.',
          },
          {
            en: 'We took sandwiches, fruit, and juice in a big basket.',
            native: 'మేము ఒక పెద్ద బుట్టలో శాండ్‌విచ్‌లు, పండ్లు మరియు జ్యూస్ తీసుకువెళ్లాము.',
          },
          {
            en: 'The picnic was fun, although it started raining in the afternoon.',
            native: 'మధ్యాహ్నం వర్షం మొదలయినప్పటికీ, వనభోజనం సరదాగా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'पिकनिक',
        question: 'क्या आप कभी पिकनिक पर गए हैं? आप क्या लेकर गए और कहाँ गए?',
        examples: [
          {
            en: 'Last spring, my class went on a picnic to a lake near the town.',
            native: 'पिछली बसंत में, मेरी कक्षा शहर के पास एक झील पर पिकनिक पर गई।',
          },
          {
            en: 'We took sandwiches, fruit, and juice in a big basket.',
            native: 'हम एक बड़ी टोकरी में सैंडविच, फल और जूस लेकर गए।',
          },
          {
            en: 'The picnic was fun, although it started raining in the afternoon.',
            native: 'पिकनिक मज़ेदार थी, भले ही दोपहर में बारिश शुरू हो गई।',
          },
        ],
      },
      es: {
        word: 'pícnic',
        question: '¿Has ido alguna vez de pícnic? ¿Qué llevaste y adónde fuiste?',
        examples: [
          {
            en: 'Last spring, my class went on a picnic to a lake near the town.',
            native: 'La primavera pasada, mi clase fue de pícnic a un lago cerca del pueblo.',
          },
          {
            en: 'We took sandwiches, fruit, and juice in a big basket.',
            native: 'Llevamos sándwiches, fruta y zumo en una cesta grande.',
          },
          {
            en: 'The picnic was fun, although it started raining in the afternoon.',
            native: 'El pícnic fue divertido, aunque empezó a llover por la tarde.',
          },
        ],
      },
      zh: {
        word: '野餐',
        question: '你去野餐过吗？你带了什么，去了哪里？',
        examples: [
          {
            en: 'Last spring, my class went on a picnic to a lake near the town.',
            native: '去年春天，我们班去城镇附近的湖边野餐。',
          },
          {
            en: 'We took sandwiches, fruit, and juice in a big basket.',
            native: '我们用一个大篮子带了三明治、水果和果汁。',
          },
          {
            en: 'The picnic was fun, although it started raining in the afternoon.',
            native: '野餐很有趣，尽管下午开始下雨了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'camping',
    questionText: 'Would you like to go camping? What are the good and bad things about sleeping outdoors?',
    translations: {
      te: {
        word: 'క్యాంపింగ్',
        question: 'మీరు క్యాంపింగ్‌కు వెళ్లాలనుకుంటున్నారా? బహిరంగంగా పడుకోవడంలో మంచి మరియు చెడు విషయాలు ఏమిటి?',
        examples: [
          {
            en: 'I went camping in the hills with my cousins two years ago.',
            native: 'రెండు సంవత్సరాల క్రితం నేను నా కజిన్స్‌తో కొండల్లో క్యాంపింగ్‌కు వెళ్లాను.',
          },
          {
            en: 'The stars were beautiful, but the ground was hard and cold.',
            native: 'నక్షత్రాలు అందంగా ఉన్నాయి, కానీ నేల గట్టిగా మరియు చల్లగా ఉంది.',
          },
          {
            en: 'Camping teaches you to enjoy simple things like fire and food.',
            native: 'క్యాంపింగ్ మంట మరియు ఆహారం వంటి సాధారణ విషయాలను ఆస్వాదించడం నేర్పుతుంది.',
          },
        ],
      },
      hi: {
        word: 'कैम्पिंग',
        question: 'क्या आप कैम्पिंग पर जाना चाहेंगे? खुली जगह में सोने की अच्छी और बुरी बातें क्या हैं?',
        examples: [
          {
            en: 'I went camping in the hills with my cousins two years ago.',
            native: 'दो साल पहले मैं अपने चचेरे भाइयों के साथ पहाड़ों पर कैम्पिंग गया था।',
          },
          {
            en: 'The stars were beautiful, but the ground was hard and cold.',
            native: 'तारे बहुत सुंदर थे, लेकिन ज़मीन कड़ी और ठंडी थी।',
          },
          {
            en: 'Camping teaches you to enjoy simple things like fire and food.',
            native: 'कैम्पिंग आपको आग और खाने जैसी साधारण चीज़ों का आनंद लेना सिखाती है।',
          },
        ],
      },
      es: {
        word: 'acampada',
        question: '¿Te gustaría ir de acampada? ¿Qué cosas buenas y malas tiene dormir al aire libre?',
        examples: [
          {
            en: 'I went camping in the hills with my cousins two years ago.',
            native: 'Fui de acampada a las colinas con mis primos hace dos años.',
          },
          {
            en: 'The stars were beautiful, but the ground was hard and cold.',
            native: 'Las estrellas eran preciosas, pero el suelo estaba duro y frío.',
          },
          {
            en: 'Camping teaches you to enjoy simple things like fire and food.',
            native: 'Acampar te enseña a disfrutar de cosas sencillas como el fuego y la comida.',
          },
        ],
      },
      zh: {
        word: '露营',
        question: '你想去露营吗？在户外睡觉有什么好处和坏处？',
        examples: [
          { en: 'I went camping in the hills with my cousins two years ago.', native: '两年前我和表亲们去山里露营。' },
          { en: 'The stars were beautiful, but the ground was hard and cold.', native: '星星很美，但地面又硬又冷。' },
          {
            en: 'Camping teaches you to enjoy simple things like fire and food.',
            native: '露营教会你享受火堆和食物这样简单的东西。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'train',
    questionText: 'Do you like travelling by train? Describe a train journey you remember.',
    translations: {
      te: {
        word: 'రైలు',
        question: 'మీకు రైలులో ప్రయాణించడం ఇష్టమా? మీకు గుర్తున్న ఒక రైలు ప్రయాణాన్ని వివరించండి.',
        examples: [
          {
            en: 'I like trains because I can walk around and watch the landscape.',
            native: 'నేను తిరిగి నడవవచ్చు మరియు ప్రకృతి దృశ్యాన్ని చూడవచ్చు కాబట్టి రైళ్లు నాకు ఇష్టం.',
          },
          {
            en: 'Last year, I took a night train to visit my aunt in the city.',
            native: 'గత సంవత్సరం, నగరంలోని నా అత్తయ్యను చూడటానికి నేను రాత్రి రైలు ఎక్కాను.',
          },
          {
            en: 'The journey was long, but talking with other passengers made it short.',
            native: 'ప్రయాణం సుదీర్ఘంగా ఉంది, కానీ ఇతర ప్రయాణికులతో మాట్లాడటం దాన్ని తక్కువగా అనిపించేలా చేసింది.',
          },
        ],
      },
      hi: {
        word: 'ट्रेन',
        question: 'क्या आपको ट्रेन से यात्रा करना पसंद है? किसी यादगार ट्रेन यात्रा का वर्णन कीजिए।',
        examples: [
          {
            en: 'I like trains because I can walk around and watch the landscape.',
            native: 'मुझे ट्रेनें पसंद हैं क्योंकि मैं घूम-घामकर बाहर का नज़ारा देख सकता हूँ।',
          },
          {
            en: 'Last year, I took a night train to visit my aunt in the city.',
            native: 'पिछले साल, मैं शहर में अपनी मौसी से मिलने रात की ट्रेन से गया।',
          },
          {
            en: 'The journey was long, but talking with other passengers made it short.',
            native: 'यात्रा लंबी थी, लेकिन दूसरे यात्रियों से बात करने से वह छोटी लगने लगी।',
          },
        ],
      },
      es: {
        word: 'tren',
        question: '¿Te gusta viajar en tren? Describe un viaje en tren que recuerdes.',
        examples: [
          {
            en: 'I like trains because I can walk around and watch the landscape.',
            native: 'Me gustan los trenes porque puedo moverme y ver el paisaje.',
          },
          {
            en: 'Last year, I took a night train to visit my aunt in the city.',
            native: 'El año pasado tomé un tren nocturno para visitar a mi tía en la ciudad.',
          },
          {
            en: 'The journey was long, but talking with other passengers made it short.',
            native: 'El viaje era largo, pero hablar con otros pasajeros lo hizo corto.',
          },
        ],
      },
      zh: {
        word: '火车',
        question: '你喜欢坐火车旅行吗？描述一次你记得的火车之旅。',
        examples: [
          {
            en: 'I like trains because I can walk around and watch the landscape.',
            native: '我喜欢火车，因为我可以走动并欣赏风景。',
          },
          {
            en: 'Last year, I took a night train to visit my aunt in the city.',
            native: '去年，我坐夜车去城里看望我的阿姨。',
          },
          {
            en: 'The journey was long, but talking with other passengers made it short.',
            native: '旅程很长，但和其他乘客聊天让它变短了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'bus',
    questionText: 'How often do you take the bus? What are the good and bad points of bus travel?',
    translations: {
      te: {
        word: 'బస్సు',
        question: 'మీరు ఎంత తరచుగా బస్సు తీసుకుంటారు? బస్సు ప్రయాణంలో మంచి మరియు చెడు విషయాలు ఏమిటి?',
        examples: [
          {
            en: 'I take the bus to work every day because it is cheap and direct.',
            native: 'అది చౌకగా మరియు నేరుగా ఉంటుంది కాబట్టి నేను ప్రతిరోజూ పనికి బస్సు తీసుకుంటాను.',
          },
          {
            en: 'Buses are slower than cars, but they cost much less.',
            native: 'బస్సులు కార్ల కంటే నెమ్మదిగా ఉంటాయి, కానీ అవి చాలా తక్కువ ఖర్చవుతాయి.',
          },
          {
            en: 'The worst thing is waiting in the rain when the bus is late.',
            native: 'బస్సు ఆలస్యమైనప్పుడు వర్షంలో వేచి ఉండటమే అత్యంత చెత్త విషయం.',
          },
        ],
      },
      hi: {
        word: 'बस',
        question: 'आप कितनी बार बस लेते हैं? बस यात्रा की अच्छी और बुरी बातें क्या हैं?',
        examples: [
          {
            en: 'I take the bus to work every day because it is cheap and direct.',
            native: 'मैं हर दिन काम पर बस से जाता हूँ क्योंकि यह सस्ती और सीधी है।',
          },
          {
            en: 'Buses are slower than cars, but they cost much less.',
            native: 'बसें कारों से धीमी होती हैं, लेकिन इनका खर्च बहुत कम होता है।',
          },
          {
            en: 'The worst thing is waiting in the rain when the bus is late.',
            native: 'सबसे बुरी बात यह है कि बस देर से आए तो बारिश में इंतज़ार करना पड़ता है।',
          },
        ],
      },
      es: {
        word: 'autobús',
        question: '¿Con qué frecuencia tomas el autobús? ¿Cuáles son los puntos buenos y malos de viajar en autobús?',
        examples: [
          {
            en: 'I take the bus to work every day because it is cheap and direct.',
            native: 'Cojo el autobús al trabajo cada día porque es barato y directo.',
          },
          {
            en: 'Buses are slower than cars, but they cost much less.',
            native: 'Los autobuses son más lentos que los coches, pero cuestan mucho menos.',
          },
          {
            en: 'The worst thing is waiting in the rain when the bus is late.',
            native: 'Lo peor es esperar bajo la lluvia cuando el autobús llega tarde.',
          },
        ],
      },
      zh: {
        word: '公交车',
        question: '你多久坐一次公交车？乘公交车旅行有什么优点和缺点？',
        examples: [
          {
            en: 'I take the bus to work every day because it is cheap and direct.',
            native: '我每天坐公交车上班，因为便宜又直达。',
          },
          { en: 'Buses are slower than cars, but they cost much less.', native: '公交车比汽车慢，但费用低得多。' },
          {
            en: 'The worst thing is waiting in the rain when the bus is late.',
            native: '最糟糕的是公交车晚点时在雨中等车。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'airplane',
    questionText: 'Have you ever flown in an airplane? Describe your first flight or one you would like to take.',
    translations: {
      te: {
        word: 'విమానం',
        question:
          'మీరు ఎప్పుడైనా విమానంలో ప్రయాణించారా? మీ మొదటి విమాన ప్రయాణాన్ని లేదా మీరు చేయాలనుకుంటున్న ప్రయాణాన్ని వివరించండి.',
        examples: [
          {
            en: 'My first flight was from my city to the capital last winter.',
            native: 'నా మొదటి విమాన ప్రయాణం గత శీతాకాలంలో నా నగరం నుండి రాజధానికి.',
          },
          {
            en: 'I felt excited when the plane lifted off the ground.',
            native: 'విమానం నేల నుండి ఎగిరినప్పుడు నాకు ఉత్సాహంగా అనిపించింది.',
          },
          {
            en: 'Flying is faster than any other transport, but airports are stressful.',
            native: 'ఎగరడం మిగతా రవాణా కంటే వేగంగా ఉంటుంది, కానీ విమానాశ్రయాలు ఒత్తిడిని ఇస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'हवाई जहाज़',
        question: 'क्या आपने कभी हवाई यात्रा की है? अपनी पहली उड़ान या वह उड़ान बताइए जो आप लेना चाहते हैं।',
        examples: [
          {
            en: 'My first flight was from my city to the capital last winter.',
            native: 'मेरी पहली उड़ान पिछली सर्दियों में मेरे शहर से राजधानी तक थी।',
          },
          {
            en: 'I felt excited when the plane lifted off the ground.',
            native: 'जब हवाई जहाज़ ज़मीन से उठा, तो मुझे बहुत उत्साह महसूस हुआ।',
          },
          {
            en: 'Flying is faster than any other transport, but airports are stressful.',
            native: 'उड़ान किसी भी दूसरे परिवहन से तेज़ है, लेकिन हवाई अड्डे तनावपूर्ण होते हैं।',
          },
        ],
      },
      es: {
        word: 'avión',
        question: '¿Has volado alguna vez en avión? Describe tu primer vuelo o uno que te gustaría hacer.',
        examples: [
          {
            en: 'My first flight was from my city to the capital last winter.',
            native: 'Mi primer vuelo fue de mi ciudad a la capital el invierno pasado.',
          },
          {
            en: 'I felt excited when the plane lifted off the ground.',
            native: 'Me sentí emocionado cuando el avión despegó del suelo.',
          },
          {
            en: 'Flying is faster than any other transport, but airports are stressful.',
            native: 'Volar es más rápido que cualquier otro transporte, pero los aeropuertos son estresantes.',
          },
        ],
      },
      zh: {
        word: '飞机',
        question: '你坐过飞机吗？描述你的第一次飞行或你想乘坐的一次飞行。',
        examples: [
          {
            en: 'My first flight was from my city to the capital last winter.',
            native: '我的第一次飞行是去年冬天从我的城市飞往首都。',
          },
          { en: 'I felt excited when the plane lifted off the ground.', native: '当飞机离开地面时，我感到很兴奋。' },
          {
            en: 'Flying is faster than any other transport, but airports are stressful.',
            native: '飞行比任何其他交通工具都快，但机场让人有压力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'driving',
    questionText: 'Can you drive a car? What are the most important rules for safe driving?',
    translations: {
      te: {
        word: 'డ్రైవింగ్',
        question: 'మీకు కారు డ్రైవ్ చేయడం తెలుసా? సురక్షిత డ్రైవింగ్ కోసం అతి ముఖ్యమైన నియమాలు ఏమిటి?',
        examples: [
          {
            en: 'I learned to drive when I was twenty, with my father as my teacher.',
            native: 'నాకు ఇరవై సంవత్సరాల వయస్సులో, నా నాన్నగారే టీచర్‌గా డ్రైవింగ్ నేర్పించారు.',
          },
          {
            en: 'Safe drivers never use their phones while the car is moving.',
            native: 'కారు కదులుతున్నప్పుడు సురక్షిత డ్రైవర్లు ఎప్పుడూ ఫోన్ వాడరు.',
          },
          {
            en: 'Driving in heavy rain is more dangerous than driving at night.',
            native: 'రాత్రి డ్రైవ్ చేయడం కంటే భారీ వర్షంలో డ్రైవ్ చేయడం ప్రమాదకరం.',
          },
        ],
      },
      hi: {
        word: 'ड्राइविंग',
        question: 'क्या आपको कार चलाना आता है? सुरक्षित ड्राइविंग के सबसे ज़रूरी नियम क्या हैं?',
        examples: [
          {
            en: 'I learned to drive when I was twenty, with my father as my teacher.',
            native: 'मैंने बीस साल की उम्र में गाड़ी चलाना सीखा, और मेरे पिता मेरे शिक्षक थे।',
          },
          {
            en: 'Safe drivers never use their phones while the car is moving.',
            native: 'सुरक्षित ड्राइवर गाड़ी चलाते समय कभी फ़ोन इस्तेमाल नहीं करते।',
          },
          {
            en: 'Driving in heavy rain is more dangerous than driving at night.',
            native: 'रात में गाड़ी चलाने की तुलना में तेज़ बारिश में गाड़ी चलाना ज़्यादा खतरनाक है।',
          },
        ],
      },
      es: {
        word: 'conducir',
        question: '¿Sabes conducir un coche? ¿Cuáles son las normas más importantes para conducir con seguridad?',
        examples: [
          {
            en: 'I learned to drive when I was twenty, with my father as my teacher.',
            native: 'Aprendí a conducir a los veinte años, con mi padre como profesor.',
          },
          {
            en: 'Safe drivers never use their phones while the car is moving.',
            native: 'Los conductores seguros nunca usan el teléfono mientras el coche está en movimiento.',
          },
          {
            en: 'Driving in heavy rain is more dangerous than driving at night.',
            native: 'Conducir bajo lluvia intensa es más peligroso que conducir de noche.',
          },
        ],
      },
      zh: {
        word: '驾驶',
        question: '你会开车吗？安全驾驶最重要的规则是什么？',
        examples: [
          {
            en: 'I learned to drive when I was twenty, with my father as my teacher.',
            native: '我二十岁时学会开车，父亲是我的老师。',
          },
          {
            en: 'Safe drivers never use their phones while the car is moving.',
            native: '安全的司机在车行驶时从不用手机。',
          },
          {
            en: 'Driving in heavy rain is more dangerous than driving at night.',
            native: '在大雨中开车比夜间开车更危险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'traffic',
    questionText: 'How is the traffic in your town or city? What could improve it?',
    translations: {
      te: {
        word: 'ట్రాఫిక్',
        question: 'మీ పట్టణం లేదా నగరంలో ట్రాఫిక్ ఎలా ఉంది? దాన్ని మెరుగుపరచడానికి ఏమి చేయవచ్చు?',
        examples: [
          {
            en: 'The traffic in my city is heavy, especially in the morning.',
            native: 'నా నగరంలో ట్రాఫిక్ భారీగా ఉంటుంది, ముఖ్యంగా ఉదయం.',
          },
          {
            en: 'More buses and bicycle lanes could make the roads less crowded.',
            native: 'ఎక్కువ బస్సులు మరియు సైకిల్ మార్గాలు రోడ్ల రద్దీని తగ్గించవచ్చు.',
          },
          {
            en: 'I leave home early because the traffic gets worse after eight.',
            native: 'ఎనిమిది గంటల తర్వాత ట్రాఫిక్ పెరుగుతుంది కాబట్టి నేను ఇంటి నుండి త్వరగా బయలుదేరుతాను.',
          },
        ],
      },
      hi: {
        word: 'यातायात',
        question: 'आपके शहर या कस्बे में यातायात कैसा है? इसे बेहतर बनाने के लिए क्या किया जा सकता है?',
        examples: [
          {
            en: 'The traffic in my city is heavy, especially in the morning.',
            native: 'मेरे शहर में यातायात भारी है, खासकर सुबह के समय।',
          },
          {
            en: 'More buses and bicycle lanes could make the roads less crowded.',
            native: 'ज़्यादा बसें और साइकिल लेन सड़कों को कम भीड़भाड़ वाली बना सकती हैं।',
          },
          {
            en: 'I leave home early because the traffic gets worse after eight.',
            native: 'मैं घर से जल्दी निकलता हूँ क्योंकि आठ बजे के बाद यातायात बिगड़ जाता है।',
          },
        ],
      },
      es: {
        word: 'tráfico',
        question: '¿Cómo es el tráfico en tu pueblo o ciudad? ¿Qué podría mejorarlo?',
        examples: [
          {
            en: 'The traffic in my city is heavy, especially in the morning.',
            native: 'El tráfico en mi ciudad es pesado, sobre todo por la mañana.',
          },
          {
            en: 'More buses and bicycle lanes could make the roads less crowded.',
            native: 'Más autobuses y carriles para bicicletas podrían descongestionar las calles.',
          },
          {
            en: 'I leave home early because the traffic gets worse after eight.',
            native: 'Salgo de casa temprano porque el tráfico empeora después de las ocho.',
          },
        ],
      },
      zh: {
        word: '交通',
        question: '你所在城镇或城市的交通状况如何？怎样才能改善？',
        examples: [
          {
            en: 'The traffic in my city is heavy, especially in the morning.',
            native: '我所在城市的交通很拥堵，尤其是早上。',
          },
          {
            en: 'More buses and bicycle lanes could make the roads less crowded.',
            native: '更多公交车和自行车道可以缓解道路拥挤。',
          },
          {
            en: 'I leave home early because the traffic gets worse after eight.',
            native: '我提前出门，因为八点以后交通会更糟。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'apartment',
    questionText: 'Do you live in an apartment or a house? What do you like about your home?',
    translations: {
      te: {
        word: 'అపార్ట్‌మెంట్',
        question: 'మీరు అపార్ట్‌మెంట్‌లో నివసిస్తారా లేదా ఇంట్లోనా? మీ ఇంటి గురించి మీకు నచ్చినది ఏమిటి?',
        examples: [
          {
            en: 'I live in a small apartment on the third floor with my family.',
            native: 'నేను నా కుటుంబంతో మూడో అంతస్తులో ఒక చిన్న అపార్ట్‌మెంట్‌లో నివసిస్తాను.',
          },
          {
            en: 'I like my balcony because I grow flowers and drink tea there.',
            native: 'నాకు నా బాల్కనీ ఇష్టం, ఎందుకంటే నేను అక్కడ పూలు పెంచుతాను మరియు టీ తాగుతాను.',
          },
          {
            en: 'Our apartment is smaller than a house, but it is easy to clean.',
            native: 'మా అపార్ట్‌మెంట్ ఇల్లు కంటే చిన్నది, కానీ శుభ్రం చేయడం సులభం.',
          },
        ],
      },
      hi: {
        word: 'फ़्लैट',
        question: 'क्या आप फ़्लैट में रहते हैं या घर में? आपके घर के बारे में आपको क्या पसंद है?',
        examples: [
          {
            en: 'I live in a small apartment on the third floor with my family.',
            native: 'मैं अपने परिवार के साथ तीसरी मंज़िल पर एक छोटे फ़्लैट में रहता हूँ।',
          },
          {
            en: 'I like my balcony because I grow flowers and drink tea there.',
            native: 'मुझे अपनी बालकनी पसंद है क्योंकि मैं वहाँ फूल उगाता हूँ और चाय पीता हूँ।',
          },
          {
            en: 'Our apartment is smaller than a house, but it is easy to clean.',
            native: 'हमारा फ़्लैट घर से छोटा है, लेकिन इसे साफ़ करना आसान है।',
          },
        ],
      },
      es: {
        word: 'apartamento',
        question: '¿Vives en un apartamento o en una casa? ¿Qué te gusta de tu hogar?',
        examples: [
          {
            en: 'I live in a small apartment on the third floor with my family.',
            native: 'Vivo en un apartamento pequeño en el tercer piso con mi familia.',
          },
          {
            en: 'I like my balcony because I grow flowers and drink tea there.',
            native: 'Me gusta mi balcón porque cultivo flores y tomo té allí.',
          },
          {
            en: 'Our apartment is smaller than a house, but it is easy to clean.',
            native: 'Nuestro apartamento es más pequeño que una casa, pero es fácil de limpiar.',
          },
        ],
      },
      zh: {
        word: '公寓',
        question: '你住在公寓还是独栋房子里？你喜欢你家的什么？',
        examples: [
          {
            en: 'I live in a small apartment on the third floor with my family.',
            native: '我和家人住在三楼的一套小公寓里。',
          },
          {
            en: 'I like my balcony because I grow flowers and drink tea there.',
            native: '我喜欢我的阳台，因为我在那里种花、喝茶。',
          },
          {
            en: 'Our apartment is smaller than a house, but it is easy to clean.',
            native: '我们的公寓比独栋房子小，但容易打扫。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'furniture',
    questionText: 'What is your favourite piece of furniture at home? Why is it special to you?',
    translations: {
      te: {
        word: 'ఫర్నిచర్',
        question: 'మీ ఇంట్లో మీకు ఇష్టమైన ఫర్నిచర్ ముక్క ఏది? అది మీకు ఎందుకు ప్రత్యేకం?',
        examples: [
          {
            en: 'My favourite furniture is an old wooden chair from my grandfather.',
            native: 'నా ఇష్టమైన ఫర్నిచర్ నా తాతయ్యదైన ఒక పాత చెక్క కుర్చీ.',
          },
          {
            en: 'I sit in it every evening to read or listen to music.',
            native: 'నేను ప్రతి సాయంత్రం చదవడానికి లేదా సంగీతం వినడానికి అందులో కూర్చుంటాను.',
          },
          {
            en: 'It is not comfortable or modern, but it carries family memories.',
            native: 'అది సౌకర్యంగా లేదా ఆధునికంగా లేదు, కానీ అది కుటుంబ జ్ఞాపకాలను మోస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'फ़र्नीचर',
        question: 'आपके घर का आपका पसंदीदा फ़र्नीचर कौन सा है? यह आपके लिए खास क्यों है?',
        examples: [
          {
            en: 'My favourite furniture is an old wooden chair from my grandfather.',
            native: 'मेरा पसंदीदा फ़र्नीचर मेरे दादाजी की एक पुरानी लकड़ी की कुर्सी है।',
          },
          {
            en: 'I sit in it every evening to read or listen to music.',
            native: 'मैं हर शाम उसमें बैठकर पढ़ता हूँ या संगीत सुनता हूँ।',
          },
          {
            en: 'It is not comfortable or modern, but it carries family memories.',
            native: 'यह न आरामदायक है न आधुनिक, लेकिन इसमें परिवार की यादें बसी हैं।',
          },
        ],
      },
      es: {
        word: 'mueble',
        question: '¿Cuál es tu mueble favorito en casa? ¿Por qué es especial para ti?',
        examples: [
          {
            en: 'My favourite furniture is an old wooden chair from my grandfather.',
            native: 'Mi mueble favorito es una vieja silla de madera de mi abuelo.',
          },
          {
            en: 'I sit in it every evening to read or listen to music.',
            native: 'Me siento en ella cada tarde para leer o escuchar música.',
          },
          {
            en: 'It is not comfortable or modern, but it carries family memories.',
            native: 'No es cómoda ni moderna, pero guarda recuerdos familiares.',
          },
        ],
      },
      zh: {
        word: '家具',
        question: '你家里最喜欢的一件家具是什么？为什么它对你很特别？',
        examples: [
          {
            en: 'My favourite furniture is an old wooden chair from my grandfather.',
            native: '我最喜欢的家具是祖父留下的一把旧木椅。',
          },
          { en: 'I sit in it every evening to read or listen to music.', native: '我每天晚上坐在上面读书或听音乐。' },
          {
            en: 'It is not comfortable or modern, but it carries family memories.',
            native: '它既不舒适也不现代，但它承载着家庭的回忆。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'cleaning',
    questionText: 'How do you share cleaning and housework in your home?',
    translations: {
      te: {
        word: 'శుభ్రం చేయడం',
        question: 'మీ ఇంట్లో శుభ్రం చేయడం మరియు ఇంటి పనులను మీరు ఎలా పంచుకుంటారు?',
        examples: [
          {
            en: 'In my home, everyone cleans their own room every Saturday.',
            native: 'మా ఇంట్లో, ప్రతి ఒక్కరు ప్రతి శనివారం తమ గదిని తామే శుభ్రం చేసుకుంటారు.',
          },
          {
            en: 'I wash the dishes while my brother sweeps the floor.',
            native: 'నా సోదరుడు నేల తుడుస్తుండగా నేను గిన్నెలు కడుగుతాను.',
          },
          {
            en: 'Sharing housework is fairer than leaving it to one person.',
            native: 'ఒక్కరిపై వదిలేయడం కంటే ఇంటి పనులను పంచుకోవడం న్యాయం.',
          },
        ],
      },
      hi: {
        word: 'सफ़ाई',
        question: 'आपके घर में सफ़ाई और घर के काम कैसे बँटे होते हैं?',
        examples: [
          {
            en: 'In my home, everyone cleans their own room every Saturday.',
            native: 'मेरे घर में, हर कोई हर शनिवार अपना कमरा खुद साफ़ करता है।',
          },
          {
            en: 'I wash the dishes while my brother sweeps the floor.',
            native: 'मैं बर्तन धोता हूँ जबकि मेरा भाई फ़र्श झाड़ता है।',
          },
          {
            en: 'Sharing housework is fairer than leaving it to one person.',
            native: 'घर के काम एक ही व्यक्ति पर छोड़ने से बेहतर है उन्हें बाँटना।',
          },
        ],
      },
      es: {
        word: 'limpieza',
        question: '¿Cómo repartís la limpieza y las tareas del hogar en tu casa?',
        examples: [
          {
            en: 'In my home, everyone cleans their own room every Saturday.',
            native: 'En mi casa, cada uno limpia su propia habitación todos los sábados.',
          },
          {
            en: 'I wash the dishes while my brother sweeps the floor.',
            native: 'Yo lavo los platos mientras mi hermano barre el suelo.',
          },
          {
            en: 'Sharing housework is fairer than leaving it to one person.',
            native: 'Repartir las tareas es más justo que dejárselas a una sola persona.',
          },
        ],
      },
      zh: {
        word: '打扫',
        question: '你们在家里如何分担清洁和家务？',
        examples: [
          {
            en: 'In my home, everyone cleans their own room every Saturday.',
            native: '在我家，每个人每周六打扫自己的房间。',
          },
          { en: 'I wash the dishes while my brother sweeps the floor.', native: '我洗碗时，我哥哥扫地。' },
          {
            en: 'Sharing housework is fairer than leaving it to one person.',
            native: '分担家务比把家务都留给一个人更公平。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'washing',
    questionText: 'Do you wash clothes by hand or use a machine? Talk about laundry in your family.',
    translations: {
      te: {
        word: 'బట్టలు తోమడం',
        question: 'మీరు బట్టలు చేత్తో తోముతారా లేదా మెషిన్ వాడతారా? మీ కుటుంబంలో బట్టలు తోమడం గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'We use a washing machine, but I wash my shirts by hand.',
            native: 'మేము వాషింగ్ మెషిన్ వాడుతాము, కానీ నా చొక్కాలను నేను చేత్తో తోముతాను.',
          },
          {
            en: 'My mother taught me to separate dark and light colours.',
            native: 'ముదురు మరియు లేత రంగులను విడదీయమని నా అమ్మ నాకు నేర్పింది.',
          },
          {
            en: 'Clothes dry faster in summer than in the rainy season.',
            native: 'వర్షాకాలం కంటే వేసవిలో బట్టలు త్వరగా ఆరిపోతాయి.',
          },
        ],
      },
      hi: {
        word: 'कपड़े धोना',
        question: 'आप कपड़े हाथ से धोते हैं या मशीन का उपयोग करते हैं? अपने घर में कपड़े धोने के बारे में बताइए।',
        examples: [
          {
            en: 'We use a washing machine, but I wash my shirts by hand.',
            native: 'हम वॉशिंग मशीन का उपयोग करते हैं, लेकिन मैं अपनी कमीज़ें हाथ से धोता हूँ।',
          },
          {
            en: 'My mother taught me to separate dark and light colours.',
            native: 'मेरी माँ ने मुझे गहरे और हलके रंगों को अलग करना सिखाया।',
          },
          {
            en: 'Clothes dry faster in summer than in the rainy season.',
            native: 'बरसात के मौसम की तुलना में गर्मियों में कपड़े जल्दी सूखते हैं।',
          },
        ],
      },
      es: {
        word: 'lavar la ropa',
        question: '¿Lavas la ropa a mano o usas lavadora? Habla de la colada en tu familia.',
        examples: [
          {
            en: 'We use a washing machine, but I wash my shirts by hand.',
            native: 'Usamos lavadora, pero lavo mis camisas a mano.',
          },
          {
            en: 'My mother taught me to separate dark and light colours.',
            native: 'Mi madre me enseñó a separar los colores oscuros de los claros.',
          },
          {
            en: 'Clothes dry faster in summer than in the rainy season.',
            native: 'La ropa se seca más rápido en verano que en la época de lluvias.',
          },
        ],
      },
      zh: {
        word: '洗衣',
        question: '你手洗衣服还是用洗衣机？谈谈你家里的洗衣情况。',
        examples: [
          { en: 'We use a washing machine, but I wash my shirts by hand.', native: '我们用洗衣机，但我手洗我的衬衫。' },
          {
            en: 'My mother taught me to separate dark and light colours.',
            native: '我妈妈教我把深色和浅色衣服分开洗。',
          },
          { en: 'Clothes dry faster in summer than in the rainy season.', native: '夏天衣服比雨季干得快。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'newspaper',
    questionText: 'Do you read newspapers? How do you prefer to get your news?',
    translations: {
      te: {
        word: 'వార్తాపత్రిక',
        question: 'మీరు వార్తాపత్రికలు చదువుతారా? మీరు వార్తలు ఎలా పొందడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'My father reads the newspaper every morning with his tea.',
            native: 'నా నాన్నగారు ప్రతి ఉదయం టీతో పాటు వార్తాపత్రిక చదువుతారు.',
          },
          {
            en: 'I prefer reading news on my phone because it is faster.',
            native: 'అది వేగంగా ఉంటుంది కాబట్టి ఫోన్‌లో వార్తలు చదవడానికి నేను ఇష్టపడతాను.',
          },
          {
            en: 'Newspapers give more details than short videos on the internet.',
            native: 'ఇంటర్నెట్‌లోని చిన్న వీడియోల కంటే వార్తాపత్రికలు ఎక్కువ వివరాలు ఇస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'अख़बार',
        question: 'क्या आप अख़बार पढ़ते हैं? आप समाचार कैसे प्राप्त करना पसंद करते हैं?',
        examples: [
          {
            en: 'My father reads the newspaper every morning with his tea.',
            native: 'मेरे पिता हर सुबह चाय के साथ अख़बार पढ़ते हैं।',
          },
          {
            en: 'I prefer reading news on my phone because it is faster.',
            native: 'मैं फ़ोन पर समाचार पढ़ना पसंद करता हूँ क्योंकि यह तेज़ है।',
          },
          {
            en: 'Newspapers give more details than short videos on the internet.',
            native: 'अख़बार इंटरनेट के छोटे वीडियो से ज़्यादा जानकारी देते हैं।',
          },
        ],
      },
      es: {
        word: 'periódico',
        question: '¿Lees periódicos? ¿Cómo prefieres informarte?',
        examples: [
          {
            en: 'My father reads the newspaper every morning with his tea.',
            native: 'Mi padre lee el periódico cada mañana con su té.',
          },
          {
            en: 'I prefer reading news on my phone because it is faster.',
            native: 'Prefiero leer las noticias en el teléfono porque es más rápido.',
          },
          {
            en: 'Newspapers give more details than short videos on the internet.',
            native: 'Los periódicos dan más detalles que los vídeos cortos de internet.',
          },
        ],
      },
      zh: {
        word: '报纸',
        question: '你读报纸吗？你更喜欢怎样获取新闻？',
        examples: [
          { en: 'My father reads the newspaper every morning with his tea.', native: '我父亲每天早上边喝茶边看报纸。' },
          {
            en: 'I prefer reading news on my phone because it is faster.',
            native: '我更喜欢在手机上看新闻，因为更快。',
          },
          {
            en: 'Newspapers give more details than short videos on the internet.',
            native: '报纸比互联网上的短视频提供更多细节。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'magazine',
    questionText: 'What kind of magazines do you enjoy reading? Are they still popular today?',
    translations: {
      te: {
        word: 'పత్రిక',
        question: 'మీరు ఏ రకమైన పత్రికలు చదవడానికి ఇష్టపడతారు? అవి ఇంకా నేడు ప్రసిద్ధంగా ఉన్నాయా?',
        examples: [
          {
            en: 'I enjoy sports magazines because they have interviews with players.',
            native: 'ఆటగాళ్ల ఇంటర్వ్యూలు ఉంటాయి కాబట్టి నాకు క్రీడా పత్రికలు ఇష్టం.',
          },
          {
            en: 'I used to buy a music magazine every month when I was younger.',
            native: 'నేను చిన్నప్పుడు ప్రతి నెల ఒక సంగీత పత్రిక కొనేవాడిని.',
          },
          {
            en: 'Today most people read magazines online instead of buying paper ones.',
            native: 'నేడు చాలా మంది కాగితం పత్రికలు కొనడం కంటే ఆన్‌లైన్‌లో చదువుతారు.',
          },
        ],
      },
      hi: {
        word: 'पत्रिका',
        question: 'आप किस तरह की पत्रिकाएँ पढ़ना पसंद करते हैं? क्या वे आज भी लोकप्रिय हैं?',
        examples: [
          {
            en: 'I enjoy sports magazines because they have interviews with players.',
            native: 'मुझे खेल पत्रिकाएँ पसंद हैं क्योंकि उनमें खिलाड़ियों के इंटरव्यू होते हैं।',
          },
          {
            en: 'I used to buy a music magazine every month when I was younger.',
            native: 'जब मैं छोटा था, मैं हर महीने एक संगीत पत्रिका खरीदता था।',
          },
          {
            en: 'Today most people read magazines online instead of buying paper ones.',
            native: 'आज ज़्यादातर लोग कागज़ की पत्रिकाएँ खरीदने के बजाय ऑनलाइन पढ़ते हैं।',
          },
        ],
      },
      es: {
        word: 'revista',
        question: '¿Qué tipo de revistas te gusta leer? ¿Siguen siendo populares hoy en día?',
        examples: [
          {
            en: 'I enjoy sports magazines because they have interviews with players.',
            native: 'Me gustan las revistas de deportes porque tienen entrevistas con jugadores.',
          },
          {
            en: 'I used to buy a music magazine every month when I was younger.',
            native: 'Antes compraba una revista de música cada mes cuando era más joven.',
          },
          {
            en: 'Today most people read magazines online instead of buying paper ones.',
            native: 'Hoy la mayoría de la gente lee revistas en línea en lugar de comprarlas en papel.',
          },
        ],
      },
      zh: {
        word: '杂志',
        question: '你喜欢读什么类型的杂志？它们今天还流行吗？',
        examples: [
          {
            en: 'I enjoy sports magazines because they have interviews with players.',
            native: '我喜欢体育杂志，因为里面有运动员访谈。',
          },
          {
            en: 'I used to buy a music magazine every month when I was younger.',
            native: '我年轻时每个月都买一本音乐杂志。',
          },
          {
            en: 'Today most people read magazines online instead of buying paper ones.',
            native: '如今大多数人在线阅读杂志，而不是购买纸质杂志。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'podcast',
    questionText: 'Do you listen to podcasts? What kind of shows would you recommend?',
    translations: {
      te: {
        word: 'పాడ్‌కాస్ట్',
        question: 'మీరు పాడ్‌కాస్ట్‌లు వింటారా? మీరు ఏ రకమైన షోలను సిఫార్సు చేస్తారు?',
        examples: [
          {
            en: 'I listen to podcasts while I walk to work in the morning.',
            native: 'ఉదయం పనికి నడుస్తూ వెళ్లేటప్పుడు నేను పాడ్‌కాస్ట్‌లు వింటాను.',
          },
          {
            en: 'My favourite show teaches English with short, funny stories.',
            native: 'నా ఇష్టమైన షో చిన్న, ఫన్నీ కథలతో ఇంగ్లీష్ నేర్పుతుంది.',
          },
          {
            en: 'Podcasts are better than music when I want to learn something new.',
            native: 'కొత్తది నేర్చుకోవాలనుకున్నప్పుడు పాడ్‌కాస్ట్‌లు సంగీతం కంటే మెరుగైనవి.',
          },
        ],
      },
      hi: {
        word: 'पॉडकास्ट',
        question: 'क्या आप पॉडकास्ट सुनते हैं? आप किस तरह के शो की सिफ़ारिश करेंगे?',
        examples: [
          {
            en: 'I listen to podcasts while I walk to work in the morning.',
            native: 'मैं सुबह काम पर पैदल जाते समय पॉडकास्ट सुनता हूँ।',
          },
          {
            en: 'My favourite show teaches English with short, funny stories.',
            native: 'मेरा पसंदीदा शो छोटी, मज़ेदार कहानियों से अंग्रेज़ी सिखाता है।',
          },
          {
            en: 'Podcasts are better than music when I want to learn something new.',
            native: 'जब मुझे कुछ नया सीखना होता है, तो पॉडकास्ट संगीत से बेहतर होते हैं।',
          },
        ],
      },
      es: {
        word: 'pódcast',
        question: '¿Escuchas pódcasts? ¿Qué tipo de programas recomendarías?',
        examples: [
          {
            en: 'I listen to podcasts while I walk to work in the morning.',
            native: 'Escucho pódcasts mientras camino al trabajo por la mañana.',
          },
          {
            en: 'My favourite show teaches English with short, funny stories.',
            native: 'Mi programa favorito enseña inglés con historias cortas y divertidas.',
          },
          {
            en: 'Podcasts are better than music when I want to learn something new.',
            native: 'Los pódcasts son mejores que la música cuando quiero aprender algo nuevo.',
          },
        ],
      },
      zh: {
        word: '播客',
        question: '你听播客吗？你会推荐什么类型的节目？',
        examples: [
          { en: 'I listen to podcasts while I walk to work in the morning.', native: '我早上走路去上班时听播客。' },
          {
            en: 'My favourite show teaches English with short, funny stories.',
            native: '我最喜欢的节目用简短有趣的故事教英语。',
          },
          {
            en: 'Podcasts are better than music when I want to learn something new.',
            native: '当我想学新东西时，播客比音乐更好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'radio',
    questionText: 'Do you still listen to the radio? Who listens to it in your family?',
    translations: {
      te: {
        word: 'రేడియో',
        question: 'మీరు ఇంకా రేడియో వింటారా? మీ కుటుంబంలో ఎవరు వింటారు?',
        examples: [
          {
            en: 'My grandfather listens to the radio every evening after dinner.',
            native: 'నా తాతయ్య ప్రతి సాయంత్రం భోజనం తర్వాత రేడియో వింటారు.',
          },
          {
            en: 'I sometimes listen to the radio in the car because it is easy.',
            native: 'అది సులభం కాబట్టి నేను కొన్నిసార్లు కారులో రేడియో వింటాను.',
          },
          {
            en: 'Radio is old technology, but it still reaches remote villages.',
            native: 'రేడియో పాత సాంకేతికత, కానీ అది ఇంకా మారుమూల గ్రామాలను చేరుతుంది.',
          },
        ],
      },
      hi: {
        word: 'रेडियो',
        question: 'क्या आप अब भी रेडियो सुनते हैं? आपके परिवार में कौन इसे सुनता है?',
        examples: [
          {
            en: 'My grandfather listens to the radio every evening after dinner.',
            native: 'मेरे दादाजी हर शाम खाने के बाद रेडियो सुनते हैं।',
          },
          {
            en: 'I sometimes listen to the radio in the car because it is easy.',
            native: 'मैं कभी-कभी कार में रेडियो सुनता हूँ क्योंकि यह आसान है।',
          },
          {
            en: 'Radio is old technology, but it still reaches remote villages.',
            native: 'रेडियो पुरानी तकनीक है, लेकिन यह अब भी दूर-दराज़ के गाँवों तक पहुँचता है।',
          },
        ],
      },
      es: {
        word: 'radio',
        question: '¿Todavía escuchas la radio? ¿Quién la escucha en tu familia?',
        examples: [
          {
            en: 'My grandfather listens to the radio every evening after dinner.',
            native: 'Mi abuelo escucha la radio cada noche después de cenar.',
          },
          {
            en: 'I sometimes listen to the radio in the car because it is easy.',
            native: 'A veces escucho la radio en el coche porque es fácil.',
          },
          {
            en: 'Radio is old technology, but it still reaches remote villages.',
            native: 'La radio es tecnología antigua, pero todavía llega a pueblos remotos.',
          },
        ],
      },
      zh: {
        word: '广播',
        question: '你还听广播吗？你家里谁听广播？',
        examples: [
          { en: 'My grandfather listens to the radio every evening after dinner.', native: '我祖父每天晚饭后听广播。' },
          {
            en: 'I sometimes listen to the radio in the car because it is easy.',
            native: '我有时在车里听广播，因为很方便。',
          },
          {
            en: 'Radio is old technology, but it still reaches remote villages.',
            native: '广播是老技术，但它仍然能传到偏远的村庄。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'concert',
    questionText: 'Have you ever been to a live concert? Describe the atmosphere.',
    translations: {
      te: {
        word: 'కచేరీ',
        question: 'మీరు ఎప్పుడైనా ప్రత్యక్ష కచేరీకి వెళ్లారా? అక్కడి వాతావరణాన్ని వివరించండి.',
        examples: [
          {
            en: 'I went to a concert last year with three of my friends.',
            native: 'గత సంవత్సరం నేను నా ముగ్గురు స్నేహితులతో ఒక కచేరీకి వెళ్లాను.',
          },
          {
            en: 'The crowd sang every song, and the lights were amazing.',
            native: 'జనం ప్రతి పాట పాడారు, లైట్లు అద్భుతంగా ఉన్నాయి.',
          },
          {
            en: 'Live music sounds louder and more emotional than recordings.',
            native: 'ప్రత్యక్ష సంగీతం రికార్డింగ్‌ల కంటే గట్టిగా మరియు భావోద్వేగంగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'संगीत कार्यक्रम',
        question: 'क्या आप कभी किसी लाइव कॉन्सर्ट में गए हैं? वहाँ के माहौल का वर्णन कीजिए।',
        examples: [
          {
            en: 'I went to a concert last year with three of my friends.',
            native: 'पिछले साल मैं अपने तीन दोस्तों के साथ एक कॉन्सर्ट में गया था।',
          },
          {
            en: 'The crowd sang every song, and the lights were amazing.',
            native: 'भीड़ हर गाना गा रही थी, और लाइटें अद्भुत थीं।',
          },
          {
            en: 'Live music sounds louder and more emotional than recordings.',
            native: 'लाइव संगीत रिकॉर्डिंग से ज़्यादा ऊँचा और भावुक लगता है।',
          },
        ],
      },
      es: {
        word: 'concierto',
        question: '¿Has ido alguna vez a un concierto en directo? Describe el ambiente.',
        examples: [
          {
            en: 'I went to a concert last year with three of my friends.',
            native: 'Fui a un concierto el año pasado con tres de mis amigos.',
          },
          {
            en: 'The crowd sang every song, and the lights were amazing.',
            native: 'La multitud cantaba cada canción y las luces eran increíbles.',
          },
          {
            en: 'Live music sounds louder and more emotional than recordings.',
            native: 'La música en directo suena más fuerte y más emocionante que las grabaciones.',
          },
        ],
      },
      zh: {
        word: '音乐会',
        question: '你去过现场音乐会吗？描述一下那里的气氛。',
        examples: [
          {
            en: 'I went to a concert last year with three of my friends.',
            native: '去年我和三个朋友去听了一场音乐会。',
          },
          { en: 'The crowd sang every song, and the lights were amazing.', native: '观众唱着每一首歌，灯光非常震撼。' },
          {
            en: 'Live music sounds louder and more emotional than recordings.',
            native: '现场音乐比录音更响亮、更有感染力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'theater',
    questionText: 'Have you ever watched a play at a theater? How is it different from watching a film?',
    translations: {
      te: {
        word: 'నాటకశాల',
        question: 'మీరు ఎప్పుడైనా థియేటర్‌లో నాటకం చూశారా? అది సినిమా చూడటం నుండి ఎలా భిన్నం?',
        examples: [
          {
            en: 'I watched a comedy play at the city theater with my parents.',
            native: 'నేను నా తల్లిదండ్రులతో సిటీ థియేటర్‌లో ఒక హాస్య నాటకం చూశాను.',
          },
          {
            en: 'The actors were just a few metres away from us.',
            native: 'నటులు మాకు కేవలం కొద్ది మీటర్ల దూరంలో ఉన్నారు.',
          },
          {
            en: 'Theater feels more alive because anything can happen on stage.',
            native: 'వేదికపై ఏమైనా జరగవచ్చు కాబట్టి థియేటర్ మరింత జీవంగా అనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'रंगमंच',
        question: 'क्या आपने कभी थिएटर में कोई नाटक देखा है? यह फ़िल्म देखने से कैसे अलग है?',
        examples: [
          {
            en: 'I watched a comedy play at the city theater with my parents.',
            native: 'मैंने अपने माता-पिता के साथ शहर के थिएटर में एक कॉमेडी नाटक देखा।',
          },
          {
            en: 'The actors were just a few metres away from us.',
            native: 'कलाकार हमसे बस कुछ ही मीटर की दूरी पर थे।',
          },
          {
            en: 'Theater feels more alive because anything can happen on stage.',
            native: 'थिएटर ज़्यादा जीवंत लगता है क्योंकि मंच पर कुछ भी हो सकता है।',
          },
        ],
      },
      es: {
        word: 'teatro',
        question: '¿Has visto alguna vez una obra de teatro? ¿En qué se diferencia de ver una película?',
        examples: [
          {
            en: 'I watched a comedy play at the city theater with my parents.',
            native: 'Vi una obra de comedia en el teatro de la ciudad con mis padres.',
          },
          {
            en: 'The actors were just a few metres away from us.',
            native: 'Los actores estaban a solo unos metros de nosotros.',
          },
          {
            en: 'Theater feels more alive because anything can happen on stage.',
            native: 'El teatro se siente más vivo porque cualquier cosa puede pasar en el escenario.',
          },
        ],
      },
      zh: {
        word: '剧院',
        question: '你在剧院看过戏剧吗？它和看电影有什么不同？',
        examples: [
          {
            en: 'I watched a comedy play at the city theater with my parents.',
            native: '我和父母在市剧院看了一场喜剧。',
          },
          { en: 'The actors were just a few metres away from us.', native: '演员们离我们只有几米远。' },
          {
            en: 'Theater feels more alive because anything can happen on stage.',
            native: '剧院感觉更有生命力，因为舞台上什么都可能发生。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'comedy',
    questionText: 'Do you like watching comedy shows? What makes you laugh?',
    translations: {
      te: {
        word: 'హాస్యం',
        question: 'మీకు హాస్య షోలు చూడటం ఇష్టమా? మిమ్మల్ని ఏమి నవ్విస్తుంది?',
        examples: [
          {
            en: 'I watch a comedy show every Friday to relax after work.',
            native: 'పని తర్వాత రిలాక్స్ అవ్వడానికి నేను ప్రతి శుక్రవారం ఒక హాస్య షో చూస్తాను.',
          },
          {
            en: 'Silly jokes about daily life make me laugh the most.',
            native: 'దైనందిన జీవితం గురించిన వెర్రి జోక్‌లు నన్ను అత్యధికంగా నవ్విస్తాయి.',
          },
          {
            en: 'Laughing with friends is better than laughing alone at a screen.',
            native: 'స్క్రీన్ ముందు ఒంటరిగా నవ్వడం కంటే స్నేహితులతో నవ్వడం మేలు.',
          },
        ],
      },
      hi: {
        word: 'हास्य',
        question: 'क्या आपको कॉमेडी शो देखना पसंद है? किस बात पर आप हँसते हैं?',
        examples: [
          {
            en: 'I watch a comedy show every Friday to relax after work.',
            native: 'काम के बाद आराम करने के लिए मैं हर शुक्रवार एक कॉमेडी शो देखता हूँ।',
          },
          {
            en: 'Silly jokes about daily life make me laugh the most.',
            native: 'रोज़मर्रा की ज़िंदगी पर बने मज़ाकिया चुटकुले मुझे सबसे ज़्यादा हँसाते हैं।',
          },
          {
            en: 'Laughing with friends is better than laughing alone at a screen.',
            native: 'स्क्रीन पर अकेले हँसने से बेहतर है दोस्तों के साथ हँसना।',
          },
        ],
      },
      es: {
        word: 'comedia',
        question: '¿Te gusta ver programas de comedia? ¿Qué te hace reír?',
        examples: [
          {
            en: 'I watch a comedy show every Friday to relax after work.',
            native: 'Veo un programa de comedia cada viernes para relajarme después del trabajo.',
          },
          {
            en: 'Silly jokes about daily life make me laugh the most.',
            native: 'Los chistes tontos sobre la vida diaria son los que más me hacen reír.',
          },
          {
            en: 'Laughing with friends is better than laughing alone at a screen.',
            native: 'Reír con amigos es mejor que reír solo frente a una pantalla.',
          },
        ],
      },
      zh: {
        word: '喜剧',
        question: '你喜欢看喜剧节目吗？什么会让你发笑？',
        examples: [
          {
            en: 'I watch a comedy show every Friday to relax after work.',
            native: '我每周五看一个喜剧节目，下班后放松一下。',
          },
          { en: 'Silly jokes about daily life make me laugh the most.', native: '关于日常生活的傻笑话最能让我发笑。' },
          {
            en: 'Laughing with friends is better than laughing alone at a screen.',
            native: '和朋友一起笑比独自对着屏幕笑更好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'adventure',
    questionText: 'What is the most adventurous thing you have ever done? Would you do it again?',
    translations: {
      te: {
        word: 'సాహసం',
        question: 'మీరు ఇప్పటివరకు చేసిన అత్యంత సాహసోపేతమైన పని ఏమిటి? మళ్లీ చేస్తారా?',
        examples: [
          {
            en: 'The most adventurous thing I have done is river rafting with friends.',
            native: 'నేను ఇప్పటివరకు చేసిన అత్యంత సాహసోపేతమైన పని స్నేహితులతో రివర్ రాఫ్టింగ్.',
          },
          {
            en: 'I was scared at first, but the guide made us feel safe.',
            native: 'మొదట నాకు భయమేసింది, కానీ గైడ్ మమ్మల్ని భద్రంగా అనిపించేలా చేశాడు.',
          },
          {
            en: 'I would do it again because adventure makes life exciting.',
            native: 'సాహసం జీవితాన్ని ఉత్సాహంగా మారుస్తుంది కాబట్టి నేను మళ్లీ చేస్తాను.',
          },
        ],
      },
      hi: {
        word: 'रोमांच',
        question: 'आपने अब तक की सबसे रोमांचक चीज़ क्या की है? क्या आप इसे फिर से करेंगे?',
        examples: [
          {
            en: 'The most adventurous thing I have done is river rafting with friends.',
            native: 'मैंने अब तक की सबसे रोमांचक चीज़ दोस्तों के साथ रिवर राफ्टिंग की है।',
          },
          {
            en: 'I was scared at first, but the guide made us feel safe.',
            native: 'शुरू में मुझे डर लगा, लेकिन गाइड ने हमें सुरक्षित महसूस कराया।',
          },
          {
            en: 'I would do it again because adventure makes life exciting.',
            native: 'मैं इसे फिर से करूँगा क्योंकि रोमांच ज़िंदगी को दिलचस्प बनाता है।',
          },
        ],
      },
      es: {
        word: 'aventura',
        question: '¿Qué es lo más aventurero que has hecho nunca? ¿Lo harías de nuevo?',
        examples: [
          {
            en: 'The most adventurous thing I have done is river rafting with friends.',
            native: 'Lo más aventurero que he hecho es rafting en el río con amigos.',
          },
          {
            en: 'I was scared at first, but the guide made us feel safe.',
            native: 'Al principio tenía miedo, pero el guía nos hizo sentir seguros.',
          },
          {
            en: 'I would do it again because adventure makes life exciting.',
            native: 'Lo haría de nuevo porque la aventura hace la vida emocionante.',
          },
        ],
      },
      zh: {
        word: '冒险',
        question: '你做过最冒险的事情是什么？你还会再做一次吗？',
        examples: [
          {
            en: 'The most adventurous thing I have done is river rafting with friends.',
            native: '我做过最冒险的事是和朋友一起漂流。',
          },
          {
            en: 'I was scared at first, but the guide made us feel safe.',
            native: '一开始我很害怕，但向导让我们感到安全。',
          },
          {
            en: 'I would do it again because adventure makes life exciting.',
            native: '我会再做一次，因为冒险让生活充满激情。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'courage',
    questionText: 'Talk about a time when you needed courage. What did you do?',
    translations: {
      te: {
        word: 'ధైర్యం',
        question: 'మీకు ధైర్యం అవసరమైన ఒక సందర్భం గురించి మాట్లాడండి. మీరు ఏమి చేశారు?',
        examples: [
          {
            en: 'I needed courage when I gave my first speech in English.',
            native: 'నేను ఇంగ్లీషులో నా మొదటి ప్రసంగం ఇచ్చినప్పుడు నాకు ధైర్యం అవసరమైంది.',
          },
          {
            en: 'My hands were shaking, but I took a deep breath and continued.',
            native: 'నా చేతులు వణుకుతున్నాయి, కానీ నేను లోతుగా ఊపిరి పీల్చుకుని కొనసాగించాను.',
          },
          {
            en: 'After that day, speaking in public became less frightening for me.',
            native: 'ఆ రోజు తర్వాత, బహిరంగంగా మాట్లాడటం నాకు తక్కువ భయంకరంగా మారింది.',
          },
        ],
      },
      hi: {
        word: 'साहस',
        question: 'किसी ऐसे समय के बारे में बताइए जब आपको साहस की ज़रूरत पड़ी। आपने क्या किया?',
        examples: [
          {
            en: 'I needed courage when I gave my first speech in English.',
            native: 'जब मैंने अंग्रेज़ी में अपना पहला भाषण दिया, तब मुझे साहस की ज़रूरत पड़ी।',
          },
          {
            en: 'My hands were shaking, but I took a deep breath and continued.',
            native: 'मेरे हाथ काँप रहे थे, लेकिन मैंने गहरी साँस ली और बोलता रहा।',
          },
          {
            en: 'After that day, speaking in public became less frightening for me.',
            native: 'उस दिन के बाद, लोगों के सामने बोलना मेरे लिए कम डरावना हो गया।',
          },
        ],
      },
      es: {
        word: 'valentía',
        question: 'Habla de un momento en el que necesitaste valentía. ¿Qué hiciste?',
        examples: [
          {
            en: 'I needed courage when I gave my first speech in English.',
            native: 'Necesité valentía cuando di mi primer discurso en inglés.',
          },
          {
            en: 'My hands were shaking, but I took a deep breath and continued.',
            native: 'Me temblaban las manos, pero respiré hondo y continué.',
          },
          {
            en: 'After that day, speaking in public became less frightening for me.',
            native: 'Después de ese día, hablar en público me dio menos miedo.',
          },
        ],
      },
      zh: {
        word: '勇气',
        question: '谈谈你需要勇气的一次经历。你做了什么？',
        examples: [
          {
            en: 'I needed courage when I gave my first speech in English.',
            native: '当我第一次用英语演讲时，我需要勇气。',
          },
          {
            en: 'My hands were shaking, but I took a deep breath and continued.',
            native: '我的手在发抖，但我深吸一口气继续讲了下去。',
          },
          {
            en: 'After that day, speaking in public became less frightening for me.',
            native: '从那天起，公开演讲对我来说不再那么可怕了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'mistake',
    questionText: 'Describe a mistake you made and what you learned from it.',
    translations: {
      te: {
        word: 'పొరపాటు',
        question: 'మీరు చేసిన ఒక పొరపాటును మరియు దాని నుండి మీరు నేర్చుకున్నదాన్ని వివరించండి.',
        examples: [
          {
            en: 'I once missed an important bus because I left home late.',
            native: 'నేను ఇంటి నుండి ఆలస్యంగా బయలుదేరడం వల్ల ఒకసారి ముఖ్యమైన బస్సు మిస్ అయ్యాను.',
          },
          {
            en: 'From that mistake, I learned to prepare everything the night before.',
            native: 'ఆ పొరపాటు నుండి, ముందు రోజు రాత్రే ప్రతిదీ సిద్ధం చేసుకోవడం నేర్చుకున్నాను.',
          },
          {
            en: 'Mistakes are painful, but they teach us better than success does.',
            native: 'పొరపాట్లు బాధ కలిపిస్తాయి, కానీ అవి విజయం కంటే మనకు బాగా నేర్పుతాయి.',
          },
        ],
      },
      hi: {
        word: 'ग़लती',
        question: 'अपनी किसी ग़लती का वर्णन कीजिए और बताइए कि आपने उससे क्या सीखा।',
        examples: [
          {
            en: 'I once missed an important bus because I left home late.',
            native: 'एक बार मैं घर से देर से निकलने की वजह से एक ज़रूरी बस छोड़ बैठा।',
          },
          {
            en: 'From that mistake, I learned to prepare everything the night before.',
            native: 'उस ग़लती से मैंने सीखा कि हर चीज़ रात को ही तैयार कर लेनी चाहिए।',
          },
          {
            en: 'Mistakes are painful, but they teach us better than success does.',
            native: 'ग़लतियाँ दर्दनाक होती हैं, लेकिन वे सफलता से बेहतर सिखाती हैं।',
          },
        ],
      },
      es: {
        word: 'error',
        question: 'Describe un error que cometiste y lo que aprendiste de él.',
        examples: [
          {
            en: 'I once missed an important bus because I left home late.',
            native: 'Una vez perdí un autobús importante porque salí tarde de casa.',
          },
          {
            en: 'From that mistake, I learned to prepare everything the night before.',
            native: 'De ese error aprendí a prepararlo todo la noche anterior.',
          },
          {
            en: 'Mistakes are painful, but they teach us better than success does.',
            native: 'Los errores duelen, pero nos enseñan mejor que los éxitos.',
          },
        ],
      },
      zh: {
        word: '错误',
        question: '描述你犯过的一个错误以及你从中学到了什么。',
        examples: [
          {
            en: 'I once missed an important bus because I left home late.',
            native: '有一次我因为出门晚而错过了一班重要的公交车。',
          },
          {
            en: 'From that mistake, I learned to prepare everything the night before.',
            native: '从那次错误中，我学会了在前一天晚上准备好一切。',
          },
          {
            en: 'Mistakes are painful, but they teach us better than success does.',
            native: '错误是痛苦的，但它们比成功更能教会我们。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'advice',
    questionText: 'What is the best advice you have ever received? Who gave it to you?',
    translations: {
      te: {
        word: 'సలహా',
        question: 'మీరు ఇప్పటివరకు పొందిన అత్యుత్తమ సలహా ఏమిటి? ఎవరు మీకు ఇచ్చారు?',
        examples: [
          {
            en: 'The best advice I received was from my mother before my exams.',
            native: 'నేను పొందిన అత్యుత్తమ సలహా నా పరీక్షల ముందు నా అమ్మ ఇచ్చినది.',
          },
          {
            en: 'She told me to do my best and not compare myself with others.',
            native: 'నా వంతు కృషి చేయమని, ఇతరులతో పోల్చుకోవద్దని ఆమె నాకు చెప్పింది.',
          },
          {
            en: 'Her words help me whenever I feel nervous about results.',
            native: 'ఫలితాల గురించి నాకు టెన్షన్‌గా అనిపించినప్పుడల్లా ఆమె మాటలు నాకు సహాయపడతాయి.',
          },
        ],
      },
      hi: {
        word: 'सलाह',
        question: 'आपको अब तक मिली सबसे अच्छी सलाह क्या है? किसने दी थी?',
        examples: [
          {
            en: 'The best advice I received was from my mother before my exams.',
            native: 'मुझे मिली सबसे अच्छी सलाह मेरी परीक्षाओं से पहले मेरी माँ ने दी थी।',
          },
          {
            en: 'She told me to do my best and not compare myself with others.',
            native: 'उन्होंने मुझसे कहा कि मैं अपना सर्वश्रेष्ठ करूँ और खुद की तुलना दूसरों से न करूँ।',
          },
          {
            en: 'Her words help me whenever I feel nervous about results.',
            native: 'जब भी परिणामों को लेकर मैं घबराता हूँ, उनके शब्द मेरी मदद करते हैं।',
          },
        ],
      },
      es: {
        word: 'consejo',
        question: '¿Cuál es el mejor consejo que has recibido? ¿Quién te lo dio?',
        examples: [
          {
            en: 'The best advice I received was from my mother before my exams.',
            native: 'El mejor consejo que recibí fue de mi madre antes de mis exámenes.',
          },
          {
            en: 'She told me to do my best and not compare myself with others.',
            native: 'Me dijo que hiciera lo mejor posible y que no me comparara con los demás.',
          },
          {
            en: 'Her words help me whenever I feel nervous about results.',
            native: 'Sus palabras me ayudan siempre que me pongo nervioso por los resultados.',
          },
        ],
      },
      zh: {
        word: '建议',
        question: '你收到过最好的建议是什么？是谁给你的？',
        examples: [
          {
            en: 'The best advice I received was from my mother before my exams.',
            native: '我收到过最好的建议是考试前妈妈给我的。',
          },
          {
            en: 'She told me to do my best and not compare myself with others.',
            native: '她告诉我尽自己最大的努力，不要和别人比较。',
          },
          {
            en: 'Her words help me whenever I feel nervous about results.',
            native: '每当我对成绩感到紧张时，她的话都能帮助我。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'promise',
    questionText: 'Is it important to keep promises? Tell about a promise you have kept.',
    translations: {
      te: {
        word: 'వాగ్దానం',
        question: 'వాగ్దానాలు నిలబెట్టుకోవడం ముఖ్యమా? మీరు నిలబెట్టుకున్న ఒక వాగ్దానం గురించి చెప్పండి.',
        examples: [
          {
            en: 'Keeping promises is important because people trust you more.',
            native: 'ప్రజలు మిమ్మల్ని ఎక్కువగా నమ్ముతారు కాబట్టి వాగ్దానాలు నిలబెట్టుకోవడం ముఖ్యం.',
          },
          {
            en: 'I promised to teach my little sister English, and I did it.',
            native: 'నా చిన్న చెల్లెలికి ఇంగ్లీష్ నేర్పుతానని వాగ్దానం చేశాను, చేశాను కూడా.',
          },
          {
            en: 'Breaking a promise is easier than keeping one, but it hurts trust.',
            native: 'వాగ్దానం నిలబెట్టుకోవడం కంటే విరమించుకోవడం సులభం, కానీ అది నమ్మకాన్ని దెబ్బతీస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'वादा',
        question: 'क्या वादे निभाना ज़रूरी है? अपने निभाए किसी वादे के बारे में बताइए।',
        examples: [
          {
            en: 'Keeping promises is important because people trust you more.',
            native: 'वादे निभाना ज़रूरी है क्योंकि इससे लोग आप पर ज़्यादा भरोसा करते हैं।',
          },
          {
            en: 'I promised to teach my little sister English, and I did it.',
            native: 'मैंने अपनी छोटी बहन को अंग्रेज़ी सिखाने का वादा किया था, और मैंने किया भी।',
          },
          {
            en: 'Breaking a promise is easier than keeping one, but it hurts trust.',
            native: 'वादा तोड़ना निभाने से आसान है, लेकिन इससे भरोसा टूटता है।',
          },
        ],
      },
      es: {
        word: 'promesa',
        question: '¿Es importante cumplir las promesas? Cuenta una promesa que hayas cumplido.',
        examples: [
          {
            en: 'Keeping promises is important because people trust you more.',
            native: 'Cumplir las promesas es importante porque la gente confía más en ti.',
          },
          {
            en: 'I promised to teach my little sister English, and I did it.',
            native: 'Prometí enseñar inglés a mi hermana pequeña y lo hice.',
          },
          {
            en: 'Breaking a promise is easier than keeping one, but it hurts trust.',
            native: 'Romper una promesa es más fácil que cumplirla, pero daña la confianza.',
          },
        ],
      },
      zh: {
        word: '承诺',
        question: '信守承诺重要吗？讲讲你信守过的一个承诺。',
        examples: [
          {
            en: 'Keeping promises is important because people trust you more.',
            native: '信守承诺很重要，因为人们会更信任你。',
          },
          {
            en: 'I promised to teach my little sister English, and I did it.',
            native: '我答应教我妹妹英语，而且我做到了。',
          },
          {
            en: 'Breaking a promise is easier than keeping one, but it hurts trust.',
            native: '违背承诺比信守承诺容易，但它会伤害信任。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'surprise',
    questionText: 'Do you like surprises? Describe a surprise you have given or received.',
    translations: {
      te: {
        word: 'ఆశ్చర్యం',
        question: 'మీకు సర్‌ప్రైజ్‌లు ఇష్టమా? మీరు ఇచ్చిన లేదా అందుకున్న ఒక సర్‌ప్రైజ్‌ను వివరించండి.',
        examples: [
          {
            en: 'I love surprises because they show that someone cares about you.',
            native: 'ఎవరైనా మిమ్మల్ని పట్టించుకుంటున్నారని చూపిస్తాయి కాబట్టి సర్‌ప్రైజ్‌లు నాకు చాలా ఇష్టం.',
          },
          {
            en: 'My friends surprised me with a cake on my birthday last year.',
            native: 'గత సంవత్సరం నా పుట్టినరోజున నా స్నేహితులు కేకుతో నాకు సర్‌ప్రైజ్ ఇచ్చారు.',
          },
          {
            en: 'I was so happy that I almost cried in front of everyone.',
            native: 'నేను చాలా సంతోషపడి అందరి ముందు దాదాపు ఏడ్చేశాను.',
          },
        ],
      },
      hi: {
        word: 'सरप्राइज़',
        question: 'क्या आपको सरप्राइज़ पसंद हैं? अपने दिए या पाए किसी सरप्राइज़ का वर्णन कीजिए।',
        examples: [
          {
            en: 'I love surprises because they show that someone cares about you.',
            native: 'मुझे सरप्राइज़ बहुत पसंद हैं क्योंकि वे दिखाते हैं कि कोई आपकी परवाह करता है।',
          },
          {
            en: 'My friends surprised me with a cake on my birthday last year.',
            native: 'पिछले साल मेरे जन्मदिन पर मेरे दोस्तों ने केक लाकर मुझे सरप्राइज़ दिया।',
          },
          {
            en: 'I was so happy that I almost cried in front of everyone.',
            native: 'मैं इतना खुश हुआ कि सबके सामने मेरी आँखें भर आईं।',
          },
        ],
      },
      es: {
        word: 'sorpresa',
        question: '¿Te gustan las sorpresas? Describe una sorpresa que hayas dado o recibido.',
        examples: [
          {
            en: 'I love surprises because they show that someone cares about you.',
            native: 'Me encantan las sorpresas porque demuestran que alguien se preocupa por ti.',
          },
          {
            en: 'My friends surprised me with a cake on my birthday last year.',
            native: 'Mis amigos me sorprendieron con un pastel en mi cumpleaños el año pasado.',
          },
          {
            en: 'I was so happy that I almost cried in front of everyone.',
            native: 'Estaba tan feliz que casi lloro delante de todos.',
          },
        ],
      },
      zh: {
        word: '惊喜',
        question: '你喜欢惊喜吗？描述一个你送出或收到的惊喜。',
        examples: [
          {
            en: 'I love surprises because they show that someone cares about you.',
            native: '我喜欢惊喜，因为它们表明有人关心你。',
          },
          {
            en: 'My friends surprised me with a cake on my birthday last year.',
            native: '去年我生日时，朋友们用蛋糕给了我一个惊喜。',
          },
          {
            en: 'I was so happy that I almost cried in front of everyone.',
            native: '我高兴得差点当着大家的面哭出来。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'party',
    questionText: 'Do you enjoy parties? Describe a party you have been to.',
    translations: {
      te: {
        word: 'వేడుక',
        question: 'మీకు పార్టీలు ఇష్టమా? మీరు వెళ్లిన ఒక పార్టీని వివరించండి.',
        examples: [
          {
            en: 'I enjoy small parties more than big, crowded ones.',
            native: 'పెద్ద, రద్దీగా ఉండే పార్టీల కంటే చిన్న పార్టీలు నాకు ఎక్కువ ఇష్టం.',
          },
          {
            en: 'Last month, I went to a goodbye party for a colleague.',
            native: 'గత నెల, నేను ఒక సహోద్యోగి కోసం వీడ్కోలు పార్టీకి వెళ్లాను.',
          },
          {
            en: 'We played games, sang songs, and talked until midnight.',
            native: 'మేము ఆటలు ఆడాము, పాటలు పాడాము, అర్ధరాత్రి వరకు మాట్లాడుకున్నాము.',
          },
        ],
      },
      hi: {
        word: 'पार्टी',
        question: 'क्या आपको पार्टियाँ पसंद हैं? किसी ऐसी पार्टी का वर्णन कीजिए जिसमें आप गए हों।',
        examples: [
          {
            en: 'I enjoy small parties more than big, crowded ones.',
            native: 'मुझे बड़ी, भीड़भाड़ वाली पार्टियों से ज़्यादा छोटी पार्टियाँ पसंद हैं।',
          },
          {
            en: 'Last month, I went to a goodbye party for a colleague.',
            native: 'पिछले महीने, मैं एक सहकर्मी की विदाई पार्टी में गया था।',
          },
          {
            en: 'We played games, sang songs, and talked until midnight.',
            native: 'हमने खेल खेले, गाने गाए और आधी रात तक बातें कीं।',
          },
        ],
      },
      es: {
        word: 'fiesta',
        question: '¿Te gustan las fiestas? Describe una fiesta a la que hayas ido.',
        examples: [
          {
            en: 'I enjoy small parties more than big, crowded ones.',
            native: 'Disfruto más de las fiestas pequeñas que de las grandes y llenas.',
          },
          {
            en: 'Last month, I went to a goodbye party for a colleague.',
            native: 'El mes pasado fui a una fiesta de despedida de un colega.',
          },
          {
            en: 'We played games, sang songs, and talked until midnight.',
            native: 'Jugamos, cantamos canciones y hablamos hasta medianoche.',
          },
        ],
      },
      zh: {
        word: '聚会',
        question: '你喜欢聚会吗？描述一次你参加过的聚会。',
        examples: [
          {
            en: 'I enjoy small parties more than big, crowded ones.',
            native: '比起大型拥挤的聚会，我更喜欢小型聚会。',
          },
          {
            en: 'Last month, I went to a goodbye party for a colleague.',
            native: '上个月，我参加了一位同事的欢送会。',
          },
          { en: 'We played games, sang songs, and talked until midnight.', native: '我们玩游戏、唱歌，聊天聊到午夜。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'conversation',
    questionText: 'What topics do you enjoy talking about? Who is your favourite person to talk with?',
    translations: {
      te: {
        word: 'సంభాషణ',
        question: 'మీరు ఏ అంశాల గురించి మాట్లాడడానికి ఇష్టపడతారు? మాట్లాడటానికి మీకు ఇష్టమైన వ్యక్తి ఎవరు?',
        examples: [
          {
            en: 'I enjoy talking about travel and food with my best friend.',
            native: 'నా పక్కా స్నేహితుడితో ప్రయాణం మరియు ఆహారం గురించి మాట్లాడటం నాకు ఇష్టం.',
          },
          {
            en: 'A good conversation makes an evening feel much shorter.',
            native: 'మంచి సంభాషణ సాయంత్రాన్ని చాలా తక్కువగా అనిపించేలా చేస్తుంది.',
          },
          {
            en: 'I have learned many things just by listening to older people.',
            native: 'పెద్దవారు మాట్లాడేది వినడం ద్వారానే నేను చాలా విషయాలు నేర్చుకున్నాను.',
          },
        ],
      },
      hi: {
        word: 'बातचीत',
        question: 'आप किन विषयों पर बात करना पसंद करते हैं? आपका पसंदीदा बात करने वाला व्यक्ति कौन है?',
        examples: [
          {
            en: 'I enjoy talking about travel and food with my best friend.',
            native: 'मुझे अपने सबसे अच्छे दोस्त के साथ यात्रा और खाने पर बात करना पसंद है।',
          },
          {
            en: 'A good conversation makes an evening feel much shorter.',
            native: 'एक अच्छी बातचीत से शाम बहुत छोटी लगने लगती है।',
          },
          {
            en: 'I have learned many things just by listening to older people.',
            native: 'मैंने बड़ों की बातें सुनकर ही बहुत कुछ सीखा है।',
          },
        ],
      },
      es: {
        word: 'conversación',
        question: '¿Sobre qué temas te gusta hablar? ¿Quién es tu persona favorita para conversar?',
        examples: [
          {
            en: 'I enjoy talking about travel and food with my best friend.',
            native: 'Disfruto hablando de viajes y comida con mi mejor amigo.',
          },
          {
            en: 'A good conversation makes an evening feel much shorter.',
            native: 'Una buena conversación hace que la tarde parezca mucho más corta.',
          },
          {
            en: 'I have learned many things just by listening to older people.',
            native: 'He aprendido muchas cosas solo escuchando a la gente mayor.',
          },
        ],
      },
      zh: {
        word: '交谈',
        question: '你喜欢谈论什么话题？你最喜欢和谁聊天？',
        examples: [
          {
            en: 'I enjoy talking about travel and food with my best friend.',
            native: '我喜欢和我最好的朋友聊旅行和美食。',
          },
          {
            en: 'A good conversation makes an evening feel much shorter.',
            native: '一次愉快的交谈会让夜晚显得短暂许多。',
          },
          {
            en: 'I have learned many things just by listening to older people.',
            native: '仅仅通过倾听长辈讲话，我就学到了很多东西。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'letter',
    questionText: 'When did you last write or receive a letter? Do you prefer letters or messages?',
    translations: {
      te: {
        word: 'లేఖ',
        question: 'మీరు చివరిసారిగా ఎప్పుడు లేఖ రాశారు లేదా అందుకున్నారు? మీకు లేఖలా లేదా మెసేజ్‌లా ఏది ఇష్టం?',
        examples: [
          {
            en: 'I received a handwritten letter from my friend two years ago.',
            native: 'రెండు సంవత్సరాల క్రితం నేను నా స్నేహితుడి నుండి చేతితో రాసిన లేఖ అందుకున్నాను.',
          },
          {
            en: 'I still keep it because letters feel more personal than messages.',
            native: 'లేఖలు మెసేజ్‌ల కంటే వ్యక్తిగతంగా అనిపిస్తాయి కాబట్టి నేను దాన్ని ఇంకా దాచుకున్నాను.',
          },
          {
            en: 'Messages are faster, but a letter can be kept forever.',
            native: 'మెసేజ్‌లు వేగంగా ఉంటాయి, కానీ లేఖను ఎప్పటికీ దాచుకోవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'पत्र',
        question: 'आपने आख़िरी बार कब पत्र लिखा या पाया? आपको पत्र पसंद हैं या मैसेज?',
        examples: [
          {
            en: 'I received a handwritten letter from my friend two years ago.',
            native: 'दो साल पहले मुझे अपने दोस्त का हाथ से लिखा एक पत्र मिला था।',
          },
          {
            en: 'I still keep it because letters feel more personal than messages.',
            native: 'मैंने उसे आज भी संभालकर रखा है क्योंकि पत्र मैसेज से ज़्यादा निजी लगते हैं।',
          },
          {
            en: 'Messages are faster, but a letter can be kept forever.',
            native: 'मैसेज तेज़ होते हैं, लेकिन पत्र को हमेशा के लिए रखा जा सकता है।',
          },
        ],
      },
      es: {
        word: 'carta',
        question: '¿Cuándo escribiste o recibiste una carta por última vez? ¿Prefieres cartas o mensajes?',
        examples: [
          {
            en: 'I received a handwritten letter from my friend two years ago.',
            native: 'Recibí una carta escrita a mano de mi amigo hace dos años.',
          },
          {
            en: 'I still keep it because letters feel more personal than messages.',
            native: 'Todavía la guardo porque las cartas se sienten más personales que los mensajes.',
          },
          {
            en: 'Messages are faster, but a letter can be kept forever.',
            native: 'Los mensajes son más rápidos, pero una carta se puede conservar para siempre.',
          },
        ],
      },
      zh: {
        word: '信件',
        question: '你上次写信或收到信是什么时候？你喜欢信件还是消息？',
        examples: [
          {
            en: 'I received a handwritten letter from my friend two years ago.',
            native: '两年前我收到了朋友的一封手写信。',
          },
          {
            en: 'I still keep it because letters feel more personal than messages.',
            native: '我至今保留着它，因为信件比消息更有个人色彩。',
          },
          { en: 'Messages are faster, but a letter can be kept forever.', native: '消息更快，但信件可以永远保存。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'memory',
    questionText: 'What is your strongest memory from school? Why do you remember it so well?',
    translations: {
      te: {
        word: 'జ్ఞాపకం',
        question: 'స్కూల్ నుండి మీకు అత్యంత బలమైన జ్ఞాపకం ఏమిటి? అది మీకు ఎందుకు ఇంత బాగా గుర్తుంది?',
        examples: [
          {
            en: 'My strongest memory is winning a prize for a science project.',
            native: 'నా అత్యంత బలమైన జ్ఞాపకం ఒక సైన్స్ ప్రాజెక్టుకు బహుమతి గెలవడం.',
          },
          {
            en: 'I remember it well because my whole family came to watch.',
            native: 'నా కుటుంబం మొత్తం చూడటానికి వచ్చింది కాబట్టి అది నాకు బాగా గుర్తుంది.',
          },
          {
            en: 'That day taught me that hard work brings happy moments.',
            native: 'కష్టపడి పనిచేస్తే సంతోషకరమైన క్షణాలు వస్తాయని ఆ రోజు నాకు నేర్పింది.',
          },
        ],
      },
      hi: {
        word: 'याद',
        question: 'स्कूल की आपकी सबसे गहरी याद क्या है? आपको यह इतनी अच्छी तरह क्यों याद है?',
        examples: [
          {
            en: 'My strongest memory is winning a prize for a science project.',
            native: 'मेरी सबसे गहरी याद एक विज्ञान प्रोजेक्ट के लिए पुरस्कार जीतने की है।',
          },
          {
            en: 'I remember it well because my whole family came to watch.',
            native: 'मुझे यह अच्छी तरह याद है क्योंकि मेरा पूरा परिवार देखने आया था।',
          },
          {
            en: 'That day taught me that hard work brings happy moments.',
            native: 'उस दिन ने मुझे सिखाया कि कड़ी मेहनत से खुशियाँ मिलती हैं।',
          },
        ],
      },
      es: {
        word: 'recuerdo',
        question: '¿Cuál es tu recuerdo más fuerte del colegio? ¿Por qué lo recuerdas tan bien?',
        examples: [
          {
            en: 'My strongest memory is winning a prize for a science project.',
            native: 'Mi recuerdo más fuerte es ganar un premio por un proyecto de ciencias.',
          },
          {
            en: 'I remember it well because my whole family came to watch.',
            native: 'Lo recuerdo bien porque vino a verme toda mi familia.',
          },
          {
            en: 'That day taught me that hard work brings happy moments.',
            native: 'Ese día me enseñó que el trabajo duro trae momentos felices.',
          },
        ],
      },
      zh: {
        word: '回忆',
        question: '你在学校最深刻的记忆是什么？为什么你记得这么清楚？',
        examples: [
          {
            en: 'My strongest memory is winning a prize for a science project.',
            native: '我最深刻的记忆是因一个科学项目获奖。',
          },
          {
            en: 'I remember it well because my whole family came to watch.',
            native: '我记得很清楚，因为我全家都来观看了。',
          },
          {
            en: 'That day taught me that hard work brings happy moments.',
            native: '那一天教会了我努力会带来快乐的时刻。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'future',
    questionText: 'What do you hope your life will be like in ten years?',
    translations: {
      te: {
        word: 'భవిష్యత్తు',
        question: 'పది సంవత్సరాల తర్వాత మీ జీవితం ఎలా ఉంటుందని మీరు ఆశిస్తున్నారు?',
        examples: [
          {
            en: 'In ten years, I hope to have a good job and my own house.',
            native: 'పది సంవత్సరాలలో, నాకు మంచి ఉద్యోగం మరియు స్వంత ఇల్లు ఉంటాయని ఆశిస్తున్నాను.',
          },
          {
            en: 'I want to travel more because I have seen very little of the world.',
            native: 'నేను ప్రపంచంలో చాలా తక్కువ చూశాను కాబట్టి ఎక్కువ ప్రయాణించాలనుకుంటున్నాను.',
          },
          {
            en: 'The future is uncertain, but planning makes me feel ready.',
            native: 'భవిష్యత్తు అనిశ్చితమే, కానీ ప్లానింగ్ నన్ను సిద్ధంగా అనిపించేలా చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'भविष्य',
        question: 'दस साल बाद आपकी ज़िंदगी कैसी हो, ऐसी आपकी क्या उम्मीद है?',
        examples: [
          {
            en: 'In ten years, I hope to have a good job and my own house.',
            native: 'दस साल बाद, मेरी उम्मीद है कि मेरे पास एक अच्छी नौकरी और अपना घर होगा।',
          },
          {
            en: 'I want to travel more because I have seen very little of the world.',
            native: 'मैं ज़्यादा यात्रा करना चाहता हूँ क्योंकि मैंने दुनिया बहुत कम देखी है।',
          },
          {
            en: 'The future is uncertain, but planning makes me feel ready.',
            native: 'भविष्य अनिश्चित है, लेकिन योजना बनाने से मैं तैयार महसूस करता हूँ।',
          },
        ],
      },
      es: {
        word: 'futuro',
        question: '¿Cómo esperas que sea tu vida dentro de diez años?',
        examples: [
          {
            en: 'In ten years, I hope to have a good job and my own house.',
            native: 'Dentro de diez años, espero tener un buen trabajo y mi propia casa.',
          },
          {
            en: 'I want to travel more because I have seen very little of the world.',
            native: 'Quiero viajar más porque he visto muy poco del mundo.',
          },
          {
            en: 'The future is uncertain, but planning makes me feel ready.',
            native: 'El futuro es incierto, pero planificar me hace sentir preparado.',
          },
        ],
      },
      zh: {
        word: '未来',
        question: '你希望十年后你的生活是什么样子？',
        examples: [
          {
            en: 'In ten years, I hope to have a good job and my own house.',
            native: '十年后，我希望有一份好工作和自己的房子。',
          },
          {
            en: 'I want to travel more because I have seen very little of the world.',
            native: '我想多旅行，因为我见过的世界太少了。',
          },
          {
            en: 'The future is uncertain, but planning makes me feel ready.',
            native: '未来是不确定的，但做计划让我感觉有准备。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'goal',
    questionText: 'What is one goal you are working on right now? How will you reach it?',
    translations: {
      te: {
        word: 'లక్ష్యం',
        question: 'మీరు ప్రస్తుతం చేస్తున్న ఒక లక్ష్యం ఏమిటి? దాన్ని మీరు ఎలా చేరుకుంటారు?',
        examples: [
          {
            en: 'My goal right now is to speak English without translating in my head.',
            native: 'నా ప్రస్తుత లక్ష్యం మనస్లో అనువదించకుండా ఇంగ్లీష్ మాట్లాడటం.',
          },
          {
            en: 'I will reach it by practising every day and watching English films.',
            native: 'ప్రతిరోజూ అభ్యసించడం మరియు ఇంగ్లీష్ సినిమాలు చూడటం ద్వారా దాన్ని చేరుకుంటాను.',
          },
          {
            en: 'Small steps every week bring me closer to my goal.',
            native: 'ప్రతి వారం చిన్న అడుగులు నన్ను నా లక్ష్యానికి దగ్గరగా తీసుకువెళ్తాయి.',
          },
        ],
      },
      hi: {
        word: 'लक्ष्य',
        question: 'इस समय आप किस एक लक्ष्य पर काम कर रहे हैं? आप इसे कैसे पाएँगे?',
        examples: [
          {
            en: 'My goal right now is to speak English without translating in my head.',
            native: 'अभी मेरा लक्ष्य मन में अनुवाद किए बिना अंग्रेज़ी बोलना है।',
          },
          {
            en: 'I will reach it by practising every day and watching English films.',
            native: 'मैं हर दिन अभ्यास करके और अंग्रेज़ी फ़िल्में देखकर इसे पाऊँगा।',
          },
          {
            en: 'Small steps every week bring me closer to my goal.',
            native: 'हर हफ़्ते उठाए छोटे कदम मुझे मेरे लक्ष्य के करीब ले जाते हैं।',
          },
        ],
      },
      es: {
        word: 'meta',
        question: '¿Cuál es una meta en la que estás trabajando ahora? ¿Cómo la alcanzarás?',
        examples: [
          {
            en: 'My goal right now is to speak English without translating in my head.',
            native: 'Mi meta ahora es hablar inglés sin traducir en mi cabeza.',
          },
          {
            en: 'I will reach it by practising every day and watching English films.',
            native: 'La alcanzaré practicando cada día y viendo películas en inglés.',
          },
          {
            en: 'Small steps every week bring me closer to my goal.',
            native: 'Los pequeños pasos de cada semana me acercan a mi meta.',
          },
        ],
      },
      zh: {
        word: '目标',
        question: '你目前正在努力实现的一个目标是什么？你将如何实现它？',
        examples: [
          {
            en: 'My goal right now is to speak English without translating in my head.',
            native: '我现在的目标是不在脑中翻译就能说英语。',
          },
          {
            en: 'I will reach it by practising every day and watching English films.',
            native: '我将通过每天练习和看英语电影来实现它。',
          },
          { en: 'Small steps every week bring me closer to my goal.', native: '每周的小进步让我离目标更近。' },
        ],
      },
    },
  },
  {
    cefrLevel: 'B1',
    promptWord: 'skill',
    questionText: 'What new skill would you like to learn? How would you start learning it?',
    translations: {
      te: {
        word: 'నైపుణ్యం',
        question: 'మీరు ఏ కొత్త నైపుణ్యాన్ని నేర్చుకోవాలనుకుంటున్నారు? దాన్ని నేర్చుకోవడం ఎలా ప్రారంభిస్తారు?',
        examples: [
          {
            en: 'I would like to learn photography because I love beautiful pictures.',
            native: 'అందమైన చిత్రాలు నాకు ఇష్టం కాబట్టి ఫోటోగ్రఫీ నేర్చుకోవాలనుకుంటున్నాను.',
          },
          {
            en: 'I would start by watching free lessons online every weekend.',
            native: 'ప్రతి వారాంతం ఆన్‌లైన్‌లో ఉచిత పాఠాలు చూడటంతో ప్రారంభిస్తాను.',
          },
          {
            en: 'Learning a new skill is hard at first, but practice makes it fun.',
            native: 'కొత్త నైపుణ్యం నేర్చుకోవడం మొదట కష్టం, కానీ అభ్యాసం దాన్ని సరదాగా మారుస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'कौशल',
        question: 'आप कौन सा नया कौशल सीखना चाहेंगे? आप इसे सीखना कैसे शुरू करेंगे?',
        examples: [
          {
            en: 'I would like to learn photography because I love beautiful pictures.',
            native: 'मैं फ़ोटोग्राफ़ी सीखना चाहूँगा क्योंकि मुझे सुंदर तस्वीरें पसंद हैं।',
          },
          {
            en: 'I would start by watching free lessons online every weekend.',
            native: 'मैं हर सप्ताह के अंत में ऑनलाइन मुफ़्त पाठ देखकर शुरुआत करूँगा।',
          },
          {
            en: 'Learning a new skill is hard at first, but practice makes it fun.',
            native: 'नया कौशल सीखना शुरू में कठिन होता है, लेकिन अभ्यास से यह मज़ेदार बन जाता है।',
          },
        ],
      },
      es: {
        word: 'habilidad',
        question: '¿Qué nueva habilidad te gustaría aprender? ¿Cómo empezarías a aprenderla?',
        examples: [
          {
            en: 'I would like to learn photography because I love beautiful pictures.',
            native: 'Me gustaría aprender fotografía porque me encantan las fotos bonitas.',
          },
          {
            en: 'I would start by watching free lessons online every weekend.',
            native: 'Empezaría viendo lecciones gratuitas en línea cada fin de semana.',
          },
          {
            en: 'Learning a new skill is hard at first, but practice makes it fun.',
            native: 'Aprender una habilidad nueva es difícil al principio, pero la práctica lo hace divertido.',
          },
        ],
      },
      zh: {
        word: '技能',
        question: '你想学什么新技能？你会怎样开始学习？',
        examples: [
          {
            en: 'I would like to learn photography because I love beautiful pictures.',
            native: '我想学摄影，因为我喜欢美丽的照片。',
          },
          {
            en: 'I would start by watching free lessons online every weekend.',
            native: '我会从每个周末在网上看免费课程开始。',
          },
          {
            en: 'Learning a new skill is hard at first, but practice makes it fun.',
            native: '学习新技能一开始很难，但练习会让它变得有趣。',
          },
        ],
      },
    },
  },
];
