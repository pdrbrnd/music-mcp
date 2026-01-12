import { describe, it, expect, vi } from "vitest";
import {
  handleLibraryGetCurrentTrack,
  handleLibrarySearch,
  handleLibraryBrowse,
} from "../../src/tools/library.js";
import {
  handlePlaylistCreate,
  handlePlaylistAddTracks,
  handlePlaylistRemoveTracks,
  handlePlaylistRename,
  handlePlaylistDelete,
  handlePlaylistGetTracks,
} from "../../src/tools/playlists.js";
import {
  handleDiscoverSearchCatalog,
  handleDiscoverTracks,
  handleDiscoverAlbums,
} from "../../src/tools/discovery.js";

// Mock child_process execSync
vi.mock("child_process", () => ({
  execSync: vi.fn((cmd: string) => {
    // Mock responses based on command
    if (cmd.includes("get-current-track")) {
      return JSON.stringify({
        title: "Test Track",
        artist: "Test Artist",
        album: "Test Album",
        duration: 240,
        position: 60,
        state: "playing",
      });
    }
    if (cmd.includes("search-tracks")) {
      return JSON.stringify([
        { title: "Track 1", artist: "Artist 1", album: "Album 1" },
        { title: "Track 2", artist: "Artist 2", album: "Album 2" },
      ]);
    }
    if (cmd.includes("get-albums")) {
      return JSON.stringify([
        { album: "Album 1", artist: "Artist 1" },
        { album: "Album 2", artist: "Artist 2" },
      ]);
    }
    if (cmd.includes("get-playlists")) {
      return JSON.stringify([
        { name: "Playlist 1", trackCount: 10 },
        { name: "Playlist 2", trackCount: 20 },
      ]);
    }
    if (cmd.includes("create-playlist")) {
      return "Playlist created successfully";
    }
    if (cmd.includes("add-to-playlist")) {
      return "Track added successfully";
    }
    if (cmd.includes("remove-from-playlist")) {
      return "Track removed successfully";
    }
    if (cmd.includes("rename-playlist")) {
      return "Playlist renamed successfully";
    }
    if (cmd.includes("delete-playlist")) {
      return "Playlist deleted successfully";
    }
    if (cmd.includes("get-playlist-tracks")) {
      return JSON.stringify([
        { title: "Track 1", artist: "Artist 1" },
        { title: "Track 2", artist: "Artist 2" },
      ]);
    }
    return "";
  }),
}));

describe("Library Tools", () => {
  describe("library_get_current_track", () => {
    it("should return current track information", async () => {
      const result = await handleLibraryGetCurrentTrack({});

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe("Test Track");
      expect(result.data.artist).toBe("Test Artist");
    });
  });

  describe("library_search", () => {
    it("should require a query", async () => {
      const result = await handleLibrarySearch({ query: "" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Empty query");
    });

    it("should search for tracks", async () => {
      const result = await handleLibrarySearch({
        query: "test",
        type: "track",
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const result = await handleLibrarySearch({
        query: "test",
        limit: 1,
      });

      expect(result.success).toBe(true);
      if (Array.isArray(result.data)) {
        expect(result.data.length).toBeLessThanOrEqual(1);
      }
    });

    it("should handle different search types", async () => {
      const types = ["track", "album", "artist", "all"] as const;

      for (const type of types) {
        const result = await handleLibrarySearch({
          query: "test",
          type,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("library_browse", () => {
    it("should browse tracks", async () => {
      const result = await handleLibraryBrowse({ type: "tracks" });
      expect(result.success).toBe(true);
    });

    it("should browse albums", async () => {
      const result = await handleLibraryBrowse({ type: "albums" });
      expect(result.success).toBe(true);
    });

    it("should browse playlists", async () => {
      const result = await handleLibraryBrowse({ type: "playlists" });
      expect(result.success).toBe(true);
    });

    it("should extract unique artists", async () => {
      const result = await handleLibraryBrowse({ type: "artists" });
      expect(result.success).toBe(true);
      if (Array.isArray(result.data)) {
        // Check that artists are unique
        const artistNames = result.data.map((a: any) => a.artist);
        const uniqueArtists = new Set(artistNames);
        expect(artistNames.length).toBe(uniqueArtists.size);
      }
    });
  });
});

describe("Playlist Tools", () => {
  describe("playlist_create", () => {
    it("should create a playlist", async () => {
      const result = await handlePlaylistCreate({ name: "Test Playlist" });

      expect(result.success).toBe(true);
      expect(result.data.playlist_name).toBe("Test Playlist");
    });
  });

  describe("playlist_add_tracks", () => {
    it("should add tracks to playlist", async () => {
      const result = await handlePlaylistAddTracks({
        playlist_name: "Test Playlist",
        track_search_terms: ["Track 1", "Track 2"],
      });

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.playlist_name).toBe("Test Playlist");
    });

    it("should handle empty track list", async () => {
      const result = await handlePlaylistAddTracks({
        playlist_name: "Test Playlist",
        track_search_terms: [],
      });

      expect(result.data.added).toBe(0);
    });

    it("should batch add multiple tracks", async () => {
      const result = await handlePlaylistAddTracks({
        playlist_name: "Test Playlist",
        track_search_terms: ["Track 1", "Track 2", "Track 3"],
      });

      expect(result.data).toBeDefined();
      expect(result.data.results).toBeDefined();
      expect(Array.isArray(result.data.results)).toBe(true);
    });
  });

  describe("playlist_remove_tracks", () => {
    it("should remove tracks from playlist", async () => {
      const result = await handlePlaylistRemoveTracks({
        playlist_name: "Test Playlist",
        track_search_terms: ["Track 1"],
      });

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.playlist_name).toBe("Test Playlist");
    });
  });

  describe("playlist_rename", () => {
    it("should rename playlist", async () => {
      const result = await handlePlaylistRename({
        current_name: "Old Name",
        new_name: "New Name",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.old_name).toBe("Old Name");
      expect(result.data.new_name).toBe("New Name");
    });
  });

  describe("playlist_delete", () => {
    it("should delete playlist", async () => {
      const result = await handlePlaylistDelete({
        name: "Test Playlist",
      });

      expect(result.success).toBe(true);
      expect(result.data.playlist_name).toBe("Test Playlist");
    });
  });

  describe("playlist_get_tracks", () => {
    it("should get tracks from playlist", async () => {
      const result = await handlePlaylistGetTracks({
        name: "Test Playlist",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.playlist_name).toBe("Test Playlist");
    });
  });
});

describe("Discovery Tools", () => {
  describe("discover_search_catalog", () => {
    it("should return not available when MusicKit not configured", async () => {
      const result = await handleDiscoverSearchCatalog({
        query: "test",
      });

      expect(result.catalogAvailable).toBe(false);
      expect(result.message).toContain("DISCOVERY MODE: Not Available");
    });

    it("should require a query parameter", async () => {
      const result = await handleDiscoverSearchCatalog({
        query: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("discover_tracks", () => {
    it("should return not available when not configured", async () => {
      const result = await handleDiscoverTracks({
        seed_type: "artist",
        seed_value: "Radiohead",
      });

      expect(result.catalogAvailable).toBe(false);
    });
  });

  describe("discover_albums", () => {
    it("should return not available when not configured", async () => {
      const result = await handleDiscoverAlbums({
        seed_artist: "Radiohead",
      });

      expect(result.catalogAvailable).toBe(false);
    });
  });
});

describe("Output Format Validation", () => {
  it("library tools should return proper structure", async () => {
    const result = await handleLibraryGetCurrentTrack({});

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.message).toBe("string");
  });

  it("discovery tools should include catalogAvailable flag", async () => {
    const result = await handleDiscoverSearchCatalog({ query: "test" });

    expect(result).toHaveProperty("catalogAvailable");
    expect(typeof result.catalogAvailable).toBe("boolean");
  });

  it("discovery tools should return markdown formatted messages", async () => {
    const result = await handleDiscoverSearchCatalog({ query: "test" });

    // Even when not available, message should be formatted
    expect(result.message).toContain("🎵 DISCOVERY MODE");
  });

  it("playlist tools should handle batch operations", async () => {
    const result = await handlePlaylistAddTracks({
      playlist_name: "Test",
      track_search_terms: ["Track 1", "Track 2", "Track 3"],
    });

    expect(result.data.results).toBeDefined();
    expect(Array.isArray(result.data.results)).toBe(true);
  });
});

describe("Edge Cases", () => {
  it("should validate empty playlist names", async () => {
    // This tests that the function handles edge cases
    // Even if AppleScript allows it, we're testing the handler
    const result = await handlePlaylistCreate({ name: "" });

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it("should handle empty search queries", async () => {
    const result = await handleLibrarySearch({
      query: "",
      type: "track",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Empty query");
  });

  it("should handle empty track lists in playlist operations", async () => {
    const result = await handlePlaylistAddTracks({
      playlist_name: "Test",
      track_search_terms: [],
    });

    expect(result.data.added).toBe(0);
    expect(result.data.failed).toBe(0);
  });
});
