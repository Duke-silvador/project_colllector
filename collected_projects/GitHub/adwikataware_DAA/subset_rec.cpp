#include <iostream>
using namespace std;

void generateSubsets(int arr[], int n, int idx, string current) {
    if (idx == n) {
        cout << "{ " << current << "}\n";
        return;
    }

    // Exclude arr[idx]
    generateSubsets(arr, n, idx + 1, current);

    // Include arr[idx]
    generateSubsets(arr, n, idx + 1, current + to_string(arr[idx]) + " ");
}

int main() {
    int n;
    cout << "Enter number of elements: ";
    cin >> n;

    int arr[20];
    cout << "Enter elements: ";
    for (int i = 0; i < n; i++) cin >> arr[i];

    generateSubsets(arr, n, 0, "");
    return 0;
}
