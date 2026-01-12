import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logger.js';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';
import { join } from 'path';

// ============================================================================
// 📚 LIBRARY TOOLS - Your Music Collection
// ============================================================================
// These tools access your local Apple Music library (no API keys needed)

export interface LibraryGetCurrentTrackInput {
  // No parameters needed
}

export interface LibrarySearchInput {
  query: string;
  type?: 'all' | 'track' | 'album' | 'artist';
  limit?: number;
}

export interface LibraryBrowseInput {
  type: 'tracks' | 'albums' | 'artists' | 'playlists';
  limit?: number;
}

export interface LibraryOutput {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const libraryGetCurrentTrackTool: Tool = {
  name: 'library_get_current_track',
  description: '📚 YOUR LIBRARY: Get information about the currently playing track',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const librarySearchTool: Tool = {
  name: 'library_search',
  description: '📚 YOUR LIBRARY: Search your music library for tracks, albums, or artists',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (track name, artist, album, etc.)'
      },
      type: {
        type: 'string',
        enum: ['all', 'track', 'album', 'artist'],
        description: 'Type of content to search for (default: all)',
        default: 'all'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 200,
        description: 'Maximum number of results to return (default: 50)',
        default: 50
      }
    },
    required: ['query']
  }
};

export const libraryBrowseTool: Tool = {
  name: 'library_browse',
  description: '📚 YOUR LIBRARY: Browse your music library by type (tracks, albums, artists, playlists)',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['tracks', 'albums', 'artists', 'playlists'],
        description: 'Type of content to browse'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        description: 'Maximum number of results to return (default: 100)',
        default: 100
      }
    },
    required: ['type']
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

export async function handleLibraryGetCurrentTrack(
  input: LibraryGetCurrentTrackInput
): Promise<LibraryOutput> {
  logger.info('Getting current track info');

  const config = getConfig();

  try {
    const result = await executeAppleScript(
      join(__dirname, '../scripts/library/get-current-track.applescript'),
      [],
      config.timeoutSeconds * 1000
    );

    if (result.startsWith('Error')) {
      return {
        success: false,
        message: result,
        error: result
      };
    }

    // Parse JSON result
    let data;
    try {
      data = JSON.parse(result);
    } catch {
      data = { raw: result };
    }

    return {
      success: true,
      data,
      message: data.title
        ? `Now playing: ${data.title} by ${data.artist}`
        : 'No track currently playing'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'Failed to get current track');
    return {
      success: false,
      message: `Failed to get current track: ${errorMessage}. Ensure Music app is running.`,
      error: errorMessage
    };
  }
}

export async function handleLibrarySearch(
  input: LibrarySearchInput
): Promise<LibraryOutput> {
  logger.info({ query: input.query, type: input.type }, 'Searching library');

  const config = getConfig();
  const limit = Math.min(input.limit || 50, config.maxSearchResults);

  try {
    if (!input.query.trim()) {
      return {
        success: false,
        message: 'Search query cannot be empty',
        error: 'Empty query'
      };
    }

    const searchType = input.type || 'all';
    let result: string;
    let data: any;

    switch (searchType) {
      case 'all':
      case 'track':
        // Search tracks
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/search-tracks.applescript'),
          [input.query],
          config.timeoutSeconds * 1000
        );

        if (result.startsWith('Error')) {
          return { success: false, message: result, error: result };
        }

        data = JSON.parse(result);
        data = Array.isArray(data) ? data.slice(0, limit) : data;
        break;

      case 'album':
        // Get all albums and filter
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/get-albums.applescript'),
          [],
          config.timeoutSeconds * 1000
        );

        if (result.startsWith('Error')) {
          return { success: false, message: result, error: result };
        }

        const albums = JSON.parse(result);
        data = albums.filter((album: any) =>
          album.album.toLowerCase().includes(input.query.toLowerCase()) ||
          album.artist.toLowerCase().includes(input.query.toLowerCase())
        ).slice(0, limit);
        break;

      case 'artist':
        // Get all albums and extract unique artists
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/get-albums.applescript'),
          [],
          config.timeoutSeconds * 1000
        );

        if (result.startsWith('Error')) {
          return { success: false, message: result, error: result };
        }

        const allAlbums = JSON.parse(result);
        const artistMap = new Map<string, any>();

        allAlbums.forEach((album: any) => {
          const artistLower = album.artist.toLowerCase();
          if (artistLower.includes(input.query.toLowerCase())) {
            if (!artistMap.has(album.artist)) {
              artistMap.set(album.artist, {
                artist: album.artist,
                albums: []
              });
            }
            artistMap.get(album.artist)!.albums.push(album.album);
          }
        });

        data = Array.from(artistMap.values()).slice(0, limit);
        break;

      default:
        return {
          success: false,
          message: `Unknown search type: ${searchType}`,
          error: 'Invalid search type'
        };
    }

    const resultCount = Array.isArray(data) ? data.length : 1;

    return {
      success: true,
      data,
      message: `Found ${resultCount} result(s) for "${input.query}"`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, query: input.query }, 'Library search failed');
    return {
      success: false,
      message: `Search failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handleLibraryBrowse(
  input: LibraryBrowseInput
): Promise<LibraryOutput> {
  logger.info({ type: input.type }, 'Browsing library');

  const config = getConfig();
  const limit = Math.min(input.limit || 100, 500);

  try {
    let result: string;
    let scriptName: string;

    switch (input.type) {
      case 'tracks':
        scriptName = 'search-tracks.applescript';
        // Search for empty string returns all tracks (up to AppleScript limit)
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/search-tracks.applescript'),
          [''], // Empty search returns all
          config.timeoutSeconds * 1000
        );
        break;

      case 'albums':
        scriptName = 'get-albums.applescript';
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/get-albums.applescript'),
          [],
          config.timeoutSeconds * 1000
        );
        break;

      case 'artists':
        scriptName = 'get-albums.applescript';
        // Get albums then extract unique artists
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/get-albums.applescript'),
          [],
          config.timeoutSeconds * 1000
        );

        if (!result.startsWith('Error')) {
          const albums = JSON.parse(result);
          const artistMap = new Map<string, any>();

          albums.forEach((album: any) => {
            if (!artistMap.has(album.artist)) {
              artistMap.set(album.artist, {
                artist: album.artist,
                albums: []
              });
            }
            artistMap.get(album.artist)!.albums.push(album.album);
          });

          const artists = Array.from(artistMap.values()).slice(0, limit);
          return {
            success: true,
            data: artists,
            message: `Found ${artists.length} artist(s) in your library`
          };
        }
        break;

      case 'playlists':
        scriptName = 'get-playlists.applescript';
        result = await executeAppleScript(
          join(__dirname, '../scripts/library/get-playlists.applescript'),
          [],
          config.timeoutSeconds * 1000
        );
        break;

      default:
        return {
          success: false,
          message: `Unknown browse type: ${input.type}`,
          error: 'Invalid browse type'
        };
    }

    if (result.startsWith('Error')) {
      return {
        success: false,
        message: result,
        error: result
      };
    }

    // Parse JSON result
    let data;
    try {
      data = JSON.parse(result);
      if (Array.isArray(data)) {
        data = data.slice(0, limit);
      }
    } catch {
      data = { raw: result };
    }

    const resultCount = Array.isArray(data) ? data.length : 1;

    return {
      success: true,
      data,
      message: `Found ${resultCount} ${input.type} in your library`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, type: input.type }, 'Library browse failed');
    return {
      success: false,
      message: `Browse failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function executeAppleScript(
  scriptPath: string,
  args: string[] = [],
  timeout: number = 30000
): Promise<string> {
  try {
    // Build the command with properly escaped arguments
    const quotedArgs = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
    const command = `osascript "${scriptPath}" ${quotedArgs}`;

    const result = execSync(command, {
      timeout,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return result.toString().trim();
  } catch (error: any) {
    if (error.code === 'TIMEOUT') {
      throw new Error(`AppleScript execution timed out after ${timeout}ms`);
    }
    throw new Error(`AppleScript execution failed: ${error.message}`);
  }
}
