<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/catalog.php';
$page = 'about';
$title = 'About Us — ATEA Parfums';
require __DIR__ . '/includes/header.php';
?>
<main>
    <section class="about-split">
      <div class="about-copy">
        <h1>ABOUT US</h1>
        <p>ATEA Parfums percaya bahwa aroma punya cara tersendiri untuk bercerita. Setiap parfum kami dibuat sebagai ruang untuk menemukan karakter, suasana, dan kesan yang ingin kamu tinggalkan.</p>
        <p>Dari momen sehari-hari hingga malam yang spesial, ATEA hadir sebagai detail kecil yang membuat kamu terasa utuh, dan mudah diingat.</p>
        <a class="outline-link" href="<?= h(url('lineup.php')) ?>">EXPLORE THE LINEUP <span>↗</span></a>
      </div>
      <div class="about-visual"><img src="<?= h(url('assets/orlune-box-set.png')) ?>" alt="ATEA Parfums Orlune, botol dan rigid box"></div>
    </section>

    <section class="values">
      <div><span>01</span><h3>Personal</h3><p>Sepuluh karakter aroma, supaya setiap orang punya yang terasa seperti dirinya.</p></div>
      <div><span>02</span><h3>Lasting</h3><p>Dirancang agar kesan yang ditinggalkan bertahan, bahkan setelah kamu pergi.</p></div>
      <div><span>03</span><h3>Crafted</h3><p>Tersedia dalam ukuran 50 ml dan 100 ml, untuk dibawa bepergian atau dijadikan signature.</p></div>
    </section>

    <section class="brand-story">
      <div class="story-mark"><img src="<?= h(url('assets/atea-mark.png')) ?>" alt=""></div>
      <div class="story-copy"><p class="eyebrow">FIND YOUR SIGNATURE</p><h2>Make it<br><em>unforgettable.</em></h2><a href="<?= h(url('lineup.php')) ?>" class="text-link">DISCOVER THE COLLECTION <span>↗</span></a></div>
    </section>
  </main>
<?php require __DIR__ . '/includes/footer.php'; ?>
