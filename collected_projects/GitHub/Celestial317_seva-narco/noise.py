import numpy as np
import networkx as nx
import random

# ==============================================================================
# 1. THE NOISE ENGINE (Your Formula)
# ==============================================================================
class GatedNoise:
    def __init__(self, b=0.5):
        self.b = b

    def _sigmoid(self, x):
        return 1 / (1 + np.exp(-x))

    def inject(self, x):
        """
        Applies Gated Laplace Noise.
        Formula: Output = x + (Sigmoid(Tanh(x)) * LaplaceNoise)
        """
        # 1. Gate (Filter)
        gate = self._sigmoid(np.tanh(x))

        # 2. Noise (Laplace) - RANDOM every time called
        noise = np.random.laplace(loc=0.0, scale=self.b, size=x.shape)

        # 3. Inject
        return x + (gate * noise)

# ==============================================================================
# 2. THE DYNAMIC GRAPH BUILDER
# ==============================================================================
class DynamicGraphBuilder:
    def __init__(self, vector_dim=8):
        self.graph = nx.Graph()
        self.noise_engine = GatedNoise(b=0.5)
        self.dim = vector_dim
        
        # We store base embeddings in a cache so "Cocaine" always starts 
        # from the same place before we distort it.
        self.embedding_cache = {}

    def _get_base_embedding(self, key):
        """
        Returns the 'Anchor' vector. This is fixed for consistency, 
        BUT the graph nodes will be noisy variations of this.
        """
        key_str = str(key)
        if key_str not in self.embedding_cache:
            # Create a deterministic base vector for this concept
            seed = abs(hash(key_str)) % (2**32)
            rng = np.random.RandomState(seed)
            self.embedding_cache[key_str] = rng.randn(self.dim)
        
        return self.embedding_cache[key_str]

    def expand_graph_cycle(self, vendor_data):
        """
        Runs ONE cycle of graph expansion.
        1. Selects RANDOM attributes to perturb (Noise).
        2. Leaves others as clean base vectors.
        3. Adds these specific instances to the graph.
        """
        vendor_id = vendor_data['id']
        
        # 1. Define all 6 connections
        attributes = {
            'modality': vendor_data['modality'],
            'slangs': vendor_data['slangs'], # Handle list processing inside loop
            'drug_type': vendor_data['drug_type'],
            'media': vendor_data['media'],
            'redirection': vendor_data['redirection'],
            'self_node': vendor_id
        }
        
        # 2. RANDOM SELECTION: Which factors change this cycle?
        # We pick between 1 and 6 attributes to apply noise to.
        keys = list(attributes.keys())
        num_to_perturb = random.randint(1, len(keys)) # Randomly decide how many to touch
        targets_for_noise = random.sample(keys, num_to_perturb)
        
        print(f"--- Cycle for {vendor_id} ---")
        print(f"   Selected {num_to_perturb} attributes for noise injection: {targets_for_noise}")

        # Ensure Hub exists
        if not self.graph.has_node(vendor_id):
            self.graph.add_node(vendor_id, type='hub')

        # 3. PROCESSING LOOP
        for attr_name, raw_value in attributes.items():
            
            # A. Get Anchor Vector (The "Fixed" Base)
            # If it's a list (like slangs), we average the base vectors
            if isinstance(raw_value, list):
                vecs = [self._get_base_embedding(v) for v in raw_value]
                base_vec = np.mean(vecs, axis=0)
            else:
                base_vec = self._get_base_embedding(raw_value)

            # B. APPLY NOISE (Conditional)
            # Only apply noise if this attribute was selected in the random lottery
            if attr_name in targets_for_noise:
                final_vec = self.noise_engine.inject(base_vec)
                state = "Noisy"
            else:
                final_vec = base_vec # Keep it clean
                state = "Clean"

            # C. ADD TO GRAPH
            # We create a new instance node every time to simulate graph expansion
            # naming convention: "Vendor_Attribute_RandomSuffix" to allow multiple distinct nodes
            unique_id = f"{vendor_id}_{attr_name}_{random.randint(1000,9999)}"
            
            self.graph.add_node(
                unique_id,
                vector=final_vec,
                original_value=str(raw_value),
                state=state
            )
            
            # D. Connect to Parent
            self.graph.add_edge(vendor_id, unique_id, relation=attr_name)
            
            # Debug visual
            if state == "Noisy":
                # Calculate how much it moved from the "Fixed" anchor
                drift = np.linalg.norm(final_vec - base_vec)
                print(f"   -> Added {attr_name} (Drift: {drift:.4f})")