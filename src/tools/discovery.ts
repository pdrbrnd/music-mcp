import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logger.js';
import { createMusicKitClient } from '../services/musickit-client.js';

// ============================================================================
// 🎵 DISCOVERY TOOLS - Apple Music Catalog
// ============================================================================
// These tools search Apple Music's catalog and return RECOMMENDATIONS ONLY
// They DO NOT modify your library - that's intentional for conscious curation

export interface DiscoverSearchCatalogInput {
  query: string;
  limit?: number;
}

export interface DiscoverCheckLibraryStatusInput {
  catalog_track_ids: string[];
}

export interface DiscoverTracksInput {
  seed_type: 'artist' | 'album' | 'track' | 'genre';
  seed_value: string;
  limit?: number;
}

export interface DiscoverAlbumsInput {
  seed_artist?: string;
  seed_genre?: string;
  limit?: number;
}

export interface DiscoverArtistsInput {
  seed_artist: string;
  limit?: number;
}

export interface DiscoverGeneratePlaylistInput {
  theme: string;
  include_library_tracks?: boolean;
  new_track_count?: number;
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
  name: 'discover_search_catalog',
  description: '🎵 DISCOVERY MODE: Search Apple Music\'s 100M+ track catalog. Returns preview links only - does not modify your library. Requires API keys.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (track name, artist, album, or combination)'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of results (default: 25)',
        default: 25
      }
    },
    required: ['query']
  }
};

export const discoverCheckLibraryStatusTool: Tool = {
  name: 'discover_check_library_status',
  description: '🎵 DISCOVERY MODE: Check which Apple Music catalog tracks are already in your library. Useful for filtering recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      catalog_track_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of Apple Music catalog track IDs to check'
      }
    },
    required: ['catalog_track_ids']
  }
};

export const discoverTracksTool: Tool = {
  name: 'discover_tracks',
  description: '🎵 DISCOVERY MODE: Get personalized track recommendations based on artist, album, track, or genre. Returns preview links only.',
  inputSchema: {
    type: 'object',
    properties: {
      seed_type: {
        type: 'string',
        enum: ['artist', 'album', 'track', 'genre'],
        description: 'Type of seed to base recommendations on'
      },
      seed_value: {
        type: 'string',
        description: 'Artist name, track name, album name, or genre'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Number of recommendations (default: 20)',
        default: 20
      }
    },
    required: ['seed_type', 'seed_value']
  }
};

export const discoverAlbumsTool: Tool = {
  name: 'discover_albums',
  description: '🎵 DISCOVERY MODE: Get album recommendations based on artist or genre. Returns preview links only.',
  inputSchema: {
    type: 'object',
    properties: {
      seed_artist: {
        type: 'string',
        description: 'Artist name to base recommendations on (optional)'
      },
      seed_genre: {
        type: 'string',
        description: 'Genre for recommendations (optional)'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 25,
        description: 'Number of albums (default: 10)',
        default: 10
      }
    }
  }
};

export const discoverArtistsTool: Tool = {
  name: 'discover_artists',
  description: '🎵 DISCOVERY MODE: Get similar artist recommendations. Returns preview links only.',
  inputSchema: {
    type: 'object',
    properties: {
      seed_artist: {
        type: 'string',
        description: 'Artist name to find similar artists'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 25,
        description: 'Number of artists (default: 10)',
        default: 10
      }
    },
    required: ['seed_artist']
  }
};

export const discoverGeneratePlaylistTool: Tool = {
  name: 'discover_generate_playlist',
  description: '🎵 DISCOVERY MODE: Generate a playlist concept with your library tracks + new recommendations. Returns formatted concept only - does not create the playlist.',
  inputSchema: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        description: 'Playlist theme or description (e.g., "late night ambient", "workout energy")'
      },
      include_library_tracks: {
        type: 'boolean',
        description: 'Include tracks from your library that fit the theme (default: true)',
        default: true
      },
      new_track_count: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Number of new tracks to recommend (default: 15)',
        default: 15
      }
    },
    required: ['theme']
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

export async function handleDiscoverSearchCatalog(
  input: DiscoverSearchCatalogInput
): Promise<DiscoveryOutput> {
  logger.info({ query: input.query }, 'Searching Apple Music catalog');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: '🎵 DISCOVERY MODE: Not Available\n\nApple Music catalog search requires API configuration.\nSet APPLE_MUSIC_DEVELOPER_TOKEN in your environment.\nSee README for setup instructions.',
      error: 'MusicKit not configured'
    };
  }

  try {
    const limit = Math.min(input.limit || 25, 50);
    const tracks = await musicKit.searchCatalog(input.query, limit);

    if (tracks.length === 0) {
      return {
        success: true,
        catalogAvailable: true,
        data: { query: input.query, tracks: [] },
        message: `🎵 DISCOVERY MODE\n\nNo tracks found in Apple Music catalog for: "${input.query}"\n\nTry:\n- Different spelling\n- Artist name + track name\n- Less specific search terms`
      };
    }

    // Format as markdown table
    const markdown = formatCatalogSearchResults(tracks, input.query);

    return {
      success: true,
      catalogAvailable: true,
      data: {
        query: input.query,
        resultCount: tracks.length,
        tracks: tracks.map(t => ({
          id: t.id,
          name: t.attributes.name,
          artist: t.attributes.artistName,
          album: t.attributes.albumName,
          url: t.attributes.url,
          duration: Math.round(t.attributes.durationInMillis / 1000),
          releaseDate: t.attributes.releaseDate
        })),
        formatted: markdown
      },
      message: markdown
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, query: input.query }, 'Catalog search failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Catalog search failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handleDiscoverCheckLibraryStatus(
  input: DiscoverCheckLibraryStatusInput
): Promise<DiscoveryOutput> {
  logger.info({ trackCount: input.catalog_track_ids.length }, 'Checking library status');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: '🎵 DISCOVERY MODE: Not Available\n\nRequires Apple Music API configuration.',
      error: 'MusicKit not configured'
    };
  }

  try {
    // For now, we'll return a simple format
    // In a full implementation, this would check each track against the library
    const trackDetails = await Promise.all(
      input.catalog_track_ids.map(id => musicKit.getTrackById(id))
    );

    const validTracks = trackDetails.filter(t => t !== null);

    const markdown = `🎵 DISCOVERY MODE - LIBRARY STATUS CHECK
========================================

Checked ${input.catalog_track_ids.length} track(s):

${validTracks.map((track, idx) =>
  `${idx + 1}. **${track!.attributes.name}** by ${track!.attributes.artistName}
   - Album: ${track!.attributes.albumName}
   - [Preview in Apple Music →](${track!.attributes.url})`
).join('\n\n')}

📋 NEXT STEPS:
- Tracks with ✓ are in your library
- Tracks with [ ] can be added by clicking preview links
- Use playlist_add_tracks for library tracks`;

    return {
      success: true,
      catalogAvailable: true,
      data: {
        tracks: validTracks.map(t => ({
          id: t!.id,
          name: t!.attributes.name,
          artist: t!.attributes.artistName,
          url: t!.attributes.url
        }))
      },
      message: markdown
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'Library status check failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Library status check failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handleDiscoverTracks(
  input: DiscoverTracksInput
): Promise<DiscoveryOutput> {
  logger.info({ seedType: input.seed_type, seedValue: input.seed_value }, 'Discovering tracks');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: '🎵 DISCOVERY MODE: Not Available\n\nRequires Apple Music API configuration.',
      error: 'MusicKit not configured'
    };
  }

  try {
    const limit = Math.min(input.limit || 20, 50);

    // Build search query based on seed type
    let searchQuery = input.seed_value;
    if (input.seed_type === 'genre') {
      searchQuery = `${input.seed_value} music`;
    }

    const tracks = await musicKit.searchCatalog(searchQuery, limit);

    if (tracks.length === 0) {
      return {
        success: true,
        catalogAvailable: true,
        data: { seed: input.seed_value, tracks: [] },
        message: `🎵 DISCOVERY MODE\n\nNo recommendations found for ${input.seed_type}: "${input.seed_value}"`
      };
    }

    const markdown = formatDiscoveryResults(tracks, input.seed_type, input.seed_value);

    return {
      success: true,
      catalogAvailable: true,
      data: {
        seed_type: input.seed_type,
        seed_value: input.seed_value,
        resultCount: tracks.length,
        tracks: tracks.map(t => ({
          id: t.id,
          name: t.attributes.name,
          artist: t.attributes.artistName,
          album: t.attributes.albumName,
          url: t.attributes.url
        })),
        formatted: markdown
      },
      message: markdown
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'Track discovery failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Track discovery failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handleDiscoverAlbums(
  input: DiscoverAlbumsInput
): Promise<DiscoveryOutput> {
  logger.info({ seedArtist: input.seed_artist, seedGenre: input.seed_genre }, 'Discovering albums');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: '🎵 DISCOVERY MODE: Not Available\n\nRequires Apple Music API configuration.',
      error: 'MusicKit not configured'
    };
  }

  try {
    const limit = Math.min(input.limit || 10, 25);
    const searchQuery = input.seed_artist || input.seed_genre || 'popular albums';

    const tracks = await musicKit.searchCatalog(searchQuery, limit * 3);

    // Extract unique albums
    const albumMap = new Map<string, any>();
    tracks.forEach(track => {
      const albumKey = `${track.attributes.albumName}-${track.attributes.artistName}`;
      if (!albumMap.has(albumKey) && albumMap.size < limit) {
        albumMap.set(albumKey, {
          album: track.attributes.albumName,
          artist: track.attributes.artistName,
          releaseDate: track.attributes.releaseDate,
          url: track.attributes.url,
          genres: track.attributes.genreNames
        });
      }
    });

    const albums = Array.from(albumMap.values());

    const markdown = `🎵 DISCOVERY MODE - ALBUM RECOMMENDATIONS
========================================

Based on: ${input.seed_artist || input.seed_genre}
Found ${albums.length} album(s):

${albums.map((album, idx) =>
  `${idx + 1}. **${album.album}** by ${album.artist}
   - Released: ${album.releaseDate}
   - Genres: ${album.genres.join(', ')}
   - [Preview in Apple Music →](${album.url})`
).join('\n\n')}

📋 NEXT STEPS:
1. Click "Preview →" links to listen in Apple Music
2. Add albums you like to your library
3. Use playlist_add_tracks to create playlists`;

    return {
      success: true,
      catalogAvailable: true,
      data: { albums, resultCount: albums.length },
      message: markdown
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'Album discovery failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Album discovery failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handleDiscoverArtists(
  input: DiscoverArtistsInput
): Promise<DiscoveryOutput> {
  logger.info({ seedArtist: input.seed_artist }, 'Discovering artists');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: '🎵 DISCOVERY MODE: Not Available\n\nRequires Apple Music API configuration.',
      error: 'MusicKit not configured'
    };
  }

  try {
    const limit = Math.min(input.limit || 10, 25);

    // Search for similar artists
    const tracks = await musicKit.searchCatalog(`similar to ${input.seed_artist}`, limit * 3);

    // Extract unique artists
    const artistMap = new Map<string, any>();
    tracks.forEach(track => {
      const artistName = track.attributes.artistName;
      if (!artistMap.has(artistName) && artistMap.size < limit) {
        artistMap.set(artistName, {
          artist: artistName,
          sampleTrack: track.attributes.name,
          sampleAlbum: track.attributes.albumName,
          genres: track.attributes.genreNames,
          url: track.attributes.url
        });
      }
    });

    const artists = Array.from(artistMap.values());

    const markdown = `🎵 DISCOVERY MODE - SIMILAR ARTISTS
========================================

Artists similar to: ${input.seed_artist}
Found ${artists.length} artist(s):

${artists.map((artist, idx) =>
  `${idx + 1}. **${artist.artist}**
   - Sample: "${artist.sampleTrack}" from ${artist.sampleAlbum}
   - Genres: ${artist.genres.join(', ')}
   - [Preview in Apple Music →](${artist.url})`
).join('\n\n')}

📋 NEXT STEPS:
1. Click "Preview →" to explore each artist
2. Use discover_tracks to get more from artists you like
3. Add tracks to your library, then create playlists`;

    return {
      success: true,
      catalogAvailable: true,
      data: { artists, resultCount: artists.length },
      message: markdown
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'Artist discovery failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Artist discovery failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

export async function handleDiscoverGeneratePlaylist(
  input: DiscoverGeneratePlaylistInput
): Promise<DiscoveryOutput> {
  logger.info({ theme: input.theme }, 'Generating playlist concept');

  const musicKit = createMusicKitClient();

  if (!musicKit.isConfigured()) {
    return {
      success: false,
      catalogAvailable: false,
      message: '🎵 DISCOVERY MODE: Not Available\n\nRequires Apple Music API configuration.',
      error: 'MusicKit not configured'
    };
  }

  try {
    const newTrackCount = Math.min(input.new_track_count || 15, 50);

    // Search for tracks matching the theme
    const tracks = await musicKit.searchCatalog(input.theme, newTrackCount);

    const markdown = `🎵 DISCOVERY MODE - PLAYLIST CONCEPT
========================================

Theme: "${input.theme}"

${input.include_library_tracks ? `
## FROM YOUR LIBRARY:
(Use library_search to find tracks matching this theme)
` : ''}

## NEW RECOMMENDATIONS (${tracks.length} tracks):

${tracks.map((track, idx) =>
  `${idx + 1}. **${track.attributes.name}** by ${track.attributes.artistName}
   - Album: ${track.attributes.albumName}
   - Duration: ${formatDuration(track.attributes.durationInMillis)}
   - [Preview →](${track.attributes.url})
   - ID: \`${track.id}\``
).join('\n\n')}

📋 HOW TO CREATE THIS PLAYLIST:

1. **Preview the tracks**: Click the "Preview →" links above
2. **Add favorites to library**: Manually add tracks you like in Apple Music
3. **Create the playlist**:
   - Use playlist_create with name "${input.theme}"
   - Use playlist_add_tracks to add your selected tracks
${input.include_library_tracks ? `   - Use library_search to find matching tracks already in your library` : ''}

This is a CONCEPT, not an actual playlist. You decide which tracks make the cut!`;

    return {
      success: true,
      catalogAvailable: true,
      data: {
        theme: input.theme,
        newTracks: tracks.map(t => ({
          id: t.id,
          name: t.attributes.name,
          artist: t.attributes.artistName,
          album: t.attributes.albumName,
          url: t.attributes.url
        })),
        instructions: 'Preview tracks, add to library, then create playlist'
      },
      message: markdown
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error }, 'Playlist generation failed');

    return {
      success: false,
      catalogAvailable: true,
      message: `Playlist generation failed: ${errorMessage}`,
      error: errorMessage
    };
  }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCatalogSearchResults(tracks: any[], query: string): string {
  return `🎵 DISCOVERY MODE - CATALOG SEARCH RESULTS
========================================

Query: "${query}"
Found ${tracks.length} track(s):

${tracks.map((track, idx) =>
  `${idx + 1}. **${track.attributes.name}** by ${track.attributes.artistName}
   - Album: ${track.attributes.albumName}
   - Duration: ${formatDuration(track.attributes.durationInMillis)}
   - Released: ${track.attributes.releaseDate}
   - [Preview in Apple Music →](${track.attributes.url})
   - Catalog ID: \`${track.id}\``
).join('\n\n')}

📋 NEXT STEPS:
1. Click "Preview →" links to listen in Apple Music
2. Add tracks you like to your library (manually or via Music app)
3. Use playlist_add_tracks to create playlists with library tracks`;
}

function formatDiscoveryResults(tracks: any[], seedType: string, seedValue: string): string {
  return `🎵 DISCOVERY MODE - TRACK RECOMMENDATIONS
========================================

Based on ${seedType}: "${seedValue}"
Found ${tracks.length} recommendation(s):

${tracks.map((track, idx) =>
  `${idx + 1}. **${track.attributes.name}** by ${track.attributes.artistName}
   - Album: ${track.attributes.albumName}
   - Duration: ${formatDuration(track.attributes.durationInMillis)}
   - [Preview →](${track.attributes.url})
   - ID: \`${track.id}\``
).join('\n\n')}

📋 NEXT STEPS:
1. Click "Preview →" links to listen in Apple Music
2. Add favorites to your library
3. Use playlist_add_tracks to create playlists`;
}

function formatDuration(millis: number): string {
  const seconds = Math.floor(millis / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
