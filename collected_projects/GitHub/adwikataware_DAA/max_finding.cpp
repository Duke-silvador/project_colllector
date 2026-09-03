#include <iostream>
using namespace std;

int main() {
    int n, trials;

    // Ask user for array size and number of trials
    cout << "Enter array size: ";
    cin >> n;

    cout << "Enter number of trials: ";
    cin >> trials;

    int sum = 0; // total updates across all trials

    // Repeat experiment for 'trials' times
    for (int t = 0; t < trials; t++) {
        int arr[n]; // array of size n

        cout << "Enter " << n << " elements for trial " << t+1 << ":" << endl;
        for (int i = 0; i < n; i++) {
            cin >> arr[i]; // manual input of array elements
        }

        int maxVal = arr[0];   // first element is initial maximum
        int updates = 0;       // count of max updates (excluding first element)

        // Standard max-finding loop
        for (int i = 1; i < n; i++) {
            if (arr[i] > maxVal) {
                maxVal = arr[i]; // update maximum
                updates++;       // increment update count
            }
        }

        cout << "Updated max count in this trial = " << updates << endl;
        sum += updates; // add to total
    }

    // Compute average updates across all trials
    double average = (double)sum / trials;

    cout << "\nTotal updates across all trials = " << sum << endl;
    cout << "Average number of updates = " << average << endl;

    return 0;
}
