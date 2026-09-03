#include <iostream>
#include <vector>
using namespace std;

void comb(vector<int>& arr, int k, int start, vector<int>& current) {
    if (current.size() == k) {
        cout << "{ ";
        for (int x : current) cout << x << " ";
        cout << "}\n";
        return;
    }

    for (int i = start; i < arr.size(); i++) {
        current.push_back(arr[i]);          // include element
        comb(arr, k, i + 1, current);       // recurse
        current.pop_back();                 // backtrack
    }
}

int main() {
    int n, k;
    cout << "Enter number of elements: ";
    cin >> n;

    vector<int> arr(n);
    cout << "Enter elements: ";
    for (int i = 0; i < n; i++) cin >> arr[i];

    cout << "Enter size of combination (k): ";
    cin >> k;

    vector<int> current;
    comb(arr, k, 0, current);

    return 0;
}