import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";

// Library tools
import {
  libraryGetCurrentTrackTool,
  librarySearchTool,
  libraryBrowseTool,
  handleLibraryGetCurrentTrack,
  handleLibrarySearch,
  handleLibraryBrowse,
  LibraryGetCurrentTrackInput,
  LibrarySearchInput,
  LibraryBrowseInput,
} from "./tools/library.js";

// Playlist tools
import {
  playlistCreateTool,
  playlistAddTracksTool,
  playlistRemoveTracksTool,
  playlistRenameTool,
  playlistDeleteTool,
  playlistGetTracksTool,
  handlePlaylistCreate,
  handlePlaylistAddTracks,
  handlePlaylistRemoveTracks,
  handlePlaylistRename,
  handlePlaylistDelete,
  handlePlaylistGetTracks,
  PlaylistCreateInput,
  PlaylistAddTracksInput,
  PlaylistRemoveTracksInput,
  PlaylistRenameInput,
  PlaylistDeleteInput,
  PlaylistGetTracksInput,
} from "./tools/playlists.js";

// Discovery tools
import {
  discoverSearchCatalogTool,
  discoverCheckLibraryStatusTool,
  discoverTracksTool,
  discoverAlbumsTool,
  discoverArtistsTool,
  discoverGeneratePlaylistTool,
  handleDiscoverSearchCatalog,
  handleDiscoverCheckLibraryStatus,
  handleDiscoverTracks,
  handleDiscoverAlbums,
  handleDiscoverArtists,
  handleDiscoverGeneratePlaylist,
  DiscoverSearchCatalogInput,
  DiscoverCheckLibraryStatusInput,
  DiscoverTracksInput,
  DiscoverAlbumsInput,
  DiscoverArtistsInput,
  DiscoverGeneratePlaylistInput,
} from "./tools/discovery.js";

export async function registerTools(server: Server): Promise<void> {
  // Register tool definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // 📚 Your Library
        libraryGetCurrentTrackTool,
        librarySearchTool,
        libraryBrowseTool,

        // 📚 Your Playlists
        playlistCreateTool,
        playlistAddTracksTool,
        playlistRemoveTracksTool,
        playlistRenameTool,
        playlistDeleteTool,
        playlistGetTracksTool,

        // 🎵 Discovery
        discoverSearchCatalogTool,
        discoverCheckLibraryStatusTool,
        discoverTracksTool,
        discoverAlbumsTool,
        discoverArtistsTool,
        discoverGeneratePlaylistTool,
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    logger.info({ toolName: name }, "Handling tool call");

    try {
      switch (name) {
        // ====================================================================
        // 📚 Library Tools
        // ====================================================================

        case "library_get_current_track": {
          const result = await handleLibraryGetCurrentTrack(
            args as LibraryGetCurrentTrackInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "library_search": {
          const result = await handleLibrarySearch(args as LibrarySearchInput);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "library_browse": {
          const result = await handleLibraryBrowse(args as LibraryBrowseInput);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ====================================================================
        // 📚 Playlist Tools
        // ====================================================================

        case "playlist_create": {
          const result = await handlePlaylistCreate(
            args as PlaylistCreateInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "playlist_add_tracks": {
          const result = await handlePlaylistAddTracks(
            args as PlaylistAddTracksInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "playlist_remove_tracks": {
          const result = await handlePlaylistRemoveTracks(
            args as PlaylistRemoveTracksInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "playlist_rename": {
          const result = await handlePlaylistRename(
            args as PlaylistRenameInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "playlist_delete": {
          const result = await handlePlaylistDelete(
            args as PlaylistDeleteInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "playlist_get_tracks": {
          const result = await handlePlaylistGetTracks(
            args as PlaylistGetTracksInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ====================================================================
        // 🎵 Discovery Tools
        // ====================================================================

        case "discover_search_catalog": {
          const result = await handleDiscoverSearchCatalog(
            args as DiscoverSearchCatalogInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "discover_check_library_status": {
          const result = await handleDiscoverCheckLibraryStatus(
            args as DiscoverCheckLibraryStatusInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "discover_tracks": {
          const result = await handleDiscoverTracks(
            args as DiscoverTracksInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "discover_albums": {
          const result = await handleDiscoverAlbums(
            args as DiscoverAlbumsInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "discover_artists": {
          const result = await handleDiscoverArtists(
            args as DiscoverArtistsInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "discover_generate_playlist": {
          const result = await handleDiscoverGeneratePlaylist(
            args as DiscoverGeneratePlaylistInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error({ error, toolName: name }, "Tool execution failed");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: `Tool execution failed: ${(error as Error).message}`,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  });

  logger.info("All MCP tools registered successfully");
}
