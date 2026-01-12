# Music MCP

A Model Context Protocol (MCP) server for Apple Music on macOS. Manage your music library and discover new music through Claude or any MCP client.

## What This Does

This MCP has two distinct modes:

### 📚 Your Library (No API Keys Needed)
- Browse and search your music library (tracks, albums, artists, playlists)
- Create and manage playlists from your owned tracks
- View what's currently playing

### 🎵 Discovery (Requires Apple Music API)
- Search Apple Music's 100M+ track catalog
- Get personalized recommendations (similar artists, albums, tracks)
- Check which catalog tracks are already in your library
- Generate discovery playlists (your music + new suggestions)

**Discovery tools output recommendations only—no automatic modifications.** You preview tracks, consciously add favorites to your library, then use the library tools to create playlists.

## Quick Start

### 1. Install

```bash
npm install -g @pdrbrnd/music-mcp
```

Or use directly with `npx`:

```bash
npx @pdrbrnd/music-mcp
```

### 2. Configure Claude Desktop

#### Library Only (No API Keys)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "music": {
      "command": "npx",
      "args": ["-y", "@pdrbrnd/music-mcp"]
    }
  }
}
```

#### With Discovery (API Keys Required)

```json
{
  "mcpServers": {
    "music": {
      "command": "npx",
      "args": ["-y", "@pdrbrnd/music-mcp"],
      "env": {
        "APPLE_MUSIC_DEVELOPER_TOKEN": "your-developer-token-here",
        "APPLE_MUSIC_STOREFRONT": "us"
      }
    }
  }
}
```

See [Apple Music API Setup](#apple-music-api-setup) below for getting your developer token.

### 3. Grant Permissions

On first run, macOS will prompt you to grant automation permissions:

**System Settings → Privacy & Security → Automation → Claude → Music.app** ✓

### 4. Test

Restart Claude Desktop and try:

> "What's currently playing in Apple Music?"

> "Search my library for electronic music"

> "Create a playlist called 'Focus' with tracks from my library"

If you configured API keys:

> "Find me new albums similar to Boards of Canada"

---

## Apple Music API Setup

Discovery features require Apple Music API credentials. This is **optional**—library management works without it.

### Get Your Developer Token

1. **Join Apple Developer Program** (free tier available)
   - Visit: https://developer.apple.com/programs/

2. **Create MusicKit Identifier**
   - Go to: https://developer.apple.com/account/resources/identifiers/list/musicId
   - Click "+" to create new identifier
   - Enter description (e.g., "Music MCP")
   - Save the **Team ID** and **MusicKit ID**

3. **Create Private Key**
   - Go to: https://developer.apple.com/account/resources/authkeys/list
   - Click "+" to create new key
   - Enable "MusicKit"
   - Download the `.p8` file
   - Save the **Key ID**

4. **Generate JWT Token**

   This MCP includes a token generator:

   ```bash
   npx @pdrbrnd/music-mcp generate-token
   ```

   Or generate manually using the helper script:

   ```bash
   node -e "
   const jwt = require('jsonwebtoken');
   const fs = require('fs');
   
   const privateKey = fs.readFileSync('./AuthKey_XXXXXX.p8', 'utf8');
   const token = jwt.sign({}, privateKey, {
     algorithm: 'ES256',
     expiresIn: '180d',
     issuer: 'YOUR_TEAM_ID',
     header: {
       alg: 'ES256',
       kid: 'YOUR_KEY_ID'
     }
   });
   
   console.log(token);
   "
   ```

   Replace:
   - `AuthKey_XXXXXX.p8` → your downloaded key file
   - `YOUR_TEAM_ID` → your Team ID (10 characters)
   - `YOUR_KEY_ID` → your Key ID (10 characters)

5. **Add to Config**

   ```json
   {
     "env": {
       "APPLE_MUSIC_DEVELOPER_TOKEN": "eyJhbGc...",
       "APPLE_MUSIC_STOREFRONT": "us"
     }
   }
   ```

   **Storefront codes:**
   - `us` - United States
   - `gb` - United Kingdom  
   - `ca` - Canada
   - `au` - Australia
   - `de` - Germany
   - `fr` - France
   - `jp` - Japan
   - [Full list](https://developer.apple.com/documentation/applemusicapi/storefronts)

---

## Available Tools

### 📚 Your Library

#### `library_get_current_track`
Get currently playing track information.

```
Example: "What's playing right now?"
```

Returns: Track title, artist, album, duration, position, playback state

---

#### `library_search`
Search your library for tracks, albums, or artists.

**Parameters:**
- `query` (required): Search term
- `type` (optional): `"track"`, `"album"`, `"artist"`, or `"all"` (default)
- `limit` (optional): Max results (default: 50)

```
Example: "Find all Radiohead tracks in my library"
Example: "Search my library for jazz albums"
```

---

#### `library_browse`
Browse your library by type.

**Parameters:**
- `type` (required): `"tracks"`, `"albums"`, `"artists"`, or `"playlists"`
- `limit` (optional): Max results (default: 100)

```
Example: "Show me all my playlists"
Example: "List all albums in my library"
```

---

### 📚 Your Playlists

#### `playlist_create`
Create a new empty playlist.

**Parameters:**
- `name` (required): Playlist name

```
Example: "Create a playlist called 'Morning Coffee'"
```

---

#### `playlist_add_tracks`
Add tracks from your library to a playlist.

**Parameters:**
- `playlist_name` (required): Target playlist
- `track_search_terms` (required): Array of search terms for tracks in your library

```
Example: "Add 'Pyramid Song' and 'Everything in Its Right Place' to my Focus playlist"
```

**Note:** Only works with tracks already in your library. For discovery tracks, add them to your library first.

---

#### `playlist_remove_tracks`
Remove tracks from a playlist.

**Parameters:**
- `playlist_name` (required): Target playlist
- `track_search_terms` (required): Array of search terms

```
Example: "Remove 'Hotel California' from my Road Trip playlist"
```

---

#### `playlist_rename`
Rename a playlist.

**Parameters:**
- `current_name` (required): Current playlist name
- `new_name` (required): New playlist name

---

#### `playlist_delete`
Delete a playlist.

**Parameters:**
- `name` (required): Playlist name to delete

---

#### `playlist_get_tracks`
Get all tracks in a playlist.

**Parameters:**
- `name` (required): Playlist name

---

### 🎵 Discovery (Requires API Keys)

#### `discover_search_catalog`
Search Apple Music's full catalog.

**Parameters:**
- `query` (required): Search term
- `limit` (optional): Max results (default: 25)

```
Example: "Search Apple Music catalog for Jon Hopkins"
```

**Returns:** Formatted markdown table with:
- Track names, artists, albums
- Apple Music deep links for previewing
- Catalog IDs for adding to library
- Duration and release info

---

#### `discover_check_library_status`
Check which catalog tracks are already in your library.

**Parameters:**
- `catalog_track_ids` (required): Array of Apple Music catalog IDs

```
Example: "Check which of these tracks I already have: [id1, id2, id3]"
```

**Returns:** Split list of:
- ✓ Tracks already in your library
- [ ] Tracks not in your library (with Apple Music links)

---

#### `discover_tracks`
Get personalized track recommendations.

**Parameters:**
- `seed_type` (required): `"artist"`, `"album"`, `"track"`, or `"genre"`
- `seed_value` (required): Artist name, track name, album name, or genre
- `limit` (optional): Number of recommendations (default: 20)

```
Example: "Recommend tracks similar to Bonobo"
Example: "Find tracks like 'Midnight City' by M83"
```

**Returns:** Formatted recommendations with library status, preview links, and next steps.

---

#### `discover_albums`
Get album recommendations.

**Parameters:**
- `seed_artist` (optional): Artist to base recommendations on
- `seed_genre` (optional): Genre for recommendations
- `limit` (optional): Number of albums (default: 10)

```
Example: "Recommend new electronic albums"
Example: "Find albums similar to Tycho"
```

---

#### `discover_artists`
Get similar artist recommendations.

**Parameters:**
- `seed_artist` (required): Artist name
- `limit` (optional): Number of artists (default: 10)

```
Example: "Find artists similar to Four Tet"
```

---

#### `discover_generate_playlist`
Generate a discovery playlist concept (your library + new recommendations).

**Parameters:**
- `theme` (required): Playlist theme or description
- `include_library_tracks` (optional): Include tracks from your library (default: true)
- `new_track_count` (optional): Number of new tracks to suggest (default: 15)

```
Example: "Create a late-night ambient playlist"
Example: "Build a workout playlist with high-energy electronic music"
```

**Returns:** 
- Playlist concept with theme description
- Tracks from your library that fit
- New track recommendations with preview links
- Step-by-step instructions for creating the playlist

**Note:** This generates recommendations only. You must:
1. Preview the suggested tracks using Apple Music links
2. Add your favorites to your library
3. Use `playlist_create` and `playlist_add_tracks` to build the actual playlist

---

## Usage Examples

### Basic Library Management

**Check what's playing:**
```
You: "What am I listening to?"
Claude: Currently playing: "Karma Police" by Radiohead
        Album: OK Computer, Duration: 4:21, Position: 1:32
```

**Search your library:**
```
You: "Find all Radiohead songs in my library"
Claude: Found 23 tracks by Radiohead in your library:
        1. Karma Police - OK Computer
        2. Paranoid Android - OK Computer
        3. No Surprises - OK Computer
        ...
```

**Browse your collection:**
```
You: "Show me all my playlists"
Claude: You have 12 playlists:
        1. Morning Coffee (42 tracks)
        2. Focus (87 tracks)
        3. Road Trip (156 tracks)
        ...
```

---

### Creating Playlists

**From your library:**
```
You: "Create a playlist called '90s Alternative' and add some Radiohead and Nirvana tracks"

Claude: [Creates playlist, searches for tracks, adds them]
        
        Added to "90s Alternative":
        ✓ Karma Police - Radiohead
        ✓ Paranoid Android - Radiohead
        ✓ Smells Like Teen Spirit - Nirvana
        ✓ Come As You Are - Nirvana
        
        Playlist created with 4 tracks!
```

**Managing existing playlists:**
```
You: "What's in my Focus playlist?"
Claude: Your "Focus" playlist has 87 tracks:
        1. Awake - Tycho
        2. Breathe - Floating Points
        ...

You: "Remove all the Bon Iver tracks"
Claude: Removed 4 tracks: Holocene, Woods, Perth, Re: Stacks
        "Focus" now has 83 tracks.
```

---

### Discovery Workflows

**Find similar artists:**
```
You: "Find me artists similar to Boards of Canada"

Claude: 🎵 DISCOVERY MODE - SIMILAR ARTISTS
        ========================================
        
        Artists similar to: Boards of Canada
        
        1. **Tycho**
           - Sample: "Awake" from Awake
           - Genres: Electronic, Ambient
           - [Preview in Apple Music →](https://music.apple.com/...)
        
        2. **Ólafur Arnalds**
           - Sample: "Near Light" from re:member
           - [Preview in Apple Music →](https://music.apple.com/...)
        
        3. **Jon Hopkins**
           - Sample: "Open Eye Signal" from Immunity
           - [Preview in Apple Music →](https://music.apple.com/...)
        
        📋 NEXT STEPS:
        1. Click "Preview →" to explore each artist
        2. Use discover_tracks to get more from artists you like
        3. Add tracks to your library, then create playlists
```

**Get track recommendations:**
```
You: "I like Bonobo. Recommend similar tracks."

Claude: 🎵 DISCOVERY MODE - TRACK RECOMMENDATIONS
        ========================================
        
        Based on artist: "Bonobo"
        Found 20 recommendation(s):
        
        1. **Breathe** by Floating Points
           - Album: Crush
           - Duration: 9:03
           - [Preview →](https://music.apple.com/...)
           - ID: `1440933547`
        
        2. **Home** by Ólafur Arnalds
           - Album: re:member
           - Duration: 4:47
           - [Preview →](https://music.apple.com/...)
        
        📋 NEXT STEPS:
        1. Click "Preview →" links to listen
        2. Add favorites to your library
        3. Use playlist_add_tracks to create playlists
```

**Discover albums:**
```
You: "Recommend new ambient albums"

Claude: 🎵 DISCOVERY MODE - ALBUM RECOMMENDATIONS
        
        Based on: ambient
        Found 10 album(s):
        
        1. **Immunity** by Jon Hopkins
           - Released: 2013-06-04
           - Genres: Electronic, Ambient
           - [Preview →](https://music.apple.com/...)
        
        2. **Crush** by Floating Points
           - Released: 2019-10-18
           - [Preview →](https://music.apple.com/...)
```

---

### Hybrid Playlists (Library + Discovery)

**Extend existing playlist with new tracks:**
```
You: "Take my 'Focus' playlist and suggest 10 new tracks that would fit"

Claude: [Analyzes your Focus playlist]
        I see mostly ambient/electronic tracks by Tycho, Jon Hopkins, The xx.
        
        🎵 RECOMMENDATIONS:
        
        1. **Neon Pattern Drum** by Nils Frahm
           - [Preview →](https://music.apple.com/...)
        
        2. **Embers** by Kiasmos
           - [Preview →](https://music.apple.com/...)
        
        📋 HOW TO ADD TO YOUR PLAYLIST:
        1. Preview the tracks above
        2. Manually add favorites to your library in Apple Music
        3. Tell me which ones you added, and I'll add them to "Focus"

You: "I added the first 5 tracks. Add them to my Focus playlist."

Claude: Added to "Focus":
        ✓ Neon Pattern Drum - Nils Frahm
        ✓ Embers - Kiasmos
        ✓ Swim - Caribou
        ✓ By Your Side - Sonder
        ✓ Glue - Bicep
        
        Your "Focus" playlist now has 88 tracks!
```

**Create discovery playlist from scratch:**
```
You: "Build me a late-night ambient playlist"

Claude: 🎵 DISCOVERY MODE - PLAYLIST CONCEPT
        ========================================
        
        Theme: "late night ambient"
        
        ## FROM YOUR LIBRARY (5 tracks):
        1. Dayvan Cowboy - Boards of Canada
        2. Awake - Tycho
        3. Intro - The xx
        4. Breathe - Floating Points
        5. Holocene - Bon Iver
        
        ## NEW RECOMMENDATIONS (15 tracks):
        
        1. **re: stacks** by Bon Iver
           - [Preview →](https://music.apple.com/...)
        
        2. **Nuvole Bianche** by Ludovico Einaudi
           - [Preview →](https://music.apple.com/...)
        
        📋 HOW TO CREATE THIS PLAYLIST:
        1. Preview the tracks using links above
        2. Add favorites to your library in Apple Music
        3. Create playlist: "Create a playlist called 'Late Night Ambient'"
        4. Add tracks: "Add [track names] to Late Night Ambient"

You: "Create a playlist called 'Late Night Ambient'"
Claude: Created playlist "Late Night Ambient"

You: "Add Dayvan Cowboy, Awake, Intro, and the Ludovico track I just added"
Claude: Added 4 tracks to "Late Night Ambient" ✓
```

---

### Tips & Best Practices

**Efficient discovery workflow:**
```
1. Discover  → Get recommendations from Claude
2. Preview   → Click Apple Music links to listen
3. Add       → Manually add favorites to your library
4. Organize  → Use playlist tools to curate
```

**Batch operations:**
```
You: "Create a playlist called 'Summer 2024' with these 10 tracks: [list]"
Claude: [Creates playlist and adds all tracks at once]
```

**Smart searching:**
```
"Find ambient tracks by Tycho"
"Show me albums from 2023"
"Search for tracks with 'love' in the title"
```

**Check what you already have:**
```
You: "I'm thinking about adding OK Computer. Which tracks do I already have?"

Claude: From **OK Computer** by Radiohead:
        ✓ Already have: Karma Police, Paranoid Android, No Surprises
        [ ] Don't have: Subterranean Homesick Alien, Exit Music
```

**Genre exploration:**
```
You: "I want to explore downtempo. Show me what I have and suggest new artists."

Claude: From your library (15 tracks):
        - Bonobo (7 tracks)
        - Nightmares on Wax (4 tracks)
        - Thievery Corporation (3 tracks)
        
        [Suggests similar artists with preview links]
```

---

## Configuration

### Environment Variables

```bash
# Apple Music API (optional - for discovery features)
APPLE_MUSIC_DEVELOPER_TOKEN="your-jwt-token"
APPLE_MUSIC_STOREFRONT="us"

# Logging (optional)
MUSIC_MCP_LOG_LEVEL="info"           # debug, info, warn, error
MUSIC_MCP_LOG_FILE="~/Library/Logs/music-mcp.log"
```

### Timeouts & Limits

These have sensible defaults but can be overridden:

```bash
MUSIC_MCP_TIMEOUT_SECONDS="30"        # AppleScript timeout
MUSIC_MCP_MAX_SEARCH_RESULTS="100"    # Max library search results
MUSIC_MCP_CACHE_TTL="300"             # API response cache (seconds)
```

---

## Philosophy: Intentional Music Discovery

This MCP is designed for **conscious music curation**, not passive consumption.

### Why Discovery Tools Don't Auto-Add

Discovery tools return **recommendations with preview links**, not automatic library modifications. This is intentional:

1. **Engagement** - You click, listen, decide
2. **Context** - You learn about artist, album, story
3. **Curation** - Every track in your library is a conscious choice
4. **Quality** - Your playlists reflect your actual taste, not algorithms

This isn't a limitation—it's a feature that respects your relationship with music.

### The Workflow

```
1. 🎵 Discover  → Claude gives you recommendations
2. 👂 Preview   → You listen via Apple Music links  
3. ❤️ Add      → You add favorites to your library
4. 📚 Curate   → Claude helps organize into playlists
```

Every track you add is a deliberate choice. Every playlist tells a story.

---

## Troubleshooting

### "Music app is not running"

Launch Apple Music and try again. The app must be open for library operations.

### "Automation permission denied"

Grant permissions: **System Settings → Privacy & Security → Automation → Claude → Music.app** ✓

### "Discovery features not available"

Set `APPLE_MUSIC_DEVELOPER_TOKEN` in your Claude Desktop config. See [Apple Music API Setup](#apple-music-api-setup).

### "Track not found in library"

The track must be in your library to add to playlists. For discovery tracks:
1. Preview the track using the Apple Music link
2. Add it to your library manually or ask Claude to add it
3. Then add it to playlists

### Logs

Check logs for detailed error info:

```bash
tail -f ~/Library/Logs/music-mcp.log
```

Set `MUSIC_MCP_LOG_LEVEL="debug"` for verbose output.

---

## Development

### Building

```bash
git clone https://github.com/pdrbrnd/music-mcp.git
cd music-mcp
pnpm install
pnpm build
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests (requires Music app)
pnpm test:e2e

# Test with MCP Inspector
pnpm inspector
```

### Local Development

Point Claude Desktop to your local build:

```json
{
  "mcpServers": {
    "music": {
      "command": "node",
      "args": ["/path/to/music-mcp/dist/index.js"],
      "env": {
        "MUSIC_MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

---

## Credits

Originally forked from [macos-automator-mcp](https://github.com/original/repo) but heavily refactored with a new philosophy focused on intentional music discovery and library management.

## License

MIT

## Support

- **Issues:** https://github.com/pdrbrnd/music-mcp/issues
- **Discussions:** https://github.com/pdrbrnd/music-mcp/discussions

---

**Made with ❤️ for mindful music lovers**