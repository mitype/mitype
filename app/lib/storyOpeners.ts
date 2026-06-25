// Story openers used to seed a Story Builder game so the first
// player doesn't stare at a blank page. The opener is shown but the
// first player can write their own sentence to start instead.

export const STORY_OPENERS: string[] = [
  'The mailbox had been empty for weeks. Until today.',
  'She locked the studio door, then realized she was still inside.',
  'It started with a song stuck in his head he\'d never heard before.',
  'The barista wrote a tiny message on the cup that changed everything.',
  'Three things were never supposed to happen in the same week.',
  'Nobody noticed the cat had been watching the whole time.',
  'On the morning of the show, the lead singer disappeared.',
  'The photo on the wall blinked.',
  'They\'d been writing letters to each other for six months. Neither knew the other was real.',
  'The taco truck wasn\'t supposed to be there. Not on a Tuesday.',
  'Every painting in the museum was missing a face.',
  'The text said: "Don\'t answer the door."',
  'On the 47th floor, the elevator opened to a beach.',
  'She found her grandmother\'s journal. And her own name in it.',
  'The map led to a parking lot. The parking lot led to something else.',
  'He woke up fluent in a language he\'d never learned.',
  'The radio kept playing songs from her dreams.',
  'A note in the library said: "Look up."',
  'The neighbor moved in three days ago. The mailbox already said his name.',
  'Halfway through the song, the crowd went silent.',
  'The receipt was for a meal she hadn\'t eaten yet.',
  'They were filming a documentary about a band that didn\'t exist. Yet.',
  'The dog had been waiting at the door for forty minutes before anyone knocked.',
  'The lyrics scrolled by themselves.',
  'Three identical envelopes. One contained instructions.',
];

export function pickStoryOpener(): string {
  return STORY_OPENERS[Math.floor(Math.random() * STORY_OPENERS.length)];
}
