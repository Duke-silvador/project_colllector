#pragma once
#include <string>

class Auth {
public:
    std::string generateSalt();
    std::string computeHash(const std::string& salt, const std::string& password);
    bool verifyHash(const std::string& hash, const std::string& salt, const std::string& password);
};
