// Utility functions for Mitype

/**
 * Calculate compatibility score between two users
 * based on their shared creative categories
 */
export function calculateCompatibility(
    myCategories: string[],
    theirCategories: string[]
  ): number {
    if (!myCategories?.length || !theirCategories?.length) return 0;
  
    // Find shared categories
    const shared = myCategories.filter((cat) =>
      theirCategories.includes(cat)
    );
  
    // Calculate score based on shared categories
    const totalUnique = new Set([...myCategories, ...theirCategories]).size;
    const score = Math.round((shared.length / totalUnique) * 100);
  
    return score;
  }
  
  /**
   * Get shared categories between two users
   */
  export function getSharedCategories(
    myCategories: string[],
    theirCategories: string[]
  ): string[] {
    if (!myCategories?.length || !theirCategories?.length) return [];
    return myCategories.filter((cat) => theirCategories.includes(cat));
  }
  
  /**
   * Get compatibility label based on score
   */
  export function getCompatibilityLabel(score: number): string {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Great Match';
    if (score >= 40) return 'Good Match';
    if (score >= 20) return 'Some Common Ground';
    return 'Different Vibes';
  }
  
  /**
   * Get compatibility color based on score
   */
  export function getCompatibilityColor(score: number): string {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#c8956c'; // brand tan
    if (score >= 40) return '#f59e0b'; // amber
    if (score >= 20) return '#94a3b8'; // slate
    return '#94a3b8';
  }

  /**
   * Compact relative-time formatter — "just now", "5m ago", "2h ago",
   * "3d ago", "2w ago", or a localized date for older timestamps.
   */
  export function formatRelativeTime(iso: string | null | undefined): string {
    if (!iso) return '';
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return '';
    const ms = Date.now() - ts;
    if (ms < 0) return 'just now';
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    const wk = Math.floor(day / 7);
    if (wk < 4) return `${wk}w ago`;
    return new Date(iso).toLocaleDateString();
  }