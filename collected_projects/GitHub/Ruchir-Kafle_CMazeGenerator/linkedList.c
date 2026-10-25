#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <time.h>

#include "linkedList.h"

bool isHead(Node *element) {
    // if the element has a previous node, it can't be the head, so check for
    // that
    if (element == NULL) {
        fprintf(stderr, "No element provided in isHead.\n");
        exit(EXIT_FAILURE);
    }

    if (element->previousNode == NULL) {
        return true;
    }

    return false;
}

bool isTail(Node *element) {
    // if the element has a next node, it can't be the tail, so check for that
    if (element == NULL) {
        fprintf(stderr, "No element provided in isTail.\n");
        exit(EXIT_FAILURE);
    }

    if (element->nextNode == NULL) {
        return true;
    }

    return false;
}

Node *findHead(Node *element) {
    if (element == NULL) {
        fprintf(stderr, "No element provided in findHead.\n");
        exit(EXIT_FAILURE);
    }
    // new iteration var so not to change og argument
    Node *iterateElement = element;

    // loop until iterateElement no longer has a previous node, which means it
    // is the head
    while (!isHead(iterateElement)) {
        iterateElement = iterateElement->previousNode;
    }

    // return the final iterateElement
    return iterateElement;
}

Node *findTail(Node *element) {
    if (element == NULL) {
        fprintf(stderr, "No element provided in findTail.\n");
        exit(EXIT_FAILURE);
    }
    // new iteration var so not to change og argument
    Node *iterateElement = element;

    // loop until iterateElement no longer has a next node, which means it is
    // the tail
    while (!isTail(iterateElement)) {
        iterateElement = iterateElement->nextNode;
    }

    // return the final iterateElement
    return iterateElement;
}

Node *correspondingElementInPreviousRow(Node *parent, Node *element) {
    // function to find the linked list element with the same index as the given one, but in the prev row
    if (element == NULL || parent == NULL) {
        fprintf(stderr, "No element or parent provided in correspondingElementInPreviousRow.\n");
        exit(EXIT_FAILURE);
    }

    Node *iterateElement = parent->previousNode->data;

    while (iterateElement->index != element->index) {
        if (iterateElement->nextNode == NULL) {
            return NULL;
        }

        iterateElement = iterateElement->nextNode;
    }

    return iterateElement;
}

Node *correspondingElementInNextRow(Node *parent, Node *element) {
    // function to find the linked list element with the same index as the given one, but in the next row
    if (element == NULL) {
        fprintf(stderr, "No element or parent provided in correspondingElementInNextRow.\n");
        exit(EXIT_FAILURE);
    }

    Node *iterateElement = parent->nextNode->data;

    while (iterateElement->index != element->index) {
        if (iterateElement->nextNode == NULL) {
            return NULL;
        }

        iterateElement = iterateElement->nextNode;
    }

    return iterateElement;
}

Node *searchByIndex(Node *head, int index) {
    if (head == NULL || !isHead(head)) {
        fprintf(stderr, "Element provided is NULL or not a list head in searchByIndex\n");
        exit(EXIT_FAILURE);
    }

    Node *iterateElement = head;

    while (iterateElement != NULL) {
        if (iterateElement->index == index) {
            return iterateElement;
        } 
        
        iterateElement = iterateElement->nextNode; 
    }

    return NULL;
}

Node *initSingleNode(NodeConfig *config) {
    void *configValue;

    // check if given a config data for the data the node should be given
    // during instantiation
    if (config != NULL) {
        configValue = config->data ? config->data : NULL;
    } else {
        configValue = NULL;
    }

    // create new node
    Node *newNode = (Node *)malloc(sizeof(Node));

    // check for invalid mem allocation
    if (newNode == NULL) {
        printf("Memory allocation failed\n");
        exit(1);
    }

    newNode->data = configValue;
    return newNode;
}

void appendNode(Node *head, Node *element) {
    if (element == NULL || head == NULL) {
        fprintf(stderr, "No element or head provided in appendNode\n");
        exit(EXIT_FAILURE);
    }

    // find the tail of the linked list to add on to
    Node *tail = findTail(head);

    // when we have found the tail, we set that node to have a nextNode
    // and our new node to have a previousNode, meaning it is no longer
    // the tail
    element->previousNode = tail;
    element->nextNode = NULL;
    element->index = tail->index+1;
    tail->nextNode = element;
}

void popLastNode(Node *head) {
    if (head == NULL) {
        fprintf(stderr, "No head provided in popLastNode\n");
        exit(EXIT_FAILURE);
    }

    Node *tail = findTail(head);

    if (tail->index < 1) {
        fprintf(stderr, "Linked list provided is too small to pop a node from in popLastNode\n");
        exit(EXIT_FAILURE);
    }

    tail->previousNode->nextNode = NULL;
    free(tail);
}

Node *initDoublyLinkedList(LinkedListConfig *config) {
    int size;

    // check if size is provided
    if (config != NULL) {
        size = config->size ? config->size : -1;
    } else {
        size = -1;
    }

    // if no size was provided/too small, set to default 2, as 2 is the minimum
    // size
    if (size < 1) {
        size = 1;
    }

    // head node for when created as a start point for linked list
    Node *head;

    // create a new node for each node wished for
    for (int i = 0; i < size; i++) {
        Node *element = initSingleNode(NULL);

        // if first iteration, set node to head, which always has previousNode
        // to NULL
        if (i == 0) {
            element->index = 0;
            head = element;
            head->previousNode = NULL;
            head->nextNode = NULL;
        } else {
            appendNode(head, element);
        }
    }

    return head;
}

