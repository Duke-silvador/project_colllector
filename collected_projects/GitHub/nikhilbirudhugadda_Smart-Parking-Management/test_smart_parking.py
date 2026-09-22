"""
Automated Comprehensive Test Suite for Smart Parking Management System.
Validates all custom data structures, algorithms, and parking manager logic.
"""

from datetime import datetime, timedelta
import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from structures.min_heap import MinHeap
from structures.max_heap import MaxHeap
from structures.avl_tree import AVLTree
from structures.b_tree import BTree
from structures.graph import Graph
from algorithms.bfs import bfs_shortest_path
from algorithms.dfs import dfs_path, dfs_reachability, dfs_find_dead_ends
from parking.vehicle import Vehicle, VehicleType
from parking.parking_slot import ParkingSlot, SlotType
from parking.parking_lot import ParkingLot
from parking.parking_manager import ParkingManager


class TestDataStructures(unittest.TestCase):
    def test_min_heap(self):
        heap = MinHeap()
        values = [15, 3, 8, 20, 1, 9, 2]
        for v in values:
            heap.push(v)

        self.assertEqual(heap.peek(), 1)
        self.assertEqual(heap.size(), 7)

        sorted_out = []
        while not heap.is_empty():
            sorted_out.append(heap.pop())

        self.assertEqual(sorted_out, [1, 2, 3, 8, 9, 15, 20])

    def test_min_heap_custom_key_and_remove(self):
        heap = MinHeap(key_func=lambda x: x["distance"])
        heap.push({"id": "A", "distance": 25})
        heap.push({"id": "B", "distance": 10})
        heap.push({"id": "C", "distance": 15})

        self.assertEqual(heap.peek()["id"], "B")
        removed = heap.remove({"id": "B", "distance": 10})
        self.assertTrue(removed)
        self.assertEqual(heap.peek()["id"], "C")

    def test_max_heap(self):
        heap = MaxHeap()
        values = [5, 22, 13, 89, 44, 2]
        for v in values:
            heap.push(v)

        self.assertEqual(heap.peek(), 89)
        sorted_desc = []
        while not heap.is_empty():
            sorted_desc.append(heap.pop())

        self.assertEqual(sorted_desc, [89, 44, 22, 13, 5, 2])

    def test_avl_tree_rotations_and_search(self):
        avl = AVLTree()
        # Insert elements that force LL, RR, LR, RL rotations
        plates = ["KA-01", "KA-02", "KA-03", "KA-04", "KA-05", "KA-06", "KA-07"]
        for p in plates:
            avl.insert(p, f"Value-{p}")

        # Ensure balanced height: with 7 nodes, balanced height should be 3
        self.assertEqual(avl.get_height(avl.root), 3)

        # Search existing and non-existing
        self.assertEqual(avl.search("KA-03"), "Value-KA-03")
        self.assertIsNone(avl.search("KA-99"))

        # Inorder traversal must be sorted
        inorder_keys = [k for k, _ in avl.inorder()]
        self.assertEqual(inorder_keys, plates)

        # Deletion
        self.assertTrue(avl.delete("KA-04"))
        self.assertIsNone(avl.search("KA-04"))
        self.assertEqual(avl.size(), 6)

    def test_b_tree(self):
        btree = BTree(t=2)  # 2-3-4 tree
        keys = [10, 20, 5, 6, 12, 30, 7, 17]
        for k in keys:
            btree.insert(k, f"Val-{k}")

        for k in keys:
            self.assertEqual(btree.search(k), f"Val-{k}")

        self.assertIsNone(btree.search(999))

        # Check sorted traversal
        traversed = [k for k, _ in btree.traverse()]
        self.assertEqual(traversed, sorted(keys))

        # Check range query
        range_res = [k for k, _ in btree.range_query(7, 18)]
        self.assertEqual(range_res, [7, 10, 12, 17])


class TestAlgorithms(unittest.TestCase):
    def setUp(self):
        self.g = Graph()
        self.g.add_node("GATE", "Main Gate", "GATE")
        self.g.add_node("J1", "Junction 1", "INTERSECTION")
        self.g.add_node("J2", "Junction 2", "INTERSECTION")
        self.g.add_node("BAY1", "Parking Bay 1", "SLOT")
        self.g.add_node("BAY2", "Parking Bay 2", "SLOT")

        self.g.add_edge("GATE", "J1", weight=10.0)
        self.g.add_edge("J1", "J2", weight=15.0)
        self.g.add_edge("J2", "BAY1", weight=5.0)
        self.g.add_edge("J1", "BAY2", weight=8.0)

    def test_bfs_shortest_path(self):
        path, dist, dirs = bfs_shortest_path(self.g, "GATE", "BAY1")
        self.assertEqual(path, ["GATE", "J1", "J2", "BAY1"])
        self.assertEqual(dist, 30.0)
        self.assertTrue(len(dirs) > 0)

    def test_dfs_reachability_and_dead_ends(self):
        reachable = dfs_reachability(self.g, "GATE")
        self.assertEqual(reachable, {"GATE", "J1", "J2", "BAY1", "BAY2"})

        dead_ends = dfs_find_dead_ends(self.g)
        self.assertIn("BAY1", dead_ends)
        self.assertIn("BAY2", dead_ends)


class TestParkingIntegration(unittest.TestCase):
    def setUp(self):
        self.test_json = os.path.join(BASE_DIR, "data", "test_records.json")
        if os.path.exists(self.test_json):
            os.remove(self.test_json)
        self.manager = ParkingManager(records_file=self.test_json)

    def tearDown(self):
        if os.path.exists(self.test_json):
            os.remove(self.test_json)

    def test_full_parking_lifecycle(self):
        # 1. Park a Car
        res = self.manager.park_vehicle("TEST-CAR-1", VehicleType.CAR, "GATE_NORTH")
        self.assertTrue(res["success"])
        slot_assigned = res["slot_id"]

        # 2. Check AVL search
        found = self.manager.search_vehicle("TEST-CAR-1")
        self.assertIsNotNone(found)
        self.assertEqual(found["slot_id"], slot_assigned)

        # 3. Duplicate park attempt should fail
        dup = self.manager.park_vehicle("TEST-CAR-1", VehicleType.CAR, "GATE_NORTH")
        self.assertFalse(dup["success"])

        # 4. Unpark vehicle after 2 hours
        exit_t = datetime.now() + timedelta(hours=2)
        unpark_res = self.manager.unpark_vehicle("TEST-CAR-1", exit_time=exit_t)
        self.assertTrue(unpark_res["success"])
        self.assertEqual(unpark_res["receipt"]["duration_hours"], 2.0)
        self.assertEqual(unpark_res["receipt"]["fee_paid"], 6.0)  # Car rate $3.0 * 2h = $6.0

        # 5. Check vehicle is removed from AVL tree
        self.assertIsNone(self.manager.search_vehicle("TEST-CAR-1"))

        # 6. Check transaction is in B-Tree
        ticket_id = unpark_res["receipt"]["ticket_id"]
        audit_rec = self.manager.audit_btree.search(ticket_id)
        self.assertIsNotNone(audit_rec)
        self.assertEqual(audit_rec["fee_paid"], 6.0)

        # 7. Slot should be vacant and ready to be re-allocated
        slot_obj = self.manager.parking_lot.get_slot(slot_assigned)
        self.assertFalse(slot_obj.is_occupied)


if __name__ == "__main__":
    unittest.main()

