#include <iostream>
using namespace std;

// Recursive function to find the safe position
int josephus(int n, int k) {
    if (n == 1) 
        return 0;  // base case: only one person left
    return (josephus(n - 1, k) + k) % n;
}

int main() {
    int n, k;
    cout << "Enter number of people: ";
    cin >> n;
    cout << "Enter step count (k): ";
    cin >> k;

    int safePos = josephus(n, k);
    cout << "Survivor is at position: " << safePos + 1 << endl; 
    // +1 because positions are usually numbered from 1
    return 0;
}
