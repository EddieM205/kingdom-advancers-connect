import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { sendPushNotification } from '@/lib/usePushNotifications';

export default function ChatMessageForm({ activeGroup, me }) {
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');

    const { data: groupMembers } = useQuery({
        queryKey: ['groupMembersData', activeGroup?.id],
        queryFn: () => base44.entities.User.filter({ email: { '$in': activeGroup.members } }),
        enabled: !!activeGroup?.members?.length,
        initialData: [],
    });

    const createNotificationMutation = useMutation({
        mutationFn: (notification) => base44.entities.Notification.create(notification),
    });

    const sendEmailMutation = useMutation({
        mutationFn: (emailParams) => base44.integrations.Core.SendEmail(emailParams),
    });

    const handleNotifications = (messageContent) => {
        if (!activeGroup || !me || !groupMembers.length) return;
        
        const appUrl = window.location.origin;
        const link = `${appUrl}${createPageUrl('Home')}`;

        if (activeGroup.type === 'dm') {
            const recipient = groupMembers.find(m => m.email !== me.email);
            if (recipient) {
                createNotificationMutation.mutate({
                    recipient_id: recipient.email,
                    content: `You have a new message from ${me.full_name}.`,
                    link: link,
                });
                sendEmailMutation.mutate({
                    to: recipient.email,
                    subject: `New direct message from ${me.full_name}`,
                    body: `<p>You have a new message from ${me.full_name}:</p><p><i>"${messageContent}"</i></p><p><a href="${link}">Click here</a> to reply.</p>`,
                });
            }
        } else if (activeGroup.type === 'group') {
            const mentionedEmails = new Set();
            const mentionRegex = /@([\w\s]+?)(?=\s|[.,;?!]|$)/g;
            let match;
            while ((match = mentionRegex.exec(messageContent)) !== null) {
                const name = match[1].trim().toLowerCase();
                const mentionedUser = groupMembers.find(m => m.full_name.toLowerCase() === name && m.email !== me.email);
                if (mentionedUser) {
                    mentionedEmails.add(mentionedUser);
                }
            }

            mentionedEmails.forEach(user => {
                createNotificationMutation.mutate({
                    recipient_id: user.email,
                    content: `${me.full_name} mentioned you in #${activeGroup.name}.`,
                    link: link,
                });
                sendEmailMutation.mutate({
                    to: user.email,
                    subject: `You were mentioned in #${activeGroup.name}`,
                    body: `<p>${me.full_name} mentioned you in the group "${activeGroup.name}":</p><p><i>"${messageContent}"</i></p><p><a href="${link}">Click here</a> to view the message.</p>`,
                });
                // Web push for the mention (fires on the mentioned user's device if they have the app open)
                sendPushNotification({
                    title: `${me.full_name} mentioned you`,
                    body: `In #${activeGroup.name}: "${messageContent.slice(0, 80)}"`,
                    tag: `mention-${activeGroup.id}`,
                    url: '/Chat',
                });
            });
        }
    };
    
    const postMutation = useMutation({
        mutationFn: (newPost) => base44.entities.Post.create(newPost),
        onSuccess: (newPost) => {
            queryClient.invalidateQueries(['posts', activeGroup.id]);
            handleNotifications(newPost.content);
            setContent('');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        postMutation.mutate({
            content,
            group_id: activeGroup.id,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
            <div className="relative">
                <Textarea
                    placeholder="Type a message or @mention someone..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    className="pr-20"
                    rows={1}
                />
                <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" disabled={postMutation.isLoading || !content.trim()}>
                    {postMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        </form>
    );
}