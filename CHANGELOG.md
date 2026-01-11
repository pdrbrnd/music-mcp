# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-XX

### Added
- **Apple Music Catalog Search**: Full integration with Apple Music API (MusicKit) for searching 100M+ songs
- **Music Discovery**: New tools for discovering and adding music not in your library
- **New Tool: `search_apple_music_catalog`**: Search the full Apple Music catalog by track, artist, or album
- **New Tool: `add_catalog_track_to_library`**: Add catalog tracks to your library (requires user token)
- **Enhanced Playlist Management**: Added `add_catalog_track` action to `manage_playlist` tool
- **Automatic Catalog Fallback**: `add_track` can now automatically search catalog if track not found in library (with `useCatalogSearch: true`)
- **MusicKit Service**: New `musickit-client.ts` service for Apple Music API integration
- **Comprehensive Setup Guide**: Added `MUSICKIT_SETUP.md` with detailed instructions for MusicKit configuration
- **Enhanced Info Tool**: Added catalog configuration status to diagnostic output
- **Improved AppleScript**: New `add-to-playlist-enhanced.applescript` with multiple search strategies

### Changed
- **Migrated to pnpm**: Switched from npm to pnpm for package management
- **Updated Packaging**: Changed from `@anthropic-ai/dxt` to `@anthropic-ai/mcpb` for MCP bundle creation
- **Build Scripts**: Updated all scripts to use pnpm instead of npm
- **Configuration**: Added new environment variables for Apple Music API (`APPLE_MUSIC_DEVELOPER_TOKEN`, `APPLE_MUSIC_USER_TOKEN`, `APPLE_MUSIC_STOREFRONT`)
- **Manifest**: Updated from `dxt_version` to `mcpb_version` for modern MCP packaging
- **Documentation**: Comprehensive README updates with catalog search usage examples and setup instructions

### Technical Details
- Added MusicKit API client with JWT authentication support
- Implemented catalog search with automatic library fallback
- Enhanced error handling for catalog operations with helpful suggestions
- Added support for ES256 JWT tokens (required by Apple Music API)
- Improved search strategies with multiple fallback attempts
- Added sync delay handling for library additions

### Credits
- Forked from [pedrocid/music-mcp](https://github.com/pedrocid/music-mcp) by Pedro Cid
- Main enhancement: Apple Music catalog search for music discovery beyond local library

## [1.0.0] - 2024-12-19

### Added
- Initial release of Music MCP server
- Playback control tools (play, pause, next, previous, volume)
- Current track information retrieval
- Library management and search functionality
- Playlist creation and management
- Queue management capabilities
- Comprehensive AppleScript integration
- Robust error handling and logging with Pino
- Environment variable configuration
- Comprehensive test suite with Vitest
- Release preparation script with automated checks
- TypeScript support with full type definitions
- MCP SDK integration for Claude Desktop compatibility

### Features
- **Core Tools**: `info`, `execute_music_command`, `get_music_info`, `search_music`, `manage_playlist`
- **AppleScript Integration**: Full Apple Music app control via AppleScript
- **Configuration**: Environment-based configuration with sensible defaults
- **Logging**: Structured logging with file and console output options
- **Testing**: Unit and integration tests for all components
- **Documentation**: Comprehensive README and inline documentation

### Technical Details
- Node.js 18+ support
- TypeScript compilation with CommonJS output
- ESLint configuration for code quality
- Vitest for testing framework
- Pino for structured logging
- Comprehensive error handling
- Automated release preparation

### Requirements
- macOS (for Apple Music and AppleScript)
- Node.js 18.0.0 or higher
- Apple Music app
- Automation permissions for terminal application 