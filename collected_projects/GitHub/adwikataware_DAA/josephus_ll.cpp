#include <iostream>
using namespace std;

// Node class for circular linked list
class Node {
public:
    int data;
    Node* next;

    Node(int val) {
        data = val;
        next = nullptr;
    }
};

// Function to solve Josephus problem using linked list
int josephus(int n, int k) {
    // Step 1: Create circular linked list of n people
    Node* head = new Node(1);
    Node* prev = head;
    for (int i = 2; i <= n; i++) {
        prev->next = new Node(i);
        prev = prev->next;
    }
    prev->next = head; // make it circular

    // Step 2: Eliminate until one remains
    Node* ptr = head;
    while (ptr->next != ptr) { // more than one node left
        // move k-1 steps
        for (int i = 1; i < k; i++) {
            ptr = ptr->next;
        }
        // eliminate kth node
        Node* temp = ptr->next;
        ptr->next = temp->next;
        delete temp;
        ptr = ptr->next; // continue from next node
    }

    int survivor = ptr->data;
    delete ptr; // free memory
    return survivor;
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
