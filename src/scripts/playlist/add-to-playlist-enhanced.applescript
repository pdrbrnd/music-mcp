on run argv
    try
        if length of argv < 2 then
            return "Error: Playlist name and track search term required"
        end if

        set playlistName to item 1 of argv
        set searchTerm to item 2 of argv

        tell application "Music"
            if not running then
                launch
                delay 2 -- give it time to start
            end if

            -- Find the playlist
            set targetPlaylist to null
            repeat with currentPlaylist in playlists
                if name of currentPlaylist is playlistName then
                    set targetPlaylist to currentPlaylist
                    exit repeat
                end if
            end repeat

            if targetPlaylist is null then
                return "Error: Playlist '" & playlistName & "' not found"
            end if

            -- Try multiple search strategies
            set trackFound to false
            set foundTrack to null

            -- Strategy 1: Search in library
            try
                set searchResults to (search playlist 1 for searchTerm)
                if length of searchResults > 0 then
                    set foundTrack to item 1 of searchResults
                    set trackFound to true
                end if
            on error
                -- Continue to next strategy
            end try

            -- Strategy 2: If not found in library, try searching all sources
            if not trackFound then
                try
                    set searchResults to (search for searchTerm)
                    if length of searchResults > 0 then
                        set foundTrack to item 1 of searchResults
                        set trackFound to true
                    end if
                on error
                    -- Continue to next strategy
                end try
            end if

            -- Strategy 3: Try parsing as "Artist - Track" format
            if not trackFound then
                try
                    if searchTerm contains " - " then
                        set AppleScript's text item delimiters to " - "
                        set searchParts to text items of searchTerm
                        set AppleScript's text item delimiters to ""

                        if (count of searchParts) ≥ 2 then
                            set artistName to item 1 of searchParts
                            set trackName to item 2 of searchParts

                            -- Search by track name first
                            set searchResults to (search playlist 1 for trackName)
                            if length of searchResults > 0 then
                                -- Try to find best match with artist
                                repeat with aTrack in searchResults
                                    if artist of aTrack contains artistName or artistName contains artist of aTrack then
                                        set foundTrack to aTrack
                                        set trackFound to true
                                        exit repeat
                                    end if
                                end repeat

                                -- If no artist match, just use first result
                                if not trackFound and length of searchResults > 0 then
                                    set foundTrack to item 1 of searchResults
                                    set trackFound to true
                                end if
                            end if
                        end if
                    end if
                on error
                    -- Continue
                end try
            end if

            if not trackFound then
                return "Error: No tracks found for '" & searchTerm & "'. If this is a track from Apple Music catalog that's not in your library, use the catalog search tools first to add it to your library, then try adding to playlist again."
            end if

            -- Add track to playlist
            duplicate foundTrack to targetPlaylist

            return "Added '" & (name of foundTrack) & "' by '" & (artist of foundTrack) & "' to playlist '" & playlistName & "'"
        end tell
    on error errMsg number errNum
        return "Error " & errNum & ": " & errMsg
    end try
end run
