import { logger } from "../logger.js";
import { OAuthHandler } from "./oauth-handler.js";

export interface MusicKitConfig {
  developerToken?: string;
  userToken?: string;
}

export interface CatalogTrack {
  id: string;
  type: "songs";
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
  trackIds?: string[];
}

export interface CreatePlaylistResult {
  success: boolean;
  message: string;
  playlistId?: string;
  playlistName?: string;
}

/**
 * MusicKit API client for searching Apple Music catalog
 * Requires a valid Apple Music API developer token
 * See: https://developer.apple.com/documentation/applemusicapi
 */
export class MusicKitClient {
  private developerToken?: string;
  private userToken?: string;
  private readonly baseUrl = "https://api.music.apple.com/v1";
  private readonly storefront = "us"; // Default to US, can be made configurable

  constructor(config: MusicKitConfig) {
    this.developerToken = config.developerToken;
    this.userToken = config.userToken;

    // If no user token provided, try to load from OAuth handler
    if (!this.userToken && this.developerToken) {
      const oauthHandler = new OAuthHandler(this.developerToken);
      this.userToken = oauthHandler.getUserToken() || undefined;
    }
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
  async searchCatalog(
    query: string,
    limit: number = 25,
  ): Promise<CatalogTrack[]> {
    if (!this.developerToken) {
      throw new Error(
        "MusicKit developer token not configured. Set APPLE_MUSIC_DEVELOPER_TOKEN environment variable.",
      );
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/catalog/${this.storefront}/search?term=${encodedQuery}&types=songs&limit=${limit}`;

      logger.debug({ query, limit }, "Searching Apple Music catalog");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          "Music-User-Token": this.userToken || "",
        },
      });

      logger.debug(
        { status: response.status, query, url },
        "Apple Music API response",
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            query,
            errorText,
          },
          "Apple Music API returned error",
        );
        throw new Error(
          `Apple Music API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data: CatalogSearchResult = await response.json();

      logger.debug(
        {
          query,
          totalResults: data.results.songs?.data?.length || 0,
          hasResults: !!data.results.songs,
        },
        "Parsed API response",
      );
      const tracks = data.results.songs?.data || [];

      logger.info(
        { query, resultCount: tracks.length },
        "Catalog search completed",
      );

      return tracks;
    } catch (error) {
      logger.error({ error, query }, "Catalog search failed");
      throw error;
    }
  }

  /**
   * Smart search for a track with fuzzy matching
   * Tries multiple query formats and returns best match
   * @param trackName Track name
   * @param artistName Artist name (optional)
   * @returns Best matching track or null
   */
  async smartSearchTrack(
    trackName: string,
    artistName?: string,
  ): Promise<CatalogTrack | null> {
    // Normalize inputs to handle accented characters
    const normalizedTrack = this.normalizeString(trackName);
    const normalizedArtist = artistName
      ? this.normalizeString(artistName)
      : undefined;

    // Try multiple query formats with both original and normalized versions
    const queries: string[] = [];

    if (artistName && normalizedArtist) {
      // Try normalized versions first (better for API)
      queries.push(`${normalizedTrack} ${normalizedArtist}`);
      queries.push(`${normalizedArtist} ${normalizedTrack}`);
      queries.push(normalizedTrack);
      queries.push(normalizedArtist);
      // Try original versions as fallback
      if (normalizedTrack !== trackName || normalizedArtist !== artistName) {
        queries.push(`${trackName} ${artistName}`);
        queries.push(`${artistName} ${trackName}`);
        queries.push(trackName);
        queries.push(artistName);
      }
    } else {
      queries.push(normalizedTrack);
      if (normalizedTrack !== trackName) {
        queries.push(trackName);
      }
    }

    for (const query of queries) {
      try {
        logger.info(
          { query, trackName, artistName },
          "Attempting catalog search",
        );
        const results = await this.searchCatalog(query, 10);

        if (results.length === 0) {
          logger.warn(
            { query, trackName, artistName },
            "Search returned 0 results",
          );
          continue;
        }

        logger.info(
          {
            query,
            resultCount: results.length,
            firstResult: results[0].attributes.name,
          },
          "Got search results",
        );

        // Score and find best match
        const scoredResults = results.map((track) => ({
          track,
          score: this.scoreTrackMatch(track, trackName, artistName),
        }));

        // Sort by score descending
        scoredResults.sort((a, b) => b.score - a.score);

        logger.info(
          {
            query,
            bestScore: scoredResults[0].score,
            bestMatch: `${scoredResults[0].track.attributes.name} - ${scoredResults[0].track.attributes.artistName}`,
            top3Scores: scoredResults.slice(0, 3).map((r) => ({
              name: r.track.attributes.name,
              artist: r.track.attributes.artistName,
              score: r.score,
            })),
          },
          "Scored results",
        );

        // Return best match if score is decent
        if (scoredResults[0].score >= 0.4) {
          logger.info(
            {
              query,
              trackName: scoredResults[0].track.attributes.name,
              artistName: scoredResults[0].track.attributes.artistName,
              score: scoredResults[0].score,
            },
            "✅ Found matching track",
          );
          return scoredResults[0].track;
        } else {
          logger.warn(
            {
              query,
              bestScore: scoredResults[0].score,
              threshold: 0.4,
            },
            "Best match below threshold",
          );
        }
      } catch (error) {
        logger.error(
          { error, query, trackName, artistName },
          "❌ Search attempt failed with error",
        );
        continue;
      }
    }

    logger.error(
      { trackName, artistName, attemptedQueries: queries },
      "❌ No matching track found after all attempts",
    );
    return null;
  }

  /**
   * Score how well a track matches the search criteria
   * @param track Catalog track to score
   * @param targetTrack Target track name
   * @param targetArtist Target artist name (optional)
   * @returns Score between 0 and 1
   */
  private scoreTrackMatch(
    track: CatalogTrack,
    targetTrack: string,
    targetArtist?: string,
  ): number {
    let score = 0;

    const trackName = track.attributes.name.toLowerCase();
    const artistName = track.attributes.artistName.toLowerCase();
    const targetTrackLower = targetTrack.toLowerCase();
    const targetArtistLower = targetArtist?.toLowerCase() || "";

    // Exact match = high score
    if (trackName === targetTrackLower) {
      score += 0.5;
    } else if (
      trackName.includes(targetTrackLower) ||
      targetTrackLower.includes(trackName)
    ) {
      score += 0.3;
    } else if (this.fuzzyMatch(trackName, targetTrackLower)) {
      score += 0.2;
    }

    // Artist matching (if provided)
    if (targetArtist) {
      if (artistName === targetArtistLower) {
        score += 0.5;
      } else if (
        artistName.includes(targetArtistLower) ||
        targetArtistLower.includes(artistName)
      ) {
        score += 0.3;
      } else if (this.fuzzyMatch(artistName, targetArtistLower)) {
        score += 0.1;
      }
    } else {
      // No artist specified, give partial score
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Normalize string by removing accents and special characters
   */
  private normalizeString(str: string): string {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /**
   * Simple fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    // Remove common noise words and punctuation
    const clean = (s: string) =>
      s
        .replace(/[^\w\s]/g, "")
        .replace(/\b(the|a|an|feat|ft|featuring)\b/gi, "")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 2);

    const words1 = clean(str1);
    const words2 = clean(str2);

    // Check if most words match
    const matches = words1.filter((w1) =>
      words2.some((w2) => w2.includes(w1) || w1.includes(w2)),
    ).length;

    return matches >= Math.min(words1.length, words2.length) * 0.6;
  }
  /**
   * Get track details by ID
   * @param trackId Apple Music catalog track ID
   * @returns Track details
   */
  async getTrackById(trackId: string): Promise<CatalogTrack | null> {
    if (!this.developerToken) {
      throw new Error("MusicKit developer token not configured");
    }

    try {
      const url = `${this.baseUrl}/catalog/${this.storefront}/songs/${trackId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          "Music-User-Token": this.userToken || "",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(
          `Apple Music API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.data?.[0] || null;
    } catch (error) {
      logger.error({ error, trackId }, "Failed to get track by ID");
      throw error;
    }
  }

  /**
   * Add multiple tracks to the user's library in one API call
   * Note: This requires a user token (user must be authenticated)
   * @param trackIds Array of Apple Music catalog track IDs
   * @returns Result of the batch add operation
   */
  async addTracksToLibrary(trackIds: string[]): Promise<AddToLibraryResult> {
    if (!this.developerToken) {
      return {
        success: false,
        message: "MusicKit developer token not configured",
      };
    }

    if (!this.userToken) {
      return {
        success: false,
        message:
          "User token required to add tracks to library. User must authenticate with Apple Music.",
      };
    }

    if (trackIds.length === 0) {
      return {
        success: true,
        message: "No tracks to add",
        trackIds: [],
      };
    }

    try {
      // Apple Music API supports comma-separated track IDs
      const ids = trackIds.join(",");
      const url = `${this.baseUrl}/me/library?ids[songs]=${ids}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          "Music-User-Token": this.userToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Failed to add tracks to library: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      logger.info({ count: trackIds.length }, "Tracks added to library");

      return {
        success: true,
        message: `Successfully added ${trackIds.length} track(s) to library`,
        trackIds,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        { error, count: trackIds.length },
        "Failed to add tracks to library",
      );
      return {
        success: false,
        message: `Error adding tracks to library: ${errorMessage}`,
      };
    }
  }

  /**
   * Add a single track to the user's library
   * Note: This requires a user token (user must be authenticated)
   * @param trackId Apple Music catalog track ID
   * @returns Result of the add operation
   */
  async addTrackToLibrary(trackId: string): Promise<AddToLibraryResult> {
    if (!this.developerToken) {
      return {
        success: false,
        message: "MusicKit developer token not configured",
      };
    }

    if (!this.userToken) {
      return {
        success: false,
        message:
          "User token required to add tracks to library. User must authenticate with Apple Music.",
      };
    }

    try {
      const url = `${this.baseUrl}/me/library?ids[songs]=${trackId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          "Music-User-Token": this.userToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Failed to add track to library: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      logger.info({ trackId }, "Track added to library");

      return {
        success: true,
        message: "Track added to library successfully",
        trackId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error({ error, trackId }, "Failed to add track to library");
      return {
        success: false,
        message: `Error adding track to library: ${errorMessage}`,
      };
    }
  }

  /**
   * Create a playlist with tracks in one API call
   * Note: This requires a user token (user must be authenticated)
   * @param name Playlist name
   * @param trackIds Array of catalog track IDs to add
   * @param description Optional playlist description
   * @returns Result of the create operation
   */
  async createPlaylistWithTracks(
    name: string,
    trackIds: string[],
    description?: string,
  ): Promise<CreatePlaylistResult> {
    if (!this.developerToken) {
      return {
        success: false,
        message: "MusicKit developer token not configured",
      };
    }

    if (!this.userToken) {
      return {
        success: false,
        message:
          "User token required to create playlists. User must authenticate with Apple Music.",
      };
    }

    try {
      const url = `${this.baseUrl}/me/library/playlists`;

      // Build tracks array for the playlist
      const tracks = trackIds.map((id) => ({
        id,
        type: "songs",
      }));

      const body = {
        attributes: {
          name,
          description: description || "",
        },
        relationships: {
          tracks: {
            data: tracks,
          },
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          "Music-User-Token": this.userToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Failed to create playlist: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      const data = await response.json();
      const playlistId = data.data?.[0]?.id;

      logger.info(
        { playlistId, name, trackCount: trackIds.length },
        "Playlist created with tracks",
      );

      return {
        success: true,
        message: `Successfully created playlist "${name}" with ${trackIds.length} track(s)`,
        playlistId,
        playlistName: name,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        { error, name, trackCount: trackIds.length },
        "Failed to create playlist",
      );
      return {
        success: false,
        message: `Error creating playlist: ${errorMessage}`,
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
    const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

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
