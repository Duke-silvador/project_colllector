#include <iostream>
using namespace std;

void permute(int arr[], int n, int idx) {
    if (idx == n) {   // base case: all positions fixed
        for (int i = 0; i < n; i++) cout << arr[i] << " ";
        cout << "\n";
        return;
    }

    for (int i = idx; i < n; i++) {
        swap(arr[idx], arr[i]);          // put element i at position idx
        permute(arr, n, idx + 1);        // recurse for next position
        swap(arr[idx], arr[i]);          // backtrack
    }
}

int main() {
    int n;
    cin >> n;            // number of elements
    int arr[20];
    for (int i = 0; i < n; i++) cin >> arr[i];

    permute(arr, n, 0);
    return 0;
}