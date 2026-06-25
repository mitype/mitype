'use client';
// CurrentTutorial — first-visit onboarding for The Current.
//
// Wraps FeatureTutorial with the slide content explaining what the
// feature is, the 500-char limit, mention syntax, and Echoes. Shows
// once per device (localStorage gated). Bump the storageKey suffix to
// re-show after major changes.

import { FeatureTutorial } from './FeatureTutorial';

export function CurrentTutorial() {
  return (
    <FeatureTutorial
      storageKey="mitype-current-tutorial-v1"
      eyebrow="The Current"
      slides={[
        {
          icon: '🌀',
          title: 'Welcome to The Current',
          body: 'A live, text-only feed for the Mitype community. Drop a thought, reply in threads, and Echo the posts that land.',
        },
        {
          icon: '✍️',
          title: 'Float a thought',
          body: 'Posts are capped at 500 characters. Short, sharp, and signal-heavy. Tap "Float" to send it into the feed.',
        },
        {
          icon: '↻',
          title: 'Echoes, not likes',
          body: 'Tap the Echo button to amplify a current. No public follower counts, no view counters, no engagement bait. Just the conversations you actually care about.',
        },
        {
          icon: '@',
          title: 'Mention anything on Mitype',
          body: 'Tag a person with @username, a small business with @biz/their-handle, or a Mi Home Goods listing with @goods/listing-id. Mitype auto-renders a rich card for each one inside your post.',
        },
        {
          icon: '↪',
          title: 'Threaded replies',
          body: 'Tap any current to open it and reply. Conversations stay tidy — every reply attaches to its parent so threads stay easy to read.',
        },
      ]}
    />
  );
}
