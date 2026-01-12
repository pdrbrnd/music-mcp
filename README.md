# Music MCP

A Model Context Protocol (MCP) server for Apple Music on macOS. Manage your music library and let Claude recommend music based on your taste.

## What This Does

This MCP has two distinct modes:

### 📚 Your Library (No API Keys Needed)
- Browse and search your music library (tracks, albums, artists, playlists)
- Create and manage playlists from your owned tracks
- View what's currently playing

### 🎵 Discovery (Requires Apple Music API)

**Claude generates personalized recommendations based on your taste profile, then searches Apple Music's catalog to find those tracks.**

This is NOT using Apple's recommendation APIs. Claude uses its own knowledge and understanding of your taste to suggest music, then uses these tools to:
- Search Apple Music's catalog for specific tracks/artists
- Check which tracks are already in your library
- Present results with preview links and catalog IDs

**Workflow:**
1. You ask Claude for recommendations (e.g., "recommend microhouse artists like Villalobos")
2. Claude generates recommendations based on its knowledge and your taste
3. Claude searches Apple Music catalog for each recommendation
4. Claude presents formatted results with preview links
5. You preview tracks, add favorites to your library manually
6. Use library tools to create playlists with your selected tracks

**No automatic modifications.** You stay in control of what enters your library.

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

> "Recommend me artists similar to Floating Points based on my taste"

> "Create a microhouse playlist for focusing - recommend some tracks"

> "Find the track 'Cumbia del Mar' by Nicola Cruz in Apple Music"

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

**Returns:** Track details including:
- Title, artist, album
- Duration (in seconds) - useful for creating time-based playlists
- Genre - useful for filtering by style
- Year - useful for chronological sorting

```
Example: "Find all Radiohead tracks in my library"
Example: "Search my library for jazz albums"
Example: "Find energetic tracks for a 30-minute playlist"
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

**Important:** These tools don't generate recommendations. Claude does that based on its knowledge and your taste profile. These tools just search Apple Music's catalog for the tracks Claude recommends.

#### `discover_search_catalog`
Search Apple Music's catalog for specific tracks, albums, or artists.

**Parameters:**
- `query` (required): Search term (artist name, track name, or "artist - track")
- `limit` (optional): Max results (default: 5)

**How Claude should use this:**
1. Generate recommendations based on user's taste
2. Call this tool for each recommendation
3. Format results with preview links and catalog IDs

```
Example workflow:
User: "Recommend microhouse tracks for focusing"
Claude thinks: "Based on their taste, I'll recommend Villalobos, Ricardo Villalobos, Zip..."
Claude calls: discover_search_catalog("Villalobos Fizheuer Zieheuer")
Claude calls: discover_search_catalog("Ricardo Villalobos Dexter")
etc.
```

**Returns:** Track details with:
- Track names, artists, albums
- Apple Music preview links
- Catalog IDs
- Duration and release info

---

#### `discover_check_library_status`
Check which catalog tracks are already in the user's library.

**Parameters:**
- `catalog_track_ids` (required): Array of Apple Music catalog IDs

**Use after searching to filter out tracks the user already has.**

```
Example: After searching for 10 tracks, check which ones are new vs. already owned
```

**Returns:** Track details with preview links

---

## For Claude: How to Use These Tools

**You are Claude, and this MCP lets you help users discover and organize music.**

### Core Principle

**YOU generate recommendations based on your knowledge of music and the user's taste. These tools just search Apple Music's catalog for the tracks YOU recommend.**

Do NOT use these tools to "discover" or "recommend" music. That's YOUR job. Use these tools to:
1. Search Apple Music for tracks/artists YOU recommend
2. Check if tracks are already in the user's library
3. Manage playlists with library tracks

### Recommendation Workflow

When a user asks for recommendations:

1. **Generate recommendations yourself** based on:
   - Your knowledge of music, genres, and artists
   - The user's stated taste profile
   - Similar artists/tracks they mention
   - Context (mood, activity, energy level)

2. **Search Apple Music** for each recommendation:
   ```
   Call: discover_search_catalog("Villalobos Fizheuer Zieheuer")
   Call: discover_search_catalog("Ricardo Villalobos Dexter")
   ```

3. **Present formatted results** with:
   - Track details
   - Preview links
   - Catalog IDs
   - Brief explanation of why it fits

4. **Guide next steps**:
   - "Preview these tracks and add your favorites to Apple Music"
   - "Once added, I can help create a playlist"

### Example Request Types

**"Recommend artists similar to X"**
- YOU think of similar artists based on your knowledge
- Search catalog for tracks by those artists
- Present with explanations

**"Create a [mood] playlist for [activity]"**
- Search user's library for matching tracks
- YOU recommend additional tracks that fit
- Search catalog for your recommendations
- Present curated list

**"Find this specific track"**
- Search catalog directly
- Present results

### What NOT to Do

❌ Don't say "Let me discover tracks for you"
❌ Don't rely on Apple's recommendation APIs (they're not available)
❌ Don't use discover tools to generate recommendations

✅ Do use your knowledge to recommend
✅ Do use discover tools to search for what YOU recommend
✅ Do explain WHY you're recommending each track/artist

---

## Usage Examples

### Your Taste Profile

Keep the user's music taste in your context/memory. This might include:
- Favorite genres (e.g., "microhouse, ambient, world music, downtempo")
- Favorite artists (e.g., "Villalobos, Nicola Cruz, Floating Points, Nils Frahm")
- Musical characteristics you like (e.g., "atmospheric, minimal, organic sounds, no vocals")
- What you use music for (e.g., "focusing while coding, cooking, relaxing")

With this context, Claude can generate personalized recommendations without relying on Apple's algorithms.

**Tip:** See `examples/taste-profile-template.md` for a complete taste profile template you can fill out and include in your Claude Project instructions.

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

**Important:** Claude generates these recommendations based on its knowledge and your taste profile, then searches Apple Music to find the tracks.

**Recommend similar artists:**
```
You: "Recommend artists similar to Floating Points based on my taste"

Claude: Based on your taste for ambient/electronic and artists like Floating Points,
        here are some recommendations:
        
        1. **Nils Frahm** - Piano-based electronic, atmospheric
        2. **Jon Hopkins** - Intricate electronic production, emotional depth
        3. **Kiasmos** - Minimal techno with organic elements
        4. **Ólafur Arnalds** - Neo-classical electronic fusion
        5. **Four Tet** - Experimental electronic, textural
        
        Let me search Apple Music for these artists...
        
        [Calls discover_search_catalog for each artist]
        
        🎵 FOUND IN APPLE MUSIC:
        
        1. **Nils Frahm - All Melody**
           [Preview →](https://music.apple.com/...)
           Catalog ID: `1234567890`
        
        2. **Jon Hopkins - Immunity**
           [Preview →](https://music.apple.com/...)
           Catalog ID: `0987654321`
        
        📋 NEXT STEPS:
        1. Click preview links to listen
        2. Add tracks you like to your Apple Music library
        3. Let me know which ones you added, I'll help create a playlist
```

**Recommend tracks for a specific mood/activity:**
```
You: "Recommend microhouse tracks for deep focus coding sessions"

Claude: Perfect! Based on your taste for minimal, hypnotic electronic music,
        here are some microhouse classics:
        
        1. "Fizheuer Zieheuer" - Villalobos
        2. "Dexter" - Ricardo Villalobos
        3. "Knight Moves" - Zip
        4. "Mental Madness Music" - Luciano
        5. "The Long Tomorrow" - Petre Inspirescu
        
        Searching Apple Music...
        
        🎵 APPLE MUSIC CATALOG SEARCH
        ========================================
        
        Found: 5 results
        
        1. **Fizheuer Zieheuer**
           Artist: Villalobos
           Album: Alcachofa
           Duration: 11:32
           [Preview in Apple Music →](https://music.apple.com/...)
           Catalog ID: `abc123`
        
        2. **Dexter**
           Artist: Ricardo Villalobos
           Duration: 9:47
           [Preview →](https://music.apple.com/...)
           Catalog ID: `def456`
        
        These are perfect for deep focus - repetitive grooves, minimal vocals,
        hypnotic patterns. Preview them and let me know which ones to add!
```

**Find a specific track:**
```
You: "Find 'Cumbia del Mar' by Nicola Cruz in Apple Music"

Claude: [Calls discover_search_catalog("Nicola Cruz Cumbia del Mar")]
        
        🎵 APPLE MUSIC CATALOG SEARCH
        ========================================
        
        Query: "Nicola Cruz Cumbia del Mar"
        Found: 1 result
        
        1. **Cumbia del Mar**
           Artist: Nicola Cruz
           Album: Prender el Alma
           Duration: 5:23
           Released: 2015-11-06
           [Preview in Apple Music →](https://music.apple.com/us/album/...)
           Catalog ID: `1234567890`
        
        Found it! Preview the track and add it to your library if you'd like.
```

---

### Hybrid Workflows (Library + Discovery)

**Extend existing playlist with new recommendations:**
```
You: "Look at my 'Moody' playlist and recommend a few extra tracks that would fit"

Claude: [Calls playlist_get_tracks to see what's in "Moody"]
        
        Your "Moody" playlist has tracks by:
        - The xx, FKA twigs, James Blake, Bon Iver, Portishead
        
        I can see this is melancholic, downtempo, atmospheric music.
        Here are some tracks that would fit perfectly:
        
        1. "Open Eye Signal" - Jon Hopkins (hypnotic, emotional electronic)
        2. "Holocene" - Volcano Choir (ambient, layered vocals)
        3. "Blue" - Joni Mitchell (classic melancholic folk)
        4. "Motion Picture Soundtrack" - Radiohead (haunting, sparse)
        5. "Re: Stacks" - Bon Iver (intimate, acoustic)
        
        Let me search Apple Music for these...
        
        [Searches catalog for each track]
        
        🎵 FOUND IN APPLE MUSIC:
        [Shows preview links and catalog IDs]
        
        Preview these and add your favorites to your library,
        then I can add them to your "Moody" playlist!

You: "I added tracks 1, 2, and 4. Add them to the playlist."

Claude: [Calls library_search to find the tracks you added]
        [Calls playlist_add_tracks]
        
        ✓ Added to "Moody":
        - Open Eye Signal - Jon Hopkins
        - Holocene - Volcano Choir
        - Motion Picture Soundtrack - Radiohead
        
        Your "Moody" playlist now has 23 tracks!
```

**Create new playlist from library + recommendations:**
```
You: "Create a world music playlist for cooking - use tracks from my library
      and recommend some new ones"

Claude: [Calls library_search("world")]
        
        Found in your library:
        - Cumbia del Mar - Nicola Cruz
        - Khaled - C'est La Vie
        - Buena Vista Social Club tracks
        - Ali Farka Touré - Savane
        
        Perfect! Here are some recommendations that fit this vibe:
        
        1. "Río" - Aterciopelados (Colombian rock/folk fusion)
        2. "Kaira" - Toumani Diabaté (Malian kora music)
        3. "Lhasa de Sela" - La Llorona (Folk with Latin influences)
        4. "Desert Blues" - Tinariwen (Tuareg rock)
        
        [Searches Apple Music catalog]
        
        Found 4 tracks - preview them and add your favorites!
        
        Once you've added them to your library, I'll create the
        "World Music Cooking" playlist with your library tracks
        plus the new ones you selected.
```

---

### Tips for Best Results

**1. Build Claude's understanding of your taste**

Tell Claude about your music preferences:
- "I love microhouse artists like Villalobos and Zip"
- "I'm into atmospheric downtempo - Bonobo, Emancipator, that vibe"
- "Show me melodic techno with organic sounds, no aggressive beats"

**2. Be specific about context**

- "Recommend workout music" → "High-energy techno for running, 140+ BPM"
- "Chill music" → "Downtempo electronic for Sunday morning coffee"
- "Focus music" → "Minimal ambient with no vocals for deep coding sessions"

**3. Reference artists/tracks as anchors**

- "Artists similar to Floating Points but more ambient"
- "Tracks like 'Cumbia del Mar' - organic, percussive, world music vibes"
- "Albums like Tycho's 'Dive' - warm, nostalgic synths"

**4. Iterate and refine**

- "That's too upbeat, give me something more subdued"
- "Perfect, but add more organic instrumentation"
- "More like track 2, less like track 5"

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