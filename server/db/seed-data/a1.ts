import type { QuestionSeed } from './types';

// A1 speaking questions: prompt word, question, and te/hi/es/zh
// translations with 3 example answers each (same English sentence across
// languages, `native` is its translation).
export const questions: QuestionSeed[] = [
  {
    cefrLevel: 'A1',
    promptWord: 'family',
    questionText: 'Talk about your family. Who is in your family?',
    translations: {
      te: {
        word: 'కుటుంబం',
        question: 'మీ కుటుంబం గురించి మాట్లాడండి. మీ కుటుంబంలో ఎవరెవరు ఉన్నారు?',
        examples: [
          {
            en: 'There are four people in my family.',
            native: 'మా కుటుంబంలో నలుగురు ఉన్నారు.',
          },
          {
            en: 'My father is a farmer and my mother is a teacher.',
            native: 'మా నాన్న రైతు, మా అమ్మ ఉపాధ్యాయురాలు.',
          },
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
          {
            en: 'There are four people in my family.',
            native: 'मेरे परिवार में चार लोग हैं।',
          },
          {
            en: 'My father is a farmer and my mother is a teacher.',
            native: 'मेरे पिता किसान हैं और मेरी माँ शिक्षिका हैं।',
          },
          {
            en: 'I have a younger brother and a younger sister.',
            native: 'मेरा एक छोटा भाई और एक छोटी बहन है।',
          },
        ],
      },
      es: {
        word: 'familia',
        question: 'Habla de tu familia. ¿Quiénes están en tu familia?',
        examples: [
          {
            en: 'There are four people in my family.',
            native: 'En mi familia hay cuatro personas.',
          },
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
          {
            en: 'There are four people in my family.',
            native: '我家有四口人。',
          },
          {
            en: 'My father is a farmer and my mother is a teacher.',
            native: '我爸爸是农民，我妈妈是老师。',
          },
          {
            en: 'I have a younger brother and a younger sister.',
            native: '我有一个弟弟和一个妹妹。',
          },
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
          {
            en: 'I like rice and vegetables.',
            native: 'నాకు అన్నం మరియు కూరగాయలు ఇష్టం.',
          },
          {
            en: 'My favourite food is chicken curry.',
            native: 'నా ఇష్టమైన ఆహారం చికెన్ కరీ.',
          },
          {
            en: 'I do not like very spicy food.',
            native: 'నాకు చాలా కారమైన ఆహారం ఇష్టం లేదు.',
          },
        ],
      },
      hi: {
        word: 'भोजन',
        question: 'आपको कौन सा भोजन पसंद है?',
        examples: [
          {
            en: 'I like rice and vegetables.',
            native: 'मुझे चावल और सब्ज़ियाँ पसंद हैं।',
          },
          {
            en: 'My favourite food is chicken curry.',
            native: 'मेरा पसंदीदा भोजन चिकन करी है।',
          },
          {
            en: 'I do not like very spicy food.',
            native: 'मुझे बहुत मसालेदार भोजन पसंद नहीं है।',
          },
        ],
      },
      es: {
        word: 'comida',
        question: '¿Qué comida te gusta?',
        examples: [
          {
            en: 'I like rice and vegetables.',
            native: 'Me gustan el arroz y las verduras.',
          },
          {
            en: 'My favourite food is chicken curry.',
            native: 'Mi comida favorita es el pollo al curry.',
          },
          {
            en: 'I do not like very spicy food.',
            native: 'No me gusta la comida muy picante.',
          },
        ],
      },
      zh: {
        word: '食物',
        question: '你喜欢什么食物？',
        examples: [
          {
            en: 'I like rice and vegetables.',
            native: '我喜欢米饭和蔬菜。',
          },
          {
            en: 'My favourite food is chicken curry.',
            native: '我最喜欢的食物是咖喱鸡。',
          },
          {
            en: 'I do not like very spicy food.',
            native: '我不喜欢很辣的食物。',
          },
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
          {
            en: 'There is a small garden in front of my house.',
            native: 'నా ఇంటి ముందు ఒక చిన్న తోట ఉంది.',
          },
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
          {
            en: 'My home has two bedrooms and a kitchen.',
            native: 'मेरे घर में दो शयनकक्ष और एक रसोई हैं।',
          },
          {
            en: 'There is a small garden in front of my house.',
            native: 'मेरे घर के सामने एक छोटा बगीचा है।',
          },
        ],
      },
      es: {
        word: 'hogar',
        question: 'Describe tu casa.',
        examples: [
          {
            en: 'I live in a small house with my parents.',
            native: 'Vivo en una casa pequeña con mis padres.',
          },
          {
            en: 'My home has two bedrooms and a kitchen.',
            native: 'Mi casa tiene dos dormitorios y una cocina.',
          },
          {
            en: 'There is a small garden in front of my house.',
            native: 'Hay un jardín pequeño frente a mi casa.',
          },
        ],
      },
      zh: {
        word: '家',
        question: '描述一下你的家。',
        examples: [
          {
            en: 'I live in a small house with my parents.',
            native: '我和父母住在一所小房子里。',
          },
          {
            en: 'My home has two bedrooms and a kitchen.',
            native: '我家有两间卧室和一间厨房。',
          },
          {
            en: 'There is a small garden in front of my house.',
            native: '我家门前有一个小花园。',
          },
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
          {
            en: 'My best friend is Ravi.',
            native: 'నా అత్యంత స్నేహితుడు రవి.',
          },
          {
            en: 'He is kind and always helps me.',
            native: 'అతను దయగలవాడు మరియు ఎల్లప్పుడూ నాకు సహాయం చేస్తాడు.',
          },
          {
            en: 'We play cricket together every Sunday.',
            native: 'మేము ప్రతి ఆదివారం కలిసి క్రికెట్ ఆడుతాము.',
          },
        ],
      },
      hi: {
        word: 'दोस्त',
        question: 'अपने सबसे अच्छे दोस्त के बारे में बताइए।',
        examples: [
          {
            en: 'My best friend is Ravi.',
            native: 'मेरा सबसे अच्छा दोस्त रवि है।',
          },
          {
            en: 'He is kind and always helps me.',
            native: 'वह दयालु है और हमेशा मेरी मदद करता है।',
          },
          {
            en: 'We play cricket together every Sunday.',
            native: 'हम हर रविवार साथ में क्रिकेट खेलते हैं।',
          },
        ],
      },
      es: {
        word: 'amigo',
        question: 'Habla de tu mejor amigo.',
        examples: [
          {
            en: 'My best friend is Ravi.',
            native: 'Mi mejor amigo es Ravi.',
          },
          {
            en: 'He is kind and always helps me.',
            native: 'Él es amable y siempre me ayuda.',
          },
          {
            en: 'We play cricket together every Sunday.',
            native: 'Jugamos al críquet juntos todos los domingos.',
          },
        ],
      },
      zh: {
        word: '朋友',
        question: '谈谈你最好的朋友。',
        examples: [
          {
            en: 'My best friend is Ravi.',
            native: '我最好的朋友是拉维。',
          },
          {
            en: 'He is kind and always helps me.',
            native: '他很友善，总是帮助我。',
          },
          {
            en: 'We play cricket together every Sunday.',
            native: '我们每个星期天一起打板球。',
          },
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
          {
            en: "I wake up at six o'clock every morning.",
            native: 'నేను ప్రతి రోజు ఉదయం ఆరు గంటలకు నిద్ర లేస్తాను.',
          },
          {
            en: 'I go to work by bus.',
            native: 'నేను బస్సులో పనికి వెళ్తాను.',
          },
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
          {
            en: "I wake up at six o'clock every morning.",
            native: 'मैं हर सुबह छह बजे उठता हूँ।',
          },
          {
            en: 'I go to work by bus.',
            native: 'मैं बस से काम पर जाता हूँ।',
          },
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
          {
            en: "I wake up at six o'clock every morning.",
            native: 'Me despierto a las seis todas las mañanas.',
          },
          {
            en: 'I go to work by bus.',
            native: 'Voy al trabajo en autobús.',
          },
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
          {
            en: "I wake up at six o'clock every morning.",
            native: '我每天早上六点起床。',
          },
          {
            en: 'I go to work by bus.',
            native: '我坐公交车去上班。',
          },
          {
            en: 'In the evening, I watch television with my family.',
            native: '晚上，我和家人一起看电视。',
          },
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
          {
            en: 'I like reading books in my free time.',
            native: 'నా ఖాళీ సమయంలో పుస్తకాలు చదవడం నాకు ఇష్టం.',
          },
          {
            en: 'Sometimes I listen to music.',
            native: 'కొన్నిసార్లు నేను సంగీతం వింటాను.',
          },
          {
            en: 'My hobby is painting pictures of nature.',
            native: 'నా అభిరుచి ప్రకృతి చిత్రాలు గీయడం.',
          },
        ],
      },
      hi: {
        word: 'शौक',
        question: 'आप खाली समय में क्या करना पसंद करते हैं?',
        examples: [
          {
            en: 'I like reading books in my free time.',
            native: 'मुझे खाली समय में किताबें पढ़ना पसंद है।',
          },
          {
            en: 'Sometimes I listen to music.',
            native: 'कभी-कभी मैं संगीत सुनता हूँ।',
          },
          {
            en: 'My hobby is painting pictures of nature.',
            native: 'मेरा शौक प्रकृति के चित्र बनाना है।',
          },
        ],
      },
      es: {
        word: 'pasatiempo',
        question: '¿Qué te gusta hacer en tu tiempo libre?',
        examples: [
          {
            en: 'I like reading books in my free time.',
            native: 'Me gusta leer libros en mi tiempo libre.',
          },
          {
            en: 'Sometimes I listen to music.',
            native: 'A veces escucho música.',
          },
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
          {
            en: 'I like reading books in my free time.',
            native: '我空闲时喜欢读书。',
          },
          {
            en: 'Sometimes I listen to music.',
            native: '有时我听音乐。',
          },
          {
            en: 'My hobby is painting pictures of nature.',
            native: '我的爱好是画自然风景。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'morning',
    questionText: 'Talk about your morning. What do you do every morning?',
    translations: {
      te: {
        word: 'ఉదయం',
        question: 'మీ ఉదయం గురించి మాట్లాడండి. మీరు ప్రతి ఉదయం ఏమి చేస్తారు?',
        examples: [
          {
            en: "I wake up at six o'clock every day.",
            native: 'నేను ప్రతిరోజూ ఆరు గంటలకు లేస్తాను.',
          },
          {
            en: 'I brush my teeth and wash my face.',
            native: 'నేను పళ్లు తోముకుని ముఖం కడుక్కుంటాను.',
          },
          {
            en: 'Then I eat breakfast with my family.',
            native: 'తర్వాత నేను నా కుటుంబంతో అల్పాహారం తింటాను.',
          },
        ],
      },
      hi: {
        word: 'सुबह',
        question: 'अपनी सुबह के बारे में बताइए। आप हर सुबह क्या करते हैं?',
        examples: [
          {
            en: "I wake up at six o'clock every day.",
            native: 'मैं रोज़ छह बजे उठता हूँ।',
          },
          {
            en: 'I brush my teeth and wash my face.',
            native: 'मैं दाँत साफ़ करता हूँ और चेहरा धोता हूँ।',
          },
          {
            en: 'Then I eat breakfast with my family.',
            native: 'फिर मैं अपने परिवार के साथ नाश्ता खाता हूँ।',
          },
        ],
      },
      es: {
        word: 'mañana',
        question: 'Habla de tu mañana. ¿Qué haces cada mañana?',
        examples: [
          {
            en: "I wake up at six o'clock every day.",
            native: 'Me despierto a las seis todos los días.',
          },
          {
            en: 'I brush my teeth and wash my face.',
            native: 'Me cepillo los dientes y me lavo la cara.',
          },
          {
            en: 'Then I eat breakfast with my family.',
            native: 'Luego desayuno con mi familia.',
          },
        ],
      },
      zh: {
        word: '早晨',
        question: '谈谈你的早晨。你每天早上做什么？',
        examples: [
          {
            en: "I wake up at six o'clock every day.",
            native: '我每天六点起床。',
          },
          {
            en: 'I brush my teeth and wash my face.',
            native: '我刷牙洗脸。',
          },
          {
            en: 'Then I eat breakfast with my family.',
            native: '然后我和家人一起吃早餐。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'evening',
    questionText: 'What do you do in the evening?',
    translations: {
      te: {
        word: 'సాయంత్రం',
        question: 'మీరు సాయంత్రం ఏమి చేస్తారు?',
        examples: [
          {
            en: "I come home at five o'clock.",
            native: 'నేను ఐదు గంటలకు ఇంటికి వస్తాను.',
          },
          {
            en: 'I drink tea with my mother.',
            native: 'నేను నా అమ్మతో టీ తాగుతాను.',
          },
          {
            en: 'We eat dinner together at eight.',
            native: 'మేము ఎనిమిది గంటలకు కలిసి రాత్రి భోజనం చేస్తాము.',
          },
        ],
      },
      hi: {
        word: 'शाम',
        question: 'आप शाम को क्या करते हैं?',
        examples: [
          {
            en: "I come home at five o'clock.",
            native: 'मैं पाँच बजे घर आता हूँ।',
          },
          {
            en: 'I drink tea with my mother.',
            native: 'मैं अपनी माँ के साथ चाय पीता हूँ।',
          },
          {
            en: 'We eat dinner together at eight.',
            native: 'हम आठ बजे साथ में रात का खाना खाते हैं।',
          },
        ],
      },
      es: {
        word: 'tarde',
        question: '¿Qué haces por la tarde?',
        examples: [
          {
            en: "I come home at five o'clock.",
            native: 'Llego a casa a las cinco.',
          },
          {
            en: 'I drink tea with my mother.',
            native: 'Tomo té con mi madre.',
          },
          {
            en: 'We eat dinner together at eight.',
            native: 'Cenamos juntos a las ocho.',
          },
        ],
      },
      zh: {
        word: '傍晚',
        question: '你傍晚做什么？',
        examples: [
          {
            en: "I come home at five o'clock.",
            native: '我五点回家。',
          },
          {
            en: 'I drink tea with my mother.',
            native: '我和妈妈一起喝茶。',
          },
          {
            en: 'We eat dinner together at eight.',
            native: '我们八点一起吃晚饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'night',
    questionText: 'Talk about your night. When do you go to bed?',
    translations: {
      te: {
        word: 'రాత్రి',
        question: 'మీ రాత్రి గురించి మాట్లాడండి. మీరు ఎప్పుడు పడుకుంటారు?',
        examples: [
          {
            en: "I go to bed at ten o'clock.",
            native: 'నేను పది గంటలకు పడుకుంటాను.',
          },
          {
            en: 'I read a book before I sleep.',
            native: 'నేను నిద్రపోయే ముందు పుస్తకం చదువుతాను.',
          },
          {
            en: 'My family sleeps early at night.',
            native: 'నా కుటుంబం రాత్రి త్వరగా పడుకుంటుంది.',
          },
        ],
      },
      hi: {
        word: 'रात',
        question: 'अपनी रात के बारे में बताइए। आप कब सोते हैं?',
        examples: [
          {
            en: "I go to bed at ten o'clock.",
            native: 'मैं दस बजे सोता हूँ।',
          },
          {
            en: 'I read a book before I sleep.',
            native: 'मैं सोने से पहले किताब पढ़ता हूँ।',
          },
          {
            en: 'My family sleeps early at night.',
            native: 'मेरा परिवार रात में जल्दी सोता है।',
          },
        ],
      },
      es: {
        word: 'noche',
        question: 'Habla de tu noche. ¿Cuándo te acuestas?',
        examples: [
          {
            en: "I go to bed at ten o'clock.",
            native: 'Me acuesto a las diez.',
          },
          {
            en: 'I read a book before I sleep.',
            native: 'Leo un libro antes de dormir.',
          },
          {
            en: 'My family sleeps early at night.',
            native: 'Mi familia duerme temprano por la noche.',
          },
        ],
      },
      zh: {
        word: '夜晚',
        question: '谈谈你的夜晚。你什么时候睡觉？',
        examples: [
          {
            en: "I go to bed at ten o'clock.",
            native: '我十点睡觉。',
          },
          {
            en: 'I read a book before I sleep.',
            native: '我睡前看书。',
          },
          {
            en: 'My family sleeps early at night.',
            native: '我家人晚上睡得早。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'breakfast',
    questionText: 'What do you eat for breakfast?',
    translations: {
      te: {
        word: 'అల్పాహారం',
        question: 'మీరు అల్పాహారంగా ఏమి తింటారు?',
        examples: [
          {
            en: 'I eat bread and eggs for breakfast.',
            native: 'నేను అల్పాహారంగా బ్రెడ్ మరియు గుడ్లు తింటాను.',
          },
          {
            en: 'My mother makes breakfast every morning.',
            native: 'నా అమ్మ ప్రతి ఉదయం అల్పాహారం తయారు చేస్తుంది.',
          },
          {
            en: 'I drink a glass of milk.',
            native: 'నేను ఒక గ్లాసు పాలు తాగుతాను.',
          },
        ],
      },
      hi: {
        word: 'नाश्ता',
        question: 'आप नाश्ते में क्या खाते हैं?',
        examples: [
          {
            en: 'I eat bread and eggs for breakfast.',
            native: 'मैं नाश्ते में ब्रेड और अंडे खाता हूँ।',
          },
          {
            en: 'My mother makes breakfast every morning.',
            native: 'मेरी माँ हर सुबह नाश्ता बनाती हैं।',
          },
          {
            en: 'I drink a glass of milk.',
            native: 'मैं एक गिलास दूध पीता हूँ।',
          },
        ],
      },
      es: {
        word: 'desayuno',
        question: '¿Qué desayunas?',
        examples: [
          {
            en: 'I eat bread and eggs for breakfast.',
            native: 'Desayuno pan y huevos.',
          },
          {
            en: 'My mother makes breakfast every morning.',
            native: 'Mi madre prepara el desayuno cada mañana.',
          },
          {
            en: 'I drink a glass of milk.',
            native: 'Bebo un vaso de leche.',
          },
        ],
      },
      zh: {
        word: '早餐',
        question: '你早餐吃什么？',
        examples: [
          {
            en: 'I eat bread and eggs for breakfast.',
            native: '我早餐吃面包和鸡蛋。',
          },
          {
            en: 'My mother makes breakfast every morning.',
            native: '我妈妈每天早上做早餐。',
          },
          {
            en: 'I drink a glass of milk.',
            native: '我喝一杯牛奶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'lunch',
    questionText: 'What do you eat for lunch?',
    translations: {
      te: {
        word: 'మధ్యాహ్న భోజనం',
        question: 'మీరు మధ్యాహ్న భోజనంగా ఏమి తింటారు?',
        examples: [
          {
            en: 'I eat rice and vegetables for lunch.',
            native: 'నేను మధ్యాహ్న భోజనంగా అన్నం మరియు కూరగాయలు తింటాను.',
          },
          {
            en: "I have lunch at one o'clock.",
            native: 'నేను ఒకటి గంటలకు మధ్యాహ్న భోజనం చేస్తాను.',
          },
          {
            en: 'I eat lunch with my friends.',
            native: 'నేను నా స్నేహితులతో మధ్యాహ్న భోజనం తింటాను.',
          },
        ],
      },
      hi: {
        word: 'दोपहर का भोजन',
        question: 'आप दोपहर के भोजन में क्या खाते हैं?',
        examples: [
          {
            en: 'I eat rice and vegetables for lunch.',
            native: 'मैं दोपहर के भोजन में चावल और सब्ज़ियाँ खाता हूँ।',
          },
          {
            en: "I have lunch at one o'clock.",
            native: 'मैं एक बजे दोपहर का भोजन करता हूँ।',
          },
          {
            en: 'I eat lunch with my friends.',
            native: 'मैं अपने दोस्तों के साथ दोपहर का भोजन खाता हूँ।',
          },
        ],
      },
      es: {
        word: 'almuerzo',
        question: '¿Qué almuerzas?',
        examples: [
          {
            en: 'I eat rice and vegetables for lunch.',
            native: 'Almuerzo arroz y verduras.',
          },
          {
            en: "I have lunch at one o'clock.",
            native: 'Almuerzo a la una.',
          },
          {
            en: 'I eat lunch with my friends.',
            native: 'Almuerzo con mis amigos.',
          },
        ],
      },
      zh: {
        word: '午餐',
        question: '你午餐吃什么？',
        examples: [
          {
            en: 'I eat rice and vegetables for lunch.',
            native: '我午餐吃米饭和蔬菜。',
          },
          {
            en: "I have lunch at one o'clock.",
            native: '我一点吃午饭。',
          },
          {
            en: 'I eat lunch with my friends.',
            native: '我和朋友们一起吃午饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'dinner',
    questionText: 'Talk about your dinner. What do you eat?',
    translations: {
      te: {
        word: 'రాత్రి భోజనం',
        question: 'మీ రాత్రి భోజనం గురించి మాట్లాడండి. మీరు ఏమి తింటారు?',
        examples: [
          {
            en: "We eat dinner at eight o'clock.",
            native: 'మేము ఎనిమిది గంటలకు రాత్రి భోజనం చేస్తాము.',
          },
          {
            en: 'I like soup and bread for dinner.',
            native: 'రాత్రి భోజనంగా నాకు సూప్ మరియు బ్రెడ్ ఇష్టం.',
          },
          {
            en: 'My family eats dinner together.',
            native: 'నా కుటుంబం కలిసి రాత్రి భోజనం చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'रात का खाना',
        question: 'अपने रात के खाने के बारे में बताइए। आप क्या खाते हैं?',
        examples: [
          {
            en: "We eat dinner at eight o'clock.",
            native: 'हम आठ बजे रात का खाना खाते हैं।',
          },
          {
            en: 'I like soup and bread for dinner.',
            native: 'मुझे रात के खाने में सूप और ब्रेड पसंद है।',
          },
          {
            en: 'My family eats dinner together.',
            native: 'मेरा परिवार साथ में रात का खाना खाता है।',
          },
        ],
      },
      es: {
        word: 'cena',
        question: 'Habla de tu cena. ¿Qué cenas?',
        examples: [
          {
            en: "We eat dinner at eight o'clock.",
            native: 'Cenamos a las ocho.',
          },
          {
            en: 'I like soup and bread for dinner.',
            native: 'Me gusta la sopa y el pan para la cena.',
          },
          {
            en: 'My family eats dinner together.',
            native: 'Mi familia cena junta.',
          },
        ],
      },
      zh: {
        word: '晚餐',
        question: '谈谈你的晚餐。你吃什么？',
        examples: [
          {
            en: "We eat dinner at eight o'clock.",
            native: '我们八点吃晚饭。',
          },
          {
            en: 'I like soup and bread for dinner.',
            native: '我晚餐喜欢喝汤、吃面包。',
          },
          {
            en: 'My family eats dinner together.',
            native: '我家人一起吃晚饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'water',
    questionText: 'Do you drink enough water every day?',
    translations: {
      te: {
        word: 'నీరు',
        question: 'మీరు ప్రతిరోజూ తగినంత నీరు తాగుతారా?',
        examples: [
          {
            en: 'I drink eight glasses of water every day.',
            native: 'నేను ప్రతిరోజూ ఎనిమిది గ్లాసుల నీరు తాగుతాను.',
          },
          {
            en: 'I carry a water bottle to class.',
            native: 'నేను తరగతికి నీటి బాటిల్ తీసుకువెళ్తాను.',
          },
          {
            en: 'Cold water is good on hot days.',
            native: 'వేడి రోజుల్లో చల్లని నీరు మంచిది.',
          },
        ],
      },
      hi: {
        word: 'पानी',
        question: 'क्या आप रोज़ पर्याप्त पानी पीते हैं?',
        examples: [
          {
            en: 'I drink eight glasses of water every day.',
            native: 'मैं रोज़ आठ गिलास पानी पीता हूँ।',
          },
          {
            en: 'I carry a water bottle to class.',
            native: 'मैं कक्षा में पानी की बोतल ले जाता हूँ।',
          },
          {
            en: 'Cold water is good on hot days.',
            native: 'गर्म दिनों में ठंडा पानी अच्छा होता है।',
          },
        ],
      },
      es: {
        word: 'agua',
        question: '¿Bebes suficiente agua todos los días?',
        examples: [
          {
            en: 'I drink eight glasses of water every day.',
            native: 'Bebo ocho vasos de agua todos los días.',
          },
          {
            en: 'I carry a water bottle to class.',
            native: 'Llevo una botella de agua a clase.',
          },
          {
            en: 'Cold water is good on hot days.',
            native: 'El agua fría es buena en días calurosos.',
          },
        ],
      },
      zh: {
        word: '水',
        question: '你每天喝足够的水吗？',
        examples: [
          {
            en: 'I drink eight glasses of water every day.',
            native: '我每天喝八杯水。',
          },
          {
            en: 'I carry a water bottle to class.',
            native: '我带水瓶去上课。',
          },
          {
            en: 'Cold water is good on hot days.',
            native: '热天喝凉水很好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'milk',
    questionText: 'Do you like milk? When do you drink it?',
    translations: {
      te: {
        word: 'పాలు',
        question: 'మీకు పాలు ఇష్టమా? మీరు ఎప్పుడు తాగుతారు?',
        examples: [
          {
            en: 'I drink a glass of milk every morning.',
            native: 'నేను ప్రతి ఉదయం ఒక గ్లాసు పాలు తాగుతాను.',
          },
          {
            en: 'My little sister likes warm milk.',
            native: 'నా చిన్న చెల్లెలకు వెచ్చని పాలు ఇష్టం.',
          },
          {
            en: 'We buy milk from the shop.',
            native: 'మేము దుకాణం నుండి పాలు కొంటాము.',
          },
        ],
      },
      hi: {
        word: 'दूध',
        question: 'क्या आपको दूध पसंद है? आप इसे कब पीते हैं?',
        examples: [
          {
            en: 'I drink a glass of milk every morning.',
            native: 'मैं हर सुबह एक गिलास दूध पीता हूँ।',
          },
          {
            en: 'My little sister likes warm milk.',
            native: 'मेरी छोटी बहन को गर्म दूध पसंद है।',
          },
          {
            en: 'We buy milk from the shop.',
            native: 'हम दुकान से दूध खरीदते हैं।',
          },
        ],
      },
      es: {
        word: 'leche',
        question: '¿Te gusta la leche? ¿Cuándo la bebes?',
        examples: [
          {
            en: 'I drink a glass of milk every morning.',
            native: 'Bebo un vaso de leche cada mañana.',
          },
          {
            en: 'My little sister likes warm milk.',
            native: 'A mi hermana pequeña le gusta la leche caliente.',
          },
          {
            en: 'We buy milk from the shop.',
            native: 'Compramos leche en la tienda.',
          },
        ],
      },
      zh: {
        word: '牛奶',
        question: '你喜欢牛奶吗？你什么时候喝？',
        examples: [
          {
            en: 'I drink a glass of milk every morning.',
            native: '我每天早上喝一杯牛奶。',
          },
          {
            en: 'My little sister likes warm milk.',
            native: '我妹妹喜欢喝热牛奶。',
          },
          {
            en: 'We buy milk from the shop.',
            native: '我们从商店买牛奶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'tea',
    questionText: 'Talk about tea. Do you drink tea?',
    translations: {
      te: {
        word: 'టీ',
        question: 'టీ గురించి మాట్లాడండి. మీరు టీ తాగుతారా?',
        examples: [
          {
            en: 'My father drinks tea every morning.',
            native: 'నా నాన్న ప్రతి ఉదయం టీ తాగుతారు.',
          },
          {
            en: 'I like tea with milk and sugar.',
            native: 'నాకు పాలు, చక్కెర కలిపిన టీ ఇష్టం.',
          },
          {
            en: 'We make tea for our guests.',
            native: 'మేము మా అతిథుల కోసం టీ తయారు చేస్తాము.',
          },
        ],
      },
      hi: {
        word: 'चाय',
        question: 'चाय के बारे में बताइए। क्या आप चाय पीते हैं?',
        examples: [
          {
            en: 'My father drinks tea every morning.',
            native: 'मेरे पिता हर सुबह चाय पीते हैं।',
          },
          {
            en: 'I like tea with milk and sugar.',
            native: 'मुझे दूध और चीनी वाली चाय पसंद है।',
          },
          {
            en: 'We make tea for our guests.',
            native: 'हम अपने मेहमानों के लिए चाय बनाते हैं।',
          },
        ],
      },
      es: {
        word: 'té',
        question: 'Habla del té. ¿Bebes té?',
        examples: [
          {
            en: 'My father drinks tea every morning.',
            native: 'Mi padre bebe té cada mañana.',
          },
          {
            en: 'I like tea with milk and sugar.',
            native: 'Me gusta el té con leche y azúcar.',
          },
          {
            en: 'We make tea for our guests.',
            native: 'Preparamos té para nuestros invitados.',
          },
        ],
      },
      zh: {
        word: '茶',
        question: '谈谈茶。你喝茶吗？',
        examples: [
          {
            en: 'My father drinks tea every morning.',
            native: '我爸爸每天早上喝茶。',
          },
          {
            en: 'I like tea with milk and sugar.',
            native: '我喜欢加牛奶和糖的茶。',
          },
          {
            en: 'We make tea for our guests.',
            native: '我们为客人泡茶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'coffee',
    questionText: 'Do you like coffee? Why or why not?',
    translations: {
      te: {
        word: 'కాఫీ',
        question: 'మీకు కాఫీ ఇష్టమా? ఎందుకు లేదా ఎందుకు కాదు?',
        examples: [
          {
            en: 'I drink coffee in the morning.',
            native: 'నేను ఉదయం కాఫీ తాగుతాను.',
          },
          {
            en: 'My mother does not drink coffee.',
            native: 'నా అమ్మ కాఫీ తాగదు.',
          },
          {
            en: 'This coffee is hot and sweet.',
            native: 'ఈ కాఫీ వేడిగా మరియు తీపిగా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'कॉफ़ी',
        question: 'क्या आपको कॉफ़ी पसंद है? क्यों या क्यों नहीं?',
        examples: [
          {
            en: 'I drink coffee in the morning.',
            native: 'मैं सुबह कॉफ़ी पीता हूँ।',
          },
          {
            en: 'My mother does not drink coffee.',
            native: 'मेरी माँ कॉफ़ी नहीं पीतीं।',
          },
          {
            en: 'This coffee is hot and sweet.',
            native: 'यह कॉफ़ी गर्म और मीठी है।',
          },
        ],
      },
      es: {
        word: 'café',
        question: '¿Te gusta el café? ¿Por qué sí o por qué no?',
        examples: [
          {
            en: 'I drink coffee in the morning.',
            native: 'Bebo café por la mañana.',
          },
          {
            en: 'My mother does not drink coffee.',
            native: 'Mi madre no bebe café.',
          },
          {
            en: 'This coffee is hot and sweet.',
            native: 'Este café está caliente y dulce.',
          },
        ],
      },
      zh: {
        word: '咖啡',
        question: '你喜欢咖啡吗？为什么喜欢或不喜欢？',
        examples: [
          {
            en: 'I drink coffee in the morning.',
            native: '我早上喝咖啡。',
          },
          {
            en: 'My mother does not drink coffee.',
            native: '我妈妈不喝咖啡。',
          },
          {
            en: 'This coffee is hot and sweet.',
            native: '这咖啡又热又甜。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'juice',
    questionText: 'What juice do you like?',
    translations: {
      te: {
        word: 'జ్యూస్',
        question: 'మీకు ఏ జ్యూస్ ఇష్టం?',
        examples: [
          {
            en: 'I like orange juice very much.',
            native: 'నాకు ఆరెంజ్ జ్యూస్ చాలా ఇష్టం.',
          },
          {
            en: 'My mother makes fresh juice at home.',
            native: 'నా అమ్మ ఇంట్లో తాజా జ్యూస్ తయారు చేస్తుంది.',
          },
          {
            en: 'We drink juice after lunch.',
            native: 'మేము మధ్యాహ్న భోజనం తర్వాత జ్యూస్ తాగుతాము.',
          },
        ],
      },
      hi: {
        word: 'जूस',
        question: 'आपको कौन सा जूस पसंद है?',
        examples: [
          {
            en: 'I like orange juice very much.',
            native: 'मुझे संतरे का जूस बहुत पसंद है।',
          },
          {
            en: 'My mother makes fresh juice at home.',
            native: 'मेरी माँ घर पर ताज़ा जूस बनाती हैं।',
          },
          {
            en: 'We drink juice after lunch.',
            native: 'हम दोपहर के भोजन के बाद जूस पीते हैं।',
          },
        ],
      },
      es: {
        word: 'zumo',
        question: '¿Qué zumo te gusta?',
        examples: [
          {
            en: 'I like orange juice very much.',
            native: 'Me gusta mucho el zumo de naranja.',
          },
          {
            en: 'My mother makes fresh juice at home.',
            native: 'Mi madre hace zumo fresco en casa.',
          },
          {
            en: 'We drink juice after lunch.',
            native: 'Bebemos zumo después del almuerzo.',
          },
        ],
      },
      zh: {
        word: '果汁',
        question: '你喜欢什么果汁？',
        examples: [
          {
            en: 'I like orange juice very much.',
            native: '我非常喜欢橙汁。',
          },
          {
            en: 'My mother makes fresh juice at home.',
            native: '我妈妈在家做新鲜果汁。',
          },
          {
            en: 'We drink juice after lunch.',
            native: '我们午饭后喝果汁。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'fruit',
    questionText: 'What fruit do you like?',
    translations: {
      te: {
        word: 'పండు',
        question: 'మీకు ఏ పండు ఇష్టం?',
        examples: [
          {
            en: 'I like mangoes and bananas.',
            native: 'నాకు మామిడి పండ్లు మరియు అరటి పండ్లు ఇష్టం.',
          },
          {
            en: 'Fruit is good for our health.',
            native: 'పండ్లు మన ఆరోగ్యానికి మంచివి.',
          },
          {
            en: 'We buy fruit at the market.',
            native: 'మేము మార్కెట్లో పండ్లు కొంటాము.',
          },
        ],
      },
      hi: {
        word: 'फल',
        question: 'आपको कौन सा फल पसंद है?',
        examples: [
          {
            en: 'I like mangoes and bananas.',
            native: 'मुझे आम और केले पसंद हैं।',
          },
          {
            en: 'Fruit is good for our health.',
            native: 'फल हमारे स्वास्थ्य के लिए अच्छा होता है।',
          },
          {
            en: 'We buy fruit at the market.',
            native: 'हम बाज़ार से फल खरीदते हैं।',
          },
        ],
      },
      es: {
        word: 'fruta',
        question: '¿Qué fruta te gusta?',
        examples: [
          {
            en: 'I like mangoes and bananas.',
            native: 'Me gustan los mangos y los plátanos.',
          },
          {
            en: 'Fruit is good for our health.',
            native: 'La fruta es buena para nuestra salud.',
          },
          {
            en: 'We buy fruit at the market.',
            native: 'Compramos fruta en el mercado.',
          },
        ],
      },
      zh: {
        word: '水果',
        question: '你喜欢什么水果？',
        examples: [
          {
            en: 'I like mangoes and bananas.',
            native: '我喜欢芒果和香蕉。',
          },
          {
            en: 'Fruit is good for our health.',
            native: '水果对我们的健康有好处。',
          },
          {
            en: 'We buy fruit at the market.',
            native: '我们在市场买水果。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'apple',
    questionText: 'Do you like apples? Why?',
    translations: {
      te: {
        word: 'యాపిల్',
        question: 'మీకు యాపిల్ పండ్లు ఇష్టమా? ఎందుకు?',
        examples: [
          {
            en: 'I eat an apple every day.',
            native: 'నేను ప్రతిరోజూ ఒక యాపిల్ తింటాను.',
          },
          {
            en: 'The red apple is sweet.',
            native: 'ఎర్రటి యాపిల్ తీపిగా ఉంటుంది.',
          },
          {
            en: 'My brother likes green apples.',
            native: 'నా తమ్ముడికి ఆకుపచ్చ యాపిల్స్ ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'सेब',
        question: 'क्या आपको सेब पसंद हैं? क्यों?',
        examples: [
          {
            en: 'I eat an apple every day.',
            native: 'मैं रोज़ एक सेब खाता हूँ।',
          },
          {
            en: 'The red apple is sweet.',
            native: 'लाल सेब मीठा होता है।',
          },
          {
            en: 'My brother likes green apples.',
            native: 'मेरे भाई को हरे सेब पसंद हैं।',
          },
        ],
      },
      es: {
        word: 'manzana',
        question: '¿Te gustan las manzanas? ¿Por qué?',
        examples: [
          {
            en: 'I eat an apple every day.',
            native: 'Como una manzana todos los días.',
          },
          {
            en: 'The red apple is sweet.',
            native: 'La manzana roja es dulce.',
          },
          {
            en: 'My brother likes green apples.',
            native: 'A mi hermano le gustan las manzanas verdes.',
          },
        ],
      },
      zh: {
        word: '苹果',
        question: '你喜欢苹果吗？为什么？',
        examples: [
          {
            en: 'I eat an apple every day.',
            native: '我每天吃一个苹果。',
          },
          {
            en: 'The red apple is sweet.',
            native: '红苹果很甜。',
          },
          {
            en: 'My brother likes green apples.',
            native: '我哥哥喜欢青苹果。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'banana',
    questionText: 'Talk about bananas. Do you eat them often?',
    translations: {
      te: {
        word: 'అరటి పండు',
        question: 'అరటి పండ్ల గురించి మాట్లాడండి. మీరు వాటిని తరచుగా తింటారా?',
        examples: [
          {
            en: 'Bananas are yellow and sweet.',
            native: 'అరటి పండ్లు పసుపు రంగులో మరియు తీపిగా ఉంటాయి.',
          },
          {
            en: 'I eat a banana after lunch.',
            native: 'నేను మధ్యాహ్న భోజనం తర్వాత అరటి పండు తింటాను.',
          },
          {
            en: 'Monkeys like to eat bananas.',
            native: 'కోతులు అరటి పండ్లు తినడానికి ఇష్టపడతాయి.',
          },
        ],
      },
      hi: {
        word: 'केला',
        question: 'केलों के बारे में बताइए। क्या आप उन्हें अक्सर खाते हैं?',
        examples: [
          {
            en: 'Bananas are yellow and sweet.',
            native: 'केले पीले और मीठे होते हैं।',
          },
          {
            en: 'I eat a banana after lunch.',
            native: 'मैं दोपहर के भोजन के बाद एक केला खाता हूँ।',
          },
          {
            en: 'Monkeys like to eat bananas.',
            native: 'बंदरों को केले खाना पसंद है।',
          },
        ],
      },
      es: {
        word: 'plátano',
        question: 'Habla de los plátanos. ¿Los comes a menudo?',
        examples: [
          {
            en: 'Bananas are yellow and sweet.',
            native: 'Los plátanos son amarillos y dulces.',
          },
          {
            en: 'I eat a banana after lunch.',
            native: 'Como un plátano después del almuerzo.',
          },
          {
            en: 'Monkeys like to eat bananas.',
            native: 'A los monos les gusta comer plátanos.',
          },
        ],
      },
      zh: {
        word: '香蕉',
        question: '谈谈香蕉。你经常吃吗？',
        examples: [
          {
            en: 'Bananas are yellow and sweet.',
            native: '香蕉又黄又甜。',
          },
          {
            en: 'I eat a banana after lunch.',
            native: '我午饭后吃一根香蕉。',
          },
          {
            en: 'Monkeys like to eat bananas.',
            native: '猴子喜欢吃香蕉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'mango',
    questionText: 'Do you like mangoes? When do you eat them?',
    translations: {
      te: {
        word: 'మామిడి పండు',
        question: 'మీకు మామిడి పండ్లు ఇష్టమా? మీరు వాటిని ఎప్పుడు తింటారు?',
        examples: [
          {
            en: 'The mango is my favourite fruit.',
            native: 'మామిడి పండు నా ఇష్టమైన పండు.',
          },
          {
            en: 'We eat mangoes in summer.',
            native: 'మేము వేసవిలో మామిడి పండ్లు తింటాము.',
          },
          {
            en: 'My grandfather has a mango tree.',
            native: 'నా తాతయ్యకు ఒక మామిడి చెట్టు ఉంది.',
          },
        ],
      },
      hi: {
        word: 'आम',
        question: 'क्या आपको आम पसंद हैं? आप उन्हें कब खाते हैं?',
        examples: [
          {
            en: 'The mango is my favourite fruit.',
            native: 'आम मेरा पसंदीदा फल है।',
          },
          {
            en: 'We eat mangoes in summer.',
            native: 'हम गर्मियों में आम खाते हैं।',
          },
          {
            en: 'My grandfather has a mango tree.',
            native: 'मेरे दादा के पास एक आम का पेड़ है।',
          },
        ],
      },
      es: {
        word: 'mango',
        question: '¿Te gustan los mangos? ¿Cuándo los comes?',
        examples: [
          {
            en: 'The mango is my favourite fruit.',
            native: 'El mango es mi fruta favorita.',
          },
          {
            en: 'We eat mangoes in summer.',
            native: 'Comemos mangos en verano.',
          },
          {
            en: 'My grandfather has a mango tree.',
            native: 'Mi abuelo tiene un árbol de mango.',
          },
        ],
      },
      zh: {
        word: '芒果',
        question: '你喜欢芒果吗？你什么时候吃？',
        examples: [
          {
            en: 'The mango is my favourite fruit.',
            native: '芒果是我最喜欢的水果。',
          },
          {
            en: 'We eat mangoes in summer.',
            native: '我们夏天吃芒果。',
          },
          {
            en: 'My grandfather has a mango tree.',
            native: '我爷爷有一棵芒果树。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'orange',
    questionText: 'Do you like oranges?',
    translations: {
      te: {
        word: 'ఆరెంజ్',
        question: 'మీకు ఆరెంజ్ పండ్లు ఇష్టమా?',
        examples: [
          {
            en: 'I like sweet oranges.',
            native: 'నాకు తీపి ఆరెంజ్ పండ్లు ఇష్టం.',
          },
          {
            en: 'An orange has a lot of juice.',
            native: 'ఆరెంజ్ పండులో చాలా రసం ఉంటుంది.',
          },
          {
            en: 'She eats an orange every morning.',
            native: 'ఆమె ప్రతి ఉదయం ఒక ఆరెంజ్ తింటుంది.',
          },
        ],
      },
      hi: {
        word: 'संतरा',
        question: 'क्या आपको संतरे पसंद हैं?',
        examples: [
          {
            en: 'I like sweet oranges.',
            native: 'मुझे मीठे संतरे पसंद हैं।',
          },
          {
            en: 'An orange has a lot of juice.',
            native: 'संतरे में बहुत रस होता है।',
          },
          {
            en: 'She eats an orange every morning.',
            native: 'वह हर सुबह एक संतरा खाती है।',
          },
        ],
      },
      es: {
        word: 'naranja',
        question: '¿Te gustan las naranjas?',
        examples: [
          {
            en: 'I like sweet oranges.',
            native: 'Me gustan las naranjas dulces.',
          },
          {
            en: 'An orange has a lot of juice.',
            native: 'Una naranja tiene mucho zumo.',
          },
          {
            en: 'She eats an orange every morning.',
            native: 'Ella come una naranja cada mañana.',
          },
        ],
      },
      zh: {
        word: '橙子',
        question: '你喜欢橙子吗？',
        examples: [
          {
            en: 'I like sweet oranges.',
            native: '我喜欢甜橙子。',
          },
          {
            en: 'An orange has a lot of juice.',
            native: '橙子有很多汁。',
          },
          {
            en: 'She eats an orange every morning.',
            native: '她每天早上吃一个橙子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'vegetable',
    questionText: 'What vegetables do you like?',
    translations: {
      te: {
        word: 'కూరగాయ',
        question: 'మీకు ఏ కూరగాయలు ఇష్టం?',
        examples: [
          {
            en: 'I like carrots and beans.',
            native: 'నాకు క్యారెట్లు మరియు బీన్స్ ఇష్టం.',
          },
          {
            en: 'My mother cooks fresh vegetables.',
            native: 'నా అమ్మ తాజా కూరగాయలు వంటుంది.',
          },
          {
            en: 'Vegetables are good for us.',
            native: 'కూరగాయలు మనకు మంచివి.',
          },
        ],
      },
      hi: {
        word: 'सब्ज़ी',
        question: 'आपको कौन सी सब्ज़ियाँ पसंद हैं?',
        examples: [
          {
            en: 'I like carrots and beans.',
            native: 'मुझे गाजर और बीन्स पसंद हैं।',
          },
          {
            en: 'My mother cooks fresh vegetables.',
            native: 'मेरी माँ ताज़ी सब्ज़ियाँ पकाती हैं।',
          },
          {
            en: 'Vegetables are good for us.',
            native: 'सब्ज़ियाँ हमारे लिए अच्छी होती हैं।',
          },
        ],
      },
      es: {
        word: 'verdura',
        question: '¿Qué verduras te gustan?',
        examples: [
          {
            en: 'I like carrots and beans.',
            native: 'Me gustan las zanahorias y las judías.',
          },
          {
            en: 'My mother cooks fresh vegetables.',
            native: 'Mi madre cocina verduras frescas.',
          },
          {
            en: 'Vegetables are good for us.',
            native: 'Las verduras son buenas para nosotros.',
          },
        ],
      },
      zh: {
        word: '蔬菜',
        question: '你喜欢什么蔬菜？',
        examples: [
          {
            en: 'I like carrots and beans.',
            native: '我喜欢胡萝卜和豆角。',
          },
          {
            en: 'My mother cooks fresh vegetables.',
            native: '我妈妈做新鲜的蔬菜。',
          },
          {
            en: 'Vegetables are good for us.',
            native: '蔬菜对我们有好处。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'rice',
    questionText: 'Do you eat rice every day?',
    translations: {
      te: {
        word: 'అన్నం',
        question: 'మీరు ప్రతిరోజూ అన్నం తింటారా?',
        examples: [
          {
            en: 'I eat rice with curry every day.',
            native: 'నేను ప్రతిరోజూ కూరతో అన్నం తింటాను.',
          },
          {
            en: 'Rice grows in the fields.',
            native: 'వరి పొలాల్లో పెరుగుతుంది.',
          },
          {
            en: 'My grandmother cooks tasty rice.',
            native: 'నా అమ్మమ్మ రుచికరమైన అన్నం వంటుంది.',
          },
        ],
      },
      hi: {
        word: 'चावल',
        question: 'क्या आप रोज़ चावल खाते हैं?',
        examples: [
          {
            en: 'I eat rice with curry every day.',
            native: 'मैं रोज़ करी के साथ चावल खाता हूँ।',
          },
          {
            en: 'Rice grows in the fields.',
            native: 'चावल खेतों में उगता है।',
          },
          {
            en: 'My grandmother cooks tasty rice.',
            native: 'मेरी दादी स्वादिष्ट चावल पकाती हैं।',
          },
        ],
      },
      es: {
        word: 'arroz',
        question: '¿Comes arroz todos los días?',
        examples: [
          {
            en: 'I eat rice with curry every day.',
            native: 'Como arroz con curry todos los días.',
          },
          {
            en: 'Rice grows in the fields.',
            native: 'El arroz crece en los campos.',
          },
          {
            en: 'My grandmother cooks tasty rice.',
            native: 'Mi abuela cocina arroz sabroso.',
          },
        ],
      },
      zh: {
        word: '米饭',
        question: '你每天吃米饭吗？',
        examples: [
          {
            en: 'I eat rice with curry every day.',
            native: '我每天吃米饭配咖喱。',
          },
          {
            en: 'Rice grows in the fields.',
            native: '水稻长在田里。',
          },
          {
            en: 'My grandmother cooks tasty rice.',
            native: '我奶奶做的米饭很好吃。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'bread',
    questionText: 'Talk about bread. When do you eat it?',
    translations: {
      te: {
        word: 'బ్రెడ్',
        question: 'బ్రెడ్ గురించి మాట్లాడండి. మీరు దానిని ఎప్పుడు తింటారు?',
        examples: [
          {
            en: 'I eat bread with butter for breakfast.',
            native: 'నేను అల్పాహారంగా వెన్నతో బ్రెడ్ తింటాను.',
          },
          {
            en: 'We buy bread from the bakery.',
            native: 'మేము బేకరీ నుండి బ్రెడ్ కొంటాము.',
          },
          {
            en: 'This bread is soft and fresh.',
            native: 'ఈ బ్రెడ్ మెత్తగా మరియు తాజాగా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'ब्रेड',
        question: 'ब्रेड के बारे में बताइए। आप इसे कब खाते हैं?',
        examples: [
          {
            en: 'I eat bread with butter for breakfast.',
            native: 'मैं नाश्ते में मक्खन के साथ ब्रेड खाता हूँ।',
          },
          {
            en: 'We buy bread from the bakery.',
            native: 'हम बेकरी से ब्रेड खरीदते हैं।',
          },
          {
            en: 'This bread is soft and fresh.',
            native: 'यह ब्रेड नरम और ताज़ा है।',
          },
        ],
      },
      es: {
        word: 'pan',
        question: 'Habla del pan. ¿Cuándo lo comes?',
        examples: [
          {
            en: 'I eat bread with butter for breakfast.',
            native: 'Desayuno pan con mantequilla.',
          },
          {
            en: 'We buy bread from the bakery.',
            native: 'Compramos pan en la panadería.',
          },
          {
            en: 'This bread is soft and fresh.',
            native: 'Este pan es blando y fresco.',
          },
        ],
      },
      zh: {
        word: '面包',
        question: '谈谈面包。你什么时候吃？',
        examples: [
          {
            en: 'I eat bread with butter for breakfast.',
            native: '我早餐吃黄油面包。',
          },
          {
            en: 'We buy bread from the bakery.',
            native: '我们从面包店买面包。',
          },
          {
            en: 'This bread is soft and fresh.',
            native: '这个面包又软又新鲜。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'egg',
    questionText: 'Do you like eggs? How do you eat them?',
    translations: {
      te: {
        word: 'గుడ్డు',
        question: 'మీకు గుడ్లు ఇష్టమా? మీరు వాటిని ఎలా తింటారు?',
        examples: [
          {
            en: 'I eat two boiled eggs for breakfast.',
            native: 'నేను అల్పాహారంగా రెండు ఉడికించిన గుడ్లు తింటాను.',
          },
          {
            en: 'My mother makes an egg curry.',
            native: 'నా అమ్మ గుడ్ల కూర తయారు చేస్తుంది.',
          },
          {
            en: 'Eggs are good for children.',
            native: 'గుడ్లు పిల్లలకు మంచివి.',
          },
        ],
      },
      hi: {
        word: 'अंडा',
        question: 'क्या आपको अंडे पसंद हैं? आप उन्हें कैसे खाते हैं?',
        examples: [
          {
            en: 'I eat two boiled eggs for breakfast.',
            native: 'मैं नाश्ते में दो उबले अंडे खाता हूँ।',
          },
          {
            en: 'My mother makes an egg curry.',
            native: 'मेरी माँ अंडे की करी बनाती हैं।',
          },
          {
            en: 'Eggs are good for children.',
            native: 'अंडे बच्चों के लिए अच्छे होते हैं।',
          },
        ],
      },
      es: {
        word: 'huevo',
        question: '¿Te gustan los huevos? ¿Cómo los comes?',
        examples: [
          {
            en: 'I eat two boiled eggs for breakfast.',
            native: 'Desayuno dos huevos cocidos.',
          },
          {
            en: 'My mother makes an egg curry.',
            native: 'Mi madre hace un curry de huevo.',
          },
          {
            en: 'Eggs are good for children.',
            native: 'Los huevos son buenos para los niños.',
          },
        ],
      },
      zh: {
        word: '鸡蛋',
        question: '你喜欢鸡蛋吗？你怎么吃？',
        examples: [
          {
            en: 'I eat two boiled eggs for breakfast.',
            native: '我早餐吃两个煮鸡蛋。',
          },
          {
            en: 'My mother makes an egg curry.',
            native: '我妈妈做鸡蛋咖喱。',
          },
          {
            en: 'Eggs are good for children.',
            native: '鸡蛋对孩子有好处。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'sugar',
    questionText: 'Do you like sugar in your tea?',
    translations: {
      te: {
        word: 'చక్కెర',
        question: 'మీ టీలో చక్కెర ఇష్టమా?',
        examples: [
          {
            en: 'I like one spoon of sugar in my tea.',
            native: 'నా టీలో ఒక స్పూన్ చక్కెర ఇష్టం.',
          },
          {
            en: 'Sugar makes food sweet.',
            native: 'చక్కెర ఆహారాన్ని తీపిగా చేస్తుంది.',
          },
          {
            en: 'We keep sugar in a box.',
            native: 'మేము చక్కెరను ఒక డబ్బాలో ఉంచుతాము.',
          },
        ],
      },
      hi: {
        word: 'चीनी',
        question: 'क्या आपको अपनी चाय में चीनी पसंद है?',
        examples: [
          {
            en: 'I like one spoon of sugar in my tea.',
            native: 'मुझे अपनी चाय में एक चम्मच चीनी पसंद है।',
          },
          {
            en: 'Sugar makes food sweet.',
            native: 'चीनी खाने को मीठा बनाती है।',
          },
          {
            en: 'We keep sugar in a box.',
            native: 'हम चीनी एक डिब्बे में रखते हैं।',
          },
        ],
      },
      es: {
        word: 'azúcar',
        question: '¿Te gusta el azúcar en tu té?',
        examples: [
          {
            en: 'I like one spoon of sugar in my tea.',
            native: 'Me gusta una cucharada de azúcar en mi té.',
          },
          {
            en: 'Sugar makes food sweet.',
            native: 'El azúcar hace la comida dulce.',
          },
          {
            en: 'We keep sugar in a box.',
            native: 'Guardamos el azúcar en una caja.',
          },
        ],
      },
      zh: {
        word: '糖',
        question: '你喜欢茶里放糖吗？',
        examples: [
          {
            en: 'I like one spoon of sugar in my tea.',
            native: '我喜欢茶里放一勺糖。',
          },
          {
            en: 'Sugar makes food sweet.',
            native: '糖让食物变甜。',
          },
          {
            en: 'We keep sugar in a box.',
            native: '我们把糖放在盒子里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'soup',
    questionText: 'Do you like soup? What soup do you like?',
    translations: {
      te: {
        word: 'సూప్',
        question: 'మీకు సూప్ ఇష్టమా? మీకు ఏ సూప్ ఇష్టం?',
        examples: [
          {
            en: 'I like tomato soup very much.',
            native: 'నాకు టమాటా సూప్ చాలా ఇష్టం.',
          },
          {
            en: 'We drink hot soup in winter.',
            native: 'మేము చలికాలంలో వేడి సూప్ తాగుతాము.',
          },
          {
            en: 'My grandmother makes chicken soup.',
            native: 'నా అమ్మమ్మ చికెన్ సూప్ తయారు చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'सूप',
        question: 'क्या आपको सूप पसंद है? आपको कौन सा सूप पसंद है?',
        examples: [
          {
            en: 'I like tomato soup very much.',
            native: 'मुझे टमाटर का सूप बहुत पसंद है।',
          },
          {
            en: 'We drink hot soup in winter.',
            native: 'हम सर्दियों में गर्म सूप पीते हैं।',
          },
          {
            en: 'My grandmother makes chicken soup.',
            native: 'मेरी दादी चिकन सूप बनाती हैं।',
          },
        ],
      },
      es: {
        word: 'sopa',
        question: '¿Te gusta la sopa? ¿Qué sopa te gusta?',
        examples: [
          {
            en: 'I like tomato soup very much.',
            native: 'Me gusta mucho la sopa de tomate.',
          },
          {
            en: 'We drink hot soup in winter.',
            native: 'Bebemos sopa caliente en invierno.',
          },
          {
            en: 'My grandmother makes chicken soup.',
            native: 'Mi abuela hace sopa de pollo.',
          },
        ],
      },
      zh: {
        word: '汤',
        question: '你喜欢汤吗？你喜欢什么汤？',
        examples: [
          {
            en: 'I like tomato soup very much.',
            native: '我非常喜欢西红柿汤。',
          },
          {
            en: 'We drink hot soup in winter.',
            native: '我们冬天喝热汤。',
          },
          {
            en: 'My grandmother makes chicken soup.',
            native: '我奶奶做鸡汤。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'kitchen',
    questionText: 'Describe your kitchen.',
    translations: {
      te: {
        word: 'వంటగది',
        question: 'మీ వంటగదిని వివరించండి.',
        examples: [
          {
            en: 'Our kitchen is small and clean.',
            native: 'మా వంటగది చిన్నది మరియు శుభ్రంగా ఉంటుంది.',
          },
          {
            en: 'My mother cooks in the kitchen.',
            native: 'నా అమ్మ వంటగదిలో వంట చేస్తుంది.',
          },
          {
            en: 'There is a big window in our kitchen.',
            native: 'మా వంటగదిలో ఒక పెద్ద కిటికీ ఉంది.',
          },
        ],
      },
      hi: {
        word: 'रसोई',
        question: 'अपनी रसोई का वर्णन कीजिए।',
        examples: [
          {
            en: 'Our kitchen is small and clean.',
            native: 'हमारी रसोई छोटी और साफ़ है।',
          },
          {
            en: 'My mother cooks in the kitchen.',
            native: 'मेरी माँ रसोई में खाना बनाती हैं।',
          },
          {
            en: 'There is a big window in our kitchen.',
            native: 'हमारी रसोई में एक बड़ी खिड़की है।',
          },
        ],
      },
      es: {
        word: 'cocina',
        question: 'Describe tu cocina.',
        examples: [
          {
            en: 'Our kitchen is small and clean.',
            native: 'Nuestra cocina es pequeña y limpia.',
          },
          {
            en: 'My mother cooks in the kitchen.',
            native: 'Mi madre cocina en la cocina.',
          },
          {
            en: 'There is a big window in our kitchen.',
            native: 'Hay una ventana grande en nuestra cocina.',
          },
        ],
      },
      zh: {
        word: '厨房',
        question: '描述一下你的厨房。',
        examples: [
          {
            en: 'Our kitchen is small and clean.',
            native: '我们的厨房又小又干净。',
          },
          {
            en: 'My mother cooks in the kitchen.',
            native: '我妈妈在厨房做饭。',
          },
          {
            en: 'There is a big window in our kitchen.',
            native: '我们厨房有一扇大窗户。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'cooking',
    questionText: 'Do you like cooking? What can you cook?',
    translations: {
      te: {
        word: 'వంట',
        question: 'మీకు వంట చేయడం ఇష్టమా? మీరు ఏమి వంటగలరు?',
        examples: [
          {
            en: 'I like cooking with my mother.',
            native: 'నాకు నా అమ్మతో కలిసి వంట చేయడం ఇష్టం.',
          },
          {
            en: 'I can cook rice and eggs.',
            native: 'నేను అన్నం మరియు గుడ్లు వంటగలను.',
          },
          {
            en: 'My father cooks dinner on Sundays.',
            native: 'నా నాన్న ఆదివారాలు రాత్రి భోజనం వంటుతారు.',
          },
        ],
      },
      hi: {
        word: 'खाना बनाना',
        question: 'क्या आपको खाना बनाना पसंद है? आप क्या बना सकते हैं?',
        examples: [
          {
            en: 'I like cooking with my mother.',
            native: 'मुझे अपनी माँ के साथ खाना बनाना पसंद है।',
          },
          {
            en: 'I can cook rice and eggs.',
            native: 'मैं चावल और अंडे बना सकता हूँ।',
          },
          {
            en: 'My father cooks dinner on Sundays.',
            native: 'मेरे पिता रविवार को रात का खाना बनाते हैं।',
          },
        ],
      },
      es: {
        word: 'cocinar',
        question: '¿Te gusta cocinar? ¿Qué puedes cocinar?',
        examples: [
          {
            en: 'I like cooking with my mother.',
            native: 'Me gusta cocinar con mi madre.',
          },
          {
            en: 'I can cook rice and eggs.',
            native: 'Puedo cocinar arroz y huevos.',
          },
          {
            en: 'My father cooks dinner on Sundays.',
            native: 'Mi padre cocina la cena los domingos.',
          },
        ],
      },
      zh: {
        word: '做饭',
        question: '你喜欢做饭吗？你会做什么？',
        examples: [
          {
            en: 'I like cooking with my mother.',
            native: '我喜欢和妈妈一起做饭。',
          },
          {
            en: 'I can cook rice and eggs.',
            native: '我会做米饭和鸡蛋。',
          },
          {
            en: 'My father cooks dinner on Sundays.',
            native: '我爸爸星期天做晚饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'cup',
    questionText: 'What do you drink from a cup?',
    translations: {
      te: {
        word: 'కప్పు',
        question: 'మీరు కప్పులో ఏమి తాగుతారు?',
        examples: [
          {
            en: 'I drink tea from a cup.',
            native: 'నేను కప్పులో టీ తాగుతాను.',
          },
          {
            en: 'There are six cups on the table.',
            native: 'బల్ల మీద ఆరు కప్పులు ఉన్నాయి.',
          },
          {
            en: 'This blue cup is mine.',
            native: 'ఈ నీలం కప్పు నాది.',
          },
        ],
      },
      hi: {
        word: 'कप',
        question: 'आप कप में क्या पीते हैं?',
        examples: [
          {
            en: 'I drink tea from a cup.',
            native: 'मैं कप में चाय पीता हूँ।',
          },
          {
            en: 'There are six cups on the table.',
            native: 'मेज़ पर छह कप हैं।',
          },
          {
            en: 'This blue cup is mine.',
            native: 'यह नीला कप मेरा है।',
          },
        ],
      },
      es: {
        word: 'taza',
        question: '¿Qué bebes en una taza?',
        examples: [
          {
            en: 'I drink tea from a cup.',
            native: 'Bebo té en una taza.',
          },
          {
            en: 'There are six cups on the table.',
            native: 'Hay seis tazas en la mesa.',
          },
          {
            en: 'This blue cup is mine.',
            native: 'Esta taza azul es mía.',
          },
        ],
      },
      zh: {
        word: '杯子',
        question: '你用杯子喝什么？',
        examples: [
          {
            en: 'I drink tea from a cup.',
            native: '我用杯子喝茶。',
          },
          {
            en: 'There are six cups on the table.',
            native: '桌子上有六个杯子。',
          },
          {
            en: 'This blue cup is mine.',
            native: '这个蓝色的杯子是我的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'plate',
    questionText: 'Talk about plates in your home.',
    translations: {
      te: {
        word: 'పళ్ళెం',
        question: 'మీ ఇంట్లోని పళ్ళెముల గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'We eat rice from big plates.',
            native: 'మేము పెద్ద పళ్ళెముల్లో అన్నం తింటాము.',
          },
          {
            en: 'I wash the plates after dinner.',
            native: 'నేను రాత్రి భోజనం తర్వాత పళ్ళెములు కడుగుతాను.',
          },
          {
            en: 'There are many plates in the kitchen.',
            native: 'వంటగదిలో చాలా పళ్ళెములు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'प्लेट',
        question: 'अपने घर की प्लेटों के बारे में बताइए।',
        examples: [
          {
            en: 'We eat rice from big plates.',
            native: 'हम बड़ी प्लेटों में चावल खाते हैं।',
          },
          {
            en: 'I wash the plates after dinner.',
            native: 'मैं रात के खाने के बाद प्लेटें धोता हूँ।',
          },
          {
            en: 'There are many plates in the kitchen.',
            native: 'रसोई में बहुत सारी प्लेटें हैं।',
          },
        ],
      },
      es: {
        word: 'plato',
        question: 'Habla de los platos de tu casa.',
        examples: [
          {
            en: 'We eat rice from big plates.',
            native: 'Comemos arroz en platos grandes.',
          },
          {
            en: 'I wash the plates after dinner.',
            native: 'Lavo los platos después de la cena.',
          },
          {
            en: 'There are many plates in the kitchen.',
            native: 'Hay muchos platos en la cocina.',
          },
        ],
      },
      zh: {
        word: '盘子',
        question: '谈谈你家里的盘子。',
        examples: [
          {
            en: 'We eat rice from big plates.',
            native: '我们用大盘子吃米饭。',
          },
          {
            en: 'I wash the plates after dinner.',
            native: '我晚饭后洗盘子。',
          },
          {
            en: 'There are many plates in the kitchen.',
            native: '厨房里有很多盘子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'spoon',
    questionText: 'What do you do with a spoon?',
    translations: {
      te: {
        word: 'చెంచా',
        question: 'మీరు చెంచాతో ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I eat soup with a spoon.',
            native: 'నేను చెంచాతో సూప్ తింటాను.',
          },
          {
            en: 'The baby has a small spoon.',
            native: 'పాపకు ఒక చిన్న చెంచా ఉంది.',
          },
          {
            en: 'There is a spoon next to the plate.',
            native: 'పళ్ళెం పక్కన ఒక చెంచా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'चम्मच',
        question: 'आप चम्मच से क्या करते हैं?',
        examples: [
          {
            en: 'I eat soup with a spoon.',
            native: 'मैं चम्मच से सूप खाता हूँ।',
          },
          {
            en: 'The baby has a small spoon.',
            native: 'बच्चे के पास एक छोटा चम्मच है।',
          },
          {
            en: 'There is a spoon next to the plate.',
            native: 'प्लेट के पास एक चम्मच है।',
          },
        ],
      },
      es: {
        word: 'cuchara',
        question: '¿Qué haces con una cuchara?',
        examples: [
          {
            en: 'I eat soup with a spoon.',
            native: 'Como la sopa con una cuchara.',
          },
          {
            en: 'The baby has a small spoon.',
            native: 'El bebé tiene una cuchara pequeña.',
          },
          {
            en: 'There is a spoon next to the plate.',
            native: 'Hay una cuchara junto al plato.',
          },
        ],
      },
      zh: {
        word: '勺子',
        question: '你用勺子做什么？',
        examples: [
          {
            en: 'I eat soup with a spoon.',
            native: '我用勺子喝汤。',
          },
          {
            en: 'The baby has a small spoon.',
            native: '宝宝有一把小勺子。',
          },
          {
            en: 'There is a spoon next to the plate.',
            native: '盘子旁边有一把勺子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'hand',
    questionText: 'Talk about your hands. What can you do with them?',
    translations: {
      te: {
        word: 'చేయి',
        question: 'మీ చేతుల గురించి మాట్లాడండి. మీరు వాటితో ఏమి చేయగలరు?',
        examples: [
          {
            en: 'I wash my hands before eating.',
            native: 'నేను తినడానికి ముందు చేతులు కడుక్కుంటాను.',
          },
          {
            en: 'I write with my right hand.',
            native: 'నేను నా కుడి చేతితో వ్రాస్తాను.',
          },
          {
            en: 'She claps her hands in the game.',
            native: 'ఆమె ఆటలో చేతులు చప్పట్లు కొడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'हाथ',
        question: 'अपने हाथों के बारे में बताइए। आप उनसे क्या कर सकते हैं?',
        examples: [
          {
            en: 'I wash my hands before eating.',
            native: 'मैं खाने से पहले अपने हाथ धोता हूँ।',
          },
          {
            en: 'I write with my right hand.',
            native: 'मैं अपने दाएँ हाथ से लिखता हूँ।',
          },
          {
            en: 'She claps her hands in the game.',
            native: 'वह खेल में अपने हाथों से ताली बजाती है।',
          },
        ],
      },
      es: {
        word: 'mano',
        question: 'Habla de tus manos. ¿Qué puedes hacer con ellas?',
        examples: [
          {
            en: 'I wash my hands before eating.',
            native: 'Me lavo las manos antes de comer.',
          },
          {
            en: 'I write with my right hand.',
            native: 'Escribo con la mano derecha.',
          },
          {
            en: 'She claps her hands in the game.',
            native: 'Ella aplaude en el juego.',
          },
        ],
      },
      zh: {
        word: '手',
        question: '谈谈你的手。你能用它们做什么？',
        examples: [
          {
            en: 'I wash my hands before eating.',
            native: '我吃饭前洗手。',
          },
          {
            en: 'I write with my right hand.',
            native: '我用右手写字。',
          },
          {
            en: 'She claps her hands in the game.',
            native: '她在游戏中拍手。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'eye',
    questionText: 'Talk about your eyes. What colour are they?',
    translations: {
      te: {
        word: 'కన్ను',
        question: 'మీ కళ్ల గురించి మాట్లాడండి. అవి ఏ రంగులో ఉన్నాయి?',
        examples: [
          {
            en: 'My eyes are black.',
            native: 'నా కళ్లు నల్లగా ఉన్నాయి.',
          },
          {
            en: 'I can see birds with my eyes.',
            native: 'నేను నా కళ్లతో పక్షులను చూడగలను.',
          },
          {
            en: 'She closes her eyes and sleeps.',
            native: 'ఆమె కళ్లు మూసుకుని నిద్రపోతుంది.',
          },
        ],
      },
      hi: {
        word: 'आँख',
        question: 'अपनी आँखों के बारे में बताइए। वे किस रंग की हैं?',
        examples: [
          {
            en: 'My eyes are black.',
            native: 'मेरी आँखें काली हैं।',
          },
          {
            en: 'I can see birds with my eyes.',
            native: 'मैं अपनी आँखों से पक्षियों को देख सकता हूँ।',
          },
          {
            en: 'She closes her eyes and sleeps.',
            native: 'वह अपनी आँखें बंद करके सोती है।',
          },
        ],
      },
      es: {
        word: 'ojo',
        question: 'Habla de tus ojos. ¿De qué color son?',
        examples: [
          {
            en: 'My eyes are black.',
            native: 'Mis ojos son negros.',
          },
          {
            en: 'I can see birds with my eyes.',
            native: 'Puedo ver pájaros con mis ojos.',
          },
          {
            en: 'She closes her eyes and sleeps.',
            native: 'Ella cierra los ojos y duerme.',
          },
        ],
      },
      zh: {
        word: '眼睛',
        question: '谈谈你的眼睛。它们是什么颜色的？',
        examples: [
          {
            en: 'My eyes are black.',
            native: '我的眼睛是黑色的。',
          },
          {
            en: 'I can see birds with my eyes.',
            native: '我能用眼睛看鸟。',
          },
          {
            en: 'She closes her eyes and sleeps.',
            native: '她闭上眼睛睡觉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'hair',
    questionText: 'Talk about your hair. Is it long or short?',
    translations: {
      te: {
        word: 'జుట్టు',
        question: 'మీ జుట్టు గురించి మాట్లాడండి. అది పొడవుగా ఉందా లేదా పొట్టిగా ఉందా?',
        examples: [
          {
            en: 'My hair is black and long.',
            native: 'నా జుట్టు నల్లగా మరియు పొడవుగా ఉంది.',
          },
          {
            en: 'I comb my hair every morning.',
            native: 'నేను ప్రతి ఉదయం జుట్టు దువ్వుకుంటాను.',
          },
          {
            en: 'My brother has short hair.',
            native: 'నా తమ్ముడికి పొట్టి జుట్టు ఉంది.',
          },
        ],
      },
      hi: {
        word: 'बाल',
        question: 'अपने बालों के बारे में बताइए। वे लंबे हैं या छोटे?',
        examples: [
          {
            en: 'My hair is black and long.',
            native: 'मेरे बाल काले और लंबे हैं।',
          },
          {
            en: 'I comb my hair every morning.',
            native: 'मैं हर सुबह अपने बालों में कंघी करता हूँ।',
          },
          {
            en: 'My brother has short hair.',
            native: 'मेरे भाई के बाल छोटे हैं।',
          },
        ],
      },
      es: {
        word: 'pelo',
        question: 'Habla de tu pelo. ¿Es largo o corto?',
        examples: [
          {
            en: 'My hair is black and long.',
            native: 'Mi pelo es negro y largo.',
          },
          {
            en: 'I comb my hair every morning.',
            native: 'Me peino cada mañana.',
          },
          {
            en: 'My brother has short hair.',
            native: 'Mi hermano tiene el pelo corto.',
          },
        ],
      },
      zh: {
        word: '头发',
        question: '谈谈你的头发。是长还是短？',
        examples: [
          {
            en: 'My hair is black and long.',
            native: '我的头发又黑又长。',
          },
          {
            en: 'I comb my hair every morning.',
            native: '我每天早上梳头。',
          },
          {
            en: 'My brother has short hair.',
            native: '我哥哥留短发。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'face',
    questionText: 'Talk about your face. What can you do with it?',
    translations: {
      te: {
        word: 'ముఖం',
        question: 'మీ ముఖం గురించి మాట్లాడండి. మీరు దానితో ఏమి చేయగలరు?',
        examples: [
          {
            en: 'I wash my face with cold water.',
            native: 'నేను చల్లని నీటితో ముఖం కడుక్కుంటాను.',
          },
          {
            en: 'She smiles with her happy face.',
            native: 'ఆమె తన సంతోషమైన ముఖంతో నవ్వుతుంది.',
          },
          {
            en: 'The baby has a round face.',
            native: 'పాపకు గుండ్రని ముఖం ఉంది.',
          },
        ],
      },
      hi: {
        word: 'चेहरा',
        question: 'अपने चेहरे के बारे में बताइए। आप इससे क्या कर सकते हैं?',
        examples: [
          {
            en: 'I wash my face with cold water.',
            native: 'मैं ठंडे पानी से अपना चेहरा धोता हूँ।',
          },
          {
            en: 'She smiles with her happy face.',
            native: 'वह अपने खुश चेहरे से मुस्कुराती है।',
          },
          {
            en: 'The baby has a round face.',
            native: 'बच्चे का चेहरा गोल है।',
          },
        ],
      },
      es: {
        word: 'cara',
        question: 'Habla de tu cara. ¿Qué puedes hacer con ella?',
        examples: [
          {
            en: 'I wash my face with cold water.',
            native: 'Me lavo la cara con agua fría.',
          },
          {
            en: 'She smiles with her happy face.',
            native: 'Ella sonríe con su cara feliz.',
          },
          {
            en: 'The baby has a round face.',
            native: 'El bebé tiene la cara redonda.',
          },
        ],
      },
      zh: {
        word: '脸',
        question: '谈谈你的脸。你能用它做什么？',
        examples: [
          {
            en: 'I wash my face with cold water.',
            native: '我用冷水洗脸。',
          },
          {
            en: 'She smiles with her happy face.',
            native: '她用开心的脸微笑。',
          },
          {
            en: 'The baby has a round face.',
            native: '宝宝有一张圆圆的脸。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'teeth',
    questionText: 'How do you keep your teeth clean?',
    translations: {
      te: {
        word: 'పళ్లు',
        question: 'మీరు మీ పళ్లను ఎలా శుభ్రంగా ఉంచుతారు?',
        examples: [
          {
            en: 'I brush my teeth two times a day.',
            native: 'నేను రోజుకు రెండుసార్లు పళ్లు తోముకుంటాను.',
          },
          {
            en: 'My teeth are white and strong.',
            native: 'నా పళ్లు తెల్లగా మరియు బలంగా ఉన్నాయి.',
          },
          {
            en: 'The dentist checks my teeth.',
            native: 'దంతవైద్యుడు నా పళ్లను పరిశీలిస్తారు.',
          },
        ],
      },
      hi: {
        word: 'दाँत',
        question: 'आप अपने दाँतों को कैसे साफ़ रखते हैं?',
        examples: [
          {
            en: 'I brush my teeth two times a day.',
            native: 'मैं दिन में दो बार दाँत साफ़ करता हूँ।',
          },
          {
            en: 'My teeth are white and strong.',
            native: 'मेरे दाँत सफ़ेद और मज़बूत हैं।',
          },
          {
            en: 'The dentist checks my teeth.',
            native: 'दंतचिकित्सक मेरे दाँतों की जाँच करते हैं।',
          },
        ],
      },
      es: {
        word: 'dientes',
        question: '¿Cómo mantienes limpios tus dientes?',
        examples: [
          {
            en: 'I brush my teeth two times a day.',
            native: 'Me cepillo los dientes dos veces al día.',
          },
          {
            en: 'My teeth are white and strong.',
            native: 'Mis dientes son blancos y fuertes.',
          },
          {
            en: 'The dentist checks my teeth.',
            native: 'El dentista revisa mis dientes.',
          },
        ],
      },
      zh: {
        word: '牙齿',
        question: '你怎么保持牙齿清洁？',
        examples: [
          {
            en: 'I brush my teeth two times a day.',
            native: '我每天刷两次牙。',
          },
          {
            en: 'My teeth are white and strong.',
            native: '我的牙齿又白又结实。',
          },
          {
            en: 'The dentist checks my teeth.',
            native: '牙医检查我的牙齿。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'leg',
    questionText: 'Talk about your legs. What can you do with them?',
    translations: {
      te: {
        word: 'కాలు',
        question: 'మీ కాళ్ల గురించి మాట్లాడండి. మీరు వాటితో ఏమి చేయగలరు?',
        examples: [
          {
            en: 'I walk to school on my legs.',
            native: 'నేను నడిచి పాఠశాలకు వెళ్తాను.',
          },
          {
            en: 'He runs fast with his long legs.',
            native: 'అతను తన పొడవైన కాళ్లతో వేగంగా పరుగెత్తుతాడు.',
          },
          {
            en: 'My leg hurts after the game.',
            native: 'ఆట తర్వాత నా కాలు నొప్పిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'टाँग',
        question: 'अपनी टाँगों के बारे में बताइए। आप उनसे क्या कर सकते हैं?',
        examples: [
          {
            en: 'I walk to school on my legs.',
            native: 'मैं अपनी टाँगों से स्कूल चलकर जाता हूँ।',
          },
          {
            en: 'He runs fast with his long legs.',
            native: 'वह अपनी लंबी टाँगों से तेज़ दौड़ता है।',
          },
          {
            en: 'My leg hurts after the game.',
            native: 'खेल के बाद मेरी टाँग में दर्द होता है।',
          },
        ],
      },
      es: {
        word: 'pierna',
        question: 'Habla de tus piernas. ¿Qué puedes hacer con ellas?',
        examples: [
          {
            en: 'I walk to school on my legs.',
            native: 'Camino a la escuela con mis piernas.',
          },
          {
            en: 'He runs fast with his long legs.',
            native: 'Él corre rápido con sus piernas largas.',
          },
          {
            en: 'My leg hurts after the game.',
            native: 'Me duele la pierna después del partido.',
          },
        ],
      },
      zh: {
        word: '腿',
        question: '谈谈你的腿。你能用它们做什么？',
        examples: [
          {
            en: 'I walk to school on my legs.',
            native: '我用腿走路去学校。',
          },
          {
            en: 'He runs fast with his long legs.',
            native: '他用长腿跑得很快。',
          },
          {
            en: 'My leg hurts after the game.',
            native: '比赛后我的腿疼。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'shirt',
    questionText: 'Describe your favourite shirt.',
    translations: {
      te: {
        word: 'చొక్కా',
        question: 'మీకు ఇష్టమైన చొక్కాను వివరించండి.',
        examples: [
          {
            en: 'My favourite shirt is blue.',
            native: 'నాకు ఇష్టమైన చొక్కా నీలం రంగులో ఉంటుంది.',
          },
          {
            en: 'This shirt has white buttons.',
            native: 'ఈ చొక్కాకు తెల్లని బటన్లు ఉన్నాయి.',
          },
          {
            en: 'I wear a clean shirt every day.',
            native: 'నేను ప్రతిరోజూ శుభ్రమైన చొక్కా ధరిస్తాను.',
          },
        ],
      },
      hi: {
        word: 'कमीज़',
        question: 'अपनी पसंदीदा कमीज़ का वर्णन कीजिए।',
        examples: [
          {
            en: 'My favourite shirt is blue.',
            native: 'मेरी पसंदीदा कमीज़ नीली है।',
          },
          {
            en: 'This shirt has white buttons.',
            native: 'इस कमीज़ में सफ़ेद बटन हैं।',
          },
          {
            en: 'I wear a clean shirt every day.',
            native: 'मैं रोज़ साफ़ कमीज़ पहनता हूँ।',
          },
        ],
      },
      es: {
        word: 'camisa',
        question: 'Describe tu camisa favorita.',
        examples: [
          {
            en: 'My favourite shirt is blue.',
            native: 'Mi camisa favorita es azul.',
          },
          {
            en: 'This shirt has white buttons.',
            native: 'Esta camisa tiene botones blancos.',
          },
          {
            en: 'I wear a clean shirt every day.',
            native: 'Llevo una camisa limpia todos los días.',
          },
        ],
      },
      zh: {
        word: '衬衫',
        question: '描述一下你最喜欢的衬衫。',
        examples: [
          {
            en: 'My favourite shirt is blue.',
            native: '我最喜欢的衬衫是蓝色的。',
          },
          {
            en: 'This shirt has white buttons.',
            native: '这件衬衫有白色的扣子。',
          },
          {
            en: 'I wear a clean shirt every day.',
            native: '我每天穿干净的衬衫。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'dress',
    questionText: 'Describe a dress you like.',
    translations: {
      te: {
        word: 'ఫ్రాక్',
        question: 'మీకు నచ్చిన ఫ్రాక్‌ను వివరించండి.',
        examples: [
          {
            en: 'My sister has a red dress.',
            native: 'నా చెల్లెలకు ఎరుపు రంగు ఫ్రాక్ ఉంది.',
          },
          {
            en: 'She wears the dress on her birthday.',
            native: 'ఆమె తన పుట్టినరోజున ఆ ఫ్రాక్ ధరిస్తుంది.',
          },
          {
            en: 'This dress is very pretty.',
            native: 'ఈ ఫ్రాక్ చాలా అందంగా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'पोशाक',
        question: 'अपनी पसंदीदा पोशाक का वर्णन कीजिए।',
        examples: [
          {
            en: 'My sister has a red dress.',
            native: 'मेरी बहन के पास एक लाल पोशाक है।',
          },
          {
            en: 'She wears the dress on her birthday.',
            native: 'वह अपने जन्मदिन पर यह पोशाक पहनती है।',
          },
          {
            en: 'This dress is very pretty.',
            native: 'यह पोशाक बहुत सुंदर है।',
          },
        ],
      },
      es: {
        word: 'vestido',
        question: 'Describe un vestido que te gusta.',
        examples: [
          {
            en: 'My sister has a red dress.',
            native: 'Mi hermana tiene un vestido rojo.',
          },
          {
            en: 'She wears the dress on her birthday.',
            native: 'Ella lleva el vestido en su cumpleaños.',
          },
          {
            en: 'This dress is very pretty.',
            native: 'Este vestido es muy bonito.',
          },
        ],
      },
      zh: {
        word: '连衣裙',
        question: '描述一件你喜欢的连衣裙。',
        examples: [
          {
            en: 'My sister has a red dress.',
            native: '我妹妹有一条红色的连衣裙。',
          },
          {
            en: 'She wears the dress on her birthday.',
            native: '她生日时穿这条裙子。',
          },
          {
            en: 'This dress is very pretty.',
            native: '这条连衣裙很漂亮。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'shoes',
    questionText: 'Talk about your shoes. What colour are they?',
    translations: {
      te: {
        word: 'బూట్లు',
        question: 'మీ బూట్ల గురించి మాట్లాడండి. అవి ఏ రంగులో ఉన్నాయి?',
        examples: [
          {
            en: 'My shoes are black.',
            native: 'నా బూట్లు నల్లగా ఉన్నాయి.',
          },
          {
            en: 'I wear shoes when I go out.',
            native: 'నేను బయటకు వెళ్లినప్పుడు బూట్లు ధరిస్తాను.',
          },
          {
            en: 'These shoes are new and soft.',
            native: 'ఈ బూట్లు కొత్తవి మరియు మెత్తగా ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'जूते',
        question: 'अपने जूतों के बारे में बताइए। वे किस रंग के हैं?',
        examples: [
          {
            en: 'My shoes are black.',
            native: 'मेरे जूते काले हैं।',
          },
          {
            en: 'I wear shoes when I go out.',
            native: 'मैं बाहर जाते समय जूते पहनता हूँ।',
          },
          {
            en: 'These shoes are new and soft.',
            native: 'ये जूते नए और नरम हैं।',
          },
        ],
      },
      es: {
        word: 'zapatos',
        question: 'Habla de tus zapatos. ¿De qué color son?',
        examples: [
          {
            en: 'My shoes are black.',
            native: 'Mis zapatos son negros.',
          },
          {
            en: 'I wear shoes when I go out.',
            native: 'Me pongo los zapatos cuando salgo.',
          },
          {
            en: 'These shoes are new and soft.',
            native: 'Estos zapatos son nuevos y blandos.',
          },
        ],
      },
      zh: {
        word: '鞋子',
        question: '谈谈你的鞋子。它们是什么颜色的？',
        examples: [
          {
            en: 'My shoes are black.',
            native: '我的鞋子是黑色的。',
          },
          {
            en: 'I wear shoes when I go out.',
            native: '我出门时穿鞋。',
          },
          {
            en: 'These shoes are new and soft.',
            native: '这双鞋又新又软。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'hat',
    questionText: 'Do you like hats? When do you wear one?',
    translations: {
      te: {
        word: 'టోపీ',
        question: 'మీకు టోపీలు ఇష్టమా? మీరు ఎప్పుడు ధరిస్తారు?',
        examples: [
          {
            en: 'I wear a hat in the sun.',
            native: 'నేను ఎండలో టోపీ ధరిస్తాను.',
          },
          {
            en: 'My grandfather has an old hat.',
            native: 'నా తాతయ్యకు ఒక పాత టోపీ ఉంది.',
          },
          {
            en: 'This yellow hat is for the beach.',
            native: 'ఈ పసుపు టోపీ బీచ్ కోసం.',
          },
        ],
      },
      hi: {
        word: 'टोपी',
        question: 'क्या आपको टोपियाँ पसंद हैं? आप कब पहनते हैं?',
        examples: [
          {
            en: 'I wear a hat in the sun.',
            native: 'मैं धूप में टोपी पहनता हूँ।',
          },
          {
            en: 'My grandfather has an old hat.',
            native: 'मेरे दादा के पास एक पुरानी टोपी है।',
          },
          {
            en: 'This yellow hat is for the beach.',
            native: 'यह पीली टोपी समुद्र तट के लिए है।',
          },
        ],
      },
      es: {
        word: 'sombrero',
        question: '¿Te gustan los sombreros? ¿Cuándo llevas uno?',
        examples: [
          {
            en: 'I wear a hat in the sun.',
            native: 'Llevo un sombrero bajo el sol.',
          },
          {
            en: 'My grandfather has an old hat.',
            native: 'Mi abuelo tiene un sombrero viejo.',
          },
          {
            en: 'This yellow hat is for the beach.',
            native: 'Este sombrero amarillo es para la playa.',
          },
        ],
      },
      zh: {
        word: '帽子',
        question: '你喜欢帽子吗？你什么时候戴？',
        examples: [
          {
            en: 'I wear a hat in the sun.',
            native: '我在太阳下戴帽子。',
          },
          {
            en: 'My grandfather has an old hat.',
            native: '我爷爷有一顶旧帽子。',
          },
          {
            en: 'This yellow hat is for the beach.',
            native: '这顶黄帽子是去海滩戴的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'socks',
    questionText: 'Talk about your socks.',
    translations: {
      te: {
        word: 'మోజాళ్లు',
        question: 'మీ మోజాళ్ల గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I wear white socks to school.',
            native: 'నేను పాఠశాలకు తెల్లని మోజాళ్లు ధరిస్తాను.',
          },
          {
            en: 'My socks are in the box.',
            native: 'నా మోజాళ్లు పెట్టెలో ఉన్నాయి.',
          },
          {
            en: 'She buys warm socks in winter.',
            native: 'ఆమె చలికాలంలో వెచ్చని మోజాళ్లు కొంటుంది.',
          },
        ],
      },
      hi: {
        word: 'मोज़े',
        question: 'अपने मोज़ों के बारे में बताइए।',
        examples: [
          {
            en: 'I wear white socks to school.',
            native: 'मैं स्कूल में सफ़ेद मोज़े पहनता हूँ।',
          },
          {
            en: 'My socks are in the box.',
            native: 'मेरे मोज़े डिब्बे में हैं।',
          },
          {
            en: 'She buys warm socks in winter.',
            native: 'वह सर्दियों में गर्म मोज़े खरीदती है।',
          },
        ],
      },
      es: {
        word: 'calcetines',
        question: 'Habla de tus calcetines.',
        examples: [
          {
            en: 'I wear white socks to school.',
            native: 'Llevo calcetines blancos a la escuela.',
          },
          {
            en: 'My socks are in the box.',
            native: 'Mis calcetines están en la caja.',
          },
          {
            en: 'She buys warm socks in winter.',
            native: 'Ella compra calcetines calientes en invierno.',
          },
        ],
      },
      zh: {
        word: '袜子',
        question: '谈谈你的袜子。',
        examples: [
          {
            en: 'I wear white socks to school.',
            native: '我穿白袜子去上学。',
          },
          {
            en: 'My socks are in the box.',
            native: '我的袜子在盒子里。',
          },
          {
            en: 'She buys warm socks in winter.',
            native: '她冬天买保暖的袜子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'jacket',
    questionText: 'Describe your jacket.',
    translations: {
      te: {
        word: 'జాకెట్',
        question: 'మీ జాకెట్‌ను వివరించండి.',
        examples: [
          {
            en: 'My jacket is green and warm.',
            native: 'నా జాకెట్ ఆకుపచ్చ రంగులో మరియు వెచ్చగా ఉంటుంది.',
          },
          {
            en: 'I wear my jacket in winter.',
            native: 'నేను చలికాలంలో నా జాకెట్ ధరిస్తాను.',
          },
          {
            en: 'This jacket has two big pockets.',
            native: 'ఈ జాకెట్‌కు రెండు పెద్ద జేబులు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'जैकेट',
        question: 'अपनी जैकेट का वर्णन कीजिए।',
        examples: [
          {
            en: 'My jacket is green and warm.',
            native: 'मेरी जैकेट हरी और गर्म है।',
          },
          {
            en: 'I wear my jacket in winter.',
            native: 'मैं सर्दियों में अपनी जैकेट पहनता हूँ।',
          },
          {
            en: 'This jacket has two big pockets.',
            native: 'इस जैकेट में दो बड़ी जेबें हैं।',
          },
        ],
      },
      es: {
        word: 'chaqueta',
        question: 'Describe tu chaqueta.',
        examples: [
          {
            en: 'My jacket is green and warm.',
            native: 'Mi chaqueta es verde y caliente.',
          },
          {
            en: 'I wear my jacket in winter.',
            native: 'Me pongo la chaqueta en invierno.',
          },
          {
            en: 'This jacket has two big pockets.',
            native: 'Esta chaqueta tiene dos bolsillos grandes.',
          },
        ],
      },
      zh: {
        word: '夹克',
        question: '描述一下你的夹克。',
        examples: [
          {
            en: 'My jacket is green and warm.',
            native: '我的夹克是绿色的，很暖和。',
          },
          {
            en: 'I wear my jacket in winter.',
            native: '我冬天穿夹克。',
          },
          {
            en: 'This jacket has two big pockets.',
            native: '这件夹克有两个大口袋。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'clothes',
    questionText: 'What clothes do you like to wear?',
    translations: {
      te: {
        word: 'బట్టలు',
        question: 'మీరు ఏ బట్టలు ధరించడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'I like to wear simple clothes.',
            native: 'నాకు సాధారణ బట్టలు ధరించడం ఇష్టం.',
          },
          {
            en: 'My mother washes our clothes.',
            native: 'నా అమ్మ మా బట్టలు ఉతుకుతుంది.',
          },
          {
            en: 'We buy new clothes for the festival.',
            native: 'మేము పండుగకు కొత్త బట్టలు కొంటాము.',
          },
        ],
      },
      hi: {
        word: 'कपड़े',
        question: 'आप कैसे कपड़े पहनना पसंद करते हैं?',
        examples: [
          {
            en: 'I like to wear simple clothes.',
            native: 'मुझे साधारण कपड़े पहनना पसंद है।',
          },
          {
            en: 'My mother washes our clothes.',
            native: 'मेरी माँ हमारे कपड़े धोती हैं।',
          },
          {
            en: 'We buy new clothes for the festival.',
            native: 'हम त्योहार के लिए नए कपड़े खरीदते हैं।',
          },
        ],
      },
      es: {
        word: 'ropa',
        question: '¿Qué ropa te gusta llevar?',
        examples: [
          {
            en: 'I like to wear simple clothes.',
            native: 'Me gusta llevar ropa sencilla.',
          },
          {
            en: 'My mother washes our clothes.',
            native: 'Mi madre lava nuestra ropa.',
          },
          {
            en: 'We buy new clothes for the festival.',
            native: 'Compramos ropa nueva para la fiesta.',
          },
        ],
      },
      zh: {
        word: '衣服',
        question: '你喜欢穿什么衣服？',
        examples: [
          {
            en: 'I like to wear simple clothes.',
            native: '我喜欢穿简单的衣服。',
          },
          {
            en: 'My mother washes our clothes.',
            native: '我妈妈洗我们的衣服。',
          },
          {
            en: 'We buy new clothes for the festival.',
            native: '我们为节日买新衣服。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'dog',
    questionText: 'Do you have a dog? Describe it.',
    translations: {
      te: {
        word: 'కుక్క',
        question: 'మీకు కుక్క ఉందా? దానిని వివరించండి.',
        examples: [
          {
            en: 'I have a small brown dog.',
            native: 'నాకు ఒక చిన్న గోధుమ రంగు కుక్క ఉంది.',
          },
          {
            en: 'My dog runs and plays with me.',
            native: 'నా కుక్క నాతో పరుగెత్తి ఆడుతుంది.',
          },
          {
            en: 'The dog eats meat and rice.',
            native: 'కుక్క మాంసం మరియు అన్నం తింటుంది.',
          },
        ],
      },
      hi: {
        word: 'कुत्ता',
        question: 'क्या आपके पास कुत्ता है? उसका वर्णन कीजिए।',
        examples: [
          {
            en: 'I have a small brown dog.',
            native: 'मेरे पास एक छोटा भूरा कुत्ता है।',
          },
          {
            en: 'My dog runs and plays with me.',
            native: 'मेरा कुत्ता मेरे साथ दौड़ता और खेलता है।',
          },
          {
            en: 'The dog eats meat and rice.',
            native: 'कुत्ता मांस और चावल खाता है।',
          },
        ],
      },
      es: {
        word: 'perro',
        question: '¿Tienes un perro? Descríbelo.',
        examples: [
          {
            en: 'I have a small brown dog.',
            native: 'Tengo un perro pequeño y marrón.',
          },
          {
            en: 'My dog runs and plays with me.',
            native: 'Mi perro corre y juega conmigo.',
          },
          {
            en: 'The dog eats meat and rice.',
            native: 'El perro come carne y arroz.',
          },
        ],
      },
      zh: {
        word: '狗',
        question: '你有狗吗？描述一下它。',
        examples: [
          {
            en: 'I have a small brown dog.',
            native: '我有一只棕色的小狗。',
          },
          {
            en: 'My dog runs and plays with me.',
            native: '我的狗和我一起跑和玩。',
          },
          {
            en: 'The dog eats meat and rice.',
            native: '狗吃肉和米饭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'cat',
    questionText: 'Talk about cats. Do you like them?',
    translations: {
      te: {
        word: 'పిల్లి',
        question: 'పిల్లుల గురించి మాట్లాడండి. మీకు అవి ఇష్టమా?',
        examples: [
          {
            en: 'My cat is white and small.',
            native: 'నా పిల్లి తెల్లగా మరియు చిన్నగా ఉంటుంది.',
          },
          {
            en: 'The cat drinks milk every day.',
            native: 'పిల్లి ప్రతిరోజూ పాలు తాగుతుంది.',
          },
          {
            en: 'Cats sleep in the afternoon.',
            native: 'పిల్లులు మధ్యాహ్నం నిద్రపోతాయి.',
          },
        ],
      },
      hi: {
        word: 'बिल्ली',
        question: 'बिल्लियों के बारे में बताइए। क्या आपको वे पसंद हैं?',
        examples: [
          {
            en: 'My cat is white and small.',
            native: 'मेरी बिल्ली सफ़ेद और छोटी है।',
          },
          {
            en: 'The cat drinks milk every day.',
            native: 'बिल्ली रोज़ दूध पीती है।',
          },
          {
            en: 'Cats sleep in the afternoon.',
            native: 'बिल्लियाँ दोपहर में सोती हैं।',
          },
        ],
      },
      es: {
        word: 'gato',
        question: 'Habla de los gatos. ¿Te gustan?',
        examples: [
          {
            en: 'My cat is white and small.',
            native: 'Mi gato es blanco y pequeño.',
          },
          {
            en: 'The cat drinks milk every day.',
            native: 'El gato bebe leche todos los días.',
          },
          {
            en: 'Cats sleep in the afternoon.',
            native: 'Los gatos duermen por la tarde.',
          },
        ],
      },
      zh: {
        word: '猫',
        question: '谈谈猫。你喜欢它们吗？',
        examples: [
          {
            en: 'My cat is white and small.',
            native: '我的猫又白又小。',
          },
          {
            en: 'The cat drinks milk every day.',
            native: '猫每天喝牛奶。',
          },
          {
            en: 'Cats sleep in the afternoon.',
            native: '猫在下午睡觉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'cow',
    questionText: 'Talk about cows. What do they give us?',
    translations: {
      te: {
        word: 'ఆవు',
        question: 'ఆవుల గురించి మాట్లాడండి. అవి మనకు ఏమి ఇస్తాయి?',
        examples: [
          {
            en: 'The cow gives us milk.',
            native: 'ఆవు మనకు పాలు ఇస్తుంది.',
          },
          {
            en: 'Cows eat grass in the field.',
            native: 'ఆవులు పొలంలో గడ్డి తింటాయి.',
          },
          {
            en: 'My uncle has two white cows.',
            native: 'నా మామయ్యకు రెండు తెల్లని ఆవులు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'गाय',
        question: 'गायों के बारे में बताइए। वे हमें क्या देती हैं?',
        examples: [
          {
            en: 'The cow gives us milk.',
            native: 'गाय हमें दूध देती है।',
          },
          {
            en: 'Cows eat grass in the field.',
            native: 'गायें खेत में घास खाती हैं।',
          },
          {
            en: 'My uncle has two white cows.',
            native: 'मेरे चाचा के पास दो सफ़ेद गायें हैं।',
          },
        ],
      },
      es: {
        word: 'vaca',
        question: 'Habla de las vacas. ¿Qué nos dan?',
        examples: [
          {
            en: 'The cow gives us milk.',
            native: 'La vaca nos da leche.',
          },
          {
            en: 'Cows eat grass in the field.',
            native: 'Las vacas comen hierba en el campo.',
          },
          {
            en: 'My uncle has two white cows.',
            native: 'Mi tío tiene dos vacas blancas.',
          },
        ],
      },
      zh: {
        word: '奶牛',
        question: '谈谈奶牛。它们给我们什么？',
        examples: [
          {
            en: 'The cow gives us milk.',
            native: '奶牛给我们牛奶。',
          },
          {
            en: 'Cows eat grass in the field.',
            native: '奶牛在田里吃草。',
          },
          {
            en: 'My uncle has two white cows.',
            native: '我叔叔有两头白奶牛。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'horse',
    questionText: 'Have you seen a horse? Describe it.',
    translations: {
      te: {
        word: 'గుర్రం',
        question: 'మీరు గుర్రాన్ని చూశారా? దానిని వివరించండి.',
        examples: [
          {
            en: 'The horse is big and strong.',
            native: 'గుర్రం పెద్దగా మరియు బలంగా ఉంటుంది.',
          },
          {
            en: 'Horses can run very fast.',
            native: 'గుర్రాలు చాలా వేగంగా పరుగెత్తగలవు.',
          },
          {
            en: 'I saw a black horse on the farm.',
            native: 'నేను పొలంలో ఒక నల్లని గుర్రాన్ని చూశాను.',
          },
        ],
      },
      hi: {
        word: 'घोड़ा',
        question: 'क्या आपने घोड़ा देखा है? उसका वर्णन कीजिए।',
        examples: [
          {
            en: 'The horse is big and strong.',
            native: 'घोड़ा बड़ा और मज़बूत होता है।',
          },
          {
            en: 'Horses can run very fast.',
            native: 'घोड़े बहुत तेज़ दौड़ सकते हैं।',
          },
          {
            en: 'I saw a black horse on the farm.',
            native: 'मैंने खेत में एक काला घोड़ा देखा।',
          },
        ],
      },
      es: {
        word: 'caballo',
        question: '¿Has visto un caballo? Descríbelo.',
        examples: [
          {
            en: 'The horse is big and strong.',
            native: 'El caballo es grande y fuerte.',
          },
          {
            en: 'Horses can run very fast.',
            native: 'Los caballos pueden correr muy rápido.',
          },
          {
            en: 'I saw a black horse on the farm.',
            native: 'Vi un caballo negro en la granja.',
          },
        ],
      },
      zh: {
        word: '马',
        question: '你见过马吗？描述一下它。',
        examples: [
          {
            en: 'The horse is big and strong.',
            native: '马又大又壮。',
          },
          {
            en: 'Horses can run very fast.',
            native: '马能跑得很快。',
          },
          {
            en: 'I saw a black horse on the farm.',
            native: '我在农场看到一匹黑马。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'bird',
    questionText: 'Talk about birds. Which birds do you see?',
    translations: {
      te: {
        word: 'పక్షి',
        question: 'పక్షుల గురించి మాట్లాడండి. మీరు ఏ పక్షులను చూస్తారు?',
        examples: [
          {
            en: 'I see small birds in the garden.',
            native: 'నేను తోటలో చిన్న పక్షులను చూస్తాను.',
          },
          {
            en: 'Birds can fly in the sky.',
            native: 'పక్షులు ఆకాశంలో ఎగరగలవు.',
          },
          {
            en: 'The parrot is a green bird.',
            native: 'చిలుక ఆకుపచ్చ పక్షి.',
          },
        ],
      },
      hi: {
        word: 'पक्षी',
        question: 'पक्षियों के बारे में बताइए। आप कौन से पक्षी देखते हैं?',
        examples: [
          {
            en: 'I see small birds in the garden.',
            native: 'मैं बगीचे में छोटे पक्षी देखता हूँ।',
          },
          {
            en: 'Birds can fly in the sky.',
            native: 'पक्षी आसमान में उड़ सकते हैं।',
          },
          {
            en: 'The parrot is a green bird.',
            native: 'तोता एक हरा पक्षी है।',
          },
        ],
      },
      es: {
        word: 'pájaro',
        question: 'Habla de los pájaros. ¿Qué pájaros ves?',
        examples: [
          {
            en: 'I see small birds in the garden.',
            native: 'Veo pájaros pequeños en el jardín.',
          },
          {
            en: 'Birds can fly in the sky.',
            native: 'Los pájaros pueden volar en el cielo.',
          },
          {
            en: 'The parrot is a green bird.',
            native: 'El loro es un pájaro verde.',
          },
        ],
      },
      zh: {
        word: '鸟',
        question: '谈谈鸟。你看到什么鸟？',
        examples: [
          {
            en: 'I see small birds in the garden.',
            native: '我在花园里看到小鸟。',
          },
          {
            en: 'Birds can fly in the sky.',
            native: '鸟能在天上飞。',
          },
          {
            en: 'The parrot is a green bird.',
            native: '鹦鹉是一种绿色的鸟。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'elephant',
    questionText: 'Describe an elephant.',
    translations: {
      te: {
        word: 'ఏనుగు',
        question: 'ఏనుగును వివరించండి.',
        examples: [
          {
            en: 'The elephant is a very big animal.',
            native: 'ఏనుగు చాలా పెద్ద జంతువు.',
          },
          {
            en: 'It has a long trunk and big ears.',
            native: 'దానికి పొడవైన తుండం మరియు పెద్ద చెవులు ఉన్నాయి.',
          },
          {
            en: 'Elephants eat leaves and fruit.',
            native: 'ఏనుగులు ఆకులు మరియు పండ్లు తింటాయి.',
          },
        ],
      },
      hi: {
        word: 'हाथी',
        question: 'हाथी का वर्णन कीजिए।',
        examples: [
          {
            en: 'The elephant is a very big animal.',
            native: 'हाथी एक बहुत बड़ा जानवर है।',
          },
          {
            en: 'It has a long trunk and big ears.',
            native: 'उसकी लंबी सूंड और बड़े कान होते हैं।',
          },
          {
            en: 'Elephants eat leaves and fruit.',
            native: 'हाथी पत्ते और फल खाते हैं।',
          },
        ],
      },
      es: {
        word: 'elefante',
        question: 'Describe un elefante.',
        examples: [
          {
            en: 'The elephant is a very big animal.',
            native: 'El elefante es un animal muy grande.',
          },
          {
            en: 'It has a long trunk and big ears.',
            native: 'Tiene una trompa larga y orejas grandes.',
          },
          {
            en: 'Elephants eat leaves and fruit.',
            native: 'Los elefantes comen hojas y fruta.',
          },
        ],
      },
      zh: {
        word: '大象',
        question: '描述一下大象。',
        examples: [
          {
            en: 'The elephant is a very big animal.',
            native: '大象是非常大的动物。',
          },
          {
            en: 'It has a long trunk and big ears.',
            native: '它有长鼻子和大耳朵。',
          },
          {
            en: 'Elephants eat leaves and fruit.',
            native: '大象吃树叶和水果。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'monkey',
    questionText: 'Talk about monkeys. What do they do?',
    translations: {
      te: {
        word: 'కోతి',
        question: 'కోతుల గురించి మాట్లాడండి. అవి ఏమి చేస్తాయి?',
        examples: [
          {
            en: 'Monkeys jump from tree to tree.',
            native: 'కోతులు చెట్టు నుండి చెట్టుకు దూకుతాయి.',
          },
          {
            en: 'The monkey eats a banana.',
            native: 'కోతి అరటి పండు తింటుంది.',
          },
          {
            en: 'Monkeys are funny and clever.',
            native: 'కోతులు చాలా సరదాగా మరియు తెలివిగా ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'बंदर',
        question: 'बंदरों के बारे में बताइए। वे क्या करते हैं?',
        examples: [
          {
            en: 'Monkeys jump from tree to tree.',
            native: 'बंदर पेड़ से पेड़ पर कूदते हैं।',
          },
          {
            en: 'The monkey eats a banana.',
            native: 'बंदर केला खाता है।',
          },
          {
            en: 'Monkeys are funny and clever.',
            native: 'बंदर मज़ेदार और चालाक होते हैं।',
          },
        ],
      },
      es: {
        word: 'mono',
        question: 'Habla de los monos. ¿Qué hacen?',
        examples: [
          {
            en: 'Monkeys jump from tree to tree.',
            native: 'Los monos saltan de árbol en árbol.',
          },
          {
            en: 'The monkey eats a banana.',
            native: 'El mono come un plátano.',
          },
          {
            en: 'Monkeys are funny and clever.',
            native: 'Los monos son graciosos y listos.',
          },
        ],
      },
      zh: {
        word: '猴子',
        question: '谈谈猴子。它们做什么？',
        examples: [
          {
            en: 'Monkeys jump from tree to tree.',
            native: '猴子在树之间跳来跳去。',
          },
          {
            en: 'The monkey eats a banana.',
            native: '猴子吃香蕉。',
          },
          {
            en: 'Monkeys are funny and clever.',
            native: '猴子又滑稽又聪明。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'rabbit',
    questionText: 'Describe a rabbit.',
    translations: {
      te: {
        word: 'కుందేలు',
        question: 'కుందేలును వివరించండి.',
        examples: [
          {
            en: 'The rabbit has long ears.',
            native: 'కుందేలుకు పొడవైన చెవులు ఉంటాయి.',
          },
          {
            en: 'Rabbits like to eat carrots.',
            native: 'కుందేలులు క్యారెట్లు తినడానికి ఇష్టపడతాయి.',
          },
          {
            en: 'My rabbit is soft and white.',
            native: 'నా కుందేలు మెత్తగా మరియు తెల్లగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'खरगोश',
        question: 'खरगोश का वर्णन कीजिए।',
        examples: [
          {
            en: 'The rabbit has long ears.',
            native: 'खरगोश के कान लंबे होते हैं।',
          },
          {
            en: 'Rabbits like to eat carrots.',
            native: 'खरगोशों को गाजर खाना पसंद है।',
          },
          {
            en: 'My rabbit is soft and white.',
            native: 'मेरा खरगोश नरम और सफ़ेद है।',
          },
        ],
      },
      es: {
        word: 'conejo',
        question: 'Describe un conejo.',
        examples: [
          {
            en: 'The rabbit has long ears.',
            native: 'El conejo tiene las orejas largas.',
          },
          {
            en: 'Rabbits like to eat carrots.',
            native: 'A los conejos les gusta comer zanahorias.',
          },
          {
            en: 'My rabbit is soft and white.',
            native: 'Mi conejo es suave y blanco.',
          },
        ],
      },
      zh: {
        word: '兔子',
        question: '描述一下兔子。',
        examples: [
          {
            en: 'The rabbit has long ears.',
            native: '兔子有长长的耳朵。',
          },
          {
            en: 'Rabbits like to eat carrots.',
            native: '兔子喜欢吃胡萝卜。',
          },
          {
            en: 'My rabbit is soft and white.',
            native: '我的兔子又软又白。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'pet',
    questionText: 'Do you have a pet? Talk about it.',
    translations: {
      te: {
        word: 'సాకుజంతువు',
        question: 'మీకు సాకుజంతువు ఉందా? దాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I have a pet dog at home.',
            native: 'నేను ఇంట్లో ఒక కుక్కను సాకుతాను.',
          },
          {
            en: 'My pet sleeps next to my bed.',
            native: 'నా సాకుజంతువు నా మంచం పక్కన నిద్రపోతుంది.',
          },
          {
            en: 'I give food to my pet every day.',
            native: 'నేను ప్రతిరోజూ నా సాకుజంతువుకు ఆహారం ఇస్తాను.',
          },
        ],
      },
      hi: {
        word: 'पालतू जानवर',
        question: 'क्या आपके पास पालतू जानवर है? उसके बारे में बताइए।',
        examples: [
          {
            en: 'I have a pet dog at home.',
            native: 'मेरे घर में एक पालतू कुत्ता है।',
          },
          {
            en: 'My pet sleeps next to my bed.',
            native: 'मेरा पालतू जानवर मेरे बिस्तर के पास सोता है।',
          },
          {
            en: 'I give food to my pet every day.',
            native: 'मैं रोज़ अपने पालतू जानवर को खाना देता हूँ।',
          },
        ],
      },
      es: {
        word: 'mascota',
        question: '¿Tienes una mascota? Habla de ella.',
        examples: [
          {
            en: 'I have a pet dog at home.',
            native: 'Tengo un perro mascota en casa.',
          },
          {
            en: 'My pet sleeps next to my bed.',
            native: 'Mi mascota duerme junto a mi cama.',
          },
          {
            en: 'I give food to my pet every day.',
            native: 'Le doy comida a mi mascota todos los días.',
          },
        ],
      },
      zh: {
        word: '宠物',
        question: '你有宠物吗？谈谈它。',
        examples: [
          {
            en: 'I have a pet dog at home.',
            native: '我家里有一只宠物狗。',
          },
          {
            en: 'My pet sleeps next to my bed.',
            native: '我的宠物睡在我的床边。',
          },
          {
            en: 'I give food to my pet every day.',
            native: '我每天给我的宠物喂食。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'red',
    questionText: 'Talk about the colour red. What things are red?',
    translations: {
      te: {
        word: 'ఎరుపు',
        question: 'ఎరుపు రంగు గురించి మాట్లాడండి. ఏ వస్తువులు ఎరుపు రంగులో ఉంటాయి?',
        examples: [
          {
            en: 'The apple is red.',
            native: 'యాపిల్ ఎరుపు రంగులో ఉంటుంది.',
          },
          {
            en: 'My bag is red and black.',
            native: 'నా బ్యాగ్ ఎరుపు మరియు నలుపు రంగులో ఉంది.',
          },
          {
            en: 'She likes the red rose.',
            native: 'ఆమెకు ఎర్రని గులాబీ ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'लाल',
        question: 'लाल रंग के बारे में बताइए। कौन सी चीज़ें लाल होती हैं?',
        examples: [
          {
            en: 'The apple is red.',
            native: 'सेब लाल होता है।',
          },
          {
            en: 'My bag is red and black.',
            native: 'मेरा बैग लाल और काला है।',
          },
          {
            en: 'She likes the red rose.',
            native: 'उसे लाल गुलाब पसंद है।',
          },
        ],
      },
      es: {
        word: 'rojo',
        question: 'Habla del color rojo. ¿Qué cosas son rojas?',
        examples: [
          {
            en: 'The apple is red.',
            native: 'La manzana es roja.',
          },
          {
            en: 'My bag is red and black.',
            native: 'Mi bolso es rojo y negro.',
          },
          {
            en: 'She likes the red rose.',
            native: 'A ella le gusta la rosa roja.',
          },
        ],
      },
      zh: {
        word: '红色',
        question: '谈谈红色。什么东西是红色的？',
        examples: [
          {
            en: 'The apple is red.',
            native: '苹果是红色的。',
          },
          {
            en: 'My bag is red and black.',
            native: '我的包是红黑相间的。',
          },
          {
            en: 'She likes the red rose.',
            native: '她喜欢红玫瑰。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'blue',
    questionText: 'What blue things do you like?',
    translations: {
      te: {
        word: 'నీలం',
        question: 'మీకు ఏ నీలం వస్తువులు ఇష్టం?',
        examples: [
          {
            en: 'The sky is blue.',
            native: 'ఆకాశం నీలం రంగులో ఉంటుంది.',
          },
          {
            en: 'I have a blue pen.',
            native: 'నాకు ఒక నీలం పెన్ను ఉంది.',
          },
          {
            en: 'My sister likes her blue dress.',
            native: 'నా చెల్లెలకు తన నీలం ఫ్రాక్ ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'नीला',
        question: 'आपको कौन सी नीली चीज़ें पसंद हैं?',
        examples: [
          {
            en: 'The sky is blue.',
            native: 'आसमान नीला होता है।',
          },
          {
            en: 'I have a blue pen.',
            native: 'मेरे पास एक नीला पेन है।',
          },
          {
            en: 'My sister likes her blue dress.',
            native: 'मेरी बहन को उसकी नीली पोशाक पसंद है।',
          },
        ],
      },
      es: {
        word: 'azul',
        question: '¿Qué cosas azules te gustan?',
        examples: [
          {
            en: 'The sky is blue.',
            native: 'El cielo es azul.',
          },
          {
            en: 'I have a blue pen.',
            native: 'Tengo un bolígrafo azul.',
          },
          {
            en: 'My sister likes her blue dress.',
            native: 'A mi hermana le gusta su vestido azul.',
          },
        ],
      },
      zh: {
        word: '蓝色',
        question: '你喜欢什么蓝色的东西？',
        examples: [
          {
            en: 'The sky is blue.',
            native: '天空是蓝色的。',
          },
          {
            en: 'I have a blue pen.',
            native: '我有一支蓝色的笔。',
          },
          {
            en: 'My sister likes her blue dress.',
            native: '我妹妹喜欢她的蓝色连衣裙。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'green',
    questionText: 'Talk about the colour green. What things are green?',
    translations: {
      te: {
        word: 'ఆకుపచ్చ',
        question: 'ఆకుపచ్చ రంగు గురించి మాట్లాడండి. ఏ వస్తువులు ఆకుపచ్చ రంగులో ఉంటాయి?',
        examples: [
          {
            en: 'The leaves of the tree are green.',
            native: 'చెట్టు ఆకులు ఆకుపచ్చగా ఉంటాయి.',
          },
          {
            en: 'I like green vegetables.',
            native: 'నాకు ఆకుపచ్చ కూరగాయలు ఇష్టం.',
          },
          {
            en: 'Our garden is green and beautiful.',
            native: 'మా తోట ఆకుపచ్చగా మరియు అందంగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'हरा',
        question: 'हरे रंग के बारे में बताइए। कौन सी चीज़ें हरी होती हैं?',
        examples: [
          {
            en: 'The leaves of the tree are green.',
            native: 'पेड़ के पत्ते हरे होते हैं।',
          },
          {
            en: 'I like green vegetables.',
            native: 'मुझे हरी सब्ज़ियाँ पसंद हैं।',
          },
          {
            en: 'Our garden is green and beautiful.',
            native: 'हमारा बगीचा हरा और सुंदर है।',
          },
        ],
      },
      es: {
        word: 'verde',
        question: 'Habla del color verde. ¿Qué cosas son verdes?',
        examples: [
          {
            en: 'The leaves of the tree are green.',
            native: 'Las hojas del árbol son verdes.',
          },
          {
            en: 'I like green vegetables.',
            native: 'Me gustan las verduras verdes.',
          },
          {
            en: 'Our garden is green and beautiful.',
            native: 'Nuestro jardín es verde y bonito.',
          },
        ],
      },
      zh: {
        word: '绿色',
        question: '谈谈绿色。什么东西是绿色的？',
        examples: [
          {
            en: 'The leaves of the tree are green.',
            native: '树叶是绿色的。',
          },
          {
            en: 'I like green vegetables.',
            native: '我喜欢绿色蔬菜。',
          },
          {
            en: 'Our garden is green and beautiful.',
            native: '我们的花园又绿又美。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'yellow',
    questionText: 'What yellow things can you name?',
    translations: {
      te: {
        word: 'పసుపు',
        question: 'మీరు ఏ పసుపు వస్తువుల పేర్లు చెప్పగలరు?',
        examples: [
          {
            en: 'The sun is yellow.',
            native: 'సూర్యుడు పసుపు రంగులో ఉంటాడు.',
          },
          {
            en: 'A banana is yellow and sweet.',
            native: 'అరటి పండు పసుపు రంగులో మరియు తీపిగా ఉంటుంది.',
          },
          {
            en: 'She has a yellow flower in her hand.',
            native: 'ఆమె చేతిలో ఒక పసుపు పువ్వు ఉంది.',
          },
        ],
      },
      hi: {
        word: 'पीला',
        question: 'आप कौन सी पीली चीज़ों के नाम बता सकते हैं?',
        examples: [
          {
            en: 'The sun is yellow.',
            native: 'सूरज पीला होता है।',
          },
          {
            en: 'A banana is yellow and sweet.',
            native: 'केला पीला और मीठा होता है।',
          },
          {
            en: 'She has a yellow flower in her hand.',
            native: 'उसके हाथ में एक पीला फूल है।',
          },
        ],
      },
      es: {
        word: 'amarillo',
        question: '¿Qué cosas amarillas puedes nombrar?',
        examples: [
          {
            en: 'The sun is yellow.',
            native: 'El sol es amarillo.',
          },
          {
            en: 'A banana is yellow and sweet.',
            native: 'Un plátano es amarillo y dulce.',
          },
          {
            en: 'She has a yellow flower in her hand.',
            native: 'Ella tiene una flor amarilla en la mano.',
          },
        ],
      },
      zh: {
        word: '黄色',
        question: '你能说出什么黄色的东西？',
        examples: [
          {
            en: 'The sun is yellow.',
            native: '太阳是黄色的。',
          },
          {
            en: 'A banana is yellow and sweet.',
            native: '香蕉又黄又甜。',
          },
          {
            en: 'She has a yellow flower in her hand.',
            native: '她手里拿着一朵黄花。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'color',
    questionText: 'What is your favourite color? Why?',
    translations: {
      te: {
        word: 'రంగు',
        question: 'మీకు ఇష్టమైన రంగు ఏది? ఎందుకు?',
        examples: [
          {
            en: 'My favourite color is blue.',
            native: 'నాకు ఇష్టమైన రంగు నీలం.',
          },
          {
            en: 'I like all the colors of the rainbow.',
            native: 'నాకు ఇంద్రధనుస్సు రంగులన్నీ ఇష్టం.',
          },
          {
            en: 'This flower has many colors.',
            native: 'ఈ పువ్వుకు చాలా రంగులు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'रंग',
        question: 'आपका पसंदीदा रंग कौन सा है? क्यों?',
        examples: [
          {
            en: 'My favourite color is blue.',
            native: 'मेरा पसंदीदा रंग नीला है।',
          },
          {
            en: 'I like all the colors of the rainbow.',
            native: 'मुझे इंद्रधनुष के सभी रंग पसंद हैं।',
          },
          {
            en: 'This flower has many colors.',
            native: 'इस फूल में कई रंग हैं।',
          },
        ],
      },
      es: {
        word: 'color',
        question: '¿Cuál es tu color favorito? ¿Por qué?',
        examples: [
          {
            en: 'My favourite color is blue.',
            native: 'Mi color favorito es el azul.',
          },
          {
            en: 'I like all the colors of the rainbow.',
            native: 'Me gustan todos los colores del arcoíris.',
          },
          {
            en: 'This flower has many colors.',
            native: 'Esta flor tiene muchos colores.',
          },
        ],
      },
      zh: {
        word: '颜色',
        question: '你最喜欢什么颜色？为什么？',
        examples: [
          {
            en: 'My favourite color is blue.',
            native: '我最喜欢的颜色是蓝色。',
          },
          {
            en: 'I like all the colors of the rainbow.',
            native: '我喜欢彩虹的所有颜色。',
          },
          {
            en: 'This flower has many colors.',
            native: '这朵花有很多颜色。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'number',
    questionText: 'Can you count from one to ten?',
    translations: {
      te: {
        word: 'సంఖ్య',
        question: 'మీరు ఒకటి నుండి పది వరకు లెక్కపెట్టగలరా?',
        examples: [
          {
            en: 'I can count from one to ten.',
            native: 'నేను ఒకటి నుండి పది వరకు లెక్కపెట్టగలను.',
          },
          {
            en: 'Seven is my lucky number.',
            native: 'ఏడు నా అదృష్ట సంఖ్య.',
          },
          {
            en: 'My house number is twelve.',
            native: 'నా ఇంటి నంబరు పన్నెండు.',
          },
        ],
      },
      hi: {
        word: 'संख्या',
        question: 'क्या आप एक से दस तक गिन सकते हैं?',
        examples: [
          {
            en: 'I can count from one to ten.',
            native: 'मैं एक से दस तक गिन सकता हूँ।',
          },
          {
            en: 'Seven is my lucky number.',
            native: 'सात मेरा भाग्यशाली अंक है।',
          },
          {
            en: 'My house number is twelve.',
            native: 'मेरे घर का नंबर बारह है।',
          },
        ],
      },
      es: {
        word: 'número',
        question: '¿Puedes contar de uno a diez?',
        examples: [
          {
            en: 'I can count from one to ten.',
            native: 'Puedo contar de uno a diez.',
          },
          {
            en: 'Seven is my lucky number.',
            native: 'El siete es mi número de la suerte.',
          },
          {
            en: 'My house number is twelve.',
            native: 'El número de mi casa es doce.',
          },
        ],
      },
      zh: {
        word: '数字',
        question: '你能从一数到十吗？',
        examples: [
          {
            en: 'I can count from one to ten.',
            native: '我能从一数到十。',
          },
          {
            en: 'Seven is my lucky number.',
            native: '七是我的幸运数字。',
          },
          {
            en: 'My house number is twelve.',
            native: '我家的门牌号是十二。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'age',
    questionText: 'How old are you? Talk about your age.',
    translations: {
      te: {
        word: 'వయస్సు',
        question: 'మీ వయస్సు ఎంత? మీ వయస్సు గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I am ten years old.',
            native: 'నా వయస్సు పదేళ్లు.',
          },
          {
            en: 'My brother is older than me.',
            native: 'నా సోదరుడు నా కంటే పెద్దవాడు.',
          },
          {
            en: 'My grandmother is sixty years old.',
            native: 'నా అమ్మమ్మ వయస్సు అరవై ఏళ్లు.',
          },
        ],
      },
      hi: {
        word: 'उम्र',
        question: 'आपकी उम्र क्या है? अपनी उम्र के बारे में बताइए।',
        examples: [
          {
            en: 'I am ten years old.',
            native: 'मैं दस साल का हूँ।',
          },
          {
            en: 'My brother is older than me.',
            native: 'मेरा भाई मुझसे बड़ा है।',
          },
          {
            en: 'My grandmother is sixty years old.',
            native: 'मेरी दादी साठ साल की हैं।',
          },
        ],
      },
      es: {
        word: 'edad',
        question: '¿Cuántos años tienes? Habla de tu edad.',
        examples: [
          {
            en: 'I am ten years old.',
            native: 'Tengo diez años.',
          },
          {
            en: 'My brother is older than me.',
            native: 'Mi hermano es mayor que yo.',
          },
          {
            en: 'My grandmother is sixty years old.',
            native: 'Mi abuela tiene sesenta años.',
          },
        ],
      },
      zh: {
        word: '年龄',
        question: '你多大了？谈谈你的年龄。',
        examples: [
          {
            en: 'I am ten years old.',
            native: '我十岁了。',
          },
          {
            en: 'My brother is older than me.',
            native: '我哥哥比我大。',
          },
          {
            en: 'My grandmother is sixty years old.',
            native: '我奶奶六十岁了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'money',
    questionText: 'What do you do with your money?',
    translations: {
      te: {
        word: 'డబ్బు',
        question: 'మీరు మీ డబ్బుతో ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I keep my money in a box.',
            native: 'నేను నా డబ్బును ఒక పెట్టెలో ఉంచుతాను.',
          },
          {
            en: 'I buy books with my money.',
            native: 'నేను నా డబ్బుతో పుస్తకాలు కొంటాను.',
          },
          {
            en: 'My father gives me money on my birthday.',
            native: 'నా నాన్న నా పుట్టినరోజున నాకు డబ్బు ఇస్తారు.',
          },
        ],
      },
      hi: {
        word: 'पैसा',
        question: 'आप अपने पैसों से क्या करते हैं?',
        examples: [
          {
            en: 'I keep my money in a box.',
            native: 'मैं अपने पैसे एक डिब्बे में रखता हूँ।',
          },
          {
            en: 'I buy books with my money.',
            native: 'मैं अपने पैसों से किताबें खरीदता हूँ।',
          },
          {
            en: 'My father gives me money on my birthday.',
            native: 'मेरे पिता मुझे मेरे जन्मदिन पर पैसे देते हैं।',
          },
        ],
      },
      es: {
        word: 'dinero',
        question: '¿Qué haces con tu dinero?',
        examples: [
          {
            en: 'I keep my money in a box.',
            native: 'Guardo mi dinero en una caja.',
          },
          {
            en: 'I buy books with my money.',
            native: 'Compro libros con mi dinero.',
          },
          {
            en: 'My father gives me money on my birthday.',
            native: 'Mi padre me da dinero en mi cumpleaños.',
          },
        ],
      },
      zh: {
        word: '钱',
        question: '你用你的钱做什么？',
        examples: [
          {
            en: 'I keep my money in a box.',
            native: '我把钱放在盒子里。',
          },
          {
            en: 'I buy books with my money.',
            native: '我用钱买书。',
          },
          {
            en: 'My father gives me money on my birthday.',
            native: '我爸爸在我生日时给我钱。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'room',
    questionText: 'Describe your room.',
    translations: {
      te: {
        word: 'గది',
        question: 'మీ గదిని వివరించండి.',
        examples: [
          {
            en: 'My room is small and clean.',
            native: 'నా గది చిన్నది మరియు శుభ్రంగా ఉంటుంది.',
          },
          {
            en: 'There is a bed and a table in my room.',
            native: 'నా గదిలో ఒక మంచం మరియు ఒక బల్ల ఉన్నాయి.',
          },
          {
            en: 'I study in my room every evening.',
            native: 'నేను ప్రతి సాయంత్రం నా గదిలో చదువుకుంటాను.',
          },
        ],
      },
      hi: {
        word: 'कमरा',
        question: 'अपने कमरे का वर्णन कीजिए।',
        examples: [
          {
            en: 'My room is small and clean.',
            native: 'मेरा कमरा छोटा और साफ़ है।',
          },
          {
            en: 'There is a bed and a table in my room.',
            native: 'मेरे कमरे में एक बिस्तर और एक मेज़ है।',
          },
          {
            en: 'I study in my room every evening.',
            native: 'मैं हर शाम अपने कमरे में पढ़ता हूँ।',
          },
        ],
      },
      es: {
        word: 'habitación',
        question: 'Describe tu habitación.',
        examples: [
          {
            en: 'My room is small and clean.',
            native: 'Mi habitación es pequeña y limpia.',
          },
          {
            en: 'There is a bed and a table in my room.',
            native: 'Hay una cama y una mesa en mi habitación.',
          },
          {
            en: 'I study in my room every evening.',
            native: 'Estudio en mi habitación cada tarde.',
          },
        ],
      },
      zh: {
        word: '房间',
        question: '描述一下你的房间。',
        examples: [
          {
            en: 'My room is small and clean.',
            native: '我的房间又小又干净。',
          },
          {
            en: 'There is a bed and a table in my room.',
            native: '我的房间里有一张床和一张桌子。',
          },
          {
            en: 'I study in my room every evening.',
            native: '我每天晚上在房间里学习。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'door',
    questionText: 'Talk about the doors in your house.',
    translations: {
      te: {
        word: 'తలుపు',
        question: 'మీ ఇంట్లోని తలుపుల గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'Our front door is big and brown.',
            native: 'మా ముందు తలుపు పెద్దది మరియు గోధుమ రంగులో ఉంటుంది.',
          },
          {
            en: 'Please close the door behind you.',
            native: 'దయచేసి మీ వెనుక తలుపు మూయండి.',
          },
          {
            en: 'There are four doors in my house.',
            native: 'నా ఇంట్లో నాలుగు తలుపులు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'दरवाज़ा',
        question: 'अपने घर के दरवाज़ों के बारे में बताइए।',
        examples: [
          {
            en: 'Our front door is big and brown.',
            native: 'हमारा सामने का दरवाज़ा बड़ा और भूरा है।',
          },
          {
            en: 'Please close the door behind you.',
            native: 'कृपया अपने पीछे दरवाज़ा बंद कर दीजिए।',
          },
          {
            en: 'There are four doors in my house.',
            native: 'मेरे घर में चार दरवाज़े हैं।',
          },
        ],
      },
      es: {
        word: 'puerta',
        question: 'Habla de las puertas de tu casa.',
        examples: [
          {
            en: 'Our front door is big and brown.',
            native: 'Nuestra puerta principal es grande y marrón.',
          },
          {
            en: 'Please close the door behind you.',
            native: 'Por favor, cierra la puerta detrás de ti.',
          },
          {
            en: 'There are four doors in my house.',
            native: 'Hay cuatro puertas en mi casa.',
          },
        ],
      },
      zh: {
        word: '门',
        question: '谈谈你家的门。',
        examples: [
          {
            en: 'Our front door is big and brown.',
            native: '我们家的前门又大又棕色。',
          },
          {
            en: 'Please close the door behind you.',
            native: '请随手关门。',
          },
          {
            en: 'There are four doors in my house.',
            native: '我家有四扇门。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'window',
    questionText: 'Describe a window in your home.',
    translations: {
      te: {
        word: 'కిటికీ',
        question: 'మీ ఇంట్లోని ఒక కిటికీని వివరించండి.',
        examples: [
          {
            en: 'The window in my room is big.',
            native: 'నా గదిలోని కిటికీ పెద్దది.',
          },
          {
            en: 'I see birds from my window.',
            native: 'నేను నా కిటికీ నుండి పక్షులను చూస్తాను.',
          },
          {
            en: 'Please open the window; it is hot.',
            native: 'దయచేసి కిటికీ తెరవండి; వేడిగా ఉంది.',
          },
        ],
      },
      hi: {
        word: 'खिड़की',
        question: 'अपने घर की एक खिड़की का वर्णन कीजिए।',
        examples: [
          {
            en: 'The window in my room is big.',
            native: 'मेरे कमरे की खिड़की बड़ी है।',
          },
          {
            en: 'I see birds from my window.',
            native: 'मैं अपनी खिड़की से पक्षी देखता हूँ।',
          },
          {
            en: 'Please open the window; it is hot.',
            native: 'कृपया खिड़की खोलिए; गर्मी है।',
          },
        ],
      },
      es: {
        word: 'ventana',
        question: 'Describe una ventana de tu casa.',
        examples: [
          {
            en: 'The window in my room is big.',
            native: 'La ventana de mi habitación es grande.',
          },
          {
            en: 'I see birds from my window.',
            native: 'Veo pájaros desde mi ventana.',
          },
          {
            en: 'Please open the window; it is hot.',
            native: 'Por favor, abre la ventana; hace calor.',
          },
        ],
      },
      zh: {
        word: '窗户',
        question: '描述一下你家的一扇窗户。',
        examples: [
          {
            en: 'The window in my room is big.',
            native: '我房间的窗户很大。',
          },
          {
            en: 'I see birds from my window.',
            native: '我从窗户看鸟。',
          },
          {
            en: 'Please open the window; it is hot.',
            native: '请打开窗户；很热。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'bed',
    questionText: 'Describe your bed.',
    translations: {
      te: {
        word: 'మంచం',
        question: 'మీ మంచాన్ని వివరించండి.',
        examples: [
          {
            en: 'My bed is big and soft.',
            native: 'నా మంచం పెద్దది మరియు మెత్తగా ఉంటుంది.',
          },
          {
            en: 'I sleep in my bed at night.',
            native: 'నేను రాత్రి నా మంచంలో నిద్రపోతాను.',
          },
          {
            en: 'There are two pillows on my bed.',
            native: 'నా మంచం మీద రెండు దిండ్లు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'बिस्तर',
        question: 'अपने बिस्तर का वर्णन कीजिए।',
        examples: [
          {
            en: 'My bed is big and soft.',
            native: 'मेरा बिस्तर बड़ा और नरम है।',
          },
          {
            en: 'I sleep in my bed at night.',
            native: 'मैं रात में अपने बिस्तर पर सोता हूँ।',
          },
          {
            en: 'There are two pillows on my bed.',
            native: 'मेरे बिस्तर पर दो तकिए हैं।',
          },
        ],
      },
      es: {
        word: 'cama',
        question: 'Describe tu cama.',
        examples: [
          {
            en: 'My bed is big and soft.',
            native: 'Mi cama es grande y blanda.',
          },
          {
            en: 'I sleep in my bed at night.',
            native: 'Duermo en mi cama por la noche.',
          },
          {
            en: 'There are two pillows on my bed.',
            native: 'Hay dos almohadas en mi cama.',
          },
        ],
      },
      zh: {
        word: '床',
        question: '描述一下你的床。',
        examples: [
          {
            en: 'My bed is big and soft.',
            native: '我的床又大又软。',
          },
          {
            en: 'I sleep in my bed at night.',
            native: '我晚上睡在床上。',
          },
          {
            en: 'There are two pillows on my bed.',
            native: '我的床上有两个枕头。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'table',
    questionText: 'Talk about the table in your home.',
    translations: {
      te: {
        word: 'బల్ల',
        question: 'మీ ఇంట్లోని బల్ల గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'We eat dinner at the table.',
            native: 'మేము బల్ల వద్ద రాత్రి భోజనం చేస్తాము.',
          },
          {
            en: 'My books are on the table.',
            native: 'నా పుస్తకాలు బల్ల మీద ఉన్నాయి.',
          },
          {
            en: 'The table has four legs.',
            native: 'బల్లకు నాలుగు కాళ్లు ఉన్నాయి.',
          },
        ],
      },
      hi: {
        word: 'मेज़',
        question: 'अपने घर की मेज़ के बारे में बताइए।',
        examples: [
          {
            en: 'We eat dinner at the table.',
            native: 'हम मेज़ पर रात का खाना खाते हैं।',
          },
          {
            en: 'My books are on the table.',
            native: 'मेरी किताबें मेज़ पर हैं।',
          },
          {
            en: 'The table has four legs.',
            native: 'मेज़ के चार पैर हैं।',
          },
        ],
      },
      es: {
        word: 'mesa',
        question: 'Habla de la mesa de tu casa.',
        examples: [
          {
            en: 'We eat dinner at the table.',
            native: 'Cenamos en la mesa.',
          },
          {
            en: 'My books are on the table.',
            native: 'Mis libros están sobre la mesa.',
          },
          {
            en: 'The table has four legs.',
            native: 'La mesa tiene cuatro patas.',
          },
        ],
      },
      zh: {
        word: '桌子',
        question: '谈谈你家的桌子。',
        examples: [
          {
            en: 'We eat dinner at the table.',
            native: '我们在桌子旁吃晚饭。',
          },
          {
            en: 'My books are on the table.',
            native: '我的书在桌子上。',
          },
          {
            en: 'The table has four legs.',
            native: '桌子有四条腿。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'chair',
    questionText: 'Talk about chairs. Where do you sit?',
    translations: {
      te: {
        word: 'కుర్చీ',
        question: 'కుర్చీల గురించి మాట్లాడండి. మీరు ఎక్కడ కూర్చుంటారు?',
        examples: [
          {
            en: 'I sit on a chair in my class.',
            native: 'నేను నా తరగతిలో కుర్చీ మీద కూర్చుంటాను.',
          },
          {
            en: 'The old chair is made of wood.',
            native: 'పాత కుర్చీ చెక్కతో తయారు చేయబడింది.',
          },
          {
            en: 'My father reads the newspaper on his chair.',
            native: 'నా నాన్న తన కుర్చీలో పత్రిక చదువుతారు.',
          },
        ],
      },
      hi: {
        word: 'कुर्सी',
        question: 'कुर्सियों के बारे में बताइए। आप कहाँ बैठते हैं?',
        examples: [
          {
            en: 'I sit on a chair in my class.',
            native: 'मैं अपनी कक्षा में कुर्सी पर बैठता हूँ।',
          },
          {
            en: 'The old chair is made of wood.',
            native: 'पुरानी कुर्सी लकड़ी की बनी है।',
          },
          {
            en: 'My father reads the newspaper on his chair.',
            native: 'मेरे पिता अपनी कुर्सी पर अख़बार पढ़ते हैं।',
          },
        ],
      },
      es: {
        word: 'silla',
        question: 'Habla de las sillas. ¿Dónde te sientas?',
        examples: [
          {
            en: 'I sit on a chair in my class.',
            native: 'Me siento en una silla en mi clase.',
          },
          {
            en: 'The old chair is made of wood.',
            native: 'La silla vieja es de madera.',
          },
          {
            en: 'My father reads the newspaper on his chair.',
            native: 'Mi padre lee el periódico en su silla.',
          },
        ],
      },
      zh: {
        word: '椅子',
        question: '谈谈椅子。你坐在哪里？',
        examples: [
          {
            en: 'I sit on a chair in my class.',
            native: '我坐在教室的椅子上。',
          },
          {
            en: 'The old chair is made of wood.',
            native: '那把旧椅子是木头做的。',
          },
          {
            en: 'My father reads the newspaper on his chair.',
            native: '我爸爸坐在他的椅子上看报纸。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'garden',
    questionText: 'Describe your garden.',
    translations: {
      te: {
        word: 'తోట',
        question: 'మీ తోటను వివరించండి.',
        examples: [
          {
            en: 'Our garden has many flowers.',
            native: 'మా తోటలో చాలా పువ్వులు ఉన్నాయి.',
          },
          {
            en: 'I water the plants every morning.',
            native: 'నేను ప్రతి ఉదయం మొక్కలకు నీరు పోస్తాను.',
          },
          {
            en: 'Butterflies fly in our garden.',
            native: 'మా తోటలో సీతాకోకచిలుకలు ఎగురుతాయి.',
          },
        ],
      },
      hi: {
        word: 'बगीचा',
        question: 'अपने बगीचे का वर्णन कीजिए।',
        examples: [
          {
            en: 'Our garden has many flowers.',
            native: 'हमारे बगीचे में बहुत सारे फूल हैं।',
          },
          {
            en: 'I water the plants every morning.',
            native: 'मैं हर सुबह पौधों को पानी देता हूँ।',
          },
          {
            en: 'Butterflies fly in our garden.',
            native: 'हमारे बगीचे में तितलियाँ उड़ती हैं।',
          },
        ],
      },
      es: {
        word: 'jardín',
        question: 'Describe tu jardín.',
        examples: [
          {
            en: 'Our garden has many flowers.',
            native: 'Nuestro jardín tiene muchas flores.',
          },
          {
            en: 'I water the plants every morning.',
            native: 'Riego las plantas cada mañana.',
          },
          {
            en: 'Butterflies fly in our garden.',
            native: 'Las mariposas vuelan en nuestro jardín.',
          },
        ],
      },
      zh: {
        word: '花园',
        question: '描述一下你的花园。',
        examples: [
          {
            en: 'Our garden has many flowers.',
            native: '我们的花园里有很多花。',
          },
          {
            en: 'I water the plants every morning.',
            native: '我每天早上给植物浇水。',
          },
          {
            en: 'Butterflies fly in our garden.',
            native: '蝴蝶在我们的花园里飞。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'tree',
    questionText: 'Talk about trees. Do you like them?',
    translations: {
      te: {
        word: 'చెట్టు',
        question: 'చెట్ల గురించి మాట్లాడండి. మీకు అవి ఇష్టమా?',
        examples: [
          {
            en: 'The mango tree is very tall.',
            native: 'మామిడి చెట్టు చాలా ఎత్తుగా ఉంటుంది.',
          },
          {
            en: 'Trees give us fruit and shade.',
            native: 'చెట్లు మనకు పండ్లు మరియు నీడ ఇస్తాయి.',
          },
          {
            en: 'Birds make nests in the tree.',
            native: 'పక్షులు చెట్టులో గూళ్లు కడతాయి.',
          },
        ],
      },
      hi: {
        word: 'पेड़',
        question: 'पेड़ों के बारे में बताइए। क्या आपको वे पसंद हैं?',
        examples: [
          {
            en: 'The mango tree is very tall.',
            native: 'आम का पेड़ बहुत ऊँचा है।',
          },
          {
            en: 'Trees give us fruit and shade.',
            native: 'पेड़ हमें फल और छाया देते हैं।',
          },
          {
            en: 'Birds make nests in the tree.',
            native: 'पक्षी पेड़ पर घोंसले बनाते हैं।',
          },
        ],
      },
      es: {
        word: 'árbol',
        question: 'Habla de los árboles. ¿Te gustan?',
        examples: [
          {
            en: 'The mango tree is very tall.',
            native: 'El árbol de mango es muy alto.',
          },
          {
            en: 'Trees give us fruit and shade.',
            native: 'Los árboles nos dan fruta y sombra.',
          },
          {
            en: 'Birds make nests in the tree.',
            native: 'Los pájaros hacen nidos en el árbol.',
          },
        ],
      },
      zh: {
        word: '树',
        question: '谈谈树。你喜欢它们吗？',
        examples: [
          {
            en: 'The mango tree is very tall.',
            native: '芒果树很高。',
          },
          {
            en: 'Trees give us fruit and shade.',
            native: '树给我们水果和树荫。',
          },
          {
            en: 'Birds make nests in the tree.',
            native: '鸟在树上筑巢。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'flower',
    questionText: 'What flowers do you like?',
    translations: {
      te: {
        word: 'పువ్వు',
        question: 'మీకు ఏ పువ్వులు ఇష్టం?',
        examples: [
          {
            en: 'I like the red rose very much.',
            native: 'నాకు ఎర్రని గులాబీ చాలా ఇష్టం.',
          },
          {
            en: 'The jasmine flower smells very good.',
            native: 'మల్లెపూవు చాలా మంచి వాసన కలిగి ఉంటుంది.',
          },
          {
            en: 'We give flowers to our teacher.',
            native: 'మేము మా ఉపాధ్యాయుడికి పువ్వులు ఇస్తాము.',
          },
        ],
      },
      hi: {
        word: 'फूल',
        question: 'आपको कौन से फूल पसंद हैं?',
        examples: [
          {
            en: 'I like the red rose very much.',
            native: 'मुझे लाल गुलाब बहुत पसंद है।',
          },
          {
            en: 'The jasmine flower smells very good.',
            native: 'चमेली का फूल बहुत अच्छी खुशबू देता है।',
          },
          {
            en: 'We give flowers to our teacher.',
            native: 'हम अपने शिक्षक को फूल देते हैं।',
          },
        ],
      },
      es: {
        word: 'flor',
        question: '¿Qué flores te gustan?',
        examples: [
          {
            en: 'I like the red rose very much.',
            native: 'Me gusta mucho la rosa roja.',
          },
          {
            en: 'The jasmine flower smells very good.',
            native: 'La flor de jazmín huele muy bien.',
          },
          {
            en: 'We give flowers to our teacher.',
            native: 'Le damos flores a nuestro maestro.',
          },
        ],
      },
      zh: {
        word: '花',
        question: '你喜欢什么花？',
        examples: [
          {
            en: 'I like the red rose very much.',
            native: '我非常喜欢红玫瑰。',
          },
          {
            en: 'The jasmine flower smells very good.',
            native: '茉莉花很香。',
          },
          {
            en: 'We give flowers to our teacher.',
            native: '我们给老师送花。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'classroom',
    questionText: 'Describe your classroom.',
    translations: {
      te: {
        word: 'తరగతి గది',
        question: 'మీ తరగతి గదిని వివరించండి.',
        examples: [
          {
            en: 'My classroom is big and bright.',
            native: 'నా తరగతి గది పెద్దది మరియు వెలుతురుగా ఉంటుంది.',
          },
          {
            en: 'There are thirty students in my class.',
            native: 'నా తరగతిలో ముప్పై మంది విద్యార్థులు ఉన్నారు.',
          },
          {
            en: 'Our teacher writes on the blackboard.',
            native: 'మా ఉపాధ్యాయుడు బలపం పలక మీద వ్రాస్తారు.',
          },
        ],
      },
      hi: {
        word: 'कक्षा',
        question: 'अपनी कक्षा का वर्णन कीजिए।',
        examples: [
          {
            en: 'My classroom is big and bright.',
            native: 'मेरी कक्षा बड़ी और रोशन है।',
          },
          {
            en: 'There are thirty students in my class.',
            native: 'मेरी कक्षा में तीस छात्र हैं।',
          },
          {
            en: 'Our teacher writes on the blackboard.',
            native: 'हमारे शिक्षक ब्लैकबोर्ड पर लिखते हैं।',
          },
        ],
      },
      es: {
        word: 'aula',
        question: 'Describe tu aula.',
        examples: [
          {
            en: 'My classroom is big and bright.',
            native: 'Mi aula es grande y luminosa.',
          },
          {
            en: 'There are thirty students in my class.',
            native: 'Hay treinta estudiantes en mi clase.',
          },
          {
            en: 'Our teacher writes on the blackboard.',
            native: 'Nuestra maestra escribe en la pizarra.',
          },
        ],
      },
      zh: {
        word: '教室',
        question: '描述一下你的教室。',
        examples: [
          {
            en: 'My classroom is big and bright.',
            native: '我的教室又大又明亮。',
          },
          {
            en: 'There are thirty students in my class.',
            native: '我班上有三十个学生。',
          },
          {
            en: 'Our teacher writes on the blackboard.',
            native: '我们的老师在黑板上写字。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'teacher',
    questionText: 'Talk about your teacher.',
    translations: {
      te: {
        word: 'ఉపాధ్యాయుడు',
        question: 'మీ ఉపాధ్యాయుడి గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My teacher is very kind.',
            native: 'నా ఉపాధ్యాయుడు చాలా దయగలవారు.',
          },
          {
            en: 'She teaches us English every day.',
            native: 'ఆమె ప్రతిరోజూ మాకు ఇంగ్లీషు నేర్పుతుంది.',
          },
          {
            en: 'Our teacher helps us with our homework.',
            native: 'మా ఉపాధ్యాయుడు గృహపాఠంలో మాకు సహాయం చేస్తారు.',
          },
        ],
      },
      hi: {
        word: 'शिक्षक',
        question: 'अपने शिक्षक के बारे में बताइए।',
        examples: [
          {
            en: 'My teacher is very kind.',
            native: 'मेरे शिक्षक बहुत दयालु हैं।',
          },
          {
            en: 'She teaches us English every day.',
            native: 'वह हमें रोज़ अंग्रेज़ी पढ़ाती हैं।',
          },
          {
            en: 'Our teacher helps us with our homework.',
            native: 'हमारे शिक्षक गृहकार्य में हमारी मदद करते हैं।',
          },
        ],
      },
      es: {
        word: 'maestro',
        question: 'Habla de tu maestro.',
        examples: [
          {
            en: 'My teacher is very kind.',
            native: 'Mi maestra es muy amable.',
          },
          {
            en: 'She teaches us English every day.',
            native: 'Ella nos enseña inglés todos los días.',
          },
          {
            en: 'Our teacher helps us with our homework.',
            native: 'Nuestra maestra nos ayuda con los deberes.',
          },
        ],
      },
      zh: {
        word: '老师',
        question: '谈谈你的老师。',
        examples: [
          {
            en: 'My teacher is very kind.',
            native: '我的老师非常和蔼。',
          },
          {
            en: 'She teaches us English every day.',
            native: '她每天教我们英语。',
          },
          {
            en: 'Our teacher helps us with our homework.',
            native: '我们的老师帮助我们做家庭作业。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'book',
    questionText: 'Do you like books? Which book do you like?',
    translations: {
      te: {
        word: 'పుస్తకం',
        question: 'మీకు పుస్తకాలు ఇష్టమా? మీకు ఏ పుస్తకం ఇష్టం?',
        examples: [
          {
            en: 'I read a story book every night.',
            native: 'నేను ప్రతి రాత్రి కథా పుస్తకం చదువుతాను.',
          },
          {
            en: 'This book has many pictures.',
            native: 'ఈ పుస్తకంలో చాలా చిత్రాలు ఉన్నాయి.',
          },
          {
            en: 'My favourite book is about animals.',
            native: 'నాకు ఇష్టమైన పుస్తకం జంతువుల గురించి.',
          },
        ],
      },
      hi: {
        word: 'किताब',
        question: 'क्या आपको किताबें पसंद हैं? आपको कौन सी किताब पसंद है?',
        examples: [
          {
            en: 'I read a story book every night.',
            native: 'मैं हर रात एक कहानी की किताब पढ़ता हूँ।',
          },
          {
            en: 'This book has many pictures.',
            native: 'इस किताब में बहुत सारी तस्वीरें हैं।',
          },
          {
            en: 'My favourite book is about animals.',
            native: 'मेरी पसंदीदा किताब जानवरों के बारे में है।',
          },
        ],
      },
      es: {
        word: 'libro',
        question: '¿Te gustan los libros? ¿Qué libro te gusta?',
        examples: [
          {
            en: 'I read a story book every night.',
            native: 'Leo un libro de cuentos cada noche.',
          },
          {
            en: 'This book has many pictures.',
            native: 'Este libro tiene muchas imágenes.',
          },
          {
            en: 'My favourite book is about animals.',
            native: 'Mi libro favorito trata sobre animales.',
          },
        ],
      },
      zh: {
        word: '书',
        question: '你喜欢书吗？你喜欢哪本书？',
        examples: [
          {
            en: 'I read a story book every night.',
            native: '我每天晚上读一本故事书。',
          },
          {
            en: 'This book has many pictures.',
            native: '这本书有很多图片。',
          },
          {
            en: 'My favourite book is about animals.',
            native: '我最喜欢的书是关于动物的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'pen',
    questionText: 'Talk about your pen.',
    translations: {
      te: {
        word: 'పెన్ను',
        question: 'మీ పెన్ను గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I write with a blue pen.',
            native: 'నేను నీలం పెన్నుతో వ్రాస్తాను.',
          },
          {
            en: 'My pen is in my bag.',
            native: 'నా పెన్ను నా బ్యాగులో ఉంది.',
          },
          {
            en: 'This pen was a gift from my uncle.',
            native: 'ఈ పెన్ను నా మామయ్య ఇచ్చిన బహుమతి.',
          },
        ],
      },
      hi: {
        word: 'पेन',
        question: 'अपने पेन के बारे में बताइए।',
        examples: [
          {
            en: 'I write with a blue pen.',
            native: 'मैं नीले पेन से लिखता हूँ।',
          },
          {
            en: 'My pen is in my bag.',
            native: 'मेरा पेन मेरे बैग में है।',
          },
          {
            en: 'This pen was a gift from my uncle.',
            native: 'यह पेन मेरे चाचा का तोहफ़ा था।',
          },
        ],
      },
      es: {
        word: 'bolígrafo',
        question: 'Habla de tu bolígrafo.',
        examples: [
          {
            en: 'I write with a blue pen.',
            native: 'Escribo con un bolígrafo azul.',
          },
          {
            en: 'My pen is in my bag.',
            native: 'Mi bolígrafo está en mi mochila.',
          },
          {
            en: 'This pen was a gift from my uncle.',
            native: 'Este bolígrafo fue un regalo de mi tío.',
          },
        ],
      },
      zh: {
        word: '钢笔',
        question: '谈谈你的钢笔。',
        examples: [
          {
            en: 'I write with a blue pen.',
            native: '我用蓝色的钢笔写字。',
          },
          {
            en: 'My pen is in my bag.',
            native: '我的钢笔在我的书包里。',
          },
          {
            en: 'This pen was a gift from my uncle.',
            native: '这支钢笔是我叔叔送的礼物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'bag',
    questionText: 'Describe your bag.',
    translations: {
      te: {
        word: 'బ్యాగు',
        question: 'మీ బ్యాగును వివరించండి.',
        examples: [
          {
            en: 'My bag is red and heavy.',
            native: 'నా బ్యాగు ఎరుపు రంగులో మరియు బరువుగా ఉంటుంది.',
          },
          {
            en: 'I keep my books in my bag.',
            native: 'నేను నా పుస్తకాలు బ్యాగులో ఉంచుతాను.',
          },
          {
            en: 'I carry my bag to school every day.',
            native: 'నేను ప్రతిరోజూ నా బ్యాగును పాఠశాలకు మోసుకువెళ్తాను.',
          },
        ],
      },
      hi: {
        word: 'बैग',
        question: 'अपने बैग का वर्णन कीजिए।',
        examples: [
          {
            en: 'My bag is red and heavy.',
            native: 'मेरा बैग लाल और भारी है।',
          },
          {
            en: 'I keep my books in my bag.',
            native: 'मैं अपनी किताबें अपने बैग में रखता हूँ।',
          },
          {
            en: 'I carry my bag to school every day.',
            native: 'मैं रोज़ अपना बैग स्कूल ले जाता हूँ।',
          },
        ],
      },
      es: {
        word: 'mochila',
        question: 'Describe tu mochila.',
        examples: [
          {
            en: 'My bag is red and heavy.',
            native: 'Mi mochila es roja y pesada.',
          },
          {
            en: 'I keep my books in my bag.',
            native: 'Guardo mis libros en mi mochila.',
          },
          {
            en: 'I carry my bag to school every day.',
            native: 'Llevo mi mochila a la escuela todos los días.',
          },
        ],
      },
      zh: {
        word: '书包',
        question: '描述一下你的书包。',
        examples: [
          {
            en: 'My bag is red and heavy.',
            native: '我的书包是红色的，很重。',
          },
          {
            en: 'I keep my books in my bag.',
            native: '我把书放在书包里。',
          },
          {
            en: 'I carry my bag to school every day.',
            native: '我每天背着书包去上学。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'homework',
    questionText: 'Do you do your homework every day?',
    translations: {
      te: {
        word: 'గృహపాఠం',
        question: 'మీరు ప్రతిరోజూ గృహపాఠం చేస్తారా?',
        examples: [
          {
            en: 'I do my homework in the evening.',
            native: 'నేను సాయంత్రం గృహపాఠం చేస్తాను.',
          },
          {
            en: 'My homework is easy today.',
            native: 'ఈరోజు నా గృహపాఠం సులభం.',
          },
          {
            en: 'I finish my homework before dinner.',
            native: 'నేను రాత్రి భోజనానికి ముందు గృహపాఠం పూర్తి చేస్తాను.',
          },
        ],
      },
      hi: {
        word: 'गृहकार्य',
        question: 'क्या आप रोज़ अपना गृहकार्य करते हैं?',
        examples: [
          {
            en: 'I do my homework in the evening.',
            native: 'मैं शाम को अपना गृहकार्य करता हूँ।',
          },
          {
            en: 'My homework is easy today.',
            native: 'आज मेरा गृहकार्य आसान है।',
          },
          {
            en: 'I finish my homework before dinner.',
            native: 'मैं रात के खाने से पहले अपना गृहकार्य पूरा करता हूँ।',
          },
        ],
      },
      es: {
        word: 'deberes',
        question: '¿Haces tus deberes todos los días?',
        examples: [
          {
            en: 'I do my homework in the evening.',
            native: 'Hago mis deberes por la tarde.',
          },
          {
            en: 'My homework is easy today.',
            native: 'Mis deberes son fáciles hoy.',
          },
          {
            en: 'I finish my homework before dinner.',
            native: 'Termino mis deberes antes de la cena.',
          },
        ],
      },
      zh: {
        word: '家庭作业',
        question: '你每天做家庭作业吗？',
        examples: [
          {
            en: 'I do my homework in the evening.',
            native: '我晚上做家庭作业。',
          },
          {
            en: 'My homework is easy today.',
            native: '我今天的家庭作业很简单。',
          },
          {
            en: 'I finish my homework before dinner.',
            native: '我晚饭前完成家庭作业。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'bus',
    questionText: 'Do you travel by bus? Talk about it.',
    translations: {
      te: {
        word: 'బస్సు',
        question: 'మీరు బస్సులో ప్రయాణిస్తారా? దాని గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'I go to school by bus.',
            native: 'నేను బస్సులో పాఠశాలకు వెళ్తాను.',
          },
          {
            en: 'The bus stops near my house.',
            native: 'బస్సు నా ఇంటి దగ్గర ఆగుతుంది.',
          },
          {
            en: 'The bus is full of people in the morning.',
            native: 'ఉదయం బస్సు జనాలతో నిండి ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'बस',
        question: 'क्या आप बस से यात्रा करते हैं? उसके बारे में बताइए।',
        examples: [
          {
            en: 'I go to school by bus.',
            native: 'मैं बस से स्कूल जाता हूँ।',
          },
          {
            en: 'The bus stops near my house.',
            native: 'बस मेरे घर के पास रुकती है।',
          },
          {
            en: 'The bus is full of people in the morning.',
            native: 'सुबह बस लोगों से भरी होती है।',
          },
        ],
      },
      es: {
        word: 'autobús',
        question: '¿Viajas en autobús? Habla de ello.',
        examples: [
          {
            en: 'I go to school by bus.',
            native: 'Voy a la escuela en autobús.',
          },
          {
            en: 'The bus stops near my house.',
            native: 'El autobús para cerca de mi casa.',
          },
          {
            en: 'The bus is full of people in the morning.',
            native: 'El autobús está lleno de gente por la mañana.',
          },
        ],
      },
      zh: {
        word: '公交车',
        question: '你坐公交车出行吗？谈谈它。',
        examples: [
          {
            en: 'I go to school by bus.',
            native: '我坐公交车去上学。',
          },
          {
            en: 'The bus stops near my house.',
            native: '公交车在我家附近停。',
          },
          {
            en: 'The bus is full of people in the morning.',
            native: '早上公交车挤满了人。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'train',
    questionText: 'Have you travelled by train? Describe it.',
    translations: {
      te: {
        word: 'రైలు',
        question: 'మీరు రైలులో ప్రయాణించారా? దానిని వివరించండి.',
        examples: [
          {
            en: 'The train is long and fast.',
            native: 'రైలు పొడవుగా మరియు వేగంగా ఉంటుంది.',
          },
          {
            en: 'I went to my village by train.',
            native: 'నేను రైలులో నా ఊరికి వెళ్లాను.',
          },
          {
            en: 'We buy tickets at the station.',
            native: 'మేము స్టేషన్లో టిక్కెట్లు కొంటాము.',
          },
        ],
      },
      hi: {
        word: 'ट्रेन',
        question: 'क्या आपने ट्रेन से यात्रा की है? उसका वर्णन कीजिए।',
        examples: [
          {
            en: 'The train is long and fast.',
            native: 'ट्रेन लंबी और तेज़ होती है।',
          },
          {
            en: 'I went to my village by train.',
            native: 'मैं ट्रेन से अपने गाँव गया।',
          },
          {
            en: 'We buy tickets at the station.',
            native: 'हम स्टेशन पर टिकट खरीदते हैं।',
          },
        ],
      },
      es: {
        word: 'tren',
        question: '¿Has viajado en tren? Descríbelo.',
        examples: [
          {
            en: 'The train is long and fast.',
            native: 'El tren es largo y rápido.',
          },
          {
            en: 'I went to my village by train.',
            native: 'Fui a mi pueblo en tren.',
          },
          {
            en: 'We buy tickets at the station.',
            native: 'Compramos billetes en la estación.',
          },
        ],
      },
      zh: {
        word: '火车',
        question: '你坐过火车吗？描述一下。',
        examples: [
          {
            en: 'The train is long and fast.',
            native: '火车又长又快。',
          },
          {
            en: 'I went to my village by train.',
            native: '我坐火车去了我的村子。',
          },
          {
            en: 'We buy tickets at the station.',
            native: '我们在车站买票。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'car',
    questionText: 'Talk about cars. Do you like them?',
    translations: {
      te: {
        word: 'కారు',
        question: 'కార్ల గురించి మాట్లాడండి. మీకు అవి ఇష్టమా?',
        examples: [
          {
            en: 'My father drives a red car.',
            native: 'నా నాన్న ఎరుపు రంగు కారు నడుపుతారు.',
          },
          {
            en: 'We go to the market by car.',
            native: 'మేము కారులో మార్కెట్కు వెళ్తాము.',
          },
          {
            en: 'The car has four wheels.',
            native: 'కారుకు నాలుగు చక్రాలు ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'कार',
        question: 'कारों के बारे में बताइए। क्या आपको वे पसंद हैं?',
        examples: [
          {
            en: 'My father drives a red car.',
            native: 'मेरे पिता लाल कार चलाते हैं।',
          },
          {
            en: 'We go to the market by car.',
            native: 'हम कार से बाज़ार जाते हैं।',
          },
          {
            en: 'The car has four wheels.',
            native: 'कार के चार पहिए होते हैं।',
          },
        ],
      },
      es: {
        word: 'coche',
        question: 'Habla de los coches. ¿Te gustan?',
        examples: [
          {
            en: 'My father drives a red car.',
            native: 'Mi padre conduce un coche rojo.',
          },
          {
            en: 'We go to the market by car.',
            native: 'Vamos al mercado en coche.',
          },
          {
            en: 'The car has four wheels.',
            native: 'El coche tiene cuatro ruedas.',
          },
        ],
      },
      zh: {
        word: '汽车',
        question: '谈谈汽车。你喜欢它们吗？',
        examples: [
          {
            en: 'My father drives a red car.',
            native: '我爸爸开一辆红色的汽车。',
          },
          {
            en: 'We go to the market by car.',
            native: '我们开车去市场。',
          },
          {
            en: 'The car has four wheels.',
            native: '汽车有四个轮子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'bicycle',
    questionText: 'Can you ride a bicycle?',
    translations: {
      te: {
        word: 'సైకిల్',
        question: 'మీరు సైకిల్ తొక్కగలరా?',
        examples: [
          {
            en: 'I ride my bicycle in the park.',
            native: 'నేను పార్కులో నా సైకిల్ తొక్కుతాను.',
          },
          {
            en: 'My bicycle is blue and new.',
            native: 'నా సైకిల్ నీలం రంగులో మరియు కొత్తది.',
          },
          {
            en: 'My brother taught me to ride.',
            native: 'నా అన్నయ్య నాకు తొక్కడం నేర్పాడు.',
          },
        ],
      },
      hi: {
        word: 'साइकिल',
        question: 'क्या आप साइकिल चला सकते हैं?',
        examples: [
          {
            en: 'I ride my bicycle in the park.',
            native: 'मैं पार्क में अपनी साइकिल चलाता हूँ।',
          },
          {
            en: 'My bicycle is blue and new.',
            native: 'मेरी साइकिल नीली और नई है।',
          },
          {
            en: 'My brother taught me to ride.',
            native: 'मेरे भाई ने मुझे चलाना सिखाया।',
          },
        ],
      },
      es: {
        word: 'bicicleta',
        question: '¿Sabes montar en bicicleta?',
        examples: [
          {
            en: 'I ride my bicycle in the park.',
            native: 'Monto mi bicicleta en el parque.',
          },
          {
            en: 'My bicycle is blue and new.',
            native: 'Mi bicicleta es azul y nueva.',
          },
          {
            en: 'My brother taught me to ride.',
            native: 'Mi hermano me enseñó a montar.',
          },
        ],
      },
      zh: {
        word: '自行车',
        question: '你会骑自行车吗？',
        examples: [
          {
            en: 'I ride my bicycle in the park.',
            native: '我在公园里骑自行车。',
          },
          {
            en: 'My bicycle is blue and new.',
            native: '我的自行车是蓝色的，很新。',
          },
          {
            en: 'My brother taught me to ride.',
            native: '我哥哥教我骑车。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'ticket',
    questionText: 'When do you buy a ticket?',
    translations: {
      te: {
        word: 'టిక్కెట్',
        question: 'మీరు ఎప్పుడు టిక్కెట్ కొంటారు?',
        examples: [
          {
            en: 'I buy a ticket before the movie.',
            native: 'నేను సినిమాకు ముందు టిక్కెట్ కొంటాను.',
          },
          {
            en: 'The bus ticket costs ten rupees.',
            native: 'బస్సు టిక్కెట్ పది రూపాయలు అవుతుంది.',
          },
          {
            en: 'She keeps the ticket in her bag.',
            native: 'ఆమె టిక్కెట్ను తన బ్యాగులో ఉంచుతుంది.',
          },
        ],
      },
      hi: {
        word: 'टिकट',
        question: 'आप कब टिकट खरीदते हैं?',
        examples: [
          {
            en: 'I buy a ticket before the movie.',
            native: 'मैं फ़िल्म से पहले टिकट खरीदता हूँ।',
          },
          {
            en: 'The bus ticket costs ten rupees.',
            native: 'बस का टिकट दस रुपये का है।',
          },
          {
            en: 'She keeps the ticket in her bag.',
            native: 'वह टिकट अपने बैग में रखती है।',
          },
        ],
      },
      es: {
        word: 'billete',
        question: '¿Cuándo compras un billete?',
        examples: [
          {
            en: 'I buy a ticket before the movie.',
            native: 'Compro una entrada antes de la película.',
          },
          {
            en: 'The bus ticket costs ten rupees.',
            native: 'El billete de autobús cuesta diez rupias.',
          },
          {
            en: 'She keeps the ticket in her bag.',
            native: 'Ella guarda el billete en su bolso.',
          },
        ],
      },
      zh: {
        word: '票',
        question: '你什么时候买票？',
        examples: [
          {
            en: 'I buy a ticket before the movie.',
            native: '我在看电影前买票。',
          },
          {
            en: 'The bus ticket costs ten rupees.',
            native: '公交车票十卢比。',
          },
          {
            en: 'She keeps the ticket in her bag.',
            native: '她把票放在包里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'station',
    questionText: 'Describe a bus or train station.',
    translations: {
      te: {
        word: 'స్టేషన్',
        question: 'బస్సు లేదా రైలు స్టేషన్‌ను వివరించండి.',
        examples: [
          {
            en: 'The station is full of people.',
            native: 'స్టేషన్ జనాలతో నిండి ఉంటుంది.',
          },
          {
            en: 'We wait for the train at the station.',
            native: 'మేము స్టేషన్లో రైలు కోసం ఎదురుచూస్తాము.',
          },
          {
            en: 'There is a small shop at the station.',
            native: 'స్టేషన్లో ఒక చిన్న దుకాణం ఉంది.',
          },
        ],
      },
      hi: {
        word: 'स्टेशन',
        question: 'बस या ट्रेन स्टेशन का वर्णन कीजिए।',
        examples: [
          {
            en: 'The station is full of people.',
            native: 'स्टेशन लोगों से भरा होता है।',
          },
          {
            en: 'We wait for the train at the station.',
            native: 'हम स्टेशन पर ट्रेन का इंतज़ार करते हैं।',
          },
          {
            en: 'There is a small shop at the station.',
            native: 'स्टेशन पर एक छोटी दुकान है।',
          },
        ],
      },
      es: {
        word: 'estación',
        question: 'Describe una estación de autobús o de tren.',
        examples: [
          {
            en: 'The station is full of people.',
            native: 'La estación está llena de gente.',
          },
          {
            en: 'We wait for the train at the station.',
            native: 'Esperamos el tren en la estación.',
          },
          {
            en: 'There is a small shop at the station.',
            native: 'Hay una tienda pequeña en la estación.',
          },
        ],
      },
      zh: {
        word: '车站',
        question: '描述一个公交车站或火车站。',
        examples: [
          {
            en: 'The station is full of people.',
            native: '车站挤满了人。',
          },
          {
            en: 'We wait for the train at the station.',
            native: '我们在车站等火车。',
          },
          {
            en: 'There is a small shop at the station.',
            native: '车站里有一家小商店。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'rain',
    questionText: 'Do you like rain? Why?',
    translations: {
      te: {
        word: 'వర్షం',
        question: 'మీకు వర్షం ఇష్టమా? ఎందుకు?',
        examples: [
          {
            en: 'I like to play in the rain.',
            native: 'నాకు వర్షంలో ఆడుకోవడం ఇష్టం.',
          },
          {
            en: 'The rain makes the trees green.',
            native: 'వర్షం చెట్లను పచ్చగా చేస్తుంది.',
          },
          {
            en: 'We stay inside when it rains.',
            native: 'వర్షం పడినప్పుడు మేము లోపలే ఉంటాము.',
          },
        ],
      },
      hi: {
        word: 'बारिश',
        question: 'क्या आपको बारिश पसंद है? क्यों?',
        examples: [
          {
            en: 'I like to play in the rain.',
            native: 'मुझे बारिश में खेलना पसंद है।',
          },
          {
            en: 'The rain makes the trees green.',
            native: 'बारिश पेड़ों को हरा बनाती है।',
          },
          {
            en: 'We stay inside when it rains.',
            native: 'बारिश होने पर हम अंदर रहते हैं।',
          },
        ],
      },
      es: {
        word: 'lluvia',
        question: '¿Te gusta la lluvia? ¿Por qué?',
        examples: [
          {
            en: 'I like to play in the rain.',
            native: 'Me gusta jugar bajo la lluvia.',
          },
          {
            en: 'The rain makes the trees green.',
            native: 'La lluvia hace verdes los árboles.',
          },
          {
            en: 'We stay inside when it rains.',
            native: 'Nos quedamos dentro cuando llueve.',
          },
        ],
      },
      zh: {
        word: '雨',
        question: '你喜欢雨吗？为什么？',
        examples: [
          {
            en: 'I like to play in the rain.',
            native: '我喜欢在雨中玩。',
          },
          {
            en: 'The rain makes the trees green.',
            native: '雨让树变绿。',
          },
          {
            en: 'We stay inside when it rains.',
            native: '下雨时我们待在屋里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'sun',
    questionText: 'Talk about the sun. When do you see it?',
    translations: {
      te: {
        word: 'సూర్యుడు',
        question: 'సూర్యుడి గురించి మాట్లాడండి. మీరు అతనిని ఎప్పుడు చూస్తారు?',
        examples: [
          {
            en: 'The sun rises in the morning.',
            native: 'సూర్యుడు ఉదయం ఉదయిస్తాడు.',
          },
          {
            en: 'The sun is big and hot.',
            native: 'సూర్యుడు పెద్దవాడు మరియు వేడిగా ఉంటాడు.',
          },
          {
            en: 'We dry our clothes in the sun.',
            native: 'మేము ఎండలో మా బట్టలు ఆరబెడతాము.',
          },
        ],
      },
      hi: {
        word: 'सूरज',
        question: 'सूरज के बारे में बताइए। आप इसे कब देखते हैं?',
        examples: [
          {
            en: 'The sun rises in the morning.',
            native: 'सूरज सुबह निकलता है।',
          },
          {
            en: 'The sun is big and hot.',
            native: 'सूरज बड़ा और गर्म होता है।',
          },
          {
            en: 'We dry our clothes in the sun.',
            native: 'हम धूप में अपने कपड़े सुखाते हैं।',
          },
        ],
      },
      es: {
        word: 'sol',
        question: 'Habla del sol. ¿Cuándo lo ves?',
        examples: [
          {
            en: 'The sun rises in the morning.',
            native: 'El sol sale por la mañana.',
          },
          {
            en: 'The sun is big and hot.',
            native: 'El sol es grande y caliente.',
          },
          {
            en: 'We dry our clothes in the sun.',
            native: 'Secamos nuestra ropa al sol.',
          },
        ],
      },
      zh: {
        word: '太阳',
        question: '谈谈太阳。你什么时候看到它？',
        examples: [
          {
            en: 'The sun rises in the morning.',
            native: '太阳早上升起。',
          },
          {
            en: 'The sun is big and hot.',
            native: '太阳又大又热。',
          },
          {
            en: 'We dry our clothes in the sun.',
            native: '我们在太阳下晒衣服。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'cloud',
    questionText: 'Talk about clouds. What do they look like?',
    translations: {
      te: {
        word: 'మేఘం',
        question: 'మేఘాల గురించి మాట్లాడండి. అవి ఎలా కనిపిస్తాయి?',
        examples: [
          {
            en: 'The clouds are white and soft.',
            native: 'మేఘాలు తెల్లగా మరియు మెత్తగా ఉంటాయి.',
          },
          {
            en: 'Black clouds bring rain.',
            native: 'నల్లని మేఘాలు వర్షం తెస్తాయి.',
          },
          {
            en: 'I see clouds in the blue sky.',
            native: 'నేను నీలి ఆకాశంలో మేఘాలను చూస్తాను.',
          },
        ],
      },
      hi: {
        word: 'बादल',
        question: 'बादलों के बारे में बताइए। वे कैसे दिखते हैं?',
        examples: [
          {
            en: 'The clouds are white and soft.',
            native: 'बादल सफ़ेद और नरम होते हैं।',
          },
          {
            en: 'Black clouds bring rain.',
            native: 'काले बादल बारिश लाते हैं।',
          },
          {
            en: 'I see clouds in the blue sky.',
            native: 'मैं नीले आसमान में बादल देखता हूँ।',
          },
        ],
      },
      es: {
        word: 'nube',
        question: 'Habla de las nubes. ¿Cómo son?',
        examples: [
          {
            en: 'The clouds are white and soft.',
            native: 'Las nubes son blancas y suaves.',
          },
          {
            en: 'Black clouds bring rain.',
            native: 'Las nubes negras traen lluvia.',
          },
          {
            en: 'I see clouds in the blue sky.',
            native: 'Veo nubes en el cielo azul.',
          },
        ],
      },
      zh: {
        word: '云',
        question: '谈谈云。它们看起来什么样？',
        examples: [
          {
            en: 'The clouds are white and soft.',
            native: '云又白又软。',
          },
          {
            en: 'Black clouds bring rain.',
            native: '乌云带来雨。',
          },
          {
            en: 'I see clouds in the blue sky.',
            native: '我看到蓝天中的云。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'summer',
    questionText: 'Do you like summer? What do you do?',
    translations: {
      te: {
        word: 'వేసవి',
        question: 'మీకు వేసవి ఇష్టమా? మీరు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'Summer days are long and hot.',
            native: 'వేసవి రోజులు పొడవుగా మరియు వేడిగా ఉంటాయి.',
          },
          {
            en: 'We eat ice cream in summer.',
            native: 'మేము వేసవిలో ఐస్ క్రీం తింటాము.',
          },
          {
            en: 'I drink cold water in summer.',
            native: 'నేను వేసవిలో చల్లని నీరు తాగుతాను.',
          },
        ],
      },
      hi: {
        word: 'गर्मी',
        question: 'क्या आपको गर्मी पसंद है? आप क्या करते हैं?',
        examples: [
          {
            en: 'Summer days are long and hot.',
            native: 'गर्मी के दिन लंबे और गर्म होते हैं।',
          },
          {
            en: 'We eat ice cream in summer.',
            native: 'हम गर्मियों में आइसक्रीम खाते हैं।',
          },
          {
            en: 'I drink cold water in summer.',
            native: 'मैं गर्मियों में ठंडा पानी पीता हूँ।',
          },
        ],
      },
      es: {
        word: 'verano',
        question: '¿Te gusta el verano? ¿Qué haces?',
        examples: [
          {
            en: 'Summer days are long and hot.',
            native: 'Los días de verano son largos y calurosos.',
          },
          {
            en: 'We eat ice cream in summer.',
            native: 'Comemos helado en verano.',
          },
          {
            en: 'I drink cold water in summer.',
            native: 'Bebo agua fría en verano.',
          },
        ],
      },
      zh: {
        word: '夏天',
        question: '你喜欢夏天吗？你做什么？',
        examples: [
          {
            en: 'Summer days are long and hot.',
            native: '夏天的白天又长又热。',
          },
          {
            en: 'We eat ice cream in summer.',
            native: '我们夏天吃冰淇淋。',
          },
          {
            en: 'I drink cold water in summer.',
            native: '我夏天喝凉水。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'winter',
    questionText: 'Do you like winter? What do you wear?',
    translations: {
      te: {
        word: 'చలికాలం',
        question: 'మీకు చలికాలం ఇష్టమా? మీరు ఏమి ధరిస్తారు?',
        examples: [
          {
            en: 'Winter mornings are cold and foggy.',
            native: 'చలికాలం ఉదయాలు చల్లగా మరియు పొగమంచుగా ఉంటాయి.',
          },
          {
            en: 'I wear a warm jacket in winter.',
            native: 'నేను చలికాలంలో వెచ్చని జాకెట్ ధరిస్తాను.',
          },
          {
            en: 'We drink hot tea in winter.',
            native: 'మేము చలికాలంలో వేడి టీ తాగుతాము.',
          },
        ],
      },
      hi: {
        word: 'सर्दी',
        question: 'क्या आपको सर्दी पसंद है? आप क्या पहनते हैं?',
        examples: [
          {
            en: 'Winter mornings are cold and foggy.',
            native: 'सर्दी की सुबहें ठंडी और कोहरे वाली होती हैं।',
          },
          {
            en: 'I wear a warm jacket in winter.',
            native: 'मैं सर्दियों में गर्म जैकेट पहनता हूँ।',
          },
          {
            en: 'We drink hot tea in winter.',
            native: 'हम सर्दियों में गर्म चाय पीते हैं।',
          },
        ],
      },
      es: {
        word: 'invierno',
        question: '¿Te gusta el invierno? ¿Qué llevas?',
        examples: [
          {
            en: 'Winter mornings are cold and foggy.',
            native: 'Las mañanas de invierno son frías y con niebla.',
          },
          {
            en: 'I wear a warm jacket in winter.',
            native: 'Llevo una chaqueta caliente en invierno.',
          },
          {
            en: 'We drink hot tea in winter.',
            native: 'Bebemos té caliente en invierno.',
          },
        ],
      },
      zh: {
        word: '冬天',
        question: '你喜欢冬天吗？你穿什么？',
        examples: [
          {
            en: 'Winter mornings are cold and foggy.',
            native: '冬天的早晨又冷又有雾。',
          },
          {
            en: 'I wear a warm jacket in winter.',
            native: '我冬天穿暖和的夹克。',
          },
          {
            en: 'We drink hot tea in winter.',
            native: '我们冬天喝热茶。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'market',
    questionText: 'What do you buy at the market?',
    translations: {
      te: {
        word: 'మార్కెట్',
        question: 'మీరు మార్కెట్లో ఏమి కొంటారు?',
        examples: [
          {
            en: 'We buy vegetables at the market.',
            native: 'మేము మార్కెట్లో కూరగాయలు కొంటాము.',
          },
          {
            en: 'The market is busy on Sundays.',
            native: 'ఆదివారాలు మార్కెట్ రద్దీగా ఉంటుంది.',
          },
          {
            en: 'My mother buys fresh fruit there.',
            native: 'నా అమ్మ అక్కడ తాజా పండ్లు కొంటుంది.',
          },
        ],
      },
      hi: {
        word: 'बाज़ार',
        question: 'आप बाज़ार से क्या खरीदते हैं?',
        examples: [
          {
            en: 'We buy vegetables at the market.',
            native: 'हम बाज़ार से सब्ज़ियाँ खरीदते हैं।',
          },
          {
            en: 'The market is busy on Sundays.',
            native: 'रविवार को बाज़ार भीड़भाड़ वाला होता है।',
          },
          {
            en: 'My mother buys fresh fruit there.',
            native: 'मेरी माँ वहाँ से ताज़े फल खरीदती हैं।',
          },
        ],
      },
      es: {
        word: 'mercado',
        question: '¿Qué compras en el mercado?',
        examples: [
          {
            en: 'We buy vegetables at the market.',
            native: 'Compramos verduras en el mercado.',
          },
          {
            en: 'The market is busy on Sundays.',
            native: 'El mercado está ocupado los domingos.',
          },
          {
            en: 'My mother buys fresh fruit there.',
            native: 'Mi madre compra fruta fresca allí.',
          },
        ],
      },
      zh: {
        word: '市场',
        question: '你在市场买什么？',
        examples: [
          {
            en: 'We buy vegetables at the market.',
            native: '我们在市场买蔬菜。',
          },
          {
            en: 'The market is busy on Sundays.',
            native: '星期天市场很热闹。',
          },
          {
            en: 'My mother buys fresh fruit there.',
            native: '我妈妈在那里买新鲜水果。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'park',
    questionText: 'What do you do in the park?',
    translations: {
      te: {
        word: 'పార్కు',
        question: 'మీరు పార్కులో ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I play with my friends in the park.',
            native: 'నేను పార్కులో నా స్నేహితులతో ఆడుకుంటాను.',
          },
          {
            en: 'The park has many green trees.',
            native: 'పార్కులో చాలా పచ్చని చెట్లు ఉన్నాయి.',
          },
          {
            en: 'Old people walk in the park every morning.',
            native: 'ముసలి వారు ప్రతి ఉదయం పార్కులో నడుస్తారు.',
          },
        ],
      },
      hi: {
        word: 'पार्क',
        question: 'आप पार्क में क्या करते हैं?',
        examples: [
          {
            en: 'I play with my friends in the park.',
            native: 'मैं पार्क में अपने दोस्तों के साथ खेलता हूँ।',
          },
          {
            en: 'The park has many green trees.',
            native: 'पार्क में बहुत सारे हरे पेड़ हैं।',
          },
          {
            en: 'Old people walk in the park every morning.',
            native: 'बुज़ुर्ग लोग हर सुबह पार्क में टहलते हैं।',
          },
        ],
      },
      es: {
        word: 'parque',
        question: '¿Qué haces en el parque?',
        examples: [
          {
            en: 'I play with my friends in the park.',
            native: 'Juego con mis amigos en el parque.',
          },
          {
            en: 'The park has many green trees.',
            native: 'El parque tiene muchos árboles verdes.',
          },
          {
            en: 'Old people walk in the park every morning.',
            native: 'Los ancianos caminan en el parque cada mañana.',
          },
        ],
      },
      zh: {
        word: '公园',
        question: '你在公园做什么？',
        examples: [
          {
            en: 'I play with my friends in the park.',
            native: '我和朋友们在公园里玩。',
          },
          {
            en: 'The park has many green trees.',
            native: '公园里有很多绿树。',
          },
          {
            en: 'Old people walk in the park every morning.',
            native: '老人们每天早上在公园散步。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'doctor',
    questionText: 'When do you go to the doctor?',
    translations: {
      te: {
        word: 'వైద్యుడు',
        question: 'మీరు ఎప్పుడు వైద్యుడి దగ్గరికి వెళ్తారు?',
        examples: [
          {
            en: 'I go to the doctor when I am sick.',
            native: 'నేను జబ్బు పడినప్పుడు వైద్యుడి దగ్గరికి వెళ్తాను.',
          },
          {
            en: 'The doctor gives me medicine.',
            native: 'వైద్యుడు నాకు మందులు ఇస్తారు.',
          },
          {
            en: 'My aunt is a doctor in the hospital.',
            native: 'నా అత్తయ్య ఆసుపత్రిలో వైద్యురాలు.',
          },
        ],
      },
      hi: {
        word: 'डॉक्टर',
        question: 'आप कब डॉक्टर के पास जाते हैं?',
        examples: [
          {
            en: 'I go to the doctor when I am sick.',
            native: 'मैं बीमार होने पर डॉक्टर के पास जाता हूँ।',
          },
          {
            en: 'The doctor gives me medicine.',
            native: 'डॉक्टर मुझे दवा देते हैं।',
          },
          {
            en: 'My aunt is a doctor in the hospital.',
            native: 'मेरी चाची अस्पताल में डॉक्टर हैं।',
          },
        ],
      },
      es: {
        word: 'médico',
        question: '¿Cuándo vas al médico?',
        examples: [
          {
            en: 'I go to the doctor when I am sick.',
            native: 'Voy al médico cuando estoy enfermo.',
          },
          {
            en: 'The doctor gives me medicine.',
            native: 'El médico me da medicina.',
          },
          {
            en: 'My aunt is a doctor in the hospital.',
            native: 'Mi tía es médica en el hospital.',
          },
        ],
      },
      zh: {
        word: '医生',
        question: '你什么时候去看医生？',
        examples: [
          {
            en: 'I go to the doctor when I am sick.',
            native: '我生病时去看医生。',
          },
          {
            en: 'The doctor gives me medicine.',
            native: '医生给我药。',
          },
          {
            en: 'My aunt is a doctor in the hospital.',
            native: '我姑姑是医院里的医生。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'village',
    questionText: 'Describe your village.',
    translations: {
      te: {
        word: 'గ్రామం',
        question: 'మీ గ్రామాన్ని వివరించండి.',
        examples: [
          {
            en: 'My village is small and quiet.',
            native: 'నా గ్రామం చిన్నది మరియు ప్రశాంతంగా ఉంటుంది.',
          },
          {
            en: 'There are green fields near my village.',
            native: 'నా గ్రామం దగ్గర పచ్చని పొలాలు ఉన్నాయి.',
          },
          {
            en: 'My grandparents live in the village.',
            native: 'నా తాతయ్య, అమ్మమ్మ గ్రామంలో నివసిస్తారు.',
          },
        ],
      },
      hi: {
        word: 'गाँव',
        question: 'अपने गाँव का वर्णन कीजिए।',
        examples: [
          {
            en: 'My village is small and quiet.',
            native: 'मेरा गाँव छोटा और शांत है।',
          },
          {
            en: 'There are green fields near my village.',
            native: 'मेरे गाँव के पास हरे खेत हैं।',
          },
          {
            en: 'My grandparents live in the village.',
            native: 'मेरे दादा-दादी गाँव में रहते हैं।',
          },
        ],
      },
      es: {
        word: 'pueblo',
        question: 'Describe tu pueblo.',
        examples: [
          {
            en: 'My village is small and quiet.',
            native: 'Mi pueblo es pequeño y tranquilo.',
          },
          {
            en: 'There are green fields near my village.',
            native: 'Hay campos verdes cerca de mi pueblo.',
          },
          {
            en: 'My grandparents live in the village.',
            native: 'Mis abuelos viven en el pueblo.',
          },
        ],
      },
      zh: {
        word: '村庄',
        question: '描述一下你的村庄。',
        examples: [
          {
            en: 'My village is small and quiet.',
            native: '我的村庄又小又安静。',
          },
          {
            en: 'There are green fields near my village.',
            native: '我村附近有绿色的田野。',
          },
          {
            en: 'My grandparents live in the village.',
            native: '我的爷爷奶奶住在村子里。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'city',
    questionText: 'Do you like the city? Why?',
    translations: {
      te: {
        word: 'నగరం',
        question: 'మీకు నగరం ఇష్టమా? ఎందుకు?',
        examples: [
          {
            en: 'The city is big and busy.',
            native: 'నగరం పెద్దది మరియు రద్దీగా ఉంటుంది.',
          },
          {
            en: 'There are many shops in the city.',
            native: 'నగరంలో చాలా దుకాణాలు ఉన్నాయి.',
          },
          {
            en: 'I like the lights of the city at night.',
            native: 'రాత్రి నగరపు వెలుగులు నాకు ఇష్టం.',
          },
        ],
      },
      hi: {
        word: 'शहर',
        question: 'क्या आपको शहर पसंद है? क्यों?',
        examples: [
          {
            en: 'The city is big and busy.',
            native: 'शहर बड़ा और व्यस्त है।',
          },
          {
            en: 'There are many shops in the city.',
            native: 'शहर में बहुत सारी दुकानें हैं।',
          },
          {
            en: 'I like the lights of the city at night.',
            native: 'मुझे रात में शहर की रोशनी पसंद है।',
          },
        ],
      },
      es: {
        word: 'ciudad',
        question: '¿Te gusta la ciudad? ¿Por qué?',
        examples: [
          {
            en: 'The city is big and busy.',
            native: 'La ciudad es grande y ocupada.',
          },
          {
            en: 'There are many shops in the city.',
            native: 'Hay muchas tiendas en la ciudad.',
          },
          {
            en: 'I like the lights of the city at night.',
            native: 'Me gustan las luces de la ciudad de noche.',
          },
        ],
      },
      zh: {
        word: '城市',
        question: '你喜欢城市吗？为什么？',
        examples: [
          {
            en: 'The city is big and busy.',
            native: '城市又大又繁忙。',
          },
          {
            en: 'There are many shops in the city.',
            native: '城市里有很多商店。',
          },
          {
            en: 'I like the lights of the city at night.',
            native: '我喜欢城市夜晚的灯光。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'farm',
    questionText: 'What do you see on a farm?',
    translations: {
      te: {
        word: 'ఫారం',
        question: 'మీరు ఫారంలో ఏమి చూస్తారు?',
        examples: [
          {
            en: 'I see cows and hens on the farm.',
            native: 'నేను ఫారంలో ఆవులు మరియు కోళ్లను చూస్తాను.',
          },
          {
            en: 'The farmer grows rice and wheat.',
            native: 'రైతు వరి మరియు గోధుమలు పండిస్తాడు.',
          },
          {
            en: 'There is a big tree on the farm.',
            native: 'ఫారంలో ఒక పెద్ద చెట్టు ఉంది.',
          },
        ],
      },
      hi: {
        word: 'खेत',
        question: 'आप खेत में क्या देखते हैं?',
        examples: [
          {
            en: 'I see cows and hens on the farm.',
            native: 'मैं खेत में गायें और मुर्गियाँ देखता हूँ।',
          },
          {
            en: 'The farmer grows rice and wheat.',
            native: 'किसान चावल और गेहूँ उगाता है।',
          },
          {
            en: 'There is a big tree on the farm.',
            native: 'खेत पर एक बड़ा पेड़ है।',
          },
        ],
      },
      es: {
        word: 'granja',
        question: '¿Qué ves en una granja?',
        examples: [
          {
            en: 'I see cows and hens on the farm.',
            native: 'Veo vacas y gallinas en la granja.',
          },
          {
            en: 'The farmer grows rice and wheat.',
            native: 'El granjero cultiva arroz y trigo.',
          },
          {
            en: 'There is a big tree on the farm.',
            native: 'Hay un árbol grande en la granja.',
          },
        ],
      },
      zh: {
        word: '农场',
        question: '你在农场看到什么？',
        examples: [
          {
            en: 'I see cows and hens on the farm.',
            native: '我在农场看到奶牛和母鸡。',
          },
          {
            en: 'The farmer grows rice and wheat.',
            native: '农民种水稻和小麦。',
          },
          {
            en: 'There is a big tree on the farm.',
            native: '农场上有一棵大树。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'beach',
    questionText: 'Do you like the beach? What do you do there?',
    translations: {
      te: {
        word: 'బీచ్',
        question: 'మీకు బీచ్ ఇష్టమా? మీరు అక్కడ ఏమి చేస్తారు?',
        examples: [
          {
            en: 'I play with the sand on the beach.',
            native: 'నేను బీచులో ఇసుకతో ఆడుకుంటాను.',
          },
          {
            en: 'The sea is blue and beautiful.',
            native: 'సముద్రం నీలం రంగులో మరియు అందంగా ఉంటుంది.',
          },
          {
            en: 'We eat snacks near the beach.',
            native: 'మేము బీచ్ దగ్గర స్నాక్స్ తింటాము.',
          },
        ],
      },
      hi: {
        word: 'समुद्र तट',
        question: 'क्या आपको समुद्र तट पसंद है? आप वहाँ क्या करते हैं?',
        examples: [
          {
            en: 'I play with the sand on the beach.',
            native: 'मैं समुद्र तट पर रेत से खेलता हूँ।',
          },
          {
            en: 'The sea is blue and beautiful.',
            native: 'समुद्र नीला और सुंदर है।',
          },
          {
            en: 'We eat snacks near the beach.',
            native: 'हम समुद्र तट के पास नाश्ता खाते हैं।',
          },
        ],
      },
      es: {
        word: 'playa',
        question: '¿Te gusta la playa? ¿Qué haces allí?',
        examples: [
          {
            en: 'I play with the sand on the beach.',
            native: 'Juego con la arena en la playa.',
          },
          {
            en: 'The sea is blue and beautiful.',
            native: 'El mar es azul y bonito.',
          },
          {
            en: 'We eat snacks near the beach.',
            native: 'Comemos aperitivos cerca de la playa.',
          },
        ],
      },
      zh: {
        word: '海滩',
        question: '你喜欢海滩吗？你在那里做什么？',
        examples: [
          {
            en: 'I play with the sand on the beach.',
            native: '我在海滩上玩沙子。',
          },
          {
            en: 'The sea is blue and beautiful.',
            native: '大海又蓝又美。',
          },
          {
            en: 'We eat snacks near the beach.',
            native: '我们在海滩附近吃小吃。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'mother',
    questionText: 'Talk about your mother.',
    translations: {
      te: {
        word: 'అమ్మ',
        question: 'మీ అమ్మ గురించి మాట్లాడండి.',
        examples: [
          {
            en: 'My mother cooks tasty food.',
            native: 'నా అమ్మ రుచికరమైన ఆహారం వంటుంది.',
          },
          {
            en: 'She helps me with my homework.',
            native: 'ఆమె గృహపాఠంలో నాకు సహాయం చేస్తుంది.',
          },
          {
            en: 'I love my mother very much.',
            native: 'నేను నా అమ్మను చాలా ప్రేమిస్తాను.',
          },
        ],
      },
      hi: {
        word: 'माँ',
        question: 'अपनी माँ के बारे में बताइए।',
        examples: [
          {
            en: 'My mother cooks tasty food.',
            native: 'मेरी माँ स्वादिष्ट खाना बनाती हैं।',
          },
          {
            en: 'She helps me with my homework.',
            native: 'वह गृहकार्य में मेरी मदद करती हैं।',
          },
          {
            en: 'I love my mother very much.',
            native: 'मैं अपनी माँ से बहुत प्यार करता हूँ।',
          },
        ],
      },
      es: {
        word: 'madre',
        question: 'Habla de tu madre.',
        examples: [
          {
            en: 'My mother cooks tasty food.',
            native: 'Mi madre cocina comida sabrosa.',
          },
          {
            en: 'She helps me with my homework.',
            native: 'Ella me ayuda con mis deberes.',
          },
          {
            en: 'I love my mother very much.',
            native: 'Quiero mucho a mi madre.',
          },
        ],
      },
      zh: {
        word: '妈妈',
        question: '谈谈你的妈妈。',
        examples: [
          {
            en: 'My mother cooks tasty food.',
            native: '我妈妈做美味的饭菜。',
          },
          {
            en: 'She helps me with my homework.',
            native: '她帮助我做家庭作业。',
          },
          {
            en: 'I love my mother very much.',
            native: '我非常爱我的妈妈。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'birthday',
    questionText: 'When is your birthday? What do you do?',
    translations: {
      te: {
        word: 'పుట్టినరోజు',
        question: 'మీ పుట్టినరోజు ఎప్పుడు? మీరు ఏమి చేస్తారు?',
        examples: [
          {
            en: 'My birthday is in June.',
            native: 'నా పుట్టినరోజు జూన్ నెలలో.',
          },
          {
            en: 'We cut a cake on my birthday.',
            native: 'మేము నా పుట్టినరోజున కేక్ కోస్తాము.',
          },
          {
            en: 'My friends give me gifts.',
            native: 'నా స్నేహితులు నాకు బహుమతులు ఇస్తారు.',
          },
        ],
      },
      hi: {
        word: 'जन्मदिन',
        question: 'आपका जन्मदिन कब है? आप क्या करते हैं?',
        examples: [
          {
            en: 'My birthday is in June.',
            native: 'मेरा जन्मदिन जून में है।',
          },
          {
            en: 'We cut a cake on my birthday.',
            native: 'हम मेरे जन्मदिन पर केक काटते हैं।',
          },
          {
            en: 'My friends give me gifts.',
            native: 'मेरे दोस्त मुझे तोहफ़े देते हैं।',
          },
        ],
      },
      es: {
        word: 'cumpleaños',
        question: '¿Cuándo es tu cumpleaños? ¿Qué haces?',
        examples: [
          {
            en: 'My birthday is in June.',
            native: 'Mi cumpleaños es en junio.',
          },
          {
            en: 'We cut a cake on my birthday.',
            native: 'Cortamos un pastel en mi cumpleaños.',
          },
          {
            en: 'My friends give me gifts.',
            native: 'Mis amigos me dan regalos.',
          },
        ],
      },
      zh: {
        word: '生日',
        question: '你的生日是什么时候？你做什么？',
        examples: [
          {
            en: 'My birthday is in June.',
            native: '我的生日在六月。',
          },
          {
            en: 'We cut a cake on my birthday.',
            native: '我们在我生日时切蛋糕。',
          },
          {
            en: 'My friends give me gifts.',
            native: '我的朋友们送我礼物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'game',
    questionText: 'What games do you like to play?',
    translations: {
      te: {
        word: 'ఆట',
        question: 'మీరు ఏ ఆటలు ఆడడానికి ఇష్టపడతారు?',
        examples: [
          {
            en: 'I like to play hide and seek.',
            native: 'నాకు దాగుడుమూతలు ఆడడం ఇష్టం.',
          },
          {
            en: 'We play cricket after class.',
            native: 'మేము తరగతి తర్వాత క్రికెట్ ఆడుతాము.',
          },
          {
            en: 'My sister plays with her dolls.',
            native: 'నా చెల్లెలు తన బొమ్మలతో ఆడుకుంటుంది.',
          },
        ],
      },
      hi: {
        word: 'खेल',
        question: 'आप कौन से खेल खेलना पसंद करते हैं?',
        examples: [
          {
            en: 'I like to play hide and seek.',
            native: 'मुझे लुका-छिपी खेलना पसंद है।',
          },
          {
            en: 'We play cricket after class.',
            native: 'हम कक्षा के बाद क्रिकेट खेलते हैं।',
          },
          {
            en: 'My sister plays with her dolls.',
            native: 'मेरी बहन अपनी गुड़ियों से खेलती है।',
          },
        ],
      },
      es: {
        word: 'juego',
        question: '¿Qué juegos te gusta jugar?',
        examples: [
          {
            en: 'I like to play hide and seek.',
            native: 'Me gusta jugar al escondite.',
          },
          {
            en: 'We play cricket after class.',
            native: 'Jugamos al críquet después de clase.',
          },
          {
            en: 'My sister plays with her dolls.',
            native: 'Mi hermana juega con sus muñecas.',
          },
        ],
      },
      zh: {
        word: '游戏',
        question: '你喜欢玩什么游戏？',
        examples: [
          {
            en: 'I like to play hide and seek.',
            native: '我喜欢玩捉迷藏。',
          },
          {
            en: 'We play cricket after class.',
            native: '我们下课后打板球。',
          },
          {
            en: 'My sister plays with her dolls.',
            native: '我妹妹玩她的洋娃娃。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'A1',
    promptWord: 'snow',
    questionText: 'Have you seen snow? Describe it.',
    translations: {
      te: {
        word: 'మంచు',
        question: 'మీరు మంచును చూశారా? దానిని వివరించండి.',
        examples: [
          {
            en: 'Snow is white and cold.',
            native: 'మంచు తెల్లగా మరియు చల్లగా ఉంటుంది.',
          },
          {
            en: 'Children play in the snow.',
            native: 'పిల్లలు మంచులో ఆడుకుంటారు.',
          },
          {
            en: 'It snows a lot in the mountains.',
            native: 'పర్వతాల్లో చాలా మంచు కురుస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'बर्फ़',
        question: 'क्या आपने बर्फ़ देखी है? उसका वर्णन कीजिए।',
        examples: [
          {
            en: 'Snow is white and cold.',
            native: 'बर्फ़ सफ़ेद और ठंडी होती है।',
          },
          {
            en: 'Children play in the snow.',
            native: 'बच्चे बर्फ़ में खेलते हैं।',
          },
          {
            en: 'It snows a lot in the mountains.',
            native: 'पहाड़ों में बहुत बर्फ़बारी होती है।',
          },
        ],
      },
      es: {
        word: 'nieve',
        question: '¿Has visto la nieve? Descríbela.',
        examples: [
          {
            en: 'Snow is white and cold.',
            native: 'La nieve es blanca y fría.',
          },
          {
            en: 'Children play in the snow.',
            native: 'Los niños juegan en la nieve.',
          },
          {
            en: 'It snows a lot in the mountains.',
            native: 'Nieva mucho en las montañas.',
          },
        ],
      },
      zh: {
        word: '雪',
        question: '你见过雪吗？描述一下它。',
        examples: [
          {
            en: 'Snow is white and cold.',
            native: '雪又白又冷。',
          },
          {
            en: 'Children play in the snow.',
            native: '孩子们在雪里玩。',
          },
          {
            en: 'It snows a lot in the mountains.',
            native: '山上经常下大雪。',
          },
        ],
      },
    },
  },
];
