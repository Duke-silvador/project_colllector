#include "fileUtils.h"

#include <algorithm>
#include <fstream>
#include <iostream>
#include <optional>
#include <vector>

std::optional<std::string> LastSize(const std::string& nomeCSV)
{
    std::ifstream arq(nomeCSV);

    if (!arq.is_open()) {
        return std::nullopt;
    }

    std::string linha;
    std::string ultima;

    std::getline(arq, linha);

    while (std::getline(arq, linha)) {
        if (!linha.empty()) {
            ultima = linha;
        }
    }

    if (ultima.empty()) {
        return std::nullopt;
    }

    return ultima.substr(0, ultima.find(';'));
}

std::optional<std::size_t> PrepareCsvOutput(const std::string& csvPath,
                                            const std::string& header,
                                            const std::vector<std::string>& fileList,
                                            std::ofstream& csvFile)
{
    bool existe = std::filesystem::exists(csvPath);

    csvFile.open(csvPath, std::ios::app);

    if (!csvFile.is_open()) {
        std::cerr << "Erro ao criar o arquivo CSV!\n";
        return std::nullopt;
    }

    if (!existe) {
        csvFile << header;
        csvFile << std::scientific << std::setprecision(6);
    }

    std::size_t start = 0;

    auto ultimo = LastSize(csvPath);
    if (ultimo) {
        auto it = std::find(fileList.begin(), fileList.end(), *ultimo);

        if (it != fileList.end()) {
            start = std::distance(fileList.begin(), it) + 1;
        }
    }

    return start;
}

Graph ReadGraph(const std::string& fileName)
{
    std::ifstream file(fileName);

    if (!file.is_open()) {
        std::cerr << "Erro ao abrir o arquivo: " << fileName << '\n';
        return Graph{};
    }

    Graph graph;
    bool ok = ReadGraphFile(file, graph);

    if (!ok) {
        return Graph{};
    }

    return graph;
}

bool ReadGraphFile(std::ifstream& file, Graph& graph)
{
    if (!file.is_open()) {
        std::cerr << "Erro ao abrir o arquivo!" << '\n';
        return false;
    }

    int n = 0;
    if (!(file >> n) || n <= 0) {
        std::cerr << "Erro ao ler o número de vértices (N)!" << '\n';
        return false;
    }

    std::vector<std::vector<int>> matrix(
        n, std::vector<int>(n, 0));

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            int w = 0;
            if (!(file >> w)) {
                std::cerr << "Erro ao ler a matriz (linha " << i
                          << ", coluna " << j << ")!" << '\n';
                return false;
            }
            matrix[i][j] = w;
        }
    }

    graph = BuildGraph(matrix);
    return true;
}
