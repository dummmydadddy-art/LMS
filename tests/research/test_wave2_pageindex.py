# tests/research/test_wave2_pageindex.py
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.document_navigation import PageIndexAdapter, PageIndexNode


class TestWave2PageIndex(unittest.TestCase):

    def setUp(self):
        self.adapter = PageIndexAdapter()
        self.sample_outline = [
            {"title": "HTML5 and Document Structure", "start": 1, "end": 10, "level": 1},
            {"title": "CSS Flexbox Layout Guide", "start": 12, "end": 18, "level": 1},
            {"title": "Flexbox Axes and Alignment", "start": 14, "end": 16, "level": 2},
            {"title": "JavaScript Asynchronous Programming", "start": 19, "end": 30, "level": 1},
        ]

    def test_tree_construction_and_nodes_with_outline(self):
        res = self.adapter.build_tree("curriculum_core.pdf", structure_outline=self.sample_outline)
        self.assertEqual(res["node_count"], 4)
        self.assertEqual(res["root_count"], 3)
        self.assertIn("tree_hash", res)

        # Inspect root node
        first_root_id = self.adapter.root_nodes[0]
        node = self.adapter.get_node(first_root_id)
        self.assertIsNotNone(node)
        self.assertEqual(node["node_id"], first_root_id)
        self.assertEqual(node["page_start"], 1)
        self.assertEqual(node["page_end"], 10)

        # Child node check
        flex_root = self.adapter.nodes[self.adapter.root_nodes[1]]
        self.assertEqual(len(flex_root.children), 1)
        child_node = self.adapter.get_node(flex_root.children[0])
        self.assertEqual(child_node["node_title"], "Flexbox Axes and Alignment")

    def test_missing_sdk_unprovided_outline_fails(self):
        # Without explicit outline and without pageindex installed, must fail cleanly
        with self.assertRaises(RuntimeError) as ctx:
            self.adapter.build_tree("curriculum_core.pdf")
        self.assertIn("not installed", str(ctx.exception).lower())

    def test_deterministic_navigation_search(self):
        self.adapter.build_tree("curriculum_core.pdf", structure_outline=self.sample_outline)
        query = "CSS Flexbox layout guide and axes"
        hits = self.adapter.search_tree(query, top_k=2)

        self.assertGreaterEqual(len(hits), 1)
        top_hit = hits[0]
        self.assertIn("Flexbox", top_hit["node_title"])
        self.assertIn(top_hit["page_range"], [(12, 18), (14, 16)])

    def test_local_only_invariant(self):
        h = self.adapter.health()
        self.assertEqual(h["status"], "NOT_READY")
        self.assertFalse(h["simulation"])
        self.assertTrue(h["local_only"])
        self.assertTrue(h["cloud_disabled"])


if __name__ == "__main__":
    unittest.main()
