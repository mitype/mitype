-- Puts the "Phone notifications are here" message in each member's bell
-- list. Run once. Safe to re-run. Does not send a phone push.
INSERT INTO public.notifications (user_id, type, title, body, action_url)
SELECT p.user_id, 'push_announcement', 'Phone notifications are here',
       'Open the menu and switch on Phone notifications. On an iPhone, add Mitype to your Home Screen first.',
       '/info'
  FROM public.profiles p
 WHERE NOT EXISTS (SELECT 1 FROM public.notifications n
                    WHERE n.user_id = p.user_id AND n.type = 'push_announcement');

SELECT count(*) AS members_notified FROM public.notifications WHERE type = 'push_announcement';
