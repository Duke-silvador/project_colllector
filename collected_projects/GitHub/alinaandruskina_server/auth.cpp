#include "auth.h"
#include <cryptopp/sha.h>
#include <cryptopp/hex.h>
#include <cryptopp/osrng.h>

std::string Auth::generateSalt() {
    CryptoPP::byte salt[8];
    CryptoPP::AutoSeededRandomPool prng;
    prng.GenerateBlock(salt, sizeof(salt));
    std::string salt_str;
    CryptoPP::ArraySource(salt, sizeof(salt), true,
        new CryptoPP::HexEncoder(new CryptoPP::StringSink(salt_str)));
    while (salt_str.length() < 16) salt_str = "0" + salt_str;
    return salt_str;
}

std::string Auth::computeHash(const std::string& salt, const std::string& password) {
    std::string msg = salt + password;
    std::string hash;
    CryptoPP::SHA1 sha1;
    CryptoPP::StringSource(msg, true,
        new CryptoPP::HashFilter(sha1, new CryptoPP::HexEncoder(new CryptoPP::StringSink(hash))));
    return hash;
}

bool Auth::verifyHash(const std::string& hash, const std::string& salt, const std::string& password) {
    return hash == computeHash(salt, password);
}
