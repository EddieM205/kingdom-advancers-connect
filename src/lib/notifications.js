/**
 * Centralized notification utility for Kingdom Advancers
 * All notification creation flows through here for consistency.
 *
 * Notification entity fields:
 *   recipient_id  — email of the user who should receive it
 *   content       — human-readable text shown in the UI
 *   link          — route to navigate to on click
 *   is_read       — boolean, default false
 *   type          — category string (see NOTIF_TYPES)
 *   sender_avatar — URL of the sender's avatar (optional)
 *   group_id      — if related to a chat group, the group.id (optional)
 */

import { base44 } from '@/api/base44Client';
import { sendPushNotification } from './usePushNotifications';

// ─── Offline push via OneSignal (Vercel function) ─────────────────────────────

/**
 * Send an offline push notification to a specific user via OneSignal.
 * Silently no-ops if VITE_PUSH_API_URL is not configured.
 */
async function pushToUser({ targetEmail, title, body, url }) {
  const apiUrl = import.meta.env.VITE_PUSH_API_URL;
  if (!apiUrl || !targetEmail) return;
  try {
    await fetch(`${apiUrl}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail, title, body, url }),
    });
  } catch (e) {
    console.warn('pushToUser failed:', e);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export const NOTIF_TYPES = {
  MESSAGE:       'message',
  FOLLOW:        'follow',
  FOLLOW_REQ:    'follow_request',
  FOLLOW_ACCEPT: 'follow_accepted',
  REACTION:      'reaction',
  COMMENT:       'comment',
  MENTION:       'mention',
  CHALLENGE:     'challenge',
  GROUP_INVITE:  'group_invite',
  GROUP_REMOVE:  'group_remove',
  CALL:          'call',
  GENERAL:       'general',
};

// ─── Type detector (for legacy notifications without a type field) ─────────────

export function detectNotifType(notif) {
  if (notif.type) return notif.type;
  const c = (notif.content || '').toLowerCase();
  if (c.startsWith('__call__:')) return NOTIF_TYPES.CALL;
  if (c.includes('💬') || c.includes(': ') && c.includes('message')) return NOTIF_TYPES.MESSAGE;
  if (c.includes('started following') || c.includes('is now following')) return NOTIF_TYPES.FOLLOW;
  if (c.includes('follow request')) return NOTIF_TYPES.FOLLOW_REQ;
  if (c.includes('accepted your follow')) return NOTIF_TYPES.FOLLOW_ACCEPT;
  if (c.includes('reacted')) return NOTIF_TYPES.REACTION;
  if (c.includes('commented') || c.includes('replied to your')) return NOTIF_TYPES.COMMENT;
  if (c.includes('mentioned you')) return NOTIF_TYPES.MENTION;
  if (c.includes('challenged')) return NOTIF_TYPES.CHALLENGE;
  if (c.includes("added to the group") || c.includes("added you to")) return NOTIF_TYPES.GROUP_INVITE;
  if (c.includes('removed from')) return NOTIF_TYPES.GROUP_REMOVE;
  return NOTIF_TYPES.GENERAL;
}

// ─── Core create helper ───────────────────────────────────────────────────────

export async function createNotification({ recipient_id, content, link, type, sender_avatar, group_id }) {
  if (!recipient_id || !content) return;
  try {
    await base44.entities.Notification.create({
      recipient_id,
      content,
      link: link || '/',
      is_read: false,
      type: type || NOTIF_TYPES.GENERAL,
      ...(sender_avatar ? { sender_avatar } : {}),
      ...(group_id ? { group_id } : {}),
    });
  } catch (e) {
    console.warn('Failed to create notification:', e);
  }
}

// ─── Chat message notifications ───────────────────────────────────────────────

/**
 * Notify all group members when a new message is sent.
 * Also fires a browser push notification.
 */
export async function notifyMessageSent({ sender, group, message }) {
  if (!sender || !group || !message) return;

  const others = (group.members || []).filter(e => e !== sender.email);
  if (others.length === 0) return;

  const isDM = group.type === 'dm';
  const preview = message.content?.slice(0, 80) || '📎 Attachment';

  const content = isDM
    ? `${sender.full_name}: ${preview}`
    : `[${group.name}] ${sender.full_name}: ${preview}`;

  const link = '/Chat';

  const pushTitle = isDM ? sender.full_name : group.name;
  const pushBody = isDM ? preview : `${sender.full_name}: ${preview}`;

  await Promise.allSettled([
    ...others.map(email =>
      createNotification({
        recipient_id: email,
        content,
        link,
        type: NOTIF_TYPES.MESSAGE,
        sender_avatar: sender.avatar_url || '',
        group_id: group.id,
      })
    ),
    ...others.map(email =>
      pushToUser({ targetEmail: email, title: pushTitle, body: pushBody, url: link })
    ),
  ]);

  // Browser push for currently-open-but-backgrounded tabs
  sendPushNotification({
    title: pushTitle,
    body: pushBody,
    icon: sender.avatar_url || '/favicon.ico',
    tag: `chat-${group.id}`,
    url: link,
  });
}

// ─── Follow notifications ─────────────────────────────────────────────────────

export async function notifyFollowRequest({ follower, targetEmail }) {
  const content = `${follower.full_name} sent you a follow request`;
  const link = `/CreatorProfile?email=${follower.email}`;
  await Promise.allSettled([
    createNotification({
      recipient_id: targetEmail,
      content,
      link,
      type: NOTIF_TYPES.FOLLOW_REQ,
      sender_avatar: follower.avatar_url || '',
    }),
    pushToUser({ targetEmail, title: 'New Follow Request', body: content, url: link }),
  ]);
}

export async function notifyFollowAccepted({ accepter, requesterEmail }) {
  const content = `${accepter.full_name} accepted your follow request`;
  const link = `/CreatorProfile?email=${accepter.email}`;
  await Promise.allSettled([
    createNotification({
      recipient_id: requesterEmail,
      content,
      link,
      type: NOTIF_TYPES.FOLLOW_ACCEPT,
      sender_avatar: accepter.avatar_url || '',
    }),
    pushToUser({ targetEmail: requesterEmail, title: 'Follow Request Accepted', body: content, url: link }),
  ]);
}

export async function notifyFollowing({ follower, targetEmail }) {
  const content = `${follower.full_name} started following you`;
  const link = `/CreatorProfile?email=${follower.email}`;
  await Promise.allSettled([
    createNotification({
      recipient_id: targetEmail,
      content,
      link,
      type: NOTIF_TYPES.FOLLOW,
      sender_avatar: follower.avatar_url || '',
    }),
    pushToUser({ targetEmail, title: 'New Follower', body: content, url: link }),
  ]);
}

// ─── Mark chat notifications as read ─────────────────────────────────────────

/**
 * Call this when a user opens a chat conversation.
 * Marks all unread message notifications for that group as read.
 */
export async function markChatNotificationsRead(recipientEmail, groupId) {
  if (!recipientEmail || !groupId) return;
  try {
    const unread = await base44.entities.Notification.filter(
      { recipient_id: recipientEmail, is_read: false, group_id: groupId },
      '-created_date',
      50
    );
    await Promise.allSettled(
      unread.map(n => base44.entities.Notification.update(n.id, { is_read: true }))
    );
  } catch {}
}
