#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter number of columns: ";
    cin >> n;

    // Array to store number of ways
    int ways[n + 1];

    // Base cases
    ways[0] = 1; // 1 way to tile 0 columns (empty board)
    ways[1] = 1; // 1 way to tile 2x1 board

    // Fill DP table
    for (int i = 2; i <= n; i++) {
        ways[i] = ways[i - 1] + ways[i - 2];
    }

    cout << "Number of ways to tile 2x" << n << " board = " << ways[n] << endl;

    return 0;
}
