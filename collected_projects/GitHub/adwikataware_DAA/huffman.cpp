#include<iostream>
#include<queue>
#include<unordered_map>
using namespace std;


// Node class represents each character in the Huffman tree
class Node {
public:
    int freq;       // Stores frequency of the character
    char data;      // Stores the character
    Node* left;     // Points to left child
    Node* right;    // Points to right child

    // Constructor to create a new node
    Node(char d, int f) {
        data = d;
        freq = f;
        left = right = NULL;
    }
};


// Compare class is used by priority queue
// It keeps the node with the smallest frequency at the top
class Compare {
public:
    bool operator()(Node* a, Node* b) {
        return a->freq > b->freq;
    }
};


// Huffmann class contains the Huffman coding functions
class Huffmann {
public:

    // Function to generate Huffman codes
    void generateCodes(Node* root, string code, unordered_map<char, string>& hc) {

        // If the node is empty, return
        if(root == NULL) {
            return;
        }

        // If the node is a leaf node, store its code
        if(root->left == NULL && root->right == NULL) {
            hc[root->data] = code;
            return;
        }

        // Add 0 when moving to the left child
        generateCodes(root->left, code + '0', hc);

        // Add 1 when moving to the right child
        generateCodes(root->right, code + '1', hc);
    }


    // Function to build the Huffman tree and encode the text
    void buildHuffmann(string text) {

        // Map to store the frequency of each character
        unordered_map<char, int> freq;


        // Count the frequency of every character
        for(char ch : text) {
            freq[ch]++;
        }


        // Priority queue stores nodes according to their frequency
        priority_queue<Node*, vector<Node*>, Compare> pq;


        // Create a node for every character
        // and insert it into the priority queue
        for(auto pair : freq) {
            pq.push(new Node(pair.first, pair.second));
        }


        // Build the Huffman tree
        // Continue until only one node remains
        while(pq.size() > 1) {

            // Get the node with the smallest frequency
            Node* left = pq.top();
            pq.pop();

            // Get the node with the second smallest frequency
            Node* right = pq.top();
            pq.pop();


            // Create a new parent node
            // Its frequency is the sum of both child frequencies
            Node* parent = new Node('$', left->freq + right->freq);


            // Connect the two nodes to the parent
            parent->left = left;
            parent->right = right;


            // Insert the new parent node back into the priority queue
            pq.push(parent);
        }


        // The remaining node is the root of the Huffman tree
        Node* root = pq.top();


        // Map to store Huffman codes for each character
        unordered_map<char, string> hc;


        // Generate codes starting from the root
        generateCodes(root, "", hc);


        // Display the Huffman codes
        cout << "Huffmann Codes: ";

        for(auto pair : hc) {
            cout << pair.first << " -> " << pair.second << endl;
        }


        // Variable to store the encoded string
        string encoded = "";


        // Replace every character with its Huffman code
        for(char ch : text) {
            encoded += hc[ch];
        }


        // Display the original text
        cout << "Original text: " << text << endl;

        // Display the Huffman encoded text
        cout << "Huffmann encoded text: " << encoded;
    }
};


int main() {

    // Variable to store the input string
    string text;

    // Take the string as input
    cout << "Enter the string: ";
    cin >> text;


    // Create an object of Huffmann class
    Huffmann h;


    // Call the function to build the Huffman tree
    // and generate the encoded text
    h.buildHuffmann(text);


    return 0;
}