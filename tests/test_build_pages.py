import tempfile
import unittest
from pathlib import Path
from shutil import copyfile

from scripts.build_pages import ROOT, build


class PagesBuildTests(unittest.TestCase):
    def test_publishes_workflow_and_use_case_from_catalog(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "source"
            (root / "scripts").mkdir(parents=True)
            case = root / "use-case" / "example"
            case.mkdir(parents=True)
            copyfile(ROOT / "scripts" / "pages-index.html", root / "scripts" / "pages-index.html")
            copyfile(ROOT / "agent-workflow.html", root / "agent-workflow.html")
            (case / "index.html").write_text("Example", encoding="utf-8")
            (case / "example.csv").write_text("symbol,shares,average_cost\nMSFT,1,100\n", encoding="utf-8")
            (case / "design.md").write_text("Not public", encoding="utf-8")

            destination = Path(temp_dir) / "site"
            build(root, destination)

            catalog = (destination / "index.html").read_text(encoding="utf-8")
            self.assertIn('href="agent-workflow.html"', catalog)
            self.assertIn('href="use-case/example/"', catalog)
            self.assertEqual(
                (destination / "agent-workflow.html").read_bytes(),
                (root / "agent-workflow.html").read_bytes(),
            )
            self.assertEqual((destination / "use-case/example/index.html").read_text(), "Example")
            self.assertEqual(
                (destination / "use-case/example/example.csv").read_text(),
                "symbol,shares,average_cost\nMSFT,1,100\n",
            )
            self.assertFalse((destination / "use-case/example/design.md").exists())

    def test_rejects_symlinked_workflow(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "source"
            (root / "scripts").mkdir(parents=True)
            (root / "use-case").mkdir()
            copyfile(ROOT / "scripts" / "pages-index.html", root / "scripts" / "pages-index.html")
            (root / "agent-workflow.html").symlink_to(ROOT / "agent-workflow.html")

            with self.assertRaisesRegex(ValueError, "Agent workflow must not be a symlink"):
                build(root, Path(temp_dir) / "site")


if __name__ == "__main__":
    unittest.main()
