import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logger.js';
import { getConfig } from '../config.js';
import { OAuthHandler } from '../services/oauth-handler.js';

export interface AuthorizeInput {
  action: 'authorize' | 'check' | 'clear';
}

export interface AuthorizeOutput {
  success: boolean;
  message: string;
  authorized: boolean;
  error?: string;
}

export const authorizeTool: Tool = {
  name: 'authorize_apple_music',
  description: 'Authorize Music MCP to access your Apple Music library for creating playlists with catalog tracks. Required for music discovery features.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['authorize', 'check', 'clear'],
        description: 'Action to perform: authorize (start OAuth flow), check (verify authorization status), clear (remove stored tokens)',
        default: 'authorize'
      }
    },
    required: ['action']
  }
};

export async function handleAuthorize(input: AuthorizeInput): Promise<AuthorizeOutput> {
  logger.info({ action: input.action }, 'Handling authorization');

  const config = getConfig();

  // Check if developer token is configured
  if (!config.appleMusicDeveloperToken) {
    return {
      success: false,
      authorized: false,
      message: 'Developer token not configured. Set APPLE_MUSIC_DEVELOPER_TOKEN environment variable first.',
      error: 'Missing developer token'
    };
  }

  const oauthHandler = new OAuthHandler(config.appleMusicDeveloperToken);

  try {
    switch (input.action) {
      case 'check': {
        const isAuthorized = oauthHandler.hasValidToken();
        return {
          success: true,
          authorized: isAuthorized,
          message: isAuthorized
            ? 'User is authorized. Can create playlists with catalog tracks.'
            : 'User is not authorized. Run authorize action to authenticate.'
        };
      }

      case 'clear': {
        oauthHandler.clearTokens();
        return {
          success: true,
          authorized: false,
          message: 'Authorization tokens cleared. Run authorize action to re-authenticate.'
        };
      }

      case 'authorize': {
        // Check if already authorized
        if (oauthHandler.hasValidToken()) {
          return {
            success: true,
            authorized: true,
            message: 'Already authorized. No need to re-authenticate.'
          };
        }

        // Start OAuth flow
        logger.info('Starting OAuth authorization flow');
        console.error('\n🎵 Apple Music Authorization\n');
        console.error('Opening browser for authorization...\n');
        console.error('If the browser doesn\'t open automatically, visit:\n');
        console.error('http://localhost:3000/authorize\n');

        const userToken = await oauthHandler.authorize();

        logger.info('Authorization successful');
        console.error('\n✅ Authorization successful!\n');

        return {
          success: true,
          authorized: true,
          message: 'Successfully authorized! You can now create playlists with Apple Music catalog tracks.'
        };
      }

      default:
        return {
          success: false,
          authorized: false,
          message: `Unknown action: ${input.action}`,
          error: 'Invalid action'
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, action: input.action }, 'Authorization failed');

    return {
      success: false,
      authorized: false,
      message: `Authorization failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}
