#include <iostream>
using namespace std;

// Function to calculate factorial
long long fact(int n) {
    long long res = 1;
    for (int i = 1; i <= n; i++) res *= i;
    return res;
}

// Function to calculate nCr (combinations)
long long nCr(int n, int r) {
    return fact(n) / (fact(r) * fact(n - r));
}

int main() {
    int n, k;
    cout << "Enter n: ";
    cin >> n;

    cout << "Enter k (for combinations): ";
    cin >> k;

    // Subsets
    long long subsets = 1LL << n;   // 2^n

    // Permutations
    long long permutations = fact(n);  // n!

    // Combinations
    long long combinations = nCr(n, k);

    cout << "Total subsets = " << subsets << endl;
    cout << "Total permutations = " << permutations << endl;
    cout << "Total combinations (n choose k) = " << combinations << endl;

    return 0;
}
