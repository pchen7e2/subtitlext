"use strict";


function readSRT(file){
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('submitStatus').innerText = "Success!";

        //load content.js and start subtitle processing
        chrome.tabs.executeScript(
            {
                file:"content.js"
            },
            ()=>{
                chrome.tabs.executeScript({
                    code:"subtitlextStateObj.lines=parseSRT(`"+event.target.result+"`);"+
                    "setup();"+
                    "start();"
                });
            }
        );
    }; // desired file content
    reader.onerror = error => {console.log(error)};
    reader.readAsText(file);
}


// update data in chrome.storage and popup.html
function initialize() {
    chrome.storage.local.clear();
    chrome.storage.local.set({
        offsetSeconds : 0, // must be consistent with that of subtitlextStateObj in content.js
        refreshInterval : 200, // must be consistent with that of subtitlextStateObj in content.js
        subtitleFileName: ""
    });
    document.getElementById('offset').value = 0;
    document.getElementById('refreshInterval').value = 200;
}


document.getElementById('subtitleFileForm').addEventListener('submit', function(evt){
    evt.preventDefault();
    let file = document.getElementById('subtitleFileInput').files[0];
    chrome.storage.local.set({subtitleFileName:file.name});
    initialize();
    readSRT(file);
});
document.getElementById('offsetButton').addEventListener('click', ()=>{
    let newOffset = parseFloat(document.getElementById('offset').value);
    chrome.tabs.executeScript({
        code: "setOffset("+newOffset+");"
    });

    chrome.storage.local.set({offsetSeconds:newOffset});
});
document.getElementById('refreshIntervalButton').addEventListener('click', ()=>{
    let newRefreshInterval = parseFloat(document.getElementById('refreshInterval').value);
    chrome.tabs.executeScript({
        code: "setRefreshInterval("+newRefreshInterval+");"
    });
    chrome.storage.local.set({refreshInterval:parseFloat(document.getElementById('refreshInterval').value)});
});

document.getElementById('reset').addEventListener('click', ()=>{
    initialize();
    //also update data in content js
    document.getElementById('offsetButton').click();
    document.getElementById('refreshIntervalButton').click();
});


chrome.storage.local.get(['offsetSeconds'], function(result) {
    document.getElementById('offset').value = result.offsetSeconds;
});
chrome.storage.local.get(['refreshInterval'], function(result) {
    document.getElementById('refreshInterval').value = result.refreshInterval;
});

//todo: parse other encoding subtitle file like GB2313
