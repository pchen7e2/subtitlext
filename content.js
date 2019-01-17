"use strict";

//in case of repeated loading of this script, stop old task if any
if(typeof subtitlextObj!=="undefined" && subtitlextObj.intervalID!==null){
    subtitlextObj.stop();
}

var subtitlextObj = {
    uniqueId: "c3VidGl0bGV4dCBieSBwY2hlbjdlMg==", // used to test for object name conflict
    lines: null,
    lastLineIndex: 0,
    offsetSeconds: 0,
    refreshInterval: 200,
    intervalID: null,
    subtitleContainerID: "subtitlextDisplayer",
    subtitleContainer: null,
    subtitleContainerOldWidth: 0,
    getCurrentTimeFunc: null,
    hideSubtitleFunc: null,
    setSubtitleFunc: null
};


subtitlextObj.toSeconds = function (t) {
    let s = 0.0;
    if (t) {
        let p = t.split(':');
        for (let i = 0; i < p.length; i++) {
            s = s * 60 + parseFloat(p[i].replace(',', '.'));
        }
    }
    return s;
};

subtitlextObj.parseSRT = function (contents) {
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
            let startTime = subtitlextObj.toSeconds(textSubtitle[1].split(' --> ')[0]); // start time of a subtitle
            let endTime = subtitlextObj.toSeconds(textSubtitle[1].split(' --> ')[1]); // end time of a subtitle
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
};


subtitlextObj.setup =function() {
    subtitlextObj.subtitleContainer = subtitlextObj.getOrCreateDisplayBox();
    subtitlextObj.hideSubtitleFunc =
        () => {
            subtitlextObj.subtitleContainer.style.display = "none";
        };
    subtitlextObj.setSubtitleFunc =
        (line) => {
            subtitlextObj.subtitleContainer.style.display = "";
            subtitlextObj.subtitleContainer.firstElementChild.innerText = line;

            //keep the center of the subtitle container not moved
            let deltaWidth = subtitlextObj.subtitleContainer.offsetWidth -
                subtitlextObj.subtitleContainerOldWidth;
            if(deltaWidth === 0){
                return;
            }
            subtitlextObj.subtitleContainer.style.left =
                (subtitlextObj.subtitleContainer.offsetLeft - deltaWidth/2) + "px";
            subtitlextObj.subtitleContainerOldWidth = subtitlextObj.subtitleContainer.offsetWidth;
        };

    /*
    Site specific setup:
    1. Must insert the display box div into the right place so that it remains showing in full screen mode
    2. Must provide the function to get the current time value
     */

    if (window.location.href.indexOf("hulu.com") > -1) { // Hulu
        //append display box
        document.getElementsByClassName('hulu-player-app')[0].appendChild(subtitlextObj.subtitleContainer);
        //bind time container to read time
        subtitlextObj.timeContainer = document.getElementsByTagName('video')[0];
        //read time function
        subtitlextObj.getCurrentTimeFunc =
            () => {
                return subtitlextObj.timeContainer.currentTime;
            };
    }
    else if (window.location.href.indexOf("amazon.com") > -1) { // Amazon Prime
        //append display box
        document.getElementsByClassName('webPlayer')[0].appendChild(subtitlextObj.subtitleContainer);
        //bind time container to read time
        subtitlextObj.timeContainer = document.getElementsByTagName('video')[1];
        //read time function
        subtitlextObj.getCurrentTimeFunc =
            () => {
                return subtitlextObj.timeContainer.currentTime;
            };
    }
    else{ // default site configuration (maybe not working)
        console.warn('Subtitlext: This site is not officially supported, so the extension may fail.');
        let videoNodes = document.getElementsByTagName('video');
        // pick the <video> tag with the longest outerHTML (just a guess)
        subtitlextObj.timeContainer = Array.from(videoNodes).reduce(
            (accu, cur)=>(cur.outerHTML.length > accu.outerHTML.length? cur:accu)
        );

        // put the subtitle display box in the same level with <video>'s parent (just a guess)
        subtitlextObj.timeContainer.parentElement.parentElement.appendChild(subtitlextObj.subtitleContainer);
        subtitlextObj.getCurrentTimeFunc =
            () => {
                return subtitlextObj.timeContainer.currentTime;
            };
    }

};

subtitlextObj.processIteration = function (lines, timeOffset) {
    let currentTime = subtitlextObj.getCurrentTimeFunc() + timeOffset;
    if (currentTime < lines[subtitlextObj.lastLineIndex].startTime) {
        //audience has manually adjusted display progress, so reset last line index and search from the start
        subtitlextObj.lastLineIndex = 0;
    }

    for (let i = subtitlextObj.lastLineIndex; i < lines.length; i++) {
        if (lines[i].startTime > currentTime) {
            // no time slot found, no subtitle
            subtitlextObj.hideSubtitleFunc();
            return;
        }
        if (lines[i].endTime >= currentTime) {
            // found right time slot, display this line of subtitle
            subtitlextObj.setSubtitleFunc(lines[i].content);
            subtitlextObj.lastLineIndex = i;
            return;
        }
    }
    // after all the subtitles are displayed
    subtitlextObj.hideSubtitleFunc();
};


subtitlextObj.start = function start() {
    subtitlextObj.intervalID = setInterval(
        () => {
            subtitlextObj.processIteration(subtitlextObj.lines, subtitlextObj.offsetSeconds);
        },
        subtitlextObj.refreshInterval
    );
};

subtitlextObj.stop = function stop() {
    clearInterval(subtitlextObj.intervalID);
};

subtitlextObj.setOffset = function (newOffset) {
    subtitlextObj.offsetSeconds = parseFloat(newOffset);
    subtitlextObj.stop();
    subtitlextObj.start();
};

subtitlextObj.setRefreshInterval = function (newRefreshInterval) {
    subtitlextObj.refreshInterval = parseFloat(newRefreshInterval);
    subtitlextObj.stop();
    subtitlextObj.start();
};


//this div is used to display subtitle lines
subtitlextObj.getOrCreateDisplayBox = function () {
    if (document.getElementById(subtitlextObj.subtitleContainerID) !== null) {
        return document.getElementById(subtitlextObj.subtitleContainerID);
    }

    let displayer = document.createElement('div');
    displayer.innerHTML = `<div id="`+subtitlextObj.subtitleContainerID+`"`+
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
};



