"""
AlphaZero on Connect-4 from Scratch scaffold.

Run this with: python scaffold.py
Uses functions defined in model.py.
"""

from model import *  # noqa: F401, F403 (pulls in your solution functions)

"""AlphaZero on Connect-4: end-to-end demo of self-play training and evaluation."""

import numpy as np
import torch

from solution import (
    make_empty_board,
    column_top_row,
    drop_piece,
    column_full,
    valid_moves,
    four_in_a_row_horizontal,
    four_in_a_row_vertical,
    four_in_a_row_diagonal_down_right,
    four_in_a_row_diagonal_up_right,
    check_winner,
    board_is_full,
    is_terminal,
    other_player,
    step_env,
    encode_board,
    board_to_torch_tensor,
    init_conv_backbone,
    init_policy_head,
    init_value_head,
    build_policy_value_net,
    policy_value_forward,
    action_mask,
    masked_policy_logits,
    masked_log_softmax,
    sample_action_from_policy,
    greedy_action_from_policy,
    make_mcts_node,
    node_q_value,
    ucb_score,
    select_best_child,
    select_leaf,
    evaluate_with_network,
    expand_node,
    backup_value,
    run_one_simulation,
    run_mcts,
    visit_count_policy,
    mcts_choose_action,
    record_self_play_step,
    play_self_play_game,
    assign_value_targets,
    generate_self_play_batch,
    value_loss_mse,
    policy_loss_cross_entropy,
    l2_regularization_loss,
    combined_loss,
    encode_batch_states,
    iterate_minibatches,
    training_step,
    training_epoch,
    self_play_iteration,
    train_loop,
    random_policy_action,
    greedy_agent_action,
    play_one_match,
    match_win_rate,
    evaluate_against_random,
)


def _summarize_loss(v):
    """Convert a loss value (scalar or list of scalars) to a single rounded float."""
    if isinstance(v, (list, tuple)):
        if len(v) == 0:
            return float("nan")
        return round(float(np.mean([float(x) for x in v])), 4)
    return round(float(v), 4)


if __name__ == "__main__":
    np.random.seed(0)
    torch.manual_seed(0)

    # --- Sanity-check the board engine ---
    board = make_empty_board()
    print("Empty board shape:", board.shape, "dtype:", board.dtype)
    board = drop_piece(board, 3, 1)
    board = drop_piece(board, 3, 2)
    print("Legal moves after two drops:", valid_moves(board))
    print("Terminal?", is_terminal(board))

    # --- Build a tiny policy-value network ---
    net = build_policy_value_net(in_channels=2, hidden_channels=8, num_columns=7)
    n_params = sum(p.numel() for p in net.parameters())
    print(f"Policy-value net params: {n_params}")

    # --- One forward pass on a fresh board ---
    enc = board_to_torch_tensor(make_empty_board(), current_player=1)
    with torch.no_grad():
        logits, value = policy_value_forward(net, enc)
    print("Policy logits shape:", tuple(logits.shape), "value shape:", tuple(value.shape))

    # --- One MCTS rollout from the empty board ---
    action, pi = mcts_choose_action(
        make_empty_board(), to_play=1, net=net,
        num_simulations=8, c_puct=1.5, temperature=1.0,
    )
    print(f"MCTS picked column {action}; pi = {np.round(pi, 3).tolist()}")

    # --- Generate a small self-play buffer ---
    buffer = generate_self_play_batch(
        net, num_games=2, num_simulations=6, c_puct=1.5, temperature=1.0,
    )
    print(f"Self-play buffer size: {len(buffer)} steps")

    # --- A couple of training steps on that buffer ---
    optimizer = torch.optim.Adam(net.parameters(), lr=1e-3)
    losses_before = training_epoch(
        net, optimizer, buffer, batch_size=8,
        policy_weight=1.0, value_weight=1.0, l2_weight=1e-4, seed=0,
    )
    print("Epoch 1 losses:", {k: _summarize_loss(v) for k, v in losses_before.items()})

    # --- One AlphaZero outer iteration (self-play + training) ---
    iter_result = self_play_iteration(
        net, optimizer,
        num_games=2, num_simulations=6, c_puct=1.5,
        batch_size=8, num_epochs=1, temperature=1.0,
    )
    # self_play_iteration returns {'buffer_size': int, 'losses': [epoch_dict, ...]}
    if isinstance(iter_result, dict) and 'losses' in iter_result and isinstance(iter_result['losses'], list):
        iter_losses = iter_result['losses'][-1] if iter_result['losses'] else {}
    else:
        iter_losses = iter_result
    print("Outer-iter losses:", {k: _summarize_loss(v) for k, v in iter_losses.items()})

    # --- Evaluate the greedy net agent against a random baseline ---
    results = evaluate_against_random(net, num_matches=6, seed=0)
    print("Greedy-net vs random:", results)
