/**
 * Seed content ported verbatim from the FastAPI backend's seed_data().
 * These become Sanity documents; the demo login user lives in D1 instead.
 */

export const SEED_FAMILIES = [
  {
    id: "fam-sarah",
    user_id: "fam-sarah",
    parent_name: "Sarah Mitchell",
    location: "Green Point, Cape Town",
    bio: "Mom to Leo (5). We love quiet parks, animals, and building forts. Leo is autistic and thrives with small groups and predictable routines.",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    family_values: ["neurodiversity-affirming", "kindness", "patience", "outdoors"],
    sensory_preferences: ["quiet", "small groups", "outdoors", "predictable routine"],
    interests: ["animals", "building", "nature", "books"],
    communication_style: "verbal",
    verified: true,
    children: [
      { name: "Leo", age: 5, diagnosis: "Autism", sensory_preferences: ["quiet"], interests: ["dinosaurs", "trains"], communication_style: "verbal" },
    ],
  },
  {
    id: "fam-james",
    user_id: "fam-james",
    parent_name: "James & Priya Naidoo",
    location: "Sea Point, Cape Town",
    bio: "Parents to Aarav (6, ADHD) — high energy, loves running, water play, and Lego. We embrace movement breaks.",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    family_values: ["movement-friendly", "inclusion", "creativity"],
    sensory_preferences: ["movement", "outdoors", "flexible"],
    interests: ["lego", "swimming", "soccer"],
    communication_style: "verbal",
    verified: true,
    children: [
      { name: "Aarav", age: 6, diagnosis: "ADHD", sensory_preferences: ["movement"], interests: ["soccer", "lego"], communication_style: "verbal" },
    ],
  },
  {
    id: "fam-emma",
    user_id: "fam-emma",
    parent_name: "Emma van der Merwe",
    location: "Claremont, Cape Town",
    bio: "Mom to Zoe (4) — nonverbal, uses AAC. We love sensory play, painting, and calm indoor spaces.",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    family_values: ["neurodiversity-affirming", "AAC-friendly", "patience"],
    sensory_preferences: ["quiet", "small groups", "predictable routine", "sensory play"],
    interests: ["painting", "water play", "music"],
    communication_style: "AAC",
    verified: true,
    children: [
      { name: "Zoe", age: 4, diagnosis: "Autism", sensory_preferences: ["quiet", "sensory play"], interests: ["painting", "water"], communication_style: "AAC" },
    ],
  },
  {
    id: "fam-tom",
    user_id: "fam-tom",
    parent_name: "Tom & Aisha Adams",
    location: "Woodstock, Cape Town",
    bio: "Dads to Kai (5) — sensory-seeker who loves jumping, spinning, and drums. Music is our love language.",
    avatar_url: "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=200",
    family_values: ["inclusion", "creativity", "movement-friendly"],
    sensory_preferences: ["movement", "sensory play", "music"],
    interests: ["music", "drums", "trampoline"],
    communication_style: "verbal",
    verified: true,
    children: [
      { name: "Kai", age: 5, diagnosis: "SPD", sensory_preferences: ["movement", "music"], interests: ["drums"], communication_style: "verbal" },
    ],
  },
  {
    id: "fam-lisa",
    user_id: "fam-lisa",
    parent_name: "Lisa Botha",
    location: "Rondebosch, Cape Town",
    bio: "Mom to twin girls Mia & Eva (6). We love art, quiet libraries, and gentle group play.",
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    family_values: ["kindness", "creativity", "neurodiversity-affirming"],
    sensory_preferences: ["quiet", "small groups", "outdoors"],
    interests: ["painting", "books", "nature"],
    communication_style: "verbal",
    verified: true,
    children: [
      { name: "Mia", age: 6, diagnosis: "Autism", sensory_preferences: ["quiet"], interests: ["painting"], communication_style: "verbal" },
      { name: "Eva", age: 6, diagnosis: null, sensory_preferences: ["quiet"], interests: ["books"], communication_style: "verbal" },
    ],
  },
  {
    id: "fam-david",
    user_id: "fam-david",
    parent_name: "David Okonkwo",
    location: "Newlands, Cape Town",
    bio: "Dad to Amara (7). We love hikes, gentle animals, and predictable playdates in small groups.",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    family_values: ["outdoors", "patience", "neurodiversity-affirming"],
    sensory_preferences: ["quiet", "outdoors", "predictable routine"],
    interests: ["hiking", "animals", "reading"],
    communication_style: "verbal",
    verified: true,
    children: [
      { name: "Amara", age: 7, diagnosis: "Autism", sensory_preferences: ["quiet"], interests: ["hiking"], communication_style: "verbal" },
    ],
  },
];

export const SEED_FORUM = [
  { id: "fp-1", author_id: "fam-sarah", author_name: "Sarah M.", avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", topic: "Parenting", title: "Best outdoor activities for 4-6 year olds", body: "Looking for calm outdoor spaces in Cape Town that work well for a sensory-sensitive 5yo. What are your favourite quiet parks?", replies: 24, hours_ago: 2 },
  { id: "fp-2", author_id: "fam-james", author_name: "James N.", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", topic: "Parenting", title: "How do you manage screen time on weekends?", body: "Our ADHD 6yo struggles with transitions off screens. What works for your family?", replies: 18, hours_ago: 5 },
  { id: "fp-3", author_id: "fam-lisa", author_name: "Lisa B.", avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", topic: "Activities", title: "Looking for art class recommendations in Cape Town", body: "Anyone know of neurodiversity-affirming art classes for 6-year-olds?", replies: 12, hours_ago: 24 },
  { id: "fp-4", author_id: "fam-emma", author_name: "Emma vdM", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", topic: "Local", title: "AAC-friendly speech therapist recommendations", body: "Our SLP is moving overseas. Any recs for AAC-savvy therapists in the Southern Suburbs?", replies: 9, hours_ago: 30 },
  { id: "fp-5", author_id: "fam-tom", author_name: "Tom A.", avatar_url: "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=100", topic: "General", title: "Music therapy vs sensory playgroups — thoughts?", body: "Trying to decide between weekly music therapy and a sensory playgroup. Would love to hear experiences.", replies: 7, hours_ago: 48 },
];

export const SEED_RESOURCES = [
  { id: "rs-1", kind: "article", title: "10 outdoor games kids will never get tired of", image_url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600", read_minutes: 5, featured: true, summary: "Ideas to keep kids engaged and learning at home and outdoors." },
  { id: "rs-2", kind: "guide", title: "Positive parenting tips that really work", image_url: "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=600", read_minutes: 7, featured: false, summary: "Compassionate, evidence-based approaches to daily challenges." },
  { id: "rs-3", kind: "video", title: "Finding the right activities for your child", image_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600", read_minutes: 12, featured: false, summary: "A short video guide for choosing sensory-appropriate activities." },
  { id: "rs-4", kind: "guide", title: "Preparing your child for a first playdate", image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600", read_minutes: 6, featured: true, summary: "A calm, step-by-step way to reduce first-playdate anxiety." },
  { id: "rs-5", kind: "article", title: "Understanding sensory profiles: a parent primer", image_url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600", read_minutes: 8, featured: false, summary: "What sensory-seeking vs. sensory-avoiding means in daily life." },
];

export const SEED_THREADS = [
  {
    id: "th-sarah", family_id: "fam-sarah", name: "Sarah Mitchell",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    last: "Leo would love the nature walk on Saturday! What do you usually bring?", at: "10:24", unread: 2,
    messages: [
      { from: "them", text: "Hi! Saw your request for the Quiet Nature Walk — welcome 💚", at: "Mon 09:12" },
      { from: "me", text: "Thanks so much! Leo is really excited. Anything he should bring?", at: "Mon 09:15" },
      { from: "them", text: "Just a water bottle and something for the sun. We keep it very small (max 4 kids) so it stays calm.", at: "Mon 09:20" },
      { from: "them", text: "Leo would love the nature walk on Saturday! What do you usually bring?", at: "10:24" },
    ],
  },
  {
    id: "th-james", family_id: "fam-james", name: "James & Priya",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    last: "Perfect — see you at 10 at Green Point Park 🙌", at: "Yesterday", unread: 0,
    messages: [
      { from: "me", text: "Hi! Just confirming the soccer playdate on Sat.", at: "Sun 14:00" },
      { from: "them", text: "Yes we&apos;re on! Aarav can&apos;t wait.", at: "Sun 14:12" },
      { from: "them", text: "Perfect — see you at 10 at Green Point Park 🙌", at: "Yesterday" },
    ],
  },
  {
    id: "th-emma", family_id: "fam-emma", name: "Emma van der Merwe",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    last: "Zoe uses AAC — I&apos;ll bring her device 🙂", at: "Tue", unread: 0,
    messages: [
      { from: "them", text: "Hi 👋 We&apos;d love to join the art playdate!", at: "Tue 11:02" },
      { from: "them", text: "Zoe uses AAC — I&apos;ll bring her device 🙂", at: "Tue 11:05" },
    ],
  },
  {
    id: "th-lisa", family_id: "fam-lisa", name: "Lisa Botha",
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    last: "The twins are excited — see you Wednesday!", at: "Sat", unread: 1,
    messages: [
      { from: "them", text: "Hi! Mia and Eva would love to join.", at: "Sat 08:30" },
      { from: "them", text: "The twins are excited — see you Wednesday!", at: "Sat 08:32" },
    ],
  },
];

export const SEED_NOTIFICATIONS = [
  { id: "nt-1", kind: "playdate_join", title: "Sarah accepted your join request", body: "Quiet Nature Walk on Sat 14 Jun is confirmed.", at: "10 min ago", unread: true, icon: "check-circle" },
  { id: "nt-2", kind: "match", title: "New 96% match nearby", body: "Sarah&apos;s family shares 4 sensory preferences with you.", at: "1 hr ago", unread: true, icon: "star" },
  { id: "nt-3", kind: "forum", title: "New reply on your discussion", body: "James replied to \"Best outdoor activities…\"", at: "3 hr ago", unread: false, icon: "message-circle" },
  { id: "nt-4", kind: "safety", title: "Community verification complete", body: "Your family profile is now verified.", at: "Yesterday", unread: false, icon: "shield" },
  { id: "nt-5", kind: "resource", title: "New guide for you", body: "Preparing your child for a first playdate.", at: "2 d ago", unread: false, icon: "book-open" },
];

export const SEED_PLAYDATES = [
  {
    id: "pd-soccer", host_family_id: "fam-james", host_name: "James & Priya",
    title: "Gentle Soccer Playdate", category: "soccer",
    image_url: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
    location: "Green Point Park", date: "2026-06-14", start_time: "10:00 AM", end_time: "12:00 PM",
    age_range: "4-6 years", age_min: 4, age_max: 6,
    description: "Small-group soccer with movement breaks. No scoring, just fun. Sensory-safe zone available.",
    sensory_friendly_tags: ["movement", "small groups", "outdoors", "flexible"],
    interests: ["soccer", "outdoors"],
    attendee_family_ids: ["fam-tom", "fam-david"],
    attendees_avatars: [
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=100",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    ],
    max_children: 6,
  },
  {
    id: "pd-art", host_family_id: "fam-emma", host_name: "Emma",
    title: "Quiet Art & Creativity", category: "art",
    image_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
    location: "Little Steps Studio", date: "2026-06-15", start_time: "3:00 PM", end_time: "5:00 PM",
    age_range: "3-5 years", age_min: 3, age_max: 5,
    description: "Calm painting session with soft music. AAC-friendly. Noise-cancelling headphones available.",
    sensory_friendly_tags: ["quiet", "small groups", "predictable routine", "sensory play"],
    interests: ["painting", "art"],
    attendee_family_ids: ["fam-sarah", "fam-lisa"],
    attendees_avatars: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    ],
    max_children: 4,
  },
  {
    id: "pd-park", host_family_id: "fam-sarah", host_name: "Sarah",
    title: "Quiet Nature Walk", category: "park",
    image_url: "https://images.unsplash.com/photo-1471421298428-1a04ad715e18?w=800",
    location: "De Waal Park", date: "2026-06-16", start_time: "9:30 AM", end_time: "11:30 AM",
    age_range: "5-7 years", age_min: 5, age_max: 7,
    description: "Nature-themed walk, animal spotting. Small group, predictable route.",
    sensory_friendly_tags: ["quiet", "outdoors", "predictable routine", "small groups"],
    interests: ["nature", "animals", "hiking"],
    attendee_family_ids: ["fam-david"],
    attendees_avatars: ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"],
    max_children: 5,
  },
  {
    id: "pd-music", host_family_id: "fam-tom", host_name: "Tom & Aisha",
    title: "Sensory Music Jam", category: "music",
    image_url: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800",
    location: "Woodstock Hub", date: "2026-06-17", start_time: "2:00 PM", end_time: "3:30 PM",
    age_range: "4-8 years", age_min: 4, age_max: 8,
    description: "Drums, shakers, and sensory-safe music play. Movement-friendly.",
    sensory_friendly_tags: ["music", "movement", "sensory play"],
    interests: ["music", "drums"],
    attendee_family_ids: ["fam-james"],
    attendees_avatars: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"],
    max_children: 6,
  },
  {
    id: "pd-sensory", host_family_id: "fam-lisa", host_name: "Lisa",
    title: "Indoor Sensory Playroom", category: "sensory",
    image_url: "https://images.unsplash.com/photo-1547621869-13698ff2c2f3?w=800",
    location: "Rondebosch Community Center", date: "2026-06-18", start_time: "10:00 AM", end_time: "12:00 PM",
    age_range: "3-6 years", age_min: 3, age_max: 6,
    description: "Quiet sensory bins, weighted blankets, calm corners. Perfect for anxious first playdates.",
    sensory_friendly_tags: ["quiet", "sensory play", "small groups", "predictable routine"],
    interests: ["sensory play", "books"],
    attendee_family_ids: ["fam-emma"],
    attendees_avatars: ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"],
    max_children: 4,
  },
];
