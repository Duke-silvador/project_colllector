"""
From here mostly: https://github.com/openai/multiagent-particle-envs/blob/master/make_env.py
"""
from settings import *
import copy


from algopricing.MultiAgentEnv_algopricing import MultiAgentEnv_algopricing

def make_env_agents(agentnames, project_part = 1, params=None, first_file=None, second_file=None, agents_folder=None):
    import agents

    if project_part == 1 and params is None:
        params = default_params_1
    elif project_part == 2 and params is None:
        params = default_params_2
    params = copy.deepcopy(params)
    
    assert params.get("n_agents") == len(agentnames), "Number of agents must match number of agent names"

    env = MultiAgentEnv_algopricing(
        params, agentnames, first_file, second_file, params["inventory_limit"], params["inventory_replenish"]
    )
    agents = [
        agents.load(name + ".py", agents_folder).Agent(en, copy.deepcopy(params))
        for en, name in enumerate(agentnames)
    ]
    return env, agents
