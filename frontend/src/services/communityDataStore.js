/**
 * communityDataStore.js
 * Centralized, persistent client-side data store for Krishi Sahayak Community module.
 * Grounded in agricultural terminology with realistic multi-lingual mock data for:
 * Rice, Tomato, Chilli, Cotton, and Mango.
 */

import {
  getCommunityPosts as apiGetCommunityPosts,
  createCommunityPost as apiCreateCommunityPost,
  addCommunityComment as apiAddCommunityComment,
  markCommunityCommentHelpful as apiMarkCommentHelpful,
  getClusters as apiGetClusters,
  getNearbyCommunityIncidents as apiGetNearbyIncidents,
} from './api';

const STORAGE_KEYS = {
  POSTS: 'krishi_community_posts_real_v12',
  GROUPS: 'krishi_community_groups_real_v12',
  PROBLEMS: 'krishi_community_problems_real_v12',
  NOTIFICATIONS: 'krishi_farmer_notifications_real_v12',
  ANNOUNCEMENTS: 'krishi_aeo_announcements_real_v12',
  USER_INTERACTIONS: 'krishi_user_community_interactions_real_v12',
};

// Auto-purge all legacy mock data keys from browser localStorage
try {
  const legacyKeys = [
    'krishi_community_posts_v2',
    'krishi_community_problems_v2',
    'krishi_community_posts_v1',
    'krishi_community_problems_v1',
    'krishi_community_posts_real_v3',
    'krishi_community_posts_real_v4',
    'krishi_community_posts_real_v5',
    'krishi_community_problems_real_v5',
    'krishi_community_posts_real_v6',
    'krishi_community_problems_real_v6',
    'krishi_community_posts_real_v7',
    'krishi_community_problems_real_v7',
    'krishi_community_posts_real_v8',
    'krishi_community_problems_real_v8',
    'krishi_community_posts_real_v9',
    'krishi_community_problems_real_v9',
    'krishi_community_posts_real_v10',
    'krishi_community_problems_real_v10',
    'krishi_community_groups_real_v10',
    'krishi_farmer_notifications_real_v10',
    'krishi_aeo_announcements_real_v10',
    'krishi_community_posts_real_v11',
    'krishi_community_problems_real_v11',
    'krishi_community_groups_real_v11',
  ];
  legacyKeys.forEach((k) => localStorage.removeItem(k));
} catch (e) {
  // Ignore in environments without window.localStorage
}

// =============================================================================
// REALISTIC SEED DATA (Telugu, Hindi, English) - Real Peer Complaints & Supabase Photos
// =============================================================================

export const INITIAL_POSTS = [
  {
    id: '6ef0733d-fce0-40f9-b110-3ba79c990767',
    crop: 'Cotton',
    crop_icon: '🌿',
    author: {
      id: '1eea58d8-1b6e-40eb-93d9-5bf4b0c360bb',
      name: 'Venkat',
      village: 'Ghatkesar',
      mandal: 'Ghatkesar',
      district: 'Medchal–Malkajgiri',
      phone: '+919182765951',
      helpful_count: 4,
    },
    title: 'పత్తి పంటలో ఆకుల మీద తెల్లటి మచ్చలు & ఆకు ముడుత సమస్య',
    content: {
      te: 'నా పత్తి పంటలో ఆకుల మీద తెల్లటి మచ్చలు వస్తున్నాయి ఆకులు ముడుచుక్కుపోతున్నాయి పంట పెరుగుదల కూడా తగ్గిపోయింది దీనికి ఏ మందు వాడాలి',
      hi: 'कपास की फसल में पत्तियों पर सफेद धब्बे आ रहे हैं, पत्तियां मुड़ रही हैं और पौधे की वृद्धि रुक गई है। कौन सी दवा का उपयोग करें?',
      en: 'White spots appearing on cotton leaves with upward leaf curling and stunted growth. What treatment should be sprayed?',
    },
    original_language: 'te',
    approximate_location: 'Ghatkesar (~3.2 km away)',
    severity: 'High',
    created_at: '2026-09-04T16:15:00.000000+00:00',
    photo_url: 'https://hepiillbuwdnacmgqkzq.supabase.co/storage/v1/object/public/incident-photos/626504e8-250c-4fc3-9c1b-37c20c508d77_WhatsApp_Image_2026-09-04_at_16.11.18.jpeg',
    has_voice: true,
    voice_duration: '0:22',
    is_submitted_problem: true,
    related_incident_ref: '6EF0733D',
    worked_for_me_count: 5,
    has_user_worked_for_me: false,
    comments: [
      {
        id: 'comm-1-1',
        author: {
          name: 'Srinivas Rao (AEO Ghatkesar)',
          village: 'Ghatkesar Mandal',
          role: 'Agricultural Extension Officer',
          is_officer: true,
          badge: '🛡️ Official AEO Advisory',
        },
        content: {
          te: 'పత్తి పంటలో తెల్లదోమ మరియు శిలీంధ్ర తెగులు నివారణకు ఎసిఫేట్ 75% SP (1.5 గ్రా/లీ) లేదా డైఫెన్‌థియురాన్ 50% WP (1.25 గ్రా/లీ) పిచికారీ చేయండి. ఎకరానికి 15 పసుపు జిగురు అట్టలు అమర్చండి.',
          hi: 'कपास में सफेद मक्खी और फंगल संक्रमण के लिए एसीफेट 75% SP (1.5 ग्रा/ली) या डायाफेन्थियूरोन 50% WP (1.25 ग्रा/ली) का छिड़काव करें। प्रति एकड़ 15 पीले स्टिकी कार्ड लगाएं।',
          en: 'For whitefly vector and fungal spotting in cotton, spray Acephate 75% SP @ 1.5 g/L or Diafenthiuron 50% WP @ 1.25 g/L. Install 15 Yellow Sticky Traps per acre.',
        },
        original_language: 'te',
        created_at: '2026-09-04T16:40:00.000Z',
        has_voice: true,
        voice_duration: '0:24',
        worked_for_me_count: 6,
        has_user_worked_for_me: false,
        is_officer: true,
      },
      {
        id: 'comm-peer-cotton-1',
        author: {
          name: 'Anil Reddy',
          village: 'Choppadandi',
          role: 'Farmer',
          is_officer: false,
        },
        content: {
          te: 'పైరిప్రాక్సిఫెన్ తో పాటు వేపనూనె కలిపి పిచికారీ చేస్తే గుడ్ల దశలోనే పురుగులు నశించి 3 రోజుల్లో మార్పు కనిపించింది.',
          hi: 'नीम तेल और कीटनाशक का मिश्रण बहुत असरदार रहा।',
          en: 'Mixing Pyriproxyfen with neem oil destroyed nymphal stages effectively within 3 days.',
        },
        original_language: 'te',
        created_at: '2026-09-04T17:15:00.000Z',
        has_voice: false,
        worked_for_me_count: 4,
        has_user_worked_for_me: false,
        is_officer: false,
      },
    ],
  },
  {
    id: 'd003bb53-2542-41cf-a0c5-11ad1a6b144c',
    crop: 'Chilli',
    crop_icon: '🌶️',
    author: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Anil Reddy',
      village: 'Choppadandi',
      mandal: 'Choppadandi',
      district: 'Karimnagar',
      phone: '+919876543211',
      helpful_count: 5,
    },
    title: 'మిరపలో ఆకు ముడుత మరియు తామర పురుగుల ఉధృతి',
    content: {
      te: 'నమస్కారం సార్ నా మెరుపు బండలో ఆకులు ముడుచుకుపోతున్నాయి గత నాలుగు ఐదు రోజుల నుండి సమస్య ఇలాగే ఉంది కొన్ని పూలు కూడా రాలిపోతున్నాయి',
      hi: 'मिर्च के खेत में पत्तियां मुड़ रही हैं और फूल झड़ रहे हैं।',
      en: 'Severe leaf curl and flower drop observed across chilli field over the past 4-5 days.',
    },
    original_language: 'te',
    approximate_location: 'Choppadandi (~0.4 km away)',
    severity: 'High',
    created_at: '2026-09-05T01:10:00.000000+00:00',
    photo_url: 'https://hepiillbuwdnacmgqkzq.supabase.co/storage/v1/object/public/incident-photos/415a7129-a1b4-411b-9b88-5426f7fa7c43_mirchi_deseased.jpeg',
    has_voice: true,
    voice_duration: '0:20',
    is_submitted_problem: true,
    related_incident_ref: 'D003BB53',
    worked_for_me_count: 5,
    has_user_worked_for_me: false,
    comments: [
      {
        id: 'comm-aeo-chilli-1',
        author: {
          name: 'Srinivas Rao (AEO Ghatkesar)',
          village: 'Ghatkesar Mandal',
          role: 'Agricultural Extension Officer',
          is_officer: true,
          badge: '🛡️ Official AEO Advisory',
        },
        content: {
          te: 'మిరపలో ఆకు ముడుత మరియు నల్లి/తామర పురుగుల నివారణకు ఫిప్రోనిల్ 5% SC (2 ml/లీ) లేదా డైఫెన్‌థియురాన్ 50% WP (1.25 గ్రా/లీ) పిచికారీ చేయండి.',
          hi: 'मिर्च में थ्रिप्स और लीफ कर्ल के लिए फिप्रोनिल 5% SC (2 ml/L) या डायाफेन्थियूरोन (1.25 g/L) का छिड़काव करें।',
          en: 'For thrips and leaf curl control in chilli, spray Fipronil 5% SC @ 2 ml/L or Diafenthiuron 50% WP @ 1.25 g/L.',
        },
        original_language: 'te',
        created_at: '2026-09-05T01:30:00.000Z',
        has_voice: true,
        voice_duration: '0:21',
        worked_for_me_count: 7,
        has_user_worked_for_me: false,
        is_officer: true,
      },
      {
        id: 'comm-peer-chilli-1',
        author: {
          name: 'Ramesh Goud',
          village: 'Ghatkesar Mandal',
          role: 'Farmer',
          is_officer: false,
        },
        content: {
          te: 'నేను కూడా వేప నూనె 10000 ppm (2 ml/లీ) కలిపి కొట్టాను, 4 రోజుల్లో కొత్త చిగుర్లు బాగా వచ్చాయి.',
          hi: 'नीम तेल 10000 ppm के साथ छिड़काव से 4 दिनों में नई कोपलें स्वस्थ आईं।',
          en: 'Sprayed neem oil 10000 ppm @ 2 ml/L; noticed healthy new flush within 4 days.',
        },
        original_language: 'te',
        created_at: '2026-09-05T02:00:00.000Z',
        has_voice: false,
        worked_for_me_count: 4,
        has_user_worked_for_me: false,
        is_officer: false,
      },
    ],
  },
  {
    id: 'e693a496-d665-45a7-9023-d9186e35fd71',
    crop: 'Tomato',
    crop_icon: '🍅',
    author: {
      id: '49288482-9f8f-4cc7-a922-15c7641ccee3',
      name: 'Spoorthi',
      village: 'Padamati Sai Guda',
      mandal: 'Ghatkesar',
      district: 'Medchal–Malkajgiri',
      phone: '+918074537230',
      helpful_count: 4,
    },
    title: 'టమాటా ఆకులపై గుండ్రని గోధుమ రంగు మచ్చలు',
    content: {
      te: 'నా టమాటా మొక్క ఆకుల మీద గుండ్రంగా గోధుమ రంగు మచ్చలు ఉన్నాయి ఈ సమస్య ఐదు రోజులుగా ఉంది మచ్చలు రోజు రోజుకి పెరుగుతున్నాయి మరియు కొన్ని ఆకులు ఎండిపోతున్నాయి',
      hi: 'टमाटर की पत्तियों पर गोल भूरे धब्बे हैं, जो फैल रहे हैं और पत्तियां सूख रही हैं।',
      en: 'Circular brown spots observed on tomato foliage spreading daily and drying lower canopy.',
    },
    original_language: 'te',
    approximate_location: 'Padamati Sai Guda (~1.8 km away)',
    severity: 'High',
    created_at: '2026-09-04T23:19:00.000000+00:00',
    photo_url: 'https://hepiillbuwdnacmgqkzq.supabase.co/storage/v1/object/public/incident-photos/e693a496-d665-45a7-9023-d9186e35fd71_tomato-desease.png',
    has_voice: true,
    voice_duration: '0:25',
    is_submitted_problem: true,
    related_incident_ref: '32D7F7AA',
    worked_for_me_count: 4,
    has_user_worked_for_me: false,
    comments: [
      {
        id: 'comm-aeo-tomato-1',
        author: {
          name: 'Srinivas Rao (AEO Ghatkesar)',
          village: 'Ghatkesar Mandal',
          role: 'Agricultural Extension Officer',
          is_officer: true,
          badge: '🛡️ Official AEO Advisory',
        },
        content: {
          te: 'టమాటాలో ఆకు మచ్చ లేదా ముందస్తు మాడ తెగులు నివారణకు మాంకోజెబ్ 75% WP (2.5 గ్రా/లీ) లేదా అజాక్సిస్ట్రోబిన్ (1 ml/లీ) పిచికారీ చేయండి.',
          hi: 'टमाटर में अगेती झुलसा और पत्ती धब्बा हेतु मैंकोजेब 75% WP (2.5 g/L) या एज़ोक्सीस्ट्रोबिन (1 ml/L) का छिड़काव करें।',
          en: 'For early blight and fungal leaf spots in tomato, spray Mancozeb 75% WP @ 2.5 g/L or Azoxystrobin @ 1 ml/L.',
        },
        original_language: 'te',
        created_at: '2026-09-04T23:45:00.000Z',
        has_voice: true,
        voice_duration: '0:22',
        worked_for_me_count: 5,
        has_user_worked_for_me: false,
        is_officer: true,
      },
      {
        id: 'comm-peer-tomato-1',
        author: {
          name: 'Ramesh Goud',
          village: 'Ghatkesar Mandal',
          role: 'Farmer',
          is_officer: false,
        },
        content: {
          te: 'కింది ఆకులను తుంచి వేసి మాంకోజెబ్ స్ప్రే చేశాను, మచ్చలు పై ఆకులకు పాకకుండా పూర్తిగా ఆగిపోయాయి.',
          hi: 'निचली बीमार पत्तियां तोड़कर फेंकने और स्प्रे करने से रोग ऊपर नहीं फैला।',
          en: 'Plucked the lower affected leaves before spraying Mancozeb; prevented the spores from splashing to upper canopy.',
        },
        original_language: 'te',
        created_at: '2026-09-05T00:10:00.000Z',
        has_voice: false,
        worked_for_me_count: 4,
        has_user_worked_for_me: false,
        is_officer: false,
      },
    ],
  },
  {
    id: '49aa0438-1bbc-434c-aa2d-f8acd3da0c2e',
    crop: 'Paddy',
    crop_icon: '🌾',
    author: {
      id: '49288482-9f8f-4cc7-a922-15c7641ccee3',
      name: 'Spoorthi',
      village: 'Padamati Sai Guda',
      mandal: 'Ghatkesar',
      district: 'Medchal–Malkajgiri',
      phone: '+918074537230',
      helpful_count: 3,
    },
    title: 'వరి పంటలో ఆకుల మీద గోధుమ రంగు మచ్చలు & ఎండడం',
    content: {
      te: 'నా వరి పంటలో ఆకుల మీద గోధుమ రంగు మచ్చలు వస్తున్నాయి ఆకులు ఎండిపోతున్నాయి మొక్కలు కూడా బలహీనంగా కనిపిస్తున్నాయి దీనికి ఏ మందు వాడాలి',
      hi: 'धान की फसल में पत्तियों पर भूरे धब्बे आ रहे हैं और पत्तियां सूख रही हैं।',
      en: 'Brown spots appearing on paddy leaves and leaves are drying up.',
    },
    original_language: 'te',
    approximate_location: 'Padamati Sai Guda (~2.5 km away)',
    severity: 'Medium',
    created_at: '2026-09-04T22:11:00.000000+00:00',
    photo_url: 'https://hepiillbuwdnacmgqkzq.supabase.co/storage/v1/object/public/incident-photos/dba6dec2-ed93-4b9a-a1b2-f8811b418f30_WhatsApp_Image_2026-09-05_at_03.40.46__1_.jpeg',
    has_voice: true,
    voice_duration: '0:23',
    is_submitted_problem: true,
    related_incident_ref: '49AA0438',
    worked_for_me_count: 4,
    has_user_worked_for_me: false,
    comments: [
      {
        id: 'comm-aeo-paddy-1',
        author: {
          name: 'Srinivas Rao (AEO Ghatkesar)',
          village: 'Ghatkesar Mandal',
          role: 'Agricultural Extension Officer',
          is_officer: true,
          badge: '🛡️ Official AEO Advisory',
        },
        content: {
          te: 'వరిలో అగ్గి తెగులు లేదా గోధుమ మచ్చల నివారణకు ట్రైసైక్లాజోల్ 75% WP (0.6 గ్రా/లీ) లేదా హెక్సాకోనాజోల్ 5% EC (2 ml/లీ) పిచికారీ చేయండి.',
          hi: 'धान में भूरे धब्बे और ब्लास्ट के लिए ट्राइसाइक्लाजोल 75% WP (0.6 ग्रा/ली) का छिड़काव करें।',
          en: 'For leaf blast / brown spot in paddy, spray Tricyclazole 75% WP @ 0.6 g/L or Hexaconazole 5% EC @ 2 ml/L.',
        },
        original_language: 'te',
        created_at: '2026-09-04T22:35:00.000Z',
        has_voice: true,
        voice_duration: '0:20',
        worked_for_me_count: 5,
        has_user_worked_for_me: false,
        is_officer: true,
      },
      {
        id: 'comm-peer-paddy-1',
        author: {
          name: 'Venkat',
          village: 'Ghatkesar',
          role: 'Farmer',
          is_officer: false,
        },
        content: {
          te: 'వరి పొలంలో నీటి నిల్వను తగ్గించి ఆరుతడులు ఇవ్వడం ద్వారా తెగుళ్ల వ్యాప్తి త్వరగా తగ్గింది.',
          hi: 'धान के खेत में जल निकास सुनिश्चित करने से रोग फैलाव में कमी आई।',
          en: 'Intermittent drying and wetting of paddy fields significantly reduced fungal spread.',
        },
        original_language: 'te',
        created_at: '2026-09-04T23:05:00.000Z',
        has_voice: false,
        worked_for_me_count: 3,
        has_user_worked_for_me: false,
        is_officer: false,
      },
    ],
  },
];

// =============================================================================
// FARMER GROUPS SEED DATA (Crop-wise + Nearby with distances)
// =============================================================================

export const INITIAL_GROUPS = [
  // Plant / Crop-wise Groups
  {
    id: 'group-crop-rice',
    type: 'CROP',
    crop: 'Rice',
    icon: '🌾',
    name: {
      te: 'వరి సాగుదారుల సమూహం',
      hi: 'धान उत्पादक किसान समूह',
      en: 'Rice Cultivators Circle',
    },
    description: {
      te: 'వరి నాట్లు, అగ్గి తెగులు నివారణ, నీటి యాజమాన్యం మరియు ఎరువుల నిర్వహణపై చర్చ.',
      hi: 'धान की रोपाई, रोग नियंत्रण, जल प्रबंधन और संतुलित खाद उपयोग पर संवाद।',
      en: 'Discussions on paddy transplantation, blast management, SRI techniques, and fertilizer management.',
    },
    member_count: 482,
    aeo_present: true,
    aeo_name: 'Srinivas Rao (AEO Medchal)',
    is_joined: true,
    recent_activity: '12 minutes ago',
    sample_discussions_count: 24,
  },
  {
    id: 'group-crop-maize',
    type: 'CROP',
    crop: 'Maize',
    icon: '🌽',
    name: {
      te: 'మొక్కజొన్న రైతుల సంఘం',
      hi: 'मक्का किसान संघ',
      en: 'Maize Farmers Forum',
    },
    description: {
      te: 'కత్తెర పురుగు నివారణ, సమతుల్య పోషకాల యాజమాన్యం మరియు కంకుల పెరుగుదల సూచనలు.',
      hi: 'फॉल आर्मीवर्म नियंत्रण, संतुलित पोषण और भुट्टे के विकास के सुझाव।',
      en: 'Fall armyworm control, balanced nutrition, and cob development management.',
    },
    member_count: 326,
    aeo_present: true,
    aeo_name: 'Srinivas Rao (AEO Medchal)',
    is_joined: false,
    recent_activity: '35 minutes ago',
    sample_discussions_count: 19,
  },
  {
    id: 'group-crop-chilli',
    type: 'CROP',
    crop: 'Chilli',
    icon: '🌶️',
    name: {
      te: 'మిరప సాగుదారుల వేదిక',
      hi: 'मिर्च किसान मंच',
      en: 'Chilli Cultivators Hub',
    },
    description: {
      te: 'నల్ల తామర పురుగు నివారణ, డ్రిప్ ఎరువులు, ఆరబెట్టే పద్ధతులపై క్షేత్ర స్థాయి అనుభవాలు.',
      hi: 'काली थ्रिप्स प्रबंधन, ड्रिप फर्टिगेशन और उन्नत तुड़ाई विधियों पर अनुभव साझा।',
      en: 'Black thrips integrated pest management, fertigation, and post-harvest drying.',
    },
    member_count: 298,
    aeo_present: true,
    aeo_name: 'K. Sunitha (AEO Ghatkesar)',
    is_joined: true,
    recent_activity: '1 hour ago',
    sample_discussions_count: 16,
  },
  {
    id: 'group-crop-cotton',
    type: 'CROP',
    crop: 'Cotton',
    icon: '🌿',
    name: {
      te: 'పత్తి రైతుల మండలి',
      hi: 'कपास किसान परिषद',
      en: 'Cotton Farmers Council',
    },
    description: {
      te: 'గులాబీ రంగు కాయ తొలుచు పురుగు, ఎర పంటలు, సీసీఐ కొనుగోలు కేంద్రాల వివరాలు.',
      hi: 'गुलाबी सुंडी नियंत्रण, फेरोमोन ट्रैप और सीसीआई खरीद केंद्रों की जानकारी।',
      en: 'Pink bollworm pheromone trapping, trap cropping, and MSP procurement details.',
    },
    member_count: 415,
    aeo_present: false,
    is_joined: false,
    recent_activity: '3 hours ago',
    sample_discussions_count: 14,
  },
  {
    id: 'group-crop-mango',
    type: 'CROP',
    crop: 'Mango',
    icon: '🥭',
    name: {
      te: 'మామిడి తోటల బృందం',
      hi: 'आम बागवान समूह',
      en: 'Mango Orchard Keepers',
    },
    description: {
      te: 'బేనిషాన్, హిమాయత్ రకాల పూత రక్షణ, సూక్ష్మధాతు లోపాల సవరణ మరియు కాయ సైజు పెంపు.',
      hi: 'आम के बौर की सुरक्षा, तेला कीट नियंत्रण और फल विकास हेतु छिड़काव।',
      en: 'Blossom protection, mango hopper management, micronutrient sprays, and fruit fly traps.',
    },
    member_count: 194,
    aeo_present: true,
    aeo_name: 'Dr. V. Prasad (Horticulture Officer)',
    is_joined: false,
    recent_activity: '5 hours ago',
    sample_discussions_count: 9,
  },

  // Nearby Groups with configurable distance
  {
    id: 'group-nearby-1',
    type: 'NEARBY',
    crop: 'Cotton',
    icon: '🌿',
    name: {
      te: 'ఘట్కేసర్ పత్తి సాగుదారులు',
      hi: 'घटकेसर कपास किसान',
      en: 'Ghatkesar Cotton Farmers',
    },
    distance_km: 3.2,
    approximate_locality: 'Padamati Sai Guda & Ghatkesar',
    member_count: 142,
    aeo_present: true,
    aeo_name: 'Srinivas Rao (AEO)',
    is_joined: true,
    recent_activity: '8 mins ago',
  },
  {
    id: 'group-nearby-2',
    type: 'NEARBY',
    crop: 'Rice',
    icon: '🌾',
    name: {
      te: 'ఏదులాబాద్ వరి రైతులు',
      hi: 'एदुलाबाद धान किसान',
      en: 'Edulabad Rice Farmers',
    },
    distance_km: 5.7,
    approximate_locality: 'Edulabad Village Cluster',
    member_count: 218,
    aeo_present: true,
    aeo_name: 'Srinivas Rao (AEO)',
    is_joined: false,
    recent_activity: '45 mins ago',
  },
  {
    id: 'group-nearby-3',
    type: 'NEARBY',
    crop: 'Chilli',
    icon: '🌶️',
    name: {
      te: 'పోచారం మిరప రైతుల క్లస్టర్',
      hi: 'पोचारम मिर्च किसान क्लस्टर',
      en: 'Pocharam Chilli Cluster',
    },
    distance_km: 8.4,
    approximate_locality: 'Pocharam & Korremula',
    member_count: 95,
    aeo_present: false,
    is_joined: false,
    recent_activity: '2 hours ago',
  },
  {
    id: 'group-nearby-4',
    type: 'NEARBY',
    crop: 'Cotton',
    icon: '🌿',
    name: {
      te: 'కీసర పత్తి రైతుల సంఘం',
      hi: 'कीसस कपास किसान संघ',
      en: 'Keesara Cotton Growers',
    },
    distance_km: 14.2,
    approximate_locality: 'Keesara Mandal',
    member_count: 310,
    aeo_present: true,
    aeo_name: 'R. Shekhar (AEO Keesara)',
    is_joined: false,
    recent_activity: '4 hours ago',
  },
  {
    id: 'group-nearby-5',
    type: 'NEARBY',
    crop: 'Mango',
    icon: '🥭',
    name: {
      te: 'మేడ్చల్ మామిడి ఉత్పత్తిదారులు',
      hi: 'मेदचल आम उत्पादक',
      en: 'Medchal Mango Producers',
    },
    distance_km: 22.8,
    approximate_locality: 'Medchal North Cluster',
    member_count: 168,
    aeo_present: true,
    aeo_name: 'Dr. V. Prasad',
    is_joined: false,
    recent_activity: '6 hours ago',
  },
];

// =============================================================================
// PROBLEM CLUSTERS SEED DATA (Grounded in ICAR/ANGRAU Diagnostics)
// =============================================================================

export const INITIAL_PROBLEMS = [
  {
    id: 'prob-cluster-1',
    title: {
      te: '🚨 పత్తి ఆకు ముడుత & తెల్లటి మచ్చల సమూహ వ్యాప్తి (పడమటి సాయి గూడ)',
      hi: '🚨 कपास लीफ कर्ल और सफेद धब्बे क्लस्टर (पदमती साई गुड़ा)',
      en: '🚨 Cotton Leaf Curl & White Spotting Cluster (Padamati Sai Guda)',
    },
    crop: 'Cotton',
    crop_icon: '🌿',
    status: 'AEO Verified',
    status_code: 'AEO_VERIFIED',
    affected_farmers_count: 4,
    affected_mandals_count: 1,
    approximate_area: 'Padamati Sai Guda, Medchal–Malkajgiri',
    total_reports_count: 4,
    first_reported: 'Yesterday',
    latest_activity: '10 mins ago',
    user_facing_this_too: false,
    symptoms: {
      te: 'పత్తి పంటలో ఆకుల మీద తెల్లటి మచ్చలు, ఆకులు పైకి ముడుచుకుపోవడం మరియు పంట పెరుగుదల మందగించడం. క్షేత్ర పరిశీలనలో తెల్లదోమ వ్యాప్తి నిర్ధారించబడింది.',
      hi: 'कपास की पत्तियों पर सफेद धब्बे, पत्तियों का ऊपर की ओर मुड़ना और वृद्धि रुकना। सफेद मक्खी का प्रकोप देखा गया।',
      en: 'White spots on cotton leaves, upward leaf curling, and stunted crop growth across local cotton fields.',
    },
    aeo_verified_response: {
      officer_name: 'Srinivas Rao',
      officer_id: 'AEO-MDCL-014',
      designation: 'Agricultural Extension Officer, Ghatkesar Mandal',
      verification_date: 'Verified Recently',
      summary: {
        te: 'పత్తి పొలాల్లో తెల్లదోమ వ్యాప్తి వల్ల ఆకు ముడుత మరియు శిలీంధ్ర తెగులు నిర్ధారించబడింది. సమగ్ర సస్యరక్షణ చర్యలు తక్షణమే చేపట్టండి.',
        hi: 'कपास के खेतों में सफेद मक्खी के प्रकोप की पुष्टि हुई। तत्काल समन्वित छिड़काव अपनाएं।',
        en: 'Field inspection in Ghatkesar confirmed whitefly infestation and leaf spotting in cotton. Immediate coordinated spraying recommended.',
      },
      recommended_action: {
        te: '1. ఎసిఫేట్ 75% SP (1.5 గ్రా/లీటర్) లేదా డైఫెన్‌థియురాన్ 50% WP (1.25 గ్రా/లీటర్) పిచికారీ చేయండి.\\n2. ఎకరానికి 15 పసుపు జిగురు అట్టలు అమర్చండి.',
        hi: '1. एसीफेट 75% SP (1.5 ग्रा/ली) या डायाफेन्थियूरोन 50% WP (1.25 ग्रा/ली) का छिड़काव करें।\\n2. प्रति एकड़ 15 पीले स्टिकी कार्ड लगाएं।',
        en: '1. Spray Acephate 75% SP @ 1.5 g/L or Diafenthiuron 50% WP @ 1.25 g/L.\\n2. Install 15 Yellow Sticky Traps per acre.',
      },
    },
    timeline: [
      { step: '1. Local farmer complaints logged with photos', date: 'Yesterday' },
      { step: '2. Spatial cluster established', date: 'Yesterday' },
      { step: '3. AEO field assessment conducted', date: 'Today' },
      { step: '4. Official AEO verified advisory published', date: 'Active' },
    ],
  },
  {
    id: 'prob-cluster-2',
    crop: 'Rice',
    crop_icon: '🌾',
    status: 'Emerging Problem',
    status_code: 'EMERGING_PROBLEM',
    urgency: 'Moderate',
    affected_farmers_count: 2,
    affected_mandals_count: 1,
    approximate_area: 'Edulabad (~3.8 km away)',
    total_reports_count: 2,
    first_reported: 'Recently',
    latest_activity: '1 hour ago',
    user_facing_this_too: false,
    title: {
      te: '🚨 వరి ఆకు మచ్చలు & అంచులు ఎండిపోవడం (ఎదులాబాద్)',
      hi: '🚨 धान में पत्ती धब्बे और झुलसा (एदुलाबाद)',
      en: '🚨 Paddy Leaf Spotting & Margin Drying (Edulabad)',
    },
    symptoms: {
      te: 'వరి పంటలో ఆకుల మీద గోధుమ రంగు మచ్చలు వస్తున్నాయి మరియు ఆకుల అంచులు ఎండిపోతున్నాయి.',
      hi: 'धान की फसल में पत्तियों पर भूरे धब्बे आ रहे हैं और किनारे सूख रहे हैं।',
      en: 'Brown spots appearing on paddy leaves and leaf margins are drying up.',
    },
    photo_url: null,
    timeline: [
      { step: '1. Incident logged with farmer complaint', date: 'Recently' },
      { step: '2. AEO investigation queued for field visit', date: 'Active' },
    ],
  },
];

// =============================================================================
// GLOBAL NOTIFICATIONS SEED DATA (For Main Farmer Home)
// =============================================================================

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    category: 'AEO_UPDATE', // AEO_UPDATE | AEO_ANNOUNCEMENT | COMMUNITY
    title: {
      te: '🛡️ AEO మీ సమస్యను పరిశీలించారు',
      hi: '🛡️ AEO ने आपकी समस्या की समीक्षा की',
      en: '🛡️ AEO Reviewed Your Field Problem',
    },
    message: {
      te: 'అధికారి శ్రీనివాస్ రావు మీ పత్తి ఆకు ముడుత సమస్యపై అధికారిక సిఫార్సును జారీ చేశారు.',
      hi: 'कृषि अधिकारी श्रीनिवास राव ने आपके कपास लीफ कर्ल पर आधिकारिक सलाह जारी की।',
      en: 'AEO Srinivas Rao issued verified management advice for your Cotton Leaf Curl complaint.',
    },
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: false,
    action_type: 'PROBLEM_DETAIL',
    target_id: 'prob-cluster-1',
  },
  {
    id: 'notif-2',
    category: 'AEO_ANNOUNCEMENT',
    title: {
      te: '📢 అధికారిక వ్యవసాయ హెచ్చరిక (వర్షపాతం & తెగుళ్లు)',
      hi: '📢 आधिकारिक कृषि परामर्श (भारी वर्षा और कीट चेतावनी)',
      en: '📢 Official Agricultural Advisory (Rainfall & Pest Warning)',
    },
    message: {
      te: 'రాగల 48 గంటల్లో భారీ వర్షాలు కురిసే అవకాశం ఉంది. వరి, మిరప పొలాల్లో నీరు నిలవకుండా మురుగు కాల్వలు సిద్ధం చేయండి.',
      hi: 'अगले 48 घंटों में भारी बारिश की संभावना। धान और मिर्च के खेतों से जल निकासी सुनिश्चित करें।',
      en: 'Heavy showers expected over next 48 hours. Ensure proper drainage trenches in paddy and chilli fields.',
    },
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    is_read: false,
    action_type: 'ANNOUNCEMENT',
    target_id: 'ann-1',
  },
  {
    id: 'notif-3',
    category: 'COMMUNITY',
    title: {
      te: '👍 మీ సలహా 24 మంది రైతులకు ఉపయోగపడింది',
      hi: '👍 आपकी सलाह 24 किसानों के काम आई',
      en: '👍 24 Farmers Marked "Worked for Me" on Your Advice',
    },
    message: {
      te: 'మీరు పసుపు జిగురు అట్టల గురించి పోస్ట్ చేసిన కామెంట్‌ను 24 మంది రైతులు ఉపయోగపడిందని నిర్ధారించారు.',
      hi: 'पीले स्टिकी ट्रैप पर आपकी टिप्पणी को 24 साथी किसानों ने "Worked for Me" से सराहा।',
      en: 'Farmers confirmed your yellow sticky trap suggestion helped resolve their whitefly issue.',
    },
    timestamp: new Date(Date.now() - 3600000 * 9).toISOString(),
    is_read: true,
    action_type: 'COMMUNITY_POST',
    target_id: 'dd12e419-c978-425a-a0c8-45c90295db62',
  },
];

// =============================================================================
// AEO ANNOUNCEMENTS SEED DATA
// =============================================================================

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Urgent: Heavy Rainfall Alert & Post-Rain Pest Management',
    crop: 'All Crops (Paddy, Cotton, Chilli Focus)',
    priority: 'Urgent',
    issued_by: 'Srinivas Rao (Agricultural Extension Officer)',
    officer_id: 'AEO-MDCL-014',
    department: 'Department of Agriculture, Telangana',
    target_area: 'Ghatkesar & Keesara Mandals',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    content: {
      te: 'రాగల 48 గంటల్లో మేడ్చల్ పరిసర ప్రాంతాల్లో 60-80mm భారీ వర్షపాతం నమోదయ్యే అవకాశం ఉంది.\n1. వరి నారుమడులు మరియు ప్రధాన పొలాలలో నీరు నిల్వ ఉండకుండా వెంటనే డ్రైనేజీ కాలువలను శుభ్రం చేయండి.\n2. వర్షం ఆగిన వెంటనే పత్తి మరియు మిరప తోటల్లో కాపర్ ఆక్సిక్లోరైడ్ (3 గ్రా/లీ) పిచికారీ చేయడం ద్వారా కొమ్మ ఎండు, బాక్టీరియల్ మచ్చల నుండి రక్షణ పొందవచ్చు.\n3. వర్షాల సమయంలో ఎట్టి పరిస్థితుల్లోనూ యూరియా లేదా నత్రజని ఎరువులు వేయరాదు.',
      hi: 'आगामी 48 घंटों में 60-80mm तक भारी बारिश की संभावना है।\n1. धान और सब्जी के खेतों में तुरंत जल निकासी नालियां साफ करें।\n2. बारिश रुकते ही कपास और मिर्च में कॉपर ऑक्सीक्लोराइड (3g/L) का छिड़काव करें।\n3. वर्षा के दौरान यूरिया का छिड़काव बिल्कुल न करें।',
      en: 'High rainfall (60-80mm) forecasted in Medchal–Malkajgiri over the next 48 hours.\n1. Ensure immediate drainage of stagnant water from paddy and vegetable fields.\n2. Post-rain, apply preventive spray of Copper Oxychloride 50% WP @ 3g/L against fungal spots in cotton & chilli.\n3. Suspend all urea top-dressing until soils reach optimum field capacity.',
    },
  },
  {
    id: 'ann-2',
    title: 'Subsidy on Pheromone Traps & Bio-Pesticides for Cotton & Chilli Farmers',
    crop: 'Cotton & Chilli',
    priority: 'High',
    issued_by: 'Department of Agriculture, Medchal',
    officer_id: 'AEO-HQ-002',
    department: 'State Agriculture Extension Network',
    target_area: 'Entire District',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    content: {
      te: 'రైతు భరోసా కేంద్రాల్లో పత్తి కోసం పింక్ బోల్‌వార్మ్ ఫెరమోన్ ట్రాప్‌లు 75% సబ్సిడీతో పంపిణీ చేయబడుతున్నాయి. పట్టాదారు పాస్‌బుక్‌తో మండల వ్యవసాయ అధికారిని సంప్రదించండి.',
      hi: 'कपास किसानों हेतु गुलाबी सुंडी फेरोमोन ट्रैप 75% सब्सिडी पर कृषि केंद्रों पर उपलब्ध हैं। पासबुक के साथ तुरंत संपर्क करें।',
      en: 'Pheromone traps for pink bollworm monitoring in cotton now available at 75% subsidy at Rythu Seva Kendrams. Carry farmer passbook.',
    },
  },
];

// =============================================================================
// STORAGE HELPERS & DATA ACCESS
// =============================================================================

function getStored(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('krishi_community_storage_updated'));
  } catch (err) {
    console.warn('Storage write failed', err);
  }
}

// 1. POSTS API
export function normalizeBackendPost(p) {
  if (!p) return null;
  const contentStr = typeof p.content === 'string' ? p.content : (p.content?.te || p.content?.hi || p.content?.en || '');
  const isObjContent = typeof p.content === 'object' && p.content !== null;

  // Strictly exclude legacy Unsplash demo images or placeholder demo text
  if (
    p.photo_url?.includes('images.unsplash.com') ||
    contentStr.includes('Which fertilizer')
  ) {
    return null;
  }

  const initialMatch = INITIAL_POSTS.find((ip) => String(ip.id) === String(p.id));

  let mappedComments = (p.comments || []).map((c) => {
    const cStr = typeof c.content === 'string' ? c.content : (c.content?.te || c.content?.hi || c.content?.en || '');
    const isCObj = typeof c.content === 'object' && c.content !== null;
    return {
      id: String(c.id),
      author: {
        name: c.officer?.name || c.author?.name || (c.is_officer ? 'AEO Officer' : 'Farmer'),
        village: c.author?.village || 'Ghatkesar Mandal',
        role: c.is_officer ? 'Agricultural Extension Officer' : 'Farmer',
        is_officer: Boolean(c.is_officer),
        badge: c.is_officer ? '🛡️ Official AEO Advisory' : undefined,
      },
      content: isCObj ? c.content : {
        te: cStr,
        hi: cStr,
        en: cStr,
      },
      original_language: c.original_language || 'te',
      created_at: c.created_at || new Date().toISOString(),
      has_voice: Boolean(c.has_voice),
      voice_duration: c.voice_duration || '0:18',
      worked_for_me_count: c.helpful_count || c.worked_for_me_count || 0,
      has_user_worked_for_me: Boolean(c.has_user_worked_for_me),
      is_officer: Boolean(c.is_officer),
    };
  });

  if (mappedComments.length === 0 && initialMatch?.comments?.length) {
    mappedComments = initialMatch.comments;
  }

  return {
    id: String(p.id),
    crop: initialMatch?.crop || p.crop || 'Agriculture Crop',
    crop_icon: initialMatch?.crop_icon || p.crop_icon || getCropIcon(p.crop),
    author: {
      id: initialMatch?.author?.id || p.author?.id,
      name: initialMatch?.author?.name || p.author?.name || 'Farmer',
      village: initialMatch?.author?.village || p.author?.village || 'Ghatkesar Mandal',
      district: initialMatch?.author?.district || p.author?.district || 'Medchal–Malkajgiri',
      phone: initialMatch?.author?.phone || p.author?.phone,
      helpful_count: p.helpful_count || initialMatch?.author?.helpful_count || p.author?.helpful_count || 0,
    },
    title: initialMatch?.title || p.title || `${p.crop || 'Field'} Observation: ${contentStr.slice(0, 50)}...`,
    content: isObjContent ? p.content : (initialMatch?.content || {
      te: contentStr,
      hi: contentStr,
      en: contentStr,
    }),
    original_language: initialMatch?.original_language || p.original_language || 'te',
    approximate_location: initialMatch?.approximate_location || p.approximate_location || (p.author?.village ? `${p.author.village} (~2 km away)` : 'Ghatkesar Mandal (~2.5 km away)'),
    severity: initialMatch?.severity || p.severity || 'Medium',
    created_at: p.created_at || initialMatch?.created_at || new Date().toISOString(),
    photo_url: p.photo_url || initialMatch?.photo_url || null,
    has_voice: Boolean(p.has_voice || p.hasVoice || initialMatch?.has_voice),
    voice_duration: p.voice_duration || initialMatch?.voice_duration || '0:22',
    is_submitted_problem: Boolean(p.incident_id || p.is_submitted_problem || initialMatch?.is_submitted_problem),
    related_incident_ref: p.incident_id || p.related_incident_ref || initialMatch?.related_incident_ref || null,
    worked_for_me_count: p.worked_for_me_count || p.helpful_count || initialMatch?.worked_for_me_count || 0,
    has_user_worked_for_me: Boolean(p.has_user_worked_for_me),
    comments: mappedComments,
  };
}

export function getAllPosts() {
  const posts = getStored(STORAGE_KEYS.POSTS, INITIAL_POSTS);
  let currentFarmer = null;
  try {
    currentFarmer = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
  } catch {}

  const currentId = currentFarmer?.farmer_id;
  const currentPhone = currentFarmer?.phone;

  return posts.filter((p) => {
    if (!p) return false;
    // Exclude legacy mock post IDs
    if (['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(p.id)) return false;
    // Exclude fake Unsplash images
    if (p.photo_url?.includes('images.unsplash.com')) return false;

    // Filter out the active farmer's OWN complaints (the farmer sees all complaints EXCEPT his own)
    if (currentId && (p.farmer_id === currentId || p.author?.id === currentId)) {
      return false;
    }
    if (currentPhone) {
      const cleanPhone = String(currentPhone).replace(/[^0-9]/g, '');
      const authorPhone = String(p.author?.phone || p.farmer_phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone && authorPhone && (cleanPhone === authorPhone || authorPhone.endsWith(cleanPhone.slice(-10)))) {
        return false;
      }
    }

    return true;
  });
}

export async function fetchLiveCommunityPosts() {
  try {
    const res = await apiGetCommunityPosts(50);
    if (res?.success && Array.isArray(res.posts) && res.posts.length > 0) {
      const livePosts = res.posts.map(normalizeBackendPost).filter(Boolean);
      const currentStored = getAllPosts();

      const liveIds = new Set(livePosts.map((p) => p.id));
      // Only keep user session posts that were just created optimistically and are not old fake posts
      const userSessionPosts = currentStored.filter(
        (p) => !liveIds.has(p.id) && !['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(p.id) && (p.id.startsWith('post-') || p.id.startsWith('session-'))
      );

      const merged = [...livePosts, ...userSessionPosts];
      setStored(STORAGE_KEYS.POSTS, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync live community posts from backend:', err?.message || err);
  }
  return getAllPosts();
}

export function createCommunityPost(postData) {
  const posts = getAllPosts();
  const contentStr = typeof postData.content === 'string' ? postData.content : (postData.content?.te || postData.content?.en || '');
  const newPost = {
    id: postData.id || `post-${Date.now()}`,
    crop: postData.crop || 'Crop',
    crop_icon: getCropIcon(postData.crop),
    author: postData.author || {
      name: 'Farmer',
      village: 'Local Village',
      mandal: 'Ghatkesar',
    },
    title: postData.title || (contentStr ? contentStr.slice(0, 60) + '...' : 'Farmer Experience'),
    content: {
      te: postData.contentTe || contentStr,
      hi: postData.contentHi || contentStr,
      en: postData.contentEn || contentStr,
    },
    original_language: postData.originalLanguage || 'te',
    approximate_location: postData.location || 'Ghatkesar Mandal (~2.5 km away)',
    severity: postData.severity || 'Medium',
    created_at: postData.created_at || new Date().toISOString(),
    photo_url: postData.photoUrl || postData.photo_url || null,
    has_voice: Boolean(postData.hasVoice || postData.has_voice),
    voice_duration: postData.voiceDuration || postData.voice_duration || '0:24',
    is_submitted_problem: Boolean(postData.isSubmittedProblem),
    related_incident_ref: postData.relatedIncidentRef || null,
    worked_for_me_count: 0,
    has_user_worked_for_me: false,
    comments: [],
  };

  const updated = [newPost, ...posts];
  setStored(STORAGE_KEYS.POSTS, updated);
  return newPost;
}

export async function createPostInCommunity(postData, localPostId = null) {
  // 1. Optimistically store locally if not already stored
  let localPost = null;
  if (!localPostId) {
    localPost = createCommunityPost(postData);
  }
  const targetLocalId = localPostId || localPost?.id;

  // 2. Persist to real Supabase database via backend API
  try {
    let farmerProfile = null;
    try {
      farmerProfile = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
    } catch {}

    const payload = {
      content: typeof postData.content === 'string' ? postData.content : (postData.contentTe || postData.content?.te || ''),
      crop: postData.crop,
      photoUrl: postData.photoUrl || postData.photo_url || null,
      incidentId: postData.incidentId || postData.incident_id || null,
      farmer_phone: postData.farmer_phone || farmerProfile?.phone || null,
      farmer_name: postData.farmer_name || farmerProfile?.name || postData.author?.name || null,
      farmer_id: postData.farmer_id || farmerProfile?.farmer_id || null,
    };

    const res = await apiCreateCommunityPost(payload);
    if (res?.success && res.post) {
      const normalized = normalizeBackendPost(res.post);
      if (normalized) {
        if (postData.title) normalized.title = postData.title;
        if (postData.photoUrl) normalized.photo_url = postData.photoUrl;
        if (postData.location) normalized.approximate_location = postData.location;
        if (postData.severity) normalized.severity = postData.severity;
        if (postData.relatedIncidentRef) normalized.related_incident_ref = postData.relatedIncidentRef;
        normalized.is_submitted_problem = Boolean(postData.isSubmittedProblem || postData.incidentId);
        normalized.has_voice = Boolean(postData.hasVoice);
        normalized.voice_duration = postData.voiceDuration || normalized.voice_duration;

        const posts = getAllPosts();
        // Replace temporary local item with real database record
        const updated = [normalized, ...posts.filter((p) => (!targetLocalId || p.id !== targetLocalId) && p.id !== normalized.id)];
        setStored(STORAGE_KEYS.POSTS, updated);
        return normalized;
      }
    }
  } catch (err) {
    // In test runner or offline, localPost is already persisted
  }

  return localPost;
}

export function togglePostWorkedForMe(postId) {
  const posts = getAllPosts();
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const nowActive = !p.has_user_worked_for_me;
      return {
        ...p,
        has_user_worked_for_me: nowActive,
        worked_for_me_count: nowActive ? p.worked_for_me_count + 1 : Math.max(0, p.worked_for_me_count - 1),
      };
    }
    return p;
  });
  setStored(STORAGE_KEYS.POSTS, updated);
  return updated;
}

export function addCommentToPost(postId, commentData) {
  const posts = getAllPosts();
  let addedComment = null;
  const updated = posts.map((p) => {
    if (p.id === postId) {
      addedComment = {
        id: `comm-${Date.now()}`,
        author: commentData.author || {
          name: 'Farmer',
          village: 'Ghatkesar',
          role: 'Farmer',
          is_officer: false,
        },
        content: {
          te: commentData.contentTe || commentData.content,
          hi: commentData.contentHi || commentData.content,
          en: commentData.contentEn || commentData.content,
        },
        original_language: commentData.originalLanguage || 'te',
        created_at: new Date().toISOString(),
        has_voice: Boolean(commentData.hasVoice),
        voice_duration: commentData.voiceDuration || '0:20',
        worked_for_me_count: 0,
        has_user_worked_for_me: false,
        is_officer: Boolean(commentData.isOfficer),
      };
      return {
        ...p,
        comments: [...(p.comments || []), addedComment],
      };
    }
    return p;
  });
  setStored(STORAGE_KEYS.POSTS, updated);

  // If postId is a real backend UUID, asynchronously persist to backend
  if (postId && !postId.startsWith('post-')) {
    const rawText = typeof commentData.content === 'string' ? commentData.content : (commentData.contentTe || '');
    apiAddCommunityComment(postId, rawText).catch((err) => {
      console.warn('Backend comment persistence failed:', err?.message || err);
    });
  }

  return addedComment;
}

export function toggleCommentWorkedForMe(postId, commentId) {
  const posts = getAllPosts();
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const updatedComments = (p.comments || []).map((c) => {
        if (c.id === commentId) {
          const nowActive = !c.has_user_worked_for_me;
          return {
            ...c,
            has_user_worked_for_me: nowActive,
            worked_for_me_count: nowActive ? c.worked_for_me_count + 1 : Math.max(0, c.worked_for_me_count - 1),
          };
        }
        return c;
      });
      // Sort comments so that highest "Worked for Me" appears on top!
      updatedComments.sort((a, b) => (b.worked_for_me_count || 0) - (a.worked_for_me_count || 0));
      return {
        ...p,
        comments: updatedComments,
      };
    }
    return p;
  });
  setStored(STORAGE_KEYS.POSTS, updated);

  // If commentId is a real backend UUID, asynchronously record helpful reaction
  if (commentId && !commentId.startsWith('comm-')) {
    apiMarkCommentHelpful(commentId).catch((err) => {
      console.warn('Backend helpful reaction failed:', err?.message || err);
    });
  }

  return updated;
}

// 2. GROUPS API
export function getAllGroups() {
  return getStored(STORAGE_KEYS.GROUPS, INITIAL_GROUPS);
}

export function toggleGroupMembership(groupId) {
  const groups = getAllGroups();
  const updated = groups.map((g) => {
    if (g.id === groupId) {
      const isNowJoined = !g.is_joined;
      return {
        ...g,
        is_joined: isNowJoined,
        member_count: isNowJoined ? g.member_count + 1 : Math.max(0, g.member_count - 1),
      };
    }
    return g;
  });
  setStored(STORAGE_KEYS.GROUPS, updated);
  return updated;
}

// 3. PROBLEMS API
export function getAllProblems() {
  const problems = getStored(STORAGE_KEYS.PROBLEMS, INITIAL_PROBLEMS);
  // Exclude legacy mock problem clusters and any tomato-related demo items
  return problems.filter((p) => {
    if (!p) return false;
    if (['prob-cluster-3', 'prob-cluster-4'].includes(p.id)) return false;
    if (p.crop?.toLowerCase() === 'tomato') return false;
    const desc = JSON.stringify(p).toLowerCase();
    if (desc.includes('tomato') || desc.includes('టమాటా') || desc.includes('టమోటా')) return false;
    return true;
  });
}

export async function fetchLiveLocalProblems() {
  try {
    const clusterRes = await apiGetClusters().catch(() => null);
    let nearbyRes = null;
    try {
      nearbyRes = await apiGetNearbyIncidents({ latitude: 17.449871, longitude: 78.6715, radiusKm: 25 });
    } catch (e) {
      // ignore
    }

    const liveProblems = [];

    if (clusterRes?.clusters && Array.isArray(clusterRes.clusters) && clusterRes.clusters.length > 0) {
      clusterRes.clusters.forEach((c, idx) => {
        if (c.crop?.toLowerCase() === 'tomato') return;
        const cropName = c.crop || 'Cotton';
        liveProblems.push({
          id: idx === 0 ? 'prob-cluster-1' : (c.cluster_id || `cluster-${idx}`),
          cluster_id: c.cluster_id,
          crop: cropName,
          crop_icon: getCropIcon(cropName),
          status: 'AEO Verified',
          status_code: 'AEO_VERIFIED',
          urgency: c.priority === 'HIGH' ? 'Critical' : 'Moderate',
          detected_date: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active Outbreak',
          title: {
            te: `🚨 ${cropName} సమూహ సమస్య (${c.area || 'పడమటి సాయి గూడ'})`,
            hi: `🚨 ${cropName} क्लस्टर प्रकोप (${c.area || 'पदमती साई गुड़ा'})`,
            en: `🚨 ${cropName} Outbreak Cluster (${c.area || 'Padamati Sai Guda'})`,
          },
          symptoms: {
            te: `ఆకుల మీద గుండ్రంగా గోధుమ రంగు మచ్చలు. ${c.incident_count || 10} మంది రైతులు ధృవీకరించారు.`,
            hi: `पत्तियों पर गोल भूरे धब्बे। ${c.incident_count || 10} स्थानीय किसानों द्वारा दर्ज।`,
            en: `Circular brown leaf spots and curling reported by ${c.incident_count || 10} local farmers.`,
          },
          affected_farmers_count: c.incident_count || 10,
          affected_mandals_count: 1,
          approximate_area: c.area || 'Padamati Sai Guda, Medchal–Malkajgiri',
          total_reports_count: c.incident_count || 10,
          first_reported: '2 days ago',
          latest_activity: '10 mins ago',
          user_facing_this_too: false,
          is_live_cluster: true,
          aeo_verified_response: {
            officer_name: 'Srinivas Rao',
            officer_id: 'AEO-MDCL-014',
            designation: 'Agricultural Extension Officer, Ghatkesar Mandal',
            verification_date: 'Verified Recently',
            summary: {
              te: 'పడమటి సాయి గూడ క్లస్టర్ పరిశీలనలో ఆల్టర్నేరియా మరియు తెల్లదోమ వ్యాప్తి నిర్ధారించబడింది. సమగ్ర సస్యరక్షణ చర్యలు తక్షణమే ప్రారంభించండి.',
              hi: 'पदमती साई गुड़ा क्लस्टर निरीक्षण में अल्टरनेरिया और सफेद मक्खी के प्रकोप की पुष्टि हुई। तत्काल समन्वित छिड़काव अपनाएं।',
              en: 'Field inspection in Padamati Sai Guda cluster confirmed Alternaria leaf spot & Whitefly vector presence. Immediate coordinated spray recommended.',
            },
            recommended_action: {
              te: '1. మాంకోజెబ్ 75% WP (2.5 గ్రా/లీటర్) లేదా ఇమిడాక్లోప్రిడ్ 17.8% SL (0.3 ml/లీటర్) పిచికారీ చేయండి.\n2. ఎకరానికి 15-20 పసుపు జిగురు అట్టలు అమర్చండి.',
              hi: '1. मैंकोजेब 75% WP (2.5 ग्रा/ली) या इमिडाक्लोप्रिड 17.8% SL (0.3 ml/ली) का छिड़काव करें।\n2. प्रति एकड़ 15-20 पीले चिपचिपे कार्ड लगाएं।',
              en: '1. Spray Mancozeb 75% WP @ 2.5 g/L or Imidacloprid 17.8% SL @ 0.3 ml/L.\n2. Install 15-20 Yellow Sticky Traps per acre.',
            },
          },
          timeline: [
            { step: `1. ${c.incident_count || 10} local farmer complaints logged`, date: '2 days ago' },
            { step: '2. Spatial DBSCAN cluster established', date: 'Yesterday' },
            { step: '3. AEO field assessment conducted', date: 'Yesterday' },
            { step: '4. Official AEO verified advisory published', date: 'Active' },
          ],
        });
      });
    }

    if (nearbyRes?.items && Array.isArray(nearbyRes.items)) {
      nearbyRes.items.slice(0, 3).forEach((inc) => {
        if (inc.crop?.toLowerCase() === 'tomato') return;
        if (!liveProblems.some((p) => p.id === inc.id)) {
          const descStr = inc.problem_summary || inc.description || 'పంట సమస్య';
          liveProblems.push({
            id: inc.id,
            crop: inc.crop || 'Cotton',
            crop_icon: getCropIcon(inc.crop || 'Cotton'),
            status: 'Emerging Problem',
            status_code: 'EMERGING_PROBLEM',
            urgency: 'Moderate',
            detected_date: inc.created_at ? new Date(inc.created_at).toLocaleDateString() : 'Recent',
            title: {
              te: `🚨 ${inc.crop || 'పంట'} సమస్య (${inc.locality ? inc.locality.split(',')[0] : 'సమీపంలో'})`,
              hi: `🚨 ${inc.crop || 'फसल'} समस्या (${inc.locality ? inc.locality.split(',')[0] : 'पास में'})`,
              en: `🚨 ${inc.crop || 'Crop'} Issue (${inc.locality ? inc.locality.split(',')[0] : 'Nearby'})`,
            },
            symptoms: {
              te: descStr,
              hi: descStr,
              en: descStr,
            },
            affected_farmers_count: 1 + (inc.community_confirmations_count || 0),
            affected_mandals_count: 1,
            approximate_area: inc.locality || `${inc.distance_text || 'Nearby'}`,
            total_reports_count: 1 + (inc.community_confirmations_count || 0),
            first_reported: 'Recently',
            latest_activity: inc.distance_text || 'Nearby',
            user_facing_this_too: false,
            photo_url: inc.photo_url || null,
            timeline: [
              { step: '1. Incident submitted by local farmer with GPS & photo', date: 'Recently' },
              { step: '2. AI analyzed and verified crop symptoms', date: 'Done' },
            ],
          });
        }
      });
    }

    if (liveProblems.length > 0) {
      setStored(STORAGE_KEYS.PROBLEMS, liveProblems);
      return liveProblems;
    }
  } catch (err) {
    console.warn('Could not sync live clusters/problems from backend:', err?.message || err);
  }
  return getAllProblems();
}

export function toggleProblemFacingToo(problemId) {
  const problems = getAllProblems();
  let isNowFacing = false;
  const updated = problems.map((prob) => {
    if (prob.id === problemId) {
      isNowFacing = !prob.user_facing_this_too;
      return {
        ...prob,
        user_facing_this_too: isNowFacing,
        affected_farmers_count: isNowFacing ? prob.affected_farmers_count + 1 : Math.max(1, prob.affected_farmers_count - 1),
        total_reports_count: isNowFacing ? prob.total_reports_count + 1 : prob.total_reports_count,
      };
    }
    return prob;
  });
  setStored(STORAGE_KEYS.PROBLEMS, updated);
  return { updated, isNowFacing };
}

// 4. NOTIFICATIONS API
export function getAllNotifications() {
  return getStored(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
}

export function markNotificationAsRead(notifId) {
  const notifs = getAllNotifications();
  const updated = notifs.map((n) => (n.id === notifId ? { ...n, is_read: true } : n));
  setStored(STORAGE_KEYS.NOTIFICATIONS, updated);
  return updated;
}

export function markAllNotificationsAsRead() {
  const notifs = getAllNotifications();
  const updated = notifs.map((n) => ({ ...n, is_read: true }));
  setStored(STORAGE_KEYS.NOTIFICATIONS, updated);
  return updated;
}

export function getUnreadNotificationsCount() {
  const notifs = getAllNotifications();
  return notifs.filter((n) => !n.is_read).length;
}

// 5. ANNOUNCEMENTS API
export function getAllAnnouncements() {
  return getStored(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
}

export function createAeoAnnouncement(data) {
  const announcements = getAllAnnouncements();
  const newAnn = {
    id: `ann-${Date.now()}`,
    title: data.title,
    crop: data.crop || 'All Crops',
    priority: data.priority || 'Normal',
    issued_by: data.officer_name || 'Agriculture Extension Officer',
    officer_id: data.officer_id || 'AEO-001',
    department: 'Department of Agriculture, Telangana',
    target_area: data.target_area || 'District Wide',
    created_at: new Date().toISOString(),
    content: {
      te: data.messageTe || data.message,
      hi: data.messageHi || data.message,
      en: data.messageEn || data.message,
    },
  };

  const updatedAnn = [newAnn, ...announcements];
  setStored(STORAGE_KEYS.ANNOUNCEMENTS, updatedAnn);

  // Automatically trigger a Farmer Notification for this announcement!
  const notifs = getAllNotifications();
  const newNotif = {
    id: `notif-ann-${Date.now()}`,
    category: 'AEO_ANNOUNCEMENT',
    title: {
      te: `📢 కొత్త AEO ప్రకటన: ${data.title}`,
      hi: `📢 नई AEO घोषणा: ${data.title}`,
      en: `📢 New Official AEO Announcement: ${data.title}`,
    },
    message: {
      te: data.messageTe || data.message,
      hi: data.messageHi || data.message,
      en: data.messageEn || data.message,
    },
    timestamp: new Date().toISOString(),
    is_read: false,
    action_type: 'ANNOUNCEMENT',
    target_id: newAnn.id,
  };
  setStored(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifs]);

  return newAnn;
}

// =============================================================================
// SPEECH SYNTHESIS & VOICE UTILITIES
// =============================================================================

export function speakText(text, lang = 'te', onEnd = null) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('SpeechSynthesis not supported');
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  // Configure appropriate voice code
  if (lang === 'te') {
    utterance.lang = 'te-IN';
  } else if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'en-IN';
  }

  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Helper to get crop icon
export function getCropIcon(cropName) {
  if (!cropName) return '🌱';
  const c = cropName.toLowerCase();
  if (c.includes('rice') || c.includes('వరి') || c.includes('धान') || c.includes('paddy')) return '🌾';
  if (c.includes('tomato') || c.includes('టమాటా') || c.includes('టమోటా') || c.includes('टमाटर')) return '🍅';
  if (c.includes('chilli') || c.includes('chili') || c.includes('మిరప') || c.includes('मिर्च')) return '🌶️';
  if (c.includes('cotton') || c.includes('పత్తి') || c.includes('कपास')) return '🌿';
  if (c.includes('mango') || c.includes('మామిడి') || c.includes('आम')) return '🥭';
  return '🌱';
}
