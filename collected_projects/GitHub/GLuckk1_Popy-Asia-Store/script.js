// ==========================================
// KERANJANG BELANJA
// ==========================================

let keranjang = [];


// ==========================================
// STOK PRODUK
// ==========================================

let stokProduk = {};

document.querySelectorAll(".produk-card").forEach(function(kartu) {

    const nama =
        kartu.querySelector("h3").textContent.trim();

    const stokElement =
        kartu.querySelector(".stok");

    if (stokElement) {

        const stok =
            parseInt(stokElement.textContent.replace(/\D/g, "")) || 0;

        stokProduk[nama] = stok;

    }

});

// ==========================================
// TOMBOL TAMBAH KE KERANJANG
// ==========================================


document.addEventListener("click", function(event) {
    const tombol = event.target.closest(".produk-card .btn");

    if (!tombol) return;

    const kartu = tombol.closest(".produk-card");

    const nama = kartu.querySelector("h3").textContent.trim();

    const gambar = kartu.querySelector("img")?.src || "";

    const areaHargaPromo = kartu.querySelector(".harga-promo");

const hargaText = areaHargaPromo
    ? areaHargaPromo.textContent
    : kartu.querySelector(".harga").textContent;

const harga = parseInt(hargaText.replace(/\D/g, ""), 10) || 0;

    // Cek stok
    if (stokProduk[nama] <= 0) {
        alert("Maaf, stok " + nama + " sudah habis.");
        return;
    }

    const produkAda = keranjang.find(function(produk) {
        return produk.nama === nama;
    });

    if (produkAda) {
    produkAda.jumlah++;

    if (!produkAda.gambar_url) {
        produkAda.gambar_url = gambar;
    }
} else {
        const areaPromo = kartu.querySelector(".harga-promo");

        const promo = areaPromo
            ? parseInt(areaPromo.dataset.promo, 10) || 0
            : 0;

        keranjang.push({
    nama: nama,
    harga: harga,
    jumlah: 1,
    promo: promo > 0,
    gambar_url: gambar
});
    }

    // Kurangi stok
    stokProduk[nama]--;

    tampilkanKeranjang();
    tampilkanStok();
});

// ==========================================
// TAMPILKAN KERANJANG
// ==========================================

function updateJumlahKeranjang() {
    const badge = document.querySelector("#jumlahKeranjang");

    if (!badge) return;

    const totalJumlah = keranjang.reduce(function(total, produk) {
        return total + produk.jumlah;
    }, 0);

    badge.textContent = totalJumlah;
    badge.style.display = totalJumlah > 0 ? "inline-block" : "none";
}

function tampilkanKeranjang() {

    const areaKeranjang =
        document.querySelector(".keranjang");


    let html = `
        <h2>🛒 Keranjang Belanja</h2>
    `;


    let total = 0;


    if (keranjang.length === 0) {

        html += `
            <p>Keranjang masih kosong.</p>
        `;

    } else {

        keranjang.forEach(function(produk, index) {

            const subtotal =
                produk.harga * produk.jumlah;

            total += subtotal;


            html += `

                <div class="item-keranjang">

    <img
        src="${produk.gambar_url || produk.gambar || produk.gambar_produk || ""}"
        alt="${produk.nama}"
        class="foto-produk-keranjang"
        onerror="this.style.display='none'"
    >

    <div>

        <strong>
           ${produk.promo
           ? "🔥 " + produk.nama
           : produk.nama}
        </strong>

                        <p>
                            \u00A5${produk.harga.toLocaleString("ja-JP")}
                            × ${produk.jumlah}
                        </p>

                    </div>


                    <div>

                        <button
                            onclick="kurangiProduk(${index})">
                            −
                        </button>


                        <span>
                            ${produk.jumlah}
                        </span>


                        <button
                            onclick="tambahProduk(${index})">
                            +
                        </button>


                        <button
                            onclick="hapusProduk(${index})">
                            🗑️
                        </button>

                    </div>


                    <strong>
                        \u00A5${subtotal.toLocaleString("ja-JP")}
                    </strong>

                </div>

            `;

        });


        html += `

            <hr>

            <div class="total-belanja">

                <strong>
                    Total Belanja
                </strong>

                <strong>
                    \u00A5${total.toLocaleString("ja-JP")}
                </strong>

            </div>


            <button
                class="btn"
                onclick="scrollKeCheckout()">

                Checkout

            </button>

        `;

    }


    areaKeranjang.innerHTML = html;

    updateJumlahKeranjang();

    updateCheckoutTotal();

}
// ==========================================
// TAMPILKAN STOK TERBARU
// ==========================================

function tampilkanStok() {

    document.querySelectorAll(".produk-card").forEach(function(kartu) {

        const nama =
            kartu.querySelector("h3").textContent.trim();

        const stokElement =
            kartu.querySelector(".stok");

        if (stokElement && stokProduk[nama] !== undefined) {

            const stok = stokProduk[nama];

            // STOK HABIS
            if (stok <= 0) {

                stokElement.textContent = "🔴 Stok Habis";
                stokElement.className = "stok stok-habis";

            }

            // STOK MENIPIS
            else if (stok <= 20) {

                stokElement.textContent = "🟠 Stok Menipis";
                stokElement.className = "stok stok-menipis";

            }

            // STOK AMAN
            else {

                stokElement.textContent = "🟢 Stok Aman";
                stokElement.className = "stok stok-aman";

            }

        }

    });

}


// ==========================================
// TAMBAH JUMLAH PRODUK
// ==========================================

function tambahProduk(index) {

    const produk =
        keranjang[index];

    // Cek stok
    if (stokProduk[produk.nama] <= 0) {

        alert("Maaf, stok " + produk.nama + " sudah habis.");

        return;

    }

    produk.jumlah++;

    // Kurangi stok
    stokProduk[produk.nama]--;

    tampilkanKeranjang();

    tampilkanStok();

}


// ==========================================
// KURANGI JUMLAH PRODUK
// ==========================================

function kurangiProduk(index) {

    const produk =
        keranjang[index];

    produk.jumlah--;

    // Kembalikan stok
    stokProduk[produk.nama]++;

    if (produk.jumlah <= 0) {

        keranjang.splice(index, 1);

    }

    tampilkanKeranjang();

    tampilkanStok();

}


// ==========================================
// HAPUS PRODUK
// ==========================================

function hapusProduk(index) {

    const produk =
        keranjang[index];

    // Kembalikan semua stok
    stokProduk[produk.nama] += produk.jumlah;

    keranjang.splice(index, 1);

    tampilkanKeranjang();

    tampilkanStok();

}


// ==========================================
// HITUNG TOTAL CHECKOUT
// ==========================================

function updateCheckoutTotal() {

    let subtotal = 0;


    keranjang.forEach(function(produk) {

        subtotal +=
            produk.harga * produk.jumlah;

    });


    const subtotalElement =
        document.querySelector("#checkout-subtotal");


    const totalElement =
        document.querySelector("#checkout-total");


    if (subtotalElement) {

        subtotalElement.textContent =
            "\u00A5" +
            subtotal.toLocaleString("ja-JP");

    }


    if (totalElement) {

        const total = subtotal;

        totalElement.textContent =
            "\u00A5" +
            total.toLocaleString("ja-JP");

    }

}

// ==========================================
// SCROLL KE CHECKOUT
// ==========================================


function scrollKeCheckout() {
    bukaCheckout();

    const checkout = document.querySelector("#checkout");

    if (checkout) {
        checkout.scrollIntoView({
            behavior: "smooth"
        });
    }
}


// ==========================================
// CHECKOUT KE WHATSAPP
// ==========================================


const formCheckout =
    document.querySelector("#form-checkout");

if (formCheckout) {
    formCheckout.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();
            console.log("CHECKOUT DIJALANKAN");


            // Cek keranjang
            if (keranjang.length === 0) {

                alert(
                    "Keranjang masih kosong."
                );

                return;

            }


            // ==================================
            // DATA PELANGGAN
            // ==================================

            const nama =
                document.querySelector("#nama").value.trim();


            const whatsapp =
                document.querySelector("#whatsapp").value.trim();


            const alamat =
                document.querySelector("#alamat").value.trim();

            const ongkir = 0;



            // ==================================
            // HITUNG SUBTOTAL
            // ==================================

            let subtotal = 0;


            keranjang.forEach(function(produk) {

                subtotal +=
                    produk.harga * produk.jumlah;

            });


            const total =
                subtotal;


            // ==================================
            // BUAT DAFTAR PRODUK
            // ==================================

            let daftarProduk = "";


            keranjang.forEach(
                function(produk, index) {

                    const nomor =
                        index + 1;


                    const subtotalProduk =
                        produk.harga *
                        produk.jumlah;


                    daftarProduk +=
                        nomor +
                        ". " +
                        produk.nama +
                        " x" +
                        produk.jumlah +
                        " = \u00A5" +
                        subtotalProduk.toLocaleString(
                            "ja-JP"
                        ) +
                        "\n";

                }
            );

// ==================================
// SIMPAN PESANAN KE SUPABASE
// ==================================

const itemsPesanan = keranjang.map(function(produk) {

    return {
        nama_produk: produk.nama,
        harga: produk.harga,
        jumlah: produk.jumlah,
        subtotal: produk.harga * produk.jumlah
    };

});


const { data: nomorPesanan, error } =
    await supabaseClient.rpc(
        "buat_pesanan",
        {
            p_nama: nama,
            p_whatsapp: whatsapp,
            p_alamat: alamat,
            p_subtotal: subtotal,
            p_ongkir: ongkir,
            p_total: total,
            p_items: itemsPesanan
        }
    );


if (error) {

    console.error("Gagal menyimpan pesanan:", error);

    alert(
        "Pesanan gagal disimpan ke database.\n\n" +
        error.message
    );

    return;

}


console.log(
    "Pesanan berhasil disimpan:",
    nomorPesanan
);


// ==================================
// SIAPKAN WHATSAPP
// ==================================


            // ==================================
            // BUAT PESAN WHATSAPP
            // ==================================

            const pesan =
                "Halo Popy Asia Store,\n\n" +

                "Saya ingin memesan:\n\n" +

                daftarProduk +

                "\n" +

                "Subtotal: \u00A5" +
                subtotal.toLocaleString("ja-JP") +

                "\n" +

                "Total: \u00A5" +
                total.toLocaleString("ja-JP") +

                "\n\n" +

                "Nama: " +
                nama +

                "\n" +

                "WhatsApp: " +
                whatsapp +

                "\n" +

                "Alamat: " +
                alamat;


            // ==================================
            // NOMOR WHATSAPP TOKO
            // ==================================

            const nomorToko =
                "818060197637";


            // ==================================
            // BUAT LINK WHATSAPP
            // ==================================

            const url =
                "https://wa.me/" +
                nomorToko +
                "?text=" +
                encodeURIComponent(pesan);


            // ==================================
            // BUKA WHATSAPP
            // ==================================

            window.location.href = url;

        }
    );

}


// ==========================================
// JALANKAN SAAT WEBSITE DIBUKA
// ==========================================

tampilkanKeranjang();
// ==========================================
// PENCARIAN + FILTER KATEGORI
// ==========================================

const inputPencarian = document.querySelector("#input-pencarian");
const tombolKategori = document.querySelectorAll(".kategori-list button");
const semuaProduk = document.querySelectorAll("#produk .produk-card");
let kategoriAktif = "semua";

// Status pemuatan produk
let produkSedangDimuat = false;
let semuaProdukSudahDimuat = false;



 // Menyamakan penulisan kategori
function normalisasiKategori(teks) {
    return (teks || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


// Filter produk dan tampilkan hasil pencarian di bawah kolom pencarian
function filterProduk() {
const kataKunci = inputPencarian
? inputPencarian.value.toLowerCase().trim()
: "";

const hasilPencarian = document.getElementById("hasil-pencarian");
const semuaProduk = Array.from(
    document.querySelectorAll("#produk .produk-card")
);

// Jika kolom pencarian kosong, kembalikan produk ke tampilan semula
if (!kataKunci) {
    if (hasilPencarian) {
        hasilPencarian.innerHTML = "";
        hasilPencarian.style.display = "none";
    }

    semuaProduk.forEach(function(produk) {
        const kategoriProduk = normalisasiKategori(
            produk.dataset.kategori || ""
        );

        const kategoriDipilih = normalisasiKategori(kategoriAktif);

        const cocokKategori =
            kategoriDipilih === "semua" ||
            kategoriProduk === kategoriDipilih;

        produk.style.display = cocokKategori ? "" : "none";
    });

    return;
}

// Cari produk yang namanya cocok dengan kata kunci
const produkCocok = semuaProduk.filter(function(produk) {
    const judul = produk.querySelector("h3");
    const namaProduk = judul
        ? judul.textContent.toLowerCase()
        : "";

    return namaProduk.includes(kataKunci);
});
console.log("Kata kunci:", kataKunci, "| Jumlah produk:", semuaProduk.length, "| Produk cocok:", produkCocok.length);
// Sembunyikan produk di bagian bawah agar tidak muncul dua kali
semuaProduk.forEach(function(produk) {
    produk.style.display = "none";
});

// Tampilkan hasil di bawah kolom pencarian
if (hasilPencarian) {
hasilPencarian.style.display = "block";
hasilPencarian.innerHTML = "";

if (produkCocok.length === 0) {
    hasilPencarian.innerHTML =
        "<p>Produk tidak ditemukan.</p>";
} else {
    const gridHasil = document.createElement("div");
    gridHasil.className = "produk-grid";

    produkCocok.forEach(function(produk) {
        gridHasil.appendChild(produk.cloneNode(true));
    });

    hasilPencarian.appendChild(gridHasil);
}

}

}

// PENCARIAN PRODUK — TERMASUK DARI HOME
if (inputPencarian) {
    inputPencarian.addEventListener("input", async function() {

        // Pastikan seluruh produk sudah dimuat sebelum mencari
        if (!semuaProdukSudahDimuat) {

            if (!produkSedangDimuat) {
                await muatProdukSupabase();
            }

            // Tunggu jika produk sedang dimuat oleh proses lain
            while (produkSedangDimuat) {
                await new Promise(function(resolve) {
                    setTimeout(resolve, 100);
                });
            }
        }

        // Jalankan pencarian setelah produk tersedia
        filterProduk();

    });
}

// Klik kategori
tombolKategori.forEach(function(tombol) {
    tombol.addEventListener("click", function() {
        kategoriAktif = normalisasiKategori(
            tombol.textContent
        );

        filterProduk();
    });
});

// NAVIGASI BERANDA, KERANJANG, DAN CHECKOUT


function bukaKeranjang() {
    document.body.classList.remove("halaman-checkout");
    document.body.classList.add("halaman-keranjang");

    const home = document.querySelector("#home");
    const kategoriBeranda = document.querySelector("#kategori-beranda");
    const kategori = document.querySelector("#kategori");
    const produk = document.querySelector("#produk");
    const alamatToko = document.querySelector("#alamat-toko");
    const keranjang = document.querySelector("#keranjang");
    const checkout = document.querySelector("#checkout");
    const pencarian = document.querySelector("#bagian-pencarian");

    if (home) home.style.display = "none";
    if (kategoriBeranda) kategoriBeranda.style.display = "none";
    if (kategori) kategori.style.display = "none";
    if (produk) produk.style.display = "none";
    if (alamatToko) alamatToko.style.display = "none";
    if (pencarian) pencarian.style.display = "none";

    if (keranjang) keranjang.classList.add("halaman-aktif");
    if (checkout) checkout.classList.remove("halaman-aktif");

    ubahMenuAktif("keranjang");
}


function bukaCheckout() {
    document.body.classList.remove("halaman-keranjang");
    document.body.classList.add("halaman-checkout");

    document.querySelector("#keranjang").classList.remove("halaman-aktif");
    document.querySelector("#checkout").classList.add("halaman-aktif");
}



function bukaBeranda() {
    document.body.classList.remove(
        "halaman-keranjang",
        "halaman-checkout",
        "kategori-dipilih"
    );

    const home = document.querySelector("#home");
    const kategori = document.querySelector("#kategori");
    const produk = document.querySelector("#produk");
    const kategoriBeranda = document.querySelector("#kategori-beranda");
    const alamatToko = document.querySelector("#alamat-toko");
    const keranjang = document.querySelector("#keranjang");
    const checkout = document.querySelector("#checkout");
    const pencarian = document.querySelector("#bagian-pencarian");

    if (home) home.style.display = "block";
    if (kategori) kategori.style.display = "none";
    if (produk) produk.style.display = "none";
    if (kategoriBeranda) kategoriBeranda.style.display = "block";
    if (alamatToko) alamatToko.style.display = "block";
    if (pencarian) pencarian.style.display = "block";

    if (keranjang) keranjang.classList.remove("halaman-aktif");
    if (checkout) checkout.classList.remove("halaman-aktif");

    ubahMenuAktif("home");
}



async function bukaProduk() {
    kategoriAktif = "semua";

    if (inputPencarian) {
        inputPencarian.value = "";
    }

    document.body.classList.remove(
        "halaman-keranjang",
        "halaman-checkout",
        "kategori-dipilih"
    );

    const home = document.querySelector("#home");
    const kategoriBeranda = document.querySelector("#kategori-beranda");
    const kategori = document.querySelector("#kategori");
    const produk = document.querySelector("#produk");
    const alamatToko = document.querySelector("#alamat-toko");
    const keranjang = document.querySelector("#keranjang");
    const checkout = document.querySelector("#checkout");
    const pencarian = document.querySelector("#bagian-pencarian");

    if (home) home.style.display = "none";
    if (kategoriBeranda) kategoriBeranda.style.display = "none";
    if (kategori) kategori.style.display = "none";
    if (produk) produk.style.display = "block";
    if (alamatToko) alamatToko.style.display = "none";
    if (pencarian) pencarian.style.display = "block";

    if (keranjang) keranjang.classList.remove("halaman-aktif");
    if (checkout) checkout.classList.remove("halaman-aktif");

    ubahMenuAktif("produk");
    const judulProduk = document.getElementById("judul-produk");
if (judulProduk) {
    judulProduk.textContent = "Produk Kami";
}

    const grid = document.querySelector("#produk .produk-grid");

    if (!semuaProdukSudahDimuat) {
        if (grid) {
            grid.innerHTML = "<p>Memuat semua produk...</p>";
        }

        await muatProdukSupabase();
    }

    filterProduk();

    if (produk) {
        produk.scrollIntoView({ behavior: "smooth" });
    }
}
// MENAMPILKAN SEMUA PRODUK PROMO
async function bukaSemuaPromo() {
    await bukaProduk();

    const semuaKartu = document.querySelectorAll(
        "#produk .produk-card"
    );

    let jumlahPromo = 0;

    semuaKartu.forEach(function(kartu) {
        const sedangPromo = kartu.dataset.promo === "true";

       if (sedangPromo) {
    kartu.style.removeProperty("display");
} else {
    kartu.style.setProperty("display", "none", "important");
}

        if (sedangPromo) {
            jumlahPromo++;
        }
    });

    const judulProduk = document.getElementById("judul-produk");

    if (judulProduk) {
        judulProduk.textContent = "🔥 Semua Promo dan Diskon";
    }

    console.log("Jumlah produk promo:", jumlahPromo);
}

async function bukaKategori() {
    document.body.classList.remove(
        "halaman-keranjang",
        "halaman-checkout"
    );

    const home = document.querySelector("#home");
    const kategoriBeranda = document.querySelector("#kategori-beranda");
    const produk = document.querySelector("#produk");
    const alamatToko = document.querySelector("#alamat-toko");
    const bagianKategori = document.querySelector("#kategori");
    const keranjang = document.querySelector("#keranjang");
    const checkout = document.querySelector("#checkout");
    const pencarian = document.querySelector("#bagian-pencarian");

    if (home) home.style.display = "none";
    if (kategoriBeranda) kategoriBeranda.style.display = "none";
    if (produk) produk.style.display = "none";
    if (alamatToko) alamatToko.style.display = "none";
    if (bagianKategori) bagianKategori.style.display = "block";
    if (pencarian) pencarian.style.display = "none";

    if (keranjang) keranjang.classList.remove("halaman-aktif");
    if (checkout) checkout.classList.remove("halaman-aktif");

    ubahMenuAktif("kategori");

    if (!semuaProdukSudahDimuat) {
        const areaKategori = document.querySelector("#daftar-kategori");

        if (areaKategori) {
            areaKategori.innerHTML = "<p>Memuat kategori dan produk...</p>";
        }

        await muatProdukSupabase();
    }

    await tampilkanKategoriBeranda();

    if (bagianKategori) {
        bagianKategori.scrollIntoView({
            behavior: "smooth"
        });
    }
}


// KATEGORI BERANDA
async function tampilkanKategoriBeranda() {
    const areaKategori = document.querySelector("#daftar-kategori");

    const semuaProduk = Array.from(
        document.querySelectorAll("#produk .produk-card")
    );

    if (!areaKategori) return;

    const { data: kategori, error } = await supabaseClient
        .from("kategori_produk")
        .select("nama_kategori, nilai_kategori")
        .order("nama_kategori", { ascending: true });

    if (error) {
        console.error("Gagal memuat kategori beranda:", error);
        areaKategori.innerHTML = "<p>Kategori belum dapat dimuat.</p>";
        return;
    }

    areaKategori.innerHTML = "";

    kategori.forEach(function(item) {
        const normalisasi = function(teks) {
            return (teks || "")
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .trim();
        };

        const produkKategori = semuaProduk.filter(function(produk) {
            return normalisasi(produk.dataset.kategori) ===
                normalisasi(item.nilai_kategori);
        });

        if (produkKategori.length === 0) return;

        const bagian = document.createElement("div");
        bagian.className = "kategori-beranda-card";

        const judul = document.createElement("h3");
        judul.textContent = item.nama_kategori;
        bagian.appendChild(judul);

        const grid = document.createElement("div");
        grid.className = "produk-grid";

        produkKategori.slice(0, 4).forEach(function(produk) {
            grid.appendChild(produk.cloneNode(true));
        });

        bagian.appendChild(grid);

        const tombol = document.createElement("button");
        tombol.className = "btn";
        tombol.textContent = "Lihat Semua";

        tombol.addEventListener("click", async function() {
document.body.classList.remove(
"halaman-keranjang",
"halaman-checkout"
);

document.querySelector("#keranjang").classList.remove("halaman-aktif");
document.querySelector("#checkout").classList.remove("halaman-aktif");

document.querySelector("#kategori-beranda").style.display = "none";
document.querySelector("#kategori").style.display = "none";
document.querySelector("#produk").style.display = "block";

if (!semuaProdukSudahDimuat) {
    await muatProdukSupabase();
}

if (inputPencarian) {
    inputPencarian.value = "";
}

kategoriAktif = item.nilai_kategori;
document.body.classList.add("kategori-dipilih");

const judulProduk = document.querySelector("#judul-produk");

if (judulProduk) {
    judulProduk.textContent = item.nama_kategori;
}

filterProduk();
ubahMenuAktif("kategori");
            
let tombolKembali = document.getElementById("tombol-kembali-kategori");

if (!tombolKembali) {
    tombolKembali = document.createElement("button");
    tombolKembali.id = "tombol-kembali-kategori";
    tombolKembali.textContent = "← Kembali ke Kategori";
    tombolKembali.type = "button";

    

tombolKembali.style.cssText = `
    position: fixed;
    top: 90px;
    left: 20px;
    z-index: 9999;
    padding: 12px 24px;
    background: #ffffff;
    color: #16a34a;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    cursor: pointer;
    min-height: 42px;
`;



    tombolKembali.addEventListener("click", function() {
document.querySelector("#produk").style.display = "none";
document.querySelector("#kategori-beranda").style.display = "none";
document.querySelector("#kategori").style.display = "block";

document.body.classList.remove("kategori-dipilih");        
        
tombolKembali.style.display = "none";

kategoriAktif = "semua";

if (inputPencarian) {
    inputPencarian.value = "";
}

const judulProduk = document.querySelector("#judul-produk");

if (judulProduk) {
    judulProduk.textContent = "Semua Produk";
}

filterProduk();

document.querySelector("#kategori").scrollIntoView({
    behavior: "smooth"
});

ubahMenuAktif("kategori");

});

    document.body.appendChild(tombolKembali);
}

tombolKembali.style.display = "block";


            if (inputPencarian) {
                inputPencarian.value = "";
            }

            
kategoriAktif = item.nilai_kategori;
            // Ubah judul sesuai kategori yang dipilih
const judulProdukKategori = document.querySelector("#judul-produk");

if (judulProdukKategori) {
judulProdukKategori.textContent = item.nama_kategori;
}


// Urutkan produk dalam kategori berdasarkan nama A-Z
const gridProduk = document.querySelector("#produk .produk-grid");

if (gridProduk) {
    const daftarProduk = Array.from(
        gridProduk.querySelectorAll(".produk-card")
    );

    daftarProduk.sort(function(a, b) {
        const namaA = a.querySelector("h3").textContent.trim();
        const namaB = b.querySelector("h3").textContent.trim();

        return namaA.localeCompare(namaB, "id", {
            sensitivity: "base",
            numeric: true
        });
    });

    daftarProduk.forEach(function(produk) {
        gridProduk.appendChild(produk);
    });
}

filterProduk();


            document.querySelector("#produk").scrollIntoView({
                behavior: "smooth"
            });
        });

        bagian.appendChild(tombol);
        areaKategori.appendChild(bagian);
    });
}


async function muatProdukSupabase() {
// Jangan memuat ulang jika produk sudah tersedia
if (semuaProdukSudahDimuat || produkSedangDimuat) {
return;
}

produkSedangDimuat = true;

const grid = document.querySelector("#produk .produk-grid");

    if (!grid) {
        console.error("Elemen .produk-grid tidak ditemukan.");
        return;
    }

    try {
        const { data, error } = await supabaseClient
    .from("produk")
    .select("nama_produk, kategori, harga, harga_promo, harga_lama, stok, gambar_url")
    .eq("aktif", true)
    .order("nama_produk", { ascending: true });

        if (error) {
            console.error("Gagal memuat produk:", error);
            return;
        }

        if (!data || data.length === 0) {
            grid.innerHTML = "<p>Belum ada produk tersedia.</p>";
            return;
        }

        grid.innerHTML = data.map(produk => {
            const nama = produk.nama_produk || "Produk";
            const kategori = produk.kategori || "";
            const harga = Number(produk.harga) || 0;
            const hargaPromo = Number(produk.harga_promo) || 0;
            const hargaLama = Number(produk.harga_lama) || harga;
            const stok = Number(produk.stok) || 0;
            stokProduk[nama] = stok;
            const gambar = produk.gambar_url || "";
            const sedangPromo = hargaPromo > 0 && hargaPromo < harga;

            const hargaTampil = sedangPromo ? hargaPromo : harga;

            return `
                
                  <div class="produk-card"
    data-promo="${sedangPromo ? "true" : "false"}"
    data-kategori="${kategori}"
    data-nama="${nama}">
                  <div class="produk-gambar">
                      <img src="${gambar}" alt="${nama}"
                      loading="lazy"
                      fetchpriority="auto"
                      decoding="async"
                      onerror="this.style.display='none'">
                  </div>


                    <h3>${nama}</h3>

                    <div class="harga">
                        ${sedangPromo
                            ? `<span class="harga-lama">¥${hargaLama.toLocaleString("ja-JP")}</span>
                               <span class="harga-promo">¥${hargaTampil.toLocaleString("ja-JP")}</span>`
                            : `<span>¥${hargaTampil.toLocaleString("ja-JP")}</span>`
                        }
                    </div>

                    <p class="stok ${
    stok <= 0
        ? "stok-habis"
        : stok <= 20
            ? "stok-menipis"
            : "stok-aman"
}">
    ${
        stok <= 0
            ? "Stok Habis"
            : stok <= 21
                ? "Stok Menipis"
                : "Stok Aman"
    }
</p>

                    <button class="btn"
                            data-nama="${nama}"
                            data-harga="${hargaTampil}"
                            ${stok <= 0 ? "disabled" : ""}>
                        ${stok <= 0 ? "Stok Habis" : "Tambah ke Keranjang"}
                    </button>
                </div>
            `;
        }).join("");

        console.log("Produk Supabase berhasil ditampilkan:", data.length);

semuaProdukSudahDimuat = true;

} catch (err) {
console.error("Terjadi kesalahan saat memuat produk:", err);
} finally {
produkSedangDimuat = false;
}
}


// ==========================================
// PRODUK PROMO DAN PILIHAN DI HOME
// ==========================================

async function muatProdukHome() {
    const areaPromo = document.getElementById("produk-promo-home");
    const areaPilihan = document.getElementById("produk-pilihan-home");

    if (!areaPromo || !areaPilihan) return;

    try {
        const { data, error } = await supabaseClient
    .from("produk")
    .select("nama_produk, kategori, harga, harga_promo, harga_lama, stok, gambar_url, tampilkan_di_pilihan")
    .eq("aktif", true)
    .order("nama_produk", { ascending: true });
        if (error) {
            throw error;
        }

        const produkAktif = data || [];

        const produkPromo = produkAktif
            .filter(produk =>
                Number(produk.harga_promo) > 0 &&
                Number(produk.harga_promo) < Number(produk.harga)
            )
            .slice(0, 8);

        const produkPilihan = produkAktif
    .filter(produk => produk.tampilkan_di_pilihan === true)
    .slice(0, 8);

        function buatKartuHome(produk, tampilkanPromo) {
            const nama = produk.nama_produk || "Produk";
            const harga = Number(produk.harga) || 0;
            const hargaPromo = Number(produk.harga_promo) || 0;
            const hargaLama = Number(produk.harga_lama) || harga;
            const stok = Number(produk.stok) || 0;
            stokProduk[nama] = stok;
            const gambar = produk.gambar_url || "";
            const sedangPromo =
                hargaPromo > 0 && hargaPromo < harga;
            const hargaTampil =
                tampilkanPromo && sedangPromo ? hargaPromo : harga;

            const kartu = document.createElement("div");
            kartu.className = "produk-card";
            kartu.dataset.kategori = produk.kategori || "";
            kartu.dataset.nama = nama;

            const areaGambar = document.createElement("div");
            areaGambar.className = "produk-gambar";

            const img = document.createElement("img");
            img.src = gambar;
            img.alt = nama;
            img.loading = "lazy";
            img.decoding = "async";
            img.onerror = function() {
                this.style.display = "none";
            };

            areaGambar.appendChild(img);

            const judul = document.createElement("h3");
            judul.textContent = nama;

            const areaHarga = document.createElement("div");
            areaHarga.className = "harga";

            if (tampilkanPromo && sedangPromo) {
                const hargaSebelum = document.createElement("span");
                hargaSebelum.className = "harga-lama";
                hargaSebelum.textContent =
                    "¥" + hargaLama.toLocaleString("ja-JP");

                const hargaSekarang = document.createElement("span");
                hargaSekarang.className = "harga-promo";
                hargaSekarang.textContent =
                    "¥" + hargaTampil.toLocaleString("ja-JP");

                areaHarga.append(hargaSebelum, hargaSekarang);
            } else {
                areaHarga.textContent =
                    "¥" + hargaTampil.toLocaleString("ja-JP");
            }

            const infoStok = document.createElement("p");
infoStok.className = "stok";

if (stok <= 0) {
    infoStok.textContent = "🔴 Stok Habis";
    infoStok.classList.add("stok-habis");
} else if (stok <= 20) {
    infoStok.textContent = "🟠 Stok Menipis";
    infoStok.classList.add("stok-menipis");
} else {
    infoStok.textContent = "🟢 Stok Aman";
    infoStok.classList.add("stok-aman");
}

            const tombol = document.createElement("button");
            tombol.className = "btn";
            tombol.dataset.nama = nama;
            tombol.dataset.harga = String(hargaTampil);
            tombol.disabled = stok <= 0;
            tombol.textContent =
                stok <= 0 ? "Stok Habis" : "Tambah ke Keranjang";

            kartu.append(
                areaGambar,
                judul,
                areaHarga,
                infoStok,
                tombol
            );

            return kartu;
        }

        areaPromo.replaceChildren();
        areaPilihan.replaceChildren();

        if (produkPromo.length === 0) {
            areaPromo.innerHTML = "<p>Belum ada produk promo.</p>";
        } else {
            produkPromo.forEach(produk => {
                areaPromo.appendChild(
                    buatKartuHome(produk, true)
                );
            });
        }

        if (produkPilihan.length === 0) {
            areaPilihan.innerHTML = "<p>Belum ada produk tersedia.</p>";
        } else {
            produkPilihan.forEach(produk => {
                areaPilihan.appendChild(
                    buatKartuHome(produk, false)
                );
            });
        }

        console.log("Produk Home berhasil dimuat.");

    } catch (error) {
        console.error("Gagal memuat produk Home:", error);
        areaPromo.innerHTML = "<p>Promo belum dapat dimuat.</p>";
        areaPilihan.innerHTML =
            "<p>Produk pilihan belum dapat dimuat.</p>";
    }
}

muatProdukHome();

// INDIKATOR MENU AKTIF
function ubahMenuAktif(menu) {
    document.querySelectorAll("nav a").forEach(function(link) {
        link.classList.remove("active");
    });

    const menuAktif = document.querySelector("#nav-" + menu);

    if (menuAktif) {
        menuAktif.classList.add("active");
    }
}
