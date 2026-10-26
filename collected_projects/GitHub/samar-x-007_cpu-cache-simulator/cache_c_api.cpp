#include "cache_c_api.h"

#include "cache.hpp"

#include <memory>
#include <new>
#include <vector>

using namespace cache_simulator;

extern "C" {

void* cache_create(const CacheLevelConfigC* configurations, size_t level_count,
                   uint64_t memory_latency_cycles) {
    if (configurations == nullptr || level_count == 0) return nullptr;
    try {
        std::vector<LevelConfig> converted;
        converted.reserve(level_count);
        for (size_t i = 0; i < level_count; ++i) {
            converted.push_back({configurations[i].capacity_bytes,
                                 configurations[i].block_size_bytes,
                                 configurations[i].associativity,
                                 static_cast<Mapping>(configurations[i].mapping),
                                 static_cast<Replacement>(configurations[i].replacement),
                                 static_cast<WritePolicy>(configurations[i].write_policy),
                                 static_cast<WriteAllocate>(configurations[i].write_allocate),
                                 configurations[i].access_latency_cycles});
        }
        return new CacheSimulator(converted, memory_latency_cycles);
    } catch (...) {
        return nullptr;
    }
}

void cache_destroy(void* cache) {
    delete static_cast<CacheSimulator*>(cache);
}

int cache_access(void* cache, uint64_t address, int is_write,
                 CacheLevelResultC* results, size_t result_count,
                 uint64_t* access_cycles) {
    if (cache == nullptr || results == nullptr || access_cycles == nullptr) return -1;
    try {
        auto* simulator = static_cast<CacheSimulator*>(cache);
        if (result_count != simulator->configurations().size()) return -1;
        const AccessRecord record = simulator->access(address, is_write != 0);
        *access_cycles = record.cycles;
        for (size_t i = 0; i < result_count; ++i) {
            results[i] = {static_cast<int>(record.levels[i].result),
                          record.levels[i].set_index, record.levels[i].block_number};
        }
        return 0;
    } catch (...) {
        return -1;
    }
}

void cache_reset(void* cache) {
    if (cache != nullptr) static_cast<CacheSimulator*>(cache)->reset();
}

int cache_level_statistics(void* cache, size_t level, uint64_t* values) {
    if (cache == nullptr || values == nullptr) return -1;
    const auto& all = static_cast<CacheSimulator*>(cache)->level_statistics();
    if (level >= all.size()) return -1;
    const LevelStatistics& stats = all[level];
    values[0] = stats.accesses;
    values[1] = stats.reads;
    values[2] = stats.writes;
    values[3] = stats.hits;
    values[4] = stats.misses;
    values[5] = stats.evictions;
    values[6] = stats.writebacks;
    values[7] = stats.bypasses;
    return 0;
}

int cache_memory_statistics(void* cache, uint64_t* values) {
    if (cache == nullptr || values == nullptr) return -1;
    const MemoryStatistics& stats = static_cast<CacheSimulator*>(cache)->memory_statistics();
    values[0] = stats.reads;
    values[1] = stats.writes;
    return 0;
}

uint64_t cache_total_cycles(void* cache) {
    if (cache == nullptr) return 0;
    return static_cast<CacheSimulator*>(cache)->total_cycles();
}

size_t cache_valid_line_count(void* cache, size_t level) {
    if (cache == nullptr) return 0;
    try {
        return static_cast<CacheSimulator*>(cache)->valid_lines(level).size();
    } catch (...) {
        return 0;
    }
}

int cache_valid_lines(void* cache, size_t level, CacheLineC* lines, size_t line_count) {
    if (cache == nullptr || (line_count > 0 && lines == nullptr)) return -1;
    try {
        const auto contents = static_cast<CacheSimulator*>(cache)->valid_lines(level);
        if (line_count > contents.size()) return -1;
        for (size_t i = 0; i < line_count; ++i) {
            lines[i] = {contents[i].set_index, contents[i].way, contents[i].block_number,
                        contents[i].tag, contents[i].dirty ? 1 : 0};
        }
        return 0;
    } catch (...) {
        return -1;
    }
}

}  // extern "C"
