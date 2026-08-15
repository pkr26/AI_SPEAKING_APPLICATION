import type { QuestionSeed } from './types';

// B2 speaking questions: prompt word, question, and te/hi/es/zh
// translations with 3 example answers each (same English sentence across
// languages, `native` is its translation).
export const questions: QuestionSeed[] = [
  {
    cefrLevel: 'B2',
    promptWord: 'challenge',
    questionText:
      'Describe a significant challenge that forced you to change your approach. What did you learn, and would you handle it differently now?',
    translations: {
      te: {
        word: 'సవాలు',
        question:
          'మీ విధానాన్ని మార్చుకోవాల్సి వచ్చిన ఒక ముఖ్యమైన సవాలును వివరించండి. దాని నుంచి మీరు ఏమి నేర్చుకున్నారు, ఇప్పుడు అయితే దాన్ని వేరుగా ఎదుర్కొంటారా?',
        examples: [
          {
            en: 'When I had to present a project in English, anxiety made me avoid practising in front of other people.',
            native:
              'నేను ఒక ప్రాజెక్టును ఇంగ్లీష్‌లో ప్రదర్శించాల్సి వచ్చినప్పుడు, ఆందోళన వల్ల ఇతరుల ముందు సాధన చేయకుండా తప్పించుకున్నాను.',
          },
          {
            en: 'Once I began recording myself and asking classmates for specific feedback, my confidence improved even though progress was uneven.',
            native:
              'నన్ను నేను రికార్డ్ చేసుకోవడం మరియు సహపాఠులను నిర్దిష్ట అభిప్రాయం అడగడం మొదలుపెట్టిన తర్వాత, పురోగతి ఒకేలా లేకపోయినా నా ఆత్మవిశ్వాసం మెరుగుపడింది.',
          },
          {
            en: 'If I faced the same challenge now, I would seek help earlier rather than treating every mistake as evidence of failure.',
            native:
              'ఇప్పుడు అదే సవాలు ఎదురైతే, ప్రతి తప్పును వైఫల్యానికి నిదర్శనంగా భావించడం కాకుండా ముందుగానే సహాయం కోరుతాను.',
          },
        ],
      },
      hi: {
        word: 'चुनौती',
        question:
          'किसी ऐसी महत्वपूर्ण चुनौती का वर्णन कीजिए जिसने आपको अपना तरीका बदलने पर मजबूर किया। आपने उससे क्या सीखा, और क्या अब आप उसे अलग ढंग से संभालेंगे?',
        examples: [
          {
            en: 'When I had to present a project in English, anxiety made me avoid practising in front of other people.',
            native:
              'जब मुझे अंग्रेज़ी में एक परियोजना प्रस्तुत करनी थी, तो घबराहट के कारण मैं दूसरों के सामने अभ्यास करने से बचता था।',
          },
          {
            en: 'Once I began recording myself and asking classmates for specific feedback, my confidence improved even though progress was uneven.',
            native:
              'जब मैंने खुद को रिकॉर्ड करना और सहपाठियों से खास प्रतिक्रिया माँगना शुरू किया, तो असमान प्रगति के बावजूद मेरा आत्मविश्वास बढ़ा।',
          },
          {
            en: 'If I faced the same challenge now, I would seek help earlier rather than treating every mistake as evidence of failure.',
            native:
              'अगर आज वही चुनौती सामने आए, तो मेरी प्राथमिकता हर गलती को असफलता का प्रमाण मानने के बजाय पहले ही मदद माँगने की होगी।',
          },
        ],
      },
      es: {
        word: 'desafío',
        question:
          'Describe un desafío importante que te obligó a cambiar de enfoque. ¿Qué aprendiste y lo afrontarías de otra manera ahora?',
        examples: [
          {
            en: 'When I had to present a project in English, anxiety made me avoid practising in front of other people.',
            native:
              'Cuando tuve que presentar un proyecto en inglés, la ansiedad me hacía evitar practicar delante de otras personas.',
          },
          {
            en: 'Once I began recording myself and asking classmates for specific feedback, my confidence improved even though progress was uneven.',
            native:
              'Cuando empecé a grabarme y a pedir comentarios concretos a mis compañeros, aumentó mi confianza aunque el progreso fue irregular.',
          },
          {
            en: 'If I faced the same challenge now, I would seek help earlier rather than treating every mistake as evidence of failure.',
            native:
              'Si afrontara hoy el mismo reto, pediría ayuda antes en lugar de interpretar cada error como prueba de fracaso.',
          },
        ],
      },
      zh: {
        word: '挑战',
        question: '描述一个迫使你改变做法的重大挑战。你从中学到了什么？现在会用不同的方式处理吗？',
        examples: [
          {
            en: 'When I had to present a project in English, anxiety made me avoid practising in front of other people.',
            native: '当我必须用英语展示一个项目时，焦虑让我逃避在别人面前练习。',
          },
          {
            en: 'Once I began recording myself and asking classmates for specific feedback, my confidence improved even though progress was uneven.',
            native: '当我开始给自己录音并向同学征求具体反馈后，尽管进步并不稳定，我的信心还是增强了。',
          },
          {
            en: 'If I faced the same challenge now, I would seek help earlier rather than treating every mistake as evidence of failure.',
            native: '如果现在面对同样的挑战，我会更早寻求帮助，而不会把每个错误都看成失败的证据。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'environment',
    questionText:
      'How should responsibility for protecting the environment be divided among individuals, businesses, and governments, especially when greener choices cost more?',
    translations: {
      te: {
        word: 'పర్యావరణం',
        question:
          'పర్యావరణాన్ని రక్షించే బాధ్యతను వ్యక్తులు, వ్యాపారాలు మరియు ప్రభుత్వాల మధ్య ఎలా పంచాలి, ముఖ్యంగా పర్యావరణ అనుకూల ఎంపికలకు ఎక్కువ ఖర్చయ్యేటప్పుడు?',
        examples: [
          {
            en: 'Individuals can reduce waste and travel more sustainably, but their choices are limited when affordable alternatives do not exist.',
            native:
              'వ్యక్తులు వ్యర్థాలను తగ్గించి మరింత సుస్థిరంగా ప్రయాణించగలరు, కానీ అందుబాటు ధరలో ప్రత్యామ్నాయాలు లేనప్పుడు వారి ఎంపికలు పరిమితమవుతాయి.',
          },
          {
            en: 'Businesses should pay for the pollution they create instead of passing environmental costs to the public.',
            native: 'వ్యాపారాలు పర్యావరణ ఖర్చులను ప్రజలపై మోపకుండా తాము సృష్టించే కాలుష్యానికి ఖర్చు భరించాలి.',
          },
          {
            en: 'Governments need firm standards and targeted support so that lower-income households are not punished during the transition.',
            native:
              'మార్పు సమయంలో తక్కువ ఆదాయం గల కుటుంబాలు నష్టపోకుండా ప్రభుత్వాలు కఠిన ప్రమాణాలు మరియు లక్ష్యిత సహాయాన్ని అందించాలి.',
          },
        ],
      },
      hi: {
        word: 'पर्यावरण',
        question:
          'पर्यावरण की रक्षा की ज़िम्मेदारी व्यक्तियों, व्यवसायों और सरकारों के बीच कैसे बाँटी जानी चाहिए, खासकर जब अधिक पर्यावरण-अनुकूल विकल्प महँगे हों?',
        examples: [
          {
            en: 'Individuals can reduce waste and travel more sustainably, but their choices are limited when affordable alternatives do not exist.',
            native:
              'लोग कचरा घटा सकते हैं और अधिक टिकाऊ तरीके से यात्रा कर सकते हैं, लेकिन किफ़ायती विकल्प न होने पर उनकी पसंद सीमित हो जाती है।',
          },
          {
            en: 'Businesses should pay for the pollution they create instead of passing environmental costs to the public.',
            native: 'व्यवसायों को पर्यावरण की लागत जनता पर डालने के बजाय अपने पैदा किए प्रदूषण की कीमत चुकानी चाहिए।',
          },
          {
            en: 'Governments need firm standards and targeted support so that lower-income households are not punished during the transition.',
            native:
              'सरकारों को सख्त मानक और लक्षित सहायता देनी चाहिए ताकि बदलाव के दौरान कम आय वाले परिवारों को नुकसान न हो।',
          },
        ],
      },
      es: {
        word: 'medio ambiente',
        question:
          '¿Cómo debería repartirse la responsabilidad de proteger el medio ambiente entre las personas, las empresas y los gobiernos, especialmente cuando las opciones más ecológicas cuestan más?',
        examples: [
          {
            en: 'Individuals can reduce waste and travel more sustainably, but their choices are limited when affordable alternatives do not exist.',
            native:
              'Las personas pueden reducir residuos y viajar de forma más sostenible, pero sus opciones son limitadas cuando no existen alternativas asequibles.',
          },
          {
            en: 'Businesses should pay for the pollution they create instead of passing environmental costs to the public.',
            native:
              'Las empresas deberían pagar por la contaminación que generan en vez de trasladar los costes ambientales a la sociedad.',
          },
          {
            en: 'Governments need firm standards and targeted support so that lower-income households are not punished during the transition.',
            native:
              'Los gobiernos necesitan normas firmes y ayudas específicas para que los hogares con menores ingresos no resulten perjudicados durante la transición.',
          },
        ],
      },
      zh: {
        word: '环境',
        question: '保护环境的责任应如何在个人、企业和政府之间分配，尤其是在环保选择成本更高的情况下？',
        examples: [
          {
            en: 'Individuals can reduce waste and travel more sustainably, but their choices are limited when affordable alternatives do not exist.',
            native: '个人可以减少浪费并选择更可持续的出行方式，但在没有可负担替代方案时，他们的选择会受到限制。',
          },
          {
            en: 'Businesses should pay for the pollution they create instead of passing environmental costs to the public.',
            native: '企业应该为自身造成的污染买单，而不是把环境成本转嫁给公众。',
          },
          {
            en: 'Governments need firm standards and targeted support so that lower-income households are not punished during the transition.',
            native: '政府需要制定严格标准并提供有针对性的支持，避免低收入家庭在转型期间受到不公平的影响。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'culture',
    questionText:
      'How can people preserve cultural traditions while allowing them to change, and who should decide when a tradition no longer fits modern values?',
    translations: {
      te: {
        word: 'సంస్కృతి',
        question:
          'సాంస్కృతిక సంప్రదాయాలు మారడానికి అవకాశం ఇస్తూనే ప్రజలు వాటిని ఎలా సంరక్షించగలరు, ఒక సంప్రదాయం ఆధునిక విలువలకు ఇక సరిపోదని ఎవరు నిర్ణయించాలి?',
        examples: [
          {
            en: 'Traditions give communities a sense of continuity, although preserving them unchanged can exclude younger generations.',
            native:
              'సంప్రదాయాలు సమాజాలకు కొనసాగింపు భావనను ఇస్తాయి, అయితే వాటిని ఏమాత్రం మార్చకుండా కాపాడటం యువ తరాలను దూరం చేయవచ్చు.',
          },
          {
            en: 'Cultural exchange does not automatically erase identity; it can produce new practices that people genuinely choose.',
            native:
              'సాంస్కృతిక పరస్పర మార్పిడి తప్పనిసరిగా గుర్తింపును చెరిపివేయదు; ప్రజలు నిజంగా ఎంచుకునే కొత్త ఆచారాలను అది సృష్టించగలదు.',
          },
          {
            en: "When a custom restricts someone's rights, respectful criticism is more valuable than defending it simply because it is old.",
            native:
              'ఒక ఆచారం ఎవరి హక్కులనైనా పరిమితం చేసినప్పుడు, అది పాతది అనే కారణంతో సమర్థించడం కంటే గౌరవప్రదమైన విమర్శ మరింత విలువైనది.',
          },
        ],
      },
      hi: {
        word: 'संस्कृति',
        question:
          'लोग सांस्कृतिक परंपराओं को बदलने की गुंजाइश देते हुए उन्हें कैसे सुरक्षित रख सकते हैं, और कोई परंपरा आधुनिक मूल्यों के अनुकूल नहीं रही, यह किसे तय करना चाहिए?',
        examples: [
          {
            en: 'Traditions give communities a sense of continuity, although preserving them unchanged can exclude younger generations.',
            native:
              'परंपराएँ समुदायों को निरंतरता का एहसास देती हैं, हालाँकि उन्हें बिना बदलाव के बचाए रखना युवा पीढ़ियों को अलग-थलग कर सकता है।',
          },
          {
            en: 'Cultural exchange does not automatically erase identity; it can produce new practices that people genuinely choose.',
            native:
              'सांस्कृतिक आदान-प्रदान पहचान को अपने-आप नहीं मिटाता; यह ऐसी नई प्रथाएँ बना सकता है जिन्हें लोग सच में चुनते हैं।',
          },
          {
            en: "When a custom restricts someone's rights, respectful criticism is more valuable than defending it simply because it is old.",
            native:
              'जब कोई रिवाज किसी के अधिकार सीमित करता है, तो केवल उसके पुराना होने के कारण उसका बचाव करने से सम्मानपूर्ण आलोचना अधिक मूल्यवान है।',
          },
        ],
      },
      es: {
        word: 'cultura',
        question:
          '¿Cómo se pueden preservar las tradiciones culturales y permitir que cambien, y quién debería decidir cuándo una tradición ya no encaja con los valores modernos?',
        examples: [
          {
            en: 'Traditions give communities a sense of continuity, although preserving them unchanged can exclude younger generations.',
            native:
              'Las tradiciones dan a las comunidades una sensación de continuidad, aunque conservarlas sin cambios puede excluir a las generaciones más jóvenes.',
          },
          {
            en: 'Cultural exchange does not automatically erase identity; it can produce new practices that people genuinely choose.',
            native:
              'El intercambio cultural no borra automáticamente la identidad; puede producir nuevas prácticas que la gente elige de verdad.',
          },
          {
            en: "When a custom restricts someone's rights, respectful criticism is more valuable than defending it simply because it is old.",
            native:
              'Cuando una costumbre limita los derechos de alguien, la crítica respetuosa es más valiosa que defenderla simplemente porque es antigua.',
          },
        ],
      },
      zh: {
        word: '文化',
        question: '人们如何在保护文化传统的同时允许其改变？当一项传统不再符合现代价值观时，应由谁来决定？',
        examples: [
          {
            en: 'Traditions give communities a sense of continuity, although preserving them unchanged can exclude younger generations.',
            native: '传统赋予社区延续感，但原封不动地保存传统可能会把年轻一代排除在外。',
          },
          {
            en: 'Cultural exchange does not automatically erase identity; it can produce new practices that people genuinely choose.',
            native: '文化交流不会自动抹去身份认同；它可以产生人们真正愿意选择的新做法。',
          },
          {
            en: "When a custom restricts someone's rights, respectful criticism is more valuable than defending it simply because it is old.",
            native: '当一种习俗限制某人的权利时，尊重地提出批评比仅仅因为它历史悠久就为其辩护更有价值。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'education',
    questionText:
      "To what extent can education transform a person's opportunities, and which inequalities can schools not solve on their own?",
    translations: {
      te: {
        word: 'విద్య',
        question: 'విద్య ఒక వ్యక్తి అవకాశాలను ఎంతవరకు మార్చగలదు, పాఠశాలలు ఒంటరిగా పరిష్కరించలేని అసమానతలు ఏవి?',
        examples: [
          {
            en: 'Education can expand career choices and strengthen critical thinking, but qualifications do not guarantee equal access to work.',
            native:
              'విద్య వృత్తి ఎంపికలను విస్తరించి విమర్శనాత్మక ఆలోచనను బలోపేతం చేయగలదు, కానీ అర్హతలు ఉద్యోగాలకు సమాన ప్రాప్యతను హామీ ఇవ్వవు.',
          },
          {
            en: 'Students learn more effectively when schools provide skilled teachers and support rather than expecting families to fill every gap.',
            native:
              'ప్రతి లోటును కుటుంబాలే పూరించాలని ఆశించడం కాకుండా పాఠశాలలు నైపుణ్యం గల ఉపాధ్యాయులు మరియు మద్దతును అందించినప్పుడు విద్యార్థులు మరింత సమర్థవంతంగా నేర్చుకుంటారు.',
          },
          {
            en: 'Although education changed my own prospects, affordable housing, healthcare, and fair hiring also shape whether people can succeed.',
            native:
              'విద్య నా స్వంత అవకాశాలను మార్చినప్పటికీ, అందుబాటు ధరలో గృహవసతి, ఆరోగ్య సంరక్షణ మరియు న్యాయమైన నియామకాలు కూడా ప్రజలు విజయం సాధించగలరా అనే దానిపై ప్రభావం చూపుతాయి.',
          },
        ],
      },
      hi: {
        word: 'शिक्षा',
        question:
          'शिक्षा किसी व्यक्ति के अवसरों को किस हद तक बदल सकती है, और कौन-सी असमानताएँ स्कूल अकेले दूर नहीं कर सकते?',
        examples: [
          {
            en: 'Education can expand career choices and strengthen critical thinking, but qualifications do not guarantee equal access to work.',
            native:
              'शिक्षा करियर के विकल्प बढ़ा सकती है और आलोचनात्मक सोच मज़बूत कर सकती है, लेकिन योग्यताएँ काम तक समान पहुँच की गारंटी नहीं देतीं।',
          },
          {
            en: 'Students learn more effectively when schools provide skilled teachers and support rather than expecting families to fill every gap.',
            native:
              'जब स्कूल हर कमी परिवारों से पूरी कराने की अपेक्षा रखने के बजाय कुशल शिक्षक और सहायता देते हैं, तब छात्र अधिक प्रभावी ढंग से सीखते हैं।',
          },
          {
            en: 'Although education changed my own prospects, affordable housing, healthcare, and fair hiring also shape whether people can succeed.',
            native:
              'हालाँकि शिक्षा ने मेरी अपनी संभावनाएँ बदलीं, लेकिन किफ़ायती आवास, स्वास्थ्य सेवा और निष्पक्ष भर्ती भी तय करते हैं कि लोग सफल हो पाएँगे या नहीं।',
          },
        ],
      },
      es: {
        word: 'educación',
        question:
          '¿Hasta qué punto puede la educación transformar las oportunidades de una persona y qué desigualdades no pueden resolver las escuelas por sí solas?',
        examples: [
          {
            en: 'Education can expand career choices and strengthen critical thinking, but qualifications do not guarantee equal access to work.',
            native:
              'La educación puede ampliar las opciones profesionales y reforzar el pensamiento crítico, pero los títulos no garantizan el mismo acceso al empleo.',
          },
          {
            en: 'Students learn more effectively when schools provide skilled teachers and support rather than expecting families to fill every gap.',
            native:
              'Los estudiantes aprenden con mayor eficacia cuando las escuelas ofrecen docentes capacitados y apoyo, en vez de esperar que las familias cubran todas las carencias.',
          },
          {
            en: 'Although education changed my own prospects, affordable housing, healthcare, and fair hiring also shape whether people can succeed.',
            native:
              'Aunque la educación cambió mis propias perspectivas, la vivienda asequible, la atención sanitaria y una contratación justa también determinan si la gente puede tener éxito.',
          },
        ],
      },
      zh: {
        word: '教育',
        question: '教育能在多大程度上改变一个人的机会？哪些不平等无法由学校单独解决？',
        examples: [
          {
            en: 'Education can expand career choices and strengthen critical thinking, but qualifications do not guarantee equal access to work.',
            native: '教育可以拓宽职业选择并增强批判性思维，但学历并不能保证平等的就业机会。',
          },
          {
            en: 'Students learn more effectively when schools provide skilled teachers and support rather than expecting families to fill every gap.',
            native: '学校提供优秀教师和支持，而不是指望家庭弥补所有不足时，学生的学习会更有效。',
          },
          {
            en: 'Although education changed my own prospects, affordable housing, healthcare, and fair hiring also shape whether people can succeed.',
            native: '虽然教育改变了我自己的前景，但可负担住房、医疗服务和公平招聘也会影响人们能否成功。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'success',
    questionText:
      'How should success be defined, and can ambition remain healthy when society constantly compares people by income and status?',
    translations: {
      te: {
        word: 'విజయం',
        question:
          'విజయాన్ని ఎలా నిర్వచించాలి, సమాజం ఆదాయం మరియు హోదాతో ప్రజలను నిరంతరం పోల్చుతున్నప్పుడు ఆశయం ఆరోగ్యకరంగా ఉండగలదా?',
        examples: [
          {
            en: 'Financial security matters to me because it creates freedom, yet earning more would feel empty if my health and relationships suffered.',
            native:
              'ఆర్థిక భద్రత నాకు ముఖ్యం, ఎందుకంటే అది స్వేచ్ఛను ఇస్తుంది; అయినప్పటికీ నా ఆరోగ్యం మరియు సంబంధాలు దెబ్బతింటే ఎక్కువ సంపాదించడం శూన్యంగా అనిపిస్తుంది.',
          },
          {
            en: 'I consider steady progress more meaningful than public recognition, especially when a goal requires years of patient effort.',
            native:
              'ఒక లక్ష్యానికి సంవత్సరాల ఓపికతో కూడిన కృషి అవసరమైనప్పుడు, బహిరంగ గుర్తింపు కంటే స్థిరమైన పురోగతినే నేను మరింత అర్థవంతంగా భావిస్తాను.',
          },
          {
            en: 'Success should include knowing when enough is enough; otherwise ambition can turn every achievement into another source of pressure.',
            native:
              'ఎప్పుడు ఉన్నది చాలు అని తెలుసుకోవడం కూడా విజయంలో భాగం కావాలి; లేకపోతే ఆశయం ప్రతి సాధనను మరో ఒత్తిడి మూలంగా మార్చగలదు.',
          },
        ],
      },
      hi: {
        word: 'सफलता',
        question:
          'सफलता को कैसे परिभाषित किया जाना चाहिए, और जब समाज लगातार आय और हैसियत के आधार पर लोगों की तुलना करता है, तब क्या महत्वाकांक्षा स्वस्थ रह सकती है?',
        examples: [
          {
            en: 'Financial security matters to me because it creates freedom, yet earning more would feel empty if my health and relationships suffered.',
            native:
              'वित्तीय सुरक्षा मेरे लिए मायने रखती है क्योंकि वह स्वतंत्रता देती है, फिर भी अगर मेरा स्वास्थ्य और रिश्ते बिगड़ें तो अधिक कमाई खोखली लगेगी।',
          },
          {
            en: 'I consider steady progress more meaningful than public recognition, especially when a goal requires years of patient effort.',
            native:
              'मैं सार्वजनिक पहचान से अधिक लगातार प्रगति को सार्थक मानता हूँ, खासकर जब किसी लक्ष्य के लिए वर्षों के धैर्यपूर्ण प्रयास की आवश्यकता हो।',
          },
          {
            en: 'Success should include knowing when enough is enough; otherwise ambition can turn every achievement into another source of pressure.',
            native:
              'सफलता में यह जानना भी शामिल होना चाहिए कि कब पर्याप्त हो चुका है; वरना महत्वाकांक्षा हर उपलब्धि को दबाव के एक और स्रोत में बदल सकती है।',
          },
        ],
      },
      es: {
        word: 'éxito',
        question:
          '¿Cómo debería definirse el éxito y puede mantenerse sana la ambición cuando la sociedad compara constantemente a las personas por sus ingresos y su posición?',
        examples: [
          {
            en: 'Financial security matters to me because it creates freedom, yet earning more would feel empty if my health and relationships suffered.',
            native:
              'La seguridad económica me importa porque aporta libertad, pero ganar más me parecería vacío si mi salud y mis relaciones se deterioraran.',
          },
          {
            en: 'I consider steady progress more meaningful than public recognition, especially when a goal requires years of patient effort.',
            native:
              'Considero que el progreso constante tiene más sentido que el reconocimiento público, especialmente cuando una meta exige años de esfuerzo paciente.',
          },
          {
            en: 'Success should include knowing when enough is enough; otherwise ambition can turn every achievement into another source of pressure.',
            native:
              'El éxito debería incluir saber cuándo es suficiente; de lo contrario, la ambición puede convertir cada logro en otra fuente de presión.',
          },
        ],
      },
      zh: {
        word: '成功',
        question: '应该如何定义成功？当社会不断按收入和地位比较人们时，抱负还能保持健康吗？',
        examples: [
          {
            en: 'Financial security matters to me because it creates freedom, yet earning more would feel empty if my health and relationships suffered.',
            native: '经济保障对我很重要，因为它带来自由；但如果健康和人际关系受损，赚得再多也会让我感到空虚。',
          },
          {
            en: 'I consider steady progress more meaningful than public recognition, especially when a goal requires years of patient effort.',
            native: '我认为稳定的进步比公众认可更有意义，尤其是当一个目标需要多年耐心努力时。',
          },
          {
            en: 'Success should include knowing when enough is enough; otherwise ambition can turn every achievement into another source of pressure.',
            native: '成功应该包括懂得知足；否则，抱负会把每项成就变成另一个压力来源。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'news',
    questionText:
      'How do you decide whether a news report is trustworthy, and what responsibility do readers and journalists have when facts remain uncertain?',
    translations: {
      te: {
        word: 'వార్తలు',
        question:
          'ఒక వార్తా నివేదిక నమ్మదగినదో కాదో మీరు ఎలా నిర్ణయిస్తారు, వాస్తవాలు ఇంకా అనిశ్చితంగా ఉన్నప్పుడు పాఠకులు మరియు పాత్రికేయులకు ఎలాంటి బాధ్యత ఉంటుంది?',
        examples: [
          {
            en: 'I trust a report more when it names its sources, distinguishes evidence from opinion, and corrects mistakes openly.',
            native:
              'ఒక నివేదిక తన మూలాలను పేర్కొని, ఆధారాలను అభిప్రాయాల నుంచి వేరు చేసి, తప్పులను బహిరంగంగా సరిచేస్తే నేను దాన్ని ఎక్కువగా నమ్ముతాను.',
          },
          {
            en: 'Breaking news is useful, but the pressure to publish quickly can spread claims before they have been properly verified.',
            native:
              'తాజా వార్తలు ఉపయోగకరమే, కానీ త్వరగా ప్రచురించాలనే ఒత్తిడి వాదనలు సరిగా ధృవీకరించబడకముందే వాటిని వ్యాప్తి చేయవచ్చు.',
          },
          {
            en: 'Readers should compare independent coverage before sharing a dramatic story, while journalists should state clearly what is still unknown.',
            native:
              'సంచలనాత్మక కథనాన్ని పంచుకునే ముందు పాఠకులు స్వతంత్ర వార్తా నివేదికలను పోల్చాలి, ఇంకా తెలియని విషయాలను పాత్రికేయులు స్పష్టంగా చెప్పాలి.',
          },
        ],
      },
      hi: {
        word: 'समाचार',
        question:
          'आप कैसे तय करते हैं कि कोई समाचार रिपोर्ट भरोसेमंद है, और जब तथ्य अभी अनिश्चित हों तब पाठकों और पत्रकारों की क्या ज़िम्मेदारी है?',
        examples: [
          {
            en: 'I trust a report more when it names its sources, distinguishes evidence from opinion, and corrects mistakes openly.',
            native:
              'मुझे उस रिपोर्ट पर अधिक भरोसा होता है जो अपने स्रोतों का नाम बताती है, प्रमाण को राय से अलग करती है और गलतियों को खुले तौर पर सुधारती है।',
          },
          {
            en: 'Breaking news is useful, but the pressure to publish quickly can spread claims before they have been properly verified.',
            native:
              'ताज़ा खबरें उपयोगी हैं, लेकिन जल्दी प्रकाशित करने का दबाव दावों को ठीक से सत्यापित होने से पहले फैला सकता है।',
          },
          {
            en: 'Readers should compare independent coverage before sharing a dramatic story, while journalists should state clearly what is still unknown.',
            native:
              'पाठकों को कोई सनसनीखेज़ खबर साझा करने से पहले स्वतंत्र रिपोर्टों की तुलना करनी चाहिए, जबकि पत्रकारों को साफ़ बताना चाहिए कि अभी क्या अज्ञात है।',
          },
        ],
      },
      es: {
        word: 'noticias',
        question:
          '¿Cómo decides si una noticia es fiable y qué responsabilidad tienen lectores y periodistas cuando los hechos siguen siendo inciertos?',
        examples: [
          {
            en: 'I trust a report more when it names its sources, distinguishes evidence from opinion, and corrects mistakes openly.',
            native:
              'Confío más en una noticia cuando identifica sus fuentes, distingue las pruebas de la opinión y corrige abiertamente sus errores.',
          },
          {
            en: 'Breaking news is useful, but the pressure to publish quickly can spread claims before they have been properly verified.',
            native:
              'Las noticias de última hora son útiles, pero la presión por publicar rápido puede difundir afirmaciones antes de que se hayan verificado correctamente.',
          },
          {
            en: 'Readers should compare independent coverage before sharing a dramatic story, while journalists should state clearly what is still unknown.',
            native:
              'Los lectores deberían comparar coberturas independientes antes de compartir una historia impactante, mientras que los periodistas deberían indicar con claridad qué se desconoce todavía.',
          },
        ],
      },
      zh: {
        word: '新闻',
        question: '你如何判断一篇新闻报道是否可信？当事实仍不确定时，读者和记者各自负有什么责任？',
        examples: [
          {
            en: 'I trust a report more when it names its sources, distinguishes evidence from opinion, and corrects mistakes openly.',
            native: '如果一篇报道注明消息来源、区分证据与观点，并公开纠正错误，我会更信任它。',
          },
          {
            en: 'Breaking news is useful, but the pressure to publish quickly can spread claims before they have been properly verified.',
            native: '突发新闻很有用，但抢先发布的压力可能让一些说法在得到充分核实前就传播开来。',
          },
          {
            en: 'Readers should compare independent coverage before sharing a dramatic story, while journalists should state clearly what is still unknown.',
            native: '读者在分享引人注目的消息前应比较独立报道，而记者应明确说明哪些信息仍然未知。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'remote work',
    questionText: 'Discuss the advantages and disadvantages of remote work. Would you choose it?',
    translations: {
      te: {
        word: 'రిమోట్ వర్క్',
        question: 'రిమోట్ వర్క్ యొక్క ప్రయోజనాలు మరియు అప్రయోజనాలు గురించి చర్చించండి. మీరు దాన్ని ఎంచుకుంటారా?',
        examples: [
          {
            en: 'Remote work saves a lot of commuting time, but it can feel quite isolating after a while.',
            native: 'రిమోట్ వర్క్ ప్రయాణ సమయాన్ని చాలా ఆదా చేస్తుంది, కానీ కొంతకాలం తర్వాత చాలా ఒంటరిగా అనిపించవచ్చు.',
          },
          {
            en: 'Although offices cost money to maintain, they help new employees learn from experienced colleagues.',
            native:
              'ఆఫీసుల నిర్వహణకు డబ్బు ఖర్చవుతున్నప్పటికీ, కొత్త ఉద్యోగులు అనుభవజ్ఞులైన సహోద్యోగుల నుండి నేర్చుకోవడానికి అవి సహాయపడతాయి.',
          },
          {
            en: 'If companies trusted their staff more, hybrid schedules would probably become the norm everywhere.',
            native: 'కంపెనీలు తమ సిబ్బందిని మరింత నమ్మితే, హైబ్రిడ్ షెడ్యూళ్లు బహుశా ప్రతిచోటా సాధారణం అవుతాయి.',
          },
        ],
      },
      hi: {
        word: 'रिमोट वर्क',
        question: 'रिमोट वर्क के फ़ायदों और नुकसान पर चर्चा कीजिए। क्या आप इसे चुनेंगे?',
        examples: [
          {
            en: 'Remote work saves a lot of commuting time, but it can feel quite isolating after a while.',
            native:
              'रिमोट वर्क से आने-जाने का काफ़ी समय बचता है, लेकिन कुछ समय बाद यह काफ़ी अकेलापन महसूस करा सकता है।',
          },
          {
            en: 'Although offices cost money to maintain, they help new employees learn from experienced colleagues.',
            native:
              'हालाँकि दफ़्तरों को बनाए रखने में पैसा लगता है, वे नए कर्मचारियों को अनुभवी सहकर्मियों से सीखने में मदद करते हैं।',
          },
          {
            en: 'If companies trusted their staff more, hybrid schedules would probably become the norm everywhere.',
            native: 'अगर कंपनियाँ अपने कर्मचारियों पर ज़्यादा भरोसा करें, तो हाइब्रिड शेड्यूल शायद हर जगह आम हो जाएँ।',
          },
        ],
      },
      es: {
        word: 'trabajo remoto',
        question: 'Analiza las ventajas y desventajas del trabajo remoto. ¿Lo elegirías?',
        examples: [
          {
            en: 'Remote work saves a lot of commuting time, but it can feel quite isolating after a while.',
            native:
              'El trabajo remoto ahorra mucho tiempo de traslado, pero puede resultar bastante aislante después de un tiempo.',
          },
          {
            en: 'Although offices cost money to maintain, they help new employees learn from experienced colleagues.',
            native:
              'Aunque mantener oficinas cuesta dinero, ayudan a los empleados nuevos a aprender de colegas con experiencia.',
          },
          {
            en: 'If companies trusted their staff more, hybrid schedules would probably become the norm everywhere.',
            native:
              'Si las empresas confiaran más en su personal, los horarios híbridos probablemente se convertirían en la norma en todas partes.',
          },
        ],
      },
      zh: {
        word: '远程办公',
        question: '讨论远程办公的利与弊。你会选择远程办公吗？',
        examples: [
          {
            en: 'Remote work saves a lot of commuting time, but it can feel quite isolating after a while.',
            native: '远程办公能节省大量通勤时间，但时间一长可能会让人感到相当孤立。',
          },
          {
            en: 'Although offices cost money to maintain, they help new employees learn from experienced colleagues.',
            native: '尽管维护办公室需要花钱，但它能帮助新员工向有经验的同事学习。',
          },
          {
            en: 'If companies trusted their staff more, hybrid schedules would probably become the norm everywhere.',
            native: '如果公司更信任员工，混合办公模式可能会在各处成为常态。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'social media',
    questionText: 'How has social media changed the way people communicate? Is the change mostly positive or negative?',
    translations: {
      te: {
        word: 'సోషల్ మీడియా',
        question:
          'సోషల్ మీడియా ప్రజలు కమ్యూనికేట్ చేసే విధానాన్ని ఎలా మార్చింది? ఈ మార్పు ఎక్కువగా సానుకూలమా లేక ప్రతికూలమా?',
        examples: [
          {
            en: 'Social media allows families to stay in touch, although it sometimes replaces real conversations.',
            native:
              'కుటుంబాలు టచ్‌లో ఉండటానికి సోషల్ మీడియా అనుమతిస్తుంది, అయితే ఇది కొన్నిసార్లు నిజమైన సంభాషణలను భర్తీ చేస్తుంది.',
          },
          {
            en: 'If social platforms were regulated more strictly, fewer teenagers would be exposed to harmful content.',
            native:
              'సోషల్ ప్లాట్‌ఫారమ్‌లను మరింత కఠినంగా నియంత్రిస్తే, తక్కువ మంది టీనేజర్లు హానికరమైన కంటెంట్‌కు గురవుతారు.',
          },
          {
            en: 'News is often shared faster online, but it is not always checked before it spreads.',
            native:
              'వార్తలు ఆన్‌లైన్‌లో తరచుగా వేగంగా షేర్ చేయబడతాయి, కానీ అవి వ్యాప్తి చెందే ముందు ఎల్లప్పుడూ తనిఖీ చేయబడవు.',
          },
        ],
      },
      hi: {
        word: 'सोशल मीडिया',
        question:
          'सोशल मीडिया ने लोगों के संवाद करने के तरीके को कैसे बदला है? क्या यह बदलाव ज़्यादातर सकारात्मक है या नकारात्मक?',
        examples: [
          {
            en: 'Social media allows families to stay in touch, although it sometimes replaces real conversations.',
            native: 'सोशल मीडिया परिवारों को जुड़े रहने देता है, हालाँकि यह कभी-कभी असली बातचीत की जगह ले लेता है।',
          },
          {
            en: 'If social platforms were regulated more strictly, fewer teenagers would be exposed to harmful content.',
            native:
              'अगर सोशल प्लेटफ़ॉर्म पर ज़्यादा सख़्त नियम लागू हों, तो कम किशोर हानिकारक कंटेंट के संपर्क में आएँगे।',
          },
          {
            en: 'News is often shared faster online, but it is not always checked before it spreads.',
            native: 'ख़बरें अक्सर ऑनलाइन तेज़ी से साझा होती हैं, लेकिन फैलने से पहले उनकी जाँच हमेशा नहीं होती।',
          },
        ],
      },
      es: {
        word: 'redes sociales',
        question:
          '¿Cómo han cambiado las redes sociales la forma en que la gente se comunica? ¿Es un cambio mayormente positivo o negativo?',
        examples: [
          {
            en: 'Social media allows families to stay in touch, although it sometimes replaces real conversations.',
            native:
              'Las redes sociales permiten a las familias mantenerse en contacto, aunque a veces reemplazan las conversaciones reales.',
          },
          {
            en: 'If social platforms were regulated more strictly, fewer teenagers would be exposed to harmful content.',
            native:
              'Si las plataformas sociales estuvieran reguladas con más rigor, menos adolescentes estarían expuestos a contenido dañino.',
          },
          {
            en: 'News is often shared faster online, but it is not always checked before it spreads.',
            native:
              'Las noticias a menudo se comparten más rápido en línea, pero no siempre se verifican antes de difundirse.',
          },
        ],
      },
      zh: {
        word: '社交媒体',
        question: '社交媒体如何改变了人们的交流方式？这种变化主要是积极的还是消极的？',
        examples: [
          {
            en: 'Social media allows families to stay in touch, although it sometimes replaces real conversations.',
            native: '社交媒体让家人能够保持联系，尽管它有时取代了真正的交谈。',
          },
          {
            en: 'If social platforms were regulated more strictly, fewer teenagers would be exposed to harmful content.',
            native: '如果对社交平台的监管更加严格，接触有害内容的青少年就会减少。',
          },
          {
            en: 'News is often shared faster online, but it is not always checked before it spreads.',
            native: '新闻往往在网上传播得更快，但在扩散之前并不总是经过核实。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'leadership',
    questionText: 'What qualities make a good leader? Can leadership be learned, or is it a natural talent?',
    translations: {
      te: {
        word: 'నాయకత్వం',
        question: 'మంచి నాయకుడికి ఏ లక్షణాలు ఉండాలి? నాయకత్వం నేర్చుకోవచ్చా, లేక అది సహజ ప్రతిభయేనా?',
        examples: [
          {
            en: 'A good leader listens carefully, although making quick decisions is also part of the role.',
            native: 'మంచి నాయకుడు జాగ్రత్తగా వింటాడు, అయితే త్వరగా నిర్ణయాలు తీసుకోవడం కూడా ఆ పాత్రలో భాగం.',
          },
          {
            en: 'If leadership courses were offered in every school, more young people would gain confidence early.',
            native: 'ప్రతి పాఠశాలలో నాయకత్వ కోర్సులు అందించబడితే, మరిన్ని మంది యువకులు త్వరగా ఆత్మవిశ్వాసం పొందుతారు.',
          },
          {
            en: 'Authority is often given to confident public speakers, but real leadership is shown through consistent actions.',
            native:
              'అధికారం తరచుగా ఆత్మవిశ్వాసంతో ప్రజల ముందు మాట్లాడేవారికి ఇవ్వబడుతుంది, కానీ నిజమైన నాయకత్వం స్థిరమైన చర్యల ద్వారా కనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'नेतृत्व',
        question: 'अच्छे नेता में कौन-से गुण होने चाहिए? क्या नेतृत्व सीखा जा सकता है, या यह स्वाभाविक प्रतिभा है?',
        examples: [
          {
            en: 'A good leader listens carefully, although making quick decisions is also part of the role.',
            native: 'अच्छा नेता ध्यान से सुनता है, हालाँकि जल्दी फ़ैसले लेना भी इस भूमिका का हिस्सा है।',
          },
          {
            en: 'If leadership courses were offered in every school, more young people would gain confidence early.',
            native: 'अगर हर स्कूल में नेतृत्व के पाठ्यक्रम दिए जाएँ, तो ज़्यादा युवा जल्दी आत्मविश्वास हासिल करेंगे।',
          },
          {
            en: 'Authority is often given to confident public speakers, but real leadership is shown through consistent actions.',
            native:
              'अधिकार अक्सर आत्मविश्वासी सार्वजनिक वक्ताओं को दिया जाता है, लेकिन असली नेतृत्व लगातार कार्यों से दिखता है।',
          },
        ],
      },
      es: {
        word: 'liderazgo',
        question: '¿Qué cualidades hacen a un buen líder? ¿Se puede aprender a liderar o es un talento natural?',
        examples: [
          {
            en: 'A good leader listens carefully, although making quick decisions is also part of the role.',
            native: 'Un buen líder escucha con atención, aunque tomar decisiones rápidas también es parte del papel.',
          },
          {
            en: 'If leadership courses were offered in every school, more young people would gain confidence early.',
            native:
              'Si se ofrecieran cursos de liderazgo en todas las escuelas, más jóvenes ganarían confianza desde temprano.',
          },
          {
            en: 'Authority is often given to confident public speakers, but real leadership is shown through consistent actions.',
            native:
              'La autoridad a menudo se concede a los oradores seguros, pero el verdadero liderazgo se demuestra con acciones constantes.',
          },
        ],
      },
      zh: {
        word: '领导力',
        question: '哪些品质能造就一位优秀的领导者？领导力是可以学习的，还是天生的才能？',
        examples: [
          {
            en: 'A good leader listens carefully, although making quick decisions is also part of the role.',
            native: '优秀的领导者会认真倾听，尽管快速决策也是这一角色的一部分。',
          },
          {
            en: 'If leadership courses were offered in every school, more young people would gain confidence early.',
            native: '如果每所学校都开设领导力课程，更多年轻人会及早获得自信。',
          },
          {
            en: 'Authority is often given to confident public speakers, but real leadership is shown through consistent actions.',
            native: '权力往往被授予自信的公开演说者，但真正的领导力体现在始终如一的行动中。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'stress',
    questionText: 'Why do people experience more stress today than in the past? How can it be managed?',
    translations: {
      te: {
        word: 'ఒత్తిడి',
        question: 'గతం కంటే ఈరోజుల్లో ప్రజలు ఎందుకు ఎక్కువ ఒత్తిడిని అనుభవిస్తున్నారు? దాన్ని ఎలా నిర్వహించవచ్చు?',
        examples: [
          {
            en: 'Although modern life is more comfortable, people are expected to be available all the time.',
            native: 'ఆధునిక జీవితం మరింత సౌకర్యవంతంగా ఉన్నప్పటికీ, ప్రజలు ఎల్లప్పుడూ అందుబాటులో ఉండాలని భావిస్తారు.',
          },
          {
            en: 'Stress can be reduced if regular exercise and enough sleep are treated as real priorities.',
            native:
              'క్రమం తప్పకుండా వ్యాయామం మరియు తగినంత నిద్రను నిజమైన ప్రాధాన్యతలుగా భావిస్తే ఒత్తిడిని తగ్గించవచ్చు.',
          },
          {
            en: 'If employers encouraged shorter working hours, many health problems could be prevented before they start.',
            native: 'యజమానులు తక్కువ పని గంటలను ప్రోత్సహిస్తే, అనేక ఆరోగ్య సమస్యలు ప్రారంభం కాకముందే నివారించబడవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'तनाव',
        question: 'लोग आज अतीत की तुलना में ज़्यादा तनाव क्यों महसूस करते हैं? इसे कैसे नियंत्रित किया जा सकता है?',
        examples: [
          {
            en: 'Although modern life is more comfortable, people are expected to be available all the time.',
            native: 'हालाँकि आधुनिक जीवन ज़्यादा आरामदायक है, लोगों से हर समय उपलब्ध रहने की उम्मीद की जाती है।',
          },
          {
            en: 'Stress can be reduced if regular exercise and enough sleep are treated as real priorities.',
            native: 'नियमित व्यायाम और पर्याप्त नींद को सच्ची प्राथमिकता माना जाए तो तनाव घटाया जा सकता है।',
          },
          {
            en: 'If employers encouraged shorter working hours, many health problems could be prevented before they start.',
            native:
              'अगर नियोक्ता कम काम के घंटों को प्रोत्साहित करें, तो कई स्वास्थ्य समस्याएँ शुरू होने से पहले रोकी जा सकती हैं।',
          },
        ],
      },
      es: {
        word: 'estrés',
        question: '¿Por qué la gente sufre más estrés hoy que antes? ¿Cómo se puede manejar?',
        examples: [
          {
            en: 'Although modern life is more comfortable, people are expected to be available all the time.',
            native: 'Aunque la vida moderna es más cómoda, se espera que la gente esté disponible todo el tiempo.',
          },
          {
            en: 'Stress can be reduced if regular exercise and enough sleep are treated as real priorities.',
            native:
              'El estrés puede reducirse si el ejercicio regular y el sueño suficiente se tratan como prioridades reales.',
          },
          {
            en: 'If employers encouraged shorter working hours, many health problems could be prevented before they start.',
            native:
              'Si los empleadores fomentaran jornadas más cortas, muchos problemas de salud podrían prevenirse antes de empezar.',
          },
        ],
      },
      zh: {
        word: '压力',
        question: '为什么如今人们比过去承受更大的压力？应该如何应对压力？',
        examples: [
          {
            en: 'Although modern life is more comfortable, people are expected to be available all the time.',
            native: '尽管现代生活更加舒适，人们却被期望随时保持在线。',
          },
          {
            en: 'Stress can be reduced if regular exercise and enough sleep are treated as real priorities.',
            native: '如果把规律锻炼和充足睡眠当作真正的优先事项，压力是可以减轻的。',
          },
          {
            en: 'If employers encouraged shorter working hours, many health problems could be prevented before they start.',
            native: '如果雇主鼓励缩短工作时间，许多健康问题可以在发生之前得到预防。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'advertising',
    questionText: 'Does advertising influence what people buy, or do consumers make independent choices?',
    translations: {
      te: {
        word: 'ప్రకటనలు',
        question:
          'ప్రజలు ఏమి కొనుగోలు చేస్తారో ప్రకటనలు ప్రభావితం చేస్తాయా, లేక వినియోగదారులు స్వతంత్రంగా నిర్ణయాలు తీసుకుంటారా?',
        examples: [
          {
            en: 'Advertisements are designed to create desires, although most viewers believe they are immune to them.',
            native:
              'ప్రకటనలు కోరికలను సృష్టించడానికి రూపొందించబడతాయి, అయితే చాలామంది వీక్షకులు తాము వాటి ప్రభావానికి లోనవ్వమని నమ్ముతారు.',
          },
          {
            en: 'If advertising aimed at children were banned, parents would probably face fewer demands in supermarkets.',
            native:
              'పిల్లలను లక్ష్యంగా చేసుకునే ప్రకటనలను నిషేధిస్తే, సూపర్ మార్కెట్లలో తల్లిదండ్రులు బహుశా తక్కువ డిమాండ్లను ఎదుర్కొంటారు.',
          },
          {
            en: 'Products are often remembered because of emotion, not because of the quality they actually offer.',
            native: 'ఉత్పత్తులు వాస్తవంగా అందించే నాణ్యత వల్ల కాకుండా భావోద్వేగం వల్ల తరచుగా గుర్తుండిపోతాయి.',
          },
        ],
      },
      hi: {
        word: 'विज्ञापन',
        question: 'क्या विज्ञापन लोगों की ख़रीदारी को प्रभावित करते हैं, या उपभोक्ता स्वतंत्र रूप से फ़ैसले करते हैं?',
        examples: [
          {
            en: 'Advertisements are designed to create desires, although most viewers believe they are immune to them.',
            native:
              'विज्ञापन इच्छाएँ पैदा करने के लिए बनाए जाते हैं, हालाँकि ज़्यादातर दर्शक मानते हैं कि वे इनसे अछूते हैं।',
          },
          {
            en: 'If advertising aimed at children were banned, parents would probably face fewer demands in supermarkets.',
            native:
              'अगर बच्चों पर निशाना साधने वाले विज्ञापनों पर रोक लगा दी जाए, तो सुपरमार्केट में माता-पिता को शायद कम माँगों का सामना करना पड़े।',
          },
          {
            en: 'Products are often remembered because of emotion, not because of the quality they actually offer.',
            native: 'उत्पाद अक्सर अपनी असली गुणवत्ता की वजह से नहीं, बल्कि भावना की वजह से याद रहते हैं।',
          },
        ],
      },
      es: {
        word: 'publicidad',
        question:
          '¿Influye la publicidad en lo que compra la gente, o los consumidores deciden de forma independiente?',
        examples: [
          {
            en: 'Advertisements are designed to create desires, although most viewers believe they are immune to them.',
            native:
              'Los anuncios están diseñados para crear deseos, aunque la mayoría de los espectadores cree que es inmune a ellos.',
          },
          {
            en: 'If advertising aimed at children were banned, parents would probably face fewer demands in supermarkets.',
            native:
              'Si se prohibiera la publicidad dirigida a los niños, los padres probablemente enfrentarían menos exigencias en los supermercados.',
          },
          {
            en: 'Products are often remembered because of emotion, not because of the quality they actually offer.',
            native: 'Los productos a menudo se recuerdan por la emoción, no por la calidad que realmente ofrecen.',
          },
        ],
      },
      zh: {
        word: '广告',
        question: '广告会影响人们的购买行为吗，还是消费者会做出独立的选择？',
        examples: [
          {
            en: 'Advertisements are designed to create desires, although most viewers believe they are immune to them.',
            native: '广告被设计用来制造欲望，尽管大多数观众认为自己对其免疫。',
          },
          {
            en: 'If advertising aimed at children were banned, parents would probably face fewer demands in supermarkets.',
            native: '如果禁止针对儿童的广告，父母在超市里可能会面临更少的要求。',
          },
          {
            en: 'Products are often remembered because of emotion, not because of the quality they actually offer.',
            native: '产品往往因为情感因素而被记住，而不是因为它们实际提供的品质。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'immigration',
    questionText: 'What challenges do immigrants face in a new country, and how can societies help them integrate?',
    translations: {
      te: {
        word: 'వలస',
        question: 'కొత్త దేశంలో వలసదారులు ఏ సవాళ్లను ఎదుర్కొంటారు, మరియు వారు ఇమిడిపోవడానికి సమాజాలు ఎలా సహాయపడగలవు?',
        examples: [
          {
            en: 'Immigrants are often expected to adapt quickly, although learning a language takes many years.',
            native:
              'వలసదారులు త్వరగా సరిపోవాలని తరచుగా భావిస్తారు, అయితే ఒక భాష నేర్చుకోవడానికి చాలా సంవత్సరాలు పడుతుంది.',
          },
          {
            en: 'If free language courses were provided to newcomers, integration would probably happen much more smoothly.',
            native: 'కొత్తగా వచ్చినవారికి ఉచిత భాషా కోర్సులు అందించబడితే, ఇమిడిపోవడం బహుశా మరింత సాఫీగా జరుగుతుంది.',
          },
          {
            en: 'Communities become richer when different traditions are shared, but openness is required on both sides.',
            native:
              'విభిన్న సంప్రదాయాలు పంచుకున్నప్పుడు సమాజాలు సమృద్ధిగా మారతాయి, కానీ రెండు వైపులా విశాలమైన దృక్పథం అవసరం.',
          },
        ],
      },
      hi: {
        word: 'आप्रवासन',
        question:
          'नए देश में आप्रवासियों को कौन-सी चुनौतियों का सामना करना पड़ता है, और समाज उनके समावेश में कैसे मदद कर सकते हैं?',
        examples: [
          {
            en: 'Immigrants are often expected to adapt quickly, although learning a language takes many years.',
            native: 'आप्रवासियों से अक्सर जल्दी ढलने की उम्मीद की जाती है, हालाँकि भाषा सीखने में कई साल लगते हैं।',
          },
          {
            en: 'If free language courses were provided to newcomers, integration would probably happen much more smoothly.',
            native: 'अगर नवागंतुकों को मुफ़्त भाषा पाठ्यक्रम दिए जाएँ, तो समावेश शायद कहीं ज़्यादा सुगमता से होगा।',
          },
          {
            en: 'Communities become richer when different traditions are shared, but openness is required on both sides.',
            native:
              'जब अलग-अलग परंपराएँ साझा होती हैं तो समाज समृद्ध बनते हैं, लेकिन दोनों ओर से खुलेपन की ज़रूरत होती है।',
          },
        ],
      },
      es: {
        word: 'inmigración',
        question:
          '¿Qué desafíos enfrentan los inmigrantes en un país nuevo y cómo pueden las sociedades ayudarlos a integrarse?',
        examples: [
          {
            en: 'Immigrants are often expected to adapt quickly, although learning a language takes many years.',
            native:
              'A menudo se espera que los inmigrantes se adapten rápido, aunque aprender un idioma lleva muchos años.',
          },
          {
            en: 'If free language courses were provided to newcomers, integration would probably happen much more smoothly.',
            native:
              'Si se ofrecieran cursos de idiomas gratuitos a los recién llegados, la integración probablemente sería mucho más fluida.',
          },
          {
            en: 'Communities become richer when different traditions are shared, but openness is required on both sides.',
            native:
              'Las comunidades se enriquecen cuando se comparten tradiciones diferentes, pero se requiere apertura de ambas partes.',
          },
        ],
      },
      zh: {
        word: '移民',
        question: '移民在新国家面临哪些挑战？社会如何帮助他们融入？',
        examples: [
          {
            en: 'Immigrants are often expected to adapt quickly, although learning a language takes many years.',
            native: '人们常常期望移民迅速适应，尽管学习一门语言需要很多年。',
          },
          {
            en: 'If free language courses were provided to newcomers, integration would probably happen much more smoothly.',
            native: '如果为新来者提供免费语言课程，融入过程可能会顺利得多。',
          },
          {
            en: 'Communities become richer when different traditions are shared, but openness is required on both sides.',
            native: '当不同的传统被分享时，社区会变得更加丰富，但这需要双方都保持开放。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'science',
    questionText: 'Should governments invest more in scientific research, even when the results are uncertain?',
    translations: {
      te: {
        word: 'సైన్స్',
        question: 'ఫలితాలు అనిశ్చితంగా ఉన్నప్పటికీ ప్రభుత్వాలు శాస్త్రీయ పరిశోధనలో మరింత పెట్టుబడి పెట్టాలా?',
        examples: [
          {
            en: 'Scientific research is expensive, but history shows that unexpected discoveries often benefit everyone much later.',
            native:
              'శాస్త్రీయ పరిశోధన ఖరీదైనది, కానీ ఊహించని ఆవిష్కరణలు తరచుగా చాలా తర్వాత అందరికీ ప్రయోజనం చేకూరుస్తాయని చరిత్ర చూపిస్తుంది.',
          },
          {
            en: 'If public funding were cut, only profitable areas of science would continue to be explored.',
            native: 'ప్రభుత్వ నిధులు తగ్గించబడితే, లాభదాయకమైన శాస్త్రీయ రంగాలు మాత్రమే అన్వేషించబడుతూ ఉంటాయి.',
          },
          {
            en: 'Although results can never be guaranteed, curiosity-driven projects have already changed the world many times.',
            native:
              'ఫలితాలకు ఎప్పుడూ హామీ ఇవ్వలేము అయినప్పటికీ, జిజ్ఞాసతో నడిచే ప్రాజెక్టులు ఇప్పటికే ప్రపంచాన్ని చాలాసార్లు మార్చాయి.',
          },
        ],
      },
      hi: {
        word: 'विज्ञान',
        question: 'क्या सरकारों को वैज्ञानिक अनुसंधान में और निवेश करना चाहिए, भले ही परिणाम अनिश्चित हों?',
        examples: [
          {
            en: 'Scientific research is expensive, but history shows that unexpected discoveries often benefit everyone much later.',
            native:
              'वैज्ञानिक अनुसंधान महँगा है, लेकिन इतिहास बताता है कि अप्रत्याशित खोजें अक्सर काफ़ी बाद में सबको फ़ायदा पहुँचाती हैं।',
          },
          {
            en: 'If public funding were cut, only profitable areas of science would continue to be explored.',
            native: 'अगर सार्वजनिक धन में कटौती हो जाए, तो विज्ञान के केवल लाभदायक क्षेत्रों की ही खोज जारी रहेगी।',
          },
          {
            en: 'Although results can never be guaranteed, curiosity-driven projects have already changed the world many times.',
            native:
              'हालाँकि परिणामों की कभी गारंटी नहीं दी जा सकती, जिज्ञासा-आधारित परियोजनाएँ दुनिया को पहले ही कई बार बदल चुकी हैं।',
          },
        ],
      },
      es: {
        word: 'ciencia',
        question:
          '¿Deberían los gobiernos invertir más en investigación científica, incluso cuando los resultados son inciertos?',
        examples: [
          {
            en: 'Scientific research is expensive, but history shows that unexpected discoveries often benefit everyone much later.',
            native:
              'La investigación científica es cara, pero la historia muestra que los descubrimientos inesperados suelen beneficiar a todos mucho después.',
          },
          {
            en: 'If public funding were cut, only profitable areas of science would continue to be explored.',
            native:
              'Si se recortara la financiación pública, solo se seguirían explorando las áreas rentables de la ciencia.',
          },
          {
            en: 'Although results can never be guaranteed, curiosity-driven projects have already changed the world many times.',
            native:
              'Aunque los resultados nunca pueden garantizarse, los proyectos impulsados por la curiosidad ya han cambiado el mundo muchas veces.',
          },
        ],
      },
      zh: {
        word: '科学',
        question: '即使结果不确定，政府也应该在科学研究上投入更多资金吗？',
        examples: [
          {
            en: 'Scientific research is expensive, but history shows that unexpected discoveries often benefit everyone much later.',
            native: '科学研究耗资巨大，但历史表明，意外的发现往往在很久以后惠及所有人。',
          },
          {
            en: 'If public funding were cut, only profitable areas of science would continue to be explored.',
            native: '如果削减公共资金，科学领域中将只有有利可图的方向会继续被探索。',
          },
          {
            en: 'Although results can never be guaranteed, curiosity-driven projects have already changed the world many times.',
            native: '尽管结果永远无法保证，但由好奇心驱动的项目已经多次改变了世界。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'fashion industry',
    questionText: 'Is the fashion industry harmful to society, or does it play a valuable cultural role?',
    translations: {
      te: {
        word: 'ఫ్యాషన్ పరిశ్రమ',
        question: 'ఫ్యాషన్ పరిశ్రమ సమాజానికి హానికరమా, లేక అది విలువైన సాంస్కృతిక పాత్ర పోషిస్తుందా?',
        examples: [
          {
            en: 'Trends are changed every season so that people feel pressured to buy clothes they do not need.',
            native: 'ప్రజలకు అవసరం లేని దుస్తులు కొనాలన్న ఒత్తిడి కలిగించడానికి ప్రతి సీజన్‌లో ట్రెండ్‌లు మార్చబడతాయి.',
          },
          {
            en: 'Although fashion can express identity, the industry is criticised for waste and poor working conditions.',
            native:
              'ఫ్యాషన్ గుర్తింపును వ్యక్తపరచగలదు అయినప్పటికీ, వ్యర్థాలు మరియు పేలవమైన పని పరిస్థితుల కోసం ఈ పరిశ్రమ విమర్శించబడుతుంది.',
          },
          {
            en: 'If sustainable materials became cheaper, environmentally friendly clothing would probably be chosen more often.',
            native: 'సస్టైనబుల్ మెటీరియల్స్ చవకగా మారితే, పర్యావరణ అనుకూల దుస్తులు బహుశా మరింత తరచుగా ఎంపిక చేయబడతాయి.',
          },
        ],
      },
      hi: {
        word: 'फ़ैशन उद्योग',
        question: 'क्या फ़ैशन उद्योग समाज के लिए हानिकारक है, या यह कोई मूल्यवान सांस्कृतिक भूमिका निभाता है?',
        examples: [
          {
            en: 'Trends are changed every season so that people feel pressured to buy clothes they do not need.',
            native:
              'ट्रेंड हर सीज़न बदले जाते हैं ताकि लोग वे कपड़े ख़रीदने का दबाव महसूस करें जिनकी उन्हें ज़रूरत नहीं है।',
          },
          {
            en: 'Although fashion can express identity, the industry is criticised for waste and poor working conditions.',
            native:
              'हालाँकि फ़ैशन पहचान व्यक्त कर सकता है, इस उद्योग की आलोचना कचरे और ख़राब कामकाजी हालात के लिए होती है।',
          },
          {
            en: 'If sustainable materials became cheaper, environmentally friendly clothing would probably be chosen more often.',
            native: 'अगर टिकाऊ सामग्रियाँ सस्ती हो जाएँ, तो पर्यावरण-अनुकूल कपड़ों को शायद ज़्यादा बार चुना जाएगा।',
          },
        ],
      },
      es: {
        word: 'industria de la moda',
        question: '¿Es la industria de la moda perjudicial para la sociedad o desempeña un valioso papel cultural?',
        examples: [
          {
            en: 'Trends are changed every season so that people feel pressured to buy clothes they do not need.',
            native:
              'Las tendencias cambian cada temporada para que la gente se sienta presionada a comprar ropa que no necesita.',
          },
          {
            en: 'Although fashion can express identity, the industry is criticised for waste and poor working conditions.',
            native:
              'Aunque la moda puede expresar identidad, la industria es criticada por el desperdicio y las malas condiciones laborales.',
          },
          {
            en: 'If sustainable materials became cheaper, environmentally friendly clothing would probably be chosen more often.',
            native:
              'Si los materiales sostenibles fueran más baratos, probablemente se elegiría ropa ecológica con más frecuencia.',
          },
        ],
      },
      zh: {
        word: '时尚产业',
        question: '时尚产业对社会有害吗，还是它扮演着宝贵的文化角色？',
        examples: [
          {
            en: 'Trends are changed every season so that people feel pressured to buy clothes they do not need.',
            native: '潮流每一季都在变化，让人们感到有压力去购买自己并不需要的衣服。',
          },
          {
            en: 'Although fashion can express identity, the industry is criticised for waste and poor working conditions.',
            native: '尽管时尚可以表达身份，但这个行业因浪费和恶劣的工作条件而受到批评。',
          },
          {
            en: 'If sustainable materials became cheaper, environmentally friendly clothing would probably be chosen more often.',
            native: '如果可持续材料变得更便宜，环保服装可能会被更频繁地选择。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'online learning',
    questionText: 'Can online learning replace traditional classrooms? What is lost when education moves online?',
    translations: {
      te: {
        word: 'ఆన్‌లైన్ లెర్నింగ్',
        question:
          'ఆన్‌లైన్ లెర్నింగ్ సాంప్రదాయ తరగతి గదులను భర్తీ చేయగలదా? విద్య ఆన్‌లైన్‌కు మారినప్పుడు ఏమి కోల్పోతాం?',
        examples: [
          {
            en: 'Online courses allow adults to study while working, although self-discipline is needed to finish them.',
            native:
              'ఆన్‌లైన్ కోర్సులు పని చేస్తూ పెద్దలు చదువుకోవడానికి అనుమతిస్తాయి, అయితే వాటిని పూర్తి చేయడానికి స్వయం క్రమశిక్షణ అవసరం.',
          },
          {
            en: 'If classrooms disappeared completely, children would miss the social skills learned through daily contact.',
            native:
              'తరగతి గదులు పూర్తిగా అదృశ్యమైతే, రోజువారీ సంపర్కం ద్వారా నేర్చుకునే సామాజిక నైపుణ్యాలను పిల్లలు కోల్పోతారు.',
          },
          {
            en: 'Recorded lectures can be paused and repeated, but questions are answered more slowly than in person.',
            native:
              'రికార్డ్ చేసిన ఉపన్యాసాలను పాజ్ చేయవచ్చు మరియు మళ్లీ వినవచ్చు, కానీ ప్రశ్నలకు సమాధానాలు ప్రత్యక్షంగా కంటే నెమ్మదిగా లభిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'ऑनलाइन शिक्षा',
        question: 'क्या ऑनलाइन शिक्षा पारंपरिक कक्षाओं की जगह ले सकती है? शिक्षा के ऑनलाइन होने से क्या खोता है?',
        examples: [
          {
            en: 'Online courses allow adults to study while working, although self-discipline is needed to finish them.',
            native:
              'ऑनलाइन पाठ्यक्रम वयस्कों को काम करते हुए पढ़ने देते हैं, हालाँकि उन्हें पूरा करने के लिए आत्म-अनुशासन चाहिए।',
          },
          {
            en: 'If classrooms disappeared completely, children would miss the social skills learned through daily contact.',
            native:
              'अगर कक्षाएँ पूरी तरह गायब हो जाएँ, तो बच्चे रोज़मर्रा के संपर्क से सीखे जाने वाले सामाजिक कौशल खो देंगे।',
          },
          {
            en: 'Recorded lectures can be paused and repeated, but questions are answered more slowly than in person.',
            native:
              'रिकॉर्ड किए गए व्याख्यान रोके और दोहराए जा सकते हैं, लेकिन सवालों के जवाब आमने-सामने की तुलना में देर से मिलते हैं।',
          },
        ],
      },
      es: {
        word: 'aprendizaje en línea',
        question:
          '¿Puede el aprendizaje en línea reemplazar las aulas tradicionales? ¿Qué se pierde cuando la educación se traslada a internet?',
        examples: [
          {
            en: 'Online courses allow adults to study while working, although self-discipline is needed to finish them.',
            native:
              'Los cursos en línea permiten a los adultos estudiar mientras trabajan, aunque se necesita autodisciplina para terminarlos.',
          },
          {
            en: 'If classrooms disappeared completely, children would miss the social skills learned through daily contact.',
            native:
              'Si las aulas desaparecieran por completo, los niños perderían las habilidades sociales que se aprenden con el contacto diario.',
          },
          {
            en: 'Recorded lectures can be paused and repeated, but questions are answered more slowly than in person.',
            native:
              'Las clases grabadas se pueden pausar y repetir, pero las preguntas se responden más lentamente que en persona.',
          },
        ],
      },
      zh: {
        word: '在线学习',
        question: '在线学习能取代传统课堂吗？教育转到线上会失去什么？',
        examples: [
          {
            en: 'Online courses allow adults to study while working, although self-discipline is needed to finish them.',
            native: '在线课程让成年人可以边工作边学习，尽管完成课程需要自律。',
          },
          {
            en: 'If classrooms disappeared completely, children would miss the social skills learned through daily contact.',
            native: '如果课堂完全消失，孩子们将失去通过日常接触学到的社交技能。',
          },
          {
            en: 'Recorded lectures can be paused and repeated, but questions are answered more slowly than in person.',
            native: '录播课程可以暂停和重复，但问题的回答速度比面对面慢。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'competition',
    questionText: 'Does competition bring out the best in people, or does it create unnecessary pressure?',
    translations: {
      te: {
        word: 'పోటీ',
        question: 'పోటీ ప్రజల్లోని మంచిని బయటపెడుతుందా, లేక అనవసరమైన ఒత్తిడిని సృష్టిస్తుందా?',
        examples: [
          {
            en: 'Competition pushes athletes to train harder, although too much of it can destroy the joy of playing.',
            native:
              'పోటీ క్రీడాకారులను మరింత కష్టపడి శిక్షణ పొందేలా ప్రేరేపిస్తుంది, అయితే అది అతిగా ఉంటే ఆటలోని ఆనందాన్ని నాశనం చేస్తుంది.',
          },
          {
            en: 'If workplaces rewarded cooperation rather than constant rivalry, fewer employees would feel exhausted and anxious.',
            native:
              'కార్యాలయాలు నిరంతర ప్రతిద్వంద్విత్వం బదులు సహకారానికి బహూమతులు ఇస్తే, తక్కువ మంది ఉద్యోగులు అలసిపోయి ఆందోళనగా ఉంటారు.',
          },
          {
            en: 'Marks and rankings are easily compared, but creativity is rarely measured fairly in competitive exams.',
            native:
              'మార్కులు మరియు ర్యాంకులను సులభంగా పోల్చవచ్చు, కానీ పోటీ పరీక్షల్లో సృజనాత్మకతను అరుదుగా న్యాయంగా కొలుస్తారు.',
          },
        ],
      },
      hi: {
        word: 'प्रतिस्पर्धा',
        question: 'क्या प्रतिस्पर्धा लोगों के अंदर की सर्वश्रेष्ठता उजागर करती है, या यह अनावश्यक दबाव पैदा करती है?',
        examples: [
          {
            en: 'Competition pushes athletes to train harder, although too much of it can destroy the joy of playing.',
            native:
              'प्रतिस्पर्धा एथलीटों को और मेहनत से अभ्यास करने पर प्रेरित करती है, हालाँकि इसकी अधिकता खेल का आनंद नष्ट कर सकती है।',
          },
          {
            en: 'If workplaces rewarded cooperation rather than constant rivalry, fewer employees would feel exhausted and anxious.',
            native:
              'अगर कार्यस्थल निरंतर प्रतिद्वंद्विता के बजाय सहयोग को पुरस्कृत करें, तो कम कर्मचारी थके और चिंतित महसूस करेंगे।',
          },
          {
            en: 'Marks and rankings are easily compared, but creativity is rarely measured fairly in competitive exams.',
            native:
              'अंकों और रैंकिंग की तुलना आसानी से हो जाती है, लेकिन प्रतियोगी परीक्षाओं में रचनात्मकता शायद ही कभी निष्पक्ष रूप से मापी जाती है।',
          },
        ],
      },
      es: {
        word: 'competencia',
        question: '¿La competencia saca lo mejor de las personas o crea una presión innecesaria?',
        examples: [
          {
            en: 'Competition pushes athletes to train harder, although too much of it can destroy the joy of playing.',
            native:
              'La competencia empuja a los atletas a entrenar más, aunque demasiada puede destruir la alegría de jugar.',
          },
          {
            en: 'If workplaces rewarded cooperation rather than constant rivalry, fewer employees would feel exhausted and anxious.',
            native:
              'Si los lugares de trabajo recompensaran la cooperación en lugar de la rivalidad constante, menos empleados se sentirían agotados y ansiosos.',
          },
          {
            en: 'Marks and rankings are easily compared, but creativity is rarely measured fairly in competitive exams.',
            native:
              'Las notas y las clasificaciones se comparan fácilmente, pero la creatividad rara vez se mide con justicia en los exámenes competitivos.',
          },
        ],
      },
      zh: {
        word: '竞争',
        question: '竞争能激发人们最好的一面，还是会制造不必要的压力？',
        examples: [
          {
            en: 'Competition pushes athletes to train harder, although too much of it can destroy the joy of playing.',
            native: '竞争促使运动员更加刻苦训练，尽管过度的竞争会破坏运动的乐趣。',
          },
          {
            en: 'If workplaces rewarded cooperation rather than constant rivalry, fewer employees would feel exhausted and anxious.',
            native: '如果工作场所奖励合作而不是持续的对抗，感到疲惫和焦虑的员工会更少。',
          },
          {
            en: 'Marks and rankings are easily compared, but creativity is rarely measured fairly in competitive exams.',
            native: '分数和排名很容易比较，但在竞争性考试中，创造力很少被公平地衡量。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'volunteering',
    questionText: 'Why do people volunteer, and should volunteering be required in schools or workplaces?',
    translations: {
      te: {
        word: 'స్వచ్ఛంద సేవ',
        question:
          'ప్రజలు ఎందుకు స్వచ్ఛందంగా సేవ చేస్తారు, మరియు పాఠశాలల్లో లేదా కార్యాలయాల్లో స్వచ్ఛంద సేవ తప్పనిసరి చేయాలా?',
        examples: [
          {
            en: 'People volunteer because it gives them purpose, although free time is often limited by work.',
            native:
              'ప్రజలు స్వచ్ఛందంగా సేవ చేస్తారు ఎందుకంటే అది వారికి లక్ష్యాన్ని ఇస్తుంది, అయితే ఖాళీ సమయం తరచుగా పని వల్ల పరిమితం అవుతుంది.',
          },
          {
            en: 'If volunteering were compulsory at school, students would discover needs they never notice otherwise.',
            native: 'పాఠశాలలో స్వచ్ఛంద సేవ తప్పనిసరి అయితే, విద్యార్థులు లేకపోతే గమనించని అవసరాలను కనుగొంటారు.',
          },
          {
            en: 'Communities are strengthened when help is offered freely, but volunteers should never replace paid staff.',
            native:
              'సహాయం స్వేచ్ఛగా అందించబడినప్పుడు సమాజాలు బలపడతాయి, కానీ స్వచ్ఛందులు ఎప్పుడూ జీతం పొందే సిబ్బంది స్థానంలో ఉండకూడదు.',
          },
        ],
      },
      hi: {
        word: 'स्वयंसेवा',
        question: 'लोग स्वयंसेवा क्यों करते हैं, और क्या स्कूलों या कार्यस्थलों पर स्वयंसेवा अनिवार्य होनी चाहिए?',
        examples: [
          {
            en: 'People volunteer because it gives them purpose, although free time is often limited by work.',
            native:
              'लोग स्वयंसेवा करते हैं क्योंकि यह उन्हें उद्देश्य देती है, हालाँकि खाली समय अक्सर काम से सीमित होता है।',
          },
          {
            en: 'If volunteering were compulsory at school, students would discover needs they never notice otherwise.',
            native:
              'अगर स्कूल में स्वयंसेवा अनिवार्य हो, तो छात्र उन ज़रूरतों को खोजेंगे जिन पर वे वरना ध्यान नहीं देते।',
          },
          {
            en: 'Communities are strengthened when help is offered freely, but volunteers should never replace paid staff.',
            native:
              'जब मदद स्वतंत्र रूप से दी जाती है तो समुदाय मज़बूत होते हैं, लेकिन स्वयंसेवकों को कभी भी वेतनभोगी स्टाफ़ की जगह नहीं लेनी चाहिए।',
          },
        ],
      },
      es: {
        word: 'voluntariado',
        question:
          '¿Por qué la gente hace voluntariado, y debería ser obligatorio en las escuelas o los lugares de trabajo?',
        examples: [
          {
            en: 'People volunteer because it gives them purpose, although free time is often limited by work.',
            native:
              'La gente hace voluntariado porque le da un propósito, aunque el tiempo libre suele estar limitado por el trabajo.',
          },
          {
            en: 'If volunteering were compulsory at school, students would discover needs they never notice otherwise.',
            native:
              'Si el voluntariado fuera obligatorio en la escuela, los estudiantes descubrirían necesidades que de otro modo nunca notan.',
          },
          {
            en: 'Communities are strengthened when help is offered freely, but volunteers should never replace paid staff.',
            native:
              'Las comunidades se fortalecen cuando la ayuda se ofrece libremente, pero los voluntarios nunca deberían reemplazar al personal remunerado.',
          },
        ],
      },
      zh: {
        word: '志愿服务',
        question: '人们为什么做志愿者？学校或工作场所是否应该强制要求志愿服务？',
        examples: [
          {
            en: 'People volunteer because it gives them purpose, although free time is often limited by work.',
            native: '人们做志愿者是因为这给了他们目标感，尽管空闲时间往往受到工作的限制。',
          },
          {
            en: 'If volunteering were compulsory at school, students would discover needs they never notice otherwise.',
            native: '如果学校强制要求志愿服务，学生们会发现他们平时从未注意到的需求。',
          },
          {
            en: 'Communities are strengthened when help is offered freely, but volunteers should never replace paid staff.',
            native: '当帮助被自愿提供时，社区会变得更强，但志愿者绝不应取代带薪员工。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'consumerism',
    questionText: 'Does buying more things make people happier, or does consumerism create false needs?',
    translations: {
      te: {
        word: 'వినియోగవాదం',
        question: 'ఎక్కువ వస్తువులు కొనడం ప్రజలను సంతోషపెడుతుందా, లేక వినియోగవాదం అవాస్తవ అవసరాలను సృష్టిస్తుందా?',
        examples: [
          {
            en: 'Happiness from shopping fades quickly, although advertisements promise that the next purchase will last.',
            native:
              'షాపింగ్ నుండి వచ్చే సంతోషం త్వరగా మసకబారుతుంది, అయితే తదుపరి కొనుగోలు శాశ్వతమవుతుందని ప్రకటనలు హామీ ఇస్తాయి.',
          },
          {
            en: 'If people repaired things instead of replacing them, far less waste would be produced every year.',
            native:
              'ప్రజలు వస్తువులను మార్చడం బదులు మరమ్మతు చేస్తే, ప్రతి సంవత్సరం చాలా తక్కువ వ్యర్థాలు ఉత్పత్తి అవుతాయి.',
          },
          {
            en: 'Status is often displayed through expensive brands, but real wealth is rarely visible on the street.',
            native:
              'స్థాయిని తరచుగా ఖరీదైన బ్రాండ్ల ద్వారా ప్రదర్శిస్తారు, కానీ నిజమైన సంపద వీధిలో అరుదుగా కనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'उपभोक्तावाद',
        question: 'क्या ज़्यादा चीज़ें ख़रीदने से लोग खुश होते हैं, या उपभोक्तावाद झूठी ज़रूरतें पैदा करता है?',
        examples: [
          {
            en: 'Happiness from shopping fades quickly, although advertisements promise that the next purchase will last.',
            native:
              'ख़रीदारी से मिली खुशी जल्दी फीकी पड़ जाती है, हालाँकि विज्ञापन वादा करते हैं कि अगली ख़रीद टिकाऊ होगी।',
          },
          {
            en: 'If people repaired things instead of replacing them, far less waste would be produced every year.',
            native: 'अगर लोग चीज़ें बदलने के बजाय उनकी मरम्मत करें, तो हर साल काफ़ी कम कचरा पैदा होगा।',
          },
          {
            en: 'Status is often displayed through expensive brands, but real wealth is rarely visible on the street.',
            native: 'दर्जा अक्सर महँगे ब्रांडों से दिखाया जाता है, लेकिन असली दौलत सड़क पर शायद ही दिखती है।',
          },
        ],
      },
      es: {
        word: 'consumismo',
        question: '¿Comprar más cosas hace más feliz a la gente, o el consumismo crea necesidades falsas?',
        examples: [
          {
            en: 'Happiness from shopping fades quickly, although advertisements promise that the next purchase will last.',
            native:
              'La felicidad de las compras se desvanece rápido, aunque los anuncios prometen que la próxima compra durará.',
          },
          {
            en: 'If people repaired things instead of replacing them, far less waste would be produced every year.',
            native:
              'Si la gente reparara las cosas en lugar de reemplazarlas, se producirían muchos menos residuos cada año.',
          },
          {
            en: 'Status is often displayed through expensive brands, but real wealth is rarely visible on the street.',
            native:
              'El estatus a menudo se exhibe con marcas caras, pero la verdadera riqueza rara vez se ve en la calle.',
          },
        ],
      },
      zh: {
        word: '消费主义',
        question: '买更多东西会让人更快乐吗，还是消费主义制造了虚假的需求？',
        examples: [
          {
            en: 'Happiness from shopping fades quickly, although advertisements promise that the next purchase will last.',
            native: '购物带来的快乐很快消退，尽管广告承诺下一次购买会持久。',
          },
          {
            en: 'If people repaired things instead of replacing them, far less waste would be produced every year.',
            native: '如果人们修理东西而不是更换它们，每年产生的废物会少得多。',
          },
          {
            en: 'Status is often displayed through expensive brands, but real wealth is rarely visible on the street.',
            native: '地位往往通过昂贵的品牌来展示，但真正的财富在街上很少看得见。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'public transport',
    questionText: 'Should public transport be free for everyone? Who should pay for it?',
    translations: {
      te: {
        word: 'ప్రజా రవాణా',
        question: 'ప్రజా రవాణా అందరికీ ఉచితం కావాలా? దాని కోసం ఎవరు చెల్లించాలి?',
        examples: [
          {
            en: 'If buses and trains were completely free, city centres would be less crowded with private cars.',
            native: 'బస్సులు మరియు రైళ్లు పూర్తిగా ఉచితమైతే, నగర కేంద్రాలు ప్రైవేట్ కార్లతో తక్కువ రద్దీగా ఉంటాయి.',
          },
          {
            en: 'Public transport is used by everyone, although its cost is shared unequally between taxpayers and riders.',
            native:
              'ప్రజా రవాణాను అందరూ వాడతారు, అయితే దాని ఖర్చు పన్ను చెల్లించేవారికి మరియు ప్రయాణికులకు అసమానంగా పంచబడుతుంది.',
          },
          {
            en: 'When tickets become too expensive, the poorest workers are forced into the longest journeys.',
            native: 'టిక్కెట్లు చాలా ఖరీదైనప్పుడు, అతి పేద కార్మికులు అతి పొడవైన ప్రయాణాలకు బలవంతం చేయబడతారు.',
          },
        ],
      },
      hi: {
        word: 'सार्वजनिक परिवहन',
        question: 'क्या सार्वजनिक परिवहन सबके लिए मुफ़्त होना चाहिए? इसका ख़र्च किसे उठाना चाहिए?',
        examples: [
          {
            en: 'If buses and trains were completely free, city centres would be less crowded with private cars.',
            native: 'अगर बसें और ट्रेनें पूरी तरह मुफ़्त हों, तो शहर के केंद्र निजी कारों से कम भीड़भाड़ वाले होंगे।',
          },
          {
            en: 'Public transport is used by everyone, although its cost is shared unequally between taxpayers and riders.',
            native:
              'सार्वजनिक परिवहन सभी इस्तेमाल करते हैं, हालाँकि इसकी लागत करदाताओं और यात्रियों के बीच असमान रूप से बँटती है।',
          },
          {
            en: 'When tickets become too expensive, the poorest workers are forced into the longest journeys.',
            native: 'जब टिकट बहुत महँगे हो जाते हैं, तो सबसे ग़रीब मज़दूर सबसे लंबी यात्राओं के लिए मजबूर हो जाते हैं।',
          },
        ],
      },
      es: {
        word: 'transporte público',
        question: '¿Debería el transporte público ser gratuito para todos? ¿Quién debería pagarlo?',
        examples: [
          {
            en: 'If buses and trains were completely free, city centres would be less crowded with private cars.',
            native:
              'Si los autobuses y trenes fueran completamente gratuitos, los centros urbanos estarían menos llenos de coches privados.',
          },
          {
            en: 'Public transport is used by everyone, although its cost is shared unequally between taxpayers and riders.',
            native:
              'El transporte público lo usa todo el mundo, aunque su coste se reparte de forma desigual entre contribuyentes y usuarios.',
          },
          {
            en: 'When tickets become too expensive, the poorest workers are forced into the longest journeys.',
            native:
              'Cuando los billetes se vuelven demasiado caros, los trabajadores más pobres se ven obligados a hacer los trayectos más largos.',
          },
        ],
      },
      zh: {
        word: '公共交通',
        question: '公共交通应该对所有人免费吗？应该由谁来买单？',
        examples: [
          {
            en: 'If buses and trains were completely free, city centres would be less crowded with private cars.',
            native: '如果公交车和火车完全免费，市中心就不会那么拥堵私家车。',
          },
          {
            en: 'Public transport is used by everyone, although its cost is shared unequally between taxpayers and riders.',
            native: '人人都在使用公共交通，尽管其成本在纳税人和乘客之间分摊得并不均等。',
          },
          {
            en: 'When tickets become too expensive, the poorest workers are forced into the longest journeys.',
            native: '当票价变得太贵时，最贫困的工人被迫承受最长的通勤路程。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'teamwork',
    questionText: 'Is teamwork always better than working alone? What makes a team succeed or fail?',
    translations: {
      te: {
        word: 'జట్టు కృషి',
        question:
          'జట్టుగా పనిచేయడం ఎల్లప్పుడూ ఒంటరిగా పనిచేయడం కంటే మంచిదేనా? జట్టు విజయవంతం కావడానికి లేదా విఫలం కావడానికి కారణం ఏమిటి?',
        examples: [
          {
            en: 'Teams achieve more when members trust each other, although disagreements are sometimes useful and necessary.',
            native:
              'సభ్యులు ఒకరినొకరు నమ్ముకున్నప్పుడు జట్టులు ఎక్కువ సాధిస్తాయి, అయితే అభిప్రాయ భేదాలు కొన్నిసార్లు ఉపయోగకరం మరియు అవసరం.',
          },
          {
            en: 'If one person dominates every discussion, quieter colleagues are prevented from contributing their best ideas.',
            native:
              'ఒక వ్యక్తి ప్రతి చర్చను ఆధిపత్యం చేస్తే, నిశ్శబ్ద సహోద్యోగులు తమ ఉత్తమ ఆలోచనలను అందించకుండా నిరోధించబడతారు.',
          },
          {
            en: 'Working alone can be faster, but complex problems are usually solved better by groups.',
            native: 'ఒంటరిగా పనిచేయడం వేగంగా ఉండవచ్చు, కానీ సంక్లిష్ట సమస్యలను సాధారణంగా బృందాలు బాగా పరిష్కరిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'टीमवर्क',
        question: 'क्या टीमवर्क हमेशा अकेले काम करने से बेहतर है? किसी टीम को सफल या असफल क्या बनाता है?',
        examples: [
          {
            en: 'Teams achieve more when members trust each other, although disagreements are sometimes useful and necessary.',
            native:
              'जब सदस्य एक-दूसरे पर भरोसा करते हैं तो टीमें ज़्यादा हासिल करती हैं, हालाँकि मतभेद कभी-कभी उपयोगी और ज़रूरी होते हैं।',
          },
          {
            en: 'If one person dominates every discussion, quieter colleagues are prevented from contributing their best ideas.',
            native:
              'अगर एक व्यक्ति हर चर्चा पर हावी हो जाए, तो शांत सहकर्मियों को अपने बेहतरीन विचार देने से रोका जाता है।',
          },
          {
            en: 'Working alone can be faster, but complex problems are usually solved better by groups.',
            native: 'अकेले काम करना तेज़ हो सकता है, लेकिन जटिल समस्याएँ आमतौर पर समूहों द्वारा बेहतर हल की जाती हैं।',
          },
        ],
      },
      es: {
        word: 'trabajo en equipo',
        question:
          '¿Es el trabajo en equipo siempre mejor que trabajar solo? ¿Qué hace que un equipo tenga éxito o fracase?',
        examples: [
          {
            en: 'Teams achieve more when members trust each other, although disagreements are sometimes useful and necessary.',
            native:
              'Los equipos logran más cuando los miembros confían entre sí, aunque los desacuerdos a veces son útiles y necesarios.',
          },
          {
            en: 'If one person dominates every discussion, quieter colleagues are prevented from contributing their best ideas.',
            native:
              'Si una persona domina cada discusión, se impide que los colegas más callados aporten sus mejores ideas.',
          },
          {
            en: 'Working alone can be faster, but complex problems are usually solved better by groups.',
            native:
              'Trabajar solo puede ser más rápido, pero los problemas complejos suelen resolverse mejor en grupo.',
          },
        ],
      },
      zh: {
        word: '团队合作',
        question: '团队合作总是比独自工作更好吗？是什么让团队成功或失败？',
        examples: [
          {
            en: 'Teams achieve more when members trust each other, although disagreements are sometimes useful and necessary.',
            native: '当成员彼此信任时，团队能取得更多成就，尽管分歧有时也是有用且必要的。',
          },
          {
            en: 'If one person dominates every discussion, quieter colleagues are prevented from contributing their best ideas.',
            native: '如果一个人主导每次讨论，安静的同事就无法贡献他们最好的想法。',
          },
          {
            en: 'Working alone can be faster, but complex problems are usually solved better by groups.',
            native: '独自工作可能更快，但复杂的问题通常由团队解决得更好。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'communication',
    questionText: 'Why do misunderstandings happen so often, and how can communication be improved?',
    translations: {
      te: {
        word: 'కమ్యూనికేషన్',
        question: 'అపార్థాలు తరచుగా ఎందుకు జరుగుతాయి, మరియు కమ్యూనికేషన్‌ను ఎలా మెరుగుపరచవచ్చు?',
        examples: [
          {
            en: 'Misunderstandings often happen because people listen only to reply instead of listening carefully to understand.',
            native:
              'ప్రజలు అర్థం చేసుకోవడానికి జాగ్రత్తగా వినడం బదులు సమాధానం చెప్పడానికి మాత్రమే వింటారు కాబట్టి అపార్థాలు తరచుగా జరుగుతాయి.',
          },
          {
            en: 'If tone and body language were taught at school, many conflicts could be avoided quite easily.',
            native: 'పాఠశాలలో ధ్వని మరియు శరీర భాషను బోధిస్తే, అనేక వివాదాలను చాలా సులభంగా నివారించవచ్చు.',
          },
          {
            en: 'Written messages are read without emotion, although the writer may have meant something completely different.',
            native: 'వ్రాత సందేశాలు భావోద్వేగం లేకుండా చదవబడతాయి, అయితే రచయిత పూర్తిగా భిన్నమైనది ఉద్దేశించి ఉండవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'संचार',
        question: 'गलतफहमियाँ इतनी बार क्यों होती हैं, और संचार को कैसे बेहतर बनाया जा सकता है?',
        examples: [
          {
            en: 'Misunderstandings often happen because people listen only to reply instead of listening carefully to understand.',
            native:
              'गलतफहमियाँ अक्सर इसलिए होती हैं क्योंकि लोग समझने के लिए ध्यान से सुनने के बजाय सिर्फ़ जवाब देने के लिए सुनते हैं।',
          },
          {
            en: 'If tone and body language were taught at school, many conflicts could be avoided quite easily.',
            native: 'अगर स्कूल में लहज़ा और बॉडी लैंग्वेज सिखाई जाए, तो कई टकरावों को काफ़ी आसानी से टाला जा सकता है।',
          },
          {
            en: 'Written messages are read without emotion, although the writer may have meant something completely different.',
            native: 'लिखित संदेश बिना भावना के पढ़े जाते हैं, हालाँकि लिखने वाले का इरादा कुछ बिल्कुल अलग हो सकता है।',
          },
        ],
      },
      es: {
        word: 'comunicación',
        question: '¿Por qué ocurren los malentendidos tan a menudo, y cómo se puede mejorar la comunicación?',
        examples: [
          {
            en: 'Misunderstandings often happen because people listen only to reply instead of listening carefully to understand.',
            native:
              'Los malentendidos ocurren a menudo porque la gente escucha solo para responder en lugar de escuchar atentamente para comprender.',
          },
          {
            en: 'If tone and body language were taught at school, many conflicts could be avoided quite easily.',
            native:
              'Si se enseñaran el tono y el lenguaje corporal en la escuela, muchos conflictos podrían evitarse con bastante facilidad.',
          },
          {
            en: 'Written messages are read without emotion, although the writer may have meant something completely different.',
            native:
              'Los mensajes escritos se leen sin emoción, aunque quien escribe puede haber querido decir algo completamente distinto.',
          },
        ],
      },
      zh: {
        word: '沟通',
        question: '为什么误解如此频繁地发生？如何改善沟通？',
        examples: [
          {
            en: 'Misunderstandings often happen because people listen only to reply instead of listening carefully to understand.',
            native: '误解经常发生，因为人们倾听只是为了回应，而不是认真倾听去理解。',
          },
          {
            en: 'If tone and body language were taught at school, many conflicts could be avoided quite easily.',
            native: '如果学校教授语气和肢体语言，许多冲突可以很容易地避免。',
          },
          {
            en: 'Written messages are read without emotion, although the writer may have meant something completely different.',
            native: '书面信息被阅读时不带情感，尽管写的人可能完全不是那个意思。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'risk',
    questionText: 'Is taking risks necessary for a fulfilling life, or is safety more important?',
    translations: {
      te: {
        word: 'రిస్క్',
        question: 'సంతృప్తికరమైన జీవితానికి రిస్క్ తీసుకోవడం అవసరమా, లేక భద్రతే ముఖ్యమా?',
        examples: [
          {
            en: 'People who never take risks rarely fail, but they also rarely discover what they could become.',
            native:
              'ఎప్పుడూ రిస్క్ తీసుకోని వ్యక్తులు అరుదుగా విఫలమవుతారు, కానీ వారు ఏమి కాగలరో కూడా అరుదుగా కనుగొంటారు.',
          },
          {
            en: 'If everyone chose the safest option, few new businesses or inventions would ever be created.',
            native:
              'అందరూ అత్యంత సురక్షితమైన ఎంపికను ఎంచుకుంటే, కొద్దిగానే కొత్త వ్యాపారాలు లేదా ఆవిష్కరణలు సృష్టించబడతాయి.',
          },
          {
            en: 'Calculated risks are worth taking, although reckless decisions can damage lives that took years to build.',
            native:
              'లెక్కించిన రిస్క్‌లు తీసుకోవడం విలువైనదే, అయితే నిర్లక్ష్య నిర్ణయాలు నిర్మించడానికి సంవత్సరాలు పట్టిన జీవితాలను దెబ్బతీయగలవు.',
          },
        ],
      },
      hi: {
        word: 'जोखिम',
        question: 'क्या संतोषजनक जीवन के लिए जोखिम उठाना ज़रूरी है, या सुरक्षा ज़्यादा महत्वपूर्ण है?',
        examples: [
          {
            en: 'People who never take risks rarely fail, but they also rarely discover what they could become.',
            native:
              'जो लोग कभी जोखिम नहीं उठाते वे शायद ही असफल होते हैं, लेकिन वे यह भी शायद ही खोज पाते हैं कि वे क्या बन सकते थे।',
          },
          {
            en: 'If everyone chose the safest option, few new businesses or inventions would ever be created.',
            native: 'अगर सभी लोग सबसे सुरक्षित विकल्प चुनें, तो कुछ ही नए कारोबार या आविष्कार कभी बनाए जाएँगे।',
          },
          {
            en: 'Calculated risks are worth taking, although reckless decisions can damage lives that took years to build.',
            native:
              'परिकलित जोखिम उठाना सार्थक है, हालाँकि लापरवाह फ़ैसले उन जीवनों को नुकसान पहुँचा सकते हैं जिन्हें बनने में साल लगे।',
          },
        ],
      },
      es: {
        word: 'riesgo',
        question: '¿Es necesario asumir riesgos para una vida plena, o es más importante la seguridad?',
        examples: [
          {
            en: 'People who never take risks rarely fail, but they also rarely discover what they could become.',
            native:
              'Las personas que nunca asumen riesgos rara vez fracasan, pero también rara vez descubren en qué podrían convertirse.',
          },
          {
            en: 'If everyone chose the safest option, few new businesses or inventions would ever be created.',
            native: 'Si todos eligieran la opción más segura, pocas empresas o inventos nuevos llegarían a crearse.',
          },
          {
            en: 'Calculated risks are worth taking, although reckless decisions can damage lives that took years to build.',
            native:
              'Vale la pena asumir riesgos calculados, aunque las decisiones imprudentes pueden dañar vidas que tardaron años en construirse.',
          },
        ],
      },
      zh: {
        word: '风险',
        question: '要过充实的人生，冒险是必要的吗，还是安全更重要？',
        examples: [
          {
            en: 'People who never take risks rarely fail, but they also rarely discover what they could become.',
            native: '从不冒险的人很少失败，但他们也很少发现自己能成为什么样的人。',
          },
          {
            en: 'If everyone chose the safest option, few new businesses or inventions would ever be created.',
            native: '如果每个人都选择最安全的选项，就很少会有新企业或新发明被创造出来。',
          },
          {
            en: 'Calculated risks are worth taking, although reckless decisions can damage lives that took years to build.',
            native: '经过权衡的风险值得承担，尽管鲁莽的决定可能毁掉多年建立的生活。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'failure',
    questionText: 'Why are people so afraid of failure? Can failure be a better teacher than success?',
    translations: {
      te: {
        word: 'వైఫల్యం',
        question: 'ప్రజలు వైఫల్యానికి ఎందుకు అంతగా భయపడతారు? విజయం కంటే వైఫల్యం మెరుగైన ఉపాధ్యాయుడు కాగలదా?',
        examples: [
          {
            en: 'Although failure hurts deeply at first, it often teaches lessons that easy success never could.',
            native:
              'వైఫల్యం మొదట్లో లోతుగా బాధించినప్పటికీ, సులభమైన విజయం ఎప్పుడూ నేర్పలేని పాఠాలను అది తరచుగా నేర్పుతుంది.',
          },
          {
            en: 'If children were allowed to fail safely, they would grow into far more resilient adults.',
            native: 'పిల్లలు సురక్షితంగా విఫలం కావడానికి అనుమతిస్తే, వారు చాలా స్థైర్యవంతమైన పెద్దలుగా ఎదుగుతారు.',
          },
          {
            en: 'Mistakes are punished in many workplaces, so employees hide problems until they become disasters.',
            native:
              'అనేక కార్యాలయాల్లో తప్పులకు శిక్ష విధిస్తారు, కాబట్టి ఉద్యోగులు సమస్యలు విపత్తులు అయ్యే వరకు దాచిపెడతారు.',
          },
        ],
      },
      hi: {
        word: 'असफलता',
        question: 'लोग असफलता से इतना डरते क्यों हैं? क्या असफलता सफलता से बेहतर शिक्षक हो सकती है?',
        examples: [
          {
            en: 'Although failure hurts deeply at first, it often teaches lessons that easy success never could.',
            native:
              'हालाँकि असफलता शुरू में गहरा दुख देती है, यह अक्सर वे सबक सिखाती है जो आसान सफलता कभी नहीं सिखा सकती।',
          },
          {
            en: 'If children were allowed to fail safely, they would grow into far more resilient adults.',
            native: 'अगर बच्चों को सुरक्षित रूप से असफल होने दिया जाए, तो वे कहीं ज़्यादा लचीले वयस्क बनेंगे।',
          },
          {
            en: 'Mistakes are punished in many workplaces, so employees hide problems until they become disasters.',
            native:
              'कई कार्यस्थलों पर गलतियों की सज़ा मिलती है, इसलिए कर्मचारी समस्याओं को तब तक छिपाते हैं जब तक वे आपदा न बन जाएँ।',
          },
        ],
      },
      es: {
        word: 'fracaso',
        question: '¿Por qué la gente teme tanto al fracaso? ¿Puede el fracaso ser un mejor maestro que el éxito?',
        examples: [
          {
            en: 'Although failure hurts deeply at first, it often teaches lessons that easy success never could.',
            native:
              'Aunque el fracaso duele mucho al principio, a menudo enseña lecciones que el éxito fácil nunca podría enseñar.',
          },
          {
            en: 'If children were allowed to fail safely, they would grow into far more resilient adults.',
            native:
              'Si se permitiera a los niños fracasar con seguridad, se convertirían en adultos mucho más resilientes.',
          },
          {
            en: 'Mistakes are punished in many workplaces, so employees hide problems until they become disasters.',
            native:
              'En muchos lugares de trabajo se castigan los errores, así que los empleados ocultan los problemas hasta que se convierten en desastres.',
          },
        ],
      },
      zh: {
        word: '失败',
        question: '为什么人们如此害怕失败？失败能比成功成为更好的老师吗？',
        examples: [
          {
            en: 'Although failure hurts deeply at first, it often teaches lessons that easy success never could.',
            native: '尽管失败起初让人痛苦，但它往往教给人们轻易的成功永远无法教会的道理。',
          },
          {
            en: 'If children were allowed to fail safely, they would grow into far more resilient adults.',
            native: '如果允许孩子们安全地失败，他们会成长为更有韧性的成年人。',
          },
          {
            en: 'Mistakes are punished in many workplaces, so employees hide problems until they become disasters.',
            native: '许多工作场所惩罚错误，所以员工把问题藏起来，直到它们变成灾难。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'discipline',
    questionText: 'Is discipline more important than motivation for achieving long-term goals?',
    translations: {
      te: {
        word: 'క్రమశిక్షణ',
        question: 'దీర్ఘకాలిక లక్ష్యాలను చేరుకోవడానికి ప్రేరణ కంటే క్రమశిక్షణ ముఖ్యమైనదేనా?',
        examples: [
          {
            en: 'Motivation comes and goes with mood, but disciplined habits keep working even on difficult days.',
            native:
              'ప్రేరణ మూడ్‌తో వస్తూ పోతూ ఉంటుంది, కానీ క్రమశిక్షణ అలవాట్లు కష్టమైన రోజుల్లో కూడా పనిచేస్తూ ఉంటాయి.',
          },
          {
            en: 'If discipline were valued more than talent, ordinary people would achieve extraordinary results much more often.',
            native:
              'ప్రతిభ కంటే క్రమశిక్షణకు ఎక్కువ విలువ ఇస్తే, సాధారణ ప్రజలు అసాధారణ ఫలితాలను మరింత తరచుగా సాధిస్తారు.',
          },
          {
            en: 'Strict routines can feel boring, although they free the mind from making endless small decisions.',
            native:
              'కఠినమైన దినచర్యలు విసుగుగా అనిపించవచ్చు, అయితే అవి అనంతమైన చిన్న నిర్ణయాలు తీసుకోవడం నుండి మనస్సును విముక్తం చేస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'अनुशासन',
        question: 'दीर्घकालिक लक्ष्यों को पाने के लिए क्या अनुशासन प्रेरणा से ज़्यादा महत्वपूर्ण है?',
        examples: [
          {
            en: 'Motivation comes and goes with mood, but disciplined habits keep working even on difficult days.',
            native: 'प्रेरणा मूड के साथ आती-जाती रहती है, लेकिन अनुशासित आदतें मुश्किल दिनों में भी काम करती रहती हैं।',
          },
          {
            en: 'If discipline were valued more than talent, ordinary people would achieve extraordinary results much more often.',
            native:
              'अगर प्रतिभा से ज़्यादा अनुशासन को महत्व दिया जाए, तो साधारण लोग कहीं ज़्यादा बार असाधारण परिणाम हासिल करेंगे।',
          },
          {
            en: 'Strict routines can feel boring, although they free the mind from making endless small decisions.',
            native: 'सख़्त दिनचर्या उबाऊ लग सकती है, हालाँकि वे अनगिनत छोटे फ़ैसलों से मन को मुक्त करती हैं।',
          },
        ],
      },
      es: {
        word: 'disciplina',
        question: '¿Es la disciplina más importante que la motivación para lograr metas a largo plazo?',
        examples: [
          {
            en: 'Motivation comes and goes with mood, but disciplined habits keep working even on difficult days.',
            native:
              'La motivación va y viene con el ánimo, pero los hábitos disciplinados siguen funcionando incluso en los días difíciles.',
          },
          {
            en: 'If discipline were valued more than talent, ordinary people would achieve extraordinary results much more often.',
            native:
              'Si se valorara más la disciplina que el talento, la gente corriente lograría resultados extraordinarios con mucha más frecuencia.',
          },
          {
            en: 'Strict routines can feel boring, although they free the mind from making endless small decisions.',
            native:
              'Las rutinas estrictas pueden parecer aburridas, aunque liberan la mente de tomar infinitas decisiones pequeñas.',
          },
        ],
      },
      zh: {
        word: '自律',
        question: '要实现长期目标，自律比动力更重要吗？',
        examples: [
          {
            en: 'Motivation comes and goes with mood, but disciplined habits keep working even on difficult days.',
            native: '动力随情绪时有时无，但自律的习惯即使在艰难的日子里也能持续发挥作用。',
          },
          {
            en: 'If discipline were valued more than talent, ordinary people would achieve extraordinary results much more often.',
            native: '如果自律比天赋更受重视，普通人会更频繁地取得非凡的成就。',
          },
          {
            en: 'Strict routines can feel boring, although they free the mind from making endless small decisions.',
            native: '严格的作息可能让人觉得乏味，尽管它们能让大脑免于做无数小决定。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'happiness',
    questionText: 'Can money buy happiness, or does happiness depend on things that cannot be bought?',
    translations: {
      te: {
        word: 'సంతోషం',
        question: 'డబ్బు సంతోషాన్ని కొనగలదా, లేక సంతోషం కొనలేని విషయాలపై ఆధారపడుతుందా?',
        examples: [
          {
            en: 'Money removes many worries, although happiness seems to depend more on relationships than income.',
            native: 'డబ్బు అనేక చింతలను తొలగిస్తుంది, అయితే సంతోషం ఆదాయం కంటే సంబంధాలపై ఎక్కువగా ఆధారపడుతుంది.',
          },
          {
            en: "If basic needs are already covered, extra wealth adds surprisingly little to most people's everyday satisfaction.",
            native:
              'ప్రాథమిక అవసరాలు ఇప్పటికే తీరితే, అదనపు సంపద చాలామంది ప్రజల రోజువారీ సంతృప్తికి ఆశ్చర్యకరంగా తక్కువ జోడిస్తుంది.',
          },
          {
            en: 'Happy nations are usually those where time, fairness and community are valued above consumption.',
            native: 'సంతోషకరమైన దేశాలు సాధారణంగా సమయం, న్యాయం మరియు సమాజాన్ని వినియోగం కంటే ఎక్కువగా విలువైస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'खुशी',
        question: 'क्या पैसा खुशी ख़रीद सकता है, या खुशी उन चीज़ों पर निर्भर करती है जिन्हें ख़रीदा नहीं जा सकता?',
        examples: [
          {
            en: 'Money removes many worries, although happiness seems to depend more on relationships than income.',
            native: 'पैसा कई चिंताएँ दूर करता है, हालाँकि खुशी आय से ज़्यादा रिश्तों पर निर्भर करती हुई लगती है।',
          },
          {
            en: "If basic needs are already covered, extra wealth adds surprisingly little to most people's everyday satisfaction.",
            native:
              'अगर बुनियादी ज़रूरतें पहले से पूरी हैं, तो अतिरिक्त दौलत ज़्यादातर लोगों की रोज़मर्रा की संतुष्टि में हैरान करने वाला कम इज़ाफ़ा करती है।',
          },
          {
            en: 'Happy nations are usually those where time, fairness and community are valued above consumption.',
            native: 'खुशहाल देश आमतौर पर वे होते हैं जहाँ समय, निष्पक्षता और समुदाय को उपभोग से ऊपर रखा जाता है।',
          },
        ],
      },
      es: {
        word: 'felicidad',
        question: '¿Puede el dinero comprar la felicidad, o la felicidad depende de cosas que no se pueden comprar?',
        examples: [
          {
            en: 'Money removes many worries, although happiness seems to depend more on relationships than income.',
            native:
              'El dinero elimina muchas preocupaciones, aunque la felicidad parece depender más de las relaciones que de los ingresos.',
          },
          {
            en: "If basic needs are already covered, extra wealth adds surprisingly little to most people's everyday satisfaction.",
            native:
              'Si las necesidades básicas ya están cubiertas, la riqueza extra añade sorprendentemente poco a la satisfacción diaria de la mayoría.',
          },
          {
            en: 'Happy nations are usually those where time, fairness and community are valued above consumption.',
            native:
              'Las naciones felices suelen ser aquellas donde el tiempo, la justicia y la comunidad se valoran por encima del consumo.',
          },
        ],
      },
      zh: {
        word: '幸福',
        question: '金钱能买到幸福吗，还是幸福取决于买不到的东西？',
        examples: [
          {
            en: 'Money removes many worries, although happiness seems to depend more on relationships than income.',
            native: '金钱能消除许多烦恼，尽管幸福似乎更多取决于人际关系而不是收入。',
          },
          {
            en: "If basic needs are already covered, extra wealth adds surprisingly little to most people's everyday satisfaction.",
            native: '如果基本需求已经得到满足，额外的财富对大多数人的日常满足感几乎没有增加。',
          },
          {
            en: 'Happy nations are usually those where time, fairness and community are valued above consumption.',
            native: '幸福的国家通常是那些把时间、公平和社区看得比消费更重要的国家。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'patience',
    questionText: 'Is patience still valuable in a world where everything happens instantly?',
    translations: {
      te: {
        word: 'సహనం',
        question: 'ప్రతిదీ తక్షణం జరిగే ప్రపంచంలో సహనం ఇంకా విలువైనదేనా?',
        examples: [
          {
            en: 'Patience is becoming rare because almost everything can now be delivered within a day.',
            native: 'ఇప్పుడు దాదాపు ప్రతిదీ ఒక రోజులోపు డెలివరీ చేయబడుతుంది కాబట్టి సహనం అరుదవుతోంది.',
          },
          {
            en: 'If people learned to wait calmly, fewer angry arguments would happen in shops and offices.',
            native:
              'ప్రజలు ప్రశాంతంగా వేచి ఉండటం నేర్చుకుంటే, దుకాణాల్లోను మరియు కార్యాలయాల్లోను తక్కువ కోప వాదనలు జరుగుతాయి.',
          },
          {
            en: 'Although speed is convenient, the best results in life are often produced slowly and carefully.',
            native:
              'వేగం అనుకూలంగా ఉన్నప్పటికీ, జీవితంలోని ఉత్తమ ఫలితాలు తరచుగా నెమ్మదిగా మరియు జాగ్రత్తగా ఉత్పత్తి అవుతాయి.',
          },
        ],
      },
      hi: {
        word: 'धैर्य',
        question: 'क्या उस दुनिया में जहाँ हर चीज़ तुरंत होती है, धैर्य अब भी मूल्यवान है?',
        examples: [
          {
            en: 'Patience is becoming rare because almost everything can now be delivered within a day.',
            native: 'धैर्य दुर्लभ होता जा रहा है क्योंकि अब लगभग हर चीज़ एक दिन के भीतर पहुँचाई जा सकती है।',
          },
          {
            en: 'If people learned to wait calmly, fewer angry arguments would happen in shops and offices.',
            native: 'अगर लोग शांति से इंतज़ार करना सीख लें, तो दुकानों और दफ़्तरों में कम गुस्सैल बहसें होंगी।',
          },
          {
            en: 'Although speed is convenient, the best results in life are often produced slowly and carefully.',
            native: 'हालाँकि रफ़्तार सुविधाजनक है, जीवन के बेहतरीन परिणाम अक्सर धीरे-धीरे और सावधानी से बनाए जाते हैं।',
          },
        ],
      },
      es: {
        word: 'paciencia',
        question: '¿Sigue siendo valiosa la paciencia en un mundo donde todo ocurre al instante?',
        examples: [
          {
            en: 'Patience is becoming rare because almost everything can now be delivered within a day.',
            native: 'La paciencia se está volviendo rara porque casi todo puede entregarse ahora en un día.',
          },
          {
            en: 'If people learned to wait calmly, fewer angry arguments would happen in shops and offices.',
            native:
              'Si la gente aprendiera a esperar con calma, habría menos discusiones airadas en tiendas y oficinas.',
          },
          {
            en: 'Although speed is convenient, the best results in life are often produced slowly and carefully.',
            native:
              'Aunque la rapidez es cómoda, los mejores resultados de la vida a menudo se producen lenta y cuidadosamente.',
          },
        ],
      },
      zh: {
        word: '耐心',
        question: '在一个一切都即时发生的世界里，耐心仍然宝贵吗？',
        examples: [
          {
            en: 'Patience is becoming rare because almost everything can now be delivered within a day.',
            native: '耐心正变得稀缺，因为几乎所有东西现在都能在一天之内送达。',
          },
          {
            en: 'If people learned to wait calmly, fewer angry arguments would happen in shops and offices.',
            native: '如果人们学会平静地等待，商店和办公室里愤怒的争吵就会减少。',
          },
          {
            en: 'Although speed is convenient, the best results in life are often produced slowly and carefully.',
            native: '尽管速度很方便，但人生中最好的成果往往是缓慢而细致地产生的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'honesty',
    questionText: 'Is honesty always the best policy, or are some situations better handled with small lies?',
    translations: {
      te: {
        word: 'నిజాయితీ',
        question: 'నిజాయితీ ఎల్లప్పుడూ ఉత్తమ విధానమేనా, లేక కొన్ని పరిస్థితులను చిన్న అబద్ధాలతో బాగా నిర్వహించవచ్చా?',
        examples: [
          {
            en: 'Honesty builds trust slowly over years, although a single lie can destroy it in seconds.',
            native:
              'నిజాయితీ సంవత్సరాలుగా నెమ్మదిగా నమ్మకాన్ని నిర్మిస్తుంది, అయితే ఒక్క అబద్ధం దాన్ని క్షణాల్లో నాశనం చేయగలదు.',
          },
          {
            en: 'If everyone were completely honest at work, some feelings would be hurt but decisions would improve.',
            native:
              'కార్యాలయంలో అందరూ పూర్తిగా నిజాయితీగా ఉంటే, కొన్ని భావనలు దెబ్బతింటాయి కానీ నిర్ణయాలు మెరుగవుతాయి.',
          },
          {
            en: 'Polite lies are sometimes told to protect others, yet they can still damage relationships later.',
            native:
              'ఇతరులను రక్షించడానికి మర్యాదపూర్వక అబద్ధాలు కొన్నిసార్లు చెబుతారు, అయితే అవి తర్వాత సంబంధాలను దెబ్బతీయగలవు.',
          },
        ],
      },
      hi: {
        word: 'ईमानदारी',
        question: 'क्या ईमानदारी हमेशा सबसे अच्छी नीति है, या कुछ स्थितियाँ छोटे झूठ से बेहतर संभलती हैं?',
        examples: [
          {
            en: 'Honesty builds trust slowly over years, although a single lie can destroy it in seconds.',
            native: 'ईमानदारी सालों में धीरे-धीरे भरोसा बनाती है, हालाँकि एक झूठ उसे कुछ पलों में नष्ट कर सकता है।',
          },
          {
            en: 'If everyone were completely honest at work, some feelings would be hurt but decisions would improve.',
            native: 'अगर काम पर सभी पूरी तरह ईमानदार हों, तो कुछ भावनाओं को ठेस पहुँचेगी लेकिन फ़ैसले बेहतर होंगे।',
          },
          {
            en: 'Polite lies are sometimes told to protect others, yet they can still damage relationships later.',
            native:
              'दूसरों की रक्षा के लिए कभी-कभी विनम्र झूठ बोले जाते हैं, फिर भी वे बाद में रिश्तों को नुकसान पहुँचा सकते हैं।',
          },
        ],
      },
      es: {
        word: 'honestidad',
        question:
          '¿Es la honestidad siempre la mejor política, o algunas situaciones se manejan mejor con pequeñas mentiras?',
        examples: [
          {
            en: 'Honesty builds trust slowly over years, although a single lie can destroy it in seconds.',
            native:
              'La honestidad construye confianza lentamente durante años, aunque una sola mentira puede destruirla en segundos.',
          },
          {
            en: 'If everyone were completely honest at work, some feelings would be hurt but decisions would improve.',
            native:
              'Si todos fueran completamente honestos en el trabajo, algunos sentimientos saldrían heridos pero las decisiones mejorarían.',
          },
          {
            en: 'Polite lies are sometimes told to protect others, yet they can still damage relationships later.',
            native:
              'A veces se dicen mentiras corteses para proteger a otros, pero aun así pueden dañar las relaciones más tarde.',
          },
        ],
      },
      zh: {
        word: '诚实',
        question: '诚实永远是上策吗，还是有些场合用善意的谎言处理更好？',
        examples: [
          {
            en: 'Honesty builds trust slowly over years, although a single lie can destroy it in seconds.',
            native: '诚实能在多年间慢慢建立信任，尽管一个谎言就能在几秒钟内毁掉它。',
          },
          {
            en: 'If everyone were completely honest at work, some feelings would be hurt but decisions would improve.',
            native: '如果每个人在工作中都完全诚实，一些感情会受到伤害，但决策会得到改善。',
          },
          {
            en: 'Polite lies are sometimes told to protect others, yet they can still damage relationships later.',
            native: '人们有时为了保护他人而说礼貌的谎言，但它们日后仍可能损害关系。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'loyalty',
    questionText: 'Is loyalty to a company or group still important, or should people always put themselves first?',
    translations: {
      te: {
        word: 'విశ్వాసం',
        question: 'కంపెనీ లేదా సమూహం పట్ల విశ్వాసం ఇంకా ముఖ్యమేనా, లేక ప్రజలు ఎల్లప్పుడూ తమను ముందు పెట్టుకోవాలా?',
        examples: [
          {
            en: 'Loyal employees are valued by good companies, although loyalty is rarely rewarded during hard times.',
            native:
              'మంచి కంపెనీలు విశ్వాసమైన ఉద్యోగులను విలువైస్తాయి, అయితే కష్టమైన సమయాల్లో విశ్వాసానికి అరుదుగా బహూమతి లభిస్తుంది.',
          },
          {
            en: 'If workers stayed loyal only to their own interests, teams would collapse whenever difficulties appeared.',
            native:
              'కార్మికులు తమ స్వార్థానికి మాత్రమే విశ్వాసంగా ఉంటే, ఇబ్బందులు వచ్చినప్పుడల్లా జట్టులు కుప్పకూలుతాయి.',
          },
          {
            en: 'Blind loyalty can be dangerous, but abandoning friends at the first problem is worse.',
            native:
              'గుడ్డి విశ్వాసం ప్రమాదకరం కావచ్చు, కానీ మొదటి సమస్య వచ్చినప్పుడే స్నేహితులను వదిలిపెట్టడం దాని కంటే చెత్తది.',
          },
        ],
      },
      hi: {
        word: 'वफ़ादारी',
        question:
          'क्या किसी कंपनी या समूह के प्रति वफ़ादारी अब भी महत्वपूर्ण है, या लोगों को हमेशा खुद को पहले रखना चाहिए?',
        examples: [
          {
            en: 'Loyal employees are valued by good companies, although loyalty is rarely rewarded during hard times.',
            native:
              'अच्छी कंपनियाँ वफ़ादार कर्मचारियों को महत्व देती हैं, हालाँकि मुश्किल समय में वफ़ादारी शायद ही सराही जाती है।',
          },
          {
            en: 'If workers stayed loyal only to their own interests, teams would collapse whenever difficulties appeared.',
            native: 'अगर कर्मचारी सिर्फ़ अपने हितों के प्रति वफ़ादार रहें, तो मुश्किलें आते ही टीमें ढह जाएँगी।',
          },
          {
            en: 'Blind loyalty can be dangerous, but abandoning friends at the first problem is worse.',
            native: 'अंधी वफ़ादारी ख़तरनाक हो सकती है, लेकिन पहली परेशानी पर दोस्तों को छोड़ देना उससे बदतर है।',
          },
        ],
      },
      es: {
        word: 'lealtad',
        question:
          '¿Sigue siendo importante la lealtad a una empresa o grupo, o debería la gente anteponerse siempre a sí misma?',
        examples: [
          {
            en: 'Loyal employees are valued by good companies, although loyalty is rarely rewarded during hard times.',
            native:
              'Las buenas empresas valoran a los empleados leales, aunque la lealtad rara vez se recompensa en tiempos difíciles.',
          },
          {
            en: 'If workers stayed loyal only to their own interests, teams would collapse whenever difficulties appeared.',
            native:
              'Si los trabajadores fueran leales solo a sus propios intereses, los equipos colapsarían cada vez que aparecieran dificultades.',
          },
          {
            en: 'Blind loyalty can be dangerous, but abandoning friends at the first problem is worse.',
            native: 'La lealtad ciega puede ser peligrosa, pero abandonar a los amigos al primer problema es peor.',
          },
        ],
      },
      zh: {
        word: '忠诚',
        question: '对公司或团体的忠诚仍然重要吗，还是人们应该始终把自己放在第一位？',
        examples: [
          {
            en: 'Loyal employees are valued by good companies, although loyalty is rarely rewarded during hard times.',
            native: '好公司重视忠诚的员工，尽管在困难时期忠诚很少得到回报。',
          },
          {
            en: 'If workers stayed loyal only to their own interests, teams would collapse whenever difficulties appeared.',
            native: '如果员工只忠于自己的利益，一旦遇到困难，团队就会瓦解。',
          },
          {
            en: 'Blind loyalty can be dangerous, but abandoning friends at the first problem is worse.',
            native: '盲目的忠诚可能很危险，但一遇问题就抛弃朋友则更糟。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'respect',
    questionText: 'Should respect be earned, or should it be given automatically to everyone?',
    translations: {
      te: {
        word: 'గౌరవం',
        question: 'గౌరవం సంపాదించుకోవాలా, లేక అందరికీ స్వయంచాలకంగా ఇవ్వాలా?',
        examples: [
          {
            en: 'Respect is often demanded by authority, although genuine respect can only be earned through behaviour.',
            native:
              'అధికారం గౌరవాన్ని తరచుగా డిమాండ్ చేస్తుంది, అయితే నిజమైన గౌరవం ప్రవర్తన ద్వారా మాత్రమే సంపాదించవచ్చు.',
          },
          {
            en: 'If basic respect were shown to every worker, many workplaces would become healthier overnight.',
            native: 'ప్రతి కార్మికుడికి ప్రాథమిక గౌరవం చూపబడితే, అనేక కార్యాలయాలు ఒక్కరాత్రిలోనే ఆరోగ్యకరంగా మారతాయి.',
          },
          {
            en: 'Younger generations are expected to respect age, but respect must flow in both directions.',
            native: 'యువతరం వయసును గౌరవించాలని భావిస్తారు, కానీ గౌరవం రెండు దిశల్లోనూ ప్రవహించాలి.',
          },
        ],
      },
      hi: {
        word: 'सम्मान',
        question: 'क्या सम्मान कमाया जाना चाहिए, या यह सबको स्वतः मिलना चाहिए?',
        examples: [
          {
            en: 'Respect is often demanded by authority, although genuine respect can only be earned through behaviour.',
            native: 'अधिकार से सम्मान अक्सर माँगा जाता है, हालाँकि सच्चा सम्मान केवल व्यवहार से कमाया जा सकता है।',
          },
          {
            en: 'If basic respect were shown to every worker, many workplaces would become healthier overnight.',
            native: 'अगर हर कर्मचारी को बुनियादी सम्मान दिया जाए, तो कई कार्यस्थल रातों-रात बेहतर हो जाएँगे।',
          },
          {
            en: 'Younger generations are expected to respect age, but respect must flow in both directions.',
            native: 'युवा पीढ़ी से उम्र का सम्मान करने की उम्मीद की जाती है, लेकिन सम्मान दोनों दिशाओं में बहना चाहिए।',
          },
        ],
      },
      es: {
        word: 'respeto',
        question: '¿Debe ganarse el respeto, o debería darse automáticamente a todo el mundo?',
        examples: [
          {
            en: 'Respect is often demanded by authority, although genuine respect can only be earned through behaviour.',
            native:
              'A menudo la autoridad exige respeto, aunque el respeto genuino solo puede ganarse con el comportamiento.',
          },
          {
            en: 'If basic respect were shown to every worker, many workplaces would become healthier overnight.',
            native:
              'Si se mostrara un respeto básico a cada trabajador, muchos lugares de trabajo mejorarían de la noche a la mañana.',
          },
          {
            en: 'Younger generations are expected to respect age, but respect must flow in both directions.',
            native:
              'Se espera que las generaciones jóvenes respeten la edad, pero el respeto debe fluir en ambas direcciones.',
          },
        ],
      },
      zh: {
        word: '尊重',
        question: '尊重应该靠赢得，还是应该自动给予每一个人？',
        examples: [
          {
            en: 'Respect is often demanded by authority, although genuine respect can only be earned through behaviour.',
            native: '权威常常要求被尊重，尽管真正的尊重只能通过行为赢得。',
          },
          {
            en: 'If basic respect were shown to every worker, many workplaces would become healthier overnight.',
            native: '如果每位员工都能得到基本的尊重，许多工作场所会在一夜之间变得更健康。',
          },
          {
            en: 'Younger generations are expected to respect age, but respect must flow in both directions.',
            native: '人们期望年轻一代尊敬长者，但尊重必须双向流动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'cooperation',
    questionText: 'Why do countries and companies find cooperation difficult, even when everyone would benefit?',
    translations: {
      te: {
        word: 'సహకారం',
        question: 'అందరికీ ప్రయోజనం చేకూరినప్పటికీ దేశాలు మరియు కంపెనీలు సహకారాన్ని ఎందుకు కష్టంగా భావిస్తాయి?',
        examples: [
          {
            en: 'Cooperation fails when short-term advantage is chosen over benefits that everyone would share later.',
            native: 'తర్వాత అందరూ పంచుకునే ప్రయోజనాల కంటే స్వల్పకాలిక లాభాన్ని ఎంచుకున్నప్పుడు సహకారం విఫలమవుతుంది.',
          },
          {
            en: 'If global problems were faced together, solutions would be found faster and cost much less.',
            native: 'ప్రపంచ సమస్యలను కలిసి ఎదుర్కుంటే, పరిష్కారాలు వేగంగా దొరుకుతాయి మరియు చాలా తక్కువ ఖర్చవుతాయి.',
          },
          {
            en: 'Trust is built slowly between partners, although a single broken promise can undo years of work.',
            native:
              'భాగస్వాముల మధ్య నమ్మకం నెమ్మదిగా నిర్మించబడుతుంది, అయితే ఒక్క విరమించుకున్న వాగ్దానం సంవత్సరాల పనిని తుడిచిపెట్టగలదు.',
          },
        ],
      },
      hi: {
        word: 'सहयोग',
        question: 'देश और कंपनियाँ सहयोग को कठिन क्यों मानती हैं, भले ही सभी को फ़ायदा हो?',
        examples: [
          {
            en: 'Cooperation fails when short-term advantage is chosen over benefits that everyone would share later.',
            native: 'जब बाद में सबको मिलने वाले लाभ के बजाय अल्पकालिक फ़ायदा चुना जाता है, तो सहयोग विफल होता है।',
          },
          {
            en: 'If global problems were faced together, solutions would be found faster and cost much less.',
            native: 'अगर वैश्विक समस्याओं का मिलकर सामना किया जाए, तो समाधान जल्दी मिलेंगे और काफ़ी कम ख़र्च होंगे।',
          },
          {
            en: 'Trust is built slowly between partners, although a single broken promise can undo years of work.',
            native: 'भागीदारों के बीच भरोसा धीरे-धीरे बनता है, हालाँकि एक टूटा वादा सालों की मेहनत बरबाद कर सकता है।',
          },
        ],
      },
      es: {
        word: 'cooperación',
        question:
          '¿Por qué los países y las empresas encuentran difícil la cooperación, incluso cuando todos se beneficiarían?',
        examples: [
          {
            en: 'Cooperation fails when short-term advantage is chosen over benefits that everyone would share later.',
            native:
              'La cooperación fracasa cuando se elige la ventaja a corto plazo por encima de los beneficios que todos compartirían después.',
          },
          {
            en: 'If global problems were faced together, solutions would be found faster and cost much less.',
            native:
              'Si los problemas globales se afrontaran juntos, las soluciones se encontrarían más rápido y costarían mucho menos.',
          },
          {
            en: 'Trust is built slowly between partners, although a single broken promise can undo years of work.',
            native:
              'La confianza entre socios se construye lentamente, aunque una sola promesa rota puede arruinar años de trabajo.',
          },
        ],
      },
      zh: {
        word: '合作',
        question: '为什么国家和公司之间合作如此困难，即使合作对所有人都有利？',
        examples: [
          {
            en: 'Cooperation fails when short-term advantage is chosen over benefits that everyone would share later.',
            native: '当人们选择短期利益而放弃日后大家共享的好处时，合作就会失败。',
          },
          {
            en: 'If global problems were faced together, solutions would be found faster and cost much less.',
            native: '如果全球性问题能被共同面对，解决方案会更快找到，成本也会低得多。',
          },
          {
            en: 'Trust is built slowly between partners, although a single broken promise can undo years of work.',
            native: '伙伴之间的信任建立得很慢，尽管一个破碎的承诺就能毁掉多年的努力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'city life',
    questionText: 'Is city life better than life in the countryside? What do people gain and lose in cities?',
    translations: {
      te: {
        word: 'నగర జీవితం',
        question: 'నగర జీవితం గ్రామీణ జీవితం కంటే మంచిదేనా? నగరాల్లో ప్రజలు ఏమి పొందుతారు మరియు ఏమి కోల్పోతారు?',
        examples: [
          {
            en: 'Cities offer jobs and excitement, although many residents feel lonely in the middle of crowds.',
            native:
              'నగరాలు ఉద్యోగాలు మరియు ఉత్సాహాన్ని అందిస్తాయి, అయితే చాలామంది నివాసితులు జనసమూహం మధ్యలో ఒంటరిగా భావిస్తారు.',
          },
          {
            en: 'If smaller towns had better services, fewer families would be forced to move to crowded cities.',
            native:
              'చిన్న పట్టణాల్లో మెరుగైన సౌకర్యాలు ఉంటే, తక్కువ మంది కుటుంబాలు రద్దీగా ఉండే నగరాలకు మారవలసిన అవసరం ఉండదు.',
          },
          {
            en: 'Green spaces are valued more when they are scarce, which explains the popularity of urban parks.',
            native:
              'పచ్చదనం కరువైనప్పుడు దానికి ఎక్కువ విలువ ఇస్తారు, దీనివల్లే పట్టణ పార్కుల ప్రజాదరణ వివరించబడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'शहरी जीवन',
        question: 'क्या शहरी जीवन गाँव के जीवन से बेहतर है? शहरों में लोग क्या पाते हैं और क्या खोते हैं?',
        examples: [
          {
            en: 'Cities offer jobs and excitement, although many residents feel lonely in the middle of crowds.',
            native: 'शहर नौकरियाँ और रोमांच देते हैं, हालाँकि कई निवासी भीड़ के बीच भी अकेला महसूस करते हैं।',
          },
          {
            en: 'If smaller towns had better services, fewer families would be forced to move to crowded cities.',
            native:
              'अगर छोटे कस्बों में बेहतर सुविधाएँ हों, तो कम परिवारों को भीड़भाड़ वाले शहरों में जाने के लिए मजबूर होना पड़ेगा।',
          },
          {
            en: 'Green spaces are valued more when they are scarce, which explains the popularity of urban parks.',
            native:
              'हरी-भरी जगहें दुर्लभ होने पर ज़्यादा महत्वपूर्ण लगती हैं, जो शहरी पार्कों की लोकप्रियता समझाता है।',
          },
        ],
      },
      es: {
        word: 'vida urbana',
        question:
          '¿Es la vida urbana mejor que la vida en el campo? ¿Qué ganan y pierden las personas en las ciudades?',
        examples: [
          {
            en: 'Cities offer jobs and excitement, although many residents feel lonely in the middle of crowds.',
            native:
              'Las ciudades ofrecen trabajo y emoción, aunque muchos residentes se sienten solos en medio de las multitudes.',
          },
          {
            en: 'If smaller towns had better services, fewer families would be forced to move to crowded cities.',
            native:
              'Si los pueblos pequeños tuvieran mejores servicios, menos familias se verían obligadas a mudarse a ciudades abarrotadas.',
          },
          {
            en: 'Green spaces are valued more when they are scarce, which explains the popularity of urban parks.',
            native:
              'Los espacios verdes se valoran más cuando escasean, lo que explica la popularidad de los parques urbanos.',
          },
        ],
      },
      zh: {
        word: '城市生活',
        question: '城市生活比乡村生活更好吗？人们在城市中得到了什么，又失去了什么？',
        examples: [
          {
            en: 'Cities offer jobs and excitement, although many residents feel lonely in the middle of crowds.',
            native: '城市提供工作和刺激，尽管许多居民在人群中仍感到孤独。',
          },
          {
            en: 'If smaller towns had better services, fewer families would be forced to move to crowded cities.',
            native: '如果小城镇有更好的服务，被迫搬往拥挤城市的家庭就会减少。',
          },
          {
            en: 'Green spaces are valued more when they are scarce, which explains the popularity of urban parks.',
            native: '绿地稀缺时更受珍视，这就解释了城市公园为何受欢迎。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'rural life',
    questionText: 'Why are young people leaving villages, and what could make rural life attractive again?',
    translations: {
      te: {
        word: 'గ్రామీణ జీవితం',
        question:
          'యువకులు గ్రామాలను ఎందుకు వదిలివెళ్తున్నారు, మరియు గ్రామీణ జీవితాన్ని మళ్లీ ఆకర్షణీయంగా చేయడానికి ఏమి చేయవచ్చు?',
        examples: [
          {
            en: 'Villages are abandoned when schools and hospitals close, although the land itself remains beautiful.',
            native:
              'పాఠశాలలు మరియు ఆసుపత్రులు మూతపడినప్పుడు గ్రామాలు విడిచిపెట్టబడతాయి, అయితే భూమి స్వయంగా అందమైనదిగానే ఉంటుంది.',
          },
          {
            en: 'If reliable internet reached every village, many jobs could be done far from any city.',
            native: 'నమ్మకమైన ఇంటర్నెట్ ప్రతి గ్రామానికి చేరితే, అనేక ఉద్యోగాలు ఏదైనా నగరానికి చాలా దూరంగా చేయవచ్చు.',
          },
          {
            en: 'Rural life offers peace and community, but opportunities are often limited to farming and tourism.',
            native:
              'గ్రామీణ జీవితం ప్రశాంతతను మరియు సమాజాన్ని అందిస్తుంది, కానీ అవకాశాలు తరచుగా వ్యవసాయం మరియు పర్యాటకానికే పరిమితం.',
          },
        ],
      },
      hi: {
        word: 'ग्रामीण जीवन',
        question: 'युवा गाँव क्यों छोड़ रहे हैं, और ग्रामीण जीवन को फिर से आकर्षक क्या बना सकता है?',
        examples: [
          {
            en: 'Villages are abandoned when schools and hospitals close, although the land itself remains beautiful.',
            native:
              'जब स्कूल और अस्पताल बंद हो जाते हैं तो गाँव खाली हो जाते हैं, हालाँकि ज़मीन खुद वैसी ही खूबसूरत रहती है।',
          },
          {
            en: 'If reliable internet reached every village, many jobs could be done far from any city.',
            native: 'अगर भरोसेमंद इंटरनेट हर गाँव तक पहुँचे, तो कई काम किसी भी शहर से दूर किए जा सकते हैं।',
          },
          {
            en: 'Rural life offers peace and community, but opportunities are often limited to farming and tourism.',
            native: 'ग्रामीण जीवन शांति और अपनापन देता है, लेकिन अवसर अक्सर खेती और पर्यटन तक ही सीमित रहते हैं।',
          },
        ],
      },
      es: {
        word: 'vida rural',
        question: '¿Por qué los jóvenes abandonan los pueblos, y qué podría hacer atractiva de nuevo la vida rural?',
        examples: [
          {
            en: 'Villages are abandoned when schools and hospitals close, although the land itself remains beautiful.',
            native:
              'Los pueblos se abandonan cuando cierran las escuelas y los hospitales, aunque la tierra en sí sigue siendo hermosa.',
          },
          {
            en: 'If reliable internet reached every village, many jobs could be done far from any city.',
            native:
              'Si internet fiable llegara a cada pueblo, muchos trabajos podrían hacerse lejos de cualquier ciudad.',
          },
          {
            en: 'Rural life offers peace and community, but opportunities are often limited to farming and tourism.',
            native:
              'La vida rural ofrece paz y comunidad, pero las oportunidades suelen limitarse a la agricultura y el turismo.',
          },
        ],
      },
      zh: {
        word: '乡村生活',
        question: '为什么年轻人正在离开村庄？怎样才能让乡村生活重新变得有吸引力？',
        examples: [
          {
            en: 'Villages are abandoned when schools and hospitals close, although the land itself remains beautiful.',
            native: '当学校和医院关闭时，村庄就被遗弃了，尽管土地本身依然美丽。',
          },
          {
            en: 'If reliable internet reached every village, many jobs could be done far from any city.',
            native: '如果可靠的网络覆盖每个村庄，许多工作可以在远离任何城市的地方完成。',
          },
          {
            en: 'Rural life offers peace and community, but opportunities are often limited to farming and tourism.',
            native: '乡村生活提供宁静和社区感，但机会往往仅限于农业和旅游业。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'aging',
    questionText: 'How should societies care for aging populations, and what can we learn from older people?',
    translations: {
      te: {
        word: 'వృద్ధాప్యం',
        question: 'వృద్ధాప్య జనాభాను సమాజాలు ఎలా చూసుకోవాలి, మరియు వృద్ధుల నుండి మనం ఏమి నేర్చుకోవచ్చు?',
        examples: [
          {
            en: 'Older people carry experience that cannot be taught in schools, although it is often ignored.',
            native: 'వృద్ధులు పాఠశాలల్లో నేర్పలేని అనుభవాన్ని మోస్తారు, అయితే అది తరచుగా పట్టించుకోబడదు.',
          },
          {
            en: 'If pensions are not protected, millions of elderly citizens will be pushed into poverty.',
            native: 'పెన్షన్లు రక్షించబడకపోతే, లక్షలాది మంది వృద్ధ పౌరులు పేదరికంలోకి నెట్టబడతారు.',
          },
          {
            en: 'Care homes are expensive, yet many families live too far apart to help their parents daily.',
            native:
              'సంరక్షణ గృహాలు ఖరీదైనవి, అయితే చాలామంది కుటుంబాలు తమ తల్లిదండ్రులకు రోజూ సహాయం చేయలేనంత దూరంగా ఉంటారు.',
          },
        ],
      },
      hi: {
        word: 'बुढ़ापा',
        question: 'समाजों को बुज़ुर्ग आबादी की देखभाल कैसे करनी चाहिए, और हम बुज़ुर्गों से क्या सीख सकते हैं?',
        examples: [
          {
            en: 'Older people carry experience that cannot be taught in schools, although it is often ignored.',
            native:
              'बुज़ुर्ग वह अनुभव लिए होते हैं जो स्कूलों में नहीं सिखाया जा सकता, हालाँकि अक्सर उसे नज़रअंदाज़ किया जाता है।',
          },
          {
            en: 'If pensions are not protected, millions of elderly citizens will be pushed into poverty.',
            native: 'अगर पेंशन सुरक्षित न रही, तो लाखों बुज़ुर्ग नागरिक ग़रीबी में धकेले जाएँगे।',
          },
          {
            en: 'Care homes are expensive, yet many families live too far apart to help their parents daily.',
            native: 'केयर होम महँगे हैं, फिर भी कई परिवार अपने माता-पिता की रोज़ मदद के लिए बहुत दूर रहते हैं।',
          },
        ],
      },
      es: {
        word: 'envejecimiento',
        question:
          '¿Cómo deberían las sociedades cuidar a las poblaciones que envejecen, y qué podemos aprender de las personas mayores?',
        examples: [
          {
            en: 'Older people carry experience that cannot be taught in schools, although it is often ignored.',
            native:
              'Las personas mayores cargan una experiencia que no se puede enseñar en las escuelas, aunque a menudo se ignora.',
          },
          {
            en: 'If pensions are not protected, millions of elderly citizens will be pushed into poverty.',
            native: 'Si no se protegen las pensiones, millones de ciudadanos mayores serán empujados a la pobreza.',
          },
          {
            en: 'Care homes are expensive, yet many families live too far apart to help their parents daily.',
            native:
              'Las residencias son caras, pero muchas familias viven demasiado lejos para ayudar a sus padres a diario.',
          },
        ],
      },
      zh: {
        word: '老龄化',
        question: '社会应该如何照顾老龄化人口？我们能从老年人身上学到什么？',
        examples: [
          {
            en: 'Older people carry experience that cannot be taught in schools, although it is often ignored.',
            native: '老年人拥有学校无法传授的经验，尽管这些经验常常被忽视。',
          },
          {
            en: 'If pensions are not protected, millions of elderly citizens will be pushed into poverty.',
            native: '如果养老金得不到保障，数百万老年公民将陷入贫困。',
          },
          {
            en: 'Care homes are expensive, yet many families live too far apart to help their parents daily.',
            native: '养老院费用高昂，然而许多家庭住得太远，无法每天帮助父母。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'retirement',
    questionText: 'Is a fixed retirement age fair, or should people decide for themselves when to stop working?',
    translations: {
      te: {
        word: 'పదవీ విరమణ',
        question: 'స్థిర పదవీ విరమణ వయసు న్యాయమైనదేనా, లేక ఎప్పుడు పని ఆపాలో ప్రజలే నిర్ణయించుకోవాలా?',
        examples: [
          {
            en: 'Retirement is welcomed by tired workers, although some people feel useless without their daily routine.',
            native:
              'అలసిపోయిన కార్మికులు పదవీ విరమణను స్వాగతిస్తారు, అయితే కొందరు రోజువారీ దినచర్య లేకుండా నిష్ప్రయోజకంగా భావిస్తారు.',
          },
          {
            en: 'If the retirement age rises further, younger generations may struggle to find good positions.',
            native: 'పదవీ విరమణ వయసు మరింత పెరిగితే, యువతరాలు మంచి ఉద్యోగాలు కనుగొనడానికి ఇబ్బంది పడవచ్చు.',
          },
          {
            en: 'Experience is lost when experts retire early, but forcing everyone to stay is unfair.',
            native: 'నిపుణులు ముందే పదవీ విరమణ చేసినప్పుడు అనుభవం కోల్పోతుంది, కానీ అందరినీ బలవంతంగా ఉంచడం అన్యాయం.',
          },
        ],
      },
      hi: {
        word: 'सेवानिवृत्ति',
        question: 'क्या निश्चित सेवानिवृत्ति आयु उचित है, या लोगों को खुद तय करना चाहिए कि काम कब छोड़ना है?',
        examples: [
          {
            en: 'Retirement is welcomed by tired workers, although some people feel useless without their daily routine.',
            native:
              'थके कर्मचारी सेवानिवृत्ति का स्वागत करते हैं, हालाँकि कुछ लोग अपनी दिनचर्या के बिना बेकार महसूस करते हैं।',
          },
          {
            en: 'If the retirement age rises further, younger generations may struggle to find good positions.',
            native: 'अगर सेवानिवृत्ति की उम्र और बढ़ती है, तो युवा पीढ़ी अच्छे पद खोजने के लिए संघर्ष कर सकती है।',
          },
          {
            en: 'Experience is lost when experts retire early, but forcing everyone to stay is unfair.',
            native:
              'जब विशेषज्ञ जल्दी सेवानिवृत्त होते हैं तो अनुभव खोता है, लेकिन सबको बने रहने के लिए मजबूर करना अनुचित है।',
          },
        ],
      },
      es: {
        word: 'jubilación',
        question: '¿Es justa una edad de jubilación fija, o debería cada persona decidir cuándo dejar de trabajar?',
        examples: [
          {
            en: 'Retirement is welcomed by tired workers, although some people feel useless without their daily routine.',
            native:
              'Los trabajadores cansados reciben la jubilación con gusto, aunque algunas personas se sienten inútiles sin su rutina diaria.',
          },
          {
            en: 'If the retirement age rises further, younger generations may struggle to find good positions.',
            native:
              'Si la edad de jubilación sube más, las generaciones jóvenes pueden tener dificultades para encontrar buenos puestos.',
          },
          {
            en: 'Experience is lost when experts retire early, but forcing everyone to stay is unfair.',
            native:
              'La experiencia se pierde cuando los expertos se jubilan pronto, pero obligar a todos a quedarse es injusto.',
          },
        ],
      },
      zh: {
        word: '退休',
        question: '固定的退休年龄公平吗，还是应该让人们自己决定何时停止工作？',
        examples: [
          {
            en: 'Retirement is welcomed by tired workers, although some people feel useless without their daily routine.',
            native: '疲惫的劳动者欢迎退休，尽管有些人离开日常作息后会觉得自己一无是处。',
          },
          {
            en: 'If the retirement age rises further, younger generations may struggle to find good positions.',
            native: '如果退休年龄进一步提高，年轻一代可能难以找到好职位。',
          },
          {
            en: 'Experience is lost when experts retire early, but forcing everyone to stay is unfair.',
            native: '专家过早退休会让经验流失，但强迫所有人继续工作也不公平。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'unemployment',
    questionText: 'What causes unemployment, and whose responsibility is it to solve the problem?',
    translations: {
      te: {
        word: 'నిరుద్యోగం',
        question: 'నిరుద్యోగానికి కారణం ఏమిటి, మరియు ఈ సమస్యను పరిష్కరించడం ఎవరి బాధ్యత?',
        examples: [
          {
            en: 'Unemployment damages confidence as well as income, although society often blames the victims instead.',
            native:
              'నిరుద్యోగం ఆదాయంతో పాటు ఆత్మవిశ్వాసాన్ని కూడా దెబ్బతీస్తుంది, అయితే సమాజం తరచుగా బాధితులనే నిందిస్తుంది.',
          },
          {
            en: 'If industries disappear from a region, entire towns can be left without any purpose.',
            native: 'ఒక ప్రాంతం నుండి పరిశ్రమలు అదృశ్యమైతే, మొత్తం పట్టణాలు ఎలాంటి లక్ష్యం లేకుండా మిగిలిపోతాయి.',
          },
          {
            en: 'Retraining programmes are always promised after every crisis, but the results are rarely measured properly.',
            native:
              'ప్రతి సంక్షోభం తర్వాత పునశ్శిక్షణ కార్యక్రమాలు ఎల్లప్పుడూ ప్రామిస్ చేయబడతాయి, కానీ ఫలితాలు అరుదుగా సరిగ్గా కొలవబడతాయి.',
          },
        ],
      },
      hi: {
        word: 'बेरोज़गारी',
        question: 'बेरोज़गारी के कारण क्या हैं, और इस समस्या को हल करना किसकी ज़िम्मेदारी है?',
        examples: [
          {
            en: 'Unemployment damages confidence as well as income, although society often blames the victims instead.',
            native:
              'बेरोज़गारी आय के साथ-साथ आत्मविश्वास को भी नुकसान पहुँचाती है, हालाँकि समाज अक्सर पीड़ितों को ही दोष देता है।',
          },
          {
            en: 'If industries disappear from a region, entire towns can be left without any purpose.',
            native: 'अगर किसी क्षेत्र से उद्योग गायब हो जाएँ, तो पूरे कस्बे बिना किसी उद्देश्य के रह सकते हैं।',
          },
          {
            en: 'Retraining programmes are always promised after every crisis, but the results are rarely measured properly.',
            native:
              'हर संकट के बाद पुनः प्रशिक्षण कार्यक्रमों का वादा किया जाता है, लेकिन परिणाम शायद ही ठीक से मापे जाते हैं।',
          },
        ],
      },
      es: {
        word: 'desempleo',
        question: '¿Qué causa el desempleo, y de quién es la responsabilidad de resolver el problema?',
        examples: [
          {
            en: 'Unemployment damages confidence as well as income, although society often blames the victims instead.',
            native:
              'El desempleo daña la confianza además de los ingresos, aunque la sociedad suele culpar a las víctimas.',
          },
          {
            en: 'If industries disappear from a region, entire towns can be left without any purpose.',
            native:
              'Si las industrias desaparecen de una región, pueblos enteros pueden quedarse sin ningún propósito.',
          },
          {
            en: 'Retraining programmes are always promised after every crisis, but the results are rarely measured properly.',
            native:
              'Siempre se prometen programas de reconversión tras cada crisis, pero los resultados rara vez se miden correctamente.',
          },
        ],
      },
      zh: {
        word: '失业',
        question: '失业的原因是什么？解决这个问题是谁的责任？',
        examples: [
          {
            en: 'Unemployment damages confidence as well as income, although society often blames the victims instead.',
            native: '失业损害的不仅是收入，还有信心，尽管社会往往反而责怪受害者。',
          },
          {
            en: 'If industries disappear from a region, entire towns can be left without any purpose.',
            native: '如果一个地区的产业消失，整个城镇可能失去存在的意义。',
          },
          {
            en: 'Retraining programmes are always promised after every crisis, but the results are rarely measured properly.',
            native: '每次危机之后总会承诺再培训计划，但效果很少得到妥善衡量。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'entrepreneurship',
    questionText: 'Should more young people start their own businesses instead of working for established companies?',
    translations: {
      te: {
        word: 'వ్యవస్థాపకత',
        question: 'స్థాపిత కంపెనీల కోసం పనిచేయడం బదులు మరిన్ని మంది యువకులు తమ స్వంత వ్యాపారాలు ప్రారంభించాలా?',
        examples: [
          {
            en: 'Starting a business offers freedom, although most new companies fail within their first five years.',
            native:
              'వ్యాపారం ప్రారంభించడం స్వేచ్ఛను అందిస్తుంది, అయితే చాలామంది కొత్త కంపెనీలు తమ మొదటి ఐదు సంవత్సరాల్లోనే విఫలమవుతాయి.',
          },
          {
            en: 'If entrepreneurship were taught in a practical way at school, far fewer graduates would fear self-employment.',
            native:
              'పాఠశాలలో వ్యవస్థాపకతను ఆచరణాత్మకంగా బోధిస్తే, చాలా తక్కువ మంది గ్రాడ్యుయేట్లు స్వయం ఉపాధికి భయపడతారు.',
          },
          {
            en: 'Stable salaries are sacrificed by founders, but the lessons of failure often lead somewhere better.',
            native:
              'స్థిరమైన జీతాలు వ్యవస్థాపకులు త్యాగం చేస్తారు, కానీ వైఫల్య పాఠాలు తరచుగా ఎక్కడో మంచి చోటుకు దారితీస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'उद्यमिता',
        question: 'क्या ज़्यादा युवाओं को स्थापित कंपनियों के लिए काम करने के बजाय अपना कारोबार शुरू करना चाहिए?',
        examples: [
          {
            en: 'Starting a business offers freedom, although most new companies fail within their first five years.',
            native:
              'कारोबार शुरू करने से आज़ादी मिलती है, हालाँकि ज़्यादातर नई कंपनियाँ अपने पहले पाँच सालों में ही असफल हो जाती हैं।',
          },
          {
            en: 'If entrepreneurship were taught in a practical way at school, far fewer graduates would fear self-employment.',
            native: 'अगर स्कूल में उद्यमिता व्यावहारिक तरीके से पढ़ाई जाए, तो काफ़ी कम स्नातक स्व-रोज़गार से डरेंगे।',
          },
          {
            en: 'Stable salaries are sacrificed by founders, but the lessons of failure often lead somewhere better.',
            native: 'संस्थापक स्थिर वेतन का त्याग करते हैं, लेकिन असफलता के सबक अक्सर कहीं बेहतर की ओर ले जाते हैं।',
          },
        ],
      },
      es: {
        word: 'emprendimiento',
        question: '¿Deberían más jóvenes crear sus propias empresas en lugar de trabajar para compañías establecidas?',
        examples: [
          {
            en: 'Starting a business offers freedom, although most new companies fail within their first five years.',
            native:
              'Crear una empresa ofrece libertad, aunque la mayoría de las compañías nuevas fracasan en sus primeros cinco años.',
          },
          {
            en: 'If entrepreneurship were taught in a practical way at school, far fewer graduates would fear self-employment.',
            native:
              'Si el emprendimiento se enseñara de forma práctica en la escuela, muchos menos graduados temerían el trabajo autónomo.',
          },
          {
            en: 'Stable salaries are sacrificed by founders, but the lessons of failure often lead somewhere better.',
            native:
              'Los fundadores sacrifican salarios estables, pero las lecciones del fracaso a menudo conducen a algo mejor.',
          },
        ],
      },
      zh: {
        word: '创业',
        question: '更多年轻人应该自己创业，而不是为成熟的公司工作吗？',
        examples: [
          {
            en: 'Starting a business offers freedom, although most new companies fail within their first five years.',
            native: '创业带来自由，尽管大多数新公司在头五年内就会失败。',
          },
          {
            en: 'If entrepreneurship were taught in a practical way at school, far fewer graduates would fear self-employment.',
            native: '如果学校以实践方式教授创业知识，害怕自雇的毕业生会少得多。',
          },
          {
            en: 'Stable salaries are sacrificed by founders, but the lessons of failure often lead somewhere better.',
            native: '创业者牺牲了稳定的薪水，但失败的教训往往会通向更好的地方。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'climate change',
    questionText: 'Is climate change the biggest threat we face, and can individual actions make a difference?',
    translations: {
      te: {
        word: 'వాతావరణ మార్పు',
        question: 'వాతావరణ మార్పు మనం ఎదుర్కొంటున్న అతిపెద్ద ముప్పా, మరియు వ్యక్తిగత చర్యలు మార్పు తీయగలవా?',
        examples: [
          {
            en: 'Climate change is caused mostly by large industries, although individual choices still send signals.',
            native:
              'వాతావరణ మార్పు ఎక్కువగా పెద్ద పరిశ్రమల వల్లే జరుగుతుంది, అయితే వ్యక్తిగత ఎంపికలు ఇంకా సంకేతాలు పంపుతాయి.',
          },
          {
            en: 'If governments acted together now, the worst effects could still be avoided this century.',
            native: 'ప్రభుత్వాలు ఇప్పుడే కలిసి చర్య తీసుకుంటే, ఈ శతాబ్దంలో అత్యంత చెత్త ప్రభావాలను ఇంకా నివారించవచ్చు.',
          },
          {
            en: 'Extreme weather is reported every week, yet many people behave as if nothing has changed.',
            native: 'తీవ్ర వాతావరణం ప్రతి వారం నివేదించబడుతుంది, అయితే చాలామంది ఏమీ మారలేదన్నట్లు ప్రవర్తిస్తున్నారు.',
          },
        ],
      },
      hi: {
        word: 'जलवायु परिवर्तन',
        question: 'क्या जलवायु परिवर्तन हमारे सामने सबसे बड़ा ख़तरा है, और क्या व्यक्तिगत कार्य फ़र्क़ डाल सकते हैं?',
        examples: [
          {
            en: 'Climate change is caused mostly by large industries, although individual choices still send signals.',
            native: 'जलवायु परिवर्तन ज़्यादातर बड़े उद्योगों से होता है, हालाँकि व्यक्तिगत चुनाव भी संकेत भेजते हैं।',
          },
          {
            en: 'If governments acted together now, the worst effects could still be avoided this century.',
            native: 'अगर सरकारें अभी मिलकर कार्रवाई करें, तो इस सदी में सबसे बुरे प्रभावों को अब भी टाला जा सकता है।',
          },
          {
            en: 'Extreme weather is reported every week, yet many people behave as if nothing has changed.',
            native: 'हर हफ़्ते चरम मौसम की ख़बरें आती हैं, फिर भी कई लोग ऐसे व्यवहार करते हैं मानो कुछ बदला ही नहीं।',
          },
        ],
      },
      es: {
        word: 'cambio climático',
        question:
          '¿Es el cambio climático la mayor amenaza que enfrentamos, y pueden las acciones individuales marcar la diferencia?',
        examples: [
          {
            en: 'Climate change is caused mostly by large industries, although individual choices still send signals.',
            native:
              'El cambio climático es causado mayormente por las grandes industrias, aunque las decisiones individuales aún envían señales.',
          },
          {
            en: 'If governments acted together now, the worst effects could still be avoided this century.',
            native: 'Si los gobiernos actuaran juntos ahora, los peores efectos aún podrían evitarse este siglo.',
          },
          {
            en: 'Extreme weather is reported every week, yet many people behave as if nothing has changed.',
            native:
              'Se informa de fenómenos meteorológicos extremos cada semana, y sin embargo mucha gente actúa como si nada hubiera cambiado.',
          },
        ],
      },
      zh: {
        word: '气候变化',
        question: '气候变化是我们面临的最大威胁吗？个人行动能产生影响吗？',
        examples: [
          {
            en: 'Climate change is caused mostly by large industries, although individual choices still send signals.',
            native: '气候变化主要由大型工业造成，尽管个人选择仍然会发出信号。',
          },
          {
            en: 'If governments acted together now, the worst effects could still be avoided this century.',
            native: '如果各国政府现在共同行动，本世纪最糟糕的影响仍然可以避免。',
          },
          {
            en: 'Extreme weather is reported every week, yet many people behave as if nothing has changed.',
            native: '极端天气每周都有报道，然而许多人的行为却好像什么都没有改变。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'renewable energy',
    questionText: 'Can renewable energy completely replace fossil fuels? What stands in the way?',
    translations: {
      te: {
        word: 'పునరుత్పాదక శక్తి',
        question: 'పునరుత్పాదక శక్తి శిలాజ ఇంధనాలను పూర్తిగా భర్తీ చేయగలదా? అడ్డంకి ఏమిటి?',
        examples: [
          {
            en: 'Solar and wind power have become cheaper, although storing their energy remains a challenge.',
            native: 'సౌర మరియు పవన శక్తి చవకైనవి అయ్యాయి, అయితే వాటి శక్తిని నిల్వ చేయడం ఇంకా సవాలుగానే ఉంది.',
          },
          {
            en: 'If fossil fuel subsidies were finally removed, green alternatives would compete much more fairly.',
            native: 'శిలాజ ఇంధన సబ్సిడీలు చివరగా తొలగించబడితే, పచ్చని ప్రత్యామ్నాయాలు మరింత న్యాయంగా పోటీ చేస్తాయి.',
          },
          {
            en: 'Entire regions are powered by renewables already, but heavy industry changes far more slowly.',
            native:
              'మొత్తం ప్రాంతాలు ఇప్పటికే పునరుత్పాదక శక్తితో నడుస్తున్నాయి, కానీ భారీ పరిశ్రమలు చాలా నెమ్మదిగా మారుతాయి.',
          },
        ],
      },
      hi: {
        word: 'नवीकरणीय ऊर्जा',
        question: 'क्या नवीकरणीय ऊर्जा जीवाश्म ईंधन की पूरी तरह जगह ले सकती है? रास्ते में क्या बाधा है?',
        examples: [
          {
            en: 'Solar and wind power have become cheaper, although storing their energy remains a challenge.',
            native: 'सौर और पवन ऊर्जा सस्ती हो गई है, हालाँकि उसकी ऊर्जा जमा करना अभी भी एक चुनौती है।',
          },
          {
            en: 'If fossil fuel subsidies were finally removed, green alternatives would compete much more fairly.',
            native:
              'अगर जीवाश्म ईंधन सब्सिडी आख़िरकार हटा दी जाएँ, तो हरित विकल्प कहीं ज़्यादा निष्पक्ष रूप से प्रतिस्पर्धा करेंगे।',
          },
          {
            en: 'Entire regions are powered by renewables already, but heavy industry changes far more slowly.',
            native: 'पूरे क्षेत्र पहले से ही नवीकरणीय ऊर्जा से चल रहे हैं, लेकिन भारी उद्योग काफ़ी धीरे बदलते हैं।',
          },
        ],
      },
      es: {
        word: 'energía renovable',
        question: '¿Puede la energía renovable reemplazar por completo a los combustibles fósiles? ¿Qué lo impide?',
        examples: [
          {
            en: 'Solar and wind power have become cheaper, although storing their energy remains a challenge.',
            native: 'La energía solar y eólica se han abaratado, aunque almacenar su energía sigue siendo un desafío.',
          },
          {
            en: 'If fossil fuel subsidies were finally removed, green alternatives would compete much more fairly.',
            native:
              'Si por fin se eliminaran los subsidios a los combustibles fósiles, las alternativas verdes competirían de forma mucho más justa.',
          },
          {
            en: 'Entire regions are powered by renewables already, but heavy industry changes far more slowly.',
            native: 'Regiones enteras ya funcionan con renovables, pero la industria pesada cambia mucho más despacio.',
          },
        ],
      },
      zh: {
        word: '可再生能源',
        question: '可再生能源能完全取代化石燃料吗？障碍是什么？',
        examples: [
          {
            en: 'Solar and wind power have become cheaper, although storing their energy remains a challenge.',
            native: '太阳能和风能已经变得更便宜，尽管储存这些能源仍然是一个挑战。',
          },
          {
            en: 'If fossil fuel subsidies were finally removed, green alternatives would compete much more fairly.',
            native: '如果最终取消化石燃料补贴，绿色替代能源的竞争会公平得多。',
          },
          {
            en: 'Entire regions are powered by renewables already, but heavy industry changes far more slowly.',
            native: '一些地区已经完全由可再生能源供电，但重工业的变革要慢得多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'pollution',
    questionText: 'Who should pay for cleaning up pollution — companies, governments, or consumers?',
    translations: {
      te: {
        word: 'కాలుష్యం',
        question: 'కాలుష్యాన్ని శుభ్రం చేయడానికి ఎవరు చెల్లించాలి — కంపెనీలా, ప్రభుత్వాలా, లేక వినియోగదారులా?',
        examples: [
          {
            en: 'Pollution is created mostly for profit, although its costs are paid by everyone else.',
            native: 'కాలుష్యం ఎక్కువగా లాభం కోసం సృష్టించబడుతుంది, అయితే దాని ఖర్చులు మిగతా అందరూ చెల్లిస్తారు.',
          },
          {
            en: 'If companies paid the true cost of waste, cleaner methods would be adopted very quickly.',
            native: 'కంపెనీలు వ్యర్థాల నిజమైన ఖర్చు చెల్లిస్తే, శుభ్రమైన పద్ధతులు చాలా త్వరగా అవలంబించబడతాయి.',
          },
          {
            en: 'Rivers can recover when dumping is stopped, but the damage may take decades to reverse.',
            native: 'డంపింగ్ ఆగిపోయినప్పుడు నదులు కోలుకోగలవు, కానీ నష్టాన్ని తిప్పికొట్టడానికి దశాబ్దాలు పట్టవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'प्रदूषण',
        question: 'प्रदूषण साफ़ करने का ख़र्च किसे उठाना चाहिए — कंपनियों को, सरकारों को, या उपभोक्ताओं को?',
        examples: [
          {
            en: 'Pollution is created mostly for profit, although its costs are paid by everyone else.',
            native: 'प्रदूषण ज़्यादातर मुनाफ़े के लिए पैदा किया जाता है, हालाँकि उसकी कीमत बाक़ी सब चुकाते हैं।',
          },
          {
            en: 'If companies paid the true cost of waste, cleaner methods would be adopted very quickly.',
            native: 'अगर कंपनियाँ कचरे की असली कीमत चुकाएँ, तो स्वच्छ तरीके बहुत जल्दी अपनाए जाएँगे।',
          },
          {
            en: 'Rivers can recover when dumping is stopped, but the damage may take decades to reverse.',
            native: 'कचरा डालना बंद होने पर नदियाँ ठीक हो सकती हैं, लेकिन नुकसान को पलटने में दशक लग सकते हैं।',
          },
        ],
      },
      es: {
        word: 'contaminación',
        question: '¿Quién debería pagar por limpiar la contaminación: las empresas, los gobiernos o los consumidores?',
        examples: [
          {
            en: 'Pollution is created mostly for profit, although its costs are paid by everyone else.',
            native:
              'La contaminación se crea sobre todo para obtener beneficios, aunque sus costes los pagan todos los demás.',
          },
          {
            en: 'If companies paid the true cost of waste, cleaner methods would be adopted very quickly.',
            native:
              'Si las empresas pagaran el coste real de los residuos, se adoptarían métodos más limpios muy rápidamente.',
          },
          {
            en: 'Rivers can recover when dumping is stopped, but the damage may take decades to reverse.',
            native:
              'Los ríos pueden recuperarse cuando se deja de verter en ellos, pero el daño puede tardar décadas en revertirse.',
          },
        ],
      },
      zh: {
        word: '污染',
        question: '治理污染的费用应该由谁承担——企业、政府还是消费者？',
        examples: [
          {
            en: 'Pollution is created mostly for profit, although its costs are paid by everyone else.',
            native: '污染大多是为利润而制造的，尽管其代价由其他所有人承担。',
          },
          {
            en: 'If companies paid the true cost of waste, cleaner methods would be adopted very quickly.',
            native: '如果企业支付废弃物的真实成本，更清洁的生产方式会被迅速采用。',
          },
          {
            en: 'Rivers can recover when dumping is stopped, but the damage may take decades to reverse.',
            native: '停止倾倒后河流可以恢复，但损害可能需要几十年才能逆转。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'recycling',
    questionText: 'Does recycling actually work, or is it just a way to make consumers feel better?',
    translations: {
      te: {
        word: 'రీసైక్లింగ్',
        question: 'రీసైక్లింగ్ నిజంగా పనిచేస్తుందా, లేక ఇది వినియోగదారులకు ఉపశమనం కల్పించే మార్గమేనా?',
        examples: [
          {
            en: 'Recycling certainly helps, although reducing what we buy would help the planet far more.',
            native:
              'రీసైక్లింగ్ ఖచ్చితంగా సహాయపడుతుంది, అయితే మనం కొనేది తగ్గిస్తే గ్రహానికి ఇంకా ఎక్కువ సహాయం అవుతుంది.',
          },
          {
            en: 'If packaging were standardized absolutely everywhere, sorting waste at home would become much simpler.',
            native: 'ప్యాకేజింగ్ ప్రతిచోటా ప్రామాణీకరించబడితే, ఇంట్లో వ్యర్థాలను వేరుచేయడం చాలా సులభం అవుతుంది.',
          },
          {
            en: 'Much of what is carefully collected for recycling is shipped abroad and dumped instead.',
            native: 'రీసైక్లింగ్ కోసం జాగ్రత్తగా సేకరించిన దానిలో ఎక్కువ భాగం విదేశాలకు రవాణా చేయబడి డంప్ చేయబడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'रीसाइक्लिंग',
        question: 'क्या रीसाइक्लिंग सच में काम करती है, या यह उपभोक्ताओं को बेहतर महसूस कराने का तरीका भर है?',
        examples: [
          {
            en: 'Recycling certainly helps, although reducing what we buy would help the planet far more.',
            native:
              'रीसाइक्लिंग ज़रूर मदद करती है, हालाँकि हम जो ख़रीदते हैं उसे घटाने से ग्रह को कहीं ज़्यादा फ़ायदा होगा।',
          },
          {
            en: 'If packaging were standardized absolutely everywhere, sorting waste at home would become much simpler.',
            native: 'अगर पैकेजिंग हर जगह बिल्कुल एकसमान हो जाए, तो घर पर कचरा छाँटना काफ़ी आसान हो जाएगा।',
          },
          {
            en: 'Much of what is carefully collected for recycling is shipped abroad and dumped instead.',
            native: 'रीसाइक्लिंग के लिए ध्यान से इकट्ठा की गई चीज़ों का बड़ा हिस्सा विदेश भेजकर डंप कर दिया जाता है।',
          },
        ],
      },
      es: {
        word: 'reciclaje',
        question: '¿Funciona realmente el reciclaje, o es solo una forma de hacer sentir mejor a los consumidores?',
        examples: [
          {
            en: 'Recycling certainly helps, although reducing what we buy would help the planet far more.',
            native: 'El reciclaje ciertamente ayuda, aunque reducir lo que compramos ayudaría mucho más al planeta.',
          },
          {
            en: 'If packaging were standardized absolutely everywhere, sorting waste at home would become much simpler.',
            native:
              'Si los envases se estandarizaran absolutamente en todas partes, separar los residuos en casa sería mucho más sencillo.',
          },
          {
            en: 'Much of what is carefully collected for recycling is shipped abroad and dumped instead.',
            native: 'Gran parte de lo que se recoge cuidadosamente para reciclar se envía al extranjero y se tira.',
          },
        ],
      },
      zh: {
        word: '回收利用',
        question: '回收利用真的有效吗，还是它只是让消费者心里好受一点的方式？',
        examples: [
          {
            en: 'Recycling certainly helps, although reducing what we buy would help the planet far more.',
            native: '回收利用确实有帮助，尽管减少购买对地球的帮助会大得多。',
          },
          {
            en: 'If packaging were standardized absolutely everywhere, sorting waste at home would become much simpler.',
            native: '如果包装在所有地方都完全标准化，在家分类垃圾会简单得多。',
          },
          {
            en: 'Much of what is carefully collected for recycling is shipped abroad and dumped instead.',
            native: '为回收而仔细收集的东西，有很大一部分被运到国外倾倒掉了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'space exploration',
    questionText: 'Is space exploration worth the money when so many problems remain unsolved on Earth?',
    translations: {
      te: {
        word: 'అంతరిక్ష అన్వేషణ',
        question: 'భూమిపై ఇంకా చాలా సమస్యలు పరిష్కరించబడకుండా ఉన్నప్పుడు అంతరిక్ష అన్వేషణ డబ్బుకు విలువైనదేనా?',
        examples: [
          {
            en: 'Space missions are very expensive, although their inventions often improve daily life on Earth.',
            native:
              'అంతరిక్ష మిషన్లు చాలా ఖరీదైనవి, అయితే వాటి ఆవిష్కరణలు తరచుగా భూమిపై రోజువారీ జీవితాన్ని మెరుగుపరుస్తాయి.',
          },
          {
            en: 'If satellites disappeared tomorrow, weather forecasts, navigation and global communication would all collapse quickly.',
            native:
              'రేపు ఉపగ్రహాలు అదృశ్యమైతే, వాతావరణ సూచనలు, నావిగేషన్ మరియు ప్రపంచ కమ్యూనికేషన్ అన్నీ త్వరగా కుప్పకూలతాయి.',
          },
          {
            en: 'Critics ask why rockets are funded while hospitals struggle, and the question deserves an answer.',
            native:
              'ఆసుపత్రులు ఇబ్బంది పడుతుండగా రాకెట్లకు ఎందుకు నిధులిస్తారని విమర్శకులు అడుగుతారు, మరియు ఆ ప్రశ్నకు సమాధానం అర్హం.',
          },
        ],
      },
      hi: {
        word: 'अंतरिक्ष अन्वेषण',
        question: 'जब धरती पर इतनी समस्याएँ हल होना बाक़ी हैं, तो क्या अंतरिक्ष अन्वेषण पैसे लायक़ है?',
        examples: [
          {
            en: 'Space missions are very expensive, although their inventions often improve daily life on Earth.',
            native:
              'अंतरिक्ष मिशन बहुत महँगे हैं, हालाँकि उनके आविष्कार अक्सर धरती पर रोज़मर्रा की ज़िंदगी बेहतर बनाते हैं।',
          },
          {
            en: 'If satellites disappeared tomorrow, weather forecasts, navigation and global communication would all collapse quickly.',
            native: 'अगर कल उपग्रह गायब हो जाएँ, तो मौसम पूर्वानुमान, नेविगेशन और वैश्विक संचार सब जल्दी ढह जाएँगे।',
          },
          {
            en: 'Critics ask why rockets are funded while hospitals struggle, and the question deserves an answer.',
            native:
              'आलोचक पूछते हैं कि अस्पताल संघर्ष कर रहे हों तो रॉकेट को क्यों फंड किया जाए, और इस सवाल का जवाब मिलना चाहिए।',
          },
        ],
      },
      es: {
        word: 'exploración espacial',
        question:
          '¿Vale la pena gastar dinero en la exploración espacial cuando quedan tantos problemas sin resolver en la Tierra?',
        examples: [
          {
            en: 'Space missions are very expensive, although their inventions often improve daily life on Earth.',
            native:
              'Las misiones espaciales son muy caras, aunque sus inventos a menudo mejoran la vida diaria en la Tierra.',
          },
          {
            en: 'If satellites disappeared tomorrow, weather forecasts, navigation and global communication would all collapse quickly.',
            native:
              'Si los satélites desaparecieran mañana, los pronósticos del tiempo, la navegación y la comunicación global colapsarían rápidamente.',
          },
          {
            en: 'Critics ask why rockets are funded while hospitals struggle, and the question deserves an answer.',
            native:
              'Los críticos preguntan por qué se financian cohetes mientras los hospitales pasan dificultades, y la pregunta merece una respuesta.',
          },
        ],
      },
      zh: {
        word: '太空探索',
        question: '地球上还有那么多问题没有解决，太空探索值得花这些钱吗？',
        examples: [
          {
            en: 'Space missions are very expensive, although their inventions often improve daily life on Earth.',
            native: '太空任务非常昂贵，尽管它们的发明常常改善地球上的日常生活。',
          },
          {
            en: 'If satellites disappeared tomorrow, weather forecasts, navigation and global communication would all collapse quickly.',
            native: '如果卫星明天消失，天气预报、导航和全球通信都会迅速崩溃。',
          },
          {
            en: 'Critics ask why rockets are funded while hospitals struggle, and the question deserves an answer.',
            native: '批评者问，为什么在医院苦苦挣扎时还要资助火箭，这个问题值得一个答案。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'genetic engineering',
    questionText: 'Should genetic engineering be used to change human embryos, or only to treat disease?',
    translations: {
      te: {
        word: 'జెనెటిక్ ఇంజనీరింగ్',
        question: 'మానవ భ్రూణాలను మార్చడానికి జెనెటిక్ ఇంజనీరింగ్ వాడాలా, లేక వ్యాధులను నయం చేయడానికి మాత్రమే వాడాలా?',
        examples: [
          {
            en: 'Genetic engineering can cure terrible inherited diseases, although designing babies raises impossible ethical questions.',
            native:
              'జెనెటిక్ ఇంజనీరింగ్ భయంకరమైన వంశపారంపర్య వ్యాధులను నయం చేయగలదు, అయితే శిశువులను డిజైన్ చేయడం అసాధ్యమైన నైతిక ప్రశ్నలను లేవనెత్తుతుంది.',
          },
          {
            en: 'If gene editing were available only to the rich, inequality would be written into biology.',
            native: 'జీన్ ఎడిటింగ్ ధనికులకు మాత్రమే అందుబాటులో ఉంటే, అసమానత జీవశాస్త్రంలోకి వ్రాయబడుతుంది.',
          },
          {
            en: 'Crops are modified to resist drought, but their long-term effects are still debated fiercely.',
            native:
              'పంటలు కరువును తట్టుకునేలా మార్చబడతాయి, కానీ వాటి దీర్ఘకాలిక ప్రభావాలపై ఇంకా తీవ్రంగా చర్చ జరుగుతోంది.',
          },
        ],
      },
      hi: {
        word: 'आनुवंशिक इंजीनियरिंग',
        question:
          'क्या आनुवंशिक इंजीनियरिंग का उपयोग मानव भ्रूणों को बदलने के लिए किया जाना चाहिए, या केवल बीमारी के इलाज के लिए?',
        examples: [
          {
            en: 'Genetic engineering can cure terrible inherited diseases, although designing babies raises impossible ethical questions.',
            native:
              'आनुवंशिक इंजीनियरिंग भयानक आनुवंशिक बीमारियों का इलाज कर सकती है, हालाँकि बच्चों को डिज़ाइन करना असंभव नैतिक सवाल उठाता है।',
          },
          {
            en: 'If gene editing were available only to the rich, inequality would be written into biology.',
            native: 'अगर जीन एडिटिंग सिर्फ़ अमीरों के लिए उपलब्ध हो, तो असमानता जीव विज्ञान में लिखी जाएगी।',
          },
          {
            en: 'Crops are modified to resist drought, but their long-term effects are still debated fiercely.',
            native:
              'फ़सलों को सूखा झेलने के लिए बदला जाता है, लेकिन उनके दीर्घकालिक प्रभावों पर अब भी ज़ोरदार बहस होती है।',
          },
        ],
      },
      es: {
        word: 'ingeniería genética',
        question:
          '¿Debería usarse la ingeniería genética para modificar embriones humanos, o solo para tratar enfermedades?',
        examples: [
          {
            en: 'Genetic engineering can cure terrible inherited diseases, although designing babies raises impossible ethical questions.',
            native:
              'La ingeniería genética puede curar enfermedades hereditarias terribles, aunque diseñar bebés plantea cuestiones éticas imposibles.',
          },
          {
            en: 'If gene editing were available only to the rich, inequality would be written into biology.',
            native:
              'Si la edición genética estuviera disponible solo para los ricos, la desigualdad quedaría escrita en la biología.',
          },
          {
            en: 'Crops are modified to resist drought, but their long-term effects are still debated fiercely.',
            native:
              'Los cultivos se modifican para resistir la sequía, pero sus efectos a largo plazo aún se debaten con intensidad.',
          },
        ],
      },
      zh: {
        word: '基因工程',
        question: '基因工程应该用于改变人类胚胎，还是只用于治疗疾病？',
        examples: [
          {
            en: 'Genetic engineering can cure terrible inherited diseases, although designing babies raises impossible ethical questions.',
            native: '基因工程可以治愈可怕的遗传疾病，尽管设计婴儿会引发无法解答的伦理问题。',
          },
          {
            en: 'If gene editing were available only to the rich, inequality would be written into biology.',
            native: '如果基因编辑只向富人开放，不平等将被写进生物学。',
          },
          {
            en: 'Crops are modified to resist drought, but their long-term effects are still debated fiercely.',
            native: '农作物被改造以抵抗干旱，但其长期影响仍在激烈争论中。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'medicine',
    questionText: 'Should healthcare be free for everyone, even if that means higher taxes?',
    translations: {
      te: {
        word: 'వైద్యం',
        question: 'పన్నులు ఎక్కువ అయినా సరే, అందరికీ వైద్యం ఉచితం కావాలా?',
        examples: [
          {
            en: 'Free healthcare saves lives quietly every day, although waiting lists can become painfully long.',
            native:
              'ఉచిత వైద్యం ప్రతిరోజూ నిశ్శబ్దంగా ప్రాణాలను కాపాడుతుంది, అయితే నిరీక్షణ జాబితాలు బాధాకరంగా పొడవుగా మారవచ్చు.',
          },
          {
            en: 'If medicines were priced fairly, far fewer families would be ruined by a single illness.',
            native: 'మందులు న్యాయంగా ధర వేయబడితే, ఒక్క అనారోగ్యంతో చాలా తక్కువ మంది కుటుంబాలు నాశనం అవుతాయి.',
          },
          {
            en: 'Prevention is cheaper than treatment, yet most health budgets are spent after people fall ill.',
            native: 'చికిత్స కంటే నివారణ చవకైనది, అయితే చాలామంది ఆరోగ్య బడ్జెట్లు ప్రజలు జబ్బుపడిన తర్వాత ఖర్చవుతాయి.',
          },
        ],
      },
      hi: {
        word: 'चिकित्सा',
        question: 'क्या सबके लिए स्वास्थ्य सेवा मुफ़्त होनी चाहिए, भले ही इसका मतलब ज़्यादा टैक्स हो?',
        examples: [
          {
            en: 'Free healthcare saves lives quietly every day, although waiting lists can become painfully long.',
            native:
              'मुफ़्त स्वास्थ्य सेवा हर दिन चुपचाप जानें बचाती है, हालाँकि प्रतीक्षा सूचियाँ दर्दनाक रूप से लंबी हो सकती हैं।',
          },
          {
            en: 'If medicines were priced fairly, far fewer families would be ruined by a single illness.',
            native: 'अगर दवाओं की कीमत उचित हो, तो एक बीमारी से काफ़ी कम परिवार बर्बाद होंगे।',
          },
          {
            en: 'Prevention is cheaper than treatment, yet most health budgets are spent after people fall ill.',
            native: 'इलाज से बचाव सस्ता है, फिर भी ज़्यादातर स्वास्थ्य बजट लोगों के बीमार पड़ने के बाद ख़र्च होते हैं।',
          },
        ],
      },
      es: {
        word: 'medicina',
        question: '¿Debería la sanidad ser gratuita para todos, aunque eso signifique impuestos más altos?',
        examples: [
          {
            en: 'Free healthcare saves lives quietly every day, although waiting lists can become painfully long.',
            native:
              'La sanidad gratuita salva vidas silenciosamente cada día, aunque las listas de espera pueden volverse dolorosamente largas.',
          },
          {
            en: 'If medicines were priced fairly, far fewer families would be ruined by a single illness.',
            native:
              'Si los medicamentos tuvieran precios justos, muchas menos familias quedarían arruinadas por una sola enfermedad.',
          },
          {
            en: 'Prevention is cheaper than treatment, yet most health budgets are spent after people fall ill.',
            native:
              'La prevención es más barata que el tratamiento, y sin embargo la mayoría de los presupuestos se gastan después de que la gente enferme.',
          },
        ],
      },
      zh: {
        word: '医疗',
        question: '即使意味着更高的税收，医疗也应该对所有人免费吗？',
        examples: [
          {
            en: 'Free healthcare saves lives quietly every day, although waiting lists can become painfully long.',
            native: '免费医疗每天都在悄然挽救生命，尽管候诊名单可能会变得漫长难熬。',
          },
          {
            en: 'If medicines were priced fairly, far fewer families would be ruined by a single illness.',
            native: '如果药品定价公平，因病致贫的家庭会少得多。',
          },
          {
            en: 'Prevention is cheaper than treatment, yet most health budgets are spent after people fall ill.',
            native: '预防比治疗更便宜，然而大部分医疗预算都花在人们生病之后。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'vaccination',
    questionText: 'Should vaccines be mandatory, or should individuals always have the right to refuse?',
    translations: {
      te: {
        word: 'టీకాలు',
        question: 'టీకాలు తప్పనిసరి కావాలా, లేక వ్యక్తులకు ఎల్లప్పుడూ తిరస్కరించే హక్కు ఉండాలా?',
        examples: [
          {
            en: 'Vaccines protect entire communities from disease, although some people still refuse them out of fear.',
            native: 'టీకాలు మొత్తం సమాజాలను వ్యాధుల నుండి రక్షిస్తాయి, అయితే కొందరు భయంతో వాటిని ఇంకా తిరస్కరిస్తారు.',
          },
          {
            en: 'If vaccination rates fall too low, old diseases return and the weakest suffer first.',
            native: 'టీకా రేట్లు చాలా తగ్గితే, పాత వ్యాధులు తిరిగి వస్తాయి మరియు అత్యంత బలహీనులు మొదట బాధపడతారు.',
          },
          {
            en: 'Mandatory programmes are often criticised as controlling, but public health depends on shared responsibility.',
            native:
              'తప్పనిసరి కార్యక్రమాలు తరచుగా నియంత్రణగా విమర్శించబడతాయి, కానీ ప్రజారోగ్యం భాగస్వామ్య బాధ్యతపై ఆధారపడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'टीकाकरण',
        question: 'क्या टीके अनिवार्य होने चाहिए, या व्यक्तियों को हमेशा मना करने का अधिकार होना चाहिए?',
        examples: [
          {
            en: 'Vaccines protect entire communities from disease, although some people still refuse them out of fear.',
            native: 'टीके पूरे समुदायों को बीमारियों से बचाते हैं, हालाँकि कुछ लोग डर से उन्हें अब भी मना कर देते हैं।',
          },
          {
            en: 'If vaccination rates fall too low, old diseases return and the weakest suffer first.',
            native:
              'अगर टीकाकरण दरें बहुत गिर जाएँ, तो पुरानी बीमारियाँ लौटती हैं और सबसे कमज़ोर पहले पीड़ित होते हैं।',
          },
          {
            en: 'Mandatory programmes are often criticised as controlling, but public health depends on shared responsibility.',
            native:
              'अनिवार्य कार्यक्रमों की अक्सर नियंत्रक होने की आलोचना होती है, लेकिन सार्वजनिक स्वास्थ्य साझा ज़िम्मेदारी पर टिका है।',
          },
        ],
      },
      es: {
        word: 'vacunación',
        question:
          '¿Deberían ser obligatorias las vacunas, o deberían las personas tener siempre derecho a rechazarlas?',
        examples: [
          {
            en: 'Vaccines protect entire communities from disease, although some people still refuse them out of fear.',
            native:
              'Las vacunas protegen a comunidades enteras de enfermedades, aunque algunas personas aún las rechazan por miedo.',
          },
          {
            en: 'If vaccination rates fall too low, old diseases return and the weakest suffer first.',
            native:
              'Si las tasas de vacunación caen demasiado, las viejas enfermedades regresan y los más débiles sufren primero.',
          },
          {
            en: 'Mandatory programmes are often criticised as controlling, but public health depends on shared responsibility.',
            native:
              'Los programas obligatorios son criticados a menudo por controladores, pero la salud pública depende de la responsabilidad compartida.',
          },
        ],
      },
      zh: {
        word: '疫苗接种',
        question: '疫苗应该强制接种吗，还是个人应始终有权拒绝？',
        examples: [
          {
            en: 'Vaccines protect entire communities from disease, although some people still refuse them out of fear.',
            native: '疫苗保护整个社区免受疾病侵害，尽管有些人仍因恐惧而拒绝接种。',
          },
          {
            en: 'If vaccination rates fall too low, old diseases return and the weakest suffer first.',
            native: '如果疫苗接种率降得太低，旧疾病会卷土重来，最脆弱的人会首先受苦。',
          },
          {
            en: 'Mandatory programmes are often criticised as controlling, but public health depends on shared responsibility.',
            native: '强制接种计划常被批评为控制欲太强，但公共卫生依赖于共同的责任。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'sleep',
    questionText: 'Why do modern societies value sleep so little, and what are the consequences?',
    translations: {
      te: {
        word: 'నిద్ర',
        question: 'ఆధునిక సమాజాలు నిద్రను ఎందుకు అంత తక్కువగా విలువైస్తాయి, మరియు దాని పరిణామాలు ఏమిటి?',
        examples: [
          {
            en: 'Sleep is often treated like wasted time, although nothing restores the brain as effectively.',
            native: 'నిద్రను తరచుగా వృథా సమయంలా భావిస్తారు, అయితే మెదడును అంత ప్రభావవంతంగా పునరుద్ధరించేది ఏమీ లేదు.',
          },
          {
            en: 'If schools started later in the morning, teenagers would learn more and feel less anxious.',
            native: 'పాఠశాలలు ఉదయం ఆలస్యంగా ప్రారంభమైతే, టీనేజర్లు ఎక్కువ నేర్చుకుంటారు మరియు తక్కువ ఆందోళనగా ఉంటారు.',
          },
          {
            en: 'Tired drivers cause thousands of accidents yearly, yet sleeplessness is still praised as ambition.',
            native:
              'అలసిన డ్రైవర్లు ప్రతి సంవత్సరం వేలాది ప్రమాదాలకు కారణమవుతారు, అయితే నిద్రలేమిని ఇంకా ధ్యేయంగా పొగుడుతారు.',
          },
        ],
      },
      hi: {
        word: 'नींद',
        question: 'आधुनिक समाज नींद को इतना कम महत्व क्यों देते हैं, और इसके परिणाम क्या हैं?',
        examples: [
          {
            en: 'Sleep is often treated like wasted time, although nothing restores the brain as effectively.',
            native:
              'नींद को अक्सर बर्बाद समय जैसा माना जाता है, हालाँकि दिमाग को उतनी असरदार ढंग से कुछ भी ताज़ा नहीं करता।',
          },
          {
            en: 'If schools started later in the morning, teenagers would learn more and feel less anxious.',
            native: 'अगर स्कूल सुबह देर से शुरू हों, तो किशोर ज़्यादा सीखेंगे और कम चिंतित रहेंगे।',
          },
          {
            en: 'Tired drivers cause thousands of accidents yearly, yet sleeplessness is still praised as ambition.',
            native:
              'थके ड्राइवर हर साल हज़ारों दुर्घटनाओं का कारण बनते हैं, फिर भी नींद न लेने को महत्वाकांक्षा समझकर सराहा जाता है।',
          },
        ],
      },
      es: {
        word: 'sueño',
        question: '¿Por qué las sociedades modernas valoran tan poco el sueño, y cuáles son las consecuencias?',
        examples: [
          {
            en: 'Sleep is often treated like wasted time, although nothing restores the brain as effectively.',
            native:
              'El sueño se trata a menudo como tiempo perdido, aunque nada restaura el cerebro con tanta eficacia.',
          },
          {
            en: 'If schools started later in the morning, teenagers would learn more and feel less anxious.',
            native:
              'Si las escuelas empezaran más tarde por la mañana, los adolescentes aprenderían más y se sentirían menos ansiosos.',
          },
          {
            en: 'Tired drivers cause thousands of accidents yearly, yet sleeplessness is still praised as ambition.',
            native:
              'Los conductores cansados causan miles de accidentes al año, y sin embargo la falta de sueño aún se elogia como ambición.',
          },
        ],
      },
      zh: {
        word: '睡眠',
        question: '为什么现代社会如此轻视睡眠？后果是什么？',
        examples: [
          {
            en: 'Sleep is often treated like wasted time, although nothing restores the brain as effectively.',
            native: '睡眠常被视为浪费时间，尽管没有什么能像这样有效地恢复大脑。',
          },
          {
            en: 'If schools started later in the morning, teenagers would learn more and feel less anxious.',
            native: '如果学校早上晚点上课，青少年会学得更多，焦虑也会更少。',
          },
          {
            en: 'Tired drivers cause thousands of accidents yearly, yet sleeplessness is still praised as ambition.',
            native: '疲劳的司机每年造成数千起事故，然而缺少睡眠仍被当作上进心来赞美。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'exercise',
    questionText: 'Why do so many people avoid exercise even though they know it is good for them?',
    translations: {
      te: {
        word: 'వ్యాయామం',
        question: 'వ్యాయామం మంచిదని తెలిసినా చాలామంది ఎందుకు దాన్ని తప్పుకుంటారు?',
        examples: [
          {
            en: 'Exercise is well known to extend life, although gyms remain empty in every neighbourhood.',
            native: 'వ్యాయామం ఆయుష్షును పొడగిస్తుందని బాగా తెలుసు, అయితే ప్రతి పరిసరంలోని జిమ్‌లు ఖాళీగానే ఉంటాయి.',
          },
          {
            en: 'If movement were built into daily routines, willpower would no longer decide who stays healthy.',
            native: 'రోజువారీ దినచర్యలో కదలికను కలిపితే, ఎవరు ఆరోగ్యంగా ఉంటారో ఇక సంకల్ప శక్తి నిర్ణయించదు.',
          },
          {
            en: 'People often blame laziness, but exhaustion from long working hours is rarely taken seriously.',
            native:
              'ప్రజలు తరచుగా సోమరితనాన్ని నిందిస్తారు, కానీ పొడవైన పని గంటల వల్ల వచ్చే అలసటను అరుదుగా తీవ్రంగా తీసుకుంటారు.',
          },
        ],
      },
      hi: {
        word: 'व्यायाम',
        question: 'इतने लोग व्यायाम से क्यों बचते हैं, भले ही वे जानते हैं कि यह उनके लिए अच्छा है?',
        examples: [
          {
            en: 'Exercise is well known to extend life, although gyms remain empty in every neighbourhood.',
            native:
              'यह अच्छी तरह जाना जाता है कि व्यायाम उम्र बढ़ाता है, हालाँकि हर मोहल्ले के जिम खाली पड़े रहते हैं।',
          },
          {
            en: 'If movement were built into daily routines, willpower would no longer decide who stays healthy.',
            native: 'अगर दिनचर्या में हलचल शामिल हो जाए, तो कौन स्वस्थ रहेगा यह इच्छाशक्ति तय नहीं करेगी।',
          },
          {
            en: 'People often blame laziness, but exhaustion from long working hours is rarely taken seriously.',
            native:
              'लोग अक्सर आलस्य को दोष देते हैं, लेकिन लंबे काम के घंटों की थकान को शायद ही गंभीरता से लिया जाता है।',
          },
        ],
      },
      es: {
        word: 'ejercicio',
        question: '¿Por qué tanta gente evita el ejercicio aun sabiendo que es bueno para ellos?',
        examples: [
          {
            en: 'Exercise is well known to extend life, although gyms remain empty in every neighbourhood.',
            native:
              'Es bien sabido que el ejercicio alarga la vida, aunque los gimnasios siguen vacíos en todos los barrios.',
          },
          {
            en: 'If movement were built into daily routines, willpower would no longer decide who stays healthy.',
            native:
              'Si el movimiento se incorporara a las rutinas diarias, la fuerza de voluntad ya no decidiría quién se mantiene sano.',
          },
          {
            en: 'People often blame laziness, but exhaustion from long working hours is rarely taken seriously.',
            native:
              'La gente suele culpar a la pereza, pero el agotamiento por las largas jornadas rara vez se toma en serio.',
          },
        ],
      },
      zh: {
        word: '锻炼',
        question: '为什么这么多人明知锻炼有益却仍然逃避锻炼？',
        examples: [
          {
            en: 'Exercise is well known to extend life, although gyms remain empty in every neighbourhood.',
            native: '众所周知锻炼能延长寿命，尽管每个街区的健身房都空空如也。',
          },
          {
            en: 'If movement were built into daily routines, willpower would no longer decide who stays healthy.',
            native: '如果把运动融入日常生活，谁能保持健康就不再由意志力决定。',
          },
          {
            en: 'People often blame laziness, but exhaustion from long working hours is rarely taken seriously.',
            native: '人们常常责怪懒惰，但长时间工作带来的疲惫很少被认真对待。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'diet',
    questionText: 'Are modern diets making us sick? Who is responsible for what people eat?',
    translations: {
      te: {
        word: 'ఆహారపు అలవాట్లు',
        question: 'ఆధునిక ఆహారపు అలవాట్లు మనల్ని జబ్బులవారిని చేస్తున్నాయా? ప్రజలు ఏమి తింటారో దానికి బాధ్యులు ఎవరు?',
        examples: [
          {
            en: 'Processed food is cheap and convenient, although its real cost appears in hospitals later.',
            native:
              'ప్రాసెస్ చేసిన ఆహారం చవకగా మరియు అనుకూలంగా ఉంటుంది, అయితే దాని నిజమైన ఖర్చు తర్వాత ఆసుపత్రుల్లో కనిపిస్తుంది.',
          },
          {
            en: 'If sugar were taxed like tobacco, manufacturers would probably change their recipes quite quickly.',
            native: 'చక్కెరపై పొగాకులా పన్ను విధిస్తే, తయారీదారులు బహుశా తమ రెసిపీలను చాలా త్వరగా మారుస్తారు.',
          },
          {
            en: 'Healthy eating is taught in schools, but unhealthy snacks are sold right outside the gates.',
            native:
              'పాఠశాలల్లో ఆరోగ్యకరమైన ఆహారం గురించి నేర్పుతారు, కానీ అనారోగ్యకరమైన స్నాక్స్ గేట్ల వెంటనే అమ్మబడుతాయి.',
          },
        ],
      },
      hi: {
        word: 'खान-पान',
        question: 'क्या आधुनिक खान-पान हमें बीमार बना रहा है? लोग क्या खाते हैं, इसके लिए ज़िम्मेदार कौन है?',
        examples: [
          {
            en: 'Processed food is cheap and convenient, although its real cost appears in hospitals later.',
            native: 'प्रोसेस्ड खाना सस्ता और सुविधाजनक है, हालाँकि उसकी असली कीमत बाद में अस्पतालों में दिखती है।',
          },
          {
            en: 'If sugar were taxed like tobacco, manufacturers would probably change their recipes quite quickly.',
            native: 'अगर चीनी पर तंबाकू जैसा टैक्स लगे, तो निर्माता शायद अपनी रेसिपी काफ़ी जल्दी बदल देंगे।',
          },
          {
            en: 'Healthy eating is taught in schools, but unhealthy snacks are sold right outside the gates.',
            native: 'स्कूलों में स्वस्थ खाना सिखाया जाता है, लेकिन अस्वास्थ्यकर स्नैक्स गेट के ठीक बाहर बेचे जाते हैं।',
          },
        ],
      },
      es: {
        word: 'dieta',
        question: '¿Nos están enfermando las dietas modernas? ¿Quién es responsable de lo que come la gente?',
        examples: [
          {
            en: 'Processed food is cheap and convenient, although its real cost appears in hospitals later.',
            native: 'La comida procesada es barata y cómoda, aunque su coste real aparece después en los hospitales.',
          },
          {
            en: 'If sugar were taxed like tobacco, manufacturers would probably change their recipes quite quickly.',
            native:
              'Si el azúcar se gravara como el tabaco, los fabricantes probablemente cambiarían sus recetas muy rápido.',
          },
          {
            en: 'Healthy eating is taught in schools, but unhealthy snacks are sold right outside the gates.',
            native:
              'La alimentación saludable se enseña en las escuelas, pero los snacks poco sanos se venden justo a la salida.',
          },
        ],
      },
      zh: {
        word: '饮食',
        question: '现代饮食正在让我们生病吗？谁应该对人们吃什么负责？',
        examples: [
          {
            en: 'Processed food is cheap and convenient, although its real cost appears in hospitals later.',
            native: '加工食品便宜又方便，尽管它的真实代价日后会出现在医院里。',
          },
          {
            en: 'If sugar were taxed like tobacco, manufacturers would probably change their recipes quite quickly.',
            native: '如果像烟草一样对糖征税，制造商可能会很快改变配方。',
          },
          {
            en: 'Healthy eating is taught in schools, but unhealthy snacks are sold right outside the gates.',
            native: '学校里教健康饮食，但不健康的零食就在校门口外出售。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'writing',
    questionText: 'Is good writing still important in the age of texting and artificial intelligence tools?',
    translations: {
      te: {
        word: 'రచన',
        question: 'టెక్స్టింగ్ మరియు ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ టూల్స్ యుగంలో మంచి రచన ఇంకా ముఖ్యమేనా?',
        examples: [
          {
            en: 'Clear writing still reflects clear thinking, although few jobs now require long formal reports.',
            native:
              'స్పష్టమైన రచన ఇంకా స్పష్టమైన ఆలోచనను ప్రతిబింబిస్తుంది, అయితే ఇప్పుడు తక్కువ ఉద్యోగాలే పొడవైన అధికారిక నివేదికలు కోరుతాయి.',
          },
          {
            en: 'If machines wrote everything for us, we might slowly lose the ability to structure ideas.',
            native: 'యంత్రాలు మన కోసం ప్రతిదీ వ్రాస్తే, ఆలోచనలను నిర్మించే సామర్థ్యాన్ని మనం నెమ్మదిగా కోల్పోవచ్చు.',
          },
          {
            en: 'Text messages reward speed and brevity, but some important thoughts simply need more space.',
            native:
              'టెక్స్ట్ సందేశాలు వేగానికి మరియు సంక్షిప్తతకు బహూమతి ఇస్తాయి, కానీ కొన్ని ముఖ్యమైన ఆలోచనలకు కేవలం ఎక్కువ స్థలం కావాలి.',
          },
        ],
      },
      hi: {
        word: 'लेखन',
        question: 'टेक्स्टिंग और आर्टिफ़िशियल इंटेलिजेंस टूल के युग में क्या अच्छा लेखन अब भी महत्वपूर्ण है?',
        examples: [
          {
            en: 'Clear writing still reflects clear thinking, although few jobs now require long formal reports.',
            native:
              'स्पष्ट लेखन अब भी स्पष्ट सोच दर्शाता है, हालाँकि अब कम ही नौकरियों में लंबी औपचारिक रिपोर्ट चाहिए।',
          },
          {
            en: 'If machines wrote everything for us, we might slowly lose the ability to structure ideas.',
            native:
              'अगर मशीनें हमारे लिए सब कुछ लिखें, तो हम विचारों को व्यवस्थित करने की क्षमता धीरे-धीरे खो सकते हैं।',
          },
          {
            en: 'Text messages reward speed and brevity, but some important thoughts simply need more space.',
            native:
              'टेक्स्ट संदेश रफ़्तार और संक्षिप्तता को पुरस्कृत करते हैं, लेकिन कुछ महत्वपूर्ण विचारों को बस ज़्यादा जगह चाहिए।',
          },
        ],
      },
      es: {
        word: 'escritura',
        question:
          '¿Sigue siendo importante escribir bien en la era de los mensajes y las herramientas de inteligencia artificial?',
        examples: [
          {
            en: 'Clear writing still reflects clear thinking, although few jobs now require long formal reports.',
            native:
              'La escritura clara sigue reflejando un pensamiento claro, aunque pocos trabajos exigen ya informes formales largos.',
          },
          {
            en: 'If machines wrote everything for us, we might slowly lose the ability to structure ideas.',
            native:
              'Si las máquinas lo escribieran todo por nosotros, podríamos perder lentamente la capacidad de estructurar ideas.',
          },
          {
            en: 'Text messages reward speed and brevity, but some important thoughts simply need more space.',
            native:
              'Los mensajes de texto premian la rapidez y la brevedad, pero algunos pensamientos importantes simplemente necesitan más espacio.',
          },
        ],
      },
      zh: {
        word: '写作',
        question: '在发短信和人工智能工具的时代，良好的写作能力还重要吗？',
        examples: [
          {
            en: 'Clear writing still reflects clear thinking, although few jobs now require long formal reports.',
            native: '清晰的写作仍然反映清晰的思维，尽管现在很少有工作需要冗长的正式报告。',
          },
          {
            en: 'If machines wrote everything for us, we might slowly lose the ability to structure ideas.',
            native: '如果机器替我们写所有东西，我们可能会慢慢失去组织思想的能力。',
          },
          {
            en: 'Text messages reward speed and brevity, but some important thoughts simply need more space.',
            native: '短信奖励速度和简洁，但有些重要的思想就是需要更多空间。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'art',
    questionText: 'Should governments fund the arts when public money is limited?',
    translations: {
      te: {
        word: 'కళ',
        question: 'ప్రజా డబ్బు పరిమితంగా ఉన్నప్పుడు ప్రభుత్వాలు కళలకు నిధులివ్వాలా?',
        examples: [
          {
            en: 'Art is dismissed as a luxury, although it shapes how entire generations understand themselves.',
            native: 'కళను విలాసంగా కొట్టిపడేస్తారు, అయితే తరాలు తమను ఎలా అర్థం చేసుకుంటాయో అది రూపొందిస్తుంది.',
          },
          {
            en: 'If funding depended only on ticket sales, experimental artists would vanish from public view.',
            native:
              'నిధులు టిక్కెట్ అమ్మకాలపై మాత్రమే ఆధారపడితే, ప్రయోగాత్మక కళాకారులు ప్రజా దృష్టి నుండి అదృశ్యమవుతారు.',
          },
          {
            en: 'Museums are visited by millions, but the artists inside them often died in poverty.',
            native: 'మ్యూజియంలను లక్షలాది మంది సందర్శిస్తారు, కానీ వాటిలోని కళాకారులు తరచుగా పేదరికంలో మరణించారు.',
          },
        ],
      },
      hi: {
        word: 'कला',
        question: 'जब सार्वजनिक धन सीमित हो, तो क्या सरकारों को कला को फंड करना चाहिए?',
        examples: [
          {
            en: 'Art is dismissed as a luxury, although it shapes how entire generations understand themselves.',
            native:
              'कला को विलासिता समझकर खारिज कर दिया जाता है, हालाँकि यह तय करती है कि पूरी पीढ़ियाँ खुद को कैसे समझती हैं।',
          },
          {
            en: 'If funding depended only on ticket sales, experimental artists would vanish from public view.',
            native: 'अगर फंडिंग सिर्फ़ टिकट बिक्री पर निर्भर हो, तो प्रयोगधर्मी कलाकार जनता की नज़र से गायब हो जाएँगे।',
          },
          {
            en: 'Museums are visited by millions, but the artists inside them often died in poverty.',
            native: 'संग्रहालयों में लाखों लोग जाते हैं, लेकिन उनमें मौजूद कलाकार अक्सर ग़रीबी में मर गए।',
          },
        ],
      },
      es: {
        word: 'arte',
        question: '¿Deberían los gobiernos financiar las artes cuando el dinero público es limitado?',
        examples: [
          {
            en: 'Art is dismissed as a luxury, although it shapes how entire generations understand themselves.',
            native:
              'El arte se descarta como un lujo, aunque da forma a cómo generaciones enteras se entienden a sí mismas.',
          },
          {
            en: 'If funding depended only on ticket sales, experimental artists would vanish from public view.',
            native:
              'Si la financiación dependiera solo de la venta de entradas, los artistas experimentales desaparecerían de la vista pública.',
          },
          {
            en: 'Museums are visited by millions, but the artists inside them often died in poverty.',
            native:
              'Los museos son visitados por millones, pero los artistas que exhiben a menudo murieron en la pobreza.',
          },
        ],
      },
      zh: {
        word: '艺术',
        question: '在公共资金有限的情况下，政府应该资助艺术吗？',
        examples: [
          {
            en: 'Art is dismissed as a luxury, although it shapes how entire generations understand themselves.',
            native: '艺术被当作奢侈品而不予重视，尽管它塑造了一代又一代人如何理解自己。',
          },
          {
            en: 'If funding depended only on ticket sales, experimental artists would vanish from public view.',
            native: '如果资助只取决于票房收入，实验艺术家将从公众视野中消失。',
          },
          {
            en: 'Museums are visited by millions, but the artists inside them often died in poverty.',
            native: '博物馆有数百万人参观，但其中的艺术家常常死于贫困。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'gaming',
    questionText: 'Are video games a waste of time, or can they be genuinely beneficial?',
    translations: {
      te: {
        word: 'గేమింగ్',
        question: 'వీడియో గేమ్స్ సమయం వృథానా, లేక అవి నిజంగా ప్రయోజనకరం కావచ్చా?',
        examples: [
          {
            en: 'Games are blamed for violence, although research keeps failing to prove a simple link.',
            native: 'హింసకు గేమ్స్‌ను నిందిస్తారు, అయితే సరళమైన సంబంధాన్ని రుజువు చేయడంలో పరిశోధన పదేపదే విఫలమవుతోంది.',
          },
          {
            en: 'If they are played in moderation, strategy games can teach planning and patience quite effectively.',
            native: 'అవి మితంగా ఆడబడితే, వ్యూహాత్మక గేమ్స్ ప్రణాళికను మరియు సహనాన్ని చాలా ప్రభావవంతంగా నేర్పగలవు.',
          },
          {
            en: 'Real problems appear when gaming replaces sleep, friendships and responsibilities rather than boredom.',
            native:
              'గేమింగ్ విసుగు బదులు నిద్ర, స్నేహాలు మరియు బాధ్యతలను భర్తీ చేసినప్పుడు నిజమైన సమస్యలు తలెత్తుతాయి.',
          },
        ],
      },
      hi: {
        word: 'गेमिंग',
        question: 'क्या वीडियो गेम समय की बर्बादी हैं, या वे सच में फ़ायदेमंद हो सकते हैं?',
        examples: [
          {
            en: 'Games are blamed for violence, although research keeps failing to prove a simple link.',
            native:
              'हिंसा के लिए गेम्स को दोष दिया जाता है, हालाँकि शोध बार-बार सीधा संबंध साबित करने में असफल होता है।',
          },
          {
            en: 'If they are played in moderation, strategy games can teach planning and patience quite effectively.',
            native: 'अगर संयम से खेले जाएँ, तो रणनीति वाले गेम योजना और धैर्य काफ़ी असरदार ढंग से सिखा सकते हैं।',
          },
          {
            en: 'Real problems appear when gaming replaces sleep, friendships and responsibilities rather than boredom.',
            native: 'असली समस्याएँ तब आती हैं जब गेमिंग ऊब के बजाय नींद, दोस्ती और ज़िम्मेदारियों की जगह ले लेता है।',
          },
        ],
      },
      es: {
        word: 'videojuegos',
        question: '¿Son los videojuegos una pérdida de tiempo, o pueden ser realmente beneficiosos?',
        examples: [
          {
            en: 'Games are blamed for violence, although research keeps failing to prove a simple link.',
            native:
              'Se culpa a los videojuegos de la violencia, aunque la investigación sigue sin lograr demostrar un vínculo simple.',
          },
          {
            en: 'If they are played in moderation, strategy games can teach planning and patience quite effectively.',
            native:
              'Si se juega con moderación, los juegos de estrategia pueden enseñar planificación y paciencia con bastante eficacia.',
          },
          {
            en: 'Real problems appear when gaming replaces sleep, friendships and responsibilities rather than boredom.',
            native:
              'Los verdaderos problemas aparecen cuando jugar reemplaza el sueño, las amistades y las responsabilidades en lugar del aburrimiento.',
          },
        ],
      },
      zh: {
        word: '电子游戏',
        question: '电子游戏是浪费时间，还是确实可以带来益处？',
        examples: [
          {
            en: 'Games are blamed for violence, although research keeps failing to prove a simple link.',
            native: '人们把暴力归咎于电子游戏，尽管研究一直未能证明两者之间有简单的联系。',
          },
          {
            en: 'If they are played in moderation, strategy games can teach planning and patience quite effectively.',
            native: '如果适度游玩，策略游戏可以相当有效地培养规划和耐心。',
          },
          {
            en: 'Real problems appear when gaming replaces sleep, friendships and responsibilities rather than boredom.',
            native: '当游戏取代的不再是无聊，而是睡眠、友谊和责任时，真正的问题就出现了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'smartphones',
    questionText: 'Have smartphones improved our lives, or have they made us more distracted and anxious?',
    translations: {
      te: {
        word: 'స్మార్ట్‌ఫోన్లు',
        question: 'స్మార్ట్‌ఫోన్లు మన జీవితాలను మెరుగుపరిచాయా, లేక మనల్ని మరింత పరధ్యానంగా మరియు ఆందోళనగా మార్చాయా?',
        examples: [
          {
            en: 'Smartphones connect us to almost everything these days, although constant notifications fragment our attention completely.',
            native:
              'స్మార్ట్‌ఫోన్లు ఈరోజుల్లో మనల్ని దాదాపు ప్రతిదానితో అనుసంధానిస్తాయి, అయితే నిరంతర నోటిఫికేషన్లు మన శ్రద్ధను పూర్తిగా చీల్చివేస్తాయి.',
          },
          {
            en: 'If phones were banned at dinner tables, families might rediscover the art of conversation.',
            native: 'భోజన టేబుళ్ల వద్ద ఫోన్లను నిషేధిస్తే, కుటుంబాలు సంభాషణ కళను తిరిగి కనుగొనవచ్చు.',
          },
          {
            en: 'Greater productivity is promised by every new app, but hours disappear into scrolling instead.',
            native: 'ప్రతి కొత్త యాప్ ఎక్కువ ఉత్పాదకతను హామీ ఇస్తుంది, కానీ గంటలు స్క్రోలింగ్‌లో కరిగిపోతాయి.',
          },
        ],
      },
      hi: {
        word: 'स्मार्टफ़ोन',
        question: 'क्या स्मार्टफ़ोन ने हमारी ज़िंदगी बेहतर बनाई है, या हमें ज़्यादा विचलित और चिंतित बना दिया है?',
        examples: [
          {
            en: 'Smartphones connect us to almost everything these days, although constant notifications fragment our attention completely.',
            native:
              'स्मार्टफ़ोन आजकल हमें लगभग हर चीज़ से जोड़ते हैं, हालाँकि लगातार नोटिफ़िकेशन हमारा ध्यान पूरी तरह बिखेर देते हैं।',
          },
          {
            en: 'If phones were banned at dinner tables, families might rediscover the art of conversation.',
            native: 'अगर खाने की मेज़ पर फ़ोन बैन कर दिए जाएँ, तो परिवार बातचीत की कला फिर से खोज सकते हैं।',
          },
          {
            en: 'Greater productivity is promised by every new app, but hours disappear into scrolling instead.',
            native: 'हर नया ऐप ज़्यादा उत्पादकता का वादा करता है, लेकिन घंटे स्क्रॉलिंग में गुम हो जाते हैं।',
          },
        ],
      },
      es: {
        word: 'teléfonos inteligentes',
        question:
          '¿Han mejorado los teléfonos inteligentes nuestras vidas, o nos han vuelto más distraídos y ansiosos?',
        examples: [
          {
            en: 'Smartphones connect us to almost everything these days, although constant notifications fragment our attention completely.',
            native:
              'Los teléfonos inteligentes nos conectan hoy con casi todo, aunque las notificaciones constantes fragmentan por completo nuestra atención.',
          },
          {
            en: 'If phones were banned at dinner tables, families might rediscover the art of conversation.',
            native:
              'Si se prohibieran los teléfonos en la mesa, las familias podrían redescubrir el arte de la conversación.',
          },
          {
            en: 'Greater productivity is promised by every new app, but hours disappear into scrolling instead.',
            native:
              'Cada aplicación nueva promete mayor productividad, pero las horas desaparecen desplazándose por la pantalla.',
          },
        ],
      },
      zh: {
        word: '智能手机',
        question: '智能手机改善了我们的生活，还是让我们变得更加分心和焦虑？',
        examples: [
          {
            en: 'Smartphones connect us to almost everything these days, although constant notifications fragment our attention completely.',
            native: '如今智能手机让我们与几乎所有事物相连，尽管持续的通知把我们的注意力彻底割裂了。',
          },
          {
            en: 'If phones were banned at dinner tables, families might rediscover the art of conversation.',
            native: '如果餐桌上禁止使用手机，家人或许能重新发现交谈的艺术。',
          },
          {
            en: 'Greater productivity is promised by every new app, but hours disappear into scrolling instead.',
            native: '每个新应用都承诺提高效率，但时间却消失在刷屏之中。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'automation',
    questionText: 'Will automation destroy more jobs than it creates? Who should be responsible for displaced workers?',
    translations: {
      te: {
        word: 'ఆటోమేషన్',
        question:
          'ఆటోమేషన్ సృష్టించేదాని కంటే ఎక్కువ ఉద్యోగాలను నాశనం చేస్తుందా? ఉద్యోగాలు కోల్పోయిన కార్మికుల బాధ్యత ఎవరిది?',
        examples: [
          {
            en: 'Machines have replaced workers before, although new industries have usually appeared to absorb them.',
            native:
              'యంత్రాలు ఇంతకుముందు కార్మికులను భర్తీ చేశాయి, అయితే వారిని మింగేసుకునే కొత్త పరిశ్రమలు సాధారణంగా కనిపించాయి.',
          },
          {
            en: 'If driving becomes fully automated, millions of professional drivers will suddenly need new careers.',
            native:
              'డ్రైవింగ్ పూర్తిగా ఆటోమేట్ అయితే, లక్షలాది మంది ప్రొఫెషనల్ డ్రైవర్లకు అకస్మాత్తుగా కొత్త వృత్తులు కావాలి.',
          },
          {
            en: 'Productivity gains are celebrated by shareholders, but the benefits are rarely shared with those displaced.',
            native:
              'ఉత్పాదకత లాభాలను వాటాదారులు జరుపుకుంటారు, కానీ ఉద్యోగాలు కోల్పోయినవారితో ప్రయోజనాలు అరుదుగా పంచబడతాయి.',
          },
        ],
      },
      hi: {
        word: 'स्वचालन',
        question:
          'क्या स्वचालन जितनी नौकरियाँ बनाएगा उससे ज़्यादा नष्ट करेगा? बेअसर हुए कर्मचारियों की ज़िम्मेदारी किसकी होनी चाहिए?',
        examples: [
          {
            en: 'Machines have replaced workers before, although new industries have usually appeared to absorb them.',
            native:
              'मशीनें पहले भी कामगारों की जगह ले चुकी हैं, हालाँकि नए उद्योग आमतौर पर उन्हें समाहित करने के लिए उभरे हैं।',
          },
          {
            en: 'If driving becomes fully automated, millions of professional drivers will suddenly need new careers.',
            native: 'अगर ड्राइविंग पूरी तरह स्वचालित हो जाए, तो लाखों पेशेवर ड्राइवरों को अचानक नए करियर चाहिए होंगे।',
          },
          {
            en: 'Productivity gains are celebrated by shareholders, but the benefits are rarely shared with those displaced.',
            native: 'उत्पादकता लाभ का जश्न शेयरधारक मनाते हैं, लेकिन विस्थापित लोगों के साथ फ़ायदा शायद ही बँटता है।',
          },
        ],
      },
      es: {
        word: 'automatización',
        question:
          '¿Destruirá la automatización más empleos de los que crea? ¿Quién debería hacerse cargo de los trabajadores desplazados?',
        examples: [
          {
            en: 'Machines have replaced workers before, although new industries have usually appeared to absorb them.',
            native:
              'Las máquinas han reemplazado trabajadores antes, aunque normalmente han aparecido industrias nuevas para absorberlos.',
          },
          {
            en: 'If driving becomes fully automated, millions of professional drivers will suddenly need new careers.',
            native:
              'Si la conducción se automatiza por completo, millones de conductores profesionales necesitarán de repente nuevas carreras.',
          },
          {
            en: 'Productivity gains are celebrated by shareholders, but the benefits are rarely shared with those displaced.',
            native:
              'Los accionistas celebran las ganancias de productividad, pero los beneficios rara vez se comparten con los desplazados.',
          },
        ],
      },
      zh: {
        word: '自动化',
        question: '自动化摧毁的工作岗位会比它创造的更多吗？谁应该为失业的工人负责？',
        examples: [
          {
            en: 'Machines have replaced workers before, although new industries have usually appeared to absorb them.',
            native: '机器以前就取代过工人，尽管通常会有新产业出现来吸纳他们。',
          },
          {
            en: 'If driving becomes fully automated, millions of professional drivers will suddenly need new careers.',
            native: '如果驾驶完全自动化，数百万职业司机将突然需要新的职业。',
          },
          {
            en: 'Productivity gains are celebrated by shareholders, but the benefits are rarely shared with those displaced.',
            native: '股东们庆祝生产率的提升，但收益很少与被取代的工人分享。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'e-commerce',
    questionText: 'Is online shopping destroying local shops, and does it matter if it is?',
    translations: {
      te: {
        word: 'ఇ-కామర్స్',
        question: 'ఆన్‌లైన్ షాపింగ్ స్థానిక దుకాణాలను నాశనం చేస్తోందా, మరియు అలా జరిగితే అది పట్టించుకోవలసిన విషయమేనా?',
        examples: [
          {
            en: 'Online shopping is faster and cheaper, although something important disappears with empty main streets.',
            native:
              'ఆన్‌లైన్ షాపింగ్ వేగంగా మరియు చవకగా ఉంటుంది, అయితే ఖాళీ అయిన ప్రధాన వీధులతో ఏదో ముఖ్యమైనది అదృశ్యమవుతుంది.',
          },
          {
            en: 'If local shops vanished completely, elderly people without cars would be affected most severely.',
            native: 'స్థానిక దుకాణాలు పూర్తిగా అదృశ్యమైతే, కార్లు లేని వృద్ధులు అత్యంత తీవ్రంగా ప్రభావితమవుతారు.',
          },
          {
            en: 'Returns are made so easy that customers order five sizes and send four back.',
            native: 'రిటర్న్లు చాలా సులభం చేయబడ్డాయి కాబట్టి కస్టమర్లు ఐదు సైజులు ఆర్డర్ చేసి నాలుగు తిరిగి పంపుతారు.',
          },
        ],
      },
      hi: {
        word: 'ई-कॉमर्स',
        question: 'क्या ऑनलाइन ख़रीदारी स्थानीय दुकानों को नष्ट कर रही है, और क्या यह मायने रखता है?',
        examples: [
          {
            en: 'Online shopping is faster and cheaper, although something important disappears with empty main streets.',
            native: 'ऑनलाइन ख़रीदारी तेज़ और सस्ती है, हालाँकि खाली बाज़ारों के साथ कुछ महत्वपूर्ण गायब हो जाता है।',
          },
          {
            en: 'If local shops vanished completely, elderly people without cars would be affected most severely.',
            native:
              'अगर स्थानीय दुकानें पूरी तरह गायब हो जाएँ, तो बिना गाड़ी वाले बुज़ुर्ग सबसे ज़्यादा प्रभावित होंगे।',
          },
          {
            en: 'Returns are made so easy that customers order five sizes and send four back.',
            native: 'रिटर्न इतना आसान बना दिया गया है कि ग्राहक पाँच साइज़ मँगाकर चार वापस भेज देते हैं।',
          },
        ],
      },
      es: {
        word: 'comercio electrónico',
        question: '¿Están las compras en línea destruyendo las tiendas locales, y importa que lo hagan?',
        examples: [
          {
            en: 'Online shopping is faster and cheaper, although something important disappears with empty main streets.',
            native:
              'Comprar en línea es más rápido y barato, aunque algo importante desaparece con las calles principales vacías.',
          },
          {
            en: 'If local shops vanished completely, elderly people without cars would be affected most severely.',
            native:
              'Si las tiendas locales desaparecieran por completo, las personas mayores sin coche serían las más afectadas.',
          },
          {
            en: 'Returns are made so easy that customers order five sizes and send four back.',
            native: 'Las devoluciones son tan fáciles que los clientes piden cinco tallas y devuelven cuatro.',
          },
        ],
      },
      zh: {
        word: '电子商务',
        question: '网购正在摧毁本地商店吗？如果是，这重要吗？',
        examples: [
          {
            en: 'Online shopping is faster and cheaper, although something important disappears with empty main streets.',
            native: '网购更快更便宜，尽管随着主街变得空荡荡，一些重要的东西也在消失。',
          },
          {
            en: 'If local shops vanished completely, elderly people without cars would be affected most severely.',
            native: '如果本地商店完全消失，没有车的老人将受到最严重的影响。',
          },
          {
            en: 'Returns are made so easy that customers order five sizes and send four back.',
            native: '退货被弄得如此容易，以至于顾客订五个尺码再退回四个。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'banking',
    questionText: 'Do banks serve ordinary people fairly, or do they mainly protect their own interests?',
    translations: {
      te: {
        word: 'బ్యాంకింగ్',
        question: 'బ్యాంకులు సాధారణ ప్రజలకు న్యాయంగా సేవ చేస్తాయా, లేక అవి ప్రధానంగా తమ స్వార్థాలనే కాపాడుతాయా?',
        examples: [
          {
            en: 'Banks are trusted with our savings, although their mistakes are often paid for by taxpayers.',
            native:
              'మన పొదుపులతో బ్యాంకులను నమ్ముతాం, అయితే వాటి తప్పుల ఖర్చు తరచుగా పన్ను చెల్లించేవారు చెల్లిస్తారు.',
          },
          {
            en: 'If banking fees were made fully transparent, millions of customers would switch providers immediately.',
            native:
              'బ్యాంకింగ్ రుసుములు పూర్తిగా పారదర్శకం చేయబడితే, లక్షలాది మంది కస్టమర్లు వెంటనే ప్రొవైడర్లను మారుస్తారు.',
          },
          {
            en: 'Small businesses struggle to get loans, yet large bonuses continue to be paid at the top.',
            native:
              'చిన్న వ్యాపారాలు రుణాలు పొందడానికి ఇబ్బంది పడుతాయి, అయితే పైస్థాయిలో పెద్ద బోనస్లు ఇవ్వడం కొనసాగుతూనే ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'बैंकिंग',
        question: 'क्या बैंक आम लोगों की निष्पक्ष सेवा करते हैं, या वे मुख्य रूप से अपने हितों की रक्षा करते हैं?',
        examples: [
          {
            en: 'Banks are trusted with our savings, although their mistakes are often paid for by taxpayers.',
            native:
              'हमारी बचत के साथ बैंकों पर भरोसा किया जाता है, हालाँकि उनकी गलतियों की कीमत अक्सर करदाता चुकाते हैं।',
          },
          {
            en: 'If banking fees were made fully transparent, millions of customers would switch providers immediately.',
            native: 'अगर बैंकिंग शुल्क पूरी तरह पारदर्शी कर दिया जाए, तो लाखों ग्राहक तुरंत प्रदाता बदल लेंगे।',
          },
          {
            en: 'Small businesses struggle to get loans, yet large bonuses continue to be paid at the top.',
            native: 'छोटे कारोबारों को कर्ज़ मिलने में संघर्ष करना पड़ता है, फिर भी ऊपर बड़े बोनस दिए जाते रहते हैं।',
          },
        ],
      },
      es: {
        word: 'banca',
        question:
          '¿Sirven los bancos con justicia a la gente corriente, o protegen principalmente sus propios intereses?',
        examples: [
          {
            en: 'Banks are trusted with our savings, although their mistakes are often paid for by taxpayers.',
            native:
              'Se confía a los bancos nuestros ahorros, aunque sus errores a menudo los pagan los contribuyentes.',
          },
          {
            en: 'If banking fees were made fully transparent, millions of customers would switch providers immediately.',
            native:
              'Si las comisiones bancarias fueran totalmente transparentes, millones de clientes cambiarían de proveedor inmediatamente.',
          },
          {
            en: 'Small businesses struggle to get loans, yet large bonuses continue to be paid at the top.',
            native:
              'Las pequeñas empresas luchan por conseguir préstamos, mientras en las cúpulas se siguen pagando grandes bonificaciones.',
          },
        ],
      },
      zh: {
        word: '银行业',
        question: '银行是否公平地为普通人服务，还是它们主要在维护自己的利益？',
        examples: [
          {
            en: 'Banks are trusted with our savings, although their mistakes are often paid for by taxpayers.',
            native: '我们把积蓄托付给银行，尽管它们的错误常常由纳税人买单。',
          },
          {
            en: 'If banking fees were made fully transparent, millions of customers would switch providers immediately.',
            native: '如果银行费用完全透明，数百万客户会立即更换银行。',
          },
          {
            en: 'Small businesses struggle to get loans, yet large bonuses continue to be paid at the top.',
            native: '小企业很难获得贷款，而高层却继续领取高额奖金。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'investment',
    questionText: 'Should ordinary people invest in the stock market, or is it too risky for most savers?',
    translations: {
      te: {
        word: 'పెట్టుబడి',
        question: 'సాధారణ ప్రజలు స్టాక్ మార్కెట్‌లో పెట్టుబడి పెట్టాలా, లేక చాలామంది పొదుపుదారులకు అది చాలా రిస్కీనా?',
        examples: [
          {
            en: 'Investing builds wealth slowly over decades, although panic selling destroys it in a week.',
            native:
              'పెట్టుబడి దశాబ్దాలుగా నెమ్మదిగా సంపదను నిర్మిస్తుంది, అయితే భయంతో అమ్మేయడం దాన్ని వారంలో నాశనం చేస్తుంది.',
          },
          {
            en: 'If financial education were truly universal, far fewer people would fall for guaranteed-return scams.',
            native: 'ఆర్థిక విద్య నిజంగా సార్వత్రికం అయితే, హామీ ఇచ్చిన రిటర్న్ మోసాలకు చాలా తక్కువ మంది బలవుతారు.',
          },
          {
            en: 'Cash left in savings accounts loses value quietly, but markets can crash without warning.',
            native:
              'పొదుపు ఖాతాల్లో ఉంచిన నగదు నిశ్శబ్దంగా విలువ కోల్పోతుంది, కానీ మార్కెట్లు హెచ్చరిక లేకుండా కూలిపోవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'निवेश',
        question:
          'क्या आम लोगों को शेयर बाज़ार में निवेश करना चाहिए, या यह ज़्यादातर बचतकर्ताओं के लिए बहुत जोखिम भरा है?',
        examples: [
          {
            en: 'Investing builds wealth slowly over decades, although panic selling destroys it in a week.',
            native:
              'निवेश दशकों में धीरे-धीरे दौलत बनाता है, हालाँकि घबराहट में बेचने से वह एक हफ़्ते में नष्ट हो जाती है।',
          },
          {
            en: 'If financial education were truly universal, far fewer people would fall for guaranteed-return scams.',
            native: 'अगर वित्तीय शिक्षा सच में सार्वभौमिक हो, तो गारंटीड रिटर्न वाले घोटालों में काफ़ी कम लोग फँसेंगे।',
          },
          {
            en: 'Cash left in savings accounts loses value quietly, but markets can crash without warning.',
            native: 'बचत खातों में रखा नकद चुपचाप मूल्य खोता है, लेकिन बाज़ार बिना चेतावनी के गिर भी सकते हैं।',
          },
        ],
      },
      es: {
        word: 'inversión',
        question:
          '¿Debería la gente corriente invertir en bolsa, o es demasiado arriesgado para la mayoría de los ahorradores?',
        examples: [
          {
            en: 'Investing builds wealth slowly over decades, although panic selling destroys it in a week.',
            native:
              'Invertir construye riqueza lentamente durante décadas, aunque vender presa del pánico la destruye en una semana.',
          },
          {
            en: 'If financial education were truly universal, far fewer people would fall for guaranteed-return scams.',
            native:
              'Si la educación financiera fuera verdaderamente universal, mucha menos gente caería en estafas de rentabilidad garantizada.',
          },
          {
            en: 'Cash left in savings accounts loses value quietly, but markets can crash without warning.',
            native:
              'El efectivo guardado en cuentas de ahorro pierde valor silenciosamente, pero los mercados pueden desplomarse sin aviso.',
          },
        ],
      },
      zh: {
        word: '投资',
        question: '普通人应该投资股市吗，还是对大多数储户来说风险太大？',
        examples: [
          {
            en: 'Investing builds wealth slowly over decades, although panic selling destroys it in a week.',
            native: '投资能在几十年间慢慢积累财富，尽管恐慌性抛售能在一周内将其毁掉。',
          },
          {
            en: 'If financial education were truly universal, far fewer people would fall for guaranteed-return scams.',
            native: '如果金融教育真正普及，落入保证回报骗局的人会少得多。',
          },
          {
            en: 'Cash left in savings accounts loses value quietly, but markets can crash without warning.',
            native: '存在储蓄账户里的现金悄悄贬值，但市场也可能毫无预警地崩盘。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'debt',
    questionText: 'Is borrowing money a normal part of modern life, or should debt be avoided at all costs?',
    translations: {
      te: {
        word: 'అప్పు',
        question: 'డబ్బు అప్పు చేయడం ఆధునిక జీవితంలో సాధారణ భాగమేనా, లేక అప్పును ఏ ధరైనా తప్పించుకోవాలా?',
        examples: [
          {
            en: 'Debt allows families to buy homes, although it quietly transfers future freedom to lenders.',
            native:
              'అప్పు కుటుంబాలు ఇళ్లు కొనడానికి అనుమతిస్తుంది, అయితే అది నిశ్శబ్దంగా భవిష్యత్ స్వేచ్ఛను రుణదాతలకు బదిలీ చేస్తుంది.',
          },
          {
            en: 'If credit cards explained their true costs clearly, fewer young people would fall into debt.',
            native: 'క్రెడిట్ కార్డులు తమ నిజమైన ఖర్చులను స్పష్టంగా వివరిస్తే, తక్కువ మంది యువకులు అప్పులో పడతారు.',
          },
          {
            en: 'Student loans are often described as investments, but repayments can follow graduates for decades.',
            native:
              'విద్యార్థి రుణాలను తరచుగా పెట్టుబడులుగా వర్ణిస్తారు, కానీ వాటి తిరిగి చెల్లింపులు గ్రాడ్యుయేట్లను దశాబ్దాలపాటు వెంబడించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'कर्ज़',
        question: 'क्या पैसा उधार लेना आधुनिक जीवन का सामान्य हिस्सा है, या कर्ज़ से हर कीमत पर बचना चाहिए?',
        examples: [
          {
            en: 'Debt allows families to buy homes, although it quietly transfers future freedom to lenders.',
            native:
              'कर्ज़ परिवारों को घर ख़रीदने देता है, हालाँकि यह चुपचाप भविष्य की आज़ादी ऋणदाताओं को सौंप देता है।',
          },
          {
            en: 'If credit cards explained their true costs clearly, fewer young people would fall into debt.',
            native: 'अगर क्रेडिट कार्ड अपनी असली लागत साफ़ बताएँ, तो कम युवा कर्ज़ में फँसेंगे।',
          },
          {
            en: 'Student loans are often described as investments, but repayments can follow graduates for decades.',
            native: 'छात्र ऋण को अक्सर निवेश बताया जाता है, लेकिन उसकी किश्तें स्नातकों का दशकों तक पीछा कर सकती हैं।',
          },
        ],
      },
      es: {
        word: 'deuda',
        question: '¿Es endeudarse una parte normal de la vida moderna, o debería evitarse la deuda a toda costa?',
        examples: [
          {
            en: 'Debt allows families to buy homes, although it quietly transfers future freedom to lenders.',
            native:
              'La deuda permite a las familias comprar viviendas, aunque transfiere silenciosamente libertad futura a los prestamistas.',
          },
          {
            en: 'If credit cards explained their true costs clearly, fewer young people would fall into debt.',
            native:
              'Si las tarjetas de crédito explicaran claramente sus costes reales, menos jóvenes caerían en deudas.',
          },
          {
            en: 'Student loans are often described as investments, but repayments can follow graduates for decades.',
            native:
              'Los préstamos estudiantiles se describen a menudo como inversiones, pero los pagos pueden perseguir a los graduados durante décadas.',
          },
        ],
      },
      zh: {
        word: '债务',
        question: '借钱是现代生活的常态，还是应该不惜一切代价避免负债？',
        examples: [
          {
            en: 'Debt allows families to buy homes, although it quietly transfers future freedom to lenders.',
            native: '债务让家庭能够买房，尽管它悄悄地把未来的自由转移给了放贷人。',
          },
          {
            en: 'If credit cards explained their true costs clearly, fewer young people would fall into debt.',
            native: '如果信用卡清楚地说明真实成本，陷入债务的年轻人会减少。',
          },
          {
            en: 'Student loans are often described as investments, but repayments can follow graduates for decades.',
            native: '学生贷款常被描述为投资，但还款可能伴随毕业生数十年。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'digital literacy',
    questionText: 'Which digital skills are essential in modern life, and how should schools help people develop them?',
    translations: {
      te: {
        word: 'డిజిటల్ అక్షరాస్యత',
        question:
          'ఆధునిక జీవితంలో ఏ డిజిటల్ నైపుణ్యాలు అవసరం, వాటిని అభివృద్ధి చేసుకోవడంలో పాఠశాలలు ప్రజలకు ఎలా సహాయపడాలి?',
        examples: [
          {
            en: 'Digital literacy involves judging online information, not merely knowing how to operate a device.',
            native:
              'డిజిటల్ అక్షరాస్యత అంటే కేవలం పరికరాన్ని ఎలా ఉపయోగించాలో తెలుసుకోవడం కాకుండా, ఆన్‌లైన్ సమాచారాన్ని అంచనా వేయడం కూడా.',
          },
          {
            en: 'Schools should teach students how algorithms influence the content they see.',
            native: 'అల్గోరిథమ్‌లు విద్యార్థులు చూసే కంటెంట్‌ను ఎలా ప్రభావితం చేస్తాయో పాఠశాలలు వారికి బోధించాలి.',
          },
          {
            en: 'Without practical guidance, even confident users can expose themselves to fraud.',
            native:
              'ఆచరణాత్మక మార్గదర్శకత్వం లేకపోతే, ఆత్మవిశ్వాసం ఉన్న వినియోగదారులు కూడా మోసానికి గురయ్యే ప్రమాదంలో పడవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'डिजिटल साक्षरता',
        question:
          'आधुनिक जीवन में कौन-से डिजिटल कौशल आवश्यक हैं, और उन्हें विकसित करने में स्कूलों को लोगों की कैसे मदद करनी चाहिए?',
        examples: [
          {
            en: 'Digital literacy involves judging online information, not merely knowing how to operate a device.',
            native: 'डिजिटल साक्षरता में ऑनलाइन जानकारी का आकलन करना शामिल है, केवल किसी उपकरण को चलाना जानना नहीं।',
          },
          {
            en: 'Schools should teach students how algorithms influence the content they see.',
            native:
              'स्कूलों को छात्रों को सिखाना चाहिए कि एल्गोरिदम उनके सामने आने वाली सामग्री को कैसे प्रभावित करते हैं।',
          },
          {
            en: 'Without practical guidance, even confident users can expose themselves to fraud.',
            native:
              'व्यावहारिक मार्गदर्शन के बिना आत्मविश्वासी उपयोगकर्ता भी खुद को धोखाधड़ी के जोखिम में डाल सकते हैं।',
          },
        ],
      },
      es: {
        word: 'alfabetización digital',
        question:
          '¿Qué habilidades digitales son esenciales en la vida moderna y cómo deberían ayudar las escuelas a desarrollarlas?',
        examples: [
          {
            en: 'Digital literacy involves judging online information, not merely knowing how to operate a device.',
            native:
              'La alfabetización digital implica evaluar la información en línea, no solo saber utilizar un dispositivo.',
          },
          {
            en: 'Schools should teach students how algorithms influence the content they see.',
            native: 'Las escuelas deberían enseñar al alumnado cómo influyen los algoritmos en el contenido que ve.',
          },
          {
            en: 'Without practical guidance, even confident users can expose themselves to fraud.',
            native: 'Sin orientación práctica, incluso los usuarios seguros de sí mismos pueden exponerse al fraude.',
          },
        ],
      },
      zh: {
        word: '数字素养',
        question: '现代生活中哪些数字技能必不可少，学校应该如何帮助人们培养这些技能？',
        examples: [
          {
            en: 'Digital literacy involves judging online information, not merely knowing how to operate a device.',
            native: '数字素养包括判断网络信息，而不仅仅是会操作设备。',
          },
          {
            en: 'Schools should teach students how algorithms influence the content they see.',
            native: '学校应该教学生了解算法如何影响他们看到的内容。',
          },
          {
            en: 'Without practical guidance, even confident users can expose themselves to fraud.',
            native: '如果没有实际指导，即使自信的用户也可能使自己面临诈骗风险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'cybersecurity',
    questionText: 'How should individuals, businesses, and governments share responsibility for cybersecurity?',
    translations: {
      te: {
        word: 'సైబర్ భద్రత',
        question: 'సైబర్ భద్రత బాధ్యతను వ్యక్తులు, వ్యాపార సంస్థలు మరియు ప్రభుత్వాలు ఎలా పంచుకోవాలి?',
        examples: [
          {
            en: 'Strong passwords matter, but organizations must also design systems that remain secure when people make mistakes.',
            native:
              'బలమైన పాస్‌వర్డ్‌లు ముఖ్యమే, కానీ ప్రజలు తప్పులు చేసినప్పుడు కూడా సురక్షితంగా ఉండే వ్యవస్థలను సంస్థలు రూపొందించాలి.',
          },
          {
            en: 'Companies should report serious data breaches promptly instead of protecting their reputation.',
            native:
              'కంపెనీలు తమ ప్రతిష్ఠను కాపాడుకోవడానికి ప్రయత్నించకుండా, తీవ్రమైన డేటా ఉల్లంఘనలను వెంటనే నివేదించాలి.',
          },
          {
            en: 'If governments impose sensible standards, essential services will be harder for criminals to disrupt.',
            native:
              'ప్రభుత్వాలు సమంజసమైన ప్రమాణాలను విధిస్తే, నేరస్థులు అత్యవసర సేవలకు అంతరాయం కలిగించడం మరింత కష్టమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'साइबर सुरक्षा',
        question: 'व्यक्तियों, व्यवसायों और सरकारों को साइबर सुरक्षा की ज़िम्मेदारी किस तरह साझा करनी चाहिए?',
        examples: [
          {
            en: 'Strong passwords matter, but organizations must also design systems that remain secure when people make mistakes.',
            native:
              'मज़बूत पासवर्ड महत्वपूर्ण हैं, लेकिन संगठनों को ऐसे सिस्टम भी बनाने चाहिए जो लोगों से गलती होने पर भी सुरक्षित रहें।',
          },
          {
            en: 'Companies should report serious data breaches promptly instead of protecting their reputation.',
            native: 'कंपनियों को अपनी प्रतिष्ठा बचाने के बजाय गंभीर डेटा उल्लंघनों की तुरंत सूचना देनी चाहिए।',
          },
          {
            en: 'If governments impose sensible standards, essential services will be harder for criminals to disrupt.',
            native:
              'अगर सरकारें समझदारी भरे मानक लागू करें, तो अपराधियों के लिए आवश्यक सेवाओं को बाधित करना कठिन होगा।',
          },
        ],
      },
      es: {
        word: 'ciberseguridad',
        question:
          '¿Cómo deberían repartirse la responsabilidad de la ciberseguridad las personas, las empresas y los gobiernos?',
        examples: [
          {
            en: 'Strong passwords matter, but organizations must also design systems that remain secure when people make mistakes.',
            native:
              'Las contraseñas seguras importan, pero las organizaciones también deben diseñar sistemas que sigan siendo seguros cuando la gente se equivoca.',
          },
          {
            en: 'Companies should report serious data breaches promptly instead of protecting their reputation.',
            native:
              'Las empresas deberían informar rápidamente de las filtraciones graves de datos en vez de proteger su reputación.',
          },
          {
            en: 'If governments impose sensible standards, essential services will be harder for criminals to disrupt.',
            native:
              'Si los gobiernos imponen normas sensatas, será más difícil que los delincuentes interrumpan los servicios esenciales.',
          },
        ],
      },
      zh: {
        word: '网络安全',
        question: '个人、企业和政府应该如何共同承担网络安全责任？',
        examples: [
          {
            en: 'Strong passwords matter, but organizations must also design systems that remain secure when people make mistakes.',
            native: '高强度密码很重要，但组织也必须设计出在人们犯错时仍能保持安全的系统。',
          },
          {
            en: 'Companies should report serious data breaches promptly instead of protecting their reputation.',
            native: '公司应该及时报告严重的数据泄露，而不是只顾维护自己的声誉。',
          },
          {
            en: 'If governments impose sensible standards, essential services will be harder for criminals to disrupt.',
            native: '如果政府制定合理的标准，犯罪分子就更难破坏基本服务。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'misinformation',
    questionText:
      'Why does misinformation spread so quickly, and what should individuals and online platforms do about it?',
    translations: {
      te: {
        word: 'తప్పుడు సమాచారం',
        question:
          'తప్పుడు సమాచారం ఎందుకు అంత వేగంగా వ్యాపిస్తుంది, దాని గురించి వ్యక్తులు మరియు ఆన్‌లైన్ వేదికలు ఏమి చేయాలి?',
        examples: [
          {
            en: 'False claims often spread because they provoke a stronger emotional reaction than careful reporting.',
            native:
              'జాగ్రత్తగా చేసిన వార్తా నివేదికల కంటే తప్పుడు వాదనలు బలమైన భావోద్వేగ స్పందనను కలిగిస్తాయి కాబట్టి అవి తరచుగా వ్యాపిస్తాయి.',
          },
          {
            en: 'Before sharing a dramatic story, people should check its source, date, and supporting evidence.',
            native:
              'సంచలనాత్మక కథనాన్ని పంచుకునే ముందు, ప్రజలు దాని మూలం, తేదీ మరియు దానికి మద్దతు ఇచ్చే ఆధారాలను తనిఖీ చేయాలి.',
          },
          {
            en: 'Platforms could reduce harm without censoring debate by adding context from independent experts.',
            native:
              'స్వతంత్ర నిపుణుల సందర్భ వివరణను జోడించడం ద్వారా వేదికలు చర్చను సెన్సార్ చేయకుండానే హానిని తగ్గించగలవు.',
          },
        ],
      },
      hi: {
        word: 'भ्रामक जानकारी',
        question:
          'भ्रामक जानकारी इतनी तेज़ी से क्यों फैलती है, और व्यक्तियों तथा ऑनलाइन मंचों को इसके बारे में क्या करना चाहिए?',
        examples: [
          {
            en: 'False claims often spread because they provoke a stronger emotional reaction than careful reporting.',
            native:
              'झूठे दावे अक्सर इसलिए फैलते हैं क्योंकि वे सावधानी से की गई रिपोर्टिंग की तुलना में अधिक तीखी भावनात्मक प्रतिक्रिया पैदा करते हैं।',
          },
          {
            en: 'Before sharing a dramatic story, people should check its source, date, and supporting evidence.',
            native:
              'किसी सनसनीखेज़ खबर को साझा करने से पहले लोगों को उसके स्रोत, तारीख और सहायक प्रमाण की जाँच करनी चाहिए।',
          },
          {
            en: 'Platforms could reduce harm without censoring debate by adding context from independent experts.',
            native: 'मंच स्वतंत्र विशेषज्ञों का संदर्भ जोड़कर बहस को सेंसर किए बिना नुकसान कम कर सकते हैं।',
          },
        ],
      },
      es: {
        word: 'desinformación',
        question:
          '¿Por qué se difunde tan rápido la desinformación y qué deberían hacer al respecto las personas y las plataformas digitales?',
        examples: [
          {
            en: 'False claims often spread because they provoke a stronger emotional reaction than careful reporting.',
            native:
              'Las afirmaciones falsas suelen difundirse porque provocan una reacción emocional más fuerte que la información rigurosa.',
          },
          {
            en: 'Before sharing a dramatic story, people should check its source, date, and supporting evidence.',
            native:
              'Antes de compartir una historia impactante, la gente debería comprobar su fuente, fecha y pruebas de respaldo.',
          },
          {
            en: 'Platforms could reduce harm without censoring debate by adding context from independent experts.',
            native:
              'Las plataformas podrían reducir el daño sin censurar el debate si añadieran contexto de expertos independientes.',
          },
        ],
      },
      zh: {
        word: '错误信息',
        question: '错误信息为何传播得如此迅速，个人和网络平台应该如何应对？',
        examples: [
          {
            en: 'False claims often spread because they provoke a stronger emotional reaction than careful reporting.',
            native: '虚假说法往往会传播开来，因为它们比严谨的报道更容易引发强烈的情绪反应。',
          },
          {
            en: 'Before sharing a dramatic story, people should check its source, date, and supporting evidence.',
            native: '在分享耸人听闻的消息之前，人们应该核查其来源、日期和佐证。',
          },
          {
            en: 'Platforms could reduce harm without censoring debate by adding context from independent experts.',
            native: '平台可以补充独立专家提供的背景信息，在不审查讨论的情况下减少危害。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'public health',
    questionText: 'When, if ever, should governments restrict individual choices to protect public health?',
    translations: {
      te: {
        word: 'ప్రజారోగ్యం',
        question:
          'ప్రజారోగ్యాన్ని కాపాడటానికి ప్రభుత్వాలు వ్యక్తిగత ఎంపికలను ఎప్పుడు పరిమితం చేయాలి, లేదా అసలు పరిమితం చేయకూడదా?',
        examples: [
          {
            en: "Public health measures are justified when one person's decision creates a serious risk for others.",
            native:
              'ఒక వ్యక్తి నిర్ణయం ఇతరులకు తీవ్రమైన ప్రమాదాన్ని కలిగించినప్పుడు ప్రజారోగ్య చర్యలు సమర్థనీయమవుతాయి.',
          },
          {
            en: 'However, restrictions should be based on evidence, limited in time, and explained transparently.',
            native:
              'అయితే, పరిమితులు ఆధారాలపై ఉండాలి, నిర్ణీత కాలానికే వర్తించాలి మరియు వాటిని పారదర్శకంగా వివరించాలి.',
          },
          {
            en: 'Trust is more likely to grow when communities are involved in designing health campaigns.',
            native:
              'ఆరోగ్య ప్రచారాల రూపకల్పనలో సమాజాలను భాగస్వామ్యం చేసినప్పుడు నమ్మకం పెరిగే అవకాశం ఎక్కువగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'जन स्वास्थ्य',
        question:
          'सरकारों को जन स्वास्थ्य की रक्षा के लिए लोगों की व्यक्तिगत पसंद पर कब, अगर कभी, प्रतिबंध लगाना चाहिए?',
        examples: [
          {
            en: "Public health measures are justified when one person's decision creates a serious risk for others.",
            native:
              'जब एक व्यक्ति का निर्णय दूसरों के लिए गंभीर जोखिम पैदा करता है, तब जन स्वास्थ्य के उपाय उचित होते हैं।',
          },
          {
            en: 'However, restrictions should be based on evidence, limited in time, and explained transparently.',
            native: 'हालाँकि, प्रतिबंध प्रमाण पर आधारित, सीमित अवधि के और पारदर्शी ढंग से समझाए गए होने चाहिए।',
          },
          {
            en: 'Trust is more likely to grow when communities are involved in designing health campaigns.',
            native:
              'जब स्वास्थ्य अभियानों को तैयार करने में समुदायों को शामिल किया जाता है, तो भरोसा बढ़ने की संभावना अधिक होती है।',
          },
        ],
      },
      es: {
        word: 'salud pública',
        question:
          '¿Cuándo, si acaso, deberían los gobiernos limitar las decisiones individuales para proteger la salud pública?',
        examples: [
          {
            en: "Public health measures are justified when one person's decision creates a serious risk for others.",
            native:
              'Las medidas de salud pública están justificadas cuando la decisión de una persona crea un riesgo grave para los demás.',
          },
          {
            en: 'However, restrictions should be based on evidence, limited in time, and explained transparently.',
            native:
              'Sin embargo, las restricciones deberían basarse en pruebas, limitarse en el tiempo y explicarse con transparencia.',
          },
          {
            en: 'Trust is more likely to grow when communities are involved in designing health campaigns.',
            native:
              'Es más probable que aumente la confianza cuando las comunidades participan en el diseño de las campañas sanitarias.',
          },
        ],
      },
      zh: {
        word: '公共卫生',
        question: '政府在什么情况下应该限制个人选择以保护公共卫生，还是根本不应该这样做？',
        examples: [
          {
            en: "Public health measures are justified when one person's decision creates a serious risk for others.",
            native: '当一个人的决定给他人带来严重风险时，公共卫生措施就是合理的。',
          },
          {
            en: 'However, restrictions should be based on evidence, limited in time, and explained transparently.',
            native: '不过，限制措施应以证据为依据、有明确期限，并得到透明的解释。',
          },
          {
            en: 'Trust is more likely to grow when communities are involved in designing health campaigns.',
            native: '让社区参与设计健康宣传活动，更有可能增进信任。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'mental health',
    questionText: "How can workplaces and schools support mental health without invading people's privacy?",
    translations: {
      te: {
        word: 'మానసిక ఆరోగ్యం',
        question: 'ప్రజల గోప్యతకు భంగం కలిగించకుండా కార్యాలయాలు మరియు పాఠశాలలు మానసిక ఆరోగ్యానికి ఎలా మద్దతు ఇవ్వగలవు?',
        examples: [
          {
            en: 'Institutions should make confidential counselling easy to access before a problem becomes a crisis.',
            native: 'సమస్య సంక్షోభంగా మారకముందే గోప్యమైన కౌన్సెలింగ్ సులభంగా అందుబాటులో ఉండేలా సంస్థలు చూడాలి.',
          },
          {
            en: 'Managers and teachers need training to notice warning signs without making assumptions.',
            native: 'ఊహాగానాలు చేయకుండా హెచ్చరిక సంకేతాలను గుర్తించడానికి మేనేజర్లు మరియు ఉపాధ్యాయులకు శిక్షణ అవసరం.',
          },
          {
            en: 'A supportive culture allows people to request reasonable adjustments without fearing discrimination.',
            native: 'మద్దతు ఇచ్చే సంస్కృతి, వివక్షకు భయపడకుండా తగిన మార్పులను కోరడానికి ప్రజలకు అవకాశం ఇస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'मानसिक स्वास्थ्य',
        question: 'कार्यस्थल और स्कूल लोगों की निजता में दखल दिए बिना मानसिक स्वास्थ्य का समर्थन कैसे कर सकते हैं?',
        examples: [
          {
            en: 'Institutions should make confidential counselling easy to access before a problem becomes a crisis.',
            native: 'समस्या के संकट बनने से पहले संस्थानों को गोपनीय परामर्श आसानी से उपलब्ध कराना चाहिए।',
          },
          {
            en: 'Managers and teachers need training to notice warning signs without making assumptions.',
            native: 'प्रबंधकों और शिक्षकों को बिना अनुमान लगाए चेतावनी के संकेत पहचानने का प्रशिक्षण चाहिए।',
          },
          {
            en: 'A supportive culture allows people to request reasonable adjustments without fearing discrimination.',
            native: 'सहयोगी संस्कृति लोगों को भेदभाव के डर के बिना उचित बदलाव माँगने की सुविधा देती है।',
          },
        ],
      },
      es: {
        word: 'salud mental',
        question:
          '¿Cómo pueden los lugares de trabajo y las escuelas apoyar la salud mental sin invadir la privacidad de las personas?',
        examples: [
          {
            en: 'Institutions should make confidential counselling easy to access before a problem becomes a crisis.',
            native:
              'Las instituciones deberían facilitar el acceso a orientación confidencial antes de que un problema se convierta en una crisis.',
          },
          {
            en: 'Managers and teachers need training to notice warning signs without making assumptions.',
            native:
              'Los responsables y docentes necesitan formación para detectar señales de alarma sin hacer suposiciones.',
          },
          {
            en: 'A supportive culture allows people to request reasonable adjustments without fearing discrimination.',
            native: 'Una cultura de apoyo permite pedir adaptaciones razonables sin temor a la discriminación.',
          },
        ],
      },
      zh: {
        word: '心理健康',
        question: '工作场所和学校如何在不侵犯个人隐私的前提下支持心理健康？',
        examples: [
          {
            en: 'Institutions should make confidential counselling easy to access before a problem becomes a crisis.',
            native: '机构应该让人们在问题演变成危机之前，能够方便地获得保密咨询。',
          },
          {
            en: 'Managers and teachers need training to notice warning signs without making assumptions.',
            native: '管理人员和教师需要接受培训，以便在不妄加猜测的情况下发现警示信号。',
          },
          {
            en: 'A supportive culture allows people to request reasonable adjustments without fearing discrimination.',
            native: '支持性的文化能让人们在不担心受到歧视的情况下提出合理的调整要求。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'housing',
    questionText:
      'Why has affordable housing become difficult to find in many cities, and which solutions seem fairest?',
    translations: {
      te: {
        word: 'గృహవసతి',
        question:
          'అనేక నగరాల్లో సరసమైన గృహవసతి దొరకడం ఎందుకు కష్టమైంది, ఏ పరిష్కారాలు అత్యంత న్యాయమైనవిగా అనిపిస్తున్నాయి?',
        examples: [
          {
            en: 'Demand has risen faster than construction, while many existing homes are treated primarily as investments.',
            native:
              'నిర్మాణం కంటే డిమాండ్ వేగంగా పెరిగింది, అదే సమయంలో ఇప్పటికే ఉన్న అనేక ఇళ్లను ప్రధానంగా పెట్టుబడులుగా చూస్తున్నారు.',
          },
          {
            en: 'Cities could require new developments to include homes that ordinary workers can afford.',
            native:
              'సాధారణ ఉద్యోగులు కొనగలిగే ఇళ్లను కొత్త నిర్మాణ ప్రాజెక్టులు తప్పనిసరిగా కలిగి ఉండాలని నగరాలు నిబంధన పెట్టవచ్చు.',
          },
          {
            en: 'Rent controls may protect current tenants, but poorly designed rules can discourage new housing.',
            native:
              'అద్దె నియంత్రణలు ప్రస్తుత అద్దెదారులను రక్షించవచ్చు, కానీ సరిగా రూపొందించని నియమాలు కొత్త గృహ నిర్మాణాన్ని నిరుత్సాహపరచవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'आवास',
        question: 'कई शहरों में किफ़ायती आवास मिलना कठिन क्यों हो गया है, और कौन-से समाधान सबसे न्यायसंगत लगते हैं?',
        examples: [
          {
            en: 'Demand has risen faster than construction, while many existing homes are treated primarily as investments.',
            native:
              'निर्माण की तुलना में माँग तेज़ी से बढ़ी है, जबकि कई मौजूदा घरों को मुख्य रूप से निवेश माना जाता है।',
          },
          {
            en: 'Cities could require new developments to include homes that ordinary workers can afford.',
            native: 'शहर नई परियोजनाओं में ऐसे घर शामिल करना अनिवार्य कर सकते हैं जिन्हें सामान्य कर्मचारी खरीद सकें।',
          },
          {
            en: 'Rent controls may protect current tenants, but poorly designed rules can discourage new housing.',
            native:
              'किराया नियंत्रण मौजूदा किरायेदारों की रक्षा कर सकता है, लेकिन खराब तरीके से बनाए गए नियम नए आवास निर्माण को हतोत्साहित कर सकते हैं।',
          },
        ],
      },
      es: {
        word: 'vivienda',
        question:
          '¿Por qué se ha vuelto difícil encontrar vivienda asequible en muchas ciudades y qué soluciones parecen más justas?',
        examples: [
          {
            en: 'Demand has risen faster than construction, while many existing homes are treated primarily as investments.',
            native:
              'La demanda ha aumentado más rápido que la construcción, mientras que muchas viviendas existentes se tratan principalmente como inversiones.',
          },
          {
            en: 'Cities could require new developments to include homes that ordinary workers can afford.',
            native:
              'Las ciudades podrían exigir que las nuevas promociones incluyan viviendas que los trabajadores corrientes puedan pagar.',
          },
          {
            en: 'Rent controls may protect current tenants, but poorly designed rules can discourage new housing.',
            native:
              'Los controles de alquiler pueden proteger a los inquilinos actuales, pero unas normas mal diseñadas pueden desalentar la construcción de vivienda.',
          },
        ],
      },
      zh: {
        word: '住房',
        question: '为什么许多城市越来越难找到可负担的住房，哪些解决办法最公平？',
        examples: [
          {
            en: 'Demand has risen faster than construction, while many existing homes are treated primarily as investments.',
            native: '需求增长快于住房建设，而许多现有房屋主要被当作投资品。',
          },
          {
            en: 'Cities could require new developments to include homes that ordinary workers can afford.',
            native: '城市可以要求新开发项目包含普通劳动者负担得起的住房。',
          },
          {
            en: 'Rent controls may protect current tenants, but poorly designed rules can discourage new housing.',
            native: '租金管制可能保护现有租户，但设计不当的规则会抑制新住房建设。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'tourism',
    questionText:
      'How can popular destinations benefit from tourism without damaging local communities and the environment?',
    translations: {
      te: {
        word: 'పర్యాటకం',
        question:
          'ప్రసిద్ధ పర్యాటక ప్రదేశాలు స్థానిక సమాజాలకు మరియు పర్యావరణానికి హాని కలిగించకుండా పర్యాటకం నుంచి ఎలా ప్రయోజనం పొందగలవు?',
        examples: [
          {
            en: 'Tourism creates jobs and funds cultural sites, yet overcrowding can make daily life difficult for residents.',
            native:
              'పర్యాటకం ఉద్యోగాలను సృష్టించి సాంస్కృతిక ప్రదేశాలకు నిధులు సమకూరుస్తుంది, అయినప్పటికీ అధిక రద్దీ స్థానికుల రోజువారీ జీవితాన్ని కష్టతరం చేయవచ్చు.',
          },
          {
            en: 'Visitors should respect local customs and spend money with locally owned businesses.',
            native: 'సందర్శకులు స్థానిక ఆచారాలను గౌరవించి, స్థానికుల యాజమాన్యంలోని వ్యాపారాల్లో ఖర్చు చేయాలి.',
          },
          {
            en: 'Limiting access during peak seasons may protect fragile places without ending tourism completely.',
            native:
              'రద్దీ సీజన్లలో ప్రవేశాన్ని పరిమితం చేయడం పర్యాటకాన్ని పూర్తిగా నిలిపివేయకుండానే సున్నితమైన ప్రదేశాలను రక్షించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'पर्यटन',
        question:
          'लोकप्रिय पर्यटन स्थल स्थानीय समुदायों और पर्यावरण को नुकसान पहुँचाए बिना पर्यटन से कैसे लाभ उठा सकते हैं?',
        examples: [
          {
            en: 'Tourism creates jobs and funds cultural sites, yet overcrowding can make daily life difficult for residents.',
            native:
              'पर्यटन रोज़गार पैदा करता है और सांस्कृतिक स्थलों के लिए धन जुटाता है, फिर भी अत्यधिक भीड़ निवासियों का दैनिक जीवन कठिन बना सकती है।',
          },
          {
            en: 'Visitors should respect local customs and spend money with locally owned businesses.',
            native:
              'आगंतुकों को स्थानीय रीति-रिवाजों का सम्मान करना चाहिए और स्थानीय स्वामित्व वाले व्यवसायों में पैसा खर्च करना चाहिए।',
          },
          {
            en: 'Limiting access during peak seasons may protect fragile places without ending tourism completely.',
            native:
              'व्यस्त मौसम में प्रवेश सीमित करने से पर्यटन को पूरी तरह बंद किए बिना नाज़ुक स्थानों की रक्षा हो सकती है।',
          },
        ],
      },
      es: {
        word: 'turismo',
        question:
          '¿Cómo pueden los destinos populares beneficiarse del turismo sin perjudicar a las comunidades locales ni al medio ambiente?',
        examples: [
          {
            en: 'Tourism creates jobs and funds cultural sites, yet overcrowding can make daily life difficult for residents.',
            native:
              'El turismo crea empleo y financia lugares culturales, pero la masificación puede dificultar la vida cotidiana de los residentes.',
          },
          {
            en: 'Visitors should respect local customs and spend money with locally owned businesses.',
            native: 'Los visitantes deberían respetar las costumbres locales y gastar en negocios de propiedad local.',
          },
          {
            en: 'Limiting access during peak seasons may protect fragile places without ending tourism completely.',
            native:
              'Limitar el acceso durante la temporada alta puede proteger lugares frágiles sin acabar por completo con el turismo.',
          },
        ],
      },
      zh: {
        word: '旅游业',
        question: '热门目的地如何在不损害当地社区和环境的情况下从旅游业中受益？',
        examples: [
          {
            en: 'Tourism creates jobs and funds cultural sites, yet overcrowding can make daily life difficult for residents.',
            native: '旅游业创造就业并为文化场所提供资金，但过度拥挤会给居民的日常生活带来困难。',
          },
          {
            en: 'Visitors should respect local customs and spend money with locally owned businesses.',
            native: '游客应该尊重当地习俗，并在本地人经营的商家消费。',
          },
          {
            en: 'Limiting access during peak seasons may protect fragile places without ending tourism completely.',
            native: '在旺季限制游客数量，可以在不彻底停止旅游的情况下保护脆弱地区。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'globalization',
    questionText: 'Has globalization improved lives overall, or has it created more problems than benefits?',
    translations: {
      te: {
        word: 'ప్రపంచీకరణ',
        question:
          'మొత్తంగా ప్రపంచీకరణ ప్రజల జీవితాలను మెరుగుపరిచిందా, లేక ప్రయోజనాల కంటే ఎక్కువ సమస్యలను సృష్టించిందా?',
        examples: [
          {
            en: 'Global trade has made many products cheaper, although some communities have lost stable industries.',
            native:
              'ప్రపంచ వాణిజ్యం అనేక ఉత్పత్తులను చౌకగా చేసింది, అయితే కొన్ని సమాజాలు స్థిరమైన పరిశ్రమలను కోల్పోయాయి.',
          },
          {
            en: "Cultural exchange can broaden people's views without requiring every place to become identical.",
            native:
              'ప్రతి ప్రదేశం ఒకేలా మారాల్సిన అవసరం లేకుండానే సాంస్కృతిక పరస్పర మార్పిడి ప్రజల దృక్పథాలను విస్తరించగలదు.',
          },
          {
            en: 'If multinational companies faced common labour and environmental standards, globalization would be fairer.',
            native:
              'బహుళజాతి కంపెనీలు ఉమ్మడి కార్మిక మరియు పర్యావరణ ప్రమాణాలను పాటించాల్సి వస్తే, ప్రపంచీకరణ మరింత న్యాయంగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'वैश्वीकरण',
        question: 'क्या वैश्वीकरण ने कुल मिलाकर जीवन बेहतर बनाया है, या इसने लाभ से अधिक समस्याएँ पैदा की हैं?',
        examples: [
          {
            en: 'Global trade has made many products cheaper, although some communities have lost stable industries.',
            native:
              'वैश्विक व्यापार ने कई उत्पादों को सस्ता बनाया है, हालाँकि कुछ समुदायों ने स्थिर उद्योग खो दिए हैं।',
          },
          {
            en: "Cultural exchange can broaden people's views without requiring every place to become identical.",
            native: 'सांस्कृतिक आदान-प्रदान हर जगह को एक जैसा बनाए बिना लोगों के दृष्टिकोण को व्यापक कर सकता है।',
          },
          {
            en: 'If multinational companies faced common labour and environmental standards, globalization would be fairer.',
            native:
              'अगर बहुराष्ट्रीय कंपनियों पर समान श्रम और पर्यावरण मानक लागू हों, तो वैश्वीकरण अधिक न्यायसंगत होगा।',
          },
        ],
      },
      es: {
        word: 'globalización',
        question: '¿Ha mejorado la globalización la vida en general o ha creado más problemas que beneficios?',
        examples: [
          {
            en: 'Global trade has made many products cheaper, although some communities have lost stable industries.',
            native:
              'El comercio mundial ha abaratado muchos productos, aunque algunas comunidades han perdido industrias estables.',
          },
          {
            en: "Cultural exchange can broaden people's views without requiring every place to become identical.",
            native:
              'El intercambio cultural puede ampliar las perspectivas de la gente sin exigir que todos los lugares se vuelvan idénticos.',
          },
          {
            en: 'If multinational companies faced common labour and environmental standards, globalization would be fairer.',
            native:
              'Si las empresas multinacionales se enfrentaran a normas laborales y ambientales comunes, la globalización sería más justa.',
          },
        ],
      },
      zh: {
        word: '全球化',
        question: '总体而言，全球化改善了生活，还是带来的问题多于好处？',
        examples: [
          {
            en: 'Global trade has made many products cheaper, although some communities have lost stable industries.',
            native: '全球贸易使许多产品更便宜，尽管一些社区因此失去了稳定的产业。',
          },
          {
            en: "Cultural exchange can broaden people's views without requiring every place to become identical.",
            native: '文化交流可以拓宽人们的视野，而不必让每个地方都变得千篇一律。',
          },
          {
            en: 'If multinational companies faced common labour and environmental standards, globalization would be fairer.',
            native: '如果跨国公司都须遵守共同的劳工和环境标准，全球化会更加公平。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'inequality',
    questionText: 'What are the main causes of economic inequality, and which policies could reduce it fairly?',
    translations: {
      te: {
        word: 'అసమానత',
        question: 'ఆర్థిక అసమానతకు ప్రధాన కారణాలు ఏమిటి, దాన్ని న్యాయంగా తగ్గించగల విధానాలు ఏవి?',
        examples: [
          {
            en: 'Inequality grows when wages remain flat while the value of property and investments rises.',
            native: 'వేతనాలు స్థిరంగా ఉండగా ఆస్తి మరియు పెట్టుబడుల విలువ పెరిగినప్పుడు అసమానత పెరుగుతుంది.',
          },
          {
            en: 'Quality education can improve opportunity, but it cannot replace fair pay and affordable services.',
            native:
              'నాణ్యమైన విద్య అవకాశాలను మెరుగుపరచగలదు, కానీ అది న్యాయమైన వేతనాలు మరియు అందుబాటు ధరల్లో సేవలకు ప్రత్యామ్నాయం కాదు.',
          },
          {
            en: 'Progressive taxes are more acceptable when citizens can see how the revenue benefits society.',
            native:
              'పన్నుల ఆదాయం సమాజానికి ఎలా ప్రయోజనం చేకూరుస్తుందో పౌరులు చూడగలిగినప్పుడు ప్రగతిశీల పన్నులు మరింత ఆమోదయోగ్యంగా ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'असमानता',
        question: 'आर्थिक असमानता के मुख्य कारण क्या हैं, और कौन-सी नीतियाँ इसे न्यायपूर्ण ढंग से कम कर सकती हैं?',
        examples: [
          {
            en: 'Inequality grows when wages remain flat while the value of property and investments rises.',
            native: 'जब वेतन स्थिर रहता है और संपत्ति तथा निवेश का मूल्य बढ़ता है, तब असमानता बढ़ती है।',
          },
          {
            en: 'Quality education can improve opportunity, but it cannot replace fair pay and affordable services.',
            native:
              'गुणवत्तापूर्ण शिक्षा अवसर बढ़ा सकती है, लेकिन वह उचित वेतन और किफ़ायती सेवाओं की जगह नहीं ले सकती।',
          },
          {
            en: 'Progressive taxes are more acceptable when citizens can see how the revenue benefits society.',
            native:
              'जब नागरिक देख पाते हैं कि कर से मिलने वाला राजस्व समाज को कैसे लाभ पहुँचाता है, तब प्रगतिशील कर अधिक स्वीकार्य होते हैं।',
          },
        ],
      },
      es: {
        word: 'desigualdad',
        question:
          '¿Cuáles son las principales causas de la desigualdad económica y qué políticas podrían reducirla de manera justa?',
        examples: [
          {
            en: 'Inequality grows when wages remain flat while the value of property and investments rises.',
            native:
              'La desigualdad aumenta cuando los salarios se estancan mientras sube el valor de la propiedad y las inversiones.',
          },
          {
            en: 'Quality education can improve opportunity, but it cannot replace fair pay and affordable services.',
            native:
              'La educación de calidad puede mejorar las oportunidades, pero no sustituye a un salario justo ni a servicios asequibles.',
          },
          {
            en: 'Progressive taxes are more acceptable when citizens can see how the revenue benefits society.',
            native:
              'Los impuestos progresivos son más aceptables cuando la ciudadanía puede ver cómo benefician sus ingresos a la sociedad.',
          },
        ],
      },
      zh: {
        word: '不平等',
        question: '经济不平等的主要原因是什么，哪些政策能够公平地缩小差距？',
        examples: [
          {
            en: 'Inequality grows when wages remain flat while the value of property and investments rises.',
            native: '当工资停滞不前而房产和投资不断升值时，不平等就会加剧。',
          },
          {
            en: 'Quality education can improve opportunity, but it cannot replace fair pay and affordable services.',
            native: '优质教育可以增加机会，但不能取代公平的薪酬和负担得起的服务。',
          },
          {
            en: 'Progressive taxes are more acceptable when citizens can see how the revenue benefits society.',
            native: '当公民能看到税收如何惠及社会时，累进税制会更容易被接受。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'gender equality',
    questionText: 'What progress has been made toward gender equality, and which obstacles still need attention?',
    translations: {
      te: {
        word: 'లింగ సమానత్వం',
        question: 'లింగ సమానత్వం దిశగా ఎలాంటి పురోగతి సాధించబడింది, ఇంకా ఏ అడ్డంకులపై దృష్టి పెట్టాలి?',
        examples: [
          {
            en: 'Legal equality is important, but everyday expectations still influence education, careers, and family roles.',
            native:
              'చట్టపరమైన సమానత్వం ముఖ్యం, కానీ రోజువారీ అంచనాలు ఇప్పటికీ విద్య, వృత్తులు మరియు కుటుంబ పాత్రలను ప్రభావితం చేస్తున్నాయి.',
          },
          {
            en: 'Employers should publish pay data so that unexplained differences can be identified and corrected.',
            native: 'వివరణ లేని తేడాలను గుర్తించి సరిచేయడానికి యజమానులు వేతన వివరాలను ప్రచురించాలి.',
          },
          {
            en: 'Lasting progress requires men as well as women to challenge unfair traditions.',
            native: 'దీర్ఘకాలిక పురోగతికి మహిళలతో పాటు పురుషులు కూడా అన్యాయమైన సంప్రదాయాలను ప్రశ్నించాలి.',
          },
        ],
      },
      hi: {
        word: 'लैंगिक समानता',
        question: 'लैंगिक समानता की दिशा में क्या प्रगति हुई है, और किन बाधाओं पर अभी भी ध्यान देने की आवश्यकता है?',
        examples: [
          {
            en: 'Legal equality is important, but everyday expectations still influence education, careers, and family roles.',
            native:
              'कानूनी समानता महत्वपूर्ण है, लेकिन रोज़मर्रा की अपेक्षाएँ अभी भी शिक्षा, करियर और पारिवारिक भूमिकाओं को प्रभावित करती हैं।',
          },
          {
            en: 'Employers should publish pay data so that unexplained differences can be identified and corrected.',
            native:
              'नियोक्ताओं को वेतन के आँकड़े प्रकाशित करने चाहिए ताकि बिना स्पष्टीकरण वाले अंतर पहचाने और सुधारे जा सकें।',
          },
          {
            en: 'Lasting progress requires men as well as women to challenge unfair traditions.',
            native: 'स्थायी प्रगति के लिए महिलाओं के साथ पुरुषों को भी अन्यायपूर्ण परंपराओं को चुनौती देनी होगी।',
          },
        ],
      },
      es: {
        word: 'igualdad de género',
        question:
          '¿Qué avances se han logrado hacia la igualdad de género y qué obstáculos todavía requieren atención?',
        examples: [
          {
            en: 'Legal equality is important, but everyday expectations still influence education, careers, and family roles.',
            native:
              'La igualdad jurídica es importante, pero las expectativas cotidianas todavía influyen en la educación, las carreras y los roles familiares.',
          },
          {
            en: 'Employers should publish pay data so that unexplained differences can be identified and corrected.',
            native:
              'Los empleadores deberían publicar datos salariales para que las diferencias sin explicación puedan identificarse y corregirse.',
          },
          {
            en: 'Lasting progress requires men as well as women to challenge unfair traditions.',
            native:
              'El progreso duradero exige que tanto los hombres como las mujeres cuestionen las tradiciones injustas.',
          },
        ],
      },
      zh: {
        word: '性别平等',
        question: '在实现性别平等方面已经取得了哪些进展，还有哪些障碍需要关注？',
        examples: [
          {
            en: 'Legal equality is important, but everyday expectations still influence education, careers, and family roles.',
            native: '法律上的平等很重要，但日常社会期待仍在影响教育、职业和家庭角色。',
          },
          {
            en: 'Employers should publish pay data so that unexplained differences can be identified and corrected.',
            native: '雇主应该公布薪酬数据，以便发现并纠正无法合理解释的差异。',
          },
          {
            en: 'Lasting progress requires men as well as women to challenge unfair traditions.',
            native: '持久的进步需要男性和女性共同挑战不公平的传统。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'workplace diversity',
    questionText:
      'How can organizations gain the benefits of workplace diversity rather than simply hiring people from different backgrounds?',
    translations: {
      te: {
        word: 'కార్యాలయ వైవిధ్యం',
        question:
          'కేవలం భిన్న నేపథ్యాల వారిని నియమించడమే కాకుండా కార్యాలయ వైవిధ్యం వల్ల కలిగే ప్రయోజనాలను సంస్థలు ఎలా సాధించగలవు?',
        examples: [
          {
            en: 'A diverse team can recognize needs and risks that a more uniform group might overlook.',
            native: 'వైవిధ్యమైన బృందం, ఒకే తరహా సమూహం గమనించకుండా వదిలేసే అవసరాలు మరియు ప్రమాదాలను గుర్తించగలదు.',
          },
          {
            en: 'Representation alone is insufficient if some employees are routinely ignored in meetings.',
            native:
              'సమావేశాల్లో కొంతమంది ఉద్యోగుల అభిప్రాయాలను తరచూ పట్టించుకోకపోతే, కేవలం ప్రాతినిధ్యం ఉండటం సరిపోదు.',
          },
          {
            en: 'Managers should use clear promotion criteria and respond seriously when discrimination is reported.',
            native:
              'మేనేజర్లు పదోన్నతికి స్పష్టమైన ప్రమాణాలను ఉపయోగించి, వివక్ష గురించి ఫిర్యాదు చేసినప్పుడు దాన్ని తీవ్రంగా పరిగణించాలి.',
          },
        ],
      },
      hi: {
        word: 'कार्यस्थल की विविधता',
        question:
          'संगठन केवल अलग-अलग पृष्ठभूमि के लोगों को नियुक्त करने के बजाय कार्यस्थल की विविधता के वास्तविक लाभ कैसे प्राप्त कर सकते हैं?',
        examples: [
          {
            en: 'A diverse team can recognize needs and risks that a more uniform group might overlook.',
            native:
              'एक विविध टीम उन ज़रूरतों और जोखिमों को पहचान सकती है जिन्हें एक जैसे लोगों का समूह अनदेखा कर सकता है।',
          },
          {
            en: 'Representation alone is insufficient if some employees are routinely ignored in meetings.',
            native:
              'अगर बैठकों में कुछ कर्मचारियों की नियमित रूप से अनदेखी होती है, तो केवल प्रतिनिधित्व पर्याप्त नहीं है।',
          },
          {
            en: 'Managers should use clear promotion criteria and respond seriously when discrimination is reported.',
            native:
              'प्रबंधकों को पदोन्नति के स्पष्ट मानदंड अपनाने चाहिए और भेदभाव की शिकायत मिलने पर गंभीरता से कार्रवाई करनी चाहिए।',
          },
        ],
      },
      es: {
        word: 'diversidad laboral',
        question:
          '¿Cómo pueden las organizaciones obtener los beneficios de la diversidad laboral en vez de limitarse a contratar a personas de distintos orígenes?',
        examples: [
          {
            en: 'A diverse team can recognize needs and risks that a more uniform group might overlook.',
            native:
              'Un equipo diverso puede reconocer necesidades y riesgos que un grupo más uniforme quizá pasaría por alto.',
          },
          {
            en: 'Representation alone is insufficient if some employees are routinely ignored in meetings.',
            native:
              'La representación por sí sola no basta si se ignora habitualmente a algunos empleados en las reuniones.',
          },
          {
            en: 'Managers should use clear promotion criteria and respond seriously when discrimination is reported.',
            native:
              'Los responsables deberían aplicar criterios claros de ascenso y responder con seriedad cuando se denuncia discriminación.',
          },
        ],
      },
      zh: {
        word: '职场多元化',
        question: '组织如何真正获得职场多元化的益处，而不只是招聘不同背景的人？',
        examples: [
          {
            en: 'A diverse team can recognize needs and risks that a more uniform group might overlook.',
            native: '多元化团队能够发现较为单一的群体可能忽略的需求和风险。',
          },
          {
            en: 'Representation alone is insufficient if some employees are routinely ignored in meetings.',
            native: '如果一些员工在会议中经常被忽视，只有人员构成上的代表性还远远不够。',
          },
          {
            en: 'Managers should use clear promotion criteria and respond seriously when discrimination is reported.',
            native: '管理者应该采用明确的晋升标准，并认真处理歧视投诉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'lifelong learning',
    questionText: 'Why is lifelong learning increasingly important, and what makes it possible for busy adults?',
    translations: {
      te: {
        word: 'జీవితాంత అభ్యాసం',
        question: 'జీవితాంత అభ్యాసం ఎందుకు మరింత ముఖ్యమవుతోంది, బిజీగా ఉండే పెద్దలకు అది సాధ్యమయ్యేలా చేసేది ఏమిటి?',
        examples: [
          {
            en: 'Technology changes many jobs so quickly that one qualification may no longer last an entire career.',
            native:
              'సాంకేతికత అనేక ఉద్యోగాలను చాలా వేగంగా మారుస్తోంది కాబట్టి ఒక అర్హత మొత్తం వృత్తి జీవితానికి ఇక సరిపోకపోవచ్చు.',
          },
          {
            en: 'Short, flexible courses help adults learn without giving up work or family responsibilities.',
            native:
              'చిన్నవిగా, అనువుగా ఉండే కోర్సులు పెద్దలు ఉద్యోగాన్ని లేదా కుటుంబ బాధ్యతలను వదులుకోకుండా నేర్చుకోవడానికి సహాయపడతాయి.',
          },
          {
            en: 'Employers benefit when they give staff time and support to develop new skills.',
            native:
              'కొత్త నైపుణ్యాలు అభివృద్ధి చేసుకోవడానికి సిబ్బందికి సమయం మరియు మద్దతు ఇచ్చినప్పుడు యజమానులు కూడా ప్రయోజనం పొందుతారు.',
          },
        ],
      },
      hi: {
        word: 'आजीवन सीखना',
        question:
          'आजीवन सीखना लगातार अधिक महत्वपूर्ण क्यों हो रहा है, और व्यस्त वयस्कों के लिए इसे क्या संभव बनाता है?',
        examples: [
          {
            en: 'Technology changes many jobs so quickly that one qualification may no longer last an entire career.',
            native:
              'तकनीक कई नौकरियों को इतनी तेज़ी से बदलती है कि एक योग्यता अब पूरे करियर के लिए पर्याप्त नहीं रह सकती।',
          },
          {
            en: 'Short, flexible courses help adults learn without giving up work or family responsibilities.',
            native:
              'छोटे और लचीले पाठ्यक्रम वयस्कों को काम या पारिवारिक ज़िम्मेदारियाँ छोड़े बिना सीखने में मदद करते हैं।',
          },
          {
            en: 'Employers benefit when they give staff time and support to develop new skills.',
            native:
              'जब नियोक्ता कर्मचारियों को नए कौशल विकसित करने के लिए समय और सहयोग देते हैं, तो उन्हें भी लाभ होता है।',
          },
        ],
      },
      es: {
        word: 'aprendizaje permanente',
        question:
          '¿Por qué es cada vez más importante el aprendizaje permanente y qué lo hace posible para los adultos ocupados?',
        examples: [
          {
            en: 'Technology changes many jobs so quickly that one qualification may no longer last an entire career.',
            native:
              'La tecnología transforma muchos empleos tan rápido que una sola titulación quizá ya no sirva para toda una carrera profesional.',
          },
          {
            en: 'Short, flexible courses help adults learn without giving up work or family responsibilities.',
            native:
              'Los cursos breves y flexibles ayudan a los adultos a aprender sin abandonar el trabajo ni las responsabilidades familiares.',
          },
          {
            en: 'Employers benefit when they give staff time and support to develop new skills.',
            native:
              'Los empleadores se benefician cuando dan al personal tiempo y apoyo para desarrollar nuevas habilidades.',
          },
        ],
      },
      zh: {
        word: '终身学习',
        question: '终身学习为何越来越重要，忙碌的成年人怎样才能做到这一点？',
        examples: [
          {
            en: 'Technology changes many jobs so quickly that one qualification may no longer last an entire career.',
            native: '技术使许多工作迅速变化，因此一项资格可能已无法满足整个职业生涯的需要。',
          },
          {
            en: 'Short, flexible courses help adults learn without giving up work or family responsibilities.',
            native: '简短灵活的课程能帮助成年人在不放弃工作或家庭责任的情况下学习。',
          },
          {
            en: 'Employers benefit when they give staff time and support to develop new skills.',
            native: '雇主为员工提供时间和支持来培养新技能时，企业自身也会受益。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'critical thinking',
    questionText:
      'How can people strengthen critical thinking when they are surrounded by persuasive media and strong opinions?',
    translations: {
      te: {
        word: 'విమర్శనాత్మక ఆలోచన',
        question:
          'ప్రభావితం చేసే మీడియా మరియు బలమైన అభిప్రాయాలు చుట్టూ ఉన్నప్పుడు ప్రజలు విమర్శనాత్మక ఆలోచనను ఎలా బలోపేతం చేసుకోగలరు?',
        examples: [
          {
            en: 'Critical thinking begins with asking what evidence would prove a claim wrong.',
            native: 'ఒక వాదన తప్పని ఏ ఆధారం నిరూపించగలదో అడగడంతో విమర్శనాత్మక ఆలోచన మొదలవుతుంది.',
          },
          {
            en: 'People should compare credible sources and separate emotional language from factual support.',
            native: 'ప్రజలు విశ్వసనీయ మూలాలను పోల్చి, భావోద్వేగ భాషను వాస్తవ ఆధారాల నుండి వేరు చేయాలి.',
          },
          {
            en: 'Changing your mind after seeing better evidence is a sign of judgement, not weakness.',
            native: 'మెరుగైన ఆధారాలను చూసిన తర్వాత మీ అభిప్రాయాన్ని మార్చుకోవడం బలహీనత కాదు, మంచి వివేచనకు సంకేతం.',
          },
        ],
      },
      hi: {
        word: 'आलोचनात्मक सोच',
        question: 'प्रभावशाली मीडिया और दृढ़ विचारों से घिरे होने पर लोग अपनी आलोचनात्मक सोच कैसे मज़बूत कर सकते हैं?',
        examples: [
          {
            en: 'Critical thinking begins with asking what evidence would prove a claim wrong.',
            native: 'आलोचनात्मक सोच इस सवाल से शुरू होती है कि कौन-सा प्रमाण किसी दावे को गलत साबित करेगा।',
          },
          {
            en: 'People should compare credible sources and separate emotional language from factual support.',
            native:
              'लोगों को विश्वसनीय स्रोतों की तुलना करनी चाहिए और भावनात्मक भाषा को तथ्यात्मक आधार से अलग करना चाहिए।',
          },
          {
            en: 'Changing your mind after seeing better evidence is a sign of judgement, not weakness.',
            native: 'बेहतर प्रमाण देखने के बाद अपनी राय बदलना कमज़ोरी नहीं, बल्कि समझदारी की निशानी है।',
          },
        ],
      },
      es: {
        word: 'pensamiento crítico',
        question:
          '¿Cómo puede la gente reforzar su pensamiento crítico cuando está rodeada de medios persuasivos y opiniones firmes?',
        examples: [
          {
            en: 'Critical thinking begins with asking what evidence would prove a claim wrong.',
            native: 'El pensamiento crítico comienza preguntando qué pruebas demostrarían que una afirmación es falsa.',
          },
          {
            en: 'People should compare credible sources and separate emotional language from factual support.',
            native: 'La gente debería comparar fuentes fiables y separar el lenguaje emocional del respaldo factual.',
          },
          {
            en: 'Changing your mind after seeing better evidence is a sign of judgement, not weakness.',
            native: 'Cambiar de opinión al ver mejores pruebas es señal de buen criterio, no de debilidad.',
          },
        ],
      },
      zh: {
        word: '批判性思维',
        question: '面对具有说服力的媒体和强烈观点，人们如何增强批判性思维？',
        examples: [
          {
            en: 'Critical thinking begins with asking what evidence would prove a claim wrong.',
            native: '批判性思维始于追问什么证据能够证明某个说法是错误的。',
          },
          {
            en: 'People should compare credible sources and separate emotional language from factual support.',
            native: '人们应该比较可信来源，并将情绪化语言与事实依据区分开来。',
          },
          {
            en: 'Changing your mind after seeing better evidence is a sign of judgement, not weakness.',
            native: '看到更有力的证据后改变观点，是判断力的体现，而不是软弱。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'decision-making',
    questionText:
      'What helps people make good decisions when information is incomplete and the consequences are uncertain?',
    translations: {
      te: {
        word: 'నిర్ణయాలు తీసుకోవడం',
        question:
          'సమాచారం అసంపూర్ణంగా ఉండి, పరిణామాలు అనిశ్చితంగా ఉన్నప్పుడు మంచి నిర్ణయాలు తీసుకోవడానికి ప్రజలకు ఏది సహాయపడుతుంది?',
        examples: [
          {
            en: 'Listing the likely benefits, costs, and risks can prevent one attractive option from dominating the discussion.',
            native:
              'సంభావ్య ప్రయోజనాలు, ఖర్చులు మరియు ప్రమాదాలను జాబితా చేయడం వల్ల ఆకర్షణీయమైన ఒక ఎంపిక మొత్తం చర్చను ఆధిపత్యం చేయకుండా ఉంటుంది.',
          },
          {
            en: 'Good decision-makers seek different perspectives but set a deadline so that analysis does not become avoidance.',
            native:
              'మంచి నిర్ణయాలు తీసుకునేవారు భిన్న దృక్పథాలను కోరతారు, కానీ విశ్లేషణ తప్పించుకునే మార్గంగా మారకుండా గడువు నిర్ణయిస్తారు.',
          },
          {
            en: 'When uncertainty cannot be removed, a reversible small step may be wiser than a permanent commitment.',
            native: 'అనిశ్చితిని తొలగించలేనప్పుడు, శాశ్వత నిబద్ధత కంటే వెనక్కి మార్చగల చిన్న అడుగు తెలివైనది కావచ్చు.',
          },
        ],
      },
      hi: {
        word: 'निर्णय लेना',
        question: 'जब जानकारी अधूरी हो और परिणाम अनिश्चित हों, तब लोगों को अच्छे निर्णय लेने में क्या मदद करता है?',
        examples: [
          {
            en: 'Listing the likely benefits, costs, and risks can prevent one attractive option from dominating the discussion.',
            native: 'संभावित लाभ, लागत और जोखिमों की सूची बनाने से कोई एक आकर्षक विकल्प पूरी चर्चा पर हावी नहीं होता।',
          },
          {
            en: 'Good decision-makers seek different perspectives but set a deadline so that analysis does not become avoidance.',
            native:
              'अच्छे निर्णयकर्ता अलग-अलग दृष्टिकोण तलाशते हैं, लेकिन एक समय-सीमा तय करते हैं ताकि विश्लेषण टालमटोल न बन जाए।',
          },
          {
            en: 'When uncertainty cannot be removed, a reversible small step may be wiser than a permanent commitment.',
            native:
              'जब अनिश्चितता दूर न की जा सके, तब स्थायी प्रतिबद्धता की तुलना में वापस लिया जा सकने वाला छोटा कदम अधिक समझदारी भरा हो सकता है।',
          },
        ],
      },
      es: {
        word: 'toma de decisiones',
        question:
          '¿Qué ayuda a tomar buenas decisiones cuando la información es incompleta y las consecuencias son inciertas?',
        examples: [
          {
            en: 'Listing the likely benefits, costs, and risks can prevent one attractive option from dominating the discussion.',
            native:
              'Enumerar los posibles beneficios, costes y riesgos puede evitar que una opción atractiva domine la discusión.',
          },
          {
            en: 'Good decision-makers seek different perspectives but set a deadline so that analysis does not become avoidance.',
            native:
              'Quienes deciden bien buscan distintas perspectivas, pero fijan un plazo para que el análisis no se convierta en una forma de evitar la decisión.',
          },
          {
            en: 'When uncertainty cannot be removed, a reversible small step may be wiser than a permanent commitment.',
            native:
              'Cuando no se puede eliminar la incertidumbre, un pequeño paso reversible puede ser más sensato que un compromiso permanente.',
          },
        ],
      },
      zh: {
        word: '决策',
        question: '当信息不完整且后果不确定时，什么能帮助人们做出明智的决定？',
        examples: [
          {
            en: 'Listing the likely benefits, costs, and risks can prevent one attractive option from dominating the discussion.',
            native: '列出可能的收益、成本和风险，可以避免某个诱人的选项主导整个讨论。',
          },
          {
            en: 'Good decision-makers seek different perspectives but set a deadline so that analysis does not become avoidance.',
            native: '善于决策的人会寻求不同观点，但也会设定期限，以免分析变成逃避。',
          },
          {
            en: 'When uncertainty cannot be removed, a reversible small step may be wiser than a permanent commitment.',
            native: '当不确定性无法消除时，先迈出可撤回的一小步，可能比做出永久承诺更明智。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'conflict resolution',
    questionText: 'Which approaches are most effective for resolving conflicts at work or in a community?',
    translations: {
      te: {
        word: 'వివాద పరిష్కారం',
        question: 'కార్యాలయంలో లేదా సమాజంలో వివాదాలను పరిష్కరించడానికి ఏ పద్ధతులు అత్యంత ప్రభావవంతంగా ఉంటాయి?',
        examples: [
          {
            en: 'People are more willing to compromise when they feel their concerns have been heard accurately.',
            native: 'తమ ఆందోళనలను సరిగ్గా విన్నారని భావించినప్పుడు ప్రజలు రాజీ పడేందుకు మరింత సిద్ధంగా ఉంటారు.',
          },
          {
            en: 'Focusing on shared interests often reveals solutions that a debate about blame would hide.',
            native:
              'ఉమ్మడి ప్రయోజనాలపై దృష్టి పెట్టడం వల్ల నింద గురించి జరిగే వాదన దాచే పరిష్కారాలు తరచుగా కనిపిస్తాయి.',
          },
          {
            en: 'If emotions remain intense, a neutral mediator can keep the conversation respectful and practical.',
            native: 'భావోద్వేగాలు ఇంకా తీవ్రంగా ఉంటే, తటస్థ మధ్యవర్తి సంభాషణను గౌరవప్రదంగా మరియు ఆచరణాత్మకంగా ఉంచగలరు.',
          },
        ],
      },
      hi: {
        word: 'संघर्ष समाधान',
        question: 'कार्यस्थल या समुदाय में संघर्ष सुलझाने के लिए कौन-से तरीके सबसे प्रभावी हैं?',
        examples: [
          {
            en: 'People are more willing to compromise when they feel their concerns have been heard accurately.',
            native:
              'जब लोगों को लगता है कि उनकी चिंताओं को सही ढंग से सुना गया है, तो वे समझौता करने के लिए अधिक तैयार होते हैं।',
          },
          {
            en: 'Focusing on shared interests often reveals solutions that a debate about blame would hide.',
            native: 'साझा हितों पर ध्यान देने से अक्सर ऐसे समाधान सामने आते हैं जिन्हें दोष पर बहस छिपा देती।',
          },
          {
            en: 'If emotions remain intense, a neutral mediator can keep the conversation respectful and practical.',
            native:
              'अगर भावनाएँ तीव्र बनी रहें, तो एक निष्पक्ष मध्यस्थ बातचीत को सम्मानजनक और व्यावहारिक बनाए रख सकता है।',
          },
        ],
      },
      es: {
        word: 'resolución de conflictos',
        question: '¿Qué enfoques son más eficaces para resolver conflictos en el trabajo o en una comunidad?',
        examples: [
          {
            en: 'People are more willing to compromise when they feel their concerns have been heard accurately.',
            native:
              'La gente está más dispuesta a llegar a acuerdos cuando siente que sus preocupaciones se han escuchado correctamente.',
          },
          {
            en: 'Focusing on shared interests often reveals solutions that a debate about blame would hide.',
            native:
              'Centrarse en los intereses comunes suele revelar soluciones que un debate sobre la culpa ocultaría.',
          },
          {
            en: 'If emotions remain intense, a neutral mediator can keep the conversation respectful and practical.',
            native:
              'Si las emociones siguen siendo intensas, un mediador neutral puede mantener la conversación respetuosa y práctica.',
          },
        ],
      },
      zh: {
        word: '冲突解决',
        question: '哪些方法最能有效解决职场或社区中的冲突？',
        examples: [
          {
            en: 'People are more willing to compromise when they feel their concerns have been heard accurately.',
            native: '当人们觉得自己的关切得到了准确理解时，会更愿意作出妥协。',
          },
          {
            en: 'Focusing on shared interests often reveals solutions that a debate about blame would hide.',
            native: '关注共同利益，往往能发现争论谁对谁错时看不到的解决方案。',
          },
          {
            en: 'If emotions remain intense, a neutral mediator can keep the conversation respectful and practical.',
            native: '如果情绪依然激烈，中立的调解人可以让对话保持尊重并注重实际。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'negotiation',
    questionText: 'What makes a negotiation fair and successful when the two sides do not have equal power?',
    translations: {
      te: {
        word: 'చర్చలు',
        question: 'రెండు పక్షాలకు సమానమైన శక్తి లేనప్పుడు చర్చలను న్యాయంగా మరియు విజయవంతంగా చేసేది ఏమిటి?',
        examples: [
          {
            en: "A successful negotiation addresses each side's main interests rather than forcing an immediate compromise.",
            native:
              'విజయవంతమైన చర్చ తక్షణ రాజీని బలవంతం చేయకుండా ప్రతి పక్షం యొక్క ప్రధాన ప్రయోజనాలను పరిష్కరిస్తుంది.',
          },
          {
            en: 'Preparing alternatives gives weaker participants more confidence to reject an unfair offer.',
            native:
              'ప్రత్యామ్నాయాలను సిద్ధం చేసుకోవడం బలహీన స్థితిలో ఉన్న పాల్గొనేవారికి అన్యాయమైన ప్రతిపాదనను తిరస్కరించే మరింత ఆత్మవిశ్వాసాన్ని ఇస్తుంది.',
          },
          {
            en: 'Agreements are more durable when expectations, deadlines, and responsibilities are written clearly.',
            native: 'అంచనాలు, గడువులు మరియు బాధ్యతలను స్పష్టంగా రాసినప్పుడు ఒప్పందాలు ఎక్కువకాలం నిలుస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'बातचीत',
        question: 'जब दोनों पक्षों के पास समान शक्ति न हो, तब बातचीत को निष्पक्ष और सफल क्या बनाता है?',
        examples: [
          {
            en: "A successful negotiation addresses each side's main interests rather than forcing an immediate compromise.",
            native: 'सफल बातचीत तत्काल समझौता थोपने के बजाय दोनों पक्षों के मुख्य हितों पर ध्यान देती है।',
          },
          {
            en: 'Preparing alternatives gives weaker participants more confidence to reject an unfair offer.',
            native:
              'विकल्प तैयार रखने से कमज़ोर पक्ष के प्रतिभागियों को अनुचित प्रस्ताव ठुकराने का अधिक आत्मविश्वास मिलता है।',
          },
          {
            en: 'Agreements are more durable when expectations, deadlines, and responsibilities are written clearly.',
            native: 'जब अपेक्षाएँ, समय-सीमाएँ और ज़िम्मेदारियाँ स्पष्ट रूप से लिखी हों, तो समझौते अधिक टिकाऊ होते हैं।',
          },
        ],
      },
      es: {
        word: 'negociación',
        question: '¿Qué hace que una negociación sea justa y exitosa cuando las dos partes no tienen el mismo poder?',
        examples: [
          {
            en: "A successful negotiation addresses each side's main interests rather than forcing an immediate compromise.",
            native:
              'Una negociación exitosa aborda los principales intereses de cada parte en lugar de forzar un acuerdo inmediato.',
          },
          {
            en: 'Preparing alternatives gives weaker participants more confidence to reject an unfair offer.',
            native:
              'Preparar alternativas da a los participantes más débiles mayor confianza para rechazar una oferta injusta.',
          },
          {
            en: 'Agreements are more durable when expectations, deadlines, and responsibilities are written clearly.',
            native:
              'Los acuerdos son más duraderos cuando las expectativas, los plazos y las responsabilidades quedan claramente por escrito.',
          },
        ],
      },
      zh: {
        word: '谈判',
        question: '当双方力量不对等时，怎样才能使谈判公平并取得成功？',
        examples: [
          {
            en: "A successful negotiation addresses each side's main interests rather than forcing an immediate compromise.",
            native: '成功的谈判会处理双方的核心利益，而不是强迫双方立即妥协。',
          },
          {
            en: 'Preparing alternatives gives weaker participants more confidence to reject an unfair offer.',
            native: '准备好其他选择，能让处于弱势的一方更有信心拒绝不公平的提议。',
          },
          {
            en: 'Agreements are more durable when expectations, deadlines, and responsibilities are written clearly.',
            native: '明确写下预期、期限和责任，能使协议更加持久。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'time management',
    questionText: 'Why do people struggle to manage their time, and which strategies genuinely help?',
    translations: {
      te: {
        word: 'సమయ నిర్వహణ',
        question: 'ప్రజలు తమ సమయాన్ని నిర్వహించడంలో ఎందుకు ఇబ్బంది పడతారు, నిజంగా సహాయపడే పద్ధతులు ఏవి?',
        examples: [
          {
            en: 'People often underestimate how long complex tasks take and leave no space for interruptions.',
            native:
              'సంక్లిష్ట పనులకు పట్టే సమయాన్ని ప్రజలు తరచుగా తక్కువగా అంచనా వేస్తారు మరియు అంతరాయాలకు సమయం కేటాయించరు.',
          },
          {
            en: 'Choosing three priorities is usually more effective than filling every hour with minor activities.',
            native:
              'ప్రతి గంటను చిన్న పనులతో నింపడం కంటే మూడు ప్రాధాన్యాలను ఎంచుకోవడం సాధారణంగా మరింత ప్రభావవంతంగా ఉంటుంది.',
          },
          {
            en: 'Regular breaks protect concentration, whereas constant multitasking creates the illusion of progress.',
            native:
              'క్రమమైన విరామాలు ఏకాగ్రతను కాపాడతాయి, అయితే నిరంతరం అనేక పనులు చేయడం పురోగతి జరుగుతోందనే భ్రమను కలిగిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'समय प्रबंधन',
        question:
          'लोग अपने समय का प्रबंधन करने में क्यों संघर्ष करते हैं, और कौन-सी रणनीतियाँ वास्तव में मदद करती हैं?',
        examples: [
          {
            en: 'People often underestimate how long complex tasks take and leave no space for interruptions.',
            native:
              'लोग अक्सर जटिल कामों में लगने वाले समय को कम आँकते हैं और रुकावटों के लिए कोई गुंजाइश नहीं छोड़ते।',
          },
          {
            en: 'Choosing three priorities is usually more effective than filling every hour with minor activities.',
            native: 'हर घंटे को छोटे कामों से भरने की तुलना में तीन प्राथमिकताएँ चुनना आम तौर पर अधिक प्रभावी होता है।',
          },
          {
            en: 'Regular breaks protect concentration, whereas constant multitasking creates the illusion of progress.',
            native: 'नियमित विराम एकाग्रता बनाए रखते हैं, जबकि लगातार कई काम करना प्रगति का भ्रम पैदा करता है।',
          },
        ],
      },
      es: {
        word: 'gestión del tiempo',
        question: '¿Por qué cuesta gestionar el tiempo y qué estrategias ayudan de verdad?',
        examples: [
          {
            en: 'People often underestimate how long complex tasks take and leave no space for interruptions.',
            native:
              'La gente suele subestimar cuánto duran las tareas complejas y no deja margen para las interrupciones.',
          },
          {
            en: 'Choosing three priorities is usually more effective than filling every hour with minor activities.',
            native: 'Elegir tres prioridades suele ser más eficaz que llenar cada hora con actividades menores.',
          },
          {
            en: 'Regular breaks protect concentration, whereas constant multitasking creates the illusion of progress.',
            native:
              'Los descansos regulares protegen la concentración, mientras que hacer varias tareas constantemente crea una ilusión de progreso.',
          },
        ],
      },
      zh: {
        word: '时间管理',
        question: '人们为什么难以管理时间，哪些方法真正有效？',
        examples: [
          {
            en: 'People often underestimate how long complex tasks take and leave no space for interruptions.',
            native: '人们经常低估复杂任务所需的时间，也没有为突发情况留出余地。',
          },
          {
            en: 'Choosing three priorities is usually more effective than filling every hour with minor activities.',
            native: '选择三项优先事项，通常比用琐碎活动填满每个小时更有效。',
          },
          {
            en: 'Regular breaks protect concentration, whereas constant multitasking creates the illusion of progress.',
            native: '定期休息有助于保持专注，而不停地处理多项任务只会制造取得进展的错觉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'creativity',
    questionText:
      'Can creativity be taught, or is it mainly a natural talent? How can schools and workplaces encourage it?',
    translations: {
      te: {
        word: 'సృజనాత్మకత',
        question:
          'సృజనాత్మకతను బోధించగలమా, లేక అది ప్రధానంగా సహజ ప్రతిభా? పాఠశాలలు మరియు కార్యాలయాలు దాన్ని ఎలా ప్రోత్సహించగలవు?',
        examples: [
          {
            en: 'Creativity improves when people practise generating several imperfect ideas before judging any of them.',
            native:
              'ఏ ఆలోచననైనా అంచనా వేయడానికి ముందు పరిపూర్ణంగా లేని అనేక ఆలోచనలను రూపొందించడం సాధన చేసినప్పుడు సృజనాత్మకత మెరుగుపడుతుంది.',
          },
          {
            en: 'Knowledge provides useful material for imagination, so creative work still requires patient study.',
            native:
              'జ్ఞానం ఊహాశక్తికి ఉపయోగకరమైన విషయాన్ని అందిస్తుంది, కాబట్టి సృజనాత్మక పనికి కూడా ఓపికతో కూడిన అధ్యయనం అవసరం.',
          },
          {
            en: 'Schools can encourage originality by allowing more than one reasonable answer to a problem.',
            native:
              'ఒక సమస్యకు ఒకటి కంటే ఎక్కువ సమంజసమైన సమాధానాలను అనుమతించడం ద్వారా పాఠశాలలు స్వతంత్ర ఆలోచనను ప్రోత్సహించగలవు.',
          },
        ],
      },
      hi: {
        word: 'रचनात्मकता',
        question:
          'क्या रचनात्मकता सिखाई जा सकती है, या यह मुख्य रूप से स्वाभाविक प्रतिभा है? स्कूल और कार्यस्थल इसे कैसे बढ़ावा दे सकते हैं?',
        examples: [
          {
            en: 'Creativity improves when people practise generating several imperfect ideas before judging any of them.',
            native:
              'जब लोग किसी विचार को परखने से पहले कई अधूरे विचार बनाने का अभ्यास करते हैं, तो रचनात्मकता बढ़ती है।',
          },
          {
            en: 'Knowledge provides useful material for imagination, so creative work still requires patient study.',
            native:
              'ज्ञान कल्पना को उपयोगी सामग्री देता है, इसलिए रचनात्मक काम के लिए भी धैर्यपूर्वक अध्ययन आवश्यक है।',
          },
          {
            en: 'Schools can encourage originality by allowing more than one reasonable answer to a problem.',
            native: 'किसी समस्या के एक से अधिक उचित उत्तर स्वीकार करके स्कूल मौलिकता को प्रोत्साहित कर सकते हैं।',
          },
        ],
      },
      es: {
        word: 'creatividad',
        question:
          '¿Se puede enseñar la creatividad o es principalmente un talento natural? ¿Cómo pueden fomentarla las escuelas y los lugares de trabajo?',
        examples: [
          {
            en: 'Creativity improves when people practise generating several imperfect ideas before judging any of them.',
            native:
              'La creatividad mejora cuando se practica la generación de varias ideas imperfectas antes de juzgar cualquiera de ellas.',
          },
          {
            en: 'Knowledge provides useful material for imagination, so creative work still requires patient study.',
            native:
              'El conocimiento aporta material útil a la imaginación, por lo que el trabajo creativo también exige estudiar con paciencia.',
          },
          {
            en: 'Schools can encourage originality by allowing more than one reasonable answer to a problem.',
            native:
              'Las escuelas pueden fomentar la originalidad al permitir más de una respuesta razonable a un problema.',
          },
        ],
      },
      zh: {
        word: '创造力',
        question: '创造力可以培养，还是主要来自天赋？学校和工作场所应如何鼓励创造力？',
        examples: [
          {
            en: 'Creativity improves when people practise generating several imperfect ideas before judging any of them.',
            native: '在评价任何想法之前，先练习提出多个不完美的构想，这能提升创造力。',
          },
          {
            en: 'Knowledge provides useful material for imagination, so creative work still requires patient study.',
            native: '知识为想象力提供有用的素材，因此创造性工作仍需要耐心学习。',
          },
          {
            en: 'Schools can encourage originality by allowing more than one reasonable answer to a problem.',
            native: '学校允许一个问题有多个合理答案，就能鼓励原创思维。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'innovation',
    questionText: 'When does innovation genuinely improve society, and how should its risks be managed?',
    translations: {
      te: {
        word: 'ఆవిష్కరణ',
        question: 'ఆవిష్కరణ ఎప్పుడు సమాజాన్ని నిజంగా మెరుగుపరుస్తుంది, దాని ప్రమాదాలను ఎలా నిర్వహించాలి?',
        examples: [
          {
            en: 'Innovation is valuable when it solves a real need rather than merely making an existing product fashionable.',
            native:
              'ఇప్పటికే ఉన్న ఉత్పత్తిని కేవలం ఫ్యాషన్‌గా మార్చడం కాకుండా నిజమైన అవసరాన్ని పరిష్కరించినప్పుడు ఆవిష్కరణ విలువైనది.',
          },
          {
            en: 'Testing new systems on a limited scale can reveal unintended consequences before they affect everyone.',
            native:
              'కొత్త వ్యవస్థలను పరిమిత స్థాయిలో పరీక్షించడం వల్ల అవి అందరినీ ప్రభావితం చేయకముందే ఊహించని పరిణామాలు బయటపడవచ్చు.',
          },
          {
            en: 'Public funding should support promising research whose benefits may take years to appear.',
            native: 'ప్రయోజనాలు కనిపించడానికి సంవత్సరాలు పట్టే ఆశాజనక పరిశోధనకు ప్రభుత్వ నిధులు మద్దతు ఇవ్వాలి.',
          },
        ],
      },
      hi: {
        word: 'नवाचार',
        question: 'नवाचार वास्तव में समाज को कब बेहतर बनाता है, और उसके जोखिमों का प्रबंधन कैसे किया जाना चाहिए?',
        examples: [
          {
            en: 'Innovation is valuable when it solves a real need rather than merely making an existing product fashionable.',
            native:
              'नवाचार तब मूल्यवान होता है जब वह किसी मौजूदा उत्पाद को केवल फैशनेबल बनाने के बजाय वास्तविक ज़रूरत पूरी करता है।',
          },
          {
            en: 'Testing new systems on a limited scale can reveal unintended consequences before they affect everyone.',
            native:
              'नई प्रणालियों को सीमित स्तर पर परखने से सबको प्रभावित करने से पहले उनके अनचाहे परिणाम सामने आ सकते हैं।',
          },
          {
            en: 'Public funding should support promising research whose benefits may take years to appear.',
            native: 'सरकारी धन को ऐसे आशाजनक शोध का समर्थन करना चाहिए जिसके लाभ सामने आने में कई वर्ष लग सकते हैं।',
          },
        ],
      },
      es: {
        word: 'innovación',
        question: '¿Cuándo mejora realmente la innovación la sociedad y cómo deberían gestionarse sus riesgos?',
        examples: [
          {
            en: 'Innovation is valuable when it solves a real need rather than merely making an existing product fashionable.',
            native:
              'La innovación es valiosa cuando resuelve una necesidad real en vez de limitarse a poner de moda un producto existente.',
          },
          {
            en: 'Testing new systems on a limited scale can reveal unintended consequences before they affect everyone.',
            native:
              'Probar nuevos sistemas a escala limitada puede revelar consecuencias imprevistas antes de que afecten a todo el mundo.',
          },
          {
            en: 'Public funding should support promising research whose benefits may take years to appear.',
            native:
              'La financiación pública debería apoyar investigaciones prometedoras cuyos beneficios pueden tardar años en aparecer.',
          },
        ],
      },
      zh: {
        word: '创新',
        question: '创新在什么情况下能真正改善社会，又该如何管理其风险？',
        examples: [
          {
            en: 'Innovation is valuable when it solves a real need rather than merely making an existing product fashionable.',
            native: '创新的价值在于解决真实需求，而不只是让已有产品变得时髦。',
          },
          {
            en: 'Testing new systems on a limited scale can reveal unintended consequences before they affect everyone.',
            native: '在有限范围内测试新系统，可以在其影响所有人之前发现意外后果。',
          },
          {
            en: 'Public funding should support promising research whose benefits may take years to appear.',
            native: '公共资金应该支持有前景但可能需要多年才能显现效益的研究。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'privacy',
    questionText: 'How much privacy should people trade for convenience or security when they use online services?',
    translations: {
      te: {
        word: 'గోప్యత',
        question:
          'ఆన్‌లైన్ సేవలను ఉపయోగించేటప్పుడు సౌకర్యం లేదా భద్రత కోసం ప్రజలు తమ గోప్యతలో ఎంత భాగాన్ని వదులుకోవాలి?',
        examples: [
          {
            en: 'People often accept data collection without understanding how long their information will be stored.',
            native:
              'తమ సమాచారం ఎంతకాలం నిల్వ చేయబడుతుందో అర్థం చేసుకోకుండానే ప్రజలు తరచుగా డేటా సేకరణకు అంగీకరిస్తారు.',
          },
          {
            en: 'Convenient services should offer meaningful choices instead of making surveillance the default.',
            native: 'సౌకర్యవంతమైన సేవలు నిఘాను ముందుగా నిర్ణయించిన ఎంపికగా చేయకుండా నిజమైన ఎంపికలను అందించాలి.',
          },
          {
            en: 'Security can justify limited monitoring, but independent oversight is needed to prevent abuse.',
            native:
              'భద్రత పరిమిత పర్యవేక్షణను సమర్థించవచ్చు, కానీ దుర్వినియోగాన్ని నిరోధించడానికి స్వతంత్ర పర్యవేక్షణ అవసరం.',
          },
        ],
      },
      hi: {
        word: 'निजता',
        question: 'ऑनलाइन सेवाओं का उपयोग करते समय लोगों को सुविधा या सुरक्षा के बदले कितनी निजता छोड़नी चाहिए?',
        examples: [
          {
            en: 'People often accept data collection without understanding how long their information will be stored.',
            native: 'लोग अक्सर यह समझे बिना डेटा संग्रह स्वीकार कर लेते हैं कि उनकी जानकारी कितने समय तक रखी जाएगी।',
          },
          {
            en: 'Convenient services should offer meaningful choices instead of making surveillance the default.',
            native: 'सुविधाजनक सेवाओं को निगरानी को सामान्य व्यवस्था बनाने के बजाय वास्तविक विकल्प देने चाहिए।',
          },
          {
            en: 'Security can justify limited monitoring, but independent oversight is needed to prevent abuse.',
            native:
              'सुरक्षा सीमित निगरानी को उचित ठहरा सकती है, लेकिन दुरुपयोग रोकने के लिए स्वतंत्र निरीक्षण आवश्यक है।',
          },
        ],
      },
      es: {
        word: 'privacidad',
        question:
          '¿Cuánta privacidad debería sacrificar la gente a cambio de comodidad o seguridad al utilizar servicios en línea?',
        examples: [
          {
            en: 'People often accept data collection without understanding how long their information will be stored.',
            native:
              'La gente suele aceptar la recopilación de datos sin entender cuánto tiempo se conservará su información.',
          },
          {
            en: 'Convenient services should offer meaningful choices instead of making surveillance the default.',
            native:
              'Los servicios cómodos deberían ofrecer opciones reales en lugar de convertir la vigilancia en la configuración predeterminada.',
          },
          {
            en: 'Security can justify limited monitoring, but independent oversight is needed to prevent abuse.',
            native:
              'La seguridad puede justificar una supervisión limitada, pero hace falta un control independiente para evitar abusos.',
          },
        ],
      },
      zh: {
        word: '隐私',
        question: '使用网络服务时，人们应该用多少隐私来换取便利或安全？',
        examples: [
          {
            en: 'People often accept data collection without understanding how long their information will be stored.',
            native: '人们经常在不了解个人信息会被保存多久的情况下，同意数据收集。',
          },
          {
            en: 'Convenient services should offer meaningful choices instead of making surveillance the default.',
            native: '便捷的服务应该提供真正的选择，而不是把监控设为默认做法。',
          },
          {
            en: 'Security can justify limited monitoring, but independent oversight is needed to prevent abuse.',
            native: '安全可以成为有限监控的理由，但仍需独立监督来防止滥用。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'data protection',
    questionText: 'What obligations should organizations have when they collect and store personal data?',
    translations: {
      te: {
        word: 'డేటా రక్షణ',
        question: 'వ్యక్తిగత డేటాను సేకరించి నిల్వ చేసేటప్పుడు సంస్థలకు ఎలాంటి బాధ్యతలు ఉండాలి?',
        examples: [
          {
            en: 'Organizations should collect only the information they genuinely need and delete it when its purpose ends.',
            native: 'సంస్థలు తమకు నిజంగా అవసరమైన సమాచారాన్ని మాత్రమే సేకరించి, దాని అవసరం ముగిసినప్పుడు తొలగించాలి.',
          },
          {
            en: 'Clear consent is meaningless if refusing it makes an essential service impossible to use.',
            native: 'సమ్మతిని నిరాకరించడం వల్ల అవసరమైన సేవను ఉపయోగించలేకపోతే, స్పష్టంగా తెలిపిన సమ్మతికి అర్థం ఉండదు.',
          },
          {
            en: 'Serious breaches should trigger prompt warnings, practical support, and meaningful penalties.',
            native:
              'తీవ్రమైన డేటా ఉల్లంఘనలు వెంటనే హెచ్చరికలు, ఆచరణాత్మక సహాయం మరియు ప్రభావవంతమైన శిక్షలకు దారితీయాలి.',
          },
        ],
      },
      hi: {
        word: 'डेटा संरक्षण',
        question: 'व्यक्तिगत डेटा इकट्ठा और संग्रहीत करते समय संगठनों की क्या ज़िम्मेदारियाँ होनी चाहिए?',
        examples: [
          {
            en: 'Organizations should collect only the information they genuinely need and delete it when its purpose ends.',
            native:
              'संगठनों को केवल वही जानकारी एकत्र करनी चाहिए जिसकी उन्हें वास्तव में ज़रूरत हो और उद्देश्य पूरा होने पर उसे मिटा देना चाहिए।',
          },
          {
            en: 'Clear consent is meaningless if refusing it makes an essential service impossible to use.',
            native:
              'अगर सहमति से इनकार करने पर किसी आवश्यक सेवा का उपयोग असंभव हो जाए, तो स्पष्ट सहमति का कोई अर्थ नहीं रहता।',
          },
          {
            en: 'Serious breaches should trigger prompt warnings, practical support, and meaningful penalties.',
            native: 'गंभीर डेटा उल्लंघनों के बाद तुरंत चेतावनी, व्यावहारिक सहायता और प्रभावी दंड मिलना चाहिए।',
          },
        ],
      },
      es: {
        word: 'protección de datos',
        question: '¿Qué obligaciones deberían tener las organizaciones cuando recopilan y almacenan datos personales?',
        examples: [
          {
            en: 'Organizations should collect only the information they genuinely need and delete it when its purpose ends.',
            native:
              'Las organizaciones deberían recopilar solo la información que realmente necesitan y eliminarla cuando termine su finalidad.',
          },
          {
            en: 'Clear consent is meaningless if refusing it makes an essential service impossible to use.',
            native: 'El consentimiento claro no significa nada si rechazarlo impide utilizar un servicio esencial.',
          },
          {
            en: 'Serious breaches should trigger prompt warnings, practical support, and meaningful penalties.',
            native:
              'Las filtraciones graves deberían provocar avisos rápidos, apoyo práctico y sanciones significativas.',
          },
        ],
      },
      zh: {
        word: '数据保护',
        question: '组织收集和存储个人数据时应承担哪些义务？',
        examples: [
          {
            en: 'Organizations should collect only the information they genuinely need and delete it when its purpose ends.',
            native: '组织应该只收集真正需要的信息，并在用途结束后将其删除。',
          },
          {
            en: 'Clear consent is meaningless if refusing it makes an essential service impossible to use.',
            native: '如果拒绝同意就无法使用一项基本服务，那么所谓的明确同意便毫无意义。',
          },
          {
            en: 'Serious breaches should trigger prompt warnings, practical support, and meaningful penalties.',
            native: '发生严重数据泄露后，应立即发出警告、提供实际帮助，并实施有力度的处罚。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'journalism',
    questionText: 'What responsibilities do journalists have when speed, accuracy, and the public interest conflict?',
    translations: {
      te: {
        word: 'పత్రికారంగం',
        question:
          'వేగం, ఖచ్చితత్వం మరియు ప్రజా ప్రయోజనం పరస్పరం విరుద్ధంగా ఉన్నప్పుడు పాత్రికేయులకు ఎలాంటి బాధ్యతలు ఉంటాయి?',
        examples: [
          {
            en: "Being first matters less than confirming facts that could damage an innocent person's reputation.",
            native:
              'ఒక నిర్దోషి ప్రతిష్ఠకు హాని కలిగించగల వాస్తవాలను నిర్ధారించడం కంటే ముందుగా వార్తను అందించడం తక్కువ ముఖ్యం.',
          },
          {
            en: 'Journalists should explain what they know, what remains uncertain, and how their evidence was obtained.',
            native: 'పాత్రికేయులు తమకు ఏమి తెలుసో, ఇంకా ఏది అనిశ్చితంగా ఉందో మరియు తమ ఆధారాలు ఎలా పొందారో వివరించాలి.',
          },
          {
            en: 'Public-interest reporting may justify revealing private conduct when it exposes corruption or serious harm.',
            native:
              'అవినీతి లేదా తీవ్రమైన హానిని బయటపెడితే, ప్రజా ప్రయోజన వార్తా నివేదిక వ్యక్తిగత ప్రవర్తనను వెల్లడించడాన్ని సమర్థించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'पत्रकारिता',
        question: 'जब गति, सटीकता और जनहित आपस में टकराएँ, तब पत्रकारों की क्या ज़िम्मेदारियाँ होती हैं?',
        examples: [
          {
            en: "Being first matters less than confirming facts that could damage an innocent person's reputation.",
            native:
              'सबसे पहले खबर देने से अधिक महत्वपूर्ण उन तथ्यों की पुष्टि करना है जो किसी निर्दोष व्यक्ति की प्रतिष्ठा को नुकसान पहुँचा सकते हैं।',
          },
          {
            en: 'Journalists should explain what they know, what remains uncertain, and how their evidence was obtained.',
            native:
              'पत्रकारों को बताना चाहिए कि वे क्या जानते हैं, क्या अब भी अनिश्चित है और उनके प्रमाण कैसे प्राप्त हुए।',
          },
          {
            en: 'Public-interest reporting may justify revealing private conduct when it exposes corruption or serious harm.',
            native:
              'जब निजी आचरण का खुलासा भ्रष्टाचार या गंभीर नुकसान सामने लाता है, तब जनहित की रिपोर्टिंग उसे उचित ठहरा सकती है।',
          },
        ],
      },
      es: {
        word: 'periodismo',
        question:
          '¿Qué responsabilidades tienen los periodistas cuando entran en conflicto la rapidez, la precisión y el interés público?',
        examples: [
          {
            en: "Being first matters less than confirming facts that could damage an innocent person's reputation.",
            native:
              'Ser el primero importa menos que confirmar hechos que podrían dañar la reputación de una persona inocente.',
          },
          {
            en: 'Journalists should explain what they know, what remains uncertain, and how their evidence was obtained.',
            native:
              'Los periodistas deberían explicar qué saben, qué sigue siendo incierto y cómo obtuvieron sus pruebas.',
          },
          {
            en: 'Public-interest reporting may justify revealing private conduct when it exposes corruption or serious harm.',
            native:
              'El periodismo de interés público puede justificar revelar una conducta privada cuando destapa corrupción o daños graves.',
          },
        ],
      },
      zh: {
        word: '新闻业',
        question: '当速度、准确性和公共利益发生冲突时，记者应承担哪些责任？',
        examples: [
          {
            en: "Being first matters less than confirming facts that could damage an innocent person's reputation.",
            native: '抢先报道不如核实可能损害无辜者声誉的事实重要。',
          },
          {
            en: 'Journalists should explain what they know, what remains uncertain, and how their evidence was obtained.',
            native: '记者应该说明自己掌握了什么、哪些方面仍不确定，以及证据是如何获得的。',
          },
          {
            en: 'Public-interest reporting may justify revealing private conduct when it exposes corruption or serious harm.',
            native: '如果能揭露腐败或严重危害，公共利益报道可能有理由披露私人行为。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'freedom of speech',
    questionText: 'Where should societies draw the line between freedom of speech and protection from harm?',
    translations: {
      te: {
        word: 'భావ ప్రకటనా స్వేచ్ఛ',
        question: 'భావ ప్రకటనా స్వేచ్ఛకు మరియు హాని నుంచి రక్షణకు మధ్య సమాజాలు ఎక్కడ హద్దు నిర్ణయించాలి?',
        examples: [
          {
            en: 'Freedom of speech protects unpopular opinions, not a right to threaten other people without consequences.',
            native:
              'భావ ప్రకటనా స్వేచ్ఛ ప్రజాదరణ లేని అభిప్రాయాలను రక్షిస్తుంది, కానీ పరిణామాలు లేకుండా ఇతరులను బెదిరించే హక్కును కాదు.',
          },
          {
            en: 'Rules against harmful expression must be precise enough to prevent authorities from silencing criticism.',
            native:
              'హానికరమైన వ్యక్తీకరణకు వ్యతిరేకమైన నియమాలు, అధికారులు విమర్శలను అణచివేయకుండా నిరోధించేంత స్పష్టంగా ఉండాలి.',
          },
          {
            en: 'Open debate works best when speakers can be challenged with evidence rather than intimidated.',
            native: 'వక్తలను బెదిరించడం కాకుండా ఆధారాలతో సవాలు చేయగలిగినప్పుడు బహిరంగ చర్చ ఉత్తమంగా పనిచేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'अभिव्यक्ति की स्वतंत्रता',
        question: 'समाजों को अभिव्यक्ति की स्वतंत्रता और नुकसान से सुरक्षा के बीच सीमा कहाँ तय करनी चाहिए?',
        examples: [
          {
            en: 'Freedom of speech protects unpopular opinions, not a right to threaten other people without consequences.',
            native:
              'अभिव्यक्ति की स्वतंत्रता अलोकप्रिय विचारों की रक्षा करती है, बिना परिणाम के दूसरों को धमकाने के अधिकार की नहीं।',
          },
          {
            en: 'Rules against harmful expression must be precise enough to prevent authorities from silencing criticism.',
            native:
              'हानिकारक अभिव्यक्ति के विरुद्ध नियम इतने स्पष्ट होने चाहिए कि अधिकारी उनका उपयोग आलोचना दबाने के लिए न कर सकें।',
          },
          {
            en: 'Open debate works best when speakers can be challenged with evidence rather than intimidated.',
            native: 'खुली बहस तब सबसे अच्छी होती है जब वक्ताओं को डराने के बजाय प्रमाण से चुनौती दी जा सके।',
          },
        ],
      },
      es: {
        word: 'libertad de expresión',
        question:
          '¿Dónde deberían trazar las sociedades el límite entre la libertad de expresión y la protección frente al daño?',
        examples: [
          {
            en: 'Freedom of speech protects unpopular opinions, not a right to threaten other people without consequences.',
            native:
              'La libertad de expresión protege las opiniones impopulares, no el derecho a amenazar a otras personas sin consecuencias.',
          },
          {
            en: 'Rules against harmful expression must be precise enough to prevent authorities from silencing criticism.',
            native:
              'Las normas contra expresiones dañinas deben ser lo bastante precisas para impedir que las autoridades silencien las críticas.',
          },
          {
            en: 'Open debate works best when speakers can be challenged with evidence rather than intimidated.',
            native:
              'El debate abierto funciona mejor cuando se puede cuestionar a los participantes con pruebas en vez de intimidarlos.',
          },
        ],
      },
      zh: {
        word: '言论自由',
        question: '社会应如何划定言论自由与免受伤害之间的界限？',
        examples: [
          {
            en: 'Freedom of speech protects unpopular opinions, not a right to threaten other people without consequences.',
            native: '言论自由保护不受欢迎的观点，但不意味着可以不负后果地威胁他人。',
          },
          {
            en: 'Rules against harmful expression must be precise enough to prevent authorities from silencing criticism.',
            native: '针对有害言论的规则必须足够明确，以防当局借此压制批评。',
          },
          {
            en: 'Open debate works best when speakers can be challenged with evidence rather than intimidated.',
            native: '当发言者面对的是有证据的质疑而不是恐吓时，公开讨论最有效。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'democracy',
    questionText: 'What makes a democracy function well beyond simply holding elections?',
    translations: {
      te: {
        word: 'ప్రజాస్వామ్యం',
        question: 'కేవలం ఎన్నికలు నిర్వహించడాన్ని మించి ప్రజాస్వామ్యం బాగా పనిచేయడానికి ఏమి అవసరం?',
        examples: [
          {
            en: 'Free elections matter, but voters also need reliable information and institutions that enforce the law impartially.',
            native:
              'స్వేచ్ఛాయుత ఎన్నికలు ముఖ్యం, కానీ ఓటర్లకు విశ్వసనీయ సమాచారం మరియు చట్టాన్ని నిష్పాక్షికంగా అమలు చేసే సంస్థలు కూడా అవసరం.',
          },
          {
            en: 'Democracy weakens when leaders treat political opponents as enemies rather than legitimate rivals.',
            native:
              'నాయకులు రాజకీయ ప్రత్యర్థులను చట్టబద్ధమైన పోటీదారులుగా కాకుండా శత్రువులుగా చూసినప్పుడు ప్రజాస్వామ్యం బలహీనపడుతుంది.',
          },
          {
            en: 'Citizens must be able to question those in power between elections, not only on voting day.',
            native:
              'పౌరులు అధికారంలో ఉన్నవారిని ఎన్నికల మధ్య కాలంలో కూడా ప్రశ్నించగలగాలి, కేవలం ఓటు వేసే రోజున మాత్రమే కాదు.',
          },
        ],
      },
      hi: {
        word: 'लोकतंत्र',
        question: 'केवल चुनाव कराने से आगे, लोकतंत्र को अच्छी तरह चलाने के लिए क्या आवश्यक है?',
        examples: [
          {
            en: 'Free elections matter, but voters also need reliable information and institutions that enforce the law impartially.',
            native:
              'स्वतंत्र चुनाव महत्वपूर्ण हैं, लेकिन मतदाताओं को विश्वसनीय जानकारी और निष्पक्ष रूप से कानून लागू करने वाली संस्थाएँ भी चाहिए।',
          },
          {
            en: 'Democracy weakens when leaders treat political opponents as enemies rather than legitimate rivals.',
            native:
              'जब नेता राजनीतिक विरोधियों को वैध प्रतिद्वंद्वी के बजाय दुश्मन मानते हैं, तो लोकतंत्र कमज़ोर होता है।',
          },
          {
            en: 'Citizens must be able to question those in power between elections, not only on voting day.',
            native:
              'नागरिकों को केवल मतदान के दिन नहीं, बल्कि चुनावों के बीच भी सत्ता में बैठे लोगों से सवाल करने में सक्षम होना चाहिए।',
          },
        ],
      },
      es: {
        word: 'democracia',
        question: '¿Qué hace que una democracia funcione bien, más allá de celebrar elecciones?',
        examples: [
          {
            en: 'Free elections matter, but voters also need reliable information and institutions that enforce the law impartially.',
            native:
              'Las elecciones libres importan, pero los votantes también necesitan información fiable e instituciones que apliquen la ley con imparcialidad.',
          },
          {
            en: 'Democracy weakens when leaders treat political opponents as enemies rather than legitimate rivals.',
            native:
              'La democracia se debilita cuando los líderes tratan a sus adversarios políticos como enemigos en vez de rivales legítimos.',
          },
          {
            en: 'Citizens must be able to question those in power between elections, not only on voting day.',
            native:
              'La ciudadanía debe poder cuestionar a quienes gobiernan entre elecciones, no solo el día de la votación.',
          },
        ],
      },
      zh: {
        word: '民主',
        question: '除了举行选举之外，怎样才能使民主制度良好运作？',
        examples: [
          {
            en: 'Free elections matter, but voters also need reliable information and institutions that enforce the law impartially.',
            native: '自由选举很重要，但选民还需要可靠的信息和公正执法的机构。',
          },
          {
            en: 'Democracy weakens when leaders treat political opponents as enemies rather than legitimate rivals.',
            native: '当领导人把政治对手视为敌人而不是合法竞争者时，民主就会削弱。',
          },
          {
            en: 'Citizens must be able to question those in power between elections, not only on voting day.',
            native: '公民必须能够在两次选举之间质询掌权者，而不只是在投票日表达意见。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'civic engagement',
    questionText:
      'Why do some people participate in community and public life while others withdraw, and how can engagement be encouraged?',
    translations: {
      te: {
        word: 'పౌర భాగస్వామ్యం',
        question:
          'కొందరు సమాజ మరియు ప్రజా జీవితంలో పాల్గొంటుండగా మరికొందరు ఎందుకు దూరమవుతారు, భాగస్వామ్యాన్ని ఎలా ప్రోత్సహించవచ్చు?',
        examples: [
          {
            en: 'People are more likely to participate when they can see a direct connection between their effort and local change.',
            native:
              'తమ కృషికి స్థానిక మార్పుకు మధ్య ప్రత్యక్ష సంబంధాన్ని చూడగలిగినప్పుడు ప్రజలు పాల్గొనే అవకాశం ఎక్కువగా ఉంటుంది.',
          },
          {
            en: 'Schools can build civic habits by giving students genuine responsibility for shared decisions.',
            native:
              'ఉమ్మడి నిర్ణయాలకు విద్యార్థులకు నిజమైన బాధ్యత ఇవ్వడం ద్వారా పాఠశాలలు పౌర అలవాట్లను పెంపొందించగలవు.',
          },
          {
            en: 'Digital campaigns raise awareness quickly, but lasting engagement usually requires work beyond clicking a button.',
            native:
              'డిజిటల్ ప్రచారాలు త్వరగా అవగాహన పెంచుతాయి, కానీ దీర్ఘకాలిక భాగస్వామ్యానికి సాధారణంగా ఒక బటన్ నొక్కడం కంటే ఎక్కువ కృషి అవసరం.',
          },
        ],
      },
      hi: {
        word: 'नागरिक भागीदारी',
        question:
          'कुछ लोग सामुदायिक और सार्वजनिक जीवन में हिस्सा क्यों लेते हैं जबकि अन्य पीछे हट जाते हैं, और भागीदारी को कैसे प्रोत्साहित किया जा सकता है?',
        examples: [
          {
            en: 'People are more likely to participate when they can see a direct connection between their effort and local change.',
            native:
              'जब लोग अपने प्रयास और स्थानीय बदलाव के बीच सीधा संबंध देख पाते हैं, तो उनके भाग लेने की संभावना अधिक होती है।',
          },
          {
            en: 'Schools can build civic habits by giving students genuine responsibility for shared decisions.',
            native: 'साझा निर्णयों के लिए छात्रों को वास्तविक ज़िम्मेदारी देकर स्कूल नागरिक आदतें विकसित कर सकते हैं।',
          },
          {
            en: 'Digital campaigns raise awareness quickly, but lasting engagement usually requires work beyond clicking a button.',
            native:
              'डिजिटल अभियान तेज़ी से जागरूकता बढ़ाते हैं, लेकिन स्थायी भागीदारी के लिए आम तौर पर बटन क्लिक करने से आगे काम करना पड़ता है।',
          },
        ],
      },
      es: {
        word: 'participación cívica',
        question:
          '¿Por qué algunas personas participan en la vida comunitaria y pública mientras otras se alejan, y cómo puede fomentarse la participación?',
        examples: [
          {
            en: 'People are more likely to participate when they can see a direct connection between their effort and local change.',
            native:
              'Es más probable que la gente participe cuando ve una relación directa entre su esfuerzo y el cambio local.',
          },
          {
            en: 'Schools can build civic habits by giving students genuine responsibility for shared decisions.',
            native:
              'Las escuelas pueden crear hábitos cívicos dando al alumnado una responsabilidad real en las decisiones compartidas.',
          },
          {
            en: 'Digital campaigns raise awareness quickly, but lasting engagement usually requires work beyond clicking a button.',
            native:
              'Las campañas digitales sensibilizan con rapidez, pero la participación duradera suele exigir trabajo más allá de pulsar un botón.',
          },
        ],
      },
      zh: {
        word: '公民参与',
        question: '为什么有些人参与社区和公共生活，而另一些人选择退出？怎样才能鼓励参与？',
        examples: [
          {
            en: 'People are more likely to participate when they can see a direct connection between their effort and local change.',
            native: '当人们能看到自己的努力与当地变化之间的直接联系时，会更愿意参与。',
          },
          {
            en: 'Schools can build civic habits by giving students genuine responsibility for shared decisions.',
            native: '学校可以让学生真正负责共同决策，从而培养公民参与习惯。',
          },
          {
            en: 'Digital campaigns raise awareness quickly, but lasting engagement usually requires work beyond clicking a button.',
            native: '数字宣传能迅速提高意识，但持久参与通常需要付出点击按钮以外的实际行动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'international cooperation',
    questionText: 'Which global problems require international cooperation, and why is agreement so difficult?',
    translations: {
      te: {
        word: 'అంతర్జాతీయ సహకారం',
        question: 'ఏ ప్రపంచ సమస్యలకు అంతర్జాతీయ సహకారం అవసరం, దేశాల మధ్య ఒప్పందం కుదరడం ఎందుకు అంత కష్టం?',
        examples: [
          {
            en: 'Climate threats, pandemics, and organized crime cross borders, so no country can manage them alone.',
            native:
              'వాతావరణ ముప్పులు, మహమ్మారులు మరియు వ్యవస్థీకృత నేరాలు సరిహద్దులను దాటుతాయి, కాబట్టి ఏ దేశమూ వాటిని ఒంటరిగా నిర్వహించలేదు.',
          },
          {
            en: 'Cooperation becomes difficult when governments face immediate domestic costs but benefits arrive much later.',
            native:
              'ప్రభుత్వాలు తక్షణ దేశీయ ఖర్చులను ఎదుర్కొంటూ ప్రయోజనాలు చాలా ఆలస్యంగా వచ్చినప్పుడు సహకారం కష్టమవుతుంది.',
          },
          {
            en: 'Shared goals are more credible when wealthy countries contribute resources as well as promises.',
            native:
              'సంపన్న దేశాలు వాగ్దానాలతో పాటు వనరులను కూడా అందించినప్పుడు ఉమ్మడి లక్ష్యాలు మరింత విశ్వసనీయంగా ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'अंतरराष्ट्रीय सहयोग',
        question: 'किन वैश्विक समस्याओं के लिए अंतरराष्ट्रीय सहयोग आवश्यक है, और सहमति बनाना इतना कठिन क्यों होता है?',
        examples: [
          {
            en: 'Climate threats, pandemics, and organized crime cross borders, so no country can manage them alone.',
            native:
              'जलवायु संबंधी खतरे, महामारियाँ और संगठित अपराध सीमाएँ पार करते हैं, इसलिए कोई देश अकेले उनसे नहीं निपट सकता।',
          },
          {
            en: 'Cooperation becomes difficult when governments face immediate domestic costs but benefits arrive much later.',
            native:
              'जब सरकारों को तुरंत घरेलू लागत उठानी पड़ती है लेकिन लाभ बहुत बाद में मिलते हैं, तब सहयोग कठिन हो जाता है।',
          },
          {
            en: 'Shared goals are more credible when wealthy countries contribute resources as well as promises.',
            native: 'जब धनी देश वादों के साथ संसाधन भी देते हैं, तब साझा लक्ष्य अधिक विश्वसनीय लगते हैं।',
          },
        ],
      },
      es: {
        word: 'cooperación internacional',
        question:
          '¿Qué problemas mundiales requieren cooperación internacional y por qué es tan difícil llegar a acuerdos?',
        examples: [
          {
            en: 'Climate threats, pandemics, and organized crime cross borders, so no country can manage them alone.',
            native:
              'Las amenazas climáticas, las pandemias y el crimen organizado cruzan fronteras, por lo que ningún país puede afrontarlos solo.',
          },
          {
            en: 'Cooperation becomes difficult when governments face immediate domestic costs but benefits arrive much later.',
            native:
              'La cooperación se vuelve difícil cuando los gobiernos afrontan costes nacionales inmediatos, pero los beneficios llegan mucho después.',
          },
          {
            en: 'Shared goals are more credible when wealthy countries contribute resources as well as promises.',
            native:
              'Los objetivos compartidos son más creíbles cuando los países ricos aportan recursos además de promesas.',
          },
        ],
      },
      zh: {
        word: '国际合作',
        question: '哪些全球性问题需要国际合作，各国为何难以达成协议？',
        examples: [
          {
            en: 'Climate threats, pandemics, and organized crime cross borders, so no country can manage them alone.',
            native: '气候威胁、流行病和有组织犯罪都会跨越国界，因此任何国家都无法独自应对。',
          },
          {
            en: 'Cooperation becomes difficult when governments face immediate domestic costs but benefits arrive much later.',
            native: '当政府要立即承担国内成本，而收益很久以后才会出现时，合作就会变得困难。',
          },
          {
            en: 'Shared goals are more credible when wealthy countries contribute resources as well as promises.',
            native: '富裕国家不仅作出承诺，还投入资源时，共同目标会更可信。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'humanitarian aid',
    questionText: 'How can humanitarian aid meet urgent needs without creating dependency or ignoring local knowledge?',
    translations: {
      te: {
        word: 'మానవతా సహాయం',
        question:
          'స్థానిక జ్ఞానాన్ని విస్మరించకుండా లేదా ఆధారపడే పరిస్థితిని సృష్టించకుండా మానవతా సహాయం అత్యవసర అవసరాలను ఎలా తీర్చగలదు?',
        examples: [
          {
            en: 'Emergency aid should reach people according to need rather than political loyalty or media attention.',
            native: 'అత్యవసర సహాయం రాజకీయ విధేయత లేదా మీడియా దృష్టి ఆధారంగా కాకుండా అవసరం ఆధారంగా ప్రజలకు చేరాలి.',
          },
          {
            en: 'Local organizations often understand communities better and should help decide how resources are used.',
            native:
              'స్థానిక సంస్థలకు తరచుగా సమాజాల గురించి మెరుగైన అవగాహన ఉంటుంది, కాబట్టి వనరులను ఎలా ఉపయోగించాలో నిర్ణయించడంలో అవి భాగస్వామ్యం కావాలి.',
          },
          {
            en: 'Long-term recovery requires restoring livelihoods and public services, not distributing supplies forever.',
            native:
              'దీర్ఘకాలిక పునరుద్ధరణకు సరఫరాలను ఎప్పటికీ పంచడం కాకుండా జీవనోపాధులు మరియు ప్రజా సేవలను పునరుద్ధరించడం అవసరం.',
          },
        ],
      },
      hi: {
        word: 'मानवीय सहायता',
        question:
          'मानवीय सहायता निर्भरता पैदा किए या स्थानीय ज्ञान की अनदेखी किए बिना तत्काल ज़रूरतें कैसे पूरी कर सकती है?',
        examples: [
          {
            en: 'Emergency aid should reach people according to need rather than political loyalty or media attention.',
            native:
              'आपातकालीन सहायता राजनीतिक निष्ठा या मीडिया के ध्यान के बजाय ज़रूरत के अनुसार लोगों तक पहुँचनी चाहिए।',
          },
          {
            en: 'Local organizations often understand communities better and should help decide how resources are used.',
            native:
              'स्थानीय संगठन अक्सर समुदायों को बेहतर समझते हैं और उन्हें यह तय करने में भाग लेना चाहिए कि संसाधनों का उपयोग कैसे हो।',
          },
          {
            en: 'Long-term recovery requires restoring livelihoods and public services, not distributing supplies forever.',
            native:
              'लंबी अवधि की बहाली के लिए आजीविका और सार्वजनिक सेवाएँ फिर से स्थापित करनी होती हैं, हमेशा सामग्री बाँटते रहना पर्याप्त नहीं है।',
          },
        ],
      },
      es: {
        word: 'ayuda humanitaria',
        question:
          '¿Cómo puede la ayuda humanitaria atender necesidades urgentes sin crear dependencia ni ignorar el conocimiento local?',
        examples: [
          {
            en: 'Emergency aid should reach people according to need rather than political loyalty or media attention.',
            native:
              'La ayuda de emergencia debería llegar a la gente según sus necesidades, no según su lealtad política ni la atención mediática.',
          },
          {
            en: 'Local organizations often understand communities better and should help decide how resources are used.',
            native:
              'Las organizaciones locales suelen comprender mejor a las comunidades y deberían ayudar a decidir cómo se utilizan los recursos.',
          },
          {
            en: 'Long-term recovery requires restoring livelihoods and public services, not distributing supplies forever.',
            native:
              'La recuperación a largo plazo exige restablecer los medios de vida y los servicios públicos, no repartir suministros para siempre.',
          },
        ],
      },
      zh: {
        word: '人道主义援助',
        question: '人道主义援助如何在不造成依赖或忽视当地知识的情况下满足紧急需求？',
        examples: [
          {
            en: 'Emergency aid should reach people according to need rather than political loyalty or media attention.',
            native: '紧急援助应根据需求送到人们手中，而不是取决于政治立场或媒体关注度。',
          },
          {
            en: 'Local organizations often understand communities better and should help decide how resources are used.',
            native: '当地组织往往更了解社区，因此应该参与决定资源的使用方式。',
          },
          {
            en: 'Long-term recovery requires restoring livelihoods and public services, not distributing supplies forever.',
            native: '长期恢复需要重建生计和公共服务，而不是永远发放物资。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'animal welfare',
    questionText: 'What responsibilities do humans have toward animals used for food, research, and entertainment?',
    translations: {
      te: {
        word: 'జంతు సంక్షేమం',
        question: 'ఆహారం, పరిశోధన మరియు వినోదం కోసం ఉపయోగించే జంతువుల పట్ల మనుషులకు ఎలాంటి బాధ్యతలు ఉన్నాయి?',
        examples: [
          {
            en: 'At a minimum, animals should be protected from unnecessary pain and kept in conditions suited to their needs.',
            native: 'కనీసం, జంతువులను అనవసరమైన బాధ నుండి రక్షించి, వాటి అవసరాలకు తగిన పరిస్థితుల్లో ఉంచాలి.',
          },
          {
            en: 'Scientific research involving animals should proceed only when no reliable alternative exists.',
            native: 'నమ్మదగిన ప్రత్యామ్నాయం లేనప్పుడు మాత్రమే జంతువులతో కూడిన శాస్త్రీయ పరిశోధన కొనసాగాలి.',
          },
          {
            en: 'Consumers can influence welfare standards by asking how products were produced, although clear labels are essential.',
            native:
              'ఉత్పత్తులు ఎలా తయారయ్యాయో అడగడం ద్వారా వినియోగదారులు జంతు సంక్షేమ ప్రమాణాలను ప్రభావితం చేయగలరు, అయితే స్పష్టమైన లేబుళ్లు అవసరం.',
          },
        ],
      },
      hi: {
        word: 'पशु कल्याण',
        question:
          'भोजन, अनुसंधान और मनोरंजन के लिए उपयोग किए जाने वाले पशुओं के प्रति मनुष्यों की क्या ज़िम्मेदारियाँ हैं?',
        examples: [
          {
            en: 'At a minimum, animals should be protected from unnecessary pain and kept in conditions suited to their needs.',
            native:
              'कम से कम, पशुओं को अनावश्यक पीड़ा से बचाया जाना चाहिए और उनकी ज़रूरतों के अनुकूल परिस्थितियों में रखा जाना चाहिए।',
          },
          {
            en: 'Scientific research involving animals should proceed only when no reliable alternative exists.',
            native: 'पशुओं पर आधारित वैज्ञानिक अनुसंधान तभी होना चाहिए जब कोई विश्वसनीय विकल्प उपलब्ध न हो।',
          },
          {
            en: 'Consumers can influence welfare standards by asking how products were produced, although clear labels are essential.',
            native:
              'उत्पाद कैसे बनाए गए, यह पूछकर उपभोक्ता कल्याण मानकों को प्रभावित कर सकते हैं, हालाँकि स्पष्ट लेबल आवश्यक हैं।',
          },
        ],
      },
      es: {
        word: 'bienestar animal',
        question:
          '¿Qué responsabilidades tenemos hacia los animales utilizados para la alimentación, la investigación y el entretenimiento?',
        examples: [
          {
            en: 'At a minimum, animals should be protected from unnecessary pain and kept in conditions suited to their needs.',
            native:
              'Como mínimo, los animales deberían estar protegidos del dolor innecesario y mantenerse en condiciones adecuadas para sus necesidades.',
          },
          {
            en: 'Scientific research involving animals should proceed only when no reliable alternative exists.',
            native:
              'La investigación científica con animales solo debería realizarse cuando no exista una alternativa fiable.',
          },
          {
            en: 'Consumers can influence welfare standards by asking how products were produced, although clear labels are essential.',
            native:
              'Los consumidores pueden influir en las normas de bienestar preguntando cómo se produjeron los productos, aunque es esencial un etiquetado claro.',
          },
        ],
      },
      zh: {
        word: '动物福利',
        question: '对于被用于食物、研究和娱乐的动物，人类负有哪些责任？',
        examples: [
          {
            en: 'At a minimum, animals should be protected from unnecessary pain and kept in conditions suited to their needs.',
            native: '至少应该保护动物免受不必要的痛苦，并为它们提供符合其需求的生活条件。',
          },
          {
            en: 'Scientific research involving animals should proceed only when no reliable alternative exists.',
            native: '只有在没有可靠替代方案时，才应该开展涉及动物的科学研究。',
          },
          {
            en: 'Consumers can influence welfare standards by asking how products were produced, although clear labels are essential.',
            native: '消费者可以通过询问产品的生产方式来影响福利标准，但清晰的标签必不可少。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'sustainable agriculture',
    questionText: 'How can farming produce enough food while protecting soil, water, and rural livelihoods?',
    translations: {
      te: {
        word: 'సుస్థిర వ్యవసాయం',
        question: 'వ్యవసాయం నేల, నీరు మరియు గ్రామీణ జీవనోపాధులను కాపాడుతూ తగినంత ఆహారాన్ని ఎలా ఉత్పత్తి చేయగలదు?',
        examples: [
          {
            en: 'Sustainable farming protects soil through crop rotation, careful grazing, and reduced dependence on harmful chemicals.',
            native:
              'పంట మార్పిడి, జాగ్రత్తగా పశువులను మేపడం మరియు హానికరమైన రసాయనాలపై ఆధారపడటాన్ని తగ్గించడం ద్వారా సుస్థిర వ్యవసాయం నేలను రక్షిస్తుంది.',
          },
          {
            en: 'Farmers need financial support during the transition because environmental benefits may take several seasons to appear.',
            native:
              'పర్యావరణ ప్రయోజనాలు కనిపించడానికి అనేక పంట కాలాలు పట్టవచ్చు కాబట్టి మార్పు సమయంలో రైతులకు ఆర్థిక సహాయం అవసరం.',
          },
          {
            en: 'Technology can reduce water and fertilizer use, but solutions must remain affordable for small farms.',
            native:
              'సాంకేతికత నీరు మరియు ఎరువుల వినియోగాన్ని తగ్గించగలదు, కానీ పరిష్కారాలు చిన్న రైతులకు అందుబాటు ధరలో ఉండాలి.',
          },
        ],
      },
      hi: {
        word: 'टिकाऊ कृषि',
        question: 'खेती मिट्टी, पानी और ग्रामीण आजीविका की रक्षा करते हुए पर्याप्त भोजन कैसे पैदा कर सकती है?',
        examples: [
          {
            en: 'Sustainable farming protects soil through crop rotation, careful grazing, and reduced dependence on harmful chemicals.',
            native:
              'टिकाऊ खेती फसल चक्र, नियंत्रित चराई और हानिकारक रसायनों पर कम निर्भरता के ज़रिए मिट्टी की रक्षा करती है।',
          },
          {
            en: 'Farmers need financial support during the transition because environmental benefits may take several seasons to appear.',
            native:
              'बदलाव के दौरान किसानों को वित्तीय सहायता चाहिए क्योंकि पर्यावरणीय लाभ दिखाई देने में कई मौसम लग सकते हैं।',
          },
          {
            en: 'Technology can reduce water and fertilizer use, but solutions must remain affordable for small farms.',
            native: 'तकनीक पानी और उर्वरक का उपयोग कम कर सकती है, लेकिन समाधान छोटे किसानों की पहुँच में रहने चाहिए।',
          },
        ],
      },
      es: {
        word: 'agricultura sostenible',
        question:
          '¿Cómo puede la agricultura producir suficiente alimento y a la vez proteger el suelo, el agua y los medios de vida rurales?',
        examples: [
          {
            en: 'Sustainable farming protects soil through crop rotation, careful grazing, and reduced dependence on harmful chemicals.',
            native:
              'La agricultura sostenible protege el suelo mediante la rotación de cultivos, el pastoreo cuidadoso y una menor dependencia de productos químicos nocivos.',
          },
          {
            en: 'Farmers need financial support during the transition because environmental benefits may take several seasons to appear.',
            native:
              'Los agricultores necesitan apoyo económico durante la transición porque los beneficios ambientales pueden tardar varias temporadas en aparecer.',
          },
          {
            en: 'Technology can reduce water and fertilizer use, but solutions must remain affordable for small farms.',
            native:
              'La tecnología puede reducir el uso de agua y fertilizantes, pero las soluciones deben seguir siendo asequibles para las pequeñas explotaciones.',
          },
        ],
      },
      zh: {
        word: '可持续农业',
        question: '农业如何在生产充足食物的同时保护土壤、水资源和农村生计？',
        examples: [
          {
            en: 'Sustainable farming protects soil through crop rotation, careful grazing, and reduced dependence on harmful chemicals.',
            native: '可持续农业通过轮作、合理放牧和减少对有害化学品的依赖来保护土壤。',
          },
          {
            en: 'Farmers need financial support during the transition because environmental benefits may take several seasons to appear.',
            native: '转型期间农民需要资金支持，因为环境效益可能要经过几个种植季才会显现。',
          },
          {
            en: 'Technology can reduce water and fertilizer use, but solutions must remain affordable for small farms.',
            native: '技术可以减少水和肥料的使用，但解决方案必须让小型农场负担得起。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'food security',
    questionText:
      'Why do people suffer hunger in a world that produces enough food, and which responses are most effective?',
    translations: {
      te: {
        word: 'ఆహార భద్రత',
        question:
          'తగినంత ఆహారాన్ని ఉత్పత్తి చేసే ప్రపంచంలో కూడా ప్రజలు ఆకలితో ఎందుకు బాధపడుతున్నారు, ఏ పరిష్కారాలు అత్యంత ప్రభావవంతమైనవి?',
        examples: [
          {
            en: 'Food insecurity is often caused by poverty, conflict, and weak distribution rather than a total lack of food.',
            native: 'ఆహార అభద్రత తరచుగా మొత్తం ఆహార కొరత కంటే పేదరికం, ఘర్షణ మరియు బలహీనమైన పంపిణీ వల్ల కలుగుతుంది.',
          },
          {
            en: 'Reliable storage and transport can prevent harvests from being lost before they reach consumers.',
            native: 'విశ్వసనీయమైన నిల్వ మరియు రవాణా పంటలు వినియోగదారులకు చేరకముందే నష్టపోకుండా నివారించగలవు.',
          },
          {
            en: 'Governments should combine emergency assistance with policies that help families earn stable incomes.',
            native:
              'ప్రభుత్వాలు అత్యవసర సహాయాన్ని, కుటుంబాలు స్థిరమైన ఆదాయాన్ని సంపాదించడానికి సహాయపడే విధానాలతో కలపాలి.',
          },
        ],
      },
      hi: {
        word: 'खाद्य सुरक्षा',
        question:
          'पर्याप्त भोजन पैदा करने वाली दुनिया में भी लोग भूख से क्यों पीड़ित हैं, और कौन-से उपाय सबसे प्रभावी हैं?',
        examples: [
          {
            en: 'Food insecurity is often caused by poverty, conflict, and weak distribution rather than a total lack of food.',
            native: 'खाद्य असुरक्षा अक्सर भोजन की पूरी कमी के बजाय गरीबी, संघर्ष और कमज़ोर वितरण के कारण होती है।',
          },
          {
            en: 'Reliable storage and transport can prevent harvests from being lost before they reach consumers.',
            native: 'भरोसेमंद भंडारण और परिवहन फसल को उपभोक्ताओं तक पहुँचने से पहले बर्बाद होने से बचा सकते हैं।',
          },
          {
            en: 'Governments should combine emergency assistance with policies that help families earn stable incomes.',
            native:
              'सरकारों को आपातकालीन सहायता के साथ ऐसी नीतियाँ जोड़नी चाहिए जो परिवारों को स्थिर आय कमाने में मदद करें।',
          },
        ],
      },
      es: {
        word: 'seguridad alimentaria',
        question:
          '¿Por qué hay personas que pasan hambre en un mundo que produce suficiente alimento y qué respuestas son más eficaces?',
        examples: [
          {
            en: 'Food insecurity is often caused by poverty, conflict, and weak distribution rather than a total lack of food.',
            native:
              'La inseguridad alimentaria suele deberse a la pobreza, los conflictos y una distribución deficiente, no a una falta total de alimentos.',
          },
          {
            en: 'Reliable storage and transport can prevent harvests from being lost before they reach consumers.',
            native:
              'Un almacenamiento y un transporte fiables pueden evitar que las cosechas se pierdan antes de llegar a los consumidores.',
          },
          {
            en: 'Governments should combine emergency assistance with policies that help families earn stable incomes.',
            native:
              'Los gobiernos deberían combinar la ayuda de emergencia con políticas que permitan a las familias obtener ingresos estables.',
          },
        ],
      },
      zh: {
        word: '粮食安全',
        question: '世界生产的食物足够，为何仍有人挨饿？哪些对策最有效？',
        examples: [
          {
            en: 'Food insecurity is often caused by poverty, conflict, and weak distribution rather than a total lack of food.',
            native: '粮食不安全往往源于贫困、冲突和分配不畅，而不是食物总量不足。',
          },
          {
            en: 'Reliable storage and transport can prevent harvests from being lost before they reach consumers.',
            native: '可靠的储存和运输可以防止收成在送达消费者之前损失。',
          },
          {
            en: 'Governments should combine emergency assistance with policies that help families earn stable incomes.',
            native: '政府应该把紧急援助与帮助家庭获得稳定收入的政策结合起来。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'water scarcity',
    questionText:
      'What causes water scarcity, and how should limited water be shared among households, farming, and industry?',
    translations: {
      te: {
        word: 'నీటి కొరత',
        question: 'నీటి కొరతకు కారణాలు ఏమిటి, పరిమిత నీటిని గృహాలు, వ్యవసాయం మరియు పరిశ్రమల మధ్య ఎలా పంచాలి?',
        examples: [
          {
            en: 'Scarcity results not only from low rainfall but also from pollution, leaking systems, and excessive demand.',
            native:
              'కొరత తక్కువ వర్షపాతం వల్ల మాత్రమే కాకుండా కాలుష్యం, లీకవుతున్న వ్యవస్థలు మరియు అధిక డిమాండ్ వల్ల కూడా ఏర్పడుతుంది.',
          },
          {
            en: 'Basic household needs should take priority, while heavy users pay prices that encourage conservation.',
            native:
              'ప్రాథమిక గృహ అవసరాలకు ప్రాధాన్యం ఇవ్వాలి, అధికంగా వినియోగించేవారు పొదుపును ప్రోత్సహించే ధరలు చెల్లించాలి.',
          },
          {
            en: 'Regions can prepare for drought by reusing wastewater, protecting rivers, and choosing crops suited to local conditions.',
            native:
              'వ్యర్థ జలాలను తిరిగి ఉపయోగించడం, నదులను రక్షించడం మరియు స్థానిక పరిస్థితులకు సరిపోయే పంటలను ఎంచుకోవడం ద్వారా ప్రాంతాలు కరువుకు సిద్ధమవగలవు.',
          },
        ],
      },
      hi: {
        word: 'जल संकट',
        question: 'जल संकट किन कारणों से होता है, और सीमित पानी को घरों, खेती और उद्योग के बीच कैसे बाँटा जाना चाहिए?',
        examples: [
          {
            en: 'Scarcity results not only from low rainfall but also from pollution, leaking systems, and excessive demand.',
            native: 'कमी केवल कम वर्षा से नहीं, बल्कि प्रदूषण, रिसती व्यवस्थाओं और अत्यधिक माँग से भी पैदा होती है।',
          },
          {
            en: 'Basic household needs should take priority, while heavy users pay prices that encourage conservation.',
            native:
              'घरों की बुनियादी ज़रूरतों को प्राथमिकता मिलनी चाहिए, जबकि अधिक उपयोग करने वालों से ऐसी कीमत ली जाए जो बचत को प्रोत्साहित करे।',
          },
          {
            en: 'Regions can prepare for drought by reusing wastewater, protecting rivers, and choosing crops suited to local conditions.',
            native:
              'क्षेत्र अपशिष्ट जल का दोबारा उपयोग करके, नदियों की रक्षा करके और स्थानीय परिस्थितियों के अनुकूल फसलें चुनकर सूखे की तैयारी कर सकते हैं।',
          },
        ],
      },
      es: {
        word: 'escasez de agua',
        question:
          '¿Qué causa la escasez de agua y cómo debería repartirse el agua limitada entre los hogares, la agricultura y la industria?',
        examples: [
          {
            en: 'Scarcity results not only from low rainfall but also from pollution, leaking systems, and excessive demand.',
            native:
              'La escasez no solo se debe a la falta de lluvia, sino también a la contaminación, las redes con fugas y una demanda excesiva.',
          },
          {
            en: 'Basic household needs should take priority, while heavy users pay prices that encourage conservation.',
            native:
              'Las necesidades domésticas básicas deberían tener prioridad, mientras que los grandes usuarios pagarían precios que fomenten el ahorro.',
          },
          {
            en: 'Regions can prepare for drought by reusing wastewater, protecting rivers, and choosing crops suited to local conditions.',
            native:
              'Las regiones pueden prepararse para la sequía reutilizando aguas residuales, protegiendo los ríos y eligiendo cultivos adaptados a las condiciones locales.',
          },
        ],
      },
      zh: {
        word: '水资源短缺',
        question: '水资源短缺由什么造成，有限的水应如何在家庭、农业和工业之间分配？',
        examples: [
          {
            en: 'Scarcity results not only from low rainfall but also from pollution, leaking systems, and excessive demand.',
            native: '水资源短缺不仅源于降雨不足，也来自污染、管网泄漏和过度需求。',
          },
          {
            en: 'Basic household needs should take priority, while heavy users pay prices that encourage conservation.',
            native: '基本家庭需求应优先得到满足，而用水大户应支付能够鼓励节约的价格。',
          },
          {
            en: 'Regions can prepare for drought by reusing wastewater, protecting rivers, and choosing crops suited to local conditions.',
            native: '各地区可以通过回用废水、保护河流和选择适合当地条件的作物来应对干旱。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'urban planning',
    questionText: 'What makes a city well planned for residents of different ages, abilities, and incomes?',
    translations: {
      te: {
        word: 'పట్టణ ప్రణాళిక',
        question:
          'విభిన్న వయసులు, సామర్థ్యాలు మరియు ఆదాయాలు గల నివాసులకు ఒక నగరం చక్కగా ప్రణాళిక చేయబడిందని చెప్పడానికి ఏమి అవసరం?',
        examples: [
          {
            en: 'Good planning places homes, jobs, schools, and services close enough to reduce unnecessary travel.',
            native:
              'మంచి ప్రణాళిక ఇళ్లు, ఉద్యోగాలు, పాఠశాలలు మరియు సేవలను అనవసర ప్రయాణాన్ని తగ్గించేంత దగ్గరగా ఉంచుతుంది.',
          },
          {
            en: 'Safe pavements, public spaces, and reliable transport allow children, older people, and disabled residents to participate.',
            native:
              'సురక్షితమైన కాలిబాటలు, బహిరంగ ప్రదేశాలు మరియు విశ్వసనీయ రవాణా పిల్లలు, వృద్ధులు మరియు దివ్యాంగ నివాసులు పాల్గొనేలా చేస్తాయి.',
          },
          {
            en: 'Residents should influence major developments before decisions become too expensive to change.',
            native:
              'నిర్ణయాలను మార్చడం చాలా ఖరీదైనదిగా మారకముందే ప్రధాన నిర్మాణ ప్రాజెక్టులపై నివాసులు ప్రభావం చూపాలి.',
          },
        ],
      },
      hi: {
        word: 'शहरी नियोजन',
        question: 'अलग-अलग उम्र, क्षमताओं और आय वाले निवासियों के लिए किसी शहर को सुनियोजित क्या बनाता है?',
        examples: [
          {
            en: 'Good planning places homes, jobs, schools, and services close enough to reduce unnecessary travel.',
            native: 'अच्छा नियोजन घरों, नौकरियों, स्कूलों और सेवाओं को इतना पास रखता है कि अनावश्यक यात्रा कम हो।',
          },
          {
            en: 'Safe pavements, public spaces, and reliable transport allow children, older people, and disabled residents to participate.',
            native:
              'सुरक्षित फुटपाथ, सार्वजनिक स्थान और भरोसेमंद परिवहन बच्चों, बुज़ुर्गों और दिव्यांग निवासियों को भाग लेने में सक्षम बनाते हैं।',
          },
          {
            en: 'Residents should influence major developments before decisions become too expensive to change.',
            native:
              'निर्णयों को बदलना बहुत महँगा होने से पहले निवासियों को बड़ी विकास परियोजनाओं पर प्रभाव डालने का अवसर मिलना चाहिए।',
          },
        ],
      },
      es: {
        word: 'planificación urbana',
        question:
          '¿Qué hace que una ciudad esté bien planificada para residentes de distintas edades, capacidades e ingresos?',
        examples: [
          {
            en: 'Good planning places homes, jobs, schools, and services close enough to reduce unnecessary travel.',
            native:
              'Una buena planificación sitúa las viviendas, los empleos, las escuelas y los servicios lo bastante cerca para reducir desplazamientos innecesarios.',
          },
          {
            en: 'Safe pavements, public spaces, and reliable transport allow children, older people, and disabled residents to participate.',
            native:
              'Las aceras seguras, los espacios públicos y el transporte fiable permiten participar a niños, mayores y residentes con discapacidad.',
          },
          {
            en: 'Residents should influence major developments before decisions become too expensive to change.',
            native:
              'Los residentes deberían influir en los grandes proyectos antes de que resulte demasiado caro cambiar las decisiones.',
          },
        ],
      },
      zh: {
        word: '城市规划',
        question: '怎样规划城市，才能满足不同年龄、能力和收入水平居民的需求？',
        examples: [
          {
            en: 'Good planning places homes, jobs, schools, and services close enough to reduce unnecessary travel.',
            native: '良好的规划让住宅、工作地点、学校和服务设施距离合理，从而减少不必要的出行。',
          },
          {
            en: 'Safe pavements, public spaces, and reliable transport allow children, older people, and disabled residents to participate.',
            native: '安全的人行道、公共空间和可靠的交通，使儿童、老年人和残障居民都能参与社会生活。',
          },
          {
            en: 'Residents should influence major developments before decisions become too expensive to change.',
            native: '居民应该在改变决定的代价变得过高之前，参与影响重大开发项目。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'infrastructure',
    questionText: 'How should governments decide which infrastructure projects to fund and maintain?',
    translations: {
      te: {
        word: 'మౌలిక సదుపాయాలు',
        question:
          'ఏ మౌలిక సదుపాయాల ప్రాజెక్టులకు నిధులు ఇవ్వాలి మరియు వాటిని నిర్వహించాలి అనే విషయాన్ని ప్రభుత్వాలు ఎలా నిర్ణయించాలి?',
        examples: [
          {
            en: 'Maintenance is less visible than a new bridge, but neglecting it creates higher costs and serious safety risks.',
            native:
              'కొత్త వంతెనతో పోలిస్తే నిర్వహణ అంతగా కనిపించదు, కానీ దాన్ని నిర్లక్ష్యం చేయడం ఎక్కువ ఖర్చులకు మరియు తీవ్రమైన భద్రతా ప్రమాదాలకు దారితీస్తుంది.',
          },
          {
            en: 'Projects should be judged by long-term public value rather than short-term political popularity.',
            native: 'ప్రాజెక్టులను స్వల్పకాలిక రాజకీయ ప్రజాదరణతో కాకుండా దీర్ఘకాలిక ప్రజా విలువతో అంచనా వేయాలి.',
          },
          {
            en: 'Transparent budgets and independent inspections make it harder for corruption to waste essential investment.',
            native:
              'పారదర్శక బడ్జెట్లు మరియు స్వతంత్ర తనిఖీల వల్ల కీలకమైన పెట్టుబడిని అవినీతి వృథా చేయడం మరింత కష్టమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'बुनियादी ढाँचा',
        question: 'सरकारों को यह कैसे तय करना चाहिए कि किन बुनियादी ढाँचा परियोजनाओं को धन और रखरखाव दिया जाए?',
        examples: [
          {
            en: 'Maintenance is less visible than a new bridge, but neglecting it creates higher costs and serious safety risks.',
            native:
              'रखरखाव नए पुल जितना दिखाई नहीं देता, लेकिन उसकी उपेक्षा अधिक लागत और गंभीर सुरक्षा जोखिम पैदा करती है।',
          },
          {
            en: 'Projects should be judged by long-term public value rather than short-term political popularity.',
            native:
              'परियोजनाओं का आकलन अल्पकालिक राजनीतिक लोकप्रियता के बजाय दीर्घकालिक सार्वजनिक मूल्य से होना चाहिए।',
          },
          {
            en: 'Transparent budgets and independent inspections make it harder for corruption to waste essential investment.',
            native: 'पारदर्शी बजट और स्वतंत्र निरीक्षण भ्रष्टाचार के लिए आवश्यक निवेश को बर्बाद करना कठिन बनाते हैं।',
          },
        ],
      },
      es: {
        word: 'infraestructura',
        question: '¿Cómo deberían decidir los gobiernos qué proyectos de infraestructura financiar y mantener?',
        examples: [
          {
            en: 'Maintenance is less visible than a new bridge, but neglecting it creates higher costs and serious safety risks.',
            native:
              'El mantenimiento es menos visible que un puente nuevo, pero descuidarlo genera costes mayores y graves riesgos de seguridad.',
          },
          {
            en: 'Projects should be judged by long-term public value rather than short-term political popularity.',
            native:
              'Los proyectos deberían evaluarse por su valor público a largo plazo, no por su popularidad política inmediata.',
          },
          {
            en: 'Transparent budgets and independent inspections make it harder for corruption to waste essential investment.',
            native:
              'Los presupuestos transparentes y las inspecciones independientes dificultan que la corrupción desperdicie inversiones esenciales.',
          },
        ],
      },
      zh: {
        word: '基础设施',
        question: '政府应如何决定资助和维护哪些基础设施项目？',
        examples: [
          {
            en: 'Maintenance is less visible than a new bridge, but neglecting it creates higher costs and serious safety risks.',
            native: '维护工作不像新桥那样引人注目，但忽视维护会造成更高成本和严重安全风险。',
          },
          {
            en: 'Projects should be judged by long-term public value rather than short-term political popularity.',
            native: '评估项目应看其长期公共价值，而不是短期政治热度。',
          },
          {
            en: 'Transparent budgets and independent inspections make it harder for corruption to waste essential investment.',
            native: '透明的预算和独立检查能降低腐败浪费关键投资的可能性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'energy conservation',
    questionText: 'Who should bear responsibility for reducing energy use: individuals, businesses, or governments?',
    translations: {
      te: {
        word: 'శక్తి సంరక్షణ',
        question: 'శక్తి వినియోగాన్ని తగ్గించే బాధ్యతను ఎవరు భరించాలి: వ్యక్తులా, వ్యాపారాలా, లేక ప్రభుత్వాలా?',
        examples: [
          {
            en: 'Households can reduce waste, but efficient buildings and appliances make responsible choices much easier.',
            native:
              'గృహాలు వృథాను తగ్గించగలవు, కానీ శక్తి సామర్థ్యం గల భవనాలు మరియు ఉపకరణాలు బాధ్యతాయుతమైన ఎంపికలను చాలా సులభం చేస్తాయి.',
          },
          {
            en: 'Businesses should measure their energy use and invest first in changes that save both power and money.',
            native:
              'వ్యాపారాలు తమ శక్తి వినియోగాన్ని కొలిచి, విద్యుత్తు మరియు డబ్బు రెండింటినీ ఆదా చేసే మార్పుల్లో ముందుగా పెట్టుబడి పెట్టాలి.',
          },
          {
            en: 'Governments can set firm standards while helping low-income families afford necessary improvements.',
            native:
              'ప్రభుత్వాలు కఠినమైన ప్రమాణాలను నిర్ణయిస్తూ, తక్కువ ఆదాయం గల కుటుంబాలు అవసరమైన మెరుగుదలల ఖర్చును భరించడానికి సహాయపడగలవు.',
          },
        ],
      },
      hi: {
        word: 'ऊर्जा संरक्षण',
        question: 'ऊर्जा का उपयोग घटाने की ज़िम्मेदारी किसे उठानी चाहिए: व्यक्तियों, व्यवसायों या सरकारों को?',
        examples: [
          {
            en: 'Households can reduce waste, but efficient buildings and appliances make responsible choices much easier.',
            native:
              'परिवार बर्बादी कम कर सकते हैं, लेकिन ऊर्जा-कुशल इमारतें और उपकरण ज़िम्मेदार विकल्प चुनना बहुत आसान बनाते हैं।',
          },
          {
            en: 'Businesses should measure their energy use and invest first in changes that save both power and money.',
            native:
              'व्यवसायों को अपने ऊर्जा उपयोग को मापना चाहिए और पहले उन बदलावों में निवेश करना चाहिए जो बिजली और पैसा दोनों बचाएँ।',
          },
          {
            en: 'Governments can set firm standards while helping low-income families afford necessary improvements.',
            native:
              'सरकारें सख्त मानक तय करने के साथ कम आय वाले परिवारों को आवश्यक सुधारों का खर्च उठाने में मदद कर सकती हैं।',
          },
        ],
      },
      es: {
        word: 'ahorro energético',
        question:
          '¿Quién debería asumir la responsabilidad de reducir el consumo de energía: las personas, las empresas o los gobiernos?',
        examples: [
          {
            en: 'Households can reduce waste, but efficient buildings and appliances make responsible choices much easier.',
            native:
              'Los hogares pueden reducir el desperdicio, pero los edificios y aparatos eficientes facilitan mucho las decisiones responsables.',
          },
          {
            en: 'Businesses should measure their energy use and invest first in changes that save both power and money.',
            native:
              'Las empresas deberían medir su consumo energético e invertir primero en cambios que ahorren tanto energía como dinero.',
          },
          {
            en: 'Governments can set firm standards while helping low-income families afford necessary improvements.',
            native:
              'Los gobiernos pueden establecer normas firmes y ayudar a las familias de bajos ingresos a costear las mejoras necesarias.',
          },
        ],
      },
      zh: {
        word: '节约能源',
        question: '减少能源使用的责任应该由个人、企业还是政府承担？',
        examples: [
          {
            en: 'Households can reduce waste, but efficient buildings and appliances make responsible choices much easier.',
            native: '家庭可以减少浪费，但节能建筑和电器能让负责任的选择容易得多。',
          },
          {
            en: 'Businesses should measure their energy use and invest first in changes that save both power and money.',
            native: '企业应该衡量能源使用情况，并优先投资于既省电又省钱的改进。',
          },
          {
            en: 'Governments can set firm standards while helping low-income families afford necessary improvements.',
            native: '政府可以制定严格标准，同时帮助低收入家庭负担必要的改造。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'biodiversity',
    questionText: 'Why is biodiversity important, and what sacrifices should society make to protect it?',
    translations: {
      te: {
        word: 'జీవ వైవిధ్యం',
        question: 'జీవ వైవిధ్యం ఎందుకు ముఖ్యం, దాన్ని రక్షించడానికి సమాజం ఎలాంటి త్యాగాలు చేయాలి?',
        examples: [
          {
            en: 'Biodiversity makes ecosystems more resilient because different species perform connected roles.',
            native:
              'వివిధ జాతులు పరస్పర సంబంధం ఉన్న పాత్రలను నిర్వహిస్తాయి కాబట్టి జీవ వైవిధ్యం పర్యావరణ వ్యవస్థలను మరింత తట్టుకునేలా చేస్తుంది.',
          },
          {
            en: 'Protecting habitats may limit some development, but restoring nature later is often far more expensive.',
            native:
              'నివాస ప్రాంతాలను రక్షించడం కొంత అభివృద్ధిని పరిమితం చేయవచ్చు, కానీ తర్వాత ప్రకృతిని పునరుద్ధరించడం తరచుగా చాలా ఎక్కువ ఖర్చవుతుంది.',
          },
          {
            en: 'Conservation succeeds when local communities share the economic benefits of healthy land and wildlife.',
            native:
              'ఆరోగ్యకరమైన భూమి మరియు వన్యప్రాణుల ఆర్థిక ప్రయోజనాలను స్థానిక సమాజాలు పంచుకున్నప్పుడు పరిరక్షణ విజయవంతమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'जैव विविधता',
        question: 'जैव विविधता क्यों महत्वपूर्ण है, और उसकी रक्षा के लिए समाज को कौन-से त्याग करने चाहिए?',
        examples: [
          {
            en: 'Biodiversity makes ecosystems more resilient because different species perform connected roles.',
            native:
              'जैव विविधता पारिस्थितिकी तंत्र को अधिक लचीला बनाती है क्योंकि अलग-अलग प्रजातियाँ आपस में जुड़ी भूमिकाएँ निभाती हैं।',
          },
          {
            en: 'Protecting habitats may limit some development, but restoring nature later is often far more expensive.',
            native:
              'आवासों की रक्षा कुछ विकास को सीमित कर सकती है, लेकिन बाद में प्रकृति को बहाल करना अक्सर बहुत अधिक महँगा पड़ता है।',
          },
          {
            en: 'Conservation succeeds when local communities share the economic benefits of healthy land and wildlife.',
            native:
              'संरक्षण तब सफल होता है जब स्थानीय समुदाय स्वस्थ भूमि और वन्यजीवों के आर्थिक लाभों में भागीदार हों।',
          },
        ],
      },
      es: {
        word: 'biodiversidad',
        question:
          '¿Por qué es importante la biodiversidad y qué sacrificios debería hacer la sociedad para protegerla?',
        examples: [
          {
            en: 'Biodiversity makes ecosystems more resilient because different species perform connected roles.',
            native:
              'La biodiversidad hace que los ecosistemas sean más resistentes porque las distintas especies desempeñan funciones conectadas.',
          },
          {
            en: 'Protecting habitats may limit some development, but restoring nature later is often far more expensive.',
            native:
              'Proteger los hábitats puede limitar parte del desarrollo, pero restaurar la naturaleza más tarde suele resultar mucho más caro.',
          },
          {
            en: 'Conservation succeeds when local communities share the economic benefits of healthy land and wildlife.',
            native:
              'La conservación tiene éxito cuando las comunidades locales comparten los beneficios económicos de unas tierras y una fauna sanas.',
          },
        ],
      },
      zh: {
        word: '生物多样性',
        question: '生物多样性为何重要，社会应该为保护它作出哪些牺牲？',
        examples: [
          {
            en: 'Biodiversity makes ecosystems more resilient because different species perform connected roles.',
            native: '生物多样性使生态系统更有韧性，因为不同物种承担着相互关联的作用。',
          },
          {
            en: 'Protecting habitats may limit some development, but restoring nature later is often far more expensive.',
            native: '保护栖息地可能限制某些开发，但日后恢复自然往往要昂贵得多。',
          },
          {
            en: 'Conservation succeeds when local communities share the economic benefits of healthy land and wildlife.',
            native: '当地社区能够分享健康土地和野生动物带来的经济利益时，保护工作才会成功。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'deforestation',
    questionText:
      'What drives deforestation, and which policies can protect forests without depriving local communities of their livelihoods?',
    translations: {
      te: {
        word: 'అడవుల నరికివేత',
        question:
          'అడవుల నరికివేతకు కారణాలు ఏమిటి, స్థానిక సమాజాల జీవనోపాధిని దెబ్బతీయకుండా అడవులను ఏ విధానాలు రక్షించగలవు?',
        examples: [
          {
            en: 'Forests are often cleared for agriculture, mining, and roads because their long-term value is missing from market prices.',
            native:
              'వ్యవసాయం, గనుల తవ్వకం మరియు రహదారుల కోసం అడవులను తరచుగా తొలగిస్తారు, ఎందుకంటే వాటి దీర్ఘకాలిక విలువ మార్కెట్ ధరల్లో కనిపించదు.',
          },
          {
            en: 'Protecting forests works better when local and Indigenous communities have secure rights to manage the land.',
            native:
              'స్థానిక మరియు ఆదివాసీ సమాజాలకు భూమిని నిర్వహించడానికి సురక్షితమైన హక్కులు ఉన్నప్పుడు అడవుల రక్షణ మెరుగ్గా పనిచేస్తుంది.',
          },
          {
            en: 'Companies should trace supply chains so that consumers are not unknowingly funding illegal clearance.',
            native:
              'వినియోగదారులు తెలియకుండానే అక్రమంగా అడవులను తొలగించడానికి నిధులు అందించకుండా కంపెనీలు సరఫరా గొలుసులను వాటి మూలం వరకు గుర్తించాలి.',
          },
        ],
      },
      hi: {
        word: 'वनों की कटाई',
        question:
          'वनों की कटाई किन कारणों से होती है, और कौन-सी नीतियाँ स्थानीय समुदायों की आजीविका छीने बिना जंगलों की रक्षा कर सकती हैं?',
        examples: [
          {
            en: 'Forests are often cleared for agriculture, mining, and roads because their long-term value is missing from market prices.',
            native:
              'जंगल अक्सर खेती, खनन और सड़कों के लिए साफ़ किए जाते हैं क्योंकि उनका दीर्घकालिक मूल्य बाज़ार की कीमतों में शामिल नहीं होता।',
          },
          {
            en: 'Protecting forests works better when local and Indigenous communities have secure rights to manage the land.',
            native:
              'जब स्थानीय और आदिवासी समुदायों को भूमि के प्रबंधन के सुरक्षित अधिकार मिलते हैं, तब वन संरक्षण बेहतर काम करता है।',
          },
          {
            en: 'Companies should trace supply chains so that consumers are not unknowingly funding illegal clearance.',
            native:
              'कंपनियों को आपूर्ति शृंखलाओं के स्रोत का पता लगाना चाहिए ताकि उपभोक्ता अनजाने में अवैध कटाई को धन न दें।',
          },
        ],
      },
      es: {
        word: 'deforestación',
        question:
          '¿Qué impulsa la deforestación y qué políticas pueden proteger los bosques sin privar a las comunidades locales de sus medios de vida?',
        examples: [
          {
            en: 'Forests are often cleared for agriculture, mining, and roads because their long-term value is missing from market prices.',
            native:
              'Los bosques se talan a menudo para la agricultura, la minería y las carreteras porque su valor a largo plazo no aparece en los precios de mercado.',
          },
          {
            en: 'Protecting forests works better when local and Indigenous communities have secure rights to manage the land.',
            native:
              'La protección de los bosques funciona mejor cuando las comunidades locales e indígenas tienen derechos seguros para gestionar la tierra.',
          },
          {
            en: 'Companies should trace supply chains so that consumers are not unknowingly funding illegal clearance.',
            native:
              'Las empresas deberían rastrear las cadenas de suministro para que los consumidores no financien sin saberlo la tala ilegal.',
          },
        ],
      },
      zh: {
        word: '森林砍伐',
        question: '哪些因素推动了森林砍伐，哪些政策能在不剥夺当地社区生计的情况下保护森林？',
        examples: [
          {
            en: 'Forests are often cleared for agriculture, mining, and roads because their long-term value is missing from market prices.',
            native: '森林经常因农业、采矿和修路而被清除，因为其长期价值没有体现在市场价格中。',
          },
          {
            en: 'Protecting forests works better when local and Indigenous communities have secure rights to manage the land.',
            native: '当地和原住民社区拥有稳定的土地管理权时，森林保护会更有效。',
          },
          {
            en: 'Companies should trace supply chains so that consumers are not unknowingly funding illegal clearance.',
            native: '企业应该追踪供应链，以免消费者在不知情的情况下资助非法砍伐。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'ocean conservation',
    questionText: 'Which actions are most urgently needed to protect oceans from pollution and overuse?',
    translations: {
      te: {
        word: 'సముద్ర పరిరక్షణ',
        question: 'కాలుష్యం మరియు మితిమీరిన వినియోగం నుంచి సముద్రాలను రక్షించడానికి అత్యవసరంగా ఏ చర్యలు అవసరం?',
        examples: [
          {
            en: 'Reducing single-use plastic helps, but lost fishing gear and industrial waste also require strict controls.',
            native:
              'ఒక్కసారి వాడే ప్లాస్టిక్‌ను తగ్గించడం సహాయపడుతుంది, కానీ పోయిన చేపల వలలు మరియు పారిశ్రామిక వ్యర్థాలపై కూడా కఠిన నియంత్రణలు అవసరం.',
          },
          {
            en: 'Marine reserves allow damaged ecosystems to recover when boundaries are enforced and nearby fishers are consulted.',
            native:
              'సరిహద్దులను అమలు చేసి, సమీపంలోని మత్స్యకారులను సంప్రదించినప్పుడు సముద్ర రక్షిత ప్రాంతాలు దెబ్బతిన్న పర్యావరణ వ్యవస్థలు కోలుకోవడానికి అవకాశం ఇస్తాయి.',
          },
          {
            en: "Fishing limits must follow scientific evidence so that today's income does not destroy tomorrow's catch.",
            native: 'నేటి ఆదాయం రేపటి చేపల వేటను నాశనం చేయకుండా చేపల వేట పరిమితులు శాస్త్రీయ ఆధారాలను అనుసరించాలి.',
          },
        ],
      },
      hi: {
        word: 'महासागर संरक्षण',
        question: 'महासागरों को प्रदूषण और अत्यधिक उपयोग से बचाने के लिए किन कदमों की सबसे तत्काल आवश्यकता है?',
        examples: [
          {
            en: 'Reducing single-use plastic helps, but lost fishing gear and industrial waste also require strict controls.',
            native:
              'एक बार इस्तेमाल होने वाले प्लास्टिक को कम करना मददगार है, लेकिन खोए हुए मछली पकड़ने के उपकरण और औद्योगिक कचरे पर भी कड़ा नियंत्रण चाहिए।',
          },
          {
            en: 'Marine reserves allow damaged ecosystems to recover when boundaries are enforced and nearby fishers are consulted.',
            native:
              'जब सीमाएँ लागू की जाती हैं और आसपास के मछुआरों से सलाह ली जाती है, तब समुद्री संरक्षित क्षेत्र क्षतिग्रस्त पारिस्थितिकी तंत्र को ठीक होने देते हैं।',
          },
          {
            en: "Fishing limits must follow scientific evidence so that today's income does not destroy tomorrow's catch.",
            native:
              'मछली पकड़ने की सीमाएँ वैज्ञानिक प्रमाण पर आधारित होनी चाहिए ताकि आज की कमाई के लिए भविष्य की मछलियों का भंडार नष्ट न हो।',
          },
        ],
      },
      es: {
        word: 'conservación de los océanos',
        question:
          '¿Qué medidas se necesitan con mayor urgencia para proteger los océanos de la contaminación y la sobreexplotación?',
        examples: [
          {
            en: 'Reducing single-use plastic helps, but lost fishing gear and industrial waste also require strict controls.',
            native:
              'Reducir el plástico de un solo uso ayuda, pero los aparejos de pesca perdidos y los residuos industriales también requieren controles estrictos.',
          },
          {
            en: 'Marine reserves allow damaged ecosystems to recover when boundaries are enforced and nearby fishers are consulted.',
            native:
              'Las reservas marinas permiten que los ecosistemas dañados se recuperen cuando se respetan sus límites y se consulta a los pescadores cercanos.',
          },
          {
            en: "Fishing limits must follow scientific evidence so that today's income does not destroy tomorrow's catch.",
            native:
              'Los límites de pesca deben seguir las pruebas científicas para que los ingresos de hoy no destruyan las capturas de mañana.',
          },
        ],
      },
      zh: {
        word: '海洋保护',
        question: '要保护海洋免受污染和过度利用，目前最迫切需要采取哪些行动？',
        examples: [
          {
            en: 'Reducing single-use plastic helps, but lost fishing gear and industrial waste also require strict controls.',
            native: '减少一次性塑料会有所帮助，但遗失的渔具和工业废物也需要严格管控。',
          },
          {
            en: 'Marine reserves allow damaged ecosystems to recover when boundaries are enforced and nearby fishers are consulted.',
            native: '在严格执行保护区边界并征求附近渔民意见时，海洋保护区能让受损生态系统恢复。',
          },
          {
            en: "Fishing limits must follow scientific evidence so that today's income does not destroy tomorrow's catch.",
            native: '捕捞限额必须遵循科学证据，不能让今天的收入毁掉明天的渔获。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'waste management',
    questionText: 'How should cities reduce waste rather than merely moving it to landfills or exporting it elsewhere?',
    translations: {
      te: {
        word: 'వ్యర్థాల నిర్వహణ',
        question:
          'వ్యర్థాలను కేవలం పూడ్చివేత ప్రాంతాలకు తరలించడం లేదా వేరే చోటుకు ఎగుమతి చేయడం కాకుండా నగరాలు వాటిని ఎలా తగ్గించాలి?',
        examples: [
          {
            en: 'Manufacturers should design products that last longer and can be repaired with affordable parts.',
            native:
              'తయారీదారులు ఎక్కువకాలం మన్నే మరియు అందుబాటు ధరలో విడిభాగాలతో మరమ్మతు చేయగల ఉత్పత్తులను రూపొందించాలి.',
          },
          {
            en: 'Separate collection makes recycling more effective, but residents need simple rules and reliable services.',
            native:
              'వ్యర్థాలను వేర్వేరుగా సేకరించడం రీసైక్లింగ్‌ను మరింత ప్రభావవంతం చేస్తుంది, కానీ నివాసులకు సరళమైన నియమాలు మరియు విశ్వసనీయ సేవలు అవసరం.',
          },
          {
            en: 'Charging for unnecessary packaging would encourage businesses to prevent waste before it is created.',
            native:
              'అనవసరమైన ప్యాకేజింగ్‌పై రుసుము విధించడం వ్యర్థం ఏర్పడకముందే దాన్ని నివారించడానికి వ్యాపారాలను ప్రోత్సహిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'कचरा प्रबंधन',
        question: 'शहरों को कचरा केवल भराव स्थलों पर भेजने या कहीं और निर्यात करने के बजाय उसे कैसे कम करना चाहिए?',
        examples: [
          {
            en: 'Manufacturers should design products that last longer and can be repaired with affordable parts.',
            native:
              'निर्माताओं को ऐसे उत्पाद बनाने चाहिए जो अधिक समय चलें और जिनकी मरम्मत किफ़ायती पुर्ज़ों से हो सके।',
          },
          {
            en: 'Separate collection makes recycling more effective, but residents need simple rules and reliable services.',
            native:
              'अलग-अलग संग्रह से पुनर्चक्रण अधिक प्रभावी होता है, लेकिन निवासियों को सरल नियम और भरोसेमंद सेवाएँ चाहिए।',
          },
          {
            en: 'Charging for unnecessary packaging would encourage businesses to prevent waste before it is created.',
            native:
              'अनावश्यक पैकेजिंग पर शुल्क लगाने से व्यवसाय कचरा पैदा होने से पहले ही उसे रोकने के लिए प्रोत्साहित होंगे।',
          },
        ],
      },
      es: {
        word: 'gestión de residuos',
        question:
          '¿Cómo deberían las ciudades reducir los residuos en vez de limitarse a llevarlos a vertederos o exportarlos a otros lugares?',
        examples: [
          {
            en: 'Manufacturers should design products that last longer and can be repaired with affordable parts.',
            native:
              'Los fabricantes deberían diseñar productos que duren más y puedan repararse con piezas asequibles.',
          },
          {
            en: 'Separate collection makes recycling more effective, but residents need simple rules and reliable services.',
            native:
              'La recogida separada hace más eficaz el reciclaje, pero los residentes necesitan normas sencillas y servicios fiables.',
          },
          {
            en: 'Charging for unnecessary packaging would encourage businesses to prevent waste before it is created.',
            native:
              'Cobrar por los envases innecesarios animaría a las empresas a evitar los residuos antes de que se generen.',
          },
        ],
      },
      zh: {
        word: '废物管理',
        question: '城市应如何真正减少废物，而不是仅仅将其运往填埋场或出口到其他地方？',
        examples: [
          {
            en: 'Manufacturers should design products that last longer and can be repaired with affordable parts.',
            native: '制造商应该设计使用寿命更长、能用价格合理的零件维修的产品。',
          },
          {
            en: 'Separate collection makes recycling more effective, but residents need simple rules and reliable services.',
            native: '分类收集能提高回收效率，但居民需要简单的规则和可靠的服务。',
          },
          {
            en: 'Charging for unnecessary packaging would encourage businesses to prevent waste before it is created.',
            native: '对不必要的包装收费，会促使企业从源头防止废物产生。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'corporate responsibility',
    questionText:
      'Should companies be responsible only for following the law and making a profit, or also for their wider impact?',
    translations: {
      te: {
        word: 'కార్పొరేట్ బాధ్యత',
        question:
          'కంపెనీలు కేవలం చట్టాన్ని పాటించడం మరియు లాభం పొందడానికే బాధ్యత వహించాలా, లేక తమ విస్తృత ప్రభావానికి కూడా బాధ్యత వహించాలా?',
        examples: [
          {
            en: 'Following the law is a minimum standard, especially where regulations are weak or poorly enforced.',
            native: 'చట్టాలను పాటించడం కనీస ప్రమాణం మాత్రమే, ముఖ్యంగా నియంత్రణలు బలహీనంగా లేదా సరిగా అమలు కాని చోట.',
          },
          {
            en: 'Companies should publish measurable social and environmental targets and allow independent checks of their claims.',
            native:
              'కంపెనీలు కొలవగల సామాజిక మరియు పర్యావరణ లక్ష్యాలను ప్రచురించి, తమ వాదనలను స్వతంత్రంగా తనిఖీ చేయడానికి అనుమతించాలి.',
          },
          {
            en: 'Responsible decisions may reduce short-term profit, but they can protect workers, communities, and long-term trust.',
            native:
              'బాధ్యతాయుత నిర్ణయాలు స్వల్పకాలిక లాభాన్ని తగ్గించవచ్చు, కానీ అవి కార్మికులు, సమాజాలు మరియు దీర్ఘకాలిక నమ్మకాన్ని రక్షించగలవు.',
          },
        ],
      },
      hi: {
        word: 'कॉरपोरेट ज़िम्मेदारी',
        question:
          'क्या कंपनियों की ज़िम्मेदारी केवल कानून का पालन करना और लाभ कमाना है, या अपने व्यापक प्रभाव की भी है?',
        examples: [
          {
            en: 'Following the law is a minimum standard, especially where regulations are weak or poorly enforced.',
            native: 'कानून का पालन न्यूनतम मानक है, खासकर वहाँ जहाँ नियम कमज़ोर हैं या ठीक से लागू नहीं होते।',
          },
          {
            en: 'Companies should publish measurable social and environmental targets and allow independent checks of their claims.',
            native:
              'कंपनियों को मापने योग्य सामाजिक और पर्यावरणीय लक्ष्य प्रकाशित करने चाहिए और अपने दावों की स्वतंत्र जाँच की अनुमति देनी चाहिए।',
          },
          {
            en: 'Responsible decisions may reduce short-term profit, but they can protect workers, communities, and long-term trust.',
            native:
              'ज़िम्मेदार निर्णय अल्पकालिक लाभ घटा सकते हैं, लेकिन वे कर्मचारियों, समुदायों और दीर्घकालिक भरोसे की रक्षा कर सकते हैं।',
          },
        ],
      },
      es: {
        word: 'responsabilidad empresarial',
        question:
          '¿Deberían las empresas limitarse a cumplir la ley y obtener beneficios, o ser también responsables de su impacto más amplio?',
        examples: [
          {
            en: 'Following the law is a minimum standard, especially where regulations are weak or poorly enforced.',
            native: 'Cumplir la ley es un requisito mínimo, especialmente donde la normativa es débil o se aplica mal.',
          },
          {
            en: 'Companies should publish measurable social and environmental targets and allow independent checks of their claims.',
            native:
              'Las empresas deberían publicar objetivos sociales y ambientales medibles y permitir la verificación independiente de sus afirmaciones.',
          },
          {
            en: 'Responsible decisions may reduce short-term profit, but they can protect workers, communities, and long-term trust.',
            native:
              'Las decisiones responsables pueden reducir los beneficios a corto plazo, pero protegen a los trabajadores, las comunidades y la confianza a largo plazo.',
          },
        ],
      },
      zh: {
        word: '企业责任',
        question: '企业只需负责守法和盈利，还是也应对自身更广泛的影响负责？',
        examples: [
          {
            en: 'Following the law is a minimum standard, especially where regulations are weak or poorly enforced.',
            native: '遵守法律只是最低标准，尤其是在法规薄弱或执行不力的地方。',
          },
          {
            en: 'Companies should publish measurable social and environmental targets and allow independent checks of their claims.',
            native: '企业应该公布可衡量的社会和环境目标，并允许独立机构核查其声明。',
          },
          {
            en: 'Responsible decisions may reduce short-term profit, but they can protect workers, communities, and long-term trust.',
            native: '负责任的决定可能减少短期利润，但能保护劳动者、社区和长期信任。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'ethical consumption',
    questionText:
      'Can shopping choices meaningfully improve labour and environmental conditions, or must change mainly come from governments and businesses?',
    translations: {
      te: {
        word: 'నైతిక వినియోగం',
        question:
          'కొనుగోలు ఎంపికలు కార్మిక మరియు పర్యావరణ పరిస్థితులను గణనీయంగా మెరుగుపరచగలవా, లేక మార్పు ప్రధానంగా ప్రభుత్వాలు మరియు వ్యాపారాల నుంచే రావాలా?',
        examples: [
          {
            en: 'Ethical products are difficult to choose when labels are confusing and responsible options cost much more.',
            native:
              'లేబుళ్లు గందరగోళంగా ఉండి, బాధ్యతాయుతమైన ఎంపికలకు చాలా ఎక్కువ ఖర్చయ్యేటప్పుడు నైతిక ఉత్పత్తులను ఎంచుకోవడం కష్టం.',
          },
          {
            en: 'Consumers can signal demand, but governments must prevent harmful products from competing through unfairly low prices.',
            native:
              'వినియోగదారులు డిమాండ్‌ను సూచించగలరు, కానీ అన్యాయంగా తక్కువ ధరల ద్వారా హానికరమైన ఉత్పత్తులు పోటీ పడకుండా ప్రభుత్వాలు నిరోధించాలి.',
          },
          {
            en: 'Buying fewer durable goods may have a greater effect than constantly replacing items with greener versions.',
            native:
              'వస్తువులను పర్యావరణ అనుకూలమైన కొత్త రూపాలతో నిరంతరం మార్చడం కంటే తక్కువ సంఖ్యలో మన్నికైన వస్తువులను కొనడం ఎక్కువ ప్రభావం చూపవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'नैतिक उपभोग',
        question:
          'क्या खरीदारी के विकल्प श्रम और पर्यावरण की स्थितियों में सार्थक सुधार ला सकते हैं, या बदलाव मुख्य रूप से सरकारों और व्यवसायों से आना चाहिए?',
        examples: [
          {
            en: 'Ethical products are difficult to choose when labels are confusing and responsible options cost much more.',
            native: 'जब लेबल उलझाने वाले हों और ज़िम्मेदार विकल्प बहुत महँगे हों, तब नैतिक उत्पाद चुनना कठिन होता है।',
          },
          {
            en: 'Consumers can signal demand, but governments must prevent harmful products from competing through unfairly low prices.',
            native:
              'उपभोक्ता माँग का संकेत दे सकते हैं, लेकिन सरकारों को हानिकारक उत्पादों को अनुचित रूप से कम कीमतों के सहारे प्रतिस्पर्धा करने से रोकना चाहिए।',
          },
          {
            en: 'Buying fewer durable goods may have a greater effect than constantly replacing items with greener versions.',
            native:
              'सामान को लगातार अधिक पर्यावरण-अनुकूल संस्करणों से बदलने की तुलना में कम लेकिन टिकाऊ वस्तुएँ खरीदना अधिक प्रभावी हो सकता है।',
          },
        ],
      },
      es: {
        word: 'consumo ético',
        question:
          '¿Pueden las decisiones de compra mejorar de forma significativa las condiciones laborales y ambientales, o debe venir el cambio principalmente de los gobiernos y las empresas?',
        examples: [
          {
            en: 'Ethical products are difficult to choose when labels are confusing and responsible options cost much more.',
            native:
              'Es difícil elegir productos éticos cuando las etiquetas son confusas y las opciones responsables cuestan mucho más.',
          },
          {
            en: 'Consumers can signal demand, but governments must prevent harmful products from competing through unfairly low prices.',
            native:
              'Los consumidores pueden señalar la demanda, pero los gobiernos deben impedir que los productos dañinos compitan mediante precios injustamente bajos.',
          },
          {
            en: 'Buying fewer durable goods may have a greater effect than constantly replacing items with greener versions.',
            native:
              'Comprar menos productos duraderos puede tener más efecto que sustituir constantemente los artículos por versiones más ecológicas.',
          },
        ],
      },
      zh: {
        word: '道德消费',
        question: '购物选择能否切实改善劳动和环境条件，还是改变主要必须来自政府和企业？',
        examples: [
          {
            en: 'Ethical products are difficult to choose when labels are confusing and responsible options cost much more.',
            native: '当标签令人困惑、负责任的选择又贵得多时，人们很难挑选符合道德标准的产品。',
          },
          {
            en: 'Consumers can signal demand, but governments must prevent harmful products from competing through unfairly low prices.',
            native: '消费者可以表达需求，但政府必须防止有害产品凭借不公平的低价参与竞争。',
          },
          {
            en: 'Buying fewer durable goods may have a greater effect than constantly replacing items with greener versions.',
            native: '少买一些耐用商品，可能比不断用更环保的版本替换现有物品更有效。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'gig economy',
    questionText:
      'Does the gig economy offer useful flexibility, or does it transfer too much risk from companies to workers?',
    translations: {
      te: {
        word: 'గిగ్ ఆర్థిక వ్యవస్థ',
        question:
          'గిగ్ ఆర్థిక వ్యవస్థ ఉపయోగకరమైన అనువుదనాన్ని అందిస్తుందా, లేక కంపెనీల నుంచి కార్మికులకు మరీ ఎక్కువ ప్రమాదాన్ని బదిలీ చేస్తుందా?',
        examples: [
          {
            en: 'Flexible hours can help some workers, but unpredictable income makes rent and family expenses difficult to plan.',
            native:
              'అనువైన పని గంటలు కొంతమంది కార్మికులకు సహాయపడవచ్చు, కానీ ఊహించలేని ఆదాయం వల్ల అద్దె మరియు కుటుంబ ఖర్చులను ప్రణాళిక చేయడం కష్టమవుతుంది.',
          },
          {
            en: 'Platforms control prices and access to customers, so describing every worker as fully independent can be misleading.',
            native:
              'వేదికలు ధరలను మరియు కస్టమర్లను చేరుకునే అవకాశాన్ని నియంత్రిస్తాయి, కాబట్టి ప్రతి కార్మికుడిని పూర్తిగా స్వతంత్రుడిగా వర్ణించడం తప్పుదోవ పట్టించవచ్చు.',
          },
          {
            en: 'Basic protections such as insurance, transparent ratings, and a fair appeal process need not eliminate flexibility.',
            native:
              'బీమా, పారదర్శక రేటింగ్‌లు మరియు న్యాయమైన అప్పీల్ ప్రక్రియ వంటి ప్రాథమిక రక్షణలు అనువుదనాన్ని తొలగించాల్సిన అవసరం లేదు.',
          },
        ],
      },
      hi: {
        word: 'गिग अर्थव्यवस्था',
        question:
          'क्या गिग अर्थव्यवस्था उपयोगी लचीलापन देती है, या कंपनियों से बहुत अधिक जोखिम श्रमिकों पर डाल देती है?',
        examples: [
          {
            en: 'Flexible hours can help some workers, but unpredictable income makes rent and family expenses difficult to plan.',
            native:
              'लचीले काम के घंटे कुछ श्रमिकों की मदद कर सकते हैं, लेकिन अनिश्चित आय से किराए और पारिवारिक खर्चों की योजना बनाना कठिन होता है।',
          },
          {
            en: 'Platforms control prices and access to customers, so describing every worker as fully independent can be misleading.',
            native:
              'प्लेटफ़ॉर्म कीमतों और ग्राहकों तक पहुँच को नियंत्रित करते हैं, इसलिए हर श्रमिक को पूरी तरह स्वतंत्र बताना भ्रामक हो सकता है।',
          },
          {
            en: 'Basic protections such as insurance, transparent ratings, and a fair appeal process need not eliminate flexibility.',
            native:
              'बीमा, पारदर्शी रेटिंग और निष्पक्ष अपील प्रक्रिया जैसी बुनियादी सुरक्षाओं के लिए लचीलापन समाप्त करना आवश्यक नहीं है।',
          },
        ],
      },
      es: {
        word: 'economía de plataformas',
        question:
          '¿Ofrece la economía de plataformas una flexibilidad útil o transfiere demasiado riesgo de las empresas a los trabajadores?',
        examples: [
          {
            en: 'Flexible hours can help some workers, but unpredictable income makes rent and family expenses difficult to plan.',
            native:
              'La flexibilidad horaria puede ayudar a algunos trabajadores, pero unos ingresos imprevisibles dificultan planificar el alquiler y los gastos familiares.',
          },
          {
            en: 'Platforms control prices and access to customers, so describing every worker as fully independent can be misleading.',
            native:
              'Las plataformas controlan los precios y el acceso a los clientes, por lo que describir a cada trabajador como totalmente independiente puede ser engañoso.',
          },
          {
            en: 'Basic protections such as insurance, transparent ratings, and a fair appeal process need not eliminate flexibility.',
            native:
              'Las protecciones básicas, como seguros, calificaciones transparentes y un proceso de apelación justo, no tienen por qué eliminar la flexibilidad.',
          },
        ],
      },
      zh: {
        word: '零工经济',
        question: '零工经济是提供了有用的灵活性，还是把过多风险从企业转嫁给了劳动者？',
        examples: [
          {
            en: 'Flexible hours can help some workers, but unpredictable income makes rent and family expenses difficult to plan.',
            native: '灵活的工时可以帮助一些劳动者，但不稳定的收入使房租和家庭开支难以规划。',
          },
          {
            en: 'Platforms control prices and access to customers, so describing every worker as fully independent can be misleading.',
            native: '平台控制价格和接触客户的机会，因此把每位劳动者都称为完全独立可能会误导人。',
          },
          {
            en: 'Basic protections such as insurance, transparent ratings, and a fair appeal process need not eliminate flexibility.',
            native: '保险、透明评分和公平申诉程序等基本保障并不一定会牺牲灵活性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'job satisfaction',
    questionText:
      'What contributes most to job satisfaction, and how much responsibility belongs to employers and employees?',
    translations: {
      te: {
        word: 'ఉద్యోగ సంతృప్తి',
        question:
          'ఉద్యోగ సంతృప్తికి ఎక్కువగా దోహదపడేది ఏమిటి, దానికి యజమానులు మరియు ఉద్యోగులు ఎంతవరకు బాధ్యత వహించాలి?',
        examples: [
          {
            en: 'Fair pay matters, but people also value respect, useful work, and some control over how tasks are completed.',
            native:
              'న్యాయమైన వేతనం ముఖ్యం, కానీ ప్రజలు గౌరవం, ఉపయోగకరమైన పని మరియు పనులను ఎలా పూర్తి చేయాలనే విషయంలో కొంత నియంత్రణకు కూడా విలువ ఇస్తారు.',
          },
          {
            en: 'Managers improve satisfaction when expectations are clear and good performance receives specific recognition.',
            native:
              'అంచనాలు స్పష్టంగా ఉండి, మంచి పనితీరుకు నిర్దిష్టమైన గుర్తింపు లభించినప్పుడు మేనేజర్లు ఉద్యోగ సంతృప్తిని మెరుగుపరుస్తారు.',
          },
          {
            en: 'Employees can seek growth and better communication, although they cannot repair a consistently harmful culture alone.',
            native:
              'ఉద్యోగులు ఎదుగుదల మరియు మెరుగైన సమాచార మార్పిడిని కోరవచ్చు, అయితే నిరంతరం హానికరంగా ఉండే సంస్కృతిని వారు ఒంటరిగా సరిచేయలేరు.',
          },
        ],
      },
      hi: {
        word: 'नौकरी से संतुष्टि',
        question:
          'नौकरी से संतुष्टि में सबसे अधिक योगदान किसका होता है, और नियोक्ताओं तथा कर्मचारियों की कितनी ज़िम्मेदारी है?',
        examples: [
          {
            en: 'Fair pay matters, but people also value respect, useful work, and some control over how tasks are completed.',
            native:
              'उचित वेतन महत्वपूर्ण है, लेकिन लोग सम्मान, उपयोगी काम और कार्य पूरे करने के तरीके पर कुछ नियंत्रण को भी महत्व देते हैं।',
          },
          {
            en: 'Managers improve satisfaction when expectations are clear and good performance receives specific recognition.',
            native: 'जब अपेक्षाएँ स्पष्ट हों और अच्छे प्रदर्शन को विशेष पहचान मिले, तब प्रबंधक संतुष्टि बढ़ाते हैं।',
          },
          {
            en: 'Employees can seek growth and better communication, although they cannot repair a consistently harmful culture alone.',
            native:
              'कर्मचारी विकास और बेहतर संवाद की कोशिश कर सकते हैं, हालाँकि वे लगातार हानिकारक संस्कृति को अकेले नहीं सुधार सकते।',
          },
        ],
      },
      es: {
        word: 'satisfacción laboral',
        question:
          '¿Qué contribuye más a la satisfacción laboral y cuánta responsabilidad corresponde a empleadores y empleados?',
        examples: [
          {
            en: 'Fair pay matters, but people also value respect, useful work, and some control over how tasks are completed.',
            native:
              'Un salario justo importa, pero la gente también valora el respeto, el trabajo útil y cierto control sobre cómo se realizan las tareas.',
          },
          {
            en: 'Managers improve satisfaction when expectations are clear and good performance receives specific recognition.',
            native:
              'Los responsables mejoran la satisfacción cuando las expectativas son claras y el buen rendimiento recibe un reconocimiento específico.',
          },
          {
            en: 'Employees can seek growth and better communication, although they cannot repair a consistently harmful culture alone.',
            native:
              'Los empleados pueden buscar crecimiento y una mejor comunicación, aunque no pueden reparar por sí solos una cultura constantemente dañina.',
          },
        ],
      },
      zh: {
        word: '工作满意度',
        question: '哪些因素对工作满意度影响最大，雇主和员工各自应承担多少责任？',
        examples: [
          {
            en: 'Fair pay matters, but people also value respect, useful work, and some control over how tasks are completed.',
            native: '公平的薪酬很重要，但人们也重视尊重、有意义的工作以及对任务完成方式的一定自主权。',
          },
          {
            en: 'Managers improve satisfaction when expectations are clear and good performance receives specific recognition.',
            native: '当要求明确且良好表现得到具体认可时，管理者能够提高员工的满意度。',
          },
          {
            en: 'Employees can seek growth and better communication, although they cannot repair a consistently harmful culture alone.',
            native: '员工可以寻求成长和更好的沟通，但无法独自修复长期有害的企业文化。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'career change',
    questionText: 'When is a career change a wise choice, and what preparation can reduce the risk?',
    translations: {
      te: {
        word: 'వృత్తి మార్పు',
        question: 'వృత్తిని మార్చడం ఎప్పుడు తెలివైన ఎంపిక అవుతుంది, ఏ సిద్ధత ప్రమాదాన్ని తగ్గించగలదు?',
        examples: [
          {
            en: 'Changing careers may be sensible when dissatisfaction reflects the field itself rather than one difficult workplace.',
            native: 'అసంతృప్తి ఒక కష్టమైన కార్యాలయం వల్ల కాకుండా ఆ రంగం వల్లనే వస్తే వృత్తిని మార్చడం సమంజసం కావచ్చు.',
          },
          {
            en: 'Testing a new direction through courses, volunteering, or part-time work can reveal whether expectations are realistic.',
            native:
              'కోర్సులు, స్వచ్ఛంద సేవ లేదా పార్ట్‌టైమ్ పని ద్వారా కొత్త దిశను పరీక్షించడం అంచనాలు వాస్తవికంగా ఉన్నాయో లేదో వెల్లడించగలదు.',
          },
          {
            en: 'A financial reserve and transferable skills make the transition safer without guaranteeing immediate success.',
            native:
              'ఆర్థిక నిల్వ మరియు బదిలీ చేయగల నైపుణ్యాలు తక్షణ విజయానికి హామీ ఇవ్వకపోయినా మార్పును సురక్షితంగా చేస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'करियर में बदलाव',
        question: 'करियर बदलना कब समझदारी भरा विकल्प होता है, और कौन-सी तैयारी जोखिम घटा सकती है?',
        examples: [
          {
            en: 'Changing careers may be sensible when dissatisfaction reflects the field itself rather than one difficult workplace.',
            native:
              'जब असंतोष किसी एक कठिन कार्यस्थल के बजाय पूरे क्षेत्र से जुड़ा हो, तब करियर बदलना समझदारी हो सकती है।',
          },
          {
            en: 'Testing a new direction through courses, volunteering, or part-time work can reveal whether expectations are realistic.',
            native:
              'पाठ्यक्रम, स्वयंसेवा या अंशकालिक काम के ज़रिए नई दिशा आज़माने से पता चल सकता है कि अपेक्षाएँ यथार्थवादी हैं या नहीं।',
          },
          {
            en: 'A financial reserve and transferable skills make the transition safer without guaranteeing immediate success.',
            native:
              'आर्थिक बचत और दूसरे क्षेत्रों में काम आने वाले कौशल तत्काल सफलता की गारंटी दिए बिना बदलाव को अधिक सुरक्षित बनाते हैं।',
          },
        ],
      },
      es: {
        word: 'cambio de carrera',
        question: '¿Cuándo es sensato cambiar de carrera y qué preparación puede reducir el riesgo?',
        examples: [
          {
            en: 'Changing careers may be sensible when dissatisfaction reflects the field itself rather than one difficult workplace.',
            native:
              'Cambiar de carrera puede ser sensato cuando la insatisfacción se debe al propio sector y no a un único lugar de trabajo difícil.',
          },
          {
            en: 'Testing a new direction through courses, volunteering, or part-time work can reveal whether expectations are realistic.',
            native:
              'Probar una nueva dirección mediante cursos, voluntariado o trabajo a tiempo parcial puede revelar si las expectativas son realistas.',
          },
          {
            en: 'A financial reserve and transferable skills make the transition safer without guaranteeing immediate success.',
            native:
              'Un colchón financiero y las habilidades transferibles hacen la transición más segura sin garantizar un éxito inmediato.',
          },
        ],
      },
      zh: {
        word: '职业转型',
        question: '什么时候转行是明智的选择，哪些准备可以降低风险？',
        examples: [
          {
            en: 'Changing careers may be sensible when dissatisfaction reflects the field itself rather than one difficult workplace.',
            native: '如果不满来自行业本身，而不只是某个糟糕的工作场所，那么转行可能是合理的。',
          },
          {
            en: 'Testing a new direction through courses, volunteering, or part-time work can reveal whether expectations are realistic.',
            native: '通过课程、志愿服务或兼职工作尝试新方向，可以判断自己的期待是否现实。',
          },
          {
            en: 'A financial reserve and transferable skills make the transition safer without guaranteeing immediate success.',
            native: '资金储备和可迁移技能能使转型更安全，但不能保证立刻成功。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'B2',
    promptWord: 'productivity',
    questionText: 'How should productivity be measured without encouraging overwork or sacrificing quality?',
    translations: {
      te: {
        word: 'ఉత్పాదకత',
        question: 'అధిక పనిని ప్రోత్సహించకుండా లేదా నాణ్యతను త్యాగం చేయకుండా ఉత్పాదకతను ఎలా కొలవాలి?',
        examples: [
          {
            en: 'Counting hours rewards visible activity, whereas useful measures focus on completed work and its quality.',
            native:
              'పని గంటలను లెక్కించడం బయటకు కనిపించే కార్యకలాపానికి ప్రతిఫలం ఇస్తుంది, అయితే ఉపయోగకరమైన కొలమానాలు పూర్తయిన పని మరియు దాని నాణ్యతపై దృష్టి పెడతాయి.',
          },
          {
            en: 'Teams often become more productive after removing unnecessary meetings rather than asking everyone to work faster.',
            native:
              'ప్రతి ఒక్కరూ వేగంగా పనిచేయాలని అడగడం కంటే అనవసర సమావేశాలను తొలగించిన తర్వాత బృందాలు తరచుగా మరింత ఉత్పాదకంగా మారతాయి.',
          },
          {
            en: 'Sustainable productivity includes rest, learning, and maintenance because exhausted people create costly mistakes.',
            native:
              'అలసిపోయిన వ్యక్తులు ఖరీదైన తప్పులు చేస్తారు కాబట్టి సుస్థిర ఉత్పాదకతలో విశ్రాంతి, అభ్యాసం మరియు నిర్వహణ కూడా ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'उत्पादकता',
        question: 'अत्यधिक काम को बढ़ावा दिए या गुणवत्ता से समझौता किए बिना उत्पादकता को कैसे मापा जाना चाहिए?',
        examples: [
          {
            en: 'Counting hours rewards visible activity, whereas useful measures focus on completed work and its quality.',
            native:
              'घंटे गिनना दिखाई देने वाली गतिविधि को पुरस्कृत करता है, जबकि उपयोगी माप पूरे हुए काम और उसकी गुणवत्ता पर ध्यान देते हैं।',
          },
          {
            en: 'Teams often become more productive after removing unnecessary meetings rather than asking everyone to work faster.',
            native:
              'सबको तेज़ काम करने के लिए कहने के बजाय अनावश्यक बैठकें हटाने पर टीमें अक्सर अधिक उत्पादक बनती हैं।',
          },
          {
            en: 'Sustainable productivity includes rest, learning, and maintenance because exhausted people create costly mistakes.',
            native: 'टिकाऊ उत्पादकता में आराम, सीखना और रखरखाव शामिल हैं क्योंकि थके हुए लोग महँगी गलतियाँ करते हैं।',
          },
        ],
      },
      es: {
        word: 'productividad',
        question: '¿Cómo debería medirse la productividad sin fomentar el exceso de trabajo ni sacrificar la calidad?',
        examples: [
          {
            en: 'Counting hours rewards visible activity, whereas useful measures focus on completed work and its quality.',
            native:
              'Contar horas premia la actividad visible, mientras que las medidas útiles se centran en el trabajo terminado y su calidad.',
          },
          {
            en: 'Teams often become more productive after removing unnecessary meetings rather than asking everyone to work faster.',
            native:
              'Los equipos suelen volverse más productivos al eliminar reuniones innecesarias en vez de pedir a todos que trabajen más rápido.',
          },
          {
            en: 'Sustainable productivity includes rest, learning, and maintenance because exhausted people create costly mistakes.',
            native:
              'La productividad sostenible incluye descanso, aprendizaje y mantenimiento porque las personas agotadas cometen errores costosos.',
          },
        ],
      },
      zh: {
        word: '生产效率',
        question: '应如何衡量生产效率，才能既不鼓励过度工作，也不牺牲质量？',
        examples: [
          {
            en: 'Counting hours rewards visible activity, whereas useful measures focus on completed work and its quality.',
            native: '计算工时会奖励表面上的忙碌，而有用的衡量方式关注完成的工作及其质量。',
          },
          {
            en: 'Teams often become more productive after removing unnecessary meetings rather than asking everyone to work faster.',
            native: '与其要求所有人工作得更快，团队在取消不必要的会议后往往会更高效。',
          },
          {
            en: 'Sustainable productivity includes rest, learning, and maintenance because exhausted people create costly mistakes.',
            native: '可持续的生产效率包括休息、学习和维护，因为疲惫的人会犯下代价高昂的错误。',
          },
        ],
      },
    },
  },
];
