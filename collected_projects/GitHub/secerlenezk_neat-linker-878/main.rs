//! neat-linker-878 — Rust developer, open source.
//! 拿来练手的小仓库

use std::collections::HashMap;
use std::io::{self, BufRead};

fn main() {
    let mut counts: HashMap<String, usize> = HashMap::new();
    let mut total = 0usize;
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.unwrap_or_default();
        let key = line.trim().to_string();
        if key.is_empty() {
            continue;
        }
        *counts.entry(key).or_insert(0) += 1;
        total += 1;
    }
    let mut items: Vec<_> = counts.into_iter().collect();
    items.sort_by(|a, b| b.1.cmp(&a.1));
    for (k, v) in &items {
        println!("{:>4}  {}", v, k);
    }
    println!("---");
    println!("{} unique / {} lines", items.len(), total);
}
