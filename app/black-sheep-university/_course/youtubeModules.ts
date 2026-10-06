import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'equipment',
    title: 'Module 1: Equipment & Setup',
    lessons: [
      {
        id: 'cameras-mics',
        title: 'Cameras, Mics & Lighting That Actually Matter',
        minutes: 14,
        body: [
          'Every new creator makes the same mistake: they buy a camera first. Flip that order. Audio is the single biggest quality signal on YouTube. Viewers forgive soft, slightly grainy video. They almost never forgive audio that crackles, echoes, or is too quiet to hear comfortably. If you only buy one piece of gear this month, buy a microphone.',
          'Upgrade priority, in order: microphone first, lighting second, camera third. A $70 to $150 microphone and a $100 LED light panel will visibly improve your videos more than a $2,000 camera body ever will on its own.',
          'Microphones: if you are recording solo talking-head content at a desk, a USB condenser mic in the $70 to $150 range is plenty. If you move around the room or film outside your home, a wireless lavalier or clip-on system that records in 32-bit float is worth the extra cost, because it makes it nearly impossible to ruin a take by being too loud or too quiet. If you ever bring on guests, make sure you have a second mic so both voices are captured cleanly.',
          'Lighting: you do not need a professional studio. One key light placed slightly above and to the side of your face, angled in, removes almost every lighting complaint a beginner channel gets in the comments. A second, dimmer fill light on the opposite side softens harsh shadows. Budget LED panel kits in the $80 to $150 range cover this completely. If you are filming near a window, natural daylight facing your face (never behind you) is free and often looks better than artificial light.',
          'Cameras: your phone is good enough to start. Every phone released in the last several years can shoot clean 4K video that looks completely professional once it is well lit and well framed. When you are ready to upgrade, look for a camera with a flip-out screen (so you can see yourself while filming solo), a microphone input jack, and reliable autofocus for tracking your face as you move. Mirrorless cameras in the $700 to $1,200 range are the sweet spot most full-time creators settle on, offering 4K at a high frame rate for smooth slow motion plus long battery life for travel and vlogging days.',
          'A realistic starter budget: $70 to $150 for a USB mic, $100 to $150 for a two-light LED kit, and your existing phone for the camera. That is a complete, professional-sounding, professional-looking setup for under $300, and it is exactly what most successful channels started with before ever touching a dedicated camera body.',
        ],
      },
      {
        id: 'software',
        title: 'Recording & Editing Software Stack',
        minutes: 11,
        body: [
          'Editing software matters far less than most beginners think. The channels that grow fastest are the ones that publish consistently, and consistency is easier with software you actually enjoy using, not whatever is considered the most "professional."',
          'Free, no watermark, and genuinely powerful: DaVinci Resolve. It includes a full editing timeline, color correction, audio cleanup, and motion graphics tools in one free application, and there is effectively no ceiling on what you can do with it as your editing skills grow. This is the strongest starting point for long-form YouTube videos if you are comfortable with a short learning curve.',
          'Fast and simple for short-form: CapCut is purpose-built for vertical, short, punchy edits and is the easiest way to produce YouTube Shorts quickly. Many creators run two editors at once: DaVinci Resolve for the main long-form video, CapCut for cutting Shorts out of that same footage.',
          'If you prefer a paid, guided experience: Adobe Premiere Pro and Filmora both offer subscription options with more built-in templates, captions, and effects, which can save time if you are editing daily and want less of a learning curve in exchange for a monthly fee.',
          'Export settings that matter for YouTube: export at the highest resolution you filmed in (1080p minimum, 4K if your camera supports it), use the H.264 codec, and keep your frame rate consistent with what you filmed (do not convert 30fps footage to 60fps or vice versa, it introduces stutter). YouTube re-compresses everything you upload, so starting from a high-bitrate export gives the platform more quality to work with before its own compression kicks in.',
          'Final tip: build a simple project template once (your intro, your lower-third name tag, your outro, your standard color correction) and reuse it every single video. This is what separates creators who publish weekly from creators who start from a blank timeline every time and burn out within a month.',
        ],
      },
    ],
  },
  {
    id: 'content-strategy',
    title: 'Module 2: Content Strategy & Production',
    lessons: [
      {
        id: 'niche',
        title: 'Finding and Owning Your Niche',
        minutes: 12,
        body: [
          'A niche is not a limitation, it is how YouTube learns who to show your content to. The algorithm clusters viewers around topics, and the tighter your channel\'s topic focus, the faster YouTube can confidently recommend you to the right people. A channel about "everything" takes much longer to find its audience than a channel clearly about one specific thing.',
          'Start by answering three questions honestly. What do you already know more about than most people around you? What could you talk about for an hour without notes? And who is an audience that is currently underserved or poorly served by existing channels in that space? The overlap of those three answers is usually your strongest starting niche.',
          'Niche does not mean narrow forever. Most large channels started extremely specific (one person, one skill, one format) and widened gradually once they had a core audience that trusted them. Trying to appeal broadly on day one is one of the most common reasons new channels stall at a few hundred subscribers.',
          'Study three to five channels already succeeding in your space, but do not copy them. Note what they are not covering, what questions show up unanswered in their comment sections, and what a slightly different angle, personality, or production style could offer that they do not. Comment sections are a free, constant source of content ideas straight from a real audience.',
          'Consistency in topic matters more than perfection in production for the first twenty to thirty videos. A clear, specific channel with average production quality will outgrow a beautifully produced channel with no topic focus, because YouTube needs repetition and pattern to know who to recommend you to.',
        ],
      },
      {
        id: 'production',
        title: 'Planning, Filming & Editing Workflow',
        minutes: 16,
        body: [
          'A repeatable workflow is what allows creators to publish consistently without burning out. Treat every video as five stages: idea and outline, script or talking points, filming, editing, and publishing with metadata. Trying to do all five at once in your head is the fastest route to inconsistent uploads.',
          'Idea and outline: keep a running list of video ideas on your phone at all times, so you are never staring at a blank page on filming day. For each idea, write one sentence describing exactly what a viewer will walk away knowing or feeling after watching.',
          'Script or talking points: full scripts work well for tightly edited, information-dense videos. A simple bullet-point outline works better for conversational, vlog-style content where sounding natural matters more than precision. Either way, always write your first fifteen seconds word for word. That opening is what determines whether a viewer stays or clicks away, and it is the one part of the video worth over-preparing.',
          'Filming: film in a quiet room with consistent lighting, and always record a few extra seconds of silence before you start talking and after you stop. That buffer makes it much easier to cut a clean intro and outro in editing. If you stumble over a sentence, do not stop the recording and start over from scratch, just pause, take a breath, and say the line again. You can cut the mistake out later, and it is much faster than resetting the whole take.',
          'Editing: cut for pace first, polish second. On your first pass through the footage, remove every pause, filler word, and dead moment so the video moves briskly. Only after that rough cut is tight should you add color correction, music, graphics, or captions. Editing in the opposite order (polishing a bloated cut) wastes enormous amounts of time on footage you are about to delete anyway.',
          'Publishing: never upload a video the moment editing finishes. Build a short checklist (title, thumbnail, description, tags, chapters, end screen, pinned comment) and run through it every time, in the same order, so nothing gets skipped when you are tired or rushing to hit a schedule.',
        ],
      },
    ],
  },
  {
    id: 'seo',
    title: 'Module 3: SEO & Discoverability',
    lessons: [
      {
        id: 'titles-thumbnails',
        title: 'Titles, Thumbnails & Click-Through Rate',
        minutes: 13,
        body: [
          'YouTube titles get cut off at roughly 60 characters on most screens, and the strongest titles sit closer to 40 to 50 characters. Lead with the keyword or topic a viewer is actually searching for, make the benefit or outcome specific, and avoid vague clickbait that does not deliver on its promise. Numbers and clear outcomes ("in 10 minutes," "for beginners," a specific year) reliably lift click-through rate because they set a concrete expectation.',
          'Your thumbnail is the single biggest driver of whether someone clicks. Pair every title with a custom 1280x720 thumbnail (never let YouTube auto-select a random frame). A strong thumbnail is high contrast, legible even shrunk down to about 120 pixels wide (how it appears on a phone screen), and answers the title\'s promise visually in under a second.',
          'If you include a face in your thumbnail, make the expression clear and specific, exaggerated curiosity, shock, excitement, whatever genuinely matches the content. If you include text on the thumbnail, keep it to three to five words in large bold type that adds information the title does not already say, rather than just repeating the title.',
          'Title and thumbnail should work as a pair, not duplicate each other. If your thumbnail shows a dramatic "before and after," your title can focus on how it was done. If your thumbnail is a clean, simple visual, your title can carry more of the specific detail. Together they should create a small, honest curiosity gap that the video itself fully resolves.',
          'Test and learn from your own data rather than guessing forever. YouTube Studio shows you click-through rate for every video. If a video is getting strong impressions but a weak click-through rate, the content likely was not the problem, the title and thumbnail were. That is a fixable, learnable skill, not luck.',
        ],
      },
      {
        id: 'metadata',
        title: 'Descriptions, Tags & Chapters for Search',
        minutes: 10,
        body: [
          'YouTube search behaves a lot like Google search. It is matching a viewer\'s typed query against your title, description, tags, captions, and even your chapter names, then ranking results partly by how well people actually watch the video once they click through on that specific search.',
          'Description: write the first two sentences for humans, clearly stating what the video covers, since this is what shows before a viewer has to click "show more." Below that, you can write a longer, more detailed summary that naturally includes the keywords and phrases a viewer might search for, without stuffing them in unnaturally.',
          'Tags: tags carry much less weight today than they did years ago, but they still help YouTube understand context, especially for channels and topics that are new or easily confused with something else. Use a short list of specific tags directly describing your video\'s topic, rather than a long list of generic, high-volume tags that do not precisely match your content.',
          'Chapters: break longer videos into clearly labeled chapters using timestamps in the description. Avoid vague labels like "Part 1" or "Intro," and instead use specific, descriptive chapter names that mirror how someone might search for that exact topic. Well-labeled chapters can even surface directly in Google search results as a jump-to-timestamp link, which is free additional discovery outside of YouTube itself.',
          'Captions: upload or carefully review auto-generated captions rather than ignoring them. Accurate captions improve accessibility, help YouTube understand your spoken content for search matching, and are required for your videos to be properly indexed by language and topic.',
        ],
      },
      {
        id: 'algorithm',
        title: 'How the Suggested & Search Algorithm Works',
        minutes: 15,
        body: [
          'YouTube\'s recommendation system is, at its core, trying to predict what a specific viewer wants to watch next, using signals like watch and search history, subscriptions, likes, "not interested" clicks, and satisfaction survey responses. It processes an enormous number of these signals daily across the entire platform.',
          'There are two very different surfaces to understand. Suggested videos (the "Up next" column and home feed) typically drive 40 to 60 percent of total views for most channels, making it the single largest traffic source on the platform. Search is smaller for most channels but tends to bring in highly intentional viewers who are specifically looking for your exact topic.',
          'For Suggested, YouTube weighs how closely your video\'s topic matches what the viewer is currently watching, your video\'s average view duration compared to similar videos, how well your content performed with viewers who have a similar watch history, and whether this is a returning viewer. A viewer who comes back for more of your content the next day is worth significantly more to the algorithm than a one-time new viewer, which is exactly why consistent uploads to the same core topic compound over time.',
          'For Search, YouTube evaluates how well your title, description, tags, and captions match the viewer\'s exact query, how deeply people watch your video specifically for that search term, and how authoritative your channel appears to be on that topic based on your history of related content.',
          'The single most influential metric across both surfaces is audience retention, how much of each video people actually watch, and whether they keep watching further videos in the same session afterward. A video that holds attention from start to finish, and leads a viewer into another video (yours or someone else\'s, though obviously yours is the goal), signals strong long-term satisfaction, which the algorithm now weighs more heavily than short-term view spikes.',
          'Practical takeaway: do not chase a single viral video. Chase a retention pattern. A channel that reliably keeps 50 percent or more of its average viewer watching through an entire video, video after video, will out-grow a channel with one lucky viral hit and weak retention everywhere else.',
        ],
      },
    ],
  },
  {
    id: 'monetization',
    title: 'Module 4: Monetization & the YouTube Shop',
    lessons: [
      {
        id: 'ypp',
        title: 'YouTube Partner Program Requirements',
        minutes: 9,
        body: [
          'The YouTube Partner Program, YPP, is the gateway to every monetization tool on the platform. It currently comes in two tiers, and channels apply for the first, then graduate to the second as they grow.',
          'Tier 1 requires 500 subscribers, 3,000 public watch hours in the last 12 months (or 3 million Shorts views in the last 90 days), and 3 public uploads in the last 90 days. Reaching Tier 1 unlocks channel memberships, Super Chat and Super Thanks, Super Stickers, and eligibility for the YouTube Shopping affiliate program.',
          'Tier 2, full monetization including ad revenue, requires 1,000 subscribers plus either 4,000 qualified watch hours in the last 12 months or 10 million qualified Shorts views in the last 90 days. There is no minimum upload count requirement at this tier.',
          'Beyond the subscriber and watch hour thresholds, your channel also needs zero active Community Guidelines strikes, compliance with YouTube\'s monetization policies (original content, no reused or low-effort mass-produced content), two-step verification enabled on your Google account, an active Google AdSense account linked to the channel, and residence in a country where YPP is available.',
          'A heads up for planning purposes: YouTube has announced that Tier 2 requirements are set to increase on February 1, 2027, rising to 1,000 subscribers plus 8,000 watch hours or 20 million Shorts views. If you are building toward monetization now, this is one more reason consistency sooner rather than later pays off.',
        ],
      },
      {
        id: 'shop',
        title: 'Setting Up and Using YouTube Shopping',
        minutes: 12,
        body: [
          'YouTube Shopping lets creators tag products directly inside their videos, Shorts, and live streams, so viewers can purchase without ever leaving the video. It has become one of the fastest-growing monetization tools on the platform and is now available to eligible creators with as few as 500 subscribers in YPP, across a growing number of countries that YouTube expects to reach 35 markets by the end of 2026.',
          'Getting started: once you are eligible, you will see an invitation inside the Earn section of YouTube Studio. Go to YouTube Studio, open Monetization, then Shopping, click Get Started, then Turn On, and accept the YouTube Shopping Affiliate Program Terms of Service.',
          'Connecting a store: if you sell your own products, you can connect a storefront from a supported platform (Shopify is the most common) directly to your channel. If you do not have your own products yet, you can still participate as an affiliate, earning a commission by tagging products from YouTube\'s existing affiliate catalog without needing to hold any inventory yourself.',
          'Tagging products: when uploading or editing a video, open the Shopping section in the video details panel, search the product catalog by name, category, or brand, and tag relevant products. You can tag up to 60 products in a single video. For longer videos, add timestamps to your tagged products so a viewer who is shopping sees the right product appear at the right moment, rather than every tag showing up all at once.',
          'A practical note: if a video has an active copyright claim, product tags may not display correctly, so check your copyright status before relying on a video for Shopping revenue. Also remember that viewers outside your home country will see a localized version of the product link while you still earn the commission, which widens your potential audience for affiliate income considerably.',
          'Best use case: Shopping performs best in review videos, tutorials, and "what I use" style content, where a viewer is already in a mindset of considering a purchase. Forcing product tags into content where they feel out of place tends to hurt both the viewing experience and the click-through rate on the tags themselves.',
        ],
      },
      {
        id: 'multiple-streams',
        title: 'Ad Revenue, Memberships, Super Chat & Sponsors',
        minutes: 14,
        body: [
          'Relying on ad revenue alone is one of the most common mistakes new creators make. Ad rates fluctuate by topic, season, and advertiser demand, and are completely outside your control. The creators with the most stable income build multiple smaller revenue streams that add up, rather than depending on one.',
          'Ad revenue: once you reach Tier 2 of YPP, ads run on your videos automatically and you are paid a share of that revenue, measured in RPM (revenue per thousand views). RPM varies enormously by topic (finance and business content earns far more per view than entertainment, for example), audience location, and time of year, with rates typically higher in the final few months of the year as advertiser budgets increase.',
          'Channel memberships: once eligible, viewers can pay a recurring monthly fee directly to your channel in exchange for perks you define, badges, emojis, members-only posts, or members-only livestreams. This is genuine recurring income that is not dependent on view count, and it tends to come from your most loyal viewers rather than casual ones.',
          'Super Chat and Super Thanks: viewers can pay to have their message highlighted during a livestream (Super Chat) or to show appreciation on a regular video (Super Thanks). These work best for channels with an engaged, direct relationship with their audience, especially live streamers and creators who regularly respond to comments on camera.',
          'Sponsorships and brand deals: paid partnerships with brands, covered in full in Module 6, are often the single largest income source for established creators, frequently exceeding ad revenue entirely once a channel has a clearly defined, trusted audience in a specific niche.',
          'The realistic path: most sustainable creator incomes are a blend, some ad revenue, some Shopping commission, some membership income, and sponsorship deals layered on top as the channel grows. Treat each one as a separate, smaller stream rather than waiting for any single one to become a full income on its own.',
        ],
      },
    ],
  },
  {
    id: 'growth',
    title: 'Module 5: Growing Subscribers & Community',
    lessons: [
      {
        id: 'retention',
        title: 'Hooking Viewers & Building Retention',
        minutes: 13,
        body: [
          'The first fifteen seconds of any video determine most of its performance. YouTube Studio\'s audience retention graph almost always shows the steepest drop-off right at the start, which means the opening is the highest-leverage fifteen seconds you will film all video.',
          'A strong hook does one of three things immediately: states the specific outcome the viewer will get by watching ("by the end of this video you will know exactly how to..."), opens on the most visually or emotionally interesting moment of the entire video rather than a slow build-up, or asks a question the viewer genuinely wants answered. Avoid long, generic introductions, channel branding, or "hey guys welcome back" style openings before getting into the content itself.',
          'Retention through the middle of the video matters just as much as the hook. Cut dead air and filler words aggressively in editing. Use pattern interrupts, a change in camera angle, a graphic, a quick cutaway, every twenty to thirty seconds to keep the viewer\'s attention from drifting, especially in longer videos.',
          'Open loops are a reliable retention tool: tease something coming later in the video ("stick around because the third tip is the one that actually changed my results") to give viewers a reason to keep watching rather than skipping ahead or leaving.',
          'Check your audience retention graph in YouTube Studio after every upload. Look for exactly where viewers drop off and ask honestly why. A slow intro, a tangent, a repeated point, a boring visual, these are all fixable patterns once you can see them clearly in the data, rather than guessing.',
          'Remember that returning viewers, people who come back the next day for more of your content, are weighted heavily by the algorithm. A single video that holds attention well but never brings the viewer back is less valuable long term than a slightly less viral video that turns a viewer into a habitual one.',
        ],
      },
      {
        id: 'community',
        title: 'Community Tab, Shorts & Cross-Promotion',
        minutes: 11,
        body: [
          'Shorts are currently the fastest discovery engine on YouTube, pulling in a massive share of daily views platform-wide, with the large majority of those views coming from people who do not yet subscribe to the channel posting them. A single well-performing Short can realistically bring in hundreds of new subscribers in a single day, something long-form videos rarely do at that speed.',
          'Use Shorts strategically rather than as a separate, disconnected content type. Quick tips, "part 1 of 3" style cliffhangers, and short clips that tease a longer video perform especially well, and channels that treat Shorts as a funnel into their long-form content see meaningfully higher subscriber conversion than channels running Shorts as a completely separate effort.',
          'Aim for a minimum consistent posting rhythm, several Shorts per week is a reasonable starting target, alongside your regular long-form upload schedule. Consistency compounds: channels that publish on a steady, predictable schedule grow subscribers significantly faster and see meaningfully higher audience retention than channels that post irregularly, because both viewers and the algorithm learn to expect new content from you.',
          'The Community tab (polls, images, text updates) is often underused but genuinely effective. In 2026 the algorithm treats Community posts as real content capable of reaching non-subscribers through the home feed, not just your existing audience. Polls in particular tend to generate unusually high engagement relative to a normal post, and that engagement itself increases how often YouTube surfaces your channel to new people.',
          'Cross-promotion rounds out the picture: mention your own earlier videos naturally inside new ones when relevant, link related videos in your end screens and description, and if you have any presence on other platforms, use it to point people back to YouTube specifically, since YouTube rewards channels that can demonstrate an engaged, returning audience over time.',
        ],
      },
    ],
  },
  {
    id: 'advertising',
    title: 'Module 6: Brand Deals & Commercial Advertising',
    lessons: [
      {
        id: 'brand-deals',
        title: 'Landing and Pricing Brand Deals',
        minutes: 14,
        body: [
          'Brand deals become realistic once a channel has a clear topic, an engaged audience, and a consistent upload history, often well before a channel is large by subscriber count. Brands care more about relevant, engaged viewers than raw subscriber totals.',
          'Finding deals: the two main paths are brands reaching out to you once your channel has some visibility, and you reaching out to brands directly with a short, professional pitch, your channel\'s topic, audience size and demographics, average views, and a specific idea for how their product fits naturally into your content. A specific, tailored pitch dramatically outperforms a generic "I would love to work with you" message.',
          'Pricing models: sponsorships are typically priced one of three ways, a flat fee per video, a CPM-based rate (a set amount per thousand expected views), or a hybrid of a flat base fee plus a performance bonus. Typical CPM integration rates run roughly $15 to $40, with dedicated, full-video sponsorships commanding $50 to $150 or more per thousand views depending on niche and production quality.',
          'Rough market rate ranges by audience size are useful as a starting reference, though niche and engagement matter enormously: nano channels (1,000 to 10,000 subscribers) often see $50 to $500 per deal, frequently including free product; micro channels (10,000 to 50,000) commonly see $200 to $1,500; mid-size channels (50,000 to 500,000) commonly see $1,000 to $10,000; larger channels can command far more. These are reference points, not guarantees, your specific niche, engagement rate, and production quality all move these numbers significantly.',
          'Protecting the relationship with your audience: only accept sponsors whose product you would genuinely recommend without payment, and say so honestly in the video. Audiences can tell the difference between a creator who filters sponsors carefully and one who accepts anything, and that trust is the actual long-term asset that makes future brand deals, and future ad revenue, worth more.',
        ],
      },
      {
        id: 'disclosure',
        title: 'FTC Disclosure & Commercial Ad Rules',
        minutes: 9,
        body: [
          'Disclosure is not optional, and enforcement has increased significantly in recent years. As of 2026, brand co-liability enforcement is active, meaning both the creator and the sponsoring brand can face penalties for an undisclosed paid partnership, not just the creator.',
          'What counts as a paid partnership: any video where you received payment, free product, or any other form of compensation in exchange for featuring a product or brand. This includes affiliate links with a commission attached, not just direct cash sponsorships.',
          'How to disclose correctly: use YouTube\'s built-in "Paid promotion" toggle on every sponsored upload, and also state the partnership clearly in the video itself, either verbally near the start or in an on-screen text overlay, not buried only in the description where many viewers will never see it. Both the toggle and the verbal or on-screen mention are expected together, not as alternatives to each other.',
          'The cost of skipping disclosure is significant. Current FTC penalties run into the tens of thousands of dollars per undisclosed video, and enforcement actions have risen sharply compared to just a few years ago, including large settlements against well-known creators who skipped proper disclosure. This is a real financial and reputational risk, not a minor technicality.',
          'A simple rule that keeps you safe: if you were paid, given free product with an expectation of coverage, or stand to earn a commission from a link, disclose it clearly, every time, in both the toggle and the video itself. When in doubt, disclose. Audiences consistently respond better to transparency than to discovering an undisclosed relationship later.',
        ],
      },
      {
        id: 'capstone',
        title: 'Capstone: Your 90-Day Channel Plan',
        minutes: 18,
        body: [
          'This final lesson ties every module together into a single, concrete plan. Real growth comes from consistent execution of fundamentals, not from any single trick, so this plan is intentionally simple enough to actually follow for the full 90 days.',
          'Days 1 to 7, foundation: finalize your niche in one sentence, assemble your starter gear (mic, two lights, your phone), set up your editing software and build a reusable project template, and write a list of at least twenty video ideas before you film your first video.',
          'Days 8 to 30, publish and learn: upload at least one long-form video per week and three to four Shorts per week, minimum. Every single upload, run through your full metadata checklist, custom thumbnail, keyword-aware title, detailed description, chapters on anything over eight minutes, and the paid promotion toggle on any sponsored content. Check your audience retention graph after every video and write down one specific thing you will change next time.',
          'Days 31 to 60, refine: by now you have real data. Double down on whichever specific topics, formats, or hooks produced your strongest retention and click-through rate, and quietly retire whatever consistently underperformed. Start reaching out to three to five small brands relevant to your niche, even before you feel "big enough," since relevant audience fit matters more than raw size.',
          'Days 61 to 90, systematize: apply to YPP once you cross the Tier 1 thresholds (500 subscribers, 3,000 watch hours in 12 months, or the equivalent Shorts view threshold). If eligible, turn on Shopping and tag relevant products in your strongest-performing videos. Build out your Community tab with at least one poll or update per week. Revisit your original twenty video ideas list and refill it to twenty again, so you never face a blank page.',
          'The honest truth about the first 90 days: most channels do not look dramatically different by day 90 in subscriber count, and that is normal, not a failure signal. What should be dramatically different is your retention graphs, your comfort on camera, your editing speed, and your understanding of exactly who your audience is. That foundation is what every large channel was built on, and it is what the rest of this masterclass, and everything you do after it, compounds on top of.',
        ],
      },
    ],
  },
];
