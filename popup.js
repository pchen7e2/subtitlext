"use strict";

function startAmazon(){
}

function readSRT(file){
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('submitStatus').innerText = "Success!";


        //load lib.js and start subtitle processing
        chrome.tabs.executeScript(
            {
                file:"content.js"
            },
            ()=>{
                chrome.tabs.executeScript({
                    /*
                    code:"subtitlextStateObj.lines=parseSRT(`"+event.target.result+"`);"+
                    "subtitlextStateObj.intervalID = setInterval("+
                    "() => {processAmazon(subtitlextStateObj.lines, subtitlextStateObj.offsetSeconds);}, subtitlextStateObj.refreshInterval);"
                    */
                    code:"subtitlextStateObj.lines=parseSRT(`"+event.target.result+"`);"+
                    "setup();"+
                    "start();"
                    //todo: when reading a file twice, it simply start() twice with no stopping?
                });
            }
        );
    }; // desired file content
    reader.onerror = error => reject(error);
    reader.readAsText(file);
}


function initialize() {
    chrome.storage.local.clear();
    chrome.storage.local.set({
        offsetSeconds : 0, // must be consistent with that of subtitlextStateObj in lib.js
        refreshInterval : 200, // must be consistent with that of subtitlextStateObj in lib.js
        subtitleFileName: ""
    });
}



document.getElementById('subtitleFileForm').addEventListener('submit', function(evt){
    //console.log(evt.target);
    evt.preventDefault();
    initialize();
    let file = document.getElementById('subtitleFileInput').files[0];
    chrome.storage.local.set({subtitleFileName:file.name});
    readSRT(file);
    //console.log(file);
});
document.getElementById('offsetButton').addEventListener('click', ()=>{
    let newOffset = parseFloat(document.getElementById('offset').value);
    chrome.tabs.executeScript({
        /*
        code:"subtitlextStateObj.offsetSeconds="+newOffset+";"+
        "clearInterval(subtitlextStateObj.intervalID);"+
        "subtitlextStateObj.intervalID = setInterval("+
        "() => {processAmazon(subtitlextStateObj.lines, subtitlextStateObj.offsetSeconds);}, subtitlextStateObj.refreshInterval);"
        */
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
});



chrome.storage.local.get(['offsetSeconds'], function(result) {
    document.getElementById('offset').value = result.offsetSeconds;
});
chrome.storage.local.get(['refreshInterval'], function(result) {
    document.getElementById('refreshInterval').value = result.refreshInterval;
});



//get the url of the active tab
/*
chrome.tabs.query({'active':true, 'lastFocusedWindow':true}, (tabs)=>{
    console.log(tabs);
    chrome.tabs.executeScript({
       code:"console.log('"+tabs[0].url+"');"
    });
});
*/


/*
var xmlHttp = new XMLHttpRequest();
xmlHttp.open( "GET", "http://ip.sb", false ); // false for synchronous request
xmlHttp.send( );
alert( xmlHttp.responseText);
    */
//todo: parse other encoding subtitle file like GB2313 in zmk2.srt