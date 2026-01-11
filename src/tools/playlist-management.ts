import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../logger.js";
import { getConfig } from "../config.js";
import { execSync } from "child_process";
import { join } from "path";
import { createMusicKitClient } from "../services/musickit-client.js";

export interface ManagePlaylistInput {
  action:
    | "create"
    | "add_track"
    | "remove_track"
    | "rename"
    | "delete"
    | "list"
    | "get_tracks"
    | "add_catalog_track";
  playlistName?: string; // required for most actions
  trackId?: string; // required for add/remove track (can be search term or catalog ID)
  newName?: string; // required for rename
  useCatalogSearch?: boolean; // if true, search catalog if not found in library
}

export interface PlaylistOutput {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

export const managePlaylistTool: Tool = {
  name: "manage_playlist",
  description:
    "Create and manage playlists. Can search both your library and the Apple Music catalog (if configured) to add tracks.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "create",
          "add_track",
          "remove_track",
          "rename",
          "delete",
          "list",
          "get_tracks",
          "add_catalog_track",
        ],
        description: "Action to perform on playlists",
      },
      playlistName: {
        type: "string",
        description: "Name of the playlist (required for most actions)",
      },
      trackId: {
        type: "string",
        description:
          "Track identifier or search term (required for add/remove track). For add_catalog_track, this should be the Apple Music catalog track ID.",
      },
      newName: {
        type: "string",
        description: "New name for the playlist (required for rename)",
      },
      useCatalogSearch: {
        type: "boolean",
        description:
          "If true, will search Apple Music catalog if track is not found in library (requires MusicKit configuration)",
        default: false,
      },
    },
    required: ["action"],
  },
};

export async function handleManagePlaylist(
  input: ManagePlaylistInput,
): Promise<PlaylistOutput> {
  logger.info(
    { action: input.action, playlistName: input.playlistName },
    "Managing playlist",
  );

  const config = getConfig();

  try {
    let result: string;

    switch (input.action) {
      case "list":
        result = await executeAppleScript(
          join(__dirname, "../scripts/library/get-playlists.applescript"),
          [],
          config.timeoutSeconds * 1000,
        );
        break;

      case "create":
        if (!input.playlistName) {
          return {
            success: false,
            message: "Playlist name is required for create action",
            error: "Missing playlist name",
          };
        }
        result = await executeAppleScript(
          join(__dirname, "../scripts/playlist/create-playlist.applescript"),
          [input.playlistName],
          config.timeoutSeconds * 1000,
        );
        break;

      case "add_track":
        if (!input.playlistName || !input.trackId) {
          return {
            success: false,
            message:
              "Playlist name and track ID/search term are required for add_track action",
            error: "Missing required parameters",
          };
        }

        // Use enhanced script that tries multiple search strategies
        result = await executeAppleScript(
          join(
            __dirname,
            "../scripts/playlist/add-to-playlist-enhanced.applescript",
          ),
          [input.playlistName, input.trackId],
          config.timeoutSeconds * 1000,
        );

        // If failed and catalog search is enabled, try catalog search
        if (
          result.startsWith("Error: No tracks found") &&
          input.useCatalogSearch
        ) {
          const catalogResult = await tryAddFromCatalog(
            input.playlistName,
            input.trackId,
            config,
          );
          if (catalogResult) {
            return catalogResult;
          }
        }
        break;

      case "add_catalog_track":
        if (!input.playlistName || !input.trackId) {
          return {
            success: false,
            message:
              "Playlist name and catalog track ID are required for add_catalog_track action",
            error: "Missing required parameters",
          };
        }

        // Add track from catalog to library, then add to playlist
        return await addCatalogTrackToPlaylist(
          input.playlistName,
          input.trackId,
          config,
        );

      case "get_tracks":
        if (!input.playlistName) {
          return {
            success: false,
            message: "Playlist name is required for get_tracks action",
            error: "Missing playlist name",
          };
        }
        result = await executeAppleScript(
          join(
            __dirname,
            "../scripts/playlist/get-playlist-tracks.applescript",
          ),
          [input.playlistName],
          config.timeoutSeconds * 1000,
        );
        break;

      case "remove_track":
        if (!input.playlistName || !input.trackId) {
          return {
            success: false,
            message:
              "Playlist name and track search term are required for remove_track action",
            error: "Missing required parameters",
          };
        }
        result = await executeAppleScript(
          join(
            __dirname,
            "../scripts/playlist/remove-from-playlist.applescript",
          ),
          [input.playlistName, input.trackId],
          config.timeoutSeconds * 1000,
        );
        break;

      case "rename":
        if (!input.playlistName || !input.newName) {
          return {
            success: false,
            message:
              "Current playlist name and new name are required for rename action",
            error: "Missing required parameters",
          };
        }
        // For rename, we'll use AppleScript to change the playlist name
        result = await executeAppleScript(
          join(__dirname, "../scripts/playlist/rename-playlist.applescript"),
          [input.playlistName, input.newName],
          config.timeoutSeconds * 1000,
        );
        break;

      case "delete":
        if (!input.playlistName) {
          return {
            success: false,
            message: "Playlist name is required for delete action",
            error: "Missing playlist name",
          };
        }
        // For delete, we'll use AppleScript to remove the playlist
        result = await executeAppleScript(
          join(__dirname, "../scripts/playlist/delete-playlist.applescript"),
          [input.playlistName],
          config.timeoutSeconds * 1000,
        );
        break;

      default:
        return {
          success: false,
          message: `Unknown action: ${input.action}`,
          error: "Invalid action",
        };
    }

    if (result.startsWith("Error")) {
      return {
        success: false,
        message: result,
        error: result,
      };
    }

    // Try to parse JSON result for list operations
    let data;
    if (input.action === "list" || input.action === "get_tracks") {
      try {
        data = JSON.parse(result);
      } catch {
        // If not JSON, return as string
        data = result;
      }
    } else {
      data = result;
    }

    return {
      success: true,
      data,
      message: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, action: input.action }, "Playlist management failed");
    return {
      success: false,
      message: `Playlist ${input.action} failed: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

async function executeAppleScript(
  scriptPath: string,
  args: string[] = [],
  timeout: number = 30000,
): Promise<string> {
  try {
    // Build the command with properly escaped arguments
    const quotedArgs = args
      .map((arg) => `"${arg.replace(/"/g, '\\"')}"`)
      .join(" ");
    const command = `osascript "${scriptPath}" ${quotedArgs}`;

    const result = execSync(command, {
      timeout,
      encoding: "utf8",
      stdio: "pipe",
    });

    return result.toString().trim();
  } catch (error: any) {
    if (error.code === "TIMEOUT") {
      throw new Error(`AppleScript execution timed out after ${timeout}ms`);
    }
    throw new Error(`AppleScript execution failed: ${error.message}`);
  }
}

/**
 * Try to add a track from the Apple Music catalog to a playlist
 */
async function tryAddFromCatalog(
  playlistName: string,
  searchTerm: string,
  config: any,
): Promise<PlaylistOutput | null> {
  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    logger.debug("MusicKit not configured, cannot search catalog");
    return null;
  }

  try {
    logger.info({ searchTerm }, "Searching Apple Music catalog for track");

    // Search catalog
    const tracks = await musicKit.searchCatalog(searchTerm, 5);

    if (tracks.length === 0) {
      return {
        success: false,
        message: `Track "${searchTerm}" not found in library or Apple Music catalog`,
        error: "Track not found",
      };
    }

    const bestMatch = tracks[0];
    logger.info(
      { trackId: bestMatch.id, trackName: bestMatch.attributes.name },
      "Found track in catalog",
    );

    // Try to add to library (requires user token)
    const addResult = await musicKit.addTrackToLibrary(bestMatch.id);

    if (!addResult.success) {
      return {
        success: false,
        message: `Found track in catalog but could not add to library: ${addResult.message}. Try using add_catalog_track_to_library tool first, or manually add the track to your library.`,
        error: addResult.message,
        data: {
          catalogTrack: {
            id: bestMatch.id,
            name: bestMatch.attributes.name,
            artist: bestMatch.attributes.artistName,
            album: bestMatch.attributes.albumName,
          },
        },
      };
    }

    // Wait a moment for the library to sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Now try to add to playlist using various search terms
    const searchTerms = musicKit.getLibrarySearchTerms(bestMatch);

    for (const term of searchTerms) {
      try {
        const result = await executeAppleScript(
          join(
            __dirname,
            "../scripts/playlist/add-to-playlist-enhanced.applescript",
          ),
          [playlistName, term],
          config.timeoutSeconds * 1000,
        );

        if (!result.startsWith("Error")) {
          return {
            success: true,
            message: `Added "${bestMatch.attributes.name}" by ${bestMatch.attributes.artistName} to playlist "${playlistName}" (found in Apple Music catalog)`,
            data: {
              trackName: bestMatch.attributes.name,
              artistName: bestMatch.attributes.artistName,
              albumName: bestMatch.attributes.albumName,
              fromCatalog: true,
            },
          };
        }
      } catch (error) {
        logger.debug({ error, term }, "Failed to add with search term");
        continue;
      }
    }

    return {
      success: false,
      message: `Track was added to your library but could not be added to playlist. Try again in a few moments to allow library sync.`,
      error: "Sync delay",
      data: {
        trackAdded: true,
        playlistAddFailed: true,
        suggestion:
          "The track is now in your library. Try the add_track action again in a few seconds.",
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, searchTerm }, "Catalog search failed");
    return null;
  }
}

/**
 * Add a catalog track (by ID) to a playlist
 */
async function addCatalogTrackToPlaylist(
  playlistName: string,
  catalogTrackId: string,
  config: any,
): Promise<PlaylistOutput> {
  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      message:
        "Apple Music catalog access is not configured. Set APPLE_MUSIC_DEVELOPER_TOKEN environment variable.",
      error: "MusicKit not configured",
    };
  }

  try {
    // Get track details
    const track = await musicKit.getTrackById(catalogTrackId);

    if (!track) {
      return {
        success: false,
        message: `Track with ID "${catalogTrackId}" not found in catalog`,
        error: "Track not found",
      };
    }

    // Add to library
    const addResult = await musicKit.addTrackToLibrary(catalogTrackId);

    if (!addResult.success) {
      return {
        success: false,
        message: `Cannot add track to playlist: ${addResult.message}`,
        error: addResult.message,
        data: {
          trackInfo: {
            id: track.id,
            name: track.attributes.name,
            artist: track.attributes.artistName,
          },
        },
      };
    }

    // Wait for sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to add to playlist
    const searchTerms = musicKit.getLibrarySearchTerms(track);

    for (const term of searchTerms) {
      try {
        const result = await executeAppleScript(
          join(
            __dirname,
            "../scripts/playlist/add-to-playlist-enhanced.applescript",
          ),
          [playlistName, term],
          config.timeoutSeconds * 1000,
        );

        if (!result.startsWith("Error")) {
          return {
            success: true,
            message: `Successfully added "${track.attributes.name}" by ${track.attributes.artistName} to playlist "${playlistName}"`,
            data: {
              trackName: track.attributes.name,
              artistName: track.attributes.artistName,
              albumName: track.attributes.albumName,
              catalogId: catalogTrackId,
            },
          };
        }
      } catch (error) {
        continue;
      }
    }

    return {
      success: false,
      message: `Track added to library but failed to add to playlist. Try again in a few moments.`,
      error: "Playlist add failed",
      data: {
        trackAddedToLibrary: true,
        suggestion:
          "The track is in your library now. Try using add_track action again in a few seconds.",
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, catalogTrackId },
      "Failed to add catalog track to playlist",
    );

    return {
      success: false,
      message: `Failed to add catalog track: ${errorMessage}`,
      error: errorMessage,
    };
  }
}
