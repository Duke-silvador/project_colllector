#include <iostream>
#include "server.h"

int main(int argc, char** argv) {
    Server server;
    if (server.parseArgs(argc, argv)) {
        try {
            server.start();
        } catch (std::exception& e) {
            std::cerr << "Критическая ошибка: " << e.what() << "\n";
        }
    }
    return 0;
}
