//! fond-fathom-tool — Frontend developer · JavaScript and Webpack
//!
//! 处理日常小任务的工具

use std::collections::HashMap;
use std::io::{self, Read};

fn collect(text: &str) -> Vec<&str> {
    text.lines().map(str::trim).filter(|l| !l.is_empty()).collect()
}

fn report(lines: &[&str] {
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for l in lines {
        *counts.entry(l).or_insert(0) += 1;
    }
    let mut pairs: Vec<_> = counts.into_iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1));
    for (k, v) in &pairs {
        println!("{:>4}  {}", v, k);
    }
    println!("---");
    println!("{} unique / {} lines", pairs.len(), lines.len());
}

fn main() {
    let mut text = String::new();
    io::stdin().read_to_string(&mut text).unwrap();
    let lines = collect(&text);
    if lines.is_empty() {
        eprintln!("no input");
        std::process::exit(1);
    }
    report(&lines);
}
