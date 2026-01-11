import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCatalogSearch, handleAddCatalogTrack } from '../../src/tools/catalog-search.js';
import * as musicKitClient from '../../src/services/musickit-client.js';

// Mock the musickit-client module
vi.mock('../../src/services/musickit-client.js', () => ({
  createMusicKitClient: vi.fn(),
  MusicKitClient: vi.fn(),
}));

describe('Catalog Search Tool', () => {
  let mockMusicKit: any;

  beforeEach(() => {
    mockMusicKit = {
      isConfigured: vi.fn(),
      searchCatalog: vi.fn(),
      getTrackById: vi.fn(),
      addTrackToLibrary: vi.fn(),
      formatTrack: vi.fn(),
    };

    vi.mocked(musicKitClient.createMusicKitClient).mockReturnValue(mockMusicKit);
  });

  describe('handleCatalogSearch', () => {
    it('should return error when MusicKit is not configured', async () => {
      mockMusicKit.isConfigured.mockReturnValue(false);

      const result = await handleCatalogSearch({ query: 'Radiohead' });

      expect(result.success).toBe(false);
      expect(result.catalogAvailable).toBe(false);
      expect(result.message).toContain('not available');
      expect(result.error).toBe('MusicKit not configured');
    });

    it('should search catalog successfully', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.formatTrack.mockReturnValue('Creep - Radiohead (Pablo Honey) [3:58]');
      mockMusicKit.searchCatalog.mockResolvedValue([
        {
          id: '123',
          type: 'songs',
          attributes: {
            name: 'Creep',
            artistName: 'Radiohead',
            albumName: 'Pablo Honey',
            durationInMillis: 238000,
            genreNames: ['Alternative'],
            releaseDate: '1993-02-22',
            url: 'https://music.apple.com/us/album/creep/123',
          },
        },
      ]);

      const result = await handleCatalogSearch({ query: 'Radiohead Creep', limit: 25 });

      expect(result.success).toBe(true);
      expect(result.catalogAvailable).toBe(true);
      expect(result.data.tracks).toHaveLength(1);
      expect(result.data.tracks[0].name).toBe('Creep');
      expect(result.data.tracks[0].artist).toBe('Radiohead');
      expect(result.data.tracks[0].id).toBe('123');
      expect(result.message).toContain('Found 1 track');
    });

    it('should return empty results when no tracks found', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.searchCatalog.mockResolvedValue([]);

      const result = await handleCatalogSearch({ query: 'NonexistentArtist12345' });

      expect(result.success).toBe(true);
      expect(result.catalogAvailable).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toContain('No tracks found');
    });

    it('should handle API errors', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.searchCatalog.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await handleCatalogSearch({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.catalogAvailable).toBe(true);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('should respect limit parameter', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.searchCatalog.mockResolvedValue([]);

      await handleCatalogSearch({ query: 'test', limit: 10 });

      expect(mockMusicKit.searchCatalog).toHaveBeenCalledWith('test', 10);
    });

    it('should format track data correctly', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.formatTrack.mockReturnValue('Track - Artist (Album) [3:00]');
      mockMusicKit.searchCatalog.mockResolvedValue([
        {
          id: '456',
          type: 'songs',
          attributes: {
            name: 'Test Song',
            artistName: 'Test Artist',
            albumName: 'Test Album',
            durationInMillis: 180000,
            genreNames: ['Rock', 'Alternative'],
            releaseDate: '2020-01-01',
          },
        },
      ]);

      const result = await handleCatalogSearch({ query: 'test' });

      expect(result.data.tracks[0]).toMatchObject({
        index: 1,
        id: '456',
        name: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        releaseDate: '2020-01-01',
        genres: ['Rock', 'Alternative'],
        formatted: 'Track - Artist (Album) [3:00]',
      });
    });
  });

  describe('handleAddCatalogTrack', () => {
    it('should return error when MusicKit is not configured', async () => {
      mockMusicKit.isConfigured.mockReturnValue(false);

      const result = await handleAddCatalogTrack({ trackId: '123' });

      expect(result.success).toBe(false);
      expect(result.addedToLibrary).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should return error when track not found', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.getTrackById.mockResolvedValue(null);

      const result = await handleAddCatalogTrack({ trackId: '999' });

      expect(result.success).toBe(false);
      expect(result.addedToLibrary).toBe(false);
      expect(result.message).toContain('not found');
      expect(result.error).toBe('Track not found');
    });

    it('should add track to library successfully', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.getTrackById.mockResolvedValue({
        id: '123',
        type: 'songs',
        attributes: {
          name: 'Karma Police',
          artistName: 'Radiohead',
          albumName: 'OK Computer',
          durationInMillis: 263000,
          genreNames: ['Alternative'],
        },
      });
      mockMusicKit.addTrackToLibrary.mockResolvedValue({
        success: true,
        message: 'Track added successfully',
        trackId: '123',
      });

      const result = await handleAddCatalogTrack({ trackId: '123', addToLibrary: true });

      expect(result.success).toBe(true);
      expect(result.addedToLibrary).toBe(true);
      expect(result.data.trackId).toBe('123');
      expect(result.data.name).toBe('Karma Police');
      expect(result.data.artist).toBe('Radiohead');
    });

    it('should handle add to library failure', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.getTrackById.mockResolvedValue({
        id: '123',
        type: 'songs',
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          durationInMillis: 180000,
          genreNames: [],
        },
      });
      mockMusicKit.addTrackToLibrary.mockResolvedValue({
        success: false,
        message: 'User token required',
      });

      const result = await handleAddCatalogTrack({ trackId: '123' });

      expect(result.success).toBe(false);
      expect(result.addedToLibrary).toBe(false);
      expect(result.message).toBe('User token required');
      expect(result.data.suggestion).toContain('manually add');
    });

    it('should return track info without adding when addToLibrary is false', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.getTrackById.mockResolvedValue({
        id: '123',
        type: 'songs',
        attributes: {
          name: 'No Surprises',
          artistName: 'Radiohead',
          albumName: 'OK Computer',
          durationInMillis: 228000,
          genreNames: ['Alternative'],
          url: 'https://music.apple.com/us/album/no-surprises/123',
        },
      });

      const result = await handleAddCatalogTrack({ trackId: '123', addToLibrary: false });

      expect(result.success).toBe(true);
      expect(result.addedToLibrary).toBe(false);
      expect(result.data.trackId).toBe('123');
      expect(result.data.url).toBeDefined();
      expect(mockMusicKit.addTrackToLibrary).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.getTrackById.mockRejectedValue(new Error('Network timeout'));

      const result = await handleAddCatalogTrack({ trackId: '123' });

      expect(result.success).toBe(false);
      expect(result.addedToLibrary).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined limit parameter', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.searchCatalog.mockResolvedValue([]);

      await handleCatalogSearch({ query: 'test' });

      expect(mockMusicKit.searchCatalog).toHaveBeenCalledWith('test', 25);
    });

    it('should handle special characters in search query', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.searchCatalog.mockResolvedValue([]);

      await handleCatalogSearch({ query: 'artist & song (feat. other)' });

      expect(mockMusicKit.searchCatalog).toHaveBeenCalledWith(
        'artist & song (feat. other)',
        25
      );
    });

    it('should handle empty search query', async () => {
      mockMusicKit.isConfigured.mockReturnValue(true);
      mockMusicKit.searchCatalog.mockResolvedValue([]);

      const result = await handleCatalogSearch({ query: '' });

      expect(mockMusicKit.searchCatalog).toHaveBeenCalledWith('', 25);
    });
  });
});
