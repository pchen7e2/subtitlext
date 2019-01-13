# subtitlext
A Chrome extension to display user-provided .srt subtitles for videos on Hulu and Amazon Prime Video

With this extension you can display an external .srt subtitle file when watching videos on Hulu and Amazon. The choice 
is no longer limited to those provides by video providers. For example, you can add a Chinese subtitle file or a 
dual-language one.

### Known bug:
There will be lags for displaying on Hulu. Some random lines of subtitles will be lost.

### Extend to support other sites:
Continue to fill `setup()` of `content.js` (adding about 5 lines of code): 
1. Find the web player DOM of the new site and append the subtitle display box as its child
2. Define a function to retrieve the current time value in second from the new site

### Todo:
1. Support decoding of subtitle files of encodings other than "utf-8" or "utf-16le".
2. Support parsing of subtitle files of other formats, like `.ass` or `.ssa`.
