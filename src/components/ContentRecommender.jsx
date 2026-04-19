import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useContentRecommender({ contentType, me, friendEmails = [] }) {
  // Fetch user's interests
  const { data: userInterests = [] } = useQuery({
    queryKey: ['user_interests', me?.email],
    queryFn: async () => {
      if (!me?.email) return [];
      return await base44.entities.Interest.filter({ user_email: me.email });
    },
    enabled: !!me?.email,
  });

  // Get friends' interests (what they liked)
  const { data: friendsInterests = [] } = useQuery({
    queryKey: ['friends_interests', friendEmails],
    queryFn: async () => {
      if (friendEmails.length === 0) return [];
      const allInterests = await base44.entities.Interest.filter({
        user_email: { '$in': friendEmails },
        is_interested: true
      });
      return allInterests;
    },
    enabled: friendEmails.length > 0,
  });

  // Extract user's interest profile
  const userInterestProfile = useMemo(() => {
    const profile = {
      interestedThemes: [],
      notInterestedThemes: [],
      interestedKeywords: [],
      notInterestedKeywords: [],
    };

    userInterests.forEach(interest => {
      if (interest.is_interested) {
        interest.themes?.forEach(t => profile.interestedThemes.push(t));
        interest.keywords?.forEach(k => profile.interestedKeywords.push(k));
      } else {
        interest.themes?.forEach(t => profile.notInterestedThemes.push(t));
        interest.keywords?.forEach(k => profile.notInterestedKeywords.push(k));
      }
    });

    return profile;
  }, [userInterests]);

  // Get recommended content based on interests
  const getRecommendedContentFilters = () => {
    return {
      preferredThemes: userInterestProfile.interestedThemes,
      preferredKeywords: userInterestProfile.interestedKeywords,
      avoidThemes: userInterestProfile.notInterestedThemes,
      avoidKeywords: userInterestProfile.notInterestedKeywords,
      friendsInterests: friendsInterests,
    };
  };

  return {
    userInterestProfile,
    getRecommendedContentFilters,
    userInterests,
    friendsInterests
  };
}