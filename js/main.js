// Thielwave – fully refreshed main.js (radio-sync version 2)
// -----------------------------------------------------------
// 1) Loads music.csv & talks.csv (with header row src,duration)
// 2) Calculates current track+offset from a shared clock
// 3) Plays both streams in sync, loops indefinitely
// 4) Provides helpful console output for debugging
// -----------------------------------------------------------

/* === CONFIG === */
// One global “station start” moment (UTC).  Everyone joins relative to this.
const STATION_START_UTC = new Date('2025-04-27T00:00:00Z');
// Relative paths to CSVs
const MUSIC_CSV = 'data/music.csv';
const TALKS_CSV = 'data/talks.csv';
// Volume balance (0.0 – 1.0)
const MUSIC_VOL = 0.4;
const TALK_VOL  = 1.0;

/* === STATE === */
let musicTracks = [];   // [{src, duration}]
let talkTracks  = [];
let musicAudio  = null; // current <audio> element
let talkAudio   = null;
let musicIdx    = 0;    // index inside playlist
let talkIdx     = 0;

/* === UTILS === */
const elapsedSeconds = () => Math.floor((Date.now() - STATION_START_UTC.getTime()) / 1000);

function findTrack(tracks, elapsed) {
  // guard – fall back
  if (tracks.length === 0) return { index:0, offset:0 };
  const total = tracks.reduce((s,t)=>s+t.duration,0);
  let t = elapsed % total;
  for (let i=0;i<tracks.length;i++) {
    if (t < tracks[i].duration) return { index:i, offset:t };
    t -= tracks[i].duration;
  }
  return { index:0, offset:0 }; // shouldn’t reach
}

function createAudio(src, firstOffset, volume, label) {
    const requestTime = Date.now();
    const a = new Audio(encodeURI(src));
    a.preload = 'auto';
    a.volume  = volume;
  
    a.addEventListener('canplay', () => {
      // How long the download/decoding actually took
      const latency = (Date.now() - requestTime) / 1000;
  
      // Re-compute the real-time offset right now
      const trueOffset = firstOffset + latency;
      const safeSeek   = Math.min(trueOffset, a.duration - 0.25);
  
      // One definitive seek, then start
      a.currentTime = safeSeek;
      a.play().catch(() => {});      // in case user-gesture needed
  
      // Debug – ensure the seek “took”
      console.log(`[${label}] seek →`, safeSeek.toFixed(2), 'dur', a.duration.toFixed(2));
    }, { once: true });
  
    a.addEventListener('error', () =>
      console.error(`[${label}] load error`, src)
    );
  
    return a;
  }
    
function playCurrent() {
  const elapsed = elapsedSeconds();

  const { index: mi, offset: mo } = findTrack(musicTracks, elapsed);
  const { index: ti, offset: to } = findTrack(talkTracks,  elapsed);

  musicIdx = mi;
  talkIdx  = ti;

  musicAudio = createAudio(musicTracks[mi].src, mo, MUSIC_VOL, 'music');
  talkAudio  = createAudio(talkTracks[ti].src,  to, TALK_VOL,  'talk');

  // When each track ends, schedule next part of playlist
  musicAudio.addEventListener('ended', () => nextMusic());
  talkAudio .addEventListener('ended', () => nextTalk());

  const tryPlay = () => {
    musicAudio.play().catch(()=>{});
    talkAudio .play().catch(()=>{});
  };

  // autoplay policies: start immediately, also resume on first user gesture
  tryPlay();
  document.addEventListener('click', tryPlay, { once:true });

  console.log('Now playing:', {
    music: {...musicTracks[mi], offset: mo},
    talk : {...talkTracks [ti], offset: to}
  });
}

function nextMusic() {
  musicIdx = (musicIdx + 1) % musicTracks.length;
  musicAudio = createAudio(musicTracks[musicIdx].src, 0, MUSIC_VOL, 'music');
  musicAudio.addEventListener('ended', nextMusic);
  musicAudio.play();
  console.log('Next music →', musicTracks[musicIdx].src);
}

function nextTalk() {
  talkIdx = (talkIdx + 1) % talkTracks.length;
  talkAudio = createAudio(talkTracks[talkIdx].src, 0, TALK_VOL, 'talk');
  talkAudio.addEventListener('ended', nextTalk);
  talkAudio.play();
  console.log('Next talk →', talkTracks[talkIdx].src);
}

/* === CSV LOADING === */
function loadCSV(path, targetArr, label) {
  Papa.parse(path, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: ({ data }) => {
      data.forEach(r => {
        if (r.src && r.duration) {
          targetArr.push({ src: r.src.trim(), duration: parseFloat(r.duration) });
        }
      });
      console.log(`Loaded ${label}:`, targetArr);
      if (musicTracks.length && talkTracks.length) playCurrent();
    },
    error: err => console.error(`Error loading ${label}:`, err)
  });
}

// Kick off
loadCSV(MUSIC_CSV, musicTracks, 'music');
loadCSV(TALKS_CSV, talkTracks, 'talks');