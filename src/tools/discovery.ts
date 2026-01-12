import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../logger.js";
import { createMusicKitClient } from "../services/musickit-client.js";

// ============================================================================
// 🎵 DISCOVERY TOOLS - Apple Music Catalog Search
// ============================================================================
// These tools search Apple Music's catalog for tracks YOU specify.
// Claude should generate recommendations based on your taste, then use these
// tools to find those tracks in Apple Music's catalog.
//
// WORKFLOW:
// 1. Claude generates track/artist recommendations based on your taste
// 2. Claude uses discover_search_catalog to find each track in Apple Music
// 3. Claude presents formatted results with Apple Music IDs and preview links
// 4. You preview and decide what to add to your library

export interface DiscoverSearchCatalogInput {
  query: string;
  limit?: number;
}

export interface DiscoverCheckLibraryStatusInput {
  catalog_track_ids: string[];
}

export interface DiscoveryOutput {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
  catalogAvailable: boolean;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const discoverSearchCatalogTool: Tool = {
  name: "discover_search_catalog",
  description: `Search Apple Music's catalog for specific tracks, albums, or artists.

Use this AFTER generating recommendations based on your knowledge of the user's taste.

Example workflow:
1. User asks: "recommend microhouse tracks for focusing"
2. You generate recommendations: "Villalobos - Fizheuer Zieheuer", "Ricardo Villalobos - Dexter", etc.
3. You call this tool for each track to find it in Apple Music
4. You present formatted results with preview links and IDs

Returns: Track details with Apple Music catalog IDs and preview URLs`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          'Search query - artist name, track name, or "artist - track" format',
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 50,
        description: "Maximum number of results to return",
        default: 5,
      },
    },
    required: ["query"],
  },
};

export const discoverCheckLibraryStatusTool: Tool = {
  name: "discover_check_library_status",
  description:
    "Check which catalog tracks are already in the user's library. Useful after searching to avoid recommending tracks they already have.",
  inputSchema: {
    type: "object",
    properties: {
      catalog_track_ids: {
        type: "array",
        items: { type: "string" },
        description: "Array of Apple Music catalog track IDs to check",
      },
    },
    required: ["catalog_track_ids"],
  },
};

// ============================================================================
// Tool Handlers
// ============================================================================

export async function handleDiscoverSearchCatalog(
  input: DiscoverSearchCatalogInput,
): Promise<DiscoveryOutput> {
  logger.info({ query: input.query }, "Searching Apple Music catalog");

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message:
        "🎵 CATALOG SEARCH: Not Available\n\nRequires Apple Music API configuration (APPLE_MUSIC_DEVELOPER_TOKEN and APPLE_MUSIC_STOREFRONT).",
      error: "MusicKit not configured",
    };
  }

  try {
    const limit = Math.min(input.limit || 5, 50);
    const tracks = await musicKit.searchCatalog(input.query, limit);

    if (tracks.length === 0) {
      return {
        success: true,
        catalogAvailable: true,
        data: { query: input.query, tracks: [] },
        message: `🎵 CATALOG SEARCH\n\nNo results found for: "${input.query}"\n\nTry:\n- Different spelling or artist name\n- Just the track name or just the artist name\n- Removing special characters`,
      };
    }

    const markdown = formatCatalogSearchResults(tracks, input.query);

    return {
      success: true,
      catalogAvailable: true,
      data: {
        query: input.query,
        resultCount: tracks.length,
        tracks: tracks.map((t) => ({
          id: t.id,
          name: t.attributes.name,
          artist: t.attributes.artistName,
          album: t.attributes.albumName,
          url: t.attributes.url,
          duration: t.attributes.durationInMillis,
          releaseDate: t.attributes.releaseDate,
        })),
        formatted: markdown,
      },
      message: markdown,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, query: input.query }, "Catalog search failed");

    return {
      success: false,
      catalogAvailable: true,
      message: `Catalog search failed: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

export async function handleDiscoverCheckLibraryStatus(
  input: DiscoverCheckLibraryStatusInput,
): Promise<DiscoveryOutput> {
  logger.info(
    { trackCount: input.catalog_track_ids.length },
    "Checking library status",
  );

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message:
        "🎵 LIBRARY STATUS CHECK: Not Available\n\nRequires Apple Music API configuration.",
      error: "MusicKit not configured",
    };
  }

  try {
    // Get track details and check library status
    const trackDetails = await Promise.all(
      input.catalog_track_ids.map((id) => musicKit.getTrackById(id)),
    );

    const validTracks = trackDetails.filter((t) => t !== null);

    const markdown = `🎵 LIBRARY STATUS CHECK
========================================

Checked ${input.catalog_track_ids.length} tracks:

${validTracks
  .map(
    (track) =>
      `- **${track!.attributes.name}** by ${track!.attributes.artistName}
  [Preview →](${track!.attributes.url})`,
  )
  .join("\n\n")}

Note: Use library_search to verify if these tracks are in the user's library.`;

    return {
      success: true,
      catalogAvailable: true,
      data: {
        tracks: validTracks.map((t) => ({
          id: t!.id,
          name: t!.attributes.name,
          artist: t!.attributes.artistName,
          url: t!.attributes.url,
        })),
      },
      message: markdown,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, "Library status check failed");

    return {
      success: false,
      catalogAvailable: true,
      message: `Library status check failed: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCatalogSearchResults(tracks: any[], query: string): string {
  const header = `🎵 APPLE MUSIC CATALOG SEARCH
========================================

Query: "${query}"
Found: ${tracks.length} results

`;

  const trackList = tracks
    .map((track, idx) => {
      return `${idx + 1}. **${track.attributes.name}**
   Artist: ${track.attributes.artistName}
   Album: ${track.attributes.albumName}
   Duration: ${formatDuration(track.attributes.durationInMillis)}
   Released: ${track.attributes.releaseDate || "Unknown"}
   [Preview in Apple Music →](${track.attributes.url})
   Catalog ID: \`${track.id}\``;
    })
    .join("\n\n");

  return header + trackList;
}

function formatDuration(millis: number): string {
  const seconds = Math.floor(millis / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
