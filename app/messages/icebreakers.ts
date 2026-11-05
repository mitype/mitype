// Conversation starter prompts for the Messages page.

export const ICEBREAKERS = [
  // Creative & craft
  "What creative project are you most proud of? ✨",
  "What's a passion project you're working on? 🚀",
  "What kind of creative work do you wish more people appreciated? 🎨",
  "What's the most underrated craft in your opinion? 🛠️",
  "What's a tool or instrument you couldn't live without? 🎚️",
  "Who's a creator you'd love to collaborate with? 🤝",
  "What's the first creative thing you remember making? 🎀",
  "What's a creative risk you're considering? 🎲",
  "When you're stuck, what helps you get unstuck? 🧗",
  "What does your workspace look like? 🖼️",
  "What's a piece of feedback that changed how you work? 💬",
  "What's a project that scared you to make? 😬",
  "What craft do you secretly want to try? 🤫",
  "What's a small detail in your work that nobody notices but you? 🔍",
  "What part of your process are you most insecure about? 😅",
  "What's a creative trend you're tired of? 🙄",
  "What's a creative trend you secretly love? 💗",
  "What's the best money you've ever spent on your craft? 💸",
  "What's something you wish you'd learned earlier? ⏳",
  "What story behind your work do people not know? 📖",

  // Music & soundtrack
  "What song describes your life right now? 🎵",
  "If your life had a soundtrack, what genre would it be? 🎶",
  "What's a lyric that lives rent-free in your head? 🎤",
  "What's your most-played song from this year? 🎧",
  "What's a song that always gets you moving? 💃",
  "What's a song you used to love that you're embarrassed about now? 🙈",
  "What's the soundtrack to your current chapter? 📀",
  "What concert do you wish you'd seen? 🎸",
  "What song would you put on a first-date playlist? ❤️",
  "What's the song you play when you need a confidence boost? 💪",

  // Curiosity & taste
  "What are you currently obsessed with? 👀",
  "What's the most interesting thing you've learned recently? 🧠",
  "What podcast is teaching you something right now? 🎙️",
  "What book are you in the middle of? 📚",
  "What's a niche topic you'd give a TED talk on? 🎤",
  "What's a documentary that rewired your brain? 🎥",
  "What's a YouTube rabbit hole you fell down? 🕳️",
  "What hobby would you pick up if money were no object? 🎯",
  "What's a controversial opinion you stand by? 🥊",
  "What's the best random fact you know? 🤓",

  // Stories & memory
  "What's the best thing that happened to you this week? 🌟",
  "What's a small thing that made you happy today? 🌼",
  "What's the most spontaneous thing you've ever done? 💥",
  "What's a place that changed your perspective? 🗺️",
  "What's a moment from this year you'd live again? 🔁",
  "What's a story you tell at every dinner party? 🍷",
  "What's the kindest thing a stranger has done for you? 🙏",
  "Tell me about a time you surprised yourself. 🪄",
  "What's a smell that takes you straight back to childhood? 👃",
  "What's the most beautiful place you've ever been? 🏞️",

  // Lifestyle & habits
  "What's your cure for boredom? 😄",
  "What's your go-to comfort activity? 🛋️",
  "What's your favorite way to spend a Sunday? ☀️",
  "What's your favorite way to recharge after a long day? 🌙",
  "What does your perfect Saturday morning look like? ☕",
  "Coffee or tea. And what does your order say about you? ☕",
  "What's your strangest routine? 🌀",
  "What's a guilty pleasure you don't feel guilty about? 🍰",
  "What's the most underrated meal of the day? 🥞",
  "What's your comfort food and what story is attached to it? 🍜",

  // Travel & adventure
  "What's something on your bucket list? 🌍",
  "What's a place you've been that lived up to the hype? 🛫",
  "Where would you go if you had a free flight tomorrow? ✈️",
  "What's the best meal you've had on a trip? 🥘",
  "What's a city you'd move to if you could? 🏙️",
  "What's a road trip you keep meaning to take? 🛣️",
  "What's the most useful travel tip you've learned? 🧳",
  "If you could relive one trip, which one? 🌅",

  // Identity & self
  "What's a hidden talent you have? 🎯",
  "What's something most people don't know about you? 🤫",
  "If you could master any skill overnight, what would it be? 🔥",
  "What would your perfect day look like? 💭",
  "What's the last thing that genuinely excited you? ⚡",
  "What's a compliment that hit hardest? 💌",
  "What's a quality you admire in others but struggle to embody? ✨",
  "What's a way you've grown this year? 🌱",
  "What's a part of yourself you've made peace with? 🕊️",
  "What's a small win you had recently? 🏆",
  "What's something you used to believe and don't anymore? 🔄",
  "What's your love language? 💞",
  "What's a personal rule you live by? 📏",

  // Future / dreaming
  "What's a version of yourself you're growing into? 🌿",
  "What does success look like to you right now? 🎖️",
  "If you weren't doing what you do, what would you be doing? 🪄",
  "What's a dream you've never said out loud? 💫",
  "What would you do with an entirely free month? 📅",
  "What's a long-term goal you're chasing? 🎯",
  "What's a hobby you want to turn into something more? 🛠️",

  // Connection-leaning
  "What makes you instantly click with someone? ⚡",
  "What's a question you wish people asked you more? 🙋",
  "What's a small thing you do that means the world to your friends? 💛",
  "What's your favorite way to spend time with someone you love? 🫶",
  "Who's someone in your life who made you who you are? 🌟",
  "What's a quality you look for in a creative partner? 🤝",

  // Just-for-fun
  "If you were a household appliance, which one and why? 🍞",
  "What fictional character do you relate to too much? 📺",
  "What's the weirdest meal you'd order again? 🍕",
  "What's an irrational fear you have? 👻",
  "What's a small luxury you can't live without? 🛁",
  "What's a useless skill you're proud of? 🪩",
  "What's something you're terrible at but love anyway? 🎳",
];

// LocalStorage key tracking the icebreakers we've recently shown so we
// don't repeat the same suggestions every time. We avoid the last N
// shown — N is roughly 60% of the pool so the user gets meaningful
// variety before any recurrence.
const ICEBREAKER_RECENT_KEY = 'mitype-icebreaker-recent';
const ICEBREAKER_RECENT_MAX = Math.floor(ICEBREAKERS.length * 0.6);

function readRecentIcebreakers(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ICEBREAKER_RECENT_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function writeRecentIcebreakers(arr: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ICEBREAKER_RECENT_KEY, JSON.stringify(arr));
  } catch {
    /* ignore quota errors */
  }
}

export function getRandomIcebreakers(count = 3): string[] {
  const recent = new Set(readRecentIcebreakers());
  // Pick from prompts NOT in the recent window. If we've exhausted
  // the pool, fall back to the full list so we never return < count.
  let pool = ICEBREAKERS.filter((q) => !recent.has(q));
  if (pool.length < count) pool = [...ICEBREAKERS];
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, count);
  // Update the recent window — keep it bounded so we don't grow forever.
  const updated = [...picks, ...readRecentIcebreakers()].slice(0, ICEBREAKER_RECENT_MAX);
  writeRecentIcebreakers(updated);
  return picks;
}
