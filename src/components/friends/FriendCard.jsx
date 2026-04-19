import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { UserPlus, Video, Phone, MessageSquare } from 'lucide-react';

export default function FriendCard({ 
    user, 
    friendStatus, 
    onAddFriend, 
    onAccept, 
    onDecline, 
    onVideoCall,
    onAudioCall,
    onMessage,
    isProcessing 
}) {
    return (
        <Card className="text-center flex flex-col">
            <CardContent className="p-6 flex-1">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback className="text-2xl">{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{user.full_name}</h3>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </CardContent>
            <CardFooter className="p-4 border-t">
                {friendStatus === 'friends' && (
                    <div className="w-full flex gap-2">
                        <Button 
                            className="flex-1" 
                            variant="outline" 
                            size="sm"
                            onClick={() => onVideoCall?.(user)}
                        >
                            <Video className="h-4 w-4" />
                        </Button>
                        <Button 
                            className="flex-1" 
                            variant="outline" 
                            size="sm"
                            onClick={() => onAudioCall?.(user)}
                        >
                            <Phone className="h-4 w-4" />
                        </Button>
                        <Button 
                            className="flex-1" 
                            variant="outline" 
                            size="sm"
                            onClick={() => onMessage?.(user)}
                        >
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                {friendStatus === 'pending-sent' && (
                    <Button className="w-full" variant="outline" disabled>Request Sent</Button>
                )}
                {friendStatus === 'pending-received' && (
                    <div className="w-full flex gap-2">
                        <Button className="flex-1" onClick={() => onAccept(user.friend_request_id)} disabled={isProcessing}>Accept</Button>
                        <Button className="flex-1" variant="destructive" onClick={() => onDecline(user.friend_request_id)} disabled={isProcessing}>Decline</Button>
                    </div>
                )}
                {friendStatus === 'not-friends' && (
                    <Button className="w-full" onClick={() => onAddFriend(user)} disabled={isProcessing}>
                        <UserPlus className="mr-2 h-4 w-4"/>Add Friend
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}