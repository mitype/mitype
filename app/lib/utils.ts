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