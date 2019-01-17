# subtitlext
A Chrome extension to display user-provided `.srt` subtitles for videos played on a webpage. With this extension you can display an external `.srt` subtitle file when watching videos online. The choice 
is no longer limited to those provided by video providers. For example, you can add a Chinese subtitle file or a 
dual-language one.

### Sites supported
**Hulu** and 
**Amazon Prime Video** are supported and tested.

It can be easily extend 
to support other sites. Before that, it uses a default configuration for those sites.
Feel free to try it, it may work (at least for **YouTube** and **Bilibili**)!



### Installation
(ref: https://developer.chrome.com/extensions/getstarted#manifest)

1. Download this project.
2. Open the Extension Management page by navigating to `chrome://extensions`.
3. Enable Developer Mode by clicking the toggle switch next to **Developer mode**.
4. Click the **LOAD UNPACKED** button and select the extension directory.

### Extend to support other sites:
Continue to fill `subtitlextObj.setup()` of `content.js` (adding about 5 lines of code): 
1. Find the web player DOM of the new site and append the subtitle display box as its child
2. Define a function to retrieve the current time value in second from the new site

### Todo:
1. Support decoding of subtitle files of encodings other than "utf-8" or "utf-16le".
2. Support parsing of subtitle files of other formats, like `.ass` or `.ssa`.
3. Interact with the user to dynamically add support for new sites
