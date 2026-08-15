import type { QuestionSeed } from './types';

// C1 speaking questions: prompt word, question, and te/hi/es/zh
// translations with 3 example answers each (same English sentence across
// languages, `native` is its translation).
export const questions: QuestionSeed[] = [
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
            en: 'Globalization can widen cultural exchange, yet the commercial platforms that carry it often privilege languages and traditions with the greatest purchasing power.',
            native:
              'ప్రపంచీకరణ సాంస్కృతిక మార్పిడిని విస్తరించగలదు, అయినప్పటికీ దాన్ని మోసుకెళ్లే వాణిజ్య వేదికలు తరచూ అత్యధిక కొనుగోలు శక్తి ఉన్న భాషలు మరియు సంప్రదాయాలకు ప్రాధాన్యం ఇస్తాయి.',
          },
          {
            en: 'Local communities are not merely passive victims: they adapt imported influences, producing hybrid forms that complicate any simple opposition between authentic and foreign culture.',
            native:
              'స్థానిక సమాజాలు కేవలం నిష్క్రియాత్మక బాధితులు కావు: అవి దిగుమతి చేసుకున్న ప్రభావాలను తమకు అనుగుణంగా మార్చుకొని, ప్రామాణిక సంస్కృతి మరియు విదేశీ సంస్కృతి మధ్య సరళమైన వ్యతిరేకతను సంక్లిష్టం చేసే మిశ్రమ రూపాలను సృష్టిస్తాయి.',
          },
          {
            en: 'Policies that fund minority-language education and give creators control over their heritage can preserve cultural diversity without attempting to freeze traditions in time.',
            native:
              'అల్పసంఖ్యాక భాషా విద్యకు నిధులు సమకూర్చి, సృష్టికర్తలకు వారి వారసత్వంపై నియంత్రణ ఇచ్చే విధానాలు సంప్రదాయాలను కాలంలో గడ్డకట్టించకుండా సాంస్కృతిక వైవిధ్యాన్ని కాపాడగలవు.',
          },
        ],
      },
      hi: {
        word: 'वैश्वीकरण',
        question: 'स्थानीय संस्कृतियों पर वैश्वीकरण के प्रभावों पर चर्चा कीजिए।',
        examples: [
          {
            en: 'Globalization can widen cultural exchange, yet the commercial platforms that carry it often privilege languages and traditions with the greatest purchasing power.',
            native:
              'वैश्वीकरण सांस्कृतिक आदान-प्रदान का विस्तार कर सकता है, फिर भी उसे आगे बढ़ाने वाले व्यावसायिक मंच अक्सर सबसे अधिक क्रय-शक्ति वाली भाषाओं और परंपराओं को प्राथमिकता देते हैं।',
          },
          {
            en: 'Local communities are not merely passive victims: they adapt imported influences, producing hybrid forms that complicate any simple opposition between authentic and foreign culture.',
            native:
              'स्थानीय समुदाय केवल निष्क्रिय पीड़ित नहीं होते: वे बाहर से आए प्रभावों को अपने अनुसार ढालकर ऐसे मिश्रित रूप बनाते हैं जो प्रामाणिक और विदेशी संस्कृति के बीच किसी सरल विरोध को जटिल बना देते हैं।',
          },
          {
            en: 'Policies that fund minority-language education and give creators control over their heritage can preserve cultural diversity without attempting to freeze traditions in time.',
            native:
              'अल्पसंख्यक भाषाओं की शिक्षा को वित्तपोषित करने और रचनाकारों को अपनी विरासत पर नियंत्रण देने वाली नीतियाँ परंपराओं को समय में स्थिर किए बिना सांस्कृतिक विविधता बचा सकती हैं।',
          },
        ],
      },
      es: {
        word: 'globalización',
        question: 'Analiza los efectos de la globalización en las culturas locales.',
        examples: [
          {
            en: 'Globalization can widen cultural exchange, yet the commercial platforms that carry it often privilege languages and traditions with the greatest purchasing power.',
            native:
              'La globalización puede ampliar el intercambio cultural, pero las plataformas comerciales que lo difunden suelen privilegiar las lenguas y tradiciones con mayor poder adquisitivo.',
          },
          {
            en: 'Local communities are not merely passive victims: they adapt imported influences, producing hybrid forms that complicate any simple opposition between authentic and foreign culture.',
            native:
              'Las comunidades locales no son meras víctimas pasivas: adaptan influencias importadas y crean formas híbridas que complican cualquier oposición simple entre cultura auténtica y extranjera.',
          },
          {
            en: 'Policies that fund minority-language education and give creators control over their heritage can preserve cultural diversity without attempting to freeze traditions in time.',
            native:
              'Las políticas que financian la educación en lenguas minoritarias y dan a los creadores control sobre su patrimonio pueden preservar la diversidad cultural sin pretender congelar las tradiciones en el tiempo.',
          },
        ],
      },
      zh: {
        word: '全球化',
        question: '讨论全球化对本土文化的影响。',
        examples: [
          {
            en: 'Globalization can widen cultural exchange, yet the commercial platforms that carry it often privilege languages and traditions with the greatest purchasing power.',
            native: '全球化能够扩大文化交流，但承载这种交流的商业平台往往偏重购买力最强的语言与传统。',
          },
          {
            en: 'Local communities are not merely passive victims: they adapt imported influences, producing hybrid forms that complicate any simple opposition between authentic and foreign culture.',
            native:
              '本地社群并非只是被动的受害者；它们会调整外来影响，创造出混合形式，使本土文化与外来文化之间的简单对立变得复杂。',
          },
          {
            en: 'Policies that fund minority-language education and give creators control over their heritage can preserve cultural diversity without attempting to freeze traditions in time.',
            native:
              '资助少数语言教育并让创作者掌控自身文化遗产的政策，可以保护文化多样性，而无须试图把传统凝固在某个时代。',
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
            en: 'Artificial intelligence is likely to redistribute tasks rather than simply eliminate occupations, making access to retraining and bargaining power decisive in determining who benefits.',
            native:
              'కృత్రిమ మేధస్సు ఉద్యోగాలను పూర్తిగా తొలగించడం కంటే పనులను పునర్విభజించే అవకాశం ఎక్కువ; అందువల్ల పునశ్శిక్షణకు ప్రాప్యత మరియు చర్చా శక్తి ఎవరు లాభపడతారో నిర్ణయించడంలో కీలకం అవుతాయి.',
          },
          {
            en: 'When predictive systems influence medicine, credit, or policing, their apparent efficiency must be weighed against opaque reasoning and the danger of reproducing historical discrimination.',
            native:
              'అంచనా వ్యవస్థలు వైద్యం, రుణం లేదా పోలీసింగ్‌ను ప్రభావితం చేసినప్పుడు, వాటి కనిపించే సమర్థతను అపారదర్శక తర్కం మరియు చారిత్రక వివక్షను పునరుత్పత్తి చేసే ప్రమాదంతో తూకం వేయాలి.',
          },
          {
            en: 'The deepest change may be epistemic: as synthetic content becomes ubiquitous, societies will need new ways to establish authorship, evidence, and justified trust.',
            native:
              'అత్యంత లోతైన మార్పు జ్ఞాన సంబంధమైనదై ఉండవచ్చు: కృత్రిమంగా సృష్టించిన విషయం సర్వవ్యాప్తమవుతున్న కొద్దీ, రచయితత్వం, ఆధారం మరియు సమర్థనీయ విశ్వాసాన్ని నిర్ధారించడానికి సమాజాలకు కొత్త మార్గాలు అవసరమవుతాయి.',
          },
        ],
      },
      hi: {
        word: 'कृत्रिम बुद्धिमत्ता',
        question: 'आपको क्या लगता है कि कृत्रिम बुद्धिमत्ता हमारे जीवन को कैसे बदलेगी?',
        examples: [
          {
            en: 'Artificial intelligence is likely to redistribute tasks rather than simply eliminate occupations, making access to retraining and bargaining power decisive in determining who benefits.',
            native:
              'कृत्रिम बुद्धिमत्ता संभवतः पेशों को पूरी तरह समाप्त करने के बजाय कार्यों का पुनर्वितरण करेगी, इसलिए पुनःप्रशिक्षण तक पहुँच और सौदेबाज़ी की शक्ति यह तय करने में निर्णायक होंगी कि लाभ किसे मिलता है।',
          },
          {
            en: 'When predictive systems influence medicine, credit, or policing, their apparent efficiency must be weighed against opaque reasoning and the danger of reproducing historical discrimination.',
            native:
              'जब पूर्वानुमान प्रणालियाँ चिकित्सा, ऋण या पुलिस व्यवस्था को प्रभावित करती हैं, तब उनकी दिखाई देने वाली दक्षता को अपारदर्शी तर्क और ऐतिहासिक भेदभाव दोहराने के खतरे के विरुद्ध तौलना चाहिए।',
          },
          {
            en: 'The deepest change may be epistemic: as synthetic content becomes ubiquitous, societies will need new ways to establish authorship, evidence, and justified trust.',
            native:
              'सबसे गहरा बदलाव ज्ञान-संबंधी हो सकता है: कृत्रिम रूप से निर्मित सामग्री के सर्वव्यापी होने पर समाजों को लेखकत्व, प्रमाण और तर्कसंगत विश्वास स्थापित करने के नए तरीके चाहिए होंगे।',
          },
        ],
      },
      es: {
        word: 'inteligencia artificial',
        question: '¿Cómo crees que la inteligencia artificial cambiará nuestras vidas?',
        examples: [
          {
            en: 'Artificial intelligence is likely to redistribute tasks rather than simply eliminate occupations, making access to retraining and bargaining power decisive in determining who benefits.',
            native:
              'Es probable que la inteligencia artificial redistribuya tareas en vez de limitarse a eliminar ocupaciones, por lo que el acceso a la reconversión y el poder de negociación serán decisivos para determinar quién se beneficia.',
          },
          {
            en: 'When predictive systems influence medicine, credit, or policing, their apparent efficiency must be weighed against opaque reasoning and the danger of reproducing historical discrimination.',
            native:
              'Cuando los sistemas predictivos influyen en la medicina, el crédito o la actividad policial, su aparente eficiencia debe sopesarse frente a un razonamiento opaco y al riesgo de reproducir discriminaciones históricas.',
          },
          {
            en: 'The deepest change may be epistemic: as synthetic content becomes ubiquitous, societies will need new ways to establish authorship, evidence, and justified trust.',
            native:
              'El cambio más profundo puede ser epistémico: a medida que el contenido sintético se vuelva omnipresente, las sociedades necesitarán nuevas formas de establecer autoría, evidencia y confianza justificada.',
          },
        ],
      },
      zh: {
        word: '人工智能',
        question: '你认为人工智能将如何改变我们的生活？',
        examples: [
          {
            en: 'Artificial intelligence is likely to redistribute tasks rather than simply eliminate occupations, making access to retraining and bargaining power decisive in determining who benefits.',
            native:
              '人工智能更可能重新分配任务，而非简单消灭职业，因此能否获得再培训以及议价能力的强弱，将决定谁能从中受益。',
          },
          {
            en: 'When predictive systems influence medicine, credit, or policing, their apparent efficiency must be weighed against opaque reasoning and the danger of reproducing historical discrimination.',
            native: '当预测系统影响医疗、信贷或警务时，必须把其表面的效率与推理不透明、复制历史歧视的风险一并权衡。',
          },
          {
            en: 'The deepest change may be epistemic: as synthetic content becomes ubiquitous, societies will need new ways to establish authorship, evidence, and justified trust.',
            native:
              '最深刻的变化或许发生在知识层面：随着合成内容无处不在，社会需要新的方法来确认作者身份、证据与有正当依据的信任。',
          },
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
            en: 'Motivation often emerges after action has begun, which suggests that routines and attainable milestones can be more reliable than waiting for inspiration.',
            native:
              'చర్య ప్రారంభమైన తర్వాతే ప్రేరణ తరచూ ఉద్భవిస్తుంది; కాబట్టి స్ఫూర్తి కోసం వేచి ఉండటం కంటే దినచర్యలు మరియు సాధ్యమైన మైలురాళ్లు మరింత నమ్మదగినవని ఇది సూచిస్తుంది.',
          },
          {
            en: 'External rewards may initiate effort, but they can weaken intrinsic commitment when people begin to interpret a valued activity solely as a transaction.',
            native:
              'బాహ్య బహుమతులు ప్రయత్నాన్ని ప్రారంభించవచ్చు, కానీ విలువైన కార్యకలాపాన్ని ప్రజలు కేవలం లావాదేవీగా అర్థం చేసుకోవడం మొదలుపెట్టినప్పుడు అవి అంతర్గత నిబద్ధతను బలహీనపరచగలవు.',
          },
          {
            en: 'Long-term persistence depends on connecting a goal to identity and meaning while designing feedback that makes distant progress psychologically visible.',
            native:
              'దీర్ఘకాలిక పట్టుదల ఒక లక్ష్యాన్ని గుర్తింపు మరియు అర్థంతో అనుసంధానించడంతో పాటు, దూరంగా ఉన్న పురోగతిని మానసికంగా కనిపించేలా చేసే అభిప్రాయ వ్యవస్థను రూపొందించడంపై ఆధారపడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'प्रेरणा',
        question: 'लोगों को उनके लक्ष्य हासिल करने के लिए क्या प्रेरित करता है?',
        examples: [
          {
            en: 'Motivation often emerges after action has begun, which suggests that routines and attainable milestones can be more reliable than waiting for inspiration.',
            native:
              'प्रेरणा अक्सर काम शुरू होने के बाद पैदा होती है, जिससे पता चलता है कि दिनचर्या और हासिल किए जा सकने वाले पड़ाव प्रेरणा की प्रतीक्षा से अधिक भरोसेमंद हो सकते हैं।',
          },
          {
            en: 'External rewards may initiate effort, but they can weaken intrinsic commitment when people begin to interpret a valued activity solely as a transaction.',
            native:
              'बाहरी पुरस्कार प्रयास शुरू करा सकते हैं, लेकिन जब लोग किसी मूल्यवान गतिविधि को केवल लेन-देन समझने लगते हैं, तब वे आंतरिक प्रतिबद्धता कमज़ोर कर सकते हैं।',
          },
          {
            en: 'Long-term persistence depends on connecting a goal to identity and meaning while designing feedback that makes distant progress psychologically visible.',
            native:
              'दीर्घकालिक दृढ़ता किसी लक्ष्य को पहचान और अर्थ से जोड़ने के साथ ऐसी प्रतिक्रिया व्यवस्था बनाने पर निर्भर करती है जो दूर की प्रगति को मनोवैज्ञानिक रूप से दिखाई दे।',
          },
        ],
      },
      es: {
        word: 'motivación',
        question: '¿Qué motiva a las personas a alcanzar sus metas?',
        examples: [
          {
            en: 'Motivation often emerges after action has begun, which suggests that routines and attainable milestones can be more reliable than waiting for inspiration.',
            native:
              'La motivación suele surgir después de comenzar a actuar, lo que sugiere que las rutinas y los hitos alcanzables pueden ser más fiables que esperar la inspiración.',
          },
          {
            en: 'External rewards may initiate effort, but they can weaken intrinsic commitment when people begin to interpret a valued activity solely as a transaction.',
            native:
              'Las recompensas externas pueden iniciar el esfuerzo, pero debilitan el compromiso intrínseco cuando las personas empiezan a interpretar una actividad valiosa únicamente como una transacción.',
          },
          {
            en: 'Long-term persistence depends on connecting a goal to identity and meaning while designing feedback that makes distant progress psychologically visible.',
            native:
              'La perseverancia a largo plazo depende de vincular el objetivo con la identidad y el sentido, y de diseñar una retroalimentación que haga psicológicamente visible el progreso lejano.',
          },
        ],
      },
      zh: {
        word: '动力',
        question: '是什么激励人们实现目标？',
        examples: [
          {
            en: 'Motivation often emerges after action has begun, which suggests that routines and attainable milestones can be more reliable than waiting for inspiration.',
            native: '动力往往在行动开始后才出现，这说明日常惯例和可实现的阶段目标，可能比等待灵感更为可靠。',
          },
          {
            en: 'External rewards may initiate effort, but they can weaken intrinsic commitment when people begin to interpret a valued activity solely as a transaction.',
            native: '外部奖励或许能促使人开始努力，但当人们把一项有价值的活动仅仅理解为交易时，奖励也会削弱内在投入。',
          },
          {
            en: 'Long-term persistence depends on connecting a goal to identity and meaning while designing feedback that makes distant progress psychologically visible.',
            native: '长期坚持既取决于把目标与身份认同和意义联系起来，也取决于设计反馈，让遥远的进展在心理上变得可见。',
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
            en: 'Dense cities can raise productivity and reduce per-capita resource use, provided that housing and transport policy prevent those gains from being captured by landowners alone.',
            native:
              'సాంద్ర నగరాలు ఉత్పాదకతను పెంచి తలసరి వనరుల వినియోగాన్ని తగ్గించగలవు; అయితే గృహనిర్మాణ మరియు రవాణా విధానం ఆ లాభాలను భూయజమానులు మాత్రమే స్వాధీనం చేసుకోకుండా నిరోధించాలి.',
          },
          {
            en: 'Informal settlements reveal a paradox of urban growth: newcomers gain proximity to opportunity while remaining excluded from secure tenure and basic services.',
            native:
              'అనధికారిక నివాసాలు పట్టణ వృద్ధిలోని వైరుధ్యాన్ని చూపుతాయి: కొత్తగా వచ్చినవారు అవకాశాలకు దగ్గరవుతారు, కానీ సురక్షిత నివాస హక్కు మరియు ప్రాథమిక సేవల నుంచి వెలివేయబడుతూనే ఉంటారు.',
          },
          {
            en: 'Successful planning must coordinate climate resilience, public space, and mixed-income housing rather than treating congestion or pollution as isolated technical problems.',
            native:
              'విజయవంతమైన ప్రణాళిక రద్దీ లేదా కాలుష్యాన్ని వేరువేరు సాంకేతిక సమస్యలుగా చూడకుండా, వాతావరణ స్థైర్యం, బహిరంగ ప్రదేశం మరియు మిశ్రమ ఆదాయ గృహనిర్మాణాన్ని సమన్వయం చేయాలి.',
          },
        ],
      },
      hi: {
        word: 'शहरीकरण',
        question: 'शहरीकरण के मुख्य लाभ और चुनौतियाँ क्या हैं?',
        examples: [
          {
            en: 'Dense cities can raise productivity and reduce per-capita resource use, provided that housing and transport policy prevent those gains from being captured by landowners alone.',
            native:
              'सघन शहर उत्पादकता बढ़ा और प्रति व्यक्ति संसाधन-उपयोग घटा सकते हैं, बशर्ते आवास तथा परिवहन नीति इन लाभों पर केवल भू-स्वामियों का कब्ज़ा न होने दे।',
          },
          {
            en: 'Informal settlements reveal a paradox of urban growth: newcomers gain proximity to opportunity while remaining excluded from secure tenure and basic services.',
            native:
              'अनौपचारिक बस्तियाँ शहरी विकास का विरोधाभास दिखाती हैं: नए निवासी अवसरों के निकट पहुँचते हैं, फिर भी सुरक्षित आवास-अधिकार और बुनियादी सेवाओं से वंचित रहते हैं।',
          },
          {
            en: 'Successful planning must coordinate climate resilience, public space, and mixed-income housing rather than treating congestion or pollution as isolated technical problems.',
            native:
              'सफल नियोजन को भीड़भाड़ या प्रदूषण को अलग-अलग तकनीकी समस्याएँ मानने के बजाय जलवायु सहनशीलता, सार्वजनिक स्थान और मिश्रित-आय आवास में समन्वय करना चाहिए।',
          },
        ],
      },
      es: {
        word: 'urbanización',
        question: '¿Cuáles son los principales beneficios y desafíos de la urbanización?',
        examples: [
          {
            en: 'Dense cities can raise productivity and reduce per-capita resource use, provided that housing and transport policy prevent those gains from being captured by landowners alone.',
            native:
              'Las ciudades densas pueden elevar la productividad y reducir el uso de recursos por habitante, siempre que las políticas de vivienda y transporte impidan que esos beneficios queden únicamente en manos de los propietarios del suelo.',
          },
          {
            en: 'Informal settlements reveal a paradox of urban growth: newcomers gain proximity to opportunity while remaining excluded from secure tenure and basic services.',
            native:
              'Los asentamientos informales revelan una paradoja del crecimiento urbano: los recién llegados se acercan a las oportunidades, pero siguen excluidos de una tenencia segura y de servicios básicos.',
          },
          {
            en: 'Successful planning must coordinate climate resilience, public space, and mixed-income housing rather than treating congestion or pollution as isolated technical problems.',
            native:
              'Una planificación acertada debe coordinar la resiliencia climática, el espacio público y la vivienda para distintos niveles de ingreso, en lugar de tratar la congestión o la contaminación como problemas técnicos aislados.',
          },
        ],
      },
      zh: {
        word: '城市化',
        question: '城市化的主要益处和挑战是什么？',
        examples: [
          {
            en: 'Dense cities can raise productivity and reduce per-capita resource use, provided that housing and transport policy prevent those gains from being captured by landowners alone.',
            native: '高密度城市能够提高生产率并减少人均资源消耗，前提是住房与交通政策防止这些收益仅被土地所有者攫取。',
          },
          {
            en: 'Informal settlements reveal a paradox of urban growth: newcomers gain proximity to opportunity while remaining excluded from secure tenure and basic services.',
            native: '非正规住区揭示了城市增长的悖论：新来者更接近机会，却仍被排除在稳定居住权与基本服务之外。',
          },
          {
            en: 'Successful planning must coordinate climate resilience, public space, and mixed-income housing rather than treating congestion or pollution as isolated technical problems.',
            native: '成功的规划必须统筹气候韧性、公共空间与混合收入住房，而不是把拥堵或污染当作彼此孤立的技术问题。',
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
            en: 'Digital privacy is not absolute secrecy but meaningful control over which data are collected, how they are combined, and which decisions they are allowed to influence.',
            native:
              'డిజిటల్ గోప్యత అంటే సంపూర్ణ రహస్యత కాదు; ఏ డేటాను సేకరిస్తారు, దాన్ని ఎలా కలుపుతారు, అది ఏ నిర్ణయాలను ప్రభావితం చేయడానికి అనుమతిస్తారు అన్న వాటిపై అర్థవంతమైన నియంత్రణ.',
          },
          {
            en: 'Consent offers little protection when essential services require acceptance of complex terms and data can be inferred about people who never disclosed them.',
            native:
              'అవసరమైన సేవలు సంక్లిష్ట నిబంధనలను అంగీకరించాల్సిందేనని చేసినప్పుడు, అలాగే ఎప్పుడూ వెల్లడించని వ్యక్తుల గురించిన డేటాను కూడా ఊహించగలిగినప్పుడు సమ్మతి తక్కువ రక్షణనే అందిస్తుంది.',
          },
          {
            en: 'Effective safeguards therefore require data minimization, independent oversight, and enforceable rights to access, correction, and deletion rather than stronger passwords alone.',
            native:
              'కాబట్టి సమర్థవంతమైన రక్షణలకు బలమైన పాస్‌వర్డ్‌లు మాత్రమే కాకుండా డేటా కనిష్ఠీకరణ, స్వతంత్ర పర్యవేక్షణ మరియు ప్రాప్యత, సవరణ, తొలగింపుకు అమలు చేయగల హక్కులు అవసరం.',
          },
        ],
      },
      hi: {
        word: 'निजता',
        question: 'क्या डिजिटल युग में निजता संभव है? अपने विचार दीजिए।',
        examples: [
          {
            en: 'Digital privacy is not absolute secrecy but meaningful control over which data are collected, how they are combined, and which decisions they are allowed to influence.',
            native:
              'डिजिटल निजता पूर्ण गोपनीयता नहीं, बल्कि इस पर सार्थक नियंत्रण है कि कौन-सा डेटा एकत्र हो, उसे कैसे जोड़ा जाए और उसे किन निर्णयों को प्रभावित करने दिया जाए।',
          },
          {
            en: 'Consent offers little protection when essential services require acceptance of complex terms and data can be inferred about people who never disclosed them.',
            native:
              'जब आवश्यक सेवाएँ जटिल शर्तें स्वीकार करना अनिवार्य बनाती हैं और उन लोगों के बारे में भी डेटा निकाला जा सकता है जिन्होंने उसे कभी साझा नहीं किया, तब सहमति बहुत कम सुरक्षा देती है।',
          },
          {
            en: 'Effective safeguards therefore require data minimization, independent oversight, and enforceable rights to access, correction, and deletion rather than stronger passwords alone.',
            native:
              'इसलिए प्रभावी सुरक्षा के लिए केवल अधिक मज़बूत पासवर्ड नहीं, बल्कि न्यूनतम डेटा-संग्रह, स्वतंत्र निगरानी और पहुँच, सुधार तथा मिटाने के लागू किए जा सकने वाले अधिकार चाहिए।',
          },
        ],
      },
      es: {
        word: 'privacidad',
        question: '¿Es posible la privacidad en la era digital? Da tu opinión.',
        examples: [
          {
            en: 'Digital privacy is not absolute secrecy but meaningful control over which data are collected, how they are combined, and which decisions they are allowed to influence.',
            native:
              'La privacidad digital no consiste en un secreto absoluto, sino en un control significativo sobre qué datos se recogen, cómo se combinan y en qué decisiones pueden influir.',
          },
          {
            en: 'Consent offers little protection when essential services require acceptance of complex terms and data can be inferred about people who never disclosed them.',
            native:
              'El consentimiento protege poco cuando los servicios esenciales exigen aceptar condiciones complejas y se pueden inferir datos sobre personas que nunca los revelaron.',
          },
          {
            en: 'Effective safeguards therefore require data minimization, independent oversight, and enforceable rights to access, correction, and deletion rather than stronger passwords alone.',
            native:
              'Por tanto, unas garantías eficaces requieren minimizar los datos, supervisión independiente y derechos exigibles de acceso, rectificación y supresión, no solo contraseñas más seguras.',
          },
        ],
      },
      zh: {
        word: '隐私',
        question: '在数字时代，隐私还有可能吗？谈谈你的看法。',
        examples: [
          {
            en: 'Digital privacy is not absolute secrecy but meaningful control over which data are collected, how they are combined, and which decisions they are allowed to influence.',
            native: '数字隐私并非绝对保密，而是切实控制收集哪些数据、如何组合数据，以及允许数据影响哪些决定。',
          },
          {
            en: 'Consent offers little protection when essential services require acceptance of complex terms and data can be inferred about people who never disclosed them.',
            native: '当基本服务要求用户接受复杂条款，而且还能推断出当事人从未披露的数据时，同意机制几乎无法提供保护。',
          },
          {
            en: 'Effective safeguards therefore require data minimization, independent oversight, and enforceable rights to access, correction, and deletion rather than stronger passwords alone.',
            native: '因此，有效保障需要数据最小化、独立监督，以及可执行的查阅、更正和删除权，而不能只依靠更强的密码。',
          },
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
            en: 'Individual boundary-setting has limited effect when promotion, job security, and professional status implicitly reward permanent availability.',
            native:
              'పదోన్నతి, ఉద్యోగ భద్రత మరియు వృత్తిపరమైన హోదా ఎల్లప్పుడూ అందుబాటులో ఉండటాన్ని పరోక్షంగా ప్రోత్సహించినప్పుడు, వ్యక్తులు హద్దులు పెట్టుకోవడం పరిమిత ప్రభావమే చూపుతుంది.',
          },
          {
            en: 'Flexible work can increase autonomy, yet without workload limits it may simply transfer the office into the home and make unpaid labor less visible.',
            native:
              'అనువైన పని స్వయంప్రతిపత్తిని పెంచగలదు, అయితే పనిభారం పరిమితులు లేకపోతే అది కార్యాలయాన్ని ఇంటికి తరలించి, వేతనం లేని శ్రమను మరింత కనిపించకుండా చేయవచ్చు.',
          },
          {
            en: 'A sustainable balance requires organizations to evaluate outcomes rather than presenteeism and societies to value care, rest, and civic life as productive goods.',
            native:
              'స్థిరమైన సమతుల్యతకు సంస్థలు కార్యాలయంలో కనిపించే సమయాన్ని కాకుండా ఫలితాలను అంచనా వేయాలి; సమాజాలు సంరక్షణ, విశ్రాంతి మరియు పౌర జీవితాన్ని ఉత్పాదక విలువలుగా గుర్తించాలి.',
          },
        ],
      },
      hi: {
        word: 'कार्य-जीवन संतुलन',
        question: 'लोग स्वस्थ कार्य-जीवन संतुलन कैसे बनाए रख सकते हैं?',
        examples: [
          {
            en: 'Individual boundary-setting has limited effect when promotion, job security, and professional status implicitly reward permanent availability.',
            native:
              'जब पदोन्नति, नौकरी की सुरक्षा और पेशेवर प्रतिष्ठा अप्रत्यक्ष रूप से हर समय उपलब्ध रहने को पुरस्कृत करती हैं, तब व्यक्तिगत सीमाएँ तय करने का प्रभाव सीमित रहता है।',
          },
          {
            en: 'Flexible work can increase autonomy, yet without workload limits it may simply transfer the office into the home and make unpaid labor less visible.',
            native:
              'लचीला काम स्वायत्तता बढ़ा सकता है, फिर भी कार्यभार की सीमा के बिना वह कार्यालय को घर में पहुँचा सकता है और अवैतनिक श्रम को कम दिखाई देने वाला बना सकता है।',
          },
          {
            en: 'A sustainable balance requires organizations to evaluate outcomes rather than presenteeism and societies to value care, rest, and civic life as productive goods.',
            native:
              'टिकाऊ संतुलन के लिए संगठनों को केवल कार्यस्थल पर मौजूदगी नहीं, बल्कि परिणाम आँकने चाहिए और समाजों को देखभाल, विश्राम तथा नागरिक जीवन को उत्पादक मूल्यों के रूप में मानना चाहिए।',
          },
        ],
      },
      es: {
        word: 'equilibrio entre trabajo y vida',
        question: '¿Cómo pueden las personas mantener un equilibrio saludable entre trabajo y vida?',
        examples: [
          {
            en: 'Individual boundary-setting has limited effect when promotion, job security, and professional status implicitly reward permanent availability.',
            native:
              'Establecer límites individuales tiene un efecto limitado cuando la promoción, la seguridad laboral y el prestigio profesional premian implícitamente la disponibilidad permanente.',
          },
          {
            en: 'Flexible work can increase autonomy, yet without workload limits it may simply transfer the office into the home and make unpaid labor less visible.',
            native:
              'El trabajo flexible puede aumentar la autonomía, pero sin límites de carga laboral quizá solo traslade la oficina al hogar y vuelva menos visible el trabajo no remunerado.',
          },
          {
            en: 'A sustainable balance requires organizations to evaluate outcomes rather than presenteeism and societies to value care, rest, and civic life as productive goods.',
            native:
              'Un equilibrio sostenible exige que las organizaciones evalúen resultados en vez de presentismo y que las sociedades valoren los cuidados, el descanso y la vida cívica como bienes productivos.',
          },
        ],
      },
      zh: {
        word: '工作与生活的平衡',
        question: '人们如何保持健康的工作与生活平衡？',
        examples: [
          {
            en: 'Individual boundary-setting has limited effect when promotion, job security, and professional status implicitly reward permanent availability.',
            native: '当晋升、职业保障与专业地位暗中奖励随时待命时，个人设定边界所能发挥的作用十分有限。',
          },
          {
            en: 'Flexible work can increase autonomy, yet without workload limits it may simply transfer the office into the home and make unpaid labor less visible.',
            native:
              '灵活工作可以增加自主性，但如果工作量没有上限，它可能只是把办公室搬进家中，并让无偿劳动变得更隐蔽。',
          },
          {
            en: 'A sustainable balance requires organizations to evaluate outcomes rather than presenteeism and societies to value care, rest, and civic life as productive goods.',
            native:
              '可持续的平衡要求组织评价成果而非在岗表演，也要求社会把照护、休息与公民生活视为具有生产价值的事物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'resilience',
    questionText:
      'Discuss whether resilience is an innate trait or a quality that people can develop through experience.',
    translations: {
      te: {
        word: 'స్థైర్యం',
        question: 'స్థైర్యం సహజమైన లక్షణమా, లేక అనుభవం ద్వారా అభివృద్ధి చేసుకోగల గుణమా అనేదాని గురించి చర్చించండి.',
        examples: [
          {
            en: 'While some individuals appear naturally resilient, it could be argued that adversity, rather than genetics, plays the decisive role in shaping this quality.',
            native:
              'కొందరు సహజంగా స్థైర్యంతో కనిపిస్తారేమో కానీ, జన్యువుల కంటే విపత్తులే ఈ గుణాన్ని రూపొందించడంలో నిర్ణయాత్మక పాత్ర పోషిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, temperament matters to some extent; nevertheless, supportive relationships and learned coping strategies seem far more influential in the long run.',
            native:
              'నిజానికి స్వభావం కొంత వరకు ముఖ్యమే; అయినప్పటికీ, సహాయకరమైన సంబంధాలు మరియు నేర్చుకున్న ఎదుర్కొనే వ్యూహాలు దీర్ఘకాలంలో చాలా ప్రభావవంతంగా ఉంటాయి.',
          },
          {
            en: 'On balance, I would contend that resilience resembles a muscle: although rarely comfortable, deliberate exposure to manageable setbacks tends to strengthen it considerably.',
            native:
              'మొత్తానికి, స్థైర్యం కండరంలాంటిదని నేను పేర్కొంటాను: అరుదుగా సౌకర్యవంతంగా ఉన్నప్పటికీ, నియంత్రించగల ఇబ్బందులను ఉద్దేశపూర్వకంగా ఎదుర్కోవడం దానిని గణనీయంగా బలపరుస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'लचीलापन',
        question: 'चर्चा कीजिए कि लचीलापन एक जन्मजात गुण है या अनुभव के माध्यम से विकसित की जा सकने वाली विशेषता।',
        examples: [
          {
            en: 'While some individuals appear naturally resilient, it could be argued that adversity, rather than genetics, plays the decisive role in shaping this quality.',
            native:
              'जबकि कुछ लोग स्वाभाविक रूप से लचीले प्रतीत होते हैं, यह तर्क दिया जा सकता है कि इस गुण को आकार देने में आनुवंशिकता से अधिक विपत्तियाँ निर्णायक भूमिका निभाती हैं।',
          },
          {
            en: 'Admittedly, temperament matters to some extent; nevertheless, supportive relationships and learned coping strategies seem far more influential in the long run.',
            native:
              'यह स्वीकार करना होगा कि स्वभाव कुछ हद तक मायने रखता है; फिर भी, सहायक रिश्ते और सीखी गई सामना करने की रणनीतियाँ लंबे समय में कहीं अधिक प्रभावशाली लगती हैं।',
          },
          {
            en: 'On balance, I would contend that resilience resembles a muscle: although rarely comfortable, deliberate exposure to manageable setbacks tends to strengthen it considerably.',
            native:
              'कुल मिलाकर, मेरा मानना है कि लचीलापन एक माँसपेशी जैसा है: यद्यपि यह शायद ही आरामदायक होता है, प्रबंधनीय असफलताओं का जानबूझकर सामना इसे काफी मज़बूत बनाता है।',
          },
        ],
      },
      es: {
        word: 'resiliencia',
        question:
          'Analiza si la resiliencia es un rasgo innato o una cualidad que las personas pueden desarrollar con la experiencia.',
        examples: [
          {
            en: 'While some individuals appear naturally resilient, it could be argued that adversity, rather than genetics, plays the decisive role in shaping this quality.',
            native:
              'Aunque algunas personas parecen resilientes por naturaleza, podría argumentarse que la adversidad, más que la genética, desempeña el papel decisivo en la formación de esta cualidad.',
          },
          {
            en: 'Admittedly, temperament matters to some extent; nevertheless, supportive relationships and learned coping strategies seem far more influential in the long run.',
            native:
              'Es cierto que el temperamento importa hasta cierto punto; sin embargo, las relaciones de apoyo y las estrategias de afrontamiento aprendidas parecen mucho más influyentes a largo plazo.',
          },
          {
            en: 'On balance, I would contend that resilience resembles a muscle: although rarely comfortable, deliberate exposure to manageable setbacks tends to strengthen it considerably.',
            native:
              'En definitiva, yo sostendría que la resiliencia se parece a un músculo: aunque rara vez resulta cómodo, la exposición deliberada a reveses manejables tiende a fortalecerla considerablemente.',
          },
        ],
      },
      zh: {
        word: '韧性',
        question: '讨论韧性是与生俱来的特质，还是人们可以通过经历培养的品质。',
        examples: [
          {
            en: 'While some individuals appear naturally resilient, it could be argued that adversity, rather than genetics, plays the decisive role in shaping this quality.',
            native: '尽管有些人似乎天生就有韧性，但可以认为，在塑造这种品质方面，逆境而非基因起着决定性作用。',
          },
          {
            en: 'Admittedly, temperament matters to some extent; nevertheless, supportive relationships and learned coping strategies seem far more influential in the long run.',
            native:
              '诚然，性格在某种程度上确实重要；然而，从长远来看，支持性的人际关系和后天习得的应对策略似乎影响更大。',
          },
          {
            en: 'On balance, I would contend that resilience resembles a muscle: although rarely comfortable, deliberate exposure to manageable setbacks tends to strengthen it considerably.',
            native:
              '总体而言，我认为韧性就像一块肌肉：虽然刻意面对可控的挫折很少让人感到舒适，但它往往会大大增强韧性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'innovation',
    questionText: 'To what extent does innovation depend on individual genius rather than collaborative effort?',
    translations: {
      te: {
        word: 'ఆవిష్కరణ',
        question: 'ఆవిష్కరణ వ్యక్తిగత ప్రతిభ కంటే సామూహిక కృషిపై ఎంత వరకు ఆధారపడుతుంది?',
        examples: [
          {
            en: "Although history celebrates lone inventors, most breakthroughs arguably emerge from networks of researchers who build, often unknowingly, on one another's incremental work.",
            native:
              'చరిత్ర ఏకాకి ఆవిష్కర్తలను కొనియాడినప్పటికీ, చాలా పురోగతులు ఒకరి క్రమిక పనిపై మరొకరు తరచుగా తెలియకుండానే నిర్మించే పరిశోధకుల నెట్‌వర్కుల నుండే ఉద్భవిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'It could be argued that genius provides the spark, yet without institutions willing to fund and refine ideas, most innovations would remain little more than curiosities.',
            native:
              'ప్రతిభ మొదటి మెరుపును ఇస్తుందని చెప్పవచ్చు, అయితే ఆలోచనలకు నిధులు సమకూర్చి వాటిని రుగ్మతలు చేసే సంస్థలు లేకపోతే, చాలా ఆవిష్కరణలు కేవలం ఆసక్తికర వస్తువులుగానే మిగిలిపోతాయి.',
          },
          {
            en: 'To some extent the romantic myth of the solitary genius persists because it simplifies a far messier, collaborative reality; nevertheless, it distorts how progress actually happens.',
            native:
              'ఏకాకి ప్రతిభావంతుని రొమాంటిక్ పురాణం కొంత వరకు కొనసాగుతుంది, ఎందుకంటే అది చాలా గందరగోళమైన, సామూహిక వాస్తవాన్ని సరళీకరిస్తుంది; అయినప్పటికీ, పురోగతి వాస్తవంగా ఎలా జరుగుతుందో అది అపవ్యాఖ్యానం చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'नवाचार',
        question: 'नवाचार किस हद तक व्यक्तिगत प्रतिभा पर निर्भर करता है, और किस हद तक सहयोगात्मक प्रयास पर?',
        examples: [
          {
            en: "Although history celebrates lone inventors, most breakthroughs arguably emerge from networks of researchers who build, often unknowingly, on one another's incremental work.",
            native:
              'यद्यपि इतिहास अकेले आविष्कारकों का गुणगान करता है, फिर भी अधिकांश सफलताएँ तर्कतः शोधकर्ताओं के ऐसे नेटवर्क से निकलती हैं जो अक्सर अनजाने में एक-दूसरे के क्रमिक कार्य पर आगे बनाते हैं।',
          },
          {
            en: 'It could be argued that genius provides the spark, yet without institutions willing to fund and refine ideas, most innovations would remain little more than curiosities.',
            native:
              'यह तर्क दिया जा सकता है कि प्रतिभा चिंगारी प्रदान करती है, लेकिन विचारों को धन देने और परिष्कृत करने के लिए तैयार संस्थाओं के बिना, अधिकांश नवाचार महज़ जिज्ञासा की वस्तु बनकर रह जाएँगे।',
          },
          {
            en: 'To some extent the romantic myth of the solitary genius persists because it simplifies a far messier, collaborative reality; nevertheless, it distorts how progress actually happens.',
            native:
              'कुछ हद तक एकाकी प्रतिभा का रोमांटिक मिथक इसलिए टिका रहता है क्योंकि यह कहीं अधिक अव्यवस्थित, सहयोगी वास्तविकता को सरल बना देता है; फिर भी, यह विकृत करता है कि प्रगति वास्तव में कैसे होती है।',
          },
        ],
      },
      es: {
        word: 'innovación',
        question: '¿Hasta qué punto depende la innovación del genio individual y no del esfuerzo colaborativo?',
        examples: [
          {
            en: "Although history celebrates lone inventors, most breakthroughs arguably emerge from networks of researchers who build, often unknowingly, on one another's incremental work.",
            native:
              'Aunque la historia celebra a los inventores solitarios, la mayoría de los avances surgen, posiblemente, de redes de investigadores que se apoyan, a menudo sin saberlo, en el trabajo incremental de los demás.',
          },
          {
            en: 'It could be argued that genius provides the spark, yet without institutions willing to fund and refine ideas, most innovations would remain little more than curiosities.',
            native:
              'Podría argumentarse que el genio aporta la chispa, pero sin instituciones dispuestas a financiar y perfeccionar las ideas, la mayoría de las innovaciones seguirían siendo meras curiosidades.',
          },
          {
            en: 'To some extent the romantic myth of the solitary genius persists because it simplifies a far messier, collaborative reality; nevertheless, it distorts how progress actually happens.',
            native:
              'En cierta medida, el mito romántico del genio solitario persiste porque simplifica una realidad colaborativa mucho más caótica; sin embargo, distorsiona cómo ocurre realmente el progreso.',
          },
        ],
      },
      zh: {
        word: '创新',
        question: '创新在多大程度上依赖于个人天赋而非协作努力？',
        examples: [
          {
            en: "Although history celebrates lone inventors, most breakthroughs arguably emerge from networks of researchers who build, often unknowingly, on one another's incremental work.",
            native:
              '尽管历史歌颂孤独的发明家，但可以说，大多数突破都源自研究者网络，他们往往在不知不觉中建立在彼此渐进的工作之上。',
          },
          {
            en: 'It could be argued that genius provides the spark, yet without institutions willing to fund and refine ideas, most innovations would remain little more than curiosities.',
            native: '可以认为，天才提供了火花，但如果没有愿意资助和完善创意的机构，大多数创新将只不过沦为新奇玩物。',
          },
          {
            en: 'To some extent the romantic myth of the solitary genius persists because it simplifies a far messier, collaborative reality; nevertheless, it distorts how progress actually happens.',
            native:
              '在某种程度上，孤独天才的浪漫神话之所以经久不衰，是因为它把一个远为混乱、协作的现实简单化了；然而，它扭曲了进步实际发生的方式。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'freedom',
    questionText: 'Is complete freedom desirable, or do societies need limits to function well?',
    translations: {
      te: {
        word: 'స్వేచ్ఛ',
        question: 'పూర్తి స్వేచ్ఛ కావాల్సిందేనా, లేక సమాజాలు బాగా పనిచేయాలంటే పరిమితులు అవసరమా?',
        examples: [
          {
            en: 'While few would dispute the value of personal liberty, it could be argued that absolute freedom tends to erode the very security that makes meaningful choices possible.',
            native:
              'వ్యక్తిగత స్వాతంత్ర్యం విలువను తక్కువ మందే ఖండిస్తారేమో కానీ, పూర్తి స్వేచ్ఛ అర్థవంతమైన ఎంపికలను సాధ్యం చేసే భద్రతనే కొట్టివేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, restrictions can be abused by those in power; nevertheless, sensible rules often protect the vulnerable more than they constrain the strong.',
            native:
              'నిజానికి అధికారంలో ఉన్నవారు ఆంక్షలను దుర్వినియోగం చేయవచ్చు; అయినప్పటికీ, సమంజసమైన నియమాలు తరచుగా బలవంతులను అడ్డగించడం కంటే బలహీనులను ఎక్కువగా రక్షిస్తాయి.',
          },
          {
            en: 'On balance, freedom seems less like the absence of rules and more like a fragile equilibrium that societies must continually renegotiate as circumstances change.',
            native:
              'మొత్తానికి, స్వేచ్ఛ నియమాల లేమి కంటే, పరిస్థితులు మారేకొద్దీ సమాజాలు నిరంతరం మళ్లీ సర్దుబాటు చేసుకోవాల్సిన సున్నితమైన సమతుల్యతలా ఎక్కువగా కనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'स्वतंत्रता',
        question: 'क्या पूर्ण स्वतंत्रता वांछनीय है, या समाजों को अच्छे से काम करने के लिए सीमाओं की आवश्यकता है?',
        examples: [
          {
            en: 'While few would dispute the value of personal liberty, it could be argued that absolute freedom tends to erode the very security that makes meaningful choices possible.',
            native:
              'जबकि व्यक्तिगत स्वतंत्रता के मूल्य पर बहुत कम लोग आपत्ति करेंगे, यह तर्क दिया जा सकता है कि पूर्ण स्वतंत्रता उसी सुरक्षा को क्षय कर देती है जो सार्थक विकल्पों को संभव बनाती है।',
          },
          {
            en: 'Admittedly, restrictions can be abused by those in power; nevertheless, sensible rules often protect the vulnerable more than they constrain the strong.',
            native:
              'यह स्वीकार करना होगा कि सत्ता में बैठे लोग प्रतिबंधों का दुरुपयोग कर सकते हैं; फिर भी, समझदारी भरे नियम अक्सर मज़बूतों को बाँधने से ज़्यादा कमज़ोरों की रक्षा करते हैं।',
          },
          {
            en: 'On balance, freedom seems less like the absence of rules and more like a fragile equilibrium that societies must continually renegotiate as circumstances change.',
            native:
              'कुल मिलाकर, स्वतंत्रता नियमों की अनुपस्थिति से कम और एक नाज़ुक संतुलन जैसी अधिक लगती है, जिसे समाजों को बदलती परिस्थितियों के साथ लगातार दोबारा तय करना पड़ता है।',
          },
        ],
      },
      es: {
        word: 'libertad',
        question: '¿Es deseable la libertad absoluta, o necesitan las sociedades límites para funcionar bien?',
        examples: [
          {
            en: 'While few would dispute the value of personal liberty, it could be argued that absolute freedom tends to erode the very security that makes meaningful choices possible.',
            native:
              'Aunque pocos cuestionarían el valor de la libertad personal, podría argumentarse que la libertad absoluta tiende a erosionar la propia seguridad que hace posibles las decisiones significativas.',
          },
          {
            en: 'Admittedly, restrictions can be abused by those in power; nevertheless, sensible rules often protect the vulnerable more than they constrain the strong.',
            native:
              'Es cierto que quienes detentan el poder pueden abusar de las restricciones; sin embargo, las normas sensatas suelen proteger a los vulnerables más de lo que limitan a los fuertes.',
          },
          {
            en: 'On balance, freedom seems less like the absence of rules and more like a fragile equilibrium that societies must continually renegotiate as circumstances change.',
            native:
              'En definitiva, la libertad parece menos la ausencia de reglas y más un equilibrio frágil que las sociedades deben renegociar continuamente a medida que cambian las circunstancias.',
          },
        ],
      },
      zh: {
        word: '自由',
        question: '完全的自由是否可取，还是社会需要一定的限制才能良好运转？',
        examples: [
          {
            en: 'While few would dispute the value of personal liberty, it could be argued that absolute freedom tends to erode the very security that makes meaningful choices possible.',
            native:
              '尽管很少有人会质疑个人自由的价值，但可以认为，绝对的自由往往会侵蚀使有意义的选择成为可能的那种安全本身。',
          },
          {
            en: 'Admittedly, restrictions can be abused by those in power; nevertheless, sensible rules often protect the vulnerable more than they constrain the strong.',
            native: '诚然，当权者可能滥用限制；然而，明智的规则往往更多地保护弱者，而不是束缚强者。',
          },
          {
            en: 'On balance, freedom seems less like the absence of rules and more like a fragile equilibrium that societies must continually renegotiate as circumstances change.',
            native: '总体而言，自由与其说意味着没有规则，不如说是一种脆弱的平衡，社会必须随着环境的变化不断重新协商。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'responsibility',
    questionText: 'Should individuals be held fully responsible for their choices, or do circumstances matter more?',
    translations: {
      te: {
        word: 'బాధ్యత',
        question: 'వ్యక్తులు తమ ఎంపికలకు పూర్తి బాధ్యత వహించాలా, లేక పరిస్థితులు మరింత ముఖ్యమైనవేనా?',
        examples: [
          {
            en: 'It could be argued that holding people accountable encourages prudence, yet this overlooks how profoundly poverty, upbringing, and sheer luck constrain the choices actually available.',
            native:
              'వ్యక్తులను జవాబుదారీగా భావించడం వివేకాన్ని ప్రోత్సహిస్తుందని చెప్పవచ్చు, అయితే పేదరికం, పెంపకం మరియు కేవలం అదృష్టం వాస్తవంగా అందుబాటులో ఉన్న ఎంపికలను ఎంతగా పరిమితం చేస్తాయో ఇది పట్టించుకోదు.',
          },
          {
            en: 'While personal responsibility matters to some extent, societies that ignore structural disadvantages tend to confuse blaming individuals with solving underlying problems.',
            native:
              'వ్యక్తిగత బాధ్యత కొంత వరకు ముఖ్యమైనప్పటికీ, నిర్మాణాత్మక అసౌకర్యాలను పట్టించుకోని సమాజాలు వ్యక్తులను నిందించడాన్నీ, అంతర్లీన సమస్యలను పరిష్కరించడాన్నీ గందరగోళం చేస్తాయి.',
          },
          {
            en: 'Nevertheless, dismissing responsibility altogether is equally misguided, since a sense of agency, however constrained, remains essential for dignity and social cooperation.',
            native:
              'అయినప్పటికీ, బాధ్యతను పూర్తిగా పక్కనపెట్టడం కూడా అంతే తప్పు, ఎందుకంటే ఎంత పరిమితమైనప్పటికీ, తామే చేయగలమనే భావన గౌరవానికీ, సామాజిక సహకారానికీ అత్యవసరం.',
          },
        ],
      },
      hi: {
        word: 'ज़िम्मेदारी',
        question:
          'क्या व्यक्तियों को उनके चुनावों के लिए पूरी तरह ज़िम्मेदार ठहराया जाना चाहिए, या परिस्थितियाँ अधिक मायने रखती हैं?',
        examples: [
          {
            en: 'It could be argued that holding people accountable encourages prudence, yet this overlooks how profoundly poverty, upbringing, and sheer luck constrain the choices actually available.',
            native:
              'यह तर्क दिया जा सकता है कि लोगों को जवाबदेह ठहराना विवेक को बढ़ावा देता है, लेकिन यह नज़रअंदाज़ करता है कि गरीबी, परवरिश और महज़ किस्मत उपलब्ध विकल्पों को कितनी गहराई तक सीमित करती हैं।',
          },
          {
            en: 'While personal responsibility matters to some extent, societies that ignore structural disadvantages tend to confuse blaming individuals with solving underlying problems.',
            native:
              'जबकि व्यक्तिगत ज़िम्मेदारी कुछ हद तक मायने रखती है, जो समाज संरचनात्मक कमियों को अनदेखा करते हैं वे व्यक्तियों को दोष देने और अंतर्निहित समस्याओं को सुलझाने में भ्रम पैदा करते हैं।',
          },
          {
            en: 'Nevertheless, dismissing responsibility altogether is equally misguided, since a sense of agency, however constrained, remains essential for dignity and social cooperation.',
            native:
              'फिर भी, ज़िम्मेदारी को पूरी तरह खारिज करना भी उतना ही भ्रामक है, क्योंकि स्वयं करने की भावना—चाहे कितनी भी सीमित हो—गरिमा और सामाजिक सहयोग के लिए आवश्यक बनी रहती है।',
          },
        ],
      },
      es: {
        word: 'responsabilidad',
        question:
          '¿Deberían las personas ser plenamente responsables de sus decisiones, o importan más las circunstancias?',
        examples: [
          {
            en: 'It could be argued that holding people accountable encourages prudence, yet this overlooks how profoundly poverty, upbringing, and sheer luck constrain the choices actually available.',
            native:
              'Podría argumentarse que exigir responsabilidades fomenta la prudencia, pero esto pasa por alto cuánto limitan la pobreza, la crianza y la pura suerte las opciones realmente disponibles.',
          },
          {
            en: 'While personal responsibility matters to some extent, societies that ignore structural disadvantages tend to confuse blaming individuals with solving underlying problems.',
            native:
              'Aunque la responsabilidad personal importa hasta cierto punto, las sociedades que ignoran las desventajas estructurales tienden a confundir culpar a las personas con resolver los problemas de fondo.',
          },
          {
            en: 'Nevertheless, dismissing responsibility altogether is equally misguided, since a sense of agency, however constrained, remains essential for dignity and social cooperation.',
            native:
              'Sin embargo, descartar por completo la responsabilidad es igualmente erróneo, ya que la sensación de autonomía, por limitada que sea, sigue siendo esencial para la dignidad y la cooperación social.',
          },
        ],
      },
      zh: {
        word: '责任',
        question: '个人应该为自己的选择承担全部责任，还是环境更加重要？',
        examples: [
          {
            en: 'It could be argued that holding people accountable encourages prudence, yet this overlooks how profoundly poverty, upbringing, and sheer luck constrain the choices actually available.',
            native:
              '可以认为，让人们为自己的选择负责能鼓励审慎，但这忽视了贫困、成长环境和纯粹的运气对实际可用选择的深刻限制。',
          },
          {
            en: 'While personal responsibility matters to some extent, societies that ignore structural disadvantages tend to confuse blaming individuals with solving underlying problems.',
            native:
              '尽管个人责任在某种程度上确实重要，但忽视结构性不利条件的社会，往往会把责怪个人与解决根本问题混为一谈。',
          },
          {
            en: 'Nevertheless, dismissing responsibility altogether is equally misguided, since a sense of agency, however constrained, remains essential for dignity and social cooperation.',
            native: '然而，完全否定责任同样是错误的，因为无论受到多大限制，自主感对于尊严和社会合作仍然至关重要。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'empathy',
    questionText: 'Can empathy be taught, or is it something people either have or lack?',
    translations: {
      te: {
        word: 'సానుభూతి',
        question: 'సానుభూతిని నేర్పవచ్చా, లేక అది కొందరికి ఉండి కొందరికి లేనిదేనా?',
        examples: [
          {
            en: "Although empathy partly reflects temperament, it could be argued that literature, travel, and honest conversation expand our capacity to imagine other people's inner lives.",
            native:
              'సానుభూతి పాక్షికంగా స్వభావాన్ని ప్రతిబింబిస్తున్నప్పటికీ, సాహిత్యం, యాత్రలు మరియు నిజాయితీగల సంభాషణలు ఇతరుల అంతర్గత జీవితాలను ఊహించే మన సామర్థ్యాన్ని విస్తరిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, some individuals seem instinctively compassionate; nevertheless, schools that practise perspective-taking report measurable improvements in how students treat one another.',
            native:
              'నిజానికి కొందరు స్వభావతః కరుణామయులుగా ఉంటారు; అయినప్పటికీ, ఇతరుల దృక్కోణం నుండి ఆలోచించడం అభ్యసించే పాఠశాలలు విద్యార్థుల పరస్పర ప్రవర్తనలో కొలవగల మెరుగుదలలను నివేదిస్తున్నాయి.',
          },
          {
            en: 'On balance, empathy appears less like a fixed gift and more like a habit of attention that can, with deliberate effort, be cultivated or allowed to wither.',
            native:
              'మొత్తానికి, సానుభూతి స్థిరమైన వరం కంటే శ్రద్ధ అనే అలవాటులా ఎక్కువగా కనిపిస్తుంది; ఉద్దేశపూర్వక కృషితో దాన్ని పెంచవచ్చు లేదా వాడిపోనివ్వవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'समानुभूति',
        question: 'क्या समानुभूति सिखाई जा सकती है, या यह कुछ ऐसा है जो लोगों में या तो होती है या नहीं?',
        examples: [
          {
            en: "Although empathy partly reflects temperament, it could be argued that literature, travel, and honest conversation expand our capacity to imagine other people's inner lives.",
            native:
              'यद्यपि समानुभूति आंशिक रूप से स्वभाव को दर्शाती है, फिर भी यह तर्क दिया जा सकता है कि साहित्य, यात्रा और ईमानदार बातचीत दूसरों के आंतरिक जीवन की कल्पना करने की हमारी क्षमता का विस्तार करते हैं।',
          },
          {
            en: 'Admittedly, some individuals seem instinctively compassionate; nevertheless, schools that practise perspective-taking report measurable improvements in how students treat one another.',
            native:
              'यह स्वीकार करना होगा कि कुछ लोग सहज रूप से दयालु प्रतीत होते हैं; फिर भी, दूसरों का दृष्टिकोण अपनाने का अभ्यास करने वाले विद्यालय छात्रों के पारस्परिक व्यवहार में मापने योग्य सुधार की सूचना देते हैं।',
          },
          {
            en: 'On balance, empathy appears less like a fixed gift and more like a habit of attention that can, with deliberate effort, be cultivated or allowed to wither.',
            native:
              'कुल मिलाकर, समानुभूति एक स्थिर वरदान से कम और ध्यान की एक ऐसी आदत जैसी अधिक लगती है जिसे जानबूझकर प्रयास से विकसित किया जा सकता है या मुरझाने दिया जा सकता है।',
          },
        ],
      },
      es: {
        word: 'empatía',
        question: '¿Puede enseñarse la empatía, o es algo que las personas tienen o no tienen?',
        examples: [
          {
            en: "Although empathy partly reflects temperament, it could be argued that literature, travel, and honest conversation expand our capacity to imagine other people's inner lives.",
            native:
              'Aunque la empatía refleja en parte el temperamento, podría argumentarse que la literatura, los viajes y la conversación honesta amplían nuestra capacidad de imaginar la vida interior de los demás.',
          },
          {
            en: 'Admittedly, some individuals seem instinctively compassionate; nevertheless, schools that practise perspective-taking report measurable improvements in how students treat one another.',
            native:
              'Es cierto que algunas personas parecen compasivas por instinto; sin embargo, las escuelas que practican la toma de perspectiva reportan mejoras medibles en cómo se tratan los estudiantes entre sí.',
          },
          {
            en: 'On balance, empathy appears less like a fixed gift and more like a habit of attention that can, with deliberate effort, be cultivated or allowed to wither.',
            native:
              'En definitiva, la empatía parece menos un don fijo y más un hábito de atención que, con esfuerzo deliberado, puede cultivarse o dejarse marchitar.',
          },
        ],
      },
      zh: {
        word: '同理心',
        question: '同理心是可以教授的吗，还是人们要么有要么没有的东西？',
        examples: [
          {
            en: "Although empathy partly reflects temperament, it could be argued that literature, travel, and honest conversation expand our capacity to imagine other people's inner lives.",
            native: '尽管同理心部分反映了性格，但可以认为，文学、旅行和真诚的交谈能拓展我们想象他人内心世界的能力。',
          },
          {
            en: 'Admittedly, some individuals seem instinctively compassionate; nevertheless, schools that practise perspective-taking report measurable improvements in how students treat one another.',
            native:
              '诚然，有些人似乎天生富有同情心；然而，实践换位思考的学校报告说，学生彼此相处的方式有了可衡量的改善。',
          },
          {
            en: 'On balance, empathy appears less like a fixed gift and more like a habit of attention that can, with deliberate effort, be cultivated or allowed to wither.',
            native:
              '总体而言，同理心似乎不像是一份固定的天赋，更像是一种专注的习惯，通过刻意努力可以培养，也可能任其枯萎。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'consumerism',
    questionText: 'Does consumer culture improve our lives, or does it create needs we never had?',
    translations: {
      te: {
        word: 'వినియోగవాదం',
        question: 'వినియోగ సంస్కృతి మన జీవితాలను మెరుగుపరుస్తుందా, లేక మనకు లేని అవసరాలను సృష్టిస్తుందా?',
        examples: [
          {
            en: 'While consumerism has undeniably raised material comfort, it could be argued that advertising manufactures dissatisfaction, persuading people that happiness lies always one purchase away.',
            native:
              'వినియోగవాదం భౌతిక సౌకర్యాన్ని నిస్సందేహంగా పెంచినప్పటికీ, ప్రకటనలు అసంతృప్తిని తయారుచేస్తాయని, ఆనందం ఎల్లప్పుడూ ఒక కొనుగోలు దూరంలో ఉంటుందని ప్రజలను ఒప్పిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, markets give us choice; nevertheless, an abundance of nearly identical options often produces anxiety rather than the liberation that choice supposedly brings.',
            native:
              'నిజానికి మార్కెట్లు మనకు ఎంపికను ఇస్తాయి; అయినప్పటికీ, దాదాపు ఒకేలా ఉండే ఎంపికల సమృద్ధి తరచుగా ఎంపిక తేస్తుందని చెప్పబడే విముక్తికి బదులు ఆందోళనను కలిపిస్తుంది.',
          },
          {
            en: 'On balance, consumption becomes problematic when possessions shift from serving our needs to defining our identity, a boundary modern marketing deliberately blurs.',
            native:
              'మొత్తానికి, ఆస్తులు మన అవసరాలను తీర్చడం నుండి మన గుర్తింపును నిర్వచించడానికి మారినప్పుడు వినియోగం సమస్యగా మారుతుంది; ఆధునిక మార్కెటింగ్ ఉద్దేశపూర్వకంగా మసకబార్చే సరిహద్దు ఇది.',
          },
        ],
      },
      hi: {
        word: 'उपभोक्तावाद',
        question:
          'क्या उपभोक्ता संस्कृति हमारे जीवन को बेहतर बनाती है, या वह ऐसी ज़रूरतें पैदा करती है जो हमें कभी थी ही नहीं?',
        examples: [
          {
            en: 'While consumerism has undeniably raised material comfort, it could be argued that advertising manufactures dissatisfaction, persuading people that happiness lies always one purchase away.',
            native:
              'जबकि उपभोक्तावाद ने निस्संदेह भौतिक आराम बढ़ाया है, यह तर्क दिया जा सकता है कि विज्ञापन असंतोष का निर्माण करता है, और लोगों को यह मनाता है कि खुशी हमेशा एक खरीद दूर है।',
          },
          {
            en: 'Admittedly, markets give us choice; nevertheless, an abundance of nearly identical options often produces anxiety rather than the liberation that choice supposedly brings.',
            native:
              'यह स्वीकार करना होगा कि बाज़ार हमें विकल्प देते हैं; फिर भी, लगभग एक जैसे विकल्पों की भरमार अक्सर उस मुक्ति के बजाय चिंता पैदा करती है जो विकल्प कथित तौर पर लाता है।',
          },
          {
            en: 'On balance, consumption becomes problematic when possessions shift from serving our needs to defining our identity, a boundary modern marketing deliberately blurs.',
            native:
              'कुल मिलाकर, उपभोग तब समस्याग्रस्त हो जाता है जब सामान हमारी ज़रूरतों को पूरा करने के बजाय हमारी पहचान बनाने लगता है—यह सीमा आधुनिक विपणन जानबूझकर धुंधली करता है।',
          },
        ],
      },
      es: {
        word: 'consumismo',
        question: '¿Mejora nuestras vidas la cultura de consumo, o crea necesidades que nunca tuvimos?',
        examples: [
          {
            en: 'While consumerism has undeniably raised material comfort, it could be argued that advertising manufactures dissatisfaction, persuading people that happiness lies always one purchase away.',
            native:
              'Aunque el consumismo ha elevado innegablemente el confort material, podría argumentarse que la publicidad fabrica insatisfacción, convenciendo a la gente de que la felicidad está siempre a una compra de distancia.',
          },
          {
            en: 'Admittedly, markets give us choice; nevertheless, an abundance of nearly identical options often produces anxiety rather than the liberation that choice supposedly brings.',
            native:
              'Es cierto que los mercados nos dan opciones; sin embargo, una abundancia de alternativas casi idénticas suele producir ansiedad en lugar de la liberación que supuestamente trae la elección.',
          },
          {
            en: 'On balance, consumption becomes problematic when possessions shift from serving our needs to defining our identity, a boundary modern marketing deliberately blurs.',
            native:
              'En definitiva, el consumo se vuelve problemático cuando las posesiones pasan de satisfacer nuestras necesidades a definir nuestra identidad, un límite que el marketing moderno difumina deliberadamente.',
          },
        ],
      },
      zh: {
        word: '消费主义',
        question: '消费文化改善了我们的生活，还是创造了我们从未有过的需求？',
        examples: [
          {
            en: 'While consumerism has undeniably raised material comfort, it could be argued that advertising manufactures dissatisfaction, persuading people that happiness lies always one purchase away.',
            native: '尽管消费主义无疑提高了物质舒适度，但可以认为，广告制造了不满，说服人们幸福总是只差一次购买。',
          },
          {
            en: 'Admittedly, markets give us choice; nevertheless, an abundance of nearly identical options often produces anxiety rather than the liberation that choice supposedly brings.',
            native: '诚然，市场给了我们选择；然而，大量几乎相同的选项往往带来焦虑，而不是选择本应带来的解放感。',
          },
          {
            en: 'On balance, consumption becomes problematic when possessions shift from serving our needs to defining our identity, a boundary modern marketing deliberately blurs.',
            native:
              '总体而言，当拥有物从满足需求转变为定义我们的身份时，消费就变得成问题了——这正是现代营销刻意模糊的界限。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'migration',
    questionText: 'Do the benefits of international migration outweigh the challenges it creates for host countries?',
    translations: {
      te: {
        word: 'వలస',
        question: 'అంతర్జాతీయ వలసల ప్రయోజనాలు ఆతిథ్య దేశాలకు ఇవ్వే సవాళ్లను అధిగమిస్తాయా?',
        examples: [
          {
            en: 'Although migration can strain housing and public services initially, it could be argued that migrants typically contribute more in taxes and innovation than they ever receive.',
            native:
              'వలసలు ప్రారంభంలో గృహాలపైనూ, ప్రజా సేవలపైనూ ఒత్తిడి కలిపించవచ్చు అయితే, వలసదారులు సాధారణంగా తాము పొందే దానికంటే పన్నుల రూపంలోనూ ఆవిష్కరణల రూపంలోనూ ఎక్కువగా అందిస్తారని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, rapid demographic change unsettles some communities; nevertheless, ageing economies would face severe labour shortages without the arrival of younger migrant workers.',
            native:
              'నిజానికి వేగవంతమైన జనాభా మార్పు కొన్ని సమాజాలను కలవరపెడుతుంది; అయినప్పటికీ, యువ వలస కార్మికులు రాకపోతే వృద్ధాప్య ఆర్థిక వ్యవస్థలు తీవ్రమైన కార్మిక కొరతను ఎదుర్కొంటాయి.',
          },
          {
            en: 'On balance, the debate says as much about political anxieties as economics, since the evidence for long-term fiscal benefits is, if anything, remarkably consistent.',
            native:
              'మొత్తానికి, దీర్ఘకాలిక ఆర్థిక ప్రయోజనాలకు సాక్ష్యాలు అసాధారణంగా స్థిరంగా ఉన్నందున, ఈ చర్చ ఆర్థిక శాస్త్రం గురించినంతగా రాజకీయ ఆందోళనల గురించి కూడా చెబుతుంది.',
          },
        ],
      },
      hi: {
        word: 'प्रवासन',
        question: 'क्या अंतरराष्ट्रीय प्रवासन के लाभ मेज़बान देशों के सामने आने वाली चुनौतियों से अधिक हैं?',
        examples: [
          {
            en: 'Although migration can strain housing and public services initially, it could be argued that migrants typically contribute more in taxes and innovation than they ever receive.',
            native:
              'यद्यपि प्रवासन शुरू में आवास और सार्वजनिक सेवाओं पर दबाव डाल सकता है, फिर भी यह तर्क दिया जा सकता है कि प्रवासी आमतौर पर जो कुछ पाते हैं उससे अधिक करों और नवाचार के रूप में योगदान देते हैं।',
          },
          {
            en: 'Admittedly, rapid demographic change unsettles some communities; nevertheless, ageing economies would face severe labour shortages without the arrival of younger migrant workers.',
            native:
              'यह स्वीकार करना होगा कि तेज़ जनांकिकीय बदलाव कुछ समुदायों को अस्थिर करता है; फिर भी, युवा प्रवासी श्रमिकों के आगमन के बिना, बूढ़ी अर्थव्यवस्थाओं को गंभीर श्रमिक कमी का सामना करना पड़ेगा।',
          },
          {
            en: 'On balance, the debate says as much about political anxieties as economics, since the evidence for long-term fiscal benefits is, if anything, remarkably consistent.',
            native:
              'कुल मिलाकर, यह बहस अर्थशास्त्र के बारे में उतना ही कहती है जितना राजनीतिक चिंताओं के बारे में, क्योंकि दीर्घकालिक राजकोषीय लाभों का प्रमाण उल्लेखनीय रूप से सुसंगत है।',
          },
        ],
      },
      es: {
        word: 'migración',
        question:
          '¿Superan los beneficios de la migración internacional los desafíos que crea para los países de acogida?',
        examples: [
          {
            en: 'Although migration can strain housing and public services initially, it could be argued that migrants typically contribute more in taxes and innovation than they ever receive.',
            native:
              'Aunque la migración puede tensionar inicialmente la vivienda y los servicios públicos, podría argumentarse que los migrantes suelen contribuir más en impuestos e innovación de lo que jamás reciben.',
          },
          {
            en: 'Admittedly, rapid demographic change unsettles some communities; nevertheless, ageing economies would face severe labour shortages without the arrival of younger migrant workers.',
            native:
              'Es cierto que el cambio demográfico rápido inquieta a algunas comunidades; sin embargo, las economías envejecidas afrontarían graves escaseces de mano de obra sin la llegada de trabajadores migrantes jóvenes.',
          },
          {
            en: 'On balance, the debate says as much about political anxieties as economics, since the evidence for long-term fiscal benefits is, if anything, remarkably consistent.',
            native:
              'En definitiva, el debate dice tanto sobre las ansiedades políticas como sobre la economía, ya que la evidencia de los beneficios fiscales a largo plazo es notablemente consistente.',
          },
        ],
      },
      zh: {
        word: '移民',
        question: '国际移民的好处是否超过了它给接收国带来的挑战？',
        examples: [
          {
            en: 'Although migration can strain housing and public services initially, it could be argued that migrants typically contribute more in taxes and innovation than they ever receive.',
            native:
              '尽管移民最初可能给住房和公共服务带来压力，但可以认为，移民在税收和创新方面的贡献通常超过他们所获得的。',
          },
          {
            en: 'Admittedly, rapid demographic change unsettles some communities; nevertheless, ageing economies would face severe labour shortages without the arrival of younger migrant workers.',
            native:
              '诚然，快速的人口结构变化让一些社区感到不安；然而，如果没有年轻移民工人的到来，老龄化经济体将面临严重的劳动力短缺。',
          },
          {
            en: 'On balance, the debate says as much about political anxieties as economics, since the evidence for long-term fiscal benefits is, if anything, remarkably consistent.',
            native:
              '总体而言，这场辩论既关乎经济，也关乎政治焦虑，因为长期财政收益的证据即便不说别的，也是高度一致的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'media bias',
    questionText: 'Can news media ever be truly objective, or is some bias inevitable?',
    translations: {
      te: {
        word: 'మీడియా పక్షపాతం',
        question: 'వార్తా మాధ్యమాలు నిజంగా నిష్పక్షపాతంగా ఉండగలవా, లేక కొంత పక్షపాతం అనివార్యమా?',
        examples: [
          {
            en: 'While journalists may strive for impartiality, it could be argued that every editorial choice, from headline wording to story selection, quietly encodes a particular worldview.',
            native:
              'జర్నలిస్టులు నిష్పక్షపాతం కోసం శ్రమించవచ్చు అయితే, శీర్షిక పదబంధం నుండి కథనాల ఎంపిక వరకు ప్రతి సంపాదకీయ నిర్ణయం నిశ్శబ్దంగా ఒక ప్రత్యేక ప్రపంచ దృష్టిని సంకేతీకరిస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, professional standards reduce the most blatant distortions; nevertheless, ownership structures and commercial pressures shape coverage in ways audiences rarely notice.',
            native:
              'నిజానికి వృత్తిపరమైన ప్రమాణాలు అత్యంత స్పష్టమైన వక్రీకరణలను తగ్గిస్తాయి; అయినప్పటికీ, యాజమాన్య నిర్మాణాలు మరియు వాణిజ్య ఒత్తిళ్లు ప్రేక్షకులు అరుదుగా గమనించే విధంగా కవరేజీని రూపొందిస్తాయి.',
          },
          {
            en: "On balance, complete objectivity may be unattainable, yet transparency about one's perspective is arguably a more honest goal than pretending bias does not exist.",
            native:
              'మొత్తానికి, పూర్తి నిష్పక్షపాతం చేతనమవకపోవచ్చు, అయితే తమ దృక్కోణం గురించి పారదర్శకంగా ఉండటం పక్షపాతం లేదని నటించడం కంటే నిజాయితీగల లక్ష్యం అని చెప్పవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'मीडिया पक्षपात',
        question: 'क्या समाचार मीडिया कभी सच में निष्पक्ष हो सकती है, या कुछ पक्षपात अनिवार्य है?',
        examples: [
          {
            en: 'While journalists may strive for impartiality, it could be argued that every editorial choice, from headline wording to story selection, quietly encodes a particular worldview.',
            native:
              'जबकि पत्रकार निष्पक्षता के लिए प्रयास कर सकते हैं, यह तर्क दिया जा सकता है कि शीर्षक के शब्दों से लेकर खबरों के चयन तक, हर संपादकीय निर्णय चुपचाप एक विशेष दृष्टिकोण को कूटबद्ध करता है।',
          },
          {
            en: 'Admittedly, professional standards reduce the most blatant distortions; nevertheless, ownership structures and commercial pressures shape coverage in ways audiences rarely notice.',
            native:
              'यह स्वीकार करना होगा कि व्यावसायिक मानक सबसे स्पष्ट विकृतियों को कम करते हैं; फिर भी, स्वामित्व संरचनाएँ और व्यावसायिक दबाव कवरेज को उन तरीकों से आकार देते हैं जिन्हें दर्शक शायद ही कभी नोटिस करते हैं।',
          },
          {
            en: "On balance, complete objectivity may be unattainable, yet transparency about one's perspective is arguably a more honest goal than pretending bias does not exist.",
            native:
              'कुल मिलाकर, पूर्ण वस्तुनिष्ठता शायद असंभव है, फिर भी अपने दृष्टिकोण के बारे में पारदर्शिता यह दिखावा करने से अधिक ईमानदार लक्ष्य है कि पक्षपात मौजूद ही नहीं है।',
          },
        ],
      },
      es: {
        word: 'sesgo mediático',
        question: '¿Pueden los medios de noticias ser realmente objetivos, o es inevitable cierto sesgo?',
        examples: [
          {
            en: 'While journalists may strive for impartiality, it could be argued that every editorial choice, from headline wording to story selection, quietly encodes a particular worldview.',
            native:
              'Aunque los periodistas pueden esforzarse por ser imparciales, podría argumentarse que cada decisión editorial, desde el titular hasta la selección de historias, codifica silenciosamente una visión particular del mundo.',
          },
          {
            en: 'Admittedly, professional standards reduce the most blatant distortions; nevertheless, ownership structures and commercial pressures shape coverage in ways audiences rarely notice.',
            native:
              'Es cierto que los estándares profesionales reducen las distorsiones más flagrantes; sin embargo, las estructuras de propiedad y las presiones comerciales moldean la cobertura de maneras que el público rara vez percibe.',
          },
          {
            en: "On balance, complete objectivity may be unattainable, yet transparency about one's perspective is arguably a more honest goal than pretending bias does not exist.",
            native:
              'En definitiva, la objetividad completa quizá sea inalcanzable, pero la transparencia sobre la propia perspectiva es un objetivo más honesto que fingir que el sesgo no existe.',
          },
        ],
      },
      zh: {
        word: '媒体偏见',
        question: '新闻媒体能够真正客观吗，还是某种偏见不可避免？',
        examples: [
          {
            en: 'While journalists may strive for impartiality, it could be argued that every editorial choice, from headline wording to story selection, quietly encodes a particular worldview.',
            native:
              '尽管记者可能努力追求公正，但可以认为，从标题措辞到报道选题，每一个编辑决策都在悄然编码某种特定的世界观。',
          },
          {
            en: 'Admittedly, professional standards reduce the most blatant distortions; nevertheless, ownership structures and commercial pressures shape coverage in ways audiences rarely notice.',
            native:
              '诚然，职业标准能减少最明目张胆的歪曲；然而，所有权结构和商业压力以受众很少注意到的方式塑造着报道。',
          },
          {
            en: "On balance, complete objectivity may be unattainable, yet transparency about one's perspective is arguably a more honest goal than pretending bias does not exist.",
            native: '总体而言，完全的客观或许无法实现，但坦承自己的视角可以说是一个比假装偏见不存在更诚实的目标。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'creativity',
    questionText: 'Is creativity a natural gift, or can it be developed through practice and discipline?',
    translations: {
      te: {
        word: 'సృజనాత్మకత',
        question: 'సృజనాత్మకత సహజమైన వరమా, లేక అభ్యాసం మరియు క్రమశిక్షణ ద్వారా అభివృద్ధి చేయగలదా?',
        examples: [
          {
            en: 'While a few people seem effortlessly inventive, it could be argued that most creative achievements rest on years of unglamorous practice rather than sudden inspiration.',
            native:
              'కొందరు శ్రమ లేకుండా సరికొత్త ఆలోచనలు చేస్తారేమో కానీ, చాలా సృజనాత్మక విజయాలు ఆకస్మిక స్ఫూర్తి కంటే సంవత్సరాల అర్పణాభావ అభ్యాసంపై ఆధారపడి ఉంటాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, formal education sometimes stifles originality; nevertheless, constraints of any kind often provoke the very ingenuity they appear to suppress.',
            native:
              'నిజానికి అధికారిక విద్య కొన్నిసార్లు వినూత్నతను కుదించేస్తుంది; అయినప్పటికీ, ఎటువంటి పరిమితులైనా తాము అణచివేస్తున్నట్టు కనిపించే సృజనాత్మకతనే తరచుగా రేకెత్తిస్తాయి.',
          },
          {
            en: 'On balance, creativity seems less a mysterious talent than a willingness to tolerate failure, since genuinely novel ideas almost always emerge from numerous discarded attempts.',
            native:
              'మొత్తానికి, సృజనాత్మకత రహస్యమైన ప్రతిభ కంటే వైఫల్యాన్ని సహించే సిద్ధాంతంలా కనిపిస్తుంది, ఎందుకంటే నిజంగా కొత్త ఆలోచనలు దాదాపు ఎల్లప్పుడూ పడేయబడిన అనేక ప్రయత్నాల నుండే పుడతాయి.',
          },
        ],
      },
      hi: {
        word: 'रचनात्मकता',
        question: 'क्या रचनात्मकता एक स्वाभाविक उपहार है, या इसे अभ्यास और अनुशासन से विकसित किया जा सकता है?',
        examples: [
          {
            en: 'While a few people seem effortlessly inventive, it could be argued that most creative achievements rest on years of unglamorous practice rather than sudden inspiration.',
            native:
              'जबकि कुछ लोग बिना प्रयास के सृजनशील प्रतीत होते हैं, यह तर्क दिया जा सकता है कि अधिकांश रचनात्मक उपलब्धियाँ अचानक प्रेरणा के बजाय वर्षों के साधारण अभ्यास पर टिकी होती हैं।',
          },
          {
            en: 'Admittedly, formal education sometimes stifles originality; nevertheless, constraints of any kind often provoke the very ingenuity they appear to suppress.',
            native:
              'यह स्वीकार करना होगा कि औपचारिक शिक्षा कभी-कभी मौलिकता को दबा देती है; फिर भी, किसी भी तरह की रुकावटें अक्सर उसी सृजनशीलता को उकेरती हैं जिसे वे दबाती हुई प्रतीत होती हैं।',
          },
          {
            en: 'On balance, creativity seems less a mysterious talent than a willingness to tolerate failure, since genuinely novel ideas almost always emerge from numerous discarded attempts.',
            native:
              'कुल मिलाकर, रचनात्मकता किसी रहस्यमयी प्रतिभा से कम और असफलता सहने की इच्छा जैसी अधिक लगती है, क्योंकि सचमुच नए विचार लगभग हमेशा असंख्य खारिज किए गए प्रयासों से निकलते हैं।',
          },
        ],
      },
      es: {
        word: 'creatividad',
        question: '¿Es la creatividad un don natural, o puede desarrollarse mediante la práctica y la disciplina?',
        examples: [
          {
            en: 'While a few people seem effortlessly inventive, it could be argued that most creative achievements rest on years of unglamorous practice rather than sudden inspiration.',
            native:
              'Aunque algunas personas parecen inventivas sin esfuerzo, podría argumentarse que la mayoría de los logros creativos se apoyan en años de práctica poco glamurosa más que en inspiración repentina.',
          },
          {
            en: 'Admittedly, formal education sometimes stifles originality; nevertheless, constraints of any kind often provoke the very ingenuity they appear to suppress.',
            native:
              'Es cierto que la educación formal a veces sofoca la originalidad; sin embargo, las limitaciones de cualquier tipo suelen provocar precisamente el ingenio que parecen reprimir.',
          },
          {
            en: 'On balance, creativity seems less a mysterious talent than a willingness to tolerate failure, since genuinely novel ideas almost always emerge from numerous discarded attempts.',
            native:
              'En definitiva, la creatividad parece menos un talento misterioso que una disposición a tolerar el fracaso, ya que las ideas realmente novedosas casi siempre surgen de numerosos intentos descartados.',
          },
        ],
      },
      zh: {
        word: '创造力',
        question: '创造力是天生的礼物，还是可以通过练习和自律培养的？',
        examples: [
          {
            en: 'While a few people seem effortlessly inventive, it could be argued that most creative achievements rest on years of unglamorous practice rather than sudden inspiration.',
            native:
              '尽管少数人似乎毫不费力地富有创意，但可以认为，大多数创造性成就依靠的是多年平凡的练习，而非突如其来的灵感。',
          },
          {
            en: 'Admittedly, formal education sometimes stifles originality; nevertheless, constraints of any kind often provoke the very ingenuity they appear to suppress.',
            native: '诚然，正规教育有时会扼杀原创性；然而，任何形式的限制往往恰恰激发出它们表面上压抑的创造力。',
          },
          {
            en: 'On balance, creativity seems less a mysterious talent than a willingness to tolerate failure, since genuinely novel ideas almost always emerge from numerous discarded attempts.',
            native:
              '总体而言，创造力与其说是一种神秘的天赋，不如说是一种容忍失败的意愿，因为真正新颖的想法几乎总是从无数被丢弃的尝试中诞生的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'ambition',
    questionText: 'Is ambition a virtue that drives progress, or a dangerous force that leads to dissatisfaction?',
    translations: {
      te: {
        word: 'అభిలాష',
        question: 'అభిలాష పురోగతిని నడిపించే సద్గుణమా, లేక అసంతృప్తికి దారితీసే ప్రమాదకర శక్తియా?',
        examples: [
          {
            en: 'While ambition unquestionably fuels achievement, it could be argued that unrestrained striving often corrodes the contentment it was supposed to secure.',
            native:
              'అభిలాష నిస్సందేహంగా విజయాలకు ఇంధనమయినప్పటికీ, అదుపులేని శ్రమ తాను భద్రపరచాలనుకున్న తృప్తినే తరచుగా తరిగివేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, societies depend on ambitious individuals for leadership and innovation; nevertheless, cultures that glorify relentless competition tend to produce exhausted, anxious citizens.',
            native:
              'నిజానికి నాయకత్వం, ఆవిష్కరణల కోసం సమాజాలు అభిలాషులపై ఆధారపడతాయి; అయినప్పటికీ, అహర్నిశ పోటీని కీర్తించే సంస్కృతులు అలసిపోయిన, ఆందోళనగల పౌరులను సృష్టిస్తాయి.',
          },
          {
            en: 'On balance, ambition appears healthiest when directed towards mastery rather than status, although distinguishing the two is considerably harder than motivational slogans suggest.',
            native:
              'మొత్తానికి, అభిలాష ప్రతిష్ఠ కంటే నైపుణ్యం వైపు మళ్లినప్పుడు అత్యంత ఆరోగ్యకరంగా ఉంటుంది, అయితే ఈ రెంటి మధ్య తేడా చెప్పడం ప్రేరణాత్మక నినాదాలు సూచించే దానికంటే చాలా కష్టం.',
          },
        ],
      },
      hi: {
        word: 'महत्वाकांक्षा',
        question:
          'क्या महत्वाकांक्षा एक गुण है जो प्रगति को प्रेरित करती है, या एक खतरनाक शक्ति है जो असंतोष की ओर ले जाती है?',
        examples: [
          {
            en: 'While ambition unquestionably fuels achievement, it could be argued that unrestrained striving often corrodes the contentment it was supposed to secure.',
            native:
              'जबकि महत्वाकांक्षा निस्संदेह उपलब्धियों को बल देती है, यह तर्क दिया जा सकता है कि अनियंत्रित प्रयास अक्सर उसी संतोष को क्षय कर देता है जिसे वह सुरक्षित करने वाला था।',
          },
          {
            en: 'Admittedly, societies depend on ambitious individuals for leadership and innovation; nevertheless, cultures that glorify relentless competition tend to produce exhausted, anxious citizens.',
            native:
              'यह स्वीकार करना होगा कि समाज नेतृत्व और नवाचार के लिए महत्वाकांक्षी व्यक्तियों पर निर्भर करते हैं; फिर भी, अथक प्रतिस्पर्धा का महिमामंडन करने वाली संस्कृतियाँ थके और चिंतित नागरिक पैदा करती हैं।',
          },
          {
            en: 'On balance, ambition appears healthiest when directed towards mastery rather than status, although distinguishing the two is considerably harder than motivational slogans suggest.',
            native:
              'कुल मिलाकर, महत्वाकांक्षा तब सबसे स्वस्थ लगती है जब वह प्रतिष्ठा के बजाय प्रवीणता की ओर निर्देशित हो, यद्यपि दोनों में अंतर करना प्रेरणादायक नारों के सुझाव से काफी कठिन है।',
          },
        ],
      },
      es: {
        word: 'ambición',
        question:
          '¿Es la ambición una virtud que impulsa el progreso, o una fuerza peligrosa que conduce a la insatisfacción?',
        examples: [
          {
            en: 'While ambition unquestionably fuels achievement, it could be argued that unrestrained striving often corrodes the contentment it was supposed to secure.',
            native:
              'Aunque la ambición indudablemente alimenta los logros, podría argumentarse que el afán desmedido a menudo corroe la satisfacción que supuestamente debía asegurar.',
          },
          {
            en: 'Admittedly, societies depend on ambitious individuals for leadership and innovation; nevertheless, cultures that glorify relentless competition tend to produce exhausted, anxious citizens.',
            native:
              'Es cierto que las sociedades dependen de personas ambiciosas para el liderazgo y la innovación; sin embargo, las culturas que glorifican la competencia implacable tienden a producir ciudadanos agotados y ansiosos.',
          },
          {
            en: 'On balance, ambition appears healthiest when directed towards mastery rather than status, although distinguishing the two is considerably harder than motivational slogans suggest.',
            native:
              'En definitiva, la ambición parece más saludable cuando se orienta hacia la maestría y no hacia el estatus, aunque distinguir ambas cosas es bastante más difícil de lo que sugieren los lemas motivacionales.',
          },
        ],
      },
      zh: {
        word: '雄心',
        question: '雄心是推动进步的美德，还是导致不满的危险力量？',
        examples: [
          {
            en: 'While ambition unquestionably fuels achievement, it could be argued that unrestrained striving often corrodes the contentment it was supposed to secure.',
            native: '尽管雄心无疑能推动成就，但可以认为，不受约束的追逐往往会侵蚀它本应保障的满足感。',
          },
          {
            en: 'Admittedly, societies depend on ambitious individuals for leadership and innovation; nevertheless, cultures that glorify relentless competition tend to produce exhausted, anxious citizens.',
            native: '诚然，社会依靠有雄心的人来实现领导力和创新；然而，赞美无情竞争的文化往往会造就疲惫而焦虑的公民。',
          },
          {
            en: 'On balance, ambition appears healthiest when directed towards mastery rather than status, although distinguishing the two is considerably harder than motivational slogans suggest.',
            native: '总体而言，当雄心指向精通而非地位时，它似乎最为健康，尽管区分两者远比励志口号所暗示的要困难得多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'trust',
    questionText: 'Why has trust in institutions declined in many societies, and can it be rebuilt?',
    translations: {
      te: {
        word: 'నమ్మకం',
        question: 'అనేక సమాజాలలో సంస్థల పట్ల నమ్మకం ఎందుకు క్షీణించింది, మరియు దాన్ని పునర్నిర్మించవచ్చా?',
        examples: [
          {
            en: 'It could be argued that trust erodes whenever institutions break promises without consequences, since credibility, once squandered, is notoriously difficult to restore.',
            native:
              'సంస్థలు పరిణామాలు లేకుండా వాగ్దానాలు ఉల్లంఘించినప్పుడల్లా నమ్మకం క్షయిస్తుందని చెప్పవచ్చు, ఎందుకంటే ఒక్కసారి వృథా చేసిన విశ్వసనీయతను పునరుద్ధరించడం ప్రసిద్ధంగా కష్టం.',
          },
          {
            en: 'While scandals understandably breed suspicion, excessive cynicism is hardly cost-free, because societies cannot function when every official claim is presumed fraudulent.',
            native:
              'కుంభకోణాలు అనుమానాన్ని పెంచడం అర్థమయినప్పటికీ, అతిగా అవిశ్వాసం నష్టం లేనిది కాదు, ఎందుకంటే ప్రతి అధికారిక ప్రకటనను మోసమని భావించినప్పుడు సమాజాలు పనిచేయలేవు.',
          },
          {
            en: 'Nevertheless, rebuilding trust is possible, though it usually demands sustained transparency and genuine accountability rather than carefully worded apologies and cosmetic reforms.',
            native:
              'అయినప్పటికీ, నమ్మకాన్ని పునర్నిర్మించడం సాధ్యమే, అయితే దానికి సాధారణంగా జాగ్రత్తగా రాసిన క్షమాపణలు, ఉపచార సంస్కరణల కంటే నిరంతర పారదర్శకత, నిజమైన జవాబుదారీతనం అవసరం.',
          },
        ],
      },
      hi: {
        word: 'विश्वास',
        question: 'कई समाजों में संस्थाओं पर विश्वास क्यों कम हुआ है, और क्या इसे दोबारा बनाया जा सकता है?',
        examples: [
          {
            en: 'It could be argued that trust erodes whenever institutions break promises without consequences, since credibility, once squandered, is notoriously difficult to restore.',
            native:
              'यह तर्क दिया जा सकता है कि जब भी संस्थाएँ बिना परिणामों के वादे तोड़ती हैं, विश्वास क्षीण होता है, क्योंकि एक बार नष्ट की गई विश्वसनीयता को बहाल करना कुख्यात रूप से कठिन है।',
          },
          {
            en: 'While scandals understandably breed suspicion, excessive cynicism is hardly cost-free, because societies cannot function when every official claim is presumed fraudulent.',
            native:
              'जबकि घोटाले समझ में आने योग्य रूप से संदेह पैदा करते हैं, अत्यधिक निराशावाद मुफ़्त नहीं है, क्योंकि जब हर आधिकारिक दावे को धोखा मान लिया जाए तो समाज काम नहीं कर सकते।',
          },
          {
            en: 'Nevertheless, rebuilding trust is possible, though it usually demands sustained transparency and genuine accountability rather than carefully worded apologies and cosmetic reforms.',
            native:
              'फिर भी, विश्वास को दोबारा बनाना संभव है, यद्यपि इसके लिए आमतौर पर सोचे-समझे शब्दों वाली माफ़ी और सतही सुधारों के बजाय निरंतर पारदर्शिता और वास्तविक जवाबदेही चाहिए।',
          },
        ],
      },
      es: {
        word: 'confianza',
        question:
          '¿Por qué ha disminuido la confianza en las instituciones en muchas sociedades, y puede reconstruirse?',
        examples: [
          {
            en: 'It could be argued that trust erodes whenever institutions break promises without consequences, since credibility, once squandered, is notoriously difficult to restore.',
            native:
              'Podría argumentarse que la confianza se erosiona cada vez que las instituciones incumplen promesas sin consecuencias, ya que la credibilidad, una vez dilapidada, es notoriamente difícil de recuperar.',
          },
          {
            en: 'While scandals understandably breed suspicion, excessive cynicism is hardly cost-free, because societies cannot function when every official claim is presumed fraudulent.',
            native:
              'Aunque los escándalos generan comprensiblemente sospechas, el cinismo excesivo no es gratuito, porque las sociedades no pueden funcionar cuando toda afirmación oficial se presume fraudulenta.',
          },
          {
            en: 'Nevertheless, rebuilding trust is possible, though it usually demands sustained transparency and genuine accountability rather than carefully worded apologies and cosmetic reforms.',
            native:
              'Sin embargo, reconstruir la confianza es posible, aunque suele exigir transparencia sostenida y responsabilidad genuina, en lugar de disculpas cuidadosamente redactadas y reformas cosméticas.',
          },
        ],
      },
      zh: {
        word: '信任',
        question: '为什么许多社会对机构的信任下降了，这种信任还能重建吗？',
        examples: [
          {
            en: 'It could be argued that trust erodes whenever institutions break promises without consequences, since credibility, once squandered, is notoriously difficult to restore.',
            native:
              '可以认为，每当机构违背承诺却无需承担后果时，信任就会受到侵蚀，因为信誉一旦挥霍殆尽，便出了名地难以恢复。',
          },
          {
            en: 'While scandals understandably breed suspicion, excessive cynicism is hardly cost-free, because societies cannot function when every official claim is presumed fraudulent.',
            native:
              '尽管丑闻滋生怀疑情有可原，但过度愤世嫉俗并非毫无代价，因为当每一项官方声明都被推定为欺诈时，社会就无法运转。',
          },
          {
            en: 'Nevertheless, rebuilding trust is possible, though it usually demands sustained transparency and genuine accountability rather than carefully worded apologies and cosmetic reforms.',
            native:
              '然而，重建信任是可能的，尽管这通常需要持续的透明度和真正的问责制，而不是措辞谨慎的道歉和表面文章式的改革。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'leadership',
    questionText: 'What qualities distinguish a genuinely good leader from someone who merely holds power?',
    translations: {
      te: {
        word: 'నాయకత్వం',
        question: 'నిజంగా మంచి నాయకుణ్ణి కేవలం అధికారంలో ఉన్నవారి నుండి వేరు చేసే గుణాలు ఏవి?',
        examples: [
          {
            en: 'Although charisma often wins attention, it could be argued that integrity and the willingness to admit mistakes distinguish authentic leadership from mere self-promotion.',
            native:
              'ఆకర్షణీయ వ్యక్తిత్వం తరచుగా దృష్టిని గెలుచుకున్నప్పటికీ, నిజాయితీ మరియు పొరపాట్లను ఒప్పుకునే సిద్ధాంతం ప్రామాణిక నాయకత్వాన్ని కేవలం ఆత్మప్రచారం నుండి వేరు చేస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, decisive authority matters in a crisis; nevertheless, leaders who never consult others tend to confuse obedience with genuine, durable support.',
            native:
              'నిజానికి సంక్షోభ సమయంలో నిర్ణయాత్మక అధికారం ముఖ్యం; అయినప్పటికీ, ఎప్పుడూ ఇతరులను సంప్రదించని నాయకులు విధేయతనూ, నిజమైన శాశ్వత మద్దతునూ గందరగోళం చేస్తారు.',
          },
          {
            en: 'On balance, the finest leaders seem to measure success by what their people achieve after they leave, a standard that vanity projects rarely survive.',
            native:
              'మొత్తానికి, అత్యుత్తమ నాయకులు తాము వెళ్లిపోయిన తర్వాత తమ వ్యక్తులు ఏమి సాధించారనే దానితో విజయాన్ని కొలుస్తారు; అహంకార ప్రాజెక్టులు అరుదుగా దాటగల ప్రమాణం ఇది.',
          },
        ],
      },
      hi: {
        word: 'नेतृत्व',
        question: 'कौन से गुण एक सच्चे अच्छे नेता को महज़ सत्ता धारण करने वाले व्यक्ति से अलग करते हैं?',
        examples: [
          {
            en: 'Although charisma often wins attention, it could be argued that integrity and the willingness to admit mistakes distinguish authentic leadership from mere self-promotion.',
            native:
              'यद्यपि करिश्मा अक्सर ध्यान जीत लेता है, फिर भी यह तर्क दिया जा सकता है कि ईमानदारी और गलतियाँ स्वीकार करने की तैयारी प्रामाणिक नेतृत्व को महज़ आत्म-प्रचार से अलग करती हैं।',
          },
          {
            en: 'Admittedly, decisive authority matters in a crisis; nevertheless, leaders who never consult others tend to confuse obedience with genuine, durable support.',
            native:
              'यह स्वीकार करना होगा कि संकट में निर्णायक अधिकार मायने रखता है; फिर भी, जो नेता कभी दूसरों से सलाह नहीं लेते, वे आज्ञाकारिता और वास्तविक, टिकाऊ समर्थन में भ्रम पैदा करते हैं।',
          },
          {
            en: 'On balance, the finest leaders seem to measure success by what their people achieve after they leave, a standard that vanity projects rarely survive.',
            native:
              'कुल मिलाकर, सर्वश्रेष्ठ नेता अपने जाने के बाद अपने लोगों की उपलब्धियों से सफलता मापते प्रतीत होते हैं—यह मानदंड घमंडी परियोजनाएँ शायद ही कभी पार कर पाती हैं।',
          },
        ],
      },
      es: {
        word: 'liderazgo',
        question:
          '¿Qué cualidades distinguen a un líder genuinamente bueno de alguien que simplemente detenta el poder?',
        examples: [
          {
            en: 'Although charisma often wins attention, it could be argued that integrity and the willingness to admit mistakes distinguish authentic leadership from mere self-promotion.',
            native:
              'Aunque el carisma suele atraer la atención, podría argumentarse que la integridad y la disposición a admitir errores distinguen el liderazgo auténtico de la mera autopromoción.',
          },
          {
            en: 'Admittedly, decisive authority matters in a crisis; nevertheless, leaders who never consult others tend to confuse obedience with genuine, durable support.',
            native:
              'Es cierto que la autoridad decisiva importa en una crisis; sin embargo, los líderes que nunca consultan a los demás tienden a confundir la obediencia con un apoyo genuino y duradero.',
          },
          {
            en: 'On balance, the finest leaders seem to measure success by what their people achieve after they leave, a standard that vanity projects rarely survive.',
            native:
              'En definitiva, los mejores líderes parecen medir el éxito por lo que su gente logra después de que ellos se van, un criterio que los proyectos de vanidad rara vez superan.',
          },
        ],
      },
      zh: {
        word: '领导力',
        question: '哪些品质能把真正优秀的领导者与仅仅掌握权力的人区分开来？',
        examples: [
          {
            en: 'Although charisma often wins attention, it could be argued that integrity and the willingness to admit mistakes distinguish authentic leadership from mere self-promotion.',
            native:
              '尽管个人魅力往往能赢得关注，但可以认为，正直和承认错误的意愿才能将真正的领导力与纯粹的自我推销区分开来。',
          },
          {
            en: 'Admittedly, decisive authority matters in a crisis; nevertheless, leaders who never consult others tend to confuse obedience with genuine, durable support.',
            native:
              '诚然，在危机中果断的权威很重要；然而，从不征求他人意见的领导者往往会把服从与真诚、持久的支持混为一谈。',
          },
          {
            en: 'On balance, the finest leaders seem to measure success by what their people achieve after they leave, a standard that vanity projects rarely survive.',
            native:
              '总体而言，最优秀的领导者似乎以他们离开后下属取得的成就来衡量成功——虚荣的项目很少能经得起这一标准。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'digital footprint',
    questionText: 'Should people be more concerned about the permanent digital footprints they leave online?',
    translations: {
      te: {
        word: 'డిజిటల్ ముద్ర',
        question: 'తాము ఆన్‌లైన్‌లో వదిలే శాశ్వత డిజిటల్ ముద్రల గురించి ప్రజలు మరింత ఆందోళన చెందాలా?',
        examples: [
          {
            en: 'While younger generations treat online sharing casually, it could be argued that data collected today may be judged by standards, employers, and algorithms that do not yet exist.',
            native:
              'యువ తరాలు ఆన్‌లైన్ భాగస్వామ్యాన్ని సాధారణంగా తీసుకున్నప్పటికీ, ఈరోజు సేకరించిన డేటాను ఇంకా లేని ప్రమాణాలు, యజమానులు మరియు అల్గారిథమ్‌ల ద్వారా అంచనా వేయవచ్చని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, deleting accounts feels reassuring; nevertheless, archived copies and screenshots make true erasure largely illusory once information has circulated widely.',
            native:
              'నిజానికి ఖాతాలను తొలగించడం ధైర్యాన్ని ఇస్తుంది; అయినప్పటికీ, సమాచారం విస్తృతంగా ప్రసారమైన తర్వాత ఆర్కైవ్ కాపీలు, స్క్రీన్‌షాట్‌లు నిజమైన తొలగింపును పెద్దగా భ్రమగా మారుస్తాయి.',
          },
          {
            en: "On balance, a degree of caution seems prudent, although living in perpetual fear of one's own shadow would be an unreasonable price for digital participation.",
            native:
              'మొత్తానికి, కొంత జాగ్రత్త వివేకమే అనిపిస్తుంది, అయితే తమ స్వంత నీడ పట్ల శాశ్వత భయంతో జీవించడం డిజిటల్ భాగస్వామ్యానికి అన్యాయమైన ధర అవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'डिजिटल फुटप्रिंट',
        question: 'क्या लोगों को अपने ऑनलाइन छोड़े गए स्थायी डिजिटल फुटप्रिंट को लेकर अधिक चिंतित होना चाहिए?',
        examples: [
          {
            en: 'While younger generations treat online sharing casually, it could be argued that data collected today may be judged by standards, employers, and algorithms that do not yet exist.',
            native:
              'जबकि युवा पीढ़ियाँ ऑनलाइन साझाकरण को बेलगाम मानती हैं, यह तर्क दिया जा सकता है कि आज एकत्रित डेटा का मूल्यांकन उन मानकों, नियोक्ताओं और एल्गोरिदम से हो सकता है जो अभी मौजूद ही नहीं हैं।',
          },
          {
            en: 'Admittedly, deleting accounts feels reassuring; nevertheless, archived copies and screenshots make true erasure largely illusory once information has circulated widely.',
            native:
              'यह स्वीकार करना होगा कि खाते हटाना सुकून देता है; फिर भी, जानकारी के व्यापक रूप से फैलने के बाद संग्रहीत प्रतियाँ और स्क्रीनशॉट सच्चे विलोपन को काफी हद तक भ्रम बना देते हैं।',
          },
          {
            en: "On balance, a degree of caution seems prudent, although living in perpetual fear of one's own shadow would be an unreasonable price for digital participation.",
            native:
              'कुल मिलाकर, कुछ हद तक सावधानी विवेकपूर्ण लगती है, यद्यपि अपनी ही परछाईं से हमेशा डरते रहना डिजिटल भागीदारी की अनुचित कीमत होगी।',
          },
        ],
      },
      es: {
        word: 'huella digital',
        question: '¿Debería preocuparse más la gente por las huellas digitales permanentes que deja en internet?',
        examples: [
          {
            en: 'While younger generations treat online sharing casually, it could be argued that data collected today may be judged by standards, employers, and algorithms that do not yet exist.',
            native:
              'Aunque las generaciones jóvenes tratan con ligereza compartir en línea, podría argumentarse que los datos recopilados hoy podrían ser juzgados por estándares, empleadores y algoritmos que aún no existen.',
          },
          {
            en: 'Admittedly, deleting accounts feels reassuring; nevertheless, archived copies and screenshots make true erasure largely illusory once information has circulated widely.',
            native:
              'Es cierto que eliminar cuentas resulta tranquilizador; sin embargo, las copias archivadas y las capturas de pantalla hacen que el borrado real sea en gran parte ilusorio una vez que la información circula ampliamente.',
          },
          {
            en: "On balance, a degree of caution seems prudent, although living in perpetual fear of one's own shadow would be an unreasonable price for digital participation.",
            native:
              'En definitiva, cierto grado de cautela parece prudente, aunque vivir con miedo perpetuo de la propia sombra sería un precio irrazonable por la participación digital.',
          },
        ],
      },
      zh: {
        word: '数字足迹',
        question: '人们是否应该更加担心自己在网络上留下的永久数字足迹？',
        examples: [
          {
            en: 'While younger generations treat online sharing casually, it could be argued that data collected today may be judged by standards, employers, and algorithms that do not yet exist.',
            native:
              '尽管年轻一代对待网络分享很随意，但可以认为，今天收集的数据可能会被尚不存在的标准、雇主和算法来评判。',
          },
          {
            en: 'Admittedly, deleting accounts feels reassuring; nevertheless, archived copies and screenshots make true erasure largely illusory once information has circulated widely.',
            native:
              '诚然，删除账户让人安心；然而，一旦信息广泛传播，存档副本和截图就使得真正的删除在很大程度上成为幻觉。',
          },
          {
            en: "On balance, a degree of caution seems prudent, although living in perpetual fear of one's own shadow would be an unreasonable price for digital participation.",
            native:
              '总体而言，保持一定程度的谨慎似乎是明智的，尽管永远生活在对自己阴影的恐惧中，将是参与数字生活的不合理代价。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'ageing population',
    questionText: 'How should societies adapt to the economic and social effects of an ageing population?',
    translations: {
      te: {
        word: 'వృద్ధాప్య జనాభా',
        question: 'వృద్ధాప్య జనాభా యొక్క ఆర్థిక, సామాజిక ప్రభావాలకు సమాజాలు ఎలా అనుగుణంగా మారాలి?',
        examples: [
          {
            en: 'While longer lifespans represent a triumph of medicine, it could be argued that pension systems designed for shorter retirements are quietly becoming unsustainable.',
            native:
              'దీర్ఘాయువు వైద్యం విజయాన్ని సూచించినప్పటికీ, తక్కువ పదవీ విరమణల కోసం రూపొందించిన పెన్షన్ వ్యవస్థలు నిశ్శబ్దంగా స్థిరత్వం కోల్పోతున్నాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, raising the retirement age balances budgets; nevertheless, such policies ignore how unevenly physical decline affects manual workers compared with office professionals.',
            native:
              'నిజానికి పదవీ విరమణ వయసును పెంచడం బడ్జెట్లను సమతుల్యం చేస్తుంది; అయినప్పటికీ, శారీరక క్షీణత భౌతిక కార్మికులనూ కార్యాలయ నిపుణులనూ ఎంత అసమానంగా ప్రభావితం చేస్తుందో అలాంటి విధానాలు పట్టించుకోవు.',
          },
          {
            en: 'On balance, ageing societies will need to value older citizens as contributors rather than burdens, although achieving that cultural shift is easier said than done.',
            native:
              'మొత్తానికి, వృద్ధాప్య సమాజాలు వృద్ధ పౌరులను భారాలుగా కాకుండా సహకారులుగా విలువ చేయాలి, అయితే ఆ సాంస్కృతిక మార్పు చెప్పడం కంటే చేయడం కష్టం.',
          },
        ],
      },
      hi: {
        word: 'बूढ़ी आबादी',
        question: 'बूढ़ी होती आबादी के आर्थिक और सामाजिक प्रभावों के अनुकूल समाजों को कैसे ढलना चाहिए?',
        examples: [
          {
            en: 'While longer lifespans represent a triumph of medicine, it could be argued that pension systems designed for shorter retirements are quietly becoming unsustainable.',
            native:
              'जबकि लंबी उम्र चिकित्सा की जीत का प्रतीक है, यह तर्क दिया जा सकता है कि छोटी सेवानिवृत्ति के लिए बनाई गई पेंशन व्यवस्थाएँ चुपचाप अस्थिर होती जा रही हैं।',
          },
          {
            en: 'Admittedly, raising the retirement age balances budgets; nevertheless, such policies ignore how unevenly physical decline affects manual workers compared with office professionals.',
            native:
              'यह स्वीकार करना होगा कि सेवानिवृत्ति की आयु बढ़ाना बजट संतुलित करता है; फिर भी, ऐसी नीतियाँ अनदेखा करती हैं कि शारीरिक क्षय शारीरिक श्रमिकों को कार्यालयीन पेशेवरों की तुलना में कितना असमान रूप से प्रभावित करता है।',
          },
          {
            en: 'On balance, ageing societies will need to value older citizens as contributors rather than burdens, although achieving that cultural shift is easier said than done.',
            native:
              'कुल मिलाकर, बूढ़े समाजों को वरिष्ठ नागरिकों को बोझ के बजाय योगदानकर्ता मानना होगा, यद्यपि यह सांस्कृतिक बदलाव लाना कहने से कहीं कठिन है।',
          },
        ],
      },
      es: {
        word: 'envejecimiento de la población',
        question:
          '¿Cómo deberían adaptarse las sociedades a los efectos económicos y sociales del envejecimiento de la población?',
        examples: [
          {
            en: 'While longer lifespans represent a triumph of medicine, it could be argued that pension systems designed for shorter retirements are quietly becoming unsustainable.',
            native:
              'Aunque una mayor longevidad representa un triunfo de la medicina, podría argumentarse que los sistemas de pensiones diseñados para jubilaciones más cortas se están volviendo silenciosamente insostenibles.',
          },
          {
            en: 'Admittedly, raising the retirement age balances budgets; nevertheless, such policies ignore how unevenly physical decline affects manual workers compared with office professionals.',
            native:
              'Es cierto que elevar la edad de jubilación equilibra los presupuestos; sin embargo, tales políticas ignoran cuán desigualmente afecta el declive físico a los trabajadores manuales frente a los profesionales de oficina.',
          },
          {
            en: 'On balance, ageing societies will need to value older citizens as contributors rather than burdens, although achieving that cultural shift is easier said than done.',
            native:
              'En definitiva, las sociedades envejecidas tendrán que valorar a los ciudadanos mayores como contribuyentes y no como cargas, aunque lograr ese cambio cultural es más fácil de decir que de hacer.',
          },
        ],
      },
      zh: {
        word: '人口老龄化',
        question: '社会应如何适应人口老龄化带来的经济和社会影响？',
        examples: [
          {
            en: 'While longer lifespans represent a triumph of medicine, it could be argued that pension systems designed for shorter retirements are quietly becoming unsustainable.',
            native: '尽管寿命延长代表了医学的胜利，但可以认为，为较短退休期设计的养老金体系正在悄然变得不可持续。',
          },
          {
            en: 'Admittedly, raising the retirement age balances budgets; nevertheless, such policies ignore how unevenly physical decline affects manual workers compared with office professionals.',
            native:
              '诚然，提高退休年龄可以平衡预算；然而，这类政策忽视了体力衰退对体力劳动者与办公室专业人士的影响是多么不均等。',
          },
          {
            en: 'On balance, ageing societies will need to value older citizens as contributors rather than burdens, although achieving that cultural shift is easier said than done.',
            native: '总体而言，老龄化社会需要把老年公民视为贡献者而非负担，尽管实现这种文化转变知易行难。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'censorship',
    questionText: 'Under what circumstances, if any, is censorship justified in a free society?',
    translations: {
      te: {
        word: 'సెన్సార్‌షిప్',
        question: 'స్వేచ్ఛాయుత సమాజంలో ఏ పరిస్థితుల్లోనైనా సెన్సార్‌షిప్ సమర్థనీయమా?',
        examples: [
          {
            en: 'While few endorse censorship in principle, it could be argued that incitement to violence crosses a line where unrestricted expression begins to destroy the rights of others.',
            native:
              'సూత్రప్రాయంగా సెన్సార్‌షిప్‌ను తక్కువ మందే ఆమోదిస్తారేమో కానీ, హింసకు ఉసిగొల్పడం నిరాంక్ష వ్యక్తీకరణ ఇతరుల హక్కులను ధ్వంసం చేయడం ప్రారంభించే సరిహద్దును దాటుతుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, governments habitually invoke public safety to silence critics; nevertheless, the absence of any limits at all would leave the vulnerable exposed to coordinated harassment.',
            native:
              'నిజానికి ప్రభుత్వాలు విమర్శకులను మౌనపరచడానికి అలవాటుగా ప్రజా భద్రతను ప్రస్తావిస్తాయి; అయినప్పటికీ, ఎటువంటి పరిమితులూ లేకపోవడం బలహీనులను సంయుక్త వేధింపులకు గురి చేస్తుంది.',
          },
          {
            en: 'On balance, censorship seems defensible only when it is narrow, transparent, and reversible, since power granted temporarily has a notorious tendency to become permanent.',
            native:
              'మొత్తానికి, సెన్సార్‌షిప్ పరిమితంగా, పారదర్శకంగా, రద్దు చేయగలిగినట్టుగా ఉన్నప్పుడే సమర్థనీయంగా ఉంటుంది, ఎందుకంటే తాత్కాలికంగా ఇచ్చిన అధికారం శాశ్వతమవ్వడానికి ప్రసిద్ధ ధోరణి కలది.',
          },
        ],
      },
      hi: {
        word: 'सेंसरशिप',
        question: 'स्वतंत्र समाज में किन परिस्थितियों में, यदि कोई हों, सेंसरशिप उचित है?',
        examples: [
          {
            en: 'While few endorse censorship in principle, it could be argued that incitement to violence crosses a line where unrestricted expression begins to destroy the rights of others.',
            native:
              'जबकि सिद्धांततः सेंसरशिप का समर्थन बहुत कम लोग करते हैं, यह तर्क दिया जा सकता है कि हिंसा के लिए उकसाना उस सीमा को पार करता है जहाँ अप्रतिबंध अभिव्यक्ति दूसरों के अधिकारों को नष्ट करने लगती है।',
          },
          {
            en: 'Admittedly, governments habitually invoke public safety to silence critics; nevertheless, the absence of any limits at all would leave the vulnerable exposed to coordinated harassment.',
            native:
              'यह स्वीकार करना होगा कि सरकारें आलोचकों को चुप कराने के लिए आदतन जनसुरक्षा का हवाला देती हैं; फिर भी, किसी भी सीमा के बिल्कुल न होने से कमज़ोर लोग संगठित उत्पीड़न के शिकार होंगे।',
          },
          {
            en: 'On balance, censorship seems defensible only when it is narrow, transparent, and reversible, since power granted temporarily has a notorious tendency to become permanent.',
            native:
              'कुल मिलाकर, सेंसरशिप तभी बचावयोग्य लगती है जब वह संकीर्ण, पारदर्शी और उलटने योग्य हो, क्योंकि अस्थायी रूप से दी गई शक्ति स्थायी बनने की कुख्यात प्रवृत्ति रखती है।',
          },
        ],
      },
      es: {
        word: 'censura',
        question: '¿En qué circunstancias, si es que en alguna, se justifica la censura en una sociedad libre?',
        examples: [
          {
            en: 'While few endorse censorship in principle, it could be argued that incitement to violence crosses a line where unrestricted expression begins to destroy the rights of others.',
            native:
              'Aunque pocos respaldan la censura en principio, podría argumentarse que la incitación a la violencia cruza una línea donde la expresión sin restricciones empieza a destruir los derechos de los demás.',
          },
          {
            en: 'Admittedly, governments habitually invoke public safety to silence critics; nevertheless, the absence of any limits at all would leave the vulnerable exposed to coordinated harassment.',
            native:
              'Es cierto que los gobiernos invocan habitualmente la seguridad pública para silenciar a los críticos; sin embargo, la ausencia total de límites dejaría a los vulnerables expuestos al acoso coordinado.',
          },
          {
            en: 'On balance, censorship seems defensible only when it is narrow, transparent, and reversible, since power granted temporarily has a notorious tendency to become permanent.',
            native:
              'En definitiva, la censura solo parece defendible cuando es estrecha, transparente y reversible, ya que el poder concedido temporalmente tiene una notoria tendencia a volverse permanente.',
          },
        ],
      },
      zh: {
        word: '审查制度',
        question: '在自由社会中，审查制度在何种情况下（如果有的话）是正当的？',
        examples: [
          {
            en: 'While few endorse censorship in principle, it could be argued that incitement to violence crosses a line where unrestricted expression begins to destroy the rights of others.',
            native:
              '尽管原则上很少有人赞同审查，但可以认为，煽动暴力越过了一条界线——在那里，不受限制的表达开始摧毁他人的权利。',
          },
          {
            en: 'Admittedly, governments habitually invoke public safety to silence critics; nevertheless, the absence of any limits at all would leave the vulnerable exposed to coordinated harassment.',
            native:
              '诚然，政府惯常以公共安全为借口让批评者噤声；然而，完全没有任何限制会让弱势群体暴露于有组织的骚扰之中。',
          },
          {
            en: 'On balance, censorship seems defensible only when it is narrow, transparent, and reversible, since power granted temporarily has a notorious tendency to become permanent.',
            native:
              '总体而言，审查只有在范围狭窄、透明且可撤销时似乎才是可辩护的，因为临时授予的权力出了名地容易变成永久。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'surveillance',
    questionText: 'Does mass surveillance make us safer, or does it undermine the freedoms it claims to protect?',
    translations: {
      te: {
        word: 'నిఘా',
        question:
          'సమూహ నిఘా మనల్ని సురక్షితంగా చేస్తుందా, లేక తాను రక్షిస్తున్నట్టు చెప్పుకునే స్వేచ్ఛలను బలహీనపరుస్తుందా?',
        examples: [
          {
            en: 'While governments insist surveillance prevents attacks, it could be argued that the evidence for such claims remains surprisingly thin relative to the powers accumulated.',
            native:
              'ప్రభుత్వాలు నిఘా దాడులను నివారిస్తుందని పట్టుబట్టినప్పటికీ, పేరుకుపోయిన అధికారాలతో పోలిస్తే అలాంటి వాదనలకు సాక్ష్యాలు ఆశ్చర్యకరంగా పలుచగా ఉన్నాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, most people feel they have nothing to hide; nevertheless, constant monitoring demonstrably chills dissent, journalism, and even private conversation among ordinary citizens.',
            native:
              'నిజానికి చాలామందికి దాచడానికి ఏమీ లేదనిపిస్తుంది; అయినప్పటికీ, నిరంతర పర్యవేక్షణ అసమ్మతిని, జర్నలిజాన్ని, సామాన్య పౌరుల వ్యక్తిగత సంభాషణలను కూడా నిరుత్సాహపరుస్తుందని స్పష్టంగా తెలుస్తుంది.',
          },
          {
            en: 'On balance, security gained through surveillance seems fragile when it erodes the trust and openness that genuinely keep societies stable over the long term.',
            native:
              'మొత్తానికి, నిఘా ద్వారా వచ్చే భద్రత, సమాజాలను దీర్ఘకాలం స్థిరంగా ఉంచే నమ్మకాన్నీ వెల్లడి స్వభావాన్నీ క్షయపరిచినప్పుడు పెళుసుగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'निगरानी',
        question:
          'क्या सामूहिक निगरानी हमें सुरक्षित बनाती है, या वह उन्हीं स्वतंत्रताओं को कमज़ोर करती है जिनकी रक्षा का दावा करती है?',
        examples: [
          {
            en: 'While governments insist surveillance prevents attacks, it could be argued that the evidence for such claims remains surprisingly thin relative to the powers accumulated.',
            native:
              'जबकि सरकारें ज़ोर देती हैं कि निगरानी हमलों को रोकती है, यह तर्क दिया जा सकता है कि जुटाई गई शक्तियों की तुलना में ऐसे दावों का प्रमाण आश्चर्यजनक रूप से कमज़ोर है।',
          },
          {
            en: 'Admittedly, most people feel they have nothing to hide; nevertheless, constant monitoring demonstrably chills dissent, journalism, and even private conversation among ordinary citizens.',
            native:
              'यह स्वीकार करना होगा कि अधिकांश लोग सोचते हैं कि उन्हें छिपाने को कुछ नहीं है; फिर भी, निरंतर नज़र असहमति, पत्रकारिता और आम नागरिकों की निजी बातचीत को भी प्रदर्शनात्मक रूप से ठंडा कर देती है।',
          },
          {
            en: 'On balance, security gained through surveillance seems fragile when it erodes the trust and openness that genuinely keep societies stable over the long term.',
            native:
              'कुल मिलाकर, निगरानी से मिली सुरक्षा भंगुर लगती है जब वह उस विश्वास और खुलेपन को क्षय करती है जो वास्तव में समाजों को दीर्घकाल तक स्थिर रखते हैं।',
          },
        ],
      },
      es: {
        word: 'vigilancia',
        question: '¿Nos hace más seguros la vigilancia masiva, o socava las libertades que dice proteger?',
        examples: [
          {
            en: 'While governments insist surveillance prevents attacks, it could be argued that the evidence for such claims remains surprisingly thin relative to the powers accumulated.',
            native:
              'Aunque los gobiernos insisten en que la vigilancia previene ataques, podría argumentarse que la evidencia de tales afirmaciones sigue siendo sorprendentemente escasa en relación con los poderes acumulados.',
          },
          {
            en: 'Admittedly, most people feel they have nothing to hide; nevertheless, constant monitoring demonstrably chills dissent, journalism, and even private conversation among ordinary citizens.',
            native:
              'Es cierto que la mayoría siente que no tiene nada que ocultar; sin embargo, la monitorización constante enfría demostrablemente la disidencia, el periodismo e incluso la conversación privada de los ciudadanos.',
          },
          {
            en: 'On balance, security gained through surveillance seems fragile when it erodes the trust and openness that genuinely keep societies stable over the long term.',
            native:
              'En definitiva, la seguridad obtenida mediante la vigilancia parece frágil cuando erosiona la confianza y la apertura que realmente mantienen estables a las sociedades a largo plazo.',
          },
        ],
      },
      zh: {
        word: '监控',
        question: '大规模监控让我们更安全，还是破坏了它声称要保护的自由？',
        examples: [
          {
            en: 'While governments insist surveillance prevents attacks, it could be argued that the evidence for such claims remains surprisingly thin relative to the powers accumulated.',
            native: '尽管政府坚称监控能防止袭击，但可以认为，与所积累的权力相比，此类说法的证据少得令人惊讶。',
          },
          {
            en: 'Admittedly, most people feel they have nothing to hide; nevertheless, constant monitoring demonstrably chills dissent, journalism, and even private conversation among ordinary citizens.',
            native:
              '诚然，大多数人觉得自己没有什么可隐瞒的；然而，持续的监控明显抑制了异见、新闻工作，甚至普通公民的私人交谈。',
          },
          {
            en: 'On balance, security gained through surveillance seems fragile when it erodes the trust and openness that genuinely keep societies stable over the long term.',
            native: '总体而言，通过监控获得的安全似乎是脆弱的，因为它侵蚀了真正让社会长期保持稳定的信任与开放。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'capitalism',
    questionText: 'Does capitalism reward hard work fairly, or does it mainly benefit those who already own wealth?',
    translations: {
      te: {
        word: 'మూలధనవాదం',
        question:
          'మూలధనవాదం కష్టపడేవారికి న్యాయమైన ప్రతిఫలం ఇస్తుందా, లేక ఇప్పటికే సంపద ఉన్నవారికే ప్రధానంగా ప్రయోజనం చేకూరుస్తుందా?',
        examples: [
          {
            en: 'While capitalism has lifted millions out of poverty, it could be argued that its rewards flow disproportionately to owners of capital rather than creators of value.',
            native:
              'మూలధనవాదం కోట్లాదిమందిని పేదరికం నుండి బయటపడేసినప్పటికీ, దాని ప్రతిఫలాలు విలువను సృష్టించేవారి కంటే మూలధన యజమానులకు అసమానంగా ప్రవహిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, competition drives efficiency and innovation; nevertheless, without regulation, markets tend to concentrate power in ways that eventually undermine competition itself.',
            native:
              'నిజానికి పోటీ సామర్థ్యాన్నీ ఆవిష్కరణలనూ నడిపిస్తుంది; అయినప్పటికీ, నియంత్రణ లేకుంటే మార్కెట్లు చివరికి పోటీనే బలహీనపరిచే విధంగా అధికారాన్ని కేంద్రీకరిస్తాయి.',
          },
          {
            en: 'On balance, the system seems excellent at generating wealth yet considerably less reliable at distributing it, which explains why debates about fairness never quite disappear.',
            native:
              'మొత్తానికి, ఈ వ్యవస్థ సంపదను సృష్టించడంలో అద్భుతమైనప్పటికీ దాన్ని పంపిణీ చేయడంలో చాలా తక్కువ నమ్మదగినది; న్యాయం గురించిన చర్చలు ఎందుకు అంతిపోవో ఇది వివరిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'पूँजीवाद',
        question:
          'क्या पूँजीवाद मेहनत का उचित फल देता है, या यह मुख्य रूप से उन्हीं को लाभ पहुँचाता है जिनके पास पहले से धन है?',
        examples: [
          {
            en: 'While capitalism has lifted millions out of poverty, it could be argued that its rewards flow disproportionately to owners of capital rather than creators of value.',
            native:
              'जबकि पूँजीवाद ने लाखों लोगों को गरीबी से बाहर निकाला है, यह तर्क दिया जा सकता है कि इसके पुरस्कार मूल्य रचने वालों की तुलना में पूँजी के मालिकों को असमानुपातिक रूप से मिलते हैं।',
          },
          {
            en: 'Admittedly, competition drives efficiency and innovation; nevertheless, without regulation, markets tend to concentrate power in ways that eventually undermine competition itself.',
            native:
              'यह स्वीकार करना होगा कि प्रतिस्पर्धा दक्षता और नवाचार चलाती है; फिर भी, विनियमन के बिना, बाज़ार शक्ति को ऐसे तरीकों से केंद्रित करते हैं जो अंततः स्वयं प्रतिस्पर्धा को ही कमज़ोर कर देते हैं।',
          },
          {
            en: 'On balance, the system seems excellent at generating wealth yet considerably less reliable at distributing it, which explains why debates about fairness never quite disappear.',
            native:
              'कुल मिलाकर, यह व्यवस्था धन पैदा करने में उत्कृष्ट लगती है, परंतु उसे बाँटने में काफी कम विश्वसनीय—यही कारण है कि न्याय पर बहस कभी पूरी तरह खत्म नहीं होती।',
          },
        ],
      },
      es: {
        word: 'capitalismo',
        question:
          '¿Recompensa el capitalismo el trabajo duro con justicia, o beneficia principalmente a quienes ya poseen riqueza?',
        examples: [
          {
            en: 'While capitalism has lifted millions out of poverty, it could be argued that its rewards flow disproportionately to owners of capital rather than creators of value.',
            native:
              'Aunque el capitalismo ha sacado a millones de la pobreza, podría argumentarse que sus recompensas fluyen desproporcionadamente hacia los dueños del capital más que hacia los creadores de valor.',
          },
          {
            en: 'Admittedly, competition drives efficiency and innovation; nevertheless, without regulation, markets tend to concentrate power in ways that eventually undermine competition itself.',
            native:
              'Es cierto que la competencia impulsa la eficiencia y la innovación; sin embargo, sin regulación, los mercados tienden a concentrar el poder de maneras que acaban socavando la propia competencia.',
          },
          {
            en: 'On balance, the system seems excellent at generating wealth yet considerably less reliable at distributing it, which explains why debates about fairness never quite disappear.',
            native:
              'En definitiva, el sistema parece excelente generando riqueza, pero considerablemente menos fiable distribuyéndola, lo que explica por qué los debates sobre la equidad nunca desaparecen del todo.',
          },
        ],
      },
      zh: {
        word: '资本主义',
        question: '资本主义是否公平地回报辛勤劳动，还是主要让已经拥有财富的人受益？',
        examples: [
          {
            en: 'While capitalism has lifted millions out of poverty, it could be argued that its rewards flow disproportionately to owners of capital rather than creators of value.',
            native: '尽管资本主义使数百万人摆脱了贫困，但可以认为，其回报不成比例地流向资本所有者，而非价值创造者。',
          },
          {
            en: 'Admittedly, competition drives efficiency and innovation; nevertheless, without regulation, markets tend to concentrate power in ways that eventually undermine competition itself.',
            native: '诚然，竞争推动了效率和创新；然而，缺乏监管时，市场往往会以最终削弱竞争本身的方式集中权力。',
          },
          {
            en: 'On balance, the system seems excellent at generating wealth yet considerably less reliable at distributing it, which explains why debates about fairness never quite disappear.',
            native:
              '总体而言，这个体系在创造财富方面似乎很出色，但在分配财富方面却远不那么可靠——这解释了为什么关于公平的争论从未真正消失。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'meritocracy',
    questionText: 'Is meritocracy a fair ideal, or does it disguise the advantages people are born with?',
    translations: {
      te: {
        word: 'ప్రతిభావాదం',
        question: 'ప్రతిభావాదం న్యాయమైన ఆదర్శమా, లేక ప్రజలు పుట్టుకతో పొందే అనుకూలతలను కప్పిపుచ్చేదేనా?',
        examples: [
          {
            en: 'While rewarding talent sounds obviously just, it could be argued that merit itself is largely a product of fortunate circumstances few recipients care to acknowledge.',
            native:
              'ప్రతిభకు ప్రతిఫలం ఇవ్వడం స్పష్టంగా న్యాయంగా అనిపించినప్పటికీ, ప్రతిభ అనేది పెద్దగా అదృష్ట పరిస్థితుల ఉత్పత్తి అని చెప్పవచ్చు; దీన్ని పొందినవారు అరుదుగా అంగీకరిస్తారు.',
          },
          {
            en: 'Admittedly, meritocratic competition outperforms nepotism and inherited privilege; nevertheless, winners in such systems often develop a corrosive contempt for those who fail.',
            native:
              'నిజానికి ప్రతిభాధారిత పోటీ స్వజనపక్షపాతం, వంశపారంపర్య ప్రాబల్యం కంటే మెరుగ్గా ఉంటుంది; అయినప్పటికీ, అలాంటి వ్యవస్థల్లో విజేతలు తరచుగా ఓడిపోయినవారి పట్ల తీవ్రమైన తృణీకారాన్ని పెంచుకుంటారు.',
          },
          {
            en: 'On balance, meritocracy seems defensible only when genuine equality of opportunity exists beforehand, a condition that most societies proclaim far more readily than they achieve.',
            native:
              'మొత్తానికి, సమాన అవకాశం ముందుగా నిజంగా ఉన్నప్పుడే ప్రతిభావాదం సమర్థనీయంగా ఉంటుంది; చాలా సమాజాలు సాధించడం కంటే ప్రకటించడానికే ఎక్కువగా ఇష్టపడే షరతు ఇది.',
          },
        ],
      },
      hi: {
        word: 'प्रतिभावाद',
        question:
          'क्या प्रतिभावाद एक न्यायपूर्ण आदर्श है, या यह उन सुविधाओं को छिपाता है जो लोगों को जन्म से मिलती हैं?',
        examples: [
          {
            en: 'While rewarding talent sounds obviously just, it could be argued that merit itself is largely a product of fortunate circumstances few recipients care to acknowledge.',
            native:
              'जबकि प्रतिभा को पुरस्कृत करना स्पष्ट रूप से न्यायोचित लगता है, यह तर्क दिया जा सकता है कि प्रतिभा स्वयं काफी हद तक भाग्यशाली परिस्थितियों का उत्पाद है, जिसे प्राप्तकर्ता शायद ही स्वीकार करते हैं।',
          },
          {
            en: 'Admittedly, meritocratic competition outperforms nepotism and inherited privilege; nevertheless, winners in such systems often develop a corrosive contempt for those who fail.',
            native:
              'यह स्वीकार करना होगा कि प्रतिभावादी प्रतिस्पर्धा भाई-भतीजावाद और विरासत के विशेषाधिकार से बेहतर है; फिर भी, ऐसी व्यवस्थाओं के विजेता अक्सर असफल लोगों के प्रति विनाशकारी तिरस्कार विकसित कर लेते हैं।',
          },
          {
            en: 'On balance, meritocracy seems defensible only when genuine equality of opportunity exists beforehand, a condition that most societies proclaim far more readily than they achieve.',
            native:
              'कुल मिलाकर, प्रतिभावाद तभी बचावयोग्य लगता है जब पहले से अवसर की वास्तविक समानता मौजूद हो—यह शर्त अधिकांश समाज प्राप्त करने से कहीं अधिक आसानी से घोषित करते हैं।',
          },
        ],
      },
      es: {
        word: 'meritocracia',
        question: '¿Es la meritocracia un ideal justo, o disimula las ventajas con las que nacen las personas?',
        examples: [
          {
            en: 'While rewarding talent sounds obviously just, it could be argued that merit itself is largely a product of fortunate circumstances few recipients care to acknowledge.',
            native:
              'Aunque recompensar el talento suena obviamente justo, podría argumentarse que el mérito mismo es en gran parte producto de circunstancias afortunadas que pocos beneficiarios se dignan reconocer.',
          },
          {
            en: 'Admittedly, meritocratic competition outperforms nepotism and inherited privilege; nevertheless, winners in such systems often develop a corrosive contempt for those who fail.',
            native:
              'Es cierto que la competencia meritocrática supera al nepotismo y al privilegio heredado; sin embargo, los ganadores de tales sistemas a menudo desarrollan un desprecio corrosivo hacia quienes fracasan.',
          },
          {
            en: 'On balance, meritocracy seems defensible only when genuine equality of opportunity exists beforehand, a condition that most societies proclaim far more readily than they achieve.',
            native:
              'En definitiva, la meritocracia solo parece defendible cuando existe de antemano una igualdad de oportunidades genuina, condición que la mayoría de las sociedades proclaman con mucha más facilidad de la que la alcanzan.',
          },
        ],
      },
      zh: {
        word: '精英制度',
        question: '精英制度是公平的理想，还是掩盖了人们与生俱来的优势？',
        examples: [
          {
            en: 'While rewarding talent sounds obviously just, it could be argued that merit itself is largely a product of fortunate circumstances few recipients care to acknowledge.',
            native:
              '尽管奖励才能听起来显然很公正，但可以认为，功绩本身在很大程度上是幸运环境的产物，而受益者很少愿意承认这一点。',
          },
          {
            en: 'Admittedly, meritocratic competition outperforms nepotism and inherited privilege; nevertheless, winners in such systems often develop a corrosive contempt for those who fail.',
            native:
              '诚然，精英式竞争胜过任人唯亲和世袭特权；然而，这类制度中的赢家往往会对失败者滋生一种腐蚀性的蔑视。',
          },
          {
            en: 'On balance, meritocracy seems defensible only when genuine equality of opportunity exists beforehand, a condition that most societies proclaim far more readily than they achieve.',
            native:
              '总体而言，只有当真正的机会平等事先存在时，精英制度似乎才是可辩护的——而大多数社会对这一条件的宣扬远比其实现要容易得多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'bureaucracy',
    questionText: 'Is bureaucracy a necessary evil, or does it do more harm than good?',
    translations: {
      te: {
        word: 'అధికారతంత్రం',
        question: 'అధికారతంత్రం అనివార్యమైన కీడా, లేక మేలు కంటే కీడే ఎక్కువ చేస్తుందా?',
        examples: [
          {
            en: 'While bureaucracy frustrates almost everyone who encounters it, it could be argued that predictable rules protect citizens far better than the whims of officials.',
            native:
              'అధికారతంత్రం దాన్ని ఎదుర్కొనే దాదాపు ప్రతివారిని విసిగించినప్పటికీ, అధికారుల ఉత్పాటాల కంటే ముందుగా చెప్పగల నియమాలు పౌరులను చాలా బాగా రక్షిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, excessive procedures waste time and stifle initiative; nevertheless, the alternative, arbitrary personal discretion, has historically proven considerably more corrupt and unjust.',
            native:
              'నిజానికి అతిగా విధానాలు సమయాన్ని వృథా చేసి చొరవను కుదించేస్తాయి; అయినప్పటికీ, ప్రత్యామ్నాయమైన అనియంత్ర వ్యక్తిగత వివేచన చారిత్రకంగా చాలా అవినీతిపరంగా, అన్యాయంగా నిరూపితమైంది.',
          },
          {
            en: 'On balance, bureaucracy resembles an immune system: indispensable in moderation, yet capable of attacking the very organism it exists to defend when it grows unchecked.',
            native:
              'మొత్తానికి, అధికారతంత్రం రోగనిరోధక వ్యవస్థలాంటిది: మితంగా ఉంటే అత్యవసరం, అయితే అదుపుతప్పి పెరిగితే తాను రక్షించాల్సిన జీవినే దాడి చేయగలదు.',
          },
        ],
      },
      hi: {
        word: 'नौकरशाही',
        question: 'क्या नौकरशाही एक आवश्यक बुराई है, या यह भलाई से अधिक नुकसान करती है?',
        examples: [
          {
            en: 'While bureaucracy frustrates almost everyone who encounters it, it could be argued that predictable rules protect citizens far better than the whims of officials.',
            native:
              'जबकि नौकरशाही इससे जुड़ने वाले लगभग हर व्यक्ति को परेशान करती है, यह तर्क दिया जा सकता है कि अनुमानित नियम अधिकारियों की मनमानी की तुलना में नागरिकों की कहीं बेहतर रक्षा करते हैं।',
          },
          {
            en: 'Admittedly, excessive procedures waste time and stifle initiative; nevertheless, the alternative, arbitrary personal discretion, has historically proven considerably more corrupt and unjust.',
            native:
              'यह स्वीकार करना होगा कि अत्यधिक प्रक्रियाएँ समय बर्बाद करती हैं और पहल को दबाती हैं; फिर भी, विकल्प—मनमाना व्यक्तिगत विवेक—ऐतिहासिक रूप से काफी अधिक भ्रष्ट और अनुचित सिद्ध हुआ है।',
          },
          {
            en: 'On balance, bureaucracy resembles an immune system: indispensable in moderation, yet capable of attacking the very organism it exists to defend when it grows unchecked.',
            native:
              'कुल मिलाकर, नौकरशाही प्रतिरक्षा प्रणाली जैसी है: संयम में अपरिहार्य, फिर भी अनियंत्रित बढ़ने पर उसी शरीर पर हमला करने में सक्षम जिसकी रक्षा के लिए वह मौजूद है।',
          },
        ],
      },
      es: {
        word: 'burocracia',
        question: '¿Es la burocracia un mal necesario, o causa más daño que beneficio?',
        examples: [
          {
            en: 'While bureaucracy frustrates almost everyone who encounters it, it could be argued that predictable rules protect citizens far better than the whims of officials.',
            native:
              'Aunque la burocracia frustra a casi todo el que la encuentra, podría argumentarse que las reglas predecibles protegen a los ciudadanos mucho mejor que los caprichos de los funcionarios.',
          },
          {
            en: 'Admittedly, excessive procedures waste time and stifle initiative; nevertheless, the alternative, arbitrary personal discretion, has historically proven considerably more corrupt and unjust.',
            native:
              'Es cierto que los trámites excesivos desperdician tiempo y ahogan la iniciativa; sin embargo, la alternativa, la discreción personal arbitraria, ha demostrado históricamente ser considerablemente más corrupta e injusta.',
          },
          {
            en: 'On balance, bureaucracy resembles an immune system: indispensable in moderation, yet capable of attacking the very organism it exists to defend when it grows unchecked.',
            native:
              'En definitiva, la burocracia se parece a un sistema inmunitario: indispensable con moderación, pero capaz de atacar al propio organismo que existe para defender cuando crece sin control.',
          },
        ],
      },
      zh: {
        word: '官僚体制',
        question: '官僚体制是必要的恶，还是弊大于利？',
        examples: [
          {
            en: 'While bureaucracy frustrates almost everyone who encounters it, it could be argued that predictable rules protect citizens far better than the whims of officials.',
            native:
              '尽管官僚体制让几乎每个接触它的人都感到沮丧，但可以认为，可预测的规则比官员的心血来潮更能保护公民。',
          },
          {
            en: 'Admittedly, excessive procedures waste time and stifle initiative; nevertheless, the alternative, arbitrary personal discretion, has historically proven considerably more corrupt and unjust.',
            native:
              '诚然，繁琐的程序浪费时间并扼杀主动性；然而，其替代方案——任意的个人裁量——在历史上被证明要腐败和不公得多。',
          },
          {
            en: 'On balance, bureaucracy resembles an immune system: indispensable in moderation, yet capable of attacking the very organism it exists to defend when it grows unchecked.',
            native: '总体而言，官僚体制就像免疫系统：适度时不可或缺，但一旦失控增长，就可能攻击它本应保卫的机体本身。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'corruption',
    questionText: 'Why does corruption persist even in wealthy, well-educated societies?',
    translations: {
      te: {
        word: 'అవినీతి',
        question: 'ధనవంతులైన, బాగా చదువుకున్న సమాజాల్లోనూ అవినీతి ఎందుకు కొనసాగుతుంది?',
        examples: [
          {
            en: 'While poverty clearly aggravates corruption, it could be argued that affluent societies simply refine it into lobbying, revolving doors, and technically legal favours.',
            native:
              'పేదరికం అవినీతిని స్పష్టంగా తీవ్రతరం చేసినప్పటికీ, సంపన్న సమాజాలు దాన్ని లాబ్బింగ్, రివాల్వింగ్ డోర్లు మరియు సాంకేతికంగా చట్టబద్ధమైన ఉపకారాలుగా మెరుగుపరుస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, strong institutions deter the crudest forms of bribery; nevertheless, wherever discretion meets opportunity and weak oversight, temptation reliably reappears.',
            native:
              'నిజానికి బలమైన సంస్థలు అత్యంత స్థూలమైన లంచాలను నివారిస్తాయి; అయినప్పటికీ, వివేచన అవకాశంతోనూ బలహీన పర్యవేక్షణతోనూ కలిసిన చోటు ప్రలోభం తప్పక తిరిగి వస్తుంది.',
          },
          {
            en: 'On balance, corruption persists less because people are inherently dishonest than because systems quietly reward it, which suggests reform must target incentives rather than morals.',
            native:
              'మొత్తానికి, ప్రజలు స్వభావతః అసాధువులు కాబట్టి కాదు, వ్యవస్థలు నిశ్శబ్దంగా అవినీతిని ప్రతిఫలం ఇచ్చేందువల్ల అది కొనసాగుతుంది; సంస్కరణలు నైతికత కంటే ప్రోత్సాహకాలను లక్ష్యంగా చేసుకోవాలని ఇది సూచిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'भ्रष्टाचार',
        question: 'धनवान और सुशिक्षित समाजों में भी भ्रष्टाचार क्यों बना रहता है?',
        examples: [
          {
            en: 'While poverty clearly aggravates corruption, it could be argued that affluent societies simply refine it into lobbying, revolving doors, and technically legal favours.',
            native:
              'जबकि गरीबी स्पष्ट रूप से भ्रष्टाचार को बढ़ाती है, यह तर्क दिया जा सकता है कि समृद्ध समाज इसे बस लॉबिंग, रिवॉल्विंग दरवाज़ों और तकनीकी रूप से कानूनी एहसानों में परिष्कृत कर देते हैं।',
          },
          {
            en: 'Admittedly, strong institutions deter the crudest forms of bribery; nevertheless, wherever discretion meets opportunity and weak oversight, temptation reliably reappears.',
            native:
              'यह स्वीकार करना होगा कि मज़बूत संस्थाएँ रिश्वत के सबसे क्रूर रूपों को रोकती हैं; फिर भी, जहाँ भी विवेक, अवसर और कमज़ोर निगरानी मिलते हैं, प्रलोभन विश्वसनीय रूप से लौट आता है।',
          },
          {
            en: 'On balance, corruption persists less because people are inherently dishonest than because systems quietly reward it, which suggests reform must target incentives rather than morals.',
            native:
              'कुल मिलाकर, भ्रष्टाचार इसलिए कम बना रहता है कि लोग स्वभावतः बेईमान हैं, बल्कि इसलिए अधिक कि व्यवस्थाएँ चुपचाप उसे पुरस्कृत करती हैं—इससे पता चलता है कि सुधार को नैतिकता के बजाय प्रोत्साहनों को लक्ष्य करना चाहिए।',
          },
        ],
      },
      es: {
        word: 'corrupción',
        question: '¿Por qué persiste la corrupción incluso en sociedades ricas y bien educadas?',
        examples: [
          {
            en: 'While poverty clearly aggravates corruption, it could be argued that affluent societies simply refine it into lobbying, revolving doors, and technically legal favours.',
            native:
              'Aunque la pobreza claramente agrava la corrupción, podría argumentarse que las sociedades afluentes simplemente la refinan en forma de grupos de presión, puertas giratorias y favores técnicamente legales.',
          },
          {
            en: 'Admittedly, strong institutions deter the crudest forms of bribery; nevertheless, wherever discretion meets opportunity and weak oversight, temptation reliably reappears.',
            native:
              'Es cierto que las instituciones fuertes disuaden las formas más crudas de soborno; sin embargo, dondequiera que la discreción coincide con la oportunidad y una supervisión débil, la tentación reaparece infaliblemente.',
          },
          {
            en: 'On balance, corruption persists less because people are inherently dishonest than because systems quietly reward it, which suggests reform must target incentives rather than morals.',
            native:
              'En definitiva, la corrupción persiste menos porque la gente sea intrínsecamente deshonesta que porque los sistemas la recompensan silenciosamente, lo que sugiere que la reforma debe apuntar a los incentivos y no a la moral.',
          },
        ],
      },
      zh: {
        word: '腐败',
        question: '为什么腐败即使在富裕、教育良好的社会中也依然存在？',
        examples: [
          {
            en: 'While poverty clearly aggravates corruption, it could be argued that affluent societies simply refine it into lobbying, revolving doors, and technically legal favours.',
            native: '尽管贫困显然会加剧腐败，但可以认为，富裕社会只是把它提炼成了游说、旋转门和技术上合法的恩惠。',
          },
          {
            en: 'Admittedly, strong institutions deter the crudest forms of bribery; nevertheless, wherever discretion meets opportunity and weak oversight, temptation reliably reappears.',
            native:
              '诚然，强大的机构能遏制最粗劣的贿赂形式；然而，凡裁量权遇上机会且监督薄弱之处，诱惑总会可靠地重现。',
          },
          {
            en: 'On balance, corruption persists less because people are inherently dishonest than because systems quietly reward it, which suggests reform must target incentives rather than morals.',
            native:
              '总体而言，腐败之所以持续，与其说是因为人们天生不诚实，不如说是因为制度在悄然奖励它——这表明改革必须针对激励机制而非道德说教。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'transparency',
    questionText: 'Should governments and large companies be forced to operate with complete transparency?',
    translations: {
      te: {
        word: 'పారదర్శకత',
        question: 'ప్రభుత్వాలు, పెద్ద సంస్థలు పూర్తి పారదర్శకతతో పనిచేయాలని బలవంతం చేయాలా?',
        examples: [
          {
            en: 'While transparency undeniably deters misconduct, it could be argued that total openness would render delicate negotiations and legitimate confidentiality nearly impossible to sustain.',
            native:
              'పారదర్శకత తప్పుచర్యలను నిస్సందేహంగా నివారిస్తున్నప్పటికీ, పూర్తి వెల్లడి సున్నితమైన చర్చలనూ, చట్టబద్ధమైన గోప్యతనూ కొనసాగించడం దాదాపు అసాధ్యం చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, sunlight remains the best disinfectant; nevertheless, indiscriminate disclosure can endanger sources, security operations, and the privacy of ordinary employees.',
            native:
              'నిజానికి సూర్యకాంతి ఉత్తమమైన శుద్ధికారకం; అయినప్పటికీ, వివేచనలేని బహిర్గతం వర్గాలనూ, భద్రతా కార్యకలాపాలనూ, సామాన్య ఉద్యోగుల గోప్యతనూ ప్రమాదంలో పడేయగలదు.',
          },
          {
            en: 'On balance, transparency seems most valuable when targeted at decisions and spending rather than every internal conversation, a distinction reformers too often ignore.',
            native:
              'మొత్తానికి, ప్రతి అంతర్గత సంభాషణ కంటే నిర్ణయాలు, ఖర్చులపై లక్ష్యంగా పెట్టినప్పుడు పారదర్శకత అత్యంత విలువైనదిగా ఉంటుంది; సంస్కర్తలు తరచుగా పట్టించుకోని తేడా ఇది.',
          },
        ],
      },
      hi: {
        word: 'पारदर्शिता',
        question: 'क्या सरकारों और बड़ी कंपनियों को पूर्ण पारदर्शिता के साथ काम करने के लिए मजबूर किया जाना चाहिए?',
        examples: [
          {
            en: 'While transparency undeniably deters misconduct, it could be argued that total openness would render delicate negotiations and legitimate confidentiality nearly impossible to sustain.',
            native:
              'जबकि पारदर्शिता निस्संदेह कदाचार को रोकती है, यह तर्क दिया जा सकता है कि पूर्ण खुलेपन से नाज़ुक बातचीत और वैध गोपनीयता को बनाए रखना लगभग असंभव हो जाएगा।',
          },
          {
            en: 'Admittedly, sunlight remains the best disinfectant; nevertheless, indiscriminate disclosure can endanger sources, security operations, and the privacy of ordinary employees.',
            native:
              'यह स्वीकार करना होगा कि धूप सबसे अच्छा कीटाणुनाशक है; फिर भी, अंधाधुंध खुलासा स्रोतों, सुरक्षा अभियानों और आम कर्मचारियों की निजता को खतरे में डाल सकता है।',
          },
          {
            en: 'On balance, transparency seems most valuable when targeted at decisions and spending rather than every internal conversation, a distinction reformers too often ignore.',
            native:
              'कुल मिलाकर, पारदर्शिता तब सबसे मूल्यवान लगती है जब वह हर आंतरिक बातचीत के बजाय निर्णयों और खर्चों पर लक्षित हो—यह अंतर सुधारक अक्सर अनदेखा कर देते हैं।',
          },
        ],
      },
      es: {
        word: 'transparencia',
        question: '¿Debería obligarse a los gobiernos y a las grandes empresas a operar con total transparencia?',
        examples: [
          {
            en: 'While transparency undeniably deters misconduct, it could be argued that total openness would render delicate negotiations and legitimate confidentiality nearly impossible to sustain.',
            native:
              'Aunque la transparencia indudablemente disuade la mala conducta, podría argumentarse que la apertura total haría casi imposible sostener negociaciones delicadas y confidencialidad legítima.',
          },
          {
            en: 'Admittedly, sunlight remains the best disinfectant; nevertheless, indiscriminate disclosure can endanger sources, security operations, and the privacy of ordinary employees.',
            native:
              'Es cierto que la luz del sol sigue siendo el mejor desinfectante; sin embargo, la divulgación indiscriminada puede poner en peligro fuentes, operaciones de seguridad y la privacidad de empleados ordinarios.',
          },
          {
            en: 'On balance, transparency seems most valuable when targeted at decisions and spending rather than every internal conversation, a distinction reformers too often ignore.',
            native:
              'En definitiva, la transparencia parece más valiosa cuando se dirige a las decisiones y al gasto, y no a cada conversación interna, una distinción que los reformadores ignoran con demasiada frecuencia.',
          },
        ],
      },
      zh: {
        word: '透明度',
        question: '是否应该强制政府和大型企业以完全透明的方式运作？',
        examples: [
          {
            en: 'While transparency undeniably deters misconduct, it could be argued that total openness would render delicate negotiations and legitimate confidentiality nearly impossible to sustain.',
            native: '尽管透明无疑能遏制不当行为，但可以认为，完全公开将使微妙的谈判和合法的保密几乎无法维持。',
          },
          {
            en: 'Admittedly, sunlight remains the best disinfectant; nevertheless, indiscriminate disclosure can endanger sources, security operations, and the privacy of ordinary employees.',
            native: '诚然，阳光仍是最好的消毒剂；然而，不加选择的披露可能危及消息来源、安全行动和普通员工的隐私。',
          },
          {
            en: 'On balance, transparency seems most valuable when targeted at decisions and spending rather than every internal conversation, a distinction reformers too often ignore.',
            native: '总体而言，透明在针对决策和支出时似乎最有价值，而不是针对每一次内部对话——改革者太常忽视这一区别。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'accountability',
    questionText: 'Why are powerful individuals and institutions so rarely held accountable for serious failures?',
    translations: {
      te: {
        word: 'జవాబుదారీతనం',
        question: 'తీవ్రమైన వైఫల్యాలకు శక్తివంతమైన వ్యక్తులు, సంస్థలు ఎందుకు చాలా అరుదుగా బాధ్యులు అవుతారు?',
        examples: [
          {
            en: 'While rules technically apply to everyone, it could be argued that wealth and influence purchase a practical immunity that ordinary people can scarcely imagine.',
            native:
              'నియమాలు సాంకేతికంగా అందరికీ వర్తించినప్పటికీ, సంపద, ప్రభావం సామాన్యులు ఊహించలేని ఆచరణాత్మక మినహాయింపును కొనుగోలు చేస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, prosecuting leaders carries risks of instability; nevertheless, habitual impunity corrodes public trust far more deeply than any single trial ever could.',
            native:
              'నిజానికి నాయకులపై విచారణ అస్థిరత ప్రమాదాలను కలిగి ఉంటుంది; అయినప్పటికీ, అలవాటుపడిన శిక్షారహితత్వం ఏ ఒక్క విచారణ కంటే ప్రజా విశ్వాసాన్ని చాలా లోతుగా తరిగివేస్తుంది.',
          },
          {
            en: 'On balance, accountability fails not for lack of laws but because those responsible for enforcing them often belong to the same circles they would need to investigate.',
            native:
              'మొత్తానికి, జవాబుదారీతనం చట్టాల లేమివల్ల కాదు, వాటిని అమలు చేయాల్సినవారు తాము విచారించాల్సిన వర్గాలకే చెందినవారు అయ్యేందువల్ల విఫలమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'जवाबदेही',
        question: 'गंभीर विफलताओं के लिए शक्तिशाली व्यक्तियों और संस्थाओं से इतनी कम हिसाब क्यों माँगा जाता है?',
        examples: [
          {
            en: 'While rules technically apply to everyone, it could be argued that wealth and influence purchase a practical immunity that ordinary people can scarcely imagine.',
            native:
              'जबकि नियम तकनीकी रूप से सभी पर लागू होते हैं, यह तर्क दिया जा सकता है कि धन और प्रभाव एक व्यावहारिक प्रतिरक्षा खरीद लेते हैं जिसकी कल्पना आम लोग मुश्किल से कर सकते हैं।',
          },
          {
            en: 'Admittedly, prosecuting leaders carries risks of instability; nevertheless, habitual impunity corrodes public trust far more deeply than any single trial ever could.',
            native:
              'यह स्वीकार करना होगा कि नेताओं पर मुकदमा चलाने में अस्थिरता का जोखिम है; फिर भी, आदतन दंडमुक्ति किसी भी एक मुकदमे की तुलना में जनविश्वास को कहीं अधिक गहराई तक क्षय करती है।',
          },
          {
            en: 'On balance, accountability fails not for lack of laws but because those responsible for enforcing them often belong to the same circles they would need to investigate.',
            native:
              'कुल मिलाकर, जवाबदेही कानूनों की कमी से नहीं, बल्कि इसलिए विफल होती है कि उन्हें लागू करने के ज़िम्मेदार लोग अक्सर उन्हीं हलकों से होते हैं जिनकी उन्हें जाँच करनी चाहिए।',
          },
        ],
      },
      es: {
        word: 'rendición de cuentas',
        question: '¿Por qué rara vez se exige cuentas a individuos e instituciones poderosos por fracasos graves?',
        examples: [
          {
            en: 'While rules technically apply to everyone, it could be argued that wealth and influence purchase a practical immunity that ordinary people can scarcely imagine.',
            native:
              'Aunque las normas técnicamente se aplican a todos, podría argumentarse que la riqueza y la influencia compran una inmunidad práctica que la gente común apenas puede imaginar.',
          },
          {
            en: 'Admittedly, prosecuting leaders carries risks of instability; nevertheless, habitual impunity corrodes public trust far more deeply than any single trial ever could.',
            native:
              'Es cierto que procesar a los líderes conlleva riesgos de inestabilidad; sin embargo, la impunidad habitual corroe la confianza pública mucho más profundamente que cualquier juicio aislado.',
          },
          {
            en: 'On balance, accountability fails not for lack of laws but because those responsible for enforcing them often belong to the same circles they would need to investigate.',
            native:
              'En definitiva, la rendición de cuentas falla no por falta de leyes, sino porque quienes deben hacerlas cumplir a menudo pertenecen a los mismos círculos que tendrían que investigar.',
          },
        ],
      },
      zh: {
        word: '问责制',
        question: '为什么有权势的个人和机构很少为严重的失败被追责？',
        examples: [
          {
            en: 'While rules technically apply to everyone, it could be argued that wealth and influence purchase a practical immunity that ordinary people can scarcely imagine.',
            native:
              '尽管规则在技术上适用于所有人，但可以认为，财富和影响力买到的是一种普通人几乎无法想象的实际豁免权。',
          },
          {
            en: 'Admittedly, prosecuting leaders carries risks of instability; nevertheless, habitual impunity corrodes public trust far more deeply than any single trial ever could.',
            native:
              '诚然，起诉领导人有引发不稳定的风险；然而，习惯性的有罪不罚对公众信任的侵蚀远比任何一次审判都要深得多。',
          },
          {
            en: 'On balance, accountability fails not for lack of laws but because those responsible for enforcing them often belong to the same circles they would need to investigate.',
            native: '总体而言，问责制的失败并非因为缺少法律，而是因为负责执法的人往往属于他们本应调查的同一个圈子。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'justice',
    questionText: 'Is justice mainly about punishing wrongdoing, or about repairing the harm that was done?',
    translations: {
      te: {
        word: 'న్యాయం',
        question: 'న్యాయం అంటే ప్రధానంగా తప్పు చేసినవారిని శిక్షించడమేనా, లేక జరిగిన హానిని సరిచేయడమేనా?',
        examples: [
          {
            en: 'While punishment satisfies a deep human instinct for proportionality, it could be argued that it rarely restores what victims actually lost or needed.',
            native:
              'శిక్ష అనుపాతబద్ధత కోసమైన లోతైన మానవ స్వభావాన్ని తృప్తిపరిచినప్పటికీ, బాధితులు వాస్తవంగా కోల్పోయినదాన్నీ కోరినదాన్నీ అది అరుదుగా పునరుద్ధరిస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, restorative approaches appear soft to those craving retribution; nevertheless, evidence increasingly suggests they reduce reoffending more effectively than imprisonment.',
            native:
              'నిజానికి ప్రతీకారం కోరేవారికి పునరుద్ధరణ విధానాలు మృదువుగా అనిపిస్తాయి; అయినప్పటికీ, సాక్ష్యాలు కారాగారం కంటే అవి మళ్లీ నేరాలు చేయడాన్ని ఎక్కువ ప్రభావవంతంగా తగ్గిస్తాయని సూచిస్తున్నాయి.',
          },
          {
            en: 'On balance, justice seems most complete when it balances accountability with repair, although societies differ enormously in how much weight each element receives.',
            native:
              'మొత్తానికి, న్యాయం జవాబుదారీతనాన్నీ సరిచేయడాన్నీ సమతుల్యం చేసినప్పుడు అత్యంత సంపూర్ణంగా ఉంటుంది, అయితే ప్రతి అంశానికి ఎంత ప్రాధాన్యం ఇస్తారో సమాజాల మధ్య అపారమైన తేడా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'न्याय',
        question: 'क्या न्याय मुख्य रूप से गलत कार्य की सज़ा देना है, या हुए नुकसान की भरपाई करना?',
        examples: [
          {
            en: 'While punishment satisfies a deep human instinct for proportionality, it could be argued that it rarely restores what victims actually lost or needed.',
            native:
              'जबकि दंड आनुपातिकता की गहरी मानवीय प्रवृत्ति को संतुष्ट करता है, यह तर्क दिया जा सकता है कि यह शायद ही कभी वह वापस करता है जो पीड़ितों ने वास्तव में खोया या जिसकी उन्हें ज़रूरत थी।',
          },
          {
            en: 'Admittedly, restorative approaches appear soft to those craving retribution; nevertheless, evidence increasingly suggests they reduce reoffending more effectively than imprisonment.',
            native:
              'यह स्वीकार करना होगा कि प्रतिशोध चाहने वालों को पुनर्स्थापनात्मक तरीके नरम लगते हैं; फिर भी, प्रमाण तेज़ी से बताते हैं कि ये कारावास की तुलना में दोबारा अपराध को अधिक प्रभावी ढंग से कम करते हैं।',
          },
          {
            en: 'On balance, justice seems most complete when it balances accountability with repair, although societies differ enormously in how much weight each element receives.',
            native:
              'कुल मिलाकर, न्याय तब सबसे पूर्ण लगता है जब वह जवाबदेही और मरम्मत में संतुलन बनाए, यद्यपि हर तत्व को कितना महत्व मिले, इसमें समाजों में असाधारण अंतर है।',
          },
        ],
      },
      es: {
        word: 'justicia',
        question: '¿Consiste la justicia principalmente en castigar el delito, o en reparar el daño causado?',
        examples: [
          {
            en: 'While punishment satisfies a deep human instinct for proportionality, it could be argued that it rarely restores what victims actually lost or needed.',
            native:
              'Aunque el castigo satisface un profundo instinto humano de proporcionalidad, podría argumentarse que rara vez restituye lo que las víctimas realmente perdieron o necesitaban.',
          },
          {
            en: 'Admittedly, restorative approaches appear soft to those craving retribution; nevertheless, evidence increasingly suggests they reduce reoffending more effectively than imprisonment.',
            native:
              'Es cierto que los enfoques restaurativos parecen blandos a quienes ansían retribución; sin embargo, la evidencia sugiere cada vez más que reducen la reincidencia con mayor eficacia que la prisión.',
          },
          {
            en: 'On balance, justice seems most complete when it balances accountability with repair, although societies differ enormously in how much weight each element receives.',
            native:
              'En definitiva, la justicia parece más completa cuando equilibra la rendición de cuentas con la reparación, aunque las sociedades difieren enormemente en el peso que conceden a cada elemento.',
          },
        ],
      },
      zh: {
        word: '正义',
        question: '正义主要是惩罚不法行为，还是修复所造成的伤害？',
        examples: [
          {
            en: 'While punishment satisfies a deep human instinct for proportionality, it could be argued that it rarely restores what victims actually lost or needed.',
            native: '尽管惩罚满足了人类对相称性的深层本能，但可以认为，它很少能恢复受害者真正失去或需要的东西。',
          },
          {
            en: 'Admittedly, restorative approaches appear soft to those craving retribution; nevertheless, evidence increasingly suggests they reduce reoffending more effectively than imprisonment.',
            native:
              '诚然，在渴望报复的人看来，恢复性司法显得软弱；然而，越来越多的证据表明，它比监禁更能有效减少再犯。',
          },
          {
            en: 'On balance, justice seems most complete when it balances accountability with repair, although societies differ enormously in how much weight each element receives.',
            native:
              '总体而言，当正义在问责与修复之间取得平衡时，它似乎最为完整，尽管各社会对每个要素赋予的权重差异巨大。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'equality',
    questionText: 'Should societies aim for equality of opportunity, equality of outcome, or something in between?',
    translations: {
      te: {
        word: 'సమానత్వం',
        question: 'సమాజాలు అవకాశ సమానత్వాన్నా, ఫలిత సమానత్వాన్నా, లేక రెండింటి మధ్య ఏదోనైనా లక్ష్యంగా చేసుకోవాలా?',
        examples: [
          {
            en: "While equality of outcome sounds compassionate, it could be argued that enforcing identical results would require intolerable interference in people's divergent choices and talents.",
            native:
              'ఫలిత సమానత్వం కరుణామయంగా అనిపించినప్పటికీ, ఒకే ఫలితాలను అమలు చేయడానికి ప్రజల వైవిధ్యమైన ఎంపికలు, ప్రతిభల్లో తాళాలేని జోక్యం అవసరమవుతుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, opportunity alone is insufficient when starting points differ grotesquely; nevertheless, most people accept unequal results provided the competition itself seems genuinely fair.',
            native:
              'నిజానికి ప్రారంభ స్థానాలు వికారంగా భిన్నమైనప్పుడు అవకాశం మాత్రమే సరిపోదు; అయినప్పటికీ, పోటీ నిజంగా న్యాయంగా అనిపిస్తే చాలామంది అసమాన ఫలితాలను అంగీకరిస్తారు.',
          },
          {
            en: 'On balance, a pragmatic middle course seems wisest: guarantee a dignified minimum for everyone, yet allow outcomes to vary with effort, talent, and, inevitably, luck.',
            native:
              'మొత్తానికి, ఆచరణాత్మక మధ్యమార్గమే తెలివైనది: అందరికీ గౌరవప్రదమైన కనీసం హామీ ఇస్తూ, కృషి, ప్రతిభ మరియు అనివార్యంగా అదృష్టంతో ఫలితాలు మారనివ్వడం.',
          },
        ],
      },
      hi: {
        word: 'समानता',
        question: 'क्या समाजों को अवसर की समानता, परिणाम की समानता, या बीच के किसी रास्ते का लक्ष्य रखना चाहिए?',
        examples: [
          {
            en: "While equality of outcome sounds compassionate, it could be argued that enforcing identical results would require intolerable interference in people's divergent choices and talents.",
            native:
              'जबकि परिणाम की समानता दयालु लगती है, यह तर्क दिया जा सकता है कि समान परिणाम लागू करने के लिए लोगों के अलग-अलग चुनावों और प्रतिभाओं में असहनीय हस्तक्षेप की आवश्यकता होगी।',
          },
          {
            en: 'Admittedly, opportunity alone is insufficient when starting points differ grotesquely; nevertheless, most people accept unequal results provided the competition itself seems genuinely fair.',
            native:
              'यह स्वीकार करना होगा कि शुरुआती बिंदु भयंकर रूप से अलग हों तो केवल अवसर पर्याप्त नहीं है; फिर भी, यदि प्रतिस्पर्धा वास्तव में निष्पक्ष लगे तो अधिकांश लोग असमान परिणाम स्वीकार कर लेते हैं।',
          },
          {
            en: 'On balance, a pragmatic middle course seems wisest: guarantee a dignified minimum for everyone, yet allow outcomes to vary with effort, talent, and, inevitably, luck.',
            native:
              'कुल मिलाकर, व्यावहारिक मध्यम मार्ग सबसे बुद्धिमान लगता है: सभी के लिए गरिमामय न्यूनतम की गारंटी दें, फिर भी परिणामों को प्रयास, प्रतिभा और अनिवार्य रूप से किस्मत के साथ बदलने दें।',
          },
        ],
      },
      es: {
        word: 'igualdad',
        question:
          '¿Deberían las sociedades aspirar a la igualdad de oportunidades, a la igualdad de resultados, o a algo intermedio?',
        examples: [
          {
            en: "While equality of outcome sounds compassionate, it could be argued that enforcing identical results would require intolerable interference in people's divergent choices and talents.",
            native:
              'Aunque la igualdad de resultados suena compasiva, podría argumentarse que imponer resultados idénticos exigiría una interferencia intolerable en las decisiones y talentos divergentes de las personas.',
          },
          {
            en: 'Admittedly, opportunity alone is insufficient when starting points differ grotesquely; nevertheless, most people accept unequal results provided the competition itself seems genuinely fair.',
            native:
              'Es cierto que la oportunidad por sí sola es insuficiente cuando los puntos de partida difieren grotescamente; sin embargo, la mayoría acepta resultados desiguales siempre que la competencia parezca genuinamente justa.',
          },
          {
            en: 'On balance, a pragmatic middle course seems wisest: guarantee a dignified minimum for everyone, yet allow outcomes to vary with effort, talent, and, inevitably, luck.',
            native:
              'En definitiva, un término medio pragmático parece lo más sabio: garantizar un mínimo digno para todos, pero permitir que los resultados varíen con el esfuerzo, el talento e, inevitablemente, la suerte.',
          },
        ],
      },
      zh: {
        word: '平等',
        question: '社会应当追求机会平等、结果平等，还是介于两者之间的某种状态？',
        examples: [
          {
            en: "While equality of outcome sounds compassionate, it could be argued that enforcing identical results would require intolerable interference in people's divergent choices and talents.",
            native:
              '尽管结果平等听起来富有同情心，但可以认为，强制实现相同的结果需要难以忍受地干预人们不同的选择与才能。',
          },
          {
            en: 'Admittedly, opportunity alone is insufficient when starting points differ grotesquely; nevertheless, most people accept unequal results provided the competition itself seems genuinely fair.',
            native:
              '诚然，当起点差异悬殊时，仅凭机会并不足够；然而，只要竞争本身看起来真正公平，大多数人能接受不平等的结果。',
          },
          {
            en: 'On balance, a pragmatic middle course seems wisest: guarantee a dignified minimum for everyone, yet allow outcomes to vary with effort, talent, and, inevitably, luck.',
            native:
              '总体而言，务实的中间道路似乎最明智：为每个人保障有尊严的最低生活，同时允许结果随努力、才能以及不可避免的运气而变化。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'activism',
    questionText: 'Is street activism still an effective way to achieve political change in the digital age?',
    translations: {
      te: {
        word: 'క్రియావాదం',
        question: 'డిజిటల్ యుగంలో రాజకీయ మార్పు సాధించడానికి వీధి ఉద్యమాలు ఇంకా ప్రభావవంతమైన మార్గమేనా?',
        examples: [
          {
            en: 'While online campaigns spread awareness instantly, it could be argued that physical protest still forces governments to reckon with costs that hashtags alone rarely impose.',
            native:
              'ఆన్‌లైన్ ప్రచారాలు అవగాహనను తక్షణమే వ్యాప్తి చేసినప్పటికీ, హ్యాష్‌ట్యాగ్‌లు మాత్రమే అరుదుగా విధించే ఖర్చులను భౌతిక నిరసనలు ప్రభుత్వాలకు ఇంకా గుర్తు చేయిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, activism sometimes alienates the very audiences it needs to persuade; nevertheless, most rights we now take for granted were won through initially unpopular disruption.',
            native:
              'నిజానికి క్రియావాదం కొన్నిసార్లు తాను ఒప్పించాల్సిన ప్రేక్షకులనే దూరం చేస్తుంది; అయినప్పటికీ, మనం ఇప్పుడు సాధారణంగా అనుకుంటున్న చాలా హక్కులు ప్రారంభంలో అప్రజాదరణ పొందిన అంతరాయాల ద్వారానే గెలుచుకున్నాయి.',
          },
          {
            en: 'On balance, activism works best as one instrument among several, since durable change usually requires negotiation and institutional reform long after the crowds disperse.',
            native:
              'మొత్తానికి, క్రియావాదం అనేక సాధనాల్లో ఒకటిగా ఉన్నప్పుడు బాగా పనిచేస్తుంది, ఎందుకంటే గుంపులు వెదజల్లిన తర్వాత చాలా కాలం శాశ్వత మార్పుకు సాధారణంగా చర్చలు, సంస్థాగత సంస్కరణలు అవసరం.',
          },
        ],
      },
      hi: {
        word: 'सक्रियतावाद',
        question: 'क्या डिजिटल युग में राजनीतिक बदलाव लाने के लिए सड़कों का आंदोलन अब भी प्रभावी तरीका है?',
        examples: [
          {
            en: 'While online campaigns spread awareness instantly, it could be argued that physical protest still forces governments to reckon with costs that hashtags alone rarely impose.',
            native:
              'जबकि ऑनलाइन अभियान जागरूकता तुरंत फैलाते हैं, यह तर्क दिया जा सकता है कि भौतिक विरोध अब भी सरकारों को उन कीमतों का एहसास कराता है जो अकेले हैशटैग शायद ही थोपते हैं।',
          },
          {
            en: 'Admittedly, activism sometimes alienates the very audiences it needs to persuade; nevertheless, most rights we now take for granted were won through initially unpopular disruption.',
            native:
              'यह स्वीकार करना होगा कि सक्रियतावाद कभी-कभी उन्हीं दर्शकों को अलग कर देता है जिन्हें मनाने की ज़रूरत है; फिर भी, अधिकांश अधिकार जिन्हें हम आज स्वाभाविक मानते हैं, शुरू में अलोकप्रिय व्यवधानों से ही जीते गए थे।',
          },
          {
            en: 'On balance, activism works best as one instrument among several, since durable change usually requires negotiation and institutional reform long after the crowds disperse.',
            native:
              'कुल मिलाकर, सक्रियतावाद कई साधनों में से एक के रूप में सबसे अच्छा काम करता है, क्योंकि भीड़ बिखरने के काफी बाद भी टिकाऊ बदलाव के लिए आमतौर पर बातचीत और संस्थागत सुधार ज़रूरी होते हैं।',
          },
        ],
      },
      es: {
        word: 'activismo',
        question:
          '¿Sigue siendo el activismo callejero una forma eficaz de lograr cambios políticos en la era digital?',
        examples: [
          {
            en: 'While online campaigns spread awareness instantly, it could be argued that physical protest still forces governments to reckon with costs that hashtags alone rarely impose.',
            native:
              'Aunque las campañas en línea difunden conciencia al instante, podría argumentarse que la protesta física aún obliga a los gobiernos a asumir costes que los hashtags por sí solos rara vez imponen.',
          },
          {
            en: 'Admittedly, activism sometimes alienates the very audiences it needs to persuade; nevertheless, most rights we now take for granted were won through initially unpopular disruption.',
            native:
              'Es cierto que el activismo a veces aleja a los públicos que necesita persuadir; sin embargo, la mayoría de los derechos que hoy damos por sentados se conquistaron mediante disrupciones inicialmente impopulares.',
          },
          {
            en: 'On balance, activism works best as one instrument among several, since durable change usually requires negotiation and institutional reform long after the crowds disperse.',
            native:
              'En definitiva, el activismo funciona mejor como un instrumento entre varios, ya que el cambio duradero suele requerir negociación y reforma institucional mucho después de que las multitudes se dispersen.',
          },
        ],
      },
      zh: {
        word: '行动主义',
        question: '在数字时代，街头行动主义仍然是实现政治变革的有效方式吗？',
        examples: [
          {
            en: 'While online campaigns spread awareness instantly, it could be argued that physical protest still forces governments to reckon with costs that hashtags alone rarely impose.',
            native: '尽管线上运动能瞬间传播意识，但可以认为，实体抗议仍然迫使政府承担仅靠标签运动很少能施加的代价。',
          },
          {
            en: 'Admittedly, activism sometimes alienates the very audiences it needs to persuade; nevertheless, most rights we now take for granted were won through initially unpopular disruption.',
            native:
              '诚然，行动主义有时会疏远它本需说服的受众；然而，我们如今视为理所当然的大多数权利，都是通过起初不受欢迎的抗争行动赢得的。',
          },
          {
            en: 'On balance, activism works best as one instrument among several, since durable change usually requires negotiation and institutional reform long after the crowds disperse.',
            native:
              '总体而言，行动主义作为多种工具之一时效果最好，因为人群散去很久之后，持久的变革通常仍需要谈判和制度改革。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'philanthropy',
    questionText:
      'Does philanthropy by the wealthy benefit society, or does it give a few individuals too much influence?',
    translations: {
      te: {
        word: 'పరోపకారం',
        question: 'ధనికుల పరోపకారం సమాజానికి ప్రయోజనం చేకూరుస్తుందా, లేక కొద్దిమందికి అతిగా ప్రభావం ఇస్తుందా?',
        examples: [
          {
            en: 'While philanthropic donations fund valuable research and relief, it could be argued that they also allow unelected billionaires to set public priorities according to personal preference.',
            native:
              'పరోపకార విరాళాలు విలువైన పరిశోధనలకూ, సహాయక చర్యలకూ నిధులు అందించినప్పటికీ, ఎన్నికలేని బిలియనీర్లు వ్యక్తిగత అభిరుచుల ప్రకారం ప్రజా ప్రాధాన్యతలను నిర్ణయించడానికి కూడా అవి అనుమతిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: "Admittedly, private generosity moves faster than government bureaucracy; nevertheless, gratitude is a poor substitute for accountability when essential services depend on one donor's whim.",
            native:
              'నిజానికి ప్రైవేటు ఉదారత ప్రభుత్వ అధికారతంత్రం కంటే వేగంగా కదులుతుంది; అయినప్పటికీ, అత్యవసర సేవలు ఒక దాత ఉత్పాటంపై ఆధారపడినప్పుడు కృతజ్ఞత జవాబుదారీతనానికి పేద ప్రత్యామ్నాయం.',
          },
          {
            en: 'On balance, philanthropy seems most defensible when it complements rather than replaces taxation, since a civilised society should not depend upon the moods of the fortunate.',
            native:
              'మొత్తానికి, పరోపకారం పన్నులకు ప్రత్యామ్నాయం కాకుండా పూరకంగా ఉన్నప్పుడు అత్యంత సమర్థనీయం, ఎందుకంటే నాగరిక సమాజం అదృష్టవంతుల మూడ్‌లపై ఆధారపడకూడదు.',
          },
        ],
      },
      hi: {
        word: 'परोपकार',
        question:
          'क्या धनी लोगों का परोपकार समाज को लाभ पहुँचाता है, या यह कुछ ही व्यक्तियों को अत्यधिक प्रभाव दे देता है?',
        examples: [
          {
            en: 'While philanthropic donations fund valuable research and relief, it could be argued that they also allow unelected billionaires to set public priorities according to personal preference.',
            native:
              'जबकि परोपकारी दान मूल्यवान अनुसंधान और राहत को धन देते हैं, यह तर्क दिया जा सकता है कि वे अनिर्वाचित अरबपतियों को भी निजी पसंद के अनुसार सार्वजनिक प्राथमिकताएँ तय करने देते हैं।',
          },
          {
            en: "Admittedly, private generosity moves faster than government bureaucracy; nevertheless, gratitude is a poor substitute for accountability when essential services depend on one donor's whim.",
            native:
              'यह स्वीकार करना होगा कि निजी उदारता सरकारी नौकरशाही से तेज़ चलती है; फिर भी, जब आवश्यक सेवाएँ एक दाता के मिज़ाज पर निर्भर हों तो कृतज्ञता जवाबदेही का घटिया विकल्प है।',
          },
          {
            en: 'On balance, philanthropy seems most defensible when it complements rather than replaces taxation, since a civilised society should not depend upon the moods of the fortunate.',
            native:
              'कुल मिलाकर, परोपकार तब सबसे अधिक बचावयोग्य लगता है जब वह कराधान का प्रतिस्थापन नहीं बल्कि पूरक हो, क्योंकि एक सभ्य समाज को भाग्यवानों के मनोभाव पर निर्भर नहीं होना चाहिए।',
          },
        ],
      },
      es: {
        word: 'filantropía',
        question:
          '¿Beneficia la filantropía de los ricos a la sociedad, o concede a unos pocos individuos demasiada influencia?',
        examples: [
          {
            en: 'While philanthropic donations fund valuable research and relief, it could be argued that they also allow unelected billionaires to set public priorities according to personal preference.',
            native:
              'Aunque las donaciones filantrópicas financian investigación y ayuda valiosas, podría argumentarse que también permiten a multimillonarios no elegidos fijar prioridades públicas según sus preferencias personales.',
          },
          {
            en: "Admittedly, private generosity moves faster than government bureaucracy; nevertheless, gratitude is a poor substitute for accountability when essential services depend on one donor's whim.",
            native:
              'Es cierto que la generosidad privada se mueve más rápido que la burocracia gubernamental; sin embargo, la gratitud es un mal sustituto de la rendición de cuentas cuando los servicios esenciales dependen del capricho de un donante.',
          },
          {
            en: 'On balance, philanthropy seems most defensible when it complements rather than replaces taxation, since a civilised society should not depend upon the moods of the fortunate.',
            native:
              'En definitiva, la filantropía parece más defendible cuando complementa los impuestos en lugar de sustituirlos, ya que una sociedad civilizada no debería depender de los humores de los afortunados.',
          },
        ],
      },
      zh: {
        word: '慈善',
        question: '富人的慈善行为造福了社会，还是让少数个人拥有了过大的影响力？',
        examples: [
          {
            en: 'While philanthropic donations fund valuable research and relief, it could be argued that they also allow unelected billionaires to set public priorities according to personal preference.',
            native:
              '尽管慈善捐款资助了有价值的研究和救援，但可以认为，它们也让未经选举的亿万富翁得以按个人偏好设定公共优先事项。',
          },
          {
            en: "Admittedly, private generosity moves faster than government bureaucracy; nevertheless, gratitude is a poor substitute for accountability when essential services depend on one donor's whim.",
            native:
              '诚然，私人慷慨比政府官僚机构行动更快；然而，当基本服务取决于一位捐赠者的心血来潮时，感恩并不能替代问责。',
          },
          {
            en: 'On balance, philanthropy seems most defensible when it complements rather than replaces taxation, since a civilised society should not depend upon the moods of the fortunate.',
            native: '总体而言，当慈善补充而非取代税收时，它似乎最站得住脚，因为一个文明社会不应依赖于幸运者的心情。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'wealth',
    questionText: 'Does great personal wealth bring genuine happiness, or does it create its own problems?',
    translations: {
      te: {
        word: 'సంపద',
        question: 'గొప్ప వ్యక్తిగత సంపద నిజమైన ఆనందాన్ని ఇస్తుందా, లేక దాని స్వంత సమస్యలను సృష్టిస్తుందా?',
        examples: [
          {
            en: 'While wealth undeniably removes the anxieties of poverty, it could be argued that beyond a comfortable threshold, additional money purchases remarkably little extra contentment.',
            native:
              'సంపద పేదరికపు ఆందోళనలను నిస్సందేహంగా తొలగించినప్పటికీ, సౌకర్యవంతమైన స్థాయి దాటిన తర్వాత అదనపు డబ్బు ఆశ్చర్యకరంగా తక్కువ అదనపు తృప్తిని కొనుగోలు చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, the rich enjoy freedom and security most people lack; nevertheless, extreme affluence frequently breeds isolation, suspicion, and a peculiar fear of losing everything.',
            native:
              'నిజానికి ధనికులు చాలామందికి లేని స్వేచ్ఛనూ భద్రతనూ అనుభవిస్తారు; అయినప్పటికీ, అత్యంత ఐశ్వర్యం తరచుగా ఒంటరితనాన్నీ, అనుమానాన్నీ, అంతా కోల్పోతామనే విచిత్ర భయాన్నీ పెంచుతుంది.',
          },
          {
            en: 'On balance, wealth seems to amplify rather than transform character, which perhaps explains why some rich people are serene while others remain perpetually dissatisfied.',
            native:
              'మొత్తానికి, సంపద స్వభావాన్ని మార్చడం కంటే పెంచడం చేస్తుందని అనిపిస్తుంది; కొందరు ధనికులు ప్రశాంతంగా ఉండగా మరికొందరు శాశ్వత అసంతృప్తులుగా ఉండటానికి బహుశా ఇది కారణం.',
          },
        ],
      },
      hi: {
        word: 'धन',
        question: 'क्या बहुत अधिक व्यक्तिगत धन वास्तविक खुशी लाता है, या यह अपनी अलग समस्याएँ पैदा करता है?',
        examples: [
          {
            en: 'While wealth undeniably removes the anxieties of poverty, it could be argued that beyond a comfortable threshold, additional money purchases remarkably little extra contentment.',
            native:
              'जबकि धन निस्संदेह गरीबी की चिंताएँ दूर करता है, यह तर्क दिया जा सकता है कि आरामदायक सीमा के आगे, अतिरिक्त पैसा आश्चर्यजनक रूप से कम अतिरिक्त संतोष खरीदता है।',
          },
          {
            en: 'Admittedly, the rich enjoy freedom and security most people lack; nevertheless, extreme affluence frequently breeds isolation, suspicion, and a peculiar fear of losing everything.',
            native:
              'यह स्वीकार करना होगा कि अमीर वह स्वतंत्रता और सुरक्षा भोगते हैं जो अधिकांश लोगों के पास नहीं है; फिर भी, अत्यंत समृद्धि अक्सर अकेलापन, संदेह और सब कुछ खोने का एक विचित्र डर पैदा करती है।',
          },
          {
            en: 'On balance, wealth seems to amplify rather than transform character, which perhaps explains why some rich people are serene while others remain perpetually dissatisfied.',
            native:
              'कुल मिलाकर, धन चरित्र को बदलने के बजाय उसे बढ़ाता प्रतीत होता है—शायद इसीलिए कुछ अमीर शांत रहते हैं जबकि अन्य सदा असंतुष्ट बने रहते हैं।',
          },
        ],
      },
      es: {
        word: 'riqueza',
        question: '¿Trae la gran riqueza personal una felicidad genuina, o crea sus propios problemas?',
        examples: [
          {
            en: 'While wealth undeniably removes the anxieties of poverty, it could be argued that beyond a comfortable threshold, additional money purchases remarkably little extra contentment.',
            native:
              'Aunque la riqueza indudablemente elimina las ansiedades de la pobreza, podría argumentarse que, más allá de un umbral cómodo, el dinero adicional compra sorprendentemente poca satisfacción extra.',
          },
          {
            en: 'Admittedly, the rich enjoy freedom and security most people lack; nevertheless, extreme affluence frequently breeds isolation, suspicion, and a peculiar fear of losing everything.',
            native:
              'Es cierto que los ricos disfrutan de una libertad y seguridad que la mayoría carece; sin embargo, la afluencia extrema frecuentemente engendra aislamiento, sospecha y un miedo peculiar a perderlo todo.',
          },
          {
            en: 'On balance, wealth seems to amplify rather than transform character, which perhaps explains why some rich people are serene while others remain perpetually dissatisfied.',
            native:
              'En definitiva, la riqueza parece amplificar el carácter más que transformarlo, lo que quizá explique por qué algunos ricos son serenos mientras otros permanecen perpetuamente insatisfechos.',
          },
        ],
      },
      zh: {
        word: '财富',
        question: '巨额的个人财富能带来真正的幸福，还是会制造它自己的问题？',
        examples: [
          {
            en: 'While wealth undeniably removes the anxieties of poverty, it could be argued that beyond a comfortable threshold, additional money purchases remarkably little extra contentment.',
            native:
              '尽管财富无疑消除了贫困带来的焦虑，但可以认为，超过舒适门槛之后，额外的金钱买到的额外满足感少得惊人。',
          },
          {
            en: 'Admittedly, the rich enjoy freedom and security most people lack; nevertheless, extreme affluence frequently breeds isolation, suspicion, and a peculiar fear of losing everything.',
            native:
              '诚然，富人享受着大多数人缺乏的自由与安全；然而，极端的富裕往往滋生孤立、猜疑，以及一种害怕失去一切的奇特恐惧。',
          },
          {
            en: 'On balance, wealth seems to amplify rather than transform character, which perhaps explains why some rich people are serene while others remain perpetually dissatisfied.',
            native:
              '总体而言，财富似乎放大而非改变人的性格——这或许解释了为什么有些富人从容安详，而另一些却永远不满足。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'poverty',
    questionText: 'Is poverty mainly the result of personal failure, or of the way society is organised?',
    translations: {
      te: {
        word: 'పేదరికం',
        question: 'పేదరికం ప్రధానంగా వ్యక్తిగత వైఫల్యం ఫలితమా, లేక సమాజ నిర్మాణం ఫలితమా?',
        examples: [
          {
            en: 'While individual choices plainly matter, it could be argued that attributing poverty chiefly to laziness ignores overwhelming evidence about inherited disadvantage and plain bad luck.',
            native:
              'వ్యక్తిగత ఎంపికలు స్పష్టంగా ముఖ్యమయినప్పటికీ, పేదరికాన్ని ప్రధానంగా సోమరితనానికి ఆపాదించడం వంశపారంపర్య అసౌకర్యాలు, సాదా దురదృష్టం గురించిన అధిక సాక్ష్యాలను పట్టించుకోవదని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, some escape destitution through extraordinary effort; nevertheless, celebrating rare exceptions distracts from the structural barriers that defeat millions of equally determined people.',
            native:
              'నిజానికి కొందరు అసాధారణ కృషితో దారిద్ర్యం నుండి బయటపడతారు; అయినప్పటికీ, అరుదైన మినహాయింపులను కీర్తించడం అంతే దృఢసంకల్పం గల కోట్లాదిమందిని ఓడించే నిర్మాణాత్మక అడ్డంకుల నుండి దృష్టి మళ్లిస్తుంది.',
          },
          {
            en: 'On balance, poverty appears less a verdict on character than a reflection of circumstances, although acknowledging this demands an uncomfortable humility from the successful.',
            native:
              'మొత్తానికి, పేదరికం స్వభావంపై తీర్పు కంటే పరిస్థితుల ప్రతిబింబంగా కనిపిస్తుంది, అయితే దీన్ని అంగీకరించడానికి విజేతల నుండి అసౌకర్యకరమైన వినయం అవసరం.',
          },
        ],
      },
      hi: {
        word: 'गरीबी',
        question: 'क्या गरीबी मुख्य रूप से व्यक्तिगत असफलता का परिणाम है, या समाज के संगठन का?',
        examples: [
          {
            en: 'While individual choices plainly matter, it could be argued that attributing poverty chiefly to laziness ignores overwhelming evidence about inherited disadvantage and plain bad luck.',
            native:
              'जबकि व्यक्तिगत चुनाव स्पष्ट रूप से मायने रखते हैं, यह तर्क दिया जा सकता है कि गरीबी को मुख्यतः आलस्य से जोड़ना विरासत में मिली कमियों और महज़ दुर्भाग्य के भारी प्रमाण को अनदेखा करता है।',
          },
          {
            en: 'Admittedly, some escape destitution through extraordinary effort; nevertheless, celebrating rare exceptions distracts from the structural barriers that defeat millions of equally determined people.',
            native:
              'यह स्वीकार करना होगा कि कुछ लोग असाधारण प्रयास से दरिद्रता से बाहर निकलते हैं; फिर भी, दुर्लभ अपवादों का जश्न मनाना उन संरचनात्मक बाधाओं से ध्यान हटाता है जो लाखों समान रूप से दृढ़ लोगों को पराजित करती हैं।',
          },
          {
            en: 'On balance, poverty appears less a verdict on character than a reflection of circumstances, although acknowledging this demands an uncomfortable humility from the successful.',
            native:
              'कुल मिलाकर, गरीबी चरित्र पर फैसले से कम और परिस्थितियों के प्रतिबिंब जैसी अधिक लगती है, यद्यपि इसे स्वीकार करने के लिए सफल लोगों से एक असहज विनम्रता माँगती है।',
          },
        ],
      },
      es: {
        word: 'pobreza',
        question:
          '¿Es la pobreza principalmente resultado del fracaso personal, o de la forma en que se organiza la sociedad?',
        examples: [
          {
            en: 'While individual choices plainly matter, it could be argued that attributing poverty chiefly to laziness ignores overwhelming evidence about inherited disadvantage and plain bad luck.',
            native:
              'Aunque las decisiones individuales claramente importan, podría argumentarse que atribuir la pobreza principalmente a la pereza ignora pruebas abrumadoras sobre la desventaja heredada y la simple mala suerte.',
          },
          {
            en: 'Admittedly, some escape destitution through extraordinary effort; nevertheless, celebrating rare exceptions distracts from the structural barriers that defeat millions of equally determined people.',
            native:
              'Es cierto que algunos escapan de la miseria mediante un esfuerzo extraordinario; sin embargo, celebrar raras excepciones distrae de las barreras estructurales que derrotan a millones de personas igualmente decididas.',
          },
          {
            en: 'On balance, poverty appears less a verdict on character than a reflection of circumstances, although acknowledging this demands an uncomfortable humility from the successful.',
            native:
              'En definitiva, la pobreza parece menos un veredicto sobre el carácter que un reflejo de las circunstancias, aunque reconocerlo exige una humildad incómoda por parte de los exitosos.',
          },
        ],
      },
      zh: {
        word: '贫困',
        question: '贫困主要是个人失败的结果，还是社会组织方式的结果？',
        examples: [
          {
            en: 'While individual choices plainly matter, it could be argued that attributing poverty chiefly to laziness ignores overwhelming evidence about inherited disadvantage and plain bad luck.',
            native:
              '尽管个人选择显然很重要，但可以认为，把贫困主要归因于懒惰，忽视了关于遗传性劣势和纯粹厄运的大量证据。',
          },
          {
            en: 'Admittedly, some escape destitution through extraordinary effort; nevertheless, celebrating rare exceptions distracts from the structural barriers that defeat millions of equally determined people.',
            native:
              '诚然，有些人通过非凡的努力摆脱了赤贫；然而，赞美罕见的例外会让人忽视那些击败了数百万同样坚定之人的结构性障碍。',
          },
          {
            en: 'On balance, poverty appears less a verdict on character than a reflection of circumstances, although acknowledging this demands an uncomfortable humility from the successful.',
            native:
              '总体而言，贫困似乎与其说是对品格的判决，不如说是环境的反映，尽管承认这一点需要成功者拿出令人不安的谦逊。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'social mobility',
    questionText: 'Has social mobility become harder in recent decades, and what could restore it?',
    translations: {
      te: {
        word: 'సామాజిక గతిశీలత',
        question: 'ఇటీవలి దశాబ్దాల్లో సామాజిక గతిశీలత కష్టతరమైందా, దాన్ని తిరిగి పుంజుకోవడానికి ఏమి చేయవచ్చు?',
        examples: [
          {
            en: 'While politicians celebrate opportunity for all, it could be argued that rising housing costs and educational stratification have quietly frozen mobility across much of the developed world.',
            native:
              'రాజకీయ నాయకులు అందరికీ అవకాశం అని కొనియాడినప్పటికీ, పెరుగుతున్న గృహ వ్యయాలు, విద్యా స్థరీకరణ అభివృద్ధి చెందిన ప్రపంచంలో ఎక్కువ భాగం గతిశీలతను నిశ్శబ్దంగా స్తంభింపజేశాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, exceptional individuals still climb dramatically; nevertheless, the statistics suggest that birthplace and parental income predict adult outcomes with depressing accuracy.',
            native:
              'నిజానికి అసాధారణ వ్యక్తులు ఇంకా నాటకీయంగా ఎదుగుతారు; అయినప్పటికీ, గణాంకాలు జన్మస్థలం, తల్లిదండ్రుల ఆదాయం వయోజన ఫలితాలను నిరాశపరిచే ఖచ్చితత్వంతో అంచనా వేస్తాయని సూచిస్తున్నాయి.',
          },
          {
            en: 'On balance, restoring mobility would demand sustained investment in early childhood and affordable housing, remedies far less glamorous than the rhetoric they would replace.',
            native:
              'మొత్తానికి, గతిశీలతను పునరుద్ధరించడానికి ప్రారంభ బాల్యం, సరసమైన గృహాలపై నిరంతర పెట్టుబడులు అవసరం; అవి భర్తీ చేసే ఉపన్యాసాల కంటే చాలా తక్కువ ఆకర్షణీయమైన పరిష్కారాలు.',
          },
        ],
      },
      hi: {
        word: 'सामाजिक गतिशीलता',
        question: 'क्या हाल के दशकों में सामाजिक गतिशीलता कठिन हो गई है, और इसे बहाल करने के लिए क्या किया जा सकता है?',
        examples: [
          {
            en: 'While politicians celebrate opportunity for all, it could be argued that rising housing costs and educational stratification have quietly frozen mobility across much of the developed world.',
            native:
              'जबकि राजनेता सभी के लिए अवसर का गुणगान करते हैं, यह तर्क दिया जा सकता है कि बढ़ती आवास लागत और शैक्षिक स्तरीकरण ने विकसित दुनिया के अधिकांश हिस्से में गतिशीलता को चुपचाप जमा दिया है।',
          },
          {
            en: 'Admittedly, exceptional individuals still climb dramatically; nevertheless, the statistics suggest that birthplace and parental income predict adult outcomes with depressing accuracy.',
            native:
              'यह स्वीकार करना होगा कि असाधारण व्यक्ति अब भी नाटकीय रूप से ऊपर चढ़ते हैं; फिर भी, आँकड़े बताते हैं कि जन्मस्थान और माता-पिता की आय वयस्क परिणामों की भविष्यवाणी निराशाजनक सटीकता से करते हैं।',
          },
          {
            en: 'On balance, restoring mobility would demand sustained investment in early childhood and affordable housing, remedies far less glamorous than the rhetoric they would replace.',
            native:
              'कुल मिलाकर, गतिशीलता बहाल करने के लिए प्रारंभिक बचपन और किफ़ायती आवास में निरंतर निवेश चाहिए—ये उपाय उस शानदार बातचीत की तुलना में कहीं कम आकर्षक हैं जिसकी वे जगह लेंगे।',
          },
        ],
      },
      es: {
        word: 'movilidad social',
        question: '¿Se ha vuelto más difícil la movilidad social en las últimas décadas, y qué podría restaurarla?',
        examples: [
          {
            en: 'While politicians celebrate opportunity for all, it could be argued that rising housing costs and educational stratification have quietly frozen mobility across much of the developed world.',
            native:
              'Aunque los políticos celebran la oportunidad para todos, podría argumentarse que el aumento del coste de la vivienda y la estratificación educativa han congelado silenciosamente la movilidad en gran parte del mundo desarrollado.',
          },
          {
            en: 'Admittedly, exceptional individuals still climb dramatically; nevertheless, the statistics suggest that birthplace and parental income predict adult outcomes with depressing accuracy.',
            native:
              'Es cierto que algunos individuos excepcionales aún ascienden espectacularmente; sin embargo, las estadísticas sugieren que el lugar de nacimiento y los ingresos de los padres predicen los resultados adultos con una precisión deprimente.',
          },
          {
            en: 'On balance, restoring mobility would demand sustained investment in early childhood and affordable housing, remedies far less glamorous than the rhetoric they would replace.',
            native:
              'En definitiva, restaurar la movilidad exigiría una inversión sostenida en la primera infancia y en vivienda asequible, remedios mucho menos glamurosos que la retórica que reemplazarían.',
          },
        ],
      },
      zh: {
        word: '社会流动性',
        question: '近几十年来，社会流动性是否变得更难了，怎样才能恢复它？',
        examples: [
          {
            en: 'While politicians celebrate opportunity for all, it could be argued that rising housing costs and educational stratification have quietly frozen mobility across much of the developed world.',
            native:
              '尽管政客们赞美人人有机会，但可以认为，不断上涨的住房成本和教育分层已悄然冻结了发达世界大部分地区的流动性。',
          },
          {
            en: 'Admittedly, exceptional individuals still climb dramatically; nevertheless, the statistics suggest that birthplace and parental income predict adult outcomes with depressing accuracy.',
            native:
              '诚然，杰出的个人仍然能够戏剧性地上升；然而，统计数据表明，出生地和父母收入以令人沮丧的准确性预测着成年后的结局。',
          },
          {
            en: 'On balance, restoring mobility would demand sustained investment in early childhood and affordable housing, remedies far less glamorous than the rhetoric they would replace.',
            native:
              '总体而言，恢复流动性需要在幼儿早期和可负担住房上持续投入——这些补救措施远不如它们所取代的豪言壮语那样光鲜。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'privilege',
    questionText: 'Why do people find it so difficult to recognise their own privileges?',
    translations: {
      te: {
        word: 'ప్రత్యేక హక్కు',
        question: 'ప్రజలు తమ స్వంత ప్రత్యేక హక్కులను గుర్తించడం ఎందుకు అంత కష్టంగా భావిస్తారు?',
        examples: [
          {
            en: 'While privilege feels invisible to those who possess it, it could be argued that advantages absorbed from birth masquerade convincingly as personal merit and deserved reward.',
            native:
              'ప్రత్యేక హక్కు దాన్ని కలవారికి అదృశ్యంగా అనిపించినప్పటికీ, పుట్టుక నుండి ఇమిడిపోయిన అనుకూలతలు వ్యక్తిగత ప్రతిభగా, అర్హమైన బహుమతిగా నమ్మదగినంతగా ముసుగువేసుకుంటాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, acknowledging advantage threatens the flattering stories we tell ourselves; nevertheless, denying it simply shifts the burden of explanation onto those who never had it.',
            native:
              'నిజానికి అనుకూలతను అంగీకరించడం మనం మనకు చెప్పుకునే మెచ్చుకోలు కథలను బెదిరిస్తుంది; అయినప్పటికీ, దాన్ని తిరస్కరించడం వివరణ భారాన్ని అది ఎప్పుడూ లేనివారిపైకి జరుపుతుంది.',
          },
          {
            en: 'On balance, recognising privilege need not induce guilt; rather, it offers a clearer map of the terrain, which is arguably the beginning of any honest conversation about fairness.',
            native:
              'మొత్తానికి, ప్రత్యేక హక్కును గుర్తించడం అపరాధభావాన్ని కలిపించనవసరం లేదు; బదులుగా, అది భూభాగం యొక్క స్పష్టమైన పటాన్ని ఇస్తుంది—న్యాయం గురించిన ఏ నిజాయితీ సంభాషణకైనా ఇది ప్రారంభమని చెప్పవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'विशेषाधिकार',
        question: 'लोग अपने विशेषाधिकारों को पहचानना इतना कठिन क्यों पाते हैं?',
        examples: [
          {
            en: 'While privilege feels invisible to those who possess it, it could be argued that advantages absorbed from birth masquerade convincingly as personal merit and deserved reward.',
            native:
              'जबकि विशेषाधिकार उसे रखने वालों को अदृश्य लगता है, यह तर्क दिया जा सकता है कि जन्म से मिले लाभ विश्वसनीय रूप से व्यक्तिगत योग्यता और अर्जित पुरस्कार का भेस धारण कर लेते हैं।',
          },
          {
            en: 'Admittedly, acknowledging advantage threatens the flattering stories we tell ourselves; nevertheless, denying it simply shifts the burden of explanation onto those who never had it.',
            native:
              'यह स्वीकार करना होगा कि सुविधा स्वीकार करना उन चापलूस कहानियों को धमकाता है जो हम खुद को सुनाते हैं; फिर भी, इससे इनकार करना व्याख्या का बोझ उन लोगों पर डाल देता है जिन्हें यह कभी मिला ही नहीं।',
          },
          {
            en: 'On balance, recognising privilege need not induce guilt; rather, it offers a clearer map of the terrain, which is arguably the beginning of any honest conversation about fairness.',
            native:
              'कुल मिलाकर, विशेषाधिकार पहचानने से अपराधबोध पैदा करने की ज़रूरत नहीं; बल्कि, यह भू-भाग का एक स्पष्ट नक्शा देता है—जो तर्कतः निष्पक्षता पर किसी भी ईमानदार बातचीत की शुरुआत है।',
          },
        ],
      },
      es: {
        word: 'privilegio',
        question: '¿Por qué a la gente le resulta tan difícil reconocer sus propios privilegios?',
        examples: [
          {
            en: 'While privilege feels invisible to those who possess it, it could be argued that advantages absorbed from birth masquerade convincingly as personal merit and deserved reward.',
            native:
              'Aunque el privilegio resulta invisible para quien lo posee, podría argumentarse que las ventajas absorbidas desde el nacimiento se disfrazan convincentemente de mérito personal y recompensa merecida.',
          },
          {
            en: 'Admittedly, acknowledging advantage threatens the flattering stories we tell ourselves; nevertheless, denying it simply shifts the burden of explanation onto those who never had it.',
            native:
              'Es cierto que reconocer la ventaja amenaza las historias halagadoras que nos contamos; sin embargo, negarla simplemente traslada la carga de la explicación a quienes nunca la tuvieron.',
          },
          {
            en: 'On balance, recognising privilege need not induce guilt; rather, it offers a clearer map of the terrain, which is arguably the beginning of any honest conversation about fairness.',
            native:
              'En definitiva, reconocer el privilegio no tiene por qué inducir culpa; más bien ofrece un mapa más claro del terreno, que es posiblemente el comienzo de cualquier conversación honesta sobre la equidad.',
          },
        ],
      },
      zh: {
        word: '特权',
        question: '为什么人们很难认识到自己所享有的特权？',
        examples: [
          {
            en: 'While privilege feels invisible to those who possess it, it could be argued that advantages absorbed from birth masquerade convincingly as personal merit and deserved reward.',
            native:
              '尽管特权对拥有它的人来说是无形的，但可以认为，从出生起就吸收的优势会令人信服地伪装成个人功绩和应得的回报。',
          },
          {
            en: 'Admittedly, acknowledging advantage threatens the flattering stories we tell ourselves; nevertheless, denying it simply shifts the burden of explanation onto those who never had it.',
            native:
              '诚然，承认优势会威胁到我们讲给自己听的那些自我美化的故事；然而，否认它只是把解释的负担转嫁给了那些从未拥有过它的人。',
          },
          {
            en: 'On balance, recognising privilege need not induce guilt; rather, it offers a clearer map of the terrain, which is arguably the beginning of any honest conversation about fairness.',
            native:
              '总体而言，认识特权不必引发内疚；相反，它提供了一幅更清晰的地形图——可以说，这是任何关于公平的诚实对话的起点。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'discrimination',
    questionText: 'Why does discrimination persist even where laws clearly prohibit it?',
    translations: {
      te: {
        word: 'వివక్ష',
        question: 'చట్టాలు స్పష్టంగా నిషేధించిన చోటున్నా వివక్ష ఎందుకు కొనసాగుతుంది?',
        examples: [
          {
            en: 'While legislation has outlawed overt discrimination, it could be argued that prejudice has simply retreated into subtler forms that laws struggle to reach.',
            native:
              'చట్టబద్ధత బహిరంగ వివక్షను నిషేధించినప్పటికీ, పక్షపాతం చట్టాలు చేరుకోవడానికి ఇబ్బందిపడే సూక్ష్మమైన రూపాల్లోకి వెనక్కి వెళ్లిపోయిందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, attitudes have improved dramatically within living memory; nevertheless, unconscious bias demonstrably influences hiring, lending, and policing decisions despite sincere egalitarian intentions.',
            native:
              'నిజానికి జీవిత జ్ఞాపకాల్లో వైఖరులు నాటకీయంగా మెరుగయ్యాయి; అయినప్పటికీ, నిజాయితీగల సమానత్వ ఉద్దేశాలున్నా, అపరిచిత పక్షపాతం నియామకాలు, రుణాలు మరియు పోలీసు నిర్ణయాలను స్పష్టంగా ప్రభావితం చేస్తుంది.',
          },
          {
            en: 'On balance, ending discrimination appears to require changing institutions rather than merely hearts, since goodwill alone has never dismantled a single entrenched hierarchy.',
            native:
              'మొత్తానికి, వివక్షను అంతం చేయడానికి హృదయాలు కాకుండా సంస్థలను మార్చడం అవసరమని అనిపిస్తుంది, ఎందుకంటే సద్భావం మాత్రమే ఏ ఒక్క పాతుకుపోయిన సోపానక్రమాన్ని కూల్చలేదు.',
          },
        ],
      },
      hi: {
        word: 'भेदभाव',
        question: 'जहाँ कानून स्पष्ट रूप से इसे रोकते हैं, वहाँ भी भेदभाव क्यों बना रहता है?',
        examples: [
          {
            en: 'While legislation has outlawed overt discrimination, it could be argued that prejudice has simply retreated into subtler forms that laws struggle to reach.',
            native:
              'जबकि कानून ने खुले भेदभाव को अवैध कर दिया है, यह तर्क दिया जा सकता है कि पूर्वाग्रह बस उन सूक्ष्म रूपों में पीछे हट गया है जिन तक कानून पहुँचने में संघर्ष करते हैं।',
          },
          {
            en: 'Admittedly, attitudes have improved dramatically within living memory; nevertheless, unconscious bias demonstrably influences hiring, lending, and policing decisions despite sincere egalitarian intentions.',
            native:
              'यह स्वीकार करना होगा कि जीवित स्मृति में दृष्टिकोण नाटकीय रूप से सुधरे हैं; फिर भी, अचेतन पूर्वाग्रह ईमानदार समतावादी इरादों के बावजूद भर्ती, ऋण और पुलिसिंग निर्णयों को प्रदर्शनात्मक रूप से प्रभावित करता है।',
          },
          {
            en: 'On balance, ending discrimination appears to require changing institutions rather than merely hearts, since goodwill alone has never dismantled a single entrenched hierarchy.',
            native:
              'कुल मिलाकर, भेदभाव समाप्त करने के लिए केवल दिलों के बजाय संस्थाओं को बदलना आवश्यक लगता है, क्योंकि अकेली सद्भावना ने आज तक कोई एक भी गढ़ा हुआ पदानुक्रम नहीं गिराया।',
          },
        ],
      },
      es: {
        word: 'discriminación',
        question: '¿Por qué persiste la discriminación incluso donde las leyes la prohíben claramente?',
        examples: [
          {
            en: 'While legislation has outlawed overt discrimination, it could be argued that prejudice has simply retreated into subtler forms that laws struggle to reach.',
            native:
              'Aunque la legislación ha prohibido la discriminación abierta, podría argumentarse que el prejuicio simplemente se ha replegado hacia formas más sutiles a las que las leyes apenas llegan.',
          },
          {
            en: 'Admittedly, attitudes have improved dramatically within living memory; nevertheless, unconscious bias demonstrably influences hiring, lending, and policing decisions despite sincere egalitarian intentions.',
            native:
              'Es cierto que las actitudes han mejorado drásticamente en una generación; sin embargo, el sesgo inconsciente influye demostrablemente en decisiones de contratación, crédito y policía pese a intenciones igualitarias sinceras.',
          },
          {
            en: 'On balance, ending discrimination appears to require changing institutions rather than merely hearts, since goodwill alone has never dismantled a single entrenched hierarchy.',
            native:
              'En definitiva, acabar con la discriminación parece requerir cambiar instituciones más que corazones, ya que la buena voluntad por sí sola jamás ha desmantelado una sola jerarquía arraigada.',
          },
        ],
      },
      zh: {
        word: '歧视',
        question: '为什么即使在法律明确禁止的地方，歧视依然存在？',
        examples: [
          {
            en: 'While legislation has outlawed overt discrimination, it could be argued that prejudice has simply retreated into subtler forms that laws struggle to reach.',
            native: '尽管立法已禁止公开的歧视，但可以认为，偏见只是退入了法律难以触及的更隐蔽形式。',
          },
          {
            en: 'Admittedly, attitudes have improved dramatically within living memory; nevertheless, unconscious bias demonstrably influences hiring, lending, and policing decisions despite sincere egalitarian intentions.',
            native:
              '诚然，在世人们的记忆里，社会态度已有巨大改善；然而，无意识偏见显然影响着招聘、信贷和执法决策，尽管人们怀有真诚的平等主义意愿。',
          },
          {
            en: 'On balance, ending discrimination appears to require changing institutions rather than merely hearts, since goodwill alone has never dismantled a single entrenched hierarchy.',
            native:
              '总体而言，消除歧视似乎需要改变制度而不仅仅是人心，因为单靠善意从未拆除过任何一个根深蒂固的等级体系。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'tolerance',
    questionText: 'Are there limits to what a tolerant society should tolerate?',
    translations: {
      te: {
        word: 'సహనం',
        question: 'సహించే సమాజం సహించాల్సిన దానికి పరిమితులు ఉన్నాయా?',
        examples: [
          {
            en: 'While tolerance rightly ranks among the cardinal democratic virtues, it could be argued that tolerating intolerance itself gradually destroys the conditions that make tolerance possible.',
            native:
              'సహనం ప్రధాన ప్రజాస్వామిక సద్గుణాల్లో ఒకటిగా సరిగ్గానే నిలుస్తున్నప్పటికీ, అసహనాన్ని సహించడం సహనాన్ని సాధ్యం చేసే పరిస్థితులనే క్రమంగా నాశనం చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, drawing boundaries risks hypocrisy and abuse; nevertheless, a society unwilling to defend its foundational values may discover that its openness becomes its greatest vulnerability.',
            native:
              'నిజానికి సరిహద్దులు గీయడం పాక్షికత, దుర్వినియోగ ప్రమాదాలను కలిగి ఉంటుంది; అయినప్పటికీ, తమ పునాది విలువలను రక్షించుకోవడానికి ఇష్టపడని సమాజం తన వెల్లడి స్వభావమే తన అతిపెద్ద బలహీనత అవుతుందని కనుగొనవచ్చు.',
          },
          {
            en: 'On balance, tolerance seems wisest when extended to beliefs and identities yet withheld from violence and coercion, a distinction simpler to state than to apply consistently.',
            native:
              'మొత్తానికి, సహనం నమ్మకాలు, గుర్తింపులకు విస్తరించి, హింస, బలవంతం నుండి దూరంగా ఉన్నప్పుడు అత్యంత తెలివైనదిగా ఉంటుంది; చెప్పడానికి కంటే స్థిరంగా అమలు చేయడం కష్టమైన వ్యత్యాసం ఇది.',
          },
        ],
      },
      hi: {
        word: 'सहिष्णुता',
        question: 'क्या एक सहिष्णु समाज को जो सहना चाहिए, उसकी कोई सीमाएँ हैं?',
        examples: [
          {
            en: 'While tolerance rightly ranks among the cardinal democratic virtues, it could be argued that tolerating intolerance itself gradually destroys the conditions that make tolerance possible.',
            native:
              'जबकि सहिष्णुता प्रमुख लोकतांत्रिक गुणों में सही रूप से गिनी जाती है, यह तर्क दिया जा सकता है कि असहिष्णुता को सहना धीरे-धीरे उन्हीं परिस्थितियों को नष्ट कर देता है जो सहिष्णुता को संभव बनाती हैं।',
          },
          {
            en: 'Admittedly, drawing boundaries risks hypocrisy and abuse; nevertheless, a society unwilling to defend its foundational values may discover that its openness becomes its greatest vulnerability.',
            native:
              'यह स्वीकार करना होगा कि सीमाएँ खींचना पाखंड और दुरुपयोग का जोखिम लाता है; फिर भी, अपने मूलभूत मूल्यों की रक्षा करने को तैयार न रहने वाला समाज पा सकता है कि उसका खुलापन उसकी सबसे बड़ी कमज़ोरी बन जाए।',
          },
          {
            en: 'On balance, tolerance seems wisest when extended to beliefs and identities yet withheld from violence and coercion, a distinction simpler to state than to apply consistently.',
            native:
              'कुल मिलाकर, सहिष्णुता तब सबसे बुद्धिमान लगती है जब वह मान्यताओं और पहचानों तक विस्तारित हो, पर हिंसा और जबरदस्ती से रोकी जाए—यह अंतर कहने में जितना आसान है, लगातार लागू करने में उतना नहीं।',
          },
        ],
      },
      es: {
        word: 'tolerancia',
        question: '¿Hay límites a lo que una sociedad tolerante debería tolerar?',
        examples: [
          {
            en: 'While tolerance rightly ranks among the cardinal democratic virtues, it could be argued that tolerating intolerance itself gradually destroys the conditions that make tolerance possible.',
            native:
              'Aunque la tolerancia se cuenta con razón entre las virtudes democráticas cardinales, podría argumentarse que tolerar la intolerancia misma destruye gradualmente las condiciones que hacen posible la tolerancia.',
          },
          {
            en: 'Admittedly, drawing boundaries risks hypocrisy and abuse; nevertheless, a society unwilling to defend its foundational values may discover that its openness becomes its greatest vulnerability.',
            native:
              'Es cierto que trazar límites arriesga hipocresía y abuso; sin embargo, una sociedad que no está dispuesta a defender sus valores fundamentales puede descubrir que su apertura se convierte en su mayor vulnerabilidad.',
          },
          {
            en: 'On balance, tolerance seems wisest when extended to beliefs and identities yet withheld from violence and coercion, a distinction simpler to state than to apply consistently.',
            native:
              'En definitiva, la tolerancia parece más sabia cuando se extiende a creencias e identidades pero se niega a la violencia y la coacción, una distinción más fácil de enunciar que de aplicar con coherencia.',
          },
        ],
      },
      zh: {
        word: '宽容',
        question: '一个宽容的社会所应容忍的事物是否有其限度？',
        examples: [
          {
            en: 'While tolerance rightly ranks among the cardinal democratic virtues, it could be argued that tolerating intolerance itself gradually destroys the conditions that make tolerance possible.',
            native: '尽管宽容理当位列民主的基本美德之中，但可以认为，容忍不宽容本身会逐渐摧毁使宽容成为可能的条件。',
          },
          {
            en: 'Admittedly, drawing boundaries risks hypocrisy and abuse; nevertheless, a society unwilling to defend its foundational values may discover that its openness becomes its greatest vulnerability.',
            native:
              '诚然，划定界限有虚伪和滥用的风险；然而，一个不愿捍卫其基本价值的社会可能会发现，它的开放反而成了它最大的软肋。',
          },
          {
            en: 'On balance, tolerance seems wisest when extended to beliefs and identities yet withheld from violence and coercion, a distinction simpler to state than to apply consistently.',
            native:
              '总体而言，宽容在延伸至信仰和身份、却拒绝对暴力和胁迫让步时似乎最为明智——这一区别说起来容易，要始终贯彻却难。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'diversity',
    questionText: 'Does cultural diversity strengthen societies, or does it make social cohesion harder to maintain?',
    translations: {
      te: {
        word: 'వైవిధ్యం',
        question: 'సాంస్కృతిక వైవిధ్యం సమాజాలను బలపరుస్తుందా, లేక సామాజిక ఐక్యతను కొనసాగించడాన్ని కష్టతరం చేస్తుందా?',
        examples: [
          {
            en: 'While diversity undeniably enriches cuisine, art, and ideas, it could be argued that it demands deliberate effort, since difference alone never guarantees mutual understanding.',
            native:
              'వైవిధ్యం వంటకాలనూ, కళలనూ, ఆలోచనలనూ నిస్సందేహంగా సమృద్ధి చేసినప్పటికీ, భేదం మాత్రమే పరస్పర అవగాహనను ఎప్పుడూ హామీ ఇవ్వదు కాబట్టి అది ఉద్దేశపూర్వక కృషిని కోరుతుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, homogeneous societies enjoy an easy, unspoken solidarity; nevertheless, they also tend towards complacency, mistaking familiarity for virtue and outsiders for threats.',
            native:
              'నిజానికి సజాతీయ సమాజాలు సులభమైన, చెప్పని ఐక్యతను అనుభవిస్తాయి; అయినప్పటికీ, అవి స్వపరిపూర్ణత వైపు మొగ్గు చూపుతాయి, పరిచయాన్ని సద్గుణంగా, బయటివారిని ముప్పులుగా భ్రమపడతాయి.',
          },
          {
            en: 'On balance, cohesion seems to depend less on sameness than on shared institutions and fair treatment, which suggests diversity itself is rarely the actual problem.',
            native:
              'మొత్తానికి, ఐక్యత ఏకరూపత కంటే ఉమ్మడి సంస్థలు, న్యాయమైన వ్యవహారంపై ఎక్కువగా ఆధారపడుతుందని అనిపిస్తుంది; వైవిధ్యమే అసలు సమస్య అరుదని ఇది సూచిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'विविधता',
        question: 'क्या सांस्कृतिक विविधता समाजों को मज़बूत बनाती है, या सामाजिक एकजुटता बनाए रखना कठिन कर देती है?',
        examples: [
          {
            en: 'While diversity undeniably enriches cuisine, art, and ideas, it could be argued that it demands deliberate effort, since difference alone never guarantees mutual understanding.',
            native:
              'जबकि विविधता निस्संदेह व्यंजन, कला और विचारों को समृद्ध करती है, यह तर्क दिया जा सकता है कि इसके लिए जानबूझकर प्रयास चाहिए, क्योंकि अकेला अंतर कभी पारस्परिक समझ की गारंटी नहीं देता।',
          },
          {
            en: 'Admittedly, homogeneous societies enjoy an easy, unspoken solidarity; nevertheless, they also tend towards complacency, mistaking familiarity for virtue and outsiders for threats.',
            native:
              'यह स्वीकार करना होगा कि सजातीय समाज एक सहज, अकथित एकजुटता का आनंद लेते हैं; फिर भी, वे आत्मसंतोष की ओर भी झुकते हैं, परिचितता को गुण और बाहरी लोगों को खतरा समझ बैठते हैं।',
          },
          {
            en: 'On balance, cohesion seems to depend less on sameness than on shared institutions and fair treatment, which suggests diversity itself is rarely the actual problem.',
            native:
              'कुल मिलाकर, एकजुटता समानता से कम और साझा संस्थाओं तथा निष्पक्ष व्यवहार पर अधिक निर्भर लगती है—इससे पता चलता है कि विविधता स्वयं शायद ही कभी वास्तविक समस्या होती है।',
          },
        ],
      },
      es: {
        word: 'diversidad',
        question: '¿Fortalece la diversidad cultural a las sociedades, o dificulta mantener la cohesión social?',
        examples: [
          {
            en: 'While diversity undeniably enriches cuisine, art, and ideas, it could be argued that it demands deliberate effort, since difference alone never guarantees mutual understanding.',
            native:
              'Aunque la diversidad indudablemente enriquece la cocina, el arte y las ideas, podría argumentarse que exige un esfuerzo deliberado, ya que la diferencia por sí sola nunca garantiza la comprensión mutua.',
          },
          {
            en: 'Admittedly, homogeneous societies enjoy an easy, unspoken solidarity; nevertheless, they also tend towards complacency, mistaking familiarity for virtue and outsiders for threats.',
            native:
              'Es cierto que las sociedades homogéneas disfrutan de una solidaridad fácil y tácita; sin embargo, también tienden a la complacencia, confundiendo la familiaridad con la virtud y a los forasteros con amenazas.',
          },
          {
            en: 'On balance, cohesion seems to depend less on sameness than on shared institutions and fair treatment, which suggests diversity itself is rarely the actual problem.',
            native:
              'En definitiva, la cohesión parece depender menos de la uniformidad que de las instituciones compartidas y el trato justo, lo que sugiere que la diversidad en sí rara vez es el verdadero problema.',
          },
        ],
      },
      zh: {
        word: '多样性',
        question: '文化多样性是增强了社会，还是让社会凝聚力更难维持？',
        examples: [
          {
            en: 'While diversity undeniably enriches cuisine, art, and ideas, it could be argued that it demands deliberate effort, since difference alone never guarantees mutual understanding.',
            native:
              '尽管多样性无疑丰富了美食、艺术和思想，但可以认为，它需要刻意的努力，因为仅仅存在差异并不能保证相互理解。',
          },
          {
            en: 'Admittedly, homogeneous societies enjoy an easy, unspoken solidarity; nevertheless, they also tend towards complacency, mistaking familiarity for virtue and outsiders for threats.',
            native:
              '诚然，同质化的社会享有一种轻松而不言自明的团结；然而，它们也容易陷入自满，把熟悉误认为美德，把外来者误认为威胁。',
          },
          {
            en: 'On balance, cohesion seems to depend less on sameness than on shared institutions and fair treatment, which suggests diversity itself is rarely the actual problem.',
            native:
              '总体而言，凝聚力似乎更多地取决于共同的制度和公平的对待，而非整齐划一——这表明多样性本身很少是真正的问题。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'multiculturalism',
    questionText: 'Has multiculturalism succeeded as a policy, or should newcomers be expected to assimilate?',
    translations: {
      te: {
        word: 'బహుళ సంస్కృతివాదం',
        question: 'విధానంగా బహుళ సంస్కృతివాదం విజయవంతమైందా, లేక కొత్తగా వచ్చినవారు విలీనం కావాలని ఆశించాలా?',
        examples: [
          {
            en: 'While critics declare multiculturalism a failure, it could be argued that the alternatives, forced assimilation and exclusion, have historically produced far deeper resentments.',
            native:
              'విమర్శకులు బహుళ సంస్కృతివాదం విఫలమైందని ప్రకటించినప్పటికీ, బలవంతపు విలీనం, మినహాయింపు అనే ప్రత్యామ్నాయాలు చారిత్రకంగా చాలా లోతైన అసంతృప్తులను సృష్టించాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, parallel communities can develop when integration is neglected; nevertheless, the evidence suggests most second-generation immigrants adopt the majority language and customs with ease.',
            native:
              'నిజానికి విలీనం నిర్లక్ష్యం చేయబడినప్పుడు సమాంతర సమాజాలు ఏర్పడవచ్చు; అయినప్పటికీ, చాలామంది రెండో తరం వలసదారులు మెజారిటీ భాషనూ ఆచారాలనూ సులభంగా అవలంబిస్తారని సాక్ష్యాలు సూచిస్తున్నాయి.',
          },
          {
            en: 'On balance, multiculturalism seems less a rigid doctrine than a pragmatic recognition that belonging cannot be commanded, only patiently and fairly encouraged.',
            native:
              'మొత్తానికి, బహుళ సంస్కృతివాదం కఠోర సిద్ధాంతం కంటే, చేరికను ఆజ్ఞాపించలేము, కేవలం సహనంగా, న్యాయంగా ప్రోత్సహించగలమనే ఆచరణాత్మక గుర్తింపుగా కనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'बहुसांस्कृतिकवाद',
        question:
          'क्या बहुसांस्कृतिकवाद एक नीति के रूप में सफल रहा है, या नवागंतुकों से घुल-मिल जाने की अपेक्षा की जानी चाहिए?',
        examples: [
          {
            en: 'While critics declare multiculturalism a failure, it could be argued that the alternatives, forced assimilation and exclusion, have historically produced far deeper resentments.',
            native:
              'जबकि आलोचक बहुसांस्कृतिकवाद को असफल घोषित करते हैं, यह तर्क दिया जा सकता है कि विकल्प—जबरन समाकलन और बहिष्कार—ऐतिहासिक रूप से कहीं गहरी नाराज़गियाँ पैदा कर चुके हैं।',
          },
          {
            en: 'Admittedly, parallel communities can develop when integration is neglected; nevertheless, the evidence suggests most second-generation immigrants adopt the majority language and customs with ease.',
            native:
              'यह स्वीकार करना होगा कि एकीकरण की उपेक्षा होने पर समानांतर समुदाय विकसित हो सकते हैं; फिर भी, प्रमाण बताते हैं कि अधिकांश दूसरी पीढ़ी के आप्रवासी बहुमत की भाषा और रीति-रिवाज़ों को आसानी से अपना लेते हैं।',
          },
          {
            en: 'On balance, multiculturalism seems less a rigid doctrine than a pragmatic recognition that belonging cannot be commanded, only patiently and fairly encouraged.',
            native:
              'कुल मिलाकर, बहुसांस्कृतिकवाद किसी कठोर सिद्धांत से कम और इस व्यावहारिक स्वीकृति जैसा अधिक लगता है कि अपनेपन का आदेश नहीं दिया जा सकता, बस धैर्य और निष्पक्षता से प्रोत्साहित किया जा सकता है।',
          },
        ],
      },
      es: {
        word: 'multiculturalismo',
        question:
          '¿Ha tenido éxito el multiculturalismo como política, o debería esperarse que los recién llegados se asimilen?',
        examples: [
          {
            en: 'While critics declare multiculturalism a failure, it could be argued that the alternatives, forced assimilation and exclusion, have historically produced far deeper resentments.',
            native:
              'Aunque los críticos declaran fracasado el multiculturalismo, podría argumentarse que las alternativas, la asimilación forzada y la exclusión, han producido históricamente resentimientos mucho más profundos.',
          },
          {
            en: 'Admittedly, parallel communities can develop when integration is neglected; nevertheless, the evidence suggests most second-generation immigrants adopt the majority language and customs with ease.',
            native:
              'Es cierto que pueden surgir comunidades paralelas cuando se descuida la integración; sin embargo, la evidencia sugiere que la mayoría de los inmigrantes de segunda generación adoptan con facilidad el idioma y las costumbres mayoritarios.',
          },
          {
            en: 'On balance, multiculturalism seems less a rigid doctrine than a pragmatic recognition that belonging cannot be commanded, only patiently and fairly encouraged.',
            native:
              'En definitiva, el multiculturalismo parece menos una doctrina rígida que un reconocimiento pragmático de que la pertenencia no puede ordenarse, solo fomentarse con paciencia y equidad.',
          },
        ],
      },
      zh: {
        word: '多元文化主义',
        question: '多元文化主义作为一项政策成功了吗，还是应当要求新移民融入主流？',
        examples: [
          {
            en: 'While critics declare multiculturalism a failure, it could be argued that the alternatives, forced assimilation and exclusion, have historically produced far deeper resentments.',
            native:
              '尽管批评者宣称多元文化主义失败了，但可以认为，其替代方案——强制同化和排斥——在历史上造成了深得多的怨恨。',
          },
          {
            en: 'Admittedly, parallel communities can develop when integration is neglected; nevertheless, the evidence suggests most second-generation immigrants adopt the majority language and customs with ease.',
            native:
              '诚然，当融合被忽视时，可能形成平行社区；然而，证据表明，大多数第二代移民都能轻松采用多数群体的语言和习俗。',
          },
          {
            en: 'On balance, multiculturalism seems less a rigid doctrine than a pragmatic recognition that belonging cannot be commanded, only patiently and fairly encouraged.',
            native:
              '总体而言，多元文化主义与其说是一条僵硬的教条，不如说是一种务实的认识：归属感无法靠命令获得，只能耐心而公平地培养。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'assimilation',
    questionText: 'What do immigrants gain and lose when they assimilate into a new culture?',
    translations: {
      te: {
        word: 'విలీనం',
        question: 'కొత్త సంస్కృతిలో విలీనం అయినప్పుడు వలసదారులు ఏమి పొందుతారు, ఏమి కోల్పోతారు?',
        examples: [
          {
            en: 'While assimilation eases daily life and broadens opportunity, it could be argued that the pressure to conform exacts a quiet toll on identity, language, and family memory.',
            native:
              'విలీనం దైనందిన జీవితాన్ని సులభతరం చేసి అవకాశాలను విస్తరించినప్పటికీ, అనుగుణంగా ఉండాల్సిన ఒత్తిడి గుర్తింపు, భాష మరియు కుటుంబ జ్ఞాపకాలపై నిశ్శబ్దమైన ధర విధిస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, every migrant negotiates some blending of old and new; nevertheless, those who assimilate most completely often describe a peculiar grief that others find difficult to understand.',
            native:
              'నిజానికి ప్రతి వలసదారు కొత్తది, పాతది కలిపే ఏదో ఒక సర్దుబాటు చేస్తారు; అయినప్పటికీ, అత్యంత పూర్తిగా విలీనమైనవారు తరచుగా ఇతరులకు అర్థం కాని విచిత్రమైన దుఃఖాన్ని వర్ణిస్తారు.',
          },
          {
            en: 'On balance, assimilation seems healthiest when it remains a choice rather than an obligation, since genuine belonging has never yet been produced by compulsion.',
            native:
              'మొత్తానికి, విలీనం బాధ్యత కంటే ఎంపికగా ఉన్నప్పుడు అత్యంత ఆరోగ్యకరంగా ఉంటుంది, ఎందుకంటే బలవంతంతో నిజమైన చేరిక ఇంతవరకూ ఎప్పుడూ ఉత్పత్తి కాలేదు.',
          },
        ],
      },
      hi: {
        word: 'समाकलन',
        question: 'जब आप्रवासी किसी नई संस्कृति में घुल जाते हैं तो वे क्या पाते हैं और क्या खोते हैं?',
        examples: [
          {
            en: 'While assimilation eases daily life and broadens opportunity, it could be argued that the pressure to conform exacts a quiet toll on identity, language, and family memory.',
            native:
              'जबकि समाकलन दैनिक जीवन आसान करता है और अवसर बढ़ाता है, यह तर्क दिया जा सकता है कि अनुकूलन का दबाव पहचान, भाषा और पारिवारिक स्मृति पर एक मौन कीमत वसूलता है।',
          },
          {
            en: 'Admittedly, every migrant negotiates some blending of old and new; nevertheless, those who assimilate most completely often describe a peculiar grief that others find difficult to understand.',
            native:
              'यह स्वीकार करना होगा कि हर प्रवासी पुराने और नए का कोई न कोई मिश्रण करता है; फिर भी, जो सबसे पूरी तरह घुल जाते हैं, वे अक्सर एक विचित्र शोक का वर्णन करते हैं जिसे दूसरे समझना कठिन पाते हैं।',
          },
          {
            en: 'On balance, assimilation seems healthiest when it remains a choice rather than an obligation, since genuine belonging has never yet been produced by compulsion.',
            native:
              'कुल मिलाकर, समाकलन तब सबसे स्वस्थ लगता है जब वह दायित्व के बजाय एक विकल्प रहे, क्योंकि वास्तविक अपनेपन को आज तक मजबूरी से कभी पैदा नहीं किया गया है।',
          },
        ],
      },
      es: {
        word: 'asimilación',
        question: '¿Qué ganan y qué pierden los inmigrantes cuando se asimilan a una nueva cultura?',
        examples: [
          {
            en: 'While assimilation eases daily life and broadens opportunity, it could be argued that the pressure to conform exacts a quiet toll on identity, language, and family memory.',
            native:
              'Aunque la asimilación facilita la vida diaria y amplía las oportunidades, podría argumentarse que la presión por conformarse cobra un precio silencioso sobre la identidad, la lengua y la memoria familiar.',
          },
          {
            en: 'Admittedly, every migrant negotiates some blending of old and new; nevertheless, those who assimilate most completely often describe a peculiar grief that others find difficult to understand.',
            native:
              'Es cierto que todo migrante negocia alguna mezcla de lo viejo y lo nuevo; sin embargo, quienes se asimilan más por completo a menudo describen un dolor peculiar que a otros les resulta difícil de comprender.',
          },
          {
            en: 'On balance, assimilation seems healthiest when it remains a choice rather than an obligation, since genuine belonging has never yet been produced by compulsion.',
            native:
              'En definitiva, la asimilación parece más saludable cuando sigue siendo una elección y no una obligación, ya que la pertenencia genuina jamás ha sido producida por la compulsión.',
          },
        ],
      },
      zh: {
        word: '同化',
        question: '移民在融入新文化时得到了什么，又失去了什么？',
        examples: [
          {
            en: 'While assimilation eases daily life and broadens opportunity, it could be argued that the pressure to conform exacts a quiet toll on identity, language, and family memory.',
            native:
              '尽管同化让日常生活更便利、机会更广阔，但可以认为，顺从的压力会悄悄地索取身份、语言和家族记忆作为代价。',
          },
          {
            en: 'Admittedly, every migrant negotiates some blending of old and new; nevertheless, those who assimilate most completely often describe a peculiar grief that others find difficult to understand.',
            native:
              '诚然，每个移民都要在新旧之间做出某种调和；然而，同化得最彻底的人往往会描述一种旁人难以理解的奇特哀伤。',
          },
          {
            en: 'On balance, assimilation seems healthiest when it remains a choice rather than an obligation, since genuine belonging has never yet been produced by compulsion.',
            native: '总体而言，当同化是一种选择而非义务时，它似乎最为健康，因为真正的归属感从来无法靠强迫产生。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'heritage',
    questionText:
      'Should preserving cultural heritage be a priority, even when it conflicts with economic development?',
    translations: {
      te: {
        word: 'వారసత్వం',
        question: 'ఆర్థిక అభివృద్ధితో విభేదించినప్పటికీ, సాంస్కృతిక వారసత్వాన్ని కాపాడడం ప్రాధాన్యం కావాలా?',
        examples: [
          {
            en: 'While development advocates dismiss preservation as nostalgia, it could be argued that heritage anchors collective identity in ways that GDP figures entirely fail to capture.',
            native:
              'అభివృద్ధి సమర్థకులు పరిరక్షణను పురాతన భావనగా తక్కువ చేసినప్పటికీ, జీడీపీ గణాంకాలు పూర్తిగా పట్టుకోలేని విధంగా వారసత్వం సామూహిక గుర్తింపును స్థిరపరుస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, not every old building merits saving; nevertheless, societies that demolish their past for short-term profit frequently express regret within a single generation.',
            native:
              'నిజానికి ప్రతి పాత భవనమూ కాపాడటానికి అర్హం కాదు; అయినప్పటికీ, స్వల్పకాలిక లాభం కోసం తమ గతాన్ని కూల్చే సమాజాలు తరచుగా ఒక్క తరంలోపే పశ్చాత్తాపం వ్యక్తం చేస్తాయి.',
          },
          {
            en: 'On balance, preservation seems wisest when selective and living, since a heritage reduced to museum pieces arguably loses the vitality that made it worth keeping.',
            native:
              'మొత్తానికి, పరిరక్షణ ఎంపికగా, జీవంతంగా ఉన్నప్పుడు అత్యంత తెలివైనది, ఎందుకంటే మ్యూజియం వస్తువులుగా తగ్గిన వారసత్వం దాన్ని కాపాడదగ్గ చైతన్యాన్ని కోల్పోతుందని చెప్పవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'विरासत',
        question: 'क्या सांस्कृतिक विरासत को संरक्षित करना प्राथमिकता होनी चाहिए, भले ही यह आर्थिक विकास से टकराए?',
        examples: [
          {
            en: 'While development advocates dismiss preservation as nostalgia, it could be argued that heritage anchors collective identity in ways that GDP figures entirely fail to capture.',
            native:
              'जबकि विकास समर्थक संरक्षण को पुराने की चाह कहकर खारिज करते हैं, यह तर्क दिया जा सकता है कि विरासत सामूहिक पहचान को उन तरीकों से सुधृढ़ करती है जिन्हें जीडीपी के आँकड़े बिल्कुल पकड़ नहीं पाते।',
          },
          {
            en: 'Admittedly, not every old building merits saving; nevertheless, societies that demolish their past for short-term profit frequently express regret within a single generation.',
            native:
              'यह स्वीकार करना होगा कि हर पुरानी इमारत बचाने लायक नहीं है; फिर भी, अल्पकालिक लाभ के लिए अपना अतीत गिराने वाले समाज अक्सर एक ही पीढ़ी के भीतर पछतावा व्यक्त करते हैं।',
          },
          {
            en: 'On balance, preservation seems wisest when selective and living, since a heritage reduced to museum pieces arguably loses the vitality that made it worth keeping.',
            native:
              'कुल मिलाकर, संरक्षण तब सबसे बुद्धिमान लगता है जब वह चयनात्मक और जीवंत हो, क्योंकि संग्रहालय की वस्तुओं तक सीमित विरासत तर्कतः वही जीवंतता खो देती है जिसके लिए उसे रखना सार्थक था।',
          },
        ],
      },
      es: {
        word: 'patrimonio',
        question:
          '¿Debería ser prioritario preservar el patrimonio cultural, incluso cuando entra en conflicto con el desarrollo económico?',
        examples: [
          {
            en: 'While development advocates dismiss preservation as nostalgia, it could be argued that heritage anchors collective identity in ways that GDP figures entirely fail to capture.',
            native:
              'Aunque los defensores del desarrollo descartan la preservación como nostalgia, podría argumentarse que el patrimonio ancla la identidad colectiva de maneras que las cifras del PIB no capturan en absoluto.',
          },
          {
            en: 'Admittedly, not every old building merits saving; nevertheless, societies that demolish their past for short-term profit frequently express regret within a single generation.',
            native:
              'Es cierto que no todo edificio antiguo merece salvarse; sin embargo, las sociedades que demuelen su pasado por beneficios a corto plazo frecuentemente expresan arrepentimiento en una sola generación.',
          },
          {
            en: 'On balance, preservation seems wisest when selective and living, since a heritage reduced to museum pieces arguably loses the vitality that made it worth keeping.',
            native:
              'En definitiva, la preservación parece más sabia cuando es selectiva y viva, ya que un patrimonio reducido a piezas de museo pierde posiblemente la vitalidad que lo hacía digno de conservar.',
          },
        ],
      },
      zh: {
        word: '文化遗产',
        question: '即使与经济发展相冲突，保护文化遗产是否也应当作为优先事项？',
        examples: [
          {
            en: 'While development advocates dismiss preservation as nostalgia, it could be argued that heritage anchors collective identity in ways that GDP figures entirely fail to capture.',
            native:
              '尽管发展的倡导者把保护斥为怀旧，但可以认为，遗产以国内生产总值数据完全无法捕捉的方式锚定着集体认同。',
          },
          {
            en: 'Admittedly, not every old building merits saving; nevertheless, societies that demolish their past for short-term profit frequently express regret within a single generation.',
            native: '诚然，并非每栋老建筑都值得保留；然而，为短期利益拆除历史的社会，往往不出一代人就会表达悔意。',
          },
          {
            en: 'On balance, preservation seems wisest when selective and living, since a heritage reduced to museum pieces arguably loses the vitality that made it worth keeping.',
            native:
              '总体而言，有选择且活态的保护似乎最明智，因为沦为博物馆藏品的遗产可以说失去了最初使其值得保存的活力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'tradition',
    questionText: 'When should traditions be preserved, and when should they be abandoned?',
    translations: {
      te: {
        word: 'సంప్రదాయం',
        question: 'సంప్రదాయాలను ఎప్పుడు కాపాడాలి, ఎప్పుడు వదిలివేయాలి?',
        examples: [
          {
            en: 'While traditions provide continuity and belonging, it could be argued that some deserve preservation only as history, not as obligations imposed upon the living.',
            native:
              'సంప్రదాయాలు అన్వయాన్నీ చేరికనూ అందించినప్పటికీ, కొన్నింటిని జీవించేవారిపై విధించే బాధ్యతలుగా కాకుండా కేవలం చరిత్రగా మాత్రమే కాపాడాలని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, every generation reformulates what it inherits; nevertheless, discarding customs wholesale risks severing the threads that connect individuals to something larger than themselves.',
            native:
              'నిజానికి ప్రతి తరం తాను వారసత్వంగా పొందినదాన్ని తిరిగి రూపొందిస్తుంది; అయినప్పటికీ, ఆచారాలను మొత్తంగా పడేయడం వ్యక్తులను వారికంటే గొప్ప దేనితోనూ కలిపే దారాలను తెంచే ప్రమాదం ఉంది.',
          },
          {
            en: "On balance, a tradition's value seems to lie in whether it still nourishes human flourishing, a test far more demanding than mere age or sentimental attachment.",
            native:
              'మొత్తానికి, సంప్రదాయం విలువ అది ఇంకా మానవ వికాసాన్ని పోషిస్తుందా లేదా అనే దానిపై ఆధారపడి ఉంటుంది; కేవలం పురాతనత్వం లేదా భావోద్వేగ అనుబంధం కంటే ఇది చాలా కఠినమైన పరీక్ష.',
          },
        ],
      },
      hi: {
        word: 'परंपरा',
        question: 'परंपराओं को कब संरक्षित किया जाना चाहिए, और कब त्याग देना चाहिए?',
        examples: [
          {
            en: 'While traditions provide continuity and belonging, it could be argued that some deserve preservation only as history, not as obligations imposed upon the living.',
            native:
              'जबकि परंपराएँ निरंतरता और अपनेपन देती हैं, यह तर्क दिया जा सकता है कि कुछ केवल इतिहास के रूप में संरक्षण की हक़दार हैं, जीवित लोगों पर थोपे गए दायित्वों के रूप में नहीं।',
          },
          {
            en: 'Admittedly, every generation reformulates what it inherits; nevertheless, discarding customs wholesale risks severing the threads that connect individuals to something larger than themselves.',
            native:
              'यह स्वीकार करना होगा कि हर पीढ़ी अपनी विरासत को नया रूप देती है; फिर भी, रीति-रिवाज़ों को थोक में त्यागना उन धागों को काटने का जोखिम लाता है जो व्यक्तियों को उनसे बड़ी किसी चीज़ से जोड़ते हैं।',
          },
          {
            en: "On balance, a tradition's value seems to lie in whether it still nourishes human flourishing, a test far more demanding than mere age or sentimental attachment.",
            native:
              'कुल मिलाकर, परंपरा का मूल्य इसमें निहित लगता है कि क्या वह अब भी मानवीय समृद्धि का पोषण करती है—यह परीक्षा महज़ पुरानापन या भावनात्मक लगाव से कहीं अधिक कठिन है।',
          },
        ],
      },
      es: {
        word: 'tradición',
        question: '¿Cuándo deberían preservarse las tradiciones y cuándo abandonarse?',
        examples: [
          {
            en: 'While traditions provide continuity and belonging, it could be argued that some deserve preservation only as history, not as obligations imposed upon the living.',
            native:
              'Aunque las tradiciones aportan continuidad y pertenencia, podría argumentarse que algunas merecen preservarse solo como historia, no como obligaciones impuestas a los vivos.',
          },
          {
            en: 'Admittedly, every generation reformulates what it inherits; nevertheless, discarding customs wholesale risks severing the threads that connect individuals to something larger than themselves.',
            native:
              'Es cierto que cada generación reformula lo que hereda; sin embargo, descartar las costumbres al por mayor arriesga cortar los hilos que conectan a los individuos con algo más grande que ellos mismos.',
          },
          {
            en: "On balance, a tradition's value seems to lie in whether it still nourishes human flourishing, a test far more demanding than mere age or sentimental attachment.",
            native:
              'En definitiva, el valor de una tradición parece residir en si aún nutre el florecimiento humano, una prueba mucho más exigente que la mera antigüedad o el apego sentimental.',
          },
        ],
      },
      zh: {
        word: '传统',
        question: '传统应当在什么时候被保留，又在什么时候被抛弃？',
        examples: [
          {
            en: 'While traditions provide continuity and belonging, it could be argued that some deserve preservation only as history, not as obligations imposed upon the living.',
            native:
              '尽管传统提供了延续性和归属感，但可以认为，有些传统只值得作为历史来保存，而不应作为强加给生者的义务。',
          },
          {
            en: 'Admittedly, every generation reformulates what it inherits; nevertheless, discarding customs wholesale risks severing the threads that connect individuals to something larger than themselves.',
            native:
              '诚然，每一代人都会重新诠释所继承的东西；然而，全盘抛弃习俗有可能切断把个人与超越自身的事物联系起来的纽带。',
          },
          {
            en: "On balance, a tradition's value seems to lie in whether it still nourishes human flourishing, a test far more demanding than mere age or sentimental attachment.",
            native:
              '总体而言，传统的价值似乎在于它是否仍然滋养着人类的蓬勃发展——这一考验远比单纯的古老或情感依恋更为严苛。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'progress',
    questionText: 'Is human progress inevitable, or could societies move backwards?',
    translations: {
      te: {
        word: 'పురోగతి',
        question: 'మానవ పురోగతి అనివార్యమా, లేక సమాజాలు వెనక్కి వెళ్లవచ్చా?',
        examples: [
          {
            en: 'While optimists treat progress as a law of nature, it could be argued that history records as many civilisational collapses as it does advances.',
            native:
              'ఆశావాదులు పురోగతిని ప్రకృతి నియమంగా భావించినప్పటికీ, చరిత్ర పురోగతులన్నింటిని అంతే నాగరికతా పతనాలను కూడా నమోదు చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, material living standards have risen spectacularly; nevertheless, moral and political gains appear disturbingly reversible whenever fear displaces reason in public life.',
            native:
              'నిజానికి భౌతిక జీవన ప్రమాణాలు అద్భుతంగా పెరిగాయి; అయినప్పటికీ, ప్రజా జీవితంలో భయం తర్కాన్ని వెనక్కి నెట్టినప్పుడల్లా నైతిక, రాజకీయ పురోగతులు కలవరపరిచేంతగా రద్దయ్యేలా కనిపిస్తాయి.',
          },
          {
            en: 'On balance, progress seems less like an escalator than a staircase we must keep climbing deliberately, since standing still, in effect, means slowly moving backwards.',
            native:
              'మొత్తానికి, పురోగతి ఎస్కలేటర్ కంటే మనం ఉద్దేశపూర్వకంగా ఎక్కుతూనే ఉండాల్సిన మెట్లలా కనిపిస్తుంది, ఎందుకంటే నిలిచిపోవడం వాస్తవానికి నెమ్మదిగా వెనక్కి వెళ్లడమే.',
          },
        ],
      },
      hi: {
        word: 'प्रगति',
        question: 'क्या मानवीय प्रगति अनिवार्य है, या समाज पीछे भी जा सकते हैं?',
        examples: [
          {
            en: 'While optimists treat progress as a law of nature, it could be argued that history records as many civilisational collapses as it does advances.',
            native:
              'जबकि आशावादी प्रगति को प्रकृति का नियम मानते हैं, यह तर्क दिया जा सकता है कि इतिहास उतनी ही सभ्यताओं के पतन को भी दर्ज करता है जितनी प्रगतियों को।',
          },
          {
            en: 'Admittedly, material living standards have risen spectacularly; nevertheless, moral and political gains appear disturbingly reversible whenever fear displaces reason in public life.',
            native:
              'यह स्वीकार करना होगा कि भौतिक जीवन स्तर शानदार रूप से ऊँचा हुआ है; फिर भी, जब भी सार्वजनिक जीवन में भय तर्क की जगह लेता है, नैतिक और राजनीतिक उपलब्धियाँ चौंकाने वाली तरह से उलटने योग्य लगती हैं।',
          },
          {
            en: 'On balance, progress seems less like an escalator than a staircase we must keep climbing deliberately, since standing still, in effect, means slowly moving backwards.',
            native:
              'कुल मिलाकर, प्रगति एस्केलेटर से कम और उस सीढ़ी जैसी अधिक लगती है जिसे हमें जानबूझकर चढ़ते रहना होगा, क्योंकि रुक जाना वास्तव में धीरे-धीरे पीछे जाना है।',
          },
        ],
      },
      es: {
        word: 'progreso',
        question: '¿Es inevitable el progreso humano, o podrían las sociedades retroceder?',
        examples: [
          {
            en: 'While optimists treat progress as a law of nature, it could be argued that history records as many civilisational collapses as it does advances.',
            native:
              'Aunque los optimistas tratan el progreso como una ley de la naturaleza, podría argumentarse que la historia registra tantos colapsos civilizatorios como avances.',
          },
          {
            en: 'Admittedly, material living standards have risen spectacularly; nevertheless, moral and political gains appear disturbingly reversible whenever fear displaces reason in public life.',
            native:
              'Es cierto que los niveles materiales de vida han subido espectacularmente; sin embargo, los avances morales y políticos parecen inquietantemente reversibles cada vez que el miedo desplaza a la razón en la vida pública.',
          },
          {
            en: 'On balance, progress seems less like an escalator than a staircase we must keep climbing deliberately, since standing still, in effect, means slowly moving backwards.',
            native:
              'En definitiva, el progreso parece menos una escalera mecánica que una escalinata que debemos seguir subiendo deliberadamente, ya que quedarse quieto equivale, en efecto, a retroceder lentamente.',
          },
        ],
      },
      zh: {
        word: '进步',
        question: '人类的进步是不可避免的吗，还是社会也可能倒退？',
        examples: [
          {
            en: 'While optimists treat progress as a law of nature, it could be argued that history records as many civilisational collapses as it does advances.',
            native: '尽管乐观主义者把进步当作自然法则，但可以认为，历史记载的文明崩溃与进步一样多。',
          },
          {
            en: 'Admittedly, material living standards have risen spectacularly; nevertheless, moral and political gains appear disturbingly reversible whenever fear displaces reason in public life.',
            native:
              '诚然，物质生活水平已经惊人地提高；然而，每当恐惧在公共生活中取代理性时，道德和政治成果似乎都会惊人地可逆。',
          },
          {
            en: 'On balance, progress seems less like an escalator than a staircase we must keep climbing deliberately, since standing still, in effect, means slowly moving backwards.',
            native:
              '总体而言，进步与其说像自动扶梯，不如说像一段我们必须刻意不断攀登的楼梯，因为原地踏步实际上就意味着缓慢倒退。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'individualism',
    questionText: 'Does individualism liberate people, or does it leave them isolated and unsupported?',
    translations: {
      te: {
        word: 'వ్యక్తివాదం',
        question: 'వ్యక్తివాదం ప్రజలను విముక్తం చేస్తుందా, లేక వారిని ఒంటరిగా, అండదండలు లేకుండా వదిలేస్తుందా?',
        examples: [
          {
            en: 'While individualism freed millions from stifling conformity, it could be argued that its extreme form dissolves the mutual obligations that once cushioned personal failure.',
            native:
              'వ్యక్తివాదం కోట్లాదిమందిని ఊపిరాడని అనుకూలత నుండి విముక్తం చేసినప్పటికీ, దాని తీవ్ర రూపం గతంలో వ్యక్తిగత వైఫల్యాన్ని తడ్బదిలిగా చేసిన పరస్పర బాధ్యతలను కరిగిస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, self-reliance builds confidence and initiative; nevertheless, the loneliest societies are often those most committed to the ideal of the self-sufficient individual.',
            native:
              'నిజానికి స్వయంసమృద్ధి విశ్వాసాన్నీ చొరవనూ పెంచుతుంది; అయినప్పటికీ, అత్యంత ఒంటరి సమాజాలు తరచుగా స్వయం సమర్థ వ్యక్తి ఆదర్శానికి అత్యంత కట్టుబడినవే అవుతాయి.',
          },
          {
            en: 'On balance, individualism seems healthiest when balanced against community, since autonomy without connection tends to produce freedom that feels remarkably like abandonment.',
            native:
              'మొత్తానికి, వ్యక్తివాదం సమాజంతో సమతుల్యమైనప్పుడు అత్యంత ఆరోగ్యకరంగా ఉంటుంది, ఎందుకంటే అనుబంధం లేని స్వాయత్తత్వం విడిచిపెట్టబడినట్టు అనిపించే స్వేచ్ఛను తెస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'व्यक्तिवाद',
        question: 'क्या व्यक्तिवाद लोगों को मुक्त करता है, या उन्हें अकेला और बेसहारा छोड़ देता है?',
        examples: [
          {
            en: 'While individualism freed millions from stifling conformity, it could be argued that its extreme form dissolves the mutual obligations that once cushioned personal failure.',
            native:
              'जबकि व्यक्तिवाद ने लाखों लोगों को दमघोंटू अनुरूपता से मुक्त किया, यह तर्क दिया जा सकता है कि इसका चरम रूप उन पारस्परिक दायित्वों को भंग कर देता है जो कभी व्यक्तिगत असफलता को संभालते थे।',
          },
          {
            en: 'Admittedly, self-reliance builds confidence and initiative; nevertheless, the loneliest societies are often those most committed to the ideal of the self-sufficient individual.',
            native:
              'यह स्वीकार करना होगा कि आत्मनिर्भरता आत्मविश्वास और पहल बनाती है; फिर भी, सबसे अकेले समाज अक्सर वही होते हैं जो आत्मनिर्भर व्यक्ति के आदर्श के प्रति सबसे अधिक प्रतिबद्ध होते हैं।',
          },
          {
            en: 'On balance, individualism seems healthiest when balanced against community, since autonomy without connection tends to produce freedom that feels remarkably like abandonment.',
            native:
              'कुल मिलाकर, व्यक्तिवाद तब सबसे स्वस्थ लगता है जब वह समुदाय से संतुलित हो, क्योंकि बिना जुड़ाव की स्वायत्तता ऐसी स्वतंत्रता पैदा करती है जो उल्लेखनीय रूप से त्याग जैसी लगती है।',
          },
        ],
      },
      es: {
        word: 'individualismo',
        question: '¿Libera el individualismo a las personas, o las deja aisladas y desprotegidas?',
        examples: [
          {
            en: 'While individualism freed millions from stifling conformity, it could be argued that its extreme form dissolves the mutual obligations that once cushioned personal failure.',
            native:
              'Aunque el individualismo liberó a millones de una conformidad asfixiante, podría argumentarse que su forma extrema disuelve las obligaciones mutuas que antes amortiguaban el fracaso personal.',
          },
          {
            en: 'Admittedly, self-reliance builds confidence and initiative; nevertheless, the loneliest societies are often those most committed to the ideal of the self-sufficient individual.',
            native:
              'Es cierto que la autosuficiencia genera confianza e iniciativa; sin embargo, las sociedades más solitarias suelen ser las más comprometidas con el ideal del individuo autosuficiente.',
          },
          {
            en: 'On balance, individualism seems healthiest when balanced against community, since autonomy without connection tends to produce freedom that feels remarkably like abandonment.',
            native:
              'En definitiva, el individualismo parece más saludable cuando se equilibra con la comunidad, ya que la autonomía sin conexión tiende a producir una libertad que se siente notablemente como abandono.',
          },
        ],
      },
      zh: {
        word: '个人主义',
        question: '个人主义解放了人们，还是让他们孤立无援？',
        examples: [
          {
            en: 'While individualism freed millions from stifling conformity, it could be argued that its extreme form dissolves the mutual obligations that once cushioned personal failure.',
            native:
              '尽管个人主义使数百万人摆脱了令人窒息的从众，但可以认为，它的极端形式消解了曾经缓冲个人失败的相互义务。',
          },
          {
            en: 'Admittedly, self-reliance builds confidence and initiative; nevertheless, the loneliest societies are often those most committed to the ideal of the self-sufficient individual.',
            native: '诚然，自力更生能建立信心和主动性；然而，最孤独的社会往往正是那些最信奉自给自足个人理想的社会。',
          },
          {
            en: 'On balance, individualism seems healthiest when balanced against community, since autonomy without connection tends to produce freedom that feels remarkably like abandonment.',
            native:
              '总体而言，个人主义在与社群相平衡时似乎最为健康，因为没有联结的自主往往会产生一种感觉上像极了被抛弃的自由。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'community',
    questionText: 'Why do many people feel a weaker sense of community than previous generations did?',
    translations: {
      te: {
        word: 'సంఘం',
        question: 'గత తరాలతో పోలిస్తే చాలామంది సంఘ భావన బలహీనంగా ఎందుకు భావిస్తున్నారు?',
        examples: [
          {
            en: 'While commentators blame technology for declining community, it could be argued that economic mobility and insecure work uproot people long before smartphones enter the picture.',
            native:
              'వ్యాఖ్యాతలు సంఘ క్షయానికి సాంకేతికతను నిందించినప్పటికీ, స్మార్ట్‌ఫోన్లు చేరడానికి చాలా ముందే ఆర్థిక సంచలనం, అస్థిర ఉద్యోగాలు ప్రజలను వేళ్లతో పెకిలిస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, online networks connect us across continents; nevertheless, they rarely provide the practical support—borrowed tools, shared childcare—that physical neighbours once routinely exchanged.',
            native:
              'నిజానికి ఆన్‌లైన్ నెట్‌వర్కులు మనల్ని ఖండాల అటుగా కలుపుతాయి; అయినప్పటికీ, భౌతిక పొరుగువారు గతంలో అలవాటుగా మార్చుకునే ఆచరణాత్మక సహాయాన్ని—అప్పుగా తీసుకునే పనిముట్లు, పంచుకునే పిల్లల సంరక్షణ—అవి అరుదుగా అందిస్తాయి.',
          },
          {
            en: 'On balance, community seems less a casualty of modernity than a practice we have stopped rehearsing, which implies it could be deliberately rebuilt if we chose.',
            native:
              'మొత్తానికి, సంఘం ఆధునికత బలి కంటే మనం అభ్యసించడం మానేసిన అభ్యాసంలా కనిపిస్తుంది; మనం ఎంచుకుంటే దాన్ని ఉద్దేశపూర్వకంగా తిరిగి నిర్మించవచ్చని ఇది సూచిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'समुदाय',
        question: 'पिछली पीढ़ियों की तुलना में बहुत से लोग समुदाय की भावना कमज़ोर क्यों महसूस करते हैं?',
        examples: [
          {
            en: 'While commentators blame technology for declining community, it could be argued that economic mobility and insecure work uproot people long before smartphones enter the picture.',
            native:
              'जबकि टिप्पणीकार समुदाय के क्षय के लिए तकनीक को दोष देते हैं, यह तर्क दिया जा सकता है कि स्मार्टफोन आने से काफी पहले आर्थिक गतिशीलता और असुरक्षित काम लोगों को जड़ से उखाड़ देते हैं।',
          },
          {
            en: 'Admittedly, online networks connect us across continents; nevertheless, they rarely provide the practical support—borrowed tools, shared childcare—that physical neighbours once routinely exchanged.',
            native:
              'यह स्वीकार करना होगा कि ऑनलाइन नेटवर्क हमें महाद्वीपों के पार जोड़ते हैं; फिर भी, वे शायद ही वह व्यावहारिक सहायता देते हैं—उधार लिए औज़ार, साझा बच्चों की देखभाल—जो पड़ोसी कभी नियमित रूप से बाँटते थे।',
          },
          {
            en: 'On balance, community seems less a casualty of modernity than a practice we have stopped rehearsing, which implies it could be deliberately rebuilt if we chose.',
            native:
              'कुल मिलाकर, समुदाय आधुनिकता का शिकार होने से कम और एक ऐसा अभ्यास अधिक लगता है जिसे हमने दोहराना बंद कर दिया है—इसका अर्थ है कि हम चाहें तो इसे जानबूझकर फिर से बना सकते हैं।',
          },
        ],
      },
      es: {
        word: 'comunidad',
        question: '¿Por qué muchas personas sienten un sentido de comunidad más débil que las generaciones anteriores?',
        examples: [
          {
            en: 'While commentators blame technology for declining community, it could be argued that economic mobility and insecure work uproot people long before smartphones enter the picture.',
            native:
              'Aunque los comentaristas culpan a la tecnología del declive comunitario, podría argumentarse que la movilidad económica y el trabajo inseguro desarraiguan a la gente mucho antes de que aparezcan los teléfonos inteligentes.',
          },
          {
            en: 'Admittedly, online networks connect us across continents; nevertheless, they rarely provide the practical support—borrowed tools, shared childcare—that physical neighbours once routinely exchanged.',
            native:
              'Es cierto que las redes en línea nos conectan entre continentes; sin embargo, rara vez brindan el apoyo práctico —herramientas prestadas, cuidado infantil compartido— que los vecinos físicos antes intercambiaban con rutina.',
          },
          {
            en: 'On balance, community seems less a casualty of modernity than a practice we have stopped rehearsing, which implies it could be deliberately rebuilt if we chose.',
            native:
              'En definitiva, la comunidad parece menos una víctima de la modernidad que una práctica que hemos dejado de ensayar, lo que implica que podría reconstruirse deliberadamente si así lo eligiéramos.',
          },
        ],
      },
      zh: {
        word: '社区',
        question: '为什么许多人感到的社区归属感比前几代人更弱？',
        examples: [
          {
            en: 'While commentators blame technology for declining community, it could be argued that economic mobility and insecure work uproot people long before smartphones enter the picture.',
            native:
              '尽管评论者把社区的衰落归咎于技术，但可以认为，早在智能手机出现之前，经济流动性和不稳定的工作就已经让人们背井离乡。',
          },
          {
            en: 'Admittedly, online networks connect us across continents; nevertheless, they rarely provide the practical support—borrowed tools, shared childcare—that physical neighbours once routinely exchanged.',
            native:
              '诚然，网络把我们连接到了世界各地；然而，它们很少提供实体邻里过去常常互相交换的那种实际帮助——借用的工具、分担的育儿。',
          },
          {
            en: 'On balance, community seems less a casualty of modernity than a practice we have stopped rehearsing, which implies it could be deliberately rebuilt if we chose.',
            native:
              '总体而言，社区与其说是现代性的牺牲品，不如说是一种我们已停止演练的实践——这意味着只要我们愿意，就可以有意识地重建它。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'loneliness',
    questionText: 'Why has loneliness been called an epidemic, and what can be done about it?',
    translations: {
      te: {
        word: 'ఒంటరితనం',
        question: 'ఒంటరితనాన్ని మహమ్మారిగా ఎందుకు పిలుస్తున్నారు, దాని గురించి ఏమి చేయవచ్చు?',
        examples: [
          {
            en: 'While loneliness has always existed, it could be argued that modern life has industrialised it, replacing the village square with the solitary, glowing screen.',
            native:
              'ఒంటరితనం ఎప్పటినుంచో ఉన్నప్పటికీ, ఆధునిక జీవితం దాన్ని పారిశ్రామికీకరించిందని, గ్రామ చావడిని ఒంటరి, వెలిగే తెరతో భర్తీ చేసిందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, introverts recharge in solitude and should not be pathologised; nevertheless, chronic isolation measurably damages health as severely as smoking or obesity.',
            native:
              'నిజానికి అంతర్ముఖులు ఏకాంతంలో శక్తిని పుంజుకుంటారు, వారిని రోగిగా చిత్రించకూడదు; అయినప్పటికీ, దీర్ఘకాలిక ఏకాంతం పొగతాగడం లేదా ఊబకాయంలా తీవ్రంగా ఆరోగ్యాన్ని కొలవగలంతగా దెబ్బతీస్తుంది.',
          },
          {
            en: 'On balance, loneliness seems less a personal failing than a design flaw in how we organise cities and work, which suggests collective rather than individual remedies.',
            native:
              'మొత్తానికి, ఒంటరితనం వ్యక్తిగత లోపం కంటే మనం నగరాలనూ పనినీ ఎలా నిర్వహిస్తున్నామో అందులోని రూపకల్పన లోపంలా కనిపిస్తుంది; వ్యక్తిగత కంటే సామూహిక పరిష్కారాలను ఇది సూచిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'अकेलापन',
        question: 'अकेलापन को महामारी क्यों कहा गया है, और इसके बारे में क्या किया जा सकता है?',
        examples: [
          {
            en: 'While loneliness has always existed, it could be argued that modern life has industrialised it, replacing the village square with the solitary, glowing screen.',
            native:
              'जबकि अकेलापन हमेशा से मौजूद रहा है, यह तर्क दिया जा सकता है कि आधुनिक जीवन ने इसे औद्योगीकरण दे दिया है, गाँव के चौक को एकाकी, चमकती स्क्रीन से बदल दिया है।',
          },
          {
            en: 'Admittedly, introverts recharge in solitude and should not be pathologised; nevertheless, chronic isolation measurably damages health as severely as smoking or obesity.',
            native:
              'यह स्वीकार करना होगा कि अंतर्मुखी एकांत में ऊर्जा पाते हैं और उन्हें रोगी नहीं ठहराना चाहिए; फिर भी, दीर्घकालिक अलगाव धूम्रपान या मोटापे जितनी गंभीरता से स्वास्थ्य को मापने योग्य नुकसान पहुँचाता है।',
          },
          {
            en: 'On balance, loneliness seems less a personal failing than a design flaw in how we organise cities and work, which suggests collective rather than individual remedies.',
            native:
              'कुल मिलाकर, अकेलापन व्यक्तिगत कमी से कम और शहरों तथा काम के हमारे संगठन की डिज़ाइन खामी जैसा अधिक लगता है—इससे व्यक्तिगत के बजाय सामूहिक उपायों का सुझाव मिलता है।',
          },
        ],
      },
      es: {
        word: 'soledad',
        question: '¿Por qué se ha llamado epidemia a la soledad, y qué puede hacerse al respecto?',
        examples: [
          {
            en: 'While loneliness has always existed, it could be argued that modern life has industrialised it, replacing the village square with the solitary, glowing screen.',
            native:
              'Aunque la soledad siempre ha existido, podría argumentarse que la vida moderna la ha industrializado, sustituyendo la plaza del pueblo por la pantalla solitaria y brillante.',
          },
          {
            en: 'Admittedly, introverts recharge in solitude and should not be pathologised; nevertheless, chronic isolation measurably damages health as severely as smoking or obesity.',
            native:
              'Es cierto que los introvertidos se recargan en soledad y no deben patologizarse; sin embargo, el aislamiento crónico daña la salud de forma medible tan gravemente como el tabaco o la obesidad.',
          },
          {
            en: 'On balance, loneliness seems less a personal failing than a design flaw in how we organise cities and work, which suggests collective rather than individual remedies.',
            native:
              'En definitiva, la soledad parece menos un defecto personal que un fallo de diseño en cómo organizamos las ciudades y el trabajo, lo que sugiere remedios colectivos más que individuales.',
          },
        ],
      },
      zh: {
        word: '孤独',
        question: '为什么孤独被称为一种流行病，我们能做些什么？',
        examples: [
          {
            en: 'While loneliness has always existed, it could be argued that modern life has industrialised it, replacing the village square with the solitary, glowing screen.',
            native: '尽管孤独一直存在，但可以认为，现代生活已经把它工业化了，用孤独发光的屏幕取代了村庄的广场。',
          },
          {
            en: 'Admittedly, introverts recharge in solitude and should not be pathologised; nevertheless, chronic isolation measurably damages health as severely as smoking or obesity.',
            native:
              '诚然，内向者在独处中恢复精力，不应被病理化；然而，长期的孤立对健康的损害可衡量地不亚于吸烟或肥胖。',
          },
          {
            en: 'On balance, loneliness seems less a personal failing than a design flaw in how we organise cities and work, which suggests collective rather than individual remedies.',
            native:
              '总体而言，孤独与其说是个人的失败，不如说是我们组织城市和工作方式中的设计缺陷——这提示我们需要集体而非个人的对策。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'happiness',
    questionText: 'Can happiness be pursued directly, or is it only ever a by-product of other pursuits?',
    translations: {
      te: {
        word: 'ఆనందం',
        question: 'ఆనందాన్ని ప్రత్యక్షంగా వెంబడించవచ్చా, లేక అది ఎల్లప్పుడూ ఇతర అన్వేషణల ఉపఉత్పత్తి మాత్రమేనా?',
        examples: [
          {
            en: 'While self-help industries promise happiness on demand, it could be argued that chasing it directly tends to make people painfully aware of its absence.',
            native:
              'స్వయం-సహాయ పరిశ్రమలు డిమాండ్ మీద ఆనందాన్ని వాగ్దానం చేసినప్పటికీ, దాన్ని ప్రత్యక్షంగా వెంటాడడం దాని లేమిని ప్రజలకు బాధాకరంగా గుర్తు చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, circumstances matter, since destitution reliably produces misery; nevertheless, beyond sufficiency, happiness correlates more strongly with relationships than with further gains.',
            native:
              'నిజానికి పరిస్థితులు ముఖ్యం, ఎందుకంటే దారిద్ర్యం తప్పకుండా దుఃఖాన్ని ఇస్తుంది; అయినప్పటికీ, సరిపోయినంత దాటిన తర్వాత ఆనందం మరింత లాభాల కంటే సంబంధాలతో బలంగా ముడిపడి ఉంటుంది.',
          },
          {
            en: 'On balance, happiness seems to arrive sideways, as a consequence of engagement and purpose, rather than as a destination one can approach by staring at the horizon.',
            native:
              'మొత్తానికి, ఆనందం క్షితిజం వైపు వెంటాడగల గమ్యంగా కాకుండా, నిమగ్నత, లక్ష్యం యొక్క పర్యవసానంగా పక్కదారి నుండి వస్తుందని అనిపిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'खुशी',
        question: 'क्या खुशी का सीधे पीछा किया जा सकता है, या यह सदैव अन्य खोजों का उप-उत्पाद ही होती है?',
        examples: [
          {
            en: 'While self-help industries promise happiness on demand, it could be argued that chasing it directly tends to make people painfully aware of its absence.',
            native:
              'जबकि स्वयं-सहायता उद्योग माँग पर खुशी का वादा करते हैं, यह तर्क दिया जा सकता है कि इसका सीधा पीछा करना लोगों को इसकी अनुपस्थिति का दर्दनाक एहसास करा देता है।',
          },
          {
            en: 'Admittedly, circumstances matter, since destitution reliably produces misery; nevertheless, beyond sufficiency, happiness correlates more strongly with relationships than with further gains.',
            native:
              'यह स्वीकार करना होगा कि परिस्थितियाँ मायने रखती हैं, क्योंकि दरिद्रता विश्वसनीय रूप से दुख पैदा करती है; फिर भी, पर्याप्तता के आगे, खुशी आगे की प्राप्तियों से अधिक रिश्तों से दृढ़ता से जुड़ती है।',
          },
          {
            en: 'On balance, happiness seems to arrive sideways, as a consequence of engagement and purpose, rather than as a destination one can approach by staring at the horizon.',
            native:
              'कुल मिलाकर, खुशी तिरछे रास्ते से आती प्रतीत होती है—संलग्नता और उद्देश्य के परिणाम के रूप में—ना कि ऐसी मंज़िल जिसे क्षितिज को घूरकर पाया जा सके।',
          },
        ],
      },
      es: {
        word: 'felicidad',
        question: '¿Puede perseguirse la felicidad directamente, o es siempre un subproducto de otras búsquedas?',
        examples: [
          {
            en: 'While self-help industries promise happiness on demand, it could be argued that chasing it directly tends to make people painfully aware of its absence.',
            native:
              'Aunque las industrias de autoayuda prometen felicidad a demanda, podría argumentarse que perseguirla directamente tiende a hacer a las personas dolorosamente conscientes de su ausencia.',
          },
          {
            en: 'Admittedly, circumstances matter, since destitution reliably produces misery; nevertheless, beyond sufficiency, happiness correlates more strongly with relationships than with further gains.',
            native:
              'Es cierto que las circunstancias importan, ya que la miseria produce infelicidad de forma fiable; sin embargo, más allá de la suficiencia, la felicidad se correlaciona más con las relaciones que con ganancias adicionales.',
          },
          {
            en: 'On balance, happiness seems to arrive sideways, as a consequence of engagement and purpose, rather than as a destination one can approach by staring at the horizon.',
            native:
              'En definitiva, la felicidad parece llegar de lado, como consecuencia del compromiso y el propósito, y no como un destino al que uno se acerca mirando fijamente al horizonte.',
          },
        ],
      },
      zh: {
        word: '幸福',
        question: '幸福可以被直接追求吗，还是它永远只是其他追求的副产品？',
        examples: [
          {
            en: 'While self-help industries promise happiness on demand, it could be argued that chasing it directly tends to make people painfully aware of its absence.',
            native: '尽管自助产业承诺按需供应幸福，但可以认为，直接追逐幸福往往会让人们痛苦地意识到它的缺失。',
          },
          {
            en: 'Admittedly, circumstances matter, since destitution reliably produces misery; nevertheless, beyond sufficiency, happiness correlates more strongly with relationships than with further gains.',
            native:
              '诚然，环境很重要，因为赤贫确实可靠地产生痛苦；然而，在满足基本需求之后，幸福与人际关系的相关性强于与更多收获的相关性。',
          },
          {
            en: 'On balance, happiness seems to arrive sideways, as a consequence of engagement and purpose, rather than as a destination one can approach by staring at the horizon.',
            native: '总体而言，幸福似乎是从侧面降临的，是投入和目标的副产品，而不是一个可以盯着地平线直取的目的地。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'well-being',
    questionText: 'Should governments measure national success by well-being rather than economic growth?',
    translations: {
      te: {
        word: 'శ్రేయస్సు',
        question: 'ఆర్థిక వృద్ధి కంటే శ్రేయస్సు ద్వారా జాతీయ విజయాన్ని ప్రభుత్వాలు కొలవాలా?',
        examples: [
          {
            en: "While GDP tracks economic activity efficiently, it could be argued that it remains stubbornly silent about whether citizens' lives are actually improving in any meaningful sense.",
            native:
              'జీడీపీ ఆర్థిక కార్యకలాపాలను సమర్థంగా గుర్తించినప్పటికీ, పౌరుల జీవితాలు వాస్తవంగా ఏ అర్థవంతమైన పద్ధతిలోనైనా మెరుగవుతున్నాయా అనే దాని గురించి అది పట్టుతనంగా మౌనంగా ఉంటుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, well-being is slippery to define and harder to compare; nevertheless, choosing to measure it signals that people, not production, constitute the point of policy.',
            native:
              'నిజానికి శ్రేయస్సు నిర్వచించడానికి జారుగా, పోల్చడానికి కష్టంగా ఉంటుంది; అయినప్పటికీ, దాన్ని కొలవడానికి ఎంచుకోవడం విధానం లక్ష్యం ఉత్పత్తి కాదు, ప్రజలు అని సూచిస్తుంది.',
          },
          {
            en: 'On balance, supplementing growth figures with well-being metrics seems prudent, although replacing them entirely risks trading one crude simplification for another.',
            native:
              'మొత్తానికి, వృద్ధి గణాంకాలను శ్రేయస్సు కొలమానాలతో పూరకం చేయడం వివేకంగా అనిపిస్తుంది, అయితే వాటిని పూర్తిగా భర్తీ చేయడం ఒక స్థూల సరళీకరణను మరొక దానితో మార్చుకునే ప్రమాదం ఉంది.',
          },
        ],
      },
      hi: {
        word: 'कल्याण',
        question: 'क्या सरकारों को आर्थिक विकास के बजाय कल्याण से राष्ट्रीय सफलता मापनी चाहिए?',
        examples: [
          {
            en: "While GDP tracks economic activity efficiently, it could be argued that it remains stubbornly silent about whether citizens' lives are actually improving in any meaningful sense.",
            native:
              'जबकि जीडीपी आर्थिक गतिविधि को कुशलता से ट्रैक करता है, यह तर्क दिया जा सकता है कि नागरिकों के जीवन वास्तव में किसी सार्थक अर्थ में सुधर रहे हैं या नहीं, इस पर वह ज़िद से चुप रहता है।',
          },
          {
            en: 'Admittedly, well-being is slippery to define and harder to compare; nevertheless, choosing to measure it signals that people, not production, constitute the point of policy.',
            native:
              'यह स्वीकार करना होगा कि कल्याण को परिभाषित करना फिसलन भरा और तुलना करना कठिन है; फिर भी, इसे मापना चुनना यह संकेत देता है कि नीति का उद्देश्य उत्पादन नहीं, लोग हैं।',
          },
          {
            en: 'On balance, supplementing growth figures with well-being metrics seems prudent, although replacing them entirely risks trading one crude simplification for another.',
            native:
              'कुल मिलाकर, विकास के आँकड़ों को कल्याण मापदंडों से पूरक करना विवेकपूर्ण लगता है, यद्यपि उन्हें पूरी तरह बदल देना एक क्रूर सरलीकरण को दूसरे से बदलने का जोखिम लाता है।',
          },
        ],
      },
      es: {
        word: 'bienestar',
        question:
          '¿Deberían los gobiernos medir el éxito nacional por el bienestar en lugar del crecimiento económico?',
        examples: [
          {
            en: "While GDP tracks economic activity efficiently, it could be argued that it remains stubbornly silent about whether citizens' lives are actually improving in any meaningful sense.",
            native:
              'Aunque el PIB rastrea la actividad económica eficientemente, podría argumentarse que guarda un silencio obstinado sobre si las vidas de los ciudadanos mejoran realmente en algún sentido significativo.',
          },
          {
            en: 'Admittedly, well-being is slippery to define and harder to compare; nevertheless, choosing to measure it signals that people, not production, constitute the point of policy.',
            native:
              'Es cierto que el bienestar es resbaladizo de definir y más difícil de comparar; sin embargo, elegir medirlo señala que las personas, y no la producción, constituyen el objetivo de la política.',
          },
          {
            en: 'On balance, supplementing growth figures with well-being metrics seems prudent, although replacing them entirely risks trading one crude simplification for another.',
            native:
              'En definitiva, complementar las cifras de crecimiento con métricas de bienestar parece prudente, aunque reemplazarlas por completo arriesga cambiar una simplificación burda por otra.',
          },
        ],
      },
      zh: {
        word: '福祉',
        question: '政府应该用福祉而非经济增长来衡量国家成就吗？',
        examples: [
          {
            en: "While GDP tracks economic activity efficiently, it could be argued that it remains stubbornly silent about whether citizens' lives are actually improving in any meaningful sense.",
            native:
              '尽管国内生产总值能高效追踪经济活动，但可以认为，它对公民的生活是否在任何有意义的层面上真正改善始终顽固地保持沉默。',
          },
          {
            en: 'Admittedly, well-being is slippery to define and harder to compare; nevertheless, choosing to measure it signals that people, not production, constitute the point of policy.',
            native: '诚然，福祉难以定义，也更难比较；然而，选择去衡量它表明人才是政策的目标，而非生产。',
          },
          {
            en: 'On balance, supplementing growth figures with well-being metrics seems prudent, although replacing them entirely risks trading one crude simplification for another.',
            native:
              '总体而言，用福祉指标补充增长数据似乎是审慎的，尽管完全取而代之可能会有用一种粗糙的简化替代另一种的风险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'burnout',
    questionText: 'Is burnout a personal failure to cope, or a symptom of unreasonable workplace expectations?',
    translations: {
      te: {
        word: 'బర్నౌట్',
        question: 'బర్నౌట్ అనేది ఎదుర్కోలేని వ్యక్తిగత వైఫల్యమా, లేక అసభ్యమైన కార్యాలయ అంచనాల లక్షణమా?',
        examples: [
          {
            en: 'While employers frame burnout as an individual resilience problem, it could be argued that no amount of mindfulness compensates for chronically impossible workloads.',
            native:
              'యజమానులు బర్నౌట్‌ను వ్యక్తిగత స్థైర్య సమస్యగా చిత్రించినప్పటికీ, దీర్ఘకాలంగా అసాధ్యమైన పనిభారానికి ఎంత ధ్యానశక్తినైనా పరిహారం చేయలేదని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, personal boundaries and rest matter; nevertheless, treating a systemic issue as a private weakness conveniently absolves organisations of any obligation to change.',
            native:
              'నిజానికి వ్యక్తిగత సరిహద్దులు, విశ్రాంతి ముఖ్యం; అయినప్పటికీ, వ్యవస్థాగత సమస్యను వ్యక్తిగత బలహీనతగా చూపడం సంస్థలను మారాల్సిన బాధ్యత నుండి సౌకర్యవంతంగా విముక్తం చేస్తుంది.',
          },
          {
            en: 'On balance, burnout seems best understood as an organisational diagnosis rather than a personal one, since resilient people break too when demands indefinitely exceed resources.',
            native:
              'మొత్తానికి, బర్నౌట్ వ్యక్తిగత నిదానం కంటే సంస్థాగత నిదానంగా అర్థం చేసుకోవడం మంచిది, ఎందుకంటే డిమాండ్లు వనరులను అనిదిష్టంగా అధిగమించినప్పుడు స్థితిస్థాపక వ్యక్తులు కూడా కుప్పకూలుతారు.',
          },
        ],
      },
      hi: {
        word: 'बर्नआउट',
        question: 'क्या बर्नआउट सामना करने में व्यक्तिगत असफलता है, या अनुचित कार्यस्थल अपेक्षाओं का लक्षण?',
        examples: [
          {
            en: 'While employers frame burnout as an individual resilience problem, it could be argued that no amount of mindfulness compensates for chronically impossible workloads.',
            native:
              'जबकि नियोक्ता बर्नआउट को व्यक्तिगत लचीलेपन की समस्या के रूप में चित्रित करते हैं, यह तर्क दिया जा सकता है कि पुरानी असंभव कामभार की भरपाई कोई भी मात्रा में माइंडफुलनेस नहीं कर सकती।',
          },
          {
            en: 'Admittedly, personal boundaries and rest matter; nevertheless, treating a systemic issue as a private weakness conveniently absolves organisations of any obligation to change.',
            native:
              'यह स्वीकार करना होगा कि व्यक्तिगत सीमाएँ और आराम मायने रखते हैं; फिर भी, किसी व्यवस्थागत मुद्दे को निजी कमज़ोरी मानना संगठनों को बदलने के हर दायित्व से सुविधाजनक रूप से मुक्त कर देता है।',
          },
          {
            en: 'On balance, burnout seems best understood as an organisational diagnosis rather than a personal one, since resilient people break too when demands indefinitely exceed resources.',
            native:
              'कुल मिलाकर, बर्नआउट को व्यक्तिगत निदान के बजाय संगठनात्मक निदान समझना बेहतर लगता है, क्योंकि जब माँगें अनिश्चित काल तक संसाधनों से अधिक होती हैं तो लचीले लोग भी टूट जाते हैं।',
          },
        ],
      },
      es: {
        word: 'agotamiento laboral',
        question:
          '¿Es el agotamiento laboral un fracaso personal para afrontar, o un síntoma de expectativas laborales irrazonables?',
        examples: [
          {
            en: 'While employers frame burnout as an individual resilience problem, it could be argued that no amount of mindfulness compensates for chronically impossible workloads.',
            native:
              'Aunque los empleadores presentan el agotamiento como un problema de resiliencia individual, podría argumentarse que ninguna cantidad de atención plena compensa cargas de trabajo crónicamente imposibles.',
          },
          {
            en: 'Admittedly, personal boundaries and rest matter; nevertheless, treating a systemic issue as a private weakness conveniently absolves organisations of any obligation to change.',
            native:
              'Es cierto que los límites personales y el descanso importan; sin embargo, tratar un problema sistémico como una debilidad privada absuelve convenientemente a las organizaciones de cualquier obligación de cambiar.',
          },
          {
            en: 'On balance, burnout seems best understood as an organisational diagnosis rather than a personal one, since resilient people break too when demands indefinitely exceed resources.',
            native:
              'En definitiva, el agotamiento parece entenderse mejor como un diagnóstico organizacional y no personal, ya que las personas resilientes también se quiebran cuando las exigencias superan indefinidamente los recursos.',
          },
        ],
      },
      zh: {
        word: '职业倦怠',
        question: '职业倦怠是个人应对不力的失败，还是不合理职场期望的症状？',
        examples: [
          {
            en: 'While employers frame burnout as an individual resilience problem, it could be argued that no amount of mindfulness compensates for chronically impossible workloads.',
            native:
              '尽管雇主把职业倦怠描述为个人韧性的问题，但可以认为，再多的正念练习也无法弥补长期不可能完成的工作量。',
          },
          {
            en: 'Admittedly, personal boundaries and rest matter; nevertheless, treating a systemic issue as a private weakness conveniently absolves organisations of any obligation to change.',
            native:
              '诚然，个人界限和休息很重要；然而，把一个系统性问题当作私人弱点来对待，恰好让组织免于承担任何变革的义务。',
          },
          {
            en: 'On balance, burnout seems best understood as an organisational diagnosis rather than a personal one, since resilient people break too when demands indefinitely exceed resources.',
            native:
              '总体而言，职业倦怠最好被理解为组织层面的诊断而非个人诊断，因为当要求无限期地超过资源时，有韧性的人也会垮掉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'perfectionism',
    questionText: 'Is perfectionism a strength that drives excellence, or a weakness that prevents completion?',
    translations: {
      te: {
        word: 'పరిపూర్ణతావాదం',
        question: 'పరిపూర్ణతావాదం శ్రేష్ఠతను నడిపించే బలమా, లేక పూర్తయ్యేలా అడ్డుకునే బలహీనతయా?',
        examples: [
          {
            en: 'While perfectionists produce meticulous work, it could be argued that their standards often function less as aspirations than as elaborate excuses for procrastination.',
            native:
              'పరిపూర్ణతావాదులు నిఖర్వైన పనిని ఉత్పత్తి చేసినప్పటికీ, వారి ప్రమాణాలు తరచుగా ఆకాంక్షలుగా కంటే వాయిదాపడానికి విస్తృత సాకులుగా పనిచేస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, society benefits when surgeons and engineers sweat details; nevertheless, perfectionism applied indiscriminately to every email and errand yields exhaustion, not excellence.',
            native:
              'నిజానికి సర్జన్లు, ఇంజినీర్లు వివరాలపై శ్రమించినప్పుడు సమాజం ప్రయోజనం పొందుతుంది; అయినప్పటికీ, ప్రతి ఇమెయిల్, చిన్న పనికి వివక్ష లేకుండా పరిపూర్ణతావాదం అన్వయించడం శ్రేష్ఠతను కాదు, అలసటను ఇస్తుంది.',
          },
          {
            en: 'On balance, the healthier ideal seems to be excellence in what matters and sufficiency elsewhere, a distinction perfectionists find genuinely painful to accept.',
            native:
              'మొత్తానికి, ముఖ్యమైన వాటిలో శ్రేష్ఠత, మిగిలిన వాటిలో సరిపోయినంత అనేది ఆరోగ్యకరమైన ఆదర్శంగా కనిపిస్తుంది; పరిపూర్ణతావాదులు అంగీకరించడానికి నిజంగా బాధపడే వ్యత్యాసం ఇది.',
          },
        ],
      },
      hi: {
        word: 'पूर्णतावाद',
        question:
          'क्या पूर्णतावाद एक शक्ति है जो उत्कृष्टता को प्रेरित करती है, या एक कमज़ोरी है जो पूर्णता में बाधा डालती है?',
        examples: [
          {
            en: 'While perfectionists produce meticulous work, it could be argued that their standards often function less as aspirations than as elaborate excuses for procrastination.',
            native:
              'जबकि पूर्णतावादी सूक्ष्म कार्य करते हैं, यह तर्क दिया जा सकता है कि उनके मानदंड अक्सर आकांक्षाओं से कम और टालमटोल के विस्तृत बहाने जैसे अधिक काम करते हैं।',
          },
          {
            en: 'Admittedly, society benefits when surgeons and engineers sweat details; nevertheless, perfectionism applied indiscriminately to every email and errand yields exhaustion, not excellence.',
            native:
              'यह स्वीकार करना होगा कि जब सर्जन और इंजीनियर बारीकियों पर पसीना बहाते हैं तो समाज को लाभ होता है; फिर भी, हर ईमेल और छोटे काम पर अंधाधुंध पूर्णतावाद लागू करना उत्कृष्टता नहीं, थकान देता है।',
          },
          {
            en: 'On balance, the healthier ideal seems to be excellence in what matters and sufficiency elsewhere, a distinction perfectionists find genuinely painful to accept.',
            native:
              'कुल मिलाकर, स्वस्थ आदर्श यह लगता है: जो मायने रखता है उसमें उत्कृष्टता और बाकी जगह पर्याप्तता—यह अंतर पूर्णतावादियों के लिए स्वीकार करना सचमुच दर्दनाक है।',
          },
        ],
      },
      es: {
        word: 'perfeccionismo',
        question: '¿Es el perfeccionismo una fortaleza que impulsa la excelencia, o una debilidad que impide terminar?',
        examples: [
          {
            en: 'While perfectionists produce meticulous work, it could be argued that their standards often function less as aspirations than as elaborate excuses for procrastination.',
            native:
              'Aunque los perfeccionistas producen trabajo meticuloso, podría argumentarse que sus estándares a menudo funcionan menos como aspiraciones que como excusas elaboradas para procrastinar.',
          },
          {
            en: 'Admittedly, society benefits when surgeons and engineers sweat details; nevertheless, perfectionism applied indiscriminately to every email and errand yields exhaustion, not excellence.',
            native:
              'Es cierto que la sociedad se beneficia cuando cirujanos e ingenieros cuidan los detalles; sin embargo, el perfeccionismo aplicado indiscriminadamente a cada correo y recado produce agotamiento, no excelencia.',
          },
          {
            en: 'On balance, the healthier ideal seems to be excellence in what matters and sufficiency elsewhere, a distinction perfectionists find genuinely painful to accept.',
            native:
              'En definitiva, el ideal más sano parece ser la excelencia en lo que importa y la suficiencia en lo demás, una distinción que a los perfeccionistas les resulta genuinamente dolorosa de aceptar.',
          },
        ],
      },
      zh: {
        word: '完美主义',
        question: '完美主义是驱动卓越的力量，还是阻碍完成的弱点？',
        examples: [
          {
            en: 'While perfectionists produce meticulous work, it could be argued that their standards often function less as aspirations than as elaborate excuses for procrastination.',
            native:
              '尽管完美主义者能做出一丝不苟的工作，但可以认为，他们的标准往往与其说是追求，不如说是拖延的精心借口。',
          },
          {
            en: 'Admittedly, society benefits when surgeons and engineers sweat details; nevertheless, perfectionism applied indiscriminately to every email and errand yields exhaustion, not excellence.',
            native:
              '诚然，当外科医生和工程师精益求精时，社会从中受益；然而，把完美主义不加区分地用于每封邮件和每件琐事，带来的只是疲惫而非卓越。',
          },
          {
            en: 'On balance, the healthier ideal seems to be excellence in what matters and sufficiency elsewhere, a distinction perfectionists find genuinely painful to accept.',
            native:
              '总体而言，更健康的理想似乎是在重要的事情上追求卓越，在其余事情上够用即可——这一区分让完美主义者真正难以接受。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'procrastination',
    questionText: 'Why do intelligent people procrastinate, and is it always a bad thing?',
    translations: {
      te: {
        word: 'వాయిదా',
        question: 'తెలివైనవారు ఎందుకు వాయిదాలు వేస్తారు, అది ఎల్లప్పుడూ చెడు విషయమేనా?',
        examples: [
          {
            en: 'While procrastination is universally condemned as laziness, it could be argued that it often signals fear of failure rather than any shortage of diligence.',
            native:
              'వాయిదా వేయడాన్ని సోమరితనం అని సర్వసాధారణంగా ఖండించినప్పటికీ, అది తరచుగా శ్రమ కొరత కాదు, వైఫల్య భయాన్ని సూచిస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, chronic delay sabotages careers and relationships; nevertheless, a period of apparent idleness sometimes allows genuinely better ideas to mature quietly in the background.',
            native:
              'నిజానికి దీర్ఘకాలిక ఆలస్యం వృత్తులనూ సంబంధాలనూ ధ్వంసం చేస్తుంది; అయినప్పటికీ, కనిపించే సోమారితనపు కాలం కొన్నిసార్లు నిజంగా మెరుగైన ఆలోచనలను వెనుక నిశ్శబ్దంగా పక్వానికి అనుమతిస్తుంది.',
          },
          {
            en: 'On balance, procrastination deserves treatment as an emotional regulation problem, not a time-management one, which explains why planners and apps so rarely cure it.',
            native:
              'మొత్తానికి, వాయిదా పడడాన్ని సమయ నిర్వహణ సమస్యగా కాకుండా భావోద్వేగ నియంత్రణ సమస్యగా పరిగణించాలి; ప్లానర్లు, యాప్‌లు దాన్ని ఎందుకు అరుదుగా నయం చేస్తాయో ఇది వివరిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'टालमटोल',
        question: 'बुद्धिमान लोग टालमटोल क्यों करते हैं, और क्या यह हमेशा बुरी बात है?',
        examples: [
          {
            en: 'While procrastination is universally condemned as laziness, it could be argued that it often signals fear of failure rather than any shortage of diligence.',
            native:
              'जबकि टालमटोल को सर्वत्र आलस्य कहकर निंदा जाती है, यह तर्क दिया जा सकता है कि यह अक्सर परिश्रम की कमी के बजाय असफलता के डर का संकेत देता है।',
          },
          {
            en: 'Admittedly, chronic delay sabotages careers and relationships; nevertheless, a period of apparent idleness sometimes allows genuinely better ideas to mature quietly in the background.',
            native:
              'यह स्वीकार करना होगा कि पुरानी देरी करियर और रिश्तों को नुकसान पहुँचाती है; फिर भी, दिखने वाली निष्क्रियता का दौर कभी-कभी सचमुच बेहतर विचारों को पृष्ठभूमि में चुपचाप परिपक्व होने देता है।',
          },
          {
            en: 'On balance, procrastination deserves treatment as an emotional regulation problem, not a time-management one, which explains why planners and apps so rarely cure it.',
            native:
              'कुल मिलाकर, टालमटोल को समय-प्रबंधन नहीं, भावनात्मक नियमन की समस्या मानना चाहिए—इसीलिए प्लानर और ऐप इसे शायद ही कभी ठीक कर पाते हैं।',
          },
        ],
      },
      es: {
        word: 'procrastinación',
        question: '¿Por qué procrastinan las personas inteligentes, y es siempre algo malo?',
        examples: [
          {
            en: 'While procrastination is universally condemned as laziness, it could be argued that it often signals fear of failure rather than any shortage of diligence.',
            native:
              'Aunque la procrastinación se condena universalmente como pereza, podría argumentarse que a menudo señala miedo al fracaso más que cualquier escasez de diligencia.',
          },
          {
            en: 'Admittedly, chronic delay sabotages careers and relationships; nevertheless, a period of apparent idleness sometimes allows genuinely better ideas to mature quietly in the background.',
            native:
              'Es cierto que la demora crónica sabotea carreras y relaciones; sin embargo, un período de aparente ociosidad a veces permite que ideas genuinamente mejores maduren silenciosamente en segundo plano.',
          },
          {
            en: 'On balance, procrastination deserves treatment as an emotional regulation problem, not a time-management one, which explains why planners and apps so rarely cure it.',
            native:
              'En definitiva, la procrastinación merece tratarse como un problema de regulación emocional, no de gestión del tiempo, lo que explica por qué las agendas y las aplicaciones rara vez la curan.',
          },
        ],
      },
      zh: {
        word: '拖延',
        question: '为什么聪明的人也会拖延，拖延总是坏事吗？',
        examples: [
          {
            en: 'While procrastination is universally condemned as laziness, it could be argued that it often signals fear of failure rather than any shortage of diligence.',
            native: '尽管拖延被普遍谴责为懒惰，但可以认为，它往往标志着对失败的恐惧，而非勤奋的缺乏。',
          },
          {
            en: 'Admittedly, chronic delay sabotages careers and relationships; nevertheless, a period of apparent idleness sometimes allows genuinely better ideas to mature quietly in the background.',
            native:
              '诚然，长期拖延会损害事业和人际关系；然而，一段看似闲散的时光有时能让真正更好的想法在后台悄然成熟。',
          },
          {
            en: 'On balance, procrastination deserves treatment as an emotional regulation problem, not a time-management one, which explains why planners and apps so rarely cure it.',
            native:
              '总体而言，拖延应当被视为情绪调节问题而非时间管理问题——这解释了为什么日程表和应用程序很少能治愈它。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'discipline',
    questionText:
      'To what extent does discipline depend on the environments and systems people build rather than individual willpower?',
    translations: {
      te: {
        word: 'క్రమశిక్షణ',
        question:
          'క్రమశిక్షణ వ్యక్తిగత సంకల్పబలం కంటే ప్రజలు నిర్మించుకునే పరిసరాలు మరియు వ్యవస్థలపై ఎంతవరకు ఆధారపడుతుంది?',
        examples: [
          {
            en: "Treating discipline as sheer willpower overlooks how defaults, social expectations, and the design of one's environment make some behaviours considerably easier to sustain than others.",
            native:
              'క్రమశిక్షణను కేవలం సంకల్పబలంగా చూడటం వల్ల, ముందస్తు ఎంపికలు, సామాజిక అంచనాలు మరియు వ్యక్తి పరిసరాల రూపకల్పన కొన్ని ప్రవర్తనలను ఇతర వాటికంటే కొనసాగించడం ఎంత సులభం చేస్తాయో మనం విస్మరిస్తాం.',
          },
          {
            en: 'Personal responsibility still matters, but demanding identical self-control from people facing radically different constraints on time, health, and money mistakes unequal conditions for unequal character.',
            native:
              'వ్యక్తిగత బాధ్యత ఇప్పటికీ ముఖ్యం, కానీ సమయం, ఆరోగ్యం మరియు డబ్బుపై పూర్తిగా భిన్నమైన పరిమితులను ఎదుర్కొనే ప్రజల నుంచి ఒకే స్థాయి స్వీయ నియంత్రణను కోరడం అసమాన పరిస్థితులను అసమాన స్వభావంగా పొరబడటమే.',
          },
          {
            en: 'Durable discipline may therefore depend on designing systems that reduce repeated temptation while preserving enough flexibility to recover from inevitable lapses.',
            native:
              'అందువల్ల స్థిరమైన క్రమశిక్షణ పదేపదే ఎదురయ్యే ప్రలోభాలను తగ్గించే వ్యవస్థలను రూపొందించడంపై ఆధారపడవచ్చు; అదే సమయంలో అనివార్యమైన తప్పిదాల నుంచి కోలుకునేందుకు తగిన సౌలభ్యాన్ని ఉంచాలి.',
          },
        ],
      },
      hi: {
        word: 'अनुशासन',
        question:
          'अनुशासन व्यक्तिगत इच्छाशक्ति के बजाय लोगों द्वारा बनाए गए परिवेश और व्यवस्थाओं पर किस हद तक निर्भर करता है?',
        examples: [
          {
            en: "Treating discipline as sheer willpower overlooks how defaults, social expectations, and the design of one's environment make some behaviours considerably easier to sustain than others.",
            native:
              'अनुशासन को केवल इच्छाशक्ति मानना इस बात की अनदेखी करता है कि पूर्वनिर्धारित विकल्प, सामाजिक अपेक्षाएँ और व्यक्ति के परिवेश की बनावट कुछ व्यवहारों को दूसरों की तुलना में बनाए रखना कितना आसान कर देती हैं।',
          },
          {
            en: 'Personal responsibility still matters, but demanding identical self-control from people facing radically different constraints on time, health, and money mistakes unequal conditions for unequal character.',
            native:
              'व्यक्तिगत जिम्मेदारी अब भी मायने रखती है, लेकिन समय, स्वास्थ्य और धन की बिल्कुल अलग सीमाओं का सामना कर रहे लोगों से समान आत्म-नियंत्रण माँगना असमान परिस्थितियों को असमान चरित्र समझने की भूल है।',
          },
          {
            en: 'Durable discipline may therefore depend on designing systems that reduce repeated temptation while preserving enough flexibility to recover from inevitable lapses.',
            native:
              'इसलिए टिकाऊ अनुशासन ऐसी व्यवस्थाएँ बनाने पर निर्भर हो सकता है जो बार-बार के प्रलोभन घटाएँ और साथ ही अपरिहार्य चूकों से उबरने के लिए पर्याप्त लचीलापन बनाए रखें।',
          },
        ],
      },
      es: {
        word: 'disciplina',
        question:
          '¿Hasta qué punto depende la disciplina de los entornos y sistemas que construyen las personas, más que de la fuerza de voluntad individual?',
        examples: [
          {
            en: "Treating discipline as sheer willpower overlooks how defaults, social expectations, and the design of one's environment make some behaviours considerably easier to sustain than others.",
            native:
              'Tratar la disciplina como mera fuerza de voluntad pasa por alto cómo las opciones predeterminadas, las expectativas sociales y el diseño del propio entorno hacen que unas conductas sean mucho más fáciles de mantener que otras.',
          },
          {
            en: 'Personal responsibility still matters, but demanding identical self-control from people facing radically different constraints on time, health, and money mistakes unequal conditions for unequal character.',
            native:
              'La responsabilidad personal sigue importando, pero exigir idéntico autocontrol a quienes afrontan limitaciones radicalmente distintas de tiempo, salud y dinero confunde condiciones desiguales con un carácter desigual.',
          },
          {
            en: 'Durable discipline may therefore depend on designing systems that reduce repeated temptation while preserving enough flexibility to recover from inevitable lapses.',
            native:
              'Por tanto, una disciplina duradera puede depender de diseñar sistemas que reduzcan la tentación reiterada y conserven suficiente flexibilidad para recuperarse de fallos inevitables.',
          },
        ],
      },
      zh: {
        word: '自律',
        question: '自律在多大程度上取决于人们营造的环境与制度，而非个人意志力？',
        examples: [
          {
            en: "Treating discipline as sheer willpower overlooks how defaults, social expectations, and the design of one's environment make some behaviours considerably easier to sustain than others.",
            native:
              '把自律仅仅视为意志力，会忽略默认选项、社会期待和个人环境的设计如何让某些行为比其他行为更容易长期维持。',
          },
          {
            en: 'Personal responsibility still matters, but demanding identical self-control from people facing radically different constraints on time, health, and money mistakes unequal conditions for unequal character.',
            native:
              '个人责任仍然重要，但要求在时间、健康和经济方面承受截然不同限制的人表现出同等自制力，是把条件不平等误判为品格不平等。',
          },
          {
            en: 'Durable discipline may therefore depend on designing systems that reduce repeated temptation while preserving enough flexibility to recover from inevitable lapses.',
            native: '因此，持久的自律或许依赖于设计减少反复诱惑的制度，同时保留足够弹性，以便从不可避免的失误中恢复。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'curiosity',
    questionText: 'Does curiosity decline with age, and should schools do more to protect it?',
    translations: {
      te: {
        word: 'జిజ్ఞాస',
        question: 'వయసుతో పాటు జిజ్ఞాస తగ్గుతుందా, దాన్ని కాపాడడానికి పాఠశాలలు మరింత చేయాలా?',
        examples: [
          {
            en: 'While children interrogate the world relentlessly, it could be argued that schooling, with its standardised answers, gradually trains the questioning instinct out of them.',
            native:
              'పిల్లలు ప్రపంచాన్ని అహర్నిశం ప్రశ్నిస్తున్నప్పటికీ, ప్రామాణిక సమాధానాలతో కూడిన పాఠశాల విద్య ప్రశ్నించే స్వభావాన్ని వారి నుండి క్రమంగా తీసేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, curiosity can be inconvenient and even dangerous; nevertheless, every scientific advance and most moral progress began with someone refusing to stop asking why.',
            native:
              'నిజానికి జిజ్ఞాస అసౌకర్యంగా, అపాయకరంగానూ కావచ్చు; అయినప్పటికీ, ప్రతి శాస్త్రీయ పురోగతి, చాలా నైతిక పురోగతి ఎందుకు అని అడగడం ఆపడానికి నిరాకరించిన ఎవరితోనో ప్రారంభమైంది.',
          },
          {
            en: 'On balance, curiosity seems less a childhood trait that fades than a muscle adults neglect, although reviving it requires tolerating uncertainty more gracefully than most institutions do.',
            native:
              'మొత్తానికి, జిజ్ఞాస మసకబారే బాల్య లక్షణం కంటే పెద్దలు నిర్లక్ష్యం చేసే కండరంలా కనిపిస్తుంది, అయితే దాన్ని పునరుజ్జీవించడానికి చాలా సంస్థలు చేసే దానికంటే అనిశ్చితిని మరింత సొగసుగా సహించాలి.',
          },
        ],
      },
      hi: {
        word: 'जिज्ञासा',
        question: 'क्या उम्र के साथ जिज्ञासा घटती है, और क्या विद्यालयों को इसे बचाने के लिए और अधिक करना चाहिए?',
        examples: [
          {
            en: 'While children interrogate the world relentlessly, it could be argued that schooling, with its standardised answers, gradually trains the questioning instinct out of them.',
            native:
              'जबकि बच्चे दुनिया से अथक सवाल करते हैं, यह तर्क दिया जा सकता है कि मानकीकृत उत्तरों वाली स्कूली शिक्षा धीरे-धीरे पूछने की प्रवृत्ति को उनसे बाहर निकाल देती है।',
          },
          {
            en: 'Admittedly, curiosity can be inconvenient and even dangerous; nevertheless, every scientific advance and most moral progress began with someone refusing to stop asking why.',
            native:
              'यह स्वीकार करना होगा कि जिज्ञासा असुविधाजनक और यहाँ तक कि खतरनाक हो सकती है; फिर भी, हर वैज्ञानिक प्रगति और अधिकांश नैतिक प्रगति किसी ऐसे व्यक्ति से शुरू हुई जिसने क्यों पूछना बंद करने से इनकार कर दिया।',
          },
          {
            en: 'On balance, curiosity seems less a childhood trait that fades than a muscle adults neglect, although reviving it requires tolerating uncertainty more gracefully than most institutions do.',
            native:
              'कुल मिलाकर, जिज्ञासा फीका पड़ने वाली बचपन की विशेषता से कम और वयस्कों की उपेक्षित माँसपेशी जैसी अधिक लगती है, यद्यपि इसे पुनर्जीवित करने के लिए अनिश्चितता को अधिकांश संस्थाओं से बेहतर सहने की ज़रूरत है।',
          },
        ],
      },
      es: {
        word: 'curiosidad',
        question: '¿Disminuye la curiosidad con la edad, y deberían las escuelas hacer más por protegerla?',
        examples: [
          {
            en: 'While children interrogate the world relentlessly, it could be argued that schooling, with its standardised answers, gradually trains the questioning instinct out of them.',
            native:
              'Aunque los niños interrogan el mundo sin descanso, podría argumentarse que la escolarización, con sus respuestas estandarizadas, les va extirpando gradualmente el instinto de preguntar.',
          },
          {
            en: 'Admittedly, curiosity can be inconvenient and even dangerous; nevertheless, every scientific advance and most moral progress began with someone refusing to stop asking why.',
            native:
              'Es cierto que la curiosidad puede ser incómoda e incluso peligrosa; sin embargo, todo avance científico y la mayoría del progreso moral comenzaron con alguien que se negó a dejar de preguntar por qué.',
          },
          {
            en: 'On balance, curiosity seems less a childhood trait that fades than a muscle adults neglect, although reviving it requires tolerating uncertainty more gracefully than most institutions do.',
            native:
              'En definitiva, la curiosidad parece menos un rasgo infantil que se desvanece que un músculo que los adultos descuidan, aunque reavivarla exige tolerar la incertidumbre con más gracia de lo que lo hacen la mayoría de las instituciones.',
          },
        ],
      },
      zh: {
        word: '好奇心',
        question: '好奇心会随着年龄增长而减退吗，学校是否应当为保护它做得更多？',
        examples: [
          {
            en: 'While children interrogate the world relentlessly, it could be argued that schooling, with its standardised answers, gradually trains the questioning instinct out of them.',
            native: '尽管孩子们不厌其烦地追问这个世界，但可以认为，标准化答案的学校教育会逐渐把他们提问的本能训练掉。',
          },
          {
            en: 'Admittedly, curiosity can be inconvenient and even dangerous; nevertheless, every scientific advance and most moral progress began with someone refusing to stop asking why.',
            native:
              '诚然，好奇心可能带来不便甚至危险；然而，每一项科学进步和大多数道德进步，都始于某个拒绝停止问“为什么”的人。',
          },
          {
            en: 'On balance, curiosity seems less a childhood trait that fades than a muscle adults neglect, although reviving it requires tolerating uncertainty more gracefully than most institutions do.',
            native:
              '总体而言，好奇心与其说是一种会消退的童年特质，不如说是成年人疏于锻炼的肌肉——尽管重新激活它需要比大多数机构更优雅地容忍不确定性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'wisdom',
    questionText: 'How does wisdom differ from intelligence, and can it be taught?',
    translations: {
      te: {
        word: 'జ్ఞానం',
        question: 'జ్ఞానం తెలివితేటలకు ఎలా భిన్నం, దాన్ని నేర్పవచ్చా?',
        examples: [
          {
            en: 'While intelligence solves problems quickly, it could be argued that wisdom consists largely in knowing which problems deserve solving and which battles deserve declining.',
            native:
              'తెలివితేటలు సమస్యలను త్వరగా పరిష్కరించినప్పటికీ, ఏ సమస్యలు పరిష్కారానికి అర్హమో, ఏ పోరాటాలు వదిలివేయాలో తెలుసుకోవడమే జ్ఞానం అని పెద్దగా చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, cleverness wins examinations and promotions; nevertheless, the most catastrophic decisions in history were frequently made by highly intelligent people lacking perspective.',
            native:
              'నిజానికి తెలివి పరీక్షలు, పదోన్నతులు గెలిపిస్తుంది; అయినప్పటికీ, చరిత్రలో అత్యంత వినాశకరమైన నిర్ణయాలు తరచుగా దృక్కోణం లేని అతి తెలివైన వ్యక్తులే తీసుకున్నాయి.',
          },
          {
            en: 'On balance, wisdom seems to accumulate through reflected experience rather than instruction, which perhaps explains why it remains stubbornly resistant to being taught.',
            native:
              'మొత్తానికి, జ్ఞానం బోధన కంటే ప్రతిబింబించిన అనుభవం ద్వారా పేరుకుపోతుందని అనిపిస్తుంది; అది నేర్పడానికి పట్టుతనంగా ఎదుర్కొంటూనే ఉండటానికి బహుశా ఇది కారణం.',
          },
        ],
      },
      hi: {
        word: 'प्रज्ञा',
        question: 'प्रज्ञा बुद्धि से किस तरह भिन्न है, और क्या इसे सिखाया जा सकता है?',
        examples: [
          {
            en: 'While intelligence solves problems quickly, it could be argued that wisdom consists largely in knowing which problems deserve solving and which battles deserve declining.',
            native:
              'जबकि बुद्धि समस्याओं को जल्दी सुलझाती है, यह तर्क दिया जा सकता है कि प्रज्ञा काफी हद तक यह जानने में निहित है कि कौन सी समस्याएँ सुलझाने लायक हैं और कौन सी लड़ाइयाँ छोड़ने लायक।',
          },
          {
            en: 'Admittedly, cleverness wins examinations and promotions; nevertheless, the most catastrophic decisions in history were frequently made by highly intelligent people lacking perspective.',
            native:
              'यह स्वीकार करना होगा कि चतुराई परीक्षाएँ और पदोन्नतियाँ दिलाती है; फिर भी, इतिहास के सबसे विनाशकारी फैसले अक्सर अत्यंत बुद्धिमान परंतु दूरदृष्टि-विहीन लोगों ने ही लिए।',
          },
          {
            en: 'On balance, wisdom seems to accumulate through reflected experience rather than instruction, which perhaps explains why it remains stubbornly resistant to being taught.',
            native:
              'कुल मिलाकर, प्रज्ञा निर्देश के बजाय चिंतित अनुभव से जमा होती प्रतीत होती है—शायद यही बताता है कि यह सिखाए जाने का ज़िद से विरोध क्यों करती रहती है।',
          },
        ],
      },
      es: {
        word: 'sabiduría',
        question: '¿En qué se diferencia la sabiduría de la inteligencia, y puede enseñarse?',
        examples: [
          {
            en: 'While intelligence solves problems quickly, it could be argued that wisdom consists largely in knowing which problems deserve solving and which battles deserve declining.',
            native:
              'Aunque la inteligencia resuelve problemas con rapidez, podría argumentarse que la sabiduría consiste en gran parte en saber qué problemas merecen resolverse y qué batallas merecen declinarse.',
          },
          {
            en: 'Admittedly, cleverness wins examinations and promotions; nevertheless, the most catastrophic decisions in history were frequently made by highly intelligent people lacking perspective.',
            native:
              'Es cierto que el ingenio gana exámenes y ascensos; sin embargo, las decisiones más catastróficas de la historia fueron tomadas con frecuencia por personas muy inteligentes sin perspectiva.',
          },
          {
            en: 'On balance, wisdom seems to accumulate through reflected experience rather than instruction, which perhaps explains why it remains stubbornly resistant to being taught.',
            native:
              'En definitiva, la sabiduría parece acumularse mediante la experiencia reflexionada más que por instrucción, lo que quizá explique por qué sigue siendo obstinadamente resistente a ser enseñada.',
          },
        ],
      },
      zh: {
        word: '智慧',
        question: '智慧与智力有何不同，它可以被教授吗？',
        examples: [
          {
            en: 'While intelligence solves problems quickly, it could be argued that wisdom consists largely in knowing which problems deserve solving and which battles deserve declining.',
            native: '尽管智力能快速解决问题，但可以认为，智慧很大程度上在于知道哪些问题值得解决、哪些争斗值得放弃。',
          },
          {
            en: 'Admittedly, cleverness wins examinations and promotions; nevertheless, the most catastrophic decisions in history were frequently made by highly intelligent people lacking perspective.',
            native: '诚然，聪明能赢得考试和晋升；然而，历史上最具灾难性的决策，往往是由极聪明却缺乏格局的人做出的。',
          },
          {
            en: 'On balance, wisdom seems to accumulate through reflected experience rather than instruction, which perhaps explains why it remains stubbornly resistant to being taught.',
            native:
              '总体而言，智慧似乎是通过反思过的经验而非教导积累起来的——这或许解释了为什么它始终顽固地抗拒被教授。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'knowledge',
    questionText: 'Is having access to unlimited information the same as having knowledge?',
    translations: {
      te: {
        word: 'విజ్ఞానం',
        question: 'అపరిమిత సమాచారానికి అందుబాటు ఉండడం విజ్ఞానం ఉండడంతో సమానమా?',
        examples: [
          {
            en: 'While the internet grants instant access to nearly all recorded information, it could be argued that information without understanding resembles a library read by no one.',
            native:
              'ఇంటర్నెట్ దాదాపు అన్ని నమోదైన సమాచారానికి తక్షణ అందుబాటును ఇచ్చినప్పటికీ, అవగాహన లేని సమాచారం ఎవరూ చదవని గ్రంథాలయంలాంటిదని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, lookup tools free memory for higher thinking; nevertheless, effortless retrieval appears to erode the slow, effortful learning through which deep knowledge actually forms.',
            native:
              'నిజానికి సెర్చ్ సాధనాలు ఉన్నత ఆలోచన కోసం జ్ఞాపకశక్తిని విడుదల చేస్తాయి; అయినప్పటికీ, శ్రమరహిత పునఃప్రాప్తి లోతైన విజ్ఞానం వాస్తవంగా ఏర్పడే నెమ్మదైన, శ్రమతో కూడిన అభ్యాసాన్ని తగ్గిస్తుందని అనిపిస్తుంది.',
          },
          {
            en: 'On balance, knowledge seems to involve judgment about what matters and why, a capacity no search engine has yet managed to outsource convincingly.',
            native:
              'మొత్తానికి, విజ్ఞానం ఏది ముఖ్యమో, ఎందుకో గురించిన విచారణను కలిగి ఉంటుందని అనిపిస్తుంది; ఏ సెర్చ్ ఇంజిన్ ఇంకా నమ్మదగినంతగా బహిష్కరించలేని సామర్థ్యం ఇది.',
          },
        ],
      },
      hi: {
        word: 'ज्ञान',
        question: 'क्या असीमित जानकारी तक पहुँच होना ज्ञान होने के समान है?',
        examples: [
          {
            en: 'While the internet grants instant access to nearly all recorded information, it could be argued that information without understanding resembles a library read by no one.',
            native:
              'जबकि इंटरनेट लगभग सारी दर्ज जानकारी तक तुरंत पहुँच देता है, यह तर्क दिया जा सकता है कि बिना समझ की जानकारी ऐसे पुस्तकालय जैसी है जिसे कोई नहीं पढ़ता।',
          },
          {
            en: 'Admittedly, lookup tools free memory for higher thinking; nevertheless, effortless retrieval appears to erode the slow, effortful learning through which deep knowledge actually forms.',
            native:
              'यह स्वीकार करना होगा कि खोज उपकरण उच्च चिंतन के लिए स्मृति मुक्त करते हैं; फिर भी, सहज पुनर्प्राप्ति उस धीमी, प्रयासपूर्ण सीखने की प्रक्रिया को क्षय करती प्रतीत होती है जिससे गहरा ज्ञान वास्तव में बनता है।',
          },
          {
            en: 'On balance, knowledge seems to involve judgment about what matters and why, a capacity no search engine has yet managed to outsource convincingly.',
            native:
              'कुल मिलाकर, ज्ञान में यह विवेक शामिल लगता है कि क्या मायने रखता है और क्यों—यह क्षमता अब तक कोई खोज इंजन विश्वसनीय रूप से बाहर नहीं सौंप पाया है।',
          },
        ],
      },
      es: {
        word: 'conocimiento',
        question: '¿Es tener acceso a información ilimitada lo mismo que tener conocimiento?',
        examples: [
          {
            en: 'While the internet grants instant access to nearly all recorded information, it could be argued that information without understanding resembles a library read by no one.',
            native:
              'Aunque internet otorga acceso instantáneo a casi toda la información registrada, podría argumentarse que la información sin comprensión se parece a una biblioteca que nadie lee.',
          },
          {
            en: 'Admittedly, lookup tools free memory for higher thinking; nevertheless, effortless retrieval appears to erode the slow, effortful learning through which deep knowledge actually forms.',
            native:
              'Es cierto que las herramientas de búsqueda liberan memoria para el pensamiento superior; sin embargo, la recuperación sin esfuerzo parece erosionar el aprendizaje lento y esforzado mediante el cual se forma realmente el conocimiento profundo.',
          },
          {
            en: 'On balance, knowledge seems to involve judgment about what matters and why, a capacity no search engine has yet managed to outsource convincingly.',
            native:
              'En definitiva, el conocimiento parece implicar juicio sobre qué importa y por qué, una capacidad que ningún buscador ha logrado aún subcontratar de forma convincente.',
          },
        ],
      },
      zh: {
        word: '知识',
        question: '能够获取无限的信息等同于拥有知识吗？',
        examples: [
          {
            en: 'While the internet grants instant access to nearly all recorded information, it could be argued that information without understanding resembles a library read by no one.',
            native:
              '尽管互联网让人们能即时获取几乎所有已记录的信息，但可以认为，没有理解的信息就像一座无人阅读的图书馆。',
          },
          {
            en: 'Admittedly, lookup tools free memory for higher thinking; nevertheless, effortless retrieval appears to erode the slow, effortful learning through which deep knowledge actually forms.',
            native:
              '诚然，搜索工具解放了记忆以便进行更高层次的思考；然而，毫不费力的检索似乎侵蚀了真正形成深层知识的那种缓慢而费力的学习。',
          },
          {
            en: 'On balance, knowledge seems to involve judgment about what matters and why, a capacity no search engine has yet managed to outsource convincingly.',
            native:
              '总体而言，知识似乎包含对什么重要以及为何重要的判断力——这是任何搜索引擎迄今都无法令人信服地外包的能力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'honesty',
    questionText: 'Is complete honesty always the best policy, or are small lies sometimes necessary?',
    translations: {
      te: {
        word: 'నిజాయితీ',
        question: 'పూర్తి నిజాయితీ ఎల్లప్పుడూ ఉత్తమ విధానమేనా, లేక చిన్న అబద్ధాలు కొన్నిసార్లు అవసరమా?',
        examples: [
          {
            en: "While honesty underpins every durable relationship, it could be argued that unfiltered truth-telling sometimes serves the speaker's conscience more than the listener's welfare.",
            native:
              'నిజాయితీ ప్రతి శాశ్వత సంబంధానికి పునాది అయినప్పటికీ, వడపోత లేని నిజం చెప్పడం కొన్నిసార్లు వినేవారి శ్రేయస్సు కంటే చెప్పేవారి మనస్సాక్షికే ఎక్కువగా సేవ చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, tactful omissions can be kind; nevertheless, habitual small dishonesties corrode trust quietly, since people forgive painful truths far more readily than discovered deceptions.',
            native:
              'నిజానికి మర్యాదపూర్వక మినహాయింపులు దయగా ఉండవచ్చు; అయినప్పటికీ, అలవాటుపడిన చిన్న అసత్యాలు నమ్మకాన్ని నిశ్శబ్దంగా తరిగివేస్తాయి, ఎందుకంటే ప్రజలు బయటపడిన మోసాల కంటే బాధాకరమైన నిజాలను చాలా త్వరగా క్షమిస్తారు.',
          },
          {
            en: 'On balance, honesty seems to require courage delivered with tact, a combination considerably rarer than either brutal candour or comfortable silence.',
            native:
              'మొత్తానికి, నిజాయితీ మర్యాదతో కూడిన ధైర్యాన్ని కోరుతుందని అనిపిస్తుంది; ముద్దోష్టమైన స్పష్టత లేదా సౌకర్యవంతమైన మౌనం కంటే ఈ కలయిక చాలా అరుదు.',
          },
        ],
      },
      hi: {
        word: 'ईमानदारी',
        question: 'क्या पूर्ण ईमानदारी हमेशा सबसे अच्छी नीति है, या छोटे झूठ कभी-कभी आवश्यक हैं?',
        examples: [
          {
            en: "While honesty underpins every durable relationship, it could be argued that unfiltered truth-telling sometimes serves the speaker's conscience more than the listener's welfare.",
            native:
              'जबकि ईमानदारी हर टिकाऊ रिश्ते की बुनियाद है, यह तर्क दिया जा सकता है कि बिना छाँटी सच्चाई कभी-कभी सुनने वाले की भलाई से ज़्यादा बोलने वाले की अंतरात्मा की सेवा करती है।',
          },
          {
            en: 'Admittedly, tactful omissions can be kind; nevertheless, habitual small dishonesties corrode trust quietly, since people forgive painful truths far more readily than discovered deceptions.',
            native:
              'यह स्वीकार करना होगा कि व्यवहारकुशल चुप्पियाँ दयालु हो सकती हैं; फिर भी, आदतन छोटी बेईमानियाँ विश्वास को चुपचाप क्षय करती हैं, क्योंकि लोग पकड़े गए धोखों की तुलना में दर्दनाक सच्चाई कहीं जल्दी माफ़ कर देते हैं।',
          },
          {
            en: 'On balance, honesty seems to require courage delivered with tact, a combination considerably rarer than either brutal candour or comfortable silence.',
            native:
              'कुल मिलाकर, ईमानदारी व्यवहार के साथ दिया गया साहस माँगती प्रतीत होती है—यह मेल क्रूर स्पष्टवादिता या सुविधाजनक मौन दोनों से काफी दुर्लभ है।',
          },
        ],
      },
      es: {
        word: 'honestidad',
        question:
          '¿Es la honestidad completa siempre la mejor política, o son a veces necesarias las pequeñas mentiras?',
        examples: [
          {
            en: "While honesty underpins every durable relationship, it could be argued that unfiltered truth-telling sometimes serves the speaker's conscience more than the listener's welfare.",
            native:
              'Aunque la honestidad sustenta toda relación duradera, podría argumentarse que decir la verdad sin filtros a veces sirve más a la conciencia del que habla que al bienestar del que escucha.',
          },
          {
            en: 'Admittedly, tactful omissions can be kind; nevertheless, habitual small dishonesties corrode trust quietly, since people forgive painful truths far more readily than discovered deceptions.',
            native:
              'Es cierto que las omisiones corteses pueden ser bondadosas; sin embargo, las pequeñas deshonestidades habituales erosionan la confianza en silencio, ya que la gente perdona verdades dolorosas mucho antes que engaños descubiertos.',
          },
          {
            en: 'On balance, honesty seems to require courage delivered with tact, a combination considerably rarer than either brutal candour or comfortable silence.',
            native:
              'En definitiva, la honestidad parece exigir coraje entregado con tacto, una combinación considerablemente más rara que la franqueza brutal o el silencio cómodo.',
          },
        ],
      },
      zh: {
        word: '诚实',
        question: '完全诚实永远是上策吗，还是小小的谎言有时是必要的？',
        examples: [
          {
            en: "While honesty underpins every durable relationship, it could be argued that unfiltered truth-telling sometimes serves the speaker's conscience more than the listener's welfare.",
            native:
              '尽管诚实是每段持久关系的基石，但可以认为，不加过滤的真话有时更多地服务于说话者的良心，而非倾听者的福祉。',
          },
          {
            en: 'Admittedly, tactful omissions can be kind; nevertheless, habitual small dishonesties corrode trust quietly, since people forgive painful truths far more readily than discovered deceptions.',
            native:
              '诚然，得体的隐瞒可能是善意的；然而，习惯性的小谎言会悄悄侵蚀信任，因为人们原谅痛苦的真话远比原谅被揭穿的欺骗要快。',
          },
          {
            en: 'On balance, honesty seems to require courage delivered with tact, a combination considerably rarer than either brutal candour or comfortable silence.',
            native: '总体而言，诚实似乎需要以圆融方式表达的勇气——这种结合比残酷的坦率或舒适的沉默都要罕见得多。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'integrity',
    questionText: 'What does it mean to have integrity when no one is watching?',
    translations: {
      te: {
        word: 'సమగ్రత',
        question: 'ఎవరూ చూడనప్పుడు సమగ్రత ఉండడం అంటే ఏమిటి?',
        examples: [
          {
            en: 'While reputation depends on what others observe, it could be argued that integrity is precisely what remains when observation, incentives, and consequences are all removed.',
            native:
              'కీర్తి ఇతరులు గమనించే దానిపై ఆధారపడినప్పటికీ, పర్యవేక్షణ, ప్రోత్సాహకాలు, పరిణామాలు అన్నీ తీసేసినప్పుడు మిగిలేదే సమగ్రత అని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, few people withstand every temptation flawlessly; nevertheless, character reveals itself less in dramatic choices than in small, unwitnessed decisions repeated daily.',
            native:
              'నిజానికి ప్రతి ప్రలోభాన్ని లోపం లేకుండా తట్టుకునేవారు తక్కువ; అయినప్పటికీ, స్వభావం నాటకీయ ఎంపికల్లో కంటే రోజూ పునరావృతమయ్యే చిన్న, ఎవరూ చూడని నిర్ణయాల్లోనే బహిర్గతమవుతుంది.',
          },
          {
            en: 'On balance, integrity seems less a fixed possession than a practice, sustained by habits so consistent they eventually become indistinguishable from identity itself.',
            native:
              'మొత్తానికి, సమగ్రత స్థిరమైన ఆస్తి కంటే ఒక అభ్యాసంలా కనిపిస్తుంది; చివరికి గుర్తింపుతోనే వేరు చేయలేనంత స్థిరమైన అలవాట్లు దాన్ని నిలుపుతాయి.',
          },
        ],
      },
      hi: {
        word: 'सत्यनिष्ठा',
        question: 'जब कोई देख नहीं रहा हो तो सत्यनिष्ठा होने का क्या अर्थ है?',
        examples: [
          {
            en: 'While reputation depends on what others observe, it could be argued that integrity is precisely what remains when observation, incentives, and consequences are all removed.',
            native:
              'जबकि प्रतिष्ठा इस पर निर्भर करती है कि दूसरे क्या देखते हैं, यह तर्क दिया जा सकता है कि सत्यनिष्ठा ठीक वही है जो निगरानी, प्रोत्साहन और परिणाम—सब हटा दिए जाने पर बचती है।',
          },
          {
            en: 'Admittedly, few people withstand every temptation flawlessly; nevertheless, character reveals itself less in dramatic choices than in small, unwitnessed decisions repeated daily.',
            native:
              'यह स्वीकार करना होगा कि बहुत कम लोग हर प्रलोभन का निर्दोष सामना करते हैं; फिर भी, चरित्र नाटकीय चुनावों से कम और रोज़ दोहराए गए छोटे, अदेखे फैसलों में अधिक प्रकट होता है।',
          },
          {
            en: 'On balance, integrity seems less a fixed possession than a practice, sustained by habits so consistent they eventually become indistinguishable from identity itself.',
            native:
              'कुल मिलाकर, सत्यनिष्ठा कोई स्थिर संपत्ति से कम और एक अभ्यास जैसी अधिक लगती है, जिसे इतनी सुसंगत आदतें कायम रखती हैं कि वे अंततः पहचान से अलग नहीं रहतीं।',
          },
        ],
      },
      es: {
        word: 'integridad',
        question: '¿Qué significa tener integridad cuando nadie está mirando?',
        examples: [
          {
            en: 'While reputation depends on what others observe, it could be argued that integrity is precisely what remains when observation, incentives, and consequences are all removed.',
            native:
              'Aunque la reputación depende de lo que otros observan, podría argumentarse que la integridad es precisamente lo que queda cuando se eliminan la observación, los incentivos y las consecuencias.',
          },
          {
            en: 'Admittedly, few people withstand every temptation flawlessly; nevertheless, character reveals itself less in dramatic choices than in small, unwitnessed decisions repeated daily.',
            native:
              'Es cierto que pocas personas resisten toda tentación sin fallas; sin embargo, el carácter se revela menos en decisiones dramáticas que en pequeñas decisiones sin testigos repetidas a diario.',
          },
          {
            en: 'On balance, integrity seems less a fixed possession than a practice, sustained by habits so consistent they eventually become indistinguishable from identity itself.',
            native:
              'En definitiva, la integridad parece menos una posesión fija que una práctica, sostenida por hábitos tan consistentes que acaban siendo indistinguibles de la propia identidad.',
          },
        ],
      },
      zh: {
        word: '正直',
        question: '在无人注视的时候，坚守正直意味着什么？',
        examples: [
          {
            en: 'While reputation depends on what others observe, it could be argued that integrity is precisely what remains when observation, incentives, and consequences are all removed.',
            native:
              '尽管声誉取决于他人所观察到的，但可以认为，正直恰恰是在观察、激励和后果都被移除之后仍然留存的东西。',
          },
          {
            en: 'Admittedly, few people withstand every temptation flawlessly; nevertheless, character reveals itself less in dramatic choices than in small, unwitnessed decisions repeated daily.',
            native:
              '诚然，很少有人能毫无瑕疵地抵挡每一种诱惑；然而，品格更多地体现在每天重复的那些无人见证的小决定中，而非戏剧性的抉择里。',
          },
          {
            en: 'On balance, integrity seems less a fixed possession than a practice, sustained by habits so consistent they eventually become indistinguishable from identity itself.',
            native:
              '总体而言，正直似乎不是一种固定的所有物，而是一种实践——由高度一致的习惯维系，以至于它们最终与身份本身难以区分。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'loyalty',
    questionText: 'Is loyalty an unconditional virtue, or should it depend on how others behave?',
    translations: {
      te: {
        word: 'విశ్వాసం',
        question: 'విశ్వాసం నిష్ఠారహిత సద్గుణమా, లేక ఇతరుల ప్రవర్తనపై ఆధారపడాలా?',
        examples: [
          {
            en: 'While loyalty binds families, friendships, and nations together, it could be argued that unconditional allegiance has excused complicity in countless historical wrongs.',
            native:
              'విశ్వాసం కుటుంబాలనూ, స్నేహాలనూ, దేశాలనూ కలిపి ఉంచినప్పటికీ, నిష్ఠారహిత అనుగత్యం అసంఖ్యాక చారిత్రక తప్పుల్లో భాగస్వామ్యానికి సాకు ఇచ్చిందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, abandoning commitments at the first disappointment is hardly admirable; nevertheless, loyalty that survives betrayal of shared values ceases to be a virtue at all.',
            native:
              'నిజానికి మొదటి నిరాశ వద్దే వాగ్దానాలను వదిలివేయడం ప్రశంసనీయం కాదు; అయినప్పటికీ, ఉమ్మడి విలువల ద్రోహం తర్వాతనూ మిగిలే విశ్వాసం ఇక సద్గుణం కాదు.',
          },
          {
            en: 'On balance, loyalty seems to deserve its high reputation only when it remains conditional on decency, a qualification its most fervent defenders rarely mention.',
            native:
              'మొత్తానికి, విశ్వాసం మర్యాదపై షరతుగా ఉన్నప్పుడే తన ఉన్నత ఖ్యాతికి అర్హమవుతుందని అనిపిస్తుంది; దాని అత్యంత ఉత్సాహవంతమైన సమర్థకులు అరుదుగా ప్రస్తావించే అర్హత ఇది.',
          },
        ],
      },
      hi: {
        word: 'निष्ठा',
        question: 'क्या निष्ठा एक बिना शर्त गुण है, या इसे दूसरों के व्यवहार पर निर्भर होना चाहिए?',
        examples: [
          {
            en: 'While loyalty binds families, friendships, and nations together, it could be argued that unconditional allegiance has excused complicity in countless historical wrongs.',
            native:
              'जबकि निष्ठा परिवारों, दोस्तियों और राष्ट्रों को बाँधती है, यह तर्क दिया जा सकता है कि बिना शर्त वफ़ादारी ने अनगिनत ऐतिहासिक दुष्कृत्यों में भागीदारी का बहाना दिया है।',
          },
          {
            en: 'Admittedly, abandoning commitments at the first disappointment is hardly admirable; nevertheless, loyalty that survives betrayal of shared values ceases to be a virtue at all.',
            native:
              'यह स्वीकार करना होगा कि पहली निराशा पर ही प्रतिबद्धताएँ छोड़ देना सराहनीय नहीं है; फिर भी, साझा मूल्यों के विश्वासघात के बाद भी टिकी निष्ठा गुण रहना बंद कर देती है।',
          },
          {
            en: 'On balance, loyalty seems to deserve its high reputation only when it remains conditional on decency, a qualification its most fervent defenders rarely mention.',
            native:
              'कुल मिलाकर, निष्ठा अपनी ऊँची प्रतिष्ठा की हक़दार तभी लगती है जब वह सभ्यता पर सशर्त रहे—यह शर्त इसके सबसे उत्साही समर्थक शायद ही कभी बताते हैं।',
          },
        ],
      },
      es: {
        word: 'lealtad',
        question: '¿Es la lealtad una virtud incondicional, o debería depender de cómo se comporten los demás?',
        examples: [
          {
            en: 'While loyalty binds families, friendships, and nations together, it could be argued that unconditional allegiance has excused complicity in countless historical wrongs.',
            native:
              'Aunque la lealtad une a familias, amistades y naciones, podría argumentarse que la fidelidad incondicional ha excusado la complicidad en innumerables errores históricos.',
          },
          {
            en: 'Admittedly, abandoning commitments at the first disappointment is hardly admirable; nevertheless, loyalty that survives betrayal of shared values ceases to be a virtue at all.',
            native:
              'Es cierto que abandonar los compromisos a la primera decepción no es admirable; sin embargo, la lealtad que sobrevive a la traición de valores compartidos deja de ser una virtud.',
          },
          {
            en: 'On balance, loyalty seems to deserve its high reputation only when it remains conditional on decency, a qualification its most fervent defenders rarely mention.',
            native:
              'En definitiva, la lealtad solo parece merecer su elevada reputación cuando permanece condicionada a la decencia, una matización que sus defensores más fervientes rara vez mencionan.',
          },
        ],
      },
      zh: {
        word: '忠诚',
        question: '忠诚是一种无条件的美德，还是应当取决于他人的行为？',
        examples: [
          {
            en: 'While loyalty binds families, friendships, and nations together, it could be argued that unconditional allegiance has excused complicity in countless historical wrongs.',
            native:
              '尽管忠诚把家庭、友谊和国家凝聚在一起，但可以认为，无条件的效忠曾为无数历史错误中的同谋行为提供了借口。',
          },
          {
            en: 'Admittedly, abandoning commitments at the first disappointment is hardly admirable; nevertheless, loyalty that survives betrayal of shared values ceases to be a virtue at all.',
            native:
              '诚然，一遇到失望就背弃承诺并不值得钦佩；然而，在共同价值观遭到背叛后仍然存续的忠诚，就不再是美德了。',
          },
          {
            en: 'On balance, loyalty seems to deserve its high reputation only when it remains conditional on decency, a qualification its most fervent defenders rarely mention.',
            native: '总体而言，忠诚只有在以正直为条件时才配得上它的崇高声誉——而它最狂热的捍卫者很少提及这一限定。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'forgiveness',
    questionText: 'Does forgiving someone benefit the victim more than the offender?',
    translations: {
      te: {
        word: 'క్షమాపణ',
        question: 'ఎవరినైనా క్షమించడం నేరస్తుడి కంటే బాధితుడికే ఎక్కువ ప్రయోజనం చేస్తుందా?',
        examples: [
          {
            en: 'While forgiveness is often framed as a gift to the wrongdoer, it could be argued that its principal beneficiary is the forgiver, released from the weight of resentment.',
            native:
              'క్షమాపణను తరచుగా తప్పుచేసినవారికి ఇచ్చే బహుమతిగా చిత్రించినప్పటికీ, దాని ప్రధాన లబ్ధిదారు క్షమించినవారే—అసూయ భారం నుండి విడుదలైనవారు—అని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, some offences seem unforgivable, and pressured reconciliation can feel like a second injustice; nevertheless, refusing ever to forgive tends to prolong the original harm indefinitely.',
            native:
              'నిజానికి కొన్ని నేరాలు క్షమించలేనివిగా అనిపిస్తాయి, బలవంతపు సర్దుబాటు రెండో అన్యాయంలా అనిపించవచ్చు; అయినప్పటికీ, ఎప్పుడూ క్షమించకపోవడం అసలు హానిని అనిదిష్టంగా పొడిగిస్తుంది.',
          },
          {
            en: 'On balance, forgiveness seems to work best when it is chosen freely and slowly, since commanded pardons rarely achieve the peace they are supposed to produce.',
            native:
              'మొత్తానికి, క్షమాపణ స్వేచ్ఛగా, నెమ్మదిగా ఎంచుకున్నప్పుడే బాగా పనిచేస్తుందని అనిపిస్తుంది, ఎందుకంటే ఆజ్ఞాపించిన మాఫీలు తాము ఉత్పత్తి చేయాల్సిన శాంతిని అరుదుగా సాధిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'क्षमा',
        question: 'क्या किसी को क्षमा करना अपराधी से ज़्यादा पीड़ित को लाभ पहुँचाता है?',
        examples: [
          {
            en: 'While forgiveness is often framed as a gift to the wrongdoer, it could be argued that its principal beneficiary is the forgiver, released from the weight of resentment.',
            native:
              'जबकि क्षमा को अक्सर अपराधी को दिया गया उपहार बताया जाता है, यह तर्क दिया जा सकता है कि इसका मुख्य लाभार्थी स्वयं क्षमा करने वाला है, जो ईर्ष्या के बोझ से मुक्त हो जाता है।',
          },
          {
            en: 'Admittedly, some offences seem unforgivable, and pressured reconciliation can feel like a second injustice; nevertheless, refusing ever to forgive tends to prolong the original harm indefinitely.',
            native:
              'यह स्वीकार करना होगा कि कुछ अपराध अक्षम्य लगते हैं, और दबाव में मेल-मिलाप दूसरा अन्याय जैसा लग सकता है; फिर भी, कभी क्षमा न करने से इनकार करना मूल क्षति को अनिश्चित काल तक लम्बा कर देता है।',
          },
          {
            en: 'On balance, forgiveness seems to work best when it is chosen freely and slowly, since commanded pardons rarely achieve the peace they are supposed to produce.',
            native:
              'कुल मिलाकर, क्षमा तब सबसे अच्छा काम करती लगती है जब उसे स्वतंत्र रूप से और धीरे-धीरे चुना जाए, क्योंकि आदेशित माफ़ियाँ शायद ही कभी वह शांति लाती हैं जो उनसे अपेक्षित होती है।',
          },
        ],
      },
      es: {
        word: 'perdón',
        question: '¿Beneficia perdonar a alguien más a la víctima que al ofensor?',
        examples: [
          {
            en: 'While forgiveness is often framed as a gift to the wrongdoer, it could be argued that its principal beneficiary is the forgiver, released from the weight of resentment.',
            native:
              'Aunque el perdón suele presentarse como un regalo para el ofensor, podría argumentarse que su principal beneficiario es quien perdona, liberado del peso del resentimiento.',
          },
          {
            en: 'Admittedly, some offences seem unforgivable, and pressured reconciliation can feel like a second injustice; nevertheless, refusing ever to forgive tends to prolong the original harm indefinitely.',
            native:
              'Es cierto que algunas ofensas parecen imperdonables, y la reconciliación forzada puede sentirse como una segunda injusticia; sin embargo, negarse jamás a perdonar tiende a prolongar el daño original indefinidamente.',
          },
          {
            en: 'On balance, forgiveness seems to work best when it is chosen freely and slowly, since commanded pardons rarely achieve the peace they are supposed to produce.',
            native:
              'En definitiva, el perdón parece funcionar mejor cuando se elige libremente y con lentitud, ya que las absoluciones ordenadas rara vez logran la paz que se supone deben producir.',
          },
        ],
      },
      zh: {
        word: '宽恕',
        question: '宽恕一个人对受害者的益处是否大于对过错者的益处？',
        examples: [
          {
            en: 'While forgiveness is often framed as a gift to the wrongdoer, it could be argued that its principal beneficiary is the forgiver, released from the weight of resentment.',
            native:
              '尽管宽恕常被描述为给予过错者的礼物，但可以认为，它的主要受益者是宽恕者本人——从怨恨的重负中解脱出来的人。',
          },
          {
            en: 'Admittedly, some offences seem unforgivable, and pressured reconciliation can feel like a second injustice; nevertheless, refusing ever to forgive tends to prolong the original harm indefinitely.',
            native:
              '诚然，有些冒犯似乎不可原谅，而被施压的和解可能让人感觉像第二次不公；然而，永远拒绝宽恕往往会无限期地延长最初的伤害。',
          },
          {
            en: 'On balance, forgiveness seems to work best when it is chosen freely and slowly, since commanded pardons rarely achieve the peace they are supposed to produce.',
            native: '总体而言，宽恕在被自由地、缓慢地选择时似乎效果最好，因为被命令的赦免很少能带来它本应产生的平静。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'courage',
    questionText: 'Is courage the absence of fear, or acting rightly despite being afraid?',
    translations: {
      te: {
        word: 'ధైర్యం',
        question: 'ధైర్యం అంటే భయం లేకపోవడమా, లేక భయపడుతున్నా సరైనది చేయడమా?',
        examples: [
          {
            en: 'While we celebrate fearless heroes, it could be argued that courage without fear is merely confidence, and that true bravery requires something worth fearing.',
            native:
              'మనం నిర్భయ వీరులను కొనియాడినప్పటికీ, భయం లేని ధైర్యం కేవలం ఆత్మవిశ్వాసమేనని, నిజమైన పరాక్రమానికి భయపడదగిన ఏదో అవసరమని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, physical daring impresses us most; nevertheless, moral courage—admitting error, defending the unpopular—demands far more of most people than any battlefield.',
            native:
              'నిజానికి శారీరక ధైర్యం మనల్ని అత్యంత ఆకట్టుకుంటుంది; అయినప్పటికీ, నైతిక ధైర్యం—పొరపాటు ఒప్పుకోవడం, అప్రజాదరణ పొందినదాన్ని సమర్థించడం—ఏ యుద్ధభూమి కంటే చాలామంది నుండి ఎక్కువను కోరుతుంది.',
          },
          {
            en: 'On balance, courage seems less an inborn trait than a decision practised repeatedly, which suggests it is available to anyone willing to act while still afraid.',
            native:
              'మొత్తానికి, ధైర్యం సహజ లక్షణం కంటే పదేపదే అభ్యసించే నిర్ణయంలా కనిపిస్తుంది; భయంతో ఉండగానే చర్య తీసుకోవాలనుకునే ఎవరికైనా అది అందుబాటులో ఉందని ఇది సూచిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'साहस',
        question: 'क्या साहस भय की अनुपस्थिति है, या डरते हुए भी सही कार्य करना?',
        examples: [
          {
            en: 'While we celebrate fearless heroes, it could be argued that courage without fear is merely confidence, and that true bravery requires something worth fearing.',
            native:
              'जबकि हम निडर नायकों का गुणगान करते हैं, यह तर्क दिया जा सकता है कि भय के बिना साहस महज़ आत्मविश्वास है, और सच्ची वीरता के लिए किसी डरने लायक चीज़ की ज़रूरत होती है।',
          },
          {
            en: 'Admittedly, physical daring impresses us most; nevertheless, moral courage—admitting error, defending the unpopular—demands far more of most people than any battlefield.',
            native:
              'यह स्वीकार करना होगा कि शारीरिक दुस्साहस हमें सबसे अधिक प्रभावित करता है; फिर भी, नैतिक साहस—गलती मानना, अलोकप्रिय का बचाव—अधिकांश लोगों से किसी भी युद्धभूमि से कहीं अधिक माँगता है।',
          },
          {
            en: 'On balance, courage seems less an inborn trait than a decision practised repeatedly, which suggests it is available to anyone willing to act while still afraid.',
            native:
              'कुल मिलाकर, साहस जन्मजात गुण से कम और बार-बार किया गया निर्णय जैसा अधिक लगता है—इससे पता चलता है कि यह हर उस व्यक्ति के लिए उपलब्ध है जो डरते हुए भी कार्य करने को तैयार हो।',
          },
        ],
      },
      es: {
        word: 'valentía',
        question: '¿Es la valentía la ausencia de miedo, o actuar correctamente a pesar del temor?',
        examples: [
          {
            en: 'While we celebrate fearless heroes, it could be argued that courage without fear is merely confidence, and that true bravery requires something worth fearing.',
            native:
              'Aunque celebramos a los héroes intrépidos, podría argumentarse que la valentía sin miedo es mera confianza, y que el verdadero coraje requiere algo que valga la pena temer.',
          },
          {
            en: 'Admittedly, physical daring impresses us most; nevertheless, moral courage—admitting error, defending the unpopular—demands far more of most people than any battlefield.',
            native:
              'Es cierto que la osadía física es lo que más nos impresiona; sin embargo, el coraje moral —admitir el error, defender lo impopular— exige a la mayoría mucho más que cualquier campo de batalla.',
          },
          {
            en: 'On balance, courage seems less an inborn trait than a decision practised repeatedly, which suggests it is available to anyone willing to act while still afraid.',
            native:
              'En definitiva, la valentía parece menos un rasgo innato que una decisión practicada repetidamente, lo que sugiere que está al alcance de cualquiera dispuesto a actuar aun sintiendo miedo.',
          },
        ],
      },
      zh: {
        word: '勇气',
        question: '勇气是没有恐惧，还是尽管害怕仍然做正确的事？',
        examples: [
          {
            en: 'While we celebrate fearless heroes, it could be argued that courage without fear is merely confidence, and that true bravery requires something worth fearing.',
            native:
              '尽管我们赞美无所畏惧的英雄，但可以认为，没有恐惧的勇气不过是自信，而真正的勇敢需要有值得害怕的东西存在。',
          },
          {
            en: 'Admittedly, physical daring impresses us most; nevertheless, moral courage—admitting error, defending the unpopular—demands far more of most people than any battlefield.',
            native:
              '诚然，身体上的胆识最令我们印象深刻；然而，道德勇气——承认错误、捍卫不受欢迎的事物——对大多数人的要求远胜任何战场。',
          },
          {
            en: 'On balance, courage seems less an inborn trait than a decision practised repeatedly, which suggests it is available to anyone willing to act while still afraid.',
            native:
              '总体而言，勇气与其说是一种天生的特质，不如说是一个反复练习的决定——这意味着任何愿意带着恐惧行动的人都可以拥有它。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'hope',
    questionText: 'Is hope a realistic guide to action, or merely a comforting illusion?',
    translations: {
      te: {
        word: 'ఆశ',
        question: 'ఆశ చర్యకు వాస్తవిక మార్గదర్శియా, లేక కేవలం ఓదార్పు భ్రమయా?',
        examples: [
          {
            en: 'While cynics dismiss hope as naivety, it could be argued that nearly every significant achievement began as an act of hope unsupported by guarantees.',
            native:
              'నిరాశావాదులు ఆశను అమాయకత్వంగా తక్కువ చేసినప్పటికీ, దాదాపు ప్రతి గణనీయమైన విజయం హామీలు లేని ఆశ చర్యగా ప్రారంభమైందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, blind optimism delays necessary adaptation; nevertheless, hopelessness is demonstrably a worse guide, since it forecloses possibilities that effort might have created.',
            native:
              'నిజానికి గుడ్డి ఆశావాదం అవసరమైన అనుసరణను ఆలస్యం చేస్తుంది; అయినప్పటికీ, నిరాశ స్పష్టంగా చెత్త మార్గదర్శి, ఎందుకంటే అది కృషి సృష్టించి ఉండగల అవకాశాలను ముందే మూసివేస్తుంది.',
          },
          {
            en: 'On balance, hope seems wisest when coupled with clear-eyed assessment, functioning less as a prediction of success than as a precondition for attempting it.',
            native:
              'మొత్తానికి, ఆశ స్పష్టమైన అంచనాతో జతచేయబడినప్పుడు అత్యంత తెలివైనదిగా ఉంటుంది; విజయం యొక్క అంచనాగా కంటే దాన్ని ప్రయత్నించడానికి పూర్వపక్షంగా పనిచేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'आशा',
        question: 'क्या आशा कार्रवाई की यथार्थवादी मार्गदर्शक है, या महज़ एक सांत्वनादायक भ्रम?',
        examples: [
          {
            en: 'While cynics dismiss hope as naivety, it could be argued that nearly every significant achievement began as an act of hope unsupported by guarantees.',
            native:
              'जबकि निराशावादी आशा को भोलापन कहकर खारिज करते हैं, यह तर्क दिया जा सकता है कि लगभग हर महत्वपूर्ण उपलब्धि गारंटी के बिना आशा के कार्य के रूप में शुरू हुई।',
          },
          {
            en: 'Admittedly, blind optimism delays necessary adaptation; nevertheless, hopelessness is demonstrably a worse guide, since it forecloses possibilities that effort might have created.',
            native:
              'यह स्वीकार करना होगा कि अंधा आशावाद आवश्यक अनुकूलन में देरी करता है; फिर भी, निराशा प्रदर्शनात्मक रूप से बदतर मार्गदर्शक है, क्योंकि यह उन संभावनाओं को पहले से बंद कर देती है जिन्हें प्रयास पैदा कर सकता था।',
          },
          {
            en: 'On balance, hope seems wisest when coupled with clear-eyed assessment, functioning less as a prediction of success than as a precondition for attempting it.',
            native:
              'कुल मिलाकर, आशा तब सबसे बुद्धिमान लगती है जब वह स्पष्ट मूल्यांकन के साथ जुड़ी हो—यह सफलता की भविष्यवाणी से कम और उसे आज़माने की पूर्वशर्त जैसी अधिक काम करती है।',
          },
        ],
      },
      es: {
        word: 'esperanza',
        question: '¿Es la esperanza una guía realista para la acción, o meramente una ilusión reconfortante?',
        examples: [
          {
            en: 'While cynics dismiss hope as naivety, it could be argued that nearly every significant achievement began as an act of hope unsupported by guarantees.',
            native:
              'Aunque los cínicos descartan la esperanza como ingenuidad, podría argumentarse que casi todo logro significativo comenzó como un acto de esperanza sin garantías.',
          },
          {
            en: 'Admittedly, blind optimism delays necessary adaptation; nevertheless, hopelessness is demonstrably a worse guide, since it forecloses possibilities that effort might have created.',
            native:
              'Es cierto que el optimismo ciego retrasa la adaptación necesaria; sin embargo, la desesperanza es demostrablemente una guía peor, ya que cierra posibilidades que el esfuerzo podría haber creado.',
          },
          {
            en: 'On balance, hope seems wisest when coupled with clear-eyed assessment, functioning less as a prediction of success than as a precondition for attempting it.',
            native:
              'En definitiva, la esperanza parece más sabia cuando se acompaña de una evaluación lúcida, funcionando menos como predicción del éxito que como condición previa para intentarlo.',
          },
        ],
      },
      zh: {
        word: '希望',
        question: '希望是行动的现实指南，还是仅仅是一种令人安慰的幻觉？',
        examples: [
          {
            en: 'While cynics dismiss hope as naivety, it could be argued that nearly every significant achievement began as an act of hope unsupported by guarantees.',
            native: '尽管愤世嫉俗者把希望斥为天真，但可以认为，几乎每一项重大成就都始于一次没有保障支持的希望之举。',
          },
          {
            en: 'Admittedly, blind optimism delays necessary adaptation; nevertheless, hopelessness is demonstrably a worse guide, since it forecloses possibilities that effort might have created.',
            native:
              '诚然，盲目的乐观会拖延必要的调整；然而，绝望显然是更糟糕的向导，因为它预先扼杀了努力本可能创造的可能性。',
          },
          {
            en: 'On balance, hope seems wisest when coupled with clear-eyed assessment, functioning less as a prediction of success than as a precondition for attempting it.',
            native:
              '总体而言，希望在与清醒的评估相结合时似乎最为明智——它的作用与其说是对成功的预测，不如说是尝试成功的前提条件。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'optimism',
    questionText: 'Does being optimistic actually change outcomes, or only how we feel about them?',
    translations: {
      te: {
        word: 'ఆశావాదం',
        question: 'ఆశావాదం ఉండడం వాస్తవంగా ఫలితాలను మారుస్తుందా, లేక వాటి గురించి మనం ఎలా భావిస్తామో మాత్రమేనా?',
        examples: [
          {
            en: 'While pessimists pride themselves on realism, it could be argued that optimism functions as a self-fulfilling prophecy by sustaining effort where despair would quit early.',
            native:
              'నిరాశావాదులు తమ యథార్థత గురించి గర్వపడినప్పటికీ, నిరాశ త్వరగా వదులుకునే చోటు కృషిని కొనసాగించడం ద్వారా ఆశావాదం స్వయం పూర్తయ్యే ప్రవచనంగా పనిచేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, unchecked optimism blinds investors, planners, and patients to genuine risks; nevertheless, its absence reliably produces the failure that pessimism confidently predicted.',
            native:
              'నిజానికి అదుపులేని ఆశావాదం పెట్టుబడిదారులనూ, ప్రణాళికాకర్తలనూ, రోగులనూ నిజమైన ప్రమాదాల పట్ల గుడ్డివారిని చేస్తుంది; అయినప్పటికీ, దాని లేమి నిరాశావాదం నమ్మకంగా అంచనా వేసిన వైఫల్యాన్ని తప్పకుండా ఉత్పత్తి చేస్తుంది.',
          },
          {
            en: 'On balance, the evidence favours a disciplined optimism: expect favourable outcomes, yet prepare rigorously for unfavourable ones, a combination harder than either extreme.',
            native:
              'మొత్తానికి, సాక్ష్యాలు క్రమశిక్షణగల ఆశావాదానికి అనుకూలం: అనుకూల ఫలితాలను ఆశిస్తూ, ప్రతికూల ఫలితాలకు కఠోరంగా సిద్ధమవ్వడం; ఏ తీవ్రత కంటే కష్టమైన కలయిక ఇది.',
          },
        ],
      },
      hi: {
        word: 'आशावाद',
        question: 'क्या आशावादी होना वास्तव में परिणाम बदलता है, या सिर्फ उनके प्रति हमारी भावना?',
        examples: [
          {
            en: 'While pessimists pride themselves on realism, it could be argued that optimism functions as a self-fulfilling prophecy by sustaining effort where despair would quit early.',
            native:
              'जबकि निराशावादी अपनी यथार्थवादिता पर गर्व करते हैं, यह तर्क दिया जा सकता है कि आशावाद आत्मपूरक भविष्यवाणी की तरह काम करता है, जहाँ निराशा जल्दी हार मान लेती, वहाँ प्रयास को कायम रखकर।',
          },
          {
            en: 'Admittedly, unchecked optimism blinds investors, planners, and patients to genuine risks; nevertheless, its absence reliably produces the failure that pessimism confidently predicted.',
            native:
              'यह स्वीकार करना होगा कि अनियंत्रित आशावाद निवेशकों, योजनाकारों और रोगियों को वास्तविक जोखिमों से अंधा कर देता है; फिर भी, इसकी अनुपस्थिति विश्वसनीय रूप से वही असफलता पैदा करती है जिसकी भविष्यवाणी निराशावाद ने आत्मविश्वास से की थी।',
          },
          {
            en: 'On balance, the evidence favours a disciplined optimism: expect favourable outcomes, yet prepare rigorously for unfavourable ones, a combination harder than either extreme.',
            native:
              'कुल मिलाकर, प्रमाण अनुशासित आशावाद के पक्ष में है: अनुकूल परिणामों की अपेक्षा करें, फिर भी प्रतिकूल परिणामों की कठोर तैयारी करें—यह मेल किसी भी चरम से कठिन है।',
          },
        ],
      },
      es: {
        word: 'optimismo',
        question: '¿Cambia realmente los resultados ser optimista, o solo cómo nos sentimos al respecto?',
        examples: [
          {
            en: 'While pessimists pride themselves on realism, it could be argued that optimism functions as a self-fulfilling prophecy by sustaining effort where despair would quit early.',
            native:
              'Aunque los pesimistas se enorgullecen de su realismo, podría argumentarse que el optimismo funciona como profecía autocumplida al sostener el esfuerzo donde la desesperación abandonaría pronto.',
          },
          {
            en: 'Admittedly, unchecked optimism blinds investors, planners, and patients to genuine risks; nevertheless, its absence reliably produces the failure that pessimism confidently predicted.',
            native:
              'Es cierto que el optimismo descontrolado ciega a inversores, planificadores y pacientes ante riesgos genuinos; sin embargo, su ausencia produce con fiabilidad el fracaso que el pesimismo predijo confiadamente.',
          },
          {
            en: 'On balance, the evidence favours a disciplined optimism: expect favourable outcomes, yet prepare rigorously for unfavourable ones, a combination harder than either extreme.',
            native:
              'En definitiva, la evidencia favorece un optimismo disciplinado: esperar resultados favorables pero prepararse rigurosamente para los desfavorables, una combinación más difícil que cualquiera de los extremos.',
          },
        ],
      },
      zh: {
        word: '乐观',
        question: '乐观真的能改变结果吗，还是只改变我们对结果的感受？',
        examples: [
          {
            en: 'While pessimists pride themselves on realism, it could be argued that optimism functions as a self-fulfilling prophecy by sustaining effort where despair would quit early.',
            native:
              '尽管悲观主义者以现实主义为傲，但可以认为，乐观通过维持努力而成为一种自我实现的预言——而绝望则会早早放弃。',
          },
          {
            en: 'Admittedly, unchecked optimism blinds investors, planners, and patients to genuine risks; nevertheless, its absence reliably produces the failure that pessimism confidently predicted.',
            native:
              '诚然，失控的乐观会让投资者、规划者和患者对真正的风险视而不见；然而，缺少乐观则可靠地制造出悲观主义曾自信预测的失败。',
          },
          {
            en: 'On balance, the evidence favours a disciplined optimism: expect favourable outcomes, yet prepare rigorously for unfavourable ones, a combination harder than either extreme.',
            native:
              '总体而言，证据支持一种有纪律的乐观：期待有利的结果，同时严谨地为不利结果做准备——这种组合比任何一个极端都更难。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'regret',
    questionText: 'Do people regret the things they did more than the things they never tried?',
    translations: {
      te: {
        word: 'పశ్చాత్తాపం',
        question: 'ప్రజలు తాము చేసిన వాటి కంటే ఎప్పుడూ ప్రయత్నించని వాటి గురించే ఎక్కువగా పశ్చాత్తాపపడతారా?',
        examples: [
          {
            en: 'While failed attempts sting immediately, it could be argued that untaken chances ache far longer, since imagination keeps revising what might have been indefinitely.',
            native:
              'విఫల ప్రయత్నాలు వెంటనే బాధించినప్పటికీ, తీసుకోని అవకాశాలు చాలా కాలం బాధిస్తాయని చెప్పవచ్చు, ఎందుకంటే ఊహ ఉండేది ఏమిటో అనిదిష్టంగా సవరిస్తూనే ఉంటుంది.',
          },
          {
            en: "Admittedly, research on regret is complicated by memory's distortions; nevertheless, the dying consistently report regretting inaction considerably more than embarrassing or costly action.",
            native:
              'నిజానికి జ్ఞాపకశక్తి వక్రీకరణల వల్ల పశ్చాత్తాపంపై పరిశోధన క్లిష్టమైంది; అయినప్పటికీ, మరణ శయ్యల వారు సిగ్గుచెట్టు లేదా ఖరీదైన చర్య కంటే నిష్క్రియ గురించే గణనీయంగా ఎక్కువ పశ్చాత్తాపపడతారని నిరంతరం నివేదిస్తారు.',
          },
          {
            en: 'On balance, regret seems a poor compass but a useful teacher, provided one examines it occasionally rather than taking up permanent residence in its territory.',
            native:
              'మొత్తానికి, పశ్చాత్తాపం పేద దిక్సూచి అయినా ఉపయోగకరమైన ఉపాధ్యాయుడు అనిపిస్తుంది; దాని భూభాగంలో శాశ్వత నివాసం ఏర్పరచుకోకుండా అప్పుడప్పుడూ పరిశీలిస్తే చాలు.',
          },
        ],
      },
      hi: {
        word: 'पछतावा',
        question: 'क्या लोगों को की हुई चीज़ों से ज़्यादा कभी न आज़माई गई चीज़ों का पछतावा होता है?',
        examples: [
          {
            en: 'While failed attempts sting immediately, it could be argued that untaken chances ache far longer, since imagination keeps revising what might have been indefinitely.',
            native:
              'जबकि असफल प्रयास तुरंत चुभते हैं, यह तर्क दिया जा सकता है कि न लिए गए अवसर कहीं अधिक समय तक दुखते हैं, क्योंकि कल्पना इस बात को अनिश्चित काल तक संशोधित करती रहती है कि क्या हो सकता था।',
          },
          {
            en: "Admittedly, research on regret is complicated by memory's distortions; nevertheless, the dying consistently report regretting inaction considerably more than embarrassing or costly action.",
            native:
              'यह स्वीकार करना होगा कि स्मृति की विकृतियों से पछतावे पर शोध जटिल है; फिर भी, मृत्युशैया पर पड़े लोग लगातार बताते हैं कि शर्मनाक या महँगे कार्य की तुलना में न किए जाने का पछतावा काफी अधिक होता है।',
          },
          {
            en: 'On balance, regret seems a poor compass but a useful teacher, provided one examines it occasionally rather than taking up permanent residence in its territory.',
            native:
              'कुल मिलाकर, पछतावा एक खराब दिशासूचक लेकिन उपयोगी शिक्षक लगता है, बशर्ते कोई इसके क्षेत्र में स्थायी निवास बनाने के बजाय कभी-कभी इसका परीक्षण करे।',
          },
        ],
      },
      es: {
        word: 'arrepentimiento',
        question: '¿Se arrepiente la gente más de lo que hizo que de lo que nunca intentó?',
        examples: [
          {
            en: 'While failed attempts sting immediately, it could be argued that untaken chances ache far longer, since imagination keeps revising what might have been indefinitely.',
            native:
              'Aunque los intentos fallidos escuecen de inmediato, podría argumentarse que las oportunidades no tomadas duelen mucho más tiempo, ya que la imaginación sigue revisando lo que pudo haber sido indefinidamente.',
          },
          {
            en: "Admittedly, research on regret is complicated by memory's distortions; nevertheless, the dying consistently report regretting inaction considerably more than embarrassing or costly action.",
            native:
              'Es cierto que la investigación sobre el arrepentimiento se complica por las distorsiones de la memoria; sin embargo, los moribundos reportan consistentemente lamentar la inacción considerablemente más que la acción embarazosa o costosa.',
          },
          {
            en: 'On balance, regret seems a poor compass but a useful teacher, provided one examines it occasionally rather than taking up permanent residence in its territory.',
            native:
              'En definitiva, el arrepentimiento parece una brújula pobre pero un maestro útil, siempre que uno lo examine ocasionalmente en lugar de fijar residencia permanente en su territorio.',
          },
        ],
      },
      zh: {
        word: '遗憾',
        question: '人们对做过的事情的后悔，是否少于对从未尝试之事的后悔？',
        examples: [
          {
            en: 'While failed attempts sting immediately, it could be argued that untaken chances ache far longer, since imagination keeps revising what might have been indefinitely.',
            native:
              '尽管失败的尝试会立即带来刺痛，但可以认为，未曾把握的机会疼痛得更久，因为想象会无限期地不断改写“本可以怎样”。',
          },
          {
            en: "Admittedly, research on regret is complicated by memory's distortions; nevertheless, the dying consistently report regretting inaction considerably more than embarrassing or costly action.",
            native:
              '诚然，关于后悔的研究因记忆的扭曲而变得复杂；然而，临终者始终报告说，对不作为的后悔远远多于对令人尴尬或代价高昂的行动的后悔。',
          },
          {
            en: 'On balance, regret seems a poor compass but a useful teacher, provided one examines it occasionally rather than taking up permanent residence in its territory.',
            native:
              '总体而言，后悔似乎是一个糟糕的指南针，却是一位有用的老师——只要人们偶尔审视它，而不是在它的领地中永久定居。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'gratitude',
    questionText:
      'Does practising gratitude genuinely improve well-being, or is it just a fashionable self-help trend?',
    translations: {
      te: {
        word: 'కృతజ్ఞత',
        question: 'కృతజ్ఞత అభ్యాసం నిజంగా శ్రేయస్సును మెరుగుపరుస్తుందా, లేక అది కేవలం ఫ్యాషనబుల్ స్వయం-సహాయ ట్రెండేనా?',
        examples: [
          {
            en: 'While gratitude journals risk becoming hollow rituals, it could be argued that deliberately noticing good fortune reliably shifts attention away from what is lacking.',
            native:
              'కృతజ్ఞత డైరీలు లోపలి కర్మకాండలు కావడానికి ప్రమాదమున్నప్పటికీ, అదృష్టాన్ని ఉద్దేశపూర్వకంగా గమనించడం లేని దాని నుండి దృష్టిని తప్పకుండా మళ్లిస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, forced thankfulness can suppress legitimate grievances; nevertheless, the research linking regular gratitude practice to improved sleep and mood is surprisingly robust.',
            native:
              'నిజానికి బలవంతపు కృతజ్ఞత చట్టబద్ధమైన ఫిర్యాదులను అణచివేయవచ్చు; అయినప్పటికీ, క్రమమైన కృతజ్ఞత అభ్యాసాన్ని మెరుగైన నిద్ర, మానసిక స్థితితో ముడిపెట్టే పరిశోధన ఆశ్చర్యకరంగా దృఢంగా ఉంది.',
          },
          {
            en: 'On balance, gratitude seems less a mood than a discipline of attention, valuable precisely because entitlement is the default setting of the comfortably off.',
            native:
              'మొత్తానికి, కృతజ్ఞత మూడ్ కంటే దృష్టి యొక్క క్రమశిక్షణలా కనిపిస్తుంది; హక్కుదార భావన సౌకర్యవంతుల అప్రమేయ స్థితి కాబట్టే ఇది విలువైనది.',
          },
        ],
      },
      hi: {
        word: 'कृतज्ञता',
        question: 'क्या कृतज्ञता का अभ्यास वास्तव में कल्याण सुधारता है, या यह सिर्फ एक फैशनेबल स्वयं-सहायता रुझान है?',
        examples: [
          {
            en: 'While gratitude journals risk becoming hollow rituals, it could be argued that deliberately noticing good fortune reliably shifts attention away from what is lacking.',
            native:
              'जबकि कृतज्ञता डायरियाँ खोखले अनुष्ठान बनने का जोखिम रखती हैं, यह तर्क दिया जा सकता है कि अच्छे भाग्य को जानबूझकर नोटिस करना ध्यान को उस चीज़ से विश्वसनीय रूप से हटा देता है जो नहीं है।',
          },
          {
            en: 'Admittedly, forced thankfulness can suppress legitimate grievances; nevertheless, the research linking regular gratitude practice to improved sleep and mood is surprisingly robust.',
            native:
              'यह स्वीकार करना होगा कि जबरन आभार वैध शिकायतों को दबा सकता है; फिर भी, नियमित कृतज्ञता अभ्यास को बेहतर नींद और मूड से जोड़ने वाला शोध आश्चर्यजनक रूप से मज़बूत है।',
          },
          {
            en: 'On balance, gratitude seems less a mood than a discipline of attention, valuable precisely because entitlement is the default setting of the comfortably off.',
            native:
              'कुल मिलाकर, कृतज्ञता मूड से कम और ध्यान के अनुशासन जैसी अधिक लगती है—ठीक इसलिए मूल्यवान क्योंकि हक़दारी की भावना आरामदेह लोगों की तयशुदा स्थिति है।',
          },
        ],
      },
      es: {
        word: 'gratitud',
        question: '¿Mejora realmente el bienestar practicar la gratitud, o es solo una moda de autoayuda?',
        examples: [
          {
            en: 'While gratitude journals risk becoming hollow rituals, it could be argued that deliberately noticing good fortune reliably shifts attention away from what is lacking.',
            native:
              'Aunque los diarios de gratitud arriesgan convertirse en rituales vacíos, podría argumentarse que notar deliberadamente la buena fortuna desvía con fiabilidad la atención de lo que falta.',
          },
          {
            en: 'Admittedly, forced thankfulness can suppress legitimate grievances; nevertheless, the research linking regular gratitude practice to improved sleep and mood is surprisingly robust.',
            native:
              'Es cierto que el agradecimiento forzado puede suprimir agravios legítimos; sin embargo, la investigación que vincula la práctica regular de gratitud con mejor sueño y ánimo es sorprendentemente sólida.',
          },
          {
            en: 'On balance, gratitude seems less a mood than a discipline of attention, valuable precisely because entitlement is the default setting of the comfortably off.',
            native:
              'En definitiva, la gratitud parece menos un estado de ánimo que una disciplina de la atención, valiosa precisamente porque el sentimiento de merecimiento es el ajuste predeterminado de los acomodados.',
          },
        ],
      },
      zh: {
        word: '感恩',
        question: '练习感恩真的能改善幸福感吗，还是只是一种时髦的自助潮流？',
        examples: [
          {
            en: 'While gratitude journals risk becoming hollow rituals, it could be argued that deliberately noticing good fortune reliably shifts attention away from what is lacking.',
            native: '尽管感恩日记有沦为空洞仪式的风险，但可以认为，刻意留意好运会可靠地把注意力从缺失之物上移开。',
          },
          {
            en: 'Admittedly, forced thankfulness can suppress legitimate grievances; nevertheless, the research linking regular gratitude practice to improved sleep and mood is surprisingly robust.',
            native:
              '诚然，强制的感恩可能压抑正当的不满；然而，把规律感恩练习与改善睡眠和情绪联系起来的研究出人意料地扎实。',
          },
          {
            en: 'On balance, gratitude seems less a mood than a discipline of attention, valuable precisely because entitlement is the default setting of the comfortably off.',
            native:
              '总体而言，感恩与其说是一种心情，不如说是一种注意力的训练——它之所以可贵，恰恰因为“理所当然”是富足者的默认设置。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'compassion',
    questionText: 'Can compassion towards strangers be sustained, or does fatigue inevitably set in?',
    translations: {
      te: {
        word: 'కరుణ',
        question: 'అపరిచితుల పట్ల కరుణను కొనసాగించగలమా, లేక అలసట అనివార్యంగా వస్తుందా?',
        examples: [
          {
            en: 'While compassion flows easily towards people we know, it could be argued that extending it to distant strangers requires imagination that most daily life actively discourages.',
            native:
              'మనకు తెలిసినవారి పట్ల కరుణ సులభంగా ప్రవహించినప్పటికీ, దూరమైన అపరిచితుల వైపు దాన్ని విస్తరించడానికి చాలా దైనందిన జీవితం చురుకుగా నిరుత్సాహపరిచే ఊహ అవసరమని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, compassion fatigue afflicts aid workers and news audiences alike; nevertheless, empathy appears renewable through rest and boundaries rather than being a strictly finite resource.',
            native:
              'నిజానికి కరుణా అలసట సహాయక కార్యకర్తలనూ, వార్తా ప్రేక్షకులనూ సమానంగా బాధిస్తుంది; అయినప్పటికీ, సానుభూతి కఠోరంగా పరిమిత వనరు కాకుండా విశ్రాంతి, సరిహద్దుల ద్వారా పునరుత్పత్తి చేయగలదని అనిపిస్తుంది.',
          },
          {
            en: 'On balance, compassion seems sustainable when practised as a habit of small acts rather than an emotion, since feelings fade but routines, once formed, endure.',
            native:
              'మొత్తానికి, కరుణను భావనగా కాకుండా చిన్న చర్యల అలవాటుగా అభ్యసించినప్పుడు అది స్థిరంగా ఉంటుందని అనిపిస్తుంది, ఎందుకంటే భావాలు మసకబారతాయి కానీ ఏర్పడిన దినచర్యలు నిలుస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'करुणा',
        question: 'क्या अजनबियों के प्रति करुणा कायम रखी जा सकती है, या थकान अनिवार्य रूप से आ ही जाती है?',
        examples: [
          {
            en: 'While compassion flows easily towards people we know, it could be argued that extending it to distant strangers requires imagination that most daily life actively discourages.',
            native:
              'जबकि करुणा जानने वालों के प्रति आसानी से बहती है, यह तर्क दिया जा सकता है कि इसे दूर के अजनबियों तक बढ़ाने के लिए वह कल्पना चाहिए जिसे अधिकांश दैनिक जीवन सक्रिय रूप से हतोत्साहित करता है।',
          },
          {
            en: 'Admittedly, compassion fatigue afflicts aid workers and news audiences alike; nevertheless, empathy appears renewable through rest and boundaries rather than being a strictly finite resource.',
            native:
              'यह स्वीकार करना होगा कि करुणा-थकान सहायता कर्मियों और समाचार दर्शकों दोनों को प्रभावित करती है; फिर भी, समानुभूति सीमित संसाधन होने के बजाय आराम और सीमाओं से नवीकरणीय प्रतीत होती है।',
          },
          {
            en: 'On balance, compassion seems sustainable when practised as a habit of small acts rather than an emotion, since feelings fade but routines, once formed, endure.',
            native:
              'कुल मिलाकर, करुणा तब टिकाऊ लगती है जब उसे भावना के बजाय छोटे कार्यों की आदत के रूप में अपनाया जाए, क्योंकि भावनाएँ फीकी पड़ती हैं पर बन गई दिनचर्याएँ टिकती हैं।',
          },
        ],
      },
      es: {
        word: 'compasión',
        question: '¿Puede sostenerse la compasión hacia los extraños, o es inevitable que aparezca la fatiga?',
        examples: [
          {
            en: 'While compassion flows easily towards people we know, it could be argued that extending it to distant strangers requires imagination that most daily life actively discourages.',
            native:
              'Aunque la compasión fluye fácilmente hacia quienes conocemos, podría argumentarse que extenderla a extraños lejanos requiere una imaginación que la vida diaria desalienta activamente.',
          },
          {
            en: 'Admittedly, compassion fatigue afflicts aid workers and news audiences alike; nevertheless, empathy appears renewable through rest and boundaries rather than being a strictly finite resource.',
            native:
              'Es cierto que la fatiga por compasión aflige por igual a cooperantes y audiencias de noticias; sin embargo, la empatía parece renovable mediante el descanso y los límites, en lugar de ser un recurso estrictamente finito.',
          },
          {
            en: 'On balance, compassion seems sustainable when practised as a habit of small acts rather than an emotion, since feelings fade but routines, once formed, endure.',
            native:
              'En definitiva, la compasión parece sostenible cuando se practica como un hábito de pequeños actos y no como una emoción, ya que los sentimientos se desvanecen pero las rutinas, una vez formadas, perduran.',
          },
        ],
      },
      zh: {
        word: '怜悯',
        question: '对陌生人的怜悯能够持续吗，还是倦怠终究不可避免地会出现？',
        examples: [
          {
            en: 'While compassion flows easily towards people we know, it could be argued that extending it to distant strangers requires imagination that most daily life actively discourages.',
            native:
              '尽管怜悯很容易流向我们认识的人，但可以认为，把它延伸到远方的陌生人需要一种想象力——而大多数日常生活恰恰在积极打击这种想象力。',
          },
          {
            en: 'Admittedly, compassion fatigue afflicts aid workers and news audiences alike; nevertheless, empathy appears renewable through rest and boundaries rather than being a strictly finite resource.',
            native:
              '诚然，怜悯疲劳同样困扰着援助工作者和新闻受众；然而，同理心似乎可以通过休息和界限来更新，而不是一种严格有限的资源。',
          },
          {
            en: 'On balance, compassion seems sustainable when practised as a habit of small acts rather than an emotion, since feelings fade but routines, once formed, endure.',
            native:
              '总体而言，当怜悯被当作微小行动的习惯而非情绪来践行时，它似乎才是可持续的，因为感觉会消退，而一旦养成的惯例却会延续下去。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'altruism',
    questionText: 'Is pure altruism possible, or is every generous act ultimately self-interested?',
    translations: {
      te: {
        word: 'నిస్వార్థం',
        question: 'స్వచ్ఛమైన నిస్వార్థం సాధ్యమేనా, లేక ప్రతి ఉదార చర్య అంతిమంగా స్వార్థపూరితమేనా?',
        examples: [
          {
            en: 'While sceptics insist that generosity always rewards the giver, it could be argued that feeling good about helping others hardly disqualifies the help itself as genuine.',
            native:
              'అనుమానవాదులు ఉదారత ఎల్లప్పుడూ ఇచ్చేవారిని ప్రతిఫలం పొందేలా చేస్తుందని పట్టుబట్టినప్పటికీ, ఇతరులకు సహాయం చేయడం గురించి సంతోషం అనుభవించడం ఆ సహాయాన్ని నిజమైనదిగా అనర్హం చేయదని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, people donate blood, kidneys, and fortunes anonymously; nevertheless, even these acts might be traced to values or identities the donors wish to preserve.',
            native:
              'నిజానికి ప్రజలు రక్తం, మూత్రపిండాలు, ఆస్తులను అనామకంగా విరాళంగా ఇస్తారు; అయినప్పటికీ, ఈ చర్యలు కూడా దాతలు కాపాడుకోవాలనుకునే విలువలు లేదా గుర్తింపులకు జాడించవచ్చు.',
          },
          {
            en: 'On balance, the philosophical debate seems less important than the outcome, since motives are mixed in all of us while the hungry person fed remains fed regardless.',
            native:
              'మొత్తానికి, తత్వ చర్చ కంటే ఫలితమే ముఖ్యమని అనిపిస్తుంది, ఎందుకంటే మనందరిలోనూ ప్రేరణలు మిశ్రమమైనప్పటికీ, ఆహారం పొందిన ఆకలిగల్లవాడు అందేలా తినిపించబడినవాడే.',
          },
        ],
      },
      hi: {
        word: 'निःस्वार्थता',
        question: 'क्या शुद्ध निःस्वार्थता संभव है, या हर उदार कार्य अंततः स्वार्थी ही होता है?',
        examples: [
          {
            en: 'While sceptics insist that generosity always rewards the giver, it could be argued that feeling good about helping others hardly disqualifies the help itself as genuine.',
            native:
              'जबकि संशयवादी ज़ोर देते हैं कि उदारता हमेशा देने वाले को पुरस्कृत करती है, यह तर्क दिया जा सकता है कि दूसरों की मदद करने में अच्छा महसूस करना उस मदद को असली होने से अयोग्य नहीं ठहराता।',
          },
          {
            en: 'Admittedly, people donate blood, kidneys, and fortunes anonymously; nevertheless, even these acts might be traced to values or identities the donors wish to preserve.',
            native:
              'यह स्वीकार करना होगा कि लोग गुमनाम रूप से रक्त, गुर्दे और संपत्तियाँ दान करते हैं; फिर भी, इन कार्यों को भी उन मूल्यों या पहचानों से जोड़ा जा सकता है जिन्हें दाता बनाए रखना चाहते हैं।',
          },
          {
            en: 'On balance, the philosophical debate seems less important than the outcome, since motives are mixed in all of us while the hungry person fed remains fed regardless.',
            native:
              'कुल मिलाकर, दार्शनिक बहस परिणाम से कम महत्वपूर्ण लगती है, क्योंकि हम सभी में उद्देश्य मिश्रित होते हैं, जबकि खिलाया गया भूखा व्यक्ति वैसे भी खिलाया गया ही रहता है।',
          },
        ],
      },
      es: {
        word: 'altruismo',
        question: '¿Es posible el altruismo puro, o todo acto generoso es en última instancia interesado?',
        examples: [
          {
            en: 'While sceptics insist that generosity always rewards the giver, it could be argued that feeling good about helping others hardly disqualifies the help itself as genuine.',
            native:
              'Aunque los escépticos insisten en que la generosidad siempre recompensa al dador, podría argumentarse que sentirse bien por ayudar a otros apenas descalifica la ayuda misma como genuina.',
          },
          {
            en: 'Admittedly, people donate blood, kidneys, and fortunes anonymously; nevertheless, even these acts might be traced to values or identities the donors wish to preserve.',
            native:
              'Es cierto que la gente dona sangre, riñones y fortunas anónimamente; sin embargo, incluso estos actos podrían rastrearse hasta valores o identidades que los donantes desean preservar.',
          },
          {
            en: 'On balance, the philosophical debate seems less important than the outcome, since motives are mixed in all of us while the hungry person fed remains fed regardless.',
            native:
              'En definitiva, el debate filosófico parece menos importante que el resultado, ya que los motivos son mixtos en todos nosotros, mientras que la persona hambrienta alimentada sigue alimentada de todos modos.',
          },
        ],
      },
      zh: {
        word: '利他主义',
        question: '纯粹的利他主义可能存在吗，还是每一个慷慨的行为归根结底都是自利的？',
        examples: [
          {
            en: 'While sceptics insist that generosity always rewards the giver, it could be argued that feeling good about helping others hardly disqualifies the help itself as genuine.',
            native: '尽管怀疑论者坚称慷慨总是回报给予者，但可以认为，因帮助他人而感到愉悦并不能使帮助本身变得不真诚。',
          },
          {
            en: 'Admittedly, people donate blood, kidneys, and fortunes anonymously; nevertheless, even these acts might be traced to values or identities the donors wish to preserve.',
            native:
              '诚然，人们匿名捐献血液、肾脏和财富；然而，即便是这些行为，也可能追溯到捐赠者希望保持的价值观或自我认同。',
          },
          {
            en: 'On balance, the philosophical debate seems less important than the outcome, since motives are mixed in all of us while the hungry person fed remains fed regardless.',
            native:
              '总体而言，这场哲学辩论似乎没有结果那么重要，因为我们每个人的动机都是复杂的，而得到食物的饥饿者无论如何都已吃饱。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'greed',
    questionText: 'Is greed a natural human instinct that economies depend on, or a vice that should be restrained?',
    translations: {
      te: {
        word: 'అత్యాశ',
        question: 'అత్యాశ ఆర్థిక వ్యవస్థలు ఆధారపడే సహజ మానవ స్వభావమా, లేక అదుపులో ఉంచాల్సిన దుర్గుణమా?',
        examples: [
          {
            en: 'While economists sometimes defend greed as the engine of prosperity, it could be argued that markets function despite greed rather than because of it.',
            native:
              'ఆర్థికవేత్తలు కొన్నిసార్లు అత్యాశను శ్రేయస్సు యొక్క యంత్రంగా సమర్థించినప్పటికీ, మార్కెట్లు అత్యాశ వల్ల కాకుండా అది ఉన్నా పనిచేస్తాయని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, acquisitiveness motivates effort and risk-taking; nevertheless, unrestrained, it reliably produces speculation, fraud, and crises whose costs fall on the innocent.',
            native:
              'నిజానికి సంపాదనాశ కృషినీ, రిస్క్ తీసుకోవడాన్నీ ప్రేరేపిస్తుంది; అయినప్పటికీ, అదుపు లేకుంటే అది సట్టాలనూ, మోసాలనూ, సంక్షోభాలనూ తప్పకుండా ఉత్పత్తి చేస్తుంది—వాటి ఖర్చు నిరపరాధులపై పడుతుంది.',
          },
          {
            en: 'On balance, greed seems useful as a servant and catastrophic as a master, which is why successful societies channel it rather than celebrating it outright.',
            native:
              'మొత్తానికి, అత్యాశ నౌకరుగా ఉపయోగపడుతుంది, యజమానిగా వినాశకరం; విజయవంతమైన సమాజాలు దాన్ని పూర్తిగా కీర్తించడం కంటే మార్గనిర్దేశం చేయడమే ఇందుకు కారణం.',
          },
        ],
      },
      hi: {
        word: 'लालच',
        question:
          'क्या लालच एक स्वाभाविक मानव प्रवृत्ति है जिस पर अर्थव्यवस्थाएँ निर्भर हैं, या एक दुर्गुण है जिसे नियंत्रित किया जाना चाहिए?',
        examples: [
          {
            en: 'While economists sometimes defend greed as the engine of prosperity, it could be argued that markets function despite greed rather than because of it.',
            native:
              'जबकि अर्थशास्त्री कभी-कभी लालच को समृद्धि का इंजन बताकर उसका बचाव करते हैं, यह तर्क दिया जा सकता है कि बाज़ार लालच की वजह से नहीं, बल्कि उसके बावजूद काम करते हैं।',
          },
          {
            en: 'Admittedly, acquisitiveness motivates effort and risk-taking; nevertheless, unrestrained, it reliably produces speculation, fraud, and crises whose costs fall on the innocent.',
            native:
              'यह स्वीकार करना होगा कि अर्जन-प्रवृत्ति प्रयास और जोखिम लेने को प्रेरित करती है; फिर भी, अनियंत्रित होने पर यह विश्वसनीय रूप से सट्टाबाज़ी, धोखाधड़ी और संकट पैदा करती है जिनकी कीमत निर्दोष लोग चुकाते हैं।',
          },
          {
            en: 'On balance, greed seems useful as a servant and catastrophic as a master, which is why successful societies channel it rather than celebrating it outright.',
            native:
              'कुल मिलाकर, लालच नौकर के रूप में उपयोगी और स्वामी के रूप में विनाशकारी लगती है—यही कारण है कि सफल समाज इसका पुरस्संगीत करने के बजाय इसे मार्गदर्शित करते हैं।',
          },
        ],
      },
      es: {
        word: 'avaricia',
        question:
          '¿Es la avaricia un instinto humano natural del que dependen las economías, o un vicio que debería contenerse?',
        examples: [
          {
            en: 'While economists sometimes defend greed as the engine of prosperity, it could be argued that markets function despite greed rather than because of it.',
            native:
              'Aunque los economistas a veces defienden la avaricia como motor de la prosperidad, podría argumentarse que los mercados funcionan a pesar de la avaricia más que gracias a ella.',
          },
          {
            en: 'Admittedly, acquisitiveness motivates effort and risk-taking; nevertheless, unrestrained, it reliably produces speculation, fraud, and crises whose costs fall on the innocent.',
            native:
              'Es cierto que la codicia motiva el esfuerzo y la asunción de riesgos; sin embargo, desenfrenada, produce con fiabilidad especulación, fraude y crisis cuyos costes recaen sobre los inocentes.',
          },
          {
            en: 'On balance, greed seems useful as a servant and catastrophic as a master, which is why successful societies channel it rather than celebrating it outright.',
            native:
              'En definitiva, la avaricia parece útil como sirviente y catastrófica como amo, razón por la cual las sociedades exitosas la canalizan en lugar de celebrarla abiertamente.',
          },
        ],
      },
      zh: {
        word: '贪婪',
        question: '贪婪是经济赖以运转的自然人类本能，还是应当加以约束的恶行？',
        examples: [
          {
            en: 'While economists sometimes defend greed as the engine of prosperity, it could be argued that markets function despite greed rather than because of it.',
            native:
              '尽管经济学家有时把贪婪辩护为繁荣的引擎，但可以认为，市场的运转与其说是拜贪婪所赐，不如说是尽管有贪婪仍能运转。',
          },
          {
            en: 'Admittedly, acquisitiveness motivates effort and risk-taking; nevertheless, unrestrained, it reliably produces speculation, fraud, and crises whose costs fall on the innocent.',
            native:
              '诚然，占有欲能激励努力和冒险；然而，一旦失去约束，它总会可靠地制造投机、欺诈和危机，而代价却由无辜者承担。',
          },
          {
            en: 'On balance, greed seems useful as a servant and catastrophic as a master, which is why successful societies channel it rather than celebrating it outright.',
            native: '总体而言，贪婪作为仆从有用，作为主人则是灾难——这正是成功的社会对它加以引导而非公然颂扬的原因。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'materialism',
    questionText: 'Why do so many people believe possessions will make them happy despite evidence to the contrary?',
    translations: {
      te: {
        word: 'భౌతికవాదం',
        question: 'వ్యతిరేక సాక్ష్యాలున్నా చాలామంది ఆస్తులు ఆనందం ఇస్తాయని ఎందుకు నమ్ముతారు?',
        examples: [
          {
            en: 'While everyone knows intellectually that money cannot buy happiness, it could be argued that advertising and social comparison keep persuading our instincts otherwise.',
            native:
              'డబ్బుతో ఆనందం కొనలేమని అందరూ బౌద్ధికంగా తెలిసినప్పటికీ, ప్రకటనలు, సామాజిక పోలికలు మన స్వభావాన్ని ఇలా కాదని ఒప్పిస్తూనే ఉంటాయని చెప్పవచ్చు.',
          },
          {
            en: "Admittedly, possessions deliver brief, genuine pleasure; nevertheless, hedonic adaptation ensures that today's coveted purchase becomes tomorrow's unnoticed background with remarkable speed.",
            native:
              'నిజానికి ఆస్తులు క్షణిక, నిజమైన ఆనందాన్ని ఇస్తాయి; అయినప్పటికీ, ఆనంద అనుసరణ ఈరోజు కోరిన కొనుగోలు రేపు గమనించని నేపథ్యమవుతుందని అసాధారణ వేగంతో నిర్ధారిస్తుంది.',
          },
          {
            en: 'On balance, materialism persists because it answers a real hunger—for status, security, identity—with the wrong food, leaving the appetite itself untouched.',
            native:
              'మొత్తానికి, భౌతికవాదం కొనసాగుతుంది ఎందుకంటే అది నిజమైన ఆకలికి—ప్రతిష్ఠ, భద్రత, గుర్తింపు కోసం—తప్పు ఆహారంతో సమాధానం ఇస్తుంది, ఆకలిని అలాగే ఉంచుతుంది.',
          },
        ],
      },
      hi: {
        word: 'भौतिकवाद',
        question: 'इसके विपरीत साक्ष्यों के बावजूद इतने लोग यह क्यों मानते हैं कि सामान उन्हें खुश करेगा?',
        examples: [
          {
            en: 'While everyone knows intellectually that money cannot buy happiness, it could be argued that advertising and social comparison keep persuading our instincts otherwise.',
            native:
              'जबकि हर कोई बौद्धिक रूप से जानता है कि पैसा खुशी नहीं खरीद सकता, यह तर्क दिया जा सकता है कि विज्ञापन और सामाजिक तुलना हमारी प्रवृत्तियों को बार-बार उल्टा मना लेते हैं।',
          },
          {
            en: "Admittedly, possessions deliver brief, genuine pleasure; nevertheless, hedonic adaptation ensures that today's coveted purchase becomes tomorrow's unnoticed background with remarkable speed.",
            native:
              'यह स्वीकार करना होगा कि सामान क्षणिक, वास्तविक आनंद देता है; फिर भी, सुख-अनुकूलन सुनिश्चित करता है कि आज की लालसित खरीद उल्लेखनीय गति से कल का अनदेखा पृष्ठभूमि बन जाए।',
          },
          {
            en: 'On balance, materialism persists because it answers a real hunger—for status, security, identity—with the wrong food, leaving the appetite itself untouched.',
            native:
              'कुल मिलाकर, भौतिकवाद इसलिए बना रहता है क्योंकि यह एक वास्तविक भूख—प्रतिष्ठा, सुरक्षा, पहचान के लिए—का उत्तर गलत भोजन से देता है, और भूख को वैसा ही छोड़ देता है।',
          },
        ],
      },
      es: {
        word: 'materialismo',
        question: '¿Por qué tanta gente cree que las posesiones la harán feliz pese a la evidencia en contrario?',
        examples: [
          {
            en: 'While everyone knows intellectually that money cannot buy happiness, it could be argued that advertising and social comparison keep persuading our instincts otherwise.',
            native:
              'Aunque todos saben intelectualmente que el dinero no compra la felicidad, podría argumentarse que la publicidad y la comparación social siguen persuadiendo a nuestros instintos de lo contrario.',
          },
          {
            en: "Admittedly, possessions deliver brief, genuine pleasure; nevertheless, hedonic adaptation ensures that today's coveted purchase becomes tomorrow's unnoticed background with remarkable speed.",
            native:
              'Es cierto que las posesiones brindan un placer breve y genuino; sin embargo, la adaptación hedónica asegura que la compra codiciada de hoy se convierta con notable rapidez en el fondo inadvertido de mañana.',
          },
          {
            en: 'On balance, materialism persists because it answers a real hunger—for status, security, identity—with the wrong food, leaving the appetite itself untouched.',
            native:
              'En definitiva, el materialismo persiste porque responde a un hambre real —de estatus, seguridad, identidad— con el alimento equivocado, dejando el apetito intacto.',
          },
        ],
      },
      zh: {
        word: '物质主义',
        question: '为什么尽管有相反的证据，仍有那么多人相信物质财富会让他们幸福？',
        examples: [
          {
            en: 'While everyone knows intellectually that money cannot buy happiness, it could be argued that advertising and social comparison keep persuading our instincts otherwise.',
            native:
              '尽管每个人在理智上都知道金钱买不到幸福，但可以认为，广告和社会攀比不断地说服我们的本能去相信相反的东西。',
          },
          {
            en: "Admittedly, possessions deliver brief, genuine pleasure; nevertheless, hedonic adaptation ensures that today's coveted purchase becomes tomorrow's unnoticed background with remarkable speed.",
            native:
              '诚然，物质能带来短暂而真实的快乐；然而，享乐适应确保今天渴望的购买会以惊人的速度变成明天视而不见的背景。',
          },
          {
            en: 'On balance, materialism persists because it answers a real hunger—for status, security, identity—with the wrong food, leaving the appetite itself untouched.',
            native:
              '总体而言，物质主义之所以持续存在，是因为它用错误的食物回应了真实的渴望——对地位、安全和身份的渴望——而让那份渴望本身原封不动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'minimalism',
    questionText: 'Is minimalism a meaningful critique of consumer society, or just another lifestyle trend?',
    translations: {
      te: {
        word: 'సరళ జీవనవాదం',
        question: 'సరళ జీవనవాదం వినియోగ సమాజంపై అర్థవంతమైన విమర్శేనా, లేక మరో జీవనశైలి ట్రెండేనా?',
        examples: [
          {
            en: 'While minimalism began as a protest against excess, it could be argued that the market has already repackaged anti-consumption as another expensive aesthetic to purchase.',
            native:
              'సరళ జీవనవాదం అధికతపై నిరసనగా ప్రారంభమైనప్పటికీ, మార్కెట్ వినియోగ వ్యతిరేకతను కొనుగోలు చేయదగిన మరో ఖరీదైన సౌందర్యంగా ఇప్పటికే పునర్ప్యాకేజ్ చేసిందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, decluttering genuinely relieves some people; nevertheless, owning little is only a choice for those wealthy enough to replace anything they discard.',
            native:
              'నిజానికి గందరగోళం తొలగించడం కొందరికి నిజంగా ఉపశమనం ఇస్తుంది; అయినప్పటికీ, తక్కువ కలిగి ఉండడం తాము పడేసిన దేనినైనా భర్తీ చేయగలంత ధనవంతులకు మాత్రమే ఎంపిక.',
          },
          {
            en: 'On balance, minimalism seems most convincing as a question—what do I actually need?—rather than as an identity, which risks becoming another form of competitive display.',
            native:
              'మొత్తానికి, సరళ జీవనవాదం గుర్తింపుగా కంటే ఒక ప్రశ్నగా—నాకు వాస్తవంగా ఏమి అవసరం?—అత్యంత నమ్మదగినంగా ఉంటుంది; గుర్తింపు పోటీ ప్రదర్శన యొక్క మరో రూపం కావడానికి ప్రమాదం ఉంది.',
          },
        ],
      },
      hi: {
        word: 'न्यूनतमवाद',
        question: 'क्या न्यूनतमवाद उपभोक्ता समाज की सार्थक आलोचना है, या बस एक और जीवनशैली का चलन?',
        examples: [
          {
            en: 'While minimalism began as a protest against excess, it could be argued that the market has already repackaged anti-consumption as another expensive aesthetic to purchase.',
            native:
              'जबकि न्यूनतमवाद अतिरिक्तता के विरुद्ध विरोध के रूप में शुरू हुआ, यह तर्क दिया जा सकता है कि बाज़ार ने उपभोग-विरोध को पहले ही खरीदने योग्य एक और महँगे सौंदर्य में फिर से पैक कर दिया है।',
          },
          {
            en: 'Admittedly, decluttering genuinely relieves some people; nevertheless, owning little is only a choice for those wealthy enough to replace anything they discard.',
            native:
              'यह स्वीकार करना होगा कि सामान घटाना कुछ लोगों को सचमुच राहत देता है; फिर भी, कम रखना केवल उन्हीं के लिए एक विकल्प है जो इतने धनी हैं कि फेंकी हुई हर चीज़ बदल सकें।',
          },
          {
            en: 'On balance, minimalism seems most convincing as a question—what do I actually need?—rather than as an identity, which risks becoming another form of competitive display.',
            native:
              'कुल मिलाकर, न्यूनतमवाद एक पहचान के बजाय एक प्रश्न के रूप में—मुझे वास्तव में क्या चाहिए?—सबसे अधिक ठोस लगता है; पहचान बनने पर यह प्रतिस्पर्धी प्रदर्शन का एक और रूप बनने का जोखिम रखता है।',
          },
        ],
      },
      es: {
        word: 'minimalismo',
        question:
          '¿Es el minimalismo una crítica significativa de la sociedad de consumo, o solo otra tendencia de estilo de vida?',
        examples: [
          {
            en: 'While minimalism began as a protest against excess, it could be argued that the market has already repackaged anti-consumption as another expensive aesthetic to purchase.',
            native:
              'Aunque el minimalismo comenzó como una protesta contra el exceso, podría argumentarse que el mercado ya ha reempaquetado el anticonsumo como otra estética cara que comprar.',
          },
          {
            en: 'Admittedly, decluttering genuinely relieves some people; nevertheless, owning little is only a choice for those wealthy enough to replace anything they discard.',
            native:
              'Es cierto que ordenar y deshacerse de cosas alivia genuinamente a algunas personas; sin embargo, poseer poco solo es una opción para quienes son lo bastante ricos para reemplazar cualquier cosa que descarten.',
          },
          {
            en: 'On balance, minimalism seems most convincing as a question—what do I actually need?—rather than as an identity, which risks becoming another form of competitive display.',
            native:
              'En definitiva, el minimalismo parece más convincente como pregunta —¿qué necesito realmente?— que como identidad, la cual arriesga convertirse en otra forma de exhibición competitiva.',
          },
        ],
      },
      zh: {
        word: '极简主义',
        question: '极简主义是对消费社会有意义的批判，还是仅仅是另一种生活方式潮流？',
        examples: [
          {
            en: 'While minimalism began as a protest against excess, it could be argued that the market has already repackaged anti-consumption as another expensive aesthetic to purchase.',
            native:
              '尽管极简主义始于对过度消费的抗议，但可以认为，市场已经把反消费重新包装成另一种可供购买的昂贵美学。',
          },
          {
            en: 'Admittedly, decluttering genuinely relieves some people; nevertheless, owning little is only a choice for those wealthy enough to replace anything they discard.',
            native:
              '诚然，断舍离确实能让一些人感到轻松；然而，少拥有只是那些富到可以替换任何丢弃之物的人才能做出的选择。',
          },
          {
            en: 'On balance, minimalism seems most convincing as a question—what do I actually need?—rather than as an identity, which risks becoming another form of competitive display.',
            native:
              '总体而言，极简主义作为一个问题——我究竟需要什么？——比作为一种身份更有说服力，因为后者有沦为另一种竞争性炫耀的风险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'fame',
    questionText: 'Why do so many people desire fame, and does it deliver what they expect?',
    translations: {
      te: {
        word: 'కీర్తి',
        question: 'చాలామంది కీర్తిని ఎందుకు కోరుతారు, అది వారు ఊహించినది ఇస్తుందా?',
        examples: [
          {
            en: 'While fame promises validation on a grand scale, it could be argued that it mostly magnifies scrutiny, transforming ordinary mistakes into public spectacles overnight.',
            native:
              'కీర్తి భవ్యమైన స్థాయిలో గుర్తింపును వాగ్దానం చేసినప్పటికీ, అది ఎక్కువగా పరీక్షను పెంచుతుందని, సాధారణ పొరపాట్లను ఒక్కరాత్రిలో ప్రజా ప్రదర్శనలుగా మారుస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, celebrity confers influence and access; nevertheless, studies of the famous consistently report loneliness, distrust, and a disorienting confusion between persona and self.',
            native:
              'నిజానికి ప్రసిద్ధి ప్రభావాన్నీ అవకాశాలనూ ఇస్తుంది; అయినప్పటికీ, ప్రసిద్ధులపై అధ్యయనాలు ఒంటరితనాన్నీ, అవిశ్వాసాన్నీ, పాత్రకూ నిజస్వరూపానికీ మధ్య గందరగోళాన్నీ నిరంతరం నివేదిస్తాయి.',
          },
          {
            en: 'On balance, people seem to crave not fame itself but the recognition it symbolises, a need that intimate communities once satisfied without any audience at all.',
            native:
              'మొత్తానికి, ప్రజలు కీర్తినే కాదు, అది సూచించే గుర్తింపును కోరుతారని అనిపిస్తుంది; ఎటువంటి ప్రేక్షకులూ లేకుండా గతంలో సన్నిహిత సమాజాలు తీర్చిన అవసరం ఇది.',
          },
        ],
      },
      hi: {
        word: 'प्रसिद्धि',
        question: 'इतने लोग प्रसिद्धि की चाह क्यों रखते हैं, और क्या यह वह देती है जिसकी वे उम्मीद करते हैं?',
        examples: [
          {
            en: 'While fame promises validation on a grand scale, it could be argued that it mostly magnifies scrutiny, transforming ordinary mistakes into public spectacles overnight.',
            native:
              'जबकि प्रसिद्धि भव्य स्तर पर मान्यता का वादा करती है, यह तर्क दिया जा सकता है कि यह ज्यादातर जाँच को बढ़ाती है, साधारण गलतियों को रातों-रात सार्वजनिक तमाशे में बदल देती है।',
          },
          {
            en: 'Admittedly, celebrity confers influence and access; nevertheless, studies of the famous consistently report loneliness, distrust, and a disorienting confusion between persona and self.',
            native:
              'यह स्वीकार करना होगा कि ख्याति प्रभाव और पहुँच देती है; फिर भी, प्रसिद्ध लोगों के अध्ययन लगातार अकेलापन, अविश्वास और व्यक्तित्व तथा असली स्व के बीच भ्रम की सूचना देते हैं।',
          },
          {
            en: 'On balance, people seem to crave not fame itself but the recognition it symbolises, a need that intimate communities once satisfied without any audience at all.',
            native:
              'कुल मिलाकर, लोग खुद प्रसिद्धि नहीं बल्कि उसके द्वारा प्रतीकित मान्यता के लालायित लगते हैं—यह ज़रूरत कभी घनिष्ठ समुदाय बिना किसी दर्शक के ही पूरी करते थे।',
          },
        ],
      },
      es: {
        word: 'fama',
        question: '¿Por qué desean la fama tantas personas, y les da lo que esperan?',
        examples: [
          {
            en: 'While fame promises validation on a grand scale, it could be argued that it mostly magnifies scrutiny, transforming ordinary mistakes into public spectacles overnight.',
            native:
              'Aunque la fama promete validación a gran escala, podría argumentarse que sobre todo magnifica el escrutinio, transformando errores ordinarios en espectáculos públicos de la noche a la mañana.',
          },
          {
            en: 'Admittedly, celebrity confers influence and access; nevertheless, studies of the famous consistently report loneliness, distrust, and a disorienting confusion between persona and self.',
            native:
              'Es cierto que la celebridad confiere influencia y acceso; sin embargo, los estudios sobre los famosos reportan consistentemente soledad, desconfianza y una confusión desorientadora entre el personaje y el yo.',
          },
          {
            en: 'On balance, people seem to crave not fame itself but the recognition it symbolises, a need that intimate communities once satisfied without any audience at all.',
            native:
              'En definitiva, la gente parece ansiar no la fama misma sino el reconocimiento que simboliza, una necesidad que las comunidades íntimas antes satisfacían sin público alguno.',
          },
        ],
      },
      zh: {
        word: '名声',
        question: '为什么那么多人渴望名声，它能带来他们所期待的东西吗？',
        examples: [
          {
            en: 'While fame promises validation on a grand scale, it could be argued that it mostly magnifies scrutiny, transforming ordinary mistakes into public spectacles overnight.',
            native: '尽管名声承诺了宏大的认可，但可以认为，它主要放大的是审视——一夜之间把普通的错误变成公众的围观。',
          },
          {
            en: 'Admittedly, celebrity confers influence and access; nevertheless, studies of the famous consistently report loneliness, distrust, and a disorienting confusion between persona and self.',
            native:
              '诚然，名气带来影响力和机会；然而，对名人的研究始终报告孤独、不信任，以及人设与自我之间令人迷失的混淆。',
          },
          {
            en: 'On balance, people seem to crave not fame itself but the recognition it symbolises, a need that intimate communities once satisfied without any audience at all.',
            native:
              '总体而言，人们渴望的似乎不是名声本身，而是它所象征的认可——这种需求，亲密的社群曾经无需任何观众就能满足。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'automation',
    questionText: 'Will automation ultimately create more jobs than it destroys, or is this time different?',
    translations: {
      te: {
        word: 'స్వయంచాలకత',
        question:
          'స్వయంచాలకత చివరికి ధ్వంసం చేసిన దానికంటే ఎక్కువ ఉద్యోగాలను సృష్టిస్తుందా, లేక ఈసారి విషయం మరోలా ఉందా?',
        examples: [
          {
            en: 'While history suggests technology creates new occupations to replace obsolete ones, it could be argued that the speed of current automation may outpace retraining entirely.',
            native:
              'సాంకేతికత పాతబడినవాటి స్థానంలో కొత్త వృత్తులను సృష్టిస్తుందని చరిత్ర సూచించినప్పటికీ, ప్రస్తుత స్వయంచాలకత వేగం పునశ్శిక్షణను పూర్తిగా అధిగమించవచ్చని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, previous industrial revolutions produced more employment, not less; nevertheless, those transitions were measured in generations, whereas algorithmic displacement now happens within single careers.',
            native:
              'నిజానికి గత పారిశ్రామిక విప్లవాలు తక్కువ కాకుండా ఎక్కువ ఉద్యోగాలను ఇచ్చాయి; అయినప్పటికీ, ఆ మార్పులు తరాలలో కొలవబడ్డాయి, అయితే అల్గారిథమిక్ విస్థాపన ఇప్పుడు ఒకే వృత్తి లోపల జరుగుతుంది.',
          },
          {
            en: 'On balance, the question seems less whether jobs will exist than who will capture their value, since productivity gains have lately flowed overwhelmingly to capital rather than labour.',
            native:
              'మొత్తానికి, ఉద్యోగాలు ఉంటాయా కాదా అన్నది కంటే వాటి విలువను ఎవరు పొందుతారు అన్నదే ప్రశ్న అనిపిస్తుంది, ఎందుకంటే ఉత్పాదకత లాభాలు ఇటీవల కార్మికుల కంటే మూలధనానికే అధికంగా ప్రవహించాయి.',
          },
        ],
      },
      hi: {
        word: 'स्वचालन',
        question: 'क्या स्वचालन अंततः नष्ट करने से ज़्यादा नौकरियाँ बनाएगा, या इस बार मामला अलग है?',
        examples: [
          {
            en: 'While history suggests technology creates new occupations to replace obsolete ones, it could be argued that the speed of current automation may outpace retraining entirely.',
            native:
              'जबकि इतिहास बताता है कि तकनीक अप्रचलित पेशों की जगह नए पेशे बनाती है, यह तर्क दिया जा सकता है कि मौजूदा स्वचालन की गति पुनःप्रशिक्षण को पूरी तरह पीछे छोड़ सकती है।',
          },
          {
            en: 'Admittedly, previous industrial revolutions produced more employment, not less; nevertheless, those transitions were measured in generations, whereas algorithmic displacement now happens within single careers.',
            native:
              'यह स्वीकार करना होगा कि पिछली औद्योगिक क्रांतियों ने कम नहीं, अधिक रोज़गार दिया; फिर भी, वे संक्रमण पीढ़ियों में मापे गए, जबकि एल्गोरिदमिक विस्थापन अब एक ही करियर के भीतर हो रहा है।',
          },
          {
            en: 'On balance, the question seems less whether jobs will exist than who will capture their value, since productivity gains have lately flowed overwhelmingly to capital rather than labour.',
            native:
              'कुल मिलाकर, सवाल यह कम लगता है कि नौकरियाँ रहेंगी या नहीं, और यह अधिक कि उनका मूल्य कौन हासिल करेगा, क्योंकि उत्पादकता लाभ हाल में श्रम के बजाय पूँजी की ओर भारी मात्रा में बहे हैं।',
          },
        ],
      },
      es: {
        word: 'automatización',
        question:
          '¿Creará la automatización en última instancia más empleos de los que destruye, o esta vez es diferente?',
        examples: [
          {
            en: 'While history suggests technology creates new occupations to replace obsolete ones, it could be argued that the speed of current automation may outpace retraining entirely.',
            native:
              'Aunque la historia sugiere que la tecnología crea nuevas ocupaciones para reemplazar las obsoletas, podría argumentarse que la velocidad de la automatización actual podría superar por completo a la recapacitación.',
          },
          {
            en: 'Admittedly, previous industrial revolutions produced more employment, not less; nevertheless, those transitions were measured in generations, whereas algorithmic displacement now happens within single careers.',
            native:
              'Es cierto que las revoluciones industriales anteriores produjeron más empleo, no menos; sin embargo, esas transiciones se midieron en generaciones, mientras que el desplazamiento algorítmico ahora ocurre dentro de una sola carrera.',
          },
          {
            en: 'On balance, the question seems less whether jobs will exist than who will capture their value, since productivity gains have lately flowed overwhelmingly to capital rather than labour.',
            native:
              'En definitiva, la cuestión parece menos si existirán empleos que quién capturará su valor, ya que las ganancias de productividad han fluido últimamente abrumadoramente hacia el capital y no hacia el trabajo.',
          },
        ],
      },
      zh: {
        word: '自动化',
        question: '自动化最终创造的就业岗位会多于它摧毁的吗，还是这一次情况不同？',
        examples: [
          {
            en: 'While history suggests technology creates new occupations to replace obsolete ones, it could be argued that the speed of current automation may outpace retraining entirely.',
            native:
              '尽管历史表明技术会创造新职业来取代过时的职业，但可以认为，当前自动化的速度可能会完全超过再培训的能力。',
          },
          {
            en: 'Admittedly, previous industrial revolutions produced more employment, not less; nevertheless, those transitions were measured in generations, whereas algorithmic displacement now happens within single careers.',
            native:
              '诚然，以往的工业革命带来的是更多而非更少的就业；然而，那些转型以世代为单位衡量，而算法驱动的岗位替代如今在一个人的职业生涯内就会发生。',
          },
          {
            en: 'On balance, the question seems less whether jobs will exist than who will capture their value, since productivity gains have lately flowed overwhelmingly to capital rather than labour.',
            native:
              '总体而言，问题似乎不在于工作是否还会存在，而在于谁能获取其价值——因为生产率收益近来压倒性地流向了资本而非劳动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'biotechnology',
    questionText: 'Should there be limits on how far biotechnology can alter living organisms?',
    translations: {
      te: {
        word: 'జీవసాంకేతికత',
        question: 'జీవసాంకేతికత జీవులను ఎంతవరకు మార్చవచ్చో దానిపై పరిమితులు ఉండాలా?',
        examples: [
          {
            en: 'While biotechnology promises cures for devastating diseases, it could be argued that each advance quietly normalises interventions once considered unthinkable.',
            native:
              'జీవసాంకేతికత వినాశకరమైన వ్యాధులకు నయం చేసే హామీని ఇచ్చినప్పటికీ, ప్రతి పురోగతి గతంలో ఆలోచించలేని జోక్యాలను నిశ్శబ్దంగా సాధారణం చేస్తుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, regulating such research risks driving it underground or overseas; nevertheless, the absence of limits assumes a wisdom and restraint that history rarely justifies.',
            native:
              'నిజానికి అలాంటి పరిశోధనను నియంత్రించడం దాన్ని నెలక్రిందికి లేదా విదేశాలకు నెట్టే ప్రమాదం ఉంది; అయినప్పటికీ, పరిమితుల లేమి చరిత్ర అరుదుగా సమర్థించే వివేకం, సంయమనం ఊహిస్తుంది.',
          },
          {
            en: 'On balance, limits seem unavoidable; the genuine debate concerns who sets them, scientists, governments, or citizens, and through what legitimate process.',
            native:
              'మొత్తానికి, పరిమితులు తప్పనిసరిగా అనిపిస్తాయి; నిజమైన చర్చ వాటిని ఎవరు నిర్ణయిస్తారు—శాస్త్రవేత్తలా, ప్రభుత్వాలా, పౌరులా—మరియు ఏ చట్టబద్ధ ప్రక్రియ ద్వారా అనే దాని గురించి.',
          },
        ],
      },
      hi: {
        word: 'जैव प्रौद्योगिकी',
        question: 'क्या जैव प्रौद्योगिकी जीवों को कितना बदल सकती है, इस पर सीमाएँ होनी चाहिए?',
        examples: [
          {
            en: 'While biotechnology promises cures for devastating diseases, it could be argued that each advance quietly normalises interventions once considered unthinkable.',
            native:
              'जबकि जैव प्रौद्योगिकी विनाशकारी रोगों के इलाज का वादा करती है, यह तर्क दिया जा सकता है कि हर प्रगति कभी अकल्पनीय माने गए हस्तक्षेपों को चुपचाप सामान्य बना देती है।',
          },
          {
            en: 'Admittedly, regulating such research risks driving it underground or overseas; nevertheless, the absence of limits assumes a wisdom and restraint that history rarely justifies.',
            native:
              'यह स्वीकार करना होगा कि ऐसे शोध को विनियमित करना उसे भूमिगत या विदेशों में धकेलने का जोखिम लाता है; फिर भी, सीमाओं की अनुपस्थिति वह बुद्धि और संयम मान लेती है जिसे इतिहास शायद ही कभी सही ठहराता है।',
          },
          {
            en: 'On balance, limits seem unavoidable; the genuine debate concerns who sets them, scientists, governments, or citizens, and through what legitimate process.',
            native:
              'कुल मिलाकर, सीमाएँ अपरिहार्य लगती हैं; असली बहस इस पर है कि उन्हें कौन तय करे—वैज्ञानिक, सरकारें या नागरिक—और किस वैध प्रक्रिया से।',
          },
        ],
      },
      es: {
        word: 'biotecnología',
        question: '¿Debería haber límites sobre hasta dónde puede la biotecnología alterar los organismos vivos?',
        examples: [
          {
            en: 'While biotechnology promises cures for devastating diseases, it could be argued that each advance quietly normalises interventions once considered unthinkable.',
            native:
              'Aunque la biotecnología promete curas para enfermedades devastadoras, podría argumentarse que cada avance normaliza silenciosamente intervenciones antes consideradas impensables.',
          },
          {
            en: 'Admittedly, regulating such research risks driving it underground or overseas; nevertheless, the absence of limits assumes a wisdom and restraint that history rarely justifies.',
            native:
              'Es cierto que regular tal investigación arriesga empujarla a la clandestinidad o al extranjero; sin embargo, la ausencia de límites presupone una sabiduría y una contención que la historia rara vez justifica.',
          },
          {
            en: 'On balance, limits seem unavoidable; the genuine debate concerns who sets them, scientists, governments, or citizens, and through what legitimate process.',
            native:
              'En definitiva, los límites parecen inevitables; el debate genuino concierne a quién los establece —científicos, gobiernos o ciudadanos— y mediante qué proceso legítimo.',
          },
        ],
      },
      zh: {
        word: '生物技术',
        question: '是否应当对生物技术改造生物体的程度设限？',
        examples: [
          {
            en: 'While biotechnology promises cures for devastating diseases, it could be argued that each advance quietly normalises interventions once considered unthinkable.',
            native:
              '尽管生物技术承诺治愈毁灭性的疾病，但可以认为，每一项进步都在悄然把曾经被认为不可想象的干预手段正常化。',
          },
          {
            en: 'Admittedly, regulating such research risks driving it underground or overseas; nevertheless, the absence of limits assumes a wisdom and restraint that history rarely justifies.',
            native:
              '诚然，监管此类研究有将其逼入地下或海外的风险；然而，不设限则假定了一种历史上鲜有依据的智慧与克制。',
          },
          {
            en: 'On balance, limits seem unavoidable; the genuine debate concerns who sets them, scientists, governments, or citizens, and through what legitimate process.',
            native:
              '总体而言，设限似乎不可避免；真正的争论在于由谁来设定——科学家、政府还是公民——以及通过何种合法程序。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'genetic engineering',
    questionText: 'Is it ethical to edit the genes of future generations who cannot consent?',
    translations: {
      te: {
        word: 'జన్యు ఇంజినీరింగ్',
        question: 'సమ్మతి ఇవ్వలేని భవిష్యత్ తరాల జన్యువులను సవరించడం నైతికమేనా?',
        examples: [
          {
            en: 'While eliminating inherited diseases seems obviously compassionate, it could be argued that germline editing crosses a threshold from healing patients to redesigning humanity itself.',
            native:
              'వంశపారంపర్య వ్యాధులను తొలగించడం స్పష్టంగా కరుణామయంగా అనిపించినప్పటికీ, జెర్మ్‌లైన్ ఎడిటింగ్ రోగులను నయం చేయడం నుండి మానవతనే పునర్రూపకల్పన చేయడానికి ఒక అడ్డంకిని దాటుతుందని చెప్పవచ్చు.',
          },
          {
            en: 'Admittedly, parents already shape children through environment and schooling; nevertheless, genetic choices are irreversible across generations, which arguably demands a far higher standard of caution.',
            native:
              'నిజానికి తల్లిదండ్రులు వాతావరణం, విద్య ద్వారా పిల్లలను ఇప్పటికే ఆకారం ఇస్తారు; అయినప్పటికీ, జన్యు ఎంపికలు తరాలవారీగా రద్దు చేయలేనివి, అందుకే చాలా ఎక్కువ జాగ్రత్త ప్రమాణం అవసరమని చెప్పవచ్చు.',
          },
          {
            en: 'On balance, the strongest objection seems not technical but social: engineered advantages could harden inequality into biology, making privilege literally hereditary.',
            native:
              'మొత్తానికి, అతిబలమైన అభ్యంతరం సాంకేతికం కాదు, సామాజికం: ఇంజినీర్ చేసిన అనుకూలతలు అసమానతను జీవశాస్త్రంలో గట్టిపరచి, ప్రత్యేక హక్కును అక్షరాలా వంశపారంపర్యం చేయవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'आनुवंशिक अभियांत्रिकी',
        question: 'क्या उन भावी पीढ़ियों के जीन संपादित करना नैतिक है जो सहमति नहीं दे सकतीं?',
        examples: [
          {
            en: 'While eliminating inherited diseases seems obviously compassionate, it could be argued that germline editing crosses a threshold from healing patients to redesigning humanity itself.',
            native:
              'जबकि वंशानुगत रोगों को समाप्त करना स्पष्ट रूप से करुणामय लगता है, यह तर्क दिया जा सकता है कि जर्मलाइन संपादन रोगियों के इलाज से मानवता के पुनरडिज़ाइन की दहलीज़ पार कर जाता है।',
          },
          {
            en: 'Admittedly, parents already shape children through environment and schooling; nevertheless, genetic choices are irreversible across generations, which arguably demands a far higher standard of caution.',
            native:
              'यह स्वीकार करना होगा कि माता-पिता वातावरण और शिक्षा से बच्चों को पहले से आकार देते हैं; फिर भी, आनुवंशिक चुनाव पीढ़ियों में अपरिवर्तनीय हैं—जो तर्कतः कहीं अधिक सावधानी का मानक माँगता है।',
          },
          {
            en: 'On balance, the strongest objection seems not technical but social: engineered advantages could harden inequality into biology, making privilege literally hereditary.',
            native:
              'कुल मिलाकर, सबसे मज़बूत आपत्ति तकनीकी नहीं बल्कि सामाजिक लगती है: अभियांत्रित लाभ असमानता को जीवविज्ञान में गढ़ सकते हैं, विशेषाधिकार को शाब्दिक रूप से वंशानुगत बना सकते हैं।',
          },
        ],
      },
      es: {
        word: 'ingeniería genética',
        question: '¿Es ético editar los genes de generaciones futuras que no pueden dar su consentimiento?',
        examples: [
          {
            en: 'While eliminating inherited diseases seems obviously compassionate, it could be argued that germline editing crosses a threshold from healing patients to redesigning humanity itself.',
            native:
              'Aunque eliminar enfermedades hereditarias parece obviamente compasivo, podría argumentarse que la edición de la línea germinal cruza un umbral: de curar pacientes a rediseñar la humanidad misma.',
          },
          {
            en: 'Admittedly, parents already shape children through environment and schooling; nevertheless, genetic choices are irreversible across generations, which arguably demands a far higher standard of caution.',
            native:
              'Es cierto que los padres ya moldean a los hijos mediante el entorno y la educación; sin embargo, las elecciones genéticas son irreversibles a través de las generaciones, lo que exige posiblemente un estándar de cautela mucho mayor.',
          },
          {
            en: 'On balance, the strongest objection seems not technical but social: engineered advantages could harden inequality into biology, making privilege literally hereditary.',
            native:
              'En definitiva, la objeción más fuerte no parece técnica sino social: las ventajas diseñadas podrían endurecer la desigualdad hasta convertirla en biología, haciendo el privilegio literalmente hereditario.',
          },
        ],
      },
      zh: {
        word: '基因工程',
        question: '编辑无法表示同意的未来世代的基因是否合乎伦理？',
        examples: [
          {
            en: 'While eliminating inherited diseases seems obviously compassionate, it could be argued that germline editing crosses a threshold from healing patients to redesigning humanity itself.',
            native:
              '尽管消除遗传疾病显然富有同情心，但可以认为，生殖系基因编辑跨越了一道门槛——从治愈病人到重新设计人类本身。',
          },
          {
            en: 'Admittedly, parents already shape children through environment and schooling; nevertheless, genetic choices are irreversible across generations, which arguably demands a far higher standard of caution.',
            native:
              '诚然，父母早已通过环境和教育塑造孩子；然而，基因选择会跨世代不可逆转，这可以说要求远为更高的谨慎标准。',
          },
          {
            en: 'On balance, the strongest objection seems not technical but social: engineered advantages could harden inequality into biology, making privilege literally hereditary.',
            native:
              '总体而言，最有力的反对意见似乎不是技术性的，而是社会性的：人为设计的优势可能把不平等固化为生物学，让特权名副其实地世袭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'neuroscience',
    questionText: 'How should discoveries in neuroscience influence our understanding of personal responsibility?',
    translations: {
      te: {
        word: 'నాడీవిజ్ఞానం',
        question: 'నాడీవిజ్ఞానంలో ఆవిష్కరణలు వ్యక్తిగత బాధ్యతపై మన అవగాహనను ఎలా ప్రభావితం చేయాలి?',
        examples: [
          {
            en: 'Evidence that the brain initiates actions before conscious awareness complicates, but does not necessarily eliminate, the idea of free will.',
            native:
              'చేతన అవగాహనకు ముందే మెదడు చర్యలను ప్రారంభిస్తుందనే ఆధారం స్వేచ్ఛా సంకల్ప భావనను సంక్లిష్టం చేస్తుంది, కానీ దాన్ని తప్పనిసరిగా తొలగించదు.',
          },
          {
            en: 'Courts may reasonably consider neurological impairments, provided that scientific explanations do not become automatic excuses for harmful conduct.',
            native:
              'శాస్త్రీయ వివరణలు హానికర ప్రవర్తనకు స్వయంచాలక సాకులుగా మారకుండా ఉంటే, న్యాయస్థానాలు నాడీ సంబంధిత వైకల్యాలను సముచితంగా పరిగణించవచ్చు.',
          },
          {
            en: 'Neuroscience is most valuable when it refines our judgments about capacity and rehabilitation rather than pretending to settle moral questions alone.',
            native:
              'నైతిక ప్రశ్నలను తానే పరిష్కరిస్తుందని చెప్పుకోవడం కంటే, సామర్థ్యం మరియు పునరావాసంపై మన నిర్ణయాలను మెరుగుపరిచినప్పుడు నాడీవిజ్ఞానం అత్యంత విలువైనది.',
          },
        ],
      },
      hi: {
        word: 'तंत्रिका विज्ञान',
        question: 'तंत्रिका विज्ञान की खोजों को व्यक्तिगत उत्तरदायित्व की हमारी समझ को कैसे प्रभावित करना चाहिए?',
        examples: [
          {
            en: 'Evidence that the brain initiates actions before conscious awareness complicates, but does not necessarily eliminate, the idea of free will.',
            native:
              'यह प्रमाण कि मस्तिष्क सचेत जागरूकता से पहले ही क्रियाएँ शुरू कर देता है, स्वतंत्र इच्छा की अवधारणा को जटिल बनाता है, लेकिन उसे अनिवार्य रूप से समाप्त नहीं करता।',
          },
          {
            en: 'Courts may reasonably consider neurological impairments, provided that scientific explanations do not become automatic excuses for harmful conduct.',
            native:
              'न्यायालय तंत्रिका संबंधी विकारों पर उचित रूप से विचार कर सकते हैं, बशर्ते वैज्ञानिक व्याख्याएँ हानिकारक आचरण के लिए स्वतः बहाना न बन जाएँ।',
          },
          {
            en: 'Neuroscience is most valuable when it refines our judgments about capacity and rehabilitation rather than pretending to settle moral questions alone.',
            native:
              'तंत्रिका विज्ञान तब सबसे उपयोगी है जब वह नैतिक प्रश्नों को अकेले सुलझाने का दावा करने के बजाय क्षमता और पुनर्वास पर हमारे निर्णयों को अधिक सूक्ष्म बनाता है।',
          },
        ],
      },
      es: {
        word: 'neurociencia',
        question:
          '¿Cómo deberían influir los descubrimientos de la neurociencia en nuestra comprensión de la responsabilidad personal?',
        examples: [
          {
            en: 'Evidence that the brain initiates actions before conscious awareness complicates, but does not necessarily eliminate, the idea of free will.',
            native:
              'La evidencia de que el cerebro inicia acciones antes de que seamos conscientes complica, pero no elimina necesariamente, la idea del libre albedrío.',
          },
          {
            en: 'Courts may reasonably consider neurological impairments, provided that scientific explanations do not become automatic excuses for harmful conduct.',
            native:
              'Los tribunales pueden considerar razonablemente las alteraciones neurológicas, siempre que las explicaciones científicas no se conviertan en excusas automáticas para conductas dañinas.',
          },
          {
            en: 'Neuroscience is most valuable when it refines our judgments about capacity and rehabilitation rather than pretending to settle moral questions alone.',
            native:
              'La neurociencia resulta más valiosa cuando afina nuestros juicios sobre la capacidad y la rehabilitación, en vez de pretender resolver por sí sola cuestiones morales.',
          },
        ],
      },
      zh: {
        word: '神经科学',
        question: '神经科学的发现应当如何影响我们对个人责任的理解？',
        examples: [
          {
            en: 'Evidence that the brain initiates actions before conscious awareness complicates, but does not necessarily eliminate, the idea of free will.',
            native: '大脑在意识察觉之前便启动行动的证据，使自由意志这一观念变得复杂，但并不必然将其否定。',
          },
          {
            en: 'Courts may reasonably consider neurological impairments, provided that scientific explanations do not become automatic excuses for harmful conduct.',
            native: '法院可以合理考虑神经功能障碍，前提是科学解释不会自动沦为有害行为的借口。',
          },
          {
            en: 'Neuroscience is most valuable when it refines our judgments about capacity and rehabilitation rather than pretending to settle moral questions alone.',
            native: '神经科学最有价值之处，在于完善我们对行为能力与康复的判断，而非声称仅凭自身就能解决道德问题。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'quantum computing',
    questionText: 'What opportunities and governance challenges could arise from quantum computing?',
    translations: {
      te: {
        word: 'క్వాంటం కంప్యూటింగ్',
        question: 'క్వాంటం కంప్యూటింగ్ వల్ల ఏ అవకాశాలు మరియు పాలనా సవాళ్లు తలెత్తవచ్చు?',
        examples: [
          {
            en: 'Quantum machines could transform drug discovery and materials science by modelling interactions that overwhelm conventional computers.',
            native:
              'సాంప్రదాయ కంప్యూటర్ల సామర్థ్యాన్ని మించే పరస్పర చర్యలను నమూనా చేయడం ద్వారా క్వాంటం యంత్రాలు ఔషధ ఆవిష్కరణను మరియు పదార్థ విజ్ఞానాన్ని మార్చగలవు.',
          },
          {
            en: 'Their ability to break widely used encryption means governments must modernize digital infrastructure long before the technology becomes commonplace.',
            native:
              'విస్తృతంగా ఉపయోగించే సంకేతీకరణను ఛేదించే వాటి సామర్థ్యం కారణంగా, ఈ సాంకేతికత సాధారణమయ్యే చాలా ముందుగానే ప్రభుత్వాలు డిజిటల్ మౌలిక సదుపాయాలను ఆధునీకరించాలి.',
          },
          {
            en: 'International standards could prevent a destabilizing race, yet excessive restrictions might concentrate expertise among a handful of powerful states and corporations.',
            native:
              'అంతర్జాతీయ ప్రమాణాలు అస్థిరత కలిగించే పోటీని నివారించగలవు, అయితే మితిమీరిన పరిమితులు కొద్దిమంది శక్తివంతమైన దేశాలు మరియు సంస్థల వద్ద నైపుణ్యాన్ని కేంద్రీకరించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'क्वांटम कंप्यूटिंग',
        question: 'क्वांटम कंप्यूटिंग से कौन-से अवसर और शासन संबंधी चुनौतियाँ उत्पन्न हो सकती हैं?',
        examples: [
          {
            en: 'Quantum machines could transform drug discovery and materials science by modelling interactions that overwhelm conventional computers.',
            native:
              'क्वांटम मशीनें उन अंतःक्रियाओं का मॉडल बनाकर औषधि खोज और पदार्थ विज्ञान को बदल सकती हैं जिन्हें पारंपरिक कंप्यूटर संभाल नहीं पाते।',
          },
          {
            en: 'Their ability to break widely used encryption means governments must modernize digital infrastructure long before the technology becomes commonplace.',
            native:
              'व्यापक रूप से प्रयुक्त कूटलेखन को तोड़ने की उनकी क्षमता का अर्थ है कि तकनीक के आम होने से बहुत पहले सरकारों को डिजिटल अवसंरचना आधुनिक बनानी होगी।',
          },
          {
            en: 'International standards could prevent a destabilizing race, yet excessive restrictions might concentrate expertise among a handful of powerful states and corporations.',
            native:
              'अंतरराष्ट्रीय मानक अस्थिर करने वाली होड़ को रोक सकते हैं, फिर भी अत्यधिक पाबंदियाँ विशेषज्ञता को कुछ शक्तिशाली देशों और कंपनियों तक सीमित कर सकती हैं।',
          },
        ],
      },
      es: {
        word: 'computación cuántica',
        question: '¿Qué oportunidades y desafíos de gobernanza podría plantear la computación cuántica?',
        examples: [
          {
            en: 'Quantum machines could transform drug discovery and materials science by modelling interactions that overwhelm conventional computers.',
            native:
              'Las máquinas cuánticas podrían transformar el descubrimiento de fármacos y la ciencia de materiales al modelar interacciones que desbordan a los ordenadores convencionales.',
          },
          {
            en: 'Their ability to break widely used encryption means governments must modernize digital infrastructure long before the technology becomes commonplace.',
            native:
              'Su capacidad para vulnerar sistemas de cifrado ampliamente utilizados implica que los gobiernos deben modernizar la infraestructura digital mucho antes de que la tecnología se generalice.',
          },
          {
            en: 'International standards could prevent a destabilizing race, yet excessive restrictions might concentrate expertise among a handful of powerful states and corporations.',
            native:
              'Las normas internacionales podrían evitar una carrera desestabilizadora, pero unas restricciones excesivas podrían concentrar los conocimientos en unos pocos Estados y empresas poderosos.',
          },
        ],
      },
      zh: {
        word: '量子计算',
        question: '量子计算可能带来哪些机遇与治理挑战？',
        examples: [
          {
            en: 'Quantum machines could transform drug discovery and materials science by modelling interactions that overwhelm conventional computers.',
            native: '量子计算机能够模拟传统计算机难以处理的相互作用，从而可能彻底改变药物研发与材料科学。',
          },
          {
            en: 'Their ability to break widely used encryption means governments must modernize digital infrastructure long before the technology becomes commonplace.',
            native: '量子计算破解常用加密方式的能力意味着，各国政府必须在该技术普及之前很久就着手升级数字基础设施。',
          },
          {
            en: 'International standards could prevent a destabilizing race, yet excessive restrictions might concentrate expertise among a handful of powerful states and corporations.',
            native: '国际标准或可防止破坏稳定的竞赛，但过度限制也可能使专业能力集中在少数强国和大型企业手中。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'energy transition',
    questionText: 'How can societies make the energy transition both rapid and socially fair?',
    translations: {
      te: {
        word: 'ఇంధన పరివర్తన',
        question: 'సమాజాలు ఇంధన పరివర్తనను వేగవంతంగానూ సామాజికంగా న్యాయసమ్మతంగానూ ఎలా చేయగలవు?',
        examples: [
          {
            en: 'Carbon pricing can accelerate cleaner investment, but households with low incomes need protection from sudden increases in essential costs.',
            native:
              'కార్బన్ ధర నిర్ణయం స్వచ్ఛమైన పెట్టుబడులను వేగవంతం చేయగలదు, కానీ తక్కువ ఆదాయం గల కుటుంబాలకు అవసరమైన ఖర్చుల ఆకస్మిక పెరుగుదల నుంచి రక్షణ అవసరం.',
          },
          {
            en: 'Regions dependent on fossil-fuel industries require credible retraining, infrastructure, and long-term employment rather than temporary compensation alone.',
            native:
              'శిలాజ ఇంధన పరిశ్రమలపై ఆధారపడిన ప్రాంతాలకు తాత్కాలిక పరిహారం మాత్రమే కాకుండా విశ్వసనీయమైన పునశ్శిక్షణ, మౌలిక సదుపాయాలు మరియు దీర్ఘకాలిక ఉపాధి అవసరం.',
          },
          {
            en: 'A fair transition distributes not only its costs but also the ownership and benefits of renewable energy across communities.',
            native:
              'న్యాయమైన పరివర్తన దాని ఖర్చులను మాత్రమే కాకుండా పునరుత్పాదక ఇంధన యాజమాన్యాన్ని మరియు ప్రయోజనాలను కూడా సమాజాల మధ్య పంచుతుంది.',
          },
        ],
      },
      hi: {
        word: 'ऊर्जा संक्रमण',
        question: 'समाज ऊर्जा संक्रमण को तेज़ और सामाजिक रूप से न्यायपूर्ण दोनों कैसे बना सकते हैं?',
        examples: [
          {
            en: 'Carbon pricing can accelerate cleaner investment, but households with low incomes need protection from sudden increases in essential costs.',
            native:
              'कार्बन मूल्य निर्धारण स्वच्छ निवेश को तेज़ कर सकता है, लेकिन कम आय वाले परिवारों को आवश्यक खर्चों में अचानक वृद्धि से सुरक्षा चाहिए।',
          },
          {
            en: 'Regions dependent on fossil-fuel industries require credible retraining, infrastructure, and long-term employment rather than temporary compensation alone.',
            native:
              'जीवाश्म ईंधन उद्योगों पर निर्भर क्षेत्रों को केवल अस्थायी मुआवज़े के बजाय विश्वसनीय पुनःप्रशिक्षण, बुनियादी ढाँचा और दीर्घकालिक रोज़गार चाहिए।',
          },
          {
            en: 'A fair transition distributes not only its costs but also the ownership and benefits of renewable energy across communities.',
            native:
              'न्यायपूर्ण संक्रमण केवल अपनी लागत ही नहीं, बल्कि नवीकरणीय ऊर्जा का स्वामित्व और लाभ भी समुदायों में बाँटता है।',
          },
        ],
      },
      es: {
        word: 'transición energética',
        question: '¿Cómo pueden las sociedades lograr que la transición energética sea rápida y socialmente justa?',
        examples: [
          {
            en: 'Carbon pricing can accelerate cleaner investment, but households with low incomes need protection from sudden increases in essential costs.',
            native:
              'Fijar un precio al carbono puede acelerar la inversión limpia, pero los hogares con bajos ingresos necesitan protección frente a aumentos repentinos de los gastos esenciales.',
          },
          {
            en: 'Regions dependent on fossil-fuel industries require credible retraining, infrastructure, and long-term employment rather than temporary compensation alone.',
            native:
              'Las regiones dependientes de las industrias de combustibles fósiles necesitan reciclaje profesional, infraestructura y empleo duradero creíbles, no solo compensaciones temporales.',
          },
          {
            en: 'A fair transition distributes not only its costs but also the ownership and benefits of renewable energy across communities.',
            native:
              'Una transición justa distribuye entre las comunidades no solo sus costes, sino también la propiedad y los beneficios de la energía renovable.',
          },
        ],
      },
      zh: {
        word: '能源转型',
        question: '社会如何才能让能源转型既迅速又兼顾社会公平？',
        examples: [
          {
            en: 'Carbon pricing can accelerate cleaner investment, but households with low incomes need protection from sudden increases in essential costs.',
            native: '碳定价能够加快清洁投资，但低收入家庭需要得到保护，以免基本生活成本突然上涨。',
          },
          {
            en: 'Regions dependent on fossil-fuel industries require credible retraining, infrastructure, and long-term employment rather than temporary compensation alone.',
            native: '依赖化石燃料产业的地区需要可信的再培训、基础设施和长期就业，而不能只有临时补偿。',
          },
          {
            en: 'A fair transition distributes not only its costs but also the ownership and benefits of renewable energy across communities.',
            native: '公平转型不仅要分担成本，还要让不同社区共享可再生能源的所有权与收益。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'circular economy',
    questionText: 'Can a circular economy reconcile continued prosperity with ecological limits?',
    translations: {
      te: {
        word: 'వలయాకార ఆర్థిక వ్యవస్థ',
        question: 'వలయాకార ఆర్థిక వ్యవస్థ నిరంతర శ్రేయస్సును పర్యావరణ పరిమితులతో సమన్వయం చేయగలదా?',
        examples: [
          {
            en: 'Designing products for repair and reuse can reduce extraction, although it requires manufacturers to abandon profitable planned obsolescence.',
            native:
              'మరమ్మత్తు మరియు పునర్వినియోగం కోసం ఉత్పత్తులను రూపొందించడం వనరుల వెలికితీతను తగ్గించగలదు, అయితే లాభదాయకమైన ప్రణాళికాబద్ధ వాడుకకాల పరిమితిని తయారీదారులు వదులుకోవాలి.',
          },
          {
            en: 'Recycling alone cannot sustain endless consumption because every material cycle loses quality, energy, or usable volume.',
            native:
              'ప్రతి పదార్థ చక్రంలో నాణ్యత, శక్తి లేదా ఉపయోగించగల పరిమాణం తగ్గుతుంది కాబట్టి, పునర్వినియోగ ప్రక్రియ ఒక్కటే అంతులేని వినియోగాన్ని కొనసాగించలేదు.',
          },
          {
            en: 'The circular model is persuasive when it changes ownership, incentives, and design, not when it merely gives disposable goods a greener label.',
            native:
              'విసిరివేసే వస్తువులకు కేవలం పచ్చని ముద్ర వేయకుండా, యాజమాన్యం, ప్రోత్సాహకాలు మరియు రూపకల్పనను మార్చినప్పుడే వలయాకార నమూనా నమ్మదగినదిగా ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'चक्रीय अर्थव्यवस्था',
        question: 'क्या चक्रीय अर्थव्यवस्था निरंतर समृद्धि को पारिस्थितिक सीमाओं के साथ समेट सकती है?',
        examples: [
          {
            en: 'Designing products for repair and reuse can reduce extraction, although it requires manufacturers to abandon profitable planned obsolescence.',
            native:
              'उत्पादों को मरम्मत और पुनःउपयोग योग्य बनाने से संसाधनों का दोहन घट सकता है, हालांकि इसके लिए निर्माताओं को लाभदायक नियोजित अप्रचलन छोड़ना होगा।',
          },
          {
            en: 'Recycling alone cannot sustain endless consumption because every material cycle loses quality, energy, or usable volume.',
            native:
              'केवल पुनर्चक्रण अंतहीन उपभोग को बनाए नहीं रख सकता, क्योंकि सामग्री के हर चक्र में गुणवत्ता, ऊर्जा या उपयोग योग्य मात्रा घटती है।',
          },
          {
            en: 'The circular model is persuasive when it changes ownership, incentives, and design, not when it merely gives disposable goods a greener label.',
            native:
              'चक्रीय मॉडल तब विश्वसनीय है जब वह स्वामित्व, प्रोत्साहन और डिज़ाइन बदलता है, न कि तब जब वह फेंकने योग्य वस्तुओं पर केवल हरित लेबल लगा देता है।',
          },
        ],
      },
      es: {
        word: 'economía circular',
        question: '¿Puede una economía circular conciliar una prosperidad continuada con los límites ecológicos?',
        examples: [
          {
            en: 'Designing products for repair and reuse can reduce extraction, although it requires manufacturers to abandon profitable planned obsolescence.',
            native:
              'Diseñar productos reparables y reutilizables puede reducir la extracción, aunque exige que los fabricantes abandonen la rentable obsolescencia programada.',
          },
          {
            en: 'Recycling alone cannot sustain endless consumption because every material cycle loses quality, energy, or usable volume.',
            native:
              'El reciclaje por sí solo no puede sostener un consumo infinito, pues cada ciclo de los materiales pierde calidad, energía o volumen aprovechable.',
          },
          {
            en: 'The circular model is persuasive when it changes ownership, incentives, and design, not when it merely gives disposable goods a greener label.',
            native:
              'El modelo circular resulta convincente cuando cambia la propiedad, los incentivos y el diseño, no cuando se limita a poner una etiqueta más verde a bienes desechables.',
          },
        ],
      },
      zh: {
        word: '循环经济',
        question: '循环经济能否使持续繁荣与生态限度相协调？',
        examples: [
          {
            en: 'Designing products for repair and reuse can reduce extraction, although it requires manufacturers to abandon profitable planned obsolescence.',
            native: '将产品设计成可维修、可重复使用的形式能够减少资源开采，但这要求制造商放弃有利可图的计划性报废。',
          },
          {
            en: 'Recycling alone cannot sustain endless consumption because every material cycle loses quality, energy, or usable volume.',
            native: '仅靠回收无法维持无止境的消费，因为材料每循环一次都会损失质量、能量或可用体量。',
          },
          {
            en: 'The circular model is persuasive when it changes ownership, incentives, and design, not when it merely gives disposable goods a greener label.',
            native: '循环模式只有在改变所有权、激励机制和设计时才有说服力，而不是仅给一次性商品贴上更环保的标签。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'geopolitical tension',
    questionText: 'How can governments manage geopolitical tension without normalizing permanent confrontation?',
    translations: {
      te: {
        word: 'భౌగోళిక రాజకీయ ఉద్రిక్తత',
        question: 'శాశ్వత ఘర్షణను సాధారణీకరించకుండా ప్రభుత్వాలు భౌగోళిక రాజకీయ ఉద్రిక్తతను ఎలా నిర్వహించగలవు?',
        examples: [
          {
            en: 'Deterrence may prevent immediate aggression, but unchecked military buildup can make miscalculation more likely and compromise harder.',
            native:
              'నిరోధక శక్తి తక్షణ దాడిని అడ్డుకోవచ్చు, కానీ నియంత్రణలేని సైనిక విస్తరణ తప్పుడు అంచనాల అవకాశాన్ని పెంచి రాజీని కష్టతరం చేయగలదు.',
          },
          {
            en: 'Reliable crisis hotlines and limited technical agreements preserve communication even when broader political relations have deteriorated.',
            native:
              'విస్తృత రాజకీయ సంబంధాలు క్షీణించినప్పటికీ, విశ్వసనీయ సంక్షోభ ప్రత్యక్ష సంప్రదింపు మార్గాలు మరియు పరిమిత సాంకేతిక ఒప్పందాలు సంభాషణను కొనసాగిస్తాయి.',
          },
          {
            en: 'Leaders should distinguish genuine security interests from symbolic disputes that domestic politics rewards them for escalating.',
            native:
              'దేశీయ రాజకీయాలు తీవ్రతరం చేయడాన్ని ప్రోత్సహించే ప్రతీకాత్మక వివాదాల నుంచి నిజమైన భద్రతా ప్రయోజనాలను నాయకులు వేరు చేయాలి.',
          },
        ],
      },
      hi: {
        word: 'भू-राजनीतिक तनाव',
        question: 'स्थायी टकराव को सामान्य बनाए बिना सरकारें भू-राजनीतिक तनाव का प्रबंधन कैसे कर सकती हैं?',
        examples: [
          {
            en: 'Deterrence may prevent immediate aggression, but unchecked military buildup can make miscalculation more likely and compromise harder.',
            native:
              'प्रतिरोध तत्काल आक्रमण रोक सकता है, लेकिन अनियंत्रित सैन्य विस्तार गलत आकलन की आशंका बढ़ा सकता है और समझौते को कठिन बना सकता है।',
          },
          {
            en: 'Reliable crisis hotlines and limited technical agreements preserve communication even when broader political relations have deteriorated.',
            native:
              'विश्वसनीय संकट हॉटलाइन और सीमित तकनीकी समझौते तब भी संवाद बनाए रखते हैं जब व्यापक राजनीतिक संबंध बिगड़ चुके हों।',
          },
          {
            en: 'Leaders should distinguish genuine security interests from symbolic disputes that domestic politics rewards them for escalating.',
            native:
              'नेताओं को वास्तविक सुरक्षा हितों और उन प्रतीकात्मक विवादों में अंतर करना चाहिए जिन्हें बढ़ाने पर घरेलू राजनीति उन्हें लाभ देती है।',
          },
        ],
      },
      es: {
        word: 'tensión geopolítica',
        question:
          '¿Cómo pueden los gobiernos gestionar la tensión geopolítica sin normalizar una confrontación permanente?',
        examples: [
          {
            en: 'Deterrence may prevent immediate aggression, but unchecked military buildup can make miscalculation more likely and compromise harder.',
            native:
              'La disuasión puede impedir una agresión inmediata, pero una acumulación militar sin control aumenta el riesgo de errores de cálculo y dificulta los acuerdos.',
          },
          {
            en: 'Reliable crisis hotlines and limited technical agreements preserve communication even when broader political relations have deteriorated.',
            native:
              'Las líneas directas de crisis fiables y los acuerdos técnicos limitados mantienen la comunicación incluso cuando las relaciones políticas generales se han deteriorado.',
          },
          {
            en: 'Leaders should distinguish genuine security interests from symbolic disputes that domestic politics rewards them for escalating.',
            native:
              'Los dirigentes deberían distinguir los intereses de seguridad genuinos de las disputas simbólicas cuya escalada les recompensa la política interna.',
          },
        ],
      },
      zh: {
        word: '地缘政治紧张局势',
        question: '各国政府如何在不使长期对抗常态化的前提下管控地缘政治紧张局势？',
        examples: [
          {
            en: 'Deterrence may prevent immediate aggression, but unchecked military buildup can make miscalculation more likely and compromise harder.',
            native: '威慑或许能阻止眼前的侵略，但不受约束的扩军会增加误判的可能，也会使妥协更加困难。',
          },
          {
            en: 'Reliable crisis hotlines and limited technical agreements preserve communication even when broader political relations have deteriorated.',
            native: '即使整体政治关系已经恶化，可靠的危机热线和有限的技术协议仍能维持沟通。',
          },
          {
            en: 'Leaders should distinguish genuine security interests from symbolic disputes that domestic politics rewards them for escalating.',
            native: '领导人应区分真正的安全利益与象征性争端，后者往往因国内政治奖励升级行为而被放大。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'diplomacy',
    questionText: 'What makes diplomacy effective when the parties fundamentally distrust one another?',
    translations: {
      te: {
        word: 'దౌత్యం',
        question: 'పక్షాలు ఒకరినొకరు ప్రాథమికంగా అవిశ్వసించినప్పుడు దౌత్యాన్ని ప్రభావవంతంగా చేసేది ఏమిటి?',
        examples: [
          {
            en: 'Successful diplomacy does not require affection; it requires verifiable commitments whose benefits exceed the political cost of cooperation.',
            native:
              'విజయవంతమైన దౌత్యానికి పరస్పర అభిమానం అవసరం లేదు; సహకారం వల్ల కలిగే రాజకీయ వ్యయం కంటే ఎక్కువ ప్రయోజనాలు అందించే, ధృవీకరించగల కట్టుబాట్లు అవసరం.',
          },
          {
            en: 'Skilled negotiators identify narrow shared interests first, allowing modest agreements to establish a record of predictable behavior.',
            native:
              'నైపుణ్యమైన చర్చాకర్తలు ముందుగా పరిమితమైన ఉమ్మడి ప్రయోజనాలను గుర్తించి, చిన్న ఒప్పందాల ద్వారా ఊహించదగిన ప్రవర్తనకు ఒక చరిత్రను ఏర్పరుస్తారు.',
          },
          {
            en: 'Private channels can enable candor and compromise, although secrecy becomes corrosive when it excludes those who must implement the outcome.',
            native:
              'రహస్య మార్గాలు నిష్కపటతకు మరియు రాజీకి వీలు కల్పించగలవు, అయితే ఫలితాన్ని అమలు చేయాల్సిన వారిని మినహాయించినప్పుడు గోప్యత హానికరంగా మారుతుంది.',
          },
        ],
      },
      hi: {
        word: 'कूटनीति',
        question: 'जब पक्ष एक-दूसरे पर मूल रूप से अविश्वास करते हों, तब कूटनीति को प्रभावी क्या बनाता है?',
        examples: [
          {
            en: 'Successful diplomacy does not require affection; it requires verifiable commitments whose benefits exceed the political cost of cooperation.',
            native:
              'सफल कूटनीति के लिए लगाव नहीं, बल्कि ऐसी सत्यापन योग्य प्रतिबद्धताएँ चाहिए जिनके लाभ सहयोग की राजनीतिक कीमत से अधिक हों।',
          },
          {
            en: 'Skilled negotiators identify narrow shared interests first, allowing modest agreements to establish a record of predictable behavior.',
            native:
              'कुशल वार्ताकार पहले सीमित साझा हित पहचानते हैं, जिससे छोटे समझौते पूर्वानुमेय व्यवहार का इतिहास बना सकें।',
          },
          {
            en: 'Private channels can enable candor and compromise, although secrecy becomes corrosive when it excludes those who must implement the outcome.',
            native:
              'निजी संवाद स्पष्टवादिता और समझौते को संभव बना सकता है, हालांकि जब गोपनीयता परिणाम लागू करने वालों को बाहर रखती है तो वह हानिकारक हो जाती है।',
          },
        ],
      },
      es: {
        word: 'diplomacia',
        question: '¿Qué hace eficaz a la diplomacia cuando las partes desconfían profundamente unas de otras?',
        examples: [
          {
            en: 'Successful diplomacy does not require affection; it requires verifiable commitments whose benefits exceed the political cost of cooperation.',
            native:
              'La diplomacia eficaz no requiere afecto, sino compromisos verificables cuyos beneficios superen el coste político de cooperar.',
          },
          {
            en: 'Skilled negotiators identify narrow shared interests first, allowing modest agreements to establish a record of predictable behavior.',
            native:
              'Los negociadores hábiles identifican primero intereses compartidos concretos, de modo que acuerdos modestos establezcan un historial de conducta previsible.',
          },
          {
            en: 'Private channels can enable candor and compromise, although secrecy becomes corrosive when it excludes those who must implement the outcome.',
            native:
              'Los canales privados pueden facilitar la franqueza y el acuerdo, aunque el secreto se vuelve corrosivo cuando excluye a quienes deben aplicar el resultado.',
          },
        ],
      },
      zh: {
        word: '外交',
        question: '当各方从根本上互不信任时，什么能使外交取得成效？',
        examples: [
          {
            en: 'Successful diplomacy does not require affection; it requires verifiable commitments whose benefits exceed the political cost of cooperation.',
            native: '成功的外交不需要彼此亲近，而需要可核实的承诺，且其收益必须超过合作所付出的政治代价。',
          },
          {
            en: 'Skilled negotiators identify narrow shared interests first, allowing modest agreements to establish a record of predictable behavior.',
            native: '娴熟的谈判者会先找出范围有限的共同利益，通过适度协议逐步建立行为可预测的记录。',
          },
          {
            en: 'Private channels can enable candor and compromise, although secrecy becomes corrosive when it excludes those who must implement the outcome.',
            native: '私下渠道可以促成坦诚与妥协，但如果保密将负责落实结果的人排除在外，就会产生破坏作用。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'polarization',
    questionText: 'Why does political polarization persist even when citizens agree on many practical concerns?',
    translations: {
      te: {
        word: 'రాజకీయ ధ్రువీకరణ',
        question: 'అనేక ఆచరణాత్మక సమస్యలపై పౌరులు ఏకీభవించినప్పటికీ రాజకీయ ధ్రువీకరణ ఎందుకు కొనసాగుతుంది?',
        examples: [
          {
            en: "Partisan identity can become a social allegiance, so conceding a policy point feels like betraying one's community rather than revising an opinion.",
            native:
              'పక్షపాత గుర్తింపు సామాజిక విధేయతగా మారవచ్చు, అందువల్ల ఒక విధాన అంశాన్ని అంగీకరించడం అభిప్రాయాన్ని సవరించడం కంటే తన సమాజాన్ని మోసం చేసినట్లుగా అనిపిస్తుంది.',
          },
          {
            en: 'Electoral systems and media incentives often reward vivid conflict, while quieter areas of consensus attract little attention or funding.',
            native:
              'ఎన్నికల వ్యవస్థలు మరియు మీడియా ప్రోత్సాహకాలు తరచూ తీవ్రమైన ఘర్షణను పురస్కరిస్తాయి, అయితే నిశ్శబ్దంగా ఉన్న ఏకాభిప్రాయ అంశాలకు తక్కువ శ్రద్ధ లేదా నిధులు లభిస్తాయి.',
          },
          {
            en: 'Reducing polarization therefore requires repeated cross-group cooperation, not merely exposing people to one more set of facts.',
            native:
              'కాబట్టి ధ్రువీకరణను తగ్గించడానికి ప్రజలకు మరొక వాస్తవాల సమాహారాన్ని చూపించడం మాత్రమే కాకుండా, వర్గాల మధ్య పునరావృత సహకారం అవసరం.',
          },
        ],
      },
      hi: {
        word: 'राजनीतिक ध्रुवीकरण',
        question: 'कई व्यावहारिक चिंताओं पर नागरिकों की सहमति होने के बावजूद राजनीतिक ध्रुवीकरण क्यों बना रहता है?',
        examples: [
          {
            en: "Partisan identity can become a social allegiance, so conceding a policy point feels like betraying one's community rather than revising an opinion.",
            native:
              'दलगत पहचान सामाजिक निष्ठा बन सकती है, इसलिए किसी नीतिगत बात को स्वीकार करना राय बदलने के बजाय अपने समुदाय से विश्वासघात जैसा लगता है।',
          },
          {
            en: 'Electoral systems and media incentives often reward vivid conflict, while quieter areas of consensus attract little attention or funding.',
            native:
              'चुनावी व्यवस्थाएँ और मीडिया के प्रोत्साहन अक्सर तीखे टकराव को पुरस्कृत करते हैं, जबकि सहमति के शांत क्षेत्रों को बहुत कम ध्यान या धन मिलता है।',
          },
          {
            en: 'Reducing polarization therefore requires repeated cross-group cooperation, not merely exposing people to one more set of facts.',
            native:
              'इसलिए ध्रुवीकरण घटाने के लिए समूहों के बीच बार-बार सहयोग चाहिए, केवल लोगों के सामने तथ्यों का एक और समूह रख देना पर्याप्त नहीं है।',
          },
        ],
      },
      es: {
        word: 'polarización',
        question:
          '¿Por qué persiste la polarización política incluso cuando la ciudadanía coincide en muchas cuestiones prácticas?',
        examples: [
          {
            en: "Partisan identity can become a social allegiance, so conceding a policy point feels like betraying one's community rather than revising an opinion.",
            native:
              'La identidad partidista puede convertirse en una lealtad social, de modo que conceder un punto político parece traicionar a la propia comunidad en vez de revisar una opinión.',
          },
          {
            en: 'Electoral systems and media incentives often reward vivid conflict, while quieter areas of consensus attract little attention or funding.',
            native:
              'Los sistemas electorales y los incentivos mediáticos suelen premiar el conflicto visible, mientras que los ámbitos discretos de consenso apenas reciben atención o financiación.',
          },
          {
            en: 'Reducing polarization therefore requires repeated cross-group cooperation, not merely exposing people to one more set of facts.',
            native:
              'Reducir la polarización exige, por tanto, una cooperación reiterada entre grupos, no solo exponer a la gente a otro conjunto de datos.',
          },
        ],
      },
      zh: {
        word: '政治极化',
        question: '即使公民在许多实际问题上意见一致，政治极化为何仍会持续？',
        examples: [
          {
            en: "Partisan identity can become a social allegiance, so conceding a policy point feels like betraying one's community rather than revising an opinion.",
            native: '党派身份可能演变成社会归属，因此在政策观点上让步会让人觉得是在背叛自己的群体，而不是修正看法。',
          },
          {
            en: 'Electoral systems and media incentives often reward vivid conflict, while quieter areas of consensus attract little attention or funding.',
            native: '选举制度和媒体激励往往奖励鲜明的冲突，而较为平静的共识领域却很少获得关注或资金。',
          },
          {
            en: 'Reducing polarization therefore requires repeated cross-group cooperation, not merely exposing people to one more set of facts.',
            native: '因此，缓解极化需要不同群体反复合作，而不只是再向人们提供一组事实。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'populism',
    questionText: 'Under what conditions does populism strengthen democracy, and when does it undermine it?',
    translations: {
      te: {
        word: 'ప్రజాకర్షకవాదం',
        question: 'ఏ పరిస్థితుల్లో ప్రజాకర్షకవాదం ప్రజాస్వామ్యాన్ని బలోపేతం చేస్తుంది, ఎప్పుడు దాన్ని బలహీనపరుస్తుంది?',
        examples: [
          {
            en: 'Populist movements can force neglected grievances onto the agenda and challenge institutions that have become insulated from ordinary citizens.',
            native:
              'ప్రజాకర్షక ఉద్యమాలు నిర్లక్ష్యం చేసిన సమస్యలను కార్యాచరణలోకి తీసుకురాగలవు మరియు సాధారణ పౌరులకు దూరమైన సంస్థలను ప్రశ్నించగలవు.',
          },
          {
            en: 'They become dangerous when a leader claims exclusive ownership of the popular will and portrays every institutional restraint as illegitimate.',
            native:
              'ఒక నాయకుడు ప్రజాసంకల్పంపై తనకే ప్రత్యేక హక్కు ఉందని ప్రకటించి, ప్రతి సంస్థాగత నియంత్రణను చట్టవిరుద్ధంగా చిత్రించినప్పుడు అవి ప్రమాదకరంగా మారతాయి.',
          },
          {
            en: 'Democracies should address the failures that fuel populism while defending pluralism, judicial independence, and the rights of political minorities.',
            native:
              'ప్రజాస్వామ్యాలు ప్రజాకర్షకవాదానికి ఊతమిచ్చే వైఫల్యాలను పరిష్కరిస్తూనే బహుళత్వం, న్యాయవ్యవస్థ స్వతంత్రత మరియు రాజకీయ అల్పసంఖ్యాకుల హక్కులను కాపాడాలి.',
          },
        ],
      },
      hi: {
        word: 'लोकलुभावनवाद',
        question: 'किन परिस्थितियों में लोकलुभावनवाद लोकतंत्र को मज़बूत करता है और कब उसे कमज़ोर करता है?',
        examples: [
          {
            en: 'Populist movements can force neglected grievances onto the agenda and challenge institutions that have become insulated from ordinary citizens.',
            native:
              'लोकलुभावन आंदोलन उपेक्षित शिकायतों को कार्यसूची में ला सकते हैं और उन संस्थाओं को चुनौती दे सकते हैं जो आम नागरिकों से कट गई हैं।',
          },
          {
            en: 'They become dangerous when a leader claims exclusive ownership of the popular will and portrays every institutional restraint as illegitimate.',
            native:
              'वे तब खतरनाक हो जाते हैं जब कोई नेता जन-इच्छा पर एकाधिकार का दावा करता है और हर संस्थागत अंकुश को अवैध बताता है।',
          },
          {
            en: 'Democracies should address the failures that fuel populism while defending pluralism, judicial independence, and the rights of political minorities.',
            native:
              'लोकतंत्रों को लोकलुभावनवाद को बढ़ावा देने वाली विफलताओं का समाधान करते हुए बहुलवाद, न्यायिक स्वतंत्रता और राजनीतिक अल्पसंख्यकों के अधिकारों की रक्षा करनी चाहिए।',
          },
        ],
      },
      es: {
        word: 'populismo',
        question: '¿En qué condiciones fortalece el populismo la democracia y cuándo la debilita?',
        examples: [
          {
            en: 'Populist movements can force neglected grievances onto the agenda and challenge institutions that have become insulated from ordinary citizens.',
            native:
              'Los movimientos populistas pueden incorporar agravios desatendidos a la agenda y cuestionar instituciones que se han aislado de la ciudadanía común.',
          },
          {
            en: 'They become dangerous when a leader claims exclusive ownership of the popular will and portrays every institutional restraint as illegitimate.',
            native:
              'Se vuelven peligrosos cuando un dirigente se atribuye en exclusiva la voluntad popular y presenta todo límite institucional como ilegítimo.',
          },
          {
            en: 'Democracies should address the failures that fuel populism while defending pluralism, judicial independence, and the rights of political minorities.',
            native:
              'Las democracias deben corregir los fallos que alimentan el populismo a la vez que defienden el pluralismo, la independencia judicial y los derechos de las minorías políticas.',
          },
        ],
      },
      zh: {
        word: '民粹主义',
        question: '民粹主义在什么条件下会巩固民主，又在何时会损害民主？',
        examples: [
          {
            en: 'Populist movements can force neglected grievances onto the agenda and challenge institutions that have become insulated from ordinary citizens.',
            native: '民粹运动能够迫使被忽视的不满进入公共议程，并挑战那些已与普通公民隔绝的机构。',
          },
          {
            en: 'They become dangerous when a leader claims exclusive ownership of the popular will and portrays every institutional restraint as illegitimate.',
            native: '当某位领导人声称自己垄断民意，并把一切制度约束都描绘成不合法时，这类运动便会变得危险。',
          },
          {
            en: 'Democracies should address the failures that fuel populism while defending pluralism, judicial independence, and the rights of political minorities.',
            native: '民主制度应在解决助长民粹主义的失误之余，捍卫多元主义、司法独立与政治少数群体的权利。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'misinformation',
    questionText: 'How should open societies counter misinformation without suppressing legitimate disagreement?',
    translations: {
      te: {
        word: 'తప్పుడు సమాచారం',
        question: 'చట్టబద్ధమైన భిన్నాభిప్రాయాన్ని అణచివేయకుండా బహిరంగ సమాజాలు తప్పుడు సమాచారాన్ని ఎలా ఎదుర్కోవాలి?',
        examples: [
          {
            en: 'Rapid corrections matter, but they are more credible when independent experts explain both what is known and where uncertainty remains.',
            native:
              'త్వరిత సవరణలు ముఖ్యమైనవి, కానీ స్వతంత్ర నిపుణులు తెలిసిన విషయంతో పాటు అనిశ్చితి ఎక్కడ ఉందో వివరించినప్పుడు అవి మరింత విశ్వసనీయంగా ఉంటాయి.',
          },
          {
            en: 'Platforms can reduce algorithmic amplification of demonstrably false claims without appointing themselves the final arbiters of every contested opinion.',
            native:
              'వివాదాస్పదమైన ప్రతి అభిప్రాయానికి తామే తుది నిర్ణేతలుగా మారకుండా, స్పష్టంగా తప్పుడు వాదనల అల్గారిథమిక్ వ్యాప్తిని వేదికలు తగ్గించగలవు.',
          },
          {
            en: 'Long-term resilience depends on trustworthy institutions and media literacy, since censorship can leave the underlying demand for conspiratorial narratives untouched.',
            native:
              'దీర్ఘకాలిక ప్రతిఘటన విశ్వసనీయ సంస్థలు మరియు మీడియా అవగాహనపై ఆధారపడి ఉంటుంది, ఎందుకంటే సెన్సార్‌షిప్ కుట్ర కథనాల పట్ల ఉన్న అంతర్లీన ఆకర్షణను మార్చకపోవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'भ्रामक सूचना',
        question: 'खुले समाज वैध असहमति को दबाए बिना भ्रामक सूचनाओं का सामना कैसे करें?',
        examples: [
          {
            en: 'Rapid corrections matter, but they are more credible when independent experts explain both what is known and where uncertainty remains.',
            native:
              'तुरंत सुधार महत्त्वपूर्ण हैं, लेकिन वे तब अधिक विश्वसनीय होते हैं जब स्वतंत्र विशेषज्ञ यह भी समझाएँ कि क्या ज्ञात है और अनिश्चितता कहाँ बनी हुई है।',
          },
          {
            en: 'Platforms can reduce algorithmic amplification of demonstrably false claims without appointing themselves the final arbiters of every contested opinion.',
            native:
              'मंच स्पष्ट रूप से झूठे दावों के एल्गोरिदमिक प्रसार को घटा सकते हैं, बिना स्वयं को हर विवादित राय का अंतिम निर्णायक बनाए।',
          },
          {
            en: 'Long-term resilience depends on trustworthy institutions and media literacy, since censorship can leave the underlying demand for conspiratorial narratives untouched.',
            native:
              'दीर्घकालिक दृढ़ता विश्वसनीय संस्थाओं और मीडिया साक्षरता पर निर्भर करती है, क्योंकि सेंसरशिप षड्यंत्रकारी कथाओं की मूल माँग को जस का तस छोड़ सकती है।',
          },
        ],
      },
      es: {
        word: 'desinformación',
        question:
          '¿Cómo deberían las sociedades abiertas combatir la desinformación sin reprimir el desacuerdo legítimo?',
        examples: [
          {
            en: 'Rapid corrections matter, but they are more credible when independent experts explain both what is known and where uncertainty remains.',
            native:
              'Las rectificaciones rápidas importan, pero resultan más creíbles cuando expertos independientes explican tanto lo que se sabe como los aspectos que siguen siendo inciertos.',
          },
          {
            en: 'Platforms can reduce algorithmic amplification of demonstrably false claims without appointing themselves the final arbiters of every contested opinion.',
            native:
              'Las plataformas pueden reducir la amplificación algorítmica de afirmaciones manifiestamente falsas sin erigirse en árbitros finales de toda opinión controvertida.',
          },
          {
            en: 'Long-term resilience depends on trustworthy institutions and media literacy, since censorship can leave the underlying demand for conspiratorial narratives untouched.',
            native:
              'La resiliencia a largo plazo depende de instituciones fiables y de la alfabetización mediática, pues la censura puede dejar intacta la demanda subyacente de relatos conspirativos.',
          },
        ],
      },
      zh: {
        word: '虚假信息',
        question: '开放社会应如何在不压制正当异议的情况下应对虚假信息？',
        examples: [
          {
            en: 'Rapid corrections matter, but they are more credible when independent experts explain both what is known and where uncertainty remains.',
            native: '及时纠错固然重要，但如果独立专家既说明已知事实，也交代仍存在哪些不确定性，纠错会更可信。',
          },
          {
            en: 'Platforms can reduce algorithmic amplification of demonstrably false claims without appointing themselves the final arbiters of every contested opinion.',
            native: '平台可以减少算法对明显虚假主张的放大，而不必把自己任命为一切争议观点的最终裁判。',
          },
          {
            en: 'Long-term resilience depends on trustworthy institutions and media literacy, since censorship can leave the underlying demand for conspiratorial narratives untouched.',
            native: '长期韧性取决于值得信赖的机构与媒体素养，因为审查可能丝毫未触及人们对阴谋叙事的深层需求。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'algorithmic bias',
    questionText: 'Who should be accountable when algorithmic bias produces discriminatory outcomes?',
    translations: {
      te: {
        word: 'అల్గారిథమిక్ పక్షపాతం',
        question: 'అల్గారిథమిక్ పక్షపాతం వివక్షాపూరిత ఫలితాలను కలిగించినప్పుడు ఎవరు బాధ్యత వహించాలి?',
        examples: [
          {
            en: 'Responsibility should extend beyond the programmer to organizations that select training data, define objectives, and deploy systems in consequential settings.',
            native:
              'శిక్షణ డేటాను ఎంచుకునే, లక్ష్యాలను నిర్వచించే మరియు కీలక సందర్భాల్లో వ్యవస్థలను అమలు చేసే సంస్థల వరకు బాధ్యత ప్రోగ్రామర్‌ను దాటి విస్తరించాలి.',
          },
          {
            en: 'Regular independent audits can reveal unequal error rates, but affected people also need a practical right to explanation and appeal.',
            native:
              'క్రమమైన స్వతంత్ర తనిఖీలు అసమాన దోషాల రేట్లను బయటపెట్టగలవు, కానీ ప్రభావితులైన వారికి వివరణ మరియు అప్పీల్‌కు ఆచరణాత్మక హక్కు కూడా అవసరం.',
          },
          {
            en: 'A technically accurate model may still be unjust if it reproduces historical disadvantage or optimizes a poorly chosen social goal.',
            native:
              'సాంకేతికంగా ఖచ్చితమైన నమూనా కూడా చారిత్రక వెనుకబాటుతనాన్ని పునరుత్పత్తి చేస్తే లేదా తప్పుగా ఎంచుకున్న సామాజిక లక్ష్యాన్ని అనుకూలపరిస్తే అన్యాయంగా ఉండవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'एल्गोरिदमिक पक्षपात',
        question: 'जब एल्गोरिदमिक पक्षपात भेदभावपूर्ण परिणाम पैदा करे, तो किसे जवाबदेह ठहराया जाना चाहिए?',
        examples: [
          {
            en: 'Responsibility should extend beyond the programmer to organizations that select training data, define objectives, and deploy systems in consequential settings.',
            native:
              'जिम्मेदारी प्रोग्रामर से आगे उन संगठनों तक जानी चाहिए जो प्रशिक्षण डेटा चुनते हैं, उद्देश्य तय करते हैं और महत्त्वपूर्ण परिस्थितियों में प्रणालियाँ लागू करते हैं।',
          },
          {
            en: 'Regular independent audits can reveal unequal error rates, but affected people also need a practical right to explanation and appeal.',
            native:
              'नियमित स्वतंत्र जाँच असमान त्रुटि दरें उजागर कर सकती है, लेकिन प्रभावित लोगों को स्पष्टीकरण और अपील का व्यावहारिक अधिकार भी चाहिए।',
          },
          {
            en: 'A technically accurate model may still be unjust if it reproduces historical disadvantage or optimizes a poorly chosen social goal.',
            native:
              'तकनीकी रूप से सटीक मॉडल भी अन्यायपूर्ण हो सकता है यदि वह ऐतिहासिक वंचना दोहराता है या गलत चुने गए सामाजिक लक्ष्य को अनुकूलित करता है।',
          },
        ],
      },
      es: {
        word: 'sesgo algorítmico',
        question: '¿Quién debería rendir cuentas cuando el sesgo algorítmico produce resultados discriminatorios?',
        examples: [
          {
            en: 'Responsibility should extend beyond the programmer to organizations that select training data, define objectives, and deploy systems in consequential settings.',
            native:
              'La responsabilidad debería ir más allá del programador y alcanzar a las organizaciones que eligen los datos de entrenamiento, definen objetivos e implantan sistemas en contextos trascendentes.',
          },
          {
            en: 'Regular independent audits can reveal unequal error rates, but affected people also need a practical right to explanation and appeal.',
            native:
              'Las auditorías independientes periódicas pueden revelar tasas de error desiguales, pero las personas afectadas también necesitan un derecho efectivo a recibir explicaciones y recurrir.',
          },
          {
            en: 'A technically accurate model may still be unjust if it reproduces historical disadvantage or optimizes a poorly chosen social goal.',
            native:
              'Un modelo técnicamente preciso puede seguir siendo injusto si reproduce desventajas históricas u optimiza un objetivo social mal elegido.',
          },
        ],
      },
      zh: {
        word: '算法偏见',
        question: '当算法偏见导致歧视性结果时，应由谁承担责任？',
        examples: [
          {
            en: 'Responsibility should extend beyond the programmer to organizations that select training data, define objectives, and deploy systems in consequential settings.',
            native: '责任不应止于程序员，还应延伸到选择训练数据、设定目标并在重大场景中部署系统的组织。',
          },
          {
            en: 'Regular independent audits can reveal unequal error rates, but affected people also need a practical right to explanation and appeal.',
            native: '定期独立审计可以揭示不均等的错误率，但受影响者还需要切实可行的知情与申诉权。',
          },
          {
            en: 'A technically accurate model may still be unjust if it reproduces historical disadvantage or optimizes a poorly chosen social goal.',
            native: '技术上准确的模型若复制历史劣势，或优化一个选择不当的社会目标，仍可能是不公正的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'digital divide',
    questionText: 'How has the digital divide evolved beyond simple access to technology?',
    translations: {
      te: {
        word: 'డిజిటల్ అంతరం',
        question: 'సాంకేతికతకు కేవలం ప్రాప్యత అనే అంశాన్ని దాటి డిజిటల్ అంతరం ఎలా పరిణామం చెందింది?',
        examples: [
          {
            en: 'Owning a device is insufficient when connections are unreliable, interfaces are inaccessible, or users lack the confidence to evaluate online information.',
            native:
              'ఇంటర్నెట్ అనుసంధానం నమ్మదగనిదిగా ఉన్నప్పుడు, అంతర్ముఖాలు అందుబాటులో లేనప్పుడు లేదా ఆన్‌లైన్ సమాచారాన్ని అంచనా వేసే ఆత్మవిశ్వాసం వినియోగదారులకు లేనప్పుడు పరికరం కలిగి ఉండటం మాత్రమే సరిపోదు.',
          },
          {
            en: 'As education, employment, and public services move online, unequal digital capability increasingly translates into unequal citizenship.',
            native:
              'విద్య, ఉపాధి మరియు ప్రజా సేవలు ఆన్‌లైన్‌కు మారుతున్న కొద్దీ, అసమాన డిజిటల్ సామర్థ్యం పౌరసత్వంలో అసమానతగా మరింతగా మారుతోంది.',
          },
          {
            en: 'Effective policy combines affordable infrastructure with accessible design, local-language content, and sustained opportunities to develop critical digital skills.',
            native:
              'సమర్థవంతమైన విధానం చవకైన మౌలిక సదుపాయాలతో పాటు అందుబాటులో ఉండే రూపకల్పన, స్థానిక భాషా విషయం మరియు విమర్శనాత్మక డిజిటల్ నైపుణ్యాలను అభివృద్ధి చేసుకునే నిరంతర అవకాశాలను కలుపుతుంది.',
          },
        ],
      },
      hi: {
        word: 'डिजिटल विभाजन',
        question: 'डिजिटल विभाजन केवल तकनीक तक पहुँच के प्रश्न से आगे किस प्रकार विकसित हुआ है?',
        examples: [
          {
            en: 'Owning a device is insufficient when connections are unreliable, interfaces are inaccessible, or users lack the confidence to evaluate online information.',
            native:
              'सिर्फ उपकरण होना पर्याप्त नहीं है यदि कनेक्शन अविश्वसनीय हों, इंटरफ़ेस सुगम न हों या उपयोगकर्ताओं में ऑनलाइन जानकारी परखने का आत्मविश्वास न हो।',
          },
          {
            en: 'As education, employment, and public services move online, unequal digital capability increasingly translates into unequal citizenship.',
            native:
              'शिक्षा, रोज़गार और सार्वजनिक सेवाओं के ऑनलाइन होने के साथ असमान डिजिटल क्षमता नागरिकता की असमानता में तेजी से बदल रही है।',
          },
          {
            en: 'Effective policy combines affordable infrastructure with accessible design, local-language content, and sustained opportunities to develop critical digital skills.',
            native:
              'प्रभावी नीति किफायती बुनियादी ढाँचे को सुगम डिज़ाइन, स्थानीय भाषाओं की सामग्री और आलोचनात्मक डिजिटल कौशल विकसित करने के निरंतर अवसरों से जोड़ती है।',
          },
        ],
      },
      es: {
        word: 'brecha digital',
        question: '¿Cómo ha evolucionado la brecha digital más allá del simple acceso a la tecnología?',
        examples: [
          {
            en: 'Owning a device is insufficient when connections are unreliable, interfaces are inaccessible, or users lack the confidence to evaluate online information.',
            native:
              'Tener un dispositivo no basta cuando las conexiones son poco fiables, las interfaces no son accesibles o los usuarios carecen de confianza para evaluar información en línea.',
          },
          {
            en: 'As education, employment, and public services move online, unequal digital capability increasingly translates into unequal citizenship.',
            native:
              'A medida que la educación, el empleo y los servicios públicos pasan a internet, la desigual capacidad digital se traduce cada vez más en una ciudadanía desigual.',
          },
          {
            en: 'Effective policy combines affordable infrastructure with accessible design, local-language content, and sustained opportunities to develop critical digital skills.',
            native:
              'Una política eficaz combina infraestructura asequible con diseño accesible, contenidos en idiomas locales y oportunidades continuas para desarrollar competencias digitales críticas.',
          },
        ],
      },
      zh: {
        word: '数字鸿沟',
        question: '数字鸿沟如何演变为一个超越单纯技术接入的问题？',
        examples: [
          {
            en: 'Owning a device is insufficient when connections are unreliable, interfaces are inaccessible, or users lack the confidence to evaluate online information.',
            native: '如果网络连接不可靠、界面缺乏无障碍设计，或用户没有信心判断网上信息，那么拥有设备仍远远不够。',
          },
          {
            en: 'As education, employment, and public services move online, unequal digital capability increasingly translates into unequal citizenship.',
            native: '随着教育、就业和公共服务转移到线上，数字能力的不平等正日益转化为公民参与权的不平等。',
          },
          {
            en: 'Effective policy combines affordable infrastructure with accessible design, local-language content, and sustained opportunities to develop critical digital skills.',
            native: '有效政策应将可负担的基础设施、无障碍设计、本地语言内容以及持续培养批判性数字技能的机会结合起来。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'intellectual property',
    questionText: 'How should intellectual property rules balance creative incentives with public access to knowledge?',
    translations: {
      te: {
        word: 'మేధో సంపత్తి',
        question: 'మేధో సంపత్తి నియమాలు సృజనాత్మక ప్రోత్సాహకాలను జ్ఞానానికి ప్రజా ప్రాప్యతతో ఎలా సమతుల్యం చేయాలి?',
        examples: [
          {
            en: 'Temporary exclusivity can reward costly innovation, yet protection that lasts too long may obstruct research and entrench dominant firms.',
            native:
              'తాత్కాలిక ప్రత్యేక హక్కు ఖరీదైన ఆవిష్కరణకు ప్రతిఫలం ఇవ్వగలదు, అయితే అతిగా సాగే రక్షణ పరిశోధనను అడ్డుకుని ఆధిపత్య సంస్థలను స్థిరపరచవచ్చు.',
          },
          {
            en: 'Exceptions for education, parody, and essential medicines recognize that ideas create value partly through circulation and adaptation.',
            native:
              'విద్య, వ్యంగ్యరచన మరియు అత్యవసర ఔషధాలకు మినహాయింపులు ఇవ్వడం ద్వారా ఆలోచనలు వ్యాప్తి మరియు అనుసరణ ద్వారానే కొంత విలువను సృష్టిస్తాయని గుర్తించబడుతుంది.',
          },
          {
            en: 'Reform should distinguish independent creators from powerful intermediaries that often acquire rights without producing the original work.',
            native:
              'అసలు కృతిని సృష్టించకుండానే తరచూ హక్కులను పొందే శక్తివంతమైన మధ్యవర్తుల నుంచి స్వతంత్ర సృష్టికర్తలను సంస్కరణ వేరు చేయాలి.',
          },
        ],
      },
      hi: {
        word: 'बौद्धिक संपदा',
        question: 'बौद्धिक संपदा के नियम रचनात्मक प्रोत्साहनों और ज्ञान तक सार्वजनिक पहुँच के बीच संतुलन कैसे बनाएँ?',
        examples: [
          {
            en: 'Temporary exclusivity can reward costly innovation, yet protection that lasts too long may obstruct research and entrench dominant firms.',
            native:
              'अस्थायी विशिष्ट अधिकार महँगे नवाचार को पुरस्कृत कर सकते हैं, फिर भी बहुत लंबी सुरक्षा शोध में बाधा डाल सकती है और प्रभावशाली कंपनियों की स्थिति मज़बूत कर सकती है।',
          },
          {
            en: 'Exceptions for education, parody, and essential medicines recognize that ideas create value partly through circulation and adaptation.',
            native:
              'शिक्षा, पैरोडी और आवश्यक दवाओं के लिए अपवाद यह मानते हैं कि विचार प्रसार और अनुकूलन के माध्यम से भी मूल्य पैदा करते हैं।',
          },
          {
            en: 'Reform should distinguish independent creators from powerful intermediaries that often acquire rights without producing the original work.',
            native:
              'सुधार में स्वतंत्र रचनाकारों को उन शक्तिशाली मध्यस्थों से अलग समझना चाहिए जो मूल कृति बनाए बिना अक्सर अधिकार हासिल कर लेते हैं।',
          },
        ],
      },
      es: {
        word: 'propiedad intelectual',
        question:
          '¿Cómo deberían las normas de propiedad intelectual equilibrar los incentivos a la creación y el acceso público al conocimiento?',
        examples: [
          {
            en: 'Temporary exclusivity can reward costly innovation, yet protection that lasts too long may obstruct research and entrench dominant firms.',
            native:
              'La exclusividad temporal puede recompensar una innovación costosa, pero una protección demasiado prolongada puede obstaculizar la investigación y afianzar a empresas dominantes.',
          },
          {
            en: 'Exceptions for education, parody, and essential medicines recognize that ideas create value partly through circulation and adaptation.',
            native:
              'Las excepciones para la educación, la parodia y los medicamentos esenciales reconocen que las ideas crean valor en parte mediante su circulación y adaptación.',
          },
          {
            en: 'Reform should distinguish independent creators from powerful intermediaries that often acquire rights without producing the original work.',
            native:
              'La reforma debería distinguir a los creadores independientes de los intermediarios poderosos que suelen adquirir derechos sin producir la obra original.',
          },
        ],
      },
      zh: {
        word: '知识产权',
        question: '知识产权规则应如何平衡创作激励与公众获取知识的权利？',
        examples: [
          {
            en: 'Temporary exclusivity can reward costly innovation, yet protection that lasts too long may obstruct research and entrench dominant firms.',
            native: '临时专有权可以回报成本高昂的创新，但保护期过长可能阻碍研究，并巩固市场支配企业的地位。',
          },
          {
            en: 'Exceptions for education, parody, and essential medicines recognize that ideas create value partly through circulation and adaptation.',
            native: '为教育、戏仿和基本药物设置例外，承认思想的价值有一部分来自传播与再创造。',
          },
          {
            en: 'Reform should distinguish independent creators from powerful intermediaries that often acquire rights without producing the original work.',
            native: '改革应区分独立创作者与强势中介机构，后者往往并未创作原作却获得了相关权利。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'scientific literacy',
    questionText: 'What does scientific literacy require beyond remembering scientific facts?',
    translations: {
      te: {
        word: 'శాస్త్రీయ అవగాహన',
        question: 'శాస్త్రీయ వాస్తవాలను గుర్తుంచుకోవడాన్ని దాటి శాస్త్రీయ అవగాహనకు ఇంకేమి అవసరం?',
        examples: [
          {
            en: "A scientifically literate person can interpret probability, question a study's design, and distinguish correlation from a plausible causal claim.",
            native:
              'శాస్త్రీయ అవగాహన ఉన్న వ్యక్తి సంభావ్యతను అర్థం చేసుకోగలడు, అధ్యయన రూపకల్పనను ప్రశ్నించగలడు మరియు సహసంబంధాన్ని సమంజసమైన కారణ వాదన నుంచి వేరు చేయగలడు.',
          },
          {
            en: 'Literacy also involves accepting provisional conclusions while remaining willing to revise them when stronger evidence emerges.',
            native:
              'బలమైన ఆధారం వెలుగులోకి వచ్చినప్పుడు తాత్కాలిక నిర్ధారణలను సవరించడానికి సిద్ధంగా ఉంటూనే వాటిని అంగీకరించడం కూడా ఈ అవగాహనలో భాగం.',
          },
          {
            en: 'Schools should teach how scientific institutions correct errors, because disagreement among researchers is often a feature of inquiry rather than proof of failure.',
            native:
              'పరిశోధకుల మధ్య విభేదం తరచూ వైఫల్యానికి రుజువు కాకుండా అన్వేషణలో భాగం కాబట్టి, శాస్త్రీయ సంస్థలు తప్పులను ఎలా సరిదిద్దుతాయో పాఠశాలలు బోధించాలి.',
          },
        ],
      },
      hi: {
        word: 'वैज्ञानिक साक्षरता',
        question: 'वैज्ञानिक तथ्यों को याद रखने से आगे वैज्ञानिक साक्षरता के लिए क्या आवश्यक है?',
        examples: [
          {
            en: "A scientifically literate person can interpret probability, question a study's design, and distinguish correlation from a plausible causal claim.",
            native:
              'वैज्ञानिक रूप से साक्षर व्यक्ति प्रायिकता समझ सकता है, अध्ययन की रूपरेखा पर सवाल उठा सकता है और सहसंबंध को संभाव्य कारणात्मक दावे से अलग कर सकता है।',
          },
          {
            en: 'Literacy also involves accepting provisional conclusions while remaining willing to revise them when stronger evidence emerges.',
            native:
              'साक्षरता में अस्थायी निष्कर्षों को स्वीकार करना और अधिक मज़बूत प्रमाण मिलने पर उन्हें संशोधित करने को तैयार रहना भी शामिल है।',
          },
          {
            en: 'Schools should teach how scientific institutions correct errors, because disagreement among researchers is often a feature of inquiry rather than proof of failure.',
            native:
              'विद्यालयों को सिखाना चाहिए कि वैज्ञानिक संस्थाएँ त्रुटियाँ कैसे सुधारती हैं, क्योंकि शोधकर्ताओं की असहमति अक्सर विफलता का प्रमाण नहीं बल्कि जाँच की विशेषता होती है।',
          },
        ],
      },
      es: {
        word: 'alfabetización científica',
        question: '¿Qué exige la alfabetización científica además de recordar hechos científicos?',
        examples: [
          {
            en: "A scientifically literate person can interpret probability, question a study's design, and distinguish correlation from a plausible causal claim.",
            native:
              'Una persona con alfabetización científica puede interpretar probabilidades, cuestionar el diseño de un estudio y distinguir la correlación de una afirmación causal verosímil.',
          },
          {
            en: 'Literacy also involves accepting provisional conclusions while remaining willing to revise them when stronger evidence emerges.',
            native:
              'La alfabetización también implica aceptar conclusiones provisionales y mantener la disposición a revisarlas cuando surjan pruebas más sólidas.',
          },
          {
            en: 'Schools should teach how scientific institutions correct errors, because disagreement among researchers is often a feature of inquiry rather than proof of failure.',
            native:
              'Las escuelas deberían enseñar cómo corrigen errores las instituciones científicas, porque el desacuerdo entre investigadores suele ser propio de la indagación y no una prueba de fracaso.',
          },
        ],
      },
      zh: {
        word: '科学素养',
        question: '除了记住科学事实，科学素养还要求什么？',
        examples: [
          {
            en: "A scientifically literate person can interpret probability, question a study's design, and distinguish correlation from a plausible causal claim.",
            native: '具备科学素养的人能够理解概率、质疑研究设计，并区分相关性与看似合理的因果主张。',
          },
          {
            en: 'Literacy also involves accepting provisional conclusions while remaining willing to revise them when stronger evidence emerges.',
            native: '科学素养还包括接受暂时性结论，同时愿意在更有力的证据出现时修正结论。',
          },
          {
            en: 'Schools should teach how scientific institutions correct errors, because disagreement among researchers is often a feature of inquiry rather than proof of failure.',
            native: '学校应教授科学机构如何纠错，因为研究者之间的分歧往往是探究过程的特征，而不是科学失败的证据。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'public trust',
    questionText: 'How can public institutions rebuild trust after a serious failure?',
    translations: {
      te: {
        word: 'ప్రజా విశ్వాసం',
        question: 'తీవ్రమైన వైఫల్యం తర్వాత ప్రజా సంస్థలు విశ్వాసాన్ని ఎలా పునర్నిర్మించగలవు?',
        examples: [
          {
            en: "A credible apology acknowledges specific harm and responsibility instead of using vague language that protects the institution's image.",
            native:
              'విశ్వసనీయమైన క్షమాపణ సంస్థ ప్రతిష్ఠను కాపాడే అస్పష్టమైన భాషను ఉపయోగించకుండా, నిర్దిష్టమైన హానిని మరియు బాధ్యతను అంగీకరిస్తుంది.',
          },
          {
            en: 'Independent investigation matters only if its findings are published and followed by visible changes to personnel, incentives, or procedures.',
            native:
              'స్వతంత్ర దర్యాప్తు ఫలితాలు ప్రచురించబడి, సిబ్బంది, ప్రోత్సాహకాలు లేదా విధానాల్లో స్పష్టమైన మార్పులు వచ్చినప్పుడే దానికి ప్రాముఖ్యత ఉంటుంది.',
          },
          {
            en: 'Trust returns gradually when institutions make modest promises, report measurable progress, and tolerate scrutiny from those they previously disappointed.',
            native:
              'సంస్థలు పరిమితమైన హామీలు ఇచ్చి, కొలవగల పురోగతిని నివేదించి, గతంలో నిరాశపరిచిన వారి పరిశీలనను సహించినప్పుడు విశ్వాసం క్రమంగా తిరిగి వస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'जन विश्वास',
        question: 'गंभीर विफलता के बाद सार्वजनिक संस्थाएँ विश्वास कैसे फिर से बना सकती हैं?',
        examples: [
          {
            en: "A credible apology acknowledges specific harm and responsibility instead of using vague language that protects the institution's image.",
            native:
              'विश्वसनीय क्षमा-याचना संस्था की छवि बचाने वाली अस्पष्ट भाषा के बजाय हुए विशिष्ट नुकसान और जिम्मेदारी को स्वीकार करती है।',
          },
          {
            en: 'Independent investigation matters only if its findings are published and followed by visible changes to personnel, incentives, or procedures.',
            native:
              'स्वतंत्र जाँच तभी सार्थक है जब उसके निष्कर्ष प्रकाशित हों और उनके बाद कर्मचारियों, प्रोत्साहनों या प्रक्रियाओं में स्पष्ट बदलाव दिखाई दें।',
          },
          {
            en: 'Trust returns gradually when institutions make modest promises, report measurable progress, and tolerate scrutiny from those they previously disappointed.',
            native:
              'विश्वास धीरे-धीरे लौटता है जब संस्थाएँ सीमित वादे करती हैं, मापने योग्य प्रगति बताती हैं और उन लोगों की जाँच सहती हैं जिन्हें उन्होंने पहले निराश किया था।',
          },
        ],
      },
      es: {
        word: 'confianza pública',
        question: '¿Cómo pueden las instituciones públicas recuperar la confianza después de un fallo grave?',
        examples: [
          {
            en: "A credible apology acknowledges specific harm and responsibility instead of using vague language that protects the institution's image.",
            native:
              'Una disculpa creíble reconoce el daño concreto y la responsabilidad, en lugar de emplear un lenguaje vago que proteja la imagen de la institución.',
          },
          {
            en: 'Independent investigation matters only if its findings are published and followed by visible changes to personnel, incentives, or procedures.',
            native:
              'Una investigación independiente solo importa si se publican sus conclusiones y estas se traducen en cambios visibles de personal, incentivos o procedimientos.',
          },
          {
            en: 'Trust returns gradually when institutions make modest promises, report measurable progress, and tolerate scrutiny from those they previously disappointed.',
            native:
              'La confianza regresa gradualmente cuando las instituciones hacen promesas modestas, informan de avances medibles y aceptan el escrutinio de quienes decepcionaron.',
          },
        ],
      },
      zh: {
        word: '公众信任',
        question: '公共机构在发生严重失误后应如何重建信任？',
        examples: [
          {
            en: "A credible apology acknowledges specific harm and responsibility instead of using vague language that protects the institution's image.",
            native: '可信的道歉会承认具体伤害与责任，而不是用模糊措辞维护机构形象。',
          },
          {
            en: 'Independent investigation matters only if its findings are published and followed by visible changes to personnel, incentives, or procedures.',
            native: '独立调查只有在结果公布，并推动人员、激励机制或程序发生可见变化时才有意义。',
          },
          {
            en: 'Trust returns gradually when institutions make modest promises, report measurable progress, and tolerate scrutiny from those they previously disappointed.',
            native: '当机构作出审慎承诺、报告可衡量的进展，并接受曾被其辜负者的监督时，信任才会逐渐恢复。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'civil disobedience',
    questionText: 'When, if ever, is civil disobedience justified in a constitutional democracy?',
    translations: {
      te: {
        word: 'పౌర అవిధేయత',
        question: 'రాజ్యాంగ ప్రజాస్వామ్యంలో పౌర అవిధేయత ఎప్పుడు, అసలు ఎప్పుడైనా, సమర్థనీయమవుతుంది?',
        examples: [
          {
            en: 'Breaking a law may be defensible when the injustice is grave, ordinary remedies have failed, and the action remains proportionate to its aim.',
            native:
              'అన్యాయం తీవ్రమై, సాధారణ పరిష్కారాలు విఫలమై, చర్య తన లక్ష్యానికి అనుపాతంగా ఉన్నప్పుడు చట్టాన్ని ఉల్లంఘించడం సమర్థనీయమవచ్చు.',
          },
          {
            en: 'Nonviolence and a willingness to accept legal consequences can demonstrate respect for the broader constitutional order while contesting a particular rule.',
            native:
              'అహింస మరియు చట్టపరమైన పరిణామాలను స్వీకరించే సిద్ధత ఒక నిర్దిష్ట నియమాన్ని వ్యతిరేకిస్తూనే విస్తృత రాజ్యాంగ వ్యవస్థకు గౌరవాన్ని చూపగలవు.',
          },
          {
            en: 'However, romanticizing disobedience ignores the possibility that rival groups will invoke the same principle for profoundly anti-democratic causes.',
            native:
              'అయితే, అవిధేయతను ఆదర్శీకరించడం ద్వారా ప్రత్యర్థి వర్గాలు అదే సూత్రాన్ని తీవ్ర ప్రజాస్వామ్య వ్యతిరేక లక్ష్యాలకు ఉపయోగించే అవకాశాన్ని విస్మరిస్తాం.',
          },
        ],
      },
      hi: {
        word: 'सविनय अवज्ञा',
        question: 'संवैधानिक लोकतंत्र में सविनय अवज्ञा कब, यदि कभी, उचित है?',
        examples: [
          {
            en: 'Breaking a law may be defensible when the injustice is grave, ordinary remedies have failed, and the action remains proportionate to its aim.',
            native:
              'कानून तोड़ना तब उचित ठहराया जा सकता है जब अन्याय गंभीर हो, सामान्य उपाय विफल हो चुके हों और कार्रवाई अपने उद्देश्य के अनुपात में हो।',
          },
          {
            en: 'Nonviolence and a willingness to accept legal consequences can demonstrate respect for the broader constitutional order while contesting a particular rule.',
            native:
              'अहिंसा और कानूनी परिणाम स्वीकार करने की तत्परता किसी विशेष नियम का विरोध करते हुए व्यापक संवैधानिक व्यवस्था के प्रति सम्मान दिखा सकती है।',
          },
          {
            en: 'However, romanticizing disobedience ignores the possibility that rival groups will invoke the same principle for profoundly anti-democratic causes.',
            native:
              'हालाँकि, अवज्ञा का महिमामंडन इस संभावना को अनदेखा करता है कि प्रतिद्वंद्वी समूह उसी सिद्धांत का इस्तेमाल घोर अलोकतांत्रिक उद्देश्यों के लिए करेंगे।',
          },
        ],
      },
      es: {
        word: 'desobediencia civil',
        question: '¿Cuándo, si acaso, está justificada la desobediencia civil en una democracia constitucional?',
        examples: [
          {
            en: 'Breaking a law may be defensible when the injustice is grave, ordinary remedies have failed, and the action remains proportionate to its aim.',
            native:
              'Incumplir una ley puede ser defendible cuando la injusticia es grave, las vías ordinarias han fracasado y la acción sigue siendo proporcional a su objetivo.',
          },
          {
            en: 'Nonviolence and a willingness to accept legal consequences can demonstrate respect for the broader constitutional order while contesting a particular rule.',
            native:
              'La no violencia y la disposición a aceptar consecuencias legales pueden demostrar respeto por el orden constitucional general mientras se impugna una norma concreta.',
          },
          {
            en: 'However, romanticizing disobedience ignores the possibility that rival groups will invoke the same principle for profoundly anti-democratic causes.',
            native:
              'Sin embargo, idealizar la desobediencia ignora la posibilidad de que grupos rivales invoquen el mismo principio para causas profundamente antidemocráticas.',
          },
        ],
      },
      zh: {
        word: '公民不服从',
        question: '在宪政民主中，公民不服从在何种情况下才具有正当性？',
        examples: [
          {
            en: 'Breaking a law may be defensible when the injustice is grave, ordinary remedies have failed, and the action remains proportionate to its aim.',
            native: '当不公极其严重、常规救济已经失效，且行动与其目标相称时，违法或许可以得到辩护。',
          },
          {
            en: 'Nonviolence and a willingness to accept legal consequences can demonstrate respect for the broader constitutional order while contesting a particular rule.',
            native: '坚持非暴力并愿意承担法律后果，可以在反对某项具体规则的同时，表明对整体宪政秩序的尊重。',
          },
          {
            en: 'However, romanticizing disobedience ignores the possibility that rival groups will invoke the same principle for profoundly anti-democratic causes.',
            native: '然而，把不服从浪漫化，会忽视敌对团体可能以同一原则为极端反民主事业辩护的风险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'restorative justice',
    questionText: 'What can restorative justice achieve that conventional punishment often cannot?',
    translations: {
      te: {
        word: 'పునరుద్ధరణాత్మక న్యాయం',
        question: 'సాంప్రదాయిక శిక్ష తరచూ సాధించలేనిదాన్ని పునరుద్ధరణాత్మక న్యాయం ఏమి సాధించగలదు?',
        examples: [
          {
            en: 'A carefully facilitated process can give victims answers and recognition while requiring offenders to confront the human consequences of their actions.',
            native:
              'జాగ్రత్తగా నిర్వహించిన ప్రక్రియ బాధితులకు సమాధానాలు మరియు గుర్తింపును అందిస్తూ, నేరం చేసినవారు తమ చర్యల మానవీయ పరిణామాలను ఎదుర్కొనేలా చేయగలదు.',
          },
          {
            en: 'Repair may include apology, restitution, and community service, but participation must be voluntary and never pressure victims into premature forgiveness.',
            native:
              'పరిహారంలో క్షమాపణ, నష్టపరిహారం మరియు సమాజ సేవ ఉండవచ్చు, కానీ పాల్గొనడం స్వచ్ఛందంగా ఉండాలి మరియు బాధితులను తొందరపాటి క్షమాపణకు ఎన్నడూ ఒత్తిడి చేయకూడదు.',
          },
          {
            en: 'Restorative approaches complement rather than replace formal justice when public safety, power imbalances, or serious coercion make direct dialogue unsafe.',
            native:
              'ప్రజా భద్రత, అధికార అసమానతలు లేదా తీవ్రమైన బలవంతం ప్రత్యక్ష సంభాషణను అసురక్షితంగా చేసినప్పుడు, పునరుద్ధరణాత్మక విధానాలు అధికారిక న్యాయాన్ని భర్తీ చేయకుండా దానికి తోడ్పడతాయి.',
          },
        ],
      },
      hi: {
        word: 'पुनर्स्थापनात्मक न्याय',
        question: 'पुनर्स्थापनात्मक न्याय ऐसा क्या हासिल कर सकता है जो पारंपरिक दंड अक्सर नहीं कर पाता?',
        examples: [
          {
            en: 'A carefully facilitated process can give victims answers and recognition while requiring offenders to confront the human consequences of their actions.',
            native:
              'सावधानी से संचालित प्रक्रिया पीड़ितों को उत्तर और मान्यता दे सकती है, साथ ही अपराधियों को अपने कृत्यों के मानवीय परिणामों का सामना करने के लिए बाध्य कर सकती है।',
          },
          {
            en: 'Repair may include apology, restitution, and community service, but participation must be voluntary and never pressure victims into premature forgiveness.',
            native:
              'क्षतिपूर्ति में क्षमा-याचना, नुकसान की भरपाई और सामुदायिक सेवा शामिल हो सकती है, लेकिन भागीदारी स्वैच्छिक होनी चाहिए और पीड़ितों पर समय से पहले क्षमा करने का दबाव कभी नहीं पड़ना चाहिए।',
          },
          {
            en: 'Restorative approaches complement rather than replace formal justice when public safety, power imbalances, or serious coercion make direct dialogue unsafe.',
            native:
              'जब सार्वजनिक सुरक्षा, शक्ति-असंतुलन या गंभीर दबाव सीधे संवाद को असुरक्षित बनाते हैं, तब पुनर्स्थापनात्मक उपाय औपचारिक न्याय का स्थान लेने के बजाय उसके पूरक होते हैं।',
          },
        ],
      },
      es: {
        word: 'justicia restaurativa',
        question: '¿Qué puede lograr la justicia restaurativa que el castigo convencional a menudo no consigue?',
        examples: [
          {
            en: 'A carefully facilitated process can give victims answers and recognition while requiring offenders to confront the human consequences of their actions.',
            native:
              'Un proceso cuidadosamente facilitado puede ofrecer respuestas y reconocimiento a las víctimas, a la vez que exige a los responsables afrontar las consecuencias humanas de sus actos.',
          },
          {
            en: 'Repair may include apology, restitution, and community service, but participation must be voluntary and never pressure victims into premature forgiveness.',
            native:
              'La reparación puede incluir disculpas, restitución y servicio comunitario, pero la participación debe ser voluntaria y nunca presionar a las víctimas para que perdonen prematuramente.',
          },
          {
            en: 'Restorative approaches complement rather than replace formal justice when public safety, power imbalances, or serious coercion make direct dialogue unsafe.',
            native:
              'Los enfoques restaurativos complementan, en lugar de sustituir, a la justicia formal cuando la seguridad pública, los desequilibrios de poder o la coacción grave hacen inseguro el diálogo directo.',
          },
        ],
      },
      zh: {
        word: '修复性司法',
        question: '修复性司法能够做到哪些传统惩罚往往做不到的事情？',
        examples: [
          {
            en: 'A carefully facilitated process can give victims answers and recognition while requiring offenders to confront the human consequences of their actions.',
            native: '精心引导的程序可以让受害者获得答案与认可，同时要求加害者直面其行为给他人造成的后果。',
          },
          {
            en: 'Repair may include apology, restitution, and community service, but participation must be voluntary and never pressure victims into premature forgiveness.',
            native: '修复可以包括道歉、赔偿与社区服务，但参与必须出于自愿，绝不能迫使受害者过早原谅。',
          },
          {
            en: 'Restorative approaches complement rather than replace formal justice when public safety, power imbalances, or serious coercion make direct dialogue unsafe.',
            native: '当公共安全、权力失衡或严重胁迫使直接对话变得不安全时，修复性方式应补充而非取代正式司法。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'intergenerational equity',
    questionText: 'What obligations do present generations owe to people who will live in the distant future?',
    translations: {
      te: {
        word: 'తరాల మధ్య న్యాయం',
        question: 'సుదూర భవిష్యత్తులో జీవించే ప్రజల పట్ల ప్రస్తుత తరాలకు ఏ బాధ్యతలు ఉన్నాయి?',
        examples: [
          {
            en: "Future people cannot vote in today's elections, yet they will inherit the climate, debt, infrastructure, and institutions that current voters shape.",
            native:
              'భవిష్యత్ ప్రజలు నేటి ఎన్నికల్లో ఓటు వేయలేరు, అయినప్పటికీ ప్రస్తుత ఓటర్లు రూపుదిద్దే వాతావరణం, అప్పు, మౌలిక సదుపాయాలు మరియు సంస్థలను వారే వారసత్వంగా పొందుతారు.',
          },
          {
            en: 'Intergenerational fairness does not demand preserving everything unchanged; it demands leaving comparable opportunities and avoiding irreversible, foreseeable harm.',
            native:
              'తరాల మధ్య న్యాయం ప్రతిదానినీ మార్పు లేకుండా కాపాడాలని కోరదు; సమానమైన అవకాశాలను మిగల్చాలని మరియు తిరుగులేని, ముందే ఊహించగల హానిని నివారించాలని కోరుతుంది.',
          },
          {
            en: 'Independent future-generations commissioners could scrutinize long-term policy, although elected representatives must remain publicly accountable for final choices.',
            native:
              'స్వతంత్ర భవిష్యత్ తరాల కమిషనర్లు దీర్ఘకాలిక విధానాన్ని పరిశీలించగలరు, అయితే తుది ఎంపికలకు ఎన్నికైన ప్రతినిధులే ప్రజలకు జవాబుదారీగా ఉండాలి.',
          },
        ],
      },
      hi: {
        word: 'अंतरपीढ़ीगत न्याय',
        question: 'वर्तमान पीढ़ियों का दूर भविष्य में रहने वाले लोगों के प्रति क्या दायित्व है?',
        examples: [
          {
            en: "Future people cannot vote in today's elections, yet they will inherit the climate, debt, infrastructure, and institutions that current voters shape.",
            native:
              'भविष्य के लोग आज के चुनावों में मतदान नहीं कर सकते, फिर भी उन्हें वही जलवायु, ऋण, बुनियादी ढाँचा और संस्थाएँ विरासत में मिलेंगी जिन्हें वर्तमान मतदाता आकार देते हैं।',
          },
          {
            en: 'Intergenerational fairness does not demand preserving everything unchanged; it demands leaving comparable opportunities and avoiding irreversible, foreseeable harm.',
            native:
              'अंतरपीढ़ीगत न्याय हर चीज़ को अपरिवर्तित बचाए रखने की माँग नहीं करता; वह तुलनीय अवसर छोड़ने और अपरिवर्तनीय, पूर्वानुमेय नुकसान से बचने की माँग करता है।',
          },
          {
            en: 'Independent future-generations commissioners could scrutinize long-term policy, although elected representatives must remain publicly accountable for final choices.',
            native:
              'स्वतंत्र भावी-पीढ़ी आयुक्त दीर्घकालिक नीति की समीक्षा कर सकते हैं, हालांकि अंतिम निर्णयों के लिए निर्वाचित प्रतिनिधियों को जनता के प्रति जवाबदेह रहना चाहिए।',
          },
        ],
      },
      es: {
        word: 'equidad intergeneracional',
        question:
          '¿Qué obligaciones tienen las generaciones presentes con las personas que vivirán en un futuro lejano?',
        examples: [
          {
            en: "Future people cannot vote in today's elections, yet they will inherit the climate, debt, infrastructure, and institutions that current voters shape.",
            native:
              'Las personas del futuro no pueden votar en las elecciones actuales, pero heredarán el clima, la deuda, las infraestructuras y las instituciones que modelan los votantes de hoy.',
          },
          {
            en: 'Intergenerational fairness does not demand preserving everything unchanged; it demands leaving comparable opportunities and avoiding irreversible, foreseeable harm.',
            native:
              'La equidad intergeneracional no exige conservarlo todo sin cambios; exige dejar oportunidades comparables y evitar daños irreversibles y previsibles.',
          },
          {
            en: 'Independent future-generations commissioners could scrutinize long-term policy, although elected representatives must remain publicly accountable for final choices.',
            native:
              'Comisionados independientes para las generaciones futuras podrían examinar las políticas a largo plazo, aunque los representantes electos deben seguir respondiendo públicamente por las decisiones finales.',
          },
        ],
      },
      zh: {
        word: '代际公平',
        question: '当代人对生活在遥远未来的人负有哪些义务？',
        examples: [
          {
            en: "Future people cannot vote in today's elections, yet they will inherit the climate, debt, infrastructure, and institutions that current voters shape.",
            native: '未来的人无法在今天的选举中投票，却会继承当代选民所塑造的气候、债务、基础设施与制度。',
          },
          {
            en: 'Intergenerational fairness does not demand preserving everything unchanged; it demands leaving comparable opportunities and avoiding irreversible, foreseeable harm.',
            native: '代际公平并非要求一切维持原样，而是要求为后人留下相当的机会，并避免不可逆且可预见的伤害。',
          },
          {
            en: 'Independent future-generations commissioners could scrutinize long-term policy, although elected representatives must remain publicly accountable for final choices.',
            native: '独立的未来世代专员可以审查长期政策，但民选代表仍须为最终选择向公众负责。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'social cohesion',
    questionText: 'How can diverse societies strengthen social cohesion without demanding conformity?',
    translations: {
      te: {
        word: 'సామాజిక ఐక్యత',
        question: 'ఏకరూపతను కోరుకోకుండా వైవిధ్యభరిత సమాజాలు సామాజిక ఐక్యతను ఎలా బలోపేతం చేయగలవు?',
        examples: [
          {
            en: 'Cohesion grows from fair institutions and shared civic experiences, not from requiring everyone to adopt the same customs or identity.',
            native:
              'అందరూ ఒకే ఆచారాలు లేదా గుర్తింపును స్వీకరించాలని కోరడం వల్ల కాకుండా, న్యాయమైన సంస్థలు మరియు ఉమ్మడి పౌర అనుభవాల వల్ల ఐక్యత పెరుగుతుంది.',
          },
          {
            en: 'Mixed schools, public spaces, and voluntary associations create routine contact through which unfamiliar groups can become neighbors and collaborators.',
            native:
              'మిశ్రమ పాఠశాలలు, బహిరంగ ప్రదేశాలు మరియు స్వచ్ఛంద సంఘాలు సాధారణ పరిచయాన్ని కల్పిస్తాయి; దాని ద్వారా అపరిచిత వర్గాలు పొరుగువారిగా, సహకారులుగా మారగలవు.',
          },
          {
            en: 'A compelling common story should acknowledge past exclusions and allow citizens to belong without erasing their multiple loyalties.',
            native:
              'అర్థవంతమైన ఉమ్మడి కథనం గత బహిష్కరణలను గుర్తించి, పౌరుల అనేక విధేయతలను చెరపకుండా వారికి చెందిన భావనను కల్పించాలి.',
          },
        ],
      },
      hi: {
        word: 'सामाजिक एकजुटता',
        question: 'विविध समाज एकरूपता की माँग किए बिना सामाजिक एकजुटता कैसे मज़बूत कर सकते हैं?',
        examples: [
          {
            en: 'Cohesion grows from fair institutions and shared civic experiences, not from requiring everyone to adopt the same customs or identity.',
            native:
              'एकजुटता निष्पक्ष संस्थाओं और साझा नागरिक अनुभवों से बढ़ती है, न कि सभी से एक जैसे रीति-रिवाज या पहचान अपनाने की माँग करने से।',
          },
          {
            en: 'Mixed schools, public spaces, and voluntary associations create routine contact through which unfamiliar groups can become neighbors and collaborators.',
            native:
              'मिश्रित विद्यालय, सार्वजनिक स्थान और स्वैच्छिक संगठन नियमित संपर्क बनाते हैं, जिसके माध्यम से अपरिचित समूह पड़ोसी और सहयोगी बन सकते हैं।',
          },
          {
            en: 'A compelling common story should acknowledge past exclusions and allow citizens to belong without erasing their multiple loyalties.',
            native:
              'एक प्रभावशाली साझा कथा को पिछले बहिष्कार स्वीकार करने चाहिए और नागरिकों की अनेक निष्ठाएँ मिटाए बिना उन्हें अपनापन महसूस करने देना चाहिए।',
          },
        ],
      },
      es: {
        word: 'cohesión social',
        question: '¿Cómo pueden las sociedades diversas reforzar la cohesión social sin exigir conformidad?',
        examples: [
          {
            en: 'Cohesion grows from fair institutions and shared civic experiences, not from requiring everyone to adopt the same customs or identity.',
            native:
              'La cohesión nace de instituciones justas y experiencias cívicas compartidas, no de exigir que todos adopten las mismas costumbres o identidad.',
          },
          {
            en: 'Mixed schools, public spaces, and voluntary associations create routine contact through which unfamiliar groups can become neighbors and collaborators.',
            native:
              'Las escuelas mixtas, los espacios públicos y las asociaciones voluntarias generan un contacto habitual mediante el cual grupos desconocidos pueden convertirse en vecinos y colaboradores.',
          },
          {
            en: 'A compelling common story should acknowledge past exclusions and allow citizens to belong without erasing their multiple loyalties.',
            native:
              'Un relato común convincente debería reconocer exclusiones pasadas y permitir que los ciudadanos pertenezcan sin borrar sus múltiples lealtades.',
          },
        ],
      },
      zh: {
        word: '社会凝聚力',
        question: '多元社会如何在不要求人人趋同的情况下增强社会凝聚力？',
        examples: [
          {
            en: 'Cohesion grows from fair institutions and shared civic experiences, not from requiring everyone to adopt the same customs or identity.',
            native: '凝聚力源于公平的制度和共同的公民经历，而不是要求所有人接受相同的习俗或身份。',
          },
          {
            en: 'Mixed schools, public spaces, and voluntary associations create routine contact through which unfamiliar groups can become neighbors and collaborators.',
            native: '混合生源的学校、公共空间与志愿社团创造日常接触，使陌生群体能够成为邻居与合作者。',
          },
          {
            en: 'A compelling common story should acknowledge past exclusions and allow citizens to belong without erasing their multiple loyalties.',
            native: '有感召力的共同叙事应承认过去的排斥，并让公民在不抹去多重归属的前提下拥有共同体认同。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'cultural appropriation',
    questionText: 'How can we distinguish cultural appropriation from respectful cultural exchange?',
    translations: {
      te: {
        word: 'సాంస్కృతిక స్వాధీనీకరణ',
        question: 'సాంస్కృతిక స్వాధీనీకరణను గౌరవప్రదమైన సాంస్కృతిక మార్పిడి నుంచి ఎలా వేరు చేయగలం?',
        examples: [
          {
            en: 'Borrowing becomes exploitative when powerful outsiders profit from a tradition while its originating community remains stereotyped, excluded, or uncompensated.',
            native:
              'ఒక సంప్రదాయం నుంచి శక్తివంతమైన బయటి వ్యక్తులు లాభపడుతూ, దాని మూల సమాజం మూస ధోరణులకు, బహిష్కరణకు లేదా పరిహారం లేకపోవడానికి గురైనప్పుడు ఆ స్వీకరణ దోపిడీగా మారుతుంది.',
          },
          {
            en: 'Context matters: sacred symbols, everyday foods, and collaborative art carry different histories and therefore warrant different ethical judgments.',
            native:
              'సందర్భం ముఖ్యం: పవిత్ర చిహ్నాలు, రోజువారీ ఆహారాలు మరియు సహకార కళలకు వేర్వేరు చరిత్రలు ఉంటాయి, అందువల్ల వాటికి వేర్వేరు నైతిక నిర్ణయాలు అవసరం.',
          },
          {
            en: 'Respectful exchange involves attribution, informed consent where possible, and genuine relationships that let source communities influence how their culture is represented.',
            native:
              'గౌరవప్రదమైన మార్పిడిలో మూలాన్ని గుర్తించడం, సాధ్యమైన చోట సమాచారంతో కూడిన సమ్మతి, మరియు తమ సంస్కృతిని ఎలా చూపాలో మూల సమాజాలు ప్రభావితం చేయగల నిజమైన సంబంధాలు ఉంటాయి.',
          },
        ],
      },
      hi: {
        word: 'सांस्कृतिक विनियोग',
        question: 'हम सांस्कृतिक विनियोग को सम्मानपूर्ण सांस्कृतिक आदान-प्रदान से कैसे अलग कर सकते हैं?',
        examples: [
          {
            en: 'Borrowing becomes exploitative when powerful outsiders profit from a tradition while its originating community remains stereotyped, excluded, or uncompensated.',
            native:
              'किसी परंपरा को अपनाना तब शोषणकारी बन जाता है जब शक्तिशाली बाहरी लोग उससे लाभ कमाएँ, जबकि उसका मूल समुदाय रूढ़ धारणाओं, बहिष्कार या बिना मुआवज़े के रह जाए।',
          },
          {
            en: 'Context matters: sacred symbols, everyday foods, and collaborative art carry different histories and therefore warrant different ethical judgments.',
            native:
              'संदर्भ महत्त्वपूर्ण है: पवित्र प्रतीकों, रोज़मर्रा के भोजन और सहयोगी कला के इतिहास अलग होते हैं, इसलिए उनके नैतिक आकलन भी अलग होने चाहिए।',
          },
          {
            en: 'Respectful exchange involves attribution, informed consent where possible, and genuine relationships that let source communities influence how their culture is represented.',
            native:
              'सम्मानपूर्ण आदान-प्रदान में श्रेय, जहाँ संभव हो सूचित सहमति, और ऐसे वास्तविक संबंध शामिल हैं जिनसे मूल समुदाय अपनी संस्कृति के चित्रण को प्रभावित कर सकें।',
          },
        ],
      },
      es: {
        word: 'apropiación cultural',
        question: '¿Cómo podemos distinguir la apropiación cultural de un intercambio cultural respetuoso?',
        examples: [
          {
            en: 'Borrowing becomes exploitative when powerful outsiders profit from a tradition while its originating community remains stereotyped, excluded, or uncompensated.',
            native:
              'La adopción se vuelve explotadora cuando personas externas con poder se lucran con una tradición mientras su comunidad de origen sigue estereotipada, excluida o sin compensación.',
          },
          {
            en: 'Context matters: sacred symbols, everyday foods, and collaborative art carry different histories and therefore warrant different ethical judgments.',
            native:
              'El contexto importa: los símbolos sagrados, la comida cotidiana y el arte colaborativo tienen historias distintas y, por tanto, merecen juicios éticos diferentes.',
          },
          {
            en: 'Respectful exchange involves attribution, informed consent where possible, and genuine relationships that let source communities influence how their culture is represented.',
            native:
              'El intercambio respetuoso implica atribución, consentimiento informado cuando sea posible y relaciones genuinas que permitan a las comunidades de origen influir en cómo se representa su cultura.',
          },
        ],
      },
      zh: {
        word: '文化挪用',
        question: '我们应如何区分文化挪用与相互尊重的文化交流？',
        examples: [
          {
            en: 'Borrowing becomes exploitative when powerful outsiders profit from a tradition while its originating community remains stereotyped, excluded, or uncompensated.',
            native:
              '当强势的外来者从某项传统中获利，而其源生群体仍遭受刻板印象、排斥或得不到补偿时，这种借用便成为剥削。',
          },
          {
            en: 'Context matters: sacred symbols, everyday foods, and collaborative art carry different histories and therefore warrant different ethical judgments.',
            native: '语境至关重要：神圣符号、日常食物与合作艺术各有不同历史，因此应接受不同的伦理判断。',
          },
          {
            en: 'Respectful exchange involves attribution, informed consent where possible, and genuine relationships that let source communities influence how their culture is represented.',
            native:
              '尊重的交流包括注明来源、尽可能取得知情同意，以及建立真实关系，让源生群体能够影响其文化的呈现方式。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'language preservation',
    questionText: 'What is gained by preserving a language with very few remaining speakers?',
    translations: {
      te: {
        word: 'భాషా పరిరక్షణ',
        question: 'చాలా కొద్దిమంది మాత్రమే మాట్లాడే భాషను కాపాడటం వల్ల ఏమి లభిస్తుంది?',
        examples: [
          {
            en: 'A language carries ecological knowledge, oral history, humor, and categories of thought that no dictionary can preserve in isolation.',
            native:
              'ఒక భాష పర్యావరణ జ్ఞానం, మౌఖిక చరిత్ర, హాస్యం మరియు ఏ నిఘంటువూ విడిగా సంరక్షించలేని ఆలోచనా వర్గాలను మోస్తుంది.',
          },
          {
            en: 'Preservation succeeds when children can use the language in contemporary life, not merely when recordings are stored in an academic archive.',
            native:
              'రికార్డులను కేవలం విద్యాసంబంధ భాండాగారంలో ఉంచినప్పుడు కాకుండా, పిల్లలు సమకాలీన జీవితంలో ఆ భాషను ఉపయోగించగలిగినప్పుడు పరిరక్షణ విజయవంతమవుతుంది.',
          },
          {
            en: 'Communities themselves should decide whether revitalization, documentation, or bilingual education best serves their priorities and limited resources.',
            native:
              'పునరుజ్జీవనం, నమోదు లేదా ద్విభాషా విద్యలో ఏది తమ ప్రాధాన్యాలకు మరియు పరిమిత వనరులకు ఉత్తమంగా ఉపయోగపడుతుందో సమాజాలే నిర్ణయించాలి.',
          },
        ],
      },
      hi: {
        word: 'भाषा संरक्षण',
        question: 'बहुत कम बचे हुए वक्ताओं वाली भाषा को संरक्षित करने से क्या हासिल होता है?',
        examples: [
          {
            en: 'A language carries ecological knowledge, oral history, humor, and categories of thought that no dictionary can preserve in isolation.',
            native:
              'एक भाषा पारिस्थितिक ज्ञान, मौखिक इतिहास, हास्य और विचार की ऐसी श्रेणियाँ संजोती है जिन्हें कोई शब्दकोश अकेले संरक्षित नहीं कर सकता।',
          },
          {
            en: 'Preservation succeeds when children can use the language in contemporary life, not merely when recordings are stored in an academic archive.',
            native:
              'संरक्षण तब सफल होता है जब बच्चे समकालीन जीवन में भाषा का उपयोग कर सकें, केवल तब नहीं जब रिकॉर्डिंग किसी शैक्षणिक संग्रह में रख दी जाएँ।',
          },
          {
            en: 'Communities themselves should decide whether revitalization, documentation, or bilingual education best serves their priorities and limited resources.',
            native:
              'समुदायों को स्वयं तय करना चाहिए कि पुनर्जीवन, दस्तावेज़ीकरण या द्विभाषी शिक्षा में से क्या उनकी प्राथमिकताओं और सीमित संसाधनों के लिए सर्वोत्तम है।',
          },
        ],
      },
      es: {
        word: 'preservación lingüística',
        question: '¿Qué se gana al preservar una lengua con muy pocos hablantes restantes?',
        examples: [
          {
            en: 'A language carries ecological knowledge, oral history, humor, and categories of thought that no dictionary can preserve in isolation.',
            native:
              'Una lengua transmite conocimientos ecológicos, historia oral, humor y categorías de pensamiento que ningún diccionario puede preservar por sí solo.',
          },
          {
            en: 'Preservation succeeds when children can use the language in contemporary life, not merely when recordings are stored in an academic archive.',
            native:
              'La preservación tiene éxito cuando los niños pueden usar la lengua en la vida contemporánea, no solo cuando se guardan grabaciones en un archivo académico.',
          },
          {
            en: 'Communities themselves should decide whether revitalization, documentation, or bilingual education best serves their priorities and limited resources.',
            native:
              'Las propias comunidades deberían decidir si la revitalización, la documentación o la educación bilingüe responden mejor a sus prioridades y recursos limitados.',
          },
        ],
      },
      zh: {
        word: '语言保护',
        question: '保护一种仅剩极少数使用者的语言能够带来什么？',
        examples: [
          {
            en: 'A language carries ecological knowledge, oral history, humor, and categories of thought that no dictionary can preserve in isolation.',
            native: '一种语言承载着生态知识、口述历史、幽默和思维范畴，这些内容绝非一部词典就能孤立保存。',
          },
          {
            en: 'Preservation succeeds when children can use the language in contemporary life, not merely when recordings are stored in an academic archive.',
            native: '只有当儿童能在当代生活中使用这种语言时，保护才算成功，而不是仅把录音存进学术档案。',
          },
          {
            en: 'Communities themselves should decide whether revitalization, documentation, or bilingual education best serves their priorities and limited resources.',
            native: '应由社区自身决定语言复兴、资料记录或双语教育，哪一种最符合其优先事项与有限资源。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'emotional intelligence',
    questionText:
      'Is emotional intelligence a measurable ability, a learnable skill, or an appealing label for several traits?',
    translations: {
      te: {
        word: 'భావోద్వేగ మేధస్సు',
        question: 'భావోద్వేగ మేధస్సు కొలవగల సామర్థ్యమా, నేర్చుకోగల నైపుణ్యమా, లేక అనేక లక్షణాలకు ఆకర్షణీయమైన పేరా?',
        examples: [
          {
            en: 'Recognizing emotion accurately can improve communication, but insight has little value unless a person can regulate impulses and respond constructively.',
            native:
              'భావోద్వేగాన్ని ఖచ్చితంగా గుర్తించడం సంభాషణను మెరుగుపరచగలదు, కానీ వ్యక్తి తన ఉద్రేకాలను నియంత్రించి నిర్మాణాత్మకంగా స్పందించలేకపోతే ఆ అవగాహనకు తక్కువ విలువ ఉంటుంది.',
          },
          {
            en: 'Training can strengthen perspective-taking and conflict management, although personality, culture, and context make any single score incomplete.',
            native:
              'శిక్షణ ఇతరుల దృక్కోణాన్ని గ్రహించడం మరియు ఘర్షణ నిర్వహణను బలోపేతం చేయగలదు, అయితే వ్యక్తిత్వం, సంస్కృతి మరియు సందర్భం ఏ ఒక్క స్కోరునైనా అసంపూర్ణంగా చేస్తాయి.',
          },
          {
            en: 'Emotional skill is not inherently benevolent; a perceptive manipulator may understand others exceptionally well and use that knowledge selfishly.',
            native:
              'భావోద్వేగ నైపుణ్యం సహజంగానే సద్భావపూర్వకం కాదు; సూక్ష్మగ్రాహి అయిన మోసగాడు ఇతరులను అసాధారణంగా అర్థం చేసుకుని ఆ జ్ఞానాన్ని స్వార్థపూరితంగా ఉపయోగించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'भावनात्मक बुद्धिमत्ता',
        question:
          'क्या भावनात्मक बुद्धिमत्ता मापने योग्य क्षमता, सीखा जा सकने वाला कौशल या कई गुणों के लिए आकर्षक नाम है?',
        examples: [
          {
            en: 'Recognizing emotion accurately can improve communication, but insight has little value unless a person can regulate impulses and respond constructively.',
            native:
              'भावनाओं को सही पहचानना संवाद सुधार सकता है, लेकिन यदि व्यक्ति आवेग नियंत्रित करके रचनात्मक प्रतिक्रिया न दे सके तो इस समझ का बहुत कम मूल्य है।',
          },
          {
            en: 'Training can strengthen perspective-taking and conflict management, although personality, culture, and context make any single score incomplete.',
            native:
              'प्रशिक्षण दूसरों का दृष्टिकोण समझने और संघर्ष सँभालने की क्षमता मज़बूत कर सकता है, हालांकि व्यक्तित्व, संस्कृति और संदर्भ किसी एक अंक को अधूरा बना देते हैं।',
          },
          {
            en: 'Emotional skill is not inherently benevolent; a perceptive manipulator may understand others exceptionally well and use that knowledge selfishly.',
            native:
              'भावनात्मक कौशल स्वभावतः परोपकारी नहीं होता; एक सूझबूझ वाला छलकर्ता दूसरों को असाधारण रूप से समझकर उस ज्ञान का स्वार्थी उपयोग कर सकता है।',
          },
        ],
      },
      es: {
        word: 'inteligencia emocional',
        question:
          '¿Es la inteligencia emocional una capacidad medible, una habilidad que se aprende o una etiqueta atractiva para diversos rasgos?',
        examples: [
          {
            en: 'Recognizing emotion accurately can improve communication, but insight has little value unless a person can regulate impulses and respond constructively.',
            native:
              'Reconocer las emociones con precisión puede mejorar la comunicación, pero esa comprensión sirve de poco si la persona no regula sus impulsos y responde de forma constructiva.',
          },
          {
            en: 'Training can strengthen perspective-taking and conflict management, although personality, culture, and context make any single score incomplete.',
            native:
              'La formación puede reforzar la adopción de otras perspectivas y la gestión de conflictos, aunque la personalidad, la cultura y el contexto hacen incompleta cualquier puntuación única.',
          },
          {
            en: 'Emotional skill is not inherently benevolent; a perceptive manipulator may understand others exceptionally well and use that knowledge selfishly.',
            native:
              'La habilidad emocional no es benévola por naturaleza; un manipulador perceptivo puede comprender excepcionalmente bien a los demás y usar ese conocimiento con egoísmo.',
          },
        ],
      },
      zh: {
        word: '情商',
        question: '情商究竟是一种可测量的能力、一项可习得的技能，还是对多种特质的动听概括？',
        examples: [
          {
            en: 'Recognizing emotion accurately can improve communication, but insight has little value unless a person can regulate impulses and respond constructively.',
            native: '准确识别情绪能够改善沟通，但如果一个人无法控制冲动并作出建设性回应，这种洞察便价值有限。',
          },
          {
            en: 'Training can strengthen perspective-taking and conflict management, although personality, culture, and context make any single score incomplete.',
            native: '训练可以增强换位思考与冲突管理能力，但性格、文化和情境决定了任何单一分数都不完整。',
          },
          {
            en: 'Emotional skill is not inherently benevolent; a perceptive manipulator may understand others exceptionally well and use that knowledge selfishly.',
            native: '情绪能力并非天生善意；善于洞察的操纵者可能极其了解他人，并自私地利用这种认识。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'self-awareness',
    questionText: 'Why can greater self-awareness be uncomfortable as well as beneficial?',
    translations: {
      te: {
        word: 'స్వీయ అవగాహన',
        question: 'ఎక్కువ స్వీయ అవగాహన ప్రయోజనకరంగా ఉండటంతో పాటు అసౌకర్యాన్ని ఎందుకు కలిగించగలదు?',
        examples: [
          {
            en: 'Honest reflection exposes the gap between our stated values and habitual conduct, creating an obligation to change rather than merely understand ourselves.',
            native:
              'నిష్కపటమైన ఆత్మపరిశీలన మనం ప్రకటించే విలువలకు, అలవాటైన ప్రవర్తనకు మధ్య ఉన్న అంతరాన్ని బయటపెట్టి, మనల్ని కేవలం అర్థం చేసుకోవడం కాకుండా మారాల్సిన బాధ్యతను కలిగిస్తుంది.',
          },
          {
            en: 'Feedback from trusted people can reveal blind spots, yet accepting it requires separating a criticism of behavior from a verdict on personal worth.',
            native:
              'విశ్వసనీయ వ్యక్తుల అభిప్రాయం మనకు కనిపించని లోపాలను బయటపెట్టగలదు, కానీ దాన్ని అంగీకరించడానికి ప్రవర్తనపై విమర్శను వ్యక్తిగత విలువపై తీర్పు నుంచి వేరు చేయాలి.',
          },
          {
            en: 'Self-awareness becomes counterproductive when observation turns into relentless self-monitoring that inhibits spontaneity and magnifies ordinary mistakes.',
            native:
              'పరిశీలన నిరంతర స్వీయ పర్యవేక్షణగా మారి సహజత్వాన్ని అడ్డుకుని సాధారణ తప్పులను అతిశయింపజేసినప్పుడు స్వీయ అవగాహన ప్రతికూలమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'आत्म-जागरूकता',
        question: 'अधिक आत्म-जागरूकता लाभकारी होने के साथ असहज क्यों हो सकती है?',
        examples: [
          {
            en: 'Honest reflection exposes the gap between our stated values and habitual conduct, creating an obligation to change rather than merely understand ourselves.',
            native:
              'ईमानदार आत्मचिंतन हमारे घोषित मूल्यों और आदतन व्यवहार के बीच का अंतर उजागर करता है, जिससे केवल स्वयं को समझने के बजाय बदलने का दायित्व पैदा होता है।',
          },
          {
            en: 'Feedback from trusted people can reveal blind spots, yet accepting it requires separating a criticism of behavior from a verdict on personal worth.',
            native:
              'विश्वसनीय लोगों की प्रतिक्रिया अनदेखे पहलू दिखा सकती है, फिर भी उसे स्वीकार करने के लिए व्यवहार की आलोचना को व्यक्तिगत मूल्य पर निर्णय से अलग करना पड़ता है।',
          },
          {
            en: 'Self-awareness becomes counterproductive when observation turns into relentless self-monitoring that inhibits spontaneity and magnifies ordinary mistakes.',
            native:
              'आत्म-जागरूकता तब प्रतिकूल हो जाती है जब निरीक्षण निरंतर आत्म-निगरानी बनकर सहजता रोकता है और सामान्य गलतियों को बढ़ा-चढ़ाकर दिखाता है।',
          },
        ],
      },
      es: {
        word: 'autoconocimiento',
        question: '¿Por qué un mayor autoconocimiento puede resultar incómodo además de beneficioso?',
        examples: [
          {
            en: 'Honest reflection exposes the gap between our stated values and habitual conduct, creating an obligation to change rather than merely understand ourselves.',
            native:
              'La reflexión honesta revela la distancia entre los valores que proclamamos y nuestra conducta habitual, lo que obliga a cambiar en vez de limitarnos a comprendernos.',
          },
          {
            en: 'Feedback from trusted people can reveal blind spots, yet accepting it requires separating a criticism of behavior from a verdict on personal worth.',
            native:
              'Los comentarios de personas de confianza pueden revelar puntos ciegos, pero aceptarlos exige separar una crítica al comportamiento de un veredicto sobre el valor personal.',
          },
          {
            en: 'Self-awareness becomes counterproductive when observation turns into relentless self-monitoring that inhibits spontaneity and magnifies ordinary mistakes.',
            native:
              'El autoconocimiento se vuelve contraproducente cuando la observación deriva en una vigilancia propia implacable que inhibe la espontaneidad y magnifica errores corrientes.',
          },
        ],
      },
      zh: {
        word: '自我觉察',
        question: '为什么更深入的自我觉察既有益处，也会令人不适？',
        examples: [
          {
            en: 'Honest reflection exposes the gap between our stated values and habitual conduct, creating an obligation to change rather than merely understand ourselves.',
            native: '诚实反思会揭示我们宣称的价值观与习惯行为之间的差距，使我们有义务作出改变，而不只是了解自己。',
          },
          {
            en: 'Feedback from trusted people can reveal blind spots, yet accepting it requires separating a criticism of behavior from a verdict on personal worth.',
            native: '可信之人的反馈能够揭示盲点，但接受反馈需要把对行为的批评与对个人价值的判决区分开来。',
          },
          {
            en: 'Self-awareness becomes counterproductive when observation turns into relentless self-monitoring that inhibits spontaneity and magnifies ordinary mistakes.',
            native: '当观察变成无休止的自我监控，压抑自然表现并放大普通错误时，自我觉察就会适得其反。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'adaptability',
    questionText: 'How can people remain adaptable without abandoning stable principles or long-term goals?',
    translations: {
      te: {
        word: 'అనుకూలన సామర్థ్యం',
        question:
          'స్థిరమైన సూత్రాలను లేదా దీర్ఘకాలిక లక్ష్యాలను వదులుకోకుండా ప్రజలు అనుకూలన సామర్థ్యాన్ని ఎలా కొనసాగించగలరు?',
        examples: [
          {
            en: 'Adaptability means revising methods when evidence changes, whereas opportunism changes declared values whenever a more convenient option appears.',
            native:
              'ఆధారాలు మారినప్పుడు పద్ధతులను సవరించడం అనుకూలన సామర్థ్యం; మరింత సౌకర్యవంతమైన ఎంపిక కనిపించినప్పుడల్లా ప్రకటించిన విలువలను మార్చడం అవకాశవాదం.',
          },
          {
            en: 'Clear priorities provide a stable direction while experiments, feedback, and contingency plans keep the route flexible.',
            native:
              'స్పష్టమైన ప్రాధాన్యాలు స్థిరమైన దిశను అందిస్తాయి, కాగా ప్రయోగాలు, అభిప్రాయాలు మరియు ప్రత్యామ్నాయ ప్రణాళికలు మార్గాన్ని అనువుగా ఉంచుతాయి.',
          },
          {
            en: 'Organizations often praise flexibility but punish failed experiments, creating a culture in which employees conceal problems and repeat familiar routines.',
            native:
              'సంస్థలు తరచూ సౌలభ్యాన్ని ప్రశంసిస్తూ విఫలమైన ప్రయోగాలను శిక్షిస్తాయి; దీనివల్ల ఉద్యోగులు సమస్యలను దాచిపెట్టి పరిచిత పద్ధతులను పునరావృతం చేసే సంస్కృతి ఏర్పడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'अनुकूलनशीलता',
        question: 'लोग स्थिर सिद्धांतों या दीर्घकालिक लक्ष्यों को छोड़े बिना अनुकूलनशील कैसे बने रह सकते हैं?',
        examples: [
          {
            en: 'Adaptability means revising methods when evidence changes, whereas opportunism changes declared values whenever a more convenient option appears.',
            native:
              'अनुकूलनशीलता का अर्थ प्रमाण बदलने पर तरीके बदलना है, जबकि अवसरवाद अधिक सुविधाजनक विकल्प दिखते ही घोषित मूल्यों को बदल देता है।',
          },
          {
            en: 'Clear priorities provide a stable direction while experiments, feedback, and contingency plans keep the route flexible.',
            native:
              'स्पष्ट प्राथमिकताएँ स्थिर दिशा देती हैं, जबकि प्रयोग, प्रतिक्रिया और आकस्मिक योजनाएँ रास्ते को लचीला बनाए रखती हैं।',
          },
          {
            en: 'Organizations often praise flexibility but punish failed experiments, creating a culture in which employees conceal problems and repeat familiar routines.',
            native:
              'संगठन अक्सर लचीलेपन की प्रशंसा करते हैं लेकिन असफल प्रयोगों को दंडित करते हैं, जिससे कर्मचारी समस्याएँ छिपाते और परिचित दिनचर्या दोहराते हैं।',
          },
        ],
      },
      es: {
        word: 'adaptabilidad',
        question:
          '¿Cómo pueden las personas mantener la capacidad de adaptación sin abandonar principios estables u objetivos a largo plazo?',
        examples: [
          {
            en: 'Adaptability means revising methods when evidence changes, whereas opportunism changes declared values whenever a more convenient option appears.',
            native:
              'Adaptarse significa revisar los métodos cuando cambia la evidencia, mientras que el oportunismo cambia los valores declarados cada vez que surge una opción más conveniente.',
          },
          {
            en: 'Clear priorities provide a stable direction while experiments, feedback, and contingency plans keep the route flexible.',
            native:
              'Las prioridades claras proporcionan una dirección estable, mientras que los experimentos, los comentarios y los planes de contingencia mantienen flexible la ruta.',
          },
          {
            en: 'Organizations often praise flexibility but punish failed experiments, creating a culture in which employees conceal problems and repeat familiar routines.',
            native:
              'Las organizaciones suelen elogiar la flexibilidad pero castigan los experimentos fallidos, creando una cultura en la que los empleados ocultan problemas y repiten rutinas conocidas.',
          },
        ],
      },
      zh: {
        word: '适应能力',
        question: '人们如何在不放弃稳定原则或长期目标的情况下保持适应能力？',
        examples: [
          {
            en: 'Adaptability means revising methods when evidence changes, whereas opportunism changes declared values whenever a more convenient option appears.',
            native: '适应能力意味着在证据变化时调整方法，而机会主义则是一旦出现更方便的选择，就改变自己宣称的价值观。',
          },
          {
            en: 'Clear priorities provide a stable direction while experiments, feedback, and contingency plans keep the route flexible.',
            native: '明确的优先事项提供稳定方向，而试验、反馈与应急预案则使实现目标的路径保持灵活。',
          },
          {
            en: 'Organizations often praise flexibility but punish failed experiments, creating a culture in which employees conceal problems and repeat familiar routines.',
            native: '组织往往口头赞扬灵活性，却惩罚失败的试验，由此形成员工隐瞒问题、重复熟悉做法的文化。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'uncertainty',
    questionText: 'How should leaders communicate uncertainty during a rapidly developing crisis?',
    translations: {
      te: {
        word: 'అనిశ్చితి',
        question: 'వేగంగా మారుతున్న సంక్షోభ సమయంలో నాయకులు అనిశ్చితిని ఎలా తెలియజేయాలి?',
        examples: [
          {
            en: 'Leaders should state what is known, what remains disputed, and which new evidence would cause current guidance to change.',
            native:
              'ఏది తెలిసిందో, ఏది ఇంకా వివాదాస్పదంగా ఉందో, ఏ కొత్త ఆధారం ప్రస్తుత మార్గదర్శకత్వాన్ని మార్చుతుందో నాయకులు స్పష్టంగా చెప్పాలి.',
          },
          {
            en: 'False certainty may secure brief compliance, but later reversals can damage credibility precisely when public cooperation becomes most important.',
            native:
              'తప్పుడు నిశ్చితత్వం కొంతకాలం విధేయతను పొందవచ్చు, కానీ తరువాతి మార్పులు ప్రజా సహకారం అత్యంత అవసరమైన సమయంలోనే విశ్వసనీయతను దెబ్బతీయగలవు.',
          },
          {
            en: 'Probabilities become meaningful when paired with concrete scenarios and actions, rather than presented as abstract numbers that audiences interpret inconsistently.',
            native:
              'ప్రేక్షకులు అసంగతంగా అర్థం చేసుకునే అమూర్త సంఖ్యలుగా చూపించడం కంటే, స్పష్టమైన పరిస్థితులు మరియు చర్యలతో జతచేసినప్పుడు సంభావ్యతలు అర్థవంతమవుతాయి.',
          },
        ],
      },
      hi: {
        word: 'अनिश्चितता',
        question: 'तेज़ी से बदलते संकट के दौरान नेताओं को अनिश्चितता के बारे में कैसे संवाद करना चाहिए?',
        examples: [
          {
            en: 'Leaders should state what is known, what remains disputed, and which new evidence would cause current guidance to change.',
            native:
              'नेताओं को बताना चाहिए कि क्या ज्ञात है, किस पर अभी विवाद है और कौन-सा नया प्रमाण मौजूदा मार्गदर्शन को बदल देगा।',
          },
          {
            en: 'False certainty may secure brief compliance, but later reversals can damage credibility precisely when public cooperation becomes most important.',
            native:
              'झूठा विश्वास थोड़े समय के लिए अनुपालन करा सकता है, लेकिन बाद में रुख बदलने से विश्वसनीयता ठीक उसी समय घट सकती है जब जन सहयोग सबसे आवश्यक हो।',
          },
          {
            en: 'Probabilities become meaningful when paired with concrete scenarios and actions, rather than presented as abstract numbers that audiences interpret inconsistently.',
            native:
              'प्रायिकताएँ तब सार्थक होती हैं जब उन्हें ठोस परिदृश्यों और कार्रवाइयों से जोड़ा जाए, न कि ऐसे अमूर्त अंकों के रूप में पेश किया जाए जिन्हें श्रोता अलग-अलग समझते हैं।',
          },
        ],
      },
      es: {
        word: 'incertidumbre',
        question:
          '¿Cómo deberían comunicar los líderes la incertidumbre durante una crisis que evoluciona rápidamente?',
        examples: [
          {
            en: 'Leaders should state what is known, what remains disputed, and which new evidence would cause current guidance to change.',
            native:
              'Los dirigentes deberían indicar qué se sabe, qué sigue en discusión y qué nuevas pruebas harían cambiar las recomendaciones actuales.',
          },
          {
            en: 'False certainty may secure brief compliance, but later reversals can damage credibility precisely when public cooperation becomes most important.',
            native:
              'Una falsa certeza puede lograr obediencia breve, pero los cambios posteriores pueden dañar la credibilidad precisamente cuando más importa la cooperación pública.',
          },
          {
            en: 'Probabilities become meaningful when paired with concrete scenarios and actions, rather than presented as abstract numbers that audiences interpret inconsistently.',
            native:
              'Las probabilidades adquieren sentido cuando se vinculan a escenarios y acciones concretos, en lugar de presentarse como cifras abstractas que el público interpreta de manera desigual.',
          },
        ],
      },
      zh: {
        word: '不确定性',
        question: '在迅速演变的危机中，领导人应如何传达不确定性？',
        examples: [
          {
            en: 'Leaders should state what is known, what remains disputed, and which new evidence would cause current guidance to change.',
            native: '领导人应说明哪些事实已经明确、哪些仍有争议，以及何种新证据会促使现行指引改变。',
          },
          {
            en: 'False certainty may secure brief compliance, but later reversals can damage credibility precisely when public cooperation becomes most important.',
            native: '虚假的确定性或许能换来短暂服从，但日后改口会恰恰在最需要公众合作时损害公信力。',
          },
          {
            en: 'Probabilities become meaningful when paired with concrete scenarios and actions, rather than presented as abstract numbers that audiences interpret inconsistently.',
            native: '概率只有与具体情境和行动相结合才有意义，而不应只是让受众各自解读的一串抽象数字。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'risk perception',
    questionText: "Why do people's perceptions of risk often differ from statistical evidence?",
    translations: {
      te: {
        word: 'ప్రమాద అవగాహన',
        question: 'ప్రమాదంపై ప్రజల అవగాహన గణాంక ఆధారాల నుంచి తరచూ ఎందుకు భిన్నంగా ఉంటుంది?',
        examples: [
          {
            en: 'Rare events feel more threatening when they are vivid, involuntary, and heavily reported, even if familiar hazards cause far greater harm overall.',
            native:
              'అరుదైన సంఘటనలు స్పష్టంగా, అనైచ్ఛికంగా ఉండి విస్తృతంగా నివేదించబడినప్పుడు మరింత భయంకరంగా అనిపిస్తాయి, పరిచిత ప్రమాదాలు మొత్తంగా చాలా ఎక్కువ హాని చేసినప్పటికీ.',
          },
          {
            en: 'Trust changes risk perception because people evaluate not only the probability of harm but also who controls the danger and who benefits.',
            native:
              'ప్రజలు హాని సంభావ్యతనే కాకుండా ప్రమాదాన్ని ఎవరు నియంత్రిస్తారు, ఎవరు లాభపడతారు అనే అంశాలను కూడా అంచనా వేస్తారు కాబట్టి విశ్వాసం ప్రమాద అవగాహనను మారుస్తుంది.',
          },
          {
            en: 'Effective communication compares like with like and acknowledges emotion, since dismissing fear as irrational usually makes corrective statistics less persuasive.',
            native:
              'సమర్థవంతమైన సంభాషణ సారూప్యమైన వాటినే పోల్చి భావోద్వేగాన్ని గుర్తిస్తుంది, ఎందుకంటే భయాన్ని అహేతుకమని తోసిపుచ్చడం సరిదిద్దే గణాంకాల నమ్మకాన్ని సాధారణంగా తగ్గిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'जोखिम की धारणा',
        question: 'जोखिम के बारे में लोगों की धारणाएँ अक्सर सांख्यिकीय प्रमाणों से अलग क्यों होती हैं?',
        examples: [
          {
            en: 'Rare events feel more threatening when they are vivid, involuntary, and heavily reported, even if familiar hazards cause far greater harm overall.',
            native:
              'दुर्लभ घटनाएँ तब अधिक भयावह लगती हैं जब वे जीवंत, अनैच्छिक और व्यापक रूप से रिपोर्ट की जाती हैं, भले ही परिचित खतरे कुल मिलाकर कहीं अधिक नुकसान करें।',
          },
          {
            en: 'Trust changes risk perception because people evaluate not only the probability of harm but also who controls the danger and who benefits.',
            native:
              'विश्वास जोखिम की धारणा बदलता है, क्योंकि लोग केवल नुकसान की संभावना नहीं बल्कि यह भी आँकते हैं कि खतरे को कौन नियंत्रित करता है और लाभ किसे मिलता है।',
          },
          {
            en: 'Effective communication compares like with like and acknowledges emotion, since dismissing fear as irrational usually makes corrective statistics less persuasive.',
            native:
              'प्रभावी संवाद समान चीज़ों की तुलना करता है और भावना को स्वीकारता है, क्योंकि डर को अतार्किक बताकर खारिज करने से सुधारात्मक आँकड़े आम तौर पर कम विश्वसनीय लगते हैं।',
          },
        ],
      },
      es: {
        word: 'percepción del riesgo',
        question: '¿Por qué la percepción del riesgo suele diferir de la evidencia estadística?',
        examples: [
          {
            en: 'Rare events feel more threatening when they are vivid, involuntary, and heavily reported, even if familiar hazards cause far greater harm overall.',
            native:
              'Los sucesos raros parecen más amenazantes cuando son vívidos, involuntarios y reciben gran cobertura, aunque peligros conocidos causen mucho más daño en conjunto.',
          },
          {
            en: 'Trust changes risk perception because people evaluate not only the probability of harm but also who controls the danger and who benefits.',
            native:
              'La confianza modifica la percepción del riesgo porque la gente evalúa no solo la probabilidad de daño, sino también quién controla el peligro y quién se beneficia.',
          },
          {
            en: 'Effective communication compares like with like and acknowledges emotion, since dismissing fear as irrational usually makes corrective statistics less persuasive.',
            native:
              'Una comunicación eficaz compara elementos equivalentes y reconoce la emoción, pues descartar el miedo como irracional suele restar fuerza persuasiva a las estadísticas correctivas.',
          },
        ],
      },
      zh: {
        word: '风险感知',
        question: '为什么人们对风险的感知往往与统计证据不一致？',
        examples: [
          {
            en: 'Rare events feel more threatening when they are vivid, involuntary, and heavily reported, even if familiar hazards cause far greater harm overall.',
            native:
              '罕见事件若画面鲜明、非出于自愿且被大量报道，就会显得更具威胁，即使熟悉的危险总体造成的伤害大得多。',
          },
          {
            en: 'Trust changes risk perception because people evaluate not only the probability of harm but also who controls the danger and who benefits.',
            native: '信任会改变风险感知，因为人们不仅评估伤害概率，也会考虑由谁控制危险、谁从中获益。',
          },
          {
            en: 'Effective communication compares like with like and acknowledges emotion, since dismissing fear as irrational usually makes corrective statistics less persuasive.',
            native: '有效沟通会比较同类事物并承认情绪，因为把恐惧斥为不理性，通常只会削弱纠偏数据的说服力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C1',
    promptWord: 'decision fatigue',
    questionText: 'How does decision fatigue affect judgment, and how can its influence be reduced?',
    translations: {
      te: {
        word: 'నిర్ణయ అలసట',
        question: 'నిర్ణయ అలసట విచక్షణను ఎలా ప్రభావితం చేస్తుంది, దాని ప్రభావాన్ని ఎలా తగ్గించవచ్చు?',
        examples: [
          {
            en: 'After repeated choices, people may default to the easiest option, postpone action, or rely on superficial cues instead of evaluating trade-offs carefully.',
            native:
              'పదేపదే ఎంపికలు చేసిన తర్వాత ప్రజలు అత్యంత సులభమైన ఎంపికను ఎంచుకోవచ్చు, చర్యను వాయిదా వేయవచ్చు లేదా లాభనష్టాలను జాగ్రత్తగా అంచనా వేయకుండా పైపై సంకేతాలపై ఆధారపడవచ్చు.',
          },
          {
            en: 'Routines and sensible defaults conserve attention for consequential decisions, provided that convenience does not quietly remove meaningful choice.',
            native:
              'సౌలభ్యం అర్థవంతమైన ఎంపికను నిశ్శబ్దంగా తొలగించనంత వరకు, దినచర్యలు మరియు సమంజసమైన ముందస్తు ఎంపికలు కీలక నిర్ణయాల కోసం శ్రద్ధను ఆదా చేస్తాయి.',
          },
          {
            en: 'Institutions should schedule complex judgments when decision-makers are rested and use structured criteria to limit irrelevant variation across cases.',
            native:
              'నిర్ణయకర్తలు విశ్రాంతిగా ఉన్నప్పుడు సంస్థలు సంక్లిష్ట నిర్ణయాలను ఏర్పాటు చేసి, కేసుల మధ్య అసంబద్ధమైన వ్యత్యాసాన్ని పరిమితం చేయడానికి నిర్మిత ప్రమాణాలను ఉపయోగించాలి.',
          },
        ],
      },
      hi: {
        word: 'निर्णय थकान',
        question: 'निर्णय थकान विवेक को कैसे प्रभावित करती है और उसका असर कैसे घटाया जा सकता है?',
        examples: [
          {
            en: 'After repeated choices, people may default to the easiest option, postpone action, or rely on superficial cues instead of evaluating trade-offs carefully.',
            native:
              'लगातार चुनाव करने के बाद लोग सबसे आसान विकल्प अपना सकते हैं, कार्रवाई टाल सकते हैं या लाभ-हानि को ध्यान से परखने के बजाय सतही संकेतों पर निर्भर हो सकते हैं।',
          },
          {
            en: 'Routines and sensible defaults conserve attention for consequential decisions, provided that convenience does not quietly remove meaningful choice.',
            native:
              'दिनचर्या और समझदार पूर्वनिर्धारित विकल्प महत्त्वपूर्ण निर्णयों के लिए ध्यान बचाते हैं, बशर्ते सुविधा चुपचाप सार्थक चुनाव को समाप्त न करे।',
          },
          {
            en: 'Institutions should schedule complex judgments when decision-makers are rested and use structured criteria to limit irrelevant variation across cases.',
            native:
              'संस्थाओं को जटिल निर्णय तब तय करने चाहिए जब निर्णयकर्ता विश्राम कर चुके हों और मामलों के बीच अप्रासंगिक अंतर सीमित करने के लिए संरचित मानदंड अपनाने चाहिए।',
          },
        ],
      },
      es: {
        word: 'fatiga decisoria',
        question: '¿Cómo afecta la fatiga decisoria al juicio y cómo puede reducirse su influencia?',
        examples: [
          {
            en: 'After repeated choices, people may default to the easiest option, postpone action, or rely on superficial cues instead of evaluating trade-offs carefully.',
            native:
              'Tras elegir repetidamente, las personas pueden optar por la alternativa más fácil, posponer la acción o fiarse de indicios superficiales en vez de valorar cuidadosamente las contrapartidas.',
          },
          {
            en: 'Routines and sensible defaults conserve attention for consequential decisions, provided that convenience does not quietly remove meaningful choice.',
            native:
              'Las rutinas y las opciones predeterminadas sensatas reservan atención para decisiones trascendentes, siempre que la comodidad no elimine silenciosamente una elección significativa.',
          },
          {
            en: 'Institutions should schedule complex judgments when decision-makers are rested and use structured criteria to limit irrelevant variation across cases.',
            native:
              'Las instituciones deberían programar los juicios complejos cuando quienes deciden estén descansados y usar criterios estructurados para limitar variaciones irrelevantes entre casos.',
          },
        ],
      },
      zh: {
        word: '决策疲劳',
        question: '决策疲劳如何影响判断，又该如何减轻其作用？',
        examples: [
          {
            en: 'After repeated choices, people may default to the easiest option, postpone action, or rely on superficial cues instead of evaluating trade-offs carefully.',
            native: '连续作出多次选择后，人们可能默认采用最省事的方案、推迟行动，或依赖表面线索，而不再仔细权衡得失。',
          },
          {
            en: 'Routines and sensible defaults conserve attention for consequential decisions, provided that convenience does not quietly remove meaningful choice.',
            native: '日常惯例与合理的默认选项能为重大决策节省注意力，前提是便利不能悄然剥夺有意义的选择。',
          },
          {
            en: 'Institutions should schedule complex judgments when decision-makers are rested and use structured criteria to limit irrelevant variation across cases.',
            native: '机构应在决策者精力充沛时安排复杂判断，并采用结构化标准，减少不同案例之间无关的差异。',
          },
        ],
      },
    },
  },
];
