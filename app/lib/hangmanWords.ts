// Hangman word bank.
//
// 500+ Mitype-friendly words split across 10 categories. Words are
// lowercase, letters only (we strip any accidental punctuation at use
// time anyway). We deliberately avoid 1-letter words and anything
// genuinely obscure — the game lives in messages so it should be
// guessable in 2–3 minutes by any reasonably plugged-in adult.
//
// Each entry has a hint string we surface when the guesser hits the
// "need a hint?" button. Hints are intentionally vague — they nudge,
// they don't give away.

export interface HangmanEntry {
  word: string;        // lowercase, [a-z]+ only
  category: string;    // human-readable category name
  hint: string;        // 6–14 word vague nudge
}

// Helper to add a whole batch under one category at once.
function batch(category: string, entries: Array<[string, string]>): HangmanEntry[] {
  return entries.map(([word, hint]) => ({
    word: word.toLowerCase().replace(/[^a-z]/g, ''),
    category,
    hint,
  }));
}

export const HANGMAN_WORDS: HangmanEntry[] = [
  // ─────────────────────────────────────────────────────────────────
  // Movies & TV
  // ─────────────────────────────────────────────────────────────────
  ...batch('Movies & TV', [
    ['titanic',       'A boat, an iceberg, a love story.'],
    ['gladiator',     'Rome, sandals, vengeance.'],
    ['inception',     'Dreams inside dreams.'],
    ['avatar',        'A blue planet far away.'],
    ['matrix',        'Red pill or blue pill?'],
    ['joker',         'A clown in face paint.'],
    ['frozen',        'A snowman who likes summer.'],
    ['shrek',         'A green ogre in a swamp.'],
    ['rocky',         'A boxer who eats raw eggs.'],
    ['grease',        'High school summer love and convertibles.'],
    ['jaws',          'Beach, music, big teeth.'],
    ['twilight',      'Sparkly vampires.'],
    ['narnia',        'A wardrobe and a lion.'],
    ['encanto',       'A magical Colombian family.'],
    ['moana',         'A Pacific island princess.'],
    ['tangled',       'A long-haired tower princess.'],
    ['minions',       'Yellow capsule-shaped sidekicks.'],
    ['ratatouille',   'A Parisian rat who cooks.'],
    ['coco',          'Family, music, the day of the dead.'],
    ['scarface',      'Say hello to my little friend.'],
    ['casablanca',    'Black-and-white classic, Bogart.'],
    ['amelie',        'A whimsical French daydreamer.'],
    ['parasite',      'A South Korean basement.'],
    ['oppenheimer',   'A physicist and a very loud test.'],
    ['barbie',        'Pink, plastic, a road trip.'],
    ['friends',       'Six adults in NYC apartments.'],
    ['seinfeld',      'A show about nothing.'],
    ['lost',          'A plane crash on a mysterious island.'],
    ['suits',         'A fake lawyer in a real firm.'],
    ['scandal',       'A DC fixer in a white hat.'],
    ['empire',        'A music mogul family drama.'],
    ['snowfall',      'LA in the 80s, the crack era.'],
    ['atlanta',       'A surreal rap-scene comedy.'],
    ['insecure',      'LA, friendship, awkward dating.'],
    ['ozark',         'A money launderer at a lake.'],
    ['succession',    'A media dynasty knife fight.'],
    ['euphoria',      'High school but neon and bleak.'],
    ['bridgerton',    'Regency romance with strings.'],
    ['wandavision',   'A sitcom inside a superhero show.'],
    ['mandalorian',   'This is the way.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Music
  // ─────────────────────────────────────────────────────────────────
  ...batch('Music', [
    ['beyonce',       'The queen.'],
    ['rihanna',       'A Barbadian icon who paused to do beauty.'],
    ['drake',         'A Canadian rapper who started from the bottom.'],
    ['adele',         'A British singer of slow ballads.'],
    ['eminem',        'A Detroit rapper, slim.'],
    ['madonna',       'A material girl.'],
    ['prince',        'A purple genius from Minneapolis.'],
    ['jayzee',        'Hova.'],
    ['kendrick',      'A Compton storyteller, Pulitzer winner.'],
    ['cardi',         'A Bronx rapper, ex-stripper, mega star.'],
    ['shakira',       'Hips do not lie.'],
    ['selena',        'A queen of Tejano music.'],
    ['rosalia',       'Spanish flamenco-pop reinvention.'],
    ['bieber',        'A Canadian who got famous on YouTube as a kid.'],
    ['weeknd',        'A Toronto singer, blinding lights.'],
    ['lizzo',         'Plays the flute, loves herself.'],
    ['sza',           'A neo soul-leaning storyteller.'],
    ['lorde',         'A New Zealander, royals.'],
    ['halsey',        'Bipolar pop with blue hair.'],
    ['frank',         'A frequent collaborator with himself, channel orange.'],
    ['kanye',         'A polarizing genius.'],
    ['future',        'An Atlanta auto-tune king.'],
    ['migos',         'A trap trio that loves a triplet flow.'],
    ['outkast',       'Hey ya.'],
    ['nirvana',       'A Seattle grunge legend.'],
    ['radiohead',     'Karma police, creep.'],
    ['coldplay',      'A British band, yellow, fix you.'],
    ['imagine',       'A band of dragons.'],
    ['arctic',        'British band of monkeys.'],
    ['fleetwood',     'Rumours, dreams, a Mac.'],
    ['guitar',        'Six strings, a neck.'],
    ['drums',         'You hit them.'],
    ['piano',         'Black and white keys.'],
    ['vinyl',         'Analog audio you spin.'],
    ['concert',       'A live show.'],
    ['album',         'A collection of tracks.'],
    ['lyrics',        'The words to a song.'],
    ['festival',      'A long weekend of bands.'],
    ['playlist',      'A curated stream of songs.'],
    ['headphones',    'Worn over your ears.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Food & Drink
  // ─────────────────────────────────────────────────────────────────
  ...batch('Food & Drink', [
    ['pizza',         'Triangles of cheese and sauce.'],
    ['burger',        'Beef between buns.'],
    ['sushi',         'Rice, fish, seaweed.'],
    ['tacos',         'Folded tortilla goodness.'],
    ['burrito',       'A wrapped tube of dinner.'],
    ['ramen',         'Noodles in broth.'],
    ['pasta',         'Boil it, sauce it.'],
    ['lasagna',       'Stacked pasta and cheese.'],
    ['pancakes',      'Saturday morning stack.'],
    ['waffles',       'Squares with syrup.'],
    ['omelette',      'Folded eggs.'],
    ['salad',         'Leaves with toppings.'],
    ['steak',         'A cut of beef.'],
    ['salmon',        'A pink fish.'],
    ['shrimp',        'A small curled sea creature.'],
    ['lobster',       'A fancy crustacean with claws.'],
    ['oyster',        'A shell that hides a slippery snack.'],
    ['avocado',       'Toast trend hero.'],
    ['mango',         'A sweet tropical fruit.'],
    ['pineapple',     'Spiky outside, sweet inside.'],
    ['strawberry',    'A red berry with seeds outside.'],
    ['blueberry',     'A small round antioxidant.'],
    ['watermelon',    'Big, green, full of summer.'],
    ['chocolate',     'A cocoa-based love language.'],
    ['vanilla',       'A flavor that gets a bad rap.'],
    ['cookie',        'A baked round treat.'],
    ['brownie',       'A fudgy chocolate square.'],
    ['cupcake',       'A single-serve cake.'],
    ['donut',         'A ring of fried dough.'],
    ['croissant',     'A flaky French crescent.'],
    ['baguette',      'A long French bread.'],
    ['cheese',        'Aged dairy joy.'],
    ['butter',        'Spreadable golden fat.'],
    ['honey',         'Sticky, golden, made by bees.'],
    ['coffee',        'A bean-based ritual.'],
    ['espresso',      'A tiny strong cup.'],
    ['latte',         'Coffee with steamed milk.'],
    ['matcha',        'A bright green tea powder.'],
    ['smoothie',      'Blended fruit drink.'],
    ['lemonade',      'A sour-sweet summer drink.'],
    ['cocktail',      'A mixed adult drink.'],
    ['margarita',     'Lime, tequila, salt.'],
    ['mojito',        'Mint, rum, soda.'],
    ['champagne',     'Bubbly celebration.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Animals
  // ─────────────────────────────────────────────────────────────────
  ...batch('Animals', [
    ['elephant',      'Long trunk, big ears.'],
    ['giraffe',       'Tallest animal alive.'],
    ['cheetah',       'Fastest sprinter on land.'],
    ['leopard',       'Spotted big cat.'],
    ['penguin',       'A flightless bird that loves tuxedos.'],
    ['dolphin',       'A friendly sea mammal.'],
    ['octopus',       'Eight arms and very smart.'],
    ['kangaroo',      'An Australian pocket-mom.'],
    ['koala',         'An Australian tree hugger.'],
    ['raccoon',       'A masked trash bandit.'],
    ['squirrel',      'A nut-hoarding climber.'],
    ['hedgehog',      'A small spiky ball.'],
    ['hamster',       'A pocket-sized pet rodent.'],
    ['rabbit',        'Long ears, big hops.'],
    ['turtle',        'Carries its house.'],
    ['flamingo',      'Pink, one-legged, elegant.'],
    ['peacock',       'A bird with show-off feathers.'],
    ['eagle',         'A national bird of pride.'],
    ['parrot',        'A bird that can copy you.'],
    ['butterfly',     'Was once a caterpillar.'],
    ['cricket',       'Chirps at night.'],
    ['mosquito',      'Tiny, hated, itchy.'],
    ['scorpion',      'A desert pincher with a stinger.'],
    ['lizard',        'A small scaled reptile.'],
    ['snake',         'Long and legless.'],
    ['frog',          'Pond hopper.'],
    ['hippo',         'A river horse.'],
    ['rhino',         'Big nose horn.'],
    ['zebra',         'Black and white stripes.'],
    ['panda',         'Bamboo eater from China.'],
    ['walrus',        'Tusks, blubber, mustache.'],
    ['otter',         'Holds hands while sleeping.'],
    ['seal',          'Barks, claps, eats fish.'],
    ['lemur',         'Big eyes, ringed tail, Madagascar.'],
    ['gorilla',       'A silverback in the mist.'],
    ['chimpanzee',    'A clever great ape.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Travel & Places
  // ─────────────────────────────────────────────────────────────────
  ...batch('Travel & Places', [
    ['paris',         'The Eiffel city.'],
    ['london',        'A big clock and red buses.'],
    ['tokyo',         'Neon and ramen.'],
    ['sydney',        'A shell-shaped opera house.'],
    ['rome',          'Where all roads lead.'],
    ['venice',        'A canal-laced Italian city.'],
    ['barcelona',     'A Catalan city with curvy buildings.'],
    ['amsterdam',     'Bikes and canals.'],
    ['berlin',        'A formerly walled city.'],
    ['prague',        'A castle on a hill.'],
    ['cairo',         'Pyramids and a long river.'],
    ['marrakech',     'A Moroccan market city.'],
    ['santorini',     'White houses and blue domes.'],
    ['mykonos',       'A Greek island party.'],
    ['bali',          'An Indonesian beach paradise.'],
    ['phuket',        'A Thai island getaway.'],
    ['cancun',        'A Mexican spring break spot.'],
    ['havana',        'Cigars, classic cars, Cuba.'],
    ['rio',           'Beach, samba, Christ statue.'],
    ['miami',         'Pastel deco beach city.'],
    ['vegas',         'What happens there stays there.'],
    ['nashville',     'Country music city.'],
    ['austin',        'Tacos and tech in Texas.'],
    ['portland',      'Keep it weird.'],
    ['denver',        'A mile-high city.'],
    ['seattle',       'Coffee, rain, the Space Needle.'],
    ['boston',        'Beans, the Sox, and Harvard.'],
    ['chicago',       'Deep dish and the bean.'],
    ['detroit',       'Motor City.'],
    ['atlanta',       'A southern hub of hip-hop and tech.'],
    ['houston',       'A space-launching Texas metro.'],
    ['phoenix',       'A hot desert city.'],
    ['vancouver',     'A mountain-and-water Canadian city.'],
    ['toronto',       'The 6.'],
    ['montreal',      'French Canada.'],
    ['mountain',      'Tall, rocky, snowy on top.'],
    ['beach',         'Sand and water meet.'],
    ['island',        'Surrounded by water.'],
    ['desert',        'A dry, sandy expanse.'],
    ['forest',        'Lots of trees.'],
    ['glacier',       'A slow-moving ice river.'],
    ['waterfall',     'Water falling off a cliff.'],
    ['volcano',       'Lava-spewing mountain.'],
    ['canyon',        'A deep valley.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Sports & Hobbies
  // ─────────────────────────────────────────────────────────────────
  ...batch('Sports & Hobbies', [
    ['basketball',    'Hoops, dribbles, dunks.'],
    ['football',      'NFL or soccer, depending on country.'],
    ['soccer',        'The beautiful game.'],
    ['baseball',      'Bases, bats, peanuts.'],
    ['tennis',        'Racquets and a yellow ball.'],
    ['hockey',        'On ice with sticks.'],
    ['boxing',        'Gloves on, three minute rounds.'],
    ['wrestling',     'Headlocks and grappling.'],
    ['skating',       'On wheels or blades.'],
    ['surfing',       'Riding ocean waves.'],
    ['skiing',        'Snowy slopes, long boards.'],
    ['snowboarding',  'Skiing but sideways.'],
    ['climbing',      'Going up rocks or walls.'],
    ['fishing',       'Patient water sport.'],
    ['hiking',        'A long walk in nature.'],
    ['camping',       'Sleeping outside on purpose.'],
    ['running',       'Just put one foot in front of the other.'],
    ['cycling',       'Two wheels, you pedal.'],
    ['swimming',      'Moving through water on purpose.'],
    ['yoga',          'Stretchy meditative practice.'],
    ['pilates',       'Core work on a reformer.'],
    ['gymnastics',    'Flips, beams, leotards.'],
    ['cricket',       'A bat-and-ball sport, popular in India and the UK.'],
    ['rugby',         'A rough cousin of football.'],
    ['archery',       'Bow and arrow target sport.'],
    ['knitting',      'Yarn, two needles, a sweater.'],
    ['painting',      'Brush and color.'],
    ['gardening',     'Growing your own.'],
    ['baking',        'Sweet kitchen craft.'],
    ['photography',   'Capturing moments with a lens.'],
    ['journaling',    'Writing about your day.'],
    ['reading',       'Eyes on a page.'],
    ['gaming',        'Controllers and screens.'],
    ['chess',         'Sixty-four squares of strategy.'],
    ['puzzles',       'Pieces that fit together.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Tech & Internet
  // ─────────────────────────────────────────────────────────────────
  ...batch('Tech & Internet', [
    ['internet',      'A web of computers.'],
    ['google',        'The verb for searching.'],
    ['youtube',       'A video platform.'],
    ['twitter',       'A bird app, now X.'],
    ['instagram',     'A photo-sharing app.'],
    ['facebook',      'Mark Z\'s blue app.'],
    ['tiktok',        'Short-form vertical video.'],
    ['snapchat',      'Disappearing photos.'],
    ['linkedin',      'A corporate social network.'],
    ['pinterest',     'A digital mood board.'],
    ['reddit',        'A forum of subreddits.'],
    ['discord',       'Servers, channels, voice chat.'],
    ['slack',         'Work chat with too many channels.'],
    ['notion',        'A docs-and-databases workspace.'],
    ['figma',         'Where designers live.'],
    ['github',        'Where code lives.'],
    ['apple',         'A fruit and a trillion-dollar brand.'],
    ['samsung',       'A Korean electronics giant.'],
    ['nintendo',      'A Japanese gaming icon.'],
    ['playstation',   'Sony\'s console.'],
    ['xbox',          'Microsoft\'s console.'],
    ['python',        'A snake and a popular language.'],
    ['javascript',    'The language of the web.'],
    ['keyboard',      'Where you type.'],
    ['monitor',       'A screen you look at.'],
    ['laptop',        'A portable computer.'],
    ['camera',        'A picture-taking device.'],
    ['speaker',       'Plays sound out loud.'],
    ['router',        'Beams your wifi.'],
    ['battery',       'Keeps your phone alive.'],
    ['charger',       'Powers the battery.'],
    ['software',      'The code, not the box.'],
    ['hardware',      'The box, not the code.'],
    ['streaming',     'Watching without downloading.'],
    ['podcast',       'On-demand audio shows.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Around the house
  // ─────────────────────────────────────────────────────────────────
  ...batch('Around the house', [
    ['kitchen',       'Where the food happens.'],
    ['bedroom',       'Where the sleep happens.'],
    ['bathroom',      'Where the rubber duck lives.'],
    ['balcony',       'A small outdoor perch.'],
    ['garage',        'Where your car parks.'],
    ['attic',         'Top of the house.'],
    ['basement',      'Bottom of the house.'],
    ['fireplace',     'Cozy winter centerpiece.'],
    ['couch',         'Where you Netflix.'],
    ['mattress',      'Sleeps you.'],
    ['blanket',       'Keeps you warm.'],
    ['pillow',        'Cushions your head.'],
    ['curtains',      'Cover the windows.'],
    ['carpet',        'Soft floor.'],
    ['mirror',        'Reflects you.'],
    ['vacuum',        'Sucks up dust.'],
    ['washer',        'Cleans clothes.'],
    ['dryer',         'Dries clothes.'],
    ['toaster',       'Browns your bread.'],
    ['blender',       'Liquifies stuff.'],
    ['microwave',     'Heats fast.'],
    ['oven',          'Bakes things.'],
    ['kettle',        'Boils water.'],
    ['fridge',        'Cold storage.'],
    ['dishwasher',    'Cleans plates for you.'],
    ['radiator',      'Old-school heater.'],
    ['hallway',       'A passage between rooms.'],
    ['closet',        'Where clothes live.'],
    ['drawer',        'A pull-out compartment.'],
    ['shelf',         'A horizontal surface for stuff.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Things you wear
  // ─────────────────────────────────────────────────────────────────
  ...batch('Things you wear', [
    ['sneakers',      'Casual rubber-soled shoes.'],
    ['boots',         'High-top shoes for weather or style.'],
    ['heels',         'Tall shoes for the office or a date.'],
    ['sandals',       'Open shoes for summer.'],
    ['jacket',        'A light coat.'],
    ['hoodie',        'A pullover with a hood.'],
    ['blazer',        'A structured upgrade to a sweater.'],
    ['cardigan',      'A button-up knit.'],
    ['sweater',       'A pullover knit.'],
    ['trousers',      'Tailored pants.'],
    ['shorts',        'Pants but shorter.'],
    ['leggings',      'Stretchy form-fit pants.'],
    ['dress',         'A one-piece outfit.'],
    ['skirt',         'A bottom without legs.'],
    ['scarf',         'A long wrap for the neck.'],
    ['gloves',        'Cover your hands.'],
    ['beanie',        'A snug winter hat.'],
    ['cap',           'A baseball-style hat.'],
    ['sunglasses',    'Shade for your eyes.'],
    ['watch',         'Wears time on your wrist.'],
    ['necklace',      'A jewelry piece for your neck.'],
    ['bracelet',      'A jewelry piece for your wrist.'],
    ['earrings',      'Hang from your ears.'],
    ['backpack',      'A bag for your back.'],
    ['wallet',        'Holds your cards.'],
    ['umbrella',      'Keeps the rain off.'],
  ]),

  // ─────────────────────────────────────────────────────────────────
  // Vibes / states of being
  // ─────────────────────────────────────────────────────────────────
  ...batch('Vibes & feelings', [
    ['inspired',      'Lit up by an idea.'],
    ['curious',       'Eager to know more.'],
    ['ambitious',     'Hungry for more.'],
    ['confident',     'Sure of yourself.'],
    ['grateful',      'Thankful for what you have.'],
    ['grounded',      'Calm and stable.'],
    ['restless',      'Unable to settle.'],
    ['nostalgic',     'Sweetly missing the past.'],
    ['romantic',      'Soft, candle-lit energy.'],
    ['playful',       'Light and fun.'],
    ['cozy',          'Blankets and warm drinks.'],
    ['fearless',      'Without fear.'],
    ['hopeful',       'Looking forward.'],
    ['focused',       'Locked in.'],
    ['energized',     'Full of pep.'],
    ['exhausted',     'Tank empty.'],
    ['blissful',      'Floaty happy.'],
    ['mellow',        'Soft and chill.'],
    ['mindful',       'Present in the moment.'],
    ['fierce',        'Bold and unafraid.'],
    ['radiant',       'Glowing from inside.'],
    ['serene',        'Calmly at peace.'],
    ['joyful',        'Full of joy.'],
  ]),
];

/**
 * Pick N random word entries, deterministically rotated by a seed (so
 * the same conversation doesn't repeat the same words within a short
 * window). We shuffle a copy of the bank and slice.
 */
export function pickHangmanWords(count: number, seed?: number): HangmanEntry[] {
  const pool = [...HANGMAN_WORDS];
  // Fisher-Yates with optional seeded RNG
  let s = seed ?? Math.floor(Math.random() * 2_000_000_000);
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(1, count));
}
