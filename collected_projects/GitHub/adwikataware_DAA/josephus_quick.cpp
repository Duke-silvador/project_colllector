#include<iostream>
using namespace std;


// Recursive function to find the Josephus survivor
int f(int n) {

    // Base case:
    // If there is only one person, that person is the survivor
    if(n == 1) {
        return 1;
    }

    // If n is odd
    if(n & 1) {
        // n/2 gives the number of pairs
        // 2 * f(n/2) + 1 gives the survivor position
        return 2 * f(n/2) + 1;
    }

    // If n is even
    else {
        // 2 * f(n/2) - 1 gives the survivor position
        return 2 * f(n/2) - 1;
    }
}


int main() {

    // Variable to store the number of people
    int n;

    // Take the number of people as input
    cout << "Enter the number of people: ";
    cin >> n;

    // Call the recursive function and display the survivor
    cout << "Survivor: " << f(n) << endl;

    return 0;
}