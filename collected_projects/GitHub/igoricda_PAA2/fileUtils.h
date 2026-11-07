#ifndef FILEUTILS_H
#define FILEUTILS_H

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <optional>
#include <string>
#include <vector>

#include "graph.h"

// --- Utilidades de CSV (mesmo formato do LCS) ---

std::optional<std::string> LastSize(const std::string& nomeCSV);

std::optional<std::size_t> PrepareCsvOutput(const std::string& csvPath,
                                            const std::string& header,
                                            const std::vector<std::string>& fileList,
                                            std::ofstream& csvFile);

// --- Leitura do grafo ---

// Lê um arquivo no formato de entrada: primeiro inteiro N (número de
// vértices) seguido de N² inteiros (matriz de adjacência ponderada,
// não direcionada, sem peso negativo). Em caso de erro de abertura ou
// de leitura, imprime mensagem em stderr e devolve um Grafo com n = 0.
Graph ReadGraph(const std::string& fileName);

// Sobrecarga no estilo de ReadFiles do trabalho LCS: lê a partir de um
// std::ifstream já aberto. Devolve false em caso de falha.
bool ReadGraphFile(std::ifstream& file, Graph& graph);

#endif
