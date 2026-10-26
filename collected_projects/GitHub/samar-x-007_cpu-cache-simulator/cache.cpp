#include "cache.hpp"

#include <algorithm>
#include <stdexcept>
#include <utility>

namespace cache_simulator {

CacheSimulator::CacheSimulator(const std::vector<LevelConfig>& configurations,
                               std::uint64_t memory_latency_cycles)
    : configurations_(configurations), memory_latency_cycles_(memory_latency_cycles) {
    if (configurations.empty() || configurations.size() > 3) {
        throw std::invalid_argument("configure between one and three cache levels");
    }
    if (memory_latency_cycles_ == 0) {
        throw std::invalid_argument("memory latency must be positive");
    }
    const std::size_t block_size = configurations.front().block_size_bytes;
    if (block_size == 0) throw std::invalid_argument("block size must be positive");

    for (std::size_t i = 0; i < configurations.size(); ++i) {
        const LevelConfig& config = configurations[i];
        if (config.capacity_bytes == 0 || config.block_size_bytes != block_size ||
            config.capacity_bytes % config.block_size_bytes != 0 || config.access_latency_cycles == 0) {
            throw std::invalid_argument("all levels need a positive capacity, latency, and the same block size");
        }
        if (config.mapping < Mapping::DirectMapped || config.mapping > Mapping::FullyAssociative ||
            config.replacement < Replacement::LRU || config.replacement > Replacement::Random ||
            config.write_policy < WritePolicy::WriteBack || config.write_policy > WritePolicy::WriteThrough ||
            config.write_allocate < WriteAllocate::WriteAllocate ||
            config.write_allocate > WriteAllocate::NoWriteAllocate) {
            throw std::invalid_argument("invalid cache policy selection");
        }

        const std::size_t lines = config.capacity_bytes / config.block_size_bytes;
        if (lines > 1000000) {
            throw std::invalid_argument("each cache level is limited to one million lines");
        }
        std::size_t ways = 1;
        if (config.mapping == Mapping::SetAssociative) {
            ways = config.associativity;
            if (ways == 0 || ways > lines || lines % ways != 0) {
                throw std::invalid_argument("associativity must divide the number of cache lines");
            }
        } else if (config.mapping == Mapping::FullyAssociative) {
            ways = lines;
        }

        Level level{config, ways, std::vector<std::vector<Line>>(lines / ways),
                    std::mt19937_64(2027 + i)};
        for (auto& set : level.sets) set.resize(ways);
        levels_.push_back(std::move(level));
    }
    statistics_.resize(levels_.size());
}

AccessRecord CacheSimulator::access(std::uint64_t address, bool is_write) {
    const std::uint64_t block_number = address / configurations_.front().block_size_bytes;
    const std::uint64_t cycles_before = total_cycles_;
    AccessRecord record{address, is_write, std::vector<LevelAccess>(levels_.size()), 0};
    access_level(0, block_number, is_write, &record.levels, true);
    record.cycles = total_cycles_ - cycles_before;
    return record;
}

void CacheSimulator::memory_access(bool is_write) {
    total_cycles_ += memory_latency_cycles_;
    if (is_write) ++memory_statistics_.writes;
    else ++memory_statistics_.reads;
}

std::size_t CacheSimulator::choose_victim(Level& level, std::size_t set_index) {
    auto& set = level.sets[set_index];
    for (std::size_t i = 0; i < set.size(); ++i) {
        if (!set[i].valid) return i;
    }
    if (level.config.replacement == Replacement::Random) {
        std::uniform_int_distribution<std::size_t> distribution(0, set.size() - 1);
        return distribution(level.random);
    }

    std::size_t victim = 0;
    std::uint64_t oldest = level.config.replacement == Replacement::FIFO
        ? set[0].inserted_at : set[0].used_at;
    for (std::size_t i = 1; i < set.size(); ++i) {
        const std::uint64_t stamp = level.config.replacement == Replacement::FIFO
            ? set[i].inserted_at : set[i].used_at;
        if (stamp < oldest) {
            oldest = stamp;
            victim = i;
        }
    }
    return victim;
}

void CacheSimulator::access_level(std::size_t level_index, std::uint64_t block_number,
                                  bool is_write, std::vector<LevelAccess>* trace,
                                  bool record_result) {
    if (level_index >= levels_.size()) {
        memory_access(is_write);
        return;
    }

    Level& level = levels_[level_index];
    LevelStatistics& stats = statistics_[level_index];
    total_cycles_ += level.config.access_latency_cycles;
    ++stats.accesses;
    if (is_write) ++stats.writes;
    else ++stats.reads;

    const std::size_t set_index = block_number % level.sets.size();
    auto& set = level.sets[set_index];
    auto found = std::find_if(set.begin(), set.end(), [block_number](const Line& line) {
        return line.valid && line.block_number == block_number;
    });

    if (found != set.end()) {
        ++stats.hits;
        found->used_at = ++clock_;
        if (is_write && level.config.write_policy == WritePolicy::WriteBack) found->dirty = true;
        if (record_result && trace != nullptr) {
            (*trace)[level_index] = {AccessResult::Hit, set_index, block_number};
        }
        if (is_write && level.config.write_policy == WritePolicy::WriteThrough) {
            if (level_index + 1 < levels_.size()) {
                access_level(level_index + 1, block_number, true, trace, record_result);
            } else {
                memory_access(true);
            }
        }
        return;
    }

    ++stats.misses;
    const bool allocate = !is_write || level.config.write_allocate == WriteAllocate::WriteAllocate;
    if (!allocate) {
        ++stats.bypasses;
        if (record_result && trace != nullptr) {
            (*trace)[level_index] = {AccessResult::Bypass, set_index, block_number};
        }
        if (level_index + 1 < levels_.size()) {
            access_level(level_index + 1, block_number, true, trace, record_result);
        } else {
            memory_access(true);
        }
        return;
    }

    const std::size_t victim_index = choose_victim(level, set_index);
    Line& victim = set[victim_index];
    const bool eviction = victim.valid;
    if (eviction) {
        ++stats.evictions;
        if (record_result && trace != nullptr) {
            (*trace)[level_index] = {AccessResult::Eviction, set_index, block_number};
        }
        if (victim.dirty) {
            ++stats.writebacks;
            if (level_index + 1 < levels_.size()) {
                access_level(level_index + 1, victim.block_number, true, trace, false);
            } else {
                memory_access(true);
            }
        }
    } else if (record_result && trace != nullptr) {
        (*trace)[level_index] = {AccessResult::Miss, set_index, block_number};
    }

    // A miss fetches the requested block from the next level before installing it.
    if (level_index + 1 < levels_.size()) {
        access_level(level_index + 1, block_number, false, trace, record_result);
    } else {
        memory_access(false);
    }

    victim.valid = true;
    victim.block_number = block_number;
    victim.dirty = is_write && level.config.write_policy == WritePolicy::WriteBack;
    victim.inserted_at = ++clock_;
    victim.used_at = victim.inserted_at;

    if (is_write && level.config.write_policy == WritePolicy::WriteThrough) {
        if (level_index + 1 < levels_.size()) {
            access_level(level_index + 1, block_number, true, trace, false);
        } else {
            memory_access(true);
        }
    }
}

void CacheSimulator::reset() {
    for (std::size_t i = 0; i < levels_.size(); ++i) {
        for (auto& set : levels_[i].sets) {
            for (Line& line : set) line = Line{};
        }
        levels_[i].random.seed(2027 + i);
    }
    statistics_.assign(levels_.size(), LevelStatistics{});
    memory_statistics_ = MemoryStatistics{};
    clock_ = 0;
    total_cycles_ = 0;
}

std::vector<CacheLineView> CacheSimulator::valid_lines(std::size_t level_index) const {
    if (level_index >= levels_.size()) throw std::out_of_range("cache level does not exist");
    const Level& level = levels_[level_index];
    std::vector<CacheLineView> result;
    for (std::size_t set_index = 0; set_index < level.sets.size(); ++set_index) {
        for (std::size_t way = 0; way < level.sets[set_index].size(); ++way) {
            const Line& line = level.sets[set_index][way];
            if (line.valid) {
                result.push_back({set_index, way, line.block_number,
                                  line.block_number / level.sets.size(), line.dirty});
            }
        }
    }
    return result;
}

const char* result_name(AccessResult result) noexcept {
    switch (result) {
        case AccessResult::Hit: return "HIT";
        case AccessResult::Miss: return "MISS";
        case AccessResult::Eviction: return "EVICTION";
        case AccessResult::Bypass: return "BYPASS";
        case AccessResult::NotAccessed: return "—";
    }
    return "UNKNOWN";
}

}  // namespace cache_simulator
