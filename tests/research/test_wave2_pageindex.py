# tests/research/test_wave2_pageindex.py
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.document_navigation import PageIndexAdapter, PageIndexNode


class TestWave2PageIndex(unittest.TestCase):

    def setUp(self):
        self.adapter = PageIndexAdapter()

    def test_tree_construction_and_nodes(self):
        res = self.adapter.build_tree("curriculum_core.pdf")
        self.assertGreater(res["total_nodes"], 5)
        self.assertGreater(res["root_nodes"], 0)

        # Inspect root node
        first_root_id = self.adapter.root_nodes[0]
        node = self.adapter.get_node(first_root_id)
        self.assertIsNotNone(node)
        self.assertEqual(node["node_id"], first_root_id)
        self.assertIn("page_start", node)
        self.assertIn("page_end", node)

    def test_deterministic_navigation_search(self):
        self.adapter.build_tree("curriculum_core.pdf")
        query = "CSS Flexbox layout guide and axes"
        hits = self.adapter.search_tree(query, top_k=2)

        self.assertGreaterEqual(len(hits), 1)
        top_hit = hits[0]
        self.assertIn("CSS Flexbox", top_hit["node_title"])
        self.assertEqual(top_hit["page_range"], (12, 18))

    def test_local_only_invariant(self):
        h = self.adapter.health()
        self.assertTrue(h["local_only"])
        self.assertTrue(h["cloud_disabled"])


if __name__ == "__main__":
    unittest.main()
