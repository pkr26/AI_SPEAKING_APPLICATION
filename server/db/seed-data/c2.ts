import type { QuestionSeed } from './types';

// C2 speaking questions: prompt word, question, and te/hi/es/zh
// translations with 3 example answers each (same English sentence across
// languages, `native` is its translation).
export const questions: QuestionSeed[] = [
  {
    cefrLevel: 'C2',
    promptWord: 'ethics',
    questionText:
      'When scientific innovation creates benefits that are immediate but risks that are uncertain and irreversible, who should bear the burden of ethical justification?',
    translations: {
      te: {
        word: 'నైతికత',
        question:
          'శాస్త్రీయ ఆవిష్కరణ తక్షణ ప్రయోజనాలను అందిస్తూ అనిశ్చితమైన, తిరిగి సరిచేయలేని ప్రమాదాలను సృష్టించినప్పుడు నైతిక సమర్థన బాధ్యతను ఎవరు భరించాలి?',
        examples: [
          {
            en: 'Ethical oversight should not demand proof of zero risk, yet innovators who profit from uncertainty owe the public transparent evidence and reversible safeguards.',
            native:
              'నైతిక పర్యవేక్షణ ప్రమాదమే లేదని రుజువు చేయాలని కోరరాదు; అయితే అనిశ్చితి నుంచి లాభపడే ఆవిష్కర్తలు ప్రజలకు పారదర్శక సాక్ష్యాలను, వెనక్కి తీసుకోగల రక్షణ చర్యలను అందించాలి.',
          },
          {
            en: 'The precautionary principle is defensible when potential harm is catastrophic, but applied indiscriminately it can entrench existing dangers by blocking superior alternatives.',
            native:
              'సంభావ్య హాని విపత్కరమైనప్పుడు ముందు జాగ్రత్త సూత్రం సమర్థనీయమే; అయితే విచక్షణ లేకుండా దాన్ని వర్తింపజేస్తే మెరుగైన ప్రత్యామ్నాయాలను అడ్డుకోవడం ద్వారా ఇప్పటికే ఉన్న ప్రమాదాలనే స్థిరపరచవచ్చు.',
          },
          {
            en: 'Legitimate limits on research require participation from affected communities, because technical expertise alone cannot decide which losses are morally acceptable.',
            native:
              'పరిశోధనపై చట్టబద్ధమైన పరిమితులకు ప్రభావిత సముదాయాల భాగస్వామ్యం అవసరం; ఎందుకంటే ఏ నష్టాలు నైతికంగా ఆమోదయోగ్యమో నిర్ణయించడానికి సాంకేతిక నైపుణ్యం ఒక్కటే సరిపోదు.',
          },
        ],
      },
      hi: {
        word: 'नैतिकता',
        question:
          'जब वैज्ञानिक नवाचार तात्कालिक लाभ के साथ अनिश्चित और अपरिवर्तनीय जोखिम पैदा करे, तब नैतिक औचित्य सिद्ध करने का दायित्व किसे उठाना चाहिए?',
        examples: [
          {
            en: 'Ethical oversight should not demand proof of zero risk, yet innovators who profit from uncertainty owe the public transparent evidence and reversible safeguards.',
            native:
              'नैतिक निरीक्षण को शून्य जोखिम का प्रमाण नहीं माँगना चाहिए, फिर भी अनिश्चितता से लाभ कमाने वाले नवप्रवर्तकों का दायित्व है कि वे जनता को पारदर्शी साक्ष्य और वापस लिए जा सकने वाले सुरक्षा उपाय दें।',
          },
          {
            en: 'The precautionary principle is defensible when potential harm is catastrophic, but applied indiscriminately it can entrench existing dangers by blocking superior alternatives.',
            native:
              'संभावित हानि विनाशकारी हो तो एहतियाती सिद्धांत उचित है, लेकिन अंधाधुंध प्रयोग किए जाने पर वह बेहतर विकल्पों को रोककर मौजूदा खतरों को स्थायी बना सकता है।',
          },
          {
            en: 'Legitimate limits on research require participation from affected communities, because technical expertise alone cannot decide which losses are morally acceptable.',
            native:
              'अनुसंधान पर वैध सीमाओं के लिए प्रभावित समुदायों की भागीदारी आवश्यक है, क्योंकि केवल तकनीकी विशेषज्ञता यह तय नहीं कर सकती कि कौन-सी हानियाँ नैतिक रूप से स्वीकार्य हैं।',
          },
        ],
      },
      es: {
        word: 'ética',
        question:
          'Cuando la innovación científica produce beneficios inmediatos, pero riesgos inciertos e irreversibles, ¿quién debe asumir la carga de justificarla éticamente?',
        examples: [
          {
            en: 'Ethical oversight should not demand proof of zero risk, yet innovators who profit from uncertainty owe the public transparent evidence and reversible safeguards.',
            native:
              'La supervisión ética no debe exigir que se demuestre un riesgo nulo, pero quienes se benefician de la incertidumbre deben a la ciudadanía evidencia transparente y salvaguardias reversibles.',
          },
          {
            en: 'The precautionary principle is defensible when potential harm is catastrophic, but applied indiscriminately it can entrench existing dangers by blocking superior alternatives.',
            native:
              'El principio de precaución es defendible ante daños potencialmente catastróficos, pero aplicado indiscriminadamente puede afianzar los peligros existentes al bloquear alternativas superiores.',
          },
          {
            en: 'Legitimate limits on research require participation from affected communities, because technical expertise alone cannot decide which losses are morally acceptable.',
            native:
              'Los límites legítimos a la investigación requieren la participación de las comunidades afectadas, porque el conocimiento técnico no puede decidir por sí solo qué pérdidas son moralmente aceptables.',
          },
        ],
      },
      zh: {
        word: '伦理',
        question: '当科学创新带来即时利益，却产生不确定且不可逆的风险时，应由谁承担伦理论证的责任？',
        examples: [
          {
            en: 'Ethical oversight should not demand proof of zero risk, yet innovators who profit from uncertainty owe the public transparent evidence and reversible safeguards.',
            native:
              '伦理监督不应要求证明风险为零，但从不确定性中获利的创新者有责任向公众提供透明证据与可撤回的保障措施。',
          },
          {
            en: 'The precautionary principle is defensible when potential harm is catastrophic, but applied indiscriminately it can entrench existing dangers by blocking superior alternatives.',
            native:
              '当潜在伤害可能是灾难性的，预防原则可以得到辩护；但若不加区分地运用，它也会阻碍更优选择，使现有危险固化。',
          },
          {
            en: 'Legitimate limits on research require participation from affected communities, because technical expertise alone cannot decide which losses are morally acceptable.',
            native: '对研究施加正当限制需要受影响社群参与，因为仅凭技术专长无法决定哪些损失在道德上可以接受。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'democracy',
    questionText:
      'Can democracy remain self-correcting when economic power, digital platforms, and partisan institutions shape which voices become politically audible?',
    translations: {
      te: {
        word: 'ప్రజాస్వామ్యం',
        question:
          'ఆర్థిక అధికారం, డిజిటల్ వేదికలు, పక్షపాత సంస్థలు రాజకీయంగా ఏ గొంతులు వినిపించాలో నిర్దేశిస్తున్నప్పుడు ప్రజాస్వామ్యం తనను తాను సరిదిద్దుకోగలదా?',
        examples: [
          {
            en: 'Competitive elections are necessary but insufficient; citizens also need reliable information, associational freedom, and institutions capable of converting dissent into accountable policy.',
            native:
              'పోటీ ఎన్నికలు అవసరమే కానీ సరిపోవు; పౌరులకు విశ్వసనీయ సమాచారం, సంఘటితమయ్యే స్వేచ్ఛ, అసమ్మతిని జవాబుదారీ విధానంగా మార్చగల సంస్థలు కూడా అవసరం.',
          },
          {
            en: "Majority rule gains legitimacy only when minorities retain rights robust enough to contest today's decision and plausibly become tomorrow's majority.",
            native:
              'నేటి నిర్ణయాన్ని సవాలు చేసి రేపటి మెజారిటీగా మారే వాస్తవిక అవకాశం మైనారిటీలకు ఇచ్చేంత బలమైన హక్కులు ఉన్నప్పుడే మెజారిటీ పాలన చట్టబద్ధతను పొందుతుంది.',
          },
          {
            en: 'Democratic delay can frustrate urgent action, yet procedures that slow power may prevent temporary panic from hardening into irreversible coercion.',
            native:
              'ప్రజాస్వామ్య జాప్యం అత్యవసర చర్యకు ఆటంకం కలిగించవచ్చు; అయితే అధికారాన్ని నెమ్మదింపజేసే ప్రక్రియలు తాత్కాలిక భయాందోళన తిరుగులేని బలవంతంగా మారకుండా నిరోధించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'लोकतंत्र',
        question:
          'जब आर्थिक शक्ति, डिजिटल मंच और पक्षपाती संस्थाएँ यह तय करें कि कौन-सी आवाजें राजनीति में सुनाई देंगी, तब क्या लोकतंत्र अपनी त्रुटियाँ सुधार सकता है?',
        examples: [
          {
            en: 'Competitive elections are necessary but insufficient; citizens also need reliable information, associational freedom, and institutions capable of converting dissent into accountable policy.',
            native:
              'प्रतिस्पर्धी चुनाव आवश्यक हैं, पर पर्याप्त नहीं; नागरिकों को विश्वसनीय सूचना, संगठन बनाने की स्वतंत्रता और असहमति को जवाबदेह नीति में बदल सकने वाली संस्थाएँ भी चाहिए।',
          },
          {
            en: "Majority rule gains legitimacy only when minorities retain rights robust enough to contest today's decision and plausibly become tomorrow's majority.",
            native:
              'बहुमत का शासन तभी वैधता पाता है जब अल्पसंख्यकों के अधिकार इतने मजबूत हों कि वे आज के निर्णय को चुनौती दे सकें और कल बहुमत बनने की वास्तविक संभावना रख सकें।',
          },
          {
            en: 'Democratic delay can frustrate urgent action, yet procedures that slow power may prevent temporary panic from hardening into irreversible coercion.',
            native:
              'लोकतांत्रिक विलंब तात्कालिक कार्रवाई में बाधा डाल सकता है, फिर भी सत्ता की गति धीमी करने वाली प्रक्रियाएँ क्षणिक घबराहट को अपरिवर्तनीय दमन में बदलने से रोक सकती हैं।',
          },
        ],
      },
      es: {
        word: 'democracia',
        question:
          '¿Puede la democracia conservar su capacidad de corregirse cuando el poder económico, las plataformas digitales y las instituciones partidistas determinan qué voces se escuchan políticamente?',
        examples: [
          {
            en: 'Competitive elections are necessary but insufficient; citizens also need reliable information, associational freedom, and institutions capable of converting dissent into accountable policy.',
            native:
              'Las elecciones competitivas son necesarias, pero insuficientes; la ciudadanía también necesita información fiable, libertad de asociación e instituciones capaces de convertir el disenso en políticas sujetas a rendición de cuentas.',
          },
          {
            en: "Majority rule gains legitimacy only when minorities retain rights robust enough to contest today's decision and plausibly become tomorrow's majority.",
            native:
              'El gobierno de la mayoría solo adquiere legitimidad cuando las minorías conservan derechos suficientemente sólidos para impugnar la decisión de hoy y poder convertirse de forma plausible en la mayoría de mañana.',
          },
          {
            en: 'Democratic delay can frustrate urgent action, yet procedures that slow power may prevent temporary panic from hardening into irreversible coercion.',
            native:
              'La demora democrática puede frustrar medidas urgentes, pero los procedimientos que frenan al poder pueden impedir que un pánico pasajero se consolide como coerción irreversible.',
          },
        ],
      },
      zh: {
        word: '民主',
        question: '当经济权力、数字平台和党派机构塑造哪些声音能在政治上被听见时，民主还能保持自我纠错能力吗？',
        examples: [
          {
            en: 'Competitive elections are necessary but insufficient; citizens also need reliable information, associational freedom, and institutions capable of converting dissent into accountable policy.',
            native:
              '竞争性选举必不可少，却并不充分；公民还需要可靠的信息、结社自由，以及能把异议转化为可问责政策的制度。',
          },
          {
            en: "Majority rule gains legitimacy only when minorities retain rights robust enough to contest today's decision and plausibly become tomorrow's majority.",
            native: '只有当少数群体保有足以挑战今日决定、并有现实可能成为明日多数的权利时，多数统治才获得正当性。',
          },
          {
            en: 'Democratic delay can frustrate urgent action, yet procedures that slow power may prevent temporary panic from hardening into irreversible coercion.',
            native: '民主程序的迟缓可能妨碍紧急行动，但延缓权力的程序也能防止一时恐慌固化为不可逆的强制。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'identity',
    questionText:
      'To what extent is identity authored by the individual when language, recognition, and inherited social categories precede personal choice?',
    translations: {
      te: {
        word: 'గుర్తింపు',
        question:
          'భాష, ఇతరుల గుర్తింపు, వారసత్వంగా వచ్చిన సామాజిక వర్గాలు వ్యక్తిగత ఎంపికకు ముందే ఉన్నప్పుడు వ్యక్తి తన గుర్తింపును ఎంతవరకు స్వయంగా నిర్మించుకుంటాడు?',
        examples: [
          {
            en: 'Identity is neither a private essence nor a passive social label; it emerges through negotiation between self-interpretation and recognition by others.',
            native:
              'గుర్తింపు వ్యక్తిగత అంతఃసారం కాదు, నిష్క్రియ సామాజిక ముద్ర కూడా కాదు; స్వీయ వ్యాఖ్యానం, ఇతరుల గుర్తింపు మధ్య సంప్రదింపుల ద్వారా అది ఉద్భవిస్తుంది.',
          },
          {
            en: 'Multilingual speakers may inhabit different emotional and moral registers without possessing fragmented or inauthentic selves.',
            native:
              'బహుభాషావేత్తలు విభజితమైన లేదా ప్రామాణికత లేని స్వరూపాలు కలిగి ఉండకుండానే భిన్న భావోద్వేగ, నైతిక పరిధుల్లో జీవించగలరు.',
          },
          {
            en: 'Protecting collective identities can repair historical erasure, but it becomes oppressive when membership fixes what individuals are permitted to become.',
            native:
              'సామూహిక గుర్తింపులను కాపాడటం చారిత్రక చెరిపివేతను సరిచేయగలదు; అయితే సభ్యులు ఏమిగా మారవచ్చో సభ్యత్వమే స్థిరంగా నిర్ణయించినప్పుడు అది అణచివేతగా మారుతుంది.',
          },
        ],
      },
      hi: {
        word: 'पहचान',
        question:
          'जब भाषा, दूसरों से मिलने वाली मान्यता और विरासत में मिली सामाजिक श्रेणियाँ निजी चुनाव से पहले मौजूद हों, तब व्यक्ति अपनी पहचान का निर्माण किस हद तक स्वयं करता है?',
        examples: [
          {
            en: 'Identity is neither a private essence nor a passive social label; it emerges through negotiation between self-interpretation and recognition by others.',
            native:
              'पहचान न तो कोई निजी सार है, न निष्क्रिय सामाजिक ठप्पा; वह आत्म-व्याख्या और दूसरों से मिलने वाली मान्यता के बीच संवाद से उभरती है।',
          },
          {
            en: 'Multilingual speakers may inhabit different emotional and moral registers without possessing fragmented or inauthentic selves.',
            native:
              'बहुभाषी वक्ता खंडित या अप्रामाणिक व्यक्तित्व रखे बिना अलग-अलग भावनात्मक और नैतिक अभिव्यक्ति-क्षेत्रों में रह सकते हैं।',
          },
          {
            en: 'Protecting collective identities can repair historical erasure, but it becomes oppressive when membership fixes what individuals are permitted to become.',
            native:
              'सामूहिक पहचानों की रक्षा ऐतिहासिक विलोपन की भरपाई कर सकती है, लेकिन जब सदस्यता यह तय कर दे कि व्यक्तियों को क्या बनने की अनुमति है, तब वह दमनकारी हो जाती है।',
          },
        ],
      },
      es: {
        word: 'identidad',
        question:
          '¿Hasta qué punto construye el individuo su identidad cuando el lenguaje, el reconocimiento y las categorías sociales heredadas preceden a la elección personal?',
        examples: [
          {
            en: 'Identity is neither a private essence nor a passive social label; it emerges through negotiation between self-interpretation and recognition by others.',
            native:
              'La identidad no es una esencia privada ni una etiqueta social pasiva; surge de la negociación entre la interpretación propia y el reconocimiento ajeno.',
          },
          {
            en: 'Multilingual speakers may inhabit different emotional and moral registers without possessing fragmented or inauthentic selves.',
            native:
              'Las personas multilingües pueden habitar registros emocionales y morales distintos sin poseer identidades fragmentadas ni carentes de autenticidad.',
          },
          {
            en: 'Protecting collective identities can repair historical erasure, but it becomes oppressive when membership fixes what individuals are permitted to become.',
            native:
              'Proteger las identidades colectivas puede reparar un borrado histórico, pero resulta opresivo cuando la pertenencia determina en qué se permite convertirse a cada individuo.',
          },
        ],
      },
      zh: {
        word: '身份认同',
        question: '当语言、他人的承认以及继承而来的社会范畴先于个人选择存在时，身份在多大程度上由个人书写？',
        examples: [
          {
            en: 'Identity is neither a private essence nor a passive social label; it emerges through negotiation between self-interpretation and recognition by others.',
            native: '身份既不是私密的本质，也不是被动接受的社会标签；它产生于自我诠释与他人承认之间的协商。',
          },
          {
            en: 'Multilingual speakers may inhabit different emotional and moral registers without possessing fragmented or inauthentic selves.',
            native: '多语言使用者可以置身于不同的情感与道德语域，而不必因此拥有破碎或不真实的自我。',
          },
          {
            en: 'Protecting collective identities can repair historical erasure, but it becomes oppressive when membership fixes what individuals are permitted to become.',
            native:
              '保护集体身份可以弥补历史上的抹除，但当成员资格限定个人可以成为什么样的人时，这种保护就会变成压迫。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'inequality',
    questionText:
      'Why can inequality persist even when formal discrimination is prohibited and many individuals appear to compete under the same rules?',
    translations: {
      te: {
        word: 'అసమానత',
        question:
          'లాంఛనప్రాయ వివక్షను నిషేధించి, అనేక మంది ఒకే నియమాల కింద పోటీ పడుతున్నట్లు కనిపించినప్పటికీ అసమానత ఎందుకు కొనసాగగలదు?',
        examples: [
          {
            en: 'Apparently neutral institutions reproduce inequality when inherited wealth, social networks, and exposure to risk determine who can exploit the opportunities on offer.',
            native:
              'వారసత్వ సంపద, సామాజిక సంబంధాలు, ప్రమాదానికి గురయ్యే స్థాయి అందుబాటులో ఉన్న అవకాశాలను ఎవరు సద్వినియోగం చేసుకోగలరో నిర్ణయించినప్పుడు పైకి తటస్థంగా కనిపించే సంస్థలు అసమానతను పునరుత్పత్తి చేస్తాయి.',
          },
          {
            en: 'Redistribution addresses unequal outcomes, whereas structural reform asks how markets and public policy assign bargaining power before income is distributed.',
            native:
              'పునర్వితరణ అసమాన ఫలితాలను పరిష్కరిస్తుంది; నిర్మాణాత్మక సంస్కరణ మాత్రం ఆదాయం పంపిణీ కాకముందే మార్కెట్లు, ప్రజా విధానం బేరసారాల శక్తిని ఎలా కేటాయిస్తాయో ప్రశ్నిస్తుంది.',
          },
          {
            en: 'Some inequality may reward contribution, but extreme disparities become self-reinforcing when wealth purchases political influence and insulation from shared institutions.',
            native:
              'కొంత అసమానత చేసిన కృషికి ప్రతిఫలం ఇవ్వవచ్చు; అయితే సంపద రాజకీయ ప్రభావాన్ని, ఉమ్మడి సంస్థల నుంచి రక్షణను కొనుగోలు చేసినప్పుడు తీవ్ర వ్యత్యాసాలు తమను తామే బలపరచుకుంటాయి.',
          },
        ],
      },
      hi: {
        word: 'असमानता',
        question:
          'औपचारिक भेदभाव निषिद्ध होने और अनेक लोगों के समान नियमों के तहत प्रतिस्पर्धा करते दिखने पर भी असमानता क्यों बनी रह सकती है?',
        examples: [
          {
            en: 'Apparently neutral institutions reproduce inequality when inherited wealth, social networks, and exposure to risk determine who can exploit the opportunities on offer.',
            native:
              'जब विरासत में मिली संपत्ति, सामाजिक संपर्क और जोखिम के प्रति असुरक्षा यह तय करते हैं कि उपलब्ध अवसरों का लाभ कौन उठा सकता है, तब ऊपर से तटस्थ दिखने वाली संस्थाएँ असमानता को दोबारा पैदा करती हैं।',
          },
          {
            en: 'Redistribution addresses unequal outcomes, whereas structural reform asks how markets and public policy assign bargaining power before income is distributed.',
            native:
              'पुनर्वितरण असमान परिणामों को संबोधित करता है, जबकि संरचनात्मक सुधार पूछता है कि आय बाँटे जाने से पहले बाजार और सार्वजनिक नीति सौदेबाजी की शक्ति कैसे निर्धारित करते हैं।',
          },
          {
            en: 'Some inequality may reward contribution, but extreme disparities become self-reinforcing when wealth purchases political influence and insulation from shared institutions.',
            native:
              'कुछ असमानता योगदान को पुरस्कृत कर सकती है, लेकिन जब संपत्ति राजनीतिक प्रभाव और साझा संस्थाओं से बचाव खरीदने लगे, तब चरम विषमताएँ स्वयं को मजबूत करती जाती हैं।',
          },
        ],
      },
      es: {
        word: 'desigualdad',
        question:
          '¿Por qué puede persistir la desigualdad aun cuando se prohíbe la discriminación formal y muchas personas parecen competir bajo las mismas reglas?',
        examples: [
          {
            en: 'Apparently neutral institutions reproduce inequality when inherited wealth, social networks, and exposure to risk determine who can exploit the opportunities on offer.',
            native:
              'Las instituciones aparentemente neutrales reproducen la desigualdad cuando la riqueza heredada, las redes sociales y la exposición al riesgo determinan quién puede aprovechar las oportunidades disponibles.',
          },
          {
            en: 'Redistribution addresses unequal outcomes, whereas structural reform asks how markets and public policy assign bargaining power before income is distributed.',
            native:
              'La redistribución aborda resultados desiguales, mientras que la reforma estructural pregunta cómo los mercados y las políticas públicas asignan poder de negociación antes de distribuir los ingresos.',
          },
          {
            en: 'Some inequality may reward contribution, but extreme disparities become self-reinforcing when wealth purchases political influence and insulation from shared institutions.',
            native:
              'Cierta desigualdad puede recompensar la contribución, pero las disparidades extremas se perpetúan cuando la riqueza compra influencia política y aislamiento frente a las instituciones compartidas.',
          },
        ],
      },
      zh: {
        word: '不平等',
        question: '即使正式歧视已被禁止，而且许多人看似遵循相同规则竞争，不平等为何仍能持续？',
        examples: [
          {
            en: 'Apparently neutral institutions reproduce inequality when inherited wealth, social networks, and exposure to risk determine who can exploit the opportunities on offer.',
            native: '当继承财富、社会关系与风险暴露程度决定谁能利用现有机会时，看似中立的制度会不断复制不平等。',
          },
          {
            en: 'Redistribution addresses unequal outcomes, whereas structural reform asks how markets and public policy assign bargaining power before income is distributed.',
            native: '再分配处理的是不平等结果，而结构性改革追问市场与公共政策如何在收入分配之前配置议价能力。',
          },
          {
            en: 'Some inequality may reward contribution, but extreme disparities become self-reinforcing when wealth purchases political influence and insulation from shared institutions.',
            native:
              '某种程度的不平等或许能奖励贡献，但当财富可以买到政治影响力并使人脱离共同制度时，极端差距便会自我强化。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'sustainability',
    questionText:
      'Can an economy become genuinely sustainable while its stability still depends on expanding consumption and shifting ecological costs beyond its borders?',
    translations: {
      te: {
        word: 'సుస్థిరత',
        question:
          'వినియోగాన్ని విస్తరించడం, పర్యావరణ వ్యయాలను తన సరిహద్దుల అవతలకు మళ్లించడం పైనే స్థిరత్వం ఆధారపడుతున్నంతకాలం ఒక ఆర్థిక వ్యవస్థ నిజంగా సుస్థిరంగా మారగలదా?',
        examples: [
          {
            en: 'Efficiency gains reduce resource use per unit, yet rebound effects can erase those savings when lower costs stimulate greater overall consumption.',
            native:
              'సామర్థ్య మెరుగుదలలు ప్రతి యూనిట్‌కు వనరుల వినియోగాన్ని తగ్గిస్తాయి; అయితే తక్కువ ఖర్చులు మొత్తం వినియోగాన్ని పెంచినప్పుడు రీబౌండ్ ప్రభావాలు ఆ పొదుపును చెరిపివేయగలవు.',
          },
          {
            en: 'Green growth is plausible in selected sectors, but claims of absolute decoupling must account for imported emissions, material extraction, and biodiversity loss.',
            native:
              'ఎంచుకున్న రంగాల్లో హరిత వృద్ధి సాధ్యమే; అయితే వృద్ధిని పర్యావరణ హాని నుంచి పూర్తిగా వేరు చేశామనే వాదనలు దిగుమతి ఉద్గారాలు, ముడి పదార్థాల వెలికితీత, జీవవైవిధ్య నష్టాన్ని కూడా లెక్కలోకి తీసుకోవాలి.',
          },
          {
            en: 'Sustainability requires institutions that treat ecological limits as binding constraints while distributing the costs of transition without deepening poverty.',
            native:
              'పేదరికాన్ని మరింత పెంచకుండా పరివర్తన వ్యయాలను పంచుతూనే పర్యావరణ పరిమితులను తప్పనిసరి నియంత్రణలుగా పరిగణించే సంస్థలు సుస్థిరతకు అవసరం.',
          },
        ],
      },
      hi: {
        word: 'सततता',
        question:
          'जब किसी अर्थव्यवस्था की स्थिरता अब भी बढ़ते उपभोग और पर्यावरणीय लागतों को अपनी सीमाओं से बाहर धकेलने पर निर्भर हो, तब क्या वह वास्तव में सतत बन सकती है?',
        examples: [
          {
            en: 'Efficiency gains reduce resource use per unit, yet rebound effects can erase those savings when lower costs stimulate greater overall consumption.',
            native:
              'दक्षता में वृद्धि प्रति इकाई संसाधन उपयोग घटाती है, फिर भी कम लागत से कुल उपभोग बढ़ने पर प्रतिक्षेप प्रभाव उस बचत को मिटा सकते हैं।',
          },
          {
            en: 'Green growth is plausible in selected sectors, but claims of absolute decoupling must account for imported emissions, material extraction, and biodiversity loss.',
            native:
              'चुनिंदा क्षेत्रों में हरित विकास संभव है, लेकिन विकास और पर्यावरणीय क्षति के पूर्ण पृथक्करण के दावों में आयातित उत्सर्जन, कच्चे माल का निष्कर्षण और जैव विविधता की हानि भी शामिल होनी चाहिए।',
          },
          {
            en: 'Sustainability requires institutions that treat ecological limits as binding constraints while distributing the costs of transition without deepening poverty.',
            native:
              'सततता के लिए ऐसी संस्थाएँ चाहिए जो पर्यावरणीय सीमाओं को बाध्यकारी मानें और गरीबी बढ़ाए बिना परिवर्तन की लागतों का वितरण करें।',
          },
        ],
      },
      es: {
        word: 'sostenibilidad',
        question:
          '¿Puede una economía llegar a ser verdaderamente sostenible si su estabilidad aún depende de ampliar el consumo y trasladar los costes ecológicos más allá de sus fronteras?',
        examples: [
          {
            en: 'Efficiency gains reduce resource use per unit, yet rebound effects can erase those savings when lower costs stimulate greater overall consumption.',
            native:
              'Las mejoras de eficiencia reducen el uso de recursos por unidad, pero los efectos rebote pueden borrar ese ahorro cuando los menores costes estimulan un mayor consumo total.',
          },
          {
            en: 'Green growth is plausible in selected sectors, but claims of absolute decoupling must account for imported emissions, material extraction, and biodiversity loss.',
            native:
              'El crecimiento verde es plausible en ciertos sectores, pero las afirmaciones de desacoplamiento absoluto deben contabilizar las emisiones importadas, la extracción de materiales y la pérdida de biodiversidad.',
          },
          {
            en: 'Sustainability requires institutions that treat ecological limits as binding constraints while distributing the costs of transition without deepening poverty.',
            native:
              'La sostenibilidad requiere instituciones que traten los límites ecológicos como restricciones vinculantes y distribuyan los costes de la transición sin agravar la pobreza.',
          },
        ],
      },
      zh: {
        word: '可持续发展',
        question: '如果一个经济体的稳定仍依赖扩大消费，并把生态成本转移到境外，它能否实现真正的可持续发展？',
        examples: [
          {
            en: 'Efficiency gains reduce resource use per unit, yet rebound effects can erase those savings when lower costs stimulate greater overall consumption.',
            native: '效率提升会减少单位产出的资源使用，但当成本降低刺激总体消费增长时，反弹效应可能抵消这些节约。',
          },
          {
            en: 'Green growth is plausible in selected sectors, but claims of absolute decoupling must account for imported emissions, material extraction, and biodiversity loss.',
            native: '绿色增长在某些行业具有可行性，但宣称实现绝对脱钩时，必须计入进口排放、原料开采与生物多样性损失。',
          },
          {
            en: 'Sustainability requires institutions that treat ecological limits as binding constraints while distributing the costs of transition without deepening poverty.',
            native: '可持续发展需要制度把生态界限视为具有约束力的限制，同时在不加剧贫困的前提下分担转型成本。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'philosophy',
    questionText:
      'What distinctive contribution can philosophy make to public life when empirical sciences supply facts and democratic institutions authorize collective decisions?',
    translations: {
      te: {
        word: 'తత్వశాస్త్రం',
        question:
          'అనుభవాధారిత శాస్త్రాలు వాస్తవాలను అందిస్తూ, ప్రజాస్వామ్య సంస్థలు సామూహిక నిర్ణయాలకు అధికారాన్ని ఇస్తున్నప్పుడు ప్రజా జీవితానికి తత్వశాస్త్రం ఏ విశిష్ట సహకారం అందించగలదు?',
        examples: [
          {
            en: 'Philosophy clarifies the concepts hidden inside practical disputes, revealing when opponents invoke the same words while defending incompatible standards.',
            native:
              'ఆచరణాత్మక వివాదాల్లో దాగి ఉన్న భావనలను తత్వశాస్త్రం స్పష్టం చేస్తుంది; ప్రత్యర్థులు ఒకే పదాలను ఉపయోగిస్తూ పరస్పర విరుద్ధ ప్రమాణాలను సమర్థిస్తున్న సందర్భాలను అది బయటపెడుతుంది.',
          },
          {
            en: "Empirical evidence can predict a policy's effects, but it cannot by itself determine which risks, rights, or distributions a society ought to accept.",
            native:
              'అనుభవాధారిత సాక్ష్యం ఒక విధానం ప్రభావాలను అంచనా వేయగలదు; కానీ ఒక సమాజం ఏ ప్రమాదాలను, హక్కులను లేదా పంపిణీ విధానాలను అంగీకరించాలో నిర్ణయించడానికి అది ఒక్కటే సరిపోదు.',
          },
          {
            en: 'Philosophical criticism is publicly useful when it exposes assumptions and enlarges alternatives, not when abstraction becomes a substitute for accountable judgment.',
            native:
              'తాత్విక విమర్శ ఊహలను బయటపెట్టి ప్రత్యామ్నాయాలను విస్తరించినప్పుడు ప్రజలకు ఉపయోగపడుతుంది; నైరూప్యత జవాబుదారీ విచక్షణకు ప్రత్యామ్నాయమైనప్పుడు కాదు.',
          },
        ],
      },
      hi: {
        word: 'दर्शनशास्त्र',
        question:
          'जब अनुभवजन्य विज्ञान तथ्य उपलब्ध कराते हैं और लोकतांत्रिक संस्थाएँ सामूहिक निर्णयों को अधिकार देती हैं, तब दर्शन सार्वजनिक जीवन में कौन-सा विशिष्ट योगदान कर सकता है?',
        examples: [
          {
            en: 'Philosophy clarifies the concepts hidden inside practical disputes, revealing when opponents invoke the same words while defending incompatible standards.',
            native:
              'दर्शन व्यावहारिक विवादों में छिपी अवधारणाओं को स्पष्ट करता है और दिखाता है कि विरोधी कब उन्हीं शब्दों का प्रयोग करते हुए परस्पर असंगत मानकों का समर्थन कर रहे हैं।',
          },
          {
            en: "Empirical evidence can predict a policy's effects, but it cannot by itself determine which risks, rights, or distributions a society ought to accept.",
            native:
              'अनुभवजन्य साक्ष्य किसी नीति के प्रभावों का अनुमान लगा सकता है, लेकिन वह अपने आप यह तय नहीं कर सकता कि समाज को कौन-से जोखिम, अधिकार या वितरण स्वीकार करने चाहिए।',
          },
          {
            en: 'Philosophical criticism is publicly useful when it exposes assumptions and enlarges alternatives, not when abstraction becomes a substitute for accountable judgment.',
            native:
              'दार्शनिक आलोचना तब सार्वजनिक रूप से उपयोगी होती है जब वह मान्यताओं को उजागर करे और विकल्प बढ़ाए, न कि तब जब अमूर्तन जवाबदेह विवेक का स्थान ले ले।',
          },
        ],
      },
      es: {
        word: 'filosofía',
        question:
          '¿Qué contribución distintiva puede hacer la filosofía a la vida pública cuando las ciencias empíricas aportan hechos y las instituciones democráticas autorizan decisiones colectivas?',
        examples: [
          {
            en: 'Philosophy clarifies the concepts hidden inside practical disputes, revealing when opponents invoke the same words while defending incompatible standards.',
            native:
              'La filosofía aclara los conceptos ocultos en las disputas prácticas y revela cuándo los adversarios invocan las mismas palabras mientras defienden criterios incompatibles.',
          },
          {
            en: "Empirical evidence can predict a policy's effects, but it cannot by itself determine which risks, rights, or distributions a society ought to accept.",
            native:
              'La evidencia empírica puede predecir los efectos de una política, pero no puede determinar por sí sola qué riesgos, derechos o distribuciones debe aceptar una sociedad.',
          },
          {
            en: 'Philosophical criticism is publicly useful when it exposes assumptions and enlarges alternatives, not when abstraction becomes a substitute for accountable judgment.',
            native:
              'La crítica filosófica resulta públicamente útil cuando revela supuestos y amplía alternativas, no cuando la abstracción sustituye al juicio responsable.',
          },
        ],
      },
      zh: {
        word: '哲学',
        question: '当经验科学提供事实、民主制度授权集体决策时，哲学能为公共生活作出何种独特贡献？',
        examples: [
          {
            en: 'Philosophy clarifies the concepts hidden inside practical disputes, revealing when opponents invoke the same words while defending incompatible standards.',
            native: '哲学澄清实践争议中隐藏的概念，揭示对立双方何时使用相同词语，却在捍卫彼此不相容的标准。',
          },
          {
            en: "Empirical evidence can predict a policy's effects, but it cannot by itself determine which risks, rights, or distributions a society ought to accept.",
            native: '经验证据可以预测政策的影响，却无法单独决定社会应当接受哪些风险、权利安排或分配方式。',
          },
          {
            en: 'Philosophical criticism is publicly useful when it exposes assumptions and enlarges alternatives, not when abstraction becomes a substitute for accountable judgment.',
            native: '哲学批判只有在揭示假设并拓展选择时才具有公共价值，而不是让抽象思辨取代可问责的判断。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'ambiguity',
    questionText: 'Discuss how societies differ in their tolerance of ambiguity, and the consequences.',
    translations: {
      te: {
        word: 'అస్పష్టత',
        question: 'అస్పష్టత పట్ల సహనంలో సమాజాలు ఎలా భిన్నంగా ఉంటాయి మరియు దాని పరిణామాలు ఏమిటో చర్చించండి.',
        examples: [
          {
            en: 'Cultures that embrace ambiguity tend to foster creativity, whereas those that demand certainty often stifle experimentation and punish honest doubt.',
            native:
              'అస్పష్టతను ఆలింగనం చేసుకునే సంస్కృతులు సృజనాత్మకతను ప్రోత్సహిస్తాయి, అయితే ఖచ్చితత్వాన్ని కోరేవి ప్రయోగాలను కుదిపేస్తాయి, నిజాయితీగల సందేహాన్ని శిక్షిస్తాయి.',
          },
          {
            en: 'Ambiguity in language is not merely a defect to be eliminated; it is the space in which poetry, diplomacy, and humour become possible.',
            native:
              'భాషలోని అస్పష్టత తొలగించవలసిన లోపం మాత్రమే కాదు; కవిత్వం, దౌత్యం మరియు హాస్యం సాధ్యమయ్యే ఖాళీ అది.',
          },
          {
            en: 'A person who cannot tolerate ambiguity will grasp at simplistic answers, while the mature mind learns to act decisively without complete information.',
            native:
              'అస్పష్టతను సహించలేని వ్యక్తి సరళమైన సమాధానాల వైపు పరుగులు తీస్తాడు, అయితే పరిపక్వమైన మనస్థితి పూర్తి సమాచారం లేకుండానే దృఢంగా నిర్ణయం తీసుకోవడం నేర్చుకుంటుంది.',
          },
        ],
      },
      hi: {
        word: 'अस्पष्टता',
        question:
          'चर्चा कीजिए कि समाज अस्पष्टता के प्रति सहिष्णुता में कैसे भिन्न होते हैं और इसके क्या परिणाम होते हैं।',
        examples: [
          {
            en: 'Cultures that embrace ambiguity tend to foster creativity, whereas those that demand certainty often stifle experimentation and punish honest doubt.',
            native:
              'जो संस्कृतियाँ अस्पष्टता को अपनाती हैं, वे रचनात्मकता को बढ़ावा देती हैं, जबकि जो निश्चितता की माँग करती हैं, वे प्रयोग को दबा देती हैं और ईमानदार संदेह को दंडित करती हैं।',
          },
          {
            en: 'Ambiguity in language is not merely a defect to be eliminated; it is the space in which poetry, diplomacy, and humour become possible.',
            native:
              'भाषा में अस्पष्टता केवल दूर करने योग्य दोष नहीं है; यह वह स्थान है जहाँ कविता, कूटनीति और हास्य संभव होते हैं।',
          },
          {
            en: 'A person who cannot tolerate ambiguity will grasp at simplistic answers, while the mature mind learns to act decisively without complete information.',
            native:
              'जो व्यक्ति अस्पष्टता सहन नहीं कर सकता, वह सरल उत्तरों की ओर दौड़ता है, जबकि परिपक्व मन अधूरी जानकारी के बिना भी निर्णायक रूप से कार्य करना सीखता है।',
          },
        ],
      },
      es: {
        word: 'ambigüedad',
        question:
          'Analiza cómo difieren las sociedades en su tolerancia a la ambigüedad y cuáles son las consecuencias.',
        examples: [
          {
            en: 'Cultures that embrace ambiguity tend to foster creativity, whereas those that demand certainty often stifle experimentation and punish honest doubt.',
            native:
              'Las culturas que abrazan la ambigüedad tienden a fomentar la creatividad, mientras que las que exigen certeza a menudo ahogan la experimentación y castigan la duda honesta.',
          },
          {
            en: 'Ambiguity in language is not merely a defect to be eliminated; it is the space in which poetry, diplomacy, and humour become possible.',
            native:
              'La ambigüedad en el lenguaje no es solo un defecto que eliminar; es el espacio donde la poesía, la diplomacia y el humor se hacen posibles.',
          },
          {
            en: 'A person who cannot tolerate ambiguity will grasp at simplistic answers, while the mature mind learns to act decisively without complete information.',
            native:
              'Quien no tolera la ambigüedad se aferra a respuestas simplistas, mientras que la mente madura aprende a actuar con decisión sin información completa.',
          },
        ],
      },
      zh: {
        word: '模糊性',
        question: '请讨论不同社会对模糊性的容忍度有何差异，以及由此带来的后果。',
        examples: [
          {
            en: 'Cultures that embrace ambiguity tend to foster creativity, whereas those that demand certainty often stifle experimentation and punish honest doubt.',
            native: '拥抱模糊性的文化往往能孕育创造力，而一味追求确定性的文化则常常扼杀尝试，惩罚诚实的怀疑。',
          },
          {
            en: 'Ambiguity in language is not merely a defect to be eliminated; it is the space in which poetry, diplomacy, and humour become possible.',
            native: '语言中的模糊性并非只是需要消除的缺陷；它是诗歌、外交与幽默得以存在的空间。',
          },
          {
            en: 'A person who cannot tolerate ambiguity will grasp at simplistic answers, while the mature mind learns to act decisively without complete information.',
            native: '无法容忍模糊的人会抓住简单化的答案不放，而成熟的心智学会在信息不完备时依然果断行动。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'justice',
    questionText: 'Is justice primarily about punishment, fairness, or restoring what was broken?',
    translations: {
      te: {
        word: 'న్యాయం',
        question: 'న్యాయం అనేది ప్రధానంగా శిక్ష గురించా, సమానత్వం గురించా, లేదా దెబ్బతిన్న దాన్ని సరిచేయడం గురించా?',
        examples: [
          {
            en: 'Justice that focuses only on punishment may satisfy our anger, yet it often fails to repair the harm suffered by victims and communities.',
            native:
              'శిక్షపై మాత్రమే దృష్టి పెట్టే న్యాయం మన కోపాన్ని తీర్చగలదు, అయితే బాధితులకు మరియు సమాజాలకు జరిగిన హానిని సరిచేయడంలో తరచుగా విఫలమవుతుంది.',
          },
          {
            en: 'True fairness requires not merely treating everyone identically, but recognizing that people begin from profoundly unequal positions in life.',
            native:
              'నిజమైన సమానత్వం అందరితో ఒకేలా ప్రవర్తించడం మాత్రమే కాదు, ప్రజలు జీవితంలో అత్యంత అసమానమైన స్థానాల నుండి ప్రారంభమవుతారని గుర్తించడం కూడా అవసరం.',
          },
          {
            en: 'Restorative approaches ask what was broken and who must be healed, whereas retributive systems ask only who broke the rule and how to hurt them.',
            native:
              'పునరావాస విధానాలు ఏమి దెబ్బతింది, ఎవరు క్షోభిస్తున్నారు అని అడుగుతాయి, అయితే ప్రతీకార వ్యవస్థలు ఎవరు నియమం ఉల్లంఘించారు, వారిని ఎలా బాధపెట్టాలి అని మాత్రమే అడుగుతాయి.',
          },
        ],
      },
      hi: {
        word: 'न्याय',
        question: 'क्या न्याय मुख्य रूप से दंड, निष्पक्षता या टूटी हुई चीज़ को सुधारने के बारे में है?',
        examples: [
          {
            en: 'Justice that focuses only on punishment may satisfy our anger, yet it often fails to repair the harm suffered by victims and communities.',
            native:
              'जो न्याय केवल दंड पर केंद्रित हो, वह हमारे क्रोध को शांत कर सकता है, फिर भी वह पीड़ितों और समुदायों की हानि की भरपाई में अक्सर असफल रहता है।',
          },
          {
            en: 'True fairness requires not merely treating everyone identically, but recognizing that people begin from profoundly unequal positions in life.',
            native:
              'सच्ची निष्पक्षता के लिए सिर्फ़ सबके साथ एक जैसा व्यवहार ही नहीं, बल्कि यह पहचानना भी ज़रूरी है कि लोग जीवन में बेहद असमान स्थितियों से शुरुआत करते हैं।',
          },
          {
            en: 'Restorative approaches ask what was broken and who must be healed, whereas retributive systems ask only who broke the rule and how to hurt them.',
            native:
              'पुनर्स्थापनात्मक दृष्टिकोण पूछते हैं कि क्या टूटा और किसे चंगा किया जाना चाहिए, जबकि प्रतिशोधी व्यवस्थाएँ केवल यह पूछती हैं कि नियम किसने तोड़ा और उसे कैसे दर्द दिया जाए।',
          },
        ],
      },
      es: {
        word: 'justicia',
        question: '¿Es la justicia principalmente cuestión de castigo, de equidad o de reparar lo que se ha roto?',
        examples: [
          {
            en: 'Justice that focuses only on punishment may satisfy our anger, yet it often fails to repair the harm suffered by victims and communities.',
            native:
              'La justicia centrada solo en el castigo puede satisfacer nuestra ira, pero a menudo no repara el daño sufrido por las víctimas y las comunidades.',
          },
          {
            en: 'True fairness requires not merely treating everyone identically, but recognizing that people begin from profoundly unequal positions in life.',
            native:
              'La verdadera equidad no consiste únicamente en tratar a todos por igual, sino en reconocer que las personas parten de posiciones profundamente desiguales.',
          },
          {
            en: 'Restorative approaches ask what was broken and who must be healed, whereas retributive systems ask only who broke the rule and how to hurt them.',
            native:
              'Los enfoques restaurativos preguntan qué se rompió y a quién hay que sanar, mientras que los sistemas retributivos solo preguntan quién infringió la norma y cómo castigarlo.',
          },
        ],
      },
      zh: {
        word: '正义',
        question: '正义主要关乎惩罚、公平，还是修复被破坏的事物？',
        examples: [
          {
            en: 'Justice that focuses only on punishment may satisfy our anger, yet it often fails to repair the harm suffered by victims and communities.',
            native: '只关注惩罚的正义或许能平息我们的愤怒，却往往无法修复受害者和社群所遭受的伤害。',
          },
          {
            en: 'True fairness requires not merely treating everyone identically, but recognizing that people begin from profoundly unequal positions in life.',
            native: '真正的公平不仅仅是一视同仁，更在于承认人们的人生起点本就极不平等。',
          },
          {
            en: 'Restorative approaches ask what was broken and who must be healed, whereas retributive systems ask only who broke the rule and how to hurt them.',
            native: '恢复性司法追问的是什么被破坏、谁需要治愈，而报复性司法只问谁违反了规则、该如何让其付出代价。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'autonomy',
    questionText: "Should individual autonomy ever be restricted for a person's own good?",
    translations: {
      te: {
        word: 'స్వయం ప్రాధిపత్యం',
        question: 'ఒక వ్యక్తి స్వంత మంచి కోసం అతని స్వయం ప్రాధిపత్యాన్ని ఎప్పుడైనా పరిమితం చేయాలా?',
        examples: [
          {
            en: 'Autonomy is meaningless unless it includes the right to make choices that others consider unwise, provided no one else is harmed by them.',
            native:
              'ఇతరులు వివేకహీనమని భావించే ఎంపికలు చేసుకునే హక్కు లేకపోతే స్వయం ప్రాధిపత్యం అర్థరహితం — ఎవరికీ హాని జరగకుండా ఉంటేనే.',
          },
          {
            en: 'When the state restricts our freedom for our own protection, it quietly assumes that it knows our interests better than we ever could.',
            native:
              'మన రక్షణ కోసం ప్రభుత్వం మన స్వేచ్ఛను పరిమితం చేసినప్పుడు, మన ప్రయోజనాలు మనకంటే తనకు బాగా తెలుసని అది నిశ్శబ్దంగా ఊహిస్తుంది.',
          },
          {
            en: 'Children rightly have their autonomy curtailed because their judgment is undeveloped, yet extending the same logic to adults infantilizes citizens.',
            native:
              'పిల్లల తీర్పు ఇంకా పరిపక్వం కాకపోవడంతో వారి స్వయం ప్రాధిపత్యాన్ని పరిమితం చేయడం సరైనదే, అయితే అదే తర్కాన్ని పెద్దలకు వర్తింపజేయడం పౌరులను చిన్నపిల్లల్లా చేయడమే.',
          },
        ],
      },
      hi: {
        word: 'स्वायत्तता',
        question: 'क्या किसी व्यक्ति के अपने हित के लिए उसकी स्वायत्तता पर कभी रोक लगाई जानी चाहिए?',
        examples: [
          {
            en: 'Autonomy is meaningless unless it includes the right to make choices that others consider unwise, provided no one else is harmed by them.',
            native:
              'स्वायत्तता तब तक अर्थहीन है जब तक उसमें ऐसे चुनाव करने का अधिकार शामिल न हो जिन्हें दूसरे अनुचित मानते हों, बशर्ते किसी और को उनसे नुकसान न पहुँचे।',
          },
          {
            en: 'When the state restricts our freedom for our own protection, it quietly assumes that it knows our interests better than we ever could.',
            native:
              'जब राज्य हमारी रक्षा के लिए हमारी स्वतंत्रता सीमित करता है, तो वह चुपचाप यह मान लेता है कि वह हमारे हित हमसे बेहतर जानता है।',
          },
          {
            en: 'Children rightly have their autonomy curtailed because their judgment is undeveloped, yet extending the same logic to adults infantilizes citizens.',
            native:
              'बच्चों की स्वायत्तता पर रोक उचित है क्योंकि उनकी समझ अविकसित होती है, पर यही तर्क वयस्कों पर लागू करना नागरिकों को बच्चा बनाना है।',
          },
        ],
      },
      es: {
        word: 'autonomía',
        question: '¿Debería restringirse alguna vez la autonomía individual por el bien de la propia persona?',
        examples: [
          {
            en: 'Autonomy is meaningless unless it includes the right to make choices that others consider unwise, provided no one else is harmed by them.',
            native:
              'La autonomía carece de sentido si no incluye el derecho a tomar decisiones que otros consideran imprudentes, siempre que nadie más resulte perjudicado.',
          },
          {
            en: 'When the state restricts our freedom for our own protection, it quietly assumes that it knows our interests better than we ever could.',
            native:
              'Cuando el Estado restringe nuestra libertad para protegernos, asume tácitamente que conoce nuestros intereses mejor que nosotros mismos.',
          },
          {
            en: 'Children rightly have their autonomy curtailed because their judgment is undeveloped, yet extending the same logic to adults infantilizes citizens.',
            native:
              'Es justo limitar la autonomía de los niños porque su juicio es inmaduro, pero aplicar esa misma lógica a los adultos infantiliza a los ciudadanos.',
          },
        ],
      },
      zh: {
        word: '自主权',
        question: '是否应该为了一个人自身的利益而限制其个人自主权？',
        examples: [
          {
            en: 'Autonomy is meaningless unless it includes the right to make choices that others consider unwise, provided no one else is harmed by them.',
            native: '除非自主包含做出他人认为不明智之选择的权利——只要不伤害他人——否则自主便毫无意义。',
          },
          {
            en: 'When the state restricts our freedom for our own protection, it quietly assumes that it knows our interests better than we ever could.',
            native: '当国家以保护我们为由限制我们的自由时，它实际上默认自己比我们更了解我们的利益。',
          },
          {
            en: 'Children rightly have their autonomy curtailed because their judgment is undeveloped, yet extending the same logic to adults infantilizes citizens.',
            native:
              '限制儿童的自主权是正当的，因为他们的判断力尚未成熟；但把同样的逻辑套用到成年人身上，无异于把公民当作孩童。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'truth',
    questionText: 'Can a society function when its members no longer agree on what is true?',
    translations: {
      te: {
        word: 'సత్యం',
        question: 'ఏది సత్యమో దానిపై సభ్యులు ఇక ఏకాభిప్రాయపడనప్పుడు ఒక సమాజం పనిచేయగలదా?',
        examples: [
          {
            en: 'A shared reality is the invisible infrastructure of public life, and when it collapses, every disagreement becomes a war between rival worlds.',
            native:
              'పంచుకున్న వాస్తవికత ప్రజా జీవితం యొక్క అదృశ్యమైన మౌలిక సదుపాయం; అది కూలిపోయినప్పుడు, ప్రతి విభేదం ప్రత్యర్థి ప్రపంచాల మధ్య యుద్ధమవుతుంది.',
          },
          {
            en: 'Truth is not determined by consensus, yet a community that cannot agree on how to establish facts will soon be unable to govern itself.',
            native:
              'సత్యం సర్వసమ్మతితో నిర్ణయించబడదు, అయితే వాస్తవాలను ఎలా స్థాపించాలో ఏకమవ్వలేని సమాజం త్వరలో తమను తాము పాలించుకోలేని స్థితికి చేరుతుంది.',
          },
          {
            en: 'Those who declare that truth is whatever power says it is have usually mistaken their own voice for the voice of power.',
            native:
              'అధికారం చెప్పిందే సత్యమని ప్రకటించేవారు సాధారణంగా తమ స్వంత గొంతును అధికారం యొక్క గొంతుగా పొరపడతారు.',
          },
        ],
      },
      hi: {
        word: 'सत्य',
        question: 'जब समाज के सदस्य इस बात पर सहमत न हों कि सत्य क्या है, तो क्या वह समाज कार्य कर सकता है?',
        examples: [
          {
            en: 'A shared reality is the invisible infrastructure of public life, and when it collapses, every disagreement becomes a war between rival worlds.',
            native:
              'साझी वास्तविकता सार्वजनिक जीवन की अदृश्य बुनियाद है, और जब वह ढह जाती है, तो हर मतभेद प्रतिद्वंद्वी संसारों के बीच युद्ध बन जाता है।',
          },
          {
            en: 'Truth is not determined by consensus, yet a community that cannot agree on how to establish facts will soon be unable to govern itself.',
            native:
              'सत्य आम सहमति से तय नहीं होता, फिर भी जो समुदाय तथ्यों को स्थापित करने के तरीके पर सहमत न हो, वह शीघ्र ही खुद को शासित करने में असमर्थ हो जाता है।',
          },
          {
            en: 'Those who declare that truth is whatever power says it is have usually mistaken their own voice for the voice of power.',
            native:
              'जो लोग घोषित करते हैं कि सत्य वही है जो सत्ता कहे, वे प्रायः अपनी ही आवाज़ को सत्ता की आवाज़ समझ बैठते हैं।',
          },
        ],
      },
      es: {
        word: 'verdad',
        question: '¿Puede funcionar una sociedad cuando sus miembros ya no se ponen de acuerdo sobre qué es verdad?',
        examples: [
          {
            en: 'A shared reality is the invisible infrastructure of public life, and when it collapses, every disagreement becomes a war between rival worlds.',
            native:
              'Una realidad compartida es la infraestructura invisible de la vida pública, y cuando se derrumba, cada desacuerdo se convierte en una guerra entre mundos rivales.',
          },
          {
            en: 'Truth is not determined by consensus, yet a community that cannot agree on how to establish facts will soon be unable to govern itself.',
            native:
              'La verdad no se determina por consenso, pero una comunidad incapaz de acordar cómo establecer los hechos pronto será incapaz de gobernarse.',
          },
          {
            en: 'Those who declare that truth is whatever power says it is have usually mistaken their own voice for the voice of power.',
            native:
              'Quienes declaran que la verdad es lo que dice el poder suelen confundir su propia voz con la voz del poder.',
          },
        ],
      },
      zh: {
        word: '真理',
        question: '当一个社会的成员不再就何为真达成共识时，这个社会还能正常运转吗？',
        examples: [
          {
            en: 'A shared reality is the invisible infrastructure of public life, and when it collapses, every disagreement becomes a war between rival worlds.',
            native: '共同的现实是公共生活无形的基础设施；一旦它崩塌，每一次分歧都会沦为对立世界之间的战争。',
          },
          {
            en: 'Truth is not determined by consensus, yet a community that cannot agree on how to establish facts will soon be unable to govern itself.',
            native: '真理不由共识决定，但一个连如何确立事实都无法达成一致的共同体，很快将无力自治。',
          },
          {
            en: 'Those who declare that truth is whatever power says it is have usually mistaken their own voice for the voice of power.',
            native: '那些宣称权力所言之物即真理的人，往往误把自己的声音当成了权力的声音。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'power',
    questionText: 'Does power inevitably corrupt, or does it merely reveal character?',
    translations: {
      te: {
        word: 'అధికారం',
        question: 'అధికారం తప్పనిసరిగా చెడగొట్టుతుందా, లేదా అది కేవలం స్వభావాన్ని బహిర్గతం చేస్తుందా?',
        examples: [
          {
            en: 'Power corrupts not by changing people overnight, but by removing the everyday constraints that once forced them to consider other perspectives.',
            native:
              'అధికారం రాత్రికి రాత్రి మనుషుల్ని మార్చివేయడం ద్వారా కాకుండా, ఇతరుల దృక్కోణాలను పరిగణించమని బలవంతం చేసిన రోజువారీ ఆంక్షలను తొలగించడం ద్వారా చెడగొడుతుంది.',
          },
          {
            en: 'Perhaps power does not create monstrous desires so much as it grants ordinary desires the means to act without consequence.',
            native:
              'బహుశా అధికారం భయంకరమైన కోరికలను సృష్టించడం కంటే, సాధారణ కోరికలకు పర్యవసానాలు లేకుండా ప్రవర్తించే మార్గాన్ని ఇవ్వడమే ఎక్కువ.',
          },
          {
            en: 'The truest test of character is not how a person endures weakness, but how they treat those over whom they hold absolute advantage.',
            native:
              'స్వభావానికి నిజమైన పరీక్ష ఒక వ్యక్తి బలహీనతను ఎలా భరిస్తాడు అన్నది కాదు, తనకు పూర్తి ఆధిపత్యం ఉన్నవారితో ఎలా ప్రవర్తిస్తాడు అన్నదే.',
          },
        ],
      },
      hi: {
        word: 'सत्ता',
        question: 'क्या सत्ता अनिवार्य रूप से भ्रष्ट करती है, या वह केवल चरित्र को उजागर करती है?',
        examples: [
          {
            en: 'Power corrupts not by changing people overnight, but by removing the everyday constraints that once forced them to consider other perspectives.',
            native:
              'सत्ता रातोंरात लोगों को बदलकर भ्रष्ट नहीं करती, बल्कि उन रोज़मर्रा की बाध्यताओं को हटाकर करती है जो उन्हें कभी दूसरे दृष्टिकोण पर विचार करने को मजबूर करती थीं।',
          },
          {
            en: 'Perhaps power does not create monstrous desires so much as it grants ordinary desires the means to act without consequence.',
            native:
              'शायद सत्ता राक्षसी इच्छाएँ पैदा करने की बजाय साधारण इच्छाओं को बिना परिणाम भुगते कार्य करने का साधन दे देती है।',
          },
          {
            en: 'The truest test of character is not how a person endures weakness, but how they treat those over whom they hold absolute advantage.',
            native:
              'चरित्र की सबसे सच्ची परीक्षा यह नहीं कि कोई व्यक्ति कमज़ोरी कैसे सहता है, बल्कि यह कि वह उन लोगों के साथ कैसा व्यवहार करता है जिन पर उसका पूर्ण दबदबा है।',
          },
        ],
      },
      es: {
        word: 'poder',
        question: '¿Corrompe el poder inevitablemente o simplemente revela el carácter?',
        examples: [
          {
            en: 'Power corrupts not by changing people overnight, but by removing the everyday constraints that once forced them to consider other perspectives.',
            native:
              'El poder corrompe no cambiando a las personas de la noche a la mañana, sino eliminando las restricciones cotidianas que antes las obligaban a considerar otras perspectivas.',
          },
          {
            en: 'Perhaps power does not create monstrous desires so much as it grants ordinary desires the means to act without consequence.',
            native:
              'Quizá el poder no crea deseos monstruosos, sino que concede a los deseos ordinarios los medios para actuar sin consecuencias.',
          },
          {
            en: 'The truest test of character is not how a person endures weakness, but how they treat those over whom they hold absolute advantage.',
            native:
              'La prueba más verdadera del carácter no es cómo soporta una persona la debilidad, sino cómo trata a quienes están por completo a su merced.',
          },
        ],
      },
      zh: {
        word: '权力',
        question: '权力必然会腐蚀人，还是仅仅揭示人的本性？',
        examples: [
          {
            en: 'Power corrupts not by changing people overnight, but by removing the everyday constraints that once forced them to consider other perspectives.',
            native: '权力之腐蚀人，不在于一夜之间改变他们，而在于抽走了那些曾迫使他们顾及他人视角的日常约束。',
          },
          {
            en: 'Perhaps power does not create monstrous desires so much as it grants ordinary desires the means to act without consequence.',
            native: '或许权力并不制造可怕的欲望，而只是给了寻常欲望一条无需承担后果便可行事的通道。',
          },
          {
            en: 'The truest test of character is not how a person endures weakness, but how they treat those over whom they hold absolute advantage.',
            native: '对品格最真实的考验，不是看一个人如何忍受弱势，而是看他如何对待那些完全处于其支配之下的人。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'consciousness',
    questionText: 'Will we ever fully explain consciousness, and does the mystery matter?',
    translations: {
      te: {
        word: 'చైతన్యం',
        question: 'మనం చైతన్యాన్ని ఎప్పుడైనా పూర్తిగా వివరించగలమా, మరియు ఆ రహస్యం ముఖ్యమా?',
        examples: [
          {
            en: 'Consciousness remains the one phenomenon we know directly from the inside yet cannot observe from the outside, which is precisely why it resists science.',
            native:
              'చైతన్యం మనం లోపలి నుండి ప్రత్యక్షంగా తెలుసుకున్న ఏకైక దృగ్విషయం, అయితే బయటి నుండి గమనించలేనిది — శాస్త్రానికి అది ఎదురుగా నిలవడానికి కారణం కచ్చితంగా ఇదే.',
          },
          {
            en: 'Even if neuroscience maps every correlation between brain and experience, the question of why experience feels like anything at all would remain.',
            native:
              'న్యూరోసైన్స్ మెదడు మరియు అనుభవం మధ్య ప్రతి సంబంధాన్ని మ్యాప్ చేసినా, అనుభవం అసలు ఎందుకు ఏదోగా అనిపిస్తుందనే ప్రశ్న మాత్రం మిగిలే ఉంటుంది.',
          },
          {
            en: 'Whether machines could ever be conscious is not merely a technical question; it is a mirror in which we discover what we believe ourselves to be.',
            native:
              'యంత్రాలు ఎప్పుడైనా చైతన్యవంతం అవుతాయా అన్నది కేవలం సాంకేతిక ప్రశ్న కాదు; మనం మన గురించి ఏమి నమ్ముతున్నామో మనకు చూపించే అద్దం అది.',
          },
        ],
      },
      hi: {
        word: 'चेतना',
        question: 'क्या हम कभी चेतना की पूरी व्याख्या कर पाएँगे, और क्या यह रहस्य मायने रखता है?',
        examples: [
          {
            en: 'Consciousness remains the one phenomenon we know directly from the inside yet cannot observe from the outside, which is precisely why it resists science.',
            native:
              'चेतना एकमात्र ऐसी घटना है जिसे हम भीतर से प्रत्यक्ष जानते हैं, पर बाहर से देख नहीं सकते — और यही कारण है कि वह विज्ञान का सामना टालती है।',
          },
          {
            en: 'Even if neuroscience maps every correlation between brain and experience, the question of why experience feels like anything at all would remain.',
            native:
              'भले ही न्यूरोसाइंस मस्तिष्क और अनुभव के हर संबंध का मानचित्र बना ले, यह प्रश्न बना रहेगा कि अनुभव का महसूस होना ही क्यों होता है।',
          },
          {
            en: 'Whether machines could ever be conscious is not merely a technical question; it is a mirror in which we discover what we believe ourselves to be.',
            native:
              'क्या मशीनें कभी चेतन हो सकती हैं — यह केवल तकनीकी प्रश्न नहीं, बल्कि एक ऐसा आईना है जिसमें हम खोजते हैं कि हम खुद को क्या मानते हैं।',
          },
        ],
      },
      es: {
        word: 'conciencia',
        question: '¿Llegaremos a explicar por completo la conciencia, y importa realmente el misterio?',
        examples: [
          {
            en: 'Consciousness remains the one phenomenon we know directly from the inside yet cannot observe from the outside, which is precisely why it resists science.',
            native:
              'La conciencia sigue siendo el único fenómeno que conocemos directamente desde dentro pero que no podemos observar desde fuera, y por eso se resiste a la ciencia.',
          },
          {
            en: 'Even if neuroscience maps every correlation between brain and experience, the question of why experience feels like anything at all would remain.',
            native:
              'Aunque la neurociencia cartografiara cada correlación entre cerebro y experiencia, quedaría la pregunta de por qué la experiencia se siente como algo en absoluto.',
          },
          {
            en: 'Whether machines could ever be conscious is not merely a technical question; it is a mirror in which we discover what we believe ourselves to be.',
            native:
              'Si las máquinas pudieran ser conscientes no es solo una cuestión técnica; es un espejo en el que descubrimos lo que creemos ser.',
          },
        ],
      },
      zh: {
        word: '意识',
        question: '我们终有一天能彻底解释意识吗？这个谜团重要吗？',
        examples: [
          {
            en: 'Consciousness remains the one phenomenon we know directly from the inside yet cannot observe from the outside, which is precisely why it resists science.',
            native: '意识是我们唯一能从内部直接知晓、却无法从外部观察的现象，这正是它令科学束手无策的原因。',
          },
          {
            en: 'Even if neuroscience maps every correlation between brain and experience, the question of why experience feels like anything at all would remain.',
            native: '即便神经科学绘制出大脑与体验之间的每一重关联，“体验为何会有所感受”这个问题依然会悬而未决。',
          },
          {
            en: 'Whether machines could ever be conscious is not merely a technical question; it is a mirror in which we discover what we believe ourselves to be.',
            native: '机器能否拥有意识，并不只是一个技术问题；它是一面镜子，照出我们究竟认为自己是什么。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'morality',
    questionText: 'Is morality discovered, invented, or inherited — and does the answer change how we should live?',
    translations: {
      te: {
        word: 'నీతి',
        question:
          'నీతి కనుగొనబడినదా, కల్పించబడినదా, లేదా వారసత్వంగా వచ్చినదా — మరియు ఈ సమాధానం మనం ఎలా జీవించాలో మారుస్తుందా?',
        examples: [
          {
            en: 'If morality is merely inherited custom, then reformers are criminals of convention; if it is discovered truth, then some customs are simply crimes.',
            native:
              'నీతి కేవలం వారసత్వ ఆచారం అయితే, సంస్కర్తలు సంప్రదాయం యొక్క నేరస్థులు; అది కనుగొనబడిన సత్యం అయితే, కొన్ని ఆచారాలు కేవలం నేరాలే.',
          },
          {
            en: 'The fact that moral codes differ across eras proves less that morality is arbitrary than that our understanding of it matures painfully, like science.',
            native:
              'నైతిక సూత్రాలు యుగయుగాలుగా భిన్నంగా ఉండటం నీతి మనస్కుళ్లమని నిరూపించడం కంటే, శాస్త్రంలాగే దానిపై మన అవగాహన బాధాకరంగా పరిపక్వమవుతుందని చూపిస్తుంది.',
          },
          {
            en: 'We invent moral rules much as we invent games, yet once invented, they bind us as though they had always existed and always will.',
            native:
              'ఆటలను కల్పించినట్లే మనం నైతిక నియమాలను కల్పిస్తాం, అయితే ఒకసారి కల్పించాక, అవి ఎల్లప్పుడూ ఉండినవిగానూ ఎప్పటికీ ఉండేవిగానూ మనల్ని బంధిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'नीति',
        question:
          'क्या नीति खोजी जाती है, रची जाती है या विरासत में मिलती है — और क्या इसका उत्तर यह बदल देता है कि हमें कैसे जीना चाहिए?',
        examples: [
          {
            en: 'If morality is merely inherited custom, then reformers are criminals of convention; if it is discovered truth, then some customs are simply crimes.',
            native:
              'यदि नीति केवल विरासती रिवाज़ है, तो सुधारक परंपरा के अपराधी हैं; यदि वह खोजा हुआ सत्य है, तो कुछ रिवाज़ सीधे-सीधे अपराध हैं।',
          },
          {
            en: 'The fact that moral codes differ across eras proves less that morality is arbitrary than that our understanding of it matures painfully, like science.',
            native:
              'हर युग में नैतिक संहिताओं के भिन्न होने से यह कम सिद्ध होता है कि नीति मनमानी है, और यह अधिक कि उसकी हमारी समझ विज्ञान की तरह कष्टपूर्वक परिपक्व होती है।',
          },
          {
            en: 'We invent moral rules much as we invent games, yet once invented, they bind us as though they had always existed and always will.',
            native:
              'हम नैतिक नियम ठीक उसी तरह रचते हैं जिस तरह खेल रचते हैं, पर एक बार रचे जाने के बाद वे हमें ऐसे बाँधते हैं मानो वे सदा से थे और सदा रहेंगे।',
          },
        ],
      },
      es: {
        word: 'moralidad',
        question: '¿Se descubre, se inventa o se hereda la moralidad, y cambia la respuesta cómo deberíamos vivir?',
        examples: [
          {
            en: 'If morality is merely inherited custom, then reformers are criminals of convention; if it is discovered truth, then some customs are simply crimes.',
            native:
              'Si la moralidad no es más que costumbre heredada, los reformadores son criminales de la convención; si es verdad descubierta, algunas costumbres son simplemente crímenes.',
          },
          {
            en: 'The fact that moral codes differ across eras proves less that morality is arbitrary than that our understanding of it matures painfully, like science.',
            native:
              'Que los códigos morales difieran entre épocas demuestra menos que la moralidad es arbitraria que el hecho de que nuestra comprensión madura con dolor, como la ciencia.',
          },
          {
            en: 'We invent moral rules much as we invent games, yet once invented, they bind us as though they had always existed and always will.',
            native:
              'Inventamos las reglas morales como inventamos los juegos, pero una vez inventadas nos atan como si hubieran existido siempre y fueran a existir para siempre.',
          },
        ],
      },
      zh: {
        word: '道德',
        question: '道德是被发现的、被发明的，还是被继承的？这个答案会改变我们应当如何生活吗？',
        examples: [
          {
            en: 'If morality is merely inherited custom, then reformers are criminals of convention; if it is discovered truth, then some customs are simply crimes.',
            native:
              '如果道德不过是继承下来的习俗，那么改革者就是习俗的罪人；如果它是被发现的真理，那么某些习俗本身就是罪行。',
          },
          {
            en: 'The fact that moral codes differ across eras proves less that morality is arbitrary than that our understanding of it matures painfully, like science.',
            native: '道德准则随时代而异，与其说证明了道德是任意的，不如说证明我们对道德的理解像科学一样在阵痛中成熟。',
          },
          {
            en: 'We invent moral rules much as we invent games, yet once invented, they bind us as though they had always existed and always will.',
            native: '我们发明道德规则，正如我们发明游戏；然而一旦发明出来，它们便仿佛亘古长存、并将永远约束我们。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'language',
    questionText: 'Does the language we speak limit what we are able to think?',
    translations: {
      te: {
        word: 'భాష',
        question: 'మనం మాట్లాడే భాష మనం ఆలోచించగలిగిన దాన్ని పరిమితం చేస్తుందా?',
        examples: [
          {
            en: 'Language does not imprison thought so much as it builds the roads along which thought habitually travels, leaving other terrains reachable but rarely visited.',
            native:
              'భాష ఆలోచనను ఖైదు చేయడం కంటే, ఆలోచన అలవాటుగా ప్రయాణించే రహదారులను నిర్మిస్తుంది — ఇతర ప్రాంతాలు చేరవచ్చు కానీ అరుదుగా వెళ్తాం.',
          },
          {
            en: 'When a language lacks a word for a feeling, its speakers still feel it, though they may struggle to share it, refine it, or even notice it clearly.',
            native:
              'ఒక భాషలో ఏదో భావనకు మాట లేకపోయినా, దాని వాడుకర్లు దాన్ని అనుభవిస్తారే, కానీ పంచుకోవడం, రుద్దుకోవడం, స్పష్టంగా గమనించడం కష్టమవుతుంది.',
          },
          {
            en: 'Every translation betrays something of the original, which suggests that languages are not interchangeable containers but distinct instruments of attention.',
            native:
              'ప్రతి అనువాదం అసలులో ఏదో ఒక దాన్ని తప్పనిసరిగా ద్రోహం చేస్తుంది — భాషలు మార్చుకునే పాత్రలు కావు, వేర్వేరు శ్రద్ధ యంత్రాలు అని ఇది సూచిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'भाषा',
        question: 'क्या हमारी बोली जाने वाली भाषा हमारी सोचने की क्षमता को सीमित करती है?',
        examples: [
          {
            en: 'Language does not imprison thought so much as it builds the roads along which thought habitually travels, leaving other terrains reachable but rarely visited.',
            native:
              'भाषा सोच को क़ैद करने की बजाय उन सड़कों का निर्माण करती है जिन पर सोच आदतन चलती है; अन्य रास्ते पहुँच में होते हैं, पर कभी-कभी ही देखे जाते हैं।',
          },
          {
            en: 'When a language lacks a word for a feeling, its speakers still feel it, though they may struggle to share it, refine it, or even notice it clearly.',
            native:
              'जब किसी भाषा में किसी भावना के लिए शब्द न हो, तब भी उसके वक्ता उसे महसूस करते हैं, पर उसे बाँटने, परिष्कृत करने या स्पष्ट देखने में कठिनाई होती है।',
          },
          {
            en: 'Every translation betrays something of the original, which suggests that languages are not interchangeable containers but distinct instruments of attention.',
            native:
              'हर अनुवाद मूल के किसी-न-किसी पहलू की धोखाधड़ी करता है — इससे ज़ाहिर होता है कि भाषाएँ परस्पर बदली जाने योग्य पात्र नहीं, बल्कि ध्यान के भिन्न-भिन्न उपकरण हैं।',
          },
        ],
      },
      es: {
        word: 'lenguaje',
        question: '¿Limita el idioma que hablamos lo que somos capaces de pensar?',
        examples: [
          {
            en: 'Language does not imprison thought so much as it builds the roads along which thought habitually travels, leaving other terrains reachable but rarely visited.',
            native:
              'El lenguaje no aprisiona el pensamiento tanto como construye las carreteras por las que este viaja habitualmente, dejando otros terrenos accesibles pero rara vez visitados.',
          },
          {
            en: 'When a language lacks a word for a feeling, its speakers still feel it, though they may struggle to share it, refine it, or even notice it clearly.',
            native:
              'Cuando una lengua carece de palabra para un sentimiento, sus hablantes aún lo sienten, aunque les cueste compartirlo, refinarlo o incluso advertirlo con claridad.',
          },
          {
            en: 'Every translation betrays something of the original, which suggests that languages are not interchangeable containers but distinct instruments of attention.',
            native:
              'Toda traducción traiciona algo del original, lo que sugiere que las lenguas no son recipientes intercambiables sino instrumentos distintos de la atención.',
          },
        ],
      },
      zh: {
        word: '语言',
        question: '我们所使用的语言会限制我们的思考能力吗？',
        examples: [
          {
            en: 'Language does not imprison thought so much as it builds the roads along which thought habitually travels, leaving other terrains reachable but rarely visited.',
            native: '语言与其说囚禁思想，不如说修筑了思想习惯行走的道路——其他疆域虽可抵达，却鲜有人至。',
          },
          {
            en: 'When a language lacks a word for a feeling, its speakers still feel it, though they may struggle to share it, refine it, or even notice it clearly.',
            native: '当一种语言缺少表达某种感受的词时，使用者依然会感受到它，只是难以分享、提炼，甚至难以清晰地察觉。',
          },
          {
            en: 'Every translation betrays something of the original, which suggests that languages are not interchangeable containers but distinct instruments of attention.',
            native: '每一次翻译都难免背叛原文的某些东西——这说明语言并非可以互换的容器，而是各具特性的注意力工具。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'memory',
    questionText: 'Are our memories reliable records of the past, or stories we keep rewriting?',
    translations: {
      te: {
        word: 'జ్ఞాపకం',
        question: 'మన జ్ఞాపకాలు గతానికి నమ్మదగిన రికార్డులా, లేదా మనం నిరంతరం తిరగరాసుకునే కథలా?',
        examples: [
          {
            en: 'Memory is less an archive than a rehearsal: every time we recall an event, we perform it anew and alter it slightly for the next occasion.',
            native:
              'జ్ఞాపకం ఆర్కైవ్ కంటే రిహర్సల్ లాంటిది: ఏ సంఘటననైనా ప్రతిసారీ గుర్తుచేసుకున్నప్పుడు దాన్ని కొత్తగా ప్రదర్శిస్తాం, తదుపరి సారి కొంచెం మార్చేస్తాం.',
          },
          {
            en: 'The memories we are most confident about are often the ones we have rehearsed most, and rehearsal polishes a story rather than preserving a fact.',
            native:
              'మనం అత్యంత నమ్మకంగా ఉండే జ్ఞాపకాలు తరచుగా మనం అత్యధికంగా రిహర్సల్ చేసినవే — రిహర్సల్ వాస్తవాన్ని కాపాడడం కంటే కథను మెరుగుపెడుతుంది.',
          },
          {
            en: 'A person without memory would not merely lose the past; without a sense of having been someone, they would struggle to remain anyone at all.',
            native:
              'జ్ఞాపకం లేని వ్యక్తి కేవలం గతాన్నే కోల్పోడు; తాను ఎవరో అయ్యాననే భావన లేకుండా, అసలు ఎవరో అయి ఉండటం కూడా కష్టమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'स्मृति',
        question:
          'क्या हमारी यादें अतीत के विश्वसनीय अभिलेख हैं, या वे कहानियाँ हैं जिन्हें हम बार-बार फिर से लिखते रहते हैं?',
        examples: [
          {
            en: 'Memory is less an archive than a rehearsal: every time we recall an event, we perform it anew and alter it slightly for the next occasion.',
            native:
              'स्मृति अभिलेखागार से कम और पुनरभ्यास से अधिक है: हर बार जब हम किसी घटना को याद करते हैं, हम उसे नए सिरे से प्रस्तुत करते हैं और अगली बार के लिए थोड़ा बदल देते हैं।',
          },
          {
            en: 'The memories we are most confident about are often the ones we have rehearsed most, and rehearsal polishes a story rather than preserving a fact.',
            native:
              'जिन यादों पर हमें सबसे अधिक भरोसा होता है, वे अक्सर वही होती हैं जिनका हमने सबसे ज़्यादा अभ्यास किया है — और अभ्यास तथ्य को सहेजने की बजाय कहानी को चमकाता है।',
          },
          {
            en: 'A person without memory would not merely lose the past; without a sense of having been someone, they would struggle to remain anyone at all.',
            native:
              'जिस व्यक्ति को स्मृति न हो, वह केवल अतीत नहीं खोता; कभी कोई थे होने की भावना के बिना, वह कोई भी बने रहने में संघर्ष करेगा।',
          },
        ],
      },
      es: {
        word: 'memoria',
        question: '¿Son nuestros recuerdos registros fiables del pasado o relatos que no dejamos de reescribir?',
        examples: [
          {
            en: 'Memory is less an archive than a rehearsal: every time we recall an event, we perform it anew and alter it slightly for the next occasion.',
            native:
              'La memoria es menos un archivo que un ensayo: cada vez que recordamos un suceso lo representamos de nuevo y lo alteramos levemente para la próxima ocasión.',
          },
          {
            en: 'The memories we are most confident about are often the ones we have rehearsed most, and rehearsal polishes a story rather than preserving a fact.',
            native:
              'Los recuerdos de los que más seguros estamos suelen ser los que más hemos ensayado, y el ensayo pule una historia en lugar de preservar un hecho.',
          },
          {
            en: 'A person without memory would not merely lose the past; without a sense of having been someone, they would struggle to remain anyone at all.',
            native:
              'Quien careciera de memoria no solo perdería el pasado; sin la sensación de haber sido alguien, le costaría seguir siendo cualquiera.',
          },
        ],
      },
      zh: {
        word: '记忆',
        question: '我们的记忆是对过去可靠的记录，还是我们不断重写的叙事？',
        examples: [
          {
            en: 'Memory is less an archive than a rehearsal: every time we recall an event, we perform it anew and alter it slightly for the next occasion.',
            native: '记忆与其说是档案馆，不如说是排练：每当我们回忆一件事，都在重新演绎它，并为下一次悄然改动些许。',
          },
          {
            en: 'The memories we are most confident about are often the ones we have rehearsed most, and rehearsal polishes a story rather than preserving a fact.',
            native: '我们最自信的记忆，往往正是排练次数最多的那些——而排练打磨的是故事，不是事实。',
          },
          {
            en: 'A person without memory would not merely lose the past; without a sense of having been someone, they would struggle to remain anyone at all.',
            native: '失去记忆的人失去的不仅是过去；没有了“自己曾经是某个人”的感觉，他将难以成为任何人。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'progress',
    questionText: 'Is human progress real and inevitable, or a story we tell ourselves?',
    translations: {
      te: {
        word: 'పురోగతి',
        question: 'మానవ పురోగతి నిజమైనదా, తప్పనిసరిదా, లేదా మనం మనకు చెప్పుకునే కథనామే?',
        examples: [
          {
            en: 'Progress in technology is undeniable and cumulative, yet moral progress resembles a truce that every generation must renegotiate on worse terms than expected.',
            native:
              'సాంకేతిక పురోగతి నిరాకరించలేనిది, సంచితమైనది; అయితే నైతిక పురోగతి ఒక యుద్ధవిరమణ లాంటిది — ప్రతి తరం అనుకున్నదాని కంటే చెత్త నిబంధనలతో తిరిగి చర్చించుకోవాలి.',
          },
          {
            en: 'We measure progress by what we can count — lifespans, incomes, connections — while what we cannot count quietly determines whether longer lives are worth living.',
            native:
              'ఆయుర్దాయాలు, ఆదాయాలు, అనుసంధానాలు — లెక్కించగలిగినవాటితో మనం పురోగతిని కొలుస్తాం; అయితే లెక్కించలేనిదే దీర్ఘజీవితం విలువైనదా కాదా అనేది నిశ్శబ్దంగా నిర్ణయిస్తుంది.',
          },
          {
            en: 'The belief that history bends inevitably toward improvement is comforting, but it licenses complacency in precisely the moments that demand vigilance.',
            native:
              'చరిత్ర తప్పనిసరిగా మెరుగు వైపు వంగుతుందనే నమ్మకం ఓర్పునిస్తుంది, కానీ అప్రమత్తత అత్యంత అవసరమైన క్షణాల్లోనే ప్రళోభంగా ఉండడానికి అది అనుమతి ఇస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'प्रगति',
        question: 'क्या मानवीय प्रगति वास्तविक और अनिवार्य है, या वह एक कहानी है जो हम खुद को सुनाते हैं?',
        examples: [
          {
            en: 'Progress in technology is undeniable and cumulative, yet moral progress resembles a truce that every generation must renegotiate on worse terms than expected.',
            native:
              'तकनीकी प्रगति अकाट्य और संचयी है, पर नैतिक प्रगति एक युद्धविराम जैसी है जिसे हर पीढ़ी को उम्मीद से बदतर शर्तों पर फिर से तय करना पड़ता है।',
          },
          {
            en: 'We measure progress by what we can count — lifespans, incomes, connections — while what we cannot count quietly determines whether longer lives are worth living.',
            native:
              'हम प्रगति उससे मापते हैं जिसे गिन सकते हैं — आयु, आय, संपर्क — जबकि जिसे गिना नहीं जा सकता, वही चुपचाप तय करता है कि लंबा जीवन जीने लायक़ है या नहीं।',
          },
          {
            en: 'The belief that history bends inevitably toward improvement is comforting, but it licenses complacency in precisely the moments that demand vigilance.',
            native:
              'यह विश्वास कि इतिहास अनिवार्य रूप से सुधार की ओर झुकता है, सुखदायक है, पर यह ठीक उन्हीं क्षणों में शिथिलता का लाइसेंस देता है जब सतर्कता सबसे ज़रूरी होती है।',
          },
        ],
      },
      es: {
        word: 'progreso',
        question: '¿Es el progreso humano real e inevitable, o un relato que nos contamos a nosotros mismos?',
        examples: [
          {
            en: 'Progress in technology is undeniable and cumulative, yet moral progress resembles a truce that every generation must renegotiate on worse terms than expected.',
            native:
              'El progreso tecnológico es innegable y acumulativo, pero el progreso moral se parece a una tregua que cada generación debe renegociar en condiciones peores de las esperadas.',
          },
          {
            en: 'We measure progress by what we can count — lifespans, incomes, connections — while what we cannot count quietly determines whether longer lives are worth living.',
            native:
              'Medimos el progreso por lo que podemos contar — vidas, ingresos, conexiones — mientras lo incontable decide en silencio si una vida más larga merece ser vivida.',
          },
          {
            en: 'The belief that history bends inevitably toward improvement is comforting, but it licenses complacency in precisely the moments that demand vigilance.',
            native:
              'La creencia de que la historia se inclina inevitablemente hacia la mejora reconforta, pero autoriza la complacencia precisamente en los momentos que exigen vigilancia.',
          },
        ],
      },
      zh: {
        word: '进步',
        question: '人类的进步是真实而必然的，还是我们讲给自己听的故事？',
        examples: [
          {
            en: 'Progress in technology is undeniable and cumulative, yet moral progress resembles a truce that every generation must renegotiate on worse terms than expected.',
            native:
              '技术进步不可否认、不断累积；而道德进步更像一纸停战协定，每一代人都不得不在比预期更糟的条件下重新谈判。',
          },
          {
            en: 'We measure progress by what we can count — lifespans, incomes, connections — while what we cannot count quietly determines whether longer lives are worth living.',
            native:
              '我们用可以量化的东西衡量进步——寿命、收入、连接数——而无法量化的东西却在悄然决定：更长的生命是否值得过。',
          },
          {
            en: 'The belief that history bends inevitably toward improvement is comforting, but it licenses complacency in precisely the moments that demand vigilance.',
            native: '相信历史必然向善令人宽慰，但它恰恰在最需要警惕的时刻，为自满签发了通行证。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'tradition',
    questionText: 'When should a society preserve its traditions, and when should it abandon them?',
    translations: {
      te: {
        word: 'సంప్రదాయం',
        question: 'ఒక సమాజం తన సంప్రదాయాలను ఎప్పుడు కాపాడాలి, ఎప్పుడు వదులుకోవాలి?',
        examples: [
          {
            en: 'Tradition is the democracy of the dead, a way of letting ancestors vote, yet problems arise when their votes outnumber those of the living.',
            native:
              'సంప్రదాయం మృతుల ప్రజాస్వామ్యం — పూర్వీకులు ఓటు వేసే ఒక మార్గం; అయితే వారి ఓటులు జీవించి ఉన్నవారివి కంటే ఎక్కువయినప్పుడు సమస్యలు మొదలవుతాయి.',
          },
          {
            en: 'A tradition defended merely because it is old confuses survival with wisdom, for slavery too was ancient, and so was smallpox.',
            native:
              'పాతది కాబట్టని మాత్రమే సమర్థించే సంప్రదాయం మనుగడను జ్ఞానంతో గందరగోళం చేస్తుంది, ఎందుకంటే బానిసత్వం కూడా పురాతనమే, మశూచి కూడా అంతే.',
          },
          {
            en: 'The healthiest cultures treat tradition as a conversation rather than a commandment, keeping what still illuminates and discarding what merely constrains.',
            native:
              'ఆరోగ్యకరమైన సంస్కృతులు సంప్రదాయాన్ని ఆజ్ఞ కాకుండా సంభాషణగా చూస్తాయి — ఇంకా వెలుగునిచ్చేది ఉంచుకుని, కేవలం కట్టడి చేసేది వదిలేస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'परंपरा',
        question: 'किसी समाज को अपनी परंपराओं को कब संरक्षित करना चाहिए और कब त्याग देना चाहिए?',
        examples: [
          {
            en: 'Tradition is the democracy of the dead, a way of letting ancestors vote, yet problems arise when their votes outnumber those of the living.',
            native:
              'परंपरा मृतकों का लोकतंत्र है, पूर्वजों को मतदान करने देने का एक तरीका; पर समस्या तब उठती है जब उनके मत जीवितों के मतों से अधिक हो जाते हैं।',
          },
          {
            en: 'A tradition defended merely because it is old confuses survival with wisdom, for slavery too was ancient, and so was smallpox.',
            native:
              'जो परंपरा केवल इसलिए बचाई जाती है कि वह पुरानी है, वह अस्तित्व को ज्ञान से भ्रमित करती है, क्योंकि गुलामी भी प्राचीन थी, और चेचक भी।',
          },
          {
            en: 'The healthiest cultures treat tradition as a conversation rather than a commandment, keeping what still illuminates and discarding what merely constrains.',
            native:
              'सबसे स्वस्थ संस्कृतियाँ परंपरा को आज्ञा नहीं, संवाद मानती हैं — जो आज भी प्रकाश देती हो उसे रखती हैं, और जो केवल बाँधती हो उसे छोड़ देती हैं।',
          },
        ],
      },
      es: {
        word: 'tradición',
        question: '¿Cuándo debería una sociedad preservar sus tradiciones y cuándo abandonarlas?',
        examples: [
          {
            en: 'Tradition is the democracy of the dead, a way of letting ancestors vote, yet problems arise when their votes outnumber those of the living.',
            native:
              'La tradición es la democracia de los muertos, una forma de dejar votar a los antepasados, pero los problemas surgen cuando sus votos superan a los de los vivos.',
          },
          {
            en: 'A tradition defended merely because it is old confuses survival with wisdom, for slavery too was ancient, and so was smallpox.',
            native:
              'Una tradición defendida solo porque es antigua confunde la supervivencia con la sabiduría, pues la esclavitud también era antigua, y la viruela también.',
          },
          {
            en: 'The healthiest cultures treat tradition as a conversation rather than a commandment, keeping what still illuminates and discarding what merely constrains.',
            native:
              'Las culturas más sanas tratan la tradición como una conversación y no como un mandamiento, conservando lo que aún ilumina y descartando lo que solo constriñe.',
          },
        ],
      },
      zh: {
        word: '传统',
        question: '一个社会应当何时守护传统，又应当何时抛弃传统？',
        examples: [
          {
            en: 'Tradition is the democracy of the dead, a way of letting ancestors vote, yet problems arise when their votes outnumber those of the living.',
            native: '传统是逝者的民主，是让祖先参与投票的一种方式；但当他们的票数超过生者时，问题就来了。',
          },
          {
            en: 'A tradition defended merely because it is old confuses survival with wisdom, for slavery too was ancient, and so was smallpox.',
            native: '仅仅因为古老就为传统辩护，是把存续误当作智慧——奴隶制也曾古老，天花亦然。',
          },
          {
            en: 'The healthiest cultures treat tradition as a conversation rather than a commandment, keeping what still illuminates and discarding what merely constrains.',
            native: '最健康的文化把传统当作对话而非诫命，留住依然能照亮现实的东西，舍弃只会束缚人的东西。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'meritocracy',
    questionText: 'Is meritocracy a fair ideal, or does it disguise privilege as virtue?',
    translations: {
      te: {
        word: 'ప్రతిభా పాలన',
        question: 'ప్రతిభా పాలన న్యాయమైన ఆదర్శమా, లేదా అది ప్రత్యేక హక్కును గుణంగా ముసుగులో దాచుతుందా?',
        examples: [
          {
            en: 'Meritocracy promises that effort and talent will be rewarded, yet it quietly ignores how unequally the chances to develop that talent are distributed.',
            native:
              'శ్రమకు, ప్రతిభకు ప్రతిఫలం లభిస్తుందని ప్రతిభా పాలన హామీ ఇస్తుంది, అయితే ఆ ప్రతిభను పెంచుకునే అవకాశాలు ఎంత అసమానంగా పంపిణీ అవుతాయో అది నిశ్శబ్దంగా విస్మరిస్తుంది.',
          },
          {
            en: 'When winners believe their success is entirely deserved, gratitude gives way to arrogance, and the unsuccessful are blamed for their own defeat.',
            native:
              'విజేతలు తమ విజయం పూర్తిగా తమదే అని నమ్మినప్పుడు, కృతజ్ఞత స్థానం గర్వం పొందుతుంది, మరియు ఓటమి పాలైనవారు తమ ఓటమికి తామే కారణమని నిందించబడతారు.',
          },
          {
            en: 'A race in which some runners start far ahead may be fairly timed, but no honest observer would call its results a pure measure of merit.',
            native:
              'కొంతమంది పరుగెత్తేవారు చాలా ముందు నుండి ప్రారంభించే రేసును లెక్క నిజాయితీగా పెట్టవచ్చు, కానీ నిజాయితీగల పరిశీలకుడు దాని ఫలితాలను స్వచ్ఛమైన ప్రతిభా కొలమానమని అనడు.',
          },
        ],
      },
      hi: {
        word: 'योग्यतावाद',
        question: 'क्या योग्यतावाद एक निष्पक्ष आदर्श है, या वह विशेषाधिकार को गुण का वेश पहना देता है?',
        examples: [
          {
            en: 'Meritocracy promises that effort and talent will be rewarded, yet it quietly ignores how unequally the chances to develop that talent are distributed.',
            native:
              'योग्यतावाद वादा करता है कि मेहनत और प्रतिभा का फल मिलेगा, पर वह चुपचाप यह नज़रअंदाज़ कर देता है कि उस प्रतिभा को विकसित करने के अवसर कितने असमान रूप से बँटे हैं।',
          },
          {
            en: 'When winners believe their success is entirely deserved, gratitude gives way to arrogance, and the unsuccessful are blamed for their own defeat.',
            native:
              'जब विजेता मान लेते हैं कि उनकी सफलता पूरी तरह उनकी कमाई है, तो कृतज्ञता की जगह अहंकार ले लेता है, और असफलों को उनकी हार का दोषी ठहराया जाता है।',
          },
          {
            en: 'A race in which some runners start far ahead may be fairly timed, but no honest observer would call its results a pure measure of merit.',
            native:
              'जिस दौड़ में कुछ धावक बहुत आगे से शुरू करें, उसका समय निष्पक्ष हो सकता है, पर कोई ईमानदार दर्शक उसके नतीजों को योग्यता का शुद्ध माप नहीं कहेगा।',
          },
        ],
      },
      es: {
        word: 'meritocracia',
        question: '¿Es la meritocracia un ideal justo o disfraza el privilegio de virtud?',
        examples: [
          {
            en: 'Meritocracy promises that effort and talent will be rewarded, yet it quietly ignores how unequally the chances to develop that talent are distributed.',
            native:
              'La meritocracia promete recompensar el esfuerzo y el talento, pero ignora en silencio lo desigualmente que se distribuyen las oportunidades de desarrollar ese talento.',
          },
          {
            en: 'When winners believe their success is entirely deserved, gratitude gives way to arrogance, and the unsuccessful are blamed for their own defeat.',
            native:
              'Cuando los ganadores creen que su éxito es enteramente merecido, la gratitud cede ante la arrogancia, y a los perdedores se les culpa de su propia derrota.',
          },
          {
            en: 'A race in which some runners start far ahead may be fairly timed, but no honest observer would call its results a pure measure of merit.',
            native:
              'Una carrera en la que algunos corredores parten muy adelante puede cronometrarse con justicia, pero ningún observador honesto llamaría a sus resultados una medida pura del mérito.',
          },
        ],
      },
      zh: {
        word: '精英制度',
        question: '精英制度（唯才是举）是公平的理想，还是把特权伪装成了美德？',
        examples: [
          {
            en: 'Meritocracy promises that effort and talent will be rewarded, yet it quietly ignores how unequally the chances to develop that talent are distributed.',
            native: '精英制度许诺努力与才华必有回报，却悄然无视培养才华的机会分配得何等不均。',
          },
          {
            en: 'When winners believe their success is entirely deserved, gratitude gives way to arrogance, and the unsuccessful are blamed for their own defeat.',
            native: '当赢家深信自己的成功全凭应得，感恩便让位于傲慢，而失败者则被归咎于自己的失败。',
          },
          {
            en: 'A race in which some runners start far ahead may be fairly timed, but no honest observer would call its results a pure measure of merit.',
            native:
              '一场有些选手起跑线远在他人之前的比赛，计时或许公正，但任何诚实的旁观者都不会称其结果为才华的纯粹度量。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'freedom',
    questionText: 'Is freedom the absence of constraints, or the capacity to act meaningfully?',
    translations: {
      te: {
        word: 'స్వేచ్ఛ',
        question: 'స్వేచ్ఛ అంటే ఆంక్షల లేమినా, లేదా అర్థవంతంగా ప్రవర్తించే సామర్థ్యమా?',
        examples: [
          {
            en: 'A person left alone in a desert enjoys perfect negative freedom, yet without education, health, and community, that freedom is an empty formality.',
            native:
              'ఎడారిలో ఒంటరిగా వదిలివేయబడిన వ్యక్తి పరిపూర్ణ ప్రతికూల స్వేచ్ఛను అనుభవిస్తాడు, అయితే విద్య, ఆరోగ్యం, సమాజం లేకుండా ఆ స్వేచ్ఛ ఒక ఖాళీ ఔపచారికత.',
          },
          {
            en: 'Freedom from interference matters, but so does freedom to flourish, and the two visions collide whenever governments decide how much to provide.',
            native:
              'జోక్యం లేని స్వేచ్ఛ ముఖ్యమే, కానీ వర్ధిల్లే స్వేచ్ఛ కూడా ముఖ్యమే — ప్రభుత్వాలు ఎంత అందించాలో నిర్ణయించినప్పుడల్లా ఈ రెండు దృష్టిసారూప్యాలు ఢీకొంటాయి.',
          },
          {
            en: 'We surrender small freedoms daily for safety and convenience, rarely pausing to ask whether the exchange leaves us safer or merely more dependent.',
            native:
              'భద్రత కోసం, సౌకర్యం కోసం మనం రోజూ చిన్న చిన్న స్వేచ్ఛలను అప్పగిస్తాం — ఆ మార్పిడి మనల్ని సురక్షితంగా చేస్తుందా లేక కేవలం మరింత ఆధారపడేలా చేస్తుందా అని ఆలోచించడం అరుదు.',
          },
        ],
      },
      hi: {
        word: 'स्वतंत्रता',
        question: 'क्या स्वतंत्रता बाधाओं का अभाव है, या सार्थक ढंग से कार्य करने की क्षमता?',
        examples: [
          {
            en: 'A person left alone in a desert enjoys perfect negative freedom, yet without education, health, and community, that freedom is an empty formality.',
            native:
              'रेगिस्तान में अकेला छोड़ा व्यक्ति पूर्ण नकारात्मक स्वतंत्रता का आनंद लेता है, पर शिक्षा, स्वास्थ्य और समुदाय के बिना वह स्वतंत्रता एक खोखली औपचारिकता है।',
          },
          {
            en: 'Freedom from interference matters, but so does freedom to flourish, and the two visions collide whenever governments decide how much to provide.',
            native:
              'हस्तक्षेप से मुक्ति मायने रखती है, पर समृद्धि की स्वतंत्रता भी उतनी ही मायने रखती है — और जब भी सरकारें यह तय करती हैं कि कितना प्रदान करना है, ये दोनों दृष्टि टकराते हैं।',
          },
          {
            en: 'We surrender small freedoms daily for safety and convenience, rarely pausing to ask whether the exchange leaves us safer or merely more dependent.',
            native:
              'हम सुरक्षा और सुविधा के लिए रोज़ छोटी-छोटी स्वतंत्रताएँ सौंप देते हैं, और शायद ही कभी रुककर पूछते हैं कि यह सौदा हमें सुरक्षित बनाता है या केवल अधिक निर्भर।',
          },
        ],
      },
      es: {
        word: 'libertad',
        question: '¿Es la libertad la ausencia de restricciones o la capacidad de actuar con sentido?',
        examples: [
          {
            en: 'A person left alone in a desert enjoys perfect negative freedom, yet without education, health, and community, that freedom is an empty formality.',
            native:
              'Una persona sola en el desierto goza de perfecta libertad negativa, pero sin educación, salud y comunidad, esa libertad es una formalidad vacía.',
          },
          {
            en: 'Freedom from interference matters, but so does freedom to flourish, and the two visions collide whenever governments decide how much to provide.',
            native:
              'Importa la libertad frente a la interferencia, pero también la libertad para prosperar, y ambas visiones chocan cada vez que los gobiernos deciden cuánto proveer.',
          },
          {
            en: 'We surrender small freedoms daily for safety and convenience, rarely pausing to ask whether the exchange leaves us safer or merely more dependent.',
            native:
              'Cada día cedemos pequeñas libertades a cambio de seguridad y comodidad, sin detenernos apenas a preguntar si el trueque nos hace más seguros o solo más dependientes.',
          },
        ],
      },
      zh: {
        word: '自由',
        question: '自由是没有约束，还是能够有意义地行动的能力？',
        examples: [
          {
            en: 'A person left alone in a desert enjoys perfect negative freedom, yet without education, health, and community, that freedom is an empty formality.',
            native: '被独自留在沙漠中的人享有完美的消极自由，但没有教育、健康与社群，这种自由不过是空洞的形式。',
          },
          {
            en: 'Freedom from interference matters, but so does freedom to flourish, and the two visions collide whenever governments decide how much to provide.',
            native:
              '免于干预的自由固然重要，得以蓬勃发展的自由同样重要；每当政府决定该提供多少时，这两种自由观便会相撞。',
          },
          {
            en: 'We surrender small freedoms daily for safety and convenience, rarely pausing to ask whether the exchange leaves us safer or merely more dependent.',
            native:
              '我们每天为了安全与便利让渡小小的自由，却很少停下来问一问：这笔交换让我们更安全了，还是只是更依赖了？',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'responsibility',
    questionText: 'How far does personal responsibility extend when choices are shaped by circumstance?',
    translations: {
      te: {
        word: 'బాధ్యత',
        question: 'ఎంపికలు పరిస్థితులచే ఆకృత్రిమయ్యేటప్పుడు వ్యక్తిగత బాధ్యత ఎంతదూరం విస్తరిస్తుంది?',
        examples: [
          {
            en: 'Holding people responsible for choices they never freely made feels just only to those who have never had to make choices under such constraints.',
            native:
              'ఎప్పుడూ స్వేచ్ఛగా చేసుకోని ఎంపికలకు ప్రజల్ని బాధ్యుల్ని చేయడం, అటువంటి ఆంక్షల క్రింద ఎప్పుడూ ఎంపిక చేయనివారికి మాత్రమే న్యాయంగా అనిపిస్తుంది.',
          },
          {
            en: 'Responsibility is the price of agency: a society that excuses everything as circumstance soon finds that no one can be trusted with anything.',
            native:
              'బాధ్యత అనేది చర్యాసామర్థ్యానికి చెల్లించే ధర: ప్రతిదాన్ని పరిస్థితిగా క్షమించే సమాజం ఎవరినీ ఏ విషయంతోనూ నమ్మలేని స్థితికి త్వరలో చేరుతుంది.',
          },
          {
            en: 'The wisest stance may be to demand full responsibility from ourselves while extending generous understanding to others, though few manage this asymmetry.',
            native:
              'మన నుండి మనం పూర్తి బాధ్యతను కోరుకుంటూ, ఇతరులపై ఉదారమైన అవగాహన చూపడం అత్యంత జ్ఞానమైన వైఖరి కావచ్చు — అయితే ఈ అసమానత్వాన్ని కొనసాగించగలిగేవారు కొద్దిమందే.',
          },
        ],
      },
      hi: {
        word: 'ज़िम्मेदारी',
        question: 'जब चुनाव परिस्थितियों से आकार लेते हैं, तो व्यक्तिगत ज़िम्मेदारी कहाँ तक फैलती है?',
        examples: [
          {
            en: 'Holding people responsible for choices they never freely made feels just only to those who have never had to make choices under such constraints.',
            native:
              'उन चुनावों के लिए लोगों को ज़िम्मेदार ठहराना जो उन्होंने कभी स्वतंत्र रूप से नहीं किए, केवल उन्हें ही न्यायसंगत लगता है जिन्हें कभी ऐसी बाध्यताओं में चुनाव करना नहीं पड़ा।',
          },
          {
            en: 'Responsibility is the price of agency: a society that excuses everything as circumstance soon finds that no one can be trusted with anything.',
            native:
              'ज़िम्मेदारी कर्तृत्व की कीमत है: जो समाज हर चीज़ को परिस्थिति कहकर क्षमा कर देता है, वह शीघ्र ही पाता है कि किसी पर भी कोई भरोसा नहीं किया जा सकता।',
          },
          {
            en: 'The wisest stance may be to demand full responsibility from ourselves while extending generous understanding to others, though few manage this asymmetry.',
            native:
              'सबसे बुद्धिमान रुख़ शायद यही हो कि खुद से पूरी ज़िम्मेदारी माँगें और दूसरों के प्रति उदार समझ दिखाएँ, यद्यपि यह असमानता बहुत कम लोग निभा पाते हैं।',
          },
        ],
      },
      es: {
        word: 'responsabilidad',
        question:
          '¿Hasta dónde llega la responsabilidad personal cuando las decisiones están moldeadas por las circunstancias?',
        examples: [
          {
            en: 'Holding people responsible for choices they never freely made feels just only to those who have never had to make choices under such constraints.',
            native:
              'Hacer responsables a las personas de decisiones que nunca tomaron libremente solo parece justo a quienes jamás tuvieron que decidir bajo tales limitaciones.',
          },
          {
            en: 'Responsibility is the price of agency: a society that excuses everything as circumstance soon finds that no one can be trusted with anything.',
            native:
              'La responsabilidad es el precio de la agencia: una sociedad que lo excusa todo como circunstancia pronto descubre que no se puede confiar nada a nadie.',
          },
          {
            en: 'The wisest stance may be to demand full responsibility from ourselves while extending generous understanding to others, though few manage this asymmetry.',
            native:
              'Quizá la actitud más sabia sea exigirnos plena responsabilidad a nosotros mismos mientras extendemos comprensión generosa a los demás, aunque pocos logran esta asimetría.',
          },
        ],
      },
      zh: {
        word: '责任',
        question: '当选择受到环境的塑造时，个人责任的边界应延伸到哪里？',
        examples: [
          {
            en: 'Holding people responsible for choices they never freely made feels just only to those who have never had to make choices under such constraints.',
            native: '让人们为从未自由做出的选择负责，只有那些从未在此类约束下做过选择的人才会觉得这是公正的。',
          },
          {
            en: 'Responsibility is the price of agency: a society that excuses everything as circumstance soon finds that no one can be trusted with anything.',
            native: '责任是行动能力的代价：一个把一切都归咎于环境的社会，很快会发现任何人都无法托付任何事。',
          },
          {
            en: 'The wisest stance may be to demand full responsibility from ourselves while extending generous understanding to others, though few manage this asymmetry.',
            native:
              '最明智的姿态或许是：对自己要求百分之百的责任，对他人报以宽厚的理解——尽管很少有人能维持这种不对称。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'empathy',
    questionText: 'Can empathy be taught, or is it a fixed trait we are born with?',
    translations: {
      te: {
        word: 'సానుభూతి',
        question: 'సానుభూతిని నేర్పించగలమా, లేదా అది మనం పుట్టుకతో పొందే స్థిరమైన లక్షణమా?',
        examples: [
          {
            en: 'Empathy is less a gift than a muscle: it strengthens with deliberate use and atrophies in environments where no one models it for us.',
            native:
              'సానుభూతి వరం కంటే కండరం లాంటిది: ఉద్దేశపూర్వక వినియోగంతో బలపడుతుంది, ఎవరూ మనకు మార్గదర్శకంగా చూపని వాతావరణాల్లో క్షీణిస్తుంది.',
          },
          {
            en: 'Literature teaches empathy more effectively than lectures, because stories make us inhabit other minds rather than merely hear about them.',
            native:
              'సాహిత్యం ఉపన్యాసాల కంటే సానుభూతిని సమర్థంగా నేర్పుతుంది, ఎందుకంటే కథలు ఇతరుల మనసుల గురించి వినిపించడం కాకుండా వాటిలో నివసింపజేస్తాయి.',
          },
          {
            en: 'Even the most empathic person has limits, for feeling everyone’s pain without reserve leads not to compassion but to paralysis and burnout.',
            native:
              'అత్యంత సానుభూతి గల వ్యక్తికి కూడా పరిమితులు ఉంటాయి, ఎందుకంటే అందరి బాధను అపరిమితంగా అనుభవించడం కరుణకు కాకుండా స్తంభనానికి, క్షయానికి దారితీస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'समानुभूति',
        question: 'क्या समानुभूति सिखाई जा सकती है, या यह जन्म से मिला एक स्थिर गुण है?',
        examples: [
          {
            en: 'Empathy is less a gift than a muscle: it strengthens with deliberate use and atrophies in environments where no one models it for us.',
            native:
              'समानुभूति वरदान से कम और माँसपेशी से अधिक है: सचेतन उपयोग से मज़बूत होती है, और ऐसे वातावरण में क्षीण हो जाती है जहाँ कोई हमें उसका आदर्श नहीं दिखाता।',
          },
          {
            en: 'Literature teaches empathy more effectively than lectures, because stories make us inhabit other minds rather than merely hear about them.',
            native:
              'साहित्य व्याख्यानों की तुलना में समानुभूति अधिक प्रभावी ढंग से सिखाता है, क्योंकि कहानियाँ हमें दूसरों के मन के बारे में सुनाने की बजाय उनमें बसा देती हैं।',
          },
          {
            en: 'Even the most empathic person has limits, for feeling everyone’s pain without reserve leads not to compassion but to paralysis and burnout.',
            native:
              'सबसे समानुभूतिशील व्यक्ति की भी सीमाएँ होती हैं, क्योंकि सबका दर्द बिना रोक-टोक महसूस करना करुणा की ओर नहीं, बल्कि अवसाद और थकान की ओर ले जाता है।',
          },
        ],
      },
      es: {
        word: 'empatía',
        question: '¿Puede enseñarse la empatía o es un rasgo fijo con el que nacemos?',
        examples: [
          {
            en: 'Empathy is less a gift than a muscle: it strengthens with deliberate use and atrophies in environments where no one models it for us.',
            native:
              'La empatía es menos un don que un músculo: se fortalece con el uso deliberado y se atrofia en entornos donde nadie nos la ejemplifica.',
          },
          {
            en: 'Literature teaches empathy more effectively than lectures, because stories make us inhabit other minds rather than merely hear about them.',
            native:
              'La literatura enseña empatía mejor que las conferencias, porque las historias nos hacen habitar otras mentes en lugar de solo oír hablar de ellas.',
          },
          {
            en: 'Even the most empathic person has limits, for feeling everyone’s pain without reserve leads not to compassion but to paralysis and burnout.',
            native:
              'Incluso la persona más empática tiene límites, pues sentir el dolor de todos sin reserva no conduce a la compasión, sino a la parálisis y al agotamiento.',
          },
        ],
      },
      zh: {
        word: '共情',
        question: '共情是可以被教会的能力，还是与生俱来的固定特质？',
        examples: [
          {
            en: 'Empathy is less a gift than a muscle: it strengthens with deliberate use and atrophies in environments where no one models it for us.',
            native: '共情与其说是天赋，不如说是肌肉：刻意运用则增强，在无人示范的环境中则萎缩。',
          },
          {
            en: 'Literature teaches empathy more effectively than lectures, because stories make us inhabit other minds rather than merely hear about them.',
            native: '文学比说教更能有效地培养共情，因为故事让我们住进他人的心灵，而不是仅仅听人说起。',
          },
          {
            en: 'Even the most empathic person has limits, for feeling everyone’s pain without reserve leads not to compassion but to paralysis and burnout.',
            native: '即便最具共情力的人也有极限，因为毫无保留地感受所有人的痛苦，通往的不是慈悲，而是瘫痪与耗竭。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'compassion',
    questionText: 'Should compassion guide public policy, or is it too unreliable an emotion?',
    translations: {
      te: {
        word: 'కరుణ',
        question: 'కరుణ ప్రజా విధానాలకు మార్గదర్శకం కావాలా, లేదా అది చాలా నమ్మదగని భావోద్వేగమా?',
        examples: [
          {
            en: 'A policy built on compassion alone risks sentimentality, yet a policy built without any compassion risks becoming efficient cruelty with clean paperwork.',
            native:
              'కరుణ మీద మాత్రమే నిర్మించిన విధానం భావుకత్వ ప్రమాదాన్ని పొందుతుంది, అయితే కరుణ లేకుండా నిర్మించిన విధానం శుభ్రమైన కాగితాలతో సమర్థమైన క్రూరత్వమవుతుంది.',
          },
          {
            en: 'Compassion differs from pity in that it respects the sufferer’s dignity, whereas pity often consoles the giver at the expense of the receiver.',
            native:
              'కరుణ బాధపడేవారి గౌరవాన్ని గౌరవిస్తుంది, అయితే దయ తరచుగా పొందేవారి ఖర్చుతో ఇచ్చేవారిని ఓదారుస్తుంది — ఈ విషయంలోనే రెండిటి తేడా ఉంది.',
          },
          {
            en: 'Societies reveal their character not by how they reward the strong, but by how their laws and institutions treat those who can offer nothing in return.',
            native:
              'బలవంతులను ఎలా సత్కరిస్తాయో కాదు, ప్రతిఫలం ఏమీ ఇవ్వలేనివారితో వారి చట్టాలు, సంస్థలు ఎలా ప్రవర్తిస్తాయో దానితోనే సమాజాలు తమ స్వభావాన్ని వెల్లడిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'करुणा',
        question: 'क्या करुणा को लोक नीति का मार्गदर्शक होना चाहिए, या यह बहुत अविश्वसनीय भावना है?',
        examples: [
          {
            en: 'A policy built on compassion alone risks sentimentality, yet a policy built without any compassion risks becoming efficient cruelty with clean paperwork.',
            native:
              'केवल करुणा पर बनी नीति भावुकता का जोखिम उठाती है, पर बिना किसी करुणा के बनी नीति साफ़-सुथरे काग़ज़ात के साथ कुशल क्रूरता बनने का जोखिम उठाती है।',
          },
          {
            en: 'Compassion differs from pity in that it respects the sufferer’s dignity, whereas pity often consoles the giver at the expense of the receiver.',
            native:
              'करुणा दया से इसलिए भिन्न है कि वह पीड़ित की गरिमा का सम्मान करती है, जबकि दया अक्सर पाने वाले की कीमत पर देने वाले को सांत्वना देती है।',
          },
          {
            en: 'Societies reveal their character not by how they reward the strong, but by how their laws and institutions treat those who can offer nothing in return.',
            native:
              'समाज अपना चरित्र इससे नहीं दिखाते कि वे बलवानों को कैसे पुरस्कृत करते हैं, बल्कि इससे कि उनके क़ानून और संस्थाएँ उन लोगों के साथ कैसा व्यवहार करती हैं जो बदले में कुछ नहीं दे सकते।',
          },
        ],
      },
      es: {
        word: 'compasión',
        question: '¿Debería la compasión guiar las políticas públicas, o es una emoción demasiado poco fiable?',
        examples: [
          {
            en: 'A policy built on compassion alone risks sentimentality, yet a policy built without any compassion risks becoming efficient cruelty with clean paperwork.',
            native:
              'Una política basada solo en la compasión arriesga el sentimentalismo, pero una política sin ninguna compasión arriesga convertirse en crueldad eficiente con papeleo impecable.',
          },
          {
            en: 'Compassion differs from pity in that it respects the sufferer’s dignity, whereas pity often consoles the giver at the expense of the receiver.',
            native:
              'La compasión se distingue de la lástima en que respeta la dignidad del que sufre, mientras que la lástima a menudo consuela al que da a costa del que recibe.',
          },
          {
            en: 'Societies reveal their character not by how they reward the strong, but by how their laws and institutions treat those who can offer nothing in return.',
            native:
              'Las sociedades revelan su carácter no por cómo recompensan a los fuertes, sino por cómo sus leyes e instituciones tratan a quienes no pueden ofrecer nada a cambio.',
          },
        ],
      },
      zh: {
        word: '慈悲',
        question: '公共政策应当以慈悲为导向，还是说慈悲是一种太不可靠的情感？',
        examples: [
          {
            en: 'A policy built on compassion alone risks sentimentality, yet a policy built without any compassion risks becoming efficient cruelty with clean paperwork.',
            native: '仅靠慈悲构建的政策有沦为多愁善感的风险，而毫无慈悲的政策则可能沦为文书整洁的高效残酷。',
          },
          {
            en: 'Compassion differs from pity in that it respects the sufferer’s dignity, whereas pity often consoles the giver at the expense of the receiver.',
            native: '慈悲不同于怜悯：慈悲尊重受苦者的尊严，而怜悯往往以受者的代价安慰施者。',
          },
          {
            en: 'Societies reveal their character not by how they reward the strong, but by how their laws and institutions treat those who can offer nothing in return.',
            native: '一个社会显露出品格，不在于它如何奖赏强者，而在于它的法律与制度如何对待那些无以回报的人。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'integrity',
    questionText: 'Is integrity a fixed core of values, or consistency between what we say and do?',
    translations: {
      te: {
        word: 'నిజాయితీ',
        question: 'నిజాయితీ అనేది విలువల స్థిరమైన అంతర్గత భాగమా, లేదా మనం చెప్పేదానికి చేసేదానికి మధ్య స్థిరత్వమా?',
        examples: [
          {
            en: 'Integrity is tested not when principles cost nothing, but when keeping them demands sacrifices that no one would ever discover we refused to make.',
            native:
              'సూత్రాలకు ధర ఏమీ లేనప్పుడు కాదు, వాటిని పాటించడం ఎవరూ ఎప్పటికీ తెలుసుకోలేని త్యాగాలను కోరినప్పుడు నిజాయితీ పరీక్షించబడుతుంది.',
          },
          {
            en: 'A person of rigid integrity may become incapable of growth, for changing one’s mind honestly requires admitting that yesterday’s convictions were wrong.',
            native:
              'కఠినమైన నిజాయితీ గల వ్యక్తి ఎదుగుదలకు అసమర్థుడవుతాడు, ఎందుకంటే నిజాయితీగా అభిప్రాయం మార్చుకోవడం నిన్నటి విశ్వాసాలు తప్పని ఒప్పుకోవడమే.',
          },
          {
            en: 'Societies need integrity in institutions more than in heroes, because systems that reward honest behaviour make virtue ordinary instead of exceptional.',
            native:
              'సమాజాలకు హీరోల్లో కంటే సంస్థల్లో నిజాయితీ ఎక్కువగా అవసరం, ఎందుకంటే నిజాయితీగల ప్రవర్తనను బహుమతించే వ్యవస్థలు గుణాన్ని అసాధారణం కాకుండా సాధారణం చేస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'ईमानदारी',
        question: 'क्या ईमानदारी मूल्यों का एक अटल सार है, या हमारे कहने और करने के बीच की एकरूपता?',
        examples: [
          {
            en: 'Integrity is tested not when principles cost nothing, but when keeping them demands sacrifices that no one would ever discover we refused to make.',
            native:
              'ईमानदारी की परीक्षा तब नहीं होती जब सिद्धांतों की कोई कीमत नहीं होती, बल्कि तब होती है जब उन्हें निभाने के लिए ऐसे त्याग माँगे जाते हैं जिनसे इनकार किया हुआ कोई कभी जान न पाए।',
          },
          {
            en: 'A person of rigid integrity may become incapable of growth, for changing one’s mind honestly requires admitting that yesterday’s convictions were wrong.',
            native:
              'कठोर ईमानदारी वाला व्यक्ति विकास के प्रति असमर्थ हो सकता है, क्योंकि ईमानदारी से अपनी राय बदलने के लिए यह स्वीकारना पड़ता है कि कल की धारणाएँ ग़लत थीं।',
          },
          {
            en: 'Societies need integrity in institutions more than in heroes, because systems that reward honest behaviour make virtue ordinary instead of exceptional.',
            native:
              'समाजों को नायकों की तुलना में संस्थाओं में ईमानदारी की अधिक ज़रूरत है, क्योंकि जो व्यवस्थाएँ ईमानदार व्यवहार को पुरस्कृत करती हैं, वे सद्गुण को असाधारण के बजाय साधारण बना देती हैं।',
          },
        ],
      },
      es: {
        word: 'integridad',
        question: '¿Es la integridad un núcleo fijo de valores o la coherencia entre lo que decimos y hacemos?',
        examples: [
          {
            en: 'Integrity is tested not when principles cost nothing, but when keeping them demands sacrifices that no one would ever discover we refused to make.',
            native:
              'La integridad se pone a prueba no cuando los principios no cuestan nada, sino cuando mantenerlos exige sacrificios que nadie descubriría jamás que nos negamos a hacer.',
          },
          {
            en: 'A person of rigid integrity may become incapable of growth, for changing one’s mind honestly requires admitting that yesterday’s convictions were wrong.',
            native:
              'Una persona de integridad rígida puede volverse incapaz de crecer, pues cambiar de opinión con honestidad exige admitir que las convicciones de ayer eran erróneas.',
          },
          {
            en: 'Societies need integrity in institutions more than in heroes, because systems that reward honest behaviour make virtue ordinary instead of exceptional.',
            native:
              'Las sociedades necesitan integridad en las instituciones más que en los héroes, porque los sistemas que premian la conducta honesta hacen de la virtud algo ordinario y no excepcional.',
          },
        ],
      },
      zh: {
        word: '正直',
        question: '正直是一套固定不变的价值内核，还是言行之间的一以贯之？',
        examples: [
          {
            en: 'Integrity is tested not when principles cost nothing, but when keeping them demands sacrifices that no one would ever discover we refused to make.',
            native: '正直的考验，不在于坚守原则毫无代价之时，而在于守住原则需要付出无人知晓的牺牲之时。',
          },
          {
            en: 'A person of rigid integrity may become incapable of growth, for changing one’s mind honestly requires admitting that yesterday’s convictions were wrong.',
            native: '刚直不阿到僵硬的人可能丧失成长的能力，因为诚实地改变看法，意味着承认昨天的信念是错的。',
          },
          {
            en: 'Societies need integrity in institutions more than in heroes, because systems that reward honest behaviour make virtue ordinary instead of exceptional.',
            native: '社会更需要制度中的正直，而非英雄身上的正直，因为奖赏诚实行为的制度会让美德变得寻常，而非罕见。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'hypocrisy',
    questionText: 'Is hypocrisy the worst vice, or a universal human weakness we exaggerate?',
    translations: {
      te: {
        word: 'కపటం',
        question: 'కపటం అత్యంత చెత్త దుర్గుణమా, లేదా మనం పెద్దది చేసే సార్వత్రిక మానవ బలహీనతా?',
        examples: [
          {
            en: 'Hypocrisy offends us not because the act is false, but because it demands from others a standard the speaker quietly exempts himself from meeting.',
            native:
              'కపటం మనల్ని బాధపెట్టడానికి కారణం ఆ చర్య అబద్ధం కాబట్టి కాదు, మాట్లాడేవాడు తనను తాను నిశ్శబ్దంగా మినహాయించుకునే ప్రమాణాన్ని ఇతరులను కోరుతాడు కాబట్టి.',
          },
          {
            en: 'A hypocrite who preaches virtue still honours virtue in words, and societies need such tribute even from those who cannot pay it in deeds.',
            native:
              'గుణం గురించి ప్రబోధించే కపటి కూడా మాటల్లోనైనా గుణాన్ని గౌరవిస్తాడు — చర్యల్లో చెల్లించలేనివారి నుండైనా అటువంటి నివాళి సమాజాలకు అవసరం.',
          },
          {
            en: 'We detect hypocrisy in our enemies with precision and excuse it in ourselves as complexity, which is itself the most common form of the vice.',
            native:
              'శత్రువుల్లోని కపటాన్ని మనం ఖచ్చితంగా గుర్తిస్తాం, మనలోనిదాన్ని సంక్లిష్టతగా క్షమిస్తాం — ఇదే ఆ దుర్గుణం యొక్క అత్యంత సాధారణ రూపం.',
          },
        ],
      },
      hi: {
        word: 'पाखंड',
        question: 'क्या पाखंड सबसे बुरा दुर्गुण है, या एक सार्वभौमिक मानवीय कमज़ोरी है जिसे हम बढ़ा-चढ़ाकर देखते हैं?',
        examples: [
          {
            en: 'Hypocrisy offends us not because the act is false, but because it demands from others a standard the speaker quietly exempts himself from meeting.',
            native:
              'पाखंड हमें इसलिए नहीं चुभता कि कृत्य झूठा है, बल्कि इसलिए कि वह दूसरों से ऐसा मानक माँगता है जिससे वक्ता खुद को चुपचाप मुक्त रखता है।',
          },
          {
            en: 'A hypocrite who preaches virtue still honours virtue in words, and societies need such tribute even from those who cannot pay it in deeds.',
            native:
              'जो पाखंडी सद्गुण का उपदेश देता है, वह शब्दों में तो सद्गुण का सम्मान करता ही है, और समाजों को ऐसी श्रद्धांजलि की ज़रूरत है, भले वह कर्म में अदा न हो।',
          },
          {
            en: 'We detect hypocrisy in our enemies with precision and excuse it in ourselves as complexity, which is itself the most common form of the vice.',
            native:
              'हम अपने दुश्मनों में पाखंड को सटीकता से पकड़ते हैं और अपने भीतर के पाखंड को जटिलता कहकर क्षमा कर देते हैं — और यही इस दुर्गुण का सबसे सामान्य रूप है।',
          },
        ],
      },
      es: {
        word: 'hipocresía',
        question: '¿Es la hipocresía el peor de los vicios o una debilidad humana universal que exageramos?',
        examples: [
          {
            en: 'Hypocrisy offends us not because the act is false, but because it demands from others a standard the speaker quietly exempts himself from meeting.',
            native:
              'La hipocresía nos ofende no porque el acto sea falso, sino porque exige de los demás una norma de la que el orador se exime discretamente.',
          },
          {
            en: 'A hypocrite who preaches virtue still honours virtue in words, and societies need such tribute even from those who cannot pay it in deeds.',
            native:
              'El hipócrita que predica la virtud al menos la honra con palabras, y las sociedades necesitan ese tributo incluso de quienes no pueden pagarlo con hechos.',
          },
          {
            en: 'We detect hypocrisy in our enemies with precision and excuse it in ourselves as complexity, which is itself the most common form of the vice.',
            native:
              'Detectamos la hipocresía en nuestros enemigos con precisión y la excusamos en nosotros como complejidad, lo cual es en sí la forma más común del vicio.',
          },
        ],
      },
      zh: {
        word: '虚伪',
        question: '虚伪是最恶劣的恶行，还是一种被我们夸大的普遍人性弱点？',
        examples: [
          {
            en: 'Hypocrisy offends us not because the act is false, but because it demands from others a standard the speaker quietly exempts himself from meeting.',
            native: '虚伪之所以刺痛我们，不是因为行为本身虚假，而是因为它要求他人遵守一个言说者自己悄悄豁免的标准。',
          },
          {
            en: 'A hypocrite who preaches virtue still honours virtue in words, and societies need such tribute even from those who cannot pay it in deeds.',
            native: '宣讲美德的伪君子至少在言辞上仍向美德致敬，而社会需要这种致敬，哪怕它无法以行动兑现。',
          },
          {
            en: 'We detect hypocrisy in our enemies with precision and excuse it in ourselves as complexity, which is itself the most common form of the vice.',
            native: '我们能精准识破敌人身上的虚伪，却把自己身上的虚伪宽宥为“复杂”——这本身就是这种恶行最常见的形态。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'censorship',
    questionText: 'Can censorship ever be justified in a free society, and who should decide?',
    translations: {
      te: {
        word: 'సెన్సార్‌షిప్',
        question: 'స్వేచ్ఛాయుత సమాజంలో సెన్సార్‌షిప్ ఎప్పుడైనా సమర్థనీయమవుతుందా, మరియు ఎవరు నిర్ణయించాలి?',
        examples: [
          {
            en: 'Censorship begins by silencing speech everyone despises and ends by silencing speech the powerful find inconvenient, for the machinery outlives its purpose.',
            native:
              'సెన్సార్‌షిప్ అందరూ ద్వేషించే మాటను మౌనపరచడంతో మొదలై, అధికారులకు అసౌకర్యమైన మాటను మౌనపరచడంతో ముగుస్తుంది — యంత్రాంగం తన లక్ష్యాన్ని మించి జీవిస్తుంది.',
          },
          {
            en: 'The argument for censoring hatred assumes that suppressed ideas die, when history shows they more often fester underground and return wearing martyrdom.',
            native:
              'ద్వేషాన్ని సెన్సార్ చేయాలనే వాదన అణచివేసిన ఆలోచనలు చనిపోతాయని ఊహిస్తుంది, కానీ అవి భూగర్భంలో పుళ్లుపోసి, త్యాగి వేషంలో తిరిగి వస్తాయని చరిత్ర చూపిస్తుంది.',
          },
          {
            en: 'Trusting any authority to decide which words we may hear presumes that authority will never itself benefit from our ignorance, a presumption history mocks.',
            native:
              'మనం ఏ మాటలు వినవచ్చో నిర్ణయించే హక్కును ఏ అధికారికైనా అప్పగించడం, ఆ అధికారం మన అజ్ఞానం నుండి ఎప్పటికీ ప్రయోజనం పొందదని ఊహించడమే — చరిత్ర ఈ ఊహను ఎగతాళి చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'सेंसरशिप',
        question: 'क्या किसी स्वतंत्र समाज में सेंसरशिप कभी उचित ठहर सकती है, और यह निर्णय किसे लेना चाहिए?',
        examples: [
          {
            en: 'Censorship begins by silencing speech everyone despises and ends by silencing speech the powerful find inconvenient, for the machinery outlives its purpose.',
            native:
              'सेंसरशिप की शुरुआत उस वाणी को चुप कराने से होती है जिसे सभी घृणा करते हैं, और अंत उस वाणी को चुप कराने पर होता है जो सत्ताधारियों को असुविधाजनक लगे, क्योंकि मशीनरी अपने उद्देश्य से ज़्यादा जीवित रहती है।',
          },
          {
            en: 'The argument for censoring hatred assumes that suppressed ideas die, when history shows they more often fester underground and return wearing martyrdom.',
            native:
              'घृणा को सेंसर करने का तर्क यह मानता है कि दबाए गए विचार मर जाते हैं, जबकि इतिहास दिखाता है कि वे प्रायः भूमिगत होकर सड़ते हैं और शहादत का वेश पहनकर लौटते हैं।',
          },
          {
            en: 'Trusting any authority to decide which words we may hear presumes that authority will never itself benefit from our ignorance, a presumption history mocks.',
            native:
              'यह तय करने का अधिकार किसी भी अधिकारी को देना कि हम कौन से शब्द सुन सकते हैं, यह मानना है कि वह अधिकार कभी हमारी अजानता से लाभ नहीं उठाएगा — और इतिहास इस धारणा का मज़ाक उड़ाता है।',
          },
        ],
      },
      es: {
        word: 'censura',
        question: '¿Puede justificarse alguna vez la censura en una sociedad libre, y quién debería decidirlo?',
        examples: [
          {
            en: 'Censorship begins by silencing speech everyone despises and ends by silencing speech the powerful find inconvenient, for the machinery outlives its purpose.',
            native:
              'La censura empieza silenciando el discurso que todos desprecian y termina silenciando el que los poderosos encuentran incómodo, pues la maquinaria sobrevive a su propósito.',
          },
          {
            en: 'The argument for censoring hatred assumes that suppressed ideas die, when history shows they more often fester underground and return wearing martyrdom.',
            native:
              'El argumento de censurar el odio supone que las ideas suprimidas mueren, cuando la historia muestra que más bien se enconan en la clandestinidad y regresan vestidas de martirio.',
          },
          {
            en: 'Trusting any authority to decide which words we may hear presumes that authority will never itself benefit from our ignorance, a presumption history mocks.',
            native:
              'Confiar a cualquier autoridad decidir qué palabras podemos oír presume que esa autoridad jamás se beneficiará de nuestra ignorancia, presunción que la historia ridiculiza.',
          },
        ],
      },
      zh: {
        word: '审查制度',
        question: '在一个自由社会里，审查制度是否可能有正当性？又该由谁来裁断？',
        examples: [
          {
            en: 'Censorship begins by silencing speech everyone despises and ends by silencing speech the powerful find inconvenient, for the machinery outlives its purpose.',
            native:
              '审查始于让所有人都鄙夷的言论噤声，终于让权贵感到不便的言论噤声——因为这部机器的寿命总会超过它最初的目的。',
          },
          {
            en: 'The argument for censoring hatred assumes that suppressed ideas die, when history shows they more often fester underground and return wearing martyrdom.',
            native:
              '主张审查仇恨言论的人假设被压制的思想会消亡，而历史表明，它们更多是在地下溃烂，然后披着殉道的外衣归来。',
          },
          {
            en: 'Trusting any authority to decide which words we may hear presumes that authority will never itself benefit from our ignorance, a presumption history mocks.',
            native:
              '把“我们能听到什么话”的决定权托付给任何权威，等于假定该权威永远不会从我们的无知中获利——而历史嘲笑这种假定。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'propaganda',
    questionText: 'How does modern propaganda differ from the propaganda of the past?',
    translations: {
      te: {
        word: 'ప్రచారం',
        question: 'ఆధునిక ప్రచారం గతకాలపు ప్రచారం నుండి ఎలా భిన్నంగా ఉంది?',
        examples: [
          {
            en: 'Old propaganda shouted one message from a single tower; modern propaganda whispers a thousand tailored messages, each believing itself a private thought.',
            native:
              'పాత ప్రచారం ఒకే గోపురం నుండి ఒకే సందేశాన్ని అరిచేది; ఆధునిక ప్రచారం వేలాది అనుకూల సందేశాలను గుసగుసలాడుతుంది — ప్రతిదాన్ని ప్రైవేట్ ఆలోచనగా నమ్మేలా.',
          },
          {
            en: 'Where censorship once blocked information, today’s propagandists drown it, flooding every channel until citizens abandon the search for truth from exhaustion.',
            native:
              'ఇంతకుముందు సెన్సార్‌షిప్ సమాచారాన్ని అడ్డగించేది; నేటి ప్రచారకర్తలు దాన్ని ముంచెత్తుతారు — పౌరులు అలసిపోయి సత్యం వెతకడం మానేసేంతవరకు ప్రతి ఛానెల్‌ను నింపేస్తారు.',
          },
          {
            en: 'The most effective propaganda no longer demands belief; it merely demands cynicism, for a population that believes nothing will resist nothing.',
            native:
              'అత్యంత ప్రభావవంతమైన ప్రచారం ఇక నమ్మడాన్ని కోరదు; అది కేవలం నిరాశావాదాన్ని కోరుతుంది — ఎందుకంటే ఏదీ నమ్మని జనాభా దేనికీ ప్రతిఘటించదు.',
          },
        ],
      },
      hi: {
        word: 'प्रचार-प्रसार',
        question: 'आधुनिक प्रचार-प्रसार अतीत के प्रचार-प्रसार से कैसे भिन्न है?',
        examples: [
          {
            en: 'Old propaganda shouted one message from a single tower; modern propaganda whispers a thousand tailored messages, each believing itself a private thought.',
            native:
              'पुराना प्रचार एक ही मीनार से एक ही संदेश चिल्लाता था; आधुनिक प्रचार हज़ारों तैयार किए हुए संदेश फुसफुसाता है, जिनमें से हर एक खुद को निजी सोच समझता है।',
          },
          {
            en: 'Where censorship once blocked information, today’s propagandists drown it, flooding every channel until citizens abandon the search for truth from exhaustion.',
            native:
              'जहाँ कभी सेंसरशिप सूचना को रोकती थी, आज के प्रचारक उसे डुबो देते हैं — हर चैनल को इतना भर देते हैं कि नागरिक थककर सत्य की खोज छोड़ दें।',
          },
          {
            en: 'The most effective propaganda no longer demands belief; it merely demands cynicism, for a population that believes nothing will resist nothing.',
            native:
              'सबसे प्रभावी प्रचार अब विश्वास की माँग नहीं करता; वह केवल निराशावाद की माँग करता है, क्योंकि जो जनता कुछ नहीं मानती, वह किसी बात का विरोध भी नहीं करती।',
          },
        ],
      },
      es: {
        word: 'propaganda',
        question: '¿En qué se diferencia la propaganda moderna de la del pasado?',
        examples: [
          {
            en: 'Old propaganda shouted one message from a single tower; modern propaganda whispers a thousand tailored messages, each believing itself a private thought.',
            native:
              'La propaganda vieja gritaba un solo mensaje desde una única torre; la moderna susurra mil mensajes a medida, cada uno creyéndose un pensamiento privado.',
          },
          {
            en: 'Where censorship once blocked information, today’s propagandists drown it, flooding every channel until citizens abandon the search for truth from exhaustion.',
            native:
              'Donde antes la censura bloqueaba la información, los propagandistas de hoy la ahogan, inundando cada canal hasta que los ciudadanos abandonan exhaustos la búsqueda de la verdad.',
          },
          {
            en: 'The most effective propaganda no longer demands belief; it merely demands cynicism, for a population that believes nothing will resist nothing.',
            native:
              'La propaganda más eficaz ya no exige creencia; solo exige cinismo, porque una población que no cree nada no se resiste a nada.',
          },
        ],
      },
      zh: {
        word: '宣传',
        question: '现代宣传与过去的宣传有何不同？',
        examples: [
          {
            en: 'Old propaganda shouted one message from a single tower; modern propaganda whispers a thousand tailored messages, each believing itself a private thought.',
            native:
              '旧宣传从一座高塔上高喊同一条信息；现代宣传则低语着千百条量身定制的信息，而每一条都自以为是私人的想法。',
          },
          {
            en: 'Where censorship once blocked information, today’s propagandists drown it, flooding every channel until citizens abandon the search for truth from exhaustion.',
            native: '昔日审查靠封锁信息，今日的宣传者则靠淹没信息——灌满每一条渠道，直到公民精疲力竭地放弃追寻真相。',
          },
          {
            en: 'The most effective propaganda no longer demands belief; it merely demands cynicism, for a population that believes nothing will resist nothing.',
            native: '最有效的宣传已不再要求你相信任何东西；它只要求你犬儒——因为什么都不相信的人民，什么都不会反抗。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'surveillance',
    questionText: 'Does constant surveillance make us safer, or does it change who we are?',
    translations: {
      te: {
        word: 'నిఘా',
        question: 'నిరంతర నిఘా మనల్ని సురక్షితంగా చేస్తుందా, లేదా మనం ఎవరో మార్చేస్తుందా?',
        examples: [
          {
            en: 'Surveillance changes behaviour even when no one is watching, because the possibility of being seen teaches us to police our own thoughts and gestures.',
            native:
              'ఎవరూ చూడకపోయినా నిఘా ప్రవర్తనను మారుస్తుంది, ఎందుకంటే చూడబడే అవకాశం మన స్వంత ఆలోచనలను, సైగలను మనమే పోలీసు చేసుకోవడం నేర్పుతుంది.',
          },
          {
            en: 'A government that watches everyone trusts no one, and citizens who know they are watched learn to return the compliment with equal distrust.',
            native:
              'అందరినీ గమనించే ప్రభుత్వం ఎవరినీ నమ్మదు; తాము గమనించబడుతున్నామని తెలిసిన పౌరులు అదే అనుమానాన్ని కృతజ్ఞతగా తిరిగి ఇవ్వడం నేర్చుకుంటారు.',
          },
          {
            en: 'We accepted surveillance for security after every crisis, yet the cameras remained long after each danger passed, quietly redefining what privacy once meant.',
            native:
              'ప్రతి సంక్షోభం తర్వాత భద్రత కోసం మనం నిఘాను అంగీకరించాం, అయితే ప్రతి ప్రమాదం గతించిపోయిన చాలాకాలం తర్వాత కూడా కెమెరాలు మిగిలిపోయి, గోప్యత అంటే ఏమిటో నిశ్శబ్దంగా తిరిగి నిర్వచించాయి.',
          },
        ],
      },
      hi: {
        word: 'निगरानी',
        question: 'क्या निरंतर निगरानी हमें सुरक्षित बनाती है, या वह हमें बदल देती है कि हम कौन हैं?',
        examples: [
          {
            en: 'Surveillance changes behaviour even when no one is watching, because the possibility of being seen teaches us to police our own thoughts and gestures.',
            native:
              'निगरानी तब भी व्यवहार बदल देती है जब कोई देख नहीं रहा होता, क्योंकि देखे जाने की संभावना ही हमें अपने विचारों और इशारों की खुद पुलिसिंग करना सिखा देती है।',
          },
          {
            en: 'A government that watches everyone trusts no one, and citizens who know they are watched learn to return the compliment with equal distrust.',
            native:
              'जो सरकार सब पर नज़र रखती है, वह किसी पर भरोसा नहीं करती, और जो नागरिक जानते हैं कि उन पर नज़र है, वे भी उतना ही अविश्वास लौटाना सीख जाते हैं।',
          },
          {
            en: 'We accepted surveillance for security after every crisis, yet the cameras remained long after each danger passed, quietly redefining what privacy once meant.',
            native:
              'हर संकट के बाद हमने सुरक्षा के नाम पर निगरानी स्वीकार की, पर हर ख़तरे के बीतने के बहुत बाद भी कैमरे बने रहे, और चुपचाप निजता के अर्थ को फिर से परिभाषित करते रहे।',
          },
        ],
      },
      es: {
        word: 'vigilancia',
        question: '¿Nos hace más seguros la vigilancia constante o cambia quiénes somos?',
        examples: [
          {
            en: 'Surveillance changes behaviour even when no one is watching, because the possibility of being seen teaches us to police our own thoughts and gestures.',
            native:
              'La vigilancia cambia el comportamiento incluso cuando nadie mira, porque la posibilidad de ser vistos nos enseña a vigilar nuestros propios pensamientos y gestos.',
          },
          {
            en: 'A government that watches everyone trusts no one, and citizens who know they are watched learn to return the compliment with equal distrust.',
            native:
              'Un gobierno que vigila a todos no confía en nadie, y los ciudadanos que saben que son observados aprenden a devolver el cumplido con igual desconfianza.',
          },
          {
            en: 'We accepted surveillance for security after every crisis, yet the cameras remained long after each danger passed, quietly redefining what privacy once meant.',
            native:
              'Aceptamos la vigilancia por seguridad tras cada crisis, pero las cámaras permanecieron mucho después de pasado cada peligro, redefiniendo en silencio lo que significaba la privacidad.',
          },
        ],
      },
      zh: {
        word: '监控',
        question: '无处不在的监控让我们更安全，还是改变了我们是谁？',
        examples: [
          {
            en: 'Surveillance changes behaviour even when no one is watching, because the possibility of being seen teaches us to police our own thoughts and gestures.',
            native: '即便无人注视，监控也会改变行为，因为被看到的可能性会教会我们自我审查自己的思想和举止。',
          },
          {
            en: 'A government that watches everyone trusts no one, and citizens who know they are watched learn to return the compliment with equal distrust.',
            native: '监视所有人的政府不信任任何人，而知道自己被监视的公民，也学会以同等的不信任回敬。',
          },
          {
            en: 'We accepted surveillance for security after every crisis, yet the cameras remained long after each danger passed, quietly redefining what privacy once meant.',
            native:
              '每次危机之后，我们都以安全之名接受了监控；然而危险过去很久之后，摄像头依然矗立，悄然重新定义着隐私的含义。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'capitalism',
    questionText: 'Does capitalism reward innovation, or does it primarily reward ownership?',
    translations: {
      te: {
        word: 'మూలధనవాదం',
        question: 'మూలధనవాదం ఆవిష్కరణకు బహుమతి ఇస్తుందా, లేదా అది ప్రధానంగా యాజమాన్యానికే బహుమతి ఇస్తుందా?',
        examples: [
          {
            en: 'Capitalism excels at generating wealth and innovation, yet it measures everything except what matters most: meaning, belonging, and the health of communities.',
            native:
              'సంపదను, ఆవిష్కరణను సృష్టించడంలో మూలధనవాదం అత్యుత్తమం, అయితే అతి ముఖ్యమైనవి — అర్థం, అనుబంధం, సమాజాల ఆరోగ్యం — మినహా ప్రతిదాన్ని అది కొలుస్తుంది.',
          },
          {
            en: 'Markets are magnificent servants and terrible masters, for they price everything instantly but understand the value of nothing that cannot be sold.',
            native:
              'మార్కెట్లు అద్భుతమైన సేవకులు, భయంకరమైన యజమానులు — అవి ప్రతిదానికి వెంటనే ధర కడతాయి కానీ అమ్మలేని దాని విలువను అర్థం చేసుకోవు.',
          },
          {
            en: 'The defender and critic of capitalism often describe different centuries: one recalls poverty defeated, the other observes prosperity that forgot to be shared.',
            native:
              'మూలధనవాదం సమర్థకుడూ విమర్శకుడూ తరచుగా వేర్వేరు శతాబ్దాలను వర్ణిస్తారు: ఒకరు ఓడిపోయిన పేదరికాన్ని గుర్తుచేసుకుంటారు, మరొకరు పంచుకోవడం మర్చిపోయిన శ్రేయస్సును గమనిస్తారు.',
          },
        ],
      },
      hi: {
        word: 'पूंजीवाद',
        question: 'क्या पूंजीवाद नवाचार को पुरस्कृत करता है, या वह मुख्य रूप से स्वामित्व को ही पुरस्कृत करता है?',
        examples: [
          {
            en: 'Capitalism excels at generating wealth and innovation, yet it measures everything except what matters most: meaning, belonging, and the health of communities.',
            native:
              'पूंजीवाद धन और नवाचार पैदा करने में माहिर है, पर वह सब कुछ मापता है सिवाय उसके जो सबसे ज़रूरी है: अर्थ, अपनापन और समुदायों का स्वास्थ्य।',
          },
          {
            en: 'Markets are magnificent servants and terrible masters, for they price everything instantly but understand the value of nothing that cannot be sold.',
            native:
              'बाज़ार शानदार नौकर हैं और भयानक मालिक, क्योंकि वे हर चीज़ का दाम तुरंत लगा देते हैं, पर जिसे बेचा न जा सके उसकी कीमत समझ नहीं पाते।',
          },
          {
            en: 'The defender and critic of capitalism often describe different centuries: one recalls poverty defeated, the other observes prosperity that forgot to be shared.',
            native:
              'पूंजीवाद का समर्थक और आलोचक अक्सर अलग-अलग सदियों का वर्णन करते हैं: एक पराजित ग़रीबी को याद करता है, दूसरा उस समृद्धि को देखता है जो बाँटना भूल गई।',
          },
        ],
      },
      es: {
        word: 'capitalismo',
        question: '¿Recompensa el capitalismo la innovación o premia principalmente la propiedad?',
        examples: [
          {
            en: 'Capitalism excels at generating wealth and innovation, yet it measures everything except what matters most: meaning, belonging, and the health of communities.',
            native:
              'El capitalismo sobresale generando riqueza e innovación, pero lo mide todo excepto lo que más importa: el sentido, la pertenencia y la salud de las comunidades.',
          },
          {
            en: 'Markets are magnificent servants and terrible masters, for they price everything instantly but understand the value of nothing that cannot be sold.',
            native:
              'Los mercados son sirvientes magníficos y amos terribles, pues le ponen precio a todo al instante pero no comprenden el valor de nada que no pueda venderse.',
          },
          {
            en: 'The defender and critic of capitalism often describe different centuries: one recalls poverty defeated, the other observes prosperity that forgot to be shared.',
            native:
              'El defensor y el crítico del capitalismo suelen describir siglos distintos: uno recuerda la pobreza vencida, el otro observa una prosperidad que olvidó compartirse.',
          },
        ],
      },
      zh: {
        word: '资本主义',
        question: '资本主义奖励的是创新，还是主要奖励所有权？',
        examples: [
          {
            en: 'Capitalism excels at generating wealth and innovation, yet it measures everything except what matters most: meaning, belonging, and the health of communities.',
            native:
              '资本主义在创造财富与创新上卓尔不群，但它衡量一切，却唯独漏掉了最重要的东西：意义、归属感与社群的健康。',
          },
          {
            en: 'Markets are magnificent servants and terrible masters, for they price everything instantly but understand the value of nothing that cannot be sold.',
            native: '市场是极好的仆人，却是可怕的主人——它能瞬间为万物定价，却理解不了任何无法出售之物的价值。',
          },
          {
            en: 'The defender and critic of capitalism often describe different centuries: one recalls poverty defeated, the other observes prosperity that forgot to be shared.',
            native:
              '资本主义的捍卫者与批评者往往描述的是不同的世纪：一个记得被击败的贫困，另一个看见的是忘却了分享的繁荣。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'socialism',
    questionText: 'Can socialist ideals be realized without sacrificing individual initiative?',
    translations: {
      te: {
        word: 'సామ్యవాదం',
        question: 'వ్యక్తిగత చొరవను త్యాగం చేయకుండా సామ్యవాద ఆదర్శాలను సాకారం చేయగలమా?',
        examples: [
          {
            en: 'Socialism promises solidarity but must answer why central planners should know better than millions of people making their own small decisions daily.',
            native:
              'సామ్యవాదం ఐక్యతను వాగ్దానం చేస్తుంది, కానీ రోజూ తమ చిన్న చిన్న నిర్ణయాలు తామే తీసుకునే కోట్లాది మంది కంటే కేంద్ర ప్రణాళికా కర్తలకు ఎందుకు బాగా తెలియాలి అనే ప్రశ్నకు సమాధానం చెప్పాల్సిందే.',
          },
          {
            en: 'The deepest question is not whether the state should help the weak, but how much power the helpers may accumulate before help becomes command.',
            native:
              'బలహీనులకు రాష్ట్రం సహాయం చేయాలా వద్దా అన్నది లోతైన ప్రశ్న కాదు; సహాయకులు ఎంత అధికారం పేరుకుపోవచ్చు, సహాయం ఆజ్ఞగా మారేలోపు ఎంత అన్నదే అసలు ప్రశ్న.',
          },
          {
            en: 'Every society mixes market and collective provision; the honest debate concerns proportions, though ideologues insist on pretending purity is possible.',
            native:
              'ప్రతి సమాజం మార్కెట్, సముదాయ సరఫరాను మిళితం చేస్తుంది; నిజాయితీగల చర్చ అనుపాతాల గురించి — అయితే సిద్ధాంతకర్తలు స్వచ్ఛత సాధ్యమన్నట్లు నటిస్తూనే ఉంటారు.',
          },
        ],
      },
      hi: {
        word: 'समाजवाद',
        question: 'क्या व्यक्तिगत पहल का त्याग किए बिना समाजवादी आदर्शों को साकार किया जा सकता है?',
        examples: [
          {
            en: 'Socialism promises solidarity but must answer why central planners should know better than millions of people making their own small decisions daily.',
            native:
              'समाजवाद एकजुटता का वादा करता है, पर उसे यह जवाब देना होगा कि केंद्रीय योजनाकार रोज़ अपने छोटे-छोटे फ़ैसले लेने वाले लाखों लोगों से बेहतर क्यों जानेंगे।',
          },
          {
            en: 'The deepest question is not whether the state should help the weak, but how much power the helpers may accumulate before help becomes command.',
            native:
              'सबसे गहरा सवाल यह नहीं कि राज्य को कमज़ोरों की मदद करनी चाहिए या नहीं, बल्कि यह कि मददगार कितनी सत्ता जमा कर लें, इससे पहले कि मदद हुक्म बन जाए।',
          },
          {
            en: 'Every society mixes market and collective provision; the honest debate concerns proportions, though ideologues insist on pretending purity is possible.',
            native:
              'हर समाज बाज़ार और सामूहिक प्रबंध का मिश्रण है; ईमानदार बहस अनुपातों पर है, यद्यपि वैचारिक लोग ऐसा दिखावा करने पर अड़े रहते हैं मानो शुद्धता संभव है।',
          },
        ],
      },
      es: {
        word: 'socialismo',
        question: '¿Pueden realizarse los ideales socialistas sin sacrificar la iniciativa individual?',
        examples: [
          {
            en: 'Socialism promises solidarity but must answer why central planners should know better than millions of people making their own small decisions daily.',
            native:
              'El socialismo promete solidaridad, pero debe responder por qué los planificadores centrales sabrían más que millones de personas tomando sus propias pequeñas decisiones a diario.',
          },
          {
            en: 'The deepest question is not whether the state should help the weak, but how much power the helpers may accumulate before help becomes command.',
            native:
              'La cuestión más profunda no es si el Estado debe ayudar a los débiles, sino cuánto poder pueden acumular los ayudantes antes de que la ayuda se vuelva mandato.',
          },
          {
            en: 'Every society mixes market and collective provision; the honest debate concerns proportions, though ideologues insist on pretending purity is possible.',
            native:
              'Toda sociedad mezcla mercado y provisión colectiva; el debate honesto versa sobre proporciones, aunque los ideólogos insisten en fingir que la pureza es posible.',
          },
        ],
      },
      zh: {
        word: '社会主义',
        question: '能否在不牺牲个人主动性的前提下实现社会主义理想？',
        examples: [
          {
            en: 'Socialism promises solidarity but must answer why central planners should know better than millions of people making their own small decisions daily.',
            native:
              '社会主义许诺团结，但它必须回答：为什么中央计划者会比每天各自做出无数小决定的千百万普通人懂得更多？',
          },
          {
            en: 'The deepest question is not whether the state should help the weak, but how much power the helpers may accumulate before help becomes command.',
            native: '最深刻的问题不是国家该不该扶助弱者，而是扶助者可以积累多少权力，才不会让扶助变成命令。',
          },
          {
            en: 'Every society mixes market and collective provision; the honest debate concerns proportions, though ideologues insist on pretending purity is possible.',
            native: '每个社会都是市场与集体供给的混合体；诚实的争论关乎比例，尽管意识形态家们偏要装作纯粹是可能的。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'nationalism',
    questionText: 'Is nationalism a source of solidarity, or a recipe for conflict?',
    translations: {
      te: {
        word: 'జాతీయవాదం',
        question: 'జాతీయవాదం ఐక్యతకు వనరా, లేదా సంఘర్షణకు వంటకమా?',
        examples: [
          {
            en: 'Nationalism builds solidarity by drawing a circle of belonging, yet every circle that embraces some people necessarily excludes all the others.',
            native:
              'జాతీయవాదం అనుబంధం యొక్క వృత్తాన్ని గీయడం ద్వారా ఐక్యతను నిర్మిస్తుంది, అయితే కొంతమందిని ఆలింగనం చేసుకునే ప్రతి వృత్తం తప్పనిసరిగా మిగతా వారందరినీ బహిష్కరిస్తుంది.',
          },
          {
            en: 'The nation asks us to love millions we will never meet, which is magnificent when it breeds generosity and catastrophic when it breeds contempt for outsiders.',
            native:
              'మనం ఎప్పటికీ కలవని కోట్లాది మందిని ప్రేమించమని దేశం కోరుతుంది — అది ఉదారతను పుట్టించినప్పుడు అద్భుతం, బయటివారిపై తృణీకారాన్ని పుట్టించినప్పుడు విపత్తు.',
          },
          {
            en: 'History suggests nationalism is strongest exactly where shared civic life is weakest, filling the void left when institutions fail to inspire loyalty.',
            native:
              'పంచుకున్న పౌర జీవితం అత్యంత బలహీనంగా ఉన్న చోట్లే జాతీయవాదం అత్యంత బలంగా ఉంటుందని చరిత్ర సూచిస్తుంది — సంస్థలు నిష్ఠను ప్రేరేపించడంలో విఫలమైనప్పుడు మిగిలే శూన్యాన్ని అది నింపుతుంది.',
          },
        ],
      },
      hi: {
        word: 'राष्ट्रवाद',
        question: 'क्या राष्ट्रवाद एकजुटता का स्रोत है, या संघर्ष की विधि?',
        examples: [
          {
            en: 'Nationalism builds solidarity by drawing a circle of belonging, yet every circle that embraces some people necessarily excludes all the others.',
            native:
              'राष्ट्रवाद अपनेपन का एक घेरा खींचकर एकजुटता बनाता है, पर हर घेरा जो कुछ लोगों को अपनाता है, वह अनिवार्य रूप से बाक़ी सबको बाहर करता है।',
          },
          {
            en: 'The nation asks us to love millions we will never meet, which is magnificent when it breeds generosity and catastrophic when it breeds contempt for outsiders.',
            native:
              'राष्ट्र हमसे उन लाखों लोगों से प्रेम करने को कहता है जिनसे हम कभी नहीं मिलेंगे — यह तब भव्य है जब यह उदारता जन्म दे, और तब विनाशकारी जब यह बाहर वालों के प्रति तिरस्कार जन्म दे।',
          },
          {
            en: 'History suggests nationalism is strongest exactly where shared civic life is weakest, filling the void left when institutions fail to inspire loyalty.',
            native:
              'इतिहास बताता है कि राष्ट्रवाद ठीक वहीं सबसे मज़बूत होता है जहाँ साझा नागरिक जीवन सबसे कमज़ोर होता है — जब संस्थाएँ निष्ठा प्रेरित करने में असफल होती हैं, तो वह उस रिक्ति को भर देता है।',
          },
        ],
      },
      es: {
        word: 'nacionalismo',
        question: '¿Es el nacionalismo una fuente de solidaridad o una receta para el conflicto?',
        examples: [
          {
            en: 'Nationalism builds solidarity by drawing a circle of belonging, yet every circle that embraces some people necessarily excludes all the others.',
            native:
              'El nacionalismo construye solidaridad trazando un círculo de pertenencia, pero todo círculo que abraza a algunos excluye necesariamente a todos los demás.',
          },
          {
            en: 'The nation asks us to love millions we will never meet, which is magnificent when it breeds generosity and catastrophic when it breeds contempt for outsiders.',
            native:
              'La nación nos pide amar a millones que jamás conoceremos, lo cual es magnífico cuando engendra generosidad y catastrófico cuando engendra desprecio por el de fuera.',
          },
          {
            en: 'History suggests nationalism is strongest exactly where shared civic life is weakest, filling the void left when institutions fail to inspire loyalty.',
            native:
              'La historia sugiere que el nacionalismo es más fuerte precisamente donde la vida cívica compartida es más débil, llenando el vacío que dejan las instituciones cuando no inspiran lealtad.',
          },
        ],
      },
      zh: {
        word: '民族主义',
        question: '民族主义是凝聚力的源泉，还是冲突的配方？',
        examples: [
          {
            en: 'Nationalism builds solidarity by drawing a circle of belonging, yet every circle that embraces some people necessarily excludes all the others.',
            native: '民族主义通过画出一个归属的圆圈来建立团结，但每一个拥抱一些人的圆圈，都必然把其余所有人排除在外。',
          },
          {
            en: 'The nation asks us to love millions we will never meet, which is magnificent when it breeds generosity and catastrophic when it breeds contempt for outsiders.',
            native:
              '国家要求我们去爱千百万素未谋面的人——当它孕育慷慨时，这很伟大；当它孕育对外人的蔑视时，这便是灾难。',
          },
          {
            en: 'History suggests nationalism is strongest exactly where shared civic life is weakest, filling the void left when institutions fail to inspire loyalty.',
            native: '历史表明，民族主义恰恰在共同公民生活最薄弱之处最为强大，它填补的是制度无法激发忠诚时留下的真空。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'patriotism',
    questionText: 'How does healthy patriotism differ from blind loyalty to one’s country?',
    translations: {
      te: {
        word: 'దేశభక్తి',
        question: 'ఆరోగ్యకరమైన దేశభక్తికి, దేశం పట్ల గుడ్డి నిష్ఠకు మధ్య తేడా ఏమిటి?',
        examples: [
          {
            en: 'The patriot loves his country as an adult loves a parent: with clear eyes about its faults and steady commitment to its better possibilities.',
            native:
              'దేశభక్తుడు తన దేశాన్ని పెద్దవాడు తల్లిదండ్రులను ప్రేమించినట్లు ప్రేమిస్తాడు: దాని లోపాలపై స్పష్టమైన దృష్టితో, దాని మెరుగైన అవకాశాలపై స్థిరమైన నిబద్ధతతో.',
          },
          {
            en: 'Blind loyalty demands agreement with every policy, whereas genuine patriotism sometimes requires resisting one’s government in the name of one’s country.',
            native:
              'గుడ్డి నిష్ఠ ప్రతి విధానంతో ఏకీభవింపను కోరుతుంది, అయితే నిజమైన దేశభక్తి కొన్నిసార్లు దేశం పేరుతో ప్రభుత్వాన్ని ఎదిరించడాన్ని కూడా కోరుతుంది.',
          },
          {
            en: 'We should be suspicious of leaders who wrap themselves in flags, for patriotism loudly advertised is usually a product being sold to the trusting.',
            native:
              'జెండాల్లో చుట్టుకునే నాయకుల పట్ల మనం అనుమానంగా ఉండాలి, ఎందుకంటే గట్టిగా ప్రకటించబడే దేశభక్తి సాధారణంగా నమ్మేవారికి అమ్మబడే వస్తువే.',
          },
        ],
      },
      hi: {
        word: 'देशभक्ति',
        question: 'स्वस्थ देशभक्ति और अपने देश के प्रति अंधी निष्ठा में क्या अंतर है?',
        examples: [
          {
            en: 'The patriot loves his country as an adult loves a parent: with clear eyes about its faults and steady commitment to its better possibilities.',
            native:
              'देशभक्त अपने देश से वैसे प्रेम करता है जैसे कोई वयस्क अपने माता-पिता से करता है: उसकी कमियों को स्पष्ट देखते हुए और उसकी बेहतर संभावनाओं के प्रति दृढ़ प्रतिबद्धता के साथ।',
          },
          {
            en: 'Blind loyalty demands agreement with every policy, whereas genuine patriotism sometimes requires resisting one’s government in the name of one’s country.',
            native:
              'अंधी निष्ठा हर नीति से सहमति माँगती है, जबकि सच्ची देशभक्ति कभी-कभी देश के नाम पर अपनी ही सरकार का विरोध करने की माँग करती है।',
          },
          {
            en: 'We should be suspicious of leaders who wrap themselves in flags, for patriotism loudly advertised is usually a product being sold to the trusting.',
            native:
              'हमें उन नेताओं से सावधान रहना चाहिए जो खुद को झंडों में लपेटते हैं, क्योंकि ज़ोर-शोर से विज्ञापित देशभक्ति प्रायः भरोसेमंदों को बेचा जाने वाला माल होती है।',
          },
        ],
      },
      es: {
        word: 'patriotismo',
        question: '¿En qué se diferencia el patriotismo sano de la lealtad ciega al propio país?',
        examples: [
          {
            en: 'The patriot loves his country as an adult loves a parent: with clear eyes about its faults and steady commitment to its better possibilities.',
            native:
              'El patriota ama a su país como un adulto ama a un padre: con los ojos claros ante sus defectos y con compromiso firme hacia sus mejores posibilidades.',
          },
          {
            en: 'Blind loyalty demands agreement with every policy, whereas genuine patriotism sometimes requires resisting one’s government in the name of one’s country.',
            native:
              'La lealtad ciega exige estar de acuerdo con cada política, mientras que el patriotismo genuino a veces exige resistir al propio gobierno en nombre del propio país.',
          },
          {
            en: 'We should be suspicious of leaders who wrap themselves in flags, for patriotism loudly advertised is usually a product being sold to the trusting.',
            native:
              'Deberíamos desconfiar de los líderes que se envuelven en banderas, porque el patriotismo anunciado a gritos suele ser un producto vendido a los crédulos.',
          },
        ],
      },
      zh: {
        word: '爱国主义',
        question: '健康的爱国主义与对国家的盲目效忠有何区别？',
        examples: [
          {
            en: 'The patriot loves his country as an adult loves a parent: with clear eyes about its faults and steady commitment to its better possibilities.',
            native: '爱国者爱自己的国家，如同成年人爱父母：看清它的缺点，同时坚定地致力于它更好的可能。',
          },
          {
            en: 'Blind loyalty demands agreement with every policy, whereas genuine patriotism sometimes requires resisting one’s government in the name of one’s country.',
            native: '盲目的效忠要求赞同每一项政策，而真正的爱国有时要求以国家之名抵制自己的政府。',
          },
          {
            en: 'We should be suspicious of leaders who wrap themselves in flags, for patriotism loudly advertised is usually a product being sold to the trusting.',
            native: '我们应当警惕那些把自己裹进旗帜里的领导人，因为大声叫卖的爱国主义，通常是卖给轻信者的商品。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'cosmopolitanism',
    questionText: 'Can we be citizens of the world without losing our local attachments?',
    translations: {
      te: {
        word: 'విశ్వపౌరత్వం',
        question: 'మన స్థానిక అనుబంధాలను కోల్పోకుండా ప్రపంచ పౌరులుగా ఉండగలమా?',
        examples: [
          {
            en: 'Cosmopolitanism asks us to extend moral concern beyond our borders, yet love of humanity means little if it never touches a single actual neighbour.',
            native:
              'సరిహద్దులకు అవతల నైతిక శ్రద్ధను విస్తరించమని విశ్వపౌరత్వం కోరుతుంది, అయితే కనీసం ఒక్క నిజమైన పొరుగువాన్ని కూడా తాకని మానవతాప్రేమకు విలువ లేదు.',
          },
          {
            en: 'The risk of global citizenship is not disloyalty but thinness: belonging everywhere can become belonging nowhere, with roots too shallow for sacrifice.',
            native:
              'ప్రపంచ పౌరత్వం యొక్క ప్రమాదం అనిష్ఠ కాదు, తెల్లపడడం: ప్రతిచోటా చెందినవారవడం ఎక్కడా చెందనివారవడం కావచ్చు — త్యాగానికి సరిపోనంత తక్కువ వేళ్లతో.',
          },
          {
            en: 'Perhaps identity works like concentric circles — family, town, nation, humanity — and wisdom lies in refusing to let any circle erase the others.',
            native:
              'బహుశా గుర్తింపు కేంద్రక వృత్తాల్లా పనిచేస్తుంది — కుటుంబం, ఊరు, దేశం, మానవత — ఏ వృత్తం మిగతా వాటిని చెరిపివేయనీయకపోవడమే జ్ఞానం.',
          },
        ],
      },
      hi: {
        word: 'विश्वनागरिकता',
        question: 'क्या हम अपने स्थानीय लगाव खोए बिना विश्व के नागरिक बन सकते हैं?',
        examples: [
          {
            en: 'Cosmopolitanism asks us to extend moral concern beyond our borders, yet love of humanity means little if it never touches a single actual neighbour.',
            native:
              'विश्वनागरिकता हमसे नैतिक चिंता को अपनी सीमाओं से परे बढ़ाने को कहती है, पर मानवता से प्रेम का अर्थ क्या, यदि वह कभी किसी वास्तविक पड़ोसी तक न पहुँचे।',
          },
          {
            en: 'The risk of global citizenship is not disloyalty but thinness: belonging everywhere can become belonging nowhere, with roots too shallow for sacrifice.',
            native:
              'वैश्विक नागरिकता का जोखिम बेइमानी नहीं, हल्कापन है: हर जगह का होना कहीं का न होना बन सकता है — जड़ें इतनी उथलीं कि त्याग न हो सके।',
          },
          {
            en: 'Perhaps identity works like concentric circles — family, town, nation, humanity — and wisdom lies in refusing to let any circle erase the others.',
            native:
              'शायद पहचान संकेंद्रित वृत्तों की तरह काम करती है — परिवार, कस्बा, राष्ट्र, मानवता — और बुद्धि इसी में है कि कोई वृत्त दूसरों को मिटाने न पाए।',
          },
        ],
      },
      es: {
        word: 'cosmopolitismo',
        question: '¿Podemos ser ciudadanos del mundo sin perder nuestros vínculos locales?',
        examples: [
          {
            en: 'Cosmopolitanism asks us to extend moral concern beyond our borders, yet love of humanity means little if it never touches a single actual neighbour.',
            native:
              'El cosmopolitismo nos pide extender la preocupación moral más allá de nuestras fronteras, pero el amor a la humanidad vale poco si nunca alcanza a un vecino real.',
          },
          {
            en: 'The risk of global citizenship is not disloyalty but thinness: belonging everywhere can become belonging nowhere, with roots too shallow for sacrifice.',
            native:
              'El riesgo de la ciudadanía global no es la deslealtad sino la superficialidad: pertenecer a todas partes puede volverse pertenecer a ninguna, con raíces demasiado débiles para el sacrificio.',
          },
          {
            en: 'Perhaps identity works like concentric circles — family, town, nation, humanity — and wisdom lies in refusing to let any circle erase the others.',
            native:
              'Quizá la identidad funciona como círculos concéntricos — familia, pueblo, nación, humanidad — y la sabiduría está en no dejar que ningún círculo borre a los demás.',
          },
        ],
      },
      zh: {
        word: '世界主义',
        question: '我们能否在不失去本土牵挂的情况下成为世界公民？',
        examples: [
          {
            en: 'Cosmopolitanism asks us to extend moral concern beyond our borders, yet love of humanity means little if it never touches a single actual neighbour.',
            native:
              '世界主义要求我们把道德关怀延伸到国界之外；但若对人类的爱从未触及一个真实的邻人，这份爱便毫无意义。',
          },
          {
            en: 'The risk of global citizenship is not disloyalty but thinness: belonging everywhere can become belonging nowhere, with roots too shallow for sacrifice.',
            native: '全球公民身份的风险不在于不忠，而在于稀薄：处处归属可能变成无处归属，根扎得太浅，不足以支撑牺牲。',
          },
          {
            en: 'Perhaps identity works like concentric circles — family, town, nation, humanity — and wisdom lies in refusing to let any circle erase the others.',
            native: '或许身份像同心圆一样运作——家庭、城镇、国家、人类——而智慧在于不让任何一个圆抹去其他圆。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'individualism',
    questionText: 'Has individualism liberated us, or has it left us isolated?',
    translations: {
      te: {
        word: 'వ్యక్తివాదం',
        question: 'వ్యక్తివాదం మనల్ని విముక్తి చేసిందా, లేదా ఒంటరిగా వదిలేసిందా?',
        examples: [
          {
            en: 'Individualism freed millions from suffocating traditions, yet in dissolving every obligation it also dissolved the thick relationships that made life bearable.',
            native:
              'వ్యక్తివాదం శ్వాస ముట్టించే సంప్రదాయాల నుండి కోట్లాది మందిని విడిపించింది, అయితే ప్రతి బాధ్యతను కరిగించడంలో జీవితాన్ని సహ్యం చేసే గాఢ సంబంధాలను కూడా అది కరిగించింది.',
          },
          {
            en: 'The self-made person is a flattering fiction, for each of us arrives already indebted to ancestors, teachers, and strangers whose work sustains our own.',
            native:
              'స్వయంకృషితో ఎదిగిన వ్యక్తి అనేది ఆటపట్టించే కల్పన — మనమందరం పూర్వీకులకు, ఉపాధ్యాయులకు, మన పనిని నిలబెట్టే అపరిచితులకు అప్పుపడే ఉంటాం.',
          },
          {
            en: 'A society of pure individuals must manufacture belonging artificially, which is why loneliness has become the paradoxical epidemic of the most liberated age.',
            native:
              'స్వచ్ఛమైన వ్యక్తుల సమాజం అనుబంధాన్ని కృత్రిమంగా తయారు చేయాల్సి ఉంటుంది — అత్యంత విముక్తి పొందిన యుగంలో ఒంటరితనం విరోధాభాసమైన మహమ్మారి అవడానికి కారణం ఇదే.',
          },
        ],
      },
      hi: {
        word: 'व्यक्तिवाद',
        question: 'क्या व्यक्तिवाद ने हमें मुक्त किया है, या हमें अलग-थलग छोड़ दिया है?',
        examples: [
          {
            en: 'Individualism freed millions from suffocating traditions, yet in dissolving every obligation it also dissolved the thick relationships that made life bearable.',
            native:
              'व्यक्तिवाद ने लाखों लोगों को दमघोंटू परंपराओं से आज़ाद कराया, पर हर बाध्यता को घुलाने में उसने उन गाढ़े रिश्तों को भी घुला दिया जो जीवन को सहनीय बनाते थे।',
          },
          {
            en: 'The self-made person is a flattering fiction, for each of us arrives already indebted to ancestors, teachers, and strangers whose work sustains our own.',
            native:
              'स्वनिर्मित व्यक्ति एक चापलूसी भरा काल्पनिक है, क्योंकि हम में से हर कोई पहले से ही पूर्वजों, शिक्षकों और उन अजनबियों का ऋणी होकर आता है जिनका काम हमारे काम को थामे रहता है।',
          },
          {
            en: 'A society of pure individuals must manufacture belonging artificially, which is why loneliness has become the paradoxical epidemic of the most liberated age.',
            native:
              'शुद्ध व्यक्तियों के समाज को अपनापन कृत्रिम रूप से बनाना पड़ता है — यही कारण है कि सबसे मुक्त युग में अकेलापन एक विरोधाभासी महामारी बन गया है।',
          },
        ],
      },
      es: {
        word: 'individualismo',
        question: '¿Nos ha liberado el individualismo o nos ha dejado aislados?',
        examples: [
          {
            en: 'Individualism freed millions from suffocating traditions, yet in dissolving every obligation it also dissolved the thick relationships that made life bearable.',
            native:
              'El individualismo liberó a millones de tradiciones asfixiantes, pero al disolver toda obligación también disolvió las relaciones densas que hacían soportable la vida.',
          },
          {
            en: 'The self-made person is a flattering fiction, for each of us arrives already indebted to ancestors, teachers, and strangers whose work sustains our own.',
            native:
              'La persona hecha a sí misma es una ficción halagadora, pues cada uno llega ya endeudado con antepasados, maestros y extraños cuyo trabajo sostiene el nuestro.',
          },
          {
            en: 'A society of pure individuals must manufacture belonging artificially, which is why loneliness has become the paradoxical epidemic of the most liberated age.',
            native:
              'Una sociedad de individuos puros debe fabricar la pertenencia artificialmente, y por eso la soledad se ha vuelto la epidemia paradójica de la era más liberada.',
          },
        ],
      },
      zh: {
        word: '个人主义',
        question: '个人主义解放了我们，还是让我们陷入了孤立？',
        examples: [
          {
            en: 'Individualism freed millions from suffocating traditions, yet in dissolving every obligation it also dissolved the thick relationships that made life bearable.',
            native:
              '个人主义把千百万人从令人窒息的传统中解放出来，但在溶解一切义务的同时，也溶解了那些让生活可以忍受的深厚关系。',
          },
          {
            en: 'The self-made person is a flattering fiction, for each of us arrives already indebted to ancestors, teachers, and strangers whose work sustains our own.',
            native:
              '白手起家的人是一种自我奉承的虚构，因为我们每个人降临时都已欠着祖先、师长和陌生人的债——正是他们的工作支撑着我们的工作。',
          },
          {
            en: 'A society of pure individuals must manufacture belonging artificially, which is why loneliness has become the paradoxical epidemic of the most liberated age.',
            native:
              '一个由纯粹个人组成的社会，必须人为地制造归属感——这就是为什么孤独成了这个最解放时代的悖论式流行病。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'collectivism',
    questionText: 'What do societies gain and lose when the group takes priority over the individual?',
    translations: {
      te: {
        word: 'సమూహవాదం',
        question: 'వ్యక్తి కంటే సమూహానికి ప్రాధాన్యం ఇచ్చినప్పుడు సమాజాలు ఏమి పొందుతాయి, ఏమి కోల్పోతాయి?',
        examples: [
          {
            en: 'Collectivism provides belonging and shared purpose, yet it can demand conformity so complete that dissent becomes indistinguishable from betrayal.',
            native:
              'సమూహవాదం అనుబంధాన్ని, పంచుకున్న లక్ష్యాన్ని అందిస్తుంది, అయితే అంత పూర్తిగా ఏకరూపతను కోరగలదు — అసమ్మతి ద్రోహం నుండి వేరుచేయలేనంతగా.',
          },
          {
            en: 'The group that always outranks the individual eventually discovers it has protected everyone’s belonging by destroying everything worth belonging to.',
            native:
              'ఎల్లప్పుడూ వ్యక్తి కంటే పైన నిలిచే సమూహం చివరకు ఏమి కనుగొంటుందంటే — చెందడానికి విలువైన ప్రతిదాన్ని నాశనం చేసి అందరి అనుబంధాన్ని కాపాడిందని.',
          },
          {
            en: 'Healthy communities balance both claims: the individual owes the group loyalty, and the group owes the individual the space to remain a person.',
            native:
              'ఆరోగ్యకరమైన సమాజాలు రెండు హక్కులను సమతుల్యం చేస్తాయి: వ్యక్తి సమూహానికి నిష్ఠ పాటించాలి, సమూహం వ్యక్తికి వ్యక్తిగా ఉండే స్థలం ఇవ్వాలి.',
          },
        ],
      },
      hi: {
        word: 'सामूहिकवाद',
        question: 'जब समूह को व्यक्ति पर प्राथमिकता मिलती है, तो समाज क्या पाते हैं और क्या खोते हैं?',
        examples: [
          {
            en: 'Collectivism provides belonging and shared purpose, yet it can demand conformity so complete that dissent becomes indistinguishable from betrayal.',
            native:
              'सामूहिकवाद अपनापन और साझा उद्देश्य देता है, पर वह इतनी पूर्ण एकरूपता माँग सकता है कि असहमति और विश्वासघात में अंतर करना मुश्किल हो जाए।',
          },
          {
            en: 'The group that always outranks the individual eventually discovers it has protected everyone’s belonging by destroying everything worth belonging to.',
            native:
              'जो समूह हमेशा व्यक्ति पर भारी पड़ता है, वह अंततः यह पाता है कि उसने सबके अपनेपन की रक्षा तब की, जब अपनाने लायक हर चीज़ को नष्ट कर डाला।',
          },
          {
            en: 'Healthy communities balance both claims: the individual owes the group loyalty, and the group owes the individual the space to remain a person.',
            native:
              'स्वस्थ समुदाय दोनों दावों को संतुलित करते हैं: व्यक्ति समूह का निष्ठावान हो, और समूह व्यक्ति को इंसान बने रहने की गुंजाइश दे।',
          },
        ],
      },
      es: {
        word: 'colectivismo',
        question: '¿Qué ganan y qué pierden las sociedades cuando el grupo prima sobre el individuo?',
        examples: [
          {
            en: 'Collectivism provides belonging and shared purpose, yet it can demand conformity so complete that dissent becomes indistinguishable from betrayal.',
            native:
              'El colectivismo proporciona pertenencia y propósito compartido, pero puede exigir una conformidad tan completa que el disenso se vuelve indistinguible de la traición.',
          },
          {
            en: 'The group that always outranks the individual eventually discovers it has protected everyone’s belonging by destroying everything worth belonging to.',
            native:
              'El grupo que siempre prevalece sobre el individuo acaba descubriendo que protegió la pertenencia de todos destruyendo todo aquello a lo que valía la pena pertenecer.',
          },
          {
            en: 'Healthy communities balance both claims: the individual owes the group loyalty, and the group owes the individual the space to remain a person.',
            native:
              'Las comunidades sanas equilibran ambas exigencias: el individuo debe lealtad al grupo, y el grupo debe al individuo el espacio para seguir siendo persona.',
          },
        ],
      },
      zh: {
        word: '集体主义',
        question: '当集体优先于个人时，社会得到了什么，又失去了什么？',
        examples: [
          {
            en: 'Collectivism provides belonging and shared purpose, yet it can demand conformity so complete that dissent becomes indistinguishable from betrayal.',
            native: '集体主义给予归属感和共同目标，但它要求的顺从可能彻底到让异议与背叛无从区分。',
          },
          {
            en: 'The group that always outranks the individual eventually discovers it has protected everyone’s belonging by destroying everything worth belonging to.',
            native: '永远凌驾于个人之上的集体最终会发现：它保住了每个人的归属，却毁掉了一切值得归属的东西。',
          },
          {
            en: 'Healthy communities balance both claims: the individual owes the group loyalty, and the group owes the individual the space to remain a person.',
            native: '健康的共同体在两种诉求间取得平衡：个人对集体负有忠诚，集体则欠个人一个得以保持为“人”的空间。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'consumerism',
    questionText: 'Does consumerism satisfy our desires, or does it manufacture them?',
    translations: {
      te: {
        word: 'వినియోగవాదం',
        question: 'వినియోగవాదం మన కోరికలను తీరుస్తుందా, లేదా అవి తయారుచేస్తుందా?',
        examples: [
          {
            en: 'Consumerism does not merely answer our desires; it engineers new ones faster than the old can be satisfied, keeping appetite permanently ahead of fulfilment.',
            native:
              'వినియోగవాదం కేవలం మన కోరికలకు సమాధానం ఇవ్వదు; పాతవి తీరకముందే వాటి కంటే వేగంగా కొత్త కోరికలను రూపొందిస్తుంది — ఆకలిని శాశ్వతంగా తృప్తి కంటే ముందుంచుతూ.',
          },
          {
            en: 'We buy objects to express who we are, then discover that identities purchased off a shelf fit millions of strangers exactly as well as they fit us.',
            native:
              'మనం ఎవరో వ్యక్తపరచడానికి వస్తువులు కొంటాం, ఆపై అలమారిపై కొనుగోలు చేసిన గుర్తింపులు మనలాగే కోట్లాది అపరిచితులకు కూడా సరిగ్గానే సరిపోతాయని కనుగొంటాం.',
          },
          {
            en: 'The promise that the next purchase will finally complete us is consumerism’s oldest trick, and its enduring success reveals how restless the human heart remains.',
            native:
              'తదుపరి కొనుగోలు మనల్ని చివరకు పూర్తి చేస్తుందనే హామీ వినియోగవాదం యొక్క అతి పురాతనమైన మాయ — దాని శాశ్వత విజయం మానవ హృదయం ఎంత అశాంతంగా ఉందో వెల్లడిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'उपभोक्तावाद',
        question: 'क्या उपभोक्तावाद हमारी इच्छाओं को पूरा करता है, या वह उन्हें निर्मित करता है?',
        examples: [
          {
            en: 'Consumerism does not merely answer our desires; it engineers new ones faster than the old can be satisfied, keeping appetite permanently ahead of fulfilment.',
            native:
              'उपभोक्तावाद हमारी इच्छाओं का उत्तर देता ही नहीं; वह पुरानी इच्छाओं के पूरी होने से पहले नई इच्छाएँ तेज़ी से गढ़ता है, और भूख को हमेशा तृप्ति से आगे रखता है।',
          },
          {
            en: 'We buy objects to express who we are, then discover that identities purchased off a shelf fit millions of strangers exactly as well as they fit us.',
            native:
              'हम यह बताने के लिए चीज़ें खरीदते हैं कि हम कौन हैं, फिर पाते हैं कि दुकान की शेल्फ़ से खरीदी पहचान लाखों अजनबियों पर भी उतनी ही सटीक बैठती है जितनी हम पर।',
          },
          {
            en: 'The promise that the next purchase will finally complete us is consumerism’s oldest trick, and its enduring success reveals how restless the human heart remains.',
            native:
              'यह वादा कि अगली ख़रीद आख़िरकार हमें पूरा कर देगी, उपभोक्तावाद की सबसे पुरानी चाल है, और उसकी स्थायी सफलता बताती है कि मानव हृदय कितना बेचैन बना हुआ है।',
          },
        ],
      },
      es: {
        word: 'consumismo',
        question: '¿Satisface el consumismo nuestros deseos o los fabrica?',
        examples: [
          {
            en: 'Consumerism does not merely answer our desires; it engineers new ones faster than the old can be satisfied, keeping appetite permanently ahead of fulfilment.',
            native:
              'El consumismo no se limita a responder a nuestros deseos; fabrica otros nuevos más rápido de lo que se satisfacen los viejos, manteniendo el apetito siempre por delante de la saciedad.',
          },
          {
            en: 'We buy objects to express who we are, then discover that identities purchased off a shelf fit millions of strangers exactly as well as they fit us.',
            native:
              'Compramos objetos para expresar quiénes somos y luego descubrimos que las identidades compradas en un estante les quedan a millones de extraños tan bien como a nosotros.',
          },
          {
            en: 'The promise that the next purchase will finally complete us is consumerism’s oldest trick, and its enduring success reveals how restless the human heart remains.',
            native:
              'La promesa de que la próxima compra por fin nos completará es el truco más viejo del consumismo, y su éxito perdurable revela lo inquieto que sigue el corazón humano.',
          },
        ],
      },
      zh: {
        word: '消费主义',
        question: '消费主义是在满足我们的欲望，还是在制造欲望？',
        examples: [
          {
            en: 'Consumerism does not merely answer our desires; it engineers new ones faster than the old can be satisfied, keeping appetite permanently ahead of fulfilment.',
            native:
              '消费主义并不只是回应我们的欲望；它制造新欲望的速度远超旧欲望被满足的速度，让胃口永远跑在满足之前。',
          },
          {
            en: 'We buy objects to express who we are, then discover that identities purchased off a shelf fit millions of strangers exactly as well as they fit us.',
            native:
              '我们购买物品来表达自我，随后却发现：货架上买来的身份，穿在千百万陌生人身上，和穿在我们身上一样合身。',
          },
          {
            en: 'The promise that the next purchase will finally complete us is consumerism’s oldest trick, and its enduring success reveals how restless the human heart remains.',
            native: '“下一件商品终将使我们完整”是消费主义最古老的把戏，而它长盛不衰，恰恰揭示了人心何等躁动不安。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'materialism',
    questionText: 'Is materialism a philosophy of honesty about the world, or an impoverished view of it?',
    translations: {
      te: {
        word: 'భౌతికవాదం',
        question: 'భౌతికవాదం ప్రపంచం గురించి నిజాయితీగల తత్వమా, లేదా దాని గురించి పేలవమైన దృక్పథమా?',
        examples: [
          {
            en: 'Materialism rightly insists that minds are not ghosts in machines, yet struggles to explain why the machine’s workings should feel like anything from within.',
            native:
              'మనస్థితులు యంత్రాల్లోని దెయ్యాలు కావని భౌతికవాదం సరిగ్గానే పట్టుబడుతుంది, అయితే యంత్రం యొక్క పనితీరు లోపలి నుండి ఎందుకు ఏదోగా అనిపించాలి అనేది వివరించడంలో ఇబ్బంది పడుతుంది.',
          },
          {
            en: 'A culture that believes only matter matters will measure wealth precisely and wonder endlessly why the wealthy remain so persistently unsatisfied.',
            native:
              'పదార్థం మాత్రమే ముఖ్యమని నమ్మే సంస్కృతి సంపదను ఖచ్చితంగా కొలుస్తుంది, మరియు ధనికులు ఎందుకు ఇంత నిరంతర అసంతృప్తిగా ఉంటారో అనంతంగా ఆశ్చర్యపడుతుంది.',
          },
          {
            en: 'The materialist sees the brain where the poet sees the soul, and both are looking at the same trembling mystery with different instruments of attention.',
            native:
              'కవి ఆత్మను చూసే చోట భౌతికవాది మెదడును చూస్తాడు — ఇద్దరూ వేర్వేరు శ్రద్ధా యంత్రాలతో అదే వణికే రహస్యాన్నే చూస్తున్నారు.',
          },
        ],
      },
      hi: {
        word: 'भौतिकवाद',
        question: 'क्या भौतिकवाद दुनिया के बारे में ईमानदारी का दर्शन है, या उसके प्रति एक अल्प दृष्टिकोण?',
        examples: [
          {
            en: 'Materialism rightly insists that minds are not ghosts in machines, yet struggles to explain why the machine’s workings should feel like anything from within.',
            native:
              'भौतिकवाद ठीक ही जोर देता है कि मन मशीनों में रहने वाले भूत नहीं हैं, पर यह समझाने में संघर्ष करता है कि मशीन की कार्यप्रणाली भीतर से कुछ महसूस क्यों करती है।',
          },
          {
            en: 'A culture that believes only matter matters will measure wealth precisely and wonder endlessly why the wealthy remain so persistently unsatisfied.',
            native:
              'जो संस्कृति मानती है कि केवल पदार्थ ही मायने रखता है, वह धन को सटीकता से मापेगी और यह सोचती रह जाएगी कि धनी इतने लगातार असंतुष्ट क्यों रहते हैं।',
          },
          {
            en: 'The materialist sees the brain where the poet sees the soul, and both are looking at the same trembling mystery with different instruments of attention.',
            native:
              'जहाँ कवि आत्मा देखता है, वहाँ भौतिकवादी मस्तिष्क देखता है — और दोनों एक ही काँपते रहस्य को ध्यान के अलग-अलग उपकरणों से देख रहे हैं।',
          },
        ],
      },
      es: {
        word: 'materialismo',
        question: '¿Es el materialismo una filosofía honesta sobre el mundo o una visión empobrecida de él?',
        examples: [
          {
            en: 'Materialism rightly insists that minds are not ghosts in machines, yet struggles to explain why the machine’s workings should feel like anything from within.',
            native:
              'El materialismo insiste con razón en que las mentes no son fantasmas dentro de máquinas, pero le cuesta explicar por qué el funcionamiento de la máquina debería sentirse como algo desde dentro.',
          },
          {
            en: 'A culture that believes only matter matters will measure wealth precisely and wonder endlessly why the wealthy remain so persistently unsatisfied.',
            native:
              'Una cultura que cree que solo importa la materia medirá la riqueza con precisión y se preguntará sin fin por qué los ricos siguen tan persistentemente insatisfechos.',
          },
          {
            en: 'The materialist sees the brain where the poet sees the soul, and both are looking at the same trembling mystery with different instruments of attention.',
            native:
              'El materialista ve el cerebro donde el poeta ve el alma, y ambos contemplan el mismo misterio tembloroso con distintos instrumentos de atención.',
          },
        ],
      },
      zh: {
        word: '唯物主义',
        question: '唯物主义是对世界诚实的哲学，还是一种贫瘠的世界观？',
        examples: [
          {
            en: 'Materialism rightly insists that minds are not ghosts in machines, yet struggles to explain why the machine’s workings should feel like anything from within.',
            native: '唯物主义坚持心灵并非寄居机器中的幽灵，这没有错；但它难以解释：机器的运转为何会从内部“有所感受”。',
          },
          {
            en: 'A culture that believes only matter matters will measure wealth precisely and wonder endlessly why the wealthy remain so persistently unsatisfied.',
            native: '一个信奉“唯有物质重要”的文化，会精确地度量财富，然后没完没了地困惑：为什么富人始终如此不满足。',
          },
          {
            en: 'The materialist sees the brain where the poet sees the soul, and both are looking at the same trembling mystery with different instruments of attention.',
            native: '诗人看见灵魂的地方，唯物主义者看见大脑；二者凝视的是同一个颤抖的谜，只是所用观察的工具不同。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'minimalism',
    questionText: 'Is minimalism a genuine path to freedom, or another form of consumption?',
    translations: {
      te: {
        word: 'మినిమలిజం',
        question: 'మినిమలిజం స్వేచ్ఛకు నిజమైన మార్గమా, లేదా వినియోగం యొక్క మరో రూపమా?',
        examples: [
          {
            en: 'Minimalism promises freedom from possessions, yet the pursuit of owning perfectly few things can become as obsessive as collecting many.',
            native:
              'వస్తువుల నుండి స్వేచ్ఛను మినిమలిజం వాగ్దానం చేస్తుంది, అయితే పరిపూర్ణంగా కొద్ది వస్తువులను కలిగి ఉండే అన్వేషణ కూడా చాలావాటిని సేకరించడంలాగే వ్యామోహంగా మారవచ్చు.',
          },
          {
            en: 'Choosing less is a privilege of those who could have more; the poor practise involuntary minimalism without finding it particularly liberating.',
            native:
              'తక్కువను ఎంచుకోవడం ఎక్కువ కలిగి ఉండగలిగినవారి ప్రత్యేక హక్కు; పేదలు అనిచ్ఛతో మినిమలిజం పాటిస్తారు, అది అంతగా విముక్తినిస్తుందని కనుగొకుండానే.',
          },
          {
            en: 'The deepest minimalism is not an aesthetic of empty rooms but a discipline of emptying schedules, keeping only what genuinely deserves our hours.',
            native:
              'లోతైన మినిమలిజం ఖాళీ గదుల సౌందర్యశాస్త్రం కాదు — షెడ్యూళ్లను ఖాళీ చేసే క్రమశిక్షణ, మన గంటలను నిజంగా అర్హమైనవాటికి మాత్రమే కేటాయించడం.',
          },
        ],
      },
      hi: {
        word: 'न्यूनतमवाद',
        question: 'क्या न्यूनतमवाद स्वतंत्रता का कोई वास्तविक मार्ग है, या उपभोग का ही एक और रूप?',
        examples: [
          {
            en: 'Minimalism promises freedom from possessions, yet the pursuit of owning perfectly few things can become as obsessive as collecting many.',
            native:
              'न्यूनतमवाद सामानों से मुक्ति का वादा करता है, पर बिल्कुल कम चीज़ें रखने की खोज भी कई चीज़ें जमा करने जैसी ही धुन बन सकती है।',
          },
          {
            en: 'Choosing less is a privilege of those who could have more; the poor practise involuntary minimalism without finding it particularly liberating.',
            native:
              'कम चुनना उन लोगों का विशेषाधिकार है जो अधिक रख सकते हैं; ग़रीब अनैच्छिक न्यूनतमवाद का पालन करते हैं, बिना यह पाए कि वह कोई मुक्ति देता है।',
          },
          {
            en: 'The deepest minimalism is not an aesthetic of empty rooms but a discipline of emptying schedules, keeping only what genuinely deserves our hours.',
            native:
              'सबसे गहरा न्यूनतमवाद खाली कमरों का सौंदर्य नहीं, बल्कि कार्यक्रमों को खाली करने का अनुशासन है — केवल वही रखना जो सचमुच हमारे घंटों का हक़दार हो।',
          },
        ],
      },
      es: {
        word: 'minimalismo',
        question: '¿Es el minimalismo un camino genuino hacia la libertad u otra forma de consumo?',
        examples: [
          {
            en: 'Minimalism promises freedom from possessions, yet the pursuit of owning perfectly few things can become as obsessive as collecting many.',
            native:
              'El minimalismo promete libertad de las posesiones, pero perseguir poseer perfectamente pocas cosas puede volverse tan obsesivo como acumular muchas.',
          },
          {
            en: 'Choosing less is a privilege of those who could have more; the poor practise involuntary minimalism without finding it particularly liberating.',
            native:
              'Elegir menos es un privilegio de quienes podrían tener más; los pobres practican un minimalismo involuntario sin encontrarlo particularmente liberador.',
          },
          {
            en: 'The deepest minimalism is not an aesthetic of empty rooms but a discipline of emptying schedules, keeping only what genuinely deserves our hours.',
            native:
              'El minimalismo más profundo no es una estética de habitaciones vacías, sino la disciplina de vaciar agendas, quedándose solo con lo que merece de verdad nuestras horas.',
          },
        ],
      },
      zh: {
        word: '极简主义',
        question: '极简主义是通往自由的真路，还是消费的另一种形态？',
        examples: [
          {
            en: 'Minimalism promises freedom from possessions, yet the pursuit of owning perfectly few things can become as obsessive as collecting many.',
            native: '极简主义许诺从物欲中解脱，但对“拥有完美之少”的追求，也可能变得像囤积一样偏执。',
          },
          {
            en: 'Choosing less is a privilege of those who could have more; the poor practise involuntary minimalism without finding it particularly liberating.',
            native: '选择更少，是那些本可以拥有更多者的特权；穷人被迫践行极简，却并不觉得它带来了解脱。',
          },
          {
            en: 'The deepest minimalism is not an aesthetic of empty rooms but a discipline of emptying schedules, keeping only what genuinely deserves our hours.',
            native: '最深的极简不是空房间的美学，而是清空日程的自律——只保留真正值得我们时间的事物。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'perfectionism',
    questionText: 'Does perfectionism drive excellence, or does it quietly destroy it?',
    translations: {
      te: {
        word: 'పరిపూర్ణతావాదం',
        question: 'పరిపూర్ణతావాదం శ్రేష్ఠతను నడిపిస్తుందా, లేదా నిశ్శబ్దంగా దాన్ని నాశనం చేస్తుందా?',
        examples: [
          {
            en: 'Perfectionism masquerades as high standards, yet its true function is often fear: the terror of finishing something and being judged for the result.',
            native:
              'పరిపూర్ణతావాదం ఉన్నత ప్రమాణాల వేషంలో ఉంటుంది, అయితే దాని నిజమైన ధర్మం తరచుగా భయమే: ఏదో పూర్తిచేసి ఫలితం కోసం తీర్పు పడాల్సిరావచ్చనే భీతి.',
          },
          {
            en: 'The perfectionist abandons a hundred promising beginnings rather than risk one imperfect ending, while the merely persistent finish and improve.',
            native:
              'పరిపూర్ణతావాది ఒక అసంపూర్ణ ముగింపు అనుభవించే ప్రమాదం కంటే వంద ఆశాజనక ప్రారంభాలను వదిలేస్తాడు, అయితే కేవలం పట్టుదల గలవాడు పూర్తిచేసి మెరుగుపెడతాడు.',
          },
          {
            en: 'Excellence grows from iteration, from shipping the flawed version and revising it honestly, whereas perfectionism dies stillborn in endless preparation.',
            native:
              'శ్రేష్ఠత పునరావృతం నుండి పుడుతుంది — లోపం ఉన్న కూర్పును విడుదల చేసి నిజాయితీగా సవరించడం నుండి — అయితే పరిపూర్ణతావాదం అంతులేని తయారీలోనే మృతిచెందుతుంది.',
          },
        ],
      },
      hi: {
        word: 'पूर्णतावाद',
        question: 'क्या पूर्णतावाद उत्कृष्टता को प्रेरित करता है, या वह चुपचाप उसे नष्ट कर देता है?',
        examples: [
          {
            en: 'Perfectionism masquerades as high standards, yet its true function is often fear: the terror of finishing something and being judged for the result.',
            native:
              'पूर्णतावाद ऊँचे मानदंडों का वेश धारण करता है, पर उसका असली कार्य प्रायः भय होता है: कुछ पूरा करने और परिणाम के लिए सूने जाने की दहशत।',
          },
          {
            en: 'The perfectionist abandons a hundred promising beginnings rather than risk one imperfect ending, while the merely persistent finish and improve.',
            native:
              'पूर्णतावादी एक अपूर्ण अंत का जोखिम उठाने की बजाय सौ होनहार शुरुआतें छोड़ देता है, जबकि केवल दृढ़ रहने वाला पूरा करता है और सुधारता है।',
          },
          {
            en: 'Excellence grows from iteration, from shipping the flawed version and revising it honestly, whereas perfectionism dies stillborn in endless preparation.',
            native:
              'उत्कृष्टता पुनरावृत्ति से जन्म लेती है — दोषपूर्ण संस्करण जारी करके उसे ईमानदारी से सुधारने से — जबकि पूर्णतावाद अनंत तैयारी में ही मृत-जन्म पाता है।',
          },
        ],
      },
      es: {
        word: 'perfeccionismo',
        question: '¿Impulsa el perfeccionismo la excelencia o la destruye en silencio?',
        examples: [
          {
            en: 'Perfectionism masquerades as high standards, yet its true function is often fear: the terror of finishing something and being judged for the result.',
            native:
              'El perfeccionismo se disfraza de estándares altos, pero su verdadera función suele ser el miedo: el terror a terminar algo y ser juzgado por el resultado.',
          },
          {
            en: 'The perfectionist abandons a hundred promising beginnings rather than risk one imperfect ending, while the merely persistent finish and improve.',
            native:
              'El perfeccionista abandona cien comienzos prometedores antes que arriesgar un final imperfecto, mientras que el simplemente persistente termina y mejora.',
          },
          {
            en: 'Excellence grows from iteration, from shipping the flawed version and revising it honestly, whereas perfectionism dies stillborn in endless preparation.',
            native:
              'La excelencia nace de la iteración, de lanzar la versión imperfecta y revisarla con honestidad, mientras que el perfeccionismo muere nonato en una preparación interminable.',
          },
        ],
      },
      zh: {
        word: '完美主义',
        question: '完美主义是在驱动卓越，还是在悄悄摧毁卓越？',
        examples: [
          {
            en: 'Perfectionism masquerades as high standards, yet its true function is often fear: the terror of finishing something and being judged for the result.',
            native: '完美主义伪装成高标准，但它真正的功能往往是恐惧——害怕完成某件作品并因结果被评判。',
          },
          {
            en: 'The perfectionist abandons a hundred promising beginnings rather than risk one imperfect ending, while the merely persistent finish and improve.',
            native:
              '完美主义者宁可放弃一百个有希望的开端，也不愿冒险面对一个不完美的结局；而仅仅有恒心的人却能完成并改进。',
          },
          {
            en: 'Excellence grows from iteration, from shipping the flawed version and revising it honestly, whereas perfectionism dies stillborn in endless preparation.',
            native: '卓越源于迭代——发布有缺陷的版本并诚实地修改——而完美主义在无尽的准备中胎死腹中。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'pragmatism',
    questionText: 'Should pragmatism govern our ideals, or does it slowly replace them?',
    translations: {
      te: {
        word: 'ప్రాయోగికవాదం',
        question: 'ప్రాయోగికవాదం మన ఆదర్శాలను పాలించాలా, లేదా అది నెమ్మదిగా వాటి స్థానం భర్తీ చేస్తుందా?',
        examples: [
          {
            en: 'Pragmatism asks what works, which is a fine question for methods but a dangerous one for values, since many wrongs work wonderfully.',
            native:
              'ప్రాయోగికవాదం ఏది పనిచేస్తుందో అడుగుతుంది — పద్ధతులకు ఇది మంచి ప్రశ్న, కానీ విలువలకు ప్రమాదకరమైనది, ఎందుకంటే చాలా తప్పులు అద్భుతంగా పనిచేస్తాయి.',
          },
          {
            en: 'The pragmatist who compromises on everything discovers too late that he has become skilled only at surrendering gracefully.',
            native:
              'ప్రతిదానిపై రాజీ పడే ప్రాయోగికవాది చాలా ఆలస్యంగా ఏమి కనుగొంటాడంటే, తాను శోభాయమానంగా లొంగిపోవడంలో మాత్రమే నిపుణుడయ్యానని.',
          },
          {
            en: 'Yet ideals that refuse all contact with reality become decorative: admired in speeches, useless in the world where people actually suffer and decide.',
            native:
              'అయితే వాస్తవంతో సరసం పడటానికి పూర్తిగా తిరస్కరించే ఆదర్శాలు అలంకారమవుతాయి: ప్రసంగాల్లో మెచ్చుకోబడతాయి, ప్రజలు నిజంగా బాధపడి నిర్ణయించే ప్రపంచంలో నిష్ప్రయోజనం.',
          },
        ],
      },
      hi: {
        word: 'व्यावहारिकतावाद',
        question: 'क्या व्यावहारिकतावाद को हमारे आदर्शों पर शासन करना चाहिए, या वह धीरे-धीरे उनकी जगह ले लेता है?',
        examples: [
          {
            en: 'Pragmatism asks what works, which is a fine question for methods but a dangerous one for values, since many wrongs work wonderfully.',
            native:
              'व्यावहारिकतावाद पूछता है कि क्या काम करता है — तरीकों के लिए यह अच्छा सवाल है, पर मूल्यों के लिए ख़तरनाक, क्योंकि बहुत से ग़लत काम बेहतरीन ढंग से चलते हैं।',
          },
          {
            en: 'The pragmatist who compromises on everything discovers too late that he has become skilled only at surrendering gracefully.',
            native:
              'जो व्यावहारिकतावादी हर बात पर समझौता करता है, वह बहुत देर से यह पाता है कि वह केवल सुंदर ढंग से हार मानने में माहिर रह गया है।',
          },
          {
            en: 'Yet ideals that refuse all contact with reality become decorative: admired in speeches, useless in the world where people actually suffer and decide.',
            native:
              'फिर भी जो आदर्श वास्तविकता से हर संपर्क ठुकरा देते हैं, वे सजावटी बन जाते हैं: भाषणों में सराहे जाते हैं, उस दुनिया में बेकार जहाँ लोग सचमुच दुख भोगते हैं और फ़ैसले करते हैं।',
          },
        ],
      },
      es: {
        word: 'pragmatismo',
        question: '¿Debería el pragmatismo gobernar nuestros ideales, o los va reemplazando poco a poco?',
        examples: [
          {
            en: 'Pragmatism asks what works, which is a fine question for methods but a dangerous one for values, since many wrongs work wonderfully.',
            native:
              'El pragmatismo pregunta qué funciona, excelente pregunta para los métodos pero peligrosa para los valores, pues muchas injusticias funcionan de maravilla.',
          },
          {
            en: 'The pragmatist who compromises on everything discovers too late that he has become skilled only at surrendering gracefully.',
            native:
              'El pragmático que transige en todo descubre demasiado tarde que solo se ha vuelto experto en rendirse con elegancia.',
          },
          {
            en: 'Yet ideals that refuse all contact with reality become decorative: admired in speeches, useless in the world where people actually suffer and decide.',
            native:
              'Sin embargo, los ideales que rechazan todo contacto con la realidad se vuelven decorativos: admirados en los discursos, inútiles en el mundo donde la gente realmente sufre y decide.',
          },
        ],
      },
      zh: {
        word: '实用主义',
        question: '应当让实用主义支配我们的理想，还是说它正在悄然取代理想本身？',
        examples: [
          {
            en: 'Pragmatism asks what works, which is a fine question for methods but a dangerous one for values, since many wrongs work wonderfully.',
            native: '实用主义追问“什么行得通”——对方法而言这是好问题，对价值而言却很危险，因为许多错误的事情效果奇佳。',
          },
          {
            en: 'The pragmatist who compromises on everything discovers too late that he has become skilled only at surrendering gracefully.',
            native: '事事妥协的实用主义者醒悟得太晚：他已精通的，只是如何优雅地投降。',
          },
          {
            en: 'Yet ideals that refuse all contact with reality become decorative: admired in speeches, useless in the world where people actually suffer and decide.',
            native:
              '然而，拒绝与现实有任何接触的理想会沦为装饰品：在演说中受人赞美，在人们真正受苦与抉择的世界里毫无用处。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'idealism',
    questionText: 'Are idealists naive dreamers, or the only people who ever change the world?',
    translations: {
      te: {
        word: 'ఆదర్శవాదం',
        question: 'ఆదర్శవాదులు అమాయక కలలుగన్నేవారా, లేదా ప్రపంచాన్ని మార్చిన ఏకైక వ్యక్తులా?',
        examples: [
          {
            en: 'Every reform that now seems obvious began as an idealist’s folly, opposed by sensible people who explained patiently why change was impossible.',
            native:
              'ఇప్పుడు స్పష్టంగా కనిపించే ప్రతి సంస్కరణ ఒకప్పుడు ఆదర్శవాది వెర్రితనంగా మొదలైంది — మార్పు అసాధ్యమని సహనంగా వివరించిన వివేకవంతుల వ్యతిరేకత మధ్య.',
          },
          {
            en: 'Idealism without realism produces martyrs and manifestos; realism without idealism produces managers and ledgers, and history needs the first kind.',
            native:
              'యథార్థవాదం లేని ఆదర్శవాదం త్యాగవీరులను, ప్రకటనలను ఇస్తుంది; ఆదర్శం లేని యథార్థవాదం నిర్వాహకులను, ఖాతా పుస్తకాలను ఇస్తుంది — చరిత్రకు కావాల్సింది మొదటివారే.',
          },
          {
            en: 'The cynical dismissal of idealists is itself a luxury purchased by generations of dreamers whose impossible demands became our ordinary rights.',
            native:
              'ఆదర్శవాదుల పట్ల నిర్లిప్త తృణీకారం స్వయంచాలకంగా ఒక విలాసం — అసాధ్యమైన డిమాండ్లు మన సాధారణ హక్కులుగా మారిన తరతరాల కలలుగన్నేవారు కొనుగోలు చేసినది.',
          },
        ],
      },
      hi: {
        word: 'आदर्शवाद',
        question: 'क्या आदर्शवादी भोले-भाले ख़्वाब देखने वाले हैं, या वही एकमात्र लोग हैं जिन्होंने कभी दुनिया बदली?',
        examples: [
          {
            en: 'Every reform that now seems obvious began as an idealist’s folly, opposed by sensible people who explained patiently why change was impossible.',
            native:
              'हर सुधार जो आज स्पष्ट लगता है, कभी किसी आदर्शवादी की मूर्खता के रूप में शुरू हुआ था — उन समझदार लोगों के विरोध के बीच जिन्होंने धैर्य से समझाया था कि बदलाव असंभव है।',
          },
          {
            en: 'Idealism without realism produces martyrs and manifestos; realism without idealism produces managers and ledgers, and history needs the first kind.',
            native:
              'यथार्थवाद के बिना आदर्शवाद शहीद और घोषणापत्र पैदा करता है; आदर्शवाद के बिना यथार्थवाद प्रबंधक और बही-खाते — और इतिहास को पहली क़िस्म की ही ज़रूरत है।',
          },
          {
            en: 'The cynical dismissal of idealists is itself a luxury purchased by generations of dreamers whose impossible demands became our ordinary rights.',
            native:
              'आदर्शवादियों का निरादर स्वयं एक विलासिता है — उन सपने देखने वालों की पीढ़ियों ने ख़रीदी है जिनकी असंभव माँगें हमारे साधारण अधिकार बन गईं।',
          },
        ],
      },
      es: {
        word: 'idealismo',
        question: '¿Son los idealistas soñadores ingenuos o las únicas personas que alguna vez cambian el mundo?',
        examples: [
          {
            en: 'Every reform that now seems obvious began as an idealist’s folly, opposed by sensible people who explained patiently why change was impossible.',
            native:
              'Toda reforma que hoy parece obvia empezó como una locura de idealista, combatida por personas sensatas que explicaban con paciencia por qué el cambio era imposible.',
          },
          {
            en: 'Idealism without realism produces martyrs and manifestos; realism without idealism produces managers and ledgers, and history needs the first kind.',
            native:
              'El idealismo sin realismo produce mártires y manifiestos; el realismo sin idealismo produce gestores y libros de cuentas, y la historia necesita a los primeros.',
          },
          {
            en: 'The cynical dismissal of idealists is itself a luxury purchased by generations of dreamers whose impossible demands became our ordinary rights.',
            native:
              'El desprecio cínico hacia los idealistas es en sí un lujo comprado por generaciones de soñadores cuyas exigencias imposibles se volvieron nuestros derechos cotidianos.',
          },
        ],
      },
      zh: {
        word: '理想主义',
        question: '理想主义者是天真的梦想家，还是唯一真正改变世界的人？',
        examples: [
          {
            en: 'Every reform that now seems obvious began as an idealist’s folly, opposed by sensible people who explained patiently why change was impossible.',
            native:
              '每一项如今看来显而易见的改革，起初都是理想主义者的“荒唐事”，遭到明智之士的反对——他们曾耐心地解释为何变革不可能。',
          },
          {
            en: 'Idealism without realism produces martyrs and manifestos; realism without idealism produces managers and ledgers, and history needs the first kind.',
            native:
              '没有现实主义的理想主义产出的是殉道者与宣言；没有理想主义的现实主义产出的是经理与账簿——而历史需要的是前者。',
          },
          {
            en: 'The cynical dismissal of idealists is itself a luxury purchased by generations of dreamers whose impossible demands became our ordinary rights.',
            native:
              '对理想主义者犬儒式的轻蔑，本身就是一种奢侈品——由一代代梦想家买单，他们那些不可能的要求，成了我们今天寻常的权利。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'realism',
    questionText: 'Is realism clear-eyed wisdom about limits, or an excuse for accepting injustice?',
    translations: {
      te: {
        word: 'యథార్థవాదం',
        question: 'యథార్థవాదం పరిమితుల గురించి స్పష్టదృష్టి గల జ్ఞానమా, లేదా అన్యాయాన్ని అంగీకరించడానికి సాకా?',
        examples: [
          {
            en: 'Realism begins as respect for facts and ends, too often, as reverence for them, forgetting that today’s facts were once considered impossible dreams.',
            native:
              'యథార్థవాదం వాస్తవాల పట్ల గౌరవంగా మొదలై, చాలామాటకు వాటి పట్ల భక్తిగా ముగుస్తుంది — నేటి వాస్తవాలు ఒకప్పుడు అసాధ్యమైన కలలుగా భావించబడ్డాయని మర్చిపోతూ.',
          },
          {
            en: 'The realist accepts the world as it is; the danger is that acceptance ripens into affection, and affection for what is becomes blindness to what could be.',
            native:
              'యథార్థవాది ప్రపంచాన్ని ఉన్నట్లుగా అంగీకరిస్తాడు; ప్రమాదం ఏమిటంటే ఆ అంగీకారం మక్కువగా పరిపక్వమవుతుంది, ఉన్నదానిపై మక్కువ ఉండగలిగే దాని పట్ల గుడ్డితనమవుతుంది.',
          },
          {
            en: 'Sound judgment requires realist eyes and idealist feet: seeing the terrain exactly as it lies, while still walking toward the country we would prefer.',
            native:
              'దృఢమైన తీర్పుకు యథార్థవాదపు కళ్లు, ఆదర్శవాదపు పాదాలు కావాలి: భూమిని ఉన్నట్లుగానే చూస్తూ, మనం కోరుకునే దేశం వైపు నడవడం కొనసాగించడం.',
          },
        ],
      },
      hi: {
        word: 'यथार्थवाद',
        question:
          'क्या यथार्थवाद सीमाओं के बारे में स्पष्ट-दृष्टि वाली बुद्धिमानी है, या अन्याय स्वीकार करने का बहाना?',
        examples: [
          {
            en: 'Realism begins as respect for facts and ends, too often, as reverence for them, forgetting that today’s facts were once considered impossible dreams.',
            native:
              'यथार्थवाद की शुरुआत तथ्यों के सम्मान से होती है और अंत प्रायः उनकी भक्ति में — यह भूलकर कि आज के तथ्य कभी असंभव सपने माने जाते थे।',
          },
          {
            en: 'The realist accepts the world as it is; the danger is that acceptance ripens into affection, and affection for what is becomes blindness to what could be.',
            native:
              'यथार्थवादी दुनिया को जैसी है वैसी स्वीकार करता है; ख़तरा यह है कि स्वीकृति पककर स्नेह बन जाए, और जो है उससे स्नेह, जो हो सकता है उसके प्रति अंधापन।',
          },
          {
            en: 'Sound judgment requires realist eyes and idealist feet: seeing the terrain exactly as it lies, while still walking toward the country we would prefer.',
            native:
              'सही निर्णय के लिए यथार्थवादी आँखें और आदर्शवादी कदम चाहिए: धरती को ठीक वैसा देखना जैसी वह पड़ी है, और फिर भी उस देश की ओर चलना जिसे हम पसंद करते हैं।',
          },
        ],
      },
      es: {
        word: 'realismo',
        question: '¿Es el realismo sabiduría lúcida sobre los límites o una excusa para aceptar la injusticia?',
        examples: [
          {
            en: 'Realism begins as respect for facts and ends, too often, as reverence for them, forgetting that today’s facts were once considered impossible dreams.',
            native:
              'El realismo empieza como respeto por los hechos y termina, con demasiada frecuencia, como reverencia ante ellos, olvidando que los hechos de hoy fueron sueños imposibles.',
          },
          {
            en: 'The realist accepts the world as it is; the danger is that acceptance ripens into affection, and affection for what is becomes blindness to what could be.',
            native:
              'El realista acepta el mundo tal como es; el peligro es que la aceptación madure en cariño, y el cariño por lo que existe se vuelva ceguera ante lo que podría ser.',
          },
          {
            en: 'Sound judgment requires realist eyes and idealist feet: seeing the terrain exactly as it lies, while still walking toward the country we would prefer.',
            native:
              'El buen juicio requiere ojos de realista y pies de idealista: ver el terreno exactamente como yace, mientras se camina hacia el país que preferiríamos.',
          },
        ],
      },
      zh: {
        word: '现实主义',
        question: '现实主义是对限度的清醒认知，还是接受不公的借口？',
        examples: [
          {
            en: 'Realism begins as respect for facts and ends, too often, as reverence for them, forgetting that today’s facts were once considered impossible dreams.',
            native: '现实主义始于对事实的尊重，却往往终于对事实的膜拜——忘记了今天的事实，曾被视为不可能的梦想。',
          },
          {
            en: 'The realist accepts the world as it is; the danger is that acceptance ripens into affection, and affection for what is becomes blindness to what could be.',
            native:
              '现实主义者接受世界的本来面目；危险在于，接受会熟化为偏爱，而对现状的偏爱，会让人对可能性视而不见。',
          },
          {
            en: 'Sound judgment requires realist eyes and idealist feet: seeing the terrain exactly as it lies, while still walking toward the country we would prefer.',
            native:
              '健全的判断需要现实主义者的眼睛和理想主义者的双脚：看清地势的真实模样，同时仍朝我们更向往的国度跋涉。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'cynicism',
    questionText: 'Is cynicism a sign of intelligence, or a failure of courage?',
    translations: {
      te: {
        word: 'నిర్లిప్తవాదం',
        question: 'నిర్లిప్తవాదం తెలివికి గుర్తా, లేదా ధైర్యం లోపించడమా?',
        examples: [
          {
            en: 'Cynicism flatters its holder with the sense of having seen through everything, which conveniently excuses him from the risky business of believing anything.',
            native:
              'నిర్లిప్తవాదం తన వాడుకరిని అట్టిపెడుతుంది — ప్రతిదీ చూసేసాననే భావనతో — ఏదైనా నమ్మే ప్రమాదకర పని నుండి అతనికి అనుకూలమైన విముఖిని ఇస్తూ.',
          },
          {
            en: 'The cynic predicts disappointment and is often right, for expecting nothing from people is a reliable method of helping them deliver exactly that.',
            native:
              'నిర్లిప్తవాది నిరాశను అంచనా వేస్తాడు, తరచుగా నిజమూ అవుతుంది — ఎందుకంటే ప్రజల నుండి ఏమీ ఆశించకపోవడం వారు కచ్చితంగా అదే ఇచ్చేలా చేసే నమ్మదగిన పద్ధతి.',
          },
          {
            en: 'Beneath most cynicism lies disappointed idealism, and the loudest sneer usually conceals the tenderest hope that was once betrayed in public.',
            native:
              'చాలామట్టుకు నిర్లిప్తవాదం అడుగున నిరాశ చెందిన ఆదర్శవాదం ఉంటుంది, మరియు అత్యంత గట్టి ఎగతాళి వెనుక సాధారణంగా బహిరంగంగా ద్రోహం చేయబడిన అతి మెరుకైన ఆశ దాగి ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'तिरस्कारवाद',
        question: 'क्या तिरस्कारवाद बुद्धिमानी की निशानी है, या साहस की हार?',
        examples: [
          {
            en: 'Cynicism flatters its holder with the sense of having seen through everything, which conveniently excuses him from the risky business of believing anything.',
            native:
              'तिरस्कारवाद अपने धारक को चापलूसी देता है — यह भ्रम कि उसने सब भेद लिया — जो उसे कुछ भी मानने के जोखिम भरे काम से सुविधाजनक छुटकारा देता है।',
          },
          {
            en: 'The cynic predicts disappointment and is often right, for expecting nothing from people is a reliable method of helping them deliver exactly that.',
            native:
              'तिरस्कारवादी निराशा की भविष्यवाणी करता है और अक्सर सही भी होता है, क्योंकि लोगों से कुछ न उम्मीद करना उनसे ठीक वही दिलवाने का भरोसेमंद तरीका है।',
          },
          {
            en: 'Beneath most cynicism lies disappointed idealism, and the loudest sneer usually conceals the tenderest hope that was once betrayed in public.',
            native:
              'अधिकतर तिरस्कारवाद के नीचे टूटा हुआ आदर्शवाद छिपा होता है, और सबसे ऊँची हँसी के पीछे प्रायः वह सबसे कोमल आशा होती है जिसका कभी सार्वजनिक रूप से अपमान हुआ था।',
          },
        ],
      },
      es: {
        word: 'cinismo',
        question: '¿Es el cinismo una señal de inteligencia o un fracaso del coraje?',
        examples: [
          {
            en: 'Cynicism flatters its holder with the sense of having seen through everything, which conveniently excuses him from the risky business of believing anything.',
            native:
              'El cinismo halaga a quien lo profesa con la sensación de haberlo calado todo, lo que convenientemente lo excusa del arriesgado negocio de creer en algo.',
          },
          {
            en: 'The cynic predicts disappointment and is often right, for expecting nothing from people is a reliable method of helping them deliver exactly that.',
            native:
              'El cínico predice decepción y a menudo acierta, pues no esperar nada de la gente es un método fiable de ayudarla a entregar exactamente eso.',
          },
          {
            en: 'Beneath most cynicism lies disappointed idealism, and the loudest sneer usually conceals the tenderest hope that was once betrayed in public.',
            native:
              'Bajo la mayoría del cinismo yace un idealismo decepcionado, y la mueca más estridente suele ocultar la esperanza más tierna que una vez fue traicionada en público.',
          },
        ],
      },
      zh: {
        word: '犬儒主义',
        question: '犬儒是聪明的标志，还是勇气的失败？',
        examples: [
          {
            en: 'Cynicism flatters its holder with the sense of having seen through everything, which conveniently excuses him from the risky business of believing anything.',
            native: '犬儒主义者以“看透一切”的幻觉自我陶醉，这恰好让他免于从事“相信一些东西”这桩有风险的营生。',
          },
          {
            en: 'The cynic predicts disappointment and is often right, for expecting nothing from people is a reliable method of helping them deliver exactly that.',
            native: '犬儒者预言失望，而且常常言中——因为对人无所期待，恰恰是促使他们交出“无所作为”的可靠方法。',
          },
          {
            en: 'Beneath most cynicism lies disappointed idealism, and the loudest sneer usually conceals the tenderest hope that was once betrayed in public.',
            native:
              '多数犬儒底下埋着破灭的理想主义，而最响亮的讥诮背后，通常藏着那份曾在众目睽睽之下被背叛的最温柔的希望。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'optimism',
    questionText: 'Is optimism a rational stance toward the future, or a pleasant delusion?',
    translations: {
      te: {
        word: 'ఆశావాదం',
        question: 'ఆశావాదం భవిష్యత్తు పట్ల తార్కికమైన వైఖరా, లేదా ఆహ్లాదకరమైన భ్రమా?',
        examples: [
          {
            en: 'Optimism is rarely the belief that things will go well; it is the decision to act as though effort matters, which is what makes things go well.',
            native:
              'ఆశావాదం అంటే విషయాలు బాగుంటాయనే నమ్మకం అరుదుగా ఉంటుంది; శ్రమకు విలువ ఉన్నట్లు ప్రవర్తించే నిర్ణయం అది — విషయాలు బాగుండేలా చేసేది కూడా అదే.',
          },
          {
            en: 'The optimist and the pessimist are often both wrong about the future, but the optimist enjoys the present and gathers allies while being wrong.',
            native:
              'ఆశావాది, నిరాశావాది ఇద్దరూ భవిష్యత్తు గురించి తరచుగా తప్పవుతారు, కానీ ఆశావాది తప్పవుతూనే వర్తమానాన్ని ఆస్వాదిస్తాడు, మిత్రులను చేరుస్తాడు.',
          },
          {
            en: 'Hope is not a forecast but a discipline, and those who practise it tend to produce the evidence that justifies having practised it.',
            native:
              'ఆశ అంచనా కాదు, ఒక క్రమశిక్షణ — దాన్ని సాధన చేసేవారు, దాన్ని సాధన చేయడాన్ని సమర్థించే ఆధారాలను తామే రూపొందించుకుంటారు.',
          },
        ],
      },
      hi: {
        word: 'आशावाद',
        question: 'क्या आशावाद भविष्य के प्रति एक तार्किक रुख़ है, या एक सुखद भ्रम?',
        examples: [
          {
            en: 'Optimism is rarely the belief that things will go well; it is the decision to act as though effort matters, which is what makes things go well.',
            native:
              'आशावाद शायद ही कभी यह विश्वास होता है कि चीज़ें अच्छी होंगी; यह यह फ़ैसला होता है कि ऐसे कार्य करो मानो प्रयास मायने रखता है — और इसीलिए चीज़ें अच्छी होती हैं।',
          },
          {
            en: 'The optimist and the pessimist are often both wrong about the future, but the optimist enjoys the present and gathers allies while being wrong.',
            native:
              'आशावादी और निराशावादी दोनों अक्सर भविष्य के बारे में ग़लत होते हैं, पर आशावादी ग़लत होते हुए भी वर्तमान का आनंद लेता है और साथी जुटाता है।',
          },
          {
            en: 'Hope is not a forecast but a discipline, and those who practise it tend to produce the evidence that justifies having practised it.',
            native:
              'आशा कोई पूर्वानुमान नहीं, एक अनुशासन है — और जो इसका अभ्यास करते हैं, वे अक्सर वे सबूत पैदा कर देते हैं जो उस अभ्यास को सही ठहराते हैं।',
          },
        ],
      },
      es: {
        word: 'optimismo',
        question: '¿Es el optimismo una postura racional ante el futuro o una agradable ilusión?',
        examples: [
          {
            en: 'Optimism is rarely the belief that things will go well; it is the decision to act as though effort matters, which is what makes things go well.',
            native:
              'El optimismo rara vez es la creencia de que las cosas irán bien; es la decisión de actuar como si el esfuerzo importara, que es lo que hace que las cosas vayan bien.',
          },
          {
            en: 'The optimist and the pessimist are often both wrong about the future, but the optimist enjoys the present and gathers allies while being wrong.',
            native:
              'El optimista y el pesimista suelen equivocarse ambos sobre el futuro, pero el optimista disfruta el presente y reúne aliados mientras se equivoca.',
          },
          {
            en: 'Hope is not a forecast but a discipline, and those who practise it tend to produce the evidence that justifies having practised it.',
            native:
              'La esperanza no es un pronóstico sino una disciplina, y quienes la practican tienden a producir las pruebas que justifican haberla practicado.',
          },
        ],
      },
      zh: {
        word: '乐观主义',
        question: '乐观是面对未来的理性姿态，还是一种令人愉悦的错觉？',
        examples: [
          {
            en: 'Optimism is rarely the belief that things will go well; it is the decision to act as though effort matters, which is what makes things go well.',
            native: '乐观很少是“事情会顺利”的信念；它是“当作努力有意义那样去行动”的决定——而这恰恰让事情顺利。',
          },
          {
            en: 'The optimist and the pessimist are often both wrong about the future, but the optimist enjoys the present and gathers allies while being wrong.',
            native: '乐观者和悲观者对未来的判断常常都错，但乐观者在犯错的同时享受着当下，并聚拢同伴。',
          },
          {
            en: 'Hope is not a forecast but a discipline, and those who practise it tend to produce the evidence that justifies having practised it.',
            native: '希望不是预测，而是一种修行；践行它的人，往往会亲手造出证明这种修行值得的证据。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'pessimism',
    questionText: 'Does pessimism protect us from disappointment, or guarantee a darker life?',
    translations: {
      te: {
        word: 'నిరాశావాదం',
        question: 'నిరాశావాదం మనల్ని నిరాశ నుండి కాపాడుతుందా, లేదా మరింత చీకటి జీవితానికి హామీ ఇస్తుందా?',
        examples: [
          {
            en: 'Pessimism insures against disappointment by pre-paying it: the pessimist suffers every misfortune twice, once in dread and once in fact.',
            native:
              'నిరాశావాదం నిరాశను ముందే చెల్లించడం ద్వారా దానికి బీమా ఇస్తుంది: నిరాశావాది ప్రతి విపత్తును రెండుసార్లు భరిస్తాడు — ఒకసారి భయంతో, ఒకసారి వాస్తవంగా.',
          },
          {
            en: 'A forecast of doom feels like wisdom because it can never be embarrassed by events, yet it quietly forfeits every victory that required trying.',
            native:
              'వినాశన అంచనా జ్ఞానంలా అనిపిస్తుంది ఎందుకంటే సంఘటనల ముందు అది ఎప్పటికీ సిగ్గుపడదు, అయితే ప్రయత్నం కోరిన ప్రతి విజయాన్ని అది నిశ్శబ్దంగా వదులుకుంటుంది.',
          },
          {
            en: 'The pessimist calls himself a realist, but despair is no more accurate than hope; both are bets placed on a future no one has seen.',
            native:
              'నిరాశావాది తనను యథార్థవాది అని పిలుచుకుంటాడు, కానీ నిరాశ ఆశ కంటే ఖచ్చితమైనది కాదు — రెండూ ఎవరూ చూడని భవిష్యత్తుపై వేసిన పందాలే.',
          },
        ],
      },
      hi: {
        word: 'निराशावाद',
        question: 'क्या निराशावाद हमें निराशा से बचाता है, या एक और अधिक अंधेरे जीवन की गारंटी देता है?',
        examples: [
          {
            en: 'Pessimism insures against disappointment by pre-paying it: the pessimist suffers every misfortune twice, once in dread and once in fact.',
            native:
              'निराशावाद निराशा का पैसा पहले चुकाकर उससे बीमा करता है: निराशावादी हर विपत्ति दो बार झेलता है — एक बार आशंका में, एक बार वास्तव में।',
          },
          {
            en: 'A forecast of doom feels like wisdom because it can never be embarrassed by events, yet it quietly forfeits every victory that required trying.',
            native:
              'विनाश की भविष्यवाणी बुद्धिमानी जैसी लगती है क्योंकि घटनाएँ उसे कभी शर्मिंदा नहीं कर सकतीं, पर वह चुपचाप हर उस जीत को गँवा देती है जिसके लिए कोशिश ज़रूरी थी।',
          },
          {
            en: 'The pessimist calls himself a realist, but despair is no more accurate than hope; both are bets placed on a future no one has seen.',
            native:
              'निराशावादी खुद को यथार्थवादी कहता है, पर निराशा आशा से ज़्यादा सटीक नहीं है; दोनों उस भविष्य पर लगे दाँव हैं जिसे किसी ने नहीं देखा।',
          },
        ],
      },
      es: {
        word: 'pesimismo',
        question: '¿Nos protege el pesimismo de la decepción o garantiza una vida más oscura?',
        examples: [
          {
            en: 'Pessimism insures against disappointment by pre-paying it: the pessimist suffers every misfortune twice, once in dread and once in fact.',
            native:
              'El pesimismo asegura contra la decepción pagándola por adelantado: el pesimista sufre cada desgracia dos veces, una en el temor y otra en los hechos.',
          },
          {
            en: 'A forecast of doom feels like wisdom because it can never be embarrassed by events, yet it quietly forfeits every victory that required trying.',
            native:
              'Un pronóstico de perdición parece sabiduría porque los acontecimientos jamás pueden avergonzarlo, pero renuncia en silencio a toda victoria que exigiera intentarlo.',
          },
          {
            en: 'The pessimist calls himself a realist, but despair is no more accurate than hope; both are bets placed on a future no one has seen.',
            native:
              'El pesimista se llama realista, pero la desesperación no es más exacta que la esperanza; ambas son apuestas sobre un futuro que nadie ha visto.',
          },
        ],
      },
      zh: {
        word: '悲观主义',
        question: '悲观能保护我们免于失望，还是注定让生活更加灰暗？',
        examples: [
          {
            en: 'Pessimism insures against disappointment by pre-paying it: the pessimist suffers every misfortune twice, once in dread and once in fact.',
            native: '悲观通过预付失望来给自己上保险：悲观者把每一次不幸都经受两遍——一遍在忧惧中，一遍在现实里。',
          },
          {
            en: 'A forecast of doom feels like wisdom because it can never be embarrassed by events, yet it quietly forfeits every victory that required trying.',
            native: '预言厄运听上去像智慧，因为它永远不会被事实打脸；但它悄悄放弃了每一次需要尝试才能赢得的胜利。',
          },
          {
            en: 'The pessimist calls himself a realist, but despair is no more accurate than hope; both are bets placed on a future no one has seen.',
            native: '悲观者自称现实主义者，但绝望并不比希望更准确——两者都是押在一个无人见过的未来上的赌注。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'nihilism',
    questionText: 'If nothing has inherent meaning, does anything we do matter at all?',
    translations: {
      te: {
        word: 'శూన్యవాదం',
        question: 'దేనికీ అంతర్నిహిత అర్థం లేకపోతే, మనం చేసే దేనికైనా అసలు విలువ ఉందా?',
        examples: [
          {
            en: 'Nihilism reasons correctly that the universe assigns no meanings, then errs in concluding that meanings therefore cannot be assigned by us.',
            native:
              'విశ్వం అర్థాలను కేటాయించదని శూన్యవాదం సరిగ్గానే తర్కిస్తుంది, తర్వాత అర్థాలను మనం కేటాయించలేమని నిర్ధారించడంలో పొరపడుతుంది.',
          },
          {
            en: 'The abyss that the nihilist stares into is real, but so is the choice of what to build on its edge, and building is the braver philosophy.',
            native:
              'శూన్యవాది చూస్తున్న అగాధం నిజమే, కానీ దాని అంచున ఏమి నిర్మించాలో ఎంపిక కూడా నిజమే — నిర్మించడమే ధైర్యవంతమైన తత్వం.',
          },
          {
            en: 'Meaning was never discovered in the world like gold in a river; it was always minted by people, and nihilism merely notices that the mint is us.',
            native:
              'నదిలో బంగారంలా ప్రపంచంలో అర్థం ఎప్పుడూ కనుగొనబడలేదు; అది ఎల్లప్పుడూ మనుషులచేత ముద్రించబడేది — ముద్రణాలయం మనమే అని శూన్యవాదం కేవలం గమనిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'शून्यवाद',
        question: 'यदि किसी चीज़ का स्वाभाविक अर्थ नहीं है, तो हमारे किए किसी काम का कुछ मोल है या नहीं?',
        examples: [
          {
            en: 'Nihilism reasons correctly that the universe assigns no meanings, then errs in concluding that meanings therefore cannot be assigned by us.',
            native:
              'शून्यवाद ठीक से तर्क करता है कि ब्रह्मांड कोई अर्थ नहीं सौंपता, फिर यह निष्कर्ष निकालने में भूल करता है कि इसलिए अर्थ हम भी नहीं सौंप सकते।',
          },
          {
            en: 'The abyss that the nihilist stares into is real, but so is the choice of what to build on its edge, and building is the braver philosophy.',
            native:
              'जिस रसातल में शून्यवादी टकटकी लगाए देखता है, वह वास्तविक है, पर उसके किनारे क्या बनाना है, यह चुनाव भी उतना ही वास्तविक है — और बनाना ही बहादुर दर्शन है।',
          },
          {
            en: 'Meaning was never discovered in the world like gold in a river; it was always minted by people, and nihilism merely notices that the mint is us.',
            native:
              'अर्थ दुनिया में कभी नदी के सोने की तरह नहीं मिला; उसे हमेशा लोगों ने ही ढाला है — और शून्यवाद बस इतना देखता है कि टकसाल हम खुद हैं।',
          },
        ],
      },
      es: {
        word: 'nihilismo',
        question: 'Si nada tiene un sentido inherente, ¿importa en absoluto lo que hacemos?',
        examples: [
          {
            en: 'Nihilism reasons correctly that the universe assigns no meanings, then errs in concluding that meanings therefore cannot be assigned by us.',
            native:
              'El nihilismo razona correctamente que el universo no asigna sentidos, y luego yerra al concluir que por eso los sentidos no pueden ser asignados por nosotros.',
          },
          {
            en: 'The abyss that the nihilist stares into is real, but so is the choice of what to build on its edge, and building is the braver philosophy.',
            native:
              'El abismo al que mira el nihilista es real, pero también lo es la elección de qué construir a su borde, y construir es la filosofía más valiente.',
          },
          {
            en: 'Meaning was never discovered in the world like gold in a river; it was always minted by people, and nihilism merely notices that the mint is us.',
            native:
              'El sentido nunca se descubrió en el mundo como oro en un río; siempre fue acuñado por personas, y el nihilismo solo advierte que la casa de moneda somos nosotros.',
          },
        ],
      },
      zh: {
        word: '虚无主义',
        question: '如果万物都没有内在的意义，我们所做的一切还重要吗？',
        examples: [
          {
            en: 'Nihilism reasons correctly that the universe assigns no meanings, then errs in concluding that meanings therefore cannot be assigned by us.',
            native: '虚无主义正确地论证了宇宙不指派任何意义，却错误地推论：因此意义也无法由我们来指派。',
          },
          {
            en: 'The abyss that the nihilist stares into is real, but so is the choice of what to build on its edge, and building is the braver philosophy.',
            native: '虚无主义者凝视的深渊是真实的，但在深渊边缘建造什么的选择同样真实——而建造，是更勇敢的哲学。',
          },
          {
            en: 'Meaning was never discovered in the world like gold in a river; it was always minted by people, and nihilism merely notices that the mint is us.',
            native:
              '意义从来不是像河里的金子那样在世界上被发现的；它一向由人铸造——虚无主义只是注意到：铸币厂就是我们自己。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'stoicism',
    questionText: 'Is stoicism emotional wisdom, or a denial of what makes us human?',
    translations: {
      te: {
        word: 'స్తోయికవాదం',
        question: 'స్తోయికవాదం భావోద్వేగ జ్ఞానమా, లేదా మనల్ని మనుషుల్ని చేసే దాన్ని ఖండనా?',
        examples: [
          {
            en: 'Stoicism teaches the division of the world into what we control and what we do not, and asks us to grieve only for the first, which spares us most of our grief.',
            native:
              'ప్రపంచాన్ని మన నియంత్రణలో ఉన్నవిగా, లేనివిగా విభజించమని స్తోయికవాదం నేర్పుతుంది — మొదటివాటి కోసం మాత్రమే దుఃఖించమని అడుగుతుంది, దీంతో మన దుఃఖంలో ఎక్కువ భాగం తగ్గిపోతుంది.',
          },
          {
            en: 'Critics call the stoic cold, yet there is a difference between feeling nothing and refusing to be governed by everything one happens to feel.',
            native:
              'విమర్శకులు స్తోయికుడిని నిర్దయుడని అంటారు, అయితే ఏమీ అనుభవించకపోవడానికి, తనకు తోచిన ప్రతి భావన చేత పాలించబడడాన్ని తిరస్కరించడానికి మధ్య తేడా ఉంది.',
          },
          {
            en: 'The danger is that serenity becomes avoidance: a person untroubled by injustice has not conquered emotion but merely chosen comfortable blindness.',
            native:
              'ప్రమాదం ఏమిటంటే ప్రశాంతత పరికావడం కావచ్చు: అన్యాయంతో కలత చెందని వ్యక్తి భావోద్వేగాన్ని జయించలేదు — కేవలం సౌకర్యవంతమైన గుడ్డితనాన్ని ఎంచుకున్నాడు.',
          },
        ],
      },
      hi: {
        word: 'स्तोइकवाद',
        question: 'क्या स्तोइकवाद भावनात्मक बुद्धिमानी है, या उस चीज़ का इनकार जो हमें इंसान बनाती है?',
        examples: [
          {
            en: 'Stoicism teaches the division of the world into what we control and what we do not, and asks us to grieve only for the first, which spares us most of our grief.',
            native:
              'स्तोइकवाद दुनिया को उसमें बाँटना सिखाता है जो हमारे नियंत्रण में है और जो नहीं — और केवल पहले के लिए शोक करने को कहता है, जिससे हमारा ज़्यादातर दुख बच जाता है।',
          },
          {
            en: 'Critics call the stoic cold, yet there is a difference between feeling nothing and refusing to be governed by everything one happens to feel.',
            native:
              'आलोचक स्तोइक को बेदर्द कहते हैं, पर कुछ भी महसूस न करने और जो कुछ महसूस हो रहा हो उससे शासित होने से इनकार करने में फ़र्क़ है।',
          },
          {
            en: 'The danger is that serenity becomes avoidance: a person untroubled by injustice has not conquered emotion but merely chosen comfortable blindness.',
            native:
              'ख़तरा यह है कि प्रसन्नता बचकर निकलना बन जाए: जो व्यक्ति अन्याय से विचलित नहीं होता, उसने भावना को जीता नहीं है, बस सुविधाजनक अंधता चुनी है।',
          },
        ],
      },
      es: {
        word: 'estoicismo',
        question: '¿Es el estoicismo sabiduría emocional o una negación de lo que nos hace humanos?',
        examples: [
          {
            en: 'Stoicism teaches the division of the world into what we control and what we do not, and asks us to grieve only for the first, which spares us most of our grief.',
            native:
              'El estoicismo enseña a dividir el mundo en lo que controlamos y lo que no, y nos pide afligirnos solo por lo primero, lo que nos ahorra la mayor parte de nuestro dolor.',
          },
          {
            en: 'Critics call the stoic cold, yet there is a difference between feeling nothing and refusing to be governed by everything one happens to feel.',
            native:
              'Los críticos llaman frío al estoico, pero hay diferencia entre no sentir nada y negarse a ser gobernado por todo lo que uno resulta sentir.',
          },
          {
            en: 'The danger is that serenity becomes avoidance: a person untroubled by injustice has not conquered emotion but merely chosen comfortable blindness.',
            native:
              'El peligro es que la serenidad se vuelva evasión: quien no se perturba ante la injusticia no ha vencido la emoción, solo ha elegido una ceguera cómoda.',
          },
        ],
      },
      zh: {
        word: '斯多葛主义',
        question: '斯多葛主义是情感上的智慧，还是对人性中珍贵部分的否认？',
        examples: [
          {
            en: 'Stoicism teaches the division of the world into what we control and what we do not, and asks us to grieve only for the first, which spares us most of our grief.',
            native: '斯多葛主义教导我们把世界分为可控与不可控两部分，并只为前者悲伤——这能让我们免于大部分的悲伤。',
          },
          {
            en: 'Critics call the stoic cold, yet there is a difference between feeling nothing and refusing to be governed by everything one happens to feel.',
            native: '批评者称斯多葛者冷漠，但“毫无感觉”与“拒绝被恰好涌起的每一种感觉所统治”之间，是有区别的。',
          },
          {
            en: 'The danger is that serenity becomes avoidance: a person untroubled by injustice has not conquered emotion but merely chosen comfortable blindness.',
            native: '危险在于宁静会沦为逃避：对不义无动于衷的人，并没有征服情感，只是选择了舒适的盲目。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'hedonism',
    questionText: 'Is the pursuit of pleasure a worthy goal, or a trap that diminishes life?',
    translations: {
      te: {
        word: 'సుఖవాదం',
        question: 'సుఖాన్వేషణ ఒక విలువైన లక్ష్యమా, లేదా జీవితాన్ని తగ్గించే ఉచ్చా?',
        examples: [
          {
            en: 'Pleasure pursued directly has a strange way of receding, whereas pleasure that arrives as a by-product of meaningful work tends to stay.',
            native:
              'ప్రత్యక్షంగా వెంటాడే సుఖం వింతగా దూరంగా జరుగుతుంది, అయితే అర్థవంతమైన పని యొక్క ఉపోత్పత్తిగా వచ్చే సుఖం నిలిచిపోతుంది.',
          },
          {
            en: 'The hedonist mistakes the menu for the meal: he collects experiences designed to feel good and forgets to ask what they were good for.',
            native:
              'సుఖవాది మెనూను భోజనంగా పొరపడతాడు: బాగా అనిపించేలా రూపొందించిన అనుభవాలను సేకరిస్తాడు, అవి దేనికి మంచివో అడగడం మర్చిపోతాడు.',
          },
          {
            en: 'A life without pleasure is bleak, but a life organized around pleasure is bleaker, for happiness demands purposes that outlast our moods.',
            native:
              'సుఖం లేని జీవితం శోచనీయం, కానీ సుఖం చుట్టూ నిర్మించిన జీవితం మరింత శోచనీయం — ఎందుకంటే ఆనందానికి మన మూడ్ల కంటే నిలిచే లక్ష్యాలు కావాలి.',
          },
        ],
      },
      hi: {
        word: 'सुखवाद',
        question: 'क्या सुख की खोज एक सार्थक लक्ष्य है, या जीवन को छोटा करने वाला एक जाल?',
        examples: [
          {
            en: 'Pleasure pursued directly has a strange way of receding, whereas pleasure that arrives as a by-product of meaningful work tends to stay.',
            native:
              'सीधे पीछा किया गया सुख अजीब तरह से दूर खिसकता जाता है, जबकि सार्थक काम के उप-उत्पाद के रूप में आया सुख टिकता है।',
          },
          {
            en: 'The hedonist mistakes the menu for the meal: he collects experiences designed to feel good and forgets to ask what they were good for.',
            native:
              'सुखवादी मेनू को भोजन समझ बैठता है: वह अच्छा महसूस कराने के लिए बनाए गए अनुभवों को इकट्ठा करता है, और यह पूछना भूल जाता है कि वे किस लिए अच्छे थे।',
          },
          {
            en: 'A life without pleasure is bleak, but a life organized around pleasure is bleaker, for happiness demands purposes that outlast our moods.',
            native:
              'सुख के बिना जीवन उदास है, पर सुख के इर्द-गिर्द बना जीवन और भी उदास, क्योंकि ख़ुशी को ऐसे उद्देश्य चाहिए जो हमारे मिज़ाज से देर तक टिकें।',
          },
        ],
      },
      es: {
        word: 'hedonismo',
        question: '¿Es la búsqueda del placer una meta digna o una trampa que empobrece la vida?',
        examples: [
          {
            en: 'Pleasure pursued directly has a strange way of receding, whereas pleasure that arrives as a by-product of meaningful work tends to stay.',
            native:
              'El placer perseguido directamente tiene la extraña costumbre de alejarse, mientras que el que llega como subproducto de un trabajo significativo tiende a quedarse.',
          },
          {
            en: 'The hedonist mistakes the menu for the meal: he collects experiences designed to feel good and forgets to ask what they were good for.',
            native:
              'El hedonista confunde el menú con la comida: colecciona experiencias diseñadas para sentirse bien y olvida preguntar para qué eran buenas.',
          },
          {
            en: 'A life without pleasure is bleak, but a life organized around pleasure is bleaker, for happiness demands purposes that outlast our moods.',
            native:
              'Una vida sin placer es sombría, pero una vida organizada en torno al placer lo es más, pues la felicidad exige propósitos que duren más que nuestros estados de ánimo.',
          },
        ],
      },
      zh: {
        word: '享乐主义',
        question: '追求快乐是值得的目标，还是让生活贬值的陷阱？',
        examples: [
          {
            en: 'Pleasure pursued directly has a strange way of receding, whereas pleasure that arrives as a by-product of meaningful work tends to stay.',
            native: '被直接追逐的快乐有一种奇特的退避方式；而作为有意义工作副产品到来的快乐，往往留得更久。',
          },
          {
            en: 'The hedonist mistakes the menu for the meal: he collects experiences designed to feel good and forgets to ask what they were good for.',
            native: '享乐主义者把菜单当成了饭菜：他收集种种为“感觉良好”而设计的体验，却忘了问它们究竟好在哪里。',
          },
          {
            en: 'A life without pleasure is bleak, but a life organized around pleasure is bleaker, for happiness demands purposes that outlast our moods.',
            native: '没有快乐的人生是凄凉的，但围绕快乐组织起来的人生更加凄凉——因为幸福需要比我们情绪更持久的目标。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'altruism',
    questionText: 'Is pure altruism possible, or is every kind act secretly self-interested?',
    translations: {
      te: {
        word: 'పరోపకారం',
        question: 'స్వచ్ఛమైన పరోపకారం సాధ్యమా, లేదా ప్రతి మంచి చర్య రహస్యంగా స్వార్థమేనా?',
        examples: [
          {
            en: 'That helping others feels good proves not that altruism is selfish, but that we are so built that the welfare of others can become our own.',
            native:
              'ఇతరులకు సహాయం చేయడం బాగా అనిపించడం పరోపకారం స్వార్థమే అని నిరూపించదు — ఇతరుల శ్రేయస్సు మనది కాగలదన్నట్లు మనం నిర్మించబడ్డామని చూపిస్తుంది.',
          },
          {
            en: 'If a rescuer risks his life for a stranger, calling it selfishness because he would have felt guilty otherwise stretches the word until it explains nothing.',
            native:
              'అపరిచితుడి కోసం ప్రాణం పణంగా పెట్టిన రక్షకుడి గురించి — లేకపోతే అపరాధ భావన ఉండేది కదా అని — స్వార్థం అనడం ఆ మాటను ఏమీ వివరించలేనంతగా సాగదీయడమే.',
          },
          {
            en: 'Perhaps the question dissolves when we see that self and other are not rivals in a zero-sum game, but neighbours whose flourishing is intertwined.',
            native:
              'స్వం, పరం పరస్పరం సున్నా-మొత్తం ఆటలో ప్రత్యర్థులు కావని, వర్ధమానం పరస్పరం ముడిపడిన పొరుగువారని చూసినప్పుడు బహుశా ఈ ప్రశ్నే కరిగిపోతుంది.',
          },
        ],
      },
      hi: {
        word: 'परोपकार',
        question: 'क्या शुद्ध परोपकार संभव है, या हर नेक काम अंदर ही अंदर स्वार्थी होता है?',
        examples: [
          {
            en: 'That helping others feels good proves not that altruism is selfish, but that we are so built that the welfare of others can become our own.',
            native:
              'दूसरों की मदद करने में अच्छा लगना यह साबित नहीं करता कि परोपकार स्वार्थी है, बल्कि यह कि हम ऐसे बने हैं कि दूसरों की भलाई हमारी अपनी बन सकती है।',
          },
          {
            en: 'If a rescuer risks his life for a stranger, calling it selfishness because he would have felt guilty otherwise stretches the word until it explains nothing.',
            native:
              'यदि कोई बचाने वाला अजनबी के लिए अपनी जान दाँव पर लगा दे, तो उसे स्वार्थी कहना — क्योंकि वरना उसे अपराधबोध होता — शब्द को इतना खींचना है कि वह कुछ समझा न पाए।',
          },
          {
            en: 'Perhaps the question dissolves when we see that self and other are not rivals in a zero-sum game, but neighbours whose flourishing is intertwined.',
            native:
              'शायद सवाल तब घुल जाता है जब हम देखते हैं कि स्वयं और दूसरा शून्य-योग के खेल में प्रतिद्वंद्वी नहीं, बल्कि ऐसे पड़ोसी हैं जिनकी बहती आपस में जुड़ी है।',
          },
        ],
      },
      es: {
        word: 'altruismo',
        question: '¿Es posible el altruismo puro, o todo acto amable es secretamente interesado?',
        examples: [
          {
            en: 'That helping others feels good proves not that altruism is selfish, but that we are so built that the welfare of others can become our own.',
            native:
              'Que ayudar a otros se sienta bien no prueba que el altruismo sea egoísta, sino que estamos hechos de tal modo que el bienestar ajeno puede volverse el nuestro.',
          },
          {
            en: 'If a rescuer risks his life for a stranger, calling it selfishness because he would have felt guilty otherwise stretches the word until it explains nothing.',
            native:
              'Si un rescatista arriesga la vida por un extraño, llamarlo egoísmo porque de otro modo se sentiría culpable estira la palabra hasta que no explica nada.',
          },
          {
            en: 'Perhaps the question dissolves when we see that self and other are not rivals in a zero-sum game, but neighbours whose flourishing is intertwined.',
            native:
              'Quizá la pregunta se disuelve al ver que el yo y el otro no son rivales en un juego de suma cero, sino vecinos cuyo florecimiento está entrelazado.',
          },
        ],
      },
      zh: {
        word: '利他主义',
        question: '纯粹的利他主义可能存在吗？还是说每一个善举背后都暗藏自利？',
        examples: [
          {
            en: 'That helping others feels good proves not that altruism is selfish, but that we are so built that the welfare of others can become our own.',
            native:
              '帮助他人感觉良好，并不能证明利他是自私的；它证明的是：我们天生如此——他人的福祉可以成为我们自己的福祉。',
          },
          {
            en: 'If a rescuer risks his life for a stranger, calling it selfishness because he would have felt guilty otherwise stretches the word until it explains nothing.',
            native:
              '若有人为陌生人冒生命危险，却说这是自私——因为否则他会内疚——那就是把这个词拉伸到无法解释任何东西的地步。',
          },
          {
            en: 'Perhaps the question dissolves when we see that self and other are not rivals in a zero-sum game, but neighbours whose flourishing is intertwined.',
            native: '当我们看清自我与他人并非零和博弈中的对手，而是兴衰交织的邻人时，这个问题或许就自行消解了。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'utilitarianism',
    questionText: 'Should we always choose whatever produces the greatest happiness for the greatest number?',
    translations: {
      te: {
        word: 'ఉపయోగవాదం',
        question: 'అత్యధిక మందికి అత్యధిక సుఖాన్నిచ్చే దాన్నే మనం ఎల్లప్పుడూ ఎంచుకోవాలా?',
        examples: [
          {
            en: 'Utilitarianism gives morality the clarity of arithmetic, but arithmetic cannot weigh the difference between killing one innocent and letting ten die.',
            native:
              'నీతికి ఉపయోగవాదం అంకెల స్పష్టతను ఇస్తుంది, కానీ ఒక అమాయకుడిని చంపడానికి, పది మంది చనిపోవడానికి వదిలేయడానికి మధ్య తేడాను అంకెలు తూలేవు.',
          },
          {
            en: 'The greatest happiness principle dignifies everyone’s suffering equally, which is its glory, and it authorizes sacrificing anyone, which is its horror.',
            native:
              'అత్యధిక సుఖ సూత్రం అందరి బాధను సమానంగా గౌరవిస్తుంది — అది దాని మహిమ; ఎవరినైనా త్యాగం చేయడానికి అది అనుమతి ఇస్తుంది — అది దాని భయంకరం.',
          },
          {
            en: 'Societies need utilitarian reasoning for policy and limits on it for persons, because people are not containers of utility to be traded like coins.',
            native:
              'విధానాలకు ఉపయోగవాదపు తర్కం కావాలి, వ్యక్తులకు దానిపై పరిమితులు కావాలి — ఎందుకంటే మనుషులు నాణేల్లా మార్చుకునే ఉపయోగం యొక్క పాత్రలు కాదు.',
          },
        ],
      },
      hi: {
        word: 'उपयोगितावाद',
        question: 'क्या हमें हमेशा वही चुनना चाहिए जो सबसे अधिक लोगों के लिए सबसे अधिक सुख पैदा करे?',
        examples: [
          {
            en: 'Utilitarianism gives morality the clarity of arithmetic, but arithmetic cannot weigh the difference between killing one innocent and letting ten die.',
            native:
              'उपयोगितावाद नैतिकता को अंकगणित जैसी स्पष्टता देता है, पर अंकगणित एक निर्दोष को मारने और दस को मरने देने के बीच का अंतर तौल नहीं सकती।',
          },
          {
            en: 'The greatest happiness principle dignifies everyone’s suffering equally, which is its glory, and it authorizes sacrificing anyone, which is its horror.',
            native:
              'सर्वाधिक सुख का सिद्धांत सबके दुख को समान गरिमा देता है — यही उसकी महिमा है; और वह किसी के भी त्याग को अनुमति देता है — यही उसका भय है।',
          },
          {
            en: 'Societies need utilitarian reasoning for policy and limits on it for persons, because people are not containers of utility to be traded like coins.',
            native:
              'समाजों को नीति के लिए उपयोगितावादी तर्क चाहिए और व्यक्तियों के लिए उस पर सीमाएँ, क्योंकि इंसान उपयोगिता के पात्र नहीं हैं जिन्हें सिक्कों की तरह बदला जा सके।',
          },
        ],
      },
      es: {
        word: 'utilitarismo',
        question: '¿Debemos elegir siempre lo que produzca la mayor felicidad para el mayor número?',
        examples: [
          {
            en: 'Utilitarianism gives morality the clarity of arithmetic, but arithmetic cannot weigh the difference between killing one innocent and letting ten die.',
            native:
              'El utilitarismo da a la moral la claridad de la aritmética, pero la aritmética no puede pesar la diferencia entre matar a un inocente y dejar morir a diez.',
          },
          {
            en: 'The greatest happiness principle dignifies everyone’s suffering equally, which is its glory, and it authorizes sacrificing anyone, which is its horror.',
            native:
              'El principio de la mayor felicidad dignifica por igual el sufrimiento de todos, que es su gloria, y autoriza a sacrificar a cualquiera, que es su horror.',
          },
          {
            en: 'Societies need utilitarian reasoning for policy and limits on it for persons, because people are not containers of utility to be traded like coins.',
            native:
              'Las sociedades necesitan razonamiento utilitario para las políticas y límites a él para las personas, porque la gente no es un recipiente de utilidad que se cambia como monedas.',
          },
        ],
      },
      zh: {
        word: '功利主义',
        question: '我们是否应当永远选择能为最大多数人带来最大幸福的选项？',
        examples: [
          {
            en: 'Utilitarianism gives morality the clarity of arithmetic, but arithmetic cannot weigh the difference between killing one innocent and letting ten die.',
            native: '功利主义赋予道德以算术般的清晰，但算术无法称量“杀死一个无辜者”与“放任十人死去”之间的差别。',
          },
          {
            en: 'The greatest happiness principle dignifies everyone’s suffering equally, which is its glory, and it authorizes sacrificing anyone, which is its horror.',
            native: '最大幸福原则平等地尊重每个人的苦难，这是它的光辉；它授权牺牲任何一个人，这是它的恐怖。',
          },
          {
            en: 'Societies need utilitarian reasoning for policy and limits on it for persons, because people are not containers of utility to be traded like coins.',
            native: '社会制定政策需要功利推理，对待个人则需要为它设限——因为人不是可以像硬币一样交换的效用容器。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'relativism',
    questionText: 'Are moral truths relative to culture, or do some things remain wrong everywhere?',
    translations: {
      te: {
        word: 'సాపేక్షవాదం',
        question: 'నైతిక సత్యాలు సంస్కృతికి సాపేక్షమా, లేదా కొన్ని విషయాలు ప్రతిచోటా తప్పేగా మిగులుతాయా?',
        examples: [
          {
            en: 'Relativism began as humility — the recognition that our customs are not the universe’s customs — and degenerated into the laziness of judging nothing at all.',
            native:
              'సాపేక్షవాదం వినయంగా మొదలైంది — మన ఆచారాలు విశ్వం యొక్క ఆచారాలు కావనే గుర్తింపు — తర్వాత ఏదీ తీర్పు చేయని సోమరితనంగా క్షీణించింది.',
          },
          {
            en: 'The person who says all moral views are equal has said something he believes is true for everyone, thereby contradicting himself in a single sentence.',
            native:
              'అన్ని నైతిక అభిప్రాయాలు సమానమని చెప్పేవాడు, అందరికీ నిజమని తాను నమ్మే విషయాన్ని చెప్పాడు — ఒకే వాక్యంలో తనకు తానే విరుద్ధమై.',
          },
          {
            en: 'Tolerance of other cultures is a virtue precisely because it is not relative: it claims to bind those who disagree with it, in every culture, always.',
            native:
              'ఇతర సంస్కృతుల పట్ల సహనం ఒక గుణం ఎందుకంటే కచ్చితంగా అది సాపేక్షం కాదు: దాన్ని ఏకీభవించనివారిని కూడా అది బంధిస్తుందని చెబుతుంది — ప్రతి సంస్కృతిలో, ఎల్లప్పుడూ.',
          },
        ],
      },
      hi: {
        word: 'सापेक्षवाद',
        question: 'क्या नैतिक सत्य संस्कृति के सापेक्ष होते हैं, या कुछ चीज़ें हर जगह ग़लत ही रहती हैं?',
        examples: [
          {
            en: 'Relativism began as humility — the recognition that our customs are not the universe’s customs — and degenerated into the laziness of judging nothing at all.',
            native:
              'सापेक्षवाद की शुरुआत विनम्रता से हुई — यह पहचान कि हमारी रीतियाँ ब्रह्मांड की रीतियाँ नहीं हैं — और फिर वह कुछ भी नापने के आलस्य में क्षीण हो गया।',
          },
          {
            en: 'The person who says all moral views are equal has said something he believes is true for everyone, thereby contradicting himself in a single sentence.',
            native:
              'जो कहता है कि सभी नैतिक दृष्टिकोण बराबर हैं, उसने ऐसी बात कही जिसे वह सबके लिए सत्य मानता है — और इस तरह एक ही वाक्य में खुद का खंडन कर दिया।',
          },
          {
            en: 'Tolerance of other cultures is a virtue precisely because it is not relative: it claims to bind those who disagree with it, in every culture, always.',
            native:
              'दूसरी संस्कृतियों के प्रति सहिष्णुता इसलिए एक गुण है क्योंकि वह सापेक्ष नहीं है: वह उन लोगों को भी बाँधने का दावा करती है जो उससे असहमत हैं — हर संस्कृति में, हमेशा।',
          },
        ],
      },
      es: {
        word: 'relativismo',
        question:
          '¿Son las verdades morales relativas a la cultura, o hay cosas que siguen siendo malas en todas partes?',
        examples: [
          {
            en: 'Relativism began as humility — the recognition that our customs are not the universe’s customs — and degenerated into the laziness of judging nothing at all.',
            native:
              'El relativismo empezó como humildad — reconocer que nuestras costumbres no son las del universo — y degeneró en la pereza de no juzgar nada en absoluto.',
          },
          {
            en: 'The person who says all moral views are equal has said something he believes is true for everyone, thereby contradicting himself in a single sentence.',
            native:
              'Quien dice que todas las visiones morales son iguales ha dicho algo que cree verdadero para todos, contradiciéndose así en una sola frase.',
          },
          {
            en: 'Tolerance of other cultures is a virtue precisely because it is not relative: it claims to bind those who disagree with it, in every culture, always.',
            native:
              'La tolerancia hacia otras culturas es una virtud precisamente porque no es relativa: afirma obligar a quienes discrepan de ella, en toda cultura, siempre.',
          },
        ],
      },
      zh: {
        word: '相对主义',
        question: '道德真理是相对于文化而言的，还是有些事情在任何地方都是错的？',
        examples: [
          {
            en: 'Relativism began as humility — the recognition that our customs are not the universe’s customs — and degenerated into the laziness of judging nothing at all.',
            native: '相对主义始于谦逊——承认我们的习俗并非宇宙的习俗——却堕落成了对一切都不作评判的懒惰。',
          },
          {
            en: 'The person who says all moral views are equal has said something he believes is true for everyone, thereby contradicting himself in a single sentence.',
            native: '说一切道德观点都平等的人，说出了一个他相信对所有人皆真的命题——于是用一句话就自相矛盾了。',
          },
          {
            en: 'Tolerance of other cultures is a virtue precisely because it is not relative: it claims to bind those who disagree with it, in every culture, always.',
            native:
              '对其他文化的宽容之所以是一种美德，恰恰因为它不是相对的：它宣称约束所有不认同它的人——在每种文化中，永远如此。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'absolutism',
    questionText: 'Do absolute principles protect us, or do they make mercy and judgment impossible?',
    translations: {
      te: {
        word: 'నిరపేక్షవాదం',
        question: 'నిరపేక్ష సూత్రాలు మనల్ని కాపాడతాయా, లేదా కరుణను, తీర్పును అసాధ్యం చేస్తాయా?',
        examples: [
          {
            en: 'Absolute rules spare us the exhaustion of deciding case by case, yet they force us to punish the merciful lie as harshly as the malicious one.',
            native:
              'నిరపేక్ష నియమాలు ప్రతి సంఘటనను విడివిడిగా నిర్ణయించే అలసట నుండి మనల్ని కాపాడతాయి, అయితే కరుణతో చెప్పిన అబద్ధాన్ని కూడా దురుద్దేశపు అబద్ధంలాగే కఠినంగా శిక్షించేలా చేస్తాయి.',
          },
          {
            en: 'The absolutist fears that one exception unravels everything, forgetting that judgment exists precisely to tell principled exceptions from convenient ones.',
            native:
              'ఒక మినహాయింపు అంతటినీ విప్పేస్తుందని నిరపేక్షవాది భయపడతాడు — సూత్రబద్ధమైన మినహాయింపులను అనుకూలమైనవాటి నుండి వేరుచేయడానికే తీర్పు ఉందని మర్చిపోతూ.',
          },
          {
            en: 'Certainty is a comfort in a shifting world, but principles too rigid to bend tend to break the people they were written to protect.',
            native:
              'మారుతున్న ప్రపంచంలో ఖచ్చితత్వం ఒక ఓర్పు, కానీ వంగలేనంత కఠినమైన సూత్రాలు తాము రక్షించడానికి రాయబడిన మనుషులనే విరిచివేస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'निरपेक्षवाद',
        question: 'क्या निरपेक्ष सिद्धांत हमारी रक्षा करते हैं, या वे दया और विवेक को असंभव बना देते हैं?',
        examples: [
          {
            en: 'Absolute rules spare us the exhaustion of deciding case by case, yet they force us to punish the merciful lie as harshly as the malicious one.',
            native:
              'निरपेक्ष नियम हमें मामला-दर-मामला फ़ैसला करने की थकान से बचाते हैं, पर वे हमें दयालु झूठ को भी दुर्भावनापूर्ण झूठ जितनी कठोरता से दंडित करने पर मजबूर करते हैं।',
          },
          {
            en: 'The absolutist fears that one exception unravels everything, forgetting that judgment exists precisely to tell principled exceptions from convenient ones.',
            native:
              'निरपेक्षवादी डरता है कि एक अपवाद सब कुछ खोल देगा — यह भूलकर कि विवेक का अस्तित्व ही इसीलिए है कि सिद्धांतयुक्त अपवादों को सुविधाजनक अपवादों से अलग कर सके।',
          },
          {
            en: 'Certainty is a comfort in a shifting world, but principles too rigid to bend tend to break the people they were written to protect.',
            native:
              'बदलती दुनिया में निश्चितता एक सुखदायक चीज़ है, पर जो सिद्धांत झुकने से क़तई इनकार करते हैं, वे अक्सर उन्हीं लोगों को तोड़ देते हैं जिनकी रक्षा के लिए वे लिखे गए थे।',
          },
        ],
      },
      es: {
        word: 'absolutismo',
        question: '¿Nos protegen los principios absolutos o hacen imposibles la piedad y el juicio?',
        examples: [
          {
            en: 'Absolute rules spare us the exhaustion of deciding case by case, yet they force us to punish the merciful lie as harshly as the malicious one.',
            native:
              'Las reglas absolutas nos ahorran el agotamiento de decidir caso por caso, pero nos obligan a castigar la mentira piadosa tan duramente como la maliciosa.',
          },
          {
            en: 'The absolutist fears that one exception unravels everything, forgetting that judgment exists precisely to tell principled exceptions from convenient ones.',
            native:
              'El absolutista teme que una excepción lo deshaga todo, olvidando que el juicio existe precisamente para distinguir las excepciones de principio de las convenientes.',
          },
          {
            en: 'Certainty is a comfort in a shifting world, but principles too rigid to bend tend to break the people they were written to protect.',
            native:
              'La certeza consuela en un mundo cambiante, pero los principios demasiado rígidos para doblarse tienden a romper a las personas que fueron escritos para proteger.',
          },
        ],
      },
      zh: {
        word: '绝对主义',
        question: '绝对的原则是在保护我们，还是让怜悯与判断变得不可能？',
        examples: [
          {
            en: 'Absolute rules spare us the exhaustion of deciding case by case, yet they force us to punish the merciful lie as harshly as the malicious one.',
            native: '绝对规则使我们免于逐案裁决的疲惫，却也迫使我们把出于仁慈的谎言，惩罚得与恶意谎言一样严厉。',
          },
          {
            en: 'The absolutist fears that one exception unravels everything, forgetting that judgment exists precisely to tell principled exceptions from convenient ones.',
            native: '绝对主义者害怕一个例外会瓦解一切，却忘了判断力存在的意义，正是区分有原则的例外与图方便的例外。',
          },
          {
            en: 'Certainty is a comfort in a shifting world, but principles too rigid to bend tend to break the people they were written to protect.',
            native: '在变动不居的世界里，确定性是一种慰藉；但僵硬到不能弯曲的原则，往往会折断那些它本要保护的人。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'determinism',
    questionText: 'If everything is determined by prior causes, can anyone truly be responsible?',
    translations: {
      te: {
        word: 'నియతివాదం',
        question: 'ప్రతిదీ పూర్వ కారణాలచే నిర్ణయించబడితే, ఎవరైనా నిజంగా బాధ్యులు కాగలరా?',
        examples: [
          {
            en: 'Determinism may be true of atoms and still be useless for courts, which must treat people as choosers because the alternative dissolves law altogether.',
            native:
              'నియతివాదం అణువులకు నిజం కావచ్చు, అయితే న్యాయస్థానాలకు నిష్ప్రయోజనం — వాటి ప్రత్యామ్నాయం చట్టాన్నే కరిగించేస్తుంది కాబట్టి న్యాయస్థానాలు ప్రజల్ని ఎంపిక చేసేవారిగా భావించాల్సిందే.',
          },
          {
            en: 'We excuse the criminal by pointing to his causes, yet we praise the hero without asking what caused his courage, revealing how selective our determinism is.',
            native:
              'నేరస్థుడి కారణాలను చూపిస్తూ మనం అతన్ని క్షమిస్తాం, అయితే వీరుడి ధైర్యానికి కారణం ఏమిటో అడగకుండానే అతన్ని ప్రశంసిస్తాం — మన నియతివాదం ఎంత ఎంపికగా ఉందో ఇది చూపిస్తుంది.',
          },
          {
            en: 'Perhaps freedom is not the absence of causes but the capacity to respond to reasons, and a determined mind can still deliberate, regret, and reform.',
            native:
              'బహుశా స్వేచ్ఛ అంటే కారణాల లేమి కాదు, కారణాలకు స్పందించే సామర్థ్యం — నిర్ణయించబడిన మనసు కూడా ఆలోచించగలదు, పశ్చాత్తాపపడగలదు, సంస్కరించుకోగలదు.',
          },
        ],
      },
      hi: {
        word: 'नियतिवाद',
        question: 'यदि सब कुछ पूर्व कारणों से निर्धारित है, तो क्या कोई सचमुच ज़िम्मेदार हो सकता है?',
        examples: [
          {
            en: 'Determinism may be true of atoms and still be useless for courts, which must treat people as choosers because the alternative dissolves law altogether.',
            native:
              'नियतिवाद परमाणुओं के लिए सत्य हो सकता है, फिर भी अदालतों के लिए बेकार है — उन्हें लोगों को चुनने वाले मानना ही होगा, क्योंकि विकल्प क़ानून को ही भंग कर देता है।',
          },
          {
            en: 'We excuse the criminal by pointing to his causes, yet we praise the hero without asking what caused his courage, revealing how selective our determinism is.',
            native:
              'हम अपराधी को उसके कारण दिखाकर माफ़ कर देते हैं, पर नायक की प्रशंसा बिना यह पूछे करते हैं कि उसके साहस का कारण क्या था — यह दिखाता है कि हमारा नियतिवाद कितना चुनिंदा है।',
          },
          {
            en: 'Perhaps freedom is not the absence of causes but the capacity to respond to reasons, and a determined mind can still deliberate, regret, and reform.',
            native:
              'शायद स्वतंत्रता कारणों की अनुपस्थिति नहीं, बल्कि कारणों का उत्तर देने की क्षमता है — और निर्धारित मन भी विचार, पश्चाताप और सुधार कर सकता है।',
          },
        ],
      },
      es: {
        word: 'determinismo',
        question: 'Si todo está determinado por causas anteriores, ¿puede alguien ser verdaderamente responsable?',
        examples: [
          {
            en: 'Determinism may be true of atoms and still be useless for courts, which must treat people as choosers because the alternative dissolves law altogether.',
            native:
              'El determinismo puede ser cierto de los átomos y aun así inútil para los tribunales, que deben tratar a las personas como electores porque la alternativa disuelve la ley por completo.',
          },
          {
            en: 'We excuse the criminal by pointing to his causes, yet we praise the hero without asking what caused his courage, revealing how selective our determinism is.',
            native:
              'Excusamos al criminal señalando sus causas, pero alabamos al héroe sin preguntar qué causó su coraje, revelando lo selectivo que es nuestro determinismo.',
          },
          {
            en: 'Perhaps freedom is not the absence of causes but the capacity to respond to reasons, and a determined mind can still deliberate, regret, and reform.',
            native:
              'Quizá la libertad no es la ausencia de causas sino la capacidad de responder a razones, y una mente determinada aún puede deliberar, arrepentirse y reformarse.',
          },
        ],
      },
      zh: {
        word: '决定论',
        question: '如果一切都由先前的原因决定，还有人能真正负责吗？',
        examples: [
          {
            en: 'Determinism may be true of atoms and still be useless for courts, which must treat people as choosers because the alternative dissolves law altogether.',
            native:
              '决定论对原子或许成立，对法庭却毫无用处——法庭必须把人们当作能做出选择的人，因为另一种可能将彻底瓦解法律。',
          },
          {
            en: 'We excuse the criminal by pointing to his causes, yet we praise the hero without asking what caused his courage, revealing how selective our determinism is.',
            native: '我们指着罪犯的“成因”为他开脱，赞美英雄时却从不追问其勇气的成因——这暴露了咱们的决定论何其选择性。',
          },
          {
            en: 'Perhaps freedom is not the absence of causes but the capacity to respond to reasons, and a determined mind can still deliberate, regret, and reform.',
            native: '或许自由并非没有原因，而是回应理由的能力；一颗被决定的心灵依然可以思忖、悔恨与改过。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'free will',
    questionText: 'Do we have free will, and does the answer change how we should judge others?',
    translations: {
      te: {
        word: 'స్వేచ్ఛా సంకల్పం',
        question: 'మనకు స్వేచ్ఛా సంకల్పం ఉందా, మరియు ఈ సమాధానం ఇతరులను ఎలా తీర్పు చేయాలో మారుస్తుందా?',
        examples: [
          {
            en: 'Free will may be an illusion, but it is an illusion we cannot step outside of, like a language in which every thought must be phrased.',
            native:
              'స్వేచ్ఛా సంకల్పం ఒక భ్రమ కావచ్చు, కానీ మనం దాని బయటకు అడుగుపెట్టలేని భ్రమ అది — ప్రతి ఆలోచన నిబద్ధం చేయవలసిన భాష లాంటిది.',
          },
          {
            en: 'The person who denies free will still deliberates before crossing the road, and his hesitation is the theory quietly refuting itself in practice.',
            native:
              'స్వేచ్ఛా సంకల్పాన్ని ఖండించే వ్యక్తి కూడా రోడ్డు దాటే ముందు ఆలోచిస్తాడు — అతని ఆ సందిగ్ధతే ఆ సిద్ధాంతం ఆచరణలో నిశ్శబ్దంగా తనను తాను ఖండించుకోవడం.',
          },
          {
            en: 'If our choices are made by causes beyond us, compassion becomes more rational and punishment more suspect, yet praise and blame refuse to vanish.',
            native:
              'మన ఎంపికలు మనకు అతీతమైన కారణాలచే తీయబడితే, కరుణ మరింత తార్కికమవుతుంది, శిక్ష మరింత అనుమానాస్పదమవుతుంది — అయినా ప్రశంసా-నిందలు అదృశ్యమవడానికి నిరాకరిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'स्वतंत्र इच्छा',
        question:
          'क्या हमारी स्वतंत्र इच्छा है, और क्या इसका उत्तर यह बदलता है कि हमें दूसरों का फ़ैसला कैसे करना चाहिए?',
        examples: [
          {
            en: 'Free will may be an illusion, but it is an illusion we cannot step outside of, like a language in which every thought must be phrased.',
            native:
              'स्वतंत्र इच्छा एक भ्रम हो सकती है, पर ऐसा भ्रम जिसके बाहर हम कदम नहीं रख सकते — जैसे कोई भाषा जिसमें हर सोच को ही ढालना पड़ता है।',
          },
          {
            en: 'The person who denies free will still deliberates before crossing the road, and his hesitation is the theory quietly refuting itself in practice.',
            native:
              'जो व्यक्ति स्वतंत्र इच्छा से इनकार करता है, वह भी सड़क पार करने से पहले विचार करता है — और उसकी यह हिचकिचाहट व्यवहार में सिद्धांत का चुपचाप खंडन है।',
          },
          {
            en: 'If our choices are made by causes beyond us, compassion becomes more rational and punishment more suspect, yet praise and blame refuse to vanish.',
            native:
              'यदि हमारे चुनाव हमसे परे के कारणों से बनते हैं, तो करुणा अधिक तर्कसंगत और दंड अधिक संदिग्ध हो जाता है, फिर भी प्रशंसा और निंदा मिटने से इनकार करती हैं।',
          },
        ],
      },
      es: {
        word: 'libre albedrío',
        question: '¿Tenemos libre albedrío, y cambia la respuesta cómo deberíamos juzgar a los demás?',
        examples: [
          {
            en: 'Free will may be an illusion, but it is an illusion we cannot step outside of, like a language in which every thought must be phrased.',
            native:
              'El libre albedrío puede ser una ilusión, pero es una ilusión de la que no podemos salir, como una lengua en la que debe formularse todo pensamiento.',
          },
          {
            en: 'The person who denies free will still deliberates before crossing the road, and his hesitation is the theory quietly refuting itself in practice.',
            native:
              'Quien niega el libre albedrío sigue deliberando antes de cruzar la calle, y su vacilación es la teoría refutándose en silencio a sí misma en la práctica.',
          },
          {
            en: 'If our choices are made by causes beyond us, compassion becomes more rational and punishment more suspect, yet praise and blame refuse to vanish.',
            native:
              'Si nuestras elecciones las hacen causas ajenas a nosotros, la compasión se vuelve más racional y el castigo más sospechoso, y sin embargo la alabanza y la culpa se niegan a desaparecer.',
          },
        ],
      },
      zh: {
        word: '自由意志',
        question: '我们拥有自由意志吗？这个答案会改变我们评判他人的方式吗？',
        examples: [
          {
            en: 'Free will may be an illusion, but it is an illusion we cannot step outside of, like a language in which every thought must be phrased.',
            native: '自由意志或许是一种幻觉，但它是我们无法抽身其外的幻觉——就像一种语言，每个念头都必须用它来表达。',
          },
          {
            en: 'The person who denies free will still deliberates before crossing the road, and his hesitation is the theory quietly refuting itself in practice.',
            native: '否认自由意志的人过马路前仍会斟酌再三——而他的这份迟疑，正是那个理论在实践中悄悄自我反驳。',
          },
          {
            en: 'If our choices are made by causes beyond us, compassion becomes more rational and punishment more suspect, yet praise and blame refuse to vanish.',
            native:
              '如果我们的选择由超越自身的原因造就，怜悯会更合乎理性，惩罚会更显可疑——然而赞美与责备，却始终拒绝退场。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'destiny',
    questionText: 'Are our lives guided by destiny, or do we write the script as we live?',
    translations: {
      te: {
        word: 'విధి',
        question: 'మన జీవితాలు విధిచే నడపబడుతున్నాయా, లేదా మనం జీవిస్తూనే కథానికాన్ని రాసుకుంటున్నామా?',
        examples: [
          {
            en: 'Destiny comforts the suffering by promising design, yet it insults the striving by suggesting their choices were only rehearsals of a finished play.',
            native:
              'విధి రూపకల్పన హామీ ఇచ్చి బాధపడేవారిని ఓదారుస్తుంది, అయితే వారి ఎంపికలు పూర్తయిన నాటకం యొక్క రిహర్సళ్లే అని సూచించి శ్రమించేవారిని అవమానిస్తుంది.',
          },
          {
            en: 'We speak of destiny only backwards: no one can point to it ahead of time, which suggests it is a story we tell about the past, not a map of the future.',
            native:
              'మనం విధి గురించి ఎల్లప్పుడూ వెనక్కి చూస్తూ మాత్రమే మాట్లాడుతాం — ముందుగా ఎవరూ దాన్ని చూపలేరు — అది గతం గురించి మనం చెప్పే కథ అని, భవిష్యత్తు మ్యాపు కాదని ఇది సూచిస్తుంది.',
          },
          {
            en: 'A person who believes everything is written still looks both ways before crossing, and in that glance lives the whole practical refutation of fatalism.',
            native:
              'అంతా రాసిపెట్టబడిందని నమ్మే వ్యక్తి కూడా రోడ్డు దాటే ముందు రెండు వైపులా చూస్తాడు — ఆ చూపులోనే ఫాటలిజం యొక్క సంపూర్ణ ఆచరణాత్మక ఖండన ఉంది.',
          },
        ],
      },
      hi: {
        word: 'भाग्य',
        question: 'क्या हमारे जीवन का मार्गदर्शन भाग्य करता है, या हम जीते-जीते खुद ही पटकथा लिखते हैं?',
        examples: [
          {
            en: 'Destiny comforts the suffering by promising design, yet it insults the striving by suggesting their choices were only rehearsals of a finished play.',
            native:
              'भाग्य दुखियों को रचना का वादा देकर सांत्वना देता है, पर प्रयत्नशीलों का अपमान करता है — यह सुझाकर कि उनके चुनाव किसी तैयार नाटक के महज़ रिहर्सल थे।',
          },
          {
            en: 'We speak of destiny only backwards: no one can point to it ahead of time, which suggests it is a story we tell about the past, not a map of the future.',
            native:
              'हम भाग्य की बात केवल पीछे मुड़कर करते हैं: कोई भी उसे पहले से दिखा नहीं सकता — इससे ज़ाहिर होता है कि वह भविष्य का नक्शा नहीं, अतीत के बारे में हमारी कही कहानी है।',
          },
          {
            en: 'A person who believes everything is written still looks both ways before crossing, and in that glance lives the whole practical refutation of fatalism.',
            native:
              'जो मानता है कि सब लिखा हुआ है, वह भी सड़क पार करने से पहले दोनों ओर देखता है — और उसी एक नज़र में नियतिवाद का सम्पूर्ण व्यावहारिक खंडन बसा है।',
          },
        ],
      },
      es: {
        word: 'destino',
        question: '¿Nos guía el destino, o escribimos el guion a medida que vivimos?',
        examples: [
          {
            en: 'Destiny comforts the suffering by promising design, yet it insults the striving by suggesting their choices were only rehearsals of a finished play.',
            native:
              'El destino consuela a quien sufre prometiendo un designio, pero insulta a quien lucha al sugerir que sus decisiones eran solo ensayos de una obra ya terminada.',
          },
          {
            en: 'We speak of destiny only backwards: no one can point to it ahead of time, which suggests it is a story we tell about the past, not a map of the future.',
            native:
              'Solo hablamos del destino mirando hacia atrás: nadie puede señalarlo de antemano, lo que sugiere que es un relato sobre el pasado, no un mapa del futuro.',
          },
          {
            en: 'A person who believes everything is written still looks both ways before crossing, and in that glance lives the whole practical refutation of fatalism.',
            native:
              'Quien cree que todo está escrito aún mira a ambos lados antes de cruzar, y en esa mirada habita toda la refutación práctica del fatalismo.',
          },
        ],
      },
      zh: {
        word: '命运',
        question: '我们的人生由命运指引，还是我们一边活一边书写剧本？',
        examples: [
          {
            en: 'Destiny comforts the suffering by promising design, yet it insults the striving by suggesting their choices were only rehearsals of a finished play.',
            native:
              '命运以“冥冥之中自有安排”的许诺安慰受苦者，却以“你的选择不过是一场已完成剧本的排练”的暗示羞辱奋斗者。',
          },
          {
            en: 'We speak of destiny only backwards: no one can point to it ahead of time, which suggests it is a story we tell about the past, not a map of the future.',
            native:
              '我们只在回望时谈论命运——没有人能事先指出它在哪里。这说明它是我们讲给过去的故事，而不是未来的地图。',
          },
          {
            en: 'A person who believes everything is written still looks both ways before crossing, and in that glance lives the whole practical refutation of fatalism.',
            native: '一个相信一切皆已写定的人，过马路前仍会左右张望——而那一眼里，就住着对宿命论最彻底的实践驳斥。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'fate',
    questionText: 'Should we accept our fate, or rebel against it?',
    translations: {
      te: {
        word: 'నియతి',
        question: 'మన నియతిని అంగీకరించాలా, లేదా దానికి వ్యతిరేకంగా తిరుగుబాటు చేయాలా?',
        examples: [
          {
            en: 'Accepting fate dignifies the inevitable but poisons the changeable, teaching resignation precisely where courage was most needed.',
            native:
              'నియతిని అంగీకరించడం అనివార్యానికి గౌరవమిస్తుంది కానీ మార్చగలిగిన దాన్ని విషపూరితం చేస్తుంది — ధైర్యం అత్యంత అవసరమైన చోటే విరమణను నేర్పుతూ.',
          },
          {
            en: 'The rebel against fate sometimes fails and always suffers, yet every freedom we now possess was won by someone who refused to accept the script.',
            native:
              'నియతికి వ్యతిరేకంగా తిరుగుబాటు చేసేవాడు కొన్నిసార్లు ఓడిపోతాడు, ఎల్లప్పుడూ బాధపడతాడు — అయితే ఇప్పుడు మనకున్న ప్రతి స్వేచ్ఛ కథానికాన్ని అంగీకరించడానికి నిరాకరించిన ఎవరో ఒకరు గెలిచినదే.',
          },
          {
            en: 'Wisdom may lie in the old prayer: courage to fight what can be altered, serenity to bear what cannot, and judgment to tell one from the other.',
            native:
              'బహుశా జ్ఞానం ఆ పురాతన ప్రార్థనలోనే ఉంది: మార్చగలిగిన దానితో పోరాడే ధైర్యం, మార్చలేని దాన్ని భరించే ప్రశాంతత, రెండిటి మధ్య తేడా తెలుసుకునే తీర్పు.',
          },
        ],
      },
      hi: {
        word: 'नियति',
        question: 'क्या हमें अपनी नियति स्वीकार करनी चाहिए, या उसके विरुद्ध विद्रोह करना चाहिए?',
        examples: [
          {
            en: 'Accepting fate dignifies the inevitable but poisons the changeable, teaching resignation precisely where courage was most needed.',
            native:
              'नियति स्वीकार करना अनिवार्य को गरिमा देता है, पर परिवर्तनीय को विषाक्त कर देता है — ठीक वहीं वैराग्य सिखाकर जहाँ साहस की सबसे अधिक ज़रूरत थी।',
          },
          {
            en: 'The rebel against fate sometimes fails and always suffers, yet every freedom we now possess was won by someone who refused to accept the script.',
            native:
              'नियति के विरुद्ध विद्रोही कभी-कभी हारता है और हमेशा भुगतता है, पर जो भी स्वतंत्रता आज हमारे पास है, वह किसी ऐसे व्यक्ति ने जीती है जिसने पटकथा मानने से इनकार कर दिया था।',
          },
          {
            en: 'Wisdom may lie in the old prayer: courage to fight what can be altered, serenity to bear what cannot, and judgment to tell one from the other.',
            native:
              'बुद्धि शायद उसी पुरानी प्रार्थना में है: जो बदला जा सके उससे लड़ने का साहस, जो न बदला जा सके उसे सहने की प्रसन्नता, और दोनों में अंतर करने का विवेक।',
          },
        ],
      },
      es: {
        word: 'hado',
        question: '¿Debemos aceptar nuestro hado o rebelarnos contra él?',
        examples: [
          {
            en: 'Accepting fate dignifies the inevitable but poisons the changeable, teaching resignation precisely where courage was most needed.',
            native:
              'Aceptar el hado dignifica lo inevitable pero envenena lo cambiable, enseñando resignación precisamente donde más se necesitaba coraje.',
          },
          {
            en: 'The rebel against fate sometimes fails and always suffers, yet every freedom we now possess was won by someone who refused to accept the script.',
            native:
              'El rebelde contra el hado a veces fracasa y siempre sufre, pero cada libertad que hoy poseemos la ganó alguien que se negó a aceptar el guion.',
          },
          {
            en: 'Wisdom may lie in the old prayer: courage to fight what can be altered, serenity to bear what cannot, and judgment to tell one from the other.',
            native:
              'La sabiduría quizá resida en la vieja oración: coraje para luchar contra lo alterable, serenidad para soportar lo que no lo es, y juicio para distinguir lo uno de lo otro.',
          },
        ],
      },
      zh: {
        word: '宿命',
        question: '我们应当接受宿命，还是奋起反抗？',
        examples: [
          {
            en: 'Accepting fate dignifies the inevitable but poisons the changeable, teaching resignation precisely where courage was most needed.',
            native: '接受宿命让不可避免之事显得庄严，却毒害了可以改变之事——在最需要勇气的地方，教人听天由命。',
          },
          {
            en: 'The rebel against fate sometimes fails and always suffers, yet every freedom we now possess was won by someone who refused to accept the script.',
            native: '反抗宿命的人时而失败、永远受苦，但我们今天拥有的每一项自由，都是某个拒绝认命的人赢来的。',
          },
          {
            en: 'Wisdom may lie in the old prayer: courage to fight what can be altered, serenity to bear what cannot, and judgment to tell one from the other.',
            native:
              '智慧或许就在那句古老的祷词里：有勇气去改变可改变之事，有宁静去承受不可改变之事，并有判断力去区分二者。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'chance',
    questionText: 'How much of our success and failure do we owe to pure chance?',
    translations: {
      te: {
        word: 'యాదృచ్ఛికత',
        question: 'మన విజయాలకు, ఓటములకు మనం ఎంతమట్టుకు స్వచ్ఛమైన యాదృచ్ఛికతకే రుణపడి ఉంటాం?',
        examples: [
          {
            en: 'We rewrite luck as merit after the fact, for the story of deserved success flatters the winner far more than the truth of the fortunate coin toss.',
            native:
              'విజయం జరిగాక మనం అదృష్టాన్ని ప్రతిభగా తిరగరాసుకుంటాం — అర్హమైన విజయం యొక్క కథ, అదృష్టమైన నాణేం విసురు యొక్క నిజం కంటే విజేతను బాగా అట్టిపెడుతుంది.',
          },
          {
            en: 'Chance deals the cards, but character plays the hand, and over a lifetime the quality of play matters more than any single deal.',
            native:
              'యాదృచ్ఛికత పేకముక్కలు పంచుతుంది, కానీ స్వభావం ఆట ఆడుతుంది — జీవితకాలంలో ఏ ఒక్క పంపిణీ కంటే ఆట నాణ్యతే ఎక్కువ ముఖ్యం.',
          },
          {
            en: 'Admitting the role of luck makes winners humbler and losers gentler with themselves, which is perhaps why the confession is so rarely made.',
            native:
              'అదృష్ట పాత్రను ఒప్పుకోవడం విజేతలను వినమ్రుల్ని చేస్తుంది, ఓటమిపాలైనవారు తమ పట్ల తాము సున్నితంగా ఉండేలా చేస్తుంది — ఈ ఒప్పుకోలు ఎందుకు ఇంత అరుదుగా జరుగుతుందో బహుశా కారణం ఇదే.',
          },
        ],
      },
      hi: {
        word: 'संयोग',
        question: 'हम अपनी सफलता और असफलता का कितना हिस्सा शुद्ध संयोग को देते हैं?',
        examples: [
          {
            en: 'We rewrite luck as merit after the fact, for the story of deserved success flatters the winner far more than the truth of the fortunate coin toss.',
            native:
              'हम बाद में क़िस्मत को योग्यता बना देते हैं, क्योंकि अर्जित सफलता की कहानी विजेता को सच्चे सिक्का-उछाल से कहीं ज़्यादा ख़ुश करती है।',
          },
          {
            en: 'Chance deals the cards, but character plays the hand, and over a lifetime the quality of play matters more than any single deal.',
            native:
              'संयोग पत्ते बाँटता है, पर चरित्र पान चलाता है — और जीवन भर में किसी एक बँटवारे से ज़्यादा खेल की गुणवत्ता मायने रखती है।',
          },
          {
            en: 'Admitting the role of luck makes winners humbler and losers gentler with themselves, which is perhaps why the confession is so rarely made.',
            native:
              'क़िस्मत की भूमिका स्वीकार करना विजेताओं को विनम्र और असफलों को अपने प्रति कोमल बनाता है — शायद यही वजह है कि यह इकरार इतनी कम होता है।',
          },
        ],
      },
      es: {
        word: 'azar',
        question: '¿Cuánto de nuestro éxito y fracaso se lo debemos al puro azar?',
        examples: [
          {
            en: 'We rewrite luck as merit after the fact, for the story of deserved success flatters the winner far more than the truth of the fortunate coin toss.',
            native:
              'Reescribimos la suerte como mérito a posteriori, porque el relato del éxito merecido halaga al ganador mucho más que la verdad del afortunado volado.',
          },
          {
            en: 'Chance deals the cards, but character plays the hand, and over a lifetime the quality of play matters more than any single deal.',
            native:
              'El azar reparte las cartas, pero el carácter juega la mano, y a lo largo de una vida la calidad del juego importa más que cualquier reparto.',
          },
          {
            en: 'Admitting the role of luck makes winners humbler and losers gentler with themselves, which is perhaps why the confession is so rarely made.',
            native:
              'Admitir el papel de la suerte hace más humildes a los ganadores y más amables consigo mismos a los perdedores, y quizá por eso la confesión es tan rara.',
          },
        ],
      },
      zh: {
        word: '偶然',
        question: '我们的成败有多少应归因于纯粹的偶然？',
        examples: [
          {
            en: 'We rewrite luck as merit after the fact, for the story of deserved success flatters the winner far more than the truth of the fortunate coin toss.',
            native: '事成之后，我们总爱把运气改写成实力——因为“应得的成功”这个故事，远比“幸运的掷硬币”更让赢家受用。',
          },
          {
            en: 'Chance deals the cards, but character plays the hand, and over a lifetime the quality of play matters more than any single deal.',
            native: '偶然发牌，品格打牌；放眼一生，牌技的高低比任何一次发牌都更重要。',
          },
          {
            en: 'Admitting the role of luck makes winners humbler and losers gentler with themselves, which is perhaps why the confession is so rarely made.',
            native: '承认运气的作用，会让赢家更谦逊，让输家对自己更宽厚——也许正因如此，这种坦白才如此罕见。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'serendipity',
    questionText: 'Can we design our lives to invite fortunate accidents, or is serendipity beyond planning?',
    translations: {
      te: {
        word: 'అదృష్ట సంయోగం',
        question:
          'అదృష్టవంతమైన యాదృచ్ఛికాలను ఆహ్వానించేలా మన జీవితాలను రూపొందించగలమా, లేదా అదృష్ట సంయోగం ప్రణాళికకు అతీతమా?',
        examples: [
          {
            en: 'Serendipity favours the prepared and the busy: chance meetings convert to fortune only for those whose minds are already stocked with questions.',
            native:
              'అదృష్ట సంయోగం సిద్ధులకు, బిజీగా ఉన్నవారికి అనుకూలం: ప్రశ్నలతో నిండిన మనసులున్నవారికే యాదృచ్ఛిక భేటీలు అదృష్టంగా మారుతాయి.',
          },
          {
            en: 'The most important discoveries in history arrived uninvited, yet they knocked only at laboratories where someone had left the door thoughtfully open.',
            native:
              'చరిత్రలోని అతి ముఖ్యమైన ఆవిష్కరణలు ఆహ్వానం లేకుండా వచ్చాయి, అయితే ఎవరో ఆలోచనాత్మకంగా తలుపు తెరిచి ఉంచిన ప్రయోగశాలల వద్దే అవి తట్టాయి.',
          },
          {
            en: 'A life scheduled to the minute eliminates the idle hour in which the unexpected introduction, the stray book, and the lucky error prefer to appear.',
            native:
              'నిమిషానికి షెడ్యూల్ చేసిన జీవితం ఖాళీ గంటను తొలగిస్తుంది — ఊహించని పరిచయం, పడిపోయిన పుస్తకం, అదృష్టమైన పొరపాటు కనిపించడానికి ఇష్టపడే అదే ఖాళీ గంటను.',
          },
        ],
      },
      hi: {
        word: 'सुसंयोग',
        question:
          'क्या हम अपना जीवन इस तरह गढ़ सकते हैं कि सौभाग्यपूर्ण संयोग आमंत्रित हों, या सुसंयोग योजना से परे है?',
        examples: [
          {
            en: 'Serendipity favours the prepared and the busy: chance meetings convert to fortune only for those whose minds are already stocked with questions.',
            native:
              'सुसंयोग तैयार और व्यस्त लोगों का साथ देता है: बेतरतीब मुलाक़ातें केवल उन्हीं के लिए सौभाग्य बनती हैं जिनके मन पहले से सवालों से भरे हों।',
          },
          {
            en: 'The most important discoveries in history arrived uninvited, yet they knocked only at laboratories where someone had left the door thoughtfully open.',
            native:
              'इतिहास की सबसे बड़ी खोजें बिना बुलाए आईं, पर उन्होंने केवल उन्हीं प्रयोगशालाओं का दरवाज़ा खटखटाया जहाँ किसी ने सोच-समझकर दरवाज़ा खुला छोड़ा था।',
          },
          {
            en: 'A life scheduled to the minute eliminates the idle hour in which the unexpected introduction, the stray book, and the lucky error prefer to appear.',
            native:
              'मिनट-दर-मिनट बना कार्यक्रम उस खाली घंटे को मिटा देता है जिसमें अनजाना परिचय, बिखरी किताब और सौभाग्यपूर्ण भूल उतरना पसंद करते हैं।',
          },
        ],
      },
      es: {
        word: 'serendipia',
        question:
          '¿Podemos diseñar nuestras vidas para invitar a los accidentes afortunados, o la serendipia está más allá de toda planificación?',
        examples: [
          {
            en: 'Serendipity favours the prepared and the busy: chance meetings convert to fortune only for those whose minds are already stocked with questions.',
            native:
              'La serendipia favorece a los preparados y a los ocupados: los encuentros casuales solo se convierten en fortuna para quienes ya tienen la mente llena de preguntas.',
          },
          {
            en: 'The most important discoveries in history arrived uninvited, yet they knocked only at laboratories where someone had left the door thoughtfully open.',
            native:
              'Los descubrimientos más importantes de la historia llegaron sin invitación, pero solo llamaron a laboratorios donde alguien había dejado la puerta pensativamente abierta.',
          },
          {
            en: 'A life scheduled to the minute eliminates the idle hour in which the unexpected introduction, the stray book, and the lucky error prefer to appear.',
            native:
              'Una vida programada al minuto elimina la hora ociosa en la que prefieren aparecer la presentación inesperada, el libro extraviado y el error afortunado.',
          },
        ],
      },
      zh: {
        word: '意外之喜',
        question: '我们能否设计人生来招引幸运的偶然？还是说意外之喜根本无法规划？',
        examples: [
          {
            en: 'Serendipity favours the prepared and the busy: chance meetings convert to fortune only for those whose minds are already stocked with questions.',
            native: '意外之喜眷顾有准备的忙碌者：只有头脑中早已装满问题的人，萍水相逢才会转化为幸运。',
          },
          {
            en: 'The most important discoveries in history arrived uninvited, yet they knocked only at laboratories where someone had left the door thoughtfully open.',
            native: '历史上最重要的发现都不请自来，但它们敲开的，只是那些有人用心虚掩着门的实验室。',
          },
          {
            en: 'A life scheduled to the minute eliminates the idle hour in which the unexpected introduction, the stray book, and the lucky error prefer to appear.',
            native:
              '把每分钟都排满的人生，消灭了那个无所事事的钟头——而意外的引荐、偶然拾得的书、幸运的失误，偏偏最喜欢在那里现身。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'knowledge',
    questionText: 'Is knowledge power, or has information made that promise obsolete?',
    translations: {
      te: {
        word: 'జ్ఞానం',
        question: 'జ్ఞానమే అధికారమా, లేదా సమాచారం ఆ హామీని పాతబడేలా చేసిందా?',
        examples: [
          {
            en: 'Knowledge becomes power only when joined to judgment, for facts without interpretation are a library without a reader.',
            native: 'తీర్పుతో కలిసినప్పుడే జ్ఞానం అధికారమవుతుంది — వివరణ లేని వాస్తవాలు పాఠకుడు లేని గ్రంథాలయమే.',
          },
          {
            en: 'We drown in information while starving for knowledge, having confused the abundance of answers with the ability to ask the right questions.',
            native:
              'మనం సమాచారంలో మునిగిపోతూ జ్ఞానం కోసం ఆకలితో అలమటిస్తున్నాం — సమాధానాల సమృద్ధిని, సరైన ప్రశ్నలు అడగగలిగే సామర్థ్యంతో గందరగోళం చేసుకున్నాం.',
          },
          {
            en: 'What we know doubles faster than what we understand, and the widening gap between the two may be the defining danger of the information age.',
            native:
              'మనకు తెలిసినది మనం అర్థం చేసుకున్నదాని కంటే వేగంగా రెట్టింపవుతోంది — ఈ రెండిటి మధ్య పెరుగుతున్న అంతరమే సమాచార యుగం యొక్క నిర్ణయక ప్రమాదం కావచ్చు.',
          },
        ],
      },
      hi: {
        word: 'ज्ञान',
        question: 'क्या ज्ञान ही शक्ति है, या सूचना ने उस वादे को अप्रचलित कर दिया है?',
        examples: [
          {
            en: 'Knowledge becomes power only when joined to judgment, for facts without interpretation are a library without a reader.',
            native:
              'ज्ञान तभी शक्ति बनता है जब वह विवेक से जुड़ता है, क्योंकि बिना व्याख्या के तथ्य ऐसा पुस्तकालय हैं जिसका कोई पाठक नहीं।',
          },
          {
            en: 'We drown in information while starving for knowledge, having confused the abundance of answers with the ability to ask the right questions.',
            native:
              'हम सूचना में डूबते हैं और ज्ञान की भूख से तड़पते हैं — उत्तरों की बहुलता को सही सवाल पूछने की क्षमता समझ बैठे हैं।',
          },
          {
            en: 'What we know doubles faster than what we understand, and the widening gap between the two may be the defining danger of the information age.',
            native:
              'जो हम जानते हैं, वह उससे कहीं तेज़ दुगना होता है जितना हम समझते हैं — और इन दोनों के बीच बढ़ता अंतर ही सूचना-युग का निर्णायक ख़तरा हो सकता है।',
          },
        ],
      },
      es: {
        word: 'conocimiento',
        question: '¿Es el conocimiento poder, o la información ha dejado obsoleta esa promesa?',
        examples: [
          {
            en: 'Knowledge becomes power only when joined to judgment, for facts without interpretation are a library without a reader.',
            native:
              'El conocimiento solo se vuelve poder cuando se une al juicio, pues los hechos sin interpretación son una biblioteca sin lector.',
          },
          {
            en: 'We drown in information while starving for knowledge, having confused the abundance of answers with the ability to ask the right questions.',
            native:
              'Nos ahogamos en información mientras nos morimos de hambre de conocimiento, habiendo confundido la abundancia de respuestas con la capacidad de hacer las preguntas correctas.',
          },
          {
            en: 'What we know doubles faster than what we understand, and the widening gap between the two may be the defining danger of the information age.',
            native:
              'Lo que sabemos se duplica más rápido que lo que comprendemos, y la brecha creciente entre ambos puede ser el peligro definitorio de la era de la información.',
          },
        ],
      },
      zh: {
        word: '知识',
        question: '知识就是力量，还是信息时代已让这句承诺过时？',
        examples: [
          {
            en: 'Knowledge becomes power only when joined to judgment, for facts without interpretation are a library without a reader.',
            native: '知识唯有与判断力结合才成为力量，因为没有解读的事实，不过是一座没有读者的图书馆。',
          },
          {
            en: 'We drown in information while starving for knowledge, having confused the abundance of answers with the ability to ask the right questions.',
            native: '我们溺于信息，却渴望知识——把答案的泛滥，错当成了提出正确问题的能力。',
          },
          {
            en: 'What we know doubles faster than what we understand, and the widening gap between the two may be the defining danger of the information age.',
            native: '我们所知翻番的速度，快于我们所理解的速度；两者之间日益拉开的鸿沟，或许正是信息时代最本质的危险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'wisdom',
    questionText: 'Why can a person be highly educated and still lack wisdom?',
    translations: {
      te: {
        word: 'వివేకం',
        question: 'ఒక వ్యక్తి అత్యంత విద్యావంతుడై ఉండి కూడా ఎందుకు వివేకం లోపించవచ్చు?',
        examples: [
          {
            en: 'Wisdom is knowledge digested by experience and seasoned with humility, which is why it cannot be downloaded, only lived into.',
            native:
              'వివేకం అనేది అనుభవంతో జీర్ణమై, వినయంతో రుచి పొందిన జ్ఞానం — అందుకే దాన్ని డౌన్‌లోడ్ చేయలేము, జీవిస్తూ మాత్రమే పొందాలి.',
          },
          {
            en: 'The clever person knows how to win the argument; the wise person knows whether the argument is worth winning, and what the victory will cost.',
            native:
              'తెలివైనవాడు వాదనలో గెలవడం ఎలాగో తెలుసు; వివేకవంతుడికి ఆ వాదన గెలవడానికి విలువైనదా, ఆ విజయం ధర ఎంతో తెలుసు.',
          },
          {
            en: 'Education fills the mind with answers, while wisdom teaches the more uncomfortable art of living well among questions that have none.',
            native:
              'విద్య మనసును సమాధానాలతో నింపుతుంది, అయితే వివేకం మరింత అసౌకర్యకరమైన కళను నేర్పుతుంది — సమాధానం లేని ప్రశ్నల మధ్య బాగా జీవించే కళను.',
          },
        ],
      },
      hi: {
        word: 'विवेक',
        question: 'क्यों कोई व्यक्ति अत्यंत शिक्षित होकर भी विवेक से वंचित रह सकता है?',
        examples: [
          {
            en: 'Wisdom is knowledge digested by experience and seasoned with humility, which is why it cannot be downloaded, only lived into.',
            native:
              'विवेक वह ज्ञान है जो अनुभव में पचा हो और विनम्रता से सना हो — इसीलिए उसे डाउनलोड नहीं किया जा सकता, केवल जीकर पाया जा सकता है।',
          },
          {
            en: 'The clever person knows how to win the argument; the wise person knows whether the argument is worth winning, and what the victory will cost.',
            native:
              'चतुर व्यक्ति जानता है कि बहस कैसे जीती जाए; विवेकी जानता है कि बहस जीतने लायक़ है या नहीं, और उस जीत की कीमत क्या होगी।',
          },
          {
            en: 'Education fills the mind with answers, while wisdom teaches the more uncomfortable art of living well among questions that have none.',
            native:
              'शिक्षा मन को उत्तरों से भर देती है, जबकि विवेक उस असहज कला को सिखाता है — उन सवालों के बीच अच्छे से जीने की कला जिनका कोई उत्तर नहीं।',
          },
        ],
      },
      es: {
        word: 'sabiduría',
        question: '¿Por qué puede una persona ser muy culta y carecer aun así de sabiduría?',
        examples: [
          {
            en: 'Wisdom is knowledge digested by experience and seasoned with humility, which is why it cannot be downloaded, only lived into.',
            native:
              'La sabiduría es conocimiento digerido por la experiencia y sazonado con humildad, y por eso no puede descargarse: solo se alcanza viviendo.',
          },
          {
            en: 'The clever person knows how to win the argument; the wise person knows whether the argument is worth winning, and what the victory will cost.',
            native:
              'La persona astuta sabe cómo ganar la discusión; la sabia sabe si la discusión merece ganarse y cuánto costará la victoria.',
          },
          {
            en: 'Education fills the mind with answers, while wisdom teaches the more uncomfortable art of living well among questions that have none.',
            native:
              'La educación llena la mente de respuestas, mientras que la sabiduría enseña el arte más incómodo de vivir bien entre preguntas que no las tienen.',
          },
        ],
      },
      zh: {
        word: '智慧',
        question: '为什么一个人可以受过高等教育，却仍然缺乏智慧？',
        examples: [
          {
            en: 'Wisdom is knowledge digested by experience and seasoned with humility, which is why it cannot be downloaded, only lived into.',
            native: '智慧是被经验消化、经谦逊调味的知识——所以它无法下载，只能在活过的岁月里慢慢长成。',
          },
          {
            en: 'The clever person knows how to win the argument; the wise person knows whether the argument is worth winning, and what the victory will cost.',
            native: '聪明的人知道如何赢得争论；智慧的人知道这场争论值不值得赢，以及胜利要付出什么代价。',
          },
          {
            en: 'Education fills the mind with answers, while wisdom teaches the more uncomfortable art of living well among questions that have none.',
            native: '教育用答案填满头脑，智慧则教一门更不安的技艺：在没有答案的问题之间，好好地生活。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'ignorance',
    questionText: 'Is ignorance bliss, or is it always a liability?',
    translations: {
      te: {
        word: 'అజ్ఞానం',
        question: 'అజ్ఞానం ఆనందమా, లేదా ఎల్లప్పుడూ ఒక అపీచా?',
        examples: [
          {
            en: 'Ignorance can be bliss only where nothing is at stake, and the modern world arranges for almost everything to be at stake.',
            native:
              'పందం ఏమీ లేని చోట మాత్రమే అజ్ఞానం ఆనందం కాగలదు — ఆధునిక ప్రపంచం దాదాపు ప్రతిదానిపై పందం ఉండేలా ఏర్పాటు చేసింది.',
          },
          {
            en: 'The most dangerous ignorance is not knowing what we do not know, for the confident fool votes, invests, and lectures with equal assurance.',
            native:
              'అత్యంత ప్రమాదకరమైన అజ్ఞానం మనకు ఏమి తెలియదో తెలియకపోవడమే — నమ్మకంతో ఉన్న మూర్ఖుడు ఓటు వేస్తాడు, పెట్టుబడి పెడతాడు, ప్రవచనాలు ఇస్తాడు — అంతే ధైర్యంతో.',
          },
          {
            en: "Admitting ignorance is the first step of every discipline that has ever advanced, which is why 'I do not know' is the most honest sentence in scholarship.",
            native:
              "అజ్ఞానాన్ని ఒప్పుకోవడం ఎప్పుడైనా ముందుకు సాగిన ప్రతి శాస్త్రం యొక్క మొదటి అడుగు — 'నాకు తెలియదు' అనే వాక్యం పండిత్యంలోని అత్యంత నిజాయితీగల వాక్యం అవడానికి కారణం ఇదే.",
          },
        ],
      },
      hi: {
        word: 'अज्ञान',
        question: 'क्या अज्ञान आनंद है, या वह हमेशा एक बोझ है?',
        examples: [
          {
            en: 'Ignorance can be bliss only where nothing is at stake, and the modern world arranges for almost everything to be at stake.',
            native:
              'अज्ञान तभी आनंद हो सकता है जब कुछ दाँव पर न हो — और आधुनिक दुनिया ने इसका इंतज़ाम कर दिया है कि लगभग हर चीज़ दाँव पर हो।',
          },
          {
            en: 'The most dangerous ignorance is not knowing what we do not know, for the confident fool votes, invests, and lectures with equal assurance.',
            native:
              'सबसे ख़तरनाक अज्ञान यह न जानना है कि हम क्या नहीं जानते, क्योंकि आत्मविश्वासी मूर्ख उतने ही भरोसे से वोट डालता है, निवेश करता है और उपदेश देता है।',
          },
          {
            en: "Admitting ignorance is the first step of every discipline that has ever advanced, which is why 'I do not know' is the most honest sentence in scholarship.",
            native:
              "अज्ञान स्वीकारना हर उस शास्त्र का पहला कदम है जो कभी आगे बढ़ा — इसीलिए 'मैं नहीं जानता' विद्वता का सबसे ईमानदार वाक्य है।",
          },
        ],
      },
      es: {
        word: 'ignorancia',
        question: '¿Es la ignorancia una bendición o siempre una desventaja?',
        examples: [
          {
            en: 'Ignorance can be bliss only where nothing is at stake, and the modern world arranges for almost everything to be at stake.',
            native:
              'La ignorancia solo puede ser dicha donde nada está en juego, y el mundo moderno se encarga de que casi todo esté en juego.',
          },
          {
            en: 'The most dangerous ignorance is not knowing what we do not know, for the confident fool votes, invests, and lectures with equal assurance.',
            native:
              'La ignorancia más peligrosa es no saber lo que no sabemos, pues el necio confiado vota, invierte y da conferencias con idéntica seguridad.',
          },
          {
            en: "Admitting ignorance is the first step of every discipline that has ever advanced, which is why 'I do not know' is the most honest sentence in scholarship.",
            native:
              "Admitir la ignorancia es el primer paso de toda disciplina que ha avanzado, y por eso 'no lo sé' es la frase más honesta de la erudición.",
          },
        ],
      },
      zh: {
        word: '无知',
        question: '无知是福，还是永远是一种负累？',
        examples: [
          {
            en: 'Ignorance can be bliss only where nothing is at stake, and the modern world arranges for almost everything to be at stake.',
            native: '只有在毫无利害攸关之处，无知才可能是福；而现代世界的安排，是让几乎一切都利害攸关。',
          },
          {
            en: 'The most dangerous ignorance is not knowing what we do not know, for the confident fool votes, invests, and lectures with equal assurance.',
            native: '最危险的无知，是不知道自己不知道——因为自信的蠢人投票、投资、讲学，都带着同等的笃定。',
          },
          {
            en: "Admitting ignorance is the first step of every discipline that has ever advanced, which is why 'I do not know' is the most honest sentence in scholarship.",
            native: '承认无知，是每一门曾有进步的学科迈出的第一步——所以“我不知道”是治学中最诚实的一句话。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'doubt',
    questionText: 'Is doubt a weakness to overcome, or the foundation of all inquiry?',
    translations: {
      te: {
        word: 'సందేహం',
        question: 'సందేహం అధిగమించవలసిన బలహీనతా, లేదా ప్రతి అన్వేషణకూ పునాదియా?',
        examples: [
          {
            en: 'Doubt is the immune system of the mind: it attacks foreign nonsense, and its disorders — credulity and cynicism — are equally fatal to thought.',
            native:
              'సందేహం మనస్సు యొక్క రోగనిరోధక వ్యవస్థ: అది బయటి అబద్ధాలను దాడి చేస్తుంది — దాని రుగ్మతలు, మూఢనమ్మకం, నిర్లిప్తత — ఆలోచనకు సమానంగా ప్రాణాంతకం.',
          },
          {
            en: 'Descartes doubted everything and found one thing standing: the doubter. All philosophy since has lived in the room he cleared.',
            native:
              'డెకార్ట్ ప్రతిదాన్ని సందేహించి ఒకటి నిలిచిపోవడం కనుగొన్నాడు: సందేహించేవాడు. అతడు శుభ్రం చేసిన గదిలోనే అప్పటినుండి తత్వశాస్త్రం అంతా నివసిస్తోంది.',
          },
          {
            en: 'A faith that has never been doubted is merely an inheritance unopened; examined doubt is the only honest doorway to conviction.',
            native:
              'ఎప్పుడూ సందేహించబడని విశ్వాసం తెరవని వారసత్వమే; పరీక్షించిన సందేహమే దృఢవిశ్వాసానికి ఏకైక నిజాయితీగల ద్వారం.',
          },
        ],
      },
      hi: {
        word: 'संदेह',
        question: 'क्या संदेह कोई जीतने वाली कमज़ोरी है, या हर जिज्ञासा की नींव?',
        examples: [
          {
            en: 'Doubt is the immune system of the mind: it attacks foreign nonsense, and its disorders — credulity and cynicism — are equally fatal to thought.',
            native:
              'संदेह मन की प्रतिरक्षा प्रणाली है: वह बाहरी बकवास पर हमला करता है — और उसके विकार, अंधविश्वास और तिरस्कारवाद, सोच के लिए समान रूप से घातक हैं।',
          },
          {
            en: 'Descartes doubted everything and found one thing standing: the doubter. All philosophy since has lived in the room he cleared.',
            native:
              'देकार्त ने सब कुछ संदेह किया और एक चीज़ को खड़ा पाया: संदेह करने वाले को। तब से का सारा दर्शन उसी कमरे में रहता है जिसे उसने खाली किया था।',
          },
          {
            en: 'A faith that has never been doubted is merely an inheritance unopened; examined doubt is the only honest doorway to conviction.',
            native:
              'जो आस्था कभी संदेह से नहीं गुज़री, वह महज़ खोली न गई विरासत है; परखा हुआ संदेह ही दृढ़ विश्वास का एकमात्र ईमानदार द्वार है।',
          },
        ],
      },
      es: {
        word: 'duda',
        question: '¿Es la duda una debilidad que superar o el fundamento de toda indagación?',
        examples: [
          {
            en: 'Doubt is the immune system of the mind: it attacks foreign nonsense, and its disorders — credulity and cynicism — are equally fatal to thought.',
            native:
              'La duda es el sistema inmunitario de la mente: ataca el sinsentido foráneo, y sus trastornos — la credulidad y el cinismo — son igualmente fatales para el pensamiento.',
          },
          {
            en: 'Descartes doubted everything and found one thing standing: the doubter. All philosophy since has lived in the room he cleared.',
            native:
              'Descartes lo dudó todo y halló una cosa en pie: el que duda. Toda la filosofía posterior ha vivido en la habitación que él despejó.',
          },
          {
            en: 'A faith that has never been doubted is merely an inheritance unopened; examined doubt is the only honest doorway to conviction.',
            native:
              'Una fe nunca dudada es una herencia sin abrir; la duda examinada es la única puerta honesta hacia la convicción.',
          },
        ],
      },
      zh: {
        word: '怀疑',
        question: '怀疑是需要克服的弱点，还是一切探究的根基？',
        examples: [
          {
            en: 'Doubt is the immune system of the mind: it attacks foreign nonsense, and its disorders — credulity and cynicism — are equally fatal to thought.',
            native: '怀疑是心灵的免疫系统：它攻击外来的谬论；而它的两种失调——轻信与犬儒——对思想同样致命。',
          },
          {
            en: 'Descartes doubted everything and found one thing standing: the doubter. All philosophy since has lived in the room he cleared.',
            native: '笛卡尔怀疑一切，却发现有一样东西屹立不倒：怀疑者本人。此后的全部哲学，都住在他清空的那间屋子里。',
          },
          {
            en: 'A faith that has never been doubted is merely an inheritance unopened; examined doubt is the only honest doorway to conviction.',
            native: '从未被怀疑过的信仰，不过是一份未曾拆封的遗产；经过检验的怀疑，才是通往确信唯一诚实的门。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'certainty',
    questionText: 'Why does certainty feel so good, and why is it so often wrong?',
    translations: {
      te: {
        word: 'ఖచ్చితత్వం',
        question: 'ఖచ్చితత్వం ఎందుకు అంత బాగా అనిపిస్తుంది, మరియు అది ఎందుకు ఇంత తరచుగా తప్పవుతుంది?',
        examples: [
          {
            en: 'Certainty is the mind’s anaesthetic: it relieves the pain of not knowing, and like all anaesthesia it should be administered with caution.',
            native:
              'ఖచ్చితత్వం మనస్సు యొక్క మత్తుమందు: తెలియని బాధను తగ్గిస్తుంది — ప్రతి మత్తుమందులాగే జాగ్రత్తగా ఇవ్వాల్సినదే.',
          },
          {
            en: 'The certain man is wrong with confidence, which is more dangerous than being wrong with hesitation, for hesitation at least keeps listening.',
            native:
              'ఖచ్చితత్వం గలవాడు నమ్మకంతో తప్పవుతాడు — ఇది సందిగ్ధంగా తప్పవడం కంటే ప్రమాదకరం, ఎందుకంటే సందిగ్ధత అయినా వింటూనే ఉంటుంది.',
          },
          {
            en: 'History’s worst harms were rarely committed by doubters; they required believers so certain that the suffering of others became an acceptable price.',
            native:
              'చరిత్రలోని అత్యంత భయంకరమైన హానులు అరుదుగా సందేహవాదులచే జరిగాయి — ఇతరుల బాధను అంగీకరించదగిన ధరగా మార్చేంత ఖచ్చితంగా నమ్మేవారు అవి కోరుకున్నాయి.',
          },
        ],
      },
      hi: {
        word: 'निश्चितता',
        question: 'निश्चितता इतनी अच्छी क्यों महसूस होती है, और वह इतनी बार ग़लत क्यों निकलती है?',
        examples: [
          {
            en: 'Certainty is the mind’s anaesthetic: it relieves the pain of not knowing, and like all anaesthesia it should be administered with caution.',
            native:
              'निश्चितता मन की बेहोशी की दवा है: वह न जानने के दर्द को मिटा देती है — और हर ऐसी दवा की तरह उसे सावधानी से देना चाहिए।',
          },
          {
            en: 'The certain man is wrong with confidence, which is more dangerous than being wrong with hesitation, for hesitation at least keeps listening.',
            native:
              'निश्चित व्यक्ति भरोसे के साथ ग़लत होता है, जो हिचकिचाहट के साथ ग़लत होने से ज़्यादा ख़तरनाक है, क्योंकि हिचकिचाहट कम से कम सुनती रहती है।',
          },
          {
            en: 'History’s worst harms were rarely committed by doubters; they required believers so certain that the suffering of others became an acceptable price.',
            native:
              'इतिहास के सबसे बड़े नुकसान शायद ही कभी संदेह करने वालों ने किए; उनके लिए ऐसे विश्वासी चाहिए थे जो इतने निश्चित हों कि दूसरों का दर्द एक मान्य कीमत बन जाए।',
          },
        ],
      },
      es: {
        word: 'certeza',
        question: '¿Por qué se siente tan bien la certeza, y por qué tan a menudo está equivocada?',
        examples: [
          {
            en: 'Certainty is the mind’s anaesthetic: it relieves the pain of not knowing, and like all anaesthesia it should be administered with caution.',
            native:
              'La certeza es el anestésico de la mente: alivia el dolor de no saber, y como toda anestesia debería administrarse con cautela.',
          },
          {
            en: 'The certain man is wrong with confidence, which is more dangerous than being wrong with hesitation, for hesitation at least keeps listening.',
            native:
              'El hombre certero se equivoca con confianza, lo cual es más peligroso que equivocarse con vacilación, porque la vacilación al menos sigue escuchando.',
          },
          {
            en: 'History’s worst harms were rarely committed by doubters; they required believers so certain that the suffering of others became an acceptable price.',
            native:
              'Los peores daños de la historia rara vez los cometieron los que dudan; requirieron creyentes tan ciertos que el sufrimiento ajeno se volvió un precio aceptable.',
          },
        ],
      },
      zh: {
        word: '确定性',
        question: '确定性为何让人感觉如此美妙，又为何如此经常地出错？',
        examples: [
          {
            en: 'Certainty is the mind’s anaesthetic: it relieves the pain of not knowing, and like all anaesthesia it should be administered with caution.',
            native: '确定性是心灵的麻醉剂：它缓解“不知道”的痛苦；而像一切麻醉剂一样，它应当谨慎施用。',
          },
          {
            en: 'The certain man is wrong with confidence, which is more dangerous than being wrong with hesitation, for hesitation at least keeps listening.',
            native: '笃定的人带着自信犯错，这比带着迟疑犯错更危险——因为迟疑至少还在继续倾听。',
          },
          {
            en: 'History’s worst harms were rarely committed by doubters; they required believers so certain that the suffering of others became an acceptable price.',
            native:
              '历史上最严重的伤害，很少出自怀疑者之手；它们需要笃定到如此地步的信者：他人的痛苦，成了可以接受的代价。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'belief',
    questionText: 'Are our beliefs chosen, or do they simply happen to us?',
    translations: {
      te: {
        word: 'నమ్మకం',
        question: 'మన నమ్మకాలు మనం ఎంచుకున్నవా, లేదా అవి కేవలం మనకు జరిగిపోయేవేనా?',
        examples: [
          {
            en: 'We do not choose beliefs as we choose clothes; we find ourselves believing, and at best we choose which beliefs to examine and which to feed.',
            native:
              'దుస్తులు ఎంచుకున్నట్లు మనం నమ్మకాలు ఎంచుకోము; మనం నమ్ముతూ ఉన్నామని కనుగొంటాం — మనం చేయగలిగినదెంతయినా ఏ నమ్మకాలను పరీక్షించాలో, ఏవాటిని పెంచాలో ఎంచుకోవడమే.',
          },
          {
            en: 'A belief held because it is useful is furniture; a belief held because it is true is a commitment, and the difference shows only under pressure.',
            native:
              'ఉపయోగమైనది కాబట్టి పట్టుకున్న నమ్మకం ఫర్నిచరు; నిజమైనది కాబట్టి పట్టుకున్న నమ్మకం నిబద్ధత — ఒత్తిడి క్రింద మాత్రమే తేడా కనిపిస్తుంది.',
          },
          {
            en: 'People defend their beliefs like property because beliefs are load-bearing: remove the wrong one carelessly and a whole worldview can collapse.',
            native:
              'ప్రజలు తమ నమ్మకాలను ఆస్తిలా కాపాడతారు ఎందుకంటే నమ్మకాలు భారం మోపేవి: తప్పు దాన్ని నిర్జాగ్రత్తగా తొలగిస్తే మొత్తం ప్రపంచ వీక్షణే కూలిపోవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'विश्वास',
        question: 'क्या हमारे विश्वास हमारे चुने हुए होते हैं, या वे बस हमें हो जाते हैं?',
        examples: [
          {
            en: 'We do not choose beliefs as we choose clothes; we find ourselves believing, and at best we choose which beliefs to examine and which to feed.',
            native:
              'हम विश्वासों को कपड़ों की तरह नहीं चुनते; हम खुद को विश्वास करता पाते हैं — और अधिक से अधिक हम यही चुन सकते हैं कि किन विश्वासों की परख करनी है और किन्हें पालना है।',
          },
          {
            en: 'A belief held because it is useful is furniture; a belief held because it is true is a commitment, and the difference shows only under pressure.',
            native:
              'जो विश्वास उपयोगी होने के कारण पकड़ा गया हो, वह फ़र्नीचर है; जो सत्य होने के कारण पकड़ा गया हो, वह प्रतिबद्धता है — और फ़र्क़ केवल दबाव में दिखता है।',
          },
          {
            en: 'People defend their beliefs like property because beliefs are load-bearing: remove the wrong one carelessly and a whole worldview can collapse.',
            native:
              'लोग अपने विश्वासों की रक्षा संपत्ति की तरह करते हैं क्योंकि विश्वास भार वहन करने वाले होते हैं: ग़लत विश्वास को लापरवाही से निकालो तो पूरी विश्वदृष्टि ढह सकती है।',
          },
        ],
      },
      es: {
        word: 'creencia',
        question: '¿Elegimos nuestras creencias o simplemente nos suceden?',
        examples: [
          {
            en: 'We do not choose beliefs as we choose clothes; we find ourselves believing, and at best we choose which beliefs to examine and which to feed.',
            native:
              'No elegimos las creencias como elegimos la ropa; nos encontramos creyendo, y a lo sumo elegimos cuáles examinar y cuáles alimentar.',
          },
          {
            en: 'A belief held because it is useful is furniture; a belief held because it is true is a commitment, and the difference shows only under pressure.',
            native:
              'Una creencia sostenida porque es útil es mobiliario; una sostenida porque es verdadera es un compromiso, y la diferencia solo se nota bajo presión.',
          },
          {
            en: 'People defend their beliefs like property because beliefs are load-bearing: remove the wrong one carelessly and a whole worldview can collapse.',
            native:
              'La gente defiende sus creencias como propiedades porque las creencias soportan peso: retira descuidadamente la equivocada y toda una visión del mundo puede derrumbarse.',
          },
        ],
      },
      zh: {
        word: '信念',
        question: '我们的信念是选择的结果，还是自然而然降临在我们身上的？',
        examples: [
          {
            en: 'We do not choose beliefs as we choose clothes; we find ourselves believing, and at best we choose which beliefs to examine and which to feed.',
            native: '我们并不像挑选衣服那样挑选信念；我们发现自己已然相信，充其量只能选择审视哪些信念、滋养哪些信念。',
          },
          {
            en: 'A belief held because it is useful is furniture; a belief held because it is true is a commitment, and the difference shows only under pressure.',
            native: '因有用而持有的信念是家具；因真实而持有的信念是承诺——两者的差别，只有在压力下才显现。',
          },
          {
            en: 'People defend their beliefs like property because beliefs are load-bearing: remove the wrong one carelessly and a whole worldview can collapse.',
            native: '人们像捍卫财产一样捍卫信念，因为信念是承重的：若粗心地抽掉错误的那一根，整个世界观都可能坍塌。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'faith',
    questionText: 'Is faith a virtue, a comfort, or a surrender of reason?',
    translations: {
      te: {
        word: 'విశ్వాసం',
        question: 'విశ్వాసం ఒక గుణమా, ఓర్పా, లేదా తర్కం యొక్క లొంగుబాటా?',
        examples: [
          {
            en: 'Faith sustains people through evidence-free nights when reason alone would counsel despair, yet the same engine can carry a mind anywhere at all.',
            native:
              'తర్కం మాత్రమే నిరాశ సలహా ఇచ్చే సాక్ష్యరహిత రాత్రుల్లో విశ్వాసం ప్రజలను నిలబెడుతుంది, అయితే అదే యంత్రం మనసును ఎక్కడికైనా మోసుకెళ్లగలదు.',
          },
          {
            en: 'There is faith in God, faith in people, and faith in tomorrow; what unites them is commitment in advance of proof, which every love requires.',
            native:
              'దేవుడిపై విశ్వాసం, మనుషులపై విశ్వాసం, రేపటిపై విశ్వాసం ఉన్నాయి; వాటన్నిటిని ఏకం చేసేది సాక్ష్యానికి ముందే నిబద్ధత — ప్రతి ప్రేమకు అది అవసరం.',
          },
          {
            en: 'The question is never whether to have faith — we all trust something — but what deserves it, and what we do when our faith is betrayed.',
            native:
              'ప్రశ్న ఎప్పుడూ విశ్వాసం ఉండాలా వద్దా కాదు — మనమందరం ఏదో ఒక దాన్ని నమ్ముతాం — దేనికి అది అర్హమో, మన విశ్వాసం ద్రోహం చేయబడినప్పుడు మనం ఏమి చేస్తామో అదే ప్రశ్న.',
          },
        ],
      },
      hi: {
        word: 'आस्था',
        question: 'क्या आस्था एक गुण है, एक सांत्वना, या तर्क का समर्पण?',
        examples: [
          {
            en: 'Faith sustains people through evidence-free nights when reason alone would counsel despair, yet the same engine can carry a mind anywhere at all.',
            native:
              'आस्था उन साक्ष्य-विहीन रातों में लोगों को थामे रखती है जब अकेला तर्क निराशा की सलाह देता है, फिर भी वही इंजन मन को कहीं भी ले जा सकता है।',
          },
          {
            en: 'There is faith in God, faith in people, and faith in tomorrow; what unites them is commitment in advance of proof, which every love requires.',
            native:
              'ईश्वर में आस्था है, लोगों में आस्था है, और कल में आस्था है; तीनों को जोड़ता है प्रमाण से पहले की प्रतिबद्धता — जिसकी ज़रूरत हर प्रेम को होती है।',
          },
          {
            en: 'The question is never whether to have faith — we all trust something — but what deserves it, and what we do when our faith is betrayed.',
            native:
              'सवाल कभी यह नहीं कि आस्था रखनी है या नहीं — हम सब किसी न किसी पर भरोसा करते हैं — सवाल यह है कि कौन उसका हक़दार है, और आस्था के टूटने पर हम क्या करते हैं।',
          },
        ],
      },
      es: {
        word: 'fe',
        question: '¿Es la fe una virtud, un consuelo o una rendición de la razón?',
        examples: [
          {
            en: 'Faith sustains people through evidence-free nights when reason alone would counsel despair, yet the same engine can carry a mind anywhere at all.',
            native:
              'La fe sostiene a las personas en noches sin evidencia donde la razón sola aconsejaría desesperar, pero el mismo motor puede llevar una mente a cualquier parte.',
          },
          {
            en: 'There is faith in God, faith in people, and faith in tomorrow; what unites them is commitment in advance of proof, which every love requires.',
            native:
              'Hay fe en Dios, fe en las personas y fe en el mañana; lo que las une es el compromiso antes de la prueba, que todo amor requiere.',
          },
          {
            en: 'The question is never whether to have faith — we all trust something — but what deserves it, and what we do when our faith is betrayed.',
            native:
              'La cuestión nunca es si tener fe — todos confiamos en algo — sino qué la merece, y qué hacemos cuando nuestra fe es traicionada.',
          },
        ],
      },
      zh: {
        word: '信仰',
        question: '信仰是一种美德、一种慰藉，还是理性的投降？',
        examples: [
          {
            en: 'Faith sustains people through evidence-free nights when reason alone would counsel despair, yet the same engine can carry a mind anywhere at all.',
            native:
              '在证据缺席的暗夜里，单凭理性只会劝人绝望，而信仰支撑着人们挺过来——但同一台引擎，也能把心灵载往任何地方。',
          },
          {
            en: 'There is faith in God, faith in people, and faith in tomorrow; what unites them is commitment in advance of proof, which every love requires.',
            native:
              '有对神的信仰，有对人的信仰，也有对明天的信仰；将它们连在一起的，是在证明出现之前的托付——而每一份爱都需要这种托付。',
          },
          {
            en: 'The question is never whether to have faith — we all trust something — but what deserves it, and what we do when our faith is betrayed.',
            native:
              '问题从来不是要不要有信仰——我们人人都信任着某种东西——问题在于什么配得上它，以及信仰被辜负时我们何去何从。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'reason',
    questionText: 'Can reason alone tell us how to live, or does it only serve our passions?',
    translations: {
      te: {
        word: 'తర్కం',
        question: 'ఎలా జీవించాలో తర్కం ఒక్కటే చెప్పగలదా, లేదా అది కేవలం మన కోరికలకు సేవ చేస్తుందా?',
        examples: [
          {
            en: 'Reason is a superb navigator but a poor captain: it can chart any course yet cannot tell us which destination is worth the voyage.',
            native:
              'తర్కం అద్భుతమైన నావికుడు కానీ పేలవమైన కెప్టెను: ఏ మార్గాన్నైనా గీయగలదు కానీ ఏ గమ్యం ప్రయాణానికి విలువైనదో చెప్పలేదు.',
          },
          {
            en: 'Hume called reason the slave of the passions, and the insult contains a truth: pure logic has never yet told anyone what to want.',
            native:
              'తర్కం కోరికలకు బానిస అని హ్యూమ్ అన్నాడు — ఆ అవమానంలో సత్యం ఉంది: స్వచ్ఛమైన తర్కం ఇప్పటివరకు ఎవరికీ ఏమి కోరాలో చెప్పలేదు.',
          },
          {
            en: 'Yet reason disciplines our desires, catches our contradictions, and forces honesty upon us; a slave so indispensable becomes a partner in command.',
            native:
              'అయినా తర్కం మన కోరికలను క్రమబద్ధం చేస్తుంది, మన వైరుధ్యాలను పట్టుకుంటుంది, మనపై నిజాయితీని బలవంతం చేస్తుంది — అంత అత్యవసరమైన బానిస అధికారంలో భాగస్వామి అవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'तर्क',
        question: 'क्या अकेला तर्क हमें बता सकता है कि कैसे जीना चाहिए, या वह केवल हमारी भावनाओं की सेवा करता है?',
        examples: [
          {
            en: 'Reason is a superb navigator but a poor captain: it can chart any course yet cannot tell us which destination is worth the voyage.',
            native:
              'तर्क शानदार नाविक है पर कमज़ोर कप्तान: वह कोई भी रास्ता बना सकता है, पर यह नहीं बता सकता कि कौन सी मंज़िल सफ़र की क़ाबिल है।',
          },
          {
            en: 'Hume called reason the slave of the passions, and the insult contains a truth: pure logic has never yet told anyone what to want.',
            native:
              'ह्यूम ने तर्क को भावनाओं का ग़ुलाम कहा — और उस अपमान में एक सच्चाई छिपी है: शुद्ध तर्क ने आज तक किसी को नहीं बताया कि क्या चाहना चाहिए।',
          },
          {
            en: 'Yet reason disciplines our desires, catches our contradictions, and forces honesty upon us; a slave so indispensable becomes a partner in command.',
            native:
              'फिर भी तर्क हमारी इच्छाओं को अनुशासित करता है, हमारे विरोधाभास पकड़ता है और हम पर ईमानदारी थोपता है; इतना अनिवार्य ग़ुलाम क़ाबिल में साझीदार बन जाता है।',
          },
        ],
      },
      es: {
        word: 'razón',
        question: '¿Puede la razón por sí sola decirnos cómo vivir, o solo sirve a nuestras pasiones?',
        examples: [
          {
            en: 'Reason is a superb navigator but a poor captain: it can chart any course yet cannot tell us which destination is worth the voyage.',
            native:
              'La razón es una navegante soberbia pero una capitana pobre: puede trazar cualquier rumbo, mas no puede decirnos qué destino merece el viaje.',
          },
          {
            en: 'Hume called reason the slave of the passions, and the insult contains a truth: pure logic has never yet told anyone what to want.',
            native:
              'Hume llamó a la razón esclava de las pasiones, y el insulto contiene una verdad: la lógica pura jamás le ha dicho a nadie qué desear.',
          },
          {
            en: 'Yet reason disciplines our desires, catches our contradictions, and forces honesty upon us; a slave so indispensable becomes a partner in command.',
            native:
              'Sin embargo, la razón disciplina nuestros deseos, atrapa nuestras contradicciones y nos impone honestidad; un esclavo tan indispensable se vuelve socio en el mando.',
          },
        ],
      },
      zh: {
        word: '理性',
        question: '单凭理性能告诉我们该如何生活吗？还是说它只为激情服务？',
        examples: [
          {
            en: 'Reason is a superb navigator but a poor captain: it can chart any course yet cannot tell us which destination is worth the voyage.',
            native: '理性是出色的领航员，却是平庸的船长：它能绘制任何航线，却无法告诉我们哪个目的地值得远航。',
          },
          {
            en: 'Hume called reason the slave of the passions, and the insult contains a truth: pure logic has never yet told anyone what to want.',
            native: '休谟称理性是激情的奴隶——这句羞辱中含着真理：纯粹的逻辑从未告诉过任何人应当欲求什么。',
          },
          {
            en: 'Yet reason disciplines our desires, catches our contradictions, and forces honesty upon us; a slave so indispensable becomes a partner in command.',
            native:
              '然而理性约束我们的欲望，揪出我们的矛盾，迫使我们诚实；如此不可或缺的奴隶，终将成为指挥席上的伙伴。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'intuition',
    questionText: 'When should we trust our intuition, and when does it betray us?',
    translations: {
      te: {
        word: 'అంతర్దృష్టి',
        question: 'మన అంతర్దృష్టిని ఎప్పుడు నమ్మాలి, మరియు అది ఎప్పుడు మనల్ని మోసం చేస్తుంది?',
        examples: [
          {
            en: 'Intuition is experience compressed into feeling; it deserves trust exactly where we have logged thousands of hours, and suspicion everywhere else.',
            native:
              'అంతర్దృష్టి అనేది భావనలోకి కుదించబడిన అనుభవం; మనం వేలాది గంటలు గడిపిన చోట్లే దాన్ని నమ్మడం, మిగతా చోట్ల సందేహించడం సముచితం.',
          },
          {
            en: 'The chess master’s hunch is wisdom because it is memory in disguise, while the novice’s hunch is merely hope wearing the same costume.',
            native:
              'చదరంగం పిటామహుడి అంతర్జ్ఞానం జ్ఞానం ఎందుకంటే అది ముసుగులోని జ్ఞాపకం — అయితే నేర్పరి కాని అంతర్జ్ఞానం అదే వేషంలో ఉన్న ఆశ మాత్రమే.',
          },
          {
            en: 'Intuition fails most reliably where statistics rule and feedback is slow, which is why gut feelings about markets and strangers so often mislead.',
            native:
              'గణాంకాలు పాలించే చోట, ప్రతిస్పందన నెమ్మదిగా వచ్చే చోట అంతర్దృష్టి అత్యంత నమ్మకంగా విఫలమవుతుంది — మార్కెట్ల గురించి, అపరిచితుల గురించి ఉండే అంతర్భావాలు ఎందుకు ఇంత తరచుగా తప్పుదారి పట్టిస్తాయో కారణం ఇదే.',
          },
        ],
      },
      hi: {
        word: 'अंतर्ज्ञान',
        question: 'हमें अपने अंतर्ज्ञान पर कब भरोसा करना चाहिए, और वह कब हमें धोखा देता है?',
        examples: [
          {
            en: 'Intuition is experience compressed into feeling; it deserves trust exactly where we have logged thousands of hours, and suspicion everywhere else.',
            native:
              'अंतर्ज्ञान भावना में संपीड़ित अनुभव है; ठीक वहीं इसका भरोसा किया जाए जहाँ हमने हज़ारों घंटे बिताए हों, और बाक़ी हर जगह संदेह।',
          },
          {
            en: 'The chess master’s hunch is wisdom because it is memory in disguise, while the novice’s hunch is merely hope wearing the same costume.',
            native:
              'शतरंज उस्ताद की सूझ बुद्धि है क्योंकि वह छद्मवेशी स्मृति है, जबकि नौसिखिए की सूझ महज़ उसी पोशाक में आशा है।',
          },
          {
            en: 'Intuition fails most reliably where statistics rule and feedback is slow, which is why gut feelings about markets and strangers so often mislead.',
            native:
              'अंतर्ज्ञान सबसे भरोसेमंद ढंग से वहाँ असफल होता है जहाँ आँकड़े राज करते हैं और प्रतिक्रिया धीमी होती है — इसीलिए बाज़ारों और अजनबियों के बारे में अंदरूनी भावना अक्सर गुमराह करती है।',
          },
        ],
      },
      es: {
        word: 'intuición',
        question: '¿Cuándo deberíamos confiar en nuestra intuición y cuándo nos traiciona?',
        examples: [
          {
            en: 'Intuition is experience compressed into feeling; it deserves trust exactly where we have logged thousands of hours, and suspicion everywhere else.',
            native:
              'La intuición es experiencia comprimida en sentimiento; merece confianza exactamente donde hemos acumulado miles de horas, y sospecha en todas partes demás.',
          },
          {
            en: 'The chess master’s hunch is wisdom because it is memory in disguise, while the novice’s hunch is merely hope wearing the same costume.',
            native:
              'El pálpito del gran maestro de ajedrez es sabiduría porque es memoria disfrazada, mientras que el del novicio es solo esperanza con el mismo disfraz.',
          },
          {
            en: 'Intuition fails most reliably where statistics rule and feedback is slow, which is why gut feelings about markets and strangers so often mislead.',
            native:
              'La intuición falla con mayor fiabilidad donde mandan las estadísticas y la retroalimentación es lenta, y por eso las corazonadas sobre mercados y desconocidos tan a menudo engañan.',
          },
        ],
      },
      zh: {
        word: '直觉',
        question: '什么时候应当相信直觉，什么时候直觉会背叛我们？',
        examples: [
          {
            en: 'Intuition is experience compressed into feeling; it deserves trust exactly where we have logged thousands of hours, and suspicion everywhere else.',
            native: '直觉是被压缩成感觉的经验；恰恰只有在我们投入过数千小时的领域，它才值得信任——其余地方都应存疑。',
          },
          {
            en: 'The chess master’s hunch is wisdom because it is memory in disguise, while the novice’s hunch is merely hope wearing the same costume.',
            native: '象棋大师的预感是智慧，因为它是乔装的记忆；而新手的预感，不过是穿着同样服装的希望。',
          },
          {
            en: 'Intuition fails most reliably where statistics rule and feedback is slow, which is why gut feelings about markets and strangers so often mislead.',
            native:
              '直觉在统计主导、反馈迟缓的领域失败得最为稳定——这就是为什么关于市场和陌生人的“感觉”如此经常地误导人。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'epistemology',
    questionText:
      'How should epistemology distinguish justified knowledge from confident error in an age of algorithmic information?',
    translations: {
      te: {
        word: 'జ్ఞానమీమాంస',
        question:
          'అల్గోరిథమిక్ సమాచార యుగంలో సమర్థించబడిన జ్ఞానాన్ని ఆత్మవిశ్వాసంతో కూడిన తప్పు నుంచి జ్ఞానమీమాంస ఎలా వేరు చేయాలి?',
        examples: [
          {
            en: 'A belief becomes knowledge only when its warrant survives scrutiny, not merely when repetition makes it familiar.',
            native:
              'పునరావృతం వల్ల ఒక నమ్మకం సుపరిచితం అయినంత మాత్రాన అది జ్ఞానం కాదు; దాని సమర్థన క్షుణ్ణమైన పరిశీలనను తట్టుకున్నప్పుడే అది జ్ఞానంగా మారుతుంది.',
          },
          {
            en: 'Digital abundance magnifies an old epistemic problem: access to claims is not the same as access to reasons.',
            native:
              'డిజిటల్ సమృద్ధి ఒక పాత జ్ఞానసంబంధ సమస్యను మరింత పెంచుతుంది: వాదనలు అందుబాటులో ఉండటం, వాటి వెనుక కారణాలు అందుబాటులో ఉండటంతో సమానం కాదు.',
          },
          {
            en: 'Intellectual humility is not indecision; it is the discipline of matching confidence to the quality of evidence.',
            native: 'మేధో వినయం అనిర్ణయం కాదు; సాక్ష్యాల నాణ్యతకు తగిన స్థాయిలో ఆత్మవిశ్వాసాన్ని ఉంచే క్రమశిక్షణ అది.',
          },
        ],
      },
      hi: {
        word: 'ज्ञानमीमांसा',
        question:
          'एल्गोरिद्मिक सूचना के युग में ज्ञानमीमांसा को उचित आधार वाले ज्ञान और आत्मविश्वास से भरी भूल के बीच भेद कैसे करना चाहिए?',
        examples: [
          {
            en: 'A belief becomes knowledge only when its warrant survives scrutiny, not merely when repetition makes it familiar.',
            native:
              'कोई विश्वास केवल बार-बार दोहराए जाने से परिचित लगने के कारण ज्ञान नहीं बनता; वह तभी ज्ञान बनता है जब उसका औचित्य कठोर जाँच में टिका रहे।',
          },
          {
            en: 'Digital abundance magnifies an old epistemic problem: access to claims is not the same as access to reasons.',
            native:
              'डिजिटल प्रचुरता ज्ञान से जुड़ी एक पुरानी समस्या को बढ़ा देती है: दावों तक पहुँच होना उनके कारणों तक पहुँच होने के समान नहीं है।',
          },
          {
            en: 'Intellectual humility is not indecision; it is the discipline of matching confidence to the quality of evidence.',
            native:
              'बौद्धिक विनम्रता अनिर्णय नहीं है; वह अपने आत्मविश्वास को साक्ष्य की गुणवत्ता के अनुरूप रखने का अनुशासन है।',
          },
        ],
      },
      es: {
        word: 'epistemología',
        question:
          '¿Cómo debería distinguir la epistemología entre el conocimiento justificado y el error expresado con seguridad en una era de información algorítmica?',
        examples: [
          {
            en: 'A belief becomes knowledge only when its warrant survives scrutiny, not merely when repetition makes it familiar.',
            native:
              'Una creencia se convierte en conocimiento solo cuando su justificación resiste el escrutinio, no simplemente cuando la repetición la vuelve familiar.',
          },
          {
            en: 'Digital abundance magnifies an old epistemic problem: access to claims is not the same as access to reasons.',
            native:
              'La abundancia digital amplifica un antiguo problema epistémico: tener acceso a afirmaciones no equivale a tener acceso a razones.',
          },
          {
            en: 'Intellectual humility is not indecision; it is the discipline of matching confidence to the quality of evidence.',
            native:
              'La humildad intelectual no es indecisión; es la disciplina de ajustar la confianza a la calidad de las pruebas.',
          },
        ],
      },
      zh: {
        word: '认识论',
        question: '在算法信息时代，认识论应如何区分有充分依据的知识与自信满满的错误？',
        examples: [
          {
            en: 'A belief becomes knowledge only when its warrant survives scrutiny, not merely when repetition makes it familiar.',
            native: '一种信念只有在其理据经受住审查时才成为知识，而不是仅仅因为反复出现而让人感到熟悉。',
          },
          {
            en: 'Digital abundance magnifies an old epistemic problem: access to claims is not the same as access to reasons.',
            native: '数字信息的极大丰富放大了一个古老的认识论难题：接触到主张并不等于接触到支撑它们的理由。',
          },
          {
            en: 'Intellectual humility is not indecision; it is the discipline of matching confidence to the quality of evidence.',
            native: '智识谦逊并非优柔寡断，而是一种让确信程度与证据质量相匹配的自律。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'existentialism',
    questionText:
      'Does existentialism liberate individuals by denying predetermined meaning, or burden them with impossible responsibility?',
    translations: {
      te: {
        word: 'అస్తిత్వవాదం',
        question:
          'ముందే నిర్ణయించబడిన అర్థాన్ని నిరాకరించడం ద్వారా అస్తిత్వవాదం వ్యక్తులకు విముక్తి కలిగిస్తుందా, లేక అసాధ్యమైన బాధ్యతను వారిపై మోపుతుందా?',
        examples: [
          {
            en: 'Existential freedom is exhilarating precisely because it removes every cosmic excuse for the life one chooses.',
            native:
              'మనిషి ఎంచుకునే జీవితానికి సంబంధించిన ప్రతి విశ్వవ్యాప్త సాకును తొలగిస్తుంది కాబట్టే అస్తిత్వ స్వేచ్ఛ ఉల్లాసకరంగా ఉంటుంది.',
          },
          {
            en: 'We inherit circumstances we did not select, but our responses gradually turn those constraints into a biography.',
            native:
              'మనం ఎంచుకోని పరిస్థితులను వారసత్వంగా పొందుతాం, కానీ మన ప్రతిస్పందనలు క్రమంగా ఆ పరిమితులను మన జీవితకథగా మారుస్తాయి.',
          },
          {
            en: 'The absence of predetermined meaning need not imply despair; it can make meaning an achievement rather than a gift.',
            native:
              'ముందే నిర్ణయించబడిన అర్థం లేకపోవడం నిరాశను సూచించాల్సిన అవసరం లేదు; అది అర్థాన్ని కానుకగా కాకుండా మనం సాధించేదిగా మార్చగలదు.',
          },
        ],
      },
      hi: {
        word: 'अस्तित्ववाद',
        question:
          'क्या अस्तित्ववाद पूर्वनिर्धारित अर्थ को नकारकर व्यक्तियों को मुक्त करता है, या उन पर असंभव उत्तरदायित्व का बोझ डालता है?',
        examples: [
          {
            en: 'Existential freedom is exhilarating precisely because it removes every cosmic excuse for the life one chooses.',
            native:
              'अस्तित्वगत स्वतंत्रता ठीक इसलिए रोमांचक है क्योंकि वह व्यक्ति द्वारा चुने गए जीवन के लिए हर ब्रह्मांडीय बहाने को हटा देती है।',
          },
          {
            en: 'We inherit circumstances we did not select, but our responses gradually turn those constraints into a biography.',
            native:
              'हमें वे परिस्थितियाँ विरासत में मिलती हैं जिन्हें हमने नहीं चुना, लेकिन हमारी प्रतिक्रियाएँ धीरे-धीरे उन सीमाओं को हमारी जीवनकथा में बदल देती हैं।',
          },
          {
            en: 'The absence of predetermined meaning need not imply despair; it can make meaning an achievement rather than a gift.',
            native:
              'पूर्वनिर्धारित अर्थ का अभाव अनिवार्य रूप से निराशा नहीं लाता; वह अर्थ को उपहार के बजाय एक उपलब्धि बना सकता है।',
          },
        ],
      },
      es: {
        word: 'existencialismo',
        question:
          '¿Libera el existencialismo a las personas al negar un sentido predeterminado, o las carga con una responsabilidad imposible?',
        examples: [
          {
            en: 'Existential freedom is exhilarating precisely because it removes every cosmic excuse for the life one chooses.',
            native:
              'La libertad existencial resulta estimulante precisamente porque elimina toda excusa cósmica para la vida que cada persona elige.',
          },
          {
            en: 'We inherit circumstances we did not select, but our responses gradually turn those constraints into a biography.',
            native:
              'Heredamos circunstancias que no escogimos, pero nuestras respuestas convierten gradualmente esas limitaciones en una biografía.',
          },
          {
            en: 'The absence of predetermined meaning need not imply despair; it can make meaning an achievement rather than a gift.',
            native:
              'La ausencia de un sentido predeterminado no tiene por qué implicar desesperación; puede hacer del sentido un logro en vez de un regalo.',
          },
        ],
      },
      zh: {
        word: '存在主义',
        question: '存在主义否定预定的意义，究竟是解放了个人，还是让他们背负了无法承受的责任？',
        examples: [
          {
            en: 'Existential freedom is exhilarating precisely because it removes every cosmic excuse for the life one chooses.',
            native: '存在主义的自由之所以令人振奋，恰恰是因为它排除了为自己所选生活开脱的一切宇宙性借口。',
          },
          {
            en: 'We inherit circumstances we did not select, but our responses gradually turn those constraints into a biography.',
            native: '我们继承了并非由自己选择的处境，但我们的回应逐渐将这些限制写成了一部人生传记。',
          },
          {
            en: 'The absence of predetermined meaning need not imply despair; it can make meaning an achievement rather than a gift.',
            native: '没有预定的意义并不必然意味着绝望；它可以使意义成为一种成就，而不是一份馈赠。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'phenomenology',
    questionText: 'What can phenomenology reveal that third-person scientific description may overlook?',
    translations: {
      te: {
        word: 'దృగ్విషయశాస్త్రం',
        question: 'మూడవ వ్యక్తి దృష్టితో చేసే శాస్త్రీయ వర్ణన విస్మరించగల దేనిని దృగ్విషయశాస్త్రం వెల్లడించగలదు?',
        examples: [
          {
            en: 'A neural account of pain can be complete at its own level while omitting what pain feels like to the sufferer.',
            native:
              'నొప్పికి సంబంధించిన నాడీశాస్త్ర వివరణ తన స్థాయిలో సంపూర్ణంగా ఉండవచ్చు, అయినప్పటికీ బాధితుడికి నొప్పి ఎలా అనిపిస్తుందో అది వదిలేయవచ్చు.',
          },
          {
            en: 'Phenomenology treats lived experience not as noise around reality but as a domain requiring rigorous description.',
            native:
              'దృగ్విషయశాస్త్రం జీవించిన అనుభవాన్ని వాస్తవం చుట్టూ ఉన్న అనవసర శబ్దంగా కాకుండా, కచ్చితమైన వర్ణన అవసరమైన అధ్యయన రంగంగా పరిగణిస్తుంది.',
          },
          {
            en: 'First-person evidence is fallible, yet excluding it would erase the very consciousness a theory seeks to explain.',
            native:
              'ప్రథమ వ్యక్తి సాక్ష్యం తప్పు కావచ్చు; అయినా దానిని మినహాయిస్తే ఒక సిద్ధాంతం వివరించాలని ప్రయత్నించే చైతన్యాన్నే చెరిపివేసినట్లవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'घटनाविज्ञान',
        question:
          'घटनाविज्ञान ऐसा क्या उजागर कर सकता है जिसे तीसरे व्यक्ति के दृष्टिकोण वाला वैज्ञानिक वर्णन अनदेखा कर दे?',
        examples: [
          {
            en: 'A neural account of pain can be complete at its own level while omitting what pain feels like to the sufferer.',
            native:
              'पीड़ा का तंत्रिका-विज्ञान संबंधी विवरण अपने स्तर पर पूर्ण हो सकता है, फिर भी वह यह छोड़ सकता है कि पीड़ित को दर्द कैसा महसूस होता है।',
          },
          {
            en: 'Phenomenology treats lived experience not as noise around reality but as a domain requiring rigorous description.',
            native:
              'घटनाविज्ञान जिए हुए अनुभव को वास्तविकता के आसपास का शोर नहीं, बल्कि कठोर वर्णन की माँग करने वाला एक क्षेत्र मानता है।',
          },
          {
            en: 'First-person evidence is fallible, yet excluding it would erase the very consciousness a theory seeks to explain.',
            native:
              'प्रथम-पुरुष साक्ष्य त्रुटिपूर्ण हो सकता है, फिर भी उसे बाहर रखना उसी चेतना को मिटा देगा जिसे कोई सिद्धांत समझाना चाहता है।',
          },
        ],
      },
      es: {
        word: 'fenomenología',
        question:
          '¿Qué puede revelar la fenomenología que una descripción científica en tercera persona podría pasar por alto?',
        examples: [
          {
            en: 'A neural account of pain can be complete at its own level while omitting what pain feels like to the sufferer.',
            native:
              'Una explicación neuronal del dolor puede ser completa en su propio nivel y, aun así, omitir cómo se siente el dolor para quien lo padece.',
          },
          {
            en: 'Phenomenology treats lived experience not as noise around reality but as a domain requiring rigorous description.',
            native:
              'La fenomenología considera la experiencia vivida no como ruido alrededor de la realidad, sino como un ámbito que exige una descripción rigurosa.',
          },
          {
            en: 'First-person evidence is fallible, yet excluding it would erase the very consciousness a theory seeks to explain.',
            native:
              'La evidencia en primera persona es falible, pero excluirla borraría la propia conciencia que una teoría pretende explicar.',
          },
        ],
      },
      zh: {
        word: '现象学',
        question: '现象学能够揭示哪些可能被第三人称的科学描述所忽略的内容？',
        examples: [
          {
            en: 'A neural account of pain can be complete at its own level while omitting what pain feels like to the sufferer.',
            native: '对疼痛的神经机制解释可以在其自身层面上完整无缺，却仍遗漏疼痛对于承受者而言究竟是什么感受。',
          },
          {
            en: 'Phenomenology treats lived experience not as noise around reality but as a domain requiring rigorous description.',
            native: '现象学不把切身经验视为现实周围的噪声，而是将其视为一个需要严谨描述的领域。',
          },
          {
            en: 'First-person evidence is fallible, yet excluding it would erase the very consciousness a theory seeks to explain.',
            native: '第一人称证据可能出错，然而将其排除，就会抹去理论原本试图解释的意识本身。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'postmodernism',
    questionText:
      'Has postmodernism sharpened criticism of hidden power, or weakened our capacity to defend shared truth?',
    translations: {
      te: {
        word: 'ఉత్తరాధునికవాదం',
        question:
          'ఉత్తరాధునికవాదం దాగి ఉన్న అధికారంపై విమర్శను పదును పెట్టిందా, లేక ఉమ్మడి సత్యాన్ని సమర్థించే మన సామర్థ్యాన్ని బలహీనపరిచిందా?',
        examples: [
          {
            en: 'Postmodern critique usefully exposes whose interests masquerade as neutrality, but suspicion cannot itself establish what is true.',
            native:
              'ఎవరి ప్రయోజనాలు తటస్థత ముసుగులో కనిపిస్తున్నాయో ఉత్తరాధునిక విమర్శ ఉపయోగకరంగా బయటపెడుతుంది; అయితే అనుమానం ఒక్కటే ఏది సత్యమో నిర్ధారించలేదు.',
          },
          {
            en: 'When every claim is reduced to power, the critic’s own claim risks becoming another bid for dominance.',
            native:
              'ప్రతి వాదనను అధికారానికి మాత్రమే పరిమితం చేసినప్పుడు, విమర్శకుడి సొంత వాదన కూడా ఆధిపత్యం కోసం చేసే మరో ప్రయత్నంగా మారే ప్రమాదం ఉంది.',
          },
          {
            en: 'We can reject absolute foundations without pretending that evidence, coherence, and consequences are interchangeable.',
            native:
              'సాక్ష్యం, పొందిక, పరిణామాలు పరస్పరం మార్చుకోదగినవని నటించకుండానే మనం నిరపేక్ష పునాదులను తిరస్కరించవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'उत्तर-आधुनिकतावाद',
        question:
          'क्या उत्तर-आधुनिकतावाद ने छिपी हुई सत्ता की आलोचना को पैना किया है, या साझा सत्य की रक्षा करने की हमारी क्षमता को कमज़ोर किया है?',
        examples: [
          {
            en: 'Postmodern critique usefully exposes whose interests masquerade as neutrality, but suspicion cannot itself establish what is true.',
            native:
              'उत्तर-आधुनिक आलोचना उपयोगी ढंग से उजागर करती है कि किसके हित तटस्थता का वेश धारण करते हैं, लेकिन संदेह अपने आप यह स्थापित नहीं कर सकता कि सत्य क्या है।',
          },
          {
            en: 'When every claim is reduced to power, the critic’s own claim risks becoming another bid for dominance.',
            native:
              'जब हर दावे को सत्ता तक सीमित कर दिया जाता है, तब आलोचक का अपना दावा भी प्रभुत्व पाने की एक और कोशिश बन जाने का जोखिम उठाता है।',
          },
          {
            en: 'We can reject absolute foundations without pretending that evidence, coherence, and consequences are interchangeable.',
            native:
              'हम यह दिखावा किए बिना परम आधारों को अस्वीकार कर सकते हैं कि साक्ष्य, सुसंगति और परिणाम एक-दूसरे के बदले रखे जा सकते हैं।',
          },
        ],
      },
      es: {
        word: 'posmodernismo',
        question:
          '¿Ha agudizado el posmodernismo la crítica del poder oculto, o ha debilitado nuestra capacidad de defender una verdad compartida?',
        examples: [
          {
            en: 'Postmodern critique usefully exposes whose interests masquerade as neutrality, but suspicion cannot itself establish what is true.',
            native:
              'La crítica posmoderna revela de forma útil qué intereses se disfrazan de neutralidad, pero la sospecha por sí sola no puede establecer qué es verdadero.',
          },
          {
            en: 'When every claim is reduced to power, the critic’s own claim risks becoming another bid for dominance.',
            native:
              'Cuando toda afirmación se reduce al poder, la afirmación del propio crítico corre el riesgo de convertirse en otra apuesta por el dominio.',
          },
          {
            en: 'We can reject absolute foundations without pretending that evidence, coherence, and consequences are interchangeable.',
            native:
              'Podemos rechazar fundamentos absolutos sin fingir que la evidencia, la coherencia y las consecuencias son intercambiables.',
          },
        ],
      },
      zh: {
        word: '后现代主义',
        question: '后现代主义究竟强化了对隐蔽权力的批判，还是削弱了我们捍卫共同真理的能力？',
        examples: [
          {
            en: 'Postmodern critique usefully exposes whose interests masquerade as neutrality, but suspicion cannot itself establish what is true.',
            native: '后现代批判有效揭示了究竟是谁的利益伪装成中立，但怀疑本身并不能确立何为真实。',
          },
          {
            en: 'When every claim is reduced to power, the critic’s own claim risks becoming another bid for dominance.',
            native: '当一切主张都被还原为权力时，批评者自己的主张也可能沦为另一场争夺支配地位的行动。',
          },
          {
            en: 'We can reject absolute foundations without pretending that evidence, coherence, and consequences are interchangeable.',
            native: '我们可以拒绝绝对基础，却不必假装证据、连贯性与后果可以彼此替换。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'structuralism',
    questionText:
      'To what extent does structuralism explain human culture through relations that individuals neither see nor control?',
    translations: {
      te: {
        word: 'నిర్మాణవాదం',
        question: 'వ్యక్తులు చూడలేని, నియంత్రించలేని సంబంధాల ద్వారా మానవ సంస్కృతిని నిర్మాణవాదం ఎంతవరకు వివరించగలదు?',
        examples: [
          {
            en: 'Structuralism shifts attention from isolated symbols to the systems of difference that make symbols intelligible.',
            native:
              'నిర్మాణవాదం విడివిడిగా ఉన్న సంకేతాల నుంచి, ఆ సంకేతాలను అర్థవంతం చేసే భేదాల వ్యవస్థల వైపు దృష్టిని మళ్లిస్తుంది.',
          },
          {
            en: 'Its strength is revealing recurrent patterns; its danger is treating human agents as mere effects of an abstract code.',
            native:
              'పునరావృతమయ్యే నమూనాలను వెల్లడించడం దాని బలం; మానవ కర్తలను ఒక అమూర్త సంకేతవ్యవస్థ యొక్క కేవలం ఫలితాలుగా చూడటం దాని ప్రమాదం.',
          },
          {
            en: 'A structure can constrain what is thinkable without determining every thought that people actually have.',
            native:
              'ప్రజలు నిజంగా కలిగి ఉండే ప్రతి ఆలోచనను నిర్ణయించకుండానే, ఏది ఆలోచించదగినదో ఒక నిర్మాణం పరిమితం చేయగలదు.',
          },
        ],
      },
      hi: {
        word: 'संरचनावाद',
        question:
          'संरचनावाद उन संबंधों के माध्यम से मानव संस्कृति को किस हद तक समझाता है जिन्हें व्यक्ति न तो देख पाते हैं और न नियंत्रित कर पाते हैं?',
        examples: [
          {
            en: 'Structuralism shifts attention from isolated symbols to the systems of difference that make symbols intelligible.',
            native:
              'संरचनावाद ध्यान को अलग-अलग प्रतीकों से हटाकर उन भेद-व्यवस्थाओं पर ले जाता है जो प्रतीकों को अर्थवान बनाती हैं।',
          },
          {
            en: 'Its strength is revealing recurrent patterns; its danger is treating human agents as mere effects of an abstract code.',
            native:
              'बार-बार उभरने वाले प्रतिरूपों को उजागर करना इसकी शक्ति है; मानव कर्ताओं को किसी अमूर्त संकेत-तंत्र का मात्र प्रभाव मान लेना इसका खतरा है।',
          },
          {
            en: 'A structure can constrain what is thinkable without determining every thought that people actually have.',
            native:
              'कोई संरचना इस बात को सीमित कर सकती है कि क्या सोचा जा सकता है, बिना लोगों के हर वास्तविक विचार को निर्धारित किए।',
          },
        ],
      },
      es: {
        word: 'estructuralismo',
        question:
          '¿Hasta qué punto explica el estructuralismo la cultura humana mediante relaciones que los individuos ni ven ni controlan?',
        examples: [
          {
            en: 'Structuralism shifts attention from isolated symbols to the systems of difference that make symbols intelligible.',
            native:
              'El estructuralismo desplaza la atención de los símbolos aislados hacia los sistemas de diferencias que los vuelven inteligibles.',
          },
          {
            en: 'Its strength is revealing recurrent patterns; its danger is treating human agents as mere effects of an abstract code.',
            native:
              'Su fuerza consiste en revelar patrones recurrentes; su peligro, en tratar a los agentes humanos como meros efectos de un código abstracto.',
          },
          {
            en: 'A structure can constrain what is thinkable without determining every thought that people actually have.',
            native:
              'Una estructura puede limitar lo que resulta pensable sin determinar cada pensamiento que las personas tienen en realidad.',
          },
        ],
      },
      zh: {
        word: '结构主义',
        question: '结构主义在多大程度上能够通过个人既看不见也无法控制的关系来解释人类文化？',
        examples: [
          {
            en: 'Structuralism shifts attention from isolated symbols to the systems of difference that make symbols intelligible.',
            native: '结构主义把注意力从孤立的符号转向使符号能够被理解的差异系统。',
          },
          {
            en: 'Its strength is revealing recurrent patterns; its danger is treating human agents as mere effects of an abstract code.',
            native: '它的长处在于揭示反复出现的模式；它的危险则在于把人的能动主体仅仅视为抽象代码的产物。',
          },
          {
            en: 'A structure can constrain what is thinkable without determining every thought that people actually have.',
            native: '一种结构可以限制什么是可思考的，却不必决定人们实际产生的每一个想法。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'humanism',
    questionText: 'Can humanism sustain universal dignity without relying on religious or metaphysical foundations?',
    translations: {
      te: {
        word: 'మానవతావాదం',
        question: 'మతపరమైన లేదా అధిభౌతిక పునాదులపై ఆధారపడకుండా మానవతావాదం సార్వత్రిక గౌరవాన్ని నిలబెట్టగలదా?',
        examples: [
          {
            en: 'Human dignity may be a moral commitment we construct together rather than a fact discovered in nature.',
            native: 'మానవ గౌరవం ప్రకృతిలో కనుగొనబడిన వాస్తవం కాకుండా, మనం కలిసి నిర్మించుకునే నైతిక నిబద్ధత కావచ్చు.',
          },
          {
            en: 'A secular foundation is not necessarily a weak one; promises and laws derive force from collective recognition.',
            native:
              'లౌకిక పునాది తప్పనిసరిగా బలహీనమైనది కాదు; వాగ్దానాలు, చట్టాలు సమష్టి గుర్తింపు నుంచి శక్తిని పొందుతాయి.',
          },
          {
            en: 'Humanism fails its own standard whenever the category of the human is quietly narrowed to exclude inconvenient lives.',
            native:
              'అసౌకర్యంగా భావించే జీవితాలను మినహాయించేందుకు మానవుడు అనే వర్గాన్ని నిశ్శబ్దంగా కుదించినప్పుడల్లా మానవతావాదం తన సొంత ప్రమాణంలో విఫలమవుతుంది.',
          },
        ],
      },
      hi: {
        word: 'मानवतावाद',
        question: 'क्या मानवतावाद धार्मिक या आध्यात्मिक आधारों पर निर्भर हुए बिना सार्वभौमिक गरिमा को कायम रख सकता है?',
        examples: [
          {
            en: 'Human dignity may be a moral commitment we construct together rather than a fact discovered in nature.',
            native:
              'मानवीय गरिमा प्रकृति में खोजा गया कोई तथ्य होने के बजाय ऐसी नैतिक प्रतिबद्धता हो सकती है जिसे हम मिलकर रचते हैं।',
          },
          {
            en: 'A secular foundation is not necessarily a weak one; promises and laws derive force from collective recognition.',
            native:
              'धर्मनिरपेक्ष आधार अनिवार्य रूप से कमज़ोर नहीं होता; वादों और कानूनों को सामूहिक मान्यता से शक्ति मिलती है।',
          },
          {
            en: 'Humanism fails its own standard whenever the category of the human is quietly narrowed to exclude inconvenient lives.',
            native:
              'जब भी असुविधाजनक जीवनों को बाहर करने के लिए मनुष्य की श्रेणी को चुपचाप संकुचित किया जाता है, मानवतावाद अपने ही मानदंड पर विफल हो जाता है।',
          },
        ],
      },
      es: {
        word: 'humanismo',
        question:
          '¿Puede el humanismo sostener la dignidad universal sin apoyarse en fundamentos religiosos o metafísicos?',
        examples: [
          {
            en: 'Human dignity may be a moral commitment we construct together rather than a fact discovered in nature.',
            native:
              'La dignidad humana puede ser un compromiso moral que construimos juntos, en lugar de un hecho descubierto en la naturaleza.',
          },
          {
            en: 'A secular foundation is not necessarily a weak one; promises and laws derive force from collective recognition.',
            native:
              'Un fundamento secular no es necesariamente débil; las promesas y las leyes obtienen su fuerza del reconocimiento colectivo.',
          },
          {
            en: 'Humanism fails its own standard whenever the category of the human is quietly narrowed to exclude inconvenient lives.',
            native:
              'El humanismo incumple su propio criterio cada vez que se restringe discretamente la categoría de lo humano para excluir vidas incómodas.',
          },
        ],
      },
      zh: {
        word: '人文主义',
        question: '人文主义能否不依赖宗教或形而上学基础而维系普遍尊严？',
        examples: [
          {
            en: 'Human dignity may be a moral commitment we construct together rather than a fact discovered in nature.',
            native: '人的尊严或许不是在自然界中发现的事实，而是我们共同建构的一项道德承诺。',
          },
          {
            en: 'A secular foundation is not necessarily a weak one; promises and laws derive force from collective recognition.',
            native: '世俗基础并不必然薄弱；承诺与法律的力量来自集体认可。',
          },
          {
            en: 'Humanism fails its own standard whenever the category of the human is quietly narrowed to exclude inconvenient lives.',
            native: '每当人的范畴被悄然缩窄以排除那些令人不便的生命时，人文主义就违背了自己的标准。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'secularism',
    questionText:
      'Should secularism require public institutions to be neutral toward religion, or merely impartial among convictions?',
    translations: {
      te: {
        word: 'లౌకికవాదం',
        question:
          'ప్రజా సంస్థలు మతం పట్ల తటస్థంగా ఉండాలని లౌకికవాదం కోరాలా, లేక వివిధ విశ్వాసాల పట్ల నిష్పక్షపాతంగా ఉంటే సరిపోతుందా?',
        examples: [
          {
            en: 'Secular government should protect religious exercise while refusing to make citizenship depend on any creed.',
            native:
              'లౌకిక ప్రభుత్వం మతాచరణను రక్షిస్తూనే, పౌరసత్వాన్ని ఏ మతవిశ్వాసంపైనా ఆధారపడేలా చేయడాన్ని నిరాకరించాలి.',
          },
          {
            en: 'Neutrality is impossible if it means having no values, but impartiality can prevent one doctrine from monopolising power.',
            native:
              'ఏ విలువలూ లేకపోవడమే తటస్థతకు అర్థమైతే అది అసాధ్యం; అయితే నిష్పక్షపాతత్వం ఒకే సిద్ధాంతం అధికారాన్ని గుత్తాధిపత్యం చేయకుండా అడ్డుకోగలదు.',
          },
          {
            en: 'The hardest cases arise when private conscience collides with equal access to public rights and services.',
            native:
              'వ్యక్తిగత మనస్సాక్షి, ప్రజా హక్కులు మరియు సేవలకు సమాన ప్రాప్యతతో ఢీకొన్నప్పుడు అత్యంత క్లిష్టమైన సందర్భాలు తలెత్తుతాయి.',
          },
        ],
      },
      hi: {
        word: 'धर्मनिरपेक्षता',
        question:
          'क्या धर्मनिरपेक्षता को सार्वजनिक संस्थाओं से धर्म के प्रति तटस्थता की माँग करनी चाहिए, या केवल विभिन्न आस्थाओं के बीच निष्पक्षता की?',
        examples: [
          {
            en: 'Secular government should protect religious exercise while refusing to make citizenship depend on any creed.',
            native:
              'धर्मनिरपेक्ष सरकार को धार्मिक आचरण की रक्षा करनी चाहिए, साथ ही नागरिकता को किसी भी मत पर निर्भर बनाने से इनकार करना चाहिए।',
          },
          {
            en: 'Neutrality is impossible if it means having no values, but impartiality can prevent one doctrine from monopolising power.',
            native:
              'यदि तटस्थता का अर्थ किसी भी मूल्य का न होना है तो वह असंभव है, लेकिन निष्पक्षता किसी एक सिद्धांत को सत्ता पर एकाधिकार करने से रोक सकती है।',
          },
          {
            en: 'The hardest cases arise when private conscience collides with equal access to public rights and services.',
            native:
              'सबसे कठिन मामले तब सामने आते हैं जब निजी अंतरात्मा सार्वजनिक अधिकारों और सेवाओं तक समान पहुँच से टकराती है।',
          },
        ],
      },
      es: {
        word: 'secularismo',
        question:
          '¿Debería el secularismo exigir que las instituciones públicas sean neutrales ante la religión, o solo imparciales entre distintas convicciones?',
        examples: [
          {
            en: 'Secular government should protect religious exercise while refusing to make citizenship depend on any creed.',
            native:
              'Un gobierno secular debería proteger la práctica religiosa y, al mismo tiempo, negarse a hacer que la ciudadanía dependa de credo alguno.',
          },
          {
            en: 'Neutrality is impossible if it means having no values, but impartiality can prevent one doctrine from monopolising power.',
            native:
              'La neutralidad es imposible si significa carecer de valores, pero la imparcialidad puede impedir que una doctrina monopolice el poder.',
          },
          {
            en: 'The hardest cases arise when private conscience collides with equal access to public rights and services.',
            native:
              'Los casos más difíciles surgen cuando la conciencia privada choca con la igualdad de acceso a los derechos y servicios públicos.',
          },
        ],
      },
      zh: {
        word: '世俗主义',
        question: '世俗主义应要求公共机构对宗教保持中立，还是只需在各种信念之间做到公正无偏？',
        examples: [
          {
            en: 'Secular government should protect religious exercise while refusing to make citizenship depend on any creed.',
            native: '世俗政府应保护宗教实践，同时拒绝让公民身份取决于任何信条。',
          },
          {
            en: 'Neutrality is impossible if it means having no values, but impartiality can prevent one doctrine from monopolising power.',
            native: '如果中立意味着不持有任何价值观，那么它不可能实现；但公正无偏可以防止某种教义垄断权力。',
          },
          {
            en: 'The hardest cases arise when private conscience collides with equal access to public rights and services.',
            native: '最棘手的情形出现在个人良知与平等获得公共权利和服务的要求发生冲突之时。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'pluralism',
    questionText:
      'How can pluralism respect deep moral disagreement without sliding into indifference or fragmentation?',
    translations: {
      te: {
        word: 'బహుళత్వవాదం',
        question: 'లోతైన నైతిక విభేదాన్ని నిర్లక్ష్యం లేదా విచ్ఛిన్నతలోకి జారకుండా బహుళత్వవాదం ఎలా గౌరవించగలదు?',
        examples: [
          {
            en: 'Pluralism asks citizens to coexist without pretending that their ultimate values can always be reconciled.',
            native:
              'తమ అంతిమ విలువలను ఎల్లప్పుడూ సమన్వయపరచవచ్చని నటించకుండా సహజీవనం చేయాలని బహుళత్వవాదం పౌరులను కోరుతుంది.',
          },
          {
            en: 'Tolerance is not approval; it is a political discipline bounded by the equal freedom of others.',
            native: 'సహనం ఆమోదం కాదు; అది ఇతరుల సమాన స్వేచ్ఛతో పరిమితమైన రాజకీయ క్రమశిక్షణ.',
          },
          {
            en: 'A plural society needs shared procedures robust enough to contain disagreement but flexible enough to remain legitimate.',
            native:
              'విభేదాన్ని నిర్వహించగలంత దృఢమైనవీ, చట్టబద్ధతను నిలుపుకునేంత అనువైనవీ అయిన ఉమ్మడి ప్రక్రియలు బహుళ సమాజానికి అవసరం.',
          },
        ],
      },
      hi: {
        word: 'बहुलतावाद',
        question: 'बहुलतावाद गहरी नैतिक असहमति का सम्मान करते हुए उदासीनता या विखंडन में फिसलने से कैसे बच सकता है?',
        examples: [
          {
            en: 'Pluralism asks citizens to coexist without pretending that their ultimate values can always be reconciled.',
            native:
              'बहुलतावाद नागरिकों से यह दिखावा किए बिना साथ रहने को कहता है कि उनके अंतिम मूल्यों में हमेशा सामंजस्य बैठाया जा सकता है।',
          },
          {
            en: 'Tolerance is not approval; it is a political discipline bounded by the equal freedom of others.',
            native: 'सहिष्णुता स्वीकृति नहीं है; वह दूसरों की समान स्वतंत्रता से सीमाबद्ध एक राजनीतिक अनुशासन है।',
          },
          {
            en: 'A plural society needs shared procedures robust enough to contain disagreement but flexible enough to remain legitimate.',
            native:
              'एक बहुल समाज को ऐसी साझा प्रक्रियाएँ चाहिए जो असहमति को सँभालने के लिए पर्याप्त मज़बूत और वैध बने रहने के लिए पर्याप्त लचीली हों।',
          },
        ],
      },
      es: {
        word: 'pluralismo',
        question:
          '¿Cómo puede el pluralismo respetar un profundo desacuerdo moral sin caer en la indiferencia o la fragmentación?',
        examples: [
          {
            en: 'Pluralism asks citizens to coexist without pretending that their ultimate values can always be reconciled.',
            native:
              'El pluralismo pide a la ciudadanía que conviva sin fingir que sus valores últimos siempre pueden conciliarse.',
          },
          {
            en: 'Tolerance is not approval; it is a political discipline bounded by the equal freedom of others.',
            native:
              'La tolerancia no es aprobación; es una disciplina política limitada por la libertad igual de los demás.',
          },
          {
            en: 'A plural society needs shared procedures robust enough to contain disagreement but flexible enough to remain legitimate.',
            native:
              'Una sociedad plural necesita procedimientos compartidos lo bastante sólidos para encauzar el desacuerdo y lo bastante flexibles para conservar su legitimidad.',
          },
        ],
      },
      zh: {
        word: '多元主义',
        question: '多元主义如何既尊重深刻的道德分歧，又不滑向冷漠或社会割裂？',
        examples: [
          {
            en: 'Pluralism asks citizens to coexist without pretending that their ultimate values can always be reconciled.',
            native: '多元主义要求公民共同生活，却不假装他们的终极价值总能彼此调和。',
          },
          {
            en: 'Tolerance is not approval; it is a political discipline bounded by the equal freedom of others.',
            native: '宽容并非赞同，而是一种以他人的平等自由为边界的政治自律。',
          },
          {
            en: 'A plural society needs shared procedures robust enough to contain disagreement but flexible enough to remain legitimate.',
            native: '多元社会需要一套共同程序，既足够稳健以容纳分歧，又足够灵活以维持正当性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'sovereignty',
    questionText: 'Is national sovereignty still defensible when crises and supply chains routinely cross borders?',
    translations: {
      te: {
        word: 'సార్వభౌమాధికారం',
        question:
          'సంక్షోభాలు, సరఫరా గొలుసులు తరచుగా సరిహద్దులను దాటుతున్నప్పుడు జాతీయ సార్వభౌమాధికారం ఇప్పటికీ సమర్థనీయమేనా?',
        examples: [
          {
            en: 'Sovereignty remains vital for democratic accountability, yet absolute autonomy is fiction in an interdependent world.',
            native:
              'ప్రజాస్వామ్య జవాబుదారీతనానికి సార్వభౌమాధికారం ఇప్పటికీ కీలకం; అయితే పరస్పరాధారిత ప్రపంచంలో సంపూర్ణ స్వయంప్రతిపత్తి ఒక కల్పన మాత్రమే.',
          },
          {
            en: 'Climate change exposes the moral weakness of borders: emissions are territorial, but their consequences are not.',
            native:
              'వాతావరణ మార్పు సరిహద్దుల నైతిక బలహీనతను బయటపెడుతుంది: ఉద్గారాలు ఒక భూభాగంలో పుడతాయి, కానీ వాటి పరిణామాలు అక్కడికే పరిమితం కావు.',
          },
          {
            en: 'International cooperation becomes legitimate when states share authority transparently rather than surrendering it without consent.',
            native:
              'దేశాలు సమ్మతి లేకుండా అధికారాన్ని వదులుకోవడం కాకుండా పారదర్శకంగా పంచుకున్నప్పుడు అంతర్జాతీయ సహకారానికి చట్టబద్ధత లభిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'संप्रभुता',
        question:
          'जब संकट और आपूर्ति शृंखलाएँ नियमित रूप से सीमाएँ पार करती हैं, तब क्या राष्ट्रीय संप्रभुता अब भी बचाव योग्य है?',
        examples: [
          {
            en: 'Sovereignty remains vital for democratic accountability, yet absolute autonomy is fiction in an interdependent world.',
            native:
              'लोकतांत्रिक जवाबदेही के लिए संप्रभुता अब भी अत्यंत आवश्यक है, फिर भी परस्पर निर्भर विश्व में पूर्ण स्वायत्तता एक कल्पना है।',
          },
          {
            en: 'Climate change exposes the moral weakness of borders: emissions are territorial, but their consequences are not.',
            native:
              'जलवायु परिवर्तन सीमाओं की नैतिक कमजोरी उजागर करता है: उत्सर्जन किसी भूभाग में होता है, लेकिन उसके परिणाम वहीं तक सीमित नहीं रहते।',
          },
          {
            en: 'International cooperation becomes legitimate when states share authority transparently rather than surrendering it without consent.',
            native:
              'अंतरराष्ट्रीय सहयोग तब वैध बनता है जब राज्य बिना सहमति सत्ता त्यागने के बजाय उसे पारदर्शी ढंग से साझा करते हैं।',
          },
        ],
      },
      es: {
        word: 'soberanía',
        question:
          '¿Sigue siendo defendible la soberanía nacional cuando las crisis y las cadenas de suministro atraviesan fronteras habitualmente?',
        examples: [
          {
            en: 'Sovereignty remains vital for democratic accountability, yet absolute autonomy is fiction in an interdependent world.',
            native:
              'La soberanía sigue siendo vital para la rendición de cuentas democrática, aunque la autonomía absoluta es una ficción en un mundo interdependiente.',
          },
          {
            en: 'Climate change exposes the moral weakness of borders: emissions are territorial, but their consequences are not.',
            native:
              'El cambio climático revela la debilidad moral de las fronteras: las emisiones son territoriales, pero sus consecuencias no lo son.',
          },
          {
            en: 'International cooperation becomes legitimate when states share authority transparently rather than surrendering it without consent.',
            native:
              'La cooperación internacional se vuelve legítima cuando los Estados comparten autoridad con transparencia en lugar de cederla sin consentimiento.',
          },
        ],
      },
      zh: {
        word: '主权',
        question: '当危机与供应链经常跨越国界时，国家主权是否仍然具有可辩护性？',
        examples: [
          {
            en: 'Sovereignty remains vital for democratic accountability, yet absolute autonomy is fiction in an interdependent world.',
            native: '主权对于民主问责仍然至关重要，然而在相互依存的世界里，绝对自主只是一种虚构。',
          },
          {
            en: 'Climate change exposes the moral weakness of borders: emissions are territorial, but their consequences are not.',
            native: '气候变化暴露了边界在道德上的局限：排放发生在特定疆域内，其后果却不受疆域限制。',
          },
          {
            en: 'International cooperation becomes legitimate when states share authority transparently rather than surrendering it without consent.',
            native: '当国家以透明方式分享权力，而不是未经同意便将其交出时，国际合作才获得正当性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'legitimacy',
    questionText:
      'What makes political authority legitimate when elections, expertise, and public consent point in different directions?',
    translations: {
      te: {
        word: 'చట్టబద్ధత',
        question:
          'ఎన్నికలు, నిపుణుల జ్ఞానం, ప్రజా సమ్మతి వేర్వేరు దిశలను సూచించినప్పుడు రాజకీయ అధికారానికి చట్టబద్ధతను ఇచ్చేది ఏమిటి?',
        examples: [
          {
            en: 'Elections confer a mandate, but legality and continuing accountability determine how far that mandate can reach.',
            native:
              'ఎన్నికలు ఒక ప్రజాదేశాన్ని ఇస్తాయి; అయితే ఆ అధికారం ఎంతవరకు విస్తరించగలదో చట్టానుగుణత, నిరంతర జవాబుదారీతనం నిర్ణయిస్తాయి.',
          },
          {
            en: 'Expertise can justify a policy recommendation without granting experts the right to silence affected citizens.',
            native:
              'నిపుణుల జ్ఞానం ఒక విధాన సిఫారసును సమర్థించగలదు; కానీ దాని ప్రభావానికి లోనయ్యే పౌరులను మౌనంగా ఉంచే హక్కును నిపుణులకు ఇవ్వదు.',
          },
          {
            en: 'Legitimacy erodes when institutions demand obedience while concealing the reasons and interests behind their decisions.',
            native:
              'సంస్థలు తమ నిర్ణయాల వెనుక కారణాలు, ప్రయోజనాలను దాచిపెట్టి విధేయతను కోరినప్పుడు వాటి చట్టబద్ధత క్షీణిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'वैधता',
        question:
          'जब चुनाव, विशेषज्ञता और जन-सहमति अलग-अलग दिशाओं की ओर संकेत करें, तब राजनीतिक सत्ता को वैध क्या बनाता है?',
        examples: [
          {
            en: 'Elections confer a mandate, but legality and continuing accountability determine how far that mandate can reach.',
            native:
              'चुनाव जनादेश देते हैं, लेकिन कानूनसम्मतता और निरंतर जवाबदेही तय करती हैं कि वह जनादेश कितनी दूर तक जा सकता है।',
          },
          {
            en: 'Expertise can justify a policy recommendation without granting experts the right to silence affected citizens.',
            native:
              'विशेषज्ञता किसी नीतिगत सुझाव को उचित ठहरा सकती है, पर इससे विशेषज्ञों को प्रभावित नागरिकों को चुप कराने का अधिकार नहीं मिल जाता।',
          },
          {
            en: 'Legitimacy erodes when institutions demand obedience while concealing the reasons and interests behind their decisions.',
            native:
              'जब संस्थाएँ अपने निर्णयों के पीछे के कारण और हित छिपाते हुए आज्ञापालन माँगती हैं, तब उनकी वैधता क्षीण होती है।',
          },
        ],
      },
      es: {
        word: 'legitimidad',
        question:
          '¿Qué hace legítima a la autoridad política cuando las elecciones, el conocimiento experto y el consentimiento público apuntan en direcciones distintas?',
        examples: [
          {
            en: 'Elections confer a mandate, but legality and continuing accountability determine how far that mandate can reach.',
            native:
              'Las elecciones confieren un mandato, pero la legalidad y la rendición de cuentas continua determinan hasta dónde puede llegar.',
          },
          {
            en: 'Expertise can justify a policy recommendation without granting experts the right to silence affected citizens.',
            native:
              'El conocimiento experto puede justificar una recomendación de política pública sin otorgar a los expertos el derecho de silenciar a la ciudadanía afectada.',
          },
          {
            en: 'Legitimacy erodes when institutions demand obedience while concealing the reasons and interests behind their decisions.',
            native:
              'La legitimidad se erosiona cuando las instituciones exigen obediencia y ocultan las razones y los intereses que hay detrás de sus decisiones.',
          },
        ],
      },
      zh: {
        word: '正当性',
        question: '当选举、专业知识与公众同意指向不同方向时，什么能使政治权威获得正当性？',
        examples: [
          {
            en: 'Elections confer a mandate, but legality and continuing accountability determine how far that mandate can reach.',
            native: '选举赋予执政授权，但合法性与持续问责决定了这项授权究竟能够延伸多远。',
          },
          {
            en: 'Expertise can justify a policy recommendation without granting experts the right to silence affected citizens.',
            native: '专业知识可以为一项政策建议提供依据，却不能因此赋予专家让受影响公民噤声的权利。',
          },
          {
            en: 'Legitimacy erodes when institutions demand obedience while concealing the reasons and interests behind their decisions.',
            native: '当制度一边要求服从，一边掩盖其决策背后的理由与利益时，正当性就会遭到侵蚀。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'hegemony',
    questionText:
      'How does cultural hegemony make historically contingent values appear natural and universally shared?',
    translations: {
      te: {
        word: 'సాంస్కృతిక ఆధిపత్యం',
        question:
          'చారిత్రక పరిస్థితుల వల్ల ఏర్పడిన విలువలు సహజమైనవిగా, విశ్వవ్యాప్తంగా అందరూ పంచుకునేవిగా సాంస్కృతిక ఆధిపత్యం ఎలా కనిపించేలా చేస్తుంది?',
        examples: [
          {
            en: 'Hegemony is most durable when dominated groups participate in reproducing the assumptions that constrain them.',
            native:
              'ఆధిపత్యానికి లోనైన వర్గాలే తమను పరిమితం చేసే ఊహలను తిరిగి ఉత్పత్తి చేయడంలో పాల్గొన్నప్పుడు ఆ ఆధిపత్యం అత్యంత దీర్ఘకాలం నిలుస్తుంది.',
          },
          {
            en: 'Popular culture can normalize a social hierarchy without issuing an explicit command in its defense.',
            native:
              'ప్రజాదరణ పొందిన సంస్కృతి ఒక సామాజిక శ్రేణీకరణను సమర్థిస్తూ స్పష్టమైన ఆదేశమేదీ ఇవ్వకుండానే దానిని సాధారణమైనదిగా మార్చగలదు.',
          },
          {
            en: 'Counter-hegemonic movements succeed by building a credible common sense, not merely by exposing elite interests.',
            native:
              'ప్రతిఆధిపత్య ఉద్యమాలు కేవలం ఉన్నత వర్గాల ప్రయోజనాలను బయటపెట్టడం వల్ల కాకుండా, నమ్మదగిన సామూహిక అవగాహనను నిర్మించడం వల్ల విజయం సాధిస్తాయి.',
          },
        ],
      },
      hi: {
        word: 'सांस्कृतिक वर्चस्व',
        question:
          'सांस्कृतिक वर्चस्व ऐतिहासिक परिस्थितियों से बने मूल्यों को स्वाभाविक और सार्वभौमिक रूप से साझा किए जाने वाले मूल्यों जैसा कैसे दिखाता है?',
        examples: [
          {
            en: 'Hegemony is most durable when dominated groups participate in reproducing the assumptions that constrain them.',
            native:
              'वर्चस्व तब सबसे टिकाऊ होता है जब अधीनस्थ समूह स्वयं उन धारणाओं को दोबारा पैदा करने में भाग लेते हैं जो उन्हें सीमित करती हैं।',
          },
          {
            en: 'Popular culture can normalize a social hierarchy without issuing an explicit command in its defense.',
            native:
              'लोकप्रिय संस्कृति किसी सामाजिक पदानुक्रम के समर्थन में स्पष्ट आदेश दिए बिना ही उसे सामान्य बना सकती है।',
          },
          {
            en: 'Counter-hegemonic movements succeed by building a credible common sense, not merely by exposing elite interests.',
            native:
              'वर्चस्व-विरोधी आंदोलन केवल अभिजात हितों को उजागर करके नहीं, बल्कि एक विश्वसनीय साझा समझ निर्मित करके सफल होते हैं।',
          },
        ],
      },
      es: {
        word: 'hegemonía cultural',
        question:
          '¿Cómo consigue la hegemonía cultural que valores históricamente contingentes parezcan naturales y universalmente compartidos?',
        examples: [
          {
            en: 'Hegemony is most durable when dominated groups participate in reproducing the assumptions that constrain them.',
            native:
              'La hegemonía es más duradera cuando los grupos dominados participan en la reproducción de los supuestos que los limitan.',
          },
          {
            en: 'Popular culture can normalize a social hierarchy without issuing an explicit command in its defense.',
            native:
              'La cultura popular puede normalizar una jerarquía social sin emitir una orden explícita en su defensa.',
          },
          {
            en: 'Counter-hegemonic movements succeed by building a credible common sense, not merely by exposing elite interests.',
            native:
              'Los movimientos contrahegemónicos triunfan al construir un sentido común creíble, no solo al revelar los intereses de las élites.',
          },
        ],
      },
      zh: {
        word: '文化霸权',
        question: '文化霸权如何使具有特定历史条件的价值观显得自然，并仿佛为所有人共同接受？',
        examples: [
          {
            en: 'Hegemony is most durable when dominated groups participate in reproducing the assumptions that constrain them.',
            native: '当受支配群体也参与复制那些限制自身的假设时，霸权最为持久。',
          },
          {
            en: 'Popular culture can normalize a social hierarchy without issuing an explicit command in its defense.',
            native: '大众文化无需发出明确的维护命令，也能使某种社会等级秩序显得理所当然。',
          },
          {
            en: 'Counter-hegemonic movements succeed by building a credible common sense, not merely by exposing elite interests.',
            native: '反霸权运动的成功有赖于构建可信的共同认知，而不只是揭露精英利益。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'ideology',
    questionText: 'Can anyone critique ideology from a position entirely free of ideological commitments?',
    translations: {
      te: {
        word: 'భావజాలం',
        question: 'భావజాలపరమైన నిబద్ధతలు ఏమాత్రం లేని స్థానం నుంచి ఎవరైనా భావజాలాన్ని విమర్శించగలరా?',
        examples: [
          {
            en: 'Ideology organizes perception by determining which facts seem relevant before argument even begins.',
            native:
              'వాదన మొదలుకాకముందే ఏ వాస్తవాలు సంబంధితమైనవిగా కనిపించాలో నిర్ణయించడం ద్వారా భావజాలం మన అవగాహనను క్రమబద్ధీకరిస్తుంది.',
          },
          {
            en: "Calling one's own framework neutral often conceals the historical interests embedded within it.",
            native:
              'తమ సొంత దృక్కోణాన్ని తటస్థమైనదిగా పేర్కొనడం, అందులో నిక్షిప్తమైన చారిత్రక ప్రయోజనాలను తరచుగా దాచిపెడుతుంది.',
          },
          {
            en: 'Ideological critique becomes reflexive when it subjects its own categories to the scrutiny it applies elsewhere.',
            native:
              'ఇతర వాటిపై ప్రయోగించే పరిశీలనకే తన సొంత వర్గీకరణలను కూడా లోబరచినప్పుడు భావజాల విమర్శ ఆత్మపరిశీలనాత్మకంగా మారుతుంది.',
          },
        ],
      },
      hi: {
        word: 'विचारधारा',
        question: 'क्या कोई व्यक्ति वैचारिक प्रतिबद्धताओं से पूरी तरह मुक्त स्थिति से विचारधारा की आलोचना कर सकता है?',
        examples: [
          {
            en: 'Ideology organizes perception by determining which facts seem relevant before argument even begins.',
            native:
              'तर्क आरंभ होने से पहले ही कौन-से तथ्य प्रासंगिक लगेंगे, यह निर्धारित करके विचारधारा हमारी अनुभूति को व्यवस्थित करती है।',
          },
          {
            en: "Calling one's own framework neutral often conceals the historical interests embedded within it.",
            native: 'अपने ही ढाँचे को तटस्थ कहना अक्सर उसमें निहित ऐतिहासिक हितों को छिपा देता है।',
          },
          {
            en: 'Ideological critique becomes reflexive when it subjects its own categories to the scrutiny it applies elsewhere.',
            native:
              'वैचारिक आलोचना तब आत्मपरीक्षणशील बनती है जब वह अपनी श्रेणियों को भी उसी जाँच के अधीन करती है जो वह अन्यत्र लागू करती है।',
          },
        ],
      },
      es: {
        word: 'ideología',
        question:
          '¿Puede alguien criticar la ideología desde una posición completamente libre de compromisos ideológicos?',
        examples: [
          {
            en: 'Ideology organizes perception by determining which facts seem relevant before argument even begins.',
            native:
              'La ideología organiza la percepción al determinar qué hechos parecen pertinentes antes incluso de que comience la argumentación.',
          },
          {
            en: "Calling one's own framework neutral often conceals the historical interests embedded within it.",
            native:
              'Calificar de neutral el propio marco suele ocultar los intereses históricos que lleva incorporados.',
          },
          {
            en: 'Ideological critique becomes reflexive when it subjects its own categories to the scrutiny it applies elsewhere.',
            native:
              'La crítica ideológica se vuelve reflexiva cuando somete sus propias categorías al escrutinio que aplica en otros ámbitos.',
          },
        ],
      },
      zh: {
        word: '意识形态',
        question: '任何人能否站在完全不受意识形态承诺影响的立场上批判意识形态？',
        examples: [
          {
            en: 'Ideology organizes perception by determining which facts seem relevant before argument even begins.',
            native: '意识形态在论证开始之前就决定哪些事实显得相关，从而组织人们的认知。',
          },
          {
            en: "Calling one's own framework neutral often conceals the historical interests embedded within it.",
            native: '把自己的框架称为中立，往往会掩盖其中蕴含的历史利益。',
          },
          {
            en: 'Ideological critique becomes reflexive when it subjects its own categories to the scrutiny it applies elsewhere.',
            native: '当意识形态批判也用审视他者的标准检验自身范畴时，它才具有反思性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'discourse',
    questionText:
      'In what ways does public discourse shape the subjects and possibilities it claims merely to describe?',
    translations: {
      te: {
        word: 'ప్రజా సంవాదం',
        question: 'కేవలం వర్ణిస్తున్నానని చెప్పుకునే అంశాలను, అవకాశాలను ప్రజా సంవాదం ఏ విధాలుగా రూపుదిద్దుతుంది?',
        examples: [
          {
            en: 'Discourse does not simply name reality; its classifications distribute authority, visibility, and credibility.',
            native:
              'సంవాదం వాస్తవానికి కేవలం పేర్లు పెట్టదు; దాని వర్గీకరణలు అధికారం, దృశ్యమానత, విశ్వసనీయతలను పంపిణీ చేస్తాయి.',
          },
          {
            en: 'A medical vocabulary can enable treatment while simultaneously narrowing how suffering is understood.',
            native: 'వైద్య పరిభాష చికిత్సను సాధ్యం చేస్తూనే, బాధను అర్థం చేసుకునే విధానాన్ని ఏకకాలంలో పరిమితం చేయగలదు.',
          },
          {
            en: 'Changing the terms of debate may transform political possibility more profoundly than winning within the old terms.',
            native:
              'పాత నిబంధనల పరిధిలో గెలవడం కంటే చర్చా పదజాలాన్ని మార్చడం రాజకీయ అవకాశాలను మరింత మూలభూతంగా పరివర్తితం చేయవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'जन-विमर्श',
        question:
          'जन-विमर्श उन विषयों और संभावनाओं को किन तरीकों से आकार देता है जिनका वह केवल वर्णन करने का दावा करता है?',
        examples: [
          {
            en: 'Discourse does not simply name reality; its classifications distribute authority, visibility, and credibility.',
            native:
              'विमर्श केवल वास्तविकता को नाम नहीं देता; उसकी श्रेणियाँ अधिकार, दृश्यता और विश्वसनीयता का वितरण करती हैं।',
          },
          {
            en: 'A medical vocabulary can enable treatment while simultaneously narrowing how suffering is understood.',
            native:
              'चिकित्सकीय शब्दावली उपचार को संभव बनाते हुए पीड़ा को समझने के तरीकों को उसी समय सीमित भी कर सकती है।',
          },
          {
            en: 'Changing the terms of debate may transform political possibility more profoundly than winning within the old terms.',
            native:
              'पुरानी शर्तों पर बहस जीतने की तुलना में बहस की शर्तें बदलना राजनीतिक संभावनाओं को कहीं अधिक गहराई से रूपांतरित कर सकता है।',
          },
        ],
      },
      es: {
        word: 'discurso público',
        question:
          '¿De qué maneras moldea el discurso público los sujetos y las posibilidades que afirma limitarse a describir?',
        examples: [
          {
            en: 'Discourse does not simply name reality; its classifications distribute authority, visibility, and credibility.',
            native:
              'El discurso no se limita a nombrar la realidad; sus clasificaciones distribuyen autoridad, visibilidad y credibilidad.',
          },
          {
            en: 'A medical vocabulary can enable treatment while simultaneously narrowing how suffering is understood.',
            native:
              'Un vocabulario médico puede facilitar el tratamiento y, al mismo tiempo, restringir la manera en que se entiende el sufrimiento.',
          },
          {
            en: 'Changing the terms of debate may transform political possibility more profoundly than winning within the old terms.',
            native:
              'Cambiar los términos del debate puede transformar la posibilidad política más profundamente que vencer dentro de los términos anteriores.',
          },
        ],
      },
      zh: {
        word: '公共话语',
        question: '公共话语声称自己只是在描述对象和可能性，但它实际上通过哪些方式塑造了二者？',
        examples: [
          {
            en: 'Discourse does not simply name reality; its classifications distribute authority, visibility, and credibility.',
            native: '话语不只是为现实命名；它的分类也在分配权威、可见性与可信度。',
          },
          {
            en: 'A medical vocabulary can enable treatment while simultaneously narrowing how suffering is understood.',
            native: '医学词汇可以让治疗成为可能，同时也会收窄人们理解痛苦的方式。',
          },
          {
            en: 'Changing the terms of debate may transform political possibility more profoundly than winning within the old terms.',
            native: '改变辩论所用的概念框架，可能比在旧框架内取胜更深刻地改变政治可能性。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'narrative',
    questionText:
      'When does a unifying national narrative create solidarity, and when does it become an instrument of exclusion?',
    translations: {
      te: {
        word: 'జాతీయ కథనం',
        question: 'ఏకీకృత జాతీయ కథనం ఎప్పుడు సంఘీభావాన్ని సృష్టిస్తుంది, ఎప్పుడు అది బహిష్కరణ సాధనంగా మారుతుంది?',
        examples: [
          {
            en: 'Narratives connect scattered events by assigning causes, protagonists, and moral significance.',
            native:
              'కారణాలు, ప్రధాన పాత్రలు, నైతిక ప్రాముఖ్యతను నిర్దేశించడం ద్వారా కథనాలు విడివిడిగా ఉన్న సంఘటనలను అనుసంధానిస్తాయి.',
          },
          {
            en: 'A shared story can sustain collective sacrifice, yet its silences may erase those who paid the highest price.',
            native:
              'ఒక ఉమ్మడి కథ సామూహిక త్యాగాన్ని నిలబెట్టగలదు; అయితే అందులో చెప్పకుండా వదిలేసిన విషయాలు అత్యధిక మూల్యం చెల్లించినవారినే చరిత్ర నుంచి చెరిపివేయవచ్చు.',
          },
          {
            en: 'Responsible remembrance preserves narrative coherence without forcing contradictory experiences into artificial consensus.',
            native:
              'బాధ్యతాయుతమైన స్మరణ పరస్పర విరుద్ధ అనుభవాలను కృత్రిమ ఏకాభిప్రాయంలోకి బలవంతంగా నెట్టకుండా కథన సమన్వయాన్ని కాపాడుతుంది.',
          },
        ],
      },
      hi: {
        word: 'राष्ट्रीय आख्यान',
        question: 'एकीकृत राष्ट्रीय आख्यान कब एकजुटता पैदा करता है और कब वह बहिष्कार का साधन बन जाता है?',
        examples: [
          {
            en: 'Narratives connect scattered events by assigning causes, protagonists, and moral significance.',
            native: 'आख्यान कारण, नायक और नैतिक महत्त्व निर्धारित करके बिखरी हुई घटनाओं को आपस में जोड़ते हैं।',
          },
          {
            en: 'A shared story can sustain collective sacrifice, yet its silences may erase those who paid the highest price.',
            native:
              'एक साझा कहानी सामूहिक त्याग को बनाए रख सकती है, फिर भी उसकी चुप्पियाँ उन लोगों को मिटा सकती हैं जिन्होंने सबसे बड़ी कीमत चुकाई।',
          },
          {
            en: 'Responsible remembrance preserves narrative coherence without forcing contradictory experiences into artificial consensus.',
            native:
              'जिम्मेदार स्मरण परस्पर विरोधी अनुभवों को कृत्रिम सहमति में ढाले बिना आख्यान की सुसंगति बनाए रखता है।',
          },
        ],
      },
      es: {
        word: 'narrativa nacional',
        question:
          '¿Cuándo crea solidaridad una narrativa nacional unificadora y cuándo se convierte en un instrumento de exclusión?',
        examples: [
          {
            en: 'Narratives connect scattered events by assigning causes, protagonists, and moral significance.',
            native:
              'Las narrativas conectan acontecimientos dispersos al asignarles causas, protagonistas y significado moral.',
          },
          {
            en: 'A shared story can sustain collective sacrifice, yet its silences may erase those who paid the highest price.',
            native:
              'Un relato compartido puede sostener el sacrificio colectivo, pero sus silencios pueden borrar a quienes pagaron el precio más alto.',
          },
          {
            en: 'Responsible remembrance preserves narrative coherence without forcing contradictory experiences into artificial consensus.',
            native:
              'Una memoria responsable conserva la coherencia narrativa sin forzar experiencias contradictorias a encajar en un consenso artificial.',
          },
        ],
      },
      zh: {
        word: '国家叙事',
        question: '统一的国家叙事何时能够凝聚团结，何时又会成为排斥他者的工具？',
        examples: [
          {
            en: 'Narratives connect scattered events by assigning causes, protagonists, and moral significance.',
            native: '叙事通过赋予因果关系、主角身份与道德意义，将零散的事件连接起来。',
          },
          {
            en: 'A shared story can sustain collective sacrifice, yet its silences may erase those who paid the highest price.',
            native: '共同故事能够支撑集体牺牲，但其中的沉默也可能抹去那些付出最大代价的人。',
          },
          {
            en: 'Responsible remembrance preserves narrative coherence without forcing contradictory experiences into artificial consensus.',
            native: '负责任的纪念既维持叙事的连贯性，也不把相互矛盾的经验强行塞进虚假的共识。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'objectivity',
    questionText:
      'Is objectivity best understood as freedom from perspective, or as a disciplined method for testing perspectives against one another?',
    translations: {
      te: {
        word: 'నిష్పాక్షికత',
        question:
          'నిష్పాక్షికతను ఏ దృక్కోణమూ లేకపోవడంగా అర్థం చేసుకోవాలా, లేక దృక్కోణాలను పరస్పరం పరీక్షించే క్రమబద్ధమైన పద్ధతిగా అర్థం చేసుకోవాలా?',
        examples: [
          {
            en: 'Objectivity requires procedures that make evidence contestable, not an impossible absence of human judgment.',
            native:
              'నిష్పాక్షికతకు మానవ విచక్షణ అసలు లేకపోవడం అనే అసాధ్య స్థితి కాదు, సాక్ష్యాన్ని సవాలు చేయగలిగే ప్రక్రియలు అవసరం.',
          },
          {
            en: 'Diverse investigators can expose background assumptions that a homogeneous community mistakes for neutral observation.',
            native: 'సజాతీయ పరిశోధక సమూహం తటస్థ పరిశీలనగా పొరబడే నేపథ్య ఊహలను విభిన్న పరిశోధకులు బయటపెట్టగలరు.',
          },
          {
            en: 'A claim becomes more reliable when it survives transparent criticism from people positioned to detect different errors.',
            native:
              'వేర్వేరు పొరపాట్లను గుర్తించగల స్థానాల్లో ఉన్న వ్యక్తుల పారదర్శక విమర్శను తట్టుకున్నప్పుడు ఒక వాదన మరింత విశ్వసనీయంగా మారుతుంది.',
          },
        ],
      },
      hi: {
        word: 'वस्तुनिष्ठता',
        question:
          'क्या वस्तुनिष्ठता को किसी भी दृष्टिकोण से मुक्ति के रूप में समझना बेहतर है, या दृष्टिकोणों को परस्पर परखने की अनुशासित पद्धति के रूप में?',
        examples: [
          {
            en: 'Objectivity requires procedures that make evidence contestable, not an impossible absence of human judgment.',
            native:
              'वस्तुनिष्ठता के लिए ऐसी प्रक्रियाएँ चाहिए जो साक्ष्य को चुनौती के लिए खुला रखें, न कि मानवीय विवेक का असंभव अभाव।',
          },
          {
            en: 'Diverse investigators can expose background assumptions that a homogeneous community mistakes for neutral observation.',
            native:
              'विविध शोधकर्ता उन पृष्ठभूमिगत मान्यताओं को उजागर कर सकते हैं जिन्हें एकरूप समुदाय तटस्थ अवलोकन समझ बैठता है।',
          },
          {
            en: 'A claim becomes more reliable when it survives transparent criticism from people positioned to detect different errors.',
            native:
              'कोई दावा तब अधिक विश्वसनीय बनता है जब वह अलग-अलग त्रुटियाँ पहचान सकने की स्थिति वाले लोगों की पारदर्शी आलोचना पर खरा उतरता है।',
          },
        ],
      },
      es: {
        word: 'objetividad',
        question:
          '¿Conviene entender la objetividad como ausencia de perspectiva o como un método disciplinado para contrastar unas perspectivas con otras?',
        examples: [
          {
            en: 'Objectivity requires procedures that make evidence contestable, not an impossible absence of human judgment.',
            native:
              'La objetividad exige procedimientos que permitan cuestionar la evidencia, no una ausencia imposible de juicio humano.',
          },
          {
            en: 'Diverse investigators can expose background assumptions that a homogeneous community mistakes for neutral observation.',
            native:
              'Un grupo diverso de investigadores puede revelar supuestos de fondo que una comunidad homogénea confunde con observación neutral.',
          },
          {
            en: 'A claim becomes more reliable when it survives transparent criticism from people positioned to detect different errors.',
            native:
              'Una afirmación se vuelve más fiable cuando resiste la crítica transparente de personas situadas para detectar errores distintos.',
          },
        ],
      },
      zh: {
        word: '客观性',
        question: '客观性应被理解为摆脱一切视角，还是一种让不同视角相互检验的严谨方法？',
        examples: [
          {
            en: 'Objectivity requires procedures that make evidence contestable, not an impossible absence of human judgment.',
            native: '客观性需要让证据可以受到质疑的程序，而不是要求人类判断以不可能的方式彻底缺席。',
          },
          {
            en: 'Diverse investigators can expose background assumptions that a homogeneous community mistakes for neutral observation.',
            native: '多元的研究者能够揭示同质群体误认为中立观察的背景假设。',
          },
          {
            en: 'A claim becomes more reliable when it survives transparent criticism from people positioned to detect different errors.',
            native: '一项主张若能经受来自不同位置、能够发现不同错误之人的公开批评，就会变得更加可靠。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'subjectivity',
    questionText:
      'Can subjectivity be treated as a source of knowledge rather than merely an obstacle to objective judgment?',
    translations: {
      te: {
        word: 'వ్యక్తినిష్ఠత',
        question: 'వ్యక్తినిష్ఠతను నిష్పాక్షిక నిర్ణయానికి కేవలం అడ్డంకిగా కాకుండా జ్ఞానానికి ఒక మూలంగా పరిగణించవచ్చా?',
        examples: [
          {
            en: 'First-person experience reveals dimensions of pain that no external measurement can exhaust.',
            native:
              'బాధలోని కొన్ని కోణాలను వ్యక్తిగత ప్రత్యక్ష అనుభవం వెల్లడిస్తుంది; ఏ బాహ్య కొలమానమూ వాటిని సంపూర్ణంగా పట్టుకోలేదు.',
          },
          {
            en: "Subjectivity is socially formed, yet that dependence does not make an individual's testimony interchangeable with anyone else's.",
            native:
              'వ్యక్తినిష్ఠత సామాజికంగా రూపుదిద్దుకుంటుంది; అయినప్పటికీ ఆ ఆధారపడటం వల్ల ఒక వ్యక్తి సాక్ష్యాన్ని మరెవరి సాక్ష్యంతోనైనా సమానంగా మార్చివేయలేం.',
          },
          {
            en: 'Critical inquiry should examine perspective while preserving the situated knowledge that perspective makes possible.',
            native:
              'విమర్శనాత్మక పరిశోధన దృక్కోణాన్ని పరిశీలిస్తూనే, ఆ దృక్కోణం సాధ్యం చేసే సందర్భాధారిత జ్ఞానాన్ని కాపాడాలి.',
          },
        ],
      },
      hi: {
        word: 'व्यक्तिनिष्ठता',
        question:
          'क्या व्यक्तिनिष्ठता को वस्तुनिष्ठ निर्णय की केवल एक बाधा के बजाय ज्ञान के स्रोत के रूप में देखा जा सकता है?',
        examples: [
          {
            en: 'First-person experience reveals dimensions of pain that no external measurement can exhaust.',
            native:
              'प्रत्यक्ष निजी अनुभव पीड़ा के ऐसे आयाम प्रकट करता है जिन्हें कोई बाहरी माप पूरी तरह नहीं समेट सकता।',
          },
          {
            en: "Subjectivity is socially formed, yet that dependence does not make an individual's testimony interchangeable with anyone else's.",
            native:
              'व्यक्तिनिष्ठता सामाजिक रूप से निर्मित होती है, फिर भी यह निर्भरता किसी व्यक्ति की गवाही को किसी और की गवाही से अदला-बदली योग्य नहीं बनाती।',
          },
          {
            en: 'Critical inquiry should examine perspective while preserving the situated knowledge that perspective makes possible.',
            native:
              'आलोचनात्मक जाँच को दृष्टिकोण का परीक्षण करते हुए उस संदर्भगत ज्ञान को बचाए रखना चाहिए जिसे वही दृष्टिकोण संभव बनाता है।',
          },
        ],
      },
      es: {
        word: 'subjetividad',
        question:
          '¿Puede considerarse la subjetividad una fuente de conocimiento en lugar de un mero obstáculo para el juicio objetivo?',
        examples: [
          {
            en: 'First-person experience reveals dimensions of pain that no external measurement can exhaust.',
            native:
              'La experiencia en primera persona revela dimensiones del dolor que ninguna medición externa puede agotar.',
          },
          {
            en: "Subjectivity is socially formed, yet that dependence does not make an individual's testimony interchangeable with anyone else's.",
            native:
              'La subjetividad se forma socialmente, pero esa dependencia no vuelve intercambiable el testimonio de una persona con el de cualquier otra.',
          },
          {
            en: 'Critical inquiry should examine perspective while preserving the situated knowledge that perspective makes possible.',
            native:
              'La investigación crítica debe examinar la perspectiva y, a la vez, preservar el conocimiento situado que esa perspectiva hace posible.',
          },
        ],
      },
      zh: {
        word: '主体性',
        question: '主体性是否可以被视为知识的来源，而不只是客观判断的障碍？',
        examples: [
          {
            en: 'First-person experience reveals dimensions of pain that no external measurement can exhaust.',
            native: '第一人称经验能够揭示痛苦的某些维度，而任何外部测量都无法将其穷尽。',
          },
          {
            en: "Subjectivity is socially formed, yet that dependence does not make an individual's testimony interchangeable with anyone else's.",
            native: '主体性由社会塑造，但这种依赖关系并不意味着一个人的证言可以被任何他人的证言替代。',
          },
          {
            en: 'Critical inquiry should examine perspective while preserving the situated knowledge that perspective makes possible.',
            native: '批判性探究应当审视视角，同时保留正是该视角所产生的情境化知识。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'paradox',
    questionText:
      'What can a genuine paradox reveal about the limits of a conceptual framework rather than the failure of ordinary logic?',
    translations: {
      te: {
        word: 'విరోధాభాసం',
        question: 'ఒక నిజమైన విరోధాభాసం సాధారణ తర్కం వైఫల్యాన్ని కాకుండా భావనాత్మక చట్రం పరిమితులను ఎలా వెల్లడించగలదు?',
        examples: [
          {
            en: 'A paradox may expose assumptions that remain invisible while each premise is considered in isolation.',
            native:
              'ప్రతి ప్రతిపాదనను విడివిడిగా పరిగణించినప్పుడు కనిపించకుండా ఉండే ఊహలను ఒక విరోధాభాసం బయటపెట్టవచ్చు.',
          },
          {
            en: 'Resolving the contradiction sometimes requires revising the categories that made the problem intelligible.',
            native:
              'వైరుధ్యాన్ని పరిష్కరించడానికి కొన్నిసార్లు ఆ సమస్యను అర్థం చేసుకునేలా చేసిన వర్గీకరణలనే సవరించాల్సి ఉంటుంది.',
          },
          {
            en: 'Political tolerance becomes paradoxical when protecting openness appears to require restricting those committed to destroying it.',
            native:
              'బహిరంగతను కాపాడాలంటే దానిని నాశనం చేయడానికి కట్టుబడినవారిని పరిమితం చేయాల్సిందేనని కనిపించినప్పుడు రాజకీయ సహనం విరోధాభాసంగా మారుతుంది.',
          },
        ],
      },
      hi: {
        word: 'विरोधाभास',
        question:
          'कोई वास्तविक विरोधाभास सामान्य तर्क की विफलता के बजाय किसी वैचारिक ढाँचे की सीमाओं के बारे में क्या प्रकट कर सकता है?',
        examples: [
          {
            en: 'A paradox may expose assumptions that remain invisible while each premise is considered in isolation.',
            native:
              'जब प्रत्येक आधार-वाक्य पर अलग-अलग विचार किया जाता है, तब अदृश्य रहने वाली मान्यताओं को कोई विरोधाभास उजागर कर सकता है।',
          },
          {
            en: 'Resolving the contradiction sometimes requires revising the categories that made the problem intelligible.',
            native:
              'विरोध को सुलझाने के लिए कभी-कभी उन श्रेणियों को ही संशोधित करना पड़ता है जिन्होंने समस्या को समझने योग्य बनाया था।',
          },
          {
            en: 'Political tolerance becomes paradoxical when protecting openness appears to require restricting those committed to destroying it.',
            native:
              'जब खुलेपन की रक्षा के लिए उसे नष्ट करने को प्रतिबद्ध लोगों को सीमित करना आवश्यक लगे, तब राजनीतिक सहिष्णुता विरोधाभासी बन जाती है।',
          },
        ],
      },
      es: {
        word: 'paradoja',
        question:
          '¿Qué puede revelar una paradoja genuina sobre los límites de un marco conceptual, en vez de sobre un fallo de la lógica ordinaria?',
        examples: [
          {
            en: 'A paradox may expose assumptions that remain invisible while each premise is considered in isolation.',
            native:
              'Una paradoja puede revelar supuestos que permanecen invisibles cuando cada premisa se considera por separado.',
          },
          {
            en: 'Resolving the contradiction sometimes requires revising the categories that made the problem intelligible.',
            native:
              'Resolver la contradicción exige a veces revisar las categorías que hicieron inteligible el problema.',
          },
          {
            en: 'Political tolerance becomes paradoxical when protecting openness appears to require restricting those committed to destroying it.',
            native:
              'La tolerancia política se vuelve paradójica cuando proteger la apertura parece exigir que se restrinja a quienes se proponen destruirla.',
          },
        ],
      },
      zh: {
        word: '悖论',
        question: '真正的悖论如何揭示概念框架的局限，而不只是表明普通逻辑失效？',
        examples: [
          {
            en: 'A paradox may expose assumptions that remain invisible while each premise is considered in isolation.',
            native: '当每个前提都被孤立考察时，一些假设会隐而不见，而悖论可能将它们揭示出来。',
          },
          {
            en: 'Resolving the contradiction sometimes requires revising the categories that made the problem intelligible.',
            native: '解决矛盾有时需要修正那些原本使问题变得可理解的范畴。',
          },
          {
            en: 'Political tolerance becomes paradoxical when protecting openness appears to require restricting those committed to destroying it.',
            native: '当维护开放似乎必须限制那些决意摧毁开放的人时，政治宽容便呈现出悖论。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'causality',
    questionText:
      'How should we reason about causality when controlled experiments are impossible and multiple mechanisms interact?',
    translations: {
      te: {
        word: 'కారణత్వం',
        question:
          'నియంత్రిత ప్రయోగాలు అసాధ్యమైనప్పుడు, అనేక యంత్రాంగాలు పరస్పరం ప్రభావితం చేసుకుంటున్నప్పుడు కారణత్వం గురించి మనం ఎలా తర్కించాలి?',
        examples: [
          {
            en: 'Correlation becomes causally persuasive only when a plausible mechanism survives serious attempts to rule out alternatives.',
            native:
              'ప్రత్యామ్నాయ వివరణలను తోసిపుచ్చేందుకు చేసిన గంభీర ప్రయత్నాలను ఒక సంభావ్య యంత్రాంగం తట్టుకున్నప్పుడే సహసంబంధం కారణపరంగా నమ్మదగినదవుతుంది.',
          },
          {
            en: 'Historical causes are often conjunctural: no single condition is sufficient, but their configuration produces the outcome.',
            native:
              'చారిత్రక కారణాలు తరచుగా సంయుక్తంగా పనిచేస్తాయి: ఏ ఒక్క పరిస్థితీ సరిపోదు, కానీ వాటి అమరిక ఫలితాన్ని ఉత్పత్తి చేస్తుంది.',
          },
          {
            en: 'Counterfactual reasoning clarifies causal claims, although imagined alternatives remain constrained by incomplete evidence.',
            native:
              'అసంపూర్ణ సాక్ష్యం ఊహించిన ప్రత్యామ్నాయాలను పరిమితం చేసినప్పటికీ, ప్రతివాస్తవిక తర్కం కారణసంబంధ వాదనలను స్పష్టం చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'कारणता',
        question:
          'जब नियंत्रित प्रयोग असंभव हों और अनेक तंत्र परस्पर क्रिया करें, तब हमें कारणता के बारे में कैसे तर्क करना चाहिए?',
        examples: [
          {
            en: 'Correlation becomes causally persuasive only when a plausible mechanism survives serious attempts to rule out alternatives.',
            native:
              'सहसंबंध तभी कारण की दृष्टि से विश्वसनीय बनता है जब कोई संभाव्य तंत्र वैकल्पिक व्याख्याओं को खारिज करने के गंभीर प्रयासों पर खरा उतरे।',
          },
          {
            en: 'Historical causes are often conjunctural: no single condition is sufficient, but their configuration produces the outcome.',
            native:
              'ऐतिहासिक कारण अक्सर संयुक्त होते हैं: कोई एक परिस्थिति पर्याप्त नहीं होती, किंतु उनका विन्यास परिणाम उत्पन्न करता है।',
          },
          {
            en: 'Counterfactual reasoning clarifies causal claims, although imagined alternatives remain constrained by incomplete evidence.',
            native:
              'अपूर्ण साक्ष्य कल्पित विकल्पों को सीमित रखते हैं, फिर भी प्रतितथ्यात्मक तर्क कारण-संबंधी दावों को स्पष्ट करता है।',
          },
        ],
      },
      es: {
        word: 'causalidad',
        question:
          '¿Cómo debemos razonar sobre la causalidad cuando los experimentos controlados son imposibles e interactúan múltiples mecanismos?',
        examples: [
          {
            en: 'Correlation becomes causally persuasive only when a plausible mechanism survives serious attempts to rule out alternatives.',
            native:
              'Una correlación solo resulta convincente como causa cuando un mecanismo plausible resiste intentos rigurosos de descartar alternativas.',
          },
          {
            en: 'Historical causes are often conjunctural: no single condition is sufficient, but their configuration produces the outcome.',
            native:
              'Las causas históricas suelen ser coyunturales: ninguna condición basta por sí sola, pero su configuración produce el resultado.',
          },
          {
            en: 'Counterfactual reasoning clarifies causal claims, although imagined alternatives remain constrained by incomplete evidence.',
            native:
              'El razonamiento contrafáctico esclarece las afirmaciones causales, aunque las alternativas imaginadas siguen limitadas por evidencia incompleta.',
          },
        ],
      },
      zh: {
        word: '因果关系',
        question: '当受控实验无法进行且多种机制相互作用时，我们应当如何推断因果关系？',
        examples: [
          {
            en: 'Correlation becomes causally persuasive only when a plausible mechanism survives serious attempts to rule out alternatives.',
            native: '只有当某种合理机制经受住排除其他解释的严谨尝试时，相关性才具有因果说服力。',
          },
          {
            en: 'Historical causes are often conjunctural: no single condition is sufficient, but their configuration produces the outcome.',
            native: '历史原因往往共同发挥作用：没有任何单一条件足够充分，但它们的组合会产生结果。',
          },
          {
            en: 'Counterfactual reasoning clarifies causal claims, although imagined alternatives remain constrained by incomplete evidence.',
            native: '反事实推理能够澄清因果主张，尽管想象中的其他可能仍受到不完整证据的限制。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'agency',
    questionText:
      'How can human agency remain meaningful if choices are shaped by institutions, habit, and material constraint?',
    translations: {
      te: {
        word: 'కర్తృత్వం',
        question:
          'ఎంపికలు సంస్థలు, అలవాట్లు, భౌతిక పరిమితుల వల్ల రూపుదిద్దుకుంటే మానవ కర్తృత్వం ఎలా అర్థవంతంగా నిలవగలదు?',
        examples: [
          {
            en: 'Agency need not imply unbounded freedom; it can consist in recognizing and altering the conditions of action.',
            native:
              'కర్తృత్వం అపరిమిత స్వేచ్ఛను సూచించాల్సిన అవసరం లేదు; చర్యకు సంబంధించిన పరిస్థితులను గుర్తించి మార్చడంలో అది ఉండవచ్చు.',
          },
          {
            en: 'Structures constrain individuals, but they persist only through practices that people may reproduce or contest.',
            native:
              'నిర్మాణాలు వ్యక్తులను పరిమితం చేస్తాయి; అయితే ప్రజలు పునరుత్పత్తి చేయగల లేదా సవాలు చేయగల ఆచరణల ద్వారానే అవి కొనసాగుతాయి.',
          },
          {
            en: 'Collective agency emerges when dispersed grievances become coordinated commitments and durable institutions.',
            native:
              'చెల్లాచెదురుగా ఉన్న అసంతృప్తులు సమన్వయమైన నిబద్ధతలుగా, స్థిరమైన సంస్థలుగా మారినప్పుడు సామూహిక కర్తృత్వం ఉద్భవిస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'कर्तृत्व',
        question:
          'यदि विकल्पों को संस्थाएँ, आदतें और भौतिक सीमाएँ आकार देती हैं, तो मानवीय कर्तृत्व अर्थपूर्ण कैसे बना रह सकता है?',
        examples: [
          {
            en: 'Agency need not imply unbounded freedom; it can consist in recognizing and altering the conditions of action.',
            native:
              'कर्तृत्व का अर्थ असीम स्वतंत्रता होना आवश्यक नहीं; वह कार्य करने की परिस्थितियों को पहचानने और बदलने में निहित हो सकता है।',
          },
          {
            en: 'Structures constrain individuals, but they persist only through practices that people may reproduce or contest.',
            native:
              'संरचनाएँ व्यक्तियों को सीमित करती हैं, लेकिन वे केवल उन प्रथाओं के माध्यम से बनी रहती हैं जिन्हें लोग दोहरा सकते हैं या चुनौती दे सकते हैं।',
          },
          {
            en: 'Collective agency emerges when dispersed grievances become coordinated commitments and durable institutions.',
            native:
              'सामूहिक कर्तृत्व तब उभरता है जब बिखरी शिकायतें समन्वित प्रतिबद्धताओं और टिकाऊ संस्थाओं में बदलती हैं।',
          },
        ],
      },
      es: {
        word: 'capacidad de acción',
        question:
          '¿Cómo puede conservar sentido la capacidad humana de actuar si las instituciones, los hábitos y las restricciones materiales moldean nuestras elecciones?',
        examples: [
          {
            en: 'Agency need not imply unbounded freedom; it can consist in recognizing and altering the conditions of action.',
            native:
              'La capacidad de acción no tiene por qué implicar una libertad ilimitada; puede consistir en reconocer y modificar las condiciones para actuar.',
          },
          {
            en: 'Structures constrain individuals, but they persist only through practices that people may reproduce or contest.',
            native:
              'Las estructuras limitan a las personas, pero solo persisten mediante prácticas que estas pueden reproducir o impugnar.',
          },
          {
            en: 'Collective agency emerges when dispersed grievances become coordinated commitments and durable institutions.',
            native:
              'La capacidad de acción colectiva surge cuando agravios dispersos se convierten en compromisos coordinados e instituciones duraderas.',
          },
        ],
      },
      zh: {
        word: '能动性',
        question: '如果选择受到制度、习惯和物质限制的塑造，人的能动性如何仍然具有意义？',
        examples: [
          {
            en: 'Agency need not imply unbounded freedom; it can consist in recognizing and altering the conditions of action.',
            native: '能动性不必意味着不受限制的自由；它可以体现在认识并改变行动条件的能力上。',
          },
          {
            en: 'Structures constrain individuals, but they persist only through practices that people may reproduce or contest.',
            native: '结构会限制个人，但它们只能通过人们可能重复或挑战的实践延续下去。',
          },
          {
            en: 'Collective agency emerges when dispersed grievances become coordinated commitments and durable institutions.',
            native: '当分散的不满转化为协调一致的承诺与持久的制度时，集体能动性便会形成。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'accountability',
    questionText:
      'What form should accountability take when harm results from a complex system rather than one clearly culpable individual?',
    translations: {
      te: {
        word: 'జవాబుదారీతనం',
        question:
          'హాని స్పష్టంగా దోషిగా ఉన్న ఒక వ్యక్తి వల్ల కాకుండా సంక్లిష్ట వ్యవస్థ వల్ల కలిగినప్పుడు జవాబుదారీతనం ఏ రూపం తీసుకోవాలి?',
        examples: [
          {
            en: 'Accountability fails when distributed responsibility becomes an excuse for every participant to deny meaningful control.',
            native:
              'బాధ్యత విభజించబడి ఉండటమే ప్రతి భాగస్వామీ తనకు గణనీయమైన నియంత్రణ లేదని చెప్పడానికి సాకుగా మారినప్పుడు జవాబుదారీతనం విఫలమవుతుంది.',
          },
          {
            en: 'Repairing harm may require institutional reform, restitution, and public explanation beyond the punishment of one actor.',
            native:
              'హానిని సరిచేయడానికి ఒక వ్యక్తిని శిక్షించడంతో పాటు సంస్థాగత సంస్కరణ, నష్టపరిహారం, బహిరంగ వివరణ కూడా అవసరం కావచ్చు.',
          },
          {
            en: 'A fair process distinguishes causal contribution from moral blame while refusing to let complexity erase obligation.',
            native:
              'సంక్లిష్టత బాధ్యతను చెరిపివేయడానికి వీల్లేకుండా, న్యాయమైన ప్రక్రియ కారణపరమైన వాటాను నైతిక నింద నుంచి వేరు చేస్తుంది.',
          },
        ],
      },
      hi: {
        word: 'जवाबदेही',
        question:
          'जब हानि किसी स्पष्ट रूप से दोषी व्यक्ति के बजाय जटिल व्यवस्था से उत्पन्न हो, तब जवाबदेही का स्वरूप क्या होना चाहिए?',
        examples: [
          {
            en: 'Accountability fails when distributed responsibility becomes an excuse for every participant to deny meaningful control.',
            native:
              'जब बँटी हुई जिम्मेदारी प्रत्येक सहभागी के लिए अपने सार्थक नियंत्रण से इनकार करने का बहाना बन जाती है, तब जवाबदेही विफल होती है।',
          },
          {
            en: 'Repairing harm may require institutional reform, restitution, and public explanation beyond the punishment of one actor.',
            native:
              'हानि की भरपाई के लिए किसी एक व्यक्ति को दंडित करने से आगे बढ़कर संस्थागत सुधार, प्रतिपूर्ति और सार्वजनिक स्पष्टीकरण की आवश्यकता हो सकती है।',
          },
          {
            en: 'A fair process distinguishes causal contribution from moral blame while refusing to let complexity erase obligation.',
            native:
              'एक निष्पक्ष प्रक्रिया कारणगत योगदान को नैतिक दोष से अलग करती है और जटिलता को दायित्व मिटाने का अवसर नहीं देती।',
          },
        ],
      },
      es: {
        word: 'rendición de cuentas',
        question:
          '¿Qué forma debería adoptar la rendición de cuentas cuando el daño procede de un sistema complejo y no de una persona claramente culpable?',
        examples: [
          {
            en: 'Accountability fails when distributed responsibility becomes an excuse for every participant to deny meaningful control.',
            native:
              'La rendición de cuentas fracasa cuando la responsabilidad distribuida sirve de excusa para que cada participante niegue haber ejercido un control significativo.',
          },
          {
            en: 'Repairing harm may require institutional reform, restitution, and public explanation beyond the punishment of one actor.',
            native:
              'Reparar el daño puede exigir reformas institucionales, restitución y explicaciones públicas, además de castigar a un solo actor.',
          },
          {
            en: 'A fair process distinguishes causal contribution from moral blame while refusing to let complexity erase obligation.',
            native:
              'Un proceso justo distingue la contribución causal de la culpa moral sin permitir que la complejidad borre la obligación.',
          },
        ],
      },
      zh: {
        word: '问责',
        question: '当伤害源于一个复杂系统，而非某个责任明确的个人时，问责应当采取何种形式？',
        examples: [
          {
            en: 'Accountability fails when distributed responsibility becomes an excuse for every participant to deny meaningful control.',
            native: '当责任分散成为每位参与者否认自己拥有实质控制力的借口时，问责就会失效。',
          },
          {
            en: 'Repairing harm may require institutional reform, restitution, and public explanation beyond the punishment of one actor.',
            native: '修复伤害可能不仅要惩罚某一行为者，还需要制度改革、补偿以及向公众作出解释。',
          },
          {
            en: 'A fair process distinguishes causal contribution from moral blame while refusing to let complexity erase obligation.',
            native: '公正的程序既区分因果贡献与道德过错，也拒绝让复杂性抹去应尽的义务。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'authenticity',
    questionText:
      'Is authenticity a matter of discovering a stable inner self, or of taking responsibility for the self one continually creates?',
    translations: {
      te: {
        word: 'ప్రామాణికత',
        question:
          'ప్రామాణికత అంటే స్థిరమైన అంతరాత్మను కనుగొనడమా, లేక నిరంతరం సృష్టించుకుంటున్న స్వరూపానికి బాధ్యత వహించడమా?',
        examples: [
          {
            en: "Authenticity cannot mean expressing every impulse, because reflection and restraint may also embody one's deepest commitments.",
            native:
              'ప్రామాణికత అంటే ప్రతి ఆవేశాన్నీ వ్యక్తం చేయడం కాదు; ఎందుకంటే ఆత్మపరిశీలన, సంయమనం కూడా ఒకరి అత్యంత లోతైన నిబద్ధతలను ప్రతిబింబించవచ్చు.',
          },
          {
            en: 'A social role becomes inauthentic when it is performed as an excuse to disown the choices the role still permits.',
            native:
              'ఒక సామాజిక పాత్ర ఇప్పటికీ అనుమతించే ఎంపికలను తనవి కావని చెప్పడానికి సాకుగా దానిని పోషించినప్పుడు ఆ పాత్ర ప్రామాణికతను కోల్పోతుంది.',
          },
          {
            en: 'The pursuit of authenticity is paradoxically shaped by cultural ideals about what an original life should look like.',
            native:
              'ఒక విలక్షణమైన జీవితం ఎలా ఉండాలనే సాంస్కృతిక ఆదర్శాలే ప్రామాణికత సాధనను విరోధాభాసంగా రూపుదిద్దుతాయి.',
          },
        ],
      },
      hi: {
        word: 'प्रामाणिकता',
        question:
          'क्या प्रामाणिकता किसी स्थिर अंतर्मन को खोजने का विषय है, या निरंतर रचे जा रहे अपने स्वरूप की जिम्मेदारी लेने का?',
        examples: [
          {
            en: "Authenticity cannot mean expressing every impulse, because reflection and restraint may also embody one's deepest commitments.",
            native:
              'प्रामाणिकता का अर्थ हर आवेग को व्यक्त करना नहीं हो सकता, क्योंकि आत्मचिंतन और संयम भी किसी की गहनतम प्रतिबद्धताओं को मूर्त रूप दे सकते हैं।',
          },
          {
            en: 'A social role becomes inauthentic when it is performed as an excuse to disown the choices the role still permits.',
            native:
              'कोई सामाजिक भूमिका तब अप्रामाणिक बन जाती है जब उसे उन विकल्पों की जिम्मेदारी से बचने के बहाने के रूप में निभाया जाए जिनकी वह भूमिका अब भी अनुमति देती है।',
          },
          {
            en: 'The pursuit of authenticity is paradoxically shaped by cultural ideals about what an original life should look like.',
            native:
              'प्रामाणिकता की खोज को इस बारे में सांस्कृतिक आदर्श ही विरोधाभासी ढंग से आकार देते हैं कि एक मौलिक जीवन कैसा दिखना चाहिए।',
          },
        ],
      },
      es: {
        word: 'autenticidad',
        question:
          '¿Consiste la autenticidad en descubrir un yo interior estable o en responsabilizarse del yo que uno crea continuamente?',
        examples: [
          {
            en: "Authenticity cannot mean expressing every impulse, because reflection and restraint may also embody one's deepest commitments.",
            native:
              'La autenticidad no puede significar expresar cada impulso, porque la reflexión y la moderación también pueden encarnar los compromisos más profundos de una persona.',
          },
          {
            en: 'A social role becomes inauthentic when it is performed as an excuse to disown the choices the role still permits.',
            native:
              'Un papel social se vuelve inauténtico cuando se desempeña como excusa para repudiar las elecciones que ese papel todavía permite.',
          },
          {
            en: 'The pursuit of authenticity is paradoxically shaped by cultural ideals about what an original life should look like.',
            native:
              'La búsqueda de autenticidad está moldeada, paradójicamente, por ideales culturales sobre el aspecto que debe tener una vida original.',
          },
        ],
      },
      zh: {
        word: '本真性',
        question: '本真性是发现一个稳定的内在自我，还是为自己不断塑造的自我承担责任？',
        examples: [
          {
            en: "Authenticity cannot mean expressing every impulse, because reflection and restraint may also embody one's deepest commitments.",
            native: '本真性不能等同于表达每一种冲动，因为反思与克制也可能体现一个人最深层的承诺。',
          },
          {
            en: 'A social role becomes inauthentic when it is performed as an excuse to disown the choices the role still permits.',
            native: '如果一个人把扮演社会角色当作逃避该角色仍允许之选择的借口，这个角色就变得不再真实。',
          },
          {
            en: 'The pursuit of authenticity is paradoxically shaped by cultural ideals about what an original life should look like.',
            native: '颇具悖论意味的是，对于独特人生应当呈现何种样貌的文化理想，塑造了人们对本真性的追求。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'alienation',
    questionText:
      'How does alienation differ from ordinary dissatisfaction, and what social arrangements make it systemic?',
    translations: {
      te: {
        word: 'పరాయీకరణ',
        question:
          'పరాయీకరణ సాధారణ అసంతృప్తికి ఎలా భిన్నంగా ఉంటుంది, ఏ సామాజిక ఏర్పాట్లు దానిని వ్యవస్థాగతంగా మారుస్తాయి?',
        examples: [
          {
            en: 'Alienated workers may recognize themselves neither in the product of their labor nor in the purposes it serves.',
            native:
              'పరాయీకరణకు లోనైన కార్మికులు తమ శ్రమ ఫలితంలో గానీ, అది నెరవేర్చే లక్ష్యాల్లో గానీ తమను తాము గుర్తించలేకపోవచ్చు.',
          },
          {
            en: 'Consumer choice can mask alienation when abundant options leave the underlying terms of participation untouched.',
            native:
              'ఎన్నో ప్రత్యామ్నాయాలు ఉన్నప్పటికీ పాల్గొనే ప్రాథమిక షరతులు మారకుండా ఉంటే, వినియోగదారుల ఎంపిక పరాయీకరణను మరుగుపరచగలదు.',
          },
          {
            en: 'Overcoming alienation requires more than private well-being; it requires meaningful influence over shared conditions.',
            native:
              'పరాయీకరణను అధిగమించడానికి వ్యక్తిగత శ్రేయస్సు మాత్రమే సరిపోదు; ఉమ్మడి పరిస్థితులపై అర్థవంతమైన ప్రభావం కూడా అవసరం.',
          },
        ],
      },
      hi: {
        word: 'अलगाव',
        question: 'अलगाव सामान्य असंतोष से किस प्रकार भिन्न है और कौन-सी सामाजिक व्यवस्थाएँ इसे प्रणालीगत बनाती हैं?',
        examples: [
          {
            en: 'Alienated workers may recognize themselves neither in the product of their labor nor in the purposes it serves.',
            native:
              'अलगावग्रस्त श्रमिक न तो अपने श्रम के उत्पाद में और न ही उसके द्वारा पूरे किए जाने वाले उद्देश्यों में स्वयं को पहचान पाते हैं।',
          },
          {
            en: 'Consumer choice can mask alienation when abundant options leave the underlying terms of participation untouched.',
            native:
              'जब प्रचुर विकल्प भागीदारी की बुनियादी शर्तों को जस का तस छोड़ देते हैं, तब उपभोक्ता की पसंद अलगाव को छिपा सकती है।',
          },
          {
            en: 'Overcoming alienation requires more than private well-being; it requires meaningful influence over shared conditions.',
            native:
              'अलगाव पर काबू पाने के लिए निजी कल्याण से अधिक चाहिए; साझा परिस्थितियों पर सार्थक प्रभाव भी आवश्यक है।',
          },
        ],
      },
      es: {
        word: 'alienación',
        question:
          '¿En qué se diferencia la alienación de la insatisfacción corriente y qué estructuras sociales la vuelven sistémica?',
        examples: [
          {
            en: 'Alienated workers may recognize themselves neither in the product of their labor nor in the purposes it serves.',
            native:
              'Los trabajadores alienados pueden no reconocerse ni en el producto de su trabajo ni en los fines a los que este sirve.',
          },
          {
            en: 'Consumer choice can mask alienation when abundant options leave the underlying terms of participation untouched.',
            native:
              'La elección del consumidor puede ocultar la alienación cuando la abundancia de opciones no altera las condiciones subyacentes de participación.',
          },
          {
            en: 'Overcoming alienation requires more than private well-being; it requires meaningful influence over shared conditions.',
            native:
              'Superar la alienación exige algo más que bienestar privado: requiere una influencia significativa sobre las condiciones compartidas.',
          },
        ],
      },
      zh: {
        word: '异化',
        question: '异化与一般的不满有何区别，哪些社会安排会使它成为一种系统性现象？',
        examples: [
          {
            en: 'Alienated workers may recognize themselves neither in the product of their labor nor in the purposes it serves.',
            native: '异化的劳动者可能既无法在自己的劳动产品中认出自我，也无法认同产品所服务的目的。',
          },
          {
            en: 'Consumer choice can mask alienation when abundant options leave the underlying terms of participation untouched.',
            native: '当丰富的选项丝毫未改变参与的根本条件时，消费者选择反而可能掩盖异化。',
          },
          {
            en: 'Overcoming alienation requires more than private well-being; it requires meaningful influence over shared conditions.',
            native: '克服异化需要的不只是个人福祉，还需要对共同生活条件拥有实质性影响力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'conformity',
    questionText:
      'When is conformity a reasonable basis for coordination, and when does it become a surrender of moral judgment?',
    translations: {
      te: {
        word: 'అనుగుణత',
        question:
          'అనుగుణత ఎప్పుడు సమన్వయానికి సహేతుకమైన ప్రాతిపదికగా ఉంటుంది, ఎప్పుడు అది నైతిక విచక్షణను వదులుకోవడంగా మారుతుంది?',
        examples: [
          {
            en: 'Conformity reduces the cost of coordination, but it can also prevent a group from recognizing collectively maintained errors.',
            native:
              'అనుగుణత సమన్వయ వ్యయాన్ని తగ్గిస్తుంది; అయితే ఒక సమూహం సామూహికంగా కొనసాగిస్తున్న పొరపాట్లను గుర్తించకుండా కూడా అడ్డుకోగలదు.',
          },
          {
            en: 'People often comply not because they agree, but because each mistakenly assumes that everyone else does.',
            native:
              'ప్రజలు తరచుగా ఏకీభవించడం వల్ల కాకుండా, మిగతా వారందరూ ఏకీభవిస్తున్నారని ప్రతి ఒక్కరూ పొరపాటుగా భావించడం వల్ల అనుసరిస్తారు.',
          },
          {
            en: 'Moral courage involves judging which conventions enable mutual trust and which merely protect established power.',
            native:
              'ఏ సంప్రదాయాలు పరస్పర విశ్వాసాన్ని సాధ్యం చేస్తాయో, ఏవి కేవలం స్థిరపడిన అధికారాన్ని కాపాడతాయో నిర్ణయించడం నైతిక ధైర్యంలో భాగం.',
          },
        ],
      },
      hi: {
        word: 'अनुरूपता',
        question: 'अनुरूपता कब समन्वय का उचित आधार होती है और कब वह नैतिक विवेक का समर्पण बन जाती है?',
        examples: [
          {
            en: 'Conformity reduces the cost of coordination, but it can also prevent a group from recognizing collectively maintained errors.',
            native:
              'अनुरूपता समन्वय की लागत घटाती है, किंतु वह किसी समूह को सामूहिक रूप से बनाए रखी गई त्रुटियाँ पहचानने से भी रोक सकती है।',
          },
          {
            en: 'People often comply not because they agree, but because each mistakenly assumes that everyone else does.',
            native:
              'लोग प्रायः सहमत होने के कारण नहीं, बल्कि इसलिए अनुपालन करते हैं कि हर व्यक्ति गलती से मान लेता है कि बाकी सभी सहमत हैं।',
          },
          {
            en: 'Moral courage involves judging which conventions enable mutual trust and which merely protect established power.',
            native:
              'नैतिक साहस में यह परखना शामिल है कि कौन-सी परंपराएँ आपसी विश्वास संभव बनाती हैं और कौन-सी केवल स्थापित सत्ता की रक्षा करती हैं।',
          },
        ],
      },
      es: {
        word: 'conformidad',
        question:
          '¿Cuándo constituye la conformidad una base razonable para coordinarse y cuándo supone renunciar al juicio moral?',
        examples: [
          {
            en: 'Conformity reduces the cost of coordination, but it can also prevent a group from recognizing collectively maintained errors.',
            native:
              'La conformidad reduce el coste de la coordinación, pero también puede impedir que un grupo reconozca errores mantenidos colectivamente.',
          },
          {
            en: 'People often comply not because they agree, but because each mistakenly assumes that everyone else does.',
            native:
              'La gente suele acatar no porque esté de acuerdo, sino porque cada persona supone erróneamente que las demás sí lo están.',
          },
          {
            en: 'Moral courage involves judging which conventions enable mutual trust and which merely protect established power.',
            native:
              'El valor moral implica juzgar qué convenciones posibilitan la confianza mutua y cuáles se limitan a proteger el poder establecido.',
          },
        ],
      },
      zh: {
        word: '从众',
        question: '从众何时是实现协调的合理基础，何时又会变成对道德判断的放弃？',
        examples: [
          {
            en: 'Conformity reduces the cost of coordination, but it can also prevent a group from recognizing collectively maintained errors.',
            native: '从众降低了协调成本，但也可能使群体无法认识到由大家共同维持的错误。',
          },
          {
            en: 'People often comply not because they agree, but because each mistakenly assumes that everyone else does.',
            native: '人们服从往往并非因为赞同，而是因为每个人都误以为其他人赞同。',
          },
          {
            en: 'Moral courage involves judging which conventions enable mutual trust and which merely protect established power.',
            native: '道德勇气包括判断哪些惯例促进相互信任，哪些惯例只是维护既有权力。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'dissent',
    questionText:
      'What obligations do dissenters owe a democratic community whose decisions they regard as profoundly unjust?',
    translations: {
      te: {
        word: 'అసమ్మతి',
        question:
          'తీవ్ర అన్యాయమైన నిర్ణయాలు తీసుకుందని భావించే ప్రజాస్వామ్య సమాజం పట్ల అసమ్మతివాదులకు ఎలాంటి బాధ్యతలు ఉంటాయి?',
        examples: [
          {
            en: 'Dissent affirms democratic membership when it appeals to principles the community professes but fails to honor.',
            native:
              'సమాజం ప్రకటించే కానీ పాటించడంలో విఫలమయ్యే సూత్రాలనే ప్రస్తావించినప్పుడు అసమ్మతి ప్రజాస్వామ్య సభ్యత్వాన్ని ధ్రువీకరిస్తుంది.',
          },
          {
            en: 'Civil disobedience makes a breach of law public and accountable rather than treating private conviction as automatic exemption.',
            native:
              'వ్యక్తిగత నమ్మకమే స్వయంచాలక మినహాయింపు అని భావించకుండా, పౌర అవిధేయత చట్ట ఉల్లంఘనను బహిరంగంగా, జవాబుదారీతనంతో చేపడుతుంది.',
          },
          {
            en: 'A democracy that tolerates only harmless criticism deprives itself of the warnings most capable of correcting systemic failure.',
            native:
              'హానిరహిత విమర్శను మాత్రమే సహించే ప్రజాస్వామ్యం వ్యవస్థాగత వైఫల్యాన్ని సరిచేయగల అత్యంత శక్తివంతమైన హెచ్చరికలను కోల్పోతుంది.',
          },
        ],
      },
      hi: {
        word: 'असहमति',
        question:
          'असहमति रखने वालों के उस लोकतांत्रिक समुदाय के प्रति क्या दायित्व हैं जिसके निर्णयों को वे घोर अन्यायपूर्ण मानते हैं?',
        examples: [
          {
            en: 'Dissent affirms democratic membership when it appeals to principles the community professes but fails to honor.',
            native:
              'असहमति तब लोकतांत्रिक सदस्यता की पुष्टि करती है जब वह उन सिद्धांतों की दुहाई देती है जिन्हें समुदाय मानने का दावा तो करता है, पर निभाता नहीं।',
          },
          {
            en: 'Civil disobedience makes a breach of law public and accountable rather than treating private conviction as automatic exemption.',
            native:
              'सविनय अवज्ञा निजी विश्वास को स्वतः छूट मानने के बजाय कानून के उल्लंघन को सार्वजनिक और जवाबदेह बनाती है।',
          },
          {
            en: 'A democracy that tolerates only harmless criticism deprives itself of the warnings most capable of correcting systemic failure.',
            native:
              'जो लोकतंत्र केवल निरापद आलोचना सहता है, वह स्वयं को उन चेतावनियों से वंचित कर देता है जो प्रणालीगत विफलता सुधारने में सबसे सक्षम हैं।',
          },
        ],
      },
      es: {
        word: 'disenso',
        question:
          '¿Qué obligaciones tienen los disidentes con una comunidad democrática cuyas decisiones consideran profundamente injustas?',
        examples: [
          {
            en: 'Dissent affirms democratic membership when it appeals to principles the community professes but fails to honor.',
            native:
              'El disenso reafirma la pertenencia democrática cuando apela a principios que la comunidad profesa, pero incumple.',
          },
          {
            en: 'Civil disobedience makes a breach of law public and accountable rather than treating private conviction as automatic exemption.',
            native:
              'La desobediencia civil hace pública y responsable una infracción de la ley, en vez de tratar la convicción privada como una exención automática.',
          },
          {
            en: 'A democracy that tolerates only harmless criticism deprives itself of the warnings most capable of correcting systemic failure.',
            native:
              'Una democracia que solo tolera críticas inofensivas se priva de las advertencias más capaces de corregir un fallo sistémico.',
          },
        ],
      },
      zh: {
        word: '异议',
        question: '当异议者认为民主共同体的决定极不公正时，他们对这个共同体负有哪些义务？',
        examples: [
          {
            en: 'Dissent affirms democratic membership when it appeals to principles the community professes but fails to honor.',
            native: '当异议诉诸共同体口头信奉却未能践行的原则时，它肯定了异议者的民主成员身份。',
          },
          {
            en: 'Civil disobedience makes a breach of law public and accountable rather than treating private conviction as automatic exemption.',
            native: '公民抗命使违法行为公开并接受问责，而不是把个人信念当作自动获得豁免的理由。',
          },
          {
            en: 'A democracy that tolerates only harmless criticism deprives itself of the warnings most capable of correcting systemic failure.',
            native: '只容忍无害批评的民主制度，会让自己失去最有可能纠正系统性失败的警示。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'reconciliation',
    questionText:
      'Can reconciliation be morally credible without full agreement about the past or complete punishment of those responsible?',
    translations: {
      te: {
        word: 'సయోధ్య',
        question:
          'గతం గురించి పూర్తి ఏకాభిప్రాయం లేకుండా, బాధ్యులందరికీ సంపూర్ణ శిక్ష విధించకుండా సయోధ్య నైతికంగా విశ్వసనీయంగా ఉండగలదా?',
        examples: [
          {
            en: 'Reconciliation is not collective amnesia; it requires an acknowledged record that victims are not compelled to deny.',
            native:
              'సయోధ్య సామూహిక విస్మృతి కాదు; బాధితులు తిరస్కరించాల్సిన పరిస్థితి రాని విధంగా అంగీకరించిన చారిత్రక నమోదు దానికి అవసరం.',
          },
          {
            en: 'Truth commissions trade some retributive certainty for disclosure, but that compromise is legitimate only with meaningful repair.',
            native:
              'సత్య నిర్ధారణ సంఘాలు కొంత ప్రతీకార నిశ్చితత్వానికి బదులుగా వాస్తవ వెల్లడి సాధిస్తాయి; అయితే అర్థవంతమైన పరిహారం ఉన్నప్పుడే ఆ రాజీకి చట్టబద్ధత ఉంటుంది.',
          },
          {
            en: 'Former adversaries may share institutions before they share memories, provided those institutions protect equal standing and future contestation.',
            native:
              'ఆ సంస్థలు సమాన హోదాను, భవిష్యత్తులో విభేదించే హక్కును కాపాడితే, పూర్వ ప్రత్యర్థులు ఉమ్మడి జ్ఞాపకాలను పంచుకోకముందే సంస్థలను పంచుకోగలరు.',
          },
        ],
      },
      hi: {
        word: 'मेल-मिलाप',
        question:
          'क्या अतीत पर पूर्ण सहमति या जिम्मेदार लोगों को पूरा दंड दिए बिना मेल-मिलाप नैतिक रूप से विश्वसनीय हो सकता है?',
        examples: [
          {
            en: 'Reconciliation is not collective amnesia; it requires an acknowledged record that victims are not compelled to deny.',
            native:
              'मेल-मिलाप सामूहिक विस्मृति नहीं है; इसके लिए ऐसा स्वीकृत अभिलेख चाहिए जिसे पीड़ितों को नकारने के लिए विवश न किया जाए।',
          },
          {
            en: 'Truth commissions trade some retributive certainty for disclosure, but that compromise is legitimate only with meaningful repair.',
            native:
              'सत्य आयोग कुछ दंडात्मक निश्चितता के बदले तथ्य उजागर करते हैं, पर वह समझौता सार्थक क्षतिपूर्ति के साथ ही वैध होता है।',
          },
          {
            en: 'Former adversaries may share institutions before they share memories, provided those institutions protect equal standing and future contestation.',
            native:
              'पूर्व विरोधी साझा स्मृतियों से पहले संस्थाएँ साझा कर सकते हैं, बशर्ते वे संस्थाएँ समान दर्जे और भविष्य में असहमति के अधिकार की रक्षा करें।',
          },
        ],
      },
      es: {
        word: 'reconciliación',
        question:
          '¿Puede la reconciliación ser moralmente creíble sin un acuerdo pleno sobre el pasado ni un castigo completo de los responsables?',
        examples: [
          {
            en: 'Reconciliation is not collective amnesia; it requires an acknowledged record that victims are not compelled to deny.',
            native:
              'La reconciliación no es amnesia colectiva; exige un registro reconocido que las víctimas no se vean obligadas a negar.',
          },
          {
            en: 'Truth commissions trade some retributive certainty for disclosure, but that compromise is legitimate only with meaningful repair.',
            native:
              'Las comisiones de la verdad intercambian cierta certeza retributiva por revelaciones, pero ese acuerdo solo es legítimo si existe una reparación significativa.',
          },
          {
            en: 'Former adversaries may share institutions before they share memories, provided those institutions protect equal standing and future contestation.',
            native:
              'Antiguos adversarios pueden compartir instituciones antes que recuerdos, siempre que estas protejan la igualdad de condición y la posibilidad de disentir en el futuro.',
          },
        ],
      },
      zh: {
        word: '和解',
        question: '如果人们未能就过去达成完整共识，也未能彻底惩罚责任者，和解在道德上仍然可信么？',
        examples: [
          {
            en: 'Reconciliation is not collective amnesia; it requires an acknowledged record that victims are not compelled to deny.',
            native: '和解不是集体失忆；它需要一份得到承认、且受害者不会被迫否认的历史记录。',
          },
          {
            en: 'Truth commissions trade some retributive certainty for disclosure, but that compromise is legitimate only with meaningful repair.',
            native: '真相委员会以部分惩罚的确定性换取事实披露，但只有伴随实质性修复，这种妥协才具有正当性。',
          },
          {
            en: 'Former adversaries may share institutions before they share memories, provided those institutions protect equal standing and future contestation.',
            native: '昔日对手或许能在共享记忆之前先共享制度，前提是这些制度保障平等地位与未来提出异议的空间。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'retribution',
    questionText:
      'Can retribution justify punishment independently of deterrence, rehabilitation, or protection from future harm?',
    translations: {
      te: {
        word: 'ప్రతీకారాత్మక శిక్ష',
        question:
          'నిరోధం, పునరావాసం లేదా భవిష్యత్ హాని నుంచి రక్షణతో సంబంధం లేకుండానే ప్రతీకార న్యాయం శిక్షను సమర్థించగలదా?',
        examples: [
          {
            en: 'Retribution treats proportionate punishment as a response owed to wrongdoing, not merely as a tool for producing better consequences.',
            native:
              'ప్రతీకార న్యాయం అనుపాతిక శిక్షను కేవలం మెరుగైన పరిణామాలను సాధించే సాధనంగా కాకుండా, తప్పుకు ఇవ్వాల్సిన ప్రతిస్పందనగా పరిగణిస్తుంది.',
          },
          {
            en: 'The claim that offenders deserve suffering remains incomplete until a theory explains who may impose it and within what limits.',
            native:
              'నేరస్థులు బాధను అనుభవించడానికి అర్హులనే వాదనను ఎవరు, ఏ పరిమితుల్లో ఆ బాధను విధించవచ్చో ఒక సిద్ధాంతం వివరించే వరకు అది అసంపూర్ణంగానే ఉంటుంది.',
          },
          {
            en: 'A humane penal system must distinguish public condemnation from the desire to make another person suffer.',
            native: 'మానవీయ శిక్షా వ్యవస్థ బహిరంగ ఖండనను మరొక వ్యక్తిని బాధపెట్టాలనే కోరిక నుంచి వేరు చేయాలి.',
          },
        ],
      },
      hi: {
        word: 'प्रतिशोधात्मक दंड',
        question:
          'क्या प्रतिशोध, निवारण, पुनर्वास या भावी हानि से सुरक्षा से स्वतंत्र रूप से दंड को उचित ठहरा सकता है?',
        examples: [
          {
            en: 'Retribution treats proportionate punishment as a response owed to wrongdoing, not merely as a tool for producing better consequences.',
            native:
              'प्रतिशोधात्मक न्याय आनुपातिक दंड को केवल बेहतर परिणाम लाने का साधन नहीं, बल्कि अपराध के लिए देय प्रतिक्रिया मानता है।',
          },
          {
            en: 'The claim that offenders deserve suffering remains incomplete until a theory explains who may impose it and within what limits.',
            native:
              'अपराधी पीड़ा के पात्र हैं, यह दावा तब तक अधूरा रहता है जब तक कोई सिद्धांत यह न बताए कि वह पीड़ा कौन और किन सीमाओं में दे सकता है।',
          },
          {
            en: 'A humane penal system must distinguish public condemnation from the desire to make another person suffer.',
            native:
              'एक मानवीय दंड व्यवस्था को सार्वजनिक निंदा और किसी अन्य व्यक्ति को पीड़ा पहुँचाने की इच्छा में अंतर करना चाहिए।',
          },
        ],
      },
      es: {
        word: 'retribución penal',
        question:
          '¿Puede la retribución justificar el castigo con independencia de la disuasión, la rehabilitación o la protección frente a daños futuros?',
        examples: [
          {
            en: 'Retribution treats proportionate punishment as a response owed to wrongdoing, not merely as a tool for producing better consequences.',
            native:
              'La retribución considera el castigo proporcional una respuesta debida al delito, no un mero instrumento para producir mejores consecuencias.',
          },
          {
            en: 'The claim that offenders deserve suffering remains incomplete until a theory explains who may impose it and within what limits.',
            native:
              'Afirmar que los infractores merecen sufrir resulta incompleto mientras una teoría no explique quién puede imponer ese sufrimiento y dentro de qué límites.',
          },
          {
            en: 'A humane penal system must distinguish public condemnation from the desire to make another person suffer.',
            native:
              'Un sistema penal humano debe distinguir la condena pública del deseo de hacer sufrir a otra persona.',
          },
        ],
      },
      zh: {
        word: '报应性惩罚',
        question: '报应能否独立于威慑、改造或防止未来伤害等目的，为惩罚提供正当理由？',
        examples: [
          {
            en: 'Retribution treats proportionate punishment as a response owed to wrongdoing, not merely as a tool for producing better consequences.',
            native: '报应论把相称的惩罚视为对不法行为应有的回应，而不只是产生更好后果的工具。',
          },
          {
            en: 'The claim that offenders deserve suffering remains incomplete until a theory explains who may impose it and within what limits.',
            native: '在理论说明谁可以施加痛苦以及权力边界为何之前，声称违法者应当受苦仍是不完整的。',
          },
          {
            en: 'A humane penal system must distinguish public condemnation from the desire to make another person suffer.',
            native: '人道的刑罚制度必须区分公开谴责与使他人受苦的欲望。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'proportionality',
    questionText:
      'How should proportionality be judged when harms, intentions, and unequal vulnerabilities cannot be measured on one scale?',
    translations: {
      te: {
        word: 'అనుపాతికత',
        question: 'హాని, ఉద్దేశాలు, అసమాన దుర్బలతలను ఒకే కొలమానంతో కొలవలేనప్పుడు అనుపాతికతను ఎలా నిర్ణయించాలి?',
        examples: [
          {
            en: 'Proportionality constrains power by requiring both a legitimate aim and the least excessive means capable of achieving it.',
            native:
              'చట్టబద్ధమైన లక్ష్యం, దానిని సాధించగల అవసరానికి మించని సాధనం రెండూ అవసరమని నిర్దేశించడం ద్వారా అనుపాతికత అధికారాన్ని నియంత్రిస్తుంది.',
          },
          {
            en: 'Equal penalties can be disproportionate when the same sanction imposes radically different burdens on differently situated people.',
            native:
              'వేర్వేరు పరిస్థితుల్లో ఉన్న వ్యక్తులపై ఒకే శిక్ష పూర్తిగా భిన్నమైన భారాలను మోపినప్పుడు సమాన దండనలు కూడా అననుపాతికంగా ఉండవచ్చు.',
          },
          {
            en: 'In war and law, numerical comparison cannot replace judgment about the moral significance of foreseeable harm.',
            native:
              'యుద్ధంలోనూ చట్టంలోనూ ముందుగా ఊహించగల హాని యొక్క నైతిక ప్రాముఖ్యతపై విచక్షణకు సంఖ్యాత్మక పోలిక ప్రత్యామ్నాయం కాలేదు.',
          },
        ],
      },
      hi: {
        word: 'आनुपातिकता',
        question:
          'जब हानि, इरादों और असमान असुरक्षाओं को एक ही पैमाने पर नहीं मापा जा सकता, तब आनुपातिकता का आकलन कैसे किया जाना चाहिए?',
        examples: [
          {
            en: 'Proportionality constrains power by requiring both a legitimate aim and the least excessive means capable of achieving it.',
            native:
              'आनुपातिकता वैध लक्ष्य और उसे प्राप्त करने में सक्षम ऐसे साधन, जो आवश्यकता से अधिक कठोर न हो, दोनों की माँग करके सत्ता को सीमित करती है।',
          },
          {
            en: 'Equal penalties can be disproportionate when the same sanction imposes radically different burdens on differently situated people.',
            native:
              'जब एक ही दंड अलग परिस्थितियों में रहने वाले लोगों पर बिल्कुल भिन्न बोझ डालता है, तब समान दंड भी अनुपातहीन हो सकते हैं।',
          },
          {
            en: 'In war and law, numerical comparison cannot replace judgment about the moral significance of foreseeable harm.',
            native:
              'युद्ध और कानून में संख्यात्मक तुलना, पूर्वानुमेय हानि के नैतिक महत्त्व पर विवेकपूर्ण निर्णय का स्थान नहीं ले सकती।',
          },
        ],
      },
      es: {
        word: 'proporcionalidad',
        question:
          '¿Cómo debe juzgarse la proporcionalidad cuando los daños, las intenciones y las vulnerabilidades desiguales no pueden medirse en una sola escala?',
        examples: [
          {
            en: 'Proportionality constrains power by requiring both a legitimate aim and the least excessive means capable of achieving it.',
            native:
              'La proporcionalidad limita el poder al exigir tanto un fin legítimo como el medio menos excesivo capaz de alcanzarlo.',
          },
          {
            en: 'Equal penalties can be disproportionate when the same sanction imposes radically different burdens on differently situated people.',
            native:
              'Las penas iguales pueden ser desproporcionadas cuando una misma sanción impone cargas radicalmente distintas a personas en situaciones diferentes.',
          },
          {
            en: 'In war and law, numerical comparison cannot replace judgment about the moral significance of foreseeable harm.',
            native:
              'En la guerra y en el derecho, la comparación numérica no puede sustituir el juicio sobre la relevancia moral de un daño previsible.',
          },
        ],
      },
      zh: {
        word: '比例原则',
        question: '当伤害、意图和不平等的脆弱处境无法用同一尺度衡量时，应当如何判断是否合乎比例？',
        examples: [
          {
            en: 'Proportionality constrains power by requiring both a legitimate aim and the least excessive means capable of achieving it.',
            native: '比例原则要求权力既追求正当目的，又采用能够实现目的且不过度的手段，从而约束权力。',
          },
          {
            en: 'Equal penalties can be disproportionate when the same sanction imposes radically different burdens on differently situated people.',
            native: '当同一制裁给处境不同的人带来截然不同的负担时，形式相同的处罚也可能不合比例。',
          },
          {
            en: 'In war and law, numerical comparison cannot replace judgment about the moral significance of foreseeable harm.',
            native: '无论在战争还是法律中，数字比较都不能取代对可预见伤害之道德意义的判断。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'universality',
    questionText:
      'Can moral principles claim universality without erasing the histories and contexts through which people understand them?',
    translations: {
      te: {
        word: 'సార్వత్రికత',
        question:
          'ప్రజలు నైతిక సూత్రాలను అర్థం చేసుకునే చరిత్రలను, సందర్భాలను చెరిపివేయకుండానే ఆ సూత్రాలు సార్వత్రికతను ప్రకటించుకోగలవా?',
        examples: [
          {
            en: 'A universal principle gains credibility when those subject to it can contest its interpretation as equals.',
            native:
              'ఒక సార్వత్రిక సూత్రానికి లోబడి ఉన్నవారు సమానులుగా దాని వ్యాఖ్యానాన్ని సవాలు చేయగలిగినప్పుడు ఆ సూత్రం విశ్వసనీయతను పొందుతుంది.',
          },
          {
            en: 'Human rights aspire to universality, but their application must remain attentive to institutions that make formal rights usable.',
            native:
              'మానవ హక్కులు సార్వత్రికతను ఆశిస్తాయి; అయితే లాంఛనప్రాయ హక్కులను ఆచరణలో ఉపయోగించగలిగేలా చేసే సంస్థల పట్ల వాటి అమలు శ్రద్ధ వహించాలి.',
          },
          {
            en: 'Universality should identify a common moral floor rather than prescribe one exhaustive model of a good life.',
            native:
              'సార్వత్రికత ఒక మంచి జీవితానికి ఏకైక సమగ్ర నమూనాను నిర్దేశించడం కాకుండా, అందరికీ వర్తించే కనీస నైతిక ప్రమాణాన్ని గుర్తించాలి.',
          },
        ],
      },
      hi: {
        word: 'सार्वभौमिकता',
        question:
          'क्या नैतिक सिद्धांत उन इतिहासों और संदर्भों को मिटाए बिना सार्वभौमिकता का दावा कर सकते हैं जिनके माध्यम से लोग उन्हें समझते हैं?',
        examples: [
          {
            en: 'A universal principle gains credibility when those subject to it can contest its interpretation as equals.',
            native:
              'कोई सार्वभौमिक सिद्धांत तब विश्वसनीय बनता है जब उसके अधीन लोग समान हैसियत से उसकी व्याख्या को चुनौती दे सकें।',
          },
          {
            en: 'Human rights aspire to universality, but their application must remain attentive to institutions that make formal rights usable.',
            native:
              'मानवाधिकार सार्वभौमिकता की आकांक्षा रखते हैं, किंतु उनके प्रयोग में उन संस्थाओं पर ध्यान रहना चाहिए जो औपचारिक अधिकारों को उपयोगी बनाती हैं।',
          },
          {
            en: 'Universality should identify a common moral floor rather than prescribe one exhaustive model of a good life.',
            native:
              'सार्वभौमिकता को अच्छे जीवन का एक सर्वसमावेशी नमूना निर्धारित करने के बजाय एक साझा न्यूनतम नैतिक आधार पहचानना चाहिए।',
          },
        ],
      },
      es: {
        word: 'universalidad',
        question:
          '¿Pueden los principios morales aspirar a la universalidad sin borrar las historias y los contextos mediante los que las personas los comprenden?',
        examples: [
          {
            en: 'A universal principle gains credibility when those subject to it can contest its interpretation as equals.',
            native:
              'Un principio universal gana credibilidad cuando quienes están sujetos a él pueden impugnar su interpretación en condiciones de igualdad.',
          },
          {
            en: 'Human rights aspire to universality, but their application must remain attentive to institutions that make formal rights usable.',
            native:
              'Los derechos humanos aspiran a la universalidad, pero su aplicación debe atender a las instituciones que permiten ejercer los derechos formales.',
          },
          {
            en: 'Universality should identify a common moral floor rather than prescribe one exhaustive model of a good life.',
            native:
              'La universalidad debe identificar un mínimo moral común en vez de prescribir un único modelo exhaustivo de la buena vida.',
          },
        ],
      },
      zh: {
        word: '普遍性',
        question: '道德原则能否在不抹去人们理解它们所凭借的历史与语境的前提下，主张自身具有普遍性？',
        examples: [
          {
            en: 'A universal principle gains credibility when those subject to it can contest its interpretation as equals.',
            native: '当受某项普遍原则约束的人能够以平等身份质疑其解释时，这项原则才更为可信。',
          },
          {
            en: 'Human rights aspire to universality, but their application must remain attentive to institutions that make formal rights usable.',
            native: '人权追求普遍性，但在落实时必须关注那些使形式权利真正可行使的制度。',
          },
          {
            en: 'Universality should identify a common moral floor rather than prescribe one exhaustive model of a good life.',
            native: '普遍性应确立共同的道德底线，而不是规定一种无所不包的美好生活模式。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'particularism',
    questionText:
      'Does moral particularism offer sensitivity to context at the cost of reliable guidance and public justification?',
    translations: {
      te: {
        word: 'నైతిక విశిష్టవాదం',
        question:
          'నైతిక విశిష్టవాదం నమ్మదగిన మార్గదర్శకత్వం, బహిరంగ సమర్థనలను త్యాగం చేసి సందర్భం పట్ల సున్నితత్వాన్ని అందిస్తుందా?',
        examples: [
          {
            en: 'Particularism holds that a feature counting as a reason in one case may lose or reverse its force in another.',
            native:
              'ఒక సందర్భంలో కారణంగా పరిగణించే లక్షణం మరొక సందర్భంలో తన బలాన్ని కోల్పోవచ్చు లేదా వ్యతిరేక బలాన్ని పొందవచ్చని విశిష్టవాదం పేర్కొంటుంది.',
          },
          {
            en: 'Attending to context prevents rigid rules from obscuring morally decisive relationships and histories.',
            native:
              'సందర్భంపై శ్రద్ధ వహించడం నైతికంగా నిర్ణయాత్మకమైన సంబంధాలను, చరిత్రలను కఠిన నియమాలు మరుగుపరచకుండా అడ్డుకుంటుంది.',
          },
          {
            en: 'Without some general commitments, particular judgments risk becoming inaccessible to criticism or consistent public reasoning.',
            native:
              'కొన్ని సాధారణ నిబద్ధతలు లేకపోతే, విశిష్ట నిర్ణయాలు విమర్శకు లేదా స్థిరమైన బహిరంగ తర్కానికి అందకుండా పోయే ప్రమాదం ఉంది.',
          },
        ],
      },
      hi: {
        word: 'नैतिक विशेषवाद',
        question:
          'क्या नैतिक विशेषवाद विश्वसनीय मार्गदर्शन और सार्वजनिक औचित्य की कीमत पर संदर्भ के प्रति संवेदनशीलता प्रदान करता है?',
        examples: [
          {
            en: 'Particularism holds that a feature counting as a reason in one case may lose or reverse its force in another.',
            native:
              'विशेषवाद मानता है कि किसी एक मामले में कारण मानी जाने वाली विशेषता दूसरे मामले में अपना बल खो सकती है या उलट सकती है।',
          },
          {
            en: 'Attending to context prevents rigid rules from obscuring morally decisive relationships and histories.',
            native: 'संदर्भ पर ध्यान देने से कठोर नियम नैतिक रूप से निर्णायक संबंधों और इतिहासों को ओझल नहीं कर पाते।',
          },
          {
            en: 'Without some general commitments, particular judgments risk becoming inaccessible to criticism or consistent public reasoning.',
            native:
              'कुछ सामान्य प्रतिबद्धताओं के बिना विशिष्ट निर्णयों के आलोचना या सुसंगत सार्वजनिक तर्क की पहुँच से बाहर हो जाने का जोखिम रहता है।',
          },
        ],
      },
      es: {
        word: 'particularismo moral',
        question:
          '¿Ofrece el particularismo moral sensibilidad al contexto a costa de una orientación fiable y una justificación pública?',
        examples: [
          {
            en: 'Particularism holds that a feature counting as a reason in one case may lose or reverse its force in another.',
            native:
              'El particularismo sostiene que un rasgo que cuenta como razón en un caso puede perder o invertir su fuerza en otro.',
          },
          {
            en: 'Attending to context prevents rigid rules from obscuring morally decisive relationships and histories.',
            native:
              'Atender al contexto impide que las reglas rígidas oculten relaciones e historias moralmente decisivas.',
          },
          {
            en: 'Without some general commitments, particular judgments risk becoming inaccessible to criticism or consistent public reasoning.',
            native:
              'Sin algunos compromisos generales, los juicios particulares corren el riesgo de quedar fuera del alcance de la crítica o del razonamiento público coherente.',
          },
        ],
      },
      zh: {
        word: '道德特殊主义',
        question: '道德特殊主义是否以牺牲可靠指导和公共论证为代价，换取了对具体语境的敏感？',
        examples: [
          {
            en: 'Particularism holds that a feature counting as a reason in one case may lose or reverse its force in another.',
            native: '特殊主义认为，在一个情形中构成理由的特征，在另一情形中可能失去效力甚至产生相反作用。',
          },
          {
            en: 'Attending to context prevents rigid rules from obscuring morally decisive relationships and histories.',
            native: '关注语境可以防止僵化规则遮蔽具有道德决定性的关系与历史。',
          },
          {
            en: 'Without some general commitments, particular judgments risk becoming inaccessible to criticism or consistent public reasoning.',
            native: '如果缺少某些一般承诺，针对具体情形的判断就可能无法接受批评，也难以纳入一致的公共推理。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'anthropocentrism',
    questionText:
      'Is anthropocentrism unavoidable in ethical reasoning, or can nonhuman life possess value independent of human interests?',
    translations: {
      te: {
        word: 'మానవకేంద్రవాదం',
        question:
          'నైతిక తర్కంలో మానవకేంద్రవాదం అనివార్యమా, లేక మానవ ప్రయోజనాలతో సంబంధం లేకుండానే మానవేతర జీవానికి విలువ ఉండగలదా?',
        examples: [
          {
            en: 'Anthropocentrism becomes ethically restrictive when ecosystems matter only insofar as their loss can be priced as human damage.',
            native:
              'పర్యావరణ వ్యవస్థల నష్టాన్ని మానవ హానిగా ధర నిర్ణయించగల మేరకే వాటికి ప్రాముఖ్యత ఇచ్చినప్పుడు మానవకేంద్రవాదం నైతికంగా సంకుచితమవుతుంది.',
          },
          {
            en: 'Recognizing intrinsic value in nonhuman life does not eliminate human needs; it changes the burden of justifying their priority.',
            native:
              'మానవేతర జీవంలోని అంతర్గత విలువను గుర్తించడం మానవ అవసరాలను తొలగించదు; వాటికి ప్రాధాన్యం ఇవ్వడాన్ని సమర్థించాల్సిన బాధ్యతను మారుస్తుంది.',
          },
          {
            en: 'Future ecological policy must represent beings that cannot consent, vote, or articulate claims in human institutions.',
            native:
              'సమ్మతి తెలపలేని, ఓటు వేయలేని లేదా మానవ సంస్థల్లో తమ హక్కులను వ్యక్తీకరించలేని జీవులకు భవిష్యత్ పర్యావరణ విధానం ప్రాతినిధ్యం వహించాలి.',
          },
        ],
      },
      hi: {
        word: 'मानवकेंद्रवाद',
        question:
          'क्या नैतिक तर्क में मानवकेंद्रवाद अपरिहार्य है, या मानवेतर जीवन का मूल्य मानवीय हितों से स्वतंत्र हो सकता है?',
        examples: [
          {
            en: 'Anthropocentrism becomes ethically restrictive when ecosystems matter only insofar as their loss can be priced as human damage.',
            native:
              'जब पारिस्थितिक तंत्र केवल उस सीमा तक महत्त्व रखते हैं जहाँ उनके नुकसान की कीमत मानवीय क्षति के रूप में लगाई जा सके, तब मानवकेंद्रवाद नैतिक रूप से संकीर्ण हो जाता है।',
          },
          {
            en: 'Recognizing intrinsic value in nonhuman life does not eliminate human needs; it changes the burden of justifying their priority.',
            native:
              'मानवेतर जीवन के अंतर्निहित मूल्य को स्वीकार करना मानवीय जरूरतों को समाप्त नहीं करता; वह उनकी प्राथमिकता को उचित ठहराने का दायित्व बदल देता है।',
          },
          {
            en: 'Future ecological policy must represent beings that cannot consent, vote, or articulate claims in human institutions.',
            native:
              'भावी पर्यावरण नीति को उन जीवों का प्रतिनिधित्व करना होगा जो मानवीय संस्थाओं में सहमति नहीं दे सकते, मतदान नहीं कर सकते या अपने दावे व्यक्त नहीं कर सकते।',
          },
        ],
      },
      es: {
        word: 'antropocentrismo',
        question:
          '¿Es inevitable el antropocentrismo en el razonamiento ético o puede la vida no humana poseer un valor independiente de los intereses humanos?',
        examples: [
          {
            en: 'Anthropocentrism becomes ethically restrictive when ecosystems matter only insofar as their loss can be priced as human damage.',
            native:
              'El antropocentrismo se vuelve éticamente restrictivo cuando los ecosistemas solo importan en la medida en que su pérdida puede valorarse como daño humano.',
          },
          {
            en: 'Recognizing intrinsic value in nonhuman life does not eliminate human needs; it changes the burden of justifying their priority.',
            native:
              'Reconocer un valor intrínseco en la vida no humana no elimina las necesidades humanas; cambia la carga de justificar su prioridad.',
          },
          {
            en: 'Future ecological policy must represent beings that cannot consent, vote, or articulate claims in human institutions.',
            native:
              'La futura política ecológica debe representar a seres que no pueden consentir, votar ni formular reivindicaciones en instituciones humanas.',
          },
        ],
      },
      zh: {
        word: '人类中心主义',
        question: '伦理推理是否不可避免地以人类为中心，还是非人类生命能够拥有独立于人类利益的价值？',
        examples: [
          {
            en: 'Anthropocentrism becomes ethically restrictive when ecosystems matter only insofar as their loss can be priced as human damage.',
            native: '如果生态系统只有在其损失能够折算为人类损害时才受到重视，人类中心主义便会在伦理上变得狭隘。',
          },
          {
            en: 'Recognizing intrinsic value in nonhuman life does not eliminate human needs; it changes the burden of justifying their priority.',
            native: '承认非人类生命的内在价值并不消除人类需求，而是改变了论证这些需求应获优先地位时的举证责任。',
          },
          {
            en: 'Future ecological policy must represent beings that cannot consent, vote, or articulate claims in human institutions.',
            native: '未来的生态政策必须代表那些无法在人类制度中表示同意、投票或表达诉求的生命。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'transhumanism',
    questionText:
      'Does transhumanism expand human freedom, or does it convert socially defined ideals of ability into technological imperatives?',
    translations: {
      te: {
        word: 'మానవాతీతవాదం',
        question:
          'మానవాతీతవాదం మానవ స్వేచ్ఛను విస్తరిస్తుందా, లేక సామాజికంగా నిర్వచించిన సామర్థ్య ఆదర్శాలను సాంకేతిక అనివార్యతలుగా మారుస్తుందా?',
        examples: [
          {
            en: 'Enhancement cannot be evaluated as an individual choice when access to it may redefine what institutions treat as normal competence.',
            native:
              'మెరుగుదల సాంకేతికతను పొందగల అవకాశం, సంస్థలు సాధారణ సామర్థ్యంగా పరిగణించేదానినే పునర్నిర్వచించవచ్చు కాబట్టి దానిని కేవలం వ్యక్తిగత ఎంపికగా అంచనా వేయలేం.',
          },
          {
            en: 'Transhumanism challenges the boundary between therapy and improvement, a boundary already shaped by culture and inequality.',
            native:
              'సంస్కృతి, అసమానత ఇప్పటికే రూపుదిద్దిన చికిత్స, మెరుగుదలల మధ్య సరిహద్దును మానవాతీతవాదం సవాలు చేస్తుంది.',
          },
          {
            en: 'A just enhancement policy must ask who sets the desired traits and who bears the risks of becoming obsolete.',
            native:
              'కోరుకున్న లక్షణాలను ఎవరు నిర్ణయిస్తారు, కాలం చెల్లినవారిగా మారే ప్రమాదాన్ని ఎవరు భరిస్తారు అని న్యాయమైన మానవ మెరుగుదల విధానం ప్రశ్నించాలి.',
          },
        ],
      },
      hi: {
        word: 'मानवातीतवाद',
        question:
          'क्या मानवातीतवाद मानवीय स्वतंत्रता का विस्तार करता है, या क्षमता के सामाजिक रूप से निर्धारित आदर्शों को तकनीकी अनिवार्यताओं में बदल देता है?',
        examples: [
          {
            en: 'Enhancement cannot be evaluated as an individual choice when access to it may redefine what institutions treat as normal competence.',
            native:
              'जब संवर्धन तक पहुँच यह पुनर्परिभाषित कर सकती है कि संस्थाएँ किसे सामान्य क्षमता मानती हैं, तब उसका मूल्यांकन केवल व्यक्तिगत पसंद के रूप में नहीं किया जा सकता।',
          },
          {
            en: 'Transhumanism challenges the boundary between therapy and improvement, a boundary already shaped by culture and inequality.',
            native:
              'मानवातीतवाद उपचार और संवर्धन के बीच की उस सीमा को चुनौती देता है जिसे संस्कृति और असमानता पहले ही आकार दे चुकी हैं।',
          },
          {
            en: 'A just enhancement policy must ask who sets the desired traits and who bears the risks of becoming obsolete.',
            native:
              'एक न्यायपूर्ण संवर्धन नीति को पूछना चाहिए कि वांछित गुण कौन तय करता है और अप्रासंगिक हो जाने का जोखिम कौन उठाता है।',
          },
        ],
      },
      es: {
        word: 'transhumanismo',
        question:
          '¿Amplía el transhumanismo la libertad humana o convierte ideales de capacidad definidos socialmente en imperativos tecnológicos?',
        examples: [
          {
            en: 'Enhancement cannot be evaluated as an individual choice when access to it may redefine what institutions treat as normal competence.',
            native:
              'La mejora no puede evaluarse como una elección individual cuando acceder a ella puede redefinir lo que las instituciones consideran una capacidad normal.',
          },
          {
            en: 'Transhumanism challenges the boundary between therapy and improvement, a boundary already shaped by culture and inequality.',
            native:
              'El transhumanismo cuestiona la frontera entre terapia y mejora, una frontera ya moldeada por la cultura y la desigualdad.',
          },
          {
            en: 'A just enhancement policy must ask who sets the desired traits and who bears the risks of becoming obsolete.',
            native:
              'Una política de mejora justa debe preguntar quién determina los rasgos deseables y quién asume el riesgo de quedar obsoleto.',
          },
        ],
      },
      zh: {
        word: '超人类主义',
        question: '超人类主义是在拓展人类自由，还是把由社会定义的能力理想变成技术上的强制要求？',
        examples: [
          {
            en: 'Enhancement cannot be evaluated as an individual choice when access to it may redefine what institutions treat as normal competence.',
            native: '当能否获得增强技术可能重新定义制度所认可的正常能力时，就不能只把增强视为个人选择。',
          },
          {
            en: 'Transhumanism challenges the boundary between therapy and improvement, a boundary already shaped by culture and inequality.',
            native: '超人类主义挑战治疗与增强之间的界线，而这条界线早已受到文化和不平等的塑造。',
          },
          {
            en: 'A just enhancement policy must ask who sets the desired traits and who bears the risks of becoming obsolete.',
            native: '公正的增强政策必须追问：谁来设定理想特征，又由谁承担变得过时的风险。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'mortality',
    questionText:
      'How does awareness of mortality shape meaning without proving that either finitude or immortality would make life worthwhile?',
    translations: {
      te: {
        word: 'మరణశీలత',
        question:
          'పరిమిత జీవితం లేదా అమరత్వం జీవితాన్ని సార్థకం చేస్తాయని రుజువు చేయకుండానే, మరణశీలతపై అవగాహన జీవితార్థాన్ని ఎలా రూపుదిద్దుతుంది?',
        examples: [
          {
            en: 'Mortality gives choices urgency because committing to one path closes possibilities that cannot all be recovered.',
            native:
              'ఒక మార్గానికి కట్టుబడటం తిరిగి పొందలేని ఇతర అవకాశాలను మూసివేస్తుంది కాబట్టి మరణశీలత ఎంపికలకు అత్యవసరతను ఇస్తుంది.',
          },
          {
            en: "Fear of death concerns not only nonexistence but also unfinished relationships and the loss of control over one's story.",
            native:
              'మరణ భయం ఉనికి లేకపోవడం గురించి మాత్రమే కాదు; అసంపూర్ణ సంబంధాలు, ఒకరి జీవిత కథపై నియంత్రణ కోల్పోవడం గురించి కూడా ఉంటుంది.',
          },
          {
            en: 'An indefinitely extended life might postpone endings while leaving the problem of what deserves devotion unresolved.',
            native:
              'అనిర్దిష్టంగా పొడిగించిన జీవితం ముగింపులను వాయిదా వేయవచ్చు; అయితే దేనికి అంకితం కావడం తగినదనే సమస్యను పరిష్కరించకుండానే వదిలివేయవచ్చు.',
          },
        ],
      },
      hi: {
        word: 'मरणशीलता',
        question:
          'मरणशीलता का बोध अर्थ को कैसे आकार देता है, जबकि वह यह सिद्ध नहीं करता कि सीमितता या अमरता में से कोई भी जीवन को सार्थक बना देगी?',
        examples: [
          {
            en: 'Mortality gives choices urgency because committing to one path closes possibilities that cannot all be recovered.',
            native:
              'मरणशीलता विकल्पों को तात्कालिकता देती है, क्योंकि किसी एक राह के प्रति प्रतिबद्ध होना उन संभावनाओं को बंद करता है जिन्हें पूरी तरह वापस नहीं पाया जा सकता।',
          },
          {
            en: "Fear of death concerns not only nonexistence but also unfinished relationships and the loss of control over one's story.",
            native:
              'मृत्यु का भय केवल अस्तित्वहीनता से नहीं, बल्कि अधूरे संबंधों और अपनी कहानी पर नियंत्रण खोने से भी जुड़ा है।',
          },
          {
            en: 'An indefinitely extended life might postpone endings while leaving the problem of what deserves devotion unresolved.',
            native:
              'अनिश्चित काल तक बढ़ाया गया जीवन अंत को टाल सकता है, फिर भी यह प्रश्न अनसुलझा छोड़ सकता है कि समर्पण के योग्य क्या है।',
          },
        ],
      },
      es: {
        word: 'mortalidad',
        question:
          '¿Cómo moldea el sentido la conciencia de la mortalidad sin demostrar que la finitud o la inmortalidad harían que la vida mereciera la pena?',
        examples: [
          {
            en: 'Mortality gives choices urgency because committing to one path closes possibilities that cannot all be recovered.',
            native:
              'La mortalidad imprime urgencia a las elecciones porque comprometerse con un camino cierra posibilidades que no pueden recuperarse por completo.',
          },
          {
            en: "Fear of death concerns not only nonexistence but also unfinished relationships and the loss of control over one's story.",
            native:
              'El miedo a la muerte no atañe solo a dejar de existir, sino también a las relaciones inconclusas y a perder el control sobre la propia historia.',
          },
          {
            en: 'An indefinitely extended life might postpone endings while leaving the problem of what deserves devotion unresolved.',
            native:
              'Una vida prolongada indefinidamente podría aplazar los finales y dejar sin resolver qué merece nuestra entrega.',
          },
        ],
      },
      zh: {
        word: '必死性',
        question: '对必死性的认识如何塑造意义，而又不证明有限生命或永生中的任何一种必然让人生值得度过？',
        examples: [
          {
            en: 'Mortality gives choices urgency because committing to one path closes possibilities that cannot all be recovered.',
            native: '必死性使选择具有紧迫感，因为投身一条道路会关闭那些无法全部挽回的可能性。',
          },
          {
            en: "Fear of death concerns not only nonexistence but also unfinished relationships and the loss of control over one's story.",
            native: '对死亡的恐惧不仅关乎不复存在，也关乎未完成的关系以及失去对自身故事的掌控。',
          },
          {
            en: 'An indefinitely extended life might postpone endings while leaving the problem of what deserves devotion unresolved.',
            native: '无限延长的生命或许能推迟终结，却仍未解决什么值得人投入毕生心力的问题。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'transcendence',
    questionText:
      'Can transcendence be understood without invoking a supernatural realm, as an orientation beyond immediate self-interest?',
    translations: {
      te: {
        word: 'అతీతత్వం',
        question:
          'అతీంద్రియ లోకాన్ని ప్రస్తావించకుండా, తక్షణ స్వప్రయోజనాన్ని మించిన దిశానిర్దేశంగా అతీతత్వాన్ని అర్థం చేసుకోవచ్చా?',
        examples: [
          {
            en: 'Transcendence may arise when a person locates private suffering within a purpose that exceeds personal survival.',
            native:
              'వ్యక్తిగత మనుగడను మించిన లక్ష్యంలో తన వ్యక్తిగత బాధకు స్థానం కల్పించినప్పుడు ఒకరిలో అతీతత్వం ఉద్భవించవచ్చు.',
          },
          {
            en: 'Art can interrupt habitual perception and disclose possibilities that ordinary instrumental reasoning overlooks.',
            native: 'కళ అలవాటైన గ్రహణాన్ని నిలిపివేసి, సాధారణ సాధనాత్మక తర్కం విస్మరించే అవకాశాలను వెల్లడించగలదు.',
          },
          {
            en: 'Secular transcendence remains vulnerable to becoming another absolute unless it preserves doubt and plurality.',
            native:
              'సందేహాన్ని, బహుళత్వాన్ని కాపాడుకోకపోతే లౌకిక అతీతత్వం మరొక నిరపేక్ష సత్యంగా మారే ప్రమాదంలో ఉంటుంది.',
          },
        ],
      },
      hi: {
        word: 'अतिक्रमण',
        question:
          'क्या किसी अलौकिक लोक का आह्वान किए बिना अतिक्रमण को तात्कालिक स्वार्थ से परे उन्मुखता के रूप में समझा जा सकता है?',
        examples: [
          {
            en: 'Transcendence may arise when a person locates private suffering within a purpose that exceeds personal survival.',
            native:
              'अतिक्रमण तब उत्पन्न हो सकता है जब कोई व्यक्ति निजी पीड़ा को व्यक्तिगत अस्तित्व से बड़े किसी उद्देश्य में स्थान देता है।',
          },
          {
            en: 'Art can interrupt habitual perception and disclose possibilities that ordinary instrumental reasoning overlooks.',
            native:
              'कला अभ्यस्त अनुभूति को बाधित करके उन संभावनाओं को प्रकट कर सकती है जिन्हें सामान्य साधनपरक तर्क अनदेखा कर देता है।',
          },
          {
            en: 'Secular transcendence remains vulnerable to becoming another absolute unless it preserves doubt and plurality.',
            native:
              'यदि वह संदेह और बहुलता को सुरक्षित न रखे, तो लौकिक अतिक्रमण के एक और निरपेक्ष सत्य बन जाने का खतरा रहता है।',
          },
        ],
      },
      es: {
        word: 'trascendencia',
        question:
          '¿Puede entenderse la trascendencia, sin invocar un ámbito sobrenatural, como una orientación más allá del interés propio inmediato?',
        examples: [
          {
            en: 'Transcendence may arise when a person locates private suffering within a purpose that exceeds personal survival.',
            native:
              'La trascendencia puede surgir cuando una persona sitúa su sufrimiento privado dentro de un propósito que excede la supervivencia personal.',
          },
          {
            en: 'Art can interrupt habitual perception and disclose possibilities that ordinary instrumental reasoning overlooks.',
            native:
              'El arte puede interrumpir la percepción habitual y revelar posibilidades que el razonamiento instrumental ordinario pasa por alto.',
          },
          {
            en: 'Secular transcendence remains vulnerable to becoming another absolute unless it preserves doubt and plurality.',
            native:
              'La trascendencia secular corre el riesgo de convertirse en otro absoluto si no preserva la duda y la pluralidad.',
          },
        ],
      },
      zh: {
        word: '超越',
        question: '能否不诉诸超自然领域，而把超越理解为一种朝向即时自我利益之外的取向？',
        examples: [
          {
            en: 'Transcendence may arise when a person locates private suffering within a purpose that exceeds personal survival.',
            native: '当一个人把自身痛苦置于超越个人生存的目标之中时，超越或许由此产生。',
          },
          {
            en: 'Art can interrupt habitual perception and disclose possibilities that ordinary instrumental reasoning overlooks.',
            native: '艺术可以打断习惯性的感知，并揭示普通工具理性所忽视的可能性。',
          },
          {
            en: 'Secular transcendence remains vulnerable to becoming another absolute unless it preserves doubt and plurality.',
            native: '世俗的超越若不能保留怀疑与多元性，就仍有可能变成另一种绝对。',
          },
        ],
      },
    },
  },
  {
    cefrLevel: 'C2',
    promptWord: 'absurdity',
    questionText:
      'If the universe offers no final justification, why need the resulting absurdity entail resignation rather than defiant commitment?',
    translations: {
      te: {
        word: 'అసంబద్ధత',
        question:
          'విశ్వం అంతిమ సమర్థనను ఇవ్వకపోతే, దాని నుంచి ఉద్భవించే అసంబద్ధత ధిక్కారపూర్వక నిబద్ధతకు బదులుగా నిరాశతో తలవంచడానికే ఎందుకు దారితీయాలి?',
        examples: [
          {
            en: 'The absurd emerges from the collision between the human demand for intelligibility and a world that supplies no final answer.',
            native:
              'అర్థం కావాలనే మానవ ఆకాంక్ష, అంతిమ సమాధానం ఇవ్వని ప్రపంచం పరస్పరం ఢీకొన్నప్పుడు అసంబద్ధత ఉద్భవిస్తుంది.',
          },
          {
            en: 'Revolt against absurdity consists in living lucidly without disguising uncertainty as cosmic purpose.',
            native: 'అనిశ్చితిని విశ్వ ప్రయోజనంగా ముసుగు వేయకుండా స్పష్టమైన ఎరుకతో జీవించడమే అసంబద్ధతపై తిరుగుబాటు.',
          },
          {
            en: 'Shared projects can generate local meaning even when no universal narrative guarantees their ultimate significance.',
            native:
              'ఏ సార్వత్రిక కథనమూ వాటి అంతిమ ప్రాముఖ్యతకు హామీ ఇవ్వకపోయినా, ఉమ్మడి ప్రయత్నాలు సందర్భోచిత అర్థాన్ని సృష్టించగలవు.',
          },
        ],
      },
      hi: {
        word: 'असंगति',
        question:
          'यदि ब्रह्मांड कोई अंतिम औचित्य नहीं देता, तो उससे उत्पन्न असंगति को विद्रोही प्रतिबद्धता के बजाय समर्पण ही क्यों आवश्यक बनाना चाहिए?',
        examples: [
          {
            en: 'The absurd emerges from the collision between the human demand for intelligibility and a world that supplies no final answer.',
            native:
              'असंगति उस मानवीय माँग और संसार के टकराव से उत्पन्न होती है जिसमें मनुष्य बोधगम्यता चाहता है, पर संसार कोई अंतिम उत्तर नहीं देता।',
          },
          {
            en: 'Revolt against absurdity consists in living lucidly without disguising uncertainty as cosmic purpose.',
            native:
              'अनिश्चितता को ब्रह्मांडीय उद्देश्य का मुखौटा पहनाए बिना स्पष्ट चेतना के साथ जीना ही असंगति के विरुद्ध विद्रोह है।',
          },
          {
            en: 'Shared projects can generate local meaning even when no universal narrative guarantees their ultimate significance.',
            native:
              'जब कोई सार्वभौमिक आख्यान उनके अंतिम महत्त्व की गारंटी नहीं देता, तब भी साझा प्रयास संदर्भगत अर्थ उत्पन्न कर सकते हैं।',
          },
        ],
      },
      es: {
        word: 'absurdo',
        question:
          'Si el universo no ofrece una justificación definitiva, ¿por qué el absurdo resultante habría de implicar resignación en vez de un compromiso desafiante?',
        examples: [
          {
            en: 'The absurd emerges from the collision between the human demand for intelligibility and a world that supplies no final answer.',
            native:
              'El absurdo surge de la colisión entre la exigencia humana de inteligibilidad y un mundo que no ofrece una respuesta definitiva.',
          },
          {
            en: 'Revolt against absurdity consists in living lucidly without disguising uncertainty as cosmic purpose.',
            native:
              'La rebelión contra el absurdo consiste en vivir con lucidez sin disfrazar la incertidumbre de propósito cósmico.',
          },
          {
            en: 'Shared projects can generate local meaning even when no universal narrative guarantees their ultimate significance.',
            native:
              'Los proyectos compartidos pueden generar un sentido local aunque ninguna narrativa universal garantice su significado último.',
          },
        ],
      },
      zh: {
        word: '荒诞性',
        question: '如果宇宙并不提供终极理由，由此产生的荒诞为何必然导向顺从，而不能激发反抗性的投入？',
        examples: [
          {
            en: 'The absurd emerges from the collision between the human demand for intelligibility and a world that supplies no final answer.',
            native: '荒诞源于人类对可理解性的要求与一个不提供终极答案的世界之间的碰撞。',
          },
          {
            en: 'Revolt against absurdity consists in living lucidly without disguising uncertainty as cosmic purpose.',
            native: '反抗荒诞意味着清醒地生活，而不把不确定性伪装成宇宙目的。',
          },
          {
            en: 'Shared projects can generate local meaning even when no universal narrative guarantees their ultimate significance.',
            native: '即使没有普遍叙事保证其终极意义，共同事业仍能产生局部而具体的意义。',
          },
        ],
      },
    },
  },
];
