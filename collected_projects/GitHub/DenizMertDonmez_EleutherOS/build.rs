fn main() {
    // Cargo'nun hangi özelliklerin aktif olduğunu tuttuğu ortam değişkenini oku
    let features = std::env::var("CARGO_FEATURE_QEMU").is_ok();

    // Eğer qemu özelliği aktifse QEMU linker script'ini, değilse normal linkeri seç
    if features {
        println!("cargo:rustc-link-arg=-Tlinker_qemu.ld");
    } else {
        println!("cargo:rustc-link-arg=-Tlinker.ld");
    }
}

