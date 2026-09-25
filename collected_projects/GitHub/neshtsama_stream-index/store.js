<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StreamIndex - Watch</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0f1012;
            --bg-card: #18191b;
            --bg-hover: #252628;
            --primary: #e50914;
            --text-main: #ffffff;
            --text-sub: #b3b3b3;
            --accent: #46d369;
            --nav-height: 60px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            padding-top: var(--nav-height);
        }

        /* --- Header --- */
        header {
            position: fixed;
            top: 0; left: 0; width: 100%;
            height: var(--nav-height);
            background: var(--bg-dark);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 4%;
            z-index: 1000;
        }

        .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--text-main);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            background: var(--bg-card);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 6px 14px;
            border-radius: 4px;
            transition: background 0.2s, border-color 0.2s;
        }

        .back-btn:hover {
            background: var(--bg-hover);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .brand-logo {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary);
            text-decoration: none;
        }
        .brand-logo span { color: var(--text-main); }

        /* --- Main Layout --- */
        main {
            max-width: 1280px;
            margin: 0 auto;
            padding: 1.5rem 4% 3rem;
        }

        /* --- Player Container --- */
        .player-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        }

        .player-wrapper iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        /* --- Player Controls / Source Selector Bar --- */
        .controls-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            background: var(--bg-card);
            padding: 12px 18px;
            border-radius: 0 0 8px 8px;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-top: none;
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        label {
            font-size: 0.85rem;
            color: var(--text-sub);
        }

        select, button.action-btn {
            background: var(--bg-hover);
            color: var(--text-main);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 8px 12px;
            border-radius: 4px;
            font-family: inherit;
            font-size: 0.85rem;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s, background 0.2s;
        }

        select:hover, button.action-btn:hover {
            border-color: rgba(255, 255, 255, 0.3);
            background: #2f3033;
        }

        button.action-btn.primary {
            background: var(--primary);
            border-color: var(--primary);
            font-weight: 600;
        }

        button.action-btn.primary:hover {
            background: #c10812;
        }

        /* --- Metadata & Episode Picker Layout --- */
        .details-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        @media (min-width: 900px) {
            .details-grid {
                grid-template-columns: 2fr 1fr;
            }
        }

        .media-info {
            background: var(--bg-card);
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .media-title {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .media-meta-tags {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.85rem;
            color: var(--text-sub);
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .tag-rating { color: var(--accent); font-weight: 600; }
        .tag-badge { background: var(--bg-hover); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }

        .media-overview {
            line-height: 1.6;
            color: var(--text-sub);
            font-size: 0.95rem;
        }

        /* Episode List (TV Shows) */
        .episodes-panel {
            background: var(--bg-card);
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            display: none; /* Toggled if type === 'tv' */
        }

        .episodes-panel.active { display: block; }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }

        .panel-title {
            font-size: 1.1rem;
            font-weight: 600;
        }

        .episode-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 400px;
            overflow-y: auto;
            padding-right: 4px;
        }

        .episode-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-dark);
            padding: 10px 14px;
            border-radius: 4px;
            cursor: pointer;
            border: 1px solid transparent;
            transition: border-color 0.2s, background 0.2s;
        }

        .episode-item:hover {
            background: var(--bg-hover);
        }

        .episode-item.active {
            border-color: var(--primary);
            background: rgba(229, 9, 20, 0.1);
        }

        .episode-num {
            font-weight: 600;
            font-size: 0.85rem;
            margin-right: 10px;
        }

        .episode-title {
            font-size: 0.85rem;
            color: var(--text-sub);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }

        /* Toast */
        .toast {
            position: fixed; bottom: 20px; right: 20px;
            background: var(--bg-card); border-left: 4px solid var(--accent);
            padding: 15px 25px; border-radius: 4px; box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            transform: translateY(100px); transition: transform 0.3s ease-out; z-index: 3000;
        }
        .toast.show { transform: translateY(0); }
    </style>
</head>
<body>

    <!-- Header Navigation -->
    <header>
        <a href="index.html" class="back-btn">&lsaquo; Back to Index</a>
        <a href="index.html" class="brand-logo">Stream<span>Index</span></a>
    </header>

    <main>
        <!-- Video Player Frame -->
        <div class="player-wrapper">
            <iframe id="video-embed" src="about:blank" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
        </div>

        <!-- Player Options / Source Selector -->
        <div class="controls-bar">
            <div class="control-group">
                <label for="provider-select">Server Source:</label>
                <select id="provider-select" onchange="changeProvider(this.value)">
                    <option value="vidsrc.cc">VidSrc CC (Fast)</option>
                    <option value="vidsrc.me">VidSrc ME</option>
                    <option value="2embed">2Embed</option>
                    <option value="autoembed">AutoEmbed</option>
                    <option value="embed.su">Embed.su</option>
                </select>
            </div>

            <div class="control-group" id="tv-controls" style="display: none;">
                <label for="season-select">Season:</label>
                <select id="season-select" onchange="changeSeason(this.value)"></select>

                <button class="action-btn primary" id="next-ep-btn" onclick="nextEpisode()">Next Episode &rsaquo;</button>
            </div>

            <div class="control-group">
                <button class="action-btn" onclick="toggleBookmark()">★ Bookmark</button>
                <button class="action-btn" onclick="toggleWatchLater()">⏱ Watch Later</button>
            </div>
        </div>

        <!-- Content Metadata & TV Episode Sidebar -->
        <div class="details-grid">
            <div class="media-info">
                <h1 class="media-title" id="media-title">Loading title...</h1>
                <div class="media-meta-tags" id="media-meta"></div>
                <p class="media-overview" id="media-overview"></p>
            </div>

            <div class="episodes-panel" id="episodes-panel">
                <div class="panel-header">
                    <span class="panel-title">Episodes</span>
                    <span id="episode-count" style="font-size: 0.8rem; color: var(--text-sub);"></span>
                </div>
                <div class="episode-list" id="episode-list"></div>
            </div>
        </div>
    </main>

    <div id="toast" class="toast">Action completed</div>

    <!-- Embedded Storage Logic -->
    <script>
        const Store = {
            async getMeta(id) {
                const data = localStorage.getItem(`meta_${id}`);
                return data ? JSON.parse(data) : null;
            },
            async saveMeta(data) {
                if (data && data.id) {
                    localStorage.setItem(`meta_${data.id}`, JSON.stringify(data));
                }
            },
            async saveProgress(key, data) {
                localStorage.setItem(`progress_${key}`, JSON.stringify(data));
            },
            async addToList(listName, mediaData) {
                const listKey = `list_${listName}`;
                let list = JSON.parse(localStorage.getItem(listKey) || '[]');
                const exists = list.find(item => item.id === mediaData.id);
                if (exists) {
                    return { added: false };
                }
                list.push(mediaData);
                localStorage.setItem(listKey, JSON.stringify(list));
                return { added: true };
            }
        };

        const TMDB_API_KEY = '8950f9f8257d45a24d373932a74ba2ec';
        const TMDB_BASE = 'https://api.themoviedb.org/3';

        // URL Parameters
        const urlParams = new URLSearchParams(window.location.search);
        const mediaId = urlParams.get('id');
        const mediaType = urlParams.get('type') || 'movie'; // 'movie' or 'tv'
        let currentSeason = parseInt(urlParams.get('season') || '1', 10);
        let currentEpisode = parseInt(urlParams.get('episode') || '1', 10);
        let selectedProvider = 'vidsrc.cc';

        let mediaData = null;
        let seasonData = null;

        // Provider URL Templates
        const PROVIDERS = {
            'vidsrc.cc': {
                movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
                tv: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`
            },
            'vidsrc.me': {
                movie: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
                tv: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
            },
            '2embed': {
                movie: (id) => `https://www.2embed.cc/embed/${id}`,
                tv: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
            },
            'autoembed': {
                movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
                tv: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`
            },
            'embed.su': {
                movie: (id) => `https://embed.su/embed/movie/${id}`,
                tv: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`
            }
        };

        document.addEventListener('DOMContentLoaded', async () => {
            if (!mediaId) {
                alert('No media ID specified.');
                window.location.href = 'index.html';
                return;
            }

            await loadMediaData();
            updateEmbedSource();
            trackPlaybackProgress();

            if (mediaType === 'tv') {
                document.getElementById('tv-controls').style.display = 'flex';
                document.getElementById('episodes-panel').classList.add('active');
                await loadSeasonData(currentSeason);
            }
        });

        async function fetchTMDB(path) {
            const res = await fetch(`${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`);
            if (!res.ok) throw new Error(`TMDB fetch error ${res.status}`);
            return res.json();
        }

        async function loadMediaData() {
            try {
                // Try cache first
                mediaData = await Store.getMeta(mediaId);

                if (!mediaData || !mediaData.overview) {
                    const data = await fetchTMDB(`/${mediaType}/${mediaId}`);
                    mediaData = {
                        id: data.id,
                        title: data.title || data.name,
                        year: (data.release_date || data.first_air_date || '').slice(0, 4),
                        rating: data.vote_average ? data.vote_average.toFixed(1) : '—',
                        type: mediaType,
                        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
                        backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
                        overview: data.overview,
                        seasonsCount: data.number_of_seasons || 0
                    };
                    await Store.saveMeta(mediaData);
                }

                renderMetadata();
                if (mediaType === 'tv' && mediaData.seasonsCount) {
                    populateSeasonDropdown(mediaData.seasonsCount);
                }
            } catch (err) {
                console.error('Error loading metadata:', err);
                document.getElementById('media-title').innerText = 'Stream Content';
            }
        }

        function renderMetadata() {
            if (!mediaData) return;
            const fullTitle = mediaType === 'tv' 
                ? `${mediaData.title} - S${currentSeason}:E${currentEpisode}`
                : mediaData.title;

            document.title = `${fullTitle} - StreamIndex`;
            document.getElementById('media-title').innerText = fullTitle;
            document.getElementById('media-overview').innerText = mediaData.overview || 'No description available.';

            document.getElementById('media-meta').innerHTML = `
                ${mediaData.year ? `<span>${mediaData.year}</span>` : ''}
                <span class="tag-badge">${mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>
                ${mediaData.rating ? `<span class="tag-rating">★ ${mediaData.rating}</span>` : ''}
            `;
        }

        function updateEmbedSource() {
            const providerConfig = PROVIDERS[selectedProvider];
            let url = '';

            if (mediaType === 'tv') {
                url = providerConfig.tv(mediaId, currentSeason, currentEpisode);
            } else {
                url = providerConfig.movie(mediaId);
            }

            document.getElementById('video-embed').src = url;
            renderMetadata();
        }

        function changeProvider(provider) {
            selectedProvider = provider;
            updateEmbedSource();
            showToast(`Switched server to ${provider}`);
        }

        /* --- TV Show Handling --- */

        function populateSeasonDropdown(count) {
            const select = document.getElementById('season-select');
            select.innerHTML = '';
            for (let i = 1; i <= count; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.innerText = `Season ${i}`;
                if (i === currentSeason) opt.selected = true;
                select.appendChild(opt);
            }
        }

        async function changeSeason(seasonNum) {
            currentSeason = parseInt(seasonNum, 10);
            currentEpisode = 1;
            await loadSeasonData(currentSeason);
            updateEmbedSource();
            updateUrlParams();
        }

        async function loadSeasonData(seasonNum) {
            try {
                const data = await fetchTMDB(`/tv/${mediaId}/season/${seasonNum}`);
                seasonData = data.episodes || [];
                renderEpisodeList();
            } catch (err) {
                console.error('Failed to load season details:', err);
            }
        }

        function renderEpisodeList() {
            const list = document.getElementById('episode-list');
            const countLabel = document.getElementById('episode-count');
            list.innerHTML = '';

            if (!seasonData || seasonData.length === 0) {
                list.innerHTML = '<p style="color:var(--text-sub); font-size:0.85rem;">No episodes found.</p>';
                return;
            }

            countLabel.innerText = `${seasonData.length} Episodes`;

            seasonData.forEach(ep => {
                const item = document.createElement('div');
                item.className = `episode-item ${ep.episode_number === currentEpisode ? 'active' : ''}`;
                item.innerHTML = `
                    <span class="episode-num">E${ep.episode_number}</span>
                    <span class="episode-title">${ep.name}</span>
                `;
                item.onclick = () => selectEpisode(ep.episode_number);
                list.appendChild(item);
            });
        }

        function selectEpisode(epNum) {
            currentEpisode = parseInt(epNum, 10);
            renderEpisodeList();
            updateEmbedSource();
            updateUrlParams();
            trackPlaybackProgress();
        }

        function nextEpisode() {
            if (seasonData && currentEpisode < seasonData.length) {
                selectEpisode(currentEpisode + 1);
            } else if (mediaData && currentSeason < mediaData.seasonsCount) {
                changeSeason(currentSeason + 1);
            } else {
                showToast('You are on the latest episode');
            }
        }

        function updateUrlParams() {
            const newUrl = `${window.location.pathname}?id=${mediaId}&type=${mediaType}&season=${currentSeason}&episode=${currentEpisode}`;
            window.history.replaceState(null, '', newUrl);
        }

        /* --- Progress Tracking Integration --- */

        async function trackPlaybackProgress() {
            const progressKey = mediaType === 'tv' ? `${mediaId}-s${currentSeason}-e${currentEpisode}` : `${mediaId}`;
            const progressData = {
                tmdbId: mediaId,
                mediaType: mediaType,
                season: currentSeason,
                episode: currentEpisode,
                pct: 0.1, // Simulated progress starting marker
                updatedAt: Date.now()
            };

            await Store.saveProgress(progressKey, progressData);
            if (mediaData) {
                await Store.saveMeta(mediaData);
            }
        }

        /* --- Quick Actions --- */

        async function toggleBookmark() {
            if (!mediaData) return;
            const res = await Store.addToList('bookmarks', mediaData);
            showToast(res.added ? `Added "${mediaData.title}" to Bookmarks` : 'Already in Bookmarks');
        }

        async function toggleWatchLater() {
            if (!mediaData) return;
            const res = await Store.addToList('watchlater', mediaData);
            showToast(res.added ? `Added "${mediaData.title}" to Watch Later` : 'Already in Watch Later');
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.innerText = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    </script>
</body>
</html>
```<FollowUp>