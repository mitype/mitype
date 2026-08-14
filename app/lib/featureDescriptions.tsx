// Central library of "how this feature works" descriptions.
// One source of truth for every info modal across the site so
// tuning copy is a one-file change.
//
// Never use em-dashes in these descriptions per user request.

export interface FeatureDescription {
  key: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const FEATURE_DESCRIPTIONS: Record<string, FeatureDescription> = {
  dashboard: {
    key: 'dashboard',
    title: 'Your dashboard',
    paragraphs: [
      'The dashboard is your home base on Mitype. Everything you can do on the platform lives one tap away from here.',
      'The Daily Spark card at the top surfaces one hand picked creator per day with a personalized icebreaker written for you. The Weekly Prompt card shows the community writing prompt of the week. Below that, the Explore Mitype grid lets you jump into every major feature: Discover, Wave Feed, The Current, Messages, Spotlight, Brand Deals, Collab Board, Meetups, Project Rooms, Small Businesses, and Mi Home Goods.',
      'Whenever a card pulses with a bright ring and a NEW pill, that feed has fresh content since your last visit.',
    ],
  },
  discover: {
    key: 'discover',
    title: 'Discover',
    paragraphs: [
      'Discover is where you find people to connect with. Every creator on Mitype is here, ranked by how well their craft, city, and interests match yours.',
      'Use the filter panel to narrow by category (Photographers, Musicians, Writers, and 100+ more), by ZIP code or city, or by distance. You can also switch tabs to browse Rooms (public interest hangouts) or Small Businesses in your area.',
      'Tap any profile card to see the person in full. Tap the Message button on their profile to open a connection request. Every message request has to be approved by the recipient before the conversation starts, so nobody gets spammed.',
    ],
  },
  wave: {
    key: 'wave',
    title: 'The Wave Feed',
    paragraphs: [
      'The Wave Feed is a vertical scrolling video feed. Every video is a short creator moment, 60 seconds or less, from someone whose craft overlaps with yours.',
      'Swipe up to see the next video. Double tap the video to like it. Tap the heart to like without the animation. Tap Chat to message the creator directly. Tap Save to download the video to your phone. Tap Skip to hide it from your feed, with a 5 second undo window in case you change your mind.',
      'To post your own Wave video, tap the plus icon in the top right. You can trim the clip, add a caption, pick a category, and even link the video to a Mi Home Goods listing or your Small Business page.',
    ],
  },
  currents: {
    key: 'currents',
    title: 'The Current',
    paragraphs: [
      'The Current is a text based feed. Members drop short posts up to 500 characters, other members reply in threads, and everyone can Echo posts they like (similar to a repost).',
      'The Current has one signature move: rich mention embeds. Type @username, @business-handle, or @goods-listing-id inside your post, and the feed automatically renders a beautiful card for that entity right inside your post.',
      'Posting to The Current requires an active Mitype subscription. Reading is free for everyone.',
    ],
  },
  messages: {
    key: 'messages',
    title: 'Messages',
    paragraphs: [
      'Messages is your inbox for every conversation on Mitype: one on one DMs, group chats with your crew, and public Rooms organized by interest.',
      'Any new conversation from someone you have never messaged before shows up as a Request first. You approve or decline before the thread opens. Approved conversations move to your Conversations list.',
      'Inside any conversation you can send voice notes, share photos, and start one of 14 built in mini games (Would You Rather, Trivia Battle, Chess, Battleship, Word Duel, Pictionary, Story Builder, and more). Every attachment and voice note auto deletes 24 hours after sending.',
    ],
  },
  brandDeals: {
    key: 'brandDeals',
    title: 'Brand Deals',
    paragraphs: [
      'Brand Deals is a marketplace where Mitype small businesses post paid creator briefs and Mitype creators apply.',
      'A subscribed business owner can post a brief with a title, description, budget, timeline, deliverables (Instagram post, TikTok video, blog article, etc.), and location. Subscribed creators browse the open briefs, apply to the ones that fit, and negotiate directly with the business through your existing Messages inbox.',
      'Only subscribed members can post or apply. Mitype introduces the two sides and steps back. Payment happens directly between the business and the creator.',
    ],
  },
  collab: {
    key: 'collab',
    title: 'Collab Board',
    paragraphs: [
      'Collab Board is creator to creator project matching. Post a brief describing what you are building and what kind of creator you need to help finish it. Other subscribed creators browse and apply.',
      'Every brief has a compensation type: Paid, Trade (you help me, I help you), Revenue Share, or Credit. Set your timeline, location preference, and what you are looking for. Applicants send an intro message that opens straight into your Messages inbox.',
      'Great for finding a music video director, an illustrator for a book cover, a stylist for a shoot, or a co host for a podcast episode. Only subscribed creators can post or apply.',
    ],
  },
  meetups: {
    key: 'meetups',
    title: 'Local Meetups',
    paragraphs: [
      'Local Meetups is where Mitype creators meet up in person. Any subscribed member can host a meetup: coffee chats, portfolio review nights, gallery visits, studio sessions, whatever.',
      'Browse upcoming meetups filtered by ZIP code so you only see what is nearby. Tap into a meetup to see the venue, time, host, and current RSVP count. Tap RSVP to lock in your spot. If a meetup has a capacity limit, it fills first come first served.',
      'To host one yourself, tap Host a meetup, fill in the details, and post. Other subscribers in your area will see your event automatically.',
    ],
  },
  projects: {
    key: 'projects',
    title: 'Project Rooms',
    paragraphs: [
      'Project Rooms are shared workspaces for when you have agreed to collaborate with another creator. Instead of scattering the work across DMs, Google Docs, and email, keep everything in one place.',
      'Each Project Room has a title, description, deadline, and a task checklist that both collaborators can add to, check off, or delete. Every participant sees the full picture whenever they open the room.',
      'To start a room, tap Start a project room, enter a collaborator by @username, and set an optional deadline. Only subscribed members can start rooms.',
    ],
  },
  editProfile: {
    key: 'editProfile',
    title: 'Edit Profile',
    paragraphs: [
      'Edit Profile is your control panel for everything about how you appear on Mitype. Add up to 6 photos, write your bio, pick your creative categories, set your city and ZIP, add portfolio links, and answer profile prompts to give your profile personality.',
      'Two important newer sections: Availability toggles (mark yourself as "Available for new work" or "Available for coffee chats" so other creators see it on your profile) and Skill Tags (up to 12 specific tools or specialties like Ableton, Adobe Premiere, 35mm film, Spanish, wedding photography, so other creators can find you in Discover).',
      'Your profile needs a photo to be saved. Everything else is optional.',
    ],
  },
  profile: {
    key: 'profile',
    title: 'Public profile',
    paragraphs: [
      'Your public profile is what everyone else on Mitype sees when they tap your name. It shows your photos, bio, categories, city, prompts, portfolio links, endorsements from other members, your Positivity Score, and your most recent Wave videos.',
      'If you have opted in as available for work or coffee chats, small green pills appear next to your username so people know you are open to hear from them.',
      'Your Positivity Score is an 8 star meter built from anonymous votes by people who have interacted with you. It rewards you for being a good community member.',
    ],
  },
  homeGoods: {
    key: 'homeGoods',
    title: 'Mi Home Goods',
    paragraphs: [
      'Mi Home Goods is a peer to peer local marketplace for Mitype members. Furniture, electronics, vintage finds, free stuff, whatever you want to sell or give away.',
      'Every listing can have up to 4 photos, a title, description, condition (New, Like New, Gently Used, Used, For Parts), a price (or Free, or OBO), and your general area. Buyers can save listings, message you through the platform, and meet in person to complete the deal.',
      'Mitype does not handle payment. The platform introduces the two of you, safety guidelines are built in, and the rest is between you and the buyer.',
    ],
  },
  businesses: {
    key: 'businesses',
    title: 'Small Businesses',
    paragraphs: [
      'Small Businesses was built to solve one problem: independent businesses struggle to get discovered and struggle to afford the marketing that big brands take for granted. Mitype turns your small business into a first class citizen on a platform full of real potential customers and creators who can help you grow.',
      'Setup is free. Any Mitype member can build a full business page in minutes: logo, business name, category, services list, hours, contact buttons, social links, physical address (or mark as online only), and upcoming events. Your business appears in Discover for members in your ZIP code and city, so locals find you first.',
      'Every day, one small business gets featured as the Daily Business Spotlight on the Discover page. This is a real free marketing surface seen by every Mitype member on rotation. No ad spend required. Your business rotates in automatically.',
      'Customers can leave recommendations right on your page. This is word of mouth made visible: each recommendation shows up as social proof, and the recommender member gets credit as a trusted voice. Businesses with recommendations get labeled and outrank plain listings in discovery.',
      'Online only businesses are welcome. Etsy shops, Shopify stores, coaches, consultants, online course creators, digital product sellers all show up in Discover just like local shops do. You can toggle the online only badge to signal you serve customers anywhere.',
      'Once your Mitype subscription is active, you unlock the Brand Deals surface from your business page. Post a creator brief with your budget, and Mitype creators apply directly. This is how a small business can get an Instagram Reel, a TikTok, product photography, or written content without paying agency rates.',
      'The goal is simple: give small businesses the discovery, social proof, and creator access that big brands buy. All in one place, all built into the same platform your customers are already on.',
    ],
  },
  subscription: {
    key: 'subscription',
    title: 'Subscription',
    paragraphs: [
      'Your Mitype subscription unlocks the entire earning and collaboration layer of the platform: posting to The Current, applying to Brand Deals, using the Collab Board, hosting or RSVPing to Meetups, starting Project Rooms, and being eligible for the Founders 50 Rewards Program.',
      'Your first 30 days are free with no charge. Cancel anytime through PayPal.',
      'The Founders 50 Rewards Program is our creator revenue share program. Once Mitype crosses 50,000 subscribers, opted in members start receiving a share of platform revenue every month. Opt in on this page.',
    ],
  },
  spotlight: {
    key: 'spotlight',
    title: 'Spotlight',
    paragraphs: [
      'Spotlight is the portfolio surface of Mitype. Members feature their strongest work here and other members browse for inspiration or to hire someone.',
      'Every Spotlight card links to that creator profile. Use it to discover who is doing the kind of work you want to do more of, then reach out.',
    ],
  },
  rooms: {
    key: 'rooms',
    title: 'Rooms',
    paragraphs: [
      'Rooms are public group chats organized by interest. Film geeks, beat makers, plant parents, indie filmmakers, and dozens more. Anyone can join any Room.',
      'Every Room has a daily prompt to keep conversation alive. Room moderators can pin messages, remove content, or update the prompt.',
      'To find Rooms, tap "Looking for a room to join?" on Discover. To create a Room, use the plus icon in Messages.',
    ],
  },
  admin: {
    key: 'admin',
    title: 'Admin Control Center',
    paragraphs: [
      'The Admin Control Center is your operator dashboard. Only accounts with the is_admin flag can see it or reach the URL.',
      'Four tabs: All (every user account), Subscribed (active + trialing subscribers), Unsubscribed (everyone else), and Founders 50 (opted in members). Each tab shows a total count.',
      'Tap any user row to jump straight to their public profile. Use the search box to find a specific username fast.',
    ],
  },
};
