import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import FollowButton from '@/components/profile/FollowButton';

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      if (!searchTerm) {
        return allUsers.filter(u => u.id !== me?.id); // Exclude self from list
      }
      return allUsers.filter(user => 
        user.id !== me?.id &&
        (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number?.includes(searchTerm))
      );
    },
    enabled: !!me,
    initialData: []
  });

  const createDmMutation = useMutation({
    mutationFn: async (otherUser) => {
        // More robust check for existing DM
        const userEmails = [me.email, otherUser.email].sort();
        const existingGroups = await base44.entities.Group.filter({ 
            type: 'dm',
            members: { '$all': userEmails }
        });
        if (existingGroups.length > 0) return existingGroups[0];

        // If not, create a new one
        const newGroup = await base44.entities.Group.create({
            name: `DM with ${otherUser.full_name}`,
            description: `Direct message between ${me.full_name} and ${otherUser.full_name}`,
            type: 'dm',
            admins: [me.email, otherUser.email],
            members: [me.email, otherUser.email]
        });
        return newGroup;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries(['groups']);
      // A small delay to allow sidebar to update before navigating, though not ideal
      setTimeout(() => {
        window.location.href = createPageUrl('Home');
      }, 500);
    }
  });

  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0">
      <div className="container mx-auto p-3 sm:p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="relative mb-4 sm:mb-6 md:mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search members by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-12"
          />
        </div>
        
        {isLoading && (
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {users.map(user => (
              <Card key={user.id} className="text-center flex flex-col">
                <CardContent className="p-3 sm:p-5 flex-1">
                  <Avatar className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-4">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback className="text-lg sm:text-2xl">
                      {user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-sm sm:text-base leading-tight">{user.full_name}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                </CardContent>
                <CardFooter className="p-2 sm:p-3 border-t flex gap-1.5 sm:gap-2">
                  <Button className="flex-1" onClick={() => createDmMutation.mutate(user)} disabled={createDmMutation.isLoading}>
                    {createDmMutation.isLoading && createDmMutation.variables?.id === user.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4"/>
                    )}
                    Message
                  </Button>
                  <FollowButton targetEmail={user.email} me={me} />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {!isLoading && users.length === 0 && (
          <p className="text-center text-gray-500 mt-8">No members found.</p>
        )}
      </div>
      </div>
    </div>
  );
}