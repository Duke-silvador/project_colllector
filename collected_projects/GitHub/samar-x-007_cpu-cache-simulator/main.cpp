#include "cache.hpp"

#include <iomanip>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

std::size_t parse_size(const char* text, const char* label) {
    try {
        std::size_t used = 0;
        const unsigned long long value = std::stoull(text, &used, 10);
        if (text[used] != '\0' || value > std::numeric_limits<std::size_t>::max())
            throw std::invalid_argument("invalid");
        return static_cast<std::size_t>(value);
    } catch (...) {
        throw std::invalid_argument(std::string("invalid ") + label + ": " + text);
    }
}

std::uint64_t parse_address(const std::string& token) {
    if (token.empty() || token[0] == '-') throw std::invalid_argument("address must be unsigned");
    std::size_t used = 0;
    const int base = token.size() > 2 && token[0] == '0' &&
        (token[1] == 'x' || token[1] == 'X') ? 16 : 10;
    const std::string digits = base == 16 ? token.substr(2) : token;
    const auto value = std::stoull(digits, &used, base);
    if (used != digits.size()) throw std::invalid_argument("invalid address: " + token);
    return value;
}

void usage(const char* program) {
    std::cerr << "Usage: " << program << " <cache_size_bytes> <block_size_bytes>\n"
              << "Trace input: address (read), R address, or W address; one access per line.\n";
}

}  // namespace

int main(int argc, char* argv[]) {
    if (argc != 3) {
        usage(argv[0]);
        return 2;
    }
    try {
        const std::size_t capacity = parse_size(argv[1], "cache size");
        const std::size_t block_size = parse_size(argv[2], "block size");
        cache_simulator::CacheSimulator simulator({
            {capacity, block_size, 1, cache_simulator::Mapping::DirectMapped,
             cache_simulator::Replacement::LRU, cache_simulator::WritePolicy::WriteBack,
             cache_simulator::WriteAllocate::WriteAllocate}
        });
        std::cout << "Direct-mapped cache: " << capacity << " bytes, " << block_size
                  << " bytes/block\n";
        std::cout << "Enter addresses, one per line; prefix writes with W (Ctrl-D to finish).\n";

        std::string line;
        std::size_t input_line = 0;
        while (std::getline(std::cin, line)) {
            ++input_line;
            const std::size_t first = line.find_first_not_of(" \t\r\n");
            if (first == std::string::npos || line[first] == '#') continue;
            line = line.substr(first);
            try {
                bool is_write = false;
                std::string address_text = line;
                const std::size_t separator = line.find_first_of(" \t,");
                if (separator != std::string::npos) {
                    const std::string operation = line.substr(0, separator);
                    if (operation != "R" && operation != "READ" && operation != "W" && operation != "WRITE")
                        throw std::invalid_argument("expected R or W before the address");
                    is_write = operation == "W" || operation == "WRITE";
                    const std::size_t address_start = line.find_first_not_of(" \t,", separator);
                    if (address_start == std::string::npos) throw std::invalid_argument("missing address");
                    address_text = line.substr(address_start);
                }
                const auto record = simulator.access(parse_address(address_text), is_write);
                const auto& result = record.levels.front();
                std::cout << (is_write ? "WRITE" : "READ") << " address=0x" << std::hex
                          << record.address << std::dec << " set=" << result.set_index
                          << " result=" << cache_simulator::result_name(result.result) << '\n';
            } catch (const std::exception& error) {
                std::cerr << "Input line " << input_line << ": " << error.what() << '\n';
                return 2;
            }
        }

        const auto& stats = simulator.level_statistics().front();
        const auto& memory = simulator.memory_statistics();
        std::cout << "\nSummary\n"
                  << "CPU accesses: " << stats.accesses << '\n'
                  << "Hits:         " << stats.hits << '\n'
                  << "Misses:       " << stats.misses << '\n'
                  << "Evictions:    " << stats.evictions << '\n'
                  << "Writebacks:   " << stats.writebacks << '\n'
                  << "Memory reads: " << memory.reads << '\n'
                  << "Memory writes: " << memory.writes << '\n'
                  << std::fixed << std::setprecision(1)
                  << "Hit rate:     " << (stats.accesses ? 100.0 * stats.hits / stats.accesses : 0.0) << "%\n";
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        usage(argv[0]);
        return 2;
    }
}
