import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MusicKitClient } from '../../src/services/musickit-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('MusicKitClient', () => {
  let client: MusicKitClient;

  beforeEach(() => {
    client = new MusicKitClient({
      developerToken: 'test-developer-token',
      userToken: 'test-user-token',
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should be configured with developer token', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('should not be configured without developer token', () => {
      const emptyClient = new MusicKitClient({});
      expect(emptyClient.isConfigured()).toBe(false);
    });
  });

  describe('searchCatalog', () => {
    it('should search catalog successfully', async () => {
      const mockResponse = {
        results: {
          songs: {
            data: [
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
                },
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await client.searchCatalog('Radiohead Creep', 10);

      expect(results).toHaveLength(1);
      expect(results[0].attributes.name).toBe('Creep');
      expect(results[0].attributes.artistName).toBe('Radiohead');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search?term=Radiohead%20Creep'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-developer-token',
          }),
        })
      );
    });

    it('should return empty array when no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: {} }),
      });

      const results = await client.searchCatalog('NonexistentArtist12345');
      expect(results).toEqual([]);
    });

    it('should throw error without developer token', async () => {
      const emptyClient = new MusicKitClient({});

      await expect(emptyClient.searchCatalog('test')).rejects.toThrow(
        'MusicKit developer token not configured'
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid token',
      });

      await expect(client.searchCatalog('test')).rejects.toThrow(
        'Apple Music API error: 401 Unauthorized'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.searchCatalog('test')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getTrackById', () => {
    it('should get track by ID successfully', async () => {
      const mockTrack = {
        data: [
          {
            id: '123',
            type: 'songs',
            attributes: {
              name: 'Karma Police',
              artistName: 'Radiohead',
              albumName: 'OK Computer',
              durationInMillis: 263000,
              genreNames: ['Alternative'],
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrack,
      });

      const track = await client.getTrackById('123');

      expect(track).not.toBeNull();
      expect(track?.attributes.name).toBe('Karma Police');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('songs/123'),
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const track = await client.getTrackById('nonexistent');
      expect(track).toBeNull();
    });

    it('should throw error for other API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getTrackById('123')).rejects.toThrow(
        'Apple Music API error: 500'
      );
    });
  });

  describe('addTrackToLibrary', () => {
    it('should add track to library successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await client.addTrackToLibrary('123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.trackId).toBe('123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('me/library'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Music-User-Token': 'test-user-token',
          }),
        })
      );
    });

    it('should fail without developer token', async () => {
      const emptyClient = new MusicKitClient({});
      const result = await emptyClient.addTrackToLibrary('123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('developer token not configured');
    });

    it('should fail without user token', async () => {
      const noUserTokenClient = new MusicKitClient({
        developerToken: 'test-token',
      });

      const result = await noUserTokenClient.addTrackToLibrary('123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('User token required');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
      });

      const result = await client.addTrackToLibrary('123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('403');
    });
  });

  describe('formatTrack', () => {
    it('should format track information correctly', () => {
      const track = {
        id: '123',
        type: 'songs' as const,
        attributes: {
          name: 'No Surprises',
          artistName: 'Radiohead',
          albumName: 'OK Computer',
          durationInMillis: 228000, // 3:48
          genreNames: ['Alternative'],
        },
      };

      const formatted = client.formatTrack(track);

      expect(formatted).toBe(
        'No Surprises - Radiohead (OK Computer) [3:48]'
      );
    });

    it('should handle short durations correctly', () => {
      const track = {
        id: '123',
        type: 'songs' as const,
        attributes: {
          name: 'Short Song',
          artistName: 'Artist',
          albumName: 'Album',
          durationInMillis: 5000, // 0:05
          genreNames: [],
        },
      };

      const formatted = client.formatTrack(track);

      expect(formatted).toContain('[0:05]');
    });
  });

  describe('getLibrarySearchTerms', () => {
    it('should generate multiple search term variations', () => {
      const track = {
        id: '123',
        type: 'songs' as const,
        attributes: {
          name: 'Fake Plastic Trees',
          artistName: 'Radiohead',
          albumName: 'The Bends',
          durationInMillis: 290000,
          genreNames: ['Alternative'],
        },
      };

      const terms = client.getLibrarySearchTerms(track);

      expect(terms).toContain('Fake Plastic Trees');
      expect(terms).toContain('Fake Plastic Trees Radiohead');
      expect(terms).toContain('Radiohead Fake Plastic Trees');
      expect(terms).toContain('Fake Plastic Trees The Bends');
      expect(terms).toHaveLength(4);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.searchCatalog('test')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(client.searchCatalog('test')).rejects.toThrow(
        'Request timeout'
      );
    });
  });
});
