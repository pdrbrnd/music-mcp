on run argv
    try
        if length of argv is 0 then
            return "Error: Search query required"
        end if

        set searchQuery to item 1 of argv

        -- Get limit parameter (default to 50 if not provided)
        set resultLimit to 50
        if length of argv > 1 then
            try
                set resultLimit to item 2 of argv as number
            end try
        end if

        tell application "Music"
            if not running then
                launch
                delay 2 -- give it time to start
            end if

            set searchResults to (search playlist 1 for searchQuery)
            set resultList to "["
            set resultCount to 0

            repeat with searchResult in searchResults
                if resultCount < resultLimit then
                    if resultCount > 0 then
                        set resultList to resultList & ","
                    end if
                    set resultList to resultList & "{"
                    set resultList to resultList & "\"title\": \"" & (name of searchResult) & "\","
                    set resultList to resultList & "\"artist\": \"" & (artist of searchResult) & "\","
                    set resultList to resultList & "\"album\": \"" & (album of searchResult) & "\","

                    try
                        set resultList to resultList & "\"duration\": " & (duration of searchResult) & ","
                    on error
                        set resultList to resultList & "\"duration\": 0,"
                    end try

                    try
                        set resultList to resultList & "\"genre\": \"" & (genre of searchResult) & "\","
                    on error
                        set resultList to resultList & "\"genre\": \"\","
                    end try

                    try
                        set resultList to resultList & "\"year\": " & (year of searchResult)
                    on error
                        set resultList to resultList & "\"year\": 0"
                    end try

                    set resultList to resultList & "}"
                    set resultCount to resultCount + 1
                end if
            end repeat

            set resultList to resultList & "]"
            return resultList
        end tell
    on error errMsg number errNum
        return "Error " & errNum & ": " & errMsg
    end try
end run
