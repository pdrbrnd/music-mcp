import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";
import { infoTool, handleInfoCommand } from "./tools/info.js";
import {
  executeMusicCommandTool,
  handleExecuteMusicCommand,
  ExecuteMusicCommandInput,
} from "./tools/music-control.js";
import {
  getMusicInfoTool,
  searchMusicTool,
  handleGetMusicInfo,
  handleSearchMusic,
  GetMusicInfoInput,
  SearchMusicInput,
} from "./tools/library-management.js";
import {
  managePlaylistTool,
  handleManagePlaylist,
  ManagePlaylistInput,
} from "./tools/playlist-management.js";
import {
  queueMusicTool,
  handleQueueMusic,
  QueueMusicInput,
} from "./tools/queue-management.js";
import {
  catalogSearchTool,
  addCatalogTrackTool,
  handleCatalogSearch,
  handleAddCatalogTrack,
  CatalogSearchInput,
  AddCatalogTrackInput,
} from "./tools/catalog-search.js";
import {
  authorizeTool,
  handleAuthorize,
  AuthorizeInput,
} from "./tools/authorize.js";
import {
  createCatalogPlaylistTool,
  handleCreateCatalogPlaylist,
  CreateCatalogPlaylistInput,
} from "./tools/create-catalog-playlist.js";

export async function registerTools(server: Server): Promise<void> {
  // Register tool definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        infoTool,
        executeMusicCommandTool,
        getMusicInfoTool,
        searchMusicTool,
        managePlaylistTool,
        queueMusicTool,
        catalogSearchTool,
        addCatalogTrackTool,
        authorizeTool,
        createCatalogPlaylistTool,
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    logger.info({ toolName: name }, "Handling tool call");

    try {
      switch (name) {
        case "info": {
          const infoResult = await handleInfoCommand();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(infoResult, null, 2),
              },
            ],
          };
        }

        case "execute_music_command": {
          const commandResult = await handleExecuteMusicCommand(
            args as ExecuteMusicCommandInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(commandResult, null, 2),
              },
            ],
          };
        }

        case "get_music_info": {
          const infoData = await handleGetMusicInfo(args as GetMusicInfoInput);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(infoData, null, 2),
              },
            ],
          };
        }

        case "search_music": {
          const searchResult = await handleSearchMusic(
            args as SearchMusicInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(searchResult, null, 2),
              },
            ],
          };
        }

        case "manage_playlist": {
          const playlistResult = await handleManagePlaylist(
            args as ManagePlaylistInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(playlistResult, null, 2),
              },
            ],
          };
        }

        case "queue_music": {
          const queueResult = await handleQueueMusic(args as QueueMusicInput);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(queueResult, null, 2),
              },
            ],
          };
        }

        case "search_apple_music_catalog": {
          const catalogResult = await handleCatalogSearch(
            args as CatalogSearchInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(catalogResult, null, 2),
              },
            ],
          };
        }

        case "add_catalog_track_to_library": {
          const addResult = await handleAddCatalogTrack(
            args as AddCatalogTrackInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(addResult, null, 2),
              },
            ],
          };
        }

        case "authorize_apple_music": {
          const authorizeResult = await handleAuthorize(args as AuthorizeInput);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(authorizeResult, null, 2),
              },
            ],
          };
        }

        case "create_catalog_playlist": {
          const createResult = await handleCreateCatalogPlaylist(
            args as CreateCatalogPlaylistInput,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(createResult, null, 2),
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
