# Music MCP

[![npm version](https://badge.fury.io/js/%40pdrbrnd%2Fmusic-mcp.svg)](https://badge.fury.io/js/%40pdrbrnd%2Fmusic-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for controlling Apple Music on macOS using AppleScript. This connector provides a structured interface for AI assistants like Claude to interact with the Music app, enabling playback control, library management, music information retrieval, and **Apple Music catalog search** for intentional music discovery.

> **Note**: Forked from [pedrocid/music-mcp](https://github.com/pedrocid/music-mcp) by Pedro Cid, with added Apple Music catalog search capabilities for music discovery.

## Features

- **Playback Control**: Play, pause, skip tracks, and control volume
- **Current Track Information**: Get detailed track metadata and playback status
- **Library Management**: Search tracks, albums, artists, and browse your library
- **Playlist Management**: Create, manage, modify, and play playlists
- **Enhanced Queue Management**: Add tracks to play next, view queue status, and control playback order
- **Smart "Play Next" Feature**: Queue tracks to play after the current song using temporary playlists
- **🆕 Apple Music Catalog Search**: Search 100M+ songs and get Apple Music URLs for manual review
- **🆕 Intentional Music Discovery**: Search catalog, review tracks, and manually add what resonates
- **🆕 Batch Catalog Search**: Search multiple tracks at once and get formatted lists with URLs
- **Diagnostic Tools**: Built-in info command for troubleshooting

## Requirements

- macOS (required for Apple Music and AppleScript)
- Node.js 18.0.0 or higher
- Apple Music app installed and accessible
- Automation permissions granted to your terminal/app

## Installation & Setup

### Quick Start (Library-Only)

Works out of the box for controlling your Music library. No configuration needed.

#### 1. Install

```bash
# Via npx (recommended)
npx @pdrbrnd/music-mcp@latest

# Or for development
git clone https://github.com/pdrbrnd/music-mcp.git
cd music-mcp
pnpm install
pnpm run build
```

#### 2. Configure Claude Desktop

Edit `~/.config/Claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "music": {
      "command": "npx",
      "args": ["@pdrbrnd/music-mcp@latest"]
    }
  }
}
```

Or use local build:

```json
{
  "mcpServers": {
    "music": {
      "command": "node",
      "args": ["/absolute/path/to/music-mcp/dist/index.js"]
    }
  }
}
```

#### 3. Grant Permissions

When first used, macOS will prompt for automation permissions:
- Go to **System Settings** → **Privacy & Security** → **Automation**
- Allow your terminal/Claude to control **Music**

#### 4. Test

Restart Claude Desktop and try:
```
"What's currently playing?"
"Search my library for songs by Radiohead"
"Create a playlist called 'Test'"
```

### Apple Music Catalog Setup (Optional)

Enable music discovery by searching the full Apple Music catalog (100M+ songs).

#### Requirements

- Apple Developer Account ($99/year)
- Apple Music Subscription

#### Setup Steps

1. **Join Apple Developer Program**
   
   Sign up at [developer.apple.com/programs](https://developer.apple.com/programs/)

2. **Create MusicKit Identifier**
   
   - Go to [Apple Developer Portal](https://developer.apple.com/account)
   - Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
   - Click **+** to create new identifier
   - Select **Media IDs**
   - Enter description and identifier (e.g., `com.yourname.music-mcp`)
   - Click **Register**

3. **Create Private Key**
   
   - Go to **Keys** in Developer Portal
   - Click **+** to create new key
   - Enter name and check **MusicKit**
   - Click **Continue** → **Register**
   - **Download the `.p8` file** (you can only download once!)
   - Note your **Key ID** (e.g., `ABCD1234`)

4. **Get Team ID**
   
   - Go to **Membership** in Developer Portal
   - Copy your **Team ID** (10-character alphanumeric)

5. **Generate JWT Token**
   
   Use the built-in token generator:
   
   ```bash
   # If installed globally or via npx
   npx @pdrbrnd/music-mcp generate-token
   
   # Or if cloned locally
   pnpm run generate-token
   ```
   
   The tool will interactively prompt you for:
   - Path to your `.p8` private key file
   - Your Team ID
   - Your Key ID
   - Token expiration (default: 180 days, max allowed by Apple)
   
   It will generate and display your JWT token with setup instructions.
   
   **Security Note**: The `.p8` file is automatically ignored by git for safety.

6. **Configure Claude Desktop**
   
   Add your token to the configuration:
   
   ```json
   {
     "mcpServers": {
       "music": {
         "command": "npx",
         "args": ["@pdrbrnd/music-mcp@latest"],
         "env": {
           "APPLE_MUSIC_DEVELOPER_TOKEN": "eyJhbGc...your-token-here",
           "APPLE_MUSIC_STOREFRONT": "us"
         }
       }
     }
   }
   ```

7. **You're Done!**

#### Verify Setup

Ask Claude:
```
"Check the Music MCP info"
```

You should see:
- `catalogSearchConfigured: true`
- `catalogSearchAvailable: true`

Try searching for tracks in the catalog:

```
"Search Apple Music for Anti-Hero by Taylor Swift"
```

Claude will return the track details with an Apple Music URL you can open to preview and add manually.

For batch searching multiple tracks:

```
"Batch search these tracks: Anti-Hero by Taylor Swift, Vampire by Olivia Rodrigo, Cruel Summer by Taylor Swift"
```

Claude will return a formatted list with Apple Music URLs for each track found.

## Intentional Music Discovery Workflow

This MCP is designed for **intentional listening** - encouraging you to actively engage with music rather than passively consuming it.

### Philosophy

Instead of bulk-importing playlists automatically, the workflow promotes:
- **Conscious selection**: Review each track before adding
- **Artist awareness**: Learn about the artist, album, and context
- **Intentional curation**: Build playlists that truly resonate with you

### Recommended Workflow

1. **Search for tracks**: Use `search_apple_music_catalog` or `batch_catalog_search` to find tracks
2. **Get Apple Music URLs**: Each result includes a direct Apple Music link
3. **Review manually**: Click the URL, listen to preview, check the album
4. **Add consciously**: If it resonates, add to your library manually or via `add_catalog_track_to_library`
5. **Curate playlists**: Use `manage_playlist` to organize your intentionally selected tracks

### Example Usage

**Single track discovery:**
```
User: "Search Apple Music for Archangel by Burial"
Claude: Returns track details with Apple Music URL
User: [Opens URL, listens, decides to add]
```

**Batch discovery:**
```
User: "Batch search these tracks: [list of 30 tracks]"
Claude: Returns formatted list with URLs for all found tracks
User: Reviews list, opens interesting tracks, adds selected ones
```

**Why this approach?**
- Forces engagement with each track
- Builds deeper connection with music
- Avoids algorithmic passive consumption
- Creates more meaningful playlists

#### Storefront Codes

Common region codes: `us`, `gb`, `ca`, `au`, `jp`, `de`, `fr`, `it`, `es`

### Environment Variables

#### Apple Music Catalog (Optional)

| Variable | Description |
|----------|-------------|
| `APPLE_MUSIC_DEVELOPER_TOKEN` | JWT token for catalog access |
| `APPLE_MUSIC_USER_TOKEN` | User token for auto-add to library (advanced) |
| `APPLE_MUSIC_STOREFRONT` | Region code (default: `us`) |

#### Server Configuration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `MUSIC_MCP_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `MUSIC_MCP_FILE_LOGGING` | `false` | Enable file logging |
| `MUSIC_MCP_LOG_FILE` | `~/Library/Logs/music-mcp.log` | Log file location |
| `MUSIC_MCP_CACHE_TTL` | `300` | Cache timeout in seconds |
| `MUSIC_MCP_MAX_SEARCH_RESULTS` | `50` | Maximum search results |
| `MUSIC_MCP_TIMEOUT_SECONDS` | `30` | Operation timeout |
| `MUSIC_MCP_ARTWORK_EXPORT` | `true` | Enable album artwork export |
| `MUSIC_MCP_LENIENT_PARSING` | `true` | Accept parameter name variations |

## CLI Utilities

### JWT Token Generator

Generate Apple Music API tokens easily with the built-in CLI tool:

```bash
# Via npx (if installed)
npx @pdrbrnd/music-mcp generate-token

# Or from local clone
pnpm run generate-token

# Or directly
music-mcp-generate-token
```

The interactive tool will guide you through:
1. Locating your `.p8` private key file
2. Entering your Team ID and Key ID
3. Setting token expiration (max 180 days)
4. Displaying your JWT token with setup instructions

**Features:**
- ✅ Interactive prompts with validation
- ✅ Automatic `.p8` file reading
- ✅ Expiration date calculation
- ✅ Security reminders and best practices
- ✅ Ready-to-use configuration examples

## Available Tools

### `info`
Get diagnostic information about the MCP server status.

```json
{
  "command": "info"
}
```

Returns version information, Music app availability, catalog search status, and configuration details.

### `execute_music_command`
Execute music playback control commands.

```json
{
  "command": "play|pause|next|previous|toggle_playback",
  "volume": 75,
  "position": 30,
  "shuffleMode": true,
  "repeatMode": "all",
  "rating": 4
}
```

### `get_music_info`
Retrieve information about current playback or library.

```json
{
  "infoType": "current_track|playback_status|queue|library_stats",
  "format": "simple|detailed"
}
```

### `search_music`
Search the music library.

```json
{
  "query": "artist name or song title",
  "searchType": "all|track|album|artist|playlist",
  "limit": 25
}
```

### `manage_playlist`
Create and manage playlists.

```json
{
  "action": "create|add_track|remove_track|rename|delete|list|get_tracks",
  "playlistName": "My Playlist",
  "trackId": "search term for track",
  "newName": "New Playlist Name"
}
```

**Actions**:
- `create`: Create a new empty playlist
- `add_track`: Add a track from your library to a playlist
- `remove_track`: Remove a track from a playlist
- `rename`: Rename an existing playlist
- `delete`: Delete a playlist
- `list`: List all playlists
- `get_tracks`: Get tracks in a playlist

### `queue_music` ✨ **NEW**
Enhanced queue management and playlist control.

```json
{
  "action": "view_queue|add_to_queue|play_queue|clear_queue|play_playlist",
  "trackSearchTerm": "song or artist name",
  "playlistName": "My Playlist",
  "shuffle": true
}
```

**Queue Actions:**
- `view_queue`: See current track, playlist context, and playback status
- `add_to_queue`: Add tracks to a temporary "Up Next" queue for sequential playback
- `play_queue`: Play the tracks you've added to the queue
- `clear_queue`: Clear all tracks from the up next queue

### `search_apple_music_catalog` 🎵
Search the Apple Music catalog for tracks not in your library.

```json
{
  "query": "artist name, song title, or combination",
  "limit": 25
}
```

Returns track details with Apple Music URLs for manual review and addition.

### `batch_catalog_search` 🎵 **NEW**
Search for multiple tracks at once and get a formatted list with URLs.

```json
{
  "tracks": [
    { "track": "Song Title", "artist": "Artist Name" },
    { "track": "Another Song", "artist": "Another Artist" }
  ]
}
```

Returns:
- **Found tracks**: With Apple Music URLs for each
- **Not found**: List of tracks that couldn't be found
- **Summary**: Count of found vs. not found

**Use Case**: Perfect for discovering new music or transferring playlists. Get URLs for all tracks, then manually review and add the ones you want to your library.

### `add_catalog_track_to_library`
Add a specific catalog track to your library by its catalog ID.

```json
{
  "trackId": "catalog_track_id",
  "addToLibrary": true
}
```

**Note:** Requires user token to be configured. For manual library additions, tracks must be added through the Music app first, then can be managed via playlists.



## Building as MCP Bundle

Create an MCP Bundle (.mcpb) for distribution:

```bash
pnpm install
pnpm run build
pnpm run package:mcpb
```

This creates a `music-mcp.mcpb` file for Claude Desktop.

## Troubleshooting

**"Music app not accessible"**
- Grant automation permissions in System Settings → Privacy & Security → Automation
- Manually open Music app first

**"MusicKit not configured"**
- Set `APPLE_MUSIC_DEVELOPER_TOKEN` environment variable (see setup above)

**"Apple Music API error: 401"**
- Your JWT token is invalid or expired
- Generate a new token (tokens expire after max 180 days)

**"No tracks found"**
- For library searches: Track must be in your library
- For catalog searches: Use `search_apple_music_catalog` or enable `useCatalogSearch: true`

**"Track added but not in playlist"**
- Wait 5-10 seconds for library sync, then retry

**Catalog search finds few tracks**
- Enable debug logging (see below) to see what Apple's API is returning
- Check if searches are returning 0 results or low scores
- Common issues: special characters, exact spelling, less popular tracks
- Apple's search API is text-based and can be inconsistent

**Check Status**
```
Ask Claude: "Check the Music MCP info"
```

**Enable Debug Logging**

To see detailed search logs and API responses, update your Claude Desktop config:

```json
{
  "mcpServers": {
    "music": {
      "command": "npx",
      "args": ["@pdrbrnd/music-mcp@latest"],
      "env": {
        "APPLE_MUSIC_DEVELOPER_TOKEN": "your-token",
        "MUSIC_MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

Restart Claude Desktop and check the logs at: `~/Library/Logs/Claude/mcp-server-music.log`

Debug logs will show:
- Each search query attempted
- Number of results returned from Apple's API
- Scoring for each result
- Why tracks were rejected (low score, no results, etc.)

## Example Usage

Here are some example interactions you can have with Claude using this MCP server:

**Basic Playback:**
- "Play my music and set the volume to 50%"
- "What song is currently playing?"
- "Skip to the next track"

**Library & Search:**
- "Search for songs by Taylor Swift in my library"
- "Show me my library statistics"

**Playlist Management:**
- "Create a playlist called 'Road Trip' and add some upbeat songs"
- "Play my 'Chill' playlist with shuffle enabled"
- "Remove all tracks by [artist] from my 'Favorites' playlist"

**Queue Management:**
- "Add 'Bohemian Rhapsody' to play next"
- "Show me what's in my up next queue"
- "Clear my queue and add these 3 songs to play after the current track"
- "Play my 'Party Mix' playlist next"

**Music Discovery (NEW - Requires MusicKit):**
- "Search the Apple Music catalog for songs by Radiohead"
- "Batch search these tracks: [list of tracks with artists]"
- "Create a playlist called 'Discover Weekly' and add Motion Picture Soundtrack by Radiohead, Paranoid Android, and Karma Police"
- "Make me a 90s alternative rock playlist with 20 songs I probably don't have"
- "Create a workout playlist with high energy tracks from the catalog"

## Development

### Building

```bash
pnpm run build
```

### Testing

```bash
pnpm test              # Unit tests
pnpm run test:e2e      # Integration tests
```

### Linting

```bash
pnpm run lint
```

### Packaging

```bash
pnpm run package:mcpb  # Create MCP bundle
```

### Release Preparation

```bash
pnpm run prepare-release
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Run the release preparation: `pnpm run prepare-release`
6. Commit your changes: `git commit -am 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## Quick Reference

### Common Commands

**Library Search** (No configuration needed):
- "Search my library for songs by Radiohead"
- "What's currently playing?"
- "Create a playlist called 'Favorites'"
- "Add 'Bohemian Rhapsody' to my 'Rock' playlist"

**Catalog Search** (Requires MusicKit token):
- "Search the Apple Music catalog for songs by Taylor Swift"
- "Find new music by The 1975 in the catalog"

**Music Discovery**:
- "Create a playlist called 'Discover' and add 'Creep' by Radiohead from the catalog"
- "Search for 'lo-fi hip hop' in the catalog and add the top result to my 'Study' playlist"

**Playback Control**:
- "Play my 'Chill' playlist"
- "Pause the music"
- "Skip to the next track"
- "Set volume to 50%"



## Development

### Building
```bash
pnpm run build
```

### Testing
```bash
pnpm test              # Unit tests
pnpm run test:e2e      # Integration tests
```

### Linting
```bash
pnpm run lint
```

## References

- [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi)
- [Generating Developer Tokens](https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens)
- [Model Context Protocol](https://github.com/modelcontextprotocol/mcp)
- [Claude Desktop](https://claude.ai/desktop)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/pdrbrnd/music-mcp/issues)
- Original project: [pedrocid/music-mcp](https://github.com/pedrocid/music-mcp) by Pedro Cid