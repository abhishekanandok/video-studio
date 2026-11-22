"""Library imports are placed by code (video/argon.py lib_imports): the model picks the pieces, the code says which file
each comes from, so no film fails on an import path again (the cable film imported RopeSwing from blocks-d; it lives in
motion-c).

    cd backend && .venv/bin/python -m pytest tests/test_lib_imports.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import argon  # noqa: E402

ONE = "../../../argon/lib/"


def test_a_piece_from_the_wrong_file_moves_to_its_own():
    src, said = argon.lib_imports('import { Vehicle, RopeSwing } from "../../../argon/lib/blocks-d";\nconst x = 1;', ONE)
    assert 'import { Vehicle } from "../../../argon/lib/blocks-d";' in src
    assert 'import { RopeSwing } from "../../../argon/lib/motion-c";' in src
    assert said == ["RopeSwing: blocks-d -> motion-c"]


def test_right_imports_are_left_alone():
    src = 'import React from "react";\nimport { Vehicle } from "../../lib/blocks-d";\n'
    assert argon.lib_imports(src, "../../lib/") == (src, [])


def test_a_multi_line_import_and_an_alias():
    src, _ = argon.lib_imports('import {\n  Vehicle,\n  RopeSwing as Swing,\n} from "../../lib/blocks-d";\n', "../../lib/")
    assert 'import { RopeSwing as Swing } from "../../lib/motion-c";' in src
    assert 'import { Vehicle } from "../../lib/blocks-d";' in src


def test_a_piece_used_but_never_imported_is_imported():
    src, said = argon.lib_imports('import React from "react";\nexport const S = () => <RopeSwing />;', ONE, {"RopeSwing", "NotALibraryName"})
    assert 'import { RopeSwing } from "../../../argon/lib/motion-c";' in src
    assert said == ["RopeSwing: imported from motion-c"]  # a name the library does not have is left to the fixer


def test_a_name_the_library_does_not_export_stays_where_it_was():
    src = 'import { Vehicle, MadeUpThing } from "../../lib/blocks-d";\n'
    assert argon.lib_imports(src, "../../lib/") == (src, [])


def test_a_piece_already_imported_rightly_is_not_imported_twice():
    src, _ = argon.lib_imports('import { RopeSwing } from "../../lib/motion-c";\nimport { RopeSwing } from "../../lib/blocks-d";\n', "../../lib/")
    assert src.count("RopeSwing") == 1
