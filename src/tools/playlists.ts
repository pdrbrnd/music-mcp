import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logger.js';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';
import { join } from 'path';

// ============================================================================
// 📚 PLAYLIST TOOLS - Your Music Organization
// ============================================================================
// These tools manage playlists using tracks from your library (no API keys)

export interface PlaylistCreateInput {
  name: string;
}

export interface PlaylistAddTracksInput {
  playlist_name: string;
  track_search_terms: string[];
}

export interface PlaylistRemoveTracksInput {
  playlist_name: string;
  track_search_terms: string[];
}

export interface PlaylistRenameInput {
  current_name: string;
  new_name: string;
}

export interface PlaylistDeleteInput {
  name: string;
}

export interface PlaylistGetTracksInput {
  name: string;
}

export interface PlaylistOutput {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const playlistCreateTool: Tool = {
  name: 'playlist_create',
  description: '📚 YOUR PLAYLISTS: Create a new empty playlist',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the new playlist'
      }
    },
    required: ['name']
  }
};

export const playlistAddTracksTool: Tool = {
  name: 'playlist_add_tracks',
  description: '📚 YOUR PLAYLISTS: Add tracks from your library to a playlist. Only works with tracks you already own.',
  inputSchema: {
    type: 'object',
    properties: {
      playlist_name: {
        type: 'string',
        description: 'Name of the playlist to add tracks to'
      },
      track_search_terms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of track search terms (e.g., ["Karma Police", "Paranoid Android"]). Tracks must be in your library.'
      }
    },
    required: ['playlist_name', 'track_search_terms']
  }
};

export const playlistRemoveTracksTool: Tool = {
  name: 'playlist_remove_tracks',
  description: '📚 YOUR PLAYLISTS: Remove tracks from a playlist',
  inputSchema: {
    type: 'object',
    properties: {
      playlist_name: {
        type: 'string',
        description: 'Name of the playlist to remove tracks from'
      },
      track_search_terms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of track search terms to remove'
      }
    },
    required: ['playlist_name', 'track_search_terms']
  }
};

export const playlistRenameTool: Tool = {
  name: 'playlist_rename',
  description: '📚 YOUR PLAYLISTS: Rename an existing playlist',
  inputSchema: {
    type: 'object',
    properties: {
      current_name: {
        type: 'string',
        description: 'Current name of the playlist'
      },
      new_name: {
        type: 'string',
        description: 'New name for the playlist'
      }
    },
    required: ['current_name', 'new_name']
  }
};

export const playlistDeleteTool: Tool = {
  name: 'playlist_delete',
  description: '📚 YOUR PLAYLISTS: Delete a playlist',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the playlist to delete'
      }
    },
    required: ['name']
  }
};

export const playlistGetTracksTool: Tool = {
  name: 'playlist_get_tracks',
  description: '📚 YOUR PLAYLISTS: Get all tracks in a playlist',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the playlist'
      }
    },
    required: ['name']
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

export async function handlePlaylistCreate(
  input: PlaylistCreateInput
): Promise<PlaylistOutput> {
  logger.info({ playlistName: input.name }, 'Creating playlist');

  const config = getConfig();

  try {
    const result = await executeAppleScript(
      join(__dirname, '../scripts/playlist/create-playlist.applescript'),
      [input.name],
      config.timeoutSeconds * 1000
    );

    if (result.startsWith('Error')) {
      return {
        success: false,
        message: result,
        error: result
      };
    }

    return {
      success: true,
      message: `Created playlist "${input.name}"`,
      data: { playlist_name: input.name }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, playlistName: input.name }, 'Failed to create playlist');
    return {
      success: false,
      message: `Failed to create playlist: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handlePlaylistAddTracks(
  input: PlaylistAddTracksInput
): Promise<PlaylistOutput> {
  logger.info(
    { playlistName: input.playlist_name, trackCount: input.track_search_terms.length },
    'Adding tracks to playlist'
  );

  const config = getConfig();
  const results: { track: string; success: boolean; message: string }[] = [];

  try {
    for (const trackTerm of input.track_search_terms) {
      try {
        const result = await executeAppleScript(
          join(__dirname, '../scripts/playlist/add-to-playlist-enhanced.applescript'),
          [input.playlist_name, trackTerm],
          config.timeoutSeconds * 1000
        );

        if (result.startsWith('Error')) {
          results.push({
            track: trackTerm,
            success: false,
            message: result
          });
        } else {
          results.push({
            track: trackTerm,
            success: true,
            message: result
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          track: trackTerm,
          success: false,
          message: errorMessage
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    let message = '';
    if (successCount > 0) {
      message += `Added ${successCount} track(s) to "${input.playlist_name}". `;
    }
    if (failCount > 0) {
      message += `${failCount} track(s) could not be added (not found in library or already in playlist).`;
    }

    return {
      success: successCount > 0,
      data: {
        playlist_name: input.playlist_name,
        results,
        added: successCount,
        failed: failCount
      },
      message: message.trim()
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, playlistName: input.playlist_name }, 'Failed to add tracks');
    return {
      success: false,
      message: `Failed to add tracks: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handlePlaylistRemoveTracks(
  input: PlaylistRemoveTracksInput
): Promise<PlaylistOutput> {
  logger.info(
    { playlistName: input.playlist_name, trackCount: input.track_search_terms.length },
    'Removing tracks from playlist'
  );

  const config = getConfig();
  const results: { track: string; success: boolean; message: string }[] = [];

  try {
    for (const trackTerm of input.track_search_terms) {
      try {
        const result = await executeAppleScript(
          join(__dirname, '../scripts/playlist/remove-from-playlist.applescript'),
          [input.playlist_name, trackTerm],
          config.timeoutSeconds * 1000
        );

        if (result.startsWith('Error')) {
          results.push({
            track: trackTerm,
            success: false,
            message: result
          });
        } else {
          results.push({
            track: trackTerm,
            success: true,
            message: result
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          track: trackTerm,
          success: false,
          message: errorMessage
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: successCount > 0,
      data: {
        playlist_name: input.playlist_name,
        results,
        removed: successCount,
        failed: failCount
      },
      message: `Removed ${successCount} track(s) from "${input.playlist_name}". ${failCount > 0 ? `${failCount} track(s) could not be removed.` : ''}`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, playlistName: input.playlist_name }, 'Failed to remove tracks');
    return {
      success: false,
      message: `Failed to remove tracks: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handlePlaylistRename(
  input: PlaylistRenameInput
): Promise<PlaylistOutput> {
  logger.info({ oldName: input.current_name, newName: input.new_name }, 'Renaming playlist');

  const config = getConfig();

  try {
    const result = await executeAppleScript(
      join(__dirname, '../scripts/playlist/rename-playlist.applescript'),
      [input.current_name, input.new_name],
      config.timeoutSeconds * 1000
    );

    if (result.startsWith('Error')) {
      return {
        success: false,
        message: result,
        error: result
      };
    }

    return {
      success: true,
      message: `Renamed playlist from "${input.current_name}" to "${input.new_name}"`,
      data: {
        old_name: input.current_name,
        new_name: input.new_name
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, oldName: input.current_name }, 'Failed to rename playlist');
    return {
      success: false,
      message: `Failed to rename playlist: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handlePlaylistDelete(
  input: PlaylistDeleteInput
): Promise<PlaylistOutput> {
  logger.info({ playlistName: input.name }, 'Deleting playlist');

  const config = getConfig();

  try {
    const result = await executeAppleScript(
      join(__dirname, '../scripts/playlist/delete-playlist.applescript'),
      [input.name],
      config.timeoutSeconds * 1000
    );

    if (result.startsWith('Error')) {
      return {
        success: false,
        message: result,
        error: result
      };
    }

    return {
      success: true,
      message: `Deleted playlist "${input.name}"`,
      data: { playlist_name: input.name }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, playlistName: input.name }, 'Failed to delete playlist');
    return {
      success: false,
      message: `Failed to delete playlist: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handlePlaylistGetTracks(
  input: PlaylistGetTracksInput
): Promise<PlaylistOutput> {
  logger.info({ playlistName: input.name }, 'Getting playlist tracks');

  const config = getConfig();

  try {
    const result = await executeAppleScript(
      join(__dirname, '../scripts/playlist/get-playlist-tracks.applescript'),
      [input.name],
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

    const trackCount = Array.isArray(data) ? data.length : 0;

    return {
      success: true,
      data: {
        playlist_name: input.name,
        track_count: trackCount,
        tracks: data
      },
      message: `Found ${trackCount} track(s) in playlist "${input.name}"`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, playlistName: input.name }, 'Failed to get playlist tracks');
    return {
      success: false,
      message: `Failed to get playlist tracks: ${errorMessage}`,
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
