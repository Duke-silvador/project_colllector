<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/catalog.php';
$page = 'lineup';
$title = 'Lineup — ATEA Parfums';
$withCatalog = true;
require __DIR__ . '/includes/header.php';
?>
<main>
    <section class="page-banner">
      <p class="eyebrow">THE ATEA COLLECTION</p>
      <h1>Our <em>Lineup</em></h1>
      <p class="collection-intro">Sepuluh karakter, sepuluh cerita. Temukan aroma yang paling dekat denganmu, tersedia dalam ukuran 50 ml dan 100 ml.</p>
    </section>
    <section class="collection section-wrap">
      <div class="collection-tools">
        <span id="resultCount">10 FRAGRANCES</span>
        <div class="tool-right">
          <label class="sort-label" for="sortSelect">SORT BY</label>
          <select id="sortSelect" aria-label="Urutkan produk">
            <option value="featured">Featured</option><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
          </select>
        </div>
      </div>
      <div class="product-grid" id="productGrid"></div>
      <p class="empty-state" id="emptyState" hidden>Produk tidak ditemukan. Coba kata kunci lain.</p>
    </section>
  </main>
<?php require __DIR__ . '/includes/footer.php'; ?>
