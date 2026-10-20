<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/catalog.php';
$page = 'home';
$title = 'ATEA Parfums — Discover Your Scent';
$withCatalog = true;
require __DIR__ . '/includes/header.php';
?>
<main>
    <section class="home-hero">
      <div class="home-hero-copy">
        <p class="eyebrow light">THE ART OF PERSONAL SCENT</p>
        <h1>Find the scent<br><em>that feels like you.</em></h1>
        <p>Lebih dari sekadar aroma. Sebuah detail kecil yang meninggalkan kesan, bahkan setelah kamu pergi.</p>
        <a class="solid-btn" href="<?= h(url('lineup.php')) ?>">Discover our Collections</a>
      </div>
      <div class="home-hero-visual">
        <div class="arch"><img src="<?= h(url('assets/orlune-box-set.png')) ?>" alt="ATEA Parfums Orlune, botol dan rigid box"></div>
        <span class="hero-note note-top">EXTRAIT DE PARFUM</span>
      </div>
    </section>

    <section class="intro-strip">
      <p>SCENT IS A FORM OF SELF-EXPRESSION</p>
      <span>Dirancang untuk menemani setiap versi dirimu.</span>
    </section>

    <section class="section-wrap">
      <div class="section-heading">
        <div><p class="eyebrow">FEATURED</p><h2>Signature <em>Scents</em></h2></div>
        <a href="<?= h(url('lineup.php')) ?>" class="text-link">VIEW FULL LINEUP <span>↗</span></a>
      </div>
      <div class="product-grid" id="featuredGrid"></div>
    </section>

    <section class="brand-story">
      <div class="story-mark"><img src="<?= h(url('assets/atea-mark.png')) ?>" alt=""></div>
      <div class="story-copy"><p class="eyebrow">A NOTE ABOUT ATEA</p><h2>Make it<br><em>unforgettable.</em></h2><p>ATEA Parfums percaya bahwa aroma punya cara tersendiri untuk bercerita. Koleksi kami dibuat sebagai ruang untuk menemukan karakter, suasana, dan kesan yang ingin kamu tinggalkan.</p><a href="<?= h(url('about.php')) ?>" class="text-link">READ OUR STORY <span>↗</span></a></div>
    </section>
  </main>
<?php require __DIR__ . '/includes/footer.php'; ?>
