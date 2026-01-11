import { logger } from '../logger.js';

export interface MusicKitConfig {
  developerToken?: string;
  userToken?: string;
}

export interface CatalogTrack {
  id: string;
  type: 'songs';
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    releaseDate?: string;
    genreNames: string[];
    isrc?: string;
    url?: string;
  };
}

export interface CatalogSearchResult {
  results: {
    songs?: {
      data: CatalogTrack[];
    };
  };
}

export interface AddToLibraryResult {
  success: boolean;
  message: string;
  trackId?: string;
}

/**
 * MusicKit API client for searching Apple Music catalog
 * Requires a valid Apple Music API developer token
 * See: https://developer.apple.com/documentation/applemusicapi
 */
export class MusicKitClient {
  private developerToken?: string;
  private userToken?: string;
  private readonly baseUrl = 'https://api.music.apple.com/v1';
  private readonly storefront = 'us'; // Default to US, can be made configurable

  constructor(config: MusicKitConfig) {
    this.developerToken = config.developerToken;
    this.userToken = config.userToken;
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!this.developerToken;
  }

  /**
   * Search the Apple Music catalog for tracks
   * @param query Search query string
   * @param limit Maximum number of results (default: 25)
   * @returns Array of catalog tracks
   */
  async searchCatalog(query: string, limit: number = 25): Promise<CatalogTrack[]> {
    if (!this.developerToken) {
      throw new Error('MusicKit developer token not configured. Set APPLE_MUSIC_DEVELOPER_TOKEN environment variable.');
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/catalog/${this.storefront}/search?term=${encodedQuery}&types=songs&limit=${limit}`;

      logger.debug({ query, limit }, 'Searching Apple Music catalog');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': this.userToken || '',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apple Music API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: CatalogSearchResult = await response.json();
      const tracks = data.results.songs?.data || [];

      logger.info({ query, resultCount: tracks.length }, 'Catalog search completed');

      return tracks;
    } catch (error) {
      logger.error({ error, query }, 'Catalog search failed');
      throw error;
    }
  }

  /**
   * Get track details by ID
   * @param trackId Apple Music catalog track ID
   * @returns Track details
   */
  async getTrackById(trackId: string): Promise<CatalogTrack | null> {
    if (!this.developerToken) {
      throw new Error('MusicKit developer token not configured');
    }

    try {
      const url = `${this.baseUrl}/catalog/${this.storefront}/songs/${trackId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': this.userToken || '',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Apple Music API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.[0] || null;
    } catch (error) {
      logger.error({ error, trackId }, 'Failed to get track by ID');
      throw error;
    }
  }

  /**
   * Add a track to the user's library
   * Note: This requires a user token (user must be authenticated)
   * @param trackId Apple Music catalog track ID
   * @returns Result of the add operation
   */
  async addTrackToLibrary(trackId: string): Promise<AddToLibraryResult> {
    if (!this.developerToken) {
      return {
        success: false,
        message: 'MusicKit developer token not configured',
      };
    }

    if (!this.userToken) {
      return {
        success: false,
        message: 'User token required to add tracks to library. User must authenticate with Apple Music.',
      };
    }

    try {
      const url = `${this.baseUrl}/me/library?ids[songs]=${trackId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': this.userToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Failed to add track to library: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      logger.info({ trackId }, 'Track added to library');

      return {
        success: true,
        message: 'Track added to library successfully',
        trackId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, trackId }, 'Failed to add track to library');
      return {
        success: false,
        message: `Error adding track to library: ${errorMessage}`,
      };
    }
  }

  /**
   * Format track information for display
   * @param track Catalog track
   * @returns Formatted string
   */
  formatTrack(track: CatalogTrack): string {
    const duration = Math.round(track.attributes.durationInMillis / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return `${track.attributes.name} - ${track.attributes.artistName} (${track.attributes.albumName}) [${durationStr}]`;
  }

  /**
   * Get a search term that's more likely to match in the local library
   * Tries various combinations to find the track
   * @param track Catalog track
   * @returns Array of search terms to try
   */
  getLibrarySearchTerms(track: CatalogTrack): string[] {
    const { name, artistName, albumName } = track.attributes;
    return [
      name, // Just the track name
      `${name} ${artistName}`, // Track + artist
      `${artistName} ${name}`, // Artist + track
      `${name} ${albumName}`, // Track + album
    ];
  }
}

/**
 * Create a MusicKit client from environment variables
 */
export function createMusicKitClient(): MusicKitClient {
  const config: MusicKitConfig = {
    developerToken: process.env.APPLE_MUSIC_DEVELOPER_TOKEN,
    userToken: process.env.APPLE_MUSIC_USER_TOKEN,
  };

  return new MusicKitClient(config);
}
