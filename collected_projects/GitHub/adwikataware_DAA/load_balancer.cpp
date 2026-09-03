#include <iostream>
#include <vector>
#include<algorithm>
using namespace std;

int findWinner(int N) {
    vector<int> servers;
    for (int i = 0; i < N; i++) servers.push_back(i);

    while (servers.size() > 1) {
        long long sum = 0;
        for (int x : servers) sum += x;

        vector<int> remaining;
        if (sum % 2 == 0) {
            // CLOCKWISE
            for (int i = 0; i < servers.size(); i += 2)
                remaining.push_back(servers[i]);
        } else {
            // COUNTER-CLOCKWISE
            for (int i = servers.size() - 1; i >= 0; i -= 2)
                remaining.push_back(servers[i]);
            reverse(remaining.begin(), remaining.end());
        }
        servers = remaining;
    }
    return servers[0];
}

int main() {
    int N;
    cout << "Enter number of servers: ";
    cin >> N;
    cout << "Winner: Server " << findWinner(N) << endl;
    return 0;
}
