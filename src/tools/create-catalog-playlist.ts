/**
 * Batch Catalog Search Tool
 *
 * Philosophy: Intentional Music Discovery
 * ========================================
 *
 * This tool is designed for INTENTIONAL listening, not bulk automation.
 * Instead of automatically adding tracks to your library, it:
 *
 * 1. Searches Apple Music catalog for multiple tracks
 * 2. Returns Apple Music URLs for each found track
 * 3. Lets YOU manually review, preview, and consciously add tracks
 *
 * Why this approach?
 * - Forces engagement with each track
 * - Builds awareness of artist, album, context
 * - Creates meaningful, curated playlists
 * - Avoids passive algorithmic consumption
 *
 * This is NOT a limitation - it's a feature that promotes mindful music curation.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../logger.js";
import { createMusicKitClient } from "../services/musickit-client.js";

// Helper to add delay between API calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface BatchCatalogSearchInput {
  tracks: Array<{
    track: string;
    artist: string;
  }>;
}

export interface BatchCatalogSearchOutput {
  success: boolean;
  message: string;
  data?: {
    found: Array<{
      requestedTrack: string;
      requestedArtist: string;
      catalogTrack: string;
      catalogArtist: string;
      catalogAlbum: string;
      url: string;
      catalogId: string;
    }>;
    notFound: Array<{
      track: string;
      artist: string;
    }>;
    summary: string;
  };
  error?: string;
}

export const batchCatalogSearchTool: Tool = {
  name: "batch_catalog_search",
  description:
    "Search Apple Music catalog for multiple tracks and get Apple Music URLs for manual review and addition. Returns a formatted list of tracks with their Apple Music URLs so you can preview and add them intentionally.",
  inputSchema: {
    type: "object",
    properties: {
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
        description: "Array of tracks to search for",
      },
    },
    required: ["tracks"],
  },
};

export async function handleBatchCatalogSearch(
  input: BatchCatalogSearchInput,
): Promise<BatchCatalogSearchOutput> {
  logger.info(
    { trackCount: input.tracks.length },
    "Batch searching catalog for tracks",
  );

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
    const found: Array<{
      requestedTrack: string;
      requestedArtist: string;
      catalogTrack: string;
      catalogArtist: string;
      catalogAlbum: string;
      url: string;
      catalogId: string;
    }> = [];
    const notFound: Array<{ track: string; artist: string }> = [];

    // Search for each track with delay to avoid rate limiting
    for (const { track, artist } of input.tracks) {
      try {
        const result = await musicKit.smartSearchTrack(track, artist);

        if (result) {
          found.push({
            requestedTrack: track,
            requestedArtist: artist,
            catalogTrack: result.attributes.name,
            catalogArtist: result.attributes.artistName,
            catalogAlbum: result.attributes.albumName,
            url: result.attributes.url || "",
            catalogId: result.id,
          });
          logger.info(
            { track, artist, catalogId: result.id },
            "Found track in catalog",
          );
        } else {
          notFound.push({ track, artist });
          logger.warn({ track, artist }, "Track not found in catalog");
        }

        // Small delay between searches to avoid rate limits
        await sleep(100);
      } catch (error) {
        logger.error({ error, track, artist }, "Failed to search for track");
        notFound.push({ track, artist });
      }
    }

    const summary = `Found ${found.length} of ${input.tracks.length} tracks in Apple Music catalog. ${notFound.length > 0 ? `${notFound.length} tracks could not be found.` : ""}`;

    return {
      success: true,
      message: summary,
      data: {
        found,
        notFound,
        summary,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, "Batch catalog search failed");

    return {
      success: false,
      message: `Batch catalog search failed: ${errorMessage}`,
      error: errorMessage,
    };
  }
}
