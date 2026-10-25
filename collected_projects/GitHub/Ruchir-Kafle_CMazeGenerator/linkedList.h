#ifndef MY_CONFIG_H
#define MY_CONFIG_H

// forward declaration
typedef struct Node Node;

// linked list node
struct Node {
    int index;
    Node *previousNode;
    Node *nextNode;

    void *data;
};

// linked list options
typedef struct {
    int size;
} LinkedListConfig;

// optional data to pass in to a node during instantiation
typedef struct {
    void *data;
} NodeConfig;

bool isHead(Node *element);
bool isTail(Node *element);
Node *findHead(Node *element);
Node *findTail(Node *element);
Node *initSingleNode(NodeConfig *config);
void appendNode(Node *head, Node *element);
void popLastNode(Node *head);
Node *initDoublyLinkedList(LinkedListConfig *config);
Node *correspondingElementInPreviousRow(Node *parent, Node *element);
Node *correspondingElementInNextRow(Node *parent, Node *element);
Node *searchByIndex(Node *head, int index);

#endif
