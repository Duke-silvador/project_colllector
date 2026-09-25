/*
  LEGION BIAŁYSTOK — statyczny "API adapter" dla GitHub Pages + Supabase.

  Istniejące strony mogą dalej wołać:
    /api/articles.php
    /api/players.php
    /api/people.php
    /api/gallery.php
    /api/table.php
    /api/matches.php
    /api/contact.php

  Ten plik przechwytuje te żądania w przeglądarce i kieruje je do Supabase.
*/

(function () {
    "use strict";

    const nativeFetch = window.fetch.bind(window);

    const config = window.LEGION_SUPABASE_CONFIG || {};
    const configured =
        typeof config.url === "string" &&
        typeof config.anonKey === "string" &&
        config.url.startsWith("http") &&
        !config.url.includes("WSTAW_TUTAJ") &&
        !config.anonKey.includes("WSTAW_TUTAJ") &&
        window.supabase &&
        typeof window.supabase.createClient === "function";

    const client = configured
        ? window.supabase.createClient(config.url, config.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        })
        : null;

    function jsonResponse(data, status = 200) {
        return new Response(
            JSON.stringify(data),
            {
                status,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            }
        );
    }

    function errorResponse(message, status = 500, details = null) {
        return jsonResponse(
            {
                ok: false,
                error: message,
                details
            },
            status
        );
    }

    function pathName(input) {
        try {
            if (input instanceof Request) {
                return new URL(input.url, window.location.href);
            }

            return new URL(String(input), window.location.href);
        }
        catch (_) {
            return null;
        }
    }

    function isLegionApi(url) {
        if (!url) return false;

        return /^\/api\/(articles|players|people|gallery|table|matches|polls|contact)\.php$/
            .test(url.pathname);
    }

    async function bodyJson(options, input) {
        if (options && options.body) {
            if (typeof options.body === "string") {
                return JSON.parse(options.body || "{}");
            }

            if (options.body instanceof FormData) {
                return Object.fromEntries(options.body.entries());
            }
        }

        if (input instanceof Request) {
            const clone = input.clone();
            const text = await clone.text();
            return text ? JSON.parse(text) : {};
        }

        return {};
    }

    async function requireAuth() {
        if (!client) {
            throw Object.assign(
                new Error("Supabase nie jest skonfigurowany."),
                { status: 503 }
            );
        }

        const { data, error } = await client.auth.getSession();

        if (error) {
            throw Object.assign(error, { status: 401 });
        }

        if (!data.session) {
            throw Object.assign(
                new Error("Musisz być zalogowany w panelu."),
                { status: 401 }
            );
        }

        return data.session;
    }

    function intOrNull(value) {
        if (value === "" || value === null || value === undefined) {
            return null;
        }

        const number = Number(value);
        return Number.isFinite(number) ? Math.trunc(number) : null;
    }

    function dateOrNull(value) {
        if (!value) return null;
        return String(value);
    }

    function cleanArticle(item) {
        return {
            id: Number(item.id),
            image: item.image || "",
            published_at: dateOrNull(item.published_at || item.date),
            status: item.status || "draft",
            tags: Array.isArray(item.tags) ? item.tags : [],
            translations: item.translations || {}
        };
    }

    function cleanPlayer(item, forcedTeam = null) {
        return {
            id: Number(item.id),
            first_name: item.first_name || "",
            last_name: item.last_name || "",
            shirt_number: intOrNull(item.shirt_number),
            position: item.position || "midfielder",
            birth_date: dateOrNull(item.birth_date),
            previous_club: item.previous_club || "",
            nationality: item.nationality || "",
            nationality_code: (item.nationality_code || "").toUpperCase(),
            height_cm: intOrNull(item.height_cm),
            joined_at: dateOrNull(item.joined_at),
            team: forcedTeam || item.team || "first",
            academy_group: item.academy_group || null,
            status: item.status || "active",
            translations: item.translations || {}
        };
    }

    function cleanPerson(item) {
        return {
            id: Number(item.id),
            first_name: item.first_name || "",
            last_name: item.last_name || "",
            category: item.category || "staff",
            role: item.role || "",
            department: item.department || "",
            email: item.email || "",
            phone: item.phone || "",
            status: item.status || "active",
            translations: item.translations || {}
        };
    }

    function cleanGallery(item, index = 0) {
        return {
            id: Number(item.id),
            image: item.image || item.url || "",
            alt: item.alt || "",
            caption: item.caption || "",
            sort_order: intOrNull(item.sort_order ?? item.order) ?? index + 1,
            status: item.status || "active",
            translations: item.translations || {}
        };
    }

    function cleanStanding(item, season) {
        return {
            season,
            position: intOrNull(item.position) ?? 0,
            team: item.team || item.name || "",
            logo: item.logo || "",
            played: intOrNull(item.played ?? item.matches) ?? 0,
            wins: intOrNull(item.wins) ?? 0,
            draws: intOrNull(item.draws) ?? 0,
            losses: intOrNull(item.losses) ?? 0,
            goals_for: intOrNull(item.goals_for) ?? 0,
            goals_against: intOrNull(item.goals_against) ?? 0,
            points: intOrNull(item.points) ?? 0,
            form: Array.isArray(item.form)
                ? item.form
                : String(item.form || "")
                    .split(",")
                    .map(value => value.trim().toUpperCase())
                    .filter(Boolean)
        };
    }

    async function replaceAll(table, rows) {
        const { error: deleteError } = await client
            .from(table)
            .delete()
            .not("id", "is", null);

        if (deleteError) throw deleteError;

        if (!rows.length) return;

        const { error: insertError } = await client
            .from(table)
            .insert(rows);

        if (insertError) throw insertError;
    }

    async function replaceByEq(table, column, value, rows) {
        const { error: deleteError } = await client
            .from(table)
            .delete()
            .eq(column, value);

        if (deleteError) throw deleteError;

        if (!rows.length) return;

        const { error: insertError } = await client
            .from(table)
            .insert(rows);

        if (insertError) throw insertError;
    }

    async function syncSeasons(names, currentSeason) {
        const uniqueNames = [...new Set(
            (Array.isArray(names) ? names : [])
                .map(value => String(value || "").trim())
                .filter(Boolean)
        )];

        if (!uniqueNames.length && currentSeason) {
            uniqueNames.push(String(currentSeason));
        }

        const { data: existing, error: existingError } = await client
            .from("seasons")
            .select("name");

        if (existingError) throw existingError;

        const oldNames = (existing || []).map(row => row.name);
        const toDelete = oldNames.filter(name => !uniqueNames.includes(name));

        if (toDelete.length) {
            const { error } = await client
                .from("seasons")
                .delete()
                .in("name", toDelete);

            if (error) throw error;
        }

        if (uniqueNames.length) {
            const rows = uniqueNames.map(name => ({
                name,
                active: name === currentSeason
            }));

            const { error } = await client
                .from("seasons")
                .upsert(rows, { onConflict: "name" });

            if (error) throw error;

            const { error: resetError } = await client
                .from("seasons")
                .update({ active: false })
                .neq("name", currentSeason || "__none__");

            if (resetError) throw resetError;

            if (currentSeason) {
                const { error: activeError } = await client
                    .from("seasons")
                    .update({ active: true })
                    .eq("name", currentSeason);

                if (activeError) throw activeError;
            }
        }
    }

    async function getArticles(url) {
        let query = client
            .from("articles")
            .select("*")
            .order("published_at", { ascending: false, nullsFirst: false });

        const status = url.searchParams.get("status");

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const limit = Number(url.searchParams.get("limit"));
        if (Number.isFinite(limit) && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    }

    async function getPlayers(url) {
        let query = client
            .from("players")
            .select("*")
            .order("shirt_number", { ascending: true, nullsFirst: false });

        const team = url.searchParams.get("team");
        const status = url.searchParams.get("status");

        if (team) query = query.eq("team", team);
        if (status && status !== "all") query = query.eq("status", status);

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    }

    async function getPeople(url) {
        let query = client
            .from("people")
            .select("*")
            .order("last_name", { ascending: true });

        const status = url.searchParams.get("status");
        if (status && status !== "all") query = query.eq("status", status);

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    }

    async function getGallery(url) {
        let query = client
            .from("gallery")
            .select("*")
            .order("sort_order", { ascending: true });

        const status = url.searchParams.get("status");

        if (status && status !== "all") {
            query = query.eq("status", status);
        }
        else if (!status) {
            query = query.eq("status", "active");
        }

        const limit = Number(url.searchParams.get("limit"));
        if (Number.isFinite(limit) && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    }

    async function getTable(url) {
        const { data: seasons, error: seasonsError } = await client
            .from("seasons")
            .select("*")
            .order("name", { ascending: false });

        if (seasonsError) throw seasonsError;

        const seasonNames = (seasons || []).map(row => row.name);
        const currentSeason =
            url.searchParams.get("season") ||
            (seasons || []).find(row => row.active)?.name ||
            seasonNames[0] ||
            "";

        const { data: allStandings, error: standingsError } = await client
            .from("standings")
            .select("*")
            .order("season", { ascending: false })
            .order("position", { ascending: true });

        if (standingsError) throw standingsError;

        const tables = {};

        for (const row of allStandings || []) {
            if (!tables[row.season]) {
                tables[row.season] = [];
            }

            const {
                id,
                season,
                ...publicRow
            } = row;

            tables[season].push(publicRow);
        }

        return {
            current_season:
                (seasons || []).find(row => row.active)?.name ||
                currentSeason,
            season: currentSeason,
            seasons: seasonNames,
            standings: tables[currentSeason] || [],
            tables
        };
    }

    async function getMatches() {
        const { data, error } = await client
            .from("matches")
            .select("*");

        if (error) throw error;

        const result = {
            last_match: null,
            next_match: null
        };

        for (const row of data || []) {
            const {
                kind,
                ...match
            } = row;

            if (kind === "last") {
                result.last_match = match;
            }

            if (kind === "next") {
                result.next_match = match;
            }
        }

        return result;
    }

    async function getPolls(url) {
        let query = client
            .from("polls")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("id", { ascending: false });

        const status = url.searchParams.get("status");

        if (status && status !== "all") {
            query = query.eq("status", status);
        }
        else if (!status) {
            query = query.eq("status", "active");
        }

        const {
            data: polls,
            error: pollsError
        } = await query;

        if (pollsError) {
            throw pollsError;
        }

        const ids = (polls || []).map(row => row.id);

        if (!ids.length) {
            return [];
        }

        const {
            data: candidates,
            error: candidatesError
        } = await client
            .from("poll_candidates")
            .select("*")
            .in("poll_id", ids)
            .order("sort_order", { ascending: true });

        if (candidatesError) {
            throw candidatesError;
        }

        const {
            data: votes,
            error: votesError
        } = await client
            .from("poll_votes")
            .select("poll_id,candidate_id")
            .in("poll_id", ids);

        if (votesError) {
            throw votesError;
        }

        const voterToken =
            String(
                url.searchParams.get("voter_token") || ""
            ).slice(0, 128);

        let myVotes = [];

        if (voterToken) {
            const {
                data,
                error
            } = await client
                .from("poll_votes")
                .select("poll_id,candidate_id")
                .in("poll_id", ids)
                .eq("voter_token", voterToken);

            if (error) {
                throw error;
            }

            myVotes = data || [];
        }

        const voteCounts = new Map();

        for (const vote of votes || []) {
            const key =
                String(vote.candidate_id);

            voteCounts.set(
                key,
                (voteCounts.get(key) || 0) + 1
            );
        }

        const myVoteByPoll = new Map(
            (myVotes || []).map(
                vote => [
                    String(vote.poll_id),
                    String(vote.candidate_id)
                ]
            )
        );

        return (polls || []).map(poll => {
            const pollCandidates =
                (candidates || [])
                    .filter(
                        candidate =>
                            String(candidate.poll_id) ===
                            String(poll.id)
                    )
                    .map(candidate => ({
                        id: String(candidate.id),
                        player_id: Number(candidate.player_id),
                        name: candidate.name || "",
                        shirt_number:
                            intOrNull(candidate.shirt_number),
                        position:
                            candidate.position || "",
                        sort_order:
                            intOrNull(candidate.sort_order) ?? 0,
                        votes:
                            voteCounts.get(
                                String(candidate.id)
                            ) || 0
                    }));

            const totalVotes =
                pollCandidates.reduce(
                    (sum, candidate) =>
                        sum +
                        Number(candidate.votes || 0),
                    0
                );

            return {
                ...poll,
                candidates: pollCandidates,
                total_votes: totalVotes,
                voted_candidate_id:
                    myVoteByPoll.get(
                        String(poll.id)
                    ) || null
            };
        });
    }

    async function postPolls(payload) {
        if (payload?.action === "vote") {
            const pollId =
                Number(payload.poll_id);

            const candidateId =
                String(payload.candidate_id || "");

            const voterToken =
                String(payload.voter_token || "")
                    .slice(0, 128);

            if (
                !Number.isFinite(pollId) ||
                !candidateId ||
                voterToken.length < 8
            ) {
                throw Object.assign(
                    new Error("Nieprawidłowe dane głosu."),
                    { status: 400 }
                );
            }

            const {
                data: existing,
                error: existingError
            } = await client
                .from("poll_votes")
                .select("candidate_id")
                .eq("poll_id", pollId)
                .eq("voter_token", voterToken)
                .maybeSingle();

            if (existingError) {
                throw existingError;
            }

            if (existing) {
                return {
                    ok: true,
                    already_voted: true,
                    candidate_id:
                        String(existing.candidate_id)
                };
            }

            const { error } = await client
                .from("poll_votes")
                .insert({
                    poll_id: pollId,
                    candidate_id: candidateId,
                    voter_token: voterToken
                });

            if (error) {
                if (error.code === "23505") {
                    return {
                        ok: true,
                        already_voted: true
                    };
                }

                throw error;
            }

            return {
                ok: true,
                already_voted: false,
                candidate_id: candidateId
            };
        }

        await requireAuth();

        if (payload?.action !== "save") {
            throw new Error(
                "Nieobsługiwana akcja głosowań."
            );
        }

        const incoming =
            Array.isArray(payload.polls)
                ? payload.polls
                : [];

        const rows =
            incoming
                .map((poll, index) => ({
                    id: Number(poll.id),

                    period:
                        ["match", "month", "year"]
                            .includes(poll.period)
                            ? poll.period
                            : "match",

                    category:
                        [
                            "player",
                            "goalkeeper",
                            "defender",
                            "midfielder",
                            "forward"
                        ].includes(poll.category)
                            ? poll.category
                            : "player",

                    title:
                        poll.title || "",

                    subtitle:
                        poll.subtitle || "",

                    starts_at:
                        dateOrNull(poll.starts_at),

                    ends_at:
                        dateOrNull(poll.ends_at),

                    status:
                        [
                            "active",
                            "closed",
                            "inactive"
                        ].includes(poll.status)
                            ? poll.status
                            : "active",

                    show_results:
                        poll.show_results !== false,

                    sort_order:
                        intOrNull(poll.sort_order) ??
                        index + 1
                }))
                .filter(
                    row =>
                        Number.isFinite(row.id)
                );

        const incomingIds =
            rows.map(row => row.id);

        const {
            data: existingPolls,
            error: existingPollsError
        } = await client
            .from("polls")
            .select("id");

        if (existingPollsError) {
            throw existingPollsError;
        }

        const stalePollIds =
            (existingPolls || [])
                .map(row => Number(row.id))
                .filter(
                    id =>
                        !incomingIds.includes(id)
                );

        if (stalePollIds.length) {
            const { error } = await client
                .from("polls")
                .delete()
                .in("id", stalePollIds);

            if (error) {
                throw error;
            }
        }

        if (rows.length) {
            const { error } = await client
                .from("polls")
                .upsert(
                    rows,
                    {
                        onConflict: "id"
                    }
                );

            if (error) {
                throw error;
            }
        }

        const allPlayerIds = [
            ...new Set(
                incoming.flatMap(
                    poll =>
                        Array.isArray(
                            poll.candidate_player_ids
                        )
                            ? poll.candidate_player_ids
                                .map(Number)
                                .filter(Number.isFinite)
                            : []
                )
            )
        ];

        let players = [];

        if (allPlayerIds.length) {
            const {
                data,
                error
            } = await client
                .from("players")
                .select(
                    "id,first_name,last_name,shirt_number,position"
                )
                .in("id", allPlayerIds);

            if (error) {
                throw error;
            }

            players = data || [];
        }

        const playerMap = new Map(
            players.map(
                player => [
                    Number(player.id),
                    player
                ]
            )
        );

        for (const poll of incoming) {
            const pollId =
                Number(poll.id);

            if (!Number.isFinite(pollId)) {
                continue;
            }

            const playerIds =
                Array.isArray(
                    poll.candidate_player_ids
                )
                    ? poll.candidate_player_ids
                        .map(Number)
                        .filter(Number.isFinite)
                    : [];

            const candidateRows =
                playerIds
                    .map(
                        (playerId, index) => {
                            const player =
                                playerMap.get(playerId);

                            if (!player) {
                                return null;
                            }

                            return {
                                id:
                                    `${pollId}_${playerId}`,

                                poll_id:
                                    pollId,

                                player_id:
                                    playerId,

                                name:
                                    `${
                                        player.first_name || ""
                                    } ${
                                        player.last_name || ""
                                    }`.trim(),

                                shirt_number:
                                    intOrNull(
                                        player.shirt_number
                                    ),

                                position:
                                    player.position || "",

                                sort_order:
                                    index + 1
                            };
                        }
                    )
                    .filter(Boolean);

            const {
                data: currentCandidates,
                error: currentCandidatesError
            } = await client
                .from("poll_candidates")
                .select("id")
                .eq("poll_id", pollId);

            if (currentCandidatesError) {
                throw currentCandidatesError;
            }

            const wantedIds =
                new Set(
                    candidateRows.map(
                        row =>
                            String(row.id)
                    )
                );

            const staleCandidateIds =
                (currentCandidates || [])
                    .map(
                        row =>
                            String(row.id)
                    )
                    .filter(
                        id =>
                            !wantedIds.has(id)
                    );

            if (staleCandidateIds.length) {
                const { error } = await client
                    .from("poll_candidates")
                    .delete()
                    .in(
                        "id",
                        staleCandidateIds
                    );

                if (error) {
                    throw error;
                }
            }

            if (candidateRows.length) {
                const { error } = await client
                    .from("poll_candidates")
                    .upsert(
                        candidateRows,
                        {
                            onConflict: "id"
                        }
                    );

                if (error) {
                    throw error;
                }
            }
        }

        return {
            ok: true,
            count: rows.length
        };
    }

    async function getContact() {
        const {
            data,
            error
        } = await client
            .from("settings")
            .select("value")
            .eq("key", "contact_email")
            .maybeSingle();

        if (error) {
            throw error;
        }

        return {
            email:
                data?.value ||
                "kontakt@legionbialystok.pl"
        };
    }

    async function postArticles(payload) {
        await requireAuth();

        const rows =
            (payload.articles || [])
                .map(cleanArticle);

        await replaceAll(
            "articles",
            rows
        );

        return {
            ok: true,
            count: rows.length
        };
    }

    async function postPlayers(payload) {
        await requireAuth();

        const team =
            payload.team;

        if (!team) {
            throw new Error("Brak pola team.");
        }

        const rows =
            (payload.players || [])
                .map(
                    item =>
                        cleanPlayer(
                            item,
                            team
                        )
                );

        await replaceByEq(
            "players",
            "team",
            team,
            rows
        );

        return {
            ok: true,
            team,
            count: rows.length
        };
    }

    async function postPeople(payload) {
        await requireAuth();

        const rows =
            (payload.people || [])
                .map(cleanPerson);

        await replaceAll(
            "people",
            rows
        );

        return {
            ok: true,
            count: rows.length
        };
    }

    async function postGallery(payload) {
        await requireAuth();

        const rows =
            (payload.gallery || [])
                .map(cleanGallery);

        await replaceAll(
            "gallery",
            rows
        );

        return {
            ok: true,
            count: rows.length
        };
    }

    async function saveStandingSeason(
        season,
        rows
    ) {
        if (!season) {
            return;
        }

        const cleanRows =
            (rows || [])
                .map(
                    item =>
                        cleanStanding(
                            item,
                            season
                        )
                )
                .filter(
                    item =>
                        item.team
                );

        await replaceByEq(
            "standings",
            "season",
            season,
            cleanRows
        );
    }

    async function postTable(payload) {
        await requireAuth();

        if (
            payload.action ===
            "save_seasons"
        ) {
            await syncSeasons(
                payload.seasons || [],
                payload.current_season || ""
            );

            if (
                payload.tables &&
                typeof payload.tables ===
                    "object"
            ) {
                for (
                    const [
                        season,
                        rows
                    ]
                    of Object.entries(
                        payload.tables
                    )
                ) {
                    await saveStandingSeason(
                        season,
                        rows
                    );
                }
            }

            return {
                ok: true
            };
        }

        if (
            payload.action ===
            "replace_season"
        ) {
            const season =
                String(
                    payload.season || ""
                ).trim();

            await syncSeasons(
                payload.seasons ||
                [season],
                payload.current_season ||
                season
            );

            await saveStandingSeason(
                season,
                payload.standings || []
            );

            return {
                ok: true,
                season
            };
        }

        throw new Error(
            "Nieobsługiwana akcja tabeli."
        );
    }

    async function postMatches(payload) {
        await requireAuth();

        const rows = [];

        if (payload.last_match) {
            rows.push({
                kind:
                    "last",

                date:
                    dateOrNull(
                        payload.last_match.date
                    ),

                home_team:
                    payload.last_match.home_team ||
                    "",

                away_team:
                    payload.last_match.away_team ||
                    "",

                home_logo:
                    payload.last_match.home_logo ||
                    "",

                away_logo:
                    payload.last_match.away_logo ||
                    "",

                home_score:
                    intOrNull(
                        payload.last_match.home_score
                    ),

                away_score:
                    intOrNull(
                        payload.last_match.away_score
                    ),

                competition:
                    payload.last_match.competition ||
                    "",

                venue:
                    payload.last_match.venue ||
                    ""
            });
        }

        if (payload.next_match) {
            rows.push({
                kind:
                    "next",

                date:
                    dateOrNull(
                        payload.next_match.date
                    ),

                home_team:
                    payload.next_match.home_team ||
                    "",

                away_team:
                    payload.next_match.away_team ||
                    "",

                home_logo:
                    payload.next_match.home_logo ||
                    "",

                away_logo:
                    payload.next_match.away_logo ||
                    "",

                home_score:
                    null,

                away_score:
                    null,

                competition:
                    payload.next_match.competition ||
                    "",

                venue:
                    payload.next_match.venue ||
                    ""
            });
        }

        if (rows.length) {
            const { error } = await client
                .from("matches")
                .upsert(
                    rows,
                    {
                        onConflict: "kind"
                    }
                );

            if (error) {
                throw error;
            }
        }

        return {
            ok: true
        };
    }

    async function postContact(payload) {
        await requireAuth();

        const { error } = await client
            .from("settings")
            .upsert(
                {
                    key:
                        "contact_email",

                    value:
                        payload.email || ""
                },
                {
                    onConflict:
                        "key"
                }
            );

        if (error) {
            throw error;
        }

        return {
            ok: true
        };
    }

    async function handleApi(
        url,
        method,
        options,
        input
    ) {
        if (
            !configured ||
            !client
        ) {
            return errorResponse(
                "Supabase nie jest jeszcze skonfigurowany. Uzupełnij supabase-config.js.",
                503
            );
        }

        const file =
            url.pathname
                .split("/")
                .pop();

        const payload =
            method === "GET"
                ? null
                : await bodyJson(
                    options,
                    input
                );

        if (method === "GET") {
            if (file === "articles.php") {
                return jsonResponse(
                    await getArticles(url)
                );
            }

            if (file === "players.php") {
                return jsonResponse(
                    await getPlayers(url)
                );
            }

            if (file === "people.php") {
                return jsonResponse(
                    await getPeople(url)
                );
            }

            if (file === "gallery.php") {
                return jsonResponse(
                    await getGallery(url)
                );
            }

            if (file === "table.php") {
                return jsonResponse(
                    await getTable(url)
                );
            }

            if (file === "matches.php") {
                return jsonResponse(
                    await getMatches()
                );
            }

            if (file === "polls.php") {
                return jsonResponse(
                    await getPolls(url)
                );
            }

            if (file === "contact.php") {
                return jsonResponse(
                    await getContact()
                );
            }
        }

        if (method === "POST") {
            if (file === "articles.php") {
                return jsonResponse(
                    await postArticles(payload)
                );
            }

            if (file === "players.php") {
                return jsonResponse(
                    await postPlayers(payload)
                );
            }

            if (file === "people.php") {
                return jsonResponse(
                    await postPeople(payload)
                );
            }

            if (file === "gallery.php") {
                return jsonResponse(
                    await postGallery(payload)
                );
            }

            if (file === "table.php") {
                return jsonResponse(
                    await postTable(payload)
                );
            }

            if (file === "matches.php") {
                return jsonResponse(
                    await postMatches(payload)
                );
            }

            if (file === "polls.php") {
                return jsonResponse(
                    await postPolls(payload)
                );
            }

            if (file === "contact.php") {
                return jsonResponse(
                    await postContact(payload)
                );
            }
        }

        return errorResponse(
            "Nieobsługiwana metoda.",
            405
        );
    }

    window.fetch =
        async function (
            input,
            options = {}
        ) {
            const url =
                pathName(input);

            if (!isLegionApi(url)) {
                return nativeFetch(
                    input,
                    options
                );
            }

            const method =
                String(
                    options.method ||
                    (
                        input instanceof Request
                            ? input.method
                            : "GET"
                    )
                ).toUpperCase();

            try {
                return await handleApi(
                    url,
                    method,
                    options,
                    input
                );
            }
            catch (error) {
                console.error(
                    "Legion Supabase API:",
                    error
                );

                return errorResponse(
                    error?.message ||
                    "Błąd Supabase.",
                    error?.status || 500,
                    error?.details || null
                );
            }
        };

    function sanitizeRichHtml(html) {
        const allowed =
            new Set([
                "P",
                "BR",
                "STRONG",
                "B",
                "EM",
                "I",
                "H2",
                "H3",
                "BLOCKQUOTE",
                "UL",
                "OL",
                "LI",
                "A"
            ]);

        const template =
            document.createElement(
                "template"
            );

        template.innerHTML =
            String(html || "");

        function clean(node) {
            for (
                const child
                of [...node.children]
            ) {
                if (
                    !allowed.has(
                        child.tagName
                    )
                ) {
                    const fragment =
                        document
                            .createDocumentFragment();

                    while (
                        child.firstChild
                    ) {
                        fragment.appendChild(
                            child.firstChild
                        );
                    }

                    child.replaceWith(
                        fragment
                    );

                    continue;
                }

                for (
                    const attr
                    of [...child.attributes]
                ) {
                    const name =
                        attr.name
                            .toLowerCase();

                    if (
                        child.tagName === "A" &&
                        name === "href"
                    ) {
                        const value =
                            attr.value.trim();

                        const safe =
                            value.startsWith(
                                "https://"
                            )
                            ||
                            value.startsWith(
                                "http://"
                            )
                            ||
                            value.startsWith(
                                "mailto:"
                            )
                            ||
                            value.startsWith(
                                "/"
                            )
                            ||
                            value.startsWith(
                                "#"
                            );

                        if (!safe) {
                            child.removeAttribute(
                                attr.name
                            );
                        }

                        continue;
                    }

                    if (
                        child.tagName === "A" &&
                        (
                            name === "target" ||
                            name === "rel"
                        )
                    ) {
                        continue;
                    }

                    child.removeAttribute(
                        attr.name
                    );
                }

                if (
                    child.tagName === "A"
                ) {
                    child.setAttribute(
                        "rel",
                        "noopener noreferrer"
                    );
                }

                clean(child);
            }
        }

        clean(
            template.content
        );

        return template.innerHTML;
    }

    window.LegionSupabase = {
        configured,
        client,
        nativeFetch,
        sanitizeRichHtml
    };
})();
