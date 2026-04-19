/**
 * Feed Ranking Engine
 * Combines follow weight + interest score + recency for post ranking.
 */

/**
 * Compute a recency weight: 1.0 for brand-new, decays over 7 days to ~0.1
 */
export function recencyWeight(createdDate) {
    const ageMs = Date.now() - new Date(createdDate).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return Math.max(0.1, 1 - ageDays / 7);
}

/**
 * Build an interest score map: creatorEmail → score (0–1)
 * Based on user's Interest records (positive = boost, negative = suppress).
 */
export function buildInterestScoreMap(interests) {
    const scores = {};
    const counts = {};

    interests.forEach(interest => {
        const email = interest.content_creator_email;
        if (!email) return;
        if (!scores[email]) { scores[email] = 0; counts[email] = 0; }
        scores[email] += interest.is_interested ? 1 : -1;
        counts[email] += 1;
    });

    // Normalize to 0–1
    const result = {};
    Object.keys(scores).forEach(email => {
        const raw = scores[email] / counts[email]; // -1 to 1
        result[email] = (raw + 1) / 2; // shift to 0–1
    });

    return result;
}

/**
 * Rank a list of posts given:
 *  - followingSet: Set of emails the current user follows
 *  - interestScoreMap: { email → 0–1 } from buildInterestScoreMap
 */
export function rankPosts(posts, followingSet, interestScoreMap) {
    return [...posts].sort((a, b) => {
        const scoreFor = (post) => {
            const followWeight = followingSet.has(post.created_by) ? 0.5 : 0;
            const interestScore = (interestScoreMap[post.created_by] ?? 0.3) * 0.3;
            const recency = recencyWeight(post.created_date) * 0.2;
            return followWeight + interestScore + recency;
        };
        return scoreFor(b) - scoreFor(a);
    });
}

/**
 * Score users for "People You May Know" discovery.
 * @param {string} myEmail
 * @param {string[]} myFollowingEmails - who I follow
 * @param {Object[]} allFollows - all Follow records
 * @param {Object[]} myInterests - my Interest records
 * @param {Object[]} allUsers
 * @returns {Array} sorted user list with scores
 */
export function scorePeopleYouMayKnow(myEmail, myFollowingEmails, allFollows, myInterests, allUsers) {
    const followingSet = new Set(myFollowingEmails);

    // Build mutual connection map: for each user I follow, who else do they follow?
    const followedByMyFollows = {};
    allFollows.forEach(f => {
        if (followingSet.has(f.follower_email) && f.following_email !== myEmail) {
            followedByMyFollows[f.following_email] = (followedByMyFollows[f.following_email] || 0) + 1;
        }
    });

    // Build interest overlap: creators I've positively engaged with
    const interestedCreators = new Set(
        myInterests.filter(i => i.is_interested && i.content_creator_email).map(i => i.content_creator_email)
    );

    return allUsers
        .filter(u => u.email !== myEmail && !followingSet.has(u.email))
        .map(u => {
            const mutualScore = Math.min((followedByMyFollows[u.email] || 0) / 5, 1) * 0.4;
            const interestScore = interestedCreators.has(u.email) ? 0.3 : 0;
            // Small base score so everyone has a chance
            const baseScore = 0.1;
            const total = mutualScore + interestScore + baseScore;
            return { ...u, _score: total, _mutualCount: followedByMyFollows[u.email] || 0 };
        })
        .sort((a, b) => b._score - a._score);
}