"use strict";

function toSeconds(t) {
    let s = 0.0;
    if (t) {
        let p = t.split(':');
        for (let i = 0; i < p.length; i++) {
            s = s * 60 + parseFloat(p[i].replace(',', '.'));
        }
    }
    return s;
}

function parseSRT(contents) {
    contents = contents.replace(/\r/g, '');
    let texts = contents.split('\n');
    let textArray = [];
    let tmp = [];
    for (let i = 0, count = 1; i < texts.length; i++) {
        if (count.toString() === texts[i]) {
            textArray.push(tmp);
            tmp = [];
            count += 1;
        }
        tmp.push(texts[i]);
    }
    textArray.push(tmp);

    let lines = [];
    for (let i = 0; i < textArray.length; i++) {
        let textSubtitle = textArray[i];

        if (textSubtitle.length >= 2) {
            let sn = textSubtitle[0]; // the sequence number of subtitles
            let startTime = toSeconds(textSubtitle[1].split(' --> ')[0]); // start time of a subtitle
            let endTime = toSeconds(textSubtitle[1].split(' --> ')[1]); // end time of a subtitle
            let content = textSubtitle[2]; // content of a subtitle


            // a subtitle may contain multiple lines
            if (textSubtitle.length > 2) {
                for (let j = 3; j < textSubtitle.length; j++) {
                    content += '\n' + textSubtitle[j];
                }
            }
            // a subtitle object
            let subtitle = {
                sn: sn,
                startTime: startTime,
                endTime: endTime,
                content: content
            };
            lines.push(subtitle);
        }
    }
    return lines;
}


function setup() {
    subtitlextStateObj.captionContainer = getOrCreateDisplayBox();
    subtitlextStateObj.hideSubtitleFunc =
        () => {
            subtitlextStateObj.captionContainer.style.display = "none";
        };
    subtitlextStateObj.setSubtitleFunc =
        (line) => {
            subtitlextStateObj.captionContainer.style.display = "";
            subtitlextStateObj.captionContainer.firstElementChild.innerText = line;

            //keep the center of the caption container not moved
            let deltaWidth = subtitlextStateObj.captionContainer.offsetWidth -
                subtitlextStateObj.captionContainerOldWidth;
            if(deltaWidth === 0){
                return;
            }
            subtitlextStateObj.captionContainer.style.left =
                (subtitlextStateObj.captionContainer.offsetLeft - deltaWidth/2) + "px";
            subtitlextStateObj.captionContainerOldWidth = subtitlextStateObj.captionContainer.offsetWidth;
        };

    /*
    Site specific setup:
    1. Must insert the display box div into the right place so that it remains showing in full screen mode
    2. Must provide the function to get the current seconds time value
     */

    if (window.location.href.indexOf("hulu.com") > -1) { // Hulu
        //todo: bug: Hulu still lags for some reason, missing some lines of subtitle
        //append display box
        document.getElementsByClassName('hulu-player-app')[0].appendChild(subtitlextStateObj.captionContainer);
        //bind time container to read time
        subtitlextStateObj.timeContainer = document.getElementsByClassName('controls__time-elapsed')[0];
        //read time function
        subtitlextStateObj.getCurrentSecFunc =
            () => {
                return toSeconds(subtitlextStateObj.timeContainer.innerText);
            };
    }
    else if (window.location.href.indexOf("amazon.com") > -1) { // Amazon Prime
        //append display box
        document.getElementsByClassName('webPlayer')[0].appendChild(subtitlextStateObj.captionContainer);
        //bind time container to read time
        subtitlextStateObj.timeContainer = document.getElementsByClassName('time')[0];
        //read time function
        subtitlextStateObj.getCurrentSecFunc =
            () => {
                let timeStr = subtitlextStateObj.timeContainer.innerText;
                return toSeconds(timeStr.split('/')[0]);
            };
    }

}

function processIteration(lines, timeOffset) {
    let currentSecond = subtitlextStateObj.getCurrentSecFunc() + timeOffset;
    if (currentSecond < lines[subtitlextStateObj.lastLineIndex].startTime) {
        //audience has manually adjusted display progress, so reset last line index and search from the start
        subtitlextStateObj.lastLineIndex = 0;
    }

    for (let i = subtitlextStateObj.lastLineIndex; i < lines.length; i++) {
        if (lines[i].startTime > currentSecond) {
            // no time slot found, no subtitle
            subtitlextStateObj.hideSubtitleFunc();
            return;
        }
        if (lines[i].endTime >= currentSecond) {
            // found right time slot, display this line of subtitle
            //console.log(lines[i].content);
            subtitlextStateObj.setSubtitleFunc(lines[i].content);
            subtitlextStateObj.lastLineIndex = i;
            return;
        }
    }
    // after all the subtitles are displayed
    subtitlextStateObj.hideSubtitleFunc();
}


function start() {
    subtitlextStateObj.intervalID = setInterval(
        () => {
            processIteration(subtitlextStateObj.lines, subtitlextStateObj.offsetSeconds);
        },
        subtitlextStateObj.refreshInterval
    );
}

function stop() {
    clearInterval(subtitlextStateObj.intervalID);
}

function setOffset(newOffset) {
    subtitlextStateObj.offsetSeconds = parseFloat(newOffset);
    stop();
    start();
}

function setRefreshInterval(newRefreshInterval) {
    subtitlextStateObj.refreshInterval = parseFloat(newRefreshInterval);
    stop();
    start();
}


//this div is used to display subtitle lines
function getOrCreateDisplayBox() {
    if (document.getElementById(subtitlextStateObj.captionContainerID) !== null) {
        return document.getElementById(subtitlextStateObj.captionContainerID);
    }

    let displayer = document.createElement('div');
    displayer.innerHTML = `<div id="`+subtitlextStateObj.captionContainerID+`"`+
        ` style="position: absolute; z-index:999; color: rgb(255, 255, 255); ` +
        `padding-left: 10px; padding-right: 10px; ` +
        `font-family: Arial; font-size: 28px; text-shadow: rgba(0, 0, 0, 0.75) 2px 2px 3px; ` +
        `background-color: rgba(0, 0, 0, 0.5); overflow: visible; display: ; left: 100px; top: 75px; ">` +
        `<p style="text-align:center; ">subtitlext</p>  </div>`;
    displayer = displayer.firstElementChild;

    //Make the DIV element draggable:
    ((elmnt) => {
        let deltaX = 0, deltaY = 0, lastX = 0, lastY = 0;
        elmnt.onmousedown = dragMouseDown;
        elmnt.onmouseup = closeDragElement;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            lastX = e.clientX;
            lastY = e.clientY;
            // call a function whenever the cursor moves:
            elmnt.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            deltaX = e.clientX - lastX;
            deltaY = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop + deltaY) + "px";
            elmnt.style.left = (elmnt.offsetLeft + deltaX) + "px";
        }

        function closeDragElement() {
            /* stop moving when mouse button is released:*/
            //document.onmouseup = null;
            elmnt.onmousemove = null;
        }
    })(displayer);

    return displayer;
}


//in case of repeated loading of this script, stop old task if any
if(typeof subtitlextStateObj!=="undefined" && subtitlextStateObj.intervalID!==null){
    stop();
}

var subtitlextStateObj = {
    lines: null,
    lastLineIndex: 0,
    offsetSeconds: 0,
    refreshInterval: 200,
    intervalID: null,
    captionContainerID: "subtitlextDisplayer",
    captionContainer: null,
    captionContainerOldWidth: 0,
    getCurrentSecFunc: null,
    hideSubtitleFunc: null,
    setSubtitleFunc: null
};

