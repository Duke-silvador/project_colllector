#include <iostream>
using namespace std;

int josephus(int n, int k) {
    int arr[n];
    for (int i = 0; i < n; i++)
        arr[i] = 1;

    int count = n, index = 0;

    while (count > 1) {
        int step = 0;
        while (step < k) {
            if (arr[index] == 1)
                step++;
            if (step == k)
                break;
            index = (index + 1) % n;
        }
        arr[index] = 0;
        count--;
        index = (index + 1) % n;
    }

    for (int i = 0; i < n; i++) {
        if (arr[i] == 1)
            return i + 1;
    }
    return -1;
}

int main() {
    int n, k;
    cout << "Enter number of people: ";
    cin >> n;
    cout << "Enter step count (k): ";
    cin >> k;
    cout << "Survivor is at position: " << josephus(n, k) << endl;
    return 0;
}
