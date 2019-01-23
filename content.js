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



subtitlextObj.parseSSA = function (contents) {
    contents = contents.replace(/\r/g, '');
    let texts = contents.split('\n');
    texts = texts.filter(s=>s.startsWith("Dialogue"));

    let toSeconds = function(str) {
        let arr = str.split(':');
        let seconds = parseInt(arr[0])*3600+parseInt(arr[1])*60+parseFloat(arr[2]);
        if(arr.length === 4){
            seconds += parseFloat(arr[3])/Math.pow(10, arr[3].length);
        }
        return seconds;
    };
    let lines = [];
    for(let i=0;i<texts.length;i++){
        let arr = texts[i].split(',');
        let startTime = toSeconds(arr[1].trim());
        let endTime = toSeconds(arr[2].trim());
        // content may have contained comma so we concatenate them
        let content = arr[9];
        for(let i=10;i<arr.length;i++){
            content += arr[i];
        }

        content = content.trim();
        //remove non-text content ------ "{\...}"
        let left = content.indexOf('{\\');
        if(left > -1){
            let right = content.indexOf('}');
            content = content.substr(0, left)+content.substr(right+1);
        }
        // adjust newline char
        content = content.replace(/\\n|\\N/g,'\n');

        let subtitle = {
            seqNo: i+1,
            startTime: startTime,
            endTime: endTime,
            content: content
        };
        lines.push(subtitle);
    }
    lines.sort((e1,e2)=>(e1.startTime-e2.startTime));

    // it's possible subtitles display time overlap, e.g. top subtitle and bottom subtitle
    // for such case, we simply concatenate the subtitles to the earlier one so that they all get displayed
    for(let i=0;i<lines.length;i++){
        for(let j=i+1;j<lines.length;j++){
            if(lines[j].startTime>=lines[i].endTime){
                break;
            }
            lines[i].content += "\n"+lines[j].content;
        }
    }

    return lines;
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

    let toSeconds = function(t) {
        let s = 0.0;
        if (t) {
            let p = t.split(':');
            for (let i = 0; i < p.length; i++) {
                s = s * 60 + parseFloat(p[i].replace(',', '.'));
            }
        }
        return s;
    };
    let lines = [];
    for (let i = 0; i < textArray.length; i++) {
        let textSubtitle = textArray[i];

        if (textSubtitle.length >= 2) {
            let seqNo = textSubtitle[0]; // the sequence number of subtitles
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
                seqNo: seqNo,
                startTime: startTime,
                endTime: endTime,
                content: content
            };
            lines.push(subtitle);
        }
    }
    lines.sort((e1,e2)=>(e1.startTime-e2.startTime));
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
    else if (window.location.href.indexOf("www.crunchyroll.com") > -1){ // Crunchyroll configuration
        //note for dev: manually creating a subtitle display box in Chrome console and
        //  appending it in crunchyroll.com will not work -- clicking the box will make the page
        //  crash. This issue is surprisingly gone in Chrome extension's content script.

        //temporarily change domain to access cross origin iframe to get the timeContainer reference
        document.domain = 'crunchyroll.com';
        subtitlextObj.timeContainer =
            document.getElementById('vilos-player').contentWindow.document.getElementsByTagName('video')[0];
        //append display box
        subtitlextObj.timeContainer.parentElement.parentElement.appendChild(subtitlextObj.subtitleContainer);
        //change domain back
        document.domain = 'www.crunchyroll.com';
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
        `style="cursor: move; position: absolute; z-index:999; color: rgb(255, 255, 255); ` +
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



