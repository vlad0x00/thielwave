// A "Video" class with a start timestamp, end timestamp, volume, and URL members.
class Video {
    constructor(start, end, volume, url) {
        this.start = start;
        this.end = end;
        this.volume = volume;
        this.url = url;
    }
}

Papa = require('papaparse')

function load_videos(url) {
    var videos = [];
    Papa.parse(url, {
        download: true,
        complete: function(results) {
            // results.data is the parsed data
            for (var i = 0; i < results.data.length; i++) {
                var row = results.data[i];
                if (row.length == 4) {
                    var start = parseFloat(row[0]);
                    var end = parseFloat(row[1]);
                    var volume = parseFloat(row[2]);
                    var url = row[3];
                    videos.push(new Video(start, end, volume, url));
                }
            }
        }
    });
    return videos;
}

// Get total time of a list of Video objects
function get_total_time(videos) {
    var total_time = 0;
    for (var i = 0; i < videos.length; i++) {
        var video = videos[i];
        total_time += video.end - video.start;
    }
    return total_time;
}

// Iterate through a list of Video objects and return the one that overlaps with the given time, if the video durations are accumulated during the iteration.
function get_video_at_time(videos, time) {
    var total_time = 0;
    for (var i = 0; i < videos.length; i++) {
        var video = videos[i];
        var duration = video.end - video.start;
        if (total_time <= time && time < total_time + duration) {
            return video;
        }
        total_time += duration;
    }
    return null;
}

var talks = load_videos("data/talks.csv");
var music = load_videos("data/music.csv");

// Print talks and music
console.log(talks);
console.log(music);

var talks_total_time = get_total_time(talks);
var music_total_time = get_total_time(music);

// Print the current talk and music total time
console.log("Talks total time: " + talks_total_time);
console.log("Music total time: " + music_total_time);

var timestamp = Date.now();
var current_talk = get_video_at_time(talks, timestamp % get_total_time(talks));
var current_music = get_video_at_time(music, timestamp % get_total_time(music));

// Print the current talk and music
console.log(current_talk);
console.log(current_music);

// In current DOM, modify "talk" iframe "src" attribute to the url of current_talk
document.getElementById("talk").src = current_talk.url;

// In current DOM, modify "music" iframe "src" attribute to the url of current_music
document.getElementById("music").src = current_music.url;

callPlayer("talk", "setVolume", current_talk.volume);
callPlayer("music", "setVolume", current_music.volume);