import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../logger.js";
import { createMusicKitClient } from "../services/musickit-client.js";

// Helper to add delay between API calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CreateCatalogPlaylistInput {
  playlistName: string;
  tracks: Array<{
    track: string;
    artist: string;
  }>;
  description?: string;
}

export interface CreateCatalogPlaylistOutput {
  success: boolean;
  message: string;
  data?: {
    playlistId?: string;
    playlistName: string;
    tracksAdded: number;
    tracksNotFound: Array<{ track: string; artist: string }>;
  };
  error?: string;
}

export const createCatalogPlaylistTool: Tool = {
  name: "create_catalog_playlist",
  description:
    "Create a playlist with tracks from Apple Music catalog in one efficient operation. Searches for multiple tracks, adds them to library, and creates the playlist - all optimized for batch processing. Requires user authorization.",
  inputSchema: {
    type: "object",
    properties: {
      playlistName: {
        type: "string",
        description: "Name of the playlist to create",
      },
      tracks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            track: {
              type: "string",
              description: "Track name",
            },
            artist: {
              type: "string",
              description: "Artist name",
            },
          },
          required: ["track", "artist"],
        },
        description: "Array of tracks with explicit track and artist names",
      },
      description: {
        type: "string",
        description: "Optional playlist description",
      },
    },
    required: ["playlistName", "tracks"],
  },
};

export async function handleCreateCatalogPlaylist(
  input: CreateCatalogPlaylistInput,
): Promise<CreateCatalogPlaylistOutput> {
  logger.info(
    { playlistName: input.playlistName, trackCount: input.tracks.length },
    "Creating catalog playlist",
  );

  const musicKit = createMusicKitClient();

  // Check if MusicKit is configured
  if (!musicKit.isConfigured()) {
    return {
      success: false,
      message:
        "Apple Music catalog access is not configured. Set APPLE_MUSIC_DEVELOPER_TOKEN environment variable.",
      error: "MusicKit not configured",
    };
  }

  try {
    // Step 1: Search for all tracks using smart search
    logger.info(
      "Searching for tracks in catalog with structured track/artist data",
    );

    // Search tracks sequentially with delay to avoid rate limiting
    const searchResults: (typeof musicKit.smartSearchTrack extends (
      ...args: any[]
    ) => Promise<infer T>
      ? T
      : never)[] = [];

    for (const { track, artist } of input.tracks) {
      try {
        const result = await musicKit.smartSearchTrack(track, artist);
        searchResults.push(result);
        // 100ms delay between searches to avoid rate limits
        await sleep(100);
      } catch (error) {
        logger.error({ error, track, artist }, "Failed to search for track");
        searchResults.push(null);
      }
    }

    // Extract found tracks
    const foundTracks: {
      id: string;
      name: string;
      artist: string;
      requestedTrack: string;
      requestedArtist: string;
    }[] = [];
    const notFoundTracks: Array<{ track: string; artist: string }> = [];

    searchResults.forEach((track, index) => {
      if (track) {
        foundTracks.push({
          id: track.id,
          name: track.attributes.name,
          artist: track.attributes.artistName,
          requestedTrack: input.tracks[index].track,
          requestedArtist: input.tracks[index].artist,
        });
      } else {
        notFoundTracks.push(input.tracks[index]);
      }
    });

    if (foundTracks.length === 0) {
      return {
        success: false,
        message: "No tracks found in catalog for any of the search queries",
        error: "No tracks found",
        data: {
          playlistName: input.playlistName,
          tracksAdded: 0,
          tracksNotFound: notFoundTracks,
        },
      };
    }

    logger.info(
      { foundCount: foundTracks.length, notFoundCount: notFoundTracks.length },
      "Track search completed",
    );

    // Step 2: Add all tracks to library in one batch
    const trackIds = foundTracks.map((t) => t.id);
    logger.info({ count: trackIds.length }, "Adding tracks to library");

    const addResult = await musicKit.addTracksToLibrary(trackIds);

    if (!addResult.success) {
      return {
        success: false,
        message: `Found tracks but failed to add to library: ${addResult.message}`,
        error: addResult.message,
        data: {
          playlistName: input.playlistName,
          tracksAdded: 0,
          tracksNotFound: notFoundTracks,
        },
      };
    }

    // Step 3: Get library IDs from catalog IDs
    logger.info("Mapping catalog IDs to library IDs");
    const libraryIds: string[] = [];
    const failedToMap: Array<{ track: string; artist: string }> = [];

    for (const foundTrack of foundTracks) {
      const libraryTrack = await musicKit.getLibraryTrackByCatalogId(
        foundTrack.id,
      );

      if (libraryTrack && libraryTrack.id) {
        libraryIds.push(libraryTrack.id);
        logger.info(
          {
            track: foundTrack.name,
            artist: foundTrack.artist,
            catalogId: foundTrack.id,
            libraryId: libraryTrack.id,
          },
          "Mapped catalog ID to library ID",
        );
      } else {
        failedToMap.push({
          track: foundTrack.requestedTrack,
          artist: foundTrack.requestedArtist,
        });
        logger.warn(
          { track: foundTrack.name, artist: foundTrack.artist },
          "Failed to get library ID for catalog track",
        );
      }

      await sleep(100);
    }

    if (libraryIds.length === 0) {
      return {
        success: false,
        message: "No library IDs found for catalog tracks",
        error: "Library mapping failed",
        data: {
          playlistName: input.playlistName,
          tracksAdded: 0,
          tracksNotFound: [...notFoundTracks, ...failedToMap],
        },
      };
    }

    // Step 4: Create playlist with library track IDs
    logger.info(
      { count: libraryIds.length },
      "Creating playlist with library track IDs",
    );

    const createResult = await musicKit.createPlaylistWithTracks(
      input.playlistName,
      libraryIds,
      input.description,
    );

    if (!createResult.success) {
      return {
        success: false,
        message: `Tracks added to library but failed to create playlist: ${createResult.message}`,
        error: createResult.message,
        data: {
          playlistName: input.playlistName,
          tracksAdded: 0,
          tracksNotFound: [...notFoundTracks, ...failedToMap],
        },
      };
    }

    // Success!
    const totalNotFound = [...notFoundTracks, ...failedToMap];
    const successMessage =
      totalNotFound.length > 0
        ? `Created playlist "${input.playlistName}" with ${libraryIds.length} track(s). ${totalNotFound.length} track(s) could not be added.`
        : `Successfully created playlist "${input.playlistName}" with ${libraryIds.length} track(s)`;

    return {
      success: true,
      message: successMessage,
      data: {
        playlistId: createResult.playlistId,
        playlistName: input.playlistName,
        tracksAdded: libraryIds.length,
        tracksNotFound: totalNotFound,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, playlistName: input.playlistName },
      "Failed to create catalog playlist",
    );

    return {
      success: false,
      message: `Failed to create playlist: ${errorMessage}`,
      error: errorMessage,
    };
  }
}
