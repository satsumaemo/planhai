/**
 * Active Creator Boost — Activity Score
 *
 * Formula:
 *   uploadCount × 0.4
 * + likesReceived × 0.3
 * + forkCount × 0.2
 * + profileCompleteness × 0.1
 *
 * Follower count is NOT included.
 */

export interface ActivityScoreInput {
  uploadCount: number;
  likesReceived: number;
  forkCount: number;
  /** 0–100 scale */
  profileCompleteness: number;
}

export function calculateActivityScore(input: ActivityScoreInput): number {
  return (
    input.uploadCount * 0.4 +
    input.likesReceived * 0.3 +
    input.forkCount * 0.2 +
    input.profileCompleteness * 0.1
  );
}

/**
 * Profile completeness: 0–100
 * Fields: nickname (25), bio (25), website (25), avatar_url (25)
 */
export function calculateProfileCompleteness(profile: {
  nickname?: string | null;
  bio?: string | null;
  website?: string | null;
  avatar_url?: string | null;
}): number {
  let score = 0;
  if (profile.nickname) score += 25;
  if (profile.bio) score += 25;
  if (profile.website) score += 25;
  if (profile.avatar_url) score += 25;
  return score;
}
