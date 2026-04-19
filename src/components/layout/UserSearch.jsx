import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Search, MessageSquare } from 'lucide-react';

export default function UserSearch({ me }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['user_search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(user =>
        user.id !== me?.id &&
        (user.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
         user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      );
    },
    enabled: !!me && !!debouncedSearchTerm,
  });

  const createDmMutation = useMutation({
    mutationFn: async (otherUser) => {
        const userEmails = [me.email, otherUser.email].sort();
        const existingGroups = await base44.entities.Group.filter({ 
            type: 'dm',
            members: { '$all': userEmails }
        });
        if (existingGroups.length > 0) return existingGroups[0];

        return await base44.entities.Group.create({
            name: `DM with ${otherUser.full_name}`,
            description: `Direct message between ${me.full_name} and ${otherUser.full_name}`,
            type: 'dm',
            admins: [me.email, otherUser.email],
            members: [me.email, otherUser.email]
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setSearchTerm('');
    }
  });

  return (
    <Popover>
        <PopoverTrigger asChild>
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input
                    placeholder="Search people..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white/10 text-white placeholder:text-gray-300 border-0 h-9 focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0"
                />
            </div>
        </PopoverTrigger>
        {searchTerm && (
            <PopoverContent className="w-[var(--radix-popover-trigger-width)]" align="start">
                <div className="flex flex-col space-y-2 max-h-60 overflow-y-auto">
                {isLoading && <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin"/></div>}
                {!isLoading && users?.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                        <div className="flex items-center space-x-2">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <Button size="sm" onClick={() => createDmMutation.mutate(user)} disabled={createDmMutation.isLoading && createDmMutation.variables?.id === user.id}>
                            {createDmMutation.isLoading && createDmMutation.variables?.id === user.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <MessageSquare className="w-4 h-4" />}
                        </Button>
                    </div>
                ))}
                {!isLoading && users?.length === 0 && debouncedSearchTerm && <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>}
                </div>
            </PopoverContent>
        )}
    </Popover>
  );
}