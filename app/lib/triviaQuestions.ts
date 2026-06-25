// Trivia question bank for the live multiplayer Trivia Battle game.
//
// Categories map loosely to Mitype's creator categories so the
// questions feel native to the audience (Music, Film/TV, Art,
// Literature, Sports, Food, Tech, Pop Culture, History, Science,
// Geography, General). 350+ questions total — enough that two
// players can play many full games before seeing a repeat.
//
// Format:
//   q             : the question text
//   options       : 4 string choices
//   correctIndex  : 0-3 index of the right answer
//   category      : tag (see TRIVIA_CATEGORIES below)
//   difficulty?   : 'easy' | 'medium' | 'hard' (optional)

export type TriviaCategory =
  | 'music'
  | 'film_tv'
  | 'art_design'
  | 'literature'
  | 'sports'
  | 'food'
  | 'tech'
  | 'pop_culture'
  | 'history'
  | 'science'
  | 'geography'
  | 'general';

export const TRIVIA_CATEGORIES: { key: TriviaCategory; label: string; emoji: string }[] = [
  { key: 'music',       label: 'Music',         emoji: '🎵' },
  { key: 'film_tv',     label: 'Film & TV',     emoji: '🎬' },
  { key: 'art_design',  label: 'Art & Design',  emoji: '🎨' },
  { key: 'literature',  label: 'Literature',    emoji: '📚' },
  { key: 'sports',      label: 'Sports',        emoji: '🏀' },
  { key: 'food',        label: 'Food & Drink',  emoji: '🍕' },
  { key: 'tech',        label: 'Tech',          emoji: '💻' },
  { key: 'pop_culture', label: 'Pop Culture',   emoji: '🌟' },
  { key: 'history',     label: 'History',       emoji: '📜' },
  { key: 'science',     label: 'Science',       emoji: '🔬' },
  { key: 'geography',   label: 'Geography',     emoji: '🗺️' },
  { key: 'general',     label: 'General',       emoji: '💡' },
];

export interface TriviaQuestion {
  q: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  category: TriviaCategory;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // -------------------- MUSIC --------------------
  { q: 'Which artist released the album "Thriller" in 1982?', options: ['Prince', 'Michael Jackson', 'Stevie Wonder', 'Lionel Richie'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'Which band\'s drummer is Lars Ulrich?', options: ['Iron Maiden', 'Metallica', 'Pantera', 'Slayer'], correctIndex: 1, category: 'music' },
  { q: 'Which Beyoncé album was released in 2016?', options: ['4', 'Lemonade', 'Renaissance', 'B\'Day'], correctIndex: 1, category: 'music' },
  { q: 'Who produced most of Kendrick Lamar\'s "DAMN."?', options: ['Pharrell', 'Mike Will Made-It', 'Sounwave', 'DJ Khaled'], correctIndex: 2, category: 'music', difficulty: 'medium' },
  { q: '"Bohemian Rhapsody" was released by which band?', options: ['The Who', 'Led Zeppelin', 'Queen', 'Pink Floyd'], correctIndex: 2, category: 'music', difficulty: 'easy' },
  { q: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '7'], correctIndex: 2, category: 'music', difficulty: 'easy' },
  { q: 'Which artist is known as "Slim Shady"?', options: ['Jay-Z', 'Eminem', '50 Cent', 'Nas'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'What does DJ stand for?', options: ['Direct Jock', 'Disco Jam', 'Disc Jockey', 'Drum Joint'], correctIndex: 2, category: 'music', difficulty: 'easy' },
  { q: 'Adele\'s hit "Hello" came from which album?', options: ['19', '21', '25', '30'], correctIndex: 2, category: 'music' },
  { q: 'Who wrote "Like a Rolling Stone"?', options: ['Neil Young', 'Bob Dylan', 'Bruce Springsteen', 'Tom Petty'], correctIndex: 1, category: 'music' },
  { q: 'Which rapper founded Cash Money Records?', options: ['Drake', 'Lil Wayne', 'Birdman', '2 Chainz'], correctIndex: 2, category: 'music', difficulty: 'medium' },
  { q: 'Which Taylor Swift album re-recorded "All Too Well (10 Minute Version)"?', options: ['Lover', 'folklore', 'Red (Taylor\'s Version)', 'Midnights'], correctIndex: 2, category: 'music' },
  { q: '"No Scrubs" was a hit for which group?', options: ['Destiny\'s Child', 'TLC', 'En Vogue', 'SWV'], correctIndex: 1, category: 'music' },
  { q: 'Which key has no sharps or flats?', options: ['C major', 'G major', 'F major', 'D major'], correctIndex: 0, category: 'music', difficulty: 'medium' },
  { q: 'How many lines are in a music staff?', options: ['4', '5', '6', '7'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'Who sang "Rolling in the Deep"?', options: ['Sam Smith', 'Adele', 'Florence Welch', 'Amy Winehouse'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'Which DJ produced "One Kiss" with Dua Lipa?', options: ['Calvin Harris', 'David Guetta', 'Diplo', 'Zedd'], correctIndex: 0, category: 'music' },
  { q: 'Which Beatle was the youngest at the time of their debut?', options: ['John Lennon', 'Paul McCartney', 'George Harrison', 'Ringo Starr'], correctIndex: 2, category: 'music', difficulty: 'medium' },
  { q: 'Daft Punk was from which country?', options: ['Germany', 'USA', 'France', 'Canada'], correctIndex: 2, category: 'music' },
  { q: 'How many keys are on a standard piano?', options: ['78', '88', '92', '98'], correctIndex: 1, category: 'music', difficulty: 'medium' },
  { q: 'Which Drake album won Album of the Year at the Grammys?', options: ['Take Care', 'Views', 'Scorpion', 'None'], correctIndex: 3, category: 'music', difficulty: 'hard' },
  { q: 'Which artist released "Dangerous Woman" in 2016?', options: ['Camila Cabello', 'Ariana Grande', 'Selena Gomez', 'Demi Lovato'], correctIndex: 1, category: 'music' },
  { q: 'A "soprano" sings in which vocal range?', options: ['Lowest female', 'Highest female', 'Lowest male', 'Highest male'], correctIndex: 1, category: 'music' },
  { q: 'Who produced Frank Ocean\'s "Blonde"?', options: ['Frank Ocean & various', 'Pharrell', 'Tyler the Creator', 'Kanye West'], correctIndex: 0, category: 'music' },
  { q: 'Which band did George Harrison play in?', options: ['The Rolling Stones', 'The Beatles', 'The Kinks', 'The Yardbirds'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'BTS is from which country?', options: ['Japan', 'South Korea', 'China', 'Thailand'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'How many Grammys has Beyoncé won (as of 2024, most ever)?', options: ['28', '32', '32+', '40'], correctIndex: 2, category: 'music' },
  { q: 'Whose album is "good kid, m.A.A.d city"?', options: ['Drake', 'J. Cole', 'Kendrick Lamar', 'Childish Gambino'], correctIndex: 2, category: 'music' },
  { q: '"Smells Like Teen Spirit" launched which band?', options: ['Pearl Jam', 'Soundgarden', 'Nirvana', 'Alice in Chains'], correctIndex: 2, category: 'music', difficulty: 'easy' },
  { q: 'Which Stevie Wonder album opens with "Sir Duke"?', options: ['Innervisions', 'Songs in the Key of Life', 'Talking Book', 'Hotter than July'], correctIndex: 1, category: 'music', difficulty: 'medium' },
  { q: 'Who produced "Donda" (2021)?', options: ['Kanye West', 'Pharrell', 'Jay-Z', 'Mike Dean & various'], correctIndex: 3, category: 'music', difficulty: 'hard' },
  { q: 'Which is NOT a brass instrument?', options: ['Trumpet', 'Trombone', 'Flute', 'Tuba'], correctIndex: 2, category: 'music', difficulty: 'easy' },
  { q: 'SZA\'s breakout album was called?', options: ['Ctrl', 'SOS', 'Z', 'Z+'], correctIndex: 0, category: 'music' },
  { q: 'Who is "The Boss"?', options: ['Bob Seger', 'Bruce Springsteen', 'Bob Dylan', 'Billy Joel'], correctIndex: 1, category: 'music', difficulty: 'easy' },
  { q: 'Tame Impala is essentially the project of?', options: ['Kevin Parker', 'James Mercer', 'Wayne Coyne', 'Damon Albarn'], correctIndex: 0, category: 'music' },
  { q: 'Whose voice opens "Hotel California"?', options: ['Glenn Frey', 'Don Henley', 'Joe Walsh', 'Don Felder'], correctIndex: 1, category: 'music', difficulty: 'medium' },
  { q: 'Who founded Roc-A-Fella Records?', options: ['Diddy', 'Russell Simmons', 'Jay-Z & Dame Dash', 'Master P'], correctIndex: 2, category: 'music' },
  { q: 'Which is the highest male singing voice?', options: ['Bass', 'Baritone', 'Tenor', 'Counter-tenor'], correctIndex: 3, category: 'music', difficulty: 'medium' },
  { q: 'A "treble clef" usually marks notes in what register?', options: ['Bass', 'Middle', 'High', 'Percussion'], correctIndex: 2, category: 'music' },
  { q: 'Who released "After Hours" in 2020?', options: ['The Weeknd', 'Lorde', 'Drake', 'Khalid'], correctIndex: 0, category: 'music', difficulty: 'easy' },

  // -------------------- FILM & TV --------------------
  { q: 'Which film won Best Picture in 2020?', options: ['1917', 'Joker', 'Parasite', 'Once Upon a Time in Hollywood'], correctIndex: 2, category: 'film_tv', difficulty: 'easy' },
  { q: 'Who directed Pulp Fiction?', options: ['Quentin Tarantino', 'Martin Scorsese', 'Spike Lee', 'Paul Thomas Anderson'], correctIndex: 0, category: 'film_tv' },
  { q: 'In Inception, what triggers a "kick"?', options: ['Falling', 'Music', 'Water', 'A sudden drop or sensation'], correctIndex: 3, category: 'film_tv' },
  { q: 'The Office (US) is set in which city?', options: ['Albany, NY', 'Scranton, PA', 'Hartford, CT', 'Allentown, PA'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'How many Infinity Stones are there in the MCU?', options: ['5', '6', '7', '8'], correctIndex: 1, category: 'film_tv' },
  { q: 'Who played Daenerys Targaryen?', options: ['Emilia Clarke', 'Maisie Williams', 'Sophie Turner', 'Natalie Dormer'], correctIndex: 0, category: 'film_tv', difficulty: 'easy' },
  { q: 'Which Pixar film features Joy and Sadness?', options: ['Soul', 'Inside Out', 'Up', 'Coco'], correctIndex: 1, category: 'film_tv' },
  { q: 'What\'s the name of the wizarding bank in Harry Potter?', options: ['Veritaserum', 'Gringotts', 'Olivander\'s', 'Diagon'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'In Breaking Bad, what does Walter White call himself?', options: ['Tuco', 'Heisenberg', 'Salamanca', 'Goodman'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'Who directed "Get Out" (2017)?', options: ['Jordan Peele', 'Spike Lee', 'Steve McQueen', 'Ava DuVernay'], correctIndex: 0, category: 'film_tv' },
  { q: 'How many seasons of Friends are there?', options: ['8', '9', '10', '11'], correctIndex: 2, category: 'film_tv', difficulty: 'easy' },
  { q: 'Stranger Things is set in which state?', options: ['Indiana', 'Ohio', 'Michigan', 'Wisconsin'], correctIndex: 0, category: 'film_tv' },
  { q: 'Which film features the quote "Here\'s looking at you, kid"?', options: ['Gone with the Wind', 'Casablanca', 'The Maltese Falcon', 'Citizen Kane'], correctIndex: 1, category: 'film_tv' },
  { q: 'Who plays Beth Dutton on Yellowstone?', options: ['Kelly Reilly', 'Kelly Macdonald', 'Kate Beckinsale', 'Kelly Ripa'], correctIndex: 0, category: 'film_tv' },
  { q: 'Squid Game first dropped on Netflix in which year?', options: ['2019', '2020', '2021', '2022'], correctIndex: 2, category: 'film_tv' },
  { q: 'Who directed "Eternal Sunshine of the Spotless Mind"?', options: ['Wes Anderson', 'Spike Jonze', 'Michel Gondry', 'Charlie Kaufman'], correctIndex: 2, category: 'film_tv', difficulty: 'medium' },
  { q: 'What\'s the highest-grossing film of all time (unadjusted)?', options: ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars VII'], correctIndex: 0, category: 'film_tv' },
  { q: 'Who plays Tony Soprano?', options: ['Robert De Niro', 'James Gandolfini', 'Al Pacino', 'Joe Pesci'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'What year did The Sopranos premiere?', options: ['1997', '1999', '2001', '2003'], correctIndex: 1, category: 'film_tv', difficulty: 'medium' },
  { q: 'Who wrote and directed "Lady Bird"?', options: ['Greta Gerwig', 'Sofia Coppola', 'Olivia Wilde', 'Chloé Zhao'], correctIndex: 0, category: 'film_tv' },
  { q: 'Which actor plays Wolverine?', options: ['Chris Hemsworth', 'Hugh Jackman', 'Tom Hardy', 'Ryan Reynolds'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'Which streaming service released "The Bear"?', options: ['Netflix', 'Hulu / FX', 'Disney+', 'Apple TV+'], correctIndex: 1, category: 'film_tv' },
  { q: 'In Game of Thrones, who is the "King in the North"?', options: ['Rob Stark', 'Jon Snow', 'Bran Stark', 'All of these at various points'], correctIndex: 3, category: 'film_tv', difficulty: 'medium' },
  { q: 'Spike Lee\'s "Do the Right Thing" was released in?', options: ['1985', '1989', '1991', '1993'], correctIndex: 1, category: 'film_tv' },
  { q: 'Which actress is known for "Killing Eve" and "Borderlands"?', options: ['Sandra Oh', 'Awkwafina', 'Constance Wu', 'Lucy Liu'], correctIndex: 0, category: 'film_tv' },
  { q: 'Who composed the iconic score for "Jaws"?', options: ['Hans Zimmer', 'John Williams', 'Danny Elfman', 'Howard Shore'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'Black Panther was directed by?', options: ['Ryan Coogler', 'Jordan Peele', 'F. Gary Gray', 'Barry Jenkins'], correctIndex: 0, category: 'film_tv' },
  { q: 'What is Hayao Miyazaki\'s studio?', options: ['Studio Ghibli', 'Toho', 'Madhouse', 'Pierrot'], correctIndex: 0, category: 'film_tv', difficulty: 'easy' },
  { q: 'Which Pixar movie is about a rat who cooks?', options: ['Up', 'Ratatouille', 'A Bug\'s Life', 'Wall-E'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'Which actor plays The Joker in "The Dark Knight"?', options: ['Joaquin Phoenix', 'Heath Ledger', 'Jared Leto', 'Jack Nicholson'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'A24 distributed which Best Picture winner?', options: ['Moonlight', 'Parasite', 'CODA', 'All of these'], correctIndex: 3, category: 'film_tv', difficulty: 'medium' },
  { q: 'The Mandalorian first streamed on?', options: ['Disney+', 'Hulu', 'Apple TV+', 'HBO Max'], correctIndex: 0, category: 'film_tv', difficulty: 'easy' },
  { q: 'Who directed "Oppenheimer" (2023)?', options: ['Christopher Nolan', 'Denis Villeneuve', 'David Fincher', 'Damien Chazelle'], correctIndex: 0, category: 'film_tv', difficulty: 'easy' },
  { q: 'What\'s the highest-rated TV show on IMDb (as of mid-2020s)?', options: ['The Wire', 'Breaking Bad', 'The Sopranos', 'Planet Earth II'], correctIndex: 1, category: 'film_tv', difficulty: 'medium' },
  { q: 'Who plays Saul Goodman?', options: ['Bryan Cranston', 'Bob Odenkirk', 'Giancarlo Esposito', 'Aaron Paul'], correctIndex: 1, category: 'film_tv' },
  { q: 'The "Phase Four" MCU film featuring Shang-Chi was directed by?', options: ['Destin Daniel Cretton', 'Chloé Zhao', 'Cate Shortland', 'Ryan Coogler'], correctIndex: 0, category: 'film_tv' },
  { q: 'What animated series follows the airbender Aang?', options: ['Adventure Time', 'Avatar: The Last Airbender', 'The Owl House', 'Steven Universe'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'Which streaming service made "Ted Lasso"?', options: ['Netflix', 'Hulu', 'Apple TV+', 'Amazon Prime'], correctIndex: 2, category: 'film_tv' },
  { q: 'Who directed "Birdman" (2014)?', options: ['Alejandro González Iñárritu', 'Alfonso Cuarón', 'Guillermo del Toro', 'Paul Thomas Anderson'], correctIndex: 0, category: 'film_tv' },
  { q: 'What did Hayao Miyazaki say "Spirited Away" was inspired by?', options: ['Alice in Wonderland', 'Shinto folklore', 'European fairy tales', 'All of these'], correctIndex: 3, category: 'film_tv', difficulty: 'hard' },
  { q: 'The Matrix was released in?', options: ['1997', '1999', '2001', '2003'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: 'Who directed "Lost in Translation"?', options: ['Sofia Coppola', 'Wes Anderson', 'Spike Jonze', 'Greta Gerwig'], correctIndex: 0, category: 'film_tv' },
  { q: 'In "Succession," what\'s the family business?', options: ['Tech', 'Banking', 'Media', 'Hotels'], correctIndex: 2, category: 'film_tv' },
  { q: 'Which film has the line "I see dead people"?', options: ['The Others', 'Sixth Sense', 'Signs', 'Unbreakable'], correctIndex: 1, category: 'film_tv', difficulty: 'easy' },
  { q: '"There will be blood" was directed by?', options: ['Paul Thomas Anderson', 'David Fincher', 'Wes Anderson', 'Quentin Tarantino'], correctIndex: 0, category: 'film_tv' },

  // -------------------- ART & DESIGN --------------------
  { q: 'Who painted the ceiling of the Sistine Chapel?', options: ['Raphael', 'Leonardo da Vinci', 'Michelangelo', 'Donatello'], correctIndex: 2, category: 'art_design', difficulty: 'easy' },
  { q: 'Which artist is famous for cutting off his own ear?', options: ['Picasso', 'Monet', 'Van Gogh', 'Cézanne'], correctIndex: 2, category: 'art_design', difficulty: 'easy' },
  { q: '"The Persistence of Memory" (melting clocks) was painted by?', options: ['Dalí', 'Magritte', 'Miró', 'Chagall'], correctIndex: 0, category: 'art_design' },
  { q: 'Which artist co-founded Cubism with Picasso?', options: ['Matisse', 'Braque', 'Léger', 'Gris'], correctIndex: 1, category: 'art_design', difficulty: 'medium' },
  { q: 'Frida Kahlo was from which country?', options: ['Spain', 'Argentina', 'Mexico', 'Cuba'], correctIndex: 2, category: 'art_design', difficulty: 'easy' },
  { q: 'The Bauhaus school originated in which country?', options: ['France', 'Germany', 'Italy', 'Netherlands'], correctIndex: 1, category: 'art_design' },
  { q: 'Who designed the iPhone\'s industrial design?', options: ['Steve Jobs', 'Jony Ive', 'Dieter Rams', 'Tim Cook'], correctIndex: 1, category: 'art_design' },
  { q: 'The Mona Lisa hangs in which museum?', options: ['The Met', 'The Louvre', 'The Prado', 'The Uffizi'], correctIndex: 1, category: 'art_design', difficulty: 'easy' },
  { q: 'Which color theory primary set does CMYK use?', options: ['Light', 'Subtractive print', 'Additive', 'Both'], correctIndex: 1, category: 'art_design' },
  { q: 'Banksy is most known for which art form?', options: ['Oil painting', 'Sculpture', 'Street art / stencil', 'Performance'], correctIndex: 2, category: 'art_design', difficulty: 'easy' },
  { q: 'Andy Warhol painted famous cans of?', options: ['Spam', 'Heinz', 'Campbell\'s Soup', 'Coke'], correctIndex: 2, category: 'art_design', difficulty: 'easy' },
  { q: '"The Starry Night" was painted in?', options: ['1789', '1889', '1789', '1969'], correctIndex: 1, category: 'art_design' },
  { q: 'Which font is the default in Apple Pages?', options: ['Helvetica', 'Times', 'SF Pro', 'Arial'], correctIndex: 2, category: 'art_design', difficulty: 'medium' },
  { q: 'Pantone publishes a "Color of the Year." 2024\'s was?', options: ['Peach Fuzz', 'Living Coral', 'Very Peri', 'Viva Magenta'], correctIndex: 0, category: 'art_design' },
  { q: 'Which artist created "The Scream"?', options: ['Munch', 'Klimt', 'Schiele', 'Kandinsky'], correctIndex: 0, category: 'art_design' },
  { q: 'Which is a sans-serif typeface?', options: ['Garamond', 'Helvetica', 'Times New Roman', 'Baskerville'], correctIndex: 1, category: 'art_design' },
  { q: 'Yayoi Kusama is most known for?', options: ['Black-and-white photography', 'Polka dots and infinity rooms', 'Realist sculpture', 'Renaissance painting'], correctIndex: 1, category: 'art_design', difficulty: 'easy' },
  { q: 'The Eiffel Tower was originally built for which event?', options: ['1889 World\'s Fair', 'WWII Memorial', 'French Revolution', 'Universal Exposition 1900'], correctIndex: 0, category: 'art_design' },
  { q: 'Who painted "Girl with a Pearl Earring"?', options: ['Rembrandt', 'Vermeer', 'van Eyck', 'Brueghel'], correctIndex: 1, category: 'art_design' },
  { q: 'Frank Lloyd Wright was a famous?', options: ['Painter', 'Architect', 'Sculptor', 'Filmmaker'], correctIndex: 1, category: 'art_design', difficulty: 'easy' },
  { q: 'What\'s the principle of "less is more" associated with?', options: ['Bauhaus', 'Mies van der Rohe', 'Minimalism', 'All of these'], correctIndex: 3, category: 'art_design', difficulty: 'medium' },
  { q: 'Which design tool is owned by Adobe?', options: ['Figma', 'Sketch', 'XD', 'Webflow'], correctIndex: 2, category: 'art_design' },
  { q: 'Basquiat\'s art is often associated with which movement?', options: ['Pop Art', 'Neo-expressionism', 'Surrealism', 'Cubism'], correctIndex: 1, category: 'art_design' },
  { q: 'Which is NOT a typography term?', options: ['Kerning', 'Leading', 'Tracking', 'Vignette'], correctIndex: 3, category: 'art_design', difficulty: 'medium' },
  { q: 'Who is the most expensive contemporary artist alive (in record auction)?', options: ['Jeff Koons', 'Damien Hirst', 'David Hockney', 'Jasper Johns'], correctIndex: 0, category: 'art_design', difficulty: 'hard' },
  { q: 'The Guggenheim Museum in NYC was designed by?', options: ['I.M. Pei', 'Frank Lloyd Wright', 'Frank Gehry', 'Zaha Hadid'], correctIndex: 1, category: 'art_design' },
  { q: 'Which color is opposite red on the color wheel?', options: ['Yellow', 'Blue', 'Green', 'Purple'], correctIndex: 2, category: 'art_design', difficulty: 'easy' },
  { q: 'Who founded Studio Ghibli?', options: ['Miyazaki & Takahata', 'Hosoda & Yonebayashi', 'Tezuka & Otomo', 'Anno & Shinkai'], correctIndex: 0, category: 'art_design' },
  { q: 'Which is the smallest type size readable at arm\'s length?', options: ['6pt', '8pt', '10pt', '12pt'], correctIndex: 1, category: 'art_design' },
  { q: 'Which artist sold his work mostly via Christie\'s NFTs (2021)?', options: ['Banksy', 'Beeple', 'KAWS', 'Hirst'], correctIndex: 1, category: 'art_design' },

  // -------------------- LITERATURE --------------------
  { q: 'Who wrote "Beloved"?', options: ['Toni Morrison', 'Alice Walker', 'Maya Angelou', 'Zora Neale Hurston'], correctIndex: 0, category: 'literature', difficulty: 'medium' },
  { q: 'Which novel begins "Call me Ishmael."?', options: ['Moby-Dick', 'The Old Man and the Sea', 'Treasure Island', 'Heart of Darkness'], correctIndex: 0, category: 'literature' },
  { q: 'How many Harry Potter books are there?', options: ['6', '7', '8', '9'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Who wrote "The Great Gatsby"?', options: ['Hemingway', 'Fitzgerald', 'Steinbeck', 'Faulkner'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Which author created Sherlock Holmes?', options: ['Agatha Christie', 'Arthur Conan Doyle', 'Edgar Allan Poe', 'Wilkie Collins'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: '"1984" was written by?', options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'Kurt Vonnegut'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Who wrote "The Color Purple"?', options: ['Toni Morrison', 'Alice Walker', 'Octavia Butler', 'Audre Lorde'], correctIndex: 1, category: 'literature' },
  { q: '"To Kill a Mockingbird" was written by?', options: ['Harper Lee', 'Truman Capote', 'Carson McCullers', 'Eudora Welty'], correctIndex: 0, category: 'literature' },
  { q: 'Which Stephen King novel features a giant clown?', options: ['Carrie', 'It', 'Misery', 'The Shining'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: '"The Catcher in the Rye" protagonist is named?', options: ['Holden Caulfield', 'Holden McNeil', 'Holden Beauford', 'Jay Gatsby'], correctIndex: 0, category: 'literature' },
  { q: 'Which author wrote "The Handmaid\'s Tale"?', options: ['Doris Lessing', 'Margaret Atwood', 'Ursula K. Le Guin', 'Octavia Butler'], correctIndex: 1, category: 'literature' },
  { q: '"A Game of Thrones" novel series is by?', options: ['Brandon Sanderson', 'George R.R. Martin', 'Robert Jordan', 'Robin Hobb'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Who wrote "Pride and Prejudice"?', options: ['Charlotte Brontë', 'Jane Austen', 'Emily Brontë', 'Virginia Woolf'], correctIndex: 1, category: 'literature' },
  { q: 'Which novel features the world of Pemberley?', options: ['Wuthering Heights', 'Pride and Prejudice', 'Sense and Sensibility', 'Emma'], correctIndex: 1, category: 'literature' },
  { q: 'Who wrote "Norwegian Wood"?', options: ['Haruki Murakami', 'Banana Yoshimoto', 'Yukio Mishima', 'Kenzaburo Oe'], correctIndex: 0, category: 'literature' },
  { q: 'The "Foundation" series was written by?', options: ['Isaac Asimov', 'Arthur C. Clarke', 'Philip K. Dick', 'Frank Herbert'], correctIndex: 0, category: 'literature' },
  { q: 'Who wrote "Things Fall Apart"?', options: ['Wole Soyinka', 'Chinua Achebe', 'Ngũgĩ wa Thiong\'o', 'Ben Okri'], correctIndex: 1, category: 'literature' },
  { q: 'Which poet wrote "The Waste Land"?', options: ['Ezra Pound', 'T.S. Eliot', 'W.H. Auden', 'W.B. Yeats'], correctIndex: 1, category: 'literature' },
  { q: 'Bram Stoker is most known for which novel?', options: ['Frankenstein', 'Dracula', 'Dr. Jekyll and Mr. Hyde', 'The Picture of Dorian Gray'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Who created the character James Bond?', options: ['John le Carré', 'Ian Fleming', 'Frederick Forsyth', 'Robert Ludlum'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: '"The Road" was written by?', options: ['Don DeLillo', 'Cormac McCarthy', 'Philip Roth', 'David Foster Wallace'], correctIndex: 1, category: 'literature' },
  { q: 'Which novel\'s protagonist is named Atticus Finch?', options: ['To Kill a Mockingbird', 'The Great Gatsby', 'The Grapes of Wrath', 'A Farewell to Arms'], correctIndex: 0, category: 'literature', difficulty: 'easy' },
  { q: 'Who wrote "The Alchemist"?', options: ['Gabriel García Márquez', 'Paulo Coelho', 'Isabel Allende', 'Carlos Ruiz Zafón'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Which novel features the world of Westeros?', options: ['Lord of the Rings', 'A Song of Ice and Fire', 'The Wheel of Time', 'The Stormlight Archive'], correctIndex: 1, category: 'literature', difficulty: 'easy' },
  { q: 'Who wrote "Hamlet"?', options: ['Christopher Marlowe', 'Ben Jonson', 'William Shakespeare', 'John Webster'], correctIndex: 2, category: 'literature', difficulty: 'easy' },
  { q: '"100 Years of Solitude" was written by?', options: ['Jorge Luis Borges', 'Gabriel García Márquez', 'Mario Vargas Llosa', 'Carlos Fuentes'], correctIndex: 1, category: 'literature' },
  { q: 'The poet Maya Angelou is best known for?', options: ['I Know Why the Caged Bird Sings', 'Beloved', 'The Bluest Eye', 'Sula'], correctIndex: 0, category: 'literature' },
  { q: 'Which is a play by Tennessee Williams?', options: ['Death of a Salesman', 'Long Day\'s Journey Into Night', 'A Streetcar Named Desire', 'The Glass Menagerie & Streetcar both'], correctIndex: 3, category: 'literature', difficulty: 'medium' },
  { q: 'Who wrote "Fahrenheit 451"?', options: ['Aldous Huxley', 'Ray Bradbury', 'George Orwell', 'Kurt Vonnegut'], correctIndex: 1, category: 'literature' },
  { q: '"The Hobbit" precedes which trilogy?', options: ['Narnia', 'Lord of the Rings', 'Dragonlance', 'Earthsea'], correctIndex: 1, category: 'literature', difficulty: 'easy' },

  // -------------------- SPORTS --------------------
  { q: 'How many players are on a basketball court per team?', options: ['4', '5', '6', '7'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Who has the most NBA championships as a player?', options: ['Michael Jordan', 'Bill Russell', 'LeBron James', 'Kobe Bryant'], correctIndex: 1, category: 'sports' },
  { q: 'The World Cup is held every how many years?', options: ['2', '3', '4', '5'], correctIndex: 2, category: 'sports', difficulty: 'easy' },
  { q: 'Which country has won the most Men\'s World Cups?', options: ['Germany', 'Italy', 'Argentina', 'Brazil'], correctIndex: 3, category: 'sports' },
  { q: 'Tom Brady has how many Super Bowl rings?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'sports' },
  { q: 'Which tennis player has the most Grand Slam titles (men)?', options: ['Federer', 'Nadal', 'Djokovic', 'Sampras'], correctIndex: 2, category: 'sports' },
  { q: 'How long is an NBA game?', options: ['40 min', '48 min', '60 min', '90 min'], correctIndex: 1, category: 'sports' },
  { q: 'Who won the 2023 NBA MVP?', options: ['Joel Embiid', 'Nikola Jokić', 'Giannis Antetokounmpo', 'Jayson Tatum'], correctIndex: 0, category: 'sports' },
  { q: 'In golf, what is "par"?', options: ['Average strokes', 'Expected number of strokes per hole', 'A water hazard', 'A type of club'], correctIndex: 1, category: 'sports' },
  { q: 'Lionel Messi plays for which national team?', options: ['Brazil', 'Argentina', 'Portugal', 'Uruguay'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'How many points is a regular basketball shot worth?', options: ['1', '2', '3', '4'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Serena Williams\'s sister is also a pro tennis player. Name?', options: ['Vivian', 'Venus', 'Vanessa', 'Valerie'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Which sport uses the word "ace"?', options: ['Tennis', 'Volleyball', 'Both', 'Neither'], correctIndex: 2, category: 'sports' },
  { q: 'How many rings are on the Olympic flag?', options: ['4', '5', '6', '7'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Who is the all-time leading NBA scorer (as of 2024)?', options: ['LeBron James', 'Kareem Abdul-Jabbar', 'Karl Malone', 'Kobe Bryant'], correctIndex: 0, category: 'sports' },
  { q: 'Boxing weight class. Who is in the "heavyweight" division?', options: ['Below 175 lb', '175-200 lb', 'Above 200 lb', 'Any weight'], correctIndex: 2, category: 'sports' },
  { q: 'Which is NOT an Olympic sport (as of 2024)?', options: ['Skateboarding', 'Surfing', 'Cricket', 'Climbing'], correctIndex: 2, category: 'sports' },
  { q: 'A "no-hitter" is a record in which sport?', options: ['Soccer', 'Football', 'Baseball', 'Hockey'], correctIndex: 2, category: 'sports' },
  { q: 'Which country won the 2024 Cricket T20 World Cup?', options: ['India', 'Australia', 'England', 'Pakistan'], correctIndex: 0, category: 'sports', difficulty: 'medium' },
  { q: 'How many players on a soccer team on the field?', options: ['9', '10', '11', '12'], correctIndex: 2, category: 'sports', difficulty: 'easy' },
  { q: 'Which NBA team is from Boston?', options: ['Bulls', 'Celtics', 'Heat', 'Knicks'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Caitlin Clark plays in which league?', options: ['NBA', 'WNBA', 'NCAA', 'EuroLeague'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'The Tour de France is what type of race?', options: ['Running', 'Cycling', 'Driving', 'Sailing'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'How many holes are on a standard golf course?', options: ['9', '12', '18', '24'], correctIndex: 2, category: 'sports', difficulty: 'easy' },
  { q: 'A "hat trick" is?', options: ['3 goals/scores in one game', 'A type of celebration', 'A foul', 'A wagon move'], correctIndex: 0, category: 'sports' },
  { q: 'Which is the smallest ball used in pro sport?', options: ['Golf', 'Squash', 'Table tennis', 'Marbles'], correctIndex: 2, category: 'sports' },
  { q: 'Michael Phelps won the most Olympic golds in?', options: ['Track', 'Swimming', 'Gymnastics', 'Cycling'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Who is the GOAT of women\'s gymnastics (most golds)?', options: ['Nadia Comaneci', 'Simone Biles', 'Mary Lou Retton', 'Shannon Miller'], correctIndex: 1, category: 'sports' },
  { q: 'In American football, how many points is a touchdown?', options: ['3', '6', '7', '8'], correctIndex: 1, category: 'sports', difficulty: 'easy' },
  { q: 'Which boxer was nicknamed "The Greatest"?', options: ['Mike Tyson', 'Muhammad Ali', 'Sugar Ray Leonard', 'Floyd Mayweather'], correctIndex: 1, category: 'sports', difficulty: 'easy' },

  // -------------------- FOOD --------------------
  { q: 'Which country is sushi from?', options: ['China', 'Japan', 'Korea', 'Vietnam'], correctIndex: 1, category: 'food', difficulty: 'easy' },
  { q: 'Espresso originated in which country?', options: ['France', 'Italy', 'Spain', 'Portugal'], correctIndex: 1, category: 'food' },
  { q: 'What\'s the main ingredient in guacamole?', options: ['Avocado', 'Lime', 'Onion', 'Tomato'], correctIndex: 0, category: 'food', difficulty: 'easy' },
  { q: 'Which cheese is traditionally used in tiramisu?', options: ['Ricotta', 'Mozzarella', 'Mascarpone', 'Cream cheese'], correctIndex: 2, category: 'food' },
  { q: 'Tom yum is from which cuisine?', options: ['Thai', 'Vietnamese', 'Korean', 'Cambodian'], correctIndex: 0, category: 'food', difficulty: 'easy' },
  { q: 'A "julienne" cut is shaped like?', options: ['Cubes', 'Thin matchsticks', 'Rounds', 'Diamonds'], correctIndex: 1, category: 'food' },
  { q: 'Pho is a noodle soup from which country?', options: ['Vietnam', 'Thailand', 'Cambodia', 'Laos'], correctIndex: 0, category: 'food', difficulty: 'easy' },
  { q: 'What is the main grain in risotto?', options: ['Long-grain rice', 'Arborio rice', 'Jasmine rice', 'Brown rice'], correctIndex: 1, category: 'food' },
  { q: 'Sourdough bread is leavened by?', options: ['Yeast', 'Baking soda', 'Wild yeast / sourdough starter', 'Baking powder'], correctIndex: 2, category: 'food' },
  { q: 'A "mise en place" means?', options: ['Plate', 'Ingredients prepped and arranged', 'A type of sauce', 'A French stew'], correctIndex: 1, category: 'food' },
  { q: 'Wagyu beef is from which country?', options: ['Argentina', 'Japan', 'Australia', 'USA'], correctIndex: 1, category: 'food', difficulty: 'easy' },
  { q: 'Which fruit is the official fruit of Florida?', options: ['Strawberry', 'Orange', 'Peach', 'Grapefruit'], correctIndex: 1, category: 'food' },
  { q: 'A "stout" is a type of?', options: ['Wine', 'Beer', 'Cider', 'Spirit'], correctIndex: 1, category: 'food', difficulty: 'easy' },
  { q: 'Kimchi is the national side dish of?', options: ['China', 'Japan', 'Korea', 'Mongolia'], correctIndex: 2, category: 'food', difficulty: 'easy' },
  { q: 'Which spice gives curry its yellow color?', options: ['Paprika', 'Saffron', 'Turmeric', 'Cumin'], correctIndex: 2, category: 'food' },
  { q: 'A "magnum" is what size of wine bottle?', options: ['Standard 750ml', '1.5L', '3L', '6L'], correctIndex: 1, category: 'food' },
  { q: 'Which is the highest Michelin star rating?', options: ['1 star', '2 stars', '3 stars', '4 stars'], correctIndex: 2, category: 'food', difficulty: 'easy' },
  { q: 'Hummus\'s main ingredient is?', options: ['Lentils', 'Chickpeas', 'Beans', 'Edamame'], correctIndex: 1, category: 'food', difficulty: 'easy' },
  { q: 'A martini\'s "dirty" variation adds what?', options: ['Olives & olive brine', 'Bitters', 'Salt rim', 'Espresso'], correctIndex: 0, category: 'food' },
  { q: 'Pad Thai is from which country?', options: ['Vietnam', 'Thailand', 'Korea', 'Indonesia'], correctIndex: 1, category: 'food', difficulty: 'easy' },
  { q: 'Hot sauce most associated with Louisiana?', options: ['Frank\'s', 'Cholula', 'Tabasco', 'Sriracha'], correctIndex: 2, category: 'food' },
  { q: 'Which is Italy\'s most famous coffee?', options: ['Latte', 'Espresso', 'Macchiato', 'Cappuccino'], correctIndex: 1, category: 'food' },
  { q: 'A "rib eye" is cut from which part of the cow?', options: ['Loin', 'Rib', 'Round', 'Shoulder'], correctIndex: 1, category: 'food' },
  { q: 'Which fruit has its seeds on the outside?', options: ['Raspberry', 'Strawberry', 'Pomegranate', 'Cherry'], correctIndex: 1, category: 'food', difficulty: 'easy' },
  { q: 'Tapas are a tradition from?', options: ['Italy', 'Spain', 'Greece', 'France'], correctIndex: 1, category: 'food', difficulty: 'easy' },

  // -------------------- TECH --------------------
  { q: 'Who founded Apple alongside Steve Jobs?', options: ['Steve Ballmer', 'Steve Wozniak', 'Bill Gates', 'Paul Allen'], correctIndex: 1, category: 'tech', difficulty: 'easy' },
  { q: 'What does CPU stand for?', options: ['Computer Processing Unit', 'Central Processing Unit', 'Core Processing Unit', 'Central Program Unit'], correctIndex: 1, category: 'tech' },
  { q: 'Which company makes the Pixel phone?', options: ['Samsung', 'Apple', 'Google', 'Sony'], correctIndex: 2, category: 'tech', difficulty: 'easy' },
  { q: 'What\'s the latest macOS version code-named after a California place?', options: ['Yes. All are', 'No', 'Only some', 'Only old ones'], correctIndex: 0, category: 'tech' },
  { q: 'TikTok\'s parent company is?', options: ['Tencent', 'Alibaba', 'ByteDance', 'Baidu'], correctIndex: 2, category: 'tech' },
  { q: 'Which language is most used for iOS development today?', options: ['Objective-C', 'Swift', 'Java', 'Kotlin'], correctIndex: 1, category: 'tech', difficulty: 'easy' },
  { q: 'Which crypto came first?', options: ['Ethereum', 'Bitcoin', 'Litecoin', 'Dogecoin'], correctIndex: 1, category: 'tech', difficulty: 'easy' },
  { q: 'ChatGPT is made by?', options: ['Google', 'OpenAI', 'Anthropic', 'Microsoft'], correctIndex: 1, category: 'tech', difficulty: 'easy' },
  { q: 'Which is NOT a JavaScript framework?', options: ['React', 'Vue', 'Angular', 'Flask'], correctIndex: 3, category: 'tech' },
  { q: 'Wi-Fi 6 is also called?', options: ['802.11ax', '802.11n', '802.11ac', '802.11g'], correctIndex: 0, category: 'tech' },
  { q: 'How many bits in a byte?', options: ['4', '8', '16', '32'], correctIndex: 1, category: 'tech', difficulty: 'easy' },
  { q: 'GitHub was acquired by?', options: ['Google', 'Apple', 'Microsoft', 'IBM'], correctIndex: 2, category: 'tech' },
  { q: 'Tesla\'s CEO (as of 2024) is?', options: ['Elon Musk', 'JB Straubel', 'Adam Jonas', 'Steve Westly'], correctIndex: 0, category: 'tech', difficulty: 'easy' },
  { q: 'Which company makes NVIDIA\'s rival graphics cards?', options: ['Intel', 'AMD', 'Qualcomm', 'Mediatek'], correctIndex: 1, category: 'tech' },
  { q: 'What does HTML stand for?', options: ['Hyperlink Text Markup Language', 'Hypertext Markup Language', 'Hyper Tool Multilanguage', 'Home Text Markup Language'], correctIndex: 1, category: 'tech' },
  { q: 'Spotify was founded in?', options: ['UK', 'Sweden', 'USA', 'Finland'], correctIndex: 1, category: 'tech' },
  { q: 'Which company makes the M-series chips?', options: ['Apple', 'Intel', 'Samsung', 'Qualcomm'], correctIndex: 0, category: 'tech', difficulty: 'easy' },
  { q: 'The first iPhone launched in?', options: ['2005', '2007', '2009', '2010'], correctIndex: 1, category: 'tech' },
  { q: 'Which app is owned by Meta?', options: ['Instagram', 'WhatsApp', 'Threads', 'All of these'], correctIndex: 3, category: 'tech', difficulty: 'easy' },
  { q: 'What does SaaS stand for?', options: ['Software as a Service', 'Solution as a Site', 'Server and Software', 'System and Storage'], correctIndex: 0, category: 'tech' },
  { q: 'Which is a popular code editor?', options: ['VS Code', 'Notepad++', 'Sublime', 'All of these'], correctIndex: 3, category: 'tech', difficulty: 'easy' },
  { q: 'AWS is owned by?', options: ['Microsoft', 'Amazon', 'Google', 'Oracle'], correctIndex: 1, category: 'tech', difficulty: 'easy' },
  { q: 'Which language is Linux mostly written in?', options: ['Python', 'C', 'Rust', 'Go'], correctIndex: 1, category: 'tech' },
  { q: 'The "@" symbol in email was popularized by?', options: ['Ray Tomlinson', 'Vint Cerf', 'Tim Berners-Lee', 'Robert Metcalfe'], correctIndex: 0, category: 'tech', difficulty: 'hard' },
  { q: 'Which device has its own dedicated chip called "Neural Engine"?', options: ['MacBook Air', 'iPhone', 'Both Apple devices have one', 'Vision Pro only'], correctIndex: 2, category: 'tech' },

  // -------------------- POP CULTURE --------------------
  { q: 'Which singer married actor Joe Alwyn (and broke up in 2023)?', options: ['Taylor Swift', 'Lana Del Rey', 'Florence Welch', 'Phoebe Bridgers'], correctIndex: 0, category: 'pop_culture' },
  { q: 'The Met Gala is held annually in?', options: ['Paris', 'NYC', 'London', 'Milan'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Beyoncé\'s twins are named?', options: ['Rumi & Sir', 'Blue & Rumi', 'Sir & Blue', 'Carter & Blue'], correctIndex: 0, category: 'pop_culture' },
  { q: 'Who is known as "The Rock"?', options: ['Vin Diesel', 'Dwayne Johnson', 'John Cena', 'Jason Statham'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Pokémon GO launched in?', options: ['2014', '2015', '2016', '2017'], correctIndex: 2, category: 'pop_culture' },
  { q: 'Which TikTok dance was based on a Doja Cat song?', options: ['Renegade', 'Say So', 'WAP', 'Savage'], correctIndex: 1, category: 'pop_culture' },
  { q: 'Who hosts "The Tonight Show"?', options: ['Jimmy Fallon', 'Stephen Colbert', 'Seth Meyers', 'James Corden'], correctIndex: 0, category: 'pop_culture' },
  { q: 'The Kardashian show is filmed in?', options: ['Beverly Hills', 'Calabasas', 'Hidden Hills', 'Various'], correctIndex: 3, category: 'pop_culture', difficulty: 'medium' },
  { q: 'Coachella is held in which state?', options: ['California', 'Texas', 'Florida', 'Nevada'], correctIndex: 0, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Which celebrity launched Skims?', options: ['Kylie Jenner', 'Kim Kardashian', 'Khloe Kardashian', 'Kourtney Kardashian'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Who plays Yelena in Marvel\'s Phase 4?', options: ['Florence Pugh', 'Hailee Steinfeld', 'Elizabeth Olsen', 'Tessa Thompson'], correctIndex: 0, category: 'pop_culture' },
  { q: 'Which boy band did Harry Styles come from?', options: ['NSync', 'One Direction', 'Backstreet Boys', 'Big Time Rush'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Beyoncé and Jay-Z\'s daughter\'s name?', options: ['Blue Ivy', 'Sapphire', 'Sir', 'Rumi'], correctIndex: 0, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Anime "Demon Slayer" is set in which historical Japanese era?', options: ['Edo', 'Taisho', 'Meiji', 'Heian'], correctIndex: 1, category: 'pop_culture' },
  { q: '"Sephora kids" trend mostly involved which brand?', options: ['Drunk Elephant', 'Glossier', 'The Ordinary', 'CeraVe'], correctIndex: 0, category: 'pop_culture' },
  { q: 'Beyoncé\'s "Renaissance Tour" started in?', options: ['Houston', 'LA', 'Stockholm', 'Toronto'], correctIndex: 2, category: 'pop_culture' },
  { q: 'Which TV show featured "The Iron Throne"?', options: ['House of Cards', 'Game of Thrones', 'Westworld', 'Vikings'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Who founded Fenty Beauty?', options: ['Rihanna', 'Beyoncé', 'Tracee Ellis Ross', 'Selena Gomez'], correctIndex: 0, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Which musician played the half-time show in 2024 Super Bowl?', options: ['Usher', 'Rihanna', 'The Weeknd', 'Beyoncé'], correctIndex: 0, category: 'pop_culture' },
  { q: 'Which app launched the Reels feature first?', options: ['Instagram', 'TikTok', 'Snapchat', 'YouTube'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Which talk show is hosted by Kelly Clarkson?', options: ['The View', 'The Kelly Clarkson Show', 'Today', 'GMA'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: '"Sex and the City" is set in?', options: ['Paris', 'London', 'NYC', 'LA'], correctIndex: 2, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Which celebrity is married to Megan Fox?', options: ['Pete Davidson', 'Machine Gun Kelly', 'Travis Barker', 'They never married'], correctIndex: 3, category: 'pop_culture', difficulty: 'medium' },
  { q: 'Which reality show franchise is "Selling Sunset"?', options: ['HGTV', 'Bravo', 'Netflix', 'Discovery+'], correctIndex: 2, category: 'pop_culture' },
  { q: 'Who is the lead in "Wednesday" (Netflix)?', options: ['Millie Bobby Brown', 'Jenna Ortega', 'Maddie Ziegler', 'Sadie Sink'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: '"Squid Game" was created by?', options: ['Park Chan-wook', 'Bong Joon-ho', 'Hwang Dong-hyuk', 'Lee Chang-dong'], correctIndex: 2, category: 'pop_culture' },
  { q: 'The "Barbie" movie was directed by?', options: ['Sofia Coppola', 'Greta Gerwig', 'Olivia Wilde', 'Lulu Wang'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'Which fashion designer is behind "The Row"?', options: ['Mary-Kate & Ashley Olsen', 'Stella McCartney', 'Phoebe Philo', 'Maria Grazia Chiuri'], correctIndex: 0, category: 'pop_culture' },
  { q: 'In Marvel, who is Loki\'s adoptive father?', options: ['Thor', 'Odin', 'Heimdall', 'Tyr'], correctIndex: 1, category: 'pop_culture', difficulty: 'easy' },
  { q: 'What does NFT stand for?', options: ['New Financial Token', 'Non-Fungible Token', 'Network File Transfer', 'Notarized File Token'], correctIndex: 1, category: 'pop_culture' },

  // -------------------- HISTORY --------------------
  { q: 'In what year did WWII end?', options: ['1943', '1944', '1945', '1946'], correctIndex: 2, category: 'history', difficulty: 'easy' },
  { q: 'Who was the first US President?', options: ['John Adams', 'Thomas Jefferson', 'George Washington', 'Benjamin Franklin'], correctIndex: 2, category: 'history', difficulty: 'easy' },
  { q: 'The Berlin Wall fell in?', options: ['1987', '1989', '1991', '1993'], correctIndex: 1, category: 'history' },
  { q: 'Who was the first woman to win a Nobel Prize?', options: ['Marie Curie', 'Mother Teresa', 'Pearl Buck', 'Selma Lagerlöf'], correctIndex: 0, category: 'history' },
  { q: 'Which civilization built Machu Picchu?', options: ['Maya', 'Aztec', 'Inca', 'Olmec'], correctIndex: 2, category: 'history', difficulty: 'easy' },
  { q: 'The Roman Empire officially fell in?', options: ['476 AD (West)', '1066', '300 BC', '1492'], correctIndex: 0, category: 'history' },
  { q: 'Who delivered the "I Have a Dream" speech?', options: ['Malcolm X', 'Martin Luther King Jr.', 'John Lewis', 'Frederick Douglass'], correctIndex: 1, category: 'history', difficulty: 'easy' },
  { q: 'The Magna Carta was signed in?', options: ['1066', '1215', '1492', '1689'], correctIndex: 1, category: 'history' },
  { q: 'Cleopatra was ruler of?', options: ['Greece', 'Egypt', 'Rome', 'Persia'], correctIndex: 1, category: 'history', difficulty: 'easy' },
  { q: 'Who painted on the moon? Trick. Who was the first person on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'John Glenn', 'Michael Collins'], correctIndex: 1, category: 'history', difficulty: 'easy' },
  { q: 'Apartheid ended in which country?', options: ['Zimbabwe', 'South Africa', 'Namibia', 'Botswana'], correctIndex: 1, category: 'history', difficulty: 'easy' },
  { q: 'WWII began in?', options: ['1937', '1939', '1941', '1942'], correctIndex: 1, category: 'history' },
  { q: 'Who wrote "The Communist Manifesto"?', options: ['Marx & Engels', 'Lenin', 'Stalin', 'Mao'], correctIndex: 0, category: 'history' },
  { q: 'The Renaissance started in?', options: ['France', 'Italy', 'England', 'Germany'], correctIndex: 1, category: 'history' },
  { q: 'Who was Queen of England the longest?', options: ['Victoria', 'Elizabeth I', 'Elizabeth II', 'Mary I'], correctIndex: 2, category: 'history' },
  { q: 'The first U.S. atomic bomb was dropped on?', options: ['Tokyo', 'Hiroshima', 'Nagasaki', 'Osaka'], correctIndex: 1, category: 'history' },
  { q: 'Nelson Mandela was imprisoned for how many years?', options: ['10', '15', '20', '27'], correctIndex: 3, category: 'history' },
  { q: 'Christopher Columbus reached the Americas in?', options: ['1480', '1492', '1500', '1521'], correctIndex: 1, category: 'history', difficulty: 'easy' },
  { q: 'Who invented the printing press (movable type, west)?', options: ['Gutenberg', 'Caxton', 'Aldine', 'Plantin'], correctIndex: 0, category: 'history' },
  { q: 'World War I ended on?', options: ['Nov 11, 1918', 'Dec 31, 1918', 'Jan 1, 1919', 'Jul 28, 1918'], correctIndex: 0, category: 'history' },
  { q: 'Who was the longest-serving British PM?', options: ['Churchill', 'Pitt the Younger', 'Walpole', 'Gladstone'], correctIndex: 2, category: 'history', difficulty: 'hard' },
  { q: 'The Civil Rights Act was signed in?', options: ['1954', '1964', '1968', '1972'], correctIndex: 1, category: 'history' },
  { q: 'Genghis Khan founded which empire?', options: ['Persian', 'Ottoman', 'Mongol', 'Mughal'], correctIndex: 2, category: 'history', difficulty: 'easy' },
  { q: 'Who painted the Sistine Chapel ceiling, not Da Vinci, but?', options: ['Raphael', 'Michelangelo', 'Botticelli', 'Caravaggio'], correctIndex: 1, category: 'history' },
  { q: 'The Stonewall riots were in which year?', options: ['1965', '1969', '1972', '1976'], correctIndex: 1, category: 'history' },

  // -------------------- SCIENCE --------------------
  { q: 'How many planets are in our solar system (official)?', options: ['7', '8', '9', '10'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'What\'s the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correctIndex: 2, category: 'science', difficulty: 'easy' },
  { q: 'What gas do plants absorb from the air?', options: ['Oxygen', 'CO2', 'Nitrogen', 'Hydrogen'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'How many bones are in the adult human body?', options: ['186', '206', '226', '300'], correctIndex: 1, category: 'science' },
  { q: 'Speed of light is approximately?', options: ['300,000 km/h', '300,000 m/s', '300,000 km/s', '3,000 km/s'], correctIndex: 2, category: 'science' },
  { q: 'Which is the largest planet?', options: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'DNA stands for?', options: ['Direct Nucleic Acid', 'Deoxyribonucleic Acid', 'Dynamic Network Acid', 'Diphenyl Nucleic Acid'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'Who developed the theory of general relativity?', options: ['Newton', 'Einstein', 'Hawking', 'Bohr'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'Water\'s chemical formula is?', options: ['HO', 'H2O', 'OH2', 'H3O'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'Which is the smallest unit of life?', options: ['Atom', 'Molecule', 'Cell', 'Tissue'], correctIndex: 2, category: 'science', difficulty: 'easy' },
  { q: 'Mercury is the closest planet to?', options: ['Earth', 'The Sun', 'Mars', 'Venus'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'A human heart has how many chambers?', options: ['2', '3', '4', '6'], correctIndex: 2, category: 'science', difficulty: 'easy' },
  { q: 'Which element has atomic number 1?', options: ['Helium', 'Hydrogen', 'Lithium', 'Oxygen'], correctIndex: 1, category: 'science' },
  { q: 'Which is NOT one of Earth\'s spheres?', options: ['Atmosphere', 'Lithosphere', 'Hydrosphere', 'Ionosphere'], correctIndex: 3, category: 'science', difficulty: 'medium' },
  { q: 'Pi is approximately?', options: ['3.14', '2.72', '1.62', '6.28'], correctIndex: 0, category: 'science' },
  { q: 'Photosynthesis converts CO2 + water into?', options: ['Sugar + oxygen', 'Salt + oxygen', 'Carbon + nitrogen', 'Ammonia'], correctIndex: 0, category: 'science' },
  { q: 'Which is the largest organ in the human body?', options: ['Liver', 'Lungs', 'Brain', 'Skin'], correctIndex: 3, category: 'science', difficulty: 'easy' },
  { q: 'Which planet has rings?', options: ['Mars', 'Jupiter', 'Saturn', 'All gas giants do'], correctIndex: 3, category: 'science', difficulty: 'medium' },
  { q: 'What does pH below 7 indicate?', options: ['Acid', 'Base', 'Neutral', 'Salt'], correctIndex: 0, category: 'science' },
  { q: 'Which is the fastest land animal?', options: ['Lion', 'Cheetah', 'Pronghorn', 'Horse'], correctIndex: 1, category: 'science', difficulty: 'easy' },
  { q: 'Which scientist is famous for the law of gravitation?', options: ['Galileo', 'Einstein', 'Newton', 'Pascal'], correctIndex: 2, category: 'science', difficulty: 'easy' },
  { q: 'What\'s the most abundant gas in Earth\'s atmosphere?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'], correctIndex: 2, category: 'science' },
  { q: 'How many chromosomes does a typical human have?', options: ['23', '32', '46', '48'], correctIndex: 2, category: 'science' },
  { q: 'Which is NOT a type of star?', options: ['Red giant', 'White dwarf', 'Black hole', 'Brown dwarf'], correctIndex: 2, category: 'science', difficulty: 'medium' },
  { q: 'The mitochondria is the … of the cell.', options: ['Brain', 'Powerhouse', 'Membrane', 'Skeleton'], correctIndex: 1, category: 'science', difficulty: 'easy' },

  // -------------------- GEOGRAPHY --------------------
  { q: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correctIndex: 2, category: 'geography' },
  { q: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctIndex: 1, category: 'geography' },
  { q: 'Mount Everest is in?', options: ['China', 'India', 'Nepal/Tibet border', 'Bhutan'], correctIndex: 2, category: 'geography' },
  { q: 'Which is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'Which African country has the largest population?', options: ['Egypt', 'Nigeria', 'Ethiopia', 'Kenya'], correctIndex: 1, category: 'geography' },
  { q: 'Iceland\'s capital?', options: ['Oslo', 'Reykjavik', 'Stockholm', 'Helsinki'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'The Sahara is what type of biome?', options: ['Tundra', 'Forest', 'Desert', 'Savanna'], correctIndex: 2, category: 'geography', difficulty: 'easy' },
  { q: 'Which country has the most time zones?', options: ['USA', 'Russia', 'China', 'France (with overseas)'], correctIndex: 3, category: 'geography', difficulty: 'hard' },
  { q: 'The Great Barrier Reef is off the coast of?', options: ['New Zealand', 'Australia', 'Indonesia', 'Fiji'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correctIndex: 2, category: 'geography', difficulty: 'easy' },
  { q: 'Tokyo is in which country?', options: ['Korea', 'Japan', 'China', 'Vietnam'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'The Andes mountain range is in?', options: ['Africa', 'South America', 'North America', 'Asia'], correctIndex: 1, category: 'geography' },
  { q: 'Which country has both Asia and Europe in it?', options: ['Russia', 'Turkey', 'Both', 'Kazakhstan'], correctIndex: 2, category: 'geography', difficulty: 'medium' },
  { q: 'Which is NOT one of the Great Lakes?', options: ['Huron', 'Erie', 'Ontario', 'Champlain'], correctIndex: 3, category: 'geography' },
  { q: 'Cape Town is in?', options: ['Egypt', 'South Africa', 'Morocco', 'Kenya'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'What language is spoken in Brazil?', options: ['Spanish', 'Portuguese', 'English', 'French'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'How many U.S. states are there?', options: ['48', '49', '50', '51'], correctIndex: 2, category: 'geography', difficulty: 'easy' },
  { q: 'Which country has Mount Fuji?', options: ['Japan', 'South Korea', 'Taiwan', 'China'], correctIndex: 0, category: 'geography', difficulty: 'easy' },
  { q: 'The Eiffel Tower is in?', options: ['Rome', 'Paris', 'Berlin', 'Vienna'], correctIndex: 1, category: 'geography', difficulty: 'easy' },
  { q: 'The "Big Apple" is a nickname for?', options: ['LA', 'NYC', 'Chicago', 'DC'], correctIndex: 1, category: 'geography', difficulty: 'easy' },

  // -------------------- GENERAL --------------------
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'general', difficulty: 'easy' },
  { q: 'The currency of Japan is the?', options: ['Yen', 'Won', 'Yuan', 'Dong'], correctIndex: 0, category: 'general' },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctIndex: 1, category: 'general', difficulty: 'easy' },
  { q: 'A "century" is how many years?', options: ['10', '50', '100', '1000'], correctIndex: 2, category: 'general', difficulty: 'easy' },
  { q: 'What\'s the largest mammal?', options: ['Elephant', 'Blue whale', 'Giraffe', 'Hippo'], correctIndex: 1, category: 'general', difficulty: 'easy' },
  { q: 'How many minutes in a day?', options: ['1200', '1440', '1480', '1620'], correctIndex: 1, category: 'general' },
  { q: 'Which is NOT a primary color (paint)?', options: ['Red', 'Yellow', 'Blue', 'Green'], correctIndex: 3, category: 'general' },
  { q: 'A "lunar" eclipse is when?', options: ['Sun blocks moon', 'Earth blocks moon', 'Moon blocks sun', 'Earth blocks sun'], correctIndex: 1, category: 'general' },
  { q: 'Which is the longest day of the year (Northern Hemisphere)?', options: ['March', 'June solstice', 'September', 'December'], correctIndex: 1, category: 'general' },
  { q: 'How many time zones in continental USA?', options: ['3', '4', '5', '6'], correctIndex: 1, category: 'general' },
  { q: 'How many degrees in a triangle?', options: ['90', '180', '270', '360'], correctIndex: 1, category: 'general', difficulty: 'easy' },
  { q: 'A "fortnight" is how many days?', options: ['7', '10', '14', '21'], correctIndex: 2, category: 'general' },
  { q: 'How many spaces in a chess board?', options: ['32', '48', '64', '72'], correctIndex: 2, category: 'general' },
  { q: 'What\'s the boiling point of water (sea level)?', options: ['90°C', '100°C', '110°C', '120°C'], correctIndex: 1, category: 'general', difficulty: 'easy' },
  { q: 'How many syllables in a haiku\'s middle line?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'general' },
  { q: 'Which is the most spoken language?', options: ['English', 'Spanish', 'Mandarin', 'Hindi'], correctIndex: 2, category: 'general' },
  { q: 'How many wonders of the ancient world?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'general', difficulty: 'easy' },
  { q: 'A "decade" is how many years?', options: ['5', '10', '20', '100'], correctIndex: 1, category: 'general', difficulty: 'easy' },
  { q: 'How many cards in a standard deck?', options: ['48', '52', '54', '60'], correctIndex: 1, category: 'general', difficulty: 'easy' },
  { q: 'Which planet is known as the "Red Planet"?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correctIndex: 1, category: 'general', difficulty: 'easy' },
];

/**
 * Pick N random unique trivia questions, optionally balanced across
 * categories and avoiding any in `exclude`. We shuffle within each
 * category first, then round-robin to ensure the user sees variety.
 */
export function pickRandomTrivia(n: number, exclude: TriviaQuestion[] = []): TriviaQuestion[] {
  const excludeKeys = new Set(exclude.map((q) => q.q));
  const pool = TRIVIA_QUESTIONS.filter((q) => !excludeKeys.has(q.q));
  // Group by category
  const byCategory: Record<string, TriviaQuestion[]> = {};
  for (const q of pool) {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
  }
  // Shuffle each category
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat] = byCategory[cat].sort(() => Math.random() - 0.5);
  }
  // Round-robin pull
  const categoryOrder = Object.keys(byCategory).sort(() => Math.random() - 0.5);
  const out: TriviaQuestion[] = [];
  while (out.length < n) {
    let added = false;
    for (const cat of categoryOrder) {
      if (out.length >= n) break;
      const q = byCategory[cat].pop();
      if (q) {
        out.push(q);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
