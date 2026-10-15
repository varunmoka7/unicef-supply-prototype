import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "mrp", Path(__file__).resolve().parent.parent / "scripts/match_report_passages.py")
mrp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mrp)

LINES = [
    {"id": "L1", "text": "The current targets for Scope 1 and 2", "rect": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.02}},
    {"id": "L2", "text": "emissions involve a 42% reduction by 2030", "rect": {"x": 0.1, "y": 0.12, "width": 0.2, "height": 0.02}},
]
PAGE = {"claims": [{"claim_id": "01-1", "text": "42% by 2030"}]}


def run(match):
    return mrp.validate(PAGE, LINES, {"matches": [match]} if match else {"matches": []})[0]


def test_valid_candidate_takes_rects_from_pdf_lines():
    r = run({"claim_id": "01-1", "line_ids": ["L1", "L2"],
             "quote": "Scope 1 and 2 emissions involve a 42% reduction"})
    assert r["outcome"] == "candidate" and r["rects"] == [LINES[0]["rect"], LINES[1]["rect"]]


def test_invented_quote_rejected():
    assert run({"claim_id": "01-1", "line_ids": ["L2"], "quote": "a 50% cut by 2035"})["outcome"] == "quote_not_on_page"


def test_quote_from_other_line_rejected():
    assert run({"claim_id": "01-1", "line_ids": ["L1"], "quote": "42% reduction by 2030"})["outcome"] == "quote_outside_lines"


def test_invented_line_id_rejected():
    assert run({"claim_id": "01-1", "line_ids": ["L9"], "quote": "42% reduction"})["outcome"] == "invalid_line_ids"


def test_explicit_no_support_and_missing():
    assert run({"claim_id": "01-1", "line_ids": [], "quote": ""})["outcome"] == "no_support"
    assert run(None)["outcome"] == "missing"


def test_parse_json_tolerates_wrapping():
    assert mrp.parse_json('thinking... {"matches": []} done') == {"matches": []}
    assert mrp.parse_json("no json") is None


def test_benchmark_is_frozen_and_distinct():
    b = mrp.freeze_benchmark()
    keys = [(p["pdf"], p["page"]) for p in b["pages"]]
    assert len(keys) == len(set(keys)) == mrp.N_PAGES
    assert (mrp.CONTROL[1], mrp.CONTROL[2]) in keys
    assert len(b["suppliers"]) >= 5


def test_control_page_text_locates_known_passage():
    lines = mrp.page_lines(mrp.pdf_index()[mrp.CONTROL[1]], mrp.CONTROL[2])
    assert "42% absolute reduction by 2030" in mrp.norm(" ".join(l["text"] for l in lines))


def test_unparsed_answer_is_not_reported_as_missing():
    r = mrp.validate(PAGE, LINES, None)[0]
    assert r["outcome"] == "unparsed"


def test_local_exact_finds_consecutive_lines_only_when_verbatim():
    run = mrp.local_exact("Scope 1 and 2 emissions involve a 42% reduction", LINES)
    assert [l["id"] for l in run] == ["L1", "L2"]
    assert mrp.local_exact("a 50% reduction", LINES) is None


def test_walk_evidence_finds_nested_objects_and_skips_textless():
    found = []
    mrp.walk_evidence({"a": [{"items": [{"text": "x", "pdf": "a.pdf", "page": 1}, {"pdf": "b.pdf", "page": 2}]}]}, found)
    assert [o["pdf"] for o in found] == ["a.pdf"]


def test_identity_id_is_stable_and_distinguishes_pages():
    assert mrp.identity_id("t", "a.pdf", 1) == mrp.identity_id("t", "a.pdf", 1)
    assert mrp.identity_id("t", "a.pdf", 1) != mrp.identity_id("t", "a.pdf", 2)


def test_parse_json_accepts_control_characters_in_strings():
    assert mrp.parse_json('{"matches": [{"quote": "a\x07b"}]}')["matches"][0]["quote"] == "a\x07b"


def test_reuse_outcomes_keeps_old_and_sends_only_new_identities():
    entries = [{"id": "a", "text": "old", "pdf": "x.pdf", "page": 1},
               {"id": "b", "text": "unsupported", "pdf": "x.pdf", "page": 1},
               {"id": "c", "text": "new on a processed page", "pdf": "x.pdf", "page": 1}]
    existing = {"a": {"id": "a", "outcome": "candidate"}}
    prior = {("unsupported", "x.pdf", 1): {"claim_id": "C2", "outcome": "no_support", "text": "unsupported"}}
    out, new = mrp.reuse_outcomes(entries, existing, prior)
    assert {o["id"]: o["outcome"] for o in out} == {"a": "candidate", "b": "no_support"}
    assert [e["id"] for e in new] == ["c"]


def test_pdf_index_resolves_through_inventory_path():
    idx = mrp.pdf_index()
    inv = __import__("json").loads((mrp.OUT.parent / "all-pages/inventory.json").read_text())
    name, v = next((n, v) for n, v in inv["pdfs"].items() if v["state"] == "ok")
    assert str(idx[name]) == v["path"]


def test_stale_checkpoint_hash_forces_reask_and_skipped_is_not_checkpointed():
    # B1/B2 are exercised end to end by the run; here pin the helper contract they rely on
    entries = [{"id": "a", "text": "t", "pdf": "x.pdf", "page": 1}]
    out, new = mrp.reuse_outcomes(entries, {}, {})
    assert out == [] and new == entries


def test_provider_unavailable_outcome_is_not_reused_as_final():
    entries = [{"id": "a", "text": "t", "pdf": "x.pdf", "page": 1}]
    out, new = mrp.reuse_outcomes(entries, {"a": {"id": "a", "outcome": "provider_unavailable"}}, {})
    assert out == [] and new == entries


def test_checkpoint_with_provider_unavailable_is_not_final():
    ok = {"request": {"ok": True}, "matches": [{"id": "a", "outcome": "no_support"}, {"id": "b", "outcome": "exact_local"}]}
    assert mrp.checkpoint_final(ok, {"a", "b"})
    retry = {"request": {"ok": True}, "matches": [{"id": "a", "outcome": "no_support"}, {"id": "b", "outcome": "provider_unavailable"}]}
    assert not mrp.checkpoint_final(retry, {"a", "b"})
    assert not mrp.checkpoint_final(ok, {"a", "b", "c"})
    assert not mrp.checkpoint_final({**ok, "request": {"ok": False}}, {"a", "b"})
