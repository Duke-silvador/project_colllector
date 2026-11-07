"""
AlphaZero on Connect-4 from Scratch

Assembled from your step-by-step solutions.
"""

import numpy as np

# Step 1 - make_empty_board
import numpy as np

def make_empty_board():
    """Return a 6x7 integer numpy array of zeros representing an empty Connect-4 board."""
    # TODO: create a 6x7 integer array of zeros and return it
    return np.zeros((6,7), dtype = int)

# Step 2 - column_top_row
def column_top_row(board, column):
    """Return the lowest empty row in `column`, or -1 if the column is full."""
    # TODO: scan the column from the bottom up and return the first empty row index
    i = 5
    while i >= 0:
        if board[i][column] == 0:
            return i
        i-=1
    return -1

# Step 3 - drop_piece
def drop_piece(board, column, player):
    # TODO: place `player` in the lowest empty row of `column` and return the new board
    available = column_top_row(board, column)
    if available <0:
        raise ValueError
    nBoard = board.copy()
    nBoard[available][column] = player
    return nBoard

# Step 4 - column_full
import numpy as np

def column_full(board, column):
    """Return True if `column` has no empty rows left."""
    # TODO: check whether the column can still accept a piece
    available = column_top_row(board, column)
    return True if available < 0 else False

# Step 5 - valid_moves
def valid_moves(board):
    # TODO: return a list of column indices that still have at least one empty row
    valid = []
    for i in range(board.shape[1]):
        if not column_full(board, i):
            valid.append(i)
    return valid

# Step 6 - four_in_a_row_horizontal
def four_in_a_row_horizontal(board):
    # TODO: scan every row for four consecutive matching non-zero pieces horizontally
    
    for i in range(board.shape[0]):
        for j in range (board.shape[1]-3):
            #print(board[i][j:j+4])
            if np.all(board[i][j:j+4] == 1):
                return 1
            if np.all(board[i][j:j+4] == 2):
                return 2
    return 0

# Step 7 - four_in_a_row_vertical
def four_in_a_row_vertical(board):
    # TODO: scan every column for four consecutive matching non-zero pieces vertically
    #print(board[0][0:4])
    for i in range(board.shape[1]):
        for j in range (board.shape[0]-3):
            #print(board[j:j+4][i])
            if np.all(board[j:j+4,i] == 1): return 1
            if np.all(board[j:j+4,i] == 2): return 2
    return 0

# Step 8 - four_in_a_row_diagonal_down_right
def four_in_a_row_diagonal_down_right(board):
    # TODO: scan every down-right diagonal of the 6x7 board for four matching non-zero pieces
    
    for i in range(board.shape[0]-3):
        for j in range (board.shape[1]-3):
            if np.all(np.diag(board[i:i+4,j:j+4]) == 1): return 1
            if np.all(np.diag(board[i:i+4,j:j+4]) == 2): return 2
    return 0

# Step 9 - four_in_a_row_diagonal_up_right
def four_in_a_row_diagonal_up_right(board):
    # TODO: scan every up-right diagonal for four consecutive matching non-zero pieces
   
    for i in range(board.shape[0]-3):
        for j in range (board.shape[1]-3):
            if np.all(np.diag(np.fliplr(board[i:i+4,j:j+4])) == 1): return 1
            if np.all(np.diag(np.fliplr(board[i:i+4,j:j+4])) == 2): return 2
    return 0

# Step 10 - check_winner
import numpy as np

def check_winner(board):
    """Return 1 or 2 if that player has four in a row, else 0."""
    # TODO: combine the four direction scans and return the first non-zero result
    if four_in_a_row_diagonal_down_right(board) != 0:
        return four_in_a_row_diagonal_down_right(board)
    elif four_in_a_row_vertical(board) != 0:
        return four_in_a_row_vertical(board)
    elif four_in_a_row_diagonal_up_right(board) != 0:
        return four_in_a_row_diagonal_up_right(board)
    elif four_in_a_row_horizontal(board)!=0:
        return four_in_a_row_horizontal(board)
    else:
        return 0

# Step 11 - board_is_full
def board_is_full(board):
    # TODO: return True when no column has an empty slot left
    top_row = board[0, :]
    return np.all(top_row != 0)

# Step 12 - is_terminal
def is_terminal(board):
    # TODO: return (done, winner) using check_winner and board_is_full.
    
    if board_is_full(board):
        
        return True, check_winner(board)
    if check_winner(board) != 0:
        return True, check_winner(board)
    return False, 0

# Step 13 - other_player
def other_player(player):
    # TODO: return the opponent's player code (1 <-> 2)
    return 1 if player == 2 else 2

# Step 14 - step_env
def step_env(board, column, player):
    # TODO: drop piece for player, then return (new_board, done, winner, next_player).
    b = drop_piece(board, column, player)
    done, status = is_terminal(b)
    other = other_player(player)
    return b, done, status, other

# Step 15 - encode_board
def encode_board(board, current_player):
    """Encode a 6x7 board as a (2, 6, 7) float32 tensor from current_player's view."""
    # TODO: build two binary planes (current player, opponent) and stack them
    a = np.where(board == current_player, 1., 0.).astype(dtype = 'f')
    b = np.where(board == other_player(current_player), 1., 0.).astype(dtype = 'f')
    return np.array([a,b])

# Step 16 - board_to_torch_tensor
def board_to_torch_tensor(board, current_player):
    # TODO: encode the board and return it as a float32 torch tensor of shape (1, 2, 6, 7).
    return torch.from_numpy(encode_board(board,current_player)).unsqueeze(0).float()

# Step 17 - init_conv_backbone
def init_conv_backbone(in_channels=2, hidden_channels=16):
    # TODO: Build a small convolutional backbone preserving the 6x7 spatial shape.
    return nn.Sequential(
        nn.Conv2d(in_channels, hidden_channels, kernel_size=3, stride=1, padding=1),
        nn.ReLU(),
        nn.Conv2d(hidden_channels, hidden_channels, kernel_size=3, stride=1, padding=1),
        nn.ReLU()
    )

# Step 18 - init_policy_head
import torch
import torch.nn as nn

def init_policy_head(hidden_channels=16, num_columns=7):
    """Return an nn.Module mapping (B, hidden_channels, 6, 7) -> (B, num_columns) logits."""
    # TODO: build a small policy head that projects backbone features to column logits
    return nn.Sequential(
        nn.Flatten(),
        nn.Linear(hidden_channels * 6 * 7, 128),
        nn.ReLU(),
        nn.Linear(128, num_columns)
    )

# Step 19 - init_value_head
import torch
import torch.nn as nn

def init_value_head(hidden_channels=16):
    """Return an nn.Module mapping (B, hidden_channels, 6, 7) -> (B, 1) in (-1, 1)."""
    # TODO: build a value head that collapses backbone features to a single bounded scalar per board.
    return nn.Sequential(
        nn.Flatten(),
        nn.Linear(hidden_channels*6*7, 1),
        nn.Tanh()
    )

# Step 20 - build_policy_value_net
import torch
import torch.nn as nn

def build_policy_value_net(in_channels=2, hidden_channels=16, num_columns=7):
    """Compose backbone + policy head + value head into one nn.Module."""
    # TODO: build an nn.Module with backbone, policy_head, value_head attributes
    

    class PolicyVal(nn.Module):
        def __init__(self):
            super().__init__()
            self.backbone = init_conv_backbone(in_channels=in_channels, hidden_channels=hidden_channels)
            self.policy_head = init_policy_head(hidden_channels=hidden_channels, num_columns=num_columns)
            self.value_head = init_value_head(hidden_channels=hidden_channels)
        def forward(self,x):
            f = self.backbone(x)
            p = self.policy_head(f)
            v = self.value_head(f)
            return (p,v)

    return PolicyVal()

# Step 21 - policy_value_forward
import torch
import torch.nn as nn

def policy_value_forward(net, encoded_board):
    """Run encoded_board (B,2,6,7) through net and return (logits, value)."""
    # TODO: call the network on the encoded board and return its two outputs
    return net(encoded_board)

# Step 22 - action_mask
import numpy as np

def action_mask(board):
    # TODO: return a length-7 boolean mask, True where the column is legal
    val = valid_moves(board)
    action = [True if i in val else False for i in range(7)]
    return np.array(action, dtype=bool)

# Step 23 - masked_policy_logits
import torch

def masked_policy_logits(logits, mask):
    """Set logits at illegal columns to -inf.

    logits: torch.Tensor of shape (..., 7)
    mask:   bool array/tensor of shape (7,), True = legal
    returns: torch.Tensor of same shape as logits
    """
    # TODO: replace logits at illegal columns with negative infinity
    mask = torch.as_tensor(mask, dtype=torch.bool)
    logits = torch.where(mask, logits, -torch.inf)
    return logits

# Step 24 - masked_log_softmax
import torch

def masked_log_softmax(logits, mask):
    """Log-softmax of logits with illegal columns (mask=False) forced to -inf."""
    # TODO: mask out illegal columns, then apply log-softmax over the last dim.
    m = masked_policy_logits(logits,mask)
    s = torch.nn.LogSoftmax(dim=-1)
    return s(m)

# Step 25 - sample_action_from_policy
import torch

def sample_action_from_policy(logits, mask, temperature=1.0):
    """Sample a legal column from a tempered masked categorical policy."""
    # TODO: scale logits by temperature, mask illegal columns, sample one index
    logits = logits / temperature

    # Mask illegal actions
    logits = masked_policy_logits(logits, mask)

    # Convert logits to probabilities
    probabilities = torch.softmax(logits, dim=-1)

    # Sample one action
    action = torch.multinomial(probabilities, num_samples=1)

    return action.item()

# Step 26 - greedy_action_from_policy
import torch

def greedy_action_from_policy(logits, mask):
    """Return the argmax legal column index from masked policy logits."""
    # TODO: mask out illegal columns then return the argmax as a python int
    


    # Mask illegal actions
    logits = masked_policy_logits(logits, mask)

    return torch.argmax(logits).item()

# Step 27 - make_mcts_node
def make_mcts_node(prior=0.0, parent=None):
    # TODO: build a dict with prior, visit_count, value_sum, children, and parent fields.
    return dict(prior=prior, visit_count= 0, value_sum=0.0, children= {}, parent= parent)

# Step 28 - node_q_value
def node_q_value(node):
    # TODO: return the mean value Q = value_sum / visit_count, or 0.0 if visit_count == 0
    return node['value_sum']/node['visit_count'] if node['visit_count']!=0 else 0.0

# Step 29 - ucb_score
import math

def ucb_score(parent, child, c_puct=1.5):
    # TODO: return Q(child) + c_puct * prior * sqrt(N_parent) / (1 + N_child)
    return node_q_value(child) + c_puct * child['prior'] * math.sqrt(parent['visit_count'])/(1+child['visit_count'])

# Step 30 - select_best_child
def select_best_child(node, legal_actions, c_puct=1.5):
    # TODO: return (action, child) maximizing PUCT among legal children of node.
    return max(
        (
            (action, node['children'][action])
            for action in legal_actions
            if action in node['children']
        ),
        key=lambda item: ucb_score(node, item[1], c_puct=c_puct)
    )

# Step 31 - select_leaf
def select_leaf(root, c_puct):
    # TODO: walk down the MCTS tree picking the best PUCT child until a non-expanded node is reached
    if not root['children']:
        return root
    action, child = select_best_child(
        root,
        list(root['children'].keys()),
        c_puct
    )
    return select_leaf(child, c_puct=c_puct)

# Step 32 - evaluate_with_network (not yet solved)
# TODO: implement

# Step 33 - expand_node (not yet solved)
# TODO: implement

# Step 34 - backup_value (not yet solved)
# TODO: implement

# Step 35 - run_one_simulation (not yet solved)
# TODO: implement

# Step 36 - run_mcts (not yet solved)
# TODO: implement

# Step 37 - visit_count_policy (not yet solved)
# TODO: implement

# Step 38 - mcts_choose_action (not yet solved)
# TODO: implement

# Step 39 - record_self_play_step (not yet solved)
# TODO: implement

# Step 40 - play_self_play_game (not yet solved)
# TODO: implement

# Step 41 - assign_value_targets (not yet solved)
# TODO: implement

# Step 42 - generate_self_play_batch (not yet solved)
# TODO: implement

# Step 43 - value_loss_mse (not yet solved)
# TODO: implement

# Step 44 - policy_loss_cross_entropy (not yet solved)
# TODO: implement

# Step 45 - l2_regularization_loss (not yet solved)
# TODO: implement

# Step 46 - combined_loss (not yet solved)
# TODO: implement

# Step 47 - encode_batch_states (not yet solved)
# TODO: implement

# Step 48 - iterate_minibatches (not yet solved)
# TODO: implement

# Step 49 - training_step (not yet solved)
# TODO: implement

# Step 50 - training_epoch (not yet solved)
# TODO: implement

# Step 51 - self_play_iteration (not yet solved)
# TODO: implement

# Step 52 - train_loop (not yet solved)
# TODO: implement

# Step 53 - random_policy_action (not yet solved)
# TODO: implement

# Step 54 - greedy_agent_action (not yet solved)
# TODO: implement

# Step 55 - play_one_match (not yet solved)
# TODO: implement

# Step 56 - match_win_rate (not yet solved)
# TODO: implement

# Step 57 - evaluate_against_random (not yet solved)
# TODO: implement

