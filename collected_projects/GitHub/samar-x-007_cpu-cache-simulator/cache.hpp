#pragma once

#include <cstddef>
#include <cstdint>
#include <random>
#include <vector>

namespace cache_simulator {

enum class Mapping { DirectMapped = 0, SetAssociative = 1, FullyAssociative = 2 };
enum class Replacement { LRU = 0, FIFO = 1, Random = 2 };
enum class WritePolicy { WriteBack = 0, WriteThrough = 1 };
enum class WriteAllocate { WriteAllocate = 0, NoWriteAllocate = 1 };
enum class AccessResult { NotAccessed = -1, Hit = 0, Miss = 1, Eviction = 2, Bypass = 3 };

struct LevelConfig {
    std::size_t capacity_bytes;
    std::size_t block_size_bytes;
    std::size_t associativity;  // Used only for set-associative mapping.
    Mapping mapping;
    Replacement replacement;
    WritePolicy write_policy;
    WriteAllocate write_allocate;
    std::uint64_t access_latency_cycles = 1;
};

struct LevelStatistics {
    std::uint64_t accesses = 0;
    std::uint64_t reads = 0;
    std::uint64_t writes = 0;
    std::uint64_t hits = 0;
    std::uint64_t misses = 0;
    std::uint64_t evictions = 0;
    std::uint64_t writebacks = 0;
    std::uint64_t bypasses = 0;
};

struct MemoryStatistics {
    std::uint64_t reads = 0;
    std::uint64_t writes = 0;
};

struct LevelAccess {
    AccessResult result = AccessResult::NotAccessed;
    std::size_t set_index = 0;
    std::uint64_t block_number = 0;
};

struct AccessRecord {
    std::uint64_t address;
    bool is_write;
    std::vector<LevelAccess> levels;
    std::uint64_t cycles;
};

struct CacheLineView {
    std::size_t set_index;
    std::size_t way;
    std::uint64_t block_number;
    std::uint64_t tag;
    bool dirty;
};

class CacheSimulator {
public:
    CacheSimulator(const std::vector<LevelConfig>& configurations,
                   std::uint64_t memory_latency_cycles = 100);
    AccessRecord access(std::uint64_t address, bool is_write);
    const std::vector<LevelStatistics>& level_statistics() const noexcept { return statistics_; }
    const MemoryStatistics& memory_statistics() const noexcept { return memory_statistics_; }
    std::uint64_t total_cycles() const noexcept { return total_cycles_; }
    std::vector<CacheLineView> valid_lines(std::size_t level_index) const;
    const std::vector<LevelConfig>& configurations() const noexcept { return configurations_; }
    void reset();

private:
    struct Line {
        bool valid = false;
        bool dirty = false;
        std::uint64_t block_number = 0;
        std::uint64_t inserted_at = 0;
        std::uint64_t used_at = 0;
    };
    struct Level {
        LevelConfig config;
        std::size_t ways;
        std::vector<std::vector<Line>> sets;
        std::mt19937_64 random;
    };

    void access_level(std::size_t level_index, std::uint64_t block_number,
                      bool is_write, std::vector<LevelAccess>* trace,
                      bool record_result);
    void memory_access(bool is_write);
    std::size_t choose_victim(Level& level, std::size_t set_index);

    std::vector<LevelConfig> configurations_;
    std::vector<Level> levels_;
    std::vector<LevelStatistics> statistics_;
    MemoryStatistics memory_statistics_;
    std::uint64_t memory_latency_cycles_;
    std::uint64_t total_cycles_ = 0;
    std::uint64_t clock_ = 0;
};

const char* result_name(AccessResult result) noexcept;

}  // namespace cache_simulator
