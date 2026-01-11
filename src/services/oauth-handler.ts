import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../logger.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';

export interface OAuthTokens {
  userToken: string;
  expiresAt: number;
}

export interface OAuthConfig {
  developerToken: string;
  redirectUri: string;
  port: number;
}

/**
 * OAuth handler for Apple Music user authentication
 * Implements the authorization flow to get user tokens
 */
export class OAuthHandler {
  private config: OAuthConfig;
  private tokensPath: string;

  constructor(developerToken: string) {
    this.config = {
      developerToken,
      redirectUri: 'http://localhost:3000/callback',
      port: 3000,
    };

    // Store tokens in user's home directory
    const configDir = join(homedir(), '.music-mcp');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true, mode: 0o700 });
    }
    this.tokensPath = join(configDir, 'tokens.json');
  }

  /**
   * Check if we have a valid stored token
   */
  hasValidToken(): boolean {
    if (!existsSync(this.tokensPath)) {
      return false;
    }

    try {
      const tokens = this.loadTokens();
      if (!tokens) return false;

      // Check if token is expired (with 1 hour buffer)
      const now = Date.now();
      return tokens.expiresAt > now + 3600000;
    } catch (error) {
      logger.error({ error }, 'Failed to check token validity');
      return false;
    }
  }

  /**
   * Get stored user token
   */
  getUserToken(): string | null {
    if (!this.hasValidToken()) {
      return null;
    }

    try {
      const tokens = this.loadTokens();
      return tokens?.userToken || null;
    } catch (error) {
      logger.error({ error }, 'Failed to load user token');
      return null;
    }
  }

  /**
   * Start OAuth flow to get user authorization
   */
  async authorize(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        this.handleCallback(req, res, resolve, reject, server);
      });

      server.listen(this.config.port, () => {
        logger.info({ port: this.config.port }, 'OAuth server started');

        // Open browser for authorization
        const authUrl = this.getAuthorizationUrl();
        logger.info({ authUrl }, 'Opening browser for authorization');

        this.openBrowser(authUrl).catch((error) => {
          logger.error({ error }, 'Failed to open browser');
          console.error('\nPlease open this URL in your browser:\n');
          console.error(authUrl);
          console.error('\n');
        });
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authorization timeout - no response received'));
      }, 300000);
    });
  }

  /**
   * Generate Apple Music authorization URL
   */
  private getAuthorizationUrl(): string {
    // Apple Music uses MusicKit JS authorization
    // For server-side, we use a simplified flow with the developer token
    // The user will authenticate through Apple Music web interface

    // Note: Apple Music API requires MusicKit JS for full OAuth
    // For MCP use case, we'll use a hybrid approach:
    // 1. User authorizes through a simple HTML page we serve
    // 2. That page uses MusicKit JS to get user token
    // 3. Sends it back to our callback

    const state = Math.random().toString(36).substring(7);
    return `http://localhost:${this.config.port}/authorize?state=${state}`;
  }

  /**
   * Handle OAuth callback
   */
  private handleCallback(
    req: IncomingMessage,
    res: ServerResponse,
    resolve: (token: string) => void,
    reject: (error: Error) => void,
    server: any
  ): void {
    const url = new URL(req.url || '', `http://localhost:${this.config.port}`);

    if (url.pathname === '/authorize') {
      // Serve authorization page with MusicKit JS
      this.serveAuthPage(res);
      return;
    }

    if (url.pathname === '/callback') {
      const userToken = url.searchParams.get('token');
      const error = url.searchParams.get('error');

      if (error) {
        this.serveErrorPage(res, error);
        server.close();
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }

      if (!userToken) {
        this.serveErrorPage(res, 'No token received');
        server.close();
        reject(new Error('No user token received'));
        return;
      }

      // Store token
      try {
        this.saveTokens({
          userToken,
          expiresAt: Date.now() + 86400000 * 180, // 180 days
        });

        this.serveSuccessPage(res);
        server.close();
        resolve(userToken);
      } catch (error) {
        this.serveErrorPage(res, 'Failed to save token');
        server.close();
        reject(error as Error);
      }
      return;
    }

    // 404 for other paths
    res.writeHead(404);
    res.end('Not found');
  }

  /**
   * Serve authorization page with MusicKit JS
   */
  private serveAuthPage(res: ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Apple Music Authorization</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { margin: 0 0 1rem 0; color: #333; }
    p { color: #666; margin-bottom: 2rem; }
    button {
      background: #fa243c;
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    button:hover { background: #e0162d; transform: translateY(-2px); }
    button:disabled { background: #ccc; cursor: not-allowed; }
    #status { margin-top: 1rem; color: #666; font-size: 0.9rem; }
    .error { color: #fa243c; }
    .success { color: #34c759; }
  </style>
  <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"></script>
</head>
<body>
  <div class="container">
    <h1>🎵 Apple Music Authorization</h1>
    <p>Click below to authorize Music MCP to access your Apple Music library.</p>
    <button id="authButton" onclick="authorize()">Authorize Apple Music</button>
    <div id="status"></div>
  </div>

  <script>
    const developerToken = '${this.config.developerToken}';
    let music;

    async function authorize() {
      const button = document.getElementById('authButton');
      const status = document.getElementById('status');

      button.disabled = true;
      status.textContent = 'Initializing...';

      try {
        // Configure MusicKit
        await MusicKit.configure({
          developerToken: developerToken,
          app: {
            name: 'Music MCP',
            build: '1.0'
          }
        });

        music = MusicKit.getInstance();
        status.textContent = 'Requesting authorization...';

        // Request authorization
        const musicUserToken = await music.authorize();

        status.textContent = 'Authorization successful! Redirecting...';
        status.className = 'success';

        // Send token back to server
        window.location.href = '/callback?token=' + encodeURIComponent(musicUserToken);

      } catch (error) {
        console.error('Authorization error:', error);
        status.textContent = 'Authorization failed: ' + error.message;
        status.className = 'error';
        button.disabled = false;

        // Send error to server
        setTimeout(() => {
          window.location.href = '/callback?error=' + encodeURIComponent(error.message);
        }, 2000);
      }
    }
  </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve success page
   */
  private serveSuccessPage(res: ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Success</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { margin: 0 0 1rem 0; color: #34c759; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Authorization Successful!</h1>
    <p>You can now close this window and return to Claude Desktop.</p>
    <p>Music MCP can now create playlists with Apple Music catalog tracks.</p>
  </div>
  <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve error page
   */
  private serveErrorPage(res: ServerResponse, error: string): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Error</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { margin: 0 0 1rem 0; color: #fa243c; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>❌ Authorization Failed</h1>
    <p>${error}</p>
    <p>Please try again or check the logs for more details.</p>
  </div>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Open browser to URL
   */
  private openBrowser(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = process.platform === 'darwin'
        ? `open "${url}"`
        : process.platform === 'win32'
        ? `start "${url}"`
        : `xdg-open "${url}"`;

      exec(command, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Load tokens from disk
   */
  private loadTokens(): OAuthTokens | null {
    try {
      if (!existsSync(this.tokensPath)) {
        return null;
      }

      const data = readFileSync(this.tokensPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error({ error }, 'Failed to load tokens');
      return null;
    }
  }

  /**
   * Save tokens to disk
   */
  private saveTokens(tokens: OAuthTokens): void {
    try {
      writeFileSync(this.tokensPath, JSON.stringify(tokens, null, 2), {
        mode: 0o600, // Owner read/write only
      });
      logger.info('Tokens saved successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to save tokens');
      throw error;
    }
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    try {
      if (existsSync(this.tokensPath)) {
        writeFileSync(this.tokensPath, '');
        logger.info('Tokens cleared');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to clear tokens');
    }
  }
}
