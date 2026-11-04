import dimod
from dwave.system import LeapHybridSampler  # or dimod.ExactSolver() for small local tests
import openjij as oj

def solve_sudoku_4x4(grid):
    """
    grid: 4x4 nested list, where 0 represents an empty cell.
    """
    # 1. Define binary variables x[r, c, v]
    variables = {}
    for r in range(4):
        for c in range(4):
            for v in range(1, 5):
                variables[(r, c, v)] = dimod.Binary(f"x_{r}_{c}_{v}")

    cqm = dimod.ConstrainedQuadraticModel()

    # Constraint 1: Exactly one value per cell
    for r in range(4):
        for c in range(4):
            cqm.add_constraint(sum(variables[(r, c, v)] for v in range(1, 5)) == 1)

    # Constraint 2: Unique value per row
    for r in range(4):
        for v in range(1, 5):
            cqm.add_constraint(sum(variables[(r, c, v)] for c in range(4)) == 1)

    # Constraint 3: Unique value per column
    for c in range(4):
        for v in range(1, 5):
            cqm.add_constraint(sum(variables[(r, c, v)] for r in range(4)) == 1)

    # Constraint 4: Unique value per 2x2 block
    for br in range(2):
        for bc in range(2):
            for v in range(1, 5):
                cqm.add_constraint(
                    sum(variables[(2*br + i, 2*bc + j, v)] for i in range(2) for j in range(2)) == 1
                )

    # Constraint 5: Given clues
    for r in range(4):
        for c in range(4):
            val = grid[r][c]
            if val != 0:
                cqm.add_constraint(variables[(r, c, val)] == 1)

    # 2. Convert to BQM / QUBO
    bqm, _ = dimod.cqm_to_bqm(cqm, lagrange_multiplier=10.0)

    # # 3. Sample using local classical/heuristic solver or Quantum Leap
    # sampler = dimod.SimulatedAnnealingSampler()
    # sampleset = sampler.sample(bqm, num_reads=100)

    # Replace step 3 with this:
    sampler = oj.SQASampler()
    sampleset = sampler.sample(bqm, trotter=16, num_sweeps=150, num_reads=100)

    # 4. Extract solution
    best_sample = sampleset.first.sample
    solved_grid = [[0]*4 for _ in range(4)]

    for r in range(4):
        for c in range(4):
            for v in range(1, 5):
                if best_sample[f"x_{r}_{c}_{v}"] == 1:
                    solved_grid[r][c] = v

    return solved_grid

# Example Puzzle (0 = empty)
puzzle = [
    [0, 0, 3, 4],
    [3, 4, 0, 0],
    [0, 0, 4, 3],
    [4, 3, 0, 0]
]

solution = solve_sudoku_4x4(puzzle)
for row in solution:
    print(row)