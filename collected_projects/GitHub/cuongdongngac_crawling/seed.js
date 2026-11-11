const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Seed danh mục tham chiếu: actors + nhóm hashtag + cấu hình nghiên cứu + hashtag mẫu.
// Nguyên tắc: CHỈ upsert/insert-if-missing, KHÔNG xóa dữ liệu có sẵn.
// Track 1 (20 từ khóa cố định) chờ hội đồng chốt danh sách — hiện chỉ seed hashtag MẪU.

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Thiếu ENV NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local. Thoát.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RES_PROXY = { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] };

// is_active=false: actor chưa có adapter trong worker — chỉ dùng ở Quét thử (catalog).
// Không seed actor đã LOẠI (apify/facebook-hashtag-scraper đang bảo trì).
const ACTORS = [
  {
    actor_id: 'clockworks/tiktok-hashtag-scraper',
    actor_name: 'TikTok Hashtag Scraper (quét chính TikTok)',
    platform: 'TIKTOK',
    is_active: true,
    default_config: {
      maxItems: 100,
      hashtags: [],
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      maxConcurrency: 5,
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'clockwork/tiktok-scraper',
    actor_name: 'TikTok Data Extractor (dự phòng / đo lại)',
    platform: 'TIKTOK',
    is_active: true,
    default_config: {
      maxItems: 100,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      maxConcurrency: 5,
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'scraper_one/facebook-posts-search',
    actor_name: 'Facebook Posts Search (quét chính FB — chờ adapter worker)',
    platform: 'FACEBOOK_SEARCH',
    is_active: false,
    default_config: {
      resultsCount: 50,
      searchType: 'top',
      startDate: null,
      endDate: null,
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'apify/facebook-search-scraper',
    actor_name: 'Facebook Search Official (dùng tạm trong lúc chờ scraper_one)',
    platform: 'FACEBOOK_SEARCH',
    is_active: true,
    default_config: {
      resultsLimit: 50,
      queries: [],
      searchTerms: [],
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'alexey/facebook-search-scraper',
    actor_name: 'Facebook Search (Alexey community)',
    platform: 'FACEBOOK_SEARCH',
    is_active: true,
    default_config: {
      resultsLimit: 50,
      queries: [],
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'apify/facebook-pages-scraper',
    actor_name: 'Facebook Pages Scraper',
    platform: 'FACEBOOK_PAGE',
    is_active: true,
    default_config: {
      resultsLimit: 50,
      maxComments: 0,
      startUrls: [],
      searchWords: [],
      onlyPostsNewerThan: null,
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'clappi/facebook-posts-reels-scraper',
    actor_name: 'FB Posts/Reels đo lại theo link (chờ adapter)',
    platform: 'FACEBOOK_PAGE',
    is_active: false,
    default_config: {
      postUrls: [],
      proxy: null
    }
  },
  {
    actor_id: 'api-ninja/tiktok-hashtag-scraper',
    actor_name: 'TikTok Hashtag dự phòng, giá rẻ (chờ adapter + input mẫu)',
    platform: 'TIKTOK',
    is_active: false,
    default_config: {
      region: 'VN',
      maxItems: 100,
      hashtags: [],
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'scrapeforge/facebook-search-posts',
    actor_name: 'FB Search dự phòng (chờ adapter)',
    platform: 'FACEBOOK_SEARCH',
    is_active: false,
    default_config: {
      search_type: 'posts',
      max_results: 50,
      recent_posts: false,
      proxy: RES_PROXY
    }
  },
  {
    actor_id: 'streamer/youtube-scraper',
    actor_name: 'YouTube Comments Extractor',
    platform: 'YOUTUBE',
    is_active: true,
    default_config: {
      maxVideos: 20,
      maxComments: 200,
      sortVideosBy: 'NEWEST',
      sortCommentsBy: 'NEWEST_FIRST',
      videoUrls: [],
      channelUrls: [],
      searchTerms: [],
      proxy: RES_PROXY
    }
  }
];

// 4 nhóm cố định theo DEC-005 (tên tiếng Việt khớp mock + dashboard).
const GROUPS = [
  { group_id: 'COMMERCIAL', group_name: 'Tiếp thị trực tiếp', description: 'Bài chào bán, giá, liên hệ, giao hàng' },
  { group_id: 'LIFESTYLE', group_name: 'Lối sống', description: 'Gắn sản phẩm với phong cách sống, giải trí' },
  { group_id: 'EVASION', group_name: 'Từ lóng lách luật', description: 'Đổi tên, viết tắt, ngụy trang, lách nền tảng' },
  { group_id: 'WARNING', group_name: 'Cai thuốc và cảnh báo', description: 'Phòng ngừa, cai thuốc, chính sách' }
];

// Hashtag MẪU để chạy thử khung kỹ thuật (không phải Track 1 nghiên cứu).
const SAMPLE_HASHTAGS = [
  { text: '#vape', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'LIFESTYLE'] },
  { text: '#pod', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'LIFESTYLE'] },
  { text: '#vapetricks', track: 'FIXED', groups: ['LIFESTYLE'] },
  { text: '#vapegiare', track: 'FIXED', groups: ['COMMERCIAL'] },
  { text: '#p0d', track: 'ADAPTIVE', groups: ['EVASION'] },
  { text: '#keokhoi', track: 'ADAPTIVE', groups: ['EVASION'] },
  { text: '#ungthu', track: 'FIXED', groups: ['WARNING'] },
  { text: '#thuocladientu', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'WARNING'] }
];

async function seed() {
  console.log("Seeding apify_actors...");
  const { error: aErr } = await supabase.from('apify_actors').upsert(ACTORS, { onConflict: 'actor_id' });
  if (aErr) throw new Error("apify_actors: " + aErr.message);
  console.log(`  -> ${ACTORS.length} actors (active: ${ACTORS.filter(a => a.is_active).length})`);

  console.log("Seeding hashtag_groups...");
  const { error: gErr } = await supabase.from('hashtag_groups').upsert(GROUPS, { onConflict: 'group_id' });
  if (gErr) throw new Error("hashtag_groups: " + gErr.message);
  console.log(`  -> ${GROUPS.map(g => g.group_id).join(', ')}`);

  console.log("Seeding project_config...");
  const { error: cErr } = await supabase.from('project_config').upsert({
    config_id: 'MAIN_STUDY',
    project_name: 'VPHA M&E — Giám sát tuân thủ trực tuyến TLĐT/TLNN',
    // Mốc cấm chính (NQ 173, cấm từ 2025) — TẠM, chờ chốt. Timeline đầy đủ ở bảng policy_milestones.
    intervention_date: '2025-01-01'
  }, { onConflict: 'config_id' });
  if (cErr) throw new Error("project_config: " + cErr.message);
  console.log("  -> MAIN_STUDY (intervention_date tạm: 2025-01-01)");

  console.log("Seeding sample hashtags (khong xoa mapping cu)...");
  for (const h of SAMPLE_HASHTAGS) {
    const { data: row, error: hError } = await supabase
      .from('hashtags')
      .upsert({ hashtag_text: h.text, keyword_track: h.track, is_active: true }, { onConflict: 'hashtag_text' })
      .select('hashtag_id')
      .single();
    if (hError) {
      console.error("  loi hashtag", h.text, hError.message);
      continue;
    }
    const mappings = h.groups.map(g => ({ hashtag_id: row.hashtag_id, group_id: g }));
    const { error: mError } = await supabase
      .from('hashtag_group_mapping')
      .upsert(mappings, { onConflict: 'hashtag_id,group_id', ignoreDuplicates: true });
    if (mError) console.error("  loi mapping", h.text, mError.message);
  }
  console.log(`  -> ${SAMPLE_HASHTAGS.length} hashtag mau`);

  console.log("Seeding complete!");
  console.log("TODO nghien cuu: (1) chay docs/migrations/2026-11-11_moc-chinh-sach.sql tren SQL Editor;");
  console.log("  (2) hoi dong chot Track 1 (20 tu khoa) -> thay hashtag mau.");
}

seed().catch((e) => { console.error("SEED FAILED:", e.message || e); process.exit(1); });
