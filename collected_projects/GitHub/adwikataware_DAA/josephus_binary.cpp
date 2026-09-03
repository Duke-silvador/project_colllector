#include <iostream>
using namespace std;

int josephus(int n)
{
    // Find the highest power of 2 <= n
    int highestPower = 1;

    while (highestPower * 2 <= n)
    {
        highestPower *= 2;
    }

    // Josephus formula for k = 2
    return 2 * (n - highestPower) + 1;
}

int main()
{
    int n = 10;

    cout << "Survivor = " << josephus(n) << endl;

    return 0;
}