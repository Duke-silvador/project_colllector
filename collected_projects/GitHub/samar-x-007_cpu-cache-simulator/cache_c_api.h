#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct CacheLevelConfigC {
    size_t capacity_bytes;
    size_t block_size_bytes;
    size_t associativity;
    int mapping;          // 0 direct, 1 set associative, 2 fully associative
    int replacement;      // 0 LRU, 1 FIFO, 2 random
    int write_policy;     // 0 write-back, 1 write-through
    int write_allocate;   // 0 write-allocate, 1 no-write-allocate
    uint64_t access_latency_cycles;
} CacheLevelConfigC;

typedef struct CacheLevelResultC {
    int result;           // -1 not accessed, 0 hit, 1 miss, 2 eviction, 3 bypass
    size_t set_index;
    uint64_t block_number;
} CacheLevelResultC;

typedef struct CacheLineC {
    size_t set_index;
    size_t way;
    uint64_t block_number;
    uint64_t tag;
    int dirty;
} CacheLineC;

void* cache_create(const CacheLevelConfigC* configurations, size_t level_count,
                   uint64_t memory_latency_cycles);
void cache_destroy(void* cache);
int cache_access(void* cache, uint64_t address, int is_write,
                 CacheLevelResultC* results, size_t result_count,
                 uint64_t* access_cycles);
void cache_reset(void* cache);
// Eight values: accesses, reads, writes, hits, misses, evictions, writebacks, bypasses.
int cache_level_statistics(void* cache, size_t level, uint64_t* values);
// Two values: memory reads and memory writes.
int cache_memory_statistics(void* cache, uint64_t* values);
uint64_t cache_total_cycles(void* cache);
size_t cache_valid_line_count(void* cache, size_t level);
int cache_valid_lines(void* cache, size_t level, CacheLineC* lines, size_t line_count);

#ifdef __cplusplus
}
#endif
