# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-13

### 🎯 Complete Rewrite - Claude-Driven Music Discovery

This is a complete architectural rewrite focused on **Claude generating recommendations** and using these tools to search Apple Music's catalog and manage your library.

**Core Philosophy:** Claude is the recommendation engine, not Apple Music. These tools are a bridge to Apple's catalog for tracks Claude recommends based on understanding your taste.

### Added

#### 📚 Library Tools (No API Keys Required)
- `library_get_current_track` - Get currently playing track information
- `library_search` - Search your library for tracks, albums, or artists
- `library_browse` - Browse your library by type (tracks, albums, artists, playlists)

#### 📚 Playlist Tools (No API Keys Required)
- `playlist_create` - Create new empty playlists
- `playlist_add_tracks` - Add multiple tracks from your library to a playlist
- `playlist_remove_tracks` - Remove multiple tracks from a playlist
- `playlist_rename` - Rename existing playlists
- `playlist_delete` - Delete playlists
- `playlist_get_tracks` - Get all tracks in a playlist

#### 🎵 Discovery Tools (Requires Apple Music API)
- `discover_search_catalog` - Search Apple Music's 100M+ track catalog
- `discover_check_library_status` - Check which catalog tracks are in your library
- `discover_tracks` - Get personalized track recommendations
- `discover_albums` - Get album recommendations
- `discover_artists` - Get similar artist recommendations
- `discover_generate_playlist` - Generate playlist concepts with your library + new tracks

#### Philosophy: Intentional Music Discovery
- Discovery tools return **recommendations with preview links only**
- No automatic library modifications - every track addition is a conscious choice
- Formatted markdown outputs with Apple Music deep links for previewing
- Clear "NEXT STEPS" guidance for turning recommendations into playlists
- Encourages engagement with music, artist context, and intentional curation

### Changed

- **Tool naming convention**: All tools now use descriptive prefixes (`library_*`, `playlist_*`, `discover_*`)
- **Output format**: Discovery tools return rich markdown-formatted recommendations
- **Error handling**: Clearer error messages and guidance for next steps
- **Documentation**: Complete README rewrite with usage examples and workflow guidance

### Removed

#### Playback Control (Intentionally Removed)
- ❌ `execute_music_command` - Play, pause, skip, volume control
- ❌ All playback-related AppleScript files
- **Why?** Playback control via MCP is gimmicky. MCPs excel at data access and curation, not UI control.

#### Queue Management (Intentionally Removed)
- ❌ `queue_music` - View queue, add to queue, play queue
- ❌ All queue-related AppleScript files
- **Why?** Queue state is ephemeral. Focus shifted to durable playlist management.

#### Old Tools (Replaced with Better Alternatives)
- ❌ `info` - Replaced by clear tool descriptions and error messages
- ❌ `get_music_info` - Split into focused `library_*` tools
- ❌ `search_music` - Replaced by `library_search` with clearer parameters
- ❌ `manage_playlist` - Split into dedicated `playlist_*` tools for each action
- ❌ `search_apple_music_catalog` - Renamed to `discover_search_catalog`
- ❌ `batch_catalog_search` - Merged into `discover_*` tools
- ❌ `add_catalog_track_to_library` - Removed (manual addition encouraged)

### Breaking Changes

- 🚨 **Complete API rewrite** - All tool names and parameters have changed
- 🚨 Tool responses now use consistent structure: `{ success, data, message, error? }`
- 🚨 Discovery tools include `catalogAvailable` flag in responses
- 🚨 Playlist operations now use arrays for batch track operations
- 🚨 Removed all playback and queue management functionality

### Migration Guide

#### Old → New Tool Mapping

**Playback Control** → ❌ Removed (use Music.app directly)
```
execute_music_command → Removed
```

**Library Info**
```
get_music_info(infoType: "current_track") → library_get_current_track()
get_music_info(infoType: "library_stats") → library_browse(type: ...)
```

**Search**
```
search_music(query, searchType) → library_search(query, type)
```

**Playlists**
```
manage_playlist(action: "create") → playlist_create(name)
manage_playlist(action: "list") → library_browse(type: "playlists")
manage_playlist(action: "add_track") → playlist_add_tracks(playlist_name, track_search_terms)
manage_playlist(action: "remove_track") → playlist_remove_tracks(playlist_name, track_search_terms)
manage_playlist(action: "rename") → playlist_rename(current_name, new_name)
manage_playlist(action: "delete") → playlist_delete(name)
manage_playlist(action: "get_tracks") → playlist_get_tracks(name)
```

**Discovery**
```
search_apple_music_catalog(query) → discover_search_catalog(query)
batch_catalog_search(tracks) → discover_tracks(seed_type, seed_value)
```

#### Updated Configuration

No changes to environment variables, but discovery features now have clearer "not configured" messaging.

### Technical Changes

- Consolidated tool handlers into focused modules: `library.ts`, `playlists.ts`, `discovery.ts`
- Removed 50%+ of codebase for better maintainability
- Updated tests to match new tool structure
- Improved TypeScript types for better IDE support
- Cleaner server.ts with organized tool registration

### Documentation

- Complete README rewrite with clear feature sections
- Added usage examples for common workflows
- Documented the intentional discovery philosophy
- Clear setup instructions for both library-only and discovery modes
- Troubleshooting section with common issues

---

**Note**: Version 2.0.0 represents a complete philosophical and architectural shift. If you need playback control, use version 1.x or control the Music app directly.
