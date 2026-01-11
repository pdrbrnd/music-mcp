import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logger.js';
import { getConfig } from '../config.js';
import { createMusicKitClient } from '../services/musickit-client.js';

export interface CatalogSearchInput {
  query: string;
  limit?: number;
}

export interface CatalogSearchOutput {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
  catalogAvailable: boolean;
}

export const catalogSearchTool: Tool = {
  name: 'search_apple_music_catalog',
  description: 'Search the full Apple Music catalog (100M+ songs) for tracks not in your library. Requires Apple Music API developer token to be configured.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (track name, artist, album, or combination)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 25, max: 50)',
        default: 25
      }
    },
    required: ['query']
  }
};

export async function handleCatalogSearch(input: CatalogSearchInput): Promise<CatalogSearchOutput> {
  logger.info({ query: input.query, limit: input.limit }, 'Searching Apple Music catalog');

  const config = getConfig();
  const musicKit = createMusicKitClient();

  // Check if MusicKit is configured
  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: 'Apple Music catalog search is not available. To enable it, set the APPLE_MUSIC_DEVELOPER_TOKEN environment variable. See documentation for setup instructions.',
      error: 'MusicKit not configured'
    };
  }

  try {
    const limit = Math.min(input.limit || 25, config.maxSearchResults);
    const tracks = await musicKit.searchCatalog(input.query, limit);

    if (tracks.length === 0) {
      return {
        success: true,
        catalogAvailable: true,
        data: [],
        message: `No tracks found in Apple Music catalog for query: "${input.query}"`
      };
    }

    // Format results
    const formattedTracks = tracks.map((track, index) => ({
      index: index + 1,
      id: track.id,
      name: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      duration: Math.round(track.attributes.durationInMillis / 1000),
      releaseDate: track.attributes.releaseDate,
      genres: track.attributes.genreNames,
      url: track.attributes.url,
      formatted: musicKit.formatTrack(track)
    }));

    return {
      success: true,
      catalogAvailable: true,
      data: {
        query: input.query,
        resultCount: tracks.length,
        tracks: formattedTracks
      },
      message: `Found ${tracks.length} track(s) in Apple Music catalog`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, query: input.query }, 'Catalog search failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Catalog search failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export interface AddCatalogTrackInput {
  trackId: string;
  addToLibrary?: boolean;
}

export interface AddCatalogTrackOutput {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
  addedToLibrary: boolean;
}

export const addCatalogTrackTool: Tool = {
  name: 'add_catalog_track_to_library',
  description: 'Add a track from the Apple Music catalog to your library. Requires both developer token and user token to be configured.',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: {
        type: 'string',
        description: 'Apple Music catalog track ID (from catalog search results)'
      },
      addToLibrary: {
        type: 'boolean',
        description: 'Whether to add to library (requires user token)',
        default: true
      }
    },
    required: ['trackId']
  }
};

export async function handleAddCatalogTrack(input: AddCatalogTrackInput): Promise<AddCatalogTrackOutput> {
  logger.info({ trackId: input.trackId }, 'Adding catalog track to library');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      addedToLibrary: false,
      message: 'Apple Music catalog access is not configured. Set APPLE_MUSIC_DEVELOPER_TOKEN environment variable.',
      error: 'MusicKit not configured'
    };
  }

  try {
    // Get track details first
    const track = await musicKit.getTrackById(input.trackId);

    if (!track) {
      return {
        success: false,
        addedToLibrary: false,
        message: `Track with ID "${input.trackId}" not found in catalog`,
        error: 'Track not found'
      };
    }

    // Try to add to library if requested
    if (input.addToLibrary !== false) {
      const result = await musicKit.addTrackToLibrary(input.trackId);

      if (!result.success) {
        return {
          success: false,
          addedToLibrary: false,
          message: result.message,
          error: result.message,
          data: {
            track: {
              id: track.id,
              name: track.attributes.name,
              artist: track.attributes.artistName,
              album: track.attributes.albumName
            },
            suggestion: 'If you don\'t have a user token configured, you can manually add this track to your library in the Music app, then use the playlist tools to add it to a playlist.'
          }
        };
      }

      return {
        success: true,
        addedToLibrary: true,
        message: `Successfully added "${track.attributes.name}" by ${track.attributes.artistName} to your library`,
        data: {
          trackId: track.id,
          name: track.attributes.name,
          artist: track.attributes.artistName,
          album: track.attributes.albumName
        }
      };
    }

    // Just return track info if not adding to library
    return {
      success: true,
      addedToLibrary: false,
      message: `Found track: "${track.attributes.name}" by ${track.attributes.artistName}`,
      data: {
        trackId: track.id,
        name: track.attributes.name,
        artist: track.attributes.artistName,
        album: track.attributes.albumName,
        url: track.attributes.url
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, trackId: input.trackId }, 'Failed to add catalog track');

    return {
      success: false,
      addedToLibrary: false,
      message: `Failed to add catalog track: ${errorMessage}`,
      error: errorMessage
    };
  }
}
