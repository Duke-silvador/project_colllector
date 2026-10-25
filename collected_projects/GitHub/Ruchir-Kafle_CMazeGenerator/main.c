#include <raylib.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

// linked list implementation
// linked list node
// maze implemetation:
//      maze row -> maze row -> maze row
//      maze tile -> maze tile -> maze tile
#include "linkedList.h"

// macros
// maze rows and columns should be odd
#define MAZE_ROWS 81
#define MAZE_COLUMNS 81

// just the grid max horizontal / vertical, so this excludes padding which is added after
#define MAX_GRID_SIZE 800

#define TILE_DIMENSIONS (MAX_GRID_SIZE / MAZE_ROWS)

#define HORIZONTAL_PADDING 200
#define VERTICAL_PADDING (HORIZONTAL_PADDING / 2)

// forward declaration
typedef struct MazeTile MazeTile;

// MazeTile properties, value of a single node of a row
struct MazeTile {
    int data;
    MazeTile *right;
    MazeTile *left;
    MazeTile *up;
    MazeTile *down;
};

typedef enum {
    UNVISITED,
    EMPTY,
    WALL
} COLORS;

// config structs

// maze to allow optional inputs for pathing
typedef struct {
    int maze_entrance;
    int maze_exit;
} MazeConfig;

// generate maze template
Node *generateMazeTemplate() {
    // create linked list for maze
    // creates the config, indicating that this linked list should contain the
    // number of rows dictated by MAZE_ROWS
    LinkedListConfig rowsConfig = {.size = MAZE_ROWS};
    // create the linked list of rows, with the first row, the head of this
    // doubly linked list being returned
    Node *firstRow = initDoublyLinkedList(&rowsConfig);

    // setting up columns w/ iteration and config
    Node *rowNode = firstRow;
    LinkedListConfig columnsConfig = {.size = MAZE_COLUMNS};

    // this bool lets us set a bunch of walls if the first or last row is set
    bool shouldBeWall;
    // for each node in the linked list, set its data to another linked list
    // outer linked list = rows
    // each inner linked list = columns
    while (rowNode != NULL) {
        rowNode->data = initDoublyLinkedList(&columnsConfig);
        // check if the row is the first or last, in which case all created
        // tiles should be walls
        if (isHead(rowNode) || isTail(rowNode)) {
            shouldBeWall = true;
        } else {
            shouldBeWall = false;
        }

        // second loop to loop through inner linked lists and assign each data
        // attribute a tile struct
        Node *columnNode = rowNode->data;
        while (columnNode != NULL) {
            // instantiate new MazeTile for each tile
            MazeTile *tile = malloc(sizeof(MazeTile));

            if (tile == NULL) {
                printf("Memory allocation failed\n");
                exit(1);
            }

            // check if the tile should be a wall and set its value
            // plus check if the current node in the iteration is the first or
            // last, in which case it should be a wall
            // or, for recursiveBacktracking, if the node is at an even row and column, it should be a wall
            // this creates a grid where every other block is a wall
            if (shouldBeWall || isTail(columnNode) || isHead(columnNode) 
                || (rowNode->index % 2 == 0 || columnNode->index % 2 == 0)) {
                tile->data = WALL;
            } else {
                tile->data = UNVISITED;
            }

            // set the inner list's data to be a MazeTile
            columnNode->data = tile;

            // go to the next node
            columnNode = columnNode->nextNode;
        }

        // go to the next row
        rowNode = rowNode->nextNode;
    }

    return firstRow;
}
void linkMazeTiles(Node *mazeHead) {
    // check if maze head is not provided
    if (mazeHead == NULL || !isHead(mazeHead)) {
        printf("Maze head not provided");
        return;
    }

    // loop through rows and loop through columns
    Node *row = mazeHead;

    while (row != NULL) {
        Node *column = (Node *)row->data;

        while (column != NULL) {
            MazeTile *workingMazeTile = (MazeTile *)column->data;

            workingMazeTile->left = column->previousNode ? (MazeTile *)column->previousNode->data : NULL;
            workingMazeTile->right = column->nextNode ? (MazeTile *)column->nextNode->data : NULL;

            workingMazeTile->up = row->previousNode ? (MazeTile *)correspondingElementInPreviousRow(row, column)->data : NULL;
            workingMazeTile->down = row->nextNode ? (MazeTile *)correspondingElementInNextRow(row, column)->data : NULL;

            column = column->nextNode;
        }

        row = row->nextNode;
    }
}          

// generate maze paths from the entrance out
void generatePaths(Node *mazeHead, MazeConfig *config) {

    // checking if the user provided the optional params: maze entrance and exit
    int maze_entrance_tile = config->maze_entrance ? config->maze_entrance : -1;
    int maze_exit_tile = config->maze_exit ? config->maze_exit : -1;

    // if maze_entrance_tile was provided, set that tile to entrance; else
    // mid-tile is entrance
    if (maze_entrance_tile != -1) {
    } else {                 
  			
        // approximately in the middle, for odd sized mazes, take half then
        // round down
    }
    // same for maze_exit_tile as maze_entrance_tile
    if (maze_exit_tile != -1) {
    } else {
    }
}

void attachChoices(Node *choices, MazeTile *addition, Node *correspondingWalls, MazeTile *wall) {
    if (choices->data == NULL) {
        choices->data = addition;
        correspondingWalls->data = wall;
    } else {
        NodeConfig data = {.data = addition};
        Node *element = initSingleNode(&data);
        appendNode(choices, element);

        NodeConfig wallData = {.data = wall};
        Node *wallElement = initSingleNode(&wallData);
        appendNode(correspondingWalls, wallElement); 

    }
}

void recursiveBacktracking(Node *mazeHead) {
    // perfect maze generation algorithm
    // simple explanation:
    //      pick a random place to begin and set its state to visited
    //      choose an adjacent unvisited cell, which in this case will be two blocks away
    //      this is necessary in order to allow walls to have space on the board.
    //      When two cells have been picked, by going from one to the next,
    //      get rid of the wall in between them so they are merged if it has not yet been visited.
    //      The next cell should have its state set to visited.
    //      Continue until there are no more adjacent cells.
    //      Backtrack until you can visit a new cell, and when you return to start through backtracking, finish.
    
    // ensure user input validity
    if (mazeHead == NULL) {                                                                                                                                                                                                                                                                                                                                                            
        fprintf(stderr, "Invalid maze head provided");
        exit(EXIT_FAILURE);
    }

    // pick random EMPTY tile to begin
    int randomRow = GetRandomValue(1, MAZE_ROWS/2)*2 - 1;
    int randomCol = GetRandomValue(1, MAZE_COLUMNS/2)*2 - 1;
    
    Node *randomTileRow = searchByIndex(mazeHead, randomRow);
    Node *randomTile = searchByIndex(randomTileRow->data, randomCol);
    MazeTile *randomMazeTile = randomTile->data; 
   
    // memory
    LinkedListConfig visitedConfig = {.size = 1};
    Node *visitedNodes = initDoublyLinkedList(&visitedConfig);
    // setting memory to the first node, randomMazeTile
    visitedNodes->data = randomMazeTile; 

    while (true) {
        // current is just the last node to be stored in memory
        MazeTile *current = (MazeTile *)findTail(visitedNodes)->data;
        
        // choices
        LinkedListConfig choicesConfig = {.size = 1};
        Node *choices = initDoublyLinkedList(&choicesConfig);
        LinkedListConfig correspondingWallConfig = {.size = 1};
        Node *correspondingWalls = initDoublyLinkedList(&correspondingWallConfig);

        // TODO: need to free these pointers at end ^^^

        if (current->left->left != NULL && current->left->left->data == UNVISITED) {
            attachChoices(choices, current->left->left, correspondingWalls, current->left);
        }
        if (current->right->right != NULL && current->right->right->data == UNVISITED) {
            attachChoices(choices, current->right->right, correspondingWalls, current->right);
        }
        if (current->up->up != NULL && current->up->up->data == UNVISITED) {
            attachChoices(choices, current->up->up, correspondingWalls, current->up);
        }
        if (current->down->down != NULL && current->down->down->data == UNVISITED) {
            attachChoices(choices, current->down->down, correspondingWalls, current->down);
        }

        // if no remaining choices, backtrack by going back to the last node
        if (choices->data == NULL) {
            // if there are no choices and we are at the last remembered node, aka the start, end
            if (findTail(visitedNodes)->index == 0) {
                return;
            }

            popLastNode(visitedNodes);
        } else {
            // if choices, find the last node's index and get a random node from the list using that number
            // to generate an index that must be within the list and searching for it.
            int lastIndex = findTail(choices)->index;
            Node *randomNode = searchByIndex(choices, GetRandomValue(0, lastIndex));
            MazeTile *randomTile = randomNode->data;
            randomTile->data = EMPTY;
            
            Node *correspondingWallNode = searchByIndex(correspondingWalls, randomNode->index);
            MazeTile *middleWall = correspondingWallNode->data;
            middleWall->data = EMPTY;
        
            // then go to the next node by appending the node
            NodeConfig data = {.data = randomTile};
            Node *element = initSingleNode(&data);
            appendNode(visitedNodes, element);         
        }
    }



}


void printMaze(Node *head) {
    // printing the maze requires the head of the linked list, otherwise adds
    // more complexity
    if (!isHead(head)) {
        printf("Not linked list head.");
        return;
    }

    // creating an iteration variable for the rows
    Node *row = head;
    while (row != NULL) {
        Node *column = (Node *)row->data;

        while (column != NULL) {
            printf(" %d", ((MazeTile *)column->data)->data);
            column = column->nextNode;
        }

        printf("\n");
        row = row->nextNode;
    }
}

// raylib code for displaying stuff
void raylib_main(Node *mazeHead) {

    // initialize window
    InitWindow(MAX_GRID_SIZE + HORIZONTAL_PADDING, MAX_GRID_SIZE + VERTICAL_PADDING, "Maze");

    // main game loop
    while (!WindowShouldClose()) {
        // begin loop, start drawing
        BeginDrawing();

            // all drawing should happen below
            ClearBackground(SKYBLUE);
            
            int halfXPadding = HORIZONTAL_PADDING / 2;
            int halfYPadding = VERTICAL_PADDING / 2;

            for (int i = 0; i < MAZE_ROWS; i++) {
                for (int j = 0; j < MAZE_COLUMNS; j++) {
                    Color color;

                    Node *row = searchByIndex(mazeHead, i);
                    Node *tileNode = searchByIndex(row->data, j);
                    MazeTile *correspondingTile = tileNode->data;
                    switch (correspondingTile->data) {
                        case (UNVISITED):
                            color = BLUE;
                            break;
                        case (EMPTY):
                            color = WHITE;
                            break;
                        case (WALL):
                            color = GRAY;
                            break;
                    }

                    DrawRectangle(halfXPadding + i * TILE_DIMENSIONS, 
                                  halfYPadding + j * TILE_DIMENSIONS, 
                                  TILE_DIMENSIONS, 
                                  TILE_DIMENSIONS, 
                                  color);
                }
            }
 


        // end loop, stop drawing
        EndDrawing();
    }

    // close the window
    CloseWindow();
}

// temp main for deb;ugging maze logic
int main() {
    Node *maze = generateMazeTemplate();
    linkMazeTiles(maze);

    recursiveBacktracking(maze);
    printMaze(maze);

    raylib_main(maze);

    return 0;
}

