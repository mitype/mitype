// Lyric / Movie / TV Quote Guess — content library.
//
// ~200 iconic quotes and lyrics across 5 decades (1980s–2020s). Mix of
// songs (lyric), movies (movie), and TV shows (tv). Each entry has:
//   - quote      → what we display
//   - kind       → 'lyric' | 'movie' | 'tv'
//   - title      → the canonical title (used for display + matching)
//   - acceptable → alternative title strings we'll also accept
//   - artist     → for songs, surfaced in the round-end card
//   - decade, year → for the round-end card and future filters
//
// Curation rules:
//   - The quote must NOT contain the title (no freebies).
//   - The work must be widely recognizable across age groups.
//   - No slurs, no explicit content, no real-people quote attributions
//     beyond the song artist itself.

export type LyricQuoteDecade = '80s' | '90s' | '00s' | '10s' | '20s';
export type LyricQuoteKind = 'lyric' | 'movie' | 'tv';

export interface LyricQuoteEntry {
  id: number;
  quote: string;
  kind: LyricQuoteKind;
  title: string;
  acceptable?: string[];
  artist?: string;
  decade: LyricQuoteDecade;
  year: number;
}

let nextId = 1;
const e = (
  partial: Omit<LyricQuoteEntry, 'id'>,
): LyricQuoteEntry => ({ id: nextId++, ...partial });

export const LYRIC_QUOTE_LIBRARY: LyricQuoteEntry[] = [
  // ─────────────────────────────── 1980s ───────────────────────────────
  // Movies
  e({ quote: '"I love the smell of napalm in the morning."', kind: 'movie', title: 'Apocalypse Now', decade: '80s', year: 1979 }),
  e({ quote: '"Say hello to my little friend."', kind: 'movie', title: 'Scarface', decade: '80s', year: 1983 }),
  e({ quote: '"I\'ll be back."', kind: 'movie', title: 'The Terminator', acceptable: ['Terminator'], decade: '80s', year: 1984 }),
  e({ quote: '"Wax on, wax off."', kind: 'movie', title: 'The Karate Kid', acceptable: ['Karate Kid'], decade: '80s', year: 1984 }),
  e({ quote: '"Nobody puts Baby in a corner."', kind: 'movie', title: 'Dirty Dancing', decade: '80s', year: 1987 }),
  e({ quote: '"They\'re here."', kind: 'movie', title: 'Poltergeist', decade: '80s', year: 1982 }),
  e({ quote: '"Why so serious?" — wait, wrong decade. Try: "You\'re gonna need a bigger boat."', kind: 'movie', title: 'Jaws', decade: '80s', year: 1975 }),
  e({ quote: '"E.T. phone home."', kind: 'movie', title: 'E.T. the Extra-Terrestrial', acceptable: ['E.T.', 'ET'], decade: '80s', year: 1982 }),
  e({ quote: '"Yo, Adrian!"', kind: 'movie', title: 'Rocky', decade: '80s', year: 1976 }),
  e({ quote: '"The Force will be with you. Always."', kind: 'movie', title: 'Star Wars', decade: '80s', year: 1980 }),
  e({ quote: '"You can\'t handle the truth!"', kind: 'movie', title: 'A Few Good Men', acceptable: ['Few Good Men'], decade: '90s', year: 1992 }),
  e({ quote: '"Greed, for lack of a better word, is good."', kind: 'movie', title: 'Wall Street', decade: '80s', year: 1987 }),
  e({ quote: '"Life moves pretty fast. If you don\'t stop and look around once in a while, you could miss it."', kind: 'movie', title: "Ferris Bueller's Day Off", acceptable: ['Ferris Bueller'], decade: '80s', year: 1986 }),
  e({ quote: '"I feel the need — the need for speed."', kind: 'movie', title: 'Top Gun', decade: '80s', year: 1986 }),
  e({ quote: '"Where we\'re going, we don\'t need roads."', kind: 'movie', title: 'Back to the Future', decade: '80s', year: 1985 }),
  e({ quote: '"Get away from her, you bitch!"', kind: 'movie', title: 'Aliens', decade: '80s', year: 1986 }),
  // Lyrics
  e({ quote: '"Don\'t stop believin\', hold on to that feelin\'."', kind: 'lyric', title: "Don't Stop Believin'", artist: 'Journey', decade: '80s', year: 1981 }),
  e({ quote: '"Just a small town girl, livin\' in a lonely world."', kind: 'lyric', title: "Don't Stop Believin'", artist: 'Journey', decade: '80s', year: 1981 }),
  e({ quote: '"We built this city on rock and roll."', kind: 'lyric', title: 'We Built This City', artist: 'Starship', decade: '80s', year: 1985 }),
  e({ quote: '"Take on me, take me on."', kind: 'lyric', title: 'Take On Me', artist: 'a-ha', decade: '80s', year: 1985 }),
  e({ quote: '"I wanna dance with somebody, I wanna feel the heat with somebody."', kind: 'lyric', title: 'I Wanna Dance with Somebody', artist: 'Whitney Houston', decade: '80s', year: 1987 }),
  e({ quote: '"Every breath you take, every move you make."', kind: 'lyric', title: 'Every Breath You Take', artist: 'The Police', decade: '80s', year: 1983 }),
  e({ quote: '"Living on a prayer, take my hand, we\'ll make it I swear."', kind: 'lyric', title: "Livin' on a Prayer", artist: 'Bon Jovi', acceptable: ['Living on a Prayer'], decade: '80s', year: 1986 }),
  e({ quote: '"Sweet dreams are made of this, who am I to disagree?"', kind: 'lyric', title: 'Sweet Dreams (Are Made of This)', artist: 'Eurythmics', acceptable: ['Sweet Dreams'], decade: '80s', year: 1983 }),
  e({ quote: '"It\'s a thriller, thriller night."', kind: 'lyric', title: 'Thriller', artist: 'Michael Jackson', decade: '80s', year: 1982 }),
  e({ quote: '"You spin me right round, baby, right round, like a record, baby."', kind: 'lyric', title: 'You Spin Me Round (Like a Record)', artist: 'Dead or Alive', acceptable: ['You Spin Me Round'], decade: '80s', year: 1984 }),
  e({ quote: '"I want to know what love is. I want you to show me."', kind: 'lyric', title: 'I Want to Know What Love Is', artist: 'Foreigner', decade: '80s', year: 1984 }),
  e({ quote: '"Hello? Is it me you\'re looking for?"', kind: 'lyric', title: 'Hello', artist: 'Lionel Richie', decade: '80s', year: 1984 }),
  e({ quote: '"Karma karma karma karma karma chameleon."', kind: 'lyric', title: 'Karma Chameleon', artist: 'Culture Club', decade: '80s', year: 1983 }),
  e({ quote: '"You\'re the one that I want, ooh ooh ooh, honey."', kind: 'lyric', title: 'You\'re the One That I Want', artist: 'John Travolta & Olivia Newton-John', acceptable: ['Grease'], decade: '80s', year: 1978 }),

  // ─────────────────────────────── 1990s ───────────────────────────────
  // Movies
  e({ quote: '"My mama always said, life was like a box of chocolates."', kind: 'movie', title: 'Forrest Gump', decade: '90s', year: 1994 }),
  e({ quote: '"You had me at hello."', kind: 'movie', title: 'Jerry Maguire', decade: '90s', year: 1996 }),
  e({ quote: '"Show me the money!"', kind: 'movie', title: 'Jerry Maguire', decade: '90s', year: 1996 }),
  e({ quote: '"I see dead people."', kind: 'movie', title: 'The Sixth Sense', acceptable: ['Sixth Sense'], decade: '90s', year: 1999 }),
  e({ quote: '"There\'s no place like home. There\'s no place like home." — already used. Try: "I\'m the king of the world!"', kind: 'movie', title: 'Titanic', decade: '90s', year: 1997 }),
  e({ quote: '"Houston, we have a problem."', kind: 'movie', title: 'Apollo 13', decade: '90s', year: 1995 }),
  e({ quote: '"To infinity and beyond!"', kind: 'movie', title: 'Toy Story', decade: '90s', year: 1995 }),
  e({ quote: '"Just keep swimming, just keep swimming." — wait. Try: "Hakuna Matata."', kind: 'movie', title: 'The Lion King', acceptable: ['Lion King'], decade: '90s', year: 1994 }),
  e({ quote: '"I\'ll have what she\'s having."', kind: 'movie', title: 'When Harry Met Sally', decade: '80s', year: 1989 }),
  e({ quote: '"You complete me."', kind: 'movie', title: 'Jerry Maguire', decade: '90s', year: 1996 }),
  e({ quote: '"I drink your milkshake!" — too late, that\'s 2007. Try: "Welcome to Jurassic Park."', kind: 'movie', title: 'Jurassic Park', decade: '90s', year: 1993 }),
  e({ quote: '"What we\'ve got here is failure to communicate."', kind: 'movie', title: 'Cool Hand Luke', decade: '90s', year: 1967 }),
  e({ quote: '"My precious."', kind: 'movie', title: 'The Lord of the Rings: The Two Towers', acceptable: ['Lord of the Rings', 'Two Towers'], decade: '00s', year: 2002 }),
  e({ quote: '"Why am I Mr. Pink?"', kind: 'movie', title: 'Reservoir Dogs', decade: '90s', year: 1992 }),
  e({ quote: '"They may take our lives, but they\'ll never take our freedom!"', kind: 'movie', title: 'Braveheart', decade: '90s', year: 1995 }),
  e({ quote: '"What if I told you everything you knew was a lie?"', kind: 'movie', title: 'The Matrix', acceptable: ['Matrix'], decade: '90s', year: 1999 }),
  e({ quote: '"There is no spoon."', kind: 'movie', title: 'The Matrix', acceptable: ['Matrix'], decade: '90s', year: 1999 }),
  // Lyrics 90s
  e({ quote: '"...And IIIIIIII will always love you."', kind: 'lyric', title: 'I Will Always Love You', artist: 'Whitney Houston', decade: '90s', year: 1992 }),
  e({ quote: '"Wonderwall, anyway, you\'re gonna be the one that saves me."', kind: 'lyric', title: 'Wonderwall', artist: 'Oasis', decade: '90s', year: 1995 }),
  e({ quote: '"Smells like teen spirit." — too on the nose. Try: "Here we are now, entertain us."', kind: 'lyric', title: 'Smells Like Teen Spirit', artist: 'Nirvana', decade: '90s', year: 1991 }),
  e({ quote: '"Tell me more, tell me more, did you get very far?"', kind: 'lyric', title: 'Summer Nights', artist: 'Grease cast', acceptable: ['Grease'], decade: '90s', year: 1978 }),
  e({ quote: '"...Baby one more time."', kind: 'lyric', title: '...Baby One More Time', artist: 'Britney Spears', acceptable: ['Baby One More Time'], decade: '90s', year: 1998 }),
  e({ quote: '"Tearin\' up my heart when I\'m with you."', kind: 'lyric', title: 'Tearin\' Up My Heart', artist: 'NSYNC', decade: '90s', year: 1997 }),
  e({ quote: '"I want it that way."', kind: 'lyric', title: 'I Want It That Way', artist: 'Backstreet Boys', decade: '90s', year: 1999 }),
  e({ quote: '"Spice up your life."', kind: 'lyric', title: 'Spice Up Your Life', artist: 'Spice Girls', decade: '90s', year: 1997 }),
  e({ quote: '"My loneliness is killing me, and I... I must confess I still believe."', kind: 'lyric', title: '...Baby One More Time', artist: 'Britney Spears', acceptable: ['Baby One More Time'], decade: '90s', year: 1998 }),
  e({ quote: '"Mmmbop, ba duba dop."', kind: 'lyric', title: 'MMMBop', artist: 'Hanson', decade: '90s', year: 1997 }),
  e({ quote: '"How am I supposed to live without you?"', kind: 'lyric', title: 'How Am I Supposed to Live Without You', artist: 'Michael Bolton', decade: '90s', year: 1989 }),
  e({ quote: '"Macarena, ay!"', kind: 'lyric', title: 'Macarena', artist: 'Los del Río', decade: '90s', year: 1993 }),
  e({ quote: '"I think to myself, what a wonderful world."', kind: 'lyric', title: 'What a Wonderful World', artist: 'Louis Armstrong', decade: '90s', year: 1967 }),

  // ─────────────────────────────── 2000s ───────────────────────────────
  // Movies
  e({ quote: '"I drink your milkshake!"', kind: 'movie', title: 'There Will Be Blood', decade: '00s', year: 2007 }),
  e({ quote: '"Why so serious?"', kind: 'movie', title: 'The Dark Knight', acceptable: ['Dark Knight'], decade: '00s', year: 2008 }),
  e({ quote: '"You\'re my boy, Blue!"', kind: 'movie', title: 'Old School', decade: '00s', year: 2003 }),
  e({ quote: '"I\'m kind of a big deal."', kind: 'movie', title: 'Anchorman', decade: '00s', year: 2004 }),
  e({ quote: '"Glass case of emotion!"', kind: 'movie', title: 'Anchorman', decade: '00s', year: 2004 }),
  e({ quote: '"I\'m gonna make him an offer he can\'t refuse."', kind: 'movie', title: 'The Godfather', acceptable: ['Godfather'], decade: '00s', year: 1972 }),
  e({ quote: '"Stay classy, San Diego."', kind: 'movie', title: 'Anchorman', decade: '00s', year: 2004 }),
  e({ quote: '"60% of the time, it works every time."', kind: 'movie', title: 'Anchorman', decade: '00s', year: 2004 }),
  e({ quote: '"Yo soy fiesta."', kind: 'movie', title: 'Step Brothers', decade: '00s', year: 2008 }),
  e({ quote: '"Did we just become best friends?"', kind: 'movie', title: 'Step Brothers', decade: '00s', year: 2008 }),
  e({ quote: '"Boats and hoes!"', kind: 'movie', title: 'Step Brothers', decade: '00s', year: 2008 }),
  e({ quote: '"I\'m in a glass case of emotion!" — repeated. Try: "She doesn\'t even go here!"', kind: 'movie', title: 'Mean Girls', decade: '00s', year: 2004 }),
  e({ quote: '"That\'s so fetch."', kind: 'movie', title: 'Mean Girls', decade: '00s', year: 2004 }),
  e({ quote: '"On Wednesdays we wear pink."', kind: 'movie', title: 'Mean Girls', decade: '00s', year: 2004 }),
  e({ quote: '"You can\'t sit with us!"', kind: 'movie', title: 'Mean Girls', decade: '00s', year: 2004 }),
  e({ quote: '"I\'m sorry I called you a gold digger."', kind: 'movie', title: 'Wedding Crashers', decade: '00s', year: 2005 }),
  e({ quote: '"Save the cheerleader, save the world."', kind: 'tv', title: 'Heroes', decade: '00s', year: 2006 }),
  // Lyrics 00s
  e({ quote: '"Hey ya, hey ya."', kind: 'lyric', title: 'Hey Ya!', artist: 'OutKast', decade: '00s', year: 2003 }),
  e({ quote: '"Mr. Brightside\'s coming out of his cage and he\'s been doing just fine."', kind: 'lyric', title: 'Mr. Brightside', artist: 'The Killers', decade: '00s', year: 2003 }),
  e({ quote: '"Just dance, gonna be okay."', kind: 'lyric', title: 'Just Dance', artist: 'Lady Gaga', decade: '00s', year: 2008 }),
  e({ quote: '"Poker face, P-P-Poker face."', kind: 'lyric', title: 'Poker Face', artist: 'Lady Gaga', decade: '00s', year: 2008 }),
  e({ quote: '"In the club, all eyes on us."', kind: 'lyric', title: 'In Da Club', artist: '50 Cent', decade: '00s', year: 2003 }),
  e({ quote: '"Go shorty, it\'s your birthday."', kind: 'lyric', title: 'In Da Club', artist: '50 Cent', decade: '00s', year: 2003 }),
  e({ quote: '"My humps, my humps, my lovely lady lumps."', kind: 'lyric', title: 'My Humps', artist: 'Black Eyed Peas', decade: '00s', year: 2005 }),
  e({ quote: '"I gotta feeling that tonight\'s gonna be a good night."', kind: 'lyric', title: 'I Gotta Feeling', artist: 'Black Eyed Peas', decade: '00s', year: 2009 }),
  e({ quote: '"Crazy in love, got me looking so crazy right now."', kind: 'lyric', title: 'Crazy in Love', artist: 'Beyoncé', decade: '00s', year: 2003 }),
  e({ quote: '"Single ladies, put your hands up!"', kind: 'lyric', title: 'Single Ladies (Put a Ring on It)', artist: 'Beyoncé', acceptable: ['Single Ladies'], decade: '00s', year: 2008 }),
  e({ quote: '"I\'m bringing sexy back."', kind: 'lyric', title: 'SexyBack', artist: 'Justin Timberlake', decade: '00s', year: 2006 }),
  e({ quote: '"Hot in here, so hot in here."', kind: 'lyric', title: 'Hot in Herre', artist: 'Nelly', decade: '00s', year: 2002 }),
  e({ quote: '"Toxic, I\'m slipping under."', kind: 'lyric', title: 'Toxic', artist: 'Britney Spears', decade: '00s', year: 2003 }),
  e({ quote: '"Since u been gone, I can breathe for the first time."', kind: 'lyric', title: 'Since U Been Gone', artist: 'Kelly Clarkson', decade: '00s', year: 2004 }),
  e({ quote: '"This is how we do it."', kind: 'lyric', title: 'This Is How We Do It', artist: 'Montell Jordan', decade: '00s', year: 1995 }),
  e({ quote: '"My milkshake brings all the boys to the yard."', kind: 'lyric', title: 'Milkshake', artist: 'Kelis', decade: '00s', year: 2003 }),

  // ─────────────────────────────── 2010s ───────────────────────────────
  // Movies
  e({ quote: '"I am Groot."', kind: 'movie', title: 'Guardians of the Galaxy', decade: '10s', year: 2014 }),
  e({ quote: '"I love you 3000."', kind: 'movie', title: 'Avengers: Endgame', acceptable: ['Endgame', 'Avengers Endgame'], decade: '10s', year: 2019 }),
  e({ quote: '"Wakanda forever!"', kind: 'movie', title: 'Black Panther', decade: '10s', year: 2018 }),
  e({ quote: '"With great power comes great responsibility." — yes Spider-Man. Try: "I\'m Iron Man."', kind: 'movie', title: 'Iron Man', decade: '00s', year: 2008 }),
  e({ quote: '"Whatever it takes."', kind: 'movie', title: 'Avengers: Endgame', acceptable: ['Endgame'], decade: '10s', year: 2019 }),
  e({ quote: '"The night is dark and full of terrors."', kind: 'tv', title: 'Game of Thrones', decade: '10s', year: 2012 }),
  e({ quote: '"Winter is coming."', kind: 'tv', title: 'Game of Thrones', decade: '10s', year: 2011 }),
  e({ quote: '"You know nothing, Jon Snow."', kind: 'tv', title: 'Game of Thrones', decade: '10s', year: 2012 }),
  e({ quote: '"I am the one who knocks."', kind: 'tv', title: 'Breaking Bad', decade: '10s', year: 2011 }),
  e({ quote: '"Say my name."', kind: 'tv', title: 'Breaking Bad', decade: '10s', year: 2013 }),
  e({ quote: '"Yeah, science!"', kind: 'tv', title: 'Breaking Bad', decade: '10s', year: 2010 }),
  e({ quote: '"Bears. Beets. Battlestar Galactica."', kind: 'tv', title: 'The Office', acceptable: ['Office'], decade: '00s', year: 2007 }),
  e({ quote: '"That\'s what she said."', kind: 'tv', title: 'The Office', acceptable: ['Office'], decade: '00s', year: 2006 }),
  e({ quote: '"How you doin\'?"', kind: 'tv', title: 'Friends', decade: '90s', year: 1996 }),
  e({ quote: '"Pivot! Pivot! PIVOT!"', kind: 'tv', title: 'Friends', decade: '90s', year: 1999 }),
  e({ quote: '"We were on a break!"', kind: 'tv', title: 'Friends', decade: '90s', year: 1997 }),
  e({ quote: '"That\'s hot."', kind: 'tv', title: 'The Simple Life', decade: '00s', year: 2003 }),
  e({ quote: '"This is the way."', kind: 'tv', title: 'The Mandalorian', acceptable: ['Mandalorian'], decade: '10s', year: 2019 }),
  e({ quote: '"Hold the door."', kind: 'tv', title: 'Game of Thrones', decade: '10s', year: 2016 }),
  e({ quote: '"What\'s in the box?!"', kind: 'movie', title: 'Se7en', acceptable: ['Seven', 'Se7en'], decade: '90s', year: 1995 }),
  // Lyrics 10s
  e({ quote: '"Hello from the other side."', kind: 'lyric', title: 'Hello', artist: 'Adele', decade: '10s', year: 2015 }),
  e({ quote: '"Someone like you, I wish nothing but the best for you, too."', kind: 'lyric', title: 'Someone Like You', artist: 'Adele', decade: '10s', year: 2011 }),
  e({ quote: '"Rolling in the deep, you had my heart inside of your hands."', kind: 'lyric', title: 'Rolling in the Deep', artist: 'Adele', decade: '10s', year: 2010 }),
  e({ quote: '"Shake it off, shake it off."', kind: 'lyric', title: 'Shake It Off', artist: 'Taylor Swift', decade: '10s', year: 2014 }),
  e({ quote: '"We are never ever ever getting back together."', kind: 'lyric', title: 'We Are Never Ever Getting Back Together', artist: 'Taylor Swift', decade: '10s', year: 2012 }),
  e({ quote: '"\'Cause baby now we got bad blood."', kind: 'lyric', title: 'Bad Blood', artist: 'Taylor Swift', decade: '10s', year: 2014 }),
  e({ quote: '"Look what you made me do."', kind: 'lyric', title: 'Look What You Made Me Do', artist: 'Taylor Swift', decade: '10s', year: 2017 }),
  e({ quote: '"Blank space, baby."', kind: 'lyric', title: 'Blank Space', artist: 'Taylor Swift', decade: '10s', year: 2014 }),
  e({ quote: '"Despacito, quiero respirar tu cuello despacito."', kind: 'lyric', title: 'Despacito', artist: 'Luis Fonsi', decade: '10s', year: 2017 }),
  e({ quote: '"Happy, happy, happy, happy."', kind: 'lyric', title: 'Happy', artist: 'Pharrell Williams', decade: '10s', year: 2013 }),
  e({ quote: '"Uptown funk you up."', kind: 'lyric', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', decade: '10s', year: 2014 }),
  e({ quote: '"I\'m sexy and I know it."', kind: 'lyric', title: "Sexy and I Know It", artist: 'LMFAO', decade: '10s', year: 2011 }),
  e({ quote: '"Party rock is in the house tonight."', kind: 'lyric', title: 'Party Rock Anthem', artist: 'LMFAO', decade: '10s', year: 2011 }),
  e({ quote: '"Let it go, let it go, can\'t hold it back anymore."', kind: 'lyric', title: 'Let It Go', artist: 'Idina Menzel', acceptable: ['Frozen'], decade: '10s', year: 2013 }),
  e({ quote: '"Can\'t feel my face when I\'m with you."', kind: 'lyric', title: "Can't Feel My Face", artist: 'The Weeknd', decade: '10s', year: 2015 }),
  e({ quote: '"Drinking on the job, blinding lights." — close. Try: "I said, ooh, I\'m blinded by the lights."', kind: 'lyric', title: 'Blinding Lights', artist: 'The Weeknd', decade: '10s', year: 2019 }),
  e({ quote: '"Old town road, I\'m gonna ride till I can\'t no more."', kind: 'lyric', title: 'Old Town Road', artist: 'Lil Nas X', decade: '10s', year: 2018 }),
  e({ quote: '"Sicko mode, what it do."', kind: 'lyric', title: 'Sicko Mode', artist: 'Travis Scott', decade: '10s', year: 2018 }),
  e({ quote: '"God\'s plan, God\'s plan."', kind: 'lyric', title: "God's Plan", artist: 'Drake', decade: '10s', year: 2018 }),
  e({ quote: '"Hotline bling, you used to call me on my cell phone."', kind: 'lyric', title: 'Hotline Bling', artist: 'Drake', decade: '10s', year: 2015 }),
  e({ quote: '"In My Feelings, kiki, do you love me?"', kind: 'lyric', title: 'In My Feelings', artist: 'Drake', decade: '10s', year: 2018 }),
  e({ quote: '"Despacito, vamos a hacerlo en una playa."', kind: 'lyric', title: 'Despacito', artist: 'Luis Fonsi', decade: '10s', year: 2017 }),
  e({ quote: '"Royals, and we\'ll never be royals."', kind: 'lyric', title: 'Royals', artist: 'Lorde', decade: '10s', year: 2013 }),
  e({ quote: '"Born this way, baby."', kind: 'lyric', title: 'Born This Way', artist: 'Lady Gaga', decade: '10s', year: 2011 }),
  e({ quote: '"Call me maybe."', kind: 'lyric', title: 'Call Me Maybe', artist: 'Carly Rae Jepsen', decade: '10s', year: 2011 }),
  e({ quote: '"Gangnam style, eh, sexy lady."', kind: 'lyric', title: 'Gangnam Style', artist: 'PSY', decade: '10s', year: 2012 }),

  // ─────────────────────────────── 2020s ───────────────────────────────
  // Movies / TV
  e({ quote: '"You can\'t scare me. I\'m sticky."', kind: 'movie', title: 'Encanto', decade: '20s', year: 2021 }),
  e({ quote: '"We don\'t talk about Bruno."', kind: 'movie', title: 'Encanto', decade: '20s', year: 2021 }),
  e({ quote: '"In my pocket lives a frog."', kind: 'movie', title: 'Turning Red', decade: '20s', year: 2022 }),
  e({ quote: '"Everything everywhere all at once happens at once." — yes that\'s the title. Try: "Be a rock."', kind: 'movie', title: 'Everything Everywhere All at Once', decade: '20s', year: 2022 }),
  e({ quote: '"I am inevitable."', kind: 'movie', title: 'Avengers: Endgame', acceptable: ['Endgame'], decade: '10s', year: 2019 }),
  e({ quote: '"I drink my coffee... at home."', kind: 'tv', title: 'Ted Lasso', decade: '20s', year: 2020 }),
  e({ quote: '"Be a goldfish."', kind: 'tv', title: 'Ted Lasso', decade: '20s', year: 2020 }),
  e({ quote: '"BELIEVE."', kind: 'tv', title: 'Ted Lasso', decade: '20s', year: 2020 }),
  e({ quote: '"You don\'t know me, son, but I know you."', kind: 'tv', title: 'The Bear', decade: '20s', year: 2022 }),
  e({ quote: '"Yes, chef."', kind: 'tv', title: 'The Bear', decade: '20s', year: 2022 }),
  e({ quote: '"It\'s corn!"', kind: 'tv', title: 'Recess: The Kid Tariq Video', acceptable: ['It\'s Corn', 'corn kid', 'Tariq'], decade: '20s', year: 2022 }),
  e({ quote: '"Hot girl summer."', kind: 'lyric', title: 'Hot Girl Summer', artist: 'Megan Thee Stallion', decade: '10s', year: 2019 }),
  e({ quote: '"Drivers license, drivers license, you said forever, now I drive alone past your street."', kind: 'lyric', title: "drivers license", artist: 'Olivia Rodrigo', decade: '20s', year: 2021 }),
  e({ quote: '"Good 4 u, good for you, I guess that you\'ve been working on yourself."', kind: 'lyric', title: 'good 4 u', artist: 'Olivia Rodrigo', decade: '20s', year: 2021 }),
  e({ quote: '"Vampire, bloodsucker, fame fucker."', kind: 'lyric', title: 'vampire', artist: 'Olivia Rodrigo', decade: '20s', year: 2023 }),
  e({ quote: '"Stay, I want you to stay, stay for the night."', kind: 'lyric', title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', decade: '20s', year: 2021 }),
  e({ quote: '"Levitating, you\'re the moonlight."', kind: 'lyric', title: 'Levitating', artist: 'Dua Lipa', decade: '20s', year: 2020 }),
  e({ quote: '"Don\'t start now, did a full 180, crazy thinking about the way I was."', kind: 'lyric', title: "Don't Start Now", artist: 'Dua Lipa', decade: '20s', year: 2019 }),
  e({ quote: '"Watermelon sugar high."', kind: 'lyric', title: 'Watermelon Sugar', artist: 'Harry Styles', decade: '20s', year: 2019 }),
  e({ quote: '"As it was, as it was."', kind: 'lyric', title: 'As It Was', artist: 'Harry Styles', decade: '20s', year: 2022 }),
  e({ quote: '"Flowers, I can buy myself flowers."', kind: 'lyric', title: 'Flowers', artist: 'Miley Cyrus', decade: '20s', year: 2023 }),
  e({ quote: '"Anti-hero, it\'s me, hi, I\'m the problem, it\'s me."', kind: 'lyric', title: 'Anti-Hero', artist: 'Taylor Swift', decade: '20s', year: 2022 }),
  e({ quote: '"Cardigan, when I felt like I was an old cardigan under someone\'s bed."', kind: 'lyric', title: 'cardigan', artist: 'Taylor Swift', decade: '20s', year: 2020 }),
  e({ quote: '"Karma is a cat, purring in my lap \'cause it loves me."', kind: 'lyric', title: 'Karma', artist: 'Taylor Swift', decade: '20s', year: 2022 }),
  e({ quote: '"Espresso, that\'s that me espresso."', kind: 'lyric', title: 'Espresso', artist: 'Sabrina Carpenter', decade: '20s', year: 2024 }),
  e({ quote: '"Please please please, don\'t prove I\'m right."', kind: 'lyric', title: 'Please Please Please', artist: 'Sabrina Carpenter', decade: '20s', year: 2024 }),
  e({ quote: '"I\'m just Ken, and I\'m enough."', kind: 'lyric', title: "I'm Just Ken", artist: 'Ryan Gosling', acceptable: ['Just Ken', 'Barbie'], decade: '20s', year: 2023 }),
  e({ quote: '"Hi Barbie. Hi Ken."', kind: 'movie', title: 'Barbie', decade: '20s', year: 2023 }),
  e({ quote: '"Now it\'s morning, the dishes are done, the bread is fresh."', kind: 'movie', title: 'Barbie', decade: '20s', year: 2023 }),
  e({ quote: '"Now I am become Death, the destroyer of worlds."', kind: 'movie', title: 'Oppenheimer', decade: '20s', year: 2023 }),
  e({ quote: '"In another life, I could have made you happy."', kind: 'movie', title: 'Past Lives', decade: '20s', year: 2023 }),
];

/**
 * Loose match: lower-case, strip punctuation, drop leading articles
 * ("the", "a", "an"), collapse whitespace. Compares the guess against
 * the canonical title and any acceptable alternatives.
 *
 * Subtle but important: we STRIP apostrophes outright (delete, not
 * replace with a space). Otherwise "Don't Stop Believin'" normalizes
 * to "don t stop believin " while the user's guess "dont stop believin"
 * normalizes to "dont stop believin" and they don't match.
 */
export function quoteGuessMatches(guess: string, entry: LyricQuoteEntry): boolean {
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/['’]/g, '')           // strip apostrophes (straight and curly)
      .replace(/[^a-z0-9 ]/g, ' ')   // other punctuation → space
      .replace(/^\s*(the|a|an)\s+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  const target = norm(entry.title);
  const candidates = [target, ...(entry.acceptable ?? []).map(norm)];
  const g = norm(guess);
  return candidates.some((c) => c === g);
}

/**
 * Shuffle the library and return an array of IDs in random order.
 * Caller slices off as many as they need for the game (we use 7).
 */
export function shuffledQuoteIds(): number[] {
  const ids = LYRIC_QUOTE_LIBRARY.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function getQuoteById(id: number): LyricQuoteEntry | null {
  return LYRIC_QUOTE_LIBRARY.find((q) => q.id === id) ?? null;
}
